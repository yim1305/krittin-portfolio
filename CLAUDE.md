# Krittin "Yim" Jindamai — Aerospace Engineering Portfolio

Static site, built for GitHub Pages. Plain HTML/CSS/JS, no build step, no
server-side code, relative paths only. This file is dev-only context (safe
to delete before publishing — it has no effect on the live site).

## Who this is for

Krittin ("Yim") Jindamai, senior aerospace engineering student. Primary
audience: professors he's applying to work with in their research lab, so
the site should read as credible/technical, fast to skim, and easy to link
to specific papers/projects — not a flashy marketing site.

## Files

```
index.html              single scrolling page, all five sections
css/style.css           everything — no per-page stylesheets
js/main.js              typing, eased scroll, reveals, nav, descent, starfield, clock
js/orbit-scene.js       the Three.js hero (ES module, imported from index.html)
js/moon-scene.js        the Three.js Moon in Projects (ES module, same)
projects/_template.html reference layout — duplicate this per project
projects/*.html         six detail pages
assets/images/          nebula-backdrop.webp; about media goes here
assets/images/projects/ the six project stills — README there is the handoff
assets/papers/          resume.pdf and per-project paper PDFs (not yet supplied)
```

## Local dev

`index.html` imports `js/orbit-scene.js` as an ES module, so **opening the
file over `file://` will not work** — the module load is blocked by CORS.
Serve the directory over HTTP instead, e.g.:

```
npx serve .          # or any static server; then open http://localhost:PORT
```

Three.js r160 is pulled from unpkg via the import map in `index.html`'s
`<head>`. That import map is required, not incidental: `OrbitControls.js`
imports the bare specifier `"three"` internally, which the browser cannot
resolve on its own. An internet connection is needed for the hero to
render; the rest of the page degrades fine without it.

## Design system — "Factory" (from refero.design) + space theme

Dark, flat, instrument-panel aesthetic. **The UI itself is flat** — no
shadows, no glow, no blur, no gradients, no emoji as decoration. Depth in
the chrome comes from contrast, hairlines and spacing.

The backdrop and the 3D hero are the two deliberate exceptions; see
"Depth exception" below.

**Colors**
- `--void: #06070a` / `--void-edge: #0a0c11` — the page backdrop
- `--obsidian: #101010` — dark UI surface (no longer the page background)
- `--carbon: #1d1a18` — raised surfaces (media placeholders, nav well)
- `--ash: #3d3a39` — hairline borders/dividers
- `--graphite: #4d4947` — placeholder/disabled text
- `--warm-granite: #8a8380` — secondary/muted body text
- `--pale-stone: #b8b3b0` — tertiary text
- `--bone: #eeeeee` — primary text
- `--chalk: #fafafa` — high-emphasis surfaces
- `--orange: #ee6018` (signal orange) — functional accent / status only, never decorative fill
- `--green: #a0ca92` (metric green) — functional accent / status only, never decorative fill

**Type**
- Headings/body: Space Grotesk (weights 400/500/600), fallback Inter, system-ui
- Instrument labels/eyebrows/nav/mono data: JetBrains Mono (400/500)
- Both via Google Fonts

**Rules**
- Radii: 3px buttons/nav, 10px cards, 999px pills, 20px large panels
- Borders: 1px hairline (`--ash`), never shadows
- Section rhythm: 120px vertical padding between sections (80px under 900px).
  About is the exception — it is top-weighted (`56px` top, `--horizon-band`
  bottom) because it has the globe to leave room for.
- Transitions run at two speeds:
  - interactive feedback — fast + mechanical, `--t-fast: .2s` / `--t-mid: .32s`
    on `--ease: cubic-bezier(.4,0,.2,1)`
  - entrances and reveals — long-tail, `--t-slow: .9s` on
    `--ease-out: cubic-bezier(.16,1,.3,1)`, so scrolling reads as
    continuous rather than snapped
- Eyebrows: uppercase JetBrains Mono 12px with a small orange status dot

**Depth exception** (added at Krittin's request — the fully flat treatment
read as too dull and too generic). Two places, and only these two:

1. **The page backdrop.** `assets/images/nebula-backdrop.webp` at 38%
   opacity as the deepest layer (`.nebula`), then three parallaxing star
   layers and rare meteors (`.stars`, driven by `initStarfield` in
   `js/main.js`). The nebula is AI-generated (Higgsfield,
   `nano_banana_pro`) — permitted because it is decorative and
   non-representational. Keep it under half opacity and keep it deepest:
   it is there for depth and colour, not as wallpaper.

   **The colour is scoped to the HOME page only.** Krittin asked for every
   other page to be plain black with white star dots, so `.nebula`'s opacity
   is `calc(.38 * var(--sky-color, 1))` and `initDescent` drains
   `--sky-color` to 0 across the hero's own height — it is gone by the time
   About is in place. That value is derived from scroll directly rather than
   from the descent progress, so it still fades where the descent is switched
   off (mobile, reduced motion); reusing `p` there would snap the colour away
   on the first pixel. Project detail pages set `--sky-color: 0` outright:
   they are only ever reached from Projects, where the colour has already
   gone, and letting it back would both contradict the request and pop
   against the held-still `.nebula` snapshot the page transition relies on.

   **The star layers are neutral greys and white**, not the blue-tinted
   palette they started with — same request. Keep them achromatic.
2. **The 3D hero.** A solid globe with a cloud shell and a hairline limb
   ring. Note it is not *lit* — there are no lights in the scene at all, and
   the depth here comes from posterised bands and flat per-face fills. See
   "Home hero" below.

Nothing in the UI itself glows. Keep both exceptions restrained.

**Motion**
- Every animation must be skippable. Honour `prefers-reduced-motion` in
  both CSS (there is a dedicated block at the end of `style.css`) and JS
  (the `REDUCED` const at the top of each JS file).
- Prefer motion that *means* something — a rule drawing itself across an
  experience row, a scan line crossing a media well, the camera arriving
  from far out — over generic fades and float-ups.

## Site structure

Single scrolling page (`index.html`) with sections in this order:
`home` (hero) → `about` → `experience` → `projects` → `awards`.

**Education has no section of its own.** It had one briefly; Krittin folded it
back into About as a compact list at the end of the bio column. **Awards &
Certificates** (`#awards`) holds four real entries (VBU, Dean's List, Honors,
UFIC Certificate) in an `.awards-grid`, each still missing its certificate
image, and it sits last.

**About is three columns** (`.about-grid`): the portrait on the left, the bio
and education in the middle, and the tool marks on the right as a *vertical*
marquee drifting slowly downward. About also widens `.section-inner` to 1560px
— wider than the 1200px the rest of the page uses — so the portrait sits out
near the left edge rather than starting a third of the way across a large
screen. The middle column is the one that has to stay above the horizon.

**Every section is a full screen** — `min-height: calc(100vh - 64px)`, the
sticky nav owning the other 64px, with the content flex-centred. Because those
sections are flex columns, **`.section-inner` needs an explicit `width: 100%`**:
a flex item with `margin: 0 auto` is shrink-to-fit, not stretched, so without it
every section silently narrows to the width of whatever is inside it. That bug
held Experience to ~894px of its 1480, and Projects to well under its 1120.
About and Experience both widen to `max-width: 1560px`; the rest stay at 1200. It is
`min-height` and not `height` on purpose: Projects needs about 625px for its
six cards and does not fit a 768px-tall laptop, so it is allowed to run past
one screen rather than clip, and the centring becomes a no-op the moment it
does. About sets its own top-weighted layout instead, because it has a horizon
to leave room for.

**Skills is not a section.** The marquee is About's right-hand column, running
vertically. It keeps its `#skills` id for deep links, but it is out of the nav —
the nav is `home / about / experience / projects / awards`, five items, and
Awards holds the slot Skills once had. A nav link to `#skills` would scroll
*backwards*, which is why it went. The hero's fourth cubesat points at
`#awards` to match; **its `id` has to equal the section id**, because
`onSelect` scrolls to `"#" + id`. The nav order is duplicated in all seven
files under `projects/` — change one, change them all.

Projects link OUT to individual detail pages under `/projects/` (multi-page for
project depth, single-page for top-level navigation) — via `.proj-obj` in the
scatter field now, not cards; see "Projects field" below. **Duplicate
`projects/_template.html` for any new
project page** — it already carries the `.nebula` div, the three-layer
`.stars` markup, the nav scroll-progress bar and the `data-reveal`
attributes. A page assembled by hand will silently lose the backdrop.

