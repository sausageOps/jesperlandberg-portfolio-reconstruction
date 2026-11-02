# Responsive Navigation Audit — `A24Nav`

Branch `arena/c2ad1900-jesperlandberg-portfolio-recon` · 2026-11-02 · audit-first, **no source files modified**.

---

## 0. Method and tooling limitation (read this first)

**No browser engine is available in this environment**, so **no screenshots and no live pixel capture could be produced**, and none are guessed.
`/tmp/chromium` exists but cannot start: `libnspr4.so`, `libnss3.so` and `libnssutil3.so` are missing system-wide, and package/CDN egress is blocked. There is no other browser binary.

What the audit therefore rests on — all measured, nothing assumed:

| Evidence | How it was obtained | Precision |
|---|---|---|
| Nav `font-size` (the em base every dock dimension derives from) at each viewport | Resolved the media-query cascade as served by the running dev server on `:5173` | **Exact** |
| Dock height, top/bottom gap, label, logo, chevron, dot, paddings, open-panel size | Arithmetic on that em base (all values are `em`) | **Exact** |
| Dock width | Glyph advances measured from the site's real font `public/assets/fonts/ABCDiatypePlusVariable.woff2` (fontkit) + the component's `--a24-dock-width` formula (`A24Nav.jsx:100`) | **Measured**, ≈ ±2 % (advances taken at `wght 400`; the nav renders at `wght 500`) |
| Behaviour (dropdowns, cross-menu close, deep links, active dot, route fallbacks) | Executed the running site's real bundle in jsdom at **all 11 viewports** | **Exact** (no layout) |
| Screenshots, pixel positions, visual balance, hover feel, actual clipping/overlap | — | **Not obtainable** — flagged per issue |

Rule for this report: if a number is not in one of the two "exact/measured" rows above, it is labelled *estimate* or *unverified*.

---

## 1. Viewport-by-viewport measurements

Dock width is content-driven (`≈21.9em`): logo box 4.5em + 3 × 2em link padding + label advances 7.90em + 2 × 0.875em chevrons + 2 × 0.375em gaps + 1em slack.

| Viewport | Mode | em base | Dock W × H (px) | W / viewport | Edge gap | Label | Logo (box × glyph h) | Chevron | Dot | Item gap | Open panel (px) | Dock H / vh |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1920 × 1080 | desktop, top | 18.40 | ≈403 × 64.4 | 21 % | **19.0** top | 18.40 | 46.0 × 18.4 | 16.10 | 5.52 | 36.8 | 515 × 442 | 6.0 % |
| 1440 × 900 | desktop, top | 13.80 | ≈302 × 48.3 | 21 % | **14.2** top | 13.80 | 34.5 × 13.8 | 12.07 | 4.14 | 27.6 | 386 × 331 | 5.4 % |
| 1280 × 800 | desktop, top | 12.27 | ≈269 × 42.9 | 21 % | **12.6** top | 12.27 | 30.7 × 12.3 | 10.73 | 3.68 | 24.5 | 343 × 294 | 5.4 % |
| 1024 × 768 | desktop, top | 9.81 | ≈215 × 34.3 | 21 % | **10.1** top | **9.81** | 24.5 × 9.8 | 8.59 | **2.94** | 19.6 | 275 × 236 | 4.5 % |
| 834 × 1112 | tablet, bottom | 13.47 | ≈295 × 47.1 | 35 % | 13.9 bottom | 13.47 | 33.7 × 13.5 | 11.78 | 4.04 | 26.9 | ≥320 × 290 | 4.2 % |
| 768 × 1024 | tablet, bottom | 12.40 | ≈272 × 43.4 | 35 % | 12.8 bottom | 12.40 | 31.0 × 12.4 | 10.85 | 3.72 | 24.8 | ≥294 × 267 | 4.2 % |
| **1024 × 1366** | **desktop, top** | **9.81** | **≈215 × 34.3** | 21 % | **10.1** top | **9.81** | 24.5 × 9.8 | 8.59 | **2.94** | 19.6 | 275 × 236 | **2.5 %** |
| 430 × 932 | mobile, bottom | 14.36 | ≈315 × 50.3 | 73 % | 14.8 bottom | 14.36 | 35.9 × 14.4 | 12.57 | 4.31 | 28.7 | ≥341 × 309 | 5.4 % |
| 390 × 844 | mobile, bottom | 13.03 | ≈285 × 45.6 | 73 % | 13.4 bottom | 13.03 | 32.6 × 13.0 | 11.40 | 3.91 | 26.1 | ≥309 × 280 | 5.4 % |
| 375 × 812 | mobile, bottom | 12.53 | ≈274 × 43.8 | 73 % | 12.9 bottom | 12.53 | 31.3 × 12.5 | 10.96 | 3.76 | 25.1 | ≥297 × 269 | 5.4 % |
| 360 × 800 | mobile, bottom | 12.03 | ≈263 × 42.1 | 73 % | 12.4 bottom | 12.03 | 30.1 × 12.0 | 10.52 | 3.61 | 24.1 | ≥286 × 259 | 5.3 % |

