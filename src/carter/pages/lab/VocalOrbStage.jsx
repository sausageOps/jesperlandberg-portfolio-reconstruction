import { useCarterEngine } from '../../useCarterEngine.js';
import { getCarterRoot, onDestroy } from '../../runtime.js';
import { mountVocalOrbTune } from './vocal-orb-tune.js';
import './vocal-orb.css';

const CAPTION_HOST = 'https://models.carterogunsola.com';

/** One isolated lazy engine, with cancellation registered before the import. */
export default function VocalOrbStage() {
  useCarterEngine('vocal-orb', () => {
    const frame = getCarterRoot();
    const detail = frame?.querySelector('[data-lab-detail]');
    const viewport = frame?.querySelector('[data-experiment-viewport]');
    if (!detail || !viewport) return;
    let disposed = false, instance = null, cleanTune = () => {};
    detail.dataset.stageLoading = '';
    onDestroy(() => {
      disposed = true;
      cleanTune();
      if (typeof instance === 'function') instance();
      else instance?.destroy?.();
      delete detail.dataset.stageLoading;
      delete detail.dataset.stageLive;
    });
    const showUnavailable = () => {
      const message = document.createElement('p');
      message.textContent = 'Vocal Orb is unavailable in this browser.';
      message.setAttribute('role', 'status');
      viewport.append(message);
      detail.dataset.stageLive = '';
      delete detail.dataset.stageLoading;
    };
    import('../../engines/vocal-orb.js').then(({ default: engine, config }) => {
      if (disposed) return;
      try {
        instance = engine.mount(viewport, { captionHost: CAPTION_HOST });
        if (instance?.set) cleanTune = mountVocalOrbTune(detail, instance, config);
        delete detail.dataset.stageLoading;
        detail.dataset.stageLive = '';
      } catch (error) {
        // A shader or setup failure can happen after the engine inserts a canvas.
        if (typeof instance === 'function') instance();
        else instance?.destroy?.();
        viewport.querySelector('.orb canvas')?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
        viewport.querySelector('.orb')?.remove();
        showUnavailable();
        console.error('[vocal-orb] mount failed', error);
      }
    }).catch(error => {
      if (!disposed) { showUnavailable(); console.error('[vocal-orb] load failed', error); }
    });
  });
  return null;
}
