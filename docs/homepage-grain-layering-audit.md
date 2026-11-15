# Homepage panel classification & grain layering audit

You asked which of four explanations was correct. **None of them was, exactly** — the real
cause was a fifth: the grain layer was in the right *place in the element tree* but on the
wrong *side of the canvas*, and the canvas had been made opaque to compensate.

Two corrections fixed it. The main background grain is intact, at full strength and still
animated; project panels now carry none of it.

---

## 1. Classification of every homepage visual element

The most important structural fact: **there is only one canvas.** Panels are not DOM nodes.
`ReframeHome.jsx` renders a `.stage` div; the engine appends a single `<canvas>` to it and
draws *every* tile into that one surface. So "panel" is a draw call, not an element.

| Category | What it is | Where it lives |
|---|---|---|
| **Main page background (field)** | `--ink` `#0f0f0e` — the colour between and behind tiles. **This is what carries the grain.** | `.page` background |
| **Actual project panels** | 3 projects × several units, all opaque, all drawn into the canvas | one WebGL `<canvas>` |
| **Video panels** | `videoUnit(…)` — SmilePP, YWPS, Ruby Law, 1- and 2-column | canvas draw + `<video>` textures |
| **Image / poster panels** | `posterUnit(…)` — Ruby Law, YWPS, SmilePP at 4 aspect ratios | canvas draw + poster textures |
| **Text panels** | hero, intro, contact, email, services ×4, section heads (`svcHead`, `workHead`), clock | canvas draw |
| **Filler tiles** | 5 closing tiles (`filler 0–4`): Refocus, logo glyph, service list, "With care.", compass of arrows | canvas draw |
| **Decorative elements** | `.vignette` edge gradient, `.cross` centre crosshair, `.aim` keyboard tag | DOM siblings *after* the canvas |
| **Transparent / empty containers** | **None inside the field.** Every tile paints opaque. `.stage` and `.page` are sized boxes with no visual content of their own. | — |
| **Interactive elements & overlays** | `.hud--top`, `.hud--bottom`, `.cursor-label`, `.sheet` (detail panel, z-index 5) | DOM, z-index 2–5 |
| **Background textures & effects** | the `::after` grain; the WebGL barrel/vignette distortion; per-media grain *baked into the images* | `.page::after` + shader |

**Which are actual project panels:** the video, poster and text units and the five fillers —
everything drawn into the canvas. Everything else is page composition.

**Answer to your question 3** (are different kinds of element being treated identically?): all
fifteen-plus tiles are genuinely the same class of object — opaque rectangles in one canvas.
The one real asymmetry is that some *media* carries grain baked into the source imagery, while
the painted text tiles are perfectly flat. That difference is intentional and was preserved.

---

## 2. Exact source of the grain effect

**One rule, one instance, no duplication.** `src/reframe/reframe.css`:

```css
.reframe-scope .page::after {
  content: ''; position: absolute; inset: -1em;
  z-index: 1;                     /* ← the bug */
  opacity: .2;
  filter: contrast(75%) brightness(70%) invert(1);
  background: url('/assets/images/a24-grain-substitute.png') 50% / 7.8125em repeat;
  animation: a24-about-grain .6s step-end infinite;
}
```

Verified there is **exactly one** grain instance on the homepage: a scan of every element's
`::after` finds only `.page`, plus two unrelated nav elements. It is not inherited, not
duplicated, and not a global selector.

The asset is a 128 × 128 RGBA noise tile: RGB all zero, **alpha only** (mean 15.6, max 90).
It is pure transparency noise — the texture contribution comes entirely from the `filter`
chain inverting and darkening it.

**Which layer it was on:** z-index 1, while the canvas had **no z-index** (`auto`). A positive
z-index against `auto` wins, so the grain painted *above* the canvas — and since the element is
`inset: -1em` on a fixed, full-viewport `.page`, it covered **every pixel of the screen,
panels included**.

That is the answer to your question 4: the grain was being composited above the project media,
as a single full-viewport sheet.

### How it got there — the actual history

`git diff` shows the whole grain block is *new* (every line `+`, appended at `HEAD`). It did
not exist in the base commit. And it carried this note:

> About's ::after is opaque `#171717` and can sit at z-index 1, but **the home stage is an
> opaque WebGL canvas, so the grain has to ride above it** (z-index 1 …) or it would never be
> seen.

So the reasoning was: "the canvas is opaque, therefore grain must go on top." That is where
the contamination came from. The opaque canvas was the constraint — the fix is to remove the
constraint, not to live with its consequence.

### What it actually looked like

Amplified difference between grain-on and grain-off, same page load, media frozen:

- Before: fine speckle **uniformly across the whole viewport** — the hero's white paper, the
  Ruby Law poster, the dark About panel, and the gaps, all equally textured.
- After: speckle **only in the gaps and outer margins**; every panel interior is flat zero.

---

## 3. Which elements were incorrectly receiving grain

**Every panel — all of them.** Not a subset, not edge cases. Because the grain was one
full-viewport sheet above the canvas, it hit 100 % of the field and 100 % of the panels with
no mask or falloff.

Measured on painted (locally uniform) panel interiors, toggling grain within one page load:

| | before fix | after fix |
|---|---|---|
| Panel interiors changed | **every pixel** | **0.0 %** of pixels |
| Field gaps changed | every pixel | 29 – 43 % of pixels |
| Hero white paper (flat) | high-frequency energy **3.4× higher** with grain on | **0.00** on both — perfectly flat |
| Field gap | flat black | std **1.71** — grain visibly present |

The panels were also being slightly *brightened and contrast-shifted*, because the `filter`
chain is `invert(1)` + `brightness(70%)` + `contrast(75%)`: a 20%-opacity inverted noise
sheet over the image acts as a light hazing pass. That is why images looked "the same grained
treatment" as the background.

