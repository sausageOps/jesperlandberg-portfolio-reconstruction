/**
 * Carter Paste-Up engine — ported from
 * `app/lib/experiments/paste-up.js` at
 * sausageOps/carterogunsola-reconstruction@3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249
 *
 * That file's body is byte-identical to the original live-site chunk
 * `src/paste-up.DESythSE.js` (only the import specifiers differ), and matches
 * the unminified listing captured in
 * `app/data/lab-restored/paste-up.code.html`.
 *
 * Preserved algorithm & interactions:
 * - Six prints (`p0` … `p5`) claimed by `data-print` on real DOM boxes across
 *   three boards — index (2×3 grid), spread (plate + 5-slot rail) and strip
 *   (six 3:4 portrait columns). The DOM lays the boxes out; one WebGL2 canvas
 *   sits above them and draws each print as a plane exactly on its box.
 * - There is no per-transition animation: `measure()` samples each claim's rect
 *   relative to `.pu__field`, and the ticker damps every plane's rect toward it
 *   at `DAMP = 0.085` per frame. Every transition is that one rule firing.
 * - Paper bow: vertex displacement `(1 − sin(π·uv)) · vel`, with per-axis
 *   velocity smoothed `0.8 / 0.2`, clamped at `48px/frame` and scaled by
 *   `BEND_SCALE = 0.4`; `bend` is forced to `0` under reduced motion.
 * - Draw order sorts planes by current speed, so a flying print passes over the
 *   parked ones. Planes draw the photograph as-is (`object-fit: cover` crop in
 *   the fragment shader), with premultiplied alpha
 *   (`blendFunc(ONE, ONE_MINUS_SRC_ALPHA)`) so the placeholder grid's
 *   transparent ground stays open.
 * - The two knobs, both real in the source: `fetch` (fake navigation latency —
 *   the old board is torn down first, planes hold still through the dwell, then
 *   fly late) and `memory` (the rect cache — with memory on, a `0×0` home from a
 *   hidden board is refused and the last rect is kept; with it off you get the
 *   collapse-to-corner then pop bug the experiment demonstrates).
 * - Tabs with one shared underline slid by `translate3d` + width, click/keyboard
 *   (`Enter` / `Space`) print selection, plate swap by attribute write, the
 *   `BOARD::…` HUD readout, mount-time `prefers-reduced-motion: reduce`
 *   snapping, `1.5` DPR cap, and the 720 → 1440 hi-res texture upgrade.
 * - No WebGL2: Carter's own degradation — the canvas is removed, the boxes get
 *   plain `<img>` and board swaps become cuts. The page still works.
 *
 * Adaptations to Jesper's runtime (same set as the approved Heart / Rotating
 * Gallery / Dial ports):
 * - Inline `document.head` `<style data-lab-style="paste-up">` injection
 *   removed — `paste-up.css` is the canonical stylesheet, scoped to `.carter`.
 * - `import { f, r, t } from "../mesh.ts"` →
 *   `f` (gsap) → `import gsap from 'gsap'`;
 *   `r` (`kd`, the procedural pencil-grid canvas texture) → inlined below as
 *   `gridTexture()`, verbatim maths, because it draws the placeholder every
 *   print shows while its photograph decodes;
 *   `t` (`Vd`, the site-wide `?mesh` wireframe-replacement singleton) → the
 *   constant `MESH_ON = false`. Carter's own default path is `MESH_ON = false`
 *   too (it is off unless `?mesh` is in the URL); Jesper's Carter frame has no
 *   mesh debug mode, so there is nothing to switch on. Nothing user-facing is
 *   dropped, and the `MESH_ON` branches below are kept in place.
 * - `import { img } from "../assets.ts"` → inline `ASSETS_ORIGIN` helper
 *   (`https://assets.carterogunsola.com`, matching `LabPage.jsx`,
 *   `data/lab.js` and the Rotating Gallery port).
 * - `getComputedStyle(document.documentElement)` for `--ink` → the Carter frame
 *   root, because the tokens live on `.carter`, not on Jesper's `<html>`.
 * - `mount(host)` receives `[data-experiment-viewport]` from the stage
 *   component; the engine appends its own `div.pu` and removes it on destroy.
 * - Lifecycle registered via `onDestroy` so `destroyAll` cleans up on route
 *   leave; `destroy()` is idempotent and aborts every listener through one
 *   `AbortController`, disconnects the `ResizeObserver`, removes the ticker
 *   callback, clears the `fetch` timer, releases the GL context and removes the
 *   generated DOM (Carter's own destroy, plus the controller and the guard).
 * - Carter returns a bare cleanup *function* on the no-WebGL2 path (its
 *   `lab-doc.js` normalises both shapes). The port returns the same
 *   `{ destroy, set }` object on both paths so the stage tears down uniformly;
 *   `set()` works there too, as `memory` still steers `measure()`.
 * - Carter's no-WebGL2 path throws on its first board switch: the early
 *   `if (!gl) return …` sits above `let Z = true`, so the first `measure()`
 *   reaches `Q()` before `Z` is initialized and dies with
 *   `ReferenceError: Cannot access 'Z' before initialization`. The port declares
 *   `dirty`/`invalidate()` above that branch, so the fallback the Notes pane
 *   promises ("the page still works, which was his first point") actually works.
 *   Verified against Carter's own source: the original stays on `BOARD::INDEX`
 *   and logs the ReferenceError, the port completes the swap.
 * - Robustness only: returns `null` when there is no host, and skips the grid
 *   texture when a 2d context is unavailable, matching the other ports.
 *
 * No new dependencies, no shared runtime change.
 */

