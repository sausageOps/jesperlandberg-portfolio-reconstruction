# Desktop parity audit

**Date:** 2026-11-25

**Status:** Read-only audit complete; implementation is still on hold pending approval.

## Executive summary

The local reconstruction has **very close featured-home geometry and matching featured content**, but the desktop experience is not yet a parity match in two central areas: its navigation shell is A24-branded at every requested desktop width, and desktop project/catalogue URLs do not resolve to the same pages as upstream. At 1600px and especially 1920px, project detail content also stops scaling with the reference.

No application source was changed for this audit. The desktop audit artifacts are this report and the evidence under [`audit-evidence/desktop-parity/`](audit-evidence/desktop-parity/). Pre-existing mobile/tablet changes and evidence are outside this audit and remain untouched. **Do not implement the plan below until approved.**

## Scope and method

Compared the local production preview with the designated upstream static/compiled Nuxt snapshot at six CSS viewports, DPR 1. This is the measured viewport matrix; geometry deltas are **upstream minus local**, and card deltas compare the common home cards intersecting the initial viewport.

| CSS viewport | Root font, master/local | Common visible card max rect Δ | Casa frame Δ x/y/w/h | First media width, master/local |
|---|---|---:|---|---|
| 1025 × 768 | 6.83337 / 6.83333px | 0.02px | 0 / 0 / 0 / 0px | 478.33 / 478.33px |
| 1280 × 800 | 8.53338 / 8.53333px | 0.03px | 0 / 0 / 0 / 0px | 597.33 / 597.33px |
| 1366 × 768 | 9.10671 / 9.10667px | 0.02px | −0.02 / 0 / +0.02 / +0.27px | 637.47 / 637.45px |
| 1440 × 900 | 9.60005 / 9.6px | 0.02px | 0 / 0 / 0 / 0px | 672 / 672px |
| 1600 × 900 | 10.6667 / 10px | 0.66px | +3.33 / +1.33 / −6.66 / −2.66px | 746.66 / 700px |
| 1920 × 1080 | 12.8001 / 10px | 2.78px | +14 / +5.59 / −28 / −11.19px | 896 / 700px |

The matrix covers home and a Casa Di Solare project panel for both sites at every width. The 1440px project measurement comes from a separate fresh capture with no prior gesture; other project measurements use the six-width run.

Fresh Chromium contexts were used for each size. Captures waited for the WebGL canvas, eight cards, loader removal, and loaded font status; project-panel samples opened Casa Di Solare (1440px uses a separate fresh, no-prior-gesture capture). A fixture returned upstream CMS data and mapped image/video-thumbnail URLs to the local master assets. No unmatched fixture images or page errors were recorded. Streaming Mux video requests were blocked by the sandbox network allowlist, so video playback itself was not assessed.

A resize sequence covered all six widths in one running page for both sites. Zoom was approximated at a physical 1440 × 900 by effective CSS viewports of 1152 × 720 at DPR 1.25 (125%) and 960 × 600 at DPR 1.5 (150%). At the zoom captures, the local A24 nav was allowed to reach its idle state.

The checked upstream `main` snapshot is a compiled/static Nuxt export; authored Vue/TypeScript/shader sources were not found in the inspected tree. The plan therefore identifies the local files to change, rather than claiming access to upstream authored components.

## Severity-ranked findings

### S1 — Desktop navigation shell is different at all six widths

At every requested width, upstream shows the portfolio shell: **JESPER LANDBERG** upper left, **PROFILE** upper right, and **FEATURED / FULL** at the lower left. The local reconstruction instead shows a centered white **A24 / Life / Routes / Myself** dock. On local project panels this dock remains visible and overlaps the panel/media area, while the upstream project view uses the project sheet/close affordance without that A24 dock.

This is confirmed at all six viewport widths by the navigation metrics and matched home screenshots. The difference is especially obvious at 1025×768 and 1920×1080:

- [Upstream home, 1025×768](audit-evidence/desktop-parity/home/master-home-1025x768.png) · [Local](audit-evidence/desktop-parity/home/local-home-1025x768.png)
- [Upstream home, 1920×1080](audit-evidence/desktop-parity/home/master-home-1920x1080.png) · [Local](audit-evidence/desktop-parity/home/local-home-1920x1080.png)
- [Upstream project, 1440×900](audit-evidence/desktop-parity/projects/master-casa-di-solare-1440x900.png) · [Local](audit-evidence/desktop-parity/projects/local-casa-di-solare-1440x900.png)

At 150% zoom, the local runtime switches into the tablet/captured branch and adds a second A24 dock at the bottom while the master-style header/footer remain present. The upstream 960×600 CSS-viewport capture has no such dock:

