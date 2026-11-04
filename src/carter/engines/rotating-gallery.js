/**
 * Carter Rotating Gallery engine — ported from
 * `app/lib/experiments/rotating-gallery.js` at
 * sausageOps/carterogunsola-reconstruction@3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249
 *
 * That file's body is byte-identical to the original live-site chunk
 * `src/rotating-gallery.Cu-VrtOq.js` (only the import specifier differs), and
 * matches the unminified listing captured in
 * `app/data/lab-restored/rotating-gallery.code.html`.
 *
 * Preserved algorithm & interactions:
 * - Ten image plates (`DRIFT` … `VAPOR`) arranged around a vertical-plane ring
 *   with `translate3d(x, y, z) translate(-50%, -50%)` inside a perspective
 *   container (`4000px` default) and static `500 + cos(θ)·100` z-index order
 *   trapped inside `.rg__stage { isolation: isolate }` (no `preserve-3d`).
 * - Continuous exponential drift (`MOMENTUM_DECAY = 1.3`), axis-locked pointer
 *   drag (`LOCK_PX = 5`, `DRAG_SCALE = 0.2`) with release inertia, non-passive
 *   wheel scrub (`SCROLL_SCALE = 0.22`, `90ms` idle handoff), fine-pointer
 *   plate hover preview, and `ArrowLeft` / `ArrowRight` / `g` keyboard control.
 * - Active plate `1.06` scale with `CustomEase` (`[0.16, 1, 0.3, 1]`), dual
 *   odometer digit strips (`DIGIT_DAMP = 8`), and title strip readout.
 * - Carousel ↔ Grid view morph powered by `gsap/Flip` (`duration: 1.4`,
 *   Chebyshev grid stagger / circular ring stagger, instant reparent under
 *   `prefers-reduced-motion: reduce`).
 *
 * Adaptations to Jesper's runtime:
 * - Inline `#exp-rg-style` `<style>` injection removed — `rotating-gallery.css`
 *   is the canonical stylesheet, scoped under `:where(.carter)`.
 * - `import { f, m, p } from "../mesh.ts"` → direct imports from installed
 *   `gsap`, `gsap/Flip`, and `gsap/CustomEase` with `gsap.registerPlugin`.
 * - `import { asset } from "../assets.ts"` → inline `ASSETS_ORIGIN` helper
 *   (`https://assets.carterogunsola.com`, matching `LabPage.jsx` and `data/lab.js`).
 * - Caller-supplied viewport fallback via `getCarterRoot()` (`[data-experiment-viewport]`),
 *   returning `null` if unavailable.
 * - Route teardown registered via `onDestroy` with idempotent cleanup of all
 *   listeners (`AbortController`), `ResizeObserver`, `gsap.ticker`, `wheelIdle`
 *   and `keyIdle` timers, `Flip` animations, intro timeline, active tweens,
 *   and generated `.rg` DOM.
 *
 * No new dependencies, no shared runtime change.
 */

import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { CustomEase } from 'gsap/CustomEase';
import { getCarterRoot, onDestroy } from '../runtime.js';

gsap.registerPlugin(Flip, CustomEase);

// ------------------------------------------------------------------ constants
// Exact values from Carter's source (`app/lib/assets.ts` + `rotating-gallery.js`).
const ASSETS_ORIGIN = 'https://assets.carterogunsola.com';
const asset = (key) => `${ASSETS_ORIGIN}/${key.replace(/^\/+/, '')}`;

const PLATES = [
  [1, 'DRIFT'],
  [4, 'FOLD'],
  [7, 'BLOOM'],
  [10, 'STATIC'],
  [13, 'EMBER'],
  [16, 'TIDE'],
  [19, 'GRAIN'],
  [22, 'PRISM'],
  [25, 'HUSK'],
  [28, 'VAPOR'],
];

const ITEMS = PLATES.map(([n, title]) => ({
  src: asset(
    `cdn-cgi/image/width=640,quality=86,format=auto/dts/unwrapped/DTS_Unwrapped_by_FRANCO_DUPUY_${n}.jpg`
  ),
  title,
}));

const N = ITEMS.length;
const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mod = (i, n) => ((i % n) + n) % n;
const damp = (cur, target, lambda, dt) =>
  cur + (target - cur) * (1 - Math.exp(-lambda * dt));

