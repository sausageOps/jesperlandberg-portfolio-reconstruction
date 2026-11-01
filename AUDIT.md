# Completion and restoration audit

**Date:** 2026-10-31  
**Reference:** <https://jesperlandberg.com/>  
**Result:** Geometry, assets, responsive layout, and source-backed project motion re-audit complete. The existing React/Three.js architecture and WebGL experience were preserved; remaining rendering approximations are listed below.

## Source and asset findings

- Compared the attached manifest, README, `projects.json`, and media URL catalogue with the implementation and fresh live pages.
- Verified all **23 projects**, the eight-featured ordering, project fields, external links, featured media relationships, and source dimensions. No catalogue recovery or replacement was necessary.
- Validated **51 image references covering 43 unique local images**: no missing/corrupt files or source aspect-ratio mismatches.
- Confirmed the local Diatype font, award GLB, and llama GLB against the manifest by size and SHA-256. All 47 existing public assets, including the favicon, were retained.
- Captured scripts, styles, models, and payloads remain in use as references. No dependencies were added.

## Corrections recovered

1. **Full Index**
   - Restored the original flex wrapping geometry: `2.4rem` horizontal gaps, `0.6rem` row gaps, `2rem` inline padding, and source letter spacing.
   - Moved separators between entries rather than including them in link width.
   - Restored separator centering and line-end visibility behavior, including updates after font loading and resizing.

2. **Project sheets**
   - Restored the desktop description’s `40rem` measure.
   - Restored `2.8rem` project pills, source padding/color, and single-row desktop/tablet metadata.
   - Restored mobile’s `3rem` media gap. The final source-matched column is a `70rem` stack with `4rem` block padding and no inline track padding; normal-flow layout and the WebGL renderer are retained.

3. **Newsletter**
   - Restored the source form widths, rounded black field, separate circular submit button, responsive heights, input padding, and placeholder treatment.
   - Recreated the focused animated chromatic rim in CSS and restored the inline status line so empty and populated states retain the reference geometry.
   - Preserved validation, busy state, Escape handling, and the honest local-only submission message.

## Changed files

- `src/components/FullIndex.jsx` — separator structure, entrance transforms, and row-aware visibility.
- `src/components/Overlays.jsx` — source-shaped inline Newsletter status content.
- `src/styles.css` — Full Index, project description/pills/mobile media, and Newsletter geometry/styling.
- `RECONSTRUCTION.md` — updated implementation and verification notes.
- `AUDIT.md` — this report.

## Reference comparison

Fresh original/local comparisons were made at **1440×900**, **768×1024**, and **390×844**.

Verified matching geometry includes:

- Desktop Full Index: 23 entries, six lines, Lookback link at `(321.25, 314.6875, 174.734375, 40.3125)`, and no visible separators at line ends.
- Desktop Lookback: sheet `(48, 19.1875, 1344, 861.625)`, description width `384`, metadata `(400.28125 × 26.875)`, first media at `(604.8125, 57.578125)`, and second media at `y=502.234375`.
- Tablet Lookback: single-row metadata at `204.703125 × 14.328125` and matching Index wrapping.
- Mobile Nathan Riley: first four media starts at `y=275.78125`, `494.625`, `690.8125`, and `886.90625`.
- Newsletter: desktop form `307.1875 × 43.1875`; mobile form `260 × 40`; full-height rounded input and matching responsive placement.

The original may repeat project media to fill its virtual scroll track on hover-capable narrow viewports. Those repeated nodes are runtime scroll duplication, not missing source assets. Original touch projects use finite, damped virtual scrolling; the reconstruction now matches that behavior, while the forced no-WebGL fallback retains native scrolling.

## Motion and gesture re-audit — 2026-10-31

