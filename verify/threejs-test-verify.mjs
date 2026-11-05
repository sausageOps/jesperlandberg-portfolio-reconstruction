/**
 * Phase 5G verification — original Carter ThreeJs Scene vs the Jesper port.
 *
 *   CARTER_REF=/tmp/carter node verify/threejs-test-verify.mjs
 *
 * Scratch tooling; nothing in `src/` imports it and Vite never bundles it.
 * jsdom is installed ad hoc for this directory only (not in package.json).
 *
 * Section A mounts Carter's ORIGINAL `app/lib/experiments/threejs-test.js`
 * (read-only checkout, imports rewritten at run time — Carter's code is never
 * vendored here) and the ported engine side by side in separate jsdom windows.
 * Both get the same jsdom + a recording WebGL2 context, the same stubbed
 * layout, the same local `Lantern.glb` bytes (fetched through a stubbed
 * `fetch`, so no network), the same `createImageBitmap` stub and the same
 * deterministic random source. Both are then driven through the same subject
 * and render-mode clicks, the same `set()` config calls, the same resize and a
 * teardown, and every derived value is compared.
 *
 * Section B runs the real integration path
 * (`CarterRoute -> LabDetailPage -> ThreeJsTestStage -> engine`) in React and
 * checks mount, stage flags, DOM shape, the other routes staying placeholder,
 * and repeated route-change cleanup.
 *
 * Limits: jsdom has no layout, no CSS, no GPU and no image decoding, and the
 * WebGL context here is a stub. Nothing here proves how the scene LOOKS. This
 * is numeric, structural and lifecycle verification only.
 */
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import * as react from 'react';
import { compareSnapshots } from './harness.mjs';

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

const GLB_PATH =
  process.env.LANTERN_GLB ||
  '/tmp/gltf-lantern/Models/Lantern/glTF-Binary/Lantern.glb';
if (!fs.existsSync(GLB_PATH)) {
  throw new Error(
    `Lantern.glb not found at ${GLB_PATH}. Sparse-clone KhronosGroup/glTF-Sample-Assets ` +
      '(Models/Lantern/glTF-Binary/Lantern.glb @ 2bac6f8c) into /tmp or set LANTERN_GLB.',
  );
}
const GLB_BYTES = fs.readFileSync(GLB_PATH);

/* -------------------------------------------------------------------------- */
/* Recording WebGL context.                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Deterministic GL constant table: every constant three asks for gets a stable
 * id, and `getParameter` recognises the ones three's capability/state setup
 * actually reads. Draw calls and buffer/geometry uploads are recorded so two
 * independent runs can be compared.
 */
const round3 = (v) => (typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : v);

