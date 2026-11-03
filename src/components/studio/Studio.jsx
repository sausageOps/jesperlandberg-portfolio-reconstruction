/* Studio page — Jesper re-implementation of the Carter /studio document and engine
 * (Carter reference: app/pages/studio.astro + app/styles/studio.css + app/lib/lanyard.js,
 * read-only). Markup order, copy, data-* wiring and classes follow Carter 1:1:
 * sr-only h1 -> lanyard stage (hidden until the engine mounts) -> infotip ->
 * classic fallback tile. Carter's Astro components (InfoTip, LinkCircle, ArrowRoll)
 * are carried here as tiny local React atoms with identical markup/CSS.
 *
 * Jesper mapping differences (behavior-preserving):
 *  - arrival: Carter waits for the global `veil:reveal` (ClientRouter). Jesper's
 *    loader gate (`appReady`) plays that slot — the engine mounts with
 *    veilActive=!appReady and the hook descends when the app is revealed.
 *  - theme: Carter observes html[data-theme]; Jesper keeps no theme attr today,
 *    so the light strap palette persists (observer kept, no visual effect).
 */
import { useEffect, useRef } from 'react'
import { mountLanyard, prefersReducedMotion } from './lanyardScene.js'
import './Studio.css'

/* Carter badge copy (verbatim from studio.astro) */
const BADGE = {
  name: 'Carter Ogunsola',
  role: 'Founder & Creative Developer',
  studio: 'Balky Studio',
  line: 'We make the web fun again',
  addr: 'BALKY.STUDIO',
  place: 'Utah, USA',
  year: '2026',
}
const STUDIO_URL = 'https://www.balky.studio/'

/* ArrowRoll (Carter components/ui/ArrowRoll.astro) — double glyph stack that rolls
 * on parents carrying [data-hover]/[data-selected]; diagonal modifier flips the roll
 * axis. The studio name roll uses the diagonal glyph with the FLAT (horizontal) roll,
 * i.e. class="arrow-roll" only — LinkCircle diagonal diagonalRoll={false}. */
function ArrowRoll({ diagonal = false, diagonalRoll }) {
  const diag = diagonal && (diagonalRoll ?? diagonal)
  const glyph = diagonal ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M14 5.75L20.25 12L14 18.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 12H3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <span className={`arrow-roll${diag ? ' arrow-roll--diagonal' : ''}`} aria-hidden="true">
      <span className="arrow-roll__icon arrow-roll__current">{glyph}</span>
      <span className="arrow-roll__icon arrow-roll__next">{glyph}</span>
    </span>
  )
}

/* LinkCircle (Carter components/ui/LinkCircle.astro) */
function LinkCircle({ diagonal = false, diagonalRoll }) {
  return (
    <span className="linkcircle" aria-hidden="true">
      <ArrowRoll diagonal={diagonal} diagonalRoll={diagonalRoll} />
    </span>
  )
}

/* InfoTip (Carter components/ui/InfoTip.astro, href variant for /studio):
 * icon trigger + sibling tooltip ([data-place=top]); hover/focus reveal lives in CSS. */
function InfoTip({ title, place = 'top', label = 'Stage controls', href, tipId, titleTag = 'span', titleClass = 'text-mono-meta', externalIcon = false }) {
  const TitleTag = titleTag
  return (
    <div className="infotip" data-place={place}>
      <a
        className="stage-ibtn infotip__btn"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        aria-describedby={tipId}
        data-hover
      >
        <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
          <g fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.75 11H12v5.25M12 7.375a.625.625 0 1 0 .001 1.249A.625.625 0 0 0 12 7.375m9.25 4.625a9.25 9.25 0 1 1-18.5 0 9.25 9.25 0 0 1 18.5 0" />
          </g>
        </svg>
      </a>
      <div className="infotip__tip" id={tipId} role="tooltip">
        <TitleTag className={`infotip__title ${titleClass}`}>
          {title}
          {externalIcon && (
            <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.25 15.25v-9.5m0 0h-9.5m9.5 0L6 18" />
            </svg>
          )}
        </TitleTag>
      </div>
    </div>
  )
}

