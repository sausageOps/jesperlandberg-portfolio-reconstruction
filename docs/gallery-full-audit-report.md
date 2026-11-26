# Complete desktop and tablet gallery audit — read-only technical report

Date: 2026-11-25. Branch: `arena/f7f980e1-jesperlandberg-portfolio-recon`.
Subject: why shader-only “ribbon alignment” changes look almost invisible, and what actually controls the visible desktop/tablet card strip.

**Status: audit only.** No source file, runtime constant, shader, CSS, layout, media, animation, navigation, preloader or Full Index was changed in this audit. The already-present working-tree edit to `public/mobile-master/_nuxt/DZyj3ghP.js` predates this audit and is left exactly as found. Mobile was not audited or modified.

---

## 0. Executive finding

The visible strip is **not one deformed mesh**. It is a row of **independent card planes**, each placed from its own DOM rect, but all of them are passed through the **same world-space deformation function** (`sheet()` + `lean()`) using the same world `x` coordinate. Continuity is therefore a *shared field evaluated at different x positions*, not a single continuous surface.

The original master and the current reconstruction have **identical DOM rects, card world transforms, camera projection, velocity uniforms and program structure** at all four audited viewports. The rendered difference comes from exactly four compiled/uniform deltas:

| Lever | Original master | Current working tree | Effect |
|---|---:|---:|---|
| `SHEET_BANK` | `-0.16` | `0.0` | roll derived from depth-wave slope; **secondary** |
| `SHEET_DIAG` | `0.03` | `0.0` | vertical shear `y += DIAG·x·P`; **major local tilt** |
| `SHEET_SHIFT` | `-0.2` | `-0.45` | shifts depth-wave profile left; **major local curl** |
| `ZF` → `u_leanA` | `-0.12` → `A≈-3.98…4.42` | `0` → `A=0` | global door/hinge depth ramp; **major silhouette loss** |

`SHEET_BANK=0` alone changes the whole-strip top/bottom convergence from **-0.0982 to -0.0977 px/px** (0.5%) in the original configuration, and from **-0.0246 to -0.0255** inside the already-flattened current configuration (3.6%). That is why the isolated bank experiment looked almost the same: it was applied to a strip whose dominant tilt/shear/lean terms had already been changed, and it was measured on individual card edges rather than the shared silhouette.

The primary root cause is the **combination of `ZF=0`, `SHEET_SHIFT=-0.45` and `SHEET_DIAG=0`**, with `SHEET_BANK=0` a minor contributor. Restoring only `SHEET_BANK` cannot recover the original geometry.

---

## 1. Scope, method and evidence quality

### 1.1 What was traced

React host → Nuxt mount bridge → Vue home component → DOM card track → captured rect → Three.js mesh registry → model matrix → card vertex shader → bank/wind/depth/diag/lean/bulge → view/projection → WebGL draw → screenshot, at:

- desktop `1440×900`, `1920×1080`
- tablet `1024×768`, `768×1024`

For each case the audit captured:

- served bundle hash and compiled constants;
- all four compiled shader sources (card/text/floor/other) and the exact card vertex program;
- per-program (not global) uniform matrices and scalars at each `drawElements`;
- DOM rects and computed transforms of `[data-gl="card"]`;
- canvas backing-store size, view/projection matrices, model matrices;
- settled screenshots and 180 ms post-wheel screenshots.

Instrumentation script: `/tmp/pwtest/final-audit.mjs`; per-program uniform probe: `/tmp/pwtest/uniform-focus2.mjs` and `uniform-focus-other.mjs`; rendered-edge measurement: `/tmp/pwtest/measure-edges3.cjs`; exact shader model: `/tmp/pwtest/counterfactual.py`. Data and screenshots are copied into `audit-evidence/full-gallery-audit/`.

### 1.2 Original-master comparison, made valid

The original repo is `sausageOps/httpsjesperlandberg.com` at commit `7155cbb62d4f0ea8c8be6f98c1aed4c6b1dd3d56`. Raw GitHub URLs fail in this environment, so the files were fetched through the GitHub API.

The unmodified original bundle could not be loaded into the React host because `bridge.js` imports `mountMaster`, which the original build does not export. It also fetches DatoCMS, which is unreachable here. To obtain a **real rendered original**, only three non-geometry adaptations were made to a temporary copy of the original bundle:

1. the Dato provider was replaced with the same `window.__masterData` provider used by the captured host (identical enough for the card records and rects);
2. the host’s `mountMaster` export function was appended;
3. the host’s existing root was removed before mount.

