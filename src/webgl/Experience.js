import * as THREE from 'three';
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  fullscreenVertex,
  skyFragment,
  surfaceVertex,
  surfaceFragment,
  postFragment,
  trailFragment,
  llamaVertex,
  llamaFragment,
  awardVertex,
  awardFragment,
} from './shaders.js';
import { DragVelocityTracker, PanelNavigation, centeredWrap, normalizeWheelDelta } from './panelNavigation.js';

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const ease = (dt, speed = 6.6) => 1 - Math.exp(-speed * Math.min(dt, 0.05));
const expoInOut = gsap.parseEase('expo.inOut');
const holeFlightCurves = [
  [0, 0, 0.094, 0.026, 0.124, 0.127, 0.157, 0.29],
  [0.157, 0.29, 0.197, 0.486, 0.254, 0.8, 0.348, 0.884],
  [0.348, 0.884, 0.42, 0.949, 0.374, 1, 1, 1],
];
const holeCubic = (t, x1, y1, x2, y2) => {
  const r = 1 - t;
  return r * r * r * x1 + 3 * r * r * t * y1 + 3 * r * t * t * x2 + t * t * t * y2;
};
const holeFlightEase = (value) => {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  for (const [x0, y0, x1, y1, x2, y2, x3, y3] of holeFlightCurves) {
    if (value > x3) continue;
    let left = 0;
    let right = 1;
    for (let i = 0; i < 20; i += 1) {
      const mid = (left + right) / 2;
      if (holeCubic(mid, x0, x1, x2, x3) < value) left = mid;
      else right = mid;
    }
    return holeCubic((left + right) / 2, y0, y1, y2, y3);
  }
  return value;
};

function normalizeGeometry(source) {
  let geometry = source;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const center = box.getCenter(new THREE.Vector3());
  const height = Math.max(0.0001, box.max.y - box.min.y);
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(1 / height, 1 / height, 1 / height);
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  return geometry;
}

