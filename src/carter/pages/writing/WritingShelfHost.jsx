import { useEffect } from 'react';
import { runWritingShelfTeardown } from './writingShelfRegistry.js';

/*
 * Carter's three persistent Writing canvases (`BaseLayout.astro` lines 228-249),
 * mounted inside `.carter` across `/routes/writing` <-> `/routes/writing/the-personal-starter`
 * so the 3D folder shelf and flight layer survive the index <-> post transition,
 * and disposed + removed immediately when leaving Writing routes.
 */

const SHELF_GL_STYLE = {
  position: 'fixed',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 1,
  opacity: 0,
  display: 'block',
  transition: 'opacity 0.6s ease, filter 0.7s ease',
};

const SHELF_STILL_STYLE = {
  position: 'fixed',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 1,
  opacity: 0,
  display: 'block',
  transition: 'opacity 0.6s ease',
};

const FLIGHT_GL_STYLE = {
  position: 'fixed',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 80,
  opacity: 0,
  display: 'block',
};

export default function WritingShelfHost() {
  useEffect(() => () => runWritingShelfTeardown(), []);

  return (
    <>
      <canvas
        className="shelf-gl"
        style={SHELF_GL_STYLE}
        data-shelf=""
        aria-hidden="true"
      />
      <canvas
        className="shelf-still"
        style={SHELF_STILL_STYLE}
        data-shelf-still=""
        aria-hidden="true"
      />
      <canvas
        className="flight-gl"
        style={FLIGHT_GL_STYLE}
        data-flight=""
        aria-hidden="true"
      />
    </>
  );
}
