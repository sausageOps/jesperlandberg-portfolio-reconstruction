/* Studio environment (Carter fidelity port).
 * Verbatim port of app/lib/studio-env.js from the Carter source repo (read-only reference):
 * procedural 1024×512 equirect (gradient + whiteboard shapes) -> PMREM env map.
 * REMAPPED IMPORTS ONLY: e(bt='srgb'→THREE.SRGBColorSpace), t(d=CanvasTexture→THREE.CanvasTexture),
 * n(t=PMREMGenerator→THREE.PMREMGenerator); mapping:303 → THREE.EquirectangularReflectionMapping
 * (same numeric value in three's constants table; using the named export for clarity).
 * The pmrem generator is returned for the caller to dispose — disposal happens in the
 * lanyard scene's cleanup (verbatim disposal semantics).
 */
import * as THREE from 'three'

function makeStudioEnv(r) {
  let i = document.createElement('canvas')
  i.width = 1024, i.height = 512
  let e = i.getContext('2d'),
    t = e.createLinearGradient(0, 0, 0, 512)
  t.addColorStop(0, '#6e7075')
  t.addColorStop(0.46, '#3a3b3e')
  t.addColorStop(1, '#17181a')
  e.fillStyle = t, e.fillRect(0, 0, 1024, 512)
  e.fillStyle = '#ffffff', e.fillRect(150, 40, 300, 150)
  e.fillRect(620, 70, 60, 210)
  e.fillStyle = '#4a4a50', e.fillRect(760, 120, 190, 130)
  let a = new THREE.CanvasTexture(i)
  a.mapping = THREE.EquirectangularReflectionMapping // 303
  a.colorSpace = THREE.SRGBColorSpace
  let o = new THREE.PMREMGenerator(r),
    s = o.fromEquirectangular(a)
  a.dispose()
  return { envRT: s, pmrem: o }
}

export { makeStudioEnv }
