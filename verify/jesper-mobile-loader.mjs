import assert from 'node:assert/strict';
import * as THREE from 'three';
import Experience from '../src/jesper/webgl/Experience.js';

// Exercise the same mesh clipping used during the phone loader without a GPU.
const experience = Object.create(Experience.prototype);
const elements = [0, 1, 2].map((index) => ({
  getBoundingClientRect: () => ({ left: 112 + index * 58, top: 419.5, bottom: 424.5, width: 50, height: 5 }),
}));
const previousDocument = globalThis.document;
globalThis.document = { querySelectorAll: () => elements };
Object.assign(experience, {
  blank: new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1),
  quadGeometry: new THREE.PlaneGeometry(1, 1),
  homeGroup: new THREE.Group(),
  reducedMotion: true,
  featured: [],
  bootProgress: { p: 0.5 },
  renderer: { getPixelRatio: () => 2 },
  vw: 390, vh: 844, frustumW: 10, frustumH: 20,
});
try {
  experience.createMobileBootBars();
  experience.updateMobileBootBars();
  const uniforms = experience.mobileBootBars.map(({ mesh }) => mesh.material.uniforms);
  assert.equal(uniforms[0].u_clipOn.value, 0, 'first bar is complete');
  assert.equal(uniforms[1].u_clipOn.value, 1, 'middle bar is clipped');
  assert.equal(uniforms[1].u_clip.value.z, 50, 'half of a 50px bar at DPR 2');
  assert.equal(uniforms[2].u_clip.value.z, 0, 'last bar has not filled');
  assert.equal(uniforms[1].u_clip.value.x, 340, 'clip follows the DOM anchor at DPR 2');
  experience.bootProgress.p = 1;
  experience.updateMobileBootBars();
  assert.ok(uniforms.every((u) => u.u_clipOn.value === 0), 'all clips release at completion');
  experience.clearMobileBootBars();
  assert.equal(experience.homeGroup.children.length, 0, 'boot meshes are removed on handoff');
  assert.equal(experience.mobileBootBars, null);
  console.log('Mobile loader mesh progress and cleanup: OK');
} finally {
  globalThis.document = previousDocument;
  experience.quadGeometry.dispose();
  experience.blank.dispose();
}
