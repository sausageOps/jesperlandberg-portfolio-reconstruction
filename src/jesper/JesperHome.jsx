import { useCallback, useEffect, useRef, useState } from 'react';
import Experience from './webgl/Experience.js';
import { featured, projects } from './data/projects.js';
import Home from './components/Home.jsx';
import Project from './components/Project.jsx';
import './jesper.css';

// Keep the reference experience inside the existing app. Project details are
// local to this island because the host deliberately redirects /projects/*.
export default function JesperHome({ active, onProgress, onReady }) {
  const canvas = useRef(null);
  const [experience, setExperience] = useState(null);
  const [project, setProject] = useState(() => featured.find((item) => item.slug === window.history.state?.jesperHomeProject) || null);
  const [transitionFrom, setTransitionFrom] = useState(null);
  const [exitTo, setExitTo] = useState(null);
  const callbacks = useRef({ onProgress, onReady });
  callbacks.current = { onProgress, onReady };

  useEffect(() => {
    const instance = new Experience(canvas.current, {
      onProgress: (value) => callbacks.current.onProgress(value),
      onReady: () => callbacks.current.onReady(),
    });
    setExperience(instance);
    instance.init({ projects, featured });
    return () => instance.destroy();
  }, []);

  useEffect(() => {
    if (experience) experience.setRoute(active ? (project ? 'project' : 'home') : 'inactive', project);
  }, [experience, active, project]);

  const openProject = useCallback((slug, rect) => {
    const selected = featured.find((item) => item.slug === slug);
    if (!selected) return;
    window.history.pushState({ ...window.history.state, jesperHomeProject: slug }, '', window.location.href);
    setExitTo(null);
    setTransitionFrom(rect ? { ...rect, image: selected.asset } : null);
    setProject(selected);
  }, []);

  const finishClose = useCallback(() => {
    if (window.location.pathname === '/' && window.history.state?.jesperHomeProject) {
      const { jesperHomeProject, ...state } = window.history.state;
      window.history.pushState(state, '', window.location.href);
    }
    setExitTo(null);
    setTransitionFrom(null);
    setProject(null);
  }, []);

  const closeProject = useCallback(() => {
    if (exitTo || !project) return;
    experience?.cancelProjectScrub();
    if (experience?.reducedMotion || !experience?.webgl) return finishClose();
    const rect = experience.getCenteredCardRect(project.slug);
    if (!rect) return finishClose();
    setExitTo(rect);
    experience.startProjectClose(rect, finishClose);
  }, [project, experience, exitTo, finishClose]);

  const navigateProject = useCallback((slug, direction, sourceRect = null) => {
    if (exitTo) return;
    const selected = featured.find((item) => item.slug === slug);
    if (!selected) return;
    experience?.prepareProjectNavigation();
    window.history.pushState({ ...window.history.state, jesperHomeProject: slug }, '', window.location.href);
    setTransitionFrom({ direction, ...(sourceRect ? { sourceRect } : {}) });
    setExitTo(null);
    setProject(selected);
  }, [experience, exitTo]);

  useEffect(() => {
    if (experience) experience.callbacks.onProjectNavigate = navigateProject;
  }, [experience, navigateProject]);

  useEffect(() => {
    const pop = () => {
      if (window.location.pathname !== '/') return;
      const selected = featured.find((item) => item.slug === window.history.state?.jesperHomeProject) || null;
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
        <div className="jesper-project-layer">
          <Project project={project} featured={featured} experience={experience} transitionFrom={transitionFrom} exitTo={exitTo} onClose={closeProject} onNavigate={navigateProject} />
        </div>
      ) : <Home experience={experience} onOpen={openProject} />)}
    </div>
  );
}
