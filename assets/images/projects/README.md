# Project stills

One still image per project, shown in the Projects field on the home page.
The page already points at every filename below — **drop the files in and they
appear.** No markup change, no rebuild. Until a file exists, that object shows
a labelled placeholder box instead, so a missing image is never a broken page.

Three of these six (`hybrid-cmg`, `sky-crane`, `lunar-hopper`) are now
**mobile/reduced-motion fallbacks only** — their live versions on desktop are
real 3D objects on the Moon (`js/moon-scene.js`), not images. Keep supplying
these three anyway; they are still what shows up in the one stacked layout
where the Moon's WebGL canvas never mounts.

| File | Project | Detail page |
|---|---|---|
| `terragator.png` | Project TerraGator | `projects/rocket-airbrake.html` |
| `navigator.png` | Project Navigator | `projects/rocket-software.html` |
| `hybrid-cmg.png` | Hybrid CMG Momentum Desaturation | `projects/thesis.html` — **mobile/reduced-motion fallback only**; the live version is a 3D cubesat orbiting the Moon (`js/moon-scene.js`) |
| `nonholonomic-cbf.png` | Non Holonomic Control Barrier Function | `projects/ros-research.html` |
| `sky-crane.png` | Sky Crane | `projects/controls-final-project.html` — **mobile/reduced-motion fallback only**; the live version is a lander fixed to the Moon's surface (`js/moon-scene.js`) |
| `lunar-hopper.png` | Lunar Hopper | `projects/senior-design-project.html` — **mobile/reduced-motion fallback only**; the live version is a drawn hop trajectory on the Moon, no model at all (`js/moon-scene.js`) |

## What each one should be

A still render or photo of the object on a **transparent background**. Each
sits directly on open sky — there is no card, no frame and no media well behind
it, so any background baked into the image will read as a rectangle floating in
space.

- **PNG with real alpha.** A white or black background is not transparent; it
  will show. If your CAD tool can only export opaque, say so and the background
  can be knocked out.
- **Crop tight to the object.** The image is fitted with `object-fit: contain`
  inside a box sized per project, so empty margin inside the file just makes the
  object look smaller than its neighbours.
- **Roughly these proportions**, so nothing is letterboxed. They are set per
  object in `index.html` as `--ar` (width ÷ height) and are easy to change if
  your render comes out differently:

  | File | Aspect (w ÷ h) | Shape |
  |---|---|---|
  | `terragator.png` | 0.67 | tall — a standing rocket |
  | `navigator.png` | 0.67 | tall — a standing rocket |
  | `hybrid-cmg.png` | 1.0 | square — the 12U cubesat |
  | `nonholonomic-cbf.png` | 1.875 | wide — see below |
  | `sky-crane.png` | 1.15 | slightly wide |
  | `lunar-hopper.png` | 1.05 | near square |

- **Around 2× the on-screen size** is plenty — roughly 400–800px on the long
  edge, with the CBF robot at the small end and the floor-wide objects at the
  large end. These are small objects on the page and this is a static site with
  no image pipeline, so oversized files cost load time for nothing.

## Two special cases

**`nonholonomic-cbf.png`** — the perspective floor and the dashed line the robot
tracks are **drawn by the site**, as SVG hairlines, so they match every other
rule on the page. This file should be **the robot only**, nothing else: no
floor, no grid, no path. It is composited on top of the drawn floor.

**`lunar-hopper.png`** — this one keeps its *in progress* pill next to the
title, so a work-in-progress render is fine and expected.

## Naming

Lowercase, hyphenated, exactly as in the table. The filenames are wired into
`index.html`; renaming a file means editing the matching `src` there.
