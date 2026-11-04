# Carter About in Jesper — Phase 3B

Route: `/myself/about` ← Carter `/about`

Source: `sausageOps/carterogunsola-reconstruction` at `3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249` (read-only checkout).

Phase 3A's About DOM and `about.css` are preserved. Phase 3B adds Carter's
source-confirmed page engines and binds them through the existing Phase 2
`useCarterEngine` / `onDestroy` boundary. All new behavior stays inside
`src/carter/`; no shell, shared runtime, route, or dependency change is needed.

## Files

| File | Role |
| --- | --- |
| `AboutPage.jsx` | Keeps the Phase 3A markup and mounts the About engines after React commits the page. |
| `about.css` | Unchanged Phase 3A About stylesheet; its engine-owned states and generated-node styles were already present. |
| `engines/canvas.js` | Carter's board interaction, drag/hover/activation, keyboard focus, scrim, and exit control. |
| `engines/frank-card.js` | Three native-dialog interactions plus the desktop Frank envelope renderer. |
| `engines/deck.js` | Desktop radio-deck renderer and the Canvas-to-deck scale hand-off. |
| `engines/console.js` | Carter's radio polling, now-playing subscription, status/track/progress updates, and optional waveform path. `data-con-plain` deliberately keeps the About console on its source-authored flat path. |
| `engines/about.js` | About telemetry: local clock, online count, GitHub contribution grid/total, and ink/green tape flip. |
| `engines/nav-roll.js` | Character spans for the About-me trigger label. |
| `engines/signature-fx.js` | Responsive signature ink canvas, theme redraw, reveal timing, and pointer sweep. |
| `engines/record.js` | Experience-row reader line. |
| `engines/marks.js` | Carter's stamp templates, placement/avoidance, and field pointer trail. |
| `engines/tilt.js` | Stamp tilt and shine. |
| `engines/about-services.js` | About-scoped clock, presence/NowPlaying stores, site values, and Carter text-roll helper. Realtime sockets are lazy and only open for `?realtime=live`. |
| `engines/three.js`, `css3d.js`, `studio-env.js`, `mesh-wire.js`, `wheels-gl-warm.js` | The source-confirmed Three.js and scene helpers used by the two desktop renderers, adapted to Jesper's existing dependencies. |

## Source and DOM map

Ported from `app/pages/about.astro` and the relevant Carter modules:
`app/lib/canvas.js`, `frank-card.js`, `deck.js`, `console.js`, and the About,
NavRoll, SignatureFx, Record, Marks and Tilt mounts in `app/lib/runtime.ts`.
Their helpers are limited to `css3d.js`, `studio-env.js`, `mesh-wire.js` and
`wheels-gl-warm.js`. The exact Three.js alias mapping was checked against
Carter's bundled module; the port imports Jesper's existing `three` and GSAP
packages instead of adding or upgrading dependencies.

```text
main.ov3[data-canvas]
  section.ov3__hero[data-frank-stage]
    [data-frank-gl] / [data-frank-layer] / [data-frank-card]
    [data-marks] / [data-tilt] / data-dialog-open triggers
  article.ov3__tele[data-about]
    [data-about-time] / [data-online] / [data-commits] / [data-about-scope]
  article.ov3__radio[data-deck-stage]
    [data-deck-gl] / [data-deck-layer] / [data-console][data-con-plain]
  .ov3__exit[data-canvas-exit]
  nav.ov3__drawer (ordinary Writing and Lab anchors)
dialog[data-dialog=letter]   letter prose and [data-signature]
dialog[data-dialog=record]   record rows and [data-record-reader]
dialog[data-dialog=onfile]   awards and featured-in rows
```

## Engine ownership and behavior

