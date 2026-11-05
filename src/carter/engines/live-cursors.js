/**
 * Live Cursors — Carter app/lib/experiments/live-cursors.js and the required
 * glyphs/socket from app/lib/runtime.ts, at 3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249.
 * Uses Carter's actual presence host, and his reconstruction's opt-in socket
 * behavior (?realtime=live). The socket can remain closed without affecting
 * the rest of the page; no alternative service or simulated peers are used.
 */
import gsap from 'gsap';
import { onDestroy } from '../runtime.js';

const LEFT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M13.6262 12.7752L18.0914 11.0286C19.4037 10.5153 19.3481 8.63955 18.0078 8.20483L6.29674 4.40666C5.13162 4.02878 4.02927 5.13113 4.40715 6.29625L8.20532 18.0073C8.64004 19.3477 10.5158 19.4032 11.0291 18.0909L12.7757 13.6257C12.9282 13.236 13.2365 12.9277 13.6262 12.7752Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 14L16.6049 15.7762C16.2277 15.9286 15.9286 16.2277 15.7762 16.6049L14 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
`;
const RIGHT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M10.3739 12.7752L5.90868 11.0286C4.59639 10.5153 4.65197 8.63955 5.99235 8.20483L17.7034 4.40666C18.8685 4.02878 19.9708 5.13113 19.593 6.29625L15.7948 18.0073C15.3601 19.3477 13.4843 19.4032 12.971 18.0909L11.2244 13.6257C11.072 13.236 10.7636 12.9277 10.3739 12.7752Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 14L7.39513 15.7762C7.77231 15.9286 8.07141 16.2277 8.22383 16.6049L10 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
`;

// Extracted from Carter's runtime Et, isolated here rather than importing the
// Astro site runtime. Listeners are detached on close to avoid late callbacks.
class PresenceSocket extends EventTarget {
  constructor({ host, room, party }) {
    super();
    this.host = host;
    this.room = room;
    this.party = party;
    this.id = 'local-peer';
    this.readyState = 3;
    this.ws = null;
    this.listeners = null;
    if (new URLSearchParams(window.location.search).get('realtime') === 'live') this.reconnect();
  }
  reconnect() {
    this.close();
    try {
      const ws = new WebSocket(`wss://${this.host}/parties/${this.party}/${this.room}`);
      this.ws = ws;
      this.readyState = 0;
      this.listeners = {
        open: () => { this.readyState = 1; this.dispatchEvent(new Event('open')); },
        message: (event) => this.dispatchEvent(new MessageEvent('message', { data: event.data })),
        close: (event) => {
          this.readyState = 3;
          const closed = new Event('close');
          closed.code = event.code;
          this.dispatchEvent(closed);
        },
        error: () => { this.readyState = 3; },
      };
      for (const [name, listener] of Object.entries(this.listeners)) ws.addEventListener(name, listener);
    } catch { this.readyState = 3; }
  }
  send(data) {
    if (this.ws && this.readyState === 1) {
      try { this.ws.send(data); } catch { /* Carter ignores send errors. */ }
    }
  }
  close() {
    this.readyState = 3;
    if (this.ws) {
      if (this.listeners) for (const [name, listener] of Object.entries(this.listeners)) this.ws.removeEventListener(name, listener);
      try { this.ws.close(); } catch { /* already closed */ }
      this.ws = null;
      this.listeners = null;
    }
  }
}

const clamp = (value) => value < 0 ? 0 : value > 1 ? 1 : value;
const defaults = { smoothing: 18, size: 1 };
export const config = [
  { key: 'smoothing', label: 'Smoothing', type: 'range', min: 4, max: 40, step: 1, default: defaults.smoothing },
  { key: 'size', label: 'Size', type: 'range', min: .6, max: 1.8, step: .1, default: defaults.size },
];
const colors = ['#3f76b5', '#838348', '#c2661f', '#9c6b77', '#a67f1e', '#8670a2'];
const adjectives = ['quiet', 'swift', 'warm', 'spare', 'lucid', 'keen', 'soft', 'bright'];
const animals = ['otter', 'heron', 'lynx', 'moth', 'fox', 'wren', 'koi', 'hare'];
function hash(id) {
  let value = 0;
  for (let i = 0; i < id.length; i++) value = value * 31 + id.charCodeAt(i) | 0;
  return Math.abs(value);
}

