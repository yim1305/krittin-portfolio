// ==========================================================================
// SUPERSEDED — nothing imports this file.
//
// The Projects section is one fixed Earth/Moon system now (js/system-scene.js,
// 2026-08-28): a static composition with all six projects placed in it, no
// rotation, no orbiting, and no render loop. This file is kept on disk purely
// as the revert path for that redesign — there is no git on this machine and
// Krittin publishes the site himself, so an unimported file is how a revert
// path gets provided here, the same way the carousel and the flat grid are
// kept as commented-out markup in index.html.
//
// To revert: put the .proj-moon / .proj-obj markup back in index.html, import
// initMoonScene there again, and restore the "projects field" rules in
// style.css. Note that the scatter field's markup was DELETED rather than
// commented out, so that half is a real rewrite, not a one-line switch.
//
// system-scene.js ports buildCmgCubesat(), buildSkyCraneLander() and the hop
// trajectory from here unchanged in design — keep the two in sync if either
// is ever revisited.
// ==========================================================================

// ==========================================================================
// Projects Moon.
//
// The same instrument treatment as the hero globe in orbit-scene.js, applied
// to a lunar body: posterised elevation bands rather than gradients, a
// hairline rule at the mare/highland boundary exactly where the Earth gets its
// coastline, a hairline limb ring instead of any kind of glow, a low-opacity
// graticule kept on top of the solid surface, and a terminator quantised into
// four flat steps. There are NO LIGHTS in this scene either — every material
// is a custom shader, deliberately, same as the globe.
//
// Three deliberate differences from the globe, all forced by the subject:
//
//   - No cloud shell. The Moon has no atmosphere, so the alpha channel of the
//     bake carries crater rims instead of weather.
//   - Greys, not blue and green. The bands run from mare basalt up to
//     --warm-granite, so the whole ramp still comes out of the site palette.
//   - An ORTHOGRAPHIC camera, where the globe uses a perspective one. This
//     used to be load-bearing rather than a style choice: Sky Crane and Lunar
//     Hopper were positioned on the limb from CSS percentages of this
//     canvas's box, so the projected disc had to inscribe it at a known,
//     fixed fraction no matter how the body was turned. Both are real 3D now
//     (see below), so that hard requirement is gone — orthographic stays
//     anyway because a distortion-free silhouette reads more like an
//     instrument than a photo, same reasoning as everything else here.
//
// Rendering is paused whenever the section is off screen. This is a second
// WebGL context on a page that already runs one full-screen scene with its own
// render loop and a 2048x1024 bake, and it is not allowed to cost anything
// while nobody is looking at it.
//
// Three more objects live here, none of them a flat still image any more:
//   - The Hybrid CMG Momentum Desaturation cubesat, in a real low orbit
//     around the body — the "like home page" satellites, but per Krittin's
//     request it does not need to track the Moon's own rotation.
//   - The Sky Crane lander, fixed to one point on the surface and parented to
//     the rotating body group, so it turns WITH the Moon instead.
//   - The Lunar Hopper project, which has no model at all — a parabolic hop
//     trajectory from the south pole stands in for it, also parented to the
//     body so it turns with the Moon.
// The cubesat's orbit costs the frustum some room (see FRUSTUM_R below),
// which is why the visible disc is smaller relative to its box than it used
// to be — and the Moon itself is bigger and fully on screen now rather than
// hanging off the corner, so the whole thing is still legible. See
// css/style.css's .proj-moon for that half of the story.
//
// All three of the above repeat one small geometry 4+ times (the cubesat's
// pyramids, the lander's legs, the hop trajectory's dashes) — each repeat is
// baked into world space and MERGED into one draw call via `radialArray()` /
// manual merges, rather than one Object3D+Mesh+LineSegments per repeat. That
// took this scene from ~69 draw calls a frame down to ~33, which is what
// actually made the site "suddenly laggy" after these were added — not the
// Moon's on-screen size, which turned out not to have grown much at all.
// ==========================================================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Straight from the design tokens in css/style.css — keep them in sync.
const ASH = 0x3d3a39;
const PALE_STONE = 0xb8b3b0;
const BONE = 0xeeeeee;
const ORANGE = 0xee6018;

