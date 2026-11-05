/** Vocal Orb's subset of Carter's lab-doc configurator (range + segment).
 * Tuned Code copying and the hidden version tools remain deferred. */
export function mountVocalOrbTune(detail, instance, config) {
  const toggle = detail.querySelector('[data-config-toggle]');
  const panel = detail.querySelector('[data-config-panel]');
  const body = detail.querySelector('[data-config-body]');
  const reset = detail.querySelector('[data-config-reset]');
  if (!toggle || !panel || !body || !reset || !instance?.set) return () => {};
  const key = 'labcfg:vocal-orb';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch { /* storage optional */ }
  const values = {};
  const controls = new Map();
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const valid = (item, value) => item.type === 'segment'
    ? item.options.some(option => option.id === value)
    : typeof value === 'number' && Number.isFinite(value) && value >= item.min && value <= item.max;
  const persist = () => {
    try { localStorage.setItem(key, JSON.stringify({ presets: saved.presets || [], active: 'base', values })); } catch { /* storage optional */ }
  };
  const update = (item, value, save = true) => {
    if (!valid(item, value)) return;
    values[item.key] = value;
    instance.set(item.key, value);
    controls.get(item.key)?.(value);
    if (save) persist();
  };
  for (const item of config) {
    const row = document.createElement('div');
    row.className = 'labcfg__row'; row.dataset.type = item.type;
    if (item.type === 'segment') {
      const label = document.createElement('span'); label.className = 'labcfg__label text-mono-meta'; label.textContent = item.label;
      const group = document.createElement('div'); group.className = 'labcfg__seg'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', item.label); group.style.setProperty('--seg-n', String(item.options.length));
      const pill = document.createElement('span'); pill.className = 'labcfg__seg-pill'; pill.setAttribute('aria-hidden', 'true'); group.append(pill);
      const buttons = item.options.map(option => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'labcfg__seg-btn'; button.textContent = option.label;
        button.addEventListener('click', () => update(item, option.id), options); group.append(button); return [button, option.id];
      });
      controls.set(item.key, value => { buttons.forEach(([button, id]) => button.setAttribute('aria-pressed', String(id === value))); pill.style.transform = `translateX(${item.options.findIndex(option => option.id === value) * 100}%)`; });
      row.append(label, group);
    } else if (item.type === 'range') {
      const slider = document.createElement('div'); slider.className = 'labcfg__slider'; slider.tabIndex = 0;
      slider.setAttribute('role', 'slider'); slider.setAttribute('aria-label', item.label);
      slider.setAttribute('aria-valuemin', String(item.min)); slider.setAttribute('aria-valuemax', String(item.max));
      const fill = document.createElement('span'); fill.className = 'labcfg__slider-fill';
      const label = document.createElement('span'); label.className = 'labcfg__slider-label text-mono-meta'; label.textContent = item.label;
      const output = document.createElement('span'); output.className = 'labcfg__slider-value text-mono-meta';
      slider.append(fill, label, output); row.append(slider);
      const round = value => Math.max(item.min, Math.min(item.max, Number((Math.round(value / item.step) * item.step).toFixed(6))));
      controls.set(item.key, value => { output.textContent = String(value); slider.setAttribute('aria-valuenow', String(value)); fill.style.width = `${(value - item.min) / (item.max - item.min) * 100}%`; });
      let dragging = false, startX = 0, startValue = 0;
      slider.addEventListener('pointerdown', event => { if (event.button !== 0) return; dragging = true; startX = event.clientX; startValue = values[item.key]; slider.setPointerCapture?.(event.pointerId); slider.classList.add('is-scrubbing'); }, options);
      slider.addEventListener('pointermove', event => { if (dragging) update(item, round(startValue + (event.clientX - startX) / 220 * (item.max - item.min))); }, options);
      const release = () => { dragging = false; slider.classList.remove('is-scrubbing'); };
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) slider.addEventListener(event, release, options);
      slider.addEventListener('keydown', event => { if (!['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].includes(event.key)) return; event.preventDefault(); event.stopPropagation(); update(item, round(values[item.key] + (['ArrowRight', 'ArrowUp'].includes(event.key) ? item.step : -item.step))); }, options);
    }
    body.append(row);
    const savedValue = saved.values?.[item.key];
    update(item, valid(item, savedValue) ? savedValue : item.default, false);
  }
  toggle.hidden = false; panel.hidden = false;
  toggle.addEventListener('click', () => {
    const open = !detail.classList.contains('is-config');
    detail.classList.toggle('is-config', open); toggle.setAttribute('aria-expanded', String(open));
  }, options);
  reset.addEventListener('click', () => { for (const item of config) update(item, item.default, false); persist(); }, options);
  return () => {
    abort.abort(); body.replaceChildren(); detail.classList.remove('is-config');
    toggle.hidden = true; panel.hidden = true; toggle.setAttribute('aria-expanded', 'false');
  };
}
