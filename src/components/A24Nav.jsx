import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import A24Logo from './A24Logo.jsx';
import useA24NavMotion from './useA24NavMotion.js';
import './A24Nav.css';

// The supplied television capture contains this index, not the films index.
const televisionIndex = [
  ['Hazbin Hotel', '2024–'],
  ['The Sympathizer', '2024'],
  ['Sunny', '2024'],
  ['Beef', '2023–'],
  ['The Curse', '2023–2024'],
  ['Such Brave Girls', '2023–'],
  ['Irma Vep', '2022'],
  ['Mo', '2022–2025'],
  ['Dreaming Whilst Black', '2023–'],
  ['Euphoria', '2019–2026'],
  ['Ramy', '2019–2022'],
  ['Random Acts of Flyness', '2018–2022'],
];

const fineDesktop = () => window.matchMedia('(min-width: 992px) and (hover: hover) and (pointer: fine)').matches;

export default function A24Nav({ onHome, loading, routeKey, hidden }) {
  const motion = useA24NavMotion(loading, routeKey, hidden);
  const showControls = ['idle', 'exit-items', 'reveal-items'].includes(motion.phase);
  const showLoading = !showControls;
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [dockWidth, setDockWidth] = useState(null);
  const [labelWidths, setLabelWidths] = useState({ word: 0, count: 0 });
  const [scrollInfo, setScrollInfo] = useState({ ratio: 1, offset: 0, top: 0, bottom: 0 });
  const navRef = useRef(null);
  const regionRef = useRef(null);
  const toggleRef = useRef(null);
  const listRef = useRef(null);
  const scrollerRef = useRef(null);
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const wordRef = useRef(null);
  const countRef = useRef(null);
  const dragRef = useRef(null);
  const pendingFocus = useRef(null);
  const suppressHover = useRef(false);
  const resetTimer = useRef(null);
  const logoPosition = useRef(null);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    setNotice('');
    if (restoreFocus) toggleRef.current?.focus({ preventScroll: true });
  }, []);

  const show = useCallback(() => {
    clearTimeout(resetTimer.current);
    setNotice('');
    setOpen(true);
  }, []);

  const updateScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const ratio = max ? Math.max(0.2, Math.min(1, scroller.clientHeight / scroller.scrollHeight)) : 1;
    const fade = Math.max(1, parseFloat(getComputedStyle(navRef.current).fontSize) * 3);
    setScrollInfo({
      ratio,
      offset: max ? (scroller.scrollTop / max) * (track.clientHeight * (1 - ratio)) : 0,
      top: max ? Math.min(1, scroller.scrollTop / fade) : 0,
      bottom: max ? Math.min(1, (max - scroller.scrollTop) / fade) : 0,
    });
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const nav = navRef.current;
      const list = listRef.current;
      if (!nav || !list) return;
      // Measure the text itself, not its animated mask: the mask may still be
      // constrained to the previous viewport's width (or the open count).
      const textWidth = (element) => {
        if (!element) return 0;
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getBoundingClientRect().width;
      };
      const word = textWidth(wordRef.current);
      const count = textWidth(countRef.current);
      setLabelWidths({ word, count });
      if (!open && window.matchMedia('(max-width: 991px)').matches) {
        const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
        const fontSize = parseFloat(getComputedStyle(nav).fontSize) || 16;
        const children = [...list.children].filter((child) => child.tagName === 'LI' && !child.hidden);
        const width = children.reduce((sum, child) => sum + (child.firstElementChild?.getBoundingClientRect().width || 0), 0);
        const maskWidth = wordRef.current?.parentElement?.getBoundingClientRect().width || 0;
        // Size the closed dock for the closed label even during the reverse animation.
        setDockWidth(Math.ceil(width + word - maskWidth + gap * (children.length - 1) + fontSize));
      }
      requestAnimationFrame(updateScroll);
    };
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(updateScroll);
    if (scrollerRef.current) observer.observe(scrollerRef.current);
    if (trackRef.current) observer.observe(trackRef.current);
    return () => { window.removeEventListener('resize', measure); observer.disconnect(); };
  }, [open, updateScroll, motion.phase, hidden]);

  useLayoutEffect(() => {
    const logo = listRef.current?.firstElementChild;
    if (!logo) return;
    const left = logo.getBoundingClientRect().left;
    if (logoPosition.current !== null && ['enter-loading', 'reveal-items'].includes(motion.phase)
      && !window.matchMedia('(max-width: 991px), (prefers-reduced-motion: reduce)').matches) {
      const delta = logoPosition.current - left;
      if (Math.abs(delta) > 0.5) logo.animate(
        [{ transform: `translateX(${delta}px)` }, { transform: 'translateX(0)' }],
        { duration: 450, easing: 'cubic-bezier(.32,.72,0,1)' },
      );
    }
    logoPosition.current = left;
  }, [motion.phase]);

  useEffect(() => {
    if (motion.phase === 'exit-items' || motion.phase === 'loading') close();
  }, [motion.phase, close]);

  useLayoutEffect(() => {
    if (hidden) close();
  }, [hidden, close]);

  useLayoutEffect(() => {
    const active = document.activeElement;
    if ((motion.phase === 'exit-items' || !showControls)
      && listRef.current?.querySelector('.a24-nav__control-slot:focus-within')?.contains(active)) {
      listRef.current?.querySelector('.a24-nav__logo')?.focus({ preventScroll: true });
    }
  }, [motion.phase, showControls]);

  useLayoutEffect(() => {
    if (!open) return;
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
    if (pendingFocus.current !== null) {
      const items = scrollerRef.current?.querySelectorAll('[data-a24-item]');
      items?.[pendingFocus.current]?.focus();
      pendingFocus.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(updateScroll);
    } else {
      resetTimer.current = window.setTimeout(() => {
        if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
      }, 520);
    }
    return () => clearTimeout(resetTimer.current);
  }, [open, updateScroll]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        suppressHover.current = true;
        close(true);
      }
    };
    const onOutside = (event) => {
      if (!navRef.current?.contains(event.target)) close();
    };
    const media = window.matchMedia('(max-width: 991px)');
    const onBreakpoint = () => close();
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onOutside);
    media.addEventListener('change', onBreakpoint);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onOutside);
      media.removeEventListener('change', onBreakpoint);
    };
  }, [open, close]);

  const focusItem = (index) => {
    const items = [...(scrollerRef.current?.querySelectorAll('[data-a24-item]') || [])];
    if (!items.length) return;
    items[(index + items.length) % items.length].focus();
  };
  const handleToggleKey = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      suppressHover.current = false;
      const target = event.key === 'ArrowDown' ? 0 : televisionIndex.length - 1;
      if (open) focusItem(target);
      else { pendingFocus.current = target; show(); }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      suppressHover.current = !open;
      if (open) close();
      else { suppressHover.current = false; show(); }
    }
  };
  const handleListKey = (event) => {
    const items = [...scrollerRef.current.querySelectorAll('[data-a24-item]')];
    const index = items.indexOf(document.activeElement);
    let target;
    if (event.key === 'ArrowDown') target = index + 1;
    if (event.key === 'ArrowUp') target = index < 0 ? items.length - 1 : index - 1;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = items.length - 1;
    if (target !== undefined) {
      event.preventDefault();
      event.stopPropagation();
      focusItem(target);
    } else if (event.key === 'Tab') {
      if (event.shiftKey && index === 0) {
        event.preventDefault();
        close(true);
      } else if (!event.shiftKey && index === items.length - 1) close();
    }
  };

  const onTrackPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    const scroller = scrollerRef.current;
    if (!track || !thumb || !scroller || scrollInfo.ratio >= 1) return;
    event.preventDefault();
    event.stopPropagation();
    const thumbRect = thumb.getBoundingClientRect();
    dragRef.current = {
      id: event.pointerId,
      grab: event.target === thumb ? event.clientY - thumbRect.top : thumbRect.height / 2,
    };
    track.setPointerCapture(event.pointerId);
    track.dataset.dragging = 'true';
    moveThumb(event);
  };
  const moveThumb = (event) => {
    if (!dragRef.current || dragRef.current.id !== event.pointerId) return;
    const track = trackRef.current;
    const scroller = scrollerRef.current;
    const travel = track.clientHeight * (1 - scrollInfo.ratio);
    const position = Math.max(0, Math.min(travel, event.clientY - track.getBoundingClientRect().top - dragRef.current.grab));
    if (travel > 0) scroller.scrollTop = position / travel * (scroller.scrollHeight - scroller.clientHeight);
    updateScroll();
  };
  const stopThumbDrag = (event) => {
    dragRef.current = null;
    delete event.currentTarget.dataset.dragging;
  };

  return (
    <nav
      ref={navRef}
      className="a24-nav"
      hidden={hidden}
      aria-label="A24 navigation"
      data-open={open ? 'true' : 'false'}
      data-motion={motion.phase}
      data-covering-loader={motion.booting && loading ? 'true' : 'false'}
      data-gl-shield
      style={{ '--a24-dock-width': dockWidth ? `${dockWidth}px` : undefined }}
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="a24-nav__backdrop" aria-hidden="true" onPointerDown={() => close()} />
      <div className="a24-nav__container">
        <div className="a24-nav__background" />
        <div className="a24-nav__inner">
          <ul className="a24-nav__list" ref={listRef}>
            <li className="a24-nav__logo-slot" inert={loading || undefined}><a className="a24-nav__logo" href="/" aria-label="A24 home" tabIndex={motion.phase === 'initial-hidden' ? -1 : undefined} onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault(); close(); onHome();
            }}><A24Logo /></a></li>
            <li className="a24-nav__loading-slot" hidden={!showLoading}>
              <span className="a24-nav__loading" role="status" aria-live="polite"><span>{motion.word}</span><span className="a24-nav__spinner" aria-hidden="true" /></span>
            </li>
            <li className="a24-nav__control-slot" hidden={!showControls} inert={motion.busy || undefined}><button className="a24-nav__link a24-nav__page a24-nav__page--other" type="button" aria-disabled="true" title="Films is not available locally" onClick={() => setNotice('Films is not available in this project.')}><span className="a24-nav__hover" data-text="Films"><span>Films</span></span></button></li>
            <li className="a24-nav__control-slot" hidden={!showControls} inert={motion.busy || undefined}><button className="a24-nav__link a24-nav__page a24-nav__page--current" type="button" aria-disabled="true" title="Television is not available locally" onClick={() => setNotice('Television is not available in this project.')}><span className="a24-nav__hover" data-text="Television"><span>Television</span></span></button></li>
            <li
              ref={regionRef}
              className="a24-nav__index-region a24-nav__control-slot"
              hidden={!showControls}
              inert={motion.busy || undefined}
              onMouseEnter={() => { if (fineDesktop()) { suppressHover.current = false; show(); } }}
              onMouseLeave={() => { suppressHover.current = false; if (fineDesktop() && !dragRef.current) close(); }}
              onFocus={(event) => { if (!suppressHover.current && (fineDesktop() || event.target.matches(':focus-visible'))) show(); }}
              onBlur={(event) => { if (!dragRef.current && !event.currentTarget.contains(event.relatedTarget)) { suppressHover.current = false; close(); } }}
            >
              <button ref={toggleRef} type="button" className="a24-nav__link a24-nav__toggle" aria-label="Index" aria-expanded={open} aria-controls="a24-television-index" aria-haspopup="true"
                onClick={() => { suppressHover.current = false; if (fineDesktop()) show(); else if (open) close(); else show(); }} onKeyDown={handleToggleKey}>
                <span className="a24-nav__label-mask" style={{ width: labelWidths[open ? 'count' : 'word'] || undefined }}>
                  <span ref={wordRef} className="a24-nav__label-word" aria-hidden="true">Index</span>
                  <span ref={countRef} className="a24-nav__label-count" aria-hidden="true">{televisionIndex.length}</span>
                </span>
                <svg className="a24-nav__chevron" viewBox="0 0 17 10" fill="none" aria-hidden="true"><path d="M1.5 1.5L8.5 8.5L15.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div id="a24-television-index" className="a24-nav__dropdown" aria-hidden={!open} inert={!open || undefined}>
                <div className="a24-nav__scroll" ref={scrollerRef} onScroll={updateScroll} onKeyDown={handleListKey} style={{ '--a24-fade-top': scrollInfo.top, '--a24-fade-bottom': scrollInfo.bottom }}>
                  <ul className="a24-nav__items">
                    {televisionIndex.map(([title, year], index) => (
                      <li key={title}>
                        <button type="button" data-a24-item className={`a24-nav__item ${index === 0 ? 'a24-nav__item--active' : ''}`} aria-disabled="true" title={`${title} is not available locally`} onClick={() => setNotice(`${title} is not available in this project.`)}
                          onPointerEnter={(event) => {
                            if (!fineDesktop() || index === 0) return;
                            const bounds = event.currentTarget.getBoundingClientRect();
                            event.currentTarget.firstElementChild.style.transformOrigin = event.clientY - bounds.top < bounds.height / 2 ? 'center top' : 'center bottom';
                          }}
                          onPointerLeave={(event) => {
                            if (!fineDesktop() || index === 0) return;
                            const bounds = event.currentTarget.getBoundingClientRect();
                            event.currentTarget.firstElementChild.style.transformOrigin = event.clientY - bounds.top < bounds.height / 2 ? 'center top' : 'center bottom';
                          }}>
                          <span className="a24-nav__item-bg" aria-hidden="true" />
                          <span className="a24-nav__item-inner"><span className="a24-nav__item-title">{title}</span><span className="a24-nav__year-mask"><span className="a24-nav__year">{year}</span></span></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div ref={trackRef} className="a24-nav__scrollbar" aria-hidden="true" onPointerDown={onTrackPointerDown} onPointerMove={moveThumb} onPointerUp={stopThumbDrag} onPointerCancel={stopThumbDrag} onLostPointerCapture={stopThumbDrag} onWheel={(event) => { if (scrollerRef.current) scrollerRef.current.scrollTop += event.deltaY; }}>
                  <div ref={thumbRef} className="a24-nav__thumb" style={{ height: `${scrollInfo.ratio * 100}%`, transform: `translateY(${scrollInfo.offset}px)` }} />
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <div className={`a24-nav__notice ${notice ? 'a24-nav__notice--visible' : ''}`} role="status">{notice}</div>
    </nav>
  );
}
