// ==========================================================================
// Page-wide behavior.
//
//   - Name typing animation (two lines, cursor follows the active line).
//   - Eased smooth-scrolling, used by the nav and by the hero's cubesats.
//     Native `scroll-behavior:smooth` is turned off in favour of this so the
//     long jumps between sections ease instead of snapping.
//   - Scroll-reveal for every [data-reveal] element, staggered per group.
//   - Sliding nav indicator + scroll progress hairline.
//   - Descent progress across the pinned home+about scene, published for both
//     the stylesheet and the 3D hero to read.
//   - Starfield drift/parallax and the occasional meteor.
//   - Live UTC readout in the hero status strip.
//
// The 3D hero scene lives in orbit-scene.js and is wired up separately from
// index.html (it's only needed on the home page).
// ==========================================================================

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const NAV_H = 64;

// --------------------------------------------------------------------------
// Eased scrolling. Exposed on window so the ES-module hero scene can call it
// without a second copy of the easing code.
// --------------------------------------------------------------------------
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

let scrollAnim = null;

function smoothScrollTo(target) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;

  const maxTop = document.documentElement.scrollHeight - window.innerHeight;
  // getBoundingClientRect, not offsetTop: sections are position:relative, so
  // offsetTop on a nested target (the skills strip inside About) would be
  // measured against its section rather than the document.
  const docTop = el.getBoundingClientRect().top + window.scrollY;
  const to = Math.max(0, Math.min(el.id === "home" ? 0 : docTop - NAV_H + 1, maxTop));
  const from = window.scrollY;
  const delta = to - from;

  if (REDUCED || Math.abs(delta) < 2) {
    window.scrollTo(0, to);
    return;
  }

  // Longer trips get a longer ride, but never a sluggish one.
  const duration = Math.min(1150, Math.max(620, Math.abs(delta) * 0.55));
  const start = performance.now();
  if (scrollAnim) cancelAnimationFrame(scrollAnim);

  // Any real scroll input from the user wins immediately.
  let cancelled = false;
  const abort = () => { cancelled = true; };
  window.addEventListener("wheel", abort, { passive: true, once: true });
  window.addEventListener("touchstart", abort, { passive: true, once: true });
  window.addEventListener("keydown", abort, { once: true });

  // Both exit paths have to unhook, not just the one that runs to completion.
  // `once` only removes a listener that actually fired, so a cancelled scroll
  // used to leave the other two armed, and they accumulated one set per jump.
  function release() {
    window.removeEventListener("wheel", abort);
    window.removeEventListener("touchstart", abort);
    window.removeEventListener("keydown", abort);
  }

  function step(now) {
    if (cancelled) { scrollAnim = null; release(); return; }
    const p = Math.min((now - start) / duration, 1);
    window.scrollTo(0, from + delta * easeInOutCubic(p));
    if (p < 1) {
      scrollAnim = requestAnimationFrame(step);
    } else {
      scrollAnim = null;
      release();
    }
  }
  scrollAnim = requestAnimationFrame(step);
}

window.smoothScrollTo = smoothScrollTo;

// --------------------------------------------------------------------------
// Hero name typing
// --------------------------------------------------------------------------
function initTypingName() {
  const el = document.querySelector("[data-typing-name]");
  if (!el) return;

  // "KRITTIN|JINDAMAI" — the pipe is the line break.
  const lines = (el.getAttribute("data-typing-name") || "").split("|").filter(Boolean);
  el.textContent = "";

  const lineEls = lines.map(() => {
    const span = document.createElement("span");
    span.className = "name-line";
    el.appendChild(span);
    return span;
  });

  const cursor = document.createElement("span");
  cursor.className = "cursor";

  if (REDUCED) {
    lineEls.forEach((span, i) => { span.textContent = lines[i]; });
    lineEls[lineEls.length - 1].appendChild(cursor);
    return;
  }

  const SPEED = 58; // ms per character
  let line = 0;
  let i = 0;

  function typeNext() {
    if (line >= lines.length) return;

    lineEls[line].textContent = lines[line].slice(0, i);
    lineEls[line].appendChild(cursor);

    if (i < lines[line].length) {
      i++;
      setTimeout(typeNext, SPEED);
    } else if (line < lines.length - 1) {
      line++;
      i = 0;
      setTimeout(typeNext, SPEED * 3); // beat between lines
    }
  }
  setTimeout(typeNext, 320);
}