No shader source, constant, camera, layout or geometry code was touched. Original bundle SHA-256 `1ed79029…`; patched serving copy `80459fc6…`. The compiled card shader is 4 characters longer than the current one solely because of the constants (`-0.16`, `-0.2`, `0.03` vs `0.0`, `-0.45`, `0.0`). The result is a real WebGL rendering with 8 cards and 4 programs at the desktop and landscape-tablet viewports, not the accessible fallback. This is the comparison used below.

### 1.3 Instrumentation correction that mattered

An initial global uniform-state trace appeared to show `u_sheetP≈0` in the current build and `u_leanA=0` in one case. That was an artefact: uniform names are shared across programs/passes, so a global map captured stale values. With state keyed by WebGL program, the actual draw-time values are:

- `u_sheetP = 1` for the visible card pass in both builds;
- `u_leanA` is negative in the original and exactly `0` in the current build;
- there are two card passes: the reflection pass has `viewMatrix[13]=+23.404`, the main pass has `viewMatrix[13]=0`. Only the latter was used for geometry measurement.

Conclusions in this report use the corrected per-program data.

---

## 2. Architecture trace

```mermaid
flowchart TD
  A[React App.jsx<br/>route=home/full] --> B[MasterMobile.jsx<br/>data-master-range desktop/tablet]
  B --> C[bridge.js → mountMaster]
  C --> D[Nuxt home component mriNB3Nt.js]
  D --> E[DOM track + 8 article cards<br/>data-gl=card]
  E --> F[folio registry UF / sprite manager jB]
  F --> G[getBoundingClientRect → pose()<br/>position / quaternion / scale]
  G --> H[Three.js mesh + ShaderMaterial<br/>24×24 plane]
  H --> I[card vertex shader<br/>sheet() then lean() then bulge()]
  I --> J[viewMatrix × projectionMatrix]
  J --> K[WebGL canvas, reflection pass then main pass]
  K --> L[visible ribbon-like strip]
  D -.->|same sheet() function| M[carousel titles / HUD text]
```

Observed at all four viewports:

- `data-master-range`: `desktop` at 1440/1920, `tablet` at 1024/768;
- DOM cards: `8`; canvas: exactly `1` with backing store equal to viewport;
- compiled programs: `4`; no mode-specific shader was found;
- DOM track rects and each card rect are **bit-for-bit the same** between current and original at a given viewport (e.g. at 1440 the track is `top 254.3, height 391.5`; the centre card is `left 387, width 665.9`). Therefore CSS/layout and content are not the cause of the geometry difference.

The React host is only a shell: it supplies local records through `window.__masterData`, mounts `master.css`, and delegates history. It does not write card geometry. The legacy `src/jesper/webgl/shaders.js` is not active; the compiled source inside `public/mobile-master/_nuxt/DZyj3ghP.js` is.

---

## 3. Transformation pipeline, in execution order

For each card vertex (`position` in `[-0.5, 0.5]²`):

1. **Hover dent, local space**  
   `p.z -= u_hover · u_dent · res.y · dome(uv)`; zero at rest, zero on the silhouette.

2. **DOM → world placement**  
   `w = modelMatrix · p`. `modelMatrix` is built from the measured DOM rect: translation is the card centre in world units, `x/y` scale are rect width/height, no rotation at rest. At 1440 the centre card matrix is essentially `scale(30.65, 18.02, 1)` at `x≈0`.

3. **Bank / wind, about the shared centreline (`sheetWind`)**  
   ```
   q  = w.x / W · T + SHEET_SHIFT
   S(q) = mix(1-q², sin(πq), C) · exp(-q²)     // C=1 desktop/tablet
   a  = SHEET_BANK · S'(q) / π · C · P
   (y,z) ← (y·cos a - z·sin a, y·sin a + z·cos a)
   ```
   `x` is unchanged, so every card rolls about the same world line `y=z=0`.

4. **Depth wave**  
   `z += -D · S(q) · P`, with `D = W · WF · (1 + 1.1·|V|)`. At rest this is an S in depth: near on the left, far on the right, eased to flat by the Gaussian tail.

5. **Vertical shear / wave / velocity rear-up** (guarded by `W>0`)  
   `y += SHEET_DIAG · x · P`; `SHEET_WAVE=0`; when moving, `y += 0.1·W·V·mask·P` and `z += 0.2·W·V·mask·P`; velocity edge twist adds `1.8·V·smoothstep(|x/W|)·P` to the roll.

