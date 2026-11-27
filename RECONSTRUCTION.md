# Jesper Landberg portfolio reconstruction

Reconstruction of the public experience at <https://jesperlandberg.com/>, implemented with Vite, React, Three.js, and GSAP. The site uses the real downloaded project imagery, font, and models; the carousel and project media are rendered with WebGL rather than replaced with screenshots.

## Run

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Production:

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

## Routes and content

- `/` — eight featured projects in the infinitely looping WebGL panel run.
- `/full` — all 23 projects. Eight featured names open local project sheets; the other 15 use their external links.
- `/projects/nathan-riley`
- `/projects/casa-di-solare`
- `/projects/the-lookback`
- `/projects/book-of-happiness`
- `/projects/dogelon-mars`
- `/projects/gil-huybrecht`
- `/projects/discoveryland`
- `/projects/griflan`
- `/newsletter` — newsletter lens and form state.
- Profile is an overlay on `/`, matching the reference behavior.

The canonical catalogue and site copy live in `src/data/projects.js`. Local public assets are under `public/assets/`.

## Implemented behavior

### Featured run

- Infinitely looping horizontal panel run at all widths: last→first and first→last wrap in both directions, including under flick momentum.
- Discrete wheel/trackpad navigation: one deliberate notch or coalesced gesture advances one panel; repeats and inertial tails are suppressed during the transition.
- Unified mouse/touch/pointer dragging follows the pointer, tracks recent velocity, projects fast flicks across multiple panels and the loop seam, and decelerates into an exact panel-centred snap.
- Navigation uses wrapped panel indices and continuous unwrapped spring targets; current/target offsets rebase together by whole loop periods after velocity sampling, so the seam never resets motion or injects a shader velocity spike.
- Navigation physics feed the existing `homeOffset` damping and shader pipeline; curved shader sheets, velocity deformation, scale/depth treatment, captions, arrows, hover and intro animations remain single-sourced.
- Desktop panel shading and drawn pose are authored separately from one velocity. The fragment stage keeps the source's resting depth (`u_sheetD = W · 0.2 · (1 + 1.1 · velocity)`, `u_sheetC = 1`, `u_shadeS = 1`, `u_leanA = -0.12 · W`) so the depth haze and surface light stay on the panels while idle. The vertex stage bends with `u_geoD`/`u_geoC`/`u_geoA`, which keep this gallery's upright resting pose and join the sheet as motion starts; above velocity `0.05` the two sets agree, so scrolling and velocity-driven bending are unchanged. Phone cards still bypass the sheet entirely.
- Native HTML drag is disabled on cards so it cannot cancel the custom pointer gesture.
- Initial Casa Di Solare selection and desktop floor are preserved.
- Project opening transitions and close transitions return to the selected project rather than resetting to Casa.
- Keyboard focus styles, arrow/page/space panel stepping, and a screen-reader project catalogue remain available.
- Reduced-motion preferences snap discretely without momentum. The no-WebGL fallback keeps its native horizontal scroll-snap.

### Full Index

- All 23 names with staggered entrances and pointer-following image previews.
- Source-matched wrapping and gaps; centered separators sit between entries and disappear at line ends, including after resizing.
- Route-specific stacking keeps the index above the WebGL canvas without hiding that canvas.
- Internal and external links use the appropriate behavior.

### Project sheets

- Desktop infinite media scrolling with wheel input and a progress ring.
- Finite, damped virtual project scrolling on coarse pointers, with source-matched bottom runout and offscreen parking; the no-WebGL fallback retains native scrolling.
- Previous/next sheets, ArrowLeft/ArrowRight navigation, close button, Escape, and browser history.
- One WebGL award model exposes the numeric award count through its accessible label.
- The mobile close control is portalled above the media canvas and remains fixed while the sheet scrolls.
- Direct project URLs and production refreshes work.

At a 1440×900 viewport, the root size is `9.6px`. The verified Lookback geometry is:

