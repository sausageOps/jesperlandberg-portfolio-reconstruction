# Carter Writing (`/routes/writing` & `/routes/writing/the-personal-starter`)

Phase 15 port of Carter Ogunsola's Writing index (`/writing`) and article (`/writing/the-personal-starter`) from `sausageOps/carterogunsola-reconstruction` (commit `3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249`, kept strictly read-only) into Jesper's shared Carter frame (`src/carter/`).

## 1. Route Mapping & Document Metadata

| Carter source route | Jesper reconstruction route | `CarterRoute` key | Document `<title>` | `<meta name="description">` |
| --- | --- | --- | --- | --- |
| `/writing` (`pages/writing.html`, `app/pages/writing/index.astro`) | `/routes/writing` | `writing` | `Writing — Routes` (Jesper top-level section convention; Carter source `<title>`: `Writing`) | `Notes on design, development, motion, tools, creativity, and sometimes life outside of work.` |
| `/writing/the-personal-starter` (`pages/writing_the-personal-starter.html`, `app/pages/writing/the-personal-starter.astro`) | `/routes/writing/the-personal-starter` | `writing-post` | `The personal starter :: Writing` | `Templates, kits, starters, boilerplates etc. What I'd call a personal starter, what I'd keep in one, and the one I use for my own sites.` |

Internal Carter hrefs (`/writing`, `/writing/the-personal-starter`) are preserved in markup and mapped to `/routes/writing` and `/routes/writing/the-personal-starter` by `src/carter/routes.js` (`toJesperPath`) and `src/carter/runtime.js` (`interceptLinkClick` / `navigate`).

## 2. Page Structure, Content, Ordering & Assets

### Writing Index (`WritingPage.jsx` -> `main#main.writing`)
1. **Persistent Writing Canvas Host (`WritingShelfHost.jsx`)**:
   - Mounted inside `.carter` whenever `page.key` is `writing` or `writing-post`, matching Carter's `BaseLayout.astro` `transition:persist` canvases:
     - `canvas.shelf-gl[data-shelf]` (`z-index: 1`, `position: fixed`, `inset: 0`)
     - `canvas.shelf-still[data-shelf-still]` (`z-index: 1`, `position: fixed`, `inset: 0`)
     - `canvas.flight-gl[data-flight]` (`z-index: 80`, `position: fixed`, `inset: 0`)
   - Survives `/routes/writing` <-> `/routes/writing/the-personal-starter` transitions so the 3D folder shelf, backdrop sheet, and flight plane transition continuously; unmounts and disposes WebGL contexts (`renderer.dispose()`, `forceContextLoss()`) immediately when leaving Writing routes.
2. **3D Folder Shelf Stage (`section.wstage[data-folders][hidden]`)**:
   - Carousel region (`role="group"`, `aria-roledescription="carousel"`, `tabIndex={0}`) with bottom-left `.wstage__info` popover (`a.wstage__info-btn[data-folders-title]`, `#ai:local:circle-info`, `#wstage-tip[role="tooltip"]`, date/year/category `.chip`s, screen-reader `#wstage-excerpt`) and inline `<script type="application/json" data-folders-data>` carrying `FOLDERS` verbatim.
3. **Classic Index Fallback (`div.writing__classic.container[data-folders-classic]`)**:
   - Visible in SSR and whenever WebGL is unavailable or `prefers-reduced-motion: reduce` matches; hidden (`classic.hidden = true`) when `Folders` activates `.wstage`.
   - `header.writing__intro`: `h1.section-label.section-label--lg` (`Writing ::`) + three `p.text-lead` intro paragraphs.
   - `section.writing__archive[data-index-reco]`: `h2.section-label.section-label--lg` (`2026 ::`), six `role="tab"` category filter buttons (`All`, `web`, `design`, `motion`, `tools`, `life`), `div.writing__card[data-index-rows][data-row-list]` with the single `FOLDERS` entry (`The personal starter`, chips `Sep 16`, `2026`, `web`, `span.linkcircle > span.arrow-roll`), and `p.writing__empty` (`Nothing filed here yet`).

