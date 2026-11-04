import { useCarterEngine } from '../../useCarterEngine.js';
import { getCarterRoot, onDestroy } from '../../runtime.js';
import { mountDial } from '../../engines/dial.js';
import './dial.css';

/**
 * Dial stage — Phase 5E.
 *
 * Carter's `app/lib/experiments/dial.js` `mount(viewport)` creates its own
 * `div.dial` (stage, tick ring, cover, index pointer, knob) inside
 * `[data-experiment-viewport]` and removes it again on destroy. Like Heart and
 * Rotating Gallery there is no static host to adopt, so this component renders
 * nothing server-side: the engine owns the stage DOM entirely, matching
 * Carter's lab-doc flow.
 *
 * Mounting mirrors HeartStage and RotatingGalleryStage: set
 * `data-stage-loading` on the document root, mount, then swap to
 * `data-stage-live` (which hides the `labd__empty` placeholder via CSS). On
 * failure the empty state is restored and the error logged.
 */
export default function DialStage() {
  useCarterEngine('dial', () => {
    const frame = getCarterRoot();
    const detail = frame?.querySelector('[data-lab-detail]');
    const viewport = frame?.querySelector('[data-experiment-viewport]');

    // Mirror Carter's lab-doc loading → live sequence
    if (detail) detail.dataset.stageLoading = '';

    let instance = null;
    try {
      instance = mountDial(viewport);
    } catch (error) {
      console.error('[dial] mount failed', error);
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
      if (detail) {
        delete detail.dataset.stageLive;
        delete detail.dataset.stageLoading;
      }
    });
  });

  return null;
}
