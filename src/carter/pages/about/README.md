# Carter About in Jesper — Phase 3A (static DOM + CSS)

Route: `/myself/about` ← Carter `/about`
(`sausageOps/carterogunsola-reconstruction`, an Astro build, read-only source).

This folder is a static port: Carter's actual source DOM, content, layout,
typography and page CSS, rendered through the Phase 2 Carter frame
(`src/carter/CarterRoute.jsx`). No behaviour ships in this phase — no engines,
no event handlers, no `useCarterEngine`. The page renders Carter's exact
pre-JavaScript state.

## Files

| File | Role |
| --- | --- |
| `AboutPage.jsx` | The page. Renders `<main id="main" class="ov3" data-canvas>` plus the three sibling `<dialog>`s, matching Carter's `BaseLayout` (`main` + `afterMain` slot). Imports `about.css`, so code + styles land in the About lazy chunk only. |
| `about.css` | About-only atoms from Carter's `global.scss`, then Carter's `app/styles/about.css` verbatim (Frank sheet → About/console sheet), every selector scoped with `:where(.carter)`. |

Registration is the one-line `about: lazy(...)` entry in `PAGES` in
`src/carter/CarterRoute.jsx` (the spot Phase 2 reserved for it). Nothing in
Jesper's shell, shared Carter styles, runtime, routes or build config changes.

## Sources and DOM map

Ported from `app/pages/about.astro` (recovered from the captured original
`pages/about.html`; spot-checked against it), with Carter's `Socials`,
`Button`, `CloseBox` and `Signature` components expanded to their rendered
HTML. Classes, `data-astro-cid-*` scope attributes, `data-*` engine hooks,
ARIA attributes and inline custom properties are Carter's verbatim.

```
main.ov3[data-canvas]
  h1.u-sr-only
  header.ov3__ticket[hidden]            "The Front Office" file strip
  .ov3__board
    section.ov3__hero[data-frank-stage]  stamp portrait card, imprint buttons,
                                         socials, "About me" letter trigger
    article.ov3__tele[data-about]        telemetry: LOCAL/POS/ONLINE/COMMITS
                                         + 154 commit cells
    article.ov3__radio[data-deck-stage]  radio console [data-console]
    article.ov3__tag[hidden]             LOS → SGU luggage tag + barcode
  .ov3__exit[data-canvas-exit][hidden]   "Put it back"
  nav.ov3__drawer                        File:: Writing / File:: Lab tabs
dialog.ov3__letter[data-dialog=letter]   letter prose + Signature
dialog.ov3__rec[data-dialog=record]      8-row experience record + LinkedIn
dialog[data-dialog=onfile]               Awards (9) + Featured in (9) rows
```

Desktop (≥64rem contexts): the board is a 100svh absolute composition —
items are placed by Carter's own `--fx`/`--fy` custom properties, so CSS
alone composes it. At ≤63.99rem Carter's media query stacks the board in a
padded column inside the frame scroller. Drawer tabs appear at ≥82rem.
Row/header collapses happen at ≤48rem/≤40rem/≤34rem (Phase 2 atoms + this
sheet). The theme is the frame's dark default, as in Carter.

## Deferred: engines and interactions (placeholders)

Structure and hooks are present; every behaviour below is a later phase.
Nothing is approximated — Carter's engine-gated CSS states are simply never
entered, which is exactly Carter's no-JS/initial render.

