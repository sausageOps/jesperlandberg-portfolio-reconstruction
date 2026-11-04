/**
 * Carter Heart engine — ported from
 * `app/lib/experiments/heart.js` at
 * sausageOps/carterogunsola-reconstruction@3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249
 *
 * That file is byte-identical to the original live-site chunk
 * `src/heart.HHFn1w7T.js` (only the import specifier differs), so this port
 * preserves the original code's algorithm verbatim: Taubin's implicit heart
 * surface solved into a point cloud at mount, spun on a 2d canvas with 24
 * elastically trailing layers, drag-to-spin with coast decay, a slow tilt
 * drift, backface culling, focal perspective, Lambert lighting against a
 * fixed light vector, and a monochrome three-level halftone alpha.
 *
 * Adaptations to Jesper's runtime (same set as the approved polka-dots port):
 *
 * - style injection (`#exp-heart-style`) removed — `heart.css` is the
 *   canonical source, scoped to `.carter`.
 * - `import {f} from "../mesh.ts"` (gsap) → `import gsap from "gsap"`.
 *   The ticker callback signature (time in seconds, delta in ms) is the
 *   same mapping the polka-dots port uses.
 * - `MutationObserver` on `document.documentElement` (`data-theme`, `class`)
 *   → `observeCarterTheme` (theme lives on the `.carter` root, not `html`).
 * - `Caller-supplied viewport resolution → `getCarterRoot()` scope: the
 *   engine appends its own `div.heart > canvas` to
 *   `[data-experiment-viewport]`, exactly as Carter's `mount(k)` does.
 * - Lifecycle registered via `onDestroy` so `destroyAll` cleans on route
 *   leave; `destroy()` aborts the pointer listeners, disconnects the
 *   ResizeObserver and theme observer, removes the ticker callback and
 *   removes the generated DOM (Carter's own destroy, verbatim).
 * - Robustness only: returns `null` when there is no container or no 2d
 *   context (handles unavailable canvas contexts), matching
 *   the polka-dots port.
 *
 * No new dependencies, no shared runtime change.
 */

import gsap from 'gsap';
import { getCarterRoot, onDestroy, observeCarterTheme } from '../runtime.js';

// ------------------------------------------------------------------ constants
// Exact values from Carter's source.
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const Y_COEF = 2.25; // linear-y coefficient in the implicit surface
const Y_CUBIC_COEF = 0.1125; // y coefficient inside the cubic term
const MAX_SCALE = 1.7; // perspective scale cap
const MAX_SPIN = 18; // spin velocity clamp (rad/s)
const LAYERS = 24; // elastic trail layers
const INITIAL_SPIN = 0.35; // opening coast (0 under reduced motion)

/** Implicit heart f(x,y,z) = (x² + 2.25y + z² − 1)³ − z³(x² + 0.1125y). */
const implicit = (x, y, z) => {
  const base = x * x + Y_COEF * y + z * z - 1;
  return base * base * base - z * z * z * (x * x + Y_CUBIC_COEF * y);
};

const DEFAULTS = { spin: 0.05, coast: 2, focal: 1500 };

// Carter's `export {c as config}` — tuple form [default, min, max, step],
// consumed by the (still deferred) Tune panel. Preserved for fidelity.
export const config = {
  spin: [DEFAULTS.spin, 0.02, 0.12, 0.005],
  coast: [DEFAULTS.coast, 0.5, 5, 0.1],
  focal: [DEFAULTS.focal, 500, 3000, 100],
};

// Normalized light direction, from Carter's `[-0.35, 0.5, 0.74]`.
const LIGHT = (() => {
  const v = [-0.35, 0.5, 0.74];
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
})();

// ------------------------------------------------------------------ engine

/**
 * Mount the Heart point cloud into `container` (`[data-experiment-viewport]`).
 * Creates `div.heart > canvas` and appends it, as Carter's `mount()` does;
 * destroy removes that DOM again. Returns `{destroy, set}` or `null`.
 */
