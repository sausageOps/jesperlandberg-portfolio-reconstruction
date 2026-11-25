# Tablet parity audit and implementation report — 2026-11-25

## Status and implementation summary

**Approved implementation complete for the 650–1024 CSS px tablet band, inclusive.** The integrated application now reuses the captured portfolio runtime at tablet widths. The phone band below 650px and legacy desktop renderer above 1024px remain the non-tablet paths. The legacy renderer is retained; no captured runtime internals, assets, shaders, stylesheets, project data, A24 navigation, HUD, or shared navigation files were rewritten.

Source changes are limited to `src/App.jsx` and `src/jesper/MasterMobile.jsx`. `App.jsx` adds separate mobile/tablet predicates, tablet routing, tablet-only project-route normalization when resizing into desktop, and a tablet-only home-title sync after Full→Home transitions. The existing runtime wrapper was generalized and tagged with `data-master-range`; it still uses the existing bridge, data adapter, history owner, WebGL fallback, and teardown lifecycle. The pre-implementation audit checkpoint remains commit `1cb362c`; implementation changes are in the current working tree.

**Final production build:** `npm run build` passes. Vite still reports its existing large-chunk advisory (>1200 kB); chunking was not changed as part of this tablet-only task.

**Integrated verification summary:** Playwright exercised the actual Vite application with captured project records and locally mapped assets—not only the earlier forced-mount prototype. The loader-to-home handoff, all eight featured projects, direct project paths, `/full`, keyboard close, browser Back/Forward and project transitions, A24 Routes→Lab navigation, both tablet orientations, all four requested breakpoint edges, and a live tablet-project→desktop resize were checked. No app page errors occurred in the portfolio flows. Geometry checks against the original master were exact at the measured DOM anchors across all eight projects in both orientations. Remaining limitations and small differences are listed in [Remaining discrepancies and verification limits](#remaining-discrepancies-and-verification-limits).

## Scope and method

- Compared local Vite preview (`5173`) with the captured upstream static build (`5174`), extracted from `sausageOps/httpsjesperlandberg.com` at `7155cbb62d4f0ea8c8be6f98c1aed4c6b1dd3d56`.
- Main viewports were **768×1024** and **1024×768**. The prior responsive sweep sampled 649, 650, 651, 767, 768, 834, 991, 992, 1023, 1024, 1099, 1100, 1194, 1299, 1300, 1399, and 1400px widths.
- Panel runs used the captured project records as a GraphQL fixture and mapped upstream image URLs to the existing local assets. Mux video requests were intentionally blocked; video playback and live DatoCMS/network behavior are not parity verdicts here.
- The original baseline audit sampled all eight featured panels at both tablet orientations and exercised touch/wheel actions against the legacy port and upstream master. Those old-port gesture deltas explain the migration decision; they are not a verdict on the new integrated runtime. Project-media swipes remain timing-sensitive under synthetic headless input.
- The first tablet-runtime feasibility probe overrode only `(max-width: 649px)` in Playwright at 768px/1024px. That prototype was not integrated-app verification; its role is superseded by the post-implementation tests below.
- After implementation, the actual integrated app was checked in both the Vite dev server and a production `vite preview` build. Boundary/resize tests covered 649, 650, 768, 1024, and 1025px; project/history/A24 flows used the captured GraphQL fixture and local images. No application `pageerror`s were recorded. Live Mux and some Carter Lab poster requests were blocked/unavailable and are listed as limitations.

## Findings

The baseline comparison below describes the **legacy tablet renderer before migration** unless explicitly marked otherwise. The final captured-runtime implementation results are recorded in [Integrated acceptance results](#integrated-acceptance-results).

### 1. Responsive home layout and root sizing

The upstream root uses:

```css
clamp(5px, 20px, max(0.66667vw, min(2.5641vw, 33.7683px - 2.63102vw)))
```

The legacy local app switches at 650px from its phone formula to `calc(100vw / 1500 * 10)`. This creates a large 650–991px mismatch, which changes the size and position of the home cards and project content. At 1024px the root sizes match.

| Width | Upstream root | Legacy local root |
|---:|---:|---:|
| 649px | 16.641px | 16.641px |
| 650px | 16.667px | 4.333px |
| 991px | 7.695px | 6.607px |
| 992px | 7.669px | 6.613px |
| 1023px | 6.853px | 6.820px |
| 1024px | 6.827px | 6.827px |

At **768×1024**, the upstream Casa card measured **[5.15, 289.28, 757.69, 445.44]**; the legacy local card measured **[144.50, 371.20, 479.00, 281.59]**. At **1024×768**, after the intro settled, both measured **[227.86, 216.96, 568.27, 334.08]**. This makes the portrait tablet layout the clearest responsive failure; the 1024px landscape layout is much closer geometrically.

Selected screenshots: [upstream home](audit-evidence/tablet-parity/reference-home-768x1024.png) · [legacy local home](audit-evidence/tablet-parity/legacy-home-768x1024.png).

### 2. All eight project panels

The fixture-backed panel matrix completed all eight featured projects in both orientations, with zero `pageerror`s. Media counts and measured track `scrollHeight` in CSS pixels:

| Project | Media | Portrait upstream / legacy | Landscape upstream / legacy |
|---|---:|---:|---:|
| Nathan Riley | 4 | 2331 / 1004 | 1173 / 1146 |
| Casa Di Solare | 3 | 1749 / 1004 | 880 / 853 |
| The Lookback | 4 | 3366 / 1249 | 1694 / 1667 |
| Book of Happiness | 4 | 2516 / 1004 | 1266 / 1239 |
| Dogelon Mars | 4 | 2828 / 1046 | 1424 / 1397 |
| Gil Huybrecht | 3 | 1768 / 1004 | 890 / 863 |
| Discoveryland | 3 | 1935 / 1004 | 974 / 947 |
| Griflan | 3 | 2004 / 1004 | 1009 / 982 |

At **768×1024**, upstream’s Dogelon sheet was **[67.80, 27.11, 632.41, 969.78]** with a first-media width of **949.34px**; legacy local was **[25.59, 10.23, 716.81, 1003.53]** with a first-media width of **358.39px**. Portrait media and type are therefore not just slightly offset: the legacy column is much narrower and exposes several whole images where upstream shows only a narrow media sliver at the right edge.

At **1024×768**, all eight sheet boxes matched at **[34.13, 13.64, 955.75, 740.72]**. First-media boxes generally differed by less than 0.1px. The legacy viewport’s visible box is sheet-height-clamped while its content still overflows; the upstream measured track itself extends beyond the sheet. Landscape scroll-height differences were comparatively small (about 2–3%), but the input result below is not.

Evidence: [upstream portrait panel](audit-evidence/tablet-parity/reference-dogelon-portrait-before-touch.png) · [legacy portrait panel](audit-evidence/tablet-parity/legacy-dogelon-portrait-before-touch.png).

### 3. Touch and wheel behavior

The isolated home touch and wheel actions moved the Casa card in the **same direction** in both implementations, but not by identical distances. Baselines differ in portrait because the card geometry already differs.

| Viewport | Input | Upstream Δx | Legacy local Δx |
|---|---|---:|---:|
| 768×1024 | Touch | −609.51px | −747.28px |
| 768×1024 | Wheel | −48.01px | −59.35px |
| 1024×768 | Touch | −536.04px | −620.09px |
| 1024×768 | Wheel | −48.17px | −34.06px |

The project-panel touch result is a higher-priority mismatch. One matched 1024×768 Dogelon swipe (touch start at 67% viewport height, eight moves over roughly 160ms, release, sample at 1200ms) moved the upstream first-media anchor **y=40.94→−490.69px**. Legacy local moved it **y=40.94→795.23px**, wrapping the first media to the bottom of the visible sequence. The comparable wheel moved the anchor **40.94→−113.33px** upstream and **40.94→−61.20px** locally. In portrait, a repeated local synthetic touch produced both a small upward move (**30.70→−80.94px**) and a downward/wrapped move (**30.70→157.52px**) in separate runs; the upstream run was **81.34→−902.06px**. Treat the portrait direction variability as evidence of sensitivity to track range/inertia, not a final universal touch verdict.

The extracted upstream scroll implementation and local `Experience.js` use the same headline wheel/touch scalars (wheel **1.25**, touch **3.25**, release multiplier **35**). Do not blindly retune those constants: correct tablet sizing/track behavior first, then re-run the identical gestures. The legacy project's media track and wrapping behavior are the likely contributors, and the synthetic runs show that timing matters.

Landscape before/after touch captures: [upstream before](audit-evidence/tablet-parity/reference-dogelon-landscape-before-touch.png) · [upstream after](audit-evidence/tablet-parity/reference-dogelon-landscape-after-touch.png) · [legacy before](audit-evidence/tablet-parity/legacy-dogelon-landscape-before-touch.png) · [legacy after](audit-evidence/tablet-parity/legacy-dogelon-landscape-after-touch.png).

### 4. Pre-migration route behavior and shared A24 baseline

- **Normal legacy tablet path:** opening Nathan Riley stores `history.state.jesperHomeProject` and keeps the URL `/`; ArrowRight updates modal state to Casa Di Solare but keeps `/`. Two browser Back calls returned to home, and Forward restored Nathan Riley. The project modal therefore has state-history entries, but tablet project URLs are not used.
- **Direct project routes:** upstream `/projects/nathan-riley` loads Nathan Riley (normalizes to a trailing slash on direct navigation). Legacy local at tablet replaces `/projects/nathan-riley` with `/` and returns to home.
- **`/full`:** upstream `/full/` displays the Index with eight featured project links. Legacy local at tablet displays its not-found route (`Page not found | ReframeHK`).
- **Captured runtime feasibility:** with `MasterMobile` mounted at actual 768×1024, the runtime opened a direct `/projects/nathan-riley` route. A separate tablet probe loaded `/full` (title `Index`, eight links), then direct Nathan Riley, and Back returned to `/full`. No page errors were recorded.
- **Frozen shared A24 navigation baseline:** before migration, the legacy tablet page opened the Routes dropdown, exposed the Lab link at `/routes/lab`, and navigated there with title `Lab — Routes`. In the forced-runtime portrait probe the A24 nav remained rendered at **[0, 964.19, 768, 59.81]**, matching the legacy measurement **[0, 964.20, 768, 59.80]**. The integrated post-migration A24 test is recorded below. The shared `A24Nav`, `Hud`, and navigation data remained unchanged.

### 5. Data and remaining visual detail

The local and upstream catalogues contain the same 23 records in the same order and the same eight featured projects; featured labels/previous-next ordering match. All 43 unique local project-image paths resolve. No catalogue rewrite is indicated. The screenshots also show a lower-priority award-shape difference on the legacy path (cup/model versus the reference’s cone-like award). The captured runtime naturally uses the reference asset/geometry. Videos were blocked, so live video fidelity remains unverified.

### 6. Initial forced-mount feasibility probe (superseded by integrated verification)

Before implementation, the browser-only forced mount produced these measurements:

| Viewport | Root | Home Casa card | Project sheet | First project media |
|---|---:|---|---|---|
| 768×1024 | 13.5621px | [5.15, 289.28, 757.69, 445.44] | [67.80, 27.11, 632.41, 969.78] | [587.00, 81.34, 949.34, 543.27] |
| 1024×768 | 6.8267px | [227.86, 216.96, 568.27, 334.08] | [34.13, 13.64, 955.75, 740.72] | [430.11, 40.94, 477.86, 273.45] |

These are the captured upstream values to measurement precision. The screenshot evidence for the forced runtime is in [portrait home](audit-evidence/tablet-parity/tablet-runtime-home-768x1024.png), [portrait project](audit-evidence/tablet-parity/tablet-runtime-project-768x1024.png), and [landscape project](audit-evidence/tablet-parity/tablet-runtime-project-1024x768.png). The trial changes no file; it demonstrates that the existing captured bundle and local project-record adapter already render tablet dimensions and project routes.

## Implemented tablet route boundary

- **`src/App.jsx`:** keeps the frozen phone predicate `(max-width: 649px)` separate from the tablet predicate `(min-width: 650px) and (max-width: 1024px)`. The existing portfolio runtime owns home, `/full`, and valid `/projects/:slug` routes on phones/tablets; unknown project slugs still return home. Desktop stays on the legacy renderer and retains its existing route behavior.
- **`src/jesper/MasterMobile.jsx`:** the existing wrapper is generalized as `MasterPortfolio` with a `range` prop and `data-master-range` marker. It still loads the same `public/mobile-master/bridge.js`, project adapter, router/history bridge, WebGL fallback, stylesheet, cleanup, and runtime teardown. There is one portfolio runtime and one host-owned browser history; no runtime fork was made.
- **Resize handoff:** when leaving tablet for desktop with a project open, the media-query handler replaces the project URL with `/` and clears tablet-only history metadata *before* the legacy `JesperHome` mounts. At 1025px the legacy home renderer then presents its eight cards, without the stale tablet project. Re-entry at 1024px remounts one tablet runtime; the `master-mobile` class, master stylesheet, router globals, and master canvas are removed on desktop and restored on re-entry.
- **Title handoff:** a tablet-only title observer corrects the captured runtime's stale `Index — Jesper Landberg` title after a Full-origin project closes to `/`. It only enforces `Jesper Landberg` at the tablet home URL; project and `/full` titles remain runtime-owned. A direct comparison against the upstream Full→Home transition now returns the same title.
- **Frozen scope:** no changes were made to A24/HUD/navigation source, master CSS/bundle, project data, shaders, project pages, legacy renderer, or global input scalars.

## Integrated acceptance results

All tests below used the actual integrated React/Vite app. The project catalogue was fixture-backed and remote image URLs were mapped to existing local assets; tests did not rely on live DatoCMS or Mux. The boundary and resize smoke was also repeated against the built app through `vite preview`.

### Breakpoints, preloader, and home

| CSS viewport | Integrated renderer | Observed result |
|---|---|---|
| 649×1024 | frozen `mobile` runtime | 8 cards; loader bars appeared then cleared |
| 650×1024 | `tablet` runtime | lower tablet edge; 8 cards; loader cleared |
| 768×1024 | `tablet` runtime | portrait; 8 cards; loader cleared |
| 1024×768 | `tablet` runtime | inclusive upper edge, landscape; 8 cards; loader cleared |
| 1025×768 | legacy renderer | tablet bundle not mounted; 8 legacy cards |

The **650×1024** integrated home card exactly matched upstream at **[−53.85, 289.28, 757.69, 445.44]**. At **768×1024**, root size was **13.5621px** and Casa measured **[5.15, 289.28, 757.69, 445.44]**; at **1024×768**, root size was **6.8267px** and Casa measured **[227.86, 216.96, 568.27, 334.08]**. The 650px edge was separately compared with upstream and matched exactly. Each tablet home run observed the preloader bars before settling at eight cards and one WebGL canvas.

The production-preview boundary run passed at all five widths with no page errors or unmatched fixture requests. Its portrait and landscape screenshots are [integrated home 768×1024](audit-evidence/tablet-parity/integrated-home-768x1024.png) and [integrated home 1024×768](audit-evidence/tablet-parity/integrated-home-1024x768.png).

### All eight projects and visual geometry

The actual integrated app opened all eight featured projects directly at **768×1024** and **1024×768**. Master-vs-integrated measurements matched exactly at sampled DOM anchors: **0px maximum delta** for the project sheet and every media rectangle in both orientations, with media counts matching for every project. The integrated screenshots are [Dogelon Mars portrait](audit-evidence/tablet-parity/integrated-dogelon-project-768x1024.png) and [Dogelon Mars landscape](audit-evidence/tablet-parity/integrated-dogelon-project-1024x768.png).

The separate integrated panel run also opened all eight projects, navigated through the featured sequence with ArrowRight and wrapped from Griflan back to Nathan Riley. A two-direction keyboard check passed in both orientations (Nathan Riley ←→ Griflan). Screenshots and geometry logs were checked against the same captured upstream build. Screenshot-level pixel comparison of Dogelon remains close but not literally pixel-identical: with A24 visible, changed pixels were **0.499%** at 768×1024 (mean RGB delta **1.139**) and **0.267%** at 1024×768 (mean delta **0.749**). With A24 hidden, the respective results were **0.394% / 0.581** and **0.298% / 1.035**. WebGL frame timing, antialiasing, and the retained host dock can affect these captures; no structural geometry discrepancy was found.

### Direct routes, Full mode, history, and transitions

- Direct `/projects/:slug` routes loaded the correct project. All eight were exercised at both orientations; the dedicated host-flow run also covered direct `/projects/griflan`. An unknown project slug redirected to `/` and returned to the eight-card home.
- `/full` opened the Index with eight featured links. Opening a project from Full, moving to the next project, browser Back to the prior project, then Back to Full all passed. The Full-origin Escape close settled to Featured with no project sheet and eight cards; its final title now matches upstream.
- From home, opening Nathan Riley, ArrowRight to Casa Di Solare, Back to Nathan Riley, Back to home, and Forward to Nathan Riley passed after waiting for the visible route to settle. Escape and the project close link also returned to a settled home state in portrait and landscape.
- Direct project URLs in the local host bridge omit the final slash (`/projects/nathan-riley`); the upstream static preview redirects to a slash-suffixed path (`/projects/nathan-riley/`). Both resolve to the same project and history flows work, but this URL-string difference remains; see below.

### A24/HUD integration and resize cleanup

At both tablet orientations, A24 remained present, the Routes menu exposed Lab/Writing/Studio/Art, and choosing Lab navigated to `/routes/lab` with title `Lab — Routes`. The master runtime, stylesheet, router globals, and root class were removed on that non-portfolio route; A24 remained. The shared A24/HUD source was not edited.

Live resize sequences passed in both dev and production-preview runs: tablet home **1024→1025→1024→649→650** selected legacy desktop, tablet, mobile, and tablet runtimes at the correct edges. With Nathan Riley open at 1024px, resizing to 1025px normalized the URL to `/`, unmounted the tablet runtime, and rendered all eight legacy desktop cards. A production-preview direct project load at 1025px also retained the original desktop behavior: it replaced the project URL with `/` and rendered eight legacy cards. No duplicate canvas, stale router, CSS class, stylesheet, or page errors remained.

## Remaining discrepancies and verification limits

1. **Direct-route slash canonicalization:** the upstream static preview returns `/projects/<slug>/`; the integrated Vite host bridge retains `/projects/<slug>`. Project content, direct navigation, Back/Forward, and project transitions all work. This is the only route-string difference observed; it was not changed because the bridge is shared with frozen mobile behavior and the existing tablet acceptance criteria require working routes, not a different history protocol.
2. **Touch/swipe parity is not a definitive verdict:** earlier synthetic touch/wheel probes against the legacy port were timing-sensitive. Tablet now uses the same captured interaction runtime as upstream and no gesture constants were changed, but a controlled on-device swipe comparison remains unverified. Do not infer a new tablet mismatch from the old legacy-port deltas in sections 2–3.
3. **Live media/network coverage:** DatoCMS was represented by captured fixture data; Mux playback requests were intentionally blocked. Live video playback and live CMS responses were not verified. The A24→Lab route itself passed, but Carter Lab poster URLs failed in this sandbox (`ERR_CONNECTION_CLOSED`), so those remote posters were not visually verified. These are environment/data coverage limits, not tablet-runtime page errors.
4. **Small screenshot deltas:** the low pixelmatch/mean-RGB differences above remain across temporal WebGL captures even though measured layout anchors match. They are not evidence of a known static layout mismatch; exact frame-to-frame pixel parity is not claimed.
5. **Legacy scope above 1024px:** the pre-migration award-shape difference noted in section 5 belongs to the intentionally retained legacy renderer and is outside this tablet-only change. No tablet discrepancy was found there because the captured runtime uses the upstream award asset/geometry.
6. **Test harness persistence:** the integrated Playwright scripts and JSON logs were temporary under `/tmp/jesper-tablet-audit-browser/`; this repository has no configured browser-test framework. The report and four integrated screenshots are retained here. `npm run build` and the production-preview boundary/resize smoke passed; the full project/history/A24 matrix ran against the Vite dev app.

The audit establishes the approved 650–1024px migration and verifies the requested tablet flows in the integrated application. The legacy renderer remains available outside that band; A24, HUD, and navigation remain frozen.
