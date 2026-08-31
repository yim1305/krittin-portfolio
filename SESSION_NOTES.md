# Performance debugging handoff

Date: 2026-08-31

## User-reported behavior

- The portfolio was laggy and slow to scroll on the laptop's built-in display.
- It was smooth on the same laptop's HDMI monitor, phones, and iPads.
- After the changes below, `http://localhost:3000` became smooth.
- The user reports that the GitHub-hosted website is still very laggy, including in an incognito window and after `Ctrl+Shift+R`.
- The same published GitHub Pages tab/site becomes genuinely smooth when shown on the laptop's extended HDMI monitor. This rules out GitHub/network latency as the cause of the ongoing lag after page load because the downloaded code does not change when the window moves between displays.
- Additional cross-device/browser report: another friend's macOS laptop lags; a friend's Windows laptop using Firefox is smooth; on the user's own Windows laptop, both Chrome and Edge lag on the built-in panel. Chrome and Edge are both Chromium-based, so that comparison does not isolate browser engine behavior.
- Controlled browser-engine result: on the user's own laptop and built-in display, the exact same published URL is very smooth in Firefox without any site changes, while Chrome and Edge remain laggy. This confirms a Chromium-specific rendering/compositor interaction on the internal-display path rather than a GitHub/network problem or insufficient hardware alone.

## Confirmed display/GPU topology

Read from Windows on 2026-08-31:

- Built-in panel path: AMD Radeon 780M Graphics, 2880x1800 at 120 Hz.
- Extended monitor path: NVIDIA GeForce RTX 5060 Laptop GPU, 1920x1080 at 144 Hz.
- Windows reports the built-in display as an internal connection and the extended display as HDMI (`VideoOutputTechnology = 5`).

This falsifies refresh rate alone as the primary explanation: the faster 144 Hz external monitor is smooth. The important differences are that the built-in panel has 2.5x as many physical pixels and is attached to the AMD integrated-GPU/compositor path, while the 1080p external monitor is attached to the RTX path.

