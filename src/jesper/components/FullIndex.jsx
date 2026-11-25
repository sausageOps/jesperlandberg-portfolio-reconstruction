import { useEffect, useRef, useState } from 'react';
import { projects } from '../data/projects.js';
import FullIndexRenderer from '../webgl/FullIndexRenderer.js';
import './FullIndex.css';

export default function FullIndex({ experience, ready, onOpen, inert = false }) {
  const names = useRef([]);
  const dots = useRef([]);
  const cloud = useRef(null);
  const rendererRef = useRef(null);
  const [glReady, setGlReady] = useState(false);
  const [glFailed, setGlFailed] = useState(false);

  useEffect(() => {
    const update = () => dots.current.forEach((dot, index) => {
      if (!dot || !names.current[index] || !names.current[index + 1]) return;
      const a = names.current[index].getBoundingClientRect();
      const b = names.current[index + 1].getBoundingClientRect();
      dot.style.visibility = Math.abs(a.top - b.top) < a.height / 2 ? 'visible' : 'hidden';
    });
    const observer = new ResizeObserver(update);
    if (cloud.current) observer.observe(cloud.current);
    window.addEventListener('resize', update);
    document.fonts.ready.then(update);
    update();
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  useEffect(() => {
    if (!experience?.webgl || !ready) return undefined;
    let renderer;
    let active = true;
    document.fonts.ready.then(() => {
      if (!active || experience.destroyed) return;
      try {
        renderer = new FullIndexRenderer(experience, names.current, dots.current);
        rendererRef.current = renderer;
        setGlReady(true);
      } catch (error) {
        setGlFailed(true);
        console.warn('Full index text rendering unavailable; using DOM text.', error);
      }
    });
    return () => { active = false; rendererRef.current = null; renderer?.dispose(); };
  }, [experience, ready]);

  const select = (event, item, index) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const source = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    rendererRef.current?.hideName(index);
    onOpen(item.slug, source);
  };
  return (
    <main id="jesper-content" tabIndex={-1} className={`full-index${glReady ? ' full-index-gl' : ''}${ready && (glFailed || (experience && !experience.webgl)) ? ' full-index-dom' : ''}`} data-gl-shield aria-label="Full project index" inert={inert || undefined}>
      <div className="sr-only"><h1>Index — every project by Jesper Landberg</h1><p>The full catalogue, featured or not. A featured project has a case study on this site; the rest are listed by name, with the client's own site linked where there is one.</p></div>
      <div className="full-index-outer"><div ref={cloud} className="full-index-cloud">
        {projects.map((item, index) => (
          <span className="full-index-item" key={item.slug}>
            {item.featured ? <a ref={(el) => { names.current[index] = el; }} className="full-index-name" href={`/projects/${item.slug}`} onClick={(event) => select(event, item, index)}>{item.title}</a>
              : item.link ? <a ref={(el) => { names.current[index] = el; }} className="full-index-name" href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a>
              : <span ref={(el) => { names.current[index] = el; }} className="full-index-name">{item.title}</span>}
            {index < projects.length - 1 && <span ref={(el) => { dots.current[index] = el; }} className="full-index-dot" aria-hidden="true">●</span>}
          </span>
        ))}
      </div></div>
    </main>
  );
}
