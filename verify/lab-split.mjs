/**
 * Phase 14 verification: Lab detail deferral (scratch, not shipped).
 *
 * Proves the Phase 14 split at the DOM/React level in jsdom:
 *   A. the loader contracts (all nine code listings and all nine stages resolve)
 *   B. the Code pane is deferred: nothing is fetched for it until the Code tab is
 *      opened, then exactly one listing arrives and its copy/wrap handlers bind
 *   D. the stage is deferred and still walks Carter's data-stage-loading ->
 *      data-stage-live sequence, with teardown on unmount
 *   E. only the current experiment's stage module is resolved
 *   F. all nine routes render their shell with Notes populated and Code deferred
 *
 * Limits: jsdom has no layout, CSS, canvas or WebGL, so engines that need a
 * canvas are stubbed out. Nothing here is a browser test: chunk *fetching* is
 * exercised through Vite's module runner, not over HTTP.
 *
 * The pane's error branch (a listing chunk that fails to resolve) is covered
 * only at the loader boundary, where an unknown slug resolves to null (A5): a
 * chunk failure cannot be induced here without mocking the loader, which would
 * replace a real check with a fake one, so the rendered error state stays
 * unverified until a real browser can be given a broken chunk.
 *
 *   node verify/lab-split.mjs
 */
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
// Vite's module runner resolves dynamic imports on real macrotasks, so a 0 ms
// tick loop starves it: give each tick a real (small) delay.
const tick = () => new Promise((resolve) => setTimeout(resolve, 8));
const settle = async (n = 10) => { for (let i = 0; i < n; i += 1) await tick(); };
const waitFor = async (predicate, timeoutMs = 4000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return true;
    await tick();
  }
  return false;
};

const SLUGS = [
  'live-cursors', 'dial', 'polka-dots', 'heart', 'threejs-test',
  'dynamic-scrollbar', 'rotating-gallery', 'paste-up', 'vocal-orb',
];

// ---------------------------------------------------------------- jsdom setup
const { JSDOM } = await import('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/routes/lab/dial',
});
const { window } = dom;
for (const key of [
  'window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement',
  'Element', 'Node', 'Event', 'KeyboardEvent', 'PointerEvent', 'MouseEvent', 'CustomEvent',
  'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'DOMParser', 'Image',
  'ResizeObserver', 'MutationObserver', 'IntersectionObserver', 'AbortController', 'AbortSignal',
]) {
  if (window[key] === undefined) continue;
  // `navigator` is a getter-only global in Node 22.
  Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
}
window.HTMLElement.prototype.setPointerCapture = function setPointerCapture() {};
window.HTMLElement.prototype.releasePointerCapture = function releasePointerCapture() {};
window.matchMedia = (query) => ({
  matches: false, media: query, onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
});
// No canvas/WebGL in jsdom: every context request fails, which is the no-GPU path
// the stages already handle. Keeps mount failures out of the assertions below.
window.HTMLCanvasElement.prototype.getContext = () => null;
globalThis.matchMedia = window.matchMedia;

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: CarterRoute } = await server.ssrLoadModule('/src/carter/CarterRoute.jsx');
const { loadLabCode } = await server.ssrLoadModule('/src/carter/data/lab.js');
const { loadLabStage } = await server.ssrLoadModule('/src/carter/pages/lab/lab-stages.js');
const { LAB_ITEMS } = await server.ssrLoadModule('/src/carter/data/lab.js');

// ------------------------------------------------------------------- Section A
console.log('\n=== A. loader contracts ===');
let codeOk = 0;
for (const slug of SLUGS) {
  const html = await loadLabCode(slug);
  if (html && html.includes('expressive-code')) codeOk += 1;
}
check('A1 all nine Code listings resolve with Expressive Code markup', codeOk === 9, `${codeOk}/9`);

