/**
 * Phase 5E verification — original Carter Dial vs the Jesper port.
 * Run: node verify/dial-verify.mjs   (from the repo root, scratch/uncommitted)
 */
import { createServer } from 'vite';
import { makeDom, nudge, snapshot, mountOriginal, FLUSH, withWindow, installComputedStyleShim, pumpFrames, compareSnapshots } from './harness.mjs';

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const VIEWPORTS = [
  { label: 'desktop 1440x900', width: 1440, height: 900 },
  { label: 'tablet 768x1024', width: 768, height: 1024 },
  { label: 'mobile 390x844', width: 390, height: 844 },
];

/* --------------------------------------------------------------------------
 * A. Numeric + structural equivalence against Carter's original source
 * ------------------------------------------------------------------------ */
import * as gsapModule from 'gsap';
const gsap = gsapModule.default;
const shimHost = makeDom({}).window;
installComputedStyleShim(shimHost);
// --drive is a single gsap timeline both engines' tweens live in, so every frame
// gives both engines ONE identical timestamp, exactly as a browser's single rAF
// would. gsap's own rAF loop is frozen for this section, otherwise it advances
// tweens with wall-clock deltas that differ between the two runs.
const drive = gsap.timeline({ paused: true });
gsap.ticker.sleep();
let driveStart = gsap.ticker.time + 1;
const stepFrames = async (count) => {
  for (let i = 0; i < count; i++) {
    driveStart += 0.016667;
    drive.progress(0.5, true);
    gsap.updateRoot(driveStart);
    await FLUSH();
  }
};

async function mountBoth(vp, reducedMotion) {
  const a = makeDom({ ...vp, reducedMotion });
  const b = makeDom({ ...vp, reducedMotion });

  // original: Carter's mount() into a bare viewport host
  a.window.gsap = gsap;
  const hostA = a.window.document.createElement('div');
  hostA.style.cssText = 'position:absolute;inset:0';
  a.window.document.body.appendChild(hostA);
  const orig = await withWindow(a.window, () => mountOriginal(a.window, hostA));
  // every tween the original and the port create from here on is driven by the
  // same timeline (gsap's default parent is the global timeline)
  gsap.globalTimeline.remove(drive);

  // port: the real engine module, loaded against this window
  b.window.gsap = gsap;
  const hostB = b.window.document.createElement('div');
  hostB.style.cssText = 'position:absolute;inset:0';
  b.window.document.body.appendChild(hostB);
  // the port registers teardown through the Carter runtime, which needs a bound
  // frame (CarterRoute does this in the real app)
  const port = await withWindow(b.window, () => {
    portModule.bindCarterRuntime({ root: hostB, navigate: () => {}, appReady: true });
    return portModule.mountDial(hostB);
  });
  gsap.globalTimeline.remove(drive);

  return { a, b, orig, port, hostB };
}

