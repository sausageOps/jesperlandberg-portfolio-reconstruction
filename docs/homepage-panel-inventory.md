# Homepage project panel inventory

Read-only audit of the Homepage gallery in `src/reframe/engine.js`. No code was changed.

**Total visible panels: 27.**
Of those, **11 are project media** (8 video + 3 poster), representing **3 actual projects**.

---

## 0. Why the count is 27 and not something else

Two things make this number easy to get wrong, so both are stated up front.

**Panels are not DOM elements.** `.stage` holds a single `<canvas>`; every tile is a draw
call into it. There is nothing to count in the DOM.

**The homepage is an infinite wrapping field, not a page.** `pack()` lays tiles into 7 columns
of 420 px with a 36 px gap (`W = 3192`), and the renderer repeats that world in every
direction. So "27 panels" means 27 panels *in the world* — one complete tile set. The field
never ends; what a visitor sees is a viewport onto this repeating set.

No viewport is ever wide enough to show the world twice, so **the wrapping never duplicates a
tile on screen**. The widest world-view is 1920 px (at 1920 wide, zoom 1.000) against a 3192 px
world; the narrowest is 1123 px at 430 wide. Wrap matters only for what you can scroll *into*,
and for a handful of tiles near the column-0 / column-6 seam that are partly visible at the
landing position.

The authoritative source is the `units` array (~L1306) — 18 entries, five of which carry more
than one tile. `pack()` explodes those into 27 placed tiles, and `build()` creates exactly one
tile per placed spec, with no culling:

```js
for (const spec of pack()) { … tiles.push(tile); }
```

### Verification of the count (four independent ways)

1. **Model** — re-ran `pack()`'s exact algorithm: **27 placed tiles**.
2. **Occupancy grid** — rasterised all 27 at 1 px against the 3192 × 2223 world:
   **0 overlapping pixels**, covering 6 147 720 px = 86.64 % of the world; the remaining
   13.36 % is field/gap, which matches `gap = 36` on both axes.
3. **Live app** — instrumented `document.createElement` and loaded the page: the engine
   created **17 offscreen canvases** = 16 painted tiles + 1 auxiliary `heroBase`. The 16
   painted tiles are exactly the model's non-media tiles (1 hero + 1 intro + 1 services
   heading + 4 services + 1 work heading + 1 contact + 1 email + 1 clock + 5 fillers = 16).
   ✓
4. **Rendered pixels** — captured the full world at 1:1 (zoom 1.000) across four panned
   views; every tile in the inventory was located on screen.

Both dimensions agree: **27 tiles**, of which 11 media, 16 painted.

---

## 1. Complete numbered inventory

World coordinates in px. `x`/`y` are the tile's top-left in the 3192 × 2223 world; `col` is
the starting column (of 7). Sizes are the source texture's aspect, not the on-screen size
(zoom ranges 1.000 → 0.440 by viewport width).

