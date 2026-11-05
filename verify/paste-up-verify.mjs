/**
 * Phase 5F verification — original Carter Paste-Up vs the Jesper port.
 *
 *   CARTER_REF=/tmp/carter node verify/paste-up-verify.mjs
 *
 * Scratch tooling; nothing in `src/` imports it and Vite never bundles it.
 * jsdom is installed ad hoc for this directory only (not in package.json).
 *
 * Section A mounts Carter's ORIGINAL `app/lib/experiments/paste-up.js` (read-only
 * checkout, rewritten at run time — Carter's code is never vendored here) and the
 * ported engine side by side in separate jsdom windows, with an identical stubbed
 * layout, an identical recording WebGL2 context, an identical recording 2d
 * context and an identical image stub. Both are then driven through the same
 * board switches, clicks, keys, config changes, fetch dwells and resizes, and
 * every value the engine derives per frame is compared.
 *
 * Limits: jsdom has no layout, no CSS, no GPU and no image decoding. Geometry is
 * a deterministic model of paste-up's own grid templates; canvas commands are
 * recorded, not rasterised; photographs are stubs. This is numeric, structural
 * and lifecycle verification — NOT browser visual verification.
 */
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import * as gsapModule from 'gsap';
import * as react from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compareSnapshots } from './harness.mjs';

const gsap = gsapModule.default;
const { createElement, act } = react;

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const FLUSH = () => new Promise((resolve) => setTimeout(resolve, 0));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const VIEWPORTS = [
  { label: 'desktop 1440x900', width: 1440, height: 900 },
  { label: 'tablet 768x1024', width: 768, height: 1024 },
  { label: 'mobile 390x844', width: 390, height: 844 },
];

const CARTER_REF = process.env.CARTER_REF;
if (!CARTER_REF) throw new Error('CARTER_REF must point at the read-only Carter checkout');

/* -------------------------------------------------------------------------- */
/* Deterministic geometry: a model of paste-up's own CSS grid definitions.     */
/* -------------------------------------------------------------------------- */