### Writing Post (`WritingPostPage.jsx` -> `main#main.wpost.container`)
1. **Inline JSON (`script[data-folders-data]`)**: Allows direct entry onto `/routes/writing/the-personal-starter` to construct the 3D backdrop sheet (`Folders.toBackdrop`) without visiting `/routes/writing` first.
2. **Left Rail (`aside.wpost__rail[data-flight-wait]`)**:
   - `nav.toc.is-open[data-toc]` with circular SVG progress ring (`r="5.5"`, `stroke-dasharray="34.558"`), `Table of content` label, collapse button (`button.toc__chev[data-toc-toggle]`, `#ai:local:chevron-right`), and ordered list (`ol#toc-list.toc__list`) of 7 section anchors:
     1. `Product vs studio` (`#product-vs-studio`)
     2. `The personal starter` (`#the-personal-starter`)
     3. `What goes in` (`#what-goes-in`)
     4. `Shape and engines` (`#shape-and-engines`)
     5. `Keeping projects in sync` (`#keeping-projects-in-sync`)
     6. `Why small` (`#why-small`)
     7. `Odyn Astro starter` (`#odyn-astro-starter`)
3. **Right Close Control (`div.wpost__close`)**:
   - `a.closebox.closebox--md.closebox--fill[href="/writing"][data-flight-wait]` (`#ai:local:close`).
4. **Paper Column (`article.wpost__col[data-flight-paper]`)**:
   - `div.wpost__claim[data-sheet-claim]` (3D backdrop sheet anchor), masthead (`Carter Ogunsola:: Writing` / `N°01`), date (`:: Sep, 16, 2026`), `h1.wpost__title` (`The personal starter`), `aside.wpost__tldr`, `div.wpost__article[data-post-article]` (full prose, 7 `h2` sections, unordered list, inline code, external links, and 2 `ExpressiveCode` blocks in `ts` and `json` with `\u007f`-delimited `data-code`), `section.wpost__credits` (6 external `RefRow` links with `#ai:local:globe` + diagonal `ArrowRoll`), and `div.wpost__signoff` (`Sincerely,` + animated SVG `Signature`).

### Typography, Tokens & Assets
- Uses shared Carter font faces (`--font-sans` Switzer, `--font-display` Clarkson, `--font-serif` Signifier, `--font-mono` Geist Mono) and tokens from `src/carter/styles/{fonts,tokens,base,atoms,frame}.css`.
- Page stylesheets (`writing.css`, `writing-post.css`, `writing-ec.css`) are ported from Carter's compiled CSS bundles (`src/writing.C1dRexZC.css`, `src/_slug_.BZeeZM_C.css`, `app/public/_astro/ec.2v5bd.css`, plus `.section-label` and `.refrow` rules from `app/styles/global.scss`), scoped under `:where(.carter)`. Vite's `carterCssRemToPx` plugin converts declaration `rem` values to `px` at 16px root so Jesper's fluid `html` `font-size` does not distort Carter's type or spacing.
- No external bitmap images or remote media are referenced; procedural 2D canvas textures (`index` ruled cover, paper sheet preview, sticky flag, bump noise, shadow) are synthesized locally by `folders.js`.

## 3. Interactions, Transitions & Accessibility

