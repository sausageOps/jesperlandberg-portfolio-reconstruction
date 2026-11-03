/* Writing shelf world — port of Carter `app/lib/folders.js` `nt()`: the WebGL shelf
 * scene, the rank layout, drag/wheel/keyboard physics, hover "peep" + tooltip/aria
 * updates, the CSS3D pose layer and the index → post flight bridge.
 *
 * The recovered body is kept structurally verbatim so it can be diffed against the
 * reference; only the import surface is rewritten. Legend — Carter name → here:
 *
 *   S  THREE.WebGLRenderer     v  THREE.PerspectiveCamera  ie THREE.Scene
 *   l  THREE.Group             w  THREE.DirectionalLight   re THREE.HemisphereLight
 *   te THREE.PlaneGeometry     y  THREE.CanvasTexture      b  THREE.Color
 *   p  THREE.Vector2           T  THREE.Vector3            x  THREE.Quaternion
 *   C  THREE.BufferGeometry    ne THREE.Raycaster          _  THREE.SRGBColorSpace
 *
 *   i  gsap            t  FoldersFlight     a  onCleanup (mesh.ts Ed)
 *   o  route shim      r  navigate          n  prefetch
 *   E  fibreTexture    D  blobShadowTexture O  seededRng    k  notchedRect
 *   A  projectCss3d    ue makeFlex          et makeFolder   le makeCoverGeometry
 *   Qe extrudeCover    Ze coverOutline      Ue drawCover    de coverToBump
 *   Je paintPreview    Ge paintSpine        Ye paintSheetInside   Xe paintLoosePage
 *   je readTokens      qe firstSentence     V  hashF        oe makeStudioEnv
 *   ae mesh-wire (dev, not ported)          se gl-warm (not ported)
 *
 * Astro's route bridge (`astro:before-preparation` / `after-swap` / `before-swap`)
 * is replaced by the `onPage` / `beforeNav` / `beforeSwap` hooks the React system
 * calls on each route commit, and `navigate` goes through WritingBridge.
 */
import * as THREE from 'three'
import gsap from 'gsap'
import { FoldersFlight } from './foldersFlight.js'
import { fibreTexture, blobShadowTexture, seededRng, notchedRect, projectCss3d } from './shelfHelpers.js'
import {
  makeFlex, makeFolder, makeCoverGeometry, drawCover, coverToBump, paintPreview,
  paintSpine, paintSheetInside, paintLoosePage, readTokens, firstSentence,
  extrudeCover, coverOutline, hashF,
  coverBase, coreTint, paperTint,
  COVER_H, COVER_RATIO, COVER_DEPTH, COVER_TOP, SHELF_NOTCH_H, COVER_EDGE_INSET,
  COVER_BEVEL, COVER_W, SHELF_TAB_W, PEEP_X, PEEP_SLIDE, FONT, MONO,
} from './foldersCover.js'
import { makeStudioEnv } from '../studio/studioEnv.js'

/** Jesper-local prefix for Carter's `/writing` (nav source of truth). */
export const INDEX_PATH = '/routes/writing'

/**
 * The React system registers the router here once. `navigate` is called by the
 * flight bridge at the dive's `navAt` progress; `prefetch` is Carter's idle
 * prefetch of post routes (kept as a hook, unused by the Vite build).
 */
export const WritingBridge = { navigate: null, prefetch: null }

/* ---- three shims (Carter's single-letter bundle aliases) ---- */
const S = THREE.WebGLRenderer, v = THREE.PerspectiveCamera, ie = THREE.Scene,
  l = THREE.Group, w = THREE.DirectionalLight, re = THREE.HemisphereLight,
  te = THREE.PlaneGeometry, y = THREE.CanvasTexture, b = THREE.Color,
  p = THREE.Vector2, T = THREE.Vector3, x = THREE.Quaternion,
  C = THREE.BufferGeometry, ne = THREE.Raycaster, _ = THREE.SRGBColorSpace

/* ---- recovered helper shims ---- */
const i = gsap
const t = FoldersFlight
const E = fibreTexture, D = blobShadowTexture, O = seededRng, k = notchedRect, A = projectCss3d
const ue = makeFlex, et = makeFolder, le = makeCoverGeometry
const Qe = extrudeCover, Ze = coverOutline
const Ue = drawCover, de = coverToBump, Je = paintPreview, Ge = paintSpine,
  Ye = paintSheetInside, Xe = paintLoosePage
const je = readTokens, qe = firstSentence, V = hashF
const Fe = coverBase, Me = coreTint, Le = paperTint

/* Carter's module-scope pose flag (`P`) and the renderer cache (`tt`), which the
   recovered file declared above the world function. */
const P = { active: false }
let tt = null
const oe = makeStudioEnv

/* Carter's mesh.ts registers page-scoped teardown; the world pushes its listener
   removals here and the React system runs them on unmount. */
let currentCleanup = null
const a = (fn) => { currentCleanup?.push(fn) }
/* me/he are aliased after their declarations below (a class binding is in TDZ
   until it is evaluated, so aliasing it up here threw on import). */
const Ae = (e) => e * e * (3 - 2 * e)

/* fe: normalise wheel deltas by deltaMode (verbatim) */
function fe(e, t2, n2 = 16) {
  if (e.ctrlKey) return null
  let r2 = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY,
    i2 = e.deltaMode === 1 ? n2 : e.deltaMode === 2 ? t2 : 1
  return Number.isFinite(r2) ? r2 * i2 : 0
}
/* pe / N: rubber-band clamps outside the rank (verbatim) */
function pe(e, t2, n2) {
  let r2 = Math.min(t2, Math.max(0, e)), i2 = e - r2
  return r2 + i2 / (1 + Math.abs(i2) / n2)
}
function N(e, t2, n2) {
  let r2 = Math.min(t2, Math.max(0, e)), i2 = e - r2
  return r2 + i2 / Math.max(0.01, 1 - Math.abs(i2) / n2)
}
const W = FONT, Re = MONO

/* mesh-wire (?mesh dev override) and gl-warm are Carter dev/prefetch surfaces
   that the Vite build does not need; both are inert here. */
const ae = () => {}
const se = () => ({ ready: () => true, done: Promise.resolve() })

/* Route state Carter's mesh runtime exposes (veil active flag + flight predicate). */
const o = { active: false, flightRoute: null }
const r = (href) => { WritingBridge.navigate?.(href) }
const n = (href) => { WritingBridge.prefetch?.(href) }

/* Carter constants not part of the cover module's export surface. */
const _e = COVER_H, L = COVER_RATIO, R = COVER_DEPTH, ve = COVER_TOP, ye = SHELF_NOTCH_H,
  be = COVER_EDGE_INSET, z = COVER_BEVEL, B = COVER_W, Se = SHELF_TAB_W,
  Te = PEEP_X, Ee = PEEP_SLIDE, Ce = 0.07, we = 0.02, xe = 0.062

