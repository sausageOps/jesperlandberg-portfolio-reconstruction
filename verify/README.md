# Verification harnesses (not shipped)

Scratch tooling used to verify the Carter Lab ports (Phase 5E Dial, Phase 5F
Paste-Up). It is **not** part of the app: no
`src/` module imports it and Vite never bundles it. `jsdom` is installed ad hoc
for this directory only and is deliberately **not** added to `package.json`.

```bash
npm i --no-audit --no-fund jsdom@25   # verification only; revert manifests after
CARTER_REF=/tmp/carter node verify/dial-verify.mjs
CARTER_REF=/tmp/carter node verify/paste-up-verify.mjs
CARTER_REF=/tmp/carter node verify/paste-up-css.mjs
CARTER_REF=/tmp/carter node verify/paste-up-ssr.mjs > /tmp/after.json
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
other five experiments staying placeholder-only, the other ported engines
mounting only their own DOM, and full teardown on unmount.

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
- No real browser is available in this sandbox (no Chromium system libraries and
  no root to install them), so touch input, real pointer capture, GPU rendering
  and visual fidelity remain unverified.
