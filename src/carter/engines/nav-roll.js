import { getCarterRoot, onDestroy } from "../runtime.js";

export const NavRoll = {
  init() {
    const root = getCarterRoot();
    if (!root) return;

    const labels = [
      ...root.querySelectorAll("[data-roll]:not([data-roll-done])"),
    ];
    const originals = new Map();

    labels.forEach((label) => {
      const text = (label.textContent ?? "").trim();
      originals.set(label, text);
      label.replaceChildren();
      [...text].forEach((character, index) => {
        const span = document.createElement("span");
        span.textContent = character;
        span.style.setProperty("--index", String(index));
        if (character === " ") span.style.whiteSpace = "pre";
        label.appendChild(span);
      });
      label.dataset.rollDone = "";
    });

    onDestroy(() => {
      originals.forEach((text, label) => {
        label.textContent = text;
        delete label.dataset.rollDone;
      });
    });
  },
};