const SLICE = 360 / N;
const PHASE = 180;
const MOMENTUM_DECAY = 1.3;
const DRAG_SCALE = 0.2;
const SCROLL_SCALE = 0.22;
const LOCK_PX = 5;
const FLIP_DUR = 1.4;
const IMG_EASE = [0.16, 1, 0.3, 1];
const DIGIT_DAMP = 8;

let rgEaseSeq = 0;
const toEase = (id, b) =>
  CustomEase.create(id, `M0,0 C${b[0]},${b[1]} ${b[2]},${b[3]} 1,1`);

const EASES = {
  glide: 'power3.inOut',
  snap: 'back.inOut(1.4)',
  spring: 'back.inOut(2.2)',
};

const DEFAULTS = {
  drift: 4,
  weight: 8,
  perspective: 4000,
  morph: 'spring',
  imgEase: IMG_EASE,
};

// Carter's `export {p as config}` — consumed by the (still deferred) Tune panel.
export const config = [
  {
    key: 'drift',
    label: 'Drift',
    type: 'range',
    min: 0,
    max: 12,
    step: 0.5,
    default: DEFAULTS.drift,
  },
  {
    key: 'weight',
    label: 'Weight',
    type: 'range',
    min: 4,
    max: 20,
    step: 1,
    default: DEFAULTS.weight,
  },
  {
    key: 'perspective',
    label: 'Depth',
    type: 'range',
    min: 1500,
    max: 6000,
    step: 100,
    default: DEFAULTS.perspective,
  },
  {
    key: 'morph',
    label: 'Morph',
    type: 'segment',
    default: DEFAULTS.morph,
    options: [
      { id: 'glide', label: 'Glide' },
      { id: 'snap', label: 'Snap' },
      { id: 'spring', label: 'Spring' },
    ],
  },
  {
    key: 'imgEase',
    label: 'Image',
    type: 'easing',
    default: DEFAULTS.imgEase,
  },
];

const carouselIcon =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.333" width="5.333" height="5.333"/><rect x="5.333" y="10.667" width="5.333" height="5.333"/><rect x="10.667" y="5.333" width="5.333" height="5.333"/><rect y="5.333" width="5.333" height="5.333"/></svg>';
const gridIcon =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="0.25" y="0.75" width="5.333" height="5.333"/><rect x="10.583" y="0.75" width="5.333" height="5.333"/><rect x="0.25" y="10" width="5.333" height="5.333"/><rect x="10.583" y="10" width="5.333" height="5.333"/></svg>';

// ------------------------------------------------------------------ engine

/**
 * Mount the Rotating Gallery into `container` (`[data-experiment-viewport]`).
 * Creates `div.rg` (stage + HUD) and appends it, as Carter's `mount()` does;
 * destroy removes that DOM again. Returns `{ destroy, set }` or `null`.
 */
