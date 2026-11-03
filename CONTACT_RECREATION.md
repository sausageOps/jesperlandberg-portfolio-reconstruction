# Contact page recreation — Carter → Jesper

Recreates [carterogunsola.com/contact](https://carterogunsola.com/contact) inside the
existing `/myself/contact` route (previously the generic `Section` placeholder).

- **Route:** `/myself/contact` (unchanged; `src/data/navigation.js` untouched)
- **Components:** `src/components/contact/` — `Contact.jsx`, `Contact.css`,
  `letterEngine.js`, `deskScene.js`, `renderers.js`, `contactApi.js`
- **App wiring:** one branch in `src/App.jsx` (`myself` + `contact` → `<Contact appReady>`)
  and `loading` added to the route memo deps so the entrance waits for the loader.
- No new dependencies (gsap 3.13 and three 0.180 were already used).

## What was ported (from Carter repo read-only reference)

| Piece | Carter source | Here |
|---|---|---|
| Markup | `app/pages/contact.astro` | `Contact.jsx` (1:1 hooks/classes) |
| Styles | `app/styles/contact.css` + shared primitives (`.btn/.roll/.logo`, tokens) | `Contact.css` |
| Form counter | `app/lib/letter.js` fn V | `letterEngine.js` |
| WebGL desk | `app/lib/letter.js` fn R + paper shader | `deskScene.js` (three.js r180: `NeutralToneMapping` == bundle value 7) |
| Ink/pad/receipt/stamp | `app/lib/letter.js` fns F/I/L/fe/ue/de | `renderers.js` |
| z-reveal choreography | `app/lib/runtime.ts` (kinds y/x/o) | `letterEngine.js` `initReveal` |
| POST `/api/contact` | Carter's Cloudflare Worker | `contactApi.js` — **mock**, see below |

## Backend: mock, not live

`contactApi.js` keeps the exact request contract
(`POST application/json {kind,email,body,name,source,signature(dataURL)}` → `{job}`)
with simulated latency and Carter's client-side ticket-number fallback. Nothing is
emailed; payloads log to the console. Set `VITE_CONTACT_API_URL` to a real endpoint
you control to go live. Demo switches preserved: `?counter=closed` (failure path with
mailto fallback + retry), `?counter=offline`. **Do not connect Carter's production
endpoint; we have no credentials for it and must not spray their inbox.**

## Known deviations

1. **Fonts** — Carter's commercial faces (Oracle, PP Neue Montreal Mono, Geist Pixel,
   Untitled Sans) are license-restricted and absent from both repos. Font stacks keep
   the family names with Carter's exact fallbacks; drop licensed woff2 files under
   `public/assets/fonts/carter/` and uncomment the `@font-face` block at the top of
   `Contact.css` for pixel-exact type.
2. **Sheet/stub paper** when WebGL is unavailable or `prefers-reduced-motion` is on:
   falls back to the flat CSS paper + shadow (same as Carter's own fallback).
3. **Halftone "paper-gl" ambient background** — Carter's subtle animated dot-screen
   behind the page is replaced by the identical static fiber-grain texture.
4. **Chrome** — Jesper's A24 navigation stays (top dock, white text over the light
   paper — a deliberate boundary of the port). Carter's header/cmd-menu/drawer/toasts
   and page-transition veil were not ported; the desk entrance runs immediately
   instead of waiting for `veil:reveal`.
5. **Scroll rail / Lenis** — not ported; the page scrolls in its own fixed layer.
6. **Analytics** — the `generate_lead` event (with regex-classified referral source)
   is logged to the console instead of being dispatched.

## Fidelity audit tightening (live Carter CSS/DOM/JS diff, no browser needed)

Post-review audit against the served :4321 CSS chunk, `contact.astro` markup
and `letter.js` engine. `Contact.css` now differs from Carter's contact.css
only by three `border-radius: 0` extras on text inputs (a no-op in every
rendering engine; kept as mobile-Safari insurance). Closed gaps:
- reveal-compensation rules `.sheet__kind .y`, `.sheet__kind.y_`,
  `.sheet__send.y_` restored verbatim — without them the character reveal
  wrapper shifted radio rows and shrank their hit areas;
- paragraph/heading margins now follow Carter exactly (Carter has no global
  margin reset; UA `p` margins are part of the measured design);
- `.slip` no longer gets `letter-spacing: var(--track)` (Carter's dialog is
  untracked); focus rings are Carter's ink 2px/2px (not 4px); the label roll
  also plays on `:focus-visible`, and `Send it`/`Done` keep `will-change`
  hints on hover/focus;
- Logo hover fills the circle (Carter Base.css) and is motion-off under
  `prefers-reduced-motion`;
- Carter's `<noscript>` fallback (inline hide of `[data-letter-send]` + mailto
  note) and the dialog's inert-here `data-lenis-prevent` are back in the JSX.
Markup, attribute values, copy strings, state machine, payload contract,
receipt painter, stamp filter, desk geometry/layout math and the entrance
timeline diff **verbatim-equal** to Carter's served build at this point.

## Viewport stacking fix (black-screen root cause, post-review fix)

The route initially rendered as a blank black page because Jesper's WebGL
canvas (`position: fixed; z-index: 10`) paints above `#main-content`
(`position: fixed`, z-index auto — a fixed element forms its own stacking
context, trapping its children below any z-indexed sibling), and
`Experience.tick()` clears the canvas to opaque black on every non-home,
non-project route. Only `.route-project #main-content { z-index: 20 }` opted
out; `myself` routes never did (Home survives because its cards are
WebGL-drawn meshes, not DOM).

Fix (additive, mirrors the existing project-route pattern):
- `src/App.jsx` — appends a `route-contact` class to `.app` when rendering
  `/myself/contact` only; other routes unchanged.
- `src/styles.css` — `.route-contact #main-content { z-index: 20 }` lifts the
  letter desk's DOM above the canvas on this route only. Nav (z-45), loader
  (z-100) and skip link (z-200) stay on top; the canvas and desk WebGL keep
  rendering; no-WebGL/reduced-motion fallbacks unaffected (`.no-webgl` hides
  `.webgl-canvas` already).

Pre-existing note: the same black-canvas condition affects the older `myself`
Section pages (e.g. `/myself/about`) exactly as before this work — untouched
here intentionally; the same two-line pattern can lift them too, on request.

## Verification path

- Jesper preview: `http://localhost:5173/myself/contact` · Carter reference:
  `http://localhost:4321/contact` — compare at 1440 / 768 / 375 px.
- `npm run build` passes (58 modules, no type/syntax errors; three.js imports resolved).
- Reduced-motion and no-WebGL paths render the static CSS layout.
