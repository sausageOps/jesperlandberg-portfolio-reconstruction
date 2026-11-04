/**
 * Phase 5E verification harness (uncommitted, not part of the app).
 *
 * Runs the REAL integration path in a real DOM (jsdom + React): CarterRoute ->
 * CarterPageBoundary -> LabDetailPage -> DialStage -> engines/dial.js, plus
 * route-away/return remount cycles through the same boundary keying the app
 * uses. Compares the ported engine against Carter's original source mount
 * under identical input, and audits cleanup.
 *
 * Limits: jsdom has no layout engine (clientWidth/Height are 0 unless stubbed),
 * no CSS, no compositing and no audio decoding. Geometry is therefore stubbed
 * from computed viewport sizes and canvas/CSS painting is NOT verified.
 */
import { JSDOM } from 'jsdom';

const FLUSH = () => new Promise((resolve) => setTimeout(resolve, 0));
const FRAME = 16.667;

function makeDom({ width = 1440, height = 900, reducedMotion = 'no-preference' } = {}) {
  const dom = new JSDOM(
    `<!doctype html><html><head><style>:root{--ink:#f2f1ee;--paper:#0d0d0d;--surface:#262626;--ink-muted:#f7f7f780}</style></head><body><div id="root"></div></body></html>`,
    { pretendToBeVisual: true, url: 'http://localhost/' },
  );
  const { window } = dom;

  // ---- viewport-driven layout: jsdom reports 0 for everything ----
  const stageSize = { w: width, h: height };
  Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return this.classList?.contains('dial__stage') || this.classList?.contains('labd__viewport')
        ? stageSize.w
        : this.getBoundingClientRect().width;
    },
  });
  Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return this.classList?.contains('dial__stage') || this.classList?.contains('labd__viewport')
        ? stageSize.h
        : this.getBoundingClientRect().height;
    },
  });
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    const w = this.classList?.contains('dial__stage') || this.classList?.contains('labd__viewport')
      ? stageSize.w
      : 0;
    const h = this.classList?.contains('dial__stage') || this.classList?.contains('labd__viewport')
      ? stageSize.h
      : 0;
    return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: h, width: w, height: h };
  };
  window.HTMLElement.prototype.setPointerCapture = function () {};

  // ---- matchMedia with a controllable reduced-motion result ----
  window.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotion === 'reduce' : false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  });

  // ---- observers ----
  const observers = new Set();
  window.ResizeObserver = class {
    constructor(cb) {
      this.cb = cb;
      this.targets = new Set();
      observers.add(this);
    }
    observe(el) {
      this.targets.add(el);
    }
    unobserve(el) {
      this.targets.delete(el);
    }
    disconnect() {
      this.targets.clear();
      observers.delete(this);
    }
  };
  window.__observers = observers;
  window.MutationObserver = class {
    observe() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };

  // ---- audio: jsdom has no decoder; count construction/play ----
  const audio = { created: 0, played: 0, paused: 0, failures: 0, srcs: [], instances: [] };
  window.Audio = class {
    constructor(src) {
      audio.created += 1;
      audio.srcs.push(src);
      this.src = src;
      this.paused = true;
      this.ended = false;
      this.volume = 1;
      this.playbackRate = 1;
      this.__from = src && src.includes('dial-tick') ? 'dial-pool' : 'other';
      audio.instances.push(this);
    }
    play() {
      audio.played += 1;
      this.paused = false;
      audio.failures += 1; // mirrors a 404'd source: play() rejects
      return Promise.reject(new Error('no audio source'));
    }
    pause() {
      audio.paused += 1;
    }
  };
  window.__audio = audio;

  // ---- deterministic RAF so gsap.ticker is drivable by hand ----
  const raf = { callbacks: new Map(), id: 0 };
  window.requestAnimationFrame = (cb) => {
    const id = ++raf.id;
    raf.callbacks.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => raf.callbacks.delete(id);
  window.__raf = raf;

  return { dom, window, stageSize, observers, audio };
}

/** Advance gsap's ticker by `ms`, synchronously, exactly as a browser frame would. */
function frame(window, ms = FRAME) {
  const cbs = [...window.__raf.callbacks.values()];
  window.__raf.callbacks.clear();
  const now = (window.__now = (window.__now ?? 0) + ms);
  for (const cb of cbs) cb(now);
  return cbs.length;
}

async function runFrames(window, count, ms = FRAME) {
  for (let i = 0; i < count; i++) {
    frame(window, ms);
    await FLUSH();
  }
}

function nudge(window, el, type, init = {}) {
  const ev = new window.Event(type, { bubbles: true, cancelable: true });
  for (const [k, v] of Object.entries(init)) {
    // currentTarget/target are owned by dispatch; only readable overrides allowed
    Object.defineProperty(ev, k, { configurable: true, writable: true, value: v });
  }
  el.dispatchEvent(ev);
  return ev;
}

