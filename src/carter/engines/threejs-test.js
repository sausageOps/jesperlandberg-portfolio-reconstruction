/**
 * Carter's ThreeJs Scene Lab experiment engine — Phase 5G port.
 *
 * Source (read-only): `app/lib/experiments/threejs-test.js` (body byte-identical
 * to `src/threejs-test.CNSPgjYT.js`) and `src/RoomEnvironment.CsPbsEjR.js` at
 * `sausageOps/carterogunsola-reconstruction@3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249`.
 *
 * Adaptations for Jesper's Carter integration:
 * 1. Inline `#exp-three-style` `<style>` injection → `pages/lab/threejs-test.css`
 *    scoped under `:where(.carter)` (plus `.spin` scoped to `:where(.carter .tj)`).
 * 2. Three.js imports point at Jesper's installed `three` (`^0.180.0`) and
 *    `three/examples/jsm/loaders/GLTFLoader.js` instead of Carter's bundled
 *    `src/three.module.DBbmgHoE.js` / `src/GLTFLoader.BD7CsO-c.js` chunks.
 *    Carter's `RoomEnvironment` (`src/RoomEnvironment.CsPbsEjR.js`, r185) is
 *    inlined verbatim below because r185 shifts `this.position.y = -3.5` vs
 *    r180's `0`, keeping the baked matcap lighting identical. `OrbitControls`
 *    and `MeshSurfaceSampler` were already embedded in `threejs-test.js` and
 *    stay verbatim.
 * 3. Theme observation uses `observeCarterTheme` on `.carter[data-theme]` when
 *    the Carter frame is bound (falling back to `document.documentElement` for
 *    standalone harness mounts).
 * 4. Complete, idempotent `onDestroy` teardown: aborts button listeners, cancels
 *    rAF, disconnects `ResizeObserver` and theme observer, removes reduced-motion
 *    control listener, disposes `OrbitControls` (including `keyup` on root node)
 *    before detaching canvas, disposes all model/superformula/sampled geometries,
 *    materials, matcap render target/PMREM/RoomEnvironment, discarded glTF PBR
 *    materials/textures (including late async resolves after unmount), calls
 *    `renderer.dispose()` + `renderer.forceContextLoss()`, and removes `.tj`
 *    (also cleaning up `.tj` if `WebGLRenderer` creation throws).
 */
import {
  BackSide,
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Controls,
  DirectionalLight,
  Group,
  InstancedMesh,
  LinearFilter,
  MOUSE,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshMatcapMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  PMREMGenerator,
  PerspectiveCamera,
  Plane,
  PointLight,
  Points,
  PointsMaterial,
  Quaternion,
  Ray,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  Spherical,
  TOUCH,
  Triangle,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getCarterRoot, observeCarterTheme, onDestroy } from '../runtime.js';

/* --------------------------------------------------- Carter RoomEnvironment */
/* Verbatim from Carter's `src/RoomEnvironment.CsPbsEjR.js` (three r185, incl.
   `this.position.y = -3.5` which r180's jsm RoomEnvironment lacks). */

function createAreaLightMaterial(intensity) {
  return new MeshLambertMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveIntensity: intensity,
  });
}

class CarterRoomEnvironment extends Scene {
  constructor() {
    super();
    this.name = 'RoomEnvironment';
    this.position.y = -3.5;

    const geometry = new BoxGeometry();
    geometry.deleteAttribute('uv');

    const roomMaterial = new MeshStandardMaterial({ side: BackSide });
    const boxMaterial = new MeshStandardMaterial();

    const mainLight = new PointLight(0xffffff, 900, 28, 2);
    mainLight.position.set(0.418, 16.199, 0.3);
    this.add(mainLight);

    const room = new Mesh(geometry, roomMaterial);
    room.position.set(-0.757, 13.219, 0.717);
    room.scale.set(31.713, 28.305, 28.591);
    this.add(room);

    const boxes = new InstancedMesh(geometry, boxMaterial, 6);
    const transform = new Object3D();

    transform.position.set(-10.906, 2.009, 1.846);
    transform.rotation.set(0, -0.195, 0);
    transform.scale.set(2.328, 7.905, 4.651);
    transform.updateMatrix();
    boxes.setMatrixAt(0, transform.matrix);

    transform.position.set(-5.607, -0.754, -0.758);
    transform.rotation.set(0, 0.994, 0);
    transform.scale.set(1.97, 1.534, 3.955);
    transform.updateMatrix();
    boxes.setMatrixAt(1, transform.matrix);

    transform.position.set(6.167, 0.857, 7.803);
    transform.rotation.set(0, 0.561, 0);
    transform.scale.set(3.927, 6.285, 3.687);
    transform.updateMatrix();
    boxes.setMatrixAt(2, transform.matrix);

    transform.position.set(-2.017, 0.018, 6.124);
    transform.rotation.set(0, 0.333, 0);
    transform.scale.set(2.002, 4.566, 2.064);
    transform.updateMatrix();
    boxes.setMatrixAt(3, transform.matrix);

    transform.position.set(2.291, -0.756, -2.621);
    transform.rotation.set(0, -0.286, 0);
    transform.scale.set(1.546, 1.552, 1.496);
    transform.updateMatrix();
    boxes.setMatrixAt(4, transform.matrix);

    transform.position.set(-2.193, -0.369, -5.547);
    transform.rotation.set(0, 0.516, 0);
    transform.scale.set(3.875, 3.487, 2.986);
    transform.updateMatrix();
    boxes.setMatrixAt(5, transform.matrix);

    this.add(boxes);

    const light1 = new Mesh(geometry, createAreaLightMaterial(50));
    light1.position.set(-16.116, 14.37, 8.208);
    light1.scale.set(0.1, 2.428, 2.739);
    this.add(light1);

    const light2 = new Mesh(geometry, createAreaLightMaterial(50));
    light2.position.set(-16.109, 18.021, -8.207);
    light2.scale.set(0.1, 2.425, 2.751);
    this.add(light2);

    const light3 = new Mesh(geometry, createAreaLightMaterial(17));
    light3.position.set(14.904, 12.198, -1.832);
    light3.scale.set(0.15, 4.265, 6.331);
    this.add(light3);

    const light4 = new Mesh(geometry, createAreaLightMaterial(43));
    light4.position.set(-0.462, 8.89, 14.52);
    light4.scale.set(4.38, 5.441, 0.088);
    this.add(light4);

    const light5 = new Mesh(geometry, createAreaLightMaterial(20));
    light5.position.set(3.235, 11.486, -12.541);
    light5.scale.set(2.5, 2.0, 0.1);
    this.add(light5);

    const light6 = new Mesh(geometry, createAreaLightMaterial(100));
    light6.position.set(0, 20, 0);
    light6.scale.set(1, 0.1, 1);
    this.add(light6);
  }

  dispose() {
    const resources = new Set();
    this.traverse((object) => {
      if (object.isMesh) {
        resources.add(object.geometry);
        resources.add(object.material);
      }
    });
    for (const resource of resources) resource.dispose();
  }
}

/* ----------------------------------------------------- Carter OrbitControls */
/* Verbatim from `app/lib/experiments/threejs-test.js` (`de`). */

const CHANGE_EVENT = { type: 'change' };
const START_EVENT = { type: 'start' };
const END_EVENT = { type: 'end' };
const _ray = new Ray();
const _plane = new Plane();
const TILT_LIMIT = Math.cos(70 * MathUtils.DEG2RAD);
const _offset = new Vector3();
const TWO_PI = 2 * Math.PI;
const STATE = {
  NONE: -1,
  ROTATE: 0,
  DOLLY: 1,
  PAN: 2,
  TOUCH_ROTATE: 3,
  TOUCH_PAN: 4,
  TOUCH_DOLLY_PAN: 5,
  TOUCH_DOLLY_ROTATE: 6,
};
const EPS = 1e-6;

