/* Writing system — the React equivalent of Carter's persistent-writing shell.
 *
 * Carter keeps one `[data-shelf]` WebGL canvas alive across the Astro transition
 * (`data-astro-transition-persist="shelf"`) and drives the whole index → post hand-off
 * from route events. Here the same canvases live in this component, which stays mounted
 * while the path moves between `/routes/writing` and `/routes/writing/<slug>`, so the
 * folder the reader opened is the same object that lands on the post page.
 *
 * Route events map 1:1:
 *   astro:before-preparation → world.beforeNav()   (called before every navigation)
 *   astro:after-swap         → world.onPage()      (after each route commit)
 *   astro:page-load          → toShelf()/bindStage() or toBackdrop(slug)
 *   astro:navigate            → WritingBridge.navigate
 */
import { useEffect, useLayoutEffect, useRef } from 'react'
import './Writing.css'
import './WritingPost.css'
import { FOLDERS } from '../../data/writing.js'
import { FoldersFlight } from './foldersFlight.js'
import { createShelfWorld, WritingBridge } from './shelfWorld.js'
import { initWritingPost } from './writingPost.js'
import WritingIndex from './WritingIndex.jsx'
import WritingPost from './WritingPost.jsx'

export default function Writing({ slug, appReady = true, onNavigate }) {
  const rootRef = useRef(null)
  const scrollRef = useRef(null)
  const shelfRef = useRef(null)
  const stillRef = useRef(null)
  const flightRef = useRef(null)
  const stageRef = useRef(null)
  const classicRef = useRef(null)
  const worldRef = useRef(null)
  const boundElRef = useRef(null)
  const navigateRef = useRef(onNavigate)
  navigateRef.current = onNavigate

  const isPost = Boolean(slug)

  /* Boot the shelf once. Reduced motion / a missing WebGL context leave the engine
     off, which is exactly Carter's fallback: `wstage` stays hidden and the classic
     list (intro + archive) is the page. */
  useLayoutEffect(() => {
    if (!appReady) return undefined
    FoldersFlight.init()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    // Carter's document carries data-theme="dark" (the site default, no stored choice);
    // readTokens() and the procedural cover palettes read it off <html>.
    const root = document.documentElement
    const previousTheme = root.dataset.theme
    root.dataset.theme = 'dark'
    const world = createShelfWorld(FOLDERS, shelfRef.current)
    if (!world) {
      if (previousTheme === undefined) delete root.dataset.theme
      else root.dataset.theme = previousTheme
      return undefined
    }
    worldRef.current = world
    WritingBridge.navigate = (to) => {
      worldRef.current?.beforeNav?.({ to: { pathname: to } })
      navigateRef.current?.(to)
    }
    return () => {
      if (previousTheme === undefined) delete root.dataset.theme
      else root.dataset.theme = previousTheme
      world.dispose()
      FoldersFlight.stop()
      worldRef.current = null
      WritingBridge.navigate = null
      boundElRef.current = null
    }
  }, [appReady])

  /* Per-route commit, in Carter's order: the flight resolves into the claim, then the
     after-swap handler positions the paper, then the route mode is set. */
  useLayoutEffect(() => {
    const world = worldRef.current
    if (!world) return
    FoldersFlight.onPage()
    world.onPage()
    if (isPost) {
      world.toBackdrop(slug)
    } else {
      world.toShelf()
      /* The index subtree unmounts while the post is open, so returning to the
         shelf hands back a brand-new stage element. Carter's stage was persisted;
         ours has to be re-bound, or the wheel/drag/keyboard handlers stay on a
         detached node. Re-binding is guarded by element identity because
         bindStage() attaches its listeners each call. */
      const stage = stageRef.current
      if (stage && boundElRef.current !== stage) {
        world.bindStage(stage, classicRef.current)
        boundElRef.current = stage
      }
    }
  }, [isPost, slug, appReady])

  /* In-app links. Carter's ClientRouter intercepted every Writing link; Vite has no
     router-level interceptor, so the route handles its own: anything under the Writing
     prefix keeps the SPA (and the shelf) alive instead of reloading the document.
     The engine's document-level capture handler already claims the close box once the
     paper flight is running — those clicks arrive here already handled. */
  useEffect(() => {
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target?.closest?.('a[href]')
      const href = anchor?.getAttribute('href')
      if (!href || !href.startsWith('/routes/writing')) return
      if (anchor.target && anchor.target !== '_self') return
      event.preventDefault()
      if (href === window.location.pathname) return
      navigateRef.current?.(href)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  /* Post chrome: TOC toggle, scrollspy, ring progress and click-to-scroll. */
  useEffect(() => {
    if (!isPost) return undefined
    const root = rootRef.current?.querySelector('[data-writing-post]')
    return initWritingPost(root, { scroller: scrollRef.current, offset: -120 })
  }, [isPost, slug])

  return (
    <div className={isPost ? 'writing wpost-route' : 'writing'} ref={rootRef}>
      <div className="writing-bg" aria-hidden="true" />
      <canvas className="shelf-gl" data-shelf="" aria-hidden="true" ref={shelfRef} />
      <canvas className="shelf-still" data-shelf-still="" aria-hidden="true" ref={stillRef} />
      <canvas className="writing-flight" data-flight="" aria-hidden="true" ref={flightRef} />

      {isPost ? (
        <div className="wpost-scroll" ref={scrollRef}>
          <div className="writing-page">
            <WritingPost slug={slug} />
          </div>
        </div>
      ) : (
        <div className="writing-scroll" ref={scrollRef}>
          <div className="writing-page">
            <main className="writing-page__main">
              <WritingIndex stageRef={stageRef} classicRef={classicRef} />
            </main>
          </div>
        </div>
      )}
    </div>
  )
}
