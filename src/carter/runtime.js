/**
 * Carter runtime contract, implemented against Jesper's shell.
 *
 * Carter's page engines (About, Lab, Writing) import a small runtime surface
 * from app/lib/mesh.ts and astro:transitions. This module provides the same
 * surface for engines running inside Jesper's React shell, so a page phase can
 * port an engine by swapping its imports instead of rewriting it:
 *
 *   Carter (mesh.ts / astro)           Jesper (this module)
 *   ---------------------------------  ----------------------------------------
 *   onDestroy (Ed) / destroyAll (Dd)   onDestroy / destroyAll
 *   safe mount (`$`, runtime.ts)       mountEngine (or useCarterEngine.js)
 *   veil (wd): active, hold()          veil — bridged to Jesper's Loader
 *   veil:reveal on document            releaseVeil() dispatches it once
 *   scroll (bd): Lenis wrapper         scroll — native adapter for the frame
 *   tune() (?tune= dev panel)          tune() -> null (dev tool, not ported)
 *   navigate (astro:transitions)       navigate — Jesper history router
 *   <html data-theme>                  getCarterTheme / observeCarterTheme
 *   document.body as overlay host      getCarterRoot
 *
 * The runtime is bound by CarterRoute.jsx while a Carter route is mounted.
 * There is at most one Carter frame at a time.
 */
import { toJesperPath } from './routes.js';

let binding = null; // { root: HTMLElement, navigate: (path, options) => void }
const destroyers = [];
const scrollHolds = new Set();

/* ------------------------------------------------------------------ binding */

/** Called by CarterRoute when its frame mounts (layout phase). */
export function bindCarterRuntime({ root, navigate, appReady }) {
  binding = { root, navigate };
  veil.active = !appReady;
  scrollHolds.clear();
  syncScrollLock();
}

/** Called by CarterRoute when its frame unmounts, after destroyAll(). */
export function unbindCarterRuntime(root) {
  if (!binding || binding.root !== root) return;
  scrollHolds.clear();
  syncScrollLock();
  binding = null;
  veil.active = false;
}

/**
 * The Carter frame root (.carter): the scope for Carter CSS and the element
 * Carter engines should use wherever Carter used document.body (overlay and
 * measurement hosts). Nodes appended to document.body would sit outside the
 * scope, unstyled and below Jesper's stacking contexts. Null when no frame.
 */
export const getCarterRoot = () => binding?.root ?? null;

/* -------------------------------------------------------------------- theme */

/**
 * Carter keeps its theme on <html data-theme>. Inside Jesper the attribute
 * lives on the frame root, so Jesper's document is never re-themed. Carter's
 * house default is dark.
 */
export function getCarterTheme() {
  return binding?.root?.dataset.theme === 'light' ? 'light' : 'dark';
}