class CarterOrbitControls extends Controls {
  constructor(object, domElement = null) {
    super(object, domElement);
    this.state = STATE.NONE;
    this.target = new Vector3();
    this.cursor = new Vector3();
    this.minDistance = 0;
    this.maxDistance = Infinity;
    this.minZoom = 0;
    this.maxZoom = Infinity;
    this.minTargetRadius = 0;
    this.maxTargetRadius = Infinity;
    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;
    this.minAzimuthAngle = -Infinity;
    this.maxAzimuthAngle = Infinity;
    this.enableDamping = false;
    this.dampingFactor = 0.05;
    this.enableZoom = true;
    this.zoomSpeed = 1;
    this.enableRotate = true;
    this.rotateSpeed = 1;
    this.keyRotateSpeed = 1;
    this.enablePan = true;
    this.panSpeed = 1;
    this.screenSpacePanning = true;
    this.keyPanSpeed = 7;
    this.zoomToCursor = false;
    this.autoRotate = false;
    this.autoRotateSpeed = 2;
    this.keys = {
      LEFT: 'ArrowLeft',
      UP: 'ArrowUp',
      RIGHT: 'ArrowRight',
      BOTTOM: 'ArrowDown',
    };
    this.mouseButtons = {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN,
    };
    this.touches = {
      ONE: TOUCH.ROTATE,
      TWO: TOUCH.DOLLY_PAN,
    };
    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.zoom0 = this.object.zoom;
    this._cursorStyle = 'auto';
    this._domElementKeyEvents = null;
    this._lastPosition = new Vector3();
    this._lastQuaternion = new Quaternion();
    this._lastTargetPosition = new Vector3();
    this._quat = new Quaternion().setFromUnitVectors(object.up, new Vector3(0, 1, 0));
    this._quatInverse = this._quat.clone().invert();
    this._spherical = new Spherical();
    this._sphericalDelta = new Spherical();
    this._scale = 1;
    this._panOffset = new Vector3();
    this._rotateStart = new Vector2();
    this._rotateEnd = new Vector2();
    this._rotateDelta = new Vector2();
    this._panStart = new Vector2();
    this._panEnd = new Vector2();
    this._panDelta = new Vector2();
    this._dollyStart = new Vector2();
    this._dollyEnd = new Vector2();
    this._dollyDelta = new Vector2();
    this._dollyDirection = new Vector3();
    this._mouse = new Vector2();
    this._performCursorZoom = false;
    this._pointers = [];
    this._pointerPositions = {};
    this._controlActive = false;
    this._onPointerMove = onPointerMove.bind(this);
    this._onPointerDown = onPointerDown.bind(this);
    this._onPointerUp = onPointerUp.bind(this);
    this._onContextMenu = onContextMenu.bind(this);
    this._onMouseWheel = onMouseWheel.bind(this);
    this._onKeyDown = onKeyDown.bind(this);
    this._onTouchStart = onTouchStart.bind(this);
    this._onTouchMove = onTouchMove.bind(this);
    this._onMouseDown = onMouseDown.bind(this);
    this._onMouseMove = onMouseMove.bind(this);
    this._interceptControlDown = interceptControlDown.bind(this);
    this._interceptControlUp = interceptControlUp.bind(this);
    if (this.domElement !== null) this.connect(this.domElement);
    this.update();
  }

  set cursorStyle(value) {
    this._cursorStyle = value;
    this.domElement.style.cursor = value === 'grab' ? 'grab' : 'auto';
  }

  get cursorStyle() {
    return this._cursorStyle;
  }

  connect(element) {
    super.connect(element);
    this.domElement.addEventListener('pointerdown', this._onPointerDown);
    this.domElement.addEventListener('pointercancel', this._onPointerUp);
    this.domElement.addEventListener('contextmenu', this._onContextMenu);
    this.domElement.addEventListener('wheel', this._onMouseWheel, { passive: false });
    this.domElement
      .getRootNode()
      .addEventListener('keydown', this._interceptControlDown, { passive: true, capture: true });
    this.domElement.style.touchAction = 'none';
  }

  disconnect() {
    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.domElement.ownerDocument.removeEventListener('pointermove', this._onPointerMove);
    this.domElement.ownerDocument.removeEventListener('pointerup', this._onPointerUp);
    this.domElement.removeEventListener('pointercancel', this._onPointerUp);
    this.domElement.removeEventListener('wheel', this._onMouseWheel);
    this.domElement.removeEventListener('contextmenu', this._onContextMenu);
    this.stopListenToKeyEvents();
    const rootNode = this.domElement.getRootNode();
    rootNode.removeEventListener('keydown', this._interceptControlDown, { capture: true });
    rootNode.removeEventListener('keyup', this._interceptControlUp, { capture: true });
    this._controlActive = false;
    this.domElement.style.touchAction = '';
  }

  dispose() {
    this.disconnect();
  }

  getPolarAngle() {
    return this._spherical.phi;
  }

  getAzimuthalAngle() {
    return this._spherical.theta;
  }

  getDistance() {
    return this.object.position.distanceTo(this.target);
  }

  listenToKeyEvents(domElement) {
    domElement.addEventListener('keydown', this._onKeyDown);
    this._domElementKeyEvents = domElement;
  }

  stopListenToKeyEvents() {
    if (this._domElementKeyEvents !== null) {
      this._domElementKeyEvents.removeEventListener('keydown', this._onKeyDown);
      this._domElementKeyEvents = null;
    }
  }

  saveState() {
    this.target0.copy(this.target);
    this.position0.copy(this.object.position);
    this.zoom0 = this.object.zoom;
  }

  reset() {
    this.target.copy(this.target0);
    this.object.position.copy(this.position0);
    this.object.zoom = this.zoom0;
    this.object.updateProjectionMatrix();
    this.dispatchEvent(CHANGE_EVENT);
    this.update();
    this.state = STATE.NONE;
  }

  pan(deltaX, deltaY) {
    this._pan(deltaX, deltaY);
    this.update();
  }

  dollyIn(dollyScale) {
    this._dollyIn(dollyScale);
    this.update();
  }

  dollyOut(dollyScale) {
    this._dollyOut(dollyScale);
    this.update();
  }

  rotateLeft(angle) {
    this._rotateLeft(angle);
    this.update();
  }

  rotateUp(angle) {
    this._rotateUp(angle);
    this.update();
  }

