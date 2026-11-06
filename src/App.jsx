import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Experience from './webgl/Experience.js';
import { featured, projects, site } from './data/projects.js';
import Hud from './components/Hud.jsx';
import Loader from './components/Loader.jsx';
import Home from './components/Home.jsx';
import Project from './components/Project.jsx';
import Section from './components/Section.jsx';
import Contact from './components/contact/Contact.jsx';
import Studio from './components/studio/Studio.jsx';
import { activeTopLevel, formatSegment, resolveSection } from './data/navigation.js';
import { resolveCarterPage } from './carter/routes.js';
import { labDescription } from './carter/data/lab-slugs.js';

const cleanPath = (pathname) => pathname !== '/' ? pathname.replace(/\/+$/, '') : '/';

// The Carter pages (About, Lab, Writing) mount through the shared Carter frame
// (src/carter). It is code-split, so Carter's styles and runtime load only on
// those routes. If the chunk fails to load, the route keeps its placeholder.
const CarterRoute = lazy(() =>
  import('./carter/CarterRoute.jsx').catch((error) => {
    console.error('[carter] frame failed to load', error);
    return { default: ({ placeholder }) => placeholder };
  }),
);

export default function App() {
  const canvas = useRef(null);
  const [experience, setExperience] = useState(null);
  const [path, setPath] = useState(() => cleanPath(window.location.pathname));
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaderMounted, setLoaderMounted] = useState(true);
  const [transitionFrom, setTransitionFrom] = useState(null);
  const [exitTo, setExitTo] = useState(null);
  // True once a project close is far enough along for the navigation to come
  // back, so the dock returns with its reveal instead of popping in.
  const [navReturning, setNavReturning] = useState(false);

  const section = useMemo(() => resolveSection(path), [path]);
  const carterPage = useMemo(() => resolveCarterPage(path), [path]);
  const route = path.startsWith('/projects/') ? 'project' : section ? section.menu.key : path === '/' ? 'home' : 'not-found';
  const slug = route === 'project' ? path.split('/')[2] : null;
  const project = featured.find((item) => item.slug === slug) || null;
  const activeNav = activeTopLevel(path);

  useEffect(() => {
    const instance = new Experience(canvas.current, {
      onProgress: setProgress,
      onReady: () => {
        setLoading(false);
        window.setTimeout(() => setLoaderMounted(false), 650);
      },
    });
    setExperience(instance);
    instance.init({ projects, featured });
    return () => instance.destroy();
  }, []);

  useEffect(() => {
    const pop = () => {
      experience?.cancelProjectScrub();
      setPath(cleanPath(window.location.pathname));
      setTransitionFrom(null);
      setExitTo(null);
      setNavReturning(false);
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [experience]);

  useEffect(() => {
    if (!experience) return;
    experience.setRoute(route === 'project' && !project ? 'not-found' : route, project);
  }, [experience, route, project]);

  // Carter's Lab and Writing documents carry their own document title and
  // description (`${item.name} :: Lab` in lab/[slug].astro, `${post.title} :: Writing`
  // in writing/[slug].astro). Top-level section routes keep Jesper's `Title — Menu`
  // convention while carrying Carter's section meta description when defined.
  useEffect(() => {
    document.title = route === 'project' && project
      ? project.title
      : carterPage?.key === 'lab-detail'
        ? `${carterPage.label} :: Lab`
        : carterPage?.key === 'writing-post'
          ? `${carterPage.label} :: Writing`
          : section
            ? section.item ? `${section.item.title} — ${section.menu.label}` : section.menu.label
            : site.name;
  }, [route, project, section, carterPage]);

  useEffect(() => {
    const text =
      carterPage?.key === 'lab-detail'
        ? labDescription(carterPage.slug)
        : carterPage?.description || null;
    if (!text) return undefined;
    const description = document.querySelector('meta[name="description"]');
    if (!description) return undefined;
    const previous = description.getAttribute('content');
    description.setAttribute('content', text);
    return () => {
      if (previous != null) description.setAttribute('content', previous);
    };
  }, [carterPage]);

  const navigate = useCallback((to, { replace = false } = {}) => {
    const nextPath = cleanPath(to);
    if (replace) window.history.replaceState({}, '', nextPath);
    else window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  }, []);

  const openProject = useCallback((nextSlug, rect) => {
    const selected = featured.find((item) => item.slug === nextSlug);
    let transition = null;
    if (rect) transition = { ...rect, image: selected?.asset };
    setExitTo(null);
    setTransitionFrom(transition);
    navigate(`/projects/${nextSlug}`);
  }, [navigate]);

  const finishClose = useCallback(() => {
    setExitTo(null);
    setNavReturning(false);
    setTransitionFrom(null);
    navigate('/');
  }, [navigate]);

  // The panel's flight home runs for 1s and is mostly settled by ~0.4s, so the
  // navigation returns just after that while the panel finishes landing.
  const NAV_RETURN_DELAY = 450;

  const closeProject = useCallback(() => {
    if (exitTo) return;
    if (!project) return navigate('/');
    experience?.cancelProjectScrub();
    if (experience?.reducedMotion || !experience?.webgl) return finishClose();
    const rect = experience?.getCenteredCardRect(project.slug);
    if (!rect) return finishClose();
    setExitTo(rect);
    experience.startProjectClose(rect, finishClose);
  }, [project, experience, exitTo, finishClose, navigate]);

  const navigateProject = useCallback((nextSlug, direction, sourceRect = null) => {
    if (exitTo) return;
    experience?.prepareProjectNavigation();
    setTransitionFrom({ direction, ...(sourceRect ? { sourceRect } : {}) });
    setExitTo(null);
    navigate(`/projects/${nextSlug}`);
  }, [experience, exitTo, navigate]);

  // Hand the navigation back part-way through the panel's flight home, so the
  // dock returns with its reveal instead of popping in behind the panel.
  useEffect(() => {
    if (!exitTo) return undefined;
    const timer = window.setTimeout(() => setNavReturning(true), NAV_RETURN_DELAY);
    return () => { window.clearTimeout(timer); setNavReturning(false); };
  }, [exitTo]);

  useEffect(() => {
    if (experience) experience.callbacks.onProjectNavigate = navigateProject;
  }, [experience, navigateProject]);

  const goHome = useCallback(() => {
    setTransitionFrom(null);
    setExitTo(null);
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    const keydown = (event) => {
      if (event.key === 'Escape') {
        if (route === 'project') closeProject();
        return;
      }
      const tag = event.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.target.isContentEditable) return;
      if (route === 'project' && project && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.repeat || exitTo || experience?.projectDrag?.axis === 'x') return;
        event.preventDefault();
        const index = featured.findIndex((item) => item.slug === project.slug);
        const offset = event.key === 'ArrowRight' ? 1 : -1;
        const target = featured[(index + offset + featured.length) % featured.length];
        navigateProject(target.slug, offset > 0 ? 'next' : 'previous');
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [route, project, exitTo, experience, closeProject, navigateProject]);

  const routeContent = useMemo(() => {
    if (route === 'home') return <Home experience={experience} onOpen={openProject} />;
    if (route === 'myself' && section.item?.slug === 'contact') return <Contact appReady={!loading} />;
    // Studio lives in the Routes menu group: /routes/studio (nav source of truth).
    if (route === 'routes' && section.item?.slug === 'studio') return <Studio appReady={!loading} />;
    // Carter pages (src/carter/routes.js) mount inside the shared Carter frame.
    // A page that is not ported yet renders its section placeholder inside it.
    if (carterPage && section) {
      const placeholder = (
        <Section
          menu={section.menu}
          item={section.item}
          subtitle={section.nested ? formatSegment(section.nested) : undefined}
        />
      );
      return (
        <Suspense fallback={null}>
          <CarterRoute page={carterPage} appReady={!loading} onNavigate={navigate} placeholder={placeholder} />
        </Suspense>
      );
    }
    // Nested section routes (e.g. /routes/writing/the-personal-starter) resolve to the
    // same placeholder until their page is ported. The section item still supplies the
    // heading; the trailing segment is shown beneath it so the URL is identifiable.
    if (section?.nested) return <Section menu={section.menu} item={section.item} subtitle={formatSegment(section.nested)} />;
    if (route === 'routes' || route === 'myself') return <Section menu={section.menu} item={section.item} />;
    if (route === 'project' && project) {
      return (
        <Project
          project={project}
          featured={featured}
          experience={experience}
          transitionFrom={transitionFrom}
          exitTo={exitTo}
          onClose={closeProject}
          onNavigate={navigateProject}
          onExitDone={finishClose}
        />
      );
    }
    return <main className="not-found"><h1 className="sr-only">Page not found</h1></main>;
  }, [route, section, carterPage, project, experience, transitionFrom, exitTo, openProject, closeProject, navigateProject, finishClose, loading, navigate]);

  // The letter desk, the lanyard stage and the Carter frame are their own opaque
  // surfaces. These route classes lift the DOM above the WebGL canvas with the
  // same pattern project routes already use. Studio is reached via /routes/studio.
  const routeClass = carterPage
    ? ' route-carter'
    : (route === 'myself' && section?.item?.slug === 'contact') ||
        (route === 'routes' && section?.item?.slug === 'studio')
      ? ` route-${section.item.slug}`
      : '';

  return (
    <div className={`app route-${route}${routeClass}`}>
      <div inert={loaderMounted || undefined} style={{ opacity: loading ? 0 : 1 }}>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <canvas ref={canvas} className="webgl-canvas" aria-hidden="true" />
        <div id="main-content">{routeContent}</div>
        <Hud
          route={route}
          navReturning={navReturning}
          navRouteKey={route === 'project' ? path : route}
          activeKey={activeNav}
          activePath={path}
          loading={loading}
          onNavigate={navigate}
          onHome={goHome}
        />
        <div className="sr-only" aria-live="polite">{route === 'project' && project ? `${project.title} project` : 'Featured projects'}</div>
      </div>
      {loaderMounted && <Loader progress={progress} leaving={!loading} />}
    </div>
  );
}