- [Upstream zoom-equivalent, 150%](audit-evidence/desktop-parity/zoom/master-zoom-150-physical1440x900.png) · [Local](audit-evidence/desktop-parity/zoom/local-zoom-150-physical1440x900.png)

**Likely owners:** `src/App.jsx` (route/shell selection), `src/components/Hud.jsx` (currently always returns `A24Nav`), `src/components/A24Nav.jsx` and `src/data/navigation.js` (A24 controls and route data), plus `src/jesper/MasterMobile.jsx` / `src/jesper/components/MobileHud.jsx` for the captured branch that appears at ≤1024px, including the 150% effective-viewport case. `src/jesper/JesperHome.jsx` owns the portfolio surface/project overlay.

### S1 — Desktop `/full` and project routes do not match upstream

The upstream `/full` route renders the catalogue (23 total links, including eight featured case studies). On local desktop, `/full` resolves to **“Page not found | ReframeHK”** and shows no catalogue items. The upstream Full → project → close journey was exercised: the first featured item opened `/projects/the-lookback`, and closing returned to `/`.

Likewise, opening a project from local desktop keeps `location.pathname` at `/` and stores the selection in `history.state.jesperHomeProject`; a direct desktop load of `/projects/nathan-riley` is replaced with `/` and opens no sheet. Upstream project selection uses the `/projects/:slug` path. Keyboard Next reaches all eight featured panels on both builds, but only upstream updates the URL for each project.

Evidence: [upstream Full catalogue](audit-evidence/desktop-parity/routes/master-full-1440x900.png) · [local `/full` result](audit-evidence/desktop-parity/routes/local-full-1440x900.png) · [route and interaction metrics](audit-evidence/desktop-parity/metrics.json).

The local behavior follows the current routing gates: `src/App.jsx` only classifies `/full` as the portfolio Full route on mobile/tablet, and `readLocation()` normalizes project paths to `/` outside those ranges. `src/jesper/JesperHome.jsx` also writes the current URL, rather than `/projects/:slug`, for desktop project opens/Next.

**Likely owners:** `src/App.jsx`, `src/jesper/JesperHome.jsx`, `src/jesper/components/FullIndex.jsx`, and `src/jesper/webgl/FullIndexRenderer.js` (the latter two already contain the local Full-index implementation but are not mounted for desktop `/full`).

### S2 — Project detail sizing diverges beyond 1500px

The matrix above shows that root font sizes track the upstream through 1440px, then the local root is capped at 10px while the upstream continues viewport scaling. At 1600×900, the first project media is 746.66px wide upstream versus 700px locally; at 1920×1080 it is 896px versus 700px. The associated first-media rectangle deltas (master − local, x/y/w/h) are −57.98 / +3.98 / +46.66 / +27.42px at 1600px, and −243.59 / +16.78 / +196 / +115.23px at 1920px. The project frame itself also diverges there, as shown in the matrix. At 1920px, the local title and copy are visibly smaller as well: [upstream project](audit-evidence/desktop-parity/projects/master-casa-di-solare-1920x1080.png) · [local project](audit-evidence/desktop-parity/projects/local-casa-di-solare-1920x1080.png).

**Likely owner:** `src/styles.css` sets `html { font-size: calc(100vw / 1500 * 10) }` and then overrides it to `10px` at `min-width: 1500px` (line 129). Project dimensions in `src/jesper/jesper.css` are already rem-based; fix/scoping should be considered before changing those values. Avoid changing global sizing without checking the non-Jesper/Carter routes.

### S3 — Project award marker shape differs

In stable Casa Di Solare project captures, upstream displays a small gold tapered/cone-like marker, while local displays a trophy-shaped marker. It is a small decorative difference, not a data mismatch. The local desktop path selects the loaded award GLB in `src/jesper/webgl/Experience.js` (`buildAwards()` / `loadModels()`); the same file notes the reference’s six-sided procedural cone. See the 1440px project pair linked above.

## Verified parity and interactions

