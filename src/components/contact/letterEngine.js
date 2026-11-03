// The Contact "counter" — form states, validation notes, signature workflow,
// stub ticket updates, send/receive choreography — ported from Carter's
// app/lib/letter.js (function V + the module init class). Submission transport
// lives in ./contactApi.js (currently a documented mock).
import { gsap } from 'gsap';
import {
  createInkPreview, createSignaturePad, stampSvg, renderReceipt,
} from './renderers.js';
import { sendLetter } from './contactApi.js';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* VIA :: heuristic classifier from the original (used by Carter's analytics
   event; kept verbatim and mirrored to the mock log line). */
const SOURCE_PATTERNS = [
  ['referral', /\b(friend|colleague|client|coworker|co-worker|referr\w*|recommend\w*|introduc\w*|word of mouth)\b/i],
  ['awwwards', /\bawwwards?\b/i],
  ['webflow', /\b(webflow|made ?in ?webflow)\b/i],
  ['gallery', /\b(cssda|css ?design ?awards|fwa|css ?winner|top ?css|orpetron|godly|siteinspire|httpster|land-book|landbook|lapa|minimal ?gallery|one ?page ?love|dribbble|behance|codrops|gallery|showcase)\b/i],
  ['linkedin', /\blinked ?in\b/i],
  ['instagram', /\b(instagram|insta|ig)\b/i],
  ['x', /\b(x|twitter|tweet\w*|x\.com)\b/i],
  ['search', /\b(google|bing|duckduckgo|search\w*|chatgpt|gpt|claude|perplexity|gemini|ai)\b/i],
  ['work', /\b(your (work|site|website|portfolio|lab)|portfolio|saw (a|the|your) )/i],
];
function classifySource(raw) {
  const text = raw.trim();
  if (!text) return 'none';
  for (const [name, re] of SOURCE_PATTERNS) if (re.test(text)) return name;
  return /\b(told|sent|showed) me\b/i.test(text)
    || text.split(/\s+/).slice(1).some((w) => /^[A-Z][a-z]/.test(w))
    ? 'referral'
    : 'other';
}

const STUB_STATUS = {
  blank: 'BEING WRITTEN',
  writing: 'BEING WRITTEN',
  signed: 'SIGNED',
  incomplete: 'INCOMPLETE',
  sending: 'IN THE TRAY',
  received: 'RECEIVED',
  failed: 'NOT SENT',
};
const LINE_STATUS = {
  blank: 'NOT YET SIGNED',
  writing: 'NOT YET SIGNED',
  signed: 'SIGNED, UNSENT',
  incomplete: 'INCOMPLETE',
  sending: 'SENDING',
  received: 'RECEIVED',
  failed: 'NOT SENT',
};

const formatDate = (date) => date
  .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  .toUpperCase();

/* Carter's z-* entrance reveal (runtime.ts): y = masked line rise, x = rule
   draw, o = fade; the second/third index sets below/above-fold delays. */
const REVEAL_PATTERN = /^z-(y|s|o|x)(?:-(\d+))?(?:-(\d+))?$/;
export function initReveal(root) {
  if (reducedMotion()) return () => {};
  const items = [];
  root.querySelectorAll('[class*="z-"]').forEach((el) => {
    let match = null;
    for (const cls of el.classList) { match = REVEAL_PATTERN.exec(cls); if (match) break; }
    if (!match) return;
    const kind = match[1];
    const delayBelow = (match[2] ? parseInt(match[2], 10) : 0) / 10;
    const delayAbove = (match[3] ? parseInt(match[3], 10) : delayBelow * 10) / 10;
    const item = { el, kind, delayBelow, delayAbove, targets: [el], played: false };
    if (kind === 'o') gsap.set(el, { opacity: 0 });
    else if (kind === 'x') gsap.set(el, { scaleX: 0, transformOrigin: '0% 50%' });
    else if (kind === 'y') {
      const inner = document.createElement('span');
      inner.className = 'y';
      inner.innerHTML = el.innerHTML;
      el.innerHTML = '';
      el.classList.add('y_');
      el.append(inner);
      gsap.set(inner, { yPercent: 110 });
      item.targets = [inner];
    } else return; // 's' (multi-line splitter) is unused on the Contact page
    items.push(item);
  });
  if (!items.length) return () => {};

  const play = (item, aboveFold) => {
    if (item.played) return;
    item.played = true;
    const delay = aboveFold ? item.delayAbove : item.delayBelow;
    if (item.kind === 'o') {
      gsap.to(item.el, { opacity: 1, duration: 1, ease: 'power2.out', delay, clearProps: 'opacity' });
      return;
    }
    if (item.kind === 'x') {
      gsap.to(item.el, { scaleX: 1, duration: 1.4, ease: 'expo.out', delay, clearProps: 'transform' });
      return;
    }
    gsap.fromTo(item.targets, { yPercent: 110 }, {
      yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, delay, clearProps: 'transform',
    });
  };

  const above = items.filter((item) => item.el.getBoundingClientRect().top < innerHeight);
  const below = items.filter((item) => !above.includes(item));
  above.forEach((item) => play(item, true));
  let observer = null;
  if (below.length) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const item = below.find((candidate) => candidate.el === entry.target);
        if (item) { play(item, false); observer.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    below.forEach((item) => observer.observe(item.el));
  }
  return () => {
    observer?.disconnect();
    items.forEach((item) => gsap.killTweensOf(item.kind === 'y' ? item.targets : item.el));
  };
}

