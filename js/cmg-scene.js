// --------------------------------------------------------------------------
// CMG project page — the real simulation result, not a synthetic stand-in.
// Krittin ran the actual MATLAB sim (Main.m / web_export.m in the thesis
// repo) and exported it to three CSVs in assets/data/:
//   cmg-sim.csv         t, body quaternion, ECI position, flywheel speed
//                       (RPM) — the MTQ-desaturation-ON run
//   cmg-sim-mtq-off.csv t, flywheel speed (RPM) — the MTQ-OFF comparison
//                       run, same time grid as cmg-sim.csv row-for-row
//                       (both come from the same downsampling in
//                       web_export.m), so one time index looks up both
// This one clock drives all three visuals — the 3D attitude, and the two
// flywheel-speed charts drawing themselves live as it plays — rather than
// three independently-timed pieces. Charts are hand-built SVG (axes, ticks,
// polylines), not a charting library, since nothing else on the site uses
// one and the data is simple enough not to need it.
//
// Playback ping-pongs across the run in compressed time (no jump-cut at the
// loop point) rather than a hard reset to t=0, since the satellite's real
// end-of-run attitude doesn't match its start; the charts just redraw
// however far the same clock has gotten, growing and shrinking with it.
//
// The 3D scene keeps the site's house style for the bus itself
// (MeshBasicMaterial, per-vertex banded shading, no lights/gradients, flat
// hairline edges, static camera) but the body axes and nadir arrow are
// deliberately real/simulation colours (red/green/blue body axes, cyan
// nadir, matching Krittin's reference animate_satellite.m/py) rather than
// the site's neutral palette — Krittin: "add label to the axes like nadir
// direction, xyz coordinates like in simulation". These are informational
// overlay, not another "model", so this doesn't reopen `--orange`/`--green`
// staying accent-only.
// --------------------------------------------------------------------------

import * as THREE from "three";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Straight from the design tokens in css/style.css, same subset
// js/system-scene.js keeps — this file is too small to import across
// modules for a handful of hex literals, so it carries its own copy.
const CARBON = 0x1d1a18;
const ASH = 0x3d3a39;
const GRAPHITE = 0x4d4947;
const WARM_GRANITE = 0x8a8380;
const BONE = 0xeeeeee;

// Real/simulation reference colours (see file header) — not from the site
// palette, used only for the axis/nadir HUD overlay on this one scene.
const AXIS_COLORS = { x: "#e74c3c", y: "#2ecc71", z: "#3498db" };
const NADIR_COLOR = "#1abc9c";
const CHART_COLORS = ["#e74c3c", "#2ecc71", "#3498db", "#c9b46a"];

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// ---- flat per-vertex banded shading — see js/system-scene.js's own copy
// for the full rationale (kept in sync there).
const FILL_STEPS = [WARM_GRANITE, GRAPHITE, ASH, CARBON];
const FILL_ALPHA_STEPS = [0.5, 0.34, 0.22, 0.14];
const FILL_LIGHT = new THREE.Vector3(0.42, 0.82, 0.45).normalize();

function shadeByNormal(geometry) {
  const normals = geometry.getAttribute("normal");
  const colors = new Float32Array(normals.count * 4);
  const n = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < normals.count; i++) {
    n.fromBufferAttribute(normals, i);
    const lit = (n.dot(FILL_LIGHT) + 1) * 0.5;
    const band = clamp(Math.floor((1 - lit) * FILL_STEPS.length), 0, FILL_STEPS.length - 1);
    c.setHex(FILL_STEPS[band]);
    colors[i * 4] = c.r;
    colors[i * 4 + 1] = c.g;
    colors[i * 4 + 2] = c.b;
    colors[i * 4 + 3] = FILL_ALPHA_STEPS[band];
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 4));
  return geometry;
}

function fillMaterial(tint) {
  return new THREE.MeshBasicMaterial({
    color: tint,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

function edgeMaterial(color = BONE, opacity = 1) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity });
}