const MOON_R = 1.5;
const LIMB_R = MOON_R * 1.075;
// Low lunar orbit for the CMG cubesat — comfortably clear of the limb ring,
// but tight rather than wide: the actual thesis is about LEO, so a close
// orbit reads truer than a sweeping one. CUBESAT_REACH is buildCmgCubesat()'s
// own half-diagonal bounding radius (keep the two in sync if that geometry's
// W/H/D change) — it has to be budgeted into the frustum too, or the cubesat
// clips the edge of the canvas whenever it swings to the side nearest camera.
// Both this and the cubesat's own size went up twice now — Krittin: "don't
// need to be small compared to moon... the whole goal is to make people able
// to see clearly what projects I have," then "scale the models up more"
// again on top of the Moon itself also getting bigger. Legibility over
// literal 12U-vs-Moon scale.
const ORBIT_R = MOON_R * 1.32;
const CUBESAT_REACH = 0.45;
// The frustum is sized to whichever needs more room, the limb ring or the
// cubesat's orbit, plus a 2% margin — at exactly the limiting radius the
// outermost pixels fall on the frustum edge and antialiasing clips them.
//
// This USED TO be shared with the stylesheet: Sky Crane and Lunar Hopper were
// once placed on the limb from CSS percentages of this canvas's box, derived
// from (MOON_R / FRUSTUM_R) / 2. Both are real 3D now (a lander fixed to the
// surface and a trajectory arc), positioned by this file directly, so that
// coupling is gone — FRUSTUM_R only has to satisfy the constraints in this
// file (the ring, and CUBESAT_REACH above) and nothing outside it.
const FRUSTUM_R = Math.max(LIMB_R, ORBIT_R + CUBESAT_REACH) * 1.02;

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --------------------------------------------------------------------------
// Shared GLSL. The value-noise/fBm pair is the same one the globe uses; the
// Worley cell noise below is new, and is what actually makes craters — fBm
// alone gives reticulated ridges, never circles.
// --------------------------------------------------------------------------
const NOISE_GLSL = /* glsl */ `
  float hash13(vec3 p){
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  vec3 hash33(vec3 p){
    p = vec3(dot(p, vec3(127.1, 311.7,  74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453);
  }
  float vnoise(vec3 x){
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i + vec3(0,0,0)), hash13(i + vec3(1,0,0)), f.x),
          mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
          mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p){
    float amp = 0.5;
    float sum = 0.0;
    for (int i = 0; i < 6; i++){
      sum += amp * vnoise(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return sum;
  }
  // Distance to the nearest feature point (Worley F1). 27 cells per sample is
  // expensive, which is fine — this only ever runs in the one-off bake.
  float worley(vec3 p){
    vec3 i = floor(p);
    vec3 f = fract(p);
    float d = 1e9;
    for (int x = -1; x <= 1; x++)
    for (int y = -1; y <= 1; y++)
    for (int z = -1; z <= 1; z++){
      vec3 g = vec3(float(x), float(y), float(z));
      d = min(d, length(g + hash33(i + g) - f));
    }
    return d;
  }
`;