The macOS report makes an AMD-only driver defect unlikely. A plausible common factor is a high-density internal laptop panel (2880x1800 on the user's laptop and likely Retina on the Mac) combined with full-screen CSS repaint/compositor pressure. The smooth Windows/Firefox result may reflect lower display resolution/density, Firefox's different Gecko/WebRender paint pipeline, different GPU hardware, or a combination; it is not yet a controlled browser comparison.

The user's controlled Firefox test now removes that ambiguity: Gecko/WebRender handles this page smoothly on the same 2880x1800 AMD-driven panel where both Chromium browsers lag. High resolution increases the cost, but Chromium's handling of the page's paint/compositor workload is the differentiating factor. The leading site trigger remains the continuous `background-position` writes on three oversized multi-radial-gradient star layers, with the fixed nebula and WebGL canvas adding further compositing pressure.

The WebGL canvas now has a framebuffer pixel budget, but that does not cap normal CSS rasterization/compositing. The three `.star-layer` elements are each oversized with `inset:-25%` and their gradient `background-position` is rewritten continuously. On the high-resolution internal panel, those full-screen gradient layers and the fixed nebula can still require substantially more paint/compositor bandwidth than on the 1080p external display. This is now the leading ongoing-lag hypothesis.

The current 60 FPS limiter can create display-dependent cadence, but the confirmed 120 Hz internal / 144 Hz external result shows it is secondary rather than the main cause here.

## Performance changes made

- `js/orbit-scene.js`
  - Added a framebuffer pixel budget (`MAX_RENDER_PIXELS = 2200000`) instead of relying only on `devicePixelRatio`.
  - Pixel ratio now has a 0.75 floor and adapts to canvas dimensions.
  - Added runtime performance sampling. If sustained frame intervals are slow, internal render resolution drops by 20%, at most twice.
  - Existing hero loop remains capped at 60 FPS and stops useful rendering while off-screen.
- `js/system-scene.js`
  - Added a 2.4-million-pixel framebuffer budget and recalculates pixel ratio on resize.
- `js/main.js`
  - Reduced decorative starfield/background repaint updates from 60 FPS to 24 FPS.
- `css/style.css`
  - Changed the body vignette from `background-attachment: fixed` to normal scrolling.
  - Removed the sticky navigation's `backdrop-filter: blur(8px)` and made its flat background more opaque.
  - Removed `will-change: background-position` from the oversized star layers.
- Updated HTML cache-busters to `20260831b` for that optimization pass.

## Chromium-focused fixes applied after controlled Firefox test

Applied locally on 2026-08-31; cache version `20260831c`:

- `js/main.js`
  - Replaced continuous `background-position` writes on all three oversized gradient star layers with bounded `translate3d(...)` motion.
  - Retained depth, slow drift, scroll parallax, reduced-motion behavior, and cross-page phase/offset persistence.
  - Kept decorative updates at 24 Hz, but they are now compositor-only rather than paint-triggering.
  - Shortened same-page navigation from 620-1150 ms to 420-800 ms and the fallback page-exit delay from 190 ms to 120 ms.
- `css/style.css`
  - Star layers now use `contain: paint` and `will-change: transform`; overscan was reduced from 25% to 20% because motion is bounded.
  - Shortened root and shared-element view transitions.
- `index.html`
  - Removed the static `system-scene.js` import. The module and its add-ons now load through `import()` only when Projects is within a 700 px approach margin.
  - Switched the import map to Three.js's minified ES-module build.
- `js/orbit-scene.js`
  - Reduced the one-time procedural surface bake from 2048x1024 to 1024x512, cutting its fragment workload and texture area to one quarter.
- `projects/thesis.html`
  - Switched its Three.js import map to the minified build.
- All HTML pages now reference `style.css?v=20260831c` and `main.js?v=20260831c`; the homepage references the changed scenes with `20260831c` as well.

JavaScript syntax checks passed for `main.js`, `orbit-scene.js`, and `system-scene.js`.

## Local server

- A static server was launched with `npx serve -l 3000 .`.
- It was confirmed listening on port 3000 and returning HTTP 200.

## Git/deployment state

- Git executable used:
  `C:\Users\kritt\AppData\Local\GitHubDesktop\app-3.6.4\resources\app\git\cmd\git.exe`
- Branch: `main`
- Remote: `https://github.com/yim1305/krittin-portfolio.git`
- Current commit: `7db4ea1d93cb673e33faf1bc388a3c5a0b535eb1` (`fix lag`)
- Local `main`, recorded `origin/main`, and GitHub's actual `refs/heads/main` all matched that hash.
- A push was attempted again and completed with nothing additional pending.

## GitHub Pages verification

The assumed public URL was:
`https://yim1305.github.io/krittin-portfolio/`

Before the `20260831c` local changes, direct HTTP requests confirmed status 200 and the latest deployed markers in all of these resources:

- `/` contains cache version `20260831b`
- `/js/orbit-scene.js?v=20260831b` contains the adaptive pixel-budget code
- `/js/main.js?v=20260831b` contains the 24 FPS decorative update rate
- `/css/style.css?v=20260831b` contains the cheaper scrolling/compositing styles

Therefore the assumed GitHub Pages URL was not serving stale files. The new `20260831c` work still needs to be committed/pushed before it can be verified on GitHub Pages.

Direct timing checks from the live site were also fast (roughly 50-200 ms to first byte for GitHub-hosted HTML/CSS/JS during the test), so GitHub Pages itself did not exhibit server-side slowness.

## Additional startup/latency findings

- `index.html` statically imports both `orbit-scene.js` and `system-scene.js`. The Projects scene is lazy only in initialization, not in download or parse: its 134.8 KB module and four Three.js add-ons are fetched at startup.
- The page pulls the unminified 1.27 MB `three.module.js` from unpkg.
- The hero performs a 2048x1024 procedural shader texture bake during initialization.
- Same-page smooth scrolling is intentionally 620-1150 ms, and cross-document view transitions can take about 610 ms, which contributes to the subjective sense that controls/navigation respond slowly.

## Next step

Prioritize an A/B isolation test on the built-in panel: disable the animated CSS star/nebula layers independently from the WebGL hero, then compare responsiveness. Also test the browser with Windows' high-performance GPU preference (RTX) and, separately, a temporarily lower internal-panel resolution. These tests distinguish CSS fill-rate/compositor cost from cross-GPU presentation and WebGL cost.

The controlled browser-engine test is complete: Firefox is smooth while Chrome/Edge are slow on the same built-in panel and exact URL. Focus implementation on removing Chromium-sensitive paint triggers, starting with animated `background-position` on the oversized multi-gradient star layers. Ask which browser the macOS friend used and, if possible, the Mac display resolution/model before drawing a Safari-vs-Chromium conclusion.

Implementation order originally identified:

1. Replace continuously repainted gradient `background-position` layers with compositor-only transforms or a pre-rendered texture/canvas; stop or greatly reduce updates while scrolling.
2. Change `system-scene.js` to a real dynamic `import()` inside the IntersectionObserver.
3. Self-host a minified Three.js build/add-ons and consider replacing the runtime 2048x1024 hero bake with a precomputed texture or a smaller bake.
4. Rework frame pacing and reduce/shorten deliberately long scroll/page-transition durations.

Items 1, 2, the smaller bake/minified dependency portion of 3, and the duration portion of 4 are now implemented locally. Remaining verification should focus on Chromium rendering behavior on the user's internal panel after publishing `20260831c`.

## Startup-only optimization pass

After the `20260831c` repaint fix, the user confirmed rotation and dragging were smooth; only cold loading and the first moments remained slow. Applied locally afterward:

- The homepage no longer statically imports `orbit-scene.js`. It schedules a dynamic import after the first paint (`requestIdleCallback` with a 350 ms timeout, or a two-frame fallback), so DOM content, navigation, typing, and other page behavior no longer wait for Three.js download/parse or WebGL initialization.
- Added an early `preconnect` to unpkg so deferring the hero does not add avoidable connection setup latency.
- Changed the orbit scene cache key to `20260831d`.
- Reduced the procedural hero surface bake again, from 1024x512 to 768x384.
- High-density desktop displays now start the hero at `qualityScale = 0.8` instead of overloading the first frames at full quality and waiting for adaptation.
- Adaptive quality evaluates after 45 rendered samples instead of 90 and stores the learned scale in `localStorage`, separated into `hidpi` and `standard` keys, so later visits start at the known-safe quality.
- Shortened the hero arrival animation from 1900 ms to 1100 ms so successful loading no longer visually resembles a long stall.

These startup changes are local and still need publishing/testing in Chromium on the built-in panel.