| Engine | Carter-owned behavior preserved |
| --- | --- |
| **Canvas** | At desktop widths, hover and drag physics; held/active/dimmed item states; activation and return-to-board transitions; collision shove; item scaling event; keyboard focus activation and Escape; outside click, scrim and “Put it back.” Mobile keeps Carter's stacked layout and direct controls. |
| **FrankCard** | Opens the matching native `<dialog>`, animates its entry/exit, handles the close button, Escape/cancel and backdrop click, updates `aria-expanded`, and returns focus to the trigger. At `min-width: 64rem` it adds the envelope canvas; a failed/unavailable renderer leaves the DOM card and dialogs usable. |
| **Deck** | At `min-width: 64rem`, adds the radio turntable canvas and CSS3D panel; listens for Canvas scaling and the Carter frame's theme. Outside that breakpoint or without WebGL, the static console remains. |
| **Console** | Polls Carter's radio endpoint, handles live/off/quiet/no-signal states, track art and progress, history labels, and the source debug modes `?radio=mock` / `?radio=fail`. Carter's `[data-con-plain]` hook prevents a separate waveform canvas on this About page. |
| **About** | Formats the `America/Denver` clock and updates while visible; displays Carter's local presence fallback (1) or the optional live count; fetches the GitHub contribution year for the 154-cell grid and total; flips the tape and updates `aria-pressed`. Unavailable telemetry follows Carter's seven-second timeout/hide behavior. |
| **SignatureFx** | Converts the stored 522-point signature path to the weighted ink canvas, waits for Carter's veil reveal / visibility where appropriate, redraws for size/theme changes, and runs the hover wipe. |
| **Marks** | Creates Carter's SVG marks in the existing field, avoids the marked regions, and adds/removes them along the original pointer trail. |
| **Tilt** | Applies the original fine-pointer tilt and shine response and resets on pointer leave. |
| **Record** | Moves the existing reader line to hovered experience rows and hides it on leave/window blur. |
| **NavRoll** | Wraps the existing “About me” label characters using Carter's `--index` hooks. |

The Writing and Lab items in `.ov3__drawer` are ordinary anchors, not an About
drawer controller. They continue through the existing Carter frame link
interceptor; no Lab or Writing engine is mounted here.

## Lifecycle, responsive behavior, and scope

Every engine is mounted once through `useCarterEngine`; teardown uses the
existing `CarterRoute` `destroyAll()` boundary while the outgoing DOM is still
attached. Page-owned listeners are aborted, observers disconnected, GSAP work
killed, timers/intervals cancelled, live sockets closed when their last
subscriber leaves, and generated marks/canvases removed. The Desktop WebGL
canvases are created only at Carter's `64rem` breakpoint and are removed when
the breakpoint changes or the About route unmounts. The Phase 3A CSS continues
to own the mobile/tablet stack, desktop composition, drawer breakpoint (`82rem`),
reduced-motion rules, and hit-testing states; no CSS or static DOM rewrite was
needed.

No Carter-wide Nav, SignatureFx/global effects, loader, background, HUD,
Lenis, theme switcher, or other route engine is mounted. The About-specific
clock/presence/NowPlaying adapters are local to this integration; the shared
Jesper runtime and `useCarterEngine` hook are unchanged.

## Verification performed

- `npm ci` completed using the existing lockfile; no dependency files changed.
- `npm run build` passed after the Phase 3B changes.
- The production Vite preview returned `200 text/html` for direct requests to
  `/`, `/projects`, `/contact`, `/studio`, `/lab`, `/writing`, and
  `/myself/about`. This verifies the SPA fallback for refresh/deep links, not
  client-side rendering or clicking through the route UI.
- `git diff --check` passed. Static lifecycle review covered the page-owned
  abort signals, timers, observers, GSAP work, sockets, generated marks, and
  WebGL canvases. No browser executable is available for live interaction or
  pixel-level comparison.

## Known fidelity gaps

- **Stamp portrait assets are still absent:** Carter references
  `carter-stamp.BRpWjIXQ_4vkhB.webp` (1000w) and
  `carter-stamp.BRpWjIXQ_ZH60A1.webp` (560w). Neither repository contains the
  binaries. The existing `<img>` keeps Carter's paths and attributes under
  `/assets/carter/about/`; place those two WebPs in
  `public/assets/carter/about/` to complete the portrait. No replacement image
  was invented.
- The original licensed Oracle / PP Neue Montreal / Geist Pixel font files are
  absent in both repos. Jesper's existing Carter font declarations therefore
  use the same system fallback family as Phase 3A.
- Real radio API/CORS, GitHub API and optional `?realtime=live` socket behavior
  depend on external services. If the radio cross-origin request is refused,
  the source failure state (`No signal / RETRYING`) is retained.
- No browser executable is available in the checked environment. Production
  build, route responses and static lifecycle/source checks can be verified;
  pixel-level Carter/Jesper comparison at desktop, tablet and mobile cannot be
  claimed without a browser.
