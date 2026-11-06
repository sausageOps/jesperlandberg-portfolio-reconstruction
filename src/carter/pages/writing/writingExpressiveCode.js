/*
 * Expressive Code runtime behavior (`app/lib/expressive-code.ts`) scoped to
 * Carter's Writing post, with full `onDestroy` teardown so Lab's files stay
 * untouched and no observers/timers leak on unmount.
 */
import { getCarterRoot, onDestroy } from '../../runtime.js';

function fallbackCopy(text) {
  const pre = document.createElement('pre');
  Object.assign(pre.style, {
    opacity: '0',
    pointerEvents: 'none',
    position: 'absolute',
    overflow: 'hidden',
    left: '0',
    top: '0',
    width: '20px',
    height: '20px',
    webkitUserSelect: 'auto',
    userSelect: 'all',
  });
  pre.ariaHidden = 'true';
  pre.textContent = text;
  document.body.appendChild(pre);
  const range = document.createRange();
  range.selectNode(pre);
  const sel = getSelection();
  if (!sel) {
    document.body.removeChild(pre);
    return false;
  }
  sel.removeAllRanges();
  sel.addRange(range);
  let ok = false;
  try {
    ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : true;
  } catch {
    ok = false;
  } finally {
    sel.removeAllRanges();
    document.body.removeChild(pre);
  }
  return ok;
}

function updatePreTabIndex(pre) {
  const scrollable = pre.scrollWidth > pre.clientWidth;
  if (scrollable) {
    pre.setAttribute('tabindex', '0');
  } else {
    pre.removeAttribute('tabindex');
  }
}

export function initWritingExpressiveCode() {
  const root = getCarterRoot() ?? document;
  const post = root.querySelector('[data-writing-post]');
  if (!post) return;

  const ac = new AbortController();
  const { signal } = ac;
  const timers = new Set();
  const feedbacks = new Set();

  const trackTimer = (fn, ms) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };

  post.querySelectorAll('.expressive-code .copy button').forEach((btn) => {
    btn.dataset.ecBound = 'true';
    btn.addEventListener(
      'click',
      (event) => {
        const target = event.currentTarget;
        if (!target) return;
        const code = (target.dataset.code ?? '').replace(/\u007f/g, '\n');
        const copiedLabel = target.dataset.copied;

        const showFeedback = () => {
          if (!target.parentElement || target.parentElement.querySelector('.feedback')) return;
          const liveRegion = target.parentElement.querySelector('[aria-live]');
          const feedback = document.createElement('div');
          feedback.classList.add('feedback');
          feedback.append(copiedLabel ?? 'Copied!');
          target.before(feedback);
          feedbacks.add(feedback);
          void feedback.offsetWidth;
          requestAnimationFrame(() => {
            if (!signal.aborted) feedback.classList.add('show');
          });
          const hide = () => feedback.classList.remove('show');
          const cleanup = () => {
            if (!feedback.isConnected) return;
            if (parseFloat(getComputedStyle(feedback).opacity) > 0) return;
            feedback.remove();
            feedbacks.delete(feedback);
            if (liveRegion) liveRegion.textContent = '';
          };
          trackTimer(hide, 1500);
          trackTimer(() => {
            feedback.remove();
            feedbacks.delete(feedback);
            if (liveRegion) liveRegion.textContent = '';
          }, 2500);
          target.addEventListener('blur', hide, { signal });
          feedback.addEventListener('transitioncancel', cleanup, { signal });
          feedback.addEventListener('transitionend', cleanup, { signal });
          if (liveRegion) liveRegion.textContent = copiedLabel ?? 'Copied!';
        };

        const clipboard = window.navigator?.clipboard;
        if (clipboard?.writeText) {
          clipboard
            .writeText(code)
            .then(() => {
              if (!signal.aborted) showFeedback();
            })
            .catch(() => {
              if (!signal.aborted && fallbackCopy(code)) showFeedback();
            });
        } else if (fallbackCopy(code)) {
          showFeedback();
        }
      },
      { signal },
    );
  });

  const pres = [...post.querySelectorAll('.expressive-code pre')];
  let ro = null;
  let debounceTimer = 0;

  if (pres.length && 'ResizeObserver' in window) {
    ro = new ResizeObserver((entries) => {
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        entries.forEach((entry) => updatePreTabIndex(entry.target));
      }, 250);
    });
    pres.forEach((pre) => {
      pre.dataset.ecPre = 'true';
      updatePreTabIndex(pre);
      ro.observe(pre);
    });
  }

  onDestroy(() => {
    ac.abort();
    clearTimeout(debounceTimer);
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    feedbacks.forEach((el) => el.remove());
    feedbacks.clear();
    ro?.disconnect();
    post.querySelectorAll('.expressive-code .copy button').forEach((btn) => {
      delete btn.dataset.ecBound;
    });
    pres.forEach((pre) => {
      delete pre.dataset.ecPre;
    });
  });
}
