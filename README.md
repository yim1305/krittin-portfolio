# Krittin Jindamai — Aerospace Engineering Portfolio

Personal portfolio site. Static HTML/CSS/JS, no build step, built to be
served directly by GitHub Pages.

## Structure

```
index.html               home page (single scrolling page: hero, about,
                         experience, projects, awards)
projects/                one detail page per project, linked from the
                         project field on the home page
css/style.css            shared styles
js/main.js               typing, eased scroll, reveals, nav, descent,
                         starfield, clock, the project field
js/orbit-scene.js        the 3D Earth + orbiting cubesats on the hero
js/moon-scene.js         the 3D Moon in the projects section
assets/images/           headshot and page imagery
assets/images/projects/  one still per project — see the README there
assets/video/            project video clips
assets/papers/           resume + project PDFs
CLAUDE.md                dev notes for Claude Code — safe to delete
                         before publishing, has no effect on the site
```

## Running locally

No build step, but it **must** be served over HTTP — `index.html` imports
`js/orbit-scene.js` and `js/moon-scene.js` as ES modules, and opening the file
over `file://` gets the module load blocked by CORS. The 3D scenes also pull
Three.js from unpkg, so the hero and the Moon need an internet connection; the
rest of the page is fine without one.

```
python3 -m http.server 8080
```

then open `http://localhost:8080`.

## Publishing to GitHub Pages

1. Push this folder to a GitHub repo.
2. In the repo: **Settings → Pages → Source → branch `main`, folder `/ (root)`**.
3. GitHub gives you a live URL (`yourusername.github.io/reponame`) within
   a minute or two.

## Still needed before this is "done"

See the placeholder text in brackets (e.g. `[Placeholder description]`)
throughout `index.html` and `projects/*.html`, plus the README in each
`assets/` subfolder for exactly what files are expected and where.
