# Carter Lab document (experiment detail page) in Jesper — Phase 4B

Routes: `/routes/lab/<slug>` ← Carter `/lab/<slug>` (nine slugs)

Source: `sausageOps/carterogunsola-reconstruction` at
`3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249` (read-only checkout):
`app/pages/lab/[slug].astro`, `app/components/LabDocument.astro`,
`app/data/lab.ts`, `app/styles/lab-detail.css`, `app/public/_astro/ec.2v5bd.css`
and the captured pages/panes behind `app/data/lab-evidence.ts`.

This phase ports the **shared detail-page shell** only: no experiment engine,
no scene, no interaction timeline. The Lab index (`/routes/lab`,
`LabPage.jsx`) is untouched.

## Files

| File | Role |
| --- | --- |
| `LabDetailPage.jsx` | Carter's `LabDocument` markup as React: `.labd` root, docs toggle, docs aside (Notes/Code tabs, scroll body, scroll thumb), stage, prev/count/next nav, hidden Tune button + `.labcfg`. Owns the shell's own chrome state. |
| `lab-detail.css` | Carter's `app/styles/lab-detail.css` verbatim, every selector scoped with `:where(.carter)`. Includes the RefRow block the Notes panes use. |
| `lab-detail-ec.css` | The Expressive Code stylesheet the Notes panes depend on, with its `:root`/`[data-theme]` variables rebased onto `.carter`. |
| `../../data/lab-slugs.js` | The nine slugs, names and descriptions, in Carter's order. Imported by `routes.js` and `App.jsx`, so it stays tiny. |
| `../../data/lab.js` | Carter's `LAB_ITEMS` metadata (category, `isNew`, poster, reel), `labImage()` (= Carter's `img()`), `labHref()`, the prev/next ring and `labDocument(slug)`. |
| `../../data/lab-notes/*.html` | The captured Notes pane per experiment (see provenance below). |
| `../../routes.js` | Registers the nine paths from `LAB_ENTRIES` with key `lab-detail`. |
| `../../CarterRoute.jsx` | Adds the `lab-detail` page, passes `page.slug` to it, and keys the page boundary by `key:slug` so prev/next remounts. |
| `../../../App.jsx` | Sets Carter's per-experiment `<title>` and `<meta name="description">`; two branches added, nothing else changed. |
| `../../../tools/port-lab-detail-css.mjs` | Regenerates both stylesheets from the Carter checkout (repeatable scoping). |

## Route and data mapping

| Jesper URL | Carter URL | Metadata (Carter `lab.ts`) |
| --- | --- | --- |
| `/routes/lab/live-cursors` | `/lab/live-cursors` | Live Cursors · Interaction · New · position 01 |
| `/routes/lab/dial` | `/lab/dial` | Dial · Interaction · New · 02 |
| `/routes/lab/polka-dots` | `/lab/polka-dots` | Polka Dots · Canvas · 03 |
| `/routes/lab/heart` | `/lab/heart` | Heart · Canvas · New · 04 |
| `/routes/lab/threejs-test` | `/lab/threejs-test` | ThreeJs Scene · 3D · 05 |
| `/routes/lab/dynamic-scrollbar` | `/lab/dynamic-scrollbar` | Dynamic Scrollbar · UI · 06 |
| `/routes/lab/rotating-gallery` | `/lab/rotating-gallery` | Rotating Gallery · Gallery · 07 |
| `/routes/lab/paste-up` | `/lab/paste-up` | Paste-Up · Transition · New · 08 |
| `/routes/lab/vocal-orb` | `/lab/vocal-orb` | Vocal Orb · 3D · New · 09 |

Document title is Carter's `${name} :: Lab`; the description is Carter's
per-experiment summary. Prev/next follow Carter's ring, so `live-cursors`
previous is `vocal-orb` and `vocal-orb` next is `live-cursors`, and the
odometer counts `NN / 09`. Unknown slugs are not registered, so
`/routes/lab/<unknown>` keeps its existing Jesper Section placeholder
(`navigation.js` still allows one nested segment under `routes/lab`).

## Static DOM vs engine-owned content

Carter's document splits cleanly; this port keeps the split:

