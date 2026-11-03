// Signature ink model, signature pad, ink preview, RECEIVED stamp SVG and the
// customer-copy receipt painter — ported from Carter's app/lib/letter.js
// (functions F/I/L/fe/ue/de) with names expanded. Pure canvas/DOM; no three.js.
import { gsap } from 'gsap';

const INK = '#1b2440'; // pen blue-black
const PAPER = '#f3f2ef';
const SPOT = '#b03a1e';
const MONO_STACK = '"PP Neue Montreal Mono", "Geist Mono Variable", ui-monospace, monospace';
const BASE_WIDTH = 2.4;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Draw one stroke with velocity/pressure-derived widths + smoothing. */
function drawStroke(ctx, points, scale) {
  if (!points.length) return;
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, (BASE_WIDTH * scale) / 2, 0, 7);
    ctx.fill();
    return;
  }
  const widths = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const point = points[i];
    if (point.p > 0) widths.push(BASE_WIDTH * (0.6 + point.p * 0.95));
    else {
      const dt = Math.max(8, point.t - prev.t);
      const speed = (Math.hypot(point.x - prev.x, point.y - prev.y) / dt) * 16.667;
      widths.push(BASE_WIDTH * (1.12 - Math.min(speed / 22, 1) * 0.5));
    }
  }
  for (let pass = 0; pass < 2; pass++)
    for (let i = 1; i < widths.length - 1; i++)
      widths[i] = (widths[i - 1] + widths[i] * 2 + widths[i + 1]) / 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < points.length; i++) {
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.lineWidth = Math.max(0.4, widths[i] * scale);
    ctx.stroke();
  }
}

/* Paint strokes (normalized 0..1 coords) into a ctx region, fraction controls
   the progressive draw-on animation. */
export function paintInk(ctx, strokes, w, h, dpr, fraction = 1, aspect = w / h) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.globalAlpha = 0.92;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  let sw = h * aspect;
  let sh = h;
  if (sw > w) { sw = w; sh = w / aspect; }
  const offsetY = h - sh;
  const total = strokes.reduce((sum, s) => sum + s.length, 0);
  let budget = Math.ceil(total * Math.min(1, Math.max(0, fraction)));
  for (const stroke of strokes) {
    if (budget <= 0) break;
    const take = Math.min(stroke.length, budget);
    budget -= take;
    drawStroke(
      ctx,
      stroke.slice(0, take).map((p) => ({ ...p, x: p.x * sw, y: offsetY + p.y * sh })),
      sw / 640,
    );
  }
}

