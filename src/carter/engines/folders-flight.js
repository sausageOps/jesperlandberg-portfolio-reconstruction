// Carter folder flight layer (`app/lib/folders-flight.js` / `src/folders-flight.BWHyG9ew.js`),
// adapted to Jesper's `.carter` frame and cleanly disposed when leaving Writing routes.
import e from 'gsap';
import {
  CanvasTexture as a,
  Matrix4 as c,
  Mesh as t,
  MeshBasicMaterial as n,
  PerspectiveCamera as i,
  PlaneGeometry as l,
  Quaternion as o,
  SRGBColorSpace as r,
  Scene as u,
  Vector3 as d,
  WebGLRenderer as s,
} from 'three';
import { getCarterRoot } from '../runtime.js';
import { t as f } from './mesh-wire.js';

var p = Object.defineProperty,
  m = (e, t) => {
    let n = {};
    for (var r in e) p(n, r, { get: e[r], enumerable: !0 });
    return t || p(n, Symbol.toStringTag, { value: `Module` }), n;
  },
  h = m({ FoldersFlight: () => v }),
  g = () => matchMedia(`(prefers-reduced-motion: reduce)`).matches,
  _ = 30,
  v = new (class {
    renderer = null;
    canvas = null;
    scene = null;
    cam = null;
    mesh = null;
    mat = null;
    tex = null;
    planeW = 1;
    camZ = 3;
    camY = 0;
    active = !1;
    phase = `hold`;
    pos = new d();
    quat = new o();
    scl = new d(1, 1, 1);
    tPos = new d();
    tQuat = new o();
    tScl = new d(1, 1, 1);
    ticking = !1;
    waiting = [];
    paperEl = null;
    kind = `out`;
    onArrive = null;
    damp = 0.11;
    poseGuard = null;

    frontLayer() {
      if (!this.canvas || g()) return null;
      if (!this.renderer) {
        try {
          this.renderer = new s({ canvas: this.canvas, antialias: !0, alpha: !0 });
        } catch {
          return null;
        }
        this.renderer.setClearColor(0, 0);
        this.renderer.outputColorSpace = r;
      }
      return { renderer: this.renderer, canvas: this.canvas };
    }

    get returning() {
      return this.active && this.kind === `back`;
    }

    get inFlight() {
      return this.active;
    }

    abort() {
      if (!this.active) return;
      let e = this.onArrive;
      this.onArrive = null;
      this.stop();
      e?.();
    }

    init() {
      const root = getCarterRoot() ?? document;
      const nextCanvas = root.querySelector(`[data-flight]`);
      if (this.canvas && this.canvas !== nextCanvas && this.renderer) {
        this.renderer.dispose();
        this.renderer.forceContextLoss?.();
        this.renderer = null;
      }
      this.canvas = nextCanvas;
      this.onPage();
    }

    beginReturn(e) {
      if (this.poseGuard?.()) return !1;
      let t = (2 * Math.tan((_ * Math.PI) / 360) * e.camZ) / innerHeight,
        n = e.rect.left + e.rect.width / 2 - innerWidth / 2,
        r = innerHeight / 2 - (e.rect.top + e.rect.height / 2),
        i = (e.rect.width * t) / e.planeW,
        a = new c().compose(new d(n * t, e.camY + r * t, 0), new o(), new d(i, i, i));
      if (
        !this.begin({
          sheetCanvas: e.sheetCanvas,
          matrixWorld: a,
          planeW: e.planeW,
          planeH: e.planeH,
          camZ: e.camZ,
          camY: e.camY,
        })
      )
        return !1;
      this.kind = `back`;
      let s = (getCarterRoot() ?? document).querySelector(`[data-flight-paper]`);
      return s && (s.style.opacity = `0`), !0;
    }

    flyHome(e, t) {
      if (!this.active || this.kind !== `back`) {
        t();
        return;
      }
      e.decompose(this.tPos, this.tQuat, this.tScl);
      this.onArrive = t;
      this.phase = `fly`;
    }

    begin(o) {
      if (!this.canvas || g()) return !1;
      if (!this.renderer) {
        try {
          this.renderer = new s({ canvas: this.canvas, antialias: !0, alpha: !0 });
        } catch {
          return !1;
        }
        this.renderer.setClearColor(0, 0);
        this.renderer.outputColorSpace = r;
      }
      if (this.kind === `back` && this.onArrive) {
        let e = this.onArrive;
        this.onArrive = null;
        e();
      }
      return (
        this.release(),
        (this.renderer.toneMapping = 0),
        (this.canvas.style.zIndex = `80`),
        (this.canvas.style.display = `block`),
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)),
        this.renderer.setSize(innerWidth, innerHeight, !1),
        (this.scene = new u()),
        (this.cam = new i(_, innerWidth / innerHeight, 0.1, 20)),
        this.cam.position.set(0, o.camY, o.camZ),
        this.cam.updateProjectionMatrix(),
        (this.camZ = o.camZ),
        (this.camY = o.camY),
        (this.planeW = o.planeW),
        (this.tex = new a(o.sheetCanvas)),
        (this.tex.colorSpace = r),
        (this.tex.anisotropy = 8),
        (this.mat = new n({ map: this.tex, transparent: !0, toneMapped: !1 })),
        (this.mesh = new t(new l(o.planeW, o.planeH), this.mat)),
        o.matrixWorld.decompose(this.pos, this.quat, this.scl),
        this.tPos.copy(this.pos).add(new d(0.02, 0.05, 0.12)),
        this.tQuat.copy(this.quat),
        this.tScl.copy(this.scl),
        this.scene.add(this.mesh),
        (this.phase = `hold`),
        (this.kind = `out`),
        (this.onArrive = null),
        (this.active = !0),
        (this.canvas.style.opacity = `1`),
        this.ticking || ((this.ticking = !0), e.ticker.add(this.tick)),
        !0
      );
    }

    onPage() {
      if (!this.active || this.phase === `dissolve` || this.kind === `back`) return;
      const root = getCarterRoot() ?? document;
      let e = root.querySelector(`[data-sheet-claim]`);
      if (!e || !this.cam) {
        this.dissolve();
        return;
      }
      this.waiting = [...root.querySelectorAll(`[data-flight-wait]`)];
      this.waiting.forEach((e) => {
        e.style.opacity = `0`;
      });
      this.paperEl = root.querySelector(`[data-flight-paper]`);
      this.paperEl && (this.paperEl.style.opacity = `0`);
      let t = e.getBoundingClientRect(),
        n = (2 * Math.tan((_ * Math.PI) / 360) * this.camZ) / innerHeight,
        r = t.left + t.width / 2 - innerWidth / 2,
        i = innerHeight / 2 - (t.top + t.height / 2);
      this.tPos.set(r * n, this.camY + i * n, 0);
      this.tQuat.identity();
      let a = (t.width * n) / this.planeW;
      this.tScl.set(a, a, a);
      this.phase = `fly`;
    }

    tick = () => {
      if (!this.active || !this.renderer || !this.scene || !this.cam) return;
      let e = this.mesh;
      if (
        e &&
        (this.pos.lerp(this.tPos, this.damp),
        this.quat.slerp(this.tQuat, this.damp),
        this.scl.lerp(this.tScl, this.damp),
        (e.matrixAutoUpdate = !1),
        e.matrix.compose(this.pos, this.quat, this.scl),
        f(this.scene),
        this.renderer.render(this.scene, this.cam),
        this.phase === `fly` && this.pos.distanceTo(this.tPos) < 0.012)
      ) {
        if (this.kind === `back`) {
          let e = this.onArrive;
          this.onArrive = null;
          this.stop();
          e?.();
        } else this.dissolve();
      }
    };

    dissolve() {
      if (this.phase !== `dissolve`) {
        if (
          ((this.phase = `dissolve`),
          this.waiting.length &&
            (e.fromTo(
              this.waiting,
              { opacity: 0, y: 14 },
              { opacity: 1, y: 0, duration: 0.7, ease: `expo.out`, stagger: 0.06, clearProps: `opacity,transform` },
            ),
            (this.waiting = [])),
          (this.paperEl &&= (e.to(this.paperEl, { opacity: 1, duration: 0.16, ease: `none`, clearProps: `opacity` }), null)),
          !this.mat)
        ) {
          this.stop();
          return;
        }
        e.to(this.mat, { opacity: 0, duration: 0.16, ease: `none`, onComplete: () => this.stop() });
      }
    }

    stop() {
      this.waiting.forEach((t) => {
        e.killTweensOf(t);
        t.style.opacity = ``;
      });
      this.waiting = [];
      if (this.paperEl) {
        e.killTweensOf(this.paperEl);
        this.paperEl.style.opacity = ``;
        this.paperEl = null;
      }
      this.mat && e.killTweensOf(this.mat);
      this.release();
      this.active = !1;
      this.canvas && (this.canvas.style.opacity = `0`);
      this.ticking &&= (e.ticker.remove(this.tick), !1);
      this.renderer?.clear();
    }

    release() {
      this.mesh &&= (this.mesh.geometry.dispose(), this.scene?.remove(this.mesh), null);
      this.mat?.dispose();
      this.mat = null;
      this.tex?.dispose();
      this.tex = null;
    }

    dispose() {
      this.abort();
      this.stop();
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer.forceContextLoss?.();
        this.renderer = null;
      }
      this.scene = null;
      this.cam = null;
      this.canvas = null;
    }
  })();

export { h as n, m as r, v as t };
export const FoldersFlight = v;
