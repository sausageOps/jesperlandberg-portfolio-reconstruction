# Lab + Contact — tablet & mobile vertical spacing adaptation

Branch `arena/4c62a8ba-jesperlandberg-portfolio-recon` · 2026-11-07
Scope: the imported Carter **Lab** pages (`/routes/lab`, `/routes/lab/<slug>`) and the imported
Carter **Contact** page (`/myself/contact`), tablet and phone only. Desktop (>=992px) unchanged.

**Nothing was committed, pushed or deployed.**

---

## 0. Summary

| Page | What was wrong on tablet/phone | Fix |
|---|---|---|
| Lab index `/routes/lab` | Carter's `.lab` is `height:100svh` full-bleed. Our nav is docked at the bottom, so the bottom 52–61px of the list/wheel/grid viewport sat **behind the dock**. (No top reserve existed on this page — inspected and confirmed 0px.) | `height: calc(100svh - 64px - safe-area-inset-bottom)` at `<=991px`; the mode switch's old manual lift is gone because the whole box now ends above the dock. |
| Lab detail `/routes/lab/<slug>` (9 documents) | Carter reserved the top of the viewport for its fixed header: `.labd` started at `--labd-top: 6.375rem` (**102px**, **80px** below 768px) and ran to the viewport bottom. In this shell that is 80–102px of **empty space at the top** plus a bottom edge **behind the dock**. | `--labd-top: calc(var(--margin) + safe-area-inset-top)` (≈16–24px) and `inset-block-end: calc(64px + safe-area-inset-bottom)`, `<=991px` only. |
| Contact `/myself/contact` | Carter places the letter sheet at **TOP = 116px** (posed scene *and* the CSS pre-entrance placeholder; 64px of static top padding for the reduced-motion/no-WebGL flow) to clear its header. Bottom room (132px posed / 96px flow) already cleared the dock, so only the top needed work. | One declared source of truth: `--letter-top` / `--letter-bottom` on `.desk`. `<=991px` → **32px (tablet) / 8px (phone) + safe-area-inset-top**; bottom + `safe-area-inset-bottom`. `deskScene.js` now *reads* those values instead of hard-coding `TOP`/`BOTTOM`. |

The number used for bottom clearance (64px) is the worst-case footprint of `A24Nav`'s bottom
dock between 320px and 991px wide: `3.5em` dock (40–47px) + its edge gap `max(1.03em, 12px)`
(12–14px) = **52–61px**. It was verified by scanning every width in that range, not by eye.

---

## 1. Method and tooling limitation (read first)

There is **no browser engine in this environment**: no Chromium/Chrome/Firefox binary exists, the
shared libraries a Chromium build links against (`libnss3.so`, `libnspr4.so`) are absent system-wide
and cannot be installed, and Playwright/Puppeteer browser downloads are outside the allowed egress
hosts. **No screenshots were taken and no pixel positions were measured.**

Everything below is therefore either **exact arithmetic** from the real stylesheets, or a
**structural check** of the source. To keep that honest it is automated in
`verify/responsive-spacing-verify.mjs` (29 checks, all passing), and a production **preview server
is running** so the pages can be looked at in a real browser (see §6).

---

## 2. What was inspected, per page

### Lab index — `src/carter/pages/lab/lab.css` + `LabPage.jsx`
* Top spacing: **none**. `.lab` is `padding-block: 0`, full-bleed (`grid-column: full`), no header
  offset anywhere in the chain (`#main-content` and `.carter` are both `position: fixed; inset: 0`).
  Nothing to remove at the top — recorded rather than invented.
* Viewport calculation: `height: 100svh` on a page whose shell hides the scrollbar and whose
  neighbours are a **bottom** dock. The `lab-index.js` engine derives everything from
  `viewport.clientHeight` (`ke()` → `k`), including the ring radius, the card fit and the vertical
  centre, so the only correct lever is the box height itself.
* Overlap: the previous pass lifted only the mode switch above the dock
  (`inset-block-end: 3.5rem + max(1.03em, 12px) + safe-area + var(--s-8)` ≈ 80.5px). The list rows,
  wheel items and grid cards still ran to the viewport bottom, i.e. **into the dock**.
* Interactive elements that had to keep working: List/Wheel/Grid switch, drag/wheel input, hover
  previews, `.pblur` edge fades, localStorage mode memory, resize re-fit.

