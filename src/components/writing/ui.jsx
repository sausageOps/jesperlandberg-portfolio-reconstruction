/* Carter UI primitives used by the Writing routes, ported 1:1 from
 * `app/components/ui/*.astro` (read-only reference). Only the markup each route
 * actually renders is included; the sprite symbols are inlined per-icon exactly as
 * the original pages do, so no shared sprite is required under Vite. */
import { useRef } from 'react'

/* SectionLabel.astro — `<h1 class="section-label section-label--lg">Title<span
 * class="section-label__mark"> ::</span></h1>` (mark is aria-hidden). */
export function SectionLabel({ as: Tag = 'h2', size = 'lg', mark = false, markText = ' ::', className = '', children }) {
  return (
    <Tag className={['section-label', `section-label--${size}`, className].filter(Boolean).join(' ')}>
      {children}
      {mark && <span className="section-label__mark" aria-hidden="true">{markText}</span>}
    </Tag>
  )
}

/* ArrowRoll.astro — the two stacked glyphs the hover roll slides between. */
export function ArrowRoll({ diagonal = false, diagonalRoll, className = '' }) {
  const rollDiagonal = diagonalRoll ?? diagonal
  const glyph = diagonal
    ? <path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    : (
      <>
        <path d="M14 5.75L20.25 12L14 18.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19.5 12H3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )
  return (
    <span className={['arrow-roll', rollDiagonal && 'arrow-roll--diagonal', className].filter(Boolean).join(' ')} aria-hidden="true">
      <span className="arrow-roll__icon arrow-roll__current">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">{glyph}</svg>
      </span>
      <span className="arrow-roll__icon arrow-roll__next">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">{glyph}</svg>
      </span>
    </span>
  )
}

/* LinkCircle.astro — diagonal glyph, flat roll (Carter's `.linkcircle` default). */
export function LinkCircle({ diagonal = false, diagonalRoll, className = '' }) {
  return (
    <span className={['linkcircle', className].filter(Boolean).join(' ')} aria-hidden="true">
      <ArrowRoll diagonal={diagonal} diagonalRoll={diagonalRoll} />
    </span>
  )
}

/* CloseBox.astro — an anchor when `href` is given (the post passes one). */
export function CloseBox({ href, label = 'Close', variant = 'default', size = 'md', className = '', children, ...rest }) {
  const Tag = href ? 'a' : 'button'
  return (
    <Tag
      href={href}
      type={href ? undefined : 'button'}
      aria-label={label}
      className={[
        'closebox',
        size !== 'md' && `closebox--${size}`,
        variant !== 'default' && `closebox--${variant}`,
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children ?? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </Tag>
  )
}

const GLOBE_PATH = (
  <>
    <path d="M12 21.25a9.25 9.25 0 1 1 0-18.5 9.25 9.25 0 0 1 0 18.5Z" />
    <path d="M12 2.75c2.28 2.36 3.42 5.44 3.42 9.25S14.28 18.89 12 21.25c-2.28-2.36-3.42-5.44-3.42-9.25S9.72 5.11 12 2.75Z" />
    <path d="M3.1 8.9h17.8M3.1 15.1h17.8" />
  </>
)

/* RefRow.astro — badge chip + label chip + external arrow, single hover surface. */
export function RefRow({ href, badge = 'REF', label, icon, labelClass = 'text-caption', stretch = false, external = true, className = '' }) {
  const Tag = href ? 'a' : 'span'
  return (
    <Tag
      href={href}
      target={href && external ? '_blank' : undefined}
      rel={href && external ? 'noopener noreferrer' : undefined}
      data-hover={href ? '' : undefined}
      className={['refrow', href && 'refrow--link', stretch && 'refrow--stretch', className].filter(Boolean).join(' ')}
    >
      <span className="refrow__badge">
        {icon ? (
          <svg width="1em" height="1em" viewBox="0 0 24 24" className="refrow__icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {icon === 'globe' ? GLOBE_PATH : null}
          </svg>
        ) : (
          <span className="refrow__wordmark text-mono-sm">{badge}</span>
        )}
      </span>
      <span className={['refrow__label', labelClass].filter(Boolean).join(' ')}>{label}</span>
      {href && (
        <span className="refrow__ext" aria-hidden="true">
          <ArrowRoll diagonal={external} />
        </span>
      )}
    </Tag>
  )
}

/* Signature.astro — the hand-drawn SVG path, copied verbatim. */
export const SIGNATURE_PATH = 'M2 88.9456C55.784 76.5215 191.196 51.7674 274.826 23.7476C334.221 3.84742 337.508 -5.77007 243.577 9.56486C149.646 24.8998 37.9703 88.5267 29.722 127.977C13.4431 205.837 316.853 80.9592 276.575 82.6084C244.834 83.9081 180.958 112.5 206.563 120.165C237.48 129.42 272.863 114.718 285.462 100.025C300.893 82.0273 301.127 140.001 222.664 140.001C220.987 140.001 225.74 138.422 243.579 132.817C282.011 120.744 333.646 99.8913 376.974 88.9455C406.796 81.4117 217.494 148 301.127 148.962C355.109 149.583 542.975 64.9965 428.679 118.029C366.194 147.021 515.241 139.258 556.329 129.041C628.401 111.119 731.609 50.6349 708.58 34.8267C662.174 2.97263 360.921 106.976 403.403 154.658C432.562 187.387 636.491 97.9544 628.26 80.5907C605.432 32.4348 486.945 110.13 538.165 130.476C618.254 162.288 790.777 42.4844 658.137 111.452C632.25 124.912 590.416 148.592 568.46 161.052C508.857 194.877 627.218 132.266 653.385 124.03C757.953 91.1157 752.806 130.719 895 114.799'

export function Signature({ className = '' }) {
  return (
    <span className={['signature', className].filter(Boolean).join(' ')} data-signature>
      <svg className="signature__svg" role="img" aria-label="Carter Ogunsola signature" overflow="visible" viewBox="0 0 897 173" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path className="signature__path" d={SIGNATURE_PATH} stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/* ExpressiveCode.astro — the post's two highlighted blocks, gutter off. The copy
 * button keeps the original `\u007f`-joined payload and `data-copied` feedback. */
export function ExpressiveCode({ language = 'ts', code, lines, maxLine, className = '' }) {
  const copyRef = useRef(null)
  const rawLines = lines ?? code.split('\n').map((line) => ({
    html: line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    indent: null,
  }))
  const copyData = code.replace(/\n/g, '\u007f')

  const copy = async (event) => {
    const button = event.currentTarget
    const payload = button.getAttribute('data-code')?.split('\u007f').join('\n') ?? ''
    try {
      await navigator.clipboard.writeText(payload)
    } catch {
      const pre = document.createElement('pre')
      pre.textContent = payload
      Object.assign(pre.style, { position: 'absolute', opacity: '0', pointerEvents: 'none' })
      document.body.appendChild(pre)
      pre.select?.()
      try { document.execCommand('copy') } catch { /* noop */ }
      document.body.removeChild(pre)
    }
    button.classList.add('is-copied')
    button.setAttribute('data-copied', 'Copied!')
    window.setTimeout(() => button.classList.remove('is-copied'), 1200)
  }

  return (
    <div className={['expressive-code', className].filter(Boolean).join(' ')}>
      <figure className="frame">
        <figcaption className="header" />
        <pre data-language={language} className="wrap" style={maxLine ? { '--ecMaxLine': maxLine } : undefined}>
          <code>
            {rawLines.map((line, index) => (
              <div
                className="ec-line"
                key={index}
                style={line.indent ? { '--ecIndent': line.indent } : undefined}
              >
                <div className="code" dangerouslySetInnerHTML={{ __html: line.html || '&nbsp;' }} />
              </div>
            ))}
          </code>
        </pre>
        <div className="copy">
          <div aria-live="polite" />
          <button
            ref={copyRef}
            type="button"
            title="Copy to clipboard"
            data-copied="Copied!"
            data-code={copyData}
            onClick={copy}
          >
            <div />
          </button>
        </div>
      </figure>
    </div>
  )
}