import gsap from 'gsap';
import { getCarterRoot, onDestroy } from '../runtime.js';

// ------------------------------------------------------------------ constants
// Exact values from Carter's source (`app/lib/assets.ts` + `paste-up.js`).
const ASSETS_ORIGIN = 'https://assets.carterogunsola.com';
/** Carter's `img(path, width, quality)` helper (`app/lib/assets.ts`). */
const printImage = (path, width = 720, quality = 86) =>
  `${ASSETS_ORIGIN}/cdn-cgi/image/width=${width},quality=${quality},format=auto/${path.replace(/^\/+/, '')}`;

/** The six prints: three from each of the two DTS series. */
const PRINTS = [
  ...[22, 25, 27].map((n) => `dts/unwrapped/DTS_Unwrapped_by_FRANCO_DUPUY_${n}.jpg`),
  ...[6, 17, 44].map((n) => `dts/landing-site/DTS_Landing_Site_by_Fanette_Guilloud_${n}.jpg`),
];
const PRINT_COUNT = PRINTS.length;
/** The claim ids (`p0` … `p5`) written into `data-print`. */
const PRINT_IDS = PRINTS.map((_, index) => `p${index}`);
/** Carter's `--pu-rail` row count: every print but the plate. */
const RAIL_COUNT = PRINT_COUNT - 1;

/** Carter's house follow factor for rects, and the two demo knobs. */
const DEFAULTS = { damp: 0.085, bend: 1, fetch: 0, memory: 1 };

/** Carter's Tune descriptors, verbatim (the Tune UI itself stays deferred). */
const TUNE = {
  damp: [0.085, 0.02, 0.3, 0.005],
  bend: [1, 0, 2, 0.05],
  fetch: [0, 0, 800, 25],
  memory: true,
};

const MAX_DPR = 1.5;
const BEND_SCALE = 0.4;
const VEL_CLAMP = 48;
const GRID = 16;

/**
 * Carter's `?mesh` debug flag (`Vd.on`). Off in Carter's default path and off
 * in Jesper: the Carter frame has no site-wide mesh replacement mode.
 */
const MESH_ON = false;

// -------------------------------------------------------------------- shaders
/** Carter's vertex shader, verbatim. `uRect` is css px with y down. */
const VERTEX_SHADER = `#version 300 es
in vec2 aUv;
uniform vec4 uRect;  // x, y, w, h — css px, y down
uniform vec2 uRes;   // css px
uniform vec2 uVel;   // smoothed px/frame
uniform float uBend;
out vec2 vUv;
void main() {
  vUv = aUv;
  vec2 p = uRect.xy + aUv * uRect.zw;
  // Paper flex: the center leads, the edges trail the motion. Zero at rest.
  p.x -= uVel.x * uBend * (1.0 - sin(3.14159 * aUv.x));
  p.y -= uVel.y * uBend * (1.0 - sin(3.14159 * aUv.y));
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
}`;

