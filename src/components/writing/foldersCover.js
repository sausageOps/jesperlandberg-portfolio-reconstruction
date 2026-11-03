/* Folder making & procedural cover faces — faithful port of Carter folders.js
 * helpers: tessellation, bend deformers, edge wear, palette families/species and the
 * canvas painters (drawCover / spine / sheet inside / excerpt preview / page filler).
 * Imports re-pointed to npm three + shelfHelpers; paint constants verbatim.
 */
import * as THREE from 'three'
import { seededRng, notchedRect, fibreTexture, blobShadowTexture, projectCss3d } from './shelfHelpers.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/* ---------- geometry helpers (verbatim logic) ---------- */
class TessellationModifier {
  constructor(maxEdgeLength = 0.1, maxIterations = 6) {
    this.maxEdgeLength = maxEdgeLength
    this.maxIterations = maxIterations
  }
  modify(e) {
    e.index !== null && (e = e.toNonIndexed())
    let t = this.maxIterations,
      n = this.maxEdgeLength * this.maxEdgeLength,
      r = new THREE.Vector3(), i = new THREE.Vector3(), a = new THREE.Vector3(), o = new THREE.Vector3(),
      s = [r, i, a, o],
      /* the normal family: Carter's `T` is the vector type, not `b` (Color) — these
         feed `de` (normal attribute) and are lerped with lerpVectors(). */
      c = new THREE.Vector3(), lNormal = new THREE.Vector3(), u = new THREE.Vector3(), d = new THREE.Vector3(),
      f = [c, lNormal, u, d],
      h = new THREE.Color(), g = new THREE.Color(), _ = new THREE.Color(), v = new THREE.Color(),
      y = [h, g, _, v],
      x = new THREE.Vector2(), S = new THREE.Vector2(), C = new THREE.Vector2(), te = new THREE.Vector2(),
      ne = [x, S, C, te],
      re = new THREE.Vector2(), ie = new THREE.Vector2(), w = new THREE.Vector2(), ae = new THREE.Vector2(),
      oe = [re, ie, w, ae],
      E = e.attributes,
      D = E.normal !== void 0,
      O = E.color !== void 0,
      k = E.uv !== void 0,
      A = E.uv1 !== void 0,
      j = E.position.array,
      se = D ? E.normal.array : null,
      ce = O ? E.color.array : null,
      le = k ? E.uv.array : null,
      ue = A ? E.uv1.array : null,
      M = j, de = se, fe = ce, pe = le, N = ue,
      meIter = 0, busy = true

    function ge(e2, t2, n2) {
      let r2 = s[e2], i2 = s[t2], a2 = s[n2]
      M.push(r2.x, r2.y, r2.z), M.push(i2.x, i2.y, i2.z), M.push(a2.x, a2.y, a2.z)
      if (D) {
        let r3 = f[e2], i3 = f[t2], a3 = f[n2]
        de.push(r3.x, r3.y, r3.z), de.push(i3.x, i3.y, i3.z), de.push(a3.x, a3.y, a3.z)
      }
      if (O) {
        let r3 = y[e2], i3 = y[t2], a3 = y[n2]
        fe.push(r3.r, r3.g, r3.b), fe.push(i3.r, i3.g, i3.b), fe.push(a3.r, a3.g, a3.b)
      }
      if (k) {
        let r3 = ne[e2], i3 = ne[t2], a3 = ne[n2]
        pe.push(r3.x, r3.y), pe.push(i3.x, i3.y), pe.push(a3.x, a3.y)
      }
      if (A) {
        let r3 = oe[e2], i3 = oe[t2], a3 = oe[n2]
        N.push(r3.x, r3.y), N.push(i3.x, i3.y), N.push(a3.x, a3.y)
      }
    }
    for (; busy && meIter < t;) {
      meIter++, busy = false, j = M, M = []
      D && (se = de, de = [])
      O && (ce = fe, fe = [])
      k && (le = pe, pe = [])
      A && (ue = N, N = [])
      for (let e2 = 0, t2 = 0, s2 = j.length; e2 < s2; e2 += 9, t2 += 6) {
        r.fromArray(j, e2 + 0), i.fromArray(j, e2 + 3), a.fromArray(j, e2 + 6)
        D && (c.fromArray(se, e2 + 0), lNormal.fromArray(se, e2 + 3), u.fromArray(se, e2 + 6))
        O && (h.fromArray(ce, e2 + 0), g.fromArray(ce, e2 + 3), _.fromArray(ce, e2 + 6))
        k && (x.fromArray(le, t2 + 0), S.fromArray(le, t2 + 2), C.fromArray(le, t2 + 4))
        A && (re.fromArray(ue, t2 + 0), ie.fromArray(ue, t2 + 2), w.fromArray(ue, t2 + 4))
        let s3 = r.distanceToSquared(i), f2 = i.distanceToSquared(a), p2 = r.distanceToSquared(a)
        s3 > n || f2 > n || p2 > n
          ? (busy = true,
            s3 >= f2 && s3 >= p2
              ? (o.lerpVectors(r, i, 0.5), D && d.lerpVectors(c, lNormal, 0.5), O && v.lerpColors(h, g, 0.5), k && te.lerpVectors(x, S, 0.5), A && ae.lerpVectors(re, ie, 0.5), ge(0, 3, 2), ge(3, 1, 2))
              : f2 >= s3 && f2 >= p2
                ? (o.lerpVectors(i, a, 0.5), D && d.lerpVectors(lNormal, u, 0.5), O && v.lerpColors(g, _, 0.5), k && te.lerpVectors(S, C, 0.5), A && ae.lerpVectors(ie, w, 0.5), ge(0, 1, 3), ge(3, 2, 0))
                : (o.lerpVectors(r, a, 0.5), D && d.lerpVectors(c, u, 0.5), O && v.lerpColors(h, _, 0.5), k && te.lerpVectors(x, C, 0.5), A && ae.lerpVectors(re, w, 0.5), ge(0, 1, 3), ge(3, 1, 2)))
          : ge(0, 1, 2)
      }
    }
    let P = new THREE.BufferGeometry()
    P.setAttribute('position', new THREE.Float32BufferAttribute(M, 3))
    D && P.setAttribute('normal', new THREE.Float32BufferAttribute(de, 3))
    O && P.setAttribute('color', new THREE.Float32BufferAttribute(fe, 3))
    k && P.setAttribute('uv', new THREE.Float32BufferAttribute(pe, 2))
    A && P.setAttribute('uv1', new THREE.Float32BufferAttribute(N, 2))
    return P
  }
}

