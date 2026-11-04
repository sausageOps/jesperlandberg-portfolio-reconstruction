/* Phase 3B About engine — Carter's source-confirmed envelope and dialog
   interactions, adapted to Jesper's page-scoped lifecycle and root. */
import e from "gsap";
import {
  getCarterRoot,
  getCarterTheme,
  observeCarterTheme,
  onDestroy as t,
  tune as n,
} from "../runtime.js";
import {
  $ as r,
  C as i,
  J as a,
  Lt as o,
  Q as s,
  Y as c,
  b as l,
  bt as u,
  ct as d,
  h as f,
  n as p,
  p as m,
  ut as ee,
  xt as te,
  y as ne,
  zt as h,
} from "./three.js";
import { t as re } from "./mesh-wire.js";
import { t as ie } from "./studio-env.js";
import { a as ae, i as oe, r as se, t as g } from "./css3d.js";
import { t as ce } from "./wheels-gl-warm.js";
function _(e) {
  let t = [],
    n = (e, n, r, i, a, o = 8) => {
      for (let s = 0; s <= o; s++)
        t.push(new h(e + ((r - e) * s) / o, n + ((i - n) * s) / o, a));
    },
    r = (e, n, r, i, a, o, s, c = 14) => {
      for (let l = 1; l <= c; l++) {
        let u = l / c,
          d = i + (a - i) * u;
        t.push(
          new h(e + Math.cos(d) * r, n + Math.sin(d) * r, o + (s - o) * u),
        );
      }
    };
  return (
    n(-0.11, -0.28, -0.11, 0.26, e),
    r(0, 0.26, 0.11, Math.PI, 0, e, e),
    n(0.11, 0.26, 0.11, -0.36, e),
    r(-0.055, -0.36, 0.165, 0, -Math.PI, e, -e),
    n(-0.22, -0.36, -0.22, 0.36, -e),
    r(0, 0.36, 0.22, Math.PI, 0, -e, -e),
    n(0.22, 0.36, 0.22, -0.08, -e),
    t
  );
}
function le(e, t) {
  let n = 0.02,
    i = t / 2 / e + n * 1.1,
    s = new m(_(i), !1, `catmullrom`, 0.2),
    c = new r({ color: new f(`#cfd0d3`), roughness: 0.26, metalness: 1 }),
    l = new a(new o(s, 260, n, 10, !1), c);
  return (l.scale.setScalar(e), l);
}
var ue = () => matchMedia(`(prefers-reduced-motion: reduce)`).matches,
  v = {
    fov: 22,
    rot: 1.1,
    lean: 3.2,
    tilt: 1.4,
    float: 1,
    env: 0.5,
    key: 1.05,
    shadow: 0.24,
    relief: 1.4,
    edge: 3,
    glowL: 0.5,
    glowD: 0.12,
    clip: 112,
  },
  y = (e, t) => 1 - (1 - e) ** t,
  b = (e, t, n) => Math.max(t, Math.min(n, e)),
  x = (e) => (e * Math.PI) / 180,
  de = (e, t) => {
    let n = document.createElement(`i`);
    ((n.style.cssText = `position:absolute;visibility:hidden;background:var(${e})`),
      getCarterRoot()?.appendChild(n));
    let r = getComputedStyle(n).backgroundColor;
    n.remove();
    let i = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(r);
    if (i) return new f().setRGB(+i[1], +i[2], +i[3], u);
    let a = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(r);
    return a ? new f().setRGB(a[1] / 255, a[2] / 255, a[3] / 255, u) : new f(t);
  },
  S = class {
    init() {
      let e = getCarterRoot()?.querySelector(`[data-frank-stage]`);
      if (!e) return;
      let n = C(e);
      t(() => n?.());
      let r = matchMedia(`(min-width: 64rem)`),
        i = null,
        a = () => {
          r.matches && !i ? (i = w(e)) : !r.matches && i && (i(), (i = null));
        };
      (a(),
        r.addEventListener(`change`, a),
        t(() => {
          (r.removeEventListener(`change`, a), i?.(), (i = null));
        }));
    }
  };
