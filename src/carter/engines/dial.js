/**
 * Carter Dial engine — Phase 5E.
 *
 * Ported from `app/lib/experiments/dial.js` at
 * sausageOps/carterogunsola-reconstruction@3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249
 * (read-only). That file's body is byte-identical to the original live-site
 * chunk `src/dial._0WTp1k0.js` apart from the `../mesh.ts` import specifier
 * (Carter's own Phase 8 fidelity check, `recon/lab/engines.md` §3).
 *
 * Preserved algorithm & interactions:
 * - A full 26-channel ring turning around a hub placed off the left of the
 *   stage; only its right cap is visible. The rest is painted back over by one
 *   `.dial__cover` conic-gradient centred on the same hub (`--dial-cx/--dial-cy`),
 *   so nothing is culled: the dial you see is the slice the cover leaves.
 * - The tick ruler is a full ring of `26 * 5 = 130` marks inside a 0-size
 *   rotor; one `rotate()` spins them all, and the same cover clips them.
 * - Exponential settle: `damp(cur, target, dragging ? dampDrag : dampIdle, dt)`
 *   with the source defaults `dampDrag: 15`, `dampIdle: 25`, `stepPx: 62`,
 *   `detent: 'elastic'`.
 * - Vertical pointer drag (`> 4px` marks a move so a click never navigates),
 *   non-passive wheel scrub (`stepPx * 3`, `150ms` idle handoff) and
 *   `ArrowUp/Left` · `ArrowDown/Right` step keys.
 * - Detent snap via GSAP `elastic.out(2, 0.6)` / `back.out(1.7)` /
 *   `power3.out` as chosen by `detent`; the grip hand rotates with the delta.
 * - Active channel is whichever crosses the fixed index pointer (`is-active`,
 *   `aria-selected`), with the source's `1.08` icon scale.
 * - Opening choreography: dial fade `0.6s power2.out`, knob
 *   `scale 0.4 / rotate -160` over `1s expo.out`, and the `1.4s` wind-down that
 *   lands the ring on the first channel.
 *
 * Adaptations to Jesper's runtime (all listed in the phase report):
 * - `import { f as e } from '../mesh.ts'` → `import gsap` (the only binding the
 *   body uses).
 * - The 26-channel table + glyphs live in `./dial-channels.js` (copied
 *   verbatim); the arrays are exported here as `channels` to keep the source's
 *   binding names inside `mount()`.
 * - Inline `#exp-dial-style` `<style>` injection removed: the same CSS ships as
 *   `pages/lab/dial.css`, scoped under `:where(.carter)`.
 * - `<html data-theme>` has no equivalent here, but the stylesheet reads the
 *   live `--ink` / `--surface` tokens, so the dial re-themes with the frame.
 * - Caller-supplied viewport fallback via `getCarterRoot()`, returning `null`
 *   when no `[data-experiment-viewport]` is present (e.g. SSR).
 * - Route teardown registered via `onDestroy`, idempotent: aborts every
 *   listener (one `AbortController`), disconnects the `ResizeObserver`, removes
 *   the `gsap.ticker` callback, kills the detent and opening tweens, clears the
 *   wheel-idle timer, releases the audio pool and removes the `.dial` root.
 *
 * No new dependencies, no shared-runtime change.
 */

import gsap from 'gsap';
import { getCarterRoot, onDestroy } from '../runtime.js';
import { CHANNELS } from './dial-channels.js';

// ------------------------------------------------------------------ constants
// Exact values from Carter's source.

const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mod = (i, n) => ((i % n) + n) % n;
const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));

const N = CHANNELS.length; // 26 channels
const SLICE = 360 / N; // 13.846° per channel

// Geometry
const RADIUS_MIN = 230;
const RADIUS_MAX = 340;
const RADIUS_VH = 0.38;
const HUB_RATIO = 0.57; // hub sits at 57% of the stage width, off to the left
const KNOB_RATIO = 0.15;
const KNOB_MIN = 44;
const KNOB_MAX = 60;
const GRIP_OFFSET_RATIO = 0.55; // index pointer position along the radius
const INDEX_RATIO = 0.72; // the fixed index pointer sits on this radius
const TICKS_PER_CHANNEL = 5;

// Grip + detents
const GRIP_SCALE = 0.5;
const GRIP_MAX = 14;
const EASES = {
  soft: { ease: 'power3.out', dur: 0.5 },
  snappy: { ease: 'back.out(1.7)', dur: 0.55 },
  elastic: { ease: 'elastic.out(2, 0.6)', dur: 0.8 },
};
const GRIP_DAMP = 12;
const SETTLE_FLOOR = 5e-5;
const GRIP_EPSILON = 0.01;
const DRAG_THRESHOLD = 4;
const WHEEL_IDLE_MS = 150;
const WHEEL_DIVISOR = 3;

