/**
 * Carter Polka Dots engine — ported from
 * `app/lib/experiments/polka-dots.js` at
 * sausageOps/carterogunsola-reconstruction@3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249
 *
 * Original is a 4036-byte minified module that mounts a `.pd > canvas`
 * dot-field into `[data-experiment-viewport]`. This port preserves the
 * drawing algorithm, parameters, colors, motion, resize and theme response
 * verbatim, adapted to Jesper's runtime:
 *
 * - style injection (`#exp-polka-style`) removed — `polka-dots.css` is the
 *   canonical source, scoped to `.carter`.
 * - `import {f} from "../mesh.ts"` (gsap) → `import gsap from "gsap"`.
 * - `MutationObserver` on `document.documentElement` → `observeCarterTheme`
 *   (theme lives on `.carter` root, not `html`).
 * - `document.head` / `document.body` hosts → `getCarterRoot()` scope.
 * - Lifecycle registered via `onDestroy` so `destroyAll` cleans on route leave.
 *
 * No new dependencies, no shared runtime change.
 */

import gsap from 'gsap';
import { getCarterRoot, onDestroy, observeCarterTheme } from '../runtime.js';

// ------------------------------------------------------------------ constants
// Exact values from Carter's source
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const BASE_RADIUS = 2.4;
const BASE_ALPHA = 0.2;
const VELOCITY_INFLUENCE = 0.16;
const WIGGLE_AMPLITUDE = 2.4;
const RING_SPEED = 620;
const RING_WIDTH = 90;
const PULSE_STRENGTH = 3.4;

const DEFAULTS = {
  repelR: 116,
  push: 0.9,
  bloom: 2.1,
  pull: { stiffness: 0.055, damping: 0.18, mass: 1 },
};

// Config array mirrors Carter's `export {u as config}` for the dev tuner.
// Jesper's `tune()` is null and the labcfg panel stays hidden (Phase 4B
// deferred), but the data is preserved for source fidelity.
export const config = [
  {
    key: 'repelR',
    label: 'Repel',
    type: 'range',
    min: 40,
    max: 200,
    step: 4,
    default: DEFAULTS.repelR,
    shortcut: { key: 'r' },
  },
  { key: 'push', label: 'Push', type: 'range', min: 0, max: 3, step: 0.1, default: DEFAULTS.push },
  {
    key: 'bloom',
    label: 'Bloom',
    type: 'range',
    min: 0,
    max: 4,
    step: 0.1,
    default: DEFAULTS.bloom,
    shortcut: { key: 'b', mode: 'coarse' },
  },
  { key: 'pull', label: 'Spring', type: 'spring', default: DEFAULTS.pull },
];

// ------------------------------------------------------------------ engine

/**
 * Mount the Polka Dots field into `container`.
 * `container` is typically the PolkaDotsStage host (`.pd` with canvas)
 * or, as fallback, the lab viewport found via `getCarterRoot()`.
 * The function reuses an existing `.pd > canvas` when present (Phase 5A
 * static DOM) and creates one otherwise, matching Carter's `mount(u)`.
 * Returns `{destroy, set}` or `null` if no container/canvas is available.
 */