  update(deltaTime = null) {
    const position = this.object.position;
    _offset.copy(position).sub(this.target);
    _offset.applyQuaternion(this._quat);
    this._spherical.setFromVector3(_offset);

    if (this.autoRotate && this.state === STATE.NONE) {
      this._rotateLeft(this._getAutoRotationAngle(deltaTime));
    }

    if (this.enableDamping) {
      this._spherical.theta += this._sphericalDelta.theta * this.dampingFactor;
      this._spherical.phi += this._sphericalDelta.phi * this.dampingFactor;
    } else {
      this._spherical.theta += this._sphericalDelta.theta;
      this._spherical.phi += this._sphericalDelta.phi;
    }

    let min = this.minAzimuthAngle;
    let max = this.maxAzimuthAngle;
    if (isFinite(min) && isFinite(max)) {
      if (min < -Math.PI) min += TWO_PI;
      else if (min > Math.PI) min -= TWO_PI;
      if (max < -Math.PI) max += TWO_PI;
      else if (max > Math.PI) max -= TWO_PI;
      if (min <= max) {
        this._spherical.theta = Math.max(min, Math.min(max, this._spherical.theta));
      } else {
        this._spherical.theta =
          this._spherical.theta > (min + max) / 2
            ? Math.max(min, this._spherical.theta)
            : Math.min(max, this._spherical.theta);
      }
    }

    this._spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this._spherical.phi));
    this._spherical.makeSafe();

    if (this.enableDamping === true) {
      this.target.addScaledVector(this._panOffset, this.dampingFactor);
    } else {
      this.target.add(this._panOffset);
    }

    this.target.sub(this.cursor);
    this.target.clampLength(this.minTargetRadius, this.maxTargetRadius);
    this.target.add(this.cursor);

    let zoomChanged = false;
    if ((this.zoomToCursor && this._performCursorZoom) || this.object.isOrthographicCamera) {
      this._spherical.radius = this._clampDistance(this._spherical.radius);
    } else {
      const prevRadius = this._spherical.radius;
      this._spherical.radius = this._clampDistance(this._spherical.radius * this._scale);
      zoomChanged = prevRadius != this._spherical.radius;
    }

    _offset.setFromSpherical(this._spherical);
    _offset.applyQuaternion(this._quatInverse);
    position.copy(this.target).add(_offset);
    this.object.lookAt(this.target);

    if (this.enableDamping === true) {
      this._sphericalDelta.theta *= 1 - this.dampingFactor;
      this._sphericalDelta.phi *= 1 - this.dampingFactor;
      this._panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      this._sphericalDelta.set(0, 0, 0);
      this._panOffset.set(0, 0, 0);
    }

    if (this.zoomToCursor && this._performCursorZoom) {
      let newRadius = null;
      if (this.object.isPerspectiveCamera) {
        const prevRadius = _offset.length();
        newRadius = this._clampDistance(prevRadius * this._scale);
        const radiusDelta = prevRadius - newRadius;
        this.object.position.addScaledVector(this._dollyDirection, radiusDelta);
        this.object.updateMatrixWorld();
        zoomChanged = !!radiusDelta;
      } else if (this.object.isOrthographicCamera) {
        const mouseBefore = new Vector3(this._mouse.x, this._mouse.y, 0);
        mouseBefore.unproject(this.object);
        const prevZoom = this.object.zoom;
        this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / this._scale));
        this.object.updateProjectionMatrix();
        zoomChanged = prevZoom !== this.object.zoom;
        const mouseAfter = new Vector3(this._mouse.x, this._mouse.y, 0);
        mouseAfter.unproject(this.object);
        this.object.position.sub(mouseAfter).add(mouseBefore);
        this.object.updateMatrixWorld();
        newRadius = _offset.length();
      } else {
        console.warn('WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled.');
        this.zoomToCursor = false;
      }

      if (newRadius !== null) {
        if (this.screenSpacePanning) {
          this.target
            .set(0, 0, -1)
            .transformDirection(this.object.matrix)
            .multiplyScalar(newRadius)
            .add(this.object.position);
        } else {
          _ray.origin.copy(this.object.position);
          _ray.direction.set(0, 0, -1).transformDirection(this.object.matrix);
          if (Math.abs(this.object.up.dot(_ray.direction)) < TILT_LIMIT) {
            this.object.lookAt(this.target);
          } else {
            _plane.setFromNormalAndCoplanarPoint(this.object.up, this.target);
            _ray.intersectPlane(_plane, this.target);
          }
        }
      }
    } else if (this.object.isOrthographicCamera) {
      const prevZoom = this.object.zoom;
      this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / this._scale));
      if (prevZoom !== this.object.zoom) {
        this.object.updateProjectionMatrix();
        zoomChanged = true;
      }
    }

    this._scale = 1;
    this._performCursorZoom = false;

    if (
      zoomChanged ||
      this._lastPosition.distanceToSquared(this.object.position) > EPS ||
      8 * (1 - this._lastQuaternion.dot(this.object.quaternion)) > EPS ||
      this._lastTargetPosition.distanceToSquared(this.target) > EPS
    ) {
      this.dispatchEvent(CHANGE_EVENT);
      this._lastPosition.copy(this.object.position);
      this._lastQuaternion.copy(this.object.quaternion);
      this._lastTargetPosition.copy(this.target);
      return true;
    }

    return false;
  }

  _getAutoRotationAngle(deltaTime) {
    return deltaTime === null
      ? ((TWO_PI / 60 / 60) * this.autoRotateSpeed)
      : ((TWO_PI / 60) * this.autoRotateSpeed * deltaTime);
  }

  _getZoomScale(delta) {
    const normalizedDelta = Math.abs(delta * 0.01);
    return 0.95 ** (this.zoomSpeed * normalizedDelta);
  }

  _rotateLeft(angle) {
    this._sphericalDelta.theta -= angle;
  }

  _rotateUp(angle) {
    this._sphericalDelta.phi -= angle;
  }

  _panLeft(distance, objectMatrix) {
    _offset.setFromMatrixColumn(objectMatrix, 0);
    _offset.multiplyScalar(-distance);
    this._panOffset.add(_offset);
  }

  _panUp(distance, objectMatrix) {
    if (this.screenSpacePanning === true) {
      _offset.setFromMatrixColumn(objectMatrix, 1);
    } else {
      _offset.setFromMatrixColumn(objectMatrix, 0);
      _offset.crossVectors(this.object.up, _offset);
    }
    _offset.multiplyScalar(distance);
    this._panOffset.add(_offset);
  }

  _pan(deltaX, deltaY) {
    const element = this.domElement;
    if (this.object.isPerspectiveCamera) {
      const position = this.object.position;
      _offset.copy(position).sub(this.target);
      let targetDistance = _offset.length();
      targetDistance *= Math.tan(((this.object.fov / 2) * Math.PI) / 180);
      this._panLeft((2 * deltaX * targetDistance) / element.clientHeight, this.object.matrix);
      this._panUp((2 * deltaY * targetDistance) / element.clientHeight, this.object.matrix);
    } else if (this.object.isOrthographicCamera) {
      this._panLeft(
        (deltaX * (this.object.right - this.object.left)) / this.object.zoom / element.clientWidth,
        this.object.matrix,
      );
      this._panUp(
        (deltaY * (this.object.top - this.object.bottom)) / this.object.zoom / element.clientHeight,
        this.object.matrix,
      );
    } else {
      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
      this.enablePan = false;
    }
  }

  _dollyOut(dollyScale) {
    if (this.object.isPerspectiveCamera || this.object.isOrthographicCamera) {
      this._scale /= dollyScale;
    } else {
      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      this.enableZoom = false;
    }
  }

  _dollyIn(dollyScale) {
    if (this.object.isPerspectiveCamera || this.object.isOrthographicCamera) {
      this._scale *= dollyScale;
    } else {
      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      this.enableZoom = false;
    }
  }

  _updateZoomParameters(x, y) {
    if (!this.zoomToCursor) return;
    this._performCursorZoom = true;
    const rect = this.domElement.getBoundingClientRect();
    const dx = x - rect.left;
    const dy = y - rect.top;
    const w = rect.width;
    const h = rect.height;
    this._mouse.x = (dx / w) * 2 - 1;
    this._mouse.y = -(dy / h) * 2 + 1;
    this._dollyDirection
      .set(this._mouse.x, this._mouse.y, 1)
      .unproject(this.object)
      .sub(this.object.position)
      .normalize();
  }

  _clampDistance(dist) {
    return Math.max(this.minDistance, Math.min(this.maxDistance, dist));
  }

  _handleMouseDownRotate(event) {
    this._rotateStart.set(event.clientX, event.clientY);
  }

  _handleMouseDownDolly(event) {
    this._updateZoomParameters(event.clientX, event.clientX);
    this._dollyStart.set(event.clientX, event.clientY);
  }

  _handleMouseDownPan(event) {
    this._panStart.set(event.clientX, event.clientY);
  }

  _handleMouseMoveRotate(event) {
    this._rotateEnd.set(event.clientX, event.clientY);
    this._rotateDelta.subVectors(this._rotateEnd, this._rotateStart).multiplyScalar(this.rotateSpeed);
    const element = this.domElement;
    this._rotateLeft((TWO_PI * this._rotateDelta.x) / element.clientHeight);
    this._rotateUp((TWO_PI * this._rotateDelta.y) / element.clientHeight);
    this._rotateStart.copy(this._rotateEnd);
    this.update();
  }

  _handleMouseMoveDolly(event) {
    this._dollyEnd.set(event.clientX, event.clientY);
    this._dollyDelta.subVectors(this._dollyEnd, this._dollyStart);
    if (this._dollyDelta.y > 0) {
      this._dollyOut(this._getZoomScale(this._dollyDelta.y));
    } else if (this._dollyDelta.y < 0) {
      this._dollyIn(this._getZoomScale(this._dollyDelta.y));
    }
    this._dollyStart.copy(this._dollyEnd);
    this.update();
  }

  _handleMouseMovePan(event) {
    this._panEnd.set(event.clientX, event.clientY);
    this._panDelta.subVectors(this._panEnd, this._panStart).multiplyScalar(this.panSpeed);
    this._pan(this._panDelta.x, this._panDelta.y);
    this._panStart.copy(this._panEnd);
    this.update();
  }

  _handleMouseWheel(event) {
    this._updateZoomParameters(event.clientX, event.clientY);
    if (event.deltaY < 0) {
      this._dollyIn(this._getZoomScale(event.deltaY));
    } else if (event.deltaY > 0) {
      this._dollyOut(this._getZoomScale(event.deltaY));
    }
    this.update();
  }

  _handleKeyDown(event) {
    let needsUpdate = false;
    switch (event.code) {
      case this.keys.UP:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.enableRotate) this._rotateUp((TWO_PI * this.keyRotateSpeed) / this.domElement.clientHeight);
        } else if (this.enablePan) {
          this._pan(0, this.keyPanSpeed);
        }
        needsUpdate = true;
        break;
      case this.keys.BOTTOM:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.enableRotate) this._rotateUp((-TWO_PI * this.keyRotateSpeed) / this.domElement.clientHeight);
        } else if (this.enablePan) {
          this._pan(0, -this.keyPanSpeed);
        }
        needsUpdate = true;
        break;
      case this.keys.LEFT:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.enableRotate) this._rotateLeft((TWO_PI * this.keyRotateSpeed) / this.domElement.clientHeight);
        } else if (this.enablePan) {
          this._pan(this.keyPanSpeed, 0);
        }
        needsUpdate = true;
        break;
      case this.keys.RIGHT:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.enableRotate) this._rotateLeft((-TWO_PI * this.keyRotateSpeed) / this.domElement.clientHeight);
        } else if (this.enablePan) {
          this._pan(-this.keyPanSpeed, 0);
        }
        needsUpdate = true;
        break;
    }
    if (needsUpdate) {
      event.preventDefault();
      this.update();
    }
  }

  _handleTouchStartRotate(event) {
    if (this._pointers.length === 1) {
      this._rotateStart.set(event.pageX, event.pageY);
    } else {
      const position = this._getSecondPointerPosition(event);
      const x = 0.5 * (event.pageX + position.x);
      const y = 0.5 * (event.pageY + position.y);
      this._rotateStart.set(x, y);
    }
  }

  _handleTouchStartPan(event) {
    if (this._pointers.length === 1) {
      this._panStart.set(event.pageX, event.pageY);
    } else {
      const position = this._getSecondPointerPosition(event);
      const x = 0.5 * (event.pageX + position.x);
      const y = 0.5 * (event.pageY + position.y);
      this._panStart.set(x, y);
    }
  }

  _handleTouchStartDolly(event) {
    const position = this._getSecondPointerPosition(event);
    const dx = event.pageX - position.x;
    const dy = event.pageY - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    this._dollyStart.set(0, distance);
  }

  _handleTouchStartDollyPan(event) {
    if (this.enableZoom) this._handleTouchStartDolly(event);
    if (this.enablePan) this._handleTouchStartPan(event);
  }

  _handleTouchStartDollyRotate(event) {
    if (this.enableZoom) this._handleTouchStartDolly(event);
    if (this.enableRotate) this._handleTouchStartRotate(event);
  }

  _handleTouchMoveRotate(event) {
    if (this._pointers.length == 1) {
      this._rotateEnd.set(event.pageX, event.pageY);
    } else {
      const position = this._getSecondPointerPosition(event);
      const x = 0.5 * (event.pageX + position.x);
      const y = 0.5 * (event.pageY + position.y);
      this._rotateEnd.set(x, y);
    }
    this._rotateDelta.subVectors(this._rotateEnd, this._rotateStart).multiplyScalar(this.rotateSpeed);
    const element = this.domElement;
    this._rotateLeft((TWO_PI * this._rotateDelta.x) / element.clientHeight);
    this._rotateUp((TWO_PI * this._rotateDelta.y) / element.clientHeight);
    this._rotateStart.copy(this._rotateEnd);
  }

  _handleTouchMovePan(event) {
    if (this._pointers.length === 1) {
      this._panEnd.set(event.pageX, event.pageY);
    } else {
      const position = this._getSecondPointerPosition(event);
      const x = 0.5 * (event.pageX + position.x);
      const y = 0.5 * (event.pageY + position.y);
      this._panEnd.set(x, y);
    }
    this._panDelta.subVectors(this._panEnd, this._panStart).multiplyScalar(this.panSpeed);
    this._pan(this._panDelta.x, this._panDelta.y);
    this._panStart.copy(this._panEnd);
  }

  _handleTouchMoveDolly(event) {
    const position = this._getSecondPointerPosition(event);
    const dx = event.pageX - position.x;
    const dy = event.pageY - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    this._dollyEnd.set(0, distance);
    this._dollyDelta.set(0, (this._dollyEnd.y / this._dollyStart.y) ** +this.zoomSpeed);
    this._dollyOut(this._dollyDelta.y);
    this._dollyStart.copy(this._dollyEnd);
    const centerX = (event.pageX + position.x) * 0.5;
    const centerY = (event.pageY + position.y) * 0.5;
    this._updateZoomParameters(centerX, centerY);
  }

  _handleTouchMoveDollyPan(event) {
    if (this.enableZoom) this._handleTouchMoveDolly(event);
    if (this.enablePan) this._handleTouchMovePan(event);
  }

  _handleTouchMoveDollyRotate(event) {
    if (this.enableZoom) this._handleTouchMoveDolly(event);
    if (this.enableRotate) this._handleTouchMoveRotate(event);
  }

  _addPointer(event) {
    this._pointers.push(event.pointerId);
  }

  _removePointer(event) {
    delete this._pointerPositions[event.pointerId];
    for (let i = 0; i < this._pointers.length; i++) {
      if (this._pointers[i] == event.pointerId) {
        this._pointers.splice(i, 1);
        return;
      }
    }
  }

  _isTrackingPointer(event) {
    for (let i = 0; i < this._pointers.length; i++) {
      if (this._pointers[i] == event.pointerId) return true;
    }
    return false;
  }

  _trackPointer(event) {
    let position = this._pointerPositions[event.pointerId];
    if (position === undefined) {
      position = new Vector2();
      this._pointerPositions[event.pointerId] = position;
    }
    position.set(event.pageX, event.pageY);
  }

  _getSecondPointerPosition(event) {
    const pointerId = event.pointerId === this._pointers[0] ? this._pointers[1] : this._pointers[0];
    return this._pointerPositions[pointerId];
  }

  _customWheelEvent(event) {
    const mode = event.deltaMode;
    const newEvent = {
      clientX: event.clientX,
      clientY: event.clientY,
      deltaY: event.deltaY,
    };
    switch (mode) {
      case 1:
        newEvent.deltaY *= 16;
        break;
      case 2:
        newEvent.deltaY *= 100;
        break;
    }
    if (event.ctrlKey && !this._controlActive) {
      newEvent.deltaY *= 10;
    }
    return newEvent;
  }
}