## Page behavior (`js/main.js`)

- **Scrolling.** Native `scroll-behavior: smooth` is switched off (JS adds
  `html.js-scroll`) in favour of an eased scroll — 620–1150ms scaled by
  distance, `easeInOutCubic`, cancelled the moment the user scrolls. It is
  exposed as `window.smoothScrollTo(target)` so the hero's ES module can
  reuse it without a second copy of the easing. Nav offset is `NAV_H = 64`.
- **Reveals.** Any `[data-reveal]` element starts offset and settles in on
  intersection; `data-reveal="left"` comes from the side instead of below.
  Siblings sharing a parent stagger 90ms apart, capped at 5 steps.
- **Nav.** Active link is whichever tracked section sits nearest the top of
  the band — decided once per observer callback, not per entry, or two
  sections fight over it. An orange indicator slides beneath, re-measured
  on resize and after `document.fonts.ready`.
  - The links are **centred on the bar**, not ranged right: `.navlinks` is
    absolutely positioned at `left:50%; top:50%` inside the sticky
    `.topnav`, so they stay centred whatever the wordmark's width. Both
    offsets are explicit rather than leaning on the parent's `align-items`
    to place an out-of-flow child, which browsers have not always agreed
    on. Below 900px it reverts to sitting at the right-hand end — centred,
    five links plus the wordmark do not fit across a phone. That row is
    **tight** and the mobile gap is down to 12px to hold it together; it has
    not been checked on a real handset.
- **Starfield.** Three layers moved by `background-position` (not
  transform) so the tiling stays seamless however far it travels; depths
  0.04 / 0.10 / 0.20 against scroll. A meteor spawns every 7–19s.
- **Nebula.** Moves by transform: scroll parallax at 0.006 (clamped ±30px,
  because unlike the star layers it does not tile and the offset
  accumulates over a session) plus a slow autonomous drift — sine on x
  with a ~4min period, cosine on y with a ~5.5min period. The 12%
  overscale in CSS is what keeps its edges off screen; **raise it if those
  amplitudes go up.**
