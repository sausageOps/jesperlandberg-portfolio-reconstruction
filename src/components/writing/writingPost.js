/* Writing post engine — port of Carter `app/lib/writing-post.js`
 * (recovered `src/writing-post.CB6dnry2.js`): the collapsible table of contents,
 * the scrollspy + ring progress, click-to-scroll with Carter's -120px offset, and
 * the `folders:pose-release` handshake that waits for the folder flight to let go
 * of the paper before the scrollspy starts measuring.
 *
 * Carter's Astro runtime calls init() once per route commit; here the React post
 * component calls it from an effect and gets a cleanup function back. Imports are
 * re-pointed: gsap stands in for the recovered `ou`, `flip` for `jl`, the scroll
 * offset for `su.scrollTo` (Carter scrolls the page; Jesper scrolls the fixed
 * writing layer, so the caller supplies the scroller element).
 */
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { FoldersFlight } from './foldersFlight.js'

gsap.registerPlugin(Flip)

const SCROLLSPY_ANCHOR = 0.35 // Carter's `a` — the read line sits 35% down the viewport

/**
 * @param {HTMLElement} root  the `main.wpost` element
 * @param {object} [opts]
 * @param {HTMLElement} [opts.scroller] element that actually scrolls (default window)
 * @param {number} [opts.offset]        click-to-scroll offset (Carter: -120)
 * @returns {() => void} cleanup
 */
export function initWritingPost(root, { scroller = null, offset = -120 } = {}) {
  if (!root) return () => {}
  const controller = new AbortController()
  const { signal } = controller

  const article = root.querySelector('[data-post-article]')
  const toc = root.querySelector('[data-toc]')
  const toggle = root.querySelector('[data-toc-toggle]')
  const ring = root.querySelector('[data-toc-ring]')
  const items = [...root.querySelectorAll('[data-toc-item]')]

  const setOpen = (open) => {
    toc?.classList.toggle('is-open', open)
    toggle?.setAttribute('aria-expanded', String(open))
    toggle?.setAttribute('aria-label', open ? 'Collapse table of contents' : 'Expand table of contents')
  }
  toggle?.addEventListener('click', () => setOpen(!toc?.classList.contains('is-open')), { signal })
  if (window.matchMedia('(max-width: 79.99rem)').matches) setOpen(false)

  if (!article) {
    return () => controller.abort()
  }

  const sections = items
    .map((a) => ({ a, h: document.getElementById(decodeURIComponent(a.hash.slice(1))) }))
    .filter((entry) => Boolean(entry.h))

  const bg = root.querySelector('[data-toc-bg]')
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let animateBg = false
  let frame = 0

  const setActive = (active) => {
    items.forEach((item) => {
      if (item === active) item.setAttribute('data-toc-active', '')
      else item.removeAttribute('data-toc-active')
    })
    if (!bg || bg.parentElement === active) return
    if (animateBg && !reduced()) {
      const state = Flip.getState(bg)
      active.prepend(bg)
      Flip.from(state, { duration: 0.35, ease: 'power3.inOut', overwrite: true })
    } else {
      active.prepend(bg)
    }
  }

  const ringLength = (ring && Number(ring.getAttribute('stroke-dasharray'))) || 0

  const read = () => {
    frame = 0
    const anchor = window.innerHeight * SCROLLSPY_ANCHOR
    if (!sections.length) return
    let index = -1
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].h.getBoundingClientRect().top > anchor) break
      index = i
    }
    const current = sections[Math.max(0, index)]
    if (!current.a.hasAttribute('data-toc-active')) setActive(current.a)

    if (ring && ringLength) {
      let progress = 0
      if (index >= 0) {
        const start = sections[index].h.getBoundingClientRect().top
        const end = index + 1 < sections.length
          ? sections[index + 1].h.getBoundingClientRect().top
          : article.getBoundingClientRect().bottom
        const ratio = end > start ? Math.min(1, Math.max(0, (anchor - start) / (end - start))) : 1
        progress = (index + ratio) / sections.length
      }
      ring.style.strokeDashoffset = String(ringLength * (1 - progress))
    }
  }

  const onScroll = () => { frame ||= requestAnimationFrame(read) }
  const target = scroller ?? window
  target.addEventListener('scroll', onScroll, { passive: true, signal })
  window.addEventListener('resize', onScroll, { signal })

  // Carter starts the scrollspy once the folder flight has released the paper;
  // the pose layer blocks measurement before that (it reparents the column).
  const start = () => {
    read()
    animateBg = true
  }
  if (FoldersFlight.active) {
    document.addEventListener('folders:pose-release', start, { once: true, signal })
  } else {
    start()
  }

  const scrollTo = (node, delta) => {
    if (scroller) {
      scroller.scrollTo({ top: node.offsetTop + delta, behavior: 'smooth' })
      return
    }
    const top = node.getBoundingClientRect().top + window.scrollY + delta
    window.scrollTo({ top, behavior: 'smooth' })
  }

  sections.forEach(({ a, h }) => {
    a.addEventListener('click', (event) => {
      event.preventDefault()
      setActive(a)
      window.history.replaceState(null, '', a.hash)
      scrollTo(h, offset)
    }, { signal })
  })

  return () => {
    controller.abort()
    if (frame) cancelAnimationFrame(frame)
    if (bg) gsap.killTweensOf(bg)
  }
}