export function tessellateGroups(e) {
  let t = new TessellationModifier(0.065, 8),
    n = e.groups.map(({ start, count }) => {
      let i = new THREE.BufferGeometry()
      for (let t2 of ['position', 'normal', 'uv']) {
        let a = e.getAttribute(t2)
        i.setAttribute(t2, new THREE.Float32BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize))
      }
      let a = t.modify(i)
      return i.dispose(), a
    }),
    r = mergeGeometries(n, true)
  r.groups.forEach((t2, n2) => { t2.materialIndex = e.groups[n2].materialIndex })
  n.forEach(e2 => e2.dispose())
  return r
}

/* ue: sheet flex deformer — 'card' | 'paper' | 'flag' bend profile (verbatim) */
export function makeFlex(e, t, n, r = 0) {
  let i = e.clone(),
    a = i.getAttribute('position').array.slice(),
    o = i.getAttribute('normal').array.slice(),
    s = i.getAttribute('position'),
    c = i.getAttribute('normal'),
    l = new THREE.Vector3(),
    u = NaN,
    d = e2 => {
      if (Math.abs(u - e2) < 25e-6) return
      u = e2
      for (let i2 = 0; i2 < s.count; i2++) {
        let u2 = i2 * 3, d2 = a[u2], f = a[u2 + 1],
          p = Math.max(0, Math.min(1, (d2 + t / 2) / t)),
          m, h, g
        if (n === 'card') {
          let n2 = 0.3 * (1 - Math.exp(-p * 24)) + 0.7 * p * p
          m = e2 * n2 * (1 - 0.65 * f * f)
          h = e2 * (7.2 * Math.exp(-p * 24) + 1.4 * p) / t * (1 - 0.65 * f * f)
          g = e2 * n2 * -1.3 * f
        } else {
          let i3 = n === 'flag' ? 0 : 0.08 * Math.sin(r * 2.7),
            a2 = 0.45 + 2.2 * (f + i3) * (f + i3)
          m = e2 * p * p * a2
          h = e2 * 2 * p / t * a2
          g = e2 * p * p * 4.4 * (f + i3)
        }
        s.setXYZ(i2, d2, f, a[u2 + 2] + m)
        l.set(o[u2] - h * o[u2 + 2], o[u2 + 1] - g * o[u2 + 2], o[u2 + 2]).normalize()
        c.setXYZ(i2, l.x, l.y, l.z)
      }
      s.needsUpdate = c.needsUpdate = true
    }
  i.computeBoundingSphere(), i.boundingSphere.radius += 0.12
  return { geometry: i, update: d, dispose: () => i.dispose() }
}

/* M: edge wear scribbles (verbatim) */
function edgeWear(e, t, n, r, i) {
  let a = seededRng(r * 59 + 17)
  e.save(), e.strokeStyle = i ? '#ddd6c9' : '#777267', e.lineCap = 'round'
  for (let r2 = 0; r2 < 58; r2++) {
    let horiz = a() < 0.5,
      i2 = t * (0.13 + a() * 0.7),
      o = horiz ? 3 + a() * 4 : n - 3 - a() * 4
    e.globalAlpha = 0.055 + a() * 0.1
    e.lineWidth = 0.6 + a() * 1.4
    e.beginPath(), e.moveTo(i2, o), e.lineTo(i2 + 2 + a() * 12, o + (a() - 0.5) * 2), e.stroke()
  }
  for (let r2 = 0; r2 < 24; r2++) {
    let rr = n * (0.09 + a() * 0.82)
    e.globalAlpha = 0.055 + a() * 0.06, e.lineWidth = 0.7
    e.beginPath(), e.moveTo(t * 0.054 + a() * 3, rr), e.lineTo(t * 0.054 + a() * 3, rr + 3 + a() * 13), e.stroke()
  }
  e.restore()
}

/* de: cover-to-bump contrast map (verbatim) */
function coverToBump(e, t) {
  let n = t.image
  n.width = 384, n.height = Math.round(n.width * e.height / e.width)
  let r = n.getContext('2d')
  r.drawImage(e, 0, 0, n.width, n.height)
  let i = r.getImageData(0, 0, n.width, n.height),
    a = i.data,
    o = (Math.round(n.height * 0.15) * n.width + Math.round(n.width * 0.5)) * 4,
    s = a[o], c = a[o + 1], l = a[o + 2]
  for (let e2 = 0; e2 < a.length; e2 += 4) {
    let t2 = Math.min(1, (Math.abs(a[e2] - s) + Math.abs(a[e2 + 1] - c) + Math.abs(a[e2 + 2] - l)) / 160),
      n2 = Math.round(250 - t2 * 48)
    a[e2] = a[e2 + 1] = a[e2 + 2] = n2, a[e2 + 3] = 255
  }
  r.putImageData(i, 0, 0)
  t.needsUpdate = true
}

/* word wrap (verbatim) */
export function wrapLines(e, t, n, r) {
  let i = t.split(/\s+/), a = [], o = ''
  for (let t2 of i) {
    let i2 = o ? `${o} ${t2}` : t2
    if (e.measureText(i2).width > n && o) {
      if (a.push(o), o = t2, a.length === r) break
    } else o = i2
  }
  a.length < r && o ? a.push(o) : o && a.length === r && (a[r - 1] = `${a[r - 1].replace(/\s+\S*$/, '')}…`)
  return a
}

/* Be: seeded dust speckle (verbatim) */
function speckle(e, t, n, r, i) {
  let a = e * 9301 + 49297 >>> 0,
    o = () => ((a = (Math.imul(a, 1664525) + 1013904223) >>> 0), a / 4294967296)
  e.fillStyle = r
  for (let r2 = 0; r2 < 1400; r2++)
    e.globalAlpha = 0.015 + o() * 0.03, e.fillRect(o() * t, o() * n, 1 + o() * 1.6, 1)
  e.globalAlpha = 1
}