- The featured order is identical in both builds: `nathan-riley`, `casa-di-solare`, `the-lookback`, `book-of-happiness`, `dogelon-mars`, `gil-huybrecht`, `discoveryland`, `griflan`. Compared top-level fields and featured media metadata match the master fixture.
- All eight cards are present at every requested width. Among cards intersecting the initial viewport, the maximum absolute rectangle delta is **0.02, 0.03, 0.02, 0.02, 0.66, and 2.78 CSS px** at 1025, 1280, 1366, 1440, 1600, and 1920px respectively. The separate broader-card comparison showed larger downstream drift on later cards at wide widths; those off-screen/card-sequence deltas are not represented by this initial-viewport metric and should be retested before adjusting the carousel. The measured current-view geometry is close, and the dominant confirmed home-page discrepancy is the shell/navigation.
- Opening a featured project and closing with Escape worked at all six widths. At 1440px, ArrowRight visited all eight featured panels in sequence on both builds; Escape returned both to `/`. The URL behavior differs as described above.
- A 420px home-wheel input changed the nearest card from Casa Di Solare to The Lookback on both builds. The current 280px drag probe did not change the nearest-card sample; the existing `MOBILE_PARITY_AUDIT.md` records three complete desktop Lookback → Book → Lookback drag cycles, so this single probe is not classified as a new drag regression.
- On a Lookback project sample, vertical wheel input moved the media track on both builds without scrolling the document. A clean Casa sample at 1440px was inconsistent (master moved; local did not), so this is recorded as a follow-up check rather than a confirmed finding; see [upstream Casa scroll capture](audit-evidence/desktop-parity/projects/master-casa-scroll-1440x900.png) · [local](audit-evidence/desktop-parity/projects/local-casa-scroll-1440x900.png).
- Live resizing through all six desktop sizes retained eight cards, viewport-sized canvas/document geometry, and produced no page errors. The root-font cap at 1600px+ is the exception noted in S2.

The full numeric record, including per-viewport navigation/card/project rectangles, fixture counters, resize samples, zoom cases, route outcomes, and interaction probes, is in [`audit-evidence/desktop-parity/metrics.json`](audit-evidence/desktop-parity/metrics.json). Home and project screenshots for every requested size are in the same evidence directory.

## Approval-gated file-level migration plan

1. **Restore desktop portfolio routes without changing the accepted phone/tablet boundary.** In `src/App.jsx`, separate the desktop portfolio route cases from the existing A24 section routes: allow valid `/projects/:slug` and `/full` to resolve for desktop, while preserving mobile ≤649px and tablet 650–1024px behavior. Keep unknown-route behavior explicit.
2. **Make project path/history semantics match.** In `src/jesper/JesperHome.jsx`, use a valid project slug from the pathname on desktop and push `/projects/:slug` for open/Next. Close, Full-origin close, `popstate`, and direct-load behavior must agree; do not leave desktop state only in `history.state`.
3. **Select the right shell by route/mode.** In `src/App.jsx`, make the shell selection route-aware; `src/components/Hud.jsx` currently always renders `A24Nav`. Add or select a desktop portfolio HUD for the upstream name/Profile and Featured/Full controls, using `src/data/navigation.js` only if its route data can be cleanly separated from retained A24 destinations. Preserve `src/components/A24Nav.jsx` for A24 routes where required, and keep the portfolio shell visible over project sheets. Check `src/jesper/MasterMobile.jsx` / `src/jesper/components/MobileHud.jsx` at the 150%/960px effective viewport so a second A24 dock is not layered over the portfolio shell.
4. **Mount the existing Full catalogue.** Wire `src/jesper/components/FullIndex.jsx` / `src/jesper/webgl/FullIndexRenderer.js` into desktop `/full` and connect its featured project links to the same route/history owner. The content data already matches; no data reorder is indicated.
5. **Restore wide-screen rem scaling in a scoped way.** Review the 1500px cap in `src/styles.css`; use a Jesper-scoped scaling rule/variable if needed to avoid changing unrelated pages. Keep the rem-based dimensions in `src/jesper/jesper.css` until remeasured against upstream at 1600 and 1920.
6. **Match the small award marker.** In `src/jesper/webgl/Experience.js` (and the placeholder in `src/jesper/components/Project.jsx` if the fallback is relevant), use the reference-shaped desktop marker after confirming the asset/geometry path.
7. **Regression gate after approval:** build; repeat the six requested widths and 125%/150% zoom; test direct `/full` and all eight `/projects/:slug` routes; verify Full → project → close and browser history; repeat wheel/drag/close tests; rerun the existing phone/tablet suites to ensure the accepted ≤1024 behavior remains unchanged.

## Evidence index

- [All six upstream home captures](audit-evidence/desktop-parity/home/) and [all six local home captures](audit-evidence/desktop-parity/home/)
- [Project geometry captures](audit-evidence/desktop-parity/projects/)
- [Zoom captures](audit-evidence/desktop-parity/zoom/)
- [Full-route captures](audit-evidence/desktop-parity/routes/)
- [Structured metrics and run notes](audit-evidence/desktop-parity/metrics.json)