// --------------------------------------------------------------------------
// Surface bake.
//
// Same reasoning as the globe's: the surface field is far too expensive to
// evaluate per fragment every frame, so it is rendered ONCE into an
// equirectangular texture and sampled thereafter. Half the globe's resolution
// (1024 wide, not 2048) because this body is a fraction of the screen.
//
// RGB carries albedo. A carries the crater rim mask, which the surface shader
// strokes as a hairline — the same 1px rule as every border on the site.
//
// The direction reconstruction mirrors THREE.SphereGeometry's UV convention
// exactly, as the globe's does, so the bake lands on the mesh with no seam.
// --------------------------------------------------------------------------
function bakeMoonTexture(renderer, width = 1024) {
  const height = width / 2;

  const target = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    generateMipmaps: true,
    depthBuffer: false,
    stencilBuffer: false,
  });

  const bakeScene = new THREE.Scene();
  const bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bakeMat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      ${NOISE_GLSL}

      // Where mare meets highland. This is the Moon's equivalent of the
      // globe's SEA constant, and it earns the same hairline.
      const float MARE = 0.508;

      void main(){
        float theta = (1.0 - vUv.y) * 3.14159265;
        float phi = vUv.x * 6.28318531;
        vec3 n = vec3(-cos(phi) * sin(theta), cos(theta), sin(phi) * sin(theta));

        // Domain warp before sampling, exactly as the globe does it — it is
        // what stops the mare boundaries looking like blobs.
        vec3 warp = vec3(
          fbm(n * 1.9 + 21.3),
          fbm(n * 1.9 + 53.1),
          fbm(n * 1.9 + 88.7)
        ) - 0.5;
        float h = fbm(n * 2.3 + warp * 1.5);

        // --- mare: three flat basalt levels ---
        vec3 mareDeep  = vec3(0.078, 0.082, 0.090);
        vec3 mareMid   = vec3(0.114, 0.118, 0.129);
        vec3 mareEdge  = vec3(0.153, 0.157, 0.169);
        vec3 mare = mareDeep;
        mare = mix(mare, mareMid,  step(0.400, h));
        mare = mix(mare, mareEdge, step(0.470, h));

        // --- highland: three flat levels, topping out at --warm-granite ---
        vec3 highLow  = vec3(0.290, 0.278, 0.271);
        vec3 highMid  = vec3(0.400, 0.384, 0.376);
        vec3 highTop  = vec3(0.541, 0.514, 0.502);   // #8a8380
        vec3 high = highLow;
        high = mix(high, highMid, step(0.558, h));
        high = mix(high, highTop, step(0.622, h));

        vec3 base = mix(mare, high, step(MARE, h));

        // --- the mare shoreline: the hairline rule, applied to the Moon ---
        float shore = 1.0 - smoothstep(0.0, 0.008, abs(h - MARE));
        base = mix(base, vec3(0.482, 0.459, 0.451), shore * 0.8);

        // --- craters, two size classes ---
        // Floors darken, rims take a hairline. Both are gated by a slow fBm so
        // craters cluster into fields instead of tiling evenly over the body.
        float bigD   = worley(n * 4.5);
        float smallD = worley(n * 11.0);
        float density = smoothstep(0.35, 0.62, fbm(n * 1.7 + 5.5));

        float bigFloor = (1.0 - step(0.20, bigD)) * density;
        float bigRim   = (1.0 - smoothstep(0.0, 0.020, abs(bigD - 0.21))) * density;
        float smFloor  = (1.0 - step(0.16, smallD)) * (0.4 + 0.6 * density);
        float smRim    = (1.0 - smoothstep(0.0, 0.030, abs(smallD - 0.17))) * (0.4 + 0.6 * density);

        base *= 1.0 - 0.30 * bigFloor - 0.16 * smFloor;

        gl_FragColor = vec4(base, clamp(bigRim + smRim * 0.7, 0.0, 1.0));
      }
    `,
  });

  bakeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bakeMat));

  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(bakeScene, bakeCam);
  renderer.setRenderTarget(prevTarget);

  bakeMat.dispose();
  bakeScene.children[0].geometry.dispose();

  return target.texture;
}

// --------------------------------------------------------------------------
// The body. One texture fetch, the crater hairline, and the stepped
// terminator — the same three moves the globe's surface shader makes.
// --------------------------------------------------------------------------
function buildMoon(surfaceTex) {
  const uniforms = {
    uSurface: { value: surfaceTex },
    // The same light direction the globe uses, so the two bodies are lit
    // consistently across the page even though neither has an actual light.
    uLight: { value: new THREE.Vector3(0.55, 0.42, 0.72).normalize() },
    uFade: { value: REDUCED ? 1 : 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldN;
      void main(){
        vUv = uv;
        vWorldN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uSurface;
      uniform vec3 uLight;
      uniform float uFade;
      varying vec2 vUv;
      varying vec3 vWorldN;

      void main(){
        vec4 surf = texture2D(uSurface, vUv);

        // Crater rims stroked as a hairline in --pale-stone, at the low
        // opacity every other rule on this site is drawn at.
        vec3 albedo = mix(surf.rgb, vec3(0.722, 0.702, 0.690), surf.a * 0.55);

        vec3 N = normalize(vWorldN);
        vec3 L = normalize(uLight);

        // Four flat steps, as on the globe. Smooth falloff and specular both
        // read as photography and are the thing this style exists to avoid.
        float day = smoothstep(-0.22, 0.44, dot(N, L));
        day = floor(day * 4.0 + 0.5) / 4.0;

        gl_FragColor = vec4(albedo * (0.14 + 0.86 * day), uFade);
      }
    `,
  });

  return { mesh: new THREE.Mesh(new THREE.SphereGeometry(MOON_R, 96, 64), material), uniforms };
}

