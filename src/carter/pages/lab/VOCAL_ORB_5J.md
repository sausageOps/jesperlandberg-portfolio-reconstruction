# Phase 5J — Vocal Orb

## Status and scope

Port of `sausageOps/carterogunsola-reconstruction` at
`3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249`, read-only source paths:
`app/lib/lab-experiments.js`, `app/lib/experiments/vocal-orb.js`,
`app/lib/lab-doc.js`, `app/data/lab.ts`, `app/components/LabDocument.astro`
and `app/pages/lab/[slug].astro`. The registry lazily imports the engine and
passes `captionHost: 'https://models.carterogunsola.com'`. The Lab entry is
Vocal Orb, 3D, New, number 09, poster `lab/vocal-orb/poster-v1.jpg`, reel
`lab/vocal-orb/reel-v1.mp4`.

**Model, audio and browser parity are NOT established.** Sandbox outbound
restrictions prevent accessing the model host, jsDelivr and Hugging Face; that
is not evidence that any host is down. No model weights or voices are vendored.
The real-browser dependency gate below remains open.

`VocalOrbStage.jsx` lazy-loads the engine into the existing route viewport and
registers teardown *before* import. `vocal-orb.js` preserves Carter's shaders,
embedded worker and AudioWorklet, model IDs, dtypes, caption host, consent
flows, live effects, natural voice selection and system-speech fallback.
`vocal-orb.css` scopes Carter's rules to `.carter` rather than injecting global
styles. The caption container no longer has `aria-hidden`, because Carter's
container also contains the download-consent button. Failed imports, WebGL,
worker/model loading and audio setup use visible fallback/status messages;
these are not substitute inference. Browser system speech is a source fallback,
not Kokoro, and is not necessarily guaranteed local by all browsers.

The engine additionally protects late microphone permission, model load,
recognition and worklet completions; aborts timers; stops tracks, audio and
speech; terminates workers; disconnects observers and listeners; cancels frames;
and releases WebGL. Styles and DOM are confined to the frame. Automated tests
use doubles and cannot verify graphics, inference, actual audio or permissions.

## Tune and Code

The Vocal Orb-only adapter implements Carter's Heart segment (glass, silver,
void; default silver) and eight range descriptors, wired to `instance.set`:

| Key | Default | Min–max | Step |
| --- | ---: | ---: | ---: |
| Rest | 0.8 | 0–1 | 0.05 |
| View | 8 | 1–40 | 0.5 |
| Flare | 1 | 0–2 | 0.05 |
| Bloom | 1 | 0–2 | 0.05 |
| Speed | 1 | 0–3 | 0.05 |
| Energy | 1 | 0–2 | 0.05 |
| Spread | 1 | 0–3 | 0.05 |
| Size | 0.3 | 0.08–0.4 | 0.01 |

The adapter uses Carter's slider and segment visual/interaction conventions,
reset, `labcfg:vocal-orb` local-storage values and cleanup. It does not port the
hidden version/preset tools or tuned-Code copy integration. Other Lab Tune
panels remain unchanged. The populated Code pane and Expressive Code enhancer
are **explicitly deferred** to a shared-docs phase; the existing Code tab shows
that deferral for Vocal Orb. This is not full Code-pane parity.

## Dependency manifest

Actual conditional requests must be captured from an unrestricted browser. The
source sets the runtime root to the registered `captionHost`, and the model
root to `<captionHost>/hf/`. Below, file sizes for npm artifacts are measured
from the published npm archives; they are **not** proof of the host's contents.
Model files, revisions, individual sizes and redirects remain unverified.

### Runtime

| Baseline URL | Expected uncompressed bytes | npm SHA-256 / license metadata |
| --- | ---: | --- |
| `https://models.carterogunsola.com/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js` | 558,373 | `e74bd32ed4453369ebb0edcaa27f6bc6204004a949a0233cdb87b62dda8d6978`; Apache-2.0 |
| `https://models.carterogunsola.com/npm/phonemizer@1.2.1/dist/phonemizer.js` | 1,322,380 | `193481f474f7c1ea81df3195d18b45df8ef7254dbdccb3f193d60215c4897bec`; Apache-2.0 |