- Recovered and tested the original scroll model: `0.1 × min(frameRatio, 2)` damping, 0.01px rounding, desktop infinite wrapping, and coarse-pointer finite project scrolling. At 390×844, original and local Casa Di Solare both measured a 934px project scroll height and an approximately 120px finite endpoint.
- Verified mobile homepage geometry against the live original: the first three settled card tops agree within approximately 0.02px. Its carousel remains infinite; only the project is finite on coarse pointers.
- Recovered horizontal project navigation: 10px axis-intent threshold, `0.8 × viewportWidth` normalization, `0.4v / (1 + 0.8|v|)` scrub, and commit beyond `|v| > 0.25`. In matching live tests, both sites committed at 300px leftward mouse displacement at 1440px wide and 80px leftward touch displacement at 390px wide.
- Fixed native image-drag interruption with non-draggable project media and scoped WebGL project `touch-action: none`; the no-WebGL route keeps `touch-action: auto` and native scrolling.
- Corrected scrub direction and kept copy/media stationary while the sheet moves and furniture fades. Short-drag release restores the exact baseline rectangle and clears inline geometry and `grabbing` state on desktop and mobile.
- Original/local behavior matrices passed for short release, forward and reverse commit, vertical scrolling without navigation, Control/Alt/Shift/Meta guards, repeat suppression, and valid arrow navigation, with zero captured page or console errors. Reports: `/tmp/jl-site/original-gesture-behavior.json`, `/tmp/jl-site/local-gesture-behavior.json`, `/tmp/jl-site/original-mobile-scroll.json`, and `/tmp/jl-site/scroll-regression.json`.
- Forced no-WebGL native touch scrolling reached the expected 120px endpoint after the loader unmounted. `npm run build` passed after these changes.

## Full Index interaction audit — 2026-10-31

- Removed the remaining duplicate repel application while preserving the original pre-visibility field pass and far-pointer settling.
- Recovered covered-text dimming from the original `u_dim` behavior: inactive links damp toward `0.1` at rate `10`, the hovered link returns toward `1`, and the effect is confined to the preview’s current rounded/projected mask. Preview imagery remains full value.
- Verified the original preview panel at 1440×900: `h-200` computes to 192px and `rounded-20` to 19.2px. Local reveal clipping reaches the same 19.2px radius, so no radius change was needed.
- Removed the synthetic initial center pointer. The original keeps `mouse = null` until input; local now likewise starts with a hidden preview, zero repel transforms, and no masks.
- Completed original/local desktop sequences at 1440×900: initial rest → Lookback hover → Casa hover → far-pointer exit. Correct assets, crossfades, covered-link masks, 23-link repel, preview hiding, transform cleanup, and mask cleanup passed with zero errors. Captures: `/tmp/jl-site/full-final-{original,local}-{lookback,casa,rest}.png`.
- Responsive checks passed at 390×844 and 768×1024. Mobile first/Primland geometry exactly matches the original, no desktop preview behavior leaks into touch, and Casa lands at `x=20, y=15, width=350, height=814`. Tablet’s initial Lookback rectangle now exactly matches `x=166.953125, y=439.84375`; hover enables the preview only after input.
- `npm run build` passed. The development regression audit passed **19/19** with zero page errors, console errors, or failed responses. The probe’s obsolete `.is-visible` selector was updated to the current inline-visibility implementation.
- Remaining renderer distinction: the original repels individual text glyphs in WebGL, while local DOM links translate as units; settled layout and interaction behavior are otherwise preserved.

## Profile / Credits and Newsletter overlay audit — 2026-10-31

- Matched settled Profile geometry against the live original at 1440×900 and 390×844. Final local intro, credits, links, and content rectangles agree with the original measurements; `/tmp/jl-inspect/profile-settled-final.cjs` waits for the entrance endpoint rather than a fixed delay.
- Replaced square-corner dismissal with the original circular radius test. Non-link clicks inside the disc stay open; outside/corner clicks close on desktop and touch. On mobile, an outside tap that lands on a project card also activates that card, matching the original event flow. Escape also closes.
- Removed the local overlay gates from shared wheel/touch scrolling. Long-settle tests confirm that the homepage continues beneath Profile in both desktop and mobile modes, while project grabbing remains guarded.
- Corrected Profile-link hover to a 0.3s fade to 0.6 opacity and verified both hover and restored endpoints. Instagram opens externally without closing the overlay; Email writes `jesper@alpacka.studio` without closing it.
- Recovered the Copied sequence: 0.5s scale entrance, 1s hold, and 0.5s scale exit. An in-page MutationObserver measured 999.9ms before exit and 500ms before removal.
- Recovered the three-segment 0.85s/0.65s lens-flight curve, 0.22s outgoing-content fade, and 0.35s Profile↔Newsletter switch delay. Both switch directions, focus, settled layout, and close behavior passed without console errors.
- Corrected llama materials to the original front-side, depth-tested/depth-written state; settled desktop/mobile captures completed without errors.
- Added original `data-gl-shield` cursor attenuation to Profile, Newsletter, and Full Index: 60-frame region scanning, 0.03×viewport-width range, 0.03 minimum strength, and 10/s damping.
- The DOM entrance remains an approximation of the original’s per-line WebGL mask/twist renderer; static typography and layout are matched.

