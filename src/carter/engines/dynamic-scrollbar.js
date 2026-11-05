/**
 * Carter Dynamic Scrollbar engine — ported from
 * `app/lib/experiments/dynamic-scrollbar.js` at
 * sausageOps/carterogunsola-reconstruction@3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249
 * (byte-identical to the original live-site chunk `src/dynamic-scrollbar.Ia0FQs2Y.js`
 * apart from the import specifier).
 *
 * Preserved verbatim from Carter's source:
 * - the three-state morphing thumb (default 5×64 bar → `min` 50×188 clock card →
 *   `music` 264×397 mini player), GSAP-tweened width/height/radius plus the
 *   ink/blur/x crossfades of the two inner panels;
 * - the Lenis-style smooth scroll: wheel + touchmove drive a target scroll `B`,
 *   the gsap ticker eases `V` toward it (`damp` rate 9), the track is translated
 *   and the thumb positioned from `V / maxScroll`;
 * - the live analog clock (hour/minute hands rotated each second, digital readout);
 * - hover/rest/section-kind state machine (120 ms hover grace, `restDelay` 150 ms
 *   collapse, note appears on `music` sections, tap note → player);
 * - thumb drag scrubbing and the native-audio mini player (3 tracks, prev/next,
 *   play/pause crossfade, waveform tween, timeline seek);
 * - reduced-motion path (no smoothing, no intro fade, instant morphs);
 * - the `config` (Tune) descriptor and `set()` — accent swatch + morph timings.
 *
 * Adaptations to Jesper's runtime (same set as the approved heart port):
 * - inline `#exp-scrollbar-style` injection removed — `dynamic-scrollbar.css`
 *   is the canonical source, scoped under `:where(.carter)`;
 * - `import { f } from "../mesh.ts"` (gsap) → `import gsap from "gsap"`;
 * - caller-supplied viewport: the stage passes
 *   `[data-experiment-viewport]` from `getCarterRoot()`, exactly as Carter's
 *   `mount(k)` receives it;
 * - teardown registered with `onDestroy` so `destroyAll` cleans on route leave;
 * - returns `null` when there is no container (unavailable host), matching the
 *   other ports.
 *
 * Known limitation, not substituted: Carter's three `/lab/music/*.mp3` tracks
 * and `/lab/covers/*.jpg` are absent (HTTP 404 in Carter's own reconstruction
 * too), so the player's cover image and audio do not load here; every failure
 * path in the original (`play().catch(() => {})`, `preload = "none"`) is kept
 * as-is.
 *
 * No new dependencies, no shared runtime change.
 */

import gsap from 'gsap';
import { onDestroy } from '../runtime.js';

// ------------------------------------------------------------------ constants
// Exact values from Carter's source.
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

const BAR_W = 5;
const THUMB_H = 64;
const MIN_W = 50;
const MIN_H = 188;
const MUSIC_W = 264;
const MUSIC_H = 397;
const RADIUS = 30;
const INK_DURATION = 0.8;

const DEFAULTS = { morphIn: 0.65, morphOut: 0.6, restDelay: 150 };

// Carter's `export {d as config}` — consumed by the (still deferred) Tune panel.
const CONFIG = [
  { key: 'morphIn', label: 'Bloom', type: 'range', min: 0.2, max: 1.2, step: 0.05, default: DEFAULTS.morphIn },
  { key: 'morphOut', label: 'Collapse', type: 'range', min: 0.2, max: 1.2, step: 0.05, default: DEFAULTS.morphOut },
  { key: 'restDelay', label: 'Rest', type: 'range', min: 50, max: 500, step: 10, default: DEFAULTS.restDelay },
  {
    key: 'accent',
    label: 'Accent',
    type: 'swatch',
    default: 'coral',
    options: [
      { id: 'coral', value: '#ff4d00' },
      { id: 'blue', value: '#3f6a99' },
      { id: 'sage', value: '#55703c' },
      { id: 'mono', value: '#ffffff' },
    ],
  },
];

const REST_COLOR = '#d5d5d5';
const INK_COLOR = '#000000';

// The three tracks point at Carter's site-root assets; see the header note.
const TRACKS = [
  {
    src: '/lab/music/deep-abstract-ambient_snowcap-401656.mp3',
    title: 'D.A.A.S',
    artist: 'Umbrella',
    cover: '/lab/covers/umbrella.jpg',
  },
  {
    src: '/lab/music/embrace-364091.mp3',
    title: 'Embrace',
    artist: 'Evgeny Bardyuzha',
    cover: '/lab/covers/embrace.jpg',
  },
  {
    src: '/lab/music/running-night-393139.mp3',
    title: 'Running Night',
    artist: 'Alex Make Music',
    cover: '/lab/covers/running-night.jpg',
  },
];

