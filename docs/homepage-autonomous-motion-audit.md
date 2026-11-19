# Homepage autonomous motion audit

**The field moves by itself; the 27 panels do not wander independently.** With normal motion enabled, a fresh, untouched Homepage slowly pans in two dimensions. The packed centres, orientations and spacing stay fixed in world coordinates. There is also a one-time scale/fade on every frame, moving footage in eight frames, and animated grain *behind* the frames. These are separate effects.

## What moves

Panel numbers follow the [complete panel inventory](homepage-panel-inventory.md) (one world, not repeated copies). Function names below refer to `src/reframe/engine.js` unless otherwise noted.

| Motion type | Present? | Affected panels | Source/function |
|---|---|---|---|
| A. Independent translation, vertical bob, rotation, tilt or noise-driven wandering | No | None | `pack()` places each spec; `build()` sets `cx,cy` once. `makeMesh()` has no animated rotation or local position. |
| A. Entrance scale and opacity | Once per mount | All 27, staggered by distance from hero | `ReframeHome` → `startEntrance` / `runEntrance` → `build()`'s `reveal` tween: `uReveal` 0→1 in 0.9 s after `0.15 + distance/2600` s. Vertex shader scales about the centre from 92% to 100%; fragment shader fades alpha. No change of centre. |
| B. Muted looping footage | Yes, while eligible and playback allowed | SmilePP **2,14,22**; Ruby Law **4,6,10**; YWPS PTA **3,23** | `init()` creates three shared VideoTextures; `onPlaying` swaps posters for frames on video users only. `tick()` checks playback every tenth frame. |
| B. Static project photos | No internal idle motion | Posters **8,9,25** | `posterUnit` / `build()`: still JPEGs, not registered as video users. |
| B. Aperture assembly and text wipe | Once, then normally still at idle | Hero **1**, also the HUD brand artwork | `introTimeline`, `computePose`, `applyHud`, `updateLogo`, `heroFrame`, `drawHeroLogo`: pieces translate/turn into place; wordmark and HK wipe in. The tile itself does not turn. Speed-driven iris has a 0.08 screens/s dead zone. |
| B. Clock | Yes, discrete text replacement | **19** | `tick()` checks HKT every tenth frame; `clockTile()` redraws when the minute changes. Separate HUD `updateClock()` displays seconds (250 ms poll). |
| B. Other painted artwork | No self-animation | Intro **7**; headings **11,20**; services **12,13,16,17**; contact/email **21,26**; fillers **5,15,18,24,27** | `canvasTile` / `DRAW`: static artwork, including the filler logo, highlighted service name and compass arrows. Contact/email can be highlighted by aim or hover, below. |
| C. Grain | Yes, indefinitely by default | Field surface in gaps, not a texture on any panel | `src/reframe/reframe.css` `.page::after` uses `a24-about-grain` from `src/styles.css`: repeating bitmap, stepped transform, 0.6 s loop beneath transparent WebGL canvas. Vignette is stationary. |
| D. Navigation and interaction | Yes, input-triggered | Field globally; targeted tiles, iris, labels and sheets locally | Drag/pointer handlers, `pointerVel`, `endDrag`, wheel/arrow handlers, `fly`/`flyTo`, `pulseIris`, `updateHover`, `setHover`, `openSheet`/`closeSheet`, `revealSheetContent`, `copyEmail`. Release inertia and flight tweens can continue after input stops; neither explains fresh-load drift. |
| E. Autonomous pan and speed response | Yes, ongoing | All 27 and every wrapped copy | `tick()` integrates logical `cam`; assigns `uOffset` for each copy. Filtered speed drives shared view zoom, barrel bend and directional RGB split. Slight apparent edge deformation is not independent panel tilt. |

## Hands-off live check