| Element | Verified rectangle `(x, y, width, height)` |
| --- | --- |
| Main sheet | `(48, 19.1875, 1344, 861.625)` |
| Lookback H1 | `(86.390625, 57.578125, 263.09375, 60.484375)` |
| Description | `(86.390625, 137.25, 384, 64.5)` |
| Metadata | `(86.390625, 244.9375, 400.28125, 26.875)` |
| First media | `(604.8125, 57.578125, 672, 387.0625)` |

The second media item starts at `y=502.234375`. Desktop uses a flex row with `10rem` separation, `4rem` left and `12rem` right content spacing, and related sheets at `10rem`. The source-matched `70rem` media column has a normal-flow track with `4rem` block padding and no inline padding. No negative offset or per-item positional offset is used.

At 390×844, the mobile sheet is `(20, 15, 350, 814)`, its media is 330px wide, and Nathan Riley’s first four media items start at `y=275.78125`, `494.625`, `690.8125`, and `886.90625`. Mobile media uses the source `3rem` gap.

### Profile and Newsletter

- Luminous irregular lens, carousel distortion, and six animated falling llama instances.
- Profile copy, award summary, external social links, and email action.
- Newsletter validation, invalid status, busy state, and an explicit local-only success/status message.
- Source-matched responsive form geometry, a rounded black email field, separate circular submit button, and an animated chromatic focus rim rendered in CSS.
- Escape and HUD controls close the overlays.

### Loading, reduced motion, and fallback

- Loader progress is tied to local texture requests, with minimum duration and a failsafe.
- `prefers-reduced-motion` disables or shortens the animated transitions.
- If WebGL 2 cannot initialize, a preflight check selects a readable DOM fallback without Three.js context errors. The fallback provides native-scroll project cards and project sheets with visible local images.

## Verification performed

Verified on 2026-10-31 with Chromium/Playwright against both the Vite development server and the production preview.

- Desktop home: eight cards, wheel movement, and pointer dragging. A 350px drag moved Casa by approximately 342px while remaining on `/`.
- Mobile home: real dispatched touch gestures changed card positions without opening a project.
- Full Index: 23 entries, eight internal links, 15 external links, visible canvas, working hover preview, and working internal navigation.
- Projects: all eight featured routes loaded their local image assets. Related-sheet navigation, ArrowLeft/ArrowRight, wheel scrolling, native mobile scrolling, close, and Escape were exercised.
- Selection restoration: Lookback → ArrowRight → close centered Book of Happiness at the viewport midpoint.
- History: browser Back returned to the carousel; Forward restored Book of Happiness and all four media items. Settled captures confirmed the media renders after its entrance transition.
- Responsive checks: 1440×900, 768×1024, 390×844, and 320×700. Tablet retains the horizontal run; mobile uses the vertical run.
- Profile and Newsletter: opening, closing, validation, honest submission status, and ARIA states checked.
- Reduced-motion project close checked.
- Forced no-WebGL mode checked on desktop and mobile: native scrolling, readable imagery, and project closing work.
- `npm run build` completed successfully.
- Production smoke covered direct project load, project refresh, `/full`, `/newsletter`, and `/`. There were no page errors, console errors, failed local responses, or missing local images in the final run.
- The completion audit compared all 23 catalogue records and 51 image references against the attached sources. All 43 unique images, the font, and both GLB models passed integrity/source checks; no asset replacements were needed.
- Fresh original/local comparisons at 1440×900, 768×1024, and 390×844 verified the corrected Index wrapping/separators, project description and metadata, mobile media starts, and Newsletter field geometry.
- The final state-based development audit passed 19/19 checks. The final production audit passed 12/12 checks across all eight direct project routes, the home page, Full Index, Newsletter, and runtime/network monitoring.
- A forced no-WebGL production check reconfirmed visible local imagery, native mobile scrolling, fixed close behavior, and restoration of the eight-card home page.
- Final project-motion checks covered open/Close, short-drag release, next, and previous at 1440×900, 768×1024, and 390×844. The latest continuous captures are in `/tmp/jl-site/motion-final3/`; state/layering evidence is in `/tmp/jl-site/layering-final2/`.
- Close now preserves a finite shared-surface flight back to the selected home card, with the original responsive pill geometry and staggered two-stroke hover swap. The temporary renderer debug global was removed.
- No Reload-labeled control was present in the live original or recovered source, so no Reload behavior was added or changed.
- `AUDIT.md` contains the completion report and remaining limitations.

