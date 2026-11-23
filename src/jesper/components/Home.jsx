import { useEffect, useRef } from 'react';
import { featured, site } from '../data/projects.js';

export default function Home({ experience, onOpen }) {
  const cards = useRef([]);

  useEffect(() => {
    if (!experience) return;
    experience.registerHome(cards.current.filter(Boolean));
  }, [experience]);

  return (
    <main id="jesper-content" tabIndex={-1} className="home route-layer" aria-label="Featured work">
      <div className="sr-only">
        <h1>{site.name} — {site.role.toLowerCase()}</h1>
        <p>{site.summary}</p>
        <p>{site.about}</p>
        <p>{site.awards}.</p>
        <h2>Featured work</h2>
        <ul>
          {featured.map((project) => (
            <li key={`readable-${project.slug}`}><a href={`/projects/${project.slug}`}>{project.title}</a> — {project.description}</li>
          ))}
        </ul>
      </div>
      <div className="card-run" aria-label="Featured project carousel">
        {featured.map((project, index) => (
          <a
            key={project.slug}
            ref={(element) => { cards.current[index] = element; }}
            href={`/projects/${project.slug}`}
            className="home-card"
            data-slug={project.slug}
            draggable={false}
            aria-label={`Open ${project.title} project`}
            style={{ '--card-image': `url("${project.asset}")`, '--card-ratio': `${project.width} / ${project.height}` }}
            onPointerEnter={() => experience?.hoverCard(project.slug, true)}
            onPointerLeave={() => experience?.hoverCard(project.slug, false)}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onOpen(project.slug, experience?.getCardRect(project.slug));
            }}
          >
            <span className="home-card-title">{project.title}</span>
            <span className="home-card-arrow" aria-hidden="true">→</span>
          </a>
        ))}
      </div>
    </main>
  );
}