## Earlier final verification baseline (predates the motion re-audit)

- **Development audit: 19/19 checks passed.** Covered settled desktop dragging, Full Index hover/navigation/separators, project entrance geometry, Newsletter validation/status/Escape, browser Back/Forward, tablet metadata, mobile media flow, native scrolling, fixed close control, and responsive Newsletter layout.
- **Production audit: 12/12 checks passed.** Covered direct loads of all eight project routes with expected media and loaded images, plus `/`, `/full`, and `/newsletter`.
- Earlier responsive/interaction checks also passed for related-project navigation, arrow keys, selection restoration, touch dragging, 320px containment, and reduced motion.
- Forced no-WebGL production fallback passed: local images remained visible, native project scrolling worked, the mobile close control stayed fixed, and closing restored eight home cards.
- `npm run build` completed successfully after the corrections.
- Final development and production runs reported **zero page errors, console errors, or HTTP responses ≥400**. Mux streaming was stubbed in automated tests; local poster/media images were actually loaded and checked.

Final audits use state-based waits because software WebGL can make fixed-sleep transition assertions unreliable.

## Remaining limitations

- Mux video playback still depends on the external Mux service; downloaded local posters remain available.
- Newsletter submission is intentionally local-only and does not transmit or store addresses.
- WebGL deformation, lens shading, llama lighting, and media tonal rendering reproduce the observed experience but are not pixel-identical to the original private runtime. The Newsletter rim uses CSS rather than the original SDF shader.
- The no-WebGL fallback intentionally omits infinite shader deformation and lens effects while preserving readable content and navigation.

## Homepage hover and surface audit — 2026-10-31

- Compared settled original/local Casa Di Solare rest and hover captures at 1440×900 with aligned card geometry and zero page errors. The source animates the card dent and the round arrow's leaving/arriving mark only; it does not animate the strip arrow's pill-fill uniform.
- Removed the extra local `arrowHover` / `u_pillA` animation, retained the original 0.75s/1.0s mark swap and 0.5s card dent, and gated hover behavior to fine pointers as in the original. Settled enlarged arrow crops now retain the same black disc and right-arrow mark in both rest and hover states.
- Matched material sidedness to the recovered renderer: cards and project media use Three's default `FrontSide`; text and arrow/pill surfaces remain `DoubleSide`.
- `npm run build` passed. The development regression audit again passed **19/19** with zero page errors, console errors, or failed responses. The project screencast also completed open → media scroll → next → previous → close → Back → Forward with **43 frames and zero errors**, ending on the homepage after the final Forward navigation.

## Final project-motion and responsive acceptance — 2026-10-31

### Source choreography checked

- Recovered the shared project-surface registry, `grow()`/`fly()` handoff, live DOM rectangle sampling, `grab()`/`scrubTo()`/`release()`, and the original three-segment flight easing. The source flight is 1s; release is 0.6s with `expo.out`; horizontal scrub uses the source normalization and commit threshold.
- Rest order is `1`; flight orders are `1.5`/`2`; hero/side scrub orders are `1`/`2`; project media and Close use content order `3`. No all-surface order `5` or scrub-pose order `5` remains, so media does not wash out during a drag.
- Previous navigation was corrected at the registry handoff (`previous` direction → `prev` surface key). Both directions now settle on the correct project with the incoming hero at its exact target rect, `landed: true`, and `flying: false`.

### Close flight and Close control

