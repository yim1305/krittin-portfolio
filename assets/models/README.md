# 3D project models — not used

**Superseded. Nothing here is loaded by the site.**

This folder was staged for a planned project carousel that would have loaded
one `.stl` per project with Three.js's `STLLoader` and drawn it white-outline /
transparent-body. That carousel was replaced by the scatter field now in the
Projects section, and Krittin asked for the projects to be **still images**
rather than live 3D — "just make all the models a still image of 3d object".

**The stills go in `assets/images/projects/` instead. See the README there.**

The folder is kept because the STL route is the natural upgrade if the objects
should ever become live 3D: STL is the format nearly every CAD tool (SolidWorks,
Fusion 360) exports directly with no conversion step, Three.js loads it natively
via `STLLoader` (`three/addons/loaders/STLLoader.js`, resolvable through the
import map already in `index.html`), and `EdgesGeometry` plus a flat
`MeshBasicMaterial` gives the outline look without any lighting — matching how
the globe and the Moon are both built.

Note that the project names have changed twice since this folder was staged, so
any slug list written here would be wrong. `CLAUDE.md` holds the current
title-to-file mapping.
