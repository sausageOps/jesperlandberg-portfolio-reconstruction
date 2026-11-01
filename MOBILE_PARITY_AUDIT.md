# Mobile and cross-device parity audit — 2026-11-01

## Final status

Both reopened mobile issues were reproduced, diagnosed, changed, and retested:

1. **Mobile posts are finite in both coarse-touch and fine-pointer mobile contexts.** Each post stops at its own end, extra input does nothing, and no vertical input loads or wraps into another project.
2. **The mobile side gutters are temporally stable during repeated scrolling.** Full-region frame analysis now reports zero channel variation on both sides, including after horizontal Next navigation.

The accepted Close correction and all post content are preserved. This correction changed only `src/webgl/Experience.js`; no CSS, shader, overflow, color, panel-visibility, or automatic-loading workaround was used.

The follow-up cross-device refinement is also complete. It restored reliable repeated desktop dragging, independent CTA/control behavior, grab/grabbing states, larger-viewport sheet motion, DPR 2 rendering, the reference tag fill, and stable side-tile compositing. The mobile finite-scroll, flat-panel edge, and Close requirements remain passing; details are in the second half of this report.

## Scope and comparison notes

- Live comparator: `https://jesperlandberg.com/`; local viewport: **390×844**.
- All eight featured posts were included: Nathan Riley, Casa Di Solare, The Lookback, Book of Happiness, Dogelon Mars, Gil Huybrecht, Discoveryland, and Griflan.
- The original is already finite with a coarse pointer. In the special **390×844 fine-pointer** context, both original and pre-fix local used looping behavior. The local scroll correction therefore enforces the explicit **finite on every mobile viewport** requirement; it is not described as an original/local difference in that pointer mode.
- A direct-load diagnostic with a visible white panel showed that the original can also exhibit subpixel panel-edge motion from its bulge shader. In the captured original after-Next sequence, its white hero was clipped out, which made that sequence's gutters static. The local fix follows the explicit no-flicker requirement and does **not** copy that transition clipping/invisibility state.

## Exact root causes and corrections

### 1. Repeated / infinite mobile post content

**Root cause:** three project-scroll branches used `!this.finePointer` as the finite/mobile test:

- `layoutProject()` offset normalization;
- `syncProjectScroll()` finite positioning versus `rangeWrap()`;
- `pushScroll()` endpoint clamping.

Thus a narrow viewport with a fine pointer took the unbounded/wrapping path. The pre-fix local Lookback probe recorded `current=10143.59`, `target=11984.568`, `total=1539.781`, and `max=696.187`, with repeated media.

**Correction:** those three gates now use `!this.desktop`. Below the existing 650px breakpoint, target input is clamped to `0..projectOffset.max` and media use finite positions regardless of pointer type. No project-navigation call was added or changed. Tablet/desktop retain the unbounded branch.

### 2. Dark/light flashes at the side edges

**Root cause:** the landed mobile white hero surface received `baseBulge * 0.3`. Its perspective deformation moved the antialiased panel boundary into the black gutters during vertical scrolling. The related side surfaces themselves remained at their intended colors/alpha; the flashing columns were the hero boundary at `x=19` and `x=370`, not a DOM remount or panel opacity timer.

The earlier four-pixel sample missed this. Full-frame analysis of the pre-fix after-Next capture found, on each side, **644 pixels with temporal span >10** and **612 with span >40**, reaching RGB span **139**.

**Correction:** removed only the landed phone panel's background-bulge assignment in `updateProject()`. `setProjectSurfaceRest()` already leaves that background flat. Project media retain their mobile `baseBulge * 1.3` deformation, and horizontal scrub/close/surface transitions are unchanged. An experimental screen-space clip was rejected because double antialiasing left residual edge variation; it is not in the source.

### 3. Close behavior

The accepted mobile Close recreation after media registration was not changed. Post-fix after-Next tests still reach the actual bottom and return to `/` when Close is tapped, in development and production.

## Browser verification

