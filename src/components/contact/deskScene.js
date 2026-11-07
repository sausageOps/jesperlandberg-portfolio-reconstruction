// The Contact "desk" — three.js scene behind the letter form, ported from
// Carter's app/lib/letter.js (function R + helpers). Two paper planes (letter
// sheet + receipt stub) with injected paper grain/tooth GLSL, soft blob
// shadows, a metal paperclip, a foil "CO" stamp, a pointer-following desk
// lamp, and stub parallax. The DOM sheet/stub sit exactly on the planes.
import * as THREE from 'three';
import { gsap } from 'gsap';

const SHEET_PAPER = '#f3f2ef';
const STUB_PAPER = '#f7f7f4';
const COND = { lamp: 0.2, lampD: 460, ambient: 0.94, shadow: 0.4, tooth: 1, foil: 0.3, par: 1 };
/* Carter's sheet offsets, and the fallback when the page does not carry them.
   They are declared in Contact.css as --letter-top / --letter-bottom so the
   tablet/phone rules (bottom-docked navigation, safe-area insets) live in one
   place; sheetOffsets() resolves them to px, including any env() in the value. */
const TOP = 116;
const BOTTOM = 132;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Resolves the sheet offsets from the desk's own CSS. The probe is a hidden,
   fixed-position 1px node inside the desk: it inherits the cascade (so the
   tablet/phone media queries and env() safe-area insets apply), it is never
   painted, and being fixed it cannot extend any scroll area. It is created once
   per desk and lives with it. */
const probes = new WeakMap();

function sheetOffsets(desk) {
  let probe = probes.get(desk);
  if (!probe) {
    probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;visibility:hidden;pointer-events:none';
    desk.appendChild(probe);
    probes.set(desk, probe);
  }
  probe.style.paddingTop = `var(--letter-top, ${TOP}px)`;
  probe.style.paddingBottom = `var(--letter-bottom, ${BOTTOM}px)`;
  const style = getComputedStyle(probe);
  const top = parseFloat(style.paddingTop);
  const bottom = parseFloat(style.paddingBottom);
  return {
    top: Number.isFinite(top) ? top : TOP,
    bottom: Number.isFinite(bottom) ? bottom : BOTTOM,
  };
}

/* Measures the layout: sheet/stub rectangles and full stage height. */
function measure(desk, sheet) {
  const vw = desk.clientWidth;
  const narrow = vw < 760;
  const { top, bottom } = sheetOffsets(desk);
  const sw = narrow ? vw - 32 : Math.round(Math.min(Math.max(vw * 0.56, 560), 800));
  sheet.style.width = `${sw}px`;
  const sh = sheet.offsetHeight;
  const tw = narrow ? Math.min(sw, 300) : Math.round(sw * 0.34);
  const th = Math.round(tw * 1.04);
  if (narrow) {
    const sy = top;
    const tx = Math.round((vw - tw) / 2);
    const ty = Math.round(sy + sh + 40);
    return { vw, narrow, sx: 16, sy, sw, sh, tx, ty, tw, th, stageH: ty + th + bottom };
  }
  const inset = Math.round(tw * 0.45);
  const sx = Math.round((vw - (sw + inset)) / 2);
  const sy = top;
  /* Carter puts the receipt stub 22px above the sheet's top edge (94 vs
     TOP=116), so the paperclip holds the two together. Keep that relation, not
     the absolute 94, or a smaller top offset would slide the stub down the
     sheet. */
  return { vw, narrow, sx, sy, sw, sh, tx: sx + sw - (tw - inset), ty: sy - 22, tw, th, stageH: sy + sh + bottom };
}

const PAPER_GLSL = `
  float pHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float pNoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), f.x),
               mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float pFbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++){ v += a * pNoise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  float paperH(vec2 px, float seed){
    float a = pFbm(px * 0.010 + seed);
    float b = pFbm(px * 0.038 + seed * 2.1);
    return a * 0.62 + b * 0.38;
  }
  float paperT(vec2 px, float seed){
    return pNoise(px * 0.42 + seed * 3.7) * 0.65
         + pNoise(px * 0.95 + seed * 5.3) * 0.35;
  }
`;