// --------------------------------------------------------------------------
// Limb ring — a hairline, never a glow. Billboarded to the camera each frame
// so it always traces the apparent silhouette.
// --------------------------------------------------------------------------
function buildLimbRing(radius, segments = 192) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(radius * Math.cos(t), radius * Math.sin(t), 0));
  }
  const material = new THREE.LineBasicMaterial({
    color: PALE_STONE, transparent: true, opacity: 0, depthWrite: false,
  });
  return {
    line: new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), material),
    material,
  };
}

// --------------------------------------------------------------------------
// Graticule, kept ON TOP of the solid surface at low opacity — the move that
// keeps the body reading as an instrument rather than as a stock 3D moon.
// depthTest on so the far side is hidden; depthWrite off so the lines don't
// fight each other where they cross.
// --------------------------------------------------------------------------
function buildGraticule(radius) {
  const group = new THREE.Group();
  const gridMat = new THREE.LineBasicMaterial({
    color: PALE_STONE, transparent: true, opacity: 0.12, depthWrite: false,
  });
  // Orange is functional here, not decorative: it marks the equator, the same
  // single job it does on the globe. Dimmer than the globe's, because this
  // body carries less detail to compete with it.
  const equatorMat = new THREE.LineBasicMaterial({
    color: ORANGE, transparent: true, opacity: 0.45, depthWrite: false,
  });

  const SEG = 128;
  const meridians = 12;
  for (let i = 0; i < meridians; i++) {
    const pts = [];
    for (let a = 0; a <= SEG; a++) {
      const t = (a / SEG) * Math.PI * 2;
      pts.push(new THREE.Vector3(radius * Math.sin(t), radius * Math.cos(t), 0));
    }
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), gridMat);
    line.rotation.y = (i / meridians) * Math.PI;
    group.add(line);
  }

  const parallels = 8;
  for (let j = 1; j < parallels; j++) {
    const phi = (j / parallels) * Math.PI - Math.PI / 2;
    const y = radius * Math.sin(phi);
    const r = radius * Math.cos(phi);
    const pts = [];
    for (let a = 0; a <= SEG; a++) {
      const t = (a / SEG) * Math.PI * 2;
      pts.push(new THREE.Vector3(r * Math.cos(t), y, r * Math.sin(t)));
    }
    group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
  }

  const eqPts = [];
  for (let a = 0; a <= SEG; a++) {
    const t = (a / SEG) * Math.PI * 2;
    eqPts.push(new THREE.Vector3(radius * Math.cos(t), 0, radius * Math.sin(t)));
  }
  group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(eqPts), equatorMat));

  return group;
}

// A flat white-hairline "part": a near-invisible fill plus a hairline edge
// outline, the one visual treatment every object in this file (and the
// hero's cubesats) uses. Shared here so the 12U cubesat, the lander and the
// hop dashes don't each redeclare the same two materials.
function part(geometry) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: BONE, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false })));
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: BONE })));
  return group;
}

