const bound = new WeakSet();

function fallbackCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  Object.assign(area.style, { position: 'fixed', opacity: '0', pointerEvents: 'none' });
  document.body.append(area);
  area.select();
  let copied = false;
  try { copied = document.execCommand?.('copy') ?? false; } catch { copied = false; }
  area.remove();
  return copied;
}

/** Bind the small interactive part of Carter's Expressive Code client script. */
export function initExpressiveCode(root) {
  const buttons = [...root.querySelectorAll('.expressive-code .copy button')];
  for (const button of buttons) {
    if (bound.has(button)) continue;
    bound.add(button);
    button.addEventListener('click', async () => {
      const text = (button.dataset.code || button.closest('.expressive-code')?.querySelector('pre code')?.textContent || '').replace(/\u007f/g, '\n');
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); copied = true; }
        else copied = fallbackCopy(text);
      } catch { copied = fallbackCopy(text); }
      if (copied) {
        const live = button.parentElement?.querySelector('[aria-live]');
        if (live) live.textContent = button.dataset.copied || 'Copied!';
        button.dataset.copyState = 'copied';
        window.setTimeout(() => {
          if (!button.isConnected) return;
          button.dataset.copyState = '';
          if (live) live.textContent = '';
        }, 1500);
      }
    });
  }

  const wraps = [...root.querySelectorAll('[data-code-wrap]')];
  for (const button of wraps) {
    if (bound.has(button)) continue;
    bound.add(button);
    button.addEventListener('click', () => {
      const block = button.closest('[data-code-block]');
      const pre = block?.querySelector('pre');
      if (!block || !pre) return;
      const nowWrapped = block.toggleAttribute('data-nowrap');
      pre.classList.toggle('wrap', !nowWrapped);
      button.setAttribute('aria-pressed', String(!nowWrapped));
      button.setAttribute('aria-label', nowWrapped ? 'Unwrap lines' : 'Wrap lines');
      button.title = nowWrapped ? 'Wrap lines' : 'Unwrap lines';
    });
  }

  const pres = [...root.querySelectorAll('.expressive-code pre')];
  const update = (pre) => {
    if (pre.scrollWidth > pre.clientWidth + 1) pre.setAttribute('tabindex', '0');
    else pre.removeAttribute('tabindex');
  };
  pres.forEach(update);
  if (typeof ResizeObserver === 'undefined' || pres.length === 0) return () => {};
  const observer = new ResizeObserver(entries => entries.forEach(({ target }) => update(target)));
  pres.forEach(pre => observer.observe(pre));
  return () => observer.disconnect();
}