const CAPTIONS = [
  { kind: 'min', text: 'Scroll the page :: the bar on the right wakes up' },
  { kind: 'min', text: 'Pause, or hover it, and it blooms into a clock' },
  { kind: 'min', text: 'Normal scrolling still works :: it just has a pulse' },
  { kind: 'music', text: 'A note appears. Tap it :: the player is live' },
  { kind: 'music', text: 'Now playing. Hover to expand, drag the timeline to seek' },
  { kind: 'min', text: 'Back to default :: clock only, no player' },
];

const CLOCK_SVG = `<svg viewBox="0 0 20 20" fill="none" class="sb__clock-face"><rect data-hour x="9.5" y="4" width="1" height="5.5" rx="0.5" fill="currentColor"/><rect data-min x="9.5" y="2" width="1" height="8" rx="0.5" fill="currentColor"/><circle cx="10" cy="10" r="1.25" fill="currentColor"/></svg>`;
const NOTE_SVG = `<svg viewBox="0 0 20 20" fill="none"><path d="M19.5 14C19.5 15.933 17.933 17.5 16 17.5C14.067 17.5 12.5 15.933 12.5 14C12.5 12.067 14.067 10.5 16 10.5C16.98 10.5 17.865 10.903 18.5 11.552V5.59L7.5 7.423V16C7.5 17.933 5.933 19.5 4 19.5C2.067 19.5 0.5 17.933 0.5 16C0.5 14.067 2.067 12.5 4 12.5C4.98 12.5 5.865 12.903 6.5 13.552V2.576L19.5 0.41V14Z" fill="currentColor"/></svg>`;
const WAVE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><line x1="2" y1="15" x2="2" y2="9"/><line x1="7" y1="19.5" x2="7" y2="4.5"/><line x1="12" y1="22" x2="12" y2="2"/><line x1="17" y1="19.5" x2="17" y2="4.5"/><line x1="22" y1="15" x2="22" y2="9"/></svg>`;
const PREV_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="10 5 1 12 10 19"/><polygon points="22 5 13 12 22 19"/></svg>`;
const NEXT_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="14 19 23 12 14 5"/><polygon points="2 19 11 12 2 5"/></svg>`;
const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5.2 12 5.2 3 13 7.5 20.8 12 13 16.5 5.2 21"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5.5" width="3" height="13" rx="0.4"/><rect x="14.5" y="5.5" width="3" height="13" rx="0.4"/></svg>`;