6. **Hinge / door lean (`lean`, after the wave)**  
   `z += u_leanA · ramp(w.x / u_leanW) · P`, `ramp(s)=s(1.5-0.5s²)` clamped to ±1. `u_leanW=W`, `u_leanA = W · ZF` on desktop/tablet, `0` on small/mobile. This is one shared hinge under all cards and titles.

7. **Bulge and detail transitions**  
   `bulge()` and `u_sheetP` ease out as a card flies into the project page. At the settled home state `u_sheetP=1`, `u_bulgeA=0`.

8. **Camera projection**  
   `gl_Position = projectionMatrix · viewMatrix · w`. The main pass has `viewMatrix = translate(0,0,-41.18)` with fov 75°; projection is identical between builds. The reflection pass uses `viewMatrix[13]=23.404`.

9. **Fragment stage**  
   Reproduces the same depth offset analytically (`vFlat` is the pre-deformation world point) and rolls the analytic normal by the same bank angle; shading follows geometry rather than compensating for it.

This order means the visible silhouette is produced by **perspective acting on depth displacement** (`S(q)`, `u_leanA`) plus the explicit vertical shear (`SHEET_DIAG`). The bank term changes the cross-sectional roll and shading, not the primary left/right convergence.

---

## 4. Relevant parameter inventory

| Parameter | Original | Current | Where | Role |
|---|---:|---:|---|---|
| `SHEET_BANK` | `-0.16` | `0.0` | compiled vertex/fragment shader | roll angle from slope of depth wave |
| `SHEET_DIAG` | `0.03` | `0.0` | compiled vertex shader | world-y shear proportional to world-x |
| `SHEET_SHIFT` | `-0.2` | `-0.45` | compiled vertex shader | moves `q`, so moves near/far peaks and Gaussian tail |
| `WF` | `.2` | `.2` | `sheet()` manager | depth amplitude ratio `D/W` |
| `ZF` | `-.12` | `0` | `sheet()` manager | hinge amplitude ratio `A/W` |
| `SHEET_TAIL` | `1` | `1` | shader | Gaussian decay of the S |
| `SHEET_WAVE`, `WAVE_F`, `WAVE_PH` | `0, .8, .35` | same | shader | parked y-wave |
| `SHEET_VTWIST`, `REAR_Y`, `REAR_Z` | `1.8, .1, .2` | same | shader | motion-only terms |
| `T` (`$F`) | `1.15` | `1.15` | manager | horizontal span of the S |
| `C` | `1` | `1` | manager | sine profile on desktop/tablet; `0` on small |
| `W` | frustum half-width | same | manager | 33.14 / 36.82 / 27.62 / 15.53 at the four viewports |
| `D` | `W·WF` | same | manager | 6.63 / 7.36 / 5.52 / 3.11 at rest |
| `A` | `W·ZF` | `0` | manager | -3.98 / -4.42 / -3.31 / -1.86 originally |
| `u_sheetP`, `u_sheetV` | `1`, `0` at rest | same | uniforms | ribbon weight and scroll velocity |

Moving state was measured with four wheel ticks: `u_sheetV` rises from `0` to `≈0.674`, `D` from `6.628` to `≈11.54`, while `W`, `P`, `A` stay fixed. This behaviour is identical in current and original (`moving-state.json`). The differences reported here are therefore settled-state geometry differences, not animation desynchronisation.

---

## 5. Four-viewport measurements

### 5.1 Runtime parity table

| Viewport | Range | W | D | `u_leanA` current / original | `u_sheetP` | DOM cards | Programs | Rendered difference |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 1440×900 | desktop | 33.138 | 6.628 | `0` / `-3.977` | 1 | 8 | 4 | central card top `+0.0005` vs `+0.1095` px/px |
| 1920×1080 | desktop | 36.820 | 7.364 | `0` / `-4.418` | 1 | 8 | 4 | `-0.002` vs `+0.1166` |
| 1024×768 | tablet | 27.615 | 5.523 | `0` / `-3.314` | 1 | 8 | 4 | `+0.0052` vs `+0.0950` |
| 768×1024 | tablet | 15.534 | 3.107 | `0` / `-1.864` | 1 | 8 | 4 | `+0.0012` vs `-0.0266` |

Slopes are from the exact shader-position model using the captured matrices; positive top slope means the top edge descends to the right. Screenshot edge detection independently shows the same direction and magnitude ordering: the original card strip converges strongly (top descends, bottom rises) while the current strip is nearly flat/symmetric.