const EDGE_CLEAN = 32;
function solidPart(geometry, tint, edgeAngle = 1) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(shadeByNormal(geometry.clone()), fillMaterial(tint)));
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, edgeAngle), edgeMaterial()));
  return group;
}

function thinLine(a, b, color, opacity = 1) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), edgeMaterial(color, opacity));
}

// A small always-camera-facing text label (three.js Sprite from a canvas
// texture) — position inherits from its parent (so an axis-tip label
// mounted on the body rotates with it), but a Sprite's own orientation
// always faces the camera regardless of parent rotation, so the text stays
// legible through the whole animation without any per-frame math.
function makeLabel(text, color) {
  const fontSize = 48;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = `600 ${fontSize}px 'JetBrains Mono', ui-monospace, monospace`;
  const w = Math.ceil(ctx.measureText(text).width) + 16;
  const h = Math.ceil(fontSize * 1.5);
  canvas.width = w;
  canvas.height = h;
  ctx.font = `600 ${fontSize}px 'JetBrains Mono', ui-monospace, monospace`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 8, h / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  // World-units per texture pixel. UNVERIFIED against an actual render —
  // sized so "NADIR" (the longest label) comes out to roughly a fifth of
  // AXIS_LEN (1.1), small relative to the ~1-unit bus rather than dominating
  // it; check this by eye and retune if it reads too big or too small.
  const SCALE = 0.003;
  sprite.scale.set(w * SCALE, h * SCALE, 1);
  return sprite;
}

async function loadCsv(url) {
  const text = await (await fetch(url)).text();
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  const cols = {};
  headers.forEach((h) => (cols[h.trim()] = []));
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",");
    headers.forEach((h, j) => cols[h.trim()].push(parseFloat(vals[j])));
  }
  return cols;
}

// Binary-search the sample bracketing t, return interpolation fraction and
// the count of samples at-or-before t (for the charts' "drawn so far" cut).
function findFrame(t, tv) {
  const n = t.length;
  if (tv <= t[0]) return { i0: 0, i1: 0, frac: 0 };
  if (tv >= t[n - 1]) return { i0: n - 1, i1: n - 1, frac: 0 };
  let lo = 0,
    hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t[mid] <= tv) lo = mid;
    else hi = mid;
  }
  return { i0: lo, i1: hi, frac: (tv - t[lo]) / (t[hi] - t[lo]) };
}

// --------------------------------------------------------------------------
// Live SVG line chart: axes/ticks built once, four polylines redrawn each
// tick to include only samples up to the current time — the "line drawing
// itself" effect, sharing the same clock as the 3D scene rather than a
// separately-timed animation.
// --------------------------------------------------------------------------
const SVG_NS = "http://www.w3.org/2000/svg";
const CHART_W = 600,
  CHART_H = 300;
const CHART_MARGIN = { l: 50, r: 14, t: 14, b: 30 };

function niceTicks(lo, hi, n = 4) {
  const step0 = (hi - lo) / n || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = Math.round(step0 / mag) * mag || mag;
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  return ticks;
}