/* ---------- palette system (verbatim) ---------- */
const TONES = {
  slate: { light: '#2f4a63', dark: '#93a9bd' },
  cobalt: { light: '#23407a', dark: '#8fa6d6' },
  indigo: { light: '#3a2f6b', dark: '#b4aad5' },
  oxblood: { light: '#5a2035', dark: '#cf97b2' },
  teal: { light: '#1f474c', dark: '#7fb5ab' },
  racing: { light: '#22392f', dark: '#9bbfa8' },
}
const FAM = {
  dark: { paper: '#1c1c1c', ink: '#f2f1ee', theme: 'dark' },
  light: { paper: '#e8e8e7', ink: '#1e1e1e', theme: 'light' },
  grey: { paper: '#b0b0ad', ink: '#1e1e1e', theme: 'light' },
}
const hashF = e => ((e + 1) * 2654435761) % 4294967296 / 4294967296
export const readTokens = () => {
  let e = getComputedStyle(document.documentElement)
  return {
    paper: e.getPropertyValue('--paper').trim() || '#1e1e1e',
    ink: e.getPropertyValue('--ink').trim() || '#f7f7f7',
    theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  }
}
const coreTint = (e, t, n, r) => {
  let i = (r.tone && TONES[r.tone]) || themeFamily(t, n, r).theme === 'dark'
  return e.clone().lerp(new THREE.Color(i ? '#8c8b87' : '#f4f1ea'), 0.42)
}
const family = (e, t) => {
  if (t.tone && TONES[t.tone]) return null
  if (t.stock && t.stock in FAM) return t.stock
  let n = hashF(e * 61)
  return n < 0.45 ? 'dark' : n < 0.8 ? 'light' : 'grey'
}
const themeFamily = (e, t, n) => {
  let r = family(t, n)
  return r ? FAM[r] : e
}
const coverBase = (e, t, n) => {
  let r = n.tone ? TONES[n.tone] : null
  if (r) return new THREE.Color(r.light)
  let i = themeFamily(e, t, n)
  return new THREE.Color(i.paper).lerp(new THREE.Color(i.ink), i.theme === 'dark' ? 0.03 + 0.06 * hashF(t) : 0.05 + 0.06 * hashF(t))
}
const coverInk = (e, t, n) => (t.tone && TONES[t.tone] ? '#ffffff' : themeFamily(e, n, t).ink)
const paperTint = (e, t, n) =>
  new THREE.Color(e.paper).lerp(new THREE.Color('#ffffff'),
    e.theme === 'dark' ? 0.09 + 0.05 * hashF(t * 7 + n) : 0.5 + 0.12 * hashF(t * 7 + n))
const ls = (e, t) => { try { e.letterSpacing = `${t}px` } catch { /* noop */ } }
const FONT = '"Oracle", "Geist Variable", system-ui, sans-serif'
const MONO = '"PP Neue Montreal Mono", "Geist Mono Variable", ui-monospace, monospace'

const SANS_GFX_BOUND = 60
function titleBlock(e, t, n = 3) {
  e.ctx.font = `500 64px ${FONT}`, ls(e.ctx, -1.792), e.ctx.fillStyle = e.ink
  let r = wrapLines(e.ctx, e.post.title, e.CW - 2 * e.M, n)
  r.forEach((n2, r2) => e.ctx.fillText(n2, e.M, t + r2 * 64 * 1.06))
  return t + (r.length - 1) * 64 * 1.06 + 22
}