| Deferred piece | Carter owner | Static state here |
| --- | --- | --- |
| Board drag / hover / activate / scrim / exit | `Canvas` (`[data-canvas]`, `app/lib/canvas.js`) | Board composed by CSS. Carter's CSS keeps desktop board links/buttons `pointer-events:none` until an item `.is-active` (≤63.99rem overrides to `auto`, so mobile/tablet controls work). The `.ov3__scrim` node is JS-created and absent; its CSS ships. Exit stays `[hidden]`. |
| Frank 3D card | `FrankCard` (`[data-frank-stage]`, `frank-card.js`) | `[data-frank-gl]` empty host, `display:none` without `.is-stage`; the DOM envelope card renders (Carter's no-WebGL/mobile form). |
| Dialog open/close/focus/scrim-lock | `FrankCard` (dialog owner at every viewport) | All three `<dialog>`s present and closed (`.ov3__dialog:not([open]){display:none}`). Triggers (`[data-dialog-open]`, `[data-dialog-close]`) are inert; `aria-expanded` stays `false`. |
| Radio deck 3D + CSS3D strip | `Deck` (`[data-deck-gl]`, `deck.js`) | `[data-deck-gl]` empty host hidden without `.is-deck`; flat console strip renders in Carter's non-deck geometry. |
| Radio live state | `Console` (`[data-console]`, `console.js`, polls `/api/radio`) | Carter's boot copy forever: "Radio:: Tuning / SEARCHING / Tuning in… / Stand by", `data-on="false"`, EQ/progress suppressed by CSS, art `<img data-con-img>` src-less + hidden, rotation/tape rows `[hidden]`. The `.con__art` button and strip ticks are JS-created and absent; their CSS ships. |
| Telemetry live values + tape flip | `About` mount (`[data-about]`, `runtime.ts`) | Boot state: `--:--`, POS static (marked `data-live`), `···`; commit cells unheated (CSS `--heat` fallback). Scope button inert; no clock, presence socket or GitHub fetch. |
| Record reader line | `Record` mount (`runtime.ts`) | `.rec__reader` sits at rest (`inset-block-start:0`). Row hover dim is pure CSS and ships verbatim (Phase 2 base + `.rec__row` half here). |
| Field marks | `Marks` mount (`[data-marks]`) | `.ov3__field` empty; `.mark` CSS ships. |
| Stamp tilt/shine | `Tilt` mount (`[data-tilt]`) | Shine at `opacity:0`. SVG print filter + postmark are pure markup/CSS and render. |
| Signature ink | `SignatureFx` (`[data-signature]`) | SVG path visible; ink canvas (`.is-ink`) never created. `data-sig-pts` kept verbatim for the engine. |
| Button label roll | `NavRoll` mount (`[data-roll]`) | Plain "About me" text; the `.roll span` CSS has no spans to match — Carter pre-JS identical. |

Also not ported (frame/shell concerns, by phase scope): Carter's Header/
Footer/Veil/paper-GL/chrome, theme switching, Lenis (`data-lenis-prevent`
kept as inert markup), head metadata/JSON-LD (Jesper's shell owns the head;
the tab title stays Jesper's "About — Myself"), and Carter's `html.is-overlay`
chrome rules.

## Assets

- **Stamp portrait (missing binary, honest gap):** Carter references
  `carter-stamp.BRpWjIXQ_4vkhB.webp` (1000w) and `…_ZH60A1.webp` (560w).
  Neither file exists in Carter's repo (checked full git history) or Jesper's,
  and this environment cannot fetch the origin. The `<img>` keeps Carter's
  filenames and every attribute (`srcSet`, `sizes="(max-width: 63.99rem)
  184px, 560px"`, `width/height`, eager/sync/high priority) under the Phase 2
  convention: **drop the two WebPs into `public/assets/carter/about/`** and
  the stamp is complete — no code change. Until then the photo area shows the
  alt text in the fully styled stamp (perforated clip, print filter, caption,
  postmark all render). No substitute imagery was invented.
- Everything else on the page is inline SVG/text/CSS. Icon `<symbol>`s
  (`ai:local:*`) are defined inline exactly as Carter does (suitcase-work,
  trophy, close in the board; x/instagram/github in Socials), each once.
- Fonts resolve through Phase 2 `fonts.css`/`tokens.css` (local()-only faces,
  Carter's system fallbacks) — identical to Carter's reconstruction. Licensed
  Oracle/PP Neue Montreal/Geist Pixel binaries are absent in both repos, so
  text metrics fall back the same way Carter's do.

## Faithful quirks kept (do not "fix")

- `.ov3__sig[data-astro-cid-ta2fbyqs]` never matches: Carter's `Signature`
  root carries no About CID, so the rule is dead in Carter too. Preserved.
- `closebox--fill` and `closebox--md` have no CSS in Carter — dead classes,
  kept in markup verbatim.
- `.ov3__letter` has no dedicated rule (the shared `.ov3__dialog` styles it).
- Carter's manual rows in the on-file dialog deliberately differ from
  Carter's `Row.astro` component (label `text-tag`, chips `text-meta`,
  link-circle inside `.row__tags`). The page markup — not the component —
  is what was ported.
- Socials carries no `data-astro-cid-iupex2mz` attributes (Carter does not
  recreate component-only CIDs; no CSS needs them). Its recovered source had
  a malformed `="true"` attribute there, dropped as unrenderable.
- The "About me" button carries `type="button"` (Carter's `Button` component
  adds it; the older captured HTML lacks it — same delta Carter records).
- Bare `data-*` attributes serialize as `=""` (Carter's captured HTML has
  `"true"` in places; all selectors/hooks are presence-based).
- The 154 commit cells render via `Array.from({length: 154})` — identical
  DOM to Carter's 154 hand-placed `<span>`s, without 308 lines of noise.
- Drawer links keep Carter hrefs (`/writing`, `/lab`); the frame's click
  interception maps them to `/routes/writing` and `/routes/lab`.
