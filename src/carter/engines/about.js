import gsap from "gsap";
import {
  cancelRollText,
  clock,
  c as aboutConfig,
  o as rollText,
  presence,
} from "./about-services.js";
import { getCarterRoot, onDestroy } from "../runtime.js";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const contributionUrl = `https://github-contributions-api.jogruber.de/v4/${aboutConfig.socials.github
  .split("/")
  .filter(Boolean)
  .pop()}?y=last`;
const heat = [0.07, 0.22, 0.42, 0.65, 0.9];
const greens = ["", "#0e4429", "#006d32", "#26a641", "#39d353"];

export const About = {
  init() {
    const root = getCarterRoot();
    const page = root?.querySelector("[data-about]");
    if (!page) return;

    const stateLabel = page.querySelector("[data-about-state]");
    const time = page.querySelector("[data-about-time]");
    const timeRow = time?.parentElement;
    const onlineRow = page.querySelector("[data-online-row]");
    const onlineValue = page.querySelector("[data-online]");
    const commitsRow = page.querySelector("[data-commits-row]");
    const commitsTotal = page.querySelector("[data-commits-total]");
    const grid = page.querySelector("[data-commits]");
    const cells = grid ? [...grid.children] : [];
    const scopeButton = page.querySelector("[data-about-scope]");
    const controller = new AbortController();
    const pending = new Set();
    const timers = new Set();
    const rolled = [stateLabel, time, onlineValue, commitsTotal].filter(
      Boolean,
    );
    let alive = true;
    let live = false;
    let tapeIsGreen = false;
    let stopClock = () => {};
    let stopPresence = () => {};
    let fetchController = null;

    const markReady = () => {
      if (!alive || live || pending.size) return;
      live = true;
      page.dataset.state = "live";
      rollText(stateLabel, "Live");
    };

    const hideRow = (row) => {
      if (!row || row.hidden) return;
      if (reducedMotion()) {
        row.hidden = true;
        return;
      }
      gsap.to(row, {
        scaleY: 0,
        duration: 0.4,
        ease: "expo.out",
        onComplete: () => {
          if (alive) row.hidden = true;
        },
      });
    };

    const gauge = (key, row) => {
      pending.add(key);
      let settled = false;
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (settled) return;
        settled = true;
        hideRow(row);
        pending.delete(key);
        markReady();
      }, 7000);
      timers.add(timer);

      return () => {
        if (!alive) return;
        row?.setAttribute("data-live", "");
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        timers.delete(timer);
        pending.delete(key);
        markReady();
      };
    };

    if (time) {
      let firstTime = true;
      stopClock = clock.subscribe((value) => {
        if (!alive) return;
        rollText(time, value);
        if (firstTime && timeRow) {
          firstTime = false;
          timeRow.setAttribute("data-live", "");
        }
      });
    }

    if (onlineRow && onlineValue) {
      const ready = gauge("online", onlineRow);
      stopPresence = presence.subscribe((count) => {
        if (!alive) return;
        rollText(onlineValue, String(count));
        ready();
      });
    }

    if (grid || commitsTotal) {
      const ready = gauge("commits", commitsRow);
      fetchController = new AbortController();
      fetch(contributionUrl, { signal: fetchController.signal })
        .then((response) =>
          response.ok ? response.json() : Promise.reject(response.status),
        )
        .then((data) => {
          if (!alive) return;
          if (grid) {
            const contributions = data.contributions?.slice(-154) ?? [];
            contributions.forEach((entry, index) => {
              const cell = cells[index];
              if (!cell) return;
              const delay = reducedMotion() ? 0 : 0.028;
              cell.style.setProperty(
                "--d",
                `${(Math.floor(index / 7) * delay).toFixed(3)}s`,
              );
              cell.style.setProperty(
                "--heat",
                String(heat[entry.level] ?? heat[0]),
              );
              if (entry.level)
                cell.style.setProperty(
                  "--gh",
                  greens[entry.level] ?? greens[1],
                );
            });
          }
          const total = commitsTotal
            ? Object.values(data.total ?? {}).at(-1)
            : undefined;
          if (commitsTotal && total) {
            rollText(commitsTotal, `${total.toLocaleString("en-US")}/YR`);
            ready();
          }
        })
        .catch((error) => {
          if (error?.name !== "AbortError") {
            // Carter's source leaves this row in its loading state until the
            // 7-second gauge hides it; the About state then becomes Live.
          }
        });
    }

    if (scopeButton && grid) {
      const rows = Math.ceil(cells.length / 7);
      const offsets = cells.map((_, index) => {
        const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
        return value - Math.floor(value);
      });
      scopeButton.addEventListener(
        "click",
        () => {
          tapeIsGreen = !tapeIsGreen;
          scopeButton.setAttribute("aria-pressed", String(tapeIsGreen));
          page.dataset.tape = tapeIsGreen ? "green" : "ink";
          gsap.to(cells, {
            rotateY: tapeIsGreen ? 180 : 0,
            duration: reducedMotion() ? 0 : 0.8,
            ease: "expo.out",
            overwrite: "auto",
            stagger: reducedMotion()
              ? 0
              : (index) => {
                  const row = Math.floor(index / 7);
                  const column = index % 7;
                  return (
                    Math.hypot(rows - 1 - row, column * 1.4) * 0.028 +
                    offsets[index] * 0.16
                  );
                },
          });
        },
        { signal: controller.signal },
      );
    }

    markReady();

    onDestroy(() => {
      alive = false;
      controller.abort();
      stopClock();
      stopPresence();
      fetchController?.abort();
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      gsap.killTweensOf([...cells, onlineRow, commitsRow].filter(Boolean));
      rolled.forEach(cancelRollText);
      if (timeRow) timeRow.removeAttribute("data-live");
      if (onlineRow) onlineRow.removeAttribute("data-live");
      if (commitsRow) commitsRow.removeAttribute("data-live");
      if (scopeButton) scopeButton.setAttribute("aria-pressed", "false");
      delete page.dataset.tape;
      if (live) page.dataset.state = "boot";
      if (stateLabel) stateLabel.textContent = "Sync";
      if (time) time.textContent = "--:--";
      if (onlineValue) onlineValue.textContent = "···";
      if (commitsTotal) commitsTotal.textContent = "···";
      cells.forEach((cell) => {
        cell.style.removeProperty("--d");
        cell.style.removeProperty("--heat");
        cell.style.removeProperty("--gh");
      });
    });
  },
};
