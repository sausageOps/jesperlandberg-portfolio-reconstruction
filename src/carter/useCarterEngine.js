import { useEffect } from 'react';
import { mountEngine } from './runtime.js';

/**
 * Mount a Carter engine once per page visit, from a page component inside
 * CarterRoute.
 *
 * Carter's runtime mounts every engine after the page swaps in. Here the init
 * runs after React commits the page's DOM, and after the frame has bound the
 * runtime. It runs through mountEngine, so a throwing engine is logged rather
 * than taking down Jesper's shell. Engines register their own teardown with
 * onDestroy(), and the frame flushes it when the page unmounts.
 *
 *   useCarterEngine('lab-index', () => labIndex.init());
 */
export function useCarterEngine(name, init) {
  useEffect(() => {
    mountEngine(name, init);
    // Init-once by design, like Carter's engines.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
