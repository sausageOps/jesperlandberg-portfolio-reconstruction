import { useCarterEngine } from '../../useCarterEngine.js';
import { getCarterRoot, onDestroy } from '../../runtime.js';
import { mountLiveCursors, config as tuneConfig } from '../../engines/live-cursors.js';
import { mountLabTune } from './lab-tune.js';
import './live-cursors.css';

/**
 * Live Cursors stage — Phase 5I.
 *
 * Carter's `app/lib/experiments/live-cursors.js` `mount(viewport)` creates
 * its own `div.lc` inside `[data-experiment-viewport]` and removes it again on
 * destroy, so this component renders nothing: the engine owns the stage DOM
 * entirely, exactly as in Carter's lab-doc flow.
 *
 * Mounting mirrors the other stage components: set `data-stage-loading` on the
 * document root, mount, then swap to `data-stage-live` (which hides the
 * `labd__empty` placeholder via CSS). On failure the empty state is restored
 * and the error logged.
 */
export default function LiveCursorsStage() {
  useCarterEngine('live-cursors', () => {
    const frame = getCarterRoot();
    const detail = frame?.querySelector('[data-lab-detail]');
    const viewport = frame?.querySelector('[data-experiment-viewport]');

    // Mirror Carter's lab-doc loading → live sequence
    if (detail) detail.dataset.stageLoading = '';

    let instance = null;
    let cleanTune = () => {};
    try {
      instance = mountLiveCursors(viewport);
      if (instance && detail) cleanTune = mountLabTune(detail, instance, tuneConfig, 'live-cursors');
    } catch (error) {
      console.error('[live-cursors] mount failed', error);
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

    // useCarterEngine does not consume returned cleanup functions.
    // Register stage flags with the same route lifecycle as the engine.
    onDestroy(() => {
      cleanTune();
      if (detail) {
        delete detail.dataset.stageLive;
        delete detail.dataset.stageLoading;
      }
    });
  });

  return null;
}