| Test | Result |
|---|---|
| Coarse-touch all-post finite suite, development | **8/8 passed** bottom, extra-input stability, top return, and Close. Bottom gaps **79.976–79.985px**; zero runtime/console/failed-response errors. Evidence: `mobile-finite-parity/local-post-fix.json`. |
| Fine-pointer 390×844 finite probe, development and production | Lookback clamped to `target=max=696.1875`; repeated bottom wheels were stable within 0.15px, top return was stable, no repeats occurred, and Close returned `/`. Evidence: `mobile-fine-finite-post-fix-{development,production}.json`. |
| Direct Book continuous edge diagnosis | Pre-fix local: **131 frames**, side span **139**, 644 pixels >10 per side. Post-fix local: **129 frames**, left/right full-region temporal span **0**, with hero bulge **0** and media motion retained. Evidence: `mobile-direct-edge-diagnosis/`. |
| After-Next Lookback → Book sequence, development | **154 post-fix frames**; both full side regions had temporal span **0**. Bottom gap **79.98059px**, extra input stable, reverse/repeated scrolling passed, bottom Close returned `/`, zero errors. |
| Same after-Next sequence, production | **151 frames**; both full side regions had temporal span **0**; bottom Close returned `/`; zero errors/failed responses. Evidence: `mobile-edge-close-regression-production/`. |
| Production finite repeat | Lookback and Book both passed bottom, extra input, top, and Close; gaps **79.98248px** and **79.98059px**. |
| Tablet 650×844 and desktop 1280×900 regression | `desktop=true` at both widths. Unbounded targets remained **6000 → 12000 → 18000**, above their finite maxima **230.34375** and **1216.671875**; Close returned `/`, with zero errors. This confirms the mobile gate did not remove larger-screen looping. |
| General regression | Development **19/19 passed**, with no console errors or failed responses. |
| Build | `npm run build` passed: **47 modules** transformed. Targeted production checks above used the resulting preview. |

Evidence roots are under `/tmp/jl-site/`; the corresponding runnable probes are under `/tmp/jl-inspect/`.

## Changed source files in this correction

1. **`src/webgl/Experience.js`**
   - `layoutProject()` — mobile finite normalization now keyed to `!this.desktop`.
   - `syncProjectScroll()` — mobile always uses finite media positions/progress.
   - `pushScroll()` — mobile always clamps to the actual post endpoint.
   - `updateProject()` — removed the landed phone background-only bulge; media and transition motion remain.

Previously accepted changes remain intact: mobile Close recreation in `Experience.js` and mobile related-sheet hit extensions in `src/styles.css`. They were not modified for this correction.

## Remaining notes

- No unresolved issue remains for the two requested mobile corrections in the recorded development/production tests.
- The previously documented media tonal/lens-shading approximation remains a separate rendering limitation, not part of these interaction fixes.
- All 18 supplied references remain usable; no additional reference is required for this correction.

---

## Cross-device interaction and rendering refinement

### Comparison checklist

The live original and local build were inspected at **390×844**, **768×1024**, and **1440×900** before implementation. The checklist covered: resting/held cursors; pointer-down targets and control exclusion; horizontal axis lock, resistance, commit direction, release, and repeated navigation; vertical touch scrolling; landed-sheet and media deformation; title, pill, CTA, Close, and progress geometry; DPR 1/2 rendering; side-tile alpha, visibility, and resting pixels; and the existing mobile finite/Close regressions.

Interaction timing probes used DPR 1 for reliable SwiftShader execution. Separate DPR 2 crops were used for text/control quality. Fixed-time readings that arrived before a new animation frame were discarded; release checks wait for the actual scrub value and landed state.

### Confirmed root causes and corrections

#### 1. Repeated desktop drag was cancelled by native drag-and-drop

**Root cause:** the local cursor port omitted the original's `user-select: none` rule while `html.grabbing` is active. A first local drag could leave a native selection (the trace contained one newline). On the next drag, the browser emitted `dragstart` followed by `pointercancel`, so the project never received the later moves needed to commit.

