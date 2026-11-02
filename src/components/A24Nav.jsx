import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import A24Logo from './A24Logo.jsx';
import useA24NavMotion from './useA24NavMotion.js';
import { menuKeys, navMenus } from '../data/navigation.js';
import './A24Nav.css';

const fineDesktop = () => window.matchMedia('(min-width: 992px) and (hover: hover) and (pointer: fine)').matches;
const resetScrollInfo = () => Object.fromEntries(menuKeys.map((key) => [key, { ratio: 1, offset: 0, top: 0, bottom: 0 }]));
const resetLabelWidths = () => Object.fromEntries(menuKeys.map((key) => [key, { word: 0, count: 0 }]));

export default function A24Nav({ onHome, onNavigate, loading, routeKey, activeKey, activePath, hidden }) {
  const motion = useA24NavMotion(loading, routeKey, hidden);
  const showControls = ['idle', 'exit-items', 'reveal-items'].includes(motion.phase);
  const showLoading = !showControls;
  const [openMenu, setOpenMenu] = useState(null);
  const [dockWidth, setDockWidth] = useState(null);
  const [labelWidths, setLabelWidths] = useState(resetLabelWidths);
  const [scrollInfo, setScrollInfo] = useState(resetScrollInfo);
  const navRef = useRef(null);
  const listRef = useRef(null);
  const regionRefs = useRef({});
  const toggleRefs = useRef({});
  const scrollerRefs = useRef({});
  const trackRefs = useRef({});
  const thumbRefs = useRef({});
  const maskRefs = useRef({});
  const wordRefs = useRef({});
  const countRefs = useRef({});
  const dragRef = useRef(null);
  const pendingFocus = useRef(null);
  const suppressHover = useRef(false);
  const resetTimer = useRef(null);
  const logoPosition = useRef(null);
  const dockBox = useRef({ width: null });
  const lastOpenMenu = useRef(null);
  const open = openMenu !== null;

  const close = useCallback((restoreFocus = false) => {
    const previous = lastOpenMenu.current;
    setOpenMenu(null);
    if (restoreFocus && previous) toggleRefs.current[previous]?.focus({ preventScroll: true });
  }, []);

  const show = useCallback((menu) => {
    clearTimeout(resetTimer.current);
    setOpenMenu(menu);
  }, []);

  const updateScroll = useCallback((menu) => {
    const scroller = scrollerRefs.current[menu];
    const track = trackRefs.current[menu];
    if (!scroller || !track || !navRef.current) return;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const ratio = max ? Math.max(0.2, Math.min(1, scroller.clientHeight / scroller.scrollHeight)) : 1;
    const fade = Math.max(1, parseFloat(getComputedStyle(navRef.current).fontSize) * 3);
    setScrollInfo((info) => ({
      ...info,
      [menu]: {
        ratio,
        offset: max ? (scroller.scrollTop / max) * (track.clientHeight * (1 - ratio)) : 0,
        top: max ? Math.min(1, scroller.scrollTop / fade) : 0,
        bottom: max ? Math.min(1, (max - scroller.scrollTop) / fade) : 0,
      },
    }));
  }, []);

  useLayoutEffect(() => {
    if (openMenu) lastOpenMenu.current = openMenu;
  }, [openMenu]);

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
      const widths = {};
      let maskCorrection = 0;
      menuKeys.forEach((key) => {
        const word = textWidth(wordRefs.current[key]);
        const count = textWidth(countRefs.current[key]);
        widths[key] = { word, count };
        const mask = maskRefs.current[key];
        if (mask) maskCorrection += word - mask.getBoundingClientRect().width;
      });
      setLabelWidths(widths);
      // Measured at every width: the dock width drives the white panel on
      // tablet/mobile and, since it reuses the same container, on desktop too.
      if (!open) {
        const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
        const fontSize = parseFloat(getComputedStyle(nav).fontSize) || 16;
        const children = [...list.children].filter((child) => child.tagName === 'LI' && !child.hidden);
        const width = children.reduce((sum, child) => sum + (child.firstElementChild?.getBoundingClientRect().width || 0), 0);
        // Size the closed dock for the closed labels even during the reverse animation.
        setDockWidth(Math.ceil(width + maskCorrection + gap * (children.length - 1) + fontSize));
      }
      menuKeys.forEach((key) => requestAnimationFrame(() => updateScroll(key)));
    };
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(() => menuKeys.forEach((key) => updateScroll(key)));
    menuKeys.forEach((key) => {
      if (scrollerRefs.current[key]) observer.observe(scrollerRefs.current[key]);
      if (trackRefs.current[key]) observer.observe(trackRefs.current[key]);
    });
    return () => { window.removeEventListener('resize', measure); observer.disconnect(); };
  }, [open, updateScroll, motion.phase, hidden]);

  useLayoutEffect(() => {
    const logo = listRef.current?.firstElementChild;
    if (!logo) return;
    const left = logo.getBoundingClientRect().left;
    // The nudge only smooths changes where the dock keeps its width (a
    // route-to-route reveal). When the dock itself is resized - the loading
    // pill turning into the item pill - the items appear at their final,
    // centred positions in the same frame; sliding the logo alone would drag
    // the dock content off the viewport centre for the length of the nudge.
    const listWidth = listRef.current.getBoundingClientRect().width;
    const widthChanged = dockBox.current.width !== null && Math.abs(listWidth - dockBox.current.width) > 0.5;
    dockBox.current.width = listWidth;
    if (logoPosition.current !== null && !widthChanged && ['enter-loading', 'reveal-items'].includes(motion.phase)
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
    if (!openMenu) return;
    const scroller = scrollerRefs.current[openMenu];
    if (scroller) scroller.scrollTop = 0;
    if (pendingFocus.current?.menu === openMenu) {
      const items = scroller?.querySelectorAll('[data-a24-item]');
      items?.[pendingFocus.current.index]?.focus();
      pendingFocus.current = null;
    }
  }, [openMenu]);

  useEffect(() => {
    if (open) {
      if (openMenu) requestAnimationFrame(() => updateScroll(openMenu));
    } else {
      const previous = lastOpenMenu.current;
      resetTimer.current = window.setTimeout(() => {
        const scroller = previous ? scrollerRefs.current[previous] : null;
        if (scroller) scroller.scrollTop = 0;
      }, 520);
    }
    return () => clearTimeout(resetTimer.current);
  }, [open, openMenu, updateScroll]);

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

  const focusItem = (menu, index) => {
    const items = [...(scrollerRefs.current[menu]?.querySelectorAll('[data-a24-item]') || [])];
    if (!items.length) return;
    items[(index + items.length) % items.length].focus();
  };

  const handleToggleKey = (menu, event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      suppressHover.current = false;
      const target = event.key === 'ArrowDown' ? 0 : navMenus[menu].items.length - 1;
      if (openMenu === menu) focusItem(menu, target);
      else { pendingFocus.current = { menu, index: target }; show(menu); }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      suppressHover.current = openMenu !== menu;
      if (openMenu === menu) close();
      else { suppressHover.current = false; show(menu); }
    }
  };

  const handleListKey = (menu, event) => {
    const items = [...(scrollerRefs.current[menu]?.querySelectorAll('[data-a24-item]') || [])];
    if (!items.length) return;
    const index = items.indexOf(document.activeElement);
    let target;
    if (event.key === 'ArrowDown') target = index + 1;
    if (event.key === 'ArrowUp') target = index < 0 ? items.length - 1 : index - 1;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = items.length - 1;
    if (target !== undefined) {
      event.preventDefault();
      event.stopPropagation();
      focusItem(menu, target);
    } else if (event.key === 'Tab') {
      if (event.shiftKey && index === 0) {
        event.preventDefault();
        close(true);
      } else if (!event.shiftKey && index === items.length - 1) close();
    }
  };

  const onTrackPointerDown = (menu, event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const track = trackRefs.current[menu];
    const thumb = thumbRefs.current[menu];
    const scroller = scrollerRefs.current[menu];
    if (!track || !thumb || !scroller || scrollInfo[menu].ratio >= 1) return;
    event.preventDefault();
    event.stopPropagation();
    const thumbRect = thumb.getBoundingClientRect();
    dragRef.current = {
      menu,
      id: event.pointerId,
      grab: event.target === thumb ? event.clientY - thumbRect.top : thumbRect.height / 2,
    };
    track.setPointerCapture(event.pointerId);
    track.dataset.dragging = 'true';
    moveThumb(menu, event);
  };

  const moveThumb = (menu, event) => {
    const drag = dragRef.current;
    if (!drag || drag.menu !== menu || drag.id !== event.pointerId) return;
    const track = trackRefs.current[menu];
    const scroller = scrollerRefs.current[menu];
    if (!track || !scroller) return;
    const travel = track.clientHeight * (1 - scrollInfo[menu].ratio);
    const position = Math.max(0, Math.min(travel, event.clientY - track.getBoundingClientRect().top - drag.grab));
    if (travel > 0) scroller.scrollTop = position / travel * (scroller.scrollHeight - scroller.clientHeight);
    updateScroll(menu);
  };

  const stopThumbDrag = (event) => {
    dragRef.current = null;
    delete event.currentTarget.dataset.dragging;
  };

  const navigateTo = (event, to) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    close();
    onNavigate(to);
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
            <li className="a24-nav__control-slot" hidden={!showControls} inert={motion.busy || undefined}>
              <a
                className={`a24-nav__link a24-nav__page ${activeKey === 'life' ? 'a24-nav__page--current' : ''}`}
                href="/"
                aria-current={activeKey === 'life' ? 'page' : undefined}
                onClick={(event) => {
                  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  close();
                  onHome();
                }}
              >
                <span className="a24-nav__hover" data-text="Life"><span>Life</span></span>
              </a>
            </li>
            {menuKeys.map((menuKey) => {
              const menu = navMenus[menuKey];
              const isOpen = openMenu === menuKey;
              const isActive = activeKey === menuKey;
              const widths = labelWidths[menuKey];
              const info = scrollInfo[menuKey];
              return (
                <li
                  key={menuKey}
                  ref={(element) => { regionRefs.current[menuKey] = element; }}
                  className="a24-nav__index-region a24-nav__control-slot"
                  hidden={!showControls}
                  inert={motion.busy || undefined}
                  onMouseEnter={() => { if (fineDesktop()) { suppressHover.current = false; show(menuKey); } }}
                  onMouseLeave={() => { suppressHover.current = false; if (fineDesktop() && !dragRef.current) close(); }}
                  onFocus={(event) => { if (!suppressHover.current && (fineDesktop() || event.target.matches(':focus-visible'))) show(menuKey); }}
                  onBlur={(event) => { if (!dragRef.current && !event.currentTarget.contains(event.relatedTarget)) { suppressHover.current = false; close(); } }}
                >
                  <button
                    ref={(element) => { toggleRefs.current[menuKey] = element; }}
                    type="button"
                    className={`a24-nav__link a24-nav__toggle a24-nav__page ${isActive ? 'a24-nav__page--current' : ''}`}
                    aria-label={menu.label}
                    aria-expanded={isOpen}
                    aria-current={isActive ? 'page' : undefined}
                    aria-controls={`a24-${menuKey}-index`}
                    aria-haspopup="true"
                    onClick={() => {
                      suppressHover.current = false;
                      if (fineDesktop()) show(menuKey);
                      else if (isOpen) close();
                      else show(menuKey);
                    }}
                    onKeyDown={(event) => handleToggleKey(menuKey, event)}
                  >
                    <span ref={(element) => { maskRefs.current[menuKey] = element; }} className="a24-nav__label-mask" style={{ width: widths[isOpen ? 'count' : 'word'] || undefined }}>
                      <span ref={(element) => { wordRefs.current[menuKey] = element; }} className="a24-nav__label-word" aria-hidden="true">{menu.label}</span>
                      <span ref={(element) => { countRefs.current[menuKey] = element; }} className="a24-nav__label-count" aria-hidden="true">{menu.items.length}</span>
                    </span>
                    <svg className="a24-nav__chevron" viewBox="0 0 17 10" fill="none" aria-hidden="true"><path d="M1.5 1.5L8.5 8.5L15.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <div
                    id={`a24-${menuKey}-index`}
                    className="a24-nav__dropdown"
                    data-open={isOpen ? 'true' : 'false'}
                    aria-hidden={!isOpen}
                    inert={!isOpen || undefined}
                  >
                    <div
                      ref={(element) => { scrollerRefs.current[menuKey] = element; }}
                      className="a24-nav__scroll"
                      onScroll={() => updateScroll(menuKey)}
                      onKeyDown={(event) => handleListKey(menuKey, event)}
                      style={{ '--a24-fade-top': info.top, '--a24-fade-bottom': info.bottom }}
                    >
                      <ul className="a24-nav__items">
                        {menu.items.map((item) => {
                          const isCurrent = activePath === item.to;
                          return (
                            <li key={item.slug}>
                              <a
                                href={item.to}
                                data-a24-item
                                className={`a24-nav__item ${isCurrent ? 'a24-nav__item--active' : ''}`}
                                aria-current={isCurrent ? 'page' : undefined}
                                onClick={(event) => navigateTo(event, item.to)}
                                onPointerEnter={(event) => {
                                  if (!fineDesktop() || isCurrent) return;
                                  const bounds = event.currentTarget.getBoundingClientRect();
                                  event.currentTarget.firstElementChild.style.transformOrigin = event.clientY - bounds.top < bounds.height / 2 ? 'center top' : 'center bottom';
                                }}
                                onPointerLeave={(event) => {
                                  if (!fineDesktop() || isCurrent) return;
                                  const bounds = event.currentTarget.getBoundingClientRect();
                                  event.currentTarget.firstElementChild.style.transformOrigin = event.clientY - bounds.top < bounds.height / 2 ? 'center top' : 'center bottom';
                                }}
                              >
                                <span className="a24-nav__item-bg" aria-hidden="true" />
                                <span className="a24-nav__item-inner"><span className="a24-nav__item-title">{item.title}</span></span>
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div
                      ref={(element) => { trackRefs.current[menuKey] = element; }}
                      className="a24-nav__scrollbar"
                      aria-hidden="true"
                      onPointerDown={(event) => onTrackPointerDown(menuKey, event)}
                      onPointerMove={(event) => moveThumb(menuKey, event)}
                      onPointerUp={stopThumbDrag}
                      onPointerCancel={stopThumbDrag}
                      onLostPointerCapture={stopThumbDrag}
                      onWheel={(event) => { const scroller = scrollerRefs.current[menuKey]; if (scroller) scroller.scrollTop += event.deltaY; }}
                    >
                      <div ref={(element) => { thumbRefs.current[menuKey] = element; }} className="a24-nav__thumb" style={{ height: `${info.ratio * 100}%`, transform: `translateY(${info.offset}px)` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