| # | Type | Content / name | col | x | y | w × h | Actual project? |
|---|---|---|---|---|---|---|---|
| 1 | `hero` | Hero — "Websites, made with / *real care.*", HK Web Studio, 22.3° N 114.2° E | 0 | 0 | 0 | 876 × 600 | No — introductory/hero |
| 2 | `video` | **SmilePP** — 2-column video | 0 | 0 | 636 | 876 × 493 | **Yes** |
| 3 | `video` | **YWPS PTA** — 2-column video | 0 | 0 | 1165 | 876 × 493 | **Yes** |
| 4 | `video` | **Ruby Law** — 1-column video | 0 | 0 | 1694 | 420 × 236 | **Yes** |
| 5 | `filler` | Filler variant 0 — "Refocus." on ink, hairline outline | 0 | 0 | 1966 | 420 × 221 | No — decorative |
| 6 | `video` | **Ruby Law** — 2-column video | 1 | 456 | 1694 | 876 × 493 | **Yes** |
| 7 | `intro` | Intro — "About us": "We design, build, look after and transform websites." | 2 | 912 | 0 | 420 × 557 | No — about copy |
| 8 | `poster` | **YWPS PTA** — poster | 2 | 912 | 593 | 420 × 500 | **Yes** |
| 9 | `poster` | **SmilePP** — poster | 2 | 912 | 1129 | 420 × 529 | **Yes** |
| 10 | `video` | **Ruby Law** — 2-column video | 3 | 1368 | 0 | 876 × 493 | **Yes** |
| 11 | `svcHead` | Services heading — "Services · 04 / How we help." on signal | 3 | 1368 | 529 | 420 × 240 | No — section heading |
| 12 | `service` | Service 01 **Design** — UI/UX · Brand · Motion | 3 | 1368 | 805 | 420 × 430 | No — services |
| 13 | `service` | Service 03 **Care** — Hosting · Maintenance · Upgrades | 3 | 1368 | 1271 | 420 × 430 | No — services |
| 14 | `video` | **SmilePP** — 1-column video | 3 | 1368 | 1737 | 420 × 236 | **Yes** |
| 15 | `filler` | Filler variant 1 — logo symbol on signal | 3 | 1368 | 2009 | 420 × 178 | No — decorative |
| 16 | `service` | Service 02 **Build** — Websites · Web apps · Systems · WCAG | 4 | 1824 | 529 | 420 × 600 | No — services |
| 17 | `service` | Service 04 **Transform** — Redesigns · Migrations · Legacy rebuilds | 4 | 1824 | 1165 | 420 × 536 | No — services |
| 18 | `filler` | Filler variant 2 — service names list (Design/Build/Care/Transform) | 4 | 1824 | 1737 | 420 × 450 | No — decorative |
| 19 | `clock` | Live HKT clock — "Our time · HKT" with signal dot | 5 | 2280 | 0 | 420 × 230 | No — live status |
| 20 | `workHead` | Work heading — "Work · 2025–2026 / Work we're *proud of.*" | 5 | 2280 | 266 | 420 × 291 | No — section heading |
| 21 | `contact` | Contact — "Ready for a *new frame?*" + info@reframehk.com, 2-column | 5 | 2280 | 593 | 876 × 440 | No — contact |
| 22 | `video` | **SmilePP** — 2-column video | 5 | 2280 | 1069 | 876 × 493 | **Yes** |
| 23 | `video` | **YWPS PTA** — 1-column video | 5 | 2280 | 1598 | 420 × 236 | **Yes** |
| 24 | `filler` | Filler variant 3 — "With care." with "reframe (v.)" kicker | 5 | 2280 | 1870 | 420 × 317 | No — decorative |
| 25 | `poster` | **Ruby Law** — poster | 6 | 2736 | 0 | 420 × 557 | **Yes** |
| 26 | `email` | Email — "Say hello" + info@reframehk.com | 6 | 2736 | 1598 | 420 × 200 | No — contact |
| 27 | `filler` | Filler variant 4 — compass of arrows, "No edges" | 6 | 2736 | 1834 | 420 × 353 | No — decorative |

All seven columns end at world y 2187 with an equal 36 px bottom margin; world height 2223.

---

## 2. Counts

| Measure | Count |
|---|---|
| **Total visible panels (world)** | **27** |
| **Actual project panels (media)** | **11** |
| — video panels | **8** |
| — image / poster panels | **3** |
| Non-project panels | 16 |
| — introductory / hero | 1 (`hero`) |
| — about copy | 1 (`intro`) |
| — section headings | 2 (`svcHead`, `workHead`) |
| — services | 4 (`service` 01–04) |
| — contact / email | 2 (`contact`, `email`) |
| — live status | 1 (`clock`) |
| — decorative fillers | 5 (`filler` 0–4) |
| **Distinct projects represented** | **3** |

Non-project 16 + project 11 = 27. ✓

### Non-project sub-totals by grouping

