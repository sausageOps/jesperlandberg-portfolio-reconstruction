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
| `[data-experiment-viewport]` | per-experiment engine | Phase 4B kept Carter's own empty state ("Experiment coming soon" over the blurred poster). Phases 5B–5G mount the engines for Polka Dots, Heart, Rotating Gallery, Dial, Paste-Up and ThreeJs Scene; the three remaining details (`live-cursors`, `dynamic-scrollbar`, `vocal-orb`) keep Carter's empty state verbatim. See the phase sections below. |
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
- **The three remaining experiment engines** (`live-cursors`,
  `dynamic-scrollbar`, `vocal-orb`). Each needs infrastructure Jesper does not
  have — a presence backend, absent audio/cover assets, or an external model
  host plus microphone — so they stay in the placeholder state until a phase
  takes them on deliberately.
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

## Phase 5C — Heart engine

Source audit selected `heart` from the actual registry: its complete engine
(`app/lib/experiments/heart.js`, identical to `src/heart.HHFn1w7T.js` apart
from imports) needs only the already-installed GSAP ticker and no assets or
external services. Carter source remains read-only at `3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249`.
Other candidates need missing audio/CDN assets, external presence, or heavier
model/runtime dependencies. PR #14 was confirmed merged before implementation.

Added `engines/heart.js`, `HeartStage.jsx`, and scoped `heart.css`; the only
shell edits are an import, the heart-only stage conditional, and updated
comments in `LabDetailPage.jsx`. Shared runtime, dependencies, data, styles,
and unrelated experiments are unchanged. Polka Dots stays live; the other
seven experiments retain their existing placeholder state.

