# Desktop migration audit report — final verification

**Date:** 2026-11-25<br>
**Status:** **Desktop verification passed for the tested scope.** No confirmed Profile animation defect remains; asset and live-media limits are documented below.<br>
**Branch:** `arena/09df7948-jesperlandberg-portfolio-recon` (active review branch).<br>
**Master source of truth:** `sausageOps/httpsjesperlandberg.com` `main` at `7155cbb62d4f0ea8c8be6f98c1aed4c6b1dd3d56` (confirmed against GitHub).<br>
**Local target:** production Vite preview on `:4173`; captured reference fixture on `:5174`.

> This sign-off is scoped to the desktop route, layout, interaction, and Profile implementation evidence listed here. It does not claim a synchronized pixel-for-pixel animation movie or live-media parity.

## 1. Scope and test conditions

Final Chromium functional checks used **1440×900, DPR 1, software WebGL**, deterministic project/image fixtures where available, and the current production build. The desktop structural matrix covers **1025×768, 1280×800, 1366×768, 1440×900, 1600×900, and 1920×1080**. The reference is the compiled GitHub master repository, not a source Vue/TypeScript project. A short responsive-boundary smoke check is included only to verify the desktop-only accessibility CSS boundary; mobile/tablet acceptance was not reopened or exhaustively rerun.

The browser fixture blocks Mux and some A24-hosted media. Local/remote fixture outcomes are distinguished from application errors in the evidence; page and console error counts are zero in the final desktop functional and A24 runs.

## 2. Preloader and homepage

At 1440×900, both master and local navigations exposed the three loading bars during startup, with one Nuxt root and one WebGL canvas, then settled on the home view with **eight cards**. The local instance reports `data-master-range="desktop"`, one master session, and one Vue Router; no second portfolio renderer/canvas was mounted.

Evidence: `audit-evidence/desktop-migration/desktop-migration-functional-results.json` (`interactions.*.preloader`, `home`).

## 3. Home-card geometry

At **1025×768, 1280×800, 1366×768, 1440×900, 1600×900, and 1920×1080**, the reference and local home each rendered eight cards with matching root-font values. Maximum measured absolute card-rectangle delta was **0 CSS px** at every size. These are sampled geometry measurements, not a full animation/frame comparison.

Evidence: `desktop-migration-matrix.json` and paired captures under `home/`.

## 4. Project-frame geometry and content slots

For Casa Di Solare across the six desktop sizes, the project-frame and first-media rectangle deltas were **0 CSS px**. At 1440×900, all eight panels matched in measured frame, first-media, and Close-control rectangles (**maximum delta 0 px**); title, media-slot, pill, and award-label counts also matched. Tablet geometry from the earlier approved run matched at 768×1024 and 1024×768; those implementation modes were not changed or exhaustively retested during this final desktop investigation.

Evidence: `desktop-migration-matrix.json`, `desktop-project-geometry-1440x900.json`, and `tablet-regression-results.json`.

## 5. Full Index and direct project routes

Master and local both rendered **23 Full Index links**, including **8 featured project links**, with The Lookback first. Titles and one project sheet were verified on direct loads for all eight routes:

1. Nathan Riley
2. Casa Di Solare
3. The Lookback
4. Book of Happiness
5. Dogelon Mars
6. Gil Huybrecht
7. Discoveryland
8. Griflan

Master uses `/full/` and may retain a trailing slash on project routes; local uses the slashless forms. Normalized paths match.

Evidence: `desktop-migration-functional-results.json` (`directRoutes`, `interactions.*.full`).

## 6. Project navigation and history

Featured arrow-key navigation matched the sequence **The Lookback → Book of Happiness → Dogelon Mars → Gil Huybrecht → Discoveryland → Griflan → Nathan Riley → Casa Di Solare**. Home-card click, adjacent Previous/Next, and a fresh 420 px wheel input all passed; the centered card moved from Casa Di Solare to The Lookback on both sites. Full → project → Back restored Full; Forward restored the project. Home-card Back/Forward and Escape-to-close also passed. Project-media scrolling advanced the media transform by about **1919 CSS px** while document `scrollY` stayed at 0.