/** Replacement for engines' MutationObserver on <html data-theme>. Returns a disconnect function. */
export function observeCarterTheme(callback) {
  const root = binding?.root;
  if (!root || typeof MutationObserver === 'undefined') return () => {};
  const observer = new MutationObserver(() => callback(getCarterTheme()));
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

/* ---------------------------------------------------------------- lifecycle */

function runSafely(fn, label) {
  try {
    fn();
  } catch (error) {
    console.error(label, error);
  }
}

/**
 * Register teardown for the current page (Carter: Ed). The frame flushes the
 * queue when the page unmounts, while its DOM is still attached. A teardown
 * registered with no frame bound (a late async init after navigation) runs
 * immediately, so nothing outlives its page.
 */
export function onDestroy(fn) {
  if (typeof fn !== 'function') return;
  if (!binding) {
    runSafely(fn, '[destroy]');
    return;
  }
  destroyers.push(fn);
}

/** Run and clear every registered teardown (Carter: Dd). */
export function destroyAll() {
  const queue = destroyers.splice(0);
  queue.forEach((fn) => runSafely(fn, '[destroy]'));
}

/**
 * Carter's safe mount: run an engine init so a throw is logged instead of
 * taking down Jesper's shell. Async inits are caught the same way.
 */
export function mountEngine(name, init) {
  const start = typeof performance !== 'undefined' ? performance.now() : 0;
  try {
    const result = init();
    if (result && typeof result.then === 'function') {
      return result.catch((error) => {
        console.error(`[mount] ${name} failed`, error);
        return undefined;
      });
    }
    return result;
  } catch (error) {
    console.error(`[mount] ${name} failed`, error);
    return undefined;
  } finally {
    try {
      performance.measure(`mount:${name}`, { start });
    } catch {
      /* User Timing L3 unavailable: the measure is diagnostics only. */
    }
  }
}

/* --------------------------------------------------------------------- veil */

/**
 * Carter boots behind its own paper veil, and engines delay their entrances
 * until `veil:reveal`. In Jesper the boot screen is the shared Loader, so the
 * veil is "active" while the Loader is up, and releaseVeil() fires the reveal
 * once the app is ready. In-app navigation has no veil (active === false), so
 * engines play their entrances straight away, as Carter does when its veil is
 * not shown.
 */
export const veil = {
  active: false,
  /* Carter holds its veil for GPU warm-up. Jesper's Loader is driven by the
     Experience and cannot be held, so holds are accepted and ignored. */
  hold() {},
};

export function releaseVeil() {
  if (!veil.active) return;
  veil.active = false;
  document.dispatchEvent(
    new CustomEvent('veil:reveal', { detail: { mode: 'boot', wipeDur: 0 } }),
  );
}

/* ------------------------------------------------------------------- scroll */

function syncScrollLock() {
  binding?.root?.toggleAttribute('data-scroll-stopped', scrollHolds.size > 0);
}

function resolveScrollTop(root, target) {
  if (typeof target === 'number') return target;
  if (target === 'top' || target === 'start' || target === '#') return 0;
  if (target === 'bottom' || target === 'end') return root.scrollHeight;
  let element = target;
  if (typeof target === 'string') {
    try {
      element = root.querySelector(target);
    } catch {
      element = null;
    }
  }
  if (!element || typeof element.getBoundingClientRect !== 'function') return null;
  return element.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
}

/**
 * Stand-in for Carter's scroll singleton (bd), which wraps Lenis on
 * document.scrollingElement. In Jesper, html/body never scroll; the frame root
 * is the page's scroller. The adapter scrolls it natively. `lenis` stays null
 * until a page phase that needs smooth scrolling adds it.
 */
export const scroll = {
  lenis: null,
  get target() {
    return binding?.root ?? null;
  },
  init() {
    return null;
  },
  resize() {},
  adoptNativeScroll() {},
  /** Subset of Lenis#scrollTo: number | element | selector | 'top'/'bottom', with { offset, immediate, force }. */
  scrollTo(target, { offset = 0, immediate = false, force = false } = {}) {
    const root = binding?.root;
    if (!root || (scrollHolds.size && !force)) return;
    const top = resolveScrollTop(root, target);
    if (top === null || Number.isNaN(top)) return;
    const max = Math.max(0, root.scrollHeight - root.clientHeight);
    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.scrollTo({
      top: Math.min(max, Math.max(0, top + offset)),
      behavior: immediate || reduce ? 'auto' : 'smooth',
    });
  },
  /** Lock page scrolling. Returns a token for start(). Holds stack. */
  stop() {
    const token = Symbol('carter-scroll-hold');
    scrollHolds.add(token);
    syncScrollLock();
    return token;
  },
  /** Release a hold from stop(), or every hold when called without a token. */
  start(token) {
    if (token === undefined) scrollHolds.clear();
    else scrollHolds.delete(token);
    syncScrollLock();
  },
};

/* --------------------------------------------------------------- navigation */

/**
 * Carter's navigate(href): map a Carter href to its Jesper URL and route it
 * through Jesper's history router. Hrefs with no Jesper home fall back to a
 * normal document navigation. Carter code only runs inside the frame, so a call
 * with no frame bound comes from a stale engine (e.g. a timer that outlived its
 * page). It is ignored rather than allowed to pull the visitor elsewhere.
 */
export function navigate(href, { history: mode } = {}) {
  if (!binding?.navigate) {
    console.warn('[carter] navigate() ignored: no Carter page is mounted', href);
    return;
  }
  const to = toJesperPath(href);
  if (!to) {
    window.location.assign(href);
    return;
  }
  const url = new URL(to, window.location.origin);
  // Jesper's router works on bare paths. The query and fragment are restored
  // on the history entry without re-routing.
  binding.navigate(url.pathname, { replace: mode === 'replace' });
  if (url.search || url.hash) {
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }
}

/**
 * Click handler for the frame root (Carter: Astro's ClientRouter link
 * interception). Same-origin Carter links route in-app. New-tab and modified
 * clicks, downloads, external links, same-page fragments and handled events
 * keep the browser default.
 */
export function interceptLinkClick(event) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.target?.closest?.('a[href]');
  if (!anchor) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download') || anchor.hasAttribute('data-astro-reload')) return;
  if (anchor.origin !== window.location.origin) return;

  const href = anchor.getAttribute('href');
  const to = toJesperPath(href);
  if (!to) return;
  const url = new URL(to, window.location.origin);
  if (url.hash && url.pathname === window.location.pathname) return;

  event.preventDefault();
  navigate(href);
}

/* --------------------------------------------------------------------- tune */

/* Carter's ?tune=<panel> live-tuning panels are a development tool and are not
   ported. Like Carter without the query param, there is no panel. */
export const tune = () => null;