function onPointerDown(event) {
  if (this.enabled === false) return;
  if (this._pointers.length === 0) {
    this.domElement.setPointerCapture?.(event.pointerId);
    this.domElement.ownerDocument.addEventListener('pointermove', this._onPointerMove);
    this.domElement.ownerDocument.addEventListener('pointerup', this._onPointerUp);
  }
  if (!this._isTrackingPointer(event)) {
    this._addPointer(event);
    if (event.pointerType === 'touch') {
      this._onTouchStart(event);
    } else {
      this._onMouseDown(event);
    }
    if (this._cursorStyle === 'grab') {
      this.domElement.style.cursor = 'grabbing';
    }
  }
}

function onPointerMove(event) {
  if (this.enabled === false) return;
  if (event.pointerType === 'touch') {
    this._onTouchMove(event);
  } else {
    this._onMouseMove(event);
  }
}

function onPointerUp(event) {
  this._removePointer(event);
  switch (this._pointers.length) {
    case 0:
      this.domElement.releasePointerCapture?.(event.pointerId);
      this.domElement.ownerDocument.removeEventListener('pointermove', this._onPointerMove);
      this.domElement.ownerDocument.removeEventListener('pointerup', this._onPointerUp);
      this.dispatchEvent(END_EVENT);
      this.state = STATE.NONE;
      if (this._cursorStyle === 'grab') {
        this.domElement.style.cursor = 'grab';
      }
      break;
    case 1: {
      const pointerId = this._pointers[0];
      const position = this._pointerPositions[pointerId];
      this._onTouchStart({ pointerId, pageX: position.x, pageY: position.y });
      break;
    }
  }
}