Evidence: `desktop-migration-functional-results.json` (`interactions.*`).

## 7. Profile open/close and animation parity

Profile opens and closes on both sites, with Escape restoring the closed state. The previous visual comparison was not a fair model-identity test: the temporary master fixture initially lacked `/models/llama.glb`, so the master rendered its documented box fallback. A later replay served a **local copy** to that master path; matching replay response hashes were expected by construction and are not used as identity proof.

**Independent identity evidence:** the GitHub master tree at the verified commit contains no GLB/model path, but the original HAR manifest records `GET /models/llama.glb` → **200**, `model/gltf-binary`, **143,140 bytes**, extracted as `0093_llama.glb__c38e354b14`. The local `public/assets/models/llama.glb` is also **143,140 bytes**, and its full SHA-256 begins `c38e354b14`. It parses as a GLB 2.0 file with an `Alpaca` scene/node label; the captured loader uses the first transformed mesh and normalizes it, so that label alone does not show a visual substitution. The extraction naming convention is corroborated by a reproducible scan of 146 local files: 32 manifest rows (18 distinct local bodies) have both matching byte length and a 10-hex filename suffix matching the local SHA-256 prefix, including the llama and award GLB entries. This makes the local GLB a **high-confidence match to the original captured response**, not an appearance-based substitute. The original extracted binary is absent from both the GitHub tree and this workspace, so a full 256-bit comparison against the raw HAR body cannot be repeated; the conclusion is strong, not absolute.

**Animation implementation:** the master bundle requests `/models/llama.glb`; the local captured bundle maps it to `/assets/models/llama.glb`. After changing only that URL constant, the complete 4,796-byte local `CHzWqGxK.js` module equals the master module byte-for-byte (normalized SHA-256 `0cb217578959be0ea3820ed33dd6d8716b7eefb50bb67782f86baae750c02f40`). The compiled Profile component block also matches exactly (2,581 bytes; SHA-256 `b1895d33c7de0e0b080066c986168c3e8c7e62493b9163b8ceb0d716cfae976c`); checked contexts for the shared camera, time uniform, and `openHole` transitions match as well.

The captured behavior is a six-instance **instanced-geometry rain**, not skeletal model animation: four instances are behind and two in front; they fall, sway, yaw, rock, and respawn. Initial positions/phases/scales use `Math.random()`. Position and scale follow the Profile hole’s center/radius and the shared perspective camera (53.4° FOV, z=41.18); the camera is not moved by the llama controller. The shader clips and lights the models using shared time/wave uniforms. Profile route transitions bind/retarget and open/close the same hole; the controller detaches its overlay meshes below progress 0.01. The Rain module defines a geometry/material `dispose()` method, but the compiled Folio lifecycle does not directly call `llamaRain.dispose()`; host runtime teardown is handled by the existing portfolio cleanup. The rain controller has no direct pointer handler; its motion is time/progress driven, while the Profile outside-click/link behavior is unchanged.

Independent screenshots can show different model counts, positions, and orientations because their `Math.random()` seeds and shared animation-clock phases were not synchronized. Those image differences are not evidence of a code mismatch. **No model or animation change was warranted or made.** Detailed provenance and code checks: `profile/profile-reference-investigation.json`; earlier fixture screenshots remain under `profile/` and are explicitly annotated as non-identity evidence.

## 8. Project Close keyboard access and focus

The captured runtime’s mirrored DOM Close anchor uses an `invisible` class. Local desktop CSS exposes that existing hit target to keyboard/assistive technology while keeping its text and background transparent, so the canvas remains the visible label. The target is one visible link-role control (`href="/"`, `aria-label="Close project"`, `tabIndex=0`); it receives focus after two Tabs. Enter closes the sheet and returns home; Escape also closes it. The first outward ring was clipped by the sheet’s `overflow-hidden`; the final white 2 px outline uses `outline-offset: -4px`, and the final screenshot shows it inside the Close pill.

This is an intentional local **desktop accessibility improvement** relative to the captured master, not an unreported parity claim. It is scoped to `min-width: 1025px`; no tablet/mobile Close rule was changed. Evidence: `desktop-a24-close-regression.json` and `projects/local-close-keyboard-focus-1440x900.png`. The earlier pre-fix `desktop-close-a11y-results.json` remains marked historical.