function makeGL(record) {
  const BY_NAME = new Map();
  const BY_ID = new Map();
  let nextId = 0x2000;
  const constId = (name) => {
    if (!BY_NAME.has(name)) {
      const id = nextId++;
      BY_NAME.set(name, id);
      BY_ID.set(id, name);
    }
    return BY_NAME.get(name);
  };
  const PARAMS = {
    VERSION: 'WebGL 2.0 (stub)',
    SHADING_LANGUAGE_VERSION: 'WebGL GLSL ES 3.00 (stub)',
    VENDOR: 'stub',
    RENDERER: 'stub',
    MAX_TEXTURE_SIZE: 16384,
    MAX_CUBE_MAP_TEXTURE_SIZE: 16384,
    MAX_TEXTURE_IMAGE_UNITS: 32,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 32,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 32,
    MAX_VERTEX_ATTRIBS: 16,
    MAX_VERTEX_UNIFORM_VECTORS: 4096,
    MAX_FRAGMENT_UNIFORM_VECTORS: 4096,
    MAX_VARYING_VECTORS: 31,
    MAX_RENDERBUFFER_SIZE: 16384,
    MAX_SAMPLES: 4,
    MAX_COLOR_ATTACHMENTS: 8,
    MAX_DRAW_BUFFERS: 8,
    MAX_3D_TEXTURE_SIZE: 2048,
    MAX_ARRAY_TEXTURE_LAYERS: 2048,
    MAX_UNIFORM_BUFFER_BINDINGS: 24,
    MAX_UNIFORM_BLOCK_SIZE: 65536,
    MAX_TEXTURE_MAX_ANISOTROPY_EXT: 16,
    UNMASKED_VENDOR_WEBGL: 'stub',
    UNMASKED_RENDERER_WEBGL: 'stub renderer',
    ALIASED_LINE_WIDTH_RANGE: new Float32Array([1, 1]),
    ALIASED_POINT_SIZE_RANGE: new Float32Array([1, 1024]),
    VIEWPORT: new Int32Array([0, 0, 300, 150]),
    SCISSOR_BOX: new Int32Array([0, 0, 300, 150]),
  };
  let id = 1;
  const base = {
    getParameter(p) {
      const name = BY_ID.get(p);
      if (name && name in PARAMS) return PARAMS[name];
      if (name && name.startsWith('MAX_')) return 16;
      return 0;
    },
    getExtension(name) {
      if (name === 'WEBGL_debug_renderer_info') {
        return {
          UNMASKED_VENDOR_WEBGL: constId('UNMASKED_VENDOR_WEBGL'),
          UNMASKED_RENDERER_WEBGL: constId('UNMASKED_RENDERER_WEBGL'),
        };
      }
      if (name === 'EXT_texture_filter_anisotropic') {
        return {
          MAX_TEXTURE_MAX_ANISOTROPY_EXT: constId('MAX_TEXTURE_MAX_ANISOTROPY_EXT'),
          TEXTURE_MAX_ANISOTROPY_EXT: constId('TEXTURE_MAX_ANISOTROPY_EXT'),
        };
      }
      if (
        name === 'EXT_color_buffer_float' ||
        name === 'EXT_color_buffer_half_float' ||
        name === 'OES_texture_float_linear'
      ) {
        return {};
      }
      return null;
    },
    getSupportedExtensions() {
      return ['EXT_color_buffer_float', 'EXT_texture_filter_anisotropic', 'OES_texture_float_linear'];
    },
    getShaderPrecisionFormat() {
      return { precision: 23, rangeMin: 127, rangeMax: 127 };
    },
    getProgramParameter(target, p) {
      const name = BY_ID.get(p);
      if (name === 'LINK_STATUS' || name === 'VALIDATE_STATUS') return true;
      return 0;
    },
    getShaderParameter(target, p) {
      return BY_ID.get(p) === 'COMPILE_STATUS' ? true : 0;
    },
    getShaderInfoLog() {
      return '';
    },
    getProgramInfoLog() {
      return '';
    },
    getActiveUniform() {
      return { name: 'x', size: 1, type: constId('FLOAT') };
    },
    getActiveAttrib() {
      return { name: 'x', size: 1, type: constId('FLOAT') };
    },
    getUniformLocation() {
      return { __loc: id++ };
    },
    getAttribLocation() {
      return 0;
    },
    checkFramebufferStatus() {
      return constId('FRAMEBUFFER_COMPLETE');
    },
    getError() {
      return constId('NO_ERROR');
    },
    isContextLost() {
      return false;
    },
    getContextAttributes() {
      return { alpha: true, antialias: true, depth: true, stencil: false, premultipliedAlpha: true };
    },
    uniformMatrix4fv(location, transpose, value) {
      record.uniforms.push(['m4', Array.from(value, (v) => Math.round(v * 1e5) / 1e5)]);
    },
    uniformMatrix3fv(location, transpose, value) {
      record.uniforms.push(['m3', Array.from(value, (v) => Math.round(v * 1e5) / 1e5)]);
    },
    uniform3f(location, x, y, z) {
      record.uniforms.push(['v3', [round3(x), round3(y), round3(z)]]);
    },
    uniform4f(location, x, y, z, w) {
      record.uniforms.push(['v4', [round3(x), round3(y), round3(z), round3(w)]]);
    },
    uniform2f(location, x, y) {
      record.uniforms.push(['v2', [round3(x), round3(y)]]);
    },
    uniform1f(location, x) {
      record.uniforms.push(['f', round3(x)]);
    },
    drawArrays(mode, first, count) {
      record.draws.push(`${BY_ID.get(mode)}:${first}:${count}`);
    },
    drawElements(mode, count, type, offset) {
      record.draws.push(`${BY_ID.get(mode)}:${count}:${offset}`);
    },
    bufferData(target, data) {
      const size = typeof data === 'number' ? data : (data?.byteLength ?? 0);
      record.bufferBytes += size;
      record.bufferCalls += 1;
    },
    texImage2D(...args) {
      record.texImages += 1;
      record.texSizes.push(args.findLast?.((a) => typeof a === 'number') ?? 0);
    },
    texImage3D() {
      record.texImages += 1;
    },
  };
  const cache = new Map();
  return new Proxy(base, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop !== 'string') return undefined;
      if (/^[A-Z0-9_]+$/.test(prop)) return constId(prop);
      if (!cache.has(prop)) {
        cache.set(prop, (...args) => {
          if (prop.startsWith('create')) return { __id: id++ };
          void args;
          return undefined;
        });
      }
      return cache.get(prop);
    },
  });
}

/* -------------------------------------------------------------------------- */
/* jsdom window with a stubbed stage.                                         */
/* -------------------------------------------------------------------------- */

