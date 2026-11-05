import { useCarterEngine } from '../../useCarterEngine.js';
import { getCarterRoot, onDestroy } from '../../runtime.js';
import { mountPasteUp } from '../../engines/paste-up.js';
import './paste-up.css';

/**
 * Paste-Up stage — Phase 5F.
 *
 * Carter's `app/lib/experiments/paste-up.js` `mount(viewport)` creates its own
 * `div.pu` (tabs, three boards of `data-print` boxes, the GL canvas, the HUD)
 * inside `[data-experiment-viewport]` and removes it again on destroy. Like
 * Heart, Rotating Gallery and Dial there is no static host to adopt, so this
 * component renders nothing server-side: the engine owns the stage DOM
 * entirely, matching Carter's lab-doc flow.
 *
 * Mounting mirrors DialStage: set `data-stage-loading` on the document root,
 * mount, then swap to `data-stage-live` (which hides the `labd__empty`
 * placeholder via CSS). On failure the empty state is restored and the error
 * logged.
 */
export default function PasteUpStage() {
  useCarterEngine('paste-up', () => {
    const frame = getCarterRoot();
    const detail = frame?.querySelector('[data-lab-detail]');
    const viewport = frame?.querySelector('[data-experiment-viewport]');

    // Mirror Carter's lab-doc loading → live sequence
    if (detail) detail.dataset.stageLoading = '';

    let instance = null;
    try {
      instance = mountPasteUp(viewport);
    } catch (error) {
      console.error('[paste-up] mount failed', error);
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