function buildChart(container, t, seriesArrays, title) {
  const tMax = t[t.length - 1];
  const plotW = CHART_W - CHART_MARGIN.l - CHART_MARGIN.r;
  const plotH = CHART_H - CHART_MARGIN.t - CHART_MARGIN.b;
  const allVals = seriesArrays.flat();
  let yLo = Math.min(...allVals),
    yHi = Math.max(...allVals);
  const pad = (yHi - yLo) * 0.08 || 50;
  yLo -= pad;
  yHi += pad;

  const X = (tv) => CHART_MARGIN.l + (tv / tMax) * plotW;
  const Y = (v) => CHART_MARGIN.t + plotH - ((v - yLo) / (yHi - yLo)) * plotH;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${CHART_W} ${CHART_H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);
  svg.style.fontFamily = "'JetBrains Mono', ui-monospace, monospace";

  function line(x1, y1, x2, y2, color) {
    const el = document.createElementNS(SVG_NS, "line");
    el.setAttribute("x1", x1);
    el.setAttribute("y1", y1);
    el.setAttribute("x2", x2);
    el.setAttribute("y2", y2);
    el.setAttribute("stroke", color);
    el.setAttribute("stroke-width", "1");
    svg.appendChild(el);
    return el;
  }
  function text(x, y, str, anchor) {
    const el = document.createElementNS(SVG_NS, "text");
    el.setAttribute("x", x);
    el.setAttribute("y", y);
    el.setAttribute("text-anchor", anchor);
    el.setAttribute("font-size", "9");
    el.setAttribute("fill", "#4d4947");
    el.textContent = str;
    svg.appendChild(el);
    return el;
  }

  line(CHART_MARGIN.l, CHART_MARGIN.t, CHART_MARGIN.l, CHART_MARGIN.t + plotH, "#3d3a39");
  line(CHART_MARGIN.l, CHART_MARGIN.t + plotH, CHART_MARGIN.l + plotW, CHART_MARGIN.t + plotH, "#3d3a39");

  niceTicks(yLo, yHi, 4).forEach((yt) => {
    const yy = Y(yt);
    line(CHART_MARGIN.l - 4, yy, CHART_MARGIN.l, yy, "#3d3a39");
    text(CHART_MARGIN.l - 8, yy + 3, yt.toLocaleString(), "end");
  });
  [0, 3, 6, 9, 12, 15].forEach((orb) => {
    const xx = X((orb / 15) * tMax);
    line(xx, CHART_MARGIN.t + plotH, xx, CHART_MARGIN.t + plotH + 4, "#3d3a39");
    text(xx, CHART_MARGIN.t + plotH + 16, String(orb), "middle");
  });
  text(CHART_MARGIN.l + plotW / 2, CHART_H - 4, "orbits", "middle");

  const polylines = seriesArrays.map((_, i) => {
    const el = document.createElementNS(SVG_NS, "polyline");
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", CHART_COLORS[i]);
    el.setAttribute("stroke-width", "1.4");
    el.setAttribute("stroke-linejoin", "round");
    svg.appendChild(el);
    return el;
  });
  const nowLine = line(CHART_MARGIN.l, CHART_MARGIN.t, CHART_MARGIN.l, CHART_MARGIN.t + plotH, "#8a8380");
  nowLine.setAttribute("stroke-dasharray", "2,2");

  container.replaceChildren(svg);

  return function update(simTime) {
    const { i0 } = findFrame(t, simTime);
    seriesArrays.forEach((series, i) => {
      let pts = "";
      for (let k = 0; k <= i0; k++) pts += `${X(t[k]).toFixed(1)},${Y(series[k]).toFixed(1)} `;
      polylines[i].setAttribute("points", pts);
    });
    const xx = X(simTime);
    nowLine.setAttribute("x1", xx);
    nowLine.setAttribute("x2", xx);
  };
}

// Playback pacing is deliberately two-speed, not one linear compression:
// the first 35s of real sim time (CMG mode 0-25s, then the mode-switch ramp
// to reaction-wheel mode 25-35s — the actual "retargeting" manoeuvre, per
// Main.m's own alpha schedule) is almost invisible if spread proportionally
// across the whole loop, since it's ~0.04% of the ~85000s run. Krittin:
// "slow down the first 35 sec... so people can see the satellite
// retargeting phase... and the rest can speed up like this speed" — so
// T_SPLIT_SIM gets its own, much slower, wall-clock allowance (DUR_SLOW),
// and everything after it keeps the original pacing (DUR_FAST, same ~1890
// sim-s/wall-s as before this change).
const T_SPLIT_SIM = 35; // seconds of real sim time where the slow segment ends (Main.m's alpha ramp finishes here)
const DUR_SLOW = 8; // wall-clock seconds for [0, T_SPLIT_SIM]
const DUR_FAST = 45; // wall-clock seconds for [T_SPLIT_SIM, tMax] — the old overall pace
const LOOP_SECONDS = DUR_SLOW + DUR_FAST; // one-way sweep of the whole run

