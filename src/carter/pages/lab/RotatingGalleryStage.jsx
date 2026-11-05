import { useCarterEngine } from '../../useCarterEngine.js';
import { getCarterRoot, onDestroy } from '../../runtime.js';
import { mountRotatingGallery, config as tuneConfig } from '../../engines/rotating-gallery.js';
import { mountLabTune } from './lab-tune.js';
import './rotating-gallery.css';

/**
 * Rotating Gallery stage — Phase 5D.
 *
 * Carter's `app/lib/experiments/rotating-gallery.js` `mount(viewport)` creates
 * its own `div.rg` (stage + HUD) inside `[data-experiment-viewport]` and
 * removes it again on destroy. Like Heart, there is no static host to adopt,
 * so this component renders nothing server-side: the engine owns the stage DOM
 * entirely, matching Carter's lab-doc flow.
 *
 * Mounting mirrors PolkaDotsStage and HeartStage: set `data-stage-loading` on
 * the document root, mount, then swap to `data-stage-live` (which hides the
 * `labd__empty` placeholder via CSS). On failure the empty state is restored
 * and the error logged.
 */
export default function RotatingGalleryStage() {
  useCarterEngine('rotating-gallery', () => {
    const frame = getCarterRoot();
    const detail = frame?.querySelector('[data-lab-detail]');
    const viewport = frame?.querySelector('[data-experiment-viewport]');

    if (detail) detail.dataset.stageLoading = '';

    let instance = null;
    let cleanTune = () => {};
    try {
      instance = mountRotatingGallery(viewport);
      if (instance && detail) cleanTune = mountLabTune(detail, instance, tuneConfig, 'rotating-gallery');
    } catch (error) {
      console.error('[rotating-gallery] mount failed', error);
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
