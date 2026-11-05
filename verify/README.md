# Verification harnesses (not shipped)

Scratch tooling used to verify the Carter Lab ports (Phase 5E Dial, Phase 5F
Paste-Up, Phase 5G ThreeJs Scene). It is **not** part of the app: no
`src/` module imports it and Vite never bundles it. `jsdom` is installed ad hoc
for this directory only and is deliberately **not** added to `package.json`.

```bash
npm i --no-audit --no-fund jsdom@25   # verification only; revert manifests after
CARTER_REF=/tmp/carter node verify/dial-verify.mjs
CARTER_REF=/tmp/carter node verify/paste-up-verify.mjs
CARTER_REF=/tmp/carter node verify/paste-up-css.mjs
CARTER_REF=/tmp/carter node verify/paste-up-ssr.mjs > /tmp/after.json
CARTER_REF=/tmp/carter node verify/threejs-test-verify.mjs
CARTER_REF=/tmp/carter node verify/threejs-test-css.mjs
node verify/threejs-test-ssr.mjs > /tmp/after.json
```

`CARTER_REF` points at a read-only checkout of
`sausageOps/carterogunsola-reconstruction`; Carter's sources are rewritten at run
time and never vendored here.

## What it does

`dial-verify.mjs` runs two independent suites and prints `PASS`/`FAIL` per check.

**Section A — original vs port, numerically.**
Carter's own engine source (`app/lib/experiments/dial.js`, read-only checkout at
`3f50832…`) is imported from `/tmp` at run time — no copy of Carter's code is
committed here. Both engines are mounted into separate jsdom windows and given
identical input (pointer, wheel, keyboard, `set()` config, resize, teardown).
Every frame is driven through one shared gsap timeline so both engines receive
the same timestamp; gsap's own rAF loop is frozen for this section. Snapshots
cover all 26 item transforms, the tick ring, the grip, knob geometry, the
conic-cover centre, the active channel and `aria-selected`. Each viewport
(1440×900, 768×1024, 390×844) runs with reduced motion off and on.

**Section B — the real integration path.**
`CarterRoute -> CarterPageBoundary -> LabDetailPage -> DialStage -> engine`,
rendered with React into jsdom and driven through the window's own
`requestAnimationFrame` queue. Checks mount, loading/live stage flags, ARIA,
external link safety, wheel scrub, arrow-key stepping, pointer drag + release,
12 route changes (dial ↔ heart) with listener/observer/DOM leak accounting, the
other experiment routes staying isolated from Dial and retaining their fallback
DOM (with active stage markers where their engines mount), the other ported
engines mounting only their own DOM, and full teardown on unmount.

**Phase 5F — Paste-Up.** `paste-up-verify.mjs` adds a recording WebGL2 context
and a recording 2d context (so both the original and the port take the real GL
path), a deterministic model of paste-up's grid templates, and a `<img>` stub
whose `naturalWidth` follows the requested `width=`. Section A compares the
original against the port across mount, index/spread/strip switches, plate
swaps, `Enter` selection, the `fetch` dwell, the `memory` knob, `set()` config,
resize, teardown, the no-WebGL2 fallback and the 1440 hi-res upgrade; Section B
re-runs the real integration path against a recording GL context; the
`paste-up-ssr.mjs` dump is diffed against a `git archive` of the base commit to
prove the other eight detail routes are unchanged. `paste-up-css.mjs` compares
the scoped stylesheet with Carter's inline block rule by rule.

**Phase 5G — ThreeJs Scene.** `threejs-test-verify.mjs` needs one more input: the
real `Lantern.glb`, because three's `GLTFLoader` is only meaningfully exercised
by an actual glTF. It reads a local copy (`LANTERN_GLB`, default
`/tmp/gltf-lantern/Models/Lantern/glTF-Binary/Lantern.glb`), which comes from a
sparse checkout of the exact Khronos commit Carter's URL pins
(`KhronosGroup/glTF-Sample-Assets@2bac6f8c…`) and is **not** vendored here:

```bash
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/KhronosGroup/glTF-Sample-Assets /tmp/gltf-lantern
cd /tmp/gltf-lantern && git sparse-checkout set Models/Lantern/glTF-Binary \
  && git checkout 2bac6f8c57bf471df0d2a1e8a8ec023c7801dddf
```