export function mountRotatingGallery(container) {
  let mountRoot = container;
  if (!mountRoot) {
    const frame = getCarterRoot();
    mountRoot = frame?.querySelector('[data-experiment-viewport]') || null;
  }
  if (!mountRoot) return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cfg = { ...DEFAULTS, imgEase: [...DEFAULTS.imgEase] };
  const easeId = `rgImg-${rgEaseSeq++}`;
  let imgEase = toEase(easeId, cfg.imgEase);

  const ac = new AbortController();
  const { signal } = ac;

  const rg = document.createElement('div');
  rg.className = 'rg';
  rg.tabIndex = 0;
  rg.dataset.view = 'carousel';

  const stage = document.createElement('div');
  stage.className = 'rg__stage';

  const carousel = document.createElement('div');
  carousel.className = 'rg__carousel';

  const grid = document.createElement('div');
  grid.className = 'rg__grid';

  const flips = [];
  const imgs = [];
  const items = [];
  const slots = [];

  ITEMS.forEach((item, i) => {
    const it = document.createElement('div');
    it.className = 'rg__item';
    it.style.zIndex = String(Math.round(500 + Math.cos(i * SLICE * DEG) * 100));

    const flip = document.createElement('div');
    flip.className = 'rg__flip';
    flip.dataset.i = String(i);

    const img = document.createElement('img');
    img.className = 'rg__img';
    img.src = item.src;
    img.alt = item.title;
    img.loading = 'eager';
    img.decoding = 'async';

    flip.appendChild(img);
    it.appendChild(flip);
    carousel.appendChild(it);

    const slot = document.createElement('div');
    slot.className = 'rg__slot';
    slot.style.zIndex = it.style.zIndex;
    grid.appendChild(slot);

    flips.push(flip);
    imgs.push(img);
    items.push(it);
    slots.push(slot);
  });

  const hud = document.createElement('div');
  hud.className = 'rg__hud';

  const meta = document.createElement('div');
  meta.className = 'rg__meta';

  const odo = document.createElement('div');
  odo.className = 'rg__odo';
  odo.setAttribute('aria-hidden', 'true');
  const digit = () =>
    `<span class="rg__odo-col"><span class="rg__odo-strip">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      .map((n) => `<span class="rg__odo-num">${n}</span>`)
      .join('')}</span></span>`;
  odo.innerHTML = digit() + digit();
  const strips = [...odo.querySelectorAll('.rg__odo-strip')];

  const name = document.createElement('div');
  name.className = 'rg__name';
  name.innerHTML = `<span class="rg__name-strip">${ITEMS.map(
    (it) => `<span class="rg__name-item">${it.title}</span>`
  ).join('')}</span>`;
  const nameStrip = name.querySelector('.rg__name-strip');

  meta.append(odo, name);

  const views = document.createElement('div');
  views.className = 'rg__views';
  views.setAttribute('role', 'group');
  views.setAttribute('aria-label', 'View');

  const carBtn = document.createElement('button');
  carBtn.type = 'button';
  carBtn.className = 'rg__view-btn';
  carBtn.dataset.view = 'carousel';
  carBtn.dataset.active = 'true';
  carBtn.setAttribute('aria-label', 'Carousel view');
  carBtn.innerHTML = carouselIcon;

  const gridBtn = document.createElement('button');
  gridBtn.type = 'button';
  gridBtn.className = 'rg__view-btn';
  gridBtn.dataset.view = 'grid';
  gridBtn.dataset.active = 'false';
  gridBtn.setAttribute('aria-label', 'Grid view');
  gridBtn.innerHTML = gridIcon;

  views.append(carBtn, gridBtn);
  hud.append(meta, views);
  stage.append(carousel, grid);
  rg.append(stage, hud);
  mountRoot.appendChild(rg);

  let center = 300;
  let radius = 250;
  let depth = 300;

  const measure = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const side = Math.min(w, h);
    center = side / 2;
    radius = clamp(Math.min(h * 0.26, w * 0.2), 140, 210);
    depth = radius * 1.2;
    const cardW = radius * 0.82;
    rg.style.setProperty('--rg-card-w', `${cardW}px`);
    carousel.style.width = carousel.style.height = `${side}px`;
    carousel.style.perspective = `${cfg.perspective}px`;
  };

  let angle = 0;
  let target = 0;
  let momentum = cfg.drift;
  let dir = 1;
  let dragging = false;
  let view = 'carousel';
  let flipping = false;
  let activeIdx = -1;
  let hoverIdx = -1;
  const digitY = [0, 0];
  let dirty = true;

  const layout = () => {
    for (let i = 0; i < N; i++) {
      const a = (i * SLICE + angle + PHASE) * DEG;
      const x = center + radius * Math.sin(a);
      const y = center - radius * Math.cos(a);
      const z = -depth * Math.cos(a);
      items[i].style.transform = `translate3d(${x}px, ${y}px, ${z}px) translate(-50%, -50%)`;
    }
  };

  const displayIdx = () => (hoverIdx >= 0 ? hoverIdx : activeIdx);

  const setImages = () => {
    const active = displayIdx();
    for (let i = 0; i < N; i++) {
      gsap.to(imgs[i], {
        scale: i === active ? 1.06 : 1,
        duration: reduced ? 0 : 1,
        ease: imgEase,
        overwrite: true,
      });
    }
  };

  const setMeta = (idx) => {
    const oneBased = idx + 1;
    const tens = Math.floor(oneBased / 10);
    const ones = oneBased % 10;
    digitY[0] = -tens;
    digitY[1] = -ones;
    nameStrip.style.transform = `translateY(${-idx * 1.1}em)`;
  };

  const setView = (next) => {
    if (next === view) return;
    view = next;
    rg.dataset.view = next;
    carBtn.dataset.active = String(next === 'carousel');
    gridBtn.dataset.active = String(next === 'grid');
    const lead = displayIdx();

    if (next === 'carousel') {
      const want = -lead * SLICE;
      angle += ((((want - angle) % 360) + 540) % 360) - 180;
      target = angle;
      momentum = cfg.drift * dir;
      if (activeIdx !== lead) {
        activeIdx = lead;
        setMeta(lead);
        setImages();
      }
      layout();
    }

    if (reduced) {
      Flip.killFlipsOf(flips);
      flips.forEach((f, i) => (next === 'grid' ? slots[i] : items[i]).appendChild(f));
      flipping = false;
      return;
    }

    Flip.killFlipsOf(flips);
    flipping = true;
    const state = Flip.getState(flips, { props: 'filter' });
    flips.forEach((f, i) => (next === 'grid' ? slots[i] : items[i]).appendChild(f));
    const each = next === 'grid' ? 0.015 : 0.02;
    const cols = 5;

    Flip.from(state, {
      duration: FLIP_DUR,
      ease: EASES[cfg.morph],
      absolute: true,
      nested: true,
      scale: true,
      prune: true,
      stagger: (i) => {
        const d =
          next === 'grid'
            ? Math.max(
                Math.abs((i % cols) - (lead % cols)),
                Math.abs(Math.floor(i / cols) - Math.floor(lead / cols))
              )
            : Math.min(mod(i - lead, N), mod(lead - i, N));
        return d * each;
      },
      onComplete: () => {
        flipping = false;
      },
    });
  };

  carBtn.addEventListener('click', () => setView('carousel'), { signal });
  gridBtn.addEventListener('click', () => setView('grid'), { signal });

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (canHover) {
    flips.forEach((flip, i) => {
      flip.addEventListener(
        'pointerenter',
        () => {
          if (hoverIdx === i) return;
          hoverIdx = i;
          setImages();
          setMeta(i);
        },
        { signal }
      );
      flip.addEventListener(
        'pointerleave',
        () => {
          if (hoverIdx !== i) return;
          hoverIdx = -1;
          setImages();
          setMeta(activeIdx);
        },
        { signal }
      );
    });
  }

  // gsap ticker signature: (time seconds, delta ms).
  const tick = (_t, dtMs) => {
    const dt = Math.min(dtMs, 64) / 1000 || 0.016;
    if (view === 'carousel' && !flipping) {
      if (dragging) {
        angle = damp(angle, target, cfg.weight, dt);
        dirty = true;
      } else if (!reduced) {
        momentum = damp(momentum, cfg.drift * dir, MOMENTUM_DECAY, dt);
        angle += momentum * dt;
        dirty = true;
      }
      const idx = mod(Math.round(-angle / SLICE), N);
      if (idx !== activeIdx) {
        activeIdx = idx;
        if (hoverIdx < 0) {
          setImages();
          setMeta(idx);
        }
      }
    }

    for (let d = 0; d < 2; d++) {
      const cur = Number(strips[d].dataset.y ?? '0');
      const next = reduced ? digitY[d] : damp(cur, digitY[d], DIGIT_DAMP, 1 / 60);
      if (Math.abs(next - cur) > 2e-4) {
        strips[d].dataset.y = String(next);
        strips[d].style.transform = `translateY(${next}em)`;
        dirty = true;
      }
    }

    if (view === 'carousel' && dirty) {
      dirty = false;
      layout();
    }
  };

  let startX = 0;
  let startY = 0;
  let pressAngle = 0;
  let axis = null;
  let lastDelta = 0;
  let lastMoveT = 0;
  let vel = 0;

  stage.addEventListener(
    'pointerdown',
    (e) => {
      if (view !== 'carousel' || flipping) return;
      if (e.target.closest?.('.rg__views')) return;
      dragging = true;
      axis = null;
      startX = e.clientX;
      startY = e.clientY;
      pressAngle = angle;
      target = angle;
      lastDelta = 0;
      vel = 0;
      lastMoveT = performance.now();
      rg.classList.add('is-dragging');
      stage.setPointerCapture?.(e.pointerId);
    },
    { signal }
  );

  window.addEventListener(
    'pointermove',
    (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!axis && Math.hypot(dx, dy) > LOCK_PX) {
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (!axis) return;
      const d = axis === 'x' ? dx : dy;
      target = pressAngle + d * DRAG_SCALE;
      const now = performance.now();
      const mdt = Math.max(1, now - lastMoveT);
      vel = ((d - lastDelta) * DRAG_SCALE) / (mdt / 1000);
      lastDelta = d;
      lastMoveT = now;
    },
    { signal }
  );

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    rg.classList.remove('is-dragging');
    if (Math.abs(vel) > 1) {
      momentum = clamp(vel, -900, 900);
      dir = Math.sign(momentum) || dir;
    }
  };
  window.addEventListener('pointerup', endDrag, { signal });
  window.addEventListener('pointercancel', endDrag, { signal });

  let wheelIdle;
  stage.addEventListener(
    'wheel',
    (e) => {
      if (view !== 'carousel' || flipping) return;
      e.preventDefault();
      dragging = true;
      target = (dragging ? target : angle) + e.deltaY * SCROLL_SCALE;
      dir = Math.sign(e.deltaY) || dir;
      clearTimeout(wheelIdle);
      wheelIdle = setTimeout(() => {
        dragging = false;
        momentum = clamp(e.deltaY * SCROLL_SCALE * 8, -900, 900);
      }, 90);
    },
    { passive: false, signal }
  );

  let keyIdle;
  rg.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        target = angle - SLICE;
        angle = damp(angle, target, 1, 1);
        dragging = true;
        clearTimeout(keyIdle);
        keyIdle = setTimeout(() => {
          dragging = false;
        }, 60);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        target = angle + SLICE;
        dragging = true;
        clearTimeout(keyIdle);
        keyIdle = setTimeout(() => {
          dragging = false;
        }, 60);
      } else if (e.key === 'g' || e.key === 'G') {
        setView(view === 'grid' ? 'carousel' : 'grid');
      }
    },
    { signal }
  );

  measure();
  activeIdx = mod(Math.round(-angle / SLICE), N);
  setMeta(activeIdx);
  setImages();
  layout();

  const ro = new ResizeObserver(() => {
    measure();
    dirty = true;
  });
  ro.observe(stage);
  gsap.ticker.add(tick);

  let introTl = null;
  if (!reduced) {
    gsap.set(flips, { clipPath: 'inset(100%)', willChange: 'clip-path' });
    gsap.set([meta, views], { opacity: 0, y: 26 });
    introTl = gsap.timeline({ delay: 0.1 });
    introTl.to(flips, {
      clipPath: 'inset(0%)',
      duration: 1.5,
      stagger: 0.07,
      ease: 'expo.out',
      clearProps: 'clipPath,willChange',
    });
    introTl.to(meta, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' }, '<0.1');
    introTl.to(views, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, '<0.35');
  }

  const set = (key, value) => {
    if (key === 'morph') {
      cfg.morph = String(value);
    } else if (key === 'imgEase') {
      if (Array.isArray(value) && value.length === 4) {
        cfg.imgEase = value;
        imgEase = toEase(easeId, cfg.imgEase);
      }
    } else if (key === 'perspective') {
      cfg.perspective = Number(value);
      carousel.style.perspective = `${cfg.perspective}px`;
    } else if (key in cfg) {
      cfg[key] = Number(value);
    }
  };

  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    ac.abort();
    ro.disconnect();
    gsap.ticker.remove(tick);
    clearTimeout(wheelIdle);
    clearTimeout(keyIdle);
    introTl?.kill();
    Flip.killFlipsOf(flips);
    gsap.killTweensOf([...imgs, ...items, ...flips, meta, views, rg]);
    rg.remove();
  };

  // Register with Jesper's page lifecycle so route-away cleans up even if
  // the caller forgets. Also return for manual use.
  onDestroy(destroy);

  return { destroy, set };
}

/**
 * Carter's default export shape: `{ mount, config }`.
 * Kept for fidelity; Jesper's integration uses the named `mountRotatingGallery`.
 */
const RotatingGallery = {
  mount: mountRotatingGallery,
  config,
};

export default RotatingGallery;
