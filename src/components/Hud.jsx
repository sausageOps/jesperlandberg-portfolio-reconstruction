export default function Hud({ route, overlay, onHome, onFull, onProfile, onNewsletter }) {
  const visible = route !== 'project';
  return (
    <div className={`hud ${visible ? '' : 'hud-hidden'}`} inert={!visible || undefined}>
      <div className="hud-top">
        <a
          href="/"
          className="hud-link hud-name"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onHome();
          }}
        >
          Jesper Landberg
        </a>
        <button type="button" className="hud-link hud-hit" aria-expanded={overlay === 'profile'} onClick={onProfile}>
          {overlay === 'profile' ? 'Close' : 'Profile'}
        </button>
      </div>
      <div className="hud-bottom">
        <nav className="view-nav" aria-label="Project views">
          <a
            href="/"
            aria-current={route === 'home' ? 'page' : undefined}
            className={route === 'home' ? 'active' : ''}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onHome();
            }}
          >
            Featured
          </a>
          <span aria-hidden="true">/</span>
          <a
            href="/full"
            aria-current={route === 'full' ? 'page' : undefined}
            className={route === 'full' ? 'active' : ''}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onFull();
            }}
          >
            Full
          </a>
        </nav>
        <button type="button" className="hud-link hud-hit hud-news" aria-expanded={overlay === 'newsletter'} onClick={onNewsletter}>
          {overlay === 'newsletter' ? 'Close' : 'Newsletter'}
        </button>
      </div>
    </div>
  );
}