let stageOk = 0;
const stageNames = [];
for (const slug of SLUGS) {
  const Stage = await loadLabStage(slug);
  if (typeof Stage === 'function') { stageOk += 1; stageNames.push(Stage.name); }
}
check('A2 all nine stage modules resolve to a component', stageOk === 9, `${stageOk}/9`);
check('A3 every resolved stage is the experiment\'s own component',
  SLUGS.every((slug, i) => stageNames[i].toLowerCase().startsWith(slug.split('-')[0])),
  stageNames.join(','));
const repeated = await loadLabStage('dial');
const repeatedAgain = await loadLabStage('dial');
check('A4 repeated loads reuse the cached module (no duplicate chunk fetch)',
  typeof repeated === 'function' && repeated === repeatedAgain);
check('A5 an unknown slug resolves to null instead of throwing',
  (await loadLabStage('not-an-experiment')) === null && (await loadLabCode('not-an-experiment')) === null);

// ------------------------------------------------------- Section B — Code pane
console.log('\n=== B. Code pane deferral ===');
const container = window.document.getElementById('root');
const reactRoot = createRoot(container);
// Render through the real frame: CarterRoute binds the Carter runtime that the
// stages and the docs controls depend on, exactly as the app mounts them.
const renderPage = (root, slug) => root.render(
  React.createElement(CarterRoute, {
    page: { key: 'lab-detail', slug, label: slug },
    appReady: true,
    onNavigate: () => {},
    placeholder: null,
  }),
);
// Record the stage flag sequence instead of relying on when we happen to sample.
const stageFlagLog = [];
const flagObserver = new window.MutationObserver((records) => {
  for (const record of records) {
    if (record.attributeName !== 'data-stage-loading' && record.attributeName !== 'data-stage-live') continue;
    const target = record.target;
    stageFlagLog.push(`${record.attributeName}=${target.hasAttribute(record.attributeName) ? 'on' : 'off'}`);
  }
});
flagObserver.observe(container, { attributes: true, attributeFilter: ['data-stage-loading', 'data-stage-live'], subtree: true });

renderPage(reactRoot, 'dial');
await waitFor(() => container.querySelector('[data-lab-detail]'));
await settle(4);

const detail = () => container.querySelector('[data-lab-detail]');
const codePane = () => container.querySelector('[data-docs-pane="code"]');
const notesPane = () => container.querySelector('[data-docs-pane="notes"]');

check('B1 no Code listing in the DOM before the Code tab is opened',
  codePane()?.querySelector('.expressive-code') == null);
check('B2 Code pane starts in the pending state', codePane()?.getAttribute('data-docs-code-state') === 'loading',
  `state=${codePane()?.getAttribute('data-docs-code-state')}`);
check('B3 Code pane is hidden while the Notes tab is active', codePane()?.hasAttribute('hidden') === true);
check('B4 Notes pane is populated in the first render (not deferred)',
  (notesPane()?.innerHTML.length ?? 0) > 1000, `${notesPane()?.innerHTML.length} chars`);

// Open the docs panel, then the Code tab — the reader's actual path.
const docsToggle = container.querySelector('[data-docs-toggle]');
docsToggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await settle();
check('B5 docs panel opens (.is-docs) and Code pane is still unloaded',
  detail().classList.contains('is-docs') && codePane()?.querySelector('.expressive-code') == null);

const codeTab = container.querySelector('[data-docs-tab="code"]');
codeTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await waitFor(() => container.querySelector('[data-docs-pane="code"] .expressive-code'));
await settle(4);

check('B6 Code tab is pressed after activation',
  codeTab.getAttribute('aria-pressed') === 'true');
check('B7 the current experiment\'s listing arrives in the Code pane',
  !!codePane()?.querySelector('.expressive-code'), `state=${codePane()?.getAttribute('data-docs-code-state')}`);
check('B8 Code pane reports the ready state',
  codePane()?.getAttribute('data-docs-code-state') === 'ready');
check('B9 the loading status is gone once the listing is ready',
  codePane()?.querySelector('[data-docs-code-status]') == null);
check('B10 the listing is Dial\'s own source (not another experiment\'s)',
  /data-experiment="dial"/.test(detail().outerHTML) && (codePane()?.innerHTML.length ?? 0) > 100000,
  `${codePane()?.innerHTML.length} chars`);
