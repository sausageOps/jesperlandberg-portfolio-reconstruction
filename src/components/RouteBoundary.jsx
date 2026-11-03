import { Component } from 'react';

/* Route-level safety net.

   The writing shelf is a WebGL engine mounted from a layout effect; anything it throws
   during commit used to take the whole root down with it (black page, nav gone). The
   engine itself now fails soft, but this boundary makes sure no route can ever unmount
   Jesper's chrome again: the nav, the canvas and the live region live outside it, so a
   crash keeps the app shell and only replaces the route body. */
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
      <main className="not-found" role="alert">
        <h1 className="section-label section-label--lg">Something broke here</h1>
        <p className="text-lead">
          This page hit an error while loading. The rest of the site still works.
        </p>
        <p>
          <a className="text-label" href="/">Back to the home page</a>
        </p>
      </main>
    );
  }
}