/* ------------------------------------------------------------------ scenarios */

/** The five values that define the dial's visible state. */
function snapshot(window) {
  const dial = window.document.querySelector('.dial');
  if (!dial) return null;
  const stage = dial.querySelector('.dial__stage');
  return {
    items: [...dial.querySelectorAll('.dial__item')].map((el) => el.style.transform),
    ticks: dial.querySelectorAll('.dial__tick').length,
    majorTicks: dial.querySelectorAll('.dial__tick--major').length,
    rotor: dial.querySelector('.dial__ticks-rotor').style.transform,
    grip: dial.querySelector('.dial__grip').style.transform,
    knob: {
      left: dial.querySelector('.dial__knob').style.left,
      size: dial.querySelector('.dial__knob').style.width,
    },
    index: { left: dial.querySelector('.dial__index').style.left, width: dial.querySelector('.dial__index').style.width },
    cover: [dial.style.getPropertyValue('--dial-cx'), dial.style.getPropertyValue('--dial-cy')],
    active: [...dial.querySelectorAll('.dial__item')].findIndex((el) => el.classList.contains('is-active')),
    selected: [...dial.querySelectorAll('.dial__item')].filter((el) => el.getAttribute('aria-selected') === 'true').length,
    stageFallback: stage ? 0 : 1,
  };
}

/**
 * Mount Carter's ORIGINAL dial source into a bare host.
 *
 * Carter's repository is read-only reference material and is not vendored into
 * this repo: point CARTER_REF at a checkout and the harness derives the module
 * at run time, rewriting only the `../mesh.ts` import binding (Carter's own
 * Phase 8 note: the body is otherwise identical to the live-site chunk).
 *
 *   git clone --depth 1 https://github.com/sauceOps/... /tmp/carter-ref
 *   CARTER_REF=/tmp/carter-ref node verify/dial-verify.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

let originalModulePromise = null;

function carterCheckout() {
  const ref = process.env.CARTER_REF;
  if (!ref) {
    throw new Error(
      'CARTER_REF is not set: point it at a read-only Carter checkout (…/carterogunsola-reconstruction) to run section A.',
    );
  }
  const file = path.join(ref, 'app/lib/experiments/dial.js');
  if (!fs.existsSync(file)) throw new Error(`dial.js not found in CARTER_REF: ${file}`);
  return file;
}

async function loadOriginal() {
  if (!originalModulePromise) {
    originalModulePromise = (async () => {
      const source = fs.readFileSync(carterCheckout(), 'utf8');
      const gsapUrl = pathToFileURL(path.join(process.cwd(), 'node_modules/gsap/index.js')).href;
      // only the mesh.ts import is resolved; every other token is Carter's
      const rewritten = source.replace(
        /^import\{f as e\}from"\.\.\/mesh\.ts";/,
        `const { default: e } = await import(${JSON.stringify(gsapUrl)});`,
      );
      if (rewritten === source) throw new Error('could not find the mesh.ts import in Carter\'s dial.js');
      const out = path.join(os.tmpdir(), `carter-dial-original-${process.pid}.mjs`);
      fs.writeFileSync(out, rewritten);
      return import(pathToFileURL(out).href);
    })();
  }
  return originalModulePromise;
}

async function mountOriginal(window, host) {
  const src = await loadOriginal();
  return src.default.mount(host);
}

export { makeDom, frame, runFrames, nudge, snapshot, mountOriginal, FLUSH, FRAME };

/* ------------------------------------------------------- global scoping ---- */
const GLOBAL_KEYS = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event',
  'MouseEvent', 'Audio', 'ResizeObserver', 'MutationObserver', 'matchMedia', 'requestAnimationFrame',
  'cancelAnimationFrame', 'AbortController', 'AbortSignal'];
const saved = new Map();
const unsetKeys = new Set();

export function installGlobals(win) {
  for (const key of GLOBAL_KEYS) {
    if (!saved.has(key)) {
      saved.set(key, { had: key in globalThis, value: globalThis[key] });
    }
    let value = key === 'getComputedStyle' ? win.getComputedStyle.bind(win) : win[key];
    if (key === 'AbortController' || key === 'AbortSignal') {
      // bind to the owning window: jsdom's AbortSignal brand check is realm-local
      value = win[key];
    }
    // defineProperty: some Node globals (navigator) are getter-only
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: value === undefined ? undefined : value,
    });
  }
}

export function restoreGlobals() {
  for (const [key, { had, value }] of saved) {
    if (had) {
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    } else {
      delete globalThis[key];
    }
  }
  saved.clear();
  unsetKeys.clear();
}

/** Run `fn` with browser globals pointing at `win`. */
export async function withWindow(win, fn) {
  installGlobals(win);
  try {
    return await fn();
  } finally {
    restoreGlobals();
  }
}