// Repeats one geometry at N evenly-spaced azimuths, each additionally tilted
// outward, and MERGES all N copies into a single fill mesh and a single
// edges LineSegments — one draw call each instead of N. None of these
// instances ever move independently of their parent, so there is nothing
// lost by baking their transforms into the vertices up front instead of
// giving each its own Object3D hierarchy. `localOffset`, if given, is applied
// before the tilt/azimuth (e.g. sliding a leg or a CMG pyramid off-centre).
function radialArray(geometry, { count, azimuthOffset = 45, azimuthSign = -1, tiltDeg, localOffset }) {
  const edgesGeo = new THREE.EdgesGeometry(geometry);
  const fills = [], edges = [];
  for (let i = 0; i < count; i++) {
    const az = azimuthSign * (i * (360 / count) + azimuthOffset) * (Math.PI / 180);
    let m = new THREE.Matrix4().makeRotationY(az).multiply(new THREE.Matrix4().makeRotationZ((tiltDeg * Math.PI) / 180));
    if (localOffset) m = m.multiply(new THREE.Matrix4().makeTranslation(localOffset.x || 0, localOffset.y || 0, localOffset.z || 0));
    fills.push(geometry.clone().applyMatrix4(m));
    edges.push(edgesGeo.clone().applyMatrix4(m));
  }
  const group = new THREE.Group();
  group.add(new THREE.Mesh(mergeGeometries(fills), new THREE.MeshBasicMaterial({ color: BONE, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false })));
  group.add(new THREE.LineSegments(mergeGeometries(edges), new THREE.LineBasicMaterial({ color: BONE })));
  return group;
}

// --------------------------------------------------------------------------
// The 12U CMG cubesat — the same bus-plus-4-pyramid-CMGs design as
// scripts/model-renders.html's buildHybridCMG(), ported here so it can
// actually orbit instead of sitting as a flat still. The bus stays almost
// fully transparent (same near-zero opacity as everywhere else this
// treatment is used) so the CMGs read through the hull as a cutaway — keep
// that even though everything else here is simplified, per the standing note
// on which features may not be dropped to a generic stand-in shape.
// --------------------------------------------------------------------------
function buildCmgCubesat() {
  const group = new THREE.Group();
  // 12U proportions (360x230x240mm) kept, but scaled up well past a literal
  // reading of that real size — see the note above CUBESAT_REACH.
  const W = 0.62, H = 0.42, D = 0.39;

  group.add(part(new THREE.BoxGeometry(W, H, D)));

  const cmgGeo = new THREE.ConeGeometry(0.058, 0.12, 4); // 4-sided reads as a pyramid
  group.add(radialArray(cmgGeo, { count: 4, tiltDeg: 55, localOffset: { y: 0.058 } }));

  return group;
}

// A unit outward-normal at (latDeg, lonDeg) — lat 0 is the equator, ±90 the
// poles, matching ordinary geographic convention rather than the bake
// shader's own UV-derived polar-angle one, since nothing here samples that
// texture; it just needs a reasonable point on the sphere.
function surfaceNormal(latDeg, lonDeg) {
  const lat = (latDeg * Math.PI) / 180, lon = (lonDeg * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)).normalize();
}

// --------------------------------------------------------------------------
// Sky Crane — simplified to a lander standing on its legs rather than the
// full hovering-descent-stage scene model-renders.html builds (bridle cable,
// hanging payload): "just a simple model" that stays fixed on the Moon and
// turns with it, per Krittin's request — appropriate since here it has
// already landed, rather than being mid-descent.
// --------------------------------------------------------------------------
function buildSkyCraneLander() {
  const group = new THREE.Group();
  // Scaled up twice now, same reasoning both times — see the note above
  // CUBESAT_REACH: legibility of "which project is this" beats literal scale.
  group.add(part(new THREE.BoxGeometry(0.31, 0.1, 0.31)));

  const legGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.17, 6);
  legGeo.translate(0, -0.085, 0); // top end at the hinge origin, foot hangs downward — baked into the geometry itself
  group.add(radialArray(legGeo, { count: 4, azimuthSign: 1, tiltDeg: 32 }));

  return group;
}

