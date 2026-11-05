/*
 * Tiny zero-dependency bridge so `WritingShelfHost` in `CarterRoute` can tear
 * down the persistent Writing WebGL shelf + flight renderers when leaving
 * Writing routes, without eagerly pulling Three.js into non-Writing chunks.
 */

let teardownFn = null;

export function registerWritingShelfTeardown(fn) {
  teardownFn = fn;
}

export function runWritingShelfTeardown() {
  const fn = teardownFn;
  teardownFn = null;
  fn?.();
}