- Fixed a genuine close-flight defect exposed by continuous capture: the home target used `left/top` while `rectToPose()` only read `x/y`, yielding `NaN` hero coordinates and black frames. Rect normalization now accepts both conventions, and Close calls `beginHomeReturn()` so the home scene is visible throughout the return flight.
- The return intro now also runs while `returningHome` is true, restoring the neighboring home cards and desktop floor during Close rather than leaving an empty black scene.
- Close is a WebGL SDF pill with the original two-diagonal, independently staggered stroke swap—not a glyph or generic rotation. Source timings are preserved: hover/hover-out `0.7s`/`0.5s`, mark-out/mark-in `0.75s`/`1s`, with expo easing. Original/local rest, hover, and leave crops match at desktop; the control remains a rest-state disc on touch.
- Desktop Close target is `43.1875px`; original and local mobile Close geometry is exactly `(315, 774, 40, 40)` at 390×844. Close registration occurs after project media, preventing same-order media from painting over the mobile disc.
- Evidence: `/tmp/jl-site/close-hover-paired.jpg`, `/tmp/jl-site/local-mobile-close.png`, `/tmp/jl-site/motion-final3/`, and `/tmp/jl-site/layering-final2/`.

### Responsive and continuous regression evidence

- State-based original/local sequences were run at **1440×900**, **768×1024**, and **390×844**. The final local `layering-final2` runs completed with zero errors in all three modes. Opened, short-max, short-release, returned, next, previous, and closed states passed; short release returns scrub to `0`, next lands on `/projects/the-lookback`, previous returns to Casa, and Close returns `/` with eight home cards.
- Latest continuous `motion-final3` screencasts completed with zero runtime errors: **42 desktop frames, 98 tablet frames, and 118 mobile frames**. Ordered all-frame contacts were reviewed for open, Close/reopen, short release, next, and previous; the former all-black/HUD-only Close frames are gone and the flying hero remains visible against the home scene.
- The final production smoke also passed desktop and mobile next → previous → Close, with eight restored home cards, no debug global, and zero page/console errors. Report: `/tmp/jl-site/production-motion-smoke.json`.
- No control labeled **Reload** was present in the live original DOM, captured route markup, or recovered source. No Reload behavior was invented or changed; the identified original Close control was audited instead.

### Final build and regression status

- Removed the temporary `window.__jlExperience` debug hook.
- Final development audit: **19/19 passed**. Final production audit: **12/12 passed**, covering all eight direct project routes plus home, Full Index, and Newsletter. Both reported zero page errors, console errors, and failed responses.
- Final `npm run build` passed after the last source edits. Production preview was tested on port `4173`; development preview remains on port `5173`.


## Focused The Lookback acceptance — 2026-10-31

### Related sheets, title, and controls

- Related-sheet geometry was checked against the original at 1440×900, 768×1024, and 390×844. Desktop main/related rectangles are `48,19.1875,1344×861.625` and `1248×708`; previous/next offsets are `-1224` and `1416`. Tablet related size is `665.625×921.625` with offsets `-652.8375`/`755.2125`; mobile is `190×644` with offsets `-180`/`380`.
- Desktop related-edge rendering follows the original rest/hover transition `(76,76,76) → (255,255,255)` without changing its DOM opacity. Fine-pointer hover and touch rest behavior were kept distinct.
- Project titles are rasterized at 2× and rendered by the pointer-trail WebGL surface. Deterministic continuous-pointer captures verified active distortion, rest return, exact H1 geometry, and no runtime errors. No generic click, release, or scroll-velocity wave was added.
- Studio/CTA pills now use the source pointer-centered lens (`0.33` amplitude), expanding black disc, and white/chromatic label treatment. CTA enter/exit remains `0.7s`/`0.5s`; mark exit/enter remains `0.75s`/`1s`. Static pills do not respond to pointer input.
- The circular project link uses the original hollow-ring and diagonal-arrow swap. Close retains its two-stroke animation. Rest and Studio-hover crops agree closely with the original; resting Studio ink bounds differ by about 1px.
- Corrected the media wrapper to the original `70rem` column with no inner left padding, restoring tablet copy width to `225.328125px` while preserving media position and width.
- Progress now matches the original `2.5rem` size, 2px stroke, and 0.2-alpha track. At 768×1024 both original and local measure `12.796875px`; mobile hides it. Close, award, pill, sheet, and arrow geometry remain matched.