- **Introductory / hero content:** 1 panel (hero). The `intro` tile is brand/about copy, not a project.
- **About content:** 1 (`intro`). Note the *same* sentence ("We design, build, look after and
  transform websites.") also appears on the About page — here it is a homepage tile.
- **Contact content:** 2 (`contact` 2-column, `email`). Both carry `info@reframehk.com`,
  deliberately repeated at two scales.
- **Decorative:** 5 fillers — these exist to close the packer's leftover holes to a level
  bottom edge. They carry real copy, but they are composition, not portfolio work.
- **Services:** 4 tiles + 1 heading.

### Project media by project

| Project | Video tiles | Poster tiles | Total tiles |
|---|---|---|---|
| SmilePP | 3 (2-col ×2, 1-col ×1) | 1 | **4** |
| Ruby Law | 3 (2-col ×2, 1-col ×1) | 1 | **4** |
| YWPS PTA | 2 (2-col ×1, 1-col ×1) | 1 | **3** |
| | **8** | **3** | **11** |

SmilePP and Ruby Law appear four times each; YWPS PTA three times. **No tile is a distinct
fourth project** — there are exactly 3 projects in `PROJECTS`, and all 11 media tiles map onto
them.

---

## 3. Distinguishing content

Answering the "do not assume every tile is a separate project" caution directly: **11 of the
27 tiles are project media, and those 11 are only 3 projects.** The most common
misreading of this grid is counting panels as projects; at the landing viewport on a laptop
you see roughly 9 tiles, of which only 3 are project media (SmilePP video, Ruby Law poster,
YWPS poster) — and those are 3 *different* projects only by coincidence of the pinning.

Conversely, several tiles that are *not* projects can read as portfolio items: `filler`
variant 2 (a list of service names) and the four `service` tiles look like content panels, and
they are — they are just site copy rather than client work.

---

## 4. Duplicates and unused entries

**Duplicate placements — none accidental.** The count of 27 counts each physical tile once.
The apparent repetition is by design:

- **Each project appears in multiple tiles.** SmilePP 4, Ruby Law 4, YWPS PTA 3. This is one
  project shown through several crops/scales, not several projects.
- **Ruby Law has two adjacent 2-column videos** (#6 at column 1 and #10 at column 3) plus a
  1-column video (#4) and a poster (#25) — four separate placements of the same project.
- **Contact copy repeats** across `contact` (#21) and `email` (#26): same address, two scales.
- **Filler variant 2** lists the four service names, which are also on tiles #12, #13, #16,
  #17. Intentional echo.

**Unused entries — one, and it is not a panel.**

- `uMap2` / `uAlt` (the hover cross-fade texture, in the shader and the per-tile uniforms) is
  **dead**. Since the caption tiles were removed there is no second variant to fade to; the
  code sets `map2 = null` and `uAlt = 0` for every tile. It reserves no space and renders
  nothing — it is inert shader plumbing, not a hidden panel. Worth knowing about, but it does
  **not** add to the count.
- Every `DRAW` handler is used: `hero`, `intro`, `svcHead`, `service`, `workHead`, `contact`,
  `email`, `clock`, `filler` — 9 handlers, and `video`/`poster` draw from media textures. No
  orphaned draw function.
- All 5 filler variants are used, one each (#5, #15, #18, #24, #27).
- All 3 `PROJECTS` entries are used; all 4 `SERVICES` entries are used.

**Nothing in `units` is unused:** all 18 entries produce at least one placed tile.

---

## 5. How much is visible at once

The field wraps, so "visible" is viewport-dependent. Tiles touching the landing viewport,
accounting for horizontal and vertical wrap:

| Viewport | zoom | world view | tiles touching |
|---|---|---|---|
| 1920 × 1080 | 1.000 | 1920 × 1080 | 16 |
| 1440 × 900 | 0.783 | 1839 × 1149 | 9 |
| 1280 × 800 | 0.696 | 1838 × 1150 | 9 |
| 1024 × 768 | 0.557 | 1838 × 1379 | 10 |
| 390 × 844 | 0.347 | 1124 × 2432 | 14 |

The whole set becomes reachable by dragging / flinging / arrow keys in any direction, and the
`hud` fly-to buttons jump to the hero, services, work and contact anchors.

---

## 6. Method

- `src/reframe/engine.js` — `PROJECTS` (L185), `SERVICES` (L193), `CONFIG` (L17), `DRAW`
  handlers (L1104–1262), `videoUnit`/`posterUnit`/`one`/`svcBlock` (L1276–1300), `units`
  (L1306–1329), `pack()` (L1331–1358), `build()` (L1457–1480), filler variants (L1205–1262).
- `src/reframe/ReframeHome.jsx` — confirmed `.stage` is a single container and the canvas is
  the only child that renders tiles.
- Re-implemented `pack()` offline (`/tmp/inv.mjs`, `/tmp/inv2.mjs`) to reproduce placement
  exactly; verified with a 1 px occupancy grid.
- Instrumented `document.createElement` in the live preview to count offscreen tile canvases
  (`/tmp/pw2/invcount.mjs`).
- Full-world screenshots at zoom 1.000 across four panned positions
  (`/tmp/inv/A_left.png`, `B_pan1..3.png`).
