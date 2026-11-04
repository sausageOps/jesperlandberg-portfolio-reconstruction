import { Color, MeshBasicMaterial } from "three";
import { getCarterRoot, onDestroy } from "../runtime.js";

// Carter's ?mesh debugging view, narrowed to the About engines. It is inert in
// normal use and never installs a document-wide observer or mutates other pages.
const wired = new WeakSet();
let material = null;
let disposed = false;

function meshDebugEnabled() {
  const value = new URLSearchParams(window.location.search).get("mesh");
  return value !== null && !["0", "off", "false"].includes(value);
}

function inkColor() {
  const root = getCarterRoot();
  return root
    ? getComputedStyle(root).getPropertyValue("--ink").trim() || "#222"
    : "#222";
}

function applyMeshWire(scene) {
  if (!meshDebugEnabled() || !scene) return;
  if (!material || disposed) {
    disposed = false;
    material = new MeshBasicMaterial({
      wireframe: true,
      color: new Color(inkColor()),
      toneMapped: false,
      transparent: true,
      opacity: 0.85,
    });
    onDestroy(() => {
      material?.dispose();
      material = null;
      disposed = true;
    });
  } else {
    material.color.set(inkColor());
  }

  scene.traverse((object) => {
    if (!object.isMesh || wired.has(object)) return;
    wired.add(object);
    object.material = material;
    object.castShadow = false;
    object.receiveShadow = false;
  });
}

export { applyMeshWire as t };