Headless tests used software WebGL. Low software frame rates can make entrance animations take several real frames to appear settled, so visual comparisons and final interaction assertions used relevant DOM geometry, opacity, and application state rather than fixed sleeps alone.

## Remaining limitations

- Mux video streams remain external. Their local poster images are always available, but live video playback depends on network access to Mux.
- The Newsletter does not transmit or store subscriptions; the interface states this explicitly instead of simulating a successful backend request.
- The non-WebGL fallback intentionally uses ordinary native scrolling and does not recreate the infinite shader deformation or lens effects.
- The custom shaders and motion reproduce the observed experience but are not pixel-identical to the original site’s private runtime; lens/llama lighting and media tonal rendering remain approximate. The Newsletter rim uses CSS rather than the original SDF shader.


## Focused project acceptance update

- Related sheets match the original’s responsive size, position, spacing, and fine-pointer hover lift.
- Project titles use 2× WebGL rasterization and the pointer-trail distortion; active warp and rest return were captured without runtime errors.
- Studio/CTA pills use pointer-centered lens deformation, expanding black discs, and chromatic label treatment. The circular project link and Close use their source ring/arrow/stroke animations; static pills remain inert.
- The progress ring is `2.5rem` with a 2px stroke and 0.2 track alpha. Touch tablets and phones retain the original `8rem` scroll runout; fine pointers do not.
- Finite project scrolling includes the original offscreen parking/re-entry rule. At 390×844 the original and local bottom copy/card positions match to subpixel precision and both return to the same top state.
- Final responsive sequences passed opening, short swipe/release, next/previous navigation, Close, and home restoration at 1440×900, 768×1024, and 390×844. Desktop control-hover captures also passed.
- Final development audit: **19/19**. Final production audit: **12/12**. Production desktop/mobile motion smoke and `npm run build` passed; no runtime, console, or failed-network responses were reported.
- Detailed measurements and evidence names are recorded in `AUDIT.md`.


## Mobile menu and scrolling update

- Phone featured scrolling now uses the original per-card wrap ranges and 25%-viewport offscreen parking while retaining the source `3.25×` touch movement, `35×` fling, `0.1` damping, and vertical direction.
- Profile and Newsletter continue to allow touch scrolling beneath the lens. Mobile inside-circle taps are suppressed; an outside tap on a project card activates it just as on the original.
- Full → Featured remounts the phone run at Nathan Riley. Closing Newsletter preserves the current scroll position.
- Original/local repeated touch tests found zero parking mismatches and sampled positions within 0.43px. Frame-based release motion agreed within 0.27px. Inside/outside lens hit tests matched in development and production preview.
- Desktop/tablet behavior, styling, content, assets, and unrelated animations were not changed. The final development audit remains **19/19**, and the production build passes.

## Mobile project/list and deformation update — 2026-11-01

- All 18 supplied references were inspected before the live original/local phone audit. Phone project media flow, finite bidirectional scrolling, canceled scrub, next/previous previews, Full → Project → Close, menu/lens input, and overflow were compared without changing the existing architecture.
- Mobile home cards, captions, arrows, and Close-return flights now bypass the desktop sheet wave as on the original. Home and project media use the recovered `1.3×` scroll-bulge multiplier; the landed white project sheet uses `0.3×`, while related sheets remain flat at rest.
- Browser-only uniform instrumentation verified exact original/local project bulge pairs at shared scroll transforms in development and production. Mobile sheet width/depth remains zero, including during Close. The settled home card edge is flat like the original rather than statically curved.
- Paired phone interactions and production motion/lens probes completed with zero errors and no parked-state mismatches. The development regression passed **19/19** across desktop, tablet, and mobile, and `npm run build` passed. No tablet or desktop behavior was changed; detailed measurements are in `AUDIT.md`.