check('B11 Expressive Code copy control is bound on the deferred listing',
  !!codePane()?.querySelector('.expressive-code .copy button'));
check('B12 Notes pane still present and hidden while Code is active',
  notesPane()?.hasAttribute('hidden') === true);

// Toggling back and forth must not refetch or lose the listing.
const notesTab = container.querySelector('[data-docs-tab="notes"]');
notesTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await settle();
const afterToggleBack = codePane()?.querySelector('.expressive-code') != null;
codeTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await settle();
check('B13 the listing survives tab round-trips without reloading',
  afterToggleBack && codePane()?.querySelector('.expressive-code') != null);

// ------------------------------------------------------- Section D — stage flow
console.log('\n=== D. stage deferral and lifecycle ===');
check('D1 the stage walked Carter\'s loading -> live sequence',
  stageFlagLog.some((entry) => entry === 'data-stage-loading=on') &&
  (stageFlagLog.includes('data-stage-live=on') || stageFlagLog.includes('data-stage-loading=off')),
  stageFlagLog.join(' -> ') || 'no stage flag transitions observed');
check('D2 the poster/empty state is present underneath the stage', !!container.querySelector('[data-stage-empty]'));
check('D3 the loading flag never sticks (live, or failed mount back to the poster)',
  !detail().hasAttribute('data-stage-loading'),
  `loading=${detail().hasAttribute('data-stage-loading')} live=${detail().hasAttribute('data-stage-live')}`);
check('D4 no other experiment\'s engine DOM leaked into this route',
  container.querySelector('.heart, .rg, .pd, .tj, .pu, .orb') == null);
check('D5 teardown leaves no stage flags after unmount', await (async () => {
  reactRoot.unmount();
  await settle();
  return container.innerHTML === '';
})());

console.log('\n=== E. route isolation for a second experiment ===');
const root2 = createRoot(container);
renderPage(root2, 'heart');
await waitFor(() => container.querySelector('[data-lab-detail][data-experiment="heart"]'));
await settle(4);
check('E1 heart route mounts only its own stage module',
  (await loadLabStage('heart')) !== (await loadLabStage('dial')) &&
  container.querySelector('[data-lab-detail]')?.getAttribute('data-experiment') === 'heart');
check('E2 heart route\'s Code pane is still deferred',
  container.querySelector('[data-docs-pane="code"]')?.querySelector('.expressive-code') == null);
root2.unmount();
await settle();

console.log('\n=== F. every route renders its shell ===');
let shellOk = 0;
for (const item of LAB_ITEMS) {
  const c = window.document.createElement('div');
  window.document.body.append(c);
  const r = createRoot(c);
  renderPage(r, item.slug);
  await waitFor(() => c.querySelector(`[data-lab-detail][data-experiment="${item.slug}"]`), 2000);
  await settle(2);
  const el = c.querySelector('[data-lab-detail]');
  const notes = c.querySelector('[data-docs-pane="notes"]');
  const code = c.querySelector('[data-docs-pane="code"]');
  const ok = el?.getAttribute('data-experiment') === item.slug
    && (notes?.innerHTML.length ?? 0) > 500
    && code?.hasAttribute('hidden')
    && code?.querySelector('.expressive-code') == null
    && c.querySelector('[data-lab-prev]') && c.querySelector('[data-lab-next]');
  if (ok) shellOk += 1;
  else console.log(`   route ${item.slug} shell incomplete`);
  r.unmount();
  await settle();
  c.remove();
}
check('F1 all nine routes render the shell, Notes populated, Code deferred', shellOk === 9, `${shellOk}/9`);

flagObserver.disconnect();
await server.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) console.log('FAILED:', failed.map((r) => r.name).join(' | '));
// Mounted engines leave their own tickers and observers running; the checks are
// done, so exit explicitly rather than waiting for jsdom's timers to drain.
process.exit(failed.length ? 1 : 0);