/* The small ink canvas on the letter (signature preview + draw-on animation). */
export function createInkPreview(host, canvas) {
  const ctx = canvas.getContext('2d');
  let strokes = [];
  let aspect = 640 / 240;
  let fraction = 1;
  let w = 1, h = 1, dpr = 1;
  const paint = () => paintInk(ctx, strokes, w, h, dpr, fraction, aspect);
  const resize = () => {
    const rect = host.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    paint();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  let tween = null;
  return {
    show(next, animate, nextAspect = aspect) {
      strokes = next;
      aspect = nextAspect;
      tween?.kill();
      if (!animate || reducedMotion() || !next.length) {
        fraction = 1;
        paint();
        return;
      }
      const proxy = { p: 0 };
      fraction = 0;
      paint();
      tween = gsap.to(proxy, {
        p: 1, duration: 0.55, ease: 'power1.inOut',
        onUpdate: () => { fraction = proxy.p; paint(); },
      });
    },
    dispose() { tween?.kill(); observer.disconnect(); },
  };
}

/* The signature pad used inside the slip <dialog>. Strokes are recorded in
   normalized coordinates with timestamp + pen pressure. */
export function createSignaturePad(box, canvas, onChange) {
  const ctx = canvas.getContext('2d');
  let strokes = [];
  let current = null;
  let w = 1, h = 1, dpr = 1;
  const paint = () => paintInk(ctx, current ? [...strokes, current] : strokes, w, h, dpr, 1);
  const resize = () => {
    const rect = box.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    paint();
  };
  const toPoint = (event) => {
    const rect = box.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      t: event.timeStamp,
      p: event.pointerType === 'pen' ? event.pressure : 0,
    };
  };
  const ac = new AbortController();
  const { signal } = ac;
  box.addEventListener('pointerdown', (event) => {
    if (event.button === 0 || event.pointerType !== 'mouse') {
      event.preventDefault();
      try { box.setPointerCapture(event.pointerId); } catch { /* noop */ }
      current = [toPoint(event)];
      paint();
    }
  }, { signal });
  box.addEventListener('pointermove', (event) => {
    if (!current) return;
    let events = event.getCoalescedEvents?.() ?? [];
    if (!events.length) events = [event];
    for (const e of events) current.push(toPoint(e));
    paint();
  }, { signal });
  const finish = (event) => {
    if (!current) return;
    strokes.push(current);
    current = null;
    try { box.releasePointerCapture(event.pointerId); } catch { /* noop */ }
    paint();
    onChange();
  };
  box.addEventListener('pointerup', finish, { signal });
  box.addEventListener('pointercancel', finish, { signal });
  const observer = new ResizeObserver(resize);
  observer.observe(box);
  resize();
  return {
    strokes: () => strokes.map((s) => s.slice()),
    aspect: () => w / h,
    set(next) { strokes = next.map((s) => s.slice()); paint(); },
    signed: () => strokes.length > 0,
    clear() { strokes = []; current = null; paint(); onChange(); },
    png(width = 640, height = 180) {
      if (!strokes.length) return '';
      const off = document.createElement('canvas');
      off.width = width * 2;
      off.height = height * 2;
      paintInk(off.getContext('2d'), strokes, width, height, 2, 1, w / h);
      return off.toDataURL('image/png');
    },
    resize,
    dispose() { ac.abort(); observer.disconnect(); },
  };
}

/* RECEIVED postmark stamp (SVG with roughened ink displacement). */
export function stampSvg(stampDate, seed) {
  return `<svg viewBox="0 0 300 132" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <filter id="letter-ink-${seed}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="${seed}" result="r"/>
      <feDisplacementMap in="SourceGraphic" in2="r" scale="1.4" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="${seed + 7}" result="m"/>
      <feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 3.5 -1.1" result="mm"/>
      <feComposite in="d" in2="mm" operator="in"/>
    </filter>
  </defs>
  <g filter="url(#letter-ink-${seed})" fill="none" stroke="var(--spot)">
    <rect x="5" y="5" width="290" height="122" rx="7" stroke-width="4.4"/>
    <rect x="14" y="14" width="272" height="104" rx="4" stroke-width="0.9"/>
    <line x1="14" y1="84" x2="286" y2="84" stroke-width="0.9"/>
    <text x="150" y="63" fill="var(--spot)" stroke="none" text-anchor="middle"
      font-family="PP Neue Montreal Mono, Geist Mono Variable, ui-monospace, monospace" font-size="42" font-weight="500"
      letter-spacing="3">RECEIVED</text>
    <text x="150" y="107" fill="var(--spot)" stroke="none" text-anchor="middle"
      font-family="PP Neue Montreal Mono, Geist Mono Variable, ui-monospace, monospace" font-size="17" letter-spacing="4">${stampDate}</text>
  </g>
</svg>`;
}

const seededRandom = (i) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/* "Keep a copy" — paints the customer-copy receipt PNG entirely client-side.
   Resolves with a Blob (900px wide, 2x scale, paper grain + postmark). */