// --------------------------------------------------------------------------
// Scroll reveal. Siblings inside the same parent stagger against each other
// so grids and lists arrive in sequence rather than all at once.
// --------------------------------------------------------------------------
function initReveal() {
  const items = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!items.length) return;

  if (REDUCED || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }

  const groupCounters = new Map();
  items.forEach((el) => {
    const parent = el.parentElement;
    const n = groupCounters.get(parent) || 0;
    groupCounters.set(parent, n + 1);
    el.style.transitionDelay = Math.min(n, 5) * 90 + "ms";
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
  );
  items.forEach((el) => observer.observe(el));
}

// --------------------------------------------------------------------------
// Nav: active highlight, sliding indicator, click-to-eased-scroll
// --------------------------------------------------------------------------
function initNav() {
  const allLinks = document.querySelectorAll(".navlinks a");
  if (!allLinks.length) return;

  // Only same-page fragment links (e.g. "#home") can be scroll-tracked here.
  // Project detail pages link back to "../index.html#home" etc — those are
  // left alone; there's nothing on this page for them to highlight against.
  const links = Array.from(allLinks).filter((a) => (a.getAttribute("href") || "").startsWith("#"));
  if (!links.length) return;

  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!document.querySelector(href)) return;
      e.preventDefault();
      smoothScrollTo(href);
      history.replaceState(null, "", href);
    });
  });

  const indicator = document.getElementById("nav-indicator");
  function moveIndicator(link) {
    if (!indicator || !link) return;
    indicator.style.width = link.offsetWidth + "px";
    indicator.style.transform = "translateX(" + link.offsetLeft + "px)";
    indicator.classList.add("on");
  }

  const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  if (!sections.length) return;

  // Track which sections are in the band, then pick a single winner. Reacting
  // to entries one at a time lets two sections fight over the indicator when
  // they cross the band in the same callback.
  const visible = new Set();

  function applyActive() {
    let activeId = null;
    let best = Infinity;
    sections.forEach((s) => {
      if (!visible.has(s)) return;
      const top = Math.abs(s.getBoundingClientRect().top);
      if (top < best) { best = top; activeId = "#" + s.id; }
    });
    if (!activeId) return;
    links.forEach((a) => {
      const on = a.getAttribute("href") === activeId;
      a.classList.toggle("active", on);
      if (on) moveIndicator(a);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      applyActive();
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
  );
  sections.forEach((s) => observer.observe(s));

  const remeasure = () => moveIndicator(links.find((a) => a.classList.contains("active")));
  window.addEventListener("resize", remeasure);
  // Link widths shift once JetBrains Mono swaps in, so re-measure then too.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
}

// --------------------------------------------------------------------------
// Descent: how far through the pinned home+about scene the reader has come.
//
// Published two ways — as the `--descent` custom property, which drives the
// hero copy's lift-off in CSS, and as window.__descentP, which orbit-scene.js
// reads inside its own render loop. A shared value rather than a callback
// because this file runs from <head> and the scene is an ES module that loads
// later; neither has to know whether the other exists, and project pages have
// neither.
//
// Progress runs 0 -> 1 over the hero's own height, so the camera reaches low
// orbit exactly as About's top meets the nav. The descent therefore costs no
// extra scroll length of its own — nothing is pinned open to make room for it.
//
// It also publishes `--sky-color`, which fades the nebula's colour out over the
// hero, so every section past it is plain black and white stars.
// --------------------------------------------------------------------------
const STACK_BREAKPOINT = 900;

function initDescent() {
  const root = document.documentElement;
  const hero = document.getElementById("home");
  const wrap = document.getElementById("descent");

  // Project detail pages have none of this, and they sit past the coloured sky
  // entirely — they are only ever reached from Projects, where it has already
  // faded out, so arriving on one must not put it back.
  if (!hero || !wrap) {
    root.style.setProperty("--sky-color", "0");
    return;
  }

  let queued = false;

  // Measured on resize/load rather than inside the scroll handler. offsetHeight
  // and getBoundingClientRect force a synchronous layout, and this runs in a
  // rAF alongside code that writes styles — reading them per frame is the
  // classic read/write thrash. It also stops the numbers shifting underfoot
  // when an Experience row unfolds on hover and nudges the wrapper's height.
  let heroH = 0;
  let riseMax = 0;
  let active = false;

  function measure() {
    // Below the breakpoint, and under reduced motion, the scene is boxed back
    // into the hero by style.css and there is nothing to descend through.
    active = !REDUCED && window.innerWidth > STACK_BREAKPOINT;
    heroH = hero.offsetHeight;

    // Where the sticky scene unpins: the document position of .descent's
    // bottom, one viewport up. Taken from the live box rather than assuming
    // the wrapper starts exactly NAV_H down the page.
    const wrapBottom = wrap.getBoundingClientRect().bottom + window.scrollY;
    riseMax = Math.max(0, wrapBottom - window.innerHeight - heroH);
  }

  function update() {
    queued = false;
    const y = window.scrollY;

    // Runs over the hero's own height, and ends at the horizon — there is no
    // second leg of camera movement. The globe settles at the foot of About.
    const p = active && heroH > 0 ? Math.min(Math.max(y / heroH, 0), 1) : 0;
    root.style.setProperty("--descent", p.toFixed(4));
    window.__descentP = p;

    // Past that point the globe simply rides the scroll. This is a pixel
    // offset, not a progress fraction, and the scene applies it to the frustum
    // 1:1 — so the planet travels at exactly the speed of the page and reads
    // as part of it rather than as a camera doing something of its own. That
    // is what carries the underside of the globe up to the top of Experience
    // and keeps the two sections looking like one piece of sky.
    //
    // It has to STOP exactly where the sticky scene unpins, which is the point
    // its own box starts scrolling away at that same 1:1 rate. Let it run past
    // there and the two add up, and the globe leaves at double the speed of
    // the page. `riseMax` is derived from .descent's own box in measure(),
    // rather than guessed at from section heights.
    window.__risePx = active ? Math.min(Math.max(y - heroH, 0), riseMax) : 0;

    // The nebula's colour is the home page's alone. It drains over the descent
    // so it is gone by the time About is in place, leaving every section from
    // there on plain black with white star dots. Computed even under reduced
    // motion and on the stacked layout: it is a function of scroll position
    // rather than an animation, and skipping it would leave the colour sitting
    // behind every section.
    // Derived from scroll directly rather than from p, so it still fades
    // smoothly where the descent itself is switched off — p is pinned at 0
    // there, and reusing it would snap the colour away on the first pixel.
    const sky = heroH > 0 ? 1 - Math.min(Math.max(y / heroH, 0), 1) : 1;
    root.style.setProperty("--sky-color", sky.toFixed(4));
  }

  const remeasure = () => { measure(); update(); };

  window.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
  window.addEventListener("resize", remeasure);
  // Also after load: a fragment navigation (arriving at index.html#projects
  // from a project page) applies its scroll after DOMContentLoaded, and the
  // first update would otherwise have measured the top of the document. Fonts
  // matter too — the sections reflow when JetBrains Mono swaps in.
  window.addEventListener("load", remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  remeasure();
}

// --------------------------------------------------------------------------
// Scroll progress hairline under the nav
// --------------------------------------------------------------------------
function initScrollProgress() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;

  let queued = false;
  // Cached for the same reason as the descent's measurements: scrollHeight is
  // a layout read, and this handler writes a style straight after it.
  let max = 0;

  function measure() {
    max = document.documentElement.scrollHeight - window.innerHeight;
  }
  function update() {
    queued = false;
    const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    bar.style.width = (p * 100).toFixed(2) + "%";
  }

  const remeasure = () => { measure(); update(); };
  window.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
  window.addEventListener("resize", remeasure);
  window.addEventListener("load", remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  remeasure();
}

// --------------------------------------------------------------------------
// Starfield: slow drift + scroll parallax, driven through background-position
// so the tiling stays seamless no matter how far it travels.
// --------------------------------------------------------------------------
function initStarfield() {
  const root = document.getElementById("stars");
  const nebula = document.getElementById("nebula");
  if (!root) return;

  const layers = Array.from(root.querySelectorAll(".star-layer")).map((el) => ({
    el,
    depth: parseFloat(el.dataset.depth) || 0.1,
    drift: parseFloat(el.dataset.drift) || 12, // px per second, leftward
  }));

  // ---- continuity across navigations ----
  // Scroll position resets to 0 on a new page, so deriving the backdrop
  // offset from scrollY alone would snap it back. Instead each layer keeps a
  // base offset that is handed to the next page through sessionStorage, and
  // the new page's scroll parallax is applied on top of it. The drift clock
  // is carried too, so the slow motion continues where it left off rather
  // than restarting.
  const KEY = "krj-backdrop";
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch (e) {
    saved = null; // private mode, or someone put junk in the key
  }

  const base =
    saved && Array.isArray(saved.base) && saved.base.length === layers.length
      ? saved.base
      : layers.map(() => ({ x: 0, y: 0 }));
  let nebBase = saved && typeof saved.nebY === "number" ? saved.nebY : 0;
  const clock0 = saved && typeof saved.clock === "number" ? saved.clock : 0;

  // Live values, kept here so pagehide can persist exactly what is on screen.
  const live = { base: base.map((b) => ({ ...b })), nebY: nebBase, clock: clock0 };

  function paint() {
    layers.forEach((l, i) => {
      l.el.style.backgroundPosition =
        live.base[i].x.toFixed(1) + "px " + live.base[i].y.toFixed(1) + "px";
    });
    if (nebula) {
      const t = live.clock;
      const dx = Math.sin(t / 38) * 26; // ~4 min period
      const dy = Math.cos(t / 52) * 16; // ~5.5 min period
      nebula.style.transform =
        "translate3d(" + dx.toFixed(1) + "px," + (live.nebY + dy).toFixed(1) + "px,0) scale(1.12)";
    }
  }

  function persist() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ base: live.base, nebY: live.nebY, clock: live.clock }));
    } catch (e) {
      /* storage unavailable — the backdrop just restarts, nothing breaks */
    }
  }
  window.addEventListener("pagehide", persist);
  document.addEventListener("visibilitychange", () => { if (document.hidden) persist(); });

  // Paint the restored position immediately: main.js runs before first paint,
  // and the view-transition snapshot of the incoming page is taken right
  // after, so the backdrop must already be in the right place.
  paint();
  if (REDUCED) return;

  const t0 = performance.now();
  function frame(now) {
    const secs = (now - t0) / 1000;
    const sy = window.scrollY;

    live.clock = clock0 + secs;
    layers.forEach((l, i) => {
      live.base[i] = {
        x: base[i].x - secs * (l.drift / 10),
        y: base[i].y - sy * l.depth + secs * (l.drift / 40),
      };
    });
    // Clamped: unlike the star layers this image does not tile, and the base
    // accumulates across every page visit in the session.
    live.nebY = Math.max(-30, Math.min(30, nebBase - sy * 0.006));

    paint();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  scheduleMeteor(root);
}

