import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import Hud from './components/Hud.jsx';
import JesperHome from './jesper/JesperHome.jsx';
import Loader from './jesper/components/Loader.jsx';
import Section from './components/Section.jsx';
import Contact from './components/contact/Contact.jsx';
import Studio from './components/studio/Studio.jsx';
import { activeTopLevel, formatSegment, resolveSection } from './data/navigation.js';
import { resolveCarterPage } from './carter/routes.js';
import { labDescription } from './carter/data/lab-slugs.js';

const cleanPath = (pathname) => pathname !== '/' ? pathname.replace(/\/+$/, '') : '/';
// Links into the retired standalone portfolio land on the new homepage rather
// than leaving a blank legacy route; no old project content is retained.
const readLocation = () => {
  const path = cleanPath(window.location.pathname);
  if (/^\/projects(?:\/|$)/.test(path)) {
    window.history.replaceState({}, '', '/');
    return '/';
  }
  return path;
};
const CarterRoute = lazy(() =>
  import('./carter/CarterRoute.jsx').catch((error) => {
    console.error('[carter] frame failed to load', error);
    return { default: ({ placeholder }) => placeholder };
  }),
);

export default function App() {
  const [path, setPath] = useState(readLocation);
  const [loading, setLoading] = useState(true);
  const section = useMemo(() => resolveSection(path), [path]);
  const carterPage = useMemo(() => resolveCarterPage(path), [path]);
  const route = section ? section.menu.key : path === '/' ? 'home' : 'not-found';
  const activeNav = activeTopLevel(path);

  // The reference loader follows the experience's real asset progress and
  // leaves on the same 650ms schedule. Non-home pages wait for that handoff.
  const [progress, setProgress] = useState(0);
  const [preloaderDone, setPreloaderDone] = useState(false);
  const homeEntranceReady = !loading && preloaderDone;
  const finishLoading = useCallback(() => {
    setLoading(false);
    window.setTimeout(() => setPreloaderDone(true), 650);
  }, []);

  useEffect(() => {
    const pop = () => setPath(readLocation());
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  useEffect(() => {
    document.title = carterPage?.key === 'lab-detail'
      ? `${carterPage.label} :: Lab`
      : carterPage?.key === 'writing-post'
        ? `${carterPage.label} :: Writing`
        : section
          ? section.item ? `${section.item.title} — ${section.menu.label}` : section.menu.label
          : route === 'home' ? 'Jesper Landberg' : 'Page not found | ReframeHK';
  }, [route, section, carterPage]);

  useEffect(() => {
    const text = carterPage?.key === 'lab-detail' ? labDescription(carterPage.slug) : carterPage?.description || null;
    if (!text) return undefined;
    const description = document.querySelector('meta[name="description"]');
    if (!description) return undefined;
    const previous = description.getAttribute('content');
    description.setAttribute('content', text);
    return () => { if (previous != null) description.setAttribute('content', previous); };
  }, [carterPage]);

  const navigate = useCallback((to, { replace = false } = {}) => {
    const nextPath = cleanPath(to);
    if (replace) window.history.replaceState({}, '', nextPath);
    else window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  }, []);
  const goHome = useCallback(() => {
    if (path === '/') window.dispatchEvent(new Event('jesper:home'));
    else navigate('/');
  }, [navigate, path]);

  const routeContent = useMemo(() => {
    if (route === 'home') return null;
    if (route === 'myself' && section.item?.slug === 'contact') return <Contact appReady={homeEntranceReady} />;
    if (route === 'routes' && section.item?.slug === 'studio') return <Studio appReady={homeEntranceReady} />;
    if (carterPage && section) {
      const placeholder = <Section menu={section.menu} item={section.item} subtitle={section.nested ? formatSegment(section.nested) : undefined} />;
      return <Suspense fallback={null}><CarterRoute page={carterPage} appReady={homeEntranceReady} onNavigate={navigate} placeholder={placeholder} /></Suspense>;
    }
    if (section?.nested) return <Section menu={section.menu} item={section.item} subtitle={formatSegment(section.nested)} />;
    if (route === 'routes' || route === 'myself') return <Section menu={section.menu} item={section.item} />;
    return <main className="not-found"><h1 className="sr-only">Page not found</h1></main>;
  }, [route, section, carterPage, homeEntranceReady, navigate]);

  const routeClass = carterPage
    ? ` route-carter${carterPage.key === 'about' ? ' route-about' : ''}`
    : (route === 'myself' && section?.item?.slug === 'contact') || (route === 'routes' && section?.item?.slug === 'studio')
      ? ` route-${section.item.slug}` : '';

  return (
    <div className={`app route-${route}${routeClass}`}>
      {!preloaderDone && <div className="jesper-loader-scope"><Loader progress={progress} leaving={!loading} /></div>}
      <div inert={route !== 'home' && loading || undefined} style={{ opacity: route !== 'home' && loading ? 0 : 1 }}>
        <a className="skip-link" href={route === 'home' ? '#jesper-content' : '#main-content'}>Skip to content</a>
        {(route === 'home' || !preloaderDone) && <JesperHome active={route === 'home'} onProgress={setProgress} onReady={finishLoading} />}
        <div id="main-content">{routeContent}</div>
        <Hud navRouteKey={route} activeKey={activeNav} activePath={path} loading={loading} onNavigate={navigate} onHome={goHome} />
      </div>
    </div>
  );
}
