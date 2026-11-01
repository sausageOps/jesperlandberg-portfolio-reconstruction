import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { projects, site } from '../data/projects.js';

const FOLLOW = 10;
const MORPH = 9;
const JELLY = 8;
const damp = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));

function roundedRectPoints(x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r < 0.01) return [
    { x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height },
  ];
  const points = [{ x: x + r, y }];
  const segments = 6;
  const corners = [
    [x + width - r, y + r, -Math.PI / 2],
    [x + width - r, y + height - r, 0],
    [x + r, y + height - r, Math.PI / 2],
    [x + r, y + r, Math.PI],
  ];
  corners.forEach(([cx, cy, start]) => {
    for (let step = 0; step <= segments; step += 1) {
      const angle = start + (step / segments) * (Math.PI / 2);
      points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
  });
  return points;
}

export default function FullIndex({ onOpen }) {
  const root = useRef(null);
  const preview = useRef(null);
  const imageA = useRef(null);
  const imageB = useRef(null);
  const shade = useRef(null);
  const previewState = useRef({ r: 0, presence: 0, visible: false });

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.index-item', { yPercent: 230 }, {
        yPercent: 0,
        duration: 1.1,
        delay: (index) => Math.min(index * 0.03, 0.55),
        ease: 'expo.out',
      });
      gsap.fromTo('.index-dot', { scale: 0, xPercent: -50, yPercent: -50 }, {
        scale: 1,
        xPercent: -50,
        yPercent: -50,
        duration: 0.5,
        delay: (index) => 0.4 + Math.min(index * 0.03, 0.55),
        ease: 'back.out(1.7)',
        onComplete: () => root.current?.classList.add('has-entered'),
      });
    }, root);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const updateSeparators = () => {
      const entries = [...(root.current?.querySelectorAll('.index-entry') || [])];
      entries.forEach((entry, index) => {
        const dot = entry.querySelector('.index-dot');
        const next = entries[index + 1];
        if (!dot || !next) return;
        const currentRect = entry.getBoundingClientRect();
        const nextRect = next.getBoundingClientRect();
        dot.style.visibility = Math.abs(currentRect.top - nextRect.top) < currentRect.height / 2 ? 'visible' : 'hidden';
      });
    };
    updateSeparators();
    document.fonts?.ready.then(updateSeparators);
    window.addEventListener('resize', updateSeparators);
    return () => window.removeEventListener('resize', updateSeparators);
  }, []);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)');
    if (!finePointer.matches || !preview.current) return undefined;

    const panel = preview.current;
    const firstImage = imageA.current;
    const secondImage = imageB.current;
    const shadeElement = shade.current;
    const links = [...root.current.querySelectorAll('.index-link-wrap')];
    const dims = links.map(() => 1);
    const repelOffsets = links.map(() => ({ x: 0, y: 0 }));
    const maskUrls = links.map(() => '');
    const pointer = { x: null, y: null };
    const fade = { v: 0 };
    const presence = { v: 0 };
    const state = previewState.current;
    let rectangles = [];
    let cloud = null;
    let hovered = 0;
    let itemA = null;
    let itemB = null;
    let raf;
    let lastTime = performance.now();
    let x = null;
    let y = null;
    let lastPlaced = null;
    let aspect = null;
    let velocity = null;
    let reveal = 0;
    let avoid = 0;
    let shadeY = null;
    let swapTween;

    const measure = () => {
      rectangles = links.map((link) => link.getBoundingClientRect());
      if (!rectangles.length) return;
      cloud = rectangles.reduce((box, rect) => ({
        left: Math.min(box.left, rect.left),
        top: Math.min(box.top, rect.top),
        right: Math.max(box.right, rect.right),
        bottom: Math.max(box.bottom, rect.bottom),
      }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    };

    const setImage = (image, project) => {
      if (!image || !project) return;
      const source = project.asset;
      if (image.getAttribute('src') !== source) image.src = source;
    };

    const swap = (project) => {
      if (!project) return;
      if (!itemA) {
        itemA = project;
        itemB = null;
        fade.v = 0;
        setImage(firstImage, itemA);
        return;
      }
      const shown = fade.v > 0.5 && itemB ? itemB : itemA;
      if (project.slug === shown.slug) return;
      if (itemB) {
        itemA = itemB;
        setImage(firstImage, itemA);
      }
      itemB = project;
      setImage(secondImage, itemB);
      fade.v = 0;
      swapTween?.kill();
      swapTween = gsap.to(fade, { v: 1, duration: 0.35, ease: 'power1.out', overwrite: true });
    };

    const move = (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    const setMask = (index, url = '') => {
      if (maskUrls[index] === url) return;
      maskUrls[index] = url;
      links[index].style.maskImage = url || 'none';
    };

    const clearMasks = () => links.forEach((_, index) => setMask(index));

    const updateMasks = (width, height, rootSize) => {
      const visibleWidth = width * reveal;
      const visibleHeight = height * reveal;
      if (visibleWidth <= 0 || visibleHeight <= 0) return clearMasks();
      const shape = roundedRectPoints(
        (width - visibleWidth) / 2,
        (height - visibleHeight) / 2,
        visibleWidth,
        visibleHeight,
        2 * rootSize * reveal,
      );
      const matrix = new DOMMatrix(getComputedStyle(panel).transform);
      const origin = { x: width / 2, y: height / 2 };
      const projected = shape.map((point) => {
        const transformed = new DOMPoint(point.x - origin.x, point.y - origin.y).matrixTransform(matrix);
        const w = transformed.w || 1;
        return {
          x: transformed.x / w + origin.x,
          y: transformed.y / w + origin.y,
        };
      });
      const bounds = projected.reduce((box, point) => ({
        left: Math.min(box.left, point.x),
        top: Math.min(box.top, point.y),
        right: Math.max(box.right, point.x),
        bottom: Math.max(box.bottom, point.y),
      }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });

      links.forEach((link, index) => {
        const rect = rectangles[index];
        if (!rect || dims[index] > 0.9995) return setMask(index);
        const offset = repelOffsets[index];
        const left = rect.left + offset.x;
        const top = rect.top + offset.y;
        if (bounds.right <= left || bounds.left >= left + rect.width || bounds.bottom <= top || bounds.top >= top + rect.height) {
          return setMask(index);
        }
        const path = projected.map((point, pointIndex) => {
          const x = (point.x - left).toFixed(2);
          const y = (point.y - top).toFixed(2);
          return `${pointIndex ? 'L' : 'M'}${x} ${y}`;
        }).join(' ') + ' Z';
        const w = rect.width.toFixed(3);
        const h = rect.height.toFixed(3);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path fill="white" fill-rule="evenodd" d="M0 0H${w}V${h}H0Z ${path}"/><path fill="white" fill-opacity="${dims[index].toFixed(4)}" d="${path}"/></svg>`;
        setMask(index, `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
      });
    };

    const render = (now) => {
      raf = requestAnimationFrame(render);
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
      const height = panel.offsetHeight;
      let target = 0;
      if (cloud && pointer.x != null) {
        const dx = Math.max(cloud.left - pointer.x, 0, pointer.x - cloud.right);
        const dy = Math.max(cloud.top - pointer.y, 0, pointer.y - cloud.bottom);
        const distance = Math.min(Math.hypot(dx, dy) / (14 * rootSize), 1);
        target = 1 - distance * distance * (3 - 2 * distance);
      }
      reveal = damp(reveal, target, FOLLOW, dt);
      const visible = presence.v * reveal > 0.001 && rectangles.length > 0;
      state.r = reveal;
      state.presence = presence.v;
      state.visible = visible;
      panel.style.visibility = visible ? 'visible' : 'hidden';
      avoid = damp(avoid, presence.v * reveal, FOLLOW, dt);
      links.forEach((_, index) => {
        dims[index] = damp(dims[index], index === hovered ? 1 : 0.1, FOLLOW, dt);
      });
      if (avoid > 0.0005 && x != null && y != null) {
        const fieldWidth = panel.offsetWidth;
        links.forEach((link, index) => {
          const rect = rectangles[index];
          if (!rect) return;
          const dx = rect.left + rect.width / 2 - x;
          const dy = rect.top + rect.height / 2 - y;
          const distance = Math.max(Math.hypot(dx / (fieldWidth / 2 || 1), dy / (height / 2 || 1)), 0.001);
          const force = 0.4 * Math.exp(-distance / 0.9) * avoid;
          const offsetX = dx * force;
          const offsetY = dy * force;
          repelOffsets[index].x = offsetX;
          repelOffsets[index].y = offsetY;
          link.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
        });
      } else links.forEach((link, index) => {
        link.style.transform = '';
        repelOffsets[index].x = 0;
        repelOffsets[index].y = 0;
      });
      if (!visible || !height) {
        velocity = null;
        clearMasks();
        return;
      }

      swap(projects[Math.min(projects.length - 1, Math.max(0, hovered))]);
      const nextAspect = (itemB || itemA).width / (itemB || itemA).height;
      aspect = aspect == null ? nextAspect : damp(aspect, nextAspect, MORPH, dt);
      const width = height * aspect;
      x = x == null ? pointer.x : damp(x, pointer.x, FOLLOW, dt);
      y = y == null ? pointer.y : damp(y, pointer.y, FOLLOW, dt);
      const left = x - width / 2;
      const top = y - height / 2;

      if (velocity && lastPlaced) {
        velocity.x = damp(velocity.x, (x - lastPlaced.x) / dt / rootSize, JELLY, dt);
        velocity.y = damp(velocity.y, (y - lastPlaced.y) / dt / rootSize, JELLY, dt);
      } else velocity = { x: 0, y: 0 };
      lastPlaced = { x, y };
      const direction = pointer.x < window.innerWidth / 2 ? 1 : -1;
      const rotateX = -Math.tanh(velocity.y / 25) * 0.35;
      const rotateY = Math.tanh(velocity.x / 25) * 0.35 + (1 - reveal) * direction * 0.35;
      const perspective = window.innerHeight / (2 * Math.tan(53.4 * Math.PI / 360));
      panel.style.width = `${width}px`;
      panel.style.transform = `translate3d(${left}px, ${top}px, 0) perspective(${perspective}px) rotateX(${rotateX}rad) rotateY(${rotateY}rad)`;
      panel.style.opacity = presence.v;
      panel.style.clipPath = `inset(${(1 - reveal) * 50}% ${(1 - reveal) * 50}% round ${2 * reveal}rem)`;
      firstImage.style.opacity = 1 - fade.v;
      secondImage.style.opacity = itemB ? fade.v : 0;

      const activeRect = rectangles[hovered];
      if (activeRect) {
        const targetY = 1 - (activeRect.top + activeRect.height / 2 - top) / height;
        shadeY = shadeY == null ? targetY : damp(shadeY, targetY, FOLLOW, dt);
        shadeElement.style.transform = `translate3d(0, ${(shadeY - 0.6) * height}px, 0)`;
      }
      updateMasks(width, height, rootSize);
    };

    const enter = (index) => { if (finePointer.matches) hovered = index; };
    const listeners = links.map((link, index) => {
      const handler = () => enter(index);
      link.addEventListener('pointerenter', handler);
      return [link, handler];
    });
    const resize = () => measure();
    const presenceTween = gsap.to(presence, { v: 1, duration: 0.6, ease: 'power2.out' });
    measure();
    document.fonts?.ready.then(measure);
    root.current.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      presenceTween.kill();
      swapTween?.kill();
      root.current?.removeEventListener('pointermove', move);
      window.removeEventListener('resize', resize);
      listeners.forEach(([link, handler]) => link.removeEventListener('pointerenter', handler));
    };
  }, []);

  const sourceRect = (project) => {
    const state = previewState.current;
    return state.visible && state.r > 0.5 && preview.current ? preview.current.getBoundingClientRect() : null;
  };

  return (
    <main ref={root} className="full-index route-layer" aria-label="Full project index" data-gl-shield>
      <div className="sr-only">
        <h1>Index — every project by {site.name}</h1>
        <p>The full catalogue, featured or not. A featured project has a case study on this site; the rest are listed by name, with the client's own site linked where there is one.</p>
      </div>
      <div ref={preview} className="index-preview" aria-hidden="true">
        <img ref={imageA} alt="" />
        <img ref={imageB} alt="" />
        <div ref={shade} className="index-preview-shade" />
      </div>
      <div className="index-list">
        {projects.map((project, index) => {
          const content = <span className="index-item">{project.title}</span>;
          return (
            <span className="index-entry" key={project.slug}>
              {project.featured ? (
                <a
                  className="index-link-wrap"
                  href={`/projects/${project.slug}`}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    onOpen(project.slug, sourceRect(project));
                  }}
                >{content}</a>
              ) : project.link ? (
                <a className="index-link-wrap" href={project.link} target="_blank" rel="noopener noreferrer">{content}</a>
              ) : (
                <span className="index-link-wrap">{content}</span>
              )}
              {index < projects.length - 1 && <span className="index-dot" aria-hidden="true">●</span>}
            </span>
          );
        })}
      </div>
    </main>
  );
}
