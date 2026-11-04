import gsap from "gsap";
import { getCarterRoot, onDestroy } from "../runtime.js";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const Record = {
  init() {
    const root = getCarterRoot();
    if (!root) return;

    root.querySelectorAll("[data-record]").forEach((record) => {
      if (record.dataset.recordReady) return;
      const body = record.querySelector("[data-record-body]");
      const reader = record.querySelector("[data-record-reader]");
      if (!body || !reader) return;
      record.dataset.recordReady = "";

      const controller = new AbortController();
      const hoverMedia = window.matchMedia(
        "(hover: hover) and (pointer: fine)",
      );
      let visible = false;
      const rows = () => [...body.querySelectorAll(".rec__row")];
      const targetY = (row) => row.offsetTop + row.offsetHeight - 1;

      const showAt = (row) => {
        const y = targetY(row);
        if (reducedMotion()) {
          gsap.set(reader, { y, scaleX: 1, autoAlpha: 1 });
          visible = true;
          return;
        }
        if (!visible) {
          visible = true;
          gsap.set(reader, { y, scaleX: 0, transformOrigin: "left center" });
          gsap.to(reader, {
            autoAlpha: 1,
            scaleX: 1,
            duration: 0.55,
            ease: "expo.out",
            overwrite: "auto",
          });
          return;
        }
        gsap.to(reader, {
          y,
          autoAlpha: 1,
          scaleX: 1,
          duration: 0.45,
          ease: "expo.out",
          overwrite: "auto",
        });
      };

      const hide = () => {
        if (!visible) return;
        visible = false;
        if (reducedMotion()) {
          gsap.set(reader, { autoAlpha: 0, scaleX: 0 });
          return;
        }
        gsap.to(reader, {
          scaleX: 0,
          duration: 0.3,
          ease: "expo.inOut",
          transformOrigin: "left center",
          overwrite: "auto",
          onComplete: () => gsap.set(reader, { autoAlpha: 0 }),
        });
      };

      const bindRows = () => {
        rows().forEach((row) => {
          if (row.dataset.readerBound) return;
          row.dataset.readerBound = "";
          row.addEventListener(
            "pointerenter",
            () => hoverMedia.matches && showAt(row),
            { signal: controller.signal },
          );
        });
      };

      bindRows();
      const observer = new MutationObserver(bindRows);
      observer.observe(body, { childList: true });
      record.addEventListener("pointerleave", hide, {
        signal: controller.signal,
      });
      window.addEventListener("blur", hide, { signal: controller.signal });
      gsap.set(reader, { autoAlpha: 0, scaleX: 0 });

      onDestroy(() => {
        controller.abort();
        observer.disconnect();
        rows().forEach((row) => delete row.dataset.readerBound);
        gsap.killTweensOf(reader);
        gsap.set(reader, { clearProps: "all" });
        delete record.dataset.recordReady;
      });
    });
  },
};
