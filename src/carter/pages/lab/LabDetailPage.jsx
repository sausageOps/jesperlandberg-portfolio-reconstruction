import { useEffect, useRef, useState } from 'react';
import './lab-detail.css';
import './lab-detail-ec.css';
import { labDocument, labHref, labImage } from '../../data/lab.js';
import PolkaDotsStage from './PolkaDotsStage.jsx';
import HeartStage from './HeartStage.jsx';

/*
 * Carter's shared Lab document (experiment detail page), static DOM and CSS.
 *
 * Source: `app/pages/lab/[slug].astro` and `app/components/LabDocument.astro` at
 * sausageOps/carterogunsola-reconstruction@3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249,
 * rendered through Carter's BaseLayout, plus `app/styles/lab-detail.css` and the
 * Expressive Code stylesheet it links from inside each Notes pane.
 *
 * Markup, classes, Astro scope attributes (data-astro-cid-f3pbbn5j / -mgnwo4tu),
 * data-* engine hooks, ARIA and copy are Carter's verbatim; the only
 * translations are HTML -> JSX mechanics (className, SVG camelCase, `set:html`
 * -> dangerouslySetInnerHTML) and the inlining of Carter's ArrowRoll component.
 *
 * What is deliberately inert / deferred (Phases 4B–5C):
 * - [data-experiment-viewport] holds Carter's engine mount point. Its source
 *   empty state ("Experiment coming soon" over the blurred poster) remains for
 *   the seven details without a ported engine. Polka Dots mounts its engine
 *   (Phase 5B, adopting the Phase 5A static `.pd > canvas` DOM) and Heart
 *   mounts its engine (Phase 5C, engine-generated `div.heart > canvas`);
 *   `data-stage-live` hides the empty state on those two routes.
 * - [data-config-toggle] / .labcfg stay `hidden`, exactly as Carter ships them
 *   until an experiment registers a config.
 * - The Code pane keeps its element and layout slot but its content is deferred:
 *   Carter's ~2 MB of captured Expressive Code listings and the ec.*.js enhancer
 *   arrive with the experiments (see README.md).
 * - No experiment engine beyond Polka Dots and Heart: no scene, wheel/drag
 *   control, timeline or media playback is mounted here, and the other seven
 *   details keep the placeholder state.
 *
 * Shell chrome that *is* live, matching Carter's shared lab-doc engine: the docs
 * toggle (.is-docs), the Notes/Code tabs (aria-pressed, tab-bg, pane visibility),
 * the docs scroll thumb, and Escape / "d" to close the docs.
 */
