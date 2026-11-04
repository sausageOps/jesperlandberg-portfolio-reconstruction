import a from "gsap";
import { onDestroy as s } from "../runtime.js";
import { getCarterRoot } from "../runtime.js";

// Carter's About field-mark templates, placement rules and pointer trail.
const E = `fill="none" stroke="currentColor"`,
  D = `fill="currentColor" stroke="none" class="mark__t"`,
  Pe = [
    {
      id: `lagos`,
      zone: `mid`,
      ink: `heavy`,
      w: 100,
      h: 100,
      svg: `
      <circle cx="50" cy="50" r="47" ${E} stroke-width="2.4"/>
      <circle cx="50" cy="50" r="44" ${E} stroke-width="0.9"/>
      <path id="al" d="M19 50a31 31 0 0 1 62 0" fill="none"/>
      <path id="alb" d="M17 50a33 33 0 0 0 66 0" fill="none"/>
      <text ${D} font-size="11" letter-spacing="3"><textPath href="#al" startOffset="50%" text-anchor="middle">LAGOS</textPath></text>
      <text ${D} font-size="8.5" letter-spacing="2.5"><textPath href="#alb" startOffset="50%" text-anchor="middle">NIGERIA</textPath></text>
      <path d="M20 50h8M72 50h8" ${E} stroke-width="1.8"/>
      <text ${D} x="50" y="45" text-anchor="middle" font-size="8" letter-spacing="1">27 AU</text>
      <text ${D} x="50" y="58.5" text-anchor="middle" font-size="11" letter-spacing="1">1874</text>
    `,
    },
    {
      id: `kobo`,
      zone: `low`,
      ink: `light`,
      w: 84,
      h: 54,
      scale: 0.72,
      svg: `
      <rect x="2" y="2" width="80" height="50" ${E} stroke-width="2"/>
      <rect x="6" y="6" width="72" height="42" ${E} stroke-width="0.8"/>
      <text ${D} x="42" y="31" text-anchor="middle" font-size="20">30k</text>
      <text ${D} x="42" y="42.5" text-anchor="middle" font-size="7" letter-spacing="4">KOBO</text>
    `,
    },
    {
      id: `palm`,
      zone: `mid`,
      ink: `light`,
      w: 100,
      h: 100,
      svg: `
      <circle cx="50" cy="50" r="47" ${E} stroke-width="2.2"/>
      <circle cx="50" cy="50" r="41" ${E} stroke-width="0.9"/>
      <path id="ap" d="M22 50a28 28 0 0 1 56 0" fill="none"/>
      <text ${D} font-size="8" letter-spacing="1.5"><textPath href="#ap" startOffset="50%" text-anchor="middle">NIGERIA 1914</textPath></text>
      <path d="M50 84c-1.5-9-1-20 1-30" ${E} stroke-width="2"/>
      <path d="M48.2 77l5-1M48 70l5-1M48.6 63l4.6-1" ${E} stroke-width="1"/>
      <path d="M51 54c-9-8-20-9-27-4" ${E} stroke-width="1.8" stroke-linecap="round"/>
      <path d="M51 54c9-8 20-9 27-4" ${E} stroke-width="1.8" stroke-linecap="round"/>
      <path d="M51 54c-7-11-16-15-24-13" ${E} stroke-width="1.8" stroke-linecap="round"/>
      <path d="M51 54c7-11 16-15 24-13" ${E} stroke-width="1.8" stroke-linecap="round"/>
      <path d="M51 54c-2-12 0-19 3-23" ${E} stroke-width="1.8" stroke-linecap="round"/>
      <path d="M33 84h35" ${E} stroke-width="1.6" stroke-linecap="round"/>
    `,
    },
    {
      id: `lagoon`,
      zone: `band`,
      ink: `light`,
      w: 112,
      h: 72,
      scale: 0.9,
      svg: `
      <path d="M30 47c9 6 43 6 52 0l-5 9H36z" ${E} stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M58 47V13" ${E} stroke-width="1.8"/>
      <path d="M59 15c8 10 15 19 18 27H59z" ${E} stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M56 20L40 42h16z" ${E} stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M12 62q10-5 20 0t20 0 20 0 20 0M22 69q10-5 20 0t20 0 20 0" ${E} stroke-width="1.4" stroke-linecap="round"/>
    `,
    },
    {
      id: `industry`,
      zone: `mid`,
      ink: `heavy`,
      w: 100,
      h: 100,
      svg: `
      <path d="M50 4 90 27v46L50 96 10 73V27z" ${E} stroke-width="2.2"/>
      <path d="M50 12 83 31v38L50 88 17 69V31z" ${E} stroke-width="0.8"/>
      <path d="M34 64q16 6 32 0" ${E} stroke-width="1.8"/>
      <path d="M35.5 57q14.5 5 29 0" ${E} stroke-width="1.8"/>
      <path d="M38 50q12 4 24 0" ${E} stroke-width="1.8"/>
      <path d="M41 44q9 3 18 0" ${E} stroke-width="1.8"/>
      <path d="M41.5 44a8.5 7 0 0 1 17 0" ${E} stroke-width="1.8"/>
      <path d="M46.5 66.5a3.5 3.5 0 0 1 7 0" ${E} stroke-width="1.2"/>
      <circle cx="28" cy="36" r="1.5" fill="currentColor"/>
      <path d="M25.7 33.7l1.8 1.4M30.3 33.7l-1.8 1.4" ${E} stroke-width="0.9"/>
      <circle cx="70" cy="42" r="1.5" fill="currentColor"/>
      <path d="M67.7 39.7l1.8 1.4M72.3 39.7l-1.8 1.4" ${E} stroke-width="0.9"/>
      <text ${D} x="50" y="78.5" text-anchor="middle" font-size="7.5" letter-spacing="0.5">INDUSTRY</text>
    `,
    },
    {
      id: `deseret`,
      zone: `mid`,
      ink: `light`,
      w: 108,
      h: 72,
      scale: 0.86,
      svg: `
      <ellipse cx="54" cy="36" rx="51" ry="33" ${E} stroke-width="2.2"/>
      <ellipse cx="54" cy="36" rx="46.5" ry="28.5" ${E} stroke-width="0.9"/>
      <ellipse cx="54" cy="18.5" rx="3.2" ry="2.2" ${E} stroke-width="1.1"/>
      <path d="M51.5 16.5q-3-3-5-1M56.5 16.5q3-3 5-1" ${E} stroke-width="1"/>
      <path d="M53 17.2v2.8M55.2 17.2v2.8" ${E} stroke-width="0.8"/>
      <text ${D} x="54" y="40" text-anchor="middle" font-size="13" letter-spacing="3">DESERET</text>
      <text ${D} x="54" y="52" text-anchor="middle" font-size="9" letter-spacing="2">1847</text>
    `,
    },
    {
      id: `arch`,
      zone: `mid`,
      ink: `light`,
      w: 100,
      h: 100,
      svg: `
      <rect x="3" y="3" width="94" height="94" rx="8" ${E} stroke-width="2.2"/>
      <rect x="7.5" y="7.5" width="85" height="85" rx="5" ${E} stroke-width="0.8"/>
      <path d="M27 74c0-28 6-41 22-43s24 13 24 43" ${E} stroke-width="2"/>
      <path d="M38 74c0-16 4-24 11-25s12 10 12 25" ${E} stroke-width="1.2"/>
      <path d="M14 74h72" ${E} stroke-width="1.6" stroke-linecap="round"/>
      <text ${D} x="50" y="90" text-anchor="middle" font-size="8.5" letter-spacing="3">UTAH</text>
    `,
    },
    {
      id: `gulls`,
      zone: `band`,
      ink: `light`,
      w: 116,
      h: 76,
      scale: 0.94,
      svg: `
      <g transform="translate(20 8)"><path d="M12 26q8-11 16 0M12 26q-8-11-16 0" ${E} stroke-width="2" stroke-linecap="round"/></g>
      <g transform="translate(66 2) scale(0.8)"><path d="M12 26q8-11 16 0M12 26q-8-11-16 0" ${E} stroke-width="2" stroke-linecap="round"/></g>
      <g transform="translate(42 26) scale(0.9)"><path d="M12 26q8-11 16 0M12 26q-8-11-16 0" ${E} stroke-width="2" stroke-linecap="round"/></g>
      <text ${D} x="58" y="70" text-anchor="middle" font-size="9" letter-spacing="3">IN MOTION</text>
    `,
    },
    {
      id: `sego`,
      zone: `low`,
      ink: `light`,
      w: 100,
      h: 100,
      svg: `
      <circle cx="50" cy="50" r="47" ${E} stroke-width="2.2"/>
      <circle cx="50" cy="50" r="41" ${E} stroke-width="0.9"/>
      <path id="as" d="M17 50a33 33 0 0 0 66 0" fill="none"/>
      <text ${D} font-size="8" letter-spacing="1.5"><textPath href="#as" startOffset="50%" text-anchor="middle">SEGO LILY · 1911</textPath></text>
      <path d="M50 46c-3-9-3-17 0-24 3 7 3 15 0 24z" ${E} stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M48 47c-9-4-15-10-16-19 8 2 13 8 16 17z" ${E} stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M52 47c9-4 15-10 16-19-8 2-13 8-16 17z" ${E} stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="50" cy="48" r="2.4" ${E} stroke-width="1.3"/>
      <path d="M50 50c0 6-1 10-3 14" ${E} stroke-width="1.4"/>
    `,
    },
    {
      id: `airmail`,
      zone: `band`,
      ink: `heavy`,
      w: 120,
      h: 56,
      scale: 0.8,
      svg: `
      <rect x="2" y="2" width="116" height="52" ${E} stroke-width="2.2"/>
      <rect x="6" y="6" width="108" height="44" ${E} stroke-width="0.8"/>
      <path d="M14 31 31 24l-5 7 3 5z" ${E} stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M12 24l6-2M12 38l6 2" ${E} stroke-width="1"/>
      <text ${D} x="74" y="27" text-anchor="middle" font-size="11" letter-spacing="2">PAR AVION</text>
      <text ${D} x="74" y="40" text-anchor="middle" font-size="7" letter-spacing="2">BY AIR MAIL</text>
    `,
    },
    {
      id: `transit`,
      zone: `band`,
      ink: `light`,
      w: 100,
      h: 100,
      svg: `
      <path d="M50 4 96 50 50 96 4 50z" ${E} stroke-width="2"/>
      <path d="M50 12 88 50 50 88 12 50z" ${E} stroke-width="0.8"/>
      <path d="M28 52 70 37 56 69l-7-12z" ${E} stroke-width="1.7" stroke-linejoin="round"/>
      <path d="M28 52l21 5" ${E} stroke-width="1"/>
      <text ${D} transform="rotate(45 28 76)" x="28" y="76" text-anchor="middle" font-size="7" letter-spacing="1.5">TRANSIT</text>
    `,
    },
    {
      id: `co`,
      zone: `low`,
      ink: `heavy`,
      w: 100,
      h: 100,
      svg: `
      <circle cx="50" cy="50" r="47" ${E} stroke-width="2.4"/>
      <circle cx="50" cy="50" r="28" ${E} stroke-width="0.9"/>
      <path id="ac" d="M17 50a33 33 0 0 1 66 0" fill="none"/>
      <path id="acb" d="M13.5 50a36.5 36.5 0 0 0 73 0" fill="none"/>
      <text ${D} font-size="7.5" letter-spacing="1.5"><textPath href="#ac" startOffset="50%" text-anchor="middle">CARTER OGUNSOLA</textPath></text>
      <text ${D} font-size="7.5" letter-spacing="1.5"><textPath href="#acb" startOffset="50%" text-anchor="middle">CREATIVE DEV</textPath></text>
      <circle cx="22" cy="50" r="1.4" fill="currentColor"/>
      <circle cx="78" cy="50" r="1.4" fill="currentColor"/>
      <text ${D} x="50" y="56" text-anchor="middle" font-size="17" letter-spacing="1">CO</text>
    `,
    },
  ],
  Fe = 130,
  Ie = 6,
  Le = 3,
  O = 8,
  Re = 64,
  k = 10,
  ze = 78,
  Be = {
    band: { x0: 0.02, y0: 0.02, x1: 0.98, y1: 0.4 },
    mid: { x0: 0.18, y0: 0.26, x1: 0.98, y1: 0.74 },
    low: { x0: 0.05, y0: 0.55, x1: 0.95, y1: 0.98 },
  },
  A = [
    `lagos`,
    `palm`,
    `lagoon`,
    `airmail`,
    `transit`,
    `gulls`,
    `deseret`,
    `industry`,
    `arch`,
    `sego`,
    `kobo`,
    `co`,
  ],
  Ve = 7,
  He = () => window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,
  j = (e, t) => e + Math.random() * (t - e),
  Ue = new (class {
    uid = 0;
    build(e) {
      let t = ze * (e.scale ?? 1),
        n = document.createElement(`span`);
      ((n.className = `mark`), n.setAttribute(`aria-hidden`, `true`));
      let r = document.createElementNS(`http://www.w3.org/2000/svg`, `svg`);
      (r.setAttribute(`viewBox`, `0 0 ${e.w} ${e.h}`),
        r.setAttribute(`fill`, `none`),
        (r.innerHTML = e.svg));
      let i = ++this.uid;
      r.querySelectorAll(`[id]`).forEach((e) => {
        let t = e.id,
          n = `${t}-${i}`;
        ((e.id = n),
          r
            .querySelectorAll(`[href="#${t}"], [*|href="#${t}"]`)
            .forEach((e) => {
              e.setAttribute(`href`, `#${n}`);
            }));
      });
      let a = e.ink === `heavy`,
        o = Math.floor(Math.random() * 1e3),
        s = document.createElementNS(`http://www.w3.org/2000/svg`, `g`);
      for (s.setAttribute(`filter`, `url(#ink-${i})`); r.firstChild; )
        s.appendChild(r.firstChild);
      let c = document.createElementNS(`http://www.w3.org/2000/svg`, `defs`);
      return (
        (c.innerHTML = `
      <filter id="ink-${i}" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="${o}" result="r"/>
        <feDisplacementMap in="SourceGraphic" in2="r" scale="${a ? 1.4 : 0.8}" result="d"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="${o + 7}" result="m"/>
        <feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${a ? 3.5 : 2.5} ${a ? -1.1 : -0.5}" result="mm"/>
        <feComposite in="d" in2="mm" operator="in"/>
      </filter>`),
        r.append(c, s),
        n.append(r),
        (n.style.width = `${t}px`),
        (n.style.height = `${t * (e.h / e.w)}px`),
        n
      );
    }
    init() {
      const root = getCarterRoot();
      if (!root) return;
      root.querySelectorAll(`[data-marks]`).forEach((e) => {
        if (e.dataset.marksReady) return;
        let t = e.closest(`[data-marks-surface]`) ?? e;
        e.dataset.marksReady = ``;
        let n = new AbortController(),
          { signal: r } = n,
          i = [],
          o = [],
          c = () => {
            let n = e.getBoundingClientRect();
            return [...t.querySelectorAll(`[data-marks-avoid]`)].map((e) => {
              let t = e.getBoundingClientRect();
              return {
                l: t.left - n.left - k,
                t: t.top - n.top - k,
                r: t.right - n.left + k,
                b: t.bottom - n.top + k,
              };
            });
          },
          l = (t, n, r) => {
            let i = e.clientWidth,
              a = e.clientHeight,
              s = c(),
              l = parseFloat(t.style.width),
              u = parseFloat(t.style.height);
            if (i < l + 16 || a < u + 16) return !1;
            let d = Be[t.dataset.zone || `mid`] ?? Be.mid,
              f = Math.max(O, d.x0 * i),
              p = Math.min(i - l - O, d.x1 * i - l),
              m = Math.max(O, d.y0 * a),
              h = Math.min(a - u - O, d.y1 * a - u);
            if (p < f || h < m) return !1;
            for (let e = 0; e < 16; e++) {
              let i = n === void 0 || r === void 0 || e >= 8,
                a = 1 + e * 0.5,
                c = i
                  ? j(f, p)
                  : Math.min(Math.max(n - l / 2 + j(-40 * a, 40 * a), f), p),
                d = i
                  ? j(m, h)
                  : Math.min(Math.max(r - u / 2 + j(-30 * a, 30 * a), m), h),
                g = c + l / 2,
                _ = d + u / 2;
              if (
                !o.some((e) => {
                  let t = parseFloat(e.dataset.cx || `0`),
                    n = parseFloat(e.dataset.cy || `0`),
                    r = `lifting` in e.dataset ? 30 : Re;
                  return Math.hypot(t - g, n - _) < r;
                }) &&
                !s.some((e) => c < e.r && c + l > e.l && d < e.b && d + u > e.t)
              )
                return (
                  (t.style.left = `${c}px`),
                  (t.style.top = `${d}px`),
                  (t.dataset.cx = String(g)),
                  (t.dataset.cy = String(_)),
                  !0
                );
            }
            return !1;
          },
          u = (e) => {
            let t = i.indexOf(e);
            (t > -1 && i.splice(t, 1),
              (e.dataset.lifting = ``),
              a.to(e, {
                opacity: 0,
                duration: 1.6,
                ease: `power1.out`,
                overwrite: `auto`,
                onComplete: () => {
                  let t = o.indexOf(e);
                  (t > -1 && o.splice(t, 1), e.remove());
                },
              }));
          },
          d = 0,
          f = 0,
          p = (t, n, r = !1) => {
            let s = new Set(i.map((e) => e.dataset.mark)),
              c;
            for (let e = 0; e < A.length; e++) {
              let t = A[(d + e) % A.length],
                n = Pe.find((e) => e.id === t);
              if (n && !s.has(n.id)) {
                ((c = n), (d = (d + e + 1) % A.length));
                break;
              }
            }
            if (!c) return;
            let p = this.build(c);
            if (
              ((p.dataset.mark = c.id),
              (p.dataset.zone = c.zone),
              e.append(p),
              !l(p, t, n))
            ) {
              p.remove();
              let e = performance.now();
              i.length >= 2 && e - f > 1200 && ((f = e), u(i[0]));
              return;
            }
            (i.push(p), o.push(p), i.length > Ie && u(i[0]));
            let m = c.ink === `heavy` ? j(0.34, 0.42) : j(0.2, 0.28),
              h = j(-7, Ve);
            if (r || He()) {
              a.set(p, { opacity: m * j(0.72, 0.88), scale: 1, rotation: h });
              return;
            }
            a.timeline({ overwrite: `auto` })
              .fromTo(
                p,
                { opacity: 0 },
                {
                  opacity: Math.min(m * 1.2, 0.5),
                  duration: 0.09,
                  ease: `none`,
                },
              )
              .to(p, { opacity: m, duration: 1.1, ease: `power1.out` })
              .fromTo(
                p,
                { scale: 1.06, rotation: h + j(-2, 2) },
                { scale: 1, rotation: h, duration: 0.45, ease: `expo.out` },
                0,
              );
          },
          m = () => {
            for (let e = 0; e < Le; e++) p(void 0, void 0, !0);
          },
          h = null;
        e.clientWidth > 0
          ? m()
          : ((h = new ResizeObserver(() => {
              e.clientWidth <= 0 || (h?.disconnect(), (h = null), m());
            })),
            h.observe(e));
        let g = window.matchMedia(`(hover: hover) and (pointer: fine)`),
          _ = 0,
          v = 0,
          y = 0,
          b = !1;
        (t.addEventListener(
          `pointermove`,
          (t) => {
            if (!g.matches || He()) return;
            if (!b) {
              ((b = !0), (v = t.clientX), (y = t.clientY));
              return;
            }
            if (
              ((_ += Math.hypot(t.clientX - v, t.clientY - y)),
              (v = t.clientX),
              (y = t.clientY),
              _ < Fe)
            )
              return;
            _ = 0;
            let n = e.getBoundingClientRect();
            p(t.clientX - n.left, t.clientY - n.top);
          },
          { signal: r, passive: !0 },
        ),
          s(() => {
            (n.abort(),
              h?.disconnect(),
              o.forEach((e) => a.killTweensOf(e)),
              e.replaceChildren(),
              delete e.dataset.marksReady);
          }));
      });
    }
  })();

export { Ue as Marks };
