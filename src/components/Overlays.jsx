import { useEffect, useRef, useState } from 'react';
import { site } from '../data/projects.js';

function Profile() {
  const [copied, setCopied] = useState(false);
  const [copyLeaving, setCopyLeaving] = useState(false);
  const timer = useRef(null);
  const exitTimer = useRef(null);
  useEffect(() => () => {
    clearTimeout(timer.current);
    clearTimeout(exitTimer.current);
  }, []);

  const copyEmail = async (event) => {
    if (!navigator.clipboard) return;
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      setCopyLeaving(false);
      clearTimeout(timer.current);
      clearTimeout(exitTimer.current);
      timer.current = setTimeout(() => setCopyLeaving(true), 1000);
      exitTimer.current = setTimeout(() => {
        setCopied(false);
        setCopyLeaving(false);
      }, 1500);
    } catch {
      window.location.href = `mailto:${site.email}`;
    }
  };

  return (
    <div className="overlay-disc profile-disc">
      <div className="profile-content overlay-content" data-gl-shield>
        <p className="overlay-intro">Jesper Landberg, Swedish design engineer, named Awwwards Independent of the Year in 2022 and 2024, building visually rich, motion-driven websites. Usually lead or sole developer, responsible for front-end architecture, animation, interaction and CMS, alongside international agencies and creative teams.</p>
        <p className="label overlay-credits">{site.awards}</p>
        <ul className="profile-links">
          {site.profiles.map((profile) => (
            <li key={profile.label}><a className="label" href={profile.url} target="_blank" rel="noopener noreferrer">{profile.label}</a></li>
          ))}
          <li className="email-link">
            <a className="label" href={`mailto:${site.email}`} onClick={copyEmail}>Email</a>
            {copied && <span className={`copied label ${copyLeaving ? 'is-leaving' : ''}`}>Copied</span>}
          </li>
        </ul>
      </div>
    </div>
  );
}

function Newsletter({ onClose, focusDelay = 200 }) {
  const input = useRef(null);
  const [status, setStatus] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      const timer = setTimeout(() => input.current?.focus(), focusDelay);
      return () => clearTimeout(timer);
    }
  }, [focusDelay]);

  const submit = (event) => {
    event.preventDefault();
    const email = input.current?.value.trim() || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInvalid(true);
      setStatus('That address does not look right, one more try.');
      input.current?.focus();
      return;
    }
    setInvalid(false);
    setBusy(true);
    setStatus('Submitting…');
    const timer = setTimeout(() => {
      setBusy(false);
      setStatus('This reconstruction does not transmit subscriptions.');
    }, 450);
    return () => clearTimeout(timer);
  };

  return (
    <div className="overlay-disc newsletter-disc">
      <div className="newsletter-content overlay-content" data-gl-shield>
        <p className="overlay-intro">An occasional newsletter with insights and thoughts from a design engineer, drawn from over a decade of freelancing.</p>
        <form className="newsletter-form" noValidate aria-busy={busy} onSubmit={submit}>
          <div className={`newsletter-field ${invalid ? 'is-invalid' : ''}`}>
            <input
              ref={input}
              type="email"
              name="email"
              aria-label="Email address"
              aria-invalid={invalid}
              placeholder="Email address"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              enterKeyHint="send"
              disabled={busy}
              onChange={() => { setInvalid(false); setStatus(''); }}
              onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}
            />
          </div>
          <button className="newsletter-submit" type="submit" aria-label="Subscribe" disabled={busy}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" /></svg>
          </button>
          <input className="newsletter-company" type="text" name="company" tabIndex="-1" autoComplete="off" aria-hidden="true" />
        </form>
        <p className="label newsletter-status" role="status" aria-live="polite"><span>{status}</span></p>
      </div>
    </div>
  );
}

export default function Overlays({ type, onClose }) {
  const [current, setCurrent] = useState(type);
  const [leaving, setLeaving] = useState(false);
  const [enterDelay, setEnterDelay] = useState(0.2);
  const transitionTimer = useRef(null);
  const layer = useRef(null);

  useEffect(() => () => clearTimeout(transitionTimer.current), []);
  useEffect(() => {
    if (type === current) return;
    clearTimeout(transitionTimer.current);
    if (!current) {
      setEnterDelay(0.2);
      setCurrent(type);
      setLeaving(false);
      return;
    }
    setLeaving(true);
    transitionTimer.current = setTimeout(() => {
      setEnterDelay(type ? 0 : 0.2);
      setCurrent(type);
      setLeaving(false);
    }, type ? 350 : 220);
  }, [type, current]);

  useEffect(() => {
    const element = layer.current;
    if (!current || !element || !window.matchMedia('(max-width: 649px)').matches) return undefined;
    const interactive = [...element.querySelectorAll('a, button, input, textarea, select')];
    const previousLayerEvents = element.style.pointerEvents;
    const previousEvents = interactive.map((node) => node.style.pointerEvents);
    element.style.pointerEvents = 'none';
    interactive.forEach((node) => { node.style.pointerEvents = 'auto'; });

    const withinDisc = (event, disc) => {
      const rect = disc.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      return Math.hypot(dx, dy) <= rect.width / 2;
    };
    const capture = (event) => {
      if (leaving) return;
      const disc = element.querySelector('.overlay-disc');
      if (!disc || disc.contains(event.target)) return;
      if (withinDisc(event, disc)) {
        event.stopPropagation();
        event.preventDefault();
      }
    };
    const bubble = (event) => {
      if (leaving) return;
      const disc = element.querySelector('.overlay-disc');
      if (!disc || event.target.closest?.('button') || disc.contains(event.target)) return;
      if (window.location.pathname.startsWith('/projects/')) return;
      if (!event.target.closest?.('a') && withinDisc(event, disc)) return;
      onClose();
    };
    window.addEventListener('click', capture, true);
    window.addEventListener('click', bubble);
    return () => {
      window.removeEventListener('click', capture, true);
      window.removeEventListener('click', bubble);
      element.style.pointerEvents = previousLayerEvents;
      interactive.forEach((node, index) => { node.style.pointerEvents = previousEvents[index]; });
    };
  }, [current, leaving, onClose]);

  if (!current) return null;
  const handleClick = (event) => {
    if (event.target.closest('a, button, input, textarea, select')) return;
    const disc = event.currentTarget.querySelector('.overlay-disc');
    if (!disc) return;
    const rect = disc.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) <= rect.width / 2) {
      event.preventDefault();
      return;
    }
    onClose();
  };
  return (
    <div
      ref={layer}
      className={`overlay-layer ${leaving ? 'is-leaving' : ''}`}
      style={{ '--overlay-enter-delay': `${enterDelay}s` }}
      aria-hidden={leaving || undefined}
      inert={leaving}
      onClick={handleClick}
    >
      {current === 'profile' ? <Profile /> : <Newsletter onClose={onClose} focusDelay={enterDelay * 1000} />}
    </div>
  );
}