function ArrowRoll() {
  return (
    <span className="arrow-roll" aria-hidden="true">
      {['current', 'next'].map((position) => (
        <span className={`arrow-roll__icon arrow-roll__${position}`} key={position}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
            <path d="M14 5.75L20.25 12L14 18.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19.5 12H3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
    </span>
  );
}

const pad = (value) => String(value).padStart(2, '0');
const DIGITS = Array.from({ length: 10 }, (_, digit) => digit);

/** Carter's docs scrollbar readout: thumb size and offset from the pane scroll. */
function useDocsBar(open, activeTab) {
  const bodyRef = useRef(null);
  const barRef = useRef(null);
  const thumbRef = useRef(null);

  useEffect(() => {
    const body = bodyRef.current;
    const bar = barRef.current;
    const thumb = thumbRef.current;
    if (!body || !bar || !thumb) return undefined;

    const update = () => {
      const { scrollHeight, clientHeight, scrollTop } = body;
      const max = scrollHeight - clientHeight;
      if (max <= 1) {
        bar.removeAttribute('data-active');
        return;
      }
      bar.setAttribute('data-active', '');
      const track = bar.clientHeight;
      const size = Math.max(28, (clientHeight / scrollHeight) * track);
      thumb.style.height = `${size}px`;
      thumb.style.transform = `translateY(${(scrollTop / max) * (track - size)}px)`;
    };

    update();
    body.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      body.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [open, activeTab]);

  return { bodyRef, barRef, thumbRef };
}

export default function LabDetailPage({ slug }) {
  const labEntry = labDocument(slug);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('notes');
  const { bodyRef, barRef, thumbRef } = useDocsBar(open, tab);

  // Carter's lab-doc engine: "d" toggles the docs, Escape closes them.
  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape' && open) {
        setOpen(false);
        return;
      }
      if (event.key === 'd' || event.key === 'D') setOpen((value) => !value);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!labEntry) return null;
  const { item, previous, next, notes } = labEntry;
  const number = pad(item.position);
  const count = pad(item.total);

  const selectTab = (next_) => {
    if (next_ === tab) return;
    setTab(next_);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };

  return (
    <main id="main">
      <h1 className="u-sr-only">{item.name} — Lab experiment</h1>
      <div
        className={`labd${open ? ' is-docs' : ''}`}
        data-no-pulse=""
        data-lab-detail=""
        data-experiment={item.slug}
        data-name={item.name}
        data-prev-href={labHref(previous)}
        data-next-href={labHref(next)}
        data-prev-name={previous.name}
        data-next-name={next.name}
        data-position={number}
        data-total={count}
        data-astro-cid-f3pbbn5j=""
      >
        <button
          className="labd__toggle"
          type="button"
          data-docs-toggle=""
          aria-expanded={open}
          aria-controls="lab-docs"
          aria-label="Toggle docs"
          onClick={() => setOpen((value) => !value)}
          data-astro-cid-f3pbbn5j=""
        >
          <svg className="labd__toggle-icon labd__toggle-icon--book" width="1em" height="1em" aria-hidden="true" data-icon="book-open" data-astro-cid-f3pbbn5j="">
            <symbol id="ai:local:book-open" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 7v14m-9-3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></symbol>
            <use href="#ai:local:book-open" />
          </svg>
          <svg className="labd__toggle-icon labd__toggle-icon--x" width="1em" height="1em" aria-hidden="true" data-icon="close" data-astro-cid-f3pbbn5j="">
            <symbol id="ai:local:close" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5" /></symbol>
            <use href="#ai:local:close" />
          </svg>
        </button>

        <aside className="labd__docs" id="lab-docs" data-docs="" aria-label={`${item.name} — docs`} data-astro-cid-f3pbbn5j="">
          <div className="labd__docs-head" data-astro-cid-f3pbbn5j="">
            <div className="labd__tabs" role="group" aria-label="Docs view" data-docs-tabs="" data-astro-cid-f3pbbn5j="">
              <button
                className="labd__tab text-meta"
                type="button"
                data-docs-tab="notes"
                aria-pressed={tab === 'notes'}
                aria-controls="lab-docs-notes"
                onClick={() => selectTab('notes')}
                data-astro-cid-f3pbbn5j=""
              >
                {/* Carter's engine moves this pill into the pressed tab, which is
                    the same end state without the GSAP Flip. */}
                {tab === 'notes' && <span className="labd__tab-bg" data-docs-tab-bg="" aria-hidden="true" data-astro-cid-f3pbbn5j="" />}
                Notes
              </button>
              <button
                className="labd__tab text-meta"
                type="button"
                data-docs-tab="code"
                aria-pressed={tab === 'code'}
                aria-controls="lab-docs-code"
                onClick={() => selectTab('code')}
                data-astro-cid-f3pbbn5j=""
              >
                {tab === 'code' && <span className="labd__tab-bg" data-docs-tab-bg="" aria-hidden="true" data-astro-cid-f3pbbn5j="" />}
                Code
              </button>
            </div>
            <span className="labd__docs-tags" aria-hidden="true" data-astro-cid-f3pbbn5j="">
              <span className="chip text-meta">{item.category}</span>
              {item.isNew && <span className="chip text-meta chip--pill">New</span>}
            </span>
          </div>
          <div className="labd__docs-clip" data-astro-cid-f3pbbn5j="">
            <div
              className="labd__docs-body"
              ref={bodyRef}
              data-docs-scroll=""
              data-lenis-prevent=""
              data-astro-cid-f3pbbn5j=""
            >
              {/* Carter's verbatim Notes pane (summary, Dependencies RefRows, article). */}
              <div
                className="labd__pane"
                id="lab-docs-notes"
                data-docs-pane="notes"
                hidden={tab !== 'notes'}
                dangerouslySetInnerHTML={{ __html: notes }}
                data-astro-cid-f3pbbn5j=""
              />
              {/*
               * Deferred: Carter fills this pane with the captured, syntax-
               * highlighted Code listing for the experiment (and links the
               * Expressive Code enhancer from inside it). That lands with the
               * experiment phases; the pane and its layout slot stay here.
               */}
              <div
                className="labd__pane"
                id="lab-docs-code"
                data-docs-pane="code"
                hidden={tab !== 'code'}
                data-astro-cid-f3pbbn5j=""
              >
                <div className="labd__code-sec" data-astro-cid-f3pbbn5j="">
                  <p className="labd__summary text-lead" data-astro-cid-f3pbbn5j="">
                    The annotated source for {item.name} arrives with the experiment itself.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="labd__bar" ref={barRef} data-docs-scrollbar="" aria-hidden="true" data-astro-cid-f3pbbn5j="">
            <div className="labd__bar-thumb" ref={thumbRef} data-docs-thumb="" data-astro-cid-f3pbbn5j="" />
          </div>
        </aside>

        <section className="labd__stage" data-stage="" data-no-wake="" data-astro-cid-f3pbbn5j="">
          <div className="labd__viewport" data-experiment-viewport="" data-astro-cid-f3pbbn5j="">
            <div className="labd__empty" data-stage-empty="" data-astro-cid-f3pbbn5j="">
              <img
                className="labd__empty-bg u-cover"
                data-halftone=""
                src={labImage(item.poster, 720)}
                alt=""
                decoding="async"
                draggable="false"
                data-astro-cid-f3pbbn5j=""
              />
              <div className="labd__empty-content" data-astro-cid-f3pbbn5j="">
                <p className="labd__empty-name" data-astro-cid-f3pbbn5j="">{item.name}</p>
                <span className="labd__empty-tags" data-astro-cid-f3pbbn5j="">
                  <span className="chip text-meta">{item.category}</span>
                  {item.isNew && <span className="chip text-meta chip--pill">New</span>}
                </span>
                <p className="labd__empty-note text-meta" data-astro-cid-f3pbbn5j="">
                  <span className="labd__empty-note-soon" data-astro-cid-f3pbbn5j="">Experiment coming soon</span>
                  <span className="labd__empty-note-loading" data-astro-cid-f3pbbn5j="">Loading experiment</span>
                </p>
                <div className="labd__empty-loader" aria-hidden="true" data-astro-cid-f3pbbn5j="">
                  <span className="labd__empty-loader-bar" data-astro-cid-f3pbbn5j="" />
                </div>
              </div>
            </div>
            {item.slug === 'polka-dots' && <PolkaDotsStage />}
            {item.slug === 'heart' && <HeartStage />}
          </div>
        </section>

        <nav className="labd__nav" aria-label="Experiments" data-lab-nav="" data-astro-cid-f3pbbn5j="">
          <a className="labd__nav-seg labd__nav-arrow" href={labHref(previous)} data-lab-prev="" data-hover="" data-astro-cid-f3pbbn5j="">
            <ArrowRoll />
            <span className="u-sr-only" data-lab-prev-label="" data-astro-cid-f3pbbn5j="">Previous experiment: {previous.name}</span>
          </a>
          <a className="labd__nav-seg labd__nav-count text-meta" href="/lab" title="Back to Lab" aria-label={`${number} of ${count}, back to Lab`} data-astro-cid-f3pbbn5j="">
            <span className="labd__odo" data-lab-odo="" aria-hidden="true" data-astro-cid-f3pbbn5j="">
              {number.split('').map((digit, index) => (
                <span className="labd__odo-col" data-astro-cid-f3pbbn5j="" key={index}>
                  <span className="labd__odo-strip" data-odo-strip="" style={{ translate: `0 -${Number(digit)}em` }} data-astro-cid-f3pbbn5j="">
                    {DIGITS.map((value) => (
                      <span className="labd__odo-num" data-astro-cid-f3pbbn5j="" key={value}>{value}</span>
                    ))}
                  </span>
                </span>
              ))}
            </span>
            <span className="labd__odo-rest" aria-hidden="true" data-astro-cid-f3pbbn5j="">&#8201;/&#8201;{count}</span>
          </a>
          <a className="labd__nav-seg labd__nav-arrow" href={labHref(next)} data-lab-next="" data-hover="" data-astro-cid-f3pbbn5j="">
            <ArrowRoll />
            <span className="u-sr-only" data-lab-next-label="" data-astro-cid-f3pbbn5j="">Next experiment: {next.name}</span>
          </a>
        </nav>

        {/* Carter ships these hidden; an experiment's config reveals them. */}
        <button className="labd__tune" type="button" data-config-toggle="" aria-expanded="false" aria-controls="lab-config" aria-label="Tune" hidden data-astro-cid-f3pbbn5j="">
          <svg className="labd__tune-icon" width="1em" height="1em" aria-hidden="true" data-icon="sliders" data-astro-cid-f3pbbn5j="">
            <symbol id="ai:local:sliders" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="square" strokeWidth="1.5"><path clipRule="evenodd" d="M9 20a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 1 0 9 20Zm6-9.5A3.25 3.25 0 1 0 15 4a3.25 3.25 0 1 0 0 6.5Z" /><path d="M11.5 7.25H3.75m1.75 9.5H3.75m16.5-9.5H18.5m1.75 9.5H12.5" /></g></symbol>
            <use href="#ai:local:sliders" />
          </svg>
        </button>
        <aside className="labcfg" id="lab-config" data-config-panel="" hidden aria-label="Tune experiment" data-astro-cid-f3pbbn5j="">
          <div className="labcfg__head" data-astro-cid-f3pbbn5j="">
            <span className="labcfg__title text-label" data-astro-cid-f3pbbn5j="">Tune</span>
            <button className="labcfg__reset text-meta" type="button" data-config-reset="" data-astro-cid-f3pbbn5j="">Reset</button>
          </div>
          <div className="labcfg__tools" data-config-tools="" hidden data-astro-cid-f3pbbn5j="">
            <select className="labcfg__ver text-meta" data-config-versions="" aria-label="Version" data-astro-cid-f3pbbn5j="" />
            <button className="labcfg__tool" type="button" data-config-save="" aria-label="Save version" data-astro-cid-f3pbbn5j="">+</button>
            <button className="labcfg__tool" type="button" data-config-copy="" aria-label="Copy values as JSON" data-astro-cid-f3pbbn5j="">Copy</button>
          </div>
          <div className="labcfg__body" data-config-body="" data-astro-cid-f3pbbn5j="" />
        </aside>
      </div>
    </main>
  );
}