### 5.2 Rendered screenshots

| View | Current | Original master |
|---|---|---|
| 1440×900 | [current](../audit-evidence/full-gallery-audit/current-desktop-1440x900.png) | [original](../audit-evidence/full-gallery-audit/original-desktop-1440x900.png) |
| 1920×1080 | [current](../audit-evidence/full-gallery-audit/current-desktop-1920x1080.png) | [original](../audit-evidence/full-gallery-audit/original-desktop-1920x1080.png) |
| 1024×768 | [current](../audit-evidence/full-gallery-audit/current-tablet-1024x768.png) | [original](../audit-evidence/full-gallery-audit/original-tablet-1024x768.png) |
| 768×1024 | [current](../audit-evidence/full-gallery-audit/current-tablet-768x1024.png) | [original](../audit-evidence/full-gallery-audit/original-tablet-768x1024.png) |

Post-wheel versions are in the same directory with `-moving.png` suffix. Note the original centre card leans/converges like a strip seen along its length; the current centre card is almost a flat portrait rectangle with a shallow symmetric bulge.

### 5.3 Measured card edges at 1440×900 (screenshot pixels)

| Source | Centre-card top, x≈390 → x≈850 | Centre-card bottom, x≈390 → x≈850 | Height, left → right |
|---|---|---|---|
| screenshot, current | 259 → 233 | 622 → 665 | measurement mixes into the neighbouring card at the right |
| screenshot, original | 226 → 266 | 681 → 624 | 449 → 363 |
| exact shader model, current | 254 → 262 | 646 → 638 | 393 → 376 |
| exact shader model, original | 232 → 270 | 681 → 608 | 449 → 329 |

Screenshot thresholding can latch onto the dark right side of the current card or the neighbouring card; the exact model was validated against the clear left/middle samples in both screenshots and against the original’s clear right edge.

For the whole visible strip (envelope of three cards, exact model, 1440):

| Configuration | Top slope | Bottom slope | Top/bottom gap |
|---|---:|---:|---:|
| current | +0.0123 | -0.0123 | -0.0246 |
| original | +0.0213 | -0.0769 | -0.0982 |

The original strip converges about **4× more** than the current one. Similar ratios hold at 1920 (-0.0974 vs -0.0240), 1024 (-0.0986 vs -0.0252) and 768 (-0.1031 vs -0.0263).

---

## 6. Why the previous fixes appeared nearly invisible

Counterfactuals below use the *same original matrices and camera* and change one constant at a time. Centre-card slopes are `(top, bottom)`; envelope gap is the top/bottom convergence across all three visible cards. Full table: `audit-evidence/full-gallery-audit/counterfactual-model.txt`.

| Change from original | Centre top | Centre bottom | Envelope gap | Interpretation |
|---|---:|---:|---:|---|
| original | +0.1095 | -0.1346 | -0.0982 | reference |
| `SHEET_BANK=0` only | +0.0894 | -0.1494 | **-0.0977** | almost no change to overall silhouette; changes roll/normal most |
| `SHEET_DIAG=0` only | +0.1395 | -0.1046 | -0.0981 | swaps tilt distribution; gap preserved |
| `SHEET_SHIFT=-0.45` only | +0.0335 | -0.0482 | -0.0830 | large loss of local curl |
| `ZF=0` / `A=0` only | +0.0722 | -0.0972 | **-0.0386** | large loss of shared convergence |
| all current changes | +0.0005 | -0.0005 | **-0.0246** | strip is essentially flat |

Answers to the specific questions asked:

- **What did each adjustment change?** `SHEET_DIAG` removed a vertical shear; `SHEET_SHIFT` moved the depth profile left; `SHEET_BANK` removed a roll derived from the profile’s slope; `ZF=0` removed the shared hinge ramp. See §4 for exact equations.
- **Why nearly invisible?** The isolated `SHEET_BANK` edit is the weakest of these levers on projected silhouette. In the original configuration it changes envelope convergence by 0.5%; even inside the already-flat current configuration it changes it by only ~4%. Its visible signature is mostly cross-card roll and specular normal rotation, which a flat, un-banked strip does not show strongly.
- **Did the earlier edge measurements measure the intended feature?** Only partly. The earlier `bank-zero` numbers were fitted to one card’s top/bottom at x≈470/720/970. The intended “ribbon” is the envelope across the left, centre and right cards; those numbers do not measure it. They also used thresholded screenshot runs that can latch onto the neighbouring card or floor grid, and they were taken after the larger `DIAG`/`SHIFT`/`ZF` changes, so the bank was being measured on an already-flattened strip.
- **Were settled states/viewports identical?** Yes. Uniforms were captured after 15 s, `u_sheetP=1`, `u_sheetV=0`, DOM rects and matrices matched between builds at the same viewport. The difference is not a capture-timing or viewport mismatch.
- **Is another transform compensating?** No compensating transform was found. The shader, fragment normal and titles all use the same `sheet()` function, and the bank is not undone elsewhere. The small visible effect is intrinsic to the term’s size and order, not cancellation.