| Part | Owner | Phase 4B |
| --- | --- | --- |
| `.labd` root, `data-experiment/name/prev/next/position/total` | static | ported verbatim |
| docs toggle, tabs, tags, docs body, scroll thumb | shared `lab-doc` engine | shell chrome ported; state is React (`is-docs`, `aria-pressed`, tab pill, pane `hidden`, `d`/Escape) |
| `[data-docs-scroll]` scroll + thumb sizing | shared engine | ported as a small effect (same maths as the source) |
| `[data-experiment-viewport]` | per-experiment engine | Phase 4B kept Carter's own empty state ("Experiment coming soon" over the blurred poster). Phase 5A adds only Polka Dots' source `.pd > canvas` DOM, explicitly marked as an engine placeholder; its canvas stays blank and the shell empty state remains. The other eight details are unchanged. |
| `[data-config-toggle]`, `.labcfg` | configurator (`lab-doc.js`) | rendered, `hidden`, exactly as Carter ships them until an experiment registers a config |
| prev/count/next nav | static | ported; hrefs stay Carter's (`/lab/…`, `/lab`) and the frame's link interceptor maps them to Jesper routes |
| Notes pane | build-time `set:html` | **ported verbatim** (`dangerouslySetInnerHTML`) |
| Code pane | build-time `set:html` | **deferred placeholder** inside the real pane/layout slot |

### Notes pane provenance

Identical to Carter's `app/data/lab-evidence.ts`:

- `dial`, `vocal-orb`: extracted from the saved `pages/lab_dial.html` and
  `pages/lab_vocal-orb.html` captures with Carter's own `paneContents()` logic
  (symbol-id namespacing, script/link stripping).
- `live-cursors`, `polka-dots`, `heart`, `threejs-test`, `dynamic-scrollbar`,
  `rotating-gallery`, `paste-up`: Carter's `app/data/lab-restored/<slug>.notes.html`.

71 KB total. Two documented edits, both no-ops visually:

1. `data-astro-cid-klkmuj5r` (the ArrowRoll component scope) is stripped — Carter
   styles `.arrow-roll` without a scope, so `.refrow__ext .arrow-roll` still
   applies.
2. `heart`'s inline example loses the captured `.copy` button. It is styled and
   driven by the Expressive Code JS enhancer, which is not ported; leaving a
   dead button would be worse than the original's "no CSS/JS yet" state.

## Deferred (and why)

- **Code pane content.** Carter ships ~2 MB of captured, syntax-highlighted
  listings (139–418 KB per slug), a 17 KB runtime stylesheet plus the
  `ec.*.js` enhancer that powers copy buttons and line wrapping. Porting it means
  adding an HTML-injection + second-stylesheet runtime; that is new shared
  infrastructure and was deferred by decision in this phase. The pane, its id,
  its `data-docs-pane` hook and the `.labd__code-sec` layout slot are in place,
  so the experiment phases only need to swap the pane's children.
- **Experiment engines, canvases, scenes, previews, wheel/drag controls,
  timelines, media playback, Tune panel contents.** All per-experiment work.
- **Arrow-key prev/next.** Carter's `lab-doc.js` maps `ArrowLeft`/`ArrowRight`
  to navigation. It is source-confirmed but is page interaction rather than
  static DOM; it is trivial to add with the experiment phases (the `data-prev-href`
  / `data-next-href` attributes are already on `.labd`).
- **View transitions.** Carter names `labd-stage` / `labd-toggle` / `labd-nav` for
  Astro's view transitions. The declarations are ported (harmless without a
  transition router); cross-document transitions are not part of Jesper's router.

## Responsive notes

- `.labd` is `position: fixed` with Carter's `--labd-top: 6.375rem` (102px) and
  `5rem` (80px) under `width<=47.99rem`. These are Carter's numbers for Carter's
  header. Jesper's nav is a different element: a top dock at ≥992px and a bottom
  dock below that. The board's reserve was **not** changed, per this phase's
  "preserve Carter's layout" rule — see the review note in the PR.
- Every other breakpoint (`47.99rem` docs drawer to `100vw`, the `.labcfg`
  inline rules, the reduced-motion overrides) is Carter's.

## Phase 5A — Polka Dots static DOM and CSS

Source: `app/lib/experiments/polka-dots.js` in
`sausageOps/carterogunsola-reconstruction@3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249`
(read-only). Carter's `mount()` creates a `div.pd`, appends a `canvas`, and then
appends that wrapper to `[data-experiment-viewport]`. The two experiment CSS
rules from that same source are in `polka-dots.css`, scoped to `.carter` without
changing their declarations.