/* COVER_SPECIES painters (verbatim) — key from post.cover */
const COVER_SPECIES = {
  glyph(e) {
    let t = (e.post.title.match(/[A-Za-z0-9]/)?.[0] ?? 'C').toUpperCase()
    e.ctx.save(), e.ctx.font = `500 ${Math.round(e.CH * 1.5)}px ${FONT}`, ls(e.ctx, 0)
    e.ctx.fillStyle = e.ink, e.ctx.globalAlpha = 0.09
    e.ctx.fillText(t, e.CW * 0.22, e.CH * 1.18), e.ctx.restore()
    titleBlock(e, e.titleY)
  },
  scatter(e) {
    let t = seededRng(e.seed),
      n = e.post.title.toUpperCase().split(/\s+/), r = []
    for (let e2 of n) {
      let n2 = 0
      for (; n2 < e2.length;) {
        let i = e2.length - n2 <= 3 ? e2.length - n2 : 1 + Math.floor(t() * 3)
        r.push(e2.slice(n2, n2 + i)), n2 += i
      }
      r.push(' ')
    }
    let i = e.CH - e.titleY - 300,
      a = Math.max(4, Math.ceil(r.length / 2.4)),
      o = Math.min(170, i / a),
      s = Math.round(o * 0.86)
    e.ctx.font = `500 ${s}px ${FONT}`, ls(e.ctx, s * -0.042), e.ctx.fillStyle = e.ink
    let c = e.M, l2 = e.titleY
    for (let n2 of r) {
      if (n2 === ' ') {
        t() < 0.55 ? (l2 += o, c = e.M + (t() < 0.4 ? e.CW * (0.08 + t() * 0.3) : 0)) : (c += s * (0.4 + t() * 0.6))
        continue
      }
      let r2 = e.ctx.measureText(n2).width
      if (c + r2 > e.CW - e.M && (l2 += o, c = e.M + (t() < 0.5 ? e.CW * (0.05 + t() * 0.25) : 0)), l2 > e.CH - 280) break
      e.ctx.fillText(n2, c, l2), c += r2 + s * (0.25 + t() * 0.7)
    }
  },
  field(e) {
    let t = seededRng(e.seed), n = e.CH * 0.64
    e.ctx.fillStyle = e.ink, e.ctx.globalAlpha = 0.14
    e.ctx.fillRect(e.M, n, e.CW - 2 * e.M, 2), e.ctx.globalAlpha = 1
    let r = e.CW * (0.52 + t() * 0.22), i = 34 + t() * 14
    t() < 0.5
      ? (e.ctx.beginPath(), e.ctx.arc(r, n - i, i, 0, Math.PI * 2), e.ctx.fill())
      : e.ctx.fillRect(r - i, n - i * 2, i * 2, i * 2)
    titleBlock(e, e.titleY)
  },
  band(e) {
    let t = e.post.tone ? TONES[e.post.tone] : null
    e.ctx.fillStyle = t ? (e.theme === 'dark' ? t.dark : t.light) : e.ink
    e.ctx.fillRect(0, e.CH * 0.56, e.CW, e.CH * 0.14)
    titleBlock(e, e.titleY)
  },
  tiles(e) {
    let t = seededRng(e.seed),
      n = titleBlock(e, e.titleY),
      r = Math.max(e.CH * 0.44, n + 50),
      i = Math.min((e.CW - 2 * e.M) / 4, (e.CH - 250 - r) / 3)
    e.ctx.fillStyle = e.ink
    for (let n2 = 0; n2 < 3; n2++)
      for (let a = 0; a < 4; a++) {
        if (t() < 0.22) continue
        let o = e.M + a * i, s = r + n2 * i, c = t()
        if (e.ctx.beginPath(), c < 0.45) {
          let n3 = Math.floor(t() * 4),
            r2 = n3 & 1 ? o + i : o,
            a2 = n3 & 2 ? s + i : s
          e.ctx.save(), e.ctx.beginPath(), e.ctx.rect(o, s, i, i), e.ctx.clip()
          e.ctx.beginPath(), e.ctx.arc(r2, a2, i * 0.92, 0, Math.PI * 2), e.ctx.fill(), e.ctx.restore()
        } else if (c < 0.75) {
          e.ctx.arc(o + i / 2, s + i / 2, i * 0.4, 0, Math.PI * 2), e.ctx.fill()
        } else e.ctx.fillRect(o + i * 0.08, s + i * 0.08, i * 0.84, i * 0.84)
      }
  },
  checker(e) {
    let t = seededRng(e.seed),
      n = titleBlock(e, e.titleY),
      r = Math.max(e.CH * 0.44, n + 50),
      i = Math.min((e.CW - 2 * e.M) / 5, (e.CH - 250 - r) / 3)
    e.ctx.fillStyle = e.ink
    for (let n2 = 0; n2 < 3; n2++)
      for (let a = 0; a < 5; a++) {
        if ((a + n2) % 2 || t() < 0.18) continue
        let o = t() < 0.3 ? (t() < 0.5 ? -0.5 : 0.5) * i : 0
        e.ctx.fillRect(e.M + a * i + o, r + n2 * i, i, i)
      }
  },
  lines(e) {
    let t = titleBlock(e, e.titleY - 60),
      n = Math.max(e.CH * 0.42, t + 50),
      r = e.CH - 250
    e.ctx.fillStyle = e.ink, e.ctx.globalAlpha = 0.85
    for (let t2 = n; t2 < r; t2 += 26) e.ctx.fillRect(e.M, t2, e.CW - 2 * e.M, 9)
    e.ctx.globalAlpha = 1
    let i = (e.post.title.match(/[A-Za-z0-9]/)?.[0] ?? 'C').toUpperCase()
    e.ctx.save(), e.ctx.font = `700 ${Math.round(e.CH * 0.52)}px ${FONT}`, ls(e.ctx, 0), e.ctx.fillStyle = e.stock
    let a = e.ctx.measureText(i).width
    e.ctx.fillText(i, (e.CW - a) / 2, r - 40), e.ctx.restore()
  },
  index(e) {
    let t = String(e.post.num).padStart(2, '0')
    e.ctx.font = `500 ${Math.round(e.CH * 0.42)}px ${FONT}`, ls(e.ctx, e.CH * 0.42 * -0.042)
    e.ctx.fillStyle = e.ink
    let n = e.ctx.measureText(t).width
    e.ctx.fillText(t, e.CW - e.M - n, e.CH * 0.62)
    e.ctx.globalAlpha = 0.12, e.ctx.fillRect(e.M, e.CH * 0.655, e.CW - 2 * e.M, 2), e.ctx.globalAlpha = 1
    titleBlock(e, e.CH * 0.73, 2)
  },
  plan(e) {
    let t = seededRng(e.seed), n = titleBlock(e, e.titleY - 60)
    e.ctx.fillStyle = e.ink
    let r = Math.max(e.CH * 0.42, n + 50),
      i = e.CH - 240,
      a = e.CW - 2 * e.M
    e.ctx.globalAlpha = 0.16
    for (let t2 = 0; t2 <= 6; t2++) e.ctx.fillRect(e.M + a / 6 * t2 - 1, r, 2, i - r)
    for (let t2 = r; t2 <= i; t2 += (i - r) / 8) e.ctx.fillRect(e.M, t2 - 1, a, 2)
    e.ctx.globalAlpha = 1
    let o = Math.floor(t() * 6), s = Math.floor(t() * 8)
    e.ctx.fillRect(e.M + a / 6 * o, r + (i - r) / 8 * s, a / 6, (i - r) / 8)
  },
}

/* spine shading (verbatim) */
function spineShade(e, t, n, r) {
  let i = parseInt(r.replace('#', '').slice(0, 2), 16) / 255 > 0.5,
    a = t * 0.058,
    o = e.createLinearGradient(0, 0, a, 0),
    s = i ? 0.34 : 0.16
  o.addColorStop(0, `rgba(0,0,0,${s})`)
  o.addColorStop(0.45, `rgba(0,0,0,${s * 0.35})`)
  o.addColorStop(1, 'rgba(0,0,0,0)')
  e.fillStyle = o, e.fillRect(0, 0, a, n)
  e.fillStyle = `rgba(0,0,0,${i ? 0.28 : 0.1})`, e.fillRect(a * 0.92, 0, 2, n)
  e.fillStyle = `rgba(255,255,255,${i ? 0.09 : 0.32})`, e.fillRect(a * 0.92 + 2, 0, 1.5, n)
}