## 9. Recovered A24 navigation — verified, unchanged

No A24 source/component/style was changed. At 1440×900, the dock is present and visible; its viewport strip is fixed at the top with `z-index: 45` and a measured 290×27.58 px dock at x=575, y=24.56. This dock is separate local host chrome, not part of the master portfolio canvas. Pointer opening, Escape closing with focus restoration, keyboard menu navigation to `/routes/lab`, Enter activation, browser Back/Forward, and Life-to-home all passed. Portfolio navigation remains available after returning home; the local desktop portfolio still has one canvas/session/router, not a duplicate runtime.

The dedicated A24 Lab run recorded nine blocked remote poster attempts (30 total blocked poster/video attempts across the longer lifecycle probe) and **zero page or console errors**. Remote A24 media appearance/playback remains outside this fixture. Evidence: `desktop-a24-close-regression.json`, `desktop-migration-functional-results.json` (`a24`).

## 10. Responsive-mode protection

The approved ranges remain **mobile <650 px**, **tablet 650–1024 px**, and **desktop ≥1025 px**. A lightweight boundary smoke check at 649/650 and 1024/1025 confirmed the expected range, with the existing session/router/canvas retained across the tested resizes. No mobile/tablet component, stylesheet, breakpoint, navigation, transition, or asset was modified in this final investigation; the only new source-level focus rule is under `@media (min-width: 1025px)`. Mobile/tablet personal acceptance remains the basis for those modes; no extensive rerun was performed.

Evidence: `desktop-a24-close-regression.json` (`resizeMatrix`) and the previously approved mobile/tablet audit results.

## 11. Network and screenshot limitations

External Mux video was blocked (36 requests in the prior project fixture run), and A24 poster/video assets were blocked by the test fixture. In the final rapid direct-route loop, one local Techspeed thumbnail request returned `net::ERR_ABORTED` while the harness was moving between routes; the asset exists locally, all eight project pages rendered, and page/console errors remained zero. Navigation cancellation is plausible but was not independently established, so record this as an unresolved fixture request failure rather than proof of a missing asset. Earlier malformed Nuxt-manifest warnings came from a `{}` test stub; later runs used valid manifest JSON and reported no page/console errors.

## 12. Source/diff review

The desktop portfolio mounts the existing captured `MasterPortfolio` runtime once. `src/jesper/webgl/Experience.js` is not the desktop Profile renderer; the desktop route reports one `# __nuxt` canvas/session/router and loads the captured `CHzWqGxK.js` module. No second Profile scene, animation system, or navigation system was introduced.

The implementation diff is limited to the existing desktop migration work in `src/App.jsx` and `src/styles.css`: desktop routing through the captured runtime, the desktop Full-index pointer-event fix, and the desktop-only Close accessibility/focus rule. The recovered A24 integration, MasterMobile/MasterPortfolio runtime bundle, project model assets, and mobile/tablet components/styles were not edited. No speculative model/animation replacement was made.

## 13. Build, validation, and disposition

The final `npm run build` passes (183 modules transformed). Vite retains its existing chunk-size advisory (main bundle about **1.30 MB**, vocal-orb chunk about **1.50 MB** minified). `git diff --check` passes. All audit JSON artifacts parse successfully; the findings and evidence are documented on this branch.

**Disposition:** **PASS for the verified desktop implementation scope.** Preloader/home, Full Index, all eight projects, history, Previous/Next, wheel navigation, Profile controls, keyboard Close/focus, and recovered A24 navigation are verified. The captured portfolio runtime is the single desktop route owner. Confirmed interaction/accessibility corrections in the branch are the Full Index link hit-target/pointer-event fix and the desktop-only Close keyboard visibility/focus ring (drawn inward to avoid overflow clipping); the final Profile investigation found no mismatch to correct. Remaining limitations are the missing raw original GLB body (despite a strong independent capture fingerprint), unsynchronized randomized animation screenshots, and blocked live media. Keep those as documented evidence limits—not as speculative defects or reasons to replace the working asset/runtime.
