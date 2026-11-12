import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import Hud from './components/Hud.jsx';
import ReframeHome from './reframe/ReframeHome.jsx';
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

  // Keep the static source index available until React has actually mounted.
  // The live home index takes over; internal routes must not expose a duplicate.
  useEffect(() => {
    const index = document.getElementById('reframe-static-index');
    if (index) index.hidden = true;
    return () => { if (index) index.hidden = false; };
  }, []);

  // The retained nav and page entrances wait for their font, not the removed
  // portfolio's project textures/models. Its own original timing is unchanged.
  useEffect(() => {
    let mounted = true;
    const finish = () => { if (mounted) setLoading(false); };
    const timeout = window.setTimeout(finish, 2500);
    document.fonts.ready.then(finish, finish);
    return () => { mounted = false; window.clearTimeout(timeout); };
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
          : route === 'home' ? 'ReframeHK | Hong Kong Web Studio' : 'Page not found | ReframeHK';
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
    if (path === '/') window.dispatchEvent(new Event('reframe:home'));
    else navigate('/');
  }, [navigate, path]);

  const routeContent = useMemo(() => {
    if (route === 'home') return null;
    if (route === 'myself' && section.item?.slug === 'contact') return <Contact appReady={!loading} />;
    if (route === 'routes' && section.item?.slug === 'studio') return <Studio appReady={!loading} />;
    if (carterPage && section) {
      const placeholder = <Section menu={section.menu} item={section.item} subtitle={section.nested ? formatSegment(section.nested) : undefined} />;
      return <Suspense fallback={null}><CarterRoute page={carterPage} appReady={!loading} onNavigate={navigate} placeholder={placeholder} /></Suspense>;
    }
    if (section?.nested) return <Section menu={section.menu} item={section.item} subtitle={formatSegment(section.nested)} />;
    if (route === 'routes' || route === 'myself') return <Section menu={section.menu} item={section.item} />;
    return <main className="not-found"><h1 className="sr-only">Page not found</h1></main>;
  }, [route, section, carterPage, loading, navigate]);

  const routeClass = carterPage
    ? ` route-carter${carterPage.key === 'about' ? ' route-about' : ''}`
    : (route === 'myself' && section?.item?.slug === 'contact') || (route === 'routes' && section?.item?.slug === 'studio')
      ? ` route-${section.item.slug}` : '';

  return (
    <div className={`app route-${route}${routeClass}`}>
      <div inert={route !== 'home' && loading || undefined} style={{ opacity: route !== 'home' && loading ? 0 : 1 }}>
        <a className="skip-link" href={route === 'home' ? '#reframe-content' : '#main-content'}>Skip to content</a>
        {route === 'home' && <div className="reframe-host"><ReframeHome /></div>}
        <div id="main-content">{routeContent}</div>
        <Hud navRouteKey={route} activeKey={activeNav} activePath={path} loading={loading} onNavigate={navigate} onHome={goHome} />
      </div>
    </div>
  );
}