function scheduleMeteor(root) {
  const wait = 7000 + Math.random() * 12000;
  setTimeout(() => {
    spawnMeteor(root);
    scheduleMeteor(root);
  }, wait);
}

function spawnMeteor(root) {
  if (document.hidden) return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const angle = 18 + Math.random() * 16;
  const rad = (angle * Math.PI) / 180;
  const dist = 320 + Math.random() * 420;

  const x = Math.random() * w * 0.9;
  const y = Math.random() * h * 0.45;
  const dx = Math.cos(rad) * dist;
  const dy = Math.sin(rad) * dist;

  const m = document.createElement("div");
  m.className = "meteor";
  root.appendChild(m);

  const anim = m.animate(
    [
      { transform: `translate(${x}px, ${y}px) rotate(${angle}deg) scaleX(.25)`, opacity: 0 },
      { opacity: 0.9, offset: 0.2 },
      { transform: `translate(${x + dx}px, ${y + dy}px) rotate(${angle}deg) scaleX(1)`, opacity: 0 },
    ],
    { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.25,.6,.35,1)" }
  );
  anim.onfinish = () => m.remove();
  anim.oncancel = () => m.remove();
}

// --------------------------------------------------------------------------
// Projects carousel — experimental, see "Planned: 3D-model project
// carousel" in CLAUDE.md. Six .carousel-item cards sit at fixed 60° steps
// around a cylinder (in CSS, via nth-child); the only thing that actually
// moves is .carousel-track's own `transform`, which this rotates so the
// selected item's step cancels out to 0deg and faces the viewer.
//
// The active index is tracked in JS rather than derived from the current
// angle, so drag and click always agree on exactly which card is "front" —
// reading it back out of a mid-transition transform would be fragile.
// --------------------------------------------------------------------------
function initProjectCarousel() {
  const root = document.getElementById("proj-carousel");
  const track = document.getElementById("carousel-track");
  if (!root || !track) return;

  const items = Array.from(track.querySelectorAll(".carousel-item"));
  if (!items.length) return;
  const descEl = document.getElementById("carousel-desc");
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");
  const STEP = 360 / items.length;

  let index = 0;
  let dragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragBaseAngle = 0;

  function apply(angle) {
    track.style.transform = "rotateY(" + (-angle).toFixed(2) + "deg)";
  }

  function setActive(i) {
    index = ((i % items.length) + items.length) % items.length;
    items.forEach((el, n) => el.classList.toggle("active", n === index));
    if (descEl) descEl.textContent = items[index].dataset.desc || "";
    apply(index * STEP);
  }

  track.addEventListener("pointerdown", (e) => {
    dragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragBaseAngle = index * STEP;
    track.classList.add("dragging");
    track.setPointerCapture(e.pointerId);
  });

  track.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 4) dragMoved = true;
    apply(dragBaseAngle - dx * 0.5);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("dragging");
    const dx = e.clientX - dragStartX;
    setActive(Math.round((dragBaseAngle - dx * 0.5) / STEP));
  }
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  // One capture-phase listener handles both jobs: swallow the synthetic
  // click a real drag leaves behind (it would otherwise either re-select a
  // side card a second time or fire the active link's navigation), and
  // otherwise turn a click on a side card into a select rather than letting
  // it do nothing (its .carousel-link is pointer-events:none in CSS, so the
  // .carousel-item itself is always the real click target there).
  track.addEventListener("click", (e) => {
    if (dragMoved) {
      e.preventDefault();
      e.stopPropagation();
      dragMoved = false;
      return;
    }
    const item = e.target.closest(".carousel-item");
    const i = item ? items.indexOf(item) : -1;
    if (i !== -1 && i !== index) {
      e.preventDefault();
      setActive(i);
    }
    // i === index: leave it alone, the active card's real link navigates.
  }, true);

  if (prevBtn) prevBtn.addEventListener("click", () => setActive(index - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => setActive(index + 1));

  root.setAttribute("tabindex", "0");
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); setActive(index - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); setActive(index + 1); }
  });

  setActive(0);
}

