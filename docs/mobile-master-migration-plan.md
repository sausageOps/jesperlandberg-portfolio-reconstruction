# Mobile master-runtime migration plan and investigation

## Status

This document records the initial investigation and plan; the subsequent direct-mount implementation and verification are documented in [mobile-master-migration-report.md](./mobile-master-migration-report.md). The accepted pre-migration source and verification scripts are checkpointed in commit `950743c`; the pre-existing untracked `audit-evidence/` directory is preserved as-is and is not part of that commit. Master clone: `sausageOps/httpsjesperlandberg.com`, clean at `7155cbb`.

## File-level plan

1. Transfer the captured master `site_build/_nuxt/` modules (including the main `DZyj3ghP.js` runtime, page chunks `mriNB3Nt.js`, `DNYapgHJ.js`, `rY37MP56.js`, dependencies, font and WASM), plus `site_build/index.html`, `full/`, `projects/`, `_payload.json` and referenced static assets, into a versioned mobile-runtime directory under `public/`. Preserve provenance and record any modifications to content-hashed files. These are compiled Nuxt/Vue output, not maintainable source components.
2. Supply a build-time data/media adapter using the captured payloads and `src/jesper/data/projects.js` plus `public/assets/images/` for reachable local media. Ensure the actual master's `featured`, `projects`, `site` and prerendered payload interfaces stay consistent, including all 23 Full rows and eight featured detail pages. Do not assume remote DatoCMS or Mux availability. The master also requests glyph data and a llama model not present in its `site_build`; investigate intended canvas/model fallback or provide equivalent captured assets where available. Supply a correct Nuxt manifest or explicitly disable that request without breaking payload routing.
3. Add an isolated mobile runtime host under `src/jesper/`, with explicit mount/unmount on phone-to-tablet changes and top-level navigation away. Do not mount `JesperHome`, its `Experience`, mobile components, or the old `Loader` concurrently with the master for mobile. Keep those modules unchanged for desktop/tablet.
4. Adapt `src/App.jsx` to keep its current A24 `Hud`/`A24Nav` and host navigation ownership. A bridge must preserve the existing public URLs and history state semantics, Full/Featured origins, popstate and selected-card restoration. It must also relay readiness and handle the A24 Home action. An iframe alone does not solve history ownership: its router adds entries to the browser's joint session history. Do not add a second parent push for the same transition.
5. Hide only the master's controls superseded by A24, while preserving its portfolio interactions; scope any clearance adjustment to the master close control and verify the dock's actual animated hit areas. Preserve original CSS, shaders, motion and rendering otherwise.
6. Add focused bridge and lifecycle tests in `verify/` covering initial/direct URLs, internal pushes, replace, back/forward, A24 route changes, remount/resizing, cleanup and WebGL context count. Compare all eight projects at 320, 360, 375, 390, 414 and 430px against the master; explicitly test Full/Featured opening, closing and restoration, swipes/links, vertical scrolling, media/video, transitions and dock collision. Re-run desktop/tablet baselines and production build.

## Prototype findings

A temporary, non-deployed copy under `/tmp/jesper-master-trial/` used the actual master bundle with a base-path rewrite and a local data adapter. At 390px with network requests outside the local server blocked, the home page created one canvas and eight cards, a direct Lookback route displayed its title, and opening Lookback from Full navigated and displayed its title. This is a narrow feasibility probe, **not** a parity or production test.

The prototype logged missing `/glyphs/sans-{400,500}.{json,bin}`, Nuxt build manifest and `/models/llama.glb`; remote media was also blocked. The bundle explicitly falls back to canvas text when glyphs fail, but no visual-equivalence test was done. The target contains `public/assets/models/llama.glb`; adapting the URL and confirming equivalence are still required.

A same-origin host/iframe history probe showed why naive routing is unsafe: opening Lookback inside the child grew joint `history.length` from 2 to 3 while the host URL stayed unchanged; separately pushing the host URL grew it to 4, and one Back returned the host URL while leaving the child on Lookback. A proper single-history bridge needs design and regression coverage before deployment.

The unchanged target production build passed after the checkpoint, with Vite's existing large-chunk warning. The requested post-integration project/width matrix, A24 checks and desktop/tablet regression have not been run because no integration is present.