- **3D Folder Shelf (`folders.js` + `folders-flight.js`)**:
  - Wheel, pointer drag with flick inertia, raycast hover peek, click-to-center / click-to-open, info button popover/focus preview, and keyboard navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`, `Enter`).
  - Opening a folder dives the top paper sheet (`Z.v`), prefetches `WritingPostPage.jsx`, routes to `/routes/writing/the-personal-starter`, and flies the sheet into `.wpost__col[data-flight-paper]`. Closing via `.closebox` reverses the flight back onto the shelf (`flyHome`).
- **Classic Archive Filter (`index-reco.js`)**:
  - Keyboard/pointer `tablist` filtering by `data-cat` (`all`, `web`, `design`, `motion`, `tools`, `life`), toggling `aria-selected`, displaying `"Nothing filed here yet"` on empty categories, and smoothly tweening card height when reduced motion is off.
- **Article TOC & Progress (`writing-post.js`)**:
  - Tracks scroll progress of `[data-post-article]` inside `.carter` to update `[data-toc-ring]` (`stroke-dashoffset`) and active section (`[data-toc-active]`), sliding `[data-toc-bg]` with GSAP `Flip` (or instant move under `prefers-reduced-motion: reduce`).
  - Smooth-scrolls `.carter` to section headings via `runtime.scroll.scrollTo(target, { offset: -120 })`; initializes the TOC collapsed at `<= 79.99rem` and leaves it open after selecting a section, matching Carter's original controller.
- **Expressive Code (`writingExpressiveCode.js`)**:
  - Copies `\u007f`-decoded code via `navigator.clipboard.writeText` (with `textarea` fallback), announces `"Copied!"` in the `aria-live="polite"` status node, and toggles `tabIndex={0}` on `<pre>` when horizontal overflow exists.
- **Signature (`signature-fx.js`)**:
  - Scroll-revealed variable-width calligraphy replay on `.wpost__sig` when entering `.carter`'s viewport (static path when `prefers-reduced-motion: reduce` matches).

## 4. Responsive Breakpoints (Desktop, Tablet & Mobile)

- **Writing Index (`writing.css`)**:
  - The only explicit narrow-screen query is `@media (width <= 33.99rem)`: it hides the first two row tags and reduces the archive section's top margin. Other sizing is fluid/clamped or inherited from the shared Carter frame.
- **Writing Post (`writing-post.css` + `writing-post.js`)**:
  - The source's base layout uses a sticky left TOC rail beside the centered article column; at `@media (width <= 79.99rem)`, the rail becomes a fixed, full-width bottom drawer and the close control moves to a fixed position near the top-right.
  - The TOC starts collapsed when the engine initializes at `window.matchMedia('(max-width: 79.99rem)')`; its button toggles it. Selecting a TOC item scrolls to its heading; the original controller does not auto-collapse the drawer after selection.
  - At `@media (width <= 47.99rem)`, article tables become horizontally scrollable blocks. Remaining typography and column dimensions use Carter's fluid tokens and `clamp()` values.
  - Media queries retain their source `rem` units; their effective pixel width follows the root font size. The Writing-specific Vite transform converts declaration values from `rem` to `px`, not media-query conditions.

## 5. Shared Systems Reused & Unverifiable Source Items

- **Reused unchanged**: `src/data/navigation.js`, `src/carter/runtime.js`, `src/carter/useCarterEngine.js`, `src/carter/styles/{fonts,tokens,base,atoms,frame}.css`, and shared engines `signature-fx.js`, `css3d.js`, `studio-env.js`, `mesh-wire.js`, `wheels-gl-warm.js`.
- **Intentional scope boundaries / unverifiable items**:
  - Carter's `?tune=folders` dev tuning panel (`tune()` returns `null` across all Carter ports in Jesper) and Astro `ClientRouter` document-swap events (`astro:before-swap` / `astro:page-load`, bridged via `CarterPageBoundary` + `WritingShelfHost`) are adapted to Jesper's SPA router.
  - Only the single published article present in Carter's repository (`the-personal-starter` in category `web`) exists; `design`, `motion`, `tools`, and `life` tabs intentionally show Carter's `"Nothing filed here yet"` empty state.
  - No headless browser binary is installed in this build environment, so visual GPU rasterization and live pointer/scroll feel could not be inspected interactively; build, SSR, CSS scoping/token resolution, and jsdom behavioral lifecycles are verified via `verify/writing-verify.mjs`.