// --------------------------------------------------------------------------
// Projects field.
//
// The section is one fixed-scatter diorama rather than cards — see "projects
// field" in style.css for how its two coordinate systems work. This owns two
// jobs:
//
//   1. Reveal each supplied still and drop its placeholder. The <img>s point
//      at files that do not exist yet, so nothing is shown until one actually
//      decodes; dropping the PNGs into assets/images/projects/ is therefore
//      the entire handoff, with no markup change.
//   2. Light the objects on first scroll-in, staggered 90ms apart in document
//      order — the same stagger the scroll reveals use elsewhere.
//
// There used to be a third job: a rocket flying in once and landing on the
// TerraGator object, with that object lighting first as the "becomes the
// model" beat. Krittin had it removed; the objects now just light in document
// order with no flight to hand off from.
//
// Every entrance style is scoped to .js-field, which is only added here, so
// any failure in this function leaves the field plainly visible rather than
// blank. The stagger is skipped outright on the stacked layout and under
// reduced motion, where the field is a plain stacked list.
// --------------------------------------------------------------------------
function initProjectField() {
  const field = document.getElementById("proj-field");
  if (!field) return;

  const objs = Array.from(field.querySelectorAll(".proj-obj"));
  if (!objs.length) return;

  // 1. Art, if and when it exists. Checking naturalWidth rather than trusting
  // `complete` matters: a 404 also resolves as complete, and marking that as
  // art would swap a readable placeholder for a broken-image glyph.
  objs.forEach((obj) => {
    const img = obj.querySelector(".proj-art");
    if (!img) return;
    const show = () => { if (img.naturalWidth > 0) obj.classList.add("has-art"); };
    if (img.complete) show();
    else img.addEventListener("load", show, { once: true });
  });

  // Below 900px the field is a stacked list, and under reduced motion nothing
  // is allowed to animate in. Leaving .js-field off is what keeps everything
  // visible.
  if (REDUCED || window.innerWidth <= 900) return;
  field.classList.add("js-field");

  let lit = false;
  function light() {
    if (lit) return;
    lit = true;
    objs.forEach((obj, i) => {
      window.setTimeout(() => obj.classList.add("lit"), i * 90);
    });
  }

  if (!("IntersectionObserver" in window)) { light(); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      light();
    });
  }, { threshold: 0.25 });
  io.observe(field);
}

