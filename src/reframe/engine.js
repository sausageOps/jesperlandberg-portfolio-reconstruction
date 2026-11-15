// ReframeHK. An endless, pan-anywhere field of tiles (three.js).
// One "world" of tiles is packed into columns, then wrapped on both axes around the
// camera, so it repeats seamlessly in every direction. Drag / wheel / touch / arrow keys
// move the camera with inertia; at rest it drifts. The camera's real velocity drives a
// barrel bend in the vertex shader and an RGB split in the fragment shader.
// GSAP owns time: its ticker drives the frame loop, and every timed motion (flights, tile
// reveal, logo intro, iris, sheet, copy button, HUD loops) is a GSAP tween or timeline.
// Every brand decision (copy, palette, fonts, logo, sounds) lives in KIT.
import * as THREE from './vendor/three-0.186.1.min.js';
import { gsap, CustomEase, SplitText } from './vendor/gsap-3.15.0.min.js';

gsap.registerPlugin(CustomEase, SplitText);
gsap.ticker.lagSmoothing(0); // real time: flights, reveal and intro finish on time even at low fps
CustomEase.create('reframe', '0.2,0.8,0.1,1'); // the site's signature curve (sheet, copy button)

// ─── CONFIG: every tunable value lives here ────────────────────────────────
const CONFIG = {
  colWidth: 420,      // world px, one column of tiles
  gap: 36,            // world px between tiles
  columns: 7,         // columns in one wrapped world (more = longer before it repeats)
  zoomRef: 1840,      // viewport width (css px) at which zoom is 1; narrower screens zoom out
  minZoom: 0.44,      // zoom floor from zoomRef (tablets, small laptops)
  heroFill: 0.78,     // narrow screens (< heroFillBelow): the hero (2-column) tile fills at most this fraction of the viewport width, so neighbours peek in on both sides
  heroFillBelow: 700, // css px viewport width under which heroFill applies (desktop never reaches it)
  friction: 0.925,    // velocity kept per 60 fps frame after a fling (0–1)
  wheel: 7,           // wheel delta → px/s of velocity
  keySpeed: 1500,     // px/s top speed from held arrow keys
  drift: 22,          // px/s ambient drift when idle (0 = still)
  idleDelay: 1.8,     // s without input before the drift takes over
  bend: 0.11,         // barrel strength per screen/s of speed
  maxBend: 0.2,       // barrel cap (hard limit 0.4 keeps the bend fold-free)
  speedTau: 0.12,     // s, low-pass time constant of the measured speed (drives bend, split, zoom, whoosh)
  flingWindow: 80,    // ms of pointer samples used for the release (fling) velocity
  rgbShift: 0.006,    // uv offset per screen/s of speed
  maxShift: 0.014,    // RGB split cap
  speedZoom: 0.045,   // zoom-out per screen/s of speed
  radius: 10,         // world px corner radius of tiles
  segments: 20,       // grid segments per tile (bend smoothness)
  flyDuration: 1.5,   // s for HUD fly-to (short hops); longer flights scale with distance
  flyMaxDuration: 2.4,// s cap for the longest HUD flight
  workMinDist: 0.6,   // Work button: nearest acceptable target, in viewport diagonals
  workMaxDist: 1.2,   // … and the farthest
  workTurn: 60,       // degrees: each Work flight leaves at least this far from the previous flight's heading
  cullMargin: 0.25,   // fraction of the viewport added on every side before a tile copy is hidden (plus one large tile)
  masterVolume: 0.7,  // 0–1, everything (sound is off until the visitor turns it on)
  ambientVolume: 0.3, // 0–1, the evolving pad (skipped with reduced motion)
  whooshVolume: 0.5,  // 0–1, speed-following wind (skipped with reduced motion)
  uiVolume: 0.7,      // 0–1, ticks, plucks, swooshes, chime, flight sweep
  // Logo motion (needs a logo whose SVG follows the piece contract; others stay static).
  // Distances are in units of the symbol's outer radius r, angles in degrees.
  logoIntroDelay: 0.35, // s after the hero tile starts its reveal before the logo assembles (once per load)
  logoPieceDur: 0.7,  // s each aperture piece takes to fly in and lock
  logoStagger: 0.06,  // s between pieces (by piece index)
  logoFlyIn: 1.2,     // × r, how far out along its diagonal each piece starts
  logoTurn: 45,       // degrees, each piece starts turned this far anticlockwise
  logoWipeAt: 0.45,   // s into the intro when "reframe" starts wiping in (left → right)
  logoWipeDur: 0.45,  // s the "reframe" wipe takes
  logoHkAt: 0.85,     // s into the intro when "HK" starts wiping in
  logoHkDur: 0.3,     // s the "HK" wipe takes
  irisShift: 0.18,    // × r, outward travel of each piece at open = 1 (contract k1)
  irisTurn: 25,       // degrees each piece turns about its centroid at open = 1 (contract k2)
  irisPulse: 0.8,     // 0–1, peak open of the pulse when a HUD flight starts
  irisPulseDur: 0.6,  // s, the whole open-then-close pulse
  irisHover: 0.5,     // 0–1, open while the pointer is over the HUD mark
  irisHoverDur: 0.35, // s, the hover open/close tween
  irisSpeedMin: 0.08, // screens/s below which the field speed opens nothing (the idle drift is ~0.01)
  irisSpeedFull: 3,   // screens/s at which the speed-linked open reaches irisSpeedMax
  irisSpeedMax: 0.85, // 0–1, the most the field speed alone opens the iris
  irisSpeedTau: 0.25, // s, low-pass time constant of the speed-linked open (no jitter)
};

// ─── KIT: every brand decision ─────────────────────────────────────────────
const KIT = {
  // Every visible string. {name} placeholders are filled in by the code.
  copy: {
    // HUD
    'hud.markLabel': 'ReframeHK, back to start', // aria-label of the wordmark button
    'hud.flyTo': 'Fly to',                       // aria-label of the nav
    'hud.services': 'Services',
    'hud.work': 'Work',
    'hud.contact': 'Contact',
    'hud.sound': 'Sound',
    'hud.hint': 'Drag · arrows · ↵ open',        // fine pointer
    'hud.hintTouch': 'Swipe to explore',          // touch-only devices
    'hud.clock': 'HKT',
    'cursor.project': '{title}',                  // label beside the cursor over a project
    'cursor.projectTag': '· View',                // … its signal-coloured tail
    'cursor.contact': 'Write to us',
    'cursor.contactTag': '↗',
    'aim.project': 'Open {title}',                // keyboard aim tag, after "↵"
    'aim.contact': 'Write to us',
    // hero tile (the wordmark itself comes from KIT.logo)
    'hero.kicker': 'Hong Kong web studio',
    'hero.coords': '22.3° N  114.2° E',
    'hero.line1': 'Websites, made with',
    'hero.line2': 'real care.',                 // serif italic
    'hero.hint': 'Drag · fling · tap',
    // intro tile
    'intro.kicker': 'About us',
    'intro.body': 'We design, build, look after and transform websites.',
    'intro.accent': "And we're still here after launch.", // serif italic, signal
    'intro.foot': 'Design · Build · Care · Transform',
    // services
    'services.kicker': 'Services · 04',
    'services.title': 'How we help.',
    'services.index': '{n} / 04',
    'service.design.name': 'Design',
    'service.design.items': 'UI/UX · Brand · Motion', // items are split on " · "
    'service.build.name': 'Build',
    'service.build.items': 'Websites · Web apps · Systems: CMS, internal tools, integrations · WCAG accessibility',
    'service.care.name': 'Care',
    'service.care.items': 'Hosting · Maintenance · Upgrades',
    'service.transform.name': 'Transform',
    'service.transform.items': 'Redesigns · Migrations · Legacy rebuilds',
    // work
    'work.kicker': 'Work · 2025–2026',
    'work.line1': "Work we're",
    'work.line2': 'proud of.',                    // serif italic, signal
    'caption.year': '{year}  ↗',                  // right side of each project caption
    'project.smilepp.desc': 'Portfolio site for SmilePP, the brand of Hong Kong director Smile: film showcases and photograph albums.',
    'project.ruby.desc': 'Portfolio of a UI/UX and AI-driven product designer, hosted and kept in focus.',
    'project.ywps.desc': 'Official site of the Ying Wa Primary School Parent-Teacher Association.',
    // contact
    'contact.kicker': 'Contact',
    'contact.hint': 'Tap to write or copy',
    'contact.line1': 'Ready for a',
    'contact.line2': 'new frame?',                // serif italic
    'contact.email': 'info@reframehk.com',        // also the mailto address
    'email.kicker': 'Say hello',
    'clock.label': 'Our time · HKT',
    // fillers (the five variants that close the packer's gaps)
    'filler.lookAgain': 'Refocus.',
    'filler.glyph': 're',                         // big serif glyph (replaced by logo.symbol when there is one)
    'filler.everyAngle': 'With care.',
    'filler.everyAngleKicker': 'reframe (v.)',
    'filler.noEdges': 'No edges',                 // over the compass of arrows
    // (the fifth filler lists the four service names)
    // sheet
    'sheet.close': 'Close',
    'sheet.projectKicker': 'Project {n} / 03',
    'sheet.role': 'Our role',
    'sheet.year': 'Year',
    'sheet.live': 'Live',
    'sheet.cta': 'Visit the live site',
    'sheet.contactKicker': 'Contact',
    'sheet.contactTitle': 'Ready for a new frame?',
    'sheet.copy': 'Copy address',
    'sheet.copied': 'Copied ✓',
    'sheet.contactSmall': "Send us a line or a whole brief, whether it's a new site, a redesign, or one that just needs some looking after.",
    'privacy': 'This reconstruction does not use analytics. No ads, and we never sell your data.',
    // plain-HTML index (screen readers, no-WebGL fallback)
    'index.lede': 'Websites, made with real care. A Hong Kong web studio.',
  },
  // Five core roles, plus derived roles (computed by derivePalette unless given).
  palette: {
    ink: '#0f0f0e',        // the field; text on light tiles
    ink2: '#1b1a18',       // dark tiles, HUD pills
    paper: '#ebe8e1',      // light tiles, the sheet; text on dark
    muted: '#8a877f',      // secondary text on dark
    signal: '#ff4f1a',     // the one accent
    mutedPaper: '#6f6c65', // derived: secondary text on paper
    inkSoft: '#4b4943',    // derived: small print on paper
    paperSoft: '#c9c6be',  // derived: body text on ink (plain-HTML index)
    hot: '#ffffff',        // derived: caption title on hover
  },
  // family + CSS fallback stack, and the weights (and italic weights) the page uses.
  // The faces are self-hosted: @font-face rules in style.css, files in ./fonts.
  fonts: {
    sans: { family: 'Space Grotesk', fallback: 'system-ui, sans-serif', weights: [400, 500, 600, 700], italic: [] },
    serif: { family: 'Fraunces', fallback: 'Georgia, serif', weights: [], italic: [400] },
    mono: { family: 'Space Mono', fallback: 'ui-monospace, monospace', weights: [400, 700], italic: [] },
  },
  // The aperture logo. SVG strings use currentColor for ink and data-role="accent" /
  // data-role="bg" on accent / knock-out shapes. Animation contract: four data-piece paths,
  // data-part word / hk groups, data-cx/cy/r (symbol centre and outer radius) on the root.
  logo: {
    wordmark: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 639.4 86\" data-cx=\"42\" data-cy=\"43\" data-r=\"42\"><path data-piece=\"0\" data-role=\"accent\" fill=\"#ff4f1a\" d=\"M30 1h3v18c-8.3 0-15 6.7-15 15v9h-18v-12c0-16.6 13.4-30 30-30z\"/><path data-piece=\"1\" fill=\"currentColor\" d=\"M84 31v3h-18c0-8.3-6.7-15-15-15h-9v-18h12c16.6 0 30 13.4 30 30z\"/><path data-piece=\"2\" fill=\"currentColor\" d=\"M54 85h-3v-18c8.3 0 15-6.7 15-15v-9h18v12c0 16.6-13.4 30-30 30z\"/><path data-piece=\"3\" fill=\"currentColor\" d=\"M0 55v-3h18c0 8.3 6.7 15 15 15h9v18h-12c-16.6 0-30-13.4-30-30z\"/><g data-part=\"word\"><path fill=\"currentColor\" d=\"M332.2 29h48v56h-48c-11 0-20-9-20-20v-16c0-11 9-20 20-20zM168.8 28h28c11 0 20 9 20 20v14h-56v3c0 5.5 4.5 10 10 10h24v11h-26c-11.1 0-20-9-20-20v-18c0-11 8.9-20 20-20zM523.3 28h28c11 0 20 9 20 20v14h-56v3c0 5.5 4.5 10 10 10h24v11h-26c-11 0-20-9-20-20v-18c0-11 9-20 20-20zM412.7 29h16c5.5 0 10.4 2.2 14 5.7c3.6-3.5 8.6-5.7 14-5.7h16c11.1 0 20 9 20 20v36h-12v-35c0-5.5-4.5-10-10-10h-12c-5.5 0-10 4.5-10 10v35h-12v-35c0-5.5-4.5-10-10-10h-12c-5.5 0-10 4.5-10 10v35h-12v-36c0-11 9-20 20-20zM250.2 0h14v11h-12c-5.5 0-10 4.5-10 10v8h20v11h-20v45h-12v-45h-8v-11h8v-9c0-11 8.9-20 20-20zM334.2 40c-5.5 0-10 4.5-10 10v14c0 5.5 4.5 10 10 10h24c5.5 0 10-4.5 10-10v-14c0-5.5-4.5-10-10-10zM291.6 28h14v11h-12c-5.5 0-10 4.5-10 10v36h-12v-37c0-11 9-20 20-20zM128 28h14v11h-12c-5.5 0-10 4.5-10 10v36h-12v-37c0-11 9-20 20-20zM525.3 39c-5.5 0-10 4.5-10 10v2h44v-2c0-5.5-4.5-10-10-10zM170.8 39c-5.5 0-10 4.5-10 10v2h44v-2c0-5.5-4.5-10-10-10z\"/></g><g data-part=\"hk\"><path fill=\"currentColor\" d=\"M583 29h6v11.5h14v-11.5h6v28h-6v-11.5h-14v11.5h-6zM615.4 29h6v7.4l2 2l9.3-9.4h6.7v1.8l-11.8 11.8l11.8 11.8v2.6h-5.9l-10.1-10.2l-2 2v8.2h-6z\"/></g></svg>",
    symbol: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><path data-piece=\"0\" data-role=\"accent\" fill=\"#ff4f1a\" d=\"M37.5 6.25h3.125v18.75c-8.63 0-15.625 6.995-15.625 15.625v9.375h-18.75v-12.5c0-17.259 13.991-31.25 31.25-31.25z\"/><path data-piece=\"1\" fill=\"currentColor\" d=\"M93.75 37.5v3.125h-18.75c0-8.63-6.995-15.625-15.625-15.625h-9.375v-18.75h12.5c17.259 0 31.25 13.991 31.25 31.25z\"/><path data-piece=\"2\" fill=\"currentColor\" d=\"M62.5 93.75h-3.125v-18.75c8.63 0 15.625-6.995 15.625-15.625v-9.375h18.75v12.5c0 17.259-13.991 31.25-31.25 31.25z\"/><path data-piece=\"3\" fill=\"currentColor\" d=\"M6.25 62.5v-3.125h18.75c0 8.63 6.995 15.625 15.625 15.625h9.375v18.75h-12.5c-17.259 0-31.25-13.991-31.25-31.25z\"/></svg>",
  },
  // Volumes, 0–1 (the sound itself is off until the visitor turns it on).
  mix: { master: 0.7, ambient: 0.3, whoosh: 0.5, ui: 0.7 },
};

