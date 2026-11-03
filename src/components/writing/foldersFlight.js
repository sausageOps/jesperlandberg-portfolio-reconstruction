/* Folder flight layer — faithful port of Carter app/lib/folders-flight.js
 * (recovered src/folders-flight.BWHyG9ew.js). Draws the folded sheet on the global
 * [data-flight] canvas between the Writing index and the post, then dissolves it
 * into the claim area. Carter's astro route-bridge (page-load events) is driven by
 * WritingSystem.jsx instead; mesh-wire (?mesh dev override) is not ported.
 */
import * as THREE from 'three'
import gsap from 'gsap'

const g = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const FOV = 30

class FoldersFlightImpl {
  renderer = null
  canvas = null
  scene = null
  cam = null
  mesh = null
  mat = null
  tex = null
  planeW = 1
  camZ = 3
  camY = 0
  active = false
  phase = 'hold'
  pos = new THREE.Vector3()
  quat = new THREE.Quaternion()
  scl = new THREE.Vector3(1, 1, 1)
  tPos = new THREE.Vector3()
  tQuat = new THREE.Quaternion()
  tScl = new THREE.Vector3(1, 1, 1)
  ticking = false
  waiting = []
  paperEl = null
  kind = 'out'
  onArrive = null
  damp = 0.11
  poseGuard = null

