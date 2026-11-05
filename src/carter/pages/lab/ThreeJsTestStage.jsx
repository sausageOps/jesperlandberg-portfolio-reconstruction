import { useCarterEngine } from '../../useCarterEngine.js';
import { getCarterRoot, onDestroy } from '../../runtime.js';
import { mountThreeJsTest, config as tuneConfig } from '../../engines/threejs-test.js';
import { mountLabTune } from './lab-tune.js';
import './threejs-test.css';

/**
 * ThreeJs Scene stage — Phase 5G.
 *
 * Carter's `app/lib/experiments/threejs-test.js` `mount(viewport)` creates its
 * own `div.tj` (`.tj__loading` spinner, Subject and Render-mode segmented
 * controls, and the WebGLRenderer `<canvas>`) inside `[data-experiment-viewport]`
 * and removes it again on destroy. Like Heart, Rotating Gallery, Dial and
 * Paste-Up there is no static host to adopt, so this component renders nothing
 * server-side: the engine owns the stage DOM entirely, matching Carter's
 * lab-doc flow.
 *
 * Mounting mirrors PasteUpStage / DialStage: set `data-stage-loading` on the
 * document root, mount, then swap to `data-stage-live` (which hides the
 * `labd__empty` placeholder via CSS). On failure the empty state is restored
 * and the error logged.
 */
export default function ThreeJsTestStage() {
  useCarterEngine('threejs-test', () => {
    const frame = getCarterRoot();
    const detail = frame?.querySelector('[data-lab-detail]');
    const viewport = frame?.querySelector('[data-experiment-viewport]');

    // Mirror Carter's lab-doc loading → live sequence
    if (detail) detail.dataset.stageLoading = '';

    let instance = null;
    let cleanTune = () => {};
    try {
      instance = mountThreeJsTest(viewport);
      if (instance && detail) cleanTune = mountLabTune(detail, instance, tuneConfig, 'threejs-test');
    } catch (error) {
      console.error('[threejs-test] mount failed', error);
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