function makeWindow({ width, height, reducedMotion = 'no-preference', gl = true, destroyGL = true } = {}) {
  const dom = new JSDOM(
    '<!doctype html><html><head><style>:root{--ink:#f2f1ee;--ink-muted:#f7f7f780}</style></head>' +
      '<body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'http://localhost/' },
  );
  const { window } = dom;
  const stage = { width, height };
  window.__stage = stage;
  // jsdom reports 1; a real retina laptop reports 2, which is the engine's cap
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 2 });

  // `.tj` fills `[data-experiment-viewport]`; jsdom has no layout, so size the
  // stage from the requested viewport the way the CSS would.
  const sized = (el) => el.classList?.contains('tj') || el.classList?.contains('labd__viewport') || el.classList?.contains('sb__scroll');
  Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return sized(this) ? stage.width : 0;
    },
  });
  Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return sized(this) ? stage.height : 0;
    },
  });
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    const w = sized(this) ? stage.width : 0;
    const h = sized(this) ? stage.height : 0;
    return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: h, width: w, height: h };
  };
  // segmented-control metrics, as the browser would report them
  const segWidth = (el) => (el.dataset?.subject ? 62 : el.dataset?.mode ? 66 : 0);
  const segLeft = (el) => {
    const list = el.dataset?.subject
      ? [...el.parentNode.querySelectorAll('[data-subject]')]
      : [...el.parentNode.querySelectorAll('[data-mode]')];
    const i = list.indexOf(el);
    return i < 0 ? 0 : i * segWidth(el);
  };
  Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return segWidth(this) || 0;
    },
  });
  Object.defineProperty(window.HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get() {
      return segLeft(this) || 0;
    },
  });

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

  // observers
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
  const intersectionObservers = new Set();
  window.IntersectionObserver = class IntersectionObserver {
    constructor(cb) {
      this.cb = cb;
      this.targets = new Set();
      intersectionObservers.add(this);
    }
    observe(target) {
      this.targets.add(target);
      queueMicrotask(() => {
        if (this.targets.has(target)) this.cb([{ isIntersecting: true, target }], this);
      });
    }
    unobserve(target) {
      this.targets.delete(target);
    }
    disconnect() {
      this.targets.clear();
      intersectionObservers.delete(this);
    }
  };
  window.__intersectionObservers = intersectionObservers;

  const mutations = new Set();
  const Mutation = window.MutationObserver;
  window.MutationObserver = class MutationObserver extends Mutation {
    constructor(cb) {
      super(cb);
      mutations.add(this);
    }
    disconnect() {
      mutations.delete(this);
      super.disconnect();
    }
  };
  window.__mutations = mutations;

  // GL context (one per window, shared by canvas + PMREM + matcap)
  const record = { draws: [], uniforms: [], bufferBytes: 0, bufferCalls: 0, texImages: 0, texSizes: [] };
  window.__gl = gl ? makeGL(record) : null;
  window.__glRecord = record;
  window.HTMLCanvasElement.prototype.getContext = function (type) {
    if (!gl) return null;
    if (type === 'webgl2' || type === 'webgl') return window.__gl;
    return null;
  };

  // `createImageBitmap` drives GLTFLoader's ImageBitmapLoader path
  window.__bitmaps = 0;
  window.createImageBitmap = () => {
    window.__bitmaps += 1;
    return Promise.resolve({ width: 256, height: 256, close() {} });
  };

  // deterministic fetch: the local Lantern.glb, plus the stubbed object URLs.
  // three's FileLoader builds a `Request`; jsdom has no fetch stack, so the
  // request objects are stubs and only the URL + body bytes matter here.
  const fetches = [];
  window.__fetches = fetches;
  window.Headers = class Headers {
    constructor(init = {}) {
      this.map = new Map(Object.entries(init));
    }
    get(name) {
      return this.map.get(name) ?? null;
    }
    set(name, value) {
      this.map.set(name, value);
    }
    append(name, value) {
      this.map.set(name, value);
    }
    has(name) {
      return this.map.has(name);
    }
  };
  window.Request = class Request {
    constructor(url) {
      this.url = url;
    }
  };
  window.fetch = (input) => {
    const url = typeof input === 'string' ? input : (input?.url ?? '');
    fetches.push(url);
    const body = GLB_BYTES.buffer.slice(GLB_BYTES.byteOffset, GLB_BYTES.byteOffset + GLB_BYTES.byteLength);
    return Promise.resolve(
      new Response(body, {
        status: 200,
        headers: { 'Content-Length': String(GLB_BYTES.byteLength) },
      }),
    );
  };
  window.URL.createObjectURL = () => 'blob:stub';
  window.URL.revokeObjectURL = () => {};

  // manual frame queue
  const queue = new Map();
  let rafId = 0;
  window.requestAnimationFrame = (cb) => {
    queue.set(++rafId, cb);
    return rafId;
  };
  window.cancelAnimationFrame = (key) => queue.delete(key);
  window.__rafCallbacks = queue;
  window.performance.now = () => window.__now ?? 0;

  // three's WebGLAnimation binds to `self`; keep it pointable at this window
  window.self = window;

  // The other ported engines use browser media and visibility APIs in route tests.
  // Keep media playback inert while preserving EventTarget listener/abort semantics.
  window.Audio = class Audio extends window.EventTarget {
    constructor(src) {
      super();
      this.src = src ?? '';
      this.paused = true;
      this.currentTime = 0;
      this.duration = 90;
      this.volume = 1;
    }
    play() {
      return Promise.reject(new Error('no audio in jsdom'));
    }
    pause() { this.paused = true; }
    load() {}
  };

  return { dom, window, stage, observers, record };
}

const SCOPE_KEYS = [
  'window', 'self', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent',
  'KeyboardEvent', 'CustomEvent', 'DocumentFragment', 'HTMLCanvasElement', 'HTMLImageElement',
  'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLAnchorElement', 'SVGElement', 'Audio',
  'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'AbortController', 'AbortSignal', 'matchMedia', 'Image',
  'devicePixelRatio', 'requestAnimationFrame', 'cancelAnimationFrame', 'fetch', 'createImageBitmap',
  'Blob', 'Response', 'Headers', 'Request', 'URL', 'performance', 'ProgressEvent',
  'ReadableStream', 'WritableStream', 'TransformStream', 'atob', 'btoa',
];

/**
 * Point the bare realm at `win` and LEAVE it there.
 *
 * Carter's engine and three both read bare globals (`document`,
 * `requestAnimationFrame`, `self`) at call time, and GLTFLoader's promise
 * continuations run long after the call that started them. So the harness
 * switches the realm to the window it is about to touch instead of scoping it:
 * call `activate(win)` before mounting, clicking, dispatching or stepping that
 * window's frames. Two engines therefore never run at the same instant, which
 * is exactly what the interleaved stepping below does.
 */