/** Carter's fragment shader, verbatim. */
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uImg;
uniform vec2 uImgRes;
uniform vec4 uRect;
uniform float uAlpha;
in vec2 vUv;
out vec4 outColor;
void main() {
  // object-fit: cover crop against the plane's live aspect.
  float rc = uRect.z / max(uRect.w, 1.0);
  float ri = uImgRes.x / uImgRes.y;
  vec2 uv = vUv;
  if (rc > ri) { float s = ri / rc; uv.y = (uv.y - 0.5) * s + 0.5; }
  else { float s = rc / ri; uv.x = (uv.x - 0.5) * s + 0.5; }
  // The photo as-is — no treatment fights the flight.
  vec4 t = texture(uImg, uv);
  float a = uAlpha * t.a; // the mesh tile's transparent ground stays open
  outColor = vec4(t.rgb * a, a);
}`;

const UNIFORMS = ['uRect', 'uRes', 'uVel', 'uBend', 'uImg', 'uImgRes', 'uAlpha'];

// -------------------------------------------------------------------- helpers
const pad2 = (value) => String(value).padStart(2, '0');

/** Carter's `Od()`: the frame's live ink, with the source's fallback. */
function readInk() {
  const root = getCarterRoot();
  if (!root || typeof getComputedStyle !== 'function') return '#f2f1ee';
  return getComputedStyle(root).getPropertyValue('--ink').trim() || '#f2f1ee';
}

/**
 * Carter's `kd()` from `mesh.ts` — the pencil-grid canvas texture.
 *
 * Verbatim maths: a canvas ground (transparent by default, so only the strokes
 * show), a `step` of `min(w, h) / 9` rounded into whole columns/rows, a
 * `weight` of `min(w, h) / 480`, `alpha .72`, and optional rounded corners with
 * a hairline inset stroke. Carter's source ignores the `seed` option; the
 * argument is kept so the call sites match.
 */
export function gridTexture(width, height, options = {}) {
  const w = Math.max(2, Math.round(width));
  const h = Math.max(2, Math.round(height));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const ink = options.ink ?? readInk();
  const ground = options.ground === undefined ? null : options.ground;
  if (ground) {
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, w, h);
  }

  const min = Math.min(w, h);
  const step = options.step ?? min / 9;
  const cols = Math.max(1, Math.round(w / step));
  const rows = Math.max(1, Math.round(h / step));
  const colWidth = w / cols;
  const rowHeight = h / rows;
  const weight = options.weight ?? Math.max(1, Math.round(min / 480));
  const snap = (value, max) =>
    Math.min(max - weight / 2, Math.max(weight / 2, Math.round(value - weight / 2) + weight / 2));
  const radius = Math.min(options.radius ?? 0, min / 2);

  ctx.strokeStyle = ink;
  ctx.globalAlpha = options.alpha ?? 0.72;
  ctx.lineWidth = weight;
  ctx.lineCap = 'butt';

  if (radius > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, radius);
    ctx.clip();
  }

  ctx.beginPath();
  for (let col = 0; col <= cols; col++) {
    const x = snap(col * colWidth, w);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let row = 0; row <= rows; row++) {
    const y = snap(row * rowHeight, h);
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  if (radius > 0) {
    ctx.restore();
    ctx.beginPath();
    ctx.roundRect(weight / 2, weight / 2, w - weight, h - weight, Math.max(0, radius - weight / 2));
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  return canvas;
}

// --------------------------------------------------------------------- engine
/**
 * Mount the Paste-Up experiment into `host` (Carter's `[data-experiment-viewport]`).
 * Returns `{ destroy, set }`, or `null` when there is nothing to mount into.
 */
export function mountPasteUp(host) {
  if (!host) return null;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = { ...DEFAULTS };

  // ------------------------------------------------------------- stage DOM
  const root = document.createElement('div');
  root.className = 'pu';
  root.style.setProperty('--pu-n', String(PRINT_COUNT));
  root.style.setProperty('--pu-rail', String(RAIL_COUNT));

  const slot = (id, tag) =>
    `<div class="pu__slot" data-print="${id}" tabindex="0" role="button" aria-label="print ${
      Number(id.slice(1)) + 1
    }"><span class="pu__tag">${tag}</span></div>`;

  root.innerHTML = `
      <nav class="pu__tabs">
        ${['index', 'spread', 'strip']
          .map(
            (id, index) =>
              `<button class="pu__tab${index === 0 ? ' is-on' : ''}" data-board="${id}">${id}</button>`,
          )
          .join('')}
        <i class="pu__tabline"></i>
      </nav>
      <div class="pu__field">
        <div class="pu__board pu__index is-on">
          ${PRINT_IDS.map((id, index) => slot(id, `PRINT::${pad2(index + 1)}`)).join('')}
        </div>
        <div class="pu__board pu__spread">
          ${slot('p0', 'PLATE')}
          <div class="pu__rail">
            ${PRINT_IDS.slice(1)
              .map((id) => slot(id, ''))
              .join('')}
          </div>
        </div>
        <div class="pu__board pu__strip">
          ${PRINT_IDS.map((id, index) => slot(id, `${pad2(index + 1)}A`)).join('')}
        </div>
        <canvas class="pu__canvas" aria-hidden="true"></canvas>
      </div>
      <div class="pu__hud">
        <span data-pu-board>BOARD::INDEX</span><span>A PRINT BELONGS TO ITS ID</span>
      </div>`;

  host.append(root);

  const field = root.querySelector('.pu__field');
  const canvas = root.querySelector('.pu__canvas');
  const boards = {
    index: root.querySelector('.pu__index'),
    spread: root.querySelector('.pu__spread'),
    strip: root.querySelector('.pu__strip'),
  };
  const tabs = [...root.querySelectorAll('.pu__tab')];
  const tabline = root.querySelector('.pu__tabline');
  const boardLabel = root.querySelector('[data-pu-board]');
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false });

  // Carter's no-WebGL2 degradation: the boxes get plain images, swaps cut.
  if (!gl) {
    canvas.remove();
    root.querySelectorAll('[data-print]').forEach((el) => {
      const image = new Image();
      image.src = printImage(PRINTS[Number(el.dataset.print.slice(1))], 720);
      el.prepend(image);
    });
  }

  let board = 'index';
  let plate = 'p0';
  const claims = new Map();
  const controller = new AbortController();
  const { signal } = controller;

  /** Re-map the visible board's boxes to their claim ids (source: `A`). */
  const claim = () => {
    boards[board].querySelectorAll('[data-print]').forEach((el) => {
      claims.set(el.dataset.print, el);
    });
  };
  claim();

  /** Texture upgrade hook; a no-op until the GL path installs it (source: `j`). */
  let requestHiRes = () => {};

  /** Make a print the spread's plate by rewriting the spread's claims (source: `M`). */
  const makePlate = (id) => {
    plate = id;
    requestHiRes(Number(id.slice(1)));
    const spreadSlots = boards.spread.querySelectorAll('[data-print]');
    const others = PRINT_IDS.filter((other) => other !== id);
    spreadSlots.forEach((el, index) => {
      el.dataset.print = index === 0 ? id : others[index - 1];
    });
    if (!gl) {
      spreadSlots.forEach((el) => {
        const image = el.querySelector('img');
        if (image) image.src = printImage(PRINTS[Number(el.dataset.print.slice(1))], 720);
      });
    }
  };

  const planes = PRINT_IDS.map(() => ({
    cur: { x: 0, y: 0, w: 0, h: 0 },
    tar: { x: 0, y: 0, w: 0, h: 0 },
    vel: { x: 0, y: 0 },
    alpha: 0,
    placed: false,
  }));

  let dirty = true;
  const invalidate = () => {
    dirty = true;
  };

  /**
   * Ask every claim for its rect, relative to the field, and cache it on the
   * plane (source: `P`). A `0×0` rect — a claim on a board that is not laid
   * out — is refused while `memory` is on, which is exactly the behaviour the
   * Memory knob demonstrates.
   */
  const measure = () => {
    const box = field.getBoundingClientRect();
    PRINT_IDS.forEach((id, index) => {
      const el = claims.get(id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 && params.memory) return;
      const plane = planes[index];
      plane.tar = { x: rect.left - box.left, y: rect.top - box.top, w: rect.width, h: rect.height };
      if (!plane.placed || reduced) {
        plane.cur = { ...plane.tar };
        plane.placed = true;
      }
    });
    invalidate();
  };

  /** Slide the shared tab underline and write the HUD readout (source: `I`). */
  const syncChrome = () => {
    tabs.forEach((el) => el.classList.toggle('is-on', el.dataset.board === board));
    const active = tabs.find((el) => el.dataset.board === board);
    tabline.style.transform = `translate3d(${active.offsetLeft}px, 0, 0)`;
    tabline.style.width = `${active.offsetWidth}px`;
    boardLabel.textContent = `BOARD::${board.toUpperCase()}`;
  };

  let fetchTimer = 0;

  /**
   * Switch boards (source: `L`): measure the outgoing board, swap, then — after
   * Carter's fake `fetch` dwell — show the new board and measure again, so the
   * planes fly from where they were to where they now belong.
   */
  const showBoard = (next, print) => {
    clearTimeout(fetchTimer);
    boards[board].classList.remove('is-on');
    measure();
    board = next;
    syncChrome();
    const commit = () => {
      if (next === 'spread') makePlate(print ?? plate);
      boards[next].classList.add('is-on');
      claim();
      measure();
    };
    if (params.fetch > 0 && !reduced) fetchTimer = window.setTimeout(commit, params.fetch);
    else commit();
  };

  tabs.forEach((el) => {
    el.addEventListener(
      'click',
      () => {
        if (el.dataset.board !== board) showBoard(el.dataset.board);
      },
      { signal },
    );
  });

  /** Print hit areas: spread → hero plate or back to the index (source: `R`). */
  const onFieldClick = (event) => {
    const el = event.target.closest('[data-print]');
    if (!el) return;
    const id = el.dataset.print;
    if (board === 'spread') {
      if (id === plate) {
        showBoard('index');
      } else {
        makePlate(id);
        claim();
        measure();
      }
    } else {
      showBoard('spread', id);
    }
  };
  field.addEventListener('click', onFieldClick, { signal });

  /** Enter / Space on a focused print (source: `z`). */
  const onFieldKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const el = event.target.closest('[data-print]');
    if (!el) return;
    event.preventDefault();
    el.click();
  };
  field.addEventListener('keydown', onFieldKeyDown, { signal });

  const observer = new ResizeObserver(() => {
    resize();
    measure();
  });
  observer.observe(field);

  const set = (key, value) => {
    if (key === 'memory') {
      params.memory = +(value === 'on' || value === true);
    } else if (key in params) {
      params[key] = Number(value);
      if (key === 'damp' || key === 'bend') invalidate();
    }
  };

  // Carter returns a bare cleanup function here; the port keeps one contract.
  if (!gl) {
    syncChrome();
    let destroyed = false;
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(fetchTimer);
      observer.disconnect();
      controller.abort();
      root.remove();
    };
    onDestroy(destroy);
    return { destroy, set };
  }

  // ------------------------------------------------------------- GL plumbing
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('[paste-up]', gl.getShaderInfoLog(shader));
    }
    return shader;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  gl.useProgram(program);

  const uniforms = {};
  for (const name of UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name);

  // One GRID×GRID quad: `aUv` runs 0→1 across the sheet.
  const vertices = [];
  const indices = [];
  for (let row = 0; row <= GRID; row++) {
    for (let col = 0; col <= GRID; col++) vertices.push(col / GRID, row / GRID);
  }
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      // Carter's source literal is `row * 17 + col` (17 = GRID + 1).
      const base = row * (GRID + 1) + col;
      indices.push(base, base + 1, base + GRID + 1, base + 1, base + GRID + 2, base + GRID + 1);
    }
  }

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  const aUv = gl.getAttribLocation(program, 'aUv');
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  /**
   * One texture per print: a pencil-grid placeholder (Carter's `kd`) that the
   * photograph replaces as soon as it decodes.
   */
  const textures = PRINTS.map((path, index) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      gridTexture(540, 720, { seed: 31 + index * 7 }),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const record = { tex: texture, w: 540, h: 720, ready: true, hi: false };
    if (MESH_ON) return record;

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = printImage(path, 720);
    image
      .decode()
      .then(() => {
        record.w = image.naturalWidth;
        record.h = image.naturalHeight;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        record.ready = true;
        invalidate();
      })
      .catch(() => {});
    return record;
  });

  /** The claimed print gets a 1440px texture, once (source: `j`). */
  requestHiRes = (index) => {
    const record = textures[index];
    if (!record || record.hi || MESH_ON) return;
    record.hi = true;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = printImage(PRINTS[index], 1440);
    image
      .decode()
      .then(() => {
        record.w = image.naturalWidth;
        record.h = image.naturalHeight;
        gl.bindTexture(gl.TEXTURE_2D, record.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        invalidate();
      })
      .catch(() => {
        record.hi = false;
      });
  };

  let cssWidth = 1;
  let cssHeight = 1;

  /** Backing store at DPR capped to `MAX_DPR`, viewport in device px. */
  function resize() {
    const scale = Math.min(devicePixelRatio || 1, MAX_DPR);
    const rect = field.getBoundingClientRect();
    cssWidth = rect.width;
    cssHeight = rect.height;
    canvas.width = Math.max(1, Math.round(rect.width * scale));
    canvas.height = Math.max(1, Math.round(rect.height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();

  /** Paint every placed plane, slowest first so a flying print crosses over. */
  const draw = () => {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uniforms.uRes, cssWidth, cssHeight);
    gl.uniform1i(uniforms.uImg, 0);
    gl.activeTexture(gl.TEXTURE0);

    const order = planes
      .map((plane, index) => ({ index, speed: Math.abs(plane.vel.x) + Math.abs(plane.vel.y) }))
      .sort((a, b) => a.speed - b.speed);

    for (const { index } of order) {
      const plane = planes[index];
      if (!plane.placed || plane.alpha <= 0.001 || plane.cur.w < 0.5) continue;
      const texture = textures[index];
      gl.bindTexture(gl.TEXTURE_2D, texture.tex);
      gl.uniform4f(uniforms.uRect, plane.cur.x, plane.cur.y, plane.cur.w, plane.cur.h);
      gl.uniform2f(uniforms.uImgRes, texture.w, texture.h);
      gl.uniform2f(
        uniforms.uVel,
        Math.max(-VEL_CLAMP, Math.min(VEL_CLAMP, plane.vel.x)) * BEND_SCALE,
        Math.max(-VEL_CLAMP, Math.min(VEL_CLAMP, plane.vel.y)) * BEND_SCALE,
      );
      gl.uniform1f(uniforms.uBend, reduced ? 0 : params.bend);
      gl.uniform1f(uniforms.uAlpha, plane.alpha);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
  };

  /** The whole animation: damp every rect toward its claim, then draw (source: `$`). */
  const tick = () => {
    if (!dirty) return;
    let moving = false;
    const factor = reduced ? 1 : params.damp;

    for (let index = 0; index < PRINT_COUNT; index++) {
      const plane = planes[index];
      if (!plane.placed) continue;
      const prevX = plane.cur.x;
      const prevY = plane.cur.y;
      ['x', 'y', 'w', 'h'].forEach((key) => {
        plane.cur[key] += (plane.tar[key] - plane.cur[key]) * factor;
        if (Math.abs(plane.tar[key] - plane.cur[key]) < 0.05) plane.cur[key] = plane.tar[key];
        else moving = true;
      });
      plane.vel.x = plane.vel.x * 0.8 + (plane.cur.x - prevX) * 0.2;
      plane.vel.y = plane.vel.y * 0.8 + (plane.cur.y - prevY) * 0.2;
      if (Math.abs(plane.vel.x) + Math.abs(plane.vel.y) > 0.05) moving = true;
      else {
        plane.vel.x = 0;
        plane.vel.y = 0;
      }
      const target = +!!textures[index].ready;
      plane.alpha += (target - plane.alpha) * 0.12;
      if (Math.abs(target - plane.alpha) < 0.01) plane.alpha = target;
      else moving = true;
    }

    draw();
    if (!moving) dirty = false;
  };

  gsap.ticker.add(tick);
  measure();
  syncChrome();

  // ----------------------------------------------------------------- teardown
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    clearTimeout(fetchTimer);
    gsap.ticker.remove(tick);
    observer.disconnect();
    controller.abort();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    root.remove();
  };

  // Register with Jesper's page lifecycle so route-away cleans up even if the
  // caller forgets. Also returned for manual use.
  onDestroy(destroy);

  return { destroy, set };
}

/** Carter's `config` export: the Tune descriptors, verbatim. */
export const config = TUNE;

/**
 * Carter's default export shape: `{ mount, config }`.
 * Kept for fidelity; Jesper's integration uses the named `mountPasteUp`.
 */
const PasteUp = {
  mount: mountPasteUp,
  config: TUNE,
};

export default PasteUp;