Tested the existing `/` on port 5173 in a fresh headless Chromium page, 960 × 600 CSS px, WebGL active, default motion preference, no pointer, wheel or keyboard input. Using the browser debugger's heap query, identified the nearest 876 × 600 hero mesh and read **the same object** at each sample. No app instrumentation or pixel matching. Zero is the first available mesh sample (~2.95 s after navigation); before build there is no mesh to measure. `uOffset` is centre relative to the logical camera, in world px **before** projection, not CSS pixels.

| Elapsed (s) | Hero `uOffset.x` | Hero `uOffset.y` | Packed centre (x,y) | Mesh rotation Z | Reveal |
|---:|---:|---:|---|---:|---:|
| 0 | −1.04 | −0.62 | 438, 300 | 0 | 0 |
| 5 | −7.41 | −4.47 | 438, 300 | 0 | 0 |
| 10 | −7.80 | −4.72 | 438, 300 | 0 | 0 |
| 20 | −12.36 | −7.58 | 438, 300 | 0 | 1 |
| 30 | −17.86 | −11.15 | 438, 300 | 0 | 1 |

Offsets, rotation and reveal were read live; packed centre is from layout. The hero shifted **16.82 px left and 10.53 px up** relative to the camera, without rotating. Drift was already running behind the entrance. This is one software-rendered run, not a universal speed estimate: engine time is capped at 50 ms per tick. The other 26 panels were audited through the shared placement equation, not individually sampled: `offset = packedCentre − cam + (kx·W, ky·H)`. For fixed copies, subtracting two offsets cancels the entire camera term. Grain and changing video pixels cannot affect this measurement.

## Why it continues

`start()` registers `tick` on the vendored GSAP ticker (animation-frame scheduling); there is no separate RAF animator per panel. `lastInput = -1e9` means the 1.8 s idle condition is already satisfied at first build. After actual input the delay applies. Each unheld idle frame damps velocity by `0.925^(60·dt)`, then blends it toward `(22·cos(0.05·now), 15.4·sin(0.037·now + 1))` with weight `1 − 0.985^(60·dt)`. These are target velocities, **not** panel amplitudes or actual steady speeds. `cam += vel·dt`; screen motion is in the opposite direction. The velocity low-pass (0.12 s) feeds the shared shader effects. This is deterministic, intentional camera drift, not random noise or an unstable layout. Wrapped copies are culled/reused around the viewport; the world is not being repacked.

Other automatic visuals outside the field: `Preloader.jsx` animates its loading list, progress and exit before releasing the entrance; `useA24NavMotion` sequences the navigation dock's initial reveal. Neither moves tiles. The engine's HUD hint dot runs four 0.8 s GSAP legs on repeat. `animateEq()` settles the bars when sound is off and loops randomized heights when enabled (including a saved preference). HUD coordinates update from the camera every tenth frame. Audio noise/LFOs do not feed geometry. Nav scroll-measurement RAFs are not a camera loop.

## Boundaries and surprises

- `visibilitychange` stops the field ticker callback and pauses clips when hidden. Opening a sheet suppresses field video playback, **not** idle camera integration behind it. Video eligibility uses the padded mesh keep-alive region, not exact viewport intersection. A project sheet can show its own video after user activation.
- A stationary pointer is not required for every highlight: `updateAim()` can light contact/email as drift carries a link under the crosshair on fine-pointer devices. A previously parked pointer can also acquire a different tile. The shader eases the highlight, not the panel position. Media have a zoom uniform, but `updateHover()` excludes project tiles via `labelled`; selecting Work can pulse the selected project's videos.
- Reduced motion at mount disables idle drift, reveal/assembly and creation of field videos; clocks still update. CSS stops grain and GSAP matchMedia stops decorative HUD loops. **Preference-change caveat:** the engine captures `reducedMotion` once in `init()`, so switching the OS preference while mounted need not stop drift or video until remount, unlike the live CSS/HUD rules. Without WebGL the fallback is a scrollable index, not a drifting field.
- No evidence of accidental independent movement, creeping spacing, or a rotation bug. The notable surprises are global drift before reveal and behind sheets, and the different response to a live motion-preference change. No animations, rendering settings or interactions were changed.
