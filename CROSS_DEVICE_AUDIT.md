# Cross-device stability audit

## Scope and limitations

A headless Chromium browser was run against the local Website Preview, using software WebGL. The live original's text was retrieved, but direct browser comparison with the original was not available under the sandbox network restrictions. This is not a parity certification. Tests below are simulated viewports and inputs, not physical devices. Most functional checks used reduced motion to make endpoint results deterministic; they do not verify bounce quality or settling.

## Reproduced issue: larger-screen project posts wrap

- **Reproduction:** before the fix, a code-level project scroll probe using a 500px maximum reached a 3,000px target at widths 650, 768, 1024, and 1440. Widths 320 and 430 stopped at 500px.
- **Root cause:** `pushScroll`, `syncProjectScroll`, and `layoutProject` treated only widths below 650px as finite. Larger project posts used an unbounded target and per-item wrap.
- **Fix:** `src/webgl/Experience.js` clamps project targets and current positions on every viewport, uses finite media positions, and computes finite progress. Homepage wrapping and project navigation handlers are unchanged.
- **Verification:** code-level probes at 320, 430, 650, 768, 1024, and 1440px passed repeated forward/backward endpoint checks. In headless Chromium, The Lookback at 1280×800, 768×1024, and 390×844 returned the same media transforms after an additional large downward wheel input and returned to zero after upward input. These checks used reduced motion; exact visual bottom boundaries and touch scrolling still need verification.

## Browser checks performed

- Nathan Riley loaded at 1440×900, 768×1024 and 390×844; its four local image elements reported complete and nonzero natural widths. One 1440×900 project screenshot was inspected and showed the sheet and images. Additional screenshots timed out under software rendering.
- The Lookback's visible Close control returned to `/` at 1280×800, 768×1024 and 390×844. Desktop and tablet attempts to load a second project afterwards timed out in the slow headless browser; this is not sufficient to diagnose an application defect.
- At 390×844, Book of Happiness loaded and keyboard Next/Previous navigated to Dogelon Mars and back. A separate 390×844 touch-emulated session swiped Book → Dogelon Mars → Book successfully.
- At 1280×800 with a fine mouse pointer, the project CTA's left, centre and right sampled points reported `pointer`, including the nested SVG and path. Clicking the CTA, sampling its full boundary, control behavior during dragging, and noninteractive surface drag were not verified.
- Resizing the same browser page across 1440, 768 and 390 widths followed by direct project loads was exercised. Live resize during an open project and orientation changes were not verified.
- No page exceptions were captured during the functional script. Requests for remote `stream.mux.com` videos failed with `net::ERR_CONNECTION_CLOSED`, consistent with the sandbox's outbound-host restrictions; actual remote media playback remains unverified. This environment limitation is not evidence that those assets fail for users outside the sandbox.

## Other checks

- Production build passed at the preceding checkpoint (`npm run build`, 47 modules); there is no separate test or lint script in `package.json`.
- `git diff --check` passed at the preceding checkpoint. The development server returned HTTP 200 for `/` and `/projects/nathan-riley`.
- Project data references: 43 distinct local asset paths checked, none missing; 8 featured projects found. This does not verify all asset decoding or font rendering.
- Listener registration/removal and project pointer-down exclusions were inspected in source; corresponding cleanup and interactive-ancestor guards exist. This is not proof of leak-free repeated interactions.

## Remaining unverified items

- Two viewport sizes per mode in a real browser/device; multiple image-heavy posts; touch scroll endpoints; actual mouse drag on desktop and touch swipe on tablet; repeated CTA clicks, Close, and menu interactions; live resize and orientation changes.
- Visual comparison against the original: media and sheet bounce, stable side gutters and side-panel colors, circular control sharpness, trophy placement and clipping, stacking, and transitions. The existing `MOBILE_PARITY_AUDIT.md` records that an earlier rounded screen-space clip produced residual edge variation; the current mobile sheet clip was added later and has not been visually revalidated.
- Motion tests with reduced motion disabled, including settling and direction reversal; the previous provisional desktop/tablet media-strength adjustment remains unverified against the original.
- The reported progress-ring pixelation remains unverified and unchanged. Remote video playback, full console/network coverage, font rendering, and animation cleanup under repeated real interactions remain unverified.