const zero = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
const box = (left, top, width, height) => ({
  x: left,
  y: top,
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** `.pu__field { inset: 52px var(--s-16) 44px }` inside a viewport. */
function fieldRect(win) {
  const { width, height } = win.__stageSize;
  return box(24, 80, width - 48, height - 160);
}

/** `.pu__index.is-on` → 2×3 grid, `24px 14px` gaps, `16px` bottom padding. */
function indexSlot(field, i) {
  const cellW = (field.width - 2 * 14) / 3;
  const cellH = (field.height - 16 - 24) / 2;
  return box(field.left + (i % 3) * (cellW + 14), field.top + Math.floor(i / 3) * (cellH + 24), cellW, cellH);
}

/** `.pu__spread.is-on` → plate + rail (`clamp(90px, 16%, 150px)`, `20px` rows). */
function spreadSlot(field, i) {
  const railW = clamp(field.width * 0.16, 90, 150);
  const plateW = field.width - 14 - railW;
  const h = field.height - 16;
  if (i === 0) return box(field.left, field.top, plateW, h);
  const rowH = (h - 4 * 20) / 5;
  return box(field.left + plateW + 14, field.top + (i - 1) * (rowH + 20), railW, rowH);
}

/** `.pu__strip.is-on` → six 3:4 columns, `14px` gap, vertically centred. */
function stripSlot(field, i) {
  const colW = (field.width - 5 * 14) / 6;
  const h = (colW * 4) / 3;
  const top = field.top + (field.height - 16 - h) / 2;
  return box(field.left + i * (colW + 14), top, colW, h);
}

// `offsetLeft` / `offsetWidth` of the three tabs, in document order.
const TAB_METRICS = { index: [0, 34], spread: [42, 41], strip: [91, 38] };

/* -------------------------------------------------------------------------- */
/* Recording 2d + WebGL2 contexts.                                             */
/* -------------------------------------------------------------------------- */

function make2d(canvas) {
  const ops = { fillRect: 0, moveTo: 0, lineTo: 0, stroke: 0, roundRect: 0, save: 0, restore: 0, clip: 0, strokes: [] };
  const state = { canvas, fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1, lineCap: 'butt' };
  const handlers = {
    fillRect() {
      ops.fillRect += 1;
    },
    beginPath() {},
    moveTo() {
      ops.moveTo += 1;
    },
    lineTo() {
      ops.lineTo += 1;
    },
    stroke() {
      ops.stroke += 1;
      ops.strokes.push([state.strokeStyle, +state.globalAlpha, state.lineWidth, state.lineCap]);
    },
    save() {
      ops.save += 1;
    },
    restore() {
      ops.restore += 1;
    },
    roundRect() {
      ops.roundRect += 1;
    },
    clip() {
      ops.clip += 1;
    },
    measureText: () => ({ width: 0 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}),
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData() {},
    createImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
  };
  const ctx = new Proxy(state, {
    get(target, prop) {
      if (prop in handlers) return typeof handlers[prop] === 'function' ? handlers[prop].bind(target) : handlers[prop];
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has: () => true,
  });
  canvas.__ops = ops;
  return ctx;
}

function makeWebGL2(canvas, win) {
  return {
    /* constants the engine touches */
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    BLEND: 3042,
    ONE: 1,
    ONE_MINUS_SRC_ALPHA: 771,
    TEXTURE_2D: 3553,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    UNSIGNED_SHORT: 5123,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    LINEAR: 9729,
    CLAMP_TO_EDGE: 33071,
    TEXTURE0: 33984,
    TRIANGLES: 4,
    COLOR_BUFFER_BIT: 16384,

    /* recorders */
    frames: [],
    uploads: [],
    viewports: [],
    lost: 0,
    shaders: [],
    programs: 0,
    attribs: 0,
    buffers: 0,
    blend: null,
    blendEnabled: false,
    textures: 0,
    drawCalls: 0,
    __u: {},
    __batch: null,
    __tex: -1,

    /* program / shader */
    createShader(type) {
      const shader = { type, source: '' };
      return shader;
    },
    shaderSource(shader, source) {
      shader.source = source;
    },
    compileShader() {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',
    createProgram() {
      this.programs += 1;
      return { shaders: [] };
    },
    attachShader(program, shader) {
      program.shaders.push(shader.type);
    },
    linkProgram() {},
    useProgram() {},
    getUniformLocation: (_program, name) => ({ name }),
    /* attributes / buffers */
    createBuffer() {
      this.buffers += 1;
      return { id: this.buffers };
    },
    bindBuffer() {},
    bufferData() {},
    getAttribLocation: () => 0,
    enableVertexAttribArray() {
      this.attribs += 1;
    },
    vertexAttribPointer() {},
    enable(cap) {
      if (cap === this.BLEND) this.blendEnabled = true;
    },
    blendFunc(src, dst) {
      this.blend = [src, dst];
    },
    /* textures */
    createTexture() {
      this.textures += 1;
      return { index: this.textures - 1 };
    },
    bindTexture(_target, texture) {
      this.__tex = texture?.index ?? -1;
    },
    texImage2D(_target, _level, _ifmt, _fmt, _type, source) {
      const kind = source?.tagName === 'CANVAS' ? 'grid' : 'image';
      const w = kind === 'grid' ? source.width : source?.naturalWidth ?? 0;
      const h = kind === 'grid' ? source.height : source?.naturalHeight ?? 0;
      this.uploads.push({ kind, w, h, tex: this.__tex });
      if (kind === 'grid') win.__grid = { canvas: [w, h], ops: source.__ops };
    },
    texParameteri() {},
    activeTexture() {},
    /* draw */
    viewport(x, y, w, h) {
      this.viewports.push([x, y, w, h]);
    },
    clearColor() {},
    clear() {
      this.__batch = [];
      this.frames.push(this.__batch);
      this.__u = {};
    },
    uniform4f(loc, x, y, z, w) {
      this.__u[loc.name] = [x, y, z, w];
    },
    uniform2f(loc, x, y) {
      this.__u[loc.name] = [x, y];
    },
    uniform1f(loc, x) {
      this.__u[loc.name] = x;
    },
    uniform1i(loc, x) {
      this.__u[loc.name] = x;
    },
    drawElements(_mode, count) {
      this.drawCalls += 1;
      this.__batch.push({ ...structuredClone(this.__u), tex: this.__tex, count });
    },
    getExtension(name) {
      if (name !== 'WEBGL_lose_context') return null;
      return {
        loseContext: () => {
          this.lost += 1;
          win.__lostContexts = (win.__lostContexts ?? 0) + 1;
        },
      };
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Window factory: jsdom + layout + contexts + images + a manual rAF queue.    */
/* -------------------------------------------------------------------------- */

/**
 * One process-wide image stub. A real page has a single global `Image`; the
 * engine creates images from inside Carter's `fetch` timer too, which fires
 * outside any per-action global scope, so the constructor must never be scoped.
 * `naturalWidth` follows the requested `width=` (720 mount, 1440 hi-res), which
 * is what the texture record reads back.
 */
class FakeImage {
  static decodeMode = 'reject';
  /**
   * A real `<img>` when a document is in scope (Carter's no-WebGL2 path inserts
   * the element into the slot and later rewrites its `src`), otherwise a plain
   * record — the hi-res upgrade only feeds `texImage2D`, from inside a timer.
   */
  constructor() {
    const doc = globalThis.document;
    if (!doc) return new FakeImage.Standalone();
    const el = doc.createElement('img');
    let src = '';
    el.__requested = 0;
    Object.defineProperty(el, 'src', {
      configurable: true,
      get: () => src,
      set: (value) => {
        src = String(value);
        el.setAttribute('src', src);
        el.__requested = Number(/width=(\d+)/.exec(src)?.[1] ?? 720);
      },
    });
    Object.defineProperty(el, 'naturalWidth', {
      configurable: true,
      get: () => el.__requested,
    });
    Object.defineProperty(el, 'naturalHeight', {
      configurable: true,
      get: () => Math.round(el.__requested * 1.25),
    });
    el.decode = () =>
      FakeImage.decodeMode === 'reject'
        ? Promise.reject(new Error('no network in jsdom'))
        : Promise.resolve();
    return el;
  }
}
FakeImage.Standalone = class Standalone {
  constructor() {
    this.crossOrigin = null;
    this._src = '';
  }
  set src(value) {
    this._src = value;
    const requested = Number(/width=(\d+)/.exec(value)?.[1] ?? 720);
    this.naturalWidth = requested;
    this.naturalHeight = Math.round(requested * 1.25);
  }
  get src() {
    return this._src;
  }
  decode() {
    return FakeImage.decodeMode === 'reject'
      ? Promise.reject(new Error('no network in jsdom'))
      : Promise.resolve();
  }
};

function makeWindow({ width = 1440, height = 900, reducedMotion = 'no-preference', webgl = true, decode = 'reject' } = {}) {
  const dom = new JSDOM(
    '<!doctype html><html><head><style>:root{--ink:#f2f1ee;--paper:#0d0d0d;--surface:#262626;--ink-muted:#f7f7f780}</style></head><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'http://localhost/' },
  );
  const { window } = dom;
  window.__stageSize = { width, height };
  window.__decode = decode;
  window.__images = [];
  window.__lostContexts = 0;

  window.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotion === 'reduce' : false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });

  // ---- layout: jsdom reports 0 for everything ----
  window.HTMLElement.prototype.getBoundingClientRect = function rect() {
    const field = fieldRect(window);
    if (this.classList?.contains('pu__field')) return field;
    if (this.classList?.contains('pu__slot')) {
      const board = this.closest('.pu__board');
      // `display: none` boards report an all-zero rect, exactly as in a browser
      if (!board || !board.classList.contains('is-on')) return zero();
      const i = [...board.querySelectorAll('[data-print]')].indexOf(this);
      if (i < 0) return zero();
      if (board.classList.contains('pu__index')) return indexSlot(field, i);
      if (board.classList.contains('pu__spread')) return spreadSlot(field, i);
      return stripSlot(field, i);
    }
    if (this.classList?.contains('labd__viewport')) return box(0, 0, width, height);
    return zero();
  };
  Object.defineProperty(window.HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get() {
      return TAB_METRICS[this.dataset?.board]?.[0] ?? 0;
    },
  });
  Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return TAB_METRICS[this.dataset?.board]?.[1] ?? 0;
    },
  });

  // ---- canvases: recording 2d / recording webgl2 ----
  window.HTMLCanvasElement.prototype.getContext = function getContext(type) {
    if (type === '2d') {
      if (!this.__ctx2d) this.__ctx2d = make2d(this);
      return this.__ctx2d;
    }
    if (type === 'webgl2') {
      if (!webgl) return null;
      if (!this.__gl2) {
        this.__gl2 = makeWebGL2(this, window);
        window.__gl2 = this.__gl2;
      }
      return this.__gl2;
    }
    return null;
  };

  // ---- images ----
  window.Image = FakeImage;

  // ---- audio: jsdom cannot decode; the other ported engines still construct it ----
  window.Audio = class Audio {
    constructor(src) {
      this.src = src ?? '';
      this.paused = true;
      this.volume = 1;
      this.playbackRate = 1;
      this.currentTime = 0;
    }
    play() {
      return Promise.reject(new Error('no audio in jsdom'));
    }
    pause() {}
    load() {}
    addEventListener() {}
    removeEventListener() {}
  };

  // ---- observers ----
  const observers = new Set();
  window.ResizeObserver = class ResizeObserver {
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

  // ---- manual animation queue ----
  const queue = new Map();
  let id = 0;
  window.requestAnimationFrame = (cb) => {
    queue.set(++id, cb);
    return id;
  };
  window.cancelAnimationFrame = (key) => queue.delete(key);
  window.__rafCallbacks = queue;

  return { dom, window };
}

/* -------------------------------------------------------------------------- */
/* Global scoping.                                                            */
/* -------------------------------------------------------------------------- */

const SCOPE_KEYS = [
  'window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent',
  'KeyboardEvent', 'CustomEvent', 'DocumentFragment', 'HTMLCanvasElement', 'HTMLImageElement',
  'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLAnchorElement', 'SVGElement', 'Audio',
  'ResizeObserver', 'AbortController', 'AbortSignal', 'matchMedia', 'Image', 'devicePixelRatio',
  'requestAnimationFrame', 'cancelAnimationFrame',
];

async function inScope(win, fn) {
  const saved = new Map();
  for (const key of SCOPE_KEYS) {
    saved.set(key, { had: key in globalThis, value: globalThis[key] });
    const value = key === 'devicePixelRatio' ? 2 : win[key];
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const hadStyle = 'getComputedStyle' in globalThis;
  const previousStyle = globalThis.getComputedStyle;
  globalThis.getComputedStyle = (el, pseudo) => (el?.ownerDocument?.defaultView ?? win).getComputedStyle(el, pseudo);
  try {
    return await fn();
  } finally {
    for (const [key, { had, value }] of saved) {
      if (had) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
      else delete globalThis[key];
    }
    if (hadStyle) globalThis.getComputedStyle = previousStyle;
    else delete globalThis.getComputedStyle;
  }
}

/* -------------------------------------------------------------------------- */
/* Carter's original engine, derived at run time (never vendored).            */
/* -------------------------------------------------------------------------- */

const gsapUrl = pathToFileURL(path.join(process.cwd(), 'node_modules/gsap/index.js')).href;

/** Carter's `kd()` from mesh.ts, extracted verbatim at run time. */
function extractGridTexture() {
  const source = fs.readFileSync(path.join(CARTER_REF, 'app/lib/mesh.ts'), 'utf8');
  const start = source.indexOf('function kd(');
  const end = source.indexOf('var Ad=', start);
  if (start < 0 || end < 0) throw new Error('could not locate kd() in Carter mesh.ts');
  const body = source.slice(start, end);
  // `Od` is Carter's ink reader; resolve it against whichever document is live
  const Od = () =>
    globalThis.getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#f2f1ee';
  return new Function('Od', `${body}; return kd;`)(Od);
}

let originalModule = null;
async function loadOriginal() {
  if (originalModule) return originalModule;
  const file = path.join(CARTER_REF, 'app/lib/experiments/paste-up.js');
  const source = fs.readFileSync(file, 'utf8');
  const rewritten = source
    .replace(
      /^import\{f as e,r as t,t as n\}from"\.\.\/mesh\.ts";/,
      `const { default: e } = await import(${JSON.stringify(gsapUrl)});\nconst t = globalThis.__carterGrid;\nconst n = { on: false };`,
    )
    .replace(
      /import\{img as r\}from"\.\.\/assets\.ts";/,
      'const r = (p, width = 720, quality = 86) => `https://assets.carterogunsola.com/cdn-cgi/image/width=${width},quality=${quality},format=auto/${p.replace(/^\\/+/, "")}`;',
    );
  if (rewritten.includes('../mesh.ts') || rewritten.includes('../assets.ts')) {
    throw new Error('could not rewrite the mesh.ts/assets.ts imports in Carter paste-up.js');
  }
  const out = path.join(os.tmpdir(), `carter-paste-up-original-${process.pid}.mjs`);
  fs.writeFileSync(out, rewritten);
  originalModule = await import(pathToFileURL(out).href);
  return originalModule;
}

/* -------------------------------------------------------------------------- */
/* Deterministic frames.                                                      */
/* -------------------------------------------------------------------------- */

gsap.ticker.sleep();
async function stepFrames(count) {
  for (let i = 0; i < count; i++) {
    gsap.ticker.tick();
    await FLUSH();
  }
}
/** Let a real timer elapse (Carter's `fetch` dwell is a real setTimeout). */
async function advance(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    gsap.ticker.tick();
    await sleep(8);
  }
}

/* -------------------------------------------------------------------------- */
/* Snapshots.                                                                 */
/* -------------------------------------------------------------------------- */

const round = (arr) => arr.map((v) => Math.round(v * 1e4) / 1e4);
const round4 = (v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v);

function snapshot(win) {
  const pu = win.document.querySelector('.pu');
  if (!pu) return null;
  const gl = win.__gl2 ?? null;
  const boards = {};
  for (const name of ['index', 'spread', 'strip']) {
    const board = pu.querySelector(`.pu__${name}`);
    boards[name] = {
      on: board.classList.contains('is-on'),
      prints: [...board.querySelectorAll('[data-print]')].map((el) => el.dataset.print),
      tags: [...board.querySelectorAll('.pu__tag')].map((el) => el.textContent),
      imgs: [...board.querySelectorAll('img')].map((el) => el.getAttribute('src')),
    };
  }
  const batches = gl ? gl.frames : [];
  const last = batches.length ? batches[batches.length - 1] : [];
  return {
    tabs: [...pu.querySelectorAll('.pu__tab')].map((el) => [el.dataset.board, el.classList.contains('is-on')]),
    tabline: [pu.querySelector('.pu__tabline').style.transform, pu.querySelector('.pu__tabline').style.width],
    hud: pu.querySelector('[data-pu-board]').textContent,
    boards,
    canvas: [pu.querySelector('canvas')?.width ?? null, pu.querySelector('canvas')?.height ?? null],
    hasCanvas: !!pu.querySelector('canvas'),
    slots: pu.querySelectorAll('[data-print]').length,
    draws: last.map((d) => ({
      tex: d.tex,
      rect: d.uRect ? round(d.uRect) : null,
      imgRes: d.uImgRes ? round(d.uImgRes) : null,
      vel: d.uVel ? round(d.uVel) : null,
      bend: round4(d.uBend),
      alpha: round4(d.uAlpha),
      count: d.count,
    })),
    drawCount: last.length,
  };
}

/**
 * Dispatch inside the window's global scope: Carter's `showBoard()` calls
 * `window.setTimeout` for the `fetch` dwell, so `window` must be that window.
 */
async function click(win, el) {
  if (!el) throw new Error('click target missing');
  await inScope(win, () => {
    el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

async function key(win, el, k) {
  return inScope(win, () => {
    const event = new win.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

/* -------------------------------------------------------------------------- */
/* A. Original vs port.                                                       */
/* -------------------------------------------------------------------------- */

async function mountBoth(vp, { reducedMotion = 'no-preference', webgl = true, decode = 'reject' } = {}) {
  const a = makeWindow({ ...vp, reducedMotion, webgl, decode });
  const b = makeWindow({ ...vp, reducedMotion, webgl, decode });

  FakeImage.decodeMode = decode;
  globalThis.__carterGrid = extractGridTexture();
  const original = await loadOriginal();

  const hostA = a.window.document.createElement('div');
  hostA.style.cssText = 'position:absolute;inset:0';
  a.window.document.body.appendChild(hostA);
  const orig = await inScope(a.window, () => original.default.mount(hostA));

  const hostB = b.window.document.createElement('div');
  hostB.style.cssText = 'position:absolute;inset:0;--ink:#f2f1ee';
  b.window.document.body.appendChild(hostB);
  const port = await inScope(b.window, () => {
    portModule.bindCarterRuntime({ root: hostB, navigate: () => {}, appReady: true });
    return portModule.mountPasteUp(hostB);
  });

  return { a, b, orig, port, hostA, hostB };
}

const origSet = (both, k, v) => {
  const instance = both.orig;
  if (typeof instance === 'function') return;
  instance?.set?.(k, v);
};
const portSet = (both, k, v) => both.port?.set?.(k, v);

async function teardown(both) {
  const { a, b, orig, port, hostA, hostB } = both;
  await inScope(b.window, () => {
    port?.destroy?.();
    portModule.destroyAll();
    portModule.unbindCarterRuntime(hostB);
  });
  if (typeof orig === 'function') orig();
  else orig?.destroy?.();
  void hostA;
  const gone = !a.window.document.querySelector('.pu') && !b.window.document.querySelector('.pu');
  a.dom.window.close();
  b.dom.window.close();
  return gone;
}

const cmpNote = (cmp) => (cmp.equal ? '' : ` | ${cmp.structural.join(' | ')}`);

async function equivalence() {
  for (const vp of VIEWPORTS) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const tag = `${vp.label}${reducedMotion === 'reduce' ? ' [reduced]' : ''}`;
      const both = await mountBoth(vp, { reducedMotion });
      const { a, b } = both;

      // --- mount ---
      await stepFrames(2);
      let cmp = compareSnapshots(snapshot(a.window), snapshot(b.window));
      const gridA = JSON.stringify(a.window.__grid?.ops?.strokes);
      const gridB = JSON.stringify(b.window.__grid?.ops?.strokes);
      const gridSame = gridA === gridB && (a.window.__grid?.canvas ?? []).join('x') === (b.window.__grid?.canvas ?? []).join('x');
      check(
        `A1 mount state + placeholder grid identical — ${tag}`,
        cmp.equal && gridSame,
        `draws=${snapshot(b.window).drawCount} grid=${(a.window.__grid?.canvas ?? []).join('x')} strokes=${
          a.window.__grid?.ops?.stroke
        } blend=${JSON.stringify(b.window.__gl2?.blend)}${cmpNote(cmp)}${gridSame ? '' : ` | grid ${gridA} vs ${gridB}`}`,
      );

      // --- index settle ---
      await stepFrames(40);
      cmp = compareSnapshots(snapshot(a.window), snapshot(b.window));
      check(`A2 index board settles identically — ${tag}`, cmp.equal,
        `maxFloatDelta=${cmp.maxDelta.toExponential(2)}${cmpNote(cmp)}`);

      // --- spread tab ---
      await click(a.window, a.window.document.querySelector('.pu__tab[data-board="spread"]'));
      await click(b.window, b.window.document.querySelector('.pu__tab[data-board="spread"]'));
      await stepFrames(1);
      const midB = snapshot(b.window);
      cmp = compareSnapshots(snapshot(a.window), midB);
      check(`A3 spread switch, first frame identical — ${tag}`, cmp.equal,
        `hud=${midB.hud} draws=${midB.drawCount}${cmpNote(cmp)}`);
      await stepFrames(60);
      cmp = compareSnapshots(snapshot(a.window), snapshot(b.window));
      check(`A4 spread board settles identically — ${tag}`, cmp.equal,
        `maxFloatDelta=${cmp.maxDelta.toExponential(2)}${cmpNote(cmp)}`);

      // --- plate swap: a rail print claims the plate ---
      await click(a.window, a.window.document.querySelector('.pu__spread .pu__rail [data-print="p3"]'));
      await click(b.window, b.window.document.querySelector('.pu__spread .pu__rail [data-print="p3"]'));
      await stepFrames(30);
      const swapB = snapshot(b.window);
      cmp = compareSnapshots(snapshot(a.window), swapB);
      check(`A5 plate swap to p3 identical — ${tag}`,
        cmp.equal && swapB.boards.spread.prints[0] === 'p3',
        `plate=${swapB.boards.spread.prints[0]} order=${swapB.boards.spread.prints.join(',')}${cmpNote(cmp)}`);

      // --- plate click → index ---
      await click(a.window, a.window.document.querySelector('.pu__spread [data-print="p3"]'));
      await click(b.window, b.window.document.querySelector('.pu__spread [data-print="p3"]'));
      await stepFrames(40);
      cmp = compareSnapshots(snapshot(a.window), snapshot(b.window));
      check(`A6 plate click returns to the index identically — ${tag}`, cmp.equal,
        `hud=${snapshot(b.window).hud}${cmpNote(cmp)}`);

      // --- keyboard: Enter on index print p4 ---
      const enterA = await key(a.window, a.window.document.querySelector('.pu__index [data-print="p4"]'), 'Enter');
      const enterB = await key(b.window, b.window.document.querySelector('.pu__index [data-print="p4"]'), 'Enter');
      await stepFrames(220);
      const enterBState = snapshot(b.window);
      cmp = compareSnapshots(snapshot(a.window), enterBState);
      check(`A7 Enter opens the spread identically — ${tag}`,
        cmp.equal && enterA === true && enterB === true && enterBState.boards.spread.prints[0] === 'p4',
        `plate=${enterBState.boards.spread.prints[0]} prevented=${enterB}${cmpNote(cmp)}`);

      // --- fetch dwell with memory ON: the old board is torn down, planes hold ---
      origSet(both, 'fetch', 400);
      portSet(both, 'fetch', 400);
      const heldBefore = snapshot(b.window);
      await click(a.window, a.window.document.querySelector('.pu__tab[data-board="strip"]'));
      await click(b.window, b.window.document.querySelector('.pu__tab[data-board="strip"]'));
      await stepFrames(6);
      const heldA = snapshot(a.window);
      const heldB = snapshot(b.window);
      cmp = compareSnapshots(heldA, heldB);
      // "hold still" = both boards gone and every plane still drawn at its
      // pre-switch rect (the dwell tears the old board down first)
      const heldStill =
        heldB.boards.strip.on === false &&
        heldB.boards.spread.on === false &&
        JSON.stringify(heldB.draws) === JSON.stringify(heldBefore.draws);
      if (reducedMotion === 'reduce') {
        // Carter's own rule: `if (params.fetch > 0 && !reduced)` — no dwell at all
        check(`A8 reduced motion bypasses the fetch dwell, identically — ${tag}`,
          cmp.equal && heldB.boards.strip.on === true,
          `strip.is-on=${heldB.boards.strip.on} (dwell skipped)${cmpNote(cmp)}`);
      } else {
        check(`A8 fetch dwell holds the planes still, identically — ${tag}`,
          cmp.equal && heldStill,
          `strip.is-on=${heldB.boards.strip.on} draws=${heldB.drawCount}${cmpNote(cmp)}`);
      }
      await advance(460);
      await stepFrames(220);
      cmp = compareSnapshots(snapshot(a.window), snapshot(b.window));
      check(`A9 strip board settles identically after the dwell — ${tag}`,
        cmp.equal && snapshot(b.window).boards.strip.on === true,
        `maxFloatDelta=${cmp.maxDelta.toExponential(2)}${cmpNote(cmp)}`);

      // --- memory OFF with a dwell: the collapse-then-pop the experiment shows ---
      origSet(both, 'memory', 'off');
      portSet(both, 'memory', 'off');
      await click(a.window, a.window.document.querySelector('.pu__tab[data-board="index"]'));
      await click(b.window, b.window.document.querySelector('.pu__tab[data-board="index"]'));
      await stepFrames(8);
      const collapsedA = snapshot(a.window);
      const collapsedB = snapshot(b.window);
      cmp = compareSnapshots(collapsedA, collapsedB);
      const beforeWidths = heldBefore.draws.map((d) => d.rect[2]);
      const nowWidths = collapsedB.draws.map((d) => d.rect[2]);
      const collapsed =
        collapsedB.boards.index.on === false &&
        nowWidths.length > 0 &&
        Math.max(...nowWidths) < Math.min(...beforeWidths) * 0.75;
      if (reducedMotion === 'reduce') {
        // with no dwell and a reduced-motion snap the planes simply arrive
        const field = fieldRect(b.window);
        const indexW = (field.width - 2 * 14) / 3;
        check(`A10 reduced motion snaps the planes home instead of collapsing — ${tag}`,
          cmp.equal && collapsedB.boards.index.on === true && nowWidths.every((w) => Math.abs(w - indexW) < 0.01),
          `draws=${collapsedB.drawCount} widths=${nowWidths.map((w) => w.toFixed(1)).join(',')} index cell=${indexW.toFixed(1)}${cmpNote(cmp)}`);
      } else {
        check(`A10 memory off collapses the planes into the corner, identically — ${tag}`,
          cmp.equal && collapsed,
          `draws=${collapsedB.drawCount} widths ${Math.min(...beforeWidths).toFixed(1)} -> ${nowWidths
            .map((w) => w.toFixed(1))
            .join(',')}${cmpNote(cmp)}`);
      }
      await advance(460);
      await stepFrames(220);
      cmp = compareSnapshots(snapshot(a.window), snapshot(b.window));
      check(`A11 planes pop into place after the dwell, identically — ${tag}`,
        cmp.equal && snapshot(b.window).boards.index.on === true,
        `maxFloatDelta=${cmp.maxDelta.toExponential(2)}${cmpNote(cmp)}`);

      // --- damp + bend config ---
      origSet(both, 'damp', 0.2);
      portSet(both, 'damp', 0.2);
      origSet(both, 'bend', 0.4);
      portSet(both, 'bend', 0.4);
      origSet(both, 'fetch', 0);
      portSet(both, 'fetch', 0);
      await click(a.window, a.window.document.querySelector('.pu__tab[data-board="strip"]'));
      await click(b.window, b.window.document.querySelector('.pu__tab[data-board="strip"]'));
      await stepFrames(6);
      cmp = compareSnapshots(snapshot(a.window), snapshot(b.window));
      const bendB = snapshot(b.window).draws[0]?.bend;
      check(`A12 damp/bend config identical — ${tag}`,
        cmp.equal && Math.abs((bendB ?? -1) - (reducedMotion === 'reduce' ? 0 : 0.4)) < 1e-9,
        `uBend=${bendB} damp=0.2${cmpNote(cmp)}`);

      // --- resize → re-measure ---
      for (const [w, h] of [
        [Math.round(vp.width * 0.7), vp.height + 40],
        [vp.width, vp.height],
      ]) {
        a.window.__stageSize = { width: w, height: h };
        b.window.__stageSize = { width: w, height: h };
        for (const win of [a.window, b.window]) {
          await inScope(win, () => {
            for (const observer of win.__observers) observer.cb([{ target: [...observer.targets][0] }]);
          });
        }
        await stepFrames(40);
      }
      cmp = compareSnapshots(snapshot(a.window), snapshot(b.window));
      check(`A13 resize re-measure identical — ${tag}`, cmp.equal,
        `canvas=${snapshot(b.window).canvas.join('x')} maxFloatDelta=${cmp.maxDelta.toExponential(2)}${cmpNote(cmp)}`);

      // --- teardown ---
      const gone = await teardown(both);
      check(`A14 teardown removes the stage and releases both engines — ${tag}`, gone === true);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* A-bis. Carter's no-WebGL2 fallback, and the hi-res texture upgrade.        */
/* -------------------------------------------------------------------------- */

const PRINT_PATHS = [
  'dts/unwrapped/DTS_Unwrapped_by_FRANCO_DUPUY_22.jpg',
  'dts/unwrapped/DTS_Unwrapped_by_FRANCO_DUPUY_25.jpg',
  'dts/unwrapped/DTS_Unwrapped_by_FRANCO_DUPUY_27.jpg',
  'dts/landing-site/DTS_Landing_Site_by_Fanette_Guilloud_6.jpg',
  'dts/landing-site/DTS_Landing_Site_by_Fanette_Guilloud_17.jpg',
  'dts/landing-site/DTS_Landing_Site_by_Fanette_Guilloud_44.jpg',
];
const printUrl = (print, width = 720) =>
  `https://assets.carterogunsola.com/cdn-cgi/image/width=${width},quality=86,format=auto/${print}`;

async function fallbackPath() {
  const vp = VIEWPORTS[0];
  const both = await mountBoth(vp, { webgl: false });
  const { a, b } = both;
  await stepFrames(2);

  const snapA = snapshot(a.window);
  const snapB = snapshot(b.window);
  const cmp = compareSnapshots(snapA, snapB);
  const srcs = [...b.window.document.querySelectorAll('.pu__slot img')].map((el) => el.getAttribute('src'));
  const exactUrls = srcs.length === 18 && srcs.slice(0, 6).every((src, i) => src === printUrl(PRINT_PATHS[i]));
  check('A15 no-WebGL2 fallback matches Carter (canvas gone, 18 images, exact URLs)',
    cmp.equal && snapB.hasCanvas === false && exactUrls,
    `imgs=${srcs.length} canvas=${snapB.hasCanvas} first=${srcs[0]}${cmpNote(cmp)}`);

  // Carter's own no-WebGL2 path throws on the first board switch: its dirty
  // flag (`Z`) is declared *after* the `if (!gl) return …` early exit, so the
  // first `measure()` hits the temporal dead zone. The port declares its flag
  // before that branch (documented adaptation), so the fallback the Notes pane
  // promises — "the page still works, which was his first point" — works.
  await click(a.window, a.window.document.querySelector('.pu__spread .pu__rail [data-print="p1"]'));
  await click(b.window, b.window.document.querySelector('.pu__spread .pu__rail [data-print="p1"]'));
  await stepFrames(30);
  const swapA = snapshot(a.window);
  const swapB = snapshot(b.window);
  check('A16 fallback plate swap rewrites the image sources (Carter\'s own fallback throws here)',
    swapB.boards.spread.prints[0] === 'p1' && swapB.boards.spread.imgs[0] === srcs[1] && swapA.hud === 'BOARD::INDEX',
    `port plate=${swapB.boards.spread.prints[0]} img=${(swapB.boards.spread.imgs[0] ?? '').split('/').pop()}; ` +
      `original stayed on ${swapA.hud} (its own TDZ ReferenceError before the swap)`);
  await teardown(both);

  // ---- hi-res upgrade: the claimed print gets one 1440px texture ----
  const hires = await mountBoth(vp, { decode: 'resolve' });
  await stepFrames(4);
  const mountUploadsA = hires.a.window.__gl2.uploads.map((u) => `${u.kind}:${u.w}x${u.h}:${u.tex}`);
  const mountUploadsB = hires.b.window.__gl2.uploads.map((u) => `${u.kind}:${u.w}x${u.h}:${u.tex}`);
  await click(hires.a.window, hires.a.window.document.querySelector('.pu__tab[data-board="spread"]'));
  await click(hires.b.window, hires.b.window.document.querySelector('.pu__tab[data-board="spread"]'));
  await stepFrames(20);
  const afterUploadsB = hires.b.window.__gl2.uploads.map((u) => `${u.kind}:${u.w}x${u.h}:${u.tex}`);
  const hiRes = afterUploadsB.filter((u) => u.startsWith('image:1440x1800')).length;
  check('A17 720 uploads then exactly one 1440 hi-res upgrade, identical to Carter',
    JSON.stringify(mountUploadsA) === JSON.stringify(mountUploadsB) &&
      hires.a.window.__gl2.uploads.length === hires.b.window.__gl2.uploads.length &&
      hiRes === 1,
    `mount uploads=${mountUploadsB.length} after plate=${afterUploadsB.length} hi-res=${hiRes}`);
  const cmpHi = compareSnapshots(snapshot(hires.a.window), snapshot(hires.b.window));
  check('A18 hi-res textures keep the frame state identical', cmpHi.equal,
    `maxFloatDelta=${cmpHi.maxDelta.toExponential(2)}${cmpNote(cmpHi)}`);
  await teardown(hires);
}

/* -------------------------------------------------------------------------- */
/* B. Real integration path (CarterRoute → LabDetailPage → PasteUpStage).     */
/* -------------------------------------------------------------------------- */

function edgeCounts(window) {
  let count = 0;
  const add = window.addEventListener;
  const remove = window.removeEventListener;
  window.addEventListener = function (...args) {
    count += 1;
    return add.apply(this, args);
  };
  window.removeEventListener = function (...args) {
    count -= 1;
    return remove.apply(this, args);
  };
  return () => {
    window.addEventListener = add;
    window.removeEventListener = remove;
    return count;
  };
}

async function integrationPath(server) {
  FakeImage.decodeMode = 'resolve';
  const { dom, window } = makeWindow({ width: 1440, height: 900, decode: 'resolve' });

  global.window = window;
  global.document = window.document;
  global.navigator = window.navigator;
  global.matchMedia = window.matchMedia;
  global.requestAnimationFrame = window.requestAnimationFrame;
  global.cancelAnimationFrame = window.cancelAnimationFrame;
  global.ResizeObserver = window.ResizeObserver;
  global.AbortController = window.AbortController;
  global.AbortSignal = window.AbortSignal;
  global.Image = window.Image;
  global.devicePixelRatio = 2;
  global.getComputedStyle = window.getComputedStyle.bind(window);
  for (const name of [
    'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent',
    'DocumentFragment', 'HTMLCanvasElement', 'HTMLImageElement', 'HTMLInputElement',
    'HTMLTextAreaElement', 'HTMLAnchorElement', 'SVGElement',
  ]) {
    if (window[name] !== undefined) global[name] = window[name];
  }
  global.IS_REACT_ACT_ENVIRONMENT = true;

  const { createRoot } = await import('react-dom/client');
  // Vite's SSR module runner provides the GSAP instance imported by CarterRoute's
  // engine. It has a separate ticker from the top-level ESM GSAP used by the
  // source-equivalence harness, so integration frames must drive this instance.
  const { default: appGsap } = await server.ssrLoadModule('gsap');
  const { default: CarterRoute } = await server.ssrLoadModule('/src/carter/CarterRoute.jsx');
  const { resolveCarterPage } = await server.ssrLoadModule('/src/carter/routes.js');

  const container = window.document.getElementById('root');
  const root = createRoot(container);
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.map(String).join(' ');
    if (message.includes('suspended resource')) return;
    errors.push(message);
  };

  const route = (slug) =>
    createElement(CarterRoute, {
      page: resolveCarterPage(`/routes/lab/${slug}`),
      appReady: true,
      onNavigate: () => {},
      placeholder: null,
    });

  // Sleep the Vite SSR ticker (whose rAF is queued on the jsdom window), then
  // advance that same ticker once per synthetic frame. The top-level verifier
  // ticker is intentionally reserved for Carter/source equivalence in section A.
  const settle = async (ms = 320) => {
    appGsap.ticker.sleep();
    const frames = Math.max(1, Math.round(ms / 16.667));
    await act(async () => {
      for (let i = 0; i < frames; i++) {
        window.__now = (window.__now ?? 0) + 16.667;
        const due = [...window.__rafCallbacks.values()];
        window.__rafCallbacks.clear();
        for (const callback of due) {
          try {
            callback(window.__now);
          } catch (error) {
            console.error('[rAF]', error);
          }
        }
        try {
          appGsap.ticker.tick();
        } catch (error) {
          console.error('[tick]', error);
        }
        await sleep(17);
      }
    });
  };

  const render = async (slug) => {
    await act(async () => {
      root.render(route(slug));
      await sleep(40);
    });
    const ready = () => {
      const detail = container.querySelector('[data-lab-detail]');
      return detail && (slug !== 'paste-up' || detail.hasAttribute('data-stage-live'));
    };
    // The detail shell can render before React runs PasteUpStage's passive
    // effect. Wait for its live marker (set after mountPasteUp registers the
    // ticker listener and measures the six claims) before dispatching frames.
    for (let i = 0; i < 40 && !ready(); i++) {
      await act(async () => {
        await sleep(60);
      });
    }
    if (!ready()) throw new Error(`stage did not become ready before frame driving: ${slug}`);
    await settle();
  };

  const countWindowListeners = edgeCounts(window);
  const baselineListeners = countWindowListeners();

  await render('paste-up');
  const detail = () => container.querySelector('[data-lab-detail]');

  check('B1 paste-up mounts exactly one .pu', container.querySelectorAll('.pu').length === 1,
    `${container.querySelectorAll('.pu').length} found`);
  check('B2 three boards, 18 claim boxes, 3 tabs',
    container.querySelectorAll('.pu__board').length === 3 &&
      container.querySelectorAll('.pu__slot').length === 18 &&
      container.querySelectorAll('.pu__tab').length === 3,
    `${container.querySelectorAll('.pu__board').length} boards / ${container.querySelectorAll('.pu__slot').length} slots`);
  check('B3 stage live, loading cleared, shell empty state still in the DOM',
    detail()?.hasAttribute('data-stage-live') &&
      !detail()?.hasAttribute('data-stage-loading') &&
      !!container.querySelector('.labd__empty'),
    `live=${detail()?.hasAttribute('data-stage-live')} loading=${detail()?.hasAttribute('data-stage-loading')}`);
  check('B4 index board, index tab, underline and HUD in their mounted state',
    container.querySelector('.pu__index').classList.contains('is-on') &&
      container.querySelector('.pu__tab[data-board="index"]').classList.contains('is-on') &&
      container.querySelector('[data-pu-board]').textContent === 'BOARD::INDEX' &&
      container.querySelector('.pu__tabline').style.width === '34px',
    `${container.querySelector('[data-pu-board]').textContent} line=${container.querySelector('.pu__tabline').style.transform}`);
  check('B5 one WebGL2 canvas at the 1.5 DPR cap for a 1392px field',
    container.querySelectorAll('canvas').length === 1 &&
      container.querySelector('.pu__canvas').width === Math.round((1440 - 48) * 1.5),
    `canvas=${container.querySelector('.pu__canvas')?.width}px`);

  const gl = window.__gl2;
  // The deterministic frame driver must leave six live paper planes in its
  // final captured frame; an earlier populated frame is not enough.
  const drawn = gl.frames.at(-1) ?? [];
  check('B6 six planes, six textures, premultiplied blend, one program',
    drawn.length === 6 && new Set(drawn.map((d) => d.tex)).size === 6 &&
      gl.blend?.[0] === gl.ONE && gl.blend?.[1] === gl.ONE_MINUS_SRC_ALPHA && gl.programs === 1,
    `${drawn.length} draws, blend=${JSON.stringify(gl.blend)}, frameCounts=${gl.frames.slice(-8).map((frame) => frame.length).join(',')}, textures=${gl.uploads.length}, tickerFrame=${appGsap.ticker.frame}, tickerListeners=${appGsap.ticker._listeners.map((fn) => fn.name || fn.toString().slice(0, 50)).join('|')}`);

  // the placeholder grid is what a visitor sees before the photographs decode
  const gridStrokes = window.__grid?.ops?.stroke ?? 0;
  check('B7 placeholder grid textures are drawn from the frame ink',
    window.__grid?.canvas?.[0] === 540 && window.__grid?.canvas?.[1] === 720 && gridStrokes > 0 &&
      window.__grid?.ops?.strokes?.every((s) => s[0] === '#f2f1ee'),
    `canvas=${window.__grid?.canvas?.join('x')} strokes=${gridStrokes} ink=${window.__grid?.ops?.strokes?.[0]?.[0]}`);

  // ---- interactions through the real DOM ----
  await click(window, container.querySelector('.pu__tab[data-board="spread"]'));
  await settle(400);
  check('B8 spread tab: board, tab, underline and HUD all follow',
    container.querySelector('.pu__spread').classList.contains('is-on') &&
      !container.querySelector('.pu__index').classList.contains('is-on') &&
      container.querySelector('.pu__tab[data-board="spread"]').classList.contains('is-on') &&
      container.querySelector('[data-pu-board]').textContent === 'BOARD::SPREAD' &&
      container.querySelector('.pu__tabline').style.transform === 'translate3d(42px, 0, 0)',
    `${container.querySelector('[data-pu-board]').textContent} ${container.querySelector('.pu__tabline').style.transform}`);

  await click(window, container.querySelector('.pu__spread .pu__rail [data-print="p5"]'));
  await settle(400);
  check('B9 a rail print claims the plate',
    container.querySelector('.pu__spread .pu__slot').dataset.print === 'p5' &&
      container.querySelector('.pu__spread [data-pu-board]') === null,
    container.querySelector('.pu__spread .pu__slot').dataset.print);

  const enterEvent = await key(window, container.querySelector('.pu__spread [data-print="p5"]'), 'Enter');
  await settle(300);
  check('B10 Enter on the plate returns to the index and is consumed',
    enterEvent === true && container.querySelector('.pu__index').classList.contains('is-on'),
    `prevented=${enterEvent}`);

  await click(window, container.querySelector('.pu__index [data-print="p2"]'));
  await settle(400);
  check('B11 an index print opens the spread as its plate',
    container.querySelector('.pu__spread').classList.contains('is-on') &&
      container.querySelector('.pu__spread .pu__slot').dataset.print === 'p2',
    container.querySelector('.pu__spread .pu__slot').dataset.print);

  // ---- route away → return, six times ----
  const baselineObservers = window.__observers.size;
  const listenersWithEngine = countWindowListeners();
  for (let i = 0; i < 6; i++) {
    await render('heart');
    await render('paste-up');
  }
  check('B12 six route round-trips leave exactly one .pu', container.querySelectorAll('.pu').length === 1,
    `${container.querySelectorAll('.pu').length} found`);
  check('B13 no duplicated canvas, slots or tabs after 12 route changes',
    container.querySelectorAll('.pu__canvas').length === 1 &&
      container.querySelectorAll('.pu__slot').length === 18 &&
      container.querySelectorAll('.pu__tab').length === 3,
    `${container.querySelectorAll('.pu__canvas').length} canvas / ${container.querySelectorAll('.pu__slot').length} slots`);
  check('B14 one ResizeObserver per live engine, no accumulation',
    window.__observers.size === baselineObservers, `${baselineObservers} live -> ${window.__observers.size}`);
  check('B15 window listeners do not accumulate across route changes',
    countWindowListeners() === listenersWithEngine,
    `${listenersWithEngine} with one engine -> ${countWindowListeners()}`);
  check('B16 every destroyed engine released its GL context',
    window.__lostContexts >= 6, `${window.__lostContexts} releases after 6 remounts`);

  // ---- other engines remain isolated from Paste-Up; jsdom capability varies ----
  const placeholders = {};
  for (const slug of ['live-cursors', 'threejs-test', 'dynamic-scrollbar', 'vocal-orb']) {
    await render(slug);
    placeholders[slug] = {
      pu: container.querySelectorAll('.pu').length,
      live: detail()?.hasAttribute('data-stage-live'),
      empty: !!container.querySelector('.labd__empty'),
    };
  }
  check('B17 four other experiment routes do not leak Paste-Up and retain fallback DOM',
    Object.values(placeholders).every((p) => p.pu === 0 && p.empty), JSON.stringify(placeholders));
  check('B17b Live Cursors and Vocal Orb set their live-stage marker',
    placeholders['live-cursors'].live && placeholders['vocal-orb'].live,
    JSON.stringify({ liveCursors: placeholders['live-cursors'], vocalOrb: placeholders['vocal-orb'] }));

  // ---- the ported engines are untouched ----
  const ported = {};
  for (const slug of ['polka-dots', 'heart', 'rotating-gallery', 'dial', 'paste-up']) {
    await render(slug);
    ported[slug] = {
      pu: container.querySelectorAll('.pu').length,
      dial: container.querySelectorAll('.dial').length,
      rg: container.querySelectorAll('.rg').length,
      pd: container.querySelectorAll('.pd').length,
      live: detail()?.hasAttribute('data-stage-live'),
    };
  }
  check('B18 each ported route mounts only its own engine',
    ported['polka-dots'].pu === 0 && ported['polka-dots'].pd === 1 &&
      ported.heart.pu === 0 && ported['rotating-gallery'].pu === 0 && ported['rotating-gallery'].rg === 1 &&
      ported.dial.pu === 0 && ported.dial.dial === 1 &&
      ported['paste-up'].pu === 1 && ported['paste-up'].live,
    JSON.stringify(ported));

  const pasteUpErrors = errors.filter((message) => /paste-up/i.test(message));
  check('B19 no paste-up error reached the console during the run', pasteUpErrors.length === 0,
    `${errors.length} console errors total, ${pasteUpErrors.length} paste-up: ${pasteUpErrors.slice(0, 2).join(' | ') || 'none'}`);

  await act(async () => root.unmount());
  check('B20 unmount removes every .pu', container.querySelectorAll('.pu').length === 0,
    `${container.querySelectorAll('.pu').length} left`);
  check('B21 unmount disconnects every ResizeObserver', window.__observers.size === 0,
    `${window.__observers.size} still observing`);
  check('B22 unmount releases every window listener',
    countWindowListeners() === baselineListeners, `${baselineListeners} before -> ${countWindowListeners()} after`);

  console.error = originalError;
  dom.window.close();
}

/* -------------------------------------------------------------------------- */
/* C. Server-rendered markup: stages own their DOM, so all render null.       */
/* -------------------------------------------------------------------------- */

async function ssrChecks(server) {
  const { default: LabDetailPage } = await server.ssrLoadModule('/src/carter/pages/lab/LabDetailPage.jsx');
  const { LAB_ITEMS } = await server.ssrLoadModule('/src/carter/data/lab.js');
  const rows = LAB_ITEMS.map((item) => {
    const markup = renderToStaticMarkup(createElement(LabDetailPage, { slug: item.slug }));
    const dom = new JSDOM(markup);
    const doc = dom.window.document;
    const row = {
      slug: item.slug,
      pu: !!doc.querySelector('.pu'),
      canvas: !!doc.querySelector('.pu__canvas'),
      empty: !!doc.querySelector('.labd__empty'),
      live: !!doc.querySelector('[data-stage-live]'),
      codeBlocks: doc.querySelectorAll('[data-docs-pane="code"] .expressive-code').length,
      experiment: doc.querySelector('[data-lab-detail]')?.getAttribute('data-experiment'),
    };
    dom.window.close();
    return row;
  });
  check('C1 all nine routes render server-side with no engine DOM and populated Code panes',
    rows.length === 9 && rows.every((r) => !r.pu && !r.canvas && !r.live && r.empty && r.codeBlocks > 0 && r.experiment === r.slug),
    rows.map((r) => `${r.slug}:pu=${r.pu} code=${r.codeBlocks}`).join(' '));
}

/* -------------------------------------------------------------------------- */
/* Run.                                                                       */
/* -------------------------------------------------------------------------- */

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const portModule = await import('./paste-up.port.mjs');

try {
  await equivalence();
  await fallbackPath();
  // Section B mounts the React stage and advances Vite SSR's GSAP ticker
  // deterministically from the jsdom frame loop.
  await integrationPath(server);
  await ssrChecks(server);
} finally {
  await server.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) console.log('FAILED:', failed.map((f) => f.name).join('; '));
process.exit(failed.length ? 1 : 0);
