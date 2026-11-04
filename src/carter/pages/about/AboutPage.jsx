import './about.css';
import { About } from '../../engines/about.js';
import { Canvas } from '../../engines/canvas.js';
import { Console as AboutConsole } from '../../engines/console.js';
import { Deck } from '../../engines/deck.js';
import { FrankCard } from '../../engines/frank-card.js';
import { Marks } from '../../engines/marks.js';
import { NavRoll } from '../../engines/nav-roll.js';
import { Record } from '../../engines/record.js';
import { SignatureFx } from '../../engines/signature-fx.js';
import { Tilt } from '../../engines/tilt.js';
import { useCarterEngine } from '../../useCarterEngine.js';

/*
 * Carter About (`/about`) inside Jesper's Carter frame (route `/myself/about`).
 * Phase 3A's static DOM and CSS remain intact; Phase 3B mounts Carter's
 * source-confirmed About engines through the Phase 2 lifecycle boundary.
 * See README.md for engine ownership, responsive behavior and verification.
 *
 * Source: `app/pages/about.astro` in sausageOps/carterogunsola-reconstruction
 * (itself recovered from the captured original `pages/about.html`), rendered
 * through Carter's BaseLayout as `<main id="main" class="ov3" data-canvas>`
 * plus the three `afterMain` sibling dialogs. Markup, classes, Astro scope
 * attributes (data-astro-cid-*), data-* engine hooks, ARIA and inline styles
 * are Carter's verbatim; the only translations are HTML -> JSX mechanics
 * (className, SVG camelCase, style objects) and the expansions of Carter's
 * Socials / Button / CloseBox / Signature components to their rendered HTML.
 * Attribute values for Carter's bare attributes are presence-only ("" here;
 * Carter's captured HTML serializes some as "true").
 *
 * Engine-owned structures (markup and styles remain the Phase 3A port):
 * - [data-frank-gl] / [data-deck-gl]: empty WebGL hosts; FrankCard / Deck add
 *   their canvases only at Carter's desktop breakpoint, retaining the DOM card
 *   and flat radio fallback when those renderers are unavailable.
 * - [data-marks] field is filled by Marks; Tilt owns the stamp's pointer
 *   parallax/shine; SignatureFx paints the stored SVG path into an ink canvas.
 * - FrankCard owns the three native dialogs; Canvas owns desktop board drag,
 *   hover, activation, keyboard focus, scrim and the "Put it back" exit.
 * - About telemetry and Console fill Carter's boot-time labels from the Denver
 *   clock, local/live presence, GitHub contributions and radio endpoint.
 *
 * Asset gap: the stamp portrait WebPs exist in neither repo. The <img> keeps
 * Carter's filenames and attributes under the Phase 2 asset convention
 * (/assets/carter/about/); drop the files in public/assets/carter/about/.
 * Drawer links keep Carter hrefs (/writing, /lab); the frame maps them.
 */
