import './writing.css';
import { FOLDERS, FOLDERS_JSON, ROW_TAGS, WRITING_INDEX } from '../../data/writing.js';
import { Folders } from '../../engines/folders.js';
import { IndexReco } from '../../engines/index-reco.js';
import { useCarterEngine } from '../../useCarterEngine.js';

/*
 * Carter Writing index (`/writing`) inside Jesper's Carter frame (`/routes/writing`).
 *
 * Source: `app/pages/writing/index.astro` and captured `pages/writing.html` in
 * `sausageOps/carterogunsola-reconstruction` (read-only reference).
 *
 * Static DOM renders both Carter's hidden 3D folder shelf stage (`section.wstage[hidden]`)
 * and the visible classic archive (`div.writing__classic`). When WebGL is available and
 * `prefers-reduced-motion: reduce` is off, `Folders.init()` reveals `.wstage` and hides
 * `.writing__classic`; otherwise the classic index remains visible with `IndexReco`
 * driving the six category filter tabs.
 */

function ArrowIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path
        d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WritingPage() {
  useCarterEngine('writing-folders', () => Folders.init());
  useCarterEngine('writing-index-reco', () => IndexReco.init());

  return (
    <main id="main" className="writing" data-astro-cid-63pe4dpb="">
      <section
        className="wstage"
        data-folders=""
        data-lenis-prevent=""
        hidden
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Writing — a shelf of post folders. Arrow keys browse, Enter opens."
        data-astro-cid-63pe4dpb=""
      >
        <div className="wstage__ui container" data-astro-cid-63pe4dpb="">
          <div className="wstage__info" data-astro-cid-63pe4dpb="">
            <a
              className="wstage__info-btn"
              data-folders-title=""
              href="/writing"
              aria-describedby="wstage-tip wstage-excerpt"
              data-astro-cid-63pe4dpb=""
            >
              <svg
                width="1em"
                height="1em"
                aria-hidden="true"
                data-astro-cid-63pe4dpb="true"
                data-icon="circle-info"
              >
                <symbol id="ai:local:circle-info" viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M10.75 11H12v5.25M21.25 12a9.25 9.25 0 1 1-18.5 0 9.25 9.25 0 0 1 18.5 0"
                    />
                    <path
                      fill="currentColor"
                      strokeWidth=".25"
                      d="M12 7.375a.625.625 0 1 0 0 1.25.625.625 0 0 0 0-1.25Z"
                    />
                  </g>
                </symbol>
                <use href="#ai:local:circle-info" />
              </svg>
            </a>
            <div
              className="wstage__tip"
              id="wstage-tip"
              role="tooltip"
              aria-live="polite"
              data-astro-cid-63pe4dpb=""
            >
              <p className="wstage__tip-title" data-folders-tip-title="" data-astro-cid-63pe4dpb="" />
              <div className="wstage__tip-tags" data-astro-cid-63pe4dpb="">
                <span
                  className="chip text-meta"
                  data-folders-chip-date="true"
                  data-astro-cid-63pe4dpb="true"
                  data-astro-cid-ags4ogmk=""
                />
                <span
                  className="chip text-meta chip--pill"
                  data-folders-chip-year="true"
                  data-astro-cid-63pe4dpb="true"
                  data-astro-cid-ags4ogmk=""
                />
                <span
                  className="chip text-meta"
                  data-folders-chip-cat="true"
                  data-astro-cid-63pe4dpb="true"
                  data-astro-cid-ags4ogmk=""
                />
              </div>
            </div>
            <p
              className="u-sr-only"
              id="wstage-excerpt"
              data-folders-excerpt=""
              data-astro-cid-63pe4dpb=""
            />
          </div>
        </div>
        <script
          type="application/json"
          data-folders-data=""
          dangerouslySetInnerHTML={{ __html: FOLDERS_JSON }}
        />
      </section>

      <div className="writing__classic container" data-folders-classic="" data-astro-cid-63pe4dpb="">
        <div className="writing__col" data-astro-cid-63pe4dpb="">
          <header className="writing__intro" data-astro-cid-63pe4dpb="">
            <h1
              data-astro-cid-63pe4dpb="true"
              data-astro-cid-ywijwoia="true"
              className="section-label section-label--lg"
            >
              {WRITING_INDEX.title}
              <span className="section-label__mark" aria-hidden="true" data-astro-cid-ywijwoia="">
                {' '}::
              </span>
            </h1>
            <div className="writing__prose" data-astro-cid-63pe4dpb="">
              {WRITING_INDEX.intro.map((paragraph, idx) => (
                <p key={idx} className="text-lead" data-astro-cid-63pe4dpb="">
                  {paragraph}
                </p>
              ))}
            </div>
          </header>

          <section
            className="writing__archive"
            data-index-reco=""
            aria-label="2026 articles"
            data-astro-cid-63pe4dpb=""
          >
            <h2
              data-astro-cid-63pe4dpb="true"
              data-astro-cid-ywijwoia="true"
              className="section-label section-label--lg"
            >
              {WRITING_INDEX.archiveLabel}
              <span className="section-label__mark" aria-hidden="true" data-astro-cid-ywijwoia="">
                {' '}::
              </span>
            </h2>

            <div
              className="writing__filters"
              role="tablist"
              aria-label="Filter articles by category"
              data-astro-cid-63pe4dpb=""
            >
              {WRITING_INDEX.filters.map((cat) => (
                <button
                  key={cat}
                  className="writing__filter text-label"
                  type="button"
                  role="tab"
                  data-index-tab=""
                  data-cat={cat}
                  aria-selected={cat === 'all' ? 'true' : 'false'}
                  data-astro-cid-63pe4dpb=""
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>

            <div
              className="writing__card"
              data-index-rows=""
              data-row-list=""
              data-astro-cid-63pe4dpb=""
            >
              {FOLDERS.map((post) => {
                const slug = post.href.replace('/writing/', '');
                const tags = ROW_TAGS[slug] ?? { date: post.date, year: '' };
                return (
                  <a
                    key={post.href}
                    href={post.href}
                    data-hover="true"
                    data-cat={post.cat}
                    data-astro-cid-63pe4dpb="true"
                    data-astro-cid-karsvxoy="true"
                    className="row row--link"
                  >
                    <span className="row__label text-tag" data-astro-cid-karsvxoy="">
                      {post.title}
                    </span>
                    <span className="row__line" aria-hidden="true" data-astro-cid-karsvxoy="" />
                    <span className="row__tags" data-astro-cid-karsvxoy="">
                      <span
                        className="chip text-meta row__tag"
                        data-astro-cid-karsvxoy="true"
                        data-astro-cid-ags4ogmk=""
                      >
                        {tags.date}
                      </span>
                      <span
                        className="chip text-meta chip--pill row__tag"
                        data-astro-cid-karsvxoy="true"
                        data-astro-cid-ags4ogmk=""
                      >
                        {tags.year}
                      </span>
                      <span
                        className="chip text-meta row__tag"
                        data-astro-cid-karsvxoy="true"
                        data-astro-cid-ags4ogmk=""
                      >
                        {post.cat}
                      </span>
                      <span
                        className="linkcircle row__link"
                        aria-hidden="true"
                        data-astro-cid-karsvxoy="true"
                        data-astro-cid-l5seddro=""
                      >
                        <span className="arrow-roll" aria-hidden="true" data-astro-cid-klkmuj5r="">
                          <span className="arrow-roll__icon arrow-roll__current" data-astro-cid-klkmuj5r="">
                            <ArrowIcon />
                          </span>
                          <span className="arrow-roll__icon arrow-roll__next" data-astro-cid-klkmuj5r="">
                            <ArrowIcon />
                          </span>
                        </span>
                      </span>
                    </span>
                  </a>
                );
              })}
              <p
                className="writing__empty text-meta"
                data-index-empty=""
                style={{ display: 'none' }}
                aria-live="polite"
                data-astro-cid-63pe4dpb=""
              >
                {WRITING_INDEX.empty}
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
