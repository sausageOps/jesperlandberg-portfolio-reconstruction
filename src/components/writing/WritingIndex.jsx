/* /routes/writing — Carter's `pages/writing/index.astro` markup.
 *
 * Two blocks, exactly as the original: `section.wstage` (the WebGL folder shelf,
 * `hidden` until the engine binds — it unhides itself imperatively, and stays
 * hidden under reduced motion so the classic list is what renders) and
 * `div.writing__classic` (intro, 2026 archive, six filter tabs, rows, empty state).
 * The folder JSON is no longer an inline `application/json` script: the engine is
 * handed the same records from `src/data/writing.js` directly.
 */
import { useMemo, useState } from 'react'
import { FOLDERS, ROW_TAGS, WRITING_INDEX } from '../../data/writing.js'
import { LinkCircle, SectionLabel } from './ui.jsx'

const POST_SLUG = FOLDERS[0].href.split('/').pop()

const InfoIcon = () => (
  <svg width="1em" height="1em" aria-hidden="true" data-icon="circle-info" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.75 11H12v5.25M21.25 12a9.25 9.25 0 1 1-18.5 0 9.25 9.25 0 0 1 18.5 0" />
      <path fill="currentColor" strokeWidth=".25" d="M12 7.375a.625.625 0 1 0 0 1.25.625.625 0 0 0 0-1.25Z" />
    </g>
  </svg>
)

export default function WritingIndex({ stageRef, classicRef }) {
  const [filter, setFilter] = useState('all')
  const rows = useMemo(
    () => (filter === 'all' ? FOLDERS : FOLDERS.filter((folder) => folder.cat === filter)),
    [filter],
  )
  const tags = ROW_TAGS[POST_SLUG]

  return (
    <>
      <section
        className="wstage"
        data-folders=""
        data-lenis-prevent=""
        hidden
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Writing — a shelf of post folders. Arrow keys browse, Enter opens."
        ref={stageRef}
      >
        <div className="wstage__ui container">
          <div className="wstage__info">
            <a
              className="wstage__info-btn"
              data-folders-title=""
              href="/routes/writing"
              aria-describedby="wstage-tip wstage-excerpt"
            >
              <InfoIcon />
            </a>
            <div className="wstage__tip" id="wstage-tip" role="tooltip" aria-live="polite">
              <p className="wstage__tip-title" data-folders-tip-title="" />
              <div className="wstage__tip-tags">
                <span className="chip text-meta" data-folders-chip-date="true" />
                <span className="chip text-meta chip--pill" data-folders-chip-year="true" />
                <span className="chip text-meta" data-folders-chip-cat="true" />
              </div>
            </div>
            <p className="u-sr-only" id="wstage-excerpt" data-folders-excerpt="" />
          </div>
        </div>
      </section>

      <div className="writing__classic container" data-folders-classic="" ref={classicRef}>
        <div className="writing__col">
          <header className="writing__intro">
            <SectionLabel as="h1" mark>{WRITING_INDEX.title}</SectionLabel>
            <div className="writing__prose">
              {WRITING_INDEX.intro.map((paragraph, index) => (
                <p className="text-lead" key={index}>{paragraph}</p>
              ))}
            </div>
          </header>

          <section className="writing__archive" data-index-reco="" aria-label={`${WRITING_INDEX.archiveLabel} articles`}>
            <SectionLabel mark>{WRITING_INDEX.archiveLabel}</SectionLabel>
            <div className="writing__filters" role="tablist" aria-label="Filter articles by category">
              {WRITING_INDEX.filters.map((cat) => (
                <button
                  className="writing__filter text-label"
                  type="button"
                  role="tab"
                  key={cat}
                  data-index-tab=""
                  data-cat={cat}
                  aria-selected={filter === cat ? 'true' : 'false'}
                  onClick={() => setFilter(cat)}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
            <div className="writing__card" data-index-rows="" data-row-list="">
              {rows.map((folder) => (
                <a href={folder.href} data-hover="" data-cat={folder.cat} className="row row--link" key={folder.href}>
                  <span className="row__label text-tag">{folder.title}</span>
                  <span className="row__line" aria-hidden="true" />
                  <span className="row__tags">
                    <span className="chip text-meta row__tag">{tags?.date}</span>
                    <span className="chip text-meta chip--pill row__tag">{tags?.year}</span>
                    <span className="chip text-meta row__tag">{folder.cat}</span>
                    <LinkCircle diagonal diagonalRoll={false} className="row__link" />
                  </span>
                </a>
              ))}
              <p
                className="writing__empty text-meta"
                data-index-empty=""
                style={{ display: rows.length ? 'none' : undefined }}
                aria-live="polite"
              >
                {WRITING_INDEX.empty}
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
