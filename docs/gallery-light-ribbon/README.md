# Gallery: light page, one continuous ribbon

Screenshots and notes for the pass that rebuilt the desktop/tablet home gallery to
match `reference-target.png` (the captured reference view of the live site).

Everything here is evidence for the change; the change itself lives in:

| File | What it holds |
| --- | --- |
| `public/mobile-master/_nuxt/DZyj3ghP.js` | the captured renderer: ribbon vertex function, card fragment, page/route theme sync |
| `public/mobile-master/master.css` | the host shim that owns the light page colour, the 7px track gap, the card height and the HUD ink |

## What the reference actually is

Measured off `reference-target.png` (content area 1670×878):

- Page is `#e9e9e9`, HUD type is `#151515`.
- Cards are **square** (no radius) and separated by **7px**, edge to edge.
- Card height is ~44.6% of the viewport height in the middle of the frame, and the
  silhouette **grows to ~1.9× that at the frame's edges** — a level top edge across the
  centre card, then a steep sweep up in the last card on either side. Top and bottom
  edges bow symmetrically about the vertical centre.
- Roughly 2.2–2.4 cards fit across the frame.
- The photographs are clean: no vignette, no specular glare band, no dark scrim.

## What changed

### 1. `ribbonSurface()` — the strip is one surface (vertex stage)

`sheet()` in the shader now delegates to a single `ribbonSurface(vec4 w)`:

```
vec2 ribbonProfile(float wx)     // q = wx / halfWidth, then a soft-max depth 0..0.696
vec4 ribbonSurface(vec4 w)       // x *= (1 - d);  y *= (1 + 0.5 d);  z += d * cameraZ
```

- `d` is **flat across the middle and takes everything past |q| ≈ 0.55** (a soft max, not a
  smoothstep), which is what makes the centre cards level and the wings sweep.
- `v = d * cameraZ` pushes the columns toward the camera, and the perspective divide then
  magnifies them by `1 / (1 - d)`. That is where the height growth comes from.
- `x` is multiplied by the **same** `(1 - d)`, which cancels the divide exactly: the screen x
  of every vertex is its own world x, to the pixel. Cards keep their own DOM columns, the
  7px gaps stay 7px all the way out, and the DOM hit boxes stay on their pictures. Without
  that cancellation the outer cards spread and overlap.
- `RIBBON_Y_GROW` adds 50% on top of perspective so the rim reaches the reference's ~1.9×.

Fitted constants (`RIBBON_Q0 0.55`, `Q_EPS 0.06`, `D_RATE 2.42`, `D_LIM 0.696`,
`D_BASE 0.018`, `Y_GROW 0.5`) reproduce the reference silhouette:

| q (share of half-width) | reference growth | implemented growth |
| --- | --- | --- |
| 0.4 | 1.00 | 1.00 |
| 0.6 | 1.06 | 1.03 |
| 0.8 | 1.35 | 1.36 |
| 1.0 | 1.91 | 1.91 |

Measured on the shipped build at 1440×900: centre card 254…645 px, frame edge 76…824 px —
ratio 1.91. The card plane is subdivided `48×24` so the bow is smooth across a card.

### 2. The card fragment stops shading the strip (fragment stage)

For strip cards (`u_sheetW > 0 && u_sheetP > 0`) the depth fog
(`mix(rgb, #0f0f0f, 0.8·depth)`) and the `sheetLit` specular band are skipped; only a 3.5%
edge fall-off remains. The caption scrim drops from `0.65` over the bottom half to `0.36`
over the bottom third. The `< 650px` mobile column and `/full`'s rail previews keep the old
branch byte for byte (`u_sheetW == 0` / `u_sheetP == 0`), so those surfaces are untouched.

### 3. The page is light, the floor is gone, the HUD follows

- `syncTheme()` runs from `mountEnv()` and from `tick()`; it derives the theme from
  `$resize.small` and `location.pathname` (`/full` → dark, everything else on
  ≥650px → light), writes `data-gallery-dark` on `<html>`, and drives the sky plane, the
  post pass's `u_bg`, the wipe's `u_bg` and the renderer clear colour between `#e9e9e9`
  and `#000000`. Out-of-bounds samples in the black hole / wipe now return `u_bg` instead
  of hard-coded black, so the hole has nothing black to bleed when the page is light.
- The old WebGL grid floor and its planar reflection are switched off
  (`syncEnv()` hides `ground`, `core.reflectOn = false`).
- The HUD is real DOM type whose glyph colour is `-webkit-text-fill-color: transparent`
  (the renderer paints it), so the ink is pushed twice: `--hud-ink` in CSS drives the
  colour the renderer samples when it builds the glyph planes, and `syncTheme()` calls
  `setColor()` on the live HUD planes whenever the theme changes. Result: `#151515` on the
  light gallery, `#ffffff` on `/full`, on mobile (unchanged) and over the profile's black
  disc.

### 4. Sizing that the renderer is reading

`master.css`, `@media (min-width: 650px)`:

```css
#__nuxt [data-gl="card"] { height: min(43.5svh, 34vw); border-radius: 0; }
#__nuxt main > div.s\:flex-row { column-gap: 7px; }
```

`43.5svh` is the design's own card height (the unchanged `s:h-[43.5svh]` class); `34vw`
only bites in portrait, where the `svh` rule alone would make a card ~99vw wide.

## Screenshots

| File | State |
| --- | --- |
| `reference-target.png` | the reference view handed over |
| `compare-reference-desktop.png` | reference (cropped to content) beside this build at 1440×900 |
| `before-after-desktop.png` | the same page before / after at 1440×900 |
| `before-after-mobile.png` | 390×844 before / after — unchanged, as intended |
| `desktop-1440x900.png` | home, 1440×900 |
| `tablet-1024x768.png` | home, 1024×768 |
| `tablet-834x1112.png` | home, 834×1112 portrait |
| `mobile-390x844.png` | home, 390×844 (the frozen mobile column) |
| `profile-open-1440x900.png` | the profile's black disc open over the light gallery |
| `full-1440x900.png` | `/full` loaded directly (dark, white ink) |
| `full-after-nav-1440x900.png` | `/full` reached by client-side navigation (theme flips) |
| `project-1440x900.png` | `/projects/casa-di-solare` |
| `project-390x844.png` | the same sheet on a phone |

Mobile regression: `before-mobile-390x844.png` vs `mobile-390x844.png` differ in 1.7% of
pixels, and **98% of those sit in the bottom nav dock's rows** (the A24 dock's expand
animation is at a different phase between captures). No card, caption or layout pixel
moves below 650px.

## Known, pre-existing

Navigating home → `/full` → home (or `history.back()`) leaves the returning strip stale:
the departed project's panel stays parked on the left and the cards keep the previous
route's poses. This reproduces on the unmodified build — it is not caused by the ribbon
work, and it is left as-is here.