// wallT in [0, LOOP_SECONDS] -> real sim time, piecewise-linear per above.
function simTimeFromWall(wallT, tMax) {
  if (wallT <= DUR_SLOW) return (wallT / DUR_SLOW) * T_SPLIT_SIM;
  const frac = (wallT - DUR_SLOW) / DUR_FAST;
  return T_SPLIT_SIM + frac * (tMax - T_SPLIT_SIM);
}

export async function initCmgScene({ canvas, dataUrl, offDataUrl, chartOnEl, chartOffEl, hudEl }) {
  if (!canvas) return;

  const [data, offData] = await Promise.all([loadCsv(dataUrl), loadCsv(offDataUrl)]);
  const t = data.t;
  const tMax = t[t.length - 1];

  const onSeries = [1, 2, 3, 4].map((k) => data[`Omega${k}`]);
  const offSeries = [1, 2, 3, 4].map((k) => offData[`Omega${k}`]);
  const updateChartOn = chartOnEl ? buildChart(chartOnEl, t, onSeries, "Flywheel speed, MTQ desaturation on") : null;
  const updateChartOff = chartOffEl ? buildChart(chartOffEl, t, offSeries, "Flywheel speed, MTQ desaturation off") : null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  // Static, deliberately — every scene on this site keeps the camera fixed
  // and lets the subject move.
  const CAM_EL = 24 * (Math.PI / 180);
  const CAM_AZ = 38 * (Math.PI / 180);
  // Box half-diagonal is ~1.03 units and the axis/nadir indicators reach
  // ~1.3 — at this 32deg FOV that needs distance >~5.9 to clear all of it at
  // any rotation (half-frustum height = dist*tan(16deg)).
  const CAM_DIST = 6.2;
  camera.position.set(
    CAM_DIST * Math.cos(CAM_EL) * Math.sin(CAM_AZ),
    CAM_DIST * Math.sin(CAM_EL),
    CAM_DIST * Math.cos(CAM_EL) * Math.cos(CAM_AZ)
  );
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));

  // ---- the bus: real 12U proportions (240 x 230 x 360mm), long axis local Z.
  const bodyGroup = new THREE.Group();
  bodyGroup.add(solidPart(new THREE.BoxGeometry(1.0, 0.958, 1.5), 0xffffff, EDGE_CLEAN));

  // ---- body axes, real/simulation colours + labels (see file header).
  const AXIS_LEN = 1.1;
  [
    { dir: new THREE.Vector3(AXIS_LEN, 0, 0), color: AXIS_COLORS.x, label: "X_B" },
    { dir: new THREE.Vector3(0, AXIS_LEN, 0), color: AXIS_COLORS.y, label: "Y_B" },
    { dir: new THREE.Vector3(0, 0, AXIS_LEN), color: AXIS_COLORS.z, label: "Z_B" },
  ].forEach(({ dir, color, label }) => {
    bodyGroup.add(thinLine(new THREE.Vector3(), dir, color));
    const sprite = makeLabel(label, color);
    sprite.position.copy(dir).multiplyScalar(1.12);
    bodyGroup.add(sprite);
  });

  scene.add(bodyGroup);

  // ---- nadir direction — real orbital position, inertial/world frame (NOT
  // a child of bodyGroup, same as the body-fixed axes above vs. the
  // reference animate_satellite.m's fixed-frame nadir arrow).
  const NADIR_LEN = 1.3;
  const nadirArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0, 0),
    NADIR_LEN,
    NADIR_COLOR,
    0.06,
    0.035
  );
  scene.add(nadirArrow);
  const nadirLabel = makeLabel("NADIR", NADIR_COLOR);
  scene.add(nadirLabel);

  const q0 = new THREE.Quaternion();
  const q1 = new THREE.Quaternion();
  const rVec = new THREE.Vector3();

  function update(simTime) {
    const { i0, i1, frac } = findFrame(t, simTime);

    q0.set(data.Ex[i0], data.Ey[i0], data.Ez[i0], data.n[i0]);
    q1.set(data.Ex[i1], data.Ey[i1], data.Ez[i1], data.n[i1]);
    bodyGroup.quaternion.copy(q0).slerp(q1, frac);

    const rx = data.rx[i0] + (data.rx[i1] - data.rx[i0]) * frac;
    const ry = data.ry[i0] + (data.ry[i1] - data.ry[i0]) * frac;
    const rz = data.rz[i0] + (data.rz[i1] - data.rz[i0]) * frac;
    rVec.set(rx, ry, rz).normalize().negate();
    nadirArrow.setDirection(rVec);
    nadirLabel.position.copy(rVec).multiplyScalar(NADIR_LEN + 0.15);
  }

  // ---- position/time HUD (see file header — Krittin: "add satellite
  // location label of xyz"). Real ECI position, same km units web_export.m
  // exported; throttled with the charts since text doesn't need 60fps.
  function updateHud(simTime) {
    if (!hudEl) return;
    const { i0, i1, frac } = findFrame(t, simTime);
    const rx = data.rx[i0] + (data.rx[i1] - data.rx[i0]) * frac;
    const ry = data.ry[i0] + (data.ry[i1] - data.ry[i0]) * frac;
    const rz = data.rz[i0] + (data.rz[i1] - data.rz[i0]) * frac;
    hudEl.textContent =
      `t = ${simTime.toFixed(1)} s\n` +
      `X ${rx.toFixed(1).padStart(9)} km\n` +
      `Y ${ry.toFixed(1).padStart(9)} km\n` +
      `Z ${rz.toFixed(1).padStart(9)} km`;
  }

  // ---- resize: the canvas fills whatever box style.css gives it
  // (.detail-media-inner), same approach as js/system-scene.js's resize().
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.render(scene, camera);
  }

  update(0); // settle to a pose before the first paint either way
  updateChartOn && updateChartOn(0);
  updateChartOff && updateChartOff(0);
  updateHud(0);
  resize();
  window.addEventListener("resize", resize);

  // Static settle, no loop — same rule every scene on this site follows.
  if (REDUCED) return;

  let frame = null;
  let visible = false;
  let lastChartUpdate = 0;

  function tick(now) {
    frame = requestAnimationFrame(tick);
    // Ping-pong the whole run across LOOP_SECONDS of wall-clock time — no
    // jump-cut at the loop point (start/end attitude don't match), and the
    // charts naturally grow/recede with the same clock since they only draw
    // samples up to the current simTime.
    const period = 2 * LOOP_SECONDS;
    const phase = (now / 1000) % period;
    const wallT = phase <= LOOP_SECONDS ? phase : period - phase;
    const simTime = simTimeFromWall(wallT, tMax);

    update(simTime); // body attitude + nadir — cheap, every frame
    renderer.render(scene, camera);

    // Chart/HUD redraw is throttled well below 60fps (the chart rebuilds a
    // full SVG polyline string per series) — same shared simTime, just
    // sampled less often, so everything still reads as perfectly in sync.
    if (now - lastChartUpdate > 80) {
      lastChartUpdate = now;
      updateChartOn && updateChartOn(simTime);
      updateChartOff && updateChartOff(simTime);
      updateHud(simTime);
    }
  }
  function start() {
    if (frame !== null) return;
    frame = requestAnimationFrame(tick);
  }
  function stop() {
    if (frame === null) return;
    cancelAnimationFrame(frame);
    frame = null;
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          visible = e.isIntersecting;
          if (visible) start();
          else stop();
        });
      },
      { rootMargin: "120px" }
    );
    io.observe(canvas);
  } else {
    visible = true;
    start();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (visible) start();
  });
}
