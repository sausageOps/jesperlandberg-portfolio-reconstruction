import { Component } from 'react';

/* Route-level safety net.

   The writing shelf is a WebGL engine mounted from a layout effect; anything it throws
   during commit used to take the whole root down with it (black page, nav gone). The
   engine itself now fails soft, but this boundary makes sure no route can ever unmount
   Jesper's chrome: the nav, the canvas and the live region live outside it, so a crash
   replaces only the route body.

   The fallback is deliberately styled inline: it must not depend on a stylesheet that
   may be the thing that failed. */
const shell = {
  position: 'fixed',
  inset: 0,
  display: 'grid',
  placeContent: 'center',
  gap: '1rem',
  padding: '2rem',
  textAlign: 'center',
  color: '#f2f2f2',
  background: '#000',
  font: '400 1rem/1.5 system-ui, -apple-system, "Segoe UI", sans-serif',
};

export default class RouteBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the evidence in the console; the app keeps running.
    console.error('[route] render failed, showing the fallback', error, info?.componentStack);
    try { window.__routeError = { message: String(error && error.message), stack: String(error && error.stack) }; } catch { /* ignore */ }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main role="alert" style={shell}>
        <h1 style={{ font: '400 1.5rem/1.2 inherit', margin: 0 }}>This page hit an error</h1>
        <p style={{ margin: 0, opacity: 0.7 }}>The rest of the site is still working.</p>
        <p style={{ margin: 0 }}>
          <a href="/" style={{ color: 'inherit', textDecoration: 'underline' }}>Back to the home page</a>
        </p>
      </main>
    );
  }
}