export function mountLiveCursors(viewport) {
  if (!viewport) return null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const settings = { ...defaults };
  const root = document.createElement('div');
  root.className = 'lc';
  const hint = document.createElement('p');
  hint.className = 'lc__hint';
  hint.textContent = fine
    ? "Open this page in another tab or on another device :: you'll see each other move."
    : "Others' cursors show up here. Touch has no pointer, so you're here in spirit.";
  root.appendChild(hint);
  viewport.appendChild(root);

  const peers = new Map();
  let socket, abort, heartbeat, keepalive, observer, tick, destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    abort?.abort();
    if (heartbeat !== undefined) window.clearInterval(heartbeat);
    if (keepalive !== undefined) window.clearInterval(keepalive);
    if (tick) gsap.ticker.remove(tick);
    observer?.disconnect();
    socket?.close();
    peers.forEach((peer) => peer.el.remove()); peers.clear(); root.remove();
  };
  try {
  socket = new PresenceSocket({ host: 'carter-2026-presence.carterogunsola7589.workers.dev', room: 'live-cursors', party: 'presence' });
  abort = new AbortController();
  const send = (data) => { try { socket.send(data); } catch { /* original ignores errors */ } };
  heartbeat = window.setInterval(() => send('{"type":"ping"}'), 20000);
  let x = 0, y = 0, hasPointer = false, lastSend = 0, sentX = -1, sentY = -1;
  const sendPointer = (force = false) => {
    if (!hasPointer || socket.readyState !== 1) return;
    const now = performance.now();
    if ((!force && now - lastSend < 50) || (!force && x === sentX && y === sentY)) return;
    send(JSON.stringify({ type: 'cursor', x: clamp(x), y: clamp(y) }));
    sentX = x; sentY = y; lastSend = now;
  };
  if (fine) root.addEventListener('pointermove', (event) => {
    const rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    x = (event.clientX - rect.left) / rect.width;
    y = (event.clientY - rect.top) / rect.height;
    hasPointer = true;
    sendPointer();
  }, { signal: abort.signal });
  keepalive = window.setInterval(() => { if (!document.hidden) sendPointer(true); }, 4000);
  let width = root.clientWidth, height = root.clientHeight;
  observer = new ResizeObserver(() => { width = root.clientWidth; height = root.clientHeight; });
  observer.observe(root);

  function removePeer(id) {
    const peer = peers.get(id);
    if (!peer) return;
    peer.el.remove();
    peers.delete(id);
    if (!peers.size) hint.style.opacity = '1';
  }
  function updatePeer(id, targetX, targetY) {
    let peer = peers.get(id);
    if (!peer) {
      const h = hash(id), color = colors[h % colors.length];
      const el = document.createElement('div'); el.className = 'lc__peer';
      const ptr = document.createElement('span'); ptr.className = 'lc__ptr'; ptr.style.color = color; ptr.innerHTML = RIGHT;
      const name = document.createElement('span'); name.className = 'lc__name'; name.style.background = color;
      name.textContent = `${adjectives[h % adjectives.length]} ${animals[(h >> 3) % animals.length]}`;
      el.append(ptr, name);
      el.style.transform = `translate3d(${targetX * width}px, ${targetY * height}px, 0) scale(${settings.size})`;
      root.appendChild(el);
      peer = { id, tx: targetX, ty: targetY, x: targetX, y: targetY, dir: 1, shownDir: 1, last: performance.now(), el, ptr };
      peers.set(id, peer);
    }
    if (targetX > peer.tx + .004) peer.dir = 1;
    else if (targetX < peer.tx - .004) peer.dir = -1;
    peer.tx = targetX; peer.ty = targetY; peer.last = performance.now();
    if (reduced) { peer.x = targetX; peer.y = targetY; }
    hint.style.opacity = '0';
  }
  const onMessage = (event) => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === 'cursors' && Array.isArray(message.c)) {
      for (const entry of message.c) {
        if (!Array.isArray(entry) || typeof entry[0] !== 'string' || entry[0] === socket.id) continue;
        if (typeof entry[1] === 'number' && typeof entry[2] === 'number') updatePeer(entry[0], clamp(entry[1]), clamp(entry[2]));
      }
    } else if (message.type === 'cursor' && typeof message.id === 'string' && typeof message.x === 'number' && typeof message.y === 'number') {
      updatePeer(message.id, clamp(message.x), clamp(message.y));
    } else if (message.type === 'leave' && typeof message.id === 'string') removePeer(message.id);
  };
  socket.addEventListener('message', onMessage);
  tick = (_time, delta) => {
    const now = performance.now(), dt = Math.min(delta, 50) / 1000;
    const smoothing = reduced ? 1 : 1 - Math.exp(-settings.smoothing * dt);
    for (const peer of peers.values()) {
      if (now - peer.last > 12000) { removePeer(peer.id); continue; }
      peer.x += (peer.tx - peer.x) * smoothing; peer.y += (peer.ty - peer.y) * smoothing;
      peer.el.style.transform = `translate3d(${peer.x * width}px, ${peer.y * height}px, 0) scale(${settings.size})`;
      if (peer.dir !== peer.shownDir) { peer.ptr.innerHTML = peer.dir === 1 ? RIGHT : LEFT; peer.shownDir = peer.dir; }
    }
  };
  gsap.ticker.add(tick);
  onDestroy(destroy);
  return { destroy, set: (key, value) => { if (key in settings) settings[key] = Number(value); } };
  } catch (error) {
    destroy();
    throw error;
  }
}