  frontLayer() {
    if (!this.canvas || g()) return null
    if (!this.renderer) {
      try {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true })
      } catch {
        return null
      }
      this.renderer.setClearColor(0, 0)
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
    }
    return { renderer: this.renderer, canvas: this.canvas }
  }
  get returning() {
    return this.active && this.kind === 'back'
  }
  get inFlight() {
    return this.active
  }
  abort() {
    if (!this.active) return
    let e = this.onArrive
    this.onArrive = null, this.stop(), e?.()
  }
  init() {
    const next = document.querySelector('[data-flight]')
    /* Carter's flight chunk re-ran on every astro page-load against the persisted
       canvas. React remounts that canvas when Writing unmounts, so a renderer bound
       to the previous element (or a disposed one) has to be dropped here. */
    if (this.renderer && (next !== this.canvas || this.renderer.getContext?.()?.isContextLost?.())) {
      this.renderer.dispose?.()
      this.renderer = null
      this.stop()
    }
    this.canvas = next
    /* Carter re-runs onPage on astro:page-load; the React router drives it via onPage()
     * calls from WritingSystem.jsx after each route commit instead. */
  }
  beginReturn(e) {
    if (this.poseGuard?.()) return false
    let t = 2 * Math.tan(FOV * Math.PI / 360) * e.camZ / innerHeight,
      n = e.rect.left + e.rect.width / 2 - innerWidth / 2,
      r = innerHeight / 2 - (e.rect.top + e.rect.height / 2),
      i = e.rect.width * t / e.planeW,
      a = new THREE.Matrix4().compose(new THREE.Vector3(n * t, e.camY + r * t, 0), new THREE.Quaternion(), new THREE.Vector3(i, i, i))
    if (!this.begin({ sheetCanvas: e.sheetCanvas, matrixWorld: a, planeW: e.planeW, planeH: e.planeH, camZ: e.camZ, camY: e.camY })) return false
    this.kind = 'back'
    let s = document.querySelector('[data-flight-paper]')
    if (s) s.style.opacity = '0'
    return true
  }
  flyHome(e, t) {
    if (!this.active || this.kind !== 'back') {
      t()
      return
    }
    e.decompose(this.tPos, this.tQuat, this.tScl)
    this.onArrive = t, this.phase = 'fly'
  }
  begin(o) {
    if (!this.canvas || g()) return false
    if (!this.renderer) {
      try {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true })
      } catch {
        return false
      }
      this.renderer.setClearColor(0, 0)
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
    }
    if (this.kind === 'back' && this.onArrive) {
      let e = this.onArrive
      this.onArrive = null, e()
    }
    this.release()
    this.renderer.toneMapping = 0 /* NoToneMapping */
    this.canvas.style.zIndex = '80'
    this.canvas.style.display = 'block'
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.setSize(innerWidth, innerHeight, false)
    this.scene = new THREE.Scene()
    this.cam = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.1, 20)
    this.cam.position.set(0, o.camY, o.camZ)
    this.cam.updateProjectionMatrix()
    this.camZ = o.camZ, this.camY = o.camY, this.planeW = o.planeW
    this.tex = new THREE.CanvasTexture(o.sheetCanvas)
    this.tex.colorSpace = THREE.SRGBColorSpace, this.tex.anisotropy = 8
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, toneMapped: false })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(o.planeW, o.planeH), this.mat)
    o.matrixWorld.decompose(this.pos, this.quat, this.scl)
    this.tPos.copy(this.pos).add(new THREE.Vector3(0.02, 0.05, 0.12))
    this.tQuat.copy(this.quat)
    this.tScl.copy(this.scl)
    this.scene.add(this.mesh)
    this.phase = 'hold', this.kind = 'out', this.onArrive = null
    this.active = true
    this.canvas.style.opacity = '1'
    this.ticking || (this.ticking = true, gsap.ticker.add(this.tick))
    return true
  }
  onPage() {
    if (!this.active || this.phase === 'dissolve' || this.kind === 'back') return
    let e = document.querySelector('[data-sheet-claim]')
    if (!e || !this.cam) {
      this.dissolve()
      return
    }
    this.waiting = [...document.querySelectorAll('[data-flight-wait]')]
    this.waiting.forEach(e2 => { e2.style.opacity = '0' })
    this.paperEl = document.querySelector('[data-flight-paper]')
    if (this.paperEl) this.paperEl.style.opacity = '0'
    let t = e.getBoundingClientRect(),
      n = 2 * Math.tan(FOV * Math.PI / 360) * this.camZ / innerHeight,
      r = t.left + t.width / 2 - innerWidth / 2,
      i = innerHeight / 2 - (t.top + t.height / 2)
    this.tPos.set(r * n, this.camY + i * n, 0)
    this.tQuat.identity()
    let a = t.width * n / this.planeW
    this.tScl.set(a, a, a)
    this.phase = 'fly'
  }
  tick = () => {
    if (!this.active || !this.renderer || !this.scene || !this.cam) return
    let e = this.mesh
    if (e) {
      this.pos.lerp(this.tPos, this.damp)
      this.quat.slerp(this.tQuat, this.damp)
      this.scl.lerp(this.tScl, this.damp)
      e.matrixAutoUpdate = false
      e.matrix.compose(this.pos, this.quat, this.scl)
      this.renderer.render(this.scene, this.cam)
      if (this.phase === 'fly' && this.pos.distanceTo(this.tPos) < 0.012) {
        if (this.kind === 'back') {
          let e2 = this.onArrive
          this.onArrive = null, this.stop(), e2?.()
        } else this.dissolve()
      }
    }
  }
  dissolve() {
    if (this.phase !== 'dissolve') {
      this.phase = 'dissolve'
      if (this.waiting.length) {
        gsap.fromTo(this.waiting, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06, clearProps: 'opacity,transform' })
        this.waiting = []
      }
      this.paperEl &&= (gsap.to(this.paperEl, { opacity: 1, duration: 0.16, ease: 'none', clearProps: 'opacity' }), null)
      if (!this.mat) {
        this.stop()
        return
      }
      gsap.to(this.mat, { opacity: 0, duration: 0.16, ease: 'none', onComplete: () => this.stop() })
    }
  }
  stop() {
    this.waiting.forEach(e => { e.style.opacity = '' })
    this.waiting = []
    this.paperEl &&= (this.paperEl.style.opacity = '', null)
    this.release()
    this.active = false
    if (this.canvas) this.canvas.style.opacity = '0'
    this.ticking &&= (gsap.ticker.remove(this.tick), false)
    this.renderer?.clear()
  }
  release() {
    this.mesh &&= (this.mesh.geometry.dispose(), this.scene?.remove(this.mesh), null)
    this.mat?.dispose()
    this.mat = null
    this.tex?.dispose()
    this.tex = null
  }
}

export const FoldersFlight = new FoldersFlightImpl()
