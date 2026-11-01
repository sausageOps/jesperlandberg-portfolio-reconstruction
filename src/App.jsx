import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Experience from './webgl/Experience.js';
import { featured, projects, site } from './data/projects.js';
import Hud from './components/Hud.jsx';
import Loader from './components/Loader.jsx';
import Home from './components/Home.jsx';
import FullIndex from './components/FullIndex.jsx';
import Project from './components/Project.jsx';
import Overlays from './components/Overlays.jsx';

const cleanPath = (pathname) => pathname !== '/' ? pathname.replace(/\/+$/, '') : '/';

export default function App() {
  const canvas = useRef(null);
  const [experience, setExperience] = useState(null);
  const [path, setPath] = useState(() => cleanPath(window.location.pathname));
  const [profile, setProfile] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaderMounted, setLoaderMounted] = useState(true);
  const [transitionFrom, setTransitionFrom] = useState(null);
  const [exitTo, setExitTo] = useState(null);

  const route = path === '/full' ? 'full' : path.startsWith('/projects/') ? 'project' : path === '/' || path === '/newsletter' ? 'home' : 'not-found';
  const slug = route === 'project' ? path.split('/')[2] : null;
  const project = featured.find((item) => item.slug === slug) || null;
  const overlay = profile ? 'profile' : path === '/newsletter' ? 'newsletter' : null;

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
      setProfile(false);
      setTransitionFrom(null);
      setExitTo(null);
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [experience]);

  useEffect(() => {
    if (!experience) return;
    experience.setRoute(route === 'project' && !project ? 'not-found' : route, project);
  }, [experience, route, project]);

  useEffect(() => {
    if (!experience) return;
    experience.setOverlay(loading ? null : overlay);
    document.documentElement.classList.toggle('overlay-open', Boolean(overlay));
  }, [experience, overlay, loading]);

  useEffect(() => {
    document.title = route === 'project' && project
      ? project.title
      : route === 'full'
        ? 'Index'
        : path === '/newsletter'
          ? 'Newsletter'
          : site.name;
  }, [route, project, path]);

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
    else if (path === '/full') {
      const size = Math.min(window.innerWidth, window.innerHeight) * 0.05;
      const left = (window.innerWidth - size) / 2;
      const top = (window.innerHeight - size) / 2;
      transition = {
        x: left,
        y: top,
        left,
        top,
        width: size,
        height: size,
        blast: true,
      };
    }
    setProfile(false);
    setExitTo(null);
    setTransitionFrom(transition);
    navigate(`/projects/${nextSlug}`);
  }, [navigate, path]);

  const finishClose = useCallback(() => {
    setExitTo(null);
    setTransitionFrom(null);
    navigate('/');
  }, [navigate]);

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

  useEffect(() => {
    if (experience) experience.callbacks.onProjectNavigate = navigateProject;
  }, [experience, navigateProject]);

  const closeOverlay = useCallback(() => {
    if (profile) setProfile(false);
    else if (path === '/newsletter') navigate('/', { replace: true });
  }, [profile, path, navigate]);

  const openProfile = useCallback(() => {
    if (profile) return setProfile(false);
    if (path === '/newsletter') navigate('/', { replace: true });
    setProfile(true);
  }, [profile, path, navigate]);

  const openNewsletter = useCallback(() => {
    if (path === '/newsletter' && !profile) return closeOverlay();
    setProfile(false);
    navigate('/newsletter');
  }, [path, profile, navigate, closeOverlay]);

  const goHome = useCallback(() => {
    setProfile(false);
    setTransitionFrom(null);
    setExitTo(null);
    navigate('/');
  }, [navigate]);

  const goFull = useCallback(() => {
    setProfile(false);
    if (path === '/newsletter') navigate('/', { replace: true });
    navigate('/full');
  }, [path, navigate]);

  useEffect(() => {
    const keydown = (event) => {
      if (event.key === 'Escape') {
        if (overlay) closeOverlay();
        else if (route === 'project') closeProject();
        return;
      }
      const tag = event.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.target.isContentEditable || overlay) return;
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
  }, [overlay, route, project, exitTo, experience, closeOverlay, closeProject, navigateProject]);

  const routeContent = useMemo(() => {
    if (route === 'home') return <Home experience={experience} onOpen={openProject} />;
    if (route === 'full') return <FullIndex onOpen={openProject} />;
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
  }, [route, project, experience, transitionFrom, exitTo, openProject, closeProject, navigateProject, finishClose]);

  return (
    <div className={`app route-${route} ${overlay ? 'has-overlay' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <canvas ref={canvas} className="webgl-canvas" aria-hidden="true" />
      <div id="main-content">{routeContent}</div>
      <Hud
        route={route}
        overlay={overlay}
        onHome={goHome}
        onFull={goFull}
        onProfile={openProfile}
        onNewsletter={openNewsletter}
      />
      <Overlays type={loading ? null : overlay} onClose={closeOverlay} />
      {loaderMounted && <Loader progress={progress} leaving={!loading} />}
      <div className="sr-only" aria-live="polite">{route === 'project' && project ? `${project.title} project` : route === 'full' ? 'Full project index' : 'Featured projects'}</div>
    </div>
  );
}
