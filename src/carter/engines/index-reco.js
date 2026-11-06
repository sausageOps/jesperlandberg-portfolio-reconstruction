// Carter IndexReco (`$e` in `app/lib/runtime.ts` / `src/Base.js`):
// Category tab filtering, empty state, and height/stagger transitions for
// `.writing__archive[data-index-reco]`.
import a from 'gsap';
import { Flip as l } from 'gsap/Flip';
import { getCarterRoot, onDestroy as s } from '../runtime.js';

a.registerPlugin(l);

const Ze = 5;
const Qe = () => window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;

export const IndexReco = new (class {
  init() {
    const root = getCarterRoot() ?? document;
    root.querySelectorAll(`[data-index-reco]`).forEach((e) => {
      if (e.dataset.indexReady) return;
      let t = [...e.querySelectorAll(`[data-index-tab]`)],
        n = e.querySelector(`[data-index-rows]`),
        r = e.querySelector(`[data-index-more]`);
      if (!t.length || !n) return;
      e.dataset.indexReady = ``;
      let i = new AbortController(),
        o = [...n.querySelectorAll(`.row`)],
        c = e.querySelector(`[data-index-pill]`),
        u = e.querySelector(`[data-index-empty]`),
        d = t[0].dataset.cat ?? ``,
        f = !1,
        p = new Set(),
        m = e.querySelector(`.index__tabs`),
        rafId = 0;
      if (m) {
        let updateFades = () => {
          let maxScroll = m.scrollWidth - m.clientWidth;
          m.style.setProperty(`--fade-l`, `${Math.max(0, Math.min(m.scrollLeft, 32))}px`);
          m.style.setProperty(`--fade-r`, `${Math.max(0, Math.min(maxScroll - m.scrollLeft, 32))}px`);
        };
        m.addEventListener(`scroll`, updateFades, { passive: !0, signal: i.signal });
        window.addEventListener(
          `resize`,
          () => {
            rafId ||= requestAnimationFrame(() => {
              rafId = 0;
              updateFades();
            });
          },
          { signal: i.signal },
        );
        updateFades();
      }
      let h = (e, t) => {
          if (c) {
            if (t && !Qe()) {
              let t = l.getState(c);
              e.appendChild(c);
              l.from(t, { duration: 0.4, ease: `power3.out`, absolute: !0 });
            } else e.appendChild(c);
          }
        },
        g = () => (d === `all` ? o : o.filter((e) => e.dataset.cat === d)),
        _ = (e) => {
          n.parentElement?.toggleAttribute(`data-expanded`, f);
          let t = n.offsetHeight,
            i = g(),
            s = r && !f ? i.slice(0, Ze) : i,
            c = new Set(s);
          o.forEach((e) => {
            e.style.display = c.has(e) ? `` : `none`;
          });
          r && ((r.style.display = i.length > Ze ? `` : `none`), r.setAttribute(`aria-expanded`, String(f)));
          u && (u.style.display = i.length ? `none` : ``);
          n.style.height = ``;
          if (e && !Qe()) {
            let e = n.offsetHeight;
            a.fromTo(
              n,
              { height: t },
              {
                height: e,
                duration: 0.5,
                ease: `power3.inOut`,
                overwrite: !0,
                onComplete: () => {
                  n.style.height = ``;
                },
              },
            );
            let r = s.filter((e) => !p.has(e));
            r.length &&
              a.from(r, {
                opacity: 0,
                y: 8,
                duration: 0.4,
                ease: `power2.out`,
                stagger: 0.03,
                overwrite: !0,
                clearProps: `opacity,transform`,
              });
          }
          p = c;
        };
      t.forEach((e) =>
        e.addEventListener(
          `click`,
          () => {
            e.dataset.cat !== d &&
              ((d = e.dataset.cat ?? d),
              (f = !1),
              t.forEach((t) => t.setAttribute(`aria-selected`, String(t === e))),
              h(e, !0),
              m && e.scrollIntoView?.({ inline: `center`, block: `nearest` }),
              _(!0));
          },
          { signal: i.signal },
        ),
      );
      r?.addEventListener(
        `click`,
        () => {
          f = !f;
          _(!0);
        },
        { signal: i.signal },
      );
      _(!1);
      s(() => {
        i.abort();
        rafId && cancelAnimationFrame(rafId);
        a.killTweensOf([n, ...o]);
        delete e.dataset.indexReady;
      });
    });
  }
})();