/* drawCover: front cover canvas 1024×1423 (verbatim) */
export function drawCover(e, t, n, r) {
  let i = 1024, a = 1423
  e.width = i, e.height = a
  let o = e.getContext('2d'),
    s = `#${coverBase(n, r, t).getHexString()}`,
    c = coverInk(n, t, r)
  o.fillStyle = s, o.fillRect(0, 0, i, a), speckle(o, i, a, c, r + 1)
  let l2 = String(t.num).padStart(2, '0')
  o.fillStyle = c, o.globalAlpha = 0.62, o.strokeStyle = c
  o.font = `500 27px ${MONO}`, ls(o, 0.5), o.textBaseline = 'alphabetic'
  o.fillText(`WRITING:: N°${l2}`, 92, 116)
  o.globalAlpha = 0.12, o.fillRect(92, 144, 840, 2), o.globalAlpha = 1
  let u = t.cover ? COVER_SPECIES[t.cover] : null
  u
    ? (u({ ctx: o, post: t, ink: c, stock: s, theme: n.theme, CW: i, CH: a, M: 92, titleY: 370, seed: r * 31 + t.num }), o.fillStyle = c)
    : (o.font = `500 96px ${FONT}`, ls(o, -4.032),
      wrapLines(o, t.title, 840, 5).forEach((e2, t2) => { o.fillText(e2, 92, 370 + t2 * 96 * 0.98) }))
  o.font = `500 27px ${MONO}`, ls(o, 0.5), o.globalAlpha = 0.62
  let d = o.measureText(t.date).width
  o.fillText(t.date, 932 - d, 1309)
  o.globalAlpha = 1, o.font = `500 27px ${MONO}`, ls(o, 1)
  let f = t.cat.toUpperCase(),
    p = o.measureText(f).width,
    m = 1270
  o.globalAlpha = 0.35, o.lineWidth = 2.5, o.strokeStyle = c
  typeof o.roundRect == 'function'
    ? (o.beginPath(), o.roundRect(92, m, p + 52, 61, 61 / 2), o.stroke())
    : o.strokeRect(92, m, p + 52, 61)
  o.globalAlpha = 0.8, o.fillText(f, 118, 1309), o.globalAlpha = 1
  spineShade(o, i, a, c)
  edgeWear(o, i, a, t.num, new THREE.Color(c).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5)
  o.save(), o.translate(i / 2, a / 2), o.scale(i / 0.724, -a / 1.006), o.beginPath()
  let h = COVER_W / 2 - 0.003
  o.moveTo(h, COVER_TOP - SHELF_NOTCH_H / 2)
  o.bezierCurveTo(h, COVER_TOP - SHELF_NOTCH_H * 0.32, 0.286, COVER_TOP - SHELF_NOTCH_H * 0.16, 0.286, COVER_TOP)
  o.bezierCurveTo(0.286, 0.058399999999999994, h, 0.0968, h, 0.13999999999999999)
  o.strokeStyle = c, o.globalAlpha = 0.13, o.lineWidth = 0.0015, o.stroke()
  o.restore()
}

/* Ge: spine strip texture (verbatim) */
function paintSpine(e, t, n, r) {
  let i = 1312
  e.width = 128, e.height = i
  let a = e.getContext('2d'),
    ink = coverInk(n, t, r)
  a.fillStyle = `#${coverBase(n, r, t).lerp(new THREE.Color(themeFamily(n, r, t).ink), 0.05).getHexString()}`
  a.fillRect(0, 0, 128, i), speckle(a, 128, i, ink, r + 77)
}

/* Ke: pseudo-lorem filler (verbatim wordbank) */
function fillerLines(seed, t) {
  let rng = seededRng(seed),
    bank = 'ver.sal.tin.mor.pla.der.con.ika.ren.sto.gra.lum.pres.oto.ne.ma.ri.ta.sen.dio.fel.ur.ba.lith.cor.em.va.nis.ol.dra'.split('.'),
    word = () => {
      let w = '', n = 1 + Math.floor(rng() * 3)
      for (let i = 0; i < n; i++) w += bank[Math.floor(rng() * bank.length)]
      return w
    },
    a = []
  for (let n = 0; n < t; n++) {
    let cnt = 5 + Math.floor(rng() * 9), words = []
    for (let i = 0; i < cnt; i++) words.push(word())
    words[0] = words[0][0].toUpperCase() + words[0].slice(1)
    a.push(words.join(' ') + '.')
  }
  return a.join(' ')
}

/* qe: first-sentence excerpt clamp (verbatim) */
export function firstSentence(e) {
  let t = (e.excerpt || e.summary).trim(),
    n = t.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() || t
  return n.length > 175 ? `${n.slice(0, 172).replace(/\s+\S*$/, '')}…` : n
}

/* Je: peek-preview sheet (verbatim) */
export function paintPreview(e, t, n) {
  e.width = 704
  let r = e.getContext('2d')
  r.font = `400 40px ${FONT}`, ls(r, -0.4)
  let lines = wrapLines(r, firstSentence(t), e.width - 92, 7)
  e.height = 112 + (lines.length - 1) * 49 + 42
  r.fillStyle = `#${new THREE.Color(n.paper).lerp(new THREE.Color('#ffffff'), n.theme === 'dark' ? 0.16 : 0.62).getHexString()}`
  r.fillRect(0, 0, e.width, e.height)
  speckle(r, e.width, e.height, n.ink, t.num + 191)
  let g = r.createLinearGradient(0, 0, 70, 0)
  g.addColorStop(0, 'rgba(0,0,0,0.2)'), g.addColorStop(1, 'rgba(0,0,0,0)')
  r.fillStyle = g, r.fillRect(0, 0, 70, e.height)
  r.fillStyle = n.ink, r.globalAlpha = 0.5
  r.font = `400 23px ${MONO}`, ls(r, 1)
  r.fillText(`N°${String(t.num).padStart(2, '0')} / 01`, 46, 48)
  r.globalAlpha = 0.92, r.font = `400 40px ${FONT}`, ls(r, -0.4)
  lines.forEach((line, idx) => r.fillText(line, 46, 111 + idx * 49))
  r.globalAlpha = 1
}

