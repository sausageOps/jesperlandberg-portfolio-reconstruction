import { useRef } from 'react';
import { useCarterEngine } from '../../useCarterEngine.js';
import { getCarterRoot, onDestroy } from '../../runtime.js';
import { mountPolkaDots, config as tuneConfig } from '../../engines/polka-dots.js';
import { mountLabTune } from './lab-tune.js';
import './polka-dots.css';

/**
 * Polka Dots stage — Phase 5B.
 *
 * Carter's `app/lib/experiments/polka-dots.js` creates `div.pd > canvas`
 * inside `[data-experiment-viewport]`. Phase 5A kept that DOM static and
 * blank; this phase ports the engine and mounts it on the Polka Dots route
 * only, reusing the existing stage and CSS and hiding the blank-stage
 * placeholder (`labd__empty`) once the engine is live.
 *
 * The static `.pd > canvas` from Phase 5A is preserved as the engine's
 * host so the DOM shape matches Carter's SSR; the engine adopts the
 * existing canvas instead of creating a duplicate. If the host is missing
 * (e.g. direct viewport mount) the engine creates one, matching Carter's
 * original `mount()` contract.
 */
export default function PolkaDotsStage() {
  const hostRef = useRef(null);

  useCarterEngine('polka-dots', () => {
    const host = hostRef.current;
    // Engine will adopt the host's `.pd > canvas` when present
    const frame = getCarterRoot();
    const detail = frame?.querySelector('[data-lab-detail]') || host?.closest?.('[data-lab-detail]');

    // Mirror Carter's lab-doc loading → live sequence
    if (detail) detail.dataset.stageLoading = '';

    let instance = null;
    let cleanTune = () => {};
    try {
      instance = mountPolkaDots(host);
      if (instance && detail) cleanTune = mountLabTune(detail, instance, tuneConfig, 'polka-dots');
    } catch (error) {
      console.error('[polka-dots] mount failed', error);
      if (detail) delete detail.dataset.stageLoading;
      return;
    }

    if (instance) {
      if (detail) {
        delete detail.dataset.stageLoading;
        detail.dataset.stageLive = '';
      }
    } else if (detail) {
      delete detail.dataset.stageLoading;
    }

    // useCarterEngine deliberately ignores returned cleanup functions. Clear
    // the flags through the same Carter page lifecycle as the engine teardown.
    onDestroy(() => {
      cleanTune();
      if (detail) {
        delete detail.dataset.stageLive;
        delete detail.dataset.stageLoading;
      }
    });
  });

  // Phase 5A DOM shape is preserved; the engine adopts this canvas on
  // the client. The placeholder attribute is removed once the engine
  // owns the element (stageLive hides the `labd__empty` blank state).
  return (
    <div ref={hostRef} className="pd" data-engine-host="polka-dots">
      <canvas aria-hidden="true" />
    </div>
  );
}