// Anchors a built model to a fixed point on the sphere, oriented so the
// model's own local +Y ("up") points along the surface normal there — so it
// stands on the curved surface instead of floating at a world-space tilt.
// `radialOffset` nudges it out past MOON_R by roughly the model's own leg
// drop, so the feet sit near the surface rather than the deck sinking into
// it. Parented to `body` by the caller so it turns with the Moon's own tilt.
function anchorOnSurface(normal, radialOffset, model) {
  const anchor = new THREE.Object3D();
  anchor.position.copy(normal.clone().multiplyScalar(MOON_R + radialOffset));
  anchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  anchor.add(model);
  return anchor;
}

// --------------------------------------------------------------------------
// Lunar Hopper — "no need [for a] model": a parabolic hop trajectory from the
// south pole to a landing point elsewhere on the surface stands in for the
// object entirely, per Krittin's request. It hugs the great circle between
// the two points (spherical interpolation) rather than cutting a straight
// chord, and lifts away from the surface by `liftFactor` at the midpoint,
// tapering back to exactly the surface at both ends — a hop, not a tunnel.
// --------------------------------------------------------------------------
function hopTrajectoryPoints(normalStart, normalEnd, segments = 48, liftFactor = 0.4) {
  const angle = normalStart.angleTo(normalEnd);
  const sinAngle = Math.sin(angle);
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let dir;
    if (sinAngle < 1e-6) {
      dir = normalStart.clone();
    } else {
      const a = Math.sin((1 - t) * angle) / sinAngle;
      const b = Math.sin(t * angle) / sinAngle;
      dir = normalStart.clone().multiplyScalar(a).add(normalEnd.clone().multiplyScalar(b)).normalize();
    }
    const lift = Math.sin(t * Math.PI) * liftFactor; // 0 at both ends, peaks at the midpoint
    points.push(dir.multiplyScalar(MOON_R * (1 + lift)));
  }
  return points;
}

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