/* Ye: inside sheet (masthead + title + tldr + excerpt + filler) (verbatim) */
function paintSheetInside(e, t, n, r) {
  let i = 1024,
    a = Math.round(COVER_H * 0.95 * i / (COVER_RATIO * 0.97))
  e.width = i, e.height = a
  let o = e.getContext('2d')
  o.fillStyle = `#${new THREE.Color(n.paper).lerp(new THREE.Color('#ffffff'), n.theme === 'dark' ? 0.11 : 0.55).getHexString()}`
  o.fillRect(0, 0, i, a), speckle(o, i, a, n.ink, r + 41)
  let s = String(t.num).padStart(2, '0')
  o.fillStyle = n.ink, o.textBaseline = 'alphabetic'
  o.font = `500 22px ${MONO}`, ls(o, 1), o.globalAlpha = 0.5
  o.fillText('CARTER OGUNSOLA:: WRITING', 58, 76)
  let c = o.measureText(`N°${s}`).width
  o.fillText(`N°${s}`, 966 - c, 76)
  o.globalAlpha = 0.14, o.fillRect(58, 98, 908, 2)
  o.font = `400 24px ${MONO}`, ls(o, 0), o.globalAlpha = 0.55
  let l2 = 154
  o.fillText(`:: ${t.longDate}`, 58, l2), l2 += 64
  o.font = `500 73px ${FONT}`, ls(o, -2.044), o.globalAlpha = 0.94
  wrapLines(o, t.title, 908, 4).forEach(e2 => {
    o.fillText(e2, 58, l2 + 73 * 0.78), l2 += 73 * 1.06
  })
  l2 += 46
  if (t.tldr) {
    let sep = l2 - 27
    o.globalAlpha = 0.14, o.fillRect(58, sep, 908, 2)
    let n2 = sep + 24 + 18
    o.globalAlpha = 0.55, o.font = `400 18px ${FONT}`, ls(o, 0), o.fillText('TL;DR', 58, n2), n2 += 46
    o.globalAlpha = 0.9, o.font = `400 27px ${FONT}`, ls(o, -0.3)
    let r2 = wrapLines(o, t.tldr, 908, 8)
    r2.forEach((e2, i2) => o.fillText(e2, 58, n2 + i2 * 41))
    let i3 = n2 + (r2.length - 1) * 41 + 12 + 24
    o.globalAlpha = 0.14, o.fillRect(58, i3, 908, 2), l2 = i3 + 41 + 27
  }
  o.globalAlpha = 0.82, o.font = `400 27px ${FONT}`, ls(o, -0.3)
  let u = t.excerpt || t.summary || ''
  if (u) {
    for (let e2 of wrapLines(o, u, 908, 200))
      if (o.fillText(e2, 58, l2), l2 += 41, l2 >= 1190) break
    l2 += 24
  }
  o.globalAlpha = 0.45
  let d = 0
  for (; l2 < 1190;) {
    let e2 = fillerLines(r * 97 + d * 13 + t.num, 3 + d % 3)
    for (let t2 of wrapLines(o, e2, 908, 200))
      if (o.fillText(t2, 58, l2), l2 += 41, l2 >= 1190) break
    l2 += 24, d++
  }
  o.globalAlpha = 1
}

/* Xe: loose page filler sheet (verbatim) */
function paintLoosePage(e, t) {
  let n = 1024,
    r = Math.round(COVER_H * 0.95 * n / (COVER_RATIO * 0.97))
  e.width = n, e.height = r
  let i = e.getContext('2d')
  i.fillStyle = `#${new THREE.Color(t.paper).lerp(new THREE.Color('#ffffff'), t.theme === 'dark' ? 0.1 : 0.55).getHexString()}`
  i.fillRect(0, 0, n, r), i.fillStyle = t.ink, i.textBaseline = 'alphabetic'
  i.font = `400 28px ${FONT}`, ls(i, -0.3), i.globalAlpha = 0.38
  let a = 92, o = 0
  for (; a < 1206;) {
    let e2 = fillerLines(700 + o * 31, 4)
    for (let t2 of wrapLines(i, e2, 908, 200))
      if (i.fillText(t2, 58, a), a += 41, a >= 1206) break
    a += 24, o++
  }
  i.globalAlpha = 1
}

/* ---------- shared dimensions (Carter constants) ---------- */
export const COVER_H = 1            // _e: unit height
export const COVER_RATIO = 0.78     // L: width/height scale for plane dims
export const COVER_DEPTH = 0.012    // R
export const COVER_TOP = 0.055      // ve: notch top
export const SHELF_NOTCH_H = 0.075  // ye (unused wake, kept for parity)
export const COVER_EDGE_INSET = 0.075 // be
export const COVER_BEVEL = 0.003    // z
export const COVER_W = 0.718        // B: assembled cover width
export const SHELF_TAB_W = 0.24     // Se: notch shoulder span
export const PEEP_X = -0.06         // Te: preview x offset
export const PEEP_SLIDE = 0.62      // Ee: preview slide range

/* Ze: cover outline w/ shoulder notch (verbatim) */
export function coverOutline() {
  let e = COVER_W / 2, t = COVER_H / 2,
    n = new THREE.Shape(),
    r = COVER_TOP, i2 = r - SHELF_TAB_W / 2, a = 0.13999999999999999
  n.moveTo(-0.284, -0.5), n.lineTo(0.284, -0.5)
  n.quadraticCurveTo(e, -0.5, e, -0.425)
  n.lineTo(e, i2)
  n.bezierCurveTo(e, -0.056799999999999996, 0.289, r - SHELF_TAB_W * 0.16, 0.289, r)
  n.bezierCurveTo(0.289, 0.058399999999999994, e, a - SHELF_TAB_W * 0.18, e, a)
  n.lineTo(e, 0.425)
  n.quadraticCurveTo(e, t, 0.284, t)
  n.lineTo(-0.284, t)
  n.quadraticCurveTo(-0.359, t, -0.359, 0.425)
  n.lineTo(-0.359, -0.425)
  n.quadraticCurveTo(-0.359, -0.5, -0.284, -0.5)
  return n
}

export const extrudeCover = e => new THREE.ExtrudeGeometry(e, {
  depth: COVER_DEPTH, bevelEnabled: true, bevelThickness: COVER_BEVEL, bevelSize: COVER_BEVEL, bevelSegments: 2,
})

