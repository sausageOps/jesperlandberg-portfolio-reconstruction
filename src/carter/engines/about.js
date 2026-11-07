import gsap from "gsap";
import {
  cancelRollText,
  clock,
  o as rollText,
  presence,
} from "./about-services.js";
import { getCarterRoot, onDestroy } from "../runtime.js";
import contributions from "./github-contributions-2026.json";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Snapshot obtained from GitHub's profile contribution calendar (UTC).
const heat = [0.07, 0.22, 0.42, 0.65, 0.9];
const greens = ["rgba(247, 247, 247, 0.07)", "#0e4429", "#006d32", "#26a641", "#39d353"];

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
      if (commitsTotal) {
        rollText(commitsTotal, `${contributions.total.toLocaleString("en-US")}/YR`);
        ready();
      }
      if (grid) {
        const byDate = new Map(contributions.days.map((day) => [day.date, day]));
        // Show the 22 calendar weeks ending with the snapshot's week, Sunday first.
        const end = new Date(`${contributions.asOf}T00:00:00Z`);
        end.setUTCDate(end.getUTCDate() + 6 - end.getUTCDay());
        const start = new Date(end);
        start.setUTCDate(start.getUTCDate() - (cells.length - 1));
        const today = new Date().toISOString().slice(0, 10);
        cells.forEach((cell, index) => {
          const date = new Date(start);
          date.setUTCDate(start.getUTCDate() + index);
          const iso = date.toISOString().slice(0, 10);
          const day = byDate.get(iso);
          const level = day && iso <= today && iso <= contributions.asOf ? day.level : 0;
          const opacity = heat[level] ?? heat[0];
          cell.style.setProperty("--heat", String(opacity));
          // The reverse face uses the same activity level in Carter’s green mode.
          cell.style.setProperty("--gh", greens[level] ?? greens[0]);
          cell.style.setProperty("--d", `${(Math.floor(index / 7) * (reducedMotion() ? 0 : 0.028)).toFixed(3)}s`);
        });
      }
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