// --------------------------------------------------------------------------
// Page transitions.
//
// The cross-fade itself is pure CSS (`@view-transition` in style.css). All
// this does is name the two elements that should MORPH rather than fade: the
// project card's media well and title, which become the detail page's hero
// media and title. Only one card may carry those names at a time, so they're
// applied to the card being navigated to (or returned from) and removed
// again afterwards.
//
// Browsers without cross-document view transitions get a short exit fade
// instead — deliberately exit-only, so a failure can never leave someone
// looking at a blank page.
// --------------------------------------------------------------------------
function initPageTransitions() {
  const supported = "startViewTransition" in document && "onpagereveal" in window;

  // Three generations of Projects markup can carry a project href: .proj-obj
  // in the live scatter field, .carousel-link in the carousel experiment, and
  // .proj-card in the flat grid before it. The last two are commented out in
  // index.html as revert paths, so querying all three keeps the morph working
  // whichever one is live without this needing to know which.
  function cardFor(url) {
    const m = String(url || "").match(/projects\/([a-z0-9-]+)\.html/i);
    if (!m) return null;
    return document.querySelector(
      '.proj-obj[href$="' + m[1] + '.html"], ' +
      '.proj-card[href$="' + m[1] + '.html"], ' +
      '.carousel-link[href$="' + m[1] + '.html"]'
    );
  }

  function tag(card, on) {
    if (!card) return;
    const media = card.querySelector(".proj-obj-model, .proj-media, .carousel-model");
    const title = card.querySelector(".proj-obj-label, .proj-title, .carousel-title");
    if (media) media.style.viewTransitionName = on ? "proj-media" : "";
    if (title) title.style.viewTransitionName = on ? "proj-title" : "";
  }

  // Going into a project page is "forward", returning is "back". The flag
  // has to be set on BOTH documents: the outgoing page's stylesheet drives
  // ::view-transition-old, the incoming page's drives ::view-transition-new.
  const isProject = (url) => /\/projects\/[a-z0-9-]+\.html/i.test(String(url || ""));
  function setDirection(fromUrl, toUrl) {
    let dir = "forward";
    if (isProject(fromUrl) && !isProject(toUrl)) dir = "back";
    document.documentElement.dataset.vt = dir;
  }

  if (supported) {
    // Leaving: flag the direction and tag the card we're navigating into.
    window.addEventListener("pageswap", (e) => {
      // Direction first, unconditionally — it costs nothing and must not be
      // coupled to whether a transition happens to be running.
      const to = e.activation && e.activation.entry && e.activation.entry.url;
      setDirection(location.href, to);
      if (!e.viewTransition) return;

      const card = cardFor(to);
      if (!card) return;
      tag(card, true);
      // `finished` REJECTS when the transition is skipped — a reload, or a
      // navigation that gets interrupted. Untag either way, and handle the
      // rejection so it doesn't surface as an unhandled AbortError.
      const untag = () => tag(card, false);
      e.viewTransition.finished.then(untag, untag);
    });

    // Arriving: flag the direction and tag the card we came back from.
    window.addEventListener("pagereveal", (e) => {
      const from = window.navigation && navigation.activation && navigation.activation.from;
      setDirection(from && from.url, location.href);
      if (!e.viewTransition) return;

      const card = cardFor(from && from.url);
      if (!card) return;
      tag(card, true);
      // `finished` REJECTS when the transition is skipped — a reload, or a
      // navigation that gets interrupted. Untag either way, and handle the
      // rejection so it doesn't surface as an unhandled AbortError.
      const untag = () => tag(card, false);
      e.viewTransition.finished.then(untag, untag);
    });
    return;
  }

  if (REDUCED) return;

  // Fallback: fade out, then navigate.
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;

    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    // Same document — that's the eased in-page scroll's job, not this.
    if (url.pathname === location.pathname && url.search === location.search) return;

    e.preventDefault();
    document.body.style.transition = "opacity .2s var(--ease)";
    document.body.style.opacity = "0";
    setTimeout(() => { location.href = a.href; }, 190);
  });
}

