import './polka-dots.css';

/**
 * Polka Dots' source DOM, kept static for Phase 5A.
 *
 * Carter's engine creates `.pd > canvas` in
 * `app/lib/experiments/polka-dots.js`. The canvas is deliberately blank here:
 * no context, drawing loop, observers, pointer handlers, or GSAP are loaded.
 * The existing Lab shell empty state remains in the viewport as the visible
 * engine-dependent placeholder.
 */
export default function PolkaDotsStage() {
  return (
    <div className="pd" data-engine-placeholder="polka-dots">
      <canvas aria-hidden="true" />
    </div>
  );
}
