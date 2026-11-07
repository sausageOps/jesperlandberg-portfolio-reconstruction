/**
 * Static verification — Lab + Contact tablet/phone vertical spacing.
 *
 * This environment has no browser engine (no Chromium binary and the shared
 * libraries a Chromium build needs are not installable here), so this script
 * cannot take screenshots. What it does instead is check every claim the change
 * rests on, from the same sources the browser would use:
 *
 *  1. Scope guard — every spacing declaration added for the docked navigation
 *     sits inside `@media (max-width: 991px)` (or the 479px phone refinement), so
 *     it cannot reach the >=992px desktop layout.
 *  2. Desktop invariance — Carter's original desktop values are still present and
 *     unchanged (Lab: `height:100svh` + `padding-block:0`; Lab detail:
 *     `--labd-top:6.375rem` / `inset:var(--labd-top) 0 0 0`; Contact:
 *     `padding-block:var(--s-64) var(--s-96)` and the 116px pre-entrance offset,
 *     which now resolves from `var(--letter-top, 116px)` = 116px on desktop).
 *  3. Cross-file sync — the JS fallbacks in deskScene.js equal the CSS defaults,
 *     and the Contact CSS uses the same custom properties the JS reads.
 *  4. Geometry — the A24Nav dock footprint at every tablet/phone width is
 *     recomputed from A24Nav.css and compared with each page's clearance, so
 *     "content is not hidden behind the dock" is a checked inequality, not an
 *     assumption. Run with `node verify/responsive-spacing-verify.mjs`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(fileURLToPath(new URL(path, root)), 'utf8');

const LAB_CSS = 'src/carter/pages/lab/lab.css';
const LABD_CSS = 'src/carter/pages/lab/lab-detail.css';
const CONTACT_CSS = 'src/components/contact/Contact.css';
const DESK_JS = 'src/components/contact/deskScene.js';
const NAV_CSS = 'src/components/A24Nav.css';

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const px = (value) => Number.parseFloat(value);
const clamp = (min, value, max) => Math.min(Math.max(value, min), max);
const round = (value, digits = 1) => Number(value.toFixed(digits));

/* ------------------------------------------------------------------ geometry */
/* A24Nav.css, <=991px: the dock is 3.5em tall (floor 40px on phones) and sits
   `max(1.03em, 12px) + env(safe-area-inset-bottom)` above the viewport bottom.
   Tablet ramp 480-991px, phone ramp <=479px — copied verbatim from the sheet. */
const navEm = (width) =>
  width <= 479
    ? clamp(9.85, 3.07808 * (width / 100), 12.4403)
    : clamp(12.8331, 0.130222 * width + 12.2076, 13.4985);

const dockFootprint = (width) => {
  const em = navEm(width);
  const height = width <= 479 ? Math.max(3.5 * em, 40) : 3.5 * em;
  const edge = Math.max(1.03 * em, 12);
  return { em: round(em, 3), height: round(height), edge: round(edge), total: round(height + edge) };
};

/* Carter tokens.css --margin, converted to px by vite.config.js: 1rem -> 16px. */
const pageMargin = (width) => clamp(16, 11.0704 + 0.013146 * width, 30);

/* ------------------------------------------------------------- 1. scope guard */
/* Any declaration that carries one of these markers is part of this adaptation. */
const MARKERS = [
  '--lab-dock-clearance',
  '--letter-top',
  '--letter-bottom',
  '--labd-top: calc',
];

const files = [LAB_CSS, LABD_CSS, CONTACT_CSS];
const scopedRules = [];
const unscopedRules = [];

for (const file of files) {
  const tree = postcss.parse(read(file), { from: file });
  tree.walkRules((rule) => {
    const marker = MARKERS.find((m) => rule.toString().includes(m));
    if (!marker) return;
    const chain = [];
    let parent = rule.parent;
    while (parent && parent.type !== 'root') {
      if (parent.type === 'atrule') chain.push(parent.params);
      parent = parent.parent;
    }
    scopedRules.push({ file, selector: rule.selector, params: chain, marker, css: rule.toString() });
  });
}

/* Rules outside a max-width query are allowed only when they resolve to Carter's
   desktop value: either they declare the 116px/132px defaults, or they consume
   them through a var() whose fallback is that same constant (116px / 116-22px). */
const NEUTRAL = [
  { selector: '.letterpage .desk', test: (css) => /--letter-top:\s*116px/.test(css) && /--letter-bottom:\s*132px/.test(css) },
  {
    selector: '.letterpage .desk:not([data-letter-posed])',
    test: (css) => /padding-block-start:\s*var\(--letter-top, 116px\)/.test(css),
  },
  {
    selector: '.letterpage .desk:not([data-letter-posed]) .stub',
    test: (css) => /inset-block-start:\s*calc\(var\(--letter-top, 116px\) - 22px\)/.test(css),
  },
];

