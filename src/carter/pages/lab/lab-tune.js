const validStored = (item, value) => {
  if (item.type === 'segment' || item.type === 'swatch') return item.options?.some(option => option.id === value);
  if (item.type === 'range') return Number.isFinite(Number(value)) && Number(value) >= item.min && Number(value) <= item.max;
  return false;
};

function normalize(config) {
  if (Array.isArray(config)) return config;
  return Object.entries(config || {}).flatMap(([key, value]) => {
    if (Array.isArray(value) && value.length >= 3) return [{ key, label: key, type: 'range', default: value[0], min: value[1], max: value[2], step: value[3] || 1 }];
    if (value === true || value === false) return [{ key, label: key, type: 'toggle', default: value }];
    if (value && typeof value === 'object') return [{ key, label: key, type: 'spring', default: value }];
    return [];
  });
}

/** Small shared version of Carter's lab-doc configurator, wired to each engine's set(). */
export function mountLabTune(detail, instance, rawConfig, slug) {
  const toggle = detail?.querySelector('[data-config-toggle]');
  const panel = detail?.querySelector('[data-config-panel]');
  const body = detail?.querySelector('[data-config-body]');
  const reset = detail?.querySelector('[data-config-reset]');
  if (!toggle || !panel || !body || !reset || typeof instance?.set !== 'function') return () => {};
  const config = normalize(rawConfig);
  if (!config.length) return () => {};
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const key = `labcfg:${slug}`;
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(key) || '{}'); } catch { /* storage may be disabled */ }
  const values = {};
  const setters = new Map();

  const persist = () => { try { localStorage.setItem(key, JSON.stringify({ values })); } catch { /* optional */ } };
  const setValue = (item, value, save = true) => {
    if (item.type === 'range' && (!Number.isFinite(Number(value)) || Number(value) < item.min || Number(value) > item.max)) return;
    if ((item.type === 'segment' || item.type === 'swatch') && !item.options?.some(option => option.id === value)) return;
    values[item.key] = value;
    instance.set(item.key, value);
    setters.get(item.key)?.(value);
    if (save) persist();
  };

  const addRange = (item, parent = body, name = item.key, labelText = item.label, initial = item.default, lo = item.min, hi = item.max, step = item.step) => {
    const row = document.createElement('div'); row.className = 'labcfg__row'; row.dataset.type = 'range';
    const slider = document.createElement('div'); slider.className = 'labcfg__slider'; slider.tabIndex = 0; slider.setAttribute('role', 'slider');
    slider.setAttribute('aria-label', labelText); slider.setAttribute('aria-valuemin', String(lo)); slider.setAttribute('aria-valuemax', String(hi));
    const fill = document.createElement('span'); fill.className = 'labcfg__slider-fill';
    const label = document.createElement('span'); label.className = 'labcfg__slider-label text-mono-meta'; label.textContent = labelText;
    const output = document.createElement('span'); output.className = 'labcfg__slider-value text-mono-meta';
    slider.append(fill, label, output); row.append(slider); parent.append(row);
    const round = value => Math.max(lo, Math.min(hi, Number((Math.round(value / step) * step).toFixed(6))));
    const render = value => {
      output.textContent = String(value); slider.setAttribute('aria-valuenow', String(value));
      fill.style.width = `${(value - lo) / (hi - lo) * 100}%`;
    };
    const write = value => {
      const next = round(value);
      if (name === item.key) setValue(item, next);
      else {
        values[item.key] = { ...(values[item.key] || item.default), [name]: next };
        instance.set(item.key, values[item.key]); setters.get(item.key)?.(values[item.key]); persist();
      }
      render(next);
    };
    let dragging = false, startX = 0, startValue = Number(initial);
    slider.addEventListener('pointerdown', event => { if (event.button !== 0) return; dragging = true; startX = event.clientX; startValue = Number(name === item.key ? values[item.key] : values[item.key]?.[name] ?? initial); slider.setPointerCapture?.(event.pointerId); slider.classList.add('is-scrubbing'); }, options);
    slider.addEventListener('pointermove', event => { if (dragging) write(startValue + (event.clientX - startX) / 220 * (hi - lo)); }, options);
    const release = () => { dragging = false; slider.classList.remove('is-scrubbing'); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => slider.addEventListener(type, release, options));
    slider.addEventListener('keydown', event => {
      if (!['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      write(Number(values[item.key]?.[name] ?? values[item.key] ?? initial) + (['ArrowRight', 'ArrowUp'].includes(event.key) ? step : -step));
    }, options);
    render(Number(initial));
    const priorRender = setters.get(item.key);
    setters.set(item.key, value => {
      priorRender?.(value);
      render(Number(name === item.key ? value : value?.[name] ?? initial));
    });
    return row;
  };

  for (const item of config) {
    if (item.type === 'toggle') {
      const row = document.createElement('label'); row.className = 'labcfg__row labcfg__toggle-row'; row.dataset.type = 'toggle';
      const text = document.createElement('span'); text.className = 'labcfg__label text-mono-meta'; text.textContent = item.label;
      const control = document.createElement('input'); control.type = 'checkbox'; control.checked = typeof stored.values?.[item.key] === 'boolean' ? stored.values[item.key] : item.default;
      values[item.key] = control.checked; control.setAttribute('aria-label', item.label);
      control.addEventListener('change', () => setValue(item, control.checked), options);
      setters.set(item.key, value => { control.checked = Boolean(value); });
      row.append(text, control); body.append(row); instance.set(item.key, values[item.key]);
      continue;
    }
    if (item.type === 'range') {
      const saved = stored.values?.[item.key];
      values[item.key] = validStored(item, saved) ? Number(saved) : item.default;
      addRange(item, body, item.key, item.label, values[item.key]);
      instance.set(item.key, values[item.key]);
      continue;
    }
    if (item.type === 'segment' || item.type === 'swatch') {
      const row = document.createElement('div'); row.className = 'labcfg__row'; row.dataset.type = item.type;
      const label = document.createElement('span'); label.className = 'labcfg__label text-mono-meta'; label.textContent = item.label;
      const group = document.createElement('div'); group.className = 'labcfg__seg'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', item.label); group.style.setProperty('--seg-n', String(item.options.length));
      const pill = document.createElement('span'); pill.className = 'labcfg__seg-pill'; pill.setAttribute('aria-hidden', 'true'); group.append(pill);
      const saved = stored.values?.[item.key]; values[item.key] = validStored(item, saved) ? saved : item.default;
      const buttons = item.options.map((option, index) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'labcfg__seg-btn'; button.textContent = option.label || option.id;
        if (item.type === 'swatch') { button.title = option.id; button.style.setProperty('--swatch', option.value || option.id); }
        button.addEventListener('click', () => setValue(item, option.id), options); group.append(button); return { button, option, index };
      });
      const render = value => {
        buttons.forEach(({ button, option }) => button.setAttribute('aria-pressed', String(option.id === value)));
        const selected = buttons.find(({ option }) => option.id === value)?.index || 0;
        pill.style.transform = `translateX(${selected * 100}%)`;
      };
      setters.set(item.key, render); render(values[item.key]); row.append(label, group); body.append(row); instance.set(item.key, values[item.key]);
      continue;
    }
    if (item.type === 'easing' && Array.isArray(item.default)) {
      const row = document.createElement('div'); row.className = 'labcfg__row labcfg__row--stack'; row.dataset.type = 'easing';
      const label = document.createElement('span'); label.className = 'labcfg__label text-mono-meta'; label.textContent = item.label;
      const valuesArray = Array.isArray(stored.values?.[item.key]) ? stored.values[item.key] : item.default;
      values[item.key] = [...valuesArray]; row.append(label); body.append(row);
      const curveInputs = [];
      ['x1', 'y1', 'x2', 'y2'].forEach((axis, index) => {
        const line = document.createElement('label'); line.className = 'labcfg__row labcfg__curve-read';
        const caption = document.createElement('span'); caption.className = 'labcfg__label text-mono-meta'; caption.textContent = axis;
        const input = document.createElement('input'); input.type = 'range'; input.min = '-1'; input.max = '2'; input.step = '.01'; input.value = String(valuesArray[index]); input.setAttribute('aria-label', `${item.label} ${axis}`);
        input.addEventListener('input', () => { valuesArray[index] = Number(input.value); values[item.key] = [...valuesArray]; instance.set(item.key, [...valuesArray]); persist(); }, options);
        curveInputs.push(input); line.append(caption, input); row.append(line);
      });
      setters.set(item.key, value => curveInputs.forEach((input, index) => { input.value = String(value[index]); }));
      instance.set(item.key, [...valuesArray]);
      continue;
    }
    if (item.type === 'spring' && item.default && typeof item.default === 'object') {
      const row = document.createElement('div'); row.className = 'labcfg__row labcfg__row--stack'; row.dataset.type = 'spring';
      const label = document.createElement('span'); label.className = 'labcfg__label text-mono-meta'; label.textContent = item.label;
      const original = item.default; const valuesObject = { ...original, ...(stored.values?.[item.key] || {}) }; values[item.key] = valuesObject; row.append(label); body.append(row);
      for (const [name, val] of Object.entries(original)) {
        const lo = name.toLowerCase().includes('mass') ? .1 : 0;
        const hi = name.toLowerCase().includes('mass') ? 3 : 1;
        const step = name.toLowerCase().includes('mass') ? .1 : .01;
        addRange(item, row, name, name, valuesObject[name], lo, hi, step);
      }
      instance.set(item.key, valuesObject);
    }
  }

  toggle.hidden = false; panel.hidden = false;
  toggle.addEventListener('click', () => {
    const isOpen = !detail.classList.contains('is-config');
    detail.classList.toggle('is-config', isOpen); toggle.setAttribute('aria-expanded', String(isOpen));
  }, options);
  reset.addEventListener('click', () => {
    for (const item of config) {
      if (item.type === 'range') setValue(item, item.default, false);
      else if (item.type === 'segment' || item.type === 'swatch' || item.type === 'toggle') setValue(item, item.default, false);
      else if (item.type === 'easing' && Array.isArray(item.default)) { values[item.key] = [...item.default]; instance.set(item.key, [...item.default]); setters.get(item.key)?.(values[item.key]); }
      else if (item.type === 'spring') { values[item.key] = { ...item.default }; instance.set(item.key, values[item.key]); setters.get(item.key)?.(values[item.key]); }
    }
    persist();
  }, options);
  return () => {
    abort.abort(); body.replaceChildren(); detail.classList.remove('is-config');
    toggle.hidden = true; panel.hidden = true; toggle.setAttribute('aria-expanded', 'false');
  };
}