### Touch scrolling and boundaries

- Preserved the extracted scroll constants: damping `0.1`, 0.01px rounding, wheel `1.25`, touch movement `3.25`, release fling `35`, and clamped finite targets on coarse pointers.
- Restored the original pointer-dependent `8rem` bottom runout on touch tablets as well as phones; fine hover pointers use no runout.
- Ported the original offscreen parking rule: an item retains its last transform after passing 25% of panel height beyond its exit edge and resumes when it re-enters. This is the source behavior, not a separate copy clamp or easing curve.
- At 390×844, original/local bottom evidence agrees: last card `y=529.017517`, copy `y=-462.179993`, first-card parked transforms within 0.01px, and the same top return (`y=307.761261`, transform `-0.02`). Local final media travel is `696.1875px` with the expected 80px runout.
- At 768×1024 both retain a `40.96px` runout and settle at the same finite endpoint within approximately 1px. Bidirectional swipe probes stayed on the project route with zero errors.

### Final verification

- `controls-local-fixed.cjs`: rest, Studio hover, arrow hover/return, and Close hover completed with `errors: []`.
- `layering-sequence.cjs local focused-final`: desktop, tablet, and mobile open, short swipe/release, next, previous, Close, and home restoration completed with zero errors.
- `scroll-boundary-final.cjs`: source/local tablet and phone boundary evidence saved under `/tmp/jl-site/boundary-*`.
- Development audit: **19/19 passed**. Production audit: **12/12 passed**. Both reported zero page errors, console errors, and failed responses.
- Production motion smoke passed desktop and mobile next → previous → Close with eight restored home cards, no debug global, and zero errors.
- Final `npm run build` passed. No unresolved issue remains in the seven focused acceptance items.


## Mobile menu and featured scrolling acceptance — 2026-10-31

### Original behavior recovered

- The phone navigation uses Profile/Newsletter lenses plus Featured/Full; there is no separate hamburger drawer. The featured run remains vertical and infinite, with `3.25×` touch movement, `35×` final-touch fling, `0.1` damping, and 0.01px rounding. Horizontal intent does not scroll the vertical run.
- The original uses track-centered wrap offsets, per-card ranges, and a 25%-of-viewport parking margin. The local implementation already had matching visible motion and input constants, but used a centered wrap branch for offscreen cards and did not park them.
- Profile and Newsletter keep the featured run active beneath the lens. Opening remains 0.85s and closing 0.65s with the previously recovered three-segment flight; those timings were not replaced.
- Full → Featured remounts the phone run on the first project when no project is being returned from a flight. Newsletter close preserves the current run without a remount.
- Original mobile lens hit testing suppresses clicks inside the circular disc, while an outside click on an underlying card can activate that card and dismiss the lens.

### Phone-only corrections

- `src/webgl/Experience.js`: added the original mobile wrap range and parking state, converting the existing viewport-centered offset at the wrap boundary. Desktop/tablet carousel branches are unchanged.
- `src/webgl/Experience.js`: Full → Featured now centers Nathan Riley on mobile rather than restoring the previously nearest card. Project-flight return behavior is preserved.
- `src/components/Overlays.jsx`: mobile lenses now use the original capture/bubble click model and pointer-event pass-through. Inside-circle taps stay inert; outside-card taps naturally open the card. Desktop overlay event handling is unchanged.
- No CSS, content, typography, assets, desktop/tablet input, or unrelated animation values were changed.

### Verification

