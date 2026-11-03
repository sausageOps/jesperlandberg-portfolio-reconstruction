import { useEffect, useRef } from 'react';
import './Contact.css';
import { createDeskScene } from './deskScene.js';
import { createLetterCounter, initReveal } from './letterEngine.js';

/* Carter's solid button (Button.astro): label rolls character by character on
   hover via stacked text-shadow copies (.roll span --index stagger). */
function Roll({ label }) {
  return (
    <span className="roll" data-roll>
      {[...label].map((char, i) => (
        <span key={i} style={{ '--index': i, whiteSpace: char === ' ' ? 'pre' : undefined }}>
          {char}
        </span>
      ))}
    </span>
  );
}

function SolidButton({ label, className = '', ...rest }) {
  return (
    <button type="button" className={`btn btn--solid text-tag ${className}`.trim()} {...rest}>
      <Roll label={label} />
    </button>
  );
}

/* Carter Logo.astro with word="O" — shapes only (aria-hidden). */
function LogoMark() {
  return (
    <span className="logo" aria-hidden="true">
      <span className="logo__shape logo__circle">C</span>
      <span className="logo__shape logo__capsule logo__capsule--single">
        <span className="logo__word">O</span>
      </span>
    </span>
  );
}

/**
 * Recreation of carterogunsola.com/contact (letter + receipt desk) nested at
 * the existing /myself/contact route. All behavior is engine-driven against
 * the data-letter-* hooks below, mirroring Carter's Contact engine; the mock
 * transport is documented in contactApi.js.
 */