// --------------------------------------------------------------------------
export function initMoonScene({ canvas, labelLayer }) {
  const scene = new THREE.Scene();

  // Orthographic, and sized so the LIMB RING (or the CMG cubesat's orbit,
  // whichever needs more room) exactly inscribes the canvas — see the note at
  // the top of this file. Get this wrong and the disc's radius fraction baked
  // into .proj-moon's sizing math in style.css no longer matches reality.
  const camera = new THREE.OrthographicCamera(-FRUSTUM_R, FRUSTUM_R, FRUSTUM_R, -FRUSTUM_R, 0.1, 100);
  camera.position.set(0, 1.4, 6);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.55;
  controls.enablePan = false;
  // Zoom must stay off. On an orthographic camera OrbitControls dollies by
  // changing camera.zoom, which would rescale the disc inside its box and
  // break the limb placement the CSS depends on.
  controls.enableZoom = false;
  // Stop short of the poles for the same reason the globe does: straight down
  // the axis the graticule collapses into a spiral.
  controls.minPolarAngle = Math.PI * 0.28;
  controls.maxPolarAngle = Math.PI * 0.72;
  controls.autoRotate = !REDUCED;
  controls.autoRotateSpeed = 0.22;

  const surfaceTex = bakeMoonTexture(renderer);
  const moon = buildMoon(surfaceTex);
  const graticule = buildGraticule(MOON_R * 1.004);
  const limb = buildLimbRing(LIMB_R);
  if (REDUCED) limb.material.opacity = 0.4; // normally faded up by the arrival

  // Body and graticule share one spin axis, given a small tilt so the
  // graticule reads as a globe rather than as a flat grid.
  const body = new THREE.Group();
  body.rotation.z = (-6.7 * Math.PI) / 180;
  body.add(moon.mesh, graticule);

  const cmgSat = buildCmgCubesat();

  // Sky Crane: a fixed point on the surface, so it turns with the Moon rather
  // than orbiting it. The Moon has no self-spin of its own (see the header
  // note above) — what actually turns it, visually, is the camera's own
  // autoRotate/drag — so parenting to `body` is what makes this correct: the
  // lander stays put on the surface, in real 3D, as the camera moves around.
  const craneAnchor = anchorOnSurface(surfaceNormal(18, 35), 0.1, buildSkyCraneLander());
  body.add(craneAnchor);

  // Lunar Hopper: the trajectory itself, no model — see the note above
  // hopTrajectoryPoints(). Also parented to `body` so it turns with the Moon.
  // "Just one line - - - - but a little thick": a plain THREE.Line can dash
  // (LineDashedMaterial) but can't read as "a little thick" — WebGL mostly
  // ignores Line's own linewidth, capped at 1px in most browsers regardless
  // of what it's set to. A single continuous TubeGeometry solves the
  // thickness but can't dash. Built as a series of short tube segments with
  // gaps between them instead — real 3D thickness AND a genuine dash pattern.
  // All dash segments are merged into one fill mesh + one edges LineSegments
  // (none of them ever move independently), so this is 2 draw calls instead
  // of one pair per dash — it was ~13 pairs (26 draw calls) before merging,
  // the single biggest contributor to this scene suddenly costing much more
  // per frame than it used to.
  const hopPoints = hopTrajectoryPoints(new THREE.Vector3(0, -1, 0), surfaceNormal(-35, 210));
  const hopCurve = new THREE.CatmullRomCurve3(hopPoints);
  const hopLine = new THREE.Group();
  {
    const DASH_RADIUS = 0.035; // "a little thick" — thicker than a hairline, not a chunky pipe
    const samples = hopCurve.getPoints(100);
    const dashLen = 5, gapLen = 3; // in sample-points, not world units
    const fills = [], edges = [];
    for (let i = 0; i < samples.length - 1; i += dashLen + gapLen) {
      const dashPts = samples.slice(i, Math.min(i + dashLen + 1, samples.length));
      if (dashPts.length < 2) continue;
      const dashGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dashPts), dashPts.length - 1, DASH_RADIUS, 6, false);
      fills.push(dashGeo);
      edges.push(new THREE.EdgesGeometry(dashGeo, 25));
    }
    hopLine.add(new THREE.Mesh(mergeGeometries(fills), new THREE.MeshBasicMaterial({ color: BONE, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })));
    hopLine.add(new THREE.LineSegments(mergeGeometries(edges), new THREE.LineBasicMaterial({ color: BONE })));
  }
  body.add(hopLine);
  // A plain marker at the arc's apex, purely so the label has a real Object3D
  // to project from every frame — the same pattern as craneAnchor and cmgSat,
  // rather than a one-off vector no other code touches.
  const hopMarker = new THREE.Object3D();
  hopMarker.position.copy(hopPoints[Math.floor(hopPoints.length / 2)]);
  body.add(hopMarker);

  // No lights in this scene at all, by design — every material above is a
  // custom shader.
  scene.add(body, limb.line, cmgSat);

  // Plain HTML links, same visual language as the hero's cubesat labels
  // (.cubesat-label is shared, not duplicated) — reused rather than raycast
  // hover-tested like the hero's four, since a real anchor sitting on top of
  // the canvas already gets native :hover for free with only three of these.
  function makeMoonLabel(text, href) {
    if (!labelLayer) return null;
    const el = document.createElement("a");
    el.className = "cubesat-label";
    el.href = href;
    el.innerHTML = `<span class="cl-name">${text}</span>`;
    labelLayer.appendChild(el);
    return el;
  }
  const cmgLabel = makeMoonLabel("cmg desaturation", "projects/thesis.html");
  const craneLabel = makeMoonLabel("sky crane", "projects/controls-final-project.html");
  const hopperLabel = makeMoonLabel("lunar hopper", "projects/senior-design-project.html");

  // One low orbit, tilted and inclined for visual interest the same way the
  // hero's satellites are, but tighter — the actual thesis is about LEO, so a
  // close pass reads truer than a wide sweep. Unlike Sky Crane and Lunar
  // Hopper, both fixed to the body above, this one does not track the Moon's
  // rotation at all; it just goes around it in real 3D.
  const CMG_ORBIT = { radius: ORBIT_R, tilt: 22, incl: 14, speed: 0.07 };
  const tmpVec = new THREE.Vector3();

  function positionCmgSat(now) {
    const { radius, tilt, incl, speed } = CMG_ORBIT;
    const angle = (now / 1000) * speed;
    const tiltRad = (tilt * Math.PI) / 180;
    const inclRad = (incl * Math.PI) / 180;

    let px = radius * Math.cos(angle);
    let py = 0;
    let pz = radius * Math.sin(angle);

    // inclination: rotate the orbit plane about the x-axis
    const y2 = py * Math.cos(inclRad) - pz * Math.sin(inclRad);
    const z2 = py * Math.sin(inclRad) + pz * Math.cos(inclRad);
    py = y2; pz = z2;

    // tilt: rotate the orbit plane about the z-axis
    const x3 = px * Math.cos(tiltRad) - py * Math.sin(tiltRad);
    const y3 = px * Math.sin(tiltRad) + py * Math.cos(tiltRad);
    px = x3; py = y3;

    cmgSat.position.set(px, py, pz);
    if (!REDUCED) cmgSat.rotation.y += 0.006; // slow self-spin, purely decorative
  }

  // Shared by all three labels: project an Object3D's world position into
  // canvas-local pixels, using viewW/viewH cached by resize() rather than
  // reading canvas.clientWidth/Height here — this runs 3 times a frame (once
  // per label), and clientWidth/Height are layout reads; resize() already
  // has to know these numbers, so reading them again here was pure waste.
  let viewW = 0, viewH = 0;
  function placeLabel(el, obj, yOffset = 20) {
    if (!el) return;
    obj.getWorldPosition(tmpVec).project(camera);
    const x = (tmpVec.x * 0.5 + 0.5) * viewW;
    const y = (-(tmpVec.y * 0.5) + 0.5) * viewH;
    el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y + yOffset}px)`;
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    viewW = w; viewH = h;
    renderer.setSize(w, h, false);
    // The box is square in CSS, but never assume it: keeping the frustum
    // square regardless is what guarantees the disc stays a circle of a known
    // fraction of the box even if the aspect slips.
    const aspect = w / h;
    camera.left = -FRUSTUM_R * Math.max(1, aspect);
    camera.right = FRUSTUM_R * Math.max(1, aspect);
    camera.top = FRUSTUM_R * Math.max(1, 1 / aspect);
    camera.bottom = -FRUSTUM_R * Math.max(1, 1 / aspect);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  renderer.domElement.addEventListener("pointerdown", () => {
    renderer.domElement.classList.add("dragging");
  });
  window.addEventListener("pointerup", () => {
    renderer.domElement.classList.remove("dragging");
  });

  // Arrival: the body fades up and the limb hairline draws in behind it,
  // matching how the hero globe introduces itself.
  const INTRO_MS = 1100;
  let introStart = null;
  let introDone = REDUCED;
  if (REDUCED) {
    moon.uniforms.uFade.value = 1;
    if (labelLayer) labelLayer.style.opacity = "1";
  }

  // Render only while the section is actually on screen. This is the whole
  // reason a second WebGL context is affordable here — see the header note.
  let visible = false;
  let frame = null;

  function tick(now) {
    frame = requestAnimationFrame(tick);

    if (!introDone) {
      if (introStart === null) introStart = now;
      const p = Math.min((now - introStart) / INTRO_MS, 1);
      const e = easeOutCubic(p);
      moon.uniforms.uFade.value = e;
      limb.material.opacity = 0.4 * e;
      if (labelLayer) labelLayer.style.opacity = String(e);
      if (p >= 1) introDone = true;
    }

    // Billboard the limb so it traces the apparent silhouette from any angle.
    limb.line.quaternion.copy(camera.quaternion);

    positionCmgSat(now);
    placeLabel(cmgLabel, cmgSat);
    placeLabel(craneLabel, craneAnchor);
    placeLabel(hopperLabel, hopMarker);

    controls.update();
    renderer.render(scene, camera);
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
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        visible = e.isIntersecting;
        if (visible) start();
        else stop();
      });
    }, { rootMargin: "120px" });
    io.observe(canvas);
  } else {
    start();
  }

  // A tab in the background gets no useful frames anyway, and leaving the loop
  // running there is exactly the kind of idle drain this scene must not add.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (visible) start();
  });

  return { start, stop, resize };
}
