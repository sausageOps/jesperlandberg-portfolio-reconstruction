/* Thin ESM shim so the harness can import the real ported engine + runtime. */
export { mountDial, config } from '../src/carter/engines/dial.js';
export { bindCarterRuntime, unbindCarterRuntime, destroyAll } from '../src/carter/runtime.js';