The matched trace established that the target was the noninteractive `.media-track`, no CTA/control ancestor was involved, images were already `draggable=false`, neither implementation used pointer capture, and no lost-capture event occurred. The original produced no selection, no `dragstart`, and completed the same second drag.

**Correction:** `src/styles.css` now applies the original prefixed `user-select: none !important` behavior to the root and descendants only while grabbing. No pointer-capture or blanket `dragstart` workaround was added. The final matched local trace has empty selection, zero native dragstarts, zero pointer cancels, and reaches Book of Happiness.

#### 2. Cursor and CTA/control boundaries

**Root cause:** local `grabbable` was activated only on home, and CSS supplied grab cursors only for home cards. Project pointer-down also lacked an interactive-target exclusion. On touch, a horizontal gesture beginning on the CTA could navigate the project. The original also allows that CTA-started navigation; excluding it here is an explicit requested boundary, not a claim of universal original/local parity.

**Correction:** `Experience.js` activates `grabbable` for project routes and rejects pointer-down from anchors, buttons, form controls, media controls, `[role="button"]`, and `[data-no-drag]`, while clearing stale click suppression/grabbing state. `styles.css` adds scoped WebGL grab/grabbing rules and preserves pointer cursors on controls at rest. Existing drag-axis click suppression remains intact.

#### 3. Larger-viewport project motion

**Root cause:** the original applies **30% of the scroll-driven media bulge** to the landed project sheet on larger viewports. The local implementation had no corresponding landed desktop/tablet sheet assignment, making vertical project motion more rigid.

**Correction:** `updateProject()` applies `baseBulge * 0.3` to a landed, non-flying, non-scrubbing hero only when `this.desktop` is true. The phone hero remains flat, and mobile media retain their existing deformation.

Source and runtime comparisons found no relevant `back` or `elastic` ease in the original project path. Its horizontal resistance, 10px axis lock, 0.6s `expo.out` release, and one-second monotonic flight curve were already matched locally. No spring overshoot was added.

#### 4. Text, icons, and tag fill

**Root causes:** the local renderer capped DPR at **1.75**, while the original uses **2**, causing downsample/upscale softness on DPR 2 devices. Separately, setting the tag's `#eeeeee` uniform through hex color conversion produced RGB **218** instead of the original **238** in the pass-through shader.

**Correction:** restored the DPR cap to 2 and assign the tag fill with raw CSS channels using `setRGB(238 / 255, ...)`. Font files, title sizing, glyph geometry, icon paths, spacing, and stroke widths were not changed. The global output color-space setting was not changed.

#### 5. Desktop side-tile darkening during postprocessing

**Root cause:** the local renderer cleared to transparent black. When the cursor/post pass rendered the scene into its target, a side tile's 0.3 alpha was applied into that target and then applied again when the target was composited. This changed the settled side gray from **76 to 23** after mouse navigation even though mesh visibility, position, and `u_alpha=0.3` remained correct. The original clears with alpha 1.

**Correction:** initial and trail-reset clear colors now use alpha 1 in `Experience.js`. A trial render-target color-space change did not fix the result and was reverted. Side-tile geometry, lifecycle, and motion were not changed. Final desktop captures render the tiles at **77** (rounding-level difference from the original 76), with zero changed pixels between synchronized resting frames.

### Source files changed for the cross-device refinement

1. **`src/webgl/Experience.js`**
   - DPR cap restored to 2.
   - Project routes activate `grabbable`.
   - Interactive controls are excluded from project drag initiation.
   - Landed desktop/tablet hero receives the original 30% scroll bulge; phone remains flat.
   - Tag fill uses raw #eeeeee channels.
   - Initial and trail-reset clear alpha are both 1.
2. **`src/styles.css`**
   - Scoped WebGL grab/grabbing and control-pointer states.
   - Original grabbing-time user-select suppression, preventing native selection drag-and-drop.