export function renderReceipt(letter) {
  const mono = MONO_STACK;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `400 14px ${mono}`;
  const lines = [];
  for (const raw of letter.body.split(/\r?\n/)) {
    let line = '';
    for (const word of raw.split(' ')) {
      const attempt = line ? `${line} ${word}` : word;
      if (measure.measureText(attempt).width > 732 && line) { lines.push(line); line = word; }
      else line = attempt;
    }
    lines.push(line);
  }
  const count = Math.max(6, lines.length);
  const height = 470 + count * 30 + 300;
  const canvas = document.createElement('canvas');
  canvas.width = 1800;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, 900, height);
  for (let i = 0; i < 6000; i++) {
    const r = seededRandom(i * 1.7);
    ctx.fillStyle = r > 0.5 ? `rgba(0,0,0,${0.02 + r * 0.03})` : `rgba(255,255,255,${0.2 + r * 0.3})`;
    ctx.fillRect(seededRandom(i * 2.3) * 900, seededRandom(i * 3.1) * height, 1.2, 1.2);
  }
  const ink = '#1e1e1e';
  const muted = 'rgba(30,30,30,0.58)';
  const rule = 'rgba(30,30,30,0.22)';
  let y = 84;
  ctx.fillStyle = ink;
  ctx.font = '500 17px "Oracle", "Geist Variable", system-ui, sans-serif';
  ctx.fillText(letter.who, 84, y + 14);
  ctx.font = `400 11px ${mono}`;
  ctx.fillStyle = muted;
  ctx.fillText(letter.role.toUpperCase(), 84, y + 34);
  ctx.fillText(letter.reach.toUpperCase(), 84, y + 50);
  y += 70;
  ctx.fillStyle = rule;
  ctx.fillRect(84, y, 732, 1);
  y += 44;
  ctx.fillStyle = muted;
  ctx.font = `400 12px ${mono}`;
  ctx.fillText(letter.date, 84, y);
  y += 38;
  ctx.fillStyle = ink;
  ctx.font = `400 15px ${mono}`;
  ctx.fillText('Dear Carter,', 84, y);
  y += 40;
  ctx.font = `400 13px ${mono}`;
  ctx.fillStyle = muted;
  ctx.fillText('RE ::', 84, y);
  ctx.fillStyle = ink;
  ctx.fillText(`[X] ${letter.kind}`, 148, y);
  y += 34;
  ctx.fillStyle = muted;
  ctx.fillText('FROM ::', 84, y);
  ctx.fillStyle = ink;
  ctx.font = `400 14px ${mono}`;
  ctx.fillText(letter.from, 158, y);
  ctx.fillStyle = rule;
  ctx.fillRect(84, y + 10, 732, 1);
  y += 46;
  ctx.font = `400 14px ${mono}`;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = ink;
    if (lines[i]) ctx.fillText(lines[i], 84, y + i * 30 + 19);
    ctx.fillStyle = rule;
    ctx.fillRect(84, y + i * 30 + 30 - 1, 732, 1);
  }
  y += count * 30 + 44;
  ctx.fillStyle = ink;
  ctx.font = `400 15px ${mono}`;
  ctx.fillText('Sincerely,', 84, y);
  y += 16;
  const sigLayer = document.createElement('canvas');
  sigLayer.width = 1464;
  sigLayer.height = 220;
  paintInk(sigLayer.getContext('2d'), letter.signature, 732, 110, 2, 1, letter.aspect);
  ctx.drawImage(sigLayer, 84, y, 732, 110);
  y += 110;
  ctx.fillStyle = rule;
  ctx.fillRect(84, y, 732, 1);
  y += 22;
  ctx.fillStyle = ink;
  ctx.font = `400 13px ${mono}`;
  if (letter.name) ctx.fillText(letter.name, 84, y);
  const foot = height - 60;
  ctx.fillStyle = muted;
  ctx.font = `400 11px ${mono}`;
  ctx.fillText(`CUSTOMER COPY · ${letter.job} · ONE REPLY, NO NEWSLETTER`, 84, foot);
  return new Promise((resolve) => {
    const svg = stampSvg(letter.stampDate, letter.seed).replace(/var\(--spot\)/g, SPOT);
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.translate(701, y - 110 * 0.55);
      ctx.rotate((-9 * Math.PI) / 180);
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(img, -115, -101.2 / 2, 230, 101.2);
      ctx.restore();
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    };
    img.onerror = () => canvas.toBlob((blob) => resolve(blob), 'image/png');
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