---

## 7. Root cause

1. **Primary:** `ZF` was changed from `-0.12` to `0`, so `u_leanA` became `0`. This removes the shared world-space door ramp `z += A·ramp(x/W)` that gives the original strip a strong near-left/far-right convergence. It affects every card and title identically and is visible in the overall silhouette.
2. **Primary:** `SHEET_SHIFT` was moved from `-0.2` to `-0.45`, shifting the sine depth profile and Gaussian tail. This moves the near/far peaks and reduces the central card’s curl by roughly two thirds.
3. **Primary:** `SHEET_DIAG` was zeroed, removing `y += 0.03·x·P`; the original top/bottom tilt distribution is lost even though the envelope gap happens to survive.
4. **Secondary:** `SHEET_BANK=0` removes the roll derived from the depth slope. It matters for shading and cross-section, but contributes little to left/right convergence.
5. **Not causes:** DOM layout, card sizing/spacing, content/media, camera, projection, viewport detection, animation timing, interaction, mobile rules, or a different mesh topology. All were measured identical.

The visible “ribbon” is therefore a **shared deformation field over independent card meshes**. Restoring the original silhouette requires restoring the field parameters, not adding another post-transform or touching DOM/CSS.

---

## 8. Recommended correction strategy (not implemented)

The safest correction is to restore the original master’s four geometry levers as one set, because they were designed to compose:

```
SHEET_BANK   = -0.16
SHEET_DIAG   =  0.03
SHEET_SHIFT  = -0.2
ZF           = -0.12    // restores u_leanA = W·ZF
WF           =  0.2     // unchanged
```

Order of work if an incremental approach is required:

1. Restore `ZF=-0.12` first and re-measure the whole-strip envelope; this recovers the largest shared convergence component without touching the fragment shader.
2. Restore `SHEET_SHIFT=-0.2` and `SHEET_DIAG=0.03`; verify the central card’s top/bottom slopes at all four viewports.
3. Restore `SHEET_BANK=-0.16` last; verify cross-card roll/gloss, not just one card’s edges.
4. Compare rendered screenshots at the same four viewports after a 15 s settle, plus a wheel-moving capture. Mobile must be verified unchanged byte-for-byte as in the earlier bank test.

Acceptance should be based on rendered pixels and the envelope measurement (top/bottom convergence and per-card heights), not on compilation, build success, or a single-card slope.

### Expected side effects

- Cards and carousel titles will lean/converge more strongly at desktop and landscape tablet; the 768-portrait tablet effect is smaller because `W` and `D` are smaller.
- Shading/gloss changes with the restored bank and normal rotation; the centre card may appear darker/brighter at the quarter points.
- Hover dent and click flight remain unchanged because they are eased by `u_sheetP` and use separate uniforms.
- Mobile geometry is unchanged by these constants if `small` remains true (`C=0`, `T=.6`, `D=.18W`, `A=0`); this still needs a verification capture after implementation.
- No DOM rect, CSS, card spacing or navigation behaviour is affected.

---

## 9. Evidence index

- `audit-evidence/full-gallery-audit/*.png` — 16 settled/moving screenshots, current vs original, four viewports.
- `audit-evidence/full-gallery-audit/uniforms-1440-1024.json`, `uniforms-1920-768.json` — per-program draw-time uniforms and matrices.
- `audit-evidence/full-gallery-audit/moving-state.json` — rest vs wheel-moving uniform values.
- `audit-evidence/full-gallery-audit/counterfactual-model.txt` — per-lever slope/envelope calculations.
- `audit-evidence/full-gallery-audit/compiled-card-shader-current.txt`, `compiled-card-shader-original.txt` — exact compiled card shader sources.
- Original master commit: <https://github.com/sausageOps/httpsjesperlandberg.com/tree/7155cbb62d4f0ea8c8be6f98c1aed4c6b1dd3d56>

Await approval before implementing any change.
