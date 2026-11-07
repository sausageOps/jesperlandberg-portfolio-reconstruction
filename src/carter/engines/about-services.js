import gsap from "gsap";

export const aboutConfig = Object.freeze({
  url: "https://carterogunsola.com",
  hud: { timeZone: "Asia/Kolkata" },
  presence: {
    host: "carter-2026-presence.carterogunsola7589.workers.dev",
  },
  socials: {
    github: "https://github.com/CarterOgunsola",
  },
});

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const textTimelines = new WeakMap();
const textValues = new WeakMap();

/** Carter's short vertical text-roll transition used by telemetry and radio. */
export function rollText(element, value, options = {}) {
  if (!element) return;

  const previousText = element.textContent ?? "";
  const swap =
    options.swap ??
    (() => {
      element.textContent = value;
    });
  const previousValue = textTimelines.has(element)
    ? textValues.get(element)
    : previousText;

  if (!options.swap && !options.enterOnly && previousValue === value) return;
  textTimelines.get(element)?.kill();
  textValues.set(element, value);

  if (reducedMotion()) {
    swap();
    gsap.set(element, { yPercent: 0 });
    textTimelines.delete(element);
    textValues.delete(element);
    return;
  }

  const direction = options.dir ?? 1;
  const speed = 1 / Math.max(0.4, options.speed ?? 1);
  const timeline = gsap.timeline({
    delay: (options.delay ?? 0) * speed,
    onComplete: () => {
      textTimelines.delete(element);
      textValues.delete(element);
    },
  });

  if (options.enterOnly) {
    swap();
    timeline.set(element, { yPercent: 100 * direction });
  } else {
    const currentY = gsap.getProperty(element, "yPercent") || 0;
    const travel = Math.abs(-100 * direction - currentY) / 100;
    if (previousText.trim() && travel > 0.02) {
      timeline.to(element, {
        yPercent: -100 * direction,
        duration: 0.26 * speed * travel,
        ease: "power2.in",
      });
    }
    timeline.call(swap);
    timeline.set(element, { yPercent: 100 * direction });
  }

  timeline.to(element, {
    yPercent: 0,
    duration: 0.6 * speed,
    ease: "expo.out",
  });
  textTimelines.set(element, timeline);
}

export function cancelRollText(element) {
  if (!element) return;
  textTimelines.get(element)?.kill();
  gsap.killTweensOf(element);
  textTimelines.delete(element);
  textValues.delete(element);
}

const clockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: aboutConfig.hud.timeZone,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function readClock() {
  const parts = clockFormatter.formatToParts(new Date());
  const part = (type) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")} ${part("dayPeriod")} IST`;
}

const clockSubscribers = new Set();
let clockTimer = 0;
let clockVisibilityListener = null;

function tickClock() {
  const value = readClock();
  clockSubscribers.forEach((subscriber) => subscriber(value));
}

export const clock = {
  subscribe(subscriber) {
    subscriber(readClock());
    clockSubscribers.add(subscriber);

    if (!clockTimer) {
      clockTimer = window.setInterval(() => {
        if (!document.hidden) tickClock();
      }, 1_000);
    }
    if (!clockVisibilityListener) {
      clockVisibilityListener = () => {
        if (!document.hidden && clockSubscribers.size) tickClock();
      };
      document.addEventListener("visibilitychange", clockVisibilityListener);
    }

    return () => {
      clockSubscribers.delete(subscriber);
      if (clockSubscribers.size) return;
      window.clearInterval(clockTimer);
      clockTimer = 0;
      document.removeEventListener("visibilitychange", clockVisibilityListener);
      clockVisibilityListener = null;
    };
  },
};

const liveRealtime = () =>
  new URLSearchParams(window.location.search).get("realtime") === "live";

function makeRealtimeStore({ room, party, initialValue, onMessage }) {
  const subscribers = new Set();
  let value = initialValue;
  let initialized = false;
  let socket = null;
  let heartbeat = 0;

  const emit = () => {
    subscribers.forEach((subscriber) => subscriber(value));
  };

  const stopHeartbeat = () => {
    window.clearInterval(heartbeat);
    heartbeat = 0;
  };

  const close = () => {
    stopHeartbeat();
    if (socket) {
      socket.removeEventListener("message", receive);
      socket.removeEventListener("open", startHeartbeat);
      socket.removeEventListener("close", stopHeartbeat);
      try {
        socket.close();
      } catch {
        // A closing socket can throw in older browsers; teardown is best-effort.
      }
      socket = null;
    }
    initialized = false;
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeat = window.setInterval(() => {
      if (socket?.readyState !== WebSocket.OPEN) return;
      try {
        socket.send('{"type":"ping"}');
      } catch {
        // The next heartbeat or close event will settle the connection.
      }
    }, 20_000);
  };

  const receive = (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    const nextValue = onMessage(message, value);
    if (nextValue === undefined) return;
    value = nextValue;
    emit();
  };

  const start = () => {
    if (initialized) return;
    initialized = true;

    if (!liveRealtime()) {
      value = initialValue;
      return;
    }

    value = null;
    try {
      socket = new WebSocket(
        `wss://${aboutConfig.presence.host}/parties/${party}/${room}`,
      );
      socket.addEventListener("message", receive);
      socket.addEventListener("open", startHeartbeat);
      socket.addEventListener("close", stopHeartbeat);
    } catch {
      socket = null;
    }
  };

  return {
    subscribe(subscriber) {
      subscribers.add(subscriber);
      start();
      if (value !== null) subscriber(value);
      return () => {
        subscribers.delete(subscriber);
        if (!subscribers.size) close();
      };
    },
  };
}

export const presence = makeRealtimeStore({
  room: "global",
  party: "presence",
  initialValue: 1,
  onMessage(message) {
    return message.type === "count" && typeof message.n === "number"
      ? message.n
      : undefined;
  },
});

export const nowPlaying = makeRealtimeStore({
  room: "now-playing",
  party: "now-playing",
  initialValue: null,
  onMessage(message) {
    return message.type === "nowplaying" && typeof message.live === "boolean"
      ? { live: message.live, track: message.track ?? null }
      : undefined;
  },
});

// Carter's compact engine imports: site config, text roll, and NowPlaying store.
export const c = aboutConfig;
export const o = rollText;
export const r = nowPlaying;