// --------------------------------------------------------------------------
// Live UTC readout
// --------------------------------------------------------------------------
function initClock() {
  const el = document.getElementById("utc-clock");
  if (!el) return;
  const pad = (n) => String(n).padStart(2, "0");
  function tick() {
    const d = new Date();
    el.textContent = pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds());
  }
  tick();
  setInterval(tick, 1000);
}

// --------------------------------------------------------------------------
document.documentElement.classList.add("js-scroll");

// If the fallback exit fade ran and the page comes back out of the bfcache,
// it would otherwise be restored still faded out.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    document.body.style.transition = "";
    document.body.style.opacity = "";
  }
});

// Registered at script execution rather than inside boot(): `pagereveal` is a
// page-lifecycle event that can fire before DOMContentLoaded, and a listener
// added afterwards simply never hears it. This script sits at the end of
// <body>, so the elements it needs are already parsed.
initPageTransitions();

function boot() {
  initTypingName();
  initReveal();
  initNav();
  initDescent();
  initScrollProgress();
  initStarfield();
  initClock();
  initProjectField();
  // Still called, and still a no-op unless the carousel markup is uncommented
  // in index.html — it is one of the two revert paths for this section.
  initProjectCarousel();
}

// This script is loaded at the end of <body>, so the DOM is already parsed
// and this normally runs before the first paint — which matters, because
// initStarfield has to restore the carried-over backdrop offset before the
// incoming view-transition snapshot is taken.
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
