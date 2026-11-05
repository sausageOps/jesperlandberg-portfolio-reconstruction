/* Thin ESM shim so the harness can import the real ported engine + runtime. */
export { mountPasteUp, config, gridTexture } from '../src/carter/engines/paste-up.js';
export { bindCarterRuntime, unbindCarterRuntime, destroyAll, getCarterRoot } from '../src/carter/runtime.js';
