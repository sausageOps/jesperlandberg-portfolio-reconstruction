# Writing page recreation — Carter → Jesper

Recreates [carterogunsola.com/writing](https://carterogunsola.com/writing) **and** its
one post, `/writing/the-personal-starter`, inside the existing Jesper reconstruction.
Jesper's background, navigation and global chrome are untouched; only a new route
branch, one route-scoped z-index rule and a new component folder were added.

- **Routes:** `/routes/writing` (index) and `/routes/writing/the-personal-starter` (post).
  Anything else under the prefix falls through to the existing not-found route.
- **Components:** `src/components/writing/` — `Writing.jsx` (+ shell), `WritingIndex.jsx`,
  `WritingPost.jsx`, `WritingArticle.jsx`, `ui.jsx`, `writingPost.js`, `shelfWorld.js`,
  `shelfHelpers.js`, `foldersCover.js`, `foldersFlight.js`, `Writing.css`, `WritingPost.css`.
- **Content:** `src/data/writing.js` — `WRITING_PREFIX`, `FOLDERS`, `WRITING_INDEX`,
  `POST`, `ROW_TAGS`, `TOC`, `CREDITS` (Carter's copy, verbatim).
- **App wiring:** `src/App.jsx` — `/^\/routes\/writing(?:\/([^/]+))?$/` route match,
  `Writing` branch, page title, `aria-live` announcement.
- **Global:** `src/styles.css` — `.route-writing #main-content { z-index: 20 }` (same
  lift the project/contact/studio routes use, so the shelf and paper sit above the
  Experience canvas).
- No new dependencies (gsap 3.13 and three 0.180 were already in the project).

Carter URLs map to Jesper routes by prefix swap (`/writing` → `/routes/writing`), the
rule used by the rest of this reconstruction.

## What was ported (from Carter repo read-only reference)

| Piece | Carter source | Here |
|---|---|---|
| Index markup | `app/pages/writing/index.astro` | `WritingIndex.jsx` (1:1 hooks/classes) |
| Post markup | `app/pages/writing/[...slug].astro` | `WritingPost.jsx` + `WritingArticle.jsx` |
| Index styles | `app/styles/writing.css` | `Writing.css` (31 rules, verbatim, rem → px) |
| Post styles | `app/styles/writing-post.css` + Expressive Code sheet | `WritingPost.css` |
| Shelf scene | `app/lib/folders.js` `nt()` | `shelfWorld.js` (body kept structurally verbatim) |
| Cover art | `app/lib/folders/cover.ts` | `foldersCover.js` (procedural paint, verbatim) |
| Shared 3D helpers | `app/lib/folders/*` | `shelfHelpers.js` |
| Folder → paper flight | `app/lib/folders/flight.ts` | `foldersFlight.js` |
| Post TOC / ring / scrollspy | `app/lib/writing-post.ts` | `writingPost.js` |
| Shared primitives | `ui/section-label`, `arrow-roll`, `link-circle`, `close-box`, `ref-row`, `signature` | `ui.jsx` |
| Code blocks | `expressive-code.ts` mount | `ui.jsx` `ExpressiveCode` |

The React shell replaces Astro's `ClientRouter` + `data-astro-transition-persist`
handshake: `Writing` stays mounted across index ↔ post, so the WebGL world, the still
canvas and the flight renderer survive the navigation exactly as Carter's persisted
canvas did.

Route events map 1:1:

| Carter | Here |
|---|---|
| `astro:before-preparation` | `world.beforeNav({ to: { pathname } })` |
| `astro:after-swap` | `world.onPage()` (+ `FoldersFlight.onPage()` first) |
| `astro:page-load` | `world.toShelf()` / `world.toBackdrop(slug)` |
| `astro:navigate` | `WritingBridge.navigate` |
| `folders:pose-release` | unchanged (post chrome waits for it while a flight runs) |

## Content fidelity

Compared against the live reference DOM (`http://127.0.0.1:4321/writing` and
`/writing/the-personal-starter`), tags/entities/whitespace normalised:

- index `.writing__col` text — **equal**
- post `.wpost__article` text — **equal**
- post `.wpost__credits` text — **equal**
- post counts match the reference: 17 article paragraphs, 7 `<h2>` sections, 6 list
  items, 6 inline links, 4 inline `<code>`, 2 Expressive Code figures (11 `.ec-line`),
  6 credit rows, signature, 7 TOC items.

Structural token diff of the rendered `<main>` against the reference:

| Route | Similarity | Remaining deltas |
|---|---|---|
| index | 0.824 | `data-*=""` vs bare attrs, `/routes/writing` hrefs, inline SVG `viewBox`, trailing wrappers |
| post | 0.906 | `style` attribute spacing (`--ecMaxLine: 57ch;` vs `57ch`), `&quot;` vs `&#34;`, inline SVG paths vs `<use>` sprite, no `ec.*.css` `<link>`, TOC `data-toc-active` |

All of those are deliberate: React always writes `=""` (attribute *presence*, which is
what every selector and the engine use, is identical), the route prefix is the mapping
rule, and the Astro icon sprite and Expressive Code sheet do not exist in Vite.

CSS parity: the ported `writing.css` parses to the same 31 rules with the same
declarations as the reference; the only edits are `rem` → `px` (× 16, so `33.99rem`
→ `543.84px`, `47.99rem` → `767.84px`, `79.99rem` → `1279.84px`) and the `.writing`
scope that replaces Astro's `data-astro-cid` scoping.

## Runtime bugs found and fixed in this pass

These would not have shown up in a build; all were found by executing the real modules
and DOM (see *Verification*).

1. **Module-level TDZ crash (fatal).** `shelfWorld.js` aliased `VelocitySampler` above
   its `class` declaration → `Cannot access 'VelocitySampler' before initialization` on
   import. Under Vite's native ESM that blanks the whole app on `/routes/writing`; the
   esbuild test bundle hid it because esbuild rewrites classes to `var`. The alias now
   sits below both declarations, and `he = spring` was restored alongside it.
2. **Missing recovered bindings.** `P` (pose flag), `xe` (ring inset), `var tt`
   (renderer cache) and the `coverBase`/`coreTint`/`paperTint` aliases were not carried
   over from the recovered chunk. Added.
3. **Renderer cache across unmounts.** Carter's renderer is a document-lifetime
   singleton because its canvas is persisted; React destroys the canvas when the route
   leaves, so a re-entry reused a renderer bound to a dead element. The cache now keys
   on the canvas, and `dispose()` drops it.
4. **Flight renderer likewise** — `FoldersFlight.init()` disposes a renderer whose canvas
   changed (or whose context was lost) before rebinding.
5. **Stage re-bind after the post.** The index subtree unmounts while the post is open,
   so returning to the shelf hands back a *new* `section.wstage`. `bindStage()` is now
   re-run whenever the element identity changes (it attaches listeners per call, so it
   is guarded by identity rather than called every commit).
6. **`FoldersFlight.stop()` on unmount** — the tick loop no longer runs against a
   detached canvas.
7. **`data-theme` restore** when WebGL or the world is unavailable (the `dark` stamp is
   only needed while the shelf engine reads tokens).

## Known deviations

1. **Fonts** — deferred for this task, as agreed. The stacks keep Carter's family names
   and fallbacks (Oracle / PP Neue Montreal Mono / Geist Pixel → system fallbacks), so
   the shelf's canvas typesetting uses the fallback metrics until the licensed faces are
   dropped in.
2. **Cover art** is drawn procedurally (`tone`/`stock` null → default palette), matching
   the reference's recovery notes; the reference's shipped raster art is not present.
3. **The 1,100-character index `excerpt` is genuinely truncated upstream** (it ends
   mid-sentence in Carter's own payload) and is kept verbatim rather than “fixed”.
4. **Icons** are inline `<svg>` paths instead of Astro's hoisted `<symbol>` sprite; same
   geometry, `data-icon` names preserved.
5. **Expressive Code**: the framework bundle's CSS is reimplemented alongside
   `ExpressiveCode` in `ui.jsx`; the copy button is re-mounted by hand (same
   `data-code` / `data-copied` contract).
6. **Not ported by design:** Carter's ambient paper-shader post canvas (the page uses
   the still canvas + paper column), and the inert `closebox--md` / `closebox--fill`
   classes, which are kept for markup parity but have no rules upstream either.
7. **`id="main"`** is added by the shared Jesper layout (skip-link target contract), which
   the reference does not have; the element is otherwise identical.

## Verification

- `npm run build` — 78 modules, `index` JS 1,253.95 kB (gzip 361.04 kB), CSS 85.23 kB,
  no errors. (The >1,200 kB chunk warning is pre-existing and covers the whole app.)
- **jsdom harness against the real bundle** (route → DOM facts), no console or jsdom
  errors on either route at 1440 / 768 / 375:
  - index — 1 `wstage` (`hidden`, engine off in jsdom → classic fallback), 1
    `writing__classic`, 1 row, 6 filter tabs, shelf + still + flight canvases.
  - post — 1 `wpost`, 7 TOC items + ring, 17 paragraphs, 7 headings, 6 list items,
    2 code blocks (11 lines), 6 credits, claim, signature, 2 `data-flight-wait`,
    1 close box.
- **Filters** — `web` → 1 row, `design`/`motion`/`tools`/`life` → 0 rows with the
  “Nothing filed here yet” empty state, back to `all` → 1 row; `aria-selected` follows.
- **Navigation** — row click → post (no document reload), close box → index,
  `popstate` both ways, deep link renders the post directly, unknown slug → not-found.
- **Post chrome** — TOC toggle flips `aria-expanded` + `.is-open`; TOC is open at 1440
  and collapsed below 1280 (Carter's `(max-width: 79.99rem)` rule), unchanged.
- **Regressions** — `/`, `/myself/contact`, `/routes/studio` still render (only the
  expected `no-webgl` fallback warning, plus Studio's pre-existing jsdom WebGL log).
- **Refresh / direct load** — dev server returns 200 for both Writing routes and serves
  the modules without transform errors.

### What still needs a human eye

There is no GPU and no browser in this environment, so the following are reviewed by
code and DOM only and should be confirmed in the live preview:

- the WebGL shelf itself (covers, lighting, drag/wheel/keyboard feel),
- the index → post folder flight and the settle onto the paper column,
- the post entrance (column relay) at 1440 / 768 / 375,
- type rendering, which depends on the still-deferred fonts.

**Preview routes:** `http://localhost:5173/routes/writing` and
`http://localhost:5173/routes/writing/the-personal-starter`.
Reference for side-by-side: `http://localhost:4321/writing` and
`http://localhost:4321/writing/the-personal-starter`.