/* Tuning defaults (De) — the ?tune=folders panel is not ported, so these are fixed. */
const De = {
  yaw: 68, gap: 0.54, gape: 0, push: 0.3, fScale: 1.15, zLift: 0.36, hLift: 0.05,
  camZ: 3.1, fill: 0.58, shadow: 0.1, bump: 3.5, lead: 80, dive: 0.3, navAt: 0.45,
  backLead: 0.18, wiggle: 0.6, fDamp: 0.11, bBlur: 6, bDim: 0.5, bBright: 0.7,
  damp: 0.06, dragDamp: 0.1, wheel: 0.5556, drag: 2, flick: 140, magnet: 0.055,
  inject: 0.28, calm: 40, press: 0,
}
const Oe = (e2, t2) => 1 - (1 - e2) ** t2
const ke = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/* me: pointer velocity sampler (verbatim: mulberry-ish windowed slope) */
class VelocitySampler {
  samples = []
  reset(x, at) { this.samples = [{ x, at }] }
  add(x, at) {
    const last = this.samples.at(-1)
    if (last && at <= last.at) return
    this.samples.push({ x, at })
    while (this.samples.length > 2 && this.samples[1].at < at - 90) this.samples.shift()
  }
  read(now) {
    const last = this.samples.at(-1)
    if (!last || this.samples.length < 2 || now - last.at >= 90) return 0
    const from = Math.max(this.samples[0].at, now - 90)
    let x0 = this.samples[0].x
    for (let k2 = 1; k2 < this.samples.length; k2++) {
      const a = this.samples[k2 - 1], c = this.samples[k2]
      if (c.at >= from) { x0 = a.x + (c.x - a.x) * ((from - a.at) / (c.at - a.at)); break }
    }
    const span = now - from
    if (span < 8) return 0
    const v2 = (last.x - x0) / span
    return Math.abs(v2) < 0.02 ? 0 : Math.max(-4, Math.min(4, v2))
  }
}

const me = VelocitySampler
/* he: semi-implicit spring integrator (verbatim) */
function spring(state, target, stiffness, damping, dt) {
  const steps = Math.max(1, Math.ceil(dt / 0.5)), h = dt / steps
  for (let s = 0; s < steps; s++) {
    state.v += (stiffness * (target - state.x) - damping * state.v) * h
    state.x += state.v * h
  }
  return Math.abs(target - state.x) + Math.abs(state.v)
}
const he = spring