function onMouseDown(event) {
  let mouseAction;
  switch (event.button) {
    case 0:
      mouseAction = this.mouseButtons.LEFT;
      break;
    case 1:
      mouseAction = this.mouseButtons.MIDDLE;
      break;
    case 2:
      mouseAction = this.mouseButtons.RIGHT;
      break;
    default:
      mouseAction = -1;
  }
  switch (mouseAction) {
    case MOUSE.DOLLY:
      if (this.enableZoom === false) return;
      this._handleMouseDownDolly(event);
      this.state = STATE.DOLLY;
      break;
    case MOUSE.ROTATE:
      if (event.ctrlKey || event.metaKey || event.shiftKey) {
        if (this.enablePan === false) return;
        this._handleMouseDownPan(event);
        this.state = STATE.PAN;
      } else {
        if (this.enableRotate === false) return;
        this._handleMouseDownRotate(event);
        this.state = STATE.ROTATE;
      }
      break;
    case MOUSE.PAN:
      if (event.ctrlKey || event.metaKey || event.shiftKey) {
        if (this.enableRotate === false) return;
        this._handleMouseDownRotate(event);
        this.state = STATE.ROTATE;
      } else {
        if (this.enablePan === false) return;
        this._handleMouseDownPan(event);
        this.state = STATE.PAN;
      }
      break;
    default:
      this.state = STATE.NONE;
  }
  if (this.state !== STATE.NONE) this.dispatchEvent(START_EVENT);
}

function onMouseMove(event) {
  switch (this.state) {
    case STATE.ROTATE:
      if (this.enableRotate === false) return;
      this._handleMouseMoveRotate(event);
      break;
    case STATE.DOLLY:
      if (this.enableZoom === false) return;
      this._handleMouseMoveDolly(event);
      break;
    case STATE.PAN:
      if (this.enablePan === false) return;
      this._handleMouseMovePan(event);
      break;
  }
}

function onMouseWheel(event) {
  if (this.enabled === false || this.enableZoom === false || this.state !== STATE.NONE) return;
  event.preventDefault();
  this.dispatchEvent(START_EVENT);
  this._handleMouseWheel(this._customWheelEvent(event));
  this.dispatchEvent(END_EVENT);
}

function onKeyDown(event) {
  if (this.enabled === false) return;
  this._handleKeyDown(event);
}

function onTouchStart(event) {
  this._trackPointer(event);
  switch (this._pointers.length) {
    case 1:
      switch (this.touches.ONE) {
        case TOUCH.ROTATE:
          if (this.enableRotate === false) return;
          this._handleTouchStartRotate(event);
          this.state = STATE.TOUCH_ROTATE;
          break;
        case TOUCH.PAN:
          if (this.enablePan === false) return;
          this._handleTouchStartPan(event);
          this.state = STATE.TOUCH_PAN;
          break;
        default:
          this.state = STATE.NONE;
      }
      break;
    case 2:
      switch (this.touches.TWO) {
        case TOUCH.DOLLY_PAN:
          if (this.enableZoom === false && this.enablePan === false) return;
          this._handleTouchStartDollyPan(event);
          this.state = STATE.TOUCH_DOLLY_PAN;
          break;
        case TOUCH.DOLLY_ROTATE:
          if (this.enableZoom === false && this.enableRotate === false) return;
          this._handleTouchStartDollyRotate(event);
          this.state = STATE.TOUCH_DOLLY_ROTATE;
          break;
        default:
          this.state = STATE.NONE;
      }
      break;
    default:
      this.state = STATE.NONE;
  }
  if (this.state !== STATE.NONE) this.dispatchEvent(START_EVENT);
}

function onTouchMove(event) {
  this._trackPointer(event);
  switch (this.state) {
    case STATE.TOUCH_ROTATE:
      if (this.enableRotate === false) return;
      this._handleTouchMoveRotate(event);
      this.update();
      break;
    case STATE.TOUCH_PAN:
      if (this.enablePan === false) return;
      this._handleTouchMovePan(event);
      this.update();
      break;
    case STATE.TOUCH_DOLLY_PAN:
      if (this.enableZoom === false && this.enablePan === false) return;
      this._handleTouchMoveDollyPan(event);
      this.update();
      break;
    case STATE.TOUCH_DOLLY_ROTATE:
      if (this.enableZoom === false && this.enableRotate === false) return;
      this._handleTouchMoveDollyRotate(event);
      this.update();
      break;
    default:
      this.state = STATE.NONE;
  }
}

function onContextMenu(event) {
  if (this.enabled === false) return;
  event.preventDefault();
}

function interceptControlDown(event) {
  if (event.key === 'Control') {
    this._controlActive = true;
    this.domElement
      .getRootNode()
      .addEventListener('keyup', this._interceptControlUp, { passive: true, capture: true });
  }
}

function interceptControlUp(event) {
  if (event.key === 'Control') {
    this._controlActive = false;
    this.domElement
      .getRootNode()
      .removeEventListener('keyup', this._interceptControlUp, { passive: true, capture: true });
  }
}

/* ----------------------------------------------- Carter MeshSurfaceSampler */
/* Verbatim from `app/lib/experiments/threejs-test.js` (`me`). */

const _face = new Triangle();
const _color = new Vector3();
const _uva = new Vector2();
const _uvb = new Vector2();
const _uvc = new Vector2();

class CarterMeshSurfaceSampler {
  constructor(mesh) {
    this.geometry = mesh.geometry;
    this.randomFunction = Math.random;
    this.indexAttribute = this.geometry.index;
    this.positionAttribute = this.geometry.getAttribute('position');
    this.normalAttribute = this.geometry.getAttribute('normal');
    this.colorAttribute = this.geometry.getAttribute('color');
    this.uvAttribute = this.geometry.getAttribute('uv');
    this.weightAttribute = null;
    this.distribution = null;
  }

  setWeightAttribute(name) {
    this.weightAttribute = name ? this.geometry.getAttribute(name) : null;
    return this;
  }

  build() {
    const indexAttribute = this.indexAttribute;
    const positionAttribute = this.positionAttribute;
    const weightAttribute = this.weightAttribute;
    const totalFaces = indexAttribute ? indexAttribute.count / 3 : positionAttribute.count / 3;
    const faceWeights = new Float32Array(totalFaces);

    for (let i = 0; i < totalFaces; i++) {
      let faceWeight = 1;
      let i0 = 3 * i;
      let i1 = 3 * i + 1;
      let i2 = 3 * i + 2;
      if (indexAttribute) {
        i0 = indexAttribute.getX(i0);
        i1 = indexAttribute.getX(i1);
        i2 = indexAttribute.getX(i2);
      }
      if (weightAttribute) {
        faceWeight = weightAttribute.getX(i0) + weightAttribute.getX(i1) + weightAttribute.getX(i2);
      }
      _face.a.fromBufferAttribute(positionAttribute, i0);
      _face.b.fromBufferAttribute(positionAttribute, i1);
      _face.c.fromBufferAttribute(positionAttribute, i2);
      faceWeight *= _face.getArea();
      faceWeights[i] = faceWeight;
    }

    const distribution = new Float32Array(totalFaces);
    let cumulativeTotal = 0;
    for (let i = 0; i < totalFaces; i++) {
      cumulativeTotal += faceWeights[i];
      distribution[i] = cumulativeTotal;
    }
    this.distribution = distribution;
    return this;
  }

  setRandomGenerator(randomFunction) {
    this.randomFunction = randomFunction;
    return this;
  }

  sample(targetPosition, targetNormal, targetColor, targetUV) {
    const faceIndex = this._sampleFaceIndex();
    return this._sampleFace(faceIndex, targetPosition, targetNormal, targetColor, targetUV);
  }

  _sampleFaceIndex() {
    const cumulativeTotal = this.distribution[this.distribution.length - 1];
    return this._binarySearch(this.randomFunction() * cumulativeTotal);
  }

  _binarySearch(x) {
    const dist = this.distribution;
    let start = 0;
    let end = dist.length - 1;
    let index = -1;
    while (start <= end) {
      const mid = Math.ceil((start + end) / 2);
      if (mid === 0 || (dist[mid - 1] <= x && dist[mid] > x)) {
        index = mid;
        break;
      } else if (x < dist[mid]) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }
    return index;
  }

