export default function Loader({ progress, leaving, mobileHome, painted }) {
  return (
    <div className={`loader ${leaving ? 'loader-leaving' : ''}${mobileHome ? ' loader-mobile-home' : ''}${painted ? ' loader-painted' : ''}`} role="status" aria-label="Loading featured projects">
      <div className="loader-bars" aria-hidden="true">
        {[0, 1, 2].map((index) => {
          const fill = Math.min(1, Math.max(0, progress * 3 - index));
          return (
            <span className="loader-bar" data-gl={mobileHome ? "bar" : undefined} key={index}>
              <span style={{ transform: `scaleX(${fill})` }} />
            </span>
          );
        })}
      </div>
      <span className="sr-only">Loading project imagery</span>
    </div>
  );
}