`src/components/Project.jsx` and `src/webgl/shaders.js` were not changed. No assets, fonts, icon paths, project thresholds, or release/flight eases were replaced.

### Cross-device browser verification

| Test | Final result |
|---|---|
| Matched original/local native-drag diagnostic, 1440×900 | Original: no selection/dragstart/cancel and Next succeeded. Pre-fix local reproduced selection → `dragstart` → `pointercancel`. Final local: empty selection, zero dragstarts/cancels, Next succeeded. Evidence: `native-drag-comparison/`. |
| Repeated desktop navigation | **3 complete Lookback → Book → Lookback cycles**, each with a below-threshold drag before the committed drag. Zero selections, native dragstarts, and pointer cancels across all six navigations. Evidence: `desktop-drag-regression.json`. |
| CTA independence | CTA click count **1** with scrub 0 and no navigation; a surface drag ending over the CTA left the count at **1**; a second CTA click produced **2**. Close returned `/`. Mobile/tablet CTA-started horizontal gestures no longer change project. |
| Computed cursor states, all three viewports | Held: root classes `webgl grabbable grabbing`, project cursor `grabbing`. Released: project `grab`, CTA and Close `pointer`. Evidence: `cursor-state-check.json`. |
| Mobile/tablet/desktop scrub and vertical input | Below-threshold gestures returned to scrub **0** and restored landed surfaces; committed left gestures reached Book; vertical touch scrolling remained functional. Desktop/tablet hero bulge measured exactly **0.3 × base bulge**; mobile hero remained 0. |
| DPR 2 title/control crops | Renderer DPR is now 2 in both implementations. Title identical-pixel coverage reached **95.15% mobile** and **93.23% desktop**. Desktop CTA/Close/hover mean channel differences were approximately **0.03–0.062**; mobile CTA difference **0.043**. Evidence: `high-dpr-text-crops/`. |
| Side-tile resting stability | Synchronized after-Next and after-release captures at all three viewports: **0 changed pixels** in both central side regions. Both related meshes remained visible, landed, and at alpha 0.3. Evidence: `side-tile-synchronized-rest/pixel-summary.json`. |
| Final mobile finite suite, coarse touch | **8/8 posts passed** actual bottom, extra-input stability, top return, media count, and Close. Bottom gaps **79.976–79.985px**; no runtime or failed-response errors. Evidence: `mobile-finite-parity/local.json`. |
| Narrow fine-pointer regression | 390×844 Lookback clamped at `target=max=696.1875`, repeated bottom input stable, no repeats, top stable, Close `/`. |
| Larger-screen scroll branch | 650px and 1280px retained unbounded targets **6000 → 12000 → 18000**. Final sampled current values were within **0.24px** of target and hero bulge was near zero; Close `/`. The older `noMobileHeroChange` flag is expected to be false after the intentional larger-screen bulge restoration. |
| General development regression | **19/19 passed**, zero console errors and zero failed responses. |
| Production interaction smoke | Desktop and mobile forward/back drag plus Close passed; returned to eight-card home, no debug hook, no errors. Evidence: `production-motion-smoke.json`. |
| Production routes/content and build | **12/12 production checks passed**, zero errors/failed responses. `npm run build` passed with **47 modules**. |

### Remaining limitations / work

- No requested interaction or side-tile work remains open in the tested scope.
- The local canvas-raster title backend is not pixel-identical to the original analytic glyph renderer. After the DPR correction, local title ink coverage is about **1.6–2.4% lower**, with subpixel edge differences. Font weight, size, spacing, and gamma were not speculatively changed.
- Sparse software-rendered screencasts can lag runtime state and duplicate frames; they were used only to inspect broad travel, not exact frame timing or resting stability claims.
- The original can omit its right direct-load side tile until navigation; the local build intentionally keeps both local tiles present and does not copy that anomaly.
- CTA-started drag exclusion and the flat phone hero are deliberate requirement-driven differences from the original. No exact universal-parity claim is made.