/**
 * gsap's CSSPlugin reads a bare `getComputedStyle` at render time, which can be
 * outside the window scope. Resolve it from the element's own document so two
 * live windows can be driven side by side.
 */
export function installComputedStyleShim(fallbackWindow) {
  globalThis.getComputedStyle = (el, pseudo) => {
    const win = el?.ownerDocument?.defaultView ?? fallbackWindow;
    return win.getComputedStyle(el, pseudo);
  };
}

/**
 * Advance the window's real requestAnimationFrame queue by `count` frames.
 * The app's gsap ticker lives in Vite's SSR realm (a different gsap instance
 * from this harness's), so it can only be driven through rAF - which is also
 * exactly how a browser drives it.
 */
export async function pumpFrames(win, count, ms = FRAME, flush = FLUSH) {
  for (let i = 0; i < count; i++) {
    // gsap reads performance.now() for tween maths and sleeps between frames when
    // a tick carries no elapsed time, so frames must advance the real clock too.
    if (activeClock) {
      activeClock.advance(ms);
      win.__now = activeClock.now();
    } else {
      await flush(ms);
      win.__now = globalThis.performance.now();
    }
    const due = [...win.__raf.callbacks.values()];
    win.__raf.callbacks.clear();
    for (const cb of due) {
      try {
        cb(win.__now);
      } catch (error) {
        console.error('[rAF]', error);
      }
    }
    await flush();
  }
  return win.__raf.callbacks.size;
}


/* ------------------------------------------------------------ fake clock --- */

let activeClock = null;

/**
 * gsap mixes `performance.now()` (for tween start times) with the rAF timestamp,
 * so a harness must provide ONE clock. Both the harness's gsap and the app's
 * copy (Vite SSR realm) read the same global `performance`.
 */
export function installClock() {
  const real = globalThis.performance;
  let t = 1000;
  const fake = {
    now: () => t,
    mark: (...args) => real.mark?.(...args),
    measure: (...args) => real.measure?.(...args),
    getEntriesByName: (...args) => real.getEntriesByName?.(...args) ?? [],
    clearMarks: (...args) => real.clearMarks?.(...args),
    clearMeasures: (...args) => real.clearMeasures?.(...args),
    timeOrigin: real.timeOrigin,
  };
  activeClock = {
    advance: (ms) => {
      t += ms;
    },
    now: () => t,
    restore: () => {
      Object.defineProperty(globalThis, 'performance', { configurable: true, writable: true, value: real });
      activeClock = null;
    },
  };
  Object.defineProperty(globalThis, 'performance', { configurable: true, writable: true, value: fake });
  return activeClock;
}

export function clockNow() {
  return activeClock ? activeClock.now() : 0;
}


/** Let the DOM's own animation loop run in real time for `ms` milliseconds. */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Numeric-aware comparison of two snapshots. Float tails can differ by a few
 * ulps between two independent but identical runs (e.g. 5.000000000002e-5 vs
 * 4.9999999998e-5 at a settle threshold), so compare numbers with a tolerance
 * and everything else exactly.
 */
export function compareSnapshots(a, b, epsilon = 1e-6) {
  let maxDelta = 0;
  const structural = [];

  const walk = (x, y, path) => {
    if (typeof x === 'number' && typeof y === 'number') {
      const delta = Math.abs(x - y);
      if (delta > maxDelta) maxDelta = delta;
      if (delta > epsilon) structural.push(`${path}: ${x} vs ${y}`);
      return;
    }
    if (typeof x === 'string' && typeof y === 'string') {
      // transforms carry interpolated numbers: compare token by token
      const nx = x.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? [];
      const ny = y.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? [];
      if (nx.length !== ny.length) {
        structural.push(`${path}: shape ${nx.length} vs ${ny.length}`);
        return;
      }
      for (let i = 0; i < nx.length; i++) {
        const delta = Math.abs(Number(nx[i]) - Number(ny[i]));
        if (delta > maxDelta) maxDelta = delta;
        if (delta > epsilon) structural.push(`${path}[${i}]: ${nx[i]} vs ${ny[i]}`);
      }
      if (x.replace(nx.join(','), '') !== y.replace(ny.join(','), '')) structural.push(`${path}: text differs`);
      return;
    }
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) {
        structural.push(`${path}: length ${x.length} vs ${y.length}`);
        return;
      }
      x.forEach((item, i) => walk(item, y[i], `${path}[${i}]`));
      return;
    }
    if (x && y && typeof x === 'object' && typeof y === 'object') {
      const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
      for (const key of keys) walk(x[key], y[key], `${path}.${key}`);
      return;
    }
    if (x !== y) structural.push(`${path}: ${JSON.stringify(x)} vs ${JSON.stringify(y)}`);
  };

  walk(a, b, 'root');
  return { equal: structural.length === 0, maxDelta, structural: structural.slice(0, 5) };
}