export function createShelfWorld(e2, c2) {
  currentCleanup = []
  if (tt && tt.__canvas !== c2) {
    try { tt.dispose() } catch { /* already lost */ }
    tt = null
  }
  if (!tt) {
    if (!c2) return null
    try {
      tt = new S({ canvas: c2, antialias: true, alpha: true });
    } catch {
      return null;
    }
    tt.setClearColor(0, 0), tt.outputColorSpace = _, tt.toneMapping = 7, tt.shadowMap.enabled = true, tt.shadowMap.type = 1;
    tt.__canvas = c2;
  }
  let u2 = tt, d2 = { ...De }, f2 = [], m2 = je(), h2 = `shelf`;
  t.damp = d2.fDamp;
  let g2 = document.querySelector(`[data-shelf-still]`), ee2 = 0.25, E2 = false, O2 = false, j2 = null, ce2 = false, ue2 = () => {
    if (!g2) return false;
    let e3 = g2.getContext(`2d`);
    if (!e3 || !(`filter` in e3)) return false;
    let t2 = Math.max(1, Math.round(c2.width * ee2)), n2 = Math.max(1, Math.round(c2.height * ee2));
    (g2.width !== t2 || g2.height !== n2) && (g2.width = t2, g2.height = n2), ae(z2), u2.render(z2, B2);
    let r2 = c2.clientWidth || innerWidth;
    return e3.filter = `blur(${d2.bBlur * t2 / r2}px) brightness(${d2.bBright}) saturate(0.9)`, e3.clearRect(0, 0, t2, n2), e3.drawImage(c2, 0, 0, t2, n2), e3.filter = `none`, true;
  }, M2 = (e3 = false) => {
    if (!(E2 && !e3)) {
      if (j2) {
        O2 = true, c2.style.opacity = String(d2.bDim);
        return;
      }
      ue2() ? (E2 = true, g2.style.opacity = String(d2.bDim), c2.style.opacity = `0`, c2.style.filter = `none`) : (c2.style.opacity = String(d2.bDim), c2.style.filter = `blur(${d2.bBlur}px) brightness(${d2.bBright}) saturate(0.9)`);
    }
  }, ge2 = () => {
    E2 = false, O2 = false, g2 && (g2.style.opacity = `0`), c2.style.opacity = `1`, c2.style.filter = `none`;
  }, F2 = null, I2 = 0, R2 = () => {
    I2 = 0;
  }, z2 = new ie(), B2 = new v(30, 1, 0.1, 20), { envRT: Se2, pmrem: ke2 } = oe(u2);
  z2.environment = Se2.texture, f2.push(Se2, ke2);
  let Ne2 = (e3) => {
    z2.environmentIntensity = e3 === `dark` ? 1.3 : 1.6, H2.intensity = e3 === `dark` ? 1.35 : 1.55, Pe2.intensity = e3 === `dark` ? 0.4 : 0.42, Ie2.intensity = e3 === `dark` ? 0.55 : 0.45, U2.intensity = e3 === `dark` ? 0.55 : 0.6, u2.toneMappingExposure = e3 === `dark` ? 1.28 : 1.3;
  }, H2 = new w(16777215, 1.1);
  H2.position.set(-1.6, 1.9, 2.4), H2.layers.enableAll(), H2.castShadow = true, H2.shadow.mapSize.set(2048, 2048), H2.shadow.camera.left = -5.5, H2.shadow.camera.right = 5.5, H2.shadow.camera.top = 3, H2.shadow.camera.bottom = -3, H2.shadow.camera.near = 0.1, H2.shadow.camera.far = 12, H2.shadow.bias = -4e-4, H2.shadow.normalBias = 3e-3, H2.shadow.radius = 6, H2.shadow.intensity = 0.78, z2.add(H2);
  let Pe2 = new w(16777215, 0.2);
  Pe2.position.set(2.2, -0.6, 2), Pe2.layers.enableAll(), z2.add(Pe2);
  let Ie2 = new w(16777215, 0.4);
  Ie2.position.set(-2.4, 2.4, -1.6), Ie2.layers.enableAll(), z2.add(Ie2);
  let U2 = new re(16777215, 5921366, 0.5);
  U2.layers.enableAll(), z2.add(U2), Ne2(m2.theme);
  let ze2 = new l();
  z2.add(ze2);
  let Be2 = Qe(Ze()), Ve2 = le(Be2);
  Be2.dispose();
  let He2 = Qe(k(L, _e, be, ye)), We2 = new te(L * 0.97, _e * 0.95, 14, 18), Ke2 = new te(0.15, 0.15, 10, 4), $e2 = new te(L * 1.9, 0.64), nt2 = D(), rt2 = document.createElement(`canvas`);
  Xe(rt2, m2);
  let it2 = new y(rt2);
  it2.colorSpace = _, it2.anisotropy = 8, f2.push(Ve2, He2, We2, Ke2, $e2, nt2, it2);
  let G = e2.map((e3, t2) => {
    let n2 = et(e3, t2, m2, Ve2, He2, We2, Ke2, $e2, nt2, it2);
    return ze2.add(n2.group), f2.push(...n2.disposables), n2;
  }), at = (t2) => {
    let n2 = G[t2];
    Ue(n2.coverCanvas, e2[t2], m2, t2), de(n2.coverCanvas, n2.finishTex), Je(n2.previewCanvas, e2[t2], m2), n2.preview.scale.y = 0.44 * n2.previewCanvas.height / n2.previewCanvas.width / 0.3, Ge(n2.spineCanvas, e2[t2], m2, t2), Ye(n2.sheetCanvas, e2[t2], m2, t2), n2.coverTex.needsUpdate = true, n2.spineTex.needsUpdate = true, n2.sheetTex.needsUpdate = true, n2.previewTex.needsUpdate = true, n2.typeset = true;
  }, ot = (e3) => {
    let t2 = G[e3];
    for (let e4 of [t2.coverCanvas, t2.spineCanvas, t2.sheetCanvas, t2.previewCanvas, t2.finishTex.image]) e4.width = 1, e4.height = 1;
    t2.coverTex.needsUpdate = true, t2.spineTex.needsUpdate = true, t2.sheetTex.needsUpdate = true, t2.finishTex.needsUpdate = true, t2.previewTex.needsUpdate = true, t2.typeset = false;
  }, st = -1, ct = (e3, t2 = false) => {
    if (!(e3 === st && !t2)) {
      st = e3;
      for (let t3 = 0; t3 < G.length; t3++) {
        let n2 = Math.abs(t3 - e3);
        n2 <= 8 ? G[t3].typeset || at(t3) : n2 > 11 && G[t3].typeset && ot(t3);
      }
      R2();
    }
  }, lt = () => {
    G.forEach((e3) => {
      e3.typeset = false;
    }), ct(st < 0 ? 0 : st, true);
  };
  ct(0), document.fonts.load(`500 96px ${W}`).then(() => document.fonts.load(`500 44px ${Re}`)).then(() => document.fonts.load(`400 24px ${Re}`)).then(() => lt()).catch(() => {
  });
  let K = 0, q = 0, J = 0, ut = -1e4, dt = true, ft = { v: 0 }, pt = () => (e2.length - 1) * d2.gap, mt = 3e-3, ht = () => {
    if (!innerWidth || !innerHeight) return;
    u2.setPixelRatio(Math.min(devicePixelRatio, 2)), u2.setSize(innerWidth, innerHeight, false), B2.aspect = innerWidth / innerHeight;
    let e3 = _e * d2.fScale / d2.fill, t2 = e3 / 2 / Math.tan(B2.fov * Math.PI / 360) + d2.zLift, n2 = e3 * B2.aspect;
    L * d2.fScale > n2 * 0.72 && (t2 *= L * d2.fScale / (n2 * 0.72)), B2.position.set(0, 0.02, Math.max(t2, d2.camZ)), B2.updateProjectionMatrix(), mt = e3 / innerHeight, R2();
  };
  ht();
  let gt = () => {
    Q && nn(false), ht();
  };
  window.addEventListener(`resize`, gt);
  let _t = -1, vt = (t2, n2 = false) => {
    if (t2 === _t && !n2 || (_t = t2, !F2)) return;
    let r2 = e2[t2], { titleEl: i2, tipTitleEl: a2, excerptEl: o2, chipDate: s2, chipYear: c3, chipCat: l2 } = F2;
    (() => {
      i2 && (i2.href = r2.href, i2.setAttribute(`aria-label`, `Open \u201C${r2.title}\u201D`)), a2 && (a2.textContent = r2.title), o2 && (o2.textContent = qe(r2));
      let e3 = r2.date.split(` `);
      s2 && (s2.textContent = e3.slice(0, 2).join(` `)), c3 && (c3.textContent = e3[2] ?? ``), l2 && (l2.textContent = r2.cat);
    })();
  }, yt = G.map(() => ({ v: 0 })), bt = false, xt = (e3) => {
    if (bt) return;
    bt = true;
    let t2 = e3?.detail, n2 = (t2?.wipeDur ?? 0) * 0.15, r2 = i.to(yt, { v: 1, duration: 1.8, ease: `expo.out`, stagger: 0.05, onUpdate: R2 });
    ft.v = -d2.gap * 1.4;
    let a2 = i.to(ft, { v: 0, duration: 2.2, ease: `expo.out`, onUpdate: R2 });
    t2?.tl && (t2.tl.add(r2, n2), t2.tl.add(a2, n2));
  }, St = De.gape * Math.PI / 180, Y = G.map((e3) => ({ cur: 0, tar: 0, peek: 0, paper: 0, returned: false, bases: e3.sheets.map((e4) => ({ x: e4.position.x, y: e4.position.y, z: e4.position.z, r: e4.rotation.z })) })), Ct = [0, 0.1, 0.32, 1], wt = -1, Tt = 0, Et = (e3) => {
    e3.persisted && (wt = -1, clearTimeout(Tt), R2());
  };
  window.addEventListener(`pageshow`, Et);
  let Dt = -1, Ot = (t2) => t2 ? e2.findIndex((e3) => e3.href.endsWith(`/${t2}`)) : -1, kt = (e3, t2) => {
    if (j2?.kill(), j2 = null, q = e3, !t2 || Math.abs(K - e3) < 2e-3 || Math.abs(K - e3) > d2.gap) {
      K = e3;
      return;
    }
    let n2 = { v: K };
    j2 = i.to(n2, { v: e3, duration: 0.4, ease: `expo.out`, onUpdate: () => {
      K = n2.v, R2();
    }, onComplete: () => {
      K = e3, j2 = null, R2(), O2 && h2 === `backdrop` && !i.isTweening(Z) && (O2 = false, Mt());
    } });
  }, At = (e3) => {
    let t2 = ce2;
    ce2 = false, h2 = `backdrop`, J = 0, bt = true, yt.forEach((e4) => e4.v = 1), Dt = e3, e3 !== -1 && (kt(e3 * d2.gap, t2), wt = e3, G[e3].sheets[G[e3].sheets.length - 1].visible = false), R2();
  }, jt = (e3, t2) => e3 === INDEX_PATH && t2.startsWith(`${INDEX_PATH}/`) || t2 === INDEX_PATH && e3.startsWith(`${INDEX_PATH}/`), Mt = () => {
    M2(), o.flightRoute = jt;
  }, Nt = false, X = null, Z = { v: 0, idx: -1 }, Pt = (e3) => {
    e3.length && i.fromTo(e3, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.55, ease: `expo.out`, stagger: 0.08, clearProps: `opacity,transform` });
  }, Ft = (e3 = false) => {
    if (!X || X.settled) return;
    X.settled = true;
    let t2 = X;
    X = null, clearTimeout(t2.watchdog), t2.tl?.kill(), i.killTweensOf(t2.col), t2.col.style.transform = ``, t2.col.style.willChange = ``, document.documentElement.style.overflow = ``, delete document.documentElement.dataset.relay, e3 && !t2.chromeIn ? Pt(t2.waits) : e3 || t2.waits.forEach((e4) => e4.style.opacity = ``), Mt(), P.active = false, document.dispatchEvent(new CustomEvent(`folders:pose-release`));
  }, It = (e3) => {
    let t2 = Z.idx;
    wt = t2, i.killTweensOf(Z), i.to(Z, { v: 0, duration: 0.62, ease: `expo.out`, delay: e3, onUpdate: R2, onComplete: () => {
      Z.idx === t2 && (Z.idx = -1, wt = -1, Y[t2] && (Y[t2].returned = true), Nt = false, R2());
    } });
  }, Lt = () => {
    let e3 = document.querySelector(`[data-flight-paper]`), t2 = G[Dt];
    if (!e3 || !t2) {
      r(INDEX_PATH, { info: { veil: `flight` } });
      return;
    }
    Nt = true, i.killTweensOf(Z);
    let n2 = [...document.querySelectorAll(`[data-flight-wait]`)];
    n2.length && i.to(n2, { opacity: 0, y: 16, duration: 0.2, ease: `expo.out`, stagger: 0.03 }), ge2();
    let a2 = t2.sheets[t2.sheets.length - 1];
    a2.visible = true, Z.v = 1, Z.idx = Dt, It(d2.backLead), i.to(e3, { y: () => innerHeight + 80, duration: 0.55, delay: 0.1, ease: `power2.in`, onComplete: () => {
      r(INDEX_PATH, { info: { veil: `flight` } });
    } }), window.setTimeout(() => {
      Nt && location.pathname !== INDEX_PATH && r(INDEX_PATH, { info: { veil: `flight` } });
    }, 2500);
  }, Rt = (e3) => {
    h2 === `backdrop` && (e3.metaKey || e3.ctrlKey || e3.shiftKey || e3.altKey || e3.button !== 0 || e3.target.closest?.(`a[href="${INDEX_PATH}"]`) && (e3.preventDefault(), !(Nt || o.active) && Lt()));
  };
  document.addEventListener(`click`, Rt, true);
  let zt = (e3) => {
    if (h2 !== `backdrop` || Dt < 0 || Nt || e3.to?.pathname !== INDEX_PATH) return;
    let t2 = G[Dt], n2 = t2.sheets[t2.sheets.length - 1];
    n2.visible = true, Z.v = 1, Z.idx = Dt;
  };
  // Carter re-ran this on astro:before-preparation; the React bridge calls it.
  {
    let t2 = `requestIdleCallback` in window ? (e3) => requestIdleCallback(() => e3(), { timeout: 3e3 }) : (e3) => void window.setTimeout(e3, 400), r2 = e2.map((e3) => e3.href).filter((e3) => e3.startsWith(`/`)), i2 = () => {
      let e3 = r2.shift();
      e3 && (n(e3), t2(i2));
    };
    t2(i2);
  }
  let Bt = L * 0.97, Vt = _e * 0.95, Ht = null, Ut = false, Wt = new T(), Gt = new x(), Kt = new T(), qt = new T(), Jt = new x(), Yt = new T(), Xt = new T(), Zt = new x(), Qt = new T(), $t = new C(), Q = null, en = (e3) => {
    let t2 = 2 * Math.tan(B2.fov * Math.PI / 360) * B2.position.z / innerHeight, n2 = e3.left + e3.width / 2 - innerWidth / 2, r2 = innerHeight / 2 - (e3.top + e3.height / 2);
    return { x: n2 * t2, y: B2.position.y + r2 * t2, s: e3.width * t2 / Bt };
  }, tn = (e3) => {
    Ht = { idx: e3, at: performance.now() };
  }, nn = (e3 = false) => {
    if (!Q || Q.settled) return;
    Q.settled = true;
    let t2 = Q;
    if (Q = null, P.active = false, clearTimeout(t2.watchdog), t2.flyTl?.kill(), t2.expandTl?.kill(), i.killTweensOf(t2.mask), t2.col.parentElement === t2.mask && t2.colParent.insertBefore(t2.col, t2.colNext), t2.col.style.cssText = ``, t2.col.removeAttribute(`inert`), t2.layer.remove(), document.documentElement.style.overflow = ``, window.removeEventListener(`keydown`, t2.keyGuard, true), t2.front) {
      let e4 = t2.front.canvas;
      e4.style.zIndex = `80`, e4.style.opacity = `0`, e4.style.display = `none`;
    }
    G[t2.idx]?.pivot.traverse((e4) => e4.layers.set(0)), e3 && t2.waiting.length ? Pt(t2.waiting) : t2.waiting.forEach((e4) => e4.style.opacity = ``), Mt(), Ut = false, document.dispatchEvent(new CustomEvent(`folders:pose-release`)), R2();
  }, rn = () => nn(true), an = () => {
    let e3 = document.querySelector(`[data-folders-slug]`);
    if (e3 && !Ht && !o.active) {
      let t2 = Ot(e3.getAttribute(`data-folders-slug`)), n3 = document.querySelector(`[data-flight-paper]`), r3 = t2 !== -1 && i.isTweening(Z) && Z.idx === t2;
      if (At(t2), r3 ? G[t2].sheets[G[t2].sheets.length - 1].visible = true : (Z.idx = -1, Z.v = 0), Ut = false, !n3) {
        Mt();
        return;
      }
      let a3 = [...document.querySelectorAll(`[data-flight-wait]`)];
      a3.forEach((e4) => e4.style.opacity = `0`), n3.style.transform = `translateY(${innerHeight + 80}px)`, n3.style.willChange = `transform`, document.documentElement.style.overflow = `clip`, document.documentElement.dataset.relay = `in`, P.active = true, X = { col: n3, waits: a3, tl: null, watchdog: window.setTimeout(() => Ft(false), 3500), settled: false, chromeIn: false }, i.delayedCall(0.38, () => {
        X && !X.settled && !X.chromeIn && (X.chromeIn = true, Pt(X.waits));
      }), r3 ? (O2 = true, c2.style.opacity = String(d2.bDim), o.flightRoute = jt) : Mt(), X.tl = i.to(n3, { y: 0, duration: 0.9, ease: `expo.out`, clearProps: `transform`, onComplete: () => Ft(true) });
      return;
    }
    if (!Ht || performance.now() - Ht.at > 3e3) {
      Ht = null;
      return;
    }
    let n2 = Ht.idx;
    Ht = null;
    let r2 = document.querySelector(`[data-flight-paper]`), a2 = document.querySelector(`[data-sheet-claim]`), s2 = t.frontLayer();
    if (!r2 || !a2 || !r2.parentElement || !s2) return;
    At(n2), Ut = true;
    let l2 = r2.getBoundingClientRect(), u3 = a2.getBoundingClientRect(), f3 = Math.round(l2.width), p2 = document.createElement(`div`);
    p2.setAttribute(`data-pose-layer`, ``), p2.setAttribute(`aria-hidden`, `false`);
    let m3 = document.createElement(`div`);
    m3.style.cssText = `position:absolute;top:0;left:0;width:${f3}px;height:${Math.round(f3 * Vt / Bt)}px;overflow:hidden;opacity:0;`;
    let h3 = r2.parentElement, g3 = r2.nextSibling;
    m3.appendChild(r2), r2.style.width = `${f3}px`, r2.style.margin = `0`, r2.setAttribute(`inert`, ``), p2.appendChild(m3), document.body.appendChild(p2), i.to(m3, { opacity: 1, duration: 0.12, ease: `none` }), document.documentElement.style.overflow = `clip`;
    let _2 = (e4) => {
      [` `, `PageDown`, `PageUp`, `Home`, `End`, `ArrowDown`, `ArrowUp`].includes(e4.key) && e4.preventDefault();
    };
    window.addEventListener(`keydown`, _2, true), s2.canvas.style.zIndex = `3`, s2.canvas.style.display = `block`, s2.canvas.style.opacity = `1`, s2.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)), s2.renderer.setSize(innerWidth, innerHeight, false), G[n2].pivot.traverse((e4) => e4.layers.set(1));
    let v2 = [...document.querySelectorAll(`[data-flight-wait]`)];
    v2.forEach((e4) => e4.style.opacity = `0`), Q = { idx: n2, layer: p2, mask: m3, col: r2, colParent: h3, colNext: g3, claim: a2, flatRect: u3, maskW: f3, phase: `open`, mix: { v: 0 }, flyTl: null, expandTl: null, watchdog: window.setTimeout(() => nn(false), 4500), keyGuard: _2, front: s2, demoted: false, lastTransform: ``, waiting: v2, settled: false }, P.active = true, requestAnimationFrame(() => requestAnimationFrame(() => {
      Ut = false, R2();
    })), R2();
  };
  // Carter re-ran this on astro:after-swap; the React bridge calls it.
  let on = () => {
    Ht && (Ut = true), Q && nn(false), X && Ft(false);
  };
  // Carter re-ran this on astro:before-swap; the React bridge calls it.
  let sn = () => {
    document.hidden && Q && nn(false);
  };
  document.addEventListener(`visibilitychange`, sn);
  let cn = () => {
    if (!Q) return;
    let e3 = G[Q.idx], t2 = e3.sheets[e3.sheets.length - 1];
    if (Q.phase === `open` && Y[Q.idx].cur > 0.99 && (Q.phase = `fly`, Q.flyTl = i.to(Q.mix, { v: 1, duration: 1.05, ease: `expo.out`, onComplete: () => {
      if (!Q) return;
      Q.phase = `expand`;
      let e4 = Q.flatRect;
      Q.mask.style.transform = `none`, Q.mask.style.left = `${Math.round(e4.left)}px`, Q.mask.style.top = `${Math.round(e4.top)}px`, Q.lastTransform = `none`, Q.expandTl = i.to(Q.mask, { height: Math.max(0, innerHeight - e4.top), duration: 0.5, ease: `expo.out`, onComplete: rn });
    } })), Q.phase === `fly` && !Q.demoted && Q.mix.v > 0.5) {
      if (Q.demoted = true, G[Q.idx].pivot.traverse((e4) => e4.layers.set(0)), Q.front) {
        let e4 = Q.front.canvas;
        e4.style.zIndex = `80`, e4.style.opacity = `0`, e4.style.display = `none`, Q.front = null;
      }
      Mt(), R2();
    }
    if (Q.phase !== `expand`) {
      t2.updateWorldMatrix(true, false);
      let e4;
      if (Q.phase === `open`) e4 = t2.matrixWorld;
      else {
        t2.matrixWorld.decompose(Wt, Gt, Kt);
        let n3 = en(Q.flatRect);
        qt.set(n3.x, n3.y, 0), Jt.identity(), Yt.setScalar(n3.s);
        let r2 = Q.mix.v;
        Xt.lerpVectors(Wt, qt, r2), Zt.copy(Gt).slerp(Jt, r2), Qt.lerpVectors(Kt, Yt, r2), $t.compose(Xt, Zt, Qt), e4 = $t;
      }
      let n2 = A(e4, Bt, B2, innerWidth, innerHeight, Q.maskW);
      Q.layer.style.cssText = n2.containerCss.replace(`position:absolute`, `position:fixed`) + `z-index:2;`, n2.elementTransform !== Q.lastTransform && (Q.mask.style.transform = n2.elementTransform, Q.lastTransform = n2.elementTransform), R2();
    }
  };
  t.poseGuard = () => P.active || Ht !== null;
  let ln = document.documentElement.getAttribute(`data-theme`), un = new MutationObserver(() => {
    let t2 = document.documentElement.getAttribute(`data-theme`);
    t2 !== null && t2 !== ln && (ln = t2, m2 = je(), Ne2(m2.theme), G.forEach((t3, n2) => {
      let r2 = Fe(m2, n2, e2[n2]);
      t3.stockMats.forEach((t4) => {
        t4.map || t4.color.copy(t4.userData.core ? Me(r2, m2, n2, e2[n2]) : r2);
        let i2 = t4;
        i2.sheen && i2.sheenColor.copy(r2).lerp(new b(`#ffffff`), 0.5);
      }), t3.paperMats.forEach((e3, t4) => {
        e3.map || e3.color.copy(Le(m2, n2, t4));
      });
    }), lt(), Xe(rt2, m2), it2.needsUpdate = true, R2());
  });
  un.observe(document.documentElement, { attributes: true, attributeFilter: [`data-theme`] });
  let dn = new ne(), fn = new p(), pn = -1, mn = G.map(() => 0), $ = false, hn = false, gn = false, _n = false, vn = 0, yn = 0, bn = false, xn = false, Sn = 0, Cn = false, wn = new T(), Tn = (e3) => {
    let t2 = G[e3];
    t2.group.updateWorldMatrix(true, false), wn.set(L / 2 - xe - Ce * 0.55, we, ve / 2), t2.group.localToWorld(wn).project(B2);
    let n2 = (wn.x + 1) * innerWidth / 2, r2 = (1 - wn.y) * innerHeight / 2, i2 = Math.max(38, Math.min(76, innerHeight * d2.fill * 0.16)), a2 = Math.hypot((vn - n2) / (i2 * 1.1), (yn - r2) / i2);
    return 1 - Ae(Math.min(1, Math.max(0, (a2 - 0.22) / 0.78)));
  }, En = (e3, t2) => {
    fn.set(e3 / innerWidth * 2 - 1, -(t2 / innerHeight) * 2 + 1), dn.setFromCamera(fn, B2);
    let n2 = dn.intersectObjects(ze2.children, true);
    if (Cn = !!n2[0] && G.some((e4) => n2[0].object === e4.preview), !n2.length) return -1;
    let r2 = n2[0].object;
    for (; r2; ) {
      let e4 = G.findIndex((e5) => e5.group === r2);
      if (e4 !== -1) return e4;
      r2 = r2.parent;
    }
    return -1;
  }, Dn = () => d2.gap * 0.45, On = () => {
    q = Math.min(pt(), Math.max(0, q));
  }, kn = () => {
    q = Math.min(pt(), Math.max(0, Math.round(q / d2.gap) * d2.gap));
  }, An = false, jn = (e3) => {
    wt = An && wt === e3 ? -1 : e3, R2();
  }, Mn = (t2) => {
    if (!o.active && !i.isTweening(Z) && (xn = false, Y[t2].returned = false, jn(t2), !An)) {
      if (e2[t2].href.startsWith(`/`)) {
        if (new URLSearchParams(location.search).get(`transition`) === `sandwich`) {
          clearTimeout(Tt), Tt = window.setTimeout(() => {
            o.active || (tn(t2), r(e2[t2].href, { info: { veil: `flight` } }));
          }, d2.lead);
          return;
        }
        n(e2[t2].href, { ignoreSlowConnection: true }), Z.v = 0, Z.idx = t2;
        let a2 = false;
        i.to(Z, { v: 1, duration: d2.dive, ease: `power2.in`, delay: d2.lead / 1e3, onUpdate: () => {
          R2(), !a2 && Z.v >= d2.navAt && !o.active && (a2 = true, r(e2[t2].href, { info: { veil: `flight` } }));
        }, onComplete: () => {
          a2 && (G[t2].sheets[G[t2].sheets.length - 1].visible = false), Z.v = 0, Z.idx = -1, R2(), O2 && h2 === `backdrop` && !j2 && (O2 = false, Mt());
        } });
        return;
      }
      clearTimeout(Tt), Tt = window.setTimeout(() => {
        o.active || r(e2[t2].href);
      }, d2.lead);
    }
  }, Nn = (e3, t2) => {
    let n2 = En(e3, t2);
    n2 !== -1 && (Math.abs(n2 * d2.gap - K) < d2.gap * 0.35 ? Mn(n2) : (J = 0, q = n2 * d2.gap, ut = performance.now()));
  }, Pn = G.map((e3, t2) => ({ lean: { x: 0, v: 0 }, slop: { x: 0, v: 0 }, flap: { x: 0, v: 0 }, press: { x: 0, v: 0 }, kj: 0.82 + 0.36 * V(t2 * 41), openPrev: 0 })), Fn = K, In = he, Ln = () => d2.yaw * Math.PI / 180, Rn = (t2, n2 = 16.667) => {
    if (Ut) {
      zn.ready() && (ae(z2), u2.render(z2, B2));
      return;
    }
    let r2 = Math.min(n2, 50) / 16.667;
    if (gn = false, Math.abs(J) > 2e-5) {
      let e3 = J * Oe(d2.inject, r2);
      q += e3, J -= e3, On();
    } else J = 0;
    let i2 = performance.now() - ut;
    if (!$ && Math.abs(J) < 5e-4 && i2 > 90 && !Q) {
      let e3 = Math.min(pt(), Math.max(0, Math.round(q / d2.gap) * d2.gap)), t3 = Math.min(1, (i2 - 90) / 400);
      q += (e3 - q) * Oe(d2.magnet * t3, r2), Math.abs(e3 - q) < 3e-4 && (q = e3);
    }
    K += (q - K) * Oe($ ? d2.dragDamp : d2.damp, r2), Math.abs(q - K) < 5e-4 && (K = q);
    let a2 = r2 > 0 ? (K - Fn) / r2 : 0;
    Fn = K;
    let o2 = Math.tanh(a2 * 5) * d2.wiggle, s2 = 1 / (1 + Math.abs(a2) * d2.calm), c3 = Math.min(pt(), Math.max(0, Math.round(q / d2.gap) * d2.gap));
    if (!(Math.abs(q - c3) < 5e-4) || Math.abs(q - K) > d2.gap * 0.25) dt = false;
    else if (!dt && Math.abs(q - K) < 3e-3 && !$) {
      dt = true;
      let e3 = Math.round(q / d2.gap);
      Pn[e3] && (Pn[e3].press.v -= 0.014 * d2.press);
    }
    if (Math.abs(ft.v) > 4e-4 && (gn = true), F2 && bn && !$ && (_n || Math.abs(a2) > 1e-3)) {
      _n = false;
      let e3 = En(vn, yn);
      e3 !== pn && (pn = e3, F2.stage.classList.toggle(`is-hover`, e3 !== -1), R2());
    }
    let l2 = Math.min(e2.length - 1, Math.max(0, Math.round(K / d2.gap)));
    Sn = F2 && innerWidth >= 640 && !$ && wt === -1 && !Y[l2].returned ? xn ? 1 : bn && Math.abs(l2 * d2.gap - K) < d2.gap * 0.15 ? Math.max(Tn(l2), Cn && pn === l2 ? 1 : 0) * s2 : 0 : 0;
    let f3 = Ae(Math.max(0, 1 - Math.abs(l2 * d2.gap - K) / (d2.gap * 0.9)));
    F2 && vt(l2), ct(l2);
    let p2 = gn || Math.abs(q - K) > 4e-4 || Math.abs(J) > 2e-5;
    G.forEach((t3, n3) => {
      let i3 = n3 * d2.gap - K - ft.v, a3 = Ae(Math.max(0, 1 - Math.abs(i3) / (d2.gap * 0.9))), c4 = F2 && n3 === pn && n3 !== l2 ? s2 : 0;
      mn[n3] += (c4 - mn[n3]) * Oe(0.12, r2), Math.abs(c4 - mn[n3]) > 1e-3 && (p2 = true), yt[n3].v < 1 && (p2 = true);
      let u3 = Y[n3], h3 = n3 === l2 && qe(e2[n3]) ? Sn : 0;
      u3.peek += (h3 - u3.peek) * Oe(h3 > u3.peek ? 0.13 : 0.11, r2), Math.abs(h3 - u3.peek) < 5e-4 && (u3.peek = h3), Math.abs(h3 - u3.peek) > 1e-3 && (p2 = true), u3.tar = n3 === wt ? 1 : u3.returned ? 0 : Math.max(u3.peek * 0.38, F2 && !$ && n3 === pn && n3 === l2 ? 0.12 * s2 : 0), u3.cur += (u3.tar - u3.cur) * Oe(u3.tar === 1 ? 0.16 : 0.09, r2), Math.abs(u3.tar - u3.cur) > 1e-3 && (p2 = true), t3.pivot.rotation.y = -(St + (0.95 - St) * u3.cur);
      let g3 = u3.tar === 0 ? 0 : Ae(Math.max(0, (u3.cur - 0.08) / 0.92));
      u3.paper += (g3 - u3.paper) * Oe(u3.tar === 0 ? 0.24 : 0.16, r2), Math.abs(g3 - u3.paper) > 1e-3 && (p2 = true);
      let _2 = Pn[n3], v2 = (u3.cur - _2.openPrev) * d2.wiggle;
      u3.returned && _2.openPrev > 0.025 && u3.cur <= 0.025 && (_2.flap.v += 0.028 * d2.wiggle, _2.press.v -= 2e-3 * d2.press), _2.openPrev = u3.cur, _2.slop.v += v2 * 0.05, _2.flap.v += v2 * 0.1;
      let y2 = In(_2.lean, -o2 * 0.05, 0.12 * _2.kj, 0.38, r2);
      y2 += In(_2.slop, -o2, 0.2 * _2.kj, 0.5, r2), y2 += In(_2.flap, -o2, 0.16 / _2.kj, 0.16, r2), y2 += In(_2.press, 0, 0.18, 0.45, r2), y2 > 4e-3 && (p2 = true), t3.coverFlex.update(3e-3 + 0.03 * Math.sin(u3.cur * Math.PI) + u3.peek * 0.023);
      let b2 = Math.sqrt(u3.paper);
      t3.sheets.forEach((e3, r3) => {
        let i4 = u3.bases[r3], a4 = Ct[r3] ?? 0, o3 = Q && Q.idx === n3 && r3 === t3.sheets.length - 1, s3 = o3 ? 0 : _2.slop.x * a4;
        e3.position.x = i4.x + 0.18 * b2 * a4 + 0.02 * s3, e3.position.y = i4.y + 0.17 * u3.paper * a4, e3.position.z = i4.z + 0.08 * u3.paper * a4, e3.rotation.z = i4.r - 0.05 * u3.paper * a4 + 0.018 * s3;
        let c5 = r3 === t3.sheets.length - 1 ? o3 || Ht?.idx === n3 ? 0 : 1 - Ae(Math.min(1, u3.cur / 0.65)) : 1;
        t3.paperFlex[r3].update((5e-3 + r3 * 2e-3 + V(n3 * 11 + r3) * 5e-3 + Math.abs(s3) * 0.01) * c5), n3 === Z.idx && r3 === t3.sheets.length - 1 && (e3.position.y += Z.v * -2.6);
      }), t3.sticky && (t3.sticky.rotation.z = t3.stickyRot + _2.flap.x * 0.14, t3.flagFlex?.update(9e-3 + _2.flap.x * 0.035)), t3.preview.visible = u3.peek > 0, t3.preview.position.x = Te + u3.peek * Ee, t3.preview.position.y = we + u3.peek * 0.015, t3.preview.position.z = t3.sheets[t3.sheets.length - 1].position.z + 0.012, t3.preview.rotation.z = -0.028 * u3.peek;
      let x2 = Math.sign(i3) * (d2.push + Y[l2].peek * 0.17) * f3 * (1 - a3), S2 = t3.group;
      if (S2.visible = Math.abs(i3) < d2.gap * 8, !S2.visible) return;
      S2.position.x = i3 + x2, S2.position.z = d2.zLift * a3 + 0.05 * mn[n3], S2.position.y = (1 - yt[n3].v) * -1.7 + d2.hLift * mn[n3];
      let C2 = Math.atan2(S2.position.x, B2.position.z);
      S2.rotation.y = (Ln() - C2) * (1 - a3) - 0.1 * mn[n3], S2.rotation.z = _2.lean.x;
      let ee3 = (1 + (d2.fScale - 1) * a3) * (1 + _2.press.x);
      S2.scale.setScalar(ee3), t3.shadowMat.opacity = d2.shadow * (m2.theme === `dark` ? 1.6 : 1) * yt[n3].v * (1 - 0.35 * mn[n3]) * (1 - 4 * _2.press.x);
    }), F2 && (F2.stage.style.cursor = $ && hn ? `grabbing` : pn === -1 ? `grab` : `pointer`), cn(), p2 ? I2 = 0 : I2++, I2 < 8 && zn.ready() && (Q?.front ? (B2.layers.set(0), ae(z2), u2.render(z2, B2), Q.front.renderer.toneMapping = u2.toneMapping, Q.front.renderer.toneMappingExposure = u2.toneMappingExposure, B2.layers.set(1), Q.front.renderer.render(z2, B2), B2.layers.set(0)) : (ae(z2), u2.render(z2, B2)));
  }, zn = se(u2, z2, B2);
  return zn.done.then(R2), i.ticker.add(Rn), o.flightRoute = jt, new URLSearchParams(location.search).get(`debug`) === `folders` && (window.__folders = { folders: G, open: Y, wig: Pn, P: d2, cam: B2, state: () => ({ cur: K, tar: q, opening: wt, hoverIdx: pn, backdropIdx: Dt }), step: (e3 = 1, t2 = 16.7) => {
    for (let n2 = 0; n2 < e3; n2++) Rn(0, t2);
  }, setTar: (e3) => {
    q = e3;
  } }), { onPage: an, beforeNav: zt, beforeSwap: on, cleanup: () => { const c = currentCleanup; currentCleanup = []; return c }, bindStage(e3, t2) {
    ce2 = true, e3.hidden = false, t2 && (t2.hidden = true), An = new URLSearchParams(location.search).get(`beat`) === `hold`;
    let n2 = e3.querySelector(`[data-folders-title]`), r2 = e3.querySelector(`[data-folders-tip-title]`), i2 = (t3) => e3.querySelector(t3);
    F2 = { stage: e3, titleEl: n2, tipTitleEl: r2, excerptEl: i2(`[data-folders-excerpt]`), tagsEl: i2(`.wstage__tip-tags`), chipDate: i2(`[data-folders-chip-date]`), chipYear: i2(`[data-folders-chip-year]`), chipCat: i2(`[data-folders-chip-cat]`) }, e3.style.setProperty(`--wfill`, String(d2.fill)), vt(Math.round(K / d2.gap), true), bt || (o.active ? (document.addEventListener(`veil:reveal`, xt, { once: true }), a(() => document.removeEventListener(`veil:reveal`, xt))) : xt());
    let s2 = 0, c3 = 0, l2 = 0, u3 = 0, f3 = new me(), p2 = null, m3 = (e4) => {
      let t3 = fe(e4, innerHeight);
      t3 !== null && t3 !== 0 && (e4.preventDefault(), !$ && (J += t3 * d2.wheel * mt, ut = performance.now(), R2()));
    }, h3 = (t3) => {
      !t3.isPrimary || t3.button !== 0 || p2 !== null || t3.target.closest(`a, button`) || (p2 = t3.pointerId, xn = false, bn = t3.pointerType !== `touch`, vn = t3.clientX, yn = t3.clientY, $ = true, hn = false, s2 = 0, q = K, u3 = N(K, pt(), Dn()), J = 0, ut = performance.now(), c3 = t3.clientX, l2 = t3.clientY, f3.reset(t3.clientX, performance.now()), e3.classList.add(`is-dragging`), e3.setPointerCapture(t3.pointerId));
    }, g3 = (e4) => {
      if (!e4.isPrimary || p2 !== null && e4.pointerId !== p2 || (bn = e4.pointerType !== `touch`, vn = e4.clientX, yn = e4.clientY, _n = true, Math.abs(e4.movementX) + Math.abs(e4.movementY) > 1 && (xn = false, Y.forEach((e5) => {
        e5.returned = false;
      })), R2(), !$)) return;
      let t3 = e4.clientX - c3, n3 = e4.clientY - l2, r3 = performance.now();
      f3.add(e4.clientX, r3), c3 = e4.clientX, l2 = e4.clientY, s2 += Math.hypot(t3, n3), s2 >= 6 && (hn = true), u3 -= t3 * d2.drag * mt, q = pe(u3, pt(), Dn()), ut = performance.now();
    }, _2 = (t3) => {
      if (!(!$ || t3.pointerId !== p2)) {
        if (p2 = null, $ = false, hn = false, e3.hasPointerCapture(t3.pointerId) && e3.releasePointerCapture(t3.pointerId), e3.classList.remove(`is-dragging`), s2 < 6) Nn(t3.clientX, t3.clientY);
        else {
          let e4 = f3.read(performance.now());
          q -= e4 * d2.flick * mt, On(), ut = performance.now();
        }
        _n = true, R2();
      }
    }, v2 = (t3) => {
      t3.pointerId === p2 && (p2 = null, $ = hn = false, e3.classList.remove(`is-dragging`), e3.hasPointerCapture(t3.pointerId) && e3.releasePointerCapture(t3.pointerId), bn = false, pn = -1, On(), ut = performance.now(), R2());
    }, y2 = () => {
      bn = false, pn = -1, e3.classList.remove(`is-hover`), R2();
    }, b2 = () => {
      if (!n2?.matches(`:focus-visible`)) return;
      xn = true;
      let e4 = Y[_t];
      e4.returned = false, e4.peek = +(innerWidth >= 640), e4.cur = innerWidth >= 640 ? 0.38 : 0, R2();
    }, x2 = () => {
      xn && (Y[_t].peek = Y[_t].cur = Y[_t].paper = 0, xn = false, R2());
    }, S2 = (e4) => {
      e4.metaKey || e4.ctrlKey || e4.shiftKey || e4.altKey || (e4.preventDefault(), Mn(_t));
    }, C2 = (t3) => {
      if (!$ && (t3.key !== `Enter` || t3.target === e3)) {
        if (xn = false, t3.key === `ArrowRight` || t3.key === `ArrowLeft`) t3.preventDefault(), J = 0, q += t3.key === `ArrowRight` ? d2.gap : -d2.gap, On(), kn();
        else if (t3.key === `Home`) t3.preventDefault(), q = 0;
        else if (t3.key === `End`) t3.preventDefault(), q = pt();
        else if (t3.key === `Enter`) {
          t3.preventDefault(), Mn(_t);
          return;
        } else return;
        K = Fn = q, J = 0, Y.forEach((e4) => {
          e4.peek = e4.cur = e4.paper = 0, e4.returned = false;
        }), vt(Math.round(K / d2.gap), true), R2();
      }
    };
    e3.addEventListener(`wheel`, m3, { passive: false }), e3.addEventListener(`pointerdown`, h3), e3.addEventListener(`pointermove`, g3), e3.addEventListener(`pointerup`, _2), e3.addEventListener(`pointercancel`, v2), e3.addEventListener(`lostpointercapture`, v2), e3.addEventListener(`pointerleave`, y2), e3.addEventListener(`keydown`, C2), n2?.addEventListener(`click`, S2), n2?.addEventListener(`focus`, b2), n2?.addEventListener(`blur`, x2), a(() => {
      e3.removeEventListener(`wheel`, m3), e3.removeEventListener(`pointerdown`, h3), e3.removeEventListener(`pointermove`, g3), e3.removeEventListener(`pointerup`, _2), e3.removeEventListener(`pointercancel`, v2), e3.removeEventListener(`lostpointercapture`, v2), e3.removeEventListener(`pointerleave`, y2), e3.removeEventListener(`keydown`, C2), n2?.removeEventListener(`click`, S2), n2?.removeEventListener(`focus`, b2), n2?.removeEventListener(`blur`, x2), F2?.stage === e3 && (F2 = null), pn = -1, $ = false, bn = xn = false;
    });
  }, toShelf() {
    h2 = `shelf`, t.inFlight && !t.returning && t.abort();
    let e3 = t.returning ? Dt : -1;
    if (Z.idx === -1 ? wt = e3 : i.isTweening(Z) ? wt = Z.idx : It(0.04), G.forEach((t2, n2) => {
      n2 !== e3 && (t2.sheets[t2.sheets.length - 1].visible = true);
    }), e3 !== -1) {
      let n2 = G[e3], r2 = n2.sheets[n2.sheets.length - 1];
      requestAnimationFrame(() => requestAnimationFrame(() => {
        r2.updateWorldMatrix(true, false), t.flyHome(r2.matrixWorld.clone(), () => {
          r2.visible = true, wt = -1, Y[e3].returned = true, R2();
        });
      }));
    }
    Dt = -1, ge2(), o.flightRoute = jt, R2();
  }, toBackdrop(e3) {
    At(Ot(e3)), Mt();
  }, dispose() {
    nn(false), Ft(false), i.killTweensOf(Z), document.removeEventListener(`click`, Rt, true), i.ticker.remove(Rn), clearTimeout(Tt), window.removeEventListener(`pageshow`, Et), window.removeEventListener(`resize`, gt), document.removeEventListener(`visibilitychange`, sn), t.poseGuard = null, un.disconnect(), f2.forEach((e3) => e3.dispose()), c2.style.opacity = `0`, c2.style.filter = `none`, E2 = false, g2 && (g2.style.opacity = `0`), o.flightRoute = null, u2.clear(), t.damp = 0.11;
    try { u2.dispose() } catch { /* context already lost */ }
    if (tt === u2) tt = null;
  } };
}

/** Carter's Folders singleton (rt): { toShelf, toBackdrop, bindStage, dispose }. */
export function createWritingSystem(folders, canvas) {
  const world = createShelfWorld(folders, canvas)
  if (!world) return null
  return world
}
