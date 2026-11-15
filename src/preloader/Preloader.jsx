import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import baseUrl from '../base.js';
import './Preloader.css';

/* ==========================================================================
   Reference preloader — direct port of
   httpsgif.garajedeideas.com / src/js/modules/preloader.js

   The sequence, timings and easings below are copied verbatim from the
   reference source (they are also identical to the original site's captured
   script, _investigation/script_57.js). Do not "tidy" the constants.
   ========================================================================== */

const WORDS = ['de Ideas', 'Central', 'talks', 'trends', 'connect', 'Inspiration Fest©'];
const TARGET = 'Inspiration Fest©';
const REPEATS = 5;
const EASE = 'power3.out';

const BAR_DURATION = 3.75;
const BAR_EASE = 'none';
const CLOSE_DELAY = 0.25;
const SLOT_LEAD = 0.95;
const NEIGHBOR_FADE = 0.65;
const NEIGHBOR_LEAD = 1.35;

// Shadow concealment. The reel is read as words travelling through a dark
// space that only briefly opens at the centre: an entry is fully lit while it
// is on the centre line and has sunk back into the dark one row away. The
// gradient mask alone cannot do this — it fades with distance from the centre
// of the *band*, so the two neighbours straddling the centre line both sit in
// its transparent middle and stay bright. They are dimmed per entry instead,
// by their own distance from the centre line (px, half the recess is above).
const REEL_HOLD = 8;
const REEL_HIDE = 38;
const REEL_MIN_OPACITY = 0.06;

// The reference also revealed its draggable desktop icons on close. This site
// has no equivalent icon grid and nothing beyond the preloader may animate, so
// the overlay simply hands over to ReframeHK's own entrance. Kept for fidelity.
const ICON_SELECTOR = '[data-drag="item"]';
const ICON_DUR = 0.45;
const ICON_STAGGER = 0.015;
const ICON_START_SCALE = 0.85;
const ICON_DELAY = 0.3;
const ICON_OPACITY_EASE = 'power1.out';
const ICON_SCALE_EASE = 'back.out(2)';

// Hard failsafe: never leave a visitor stuck on the overlay.
const HARD_FAILSAFE_MS = 7000;

// The reference's looping "G" clip, recovered byte-for-byte from the brand's
// CDN (WebM/VP8 2,089,103 B, MP4/H.264 1,202,081 B), together with its genuine
// AVIF first frame (1000x525) converted to PNG. WebM is preferred; MP4 is the
// fallback — the same source order the reference markup uses.
const G_VIDEO_WEBM = 'assets/preloader/g.webm';
const G_VIDEO_MP4 = 'assets/preloader/g.mp4';
const G_POSTER = 'assets/preloader/g-frame.png';

/**
 * Plays once per page load, covering the site until it finishes.
 *
 * @param {boolean} ready       the site has mounted the page it will reveal
 * @param {Function} onComplete the overlay has fully left the screen
 */