export function mountHeart(container) {
  // Resolve mount container if not provided
  let mountRoot = container;
  if (!mountRoot) {
    const frame = getCarterRoot();
    mountRoot = frame?.querySelector('[data-experiment-viewport]') || null;
  }
  if (!mountRoot) return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Live config (Tune panel updates via `set`)
  const cfg = { ...DEFAULTS };

  // Generated DOM: div.heart > canvas (Carter creates these in mount())
  const root = document.createElement('div');
  root.className = 'heart';
  const canvas = document.createElement('canvas');
  root.appendChild(canvas);
  mountRoot.appendChild(root);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    root.remove();
    return null;
  }

  // Theme ink — read `var(--ink)` via a hidden span inside `.heart`
  let ink = '30,30,30';
  const readInk = () => {
    const probe = document.createElement('span');
    probe.style.cssText = 'color:var(--ink);position:absolute;visibility:hidden';
    root.appendChild(probe);
    const parts = getComputedStyle(probe).color.match(/\d+/g);
    probe.remove();
    if (parts) ink = `${parts[0]},${parts[1]},${parts[2]}`;
  };
  readInk();
  const stopTheme = observeCarterTheme(readInk);

  // ---------------------------------------------------------- point cloud
  // Grid resolution, sampled once at mount exactly as Carter does.
  const small = Math.min(window.innerWidth, window.innerHeight) < 1024;
  const cols = small ? 70 : 100; // x samples over [-1.35, 1.35]
  const rows = small ? 84 : 120; // z samples over [-1.15, 1.45]

  const xs = [];
  const zs = [];
  const ys = []; // stored y is ±√y_surface
  const gxs = []; // ∂f/∂x
  const gzs = []; // ∂f/∂z
  const gys = []; // ∂f/∂(±√y), mirrored

  for (let i = 0; i < cols; i++) {
    const x = -1.35 + (2.7 * i) / (cols - 1);
    for (let j = 0; j < rows; j++) {
      const z = -1.15 + (2.5999999999999996 * j) / (rows - 1);
      if (implicit(x, 0, z) >= 0) continue;

      // Coarse upward scan for the y crossing, then 22 bisections.
      let lo = 0;
      let hi = 0;
      let found = false;
      for (let step = 1; step <= 150; step++) {
        const y = step / 150;
        if (implicit(x, y, z) >= 0) {
          lo = (step - 1) / 150;
          hi = y;
          found = true;
          break;
        }
      }
      if (!found) continue;
      for (let b = 0; b < 22; b++) {
        const mid = (lo + hi) / 2;
        if (implicit(x, mid, z) < 0) lo = mid;
        else hi = mid;
      }

      const ySurf = (lo + hi) / 2;
      const sqrtY = Math.sqrt(ySurf);
      const base = x * x + Y_COEF * ySurf + z * z - 1;
      const base2 = base * base;
      const gx = 2 * x * (3 * base2 - z * z * z);
      const gz = 6 * z * base2 - 3 * z * z * (x * x + Y_CUBIC_COEF * ySurf);
      const gy = sqrtY * (13.5 * base2 - 0.225 * z * z * z);

      // Mirror across y.
      for (const sign of [1, -1]) {
        xs.push(x);
        zs.push(z);
        ys.push(sign * sqrtY);
        gxs.push(gx);
        gzs.push(gz);
        gys.push(sign * gy);
      }
    }
  }

  const count = xs.length;

  // Center on the centroid, then normalize: N = max component magnitude,
  // P = max hypot(x, y) (Carter's exact pair).
  let meanX = 0;
  let meanZ = 0;
  let meanY = 0;
  for (let p = 0; p < count; p++) {
    meanX += xs[p];
    meanZ += zs[p];
    meanY += ys[p];
  }
  meanX /= count;
  meanZ /= count;
  meanY /= count;

  let maxComponent = 1e-6;
  let maxRadial = 1e-6;
  for (let p = 0; p < count; p++) {
    xs[p] -= meanX;
    zs[p] -= meanZ;
    ys[p] -= meanY;
    maxComponent = Math.max(maxComponent, Math.abs(xs[p]), Math.abs(zs[p]), Math.abs(ys[p]));
    maxRadial = Math.max(maxRadial, Math.hypot(xs[p], ys[p]));
  }

  // Interleaved (x, z, y) triples — Carter's storage order.
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const layers = new Uint8Array(count);
  for (let p = 0; p < count; p++) {
    positions[p * 3] = xs[p] / maxComponent;
    positions[p * 3 + 1] = zs[p] / maxComponent;
    positions[p * 3 + 2] = ys[p] / maxComponent;
    const nLen = Math.hypot(gxs[p], gzs[p], gys[p]) || 1;
    normals[p * 3] = gxs[p] / nLen;
    normals[p * 3 + 1] = gzs[p] / nLen;
    normals[p * 3 + 2] = gys[p] / nLen;
    const radial = Math.hypot(xs[p], ys[p]) / maxRadial;
    layers[p] = Math.min(LAYERS - 1, (radial * LAYERS) | 0);
  }

  // -------------------------------------------------------------- viewport
  let width = 0;
  let height = 0;
  let scale = 200;
  let centerX = 0;
  let centerY = 0;

  const resize = () => {
    width = root.clientWidth;
    height = root.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(width * 0.4, height * 0.46);
    centerX = width / 2;
    centerY = height / 2;
  };

  // ------------------------------------------------------------- motion state
  let spin = reduced ? 0 : INITIAL_SPIN; // rad/s, decays by exp(-dt/coast)
  let angle = 0; // accumulated spin
  let tilt = 0.14; // eased toward 0.14 + 0.05·sin(t·1e-4)
  const layerAngles = new Float64Array(LAYERS);
  const layerRates = new Float64Array(LAYERS);
  for (let i = 0; i < LAYERS; i++) layerRates[i] = 1 / (0.72 - (i / LAYERS) * 0.38);
  const layerCos = new Float64Array(LAYERS);
  const layerSin = new Float64Array(LAYERS);

  // --------------------------------------------------------------- pointer
  const abort = new AbortController();
  const { signal } = abort;
  let dragging = false;
  let lastX = 0;

  root.addEventListener(
    'pointerdown',
    (e) => {
      dragging = true;
      lastX = e.clientX;
      root.classList.add('is-drag');
      root.setPointerCapture?.(e.pointerId);
    },
    { signal }
  );
  root.addEventListener(
    'pointermove',
    (e) => {
      if (!dragging) return;
      spin = clamp(spin + (e.clientX - lastX) * cfg.spin, -MAX_SPIN, MAX_SPIN);
      lastX = e.clientX;
    },
    { signal }
  );
  const release = () => {
    dragging = false;
    root.classList.remove('is-drag');
  };
  root.addEventListener('pointerup', release, { signal });
  root.addEventListener('pointercancel', release, { signal });

  // ------------------------------------------------------------------- tick
  // gsap ticker signature: (time seconds, delta ms).
  const [lx, ly, lz] = LIGHT;
  const tick = (time, delta) => {
    const dt = Math.min(delta, 40) / 1000 || 0.016;

    if (reduced) {
      angle += spin * dt;
    } else {
      spin *= Math.exp(-dt / cfg.coast);
      angle += spin * dt;
      tilt += (0.14 + 0.05 * Math.sin(time * 1e-4) - tilt) * Math.min(1, dt * 4);
    }

    const cosTilt = Math.cos(tilt);
    const sinTilt = Math.sin(tilt);
    for (let i = 0; i < LAYERS; i++) {
      if (reduced) layerAngles[i] = angle;
      else layerAngles[i] += (angle - layerAngles[i]) * Math.min(1, dt * layerRates[i]);
      layerCos[i] = Math.cos(layerAngles[i]);
      layerSin[i] = Math.sin(layerAngles[i]);
    }

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = `rgb(${ink})`;

    for (let p = 0; p < count; p++) {
      const layer = layers[p];
      const rc = layerCos[layer];
      const rs = layerSin[layer];
      const x = positions[p * 3];
      const z = positions[p * 3 + 1];
      const y = positions[p * 3 + 2];

      // Per-layer rotation in the (x, y) plane…
      const rx = x * rc + y * rs;
      const ry = -x * rs + y * rc;
      // …then the shared tilt in the (z, ry) plane.
      const screenY = z * cosTilt - ry * sinTilt;
      const depth = z * sinTilt + ry * cosTilt;

      const nx = normals[p * 3];
      const nz = normals[p * 3 + 1];
      const ny = normals[p * 3 + 2];
      const rnx = nx * rc + ny * rs;
      const rny = -nx * rs + ny * rc;
      const ndz = nz * sinTilt + rny * cosTilt;
      if (ndz < 0.02) continue; // backface cull
      const ndy = nz * cosTilt - rny * sinTilt;

      const depthPx = depth * scale;
      const persp = Math.min(MAX_SCALE, cfg.focal / (cfg.focal - depthPx));
      const sx = centerX + rx * scale * persp;
      const sy = centerY - screenY * scale * persp;
      const shade = clamp(0.5 + depth * 0.5, 0, 1);
      const radius = Math.min(1.6, persp) * (0.2 + shade);
      if (radius < 0.3) continue;

      const lambert = 0.32 + 0.6 * Math.max(0, rnx * lx + ndy * ly + ndz * lz);
      // Three-level monochrome halftone, capped at 0.5.
      ctx.globalAlpha = Math.min(
        0.5,
        (lambert < 0.26 ? 0.42 : lambert > 0.62 ? 1 : 0.68) * (0.4 + 0.6 * shade)
      );
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(root);
  gsap.ticker.add(tick);

  const destroy = () => {
    abort.abort();
    ro.disconnect();
    stopTheme();
    gsap.ticker.remove(tick);
    root.remove();
  };

  // Register with Jesper's page lifecycle so route-away cleans up even if
  // the caller forgets. Also return for manual use.
  onDestroy(destroy);

  return {
    destroy,
    set: (key, value) => {
      if (key in cfg) cfg[key] = Number(value);
    },
  };
}

/**
 * Carter's default export shape: `{ mount, config }`.
 * Kept for fidelity; Jesper's integration uses the named `mountHeart`.
 */
const Heart = {
  mount: mountHeart,
  config,
};

export default Heart;