function activate(win) {
  for (const key of SCOPE_KEYS) {
    const fromWindow = win[key];
    // jsdom has no Response/ReadableStream/URL.createObjectURL etc. Keep Node's
    // implementations for anything the window cannot provide.
    const value = key === 'devicePixelRatio' ? 2 : fromWindow === undefined ? globalThis[key] : fromWindow;
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  globalThis.getComputedStyle = (el, pseudo) =>
    (el?.ownerDocument?.defaultView ?? win).getComputedStyle(el, pseudo);
}

const inScope = async (win, fn) => {
  activate(win);
  return fn();
};

/** Drive one window's own rAF queue, so both engines see identical timestamps. */
async function stepFrames(win, count, ms = 16.667) {
  activate(win);
  for (let i = 0; i < count; i++) {
    win.__now = (win.__now ?? 0) + ms;
    const due = [...win.__rafCallbacks.values()];
    win.__rafCallbacks.clear();
    for (const cb of due) cb(win.__now);
    await FLUSH();
  }
}

async function stepBoth(windows, count, ms = 16.667) {
  for (const win of windows) await stepFrames(win, count, ms);
}

/* -------------------------------------------------------------------------- */
/* Carter's original engine, derived at run time (never vendored).            */
/* -------------------------------------------------------------------------- */

let originalModule = null;

async function loadOriginal() {
  if (originalModule) return originalModule;
  const file = path.join(CARTER_REF, 'app/lib/experiments/threejs-test.js');
  const source = fs.readFileSync(file, 'utf8');
  const threeUrl = pathToFileURL(path.join(process.cwd(), 'node_modules/three/build/three.module.js')).href;
  const gltfUrl = pathToFileURL(
    path.join(process.cwd(), 'node_modules/three/examples/jsm/loaders/GLTFLoader.js'),
  ).href;
  // Carter's RoomEnvironment chunk is r185; the harness resolves it to the port's
  // inlined copy so the comparison isolates the experiment code itself.
  const roomUrl = pathToFileURL(path.join(process.cwd(), 'verify/threejs-test.port.mjs')).href;

  const rewritten = source
    .replace(
      /import\{([^}]*)\}from"\.\.\/\.\.\/\.\.\/src\/three\.module\.DBbmgHoE\.js";/,
      (match, names) => {
        // Carter's minified local bindings -> three's real export names
        const map = {
          At: 'Spherical', C: 'Group', G: 'MathUtils', It: 'Triangle', J: 'Mesh', L: 'LinearFilter',
          Mt: 'TOUCH', Q: 'MeshPhysicalMaterial', Rt: 'Vector2', U: 'MOUSE', Ut: 'WebGLRenderTarget',
          Y: 'MeshBasicMaterial', Z: 'MeshMatcapMaterial', _: 'Controls', _t: 'Ray',
          bt: 'SRGBColorSpace', ct: 'PerspectiveCamera', ft: 'Points', ht: 'Quaternion',
          kt: 'SphereGeometry', l: 'BufferAttribute', lt: 'Plane', n: 'WebGLRenderer',
          ot: 'OrthographicCamera', pt: 'PointsMaterial', s: 'Box3', t: 'PMREMGenerator',
          u: 'BufferGeometry', xt: 'Scene', y: 'DirectionalLight', zt: 'Vector3',
        };
        const mapped = names
          .split(',')
          .map((entry) => {
            const [exported, local] = entry.split(' as ').map((part) => part.trim());
            const real = map[exported];
            if (!real) throw new Error(`no three mapping for Carter binding ${exported}`);
            return `${real} as ${local}`;
          })
          .join(',');
        return `import{${mapped}}from${JSON.stringify(threeUrl)};`;
      },
    )
    .replace(/import\{t as (\w+)\}from"\.\.\/\.\.\/\.\.\/src\/GLTFLoader\.BD7CsO-c\.js";/, `import{GLTFLoader as $1}from${JSON.stringify(gltfUrl)};`)
    .replace(/import\{t as (\w+)\}from"\.\.\/\.\.\/\.\.\/src\/RoomEnvironment\.CsPbsEjR\.js";/, (m, local) => `function ${local}(...args){return new globalThis.__carterRoomEnvironment(...args);}`);
  if (rewritten.includes('../../../src/')) {
    throw new Error('could not rewrite every Carter chunk import in threejs-test.js');
  }
  void roomUrl;
  const out = path.join(os.tmpdir(), `carter-threejs-test-original-${process.pid}.mjs`);
  fs.writeFileSync(out, rewritten);
  originalModule = await import(pathToFileURL(out).href);
  return originalModule;
}

/* -------------------------------------------------------------------------- */
/* Snapshot.                                                                  */
/* -------------------------------------------------------------------------- */

const round = (v) => (typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : v);
const roundAll = (arr) => Array.from(arr, round);

function cameraFacts(win) {
  const tj = win.document.querySelector('.tj');
  const canvas = tj?.querySelector('canvas');
  return {
    canvas: canvas ? [canvas.width, canvas.height, canvas.style.width, canvas.style.height] : null,
    draws: win.__glRecord.draws.length,
    bufferCalls: win.__glRecord.bufferCalls,
    bufferBytes: win.__glRecord.bufferBytes,
    // The last frame's uniform uploads: model-view/projection matrices, node
    // transforms, material colour/opacity and camera-derived values. This is the
    // numeric stand-in for "the same picture" without a rasteriser.
    uniforms: win.__glRecord.uniforms.slice(-600),
  };
}

/**
 * Everything the experiment renders as DOM, plus the derived stage state a
 * reader can observe: loading mark, ready flag, pressed segments and the pill
 * geometry the engine writes by hand.
 */
function snapshot(win) {
  const tj = win.document.querySelector('.tj');
  if (!tj) return null;
  const segs = (attr) => [...tj.querySelectorAll(`[data-${attr}]`)];
  const pill = (attr) => tj.querySelector(`[data-${attr}-pill]`);
  const style = (el) => [el.style.width, el.style.transform];
  return {
    ready: tj.hasAttribute('data-ready'),
    loading: !!tj.querySelector('.tj__loading'),
    loadingOpacityRule: !!win.document.querySelector('.tj[data-ready] .tj__loading'),
    bars: tj.querySelectorAll('.tj__modes').length,
    subject: segs('subject').map((el) => [el.dataset.subject, el.getAttribute('aria-pressed'), el.textContent]),
    mode: segs('mode').map((el) => [el.dataset.mode, el.getAttribute('aria-pressed'), el.textContent]),
    subjectPill: style(pill('subject')),
    modePill: style(pill('mode')),
    groups: tj.querySelectorAll('canvas').length,
    ...cameraFacts(win),
  };
}

/**
 * The scene graph is not exposed by either engine, so the harness reads the
 * GPU traffic instead: `drawArrays`/`drawElements` calls and the total bytes
 * pushed through `bufferData`. Two identical scenes issue the same calls.
 */