export default function Preloader({ ready, onComplete }) {
  const preRef = useRef(null);
  const slotRef = useRef(null);
  const listRef = useRef(null);
  const barRef = useRef(null);

  // Latest values without re-running the once-per-mount timeline.
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const readyRef = useRef(false);
  readyRef.current = ready;
  const doneRef = useRef(false);

  // Last-resort net: if anything at all throws in the timeline below (GSAP,
  // a missing node, a browser quirk), the overlay is still torn down and the
  // page handed over rather than leaving a black screen up.
  useEffect(() => {
    // Only relevant while the overlay is actually still covering the page. After
    // it has lifted, an unrelated runtime error must not fire onComplete a second
    // time (that would re-trigger the homepage entrance, which is once-only).
    const bail = () => {
      if (doneRef.current) return;
      const pre = preRef.current;
      const covering = !pre || getComputedStyle(pre).display !== 'none';
      if (!covering) return;
      doneRef.current = true;
      if (pre) { pre.style.display = 'none'; pre.style.opacity = '0'; }
      completeRef.current?.();
    };
    window.addEventListener('error', bail);
    return () => window.removeEventListener('error', bail);
  }, []);

  useEffect(() => {
    const pre = preRef.current;
    const slot = slotRef.current;
    const list = listRef.current;
    const bar = barRef.current;
    if (!pre || !slot || !list) {
      // Nothing to animate: hand straight over rather than blocking the site.
      if (!doneRef.current) {
        doneRef.current = true;
        if (pre) pre.style.display = 'none';
        completeRef.current?.();
      }
      return undefined;
    }

    let cleanup = null; // assigned inside the context; runs on unmount
    let cleanupPaint = null; // stops the reel's per-frame opacity writer
    // If building the timeline throws, the overlay must still come down.
    const handOver = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      pre.style.display = 'none';
      completeRef.current?.();
    };

    let ctx;
    try {
      ctx = gsap.context(() => {
      const icons = ICON_SELECTOR ? gsap.utils.toArray(ICON_SELECTOR) : [];
      if (icons.length) gsap.set(icons, { autoAlpha: 0, scale: ICON_START_SCALE });

      let failsafe = null;
      let gateTimer = null;

      // The page the overlay is covering is mounted and painted: ReframeHK has
      // set data-home-ready on its host once the field is built (non-home
      // routes have no host, so the mounted page is the signal).
      function siteReady() {
        if (!readyRef.current) return false;
        const host = document.querySelector('[data-home-ready]');
        return !host || host.dataset.homeReady === 'true';
      }

      function revealIcons() {
        if (!icons.length) return;
        gsap.to(icons, {
          autoAlpha: 1, duration: ICON_DUR, ease: ICON_OPACITY_EASE,
          stagger: ICON_STAGGER, delay: ICON_DELAY,
        });
        gsap.to(icons, {
          scale: 1, duration: ICON_DUR, ease: ICON_SCALE_EASE,
          stagger: ICON_STAGGER, delay: ICON_DELAY,
        });
      }

      function closePreloader() {
        if (doneRef.current) return;
        doneRef.current = true;
        window.clearTimeout(failsafe);
        window.clearTimeout(gateTimer);
        gsap.to(pre, {
          autoAlpha: 0, duration: 0.5, ease: 'power2.inOut',
          onComplete: () => {
            pre.style.display = 'none';
            revealIcons();
            completeRef.current?.();
          },
        });
      }

      // The bar finishing is what ends the reference's timeline. Here it only
      // *requests* the close: if the page underneath is not ready yet the
      // overlay holds (bar at 100%) until it is, so a slow load can never
      // reveal a half-built homepage. Normally ready is already true, and the
      // close happens on the reference's own schedule.
      function requestClose() {
        if (doneRef.current) return;
        if (siteReady()) closePreloader();
        else waitForSite();
      }

      function waitForSite() {
        if (gateTimer) return;
        const tick = () => {
          if (doneRef.current) return;
          if (siteReady()) { closePreloader(); return; }
          gateTimer = window.setTimeout(tick, 80);
        };
        gateTimer = window.setTimeout(tick, 80);
      }

      function run() {
        // The reference builds a strip of 5 × 6 words plus two pad entries and
        // spins the reel so the last copy of the target word lands centred.
        const strip = [];
        for (let r = 0; r < REPEATS; r++) strip.push(...WORDS);
        strip.push(WORDS[0], WORDS[1]);

        const targetIndex = (REPEATS - 1) * WORDS.length + WORDS.indexOf(TARGET);

        list.innerHTML = '';
        const items = strip.map((w) => {
          const el = document.createElement('div');
          el.textContent = w;
          list.appendChild(el);
          return el;
        });

        const targetEl = items[targetIndex];
        const endY = -(targetEl.offsetTop - (slot.clientHeight - targetEl.offsetHeight) / 2);
        const slotDur = Math.max(0.1, BAR_DURATION - SLOT_LEAD);

        gsap.set(list, { y: 0 });
        if (bar) gsap.set(bar, { width: '0%' });

        // Centre line of the recess, in px of the untransformed list.
        const centreY = (slot.clientHeight - items[0].offsetHeight) / 2;

        // How lit an entry is purely by where it currently sits: full on the
        // centre line, REEL_MIN_OPACITY by the next row down, smooth in between.
        const concealAt = (top, y) => {
          const away = Math.abs(top + y - centreY);
          if (away <= REEL_HOLD) return 1;
          if (away >= REEL_HIDE) return REEL_MIN_OPACITY;
          const t = (away - REEL_HOLD) / (REEL_HIDE - REEL_HOLD);
          return 1 - (1 - REEL_MIN_OPACITY) * (t * t * (3 - 2 * t));
        };

        // The reference's late blanket fade, kept on its own clock (same delay,
        // duration and ease) but held as a multiplier so it composes with the
        // positional concealment instead of overwriting it.
        const settle = { v: 1 };

        // One writer for every entry's opacity, so the travelling concealment
        // and the closing fade can never clobber each other.
        const paint = () => {
          const y = gsap.getProperty(list, 'y');
          for (let i = 0; i < items.length; i++) {
            const lit = concealAt(items[i].offsetTop, y);
            items[i].style.opacity =
              i === targetIndex ? lit : lit * settle.v;
          }
        };

        const stopPaint = () => {
          paint();
          gsap.ticker.remove(paint);
        };

        // The closing fade ends well before the spin does, so once the reel has
        // settled every opacity is final and the writer can stop for good.
        gsap.to(list, {
          y: endY, duration: slotDur, ease: EASE, onComplete: stopPaint,
        });

        gsap.ticker.add(paint);
        paint();
        cleanupPaint = () => gsap.ticker.remove(paint);

        gsap.delayedCall(Math.max(0, slotDur - NEIGHBOR_LEAD), () => {
          gsap.to(settle, { v: 0, duration: NEIGHBOR_FADE, ease: 'power2.out' });
        });

        if (bar) {
          gsap.to(bar, {
            width: '100%', duration: BAR_DURATION, ease: BAR_EASE,
            onComplete: () => gsap.delayedCall(CLOSE_DELAY, requestClose),
          });
        } else {
          gsap.delayedCall(BAR_DURATION + CLOSE_DELAY, requestClose);
        }

        // Failsafe against a stalled/backgrounded tween — and against the page
        // never reporting readiness, so a visitor is never trapped.
        failsafe = window.setTimeout(closePreloader, HARD_FAILSAFE_MS);
      }

      // Take over from the pre-paint safety CSS now the overlay is mounted.
      const root = document.documentElement;
      delete root.dataset.rjPreload;
      root.classList.remove('rj-preload-active');

      run();

      cleanup = () => {
        window.clearTimeout(failsafe);
        window.clearTimeout(gateTimer);
        if (cleanupPaint) { cleanupPaint(); cleanupPaint = null; }
        root.classList.remove('rj-preload-active');
        delete root.dataset.rjPreload;
        // The page is going away with the overlay still up (or mid-fade):
        // let whoever is waiting know, so nothing is left un-revealed.
        if (!doneRef.current) {
          doneRef.current = true;
          completeRef.current?.();
        }
      };
      }, pre);
    } catch (error) {
      // Never surface as a black screen because the animation failed.
      console.error('[preloader] timeline failed, revealing the page', error);
      handOver();
      return undefined;
    }

    return () => { cleanup?.(); ctx?.revert(); };
  }, []);

  // Decorative cover over an already-mounted page: hidden from assistive tech so
  // the reel is not announced, and the real page stays reachable underneath.
  return (
    <div className="rj-loader" ref={preRef} data-preloader="" aria-hidden="true">
      {/* No readiness marker of our own: [data-home-ready] belongs solely to the
          homepage engine's container. Rendering one here would match first in
          document order (this overlay is the first child of .app) and pin the
          gate to a value nothing updates, holding every load to the failsafe. */}
      <div className="rj-inner-loader">
        <div className="rj-vertical-end-to-end">
          <div className="rj-empty-div" />
          <div className="rj-vertical-0">
            <div className="rj-vid-wrapper">
              <div className="rj-vid-loader">
                <div className="rj-bg-video" data-bg-video="">
                  <video
                    className="rj-bg-video__el"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    poster={`${baseUrl}${G_POSTER}`}
                  >
                    <source src={`${baseUrl}${G_VIDEO_WEBM}`} type="video/webm" />
                    <source src={`${baseUrl}${G_VIDEO_MP4}`} type="video/mp4" />
                  </video>
                </div>
              </div>
            </div>
            <div className="rj-loading-bar">
              <div className="rj-inner-loading" ref={barRef} data-bar="" />
            </div>
          </div>
          <div className="rj-bottom-marquee">
            <div className="rj-horizontal-xs rj-h-left-center">
              <div>GARAJE</div>
              <div className="rj-marquee-content" ref={slotRef} data-slot="">
                <div className="rj-slot-list" ref={listRef} data-slot-list="" />
                <div className="rj-mask-marquee" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