// Real work only. Media live in ./media (the .v1 suffix busts the long cache). Descriptions are copy (KIT.copy['project.<id>.desc']).
const PROJECTS = [
  { id: 'smilepp', title: 'SmilePP', url: 'https://smilepp.pictures/', year: '2025', role: 'Design, Build, Care', media: '/assets/reframe/media/smilepp.v1' },
  { id: 'ruby', title: 'Ruby Law', url: 'https://rubbylaaw.xyz/', year: '2026', role: 'Hosting & care', media: '/assets/reframe/media/rubbylaaw.v1' },
  { id: 'ywps', title: '英華小學家長教師會 · YWPS PTA', short: 'YWPS PTA', url: 'https://ywpspta.com/', year: '2026', role: 'Design, Build, Care', media: '/assets/reframe/media/ywpspta.v1' },
];

// Names and items are copy (KIT.copy['service.<id>.name' / '.items']).
const SERVICES = [
  { n: '01', id: 'design' },
  { n: '02', id: 'build' },
  { n: '03', id: 'care' },
  { n: '04', id: 'transform' },
];

// ─── kit helpers ───────────────────────────────────────────────────────────
const hexRgb = (hex) => {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
/** a → b by t (0–1), in sRGB. */
const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v + (y[i] - v) * t)); };
/** CSS rgb() with alpha, for canvas strokes/fills. */
const alpha = (hex, a) => `rgb(${hexRgb(hex).join(' ')} / ${a})`;
// Derived roles: the formulas reproduce the current values to within 1–4/255.
const DERIVED = {
  mutedPaper: (p) => mix(p.muted, p.ink, 0.225), // secondary text on paper
  inkSoft: (p) => mix(p.ink, p.paper, 0.265),    // small print on paper
  paperSoft: (p) => mix(p.paper, p.ink, 0.158),  // body text on ink
  hot: () => '#ffffff',                          // brighter than paper
};
/** Full palette (core + derived); derived roles not given are computed from the core. */
function derivePalette(palette) {
  const p = { ...palette };
  for (const k of Object.keys(DERIVED)) if (palette[k] == null) p[k] = DERIVED[k](p);
  return p;
}
const fontStack = (f) => `"${f.family}", ${f.fallback || 'sans-serif'}`;
const fill = (tpl, vars = {}) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * Clean an SVG string (drops scripts and on* handlers) and read its viewBox.
 * Returns { markup, w, h } or null.
 */
function parseSvg(str) {
  if (!str) return null;
  const doc = new DOMParser().parseFromString(str, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null;
  for (const s of svg.querySelectorAll('script, foreignObject')) s.remove();
  for (const el of [svg, ...svg.querySelectorAll('*')]) {
    for (const a of [...el.attributes]) if (/^on/i.test(a.name)) el.removeAttribute(a.name);
  }
  let vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some(Number.isNaN)) {
    vb = [0, 0, parseFloat(svg.getAttribute('width')) || 100, parseFloat(svg.getAttribute('height')) || 100];
    svg.setAttribute('viewBox', vb.join(' '));
  }
  svg.removeAttribute('width'); svg.removeAttribute('height');
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return { markup: new XMLSerializer().serializeToString(svg), w: vb[2], h: vb[3] };
}
// The recolouring rule, as CSS: ink = currentColor; accent/bg shapes keep their own
// fill/stroke attribute as the default (so the raw file looks right) and get recoloured.
const svgRoleCss = (accent, bg) => `[data-role~="accent"][fill]:not([fill="none"]),[data-role~="accent"] [fill]:not([fill="none"]){fill:${accent}}` +
  `[data-role~="accent"][stroke]:not([stroke="none"]),[data-role~="accent"] [stroke]:not([stroke="none"]){stroke:${accent}}` +
  `[data-role~="bg"][fill]:not([fill="none"]),[data-role~="bg"] [fill]:not([fill="none"]){fill:${bg}}` +
  `[data-role~="bg"][stroke]:not([stroke="none"]),[data-role~="bg"] [stroke]:not([stroke="none"]){stroke:${bg}}`;
/** Rasterisable SVG: colours baked in. Resolves { img, aspect } (null if no/invalid SVG). */
function svgImage(str, { ink, accent, bg }, scale = 4) {
  const parsed = parseSvg(str);
  if (!parsed) return Promise.resolve(null);
  const doc = new DOMParser().parseFromString(parsed.markup, 'image/svg+xml');
  const svg = doc.documentElement;
  svg.setAttribute('width', parsed.w * scale); svg.setAttribute('height', parsed.h * scale);
  svg.setAttribute('color', ink);
  const style = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `svg{color:${ink}}` + svgRoleCss(accent, bg);
  svg.insertBefore(style, svg.firstChild);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  return img.decode().then(() => ({ img, aspect: parsed.w / parsed.h }), () => null);
}

// ─── logo geometry for the animation ──────────────────────────────────────
// A logo animates only if its SVG has data-piece paths; anything else stays static.
// Piece k's diagonal: piece 0 sits top-left, each next one 90° clockwise (y down).
const PIECE_DIRS = [[-Math.SQRT1_2, -Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2], [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2]];
/**
 * Measure a contract SVG once (synchronously, in a hidden off-screen copy): per piece its
 * Path2D, fill role, fill rule and bbox centre (the pivot); the symbol's centre and outer
 * radius (data-cx/cy/r, else the pieces' union box); the bboxes of the word / hk groups.
 * Returns null when the SVG has no pieces.
 */
function measureLogo(str) {
  const parsed = parseSvg(str);
  if (!parsed || !/data-piece/.test(parsed.markup)) return null;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-9999px;top:0;width:200px;height:200px;visibility:hidden;pointer-events:none';
  host.innerHTML = parsed.markup;
  document.body.appendChild(host);
  const svg = host.querySelector('svg');
  const els = [...svg.querySelectorAll('path[data-piece]')];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const pieces = els.map((el) => {
    const b = el.getBBox();
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
    const fill = el.getAttribute('fill');
    const role = /\baccent\b/.test(el.dataset.role || '') ? 'accent' : /\bbg\b/.test(el.dataset.role || '') ? 'bg'
      : !fill || fill === 'currentColor' ? 'ink' : fill;
    const k = (Number(el.dataset.piece) || 0) % 4;
    return { k, path: new Path2D(el.getAttribute('d') || ''), role, rule: el.getAttribute('fill-rule') === 'evenodd' ? 'evenodd' : 'nonzero', ox: b.x + b.width / 2, oy: b.y + b.height / 2 };
  });
  const box = (sel) => { const g = svg.querySelector(sel); if (!g) return null; const b = g.getBBox(); return b.width ? { x: b.x, y: b.y, w: b.width, h: b.height } : null; };
  const num = (a, d) => (Number.isFinite(parseFloat(svg.dataset[a])) ? parseFloat(svg.dataset[a]) : d);
  const geo = {
    w: parsed.w, h: parsed.h, pieces,
    cx: num('cx', (x0 + x1) / 2), cy: num('cy', (y0 + y1) / 2), r: num('r', Math.max(x1 - x0, y1 - y0) / 2),
    word: box('[data-part="word"]'), hk: box('[data-part="hk"]'),
  };
  host.remove();
  return pieces.length ? geo : null;
}
/** The SVG without its pieces (the hero tile draws them itself, transformed). */
function stripPieces(str) {
  const parsed = parseSvg(str);
  if (!parsed) return null;
  const doc = new DOMParser().parseFromString(parsed.markup, 'image/svg+xml');
  for (const el of doc.querySelectorAll('[data-piece]')) el.remove();
  return new XMLSerializer().serializeToString(doc.documentElement);
}

// ─── shaders ───────────────────────────────────────────────────────────────
// No camera matrices: uOffset is the tile centre relative to the camera (already
// wrapped on the CPU), uView is half the viewport in world px. y grows downward.
const vertexShader = /* glsl */ `
  uniform vec2 uOffset;
  uniform vec2 uSize;
  uniform vec2 uView;
  uniform float uBend;
  uniform float uReveal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    float s = mix(0.92, 1.0, uReveal);
    vec2 rel = uOffset + vec2(position.x, -position.y) * uSize * s;
    vec2 ndc = rel / uView;
    // Barrel: the edges of the screen fold away. s(r) = 1 − 2b·r²/(1 + r²) keeps
    // r·s(r) strictly increasing for every r while 2b < 0.88 (CPU caps b at 0.4), so
    // off-screen tiles can never fold back over the centre (a plain 1 − b·r² would).
    float r2 = dot(ndc, ndc);
    ndc *= 1.0 - 2.0 * uBend * r2 / (1.0 + r2);
    gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uSize;
  uniform float uAspect;   // image aspect (w / h)
  uniform float uRadius;
  uniform vec2 uShift;     // RGB split, uv units, along the motion
  uniform float uHover;
  uniform float uReveal;
  uniform float uZoom;     // 1 = media: hover zooms the picture inside its frame
  uniform sampler2D uMap2; // hover variant of a typographic tile (captions)
  uniform float uAlt;      // 1 = cross-fade to uMap2 on hover
  varying vec2 vUv;
  vec2 cover(vec2 uv) {
    float ta = uSize.x / uSize.y;
    vec2 s = ta > uAspect ? vec2(1.0, uAspect / ta) : vec2(ta / uAspect, 1.0);
    return (uv - 0.5) * s + 0.5;
  }
  void main() {
    vec2 uv = cover(vUv);
    // Hover never scales the frame: media zoom inside it, text tiles cross-fade or brighten.
    uv = (uv - 0.5) * (1.0 - 0.04 * uHover * uZoom) + 0.5;
    vec3 col;
    col.r = texture2D(uMap, uv + uShift).r;
    col.g = texture2D(uMap, uv).g;
    col.b = texture2D(uMap, uv - uShift).b;
    if (uAlt > 0.5) col = mix(col, texture2D(uMap2, uv).rgb, uHover);
    else col = mix(col, col * 1.06 + 0.015, uHover);
    vec2 p = (vUv - 0.5) * uSize;
    vec2 q = abs(p) - uSize * 0.5 + uRadius;
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
    float a = 1.0 - smoothstep(-1.0, 0.5, d);

    gl_FragColor = vec4(col, a * uReveal);
  }
`;

// ─── sounds: Web Audio only, every sound generated in code ────────────────
// One function per sound. The engine (createSound) owns the context, buses and reverb, and
// hands each sound a toolkit `a`:
//   a.ctx, a.out (destination node), a.t (ctx.currentTime), a.noise (5 s stereo noise buffer),
//   a.keep(node) (start a long-running source; stopped when the voice is released),
//   a.lfo(rate, depth, param), a.loopNoise(), a.blip(type, f, f2, t, peak, attack, decay),
//   a.noiseSweep(f1, f2, t, dur, peak, q).
// Continuous voices (ambient, air, whoosh) are built once while sound is on and may return
// { motion(level, t) } (whoosh: level 0–1 from the camera speed). One-shots get (a, opts):
// swoosh opts.open (true = sheet opens), sweep opts.dur (flight seconds).
const pickOf = (list) => list[Math.floor(Math.random() * list.length)];
const PENTA = [392, 440, 523.25, 587.33, 659.25]; // G-major pentatonic, the tap's notes
const SOUNDS = {
  // Warm analogue pad: detuned saw pairs (D2 A2 E3 F#3) through a low resonant low-pass and a
  // soft top-end roll-off; a shared slow "wow" bends the pitch like tape, each note swells.
  ambient(a) {
    const { ctx } = a;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 480; lp.Q.value = 2.2;
    const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 1600; soft.Q.value = 0.4;
    const pad = ctx.createGain(); pad.gain.value = 0.065;
    lp.connect(soft).connect(pad).connect(a.out);
    a.lfo(0.013, 170, lp.frequency);
    const wow = ctx.createOscillator(), wowDepth = ctx.createGain();
    wow.frequency.value = 0.23; wowDepth.gain.value = 4; wow.connect(wowDepth); a.keep(wow);
    [73.42, 110, 164.81, 185].forEach((f, i) => {
      const g = ctx.createGain(); g.gain.value = 0.5; g.connect(lp);
      for (const det of [-9, 8]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det + Math.random() * 4 - 2;
        wowDepth.connect(o.detune); o.connect(g); a.keep(o);
        a.lfo(0.07 + Math.random() * 0.08, 3, o.detune); // each saw drifts on its own (chorus)
      }
      a.lfo(0.019 + i * 0.0131 + Math.random() * 0.006, 0.4, g.gain);
    });
  },
  // Low hiss: noise kept between 90 and 450 Hz, like a distant room tone.
  air(a) {
    const air = a.loopNoise(), lp = a.ctx.createBiquadFilter(), hp = a.ctx.createBiquadFilter(), ag = a.ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 450; lp.Q.value = 0.3; hp.type = 'highpass'; hp.frequency.value = 90;
    ag.gain.value = 0.048; air.connect(lp).connect(hp).connect(ag).connect(a.out); a.keep(air);
    a.lfo(0.019, 0.019, ag.gain);
  },
  // Deep whoosh: low-passed noise; speed opens the filter 140 → 1000 Hz, a heavy rush.
  whoosh(a) {
    const wn = a.loopNoise();
    const f = a.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 140; f.Q.value = 1.6;
    const g = a.ctx.createGain(); g.gain.value = 0;
    wn.connect(f).connect(g).connect(a.out); a.keep(wn);
    return {
      motion(level, t) {
        g.gain.setTargetAtTime(level ** 1.3 * 0.75, t, 0.12);
        f.frequency.setTargetAtTime(140 + 860 * level, t, 0.15);
      },
    };
  },
  // Hover enters a tile: a high sine with one inharmonic partial, a fingernail on glass.
  tick(a) {
    a.blip('sine', 3520, 0, a.t, 0.03, 0.001, 0.07);
    a.blip('sine', 3520 * 2.76, 0, a.t, 0.008, 0.001, 0.03);
  },
  // Click / tap on a tile: a marimba note, fundamental + the bar's 4th and 10th partials.
  tap(a) {
    const f = pickOf(PENTA);
    a.blip('sine', f, 0, a.t, 0.1, 0.002, 0.4);
    a.blip('sine', f * 4, 0, a.t, 0.025, 0.001, 0.06);
    a.blip('sine', f * 10, 0, a.t, 0.006, 0.001, 0.02);
  },
  // Sheet open / close: band-passed noise sweeping 450 Hz ↔ 2.2 kHz over 0.55 s
  // (rising as the sheet opens, falling as it closes).
  swoosh(a, { open = true } = {}) {
    a.noiseSweep(open ? 450 : 2200, open ? 2200 : 450, a.t, 0.55, 0.09);
  },
  // "Copied ✓": E5 + G#5, a strummed major third.
  chime(a) {
    for (const [f, at] of [[659.25, 0], [830.61, 0.035]]) {
      a.blip('sine', f, 0, a.t + at, 0.06, 0.004, 1.3);
      a.blip('sine', f * 2, 0, a.t + at, 0.012, 0.003, 0.5);
    }
  },
  // A HUD flight starts: a rising sine over an opening noise band.
  sweep(a, { dur = 1.5 } = {}) {
    a.blip('sine', 220, 520, a.t, 0.05, 0.18, Math.max(0.4, dur * 0.6));
    a.noiseSweep(300, 1600, a.t, Math.max(0.4, dur * 0.6), 0.035, 0.8);
  },
};
const CONTINUOUS = { ambient: 'amb', air: 'amb', whoosh: 'whoosh' }; // voice → bus