// Click pool ("a tuner click pitched to how fast you spun")
const CLICK_VOLUME = 0.05;
const CLICK_RATE_MIN = 0.8;
const CLICK_RATE_MAX = 1.6;
const CLICK_SPEED_REF = 600;
const CLICK_SPEED_CAP = 1.5;

const DEFAULTS = { dampDrag: 15, dampIdle: 25, stepPx: 62, detent: 'elastic' };

export const config = [
  { key: 'dampDrag', label: 'Weight', type: 'range', min: 6, max: 40, step: 1, default: DEFAULTS.dampDrag },
  { key: 'dampIdle', label: 'Settle', type: 'range', min: 10, max: 40, step: 1, default: DEFAULTS.dampIdle },
  { key: 'stepPx', label: 'Sensitivity', type: 'range', min: 40, max: 100, step: 2, default: DEFAULTS.stepPx },
  {
    key: 'detent',
    label: 'Detent',
    type: 'segment',
    default: DEFAULTS.detent,
    options: [
      { id: 'soft', label: 'Soft' },
      { id: 'snappy', label: 'Snappy' },
      { id: 'elastic', label: 'Elastic' },
    ],
  },
  {
    key: 'accent',
    label: 'Accent',
    type: 'swatch',
    default: 'ink',
    options: [
      { id: 'ink', value: 'var(--ink)' },
      { id: 'poppy', value: '#c54126' },
      { id: 'blue', value: '#105099' },
      { id: 'oak', value: '#9e9e4d' },
    ],
  },
];

// Carter's own data file for this experiment: `/lab/dial-tick.mp3`. It is not
// present in Carter's reconstruction either (404, recorded in its Phase 8
// report) and is deliberately NOT substituted here — no generated or borrowed
// click is used. The source already tolerates that: the pool is built with
// `try`/`catch`, `play()` failures are swallowed and `playClick` is a no-op
// when the pool is empty, so the dial is silent but fully usable.
//
// Two documented deviations from the source's constants keep a 404 silent and
// cheap instead of noisy:
//  - `preload` is 'none' (source: 'auto'), so nothing is fetched or probed
//    until the first detent actually plays a click;
//  - the pool is 3 objects (source: 8), so at most three promises reject.
// If the asset is ever restored, behaviour matches Carter's on the next detent.
const CLICK_SRC = '/lab/dial-tick.mp3';
const CLICK_POOL_SIZE = 3;
const CLICK_PRELOAD = 'none';

// --------------------------------------------------------------------- mount

/**
 * Carter's `default.mount(host)`: `host` is `[data-experiment-viewport]`.
 * Returns `{ destroy, set }` or `null` when there is no host to mount into.
 */