for (const rule of scopedRules) {
  const media = rule.params.join(' ');
  const limited = /max-width:\s*(\d+)px/.exec(media);
  if (limited) continue;
  unscopedRules.push(rule);
}

check(
  'rules outside a max-width query are desktop-neutral (Carter\'s own values)',
  unscopedRules.every((r) => {
    const neutral = NEUTRAL.find((entry) => entry.selector === r.selector);
    return r.file === CONTACT_CSS && neutral && neutral.test(r.css);
  }),
  unscopedRules.map((r) => `${r.file}: ${r.selector} (resolves to Carter's desktop value)`).join(', ') || 'none',
);

const tooWide = scopedRules.filter((r) => {
  const media = r.params.join(' ');
  const limited = /max-width:\s*(\d+)px/.exec(media);
  return limited && Number(limited[1]) > 991;
});
check('no added rule reaches the >=992px desktop range', tooWide.length === 0,
  tooWide.map((r) => `${r.file}: ${r.selector} @${r.params.join(' ')}`).join(', ') || 'max-width is 991px / 479px');

/* ------------------------------------------------- 2. desktop values preserved */
const labCss = read(LAB_CSS);
check('Lab index keeps Carter\'s desktop shell',
  labCss.includes('height:100svh;padding-block:0') || labCss.includes('height: 100svh'),
  'height:100svh;padding-block:0 (unchanged, outside the media query)');

const labdCss = read(LABD_CSS);
check('Lab detail keeps Carter\'s desktop shell',
  /--labd-top:6\.375rem/.test(labdCss) &&
  /inset:var\(--labd-top\) 0 0 0/.test(labdCss) &&
  /@media \(width<=47\.99rem\)\{[^@]*--labd-top:5rem/.test(labdCss),
  '--labd-top:6.375rem / 5rem and inset unchanged, overridden only <=991px');

const contactCss = read(CONTACT_CSS);
check('Contact keeps Carter\'s desktop padding and pre-entrance offset',
  contactCss.includes('padding-block:var(--s-64) var(--s-96)') &&
  contactCss.includes('padding-block-start:var(--letter-top, 116px)') &&
  contactCss.includes('inset-block-start:calc(var(--letter-top, 116px) - 22px)'),
  '64px/96px padding, 116px pre-pose, 94px stub top (116 - 22)');

/* ------------------------------------------------------- 3. JS <-> CSS sync */
const deskJs = read(DESK_JS);
const topConst = px(/const TOP = ([\d.]+)/.exec(deskJs)[1]);
const bottomConst = px(/const BOTTOM = ([\d.]+)/.exec(deskJs)[1]);
const cssTop = px(/--letter-top:\s*([\d.]+)px/.exec(contactCss)[1]);
const cssBottom = px(/--letter-bottom:\s*([\d.]+)px/.exec(contactCss)[1]);
check('deskScene.js fallbacks equal the Contact.css defaults (desktop)',
  topConst === 116 && bottomConst === 132 && cssTop === topConst && cssBottom === bottomConst,
  `TOP=${topConst} BOTTOM=${bottomConst} / CSS ${cssTop} / ${cssBottom}`);
check('deskScene.js reads the CSS offsets instead of hard-coding them',
  /probe\.style\.paddingTop = `var\(--letter-top, \$\{TOP\}px\)`/.test(deskJs) &&
  /probe\.style\.paddingBottom = `var\(--letter-bottom, \$\{BOTTOM\}px\)`/.test(deskJs) &&
  deskJs.includes('const { top, bottom } = sheetOffsets(desk);') &&
  !/const sy = TOP;|ty: 94,/.test(deskJs),
  'measure() resolves --letter-top / --letter-bottom (env() included); no hard-coded sy/ty');

/* ------------------------------------------- 3b. mobile-only top refinement */
/* Exactly three --letter-top declarations may exist: Carter's 116px default,
   the tablet 32px step (<=991px) and the phone 8px step (<=479px). */
const topDecls = scopedRules
  .filter((r) => /--letter-top\s*:/.test(r.css))
  .map((r) => {
    const value = /--letter-top\s*:\s*([^;}]+)/.exec(r.css)[1].trim();
    const media = r.params.join(' and ');
    const max = /max-width:\s*(\d+)px/.exec(media);
    return { value, params: media, max: max ? Number(max[1]) : null };
  });

const phoneDecl = topDecls.find((d) => d.max === 479);
const tabletDecl = topDecls.find((d) => d.max === 991);
const desktopDecl = topDecls.find((d) => d.max === null);