export function mountPolkaDots(container) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Resolve mount container if not provided
  let mountRoot = container;
  if (!mountRoot) {
    const frame = getCarterRoot();
    mountRoot = frame?.querySelector('[data-experiment-viewport]') || null;
  }
  if (!mountRoot) return null;

  // Adopt or create `.pd` wrapper + `canvas`
  let pd;
  let canvas;
  let created = false;

  if (mountRoot.classList.contains('pd') && mountRoot.querySelector('canvas')) {
    pd = mountRoot;
    canvas = pd.querySelector('canvas');
  } else {
    const existing = mountRoot.querySelector(':scope > .pd');
    if (existing && existing.querySelector('canvas')) {
      pd = existing;
      canvas = pd.querySelector('canvas');
    } else {
      pd = document.createElement('div');
      pd.className = 'pd';
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      pd.appendChild(canvas);
      mountRoot.appendChild(pd);
      created = true;
    }
  }

  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Mutable runtime config (live tuner updates via `set`)
  const state = { ...DEFAULTS, pull: { ...DEFAULTS.pull } };

  // Theme ink — read `var(--ink)` via hidden span inside `pd`
  let ink = [30, 30, 30];
  const readInk = () => {
    const probe = document.createElement('span');
    probe.style.cssText = 'color:var(--ink);position:absolute;visibility:hidden;pointer-events:none';
    pd.appendChild(probe);
    const cssColor = getComputedStyle(probe).color.match(/\d+/g);
    probe.remove();
    if (cssColor) ink = [Number(cssColor[0]), Number(cssColor[1]), Number(cssColor[2])];
  };
  readInk();
  const stopTheme = observeCarterTheme(readInk);

  // Geometry + dots
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let dots = [];
  let w = 0;
  let h = 0;

  const updateSize = () => {
    w = pd.clientWidth;
    h = pd.clientHeight;
    // Fallback when pd is not yet laid out (e.g. hidden parent during mount)
    if (!w || !h) {
      const rect = pd.getBoundingClientRect();
      w = rect.width || mountRoot.clientWidth || 800;
      h = rect.height || mountRoot.clientHeight || 600;
    }
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const gap = clamp(Math.min(w, h) / 18, 26, 44);
    const nCols = Math.max(2, Math.round(w / gap));
    const nRows = Math.max(2, Math.round(h / gap));

    if (nCols === cols && nRows === rows && dots.length) {
      const cellW = w / cols;
      const cellH = h / rows;
      dots.forEach((dot, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const hx = cellW * (col + 0.5);
        const hy = cellH * (row + 0.5);
        dot.x += hx - dot.hx;
        dot.y += hy - dot.hy;
        dot.hx = hx;
        dot.hy = hy;
      });
      return false;
    }
    cols = nCols;
    rows = nRows;
    return true;
  };

  const rebuildDots = (animate) => {
    const cellW = w / cols;
    const cellH = h / rows;
    dots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hx = cellW * (c + 0.5);
        const hy = cellH * (r + 0.5);
        dots.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, appear: reduced || !animate ? 1 : 0 });
      }
    }
    if (animate && !reduced) playAppear();
  };

  const refresh = (animate = true) => {
    if (updateSize()) rebuildDots(animate);
  };

  let appearTween = null;
  const playAppear = () => {
    appearTween?.kill();
    if (reduced) return;
    dots.forEach((d) => (d.appear = 0));
    appearTween = gsap.to(dots, {
      appear: 1,
      duration: 1.1,
      ease: 'elastic.out(1, 0.55)',
      delay: 0.15,
      stagger: { each: 0.0035, grid: [rows, cols], from: 'center' },
    });
  };

  // Pointer + pulses
  const pointer = { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, active: false };
  const pulses = [];
  const abort = new AbortController();
  const { signal } = abort;

  const toLocal = (e) => {
    const rect = canvas.getBoundingClientRect();
    // canvas is styled to fill pd, but getBoundingClientRect is correct for pointer mapping
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  pd.addEventListener(
    'pointermove',
    (e) => {
      const p = toLocal(e);
      pointer.x = p.x;
      pointer.y = p.y;
      if (!pointer.active) {
        pointer.px = p.x;
        pointer.py = p.y;
      }
      pointer.active = true;
    },
    { signal }
  );
  pd.addEventListener('pointerleave', () => (pointer.active = false), { signal });
  pd.addEventListener(
    'pointerdown',
    (e) => {
      if (reduced) return;
      const p = toLocal(e);
      pulses.push({ x: p.x, y: p.y, radius: 0, strength: PULSE_STRENGTH });
    },
    { signal }
  );

  // Tick — gsap ticker passes (timeSeconds, deltaMs)
  const tick = (time, delta) => {
    const dt = Math.min(delta, 40) / 1000 || 0.016;
    const repelSq = state.repelR * state.repelR;

    pointer.vx = pointer.x - pointer.px;
    pointer.vy = pointer.y - pointer.py;
    pointer.px = pointer.x;
    pointer.py = pointer.y;

    // Update pulses
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.radius += RING_SPEED * dt;
      p.strength *= 0.955;
      if (p.strength < 0.05 || p.radius > Math.hypot(w, h)) pulses.splice(i, 1);
    }

    ctx.clearRect(0, 0, w, h);
    const [ir, ig, ib] = ink;

    for (let idx = 0; idx < dots.length; idx++) {
      const dot = dots[idx];
      // Home with subtle idle wiggle when not reduced
      const homeX = reduced ? dot.hx : dot.hx + Math.sin(dot.hy * 0.02 + time * 0.0012) * WIGGLE_AMPLITUDE;
      const homeY = reduced ? dot.hy : dot.hy + Math.cos(dot.hx * 0.02 + time * 0.001) * WIGGLE_AMPLITUDE;

      const k = state.pull.stiffness / state.pull.mass;
      let fx = (homeX - dot.x) * k;
      let fy = (homeY - dot.y) * k;
      let bloom = 0;

      if (pointer.active) {
        const dx = dot.x - pointer.x;
        const dy = dot.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < repelSq) {
          const d = Math.sqrt(d2) || 1;
          const t = 1 - d / state.repelR;
          const nx = dx / d;
          const ny = dy / d;
          fx += nx * t * state.push + pointer.vx * t * VELOCITY_INFLUENCE;
          fy += ny * t * state.push + pointer.vy * t * VELOCITY_INFLUENCE;
          bloom = t;
        }
      }

      for (let pi = 0; pi < pulses.length; pi++) {
        const pulse = pulses[pi];
        const dx = dot.x - pulse.x;
        const dy = dot.y - pulse.y;
        const dist = Math.hypot(dx, dy) || 1;
        const diff = Math.abs(dist - pulse.radius);
        if (diff < RING_WIDTH) {
          const f = (1 - diff / RING_WIDTH) * pulse.strength;
          fx += (dx / dist) * f;
          fy += (dy / dist) * f;
          const b = f * 0.4;
          if (b > bloom) bloom = Math.min(1, b);
        }
      }

      const damp = 1 - state.pull.damping;
      dot.vx = (dot.vx + fx) * damp;
      dot.vy = (dot.vy + fy) * damp;
      dot.x += dot.vx;
      dot.y += dot.vy;

      const radius = BASE_RADIUS * (0.4 + 0.6 * dot.appear) * (1 + bloom * state.bloom);
      const alpha = dot.appear * (BASE_ALPHA + bloom * 0.8);
      if (alpha < 0.004 || radius < 0.1) continue;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ir},${ig},${ib},${alpha})`;
      ctx.fill();
    }
  };

  refresh(true);
  const ro = new ResizeObserver(() => refresh(false));
  ro.observe(pd);

  gsap.ticker.add(tick);

  const destroy = () => {
    abort.abort();
    ro.disconnect();
    stopTheme();
    gsap.ticker.remove(tick);
    appearTween?.kill();
    if (created) pd.remove();
    else {
      // Adopted host: clear canvas but keep element for React ownership
      ctx.clearRect(0, 0, w, h);
    }
  };

  // Register with Jesper's page lifecycle so route-away cleans up even if
  // the caller forgets. Also return for manual use.
  onDestroy(destroy);

  return {
    destroy,
    set: (key, value) => {
      if (key === 'pull' && value && typeof value === 'object') state.pull = value;
      else if (key in state) state[key] = Number(value);
    },
  };
}

/**
 * Carter's default export shape: `{ mount, config }`.
 * Kept for fidelity; Jesper's integration uses the named `mountPolkaDots`.
 */
const PolkaDots = {
  mount: mountPolkaDots,
  config,
};

export default PolkaDots;