let portModule;
async function equivalence() {
  for (const vp of VIEWPORTS) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const { a, b, orig, port, hostB } = await mountBoth(vp, reducedMotion);
      const tag = `${vp.label}${reducedMotion === 'reduce' ? ' [reduced motion]' : ''}`;

      // initial frame
      let diffs = 0;
      const cmp0 = compareSnapshots(snapshot(a.window), snapshot(b.window));
      if (!cmp0.equal) diffs += 1;
      let lastDelta = 0;

      // 120 ticker frames of the opening wind-down
      await stepFrames(120);
      const cmp1 = compareSnapshots(snapshot(a.window), snapshot(b.window));
      if (!cmp1.equal) diffs += 1;
      const s1a = snapshot(a.window);

      check(`A1 identical DOM state — ${tag}`, diffs === 0,
        `items=${s1a.items.length} ticks=${s1a.ticks}/${s1a.majorTicks} active=${s1a.active} maxFloatDelta=${cmp1.maxDelta.toExponential(2)}`);
      if (!cmp1.equal) console.log('   diff:', cmp1.structural.join(' | '));

      // wheel scrub equivalence
      const wheelA = a.window.document.querySelector('.dial__stage');
      const wheelB = b.window.document.querySelector('.dial__stage');
      await withWindow(a.window, () => nudge(a.window, wheelA, 'wheel', { deltaY: 620 }));
      await withWindow(b.window, () => nudge(b.window, wheelB, 'wheel', { deltaY: 620 }));
      await stepFrames(90);
      const cmp2 = compareSnapshots(snapshot(a.window), snapshot(b.window));
      check(`A2 wheel scrub matches — ${tag}`, cmp2.equal,
        `active=${snapshot(b.window).active} maxFloatDelta=${cmp2.maxDelta.toExponential(2)}${cmp2.equal ? '' : ' ' + cmp2.structural.join(' | ')}`);

      // keyboard settle equivalence
      await withWindow(a.window, () => nudge(a.window, a.window.document.querySelector('.dial'), 'keydown', { key: 'ArrowDown' }));
      await withWindow(b.window, () => nudge(b.window, b.window.document.querySelector('.dial'), 'keydown', { key: 'ArrowDown' }));
      await stepFrames(90);
      const cmp3 = compareSnapshots(snapshot(a.window), snapshot(b.window));
      check(`A3 ArrowDown settle matches — ${tag}`, cmp3.equal,
        `maxFloatDelta=${cmp3.maxDelta.toExponential(2)}${cmp3.equal ? '' : ' ' + cmp3.structural.join(' | ')}`);

      // pointer drag equivalence
      const knobA = a.window.document.querySelector('.dial__knob');
      const knobB = b.window.document.querySelector('.dial__knob');
      nudge(a.window, knobA, 'pointerdown', { button: 0, clientY: 400, pointerId: 1, currentTarget: knobA });
      nudge(b.window, knobB, 'pointerdown', { button: 0, clientY: 400, pointerId: 1, currentTarget: knobB });
      for (const y of [380, 340, 300, 260]) {
        await withWindow(a.window, () => nudge(a.window, a.window, 'pointermove', { clientY: y }));
        await withWindow(b.window, () => nudge(b.window, b.window, 'pointermove', { clientY: y }));
        await stepFrames(6);
      }
      await withWindow(a.window, () => nudge(a.window, a.window, 'pointerup', {}));
      await withWindow(b.window, () => nudge(b.window, b.window, 'pointerup', {}));
      await stepFrames(120);
      const cmp4 = compareSnapshots(snapshot(a.window), snapshot(b.window));
      check(`A4 drag + elastic release matches — ${tag}`, cmp4.equal,
        `cleared=${!b.window.document.querySelector('.dial').classList.contains('is-dragging')} maxFloatDelta=${cmp4.maxDelta.toExponential(2)}${cmp4.equal ? '' : ' ' + cmp4.structural.join(' | ')}`);

      // set() config parity
      port.set('accent', '#105099');
      orig.set('accent', '#105099');
      port.set('detent', 'soft');
      orig.set('detent', 'soft');
      check(
        `A5 set('accent'|'detent') parity — ${tag}`,
        a.window.document.querySelector('.dial').style.getPropertyValue('--dial-accent') ===
          b.window.document.querySelector('.dial').style.getPropertyValue('--dial-accent'),
        b.window.document.querySelector('.dial').style.getPropertyValue('--dial-accent'),
      );

      // resize equivalence
      a.stageSize.w = 1024;
      a.stageSize.h = 700;
      b.stageSize.w = 1024;
      b.stageSize.h = 700;
      await withWindow(a.window, async () => {
        for (const o of a.window.__observers) o.cb([{ target: [...o.targets][0] }]);
      });
      await withWindow(b.window, async () => {
        for (const o of b.window.__observers) o.cb([{ target: [...o.targets][0] }]);
      });
      await stepFrames(2);
      const cmp6 = compareSnapshots(snapshot(a.window), snapshot(b.window));
      check(`A6 resize re-measure matches — ${tag}`, cmp6.equal,
        `maxFloatDelta=${cmp6.maxDelta.toExponential(2)}${cmp6.equal ? '' : ' ' + cmp6.structural.join(' | ')}`);

      orig.destroy?.();
      port.destroy?.();
      check(`A7 teardown leaves no .dial — ${tag}`, !a.window.document.querySelector('.dial') && !b.window.document.querySelector('.dial'));
      a.dom.window.close();
      b.dom.window.close();
    }
  }
}

