/* Thin ESM shim so the harness can import the real ported engine + runtime. */
export { mountThreeJsTest, config } from '../src/carter/engines/threejs-test.js';
export { bindCarterRuntime, unbindCarterRuntime, destroyAll, getCarterRoot, observeCarterTheme } from '../src/carter/runtime.js';