The engine generates `.heart > canvas`, samples the implicit heart surface
(with the source's linear-y equation, bisection and mirrored normals), and
retains all source parameters, 24 trailing layers, lighting, perspective,
coast/drag behavior, mount-time responsive resolution, capped DPR, and
mount-time reduced-motion behavior. ResizeObserver updates stage dimensions;
`observeCarterTheme` replaces the source's html theme observer. `onDestroy`
removes generated DOM, pointer listeners, observers and the GSAP ticker.
The stage renders null server-side and uses the established Phase 5B
synchronous loading/live flags (not Carter's lazy-loader minimum 1s delay).
The Tune UI remains deferred, but the engine's `config` and `set` API remain.

Verification:
- `npm run build`: passed (existing large-chunk warning remains).
- All nine detail SSR renders are byte-identical before/after the port.
- Uncommitted jsdom harness compared original/port canvas command streams
  exactly at 1440×1100, 768×1024 and 390×844, each with reduced motion on/off.
  It exercised pointer drag/release, config, resize, theme and teardown,
  checking removal of DOM/ticker and disconnection of ResizeObserver.
  Canvas, layout dimensions and ResizeObserver were stubbed: this is numeric
  and lifecycle verification, **not browser visual verification**.
- Production preview: HTTP 200 on repeated direct heart requests and sample
  Lab, Polka Dots, Dial, About and home URLs. This checks SPA fallback only,
  not browser navigation/hydration or refresh execution.
- No browser available. Visual fidelity, real desktop/tablet/mobile layout,
  real touch/capture, browser console, and route-away/return/remount behavior
  still require browser review. No pixel-fidelity claim is made.

## Phase 5D — Rotating Gallery engine

Source audit across all seven remaining unported experiments (`live-cursors`,
`dial`, `threejs-test`, `dynamic-scrollbar`, `rotating-gallery`, `paste-up`,
`vocal-orb`) selected `rotating-gallery` from Carter's actual registry and
source files at `3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249` (read-only). PR #15
(Phase 5C) was confirmed merged into `main` before implementation.

Candidate rationale:
- `rotating-gallery` (`app/lib/experiments/rotating-gallery.js`, body
  byte-identical to `src/rotating-gallery.Cu-VrtOq.js` and matching
  `app/data/lab-restored/rotating-gallery.code.html`) is pure DOM + CSS 3D
  perspective + `gsap` / `gsap/Flip` / `gsap/CustomEase` (all present in the
  already-installed `gsap@^3.13.0`), using the same
  `https://assets.carterogunsola.com` R2 image origin already used by
  `LabPage.jsx` and `data/lab.js`, with zero missing local files, zero WebGL
  contexts, zero external APIs/WebSockets/ML model hosts, and zero shared
  runtime or dependency edits.
- `paste-up` (runner-up) also uses `assets.carterogunsola.com` + `gsap`, but
  requires WebGL2 (`#version 300 es`) plus unported `mesh.ts` wireframe-grid
  and `?mesh` helpers.
- `dial` and `dynamic-scrollbar` reference local `/lab/dial-tick.mp3` and
  `/lab/music/*.mp3` + `/lab/covers/*.jpg` files that are absent (HTTP 404) in
  Carter's own reconstruction.
- `threejs-test` fetches external `Lantern.glb` from `cdn.jsdelivr.net` as its
  default subject (leaving `.tj__loading` stuck on network failure) and uses
  `.spin` CSS absent from Jesper's shared Carter styles.
- `live-cursors` requires Carter's remote PartyKit WebSocket presence server
  and unported `runtime.ts` presence client; `vocal-orb` requires external ML
  model/CDN hosts, Web Worker, AudioWorklet, WebGL2 float FBOs, and microphone
  input.

Added `engines/rotating-gallery.js`, `RotatingGalleryStage.jsx`, and
`.carter`-scoped `rotating-gallery.css`; the only shell edits in
`LabDetailPage.jsx` are the stage import, the `rotating-gallery` conditional,
and updated comments. Shared runtime, dependencies, data, global styles, and
unrelated experiments are untouched. Polka Dots and Heart remain live; the
remaining six experiments keep their existing placeholder state.

Preserved behavior and adaptations:
- Generates `.rg` (`.rg__stage > .rg__carousel + .rg__grid` and `.rg__hud`)
  inside `[data-experiment-viewport]`, arranging the 10 `DTS_Unwrapped` plates
  (`DRIFT` … `VAPOR`) around the vertical-plane `translate3d` ring with static
  `500 + cos(θ)·100` z-index order inside `isolation: isolate`, continuous
  exponential drift, axis-locked pointer drag + release momentum, non-passive
  wheel scrub, fine-pointer hover preview, `ArrowLeft` / `ArrowRight` / `g`
  keyboard controls, dual odometer + title strips, opening `clip-path` + HUD
  reveal timeline, Carousel ↔ Grid `Flip` morph (`5` columns desktop, `2`
  columns `<= 47.99rem`), mount-time `prefers-reduced-motion: reduce` handling,
  and live CSS token theming (`--card-solid`, `--ink`, `--ink-muted`, `--fill`,
  `--surface`).
- Inline `#exp-rg-style` `<style>` injection is replaced by static
  `rotating-gallery.css` scoped under `:where(.carter)`.
- `onDestroy` registers idempotent teardown aborting all stage/window/button/
  hover/keyboard listeners, disconnecting `ResizeObserver`, detaching
  `gsap.ticker`, clearing `wheelIdle` and `keyIdle` timeouts, killing the
  opening timeline, active `Flip` animations, and element tweens, and removing
  `.rg`. The Tune UI remains deferred while `config` and `set` are preserved.

Verification:
- `npm run build`: passed (`LabDetailPage-*.js` 132.36 kB / 41.82 kB gzip,
  `LabDetailPage-*.css` 55.55 kB / 9.38 kB gzip; 29/29 CSS rules scoped under
  `:where(.carter)`, 0 leaked declaration `rem` units, media query preserved at
  `47.99rem`, no `exp-rg-style` runtime injection).
- Vite SSR (`react-dom/server`) across all nine `/routes/lab/<slug>` routes,
  `/routes/lab`, `/myself/about`, and unknown Lab slug resolution: passed;
  `RotatingGalleryStage` renders `null` server-side and all other six unported
  routes keep their `.labd__empty` placeholder without `.rg` DOM.
- Uncommitted Node DOM harness compared Carter's original
  `app/lib/experiments/rotating-gallery.js` and `engines/rotating-gallery.js`
  at 1440×1100, 768×1024, and 390×844 with reduced motion off/on across 120
  ticker frames (exact match on `--rg-card-w`, perspective, `zIndex`,
  `translate3d` transforms, odometer strips, and title strip), and exercised
  hover, pointer drag/release, wheel scrub, keyboard controls, Carousel ↔ Grid
  `Flip` morph, `ResizeObserver`, theme switching, `set()` config updates, and
  5× mount → `destroyAll()` remount cycles with zero leaked DOM, window
  listeners, or `ResizeObserver` observations. Layout geometry and DOM APIs
  were mocked in Node: this is numeric, structural, and lifecycle verification,
  **not browser visual verification**.
- Production preview (`vite preview`): HTTP 200 on repeated direct requests to
  `/routes/lab/rotating-gallery`, all other eight Lab detail routes,
  `/routes/lab/unknown`, `/routes/lab`, `/`, `/projects`, `/myself/about`,
  `/contact`, `/routes/studio`, `/routes/writing`,
  `/routes/writing/the-personal-starter`, and built `LabDetailPage` JS/CSS
  assets (SPA fallback + asset serving check only, not browser hydration).
- No browser executable is available in this sandbox: rendered visual fidelity,
  live remote `assets.carterogunsola.com` plate image decode, real CSS 3D
  perspective/Flip compositing across desktop/tablet/mobile viewports, pointer
  capture/touch feel, live browser console, and in-browser route transitions
  remain unverified and require human browser review. No pixel-fidelity claim
  is made.

## Phase 5E — Dial engine

Source audit across all six remaining unported experiments (`live-cursors`,
`dial`, `threejs-test`, `dynamic-scrollbar`, `paste-up`, `vocal-orb`) selected
`dial` from Carter's actual registry and source files at
`3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249` (read-only). PR #16 (Phase 5D) was
confirmed merged into `main` before implementation.

Candidate rationale:
- `dial` (`app/lib/experiments/dial.js`, body byte-identical to
  `src/dial._0WTp1k0.js` apart from the `../mesh.ts` specifier; Carter's own
  fidelity check, `recon/lab/engines.md` §3) is pure DOM + CSS transforms +
  `gsap.ticker`/tweens — the GSAP core already installed as `gsap@^3.13.0`. It
  needs **no** image, model, font, WebGL or WebSocket asset, has no external
  service, and requires no shared-runtime, dependency or CSS-token change: every
  token it reads (`--ink`, `--ink-muted`, `--surface`, `--paper`,
  `--font-sans`, `--track`, `--ease-out-quad`, `--ease-out-expo`) already exists
  in `styles/tokens.css`.
- `paste-up` (runner-up) is the same DOM layout plus a **WebGL2**
  (`#version 300 es`) print-plane engine, Carter's procedural grid-texture helper
  from `mesh.ts` and 6 remote `assets.carterogunsola.com` prints — higher risk.
- `threejs-test` loads `Lantern.glb` from `cdn.jsdelivr.net` as its default
  subject, needs an unported OrbitControls/RoomEnvironment, reads an absent
  `.spin` helper and dereferences `X.find(...).sf` for the first subject.
- `dynamic-scrollbar` needs three `/lab/music/*.mp3` tracks plus
  `/lab/covers/*.jpg`; all absent (404 in Carter's own reconstruction).
- `live-cursors` needs Carter's remote PartyKit presence server and the
  unported `runtime.ts` socket client. `vocal-orb` needs external ML model
  hosts, a worker/AudioWorklet, WebGL2 float FBOs and microphone input.

### Added

| File | Role |
| --- | --- |
| `src/carter/engines/dial.js` | The engine: `mountDial(host)` returning `{ destroy, set }`, plus `config` and the Carter-shaped default export. |
| `src/carter/engines/dial-channels.js` | Carter's 26-channel table and inline SVG glyphs, copied verbatim (only the minified bindings renamed `t`→`GLYPHS`, `n`→`CHANNELS`; verified equal after normalisation). |
| `src/carter/pages/lab/DialStage.jsx` | Route stage: loading → live flags, mounts the engine into `[data-experiment-viewport]`, renders `null` server-side. |
| `src/carter/pages/lab/dial.css` | Carter's inline `#exp-dial-style` block, every selector prefixed `:where(.carter)`; declarations unchanged. |

The only edit to an existing file is `LabDetailPage.jsx`: one import, one
`{item.slug === 'dial' && <DialStage />}` conditional, and updated comments.
Shared runtime, dependencies, data, global styles and the other eight
experiments are untouched.

### Behavior preserved

Full 26-channel ring on a hub off the left edge with the single
`conic-gradient` cover painting back everything but an angular window; 130-tick
ruler spun by one transform; `damp(cur, target, dragging ? 15 : 25, dt)` settle
with `stepPx: 62`; pointer drag with the `> 4px` move guard that suppresses
navigation; non-passive wheel scrub (`stepPx * 3`, `150ms` idle handoff);
`ArrowUp/Left` · `ArrowDown/Right` stepping; detent snaps via
`elastic.out(2, 0.6)` / `back.out(1.7)` / `power3.out`; the grip hand; the
active-channel handoff with `1.08` icon scale and `aria-selected`; and the
opening choreography (`0.6s` fade, knob `scale 0.4 / rotate -160` over `1s`,
`1.4s` wind-down). Reduced motion is read once at mount, as in the source.

### Adaptations from Carter

1. `import { f as e } from '../mesh.ts'` → `import gsap from 'gsap'` (the only
   binding the body uses).
2. The channel table/glyphs moved to `dial-channels.js` (verbatim).
3. The inline `<style>` is now `dial.css`, scoped to `.carter`.
4. `<html data-theme>` has no equivalent; the stylesheet reads live tokens, so
   the dial follows the frame's theme.
5. `onDestroy` teardown is idempotent and complete: one `AbortController` for
   every listener, `ResizeObserver` disconnect, `gsap.ticker` removal, detent and
   opening tween kills (the opening wind-down tween is now held in a variable so
   it can be killed, which the source leaves unreachable), the wheel-idle timer,
   the audio pool, and the generated `.dial` DOM.
6. **Missing click asset — not substituted.** Carter's `/lab/dial-tick.mp3` is
   absent from its own reconstruction (404, recorded in Carter Phase 8) and is
   absent here. Nothing is generated in its place. The source already tolerates
   it (`try`/`catch`, swallowed `play()` rejection, no-op when the pool is
   empty), so the dial is silent but fully usable. Two constant deviations keep
   that silent and cheap: `preload` `'none'` instead of `'auto'`, and a 3-object
   pool instead of 8.

### Verification

Run with `CARTER_REF=<carter-checkout> node verify/dial-verify.mjs`
(`verify/README.md` documents scope and limits). All checks compare against
Carter's unmodified source loaded from the read-only checkout at run time.

- `npm run build`: passed (`LabDetailPage-*.js` 173.94 kB / 59.39 kB gzip,
  `LabDetailPage-*.css` 58.28 kB / 9.87 kB gzip). No runtime `<style>`
  injection remains; all 20 `dial.css` selectors are `:where(.carter)`-scoped.
- **Section A, original vs port: exact match, `maxFloatDelta = 0`** on 7 checks
  × 3 viewports (1440×900, 768×1024, 390×844) × reduced-motion off/on = 42
  checks, covering all 26 item transforms, the tick ring, grip, knob geometry,
  cover centre, active channel and `aria-selected` after open, wheel, arrow-key
  settle, drag + elastic release, `set()`, resize re-measure and teardown.
- **Section B, real integration path** (`CarterRoute` → `LabDetailPage` →
  `DialStage` → engine, React in jsdom): 19 checks — single `.dial`, 26 items /
  130 ticks, loading→live flags, ARIA, external-link safety, opening wind-down,
  wheel scrub, arrow stepping, drag + release, 12 route changes with zero
  listener/observer/DOM growth, five unported routes still placeholder-only,
  each ported route mounting only its own engine, no console errors, and full
  teardown. Plus 4 audio checks for the absent asset.
- 65/65 checks passed on 5+ consecutive runs (A exact each time).
- Production preview: HTTP 200 on repeated direct `/routes/lab/dial` requests
  and on all eight other Lab detail routes, `/routes/lab/unknown`, `/routes/lab`,
  `/`, `/projects`, `/myself/about`, `/contact`, `/routes/studio`,
  `/routes/writing` and `/routes/writing/the-personal-starter`.
- SSR (`react-dom/server`) across the nine detail routes: only `dial` gained a
  stage host; the other five unported routes keep the `.labd__empty` placeholder
  unchanged (their markup byte counts are identical to pre-port).

**Browser limitation:** no Chromium can launch in this sandbox (missing system
libraries, no root to install them), so rendering is not visually verified.
jsdom has no layout engine, CSS cascade, canvas or compositing: geometry is
stubbed from the requested viewport, so the conic cover's painting, real CSS
transforms/fonts, touch and pointer-capture feel, actual audio playback,
desktop/tablet/mobile rendering, and pixel fidelity all remain unverified and
need human browser review. No pixel-fidelity claim is made.

## Phase 5F — Paste-Up engine

Source audit of the **five** experiments still unported from Carter's registry
(`app/lib/lab-experiments.js`) and source files at
`3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249` (read-only), selected `paste-up`.
PR #17 (Phase 5E / Dial) was confirmed merged into `main` before implementation.

### Candidate comparison

| Experiment | Source | Needs | Verdict |
| --- | --- | --- | --- |
| `paste-up` | `app/lib/experiments/paste-up.js` (11.9 kB, body identical to `src/paste-up.DESythSE.js`) | GSAP ticker + 6 prints on `assets.carterogunsola.com` (the origin Rotating Gallery already loads); WebGL2 with Carter's own no-WebGL fallback | **selected** |
| `dynamic-scrollbar` | `dynamic-scrollbar.Ia0FQs2Y.js` | three `/lab/music/*.mp3` + `/lab/covers/*.jpg` — **absent (404) in Carter's own reconstruction**; the mini player is a third of the experiment | missing assets |
| `threejs-test` | `threejs-test.CNSPgjYT.js` (79.7 kB) | `Lantern.glb` from `cdn.jsdelivr.net` as the default subject, embedded OrbitControls, three r185 chunks vs Jesper's r180 | remote model + version gap |
| `live-cursors` | `live-cursors.js` | Carter's PartyKit presence host and the unported `runtime.ts` socket client; a single visitor sees an empty stage | external service |
| `vocal-orb` | `vocal-orb.js` (926 lines) | `cdn.jsdelivr.net` transformers.js, `huggingface.co` models, worker/AudioWorklet, WebGL2 float FBOs, microphone | external model host |

`paste-up` is the only remaining engine whose own "Dependencies" row in Carter's
Notes pane is *"GSAP Core :: ticker"*. Nothing was substituted: the six prints
come from the same CDN collection Rotating Gallery already uses, and the one
piece of Carter's shared runtime it touches (`mesh.ts`'s grid texture) is inlined
verbatim rather than replaced.

### Added

| File | Role |
| --- | --- |
| `src/carter/engines/paste-up.js` | The engine: `mountPasteUp(host)` returning `{ destroy, set }`, the Tune descriptors as `config`, and the Carter-shaped default export. Includes Carter's `kd()` grid-texture helper, inlined verbatim. |
| `src/carter/pages/lab/PasteUpStage.jsx` | Route stage: loading → live flags, mounts the engine into `[data-experiment-viewport]`, renders `null` server-side. |
| `src/carter/pages/lab/paste-up.css` | Carter's inline `<style data-lab-style="paste-up">` block, every selector prefixed `:where(.carter)`; declarations unchanged. |

The only edit to an existing file is `LabDetailPage.jsx`: one import, one
`{item.slug === 'paste-up' && <PasteUpStage />}` conditional, and updated
comments. Shared runtime, dependencies, data, global styles, the Lab detail
shell and the other eight experiments are untouched.

### Behavior preserved

Six prints (`p0`…`p5`) claimed by `data-print` on real DOM boxes across three
boards (index 2×3, spread plate + 5-row rail, strip of six 3:4 columns). The DOM
lays the boxes out and one WebGL2 canvas draws each print as a plane exactly on
its box; there is no per-transition animation, only `measure()` caching each
claim's rect and the ticker damping every plane toward it (`DAMP = 0.085`).
Paper bow `(1 − sin(π·uv)) · vel` with velocity smoothed `0.8/0.2`, clamped at
`48px/frame` and scaled by `0.4`; speed-sorted draw order so a flying print
crosses over parked ones; `object-fit: cover` crop in the fragment shader;
premultiplied alpha for the placeholder grid's transparent ground. Both demo
knobs work: `fetch` (fake navigation latency — old board torn down, planes hold
through the dwell, then fly late) and `memory` (a `0×0` home from a hidden board
is refused; off, the planes collapse into the corner and pop). Tabs with one
shared underline, click and `Enter`/`Space` selection, plate swap by attribute
write, `BOARD::…` HUD, 720 → 1440 hi-res texture upgrade, `1.5` DPR cap,
mount-time reduced-motion snapping and Carter's no-WebGL2 fallback (canvas
removed, plain `<img>` in every box, swaps become cuts).

### Adaptations from Carter

1. `import { f, r, t } from "../mesh.ts"` → `gsap` for `f`; `r` (Carter's `kd`
   pencil-grid canvas texture) inlined verbatim as `gridTexture()`; `t` (the
   site-wide `?mesh` wireframe singleton) → `MESH_ON = false`, which is Carter's
   own default (off unless `?mesh` is in the URL). The `MESH_ON` branches stay
   in place; Jesper's Carter frame has no mesh debug mode to enable.
2. `import { img } from "../assets.ts"` → the inline `ASSETS_ORIGIN` helper,
   matching `LabPage.jsx`, `data/lab.js` and the Rotating Gallery port.
3. The inline `<style>` is now `paste-up.css`, scoped to `.carter`.
4. `--ink` is read from the Carter frame root (where the tokens live), not
   `document.documentElement`.
5. One `AbortController` for every listener, `ResizeObserver` disconnect, ticker
   removal, `fetch` timer clear, `WEBGL_lose_context` release, generated `pu`
   DOM removal — all behind an idempotent `onDestroy` teardown.
6. Carter returns a bare cleanup function on the no-WebGL2 path; the port
   returns the same `{ destroy, set }` shape on both paths so the stage tears
   down uniformly.
7. **Carter's no-WebGL2 path has a real bug and the port fixes it.** The early
   `if (!gl) return …` sits above `let Z = true`, so Carter's first board switch
   dies with `ReferenceError: Cannot access 'Z' before initialization` and the
   page stays on `BOARD::INDEX`. The port declares `dirty`/`invalidate()` above
   that branch, so the fallback the Notes pane promises ("the page still works,
   which was his first point") actually works. Recorded, not silently changed:
   the harness asserts both behaviours.

### Verification

Run with `CARTER_REF=<carter-checkout> node verify/paste-up-verify.mjs`
(`verify/README.md` documents scope and limits).

- `npm run build`: passed (`LabDetailPage-*.js` 184.68 kB / 63.69 kB gzip,
  `LabDetailPage-*.css` 60.80 kB / 10.30 kB gzip; +10.7 kB JS / +2.5 kB CSS over
  the Phase 5E baseline). No runtime `<style>` injection remains (`0` hits for
  `data-lab-style` in the build); no dependency or lockfile change.
- `verify/paste-up-css.mjs`: 19/19 rules identical to Carter's inline block —
  same order, same selectors (plus the `:where(.carter)` scope), same
  declarations, `0` unscoped selectors, `0` `rem` declarations, no keyframes.
- **Section A, original vs port: exact match, `maxFloatDelta = 0`** on 18 checks
  × 3 viewports (1440×900, 768×1024, 390×844) × reduced-motion off/on, covering
  mount state and the placeholder grid (including the ink colour), index
  settle, the spread switch's first frame, spread settle, plate swap, plate
  click back to the index, `Enter` selection, the `fetch` dwell (planes hold
  still, then fly late), the `memory`-off collapse-then-pop, `set('damp'/'bend')`,
  resize re-measure, teardown, the no-WebGL2 fallback (18 images, exact URLs)
  and the single 1440 hi-res upgrade.
- **Section B, real integration path** (`CarterRoute` → `LabDetailPage` →
  `PasteUpStage` → engine, React in jsdom, one recording WebGL2 context):
  22 checks — single `.pu`, 3 boards / 18 slots / 3 tabs, loading→live flags,
  the shell's `.labd__empty` still mounted, canvas at the DPR cap, 6 planes with
  6 textures and premultiplied blending, placeholder grid from the frame ink,
  tab switching (board + tab + underline + HUD), plate swap, `Enter` return,
  index-click → spread, 6 route round-trips with zero DOM/observer/listener
  growth and 6 released GL contexts, the four unported routes still
  placeholder-only, each ported route mounting only its own engine, no
  paste-up console error, and full teardown on unmount.
- SSR (`react-dom/server`) across the nine detail routes: **all nine markup
  hashes are byte-identical to the base commit**; no route gains engine DOM
  (every stage still renders `null`).
- Production preview: HTTP 200 on three consecutive direct requests to
  `/routes/lab/paste-up` (refresh smoke), all eight other detail routes,
  `/routes/lab/unknown`, `/routes/lab`, `/`, `/projects`, `/myself/about`,
  `/contact`, `/routes/studio`, `/routes/writing`,
  `/routes/writing/the-personal-starter`, and on the built `LabDetailPage` /
  `CarterRoute` JS and CSS assets.

**Browser limitation:** no browser executable exists in this sandbox (and the
asset host is unreachable from it), so the rendered result is not visually
verified. jsdom has no layout, CSS cascade, GPU or image decoding: geometry is a
deterministic model of paste-up's own grid templates, canvas output is recorded
rather than rasterised, and photographs are stubs. Therefore the actual
photograph decode over CORS, the real `#version 300 es` GPU output, the bow's
look at speed, real CSS grid layout at each breakpoint, touch/pointer feel and
pixel fidelity remain unverified and need human browser review. No
pixel-fidelity claim is made.

## Phase 5G — ThreeJs Scene engine

Source audit of the **three** experiments still unported from Carter's registry
(`app/lib/lab-experiments.js`) and source files at
`3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249` (read-only), selected `threejs-test`
(Carter's title: *ThreeJs Scene*). PR #18 (Phase 5F / Paste-Up) was confirmed
merged into `main` (`bd019bb7`) before implementation.

### Candidate comparison

| Experiment | Source | Needs | Verdict |
| --- | --- | --- | --- |
| `threejs-test` | `app/lib/experiments/threejs-test.js` (58 lines minified, 79.7 kB; body identical to `src/threejs-test.CNSPgjYT.js`) + `src/RoomEnvironment.CsPbsEjR.js` + `src/GLTFLoader.BD7CsO-c.js` | `Lantern.glb` (a public Khronos sample, pinned by commit in Carter's own URL), embedded `OrbitControls` + `MeshSurfaceSampler`, three r185 chunks vs Jesper's installed `three@0.180.0` | **selected** |
| `dynamic-scrollbar` | `dynamic-scrollbar.Ia0FQs2Y.js` | six `/lab/music/*.mp3` and `/lab/covers/*.jpg` — **absent (404) in Carter's own reconstruction**; the audio player is the experiment | missing assets |
| `live-cursors` | `live-cursors.js` | Carter's PartyKit/Cloudflare Durable Object presence host and the unported socket client; with no peers the stage stays empty | external service |
| `vocal-orb` | `vocal-orb.js` (926 lines) | `cdn.jsdelivr.net` transformers.js, `huggingface.co` models, an ONNX Worker + AudioWorklet, WebGL2 float bloom FBOs, the microphone | external model host + mic permission |

`threejs-test` is the only remaining engine whose dependencies are all present
or public and version-checkable:

- Every symbol it imports was mapped from Carter's minified `three` chunk to
  `three@0.180.0` — 31 bindings in the experiment (`Spherical`, `Controls`,
  `PMREMGenerator`, `MeshMatcapMaterial`, `MeshPhysicalMaterial`,
  `WebGLRenderTarget`, `MOUSE`, `TOUCH`, …) and 8 in `RoomEnvironment`
  (`MeshStandardMaterial`, `InstancedMesh`, `MeshLambertMaterial`, `Object3D`,
  `BoxGeometry`, `PointLight`, `BackSide`). All exist with the same API.
- `OrbitControls` and `MeshSurfaceSampler` are **already embedded** in Carter's
  file (he did not import the jsm modules), so they port verbatim with no
  behavioural gap.
- The one model, `Lantern.glb`, is loaded over HTTPS from
  `cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@2bac6f8c…`. That is the
  same file content as the Khronos repository commit, and Carter's URLs are kept
  verbatim rather than re-hosted.
- Carter's `GLTFLoader` (r185) and `three@0.180.0`'s
  `examples/jsm/loaders/GLTFLoader.js` were run against the actual 9.2 MB asset
  (sparse checkout of the pinned Khronos commit, kept in `/tmp`, **not**
  vendored): both parse 3 meshes / 3 primitives, and the resulting
  position/normal/uv/index arrays and node transforms are identical
  (`LanternPole_Body` 926 verts / 2,616 indices, `LanternPole_Chain`
  756 / 3,744, `LanternPole_Lantern` 2,463 / 9,822).

### Added

| File | Role |
| --- | --- |
| `src/carter/engines/threejs-test.js` | The engine: `mountThreeJsTest(host)` returning `{ destroy, set }`, the seven Tune descriptors as `config`, and the Carter-shaped default export. Contains Carter's embedded `OrbitControls`, `MeshSurfaceSampler` and `RoomEnvironment` verbatim, the matcap baker, the four superformula subjects, the `Lantern.glb` pipeline and the reduced-motion paths. |
| `src/carter/pages/lab/ThreeJsTestStage.jsx` | Route stage: loading → live flags, mounts into `[data-experiment-viewport]`, renders `null` server-side. |
| `src/carter/pages/lab/threejs-test.css` | Carter's inline `#exp-three-style` block, every selector prefixed `:where(.carter)`; declarations unchanged. Adds Carter's `.spin` waiting mark from `app/styles/global.scss` (scoped to `:where(.carter .tj)`) and its `@keyframes spin-turn`, both verbatim. |

The only edit to an existing file is `LabDetailPage.jsx`: one import, one
`{item.slug === 'threejs-test' && <ThreeJsTestStage />}` conditional, and updated
comments. Shared runtime, dependencies, lockfile, data, global styles, the Lab
detail shell and the other eight experiments are untouched. No new package was
added — the port uses the `three` that Jesper already installs.

### Behavior preserved

- **Stage DOM**: `div.tj` with the `.tj__loading` spinner line ("Loading model"),
  two stacked segmented controls (Subject / Render mode) with their sliding
  `.tj__pill`, and a `WebGLRenderer` canvas. `data-ready` on `.tj` fades the
  loading mark out when the model lands.
- **Five subjects**: `Lantern` (the glTF) plus four superformula solids (Orb,
  Bloom, Shell, Spike) sampled into a 120 × 72 grid (8,833 vertices, 51,840
  indices) with Carter's seam-weld at ±π and his `SIZE / 2.9` normalisation.
- **Three render modes** over the same geometry: Shaded (`MeshMatcapMaterial`),
  Wire (`MeshBasicMaterial` wireframe at 0.55 opacity) and Points (a 20,000-point
  `MeshSurfaceSampler` cloud, area-weighted per mesh, minimum 400 per mesh).
- **Matcap baker**: `CarterRoomEnvironment` → `PMREMGenerator.fromScene(…, 0.04)`
  → a 256² `WebGLRenderTarget` of a `MeshPhysicalMaterial` ball with Carter's key
  and fill lights, re-baked on every Finish/Polish change with his
  `roughness − polish · 0.45` / `metalness + max(0, polish) · 0.6` maths.
- **Interactions**: `OrbitControls` with `enablePan = false`,
  `minDistance = SIZE·1.4`, `maxDistance = SIZE·4.5`, polar clamp `0.15 … 0.9π`,
  damping `0.08`, `autoRotate` at the Spin value; subject morphing
  (`easeOutExpo` over 0.9 s; 0.35 s when Lobes/Sharp are tuned) and the
  0.7 s scale swap between the model group and the superformula group.
- **Resize**: `ResizeObserver` on `.tj` → `setSize(w, h, false)` (CSS keeps the
  display size), DPR capped at 2, camera aspect and both pills re-measured.
- **Theme**: re-reads `--ink` and re-inks the wire and point materials; the
  `Accent` Tune value overrides both (`var(--ink)` returns to the theme ink).
  Shaded goes white so the matcap carries the colour.
- **Reduced motion**: `enableDamping`/`autoRotate` off, no rAF loop at all
  (renders are driven by the `change` event and explicit calls), morphs snap,
  group swaps snap, and the `.spin` mark holds still (Carter's global rule).
- **Tune config**: `accent` (swatch), `finish` (studio/chrome/wax/ink),
  `polish`, `spin`, `pointSize`, `lobes`, `sharp` — the same seven keys,
  ranges, steps and defaults as Carter's `config`.
- **Graceful degradation**: with no WebGL the engine throws, the stage reports
  failure and the Lab detail keeps its own empty state.

### Adaptations from Carter

1. Three.js imports point at Jesper's installed `three` (`^0.180.0`) and
   `three/examples/jsm/loaders/GLTFLoader.js` instead of Carter's bundled
   `src/three.module.DBbmgHoE.js` / `src/GLTFLoader.BD7CsO-c.js` chunks. This is
   the same dependency, one minor version back; no second copy is bundled.
2. Carter's `RoomEnvironment` (`src/RoomEnvironment.CsPbsEjR.js`, r185) is
   **inlined verbatim** rather than imported from r180's jsm module, because r185
   sets `this.position.y = -3.5` and r180 does not — the env map, and therefore
   every baked matcap, depends on it.
3. The inline `<style id="exp-three-style">` injection is now
   `threejs-test.css`, scoped to `.carter`. `.spin` is Carter's global
   `app/styles/global.scss` atom; it is reproduced here because this is its only
   ported consumer.
4. Theme observation: Carter mutates `document.documentElement`; the port uses
   `observeCarterTheme` when the Carter frame is bound and falls back to a
   `MutationObserver` on the frame root (or `document.documentElement` when
   mounted standalone by the harness).
5. `--ink` is read with the host document's own `getComputedStyle`, so the
   colour comes from the Carter frame's tokens rather than Jesper's document.
6. Teardown is complete and idempotent behind `onDestroy`: `AbortController` for
   the eight button listeners, `cancelAnimationFrame`, `ResizeObserver` and
   theme observer disconnect, `controls.dispose()` **before** the canvas is
   detached (so its capture-phase `keydown`/`keyup` pairs still resolve from
   `getRootNode()`), disposal of every model/superformula/sampled geometry and
   the three shared materials, the baker (render target, PMREM, env scene),
   `renderer.dispose()` + `forceContextLoss()` and removal of `.tj`.
7. Two cleanup bugs in Carter's source are fixed and recorded, not silently
   changed:
   - his `destroy()` never disposes the **discarded glTF PBR materials and
     textures** (they are replaced by the matcap material); the port disposes
     them, including `ImageBitmap.close()`, right after the swap;
   - his `destroy()` also leaks the `keyup` listener `OrbitControls` adds when
     Control is held, and leaves the `div.tj` in the DOM when `WebGLRenderer`
     throws (a dead spinner over the Lab detail). The port removes the root
     before rethrowing, and if `GLTFLoader` resolves after unmount it disposes
     the resolved scene instead of adding it to a destroyed scene.
8. `RoomEnvironment` is disposed immediately after the PMREM bake (Carter keeps
   it alive for the page lifetime).

### Verification

Run with `CARTER_REF=<carter-checkout> node verify/threejs-test-verify.mjs`
(`verify/README.md` documents scope and limits). `LANTERN_GLB` defaults to the
sparse Khronos checkout in `/tmp`; the harness never downloads anything.

- `npm run build`: passed. `LabDetailPage-*.js` 220.50 kB / 74.14 kB gzip,
  `LabDetailPage-*.css` 63.98 kB / 10.94 kB gzip (+35.8 kB JS / +3.2 kB CSS over
  the Phase 5F baseline, all of it `three` and the engine). `0` hits for
  `data-lab-style` / `exp-three-style` / `.appendChild(style)`: no runtime style
  injection remains. The only `cdn.jsdelivr.net` reference in the whole bundle is
  Carter's pinned `Lantern.glb` URL. `package.json` and `package-lock.json` are
  unchanged.
- `verify/threejs-test-css.mjs`: 16/16 of Carter's inline rules identical in
  order, selector (plus the `:where(.carter)` scope), declarations and enclosing
  at-rule; the two extra rules are the `.spin` mark and its reduced-motion
  override, both compared declaration-by-declaration against
  `app/styles/global.scss`; `2` at-media blocks (`40rem`, `prefers-reduced-motion`)
  and exactly one `@keyframes spin-turn`; `0` unscoped selectors; the built
  stylesheet has `0` `rem` left in `.tj` declarations (the 10 source `rem`
  values, matching Carter's 10, are compiled to `px` by the build).
- **Section A, original vs port (94 checks, 94 pass).** Carter's own
  `threejs-test.js` is rewritten at run time (only its three chunk imports) and
  mounted next to the port in separate jsdom windows with an identical stub
  WebGL2 context, staged layout, stubbed `fetch` fed the real `Lantern.glb`, a
  `createImageBitmap` stub and one shared `three` module instance. The engines
  are mounted one at a time — `FileLoader` dedupes concurrent requests to one URL
  in a module-level map, so overlapping mounts would make the second engine
  attach to the first engine's in-flight loads — and then stepped frame by frame
  on their own rAF queues with identical timestamps. Covered: mount DOM (loading
  mark, 5 subjects, 3 modes, both pills), model load and `data-ready`, GLTF
  texture/geometry/buffer traffic (5 fetches, 4 bitmaps, 12 texture uploads,
  60 buffer calls / 789,036 B on both), the three render-mode switches, Lantern →
  Orb morph, Orb → Shell re-sample, Shell → Lantern group swap, a 13-value
  `set()` sweep (finish/polish/spin/pointSize/lobes/sharp/accent), resize
  re-render and teardown, at 1440×900, 768×1024 and 390×844 with reduced motion
  off and on. Every snapshot matched exactly (`maxFloatDelta = 0` on the settled
  frames). Plus: no-WebGL behaviour (both throw; only the port leaves no dead
  `.tj`) and destroy-mid-load (no DOM, no observers, no pending frame, no
  late geometry added).
- Teardown parity detail worth recording: on the animated path Carter's own
  `destroy()` leaves **one** pending rAF callback per mount (it cancels the
  handle stored during the previous frame); the port leaves none. The harness
  asserts that difference explicitly rather than hiding it.
- **Section B, real integration path** (`CarterRoute` → `LabDetailPage` →
  `ThreeJsTestStage` → engine, React in jsdom, the port's canvas backed by the
  stub context and the app bundle's own `three` copy): 14 checks — single `.tj`,
  5 subject + 3 mode segments with 2 pills and one canvas, loading→live flags,
  the shell's `.labd__empty` still mounted, first subject/mode pressed with the
  loading mark present, canvas backing store at `2880×1800` (stage × the 2× DPR
  cap), `Lantern.glb` resolving through the bundle to `data-ready`,
  mode switching, Bloom morph settling, a `data-theme` flip re-inking without a
  throw, **3 route round-trips** with exactly one `.tj` on return, no growth in
  window listeners / `ResizeObserver`s / pending frames, the three unported
  routes still placeholder-only and `data-stage-live` absent there, zero console
  errors, and full teardown on unmount.
- SSR (`react-dom/server`) across the nine detail routes: **all nine markup
  hashes byte-identical** to the pre-edit baseline recorded before any Phase 5G
  change; no route gains engine DOM (`tj: 0`, `tj__`: 0 everywhere), and no
  route gains `data-stage-live` or `data-stage-loading`.
- Built output served by `vite preview`: HTTP 200 for `/lab/threejs-test`,
  `/lab/live-cursors`, `/lab/dynamic-scrollbar`, `/lab/vocal-orb`,
  `/lab/paste-up`, `/lab/dial` and for every emitted JS/CSS asset; the SPA shell
  is served for each route (this app renders client-side, so route markup is not
  in the HTML).

**Browser limitation:** no browser executable exists in this sandbox, so nothing
here is visual verification. jsdom has no layout engine, CSS cascade, GPU or
image decoding; the WebGL context is a recorded stub, so GL *commands and
payload sizes* are compared but nothing is rasterised, and the matcap bake's
appearance, the superformula surfaces' shading, the point cloud's density, real
`Lantern.glb` decoding over CORS, and the scene's look at each breakpoint remain
**unverified**. Pointer/touch orbit feel, real DPR changes and reduced-motion
mode also need human browser review. No pixel-fidelity claim is made.

### Phase 5J: Vocal Orb

The final registry entry now has an isolated engine, stage and Vocal Orb-only
Tune adapter. See [VOCAL_ORB_5J.md](./VOCAL_ORB_5J.md) for the source comparison,
dependency manifest, browser gate, scope and test limitations. The earlier
phase-specific deferred-stage tables above are historical. Model/audio parity
is not claimed until the documented unrestricted-browser gate passes. Code pane
content and tuned-copy integration remain deferred to shared docs.
