# Tablet parity audit and proposed migration plan — 2026-11-25

## Status and recommendation

**Audit only. No application source or configuration was changed, and implementation has not started.** This report and the selected PNGs in `audit-evidence/tablet-parity/` are the only proposed deliverables from this audit turn. The tracked source tree was clean before these audit artifacts were added; `npm run build` passed during the audit.

**Recommended direction, pending approval:** route the tablet portfolio island through the captured upstream runtime that is already integrated for mobile (`MasterMobile` + `public/mobile-master/`), rather than first trying to tune the legacy React/Three.js port. A browser-only probe at CSS viewports **768×1024** and **1024×768** forced the existing runtime to mount without changing repository files. Its root sizing, homepage-card geometry, project-sheet geometry, media anchors, direct `/full` and project routes, and Back behavior matched the captured upstream measurements. The local A24 dock remained present. This is strong feasibility evidence, not yet a production change or a test of resizing across the runtime boundary.

The recommended initial tablet gate is **650–1024 CSS px inclusive**. Keep the existing phone route/runtime below 650px and the current non-tablet implementation above 1024px unless approval sets a different range. Validate the 1024/1025 transition explicitly before shipping.

## Scope and method

- Compared local Vite preview (`5173`) with the captured upstream static build (`5174`), extracted from `sausageOps/httpsjesperlandberg.com` at `7155cbb62d4f0ea8c8be6f98c1aed4c6b1dd3d56`.
- Main viewports were **768×1024** and **1024×768**. The prior responsive sweep sampled 649, 650, 651, 767, 768, 834, 991, 992, 1023, 1024, 1099, 1100, 1194, 1299, 1300, 1399, and 1400px widths.
- Panel runs used the captured project records as a GraphQL fixture and mapped upstream image URLs to the existing local assets. Mux video requests were intentionally blocked; video playback and live DatoCMS/network behavior are not parity verdicts here.
- All eight featured panels were sampled at both tablet orientations. Isolated touch and wheel actions were also exercised on home and in the Dogelon Mars project panel, with screenshots saved for review. Home gestures used a stable-ready check; project screenshots are temporal captures of an animated WebGL scene, so the accompanying DOM positions are the primary numeric evidence.
- The tablet-runtime feasibility probe overrode only the app's `(max-width: 649px)` match in Playwright while preserving the actual CSS viewport at 768px or 1024px. That made the current `MasterMobile` integration mount; the captured runtime's own resize/layout code still saw the real tablet dimensions. This did **not** edit source, alter the live preview, or prove resize handoff at 649/650 or 1024/1025.
- Final panel, gesture, routing, and runtime probes recorded **zero page errors**. The few console `ERR_FAILED` messages in the runtime probe were from the deliberately blocked Mux requests.

## Findings

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

### 4. Routes, history, `/full`, and A24 navigation

- **Normal legacy tablet path:** opening Nathan Riley stores `history.state.jesperHomeProject` and keeps the URL `/`; ArrowRight updates modal state to Casa Di Solare but keeps `/`. Two browser Back calls returned to home, and Forward restored Nathan Riley. The project modal therefore has state-history entries, but tablet project URLs are not used.
- **Direct project routes:** upstream `/projects/nathan-riley` loads Nathan Riley (normalizes to a trailing slash on direct navigation). Legacy local at tablet replaces `/projects/nathan-riley` with `/` and returns to home.
- **`/full`:** upstream `/full/` displays the Index with eight featured project links. Legacy local at tablet displays its not-found route (`Page not found | ReframeHK`).
- **Captured runtime feasibility:** with `MasterMobile` mounted at actual 768×1024, the runtime opened a direct `/projects/nathan-riley` route. A separate tablet probe loaded `/full` (title `Index`, eight links), then direct Nathan Riley, and Back returned to `/full`. No page errors were recorded.
- **Frozen shared A24 navigation:** on the current legacy tablet page, Routes opens its dropdown, the Lab link is `/routes/lab`, and selecting it navigates to `/routes/lab` with title `Lab — Routes`. In the forced-runtime portrait probe the A24 nav remained rendered at **[0, 964.19, 768, 59.81]**, matching the legacy measurement **[0, 964.20, 768, 59.80]**. The shared `A24Nav`, `Hud`, and navigation data are out of scope and must remain unchanged.

### 5. Data and remaining visual detail

The local and upstream catalogues contain the same 23 records in the same order and the same eight featured projects; featured labels/previous-next ordering match. All 43 unique local project-image paths resolve. No catalogue rewrite is indicated. The screenshots also show a lower-priority award-shape difference on the legacy path (cup/model versus the reference’s cone-like award). The captured runtime naturally uses the reference asset/geometry. Videos were blocked, so live video fidelity remains unverified.

### 6. Feasibility of reusing the captured runtime

The browser-only forced mount produced these measurements:

| Viewport | Root | Home Casa card | Project sheet | First project media |
|---|---:|---|---|---|
| 768×1024 | 13.5621px | [5.15, 289.28, 757.69, 445.44] | [67.80, 27.11, 632.41, 969.78] | [587.00, 81.34, 949.34, 543.27] |
| 1024×768 | 6.8267px | [227.86, 216.96, 568.27, 334.08] | [34.13, 13.64, 955.75, 740.72] | [430.11, 40.94, 477.86, 273.45] |

These are the captured upstream values to measurement precision. The screenshot evidence for the forced runtime is in [portrait home](audit-evidence/tablet-parity/tablet-runtime-home-768x1024.png), [portrait project](audit-evidence/tablet-parity/tablet-runtime-project-768x1024.png), and [landscape project](audit-evidence/tablet-parity/tablet-runtime-project-1024x768.png). The trial changes no file; it demonstrates that the existing captured bundle and local project-record adapter already render tablet dimensions and project routes.

## Prioritized file-level migration plan — approval pending

### P0 — Add an explicit tablet portfolio route boundary

**`src/App.jsx`**

- Add a tablet-portfolio predicate separate from the existing `mobile` flag; do not widen `mobile` for unrelated host routes or the shared nav.
- For the approved tablet band, mount the existing captured portfolio runtime on home and `/full`, and allow valid `/projects/:slug` paths to reach its router rather than running the current tablet `replaceState('/', …)` redirect.
- Keep unknown project slugs and all non-portfolio host routes on their current behavior. Keep the shared `Hud`/A24 component outside the portfolio island.
- Preserve one browser-history owner. Reuse the existing `window.__masterRouter`/`__masterWriteHistory` bridge rather than adding a second router.

**`src/jesper/MasterMobile.jsx`**

- Generalize the integration boundary for the approved tablet range (rename only if useful; no need to fork the captured runtime).
- Preserve `localRecord`, `window.__masterData`, router/history delegation, WebGL fallback, cleanup, and the `master-mobile` class lifecycle. Test resize/unmount so the global class, stylesheet, route owner, and canvas do not leak when crossing into or out of the tablet band.
- The forced mount already proves root sizing, home/project geometry, direct project URLs, `/full`, and Back are available. Do not edit the captured bundle or `master.css` unless a post-approval regression test identifies a concrete blocker.

### P1 — Lock the acceptance matrix before any visual refinements

**New repeatable browser test (not present yet):** the repository has no Playwright/Vitest/Jest setup; `package.json` only defines `dev`, `build`, and `preview`. After approval, add a small Playwright parity/smoke script or test and a command to run it. Use the captured fixture and local assets, not live DatoCMS or Mux.

Test at 649/650/651, 768, 991/992, 1023/1024/1025, then the upstream container edges 1099/1100, 1299/1300, and 1399/1400. At 768×1024 and 1024×768 test: home layout; all eight project panels; isolated touch and wheel; ArrowRight/Left; Back/Forward; direct `/projects/:slug`; `/full`; close/Escape; A24 Routes→Lab; and resize/unmount cleanup. Include WebGL-unavailable fallback and a production-preview smoke.

### P2 — Keep the legacy tablet renderer untouched unless reuse is rejected

For the recommended route-boundary approach, **do not** first modify `src/styles.css`, `src/jesper/JesperHome.jsx`, `src/jesper/webgl/Experience.js`, `src/jesper/components/Project.jsx`, `src/jesper/components/Loader.jsx`, or `src/jesper/jesper.css`; they remain the non-tablet path/fallback. Avoid changing `src/jesper/data/projects.js`, which already matches the captured catalogue and supplies the local media adapter.

If runtime reuse is not approved, the larger alternative is a legacy port: exact tablet root sizing in `src/styles.css`; home/project geometry and gesture/scroll behavior in `Experience.js`; panel/overflow markup and styles in `Project.jsx` and `jesper.css`; route/history and `/full` handling in `App.jsx`/`JesperHome.jsx`; then loader and award refinements. This is a materially larger and riskier path, and changing the document root there needs care because the shared A24 UI uses the same page.

### Frozen files / explicit non-goals

Do not modify `src/components/A24Nav.jsx`, `src/components/A24Nav.css`, `src/components/Hud.jsx`, or `src/data/navigation.js`. Do not replace project catalogue/media, tune shared nav spacing, or adjust global input scalars before the tablet runtime boundary and controlled gesture tests are approved.

## Caveats and requested decision

- Live DatoCMS, Mux video, and remote font behavior were not measured; tests used captured records/local images and blocked video requests.
- Headless SwiftShader readiness at 1024px varied; final home gesture checks waited for the loader to leave and the card position to settle. The 1.2-second project gesture readings remain animation-sensitive. Recheck on the target device/browser after the runtime boundary is approved.
- The A24/HUD layer is intentionally retained, not compared as a replaceable asset. Its successful menu route and measured geometry are recorded above.
- This report does not assert pixel-perfect parity for every animated frame or video. It does establish a very strong, measured path to reuse the already-captured runtime for the tested tablet geometries.

**Approval requested:** approve the recommended captured-runtime tablet band (**650–1024px inclusive**) and the P0/P1 scope above, or specify a different breakpoint/legacy-port preference. I will wait for approval before modifying application source or beginning implementation.