/* $e: cover UV fit (verbatim) */
const fitCoverUV = (e, t) => {
  e.repeat.set(1 / (t + 2 * COVER_BEVEL), 1 / 1.006)
  e.offset.set((t / 2 + COVER_BEVEL) / (t + 2 * COVER_BEVEL), 0.503 / 1.006)
}

/* et: one folder (verbatim structure) */
/* arg order mirrors Carter's `et(folder, idx, tokens, coverGeoFine, cardGeo,
   sheetsGeo, flagPlane, shadowPlaneGeo, shadowBlob, loosePageTex)` */
export function makeFolder(e, t, tokens, coverGeo, cardGeo, sheetsGeo, flagPlane, shadowPlaneGeo, shadowBlob, loosePageTex) {
  let m = [],
    g = new THREE.Group(),
    bumpTex = fibreTexture(t + 1)
  m.push(bumpTex)
  let coverCanvas = document.createElement('canvas')
  coverCanvas.width = coverCanvas.height = 1
  let coverTex = new THREE.CanvasTexture(coverCanvas)
  coverTex.colorSpace = THREE.SRGBColorSpace, coverTex.anisotropy = 8
  fitCoverUV(coverTex, COVER_W), m.push(coverTex)

  let finishTex = new THREE.CanvasTexture(document.createElement('canvas'))
  fitCoverUV(finishTex, COVER_W), m.push(finishTex)

  let spineCanvas = document.createElement('canvas')
  spineCanvas.width = spineCanvas.height = 1
  let spineTex = new THREE.CanvasTexture(spineCanvas)
  spineTex.colorSpace = THREE.SRGBColorSpace, spineTex.anisotropy = 8, m.push(spineTex)

  let sheetCanvas = document.createElement('canvas')
  sheetCanvas.width = sheetCanvas.height = 1
  let sheetTex = new THREE.CanvasTexture(sheetCanvas)
  sheetTex.colorSpace = THREE.SRGBColorSpace, sheetTex.anisotropy = 8, m.push(sheetTex)

  let w = coverBase(tokens, t, e),
    T = { bumpMap: bumpTex, bumpScale: TUNE_CALM_BUMP },
    ae = 0.9 + 0.06 * hashF(t * 53),
    oe = e2 => e2.clone().lerp(new THREE.Color('#ffffff'), 0.5),
    sideOuter = new THREE.MeshPhysicalMaterial({
      map: coverTex, roughness: 1, roughnessMap: finishTex, metalness: 0,
      sheen: 0.28, sheenRoughness: 0.85, sheenColor: oe(w), ...T,
    }),
    sideCore = new THREE.MeshPhysicalMaterial({
      color: coreTint(w, tokens, t, e), roughness: 0.98, metalness: 0,
      bumpMap: bumpTex, bumpScale: TUNE_CALM_BUMP * 1.6,
    })
  sideCore.userData.core = true
  let spineOuter = new THREE.MeshPhysicalMaterial({
      color: w.clone(), roughness: ae + 0.02, metalness: 0,
      sheen: 0.28, sheenRoughness: 0.85, sheenColor: oe(w), ...T,
    }),
    spineSlice = new THREE.MeshPhysicalMaterial({
      map: spineTex, roughness: ae, metalness: 0,
      sheen: 0.28, sheenRoughness: 0.85, sheenColor: oe(w),
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...T,
    })
  m.push(sideOuter, sideCore, spineOuter, spineSlice)

  let j = new THREE.Mesh(coverGeo, [spineOuter, sideCore])
  j.castShadow = true, j.receiveShadow = true, j.position.z = -0.0395, g.add(j)

  let sheets = [], paperMats = [], paperFlex = []
  for (let e2 = 0; e2 < 4; e2++) {
    let last = e2 === 3,
      mat = last || e2 === 2
        ? new THREE.MeshStandardMaterial({ map: last ? sheetTex : loosePageTex, roughness: 0.96, bumpMap: bumpTex, bumpScale: 0.2 })
        : new THREE.MeshStandardMaterial({ color: paperTint(tokens, t, e2), roughness: 0.96, bumpMap: bumpTex, bumpScale: 0.2 })
    mat.side = 2, m.push(mat), paperMats.push(mat)
    let flex = makeFlex(sheetsGeo, COVER_RATIO * 0.97, 'paper', t * 7 + e2)
    paperFlex.push(flex), m.push(flex)
    let mesh = new THREE.Mesh(flex.geometry, mat)
    mesh.castShadow = true, mesh.receiveShadow = true
    mesh.position.set((last ? 0.008 : 0.015) * hashF(t * 13 + e2), 0.009 * (hashF(t * 3 + e2) - 0.5), -0.0175 + e2 / 3 * 0.035)
    mesh.rotation.z = 0.023 * (hashF(t * 5 + e2) - 0.5)
    g.add(mesh), sheets.push(mesh)
  }

  let sticky = null, flagFlex = null
  if (!e.tone && hashF(t * 17) < 0.42) {
    let names = Object.keys(TONES),
      pick = names[Math.floor(hashF(t * 23) * names.length)],
      flagMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(TONES[pick].dark), roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.35, side: 2,
      })
    m.push(flagMat)
    flagFlex = makeFlex(flagPlane, 0.15, 'flag', t)
    m.push(flagFlex)
    let flagMesh = new THREE.Mesh(flagFlex.geometry, flagMat)
    flagMesh.castShadow = true, sticky = flagMesh
    let a = hashF(t * 37), s = hashF(t * 29) - 0.5
    a < 0.45
      ? (flagMesh.position.set(COVER_RATIO / 2 - 0.026, -0.24000000000000002 + 0.12 * s, 0), flagMesh.rotation.z = -0.05 - 0.07 * hashF(t * 31))
      : a < 0.75
        ? (flagMesh.position.set(-COVER_RATIO * 0.1 + COVER_RATIO * 0.45 * s, COVER_H / 2 - 0.028, 0), flagMesh.rotation.z = 0.16 * s)
        : (flagMesh.position.set(-COVER_RATIO * 0.05 + COVER_RATIO * 0.4 * s, -0.47, 0), flagMesh.rotation.z = 0.14 * s)
    flagMesh.position.z = 0.0027500000000000024
    g.add(flagMesh)
  }

  let pivot = new THREE.Group()
  pivot.position.x = -COVER_RATIO / 2
  let coverFlex = makeFlex(cardGeo, COVER_W, 'card', t)
  m.push(coverFlex)
  let coverMesh = new THREE.Mesh(coverFlex.geometry, [sideOuter, sideCore])
  coverMesh.castShadow = true, coverMesh.receiveShadow = true
  coverMesh.position.x = COVER_W / 2, coverMesh.position.z = 0.0275
  pivot.add(coverMesh)
  pivot.rotation.y = -GAPE * Math.PI / 180
  g.add(pivot)

  let previewCanvas = document.createElement('canvas')
  previewCanvas.width = previewCanvas.height = 1
  let previewTex = new THREE.CanvasTexture(previewCanvas)
  previewTex.colorSpace = THREE.SRGBColorSpace, previewTex.anisotropy = 8
  let previewMat = new THREE.MeshStandardMaterial({ map: previewTex, roughness: 0.96, side: 2 }),
    previewBase = new THREE.PlaneGeometry(0.44, 0.3, 12, 8),
    previewFlex = makeFlex(previewBase, 0.44, 'paper', e.num)
  previewFlex.update(0.012), previewBase.dispose()
  let previewMesh = new THREE.Mesh(previewFlex.geometry, previewMat)
  previewMesh.position.set(PEEP_X, COVER_TOP, 0.0245)
  previewMesh.castShadow = previewMesh.receiveShadow = true
  previewMesh.visible = false
  g.add(previewMesh), m.push(previewTex, previewMat, previewFlex)

  let shadowMat = new THREE.MeshBasicMaterial({
    map: shadowBlob, transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
  })
  m.push(shadowMat)
  let shadowMesh = new THREE.Mesh(shadowPlaneGeo, shadowMat)
  shadowMesh.rotation.x = -Math.PI / 2, shadowMesh.position.y = -1 / 2 - 0.025, g.add(shadowMesh)

  let spineStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.087, COVER_H - 2 * COVER_EDGE_INSET - 0.006), spineSlice)
  spineStrip.rotation.y = -Math.PI / 2, spineStrip.position.set(-COVER_RATIO / 2, 0, 0)
  m.push(spineStrip.geometry), g.add(spineStrip)

  return {
    group: g, pivot, coverFlex, paperFlex, flagFlex, finishTex,
    preview: previewMesh, previewCanvas, previewTex,
    sheets, coverTex, spineTex, sheetTex,
    coverCanvas, spineCanvas, sheetCanvas,
    stockMats: [sideOuter, sideCore, spineOuter, spineSlice],
    paperMats, shadowMat, sticky,
    stickyRot: sticky?.rotation.z ?? 0,
    typeset: false,
    disposables: m,
  }
}