function trackedText(text, size, tracking = -0.05) {
  const scale = 2;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `400 ${size * scale}px Diatype, sans-serif`;
  const chars = [...text];
  const widths = chars.map((char) => measure.measureText(char).width);
  const gap = tracking * size * scale;
  const width = Math.max(1, widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1));
  const height = Math.max(1, size * 1.4 * scale);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const ctx = canvas.getContext('2d');
  ctx.font = measure.font;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  let x = 0;
  chars.forEach((char, index) => {
    ctx.fillText(char, x, canvas.height / 2);
    x += widths[index] + gap;
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return { texture, width: width / scale, height: height / scale };
}

function arrowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(48, 64);
  ctx.lineTo(80, 64);
  ctx.moveTo(68, 52);
  ctx.lineTo(80, 64);
  ctx.lineTo(68, 76);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default class Experience {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = this.motionQuery.matches;
    this.route = 'home';
    this.overlay = null;
    this.interactive = false;
    this.ready = false;
    this.destroyed = false;
    this.clock = 0;
    this.postTime = 0;
    this.lastTime = performance.now();
    this.textureCache = new Map();
    this.videoCache = new Map();
    this.homeCards = [];
    this.homeRects = new Map();
    this.homeElements = [];
    this.homeBase = [];
    this.homeOffset = { current: 0, target: 0, period: 0 };
    this.homeVelocity = 0;
    this.homeRawVelocity = 0;
    this.homeLayoutReady = false;
    this.activeHomeSlug = null;
    // Input intent lives here; updateHome remains the only gallery renderer.
    this.homeNavigation = new PanelNavigation();
    this.homeDragVelocity = new DragVelocityTracker();
    this.homeClickBlockUntil = 0;
    this.project = null;
    this.projectMedia = [];
    this.projectAwards = [];
    this.projectTitle = null;
    this.projectPills = [];
    this.projectScrollItems = [];
    this.projectOffset = { current: 0, target: 0, total: 1, max: 0 };
    this.scrollInput = { pending: 0, fast: 0, event: null, stamp: 0, fastStamp: -500 };
    this.touchScroll = null;
    this.projectDrag = null;
    this.projectScrub = { p: 0 };
    this.projectScrubParts = null;
    this.projectSurfaces = null;
    this.projectClose = null;
    this.projectSurfaceRects = null;
    this.projectDragBow = 0;
    this.projectBulge = 0;
    this.returningHome = false;
    this.hole = { p: 0, s: -0.1, radius: 0.2 };
    this.mouse = new THREE.Vector2(0.5, 0.5);
    this.mouseA = 0;
    this.ball = { p: 0, on: false, seen: false, tx: 0, ty: 0, sx: 0, sy: 0, e: 0, w: 1 };
    this.ballScan = 0;
    this.ballShield = [];
    this.lastMouse = null;
    this.drag = null;
    this.bootProgress = { p: 0 };
    this.progressTween = null;
    this.suppressClick = false;
    this.llamaItems = [];
    this.dummy = new THREE.Object3D();
    this.bound = {};
  }

  async init({ projects, featured }) {
    gsap.config({ autoSleep: false });
    gsap.ticker.lagSmoothing(0);
    this.projects = projects;
    this.featured = featured;
    try {
      this.setupRenderer();
      this.setupScene();
      this.webgl = true;
      document.documentElement.classList.add('webgl');
      this.prepareProjectBackground();
    } catch (error) {
      console.warn('WebGL unavailable; using the accessible DOM fallback.', error);
      this.webgl = false;
      document.documentElement.classList.add('no-webgl');
    }
    this.bindEvents();
    this.resize();
    this.tick(performance.now());
    this.loadModels();

    const assets = [...new Set(projects.map((project) => project.asset))];
    let completed = 0;
    let cursor = 0;
    const worker = async () => {
      while (cursor < assets.length) {
        const asset = assets[cursor++];
        await this.loadTexture(asset);
        completed += 1;
        this.progressTween?.kill();
        this.progressTween = gsap.to(this.bootProgress, {
          p: completed / assets.length,
          duration: this.reducedMotion ? 0 : 0.8,
          ease: 'power3.out',
          onUpdate: () => this.callbacks.onProgress?.(this.bootProgress.p),
        });
      }
    };
    const loading = Promise.all(Array.from({ length: Math.min(6, assets.length) }, worker));
    const failsafe = new Promise((resolve) => setTimeout(resolve, 12000));
    const started = performance.now();
    await Promise.race([Promise.all([loading, document.fonts.ready]), failsafe]);
    if (this.progressTween) await this.progressTween;
    if (!this.reducedMotion && performance.now() - started < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    this.callbacks.onProgress?.(1);
    this.ready = true;
    this.interactive = true;
    if (this.homeElements.length) {
      this.layoutHome(true);
      // Let the same damped track used by wheel and drag carry the reveal
      // into its resting position while the loader bars become panels.
      if (this.route === 'home' && !this.reducedMotion) {
        this.homeOffset.current -= this.vw * 0.14;
      }
      this.playHomeIntro(false);
    }
    this.callbacks.onReady?.();
    return this;
  }

  setupRenderer() {
    const context = this.canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    if (!context) throw new Error('WebGL 2 is unavailable.');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      context,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.camera = new THREE.PerspectiveCamera(53.4, 1, 0.1, 2000);
    this.camera.position.z = 41.18;
    this.scene = new THREE.Scene();
    this.homeGroup = new THREE.Group();
    this.projectGroup = new THREE.Group();
    this.overlayScene = new THREE.Scene();
    this.scene.add(this.homeGroup, this.projectGroup);
    this.projectGroup.visible = false;
    this.quadGeometry = new THREE.PlaneGeometry(1, 1, 32, 16);
    this.blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this.blank.needsUpdate = true;
    this.projectBackground = {
      texture: { value: this.blank },
      ready: { value: 0 },
      viewport: { value: new THREE.Vector2(1, 1) },
      offset: { value: new THREE.Vector2() },
      tile: { value: 1 },
      pixelRatio: { value: 1 },
      opacity: { value: 0 },
      ink: { value: 0 },
      color: { value: new THREE.Vector3(242 / 255, 242 / 255, 242 / 255) },
    };
    this.arrowTexture = arrowTexture();
  }

  setupScene() {
    this.sky = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertex,
        fragmentShader: skyFragment,
        uniforms: { u_color: { value: new THREE.Color(0x000000) } },
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.sky.renderOrder = -100;
    this.sky.frustumCulled = false;
    // The homepage background is a separate, non-interactive layer behind the canvas.
    this.sky.visible = this.route !== 'home';
    this.scene.add(this.sky);

    this.target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      colorSpace: THREE.SRGBColorSpace,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.postMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: postFragment,
      uniforms: {
        u_scene: { value: this.target.texture },
        u_aspect: { value: new THREE.Vector2(1, 1) },
        u_time: { value: 0 },
        u_center: { value: new THREE.Vector2(0.5, 0.5) },
        u_p: { value: 0 },
        u_radius: { value: 0.2 },
        u_squash: { value: -0.1 },
        u_mouse: { value: this.mouse },
        u_mouseA: { value: 0 },
        u_ballA: { value: 0 },
        u_ballWarp: { value: -0.045 },
        u_ballShade: { value: -1.2 },
        u_ballEdge: { value: new THREE.Vector2(0.22, 0.5) },
        u_trail: { value: null },
        u_trailTexel: { value: new THREE.Vector2(1 / 256, 1 / 256) },
      },
      transparent: true,
      // The home and project scene targets are already premultiplied over transparency.
      // Blending them again darkens antialiased panel edges during pointer effects.
      blending: this.route === 'home' || this.route === 'project' ? THREE.NoBlending : THREE.NormalBlending,
      depthTest: false,
      depthWrite: false,
    });
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
    postQuad.frustumCulled = false;
    this.postScene.add(postQuad);

    this.trail = Array.from({ length: 2 }, () => new THREE.WebGLRenderTarget(256, 256, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    }));
    this.trailMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: trailFragment,
      uniforms: {
        u_prev: { value: null },
        u_texel: { value: new THREE.Vector2(1 / 256, 1 / 256) },
        u_decay: { value: 1 },
        u_diff: { value: 0 },
        u_pos: { value: new THREE.Vector2(0.5, 0.5) },
        u_amp: { value: 0 },
        u_rad: { value: 0.04 },
        u_aspect: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.trailScene = new THREE.Scene();
    const trailQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.trailMaterial);
    trailQuad.frustumCulled = false;
    this.trailScene.add(trailQuad);
    this.trailSide = 0;
    this.trailFresh = false;
    this.trailOn = false;
  }

  loadTexture(url) {
    if (!url) return Promise.resolve(this.blank);
    if (!this.textureCache.has(url)) {
      const promise = new THREE.TextureLoader()
        .loadAsync(url)
        .then((texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.magFilter = THREE.LinearFilter;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.generateMipmaps = true;
          texture.anisotropy = this.renderer ? Math.min(8, this.renderer.capabilities.getMaxAnisotropy()) : 1;
          return texture;
        })
        .catch(() => this.blank);
      this.textureCache.set(url, promise);
    }
    return this.textureCache.get(url);
  }

  // The opaque project canvas cannot expose the CSS layer underneath it. Use
  // the same CSS tile and its live computed animation on the background mesh,
  // behind the separately rendered project media and controls.
  prepareProjectBackground() {
    const app = document.querySelector('.app');
    if (!app) return;
    const image = getComputedStyle(app).getPropertyValue('--a24-grain-image').trim();
    const url = image.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if (!url || this.projectBackgroundRequested) return;
    this.projectBackgroundRequested = true;
    this.loadTexture(url).then((texture) => {
      if (this.destroyed || texture === this.blank) return;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      // CSS scales this tile directly rather than using mipmapped thumbnails.
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      this.projectBackground.texture.value = texture;
      this.projectBackground.ready.value = 1;
    });
  }

  syncProjectBackground() {
    if (!this.projectSurfaces) return;
    if (!this.projectBackgroundRequested) this.prepareProjectBackground();
    const app = document.querySelector('.app');
    if (!app) return;
    const style = getComputedStyle(app, '::after');
    const matrix = style.transform === 'none' ? null : new DOMMatrixReadOnly(style.transform);
    const bg = this.projectBackground;
    bg.viewport.value.set(this.vw, this.vh);
    bg.pixelRatio.value = this.renderer.getPixelRatio();
    bg.offset.value.set(matrix?.m41 || 0, matrix?.m42 || 0);
    bg.tile.value = parseFloat(style.backgroundSize) || 1;
    bg.opacity.value = parseFloat(style.opacity) || 0;
    // The panel wash uses the non-inverted ink; inversion only affects the
    // dark CSS backdrop, not the shader's light project interior.
    const contrast = parseFloat(style.filter.match(/contrast\(([^)]+)\)/)?.[1] || '1');
    const brightness = parseFloat(style.filter.match(/brightness\(([^)]+)\)/)?.[1] || '1');
    bg.ink.value = (0.5 - 0.5 * contrast) * brightness;
    const colorValue = getComputedStyle(app).getPropertyValue('--a24-background-color').trim();
    if (colorValue && colorValue !== this.projectBackgroundColorValue) {
      const color = new THREE.Color(colorValue).convertLinearToSRGB();
      bg.color.value.set(color.r, color.g, color.b);
      this.projectBackgroundColorValue = colorValue;
    }
  }

  applyTexture(material, url, fallbackSize) {
    material.uniforms.u_size.value.set(fallbackSize.width, fallbackSize.height);
    this.loadTexture(url).then((texture) => {
      if (!material || material.disposed) return;
      material.uniforms.u_texture.value = texture;
      const image = texture.image;
      if (image?.width && image?.height) material.uniforms.u_size.value.set(image.width, image.height);
    });
  }

  makeSurface(texture, size, textMode = false) {
    return new THREE.ShaderMaterial({
      vertexShader: surfaceVertex,
      fragmentShader: surfaceFragment,
      uniforms: {
        u_texture: { value: texture || this.blank },
        u_size: { value: new THREE.Vector2(size?.width || 1, size?.height || 1) },
        u_res: { value: new THREE.Vector2(1, 1) },
        u_alpha: { value: 0 },
        u_shade: { value: textMode ? 0 : 1 },
        u_shadeS: { value: 1 },
        u_corner: { value: 0 },
        u_white: { value: 0 },
        u_wash: { value: new THREE.Color(0xffffff) },
        u_projectSurface: { value: 0 },
        u_projectGrain: this.projectBackground.texture,
        u_projectGrainReady: this.projectBackground.ready,
        u_projectViewport: this.projectBackground.viewport,
        u_projectGrainOffset: this.projectBackground.offset,
        u_projectGrainTile: this.projectBackground.tile,
        u_projectPixelRatio: this.projectBackground.pixelRatio,
        u_projectGrainOpacity: this.projectBackground.opacity,
        u_projectGrainInk: this.projectBackground.ink,
        u_projectBackgroundColor: this.projectBackground.color,
        u_scrim: { value: 0 },
        u_textMode: { value: textMode ? 1 : 0 },
        u_clip: { value: new THREE.Vector4() },
        u_clipR: { value: 0 },
        u_clipOn: { value: 0 },
        u_arcW: { value: 0 },
        u_arcD: { value: 0 },
        u_arcOuterD: { value: 0 },
        u_arcOuterStart: { value: 0.58 },
        u_arcEdgeBend: { value: 0 },
        u_panelBend: { value: 0 },
        u_panelCenter: { value: 0 },
        u_panelHalfWidth: { value: 0 },
        u_sheetW: { value: 0 },
        u_sheetD: { value: 0 },
        u_sheetT: { value: 1 },
        u_sheetC: { value: 1 },
        u_sheetP: { value: textMode ? 1 : 1 },
        u_sheetV: { value: 0 },
        u_geoD: { value: 0 },
        u_geoC: { value: 1 },
        u_geoA: { value: 0 },
        u_hover: { value: 0 },
        u_hoverPoint: { value: new THREE.Vector2(0.5, 0.5) },
        u_arrowMode: { value: 0 },
        u_controlPad: { value: 0 },
        u_crossMode: { value: 0 },
        u_openMode: { value: 0 },
        u_ctaMode: { value: 0 },
        u_labelMode: { value: 0 },
        u_ring: { value: 0 },
        u_rest: { value: new THREE.Color(0x000000) },
        u_lit: { value: new THREE.Color(0x000000) },
        u_iconC: { value: new THREE.Color(0xffffff) },
        u_pillA: { value: 0 },
        u_pillDisc: { value: new THREE.Vector3() },
        u_lens: { value: new THREE.Vector3() },
        u_lensA: { value: 0 },
        u_markOut: { value: 0 },
        u_markIn: { value: 0 },
        u_ringW: { value: 0.08 },
        u_markW: { value: 0.04 },
        u_dent: { value: 0.1 },
        u_leanA: { value: 0 },
        u_leanW: { value: 0 },
        u_bulgeA: { value: 0 },
        u_bulgeH: { value: 0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: textMode ? THREE.DoubleSide : THREE.FrontSide,
    });
  }

  registerHome(elements) {
    if (!this.webgl || !elements?.length) {
      this.homeElements = elements || [];
      this.layoutHome(true);
      return;
    }
    if (this.homeElements.length === elements.length && this.homeElements.every((el, i) => el === elements[i])) return;
    this.homeElements = elements;
    if (this.homeCards.length === this.featured.length && this.homeCards.every((card, index) => card.project.slug === this.featured[index].slug)) {
      this.homeCards.forEach((card, index) => { card.el = elements[index]; });
      this.layoutHome(true);
      this.refreshHomeText();
      if (this.ready && this.route === 'home' && !this.returningHome) this.playHomeIntro(false);
      return;
    }
    this.clearHomeMeshes();
    this.homeCards = this.featured.map((project, index) => {
      const material = this.makeSurface(this.blank, project);
      material.uniforms.u_dent.value = 0.012;
      this.applyTexture(material, project.asset, project);
      const mesh = new THREE.Mesh(this.quadGeometry, material);
      mesh.renderOrder = 0;
      this.homeGroup.add(mesh);

      const titleMaterial = this.makeSurface(this.blank, project, true);
      const titleMesh = new THREE.Mesh(this.quadGeometry, titleMaterial);
      titleMesh.renderOrder = 3;
      this.homeGroup.add(titleMesh);

      const arrowMaterial = this.makeSurface(this.arrowTexture, { width: 128, height: 128 }, true);
      arrowMaterial.uniforms.u_arrowMode.value = 1;
      arrowMaterial.uniforms.u_corner.value = 0.5;
      const arrowMesh = new THREE.Mesh(this.quadGeometry, arrowMaterial);
      arrowMesh.renderOrder = 3;
      this.homeGroup.add(arrowMesh);

      return {
        project,
        index,
        el: elements[index],
        mesh,
        titleMesh,
        arrowMesh,
        titleDims: { width: 50, height: 20 },
        ox: 0,
        oz: 0,
        titleAlpha: 0,
        arrowOut: 0,
        arrowIn: 0,
      };
    });
    this.layoutHome(true);
    this.refreshHomeText();
    if (this.ready && this.route === 'home') this.playHomeIntro(false);
  }

  clearHomeMeshes() {
    for (const card of this.homeCards) {
      for (const mesh of [card.mesh, card.titleMesh, card.arrowMesh]) {
        gsap.killTweensOf(mesh.material.uniforms.u_alpha);
        this.homeGroup.remove(mesh);
        mesh.material.dispose();
      }
      card.titleMesh.material.uniforms.u_texture.value?.dispose?.();
    }
    this.homeCards = [];
  }

  refreshHomeText() {
    if (!this.webgl || !this.homeCards.length) return;
    const root = this.root;
    for (const card of this.homeCards) {
      const old = card.titleMesh.material.uniforms.u_texture.value;
      const { texture, width, height } = trackedText(card.project.title, (this.desktop ? 1.8 : 1.6) * root);
      card.titleMesh.material.uniforms.u_texture.value = texture;
      card.titleDims = { width, height };
      if (old && old !== this.blank) old.dispose();
    }
  }

  layoutHome(immediate = false) {
    if (!this.featured?.length) return;
    const previousSlug = this.getNearestHomeSlug() || this.activeHomeSlug || this.featured[1]?.slug;
    this.homeBase = [];
    let cursor = 0;
    // Keep every project on the same horizontal track, including touch layouts.
    const mobile = this.vw < 650;
    const tablet = !mobile && this.vw < 1024;
    const width = this.vw * (mobile ? 0.778 : tablet ? 0.767 : 0.583);
    // Mobile only: the cards are 15% taller (width, gap and centring untouched).
    // Both height terms scale, so the 70vh guard still limits the tallest card.
    const height = Math.min(this.vh * 0.7, width / (mobile ? 0.89 : tablet ? 1.73 : 1.67)) * (mobile ? 1.15 : 1);
    // Inter-panel spacing: 3.0375 / 1.78875 / 1.0875vw reduced by 35%.
    // Panel dimensions and centring stay unchanged; the loop period follows
    // this spacing automatically.
    const gap = this.vw * (
      mobile ? 0.01974375 :
      tablet ? 0.011626875 :
      0.00706875
    );
    this.homeMetrics = this.featured.map(() => {
      const metric = { width, height, center: cursor + width / 2 };
      cursor += width + gap;
      this.homeBase.push(metric.center);
      return metric;
    });
    // The loop period includes the trailing gap, matching the original run.
    this.homeOffset.period = Math.max(1, cursor);
    this.homeNavigation.configure(this.homeBase, this.homeOffset.period);
    const selected = Math.max(0, this.featured.findIndex((project) => project.slug === previousSlug));
    if (!this.homeLayoutReady || immediate) {
      const position = this.homePositionForIndex(selected);
      this.homeOffset.current = this.homeOffset.target = position;
      this.homeNavigation.reset(position);
      this.homeVelocity = 0;
      this.homeRawVelocity = 0;
    }
    this.homeLayoutReady = true;
    this.refreshHomeText();
    this.updateHome(0, true);
  }

  homePositionForIndex(index) {
    const center = this.homeBase[index] || 0;
    return center;
  }

  getNearestHomeSlug() {
    if (!this.homeBase.length || !this.featured?.length) return null;
    let best = 0;
    let distance = Infinity;
    this.homeBase.forEach((center, index) => {
      const d = Math.abs(centeredWrap(center - this.homeOffset.current, this.homeOffset.period));
      if (d < distance) {
        distance = d;
        best = index;
      }
    });
    return this.featured[best]?.slug || null;
  }

  sheetParams() {
    const velocity = Math.min(1, Math.abs(this.homeVelocity));
    if (this.desktop) {
      // Two readings of one velocity, no second animation state.
      //
      // D/C/S/A feed the FRAGMENT stage only. They keep the source's resting
      // depth (D = W * 0.2 * (1 + 1.1 * velocity)) because the depth haze and
      // surface light read it — shadeAt returns 0 below u_sheetD 0.001, so
      // zeroing it while idle stripped the panels' muted treatment.
      //
      // gD/gC/gA feed the VERTEX stage only and keep this gallery's own resting
      // pose: the drawn sheet joins the surface as motion starts, so panels rest
      // upright. Above velocity 0.05 both sets agree, leaving the scrolling and
      // velocity-driven bending exactly as it was.
      const motion = Math.min(1, velocity / 0.05);
      return {
        W: this.frustumW,
        D: this.frustumW * 0.2 * (1 + 1.1 * velocity),
        T: 1.15,
        C: 1,
        S: 1,
        A: -0.12 * this.frustumW,
        V: velocity,
        gD: this.frustumW * (0.2 * motion + 0.22 * velocity),
        gC: motion,
        gA: -0.12 * this.frustumW * motion,
      };
    }
    return { W: this.frustumW, D: this.frustumW * 0.18, T: 1, C: 0, S: 0.6, A: 0, V: velocity };
  }

  rectToPose(rect) {
    const x = rect.x ?? rect.left;
    const y = rect.y ?? rect.top;
    return {
      pos: new THREE.Vector3(
        -this.frustumW + ((x + rect.width / 2) / this.vw) * this.frustumW * 2,
        this.frustumH - ((y + rect.height / 2) / this.vh) * this.frustumH * 2,
        0,
      ),
      scale: new THREE.Vector3((rect.width / this.vw) * this.frustumW * 2, (rect.height / this.vh) * this.frustumH * 2, 1),
    };
  }

  applyPose(mesh, rect, sheet = null, bulge = 0, outerArc = null) {
    const pose = this.rectToPose(rect);
    mesh.position.copy(pose.pos);
    mesh.scale.copy(pose.scale);
    const u = mesh.material.uniforms;
    u.u_res.value.set(pose.scale.x, pose.scale.y);
    if (sheet) {
      u.u_arcW.value = sheet.W;
      u.u_arcD.value = sheet.arc || 0;
      u.u_sheetW.value = sheet.W;
      u.u_sheetD.value = sheet.D;
      u.u_sheetT.value = sheet.T;
      u.u_sheetC.value = sheet.C;
      u.u_sheetV.value = sheet.V;
      u.u_shadeS.value = sheet.S;
      u.u_leanA.value = sheet.A;
      u.u_leanW.value = sheet.W;
      // Drawn pose; callers without a separate geometry set keep one surface.
      u.u_geoD.value = sheet.gD ?? sheet.D;
      u.u_geoC.value = sheet.gC ?? sheet.C;
      u.u_geoA.value = sheet.gA ?? sheet.A;
    } else {
      u.u_arcW.value = 0;
      u.u_arcD.value = 0;
      u.u_sheetW.value = 0;
      u.u_sheetD.value = 0;
      u.u_sheetV.value = 0;
      u.u_leanA.value = 0;
      u.u_leanW.value = 0;
      u.u_geoD.value = 0;
      u.u_geoC.value = 0;
      u.u_geoA.value = 0;
    }
    if (outerArc) {
      u.u_arcW.value = this.frustumW;
      u.u_arcD.value = outerArc.depth;
      u.u_arcOuterD.value = outerArc.depth;
      u.u_arcOuterStart.value = outerArc.start;
      u.u_arcEdgeBend.value = outerArc.bend;
    } else {
      u.u_arcOuterD.value = 0;
      u.u_arcEdgeBend.value = 0;
    }
    u.u_panelBend.value = 0;
    u.u_bulgeA.value = bulge;
    u.u_bulgeH.value = this.frustumH;
    return pose;
  }

  // Give the signed-distance edge room to antialias beyond the visible circle.
  // The layout and shader resolution remain those of the original hit target.
  padCircularControl(mesh, rect) {
    const pad = 2 / Math.max(1, this.renderer.getPixelRatio());
    mesh.material.uniforms.u_controlPad.value = pad / Math.max(1, rect.height);
    mesh.scale.x *= (rect.width + 2 * pad) / rect.width;
    mesh.scale.y *= (rect.height + 2 * pad) / rect.height;
  }

  homeOuterArc() {
    return { depth: this.frustumW * 0.35, start: 0.58, bend: 0 };
  }

  updateHome(dt, force = false) {
    if (!this.homeMetrics?.length || (!force && this.route !== 'home' && !this.returningHome)) return;
    const previous = this.homeOffset.current;
    const frameDt = dt || 1 / 60;
    // The navigation spring only moves the existing target. Panel transforms,
    // depth, scale, hover and intro animations below are unchanged.
    this.homeOffset.target = this.homeNavigation.update(frameDt, { reducedMotion: this.reducedMotion });
    if (!this.reducedMotion) {
      // A held pointer feels attached; released motion keeps the gallery's
      // original heavy 6.3 damping so momentum and final snap stay cinematic.
      const dampingRate = this.drag?.moved ? 24 : 6.3;
      const damping = 1 - Math.exp(-dampingRate * frameDt);
      this.homeOffset.current += (this.homeOffset.target - this.homeOffset.current) * damping;
      const restingError = Math.abs(this.homeOffset.target - this.homeOffset.current);
      this.homeOffset.current = (!this.homeNavigation.busy && restingError < 0.5) || restingError < 0.02
        ? this.homeOffset.target
        : Math.round(this.homeOffset.current * 100) / 100;
    } else this.homeOffset.current = this.homeOffset.target;

    // Feed the existing velocity-driven shader treatment from actual rendered
    // motion. The scale matches the old target-lead signal at the original 6.3
    // damping rate, but now stays truthful while dragging or coasting.
    const renderedSpeed = (this.homeOffset.current - previous) / Math.max(frameDt, 1 / 240);
    // Rebase current, target and spring together by whole loop periods. Wrapped
    // rendering makes this invisible; doing it after the velocity sample avoids
    // a fake speed spike. Active drags stay continuous for pointer velocity.
    const period = this.homeOffset.period;
    if (period > 0 && !this.drag) {
      const cycles = Math.round(this.homeOffset.current / period);
      if (cycles) {
        const delta = cycles * period;
        this.homeOffset.current -= delta;
        this.homeOffset.target -= delta;
        this.homeNavigation.rebase(delta);
      }
    }
    const rawSignal = this.reducedMotion ? 0 : Math.tanh(renderedSpeed / ((this.desktop ? 550 : 500) * 6.3));
    this.homeRawVelocity += (rawSignal - this.homeRawVelocity) * (1 - Math.exp(-18 * frameDt));
    if (!this.homeNavigation.busy && Math.abs(this.homeOffset.target - this.homeOffset.current) < 0.02 && Math.abs(rawSignal) < 0.001) {
      this.homeRawVelocity = 0;
    }
    const rawVelocity = this.homeRawVelocity;
    this.homeVelocity = this.desktop ? rawVelocity * Math.abs(rawVelocity) : rawVelocity;
    const sheet = this.sheetParams();
    const cardSheet = this.desktop ? { ...sheet, arc: this.frustumW * 0.35 } : null;
    const outerArc = this.homeOuterArc();
    const bulge = this.desktop || this.reducedMotion ? 0 : rawVelocity * Math.abs(rawVelocity) * 0.22 * this.frustumH * 1.3;
    const axisCenter = this.vw / 2;

    this.homeCards.forEach((card, index) => {
      const metric = this.homeMetrics[index];
      const relative = centeredWrap(metric.center - this.homeOffset.current, this.homeOffset.period);
      // Scale continuously with distance from the viewport center, not the
      // discrete active index; keep narrow-screen previews within view.
      const distance = clamp(Math.abs(relative) / (metric.width + this.vw * 0.029));
      const smoothDistance = distance * distance * (3 - 2 * distance);
      const scaleAmount = this.vw >= 1024 ? 0.12 : this.vw >= 650 ? 0.10 : 0.08;
      const scale = 1 - scaleAmount * smoothDistance;
      const width = metric.width * scale;
      const height = metric.height * scale;
      // Compensate part of the space opened by scaling so the visible gap
      // stays close to the desktop reference as neighboring cards recede.
      const placement = this.vw >= 1024 ? relative - Math.sign(relative) * (metric.width - width) * 0.22 : relative;
      const rect = {
        x: axisCenter + placement - width / 2,
        y: this.vh / 2 - height / 2,
        width,
        height,
      };
      const parked = false;
      this.homeRects.set(card.project.slug, rect);
      if (card.el && !parked) {
        // Perspective pulls the shrunken outer panels toward the viewport.
        // Extend their narrow-screen hit areas so visible previews remain clickable.
        const hitInset = this.vw < 1024 ? metric.width - width : 0;
        const hitLeft = relative > 0 ? hitInset : 0;
        Object.assign(card.el.style, {
          width: `${rect.width + hitInset}px`,
          height: `${rect.height}px`,
          transform: `translate3d(${rect.x - hitLeft}px, ${rect.y}px, 0)`,
        });
      }
      if (!this.webgl) return;
      const pose = this.applyPose(card.mesh, rect, cardSheet, bulge, outerArc);
      const panelBend = this.frustumH * 0.1 * smoothDistance;
      const setPanelBend = (mesh) => {
        const u = mesh.material.uniforms;
        u.u_panelBend.value = panelBend;
        u.u_panelCenter.value = pose.pos.x;
        u.u_panelHalfWidth.value = pose.scale.x / 2;
      };
      setPanelBend(card.mesh);
      pose.pos.x += card.ox;
      pose.pos.z += card.oz;
      card.mesh.position.copy(pose.pos);
      const corner = 0.4 * this.root / rect.height;
      card.mesh.material.uniforms.u_corner.value = corner;
      if (card.boot) {
        const progress = expoInOut(card.boot.value);
        const fromPose = this.rectToPose(card.boot.from);
        card.mesh.position.lerpVectors(fromPose.pos, pose.pos, progress);
        card.mesh.scale.lerpVectors(fromPose.scale, pose.scale, progress);
        card.mesh.material.uniforms.u_res.value.copy(card.mesh.scale);
        card.mesh.material.uniforms.u_white.value = 1 - Math.min(1, progress * 1.08);
        card.mesh.material.uniforms.u_shade.value = progress;
        card.mesh.material.uniforms.u_sheetP.value = progress;
        card.mesh.material.uniforms.u_corner.value = 0.5 + (corner - 0.5) * progress;
      }
      card.mesh.material.uniforms.u_scrim.value = card.titleAlpha;

      const insetX = (this.desktop ? 2 : 1) * this.root;
      const bottom = this.root;
      const titleRect = {
        x: rect.x + insetX,
        y: rect.y + rect.height - bottom - card.titleDims.height,
        width: Math.min(card.titleDims.width, Math.max(1, rect.width - 2 * insetX - 3 * this.root)),
        height: card.titleDims.height,
      };
      this.applyPose(card.titleMesh, titleRect, cardSheet, bulge, outerArc);
      setPanelBend(card.titleMesh);
      card.titleMesh.material.uniforms.u_alpha.value = card.titleAlpha;

      const arrowSize = 2.5 * this.root;
      const arrowRect = {
        x: rect.x + rect.width - insetX - arrowSize,
        y: rect.y + rect.height - bottom - arrowSize,
        width: arrowSize,
        height: arrowSize,
      };
      this.applyPose(card.arrowMesh, arrowRect, cardSheet, bulge, outerArc);
      setPanelBend(card.arrowMesh);
      this.padCircularControl(card.arrowMesh, arrowRect);
      card.arrowMesh.material.uniforms.u_alpha.value = card.titleAlpha;
      card.arrowMesh.material.uniforms.u_markOut.value = card.arrowOut;
      card.arrowMesh.material.uniforms.u_markIn.value = card.arrowIn;
      card.arrowMesh.material.uniforms.u_ringW.value = 2 / arrowSize;
      card.arrowMesh.material.uniforms.u_markW.value = 1 / arrowSize;

      const video = this.videoCache.get(card.project.video);
      if (video) this.playVideo(video, this.route === 'home' && this.isRectVisible(rect, 100));
    });
    this.activeHomeSlug = this.getNearestHomeSlug();
  }

  playHomeIntro(returning = false) {
    if (!this.webgl || !this.homeCards.length || (this.route !== 'home' && !this.returningHome)) return;
    const ordered = [...this.homeCards].sort((a, b) => {
      const ar = this.homeRects.get(a.project.slug);
      const br = this.homeRects.get(b.project.slug);
      return Math.abs((ar?.x || 0) + (ar?.width || 0) / 2 - this.vw / 2) - Math.abs((br?.x || 0) + (br?.width || 0) / 2 - this.vw / 2);
    });
    const barElements = [...document.querySelectorAll('.loader-bar')];
    const fallbackBars = [0, 1, 2].map((index) => ({
      x: this.vw / 2 - 79 + index * 58,
      y: this.vh / 2 - 2.5,
      width: 50,
      height: 5,
    }));
    const barRects = [0, 1, 2].map((index) => {
      const rect = barElements[index]?.getBoundingClientRect();
      return rect?.width ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : fallbackBars[index];
    });
    const bootCards = !returning && !this.reducedMotion
      ? ordered.slice(0, 3).sort((a, b) => {
          const ar = this.homeRects.get(a.project.slug);
          const br = this.homeRects.get(b.project.slug);
          return (ar?.x || 0) - (br?.x || 0);
        })
      : [];
    let riseOrder = 0;

    ordered.forEach((card, order) => {
      gsap.killTweensOf(card);
      gsap.killTweensOf(card.mesh.material.uniforms.u_alpha);
      if (card.boot) gsap.killTweensOf(card.boot);
      card.boot = null;
      card.titleAlpha = 0;
      card.ox = 0;
      card.oz = 0;
      const uniforms = card.mesh.material.uniforms;
      uniforms.u_white.value = 0;
      uniforms.u_shade.value = 1;
      uniforms.u_sheetP.value = 1;

      if (this.reducedMotion) {
        card.titleAlpha = 1;
        uniforms.u_alpha.value = 1;
        return;
      }

      const bootIndex = bootCards.indexOf(card);
      if (bootIndex >= 0) {
        uniforms.u_alpha.value = 1;
        uniforms.u_white.value = 1;
        uniforms.u_shade.value = 0;
        uniforms.u_sheetP.value = 0;
        card.boot = { value: 0, from: barRects[bootIndex] };
        gsap.to(card.boot, {
          value: 1,
          duration: 1.5,
          delay: bootIndex * 0.05,
          ease: 'none',
          onComplete: () => {
            uniforms.u_white.value = 0;
            uniforms.u_shade.value = 1;
            uniforms.u_sheetP.value = 1;
            card.boot = null;
          },
        });
      } else {
        uniforms.u_alpha.value = 0;
        if (returning) {
          card.oz = this.frustumH * 0.7;
          gsap.to(card, { oz: 0, duration: 1.25, delay: 0.05 + order * 0.05, ease: 'expo.out' });
          gsap.to(uniforms.u_alpha, { value: 1, duration: 0.7, delay: 0.05 + order * 0.05, ease: 'power1.out' });
        } else {
          const rect = this.homeRects.get(card.project.slug);
          const direction = Math.sign((rect?.x || 0) + (rect?.width || 0) / 2 - this.vw / 2) || 1;
          card.ox = direction * this.frustumW * 0.5;
          const delay = 1.15 + riseOrder++ * 0.06;
          gsap.to(card, { ox: 0, duration: 1.25, delay, ease: 'expo.out' });
          gsap.to(uniforms.u_alpha, { value: 1, duration: 0.625, delay, ease: 'power1.out' });
        }
      }
      gsap.to(card, {
        titleAlpha: 1,
        duration: 1.25,
        delay: (returning ? 0.125 : 0.75) + order * 0.06,
        ease: returning ? 'power1.out' : 'expo.out',
      });
    });
  }

  hoverCard(slug, hover) {
    const card = this.homeCards.find((item) => item.project.slug === slug);
    if (!card || this.reducedMotion || !this.finePointer || (hover && this.drag?.moved)) return;
    gsap.to(card.mesh.material.uniforms.u_hover, { value: hover ? 1 : 0, duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
    gsap.to(card, {
      arrowOut: hover ? 1 : 0,
      duration: hover ? 0.75 : 1,
      ease: 'expo.out',
      overwrite: 'auto',
    });
    gsap.to(card, {
      arrowIn: hover ? 1 : 0,
      duration: hover ? 1 : 0.75,
      ease: 'expo.out',
      overwrite: 'auto',
    });
  }

  moveCardHover(slug, event) {
    if (!this.finePointer || this.reducedMotion || event.pointerType !== 'mouse' || this.drag?.moved) return;
    const card = this.homeCards.find((item) => item.project.slug === slug);
    if (!card) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = card.mesh.material.uniforms.u_hoverPoint.value;
    gsap.to(point, {
      x: clamp((event.clientX - rect.left) / Math.max(1, rect.width)),
      y: 1 - clamp((event.clientY - rect.top) / Math.max(1, rect.height)),
      duration: 0.25, ease: 'power2.out', overwrite: true,
    });
  }

  centerOn(slug, immediate = true) {
    const index = this.featured.findIndex((project) => project.slug === slug);
    if (index < 0 || !this.homeBase.length) return;
    const position = this.homePositionForIndex(index);
    this.homeNavigation.reset(position);
    this.homeOffset.target = position;
    if (immediate) this.homeOffset.current = position;
    this.homeVelocity = 0;
    this.homeRawVelocity = 0;
    this.activeHomeSlug = slug;
    this.updateHome(0, true);
  }

  getCardRect(slug) {
    return this.homeRects.get(slug) || this.getCenteredCardRect(slug);
  }

  getCenteredCardRect(slug) {
    const index = this.featured.findIndex((project) => project.slug === slug);
    if (index < 0 || !this.homeMetrics?.length) return null;
    const metric = this.homeMetrics[index];
    return { x: this.vw / 2 - metric.width / 2, y: this.vh / 2 - metric.height / 2, width: metric.width, height: metric.height };
  }

  setRoute(route, project = null) {
    const continuingReturn = route === 'home' && this.returningHome;
    const previousRoute = this.route;
    if (route !== 'home') this.endHomeDrag(null, { fling: false });
    this.route = route;
    if (route === 'project') this.returningHome = false;
    if (this.webgl) {
      this.homeGroup.visible = route === 'home' || this.returningHome;
      this.projectGroup.visible = route === 'project';
      this.sky.visible = route !== 'home' && route !== 'project';
      this.postMaterial.blending = route === 'home' || route === 'project' ? THREE.NoBlending : THREE.NormalBlending;
    }
    document.documentElement.classList.toggle('grabbable', route === 'home' || route === 'project');
    if (route === 'home') {
      if (!this.desktop && previousRoute === 'full') this.centerOn(this.featured[0]?.slug, true);
      if (project?.slug) this.centerOn(project.slug, true);
      this.updateHome(0, true);
      if (this.ready && !continuingReturn) this.playHomeIntro(true);
      this.returningHome = false;
    }
    if (route === 'project' && project) this.project = project;
  }

  beginHomeReturn(project) {
    if (!this.webgl || !project) return;
    this.returningHome = true;
    this.centerOn(project.slug, true);
    this.homeGroup.visible = true;
    this.projectGroup.visible = true;
    if (this.ready) this.playHomeIntro(true);
    const selected = this.homeCards.find(card => card.project.slug === project.slug);
    if (selected) {
      gsap.killTweensOf(selected.mesh.material.uniforms.u_alpha);
      selected.mesh.material.uniforms.u_alpha.value = 0;
    }
    this.updateHome(0, true);
  }

  completeHomeReturn(slug) {
    const selected = this.homeCards.find(card => card.project.slug === slug);
    if (selected) selected.mesh.material.uniforms.u_alpha.value = 1;
  }

  setOverlay(type) {
    this.overlay = type;
    if (type) this.endHomeDrag(null, { fling: false });
    gsap.killTweensOf(this.hole);
    const open = Boolean(type);
    if (this.reducedMotion) {
      this.hole.p = open ? 1 : 0;
      this.hole.s = open ? 0 : -0.1;
    } else {
      gsap.to(this.hole, { p: open ? 1 : 0, duration: open ? 0.85 : 0.65, ease: holeFlightEase, overwrite: 'auto' });
      gsap.to(this.hole, { s: open ? 0 : -0.1, duration: open ? 0.3 : 0.25, ease: 'power2.out', overwrite: 'auto' });
    }
  }

  projectRect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      right: r.right,
      bottom: r.bottom,
    };
  }

  readProjectSurfaceRects() {
    const panel = this.projectDom?.panel;
    const main = panel?.closest('main');
    const prevEl = main?.querySelector('.related-previous');
    const nextEl = main?.querySelector('.related-next');
    if (!panel || !prevEl || !nextEl) return null;
    return {
      panel: this.projectRect(panel),
      prev: this.projectRect(prevEl),
      next: this.projectRect(nextEl),
      panelEl: panel,
      prevEl,
      nextEl,
    };
  }

  createProjectSurface(project, role = 'hero') {
    const material = this.makeSurface(this.blank, project);
    this.applyTexture(material, project.asset, project);
    material.uniforms.u_white.value = 1;
    material.uniforms.u_projectSurface.value = 1;
    material.uniforms.u_shade.value = 0;
    material.uniforms.u_sheetP.value = 0;
    material.uniforms.u_alpha.value = role === 'hero' ? 1 : 0.3;
    material.uniforms.u_wash.value.set(0xffffff);
    const mesh = new THREE.Mesh(this.quadGeometry, material);
    mesh.renderOrder = 1;
    this.projectGroup.add(mesh);
    return { project, role, mesh, landed: true, flying: false, disposed: false, flight: null, lift: { value: role === 'hero' ? 1 : 0.3 } };
  }

  hoverProjectSurface(slug, hover) {
    if (!this.finePointer || this.projectScrubParts) return;
    const item = Object.values(this.projectSurfaces || {}).find(surface => surface?.project?.slug === slug && !surface.disposed);
    if (!item || item.role === 'hero') return;
    gsap.to(item.lift, {
      value: hover ? 1 : 0.3,
      duration: this.reducedMotion ? 0 : 0.4,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }

  setupProjectPills() {
    if (!this.webgl || !this.projectDom?.pills) return;
    this.projectPills = this.projectDom.pills.map((el, index) => {
      const round = el.classList.contains('pill-round');
      const material = this.makeSurface(this.blank, { width: 1, height: 1 }, true);
      material.uniforms.u_shade.value = 0;
      material.uniforms.u_sheetP.value = 0;
      material.uniforms.u_clipOn.value = 1;
      if (round) {
        material.uniforms.u_openMode.value = 1;
        material.uniforms.u_ring.value = 1;
        material.uniforms.u_rest.value.set(0x000000);
        material.uniforms.u_iconC.value.set(0xffffff);
      } else {
        material.uniforms.u_ctaMode.value = 1;
        // The pass-through shader expects the CSS channels directly, as on
        // the reference site; hex conversion here would darken #eeeeee.
        material.uniforms.u_rest.value.setRGB(238 / 255, 238 / 255, 238 / 255);
        material.uniforms.u_lit.value.set(0x000000);
      }
      const mesh = new THREE.Mesh(this.quadGeometry, material);
      mesh.renderOrder = 3;
      this.projectGroup.add(mesh);
      const labelEl = el.querySelector('.pill-label');
      let labelMesh = null;
      if (labelEl) {
        const labelMaterial = this.makeSurface(this.blank, { width: 1, height: 1 }, true);
        labelMaterial.uniforms.u_labelMode.value = 1;
        labelMaterial.uniforms.u_shade.value = 0;
        labelMaterial.uniforms.u_sheetP.value = 0;
        labelMaterial.uniforms.u_clipOn.value = 1;
        labelMesh = new THREE.Mesh(this.quadGeometry, labelMaterial);
        labelMesh.renderOrder = 3.1;
        this.projectGroup.add(labelMesh);
      }
      const item = {
        el,
        labelEl,
        mesh,
        labelMesh,
        index,
        round,
        live: el.tagName === 'A',
        hover: 0,
        swapOut: 0,
        swapIn: 0,
        ptr: new THREE.Vector2(),
        lens: new THREE.Vector2(),
        padX: 0,
        padY: 0,
        rasterW: 0,
        rasterH: 0,
      };
      if (labelEl) this.rasterizeProjectPillLabel(item);
      return item;
    });
    this.syncProjectPills(0);
    document.fonts?.ready.then(() => {
      for (const item of this.projectPills) if (item.labelEl?.isConnected) this.rasterizeProjectPillLabel(item);
    });
  }

  rasterizeProjectPillLabel(item) {
    const el = item?.labelEl;
    if (!el?.isConnected || !item.labelMesh) return false;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const style = getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize) || 16;
    const padX = Math.ceil(fontSize * 0.35);
    const padY = Math.ceil(fontSize * 0.25);
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((rect.width + padX * 2) * scale);
    canvas.height = Math.ceil((rect.height + padY * 2) * scale);
    const context = canvas.getContext('2d');
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if ('letterSpacing' in context) context.letterSpacing = style.letterSpacing === 'normal' ? 'normal' : style.letterSpacing;
    if ('textRendering' in context) context.textRendering = 'optimizeLegibility';
    context.fillStyle = style.color;
    context.textBaseline = 'alphabetic';
    context.textAlign = 'left';
    const metrics = context.measureText('Hg');
    const ascent = metrics.fontBoundingBoxAscent ?? fontSize * 0.8;
    const descent = metrics.fontBoundingBoxDescent ?? fontSize * 0.25;
    const baseline = padY + rect.height / 2 + (ascent - descent) / 2;
    let text = el.textContent.trim();
    if (style.textTransform === 'uppercase') text = text.toUpperCase();
    else if (style.textTransform === 'lowercase') text = text.toLowerCase();
    context.fillText(text, padX, baseline);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    const uniforms = item.labelMesh.material.uniforms;
    const previous = uniforms.u_texture.value;
    uniforms.u_texture.value = texture;
    if (previous && previous !== this.blank) previous.dispose();
    item.padX = padX;
    item.padY = padY;
    item.rasterW = rect.width;
    item.rasterH = rect.height;
    return true;
  }

  syncProjectPills(dt = 0) {
    if (!this.projectPills.length || !this.projectDom?.panel) return;
    const panel = this.projectDom.panel;
    const panelRect = panel.getBoundingClientRect();
    const dpr = this.renderer.getPixelRatio();
    const clipR = (parseFloat(getComputedStyle(panel).borderRadius) || 0) * dpr;
    const opacity = (node) => {
      if (!node) return 1;
      const value = parseFloat(getComputedStyle(node).opacity);
      return Number.isFinite(value) ? value : 1;
    };
    const alpha = opacity(this.projectDom.content) * opacity(this.projectDom.copy);
    const follow = ease(dt, 11);
    for (const item of this.projectPills) {
      if (!item.el.isConnected) {
        item.mesh.visible = false;
        if (item.labelMesh) item.labelMesh.visible = false;
        continue;
      }
      const rect = item.el.getBoundingClientRect();
      this.applyPose(item.mesh, rect, null, 0);
      if (item.round) this.padCircularControl(item.mesh, rect);
      const uniforms = item.mesh.material.uniforms;
      const corner = (parseFloat(getComputedStyle(item.el).borderRadius) || 0) / Math.max(1, rect.height);
      uniforms.u_corner.value = corner;
      uniforms.u_alpha.value = alpha;
      uniforms.u_pillA.value = item.hover;
      uniforms.u_markOut.value = item.swapOut;
      uniforms.u_markIn.value = item.swapIn;
      uniforms.u_ringW.value = 2 / Math.max(1, rect.height);
      uniforms.u_markW.value = 2 / Math.max(1, rect.height);
      const scale = item.mesh.scale;
      const active = item.hover > 0.0001 && !item.round;
      const targetX = active ? ((item.ptr.x - (rect.left + rect.width * 0.5)) / Math.max(1, rect.width)) * scale.x * 0.33 : 0;
      const targetY = active ? -((item.ptr.y - (rect.top + rect.height * 0.5)) / Math.max(1, rect.height)) * scale.y * 0.33 : 0;
      item.lens.x += (targetX - item.lens.x) * follow;
      item.lens.y += (targetY - item.lens.y) * follow;
      uniforms.u_lens.value.set(
        item.mesh.position.x + item.lens.x,
        item.mesh.position.y + item.lens.y,
        item.round ? 0 : Math.max(scale.x, scale.y) * 0.5,
      );
      uniforms.u_lensA.value = item.round ? 0 : 0.33;
      const box = {
        x: rect.left * dpr,
        y: (this.vh - rect.bottom) * dpr,
        w: rect.width * dpr,
        h: rect.height * dpr,
      };
      const offsetX = (item.lens.x / (scale.x || 1)) * box.w;
      const offsetY = (item.lens.y / (scale.y || 1)) * box.h;
      const radiusCorner = Math.min(corner * box.h, Math.min(box.w, box.h) * 0.5);
      const radiusBase = Math.hypot(box.w * 0.5 - radiusCorner, box.h * 0.5 - radiusCorner) + radiusCorner;
      const lensExtra = item.round ? 0 : 0.33 * 0.3 * Math.max(box.w, box.h) * 0.5;
      const disc = new THREE.Vector3(
        box.x + box.w * 0.5 + offsetX,
        box.y + box.h * 0.5 + offsetY,
        radiusBase + Math.hypot(offsetX, offsetY) + lensExtra,
      );
      uniforms.u_pillDisc.value.copy(disc);
      uniforms.u_clip.value.set(panelRect.left * dpr, (this.vh - panelRect.bottom) * dpr, panelRect.width * dpr, panelRect.height * dpr);
      uniforms.u_clipR.value = clipR;
      item.mesh.visible = this.route === 'project' && alpha > 0.001 && this.isRectVisible(rect, 100);
      if (!item.labelMesh || !item.labelEl) continue;
      const labelRect = item.labelEl.getBoundingClientRect();
      if (Math.abs(labelRect.width - item.rasterW) > 0.5 || Math.abs(labelRect.height - item.rasterH) > 0.5) {
        this.rasterizeProjectPillLabel(item);
      }
      const expanded = {
        x: labelRect.left - item.padX,
        y: labelRect.top - item.padY,
        width: labelRect.width + item.padX * 2,
        height: labelRect.height + item.padY * 2,
      };
      this.applyPose(item.labelMesh, expanded, null, 0);
      const label = item.labelMesh.material.uniforms;
      label.u_alpha.value = alpha;
      label.u_pillA.value = item.hover;
      label.u_pillDisc.value.copy(disc);
      label.u_lens.value.copy(uniforms.u_lens.value);
      label.u_lensA.value = item.round ? 0 : 0.33 * 1.6;
      label.u_clip.value.copy(uniforms.u_clip.value);
      label.u_clipR.value = clipR;
      item.labelMesh.visible = item.mesh.visible && this.isRectVisible(expanded, 100);
    }
  }

  hoverProjectPill(index, hover, event = null) {
    const item = this.projectPills[index];
    if (!item?.live || !this.finePointer) return;
    if (event) item.ptr.set(event.clientX, event.clientY);
    gsap.to(item, {
      hover: hover ? 1 : 0,
      duration: this.reducedMotion ? 0 : hover ? 0.7 : 0.5,
      ease: 'expo.out',
      overwrite: 'auto',
    });
    if (!item.round) return;
    gsap.to(item, {
      swapOut: hover ? 1 : 0,
      duration: this.reducedMotion ? 0 : hover ? 0.75 : 1,
      ease: 'expo.out',
      overwrite: 'auto',
    });
    gsap.to(item, {
      swapIn: hover ? 1 : 0,
      duration: this.reducedMotion ? 0 : hover ? 1 : 0.75,
      ease: 'expo.out',
      overwrite: 'auto',
    });
  }

  moveProjectPill(index, event) {
    const item = this.projectPills[index];
    if (item?.live && this.finePointer) item.ptr.set(event.clientX, event.clientY);
  }

  cleanupProjectPills() {
    for (const item of this.projectPills) {
      gsap.killTweensOf(item);
      for (const mesh of [item.mesh, item.labelMesh]) {
        if (!mesh) continue;
        this.projectGroup?.remove(mesh);
        const texture = mesh.material.uniforms.u_texture.value;
        mesh.material.dispose();
        if (texture && texture !== this.blank) texture.dispose();
      }
    }
    this.projectPills = [];
  }

  setupProjectClose() {
    if (!this.webgl || !this.projectDom?.panel) return;
    // Mobile media is recreated on project navigation. Recreate the shared-order
    // Close after it so transparent ID sorting cannot leave an older Close below it.
    if (!this.desktop && this.projectClose) this.cleanupProjectClose();
    if (!this.projectClose) {
      const material = this.makeSurface(this.blank, { width: 1, height: 1 }, true);
      material.uniforms.u_crossMode.value = 1;
      material.uniforms.u_ring.value = 1;
      material.uniforms.u_corner.value = 0.5;
      material.uniforms.u_rest.value.set(0x000000);
      material.uniforms.u_iconC.value.set(0xffffff);
      material.uniforms.u_shade.value = 0;
      material.uniforms.u_sheetP.value = 0;
      const mesh = new THREE.Mesh(this.quadGeometry, material);
      mesh.renderOrder = 3;
      this.projectGroup.add(mesh);
      this.projectClose = { mesh, hover: 0, swapOut: 0, swapIn: 0, alpha: 1, el: null };
    }
    // Pills share content order with media; register after the media so the
    // close control remains visible where the mobile portal overlaps it.
    this.projectGroup.remove(this.projectClose.mesh);
    this.projectGroup.add(this.projectClose.mesh);
    gsap.killTweensOf(this.projectClose);
    this.projectClose.hover = 0;
    this.projectClose.swapOut = 0;
    this.projectClose.swapIn = 0;
    this.projectClose.alpha = 1;
    this.projectClose.el = null;
    this.syncProjectClose();
  }

  projectCloseElement() {
    const panel = this.projectDom?.panel;
    const candidates = [
      document.querySelector('.project-close-portal'),
      panel?.querySelector('.project-close-inline'),
    ];
    return candidates.find((el) => {
      if (!el?.isConnected) return false;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }) || null;
  }

  syncProjectClose() {
    const close = this.projectClose;
    if (!close || close.mesh.material.disposed) return;
    const el = this.projectCloseElement();
    if (!el) {
      close.mesh.visible = false;
      return;
    }
    close.el = el;
    const rect = el.getBoundingClientRect();
    this.applyPose(close.mesh, rect, null, 0);
    this.padCircularControl(close.mesh, rect);
    const u = close.mesh.material.uniforms;
    const scrubFade = this.projectScrubParts ? 1 - Math.min(1, Math.abs(this.projectScrub.p)) : 1;
    u.u_alpha.value = close.alpha * scrubFade;
    u.u_pillA.value = close.hover;
    u.u_markOut.value = close.swapOut;
    u.u_markIn.value = close.swapIn;
    u.u_ringW.value = 2 / Math.max(1, rect.height);
    u.u_markW.value = 2 / Math.max(1, rect.height);
    u.u_corner.value = 0.5;
    close.mesh.visible = this.route === 'project' && u.u_alpha.value > 0.001;
  }

  hoverProjectClose(hover) {
    if (!this.projectClose || !this.finePointer) return;
    const close = this.projectClose;
    gsap.to(close, {
      hover: hover ? 1 : 0,
      duration: this.reducedMotion ? 0 : hover ? 0.7 : 0.5,
      ease: 'expo.out',
      overwrite: 'auto',
    });
    gsap.to(close, {
      swapOut: hover ? 1 : 0,
      duration: this.reducedMotion ? 0 : hover ? 0.75 : 1,
      ease: 'expo.out',
      overwrite: 'auto',
    });
    gsap.to(close, {
      swapIn: hover ? 1 : 0,
      duration: this.reducedMotion ? 0 : hover ? 1 : 0.75,
      ease: 'expo.out',
      overwrite: 'auto',
    });
  }

  cleanupProjectClose() {
    if (!this.projectClose) return;
    gsap.killTweensOf(this.projectClose);
    this.projectGroup?.remove(this.projectClose.mesh);
    this.projectClose.mesh.material.dispose();
    this.projectClose = null;
  }

  disposeProjectSurface(item) {
    if (!item || item.disposed) return;
    item.disposed = true;
    if (item.flight) gsap.killTweensOf(item.flight);
    gsap.killTweensOf(item.lift);
    this.projectGroup?.remove(item.mesh);
    item.mesh.material.dispose();
  }

  setProjectSurfaceRest(item, rect, role, el) {
    if (!item || item.disposed || !rect) return;
    const previousRole = item.role;
    if (!item.lift || previousRole !== role) item.lift = { value: role === 'hero' ? 1 : 0.3 };
    item.role = role;
    item.landed = true;
    item.flying = false;
    item.mesh.visible = true;
    item.mesh.quaternion.identity();
    item.mesh.renderOrder = 1;
    this.applyPose(item.mesh, rect, null, 0);
    const u = item.mesh.material.uniforms;
    const radius = el ? parseFloat(getComputedStyle(el).borderRadius) || 0 : (this.desktop ? 2 : 1.5) * this.root;
    u.u_corner.value = radius / Math.max(1, rect.height);
    u.u_white.value = 1;
    u.u_wash.value.set(0xffffff);
    u.u_alpha.value = role === 'hero' ? 1 : item.lift.value;
    u.u_shade.value = 0;
    u.u_sheetP.value = 0;
    u.u_scrim.value = 0;
    u.u_hover.value = 0;
    u.u_bulgeA.value = 0;
  }

  syncProjectSurfaces() {
    const surfaces = this.projectSurfaces;
    if (!surfaces) return;
    const rects = this.readProjectSurfaceRects();
    if (!rects) return;
    this.projectSurfaceRects = rects;
    for (const role of ['hero', 'prev', 'next']) {
      const item = surfaces[role];
      if (!item || item.disposed || !item.landed || item.flying || this.projectScrubParts) continue;
      const key = role === 'hero' ? 'panel' : role;
      this.setProjectSurfaceRest(item, rects[key], role, rects[`${key}El`]);
    }
  }

  flyProjectSurface(item, fromRect, toRect, targetRole, targetEl = null, onComplete = null) {
    if (!item || item.disposed || !fromRect || !toRect) {
      onComplete?.();
      return null;
    }
    if (item.flight) gsap.killTweensOf(item.flight);
    const mesh = item.mesh;
    const u = mesh.material.uniforms;
    const from = {
      left: fromRect.left ?? fromRect.x,
      top: fromRect.top ?? fromRect.y,
      width: fromRect.width,
      height: fromRect.height,
    };
    const to = {
      left: toRect.left ?? toRect.x,
      top: toRect.top ?? toRect.y,
      width: toRect.width,
      height: toRect.height,
    };
    const start = {
      white: u.u_white.value,
      alpha: u.u_alpha.value,
      shade: u.u_shade.value,
      sheetP: u.u_sheetP.value,
      corner: u.u_corner.value,
      quat: mesh.quaternion.clone(),
      pos: mesh.position.clone(),
      scale: mesh.scale.clone(),
    };
    const target = targetRole === 'home'
      ? { white: 0, alpha: 1, shade: 1, sheetP: 1 }
      : { white: 1, alpha: targetRole === 'hero' ? 1 : 0.3, shade: 0, sheetP: 0 };
    const targetRadius = targetRole === 'home'
      ? 0.4 * this.root
      : targetEl ? parseFloat(getComputedStyle(targetEl).borderRadius) || 0 : (this.desktop ? 2 : 1.5) * this.root;
    const sourceCorner = start.corner * Math.max(1, from.height || to.height);
    const identity = new THREE.Quaternion();
    const mix = (a, b, p) => a + (b - a) * p;
    gsap.killTweensOf(item.lift);
    item.lift.value = targetRole === 'related' ? 0.3 : 1;
    item.landed = false;
    item.flying = true;
    item.role = targetRole;
    item.flight = { v: 0 };
    mesh.visible = true;
    mesh.renderOrder = targetRole === 'related' ? 1.5 : 2;
    if (u.u_hover.value > 0) gsap.to(u.u_hover, { value: 0, duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
    if (u.u_scrim.value > 0) gsap.to(u.u_scrim, { value: 0, duration: 0.3, ease: 'power1.out', overwrite: 'auto' });
    gsap.to(item.flight, {
      v: 1,
      duration: this.reducedMotion ? 0 : 1,
      ease: 'none',
      overwrite: true,
      onUpdate: () => {
        if (item.disposed) return;
        const d = holeFlightEase(item.flight.v);
        if (targetRole === 'home') {
          const pose = this.rectToPose(to);
          const sheet = this.desktop ? this.sheetParams() : null;
          mesh.position.lerpVectors(start.pos, pose.pos, d);
          mesh.scale.lerpVectors(start.scale, pose.scale, d);
          mesh.quaternion.slerpQuaternions(start.quat, identity, d);
          const outerArc = this.homeOuterArc();
          u.u_arcOuterD.value = outerArc.depth;
          u.u_arcOuterStart.value = outerArc.start;
          u.u_arcEdgeBend.value = outerArc.bend;
          u.u_panelBend.value = 0;
          if (sheet) {
            u.u_arcW.value = sheet.W;
            u.u_arcD.value = outerArc.depth;
            u.u_sheetW.value = sheet.W;
            u.u_sheetD.value = sheet.D;
            u.u_sheetT.value = sheet.T;
            u.u_sheetC.value = sheet.C;
            u.u_sheetV.value = sheet.V;
            u.u_shadeS.value = sheet.S;
            u.u_leanA.value = sheet.A;
            u.u_leanW.value = sheet.W;
            u.u_geoD.value = sheet.gD ?? sheet.D;
            u.u_geoC.value = sheet.gC ?? sheet.C;
            u.u_geoA.value = sheet.gA ?? sheet.A;
          } else {
            u.u_arcW.value = this.frustumW;
            u.u_arcD.value = outerArc.depth;
            u.u_sheetW.value = 0;
            u.u_sheetD.value = 0;
            u.u_sheetV.value = 0;
            u.u_leanA.value = 0;
            u.u_leanW.value = 0;
            u.u_geoD.value = 0;
            u.u_geoC.value = 0;
            u.u_geoA.value = 0;
          }
        } else {
          const rect = {
            x: mix(from.left, to.left, d),
            y: mix(from.top, to.top, d),
            width: mix(from.width, to.width, d),
            height: mix(from.height, to.height, d),
          };
          const pose = this.rectToPose(rect);
          mesh.position.copy(pose.pos);
          mesh.scale.copy(pose.scale);
          mesh.quaternion.slerpQuaternions(start.quat, identity, d);
        }
        u.u_res.value.set(mesh.scale.x, mesh.scale.y);
        u.u_white.value = mix(start.white, target.white, Math.min(1, d * 1.08));
        u.u_alpha.value = mix(start.alpha, target.alpha, d);
        u.u_shade.value = mix(start.shade, target.shade, d);
        u.u_sheetP.value = mix(start.sheetP, target.sheetP, d);
        const height = Math.max(1, mix(from.height || to.height, to.height, d));
        u.u_corner.value = mix(sourceCorner, targetRadius, d) / height;
      },
      onComplete: () => {
        item.flying = false;
        if (targetRole === 'home') {
          item.landed = false;
          mesh.visible = false;
        } else {
          const key = targetRole === 'hero' ? 'panel' : targetRole === 'related' ? item.slot : targetRole;
          const rects = this.readProjectSurfaceRects();
          const slot = key === 'prev' || key === 'next' ? key : 'panel';
          this.setProjectSurfaceRest(item, rects?.[slot] || toRect, targetRole === 'related' ? 'related' : targetRole, rects?.[`${slot}El`] || targetEl);
        }
        onComplete?.();
      },
    });
    return item.flight;
  }

  retireProjectSurface(item) {
    if (!item || item.disposed) return;
    if (item.flight) gsap.killTweensOf(item.flight);
    item.landed = false;
    item.flying = true;
    item.flight = { v: 0 };
    const startX = item.mesh.position.x;
    gsap.to(item.flight, {
      v: 1,
      duration: this.reducedMotion ? 0 : 1,
      ease: 'none',
      onUpdate: () => {
        if (!item.disposed) item.mesh.position.x = startX * (1 + holeFlightEase(item.flight.v));
      },
      onComplete: () => this.disposeProjectSurface(item),
    });
  }

  enterProjectSurface(item, rect, el) {
    this.setProjectSurfaceRest(item, rect, 'related', el);
    item.landed = false;
    item.flying = true;
    item.flight = { v: 0 };
    const baseX = item.mesh.position.x;
    item.mesh.position.x = baseX * 2;
    gsap.to(item.flight, {
      v: 1,
      duration: this.reducedMotion ? 0 : 1,
      ease: 'none',
      onUpdate: () => {
        if (!item.disposed) item.mesh.position.x = baseX * (2 - holeFlightEase(item.flight.v));
      },
      onComplete: () => {
        item.flying = false;
        item.landed = true;
      },
    });
  }

  setupProjectSurfaces(project, transitionFrom = null) {
    if (!this.webgl) return;
    const rects = this.readProjectSurfaceRects();
    if (!rects) return;
    const old = this.projectSurfaces;
    const oldRects = this.projectSurfaceRects;
    const direction = transitionFrom?.direction;
    const index = this.featured.findIndex(item => item.slug === project.slug);
    const previous = this.featured[(index - 1 + this.featured.length) % this.featured.length];
    const next = this.featured[(index + 1) % this.featured.length];

    if (old && direction && oldRects) {
      const incoming = direction === 'next' ? old.next : old.prev;
      if (incoming && !incoming.disposed && incoming.project.slug === project.slug) {
        const outgoing = old.hero;
        const retiring = direction === 'next' ? old.prev : old.next;
        const newOther = direction === 'next'
          ? this.createProjectSurface(next, 'next')
          : this.createProjectSurface(previous, 'prev');
        incoming.slot = null;
        outgoing.slot = direction === 'next' ? 'prev' : 'next';
        newOther.slot = direction === 'next' ? 'next' : 'prev';
        this.projectSurfaces = direction === 'next'
          ? { hero: incoming, prev: outgoing, next: newOther }
          : { hero: incoming, prev: newOther, next: outgoing };
        this.projectSurfaceRects = rects;
        this.flyProjectSurface(incoming, oldRects[direction === 'next' ? 'next' : 'prev'], rects.panel, 'hero', rects.panelEl);
        this.flyProjectSurface(outgoing, oldRects.panel, rects[outgoing.slot], 'related', rects[`${outgoing.slot}El`]);
        this.retireProjectSurface(retiring);
        this.enterProjectSurface(newOther, rects[newOther.slot], rects[`${newOther.slot}El`]);
        return;
      }
    }

    if (old) for (const role of ['hero', 'prev', 'next']) this.disposeProjectSurface(old[role]);
    const hero = this.createProjectSurface(project, 'hero');
    const prevSurface = this.createProjectSurface(previous, 'prev');
    const nextSurface = this.createProjectSurface(next, 'next');
    prevSurface.slot = 'prev';
    nextSurface.slot = 'next';
    this.projectSurfaces = { hero, prev: prevSurface, next: nextSurface };
    this.projectSurfaceRects = rects;
    this.setProjectSurfaceRest(prevSurface, rects.prev, 'prev', rects.prevEl);
    this.setProjectSurfaceRest(nextSurface, rects.next, 'next', rects.nextEl);

    const source = transitionFrom && !direction
      ? transitionFrom.sourceRect || (transitionFrom.width ? transitionFrom : null)
      : null;
    if (source) {
      const homeCard = this.homeCards.find(card => card.project.slug === project.slug);
      if (homeCard) {
        hero.mesh.position.copy(homeCard.mesh.position);
        hero.mesh.scale.copy(homeCard.mesh.scale);
        hero.mesh.quaternion.copy(homeCard.mesh.quaternion);
        const sourceUniforms = homeCard.mesh.material.uniforms;
        const targetUniforms = hero.mesh.material.uniforms;
        for (const key of ['u_alpha', 'u_shade', 'u_shadeS', 'u_corner', 'u_white', 'u_scrim', 'u_arcW', 'u_arcD', 'u_arcOuterD', 'u_arcOuterStart', 'u_arcEdgeBend', 'u_panelBend', 'u_panelCenter', 'u_panelHalfWidth', 'u_sheetW', 'u_sheetD', 'u_sheetT', 'u_sheetC', 'u_sheetP', 'u_sheetV', 'u_geoD', 'u_geoC', 'u_geoA', 'u_hover', 'u_dent', 'u_leanA', 'u_leanW', 'u_bulgeA', 'u_bulgeH']) {
          if (sourceUniforms[key] && targetUniforms[key]) targetUniforms[key].value = sourceUniforms[key].value;
        }
        targetUniforms.u_texture.value = sourceUniforms.u_texture.value;
        targetUniforms.u_size.value.copy(sourceUniforms.u_size.value);
        targetUniforms.u_res.value.copy(sourceUniforms.u_res.value);
        targetUniforms.u_wash.value.set(0xffffff);
      }
      this.homeGroup.visible = true;
      for (const card of this.homeCards) {
        gsap.killTweensOf(card.mesh.material.uniforms.u_alpha);
        if (card.project.slug === project.slug) card.mesh.material.uniforms.u_alpha.value = 0;
        else gsap.to(card.mesh.material.uniforms.u_alpha, { value: 0, duration: 0.3, ease: 'power1.out', overwrite: 'auto' });
        gsap.to(card.titleMesh.material.uniforms.u_alpha, { value: 0, duration: 0.25, ease: 'power1.out', overwrite: 'auto' });
        gsap.to(card.arrowMesh.material.uniforms.u_alpha, { value: 0, duration: 0.25, ease: 'power1.out', overwrite: 'auto' });
      }
      this.flyProjectSurface(hero, source, rects.panel, 'hero', rects.panelEl, () => {
        this.homeGroup.visible = false;
      });
    } else {
      this.setProjectSurfaceRest(hero, rects.panel, 'hero', rects.panelEl);
    }
  }

  prepareProjectNavigation() {
    gsap.killTweensOf(this.projectScrub);
    this.clearProjectScrub();
    this.projectScrubParts = null;
    this.projectScrub.p = 0;
    this.projectDrag = null;
    document.documentElement.classList.remove('grabbing');
  }

  startProjectClose(exitTo, onComplete) {
    const surfaces = this.projectSurfaces;
    const rects = this.readProjectSurfaceRects();
    if (!this.webgl || !surfaces?.hero || !rects || !exitTo) {
      onComplete?.();
      return;
    }
    this.beginHomeReturn(this.project);
    for (const item of this.projectMedia) {
      gsap.killTweensOf(item);
      gsap.to(item, { p: 0, duration: this.reducedMotion ? 0 : 0.25, ease: 'power1.out' });
    }
    for (const award of this.projectAwards) {
      gsap.to(award.mesh.material.uniforms.u_alpha, { value: 0, duration: this.reducedMotion ? 0 : 0.25, ease: 'power1.out' });
    }
    if (this.projectClose) {
      gsap.to(this.projectClose, { alpha: 0, duration: this.reducedMotion ? 0 : 0.25, ease: 'power1.out', overwrite: 'auto' });
    }
    this.retireProjectSurface(surfaces.prev);
    this.retireProjectSurface(surfaces.next);
    this.flyProjectSurface(surfaces.hero, rects.panel, exitTo, 'home', null, () => {
      this.completeHomeReturn(this.project?.slug);
      onComplete?.();
    });
  }

  setupProjectTitle() {
    if (!this.webgl || !this.projectDom?.title) return;
    const material = this.makeSurface(this.blank, { width: 1, height: 1 }, true);
    material.uniforms.u_shade.value = 0;
    material.uniforms.u_sheetP.value = 0;
    material.uniforms.u_clipOn.value = 1;
    const mesh = new THREE.Mesh(this.quadGeometry, material);
    mesh.renderOrder = 4;
    this.projectGroup.add(mesh);
    const item = {
      el: this.projectDom.title,
      mesh,
      padX: 0,
      padY: 0,
      rasterW: 0,
      rasterH: 0,
    };
    this.projectTitle = item;
    this.rasterizeProjectTitle(item);
    this.syncProjectTitle();
    document.fonts?.ready.then(() => {
      if (this.projectTitle === item && item.el.isConnected) this.rasterizeProjectTitle(item);
    });
  }

  rasterizeProjectTitle(item = this.projectTitle) {
    const el = item?.el;
    if (!el?.isConnected) return false;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const style = getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize) || 16;
    const padX = Math.ceil(fontSize * 0.35);
    const padY = Math.ceil(fontSize * 0.25);
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((rect.width + padX * 2) * scale);
    canvas.height = Math.ceil((rect.height + padY * 2) * scale);
    const context = canvas.getContext('2d');
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, rect.width + padX * 2, rect.height + padY * 2);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if ('letterSpacing' in context) context.letterSpacing = style.letterSpacing === 'normal' ? 'normal' : style.letterSpacing;
    if ('textRendering' in context) context.textRendering = 'optimizeLegibility';
    context.fillStyle = style.color;
    context.textBaseline = 'alphabetic';
    context.textAlign = 'left';
    const metrics = context.measureText('Hg');
    const ascent = metrics.fontBoundingBoxAscent ?? fontSize * 0.8;
    const descent = metrics.fontBoundingBoxDescent ?? fontSize * 0.25;
    const baseline = padY + rect.height / 2 + (ascent - descent) / 2;
    context.fillText(el.textContent.trim(), padX, baseline);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    const uniforms = item.mesh.material.uniforms;
    const previous = uniforms.u_texture.value;
    uniforms.u_texture.value = texture;
    if (previous && previous !== this.blank) previous.dispose();
    item.padX = padX;
    item.padY = padY;
    item.rasterW = rect.width;
    item.rasterH = rect.height;
    return true;
  }

  syncProjectTitle() {
    const item = this.projectTitle;
    if (!item) return;
    const el = item.el;
    if (!el?.isConnected || !this.projectDom?.panel) {
      item.mesh.visible = false;
      return;
    }
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      item.mesh.visible = false;
      return;
    }
    if (Math.abs(rect.width - item.rasterW) > 0.5 || Math.abs(rect.height - item.rasterH) > 0.5) {
      this.rasterizeProjectTitle(item);
    }
    const titleRect = {
      x: rect.left - item.padX,
      y: rect.top - item.padY,
      width: rect.width + item.padX * 2,
      height: rect.height + item.padY * 2,
    };
    this.applyPose(item.mesh, titleRect, null, 0);
    const opacity = (node) => {
      if (!node) return 1;
      const value = parseFloat(getComputedStyle(node).opacity);
      return Number.isFinite(value) ? value : 1;
    };
    const alpha = opacity(this.projectDom.content) * opacity(this.projectDom.copy) * opacity(el);
    const panel = this.projectDom.panel;
    const panelRect = panel.getBoundingClientRect();
    const dpr = this.renderer.getPixelRatio();
    const uniforms = item.mesh.material.uniforms;
    uniforms.u_alpha.value = alpha;
    uniforms.u_clip.value.set(
      panelRect.left * dpr,
      (this.vh - panelRect.bottom) * dpr,
      panelRect.width * dpr,
      panelRect.height * dpr,
    );
    uniforms.u_clipR.value = (parseFloat(getComputedStyle(panel).borderRadius) || 0) * dpr;
    item.mesh.visible = this.route === 'project' && alpha > 0.001 && this.isRectVisible(titleRect, 100);
  }

  cleanupProjectTitle() {
    const item = this.projectTitle;
    if (!item) return;
    this.projectGroup?.remove(item.mesh);
    const texture = item.mesh.material.uniforms.u_texture.value;
    item.mesh.material.dispose();
    if (texture && texture !== this.blank) texture.dispose();
    this.projectTitle = null;
  }

  registerProject({ project, panel, viewport, media, awards, progress, pills = [], transitionFrom = null }) {
    this.cleanupProjectMedia();
    this.project = project;
    this.projectDom = {
      panel,
      viewport,
      media,
      awards,
      progress,
      content: panel?.querySelector('.project-content'),
      copy: panel?.querySelector('.project-copy'),
      title: panel?.querySelector('h1'),
      pills,
    };
    this.projectOffset = { current: 0, target: 0, total: 1, max: 0 };
    this.lastProjectScroll = panel?.scrollTop || 0;
    if (!this.webgl) return;
    this.projectMedia = media.map((el, index) => {
      const image = project.images[index];
      const material = this.makeSurface(this.blank, image);
      this.applyTexture(material, image.asset, image);
      material.uniforms.u_clipOn.value = 1;
      material.uniforms.u_shade.value = 0;
      material.uniforms.u_sheetP.value = 0;
      const mesh = new THREE.Mesh(this.quadGeometry, material);
      mesh.renderOrder = 3;
      this.projectGroup.add(mesh);
      if (image.video) this.attachVideo(mesh, image.video);
      const item = { el, mesh, image, index, p: this.reducedMotion ? 1 : 0, baseY: 0, height: 0 };
      gsap.to(item, { p: 1, duration: this.reducedMotion ? 0 : 1.25, delay: this.reducedMotion ? 0 : 0.25 + index * 0.1, ease: 'expo.out' });
      return item;
    });
    this.buildAwards();
    this.setupProjectSurfaces(project, transitionFrom);
    this.setupProjectTitle();
    this.setupProjectPills();
    this.setupProjectClose();
    requestAnimationFrame(() => this.layoutProject(true, true));
  }

  layoutProject(immediate = false, reset = false) {
    if (!this.projectDom || !this.project) return;
    const { panel, viewport, media, content } = this.projectDom;
    if (!viewport) return;
    if (!this.webgl) {
      if (content) content.style.transform = '';
      return;
    }
    const track = viewport.querySelector('.media-track');
    const trackStyle = track ? getComputedStyle(track) : null;
    for (const item of this.projectScrollItems) {
      if (item.el?.isConnected) item.el.style.transform = '';
    }
    if (content) content.style.transform = '';
    if (this.desktop) {
      const insetX = trackStyle ? parseFloat(trackStyle.paddingLeft) : 0;
      const width = Math.max(1, viewport.clientWidth - insetX);
      this.projectMedia.forEach((item, index) => {
        const image = this.project.images[index];
        const height = width * (image.height / image.width);
        item.height = height;
        Object.assign(media[index].style, {
          height: `${height}px`,
          position: 'relative',
          left: '',
          top: '',
          width: '100%',
          transform: '',
        });
      });
    } else {
      media.forEach((el) => {
        el.style.position = '';
        el.style.left = '';
        el.style.top = '';
        el.style.width = '';
        el.style.height = '';
        el.style.transform = '';
      });
    }
    const lead = this.desktop ? null : panel.querySelector('.project-copy');
    const elements = lead ? [lead, ...media] : [...media];
    elements.forEach((el) => { el.style.transform = ''; });
    const panelRect = panel.getBoundingClientRect();
    this.projectScrollItems = elements.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        el,
        start: rect.top - panelRect.top - panelRect.height,
        end: rect.bottom - panelRect.top,
        out: true,
        base: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      };
    });
    if (!this.projectScrollItems.length) return;
    const gap = trackStyle ? parseFloat(trackStyle.rowGap) || 0 : 0;
    const viewportStyle = getComputedStyle(viewport);
    const extraBottom = (parseFloat(trackStyle?.paddingBottom) || 0) + (parseFloat(viewportStyle.paddingBottom) || 0);
    const leadOffset = lead && track ? track.getBoundingClientRect().top - lead.getBoundingClientRect().top : 0;
    this.projectOffset.total = Math.max(1, (track?.scrollHeight || 0) + gap + extraBottom + leadOffset);
    this.projectOffset.max = Math.max(0, Math.max(...this.projectScrollItems.map((item) => item.end)) + extraBottom - panelRect.height);
    if (reset) this.projectOffset.current = this.projectOffset.target = 0;
    // Keep both the requested and rendered positions inside the post after
    // layout changes, including viewport and orientation changes.
    this.projectOffset.target = clamp(this.projectOffset.target, 0, this.projectOffset.max);
    this.projectOffset.current = clamp(this.projectOffset.current, 0, this.projectOffset.max);
    this.syncProjectScroll(true);
  }

  syncProjectScroll(force = false) {
    if (!this.projectDom?.panel || !this.projectScrollItems.length) return;
    const { current, max } = this.projectOffset;
    const margin = (this.projectDom.panel.clientHeight || 0) * 0.25;
    for (const item of this.projectScrollItems) {
      const y = current;
      if (force || (y > item.start - margin && y < item.end + margin)) {
        item.out = false;
        item.el._parked = false;
      } else if (item.out) {
        item.el._parked = true;
        continue;
      } else {
        item.out = true;
      }
      item.el.style.transform = `translate3d(0, ${-y}px, 0)`;
    }
    const progress = this.projectDom.progress;
    if (progress) {
      const ratio = max > 0 ? clamp(current / max) : 0;
      progress.style.strokeDashoffset = `${100 - ratio * 100}`;
    }
  }

  beginProjectScrub() {
    if (this.projectScrubParts) {
      gsap.killTweensOf(this.projectScrub);
      return true;
    }
    const rects = this.readProjectSurfaceRects();
    const surfaces = this.projectSurfaces;
    if (!rects || !surfaces || this.overlay || this.hole.p) return false;
    for (const role of ['hero', 'prev', 'next']) {
      const item = surfaces[role];
      if (!item || item.disposed || !item.landed) return false;
    }
    for (const role of ['hero', 'prev', 'next']) {
      const item = surfaces[role];
      gsap.killTweensOf(item.mesh.material.uniforms.u_alpha);
      gsap.killTweensOf(item.lift);
      item.lift.value = role === 'hero' ? 1 : 0.3;
      item.mesh.renderOrder = role === 'hero' ? 1 : 2;
      item.landed = false;
    }
    this.projectScrub.p = 0;
    this.projectScrubParts = {
      surfaces,
      rects,
      panelAlpha: 1,
      slotAlpha: 0.3,
      panelRadius: parseFloat(getComputedStyle(rects.panelEl).borderRadius) || 0,
      slotRadius: parseFloat(getComputedStyle(rects.prevEl).borderRadius) || 0,
    };
    return true;
  }

  syncProjectScrub(ratio = 1) {
    const parts = this.projectScrubParts;
    if (!parts) {
      this.projectDragBow += -this.projectDragBow * Math.min(1, 0.1 * ratio);
      return;
    }
    const { rects, surfaces } = parts;
    if (!rects.panelEl.isConnected || !rects.prevEl.isConnected || !rects.nextEl.isConnected) return;
    if (this.projectDrag?.axis === 'x') {
      this.projectScrub.p += (this.projectDrag.scrubTarget - this.projectScrub.p) * Math.min(1, 0.11 * ratio);
    }
    const p = clamp(this.projectScrub.p, -1, 1);
    this.projectScrub.p = p;
    const r = Math.min(1, Math.abs(p));
    const forward = p >= 0;
    const bow = Math.tanh(Math.abs(p) * 6);
    const targetBow = -(bow * bow) * 0.65 * this.frustumH;
    this.projectDragBow += (targetBow - this.projectDragBow) * Math.min(1, 0.25 * ratio);
    const mix = (a, b) => a + (b - a) * r;
    const mixRect = (a, b) => ({
      x: mix(a.x, b.x),
      y: mix(a.y, b.y),
      left: mix(a.left, b.left),
      top: mix(a.top, b.top),
      width: mix(a.width, b.width),
      height: mix(a.height, b.height),
    });
    const pose = (item, rect, alpha, radius) => {
      if (!item || item.disposed) return;
      item.mesh.quaternion.identity();
      this.applyPose(item.mesh, rect, null, this.projectBulge + this.projectDragBow);
      const u = item.mesh.material.uniforms;
      u.u_alpha.value = alpha;
      u.u_corner.value = radius / Math.max(1, rect.height);
    };
    pose(
      surfaces.hero,
      mixRect(rects.panel, forward ? rects.prev : rects.next),
      mix(parts.panelAlpha, parts.slotAlpha),
      mix(parts.panelRadius, parts.slotRadius),
    );
    const selected = forward ? surfaces.next : surfaces.prev;
    pose(
      selected,
      mixRect(forward ? rects.next : rects.prev, rects.panel),
      mix(parts.slotAlpha, parts.panelAlpha),
      mix(parts.slotRadius, parts.panelRadius),
    );
    const other = forward ? surfaces.prev : surfaces.next;
    pose(other, forward ? rects.prev : rects.next, parts.slotAlpha, parts.slotRadius);
    if (other && !other.disposed) other.mesh.position.x *= 1 + r;
    const furniture = rects.panelEl.querySelectorAll('.project-copy, .project-progress');
    furniture.forEach(el => { el.style.opacity = `${1 - r}`; });
  }

  clearProjectScrub() {
    const panel = this.projectDom?.panel;
    panel?.querySelectorAll('.project-copy, .project-progress').forEach(el => {
      el.style.opacity = '';
      el.style.transform = '';
    });
  }

  cancelProjectScrub() {
    gsap.killTweensOf(this.projectScrub);
    const parts = this.projectScrubParts;
    if (parts) {
      for (const role of ['hero', 'prev', 'next']) {
        const item = parts.surfaces[role];
        const key = role === 'hero' ? 'panel' : role;
        this.setProjectSurfaceRest(item, parts.rects[key], role, parts.rects[`${key}El`]);
      }
    }
    this.clearProjectScrub();
    this.projectScrubParts = null;
    this.projectScrub.p = 0;
    this.projectDragBow = 0;
    this.projectDrag = null;
    document.documentElement.classList.remove('grabbing');
  }

  releaseProjectScrub() {
    if (!this.projectScrubParts) return;
    gsap.to(this.projectScrub, {
      p: 0,
      duration: this.reducedMotion ? 0 : 0.6,
      ease: 'expo.out',
      overwrite: true,
      onComplete: () => {
        const parts = this.projectScrubParts;
        if (!parts) return;
        this.projectScrub.p = 0;
        this.syncProjectScrub(0);
        for (const role of ['hero', 'prev', 'next']) {
          const item = parts.surfaces[role];
          const key = role === 'hero' ? 'panel' : role;
          this.setProjectSurfaceRest(item, parts.rects[key], role, parts.rects[`${key}El`]);
        }
        this.clearProjectScrub();
        this.projectScrubParts = null;
      },
    });
  }

  commitProjectDrag(direction) {
    if (!this.projectScrubParts || !this.project) return;
    const index = this.featured.findIndex(item => item.slug === this.project.slug);
    const target = this.featured[(index + direction + this.featured.length) % this.featured.length];
    if (!target) return;
    this.suppressClick = true;
    this.prepareProjectNavigation();
    this.callbacks.onProjectNavigate?.(target.slug, direction > 0 ? 'next' : 'previous');
  }

  buildAwards() {
    if (!this.webgl || !this.awardGeometry || !this.projectDom || !this.project?.awards) return;
    for (const old of this.projectAwards) {
      this.projectGroup.remove(old.mesh);
      old.mesh.material.dispose();
    }
    this.projectAwards = [];
    const elements = this.projectDom.awards || [];
    const count = Math.min(1, elements.length);
    for (let i = 0; i < count; i += 1) {
      const material = new THREE.ShaderMaterial({
        vertexShader: awardVertex,
        fragmentShader: awardFragment,
        uniforms: {
          u_color: { value: new THREE.Color('#d9a441') },
          u_light: { value: new THREE.Color('#fff2cc') },
          u_clip: { value: new THREE.Vector4() },
          u_clipR: { value: 0 },
          u_clipOn: { value: 0 },
          u_alpha: { value: this.reducedMotion ? 1 : 0 },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(this.awardGeometry, material);
      mesh.renderOrder = 5;
      this.projectGroup.add(mesh);
      const item = { mesh, el: elements[i], enter: this.reducedMotion ? 1 : 0 };
      gsap.to(item, { enter: 1, duration: this.reducedMotion ? 0 : 0.85, delay: this.reducedMotion ? 0 : 0.5, ease: 'expo.out' });
      gsap.to(material.uniforms.u_alpha, { value: 1, duration: this.reducedMotion ? 0 : 0.4, delay: this.reducedMotion ? 0 : 0.5 });
      this.projectAwards.push(item);
    }
  }

  updateProject(dt) {
    if (this.route !== 'project' || !this.projectDom?.panel) return;
    const { panel, progress } = this.projectDom;
    const panelRect = panel.getBoundingClientRect();
    this.syncProjectSurfaces();
    this.syncProjectClose();
    let velocity = 0;
    if (this.webgl && this.projectMedia.length) {
      if (this.reducedMotion) this.projectOffset.current = this.projectOffset.target;
      else {
        const damping = 0.1 * Math.min(dt * 60, 2);
        this.projectOffset.current += (this.projectOffset.target - this.projectOffset.current) * damping;
        this.projectOffset.current = Math.round(this.projectOffset.current * 100) / 100;
      }
      velocity = Math.tanh((this.projectOffset.target - this.projectOffset.current) / (this.desktop ? 900 : 500));
      this.syncProjectScroll();
    } else if (panel) {
      const top = panel.scrollTop;
      velocity = Math.tanh((top - this.lastProjectScroll) / 500);
      this.lastProjectScroll = top;
      if (progress) {
        const max = Math.max(1, panel.scrollHeight - panel.clientHeight);
        progress.style.strokeDashoffset = `${100 - clamp(top / max) * 100}`;
      }
    }
    const baseBulge = this.reducedMotion ? 0 : velocity * Math.abs(velocity) * 0.22 * this.frustumH;
    this.projectBulge = baseBulge;
    // Give larger-viewport media its own scroll response; keep the existing
    // sheet response and the phone's established media deformation unchanged.
    const mediaVelocity = this.desktop && !this.reducedMotion
      ? Math.tanh((this.projectOffset.target - this.projectOffset.current) / 700)
      : velocity;
    const bulge = this.desktop
      ? mediaVelocity * Math.abs(mediaVelocity) * 0.22 * this.frustumH * 1.15
      : baseBulge * 1.3;
    if (!this.webgl) return;
    this.syncProjectTitle();
    this.syncProjectPills(dt);
    const hero = this.projectSurfaces?.hero;
    const dpr = this.renderer.getPixelRatio();
    if (!this.desktop && this.projectSurfaces) {
      for (const side of [this.projectSurfaces.prev, this.projectSurfaces.next]) {
        if (side) side.mesh.material.uniforms.u_clipOn.value = 0;
      }
    }
    if (hero) {
      const u = hero.mesh.material.uniforms;
      const landed = hero.landed && !hero.flying && !this.projectScrubParts;
      if (landed) {
        // Reuse the same damped scroll deformation as the larger sheet.
        u.u_bulgeA.value = baseBulge * 0.3;
        u.u_bulgeH.value = this.frustumH;
      }
      // On phones, bound the moving surface to its sheet to prevent the
      // antialiased edge from spilling into the stable side gutters. Disable
      // the clip for project flights and horizontal scrubbing.
      u.u_clipOn.value = !this.desktop && landed ? 1 : 0;
      if (u.u_clipOn.value) {
        u.u_clip.value.set(panelRect.left * dpr, (this.vh - panelRect.bottom) * dpr, panelRect.width * dpr, panelRect.height * dpr);
        u.u_clipR.value = (parseFloat(getComputedStyle(panel).borderRadius) || 0) * dpr;
      }
    }
    for (const item of this.projectMedia) {
      const rect = item.el.getBoundingClientRect();
      const pose = this.applyPose(item.mesh, rect, null, bulge);
      pose.pos.y -= (1 - item.p) * this.frustumH * 0.5;
      item.mesh.position.copy(pose.pos);
      item.mesh.material.uniforms.u_alpha.value = item.p;
      item.mesh.material.uniforms.u_clip.value.set(
        panelRect.left * dpr,
        (this.vh - panelRect.bottom) * dpr,
        panelRect.width * dpr,
        panelRect.height * dpr,
      );
      item.mesh.material.uniforms.u_clipR.value = (this.desktop ? 2 : 1.5) * this.root * dpr;
      item.mesh.visible = item.p > 0.001 && this.isRectVisible(rect, 100);
      const video = this.videoCache.get(item.image.video);
      if (video) this.playVideo(video, item.mesh.visible && this.isRectVisible(rect, 0));
    }
    for (const award of this.projectAwards) {
      if (!award.el) continue;
      const rect = award.el.getBoundingClientRect();
      const pose = this.rectToPose(rect);
      award.mesh.position.copy(pose.pos);
      award.mesh.scale.setScalar(Math.max(0.0001, pose.scale.y * award.enter));
      award.mesh.rotation.y = this.clock * 0.6 + velocity * 4;
      // The trophy is a separate WebGL mesh, not a DOM child of the sheet.
      // Match the sheet's rounded clip as its mobile copy scrolls out of view.
      const u = award.mesh.material.uniforms;
      u.u_clipOn.value = this.desktop ? 0 : 1;
      u.u_clip.value.set(panelRect.left * dpr, (this.vh - panelRect.bottom) * dpr, panelRect.width * dpr, panelRect.height * dpr);
      u.u_clipR.value = (parseFloat(getComputedStyle(panel).borderRadius) || 0) * dpr;
    }
  }

  cleanupProjectMedia() {
    this.projectDrag = null;
    this.cleanupProjectTitle();
    this.cleanupProjectPills();
    for (const item of this.projectMedia) {
      gsap.killTweensOf(item);
      this.projectGroup?.remove(item.mesh);
      item.mesh.material.dispose();
    }
    for (const award of this.projectAwards) {
      gsap.killTweensOf(award);
      this.projectGroup?.remove(award.mesh);
      award.mesh.material.dispose();
    }
    this.projectMedia = [];
    this.projectAwards = [];
    this.projectScrollItems = [];
  }

  cleanupProject() {
    if (this.projectScrubParts) this.cancelProjectScrub();
    this.cleanupProjectMedia();
    if (this.projectSurfaces) {
      for (const role of ['hero', 'prev', 'next']) this.disposeProjectSurface(this.projectSurfaces[role]);
    }
    this.projectSurfaces = null;
    this.cleanupProjectClose();
    this.projectSurfaceRects = null;
    this.projectScrubParts = null;
    this.projectDragBow = 0;
    this.projectBulge = 0;
    this.projectDom = null;
  }

  attachVideo(mesh, url) {
    if (mesh.userData.videoRequested) return;
    mesh.userData.videoRequested = true;
    const video = this.video(url);
    const assign = () => {
      if (mesh.material.disposed) return;
      mesh.material.uniforms.u_texture.value = video.texture;
      mesh.userData.video = true;
    };
    if (video.el.readyState >= 2) assign();
    else video.el.addEventListener('canplay', assign, { once: true });
  }

  video(url) {
    if (!this.videoCache.has(url)) {
      const el = document.createElement('video');
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.crossOrigin = 'anonymous';
      el.preload = 'auto';
      el.src = url;
      el.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-10px;top:-10px';
      document.body.appendChild(el);
      const texture = new THREE.VideoTexture(el);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      this.videoCache.set(url, { el, texture, playing: false });
    }
    return this.videoCache.get(url);
  }

  playVideo(video, play) {
    if (!video || video.playing === play) return;
    video.playing = play;
    if (play) video.el.play().catch(() => {});
    else video.el.pause();
  }

  attachHomeVideos() {
    if (!this.webgl) return;
    for (const card of this.homeCards) {
      if (card.project.video && !card.mesh.userData.video) this.attachVideo(card.mesh, card.project.video);
    }
  }

  async loadModels() {
    if (!this.webgl) return;
    const loader = new GLTFLoader();
    loader.load('/assets/models/award.glb', (gltf) => {
      const parts = [];
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((node) => {
        if (!node.isMesh) return;
        let geometry = node.geometry.clone();
        geometry.applyMatrix4(node.matrixWorld);
        if (geometry.index) geometry = geometry.toNonIndexed();
        parts.push(geometry);
      });
      try {
        this.awardGeometry = normalizeGeometry(parts.length > 1 ? mergeGeometries(parts) : parts[0]);
        this.buildAwards();
      } catch {
        this.awardGeometry = normalizeGeometry(new THREE.CylinderGeometry(0.3, 0.45, 1, 8));
        this.buildAwards();
      }
    });
    loader.load('/assets/models/llama.glb', (gltf) => {
      let geometry = null;
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((node) => {
        if (!geometry && node.isMesh) {
          geometry = node.geometry.clone();
          geometry.applyMatrix4(node.matrixWorld);
        }
      });
      this.llamaGeometry = normalizeGeometry(geometry || new THREE.BoxGeometry(1, 1, 1.6));
      this.setupLlamas();
    });
  }

  setupLlamas() {
    const material = new THREE.ShaderMaterial({
      vertexShader: llamaVertex,
      fragmentShader: llamaFragment,
      uniforms: {
        u_res: { value: new THREE.Vector2(1, 1) },
        u_center: { value: new THREE.Vector2(0.5, 0.5) },
        u_radius: { value: 0 },
        u_aspect: { value: 1 },
        u_time: { value: 0 },
        u_amp: { value: 0 },
        u_disp: { value: 0.05 },
        u_shine: { value: 0.26 },
      },
    });
    const frontMaterial = material.clone();
    frontMaterial.transparent = true;
    this.llamaMesh = new THREE.InstancedMesh(this.llamaGeometry, material, 4);
    this.llamaMesh.renderOrder = 3;
    this.llamaMesh.frustumCulled = false;
    this.llamaMesh.visible = false;
    this.llamaFrontMesh = new THREE.InstancedMesh(this.llamaGeometry, frontMaterial, 2);
    this.llamaFrontMesh.renderOrder = 5;
    this.llamaFrontMesh.frustumCulled = false;
    this.llamaFrontMesh.visible = false;
    this.overlayScene.add(this.llamaMesh, this.llamaFrontMesh);
    this.llamaItems = Array.from({ length: 6 }, (_, i) => this.seedLlama(i, true));
  }

  seedLlama(index, initial) {
    const z = index >= 4 ? 2 + Math.random() * 3 : -Math.random() * 9;
    return {
      z,
      u: ((index + 0.5) / 6 - 0.5) * 1.5 + (Math.random() - 0.5) * 0.18,
      v: initial ? (((index * 0.618 + Math.random() * 0.12) % 1) - 0.5) * 2.4 : 1.3 + Math.random() * 0.4,
      fall: 0.4 * (0.7 + Math.random() * 0.6) * (1 + z * 0.05),
      sway: (Math.random() - 0.5) * 0.1,
      ry: Math.random() * Math.PI * 2,
      wy: (Math.random() < 0.5 ? -1 : 1) * 0.7 * (0.6 + Math.random() * 0.8),
      rock: 0.22 * (0.6 + Math.random() * 0.8),
      scale: 0.38 * (0.7 + Math.random() * 0.6),
      phase: Math.random() * Math.PI * 2,
    };
  }

  updateLlamas(dt) {
    if (!this.llamaMesh || !this.llamaFrontMesh) return;
    const open = this.hole.p > 0.01;
    this.llamaMesh.visible = open;
    this.llamaFrontMesh.visible = open;
    if (!open) return;
    const progress = clamp(this.hole.p);
    const center = this.postMaterial.uniforms.u_center.value;
    const radiusUv = this.hole.radius * progress;
    const time = this.postTime;
    for (const mesh of [this.llamaMesh, this.llamaFrontMesh]) {
      const u = mesh.material.uniforms;
      this.renderer.getDrawingBufferSize(u.u_res.value);
      u.u_center.value.copy(center);
      u.u_radius.value = radiusUv * (1 + 0.015 * Math.sin(time * 1.6)) * 0.99;
      u.u_aspect.value = this.vw / this.vh;
      u.u_time.value = time;
      u.u_amp.value = 0.05 * Math.sin(Math.PI * progress);
    }
    const radius = radiusUv * this.frustumW * 2;
    const centerX = (center.x - 0.5) * this.frustumW * 2;
    const centerY = (center.y - 0.5) * this.frustumH * 2;
    let back = 0;
    let front = 0;
    this.llamaItems.forEach((item, index) => {
      item.v -= item.fall * dt;
      item.phase += dt;
      item.ry += item.wy * dt;
      if (item.v < -1.4) this.llamaItems[index] = item = this.seedLlama(index, false);
      const depth = (this.camera.position.z - item.z) / this.camera.position.z;
      this.dummy.position.set(
        (centerX + (item.u + Math.sin(item.phase) * item.sway) * radius) * depth,
        (centerY + item.v * radius) * depth,
        item.z,
      );
      this.dummy.rotation.set(Math.sin(item.phase * 1.3) * item.rock, item.ry, Math.sin(item.phase * 0.9 + 1.7) * item.rock);
      this.dummy.scale.setScalar(Math.max(radius * item.scale, 0.0001));
      this.dummy.updateMatrix();
      if (index < 4) this.llamaMesh.setMatrixAt(back++, this.dummy.matrix);
      else this.llamaFrontMesh.setMatrixAt(front++, this.dummy.matrix);
    });
    this.llamaMesh.instanceMatrix.needsUpdate = true;
    this.llamaFrontMesh.instanceMatrix.needsUpdate = true;
  }

  isRectVisible(rect, margin = 0) {
    return rect.x + rect.width > -margin && rect.x < this.vw + margin && rect.y + rect.height > -margin && rect.y < this.vh + margin;
  }

  showBall(on) {
    const ball = this.ball;
    if (ball.on === on) return;
    ball.on = on;
    if (!on) ball.seen = false;
    gsap.to(ball, {
      p: on ? 1 : 0,
      duration: on ? 0.35 : 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }

  syncBall(dt) {
    const ball = this.ball;
    ball.e *= Math.exp(-4 * dt);
    let energy = 0;
    if (ball.p > 0.001 && ball.seen) {
      const follow = 1 - Math.exp(-7 * dt);
      ball.sx += (ball.tx - ball.sx) * follow;
      ball.sy += (ball.ty - ball.sy) * follow;
      const distance = Math.hypot(ball.tx - ball.sx, ball.ty - ball.sy) / this.vw;
      const response = Math.tanh(Math.max(0, distance - 0.025) / 0.08);
      energy = response * response;
      const trail = this.trailMaterial.uniforms;
      trail.u_pos.value.set(ball.tx / this.vw, 1 - ball.ty / this.vh);
      trail.u_amp.value = energy;
      trail.u_rad.value = 0.04;
    } else if (this.trailMaterial) this.trailMaterial.uniforms.u_amp.value = 0;
    ball.e = Math.max(ball.e, energy);
    if (--this.ballScan <= 0) {
      this.ballScan = 60;
      this.ballShield = [...document.querySelectorAll('[data-gl-shield]')];
    }
    let shieldDistance = Infinity;
    for (const shield of this.ballShield) {
      if (!shield.isConnected || shield.closest('[inert]')) continue;
      const rect = shield.getBoundingClientRect();
      const dx = Math.max(rect.left - ball.tx, 0, ball.tx - (rect.left + rect.width));
      const dy = Math.max(rect.top - ball.ty, 0, ball.ty - (rect.top + rect.height));
      shieldDistance = Math.min(shieldDistance, Math.hypot(dx, dy));
    }
    const shieldRange = 0.03 * this.vw;
    const shieldTarget = shieldDistance < shieldRange
      ? 0.03 + (1 - 0.03) * (shieldDistance / shieldRange)
      : 1;
    ball.w += (shieldTarget - ball.w) * (1 - Math.exp(-10 * dt));
    this.trailOn = ball.e > 0.004;
    this.mouseA = this.trailOn ? ball.p : 0;
    if (this.postMaterial) {
      const post = this.postMaterial.uniforms;
      const strength = ball.w * (1 - this.hole.p);
      post.u_ballA.value = this.mouseA;
      post.u_ballWarp.value = -0.045 * strength;
      post.u_ballShade.value = -1.2 * strength;
      post.u_ballEdge.value.set(0.22, 0.5);
    }
  }

  stepTrail(dt) {
    if (!this.trailOn || !this.trail) return;
    if (!this.trailFresh) {
      this.trailFresh = true;
      for (const target of this.trail) {
        this.renderer.setRenderTarget(target);
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.clear(true, false, false);
      }
      this.renderer.setClearColor(0x000000, 1);
    }
    const from = this.trail[this.trailSide];
    const to = this.trail[1 - this.trailSide];
    const uniforms = this.trailMaterial.uniforms;
    uniforms.u_prev.value = from.texture;
    uniforms.u_decay.value = Math.exp(-2.4 * dt);
    uniforms.u_diff.value = 1 - Math.exp(-40 * dt);
    this.renderer.setRenderTarget(to);
    this.renderer.render(this.trailScene, this.postCamera);
    this.renderer.setRenderTarget(null);
    this.trailSide = 1 - this.trailSide;
    this.postMaterial.uniforms.u_trail.value = to.texture;
  }

  pushScroll(deltaY, deltaX = 0, event = null) {
    if (!this.interactive || !this.webgl || event?.ctrlKey || this.overlay) return;
    if (this.route !== 'project' || this.projectDrag?.axis === 'x') return;
    this.projectOffset.target += deltaY;
    this.projectOffset.target = clamp(this.projectOffset.target, 0, this.projectOffset.max);
  }

  homeInputTarget(target) {
    return target instanceof Element
      && Boolean(target.closest('.home'))
      && !target.closest('button, input, textarea, select, summary, audio[controls], video[controls], [data-no-drag], .hud, .full-index');
  }

  homeSettled() {
    return !this.homeNavigation.busy
      && !this.drag
      && Math.abs(this.homeOffset.target - this.homeOffset.current) < 0.2;
  }

  stepHome(direction) {
    if (!this.interactive || !this.webgl || this.overlay || this.route !== 'home' || this.drag) return;
    this.homeNavigation.step(direction, this.homeOffset.current, { reducedMotion: this.reducedMotion });
    this.homeOffset.target = this.homeNavigation.position;
  }

  releaseHomePointerCapture(drag) {
    if (!drag?.captureTarget?.hasPointerCapture?.(drag.pointerId)) return;
    try { drag.captureTarget.releasePointerCapture(drag.pointerId); } catch { /* capture may already be lost */ }
  }

  endHomeDrag(event = null, { fling = true } = {}) {
    const drag = this.drag;
    if (!drag) return;
    const now = event?.timeStamp ?? performance.now();
    const velocity = fling && drag.moved ? this.homeDragVelocity.value(now) : 0;
    this.drag = null;
    this.releaseHomePointerCapture(drag);
    document.documentElement.classList.remove('grabbing');
    if (drag.moved) {
      // Time-box home drag suppression so a release outside the gallery cannot
      // leave a stale boolean that eats the next unrelated control click.
      this.homeClickBlockUntil = performance.now() + 350;
    }
    if (this.route !== 'home' || !this.webgl) {
      this.homeNavigation.reset(this.homeOffset.current);
      return;
    }
    if (fling) this.homeNavigation.release(this.homeOffset.current, velocity, { reducedMotion: this.reducedMotion });
    else this.homeNavigation.cancel(this.homeOffset.current, { reducedMotion: this.reducedMotion });
    this.homeOffset.target = this.homeNavigation.position;
  }

  flushScroll(ratio) {
    const input = this.scrollInput;
    if (!this.interactive || !this.webgl) {
      input.pending = 0;
      input.fast = 0;
      input.event = null;
      return;
    }
    if (input.fast) {
      const frameRatio = Math.min(ratio || 0, 4);
      const delta = input.fast * (1 - Math.pow(1 - 0.22, frameRatio));
      input.pending += delta;
      input.fast -= delta;
      if (Math.abs(input.fast) < 0.05) {
        input.pending += input.fast;
        input.fast = 0;
      }
    }
    if (!input.pending) return;
    const delta = input.pending;
    input.pending = 0;
    this.pushScroll(delta, 0, input.event);
    input.event = null;
  }

  bindEvents() {
    this.bound.resize = () => this.resize();
    this.bound.motionChange = (event) => {
      this.reducedMotion = event.matches;
      // Preference changes cancel home momentum immediately rather than letting
      // an in-flight fling continue after reduced motion is requested.
      this.endHomeDrag(null, { fling: false });
      if (this.homeNavigation.busy) {
        this.homeNavigation.reset(this.homeNavigation.target);
        this.homeOffset.current = this.homeOffset.target = this.homeNavigation.position;
        this.homeVelocity = 0;
        this.homeRawVelocity = 0;
      }
    };
    this.bound.wheel = (event) => {
      if (!this.interactive || !this.webgl || event.ctrlKey || this.overlay) return;
      if (this.route !== 'home' && this.route !== 'project') return;
      const input = this.scrollInput;
      const mode = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.vh : 1;
      if (this.route === 'home') {
        if (!this.homeInputTarget(event.target)) return;
        // The gallery owns horizontal/vertical wheel intent while it is the
        // active surface. Controls, overlays and other routes keep native scroll.
        event.preventDefault();
        const { delta, threshold } = normalizeWheelDelta(event, this.vh);
        const direction = this.homeNavigation.wheel(delta, event.timeStamp, {
          settled: this.homeSettled(),
          threshold,
        });
        if (direction) this.stepHome(direction);
        return;
      }
      const delta = event.deltaY * mode;
      const elapsed = event.timeStamp - input.stamp;
      if (elapsed < 30) input.fastStamp = event.timeStamp;
      const fast = Math.abs(delta) >= 40 && elapsed >= 30 && event.timeStamp - input.fastStamp >= 500;
      input.stamp = event.timeStamp;
      if (fast) input.fast += delta * 1.25 * 2;
      else input.pending += delta * 1.25;
      input.event = event;
    };
    // Home touch input is handled by the unified pointer drag below. These
    // legacy touch handlers remain only for the project sheet's vertical run.
    this.bound.touchStart = (event) => {
      if (this.overlay || this.route !== 'project') return;
      const touch = event.targetTouches?.[0] || event;
      this.touchScroll = { x: touch.clientX, y: touch.clientY, delta: 0, moved: false };
    };
    this.bound.touchMove = (event) => {
      if (!this.touchScroll || this.route !== 'project') return;
      const touch = event.targetTouches?.[0] || event;
      const dy = this.touchScroll.y - touch.clientY;
      this.touchScroll.x = touch.clientX;
      this.touchScroll.y = touch.clientY;
      this.touchScroll.delta = dy;
      this.pushScroll(dy * 3.25, 0, event);
    };
    this.bound.touchEnd = (event) => {
      if (this.touchScroll?.delta) this.pushScroll(this.touchScroll.delta * 35, 0, event);
      this.touchScroll = null;
    };
    this.bound.touchCancel = () => { this.touchScroll = null; };
    this.bound.keyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || (event.shiftKey && event.key !== ' ')) return;
      const target = event.target;
      if (target && (target.isContentEditable || /^(input|textarea|select|button|summary|audio|video)$/i.test(target.tagName))) return;
      if (this.route === 'home') {
        if (!this.homeInputTarget(target)) return;
        let direction = 0;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown') direction = 1;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') direction = -1;
        else if (event.key === ' ') direction = event.shiftKey ? -1 : 1;
        else return;
        event.preventDefault();
        if (!event.repeat && this.homeSettled()) this.stepHome(direction);
        return;
      }
      if (target?.tagName === 'A') return;
      const page = this.vh * 0.9;
      let delta = 0;
      if (event.key === 'ArrowDown') delta = 100;
      else if (event.key === 'ArrowUp') delta = -100;
      else if (event.key === 'PageDown') delta = page;
      else if (event.key === 'PageUp') delta = -page;
      else if (event.key === ' ') delta = event.shiftKey ? -page : page;
      else return;
      if (this.route !== 'project') return;
      event.preventDefault();
      this.pushScroll(delta, 0, event);
    };
    this.bound.projectPointerDown = (event) => {
      if (event.button !== 0 || !this.interactive || !this.webgl || this.overlay || this.route !== 'project') return;
      this.suppressClick = false;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('a, button, input, select, textarea, summary, audio[controls], video[controls], [role="button"], [data-no-drag]')) {
        this.projectDrag = null;
        document.documentElement.classList.remove('grabbing');
        return;
      }
      this.projectDrag = {
        x: event.clientX,
        y: event.clientY,
        lastY: event.clientY,
        lastDelta: 0,
        lastTime: 0,
        axis: null,
        scrubTarget: 0,
      };
    };
    this.bound.projectPointerMove = (event) => {
      const drag = this.projectDrag;
      if (!drag || this.route !== 'project') return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.axis) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          if (event.pointerType !== 'mouse') {
            this.projectDrag = null;
            return;
          }
          drag.axis = 'y';
          drag.lastY = event.clientY;
        } else if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          if (!this.beginProjectScrub()) {
            this.projectDrag = null;
            return;
          }
          drag.axis = 'x';
        } else return;
        this.suppressClick = true;
        document.documentElement.classList.add('grabbing');
      }
      event.preventDefault();
      if (drag.axis === 'y') {
        const delta = (drag.lastY - event.clientY) * 1.5;
        drag.lastY = event.clientY;
        drag.lastDelta = delta;
        drag.lastTime = event.timeStamp;
        if (delta) this.pushScroll(delta, 0, event);
        return;
      }
      const value = -dx / (this.vw * 0.8);
      drag.scrubTarget = clamp((0.4 * value) / (1 + 0.8 * Math.abs(value)), -1, 1);
      if (Math.abs(value) > 0.25) this.commitProjectDrag(value > 0 ? 1 : -1);
    };
    this.bound.projectPointerUp = (event, fling = true) => {
      const drag = this.projectDrag;
      if (!drag) return;
      if (drag.axis) this.suppressClick = true;
      if (fling && drag.axis === 'y' && drag.lastDelta && event.timeStamp - drag.lastTime < 100) {
        this.pushScroll(drag.lastDelta * 12, 0, event);
      }
      this.projectDrag = null;
      document.documentElement.classList.remove('grabbing');
      if (drag.axis === 'x') this.releaseProjectScrub();
    };
    this.bound.projectPointerCancel = (event) => this.bound.projectPointerUp(event, false);
    this.bound.pointerMove = (event) => {
      if (event.pointerType === 'mouse') {
        const ball = this.ball;
        ball.tx = event.clientX;
        ball.ty = event.clientY;
        if (!ball.seen) {
          ball.seen = true;
          ball.sx = ball.tx;
          ball.sy = ball.ty;
        }
        this.showBall(true);
        this.mouse.set(event.clientX / this.vw, 1 - event.clientY / this.vh);
      }
      const drag = this.drag;
      if (!drag || event.pointerId !== drag.pointerId || this.route !== 'home' || this.overlay) return;
      const totalX = event.clientX - drag.x;
      const totalY = event.clientY - drag.y;
      if (!drag.axis) {
        const threshold = drag.pointerType === 'mouse' ? 5 : 8;
        // Let vertical touch intent fall through to the page instead of locking
        // the gesture into the horizontal gallery.
        if (drag.pointerType !== 'mouse' && Math.abs(totalY) > threshold && Math.abs(totalY) > Math.abs(totalX) * 1.15) {
          drag.axis = 'y';
          drag.moved = true;
          this.homeClickBlockUntil = performance.now() + 350;
          return;
        }
        if (Math.abs(totalX) <= threshold || Math.abs(totalX) <= Math.abs(totalY) * 1.15) return;
        drag.axis = 'x';
        drag.moved = true;
        drag.origin = this.homeOffset.current;
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
        this.homeNavigation.beginDrag(drag.origin);
        this.homeOffset.target = this.homeNavigation.position;
        this.homeDragVelocity.maxVelocity = this.homeNavigation.spacing * 6.5;
        this.homeDragVelocity.reset(drag.origin, event.timeStamp);
        this.homeCards.forEach((card) => this.hoverCard(card.project.slug, false));
        document.documentElement.classList.add('grabbing');
        drag.captureTarget = drag.downTarget.closest('.home-card') || drag.downTarget.closest('.home') || drag.downTarget;
        try { drag.captureTarget.setPointerCapture?.(drag.pointerId); } catch { /* window listeners still cover release */ }
        return;
      }
      if (drag.axis !== 'x') return;
      event.preventDefault();
      // One gallery pixel per pointer pixel: no old 1.5x / 3.25x input gain.
      // The offset is continuous across the loop seam; rendering wraps it.
      const position = this.homeNavigation.position + (drag.lastX - event.clientX);
      this.homeNavigation.dragTo(position);
      this.homeOffset.target = position;
      this.homeDragVelocity.sample(position, event.timeStamp);
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    };
    this.bound.pointerDown = (event) => {
      if (event.button !== 0 || event.isPrimary === false || !this.interactive || !this.webgl || this.overlay || this.route !== 'home' || this.drag) return;
      if (!this.homeInputTarget(event.target)) return;
      this.suppressClick = false;
      // Catching a moving gallery anchors at its rendered position; the existing
      // damping absorbs the remaining motion instead of jumping to the old target.
      this.homeNavigation.beginDrag(this.homeOffset.current);
      this.homeOffset.target = this.homeNavigation.position;
      this.homeDragVelocity.reset(this.homeOffset.current, event.timeStamp);
      this.drag = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        downTarget: event.target,
        captureTarget: null,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        origin: this.homeOffset.current,
        axis: null,
        moved: false,
      };
    };
    this.bound.pointerUp = (event) => {
      if (this.drag && event.pointerId === this.drag.pointerId) this.endHomeDrag(event, { fling: true });
    };
    this.bound.pointerCancel = (event) => {
      if (this.drag && event.pointerId === this.drag.pointerId) this.endHomeDrag(event, { fling: false });
    };
    this.bound.lostPointerCapture = (event) => {
      if (this.drag && event.pointerId === this.drag.pointerId) this.endHomeDrag(event, { fling: false });
    };
    this.bound.windowBlur = () => this.endHomeDrag(null, { fling: false });
    this.bound.visibilityChange = () => {
      if (document.visibilityState === 'hidden') this.endHomeDrag(null, { fling: false });
    };
    this.bound.click = (event) => {
      if (this.suppressClick || performance.now() < this.homeClickBlockUntil) {
        this.suppressClick = false;
        this.homeClickBlockUntil = 0;
        event.preventDefault();
        event.stopPropagation();
      }
    };
    this.bound.mouseLeave = (event) => {
      if (!event.relatedTarget) this.showBall(false);
      this.lastMouse = null;
    };
    window.addEventListener('resize', this.bound.resize);
    this.motionQuery.addEventListener?.('change', this.bound.motionChange);
    window.addEventListener('wheel', this.bound.wheel, { passive: false });
    window.addEventListener('touchstart', this.bound.touchStart, { passive: true });
    window.addEventListener('touchmove', this.bound.touchMove, { passive: true });
    window.addEventListener('touchend', this.bound.touchEnd, { passive: true });
    window.addEventListener('touchcancel', this.bound.touchCancel, { passive: true });
    window.addEventListener('keydown', this.bound.keyDown);
    window.addEventListener('pointerdown', this.bound.projectPointerDown);
    window.addEventListener('pointermove', this.bound.projectPointerMove, { passive: false });
    window.addEventListener('pointerup', this.bound.projectPointerUp);
    window.addEventListener('pointercancel', this.bound.projectPointerCancel);
    window.addEventListener('pointermove', this.bound.pointerMove, { passive: false });
    window.addEventListener('pointerdown', this.bound.pointerDown);
    window.addEventListener('pointerup', this.bound.pointerUp);
    window.addEventListener('pointercancel', this.bound.pointerCancel);
    window.addEventListener('lostpointercapture', this.bound.lostPointerCapture);
    window.addEventListener('blur', this.bound.windowBlur);
    document.addEventListener('visibilitychange', this.bound.visibilityChange);
    window.addEventListener('click', this.bound.click, true);
    document.documentElement.addEventListener('pointerleave', this.bound.mouseLeave);
  }

  resize() {
    this.vw = Math.max(1, window.innerWidth);
    this.vh = Math.max(1, window.innerHeight);
    this.root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
    this.desktop = this.vw >= 650;
    this.finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    this.frustumH = Math.tan((53.4 * Math.PI) / 360) * this.camera?.position.z || 20.7;
    this.frustumW = this.frustumH * (this.vw / this.vh);
    if (this.renderer) {
      this.renderer.setSize(this.vw, this.vh, false);
      this.camera.aspect = this.vw / this.vh;
      this.camera.updateProjectionMatrix();
      const dpr = this.renderer.getPixelRatio();
      this.target.setSize(Math.round(this.vw * dpr), Math.round(this.vh * dpr));
      this.postMaterial.uniforms.u_aspect.value.set(this.vw / this.vh, 1);
      if (this.trail) {
        const trailHeight = Math.max(1, Math.round((256 * this.vh) / this.vw));
        for (const target of this.trail) target.setSize(256, trailHeight);
        this.trailFresh = false;
        this.trailMaterial.uniforms.u_texel.value.set(1 / 256, 1 / trailHeight);
        this.trailMaterial.uniforms.u_aspect.value = this.vw / this.vh;
        this.postMaterial.uniforms.u_trailTexel.value.set(1 / 256, 1 / trailHeight);
      }
    }
    this.layoutHome(true);
    this.layoutProject(true);
  }

  tick = (now) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.tick);
    const elapsed = Math.max(0, now - this.lastTime);
    const dt = Math.min(0.05, Math.max(0.001, elapsed / 1000));
    this.lastTime = now;
    this.clock += dt;
    this.hole.radius = ((this.desktop ? 60 : 42) * this.root) / 2 / this.vw;

    this.flushScroll(elapsed / (1000 / 60));
    this.updateHome(Math.min(0.2, Math.max(0.001, elapsed / 1000)));
    this.syncProjectScrub(elapsed / (1000 / 60));
    this.updateProject(dt);
    if (this.ready) this.attachHomeVideos();
    if (!this.webgl) return;

    this.syncProjectBackground();
    this.syncBall(dt);
    this.stepTrail(dt);
    const u = this.postMaterial.uniforms;
    u.u_p.value = this.hole.p;
    u.u_radius.value = this.hole.radius;
    u.u_squash.value = this.hole.s;
    const post = this.hole.p > 0.0005 || u.u_ballA.value > 0.0005;
    if (post) this.postTime += dt;
    u.u_time.value = this.postTime;

    // Home and project surfaces share the existing CSS background behind the canvas.
    this.renderer.setClearColor(0x000000, this.route === 'home' || this.route === 'project' ? 0 : 1);
    if (post) {
      this.renderer.setRenderTarget(this.target);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.postScene, this.postCamera);
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.scene, this.camera);
    }
    if (this.hole.p > 0.01) {
      this.updateLlamas(dt);
      this.renderer.render(this.overlayScene, this.camera);
    } else if (this.llamaMesh) {
      this.llamaMesh.visible = false;
      if (this.llamaFrontMesh) this.llamaFrontMesh.visible = false;
    }
  };

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.bound.resize);
    this.motionQuery.removeEventListener?.('change', this.bound.motionChange);
    window.removeEventListener('wheel', this.bound.wheel);
    window.removeEventListener('touchstart', this.bound.touchStart);
    window.removeEventListener('touchmove', this.bound.touchMove);
    window.removeEventListener('touchend', this.bound.touchEnd);
    window.removeEventListener('touchcancel', this.bound.touchCancel);
    window.removeEventListener('keydown', this.bound.keyDown);
    window.removeEventListener('pointerdown', this.bound.projectPointerDown);
    window.removeEventListener('pointermove', this.bound.projectPointerMove);
    window.removeEventListener('pointerup', this.bound.projectPointerUp);
    window.removeEventListener('pointercancel', this.bound.projectPointerCancel);
    window.removeEventListener('pointermove', this.bound.pointerMove);
    window.removeEventListener('pointerdown', this.bound.pointerDown);
    window.removeEventListener('pointerup', this.bound.pointerUp);
    window.removeEventListener('pointercancel', this.bound.pointerCancel);
    window.removeEventListener('lostpointercapture', this.bound.lostPointerCapture);
    window.removeEventListener('blur', this.bound.windowBlur);
    document.removeEventListener('visibilitychange', this.bound.visibilityChange);
    window.removeEventListener('click', this.bound.click, true);
    document.documentElement.removeEventListener('pointerleave', this.bound.mouseLeave);
    this.endHomeDrag(null, { fling: false });
    gsap.killTweensOf(this.hole);
    gsap.killTweensOf(this.ball);
    this.progressTween?.kill();
    this.clearHomeMeshes();
    this.cancelProjectScrub();
    this.cleanupProject();
    for (const video of this.videoCache.values()) {
      video.el.pause();
      video.el.remove();
      video.texture.dispose();
    }
    for (const promise of this.textureCache.values()) promise.then((texture) => texture?.dispose?.());
    this.quadGeometry?.dispose();
    this.target?.dispose();
    this.postMaterial?.dispose();
    this.trailMaterial?.dispose();
    for (const target of this.trail || []) target.dispose();
    this.sky?.material.dispose();
    this.renderer?.dispose();
  }
}
