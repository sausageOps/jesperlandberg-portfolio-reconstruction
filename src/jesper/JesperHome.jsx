import { useCallback, useEffect, useRef, useState } from 'react';
import Experience from './webgl/Experience.js';
import { featured, projects } from './data/projects.js';
import Home from './components/Home.jsx';
import Project from './components/Project.jsx';
import MobileHud from './components/MobileHud.jsx';
import FullIndex from './components/FullIndex.jsx';
import './jesper.css';

// The host keeps its original desktop routing. On phones, the pathname itself
// identifies a project even on a fresh load; history records its entry view.
const selectedProject = () => {
  const mobile = window.matchMedia('(max-width: 649px)').matches;
  const slug = mobile ? window.location.pathname.match(/^\/projects\/([^/]+)\/?$/)?.[1] : null;
  return featured.find((item) => item.slug === (slug || window.history.state?.jesperHomeProject)) || null;
};

export default function JesperHome({ active, mode = 'home', onNavigateView, onProgress, onReady, onLoaderPaint, mobileHomeBoot, ready }) {
  const canvas = useRef(null);
  const [experience, setExperience] = useState(null);
  const [project, setProject] = useState(selectedProject);
  const [transitionFrom, setTransitionFrom] = useState(null);
  const [exitTo, setExitTo] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const callbacks = useRef({ onProgress, onReady, onLoaderPaint });
  callbacks.current = { onProgress, onReady, onLoaderPaint };

  useEffect(() => {
    const instance = new Experience(canvas.current, {
      onProgress: (value) => callbacks.current.onProgress(value),
      onReady: () => callbacks.current.onReady(),
      onLoaderPaint: () => callbacks.current.onLoaderPaint?.(),
      mobileHomeBoot,
    });
    setExperience(instance);
    instance.init({ projects, featured });
    return () => instance.destroy();
  }, []);

  useEffect(() => {
    if (experience) experience.setRoute(active ? (project ? 'project' : mode) : 'inactive', project);
  }, [experience, active, project, mode]);

  useEffect(() => {
    if (!active || !window.matchMedia('(max-width: 649px)').matches) return undefined;
    // Let the host's route title update settle on a fresh direct load first.
    const timer = window.setTimeout(() => { document.title = project?.title || (mode === 'full' ? 'Index — Jesper Landberg' : 'Jesper Landberg'); }, 0);
    return () => window.clearTimeout(timer);
  }, [active, mode, project]);

  // The island stays mounted while switching Full and Featured. An A24 Home
  // navigation creates a fresh history entry, so discard a Full project that
  // would otherwise remain visible over the newly selected homepage. A pop to
  // a project entry must retain that entry's selection instead.
  useEffect(() => {
    if (selectedProject()) return;
    setProject(null);
    setTransitionFrom(null);
    setExitTo(null);
  }, [mode]);

  const openProject = useCallback((slug, rect) => {
    const selected = featured.find((item) => item.slug === slug);
    if (!selected) return;
    const url = window.matchMedia('(max-width: 649px)').matches ? `/projects/${slug}` : window.location.href;
    window.history.pushState({ ...window.history.state, jesperHomeProject: slug }, '', url);
    setExitTo(null);
    setTransitionFrom(rect ? { ...rect, image: selected.asset } : null);
    setProject(selected);
  }, []);

  const openFullProject = useCallback((slug, sourceTitleRect) => {
    const selected = featured.find((item) => item.slug === slug);
    if (!selected) return;
    window.history.pushState({ ...window.history.state, jesperHomeProject: slug, jesperFullOrigin: true }, '', `/projects/${slug}`);
    setExitTo(null);
    setTransitionFrom({ fromFull: true, sourceTitleRect });
    setProject(selected);
  }, []);

  const finishClose = useCallback(() => {
    const state = window.history.state || {};
    const isMobileProject = window.matchMedia('(max-width: 649px)').matches && /^\/projects\//.test(window.location.pathname);
    if (state.jesperFullOrigin && isMobileProject) {
      // Full projects still close to Featured in the reference. Use the host
      // navigation so its route state changes alongside the URL; the project
      // entry remains in history for Back and Forward.
      onNavigateView('/');
    } else if (isMobileProject || (state.jesperHomeProject && (window.location.pathname === '/' || state.jesperFullOrigin))) {
      const { jesperHomeProject, jesperFullOrigin, ...rest } = state;
      window.history.pushState(rest, '', jesperFullOrigin ? '/full' : '/');
    }
    setExitTo(null);
    setTransitionFrom(null);
    setProject(null);
  }, [onNavigateView]);

  const closeProject = useCallback(() => {
    if (exitTo || !project) return;
    experience?.cancelProjectScrub();
    if (mode === 'full' || experience?.reducedMotion || !experience?.webgl) return finishClose();
    const rect = experience.getCenteredCardRect(project.slug);
    if (!rect) return finishClose();
    setExitTo(rect);
    experience.startProjectClose(rect, finishClose);
  }, [project, experience, exitTo, finishClose, mode]);

  const navigateProject = useCallback((slug, direction, sourceRect = null) => {
    if (exitTo) return;
    const selected = featured.find((item) => item.slug === slug);
    if (!selected) return;
    experience?.prepareProjectNavigation();
    const url = window.matchMedia('(max-width: 649px)').matches ? `/projects/${slug}` : window.location.href;
    window.history.pushState({ ...window.history.state, jesperHomeProject: slug }, '', url);
    setTransitionFrom({ direction, ...(sourceRect ? { sourceRect } : {}) });
    setExitTo(null);
    setProject(selected);
  }, [experience, exitTo]);

  useEffect(() => {
    if (experience) experience.callbacks.onProjectNavigate = navigateProject;
  }, [experience, navigateProject]);

  useEffect(() => {
    const pop = () => {
      if (window.location.pathname !== '/' && window.location.pathname !== '/full' && !/^\/projects\//.test(window.location.pathname)) return;
      const selected = selectedProject();
      setProject(selected);
      setTransitionFrom(null);
      setExitTo(null);
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  useEffect(() => {
    const home = () => { if (project) closeProject(); };
    const keydown = (event) => {
      if (!active || !project) return;
      if (event.key === 'Escape') return closeProject();
      const tag = event.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.target.isContentEditable) return;
      if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.repeat && !exitTo && experience?.projectDrag?.axis !== 'x') {
        event.preventDefault();
        const index = featured.findIndex((item) => item.slug === project.slug);
        const offset = event.key === 'ArrowRight' ? 1 : -1;
        navigateProject(featured[(index + offset + featured.length) % featured.length].slug, offset > 0 ? 'next' : 'previous');
      }
    };
    window.addEventListener('jesper:home', home);
    window.addEventListener('keydown', keydown);
    return () => { window.removeEventListener('jesper:home', home); window.removeEventListener('keydown', keydown); };
  }, [active, project, closeProject, navigateProject, exitTo, experience]);

  return (
    <div className={`jesper-scope${active ? '' : ' is-inactive'}`}>
      <canvas ref={canvas} className="webgl-canvas" aria-hidden="true" />
      {active && (project ? (
        <div className="jesper-project-layer" id="jesper-content" tabIndex={-1}>
          <Project project={project} featured={featured} experience={experience} transitionFrom={transitionFrom} exitTo={exitTo} onClose={closeProject} onNavigate={navigateProject} avoidDock />
        </div>
      ) : mode === 'full' ? <FullIndex experience={experience} ready={ready} onOpen={openFullProject} inert={profileOpen} /> : <Home experience={experience} onOpen={openProject} inert={profileOpen} />)}
      {active && !project && ready && <MobileHud experience={experience} ready={ready} mode={mode} onNavigateView={onNavigateView} onOpenChange={setProfileOpen} />}
    </div>
  );
}
