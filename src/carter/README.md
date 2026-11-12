# Carter integration layer (`src/carter/`)

This is the shared foundation for porting three pages from Carter's site
(`sausageOps/carterogunsola-reconstruction`, an Astro build) into Jesper's React
shell, as faithfully as possible:

| Key            | Jesper route                           | Carter route                    |
| -------------- | -------------------------------------- | ------------------------------- |
| `about`        | `/myself/about`                        | `/about`                        |
| `lab`          | `/routes/lab`                          | `/lab`                          |
| `writing`      | `/routes/writing`                      | `/writing`                      |
| `writing-post` | `/routes/writing/the-personal-starter` | `/writing/the-personal-starter` |
| `lab-detail`   | `/routes/lab/<slug>` (nine)            | `/lab/<slug>`                   |

Jesper's shell stays Jesper's: the WebGL Experience, navigation, HUD, Loader and
every other route are untouched. Carter code runs inside one isolated frame.

## Files

| File                  | Role                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `routes.js`           | Route registry, `resolveCarterPage(path)`, and `toJesperPath(href)` for Carter's internal links. Imported statically by `App.jsx`; no React, no CSS. |
| `CarterRoute.jsx`     | The route-level frame (Jesper's version of Carter's `BaseLayout`), loaded lazily by `App.jsx`. Imports the shared styles.     |
| `runtime.js`          | The runtime contract Carter's engines import (lifecycle, veil, scroll, theme, navigation).                                     |
| `useCarterEngine.js`  | Hook that mounts an engine once from a page component.                                                                         |
| `styles/fonts.css`    | Carter's font faces under "Carter"-prefixed family names.                                                                     |
| `styles/tokens.css`   | Carter's design tokens and light/dark themes, scoped to `.carter`.                                                             |
| `styles/base.css`     | Scope root (Carter's `html`/`body`), reset, `.text-*`, `.container`, shared utilities.                                         |
| `styles/atoms.css`    | Atoms used by two or more pages: arrow-roll, chip, linkcircle, closebox, row, signature.                                       |
| `styles/frame.css`    | The only rules that touch Jesper's shell: `.route-carter #main-content` lift, plus the frame's scroller.                      |
| `data/lab-slugs.js`   | The nine Lab slugs, names and descriptions (tiny; `routes.js` and `App.jsx` import it for routing and document metadata).     |
| `data/lab.js`         | Carter's `LAB_ITEMS` metadata, `labImage()`, `labHref()`, prev/next ring and the captured Notes panes (`data/lab-notes/`).     |

## Mounting

```
App.jsx ─ resolveCarterPage(path) ─► <CarterRoute page appReady onNavigate placeholder>
            div.carter[data-theme][data-carter-page]   ← scope, theme, paper, scroller
              CarterPageBoundary (keyed by page)        ← teardown, scroll reset, errors
                <Page /> or the Phase 1 placeholder
```

- `App.jsx` adds `route-carter` to `.app` on Carter routes. `route` itself is
  unchanged (`myself` / `routes`), so the Experience, HUD and nav behave as
  before.
- The frame stays mounted while you move between Carter pages, and the keyed
  boundary remounts per page. When a page leaves, its `onDestroy` teardowns run
  while its DOM is still attached (Carter: `astro:before-swap`).
- A page that throws while rendering falls back to the placeholder. A frame
  chunk that fails to load does the same (`App.jsx`).
- The Loader is Carter's boot veil. While it is up, `veil.active` is true. When
  the app is ready, the frame fires `veil:reveal` once, with
  `{ mode: 'boot', wipeDur: 0 }`. In-app navigation has no veil.

### Phase 4B: the Lab documents

`routes.js` registers the nine `/routes/lab/<slug>` paths with key `lab-detail`
from `data/lab-slugs.js`; `CarterRoute.jsx` renders `pages/lab/LabDetailPage.jsx`
for them and passes `page.slug`. The frame's boundary is keyed by `key:slug`, so
prev/next remounts the page. `App.jsx` sets Carter's per-experiment `<title>` and
`<meta name="description">` for those routes only. See
`pages/lab/README.md` for the source map, what is static vs engine-owned, and
what is deferred.

### Adding a page (Phases 3–5)

1. Create `src/carter/pages/<page>/<Page>.jsx`. Import its CSS from that module,
   so it lands in the page's own lazy chunk.
2. Register it in `PAGES` in `CarterRoute.jsx`:
   `about: lazy(() => import('./pages/about/AboutPage.jsx'))`.
3. The page renders its own `<main>`, matching Carter's
   `<main id="main" class={mainClass}>` (e.g. `className="container"` for Lab).
4. Mount engines with `useCarterEngine('name', () => engine.init())`.

## Styling rules

- **Scope every selector.** Use `:where(.carter) <carter selector>` for page and
  atom rules (no added specificity, so Carter's own cascade holds). Rules Carter
  writes for `html`/`body` target `.carter`, and theme islands use
  `.carter [data-theme=…]`. Never ship bare element, class, `:root`, `html` or
  `body` selectors.
- **Import Carter CSS only below the lazy frame** (from `CarterRoute.jsx` or a
  page module), never from `App.jsx` or `main.jsx`. That keeps it out of the
  main bundle, and it always loads after `styles.css`.
- **Units:** keep Carter's `rem` values verbatim. The `carter-rem-to-px` step in
  `vite.config.js` compiles declaration values under `src/carter/` to px
  (1rem = 16px), because Jesper's root font-size is fluid. Media queries keep rem.
- **Astro scoped selectors:** Carter's About and Lab CSS use Astro's
  `[data-astro-cid-…]` attributes (338 and 76 selectors). Keep those attributes
  on the ported markup, so the CSS ports verbatim. Writing's CSS has none.
- **Global names:** `@keyframes` and `@font-face` names are document-wide. Keep
  Carter's keyframe names (no collisions with Jesper's `a24-*`), and check any
  new name against `src/styles.css`, Contact and Studio. Never declare bare
  Carter family names (see Fonts).
- `.carter` neutralizes the Jesper globals that would otherwise cascade into
  Carter pages: `font-synthesis`, the focus ring, `::selection` and the tap
  highlight.

## Porting an engine

Swap Carter's runtime imports for `./runtime.js` (or `../runtime.js`):

| Carter                                                 | Jesper                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `Ed` / `Dd` (onDestroy / destroyAll) from `mesh.ts`    | `onDestroy` / `destroyAll`                                                      |
| `wd` (veil): `active`, `hold()`                        | `veil`                                                                          |
| `bd` (scroll): Lenis wrapper                           | `scroll`: `stop()`/`start(token)`, `scrollTo(el\|y, { offset, immediate })`, `target` |
| `xu` (tune panel)                                      | `tune` (always `null`)                                                          |
| `navigate` from `astro:transitions/client`             | `navigate` (maps Carter hrefs with `toJesperPath`)                              |
| init on `astro:page-load`                              | `useCarterEngine(name, init)`                                                   |
| `document.documentElement.dataset.theme` + observer    | `getCarterTheme()` / `observeCarterTheme(cb)`                                   |
| `document.body.append(node)` (overlays, measurers)     | `getCarterRoot().append(node)`                                                  |
| `window` scroll / `scrollY`                            | `scroll.target` (the `.carter` scroller): its `scroll` event and `scrollTop`    |
| classes/attributes on `<html>` (`is-overlay`, …)       | the same on `getCarterRoot()`, with CSS written as `.carter.is-overlay …`       |

Carter links inside the frame route in-app. Clicks bubble to the root, which
maps `/about`, `/lab/*`, `/writing/*`, `/studio` and `/contact` to Jesper URLs.
New-tab and modified clicks, downloads, external links and same-page fragments
keep the browser default.

## Fonts

`fonts.css` mirrors Carter's `local()`-only faces as "Carter Oracle", "Carter PP
Neue Montreal Mono", "Carter Geist", "Carter Geist Mono" and "Carter Geist Pixel
Square". Without installed fonts, Carter's own system stacks apply, exactly like
the reconstruction. The prefix keeps Contact/Studio stacks, which name the bare
families, unaffected.

To use licensed files: put them in `public/assets/fonts/carter/` (the path
Contact.css documents), then append
`url('/assets/fonts/carter/<file>.woff2') format('woff2')` after the `local()`
sources of the matching face.

## Assets

Put page media in `public/assets/carter/<page>/` and reference it by absolute URL
(`/assets/carter/<page>/<file>`), following Jesper's `public/assets/` convention.
Carter's `img(path, width, quality)` Cloudflare resizing helper is used only by
Lab and lands with that page (Jesper has no `cdn-cgi/image` endpoint).

## Deferred shared pieces

These are shared, but they are engines rather than plumbing, so each lands with
the first page that needs it:

- **SignatureFx** (signature ink; About and Writing post) → `src/carter/engines/`.
- **3D helpers** (css3d, studio env, GL warm-up; About deck/card and Writing
  folders). The active versions live in `src/carter/engines/`; Studio retains
  its own `src/components/studio/studioEnv.js`.
- **Lenis smooth scroll.** Only Writing scrolls; About and Lab are fixed
  100svh boards. `scroll.lenis` stays `null` until then.
- **WebGL paper** (`canvas.paper-gl`). Carter's live background, shared by all
  pages. The frame currently renders Carter's CSS fallback (fibre plus animated
  tooth), with a `.carter[data-paper-gl]` hook ready.
- **Global SVG sprite** (Writing only).
- **Version gaps:** Carter uses three r185 and gsap 3.15; Jesper ships three
  r180 and gsap ^3.13.
