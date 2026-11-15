import { useEffect, useRef } from 'react';
import { mountReframe } from './engine.js';
import './reframe.css';

// The reference document's field and HUD, mounted as a React-owned island.
// `entranceReady` is only a gate: the homepage's own entrance (tile reveal +
// logo assemble) begins when it flips true, so the opening preloader covers the
// first paint instead of hiding it. Nothing about the entrance itself changes.
export default function ReframeHome({ entranceReady = true }) {
  const root = useRef(null);
  const instanceRef = useRef(null);
  useEffect(() => {
    const instance = mountReframe(root.current);
    instanceRef.current = instance;
    return () => { instance.destroy(); instanceRef.current = null; };
  }, []);
  useEffect(() => {
    if (entranceReady) instanceRef.current?.startEntrance?.();
  }, [entranceReady]);

  return (
    <div className="reframe-scope">
      <div ref={root} className="page reframe-page">
        <div className="stage" data-stage aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />
        <div className="cross" aria-hidden="true" />
        <div className="aim" data-aim aria-hidden="true" />
        <header className="hud hud--top">
          <button className="mark" type="button" data-fly="hero" data-logo data-t-aria="hud.markLabel" aria-label="ReframeHK, back to start">
            <i>re</i>frame<sup>HK</sup>
          </button>
          <div className="hud__right">
            <nav className="hud__nav" data-t-aria="hud.flyTo" aria-label="Fly to">
              <button type="button" data-fly="services" data-t="hud.services">Services</button>
              <button type="button" data-fly="work"><span data-t="hud.work">Work</span> <span className="hud__count" data-work-count>01/03</span></button>
              <button type="button" data-fly="contact" data-t="hud.contact">Contact</button>
            </nav>
            <button className="pill sound" type="button" data-sound aria-pressed="false" data-t-aria="hud.sound" aria-label="Sound">
              <span className="eq" aria-hidden="true"><i /><i /><i /><i /></span><span className="sound__txt" aria-hidden="true" data-t="hud.sound">Sound</span>
            </button>
          </div>
        </header>
        <footer className="hud hud--bottom">
          <p className="hint"><span className="hint__pad" aria-hidden="true"><span /></span><span data-hint>Drag · arrows · ↵ open</span></p>
          <p className="coords" aria-hidden="true"><span data-t="hud.clock">HKT</span><b className="coords__clock" data-clock>00:00:00</b><span className="coords__xy"><span>·</span><span>X</span><b data-x>+0000</b><span>Y</span><b data-y>+0000</b></span></p>
        </footer>
        <div className="cursor-label" data-label aria-hidden="true" />
        <aside className="sheet" data-sheet aria-hidden="true">
          <div className="sheet__backdrop" data-close />
          <div className="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
            <button className="sheet__close" type="button" data-close><span data-t="sheet.close">Close</span> <span aria-hidden="true">×</span></button>
            <div className="sheet__body" data-sheet-body />
          </div>
        </aside>
        <main id="reframe-content" className="index" data-index tabIndex={-1} aria-label="ReframeHK content" />
      </div>
    </div>
  );
}
