/* Writing shelf helpers — faithful port of Carter app/lib/css3d.js (recovered
 * src/css3d.DQxlWk7_.js): seeded rng, notched corner path, procedural paper-fibre
 * grain texture, vignette blob shadow, and the CSS3D matrix projection used to pin
 * the pose layer over the flying sheet. Imports re-pointed to the npm three build.
 */
import * as THREE from 'three'

/* a: mulberry — seeded deterministic rng */
export function seededRng(e) {
  let t = (e * 9301 + 49297) >>> 0
  return () => ((t = (Math.imul(t, 1664525) + 1013904223) >>> 0), t / 4294967296)
}

/* r: rounded-card outline with a notched top-left (folder shoulder) */
export function notchedRect(t2, n, r, i) {
  let a = new THREE.Shape(),
    o = t2 / 2,
    s = n / 2
  a.moveTo(-o + r, -s)
  a.lineTo(o - i, -s)
  a.quadraticCurveTo(o, -s, o, -s + i)
  a.lineTo(o, s - i)
  a.quadraticCurveTo(o, s, o - i, s)
  a.lineTo(-o + r, s)
  a.quadraticCurveTo(-o, s, -o, s - r)
  a.lineTo(-o, -s + r)
  a.quadraticCurveTo(-o, -s, -o + r, -s)
  return a
}

/* a: paper fibre grain (bump/normal-ish single-channel noise), seeded + rotated */
export function fibreTexture(e) {
  let n = document.createElement('canvas')
  n.width = n.height = 256
  let i = n.getContext('2d')
  i.fillStyle = '#808080', i.fillRect(0, 0, 256, 256)
  let rng = seededRng(e * 13 + 7),
    tilt = (rng() - 0.5) * 0.35,
    strokes = 850 + Math.floor(rng() * 500)
  for (let e2 = 0; e2 < strokes; e2++) {
    let g = Math.round(80 + rng() * 96)
    i.strokeStyle = `rgb(${g},${g},${g})`, i.globalAlpha = 0.4, i.lineWidth = 0.7 + rng()
    let t2 = rng() * 256, n2 = rng() * 256, r = 4 + rng() * 16, a = tilt + (rng() - 0.5) * 0.5
    i.beginPath(), i.moveTo(t2, n2), i.lineTo(t2 + Math.cos(a) * r, n2 + Math.sin(a) * r), i.stroke()
  }
  i.globalAlpha = 0.45
  for (let e2 = 0; e2 < 1600; e2++) {
    let g = Math.round(64 + rng() * 128)
    i.fillStyle = `rgb(${g},${g},${g})`, i.fillRect(rng() * 256, rng() * 256, 1 + rng(), 1 + rng())
  }
  i.globalAlpha = 1
  let l = new THREE.CanvasTexture(n)
  l.wrapS = l.wrapT = THREE.RepeatWrapping
  l.center.set(0.5, 0.5)
  l.rotation = (rng() - 0.5) * 0.14
  l.repeat.set(2 + rng() * 0.8, 2.5 + rng() * 0.9)
  return l
}

/* i: radial blob (contact shadow) */
export function blobShadowTexture() {
  let e = document.createElement('canvas')
  e.width = e.height = 256
  let n = e.getContext('2d'),
    r = n.createRadialGradient(128, 128, 4, 128, 128, 127)
  r.addColorStop(0, 'rgba(0,0,0,0.82)')
  r.addColorStop(0.35, 'rgba(0,0,0,0.45)')
  r.addColorStop(0.7, 'rgba(0,0,0,0.15)')
  r.addColorStop(1, 'rgba(0,0,0,0)')
  n.fillStyle = r, n.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(e)
}

/* t: CSS3D projection — pin a DOM rect onto a three.js world matrix */
function l(e) {
  return Math.abs(e) < 1e-10 ? 0 : e
}
const tmpM = new THREE.Matrix4()
export function projectCss3d(e, t2, camera, r, i, a) {
  let o = camera.projectionMatrix.elements[5] * (i / 2)
  camera.parent === null && camera.matrixWorldAutoUpdate === true && camera.updateMatrixWorld()
  tmpM.multiplyMatrices(camera.matrixWorldInverse, e)
  let s = tmpM.elements,
    c = t2 / a,
    d = s[0] * c, f = -s[1] * c, p2 = s[2] * c, m = s[3] * c,
    h = -s[4] * c, g = s[5] * c, _ = -s[6] * c, v = -s[7] * c,
    y = s[8] * c, b = -s[9] * c, x = s[10] * c, S = s[11] * c,
    C = s[12] + r / 2, w = -s[13] + i / 2, T = s[14] + o, E = s[15],
    D = s[14] >= 0,
    O = 'translate(-50%,-50%)matrix3d(' + l(d) + ',' + l(f) + ',' + l(p2) + ',' + l(m) + ',' + l(h) + ',' + l(g) + ',' + l(_) + ',' + l(v) + ',' + l(y) + ',' + l(b) + ',' + l(x) + ',' + l(S) + ',' + l(C) + ',' + l(w) + ',' + l(T) + ',' + l(E) + ')' + (D ? ' scale(0)' : '')
  return {
    containerCss: 'position:absolute;top:0;left:0;width:' + r + 'px;height:' + i + 'px;overflow:hidden;pointer-events:none;perspective:' + o + 'px;perspective-origin:50% 50%;',
    elementTransform: O,
  }
}
