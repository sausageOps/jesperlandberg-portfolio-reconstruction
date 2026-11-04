import gsap from "gsap";
import { getCarterRoot, onDestroy } from "../runtime.js";

const MAX_TILT = 7;
const PERSPECTIVE = 700;
const canHover = () =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const Tilt = {
  init() {
    const root = getCarterRoot();
    if (!root) return;

    root.querySelectorAll("[data-tilt]").forEach((element) => {
      if (element.dataset.tiltReady) return;
      element.dataset.tiltReady = "";

      const max = Number(element.dataset.tiltMax) || MAX_TILT;
      const shine =
        element.parentElement?.querySelector("[data-tilt-shine]") ?? null;
      const targets = shine ? [element, shine] : [element];
      gsap.set(targets, { transformPerspective: PERSPECTIVE });
      if (shine) gsap.set(shine, { "--shx": "50%", "--shy": "50%" });

      const rotateX = targets.map((target) =>
        gsap.quickTo(target, "rotationX", {
          duration: 0.7,
          ease: "power3.out",
        }),
      );
      const rotateY = targets.map((target) =>
        gsap.quickTo(target, "rotationY", {
          duration: 0.7,
          ease: "power3.out",
        }),
      );
      let leaveTweens = [];
      const killLeaveTweens = () => {
        leaveTweens.forEach((tween) => tween.kill());
        leaveTweens = [];
      };
      const shineX = shine
        ? gsap.quickTo(shine, "--shx", {
            duration: 0.5,
            ease: "power3.out",
            unit: "%",
          })
        : null;
      const shineY = shine
        ? gsap.quickTo(shine, "--shy", {
            duration: 0.5,
            ease: "power3.out",
            unit: "%",
          })
        : null;
      const controller = new AbortController();

      element.addEventListener(
        "pointermove",
        (event) => {
          if (!canHover() || reducedMotion()) return;
          killLeaveTweens();
          const rect = element.getBoundingClientRect();
          const x = Math.min(
            Math.max((event.clientX - rect.left) / rect.width, 0),
            1,
          );
          const y = Math.min(
            Math.max((event.clientY - rect.top) / rect.height, 0),
            1,
          );
          rotateX.forEach((update) => update((0.5 - y) * 2 * max));
          rotateY.forEach((update) => update((x - 0.5) * 2 * max));
          if (shine) {
            shineX?.((1 - x) * 100);
            shineY?.((1 - y) * 100);
            shine.style.opacity = "1";
          }
        },
        { signal: controller.signal, passive: true },
      );

      element.addEventListener(
        "pointerleave",
        () => {
          killLeaveTweens();
          targets.forEach((target) => {
            leaveTweens.push(
              gsap.to(target, {
                rotationX: 0,
                rotationY: 0,
                duration: 1.3,
                ease: "power2.out",
                overwrite: false,
              }),
            );
          });
          if (shine) {
            leaveTweens.push(
              gsap.to(shine, {
                "--shx": "50%",
                "--shy": "50%",
                duration: 1.3,
                ease: "power2.out",
                overwrite: false,
              }),
            );
            shine.style.opacity = "0";
          }
        },
        { signal: controller.signal },
      );

      onDestroy(() => {
        controller.abort();
        killLeaveTweens();
        gsap.killTweensOf(targets);
        gsap.set(targets, { clearProps: "transform" });
        if (shine) shine.style.opacity = "0";
        delete element.dataset.tiltReady;
      });
    });
  },
};