// ─── sound engine ──────────────────────────────────────────────────────────
// Graph: [ambient + air] [whoosh] [ui] → buses → master → compressor → limiter → out,
// with a send from each bus into one convolver reverb (impulse = decaying noise).
// Nothing is created until enable() runs inside a user gesture (autoplay policy).
function createSound(config, { ambient = true } = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master, comp, verb, noise, suspendTimer = 0;
  let enabled = false, lastTick = 0;
  const buses = {};   // ui, amb, whoosh
  const voices = {};  // continuous voice → { gain, sources, motion }
  const cache = {};   // last volumes pushed to the buses

  function noiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
    return buf;
  }
  function impulse(seconds, decay) {
    const buf = noiseBuffer(seconds);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= (1 - i / d.length) ** decay; }
    return buf;
  }
  // one-shot envelope: 0 → peak in a, exponential fall over d
  function env(param, t, peak, a, d) {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + a);
    param.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  // The toolkit handed to every sound (see SOUNDS).
  function toolkit(out, sources) {
    const keep = (node) => { node.start(); sources.push(node); return node; };
    return {
      ctx, out, noise, t: ctx.currentTime, env, keep,
      // A slow sine LFO added onto an AudioParam (the param keeps its own base value).
      lfo(rate, depth, param) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = rate; g.gain.value = depth;
        o.connect(g).connect(param); keep(o);
      },
      loopNoise() { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; return s; },
      blip(type, f, f2, t, peak, a, d, dest = out) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d * 0.5);
        env(g.gain, t, peak, a, d);
        o.connect(g).connect(dest); o.start(t); o.stop(t + a + d + 0.05);
      },
      noiseSweep(f1, f2, t, dur, peak, q = 1.2, dest = out) {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noise; f.type = 'bandpass'; f.Q.value = q;
        f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(f2, t + dur);
        env(g.gain, t, peak, dur * 0.35, dur * 0.65);
        s.connect(f).connect(g).connect(dest); s.start(t, Math.random() * 3); s.stop(t + dur + 0.05);
      },
    };
  }

  function build() {
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -4; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.12;
    master = ctx.createGain(); master.gain.value = 0;
    master.connect(comp).connect(limiter).connect(ctx.destination);
    verb = ctx.createConvolver(); verb.buffer = impulse(3.4, 2.8);
    verb.connect(master);
    const bus = (volume, send) => {
      const g = ctx.createGain(); g.gain.value = volume; g.connect(master);
      const s = ctx.createGain(); s.gain.value = send; g.connect(s).connect(verb);
      return g;
    };
    noise = noiseBuffer(5);
    buses.ui = bus(config.uiVolume, 0.3);
    if (!ambient) return;
    buses.amb = bus(config.ambientVolume, 0.55);
    buses.whoosh = bus(config.whooshVolume, 0.12);
  }

  // Release a voice: fade it out and stop its sources on the audio clock.
  function release(v, fade = 0.08) {
    const t = ctx.currentTime;
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setTargetAtTime(0, t, fade);
    for (const s of v.sources) { try { s.stop(t + fade * 6); } catch {} }
    // Once the sources have stopped, unhook the voice's gain from its bus.
    const last = v.sources[v.sources.length - 1];
    if (last) last.addEventListener('ended', () => v.gain.disconnect(), { once: true });
    else v.gain.disconnect();
  }
  function startVoice(name) {
    if (!ctx || !buses[CONTINUOUS[name]]) return;
    if (voices[name]) release(voices[name]);
    const gain = ctx.createGain(); gain.connect(buses[CONTINUOUS[name]]);
    const sources = [];
    const v = SOUNDS[name](toolkit(gain, sources)) || {};
    voices[name] = { gain, sources, motion: v.motion };
  }
  const live = () => enabled && ctx && ctx.state === 'running';
  const oneShot = (name, opts) => SOUNDS[name](toolkit(buses.ui, []), opts);

  return {
    get state() { return ctx ? ctx.state : 'none'; },
    get running() { return !!ctx && ctx.state === 'running'; },
    enable() {
      enabled = true;
      clearTimeout(suspendTimer);
      if (!ctx) build();
      for (const name of Object.keys(CONTINUOUS)) if (!voices[name]) startVoice(name);
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(config.masterVolume, ctx.currentTime, 0.6); // ~2 s fade in
    },
    disable() {
      enabled = false;
      if (!ctx) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      clearTimeout(suspendTimer);
      suspendTimer = setTimeout(() => { if (!enabled && ctx?.state === 'running') ctx.suspend(); }, 800);
    },
    setHidden(hidden) {
      if (!ctx || ctx.state === 'closed') return;
      if (hidden) ctx.suspend(); else if (enabled) ctx.resume().catch(() => {});
    },
    // Called a few times per frame-second with the smoothed speed (screens/s).
    motion(speed) {
      if (!live()) return;
      const t = ctx.currentTime;
      for (const [k, node] of [['masterVolume', master], ['uiVolume', buses.ui], ['ambientVolume', buses.amb], ['whooshVolume', buses.whoosh]]) {
        if (node && cache[k] !== config[k]) { cache[k] = config[k]; if (k !== 'masterVolume' || cache.init) node.gain.setTargetAtTime(config[k], t, 0.1); }
      }
      cache.init = true;
      const level = Math.min(1, Math.max(0, (speed - 0.06) / 2.5)); // silent at rest and while drifting
      voices.whoosh?.motion?.(level, t);
    },
    tick() { // hover enters a tile
      if (!live() || ctx.currentTime - lastTick < 0.06) return;
      lastTick = ctx.currentTime;
      oneShot('tick');
    },
    tap() { if (live()) oneShot('tap'); },                     // click / tap on a tile
    swoosh(open) { if (live()) oneShot('swoosh', { open }); }, // sheet open / close
    chime() { if (live()) oneShot('chime'); },                 // "Copied ✓"
    sweep(dur) { if (live()) oneShot('sweep', { dur }); },     // a HUD flight starts
    destroy() {
      clearTimeout(suspendTimer);
      enabled = false;
      for (const v of Object.values(voices)) for (const s of v.sources) { try { s.stop(); } catch {} }
      ctx?.close().catch(() => {});
    },
  };
}

// ─── fonts: every face the page uses (declared in style.css) ───────────────
const fontFaces = (fonts) => Object.values(fonts).flatMap((f) => [
  ...(f.weights ?? [400]).map((w) => `${w} 40px "${f.family}"`),
  ...(f.italic ?? []).map((w) => `italic ${w} 40px "${f.family}"`),
]);