- Matched original/local touch sequences covered upward fling, reverse fling, horizontal intent, repeated Profile open/close, scrolling beneath Profile and Newsletter, inside taps, Full touch scrolling, Full → Featured, and Newsletter close.
- Across initial, post-fling, lens-scroll, navigation-return, and close states there were **zero parked-state mismatches**. Sampled card Y positions agreed within **0.43px**.
- A frame-based drag/release probe found no parked mismatches at any sample. Release samples agreed within **0.27px**; the initial drag transient converged from at most **4.38px** to **0.44px** by the fourth drag sample.
- Explicit original/local lens tests passed: inside `(195,422)` leaves Profile open; outside `(360,650)` on The Lookback opens `/projects/the-lookback`. Both development and production-preview runs reported zero errors.
- Full → Featured now matches the original Nathan-centered rectangles, while Newsletter close retains the scrolled run.
- Evidence: `/tmp/jl-site/mobile-menu-scroll/` and `/tmp/jl-inspect/mobile-{menu-scroll-compare,scroll-motion,lens-taps}.cjs`.
- Final development regression audit: **19/19 passed** with zero runtime, console, or failed-network responses. Final `npm run build` passed.

## Mobile project/list and deformation acceptance — 2026-11-01

### Evidence and scope

- Inspected all 18 supplied production/reference files before editing: route/runtime modules, the combined source reference, root HTML/CSS and catalogue data, project payload, glyph data, image, and both identical Basis transcoder captures. The application-module uploads hash-match the captured originals; loader/transcoder modules contain no mobile interaction rules.
- Compared the live original and local site at 390×844 for featured scrolling, project scrolling in both directions, release/settling, canceled and committed neighbor swipes, Full → Project → Close, menu/lens behavior, and document overflow.
- Recovered the original phone-only surface rules: home cards, titles, strip arrows, and mobile home-return flights bypass the desktop sheet wave; home/project media use `1.3×` scroll bulge; the landed white project sheet uses `0.3×`; related sheets retain no rest bulge.

### Phone-only corrections

- `src/webgl/Experience.js`: mobile home cards, titles, and arrows now receive a null sheet pose and the source `1.3×` bulge. Desktop/tablet poses remain on their existing branch.
- `src/webgl/Experience.js`: mobile project media now uses `1.3×` bulge, while the landed hero sheet independently receives `0.3×`; neighboring sheets remain unchanged. Scrub deformation continues to use the unscaled shared base plus drag bow, as in the original.
- `src/webgl/Experience.js`: mobile project-to-home flights keep sheet width/depth, velocity, and lean at zero instead of introducing the desktop wave during Close.
- No CSS, content, typography, assets, breakpoints, desktop/tablet behavior, or unrelated animation values were changed.

### Verification

- A temporary browser-only WebGL uniform probe compared values at identical DOM scroll transforms. Before the fix, home bulge was original `0.141833` versus local `0.109123`; project media was `0.141846` versus `0.109113`, and the original's additional `0.032734` sheet value was absent locally. After the fix, project media/sheet pairs match exactly at every shared transform in development and production, and mobile sheet width/depth logs are zero. Home values agree to approximately `0.00003` where the logged DOM transforms differ by the source's 0.01px rounding.
- The settled home card's measured top edge changed from a curved 317–324px range to 319–320px, matching the original's flat 319px edge. Project-to-home Close logs contain no nonzero mobile sheet uniforms.
- Paired project states matched exactly at initial, vertical release, canceled scrub, next/previous navigation, and Full → Project. Settled non-parked media differed by at most 0.09px; a frozen parked item differed by 0.78px without a parked-state mismatch. Both sites stayed at 390×844 document width/height with hidden overflow and no route or gesture errors.
- Production frame-based home motion reported zero parked-state mismatches and all sampled card positions within 0.82px; the tracked Casa card was identical at the fourth drag and release samples. Inside-lens taps remained inert and outside taps opened The Lookback on both original and production local.
- Final development regression: **19/19 passed**, including desktop, tablet, and phone checks, with zero runtime, console, or failed-response errors. Final `npm run build` passed. Production-preview uniform, motion, project-close, and lens probes passed with zero errors; the temporary preview was stopped. Development remains on port 5173.
- Evidence: `/tmp/jl-site/mobile-project-list-audit/`, `/tmp/jl-site/mobile-uniform-audit/`, `/tmp/jl-site/mobile-menu-scroll/`, and the corresponding probes under `/tmp/jl-inspect/`.
- No verified difference remains in the scoped mobile interaction/deformation audit. Broader tonal, lens-shading, and fallback approximations remain as documented above; no tablet or desktop work was started.
