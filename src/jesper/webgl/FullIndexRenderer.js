import * as THREE from 'three';
import { gsap } from '../vendor/gsap-3.15.0.min.js';

// Phone index subset of the reference Ko canvas text shader. Full index labels
// are each a single line: its expo-out rise, fixed ink window and 1.15 pitch
// are the same equations as tF/nF in DZyj3ghP.js.
const vertex = /* glsl */ `
  uniform float u_progress;
  uniform float u_planeH;
  uniform float u_pitch;
  uniform float u_cut;
  varying vec2 vUv;
  varying float vP;
  varying float vYEl;
  varying float vEdgeTop;
  varying float vEdgeBot;
  void main() {
    vUv = uv;
    float lp = clamp(u_progress, 0.0, 1.0);
    lp = 1.0 - pow(2.0, -10.0 * lp);
    vec3 p = position;
    float slide = (1.0 - lp) * u_pitch / u_planeH;
    p.y -= slide;
    vEdgeTop = u_cut + (1.0 - lp) * 1.5;
    vEdgeBot = u_cut + u_pitch;
    vYEl = (0.5 - p.y) * u_planeH;
    vP = lp;
    vec4 w = modelMatrix * vec4(p, 1.0);
    w.y -= (1.0 - lp) * (u_pitch / u_planeH) * modelMatrix[1][1];
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const fragment = /* glsl */ `
  uniform sampler2D u_texture;
  uniform float u_alpha;
  varying vec2 vUv;
  varying float vP;
  varying float vYEl;
  varying float vEdgeTop;
  varying float vEdgeBot;
  void main() {
    float coverage = texture2D(u_texture, vUv).a;
    float show = max(step(vEdgeTop, vYEl) * (1.0 - step(vEdgeBot, vYEl)), step(0.9995, vP));
    gl_FragColor = vec4(1.0, 1.0, 1.0, coverage * u_alpha * show);
  }
`;

function rasterize(el) {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const font = parseFloat(style.fontSize) || 16;
  const padX = Math.ceil(font * 0.35);
  const padY = Math.ceil(font * 0.25);
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const width = rect.width + padX * 2;
  const height = rect.height + padY * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
  if ('textRendering' in ctx) ctx.textRendering = 'optimizeLegibility';
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  const metric = ctx.measureText('Hg');
  const ascent = metric.fontBoundingBoxAscent ?? font * 0.8;
  const descent = metric.fontBoundingBoxDescent ?? font * 0.25;
  ctx.fillText(el.textContent.trim(), padX, padY + rect.height / 2 + (ascent - descent) / 2);
  const range = document.createRange();
  range.selectNodeContents(el);
  const line = range.getBoundingClientRect();
  const lineHeight = line.height || rect.height;
  const cut = padY + line.top - rect.top;
  const top = 0.5 - cut / height;
  const bottom = 0.5 - (cut + lineHeight) / height;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, top, 0, 0.5, top, 0, -0.5, bottom, 0, 0.5, bottom, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, top + 0.5, 1, top + 0.5, 0, bottom + 0.5, 1, bottom + 0.5], 2));
  geometry.setIndex([0, 2, 1, 1, 2, 3]);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return { rect, padX, padY, width, height, texture, geometry, cut, pitch: lineHeight * 1.15 };
}

export default class FullIndexRenderer {
  constructor(experience, names, dots) {
    this.experience = experience;
    this.names = names;
    this.dots = dots;
    this.group = new THREE.Group();
    this.experience.scene.add(this.group);
    this.items = [];
    this.frame = null;
    this.disposed = false;
    this.items = [...names.map((el, index) => this.create(el, index, false)), ...dots.map((el, index) => this.create(el, index, true))];
    this.resize = () => this.layout(true);
    window.addEventListener('resize', this.resize);
    this.layout(false);
    this.tick();
  }

  create(el, index, dot) {
    const data = rasterize(el);
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { u_texture: { value: data.texture }, u_alpha: { value: 1 }, u_progress: { value: dot ? 1 : 0 }, u_planeH: { value: data.height }, u_pitch: { value: data.pitch }, u_cut: { value: data.cut } },
      transparent: true, depthTest: false, depthWrite: false,
    });
    const mesh = new THREE.Mesh(data.geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 3;
    this.group.add(mesh);
    const item = { el, index, dot, mesh, data, pop: dot ? 0 : 1, visible: true };
    if (dot) gsap.to(item, { pop: 1, duration: this.experience.reducedMotion ? 0 : 0.5, delay: this.experience.reducedMotion ? 0 : 0.4 + Math.min(index * 0.03, 0.55), ease: 'back.out(1.7)' });
    else gsap.to(material.uniforms.u_progress, { value: 1, duration: this.experience.reducedMotion ? 0 : 1.1, delay: this.experience.reducedMotion ? 0 : Math.min(index * 0.03, 0.55), ease: 'none' });
    return item;
  }

  layout(rerasterize) {
    if (this.disposed) return;
    for (const item of this.items) {
      if (rerasterize) {
        const old = item.data;
        item.data = rasterize(item.el);
        item.mesh.geometry = item.data.geometry;
        const u = item.mesh.material.uniforms;
        u.u_texture.value = item.data.texture;
        u.u_planeH.value = item.data.height;
        u.u_pitch.value = item.data.pitch;
        u.u_cut.value = item.data.cut;
        old.texture.dispose(); old.geometry.dispose();
      }
      const { rect, padX, padY, width, height } = item.data;
      item.pose = this.experience.rectToPose({ x: rect.left - padX, y: rect.top - padY, width, height });
      if (item.dot) {
        const first = this.names[item.index].getBoundingClientRect();
        const next = this.names[item.index + 1].getBoundingClientRect();
        item.visible = Math.abs(first.top - next.top) < first.height / 2;
      }
    }
  }

  tick = () => {
    if (this.disposed || this.experience.destroyed) return;
    for (const item of this.items) {
      item.mesh.position.copy(item.pose.pos);
      item.mesh.scale.copy(item.pose.scale).multiplyScalar(item.pop);
      item.mesh.visible = item.visible && item.pop > 0.0001;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  // The selected word is redrawn at the destination's font resolution and
  // flown by the project renderer; keep it out of the index's exit fade.
  hideName(index) {
    const item = this.items.find((entry) => !entry.dot && entry.index === index);
    if (item) { item.visible = false; item.mesh.visible = false; }
  }

  dispose(fade = true) {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    for (const item of this.items) {
      gsap.killTweensOf(item);
      gsap.killTweensOf(item.mesh.material.uniforms.u_progress);
    }
    const finish = () => {
      this.group.removeFromParent();
      for (const { mesh, data } of this.items) { data.texture.dispose(); data.geometry.dispose(); mesh.material.dispose(); }
    };
    if (fade && !this.experience.destroyed && !this.experience.reducedMotion && window.matchMedia('(max-width: 649px)').matches) {
      gsap.to(this.items.map(({ mesh }) => mesh.material.uniforms.u_alpha), { value: 0, duration: 0.25, ease: 'power1.out', onComplete: finish });
    } else finish();
  }
}