// ─── init: all the logic. Returns { destroy } for clean teardown ───────────
function init(container, config, kit = KIT) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = container.querySelector('[data-stage]');
  const sheet = container.querySelector('[data-sheet]');
  const sheetBody = container.querySelector('[data-sheet-body]');
  const label = container.querySelector('[data-label]');
  const outX = container.querySelector('[data-x]');
  const outY = container.querySelector('[data-y]');
  const outClock = container.querySelector('[data-clock]');
  const workCount = container.querySelector('[data-work-count]');
  const hint = container.querySelector('[data-hint]');
  const cleanups = [];
  const on = (el, type, fn, opts) => { el.addEventListener(type, fn, opts); cleanups.push(() => el.removeEventListener(type, fn, opts)); };
  let destroyed = false;

  // ─── kit state: P = full palette, F = font stacks, T(key, vars) = copy ───
  const P = derivePalette(kit.palette);
  const F = {};
  const setStacks = () => {
    F.sans = fontStack(kit.fonts.sans); F.serif = fontStack(kit.fonts.serif); F.mono = fontStack(kit.fonts.mono);
    F.cjk = `"${kit.fonts.sans.family}", "PingFang HK", "Noto Sans HK", "Microsoft JhengHei", sans-serif`;
  };
  setStacks();
  const T = (key, vars) => fill(kit.copy[key] ?? key, vars);
  const svcName = (s) => T(`service.${s.id}.name`);
  const svcItems = (s) => T(`service.${s.id}.items`).split(' · ').filter(Boolean);
  const coarse = matchMedia('(pointer: coarse)').matches;

  // CSS custom properties on <html> (removed again in destroy()).
  const root = container;
  const CSS_VARS = { ink: '--ink', ink2: '--ink-2', paper: '--paper', muted: '--muted', signal: '--signal', mutedPaper: '--muted-paper', inkSoft: '--ink-soft', paperSoft: '--paper-soft', hot: '--hot' };
  function applyCssVars() {
    for (const [role, name] of Object.entries(CSS_VARS)) root.style.setProperty(name, P[role]);
    root.style.setProperty('--sans', F.sans); root.style.setProperty('--serif', F.serif); root.style.setProperty('--mono', F.mono);
  }
  applyCssVars();

  // Wait (at most 2.5 s) for every face, so the canvases draw with the real fonts.
  function loadFonts() {
    return Promise.race([
      Promise.all(fontFaces(kit.fonts).map((f) => document.fonts.load(f).catch(() => {}))),
      new Promise((r) => setTimeout(r, 2500)),
    ]).catch(() => {});
  }

  // Logo art: SVGs rasterised with the palette baked in (null = draw the type wordmark).
  // wordBase = the wordmark without its pieces (the hero draws those itself when animating).
  const art = { wordmark: null, symbol: null, wordBase: null };
  let artId = 0;
  function loadArt() {
    const id = ++artId;
    const heroCols = { ink: P.ink, accent: P.signal, bg: P.paper };
    return Promise.all([
      svgImage(kit.logo?.wordmark, heroCols),                                       // hero tile (paper)
      svgImage(kit.logo?.symbol, { ink: P.ink, accent: P.paper, bg: P.signal }),    // filler (signal)
      svgImage(geo.word ? stripPieces(kit.logo.wordmark) : null, heroCols),
    ]).then(([w, s, b]) => { if (id === artId) { art.wordmark = w; art.symbol = s; art.wordBase = b; } });
  }

  // ─── logo motion. One pose, computed once per frame,
  // drives the HUD mark (CSS transforms on the inline SVG's data-piece paths) and the hero
  // tile (each piece drawn as a cached Path2D). Per piece k (0–3), in units of the symbol's
  // outer radius r: dist[k] = outward travel along its diagonal, rot[k] = turn about its
  // own centroid (degrees), op[k] = opacity; word / hk = how much of each is wiped in.
  //   assemble (intro, once per load): a GSAP timeline tweens each piece's dist from
  //     logoFlyIn to 0 (expo.out), rot from −logoTurn to 0 (back.out), op 0 → 1, then the wipes.
  //   iris(open): dist += open·irisShift, rot += open·irisTurn, where
  //     open = max(flight pulse, hover, speed-linked open): pulse and hover are tweens,
  //     the speed-linked open is low-passed per frame.
  // Logos without data-piece paths (and the type wordmark) never animate. ───
  let geo = { word: null, symbol: null };
  const prepGeo = () => { geo = { word: measureLogo(kit.logo?.wordmark), symbol: measureLogo(kit.logo?.symbol) }; };
  prepGeo();
  const pose = { dist: new Float32Array(4), rot: new Float32Array(4), op: new Float32Array(4).fill(1), word: 1, hk: 1 };
  // intro: the assemble state, tweened by introTimeline(); starts at rest with reduced motion
  const still = reducedMotion;
  const intro = {
    state: still ? 'done' : 'wait', // wait → run → done
    pieces: Array.from({ length: 4 }, () => ({ dist: still ? 0 : config.logoFlyIn, rot: still ? 0 : -config.logoTurn, op: still ? 1 : 0 })),
    word: still ? 1 : 0, hk: still ? 1 : 0,
  };
  // The opening preloader covers the first paint, so the assemble is gated on it
  // having lifted: 'hold' until the overlay reports done, then the identical
  // timeline starts. Timings, easings and values above are untouched.
  let introGate = 'wait'; // wait → hold → ready
  let entranceGate = null; // ticker poll while the assemble is held
  let revealEntrance = null; // set by build(): performs the reveal itself, exactly once
  let entranceDone = false;
  const releaseEntrance = () => { if (entranceGate) { gsap.ticker.remove(entranceGate); entranceGate = null; } };
  // Release the held entrance. Idempotent, and safe to call before build() has
  // finished: there is nothing to reveal yet then, so build() picks the 'ready'
  // gate up itself. This is what makes startEntrance() actually start anything.
  const runEntrance = () => {
    if (destroyed || !revealEntrance || entranceDone) return;
    entranceDone = true;
    releaseEntrance();
    revealEntrance();
  };
  const iris = { pulse: 0, hover: 0, speed: 0, open: 0, posed: false };
  let hud = []; // per inline SVG in the HUD mark: { g (its geo), pieces: [{ el, k }], word, hk }
  const clamp01 = gsap.utils.clamp(0, 1);
  function introTimeline(delay) {
    // posed on complete: the next updateLogo writes the rest pose even if a slow first
    // frame let the whole timeline start and finish within one tick
    const tl = gsap.timeline({ delay, onStart: () => { intro.state = 'run'; }, onComplete: () => { intro.state = 'done'; iris.posed = true; } });
    intro.pieces.forEach((pc, k) => {
      const at = k * config.logoStagger, dur = config.logoPieceDur;
      tl.to(pc, { dist: 0, duration: dur, ease: 'expo.out' }, at)
        .to(pc, { rot: 0, duration: dur, ease: 'back.out(1.4)' }, at)
        .to(pc, { op: 1, duration: dur / 3, ease: 'none' }, at); // fades in over the first third of its flight
    });
    return tl
      .to(intro, { word: 1, duration: config.logoWipeDur, ease: 'power2.inOut' }, config.logoWipeAt)
      .to(intro, { hk: 1, duration: config.logoHkDur, ease: 'power2.inOut' }, config.logoHkAt);
  }
  function computePose() {
    for (let k = 0; k < 4; k++) {
      const pc = intro.pieces[k];
      pose.dist[k] = pc.dist + iris.open * config.irisShift;
      pose.rot[k] = pc.rot + iris.open * config.irisTurn;
      pose.op[k] = pc.op;
    }
    pose.word = intro.word;
    pose.hk = intro.hk;
  }
  computePose();
  // HUD: write the pose as inline styles (rest = clear them, so the SVG is exactly the file).
  function applyHud(rest) {
    for (const h of hud) {
      const r = h.g.r;
      for (const { el, k } of h.pieces) {
        if (rest) { el.style.transform = ''; el.style.opacity = ''; continue; }
        const d = pose.dist[k] * r;
        el.style.transform = `translate(${(PIECE_DIRS[k][0] * d).toFixed(3)}px,${(PIECE_DIRS[k][1] * d).toFixed(3)}px) rotate(${pose.rot[k].toFixed(2)}deg)`;
        el.style.opacity = pose.op[k] >= 1 ? '' : pose.op[k].toFixed(3);
      }
      // wipe: clip the group's right side away; negative insets keep the other sides clear
      if (h.word) h.word.style.clipPath = rest || pose.word >= 1 ? '' : `inset(-50% ${((1 - pose.word) * 100).toFixed(2)}% -50% -50%)`;
      if (h.hk) h.hk.style.clipPath = rest || pose.hk >= 1 ? '' : `inset(-50% ${((1 - pose.hk) * 100).toFixed(2)}% -50% -50%)`;
    }
  }
  // Re-bind after every HUD markup change (applyDom) and re-apply the current pose.
  function bindHud() {
    hud = [];
    const mark = container.querySelector('[data-logo]');
    if (!mark) return;
    for (const [sel, g] of [['.mark__word svg', geo.word], ['.mark__symbol svg', geo.symbol]]) {
      const svg = mark.querySelector(sel);
      if (!svg || !g) continue;
      hud.push({
        g, pieces: [...svg.querySelectorAll('[data-piece]')].map((el) => ({ el, k: (Number(el.dataset.piece) || 0) % 4 })),
        word: svg.querySelector('[data-part="word"]'), hk: svg.querySelector('[data-part="hk"]'),
      });
    }
    if (intro.state !== 'done' || iris.posed) applyHud(false);
  }

  // DOM: copy, logo, plain-HTML index.
  const logoHtml = () => {
    const svg = parseSvg(kit.logo?.wordmark);
    return svg ? `<span class="logo-svg" role="img" aria-label="ReframeHK" style="aspect-ratio:${svg.w}/${svg.h}">${svg.markup}</span>` : '<i>re</i>frame<sup>HK</sup>';
  };
  // HUD mark: the wordmark, plus the symbol that replaces it on phones (style.css swaps
  // them below 640px, where the wordmark and the nav no longer fit on one row).
  const markHtml = () => {
    const sym = parseSvg(kit.logo?.symbol);
    const symbol = sym
      ? `<span class="logo-svg" style="aspect-ratio:${sym.w}/${sym.h}">${sym.markup}</span>`
      : '<i>re</i>';
    return `<span class="mark__word">${logoHtml()}</span><span class="mark__symbol" aria-hidden="true">${symbol}</span>`;
  };
  const indexEl = container.querySelector('[data-index]');
  function renderIndex() {
    if (!indexEl) return;
    indexEl.innerHTML = `
      <h1>${logoHtml()}</h1>
      <p>${esc(T('index.lede'))}</p>
      <section>
        <h2>${esc(T('hud.services'))}</h2>
        ${SERVICES.map((s) => `<h3>${esc(svcName(s))}</h3><p>${esc(svcItems(s).join(' · '))}</p>`).join('')}
      </section>
      <section>
        <h2>${esc(T('hud.work'))}</h2>
        ${PROJECTS.map((p) => `<h3><a href="${p.url}" target="_blank" rel="noopener">${esc(p.title)}</a></h3>
        <p>${esc(T(`project.${p.id}.desc`))} ${esc(p.role)}. ${p.year}.</p>`).join('')}
      </section>
      <section>
        <h2>${esc(T('hud.contact'))}</h2>
        <p><a href="mailto:${esc(T('contact.email'))}">${esc(T('contact.email'))}</a></p>
      </section>
      <footer><p>${esc(T('privacy'))}</p></footer>`;
  }
  function applyDom() {
    for (const el of container.querySelectorAll('[data-t]')) el.textContent = T(el.dataset.t);
    for (const el of container.querySelectorAll('[data-t-aria]')) el.setAttribute('aria-label', T(el.dataset.tAria));
    hint.textContent = T(coarse ? 'hud.hintTouch' : 'hud.hint');
    const mark = container.querySelector('[data-logo]');
    if (mark) mark.innerHTML = markHtml();
    bindHud();
    renderIndex();
  }
  applyDom();

  // ─── sound toggle: off by default; the choice persists, but audio only starts
  // inside a user gesture (a remembered "on" waits for the first click / key) ───
  // The kit's mix sets the volumes (the engine reads config live).
  const applyMix = () => {
    config.masterVolume = kit.mix.master; config.ambientVolume = kit.mix.ambient;
    config.whooshVolume = kit.mix.whoosh; config.uiVolume = kit.mix.ui;
  };
  applyMix();
  const sound = createSound(config, { ambient: !reducedMotion });
  const soundBtn = container.querySelector('[data-sound]');
  const SOUND_KEY = 'reframehk:sound';
  let soundOn = false;
  try { soundOn = localStorage.getItem(SOUND_KEY) === '1'; } catch {}
  // Equaliser bars (dancing while sound is on) and the hint's orbiting dot are GSAP loops that
  // only run while motion is welcome: gsap.matchMedia reverts them live if the visitor turns
  // on reduced motion, and style.css then shows still bars.
  const bars = [...soundBtn.querySelectorAll('.eq i')];
  const orbitDot = container.querySelector('.hint__pad span');
  let loopsOn = false;
  function animateEq() {
    if (!loopsOn) return;
    gsap.killTweensOf(bars);
    if (!soundOn) { gsap.to(bars, { scaleY: 0.18, duration: 0.3, ease: 'power2.out' }); return; }
    for (const bar of bars) {
      gsap.to(bar, { scaleY: 'random(0.25, 1)', duration: gsap.utils.random(0.45, 0.85), ease: 'sine.inOut', repeat: -1, repeatRefresh: true });
    }
  }
  const showSound = () => { soundBtn.classList.toggle('is-on', soundOn); soundBtn.setAttribute('aria-pressed', String(soundOn)); animateEq(); };
  showSound();
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    if (orbitDot) {
      gsap.timeline({ repeat: -1, defaults: { duration: 0.8, ease: 'sine.inOut' } })
        .to(orbitDot, { x: 5, y: 0 }).to(orbitDot, { x: 0, y: 5 }).to(orbitDot, { x: -5, y: 0 }).to(orbitDot, { x: 0, y: 0 });
    }
    loopsOn = true; animateEq();
    return () => { loopsOn = false; gsap.killTweensOf(bars); gsap.set(bars, { clearProps: 'transform' }); };
  });
  on(soundBtn, 'click', () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0'); } catch {}
    showSound();
    if (soundOn) sound.enable(); else sound.disable();
  });
  const firstGesture = (e) => {
    if (!soundOn || sound.running || e.target.closest?.('[data-sound]')) return;
    sound.enable();
  };
  for (const type of ['pointerdown', 'pointerup', 'keydown']) on(window, type, firstGesture, true);

  function cleanGlobals() {
    for (const name of [...Object.values(CSS_VARS), '--sans', '--serif', '--mono']) root.style.removeProperty(name);
  }

  // Renderer. If WebGL is missing, show the plain HTML index instead.
  let renderer;
  try {
    // alpha: true — the field is cleared transparent so the page's own grain, painted on
    // the surface *behind* this canvas, shows through the gaps between tiles. Clearing
    // opaque ink here would hide it; clearing opaque ink *and* painting grain above the
    // canvas (the previous arrangement) put grain on every project image and video.
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: 'high-performance' });
  } catch {
    container.classList.add('is-fallback');
    // Signal readiness immediately: the fallback has no field to build, and the
    // opening overlay must never wait on it.
    container.dataset.homeReady = 'true';
    loadFonts();
    intro.state = 'done'; applyHud(true); // no field, no intro: the static logo
    // The host keeps its viewport fixed for the A24 dock. When nothing has
    // focus, forward the browser's usual document-scroll keys to the fallback
    // scroller; focused links and the A24 menu keep their native key handling.
    on(window, 'keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey ||
          (e.target !== document.body && e.target !== document.documentElement) ||
          document.querySelector('.a24-nav[data-open="true"]')) return;
      const page = container.clientHeight * 0.875;
      let top;
      switch (e.key) {
        case 'PageDown': top = container.scrollTop + page; break;
        case 'PageUp': top = container.scrollTop - page; break;
        case 'End': top = container.scrollHeight; break;
        case 'Home': top = 0; break;
        case 'ArrowDown': top = container.scrollTop + 40; break;
        case 'ArrowUp': top = container.scrollTop - 40; break;
        case ' ': top = container.scrollTop + (e.shiftKey ? -page : page); break;
        default: return;
      }
      e.preventDefault();
      container.scrollTo({ top, behavior: 'auto' });
    });
    return {
      startEntrance() {},
      destroy() { destroyed = true; for (const fn of cleanups) fn(); mm.revert(); sound.destroy(); cleanGlobals(); container.classList.remove('is-fallback'); },
    };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  // Clear to fully transparent, not to ink: the field colour behind the tiles is supplied
  // by `.page` (set to the same --ink), which is what carries the animated grain.
  renderer.setClearColor(0x000000, 0);
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(); // unused by the shader; render() needs one

  // Shared uniforms: the same objects are referenced by every material.
  const shared = {
    uView: { value: new THREE.Vector2(1, 1) },
    uBend: { value: 0 },
    uShift: { value: new THREE.Vector2() },
    uRadius: { value: config.radius },
  };

  const geometry = new THREE.PlaneGeometry(1, 1, config.segments, config.segments);
  const textures = new Set();
  const tiles = [];
  let W = 1, H = 1;

  // ─── view state ───
  let vw = 1, vh = 1, zoom = 1, zoomEff = 1, texScale = 1;
  const cam = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, prev = { x: 0, y: 0 };
  let flight = null, dragging = false, lastInput = -1e9, now = 0, dirty = true; // flight: the running fly-to tween
  const stopFlight = () => { flight?.kill(); flight = null; };

  function resize() {
    vw = container.clientWidth; vh = container.clientHeight;
    renderer.setSize(vw, vh, false);
    zoom = Math.max(config.minZoom, Math.min(1, vw / config.zoomRef));
    // Phones: zoom out further so the hero takes heroFill of the width (min() keeps it
    // continuous: it only bites where the usual zoom would fill more than that).
    const heroW = config.colWidth * 2 + config.gap;
    if (vw < config.heroFillBelow) zoom = Math.min(zoom, (config.heroFill * vw) / heroW);
    dirty = true;
  }
  resize();
  texScale = Math.min(2, Math.max(0.6, Math.min(devicePixelRatio, 2) * zoom * 1.1));

  // ─── media: one <video> + one VideoTexture per clip, shared by every tile ───
  const loader = new THREE.TextureLoader();
  const clips = new Map();
  for (const p of PROJECTS) {
    const poster = loader.load(`${p.media}-poster.jpg`, () => { dirty = true; });
    textures.add(poster);
    const clip = { project: p, poster, video: null, videoTex: null, live: false, wanted: false, users: [] };
    if (!reducedMotion) {
      const v = document.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'metadata' });
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      for (const [ext, type] of [['webm', 'video/webm'], ['mp4', 'video/mp4']]) {
        const s = document.createElement('source'); s.src = `${p.media}.${ext}`; s.type = type; v.appendChild(s);
      }
      clip.video = v;
      clip.videoTex = new THREE.VideoTexture(v);
      clip.videoTex.minFilter = THREE.LinearFilter;
      clip.videoTex.generateMipmaps = false;
      textures.add(clip.videoTex);
      // Swap poster → video on every tile once frames exist.
      const onPlaying = () => {
        clip.live = true;
        for (const t of clip.users) t.u.uMap.value = clip.videoTex;
      };
      v.addEventListener('playing', onPlaying);
      cleanups.push(() => v.removeEventListener('playing', onPlaying));
    }
    clips.set(p.id, clip);
  }

  // ─── typographic tiles: drawn into a canvas (CanvasTexture). The canvas and texture
  // are kept, so a tile can redraw in place (needsUpdate), never reallocates. ───
  function canvasTile(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * texScale); c.height = Math.round(h * texScale);
    const ctx = c.getContext('2d');
    ctx.scale(texScale, texScale);
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    textures.add(tex);
    const redraw = () => { ctx.setTransform(texScale, 0, 0, texScale, 0, 0); ctx.clearRect(0, 0, w, h); draw(ctx, w, h); tex.needsUpdate = true; };
    return { tex, redraw, ctx };
  }

  const fnt = (weight, size, fam, style = '') => `${style} ${weight} ${size}px ${fam}`;
  function paint(ctx, w, h, color) { ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); }

  // ─── the padding rule: every line of type keeps its INK
  // (measured glyph bounds, letter spacing and italic overhang included) at least PAD world
  // px from every edge of its tile. Left-aligned type puts its ink on the PAD line,
  // right-aligned type ends on w − PAD, and every line is fitted to (w − 2·PAD).
  // Bottom-anchored lines rise only if a descender would cross the bottom pad. Captions
  // sit on the field under their media and use CAP_PAD on the sides instead. ───
  const PAD = 32, CAP_PAD = 4;
  const inkBox = (ctx, text) => {
    const m = ctx.measureText(text);
    return { l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent };
  };
  // Set the font, shrunk so the ink of `text` fits maxW. Returns the size used.
  function fit(ctx, text, weight, size, fam, maxW, style = '') {
    ctx.font = fnt(weight, size, fam, style);
    let tw = inkBox(ctx, text).w;
    if (tw <= maxW) return size;
    // letter spacing does not scale with the size, so converge in a few steps
    for (let k = 0; k < 4 && tw > maxW; k++) { size *= (maxW / tw) * 0.995; ctx.font = fnt(weight, size, fam, style); tw = inkBox(ctx, text).w; }
    return size;
  }
  // Shrink the current font so the widest single word of `texts` fits maxW (wrap() can't break a word).
  function fitWords(ctx, texts, maxW) {
    const widest = Math.max(...texts.flatMap((t) => t.split(' ')).map((wd) => inkBox(ctx, wd).w));
    if (widest > maxW) { ctx.font = ctx.font.replace(/([\d.]+)px/, (_, s) => `${(s * maxW / widest) * 0.99}px`); }
  }
  // Draw `text` with its ink on x: 'left' = ink starts at x, 'right' = ink ends at x,
  // 'center' = ink centred on x. Returns the ink box (x0…x1).
  function put(ctx, text, x, y, align = 'left') {
    ctx.textAlign = 'left';
    const b = inkBox(ctx, text);
    const dx = align === 'left' ? b.l : align === 'right' ? -b.r : (b.l - b.r) / 2;
    ctx.fillText(text, x + dx, y);
    return { ...b, x0: x + dx - b.l, x1: x + dx + b.r };
  }
  // A bottom-anchored stack of lines, ink on x, each fitted to maxW; the whole stack rises
  // if a descender of any line would cross the bottom pad. Lines: { text, weight, size,
  // fam, style, y, color }. Returns the last line's ink box (y = its baseline).
  function stack(ctx, lines, x, maxW, h) {
    for (const l of lines) { fit(ctx, l.text, l.weight, l.size, l.fam, l.maxW ?? maxW, l.style); l.font = ctx.font; l.b = inkBox(ctx, l.text); }
    const lift = Math.max(0, ...lines.map((l) => l.y + l.b.d - (h - PAD)));
    let last;
    for (const l of lines) { ctx.font = l.font; ctx.fillStyle = l.color; last = { ...put(ctx, l.text, x, l.y - lift), y: l.y - lift }; }
    return last;
  }
  const spacing = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`; };
  function mono(ctx, text, x, y, color, align = 'left', size = 15, maxW = Infinity) {
    const t = text.toUpperCase();
    ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
    spacing(ctx, 1.5);
    fit(ctx, t, 500, size, F.mono, maxW);
    const b = put(ctx, t, x, y, align);
    spacing(ctx, 0);
    return b;
  }
  // Word-wrap into maxW (ink widths), each line's ink on x. Returns the next baseline.
  function wrap(ctx, text, x, y, maxW, lh) {
    const words = text.split(' '); let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (inkBox(ctx, test).w > maxW && line) { put(ctx, line, x, y); line = word; y += lh; } else line = test;
    }
    if (line) put(ctx, line, x, y);
    return y + lh;
  }
  function wordmark(ctx, x, y, size, ink) {
    // "re" serif italic in signal · "frame" sans bold · "HK" boxed mono.
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = fnt(400, size * 1.06, F.serif, 'italic'); const reW = ctx.measureText('re').width;
    ctx.fillStyle = P.signal; ctx.fillText('re', x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${-size * 0.045}px`;
    ctx.font = fnt(700, size, F.sans); ctx.fillStyle = ink; ctx.fillText('frame', x + reW + size * 0.02, y);
    const frW = ctx.measureText('frame').width;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    const hs = size * 0.2, hx = x + reW + frW + size * 0.08, hy = y - size * 0.5;
    ctx.font = fnt(500, hs, F.mono); const hw = ctx.measureText('HK').width;
    ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1.2, size * 0.012);
    ctx.strokeRect(hx, hy - hs * 0.98, hw + hs * 0.6, hs * 1.3);
    ctx.fillStyle = ink; ctx.fillText('HK', hx + hs * 0.3, hy);
    return reW + frW + size * 0.12 + hw + hs * 0.6;
  }
  function fitWordmark(ctx, maxW) {
    // width scales linearly with size, so measure at 100 and scale.
    const probe = document.createElement('canvas').getContext('2d');
    return (100 * maxW) / wordmark(probe, 0, 100, 100, '#000');
  }

  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit', hour12: false });

  // Draw functions per tile kind. Each gets (ctx, w, h, data). All type follows the PAD rule.
  const DRAW = {
    hero(ctx, w, h) {
      paint(ctx, w, h, P.paper);
      const half = w / 2 - PAD - 24; // kicker and coordinates share the top line, ≥ 48 px apart
      mono(ctx, T('hero.kicker'), PAD, 54, P.ink, 'left', 15, half);
      mono(ctx, T('hero.coords'), w - PAD, 54, P.ink, 'right', 15, half);
      // (the logo itself is drawn on top by drawHeroLogo, so it can animate)
      const hint = mono(ctx, T('hero.hint'), w - PAD, h - 48, P.mutedPaper, 'right', 15, 220);
      spacing(ctx, -1.2);
      stack(ctx, [
        { text: T('hero.line1'), weight: 500, size: 40, fam: F.sans, y: h - 92, color: P.ink },
        { text: T('hero.line2'), weight: 400, size: 46, fam: F.serif, style: 'italic', y: h - 44, color: P.ink, maxW: hint.x0 - 32 - PAD }, // clear of the hint
      ], PAD, w - 2 * PAD, h);
      spacing(ctx, 0);
    },
    intro(ctx, w, h) {
      paint(ctx, w, h, P.ink2);
      mono(ctx, T('intro.kicker'), PAD, 50, P.muted, 'left', 15, w - 2 * PAD);
      ctx.font = fnt(500, 36, F.sans); ctx.fillStyle = P.paper;
      spacing(ctx, -0.8);
      fitWords(ctx, [T('intro.body')], w - 2 * PAD);
      const y = wrap(ctx, T('intro.body'), PAD, 120, w - 2 * PAD, 42);
      ctx.font = fnt(400, 38, F.serif, 'italic'); ctx.fillStyle = P.signal;
      fitWords(ctx, [T('intro.accent')], w - 2 * PAD);
      wrap(ctx, T('intro.accent'), PAD, y + 14, w - 2 * PAD, 40);
      spacing(ctx, 0);
      mono(ctx, T('intro.foot'), PAD, h - 40, P.muted, 'left', 15, w - 2 * PAD);
    },
    svcHead(ctx, w, h) {
      paint(ctx, w, h, P.signal);
      mono(ctx, T('services.kicker'), PAD, 50, P.ink, 'left', 15, w - 2 * PAD);
      spacing(ctx, -2.6);
      stack(ctx, [{ text: T('services.title'), weight: 600, size: 64, fam: F.sans, y: h - 40, color: P.ink }], PAD, w - 2 * PAD, h);
      spacing(ctx, 0);
    },
    service(ctx, w, h, s) {
      const dark = s.n === '02' || s.n === '03';
      const bg = dark ? P.ink2 : P.paper, ink = dark ? P.paper : P.ink;
      paint(ctx, w, h, bg);
      mono(ctx, T('services.index', { n: s.n }), PAD, 50, dark ? P.muted : P.mutedPaper, 'left', 15, w - 2 * PAD);
      ctx.fillStyle = ink;
      spacing(ctx, -3.6);
      fit(ctx, svcName(s), 700, 76, F.sans, w - 2 * PAD);
      put(ctx, svcName(s), PAD, 150);
      spacing(ctx, -0.4);
      const indent = 42; // items hang right of the signal dash
      ctx.font = fnt(500, 27, F.sans);
      fitWords(ctx, svcItems(s), w - 2 * PAD - indent);
      let y = 230;
      for (const item of svcItems(s)) {
        ctx.fillStyle = P.signal; put(ctx, '—', PAD, y);
        ctx.fillStyle = ink; y = wrap(ctx, item, PAD + indent, y, w - 2 * PAD - indent, 34) + 16;
      }
      spacing(ctx, 0);
    },
    workHead(ctx, w, h) {
      paint(ctx, w, h, P.ink2);
      mono(ctx, T('work.kicker'), PAD, 50, P.muted, 'left', 15, w - 2 * PAD);
      spacing(ctx, -2.4);
      stack(ctx, [
        { text: T('work.line1'), weight: 600, size: 58, fam: F.sans, y: h - 92, color: P.paper },
        { text: T('work.line2'), weight: 400, size: 64, fam: F.serif, style: 'italic', y: h - 36, color: P.signal },
      ], PAD, w - 2 * PAD, h);
      spacing(ctx, 0);
    },
    contact(ctx, w, h) {
      const email = T('contact.email');
      paint(ctx, w, h, P.signal);
      const half = w / 2 - PAD - 24;
      mono(ctx, T('contact.kicker'), PAD, 54, P.ink, 'left', 15, half);
      mono(ctx, T('contact.hint'), w - PAD, 54, P.ink, 'right', 15, half);
      ctx.fillStyle = P.ink;
      spacing(ctx, -3.4);
      fit(ctx, T('contact.line1'), 600, 74, F.sans, w - 2 * PAD);
      put(ctx, T('contact.line1'), PAD, 170);
      fit(ctx, T('contact.line2'), 400, 82, F.serif, w - 2 * PAD, 'italic');
      put(ctx, T('contact.line2'), PAD, 248);
      spacing(ctx, -2.4);
      // the underline sits 14 px under the baseline; keep it inside the pad too
      const b = stack(ctx, [{ text: email, weight: 600, size: 58, fam: F.sans, y: Math.min(h - 52, h - PAD - 18), color: P.ink }], PAD, w - 2 * PAD, h);
      ctx.fillRect(b.x0, b.y + 14, b.w, 4);
      spacing(ctx, 0);
    },
    email(ctx, w, h) {
      const email = T('contact.email');
      paint(ctx, w, h, P.paper);
      const arrow = mono(ctx, '↗', w - PAD, 50, P.signal, 'right', 20);
      mono(ctx, T('email.kicker'), PAD, 50, P.mutedPaper, 'left', 15, arrow.x0 - 24 - PAD);
      spacing(ctx, -1);
      stack(ctx, [{ text: email, weight: 600, size: 33, fam: F.sans, y: h - 44, color: P.ink }], PAD, w - 2 * PAD, h);
      spacing(ctx, 0);
    },
    clock(ctx, w, h) {
      paint(ctx, w, h, P.ink2);
      const r = 6, dotX = w - PAD - r; // the live dot, its edge on the pad
      mono(ctx, T('clock.label'), PAD, 50, P.muted, 'left', 15, dotX - r - 24 - PAD);
      spacing(ctx, -5);
      stack(ctx, [{ text: clock.format(new Date()), weight: 500, size: 104, fam: F.sans, y: h - 36, color: P.paper }], PAD, w - 2 * PAD, h);
      spacing(ctx, 0);
      ctx.fillStyle = P.signal; ctx.beginPath(); ctx.arc(dotX, 44, r, 0, Math.PI * 2); ctx.fill();
    },
    // Fillers close the gaps the packer leaves; each states something true.
    filler(ctx, w, h, n) {
      const v = n % 5;
      if (v === 0) {
        paint(ctx, w, h, P.ink);
        // hairline outline, concentric with the tile's rounded corner (the shader's SDF
        // radius, in world px like this canvas), inset so the anti-aliased edge keeps it whole
        const lw = 1.5, i = lw;
        ctx.strokeStyle = alpha(P.paper, 0.22); ctx.lineWidth = lw;
        ctx.beginPath(); ctx.roundRect(i, i, w - 2 * i, h - 2 * i, Math.max(0, config.radius - i)); ctx.stroke();
        ctx.fillStyle = P.paper;
        fit(ctx, T('filler.lookAgain'), 400, Math.min(84, h * 0.4), F.serif, w - 2 * PAD, 'italic');
        put(ctx, T('filler.lookAgain'), w / 2, h / 2 + 24, 'center');
      } else if (v === 1) {
        paint(ctx, w, h, P.signal);
        if (art.symbol) {
          // the logo symbol, centred, ~60% of the tile
          const { img, aspect } = art.symbol;
          let dh = Math.min(h * 0.6, h - 2 * PAD), dw = dh * aspect;
          if (dw > Math.min(w * 0.7, w - 2 * PAD)) { dw = Math.min(w * 0.7, w - 2 * PAD); dh = dw / aspect; }
          ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        } else {
          ctx.fillStyle = P.ink;
          const g = T('filler.glyph');
          let size = fit(ctx, g, 400, Math.min(w * 0.8, h * 1.1), F.serif, w - 2 * PAD, 'italic');
          let b = inkBox(ctx, g);
          if (b.a + b.d > h - 2 * PAD) { size *= (h - 2 * PAD) / (b.a + b.d); ctx.font = fnt(400, size, F.serif, 'italic'); b = inkBox(ctx, g); }
          put(ctx, g, w / 2, Math.max(PAD + b.a, Math.min(h * 0.72, h - PAD - b.d)), 'center');
        }
      } else if (v === 2) {
        paint(ctx, w, h, P.ink2);
        const words = SERVICES.map(svcName);
        const lh = Math.min(52, (h - 2 * PAD) / 4);
        spacing(ctx, -lh * 0.035);
        words.forEach((wd, i) => {
          fit(ctx, wd, 600, lh * 0.9, F.sans, w - 2 * PAD);
          ctx.fillStyle = i === n % 4 ? P.paper : alpha(P.paper, 0.22);
          put(ctx, wd, PAD, h / 2 - lh * 1.5 + lh * i + lh * 0.32);
        });
        spacing(ctx, 0);
      } else if (v === 3) {
        paint(ctx, w, h, P.paper);
        spacing(ctx, -2);
        stack(ctx, [{ text: T('filler.everyAngle'), weight: 600, size: Math.min(58, h * 0.34), fam: F.sans, y: h - 36, color: P.ink }], PAD, w - 2 * PAD, h);
        spacing(ctx, 0);
        mono(ctx, T('filler.everyAngleKicker'), PAD, 50, P.mutedPaper, 'left', 15, w - 2 * PAD);
      } else {
        // a compass of arrows: this field goes every way
        paint(ctx, w, h, P.paper);
        const arrows = ['↖', '↑', '↗', '←', '', '→', '↙', '↓', '↘'];
        const step = Math.min(w, h - 40) / 4.2;
        ctx.font = fnt(400, step * 0.62, F.sans); ctx.textBaseline = 'middle';
        arrows.forEach((a, i) => {
          ctx.fillStyle = P.ink;
          put(ctx, a, w / 2 + ((i % 3) - 1) * step, h / 2 + 8 + (Math.floor(i / 3) - 1) * step, 'center');
        });
        ctx.fillStyle = P.signal; ctx.beginPath(); ctx.arc(w / 2, h / 2 + 8, step * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.textBaseline = 'alphabetic';
        mono(ctx, T('filler.noEdges'), PAD, 50, P.mutedPaper, 'left', 15, w - 2 * PAD);
      }
    },
  };

  // ─── layout: units (1 or 2 columns wide) packed into the shortest column(s) ───
  const C = config.colWidth, G = config.gap, C2 = C * 2 + G;
  const vidH = (w) => Math.round((w * 9) / 16);
  const proj = (id) => PROJECTS.find((p) => p.id === id);
  // A project unit is its media and nothing else. There used to be a second,
  // stacked caption tile under every panel; it is gone, so no row is reserved
  // beneath a panel and the gap between units is just `gap` — the same on every
  // side. (`desc` carries the project to the cursor label, which used to read it
  // off the caption tile.)
  const videoUnit = (id, cols) => {
    const w = cols === 2 ? C2 : C;
    return { cols, items: [
      { kind: 'video', project: proj(id), desc: proj(id), x: 0, y: 0, w, h: vidH(w) },
    ] };
  };
  const posterUnit = (id, h = 540) => ({ cols: 1, items: [
    { kind: 'poster', project: proj(id), desc: proj(id), x: 0, y: 0, w: C, h },
  ] });
  const one = (kind, h, cols = 1, data) => ({ cols, items: [{ kind, x: 0, y: 0, w: cols === 2 ? C2 : C, h, data }] });
  const svcBlock = { cols: 2, anchor: 'services', items: [
    { kind: 'svcHead', x: 0, y: 0, w: C, h: 240 },
    { kind: 'service', data: SERVICES[0], x: 0, y: 240 + G, w: C, h: 430 },
    { kind: 'service', data: SERVICES[2], x: 0, y: 670 + G * 2, w: C, h: 430 },
    { kind: 'service', data: SERVICES[1], x: C + G, y: 0, w: C, h: 600 },
    { kind: 'service', data: SERVICES[3], x: C + G, y: 600 + G, w: C, h: 500 + G },
  ] };

  // Column heights are kept in step so that two single-column units stacked in one
  // column always leave exactly `gap` between them. A 2-column unit spans two
  // columns, so it starts at the lower of the pair and the higher one is left with
  // a leftover below it. That leftover is either a filler tile (>= 140 + gap) or a
  // sliver, which is what a stray gap looks like on screen. Total heights above are
  // chosen so the pinned run leaves no slivers; `posterUnit('ruby', 557)` and
  // `posterUnit('smilepp', 529)` both pair exactly (see sim in the audit notes).
  //
  // `col` pins a unit to that column (or pair starting there); the rest go greedy.
  // The first row is pinned so the landing view is fixed: SmilePP large right under
  // the hero, Ruby Law large in the first row and again at the hero's left (its poster
  // leads the social preview image, og.v2.jpg), YWPS PTA right under that one.
  const pin = (u, col) => ({ ...u, col });
  const units = [
    pin({ ...one('hero', 600, 2), anchor: 'hero' }, 0),
    pin(one('intro', 557), 2), // as tall as Ruby Law's unit beside it, so Services starts level
    pin(videoUnit('ruby', 2), 3),
    pin(one('clock', 230), 5),
    // 557 matches the intro tile's height, so this poster ends level with the next
    // column over and the Contact pair below starts on the row, leaving a plain gap.
    pin(posterUnit('ruby', 557), 6),
    pin(videoUnit('smilepp', 2), 0),
    // Greedy from here. The order was searched (offline) for a packing with no blank
    // slivers: every hole is either a normal gap or tall enough for a filler.
    svcBlock,
    { ...one('workHead', 291), anchor: 'work' },
    { ...one('contact', 440, 2), anchor: 'contact' },
    videoUnit('smilepp', 2),
    videoUnit('ywps', 2),
    posterUnit('ywps', 500), // lands in column 6, under the pinned Ruby Law poster
    posterUnit('smilepp', 529), // ends at 1658, level with the 2-col Ruby unit below
    videoUnit('ywps', 1),
    one('email', 200),
    videoUnit('ruby', 1),
    videoUnit('ruby', 2),
    videoUnit('smilepp', 1),
  ];

  function pack() {
    const n = config.columns, heights = new Array(n).fill(0), placed = [];
    const holes = [];
    for (const u of units) {
      const uh = Math.max(...u.items.map((i) => i.y + i.h)) + G;
      const yAt = (c) => (u.cols === 2 ? Math.max(heights[c], heights[(c + 1) % n]) : heights[c]);
      let best = 0, bestY = Infinity;
      if (u.col !== undefined) { best = u.col % n; bestY = yAt(best); }
      else for (let c = 0; c < n; c++) {
        const y = yAt(c);
        if (y < bestY - 1) { bestY = y; best = c; }
      }
      for (let k = 0; k < u.cols; k++) {
        const c = (best + k) % n;
        if (bestY - heights[c] >= 140 + G) holes.push({ c, y: heights[c], h: bestY - heights[c] - G });
        heights[c] = bestY + uh;
      }
      for (const it of u.items) placed.push({ ...it, x: best * (C + G) + it.x, y: bestY + it.y, anchor: u.anchor });
    }
    H = Math.max(...heights);
    W = n * (C + G);
    for (let c = 0; c < n; c++) {
      const rest = H - heights[c] - G;
      if (rest >= 140) holes.push({ c, y: heights[c], h: rest });
    }
    let f = 0;
    for (const hole of holes) placed.push({ kind: 'filler', data: f++, x: hole.c * (C + G), y: hole.y, w: C, h: hole.h });
    return placed;
  }

  // ─── hero tile + logo. The tile's static part (paper, type) is drawn once into heroBase;
  // the logo goes on top, so an animation frame is one blit plus four Path2D fills, into
  // the same canvas and texture (needsUpdate). ───
  let heroBase = null, heroTile = null, heroCanvas = null, heroStale = false;
  const DEG = Math.PI / 180;
  const roleColor = (role) => (role === 'accent' ? P.signal : role === 'bg' ? P.paper : role === 'ink' ? P.ink : role);
  function drawHeroLogo(ctx, w, h) {
    if (!art.wordmark) { wordmark(ctx, PAD, h * 0.6, fitWordmark(ctx, w - 2 * PAD), P.ink); return; }
    // SVG wordmark: fit the width like the type one, capped in height; bottom on the same line.
    const { img, aspect } = art.wordmark;
    let dw = w - 2 * PAD, dh = dw / aspect;
    if (dh > h * 0.42) { dh = h * 0.42; dw = dh * aspect; }
    const x = PAD, y = h * 0.6 - dh, g = geo.word;
    // at rest (or no pieces) the plain image; otherwise base image + transformed pieces
    if (!g || !art.wordBase || (intro.state === 'done' && !iris.posed)) { ctx.drawImage(img, x, y, dw, dh); return; }
    ctx.save();
    ctx.translate(x, y); ctx.scale(dw / g.w, dh / g.h);
    if (pose.word < 1 || pose.hk < 1) {
      ctx.save(); ctx.beginPath();
      if (g.word) ctx.rect(g.word.x - 2, -g.h, (g.word.w + 4) * pose.word, g.h * 3);
      if (g.hk) ctx.rect(g.hk.x - 2, -g.h, (g.hk.w + 4) * pose.hk, g.h * 3);
      if (!g.word && !g.hk) ctx.rect(0, 0, g.w, g.h);
      ctx.clip();
      ctx.drawImage(art.wordBase.img, 0, 0, g.w, g.h);
      ctx.restore();
    } else ctx.drawImage(art.wordBase.img, 0, 0, g.w, g.h);
    for (const p of g.pieces) {
      const k = p.k, op = pose.op[k], d = pose.dist[k] * g.r;
      if (op <= 0) continue;
      ctx.save();
      ctx.globalAlpha = op;
      ctx.translate(p.ox + PIECE_DIRS[k][0] * d, p.oy + PIECE_DIRS[k][1] * d);
      ctx.rotate(pose.rot[k] * DEG);
      ctx.translate(-p.ox, -p.oy);
      ctx.fillStyle = roleColor(p.role);
      ctx.fill(p.path, p.rule);
      ctx.restore();
    }
    ctx.restore();
  }
  function drawHero(ctx, w, h) {
    if (!heroBase) {
      heroBase = document.createElement('canvas');
      heroBase.width = Math.round(w * texScale); heroBase.height = Math.round(h * texScale);
    }
    const b = heroBase.getContext('2d');
    b.setTransform(texScale, 0, 0, texScale, 0, 0); b.clearRect(0, 0, w, h);
    DRAW.hero(b, w, h);
    ctx.drawImage(heroBase, 0, 0, w, h);
    drawHeroLogo(ctx, w, h);
  }
  function heroFrame() {
    const { ctx, tex, w, h } = heroCanvas;
    ctx.setTransform(texScale, 0, 0, texScale, 0, 0);
    ctx.drawImage(heroBase, 0, 0, w, h);
    drawHeroLogo(ctx, w, h);
    tex.needsUpdate = true; dirty = true;
  }
  // Once per frame from tick. The intro, pulse and hover are GSAP tweens; this folds them
  // (plus the speed-linked open, low-passed here) into the pose and redraws what changed.
  function updateLogo(ldt) {
    if (reducedMotion || (!geo.word && !geo.symbol)) return;
    const s = clamp01((speedS - config.irisSpeedMin) / Math.max(1e-3, config.irisSpeedFull - config.irisSpeedMin));
    const st = s * s * (3 - 2 * s) * config.irisSpeedMax;
    iris.speed += (st - iris.speed) * (1 - Math.exp(-ldt / config.irisSpeedTau));
    if (!st && iris.speed < 1e-3) iris.speed = 0;
    iris.open = Math.min(1, Math.max(iris.pulse, iris.hover, iris.speed));
    const active = intro.state === 'run' || iris.open > 0;
    if (active || iris.posed) {
      iris.posed = active;
      computePose();
      applyHud(!active);
      if (heroCanvas) heroStale = true;
    }
    if (heroStale && heroTile?.onScreen && heroBase) { heroFrame(); heroStale = false; }
  }
  // flight pulse: quick open (30%), slower close
  let pulseTl = null, introTl = null;
  function pulseIris() {
    if (reducedMotion) return;
    pulseTl?.kill();
    pulseTl = gsap.timeline()
      .to(iris, { pulse: config.irisPulse, duration: config.irisPulseDur * 0.3, ease: 'power2.out' })
      .to(iris, { pulse: 0, duration: config.irisPulseDur * 0.7, ease: 'power2.inOut' });
  }
  const markEl = container.querySelector('[data-logo]');
  if (markEl && !reducedMotion) {
    const hoverTo = gsap.quickTo(iris, 'hover', { duration: config.irisHoverDur, ease: 'power2.out' });
    on(markEl, 'pointerenter', (e) => { if (e.pointerType !== 'touch') hoverTo(config.irisHover); });
    on(markEl, 'pointerleave', () => hoverTo(0));
  }

  // ─── build tiles (after the web fonts are in, so canvases draw with them) ───
  let clockTile = null, lastClock = '', revealTween = null;
  function build() {
    if (destroyed) return;
    for (const spec of pack()) {
      let map, map2 = null, aspect = spec.w / spec.h, redraw = null;
      if (spec.kind === 'video' || spec.kind === 'poster') {
        const clip = clips.get(spec.project.id);
        map = spec.kind === 'video' && clip.live ? clip.videoTex : clip.poster;
        aspect = 16 / 9;
      } else {
        const t = canvasTile(spec.w, spec.h, spec.kind === 'hero' ? drawHero : (ctx, w, h) => DRAW[spec.kind](ctx, w, h, spec.data ?? spec.project));
        map = t.tex; redraw = t.redraw;
        if (spec.kind === 'hero') heroCanvas = { ...t, w: spec.w, h: spec.h };
      }
      // One mesh per wrapped copy in view (see place() in tick). Meshes are made on demand
      // and share every uniform object except their own uOffset.
      const own = {
        uMap: { value: map }, uSize: { value: new THREE.Vector2(spec.w, spec.h) }, uAspect: { value: aspect },
        uHover: { value: 0 }, uReveal: { value: still ? 1 : 0 },
        uZoom: { value: spec.kind === 'video' || spec.kind === 'poster' ? 1 : 0 },
        uMap2: { value: map2 ?? map }, uAlt: { value: map2 ? 1 : 0 },
      };
      const tile = { ...spec, cx: spec.x + spec.w / 2, cy: spec.y + spec.h / 2, meshes: [], copies: [], u: own, hover: 0, pulse: 0, onScreen: false };
      tiles.push(tile);
      if (spec.kind === 'video') clips.get(spec.project.id).users.push(tile);
      if (spec.kind === 'clock') { clockTile = redraw; lastClock = clock.format(new Date()); }
    }
    // Start centred on the hero.
    const hero = heroTile = tiles.find((t) => t.kind === 'hero');
    cam.x = prev.x = hero.cx; cam.y = prev.y = hero.cy;
    // Reveal: tiles fade up outward from the hero, staggered by distance; the logo
    // assembles logoIntroDelay after the hero's own reveal starts.
    if (!still) {
      if (introGate === 'wait') introGate = 'hold';
      const reveal = () => {
        const delayOf = (t) => 0.15 + Math.hypot(t.cx - hero.cx, t.cy - hero.cy) / 2600;
        revealTween = gsap.to(tiles.map((t) => t.u.uReveal), { value: 1, duration: 0.9, ease: 'power2.out', delay: (i) => delayOf(tiles[i]) });
        if (intro.state === 'wait') introTl = introTimeline(delayOf(hero) + config.logoIntroDelay);
        dirty = true;
      };
      revealEntrance = reveal;
      // Starts the moment the opening preloader lifts (or immediately once it has).
      if (introGate === 'ready') runEntrance();
      else {
        entranceGate = () => {
          if (introGate !== 'ready') return;
          runEntrance();
        };
        gsap.ticker.add(entranceGate);
      }
    }
    dirty = true;
  }

  // Wait for the kit's fonts (and logo art) so the canvases draw with them.
  Promise.all([loadFonts(), loadArt()]).then(build).then(() => {
    // The homepage is built and its DOM is in place: it is safe to reveal.
    container.dataset.homeReady = 'true';
  });

  function makeMesh(tile) {
    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthTest: false, depthWrite: false, side: THREE.FrontSide,
      uniforms: { ...tile.u, uOffset: { value: new THREE.Vector2() }, ...shared },
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    tile.meshes.push(mesh);
    return mesh;
  }

  // ─── helpers ───
  const wrapD = (d, size) => d - size * Math.round(d / size); // nearest copy, −size/2…size/2
  const viewW = () => vw / zoomEff, viewH = () => vh / zoomEff;

  function tileAt(sx, sy) {
    const wx = (sx - vw / 2) / zoomEff, wy = (sy - vh / 2) / zoomEff;
    for (const t of tiles) {
      for (const [x, y] of t.copies) if (Math.abs(wx - x) < t.w / 2 && Math.abs(wy - y) < t.h / 2) return t;
    }
    return null;
  }
  const isLink = (t) => t && (t.project || t.kind === 'contact' || t.kind === 'email');

  // Viewport diagonal in world px at rest: the unit for flight distances.
  const diag = () => Math.hypot(vw, vh) / zoom;
  let lastHeading = null; // radians, direction of the previous flight (world, y down)

  // Fly the camera to the nearest wrapped copy of an anchor tile, or to an explicit
  // world point ({ at: [x, y] }). Returns the flight duration in s.
  function flyTo(tile, alignTop = false) {
    if (!tile) return 0;
    let tx = tile.at ? tile.at[0] : cam.x + wrapD(tile.cx - cam.x, W);
    let ty = tile.at ? tile.at[1] : cam.y + wrapD(tile.cy - cam.y, H);
    if (alignTop) {
      // Tall groups: put their top just under the HUD instead of centring.
      const top = cam.y + wrapD(tile.y - cam.y, H);
      ty = Math.min(ty, top + viewH() / 2 - 90 / zoom);
    }
    vel.x = vel.y = 0;
    lastInput = now;
    const dist = Math.hypot(tx - cam.x, ty - cam.y);
    if (dist > 1) lastHeading = Math.atan2(ty - cam.y, tx - cam.x);
    if (reducedMotion) { cam.x = prev.x = tx; cam.y = prev.y = ty; dirty = true; sound.sweep(0.5); return 0; }
    // short hops keep flyDuration; longer ones stretch with √distance, up to the cap
    const d = Math.min(config.flyMaxDuration, config.flyDuration * Math.max(1, Math.sqrt(dist / diag())));
    flight?.kill();
    flight = gsap.to(cam, { x: tx, y: ty, duration: d, ease: 'power2.inOut', onComplete: () => { flight = null; } });
    sound.sweep(d);
    return d;
  }

  // Work: among every wrapped copy of the project's large tiles,
  // take one workMinDist–workMaxDist viewport diagonals away whose heading turns at least
  // workTurn° from the previous flight, preferring the heading that turns by the golden
  // angle (137.5°), so successive flights keep coming from new directions.
  const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  function workTarget(list) {
    const D = diag(), lo = config.workMinDist * D, hi = config.workMaxDist * D, mid = (lo + hi) / 2;
    const cands = [];
    for (const t of list) {
      const bx = wrapD(t.cx - cam.x, W), by = wrapD(t.cy - cam.y, H);
      for (let kx = -2; kx <= 2; kx++) for (let ky = -2; ky <= 2; ky++) {
        const x = bx + kx * W, y = by + ky * H, d = Math.hypot(x, y);
        if (d > 1) cands.push({ t, x, y, d, a: Math.atan2(y, x) });
      }
    }
    const turn = (config.workTurn * Math.PI) / 180, want = lastHeading === null ? null : lastHeading + 2.39996;
    const inBand = (c) => c.d >= lo && c.d <= hi;
    const turns = (c) => lastHeading === null || angDiff(c.a, lastHeading) >= turn;
    const off = (c) => (want === null ? 0 : angDiff(c.a, want) / Math.PI) + (Math.abs(c.d - mid) / D) * 0.35;
    const best = (pool, score) => pool.reduce((b, c) => (!b || score(c) < score(b) ? c : b), null);
    return best(cands.filter((c) => inBand(c) && turns(c)), off)
      ?? best(cands.filter(inBand), (c) => -angDiff(c.a, lastHeading ?? 0)) // band, but no turn available
      ?? best(cands, (c) => Math.abs(c.d - mid));                            // nothing in band: closest to it
  }

  const anchors = (name) => tiles.filter((t) => t.anchor === name);
  const nearest = (list) => list.reduce((best, t) => {
    const d = Math.hypot(wrapD(t.cx - cam.x, W), wrapD(t.cy - cam.y, H));
    return !best || d < best.d ? { t, d } : best;
  }, null)?.t;

  let workIndex = 0, contactCall = null;
  function fly(name) {
    if (!tiles.length) return;
    contactCall?.kill(); contactCall = null;
    pulseIris();
    if (name === 'work') {
      const p = PROJECTS[workIndex];
      if (workCount) workCount.textContent = `0${workIndex + 1}/03`;
      workIndex = (workIndex + 1) % PROJECTS.length;
      // A LARGE (2-column) clip of that project, at a varied distance and heading
      // (workTarget), centred exactly.
      const list = tiles.filter((x) => x.kind === 'video' && x.project === p && x.w > C);
      const c = workTarget(list);
      flyTo({ at: [cam.x + c.x, cam.y + c.y] });
      for (const x of tiles) if (x.project === p && x.kind === 'video') x.pulse = 1.8;
      return;
    }
    if (name === 'services') {
      const head = tiles.find((t) => t.kind === 'svcHead');
      // centre on the whole 2-column block, top-aligned
      flyTo({ cx: head.x + C + G / 2, cy: head.y + 550, y: head.y }, true);
      return;
    }
    const d = flyTo(nearest(anchors(name)));
    contactCall?.kill();
    if (name === 'contact') contactCall = gsap.delayedCall(d * 0.7, openContact); // opens as the flight lands
  }

  // ─── sheet: project + contact detail ───
  // One GSAP timeline per open/close: the panel slides in from the right (from the bottom on
  // phones) on the 'reframe' ease while the backdrop fades; on open the title rises line by
  // line (SplitText, masked) and the rest of the content follows.
  let sheetOpen = false, lastFocus = null, sheetTl = null, titleSplit = null, copyTl = null;
  const sheetPanel = sheet.querySelector('.sheet__panel'), sheetBackdrop = sheet.querySelector('.sheet__backdrop');
  const phoneMq = matchMedia('(max-width: 640px)');
  const offstage = () => (phoneMq.matches ? { xPercent: 0, x: 0, yPercent: 100, y: 16 } : { xPercent: 100, x: 24, yPercent: 0, y: 0 });
  const onstage = { xPercent: 0, x: 0, yPercent: 0, y: 0 };
  const sheetDur = reducedMotion ? 0 : 0.65;
  gsap.set(sheetPanel, offstage());
  gsap.set(sheetBackdrop, { opacity: 0 });
  function revealSheetContent(tl) {
    titleSplit?.revert(); titleSplit = null;
    if (reducedMotion) return;
    const h2 = sheetBody.querySelector('h2');
    const rest = sheetBody.querySelectorAll('.sheet__media, .sheet__kicker, .sheet__desc, dl, .sheet__cta, .sheet__mail, .copy, .sheet__small, .sheet__privacy');
    titleSplit = SplitText.create(h2, { type: 'lines', mask: 'lines' });
    const split = titleSplit;
    tl.from(split.lines, { yPercent: 105, duration: 0.8, ease: 'reframe', stagger: 0.07 }, 0.18)
      .from(rest, { autoAlpha: 0, y: 18, duration: 0.6, ease: 'power2.out', stagger: 0.04, clearProps: 'opacity,visibility,transform' }, 0.24)
      .add(() => { if (titleSplit === split) { split.revert(); titleSplit = null; } }); // plain text again once it has landed
  }
  function openSheet(html, cls) {
    titleSplit?.revert(); titleSplit = null;
    sheetBody.innerHTML = html;
    sheet.classList.toggle('sheet--contact', cls === 'contact');
    if (!sheetOpen) sound.swoosh(true);
    if (!sheetOpen && !sheetTl?.isActive()) gsap.set(sheetPanel, offstage()); // from the current breakpoint's side
    sheetTl?.kill();
    // Make the dialog focusable synchronously, before its animation's first frame.
    sheet.style.visibility = 'visible';
    sheetTl = gsap.timeline()
      .to(sheetBackdrop, { opacity: 1, duration: 0.45, ease: 'none' }, 0)
      .to(sheetPanel, { ...onstage, duration: sheetDur, ease: 'reframe' }, 0);
    revealSheetContent(sheetTl);
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    sheetOpen = true;
    sheetOpenedAt = performance.now();
    lastFocus = document.activeElement;
    sheet.querySelector('.sheet__close').focus({ preventScroll: true });
    label.classList.remove('is-on');
    for (const c of clips.values()) c.video?.pause(); // keep only the sheet's clip playing
  }
  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    sound.swoosh(false);
    sheetTl?.kill();
    sheetTl = gsap.timeline({ onComplete: () => { gsap.set(sheet, { visibility: 'hidden' }); titleSplit?.revert(); titleSplit = null; } })
      .to(sheetBackdrop, { opacity: 0, duration: 0.45, ease: 'none' }, 0)
      .to(sheetPanel, { ...offstage(), duration: sheetDur, ease: 'reframe' }, 0);
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    sheetBody.querySelector('video')?.pause();
    for (const c of clips.values()) c.wanted = false; // re-evaluated next frame
    lastFocus?.focus?.({ preventScroll: true });
    lastInput = now;
  }
  function projectHtml(p) {
    const i = PROJECTS.indexOf(p) + 1;
    const media = reducedMotion
      ? `<img src="${p.media}-poster.jpg" alt="" />`
      : `<video muted loop playsinline autoplay preload="metadata" poster="${p.media}-poster.jpg"><source src="${p.media}.webm" type="video/webm" /><source src="${p.media}.mp4" type="video/mp4" /></video>`;
    return `
      <div class="sheet__media">${media}</div>
      <p class="sheet__kicker">${esc(T('sheet.projectKicker', { n: `0${i}` }))}</p>
      <h2 id="sheet-title">${esc(p.title)}</h2>
      <p class="sheet__desc">${esc(T(`project.${p.id}.desc`))}</p>
      <dl><dt>${esc(T('sheet.role'))}</dt><dd>${esc(p.role)}</dd><dt>${esc(T('sheet.year'))}</dt><dd>${p.year}</dd><dt>${esc(T('sheet.live'))}</dt><dd>${p.url.replace(/^https:\/\/|\/$/g, '')}</dd></dl>
      <a class="sheet__cta" href="${p.url}" target="_blank" rel="noopener">${esc(T('sheet.cta'))} <span aria-hidden="true">↗</span></a>`;
  }
  function contactHtml() {
    const email = esc(T('contact.email'));
    return `
      <p class="sheet__kicker">${esc(T('sheet.contactKicker'))}</p>
      <h2 id="sheet-title">${esc(T('sheet.contactTitle'))}</h2>
      <a class="sheet__mail" href="mailto:${email}">${email.replace('@', '@<wbr>')}</a>
      <button class="copy" type="button" data-copy><span class="copy__ink" aria-hidden="true"></span><span class="copy__label"><span>${esc(T('sheet.copy'))}</span><span>${esc(T('sheet.copied'))}</span></span></button>
      <p class="sheet__small">${esc(T('sheet.contactSmall'))}</p>
      <p class="sheet__privacy">${esc(T('privacy'))}</p>`;
  }
  function openProject(p) { openSheet(projectHtml(p)); }
  function openContact() { openSheet(contactHtml(), 'contact'); }
  function copyEmail(btn) {
    const email = T('contact.email');
    const fallback = () => {
      const ta = Object.assign(document.createElement('textarea'), { value: email });
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    };
    if (navigator.clipboard) navigator.clipboard.writeText(email).catch(fallback); else fallback();
    sound.chime();
    // ink wipes in left → right and the label swaps up to "Copied"; 2.2 s later it all swaps back
    const [idle, done] = btn.querySelectorAll('.copy__label > span'), ink = btn.querySelector('.copy__ink');
    const dur = reducedMotion ? 0 : 0.45, swap = { duration: dur, ease: 'reframe' };
    copyTl?.kill();
    copyTl = gsap.timeline()
      .add(() => btn.classList.add('is-copied'))
      .fromTo(ink, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: reducedMotion ? 0 : 0.5, ease: 'reframe' }, 0)
      .fromTo(idle, { yPercent: 0, opacity: 1 }, { yPercent: -120, opacity: 0, ...swap }, 0)
      .fromTo(done, { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, ...swap }, 0)
      .add(() => btn.classList.remove('is-copied'), 2.2)
      .to(ink, { opacity: 0, duration: 0.3, ease: 'none' }, 2.2)
      .to(idle, { yPercent: 0, opacity: 1, ...swap }, 2.2)
      .to(done, { yPercent: 120, opacity: 0, ...swap }, 2.2);
  }
  // A touch tap opens the sheet on pointerup; the browser then fires its click at the same
  // spot, which is now the sheet's backdrop. Ignore backdrop clicks that come that soon.
  let sheetOpenedAt = 0;
  on(sheet, 'click', (e) => {
    if (e.target.closest('.sheet__backdrop') && performance.now() - sheetOpenedAt < 450) return;
    if (e.target.closest('[data-close]')) closeSheet();
    const btn = e.target.closest('[data-copy]'); if (btn) copyEmail(btn);
  });
  function activate(t) {
    if (!t) return;
    if (t.project) openProject(t.project);
    else if (t.kind === 'contact' || t.kind === 'email') openContact();
  }

  // ─── input ───
  // Pointer deltas are accumulated here and applied once per frame in tick(), so the
  // camera, the measured speed and every effect it drives move in frame-sized steps.
  let down = null, hovered = null, ptr = null; // ptr: last mouse position over the stage
  const pending = { x: 0, y: 0 };
  const samples = []; // { t, x, y } in screen px, for the release velocity
  on(stage, 'pointerdown', (e) => {
    if (sheetOpen || !e.isPrimary) return;
    try { stage.setPointerCapture(e.pointerId); } catch {}
    down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: 0 };
    samples.length = 0;
    samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    dragging = true; contactCall?.kill(); contactCall = null; stopFlight(); vel.x = vel.y = 0; lastInput = now;
    stage.classList.add('is-dragging');
    setHover(null);
  });
  on(stage, 'pointermove', (e) => {
    if (e.pointerType === 'mouse') ptr = { x: e.clientX, y: e.clientY };
    if (!down || !dragging) { updateHover(); return; }
    const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
    down.lx = e.clientX; down.ly = e.clientY; down.moved += Math.abs(dx) + Math.abs(dy);
    pending.x += dx; pending.y += dy;
    // every raw sample (browsers coalesce moves to one event per frame)
    for (const c of e.getCoalescedEvents?.() ?? []) samples.push({ t: c.timeStamp, x: c.clientX, y: c.clientY });
    if (!samples.length || samples[samples.length - 1].t < e.timeStamp) samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    while (samples.length > 2 && e.timeStamp - samples[0].t > config.flingWindow) samples.shift();
    lastInput = now;
  });
  // Camera velocity (world px/s) implied by the last ~flingWindow ms of pointer samples;
  // zero if the pointer has been held still. Used for the fling and, while dragging, as
  // the measured speed (independent of how events happen to line up with frames).
  function pointerVel(at) {
    if (samples.length < 2) return { x: 0, y: 0 };
    const a = samples[0], b = samples[samples.length - 1], dt = (b.t - a.t) / 1000;
    if (dt < 0.008 || at - b.t > 100) return { x: 0, y: 0 };
    return { x: -(b.x - a.x) / dt / zoomEff, y: -(b.y - a.y) / dt / zoomEff };
  }
  function endDrag(e) {
    if (!down) return;
    const quick = down.moved < 8 && performance.now() - down.t < 500;

    if (!reducedMotion) {
      const v = pointerVel(e.timeStamp);
      vel.x = Math.max(-6000, Math.min(6000, v.x));
      vel.y = Math.max(-6000, Math.min(6000, v.y));
    }
    down = null; dragging = false;
    stage.classList.remove('is-dragging');
    if (quick && e.type === 'pointerup') {
      const hit = tileAt(e.clientX, e.clientY);
      if (hit) sound.tap();
      activate(hit);
    }
  }
  on(stage, 'pointerup', endDrag);
  on(stage, 'pointercancel', endDrag);
  on(stage, 'pointerleave', () => { ptr = null; setHover(null); });

  // Hover follows the field: cleared while it moves fast or flies, re-evaluated from the
  // last pointer position every frame once it has (nearly) settled. The idle drift counts
  // as settled, so the label tracks a drifting tile.
  let fieldMoving = false;
  const centreTile = () => { const t = tileAt(vw / 2, vh / 2); return isLink(t) && labelled(t) ? t : null; };
  // Keyboard aim: at rest, the link tile under the crosshair gets the hover highlight and
  // a "↵ Open" hint (devices with a fine pointer or keyboard only; not while hovering).
  const aimEl = container.querySelector('[data-aim]');
  const canAim = matchMedia('(any-pointer: fine)').matches;
  let aimed = null;
  function updateAim() {
    const t = canAim && !fieldMoving && !dragging && !sheetOpen && !hovered ? centreTile() : null;
    if (t === aimed) return;
    aimed = t;
    aimEl.classList.toggle('is-on', !!t);
    if (t) aimEl.innerHTML = aimHtml(t);
  }
  const short = (p) => p.short ?? p.title;
  // The homepage shows project panels bare: no number, title, year, arrow or any
  // other label floats over them. The cursor label and the keyboard aim tag are
  // therefore only for the contact and email tiles. The panels stay fully
  // interactive — click/tap still opens the project sheet.
  const labelled = (t) => !!t && !t.project;
  const aimHtml = (t) => `<b>↵</b> ${esc(t.project ? T('aim.project', { title: short(t.project) }) : T('aim.contact'))}`;
  const labelHtml = (t) => (t.project
    ? `${esc(T('cursor.project', { title: short(t.project) }))} <b>${esc(T('cursor.projectTag'))}</b>`
    : `${esc(T('cursor.contact'))} <b>${esc(T('cursor.contactTag'))}</b>`);
  function updateHover() {
    if (!ptr || dragging || sheetOpen || fieldMoving) { setHover(null); return; }
    const t = tileAt(ptr.x, ptr.y);
    setHover(isLink(t) && labelled(t) ? t : null, ptr.x, ptr.y);
  }
  // The label trails the pointer slightly (quickTo); it jumps into place when it appears,
  // and always with reduced motion.
  const labelX = gsap.quickTo(label, 'x', { duration: 0.25, ease: 'power3.out' });
  const labelY = gsap.quickTo(label, 'y', { duration: 0.25, ease: 'power3.out' });
  function setHover(t, x, y) {
    const appearing = t && !hovered;
    if (t !== hovered) {
      if (t) sound.tick();
      hovered = t;
      stage.classList.toggle('is-link', !!t);
      label.classList.toggle('is-on', !!t);
      if (t) label.innerHTML = labelHtml(t);
    }
    if (!t) return;
    if (appearing || reducedMotion) { labelX(x + 18, x + 18); labelY(y + 18, y + 18); return; }
    labelX(x + 18); labelY(y + 18);
  }

  on(stage, 'wheel', (e) => {
    if (sheetOpen) return;
    e.preventDefault();
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1;
    let dx = e.deltaX * k, dy = e.deltaY * k;
    if (e.shiftKey && !dx) { dx = dy; dy = 0; }
    contactCall?.kill(); contactCall = null; stopFlight(); lastInput = now;
    if (reducedMotion) { cam.x += dx / zoomEff; cam.y += dy / zoomEff; dirty = true; return; }
    vel.x += (dx * config.wheel) / zoomEff; vel.y += (dy * config.wheel) / zoomEff;
  }, { passive: false });

  const keys = new Set();
  const DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  on(window, 'keydown', (e) => {
    if (!sheetOpen && (e.target.closest?.('.a24-nav') || document.querySelector('.a24-nav[data-open="true"]'))) return;
    if (e.key === 'Escape') { closeSheet(); return; }
    if (sheetOpen) {
      // Keep keyboard navigation inside the modal without changing its visual behavior.
      if (e.key === 'Tab') {
        const controls = [...sheetPanel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]')]
          .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && (document.activeElement === first || !sheetPanel.contains(document.activeElement))) {
          e.preventDefault(); last?.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !sheetPanel.contains(document.activeElement))) {
          e.preventDefault(); first?.focus();
        }
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      // open the tile under the crosshair, unless focus is on something that owns the key
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest?.('button, a, input, textarea, select, summary, [contenteditable], [tabindex], [data-sheet]')) return;
      const t = centreTile();
      if (!t) return;
      e.preventDefault();
      sound.tap();
      activate(t);
      return;
    }
    if (!DIRS[e.key]) return;
    // Match the source for the Reframe HUD while leaving other interactive UI alone.
    if (!e.target.closest?.('.hud--top') && e.target.closest?.('button, a, input, textarea, select, [contenteditable], [tabindex]')) return;
    e.preventDefault();
    contactCall?.kill(); contactCall = null; stopFlight(); lastInput = now;
    if (reducedMotion) {
      // step a third of a screen per press
      const [dx, dy] = DIRS[e.key];
      cam.x += (dx * viewW()) / 3; cam.y += (dy * viewH()) / 3; dirty = true;
      return;
    }
    keys.add(e.key);
  });
  on(window, 'keyup', (e) => keys.delete(e.key));
  on(window, 'blur', () => keys.clear());

  // Re-selecting the retained Life/home control returns the camera to the hero.
  on(window, 'reframe:home', () => { closeSheet(); fly('hero'); });

  for (const b of container.querySelectorAll('[data-fly]')) {
    // A mouse/touch click drops focus again (e.detail > 0), so Enter then opens the tile
    // the flight lands on; a keyboard-activated button keeps focus.
    const fn = (e) => { closeSheet(); fly(b.dataset.fly); if (e.detail > 0) b.blur(); };
    on(b, 'click', fn);
  }

  on(window, 'resize', resize);

  // ─── HUD clock: "HKT 14:32:05", ticking ───
  const clockSec = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const updateClock = () => { if (outClock) outClock.textContent = clockSec.format(new Date()); };
  updateClock();
  const clockTimer = setInterval(updateClock, 250); // 250 ms so a second is never skipped

  // ─── loop: one gsap.ticker callback per frame (GSAP updates its tweens just before it) ───
  let running = false, last = performance.now(), frame = 0;
  const sv = { x: 0, y: 0 }; // low-passed camera velocity, world px/s
  let speedS = 0;            // its magnitude in screens per second

  function tick() {
    // Clamp both ways: a negative dt would turn friction into exponential growth.
    const t = performance.now();
    const dt = Math.max(0, Math.min(0.05, (t - last) / 1000)); last = Math.max(last, t);
    now += dt; frame++;
    if (!tiles.length) { renderer.render(scene, camera); return; }

    // drag: apply this frame's pointer movement in one step
    if (pending.x || pending.y) {
      cam.x -= pending.x / zoomEff; cam.y -= pending.y / zoomEff;
      pending.x = pending.y = 0; dirty = true;
    }

    // motion
    if (flight) {
      lastInput = now; // the flight tween moves cam; a flight counts as input
    } else if (!dragging && !reducedMotion) {
      // held arrow keys accelerate toward keySpeed
      if (keys.size) {
        let kx = 0, ky = 0;
        for (const k of keys) { kx += DIRS[k][0]; ky += DIRS[k][1]; }
        const a = 1 - 0.0025 ** dt; // ~fast approach
        vel.x += (kx * config.keySpeed - vel.x) * a; vel.y += (ky * config.keySpeed - vel.y) * a;
        lastInput = now;
      } else {
        const f = config.friction ** (dt * 60);
        vel.x *= f; vel.y *= f;
      }
      // idle: ease into a slow wandering drift
      if (now - lastInput > config.idleDelay && config.drift > 0) {
        const a = 1 - 0.985 ** (dt * 60);
        const dx = Math.cos(now * 0.05) * config.drift, dy = Math.sin(now * 0.037 + 1) * config.drift * 0.7;
        vel.x += (dx - vel.x) * a; vel.y += (dy - vel.y) * a;
      }
      const vmax = 8000; // px/s safety cap
      vel.x = Math.max(-vmax, Math.min(vmax, vel.x)); vel.y = Math.max(-vmax, Math.min(vmax, vel.y));
      cam.x += vel.x * dt; cam.y += vel.y * dt;
    }

    // measured velocity, low-passed with a time constant (frame-rate independent), so
    // uneven per-frame steps (0 or 2 pointer events in a frame) don't make the view breathe
    if (dt > 0) {
      let mx = (cam.x - prev.x) / dt, my = (cam.y - prev.y) / dt;
      if (dragging) ({ x: mx, y: my } = pointerVel(performance.now()));
      const a = 1 - Math.exp(-dt / config.speedTau);
      sv.x += (mx - sv.x) * a; sv.y += (my - sv.y) * a;
    }
    prev.x = cam.x; prev.y = cam.y;
    speedS = (Math.hypot(sv.x, sv.y) * zoom) / Math.max(vw, vh); // screens per second
    const speed = reducedMotion ? 0 : speedS;
    zoomEff = zoom * (1 - Math.min(speed * config.speedZoom, 0.1));
    shared.uView.value.set(vw / 2 / zoomEff, vh / 2 / zoomEff);
    const bend = Math.min(speed * config.bend, config.maxBend, 0.4);
    shared.uBend.value = bend;
    const sl = Math.hypot(sv.x, sv.y) || 1, sh = Math.min(speed * config.rgbShift, config.maxShift);
    shared.uShift.value.set((sv.x / sl) * sh, (-sv.y / sl) * sh);
    const moving = speed > 0.0005;
    updateLogo(dt);

    // place tiles: every wrapped copy (tile + k·W, + l·H) inside a keep-alive box gets a
    // mesh. The box is the worst case, not this frame's: full speed zoom-out (zoom × 0.9)
    // and the strongest barrel (which pulls content inward by up to 1 − 2·maxBend, so
    // the box grows by its inverse), plus cullMargin of the viewport on every side and one
    // large tile. Copies are enumerated per period, so each one moves continuously: a
    // tile never jumps to another repeat, and nothing is shown or hidden near the screen.
    const grow = 1 / (1 - 2 * Math.min(config.maxBend, 0.4));
    const zMin = zoom * 0.9;
    const hw = (vw / zMin) * (0.5 + config.cullMargin) * grow + C2;
    const hh = (vh / zMin) * (0.5 + config.cullMargin) * grow + C2;
    let animating = false;
    for (const tile of tiles) {
      const dx = tile.cx - cam.x, dy = tile.cy - cam.y, ax = hw + tile.w / 2, ay = hh + tile.h / 2;
      let n = 0;
      tile.copies.length = 0;
      for (let kx = Math.ceil((-ax - dx) / W); kx <= Math.floor((ax - dx) / W); kx++) {
        for (let ky = Math.ceil((-ay - dy) / H); ky <= Math.floor((ay - dy) / H); ky++) {
          const x = dx + kx * W, y = dy + ky * H;
          const mesh = tile.meshes[n] ?? makeMesh(tile);
          mesh.visible = true;
          mesh.material.uniforms.uOffset.value.set(x, y);
          tile.copies.push([x, y]);
          n++;
        }
      }
      for (let i = n; i < tile.meshes.length; i++) tile.meshes[i].visible = false;
      tile.onScreen = n > 0;
      if (tile.u.uReveal.value < 1) animating = true; // revealTween (build) drives uReveal
    }

    // hover: off while the field moves faster than ~the idle drift, or flies
    fieldMoving = !!flight || dragging || speedS > 0.05;
    updateHover();
    updateAim();
    const lit = hovered ?? aimed;
    for (const tile of tiles) {
      tile.pulse = Math.max(0, tile.pulse - dt);
      const target = tile === lit || tile.pulse > 0 || (lit?.project && lit.project === tile.project) ? 1 : 0;
      tile.hover += (target - tile.hover) * (1 - 0.85 ** (dt * 60));
      if (Math.abs(target - tile.hover) > 0.002) animating = true;
      tile.u.uHover.value = tile.hover;
    }

    if (frame % 3 === 0) sound.motion(reducedMotion ? 0 : speedS);

    // play only clips with a tile on screen; one shared VideoTexture each
    if (frame % 10 === 0) {
      for (const clip of clips.values()) {
        if (!clip.video) continue;
        const want = !sheetOpen && !document.hidden && clip.users.some((t) => t.onScreen);
        if (want && clip.video.paused) clip.video.play().catch(() => {});
        else if (!want && !clip.video.paused) clip.video.pause();
      }
      const c = clock.format(new Date());
      if (clockTile && c !== lastClock) { lastClock = c; clockTile(); dirty = true; }
      outX.textContent = fmt(cam.x / 10); outY.textContent = fmt(-cam.y / 10);
    }

    const playing = [...clips.values()].some((c) => c.live && c.video && !c.video.paused);
    if (moving || animating || playing || dirty || !reducedMotion) {
      renderer.render(scene, camera);
      dirty = false;
    }
  }
  const fmt = (v) => (v < 0 ? '−' : '+') + String(Math.abs(Math.round(v)) % 10000).padStart(4, '0');

  function start() { if (!running) { running = true; last = performance.now(); gsap.ticker.add(tick); } }
  function stop() { running = false; gsap.ticker.remove(tick); }
  on(document, 'visibilitychange', () => {
    if (document.hidden) { stop(); for (const c of clips.values()) c.video?.pause(); keys.clear(); } else start();
    sound.setHidden(document.hidden);
  });
  start();

  return {
    // The preloader lifted: release the gated assemble. Used when it finishes
    // before the kit has built, otherwise the ticker poll above picks it up.
    // The preloader lifted: release the gated assemble. Works whether the kit has
    // already built (reveals immediately) or is still building (build() sees
    // introGate === 'ready' and reveals as soon as the field exists).
    startEntrance() { if (!destroyed) { introGate = 'ready'; runEntrance(); } },
    destroy() {
      destroyed = true;
      revealEntrance = null;
      releaseEntrance();
      stop();
      clearInterval(clockTimer);
      for (const fn of cleanups) fn();
      closeSheet();
      mm.revert();
      for (const tw of [flight, revealTween, introTl, pulseTl, contactCall, sheetTl, copyTl]) tw?.kill();
      gsap.killTweensOf([cam, iris, ...intro.pieces, intro, label]);
      titleSplit?.revert();
      gsap.set([sheet, sheetPanel, sheetBackdrop, label], { clearProps: 'all' });
      sound.destroy();
      soundBtn.classList.remove('is-on');
      sheetBody.innerHTML = '';
      for (const c of clips.values()) {
        if (!c.video) continue;
        c.video.pause(); c.video.removeAttribute('src');
        c.video.replaceChildren(); c.video.load();
      }
      for (const t of tiles) for (const m of t.meshes) { scene.remove(m); m.material.dispose(); }
      tiles.length = 0;
      geometry.dispose();
      for (const t of textures) t.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      applyHud(true); hud = [];
      if (heroBase) heroBase.width = heroBase.height = 0;
      label.classList.remove('is-on');
      aimEl.classList.remove('is-on');
      stage.classList.remove('is-dragging', 'is-link');
      cleanGlobals();
    },
  };
}

// Each React home mount owns a fresh instance and its complete teardown.
export function mountReframe(container) { return init(container, { ...CONFIG }, KIT); }
