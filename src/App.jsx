import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hud from './components/Hud.jsx';
import JesperHome from './jesper/JesperHome.jsx';
import MasterPortfolio from './jesper/MasterMobile.jsx';
import Loader from './jesper/components/Loader.jsx';
import Section from './components/Section.jsx';
import Contact from './components/contact/Contact.jsx';
import Studio from './components/studio/Studio.jsx';
import { activeTopLevel, formatSegment, resolveSection } from './data/navigation.js';
import { resolveCarterPage } from './carter/routes.js';
import { labDescription } from './carter/data/lab-slugs.js';
import { featured } from './jesper/data/projects.js';

const cleanPath = (pathname) => pathname !== '/' ? pathname.replace(/\/+$/, '') : '/';
const isMobileViewport = () => window.matchMedia('(max-width: 649px)').matches;
const isTabletViewport = () => window.matchMedia('(min-width: 650px) and (max-width: 1024px)').matches;
// Valid portfolio project URLs are owned by the captured runtime on phones
// and in the explicitly approved tablet band. Outside it, retain the host's
// original redirect behavior; unknown project slugs still return home.
const readLocation = () => {
  const path = cleanPath(window.location.pathname);
  if (/^\/projects(?:\/|$)/.test(path)) {
    const slug = path.match(/^\/projects\/([^/]+)$/)?.[1];
    if ((isMobileViewport() || isTabletViewport()) && featured.some((item) => item.slug === slug)) {
      return window.history.state?.jesperFullOrigin ? '/full' : '/';
    }
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
  const [viewportMode, setViewportMode] = useState(() => ({ mobile: isMobileViewport(), tablet: isTabletViewport() }));
  const { mobile, tablet } = viewportMode;
  const previousTablet = useRef(tablet);
  const [loading, setLoading] = useState(true);
  const section = useMemo(() => resolveSection(path), [path]);
  const carterPage = useMemo(() => resolveCarterPage(path), [path]);
  const route = section ? section.menu.key : path === '/' ? 'home' : path === '/full' && (mobile || tablet) ? 'full' : 'not-found';
  const activeNav = route === 'full' ? 'life' : activeTopLevel(path);
  const masterPortfolio = (mobile || tablet) && (route === 'home' || route === 'full');

  const [progress, setProgress] = useState(0);
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [loaderPainted, setLoaderPainted] = useState(false);
  const [mobileHomeBoot] = useState(() => window.location.pathname === '/' && !window.history.state?.jesperHomeProject && window.matchMedia('(max-width: 649px)').matches);
  const homeEntranceReady = !loading && preloaderDone;
  const finishLoading = useCallback(() => {
    setLoading(false);
    // The reference retains the loader anchors for 0.5s after boot release.
    // Keep the existing handoff on other routes and at larger breakpoints.
    window.setTimeout(() => setPreloaderDone(true), mobileHomeBoot ? 500 : 650);
  }, [mobileHomeBoot]);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 649px)');
    const tabletQuery = window.matchMedia('(min-width: 650px) and (max-width: 1024px)');
    // Read both predicates together so crossing a shared boundary cannot
    // briefly mount the legacy renderer between the mobile and tablet modes.
    const changed = () => {
      const nextMobile = mobileQuery.matches;
      const nextTablet = tabletQuery.matches;
      const wasTablet = previousTablet.current;
      previousTablet.current = nextTablet;
      // Normalize tablet project URLs before the legacy desktop renderer mounts;
      // that renderer intentionally redirects desktop project routes to home.
      if (wasTablet && !nextTablet && !nextMobile && /^\/projects(?:\/|$)/.test(window.location.pathname)) {
        window.history.replaceState({}, '', '/');
        setPath('/');
      }
      setViewportMode({ mobile: nextMobile, tablet: nextTablet });
    };
    mobileQuery.addEventListener('change', changed);
    tabletQuery.addEventListener('change', changed);
    return () => {
      mobileQuery.removeEventListener('change', changed);
      tabletQuery.removeEventListener('change', changed);
    };
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
          : route === 'home' ? 'Jesper Landberg' : route === 'full' ? 'Index — Jesper Landberg' : 'Page not found | ReframeHK';
  }, [route, section, carterPage]);

  useEffect(() => {
    if (!tablet || !masterPortfolio) return undefined;
    // Nuxt can re-apply the previous Full-page title after its client-side
    // transition to the tablet home route. Keep the host's canonical home title
    // in sync only at `/`; project and Full titles remain runtime-owned.
    const title = document.querySelector('title');
    if (!title) return undefined;
    const syncHomeTitle = () => {
      if (window.location.pathname === '/' && document.title !== 'Jesper Landberg') {
        document.title = 'Jesper Landberg';
      }
    };
    const observer = new MutationObserver(syncHomeTitle);
    observer.observe(title, { childList: true, subtree: true, characterData: true });
    syncHomeTitle();
    return () => observer.disconnect();
  }, [tablet, masterPortfolio]);

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
    // The fallback shares the host's URLs/history and exists only when the
    // mobile master renderer cannot run.
    if (window.__masterFallbackNavigate && (nextPath === '/' || nextPath === '/full')) {
      window.__masterFallbackNavigate(nextPath, { replace });
      return;
    }
    // The master router owns only portfolio transitions while mounted; all of
    // its browser writes are delegated back to the host's single history.
    if (window.__masterRouter && (nextPath === '/' || nextPath === '/full')) {
      window.__masterRouter[replace ? 'replace' : 'push'](nextPath);
      return;
    }
    if (replace) window.history.replaceState({}, '', nextPath);
    else window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  }, []);
  const goHome = useCallback(() => {
    if (path === '/') window.dispatchEvent(new Event('jesper:home'));
    else navigate('/');
  }, [navigate, path]);

  const routeContent = useMemo(() => {
    if (route === 'home' || route === 'full') return null;
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
      {!masterPortfolio && !preloaderDone && <div className="jesper-loader-scope"><Loader progress={progress} leaving={!loading} mobileHome={mobileHomeBoot} painted={loaderPainted} /></div>}
      <div inert={route !== 'home' && loading || undefined} style={{ opacity: route !== 'home' && loading ? 0 : 1 }}>
        <a className="skip-link" href={route === 'home' || route === 'full' ? '#jesper-content' : '#main-content'}>Skip to content</a>
        {masterPortfolio ? <MasterPortfolio range={tablet ? 'tablet' : 'mobile'} onReady={finishLoading} onHistory={() => setPath(readLocation())} /> : (route === 'home' || route === 'full' || !preloaderDone) && <JesperHome active={route === 'home' || route === 'full'} mode={route === 'full' ? 'full' : 'home'} onNavigateView={navigate} onProgress={setProgress} onReady={finishLoading} onLoaderPaint={() => setLoaderPainted(true)} mobileHomeBoot={mobileHomeBoot && !preloaderDone && route === 'home'} ready={!loading} />}
        <div id="main-content">{routeContent}</div>
        <Hud navRouteKey={route} activeKey={activeNav} activePath={path} loading={loading} onNavigate={navigate} onHome={goHome} />
      </div>
    </div>
  );
}
