/* /routes/writing/:slug — Carter's `pages/writing/the-personal-starter.astro`.
 *
 * Same structure and hooks: the collapsible TOC rail (`data-flight-wait`), the
 * flight close box, and the paper column (`data-flight-paper`) holding the claim,
 * masthead, date, title, TL;DR, prose, credits and signature. The folder JSON
 * script is replaced by the data module the shelf engine already reads.
 */
import { CREDITS, POST, TOC } from '../../data/writing.js'
import WritingArticle from './WritingArticle.jsx'
import { CloseBox, RefRow, SectionLabel, Signature } from './ui.jsx'

const Chevron = () => (
  <svg width="1em" height="1em" className="toc__chev-icon" aria-hidden="true" data-icon="chevron-right" viewBox="0 0 24 24" fill="none">
    <path d="M9 5.75 15.25 12 9 18.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const CloseIcon = () => (
  <svg width="1em" height="1em" aria-hidden="true" data-icon="close" viewBox="0 0 24 24">
    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5" />
  </svg>
)

export default function WritingPost({ slug }) {
  return (
    <main
      className="wpost container"
      data-writing-post=""
      data-folders-slug={slug}
    >
      <aside className="wpost__rail" data-flight-wait="">
        <nav className="toc is-open" data-toc="" aria-label="Table of contents">
          <div className="toc__head">
            <span className="toc__id">
              <svg className="toc__ring" viewBox="0 0 14 14" aria-hidden="true" style={{ '--ring-c': 34.558 }}>
                <circle className="toc__ring-track" cx="7" cy="7" r="5.5" />
                <circle
                  className="toc__ring-fill"
                  data-toc-ring=""
                  cx="7"
                  cy="7"
                  r="5.5"
                  strokeDasharray="34.558"
                  strokeDashoffset="34.558"
                />
              </svg>
              <span className="toc__label text-label">Table of content</span>
            </span>
            <button
              className="toc__chev"
              type="button"
              data-toc-toggle=""
              aria-expanded="true"
              aria-controls="toc-list"
              aria-label="Collapse table of contents"
            >
              <Chevron />
            </button>
          </div>
          <div className="toc__body" id="toc-list" data-toc-body="">
            <div className="toc__clip">
              <ol className="toc__list">
                {TOC.map((item, index) => (
                  <li key={item.id}>
                    <a
                      className="toc__item text-meta"
                      href={`#${item.id}`}
                      data-toc-item=""
                      data-toc-active={index === 0 ? '' : undefined}
                    >
                      {index === 0 && <span className="toc__item-bg" data-toc-bg="" aria-hidden="true" />}
                      <span className="toc__dot" aria-hidden="true" />
                      <span className="toc__text">{item.label}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </nav>
      </aside>

      <div className="wpost__close">
        <CloseBox
          href="/routes/writing"
          label="Close — back to writing"
          className="closebox--md closebox--fill"
          data-flight-wait="true"
        >
          <CloseIcon />
        </CloseBox>
      </div>

      <article className="wpost__col" data-flight-paper="">
        <div className="wpost__claim" data-sheet-claim="" aria-hidden="true" />
        <p className="wpost__masthead text-label" aria-hidden="true">
          <span>{POST.masthead}</span><span>{POST.num}</span>
        </p>
        <p className="wpost__date"><span aria-hidden="true">:: </span>{POST.date}</p>
        <h1 className="wpost__title">{POST.title}</h1>
        <aside className="wpost__tldr" aria-label="TL;DR">
          <p className="wpost__tldr-label text-label">TL;DR</p>
          <p className="wpost__tldr-text">{POST.tldr}</p>
        </aside>

        <WritingArticle />

        <section className="wpost__credits" aria-label="Credits">
          <p className="wpost__credits-label text-label">Credits</p>
          <div className="wpost__credits-rule" aria-hidden="true" />
          <div className="wpost__credits-list">
            {CREDITS.map((credit) => (
              <RefRow
                key={credit.href}
                href={credit.href}
                label={credit.label}
                icon="globe"
                labelClass="text-tag"
                stretch
              />
            ))}
          </div>
          <div className="wpost__credits-rule" aria-hidden="true" />
        </section>

        <div className="wpost__signoff">
          <p>Sincerely,</p>
          <Signature className="wpost__sig" />
        </div>
      </article>
    </main>
  )
}
