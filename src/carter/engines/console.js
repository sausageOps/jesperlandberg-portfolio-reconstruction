/* Local, visual-only simulated radio. No radio service or audio playback. */
import catalogue from "./radio-catalogue.json";
import { getCarterRoot, onDestroy as e } from "../runtime.js";
import { J as i, Rt as a, St as o, n as s, ot as c, ut as l, xt as u } from "./three.js";

const d = () => matchMedia(`(prefers-reduced-motion: reduce)`).matches;
const stationStartedAt = Date.now() - ((3 * 24 + 2) * 60 + 48) * 60 * 1000;
const h = (ms) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, `0`)}`;
};
const b = `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  x = `
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform float uDpr; uniform float uLive;
uniform float uWaveY; uniform float uWaveAmp; uniform float uX0;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 px = gl_FragCoord.xy / uDpr;
  float y = uRes.y - px.y;
  float a = 0.0;
  float w = sin(px.x * 0.021 + uTime * 1.7) * 0.5 + sin(px.x * 0.047 - uTime * 2.4) * 0.3 + sin(px.x * 0.009 + uTime * 0.6) * 0.2;
  float amp = uWaveAmp * uLive;
  float hmask = smoothstep(uX0, uX0 + 40.0, px.x) * smoothstep(uRes.x, uRes.x - 30.0, px.x);
  float d1 = abs(y - (uWaveY + w * amp));
  a += smoothstep(5.0, 0.0, d1) * (0.02 + 0.045 * uLive) * hmask;
  float d2 = abs(y - (uWaveY - w * amp * 0.55));
  a += smoothstep(3.8, 0.0, d2) * (0.012 + 0.022 * uLive) * hmask;
  a += smoothstep(1.6, 0.2, d1) * 0.06 * (1.0 - uLive) * hmask;
  float seg = floor(px.x / 3.0);
  float tick30 = floor(uTime * 30.0);
  float cr = hash(vec2(seg * 1.618, tick30 * 3.7));
  float spike = step(0.992, cr) * (1.0 - uLive);
  float ch = 2.0 + hash(vec2(seg * 7.3, tick30)) * 6.0;
  a += spike * smoothstep(ch, 0.0, abs(y - uWaveY)) * 0.26 * hmask;
  gl_FragColor = vec4(vec3(0.97), min(a, 1.0));
}`;
const S = new (class {
  init() {
    const t = getCarterRoot()?.querySelector(`[data-console]`);
    if (!t) return;
    const p = (selector) => t.querySelector(selector);
    const _ = {
      state: p(`[data-con-state]`), status: p(`[data-con-status]`),
      img: p(`[data-con-img]`), track: p(`[data-con-track]`),
      artist: p(`[data-con-artist]`),
      elapsed: p(`[data-con-elapsed]`), remain: p(`[data-con-remain]`),
      bar: p(`[data-con-bar]`), now: p(`.con__now`),
      rot: p(`[data-con-rot]`), tape: p(`[data-con-tape]`),
      tapeK: p(`[data-con-tape-k]`),
    };
    let S = { live: true, track: null }, lastIndex = -1, trackStartedAt = 0;
    const controller = new AbortController();
    const updateUptime = () => {
      const minutes = Math.max(0, Math.floor((Date.now() - stationStartedAt) / 60000));
      const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60);
      if (_.tapeK) _.tapeK.textContent = `${days} DAYS::`;
      if (_.tape) _.tape.textContent = `${hours}H ${String(minutes % 60).padStart(2, `0`)}M`;
    };
    const updateProgress = () => {
      if (!S.track) return;
      const elapsed = Math.min(Math.max(0, Date.now() - trackStartedAt), S.track.duration_ms);
      if (_.elapsed) _.elapsed.textContent = h(elapsed);
      if (_.remain) _.remain.textContent = `−${h(S.track.duration_ms - elapsed)}`;
      if (_.bar) _.bar.style.transform = `scaleX(${(elapsed / S.track.duration_ms).toFixed(4)})`;
      t.dataset.progressAt = String(elapsed / S.track.duration_ms);
    };
    const fitRotation = () => {
      if (!_.rot?.parentElement) return;
      _.rot.style.fontSize = ``;
      const available = _.rot.parentElement.clientWidth;
      const measured = _.rot.offsetWidth;
      if (available && measured > available) {
        const size = parseFloat(getComputedStyle(_.rot).fontSize);
        _.rot.style.fontSize = `${Math.max(7, size * available / measured * 0.98)}px`;
      }
    };
    const rotationObserver = _.rot?.parentElement && new ResizeObserver(fitRotation);
    if (rotationObserver) rotationObserver.observe(_.rot.parentElement);
    e(() => rotationObserver?.disconnect());
    const selectTrack = () => {
      let index = Math.floor(Math.random() * (catalogue.length - 1));
      if (lastIndex < 0) index = Math.floor(Math.random() * catalogue.length);
      else if (index >= lastIndex) index++;
      lastIndex = index;
      const song = catalogue[index];
      trackStartedAt = Date.now();
      S = { live: true, track: song };
      const artist = [song.artist, ...(song.featuredArtists ?? [])].join(`, `);
      const count = 9 + Math.floor(Math.random() * 12);
      t.dataset.on = `true`;
      t.dataset.state = `live`;
      t.dataset.catalogue = `true`;
      t.dataset.progress = `live`;
      t.dataset.title = song.title;
      t.dataset.artist = artist;
      t.dataset.album = song.album;
      t.dataset.duration = String(song.duration_ms);
      t.dataset.art = song.artwork ?? ``;
      if (_.state) _.state.textContent = `LIVE`;
      if (_.status) _.status.textContent = `ON AIR`;
      if (_.track) { _.track.textContent = song.title; _.track.title = song.title; }
      if (_.artist) { _.artist.textContent = artist; _.artist.title = artist; _.artist.hidden = false; }
      if (_.rot) { _.rot.textContent = `${song.artist} ×${count}`; _.rot.title = `${song.artist} ×${count}`; fitRotation(); }
      if (_.img) {
        if (song.artwork) { _.img.src = song.artwork; _.img.hidden = false; }
        else { _.img.hidden = true; _.img.removeAttribute(`src`); }
      }
      updateProgress();
      updateUptime();
    };
    const tick = () => {
      updateUptime();
      if (S.track && Date.now() - trackStartedAt >= S.track.duration_ms) selectTrack();
      else updateProgress();
    };
    _.img?.addEventListener(`error`, () => { _.img.hidden = true; }, { signal: controller.signal });
    document.addEventListener(`visibilitychange`, () => { if (!document.hidden) tick(); }, { signal: controller.signal });
    selectTrack();
    const interval = setInterval(() => { if (!document.hidden) tick(); }, 1000);
    e(() => { clearInterval(interval); controller.abort(); });
      let L = null,
        R = () => {
          if (!(L || d() || t.hasAttribute(`data-con-plain`)))
            try {
              let n = new s({ antialias: !1, alpha: !0 }),
                r = {
                  uTime: { value: 0 },
                  uRes: { value: new a(1, 1) },
                  uDpr: { value: 1 },
                  uLive: { value: 0 },
                  uWaveY: { value: 0 },
                  uWaveAmp: { value: 10 },
                  uX0: { value: 0 },
                },
                d = new u(),
                f = new l(2, 2),
                p = new o({
                  vertexShader: b,
                  fragmentShader: x,
                  uniforms: r,
                  transparent: !0,
                  depthTest: !1,
                });
              d.add(new i(f, p));
              let m = new c(-1, 1, 1, -1, 0, 1),
                h = n.domElement;
              ((h.className = `con__glcanvas`),
                h.setAttribute(`aria-hidden`, `true`),
                t.prepend(h));
              let g = () => {
                let e = t.getBoundingClientRect(),
                  i = Math.min(devicePixelRatio, 2);
                (n.setPixelRatio(i),
                  n.setSize(e.width, e.height, !1),
                  r.uRes.value.set(e.width, e.height),
                  (r.uDpr.value = i));
                let a = _.now?.getBoundingClientRect(),
                  o = _.track?.getBoundingClientRect();
                (a &&
                  ((r.uWaveY.value = a.top - e.top + a.height / 2),
                  (r.uWaveAmp.value = Math.min(12, a.height * 0.14))),
                  (r.uX0.value = o
                    ? o.left - e.left + Math.min(o.width, e.width * 0.55)
                    : e.width * 0.5));
              };
              g();
              let v = new ResizeObserver(g);
              (v.observe(t), (L = { renderer: n, uni: r }));
              let y = !0,
                C = 0,
                w = performance.now(),
                T = (e) => {
                  if (!y) {
                    C = 0;
                    return;
                  }
                  C = requestAnimationFrame(T);
                  let t = Math.min((e - w) / 1e3, 0.05);
                  ((w = e),
                    (r.uTime.value += t),
                    (r.uLive.value +=
                      (+!!S.live - r.uLive.value) * Math.min(t * 3, 1)),
                    n.render(d, m));
                },
                E = new IntersectionObserver(
                  (e) => {
                    let t = y;
                    ((y = e[0].isIntersecting),
                      y &&
                        !t &&
                        !C &&
                        ((w = performance.now()),
                        (C = requestAnimationFrame(T))));
                  },
                  { rootMargin: `10% 0px` },
                );
              (E.observe(t),
                (C = requestAnimationFrame(T)),
                e(() => {
                  (cancelAnimationFrame(C),
                    v.disconnect(),
                    E.disconnect(),
                    f.dispose(),
                    p.dispose(),
                    n.dispose(),
                    n.forceContextLoss(),
                    h.remove(),
                    (L = null));
                }));
            } catch {
              L = null;
            }
        },
        z = new IntersectionObserver(
          (e) => {
            e[0].isIntersecting && (z.disconnect(), R());
          },
          { rootMargin: `25% 0px` },
        );
      (z.observe(t), e(() => z.disconnect()));
    }
  })();
export { S as Console };
