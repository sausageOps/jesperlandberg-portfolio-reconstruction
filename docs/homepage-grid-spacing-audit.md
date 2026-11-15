# Homepage grid spacing audit

Scope: the homepage tiling engine (`src/reframe/engine.js`). Goal was to confirm every
panel is spaced by one consistent rhythm on both axes, that the outer edges breathe, and
that nothing was left unbalanced by the earlier removal of the caption tiles.

**Outcome: two real defects found, both fixed with two panel-height changes totalling
≤28 px. Everything else was verified correct and left untouched.**

---

## 1. How the layout is built

Worth stating up front, because it explains what "gap" can and cannot mean here.

The homepage is **not a bounded gallery — it is an infinite wrapping field**. `pack()`
assigns units to 7 columns of `colWidth = 420` with `gap = 36`, giving a world of
`W = 7 × (420 + 36) = 3192`. The renderer repeats that world in every direction, so the
camera never reaches an edge: there is no "page margin" in the world, and the field has no
first or last panel to align.

Consequently:

- The **gaps between panels** are the thing the design controls, and they are uniform.
- The **outer edges** of the viewport are set by camera + zoom, not by the grid. `build()`
  centres the camera on the hero (`cam.x = hero.cx; cam.y = hero.cy`), and the hero is
  876 × 600 world px, so the four viewport margins are equal by construction at every size.

One residue of the old caption-tile structure was found in the *arithmetic* rather than in
the markup: several panel heights had been tuned when each tile still carried a +64 px
caption strip. Once that strip was removed (task 2), two columns no longer added up, and the
mismatch surfaced as a stray gap.

---

## 2. Problems found

Both were **vertical** and both had the same cause: a 2-column unit starts at the lower of
its two columns, so whichever column is taller is left with a leftover below it. A leftover
is only harmless if it is ≥ `140 + gap = 176` (then `pack()` turns it into a filler tile) or
exactly `gap`. These two fell in between, so they stayed as raw slivers.

| Where | Gap found | Wanted | Cause |
|---|---|---|---|
| Column 1, above the pinned 2-column Ruby Law video | **47 px** | 36 | `posterUnit('ruby')` defaulted to 540; the intro beside it is 557, so the span started 17 px lower and left 47 px above it. |
| Column 6, above the Contact pair | **53 px** | 36 | Same mechanism, mirrored: the Ruby Law poster in column 6 ended at 540 while the intro ended at 557, leaving 53 px. |

Nothing else was wrong. Specifically:

- **Horizontal rhythm:** `colWidth` 420, `gap` 36, consistent across all 7 columns. Column
  pitch measured 456 px in every pair — i.e. exactly `420 + 36`.
- **No overlaps, no clipping, no overflow** at any of the ten viewport sizes.
- **No ragged bottom:** every one of the 7 columns ended with the same 36 px margin.
- **No orphaned panels** and no accidental empty space.

---

## 3. Files modified

**`src/reframe/engine.js`** — the `units` array only, two heights:

```js
-pin(posterUnit('ruby'), 6),
+pin(posterUnit('ruby', 557), 6),

-posterUnit('smilepp'),
+posterUnit('smilepp', 529),
```

Plus comments in that block explaining the column-arithmetic rule and why these two heights
pair. **No change to** `colWidth`, `gap`, `columns`, zoom, `pack()`, the packing order, any
other panel height, any image, or any interaction. Total geometry change: +17 px and −11 px
on two posters.

Both new heights stay inside the aspect band the posters already occupy (420 × 557 = 0.754,
420 × 529 = 0.794, against an existing 0.75–0.84 range), so the composition is preserved
rather than flattened toward identical panels.

---

## 4. Before / after measurements

Measured on a 1:1 render (viewport 1840 wide ⇒ `zoom = min(1, 1840/1840) = 1.000`, so one
world pixel is one screen pixel). "Background row" = a full row matching the page background
`#0f0f0e` within a tight tolerance, which separates a true gap from the dark video panels
that also read as near-black.

| Gap | Before | After |
|---|---|---|
| Column 1, above the 2-column Ruby Law video | 47 px | **36 px** |
| Column 6, above Contact | 53 px | **36 px** |
| Column 2, Column 3, Column 4, Column 5 (reference) | 36 px | 36 px |

After the fix every internal vertical gap in all seven columns is **36 px**, one value:

```
vertical gaps found: [ 36 ]
gap violations     : 0
residual slivers   : 0
fillers            : 5  (heights 178, 221, 317, 353, 450 — all ≥ 176 threshold)
```

Column bottoms all sit at world y 2187 with `H = 2223`, so every column ends on the same
36 px margin. World height came down from 2234 to 2223.

### Spacing rhythm, both axes

One value does the work in both directions: `gap = 36` world px — 36 px horizontally
(456 px column pitch) and 36 px vertically, at every zoom from 1.000 down to 0.440.

### Outer edges, all four sides

