# Final mobile audit and resilience follow-up

## Scope and evidence

The fresh pre-change audit is `audit-evidence/mobile-final/audit-before.md`. The authoritative captured master is `sausageOps/httpsjesperlandberg.com` at `7155cbb62d4f0ea8c8be6f98c1aed4c6b1dd3d56`; the integrated runtime was compared with it at 320, 360, 375, 390, 414 and 430 CSS pixels, 844px high, using Chromium touch emulation and software WebGL. Original DatoCMS and Mux hosts were inaccessible from this sandbox; comparisons used locally captured records and images. The earlier migration report contains the implementation and its prior broader interaction checks.

The fresh all-project geometry comparison found 0px difference in measured sheet, title and media rectangles (48 cases). Home card boxes and sampled text widths also matched. At 390px all eight Full/Featured open/close and card-restoration comparisons were observed against the reference; seven screenshot crops had mean RGB difference 0–0.047. These do not establish frame-by-frame animation or live-media parity. The switcher clearance and conditional Close lift are intentional, measured changes to prevent collision with the separately retained A24 dock, not master discrepancies. No other normal-WebGL difference was demonstrated by those measurements.

## Confirmed defects and fixes

| Severity | Confirmed before | Change | After |
| --- | --- | --- | --- |
| High | WebGL context loss left a black portfolio with no usable recovery UI. | Detect the master canvas's non-bubbling `webglcontextlost`, dispose the renderer, and mount a scrollable essential-content fallback. | Forced loss on Lookback gave its description, four media figures, project navigation and A24; no page error (`webgl-after.log`). |
| High | No WebGL2 produced only a message and no portfolio content. | Use the same fallback on failed capability detection. | All eight featured detail pages at all six widths show description/media with reachable close, no horizontal overflow; Full, Featured, paging and A24 remain usable (`fallback-matrix-*.log`). |
| Medium | A renderer initialization failure could leak an uncaught Nuxt context error. | Stop failed rendering immediately but defer releasing the Nuxt context/global while in-flight setup unwinds; serialize later boot. | Injected init failure shows the fallback without an uncaught page error (`webgl-after.log`); the deliberately induced THREE initialization console errors remain expected. |

The fallback is only active after a graphics failure; it is not a replacement for the normal master experience. It uses existing project data, local image assets, original video URLs and host URLs/history; unavailable videos disclose the poster. It provides the featured projects and Full index, previous/next, Close, and native scroll. The normal WebGL master renderer, A24 styling and desktop/tablet renderer are not redesigned. Failure recovery is a usability accommodation, not a claim that its appearance or interactions match the master.

## Media and font investigations

All 15 original featured-project video URLs are preserved and were matched by media index against the captured source records. Their individual probes (`mux-before.log`) failed at TLS with `curl (35) SSL_ERROR_SYSCALL`; this does **not** establish the URLs are broken for users. Actual Mux playback, original-frame color/crop/aspect and phone autoplay are **unverified**. A separate 390px diagnostic intercepted two Lookback Mux responses with an existing, unrelated local MP4 solely as a synthetic fixture: the master showed IMG textures before the delayed response and VIDEO textures with advancing currentTime after load, while the fallback videos also played (`video-fixture-transition.log`). This verifies a mechanism, not original footage, colors, crop, or real-network behavior; the fixture is not shipped as project media. Blocked video requests visibly disclosed poster fallback.

The captured and integrated font files have identical SHA-256 `85b84cae419c7a78b52962e40b9e20cc082bd26c321d9e1718750f6cac3c2320`. Browser samples including curly apostrophes, Å/Ä/Ö, em dash and ® had equal measured widths at all six sizes. The master's referenced `sans-400`/`sans-500` JSON/bin glyph files were absent from the available clone, repository tree and accessible history; the captured runtime's canvas-text fallback is used. Actual phone glyph rasterization and original glyph-file rendering remain unverified.

## Automated checks and boundaries

- No-WebGL fallback: 8/8 featured project details at each width, Full → Lookback → next → reload → Close → Back/Forward, and an idle A24 menu at each width. At 390, a simulated vertical touch moved fallback scroll from 0 to 368px; A24 Studio navigation unmounted it and Back restored Lookback without page errors (`fallback-touch.log`).
- A forced unsupported context, injected renderer failure and post-mount context loss were each exercised at 390; only expected console errors occurred in the injected renderer-failure case. These are simulated, not evidence of recovery from every browser/GPU failure.
- Post-fix normal-WebGL reruns passed 48/48 direct routes, all 48 Full-origin and 48 Featured-origin open/close/restoration flows, and all 48 applicable scroll/next/previous cases plus representative swipes. `audit-evidence/mobile-final/regression-after-summary.md` distinguishes complete sequential results from the initially overloaded, partial parallel attempt.
- A24 at 320/390 and representative 800/1440 desktop/tablet geometry matched checkpoint `950743c`; 800/1440 representative screenshots had mean RGB difference 0 in the earlier limited comparison. A fresh partial A24 rerun matched at 320/390/800 but timed out before the 1440 target case. These are non-regression samples, not an exhaustive desktop/tablet audit. A fresh normal-WebGL Studio→home and 390→800→390 lifecycle ended with the correct renderer and one canvas, without uncaught page errors; two console `Failed to fetch` errors came from blocked requests in the existing desktop renderer (`lifecycle-debug2-after.log`).
- Build passed after these changes; Vite reports its existing large-chunk warning. The staged whitespace check passes excluding the copied compiled master bundle; the full staged check reports pre-existing trailing whitespace/indentation inside its embedded GLSL strings, retained to avoid altering captured shader source. No dependency was added. The reference resources remain preserved.

## Physical-phone checklist — NOT YET PERFORMED

No physical device is available in this environment. Record device model, OS/browser/version, viewport/orientation, network and date; compare with the original master on the same phone where it is reachable. Do not infer a pass from emulation.

1. On a real cellular or Wi-Fi connection load `/`, wait for animation and compare card scale, font/glyphs, colors, transitions and Featured/Full switcher; rotate to landscape and back and check safe areas and dock overlap.
2. For Nathan Riley, Casa Di Solare, The Lookback, Book of Happiness, Dogelon Mars, Gil Huybrecht, Discoveryland and Griflan, open from both Full and Featured, scroll/touch each sheet and close; check project details and restoration of the selected card. Swipe next/previous in both directions; check rapid/repeated taps and gestures starting on links.
3. Exercise Full → project → next → reload → close, browser Back/Forward across the sequence, direct links and A24 Studio → home. Confirm no blank screens, stuck overlays, duplicate history entries or unreachable close/switcher controls. Open and dismiss both A24 dropdowns.
4. On an unrestricted network inspect every original project video for loading, muted autoplay, poster-to-video transition, crop/aspect, colors and looping against the master. Repeat with offline/blocked video: record whether a poster or failure state is visible. Check long descriptions, special characters and font fallback.
5. Background/foreground the tab, rotate repeatedly, use low-power mode and reload; observe scrolling, responsiveness and any WebGL context loss. If a device/browser can disable WebGL or a debugging tool can force context loss, verify the fallback is readable, scrollable, navigable and does not block A24. Record the exact route and steps for any failure.

Freeze/device acceptance remains pending this physical-phone and live-media check. Unverified behavior is not reported as parity or as a proven failure.