// ---------------------------------------------------------------------- mount
export function mountDynamicScrollbar(container) {
  if (!container) return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cfg = { ...DEFAULTS };
  const abort = new AbortController();
  const { signal } = abort;

  const root = document.createElement('div');
  root.className = 'sb';

  const scroll = document.createElement('div');
  scroll.className = 'sb__scroll';
  const track = document.createElement('div');
  track.className = 'sb__track';
  CAPTIONS.forEach((c) => {
    const section = document.createElement('section');
    section.className = 'sb__section';
    section.dataset.kind = c.kind;
    section.innerHTML = `<p class="sb__caption">${c.text}</p>`;
    track.appendChild(section);
  });
  scroll.appendChild(track);

  const bar = document.createElement('div');
  bar.className = 'sb__bar';
  const thumb = document.createElement('div');
  thumb.className = 'sb__thumb';
  thumb.innerHTML = `
      <div class="sb__inner">
        <div class="sb__min">
          <div class="sb__min-top">
            <div class="sb__clock">${CLOCK_SVG}</div>
            <div class="sb__note" role="button" aria-label="Open player">${NOTE_SVG}</div>
          </div>
          <div class="sb__time"><span data-time>00:00</span><span class="ampm" data-ampm>AM</span></div>
        </div>
        <div class="sb__music">
          <div class="sb__cover"><img alt="" decoding="async"/></div>
          <div class="sb__player">
            <div class="sb__head">
              <div class="sb__meta"><span class="sb__title" data-title></span><span class="sb__artist" data-artist></span></div>
              <div class="sb__wave">${WAVE_SVG}</div>
            </div>
            <div class="sb__timeline" data-timeline><div class="sb__progress" data-progress></div></div>
            <div class="sb__controls">
              <div class="sb__ctrl sb__ctrl--sm" data-prev role="button" aria-label="Previous">${PREV_SVG}</div>
              <div class="sb__toggle">
                <div class="sb__ctrl sb__play" data-play role="button" aria-label="Play">${PLAY_SVG}</div>
                <div class="sb__ctrl sb__pause" data-pause role="button" aria-label="Pause">${PAUSE_SVG}</div>
              </div>
              <div class="sb__ctrl sb__ctrl--sm" data-next role="button" aria-label="Next">${NEXT_SVG}</div>
            </div>
            <div class="sb__credits">
              <p class="sb__credit">Icons :: <a href="https://angularicons.com/" target="_blank" rel="noreferrer">Angular Icons</a> / <a href="https://www.osmo.supply/" target="_blank" rel="noreferrer">Osmo</a></p>
              <p class="sb__credit">Original /Motion :: Xavier Jac (<a href="https://x.com/KMkota0" target="_blank" rel="noreferrer">@KMkota0</a>)</p>
            </div>
          </div>
        </div>
      </div>`;
  bar.appendChild(thumb);
  root.append(scroll, bar);
  container.appendChild(root);

  const q = (sel) => thumb.querySelector(sel);
  const minPanel = q('.sb__min');
  const musicPanel = q('.sb__music');
  const hourHand = q('[data-hour]');
  const minHand = q('[data-min]');
  const timeEl = q('[data-time]');
  const ampmEl = q('[data-ampm]');

  // ------------------------------------------------------------------- clock
  const updateClock = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    gsap.to(hourHand, {
      rotation: (h % 12) * 30 + m * 0.5,
      transformOrigin: 'center bottom',
      duration: 0.5,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.to(minHand, {
      rotation: m * 6,
      transformOrigin: 'center bottom',
      duration: 0.5,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    timeEl.textContent = `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    ampmEl.textContent = h >= 12 ? 'PM' : 'AM';
  };
  updateClock();
  const clockInterval = window.setInterval(updateClock, 1000);

  // ------------------------------------------------------------------ player
  const audio = new Audio();
  audio.preload = 'none';
  let trackIndex = 0;
  const coverImg = q('.sb__cover img');
  const titleEl = q('[data-title]');
  const artistEl = q('[data-artist]');
  const progressEl = q('[data-progress]');
  const timelineEl = q('[data-timeline]');
  const playBtn = q('[data-play]');
  const pauseBtn = q('[data-pause]');
  const waveLines = [...thumb.querySelectorAll('.sb__wave line')];
  let waveTween = null;

  const waveOn = () => {
    waveTween?.kill();
    waveTween = gsap.timeline({ repeat: -1 });
    waveLines.forEach((line, i) => {
      const y1 = +line.getAttribute('y1');
      const y2 = +line.getAttribute('y2');
      const amp = Math.abs(y2 - y1) * 0.4;
      waveTween.to(
        line,
        { attr: { y1: y1 - amp, y2: y2 + amp }, duration: 0.4 + i * 0.05, ease: 'sine.inOut', yoyo: true, repeat: -1 },
        i * 0.08
      );
    });
  };
  const waveOff = () => {
    waveTween?.kill();
    waveTween = null;
    waveLines.forEach((line) => {
      gsap.to(line, {
        attr: { y1: line.dataset.y1, y2: line.dataset.y2 },
        duration: 0.3,
        ease: 'power2.out',
      });
    });
  };
  waveLines.forEach((line) => {
    line.dataset.y1 = line.getAttribute('y1');
    line.dataset.y2 = line.getAttribute('y2');
  });

  const loadTrack = (i, autoplay = false) => {
    trackIndex = (i + TRACKS.length) % TRACKS.length;
    const t = TRACKS[trackIndex];
    audio.src = t.src;
    coverImg.src = t.cover;
    titleEl.textContent = t.title;
    artistEl.textContent = t.artist;
    gsap.set(progressEl, { scaleX: 0 });
    if (autoplay) audio.play().catch(() => {});
  };

  audio.addEventListener(
    'play',
    () => {
      gsap.to(playBtn, { opacity: 0, scale: 0.5, pointerEvents: 'none', duration: 0.3, ease: 'power2.out' });
      gsap.to(pauseBtn, { opacity: 1, scale: 1, pointerEvents: 'auto', duration: 0.3, ease: 'power2.out' });
      waveOn();
    },
    { signal }
  );
  audio.addEventListener(
    'pause',
    () => {
      gsap.to(playBtn, { opacity: 1, scale: 1, pointerEvents: 'auto', duration: 0.3, ease: 'power2.out' });
      gsap.to(pauseBtn, { opacity: 0, scale: 0.5, pointerEvents: 'none', duration: 0.3, ease: 'power2.out' });
      waveOff();
    },
    { signal }
  );
  audio.addEventListener(
    'timeupdate',
    () => {
      if (audio.duration) gsap.set(progressEl, { scaleX: audio.currentTime / audio.duration });
    },
    { signal }
  );
  audio.addEventListener('ended', () => loadTrack(trackIndex + 1, true), { signal });

  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    audio.play().catch(() => {});
  }, { signal });
  pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    audio.pause();
  }, { signal });
  q('[data-prev]').addEventListener('click', (e) => {
    e.stopPropagation();
    loadTrack(trackIndex - 1, !audio.paused);
  }, { signal });
  q('[data-next]').addEventListener('click', (e) => {
    e.stopPropagation();
    loadTrack(trackIndex + 1, !audio.paused);
  }, { signal });
  timelineEl.addEventListener(
    'click',
    (e) => {
      e.stopPropagation();
      const rect = timelineEl.getBoundingClientRect();
      if (audio.duration) audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    },
    { signal }
  );
  loadTrack(0);

  // ------------------------------------------------------------- state morph
  let state = 'default';
  const SIZES = { default: [BAR_W, THUMB_H, RADIUS], min: [MIN_W, MIN_H, RADIUS], music: [MUSIC_W, MUSIC_H, RADIUS] };
  const current = { w: BAR_W, h: THUMB_H, r: RADIUS };
  const applySize = () => {
    thumb.style.width = `${current.w}px`;
    thumb.style.height = `${current.h}px`;
    thumb.style.borderRadius = `${current.r}px`;
  };

  const setState = (next) => {
    if (next === state) return;
    state = next;
    const isMin = next === 'min';
    const isMusic = next === 'music';
    const [w, h, r] = SIZES[next];
    const duration = reduced ? 0 : next === 'default' ? cfg.morphOut : cfg.morphIn;
    gsap.to(current, {
      w, h, r,
      duration,
      ease: 'power3.inOut',
      overwrite: true,
      onUpdate: applySize,
    });
    gsap.to(thumb, {
      backgroundColor: next === 'default' ? REST_COLOR : INK_COLOR,
      duration: reduced ? 0 : INK_DURATION,
      ease: next === 'default' ? 'power3.inOut' : 'power3.out',
      overwrite: 'auto',
    });
    gsap.to(minPanel, {
      opacity: +!!isMin,
      x: isMin ? '0%' : '20%',
      filter: `blur(${isMin ? 0 : 30}px)`,
      duration: reduced ? 0 : 0.6,
      ease: 'power3.inOut',
      pointerEvents: isMin ? 'auto' : 'none',
      overwrite: 'auto',
    });
    gsap.to(musicPanel, {
      opacity: +!!isMusic,
      x: isMusic ? '0%' : '100%',
      filter: `blur(${isMusic ? 0 : 30}px)`,
      duration: reduced ? 0 : isMusic ? 0.65 : 0.6,
      ease: 'power3.inOut',
      pointerEvents: isMusic ? 'auto' : 'none',
      overwrite: 'auto',
    });
  };

  // ------------------------------------------------------------------ scroll
  let target = 0;
  let pos = 0;
  let vel = 0;
  let maxScroll = 0;
  let progress = 0;
  let hovering = false;
  let dragging = false;
  let noteKind = 'min';
  let restTimer = null;

  const measure = () => {
    root.style.setProperty('--sb-vh', `${scroll.clientHeight}px`);
    maxScroll = Math.max(0, track.scrollHeight - scroll.clientHeight);
    target = clamp(target, 0, maxScroll);
  };
  const ro = new ResizeObserver(measure);
  ro.observe(scroll);
  measure();

  root.addEventListener('wheel', (e) => {
    e.preventDefault();
    target = clamp(target + e.deltaY, 0, maxScroll);
  }, { passive: false, signal });

  let lastTouchY = 0;
  root.addEventListener('touchstart', (e) => {
    lastTouchY = e.touches[0].clientY;
  }, { passive: true, signal });
  root.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const y = e.touches[0].clientY;
    target = clamp(target + (lastTouchY - y) * 1.5, 0, maxScroll);
    lastTouchY = y;
  }, { passive: false, signal });

  let dragStartY = 0;
  let dragStartTarget = 0;
  thumb.addEventListener('pointerdown', (e) => {
    if (state !== 'music' && !e.target.closest('.sb__note')) {
      dragging = true;
      dragStartY = e.clientY;
      dragStartTarget = target;
      thumb.setPointerCapture?.(e.pointerId);
    }
  }, { signal });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const range = Math.max(1, bar.clientHeight - SIZES[state][1]);
    target = clamp(dragStartTarget + ((e.clientY - dragStartY) / range) * maxScroll, 0, maxScroll);
  }, { signal });
  window.addEventListener('pointerup', () => (dragging = false), { signal });

  const sectionKind = () => {
    const mid = pos + scroll.clientHeight / 2;
    return CAPTIONS[clamp(Math.floor(mid / scroll.clientHeight), 0, CAPTIONS.length - 1)].kind;
  };

  const noteEl = q('.sb__note');
  let noteShown = false;
  gsap.set(noteEl, { y: '100%', opacity: 0, scale: 0.5, filter: 'blur(20px)', pointerEvents: 'none' });
  const showNote = (show) => {
    if (show === noteShown) return;
    noteShown = show;
    gsap.to(noteEl, {
      y: show ? '0%' : '100%',
      opacity: +!!show,
      scale: show ? 1 : 0.5,
      filter: show ? 'blur(0px)' : 'blur(20px)',
      duration: show ? 0.6 : 0.45,
      ease: 'power3.inOut',
      pointerEvents: show ? 'auto' : 'none',
    });
  };

  let hoverTimer = null;
  thumb.addEventListener('pointerenter', () => {
    hoverTimer && (clearTimeout(hoverTimer), (hoverTimer = null));
    hovering = true;
    if (state === 'default') setState('min');
  }, { signal });
  thumb.addEventListener('pointerleave', () => {
    hovering = false;
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      hoverTimer = null;
      if (!hovering && state === 'min' && !dragging) setState('default');
    }, 120);
  }, { signal });
  noteEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (noteKind === 'music') setState('music');
  }, { signal });
  musicPanel.addEventListener('pointerleave', (e) => {
    if (state === 'music' && !thumb.contains(e.relatedTarget)) setState('min');
  }, { signal });

  // ------------------------------------------------------------------- tick
  // gsap ticker signature: (time seconds, delta ms).
  const tick = (time, delta) => {
    const dt = Math.min(delta, 64) / 1000 || 0.016;
    const prev = pos;
    pos = reduced ? target : damp(pos, target, 9, dt);
    if (Math.abs(target - pos) < 0.05) pos = target;
    vel = pos - prev;
    track.style.transform = `translate3d(0, ${-pos}px, 0)`;
    progress = maxScroll > 0 ? pos / maxScroll : 0;
    noteKind = sectionKind();
    showNote(noteKind === 'music');

    const moving = Math.abs(vel) > 0.15 || Math.abs(target - pos) > 0.6;
    if (state === 'music' && !dragging && (moving || noteKind !== 'music')) {
      setState('min');
    } else if (!hovering && !dragging) {
      if (moving || noteKind === 'music') {
        restTimer && (clearTimeout(restTimer), (restTimer = null));
        if (state === 'default') setState('min');
      } else if (state === 'min' && !restTimer) {
        restTimer = setTimeout(() => {
          restTimer = null;
          if (!hovering && !dragging && state === 'min') setState('default');
        }, cfg.restDelay);
      }
    }

    const thumbTop = clamp(
      progress * (bar.clientHeight - THUMB_H) + THUMB_H / 2 - current.h / 2,
      0,
      Math.max(0, bar.clientHeight - current.h)
    );
    thumb.style.transform = `translateY(${thumbTop}px)`;
  };
  gsap.ticker.add(tick);

  if (!reduced) {
    gsap.from(thumb, { opacity: 0, duration: 0.6, ease: 'power2.out', delay: 0.1 });
  }

  const destroy = () => {
    abort.abort();
    gsap.ticker.remove(tick);
    ro.disconnect();
    clearInterval(clockInterval);
    if (restTimer) clearTimeout(restTimer);
    if (hoverTimer) clearTimeout(hoverTimer);
    waveTween?.kill();
    audio.pause();
    audio.src = '';
    gsap.killTweensOf([thumb, current, minPanel, musicPanel, noteEl, playBtn, pauseBtn, progressEl, ...waveLines]);
    root.remove();
  };

  // Register with Jesper's page lifecycle so route-away cleans up even if
  // the caller forgets. Also return for manual use.
  onDestroy(destroy);

  return {
    destroy,
    set: (key, value) => {
      if (key === 'accent') root.style.setProperty('--sb-accent', String(value));
      else if (key in cfg) cfg[key] = Number(value);
    },
  };
}

export { CONFIG as config };