/* MeshStandardMaterial + injected paper grain (albedo flecks + normal tooth). */
function paperMaterial(opts) {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(opts.color),
    roughness: 0.96,
    metalness: 0,
    ...(opts.alphaMap ? { alphaMap: opts.alphaMap, transparent: true } : {}),
  });
  material.defines = { ...(material.defines ?? {}), USE_UV: '' };
  const px = { value: new THREE.Vector2(600, 800) };
  const tooth = { value: opts.tooth ?? 1 };
  material.userData.px = px;
  material.userData.tooth = tooth;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPx = px;
    shader.uniforms.uSeed = { value: opts.seed };
    shader.uniforms.uGrain = { value: opts.grain ?? 1 };
    shader.uniforms.uTooth = tooth;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `uniform vec2 uPx; uniform float uSeed; uniform float uGrain; uniform float uTooth;
         ${PAPER_GLSL}
         void main() {`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         vec2 pPx = vUv * uPx;
         float pH = paperH(pPx, uSeed);
         diffuseColor.rgb *= 1.0 + (pH - 0.5) * 0.055 * uGrain;
         float fleck = pHash(floor(pPx * 0.7) + uSeed);
         diffuseColor.rgb *= mix(1.0, 0.9, step(0.9990, fleck) * uGrain);`,
      )
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
         {
           float e = 1.0;
           float t0 = paperT(pPx, uSeed);
           float tx = paperT(pPx + vec2(e, 0.0), uSeed);
           float ty = paperT(pPx + vec2(0.0, e), uSeed);
           float f0 = paperH(pPx, uSeed);
           float fx = paperH(pPx + vec2(6.0, 0.0), uSeed);
           float fy = paperH(pPx + vec2(0.0, 6.0), uSeed);
           vec2 g = vec2((t0 - tx) * 2.2 + (f0 - fx) * 0.8,
                         (t0 - ty) * 2.2 + (f0 - fy) * 0.8);
           normal = normalize(normal + vec3(g * uTooth, 0.0));
         }`,
      );
  };
  const cacheKey = `letter-paper|${opts.alphaMap ? 'a' : 'o'}`;
  material.customProgramCacheKey = () => cacheKey;
  return material;
}

/* Soft blurred blob used as the drop shadow texture for both papers. */
function blobShadow(aspect) {
  const h = Math.round(512 * aspect);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const shrink = 1.4;
  ctx.filter = 'blur(20px)';
  ctx.fillStyle = 'rgba(15,15,15,0.95)';
  ctx.beginPath();
  ctx.roundRect((512 - 512 / shrink) / 2, (h - h / shrink) / 2, 512 / shrink, h / shrink, 4);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

/* Perforated top edge alpha map for the receipt stub. */
function perforationMask(aspect) {
  const h = Math.round(512 * aspect);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 512, h);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, 10);
  for (let i = 0; i <= 42; i++) {
    const x = (i / 42) * 512;
    ctx.lineTo(x, i % 2 ? 0 : 11);
  }
  ctx.lineTo(512, h);
  ctx.closePath();
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

/* "CO" foil stamp alpha/bump (C in a circle, O in a rounded capsule). */
function foilStamp() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(112, 128, 96, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(232, 32, 192, 192, 96);
  ctx.stroke();
  ctx.font = '500 122px "Oracle", "Geist Variable", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('C', 112, 132);
  ctx.fillText('O', 328, 132);
  return new THREE.CanvasTexture(canvas);
}

/* Compiles shaders ahead (Carter's wheels-gl-warm) so the first entrance frame
   never stalls on program compilation. */
function warmRenderer(renderer, scene, camera, budget = 1500) {
  let ready = false;
  const compile = renderer.compileAsync(scene, camera).catch(() => {});
  Promise.race([compile, new Promise((resolve) => setTimeout(resolve, budget))]).then(() => { ready = true; });
  return { ready: () => ready };
}