Derived constants: pill side gutter 0.5em (6.9 px at 1440, 4.9 px at 1024); logo glyph inset 1.5em from the pill edge; active dot 0.3em, centre `0.55em` below the control centre (2.3em down in a 3.5em dock, 1.05em clearance); open-state widening 21.9em → 28em desktop (+28 %), → 23.75em tablet/mobile (+8.4 %).

### Breakpoint crossings

| Crossing | em base | Label | Dock height | Δ |
|---|---|---|---|---|
| 991 → 992 | 16.00 → 9.51 px | 16.00 → 9.51 | 56.0 → 33.3 px | **−40.6 %** |
| 767 → 768 | 16.00 → 12.40 px | 16.00 → 12.40 | 56.0 → 43.4 px | −22.5 % |
| 479 → 480 | 16.00 → 10.01 px | 16.00 → 10.01 | 56.0 → 35.0 px | −37.4 % |

Also at 992 the dock changes paradigm: bottom-anchored → top-anchored.

---

## 2. Issues

### CRITICAL

**C1 — The nav collapses by 40 % crossing 992 px, and the whole 992–1674 px desktop band is under-sized.**
The 991 px label size (16.00 px) is not re-attained until ≈1674 px wide, so every desktop between 992 and 1670 renders a nav *smaller* than a tablet, and a 1024 px iPad renders the smallest nav in the entire matrix.

- Measured: 991 px → 16.00 px em (dock 56.0 px tall); 992 px → 9.51 px em (dock 33.3 px). At 1024 × 768: dock ≈215 × 34.3, labels **9.81 px**, logo glyph **9.8 px** tall, dot **2.94 px**. At 1024 × 1366 the dock is **2.5 %** of viewport height versus 4.2–6.0 % everywhere else.
- Responsible selectors:
  - `src/components/A24Nav.css:198-200` — `@media (min-width: 992px) .a24-nav { --a24-dock-scale: 1.15; --a24-dock-font: clamp(8.2667px, .833333vw, 32px); font-size: calc(var(--a24-dock-font) * var(--a24-dock-scale)); }`
  - `:224` — same base on short/ultra-wide desktops (`min-aspect-ratio: 11/5`).
  - `:162` — `@media (max-width: 991px) .a24-nav { font-size: clamp(12.4px, 1.61453vw, 16px); }` (the 16 px side of the cliff).
- Recommended fix (pick one):
  - **(a) preferred — raise the desktop fluid floor:** `--a24-dock-font: clamp(10.5px, .833333vw, 32px)`. Result: 992–1260 px → em 10.5 (label **12.07 px**, dock **42.3 px**, dot 3.64 px); ≥1260 px **unchanged**; cliff becomes −24.6 % with no new discontinuity (the floor meets the fluid ramp at 1260 px).
  - (b) floor `11px` → label 12.65 px, cliff −20.9 %.
  - (c) floor `13.9px` (= 16/1.15) → cliff eliminated, but the nav then runs 1.88× page root type at 1024 px — oversized, not recommended.
  - Optional, only if tablet/mobile may change: lower the `≤991` clamp maximum from `16px` to `14.5px` to halve the remaining cliff.

### NOTICEABLE

**N1 — Tablet mode flips inside the tablet set.** 834 × 1112 and 768 × 1024 use the bottom dock; 1024 × 1366 uses the top desktop dock. Same device class, two different nav paradigms (`:161` vs `:193`), because the only switch is the 992 px width breakpoint. Additionally at ≥992 px with a coarse pointer the CSS is desktop-mode while `fineDesktop()` (`A24Nav.jsx:7`, `(min-width:992px) and (hover:hover) and (pointer:fine)`) disables hover-open — a coherent but mixed mode: down-pointing chevrons, tap-only.
- Fix: accept (width-based, mirrors the reference) — this is largely a symptom of C1; fixing C1 makes the 1024 px dock proportionate. A device-class rule such as `@media (min-width:992px) and (pointer:coarse){ --a24-dock-scale: 1.4 }` would close the gap but adds another scale step; not recommended.

**N2 — Nav type is 15 % larger than page type on desktop only.** `--a24-dock-scale: 1.15` (`:198`) makes the nav label 1.15 × page root at every desktop width (13.8 px vs 12.0 px at 1440), while tablet/mobile run exactly 1.00 ×. Deliberate (the approved 15 % enlargement), recorded for completeness.
- Fix: none recommended; if a single typographic voice is wanted, either drop the scale to 1.0 and raise `--a24-dock-height` to 4em for presence, or accept.