`LabDetailPage.jsx` inserts this static DOM only for `polka-dots`. The wrapper
has `data-engine-placeholder="polka-dots"` to make its status explicit. Its
canvas has no backing store or context; the existing shell empty state remains
in place. The GSAP ticker, canvas drawing, theme/resize observers, pointer
handling, dot integration, and configurator are not imported or implemented.
There are no Polka-Dots-specific local assets, package changes, or dependency
upgrades. Carter's metadata and Notes pane continue to come from the Phase 4B
registry and data unchanged. The other eight experiment routes retain their
Phase 4B shell state.

## Verification performed

- `npm run build` passes; the page is its own lazy chunk
  (`LabDetailPage-*.js` 83.18 kB / 21.57 kB gzip including all nine Notes panes,
  `LabDetailPage-*.css` 51.81 kB / 8.64 kB gzip).
- All nine paths resolved through `resolveCarterPage` and rendered with
  `react-dom/server`: correct heading, `data-experiment`, position `NN` of `09`,
  prev/next hrefs and accessible labels, odometer strips, category/New chips,
  poster URL, notes content, hidden Tune/config, no injected `<script>` or
  `<link>`.
- Notes panes byte-identical to their sources after the two documented edits.
- Shell chrome in jsdom: toggle opens/closes `.is-docs` and flips
  `aria-expanded`; tabs flip `aria-pressed`, move the pill and toggle `hidden`;
  `Escape` and `d` close/open.
- Link mapping: `/lab/<slug>`, `/lab`, absolute Carter URLs and `#fragment`
  variants map to Jesper paths; external and `mailto:` links keep the browser
  default. `/routes/lab` still resolves to the Lab index, `/myself/about`,
  `/routes/writing`, `/routes/writing/the-personal-starter` unchanged.
- CSS: 0 unscoped selectors in `lab-detail.css`, 0 `:root` left in
  `lab-detail-ec.css`, all 75 EC rules still scoped by `.expressive-code`,
  declarations converted to px while media queries keep rem, keyframe names
  (`labd-*`) collide with nothing in Jesper.
- Dev server: `/routes/lab` and the detail routes serve 200, all related modules
  transform without error, `/routes/lab/unknown` still serves the placeholder.

**Not verified (tooling unavailable):** no browser could be launched in this
sandbox (`@sparticuz/chromium` is missing `libnss3`; the `puppeteer` download
host is outside the allowlist), so there are no pixel screenshots, no
desktop/tablet/mobile visual diff against Carter, and no real back/forward
button test. Everything above is DOM/CSS/module level. Fonts are Carter's
system fallbacks (Carter's licensed faces are not in either repository), and the
poster images are loaded from Carter's asset host, exactly as Phase 4A does.

### Phase 5A verification (2026-11-04)

- `npm ci` and `npm run build` passed. The detail chunk builds as
  `LabDetailPage-DUPR2Gqf.js` (83.35 kB) with its stylesheet
  `LabDetailPage-1EsWtfdY.css` (51.98 kB); no dependency files changed.
- Vite SSR with `react-dom/server` confirmed Polka Dots' route data, title
  convention, description source, Notes text, GSAP reference link, poster URL,
  previous/next links, source `.pd > canvas` markup and the shell empty state.
  The same check confirmed all other eight experiment routes still render the
  existing shell state and do not contain Polka Dots DOM.
- PostCSS comparison against Carter's inline CSS confirmed both selectors and
  every declaration match the source; only the Carter-frame scope prefix is
  added. The layout fills its parent (`inset: 0`, canvas `100%` × `100%`) and
  has no experiment-specific breakpoint.
- The production preview returned HTTP 200 for direct requests to the selected
  route (including a repeat request as a refresh smoke check), all eight other
  experiment routes, Home, Projects, About, Contact, Studio, Lab index, and
  Writing. The selected path serves the SPA entry on direct requests.
- The build contains no Polka Dots engine chunk and no `exp-polka-style` runtime
  identifier. The component imports only its CSS; there is no GSAP, `mesh.ts`,
  or engine import. The Git diff is confined to the four planned Polka-Dots
  files.

**Browser limitation:** no system browser executable, Playwright, Puppeteer, or
jsdom is installed in this sandbox. Therefore the production-preview checks
verify SPA fallback responses, and SSR verifies route markup; I could not verify
hydration, an actual in-browser refresh, loaded remote poster pixels, or visual
responsiveness with screenshots. The responsive CSS was checked structurally,
not by viewport screenshots.