export default function Contact({ appReady = true }) {
  const rootRef = useRef(null);
  const deskRef = useRef(null);
  const canvasRef = useRef(null);
  const formRef = useRef(null);
  const stubRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!appReady || startedRef.current) return undefined;
    startedRef.current = true;

    const desk = deskRef.current;
    const form = formRef.current;
    const stub = stubRef.current;
    const canvas = canvasRef.current;

    // The original updates the date on every client visit (page is static).
    const dateEl = desk.querySelector('[data-letter-date]');
    if (dateEl) {
      dateEl.textContent = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      }).format(new Date()).toUpperCase();
    }

    // Reveal wraps the date before we ever touch it again; keep its node.
    const cleanupReveal = initReveal(desk);
    if (dateEl) {
      const label = dateEl.querySelector('.y') ?? dateEl;
      label.textContent = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      }).format(new Date()).toUpperCase();
    }

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scene = null;
    if (!reduced) {
      desk.setAttribute('data-letter-posed', '');
      scene = createDeskScene(desk, canvas, form, stub);
      if (!scene) desk.removeAttribute('data-letter-posed');
      else scene.entrance();
    }
    const counter = createLetterCounter(desk, form, stub, scene);

    return () => {
      startedRef.current = false;
      cleanupReveal();
      counter.dispose();
      scene?.dispose();
    };
  }, [appReady]);

  return (
    <div className="cletter-scroll" ref={rootRef}>
      <main className="letterpage">
        <h1 className="u-sr-only">Contact</h1>
        <section className="desk" data-letter ref={deskRef}>
          <canvas className="desk__canvas" data-letter-canvas aria-hidden="true" ref={canvasRef} />

          <form className="sheet" data-letter-sheet noValidate autoComplete="on" method="post" action="/api/contact" ref={formRef}>
            <div className="sheet__in">
              <header
                className="sheet__head"
                data-letter-head
                data-who="Carter Ogunsola"
                data-role="Creative Developer & Brand Engineer"
                data-reach="hello@carterogunsola.com · Utah, USA"
              >
                <span className="sheet__mark" data-letter-mark><LogoMark /></span>
                <div className="sheet__lh">
                  <p className="sheet__name z-y-1">Carter Ogunsola</p>
                  <p className="sheet__line z-y-2">Creative Developer &amp; Brand Engineer</p>
                  <p className="sheet__line z-y-3">
                    <a href="mailto:hello@carterogunsola.com">hello@carterogunsola.com</a> · Utah, USA
                  </p>
                </div>
                <i className="sheet__rule z-x-2" aria-hidden="true" />
              </header>

              <p className="sheet__date z-y-4" data-letter-date />
              <p className="sheet__salut z-y-5">Dear Carter,</p>

              <fieldset className="sheet__re">
                <legend className="sheet__label z-y-5">RE ::</legend>
                <label className="sheet__kind z-y-6">
                  <input type="radio" name="kind" value="New business" defaultChecked data-letter-kind />
                  <span className="sheet__box" aria-hidden="true" /><span>New business</span>
                </label>
                <label className="sheet__kind z-y-6">
                  <input type="radio" name="kind" value="A collaboration" data-letter-kind />
                  <span className="sheet__box" aria-hidden="true" /><span>A collaboration</span>
                </label>
                <label className="sheet__kind z-y-7">
                  <input type="radio" name="kind" value="Just a hello" data-letter-kind />
                  <span className="sheet__box" aria-hidden="true" /><span>Just a hello</span>
                </label>
              </fieldset>

              <label className="sheet__field sheet__field--email">
                <span className="sheet__label z-y-6">FROM ::</span>
                <input
                  className="z-o-7"
                  type="email"
                  name="email"
                  placeholder="you@studio.com"
                  required
                  data-letter-email
                  aria-describedby="note-email"
                />
                <i className="sheet__rule z-x-7" aria-hidden="true" />
              </label>
              <p className="sheet__note" id="note-email" data-letter-note="email" hidden />

              <label className="sheet__field sheet__field--via">
                <span className="sheet__label z-y-7">VIA ::</span>
                <input
                  className="z-o-8"
                  type="text"
                  name="source"
                  maxLength="120"
                  placeholder="A friend, Awwwards, X, a search… (optional)"
                  autoComplete="off"
                  data-letter-source
                />
                <i className="sheet__rule z-x-8" aria-hidden="true" />
              </label>

              <label className="sheet__body" data-letter-rules>
                <span className="sr-only">The letter</span>
                <textarea
                  className="z-o-9"
                  name="body"
                  rows="6"
                  placeholder="What are we making?"
                  required
                  data-letter-body
                  aria-describedby="note-body"
                />
              </label>
              <p className="sheet__note" id="note-body" data-letter-note="body" hidden />

              <p className="sheet__close z-y-2-10">Sincerely,</p>
              <div
                className="sig"
                data-letter-sig
                tabIndex="0"
                role="button"
                aria-label="Sign your name"
                aria-haspopup="dialog"
              >
                <canvas className="sig__ink" data-letter-ink aria-hidden="true" />
                <span className="sig__ghost z-y-2-11" aria-hidden="true">sign here</span>
                <i className="sheet__rule z-x-2-11" aria-hidden="true" />
              </div>
              <div className="sheet__typed">
                <span className="sheet__typed-in z-y-3-12">
                  <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    aria-label="Your name"
                    autoComplete="name"
                    data-letter-name
                    aria-describedby="note-sign"
                  />
                </span>
                <button type="button" className="sig__clear" data-letter-clear hidden>clear signature</button>
              </div>
              <p className="sheet__note" id="note-sign" data-letter-note="sign" hidden />

              <footer className="sheet__foot">
                <p className="sheet__status z-y-3-13">
                  ONE REPLY, NO NEWSLETTER · <span data-letter-status aria-live="polite">NOT YET SIGNED</span>
                </p>
                <span className="sheet__send z-y-4-13">
                  <SolidButton label="Send it" data-letter-send type="submit" />
                </span>
                <button type="button" className="sheet__copy" data-letter-copy hidden>Keep a copy</button>
              </footer>

              <p className="sheet__note sheet__note--send" data-letter-note="send" hidden role="alert">
                <span data-letter-why>The counter is closed right now.</span>
                <a data-letter-mailto data-base="mailto:hello@carterogunsola.com" href="mailto:hello@carterogunsola.com">Send it by email instead</a>
                <button type="button" className="sheet__retry" data-letter-retry>or try again</button>
              </p>
              <div className="stamp" data-letter-stamp hidden aria-hidden="true" />
            </div>
          </form>

          <dialog className="slip" data-letter-slip aria-label="Sign your name">
            <div className="slip__in">
              <p className="slip__head">
                <span>SIGN HERE</span>
                <span className="slip__hint">WITH YOUR FINGER, MOUSE OR PEN</span>
              </p>
              <div className="slip__pad" data-letter-pad-box>
                <canvas className="slip__canvas" data-letter-pad aria-label="Signature pad" />
                <span className="slip__x" aria-hidden="true">✕</span>
              </div>
              <div className="slip__foot">
                <button type="button" className="slip__clear" data-letter-slip-clear hidden>Clear</button>
                <SolidButton label="Done" data-letter-slip-done />
              </div>
            </div>
          </dialog>

          <aside className="stub" data-letter-stub aria-label="Job ticket" ref={stubRef}>
            <p className="stub__head">CARTER OGUNSOLA:: PRESS</p>
            <p className="stub__sub">INTAKE · COUNTER 01</p>
            <dl className="stub__rows">
              <div><dt>JOB</dt><dd data-stub="job">——</dd></div>
              <div><dt>RECEIVED</dt><dd data-stub="received">——</dd></div>
              <div><dt>REPLY BY</dt><dd data-stub="replyby">——</dd></div>
              <div><dt>STATUS</dt><dd data-stub="status">BEING WRITTEN</dd></div>
              <div><dt>FILE UNDER</dt><dd data-stub="file">NEW BUSINESS</dd></div>
            </dl>
            <span className="stub__bars" aria-hidden="true" />
            <p className="stub__foot">KEEP THIS HALF</p>
          </aside>
        </section>
      </main>
    </div>
  );
}
