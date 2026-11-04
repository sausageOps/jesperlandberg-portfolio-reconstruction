import {
  CanvasTexture,
  EquirectangularReflectionMapping,
  PMREMGenerator,
  SRGBColorSpace,
} from "three";

/** Carter's procedural studio environment, converted to a Three.js PMREM. */
export function createStudioEnvironment(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#6e7075");
  gradient.addColorStop(0.46, "#3a3b3e");
  gradient.addColorStop(1, "#17181a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 512);
  context.fillStyle = "#ffffff";
  context.fillRect(150, 40, 300, 150);
  context.fillRect(620, 70, 60, 210);
  context.fillStyle = "#4a4a50";
  context.fillRect(760, 120, 190, 130);

  const equirectangular = new CanvasTexture(canvas);
  equirectangular.mapping = EquirectangularReflectionMapping;
  equirectangular.colorSpace = SRGBColorSpace;
  const pmrem = new PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(equirectangular);
  equirectangular.dispose();
  return { envRT, pmrem };
}

export { createStudioEnvironment as t };
