# Gallery: black page, concave panel edges

Screenshots and notes for the pass that put the desktop/tablet home gallery back
the way the approved frame has it: a solid black page and the older panel edge
curvature — every panel's top and bottom edge bowing, middle receding, carried
across the centre and both neighbours as one continuous surface.

`reference-old-black.png` is the approved frame this was matched against.
`compare-reference-desktop.png` stacks it (page area, scaled to 1440 wide) over
the current build at 1440×900.

The change itself lives in:

| File | What it holds |
| --- | --- |
| `public/mobile-master/_nuxt/DZyj3ghP.js` | the captured renderer: `sheet()`/`sheetZ()`/`sheetWind()` vertex stage, card fragment, manager |
| `public/mobile-master/master.css` | the host shim: the 7px track gap and the card height, nothing else |

## What changed

Two things were asked for — background and panel edges — and the diff is kept to
those two plus the one knock-on they force.

### 1. The page is black again

The previous pass had swapped the renderer's clear colour, sky, post wash, wipe
and floor for `#e9e9e9`, driven from a `syncTheme()` method that also wrote
`data-gallery-dark` and `--hud-ink`. All of it is gone:

- `syncTheme()` and both of its call sites are deleted;
- `syncEnv()` is the original again — floor and planar reflection back on
  (`ground.visible = !small`, `core.reflectOn`, the lean and floor uniforms);
- the light wrapper/curtain and `--hud-ink` rules are out of `master.css`, which
  now carries only the ≥650px gap and card height.

`getComputedStyle(document.body).backgroundColor` is `rgb(0, 0, 0)`; the floor
grid is visible bottom-left again, as in the reference.

### 2. The concavity of the panel edges

The renderer's `sheet()` — `sheetWind` → `sheetZ` → the diagonal / y-wave /
velocity rear-up — was restored verbatim from the pre-pass bundle. The one
deliberate difference from what that bundle rendered is the **sign of the depth
profile**:

```glsl
float sheetZ(float wx) {
	// Concave on the S (desktop/tablet): every panel's middle sits FARTHEST, so
	// perspective shortens it there and the silhouette bows like the approved
	// frame. u_sheetC is 0 on a phone, and a phone keeps the convex bowl it
	// always had — the sign never leaves the profile that owns it.
	return mix(-1.0, 1.0, u_sheetC) * u_sheetD * sheetShape(sheetQ(wx));
}
```

The captured bundle bowed the other way: the near peak sat on the middle of the
frame, so the centre card bulged toward the viewer — an arch in the middle of
each top edge, measured at 253 → 225 → 258 px across the card. The approved
frame dips instead — 255 → 310 → 261 px — the middle of the panel is the part
that recedes, and the perspective divide does the bowing for it. Same wave, same
`sheetQ`/`sheetShape`/tail, same constants; the sign of the depth is what
decides which way the S faces.

`u_sheetC` is the renderer's own phone/desktop switch (0 on a phone, 1 on the
strip), so the mix leaves the phone's bowl untouched — see invariance below.

### 3. The haze that followed it

`sheetShade()` keys the depth haze to `sheetZ`: farthest = darkest. With the
depth flipped, the frame's deepest point moved to the middle — onto the card the
eye is actually looking at — and at full weight it flattened the hero card
(mean RGB over the centre card 121, 99, 87 → 57, 49, 45; the reference is 98, 83,
75). The card fragment now damps that term for the ribbon only:

```glsl
tex.rgb = mix(tex.rgb, vec3(0.059), u_shade * 0.8 * pow(depth, u_shadeS) * mix(1.0, 0.35, u_sheetC));
```

which lands the centre card at 97, 81, 72 — the reference's weight — and leaves
the phone at the original 1.0.

## Verification

Captured with Puppeteer + SwiftShader WebGL against the running dev server.

| Shot | Result |
| --- | --- |
| `desktop-1440x900.png` | black page; centre card top edge 257 → 277 → 256 (a 20 px dip, 9 % scale variation across the card, i.e. the same curvature ratio as the reference's 55 px over a taller card); left and right neighbours continue the surface up and out; floor grid and `FEATURED / FULL` present |
| `tablet-834x1112.png`, `tablet-1024x768.png` | same surface, black page, docked nav intact |
| `mobile-390x844.png` | **0 differing pixels** against the previous build's mobile capture — the phone path (stacked cards, `u_sheetC = 0`, no sheet) is byte-identical |
| `full-1440x900.png` | `/full` is black with white type, 0.000 % against the previous build |
| `project-1440x900.png` | card→page transition lands as before; no console or page errors anywhere (`pageerror: none` on every route) |

Interaction smoke test (open/close the profile, drag the strip, click a card
through to its project, back) ran with `errs: none`.

The external Mux video streams fail to load in the sandbox (`stream.mux.com` is
not reachable); that is the capture environment, not this change.

## Known difference from the reference

The approved frame was captured at 1411×947 with the cards at their **natural**
size (`34vw`, ~480 px tall there). This build keeps the current panel
dimensions — `min(43.5svh, 34vw)` with a 7 px gap — so the panels sit smaller in
the frame and the bow measures shorter in pixels, while the *ratio* of scale
variation across a panel (≈9 % here, ≈11 % there) and the silhouette itself stay
the same.

The reference also has a nearer camera (z ≈ 27 against this build's 41.18), which
magnifies the same depth offsets further. Camera position is what the DOM layout
is projected through, so it was not touched.