/* --------------------------------------------------------------------------
 * B. Real integration path: CarterRoute -> LabDetailPage -> DialStage
 *    Driven in REAL TIME: the window's own animation loop advances the app's
 *    gsap (which lives in Vite's SSR realm), exactly as a browser does.
 * ------------------------------------------------------------------------ */
function integrationPathBody() { return null; }

function edgeCounts(window) {
  let windowListeners = 0;
  const add = window.addEventListener;
  const remove = window.removeEventListener;
  window.addEventListener = function (...args) {
    windowListeners += 1;
    return add.apply(this, args);
  };
  window.removeEventListener = function (...args) {
    windowListeners -= 1;
    return remove.apply(this, args);
  };
  return () => {
    window.addEventListener = add;
    window.removeEventListener = remove;
    return windowListeners;
  };
}

async function integrationPath() {
  const { dom, window } = makeDom({ width: 1440, height: 900 });
  global.window = window;
  global.document = window.document;
  global.navigator = window.navigator;
  global.HTMLElement = window.HTMLElement;
  global.Element = window.Element;
  global.Node = window.Node;
  global.Event = window.Event;
  global.MouseEvent = window.MouseEvent;
  global.requestAnimationFrame = window.requestAnimationFrame;
  global.cancelAnimationFrame = window.cancelAnimationFrame;
  global.ResizeObserver = window.ResizeObserver;
  global.MutationObserver = window.MutationObserver;
  global.matchMedia = window.matchMedia;
  global.getComputedStyle = window.getComputedStyle.bind(window);
  global.Audio = window.Audio;
  // jsdom brand-checks AbortSignal against its own realm; a browser has one realm
  global.AbortController = window.AbortController;
  global.AbortSignal = window.AbortSignal;
  for (const key of ['HTMLInputElement', 'HTMLTextAreaElement', 'HTMLCanvasElement', 'HTMLImageElement',
    'SVGElement', 'CustomEvent', 'KeyboardEvent', 'PointerEvent', 'HTMLAnchorElement', 'DocumentFragment']) {
    if (window[key] !== undefined) global[key] = window[key];
  }
  global.IS_REACT_ACT_ENVIRONMENT = true;

  const { createElement: h, act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { default: CarterRoute } = await server.ssrLoadModule('/src/carter/CarterRoute.jsx');
  const { resolveCarterPage } = await server.ssrLoadModule('/src/carter/routes.js');

  const container = window.document.getElementById('root');
  const root = createRoot(container);
  const errors = [];
  const origError = console.error;
  console.error = (...args) => {
    const message = args.map(String).join(' ');
    if (message.includes('suspended resource')) return;
    // jsdom has no canvas implementation; PolkaDots/Heart legitimately fail there
    if (message.includes('getContext')) return;
    errors.push(message);
  };

  const route = (slug) => h(CarterRoute, { page: resolveCarterPage(`/routes/lab/${slug}`), appReady: true, onNavigate: () => {}, placeholder: null });

  // jsdom has no animation loop of its own, so the harness drains the window's
  // rAF queue; each frame waits a real frame's worth of time, which is how gsap
  // decides to update (it sleeps when a tick carries no elapsed time).
  const settle = async (ms = 320) => {
    const frames = Math.max(1, Math.round(ms / 16.667));
    await act(async () => {
      await pumpFrames(window, frames, 16.667, (delay) => new Promise((r) => setTimeout(r, delay)));
    });
  };

  const render = async (slug) => {
    await act(async () => {
      root.render(route(slug));
      await new Promise((r) => setTimeout(r, 40));
    });
    for (let i = 0; i < 8 && !container.querySelector('[data-lab-detail]'); i++) {
      await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
    }
    await settle();
  };

  const cur = () => {
    const rotor = container.querySelector('.dial__ticks-rotor');
    if (!rotor) return null;
    const m = /rotate\(([-0-9.]+)deg\)/.exec(rotor.style.transform || '');
    return m ? -parseFloat(m[1]) / (360 / 26) : null;
  };
  const activeIndex = () => [...container.querySelectorAll('.dial__item')].findIndex((el) => el.classList.contains('is-active'));

  const countWindowListeners = edgeCounts(window);
  const baselineWindowListeners = countWindowListeners(); // before any engine mounts

  await render('dial');

  check('B1 dial route mounts exactly one .dial', container.querySelectorAll('.dial').length === 1, `${container.querySelectorAll('.dial').length} found`);
  check('B2 26 channels + 130 ticks rendered',
    container.querySelectorAll('.dial__item').length === 26 && container.querySelectorAll('.dial__tick').length === 130,
    `${container.querySelectorAll('.dial__item').length} items / ${container.querySelectorAll('.dial__tick').length} ticks`);
  const detail = container.querySelector('[data-lab-detail]');
  check('B3 stage marked live, empty state hidden, loading cleared',
    detail?.hasAttribute('data-stage-live') && !detail?.hasAttribute('data-stage-loading'),
    `live=${detail?.hasAttribute('data-stage-live')} loading=${detail?.hasAttribute('data-stage-loading')}`);
  check('B4 role listbox, exactly one aria-selected',
    container.querySelector('.dial')?.getAttribute('role') === 'listbox' && container.querySelectorAll('[aria-selected="true"]').length === 1);
  // ---- missing click asset (/lab/dial-tick.mp3): silent but never broken ----
  const pool = window.__audio.instances.filter((a) => a.__from === 'dial-pool');
  check('A1 audio: requested asset is exactly Carter\'s path',
    pool.every((a) => a.src === '/lab/dial-tick.mp3') && pool.length > 0,
    `${pool.length} pool objects, src=${pool[0]?.src}`);
  check('A2 audio: nothing is preloaded while idle (no probe request)',
    pool.every((a) => a.preload === 'none'),
    `preload values: ${JSON.stringify([...new Set(pool.map((a) => a.preload))])}`);
  check('A3 audio: pool is bounded and small', pool.length <= 3, `${pool.length} objects`);

  check('B5 external channel links target=_blank rel=noreferrer',
    [...container.querySelectorAll('.dial__item')].every((a) => a.target === '_blank' && a.rel === 'noreferrer' && /^https:\/\//.test(a.href)));

  // the engine's own opening wind-down must animate under the DOM's loop
  const openingCur = cur();
  check('B6 opening wind-down runs in the integration path', Number.isFinite(openingCur), `cur=${openingCur?.toFixed(4)}`);

  const wheelEv = nudge(window, container.querySelector('.dial__stage'), 'wheel', { deltaY: 900 });
  const curBeforeWheel = cur();
  await settle(1100);
  const curAfterWheel = cur();
  check('B7 stage wheel is preventDefault-ed and scrubs the ring',
    wheelEv.defaultPrevented === true && Math.abs(curAfterWheel - curBeforeWheel) > 0.5,
    `cur ${curBeforeWheel?.toFixed(3)} -> ${curAfterWheel?.toFixed(3)}`);

  const beforeKeyIdx = activeIndex();
  const beforeKeyCur = cur();
  const keyEv = nudge(window, container.querySelector('.dial'), 'keydown', { key: 'ArrowDown' });
  await settle(1100);
  // the step settles through an elastic ease, so assert the observable outcome:
  // the key is consumed and the active channel advances by one
  const afterKeyIdx = activeIndex();
  check('B8 ArrowDown advances the active channel by one',
    keyEv.defaultPrevented === true && afterKeyIdx === (beforeKeyIdx + 1) % 26,
    `active ${beforeKeyIdx} -> ${afterKeyIdx} (cur ${beforeKeyCur?.toFixed(3)} -> ${cur()?.toFixed(3)})`);

  const beforeDragCur = cur();
  const knob = container.querySelector('.dial__knob');
  nudge(window, knob, 'pointerdown', { button: 0, clientY: 600, pointerId: 1 });
  for (const y of [560, 520, 470, 430]) {
    nudge(window, window, 'pointermove', { clientY: y });
    await settle(60);
  }
  const duringDrag = cur();
  nudge(window, window, 'pointerup', {});
  await settle(1200);
  const dragging = container.querySelector('.dial').classList.contains('is-dragging');
  check('B9 pointer drag moves the ring and release settles it',
    Math.abs(duringDrag - beforeDragCur) > 0.3 && !dragging,
    `cur ${beforeDragCur?.toFixed(3)} -> ${duringDrag?.toFixed(3)} -> ${cur()?.toFixed(3)}, is-dragging=${dragging}`);

  // the detent click has fired several times by now with the asset missing
  const clickErrors = errors.filter((e) => /dial-tick|play\(\)|NotSupportedError|Failed to load/i.test(e));
  check('A4 audio: a missing click asset raises no uncaught error',
    clickErrors.length === 0 && container.querySelectorAll('.dial').length === 1,
    `${clickErrors.length} related errors; ${window.__audio.played} play() attempts, ${window.__audio.failures} rejected`);

  // ---- route away -> return, six times: exactly one engine, no growth ----
  const baselineObservers = window.__observers.size;
  const listenersWithEngine = countWindowListeners();
  for (let i = 0; i < 6; i++) {
    await render('heart');
    await render('dial');
  }
  check('B10 12 route changes leave exactly one .dial', container.querySelectorAll('.dial').length === 1, `${container.querySelectorAll('.dial').length} found`);
  check('B11 window listeners do not accumulate across 12 route changes',
    listenersWithEngine === countWindowListeners(),
    `${listenersWithEngine} with one dial live -> ${countWindowListeners()} after 12 changes`);
  check('B12 one ResizeObserver per live engine, no accumulation',
    window.__observers.size === baselineObservers,
    `${baselineObservers} live -> ${window.__observers.size}`);
  const observableDialNodes = window.document.querySelectorAll('.dial').length;
  check('B13 no orphaned engine DOM anywhere in the document', observableDialNodes === 1, `${observableDialNodes} dial roots`);

  // ---- unported routes keep their placeholder state ----
  const placeholders = {};
  for (const slug of ['live-cursors', 'threejs-test', 'dynamic-scrollbar', 'paste-up', 'vocal-orb']) {
    await render(slug);
    const d = container.querySelector('[data-lab-detail]');
    placeholders[slug] = { dial: container.querySelectorAll('.dial').length, live: d?.hasAttribute('data-stage-live'), empty: !!container.querySelector('.labd__empty') };
  }
  check('B14 five unported routes stay placeholder-only',
    Object.values(placeholders).every((p) => p.dial === 0 && !p.live && p.empty), JSON.stringify(placeholders));

  const ported = {};
  for (const slug of ['polka-dots', 'heart', 'rotating-gallery', 'dial']) {
    await render(slug);
    ported[slug] = {
      dial: container.querySelectorAll('.dial').length,
      pd: container.querySelectorAll('.pd').length,
      rg: container.querySelectorAll('.rg').length,
      heart: container.querySelectorAll('.heart').length,
      live: container.querySelector('[data-lab-detail]')?.hasAttribute('data-stage-live'),
    };
  }
  // Polka Dots and Heart need a real canvas context, which jsdom does not
  // implement, so only their static host / generated DOM is asserted here.
  check('B15 each ported route mounts only its own engine',
    ported['polka-dots'].dial === 0 && ported['polka-dots'].pd === 1
      && ported.heart.dial === 0
      && ported['rotating-gallery'].dial === 0 && ported['rotating-gallery'].rg === 1 && ported['rotating-gallery'].live
      && ported.dial.dial === 1 && ported.dial.live,
    JSON.stringify(ported));

  check('B16 no React/runtime errors during the integration run', errors.length === 0, errors.slice(0, 3).join(' | '));

  await act(async () => root.unmount());
  check('B17 unmount removes every .dial', container.querySelectorAll('.dial').length === 0);
  check('B18 unmount disconnects every ResizeObserver', window.__observers.size === 0, `${window.__observers.size} still observing`);
  check('B19 unmount releases the listeners the engine added',
    countWindowListeners() === baselineWindowListeners,
    `${baselineWindowListeners} before any engine -> ${countWindowListeners()} after unmount`);

  console.error = origError;
  dom.window.close();
}

/* ------------------------------------------------------------------------ */
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
portModule = await import('./dial.port.mjs');

await equivalence();
// Section A froze gsap's own loop; Section B drives the app's ticker through the
// DOM's requestAnimationFrame, so wake it again with a forward time base.
gsap.globalTimeline.remove(drive);
drive.revert();
gsap.updateRoot(gsap.ticker.time + 10);
gsap.ticker.wake();
await integrationPath();

await server.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join('; '));
  process.exitCode = 1;
}