/* Balky flag — verbatim paths from studio.astro (served markup), mask id kept. */
function BalkyFlag() {
  return (
    <svg style={{ display: 'block', width: '100%', height: 'auto' }} viewBox="0 -5 43 47" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <mask id="balky-flag-mask-studio" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="2" width="38" height="22">
        <path d="M5.27133 4.91922C5.27133 4.91922 14.075 7.09747 19.391 3.34013C24.707 -0.417198 37.4864 4.91922 37.4864 4.91922L33.5106 21.9247C33.5106 21.9247 23.003 15.2021 16.7553 20.2242C10.5076 25.2462 0 21.9247 0 21.9247L5.27133 4.91922Z" fill="#D9D9D9" />
      </mask>
      <g mask="url(#balky-flag-mask-studio)">
        <path d="M6.04547 -2.10032C6.61636 -3.89376 8.53303 -4.88483 10.3265 -4.31393L19.3022 -1.45676L10.3435 26.6866L1.36781 23.8294C-0.425629 23.2585 -1.4167 21.3418 -0.845808 19.5484L6.04547 -2.10032Z" fill="#F25116" />
        <path d="M19.3022 -1.45676L29.488 1.78563L20.5293 29.929L10.3435 26.6866L19.3022 -1.45676Z" fill="#545251" />
        <path d="M29.488 1.78563L37.6367 4.37954L28.678 32.5229L20.5293 29.929L29.488 1.78563Z" fill="#A6A5A4" />
        <path d="M37.6367 4.37954L40.0934 5.16159C41.8869 5.73248 42.8779 7.64915 42.307 9.44259L35.4158 31.0913C34.8449 32.8848 32.9282 33.8758 31.1348 33.3049L28.678 32.5229L37.6367 4.37954Z" fill="#DFDBD8" />
      </g>
      <path d="M36.5126 4.66331L38.1617 5.09201L28.7544 41.561L26.9218 41.5533L36.5126 4.66331Z" fill="#DFDBD8" />
    </svg>
  )
}

export default function Studio({ appReady = false }) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const classicRef = useRef(null)
  const veilReadyRef = useRef(false)

  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    const classic = classicRef.current
    if (!stage || !canvas) return

    /* Carter x.init(): reduced motion -> don't mount WebGL at all (classic tile stays). */
    if (prefersReducedMotion()) return

    const veilActive = !veilReadyRef.current && !appReady
    const dispose = mountLanyard(stage, canvas, BADGE, { veilActive })
    if (dispose) {
      stage.hidden = false
      if (classic) classic.hidden = true
    } else {
      /* no WebGL context: keep the classic tile (Carter: $e returns null) */
      if (classic) classic.hidden = false
      stage.hidden = true
      return
    }

    return () => {
      dispose?.()
    }
    /* mount once — arrival is driven by the veil:reveal dispatch below,
     * Carter's exact contract (engine waits for reveal when the veil is up) */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Jesper loader gate mapped onto Carter's veil:reveal contract. */
  useEffect(() => {
    if (!appReady || veilReadyRef.current) return
    veilReadyRef.current = true
    document.dispatchEvent(new CustomEvent('veil:reveal'))
  }, [appReady])

  return (
    <main className="studio">
      <h1 className="u-sr-only">Studio</h1>

      <section
        ref={stageRef}
        className="lstage"
        data-lanyard
        data-lanyard-name={BADGE.name}
        data-lanyard-role={BADGE.role}
        data-lanyard-studio={BADGE.studio}
        data-lanyard-line={BADGE.line}
        data-lanyard-addr={BADGE.addr}
        data-lanyard-place={BADGE.place}
        data-lanyard-year={BADGE.year}
        hidden
        tabIndex={0}
        role="group"
        aria-label="Balky Studio's badge. Drag to swing it."
      >
        <canvas ref={canvasRef} className="lstage__canvas" data-lanyard-canvas></canvas>
        <div className="lstage__info">
          <InfoTip
            title="balky.studio"
            place="top"
            label="Visit Balky Studio"
            href={STUDIO_URL}
            tipId="studio-tip"
            titleTag="p"
            titleClass="text-label"
            externalIcon
          />
        </div>
      </section>

      <div ref={classicRef} className="studio__classic container" data-lanyard-classic>
        <div className="studio__unit">
          <a className="studio__link" href={STUDIO_URL} target="_blank" rel="noopener noreferrer" data-hover>
            <span className="studio__tile">
              <span className="studio__flag">
                <BalkyFlag />
              </span>
            </span>
            <span className="studio__name text-h6">Balky Studio<LinkCircle diagonal diagonalRoll={false} /></span>
          </a>
          <p className="studio__meta text-meta">We make the web fun again</p>
        </div>
      </div>
    </main>
  )
}