  _sampleFace(faceIndex, targetPosition, targetNormal, targetColor, targetUV) {
    let u = this.randomFunction();
    let v = this.randomFunction();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const indexAttribute = this.indexAttribute;
    let i0 = faceIndex * 3;
    let i1 = faceIndex * 3 + 1;
    let i2 = faceIndex * 3 + 2;
    if (indexAttribute) {
      i0 = indexAttribute.getX(i0);
      i1 = indexAttribute.getX(i1);
      i2 = indexAttribute.getX(i2);
    }

    _face.a.fromBufferAttribute(this.positionAttribute, i0);
    _face.b.fromBufferAttribute(this.positionAttribute, i1);
    _face.c.fromBufferAttribute(this.positionAttribute, i2);
    targetPosition
      .set(0, 0, 0)
      .addScaledVector(_face.a, u)
      .addScaledVector(_face.b, v)
      .addScaledVector(_face.c, 1 - (u + v));

    if (targetNormal !== undefined) {
      if (this.normalAttribute === undefined) {
        _face.getNormal(targetNormal);
      } else {
        _face.a.fromBufferAttribute(this.normalAttribute, i0);
        _face.b.fromBufferAttribute(this.normalAttribute, i1);
        _face.c.fromBufferAttribute(this.normalAttribute, i2);
        targetNormal
          .set(0, 0, 0)
          .addScaledVector(_face.a, u)
          .addScaledVector(_face.b, v)
          .addScaledVector(_face.c, 1 - (u + v))
          .normalize();
      }
    }

    if (targetColor !== undefined && this.colorAttribute !== undefined) {
      _face.a.fromBufferAttribute(this.colorAttribute, i0);
      _face.b.fromBufferAttribute(this.colorAttribute, i1);
      _face.c.fromBufferAttribute(this.colorAttribute, i2);
      _color
        .set(0, 0, 0)
        .addScaledVector(_face.a, u)
        .addScaledVector(_face.b, v)
        .addScaledVector(_face.c, 1 - (u + v));
      targetColor.r = _color.x;
      targetColor.g = _color.y;
      targetColor.b = _color.z;
    }

    if (targetUV !== undefined && this.uvAttribute !== undefined) {
      _uva.fromBufferAttribute(this.uvAttribute, i0);
      _uvb.fromBufferAttribute(this.uvAttribute, i1);
      _uvc.fromBufferAttribute(this.uvAttribute, i2);
      targetUV
        .set(0, 0)
        .addScaledVector(_uva, u)
        .addScaledVector(_uvb, v)
        .addScaledVector(_uvc, 1 - (u + v));
    }

    return this;
  }
}

/* ------------------------------------------- Scene constants & superformula */

const MODEL_URL =
  'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@2bac6f8c57bf471df0d2a1e8a8ec023c7801dddf/Models/Lantern/glTF-Binary/Lantern.glb';

const SIZE = 2.4;
const SEG_U = 120;
const SEG_V = 72;

const SUBJECTS = [
  { id: 'lantern', label: 'Lantern', sf: null },
  { id: 'orb', label: 'Orb', sf: { m1: 6, n11: 2.4, n12: 1.1, n13: 1.1, m2: 6, n21: 2.4, n22: 1.1, n23: 1.1 } },
  { id: 'bloom', label: 'Bloom', sf: { m1: 8, n11: 0.5, n12: 1.7, n13: 1.7, m2: 8, n21: 0.5, n22: 1.7, n23: 1.7 } },
  { id: 'shell', label: 'Shell', sf: { m1: 3, n11: 0.7, n12: 0.6, n13: 3.2, m2: 6, n21: 1.6, n22: 0.8, n23: 0.8 } },
  { id: 'spike', label: 'Spike', sf: { m1: 12, n11: 0.3, n12: 1, n13: 1, m2: 12, n21: 0.3, n22: 1, n23: 1 } },
];

const sfRadius = (angle, m, n1, n2, n3) => {
  const a = (m * angle) / 4;
  const sum = Math.abs(Math.cos(a)) ** n2 + Math.abs(Math.sin(a)) ** n3;
  const r = sum === 0 ? 0 : sum ** (-1 / n1);
  return Number.isFinite(r) ? Math.min(r, 6) : 0;
};

function sampleSuperformula(sf, out) {
  let offset = 0;
  let maxCoord = 0;
  for (let iv = 0; iv <= SEG_V; iv++) {
    const phi = -Math.PI / 2 + (Math.PI * iv) / SEG_V;
    const r2 = sfRadius(phi, sf.m2, sf.n21, sf.n22, sf.n23);
    const cosPhi = Math.cos(phi);
    for (let iu = 0; iu <= SEG_U; iu++) {
      const theta = -Math.PI + (2 * Math.PI * iu) / SEG_U;
      const r1 = sfRadius(theta, sf.m1, sf.n11, sf.n12, sf.n13);
      const x = r1 * Math.cos(theta) * r2 * cosPhi;
      const y = r2 * Math.sin(phi);
      const z = r1 * Math.sin(theta) * r2 * cosPhi;
      out[offset++] = x;
      out[offset++] = y;
      out[offset++] = z;
      maxCoord = Math.max(maxCoord, Math.abs(x), Math.abs(y), Math.abs(z));
    }
  }
  // Close the ±π seam where lobe counts are not multiples of 4.
  for (let iv = 0; iv <= SEG_V; iv++) {
    const rowStart = iv * 363;
    const rowEnd = rowStart + 360;
    out[rowEnd] = out[rowStart];
    out[rowEnd + 1] = out[rowStart + 1];
    out[rowEnd + 2] = out[rowStart + 2];
  }
  const norm = maxCoord > 0 ? SIZE / 2.9 / maxCoord : 1;
  for (let i = 0; i < out.length; i++) out[i] *= norm;
}

function buildGridIndices() {
  const indices = new Uint32Array(51840);
  let offset = 0;
  for (let iv = 0; iv < SEG_V; iv++) {
    for (let iu = 0; iu < SEG_U; iu++) {
      const i0 = iv * 121 + iu;
      const i1 = i0 + 1;
      const i2 = i0 + SEG_U + 1;
      const i3 = i2 + 1;
      indices[offset++] = i0;
      indices[offset++] = i2;
      indices[offset++] = i1;
      indices[offset++] = i1;
      indices[offset++] = i2;
      indices[offset++] = i3;
    }
  }
  return indices;
}

const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

const MODES = [
  { id: 'shaded', label: 'Shaded' },
  { id: 'wire', label: 'Wire' },
  { id: 'points', label: 'Points' },
];

const FINISHES = [
  { id: 'studio', label: 'Studio', mat: { color: 0xf2f2f2, roughness: 0.52, metalness: 0.05 } },
  { id: 'chrome', label: 'Chrome', mat: { color: 0xffffff, roughness: 0.06, metalness: 1 } },
  { id: 'wax', label: 'Wax', mat: { color: 0xe8e8e8, roughness: 0.95, metalness: 0, sheen: 1 } },
  { id: 'ink', label: 'Ink', mat: { color: 0x1c1c1c, roughness: 0.22, metalness: 0.55 } },
];

const MATCAP_SIZE = 256;

export const config = [
  {
    key: 'accent',
    label: 'Accent',
    type: 'swatch',
    default: 'ink',
    options: [
      { id: 'ink', value: 'var(--ink)' },
      { id: 'poppy', value: '#c54126' },
      { id: 'blue', value: '#105099' },
      { id: 'oak', value: '#9e9e4d' },
    ],
  },
  {
    key: 'finish',
    label: 'Finish',
    type: 'segment',
    default: 'studio',
    options: FINISHES.map((f) => ({ id: f.id, label: f.label })),
  },
  { key: 'polish', label: 'Polish', type: 'range', min: -1, max: 1, step: 0.05, default: 0 },
  { key: 'spin', label: 'Spin', type: 'range', min: 0, max: 3, step: 0.1, default: 0.9 },
  { key: 'pointSize', label: 'Points', type: 'range', min: 0.005, max: 0.05, step: 0.005, default: 0.02 },
  { key: 'lobes', label: 'Lobes', type: 'range', min: -4, max: 10, step: 1, default: 0 },
  { key: 'sharp', label: 'Sharp', type: 'range', min: 0.3, max: 2.4, step: 0.05, default: 1 },
];

/* ---------------------------------------------------------- Matcap baker */

