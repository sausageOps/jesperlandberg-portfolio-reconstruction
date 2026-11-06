import { useEffect, useLayoutEffect } from 'react';
import { mountEngine } from './runtime.js';

/**
 * Mount a Carter engine once per page visit, from a page component inside
 * CarterRoute.
 *
 * Carter's runtime mounts every engine after the page swaps in. Here the init
 * runs after React commits the page's DOM, and after the frame has bound the
 * runtime. Engines that must hide or measure newly committed transition content
 * can opt into `beforePaint` to mount in a layout effect, before the browser
 * paints that DOM. It runs through mountEngine, so a throwing engine is logged
 * rather than taking down Jesper's shell. Engines register their own teardown
 * with onDestroy(), and the frame flushes it when the page unmounts.
 *
 *   useCarterEngine('lab-index', () => labIndex.init());
 */
export function useCarterEngine(name, init, { beforePaint = false } = {}) {
  useLayoutEffect(() => {
    if (!beforePaint) return;
    // Child layout effects can run before CarterRoute's parent layout effect
    // binds the runtime. Defer to the microtask checkpoint: the whole commit
    // (including bindCarterRuntime) has finished, but the browser has not
    // painted yet, so beforePaint engines still initialize before first paint.
    let mounted = true;
    const run = () => {
      if (mounted) mountEngine(name, init);
    };
    if (typeof queueMicrotask === 'function') queueMicrotask(run);
    else Promise.resolve().then(run);
    return () => { mounted = false; };
    // Init-once by design, like Carter's engines.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (beforePaint) return;
    mountEngine(name, init);
    // Init-once by design, like Carter's engines.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