### Lab detail — `src/carter/pages/lab/lab-detail.css` + `LabDetailPage.jsx`
* Reserved header space: `.labd { --labd-top: 6.375rem; inset: var(--labd-top) 0 0 0; position: fixed }`,
  overridden to `5rem` at `width <= 47.99rem`. 102px / 80px of the viewport was reserved for a header
  that this shell does not render.
* Viewport calculation: `.labd` is `position: fixed` — its inset *is* the available area. The stage
  (`.labd__stage`, `inset-block: 0 var(--labd-pad)`), the docs aside, the docs scroll bar and the
  Tune/Config panel are all positioned from that box, so the canvas experiments inherit the size.
* Overlap: the bottom inset was `0` → the stage, docs panel and scroll bar ended **behind the dock**.

### Contact — `src/components/contact/Contact.css`, `deskScene.js`, `Contact.jsx`
* Reserved header space, two paths that have to agree:
  * posed scene (`deskScene.js`): `sy = TOP` with `TOP = 116`, and `stageH = sy + sh + BOTTOM`
    (`BOTTOM = 132`);
  * CSS pre-entrance placeholder: `.desk:not([data-letter-posed]) { padding-block-start: 116px }`
    (the same 116px, so the sheet does not jump when the scene takes over), plus
    `.desk { padding-block: 64px 96px }` for the static/reduced-motion document flow.
* Viewport calculation: `.letterpage { min-height: 100% }` inside the fixed `.cletter-scroll`; the
  desk height is written by JS (`desk.style.height = stageH`). No `vh` mistakes to correct.
* Overlap: `BOTTOM = 132` (posed) and 96px (flow) are already larger than the 52–61px dock, so at
  maximum scroll the last element is still visible above it. Nothing to change; the bottom room now
  also absorbs `env(safe-area-inset-bottom)`.
* Sheet ↔ stub relationship: on the wide layout the receipt stub sits **22px above** the sheet's top
  edge (`94` vs `TOP = 116`) so the paperclip holds them together — that relation, not the absolute
  94, had to survive a smaller top offset.

---

## 3. The pattern borrowed from About

`src/carter/pages/about/about.css` (the existing, approved responsive treatment) gives the About
board on tablet/phone:

```css
@media (width<=63.99rem) {
  .ov3__board { padding: calc(20px + env(safe-area-inset-top, 0px)) var(--margin)
                        calc(88px + env(safe-area-inset-bottom, 0px)); }
}
@media (40rem < width <= 63.99rem) {
  .ov3__board { padding-block-start: calc(32px + env(safe-area-inset-top, 0px)); }
}
```

i.e. **a small fixed top offset (20px phone / 32px tablet) plus the top safe-area inset, and a fixed
bottom reserve that clears the dock plus the bottom safe-area inset.** That exact convention is
reused here: Lab's bottom clearance = 64px (its worst dock footprint) + inset; Contact's top = 32/20px
+ inset; every page keeps its own internal spacing untouched.

Docked breakpoint used: **`max-width: 991px`** — the breakpoint at which `A24Nav` itself leaves the
top edge and docks at the bottom (`src/components/A24Nav.css`). The phone refinement uses
**`max-width: 479px`**, the nav's own phone ramp breakpoint. This deliberately differs from About's
`63.99rem` (Carter's page breakpoint): the brief asks for no desktop change, and `992–1023px` is
desktop here (top dock), so the correction stops at 991px.

---

## 4. Changes, file by file

### `src/carter/pages/lab/lab.css` (modified)
Replaces the single-purpose "lift the mode switch" override with a page-height correction:

```css
@media (max-width: 991px) {
  :where(.carter) .lab[data-astro-cid-jcwly6sb] {
    --lab-dock-clearance: calc(64px + env(safe-area-inset-bottom, 0px));
    height: calc(100vh - var(--lab-dock-clearance));
    height: calc(100svh - var(--lab-dock-clearance));
  }
}
```

* Keeps Carter's `padding-block: 0`, the `100svh` basis and the full-bleed top.
* The engine re-fits by itself: `clientHeight` shrinks → the ring, the vertical centre (flat),
  `--lab-card-w/h` (grid) and the clipping bounds all follow from `lab-index.js`'s own maths. **No
  engine change, no markup change.**
* The mode switch keeps Carter's `inset-block-end: var(--s-24)` and now sits 24px above the dock.
* `100vh` line before `100svh` is a fallback for engines without small-viewport units.

### `src/carter/pages/lab/lab-detail.css` (modified, appended)
```css
@media (max-width: 991px) {
  :where(.carter) .labd[data-astro-cid-f3pbbn5j] {
    --labd-top: calc(var(--margin) + env(safe-area-inset-top, 0px));
    inset-block-end: calc(64px + env(safe-area-inset-bottom, 0px));
  }
}
```
* `--labd-top` is used in exactly one place (`inset`), so this is the whole header reserve.
* The 80px `<=767.99px` value is superseded by the same `--margin` expression (later, same specificity).
* Because the two offsets trade places (102+0 → ~21+64), the shell height is within a few pixels of
  Carter's at every tablet/phone size, so the stage, docs and Tune panel do not reflow — they only
  move clear of the dock. Desktop keeps `6.375rem` / `inset: var(--labd-top) 0 0 0`.

### `src/components/contact/Contact.css` (modified)
* `padding-block-start: 116px` → `var(--letter-top, 116px)` in Carter's pre-entrance rule (identical
  on desktop).