export function createLetterCounter(desk, form, stub, deskScene) {
  const $ = (sel) => desk.querySelector(sel);
  const email = $('[data-letter-email]');
  const body = $('[data-letter-body]');
  const name = $('[data-letter-name]');
  const source = $('[data-letter-source]');
  const sourceValue = () => source?.value.trim() ?? '';
  const statusLine = $('[data-letter-status]');
  const mailto = $('[data-letter-mailto]');
  const retry = $('[data-letter-retry]');
  const stamp = $('[data-letter-stamp]');
  const copyBtn = $('[data-letter-copy]');
  const sigHost = $('[data-letter-sig]');
  const inkCanvas = $('[data-letter-ink]');
  const clearBtn = $('[data-letter-clear]');
  const sendBtn = $('[data-letter-send]');
  const slip = $('[data-letter-slip]');
  const padBox = slip.querySelector('[data-letter-pad-box]');
  const padCanvas = slip.querySelector('[data-letter-pad]');
  const slipClear = slip.querySelector('[data-letter-slip-clear]');
  const slipDone = slip.querySelector('[data-letter-slip-done]');
  const noteFor = (key) => desk.querySelector(`[data-letter-note="${key}"]`);
  const ac = new AbortController();
  const { signal } = ac;

  const kind = () => desk.querySelector('[data-letter-kind]:checked')?.value ?? 'New business';
  const setStub = (key, value, filled = true) => {
    const cell = stub.querySelector(`[data-stub="${key}"]`);
    if (cell) { cell.textContent = value; cell.dataset.filled = filled ? '' : 'no'; }
  };

  let state = 'blank';
  let strokes = [];
  let aspect = 640 / 240;
  const isSigned = () => strokes.length > 0 || name.value.trim().length > 1;
  const hasWriting = () => email.value.trim().length > 0 || body.value.trim().length > 0;

  const flagError = (key, message = '') => {
    desk.dataset.letterError = key ?? '';
    [[email, 'email'], [body, 'body'], [name, 'sign']].forEach(([field, fieldKey]) => {
      if (key === fieldKey) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    });
    ['email', 'body', 'sign', 'send'].forEach((noteKey) => {
      const note = noteFor(noteKey);
      if (!note) return;
      const active = noteKey === key;
      note.hidden = !active;
      if (active && noteKey !== 'send' && message) note.textContent = message;
    });
  };

  const setState = (next) => {
    state = next;
    desk.dataset.letterState = next;
    statusLine.textContent = LINE_STATUS[next];
    const filled = next === 'received' || next === 'failed' || next === 'sending' || next === 'signed';
    setStub('status', STUB_STATUS[next], filled);
    if (sendBtn) sendBtn.disabled = next === 'sending' || next === 'received';
    if (next !== 'incomplete' && next !== 'failed') flagError(null);
  };

  const refresh = () => {
    if (state === 'sending' || state === 'received') return;
    setState(isSigned() ? 'signed' : hasWriting() ? 'writing' : 'blank');
  };

  const autosize = () => {
    body.style.height = 'auto';
    body.style.height = `${Math.max(body.scrollHeight, 180)}px`;
  };
  body.addEventListener('input', () => { autosize(); refresh(); }, { signal });
  email.addEventListener('input', refresh, { signal });
  autosize();

  const inkPreview = createInkPreview(sigHost, inkCanvas);
  const syncSignatureUi = () => {
    desk.toggleAttribute('data-letter-signed', isSigned());
    desk.toggleAttribute('data-letter-inked', strokes.length > 0);
    if (clearBtn) clearBtn.hidden = strokes.length === 0;
    refresh();
  };
  const pad = createSignaturePad(padBox, padCanvas, () => {
    if (slipClear) slipClear.hidden = !pad.signed();
  });

  const openSlip = () => {
    if (state === 'received' || state === 'sending') return;
    pad.set(strokes);
    if (slipClear) slipClear.hidden = strokes.length === 0;
    slip.showModal();
    pad.resize();
    if (!reducedMotion()) {
      gsap.fromTo(slip, { y: 28, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.4, ease: 'expo.out', clearProps: 'transform',
      });
    }
  };
  const closeSlip = (save) => {
    if (save) {
      strokes = pad.strokes();
      aspect = pad.aspect();
      inkPreview.show(strokes, true, aspect);
      syncSignatureUi();
    }
    const close = () => slip.close();
    if (reducedMotion()) close();
    else {
      gsap.to(slip, {
        y: 14, opacity: 0, duration: 0.18, ease: 'power2.in',
        onComplete: () => { close(); gsap.set(slip, { clearProps: 'all' }); },
      });
    }
  };
  sigHost.addEventListener('click', openSlip, { signal });
  sigHost.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openSlip(); }
  }, { signal });
  slipClear?.addEventListener('click', () => pad.clear(), { signal });
  slipDone?.addEventListener('click', () => closeSlip(true), { signal });
  slip.addEventListener('cancel', (event) => { event.preventDefault(); closeSlip(true); }, { signal });
  slip.addEventListener('click', (event) => { if (event.target === slip) closeSlip(true); }, { signal });
  name.addEventListener('input', syncSignatureUi, { signal });
  clearBtn?.addEventListener('click', () => {
    strokes = [];
    pad.clear();
    inkPreview.show([], false);
    syncSignatureUi();
  }, { signal });
  desk.querySelectorAll('[data-letter-kind]').forEach((radio) => {
    radio.addEventListener('change', () => setStub('file', kind().toUpperCase()), { signal });
  });
  setStub('file', kind().toUpperCase());
  setStub('job', '——', false);
  setStub('received', '——', false);
  setStub('replyby', '——', false);
  setState('blank');

  const receive = (job) => {
    const now = new Date();
    const replyBy = new Date(now.getTime() + 2592e5);
    const jobNo = job ?? (1000 + (now.getTime() % 9000));
    desk.setAttribute('data-letter-sent', '');
    setState('received');
    setStub('job', `N° ${jobNo}`);
    setStub('received', formatDate(now));
    setStub('replyby', formatDate(replyBy));
    [email, body, name, source].forEach((field) => { if (field) field.readOnly = true; });
    if (copyBtn) {
      copyBtn.hidden = false;
      copyBtn.onclick = async () => {
        copyBtn.disabled = true;
        const head = desk.querySelector('[data-letter-head]');
        const blob = await renderReceipt({
          who: head?.dataset.who ?? 'Carter Ogunsola',
          role: head?.dataset.role ?? '',
          reach: head?.dataset.reach ?? '',
          date: formatDate(now),
          kind: kind(),
          from: email.value.trim(),
          body: body.value.trim(),
          name: name.value.trim(),
          signature: strokes,
          aspect,
          stampDate: formatDate(now),
          seed: jobNo,
          job: `N° ${jobNo}`,
        });
        copyBtn.disabled = false;
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `letter-to-carter-${jobNo}.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      };
    }
    if (stamp) {
      stamp.innerHTML = stampSvg(formatDate(now), jobNo);
      stamp.hidden = false;
      if (!reducedMotion()) {
        gsap.fromTo(stamp, { scale: 1.28, opacity: 0, rotate: -15 }, {
          scale: 1, opacity: 1, rotate: -9, duration: 0.34, ease: 'expo.out',
        });
        deskScene?.strike?.();
      }
    }
  };

  const fail = (reason) => {
    setState('failed');
    const note = noteFor('send');
    const why = note?.querySelector('[data-letter-why]');
    if (why) {
      why.textContent = reason === 'offline'
        ? "You're offline — the letter never left the desk."
        : 'The counter is closed right now.';
    }
    flagError('send');
    if (mailto) {
      const subject = `${kind()} — from ${email.value.trim()}`;
      const text = `${body.value.trim()}\n\n— ${name.value.trim() || email.value.trim()}${sourceValue() ? `\n\nVia: ${sourceValue()}` : ''}`;
      mailto.href = `${mailto.dataset.base}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    }
  };

  const submit = async () => {
    if (state === 'received' || state === 'sending') return;
    if (!email.value.trim()) {
      setState('incomplete');
      flagError('email', 'a return address, or there is nowhere to reply');
      email.focus();
      return;
    }
    if (!email.checkValidity()) {
      setState('incomplete');
      flagError('email', 'that address does not look right');
      email.focus();
      return;
    }
    if (!body.value.trim()) {
      setState('incomplete');
      flagError('body', 'the letter is blank');
      body.focus();
      return;
    }
    if (!isSigned()) {
      setState('incomplete');
      flagError('sign', 'sign it, or type your name under the line');
      openSlip();
      return;
    }
    const demo = new URLSearchParams(location.search).get('counter');
    if (demo === 'offline' || !navigator.onLine) { fail('offline'); return; }
    setState('sending');
    try {
      if (demo === 'closed') {
        await new Promise((resolve) => setTimeout(resolve, 700));
        throw new Error('closed');
      }
      const job = await sendLetter({
        kind: kind(),
        email: email.value.trim(),
        body: body.value.trim(),
        name: name.value.trim(),
        source: sourceValue(),
        signature: pad.png(),
      });
      console.info('[contact mock] generate_lead', { lead_type: kind(), lead_source: classifySource(sourceValue()) });
      receive(job);
    } catch {
      fail(navigator.onLine ? 'closed' : 'offline');
    }
  };

  form.addEventListener('submit', (event) => { event.preventDefault(); submit(); }, { signal });
  retry?.addEventListener('click', () => void submit(), { signal });
  window.addEventListener('online', () => { if (state === 'failed') refresh(); }, { signal });

  return {
    dispose() {
      ac.abort();
      pad.dispose();
      inkPreview.dispose();
      if (slip.open) slip.close();
    },
  };
}