export default function AboutPage() {
  useCarterEngine('about-canvas', () => Canvas.init());
  useCarterEngine('about-frank-card', () => FrankCard.init());
  useCarterEngine('about-deck', () => Deck.init());
  useCarterEngine('about-console', () => AboutConsole.init());
  useCarterEngine('about-telemetry', () => About.init());
  useCarterEngine('about-nav-roll', () => NavRoll.init());
  useCarterEngine('about-signature', () => SignatureFx.init());
  useCarterEngine('about-record', () => Record.init());
  useCarterEngine('about-marks', () => Marks.init());
  useCarterEngine('about-tilt', () => Tilt.init());

  return (
    <>
      <main id="main" className="ov3" data-canvas="" data-astro-cid-ta2fbyqs="">
        <h1 className="u-sr-only" data-astro-cid-ta2fbyqs="">About Carter Ogunsola, Creative Developer &amp; Brand Engineer</h1>
        <header className="ov3__ticket" hidden data-astro-cid-ta2fbyqs="">
        <span className="ov3__ticket-name text-label" data-astro-cid-ta2fbyqs="">The Front Office</span>
        <span className="ov3__ticket-kv text-mono-meta" aria-label="File status" data-astro-cid-ta2fbyqs="">
        <span data-astro-cid-ta2fbyqs="">
        <span className="k" data-astro-cid-ta2fbyqs="">JOB::</span>
        <b data-astro-cid-ta2fbyqs="">N°00</b>
        </span>
        <span data-astro-cid-ta2fbyqs="">
        <span className="k" data-astro-cid-ta2fbyqs="">EST::</span>
        <span className="v" data-astro-cid-ta2fbyqs="">2000</span>
        </span>
        <span data-astro-cid-ta2fbyqs="">
        <span className="k" data-astro-cid-ta2fbyqs="">STATUS::</span>
        <b data-astro-cid-ta2fbyqs="">OPEN</b>
        </span>
        </span>
        </header>
        <div className="ov3__board" data-astro-cid-ta2fbyqs="">
        <section className="ov3__item ov3__hero" data-canvas-item="" data-rot="0" tabIndex="0" style={{ '--fx': '0', '--fy': '-0.03' }} data-frank-stage="" aria-label="Carter Ogunsola" data-astro-cid-ta2fbyqs="">
        <div className="ov3__hero-gl" data-frank-gl="" aria-hidden="true" data-astro-cid-ta2fbyqs="">
        </div>
        <div className="ov3__hero-layer" data-frank-layer="" data-astro-cid-ta2fbyqs="">
        <article className="ov3__env u-card" data-frank-card="" data-hit="" data-marks-surface="" data-astro-cid-ta2fbyqs="">
        <span className="ov3__field" data-marks="" aria-hidden="true" data-astro-cid-ta2fbyqs="">
        </span>
        <span className="ov3__imprints" data-marks-avoid="" data-astro-cid-ta2fbyqs="">
        <button className="ov3__imprint" type="button" data-dialog-open="record" aria-label="The record: where the work has been" aria-haspopup="dialog" aria-expanded="false" data-astro-cid-ta2fbyqs="">
        <svg width="1em" height="1em" aria-hidden="true" data-astro-cid-ta2fbyqs="true" data-icon="suitcase-work">
        <symbol id="ai:local:suitcase-work" viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" d="M21.25 18.25v-9.5a2 2 0 0 0-2-2H4.75a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2h14.5a2 2 0 0 0 2-2ZM7.75 6.75v-2a2 2 0 0 1 2-2h4.5a2 2 0 0 1 2 2v2" />
        </symbol>
        <use href="#ai:local:suitcase-work">
        </use>
        </svg>
        </button>
        <button className="ov3__imprint" type="button" data-dialog-open="onfile" aria-label="On file: awards and features" aria-haspopup="dialog" aria-expanded="false" data-astro-cid-ta2fbyqs="">
        <svg width="1em" height="1em" aria-hidden="true" data-astro-cid-ta2fbyqs="true" data-icon="trophy">
        <symbol id="ai:local:trophy" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5">
        <path d="M12 18v-3m6.25-10.25h1a2 2 0 0 1 2 2v.5a3 3 0 0 1-3 3" />
        <path d="M5.75 4.75a2 2 0 0 1 2-2h8.5a2 2 0 0 1 2 2v4.5a6 6 0 0 1-6 6h-.5a6 6 0 0 1-6-6zm1 14.5a1.5 1.5 0 0 1 1.5-1.5h7.5a1.5 1.5 0 0 1 1.5 1.5v.5a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5zm-1-14.5h-1a2 2 0 0 0-2 2v.5a3 3 0 0 0 3 3" />
        </g>
        </symbol>
        <use href="#ai:local:trophy">
        </use>
        </svg>
        </button>
        </span>
        <div className="frank" style={{ '--sw': '208px', '--sh': '260px', '--cut': 'url(#stamp-cut-dm6sa1)' }} data-astro-cid-tl32dyly="">
        <svg className="frank__defs" aria-hidden="true" focusable="false" data-astro-cid-tl32dyly="">
        <defs data-astro-cid-tl32dyly="">
        <clipPath id="stamp-cut-dm6sa1" data-astro-cid-tl32dyly="">
        <path d="M0 0 L3.84 0 A4.521739130434782 4.521739130434782 0 0 0 12.89 0 L14.47 0 A4.521739130434782 4.521739130434782 0 0 0 23.51 0 L25.10 0 A4.521739130434782 4.521739130434782 0 0 0 34.14 0 L35.72 0 A4.521739130434782 4.521739130434782 0 0 0 44.77 0 L46.35 0 A4.521739130434782 4.521739130434782 0 0 0 55.39 0 L56.97 0 A4.521739130434782 4.521739130434782 0 0 0 66.02 0 L67.60 0 A4.521739130434782 4.521739130434782 0 0 0 76.64 0 L78.23 0 A4.521739130434782 4.521739130434782 0 0 0 87.27 0 L88.85 0 A4.521739130434782 4.521739130434782 0 0 0 97.90 0 L99.48 0 A4.521739130434782 4.521739130434782 0 0 0 108.52 0 L110.10 0 A4.521739130434782 4.521739130434782 0 0 0 119.15 0 L120.73 0 A4.521739130434782 4.521739130434782 0 0 0 129.77 0 L131.36 0 A4.521739130434782 4.521739130434782 0 0 0 140.40 0 L141.98 0 A4.521739130434782 4.521739130434782 0 0 0 151.03 0 L152.61 0 A4.521739130434782 4.521739130434782 0 0 0 161.65 0 L163.23 0 A4.521739130434782 4.521739130434782 0 0 0 172.28 0 L173.86 0 A4.521739130434782 4.521739130434782 0 0 0 182.90 0 L184.49 0 A4.521739130434782 4.521739130434782 0 0 0 193.53 0 L195.11 0 A4.521739130434782 4.521739130434782 0 0 0 204.16 0 L208 0 L208 3.28 A4.521739130434782 4.521739130434782 0 0 0 208 12.32 L208 13.90 A4.521739130434782 4.521739130434782 0 0 0 208 22.95 L208 24.53 A4.521739130434782 4.521739130434782 0 0 0 208 33.57 L208 35.16 A4.521739130434782 4.521739130434782 0 0 0 208 44.20 L208 45.78 A4.521739130434782 4.521739130434782 0 0 0 208 54.83 L208 56.41 A4.521739130434782 4.521739130434782 0 0 0 208 65.45 L208 67.03 A4.521739130434782 4.521739130434782 0 0 0 208 76.08 L208 77.66 A4.521739130434782 4.521739130434782 0 0 0 208 86.70 L208 88.29 A4.521739130434782 4.521739130434782 0 0 0 208 97.33 L208 98.91 A4.521739130434782 4.521739130434782 0 0 0 208 107.96 L208 109.54 A4.521739130434782 4.521739130434782 0 0 0 208 118.58 L208 120.17 A4.521739130434782 4.521739130434782 0 0 0 208 129.21 L208 130.79 A4.521739130434782 4.521739130434782 0 0 0 208 139.83 L208 141.42 A4.521739130434782 4.521739130434782 0 0 0 208 150.46 L208 152.04 A4.521739130434782 4.521739130434782 0 0 0 208 161.09 L208 162.67 A4.521739130434782 4.521739130434782 0 0 0 208 171.71 L208 173.30 A4.521739130434782 4.521739130434782 0 0 0 208 182.34 L208 183.92 A4.521739130434782 4.521739130434782 0 0 0 208 192.97 L208 194.55 A4.521739130434782 4.521739130434782 0 0 0 208 203.59 L208 205.17 A4.521739130434782 4.521739130434782 0 0 0 208 214.22 L208 215.80 A4.521739130434782 4.521739130434782 0 0 0 208 224.84 L208 226.43 A4.521739130434782 4.521739130434782 0 0 0 208 235.47 L208 237.05 A4.521739130434782 4.521739130434782 0 0 0 208 246.10 L208 247.68 A4.521739130434782 4.521739130434782 0 0 0 208 256.72 L208 260 L204.16 260 A4.521739130434782 4.521739130434782 0 0 0 195.11 260 L193.53 260 A4.521739130434782 4.521739130434782 0 0 0 184.49 260 L182.90 260 A4.521739130434782 4.521739130434782 0 0 0 173.86 260 L172.28 260 A4.521739130434782 4.521739130434782 0 0 0 163.23 260 L161.65 260 A4.521739130434782 4.521739130434782 0 0 0 152.61 260 L151.03 260 A4.521739130434782 4.521739130434782 0 0 0 141.98 260 L140.40 260 A4.521739130434782 4.521739130434782 0 0 0 131.36 260 L129.77 260 A4.521739130434782 4.521739130434782 0 0 0 120.73 260 L119.15 260 A4.521739130434782 4.521739130434782 0 0 0 110.10 260 L108.52 260 A4.521739130434782 4.521739130434782 0 0 0 99.48 260 L97.90 260 A4.521739130434782 4.521739130434782 0 0 0 88.85 260 L87.27 260 A4.521739130434782 4.521739130434782 0 0 0 78.23 260 L76.64 260 A4.521739130434782 4.521739130434782 0 0 0 67.60 260 L66.02 260 A4.521739130434782 4.521739130434782 0 0 0 56.97 260 L55.39 260 A4.521739130434782 4.521739130434782 0 0 0 46.35 260 L44.77 260 A4.521739130434782 4.521739130434782 0 0 0 35.72 260 L34.14 260 A4.521739130434782 4.521739130434782 0 0 0 25.10 260 L23.51 260 A4.521739130434782 4.521739130434782 0 0 0 14.47 260 L12.89 260 A4.521739130434782 4.521739130434782 0 0 0 3.84 260 L0 260 L0 256.72 A4.521739130434782 4.521739130434782 0 0 0 0 247.68 L0 246.10 A4.521739130434782 4.521739130434782 0 0 0 0 237.05 L0 235.47 A4.521739130434782 4.521739130434782 0 0 0 0 226.43 L0 224.84 A4.521739130434782 4.521739130434782 0 0 0 0 215.80 L0 214.22 A4.521739130434782 4.521739130434782 0 0 0 0 205.17 L0 203.59 A4.521739130434782 4.521739130434782 0 0 0 0 194.55 L0 192.97 A4.521739130434782 4.521739130434782 0 0 0 0 183.92 L0 182.34 A4.521739130434782 4.521739130434782 0 0 0 0 173.30 L0 171.71 A4.521739130434782 4.521739130434782 0 0 0 0 162.67 L0 161.09 A4.521739130434782 4.521739130434782 0 0 0 0 152.04 L0 150.46 A4.521739130434782 4.521739130434782 0 0 0 0 141.42 L0 139.83 A4.521739130434782 4.521739130434782 0 0 0 0 130.79 L0 129.21 A4.521739130434782 4.521739130434782 0 0 0 0 120.17 L0 118.58 A4.521739130434782 4.521739130434782 0 0 0 0 109.54 L0 107.96 A4.521739130434782 4.521739130434782 0 0 0 0 98.91 L0 97.33 A4.521739130434782 4.521739130434782 0 0 0 0 88.29 L0 86.70 A4.521739130434782 4.521739130434782 0 0 0 0 77.66 L0 76.08 A4.521739130434782 4.521739130434782 0 0 0 0 67.03 L0 65.45 A4.521739130434782 4.521739130434782 0 0 0 0 56.41 L0 54.83 A4.521739130434782 4.521739130434782 0 0 0 0 45.78 L0 44.20 A4.521739130434782 4.521739130434782 0 0 0 0 35.16 L0 33.57 A4.521739130434782 4.521739130434782 0 0 0 0 24.53 L0 22.95 A4.521739130434782 4.521739130434782 0 0 0 0 13.90 L0 12.32 A4.521739130434782 4.521739130434782 0 0 0 0 3.28 L0 0 Z" data-astro-cid-tl32dyly="">
        </path>
        </clipPath>
        <filter id="stamp-print-dm6sa1" colorInterpolationFilters="sRGB" data-astro-cid-tl32dyly="">
        <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0" data-astro-cid-tl32dyly="">
        </feColorMatrix>
        <feComponentTransfer data-astro-cid-tl32dyly="">
        <feFuncR type="discrete" tableValues=".00 .11 .22 .33 .44 .56 .67 .78 .89 1" data-astro-cid-tl32dyly="">
        </feFuncR>
        <feFuncG type="discrete" tableValues=".00 .11 .22 .33 .44 .56 .67 .78 .89 1" data-astro-cid-tl32dyly="">
        </feFuncG>
        <feFuncB type="discrete" tableValues=".00 .11 .22 .33 .44 .56 .67 .78 .89 1" data-astro-cid-tl32dyly="">
        </feFuncB>
        </feComponentTransfer>
        </filter>
        <filter id="pm-ink-dm6sa1" x="-8%" y="-8%" width="116%" height="116%" data-astro-cid-tl32dyly="">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="41" result="r" data-astro-cid-tl32dyly="">
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="r" scale="1.2" result="d" data-astro-cid-tl32dyly="">
        </feDisplacementMap>
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="48" result="m" data-astro-cid-tl32dyly="">
        </feTurbulence>
        <feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 3 -0.9" result="mm" data-astro-cid-tl32dyly="">
        </feColorMatrix>
        <feComposite in="d" in2="mm" operator="in" data-astro-cid-tl32dyly="">
        </feComposite>
        </filter>
        </defs>
        </svg>
        <div className="frank__stamp" data-tilt="" style={{ '--print': 'url(#stamp-print-dm6sa1)' }} data-astro-cid-tl32dyly="">
        <img src="/assets/carter/about/carter-stamp.BRpWjIXQ_4vkhB.webp" srcSet="/assets/carter/about/carter-stamp.BRpWjIXQ_ZH60A1.webp 560w, /assets/carter/about/carter-stamp.BRpWjIXQ_4vkhB.webp 1000w" alt="Carter Ogunsola" sizes="(max-width: 63.99rem) 184px, 560px" draggable={false} data-astro-cid-tl32dyly="true" loading="eager" decoding="sync" fetchPriority="high" width="1000" height="1250" className="frank__photo u-cover u-no-drag" />
        <span className="frank__cap" data-astro-cid-tl32dyly="">Carter Ogunsola<svg className="frank__waves" viewBox="0 0 26 10" fill="none" aria-hidden="true" focusable="false" data-astro-cid-tl32dyly="">
        <path d="M1 2c3-1.6 5-1.6 8 0s5 1.6 8 0 5-1.6 8 0" data-astro-cid-tl32dyly="">
        </path>
        <path d="M1 5c3-1.6 5-1.6 8 0s5 1.6 8 0 5-1.6 8 0" data-astro-cid-tl32dyly="">
        </path>
        <path d="M1 8c3-1.6 5-1.6 8 0s5 1.6 8 0 5-1.6 8 0" data-astro-cid-tl32dyly="">
        </path>
        </svg>
        </span>
        </div>
        <span className="frank__shine" data-tilt-shine="" aria-hidden="true" data-astro-cid-tl32dyly="">
        </span>
        <svg className="frank__postmark" data-marks-avoid="" viewBox="0 0 190 96" fill="none" aria-hidden="true" focusable="false" data-astro-cid-tl32dyly="">
        <defs data-astro-cid-tl32dyly="">
        <path id="pm-arc-top-dm6sa1" d="M11 48a37 37 0 0 1 74 0" data-astro-cid-tl32dyly="">
        </path>
        <path id="pm-arc-bot-dm6sa1" d="M15 48a33 33 0 0 0 66 0" data-astro-cid-tl32dyly="">
        </path>
        </defs>
        <g filter="url(#pm-ink-dm6sa1)" data-astro-cid-tl32dyly="">
        <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="1.6" data-astro-cid-tl32dyly="">
        </circle>
        <circle cx="48" cy="48" r="33" stroke="currentColor" strokeWidth="1" data-astro-cid-tl32dyly="">
        </circle>
        <text className="frank__postmark-type" fill="currentColor" data-astro-cid-tl32dyly="">
        <textPath href="#pm-arc-top-dm6sa1" startOffset="50%" textAnchor="middle" data-astro-cid-tl32dyly="">LAGOS · NG</textPath>
        </text>
        <text className="frank__postmark-type" fill="currentColor" data-astro-cid-tl32dyly="">
        <textPath href="#pm-arc-bot-dm6sa1" startOffset="50%" textAnchor="middle" data-astro-cid-tl32dyly="">UTAH · US</textPath>
        </text>
        <path d="M31 44h34M31 52h34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="butt" data-astro-cid-tl32dyly="">
        </path>
        <path d="M94 30q11-5 22 0t22 0 22 0 22 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" data-astro-cid-tl32dyly="">
        </path>
        <path d="M94 42q11-5 22 0t22 0 22 0 22 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" data-astro-cid-tl32dyly="">
        </path>
        <path d="M94 54q11-5 22 0t22 0 22 0 22 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" data-astro-cid-tl32dyly="">
        </path>
        <path d="M94 66q11-5 22 0t22 0 22 0 22 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" data-astro-cid-tl32dyly="">
        </path>
        </g>
        </svg>
        </div>
        <div className="ov3__conn" data-astro-cid-ta2fbyqs="">
        <div className="ov3__conn-row" data-marks-avoid="" data-astro-cid-ta2fbyqs="">
        <ul className="socials"><li><a className="socials__link" href="https://x.com/CarterOgunsola" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)"><span className="socials__roll"><span className="socials__move"><svg width="1em" height="1em" className="socials__icon" data-icon="x"><symbol id="ai:local:x" viewBox="0 0 24 24"><path fill="currentColor" d="M17.565 3.25h2.967l-6.482 7.413 7.625 10.087h-5.97l-4.676-6.118-5.35 6.118H2.71l6.933-7.929L2.328 3.25H8.45l4.227 5.592zm-1.041 15.723h1.644L7.557 4.933H5.793z" /></symbol><use href="#ai:local:x"></use></svg><svg width="1em" height="1em" viewBox="0 0 24 24" className="socials__icon" data-icon="x"><use href="#ai:local:x"></use></svg></span></span></a></li><li><a className="socials__link" href="https://www.instagram.com/carterogunsola.dev/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><span className="socials__roll"><span className="socials__move"><svg width="1em" height="1em" className="socials__icon" data-icon="instagram"><symbol id="ai:local:instagram" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4.212c2.537 0 2.837.01 3.839.055a5.3 5.3 0 0 1 1.763.327c.413.153.786.395 1.093.711.316.307.558.68.71 1.093.21.564.32 1.16.328 1.763.046 1.002.055 1.303.055 3.839s-.01 2.837-.055 3.839a5.3 5.3 0 0 1-.327 1.763 3.15 3.15 0 0 1-1.804 1.804c-.564.209-1.16.32-1.763.327-1.002.046-1.303.055-3.839.055s-2.837-.01-3.839-.055a5.3 5.3 0 0 1-1.764-.327 2.94 2.94 0 0 1-1.092-.711 2.94 2.94 0 0 1-.71-1.093 5.3 5.3 0 0 1-.328-1.763c-.046-1.002-.055-1.303-.055-3.839s.01-2.837.055-3.839a5.3 5.3 0 0 1 .327-1.763c.153-.413.395-.786.711-1.093.307-.316.68-.558 1.093-.71a5.3 5.3 0 0 1 1.763-.328c1.002-.046 1.303-.055 3.839-.055M12 2.5c-2.58 0-2.904.011-3.917.057a7 7 0 0 0-2.306.441 4.7 4.7 0 0 0-1.683 1.097 4.7 4.7 0 0 0-1.096 1.683 7 7 0 0 0-.44 2.305C2.51 9.096 2.5 9.42 2.5 12s.011 2.903.057 3.917c.016.788.165 1.567.441 2.306a4.7 4.7 0 0 0 1.097 1.683 4.7 4.7 0 0 0 1.683 1.096 7 7 0 0 0 2.305.44c1.013.048 1.337.058 3.917.058s2.903-.011 3.917-.057a7 7 0 0 0 2.306-.441 4.86 4.86 0 0 0 2.779-2.78 7 7 0 0 0 .44-2.305c.048-1.014.058-1.337.058-3.917s-.011-2.904-.057-3.917a7 7 0 0 0-.441-2.306 4.7 4.7 0 0 0-1.097-1.683 4.7 4.7 0 0 0-1.683-1.096 7 7 0 0 0-2.305-.44C14.903 2.51 14.58 2.5 12 2.5m0 4.621a4.879 4.879 0 1 0 0 9.758 4.879 4.879 0 0 0 0-9.758m0 8.046a3.167 3.167 0 1 1 0-6.334 3.167 3.167 0 0 1 0 6.334m5.071-9.378a1.14 1.14 0 1 0 0 2.28 1.14 1.14 0 0 0 0-2.28" /></symbol><use href="#ai:local:instagram"></use></svg><svg width="1em" height="1em" viewBox="0 0 24 24" className="socials__icon" data-icon="instagram"><use href="#ai:local:instagram"></use></svg></span></span></a></li><li><a className="socials__link" href="https://github.com/CarterOgunsola" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><span className="socials__roll"><span className="socials__move"><svg width="1em" height="1em" className="socials__icon" data-icon="github"><symbol id="ai:local:github" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1.95c5.525 0 10 4.476 10 10a10.02 10.02 0 0 1-6.812 9.488c-.5.1-.688-.212-.688-.475 0-.337.012-1.412.012-2.75 0-.937-.312-1.537-.675-1.85 2.226-.25 4.563-1.1 4.563-4.937 0-1.1-.387-1.988-1.025-2.688.1-.25.45-1.275-.1-2.65 0 0-.837-.275-2.75 1.025a9.3 9.3 0 0 0-2.5-.337c-.85 0-1.7.112-2.5.337-1.913-1.287-2.75-1.025-2.75-1.025-.55 1.375-.2 2.4-.1 2.65-.638.7-1.025 1.6-1.025 2.688 0 3.825 2.325 4.687 4.55 4.937-.287.25-.55.688-.637 1.338-.575.262-2.013.687-2.913-.825-.187-.3-.75-1.038-1.538-1.025-.837.012-.337.475.013.662.425.238.912 1.125 1.025 1.413.2.562.85 1.637 3.362 1.175 0 .837.013 1.625.013 1.862 0 .263-.187.563-.687.475A9.99 9.99 0 0 1 2 11.951c0-5.525 4.475-10 10-10" /></symbol><use href="#ai:local:github"></use></svg><svg width="1em" height="1em" viewBox="0 0 24 24" className="socials__icon" data-icon="github"><use href="#ai:local:github"></use></svg></span></span></a></li><li><a className="socials__link" href="https://www.awwwards.com/carter-ogunsola/" target="_blank" rel="noopener noreferrer" aria-label="Awwwards"><span className="socials__roll"><span className="socials__move"><svg className="socials__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M19.1667 4.99999L13.5833 16.05H8.34167L10.675 11.4667H10.5667C8.64167 14 5.75833 15.6667 1.66667 16.05V11.5333C1.66667 11.5333 4.29167 11.375 5.83333 9.73333H1.66667V4.99166H6.34167V8.89167H6.45L8.35833 4.99166H11.9V8.86667H12.0083L13.9917 4.99166H19.1667V4.99999Z"></path></svg><svg className="socials__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M19.1667 4.99999L13.5833 16.05H8.34167L10.675 11.4667H10.5667C8.64167 14 5.75833 15.6667 1.66667 16.05V11.5333C1.66667 11.5333 4.29167 11.375 5.83333 9.73333H1.66667V4.99166H6.34167V8.89167H6.45L8.35833 4.99166H11.9V8.86667H12.0083L13.9917 4.99166H19.1667V4.99999Z"></path></svg></span></span></a></li></ul>
        </div>
        <div className="ov3__conn-row" data-marks-avoid="" data-astro-cid-ta2fbyqs="">
        <button type="button" className="btn btn--solid text-tag" data-dialog-open="letter" aria-haspopup="dialog" aria-expanded="false" data-astro-cid-ta2fbyqs="" data-astro-cid-j6ocf6pu="">
        <span className="btn__label roll" data-roll="" data-astro-cid-j6ocf6pu="">About me</span>
        </button>
        <span className="ov3__conn-from text-label" data-astro-cid-ta2fbyqs="">Lagos → Utah</span>
        </div>
        </div>
        </article>
        </div>
        </section>
        <article className="ov3__item ov3__tele u-card" data-canvas-item="" data-rot="-1.3" tabIndex="0" style={{ '--fx': '-0.32', '--fy': '0.24' }} data-about="" data-state="boot" aria-label="Telemetry" data-astro-cid-ta2fbyqs="">
        <div className="ov3__tele-head" data-astro-cid-ta2fbyqs="">
        <span className="ov3__tele-tag text-mono-tag" data-astro-cid-ta2fbyqs="">Telemetry::<span className="ov3__roll" data-about-state="" data-astro-cid-ta2fbyqs="">Sync</span>
        </span>
        <button className="ov3__scope" type="button" data-about-scope="" aria-pressed="false" aria-label="Turn the tape over" data-astro-cid-ta2fbyqs="">
        </button>
        </div>
        <div className="ov3__tele-rows text-mono-meta" data-astro-cid-ta2fbyqs="">
        <span data-astro-cid-ta2fbyqs="">
        <span className="k" data-astro-cid-ta2fbyqs="">LOCAL::</span>
        <span className="v ov3__roll" data-about-time="" data-astro-cid-ta2fbyqs="">--:--</span>
        </span>
        <span data-live="" data-astro-cid-ta2fbyqs="">
        <span className="k" data-astro-cid-ta2fbyqs="">POS::</span>
        <span className="v" data-astro-cid-ta2fbyqs="">N 37°05′47″ / W 113°34′06″</span>
        </span>
        <span data-online-row="" data-astro-cid-ta2fbyqs="">
        <span className="k" data-astro-cid-ta2fbyqs="">ONLINE::</span>
        <span className="v ov3__roll" data-online="" data-astro-cid-ta2fbyqs="">···</span>
        </span>
        <span data-commits-row="" data-astro-cid-ta2fbyqs="">
        <span className="k" data-astro-cid-ta2fbyqs="">COMMITS::</span>
        <span className="v ov3__roll" data-commits-total="" data-astro-cid-ta2fbyqs="">···</span>
        </span>
        </div>
        <div className="ov3__commits" data-commits="" aria-hidden="true" data-astro-cid-ta2fbyqs="">
        {/* Carter's 154 commit cells; the About telemetry engine sets their
            --heat/--gh/--d values from the GitHub contributions response. */}
        {Array.from({ length: 154 }, (_, i) => (
          <span key={i} data-astro-cid-ta2fbyqs="" />
        ))}
        </div>
        </article>
        <article className="ov3__item ov3__radio" data-canvas-item="" data-rot="0.8" tabIndex="0" style={{ '--fx': '0.35', '--fy': '0.17' }} data-deck-stage="" aria-label="Radio" data-astro-cid-ta2fbyqs="">
        <div className="ov3__deck" data-deck-gl="" aria-hidden="true" data-astro-cid-ta2fbyqs="">
        </div>
        <div className="ov3__deck-layer" data-deck-layer="" data-astro-cid-ta2fbyqs="">
        <div className="ov3__strip" data-deck-panel="" data-astro-cid-ta2fbyqs="">
        <div className="con con--deck" data-console="" data-on="false" data-state="boot" data-con-plain="" data-astro-cid-v6dmze42="">
        <img alt="" className="con__art-src" data-con-img="" hidden data-astro-cid-v6dmze42="" />
        <div className="con__zone" data-astro-cid-v6dmze42="">
        <div className="con__head" data-astro-cid-v6dmze42="">
        <span className="con__tag text-mono-tag" data-astro-cid-v6dmze42="">Radio::<span className="con__roll" data-con-state="" data-astro-cid-v6dmze42="">Tuning</span>
        </span>
        <span className="con__meta text-mono-meta" data-astro-cid-v6dmze42="">
        <span className="con__onair" aria-hidden="true" data-astro-cid-v6dmze42="">
        </span>
        <span className="con__roll" data-con-status="" data-astro-cid-v6dmze42="">SEARCHING</span>
        </span>
        </div>
        <div className="con__now" data-astro-cid-v6dmze42="">
        <span className="con__deck" aria-live="polite" data-astro-cid-v6dmze42="">
        <span className="con__track text-h6" data-con-track="" data-astro-cid-v6dmze42="">Tuning in…</span>
        <span className="con__artist text-meta" data-con-artist="" data-astro-cid-v6dmze42="">Stand by</span>
        <span className="con__progress text-mono-sm" aria-hidden="true" data-astro-cid-v6dmze42="">
        <span data-con-elapsed="" data-astro-cid-v6dmze42="">0:00</span>
        <span className="con__bar" data-astro-cid-v6dmze42="">
        <span data-con-bar="" data-astro-cid-v6dmze42="">
        </span>
        </span>
        <span data-con-remain="" data-astro-cid-v6dmze42="">−0:00</span>
        </span>
        </span>
        <span className="con__eq" aria-hidden="true" data-astro-cid-v6dmze42="">
        <i data-astro-cid-v6dmze42="">
        </i>
        <i data-astro-cid-v6dmze42="">
        </i>
        <i data-astro-cid-v6dmze42="">
        </i>
        <i data-astro-cid-v6dmze42="">
        </i>
        <i data-astro-cid-v6dmze42="">
        </i>
        </span>
        </div>
        </div>
        <div className="con__spec" data-astro-cid-v6dmze42="">
        <span className="con__read" hidden data-con-rot-mod="" data-astro-cid-v6dmze42="">
        <span className="con__k text-mono-sm" data-astro-cid-v6dmze42="">Rotation::</span>
        <span className="con__v text-mono-sm" data-astro-cid-v6dmze42="">
        <span className="con__roll" data-con-rot="" data-astro-cid-v6dmze42="">
        </span>
        </span>
        </span>
        <span className="con__read" hidden data-con-tape-mod="" data-astro-cid-v6dmze42="">
        <span className="con__k text-mono-sm" data-con-tape-k="" data-astro-cid-v6dmze42="">Tape::</span>
        <span className="con__v text-mono-sm" data-astro-cid-v6dmze42="">
        <span className="con__roll" data-con-tape="" data-astro-cid-v6dmze42="">
        </span>
        </span>
        </span>
        </div>
        </div>
        </div>
        </div>
        </article>
        <article className="ov3__tag" hidden data-astro-cid-ta2fbyqs="">
        <div className="ov3__tag-card" data-astro-cid-ta2fbyqs="">
        <svg className="ov3__tag-eyelet" viewBox="0 0 24 24" aria-hidden="true" data-astro-cid-ta2fbyqs="">
        <defs data-astro-cid-ta2fbyqs="">
        <linearGradient id="eye-ni" x1="0" y1="0" x2="1" y2="1" data-astro-cid-ta2fbyqs="">
        <stop offset="0" stopColor="#e6e7e9" data-astro-cid-ta2fbyqs="">
        </stop>
        <stop offset="0.55" stopColor="#8f9196" data-astro-cid-ta2fbyqs="">
        </stop>
        <stop offset="1" stopColor="#d3d5d8" data-astro-cid-ta2fbyqs="">
        </stop>
        </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="9" fill="url(#eye-ni)" data-astro-cid-ta2fbyqs="">
        </circle>
        <circle cx="12" cy="12" r="5" fill="var(--paper)" data-astro-cid-ta2fbyqs="">
        </circle>
        <circle cx="12" cy="12" r="5" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1" data-astro-cid-ta2fbyqs="">
        </circle>
        </svg>
        <div className="ov3__tag-route" aria-label="Lagos to St. George" data-astro-cid-ta2fbyqs="">
        <span className="ov3__tag-code" data-astro-cid-ta2fbyqs="">LOS</span>
        <span className="ov3__tag-arrow" aria-hidden="true" data-astro-cid-ta2fbyqs="">
        <i data-astro-cid-ta2fbyqs="">
        </i>
        </span>
        <span className="ov3__tag-code" data-astro-cid-ta2fbyqs="">SGU</span>
        </div>
        <div className="ov3__tag-cities text-label" aria-hidden="true" data-astro-cid-ta2fbyqs="">
        <span data-astro-cid-ta2fbyqs="">Lagos, NG</span>
        <span data-astro-cid-ta2fbyqs="">St. George, UT</span>
        </div>
        <p className="ov3__tag-print text-mono-sm" data-astro-cid-ta2fbyqs="">11,886 km · −7 h · since 2000</p>
        <svg className="ov3__barcode" viewBox="0 0 150 22" preserveAspectRatio="none" aria-hidden="true" data-astro-cid-ta2fbyqs="">
        <rect x="0" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="3" y="0" width="3" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="8" y="0" width="3" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="12" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="15" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="19" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="22" y="0" width="3" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="27" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="29" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="32" y="0" width="3" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="36" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="38" y="0" width="3" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="42" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="46" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="49" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="52" y="0" width="3" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="57" y="0" width="3" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="61" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="64" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="67" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="69" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="73" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="76" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="78" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="81" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="83" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="86" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="89" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="93" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="97" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="100" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="104" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="107" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="110" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="113" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="116" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="118" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="120" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="124" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="126" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="130" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="132" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="134" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="137" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="140" y="0" width="2" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="144" y="0" width="1" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        <rect x="146" y="0" width="3" height="22" fill="currentColor" data-astro-cid-ta2fbyqs="">
        </rect>
        </svg>
        </div>
        </article>
        </div>
        <div className="ov3__exit" data-canvas-exit="" hidden data-astro-cid-ta2fbyqs="">
        <button type="button" aria-label="Put it back" data-astro-cid-ta2fbyqs="true" data-astro-cid-rqy3m4bm="true" className="closebox closebox--md closebox--surface">
        <svg width="1em" height="1em" aria-hidden="true" data-astro-cid-rqy3m4bm="true" data-icon="close">
        <symbol id="ai:local:close" viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5" />
        </symbol>
        <use href="#ai:local:close">
        </use>
        </svg>
        </button>
        </div>
        <nav className="ov3__drawer" aria-label="Adjacent files" data-astro-cid-ta2fbyqs="">
        <a className="ov3__drawer-tab text-label" href="/writing" data-astro-cid-ta2fbyqs="">File:: Writing</a>
        <a className="ov3__drawer-tab text-label" href="/lab" data-astro-cid-ta2fbyqs="">File:: Lab</a>
        </nav>
      </main>
      <dialog className="ov3__dialog ov3__letter" data-dialog="letter" aria-labelledby="letter-title" data-lenis-prevent="" data-astro-cid-ta2fbyqs="">
      <div className="ov3__dialog-scroll" data-lenis-prevent="" data-astro-cid-ta2fbyqs="">
      <div className="ov3__dialog-head" data-astro-cid-ta2fbyqs="">
      <span className="text-label ov3__dialog-tag" data-astro-cid-ta2fbyqs="">The letter ::</span>
      <button type="button" aria-label="Close" className="closebox closebox--sm closebox--fill" data-dialog-close="" data-astro-cid-ta2fbyqs="" data-astro-cid-rqy3m4bm="">
      <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" data-icon="close" data-astro-cid-rqy3m4bm="">
      <use href="#ai:local:close">
      </use>
      </svg>
      </button>
      </div>
      <p className="ov3__salut" id="letter-title" data-astro-cid-ta2fbyqs="">Hey, you pulled my file.</p>
      <div className="ov3__body" data-astro-cid-ta2fbyqs="">
      <p data-astro-cid-ta2fbyqs="">I’m a creative developer, director and entrepreneur focused on crafting truly unique web experiences. Strong background in design, an unconventional way into every problem, and a taste for pure digital originality.</p>
      <p data-astro-cid-ta2fbyqs="">Days I’m the lead web developer and brand engineer at <a href="https://strivepharmacy.com" data-underline-link="" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="">Strive</a>. I founded and run <a href="https://www.balky.studio/" data-underline-link="" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="">Balky Studio</a>, and I’m building <a href="https://www.odyn.dev/" data-underline-link="" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="">Odyn</a>, custom code in production for Webflow. Nights, the lab stays lit.</p>
      <p data-astro-cid-ta2fbyqs="">Born in Lagos, Nigeria. Based in Utah. The press out front is what the shop makes. This room is who makes it.</p>
      </div>
      <div className="ov3__sigrow" data-astro-cid-ta2fbyqs="">
      <span className="signature ov3__sig" data-signature="" data-sig-pts="[2,88.95,15.34,85.96,28.7,83.1,42.07,80.28,55.45,77.48,68.83,74.68,82.2,71.87,95.57,69.04,108.93,66.18,122.29,63.28,135.63,60.33,148.97,57.33,162.29,54.26,175.59,51.13,188.87,47.91,202.13,44.6,215.36,41.19,228.56,37.65,241.72,33.96,254.83,30.1,267.88,26.03,280.84,21.7,293.7,17.06,306.33,11.86,317.15,4.21,304.18,2.06,290.55,3.04,276.97,4.61,263.44,6.48,249.93,8.54,236.45,10.82,223.07,13.6,209.81,16.89,196.66,20.63,183.65,24.79,170.76,29.34,158.01,34.25,145.4,39.53,132.95,45.16,120.66,51.15,108.56,57.5,96.67,64.23,85.03,71.39,73.68,79.01,62.73,87.17,52.3,96,42.68,105.7,34.49,116.61,29.53,129.25,31.36,142.5,42.07,150.53,55.43,153.21,69.08,153.41,82.7,152.29,96.22,150.31,109.64,147.74,122.97,144.73,136.22,141.37,149.38,137.7,162.47,133.77,175.49,129.61,188.44,125.25,201.32,120.68,214.13,115.91,226.86,110.94,239.5,105.74,252.02,100.26,264.36,94.39,276.26,87.68,272.83,82.88,259.36,85.14,246.17,88.7,233.27,93.22,220.74,98.67,208.87,105.41,200.71,115.65,212.28,121.6,225.85,123.04,239.47,122.11,252.79,119.1,265.53,114.19,277.32,107.31,287.38,98.11,293,105.01,286.58,116.96,276.52,126.15,264.53,132.66,251.55,136.87,238.08,139.18,224.45,139.98,233.2,136.1,246.23,131.97,259.21,127.7,272.14,123.25,285.03,118.72,297.91,114.16,310.81,109.63,323.73,105.18,336.69,100.84,349.71,96.69,362.8,92.78,375.99,89.2,371.81,92.51,359.23,97.86,346.66,103.23,334.15,108.73,321.73,114.42,309.44,120.4,297.41,126.88,285.99,134.37,280.86,145.21,293.89,148.67,307.54,148.69,321.06,146.78,334.42,143.9,347.65,140.46,360.78,136.67,373.83,132.61,386.82,128.36,399.75,123.94,412.64,119.4,425.49,114.76,438.32,110.04,451.13,105.29,464.01,100.71,453.56,106.39,441.19,112.21,428.8,117.97,416.99,124.78,418.82,134.44,432.19,137.11,445.83,138.05,459.49,138.26,473.15,138.01,486.81,137.42,500.44,136.53,514.06,135.35,527.64,133.86,541.18,131.98,554.61,129.45,567.8,125.91,580.83,121.77,593.69,117.14,606.39,112.11,618.94,106.7,631.34,100.94,643.57,94.84,655.61,88.39,667.44,81.55,679,74.25,690.16,66.38,700.67,57.65,709.57,47.33,708.94,35.11,696.27,30.27,682.69,28.94,669.03,29.21,655.42,30.44,641.88,32.31,628.43,34.69,615.04,37.46,601.73,40.56,588.5,43.96,575.33,47.63,562.24,51.54,549.21,55.68,536.26,60.05,523.4,64.65,510.62,69.49,497.93,74.58,485.36,79.93,472.91,85.57,460.62,91.55,448.54,97.93,436.72,104.79,425.3,112.3,414.53,120.7,405.11,130.57,399.44,142.82,403.96,155.2,416.18,160.85,429.79,161.75,443.41,160.65,456.89,158.42,470.23,155.46,483.44,151.95,496.53,148.03,509.51,143.77,522.39,139.2,535.17,134.35,547.85,129.24,560.41,123.87,572.86,118.23,585.17,112.29,597.29,105.97,609.13,99.15,620.43,91.48,628.38,81.03,619.94,70.52,607.32,65.61,593.7,65.56,580.37,68.48,567.62,73.36,555.56,79.78,544.36,87.6,534.42,96.96,527,108.35,526.9,121.57,537.25,130.07,550.3,134.04,563.85,135.76,577.51,135.78,591.11,134.51,604.58,132.24,617.89,129.15,631.03,125.39,644,121.07,656.78,116.24,669.38,110.94,681.77,105.17,693.89,98.86,705.41,91.54,695.82,93.15,683.38,98.8,671.11,104.82,658.94,111.04,646.85,117.42,634.83,123.92,622.86,130.5,610.91,137.14,598.98,143.81,587.07,150.51,575.18,157.24,563.3,164,552.16,170.96,564.57,165.25,576.85,159.25,589.12,153.24,601.41,147.26,613.73,141.34,626.1,135.53,638.56,129.91,651.22,124.76,664.28,120.75,677.48,117.22,690.82,114.27,704.31,112.06,717.91,110.78,731.57,110.57,745.21,111.37,758.79,112.88,772.34,114.65,785.91,116.29,799.52,117.56,813.16,118.38,826.82,118.72,840.49,118.63,854.14,118.15,867.79,117.32,881.41,116.19,895,114.8]"><svg className="signature__svg" role="img" aria-label="Carter Ogunsola signature" overflow="visible" viewBox="0 0 897 173" fill="none" xmlns="http://www.w3.org/2000/svg"><path className="signature__path" data-sig-path="" d="M2 88.9456C55.784 76.5215 191.196 51.7674 274.826 23.7476C334.221 3.84742 337.508 -5.77007 243.577 9.56486C149.646 24.8998 37.9703 88.5267 29.722 127.977C13.4431 205.837 316.853 80.9592 276.575 82.6084C244.834 83.9081 180.958 112.5 206.563 120.165C237.48 129.42 272.863 114.718 285.462 100.025C300.893 82.0273 301.127 140.001 222.664 140.001C220.987 140.001 225.74 138.422 243.579 132.817C282.011 120.744 333.646 99.8913 376.974 88.9455C406.796 81.4117 217.494 148 301.127 148.962C355.109 149.583 542.975 64.9965 428.679 118.029C366.194 147.021 515.241 139.258 556.329 129.041C628.401 111.119 731.609 50.6349 708.58 34.8267C662.174 2.97263 360.921 106.976 403.403 154.658C432.562 187.387 636.491 97.9544 628.26 80.5907C605.432 32.4348 486.945 110.13 538.165 130.476C618.254 162.288 790.777 42.4844 658.137 111.452C632.25 124.912 590.416 148.592 568.46 161.052C508.857 194.877 627.218 132.266 653.385 124.03C757.953 91.1157 752.806 130.719 895 114.799" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"></path></svg></span>
      </div>
      </div>
      </dialog>
      <dialog className="ov3__dialog ov3__rec" data-dialog="record" aria-labelledby="record-title" data-lenis-prevent="" data-astro-cid-ta2fbyqs="">
      <div className="ov3__dialog-scroll" data-lenis-prevent="" data-astro-cid-ta2fbyqs="">
      <div className="ov3__dialog-head" data-astro-cid-ta2fbyqs="">
      <span className="text-label ov3__dialog-tag" data-astro-cid-ta2fbyqs="">The record ::</span>
      <button type="button" aria-label="Close" className="closebox closebox--sm closebox--fill" data-dialog-close="" data-astro-cid-ta2fbyqs="" data-astro-cid-rqy3m4bm="">
      <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" data-icon="close" data-astro-cid-rqy3m4bm="">
      <use href="#ai:local:close">
      </use>
      </svg>
      </button>
      </div>
      <h2 className="ov3__dialog-title text-h2" id="record-title" data-astro-cid-ta2fbyqs="">Where I’ve worked.</h2>
      <div className="ov3__dialog-sec" data-astro-cid-ta2fbyqs="">
      <section className="rec" aria-label="Experience" data-section="Experience" data-astro-cid-kq42ek7p="">
      <div className="rec__sheet u-card" data-record="" style={{ '--rec-role': '138px' }} data-astro-cid-kq42ek7p="">
      <div className="rec__head" aria-hidden="true" data-astro-cid-kq42ek7p="">
      <span className="rec__field text-mono-sm" data-astro-cid-kq42ek7p="">Company</span>
      <span className="rec__field rec__field--role text-mono-sm" data-astro-cid-kq42ek7p="">Role</span>
      <span className="rec__field rec__field--year text-mono-sm" data-astro-cid-kq42ek7p="">Year</span>
      </div>
      <div className="rec__body" data-row-list="" data-record-body="" data-astro-cid-kq42ek7p="">
      <span className="rec__reader" data-record-reader="" aria-hidden="true" data-astro-cid-kq42ek7p="">
      </span>
      <div className="rec__row" data-astro-cid-kq42ek7p="">
      <span className="rec__co text-tag" data-astro-cid-kq42ek7p="">Odyn</span>
      <span className="rec__role text-mono-meta" data-astro-cid-kq42ek7p="">Founder</span>
      <span className="rec__year text-mono-meta" data-astro-cid-kq42ek7p="">Present</span>
      </div>
      <div className="rec__row" data-astro-cid-kq42ek7p="">
      <span className="rec__co text-tag" data-astro-cid-kq42ek7p="">Strive</span>
      <span className="rec__role text-mono-meta" data-astro-cid-kq42ek7p="">Creative Developer</span>
      <span className="rec__year text-mono-meta" data-astro-cid-kq42ek7p="">Present</span>
      </div>
      <div className="rec__row" data-astro-cid-kq42ek7p="">
      <span className="rec__co text-tag" data-astro-cid-kq42ek7p="">Balky Studio</span>
      <span className="rec__role text-mono-meta" data-astro-cid-kq42ek7p="">Founder</span>
      <span className="rec__year text-mono-meta" data-astro-cid-kq42ek7p="">Present</span>
      </div>
      <div className="rec__row" data-astro-cid-kq42ek7p="">
      <span className="rec__co text-tag" data-astro-cid-kq42ek7p="">Bondir</span>
      <span className="rec__role text-mono-meta" data-astro-cid-kq42ek7p="">Web Designer &amp; Dev</span>
      <span className="rec__year text-mono-meta" data-astro-cid-kq42ek7p="">2024</span>
      </div>
      <div className="rec__row" data-astro-cid-kq42ek7p="">
      <span className="rec__co text-tag" data-astro-cid-kq42ek7p="">Auvlie</span>
      <span className="rec__role text-mono-meta" data-astro-cid-kq42ek7p="">Co-Founder</span>
      <span className="rec__year text-mono-meta" data-astro-cid-kq42ek7p="">2023</span>
      </div>
      <div className="rec__row" data-astro-cid-kq42ek7p="">
      <span className="rec__co text-tag" data-astro-cid-kq42ek7p="">Utah Tech University</span>
      <span className="rec__role text-mono-meta" data-astro-cid-kq42ek7p="">Adjunct Professor</span>
      <span className="rec__year text-mono-meta" data-astro-cid-kq42ek7p="">2023</span>
      </div>
      <div className="rec__row" data-astro-cid-kq42ek7p="">
      <span className="rec__co text-tag" data-astro-cid-kq42ek7p="">Adapte</span>
      <span className="rec__role text-mono-meta" data-astro-cid-kq42ek7p="">Creative Director</span>
      <span className="rec__year text-mono-meta" data-astro-cid-kq42ek7p="">2022</span>
      </div>
      <div className="rec__row" data-astro-cid-kq42ek7p="">
      <span className="rec__co text-tag" data-astro-cid-kq42ek7p="">beatBread</span>
      <span className="rec__role text-mono-meta" data-astro-cid-kq42ek7p="">Product Designer</span>
      <span className="rec__year text-mono-meta" data-astro-cid-kq42ek7p="">2022</span>
      </div>
      </div>
      <div className="rec__foot text-mono-sm" data-astro-cid-kq42ek7p="">
      <a className="rec__link" href="https://www.linkedin.com/in/carterogunsola/" target="_blank" rel="noopener noreferrer" data-hover="" data-astro-cid-kq42ek7p="">LinkedIn<span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M14 5.75L20.25 12L14 18.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 12H3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M14 5.75L20.25 12L14 18.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 12H3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </a>
      </div>
      </div>
      </section>
      </div>
      </div>
      </dialog>
      <dialog className="ov3__dialog" data-dialog="onfile" aria-labelledby="onfile-title" data-lenis-prevent="" data-astro-cid-ta2fbyqs="">
      <div className="ov3__dialog-scroll" data-lenis-prevent="" data-astro-cid-ta2fbyqs="">
      <div className="ov3__dialog-head" data-astro-cid-ta2fbyqs="">
      <span className="text-label ov3__dialog-tag" data-astro-cid-ta2fbyqs="">On file ::</span>
      <button type="button" aria-label="Close" className="closebox closebox--sm closebox--fill" data-dialog-close="" data-astro-cid-ta2fbyqs="" data-astro-cid-rqy3m4bm="">
      <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" data-icon="close" data-astro-cid-rqy3m4bm="">
      <use href="#ai:local:close">
      </use>
      </svg>
      </button>
      </div>
      <h2 className="ov3__dialog-title text-h2" id="onfile-title" data-astro-cid-ta2fbyqs="">What the work picked up.</h2>
      <section className="ov3__dialog-sec" aria-label="Awards" data-astro-cid-ta2fbyqs="">
      <div className="ov3__dialog-sub" data-astro-cid-ta2fbyqs="">
      <span className="text-label" data-astro-cid-ta2fbyqs="">Awards ::</span>
      <span className="text-meta" data-astro-cid-ta2fbyqs="">9</span>
      </div>
      <div className="ov3__dialog-rows" data-row-list="" data-astro-cid-ta2fbyqs="">
      <a href="https://www.awwwards.com/carter-ogunsola/" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Awwwards</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Site of the Day</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">X2</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://www.awwwards.com/carter-ogunsola/" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Awwwards</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Developer Award</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">X2</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://www.awwwards.com/carter-ogunsola/" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Awwwards</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Honorable Mention</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">X8</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://www.awwwards.com/jury-member/carter-ogunsola" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Awwwards</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Jury</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">2026</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://www.cssdesignawards.com/sites/heva-health/45818/" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">CSS Design Awards</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Website of the Day</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Heva Health</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://www.cssdesignawards.com/sites/the-carter-ogunsola-portfolio/43026/" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">CSS Design Awards</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Special Kudos</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Portfolio</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://www.topcssgallery.com/gallery/1820-productions/" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Top CSS Gallery</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Site of the Day</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">1820 Prod.</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://webflow.com/webflowconf/2024/webflow-awards" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Webflow Awards</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Finalist</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">’24 · Creative Excellence</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <div data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Okay Dev</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Member</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">2025</span>
      </span>
      </div>
      </div>
      </section>
      <section className="ov3__dialog-sec" aria-label="Featured in" data-astro-cid-ta2fbyqs="">
      <div className="ov3__dialog-sub" data-astro-cid-ta2fbyqs="">
      <span className="text-label" data-astro-cid-ta2fbyqs="">Featured in ::</span>
      <span className="text-meta" data-astro-cid-ta2fbyqs="">9</span>
      </div>
      <div className="ov3__dialog-rows" data-row-list="" data-astro-cid-ta2fbyqs="">
      <a href="https://tympanus.net/codrops/2026/02/13/1820-productions-minimal-design-maximal-motion/" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Codrops</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Case Study</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">1820 Productions</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://webflow.com/community/livestreams/making-it-pop" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Webflow</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Livestream</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Interactions + GSAP</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://open.spotify.com/episode/6tIX8mFTMIGJeko6eRIFcq" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Webflail</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Podcast</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Ep. 33</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://www.youtube.com/watch?v=PMdsmpGpRp0" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Flow Party</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Livestream</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">No. 25</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://www.footer.design/sites/balky-studio" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Footer.design</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Feature</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Balky Studio</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://httpster.net/website/balky/" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">httpster</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Feature</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Balky Studio</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://www.nocodesupply.co/item/the-carter-ogunsola" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">No Code Supply</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Feature</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Portfolio</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://www.navbar.gallery/navbar/heva-health" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">Navbar Gallery</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Feature</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Heva Health</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      <a href="https://www.folioinspo.com/submissions/carter-ogunsola" data-hover="true" target="_blank" rel="noopener noreferrer" data-astro-cid-ta2fbyqs="true" data-astro-cid-karsvxoy="true" className="row row--link">
      <span className="row__label text-tag" data-astro-cid-karsvxoy="">FolioInspo</span>
      <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="">
      </span>
      <span className="row__tags" data-astro-cid-karsvxoy="">
      <span className="chip text-meta row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Feature</span>
      <span className="chip text-meta chip--pill row__tag" data-astro-cid-karsvxoy="true" data-astro-cid-ags4ogmk="">Portfolio</span>
      <span className="linkcircle row__link" aria-hidden="true" data-astro-cid-karsvxoy="true" data-astro-cid-l5seddro="">
      <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
      <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      </span>
      </span>
      </span>
      </span>
      </a>
      </div>
      </section>
      </div>
      </dialog>
    </>
  );
}