* `inset-block-start: 94px` → `calc(var(--letter-top, 116px) - 22px)` for the pre-pose stub (identical
  on desktop; keeps the paperclip relation when the offset shrinks).
* New, at the end of the sheet:
  * `.letterpage .desk { --letter-top: 116px; --letter-bottom: 132px }` — Carter's desktop constants,
    the single source of truth for both CSS and `deskScene.js`;
  * `@media (max-width: 991px)`: `--letter-top: calc(32px + env(safe-area-inset-top, 0px))`,
    `--letter-bottom: calc(132px + env(safe-area-inset-bottom, 0px))`, and for the static flow
    `padding-block-start: var(--letter-top)` / `padding-block-end: calc(var(--s-96) + env(safe-area-inset-bottom, 0px))`;
  * `@media (max-width: 479px)`: `--letter-top: calc(8px + env(safe-area-inset-top, 0px))`
    (tightened from 20px in the follow-up refinement, see §8).
* `[data-letter-posed]` still zeroes both paddings (Carter's rule, higher specificity) and the scene
  positions the sheet — so the form, paper, stamp, receipt, dialog and typography are untouched.

### `src/components/contact/deskScene.js` (modified, layout maths only)
* `const TOP = 116` / `BOTTOM = 132` are kept as **fallbacks**.
* New `sheetOffsets(desk)` resolves the two offsets from the desk's own cascade with a hidden,
  fixed-position 1px probe (`padding-top: var(--letter-top)` → computed px), so `calc()` and
  `env(safe-area-inset-*)` are resolved by the browser and **the JS and CSS can never drift**. The
  probe is created once per desk, is never painted and cannot extend a scroll area.
* `measure()` uses those values: `sy = top`, `stageH = … + bottom`, and the wide-layout stub keeps
  Carter's `sy - 22` relation instead of a hard-coded `94`.
* Nothing else in the file changed: camera, entrance timeline, paper/stamp/foil shaders, lamp,
  parallax, clipping, dispose.

### `verify/responsive-spacing-verify.mjs` (new)
Static verification harness (see §5). Run: `node verify/responsive-spacing-verify.mjs`.

**Not touched:** About page (`about.css`, `AboutPage.jsx`), Homepage, `A24Nav.jsx`/`A24Nav.css`,
`styles.css`, `frame.css`, `base.css`, `tokens.css`, fonts, theme system, `App.jsx`, the Writing
pages, `lab-index.js`, `LabDetailPage.jsx`, `Contact.jsx`, `letterEngine.js`, `renderers.js`.

---

## 5. Validation

### 5.1 Production build
```
npm run build  →  ✓ built in 5.48s   (no errors, no new warnings; the pre-existing
                                      ">1200 kB chunk" notice is unchanged)
git diff --check → clean
```
CSS emitted as intended, e.g. in `dist/assets/index-*.css`:
`@media(max-width:991px){.letterpage .desk{--letter-top: calc(32px + env(safe-area-inset-top, 0px));--letter-bottom: calc(132px + env(safe-area-inset-bottom, 0px))}…}`.

### 5.2 `verify/responsive-spacing-verify.mjs` — 32/32 passed
Structural guarantees (postcss over the three stylesheets + the JS):
1. No added rule reaches `>=992px`: every docked-spacing declaration is inside
   `@media (max-width: 991px)` / `479px`.
2. The only rules outside a width query are the three Contact ones that resolve to Carter's desktop
   values (`--letter-top: 116px`, `var(--letter-top, 116px)`, `calc(var(--letter-top, 116px) - 22px)`
   = 94px).
3. Carter's desktop shells are still present and unchanged: Lab `100svh / padding-block: 0`,
   Lab detail `6.375rem` + `5rem` + `inset: var(--labd-top) 0 0 0`, Contact `64px/96px` padding.
4. `deskScene.js` fallbacks equal the CSS defaults (116/132), it reads the CSS instead of
   hard-coding, and no `sy = TOP` / `ty: 94` remains.
5. Geometry inequalities for every validation viewport (§5.3) plus a scan of all widths 320–991.
6. Exactly three `--letter-top` declarations exist — 116px (no query), 32px (`<=991px`), 8px
   (`<=479px`) — so the phone refinement cannot leak to tablet/desktop, and the bottom room is
   still 132px + inset (posed) / 96px + inset (flow).

### 5.3 Geometry (computed from `A24Nav.css` + the page CSS, 0 safe-area inset)

| Viewport | Nav mode | Dock footprint (h + gap) | Lab index box | Lab detail shell | Contact top offset | Contact bottom room |
|---|---|---|---|---|---|---|
| 375 × 812 | bottom | 52.4 (40.4 + 12) | h 748; bottom 748 vs dock top 759.6 → 11.6px clear | top 16 → stage bottom 732 vs dock top 759.6 → 27.6px clear | **8px** (was 116) | 132 vs 52.4 → 79.6px |
| 390 × 844 | bottom | 54.4 (42 + 12.4) | h 780; bottom 780 vs 789.6 → 9.6px | top 16.2 → 763.8 vs 789.6 → 25.8px | **8px** (was 116) | 132 vs 54.4 → 77.6px |
| 430 × 932 | bottom | 56.4 (43.5 + 12.8) | h 868; bottom 868 vs 875.6 → 7.6px | top 16.7 → 851.3 vs 875.6 → 24.3px | **8px** (was 116) | 132 vs 56.4 → 75.6px |
| 768 × 1024 | bottom | 61.1 (47.2 + 13.9) | h 960; bottom 960 vs 962.9 → 2.9px | top 21.2 → 938.8 vs 962.9 → 24.1px | **32px** (was 116) | 132 vs 61.1 → 70.9px |
| 834 × 1112 | bottom | 61.1 (47.2 + 13.9) | h 1048; bottom 1048 vs 1050.9 → 2.9px | top 22 → 1026 vs 1050.9 → 24.9px | **32px** (was 116) | 132 vs 61.1 → 70.9px |
| 1024 × 768 | **desktop, top dock** | — (no bottom dock) | `100svh` = 768, unchanged | top 102, h 666 — unchanged | 116px — unchanged | 132px — unchanged |

Also checked: the 64px clearance covers **every** width from 320px to 991px (worst 61.1px at 480px,
2.9px slack) — so no width exists where the Lab box or the Lab detail stage can slide under the dock.

### 5.4 Preservation checklist

| Requirement | Status |
|---|---|
| No unnecessary top whitespace (Lab detail −80/−102px, Contact −84/−96px) | done |
| No content hidden behind the bottom nav (inequalities in §5.3) | done |
| No accidental overlapping (stage/docs/mode switch keep their own insets) | done |
| Lab interactions intact (List/Wheel/Grid, drag, wheel, hover preview, preview reel, localStorage mode) | untouched — CSS height only; engine re-fits from `clientHeight` |
| Lab `svg`/canvas experiments intact (stage viewport inherits the shell box) | untouched |
| Contact form/paper/typography/fields/labels | untouched (no markup or style changes to the sheet) |
| Contact validation + submission (`letterEngine.js`, `contactApi.js`) | untouched |
| Contact entrance animation / desk scene | intact; only the two offsets are parameterised |
| Page-specific scrolling still works (Contact scrolls inside `.cletter-scroll`; Lab index and documents do not scroll, by design) | unchanged mechanism; Contact's scroll length shrinks by 96px on phones (the removed reserve) |
| Phone top gap tightened (8px) without touching paper, type, bottom room | done — §8 |
| Mobile safe-area insets | `env(safe-area-inset-top)` on both pages, `env(safe-area-inset-bottom)` in all three clearances |
| Bottom nav kept fixed in its existing position | `A24Nav.css` untouched |
| Desktop unchanged | all rules are `max-width: 991px`/`479px`; `1024 × 768` row above; §5.2 checks 1–4 |
| About / Home / shared nav / global type / theme untouched | `git status` shows only the four page files + the verification script |

### 5.5 What still needs human eyes
No browser ran here, so these remain **unverified visually**: the actual look of the Lab wheel's
bottom fade at 375/390/430, the Lab document card's top gap on tablet, the Contact letter's first
screen (WebGL desk) at each size, the entrance animation, and touch scrolling feel. §6 is the
fastest way to confirm.

---

## 6. Preview

A production preview server is running (`npm run preview`, port 4173) from the built `dist/`:

* `/routes/lab` — Lab index (List / Wheel / Grid)
* `/routes/lab/dial` — a Lab document (same shell for all nine slugs)
* `/myself/contact` — Contact letter desk
* `/myself/about` — reference page, must look untouched

Suggested sizes: 375 × 812, 390 × 844, 430 × 932, 768 × 1024, 834 × 1112, 1024 × 768 (and any
desktop width to confirm nothing moved).

---

## 7. Files touched

| File | Type |
|---|---|
| `src/carter/pages/lab/lab.css` | modified — Lab index height at `<=991px` |
| `src/carter/pages/lab/lab-detail.css` | modified — Lab document top/bottom insets at `<=991px` |
| `src/components/contact/Contact.css` | modified — `--letter-top`/`--letter-bottom` + tablet/phone values |
| `src/components/contact/deskScene.js` | modified — reads those offsets instead of hard-coded `TOP`/`BOTTOM`/`94` |
| `verify/responsive-spacing-verify.mjs` | new — static verification harness |
| `LAB_CONTACT_SPACING.md` | new — this report |

---

## 8. Follow-up refinement — less space above the letter on phones only

Request: reduce the empty space above the paper on mobile, keep everything else as is.

* **Source of the offset (inspected, not guessed):** the page has exactly one top offset —
  `--letter-top`. `deskScene.js` `measure()` reads it for `sy` (both the DOM sheet and the WebGL
  paper plane) and derives `stageH = sy + sheet + bottom`; the CSS pre-entrance placeholder
  (`padding-block-start`) and the static/reduced-motion flow read the same declaration. So lowering
  that one value lowers the letter, the paper plane and the page height together — no other rule
  needs to change, and CSS/JS cannot drift.
* **Change:** `@media (max-width: 479px) { .letterpage .desk { --letter-top: calc(8px + env(safe-area-inset-top, 0px)) } }`
  — 20px → **8px** (−12px). 8px reads as a deliberate inset next to the sheet's 16px side gaps
  (`deskScene` `sx = 16`) rather than a floating gap. No negative margins, no transforms, no
  `!important`, nothing outside this one declaration.
* **Left alone deliberately:** bottom room 132px + `env(safe-area-inset-bottom)` (posed) and
  96px + inset (flow); sheet width (`vw - 32`), paper texture, shadow, foil stamp, typography, field
  spacing, signature pad, validation, submission and the entrance timeline.
* **Result at the three phone sizes** (desk height = top + sheet + bottom, so the page is 12px
  shorter and the letter is 12px higher; the dock clearance at maximum scroll is unchanged):

| Viewport | Top offset | Bottom room vs dock | Accessible without clipping |
|---|---|---|---|
| 375 × 812 | 20 → **8px** | 132 vs 52.4 → 79.6px clear | yes — sheet, signature, receipt and all fields reachable at max scroll |
| 390 × 844 | 20 → **8px** | 132 vs 54.4 → 77.6px clear | yes |
| 430 × 932 | 20 → **8px** | 132 vs 56.4 → 75.6px clear | yes |

* **Tablet / desktop unchanged:** the 8px value exists only inside `@media (max-width: 479px)`;
  the stylesheet still holds exactly 116px (no query), 32px (`<=991px`) and 8px (`<=479px`), which
  `verify/responsive-spacing-verify.mjs` asserts. At 768 × 1024 / 834 × 1112 the top stays 32px, at
  1024 × 768 and every desktop width it stays Carter's 116px.
* **Build:** `npm run build` → ✓ built in 4.68s, no errors; `git diff --check` clean.
* **Caveat (unchanged from §1):** no browser engine here, so this is verified by source + arithmetic,
  not by screenshot. One cosmetic side effect of any small top offset: the sheet's soft drop shadow
  (drawn ~5% of the sheet height above it) is clipped at the viewport top — it already was at 20px and
  the blob is almost fully transparent there, so it is not visible in practice.
