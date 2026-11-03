/* Lanyard stage scene (Carter fidelity port).
 * Faithful re-implementation of app/lib/lanyard.js from the Carter source repo
 * (read-only ground truth): verlet-rope strap solver + badge-ridigbody solver,
 * three.js badge (procedural STUDIO PASS faces, Balky flag, metal hook), storm of
 * micro-interactions — drag-to-swing, click flip, pointer brushing, device
 * tilt/shake, breeze/puff keep-alive, veil-timed arrival, theme observer, debug
 * overlay. Constants and tunables are byte-identical to Carter's table below.
 *
 * Runtime wiring (Carter mesh.ts) is re-expressed through Jesper's stack:
 *   e.ticker.add(In)      -> gsap.ticker.add(tick)            (same callback)
 *   n.active + veil:reveal -> venue promise passed by Studio.jsx (appReady-driven)
 *   t(cb)=route bus        -> React effect cleanup
 *   xe(p,h,g) gl-warm      -> local warmFrame() (renderer.compile + one manual frame,
 *                             identical to the desk scene's approach)
 * Not ported (dev-only affordances, same stance as the Contact port): ?tune=lanyard
 * slider panel and the ?mesh wireframe global override. ?debug=lanyard IS ported.
 *
 * Backend: none. This module talks to no service; the only outbound move on the
 * page is the plain InfoTip anchor to balky.studio.
 */
import * as THREE from 'three'
import gsap from 'gsap'
import { makeStudioEnv } from './studioEnv.js'

/* ---------- Carter constants (verbatim) ---------- */
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
const Ce = 2.5, we = 3.5, Te = 0.03, Ee = 0.09, De = 0.2, Oe = 0.62,
  ke = 0.3, Ae = 0.075, je = 0.72, f = 0.46, Me = 1.02,
  Ne = new THREE.Vector2(0, 0.62), Pe = 28
const TUNE = {
  gravity: 34, damp: 0.988, vmax: 0.14, follow: 0.2, hold: 0.55,
  stretch: 0.9, throw: 0.45, breeze: 0.0012, nudge: 0.01, nudgeEvery: 8,
  flip: 0.012, brake: 0.5, tilt: 0.16, band: 1.2, shake: 0.001, shakeAt: 9,
  lift: 4.4, lower: 1.1, catch: 0.022, iters: 10, bend: 0.35, push: 0.22,
  key: 2.1, face: 0.0032, faceHeld: 0.4, restY: -0.42, seg: 0.22,
}

/* ---------- small helpers (verbatim) ---------- */
const Ie = (e, t, n, r) => {
  let i = -t / 2, a = -n / 2
  return e.moveTo(i + r, a), e.lineTo(i + t - r, a),
    e.quadraticCurveTo(i + t, a, i + t, a + r), e.lineTo(i + t, a + n - r),
    e.quadraticCurveTo(i + t, a + n, i + t - r, a + n), e.lineTo(i + r, a + n),
    e.quadraticCurveTo(i, a + n, i, a + n - r), e.lineTo(i, a + r),
    e.quadraticCurveTo(i, a, i + r, a), e
}
const Le = (e, t, n) => Ie(new THREE.Shape(), e, t, n)
const Re = (e, t, n) => {
  let r = Math.min(1, Math.max(0, (n - e) / (t - e)))
  return r * r * (3 - 2 * r)
}
const p = e => {
  let t = Math.sin(e * 127.1 + 311.7) * 43758.5453
  return t - Math.floor(t)
}