- **Descent.** `initDescent` publishes three things off one scroll handler:
  `--descent`/`window.__descentP` (0→1 over the hero, driving the camera and
  the hero copy's lift-off), `window.__risePx` (a pixel offset for the globe
  past the horizon), and `--sky-color` (the nebula's colour fade). Globals
  rather than callbacks because `main.js` runs from `<head>` and the scene is
  an ES module that loads later; neither has to know the other exists, and the
  project pages have neither. See "The descent" below.
- **Clock.** Live UTC readout in the hero status strip.

## The descent — home and about over one continuous scene

Scrolling from the hero into About is a camera move, not a section break: the
globe is pinned across both and the camera flies in, until its limb is lying
across the foot of About as a horizon. The point is that About reads as
*arriving somewhere* rather than as the next screen down.

**It is one leg, and it ends at the horizon.** Over the hero's own height the
camera comes down until the globe's top edge sits on the `HORIZON_Y` row, and
there it stays — centred, about a third of the screen tall. `main.js` publishes
the progress as `--descent`/`window.__descentP`.

**Past the horizon the globe just rides the scroll.** There was briefly a
second leg of *camera* movement that flew over the planet; Krittin removed it.
What does the job instead is not a camera move at all: `main.js` publishes
`window.__risePx`, a plain pixel offset taken straight off the scroll, and the
frustum applies it 1:1. The planet travels at exactly the speed of the page, so
it reads as part of the page rather than as a camera doing something of its
own — and it arrives at Experience with **its underside across the top of the
section**, which is the point. Do not re-add independent camera motion here.

- **`rise` is deliberately not eased**, unlike every other value in that loop.
  A lag of even a few frames shows up as the globe sliding against the content
  it is supposed to be locked to.
- **It must stop exactly where the sticky scene unpins**, because from that
  point the scene's own box starts scrolling away at the same 1:1 rate. Let
  `rise` run past there and the two add up, and the globe leaves at double the
  speed of the page. `main.js` derives that release point (`.descent`'s bottom
  meeting the bottom of the viewport) rather than guessing at section heights,
  so the two stay locked together if any section changes size.

**The globe stays interactive the whole way down.** Drag, hover, the labels and
click-to-navigate are all live at every scroll position — `controls.enabled` is
just `introDone`. This is deliberate and Krittin asked for it twice: the globe
is the site's navigation, not a hero ornament, so you must still be able to
spin it and pick a section from About. Do not gate any of it on scroll
position again. It does not fight the scroll, because OrbitControls only owns
rotation while the descent writes the radius (which OrbitControls preserves)
and the frustum offset, and zoom is off.

- An earlier version faded the cubesats out as they climbed off the horizon, to
  keep them off the bio. That had to go — you cannot click what is not drawn.
  Shrinking them with the descent (`1 - 0.45 * descent`) is what keeps them
  from dominating instead.

- **`horizonPan(distance, h)`** is what places it: it lands the globe's top
  edge on the `HORIZON_Y` row, leaving the planet hanging below. Derived from
  the live distance and field of view rather than a pixel offset, so it hits
  the same row at any window size.
- **`HORIZON_Y` is the dial for how much planet is on screen.** Lower means
  more. It is 0.70, so roughly the bottom third. **`--horizon-band` in
  `style.css` is its other half** — the space reserved at the foot of About so
  the copy clears the globe — and the two have to move together. The portrait
  and the vertical marquee are sized to fit whatever is left.
- **The pinning.** `#home`, `#about` and `#experience` live in one `.descent`
  wrapper, with `.hero-scene` as its sticky first child. Experience is inside
  it because the scene has to still be **mounted and rendering** while that
  section is on screen — the canvas is clipped to its own box, so once the box
  scrolls off there is nothing to see no matter where the camera points. That
  is the whole reason the globe was missing there before. The scene is sized and offset to the
  band **under** the nav (`top: 64px; height: calc(100vh - 64px)`), not to the
  whole viewport: `.descent` starts 64px down the document, so a plain `100vh`
  box hangs below the fold at rest and takes the telemetry readout with it.
- **It keeps its full flow height, and that is load-bearing.** A sticky
  element's release point is set by its *margin* box, so the usual
  `margin-bottom: -100vh` trick to reclaim the space would keep the scene
  pinned a screen too long. Keeping the flow height and pulling the hero back
  up over it (`.hero { margin-top: calc(-100vh + 64px) }`) instead releases it
  exactly as `.descent`'s bottom reaches the bottom of the viewport — which is
  also where `rise` stops, so the two hand over seamlessly.
- **Progress runs 0 → 1 over the hero's own height**, so low orbit is reached
  exactly as About's top meets the nav. The descent costs no extra scroll
  length — nothing is pinned open to make room for it.
- **The dolly is the smaller half of the effect.** `fitDistance()` still owns
  the resting framing and keeps its 5–16 clamp; the descent target bypasses
  that clamp but never pulls *further* out than the resting distance. It is
  the frustum pan that actually makes a horizon.
- **`LOW_DISTANCE` is not a free parameter.** The outermost orbit is at 3.5;
  closer than ~5.6 and a cubesat's nearest pass sits right on the camera. The
  payloads also shrink with the descent (`1 - 0.45 * descent`) so a near pass
  is not a cubesat the width of the bio column drifting across it.
- **The scene is a sibling behind three sections now**, so `.hero`, `.about`
  and `.experience` are `pointer-events: none` with their content blocks
  taking it back. Otherwise the sections cover the canvas and swallow every
  drag — and Experience needs its content block back for the row hovers.
- **No descent below 900px or under reduced motion.** There is too little
  vertical room to give a quarter of it to a horizon, and About's stacked
  content would sit on top of a solid planet. The scene goes back to covering
  the hero — `position: absolute` inside `.descent`, whose top edge *is* the
  hero's, with the compensating negative margin removed. **Those overrides must
  set `left: 0; right: 0`:** switching from sticky to absolute drops the
  block-level auto width, and the box would shrink to fit, taking the canvas
  (`inset: 0` against it) to zero. `main.js` pins progress at 0 under both
  conditions, and `orbit-scene.js` pans the globe down a fixed 0.16 of the
  height instead so it stays out from behind the name.
- **The scene is deliberately NOT given a `view-transition-name`.** It is
  content, not chrome, so it belongs in the root snapshot and should leave with
  the rest of the page. Naming it would pull it into its own group that then
  needs its own keyframes to look right.

## Experience — the lit list

Modelled on a reference Krittin supplied, adapted to this system. A row is a
hairline-ruled band, **barely tinted at rest (2.2% white) so the starfield and
the globe read straight through it**, laid out as
`index | role + org | one-line summary | tag + dates`.

On hover the row **inverts to a near-solid light panel** (`rgba(250,250,250,.95)`)
with the type flipping to the void colour, and its highlight bullets unfold
underneath. Black and white, no colour, matching the rest of the chrome.

- The unfold is `grid-template-rows: 0fr -> 1fr` on `.exp-detail`, which is the
  only way to transition to an automatic height. Browsers without it snap the
  panel open, losing nothing but the ease.
- `--green` is picked to read against black, so the `.exp-tag` gets a darker
  ink in the lit state rather than being carried over unreadable.
- Below 900px there is no hover to rely on, so the detail is simply always
  open and the row collapses to a single column.
- There are **six** rows, and the section widens `.section-inner` to 1560px
  to match About so the two line up in the same frame.
- The globe's underside covers roughly the top 40% of the section at the
  moment it arrives, so the first row sits behind it until it rides clear.
  Seen on screen this is heavier than it sounds — if it needs fixing, the
  dials are the row tint and where the content sits vertically.

## Page transitions and backdrop continuity

The two work together: the point is that navigating between the index and a
project page should read as the content swapping over one continuous piece
of sky, not as two separate pages.

- **The transition** is `@view-transition { navigation: auto; }` in
  `style.css` — cross-document, no JS needed, and it simply does nothing in
  browsers that lack it.
- **The chrome is held still**, not just the backdrop. `.nebula`, `.stars`,
  `.topnav` and `footer` all carry `view-transition-name`s, so they're
  snapshotted separately from the page content with their animations
  disabled. They're identical on both sides, so nothing appears to move and
  the navigation reads as content swapping *inside a fixed frame* rather
  than the whole page blinking out and back. This is the single change that
  most improved how the transition feels — do not fold them back into the
  root snapshot.
- **Motion is directional.** `main.js` sets `data-vt="forward"|"back"` on
  `<html>` before the snapshot, and the keyframes branch on it: going into
  a project the new page rises into place, coming back it settles down from
  above. It has to be set on **both** documents — the outgoing page's CSS
  drives `::view-transition-old`, the incoming page's drives
  `::view-transition-new`.
- Timing is deliberately unhurried and overlapped: 260ms out, 520ms in
  after a 90ms delay, 560ms for the shared-element morph.
- **That only works because the offsets are carried over.** Scroll resets
  to 0 on a new page, so each layer keeps a *base* offset which
  `initStarfield` persists to `sessionStorage` (key `krj-backdrop`) on
  `pagehide` and restores on load; the new page's scroll parallax is added
  on top. The drift clock rides along too, so the slow motion continues
  rather than restarting. `initStarfield` paints the restored position
  synchronously — `main.js` runs before first paint, and the incoming
  view-transition snapshot is taken right after, so a late restore would
  show as a jump.
- **Shared-element morph.** The clicked project's media and title morph into
  the detail page's `.detail-media-inner` and `.detail-title`. `cardFor()` in
  `initPageTransitions` looks for either `.proj-card` (the old grid, kept
  inert as the revert path) or `.carousel-link` (the live carousel) matching
  the href, and `tag()` reads `.proj-media`/`.carousel-model` and
  `.proj-title`/`.carousel-title` off whichever it found — so this keeps
  working no matter which markup is live. The detail halves are named in CSS
  (unique per page); the index side is tagged per-click by
  `initPageTransitions` on `pageswap` going out and `pagereveal` coming back,
  then untagged on `finished` — only one element may hold a given name at a
  time.
  - **Do not put `data-reveal` on `.detail-header` or `.detail-media`.**
    A reveal leaves them at `opacity: 0` when the snapshot is taken, so the
    morph lands on nothing. They're above the fold and the transition
    already animates them in. `.facts` and `.desc` keep their reveals.
- **Fallback** for browsers without cross-document view transitions: a
  200ms exit fade before navigating. Deliberately exit-only — an entry fade
  would need `opacity: 0` applied before first paint, and any failure there
  leaves someone staring at a blank page.
- Reduced motion disables all of it (`::view-transition-*` needs an
  explicit opt-out; it does not honour the preference on its own).
- **`main.js` is loaded from `<head>`, render-blocking, on every page.**
  `pagereveal` fires at the incoming document's first render, and both the
  direction flag and the carried-over backdrop offsets must already be
  applied by then. An end-of-body script usually gets there first, but only
  because the parser happens to win the race. Keep it in the head.
- **Testing note:** Chrome skips view transitions entirely in a background
  tab — `pagereveal` still fires but `event.viewTransition` is null, and if
  rendering is fully suppressed `pagereveal` may not fire at all. A
  transition that looks broken in an automated/hidden tab is very likely
  fine; check it in a focused window before changing anything.

## Home hero

- Left ~third: name "KRITTIN JINDAMAI" (types on across two lines on page
  load — the `|` in `data-typing-name` is the line break), preferred name
  "(Yim)", title "Senior Aerospace Engineering Student" with a focus line
  ("ADCS, GNC, Nonlinear Control Focus", styled `.hero-focus` — same
  instrument-label treatment as `.eyebrow`, orange status dot included), a
  live status strip (UTC clock + tracked-payload count), and numbered links
  to Resume / LinkedIn / GitHub.
- Right ~two-thirds: real Three.js 3D scene (`js/orbit-scene.js`).
  - **Globe: a cartographic instrument, not a photoreal planet.** Solid,
    blue oceans + green landmasses, but everything about the treatment is
    flat, to match the rest of the site:
    - Elevation is **posterised into discrete bands** — three ocean depths,
      three land elevations topping out at `--green` — not smooth ramps.
      This is the single move that makes it read as a chart.
    - A **hairline coastline** is stroked at the land/sea boundary: the
      same 1px rule every border on the site follows.
    - Ice caps are flat and hard-edged with a hairline at the ice margin.
      The threshold is on `abs(n.y)`, the cosine of the polar angle — keep
      it high (0.938 ≈ a 20° cap); 0.8 swallows a third of the globe.
    - The terminator is **quantised to four steps**. Smooth falloff and
      specular highlights both read as photography and were removed.
    - Clouds are two flat `--chalk` levels at 15% — a weather overlay on a
      chart, not volumetric cloud.
    - **No glow anywhere.** The fresnel atmosphere shell was replaced by a
      billboarded hairline **limb ring**. It sits at `GLOBE_R * 1.075`,
      outside the globe's *apparent* silhouette, which perspective makes
      slightly larger than `GLOBE_R`. It used to carry four orange cardinal
      ticks; Krittin had them removed, so the limb is a plain hairline and
      the only orange left in the scene is the equator ring and the cubesat
      status markers. Do not put a reticle detail back on it.
  - Continents are procedural (domain-warped fBm value noise), baked ONCE
    at init into a 2048×1024 equirectangular render target and sampled
    thereafter — RGB is albedo, alpha is cloud density. **Do not move that
    noise back into the per-frame shader**; it is ~24 fBm evaluations per
    fragment and far too expensive on integrated graphics. The bake's
    direction reconstruction mirrors `THREE.SphereGeometry`'s UV
    convention exactly, so changing one means changing the other.
  - A low-opacity graticule and the orange equator ring stay *on top* of
    the solid surface. Keep them.
  - Starfield is real 3D geometry behind the globe, so it moves with the
    camera when you drag.
  - **The canvas is full-bleed and spans the hero, About AND Experience**
    (`.hero-scene`, sticky inside `.descent` — see "The descent" above), with
    the text layered above it. It used to be boxed inside `.hero-right`, which
    **sliced a cubesat in half** the moment its orbit crossed into the text
    column, and then inside `.hero`, which is why the globe used to end
    where the hero did. Do not put it back inside either.
    - The telemetry readout and drag hint live in `.hero-scene` now, not in
      `.hero-right`. That is what keeps the readout with the globe through
      the descent instead of scrolling away with the name — it is the thread
      tying the two sections together, and `range` counts down as the camera
      comes in. `.hero-right` is left as an empty spacer, which is the block
      the scene sits in on the stacked layout.
    - The globe still reads as being in the right two-thirds because the
      camera's frustum is offset (`camera.setViewOffset`) to put the scene
      centre at `SCENE_CENTER_WIDE` (0.68) of the width. A negative x
      renders a window to the *left* of the virtual frame, which moves the
      scene right on screen.
    - Stacked layouts (≤900px) centre it again and shrink `.hero-scene` to
      the lower block so it doesn't sit behind the name. The JS breakpoint
      reads `window.innerWidth`, not the container, so it flips at exactly
      the same point as the CSS `max-width: 900px` rule — a scrollbar makes
      the container narrower than the viewport.
  - **Camera distance is computed, not hard-coded.** `fitDistance()` places
    the camera as close as possible while the outermost orbit still fits,
    from the live aspect ratio and the scene-centre offset (the offset side
    has less room, and that shorter side is what has to fit). Clamped 5–16.
    Change `SATELLITES` radii and this follows automatically.
  - Polar angle is clamped to ~±25° of elevation. Over the pole the
    graticule collapses into a spiral and the orbits project at their full
    radius vertically, throwing cubesats off the top. Note the fit is
    computed for the resting elevation, so an aggressive tilt can still
    push a cubesat under the nav — guaranteeing otherwise would mean
    pulling the camera back to ~9 and losing a third of the globe.
  - Camera eases in from 2.6× that distance on load while the planet fades
    up. `controls.minDistance/maxDistance` are deliberately wide (3/40) so
    OrbitControls doesn't clamp that arrival tween — zoom is disabled, so
    they have no other job.
  - Mouse-drag rotates the view in any direction (trackball-style); a slow
    idle drift resumes ~1.4s after you let go. No visible orbit path lines.
  - 4 cubesats, drawn as technical illustrations rather than lit models.
    **There are no lights in the scene at all** — every material is either
    a custom shader or a flat `MeshBasicMaterial`, deliberately. The body
    takes six fixed per-face fills straight from the palette (`+X, -X, +Y,
    -Y, +Z, -Z` is the `BoxGeometry` group order), stepping light-to-dark
    top-to-bottom so the form reads without any lighting. Solar arrays get
    a flat `--carbon` fill, a `--bone` hairline outline and two internal
    cell dividers; there's a hairline antenna boom and a single saturated
    status marker, which is the only role orange and green may play.
    - An earlier version used near-black flat fills and read as holes
      punched through the planet. Mid-greys are what fixed it — not
      lighting.
  - Each label is HTML, always upright, tracks its cubesat, and brackets
    up on hover along with the cubesat scaling. Clicking one eased-scrolls
    to its section: About / Experience / Projects & Papers / Awards. All of
    this stays live at every scroll position — see "The descent".
    - **Hover is recomputed every frame from the stored pointer position**,
      for both the 3D body (raycast) and the label (a rect test against the
      previous frame's projected position). Do not go back to
      `pointerenter`/`pointerleave` on the labels: the labels move under a
      stationary cursor, browsers do not reliably re-fire those for a
      self-moving element, and a label would stay stuck in the hovered
      state after sliding out from under the pointer. Label widths are
      measured on font-load and resize, never inside the loop — reading
      `offsetWidth` there would force a reflow every frame.
  - A telemetry readout in the corner (camera azimuth/elevation, range,
    tracked payload's orbital radius and true anomaly) is driven off the
    live scene, throttled to ~8Hz. It is real data, not decoration, and
    that is the point: it is what keeps the hero from reading as a generic
    template.

## Content status — placeholders pending real content from Krittin

- About: bio paragraph still TBD, and photo still placeholder — needs real
  copy + headshot. The photo is the left column and is deliberately large
  (420×440, sized to whatever the horizon band leaves); it briefly carried a
  based / program / focus / status block underneath, which Krittin had removed
  — do not put metadata back under it
- Education — now a short list at the end of About's middle column, not a
  section. Filled with real content: Suankularb Wittayalai School
  (2017–2021), United World College Costa Rica / IB Programme (2021–2023),
  University of Florida / Honors Aerospace Engineering (2023–2027), listed
  most-recent-first
- Awards & Certificates (`#awards`) — filled with four real entries (VBU,
  Dean's List, Honors, UFIC Certificate) in `.awards-grid` /`.award-card`;
  each `.award-media` box is still a placeholder — Krittin is adding a
  certificate image per award later
- Experience: **six** rows, all named, in the order Krittin gave: Undergraduate
  Research Assistant (Nonlinear Control Research Group), Teaching Assistant
  (Mechanics of Materials Lab, UF), Mechanical and Testing Engineering Intern
  (GISTDA), Guidance Navigation and Controls Lead (Swamplaunch), Payload
  Software Associate Lead (Swamplaunch), Undergraduate Research Assistant
  (King Mongkut's University of Technology North Bangkok). Only the first row
  has a real date (Fall 2025 – Present, from Krittin) — the rest still need
  real dates, a one-line summary for the row itself, and 2 short highlight
  bullets for the panel that unfolds on hover, pulled from his resume once
  it's supplied
- Projects & Papers (6), renamed a SECOND time to the names Krittin actually
  uses. **Filenames have never changed and must not** — they were kept through
  both renames to avoid breaking links, so every slug still reads like the
  project it was two names ago. The current mapping, which he confirmed
  explicitly, is the authority:

  | Title | File | Placement in the field |
  |---|---|---|
  | Project TerraGator | `rocket-airbrake.html` | rocket, mid-air |
  | Project Navigator | `rocket-software.html` | rocket, mid-air |
  | Hybrid CMG Momentum Desaturation | `thesis.html` | 12U cubesat, live-orbiting the Moon (see "The Moon is a real 3D body" below — not a placed still) |
  | Non Holonomic Control Barrier Function | `ros-research.html` | robot on the drawn floor |
  | Sky Crane | `controls-final-project.html` | live-3D lander fixed to the Moon's surface, turns with it (not a placed still) |
  | Lunar Hopper | `senior-design-project.html` | live-3D parabolic hop trajectory on the Moon, no model at all; keeps the `.proj-status` pill on its mobile-fallback still only |

  Note two mappings that look wrong and are not: TerraGator is the *airbrake*
  page and Navigator the *software* one, which is the opposite of the
  alphabetical guess. `thesis.html` keeps the full paper title ("Hybrid Control
  Moment Gyroscope Angular Momentum Desaturation Using Magnetorquers for
  CubeSats in Low Earth Orbit") in its `.detail-sub`.

  Each still needs a real description, timeframe, role, tools, and linked paper
  PDF — Krittin said he'll add those per project. Detail pages were left on the
  existing template deliberately; he scoped this redesign to the section only.
- Skills marquee: the list is **duplicated** in the markup for a seamless loop
  — edit both copies or the loop will jump. It runs vertically in About's
  right-hand column (`.marquee-v`, animating `translateY` from -50% to 0 so it
  drifts *downward* and lands where it started), and reverts to the original
  horizontal band below 900px, where a vertical strip makes no sense.
- Resume PDF, LinkedIn URL, GitHub URL — not yet provided (the links are
  live in the markup but point nowhere)

**Do not fabricate any of the above.** Placeholders are marked in
brackets, e.g. `[Placeholder description]` — leave them as-is until
Krittin supplies real content/media.

## Projects field — the live Projects section

One fixed-scatter diorama over open sky. No cards, no grid, no carousel: still
images placed at explicit coordinates with nothing but the project title under
each, and a Moon in the bottom-right corner that is a real 3D body, not a flat
image. Krittin specified all of it, and chose each of the four structural
options below explicitly — treat them as settled, not as defaults to revisit
(two of them were later revised again for specific objects; see the "Update"
notes under "Model art" and "The Moon is a real 3D body" for what changed and
why — the settled defaults below are what still applies to everything else):

- **A separate, lightweight scene — NOT the hero globe continuing.** He was
  offered the continuous-camera version (extending `.descent`'s pinned scene
  past Experience) and turned it down. `.projects` still sits outside
  `.descent`, the globe still releases at Experience exactly as documented in
  "The descent", and none of that math was touched. Keep it that way.
- **Stills he supplies, not generated art and not live 3D — except where he
  later asked for exactly that.** TerraGator/Navigator are now Higgsfield
  stills and the Hybrid CMG object is now live 3D orbiting the Moon; see the
  "Update" notes below. Everything else is still a supplied still.
- **The section only.** The six detail pages under `projects/` got their
  displayed titles changed and nothing else.
- **One screen.** The field is a single viewport-height composition rather than
  a scrolling scene.

**Where it lives:** `.proj-field` in `index.html`, CSS under "projects field"
in `css/style.css`, behaviour in `initProjectField()` in `js/main.js`.

**This is the one section that runs edge to edge.** `.projects .section-inner`
drops `max-width` entirely and keeps a 48px gutter — About and Experience widen
to 1560px, this goes full page. Krittin asked for it: held inside the shared
1200px measure the six objects bunched into the middle third of a wide screen.
The scatter percentages were re-derived for the full width, so narrowing the
measure again means redoing them.

**One coordinate system now, not two.** The objects in space (the two rockets,
the CBF robot) are placed against `.proj-field` — `--x` is the model's
horizontal *centre*, `--y` its *top* edge, both percentages. Top rather than
centre because it makes "does this clear the Moon" arithmetic you can do in
your head.

There used to be a second system: `--mx`/`--my`, percentages of `.proj-moon`'s
own box, welding Sky Crane and Lunar Hopper to a fixed point on the limb via
`mx = 50 + R(cos theta)` / `my = 50 - R(sin theta)`. **That system, and
`.proj-obj--lunar`, are gone.** Both projects (and the Hybrid CMG cubesat) are
real 3D now, positioned by `js/moon-scene.js` directly rather than read from
CSS — see the "Update" note under "The Moon is a real 3D body" below for the
full story of what replaced each one and why. `FRUSTUM_R` in that file still
exists and still matters, but it is now purely that file's own concern; CSS no
longer derives anything from it.

**`--obj-scale` is the dial** for "everything is too big for this screen". The
positions are percentages and rescale themselves; only the object footprints
are in px. Now that the field runs edge to edge the binding constraint is
**width**, not height — the objects are spread horizontally and it is the
horizontal gaps that close first — so `--obj-scale` steps on `max-width` and
the one `max-height` query only shortens the field. `.projects` is also
top-weighted (`56px 0 40px`) rather than keeping the 120px section rhythm,
because that rhythm was eating the vertical room the field needs on a laptop.

**`overflow:hidden` on `.projects` is load-bearing, not tidiness.** The Moon is
deliberately bigger than the field and hangs off its bottom-right corner. Left
unclipped it reaches past the viewport on anything at or under ~1200px wide —
a horizontal scrollbar on the whole page — and spills down over the Awards
cards, which are transparent and would show it through. It is clipped at the
*section* rather than at `.proj-field` on purpose, leaving ~100px of section
above the field (top padding plus the eyebrow) as breathing room. (This used to
also matter for the launch rocket flying in through that space — see the
"Update" note near "The rocket" below for why that no longer applies.)

**The Moon is a real 3D body** — `js/moon-scene.js`, a second Three.js module
mounted from the same inline `<script type="module">` as the hero. Krittin
asked for it explicitly: rotating like the Earth, draggable, "same style and
colors as the earth". It reuses the globe's whole approach — a one-off
equirectangular bake, posterised elevation bands rather than gradients, a
hairline rule at the mare/highland boundary exactly where the Earth gets its
coastline, a hairline limb ring instead of any glow, a low-opacity graticule
with an orange equator on top of the solid surface, a terminator quantised to
four steps, the same light vector, and **no lights in the scene at all**.

Three deliberate differences, all forced by the subject:

- **No cloud shell** — no atmosphere. The bake's alpha channel carries crater
  rims instead of weather, and the surface shader strokes them as a hairline.
- **Greys, not blue and green.** The ramp runs from mare basalt up to
  `--warm-granite`, so the whole thing still comes out of the site palette.
  Read "same colors" as the same palette and the same treatment, not literally
  Earth's blues — it is the Moon.
- **An orthographic camera**, where the globe is perspective. **This is not a
  style choice and must not be "fixed".** The two lunar projects are placed on
  the limb from CSS percentages of the canvas's box, so the projected disc has
  to inscribe that box at a known fixed fraction whatever the camera does.
  Orthographic makes the silhouette exactly a circle; perspective would let it
  drift with the camera and the landers would float off the surface. For the
  same reason `enableZoom` stays off: on an ortho camera OrbitControls dollies
  by changing `camera.zoom`, which would rescale the disc inside its box.

**Craters come from Worley (cell) noise**, not fBm — fBm alone gives
reticulated ridges and never circles. Two size classes, both gated by a slow
fBm so craters cluster into fields rather than tiling evenly. 27 cells per
sample is expensive and entirely fine: it only ever runs in the bake.

**It renders only while the section is on screen**, via its own
IntersectionObserver, and stops on `visibilitychange`. That is the whole reason
a second WebGL context is affordable on a page that already runs a full-screen
scene with a 2048×1024 bake — Krittin's laptop is the constraint, and there is
a standing note about not running the site to check it. The bake is also half
the globe's resolution (1024, not 2048), and `index.html` mounts the scene only
when the canvas has a non-zero width, so the stacked layout — which sets
`.moon-canvas { display: none }` — never creates the context at all.

**Update, same day — a 7th object lives in this scene now: the Hybrid CMG
cubesat, in a real orbit.** Krittin asked for "a 12U cubesat orbiting the moon
like home page" for the Momentum Desaturation project, explicitly *not* via
Higgsfield — a live 3D object, not another generated still — "but doesn't have
to move with the moon," i.e. unlike Sky Crane and Lunar Hopper it does not need
to be welded to a fixed point on the limb. `buildCmgCubesat()` in
`js/moon-scene.js` ports the bus-plus-4-pyramid-CMGs design from
`scripts/model-renders.html`'s `buildHybridCMG()` (same near-invisible-hull-
over-visible-CMGs cutaway) so it can actually orbit instead of sitting as a
flat still; `positionCmgSat()` moves it the same way the hero's satellites
orbit the globe (tilt + inclination + steady angular speed), and its HTML
label is positioned every frame from its real projected screen position and
reuses `.cubesat-label`/`.cl-name` rather than duplicating that styling.

This is *not* a free addition to the scene: an orbiting object needs frustum
room the tightly-cropped Moon canvas didn't have (it was cropped to within 2%
of the limb ring), so `FRUSTUM_R` grew to fit `ORBIT_R + CUBESAT_REACH`
instead of just the ring, which shrank the disc's radius fraction inside its
box (45.6% → 36.8%, back when CSS still cared about that number — see the next
update below for why it no longer does, and for why the Moon reads bigger
again despite this).

**The flat `hybrid-cmg.png` still exists but is now a fallback only**, shown
solely in the ≤900px stacked layout (`.proj-obj--moon-fallback` in
`index.html`/`style.css`, generalized in the next update to cover Sky Crane
and Lunar Hopper too) — the one layout where the Moon canvas never mounts at
all, so it is the only place this project would otherwise vanish entirely. It
is hidden everywhere else. This means the "other four still go through
`model-renders.html`" line in the update above is stale: it is now the other
**three** (`nonholonomic-cbf`, `sky-crane`, `lunar-hopper`) for the *live*
site, though `buildHybridCMG()` there is still what the fallback PNG and
`buildCmgCubesat()` both trace back to — keep it in sync if the CMG design
ever changes.

**Update, same day again — the Moon got bigger, fully visible, and two more
objects went live-3D.** Three more requests landed in the same session:

- *"make moon more up? cuz rn when the orbit is flipped, the satellite is not
  visible"* — this was never really about vertical position, it was
  `.projects`' own `overflow:hidden` clipping `.proj-moon`'s box. The box used
  to hang 60% off the bottom of the field on purpose (`bottom: calc(-.60 *
  var(--moon-d))`), so anything in that 60% — including the CMG cubesat
  whenever its orbit swung to the far side — was being clipped away by the
  section, not by the canvas. Setting `.proj-moon{ right:0; bottom:0; }` and
  making `.proj-field`'s own `min-height` react to `--moon-d`
  (`max(560px, calc(var(--moon-d) + 48px))`) fixes both asks with one change:
  the box is fully contained, so nothing on it can be clipped regardless of
  orbital phase.
- *"make moon bigger and make the entire moon visible on the right side"* —
  `--moon-d`'s clamp grew (`520/62vw/980` → `600/72vw/1100`) and moved to be
  owned by `.proj-field` rather than `.proj-moon`, specifically so the
  min-height above could reference the same number. **This makes `.projects`
  noticeably taller than before** on most viewports — there is no way to fit a
  bigger, fully-visible Moon into the same vertical space; the section was
  already documented as allowed to run past one screen, and now it runs
  further past it. This is a deliberate trade Krittin asked for, not a
  regression to fix.
- *Sky Crane → "just a simple model [that] stay[s] still on the moon surface
  and rotates with the moon."* `buildSkyCraneLander()` is a simplified stand-in
  for `model-renders.html`'s full descent-stage build (no bridle, no hanging
  payload — those depict a still-descending vehicle, wrong for something that
  has landed): a deck on 4 splayed legs. `anchorOnSurface()` places it at a
  fixed lat/lon via `surfaceNormal()` and orients its local +Y to the outward
  normal there, then it is parented to `body` (the same group the Moon mesh
  and graticule already share) — since the Moon has no self-spin of its own
  (see the header note in `js/moon-scene.js`; what visibly "rotates" it is
  the camera's own autoRotate/drag), parenting to `body` is what makes a fixed
  surface point turn with the Moon as the camera moves around it.
- *Lunar Hopper → "just make a trajectory from moon south pole to a random
  spot like a parabola (no need model) ... use that as the project model
  instead."* `hopTrajectoryPoints()` spherically interpolates between two
  surface points (the south pole and an arbitrary landing point) and lifts the
  path away from the surface by a sine taper peaking at the midpoint — a hop
  that leaves and returns to the surface, not a chord cutting through the body.
  Originally rendered as a dashed `THREE.Line`, later rebuilt as a
  `THREE.TubeGeometry` for real thickness (see the next update) — also
  parented to `body`. There is deliberately no lander model for this one, per
  the request.
- **Both of the above needed a way to be clicked**, same as every other object
  in the field, so `js/moon-scene.js` gained a shared `makeMoonLabel()` +
  `placeLabel()` pair (generalized from the CMG cubesat's own label code) —
  all three Moon objects now project an anchor `Object3D` into `#moon-labels`
  every frame. Sky Crane's anchor is the lander itself; Lunar Hopper's is a
  plain invisible marker placed at the trajectory's apex, added purely so it
  has a real object to project from.
- **The `--mx`/`--my` CSS placement system is gone entirely**, along with
  `.proj-obj--lunar` — both former lunar landers were the only things using
  it. `.proj-moon` now contains nothing but the canvas and `#moon-labels`; the
  three flat fallback stills (Hybrid CMG, Sky Crane, Lunar Hopper) moved out
  to sit as plain `.proj-obj` siblings in `.proj-field`, sharing one
  `.proj-obj--moon-fallback` class (hidden ≥900px, shown only in the stacked
  layout, same mechanism as before just generalized to three objects instead
  of one).
- **The two rockets were also rescattered and given flight paths.** "Utilize
  more space" moved TerraGator/Navigator from a cramped upper-left cluster
  (`--x` 7–21%) out to `--x` 11–37% with more vertical spread too, clear of
  both the CBF floor and the now-larger Moon. A new `.proj-trajectories` SVG
  (first child of `.proj-field`, so it renders behind every object) draws one
  dashed orange path per rocket, in the same 0–100 percentage coordinate space
  as `--x`/`--y` (`viewBox="0 0 100 100"`, `preserveAspectRatio="none"`), each
  starting off-field and curving through its rocket toward the Moon — which
  naturally occludes the tail end since the Moon canvas paints on top of it
  (later in the DOM). This is decorative, not measured against the rockets'
  exact pixel centres; non-uniform viewBox stretching means the curve shape
  isn't pixel-perfect at every viewport width, which is an accepted trade for
  not needing JS to keep an SVG's viewBox in sync with a responsive field.

**Update, same day, round 3 — bigger got too big, and three more asks.**
Krittin's next pass on the same session: the Moon (just enlarged) was now
"too big and not fully visible (entire moon in one page)"; the CMG cubesat,
Sky Crane and the Hopper trajectory should be bigger, "dont need to be small
compared to moon... the whole goal is to make people able to see clearly what
projects i have"; the rocket trajectories should look more natural/abstract,
with the rockets oriented to match them, ideally with one looping toward the
Moon and one heading back out; and a small clickable side list, "where
possible."

- **The Moon-too-big fix was a units bug, not a size bug.** `--moon-d` had
  been sized off `vw` (viewport width), so on any wide-but-short viewport it
  could demand more vertical room than the screen actually had — exactly the
  "not fully visible in one page" complaint, and a direct contradiction of
  this section's own "One screen" rule further up. It's `vh`-based now
  (`clamp(380px, 56vh, 720px)`, down from the `vw` version), which bounds it
  to a fraction of the dimension that actually matters for "fits on one
  screen." `.proj-field`'s `min-height` formula didn't change, but because
  `--moon-d` is now itself vh-bounded, it can no longer force the section past
  one screen on realistic viewports the way the `vw` version could.
- **`ORBIT_R`, `CUBESAT_REACH`, and the actual geometry in `buildCmgCubesat()`
  and `buildSkyCraneLander()` all grew** (roughly 1.8–2.4×) — legibility of
  "which project is this" beats literal 12U-vs-Moon scale, per Krittin's own
  framing above. This costs a bit more of `FRUSTUM_R`'s room, shrinking the
  Moon's disc fraction inside its box a little further — an accepted trade
  for the same reason.
- **The Hopper trajectory stopped being a `THREE.Line` and became a
  `THREE.TubeGeometry`** (radius 0.045, 6 radial segments for a faceted,
  technical look rather than a smooth tube), rendered with the same
  near-invisible-fill-plus-`BONE`-hairline-edges treatment as everything else
  on the Moon. A 1px `Line` was never going to read as "bigger" — most WebGL
  implementations ignore `Line`'s own `linewidth` entirely, so real geometric
  thickness was the only lever available. `liftFactor` (how far the arc lifts
  off the surface at its midpoint) also doubled, 0.16 → 0.32, for a more
  pronounced hop.
- **The rocket trajectories were redrawn and the rockets' `--rot` recomputed
  to match them** — see the long comment above `.proj-trajectories` in
  index.html for the full reasoning, which matters because it is
  counterintuitive: on this edge-to-edge field, `preserveAspectRatio="none"`
  stretches x far more than y, so a curve that reads as a natural 15–20° lean
  ON SCREEN has to be drawn nearly vertical IN THE VIEWBOX, under an assumed
  stretch ratio (~2.25:1) hand-baked into both the curve control points and
  the `--rot` values together. TerraGator's curve now loops in toward the
  Moon; Navigator's loops back out the side it came from, never reaching the
  Moon — "one going to moon, one going out." Both curves run well past each
  rocket's own icon, on the theory that the drawn path is the *whole* planned
  trajectory (past and future), not just "where the rocket already is." **None
  of this curve/rotation math was checked visually this session** — it is a
  reasoned derivation under a stated (assumed, not measured) aspect ratio, not
  a verified result. Check that each rocket's nose actually points along its
  own line before trusting it further, and re-derive both together (not just
  one) if it doesn't.
- **`.proj-index`** is new: a small plain-text list of all six project titles,
  pinned to the field's top-left corner, always clickable regardless of how
  legible the scatter itself is at a given moment — the guaranteed fallback
  Krittin asked for. Deliberately minimal (no art, no hover-lift) so it reads
  as a utility, not a second diorama competing with the first. Hidden on the
  stacked (≤900px) layout, where that layout's own flowed list already serves
  the same purpose.

**Update, rounds 4-7 (same day), superseded — the rotated-rocket-plus-
trajectory-line approach was tried for several rounds and eventually
abandoned; kept here as a two-paragraph summary rather than the original
blow-by-blow, since none of the code it describes still exists.** Across four
rounds, TerraGator and Navigator were rotated to steep angles (up to ~90deg)
to "point along" a hand-drawn SVG trajectory curve meant to lead from
off-field to the Moon, with the rotation angle computed from each curve's
chord under an assumed, unverifiable viewBox stretch ratio. Each round fixed
a real, diagnosable bug in that approach (a curve passing above the rocket
because `--y` is a top edge, not a centre; a visible kink where two curve
segments met; the rotated image's footprint overlapping the CBF floor; a
label sitting far from the rotated body because rotation pivots around the
box's centre) — but the fundamental problem was that every one of these fixes
depended on assumptions (field aspect, field height, viewBox stretch) that
could not be verified without opening the browser, so each fix could only be
confirmed or refuted by another round of "still doesn't look right."

**Round 8 cut the dependency instead of fixing it again**: Krittin asked to
drop the whole rotated-trajectory idea — "put 2 rockets vertical on the right
side (side by side)... remove trajectory lines... reorganize everything so
all my projects are spaced out evenly." The `.proj-trajectories` SVG, `--rot`,
and `--pull` are all gone from the two rockets (standing upright means the
label sits naturally close to the image without needing rotation
compensation). One number from round 7 survived: `.proj-obj-label`'s
font-size (13px→15px, applies to every object). See "Projects field" above
and "The Moon is a real 3D body" below for where things actually stand now.

**Round 9 — bigger again, and the two rockets' bases are deliberately level,
not their tops.** Krittin: "make moon bigger!! and both rockets bigger...
but the base of the 2 rockets must be level to show one is taller." `--moon-d`
went up again (`500/43vw-or-100vh-120/1050` → `550/47vw-or-100vh-100/1150`).
The rockets' `--w` went up too (190/180 → 215/195) and, more importantly,
their `--y` values are now intentionally UNEQUAL: since `--y` is a box's top
edge, not its centre or base, levelling the *base* of two boxes with
different heights means solving `top + height = same value` for each —
TerraGator (the taller box) sits at a proportionally smaller `--y` than
Navigator by their height difference, converted to an assumed field-height
percentage. Same standing caveat as every numeric estimate in this section:
not verified in a browser.

**Round 10 — rockets 2x bigger and moved left; a "trajectory" request that
turned out to be about the Moon, not the field.** Krittin: "make trajectory
just one line - - - - but a little thick, make rockets 2x bigger each and
move each more left rn its too close to the border." First pass at this
misread "trajectory" as a new 2D flight-path SVG for the rockets' field — he
corrected that mid-turn: it meant the **Lunar Hopper's** trajectory, on the
Moon. That SVG attempt was fully reverted (markup, CSS, and the mobile hide
rule all removed again).

- **The rockets**: `--w` doubled (215/195 → 430/390), `--x` moved left
  (81/93 → 56/84) — Navigator's old right edge was within ~1% of the field's
  own edge, confirming "too close to the border." **Worth flagging**: at this
  size TerraGator (now ≈642px tall) very likely overlaps the Moon's visible
  disc, not just its transparent box corner — there isn't 2×(430+390)px of
  clear width between a Moon this large and the field's right edge on a
  typical screen. Implemented as asked rather than quietly undersized; if the
  overlap looks bad, the fix is shrinking the Moon or backing off the literal
  2x. `--y` re-solved for the new heights so the bases still land level.
- **The Lunar Hopper trajectory** ("just one line - - - - but a little
  thick"): the tube-per-round-7 approach was continuous and couldn't dash; a
  plain `THREE.Line` can dash (`LineDashedMaterial`) but can't read as "a
  little thick" — most browsers ignore `Line`'s own `linewidth`, capped at
  1px regardless of the value set. Rebuilt as a series of short
  `TubeGeometry` segments (radius 0.035) with gaps between them along the
  same curve — real 3D thickness *and* a genuine dash pattern, each dash still
  using the fill+edges treatment everything else on the Moon uses.

**Round 11 — spacing the rockets off their box edges was the wrong
constraint.** Krittin: "the rocket is like small compared to the entire bg,
reduce its size by 30% each, and you can overlap the images ignoring the
borders so the rockets are closer to each other. (also make the file smaller,
no need that good resolution takes too much memory)." Two real corrections:

- **Box-edge spacing was never the right thing to optimize for.** Checked the
  actual files: terragator's visible rocket is only ~92px wide inside its
  537px-wide canvas, navigator's ~116px — both roughly centred, both over 75%
  transparent margin. Every round of "will these two boxes collide" math was
  therefore solving the wrong problem; the boxes can sit far closer, even
  overlap, with the real artwork nowhere near touching. `--x` moved from
  56/84 to 66/78 on that basis, deliberately closer than box half-widths
  alone would suggest is safe.
- **`--w` came down 30%** (430/390 → 300/275) per the explicit request, and
  **`terragator.png`/`navigator.png` were both downscaled** (537×800 →
  336×500, preserving the alpha channel and the file's own aspect ratio,
  which is why `--ar` didn't need to change) — 101.8KB→42.7KB and
  118.1KB→50.4KB, roughly 58% smaller each. `--y` re-solved again for the new
  heights so the bases stay level.

**Round 12 — confirmed settled, just shifted right.** Krittin: "spaceing
between the 2 and sizes are good now, but move them more right." Spacing and
`--w` (300/275) are therefore locked in — only `--x` moved, 66/78 → 73/85,
same gap between the pair preserved.

**Rounds 13-14 — two more small right-nudges, both by an explicit fraction of
the previous step.** "just a little more right (1/4 of what you recently just
moved by)" took `--x` 73/85 → 74.75/86.75 (a quarter of the 7-point round-12
step). "move by that distance 2 more times" then took it 74.75/86.75 →
78.25/90.25 (two more 1.75-point steps). `--x` is currently **78.25/90.25** —
check this section's markup directly for the live number rather than trusting
any earlier round's value quoted above, including round 12's.

**Round 15 — a real performance pass, not another visual tweak.** Krittin:
"take your time to think through everything... simplify things you can while
still keeping necessary features... remove unnecessary or too laggy or too
long codes that may cause the lag." This is the actual fix for the "suddenly
laggy" complaint from a few rounds back — that conversation ended in a
diagnosis and some options, but nothing had been changed yet.

Counted actual draw calls per frame in this scene: Moon body (1) + graticule
(21 separate `LineLoop`s — pre-existing, not touched) + limb (1) + CMG cubesat
(10: body + 4 pyramids × fill/edges) + Sky Crane (10: deck + 4 legs ×
fill/edges) + Lunar Hopper (26: ~13 dash segments × fill/edges) ≈ **69/frame**,
continuously, whenever the section is visible — because the CMG cubesat's
orbit animates every frame regardless of `autoRotate`, this scene can never
go idle while on screen, so 69 draw calls really do run 60 times a second.

- **None of the repeated sub-parts (pyramids, legs, dashes) ever move
  independently of their parent.** They were needlessly split into separate
  `Object3D`/`Mesh`/`LineSegments` per repeat. Added `radialArray()` (bakes
  each repeat's transform into cloned geometry via `Matrix4`, then
  `mergeGeometries()` from `three/addons/utils/BufferGeometryUtils.js` into
  one fill + one edges draw call) and a small `part()` helper for the
  fill+edges pattern every single-instance shape here uses. CMG 10→4, Sky
  Crane 10→4, Lunar Hopper 26→2. New total ≈ **33/frame**, roughly half, with
  **zero visual change** — same geometry, same positions, just fewer draw
  calls carrying it.
- **The Moon's 21-`LineLoop` graticule was deliberately NOT touched.** It
  predates this session (not the cause of "sudden" lag), and merging it
  correctly would mean converting `LineLoop`→`LineSegments` and re-deriving
  its rotation math by hand with no way to check the result visually — real
  correctness risk for a target that isn't the regression. Left as a known,
  lower-priority opportunity if it's ever revisited.
- **`placeLabel()` was reading `canvas.clientWidth`/`clientHeight` 3 times a
  frame** (once per label) when `resize()` already knows both numbers.
  Cached as `viewW`/`viewH`, set in `resize()`, read (not re-queried) in the
  hot path — small, but free.
- **Removed the now-dead `--rot` and `--pull` custom properties** from
  `.proj-art`/`.proj-obj-label` in `style.css` — both were rocket-rotation
  infrastructure from a few rounds ago that nothing sets any more (the
  rockets stand upright now). Previously left in as "harmless," but harmless
  dead code is still code someone has to read past; removed rather than kept.

**The CBF floor is drawn, not supplied.** The perspective grid and the dashed
line the robot tracks are SVG hairlines built in the markup so they match every
other rule on the site. `nonholonomic-cbf.png` is therefore **the robot only** —
no floor, no grid, no path. It composites on top.

**Update, same day — the rocket is gone.** This section used to describe a
rocket that flew in once on first scroll-in and landed on the TerraGator
object as a "becomes the model of the project" beat, measuring its landing
point off that object every time so moving TerraGator in the markup moved the
landing with it. Krittin asked for it to be removed outright, not reverted to
an earlier state — there is no flag or inert markup for it. The `.proj-launch`
SVG, its CSS, and the `fly()`/landing logic in `initProjectField` are gone from
`index.html`, `style.css` and `js/main.js`. What is left is simpler: every
object in the field just lights in document order, 90ms apart, on first
scroll-in — the same stagger the rocket used to hand off into, minus the
handoff. TerraGator carries no special "lights first" case any more; it just
happens to be first in document order already.

**Entrance styles are scoped to `.js-field`**, a class only `initProjectField`
adds, so any failure in that function leaves the field plainly visible rather
than blank. The stagger is skipped outright below 900px and under reduced
motion, where the field is a plain stacked column and the Moon disc is
`display:none`.

**The two rockets got a natural in-flight lean, same day.** Krittin asked to
"reorient the rockets to make it more natural" once they were real Higgsfield
stills rather than standing bolt upright like the reference product photos
they came from. Rather than regenerating the art at an angle (unreliable, and
the earlier line-art attempt at a dramatic tilt had exactly this framing
problem — see the `model-renders.html` history above), the fix is a plain CSS
rotation on the image itself: `--rot` (inline on each `.proj-obj`, read by
`.proj-art`'s `transform: rotate(var(--rot, 0deg))`) — `14deg` on TerraGator,
`-11deg` on Navigator, opposite leans so the pair doesn't read as a mirrored
duplicate. It rotates the `<img>`, not `.proj-obj-model`, so it can't fight
that wrapper's hover lift or entrance translate.

**Model art — PNGs he supplies (originally six; see the updates below for the
three that no longer work this way).** `assets/images/projects/README.md` is the
handoff document: filenames, aspect ratios, and the transparent-background
requirement. The `<img>`s are already wired to those paths and start hidden;
`initProjectField` reveals each only once it decodes, checking `naturalWidth`
rather than trusting `complete` — a 404 also resolves as complete, and marking
that as art would swap a readable placeholder for a broken-image glyph.
**Dropping the files in is the entire handoff**: no markup change, no rebuild.

**Update, 2026-08-28 — Krittin asked for these to be generated after all.**
The original rule here was "do not generate these — they are representations
of his real work," meaning no AI image model inventing a picture of hardware
it never saw. He still doesn't want that. What he approved instead is
`scripts/model-renders.html` — a standalone, non-module-CDN-free dev tool
(not part of the built site) that constructs each object as real Three.js
primitive geometry, sized against his own reference photos, and renders it
as a white-hairline-outline / transparent-body still (`EdgesGeometry` +
near-zero-opacity `MeshBasicMaterial`, no lights) — the same category as the
procedural Earth and Moon, not the same category as the AI-generated nebula.
Keep every feature he called out per object (TerraGator's deployed airbrake
collar and camera mount, Navigator's open payload doors and payload capsule,
the 4 pyramid CMGs inside the 12U bus, the TurtleBot on the CBF trail) rather
than a generic stand-in shape. If this ever needs redoing, prefer extending
that script over reaching for an AI image generator — it is what he actually
asked for.

**Update, same day, TerraGator and Navigator only — he reversed this again.**
The `model-renders.html` line-art output for the two rockets ("these models
are bad") was replaced with Higgsfield-generated stills instead: he supplied
real reference photos of both rockets, Nano Banana Pro (`nano_banana_pro`)
was prompted to match their exact shape/fins/paint scheme with no invented
detail, then `remove_background` cut them to real transparent PNGs (verified
via pixel alpha, not just eyeballed — the terminal preview composites alpha
onto black regardless, so it looks opaque either way). He explicitly signed
off on keeping the resulting photorealistic look (glossy highlights,
gradients) even though it breaks the site's flat/no-gloss/no-gradient system
everywhere else — a deliberate one-off, same category as the AI nebula
backdrop, not a precedent for the other four objects. Both PNGs were then
downscaled to 800px on the long edge (originals came back at 1696×2528,
several MB each) to fit this static site's no-image-pipeline budget.
**The other three (`nonholonomic-cbf`, `sky-crane`, `lunar-hopper`) still go
through `model-renders.html`** — this reversal was scoped to the two rockets,
not a blanket policy change back to AI generation. (`hybrid-cmg` also left this
group the same day, but for an unrelated reason — see "The Moon is a real 3D
body" above: it became a live orbiting object, not another generated image.)

**Two revert paths, both inert in `index.html`** (there is no git in this repo).
The carousel below and the flat `.projects-grid` before it are each wrapped in
an HTML comment; their CSS and `initProjectCarousel` are both still present and
both no-op when the markup is commented out, so uncommenting one block is the
whole revert. `cardFor()` in `initPageTransitions` queries all three
generations of markup (`.proj-obj`, `.carousel-link`, `.proj-card`) so the
shared-element morph keeps working whichever is live.

## Projects carousel (inert — first revert path)

Krittin wanted each project represented by its own CAD model — rendered
white-outline, transparent-body, simplified to drop fine detail — arranged in a
shuffle-style carousel that can be dragged to select one. He was explicit that
that redesign was experimental ("if it doesn't work we revert back"), and it
has since been superseded by the project field above. **It is commented out in
`index.html` but its CSS and JS are intact**, so it remains a working revert
target. What follows describes it as built.

**What's built:** `.proj-carousel` in the Projects section (`index.html`),
CSS in `css/style.css` under "projects carousel", behaviour in
`initProjectCarousel()` in `js/main.js`. Six `.carousel-item` cards sit at
fixed 60° steps around a cylinder (`rotateY` + `translateZ(var(--carousel-
radius))`, CSS `nth-child`); `initProjectCarousel` rotates `.carousel-track`
as a whole so the selected item's step cancels to 0° and faces the viewer,
tracking the active index in JS rather than reading it back off the angle so
drag and click always agree on which card is "front". Drag (pointer events,
`touch-action: pan-y` so vertical page scroll still works on a touch
screen), the prev/next arrows, and arrow keys all call the same `setActive`.
Clicking the active card navigates to its project page (a real `<a
href>`); clicking a side card brings it to front instead — its
`.carousel-link` is `pointer-events:none` in CSS so `.carousel-item` itself
is the real click target there. The active card gets the same "light up"
treatment as an Experience row on hover (`rgba(250,250,250,.95)`, text
flips to `--void`) rather than a glow, to stay inside the flat design
system. The old flat `.projects-grid` is still in `index.html`, wrapped in
an HTML comment right above the carousel, as the one-move revert path —
there's no git in this repo to fall back on otherwise.

**What was still a text placeholder:** each `.carousel-model` box said
`[ 3d model placeholder — <slug> ]` — no 3D was ever wired up, per Krittin's
instruction not to build that part until his CAD was ready.

**The STL plan is superseded.** This section was going to load `.stl` exports
with Three.js's `STLLoader` and build a white-outline / transparent-body look
from `EdgesGeometry` + a flat `MeshBasicMaterial`. Krittin chose supplied still
images instead — "just make all the models a still image of 3d object" — so
`assets/models/` and its README are now unused. Leave them; they cost nothing
and the STL route is the natural upgrade if he ever wants the objects live.

**The globe-into-carousel transition was resolved, not dropped.** The earlier
open question — whether the hero globe should shrink to a point and light up
the front card, and whether that meant extending `.descent`'s pinned scene past
Experience — was put to Krittin directly. **He chose the separate, lightweight
scene**, so `.descent` still releases at Experience untouched and the Projects
section has its own Moon and its own rocket. Do not re-open this by extending
the pinned scene; the answer is on record.

## Generated assets

Decorative, non-representational assets (background textures and the like)
may use AI-generated imagery via the Higgsfield MCP connector, per
Krittin's explicit instruction. Project descriptions, experience entries
and his headshot must never be generated or invented.

Practical notes from the one generation done so far:
- Check `balance` first and preflight with `get_cost: true`. His account
  is on the free plan; credits are scarce (an image cost 2).
- Take the compressed `minUrl` WebP, not the raw PNG — the PNG for the
  nebula was 6.4 MB against 50 KB for the WebP, and this is a static site
  where that would have been the heaviest asset by far.
- Save into `assets/images/` and reference it from `css/style.css` with a
  relative `../assets/...` URL, which resolves correctly from both the
  root page and the `projects/` pages.

## Origin

This design was worked out interactively — see the earlier `/design`
mockup canvas for the agreed layout before this real-code build:
https://claude.ai/code/artifact/941d0db9-f64a-47be-a2a4-be185fecb91f