function traffic(win) {
  return {
    draws: win.__glRecord.draws.slice(),
    bufferBytes: win.__glRecord.bufferBytes,
    bufferCalls: win.__glRecord.bufferCalls,
    texImages: win.__glRecord.texImages,
    fetches: win.__fetches.slice(),
    bitmaps: win.__bitmaps,
  };
}

/** The GL channel, without the fetch/bitmap counters (see A3's note). */
function glTraffic(win) {
  const t = traffic(win);
  delete t.fetches;
  delete t.bitmaps;
  return t;
}

/* -------------------------------------------------------------------------- */
/* A. Original vs port.                                                       */
/* -------------------------------------------------------------------------- */

async function mountBoth(vp, { reducedMotion = 'no-preference', gl = true } = {}) {
  const a = makeWindow({ ...vp, reducedMotion, gl });
  const b = makeWindow({ ...vp, reducedMotion, gl });

  const original = await loadOriginal();
  // Carter's standalone RoomEnvironment equivalent, taken from the port so the
  // r185 -> r180 difference is not part of this comparison.
  const port = await import(pathToFileURL(path.join(process.cwd(), 'verify/threejs-test.port.mjs')).href);

  const hostA = a.window.document.createElement('div');
  hostA.classList.add('labd__viewport');
  a.window.document.body.appendChild(hostA);
  const hostB = b.window.document.createElement('div');
  hostB.classList.add('labd__viewport');
  b.window.document.body.appendChild(hostB);

  globalThis.__carterRoomEnvironment = await loadCarterRoom(a.window);

  const instanceA = await inScope(a.window, () => original.default.mount(hostA));
  const readyA = await settleModel([a.window]);

  const instanceB = await inScope(b.window, () => {
    port.bindCarterRuntime({ root: hostB, navigate: () => {}, appReady: true });
    return port.mountThreeJsTest(hostB);
  });
  const readyB = await settleModel([b.window]);

  return { a, b, instanceA, instanceB, hostA, hostB, port, readyA, readyB };
}

/**
 * Carter's `RoomEnvironment` chunk (r185) — its `.js` is a one-class module over
 * three's core exports. Load it from the read-only checkout by rewriting the one
 * import to Jesper's `three`, so the comparison keeps Carter's own numbers.
 */
async function loadCarterRoom(win) {
  const file = path.join(CARTER_REF, 'src/RoomEnvironment.CsPbsEjR.js');
  const source = fs.readFileSync(file, 'utf8');
  const threeUrl = pathToFileURL(path.join(process.cwd(), 'node_modules/three/build/three.module.js')).href;
  const map = {
    $: 'MeshStandardMaterial', D: 'InstancedMesh', J: 'Mesh', X: 'MeshLambertMaterial',
    at: 'Object3D', c: 'BoxGeometry', dt: 'PointLight', xt: 'Scene',
  };
  const rewritten = source.replace(/import\{([^}]*)\}from"\.\/three\.module\.DBbmgHoE\.js";/, (m, names) =>
    `import{${names
      .split(',')
      .map((entry) => {
        const [exported, local] = entry.split(' as ').map((part) => part.trim());
        const real = map[exported];
        if (!real) throw new Error(`no three mapping for RoomEnvironment binding ${exported}`);
        return `${real} as ${local}`;
      })
      .join(',')}}from${JSON.stringify(threeUrl)};`,
  );
  const out = path.join(os.tmpdir(), `carter-room-environment-${process.pid}.mjs`);
  fs.writeFileSync(out, rewritten);
  const module = await inScope(win, () => import(pathToFileURL(out).href));
  return module.t;
}

const seg = (win, attr, id) => win.document.querySelector(`[data-${attr}="${id}"]`);