/* ---------- Balky flag (embedded, verbatim SVG) ---------- */
const ze = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -5 43 47" fill="none">
<mask id="m" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="2" width="38" height="22">
<path d="M5.27133 4.91922C5.27133 4.91922 14.075 7.09747 19.391 3.34013C24.707 -0.417198 37.4864 4.91922 37.4864 4.91922L33.5106 21.9247C33.5106 21.9247 23.003 15.2021 16.7553 20.2242C10.5076 25.2462 0 21.9247 0 21.9247L5.27133 4.91922Z" fill="#D9D9D9"/></mask>
<g mask="url(#m)">
<path d="M6.04547 -2.10032C6.61636 -3.89376 8.53303 -4.88483 10.3265 -4.31393L19.3022 -1.45676L10.3435 26.6866L1.36781 23.8294C-0.425629 23.2585 -1.4167 21.3418 -0.845808 19.5484L6.04547 -2.10032Z" fill="#F25116"/>
<path d="M19.3022 -1.45676L29.488 1.78563L20.5293 29.929L10.3435 26.6866L19.3022 -1.45676Z" fill="#545251"/>
<path d="M29.488 1.78563L37.6367 4.37954L28.678 32.5229L20.5293 29.929L29.488 1.78563Z" fill="#A6A5A4"/>
<path d="M37.6367 4.37954L40.0934 5.16159C41.8869 5.73248 42.8779 7.64915 42.307 9.44259L35.4158 31.0913C34.8449 32.8848 32.9282 33.8758 31.1348 33.3049L28.678 32.5229L37.6367 4.37954Z" fill="#DFDBD8"/></g>
<path d="M36.5126 4.66331L38.1617 5.09201L28.7544 41.561L26.9218 41.5533L36.5126 4.66331Z" fill="#DFDBD8"/></svg>`
const Be = 43 / 47
function Ve() {
  return new Promise(e => {
    let t = new Image()
    t.onload = () => e(t), t.onerror = () => e(null)
    t.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ze)
  })
}

/* ---------- fonts / canvas metrics (verbatim) ---------- */
const He = '"Oracle", "Geist Variable", system-ui, sans-serif',
  Ue = '"PP Neue Montreal Mono", "Geist Mono Variable", ui-monospace, monospace',
  We = 1e3, Ge = 1400, m = 88, h = '#efeeeb', g_ = '#1e1e1e', _ = 'rgba(30,30,30,0.58)'

function Ke(e, t) {
  for (let n = 0; n < 9e3; n++) {
    let r = p(t + n * 2.1) * We, i = p(t + n * 3.7) * Ge, a = p(t + n * 5.3)
    e.fillStyle = a > 0.5 ? `rgba(0,0,0,${0.03 + a * 0.05})` : `rgba(255,255,255,${0.15 + a * 0.3})`
    e.fillRect(r, i, 1.5, 1.5)
  }
}
function v(e, t, n) {
  try { e.letterSpacing = `${(t * n).toFixed(2)}px` } catch { /* noop */ }
}

/* front face painter (verbatim) */
function paintFront(e, t) {
  let n = e.getContext('2d')
  n.fillStyle = h, n.fillRect(0, 0, We, Ge), Ke(n, 11)
  n.fillStyle = _, n.font = `500 28px ${Ue}`, v(n, 28, 0.04)
  n.textBaseline = 'alphabetic', n.textAlign = 'left'
  n.fillText('STUDIO PASS', m, 110)
  n.textAlign = 'right', n.fillText(t.year, 912, 110)
  v(n, 28, 0), n.textAlign = 'left'
  n.fillStyle = g_, n.font = `500 96px ${He}`, v(n, 96, -0.028)
  n.fillText(t.name, 84, 1078)
  v(n, 96, 0)
  n.fillStyle = _, n.font = `400 44px ${He}`, v(n, 44, -0.01)
  n.fillText(t.role, m, 1142), v(n, 44, 0)
  n.fillStyle = 'rgba(30,30,30,0.18)', n.fillRect(m, 1232, 824, 2)
  n.fillStyle = g_, n.font = `500 28px ${Ue}`, v(n, 28, 0.04)
  n.fillText(t.studio.toUpperCase(), m, 1298)
  n.textAlign = 'right', n.fillStyle = _, n.fillText(t.place.toUpperCase(), 912, 1298)
  v(n, 28, 0)
}

/* back face painter (verbatim) */
function paintBack(e, t) {
  let n = e.getContext('2d')
  n.fillStyle = h, n.fillRect(0, 0, We, Ge), Ke(n, 29)
  n.fillStyle = g_, n.textAlign = 'left', n.font = `400 108px ${He}`, v(n, 108, -0.042)
  let r = t.line.split(' '),
    i = Math.ceil(r.length / 2)
  n.fillText(r.slice(0, i).join(' '), 84, 418)
  n.fillText(r.slice(i).join(' ') + '.', 84, 524)
  v(n, 108, 0)
  let a = m, o = a, s = 0
  for (n.fillStyle = g_; o < 612;) {
    let e = 2 + Math.floor(p(500 + s) * 4) * 2
    p(900 + s) > 0.42 && n.fillRect(o, 1160, e, 92)
    o += e + 2, s++
  }
  n.fillStyle = _, n.font = `500 28px ${Ue}`, v(n, 28, 0.04)
  n.textAlign = 'right', n.fillText(t.addr, 912, 1248)
  n.textAlign = 'left', n.fillText('STUDIO PASS', a, 1296)
  n.textAlign = 'right', n.fillText(t.year, 912, 1296)
  v(n, 22, 0)
}

/* strap marquee + bump canvases (verbatim) */
function strapCanvas(e, t) {
  let n = document.createElement('canvas')
  n.width = 256, n.height = 1024
  let r = n.getContext('2d')
  r.fillStyle = '#151515', r.fillRect(0, 0, 256, 1024)
  r.strokeStyle = 'rgba(255,255,255,0.045)', r.lineWidth = 1.2
  for (let e = -1024; e < 1280; e += 6) {
    r.beginPath(), r.moveTo(e, 0), r.lineTo(e + 1024, 1024), r.stroke()
  }
  r.strokeStyle = 'rgba(0,0,0,0.35)'
  for (let e = 0; e < 2300; e += 6) {
    r.beginPath(), r.moveTo(e, 0), r.lineTo(e - 1024, 1024), r.stroke()
  }
  r.save(), r.translate(128, 0), r.rotate(Math.PI / 2)
  r.fillStyle = t, r.font = `500 54px ${Ue}`
  r.textBaseline = 'middle', r.textAlign = 'left'
  let i = `${e.toUpperCase()}   ✱   `,
    a = r.measureText(i).width,
    o = Math.ceil(1024 / a) + 1,
    s = 1024 / (a * Math.max(1, Math.round(1024 / a)))
  r.scale(s, 1)
  for (let e = 0; e < o; e++) r.fillText(i, e * a, 0)
  return r.restore(), n
}
function bumpCanvas() {
  let e = document.createElement('canvas')
  e.width = e.height = 128
  let t = e.getContext('2d')
  t.fillStyle = '#808080', t.fillRect(0, 0, 128, 128)
  t.strokeStyle = '#a8a8a8', t.lineWidth = 1.5
  for (let e = -128; e < 256; e += 6) {
    t.beginPath(), t.moveTo(e, 0), t.lineTo(e + 128, 128), t.stroke()
  }
  return e
}

/* ---------- verlet helpers (verbatim) ---------- */
const yv = (e, t, n, r = 1) => ({ x: e, y: t, z: n, px: e, py: t, pz: n, w: r })
const Ze = (e, t) => Math.hypot(e.x - t.x, e.y - t.y, e.z - t.z)
const stick = (e, t, n = 1) => ({ a: e, b: t, d: Ze(e, t), k: n })
function Qe(e) {
  let t = e.b.x - e.a.x, n = e.b.y - e.a.y, r = e.b.z - e.a.z,
    i = Math.hypot(t, n, r) || 1e-6,
    a = e.a.w + e.b.w
  if (!a) return
  let o = (i - e.d) / i * e.k,
    s = o * e.a.w / a, c = o * e.b.w / a
  e.a.x += t * s, e.a.y += n * s, e.a.z += r * s
  e.b.x -= t * c, e.b.y -= n * c, e.b.z -= r * c
}

/* ---------- one-shot WebGL warm (Carter wheels-gl-warm; Jesper data-modes are
 * always "full", i.e. Carter's desktop branch): compile + one integration frame so
 * the first visible frame is never compile-black (same approach as the desk). */
function makeWarm(renderer, scene, camera) {
  let warmed = false
  return {
    ready() {
      if (warmed) return true
      try {
        renderer.compile(scene, camera)
        renderer.render(scene, camera)
        warmed = true
      } catch { /* keep trying next tick, never crash */ }
      return warmed
    },
  }
}

/* ==========================================================================
 * mountLanyard(stage, canvas, copy, { veilActive }) -> dispose | null
 * Carter's build must never be able to blank the app: any engine-construction
 * failure is contained here and reported to the console, leaving the classic
 * fallback tile + navigation intact.
 * ========================================================================== */
export function mountLanyard(t, o, Se, { veilActive = false } = {}) {
  if (prefersReducedMotion()) return null
  try {
    const engine = buildStage(t, o, Se, veilActive)
    return engine ? engine.dispose : null
  } catch (err) {
    console.warn('[studio] lanyard engine failed to mount; keeping classic tile.', err)
    return null
  }
}

function buildStage(t, o, Se, veilActive) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas: o, antialias: true, alpha: true })
  } catch { return null }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0, 0)
  renderer.toneMapping = THREE.NeutralToneMapping /* Carter: 7 */
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap /* Carter: 1 */

  let aniso = renderer.capabilities.getMaxAnisotropy(),
    m = { ...TUNE },
    scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(Pe, 1, 0.1, 100),
    { envRT, pmrem } = makeStudioEnv(renderer)
  scene.environment = envRT.texture

  let key = new THREE.DirectionalLight(0xffffff, m.key)
  key.position.set(-3, 4, 5), key.castShadow = true
  let coarse = matchMedia('(max-width: 47.99rem), (pointer: coarse)').matches
  key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048)
  {
    let e = key.shadow.camera
    e.left = e.bottom = -5.5, e.right = e.top = 5.5, e.near = 0.5, e.far = 20
    key.shadow.bias = -0.0005, key.shadow.normalBias = 0.01, key.shadow.radius = 1.8
  }
  scene.add(key)
  let fill = new THREE.DirectionalLight(0xffffff, 0.5)
  fill.position.set(3, 1, 4), scene.add(fill)

  /* materials (verbatim colors) */
  let hookMat = new THREE.MeshStandardMaterial({ color: 2829359, metalness: 0.9, roughness: 0.34 }),
    frameMat = new THREE.MeshStandardMaterial({ color: 1644825, metalness: 0, roughness: 0.52 }),
    ringMat = new THREE.MeshStandardMaterial({ color: 10264226, metalness: 1, roughness: 0.3 }),
    discMat = new THREE.MeshPhysicalMaterial({ color: 1710618, metalness: 0, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.35, envMapIntensity: 0.35 }),
    S = new THREE.CanvasTexture(bumpCanvas())
  S.wrapS = S.wrapT = THREE.RepeatWrapping, S.repeat.set(2, 40)

  let C = new THREE.CanvasTexture(strapCanvas(Se.studio, '#5a5a5a'))
  C.colorSpace = THREE.SRGBColorSpace, C.wrapS = C.wrapT = THREE.RepeatWrapping, C.anisotropy = aniso
  let strapMat = new THREE.MeshStandardMaterial({
    map: C, bumpMap: S, bumpScale: 0.6, roughness: 0.92, metalness: 0, side: 2,
  })

  let frontCanv = document.createElement('canvas')
  frontCanv.width = We, frontCanv.height = Ge
  let backCanv = document.createElement('canvas')
  backCanv.width = We, backCanv.height = Ge
  let frontTex = new THREE.CanvasTexture(frontCanv),
    backTex = new THREE.CanvasTexture(backCanv)
  ;[frontTex, backTex].forEach(e => { e.colorSpace = THREE.SRGBColorSpace; e.anisotropy = aniso })
  let edgeMat = new THREE.MeshStandardMaterial({ color: 14605528, roughness: 1, metalness: 0 }),
    frontMat = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.96, metalness: 0 }),
    backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.96, metalness: 0 }),
    repaint = () => {
      paintFront(frontCanv, Se), paintBack(backCanv, Se)
      frontTex.needsUpdate = true, backTex.needsUpdate = true
    }
  repaint()

  /* card assembly (verbatim geometry) */
  let w = new THREE.Group()
  scene.add(w)
  let frameShape = Le(2.72, 3.72, De)
  frameShape.holes.push(Ie(new THREE.Path(), 2.3, 3.3, 0.05000000000000001))
  let frameGeo = new THREE.ExtrudeGeometry(frameShape, {
    depth: Ee, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3,
  })
  frameGeo.translate(0, 0, -0.09 / 2)
  let frameMesh = new THREE.Mesh(frameGeo, frameMat)
  frameMesh.castShadow = frameMesh.receiveShadow = true, w.add(frameMesh)

  let ht = 2.02,
    loopShape = Le(Oe, 0.4, 0.16)
  {
    let e = new THREE.Path()
    e.absarc(0, 0.16, Ae, 0, Math.PI * 2, true), loopShape.holes.push(e)
  }
  let loopGeo = new THREE.ExtrudeGeometry(loopShape, {
    depth: Ee * 0.8, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2,
  })
  loopGeo.translate(0, 1.86, -0.036)
  let loopMesh = new THREE.Mesh(loopGeo, frameMat)
  loopMesh.castShadow = loopMesh.receiveShadow = true, w.add(loopMesh)

  let yt = Ee / 2 - 0.028,
    cardGeo = new THREE.BoxGeometry(Ce, we, Te),
    cardMesh = new THREE.Mesh(cardGeo, [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat])
  cardMesh.position.z = yt - Te / 2, cardMesh.receiveShadow = true, w.add(cardMesh)

  /* hook assembly: brass ring + dark disc + flag + metal mechanism (verbatim) */
  let St = new THREE.Group(),
    T = 0.964,
    ringShape = Le(Me, Me, Me * 0.224)
  ringShape.holes.push(Ie(new THREE.Path(), T, T, T * 0.21))
  let ringGeo = new THREE.ExtrudeGeometry(ringShape, {
      depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4,
    }),
    ringMesh = new THREE.Mesh(ringGeo, ringMat)
  ringMesh.castShadow = true, St.add(ringMesh)
  let discGeo = new THREE.ExtrudeGeometry(Le(T, T, T * 0.21), {
      depth: 0.05, bevelEnabled: false,
    }),
    discMesh = new THREE.Mesh(discGeo, discMat)
  discMesh.position.z = 0, St.add(discMesh)
  let Ot = Me * 0.44,
    flagGeo = new THREE.PlaneGeometry(Ot, Ot / Be),
    flagMat = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, alphaTest: 0.02 })
  flagMat.polygonOffset = true, flagMat.polygonOffsetFactor = -2
  let flagMesh = new THREE.Mesh(flagGeo, flagMat)
  flagMesh.position.set(0, 0.02, 0.0505), flagMesh.visible = false, St.add(flagMesh)
  Ve().then(e => {
    if (!e) return
    let t = document.createElement('canvas')
    t.width = 512, t.height = Math.round(512 / Be)
    t.getContext('2d').drawImage(e, 0, 0, t.width, t.height)
    flagMat.map = new THREE.CanvasTexture(t)
    flagMat.map.colorSpace = THREE.SRGBColorSpace, flagMat.map.anisotropy = aniso
    flagMat.needsUpdate = true, flagMesh.visible = true
  })
  St.position.set(Ne.x, Ne.y, yt), w.add(St)

  /* invisible pointer target (verbatim) */
  let hitGeo = new THREE.PlaneGeometry(2.72, 4.0200000000000005),
    hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0, colorWrite: false, depthWrite: false, side: 2,
    }))
  hitMesh.position.y = ke / 2, w.add(hitMesh)

  /* metal hook group at the strap's top (verbatim parts) */
  let D = new THREE.Group()
  scene.add(D)
  {
    let e = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.15, 0.1), hookMat)
    e.castShadow = true, D.add(e)
    let t2 = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.02, 12, 40), hookMat)
    t2.position.y = -0.19, D.add(t2)
    let n = new THREE.Mesh(new THREE.SphereGeometry(0.042, 20, 14), hookMat)
    n.position.y = -0.32, D.add(n)
    let r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 16), hookMat)
    r.position.y = -0.4, D.add(r)
    let i = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.15, 6, 16), hookMat)
    i.position.y = -0.55, D.add(i)
    let a = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.028, 12, 40, Math.PI * 1.55), hookMat)
    a.position.set(0, -0.72 + 0.07, 0.078), a.rotation.z = Math.PI * 0.72, a.castShadow = true, D.add(a)
    let o2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.13, 10), hookMat)
    o2.position.set(0.06, -0.605, 0.078), o2.rotation.z = -0.55, D.add(o2)
  }

  /* strap ribbon mesh (verbatim sizing) */
  let strapGeo = new THREE.BufferGeometry(),
    k = new Float32Array(336),
    A = new Float32Array(336),
    Pt2 = new Float32Array(224),
    idx = []
  for (let e = 0; e < 55; e++) {
    let t2 = e * 2, n = t2 + 1, r = t2 + 2, i = t2 + 3
    idx.push(t2, r, n, n, r, i)
  }
  strapGeo.setAttribute('position', new THREE.BufferAttribute(k, 3))
  strapGeo.setAttribute('normal', new THREE.BufferAttribute(A, 3))
  strapGeo.setAttribute('uv', new THREE.BufferAttribute(Pt2, 2))
  strapGeo.setIndex(idx)
  let strapMesh = new THREE.Mesh(strapGeo, strapMat)
  strapMesh.castShadow = true, strapMesh.frustumCulled = false, scene.add(strapMesh)

  /* verlet state (verbatim structure) */
  let hookP = yv(0, 6, 0, 0),
    M = [],
    N = [yv(-2.5 / 2, we / 2, 0), yv(Ce / 2, we / 2, 0), yv(Ce / 2, -3.5 / 2, 0), yv(-2.5 / 2, -3.5 / 2, 0)],
    P = yv(0, ht, 0),
    Lt = yv(0, 0, -1.1),
    F = [...N, P, Lt],
    held = null,
    chain = [],
    bodyRods = [],
    rest = F.map(e => new THREE.Vector3(e.x, e.y, e.z))
  for (let e = 0; e < F.length; e++)
    for (let t2 = e + 1; t2 < F.length; t2++) bodyRods.push(stick(F[e], F[t2]))

  let vpW = 1, vpH = 1, dist = 14, halfH = 4,
    fit = () => {
      let e = Math.tan(Pe / 2 * (Math.PI / 180)),
        t2 = vpW / vpH,
        n = 4.4 / 0.6 / (2 * e),
        r = 4.4 / (t2 * 2 * e)
      dist = Math.max(n, r), camera.aspect = t2, camera.fov = Pe,
      camera.position.set(0, 0, dist), camera.lookAt(0, 0, 0), camera.updateProjectionMatrix()
      halfH = dist * e
    },
    Wt = new THREE.Matrix4(),
    pose = (e, t2, n, r = 0, i = 0) => {
      Wt.makeRotationY(r).multiply(new THREE.Matrix4().makeRotationX(i))
      Wt.setPosition(e, t2, n)
      F.forEach((e2, t3) => {
        let n2 = rest[t3].clone().applyMatrix4(Wt)
        e2.x = e2.px = n2.x, e2.y = e2.py = n2.y, e2.z = e2.pz = n2.z
      })
    },
    rebuild = e => {
      hookP.x = 0, hookP.y = halfH + 0.6, hookP.z = 0
      hookP.px = hookP.x, hookP.py = hookP.y, hookP.pz = hookP.z
      let t2 = m.restY + ht + je,
        n = Math.max(0.6, hookP.y - t2),
        r = Math.max(3, Math.round(n / m.seg) + 1),
        i = n / (r - 1)
      M = []
      for (let t3 = 0; t3 < r; t3++) {
        let n2 = e ? hookP.y - t3 * i * 0.45 : hookP.y - t3 * i
        M.push(yv(0, n2, 0, t3 === 0 ? 0 : 1))
      }
      M[0] = hookP, chain = []
      for (let e2 = 0; e2 < r - 1; e2++) {
        let t3 = stick(M[e2], M[e2 + 1], m.stretch)
        t3.d = i, chain.push(t3)
      }
      for (let e2 = 0; e2 < r - 2; e2++) {
        let t3 = stick(M[e2], M[e2 + 2], m.bend)
        t3.d = i * 2, chain.push(t3)
      }
      let a = M[r - 1]
      e
        ? (pose(0.25, a.y - ht - je, 0, 0.15, -0.12), F.forEach(e2 => { e2.px = e2.x - 0.006 }))
        : pose(0, m.restY, 0)
      let o2 = stick(a, P)
      o2.d = je, chain.push(o2)
      let s = stick(M[r - 2], P, 0.6)
      if (s.d = i + je, chain.push(s), e)
        for (let e2 of [...M, ...F]) e2.y += m.lift, e2.py += m.lift
    },
    onResize = () => {
      let e = t.getBoundingClientRect()
      if (e.width < 2 || e.height < 2 ||
          (Math.abs(e.width - vpW) < 1 && Math.abs(e.height - vpH) < 1 && M.length)) return
      vpW = e.width, vpH = e.height, renderer.setSize(vpW, vpH, false), fit()
      let n = (N[0].x + N[1].x + N[2].x + N[3].x) / 4,
        r = (N[0].y + N[1].y + N[2].y + N[3].y) / 4,
        i = (N[0].z + N[1].z + N[2].z + N[3].z) / 4,
        a = M.length === 0
      rebuild(a), a || pose(n, r, i)
    }
  onResize()
  let RO = new ResizeObserver(onResize)
  RO.observe(t)

  /* pointer interaction (verbatim) */
  let z = new THREE.Vector3(), B = new THREE.Vector3(), V = new THREE.Vector3(),
    Yt = new THREE.Vector3(),
    abort = new AbortController(), H = abort.signal,
    raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(),
    ptr = { x: 0, y: 0, on: false, down: false, moved: 0, t: 0 },
    grabZ0 = 0, G = new THREE.Vector3(), rayO = new THREE.Vector3(), rayD = new THREE.Vector3(),
    finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches,
    toNDC = e => {
      let t2 = o.getBoundingClientRect()
      ndc.set((e.clientX - t2.left) / t2.width * 2 - 1,
        -((e.clientY - t2.top) / t2.height) * 2 + 1)
    },
    toPlaneZ = (e, t2) => {
      raycaster.setFromCamera(ndc, camera)
      let n = raycaster.ray.origin,
        r = raycaster.ray.direction,
        i = (e - n.z) / r.z
      return t2.copy(n).addScaledVector(r, i)
    },
    pickCard = () => {
      raycaster.setFromCamera(ndc, camera)
      let e = raycaster.intersectObject(hitMesh, false)
      return e.length ? e[0] : null
    }

  o.addEventListener('pointermove', e => {
    toNDC(e), ptr.on = true
    ptr.down && (ptr.moved += Math.hypot(e.movementX, e.movementY))
    held
      ? ptr.moved > 6 && finePointer && (o.style.cursor = 'grabbing')
      : finePointer && (o.style.cursor = pickCard() ? 'grab' : '')
  }, { signal: H, passive: true })
  o.addEventListener('pointerleave', () => { ptr.on = false }, { signal: H })
  o.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    toNDC(e)
    let t2 = pickCard()
    if (ptr.down = true, ptr.moved = 0, ptr.t = performance.now(), t2) {
      e.preventDefault()
      try { o.setPointerCapture(e.pointerId) } catch { /* noop */ }
      grabZ0 = t2.point.z
      nextNudge = simT + m.nudgeEvery
      held = yv(t2.point.x, t2.point.y, t2.point.z, 0)
      bodyRods = bodyRods.filter(e2 => e2.a !== held && e2.b !== held)
      F.forEach(e2 => bodyRods.push(stick(held, e2, m.hold)))
    }
  }, { signal: H })

  let normal = new THREE.Vector3(), snapSteps = 0,
    bdir = () => {
      let [e, t2, n, r] = N
      z.set(t2.x - e.x + (n.x - r.x), t2.y - e.y + (n.y - r.y), t2.z - e.z + (n.z - r.z)).normalize()
      B.set(e.x - r.x + (t2.x - n.x), e.y - r.y + (t2.y - n.y), e.z - r.z + (t2.z - n.z))
      V.crossVectors(z, B).normalize(), B.crossVectors(V, z).normalize()
    },
    turned = false,
    flip = () => {
      bdir(), normal.copy(V), snapSteps = 90, turned = false
    },
    catchSettle = () => {
      if (!turned || snapSteps || (bdir(), Math.abs(V.z) < 0.965)) return
      turned = false
      let e = M.length
      for (let t2 = Math.floor(e * 0.66); t2 < e; t2++) {
        let n = M[t2]
        n.w && (n.py += m.catch * ((t2 - e * 0.66) / (e * 0.34)))
      }
      for (let e2 of F) e2.py += m.catch
    },
    flipStep = () => {
      if (snapSteps) {
        if (bdir(), V.dot(normal) < -0.15) {
          snapSteps = 0, turned = true
          for (let e of F) {
            e.px = e.x - (e.x - e.px) * m.brake
            e.py = e.y - (e.y - e.py) * m.brake
            e.pz = e.z - (e.z - e.pz) * m.brake
          }
          return
        }
        snapSteps-- , F.forEach((e, t2) => {
          let n = Math.sign(rest[t2].x) || 0
          e.x += V.x * n * m.flip, e.y += V.y * n * m.flip, e.z += V.z * n * m.flip
        })
      }
    },
    release = e => {
      if (!ptr.down) return
      ptr.down = false, e.pointerType === 'touch' && armMotion()
      let t2 = !!held
      if (held) {
        let n = held
        held = null, bodyRods = bodyRods.filter(e2 => e2.a !== n && e2.b !== n)
        for (let e2 of F) {
          e2.px = e2.x - (e2.x - e2.px) * m.throw
          e2.py = e2.y - (e2.y - e2.py) * m.throw
          e2.pz = e2.z - (e2.z - e2.pz) * m.throw
        }
        try { o.releasePointerCapture(e.pointerId) } catch { /* noop */ }
        o.style.cursor = pickCard() ? 'grab' : ''
      }
      t2 && ptr.moved < 6 && performance.now() - ptr.t < 320 && flip()
    }
  o.addEventListener('pointerup', release, { signal: H })
  o.addEventListener('pointercancel', release, { signal: H })

  /* device tilt + shake (verbatim) */
  let down = { x: 0, y: -1 },
    downTarget = { x: 0, y: -1 },
    listening = false,
    onMotion = e => {
      let t2 = e.accelerationIncludingGravity
      if (!t2 || t2.x === null || t2.y === null) return
      let n = screen.orientation?.angle ?? 0,
        r = t2.x, i = t2.y
      n === 90 ? (r = t2.y, i = -t2.x)
        : n === 270 || n === -90 ? (r = -t2.y, i = t2.x)
        : n === 180 && (r = -t2.x, i = -t2.y)
      let a = -(Math.sign(r) * Math.max(0, Math.abs(r) - m.band)) / 9.81 * m.tilt,
        o2 = -i / 9.81 * m.tilt - 0.35,
        s = Math.hypot(a, o2) || 1
      downTarget.x = a / s, downTarget.y = o2 / s
      let c = e.acceleration
      if (c && c.x !== null && c.y !== null) {
        let e2 = c.x, t3 = c.y
        n === 90 ? (e2 = c.y, t3 = -c.x)
          : n === 270 || n === -90 ? (e2 = -c.y, t3 = c.x)
          : n === 180 && (e2 = -c.x, t3 = -c.y)
        let r2 = Math.hypot(e2, t3)
        if (r2 > m.shakeAt) {
          let n2 = Math.min(r2 - m.shakeAt, 12) * m.shake,
            i2 = -e2 / r2 * n2,
            a2 = -t3 / r2 * n2
          for (let e3 of [...M, ...F]) e3.w && (e3.px -= i2, e3.py -= a2)
          nextNudge = simT + m.nudgeEvery
        }
      }
    },
    dbgEl = new URLSearchParams(location.search).get('debug') === 'lanyard'
      ? (() => {
          let e = document.createElement('pre')
          e.style.cssText = 'position:fixed;inset-inline-start:8px;inset-block-start:88px;z-index:3000;margin:0;padding:6px 8px;font:500 10px/1.4 ui-monospace,monospace;color:var(--ink);background:var(--popover,rgba(38,38,38,.92));border:1px solid var(--line);border-radius:6px;pointer-events:none'
          t.appendChild(e)
          return e
        })()
      : null,
    dbg = (e, t2) => {
      dbgEl && (dbgState[e] = t2,
        dbgEl.textContent = Object.entries(dbgState).map(([e2, t3]) => `${e2}: ${t3}`).join('\n'))
    },
    dbgState = {}
  dbg('secure', String(isSecureContext))
  dbg('DeviceMotionEvent', String(typeof DeviceMotionEvent))
  dbg('motion', 'off')
  let dbgCount = 0,
    listen = () => {
      listening || (listening = true, dbg('motion', 'listening'),
        window.addEventListener('devicemotion', e => {
          if (onMotion(e), dbgEl && ++dbgCount % 10 === 0) {
            let t2 = e.accelerationIncludingGravity
            dbg('events', String(dbgCount))
            dbg('g', t2 ? `${t2.x?.toFixed(1)} ${t2.y?.toFixed(1)} ${t2.z?.toFixed(1)}` : 'null')
            dbg('dir', `${down.x.toFixed(2)} ${down.y.toFixed(2)}`)
          }
        }, { signal: H, passive: true }))
    },
    armMotion = () => {
      let e = window.DeviceMotionEvent
      if (!e) { dbg('motion', 'no DeviceMotionEvent'); return }
      if (typeof e.requestPermission === 'function') {
        if (listening) return
        dbg('motion', 'asking…')
        e.requestPermission().then(e2 => {
          dbg('permission', e2), e2 === 'granted' && listen()
        }).catch(e2 => dbg('permission', 'error ' + String(e2)))
      } else listen()
    }
  if (matchMedia('(pointer: coarse)').matches) {
    let e = window.DeviceMotionEvent
    e && typeof e.requestPermission !== 'function' && listen()
  }

  /* simulation (verbatim) */
  let step = 1 / 120, acc = 0, simT = 0, nextNudge = 3.5, nudgeSign = 1,
    puff = () => {
      if (held || ptr.down) return
      nudgeSign = -nudgeSign
      let e = M.length
      for (let t2 = 1; t2 < e; t2++) {
        let n = t2 / (e - 1)
        M[t2].px -= nudgeSign * m.nudge * n * n
      }
      F.forEach((e2, t2) => {
        e2.px -= nudgeSign * m.nudge * 0.9
        let n = Math.sign(rest[t2].x) || 0
        e2.pz -= n * nudgeSign * m.nudge * 0.45
      })
    },
    integrate = () => {
      down.x += (downTarget.x - down.x) * 0.015
      down.y += (downTarget.y - down.y) * 0.015
      let e = down.x * m.gravity * step * step,
        t2 = down.y * m.gravity * step * step
      simT += step
      let n = Math.sin(simT * 0.7) * m.breeze * step,
        r = Math.sin(simT * 0.43 + 1.3) * m.breeze * 0.5 * step,
        i = [...M, ...F]
      for (let a of i) {
        if (!a.w) continue
        let i2 = (a.x - a.px) * m.damp,
          o2 = (a.y - a.py) * m.damp,
          s = (a.z - a.pz) * m.damp,
          c = Math.hypot(i2, o2, s)
        if (c > m.vmax) {
          let e2 = m.vmax / c
          i2 *= e2, o2 *= e2, s *= e2
        }
        a.px = a.x, a.py = a.y, a.pz = a.z
        a.x += i2 + n + e, a.y += o2 + t2, a.z += s + r
      }
      if (ptr.on && !held && !ptr.down) {
        raycaster.setFromCamera(ndc, camera)
        rayO.copy(raycaster.ray.origin), rayD.copy(raycaster.ray.direction)
        let e2 = m.push
        for (let t3 of M) {
          if (!t3.w) continue
          G.set(t3.x, t3.y, t3.z).sub(rayO)
          let n2 = G.dot(rayD)
          G.addScaledVector(rayD, -n2)
          let r2 = G.length()
          if (r2 < e2 && r2 > 1e-4) {
            let n3 = (e2 - r2) / r2 * 0.35
            t3.x += G.x * n3, t3.y += G.y * n3, t3.z += G.z * n3
          }
        }
      }
      {
        let e2 = held ? m.face * m.faceHeld : m.face,
          t3 = (N[0].z + N[1].z + N[2].z + N[3].z) / 4
        for (let t4 = 0; t4 < 4; t4++) N[t4].z += (0 - N[t4].z) * e2
        P.z += (0 - P.z) * e2
        let n2 = Lt.z - t3 < 0 ? -1 : 1
        Lt.z += (n2 * Math.abs(rest[5].z) - Lt.z) * e2
      }
      simT >= nextNudge && (puff(), nextNudge = simT + m.nudgeEvery * (0.6 + Math.random() * 0.8))
      flipStep(), catchSettle()
      held && (toPlaneZ(grabZ0, G),
        held.x += (G.x - held.x) * m.follow,
        held.y += (G.y - held.y) * m.follow,
        held.z += (G.z - held.z) * m.follow)
      for (let e2 = 0; e2 < m.iters; e2++) {
        for (let e3 of chain) Qe(e3)
        for (let e3 of bodyRods) Qe(e3)
      }
    }

  /* basis / transforms (verbatim) */
  let Dn = new THREE.Vector3(), On = new THREE.Vector3(),
    pushBasis = () => {
      let [e, t2, n, r] = N
      z.set(t2.x - e.x + (n.x - r.x), t2.y - e.y + (n.y - r.y), t2.z - e.z + (n.z - r.z)).normalize()
      B.set(e.x - r.x + (t2.x - n.x), e.y - r.y + (t2.y - n.y), e.z - r.z + (t2.z - n.z))
      V.crossVectors(z, B).normalize(), B.crossVectors(V, z).normalize()
      Yt.set((e.x + t2.x + n.x + r.x) / 4, (e.y + t2.y + n.y + r.y) / 4, (e.z + t2.z + n.z + r.z) / 4)
      w.matrix.makeBasis(z, B, V).setPosition(Yt)
      w.matrixAutoUpdate = false, w.matrixWorldNeedsUpdate = true
      let i = M[M.length - 1]
      Dn.set(i.x, i.y, i.z), On.set(P.x, P.y, P.z)
      let a = Dn.clone().sub(On).normalize(),
        o2 = V.clone().sub(a.clone().multiplyScalar(a.dot(V))).normalize(),
        s = a.clone().cross(o2).normalize()
      D.matrix.makeBasis(s, a, o2).setPosition(Dn)
      D.matrixAutoUpdate = false, D.matrixWorldNeedsUpdate = true
    },
    An = new THREE.Vector3(0, 0, 1),
    X = [],
    crT = new THREE.Vector3(), crP = new THREE.Vector3(), crQ = new THREE.Vector3(), crR = new THREE.Vector3(),
    rebuildRibbon = () => {
      let e = M.length
      if (X.length !== e) {
        X.length = 0
        for (let t2 = 0; t2 < e; t2++) X.push(new THREE.Vector3)
      }
      for (let t2 = 0; t2 < e; t2++) X[t2].set(M[t2].x, M[t2].y, M[t2].z)
      let t2 = (t3, n) => {
          let r = t3 * (e - 1),
            i = Math.min(e - 2, Math.floor(r)),
            a = r - i,
            o2 = X[Math.max(0, i - 1)],
            s = X[i],
            c = X[i + 1],
            l = X[Math.min(e - 1, i + 2)],
            u = a * a, ee = u * a
          return n.set(
            0.5 * (2 * s.x + (-o2.x + c.x) * a + (2 * o2.x - 5 * s.x + 4 * c.x - l.x) * u + (-o2.x + 3 * s.x - 3 * c.x + l.x) * ee),
            0.5 * (2 * s.y + (-o2.y + c.y) * a + (2 * o2.y - 5 * s.y + 4 * c.y - l.y) * u + (-o2.y + 3 * s.y - 3 * c.y + l.y) * ee),
            0.5 * (2 * s.z + (-o2.z + c.z) * a + (2 * o2.z - 5 * s.z + 4 * c.z - l.z) * u + (-o2.z + 3 * s.z - 3 * c.z + l.z) * ee)), n
        },
        n = 0,
        r = null
      for (let e2 = 0; e2 < 56; e2++) {
        let i = e2 / 55
        t2(i, crR), t2(Math.min(1, i + 0.01), crT).sub(crR).normalize()
        r && (n += crR.distanceTo(r)), r ??= new THREE.Vector3, r.copy(crR)
        let a = Re(0.3, 1, i),
          o2 = V.z < 0 ? -a : a
        crP.copy(An).multiplyScalar(1 - a).addScaledVector(V, o2)
        crP.addScaledVector(crT, -crP.dot(crT)).normalize()
        crQ.crossVectors(crT, crP).normalize()
        let s = e2 * 6
        k[s] = crR.x - crQ.x * f * 0.5, k[s + 1] = crR.y - crQ.y * f * 0.5, k[s + 2] = crR.z - crQ.z * f * 0.5
        k[s + 3] = crR.x + crQ.x * f * 0.5, k[s + 4] = crR.y + crQ.y * f * 0.5, k[s + 5] = crR.z + crQ.z * f * 0.5
        A[s] = A[s + 3] = crP.x, A[s + 1] = A[s + 4] = crP.y, A[s + 2] = A[s + 5] = crP.z
        let c = n / (f * 4)
        Pt2[e2 * 4] = 0, Pt2[e2 * 4 + 1] = c, Pt2[e2 * 4 + 2] = 1, Pt2[e2 * 4 + 3] = c
      }
      strapGeo.attributes.position.needsUpdate = true
      strapGeo.attributes.normal.needsUpdate = true
      strapGeo.attributes.uv.needsUpdate = true
    }

  /* arrival: Carter waits for veil:reveal when the veil is active, else runs at once.
   * Jesper maps the app's own ready gate into the same event contract. */
  let standing = true,
    onReveal = ev => {
      let n2 = ev?.detail,
        r = (n2?.wipeDur ?? 0) * 0.15,
        i = () => {
          standing = false, acc = 0
          gsap.to(hookP, { y: halfH + 0.6, duration: m.lower, ease: 'expo.out', overwrite: true })
        }
      n2?.tl ? n2.tl.call(i, [], r) : i()
    }
  veilActive
    ? document.addEventListener('veil:reveal', onReveal, { once: true, signal: H })
    : onReveal()

  let hidden = document.hidden
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden, acc = 0
  }, { signal: H })

  let warm = makeWarm(renderer, scene, camera),
    tick = (e, t2) => {
      if (hidden || !M.length) return
      if (standing) {
        pushBasis(), rebuildRibbon(), warm.ready() && renderer.render(scene, camera)
        return
      }
      acc += Math.min(t2 / 1e3, 1 / 20)
      let n2 = 0
      for (; acc >= step && n2 < 8;) integrate(), acc -= step, n2++
      pushBasis(), rebuildRibbon(), warm.ready() && renderer.render(scene, camera)
    }
  gsap.ticker.add(tick)

  /* font-aware repaint once faces resolve (verbatim intent; Jesper has no custom
   * faces today — the Font Loading API resolves and these fall back to the same
   * stacks Carter declares, and the repaint keeps any later font swap live). */
  ;(async () => {
    try {
      await document.fonts.ready
      await Promise.all([
        document.fonts.load(`500 96px ${He}`),
        document.fonts.load(`500 22px ${Ue}`),
      ])
    } catch { /* fonts stay on the fallback stacks either way */ }
    repaint(), C.image = strapCanvas(Se.studio, '#5a5a5a'), C.needsUpdate = true
  })()

  /* theme observer (verbatim; Jesper keeps no data-theme today so the light palette
   * persists — the observer stays so a future theme switch behaves like Carter's). */
  let applyTheme = () => {
    let e = document.documentElement.getAttribute('data-theme') === 'dark'
    frameMat.color.set(e ? 2302755 : 1644825)
    strapMat.color.set(e ? 14211288 : 16777215)
  }
  applyTheme()
  let themeObserver = new MutationObserver(applyTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  /* dispose (verbatim semantics: ticker, aborts, observers, textures, envRT.texture,
   * pmrem, traverse->geometry.dispose(), materials, renderer, forceContextLoss) */
  const dispose = () => {
    gsap.ticker.remove(tick)
    abort.abort()
    RO.disconnect()
    themeObserver.disconnect()
    dbgEl?.remove()
    ;[frontTex, backTex, C, S, flagMat.map].forEach(e2 => e2?.dispose())
    envRT?.texture?.dispose()
    pmrem?.dispose?.()
    scene.traverse(e2 => { e2.geometry && e2.geometry.dispose() })
    ;[hookMat, frameMat, ringMat, discMat, strapMat, edgeMat, frontMat, backMat, flagMat].forEach(e2 => e2.dispose())
    renderer.dispose()
    renderer.forceContextLoss()
  }
  return { dispose }
}

/* reduced-motion contract (verbatim Carter): the stage stays hidden and the
 * classic tile keeps rendering — the page never mounts WebGL. */
export { prefersReducedMotion }