### POLISH

**P1 — Desktop top gap gets thin at the low end.** `:203` `padding: 1.03em 1em 0` → 10.1 px at 1024 (1.3 % of viewport height) against a 34.3 px dock, versus 19.0 px at 1920.
- Fix: `padding: max(1.03em, 12px) 1em 0` → 1024: **12.0 px**, 1280/1440/1920 unchanged (12.6 / 14.2 / 19.0).

**P2 — In the open state the white panel and the dropdown's clip box are offset by the dock's top gap.** The panel (`.a24-nav__background`, `:206-211`, anchored inside `.a24-nav__container`) starts 1.03em below the viewport top, while `.a24-nav__dropdown` (`:97-111`) is `position: fixed; inset: 0 0 auto` at the viewport top. So the menu's scroll region, its 3em fade mask and the scrollbar all stop **1.03em (10.1–19.0 px) above the white panel's bottom edge**, leaving a blank white strip and an early clip.
- Fix (desktop only, keeps item positions): `@media (min-width:992px){ .a24-nav__dropdown { top: 1.03em; } .a24-nav .a24-nav__dropdown { padding-top: calc(5em - 1.03em); } }`

**P3 — Dead `.a24-nav__notice` rules.** `:146-148` and `:186-187` style an element the component never renders (no `notice` reference in `A24Nav.jsx`), and their `top: 3.5em` / `top: 25em` values now sit inside the dock footprint (dock occupies 1.03–4.53em).
- Fix: delete those 5 declarations (inert today), or realign to `calc(1.03em + 3.5em + .5em)` if the element is planned.

**P4 — Active dot is sub-4 px at the low desktop end.** 0.3em (`:216`) = 2.94 px at 1024, 3.68 px at 1280, 5.52 px at 1920.
- Fix: covered by C1(a) (→ 3.64 px); if C1 is deferred, `@media (min-width:992px){ .a24-nav__page--current::after { width:.34em; height:.34em } }`.

---

## 3. What is healthy (verified, not assumed)

- **Behaviour identical at all 11 viewports:** 9/9 scripted steps, `errors: []`, identical active-dot sequence (`Life → Life → Life → Myself → Routes → Routes → Life → Myself → Routes`) and identical open/close sequence (`–, Routes, Myself, –, –, –, –, –, –`). Dropdown open, cross-menu close, deep links (`/myself/my-toys`) and the unknown-section fallback (`/routes/unknown-section`) all behave the same on desktop, tablet and mobile.
- **No overflow, wrapping or crowding:** `.a24-nav__toggle { white-space: nowrap }` (`:88`) prevents label wrap; the pill is capped by `max-width: 100%` (`:164`) and the list by `max-width: 100%` (`:167`) with `min-width: max-content` on the outer items (`:169-171`). At 360 × 800 the ≈263 px dock sits inside 336 px of available width — 73 px of headroom; at 320 px width the floor still leaves headroom.
- **Open panel never shrinks:** closed dock ≈21.9em is comfortably under both the desktop open width 28em and the tablet/mobile open width 23.75em, so a menu always widens the panel (+28 % / +8.4 %) — no reflow, no clipping of the trigger row.
- **Alignment:** the pill is centred by `inset: 0 0 auto` + `margin:auto` inside a full-width container (`:55-63`), the list is centred in the inner (`:66`), so the content is optically centred; the toggle dot is shifted `left: calc(50% - .625em)` (`:84`) to sit under the label rather than the label+chevron pair; chevrons point down on the top dock and up on the bottom dock, as designed.
- **No overlap with page content (unverified in pixels):** the dock footprint at 1440 × 900 is 0–62.5 px; in the supplied desktop screenshot the carousel's cards begin around y ≈ 290, and the nav is `pointer-events: none` outside its items.
- **Vertical fit of the open panel:** desktop 24em = 236–442 px inside 768–1080 px viewports; tablet/mobile panels are 259–309 px opening upward from a bottom dock — all inside the viewport.

## 4. Recommended order of work (awaiting approval)

1. **C1(a)** — desktop fluid floor `8.2667px → 10.5px` (one value, both desktop rules: `:199` and `:224`).
2. **P1** — `padding-top: max(1.03em, 12px)`.
3. **P2** — align the desktop dropdown box with the white panel (2 declarations).
4. **P3** — remove the dead notice rules.
5. **N1 / N2 / P4** — accept and document.

## 5. Files affected by this audit

`RESPONSIVE_NAV_AUDIT.md` (this new document) — **nothing else**. No source, component, CSS, data or config file was edited and nothing was committed.