async function click(win, el) {
  if (!el) throw new Error('click target missing');
  await inScope(win, () => {
    el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

async function teardown(both) {
  const { a, b, instanceA, instanceB, hostB, port } = both;
  await inScope(b.window, () => {
    instanceB?.destroy?.();
    port.destroyAll();
    port.unbindCarterRuntime(hostB);
  });
  if (typeof instanceA === 'function') instanceA();
  else instanceA?.destroy?.();
  const gone = !a.window.document.querySelector('.tj') && !b.window.document.querySelector('.tj');
  const state = {
    raf: [a.window.__rafCallbacks.size, b.window.__rafCallbacks.size],
    observers: [a.window.__observers.size, b.window.__observers.size],
    mutations: [a.window.__mutations.size, b.window.__mutations.size],
  };
  const clean = state.raf[0] === 0 && state.raf[1] === 0 && state.observers[0] === 0 &&
    state.observers[1] === 0 && state.mutations[0] === 0 && state.mutations[1] === 0;
  a.dom.window.close();
  b.dom.window.close();
  return { gone, clean, state };
}

const cmpNote = (cmp) => (cmp.equal ? '' : ` | ${cmp.structural.slice(0, 6).join(' | ')}`);

/** Wait for the GLTF parse (async, promise-driven) without wall-clock flakiness. */
async function settleModel(windows) {
  for (let i = 0; i < 200; i++) {
    await stepBoth(windows, 1);
    const ready = windows.every((win) => win.document.querySelector('.tj')?.hasAttribute('data-ready'));
    if (ready) return true;
    await sleep(4);
  }
  return windows.every((win) => win.document.querySelector('.tj')?.hasAttribute('data-ready'));
}

async function equivalence() {
  for (const vp of VIEWPORTS) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const tag = `${vp.label}${reducedMotion === 'reduce' ? ' [reduced]' : ''}`;
      const both = await mountBoth(vp, { reducedMotion });
      const windows = [both.a.window, both.b.window];

      // --- mount: DOM contract ---
      let cmp = compareSnapshots(snapshot(both.a.window), snapshot(both.b.window));
      check(`A1 mount DOM (loading mark, 5 subjects, 3 modes, pills) identical — ${tag}`,
        cmp.equal && snapshot(both.b.window).bars === 2 && snapshot(both.b.window).groups === 1,
        `canvas=${JSON.stringify(snapshot(both.b.window).canvas)}${cmpNote(cmp)}`);

      // --- model load (both were settled one at a time, see mountBoth) ---
      const ready = both.readyA && both.readyB;
      await stepBoth(windows, 2);
      cmp = compareSnapshots(snapshot(both.a.window), snapshot(both.b.window));
      check(`A2 Lantern.glb loads, ready flag and identical post-load DOM — ${tag}`,
        ready && cmp.equal && both.b.window.document.querySelector('.tj').hasAttribute('data-ready'),
        `readyA=${both.readyA} readyB=${both.readyB}${cmpNote(cmp)}`);

      // --- GLTF pipeline: same file, same textures, same geometry bytes ---
      const ta = traffic(both.a.window);
      const tb = traffic(both.b.window);
      check(`A3 GLTF fetch + geometry/texture traffic identical — ${tag}`,
        JSON.stringify(ta.fetches) === JSON.stringify(tb.fetches) &&
          ta.bitmaps === tb.bitmaps &&
          ta.texImages === tb.texImages &&
          ta.bufferCalls === tb.bufferCalls &&
          Math.abs(ta.bufferBytes - tb.bufferBytes) <= 8,
        `fetches=${tb.fetches.length} bitmaps=${tb.bitmaps} tex=${tb.texImages} buffers=${tb.bufferCalls}/${tb.bufferBytes}B${cmpNote(compareSnapshots(glTraffic(both.a.window), glTraffic(both.b.window)))}`);

      // --- render mode switch: Shaded -> Wire -> Points ---
      for (const mode of ['wire', 'points', 'shaded']) {
        await click(both.a.window, seg(both.a.window, 'mode', mode));
        await click(both.b.window, seg(both.b.window, 'mode', mode));
        await stepBoth(windows, 4);
        cmp = compareSnapshots(snapshot(both.a.window), snapshot(both.b.window));
        check(`A4 mode "${mode}" pressed state + pill identical — ${tag}`, cmp.equal,
          `pressed=${snapshot(both.b.window).mode.filter((m) => m[1] === 'true').map((m) => m[0]).join(',')}${cmpNote(cmp)}`);
      }

      // --- subject switch: Lantern -> Orb (morph) ---
      await click(both.a.window, seg(both.a.window, 'subject', 'orb'));
      await click(both.b.window, seg(both.b.window, 'subject', 'orb'));
      await stepBoth(windows, 1);
      cmp = compareSnapshots(snapshot(both.a.window), snapshot(both.b.window));
      check(`A5 subject switch to Orb, first frame identical — ${tag}`, cmp.equal,
        `subject=${snapshot(both.b.window).subject.filter((m) => m[1] === 'true').map((m) => m[0]).join(',')}${cmpNote(cmp)}`);

      await stepBoth(windows, 90);
      cmp = compareSnapshots(snapshot(both.a.window), snapshot(both.b.window));
      check(`A6 Orb morph settles identically — ${tag}`, cmp.equal,
        `maxFloatDelta=${cmp.maxDelta.toExponential(2)}${cmpNote(cmp)}`);

      // --- subject switch: Orb -> Shell (live re-sample, no morph) ---
      await click(both.a.window, seg(both.a.window, 'subject', 'shell'));
      await click(both.b.window, seg(both.b.window, 'subject', 'shell'));
      await stepBoth(windows, 40);
      cmp = compareSnapshots(snapshot(both.a.window), snapshot(both.b.window));
      check(`A7 Orb -> Shell re-sample identical — ${tag}`, cmp.equal, cmpNote(cmp));

      // --- back to the model: group swap ---
      await click(both.a.window, seg(both.a.window, 'subject', 'lantern'));
      await click(both.b.window, seg(both.b.window, 'subject', 'lantern'));
      await stepBoth(windows, 60);
      cmp = compareSnapshots(snapshot(both.a.window), snapshot(both.b.window));
      check(`A8 Shell -> Lantern group swap identical — ${tag}`, cmp.equal, cmpNote(cmp));

      // --- config: finish / polish / spin / pointSize / lobes / sharp / accent ---
      const configs = [
        ['finish', 'chrome'],
        ['polish', 0.6],
        ['spin', 2.4],
        ['pointSize', 0.04],
        ['lobes', 3],
        ['sharp', 1.8],
        ['accent', '#c54126'],
        ['finish', 'wax'],
        ['polish', -0.4],
        ['accent', 'var(--ink)'],
        ['lobes', -2],
        ['sharp', 0.5],
        ['finish', 'ink'],
      ];
      for (const [key, value] of configs) {
        both.instanceA?.set?.(key, value);
        both.instanceB?.set?.(key, value);
        await stepBoth(windows, 6);
      }
      cmp = compareSnapshots(snapshot(both.a.window), snapshot(both.b.window));
      check(`A9 set() config sweep (13 values) leaves identical state — ${tag}`, cmp.equal,
        `draws=${snapshot(both.b.window).draws}${cmpNote(cmp)}`);

      // --- resize: the ResizeObserver path ---
      for (const [w, h] of [
        [Math.round(vp.width * 0.7), vp.height + 40],
        [vp.width, vp.height],
      ]) {
        for (const win of windows) {
          win.__stage.width = w;
          win.__stage.height = h;
          await inScope(win, () => {
            for (const observer of win.__observers) observer.cb([{ target: [...observer.targets][0] }]);
          });
        }
        await stepBoth(windows, 4);
      }
      cmp = compareSnapshots(snapshot(both.a.window), snapshot(both.b.window));
      check(`A10 resize re-renders identically — ${tag}`, cmp.equal,
        `canvas=${JSON.stringify(snapshot(both.b.window).canvas)}${cmpNote(cmp)}`);

      // --- teardown ---
      const { gone, clean, state } = await teardown(both);
      // Carter's own teardown cancels the rAF handle it stored, which on the
      // animated path is one frame behind the callback that is still queued, so
      // his engine leaves exactly one pending frame per mount. The port cancels
      // after aborting and disconnects everything, so it leaves none. Both must
      // remove their DOM and every observer; only the frame queue differs, and
      // that difference is the port's documented cleanup adaptation.
      check(`A11 destroy removes .tj and every observer; the port also leaves no pending frame — ${tag}`,
        gone && state.raf[1] === 0 && state.observers[0] === 0 && state.mutations[0] === 0,
        `gone=${gone} original[raf=${state.raf[0]} observers=${state.observers[0]} mutations=${state.mutations[0]}] port[raf=${state.raf[1]} observers=${state.observers[1]} mutations=${state.mutations[1]}]`);
    }
  }

  // ---- no WebGL ----
  const vp = VIEWPORTS[0];
  const a = makeWindow({ ...vp, gl: false });
  const b = makeWindow({ ...vp, gl: false });
  const original = await loadOriginal();
  const port = await import(pathToFileURL(path.join(process.cwd(), 'verify/threejs-test.port.mjs')).href);
  globalThis.__carterRoomEnvironment = await loadCarterRoom(a.window);
  const hostA = a.window.document.createElement('div');
  hostA.classList.add('labd__viewport');
  a.window.document.body.appendChild(hostA);
  const hostB = b.window.document.createElement('div');
  hostB.classList.add('labd__viewport');
  b.window.document.body.appendChild(hostB);

  let threwA = null;
  let threwB = null;
  try {
    await inScope(a.window, () => original.default.mount(hostA));
  } catch (error) {
    threwA = error;
  }
  try {
    await inScope(b.window, () => {
      port.bindCarterRuntime({ root: hostB, navigate: () => {}, appReady: true });
      return port.mountThreeJsTest(hostB);
    });
  } catch (error) {
    threwB = error;
  }
  // Carter appends `div.tj` before constructing the renderer, so when WebGL is
  // unavailable his engine throws and leaves the loading stage stuck in the
  // DOM. The port removes it before rethrowing (documented adaptation) so the
  // Lab detail falls back to its own empty state instead of a dead spinner.
  const leftoverA = !!a.window.document.querySelector('.tj');
  const leftoverB = !!b.window.document.querySelector('.tj');
  check('A12 no WebGL: both throw; the port leaves no dead .tj behind',
    !!threwA && !!threwB && !leftoverB,
    `original="${threwA?.message?.slice(0, 40)}" leftoverOriginal=${leftoverA} | port="${threwB?.message?.slice(0, 40)}" leftoverPort=${leftoverB}`);
  await inScope(b.window, () => port.unbindCarterRuntime(hostB));
  a.dom.window.close();
  b.dom.window.close();

  // ---- destroy while the model is still loading (async resolve after unmount) ----
  const c = makeWindow({ ...vp, gl: true });
  globalThis.__carterRoomEnvironment = await loadCarterRoom(c.window);
  const hostC = c.window.document.createElement('div');
  hostC.classList.add('labd__viewport');
  c.window.document.body.appendChild(hostC);
  const late = await inScope(c.window, () => {
    port.bindCarterRuntime({ root: hostC, navigate: () => {}, appReady: true });
    return port.mountThreeJsTest(hostC);
  });
  await inScope(c.window, () => {
    late.destroy();
    port.destroyAll();
    port.unbindCarterRuntime(hostC);
  });
  const before = c.window.document.querySelectorAll('.tj').length;
  // let the in-flight load resolve against the destroyed instance
  await sleep(120);
  await stepFrames(c.window, 4);
  const after = c.window.document.querySelectorAll('.tj').length;
  let leaked = 0;
  c.window.__observers.forEach((o) => {
    leaked += o.targets.size;
  });
  check('A13 destroy mid-load leaves nothing: no DOM, no observers, no loop',
    before === 0 && after === 0 && leaked === 0 && c.window.__rafCallbacks.size === 0,
    `tj=${before}->${after} observed=${leaked} raf=${c.window.__rafCallbacks.size} draws=${c.window.__glRecord.draws.length}`);
  c.dom.window.close();
}

/* -------------------------------------------------------------------------- */
/* B. Real integration path (CarterRoute -> LabDetailPage -> ThreeJsTestStage).*/
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
  const { dom, window } = makeWindow({ width: 1440, height: 900 });
  // React and the app's three copy both read these globals; `activate` keeps
  // Node's Response/ReadableStream because jsdom provides neither.
  activate(window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const { createRoot } = await import('react-dom/client');
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

  const settle = async (frames = 20) => {
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
        await sleep(4);
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
      return detail && (slug !== 'threejs-test' || detail.hasAttribute('data-stage-live'));
    };
    // The shell commits before the lazy stage's passive effect. Wait for the
    // actual mount marker before asserting engine state or advancing frames.
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

  await render('threejs-test');
  const detail = () => container.querySelector('[data-lab-detail]');

  check('B1 threejs-test mounts exactly one .tj',
    container.querySelectorAll('.tj').length === 1,
    `${container.querySelectorAll('.tj').length} found`);

  check('B2 subject + mode segmented controls, 8 segments, 2 pills, one canvas',
    container.querySelectorAll('[data-subject]').length === 5 &&
      container.querySelectorAll('[data-mode]').length === 3 &&
      container.querySelectorAll('.tj__pill').length === 2 &&
      container.querySelectorAll('.tj > canvas').length === 1,
    `${container.querySelectorAll('[data-subject]').length} subjects / ${container.querySelectorAll('[data-mode]').length} modes`);

  check('B3 stage live, loading cleared, shell empty state still in the DOM',
    detail()?.hasAttribute('data-stage-live') &&
      !detail()?.hasAttribute('data-stage-loading') &&
      !!container.querySelector('.labd__empty'),
    `live=${detail()?.hasAttribute('data-stage-live')} loading=${detail()?.hasAttribute('data-stage-loading')}`);

  check('B4 first subject/mode pressed, loading mark present before the model lands',
    container.querySelector('[data-subject="lantern"]').getAttribute('aria-pressed') === 'true' &&
      container.querySelector('[data-mode="shaded"]').getAttribute('aria-pressed') === 'true' &&
      !!container.querySelector('.tj__loading .spin'),
    `lantern=${container.querySelector('[data-subject="lantern"]').getAttribute('aria-pressed')}`);

  const canvas = container.querySelector('.tj > canvas');
  // `setSize(w, h, false)` keeps the CSS in charge of display size (the
  // stylesheet stretches the canvas to the stage), so only the backing store is
  // asserted here: stage pixels x the 2x DPR cap.
  check('B5 canvas backing store sized from the stage at the 2x DPR cap',
    canvas.width === 1440 * 2 && canvas.height === 900 * 2,
    `canvas=${canvas.width}x${canvas.height} (css width:100%/height:100%)`);

  // model load: GLTFLoader's fetch + createImageBitmap path
  const loaded = await settle(60);
  void loaded;
  for (let i = 0; i < 100 && !container.querySelector('.tj[data-ready]'); i++) {
    await act(async () => {
      await sleep(20);
    });
    await settle(4);
  }
  check('B6 Lantern.glb resolves through the app bundle and sets data-ready',
    container.querySelector('.tj').hasAttribute('data-ready'),
    `fetches=${window.__fetches.length} bitmaps=${window.__bitmaps} tex=${window.__glRecord.texImages}`);

  // interactions
  const modeClick = (id) =>
    act(async () => {
      container.querySelector(`[data-mode="${id}"]`).dispatchEvent(
        new window.MouseEvent('click', { bubbles: true, cancelable: true }),
      );
      await sleep(10);
    });
  await modeClick('wire');
  check('B7 render-mode switch updates aria-pressed',
    container.querySelector('[data-mode="wire"]').getAttribute('aria-pressed') === 'true' &&
      container.querySelector('[data-mode="shaded"]').getAttribute('aria-pressed') === 'false',
    `wire=${container.querySelector('[data-mode="wire"]').getAttribute('aria-pressed')}`);
  await modeClick('shaded');

  await act(async () => {
    container.querySelector('[data-subject="bloom"]').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    await sleep(10);
  });
  await settle(90);
  check('B8 subject switch to Bloom runs and settles without errors',
    container.querySelector('[data-subject="bloom"]').getAttribute('aria-pressed') === 'true' && errors.length === 0,
    `errors=${errors.length}`);

  // theme change: the frame's data-theme drives re-ink
  await act(async () => {
    container.querySelector('.carter').setAttribute('data-theme', 'light');
    await sleep(30);
  });
  await settle(6);
  check('B9 data-theme flip re-inks without throwing',
    errors.length === 0,
    `${errors.length} console errors`);

  // route away and back, repeatedly: no duplicate DOM, loops or observers
  const cycle = [];
  for (let i = 0; i < 3; i++) {
    await render('dial');
    const awayClean = container.querySelectorAll('.tj').length === 0;
    await render('threejs-test');
    const back = container.querySelectorAll('.tj').length;
    cycle.push({ awayClean, back });
  }
  const listenersAfter = countWindowListeners();
  check('B10 3 route cycles leave exactly one .tj and no leaked listeners',
    cycle.every((c) => c.awayClean && c.back === 1) && listenersAfter === baselineListeners,
    `cycles=${JSON.stringify(cycle)} windowListeners=${baselineListeners}->${listenersAfter}`);

  check('B11 observers and frame callbacks are not accumulating',
    window.__observers.size <= 2 && window.__rafCallbacks.size <= 2,
    `resizeObservers=${window.__observers.size} raf=${window.__rafCallbacks.size}`);

  // Other experiment routes must remain isolated from the ThreeJs stage.
  const others = ['live-cursors', 'dynamic-scrollbar', 'vocal-orb'];
  const placeholderFacts = [];
  for (const slug of others) {
    await render(slug);
    placeholderFacts.push({
      slug,
      tj: container.querySelectorAll('.tj').length,
      live: detail()?.hasAttribute('data-stage-live') ?? null,
      empty: !!container.querySelector('.labd__empty'),
    });
  }
  check('B12 the three other experiments mount live while retaining fallback DOM and no ThreeJs stage',
    placeholderFacts.every((f) => f.tj === 0 && f.empty && f.live),
    JSON.stringify(placeholderFacts));

  await act(async () => {
    root.unmount();
    await sleep(30);
  });
  console.error = originalError;
  check('B13 unmount tears the frame down completely',
    container.querySelectorAll('.tj').length === 0 && window.__observers.size === 0 && window.__intersectionObservers.size === 0,
    `tj=${container.querySelectorAll('.tj').length} resizeObservers=${window.__observers.size} intersectionObservers=${window.__intersectionObservers.size}`);
  check('B14 no console errors across the whole integration run', errors.length === 0,
    errors.slice(0, 2).join(' | '));

  dom.window.close();
}

/* -------------------------------------------------------------------------- */

await (async () => {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });
  try {
    console.log('== Section A: Carter original vs Jesper port ==');
    await equivalence();
    console.log('\n== Section B: real integration path ==');
    await integrationPath(server);
  } finally {
    await server.close();
  }
})();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILURES:');
  for (const failure of failed) console.log(' -', failure.name, failure.detail ? `(${failure.detail})` : '');
  process.exitCode = 1;
}
