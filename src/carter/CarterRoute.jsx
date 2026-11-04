import { Component, Suspense, lazy, useEffect, useLayoutEffect, useRef } from 'react';
import {
  bindCarterRuntime,
  destroyAll,
  interceptLinkClick,
  releaseVeil,
  unbindCarterRuntime,
} from './runtime.js';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/atoms.css';
import './styles/frame.css';

/*
 * Ported Carter pages, by route key (see routes.js). Each page phase registers
 * its page here as a lazy import, so its code and CSS load only on that route:
 *
 *   about: lazy(() => import('./pages/about/AboutPage.jsx')),
 *
 * A key with no entry renders the route's Phase 1 placeholder inside the frame.
 */
const PAGES = {
  about: lazy(() => import('./pages/about/AboutPage.jsx')),
  lab: lazy(() => import('./pages/lab/LabPage.jsx')),
  // Phase 4B: one shared document shell for the nine `/routes/lab/<slug>` pages.
  'lab-detail': lazy(() => import('./pages/lab/LabDetailPage.jsx')),
};

/**
 * Wraps one Carter page. It is keyed by route, so moving between Carter pages
 * remounts it while the frame stays mounted. On the way out it flushes the
 * outgoing page's engine teardowns while that page's DOM is still attached
 * (Carter: astro:before-swap). On the way in it resets the frame's scroll. A
 * page that throws while rendering falls back to the placeholder instead of
 * unmounting Jesper's shell.
 */
class CarterPageBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('[carter] page failed to render', error);
  }

  componentDidMount() {
    const root = this.props.rootRef.current;
    if (root) root.scrollTop = 0;
  }

  componentWillUnmount() {
    destroyAll();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Route-level frame for Carter pages: Jesper's version of Carter's BaseLayout.
 *
 * The root element plays Carter's <html>/<body> roles inside #main-content:
 * - CSS scope: every Carter rule is scoped to .carter (see styles/).
 * - Theme: data-theme lives here, not on <html> (house default dark).
 * - Surface: Carter's paper and grain sit above Jesper's WebGL canvas, which
 *   is opaque black off the home route. The nav, HUD and Loader stay above.
 * - Scroller: html/body never scroll in Jesper, so the root is the page's
 *   fixed scroller (the same model as Contact's .cletter-scroll).
 * Pages render their own <main>. The runtime contract that engines import is
 * bound for as long as the frame is mounted.
 */
export default function CarterRoute({ page, appReady = false, onNavigate, placeholder = null }) {
  const rootRef = useRef(null);
  const navigateRef = useRef(onNavigate);

  useLayoutEffect(() => {
    navigateRef.current = onNavigate;
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    bindCarterRuntime({
      root,
      appReady,
      navigate: (path, options) => navigateRef.current?.(path, options),
    });
    return () => {
      destroyAll();
      unbindCarterRuntime(root);
    };
    // Bound once per frame. Later appReady changes go through releaseVeil().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (appReady) releaseVeil();
  }, [appReady]);

  const Page = PAGES[page.key];

  return (
    // The click handler only delegates link clicks to the router. Keyboard
    // activation of a link dispatches the same click event.
    <div
      ref={rootRef}
      className="carter"
      data-theme="dark"
      data-carter-page={page.key}
      onClick={interceptLinkClick}
    >
      <CarterPageBoundary key={`${page.key}:${page.slug ?? ''}`} rootRef={rootRef} fallback={placeholder}>
        {Page ? (
          <Suspense fallback={null}>
            {/* The Lab documents take their slug from the route registry. */}
            <Page appReady={appReady} slug={page.slug} />
          </Suspense>
        ) : (
          placeholder
        )}
      </CarterPageBoundary>
    </div>
  );
}
