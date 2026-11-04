import { CanvasTexture, Matrix4, RepeatWrapping, Shape } from "three";

const seededRandom = (seed) => {
  let value = (seed * 9301 + 49297) >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

function roundedShape(width, height, topLeft, lowerRight) {
  const shape = new Shape();
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  shape.moveTo(-halfWidth + topLeft, -halfHeight);
  shape.lineTo(halfWidth - lowerRight, -halfHeight);
  shape.quadraticCurveTo(
    halfWidth,
    -halfHeight,
    halfWidth,
    -halfHeight + lowerRight,
  );
  shape.lineTo(halfWidth, halfHeight - lowerRight);
  shape.quadraticCurveTo(
    halfWidth,
    halfHeight,
    halfWidth - lowerRight,
    halfHeight,
  );
  shape.lineTo(-halfWidth + topLeft, halfHeight);
  shape.quadraticCurveTo(
    -halfWidth,
    halfHeight,
    -halfWidth,
    halfHeight - topLeft,
  );
  shape.lineTo(-halfWidth, -halfHeight + topLeft);
  shape.quadraticCurveTo(
    -halfWidth,
    -halfHeight,
    -halfWidth + topLeft,
    -halfHeight,
  );
  return shape;
}

function fiberTexture(seed) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  context.fillStyle = "#808080";
  context.fillRect(0, 0, 256, 256);

  const random = seededRandom(seed * 13 + 7);
  const grainAngle = (random() - 0.5) * 0.35;
  const strokeCount = 850 + Math.floor(random() * 500);

  for (let index = 0; index < strokeCount; index += 1) {
    const shade = Math.round(80 + random() * 96);
    context.strokeStyle = `rgb(${shade},${shade},${shade})`;
    context.globalAlpha = 0.4;
    context.lineWidth = 0.7 + random();
    const x = random() * 256;
    const y = random() * 256;
    const length = 4 + random() * 16;
    const angle = grainAngle + (random() - 0.5) * 0.5;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }

  context.globalAlpha = 0.45;
  for (let index = 0; index < 1600; index += 1) {
    const shade = Math.round(64 + random() * 128);
    context.fillStyle = `rgb(${shade},${shade},${shade})`;
    context.fillRect(
      random() * 256,
      random() * 256,
      1 + random(),
      1 + random(),
    );
  }
  context.globalAlpha = 1;

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.center.set(0.5, 0.5);
  texture.rotation = (random() - 0.5) * 0.14;
  texture.repeat.set(2 + random() * 0.8, 2.5 + random() * 0.9);
  return texture;
}

function radialShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 127);
  gradient.addColorStop(0, "rgba(0,0,0,0.82)");
  gradient.addColorStop(0.35, "rgba(0,0,0,0.45)");
  gradient.addColorStop(0.7, "rgba(0,0,0,0.15)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new CanvasTexture(canvas);
}

const cleanMatrixValue = (value) => (Math.abs(value) < 1e-10 ? 0 : value);
const viewMatrix = new Matrix4();

function projectCss3d(
  objectMatrix,
  objectWidth,
  camera,
  viewportWidth,
  viewportHeight,
  scale,
) {
  const halfViewHeight =
    camera.projectionMatrix.elements[5] * (viewportHeight / 2);
  if (camera.parent === null && camera.matrixWorldAutoUpdate)
    camera.updateMatrixWorld();
  viewMatrix.multiplyMatrices(camera.matrixWorldInverse, objectMatrix);

  const m = viewMatrix.elements;
  const factor = objectWidth / scale;
  const values = [
    m[0] * factor,
    -m[1] * factor,
    m[2] * factor,
    m[3] * factor,
    -m[4] * factor,
    m[5] * factor,
    -m[6] * factor,
    -m[7] * factor,
    m[8] * factor,
    -m[9] * factor,
    m[10] * factor,
    m[11] * factor,
    m[12] + viewportWidth / 2,
    -m[13] + viewportHeight / 2,
    m[14] + halfViewHeight,
    m[15],
  ];
  const transform = `translate(-50%,-50%)matrix3d(${values.map(cleanMatrixValue).join(",")})${m[14] >= 0 ? " scale(0)" : ""}`;

  return {
    containerCss: `position:absolute;top:0;left:0;width:${viewportWidth}px;height:${viewportHeight}px;overflow:hidden;pointer-events:none;perspective:${halfViewHeight}px;perspective-origin:50% 50%;`,
    elementTransform: transform,
  };
}

// Preserve the helper names imported by Carter's engine bodies.
export {
  fiberTexture as a,
  radialShadowTexture as i,
  seededRandom as n,
  roundedShape as r,
  projectCss3d as t,
};