Section A mounts Carter's original `threejs-test.js` (only its three chunk
imports rewritten at run time) and the port in separate jsdom windows, each with
a recording stub WebGL2 context, a staged layout, a `fetch` that serves the real
`Lantern.glb` bytes, a `createImageBitmap` stub and one shared `three` module.
The two engines are mounted **one at a time** — `FileLoader` dedupes concurrent
requests to one URL in a module-level map, so overlapping mounts would make the
second engine attach to the first engine's in-flight loads — and are then
stepped frame by frame on their own rAF queues with identical timestamps. The
checks compare the loaded model's GL traffic (fetch URLs, bitmap count, texture
uploads, buffer calls and bytes), the stage DOM and pills, all three render
modes, the superformula morph / re-sample / group swap, a 13-value `set()`
sweep, resize and teardown across three viewports with reduced motion off and
on, plus the no-WebGL path and destroy-mid-load. Section B re-runs the real
integration path and includes the canvas's GLTF traffic, three route
round-trips with observer/listener accounting, the three other experiment
routes isolated from ThreeJs while retaining their fallback DOM, and teardown
on unmount. Section B also supplies event-capable Audio and asynchronous
IntersectionObserver stubs plus a viewport metric for Dynamic Scrollbar.
`threejs-test-css.mjs` compares the
scoped stylesheet rule by rule against Carter's inline block **and** the `.spin`
mark against `app/styles/global.scss`, then audits the built stylesheet for
leftover `rem`. `threejs-test-ssr.mjs` is the Phase 5G SSR dump.

Files:

| File | Role |
| --- | --- |
| `harness.mjs` | jsdom window factory (viewport-driven layout, observers, audio stub, rAF queue), global scoping, `pumpFrames`, numeric snapshot comparison |
| `dial-verify.mjs` | the two Dial suites above |
| `dial.port.mjs` | thin re-export of the shipped engine + runtime |
| `paste-up-verify.mjs` | Paste-Up: recording GL/2d contexts, layout model, image stub, original-vs-port suites, integration suite, SSR suite |
| `paste-up.port.mjs` | thin re-export of the shipped Paste-Up engine + runtime |
| `paste-up-css.mjs` | rule-by-rule comparison of `paste-up.css` against Carter's inline block |
| `paste-up-ssr.mjs` | per-route SSR facts dump, diffable against a clean base checkout |
| `threejs-test-verify.mjs` | ThreeJs Scene: recording GL context, stubbed fetch/imageBitmaps, original-vs-port suites, integration suite |
| `threejs-test.port.mjs` | thin re-export of the shipped ThreeJs Scene engine + runtime |
| `threejs-test-css.mjs` | rule-by-rule comparison of `threejs-test.css` against Carter's inline block and `.spin` |
| `threejs-test-ssr.mjs` | per-route SSR facts dump for Phase 5G, diffable against the pre-edit baseline |

## Limits — read before quoting results

- jsdom has **no layout engine, no CSS cascade and no compositing**. Geometry is
  stubbed from the requested viewport, so no claim is made about rendered
  pixels, font metrics, the conic cover actually painting, or CSS 3D feel.
- Canvas is unimplemented, so Polka Dots and Heart cannot mount here; their
  checks assert DOM shape only. The Paste-Up harness supplies recording
  contexts, so its GL commands are compared — but recorded, never rasterised.
- Audio is stubbed. The click-pool checks verify the requested path
  (`/lab/dial-tick.mp3`), `preload`, pool size and that a failing `play()`
  raises nothing — not real playback.
- The Phase 5G WebGL context is a **stub**: constants are synthetic ids,
  `getParameter` returns fixed plausible values and draw/upload calls are
  recorded. It is enough to make `three` build a real renderer, PMREM chain,
  materials and geometries and to compare that work between two engines, but
  nothing is rasterised. Matcap appearance, shading, point density and the
  loaded `Lantern.glb`'s actual pixels are unverified here.
- No real browser is available in this sandbox (no Chromium system libraries and
  no root to install them), so touch input, real pointer capture, GPU rendering
  and visual fidelity remain unverified.
