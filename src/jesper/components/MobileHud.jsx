import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { site } from '../data/projects.js';
import { gsap } from '../vendor/gsap-3.15.0.min.js';
import { mobileViewsBottom, outsideProfileDisc } from './mobileHudLayout.js';
import './MobileHud.css';

const intro = 'Jesper Landberg, Swedish design engineer, named Awwwards Independent of the Year in 2022 and 2024, building visually rich, motion-driven websites. Usually lead or sole developer, responsible for front-end architecture, animation, interaction and CMS, alongside international agencies and creative teams.';

// Measure the actual browser line breaks so each line can rise into its own
// window like the reference's rasterized WebGL text. Keep one accessible copy.
function ProfileIntro({ onLines }) {
  const measure = useRef(null);
  const [lines, setLines] = useState([intro]);
  useLayoutEffect(() => {
    const el = measure.current;
    if (!el) return undefined;
    let frame;
    let alive = true;
    const update = () => {
      if (!alive || !el.firstChild || !el.offsetWidth) return;
      const text = el.firstChild;
      const range = document.createRange();
      const words = [...intro.matchAll(/\S+/g)];
      const rows = [];
      let top = null;
      for (const word of words) {
        range.setStart(text, word.index);
        range.setEnd(text, word.index + word[0].length);
        const y = range.getBoundingClientRect().top;
        if (top === null || Math.abs(y - top) > 1) {
          rows.push(word[0]);
          top = y;
        } else rows[rows.length - 1] += ` ${word[0]}`;
      }
      if (rows.length) {
        setLines((previous) => previous.join('\n') === rows.join('\n') ? previous : rows);
        onLines(rows.length);
      }
    };
    const schedule = () => { if (alive) { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); } };
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    window.addEventListener('resize', schedule);
    document.fonts?.ready.then(schedule);
    update();
    return () => { alive = false; cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', schedule); };
  }, [onLines]);
  return (
    <p className="jesper-profile-intro">
      <span className="sr-only">{intro}</span>
      <span ref={measure} className="jesper-profile-measure" aria-hidden="true">{intro}</span>
      <span aria-hidden="true">{lines.map((line, index) => (
        <span className="jesper-profile-line" key={`${index}-${line}`}><span style={{ '--line-delay': `${0.2 + index * 0.075}s` }}>{line}</span></span>
      ))}</span>
    </p>
  );
}

export default function MobileHud({ experience, ready, mode = 'home', onNavigateView, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [small, setSmall] = useState(() => window.matchMedia('(max-width: 649px)').matches);
  const [lineCount, setLineCount] = useState(6);
  const [bottom, setBottom] = useState(null);
  const control = useRef(null);

  useEffect(() => {
    onOpenChange?.(open && small);
    return () => onOpenChange?.(false);
  }, [open, small, onOpenChange]);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 649px)');
    const changed = () => { setSmall(query.matches); if (!query.matches) setOpen(false); };
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    if (!open || !small || !experience) return undefined;
    experience.setOverlay('profile');
    return () => {
      if (experience.destroyed) return;
      experience.setOverlay(null);
      // A phone-only hole must not linger on the desktop side of a resize.
      if (!window.matchMedia('(max-width: 649px)').matches) {
        gsap.killTweensOf(experience.hole);
        experience.hole.p = 0;
        experience.hole.s = -0.1;
      }
    };
  }, [experience, open, small]);
  useEffect(() => {
    if (!open) return undefined;
    const keydown = (event) => { if (event.key === 'Escape') setOpen(false); };
    const a24Pointer = (event) => { if (event.target.closest?.('.a24-nav')) setOpen(false); };
    window.addEventListener('keydown', keydown);
    window.addEventListener('pointerdown', a24Pointer, true);
    return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('pointerdown', a24Pointer, true); };
  }, [open]);

  // The reference's lower-left control and the retained A24 phone dock occupy
  // the same pixels. Lift only the reference control when their hit areas meet.
  useEffect(() => {
    if (!small || !ready) return undefined;
    const dock = document.querySelector('.a24-nav__list');
    if (!dock || !control.current) return undefined;
    let frame;
    const update = () => {
      const r = dock.getBoundingClientRect();
      const c = control.current.getBoundingClientRect();
      const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
      setBottom(mobileViewsBottom(window.innerHeight, root, c, r));
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(dock);
    observer.observe(control.current);
    window.addEventListener('resize', schedule);
    schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', schedule); };
  }, [small, ready]);

  const stopScroll = (event) => event.stopPropagation();
  const outside = (event) => {
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
    if (outsideProfileDisc(event.clientX, event.clientY, window.innerWidth, window.innerHeight, root)) setOpen(false);
  };
  const goTo = (path) => (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setOpen(false);
    if ((path === '/full') !== (mode === 'full')) onNavigateView?.(path);
  };
  const home = goTo('/');

  return (
    <div className="jesper-mobile-interface" data-open={open} data-ready={ready} inert={!small || !ready || undefined} aria-hidden={!small || !ready || undefined}>
      {open && <div className="jesper-profile-outside" onClick={outside} onWheel={stopScroll} onTouchStart={stopScroll} onTouchMove={stopScroll} onTouchEnd={stopScroll} />}
      <div id="jesper-profile" className="jesper-profile-disc" role="region" aria-label="Profile" data-gl-shield inert={!open || undefined} aria-hidden={!open}>
        <div className="jesper-profile-fallback" />
        <div className="jesper-profile-body" onWheel={stopScroll} onTouchStart={stopScroll} onTouchMove={stopScroll} onTouchEnd={stopScroll}>
          <ProfileIntro onLines={setLineCount} />
          <p className="jesper-profile-credits jesper-profile-line"><span style={{ '--line-delay': `${0.2 + lineCount * 0.075}s` }}>{site.awards}</span></p>
          <ul className="jesper-profile-links" style={{ '--line-delay': `${0.2 + (lineCount + 1) * 0.075}s` }}>
            {site.profiles.map(({ label, url }) => <li className="jesper-profile-line" key={label}><a href={url} target="_blank" rel="noopener noreferrer">{label}</a></li>)}
            <li className="jesper-profile-line"><a href={`mailto:${site.email}`}>Email</a></li>
          </ul>
        </div>
      </div>
      <div className="jesper-mobile-hud hud" onWheel={stopScroll} onTouchStart={stopScroll} onTouchMove={stopScroll} onTouchEnd={stopScroll}>
        <div className="jesper-mobile-top">
          <a href="/" onClick={home}>Jesper Landberg</a>
          <button type="button" aria-expanded={open} aria-controls="jesper-profile" onClick={() => setOpen((value) => !value)}>{open ? 'Close' : 'Profile'}</button>
        </div>
        <nav ref={control} className="jesper-mobile-views" aria-label="Project views" style={bottom === null ? undefined : { bottom: `${bottom}px` }}>
          <a href="/" aria-current={mode === 'home' ? 'page' : undefined} onClick={home}>Featured</a><span aria-hidden="true">/</span>
          <a href="/full" aria-current={mode === 'full' ? 'page' : undefined} onClick={goTo('/full')}>Full</a>
        </nav>
      </div>
    </div>
  );
}