/* le: the tessellated cover geometry the world builds once (verbatim) */
export function makeCoverGeometry() {
  const base = extrudeCover(coverOutline())
  const fine = tessellateGroups(base)
  base.dispose()
  return fine
}

/* shared geometry bundle — built once per world (verbatim) */
export function makeSharedGeometry() {
  const coverGeo = extrudeCover(coverOutline())
  const coverGeoFine = tessellateGroups(coverGeo)
  coverGeo.dispose()
  const cardGeo = extrudeCover(notchedRect(COVER_RATIO, COVER_H, COVER_EDGE_INSET, SHELF_TAB_W))
  const sheetsGeo = new THREE.PlaneGeometry(COVER_RATIO * 0.97, COVER_H * 0.95, 14, 18)
  const flagPlane = new THREE.PlaneGeometry(0.15, 0.15, 10, 4)
  const shadowPlaneGeo = new THREE.PlaneGeometry(COVER_RATIO * 1.9, 0.64)
  const shadowBlob = blobShadowTexture()
  const looseCanvas = document.createElement('canvas')
  paintLoosePage(looseCanvas, readTokens())
  const looseTex = new THREE.CanvasTexture(looseCanvas)
  looseTex.colorSpace = THREE.SRGBColorSpace, looseTex.anisotropy = 8
  return { coverGeoFine, cardGeo, sheetsGeo, flagPlane, shadowPlaneGeo, shadowBlob, looseCanvas, looseTex }
}

/* per-folder canvas painting entry (verbatim at()) */
export function typesetFolder(folders, idx, postList, tokens) {
  let f = folders[idx]
  drawCover(f.coverCanvas, postList[idx], tokens, idx)
  coverToBump(f.coverCanvas, f.finishTex)
  paintPreview(f.previewCanvas, postList[idx], tokens)
  f.preview.scale.y = 0.44 * f.previewCanvas.height / f.previewCanvas.width / 0.3
  paintSpine(f.spineCanvas, postList[idx], tokens, idx)
  paintSheetInside(f.sheetCanvas, postList[idx], tokens, idx)
  f.coverTex.needsUpdate = true, f.spineTex.needsUpdate = true, f.sheetTex.needsUpdate = true, f.previewTex.needsUpdate = true
  f.typeset = true
}

/* ot: release typeset canvases (verbatim) */
export function releaseFolder(folders, idx) {
  let f = folders[idx]
  for (let e of [f.coverCanvas, f.spineCanvas, f.sheetCanvas, f.previewCanvas, f.finishTex.image])
    e.width = 1, e.height = 1
  f.coverTex.needsUpdate = true, f.spineTex.needsUpdate = true, f.sheetTex.needsUpdate = true, f.finishTex.needsUpdate = true, f.previewTex.needsUpdate = true
  f.typeset = false
}

export { paintLoosePage, paintSheetInside, paintSpine, coverToBump, edgeWear, speckle, coreTint, paperTint, coverBase, coverInk, themeFamily, family, TONES, FAM, hashF, FONT, MONO, ls }

/* Carter runtime tunables consumed here */
const TUNE_CALM_BUMP = 3.5 // De.bump default — overridable via TUNE.bump from the world
const GAPE = 0.07 // De.gape default (tuning panel could set it; not ported)
