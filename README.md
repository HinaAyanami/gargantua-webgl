# Gargantua · Real-time Black Hole Gravitational Lensing

*[中文说明 →](README.zh-CN.md)*

A Gargantua-like black hole (think *Interstellar*) rendered **in real time, in a single HTML file, with zero dependencies and no build step**. Every pixel integrates a null geodesic in a WebGL2 fragment shader; the accretion disk, relativistic beaming, gravitational redshift and HDR bloom are all computed on the GPU.

![preview](preview.png)

## Run it

Double-click `blackhole.html`, or drag it into a browser window. It needs **WebGL2** — any recent Chrome / Edge / Firefox / Safari. The page is one self-contained file, so `file://` works; no server, no install, no network.

Want it online? Enable GitHub Pages for this repo and open `/blackhole.html` (the root `index.html` is just a redirect to it).

## Controls

| Input | Effect |
|---|---|
| Drag | Orbit the camera (with inertial smoothing) |
| Wheel | Zoom the camera distance (7 – 80) |
| Right panel | Accretion disk on/off, auto-rotate on/off, integration steps (100–400), exposure, starfield brightness, reset view |

The UI is in Chinese; the panel labels are the seven controls listed above.

## What is actually implemented

- **Ray integration** — per-pixel integration of null geodesics with the weak-field acceleration `a = -1.5·h²·r/r⁵` (`h²` = squared orbital angular momentum, conserved along the geodesic), RK2 half-steps and a step size adapted to the current radius. The apparent shadow, the disk's lensed top and bottom images, and the Einstein ring all fall out of this — none of them are drawn as shapes.
- **Accretion disk** — an infinitely thin disk sampled at plane crossings, with a correction for oblique optical path length. Anisotropic fBm turbulence (high radial frequency, low angular frequency) produces the sheared filaments of a differentially rotating disk. Brightness ramps up at the inner edge (ISCO) with a radial temperature colour gradient.
- **Relativistic effects** — Doppler beaming (one side of the disk is noticeably brighter), gravitational redshift and a brightness boost; the starfield is lensed by the same integration.
- **Post-processing bloom** — the scene renders into an RGBA16F linear HDR buffer, then brightness-threshold extraction at 1/4 resolution → four separable Gaussian blurs → ACES tone mapping.
- **Adaptive resolution** — the internal render target scales from 1.0 down to 0.45 when frame time exceeds 30 ms, and steps back up below 15 ms. Default integration step count is 220.

## Performance notes

The default 220 steps is tuned for a discrete GPU. On weak hardware, **lower the step count to 150–180** before anything else — the loss is barely visible and the adaptive resolution takes care of the rest.

## Repository layout

| Path | Content |
|---|---|
| `blackhole.html` | The deliverable, 781 lines, single file |
| `index.html` | Two-line redirect, only so GitHub Pages works from the repo root |
| `preview.png` | Final render |
| `screenshots/` | Iteration renders — see the gallery below |
| `analysis/` | Texture analysis crops (4× nearest-neighbour magnification) |
| `tools/` | Headless-browser verification scripts |

## Verification tooling

The rendering was developed against instrumented readouts rather than by eyeballing screenshots: the page exposes `window.__diag` (measured: `gl, err, frames, fps, w, h, steps, hdr, post`) and `window.__state` (camera state, so automation can read and drive it).

Requirements: **Node 18+** (uses the global `fetch` / `WebSocket`) and a Chromium-based browser. The browser is auto-detected from the usual install locations; if yours lives elsewhere, point `BROWSER_BIN` at it:

```bash
BROWSER_BIN="C:/Program Files/Google/Chrome/Application/chrome.exe" node tools/shot.mjs
```

```bash
node tools/shot.mjs [out.png] [wait_ms] [url]   # headless screenshot + diagnostic readout
node tools/drag.mjs                             # asserts drag rotates yaw/pitch, wheel changes distance
node tools/zoom.mjs                             # renders at 4 camera distances (incl. both limits)

python tools/analyze.py [in.png] [out_prefix]   # luminance stats, detail metrics, 4× crops
python tools/map.py [in.png]                    # luminance ASCII map + row/column profiles
python tools/checkzoom.py [dir]                 # flags any zoom_*.png that went nearly black
```

`tools/browser.mjs` holds the shared browser/launch/CDP plumbing used by the three Node scripts. Example output of a successful `shot.mjs` run (headless, software rasterizer):

```
DIAG  : {"gl":true,"err":null,"frames":13,"fps":2.01,"w":1280,"h":760,"steps":220,"hdr":true,"post":true}
ERROR : ""
STATUS: 1280×760 | 2 fps
```

The 2 fps figure comes from headless SwiftShader software rendering — that is the rasterizer, not the page.

## Gallery

### Iteration, `s3` → `s11`

Each step was verified with a screenshot plus a diagnostic readout.

| `screenshots/s3.png` | `screenshots/s6.png` | `screenshots/s9.png` | `screenshots/s11.png` |
|---|---|---|---|
| ![s3](screenshots/s3.png) | ![s6](screenshots/s6.png) | ![s9](screenshots/s9.png) | ![s11](screenshots/s11.png) |

### Interaction and distance checks

| Drag to orbit | dist 25 | dist 12 | wheel max |
|---|---|---|---|
| ![drag](screenshots/drag.png) | ![z_a](screenshots/zoom_a_dist25.png) | ![z_b](screenshots/zoom_b_dist12.png) | ![z_c](screenshots/zoom_c_wheel_max.png) |

`zoom_*.png` exists to catch the classic regression where pulling the camera back makes the black hole vanish from the frame.

### Texture analysis

![an8](analysis/an8_combo.png)

`analysis/` holds 4× nearest-neighbour crops of the disk, the sky and the lensed arc from successive iterations, plus a high-pass enhanced disk crop (`an8_disk_hp.png`) used to judge whether the turbulence had real filament structure instead of smooth noise.

## License

MIT — see [LICENSE](LICENSE). © HinaAyanami