function C(t) {
  let n = Array.from(t.querySelectorAll(`[data-dialog-open]`));
  if (!n.length) return null;
  let r = new AbortController(),
    { signal: i } = r,
    a = ue(),
    o = [],
    s = [];
  for (let t of n) {
    let n = getCarterRoot()?.querySelector(
      `[data-dialog="${t.dataset.dialogOpen}"]`,
    );
    if (!n) continue;
    o.push(n);
    let r = !1,
      c = n.querySelector(`.ov3__dialog-scroll`) ?? n,
      l = Array.from(c.children),
      u = () => {
        let e = c.scrollHeight - c.clientHeight - c.scrollTop > 4;
        c.style.setProperty(`--fade`, e ? `56px` : `0px`);
      };
    c.addEventListener(`scroll`, u, { signal: i, passive: !0 });
    let d = new ResizeObserver(u);
    (d.observe(c), s.push(() => d.disconnect()));
    let f = () => (innerHeight + n.offsetHeight) / 2 + 48;
    t.addEventListener(
      `click`,
      () => {
        n.open ||
          r ||
          (t.setAttribute(`aria-expanded`, `true`),
          n.classList.remove(`is-leaving`),
          n.showModal(),
          u(),
          !a &&
            (e.killTweensOf([n, ...l]),
            e.fromTo(
              n,
              { y: f() },
              { y: 0, duration: 0.9, ease: `expo.out`, overwrite: `auto` },
            ),
            e.fromTo(
              l,
              { y: 18 },
              {
                y: 0,
                duration: 0.8,
                stagger: 0.045,
                delay: 0.2,
                ease: `expo.out`,
                clearProps: `transform`,
                overwrite: `auto`,
              },
            )));
      },
      { signal: i },
    );
    let p = () => {
      if (!(!n.open || r)) {
        if (((r = !0), n.classList.add(`is-leaving`), a)) {
          (n.close(), n.classList.remove(`is-leaving`), (r = !1));
          return;
        }
        (e.killTweensOf(l),
          e.to(n, {
            y: f(),
            duration: 0.55,
            ease: `power3.in`,
            overwrite: `auto`,
            onComplete: () => {
              (n.close(),
                e.set([n, ...l], { clearProps: `transform` }),
                n.classList.remove(`is-leaving`),
                (r = !1));
            },
          }));
      }
    };
    (n
      .querySelector(`[data-dialog-close]`)
      ?.addEventListener(`click`, p, { signal: i }),
      n.addEventListener(
        `cancel`,
        (e) => {
          (e.preventDefault(), p());
        },
        { signal: i },
      ),
      n.addEventListener(
        `click`,
        (e) => {
          if (e.target !== n) return;
          let t = n.getBoundingClientRect();
          (e.clientX < t.left ||
            e.clientX > t.right ||
            e.clientY < t.top ||
            e.clientY > t.bottom) &&
            p();
        },
        { signal: i },
      ),
      n.addEventListener(
        `close`,
        () => {
          (t.setAttribute(`aria-expanded`, `false`),
            t.focus({ preventScroll: !0 }));
        },
        { signal: i },
      ));
  }
  return () => {
    (r.abort(),
      s.forEach((e) => e()),
      o.forEach((t) => {
        (e.killTweensOf(t), t.open && t.close());
      }));
  };
}
function w(t) {
  let r = t.querySelector(`[data-frank-gl]`),
    o = t.querySelector(`[data-frank-layer]`),
    m = t.querySelector(`[data-frank-card]`);
  if (!r || !o || !m) return null;
  let h = document.createElement(`canvas`),
    _;
  try {
    _ = new p({
      canvas: h,
      antialias: !0,
      alpha: !0,
      powerPreference: `high-performance`,
    });
  } catch {
    return null;
  }
  let S = new AbortController(),
    { signal: C } = S,
    w = ue(),
    T = [];
  (t.classList.add(`is-stage`),
    (h.className = `ov3__hero-canvas`),
    h.setAttribute(`aria-hidden`, `true`),
    r.appendChild(h),
    _.setClearColor(0, 0),
    (_.outputColorSpace = u),
    (_.toneMapping = 7),
    (_.toneMappingExposure = 1.05));
  let E = new te(),
    D = new d(v.fov, 1, 10, 3e4),
    O = ie(_);
  (T.push(O.envRT.texture, O.envRT, O.pmrem),
    (E.environment = O.envRT.texture));
  let k = new ne(16777215, v.key);
  k.position.set(-0.6, 0.9, 1).multiplyScalar(2e3);
  let A = new ne(16777215, 0.3);
  (A.position.set(0.8, 0.2, 0.7).multiplyScalar(2e3), E.add(k, A));
  let j = new i();
  E.add(j);
  let M = ae(5);
  T.push(M);
  let N = de(`--card`, `#2a2a2a`),
    P = new s({
      color: N,
      roughness: 0.9,
      metalness: 0,
      sheen: 0.22,
      sheenRoughness: 0.85,
      sheenColor: N.clone().lerp(new f(`#ffffff`), 0.5),
      bumpMap: M,
      bumpScale: v.relief,
      emissive: N.clone(),
      emissiveIntensity: 0,
    }),
    F = new s({
      color: N.clone().lerp(new f(`#ffffff`), 0.35),
      roughness: 0.98,
      metalness: 0,
    });
  T.push(P, F);
  let I = oe();
  T.push(I);
  let L = new c({
    map: I,
    transparent: !0,
    opacity: v.shadow,
    depthWrite: !1,
    toneMapped: !1,
  });
  T.push(L);
  let R = new a(new ee(1, 1), L);
  (T.push(R.geometry), j.add(R));
  let z = null,
    B = 0.8,
    fe = 0,
    pe = 0,
    V = 0,
    H = 0,
    U = le(v.clip, v.edge);
  ((U.rotation.z = Math.PI + x(12)), j.add(U));
  let me = () => {
      if (!V || !H || (fe === V && pe === H)) return;
      ((fe = V), (pe = H));
      let e = new l(se(V, H, 8, 8), {
        depth: v.edge,
        bevelEnabled: !0,
        bevelThickness: B,
        bevelSize: B,
        bevelSegments: 2,
      });
      (z
        ? (z.geometry.dispose(), (z.geometry = e))
        : ((z = new a(e, [P, F])), j.add(z)),
        (z.position.z = -(v.edge + B)),
        M.repeat.set(V / 220, H / 220),
        R.scale.set(V * 1.7, H * 1.7, 1),
        R.position.set(V * 0.02, -H * 0.06, -60),
        U.position.set(-V / 2 + 58, H / 2 - 24, -(v.edge + B) / 2));
    },
    he = new ResizeObserver(() => {
      ((V = m.offsetWidth), (H = m.offsetHeight), me());
    });
  he.observe(m);
  let W = 1,
    G = 1,
    K = 1,
    q = 1,
    J = () => {
      let e = t.getBoundingClientRect();
      ((W = Math.max(1, Math.round(t.offsetWidth || e.width))),
        (G = Math.max(1, Math.round(t.offsetHeight || e.height))),
        _.setPixelRatio(
          Math.min(devicePixelRatio * q, 3, (W > 1920 ? 1.25 : 2) * q),
        ),
        _.setSize(W, G, !1),
        (D.aspect = W / G),
        (D.fov = v.fov),
        D.updateProjectionMatrix(),
        (K = D.projectionMatrix.elements[5] * (G / 2)),
        D.position.set(0, 0, K),
        D.lookAt(0, 0, 0),
        D.updateMatrixWorld(),
        (V = m.offsetWidth),
        (H = m.offsetHeight),
        me());
      let n = g(D.matrixWorld, 1, D, W, G, 1);
      o.style.cssText = n.containerCss + `z-index:2;`;
    },
    ge = new ResizeObserver(() => J());
  (ge.observe(t),
    J(),
    t.addEventListener(
      `canvas:scale`,
      (e) => {
        ((q = Math.max(1, e.detail?.s ?? 1)), J());
      },
      { signal: C },
    ));
  let Y = () => {
      let e = getCarterTheme() === `dark`,
        t = de(`--card`, e ? `#2a2a2a` : `#dededd`);
      (P.color.copy(t),
        P.emissive.copy(t),
        P.sheenColor.copy(t).lerp(new f(`#ffffff`), 0.5),
        F.color.copy(t).lerp(new f(`#ffffff`), 0.35),
        (P.emissiveIntensity = e ? v.glowD : v.glowL),
        (P.bumpScale = v.relief),
        (E.environmentIntensity = e ? v.env * 1.3 : v.env),
        (k.intensity = e ? v.key * 1.1 : v.key),
        (L.opacity = e ? v.shadow * 1.5 : v.shadow));
    },
    stopTheme = observeCarterTheme(Y);
  Y();
  let X = { t: 0, c: 0, dx: 0, dy: 0, cx: 0, cy: 0 },
    Z = { x: 0, y: 0, cx: 0, cy: 0 };
  matchMedia(`(hover: hover) and (pointer: fine)`).matches &&
    !w &&
    (m.addEventListener(`pointerenter`, () => (X.t = 1), { signal: C }),
    m.addEventListener(`pointerleave`, () => (X.t = 0), { signal: C }),
    m.addEventListener(
      `pointermove`,
      (e) => {
        let t = m.getBoundingClientRect();
        ((X.dx = b(((e.clientX - t.left) / t.width) * 2 - 1, -1, 1)),
          (X.dy = b(((e.clientY - t.top) / t.height) * 2 - 1, -1, 1)));
      },
      { signal: C, passive: !0 },
    ),
    t.addEventListener(
      `pointermove`,
      (e) => {
        let n = t.getBoundingClientRect();
        ((Z.x = b(((e.clientX - n.left) / n.width) * 2 - 1, -1, 1)),
          (Z.y = b(((e.clientY - n.top) / n.height) * 2 - 1, -1, 1)));
      },
      { signal: C, passive: !0 },
    ),
    t.addEventListener(`pointerleave`, () => (Z.x = Z.y = 0), { signal: C }));
  let Q = { v: 0 },
    ye = 0,
    be = ``,
    $ = (t, n = 16.667) => {
      let r = Math.min(e.ticker.deltaRatio(60), 3);
      ((ye += Math.min(n, 50) / 1e3),
        (X.c += (X.t - X.c) * y(0.1, r)),
        (X.cx += (X.dx - X.cx) * y(0.12, r)),
        (X.cy += (X.dy - X.cy) * y(0.12, r)),
        (Z.cx += (Z.x - Z.cx) * y(0.06, r)),
        (Z.cy += (Z.y - Z.cy) * y(0.06, r)));
      let i = w ? 0 : Math.sin(ye * 0.6) * 4 * v.float;
      if (
        (j.position.set(0, i - Q.v * 60, X.c * 14 - Q.v * K * 0.9),
        j.rotation.set(
          -X.cy * x(v.lean) * X.c - Z.cy * x(v.tilt) + Q.v * x(-6),
          X.cx * x(v.lean) * X.c + Z.cx * x(v.tilt),
          x(v.rot) + Q.v * x(2),
        ),
        j.updateMatrixWorld(!0),
        V)
      ) {
        let e = g(j.matrixWorld, V, D, W, G, V);
        e.elementTransform !== be &&
          ((m.style.transform = e.elementTransform), (be = e.elementTransform));
      }
      xe.ready() && (re(E), _.render(E, D));
    },
    xe = ce(_, E, D);
  ($(), e.ticker.add($));
  let Se = n(
    `frank`,
    [
      {
        group: `the pose`,
        rows: [
          {
            key: `fov`,
            label: `lens`,
            min: 12,
            max: 45,
            step: 1,
            value: v.fov,
            unit: `°`,
          },
          {
            key: `rot`,
            label: `resting tilt`,
            min: -4,
            max: 4,
            step: 0.1,
            value: v.rot,
            unit: `°`,
          },
        ],
      },
      {
        group: `the hover`,
        rows: [
          {
            key: `lean`,
            label: `hover lean`,
            min: 0,
            max: 8,
            step: 0.2,
            value: v.lean,
            unit: `°`,
            hint: `toward the hand`,
          },
          {
            key: `tilt`,
            label: `pointer tilt`,
            min: 0,
            max: 6,
            step: 0.1,
            value: v.tilt,
            unit: `°`,
            hint: `parallax across the stage`,
          },
        ],
      },
      {
        group: `the idle`,
        rows: [
          {
            key: `float`,
            label: `float`,
            min: 0,
            max: 2,
            step: 0.05,
            value: v.float,
            hint: `idle float master (px ≈ 4·float)`,
          },
        ],
      },
      {
        group: `the lamp`,
        rows: [
          {
            key: `env`,
            label: `environment`,
            min: 0,
            max: 2,
            step: 0.05,
            value: v.env,
          },
          {
            key: `key`,
            label: `key light`,
            min: 0,
            max: 3,
            step: 0.05,
            value: v.key,
          },
          {
            key: `shadow`,
            label: `shadow`,
            min: 0,
            max: 1,
            step: 0.02,
            value: v.shadow,
          },
          {
            key: `relief`,
            label: `stock relief`,
            min: 0,
            max: 4,
            step: 0.1,
            value: v.relief,
          },
          {
            key: `glowL`,
            label: `slab glow, light`,
            min: 0,
            max: 1,
            step: 0.02,
            value: v.glowL,
            hint: `the slab's self-light — the env alone renders light stock mid-grey`,
          },
          {
            key: `glowD`,
            label: `slab glow, dark`,
            min: 0,
            max: 1,
            step: 0.02,
            value: v.glowD,
          },
        ],
      },
    ],
    (e) => {
      (Object.assign(v, e), Y(), J());
    },
  );
  return () => {
    xe?.dispose();
    (S.abort(),
      e.ticker.remove($),
      e.killTweensOf(Q),
      he.disconnect(),
      ge.disconnect(),
      stopTheme(),
      Se?.(),
      z?.geometry.dispose(),
      U.geometry.dispose(),
      U.material.dispose(),
      T.forEach((e) => e.dispose()),
      _.dispose(),
      _.forceContextLoss(),
      h.remove(),
      (m.style.transform = ``),
      (o.style.cssText = ``),
      t.classList.remove(`is-stage`));
  };
}
var T = new S();
export { T as FrankCard };