function createMatcapBaker(renderer) {
  const pmrem = new PMREMGenerator(renderer);
  const roomEnv = new CarterRoomEnvironment();
  const envRT = pmrem.fromScene(roomEnv, 0.04);
  roomEnv.dispose();

  const bakeScene = new Scene();
  bakeScene.environment = envRT.texture;

  const bakeCamera = new OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
  bakeCamera.position.z = 3;

  const sphereGeo = new SphereGeometry(0.995, 128, 96);
  const sphereMat = new MeshPhysicalMaterial({ envMapIntensity: 1.1 });
  bakeScene.add(new Mesh(sphereGeo, sphereMat));

  const keyLight = new DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(-0.7, 0.85, 1);
  const fillLight = new DirectionalLight(0xffffff, 0.45);
  fillLight.position.set(0.9, -0.6, 0.7);
  bakeScene.add(keyLight, fillLight);

  const target = new WebGLRenderTarget(MATCAP_SIZE, MATCAP_SIZE, {
    depthBuffer: true,
    stencilBuffer: false,
  });
  target.texture.colorSpace = SRGBColorSpace;
  target.texture.generateMipmaps = false;
  target.texture.minFilter = LinearFilter;

  return {
    bake: (mat, polish = 0) => {
      sphereMat.color.set(mat.color);
      sphereMat.roughness = MathUtils.clamp(mat.roughness - polish * 0.45, 0.02, 1);
      sphereMat.metalness = MathUtils.clamp(mat.metalness + Math.max(0, polish) * 0.6, 0, 1);
      sphereMat.sheen = mat.sheen ?? 0;
      sphereMat.needsUpdate = true;
      const prevTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.render(bakeScene, bakeCamera);
      renderer.setRenderTarget(prevTarget);
      return target.texture;
    },
    texture: target.texture,
    dispose: () => {
      sphereGeo.dispose();
      sphereMat.dispose();
      target.dispose();
      envRT.dispose();
      pmrem.dispose();
    },
  };
}

function disposeGltfResources(rootObj) {
  const materials = new Set();
  const textures = new Set();
  const geometries = new Set();
  rootObj.traverse((node) => {
    if (!node.isMesh) return;
    if (node.geometry) geometries.add(node.geometry);
    const mats = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
    for (const mat of mats) {
      materials.add(mat);
      for (const value of Object.values(mat)) {
        if (value && value.isTexture) textures.add(value);
      }
    }
  });
  return { materials, textures, geometries };
}

/* ------------------------------------------------------------------- Mount */