Carter constructs the ONNX WASM root as
`https://models.carterogunsola.com/npm/onnxruntime-web@<T.env.backends.onnx.versions.web>/dist/`.
The npm metadata for Transformers 4.2.0 declares
`onnxruntime-web@1.26.0-dev.20260416-b7804b056c` (MIT metadata). Potential
files in that package, **not all necessarily requested**, are:

| Filename | npm bytes | npm SHA-256 |
| --- | ---: | --- |
| `ort-wasm-simd-threaded.mjs` | 24,180 | `5f2cd914554830762579c372d0211614c1e3f40ab3f6c0cfcf0900343229071d` |
| `ort-wasm-simd-threaded.wasm` | 12,942,611 | `f4f290847a4df02d0b93cdbf39b4b0e71acefbe80573e7e6b9342a7abd7b290a` |
| `ort-wasm-simd-threaded.asyncify.mjs` | 47,389 | `5959c6733039619c9af710d8e1bae8d6e84402787990637be987c2b1bd6c5fa9` |
| `ort-wasm-simd-threaded.asyncify.wasm` | 23,567,050 | `e0c0c6d3e73d43b8a249972f8358f845b08cc16fec3c80efafdf8bed40366786` |
| `ort-wasm-simd-threaded.jsep.mjs` | 46,490 | `522b3769929f5684c83a12cf1e06eedf073b65d161728b4f3757c75d62b14384` |
| `ort-wasm-simd-threaded.jsep.wasm` | 26,101,073 | `ae61141f8fbf0a4e43fd7b4f4d40a1a115627f6facc4f33ddf84074a655e33ea` |

The Transformers bundle has Safari/non-Safari default WASM references; Carter's
`wasmPaths` override and actual selection must be verified. The phonemizer npm
archive does not contain a separate `.wasm` file; its browser bundle still
requires execution verification. The main Worker and AudioWorklet are embedded
Blob sources, not separate source-host URLs.

### Models and voices

The source's remote template is
`https://models.carterogunsola.com/hf/{model}/resolve/{revision}/{file}`;
Transformers defaults to mutable `main`, not a pinned model commit.

| Model root under `/hf/` | Source options and unverified file inventory |
| --- | --- |
| `onnx-community/silero-vad/resolve/main/` | fp32 VAD; candidate `onnx/model.onnx` and configuration/external-data files. Size unknown. |
| `onnx-community/moonshine-base-ONNX/resolve/main/` | fp32 encoder, q4 WebGPU / q8 WASM decoder options; candidates `onnx/encoder_model.onnx`, `onnx/decoder_model_merged_q4.onnx`, `onnx/decoder_model_merged_quantized.onnx`, tokenizer, processor, config and optional external data. Carter's UI estimates **150 MB** for captions, not a measured per-file size. Actual filenames and dtype selection must be recorded. |
| `AdamCodd/tinybert-emotion-balanced/resolve/main/` | q8/WASM mood classification; candidate `onnx/model_quantized.onnx`, tokenizer/config. Source comment says 4.5 MB model; UI says **~27 MB** download. Neither is a verified file size. |
| `onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/` | fp32 WebGPU / q8 WASM model and tokenizer; candidates `onnx/model.onnx`, `onnx/model_quantized.onnx`, config/tokenizer and external data. UI says **~330 MB GPU / ~92 MB CPU**; not measured per-file sizes. |

Common conditional requests may include `config.json`, `tokenizer.json`,
`tokenizer_config.json`, `preprocessor_config.json`, `generation_config.json`
and external-data chunks. Some may be optional probes. The actual list depends
on remote configuration and Transformers behavior; these candidates are not a
complete confirmed manifest.

Exact per-voice paths under
`https://models.carterogunsola.com/hf/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/`:
`af_heart.bin`, `af_bella.bin`, `am_michael.bin`, `bf_emma.bin`,
`bm_george.bin`, `bm_fable.bin`. Source describes ~0.5 MB each, with 510×256
float32 vectors (522,240 bytes implied); actual sizes/hashes are unverified.
Model/voice licenses, artifact revisions and redistribution rights also remain
unverified.