Camera centred on the hero makes the margins equal by construction. Hero is 876 × 600 world
px, so `mL = mR = (vw − 876·zoom)/2` and `mT = mB = (vh − 600·zoom)/2`:

| Viewport | zoom | hero w | mL = mR | hero h | mT = mB |
|---|---|---|---|---|---|
| 1920×1080 | 1.000 | 876 | 522 | 600 | 240 |
| 1600×900 | 0.870 | 762 | 419 | 522 | 189 |
| 1440×900 | 0.783 | 686 | 377 | 470 | 215 |
| 1280×800 | 0.696 | 609 | 335 | 417 | 191 |
| 1024×768 | 0.557 | 488 | 268 | 334 | 217 |
| 900×1200 | 0.489 | 428 | 236 | 293 | 453 |
| 768×1024 | 0.440 | 385 | 191 | 264 | 380 |
| 430×932 | 0.383 | 335 | 47 | 230 | 351 |
| 390×844 | 0.347 | 304 | 43 | 208 | 318 |
| 360×740 | 0.321 | 281 | 40 | 192 | 274 |

The left/right figure is the *breathing room beside the hero*, which is what the eye reads
as the outer margin at the landing position. Vertical margins are larger than horizontal
ones at every size — this is intentional, not a defect: the hero leads the page and adjacent
rows sit part-visible above and below it, which is the field effect the design is built on.
On phones the left/right margin narrows to ~40 px because the hero is scaled up to fill 78 %
of the width so it stays legible.

### Zoom levels

There are no zoom controls; zoom is purely a function of viewport width
(`max(0.44, min(1, vw/1840))`, with a phone override). So the ten widths below *are* the
zoom sweep, covering 1.000 → 0.440 continuously:

| Viewport | zoom | overflow |
|---|---|---|
| 1920×1080 | 1.000 | none |
| 1600×900 | 0.870 | none |
| 1440×900 | 0.783 | none |
| 1280×800 | 0.696 | none |
| 1024×768 | 0.557 | none |
| 900×1200 | 0.489 | none |
| 768×1024 | 0.440 | none |
| 430×932 | 0.440 | none |
| 390×844 | 0.440 | none |
| 360×740 | 0.440 | none |

At every size `scrollWidth === clientWidth` and `scrollHeight === clientHeight`: no
horizontal or vertical overflow, no clipped panels. All ten were captured at the landing
position, after the preloader.

---

## 5. Verification performed

- **Build:** `npx vite build` → exit 0, no new warnings.
- **Span-aware layout model:** re-implemented `pack()` offline and dumped every column.
  Result: 7 columns, gap set `{36}`, 0 violations, 0 slivers.
- **Pixel measurement at 1:1:** confirmed the 36 px figure on screen, not just in the model,
  both in the two repaired columns and as a control in the other five.
- **Screenshots:** all ten sizes at the landing position, plus a panned 1:1 capture covering
  columns 3–6, plus a full-width zoomed-out capture of the field.
- **No metadata regressed:** homepage text scan finds no `BRAND` / `ROLE` / `YEAR` /
  `DELIVERABLES` / `META` strings; no captions, labels, separators or empty tiles returned.
- **Interactions intact:** clicking a panel opens its detail sheet with full metadata
  (project index, title, description, role, year, live link, visit button); `Escape` closes.
- **Other pages intact:** `/myself/about` renders, no overflow.

---

## 6. Intentional asymmetries (not defects)

These were checked and deliberately left alone:

1. **Unequal panel heights across a row.** Columns 3–6 bottom out at different heights
   (service panels 430/600/430/536, posters 500/529/557). Equalising them would flatten the
   composition into a table; the brief was to fix spacing, not to force identical panels.
   Their *gaps* are identical, which is what makes the rhythm read as regular.
2. **The 36 px gutter at the right of the world** (`W = 3192`, content ends at 3156). The
   field wraps, so this never appears as a trailing margin — the world edge is never visible.
3. **Vertical margins larger than horizontal ones.** The hero leads the top of the page, so
   the vertical margin is set by hero height alone; the rows above and below stay part-visible
   by design.
4. **Phone margin narrower than desktop.** The hero is scaled to 78 % of viewport width
   below 700 px so it stays legible; the resulting ~40 px side margin is a consequence of
   that choice, not a spacing error.
5. **Filler tiles.** Five remain, at 178–450 px, closing each column to a level bottom. They
   are visual panels in the original design, not reserved space, and removing them would
   leave a ragged bottom edge.

---

## 7. Reproducing the measurements

- Layout dump: `/tmp/layout3.mjs` (span-aware, prints every column).
- Assertion run: `/tmp/verify_layout.mjs` (fails loudly on any gap ≠ 36 or any sliver).
- Ten-size sweep: `/tmp/pw2/audit.mjs` → screenshots + `/tmp/audit/sizes.json`.
- 1:1 pixel gap measurement: `/tmp/gap/scale1.png` (viewport 1840 × 3200, zoom 1.000).
- Panned 1:1 capture of columns 3–6: `/tmp/gap/pan1.png`.
