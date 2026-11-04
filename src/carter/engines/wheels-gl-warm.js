import { veil } from "../runtime.js";

/** Warm one About renderer without leaving its timeout or completion callback alive. */
export function warmRenderer(renderer, scene, camera, timeoutMs = 1500) {
  let ready = false;
  let disposed = false;
  let timeoutId;
  const startedAt = performance.now();

  const timeout = new Promise((resolve) => {
    timeoutId = window.setTimeout(resolve, timeoutMs);
  });
  const compilation = Promise.resolve(
    renderer.compileAsync(scene, camera),
  ).catch(() => {});
  const done = Promise.race([compilation, timeout]).then(() => {
    window.clearTimeout(timeoutId);
    if (disposed) return;
    ready = true;
    try {
      performance.measure("gl-warm", { start: startedAt });
    } catch {
      // Diagnostics only; unsupported User Timing APIs do not affect the scene.
    }
  });

  if (veil.active) veil.hold(done, timeoutMs);
  return {
    ready: () => ready,
    done,
    dispose() {
      disposed = true;
      window.clearTimeout(timeoutId);
    },
  };
}

export { warmRenderer as t };
