import { useLayoutEffect, useRef, useState } from 'react';
import { featured, projects } from './data/projects.js';
import './masterFallback.css';

// This view is only mounted when the captured WebGL renderer cannot run. It
// uses the same project inventory and URLs; it is not a second WebGL renderer.
export default function MasterFallback({ onHistory }) {
  const [path, setPath] = useState(() => window.location.pathname.replace(/\/+$/, '') || '/');
  const [failedVideos, setFailedVideos] = useState({});
  const onHistoryRef = useRef(onHistory);
  const containerRef = useRef(null);
  const nextScroll = useRef(0);
  onHistoryRef.current = onHistory;
  const selected = featured.find((item) => path === `/projects/${item.slug}`);
  const index = selected ? featured.findIndex((item) => item.slug === selected.slug) : -1;

  useLayoutEffect(() => {
    document.documentElement.classList.add('master-fallback-active');
    const navigate = (to, { replace = false } = {}) => {
      const url = new URL(to, window.location.href);
      if (url.origin !== window.location.origin) return;
      const next = url.pathname.replace(/\/+$/, '') || '/';
      const slug = next.match(/^\/projects\/([^/]+)$/)?.[1];
      const current = window.location.pathname;
      const originFull = current === '/full' || (/^\/projects\//.test(current) && !!window.history.state?.jesperFullOrigin);
      const currentState = { ...(window.history.state || {}) };
      if (!replace) window.history.replaceState({ ...currentState, forward: next, masterFallbackScroll: containerRef.current?.scrollTop || 0 }, '', window.location.href);
      const state = { ...currentState, back: replace ? currentState.back ?? null : current, current: next, forward: null, replaced: replace, position: (currentState.position ?? window.history.length - 1) + (replace ? 0 : 1), scroll: null, masterFallbackScroll: 0 };
      if (slug) {
        state.jesperHomeProject = slug;
        if (originFull) state.jesperFullOrigin = true;
        else delete state.jesperFullOrigin;
      } else {
        delete state.jesperHomeProject;
        delete state.jesperFullOrigin;
      }
      window.history[replace ? 'replaceState' : 'pushState'](state, '', next);
      nextScroll.current = 0;
      setPath(next);
      setFailedVideos({});
      onHistoryRef.current();
    };
    const pop = () => {
      nextScroll.current = window.history.state?.masterFallbackScroll || 0;
      setPath(window.location.pathname.replace(/\/+$/, '') || '/');
      setFailedVideos({});
    };
    window.__masterFallbackNavigate = navigate;
    window.addEventListener('popstate', pop);
    return () => {
      window.removeEventListener('popstate', pop);
      if (window.__masterFallbackNavigate === navigate) delete window.__masterFallbackNavigate;
      document.documentElement.classList.remove('master-fallback-active');
    };
  }, []);

  useLayoutEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = nextScroll.current;
  }, [path]);

  const follow = (to) => (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.__masterFallbackNavigate?.(to);
  };
  const projectLink = (slug) => `/projects/${slug}`;

  return (
    <main ref={containerRef} className="master-fallback" aria-label="Portfolio">
      <header className="master-fallback__header">
        <span>Jesper Landberg</span>
        <span role="status">Graphics unavailable · showing accessible view</span>
      </header>
      <nav className="master-fallback__views" aria-label="Project views">
        <a href="/" aria-current={!selected && path === '/' ? 'page' : undefined} onClick={follow('/')}>Featured</a>
        <span aria-hidden="true">/</span>
        <a href="/full" aria-current={!selected && path === '/full' ? 'page' : undefined} onClick={follow('/full')}>Full</a>
      </nav>
      {selected ? (
        <article className="master-fallback__project" key={selected.slug}>
          <a className="master-fallback__close" href="/" onClick={follow('/')} aria-label="Close project">×</a>
          <h1>{selected.title}</h1>
          <p className="master-fallback__description">{selected.description}</p>
          <div className="master-fallback__tags">
            {selected.link && <a href={selected.link} target="_blank" rel="noopener noreferrer">Visit {selected.title} ↗</a>}
            {selected.tags.map((tag) => tag.url
              ? <a key={tag.id} href={tag.url} target="_blank" rel="noopener noreferrer">{tag.title}</a>
              : <span key={tag.id}>{tag.title}</span>)}
            {selected.awards > 0 && <span>{selected.awards} {selected.awards === 1 ? 'award' : 'awards'}</span>}
          </div>
          <div className="master-fallback__media">
            {selected.images.map((media, i) => (
              <figure key={`${selected.slug}-${i}`}>
                {media.video && !failedVideos[media.video]
                  ? <video src={media.video} poster={media.asset || media.src} width={media.width} height={media.height} muted loop autoPlay playsInline onError={() => setFailedVideos((v) => ({ ...v, [media.video]: true }))} />
                  : <img src={media.asset || media.src} width={media.width} height={media.height} alt={media.alt || `${selected.title}, image ${i + 1}`} />}
                {media.video && failedVideos[media.video] && <figcaption>Video unavailable — showing its poster.</figcaption>}
              </figure>
            ))}
          </div>
          <nav className="master-fallback__paging" aria-label="Project navigation">
            <a href={projectLink(featured[(index + featured.length - 1) % featured.length].slug)} onClick={follow(projectLink(featured[(index + featured.length - 1) % featured.length].slug))}>← {featured[(index + featured.length - 1) % featured.length].title}</a>
            <a href={projectLink(featured[(index + 1) % featured.length].slug)} onClick={follow(projectLink(featured[(index + 1) % featured.length].slug))}>{featured[(index + 1) % featured.length].title} →</a>
          </nav>
        </article>
      ) : path === '/full' ? (
        <section className="master-fallback__index"><h1>Full index</h1><ul>{projects.map((project) => (
          <li key={project.slug}>{project.featured
            ? <a href={projectLink(project.slug)} onClick={follow(projectLink(project.slug))}>{project.title}</a>
            : project.link ? <a href={project.link} target="_blank" rel="noopener noreferrer">{project.title} ↗</a> : <span>{project.title}</span>}</li>
        ))}</ul></section>
      ) : (
        <section className="master-fallback__featured" aria-label="Featured projects"><h1 className="master-fallback__sr">Featured projects</h1>{featured.map((project) => (
          <a key={project.slug} className="master-fallback__card" href={projectLink(project.slug)} onClick={follow(projectLink(project.slug))}>
            <img src={project.asset || project.src} width={project.width} height={project.height} alt="" />
            <span>{project.title} <span aria-hidden="true">→</span></span>
          </a>
        ))}</section>
      )}
    </main>
  );
}
