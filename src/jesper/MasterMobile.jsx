import { useEffect, useRef, useState } from 'react';
import { featured, projects } from './data/projects.js';
import MasterFallback from './MasterFallback.jsx';

// The captured runtime expects Dato's normalized records. Use the already
// captured, equivalent local thumbnails where they exist; retain video URLs.
const localRecord = (project) => {
  const copy = structuredClone(project);
  for (const media of [copy, ...copy.images]) {
    if (media.asset) media.src = media.thumb = media.card = media.asset;
  }
  return copy;
};

let previous = Promise.resolve();
let bundlePromise;
const loadBundle = () => {
  if (!bundlePromise) bundlePromise = new Promise((resolve, reject) => {
    window.__masterBundleReady = (mount) => { delete window.__masterBundleReady; resolve(mount); };
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/mobile-master/bridge.js';
    script.onerror = () => { delete window.__masterBundleReady; bundlePromise = null; reject(new Error('Master bundle failed to load')); };
    document.head.appendChild(script);
  });
  return bundlePromise;
};

/** Mount the captured portfolio runtime in the host document, not an iframe.
 * The same bridge serves the frozen mobile band and the explicit tablet band.
 */
export default function MasterPortfolio({ onReady, onHistory, range = 'mobile' }) {
  const callbacks = useRef({ onReady, onHistory });
  const [unavailable, setUnavailable] = useState(false);
  callbacks.current = { onReady, onHistory };

  useEffect(() => {
    const session = { alive: true, app: null, cleanups: [] };
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/mobile-master/master.css';
    document.head.appendChild(style);
    document.documentElement.classList.add('master-mobile');

    // Measure the actual animated dock rather than guessing its width; this
    // also handles small screens and a dock whose labels change width.
    let frame = 0;
    let closeLift = 0;
    const clearDock = () => {
      const close = document.querySelector('#__nuxt [aria-label="Close project"]');
      const dock = document.querySelector('.a24-nav__list');
      let next = 0;
      if (close && dock) {
        const c = close.getBoundingClientRect();
        const d = dock.getBoundingClientRect();
        const overlapsX = c.right > d.left && c.left < d.right;
        const naturalBottom = c.bottom + closeLift;
        if (overlapsX && c.top + closeLift < d.bottom && naturalBottom > d.top - 8) next = Math.ceil(naturalBottom - d.top + 8);
      }
      if (next !== closeLift) {
        closeLift = next;
        document.documentElement.style.setProperty('--master-close-lift', `${next}px`);
      }
      frame = requestAnimationFrame(clearDock);
    };
    frame = requestAnimationFrame(clearDock);

    const teardown = (retainContext = false) => {
      session.app?.unmount();
      session.app = null;
      if (!retainContext) {
        session.release?.();
        session.release = null;
      }
      for (const cleanup of session.cleanups.splice(0).reverse()) {
        try { cleanup(); } catch (error) { console.error('[master cleanup]', error); }
      }
      if (window.__masterSession === session) {
        delete window.__masterRouter;
        delete window.__masterSession;
        delete window.__masterCleanup;
        delete window.__masterWriteHistory;
        delete window.__masterReady;
        delete window.__masterError;
        delete window.__masterData;
        if (!retainContext) delete window.__NUXT__;
      }
    };

    const start = async () => {
      if (!session.alive) return;
      // The captured renderer requires WebGL2. Fail before booting Nuxt if it
      // is unavailable, so the host navigation is not stranded in loading.
      const probe = document.createElement('canvas');
      let gl = null;
      try { gl = probe.getContext('webgl2'); } catch { /* unsupported */ }
      if (!gl) {
        setUnavailable(true);
        callbacks.current.onReady();
        return;
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      window.__masterSession = session;
      window.__masterCleanup = session.cleanups;
      window.__masterData = { projects: projects.map(localRecord), featured: featured.map(localRecord) };
      window.__NUXT__ = { serverRendered: false, config: { public: { siteUrl: '' }, app: { baseURL: '/', buildId: 'dae78082-791f-45e5-83d8-7af79c012859', buildAssetsDir: '/mobile-master/_nuxt/', cdnURL: '' } } };
      session.nuxtGlobal = window.__NUXT__;
      window.__masterReady = () => { if (session.alive) callbacks.current.onReady(); };
      window.__masterError = () => {
        if (!session.alive) return;
        session.alive = false;
        session.failed = true;
        setUnavailable(true);
        callbacks.current.onReady();
        // Stop the renderer and listeners immediately, but keep Nuxt's context
        // briefly while its in-flight async setup unwinds. Releasing it in the
        // error-handler microtask produces an uncaught "instance unavailable".
        queueMicrotask(() => teardown(true));
        const contextReleased = new Promise((resolve) => window.setTimeout(() => {
          session.release?.();
          session.release = null;
          if (window.__NUXT__ === session.nuxtGlobal) delete window.__NUXT__;
          resolve();
        }, 1500));
        previous = Promise.all([previous.catch(() => {}), contextReleased]).then(() => {});
      };
      // The host owns the one browser history. The Nuxt adapter delegates its
      // writes here and the host observes them without making a second entry.
      window.__masterWriteHistory = (method, url, data) => {
        const current = window.location.pathname;
        const pathname = new URL(url, window.location.href).pathname;
        const isProject = /^\/projects\//.test(pathname);
        const fromFull = current === '/full' || (!!window.history.state?.jesperFullOrigin && /^\/projects\//.test(current));
        const slug = isProject ? pathname.match(/^\/projects\/([^/?#]+)/)?.[1] : null;
        // Mutate the object Vue Router retains as its current state, so its
        // later scroll-position replaces do not lose host origin metadata.
        if (slug) data.jesperHomeProject = slug;
        else delete data.jesperHomeProject;
        if (isProject && fromFull) data.jesperFullOrigin = true;
        else delete data.jesperFullOrigin;
        window.history[method === 'replace' ? 'replaceState' : 'pushState'](data, '', url);
        callbacks.current.onHistory();
      };
      // Vue Router expects its own bookkeeping fields to exist even when the
      // current entry was created by the surrounding React navigation.
      const state = window.history.state || {};
      if (state.position == null || !state.current) {
        window.history.replaceState({ back: null, current: window.location.pathname, forward: null, replaced: true, position: window.history.length - 1, scroll: null, ...state }, '', window.location.href);
      }
      session.pending = true;
      try {
        const mountMaster = await loadBundle();
        if (session.alive) await mountMaster(session);
      } catch (error) {
        console.error('[master mobile] could not mount', error?.stack || error);
        window.__masterError?.(error);
      } finally {
        session.pending = false;
        if (!session.alive && !session.failed) teardown();
      }
    };
    const home = () => {
      if (window.location.pathname === '/') return;
      if (window.__masterFallbackNavigate) window.__masterFallbackNavigate('/');
      else if (window.__masterRouter) window.__masterRouter.push('/');
      else {
        window.history.pushState({}, '', '/');
        callbacks.current.onHistory();
      }
    };
    // webglcontextlost does not bubble, so capture it only for the master's
    // own canvas. The capability probe is detached and never matches.
    const contextLost = (event) => {
      if (!session.alive || !event.target?.matches?.('#__nuxt canvas')) return;
      event.preventDefault();
      window.__masterError?.(new Error('WebGL context lost'));
    };
    document.addEventListener('webglcontextlost', contextLost, true);
    window.addEventListener('jesper:home', home);
    const startPromise = previous.catch(() => {}).then(start);
    previous = startPromise;
    return () => {
      window.removeEventListener('jesper:home', home);
      document.removeEventListener('webglcontextlost', contextLost, true);
      cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty('--master-close-lift');
      session.alive = false;
      style.remove();
      document.documentElement.classList.remove('master-mobile');
      // A plugin may still be starting. Let it finish registering cleanup
      // before tearing its session down; a later mount waits for that promise.
      if (!session.failed && (!session.pending || session.app)) teardown();
    };
  }, []);

  return <div id="jesper-content" data-master-range={range} tabIndex={-1}><div id="__nuxt" className="master-mobile-root" hidden={unavailable} />{unavailable && <MasterFallback onHistory={onHistory} />}</div>;
}