export function createDeskScene(desk, canvas, sheet, stub) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const cond = { ...COND };
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000);
  camera.position.z = 100;

  // Hand-drawn studio environment (soft overhead gradient + windows) for PBR.
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 1024;
  envCanvas.height = 512;
  {
    const ctx = envCanvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#7a7c80');
    grad.addColorStop(0.5, '#3e3f42');
    grad.addColorStop(1, '#1a1b1d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(150, 40, 300, 150);
    ctx.fillRect(620, 70, 60, 210);
    ctx.fillStyle = '#55555b';
    ctx.fillRect(760, 120, 190, 130);
  }
  const envSource = new THREE.CanvasTexture(envCanvas);
  envSource.mapping = THREE.EquirectangularReflectionMapping;
  envSource.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(envSource);

  const PI = Math.PI;
  const ambient = new THREE.AmbientLight(0xffffff, cond.ambient * PI);
  scene.add(ambient);
  const lamp = new THREE.PointLight(0xffffff, 0, 0, 2);
  scene.add(lamp);
  const fill = new THREE.DirectionalLight(0xffffff, 0.1 * PI);
  fill.position.set(-0.5, 0.6, 1);
  scene.add(fill);
  const applyLevels = () => {
    lamp.intensity = cond.lamp * PI * cond.lampD * cond.lampD;
    ambient.intensity = cond.ambient * PI;
  };
  applyLevels();

  const sheetMat = paperMaterial({ color: SHEET_PAPER, seed: 3.1, tooth: cond.tooth });
  sheetMat.transparent = true;
  const sheetMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sheetMat);
  const shadowTex = blobShadow(1.3);
  const sheetShadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: cond.shadow, depthWrite: false });
  const sheetShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sheetShadowMat);
  const sheetGroup = new THREE.Group();
  sheetGroup.add(sheetShadow, sheetMesh);
  scene.add(sheetGroup);

  const perfTex = perforationMask(1.04);
  const stubMat = paperMaterial({ color: STUB_PAPER, seed: 11.7, grain: 0.45, tooth: 0.35, alphaMap: perfTex });
  const stubMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), stubMat);
  const stubShadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: cond.shadow * 0.8, depthWrite: false });
  const stubShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), stubShadowMat);
  const stubGroup = new THREE.Group();
  stubGroup.add(stubShadow, stubMesh);
  scene.add(stubGroup);

  const clipMat = new THREE.MeshStandardMaterial({
    color: 14080219, metalness: 0.8, roughness: 0.38, envMap: envMap.texture, envMapIntensity: 1.6,
  });
  const clipPoints = [
    [22, 66], [22, 12], [20, 5], [14, 1], [7, 4], [4, 11], [4, 56], [6, 63],
    [11, 67], [16, 63], [18, 56], [18, 16], [16, 12], [12, 10], [9, 12], [8, 17], [8, 48],
  ].map(([x, y]) => new THREE.Vector3(x, -y, 0));
  const clipCurve = new THREE.CatmullRomCurve3(clipPoints, false, 'catmullrom', 0.35);
  const clipMesh = new THREE.Mesh(new THREE.TubeGeometry(clipCurve, 140, 1.5, 10, false), clipMat);
  stubGroup.add(clipMesh);

  const foilTex = foilStamp();
  const foilMat = new THREE.MeshStandardMaterial({
    color: 14277340, metalness: 0.85, roughness: cond.foil, envMap: envMap.texture,
    envMapIntensity: 1.6, alphaMap: foilTex, bumpMap: foilTex, bumpScale: 1.6,
    transparent: true, alphaTest: 0.02,
  });
  const foilMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), foilMat);
  sheetGroup.add(foilMesh);

  const markEl = sheet.querySelector('[data-letter-mark]');
  const place = (mesh, x, y, w, h, z) => {
    mesh.position.set(x + w / 2, -(y + h / 2), z);
    mesh.scale.set(w, h, 1);
  };

  let q = measure(desk, sheet);
  const lift = { y: 0, lift: 0, press: 1 };
  const shadowScale = new THREE.Vector3(1, 1, 1);

  const layout = () => {
    q = measure(desk, sheet);
    desk.style.height = `${q.stageH}px`;
    renderer.setSize(q.vw, q.stageH, false);
    camera.left = 0;
    camera.right = q.vw;
    camera.top = 0;
    camera.bottom = -q.stageH;
    camera.updateProjectionMatrix();
    sheet.style.left = `${q.sx}px`;
    sheet.style.top = `${q.sy}px`;
    stub.style.left = `${q.tx}px`;
    stub.style.top = `${q.ty}px`;
    stub.style.width = `${q.tw}px`;
    stub.style.height = `${q.th}px`;
    place(sheetMesh, q.sx, q.sy, q.sw, q.sh, 0);
    sheetMat.userData.px.value.set(q.sw, q.sh);
    place(sheetShadow, q.sx - q.sw * 0.06, q.sy - q.sh * 0.05 + 8, q.sw * 1.12, q.sh * 1.1, -2);
    shadowScale.copy(sheetShadow.scale);
    place(stubMesh, q.tx, q.ty, q.tw, q.th, 4);
    stubMat.userData.px.value.set(q.tw, q.th);
    place(stubShadow, q.tx - q.tw * 0.07, q.ty - q.th * 0.06 + 6, q.tw * 1.14, q.th * 1.12, 3);
    clipMesh.visible = !q.narrow;
    const clipScale = Math.max(0.9, q.sw / 720);
    clipMesh.position.set(q.tx + 6, -(q.ty + 4), 7);
    clipMesh.scale.set(clipScale, clipScale, clipScale);
    if (markEl) {
      const markRect = markEl.getBoundingClientRect();
      const deskRect = desk.getBoundingClientRect();
      const w = markRect.width;
      const h = markRect.width / 2;
      place(
        foilMesh,
        markRect.left - deskRect.left,
        markRect.top - deskRect.top - lift.y + (markRect.height - h) / 2,
        w, h, 1,
      );
    }
  };
  layout();

  const observer = new ResizeObserver(() => layout());
  observer.observe(sheet);
  const host = canvas.parentElement ?? desk;
  const onWindowResize = () => layout();
  window.addEventListener('resize', onWindowResize, { passive: true });
  void host;

  const pointer = { x: 0.5, y: 0.35, tx: 0.5, ty: 0.35 };
  const ac = new AbortController();
  const { signal } = ac;
  window.addEventListener('pointermove', (event) => {
    const rect = desk.getBoundingClientRect();
    pointer.tx = (event.clientX - rect.left) / Math.max(1, rect.width);
    pointer.ty = (event.clientY - rect.top) / Math.max(1, rect.height);
  }, { signal, passive: true });

  let hidden = document.hidden;
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; }, { signal });

  // Scrolling happens inside the fixed .cletter-scroll layer.
  const scrollLayer = desk.closest('.cletter-scroll');

  const parallax = { x: 0, y: 0 };
  const stubLift = { y: 0 };
  let lastClip = '';
  const tuckUnderStub = () => {
    if (q.narrow) {
      if (lastClip) { sheet.style.clipPath = ''; lastClip = ''; }
      return;
    }
    const right = Math.round(q.tx - q.sx + parallax.x - 8);
    const bottom = Math.round(q.ty + q.th - q.sy + parallax.y + stubLift.y - lift.y + 6);
    const clip = `polygon(0 0, ${right}px 0, ${right}px ${bottom}px, 100% ${bottom}px, 100% 100%, 0 100%)`;
    if (clip !== lastClip) { sheet.style.clipPath = clip; lastClip = clip; }
  };

  const warm = warmRenderer(renderer, scene, camera);
  const frame = () => {
    if (hidden) return;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    lamp.position.set(pointer.x * q.vw, -(pointer.y * q.stageH), cond.lampD);
    if (!q.narrow && cond.par > 0) {
      const scrollInfluence = Math.tanh((scrollLayer ? scrollLayer.scrollTop : window.scrollY) / 600) * 14;
      const targetX = (-(pointer.x - 0.5) * 12 - scrollInfluence * 0.2) * cond.par;
      const targetY = (-(pointer.y - 0.5) * 8 - scrollInfluence) * cond.par;
      parallax.x += (targetX - parallax.x) * 0.08;
      parallax.y += (targetY - parallax.y) * 0.08;
    } else {
      parallax.x += (0 - parallax.x) * 0.08;
      parallax.y += (0 - parallax.y) * 0.08;
    }
    const stubY = parallax.y + stubLift.y;
    stubGroup.position.set(parallax.x, -stubY, 0);
    stub.style.translate = `${parallax.x.toFixed(2)}px ${stubY.toFixed(2)}px`;
    sheetGroup.position.y = -lift.y;
    sheet.style.translate = lift.y ? `0 ${lift.y.toFixed(2)}px` : '';
    const press = (1 + lift.lift * 0.1) * lift.press;
    sheetShadow.scale.set(shadowScale.x * press, shadowScale.y * press, 1);
    tuckUnderStub();
    if (warm.ready()) renderer.render(scene, camera);
  };
  gsap.ticker.add(frame);

  // Ruled lines of the letter body: drawn in by JS, then handed back to CSS.
  const rules = sheet.querySelector('[data-letter-rules]');
  const lineStates = [];
  const paintLines = () => {
    if (rules) rules.style.backgroundSize = lineStates.map((l) => `${(l.v * 100).toFixed(2)}% 1px`).join(',');
  };
  const armLines = () => {
    if (!rules) return 0;
    const count = Math.max(6, Math.round(rules.offsetHeight / 30));
    lineStates.length = 0;
    for (let i = 0; i < count; i++) lineStates.push({ v: 0 });
    rules.style.backgroundImage = lineStates.map(() => 'linear-gradient(var(--prule), var(--prule))').join(',');
    rules.style.backgroundRepeat = 'no-repeat';
    rules.style.backgroundPosition = lineStates.map((_, i) => `0 ${29 + 30 * i}px`).join(',');
    paintLines();
    return count;
  };
  const releaseLines = () => {
    if (!rules) return;
    rules.style.backgroundImage = '';
    rules.style.backgroundSize = '';
    rules.style.backgroundRepeat = '';
    rules.style.backgroundPosition = '';
  };

  const entrance = () => {
    armLines();
    sheetMat.opacity = 0;
    sheetShadowMat.opacity = 0;
    stubShadowMat.opacity = 0;
    foilMat.opacity = 0;
    stubLift.y = q.narrow ? -60 : -(q.ty + q.th + 24);
    lift.y = Math.max(260, Math.round(innerHeight * 0.5));
    lift.lift = 1;
    const tl = gsap.timeline();
    tl.to(sheetMat, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0);
    tl.to(lift, { y: 0, duration: 2.4, ease: 'expo.out' }, 0);
    tl.to(lift, { lift: 0, duration: 2, ease: 'expo.out' }, 0.3);
    tl.to(sheetShadowMat, { opacity: cond.shadow, duration: 1.2, ease: 'expo.out' }, 0);
    tl.to(foilMat, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 0.3);
    tl.to(stubLift, { y: 0, duration: 1.4, ease: 'expo.out' }, 0.8);
    tl.to(stubShadowMat, { opacity: cond.shadow * 0.8, duration: 0.7, ease: 'power2.out' }, 1.05);
    tl.call(() => { sheetMat.transparent = false; }, [], 2.6);
    if (lineStates.length) {
      const step = 0.07;
      tl.to(lineStates, { v: 1, duration: 1.4, ease: 'expo.out', stagger: step, onUpdate: paintLines }, 0.8);
      tl.call(releaseLines, [], 0.8 + step * (lineStates.length - 1) + 1.45);
    }
    return tl;
  };

  const strike = () => {
    gsap.to(lift, { press: 0.985, duration: 0.09, yoyo: true, repeat: 1, ease: 'power2.inOut' });
    gsap.fromTo(
      sheetShadowMat,
      { opacity: sheetShadowMat.opacity * 0.6 },
      { opacity: sheetShadowMat.opacity, duration: 0.6, ease: 'expo.out' },
    );
  };

  return {
    entrance,
    strike,
    dispose() {
      gsap.ticker.remove(frame);
      ac.abort();
      observer.disconnect();
      window.removeEventListener('resize', onWindowResize);
      [shadowTex, perfTex, foilTex, envSource].forEach((t) => t.dispose());
      envMap.texture.dispose();
      pmrem.dispose();
      scene.traverse((obj) => { if (obj.geometry) obj.geometry.dispose(); });
      [sheetMat, sheetShadowMat, stubMat, stubShadowMat, clipMat, foilMat].forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      desk.style.height = '';
      stub.style.translate = '';
      sheet.style.clipPath = '';
      sheet.style.translate = '';
    },
  };
}
