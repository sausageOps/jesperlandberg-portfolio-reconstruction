import { useCarterEngine } from '../../useCarterEngine.js';
import { getCarterRoot, onDestroy } from '../../runtime.js';
import { mountHeart, config as tuneConfig } from '../../engines/heart.js';
import { mountLabTune } from './lab-tune.js';
import './heart.css';

/**
 * Heart stage — Phase 5C.
 *
 * Carter's `app/lib/experiments/heart.js` `mount(viewport)` creates its own
 * `div.heart > canvas` inside `[data-experiment-viewport]` and removes it
 * again on destroy. Unlike Polka Dots there is no Phase 5A static host to
 * adopt, so this component renders nothing: the engine owns the stage DOM
 * entirely, exactly as in Carter's lab-doc flow.
 *
 * Mounting mirrors PolkaDotsStage's lab-doc sequence: set
 * `data-stage-loading` on the document root, mount, then swap to
 * `data-stage-live` (which hides the `labd__empty` placeholder via CSS).
 * On failure the empty state is restored and the error logged.
 */
export default function HeartStage() {
  useCarterEngine('heart', () => {
    const frame = getCarterRoot();
    const detail = frame?.querySelector('[data-lab-detail]');
    const viewport = frame?.querySelector('[data-experiment-viewport]');

    // Mirror Carter's lab-doc loading → live sequence
    if (detail) detail.dataset.stageLoading = '';

    let instance = null;
    let cleanTune = () => {};
    try {
      instance = mountHeart(viewport);
      if (instance && detail) cleanTune = mountLabTune(detail, instance, tuneConfig, 'heart');
    } catch (error) {
      console.error('[heart] mount failed', error);
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