export function mountDial(host) {
  const root = host ?? getCarterRoot()?.querySelector('[data-experiment-viewport]');
  if (!root || typeof document === 'undefined') return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = { ...DEFAULTS };

  const dial = document.createElement('div');
  dial.className = 'dial';
  dial.tabIndex = 0;
  dial.setAttribute('role', 'listbox');
  dial.setAttribute('aria-label', 'Social channels dial');

  const stage = document.createElement('div');
  stage.className = 'dial__stage';

  const indexMark = document.createElement('div');
  indexMark.className = 'dial__index';

  const ticks = document.createElement('div');
  ticks.className = 'dial__ticks';

  const rotor = document.createElement('div');
  rotor.className = 'dial__ticks-rotor';
  ticks.appendChild(rotor);

  const cover = document.createElement('div');
  cover.className = 'dial__cover';

  const knob = document.createElement('button');
  knob.type = 'button';
  knob.className = 'dial__knob';
  knob.setAttribute('aria-hidden', 'true');
  knob.tabIndex = -1;

  const grip = document.createElement('span');
  grip.className = 'dial__grip';
  knob.appendChild(grip);

  const items = CHANNELS.map((channel, position) => {
    const link = document.createElement('a');
    link.className = 'dial__item';
    link.href = channel.href;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.dataset.i = String(position);
    link.setAttribute('role', 'option');
    link.innerHTML = `<span class="dial__ic">${channel.svg}</span><span class="dial__label">${channel.name}</span>`;
    stage.appendChild(link);
    return link;
  });

  stage.append(ticks, cover, indexMark, knob);
  dial.appendChild(stage);
  root.appendChild(dial);

  // ── click pool ──
  const pool = reduced
    ? []
    : Array.from({ length: CLICK_POOL_SIZE }, () => {
        const audio = new Audio(CLICK_SRC);
        audio.preload = CLICK_PRELOAD;
        audio.volume = CLICK_VOLUME;
        return audio;
      });

  const playClick = (speed) => {
    if (!pool.length) return;
    const rate = clamp(
      CLICK_RATE_MIN + Math.min(speed / CLICK_SPEED_REF, CLICK_SPEED_CAP) * 0.8,
      CLICK_RATE_MIN,
      CLICK_RATE_MAX
    );
    const audio = pool.find((a) => a.paused || a.ended) ?? pool[0];
    audio.playbackRate = rate;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      /* the source ignores a failed detent click */
    }
  };

  // ── measured geometry ──
  let hubX = 0;
  let hubY = 0;
  let radius = 320;
  let indexX = 115;
  let knobSize = 54;

  const measure = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    hubY = h / 2;
    radius = clamp(Math.min(h * RADIUS_VH, RADIUS_MAX), RADIUS_MIN, RADIUS_MAX);
    hubX = clamp(w * HUB_RATIO, radius + 40, w - 40) - radius;
    indexX = radius * GRIP_OFFSET_RATIO;
    knobSize = clamp(radius * KNOB_RATIO, KNOB_MIN, KNOB_MAX);
    const knobX = hubX + indexX;
    knob.style.left = `${knobX}px`;
    knob.style.width = knob.style.height = `${knobSize}px`;
    indexMark.style.left = `${hubX + radius * INDEX_RATIO - 6}px`;
    indexMark.style.width = '28px';
    rotor.style.left = `${hubX}px`;
    rotor.style.top = `${hubY}px`;
    dial.style.setProperty('--dial-cx', `${hubX}px`);
    dial.style.setProperty('--dial-cy', `${hubY}px`);
    buildTicks();
  };

  const buildTicks = () => {
    const tickRadius = radius * INDEX_RATIO;
    const total = N * TICKS_PER_CHANNEL;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < total; i++) {
      const major = i % TICKS_PER_CHANNEL === 0;
      const tick = document.createElement('span');
      tick.className = `dial__tick${major ? ' dial__tick--major' : ''}`;
      tick.style.width = `${major ? 18 : 8}px`;
      tick.style.transform = `rotate(${(360 / total) * i}deg) translateX(${tickRadius}px)`;
      fragment.appendChild(tick);
    }
    rotor.replaceChildren(fragment);
  };

  // ── state ──
  let target = 0; // where the ring is asked to be
  let cur = 0; // where it is
  let prevCur = 0; // last frame's position (click velocity)
  let gripDeg = 0; // the knob's hand
  let gripTarget = 0; // where the hand wants to be
  let activeIdx = -1;
  let dirty = true;

  const render = () => {
    for (let i = 0; i < N; i++) {
      let rel = mod(i - cur, N);
      if (rel > N / 2) rel -= N;
      const angle = rel * SLICE;
      const rad = angle * DEG;
      const x = hubX + radius * Math.cos(rad);
      const y = hubY + radius * Math.sin(rad);
      items[i].style.transform = `translate(${x}px, ${y}px) translateY(-50%) rotate(${angle}deg)`;
    }
    rotor.style.transform = `rotate(${-cur * SLICE}deg)`;
    grip.style.transform = `rotate(${gripDeg}deg)`;

    const next = mod(Math.round(cur), N);
    if (next !== activeIdx) {
      const previous = activeIdx;
      items[activeIdx]?.classList.remove('is-active');
      items[activeIdx]?.setAttribute('aria-selected', 'false');
      activeIdx = next;
      items[next].classList.add('is-active');
      items[next].setAttribute('aria-selected', 'true');
      if (previous !== -1) playClick(Math.abs(cur - prevCur) * SLICE * 60);
    }
  };

  // ── drag state ──
  let dragging = false;
  let moved = false;
  let pressY = 0;
  let pressTarget = 0;

  const tick = (_time, dtMs) => {
    const dt = Math.min(dtMs, 64) / 1e3 || 0.016;
    prevCur = cur;
    if (reduced) {
      if (cur !== target) {
        cur = target;
        dirty = true;
      }
    } else {
      const next = damp(cur, target, dragging ? params.dampDrag : params.dampIdle, dt);
      if (Math.abs(next - cur) > SETTLE_FLOOR) {
        cur = next;
        dirty = true;
      } else if (cur !== target) {
        cur = target;
        dirty = true;
      }
    }
    const hand = reduced ? gripTarget : damp(gripDeg, gripTarget, GRIP_DAMP, dt);
    if (Math.abs(hand - gripDeg) > GRIP_EPSILON) {
      gripDeg = hand;
      dirty = true;
    }
    if (!dirty) return;
    dirty = false;
    render();
  };

  const ac = new AbortController();
  const { signal } = ac;

  let snap = null;
  let wheelIdle = null;
  let windTween = null;

  const settleTo = (to) => {
    snap?.kill();
    to = Math.round(to);
    gripTarget = 0;
    if (reduced) {
      target = to;
      dirty = true;
      return;
    }
    const from = target;
    const { ease, dur } = EASES[params.detent];
    snap = gsap.to(
      { p: 0 },
      {
        p: 1,
        duration: dur,
        ease,
        onUpdate() {
          const p = this.targets()[0].p;
          target = from + (to - from) * p;
          dirty = true;
        },
        onComplete: () => {
          snap = null;
        },
      }
    );
  };

  const startDrag = (event) => {
    if (event.button != null && event.button !== 0) return;
    snap?.kill();
    snap = null;
    dragging = true;
    moved = false;
    pressY = event.clientY;
    pressTarget = target;
    dial.classList.add('is-dragging');
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  knob.addEventListener('pointerdown', startDrag, { signal });
  stage.addEventListener('pointerdown', startDrag, { signal });

  window.addEventListener(
    'pointermove',
    (event) => {
      if (!dragging) return;
      const dy = event.clientY - pressY;
      if (!moved && Math.abs(dy) > DRAG_THRESHOLD) moved = true;
      target = pressTarget - dy / params.stepPx;
      gripTarget = clamp((target - pressTarget) * SLICE * GRIP_SCALE, -GRIP_MAX, GRIP_MAX);
      dirty = true;
    },
    { signal }
  );

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    dial.classList.remove('is-dragging');
    settleTo(target);
  };

  window.addEventListener('pointerup', endDrag, { signal });
  window.addEventListener('pointercancel', endDrag, { signal });

  stage.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      snap?.kill();
      snap = null;
      target += event.deltaY / (params.stepPx * WHEEL_DIVISOR);
      gripTarget = clamp(event.deltaY * 0.2, -GRIP_MAX, GRIP_MAX);
      dirty = true;
      if (wheelIdle) clearTimeout(wheelIdle);
      wheelIdle = setTimeout(() => settleTo(target), WHEEL_IDLE_MS);
    },
    { passive: false, signal }
  );

  dial.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        settleTo(Math.round(cur) - 1);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        settleTo(Math.round(cur) + 1);
      }
    },
    { signal }
  );

  items.forEach((el, i) => {
    el.addEventListener(
      'click',
      (event) => {
        if (moved) {
          event.preventDefault();
          return;
        }
        if (i !== activeIdx) {
          event.preventDefault();
          let d = mod(i - Math.round(target), N);
          if (d > N / 2) d -= N;
          settleTo(Math.round(target) + d);
        }
      },
      { signal }
    );
    el.addEventListener('dragstart', (event) => event.preventDefault(), { signal });
  });

  measure();
  render();

  const observer = new ResizeObserver(() => {
    measure();
    dirty = true;
  });
  observer.observe(stage);

  gsap.ticker.add(tick);

  if (!reduced) {
    gsap.fromTo(dial, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' });
    gsap.from(knob, { scale: 0.4, rotate: -160, duration: 1, ease: 'expo.out', delay: 0.05 });
    const wind = { p: 1 };
    windTween = gsap.to(wind, {
      p: 0,
      duration: 1.4,
      ease: 'expo.out',
      delay: 0.1,
      onUpdate: () => {
        cur = wind.p * -2.5;
        dirty = true;
      },
    });
  }

  const set = (key, value) => {
    if (key === 'accent') {
      dial.style.setProperty('--dial-accent', String(value));
    } else if (key === 'detent') {
      params.detent = String(value);
    } else if (key in params) {
      params[key] = Number(value);
    }
  };

  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    ac.abort();
    observer.disconnect();
    gsap.ticker.remove(tick);
    snap?.kill();
    gsap.killTweensOf([knob, dial]);
    windTween?.kill();
    windTween = null;
    if (wheelIdle) clearTimeout(wheelIdle);
    pool.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    dial.remove();
  };

  // Register with Jesper's page lifecycle so route-away cleans up even if the
  // caller forgets. Also returned for manual use.
  onDestroy(destroy);

  return { destroy, set };
}

/**
 * Carter's default export shape: `{ mount, config }`.
 * Kept for fidelity; Jesper's integration uses the named `mountDial`.
 */
const Dial = {
  mount: mountDial,
  config,
};

export default Dial;
