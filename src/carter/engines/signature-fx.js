import a from "gsap";
import { onDestroy as s, veil } from "../runtime.js";
import { getCarterRoot, observeCarterTheme } from "../runtime.js";

// Carter's signature outline-to-ink canvas, kept local to the About frame.
const T = 260,
  be = 4,
  xe = 897,
  Se = 173,
  Ce = 1.8,
  we = 0.35,
  Te = 1.6,
  Ee = 0.09,
  De = () => matchMedia(`(prefers-reduced-motion: reduce)`).matches,
  Oe = new Map();
function ke(e, t) {
  let n = e.getAttribute(`d`) ?? ``,
    r = Oe.get(n);
  if (r) return r;
  let i = [],
    a = null;
  if (t)
    try {
      let e = JSON.parse(t);
      Array.isArray(e) && e.length === 522 && (a = e);
    } catch {
      a = null;
    }
  if (a)
    for (let e = 0; e <= T; e++)
      i.push({ x: a[e * 2], y: a[e * 2 + 1], w: be, nx: 0, ny: 0 });
  else {
    let t = e.getTotalLength();
    if (!t) return null;
    for (let n = 0; n <= T; n++) {
      let r = e.getPointAtLength((n / T) * t);
      i.push({ x: r.x, y: r.y, w: be, nx: 0, ny: 0 });
    }
  }
  let o = Array(261).fill(0);
  for (let e = 1; e < T; e++) {
    let t = i[e - 1],
      n = i[e],
      r = i[e + 1],
      a = Math.atan2(n.y - t.y, n.x - t.x),
      s = Math.atan2(r.y - n.y, r.x - n.x),
      c = Math.abs(s - a);
    (c > Math.PI && (c = 2 * Math.PI - c), (o[e] = Math.min(1, c * 3.2)));
    let l = 0.86 + 0.28 * Math.abs((Math.sin(e * 12.9898) * 43758.5453) % 1);
    i[e].w = be * (0.55 + 0.75 * o[e]) * l;
  }
  for (let e = 0; e < 2; e++)
    for (let e = 1; e < T; e++)
      i[e].w = (i[e - 1].w + i[e].w * 2 + i[e + 1].w) / 4;
  for (let e = 0; e < 10; e++) {
    let t = e / 10;
    ((i[e].w *= 0.25 + 0.75 * t), (i[T - e].w *= 0.25 + 0.75 * t));
  }
  for (let e = 0; e <= T; e++) {
    let t = i[Math.max(0, e - 1)],
      n = i[Math.min(T, e + 1)],
      r = n.x - t.x,
      a = n.y - t.y,
      o = Math.hypot(r, a) || 1;
    ((i[e].nx = -a / o), (i[e].ny = r / o));
  }
  let s = [0];
  for (let e = 1; e <= T; e++) s[e] = s[e - 1] + 1 + o[e] * 2.4;
  let c = s[T];
  for (let e = 0; e <= T; e++) s[e] /= c;
  let l = { pts: i, cumT: s };
  return (Oe.set(n, l), l);
}
const Ae = new (class {
  init() {
    const root = getCarterRoot();
    if (!root) return;
    root.querySelectorAll(`[data-signature]`).forEach((e) => {
      if (e.dataset.sigReady) return;
      let t = e.querySelector(`[data-sig-path]`);
      if (!t) return;
      e.dataset.sigReady = ``;
      let n = ke(t, e.dataset.sigPts);
      if (!n) {
        delete e.dataset.sigReady;
        return;
      }
      let { pts: r, cumT: i } = n,
        o = (e) => {
          if (e <= 0) return 0;
          if (e >= 1) return T;
          let t = 0,
            n = T;
          for (; n - t > 1; ) {
            let r = (t + n) >> 1;
            i[r] < e ? (t = r) : (n = r);
          }
          let r = i[n] - i[t] || 1;
          return t + (e - i[t]) / r;
        },
        c = document.createElement(`canvas`);
      ((c.className = `signature__ink`),
        c.setAttribute(`aria-hidden`, `true`),
        e.append(c));
      let l = c.getContext(`2d`);
      if (!l) {
        c.remove();
        delete e.dataset.sigReady;
        return;
      }
      e.classList.add(`is-ink`);
      let u = 1,
        d = { b: 0 },
        f = (e, t, n, i) => {
          let a = Math.max(0, Math.floor(e)),
            o = Math.min(T, Math.ceil(t));
          if (!(o - a < 1)) {
            ((l.globalAlpha = i), l.beginPath());
            for (let e = a; e <= o; e++) {
              let t = r[e],
                i = (t.w * n * u) / 2,
                o = t.x * u + t.nx * i,
                s = t.y * u + t.ny * i;
              e === a ? l.moveTo(o, s) : l.lineTo(o, s);
            }
            for (let e = o; e >= a; e--) {
              let t = r[e],
                i = (t.w * n * u) / 2;
              l.lineTo(t.x * u - t.nx * i, t.y * u - t.ny * i);
            }
            (l.closePath(), l.fill());
            for (let e of [a, o]) {
              let t = r[e];
              (l.beginPath(),
                l.arc(t.x * u, t.y * u, (t.w * n * u) / 2, 0, Math.PI * 2),
                l.fill());
            }
            l.globalAlpha = 1;
          }
        },
        p = (t, n) => {
          let r = o(t),
            i = o(n);
          ((l.fillStyle = getComputedStyle(e).color),
            f(r, i, Te, Ee),
            f(r, i, 1, 0.96));
        },
        m = (e) => {
          (l.clearRect(0, 0, c.width, c.height), p(0, e));
        },
        h = () => {
          let t = e.offsetWidth || e.getBoundingClientRect().width;
          if (t < 2) return;
          let n = Math.min(devicePixelRatio || 1, 2);
          ((c.width = Math.round(t * n)),
            (c.height = Math.round((Se / xe) * t * n)),
            (u = c.width / xe),
            m(d.b));
        },
        g = new ResizeObserver(h);
      (g.observe(e), h());
      let stopTheme = observeCarterTheme(() => m(d.b));
      let y = (e) => {
          a.to(d, {
            b: 1,
            duration: Ce,
            delay: e,
            ease: `power1.inOut`,
            onUpdate: () => m(d.b),
          });
        },
        x = veil.active;
      if (De()) ((d.b = 1), m(1));
      else if (
        e.getBoundingClientRect().top < innerHeight &&
        e.getBoundingClientRect().width > 0
      ) {
        if (x) {
          let e = (e) => {
            let t = e.detail,
              n = (t?.wipeDur ?? 0) * 0.5 + 0.35;
            t?.tl
              ? t.tl.to(
                  d,
                  {
                    b: 1,
                    duration: Ce,
                    ease: `power1.inOut`,
                    onUpdate: () => m(d.b),
                  },
                  n,
                )
              : y(n);
          };
          (document.addEventListener(`veil:reveal`, e, { once: !0 }),
            s(() => document.removeEventListener(`veil:reveal`, e)));
        } else y(0.2);
      } else {
        let t = new IntersectionObserver((e) => {
          e[0].isIntersecting && (y(0.1), t.disconnect());
        });
        (t.observe(e), s(() => t.disconnect()));
      }
      let S = new AbortController(),
        C = { p: 0 };
      (e.addEventListener(
        `mouseenter`,
        () => {
          De() ||
            d.b < 1 ||
            (a.killTweensOf(C),
            (C.p = 0),
            a.to(C, {
              p: 1,
              duration: 2.2,
              ease: `power1.inOut`,
              onUpdate: () => {
                let e = Math.min(1, C.p * 1.35),
                  t = Math.max(0, C.p * 1.35 - we);
                (l.clearRect(0, 0, c.width, c.height), p(0, t), p(e, 1));
              },
            }));
        },
        { signal: S.signal },
      ),
        s(() => {
          (S.abort(),
            a.killTweensOf([d, C]),
            g.disconnect(),
            stopTheme(),
            c.remove(),
            e.classList.remove(`is-ink`),
            delete e.dataset.sigReady);
        }));
    });
  }
})();

export { Ae as SignatureFx };