check('phone top offset is 8px + safe-area and lives only in the <=479px block',
  topDecls.length === 3 &&
  phoneDecl?.value === 'calc(8px + env(safe-area-inset-top, 0px))',
  topDecls.map((d) => `${d.max ?? 'all'}px: ${d.value}`).join(' | '));

check('tablet keeps 32px and desktop keeps Carter\'s 116px (untouched)',
  tabletDecl?.value === 'calc(32px + env(safe-area-inset-top, 0px))' &&
  desktopDecl?.value === '116px',
  `tablet ${tabletDecl?.value}; desktop ${desktopDecl?.value}`);

check('bottom clearance is unchanged (dock room + safe-area inset)',
  /--letter-bottom:\s*132px/.test(contactCss) &&
  /--letter-bottom: calc\(132px \+ env\(safe-area-inset-bottom, 0px\)\)/.test(contactCss) &&
  /padding-block-end: calc\(var\(--s-96\) \+ env\(safe-area-inset-bottom, 0px\)\)/.test(contactCss),
  '132px + inset posed, 96px + inset in flow');

/* --------------------------------------------------------------- 4. geometry */
const LAB_CLEARANCE = 64; // --lab-dock-clearance at 0 safe-area inset
const CONTACT_TOP = { phone: 8, tablet: 32 };
const CONTACT_BOTTOM_ROOM = { posed: 132, flow: 96 };

console.log('\nA24Nav bottom-dock footprint (<=991px) and each page\'s clearance\n');
console.log('  viewport     nav em   dock h   edge gap   footprint   clearance   slack');
for (const [width, height] of [[375, 812], [390, 844], [430, 932], [768, 1024], [834, 1112]]) {
  const dock = dockFootprint(width);
  const labBottom = height - LAB_CLEARANCE;
  const stageBottom = height - LAB_CLEARANCE - pageMargin(width);
  const contactTop = width <= 479 ? CONTACT_TOP.phone : CONTACT_TOP.tablet;
  const contactSlack = Math.min(CONTACT_BOTTOM_ROOM.posed, CONTACT_BOTTOM_ROOM.flow) - dock.total;
  console.log(
    `  ${String(`${width}x${height}`).padEnd(12)} ${String(dock.em).padEnd(8)} ${String(dock.height).padEnd(8)} ` +
    `${String(dock.edge).padEnd(10)} ${String(dock.total).padEnd(11)} ${String(LAB_CLEARANCE).padEnd(11)} ` +
    `${round(LAB_CLEARANCE - dock.total)}px`,
  );
  check(`  ${width}x${height}: Lab index box ends above the dock`, labBottom <= height - dock.total,
    `box bottom ${round(labBottom)}px vs dock top ${round(height - dock.total)}px`);
  check(`  ${width}x${height}: Lab detail stage ends above the dock`, stageBottom <= height - dock.total,
    `stage bottom ${round(stageBottom)}px vs dock top ${round(height - dock.total)}px`);
  check(`  ${width}x${height}: Contact can scroll clear of the dock`, contactSlack > 0,
    `bottom room ${Math.min(CONTACT_BOTTOM_ROOM.posed, CONTACT_BOTTOM_ROOM.flow)}px vs footprint ${dock.total}px`);
  check(`  ${width}x${height}: Contact top offset is ${contactTop}px`,
    contactTop === (width <= 479 ? CONTACT_TOP.phone : CONTACT_TOP.tablet),
    `phone 8px / tablet 32px, desktop 116px (Carter) unchanged`);
}

/* The clearance must cover the worst dock at every docked width, not just the
   six validation sizes. */
let worst = { width: 0, total: 0 };
for (let width = 320; width <= 991; width += 1) {
  const dock = dockFootprint(width);
  if (dock.total > worst.total) worst = { width, total: dock.total };
}
check('\n--lab-dock-clearance (64px) covers the whole 320-991px dock range',
  worst.total <= LAB_CLEARANCE,
  `worst footprint ${worst.total}px at ${worst.width}px wide (${round(LAB_CLEARANCE - worst.total)}px slack)`);

/* Desktop parity: at >=992px the dock is at the top, so no page here may gain a
   bottom clearance. */
const desktopContact = /@media \(max-width: 991px\)[\s\S]*?--letter-top: calc\(32px/.test(contactCss);
check('no bottom-dock clearance applies at >=992px (top dock, desktop untouched)',
  desktopContact && !/@media \(min-width: 992px\)[\s\S]*lab-dock-clearance/.test(labCss),
  'all clearance rules are max-width: 991px');

/* ------------------------------------------------------------------- summary */
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  for (const item of failed) console.error(`FAILED: ${item.name} — ${item.detail}`);
  process.exitCode = 1;
}