**Transparent/empty elements:** there are none in the field, so nothing was exposing grain
through transparency. Answering your question 2 directly: no, the panels are not transparent.

---

## 4. Files modified

Two files, three edits — all at the compositing source, none touching layout.

### `src/reframe/engine.js`

```diff
- renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, … });
+ renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true,
+                                      premultipliedAlpha: false, … });

- renderer.setClearColor(P.ink);
+ renderer.setClearColor(0x000000, 0);
```

The canvas must clear **transparent** so the field surface behind it can show through the
gaps. `premultipliedAlpha: false` keeps the shader's `col * alpha` output correct for the
non-premultiplied canvas format the hardware compositor expects.

### `src/reframe/reframe.css`

```diff
- .reframe-scope .page { position: fixed; inset: 0; }
+ .reframe-scope .page { position: fixed; inset: 0; background: var(--ink);
+                        isolation: isolate; }

  .reframe-scope .page::after {
-   z-index: 1;   /* over the canvas */
+   z-index: -1;  /* above .page's field colour, under the canvas */
```

The field colour moves from the GPU clear to the `.page` background — the same `--ink`
`#0f0f0e`, verified identical to the pixel. `isolation: isolate` is required: without it the
negative index escapes to the route-level stacking context and the grain falls behind the
background and disappears entirely. This is exactly what a first attempt did — see §6.

**Not changed:** no panel dimensions, no grid spacing, no `colWidth`/`gap`, no tiles, no
media, no interactions, no About page, no other route. The grain's tile, opacity (0.2),
filter, `.6s step-end` timing, breakpoint table and shared `a24-about-grain` keyframe are all
untouched.

---

## 5. Corrections made

**The grain now belongs to the field, and the field is behind the tiles.**

```
z-index -1   .page::after    the grain
background   .page           the field colour (--ink)
(auto)       canvas          tiles drawn opaque, gaps left clear
(auto)       .vignette       edge shading
z-index 2    .hud            nav (unchanged)
z-index 5    .sheet          detail panel (unchanged)
```

Photos and videos are opaque, so grain physically cannot reach them. The gaps between tiles
are canvas pixels with alpha 0, so the grain shows through there — continuous across the whole
viewport, because the layer is still one full-viewport sheet.

One extra correctness note found during verification: **`z-index: 0` is not enough.** A `0`
ties with the canvas and loses on tree order, since `::after` is the last child — the grain
stayed on top. Only a negative index inside an isolated context paints beneath. Both the
`-1` and the `isolation` are load-bearing.

---

## 6. Visual verification

**Primary test — single page load, grain toggled, media and CSS animations frozen** (so the
only variable is the grain layer):

| viewport | panel interiors changed | field changed | verdict |
|---|---|---|---|
| 1920 × 1080 | **0.0 %** (n = 585 722) | 37.2 % | clean |
| 1440 × 900 | **0.0 %** (n = 340 392) | 42.8 % | clean |
| 768 × 1024 | 1.8 % (n = 153 379) | 33.0 % | clean\* |
| 390 × 844 | **0.0 %** (n = 61 149) | 29.2 % | clean |

\* the 1.8 % is neighbouring video tiles drifting between the two shots, not grain — those
pixels are in motion regardless.

**Sizes and positions:** 1920, 1440, 1280, 1024, 768, 430, 390 at the landing position, plus
panned positions at 1024 and above. `overflow = false` at every size; no horizontal scroll.

**Grain layer, confirmed at every size:** `z-index -1`, `opacity 0.2`,
`animation-name a24-about-grain`, `.page` background `rgb(15,15,14)`, `isolation: isolate` —
identical across all seven widths, and exactly one instance.

**Grain is still animated:** transform sampled 400 ms apart →
`matrix(1,0,0,1,-6,3.6)` → `matrix(1,0,0,1,4.8,-2.4)`.

**Panels retain their own textures:** the video and poster tiles keep the grain baked into the
source media — visible in the Ruby Law and YWPS footage, untouched. Painted text tiles (hero,
About Us) are now perfectly flat, which is their original appearance.

**No visual regressions:**
- Layout, panel sizes, gaps and ordering byte-identical to the previous task (field colour
  measured `[14.92, 14.92, 13.92]` vs `[15, 15, 14]` before — a 0.08 rounding difference).
- Panel appearance unchanged with grain off: hero paper `218.94/216.01/209.40` →
  `219.02/216.12/209.52`; Ruby poster `48.92/47.02/44.67` → `48.90/46.87/44.51`.
- Detail sheets open correctly, sit above the grain, full metadata intact.
- HUD at z-index 2, still above the grain.
- About page completely untouched: still paints its own grain on `.app.route-about::after` at
  z-index 1; the home route has no `::after` content on `.app`.
- Build: `npx vite build` → exit 0.

---

## 7. Summary of the four hypotheses

| your hypothesis | verdict |
|---|---|
| 1. Grain overlay incorrectly affecting panels | **Correct — this was the cause.** One full-viewport layer above an opaque canvas. |
| 2. Transparent panels exposing the global background | **No.** Every tile paints opaque; the canvas is one surface. |
| 3. Different element types treated as identical panels | **No.** All tiles really are opaque rectangles in one canvas. |
| 4. Grain on the wrong compositing layer | **Correct, and the precise mechanism.** It was above the canvas rather than beneath it, because the canvas had been set opaque — which was the only thing making that arrangement necessary. |

The five corrections you listed as forbidden were all avoided: the main background grain is
still there at full strength, grain is not disabled anywhere, no per-panel grain was added, no
imagery was flattened or replaced, and no dimension, spacing or page structure changed.