When no caption host is provided, Carter uses `https://cdn.jsdelivr.net/npm/`
for packages and `https://huggingface.co/{model}/resolve/main/` for models and
voices. The registered integration passes the Carter host, not this fallback.
Native local speech-recognition downloads are browser-managed and their URLs
are unknown. Additional redirect/CDN hosts may arise and must be captured.
Lab media uses `https://assets.carterogunsola.com` (including the resized
poster helper); availability and sizes are unverified.

## Required unrestricted-browser verification gate

From the actual HTTPS deployment origin (including the real embedding iframe,
if any), record browser/version, GPU, origin and date. Use clean storage, Network
Preserve log and disabled cache, and export HARs. Obtain explicit consent before
large downloads and microphone use.

1. Exercise native speech recognition, fallback captions, mood and Kokoro on
   WebGPU and WASM separately. Record every actual request, method, status,
   redirects, final host, bytes, and whether it was required or an optional
   probe. Record the runtime ONNX version and all config/tokenizer/ONNX/data
   chunk and voice URLs. Verify all six voices. Compare runtime bytes/hashes to
   the npm references above.
2. Record each model's resolved immutable revision and SHA-256/size of every
   actual response. Compare model behavior and bytes to the Carter baseline;
   mutable `main` is a reproducibility risk. Do not silently pin a different
   revision or switch hosts.
3. Verify browser CORS on module imports, worker fetches, final responses and
   redirects from the deployment origin. Verify JS module MIME, JSON/binary
   responses and `application/wasm`; ensure error pages are not accepted as
   assets. A successful address-bar or command-line request is not a CORS test.
4. Review licenses and attribution for the specific runtime, ONNX, phonemizer,
   eSpeak, model revisions and voice files before any mirror or redistribution.
5. Test actual CSP, blob workers/worklets, WASM compilation, connect sources,
   redirects and microphone Permissions Policy including iframe delegation.
   Record violations and minimal required policy; test cross-origin isolation
   and ONNX thread behavior independently. Do not assume dev-server headers
   match production.
6. Test cold/warm cache, storage disabled, interrupted and blocked downloads,
   and compare the UI's estimates with actual download sizes. Never describe
   sandbox restrictions as service downtime.

## Browser verification matrix — all pending real-browser execution

| Area | Cases |
| --- | --- |
| WebGL | WebGL2 float bloom, direct path without float extension, no WebGL2, resizing, visibility/offscreen, graphics performance and context loss. |
| Microphone | permission granted, denied, dismissed, no device, secure context and iframe policy; stop and navigation while prompt pending. |
| Captions | native local available/downloadable/unavailable/error; fallback real VAD/ASR with WebGPU and WASM, worklet, partial/final text, segmentation and download failures. |
| Mood | native opt-in and fallback-caption paths; real model inference, failures, and visual response. |
| Voice | six real Kokoro voices and both device paths, first download, failed voice file, hush; separately identify source browser-speech fallback. |
| Effects | Room, Hall, Delay, Radio and Robot, speaker modes, headphones and feedback guard. |
| Accessibility | keyboard controls, consent offer, screen-reader status, reduced motion and responsive layouts. |
| Lifecycle | navigate during permission, worker/model loads, native install, worklet setup and playback; repeated mount/unmount; no residual tracks, contexts, workers, observers, timers, listeners or GPU resources. |
| Tune | all nine controls, drag/keyboard, reset, persistence and restoration; other experiments unaffected. |

## Local checks

```sh
npm ci
npm install --no-save --package-lock=false jsdom@26.1.0
# Read-only source retrieval, outside either repository:
gh api 'repos/sausageOps/carterogunsola-reconstruction/contents/app/lib/experiments/vocal-orb.js?ref=3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249' --jq .content | base64 -d > /tmp/vocal-orb-carter.js
CARTER_SOURCE=/tmp/vocal-orb-carter.js node verify/vocal-orb-verify.mjs
npm run build
```

The isolated test compares config, worker and worklet strings, scoped CSS,
initial DOM and direct/bloom shader strings with the pinned source, checks no
WebGL fallback, permission and worklet races, worker URL contract, Tune,
test-double audio effects, and repeated real React route mount/unmount. It does
not run actual browser inference, permissions, shader compilation or audio.
