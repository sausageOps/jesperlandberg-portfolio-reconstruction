import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';

function ArrowIcon({ cross = false }) {
  return cross ? (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
  ) : (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" /></svg>
  );
}

export default function Project({ project, featured, experience, transitionFrom, exitTo, onClose, onNavigate }) {
  const panel = useRef(null);
  const viewport = useRef(null);
  const media = useRef([]);
  const awards = useRef([]);
  const pills = useRef([]);
  const progress = useRef(null);
  const content = useRef(null);
  const [portalRoot, setPortalRoot] = useState(null);
  const index = featured.findIndex((item) => item.slug === project.slug);
  const previous = featured[(index - 1 + featured.length) % featured.length];
  const next = featured[(index + 1) % featured.length];

  useEffect(() => {
    setPortalRoot(document.querySelector('.app'));
  }, []);

  useEffect(() => {
    if (!experience) return;
    experience.registerProject({
      project,
      panel: panel.current,
      viewport: viewport.current,
      media: media.current.filter(Boolean),
      awards: awards.current.filter(Boolean),
      progress: progress.current,
      pills: pills.current.filter(Boolean),
      transitionFrom,
    });
  }, [experience, project]);

  useEffect(() => {
    if (!experience) return undefined;
    return () => experience.cleanupProject();
  }, [experience]);

  useLayoutEffect(() => {
    if (!panel.current || !content.current) return;
    const element = panel.current;
    const reduced = experience?.reducedMotion;
    const ctx = gsap.context(() => {
      gsap.set(content.current, { opacity: 0 });
      gsap.to(content.current, {
        opacity: 1,
        duration: reduced ? 0 : transitionFrom ? 0.6 : 0.65,
        delay: reduced || !transitionFrom ? 0 : 0.35,
        ease: 'power1.out',
      });
      gsap.fromTo('.project-copy > *', { y: reduced ? 0 : 18 }, {
        y: 0,
        duration: reduced ? 0 : 1,
        delay: reduced ? 0 : 0.25,
        stagger: 0.075,
        ease: 'expo.out',
      });
    }, element);
    return () => ctx.revert();
  }, [project, experience]);

  useLayoutEffect(() => {
    if (!exitTo || !content.current) return;
    const ctx = gsap.context(() => {
      gsap.to(content.current, { opacity: 0, duration: 0.25, ease: 'power1.out' });
      gsap.to('.project-close, .project-progress', { opacity: 0, duration: 0.2, ease: 'power1.out' });
    }, panel.current);
    const portal = document.querySelector('.project-close-portal');
    if (portal) gsap.to(portal, { opacity: 0, duration: 0.2, ease: 'power1.out' });
    return () => ctx.revert();
  }, [exitTo]);

  const pillEvents = (index) => ({
    onPointerEnter: (event) => experience?.hoverProjectPill(index, true, event),
    onPointerMove: (event) => experience?.moveProjectPill(index, event),
    onPointerLeave: (event) => experience?.hoverProjectPill(index, false, event),
    onPointerCancel: (event) => experience?.hoverProjectPill(index, false, event),
  });

  return (
    <main className="project-page route-layer" aria-label={`${project.title} project`}>
      <button
        className="related-sheet related-previous"
        aria-label={`Previous project: ${previous.title}`}
        onClick={() => onNavigate(previous.slug, 'previous')}
        onPointerEnter={() => experience?.hoverProjectSurface(previous.slug, true)}
        onPointerLeave={() => experience?.hoverProjectSurface(previous.slug, false)}
        onPointerCancel={() => experience?.hoverProjectSurface(previous.slug, false)}
      ><span className="related-background" aria-hidden="true" /></button>
      <button
        className="related-sheet related-next"
        aria-label={`Next project: ${next.title}`}
        onClick={() => onNavigate(next.slug, 'next')}
        onPointerEnter={() => experience?.hoverProjectSurface(next.slug, true)}
        onPointerLeave={() => experience?.hoverProjectSurface(next.slug, false)}
        onPointerCancel={() => experience?.hoverProjectSurface(next.slug, false)}
      ><span className="related-background" aria-hidden="true" /></button>
      <div className="project-background" aria-hidden="true" />
      <section ref={panel} className="project-sheet" aria-label={project.title}>
        <div ref={content} className="project-content">
          <div className="project-copy">
            <h1>{project.title}</h1>
            <div className="project-description">{project.description}</div>
            {(project.tags?.length || project.link || project.awards) && (
              <div className="project-meta">
                {project.link && (
                  <a
                    className="pill pill-round"
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${project.title}`}
                    ref={(element) => { pills.current[0] = element; }}
                    {...pillEvents(0)}
                  >
                    <ArrowIcon />
                  </a>
                )}
                <div className="project-tags">
                  {project.tags?.map((tag, tagIndex) => {
                    const pillIndex = (project.link ? 1 : 0) + tagIndex;
                    const content = <span className="pill-label">{tag.title}</span>;
                    const ref = (element) => { pills.current[pillIndex] = element; };
                    return tag.url ? (
                      <a className="pill label" key={tag.id} href={tag.url} target="_blank" rel="noopener noreferrer" ref={ref} {...pillEvents(pillIndex)}>{content}</a>
                    ) : (
                      <span className="pill label" key={tag.id} ref={ref}>{content}</span>
                    );
                  })}
                  {project.awards > 0 && (
                    <span className="award-list">
                      <span className="award-placeholder" role="img" aria-label={`${project.awards} awards`} ref={(element) => { awards.current[0] = element; }} />
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div ref={viewport} className="media-viewport" aria-label="Project media">
            <div className="media-track">
              {project.images.map((image, imageIndex) => (
                <div
                  className="project-media"
                  key={`${project.slug}-${imageIndex}`}
                  ref={(element) => { media.current[imageIndex] = element; }}
                  style={{ aspectRatio: `${image.width} / ${image.height}` }}
                >
                  <img src={image.asset} alt={image.alt || `${project.title} project view ${imageIndex + 1}`} loading={imageIndex < 2 ? 'eager' : 'lazy'} draggable={false} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <svg className="project-progress" aria-hidden="true">
          <circle className="progress-track" pathLength="100" />
          <circle ref={progress} className="progress-value" pathLength="100" />
        </svg>
        <button
          className="project-close project-close-inline"
          aria-label="Close project"
          onClick={onClose}
          onPointerEnter={() => experience?.hoverProjectClose(true)}
          onPointerLeave={() => experience?.hoverProjectClose(false)}
          onPointerCancel={() => experience?.hoverProjectClose(false)}
        ><ArrowIcon cross /></button>
      </section>
      {portalRoot && createPortal(
        <button
          className="project-close project-close-portal"
          aria-label="Close project"
          onClick={onClose}
          onPointerEnter={() => experience?.hoverProjectClose(true)}
          onPointerLeave={() => experience?.hoverProjectClose(false)}
          onPointerCancel={() => experience?.hoverProjectClose(false)}
        ><ArrowIcon cross /></button>,
        portalRoot,
      )}
    </main>
  );
}