export function mountThreeJsTest(host) {
  if (!host) return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = { spin: 0.9, pointSize: 0.02 };
  let accentOverride = null;

  const abort = new AbortController();
  const { signal } = abort;

  const root = (host.ownerDocument ?? document).createElement('div');
  root.className = 'tj';
  root.innerHTML = `<p class="tj__loading"><span class="spin"></span>Loading model</p>
      <div class="tj__bars">
        <div class="tj__modes" role="group" aria-label="Subject" style="--segs:${SUBJECTS.length}">
          <span class="tj__pill" data-subject-pill aria-hidden="true"></span>
          ${SUBJECTS.map((s, idx) => `<button class="tj__seg" type="button" data-subject="${s.id}" aria-pressed="${idx === 0}">${s.label}</button>`).join('')}
        </div>
        <div class="tj__modes" role="group" aria-label="Render mode" style="--segs:${MODES.length}">
          <span class="tj__pill" data-mode-pill aria-hidden="true"></span>
          ${MODES.map((m, idx) => `<button class="tj__seg" type="button" data-mode="${m.id}" aria-pressed="${idx === 0}">${m.label}</button>`).join('')}
        </div>
      </div>`;
  host.appendChild(root);

  const modePill = root.querySelector('[data-mode-pill]');
  const subjectPill = root.querySelector('[data-subject-pill]');
  const modeButtons = [...root.querySelectorAll('[data-mode]')];
  const subjectButtons = [...root.querySelectorAll('[data-subject]')];

  let inkHex = 0x1e1e1e;
  const doc = host.ownerDocument ?? document;
  const readInk = () => {
    const probe = doc.createElement('span');
    probe.style.cssText = 'color:var(--ink);position:absolute;visibility:hidden';
    root.appendChild(probe);
    const view = doc.defaultView ?? window;
    const rgb = view.getComputedStyle(probe).color.match(/\d+/g);
    probe.remove();
    if (rgb) {
      inkHex = (Number(rgb[0]) << 16) | (Number(rgb[1]) << 8) | Number(rgb[2]);
    }
  };
  readInk();

  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
  } catch (err) {
    abort.abort();
    root.remove();
    throw err;
  }

  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  root.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.15, SIZE * 2.4);

  const controls = new CarterOrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = SIZE * 1.4;
  controls.maxDistance = SIZE * 4.5;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI * 0.9;
  controls.enableDamping = !reduced;
  controls.dampingFactor = 0.08;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = params.spin;

  const baker = createMatcapBaker(renderer);
  let finishId = 'studio';
  let polish = 0;
  const rebake = () => baker.bake(FINISHES.find((f) => f.id === finishId).mat, polish);
  rebake();

  const shadedMat = new MeshMatcapMaterial({ matcap: baker.texture });
  const wireMat = new MeshBasicMaterial({
    color: inkHex,
    wireframe: true,
    transparent: true,
    opacity: 0.55,
  });
  const pointsMat = new PointsMaterial({ color: inkHex, size: params.pointSize });

  const modelGroup = new Group();
  const sfGroup = new Group();
  const MIN_SCALE = 0.02;
  sfGroup.visible = false;
  sfGroup.scale.setScalar(MIN_SCALE);
  scene.add(modelGroup, sfGroup);

  const modelGeos = new Set();
  const pointGeos = new Set();
  const modelModes = { shaded: null, wire: null, points: null };
  let activeMode = 'shaded';
  let activeSubject = SUBJECTS[0].id;
  let rafId = 0;
  let destroyed = false;

  const render = () => renderer.render(scene, camera);

  const VERT_COUNT = 8833;
  const sfLive = new Float32Array(VERT_COUNT * 3);
  const sfFrom = new Float32Array(VERT_COUNT * 3);
  const sfTo = new Float32Array(VERT_COUNT * 3);

  const sfGeo = new BufferGeometry();
  sfGeo.setIndex(new BufferAttribute(buildGridIndices(), 1));
  sfGeo.setAttribute('position', new BufferAttribute(sfLive, 3));

  const sfTune = { lobes: 0, sharp: 1 };
  const tunedSf = (sf) => ({
    ...sf,
    m1: Math.max(1, sf.m1 + sfTune.lobes),
    m2: Math.max(1, sf.m2 + sfTune.lobes),
    n12: sf.n12 * sfTune.sharp,
    n13: sf.n13 * sfTune.sharp,
    n22: sf.n22 * sfTune.sharp,
    n23: sf.n23 * sfTune.sharp,
  });

  let currentSf = SUBJECTS.find((s) => s.sf).sf;
  sampleSuperformula(currentSf, sfLive);

  const sfShaded = new Mesh(sfGeo, shadedMat);
  const sfWire = new Mesh(sfGeo, wireMat);
  const sfPoints = new Points(sfGeo, pointsMat);
  sfGroup.add(sfShaded, sfWire, sfPoints);
  const sfModes = { shaded: sfShaded, wire: sfWire, points: sfPoints };

  const syncSfGeometry = () => {
    sfGeo.getAttribute('position').needsUpdate = true;
    sfGeo.computeVertexNormals();
    sfGeo.computeBoundingSphere();
  };
  syncSfGeometry();

  let morphProgress = 1;
  let morphDuration = 0.9;
  const morphTo = (nextSf, duration = 0.9) => {
    currentSf = nextSf;
    sampleSuperformula(nextSf, sfTo);
    if (reduced) {
      sfLive.set(sfTo);
      morphProgress = 1;
      syncSfGeometry();
      render();
      return;
    }
    sfFrom.set(sfLive);
    morphProgress = 0;
    morphDuration = duration;
  };

  let groupSwap = null;
  const snapSwap = (outGroup, inGroup) => {
    outGroup.visible = false;
    outGroup.scale.setScalar(1);
    inGroup.visible = true;
    inGroup.scale.setScalar(1);
  };

  const placePill = (pill, button) => {
    if (!button || !button.offsetWidth) return;
    pill.style.width = `${button.offsetWidth}px`;
    pill.style.transform = `translateX(${button.offsetLeft - 2}px)`;
  };

  const syncUI = () => {
    Object.keys(sfModes).forEach((key) => {
      sfModes[key].visible = key === activeMode;
      if (modelModes[key]) modelModes[key].visible = key === activeMode;
    });
    modeButtons.forEach((btn) =>
      btn.setAttribute('aria-pressed', String(btn.dataset.mode === activeMode)),
    );
    subjectButtons.forEach((btn) =>
      btn.setAttribute('aria-pressed', String(btn.dataset.subject === activeSubject)),
    );
    placePill(
      modePill,
      modeButtons.find((btn) => btn.dataset.mode === activeMode),
    );
    placePill(
      subjectPill,
      subjectButtons.find((btn) => btn.dataset.subject === activeSubject),
    );
  };

  const selectMode = (nextMode) => {
    activeMode = nextMode;
    syncUI();
    if (reduced) render();
  };

  const selectSubject = (nextId) => {
    const entry = SUBJECTS.find((s) => s.id === nextId);
    if (!entry || nextId === activeSubject) return;
    const wasModel = !SUBJECTS.find((s) => s.id === activeSubject)?.sf;
    activeSubject = nextId;
    syncUI();
    if (entry.sf && !wasModel) {
      morphTo(tunedSf(entry.sf));
    } else if (entry.sf) {
      const target = tunedSf(entry.sf);
      sampleSuperformula(target, sfLive);
      currentSf = target;
      morphProgress = 1;
      syncSfGeometry();
      if (reduced) snapSwap(modelGroup, sfGroup);
      else groupSwap = { out: modelGroup, in: sfGroup, t: 0 };
    } else if (reduced) {
      snapSwap(sfGroup, modelGroup);
    } else {
      groupSwap = { out: sfGroup, in: modelGroup, t: 0 };
    }
    if (reduced) render();
  };

  const stepTransitions = (dt) => {
    if (morphProgress < 1) {
      morphProgress = Math.min(1, morphProgress + dt / morphDuration);
      const ease = easeOutExpo(morphProgress);
      for (let i = 0; i < sfLive.length; i++) {
        sfLive[i] = sfFrom[i] + (sfTo[i] - sfFrom[i]) * ease;
      }
      syncSfGeometry();
    }
    if (groupSwap) {
      groupSwap.t = Math.min(1, groupSwap.t + dt / 0.7);
      if (groupSwap.t < 0.5) {
        const ease = easeOutExpo(groupSwap.t * 2);
        groupSwap.out.scale.setScalar(1 + -0.98 * ease);
      } else {
        if (groupSwap.out.visible) {
          groupSwap.out.visible = false;
          groupSwap.in.visible = true;
        }
        const ease = easeOutExpo((groupSwap.t - 0.5) * 2);
        groupSwap.in.scale.setScalar(MIN_SCALE + 0.98 * ease);
      }
      if (groupSwap.t >= 1) {
        groupSwap.in.scale.setScalar(1);
        groupSwap = null;
      }
    }
  };

  new GLTFLoader().load(
    MODEL_URL,
    (gltf) => {
      const { materials: pbrMats, textures: pbrTexs, geometries: pbrGeos } = disposeGltfResources(
        gltf.scene,
      );
      if (destroyed) {
        pbrGeos.forEach((g) => g.dispose());
        pbrTexs.forEach((t) => {
          t.source?.data?.close?.();
          t.dispose();
        });
        pbrMats.forEach((m) => m.dispose());
        return;
      }

      const shadedScene = gltf.scene;
      shadedScene.traverse((node) => {
        if (node.isMesh) {
          node.material = shadedMat;
          modelGeos.add(node.geometry);
        }
      });
      pbrTexs.forEach((t) => {
        t.source?.data?.close?.();
        t.dispose();
      });
      pbrMats.forEach((m) => m.dispose());

      const box = new Box3().setFromObject(shadedScene);
      const size = box.getSize(new Vector3());
      shadedScene.scale.multiplyScalar(SIZE / Math.max(size.x, size.y, size.z));
      box.setFromObject(shadedScene);
      shadedScene.position.sub(box.getCenter(new Vector3()));

      const wireScene = shadedScene.clone();
      wireScene.traverse((node) => {
        if (node.isMesh) node.material = wireMat;
      });

      const pointsScene = shadedScene.clone();
      const sourceMeshes = [];
      pointsScene.traverse((node) => {
        if (node.isMesh) sourceMeshes.push(node);
      });
      const areas = sourceMeshes.map((mesh) => {
        mesh.geometry.computeBoundingBox();
        const s = mesh.geometry.boundingBox.getSize(new Vector3());
        return 2 * (s.x * s.y + s.y * s.z + s.z * s.x) || 1;
      });
      const totalArea = areas.reduce((sum, a) => sum + a, 0) || 1;
      const samplePos = new Vector3();

      sourceMeshes.forEach((mesh, idx) => {
        const count = Math.max(400, Math.round((20000 * areas[idx]) / totalArea));
        const sampler = new CarterMeshSurfaceSampler(mesh).build();
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          sampler.sample(samplePos);
          positions[i * 3] = samplePos.x;
          positions[i * 3 + 1] = samplePos.y;
          positions[i * 3 + 2] = samplePos.z;
        }
        const geo = new BufferGeometry();
        geo.setAttribute('position', new BufferAttribute(positions, 3));
        pointGeos.add(geo);
        const cloud = new Points(geo, pointsMat);
        cloud.position.copy(mesh.position);
        cloud.quaternion.copy(mesh.quaternion);
        cloud.scale.copy(mesh.scale);
        mesh.parent?.add(cloud);
        mesh.parent?.remove(mesh);
      });

      modelModes.shaded = shadedScene;
      modelModes.wire = wireScene;
      modelModes.points = pointsScene;
      modelGroup.add(shadedScene, wireScene, pointsScene);
      syncUI();
      root.dataset.ready = '';
      if (reduced) render();
    },
    undefined,
    (err) => {
      if (!destroyed) console.error('[lab] threejs-test model failed', err);
    },
  );

  const onResize = () => {
    const width = root.clientWidth;
    const height = root.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    syncUI();
    if (reduced) render();
  };

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(root);
  onResize();

  const applyColors = () => {
    const color = accentOverride ?? inkHex;
    wireMat.color.set(color);
    pointsMat.color.set(color);
    shadedMat.color.set(accentOverride ?? 0xffffff);
  };
  applyColors();

  const onThemeChange = () => {
    readInk();
    applyColors();
    if (reduced) render();
  };

  let stopTheme;
  if (getCarterRoot()) {
    stopTheme = observeCarterTheme(onThemeChange);
  } else if (typeof MutationObserver !== 'undefined') {
    const themeTarget = host.closest?.('.carter') || document.documentElement;
    const mo = new MutationObserver(onThemeChange);
    mo.observe(themeTarget, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    stopTheme = () => mo.disconnect();
  } else {
    stopTheme = () => {};
  }

  modeButtons.forEach((btn) =>
    btn.addEventListener('click', () => selectMode(btn.dataset.mode), { signal }),
  );
  subjectButtons.forEach((btn) =>
    btn.addEventListener('click', () => selectSubject(btn.dataset.subject), { signal }),
  );
  syncUI();

  if (reduced) {
    controls.addEventListener('change', render);
  } else {
    let last = performance.now();
    const loop = (now) => {
      rafId = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      stepTransitions(dt);
      controls.update();
      render();
    };
    rafId = requestAnimationFrame(loop);
  }

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    abort.abort();
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    stopTheme();
    controls.removeEventListener('change', render);
    controls.dispose();
    modelGeos.forEach((g) => g.dispose());
    modelGeos.clear();
    sfGeo.dispose();
    pointGeos.forEach((g) => g.dispose());
    pointGeos.clear();
    shadedMat.dispose();
    wireMat.dispose();
    pointsMat.dispose();
    baker.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    root.remove();
  };

  onDestroy(destroy);

  const set = (key, value) => {
    if (key === 'spin') {
      params.spin = Number(value);
      controls.autoRotateSpeed = params.spin;
    } else if (key === 'pointSize') {
      params.pointSize = Number(value);
      pointsMat.size = params.pointSize;
    } else if (key === 'finish') {
      finishId = String(value);
      rebake();
    } else if (key === 'polish') {
      polish = Number(value);
      rebake();
    } else if (key === 'lobes' || key === 'sharp') {
      sfTune[key] = Number(value);
      const activeSf = SUBJECTS.find((s) => s.id === activeSubject)?.sf;
      if (activeSf) morphTo(tunedSf(activeSf), 0.35);
    } else if (key === 'accent') {
      accentOverride = String(value).startsWith('var(') ? null : String(value);
      applyColors();
    }
    if (reduced) render();
  };

  return { destroy, set };
}

const ThreeJsTest = {
  mount: mountThreeJsTest,
  config,
};

export default ThreeJsTest;
