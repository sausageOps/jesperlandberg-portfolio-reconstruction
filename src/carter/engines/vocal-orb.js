/* Vocal Orb source: Carter @ 3f50832420aa2a7bc0d1e7d5c4ba5fc2e7361249.
 * Styles are imported by the stage; lifecycle guards are documented in this port. */
var e = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M21.5 9.99999L19.3787 12.1213M19.3787 12.1213L17.2574 14.2426M19.3787 12.1213L17.2574 9.99999M19.3787 12.1213L21.5 14.2426M3.75 7.74999H5.35491C5.77433 7.74999 6.18314 7.61813 6.52352 7.37306L11.4578 3.82034C11.7886 3.58221 12.25 3.81856 12.25 4.22611V19.7739C12.25 20.1814 11.7886 20.4178 11.4578 20.1796L6.52352 16.6269C6.18314 16.3818 5.77433 16.25 5.35491 16.25H3.75C2.64543 16.25 1.75 15.3546 1.75 14.25V9.74999C1.75 8.64542 2.64543 7.74999 3.75 7.74999Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
`, t = [`glass`, `silver`, `void`], n = [{ id: `af_heart`, label: `Heart` }, { id: `af_bella`, label: `Bella` }, { id: `am_michael`, label: `Michael` }, { id: `bf_emma`, label: `Emma` }, { id: `bm_george`, label: `George` }, { id: `bm_fable`, label: `Fable` }], r = [{ id: `live`, label: `Live` }, { id: `readback`, label: `Read back` }], i = [{ id: `room`, label: `Room` }, { id: `hall`, label: `Hall` }, { id: `delay`, label: `Delay` }, { id: `radio`, label: `Radio` }, { id: `robot`, label: `Robot` }], a = { heart: `silver`, speaker: `live`, effect: `room`, voice: `af_heart`, speed: 1, energy: 1, flare: 1, bloom: 1, spread: 1, rest: 0.8, view: 8, size: 0.3 }, o = [{ key: `heart`, label: `Heart`, type: `segment`, default: a.heart, options: t.map((e2) => ({ id: e2, label: e2[0].toUpperCase() + e2.slice(1) })) }, { key: `rest`, label: `Rest`, type: `range`, min: 0, max: 1, step: 0.05, default: a.rest }, { key: `view`, label: `View`, type: `range`, min: 1, max: 40, step: 0.5, default: a.view }, { key: `flare`, label: `Flare`, type: `range`, min: 0, max: 2, step: 0.05, default: a.flare }, { key: `bloom`, label: `Bloom`, type: `range`, min: 0, max: 2, step: 0.05, default: a.bloom }, { key: `speed`, label: `Speed`, type: `range`, min: 0, max: 3, step: 0.05, default: a.speed }, { key: `energy`, label: `Energy`, type: `range`, min: 0, max: 2, step: 0.05, default: a.energy }, { key: `spread`, label: `Spread`, type: `range`, min: 0, max: 3, step: 0.05, default: a.spread }, { key: `size`, label: `Size`, type: `range`, min: 0.08, max: 0.4, step: 0.01, default: a.size }], s = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`, c = `
vec3 finish(vec3 col, vec2 frag) {
  col = 1.0 - exp(-col * 1.1);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  // interleaved gradient noise: an even, grain-free dither
  col += (fract(52.9829189 * fract(dot(frag, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  return uBg + col * (1.0 - uBg);
}`, l = (e2) => `#version 300 es
precision highp float;
${e2 ? `#define DIRECT` : ``}
uniform vec2 uRes;
uniform float uTime;
uniform float uSize;
uniform float uShift; // the scene's centre, moved up from the stage's (device px)
uniform float uEnergy;
uniform float uSpread;
uniform float uFlare;
uniform float uLive;  // 0 asleep \u2192 1 listening (sprung: it surges past 1 waking)
uniform float uDorm;  // how dormant, 0..1: asleep \xD7 Rest (dim, grey, calm, drawn in)
uniform float uVoice; // loudness, 0..1, normalised to the room
uniform vec3 uBands;  // low / mid / high, 0..1
uniform vec3 uMood;   // the felt colour (see MOODS)
uniform float uMoodAmt;    // how strongly it's felt, 0..1
uniform float uMoodEnergy; // calmer (<0) or livelier (>0)
uniform float uView;
uniform int uHeart; // 0 glass orb, 1 silver orb, 2 the void
uniform float uGlass; // the orb's face, 0 silver \u2192 1 glass (eased: it turns as it wakes)
uniform vec2 uTilt; // the hand's parallax: the camera raised (degrees) and turned (radians)
uniform vec3 uBg;
out vec4 outColor;

const int STEPS = 420;
const float R_IN = 2.6;   // the disk's inner edge (just inside the last stable orbit)
const float R_OUT = 11.0; // where it has thinned to nothing
const float B_CRIT = 2.598; // the shadow's radius as seen from far away (3\u221A3/2)

// \u2500\u2500 value noise + fbm (the disk's streaks) \u2500\u2500
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x),
                 mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x),
                 mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm2(vec3 p) {
  return (vnoise(p) * 0.5 + vnoise(p * 2.03 + vec3(1.7, 9.2, 3.1)) * 0.25) / 0.75;
}
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s / 0.9375;
}

// The disk is SOLID GLASS, not smoke: one wide body and a few outer bands,
// each a smooth slab with crisp edges. Their boundaries wander slowly with
// angle and time (a low-frequency wobble, sheared by the orbit), so the ring
// lives without dissolving into noise.
float band(float r, float a, float b, float e) {
  return smoothstep(a, a + e, r) * (1.0 - smoothstep(b - e, b, r));
}

// Coverage of the disk at radius r, and where across its band the point
// sits (0 at an edge, 1 mid-band) for the glass sheen. Every band edge rides
// its own share of two slow wobble fields (w1, w2 in 0..1), so the bands
// swell, pinch and nearly merge. The outer bands are STREAMS: each covers
// only part of the circle (m, a per-stream mask over angle), so it begins,
// swells, thins into a tail and ends, and the orbit carries it round. That
// is what makes the silhouette pour instead of holding a lens shape.
vec2 slabs(float r, float w1, float w2, float ripple, vec4 m, float E) {
  float u = w1 - 0.5;
  float v = w2 - 0.5;
  float e0 = 4.35 + v * 1.3 + ripple;
  float a1 = 4.55 + v * 0.7 + u * 0.4 + ripple * 0.8, b1 = 5.35 + u * 1.2;
  float a2 = 5.5 + u * 0.9,                          b2 = 6.2 + v * 1.2 + u * 0.3;
  float a3 = 6.35 + v * 0.8,                         b3 = 7.4 - u * 1.1;
  float a4 = 7.6 - v * 0.7,                          b4 = 8.3 + u * 0.8;
  // a stream thins toward its tails, not just fades
  b1 = a1 + max(b1 - a1, 0.12) * m.x; b2 = a2 + max(b2 - a2, 0.1) * m.y;
  b3 = a3 + max(b3 - a3, 0.15) * m.z; b4 = a4 + max(b4 - a4, 0.08) * m.w;
  float cov = band(r, R_IN, e0, E) + band(r, a1, b1, E) * 0.95 * m.x + band(r, a2, b2, E) * 0.85 * m.y
            + band(r, a3, b3, E) * 0.7 * m.z + band(r, a4, b4, E) * 0.5 * m.w;
  float s = 0.0;
  if (r < e0) s = (r - R_IN) / (e0 - R_IN);
  else if (r < b1) s = (r - a1) / max(b1 - a1, 1e-3);
  else if (r < b2) s = (r - a2) / max(b2 - a2, 1e-3);
  else if (r < b3) s = (r - a3) / max(b3 - a3, 1e-3);
  else s = (r - a4) / max(b4 - a4, 1e-3);
  return vec2(cov, 1.0 - abs(2.0 * clamp(s, 0.0, 1.0) - 1.0));
}

// \u2500\u2500 THE MATERIAL: dispersive glass light \u2500\u2500
// Any object can wear it: hand it a coverage function sampled at a few
// offsets ACROSS an edge (here: radius), and it returns the light. Six
// wavelengths, each seeing the geometry a hair displaced and carrying its own
// spectral colour, sum back to white where coverage is solid, and fan out into
// a continuous spectrum (warm orange and yellow one side, cyan and blue the
// other) wherever an edge or a thread sits. RGB-only splitting can't do that:
// it fringes in three primaries.
const int TAPS = 6;
vec3 spectral(float x) {
  // x 0..1 \u2192 red \u2026 violet, a smooth ramp
  return clamp(vec3(
    1.4 - abs(x - 0.08) * 3.6,
    1.25 - abs(x - 0.42) * 3.4,
    1.4 - abs(x - 0.86) * 3.6), 0.0, 1.0);
}

// The threads' own colours: the reference's loop (orange, yellow, cyan, blue,
// magenta, back to orange). Green barely appears in it, so it barely appears
// here; the full spectrum is kept for the edge split above.
vec3 loopColour(float x) {
  x = fract(x) * 5.0;
  vec3 c0 = vec3(1.0, 0.42, 0.08), c1 = vec3(1.0, 0.86, 0.22), c2 = vec3(0.2, 0.86, 1.0),
       c3 = vec3(0.28, 0.36, 1.0), c4 = vec3(1.0, 0.28, 0.74);
  if (x < 1.0) return mix(c0, c1, x);
  if (x < 2.0) return mix(c1, c2, x - 1.0);
  if (x < 3.0) return mix(c2, c3, x - 2.0);
  if (x < 4.0) return mix(c3, c4, x - 3.0);
  return mix(c4, c0, x - 4.0);
}

// Blend two noise samples by weights that sum to 1 WITHOUT losing contrast
// (a plain mix of two unrelated noises flattens toward grey mid-fade).
float vpMix(float a, float b, float wa) {
  float wb = 1.0 - wa;
  return 0.5 + ((a - 0.5) * wa + (b - 0.5) * wb) / sqrt(wa * wa + wb * wb);
}

// Fine threads inside the bands, drawn along the flow: high frequency across
// the radius, low around the orbit, warped by the same wobble so they pour
// with the streams. Crisp (smoothstep), so every thread is an edge to split.
// Sampled in both flow phases (ringA / ringB, weight wa). Where a pixel
// covers more disk than a thread is wide (fp, the footprint), the detail
// fades to its average instead of aliasing.
// COST. This runs per wavelength per disk crossing, the hottest code in the
// experiment (with it, frames alternated 16/33ms; without it, a flat 60), so
// the noise is only computed where it can be seen: the coarse layer (which
// carries the rainbow fringe) per wavelength, the fine layer once per
// crossing (kFine, passed in), and neither where the footprint has faded it.
float threads(float r, vec2 ringA, vec2 ringB, float wa, float w1, float fp, float kFine) {
  float coarse = 1.0 - smoothstep(0.05, 0.14, fp);
  float n = 0.5;
  if (coarse > 0.0) {
    float zn = r * 9.0 + (w1 - 0.5) * 5.0;
    n = vpMix(vnoise(vec3(ringA * 1.4, zn)), vnoise(vec3(ringB * 1.4, zn)), wa);
  }
  float f = mix(0.5, n, coarse) * 0.7 + kFine * 0.3;
  float soft = 0.12 + fp * 2.0;
  return 0.45 + 0.55 * smoothstep(0.5 - soft, 0.5 + soft, f);
}

// The disk's slow shape fields at orbital angle a: two wobbles, the liquid
// ripple, and where round the circle each stream exists.
struct Shape { float w1; float w2; float ripple; vec4 m; };
Shape shapeAt(float a, float r, float t) {
  vec2 ring = vec2(cos(a), sin(a));
  Shape sh;
  // slow, broad wobbles: two octaves carry them (four cost double, unseen)
  sh.w1 = fbm2(vec3(ring * 1.1, r * 0.35 + t * 0.16));
  sh.w2 = fbm2(vec3(ring * 2.3 + 7.0, t * 0.22));
  sh.ripple = 0.22 * sin(a * 3.0 + t * 0.9) + 0.12 * sin(a * 5.0 - t * 1.3);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    sh.m[i] = vnoise(vec3(ring * 1.6 + fi * 3.7, t * (0.12 + 0.04 * fi) + fi));
  }
  return sh;
}

// The light a ray picks up crossing the disk plane at p, travelling along v;
// fp is how much disk (in radius) one pixel covers there.
//
// THE FLOW. Inner rings orbit faster than outer ones (Keplerian, \u03C9 \u221D r^\u22121.5),
// which is what shears the streams. Left to run, that shear winds the pattern
// tighter forever: after minutes it is finer than a pixel and the disk turns
// to moir\xE9. So the orbit is split: a rigid turn that runs forever, plus the
// shear, which runs in two copies half a period apart. Each copy resets every
// FLOW_P seconds, but only while its weight is zero, so the eye only ever sees
// a flow that keeps pouring (the flow-map crossfade).
const float OMEGA_REF = 0.33; // the rigid turn: the orbit near mid-disk
const float FLOW_P = 10.0;
vec4 disk(vec3 p, vec3 v, float t, float fp) {
  // awake, it pours harder; spoken to, harder still
  float en = uEnergy * (1.0 + 0.35 * uLive + 0.6 * uVoice) * (1.0 + 0.45 * uMoodEnergy * uMoodAmt) * (1.0 - 0.6 * uDorm);
  float r = length(p.xz);
  if (r < R_IN - 0.3 || r > R_OUT) return vec4(0.0);
  float phi = atan(p.z, p.x);
  float rigid = phi + mod(t * OMEGA_REF, 6.28318);
  float shear = 3.2 * pow(r, -1.5) - OMEGA_REF;
  float tA = mod(t, FLOW_P);
  float tB = mod(t + 0.5 * FLOW_P, FLOW_P);
  float wa = 1.0 - abs(2.0 * tA / FLOW_P - 1.0);
  wa = wa * wa * (3.0 - 2.0 * wa);
  float aA = rigid + shear * tA;
  float aB = rigid + shear * tB;
  Shape A = shapeAt(aA, r, t);
  Shape B = shapeAt(aB, r, t);
  // two slow wobble fields shape the bands (scaled about 0.5 by Energy)
  float w1 = 0.5 + (vpMix(A.w1, B.w1, wa) - 0.5) * en;
  float w2 = 0.5 + (vpMix(A.w2, B.w2, wa) - 0.5) * en;
  // the body's edge ripples like a liquid surface
  float ripple = mix(B.ripple, A.ripple, wa) * en;
  // spoken to, the edge comes alive: the lows deepen the liquid ripple, the
  // mids add a finer, quicker one
  ripple *= 1.0 + 1.8 * uBands.x;
  ripple += 0.14 * uBands.y * sin(rigid * 8.0 - t * 5.0) * smoothstep(R_IN + 0.8, R_IN + 2.0, r);
  // where round the circle each stream exists (soft ends = tails)
  vec4 m;
  for (int i = 0; i < 4; i++) m[i] = smoothstep(0.32, 0.62, vpMix(A.m[i], B.m[i], wa));
  vec2 ringA = vec2(cos(aA), sin(aA));
  vec2 ringB = vec2(cos(aB), sin(aB));

  // edges: crisp, but never thinner than the pixel that draws them
  float E = max(0.04, fp * 1.3);

  // THE VOICE IN THE SHAPE. Loudness swells the whole disk outward (sampling
  // a smaller radius), and rings travel out from the centre through the band
  // edges, so each syllable visibly pushes through it.
  // (dormant, it draws in a little; waking, it breathes back out)
  float swell = (1.0 + 0.1 * uVoice) * (1.0 - 0.06 * uDorm);
  float rings = uVoice * 0.22 * sin(r * 2.6 - t * 7.0) * smoothstep(R_IN + 0.3, R_IN + 1.5, r);
  float rv = r / swell + rings;

  // the material: six wavelengths, each sampling the geometry (slabs \xD7
  // threads) at its own radius; dispersion grows outward, the hot lip stays
  // nearly white
  float sp = 0.26 * uSpread * (0.4 + 0.6 * smoothstep(R_IN, R_IN + 2.5, r)) * (1.0 - 0.6 * uDorm);
  vec3 light = vec3(0.0);
  vec3 norm = vec3(0.0);
  float covMid = 0.0;
  float across = 0.0;
  // the fine thread layer, once for this crossing (faded where too small)
  float fine = 1.0 - smoothstep(0.025, 0.07, fp);
  float kFine = 0.5;
  if (fine > 0.0) {
    float zk = rv * 17.0 - t * 0.1;
    kFine = mix(0.5, vpMix(vnoise(vec3(ringA * 3.1 + 2.0, zk)), vnoise(vec3(ringB * 3.1 + 2.0, zk)), wa), fine);
  }
  for (int k = 0; k < TAPS; k++) {
    float x = (float(k) + 0.5) / float(TAPS);
    float rk = rv + (x - 0.5) * sp;
    vec2 sl = slabs(rk, w1, w2, ripple, m, E);
    float c = sl.x * threads(rk, ringA, ringB, wa, w1, fp, kFine);
    vec3 w = spectral(x);
    light += w * c;
    norm += w;
    if (k == TAPS / 2) { covMid = sl.x; across = sl.y; }
  }
  vec3 cov = light / norm;

  // sheen across each band: edges catch more light than the middle, the way
  // a glass rod does
  float sheen = 0.7 + 0.6 * pow(1.0 - across, 3.0);
  // a highlight travelling round the ring, light sliding over a solid
  float glint = pow(max(cos(phi - 2.3 + 0.25 * sin(t * 0.3)), 0.0), 10.0);

  // white-hot inside; outward, each thread carries its own spectral colour
  // (hue steps fast across the radius, drifts slowly along the orbit), the
  // reference's orange-beside-yellow-beside-cyan
  float heat = exp(-(r - R_IN) * 0.5);
  float hue = r * 0.42 + (w1 - 0.5) * 0.8 + 0.15 * sin(rigid + 0.6) - t * 0.03;
  vec3 outer = mix(vec3(1.0, 0.55, 0.2), loopColour(hue), 0.82);
  // a felt mood tints the outer streams (the white-hot core stays white)
  outer = mix(outer, uMood * (0.75 + 0.25 * loopColour(hue)), 0.72 * uMoodAmt);
  // white belongs to the hot inner lip only; the streams keep their colour
  vec3 tint = mix(outer, vec3(1.0, 0.98, 0.95), smoothstep(0.32, 0.8, heat));

  // Doppler beaming: the side orbiting toward the camera burns brighter
  vec3 orbit = normalize(vec3(-sin(phi), 0.0, cos(phi)));
  float beam = pow(clamp(1.0 + 0.22 * dot(orbit, -normalize(v)), 0.4, 2.0), 3.0);

  // (dormant, the white-hot lip cools too: it sits far past white, where
  // dimming the whole only reads after the heat itself comes down)
  float lum = (1.5 + 2.0 * heat * (1.0 - 0.8 * uDorm)) * sheen * (1.0 + 1.5 * glint) * beam;
  vec3 c = tint * cov * lum * uFlare * (1.0 + 0.15 * uLive + 0.25 * uVoice);
  // DORMANT: embers. Dimmed and drained toward a warm grey, so waking has
  // somewhere to come up from
  c = mix(c, vec3(dot(c, vec3(0.3, 0.5, 0.2))) * vec3(1.0, 0.88, 0.76), 0.65 * uDorm) * (1.0 - 0.75 * uDorm);
  // solid: the body occludes what's behind it
  float alpha = clamp(covMid * 1.15, 0.0, 0.97);
  return vec4(c, alpha);
}

// \u2500\u2500 THE ORB: a glass sphere at the heart, just outside the horizon \u2500\u2500
// Big enough that light bends round it the way it bends round the shadow
// (seen from far away its outline sits almost exactly on the shadow's edge),
// so the disk still arches over it and passes in front. Gravity decides WHERE
// it sits; its FACE is drawn as a sphere looking straight at you, like the
// references: dark glass above, light below, and between them an S-curve
// that wraps with the sphere's curvature and wears the disk's six-wavelength
// dispersion. (A truly lensed orb arrives glancing and rings white; a
// volumetric surface seen from a few degrees above reads as a band, not a
// line. Both were tried.)
//
// o: the point on the face, unit disc, x right / y up; zz: its depth (1 at
// the centre, 0 at the outline); lw: the line's width in face units.
const float R_ORB = 1.6;
const float ORB_EDGE_B = 2.6128; // its outline: R / sqrt(1 \u2212 1/R), where rays just graze it
// The S-curve at x for strand k (0 = the main curve). Awake it moves more;
// the lows lift it, the mids ripple it.
float orbCurve(float x, float t, float k) {
  // awake, it breathes even in silence (so you can see it's listening)
  float amp = (1.0 + uLive * (0.3 + 0.18 * sin(t * 2.1)) + 0.8 * uBands.x + 0.35 * uVoice) * (1.0 - 0.65 * uDorm);
  float ph = k * 1.7;
  float y = 0.17 * amp * sin(x * 2.3 + t * 0.85 + ph)
          + 0.07 * (1.0 + 1.2 * uBands.y) * sin(x * 4.7 - t * 1.25 - ph * 0.6)
          + 0.025 * uBands.y * sin(x * 9.0 - t * 4.0 + ph * 2.0);
  return (y * (1.0 - 0.28 * k) + 0.12) * sqrt(max(1.0 - x * x * 0.55, 0.0));
}

vec3 orbShade(vec2 o, float zz, float t, float glass, float lw) {
  // the curve, following the sphere's curvature toward the outline
  float yw = orbCurve(o.x, t, 0.0);
  float d = o.y - yw;
  float fill = smoothstep(lw, -lw, d);
  // the dark glass: truly dark (0.004 linear reads ~30/255 after gamma)
  vec3 col = vec3(0.0004, 0.0004, 0.0007);
  // glass: coloured light pooled just under the curve, dying into the dark
  // glass (the Siri redesign): magenta \u2192 blue \u2192 cyan across the face
  vec3 tint = loopColour(0.5 + o.x * 0.3 + 0.08 * sin(t * 0.3));
  tint = mix(tint, uMood, 0.7 * uMoodAmt);
  vec3 glassC = tint * fill * (exp(d * (4.0 - 1.2 * uVoice)) * (0.9 + 0.5 * uLive + 0.9 * uVoice) + 0.04);
  // silver: liquid metal, brighter toward the bottom where it catches the
  // light (the macOS 27 orb)
  vec3 silverC = mix(vec3(0.72, 0.75, 0.82), uMood * 0.85, 0.45 * uMoodAmt) * fill * (0.16 + 0.34 * smoothstep(0.2, -0.95, o.y));
  // one turns into the other by POURING: the glass spreads from the middle
  // of the curve outward (and drains back the same way), a soft front
  // travelling across the face, never the whole face cross-fading at once
  float far = length(vec2(o.x, d * 1.6));
  // (the last tenth sweeps the front past the whole face: a curve lifted
  // by a loud voice reaches further than the resting one, and must not keep
  // a silver crescent at the bottom of a glass orb)
  float front = mix(-0.1, 2.6, glass) + 2.0 * smoothstep(0.9, 1.0, glass);
  col += mix(silverC, glassC, 1.0 - smoothstep(front - 0.35, front, far)) * (1.0 - 0.65 * uDorm);
  // the limb: a sphere darkens toward its outline
  col *= 0.35 + 0.65 * zz;

  // the curve itself: six wavelengths, each a hair higher or lower
  vec3 line = vec3(0.0);
  vec3 lnorm = vec3(0.0);
  for (int k = 0; k < TAPS; k++) {
    float x = (float(k) + 0.5) / float(TAPS);
    float dk = d + (x - 0.5) * 0.04 * uSpread * (1.0 + 1.5 * uBands.z);
    vec3 w = spectral(x);
    line += w * exp(-dk * dk / (lw * lw));
    lnorm += w;
  }
  col += (line / lnorm * (2.2 + 0.8 * uLive + 1.6 * uBands.z + 1.0 * uVoice) + exp(-d * d / 0.003) * (0.12 + 0.12 * uLive + 0.25 * uVoice)) * (1.0 - 0.6 * uDorm);

  // while you speak, fainter strands of the curve fan out round the main one,
  // each in its own colour (Siri's waves splitting)
  for (int s = 1; s <= 2; s++) {
    float ks = float(s);
    float ds = o.y - orbCurve(o.x, t, ks);
    float wk = lw * 1.4;
    vec3 sc = loopColour(0.45 + 0.22 * ks + o.x * 0.15);
    col += sc * exp(-ds * ds / (wk * wk)) * uVoice * (1.1 / ks) * zz;
  }

  // the glass: a rim lit warm by the disk all round it, a soft key above
  // (wide and low: a luminous falloff into the edge, not a drawn rim)
  float fres = pow(1.0 - zz, 2.5);
  col += fres * vec3(1.0, 0.86, 0.7) * (0.04 + 0.14 * smoothstep(0.4, -0.5, o.y));
  vec2 key = o - vec2(-0.32, 0.5);
  // (faint and tight: gamma lifts tiny linear values, and a broad 0.05 key
  // read as a grey dome over the dark glass)
  col += exp(-dot(key, key) * 14.0) * vec3(0.9, 0.93, 1.0) * 0.012;
  return col * uFlare;
}

${e2 ? c : ``}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float sh = min(uRes.x, uRes.y);
  vec2 uv = (frag - 0.5 * uRes - vec2(0.0, uShift)) / sh;
  float t = uTime;

  // camera: on a circle level with the disk, raised uView degrees (the hand
  // raises and turns it a little: uTilt), looking at the hole; the lens is
  // set so the shadow spans uSize of the short side
  float D = 26.0;
  float el = radians(max(uView + uTilt.x, 1.0));
  vec3 ro = vec3(sin(uTilt.y) * cos(el), sin(el), cos(uTilt.y) * cos(el)) * D;
  vec3 fw = normalize(-ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  float k = (B_CRIT / D) / (uSize * 0.5);
  vec3 rd = normalize(fw + (uv.x * rt + uv.y * up) * k);
  // one pixel's angular size: with distance travelled, the footprint
  float pa = k / sh;

  // \u2500\u2500 step the photon through the hole's gravity
  vec3 pos = ro;
  vec3 vel = rd;
  vec3 hv = cross(pos, vel);
  float h2 = dot(hv, hv);
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  // light that has already wrapped round the hole once (the under-arc, the
  // ring hugging the shadow) is real but should whisper, not compete
  float pass_ = 1.0;
  float swallowed = 0.0;
  float travelled = 0.0;
  // the orb: rays carry on through it, so its edge can fade into the disk
  // wrapping behind; what lay in FRONT of it is kept apart
  float reached = 0.0;
  vec3 colFront = vec3(0.0);
  float alphaFront = 0.0;
  for (int i = 0; i < STEPS; i++) {
    float r2 = dot(pos, pos);
    if (r2 < 1.0) { swallowed = 1.0; break; } // fell in (alpha stays = the disk in front)
    // "behind" begins once the ray passes close to the orb, touching it or not
    // (rays that just miss it skim the photon sphere and gather speckle)
    if (uHeart < 2 && reached < 0.5 && r2 < (R_ORB + 0.2) * (R_ORB + 0.2)) {
      reached = 1.0;
      colFront = col;
      alphaFront = alpha;
      // aimed inside the edge (+ the fade's margin), nothing behind will show
      // (see "behind" below): stop here and save the steps
      if (sqrt(h2) < ORB_EDGE_B + 0.03) break;
    }
    float r = sqrt(r2);
    // small steps near the hole (finest where light orbits it, so the thin
    // ring hugging the shadow stays clean), long strides far out
    float dt = clamp(mix(0.022, 0.06, smoothstep(2.0, 4.5, r)) * r, 0.02, 1.2);
    travelled += dt;
    vec3 prev = pos;
    vel += -1.5 * h2 * pos / (r2 * r2 * r) * dt;
    pos += vel * dt;
    // the third and later images of the disk are thinner than a pixel: sampled,
    // they speckle. Past the second pass, the photon ring below stands in
    if (prev.y * pos.y < 0.0 && pass_ > 0.2) {
      vec3 cross_ = mix(prev, pos, prev.y / (prev.y - pos.y));
      // a pixel's footprint on the disk: wider with distance, much wider at
      // a grazing angle (the disk is seen nearly edge-on)
      float fp = pa * travelled / max(abs(normalize(vel).y), 0.03);
      // lensing squeezes the second image (the under-arc, the far side's wrap)
      // far below the pixel: draw it blurred, never sampled sharp
      // (and past the point where the thread noise switches off: it's cheap)
      if (pass_ < 1.0) fp += 0.16;
      vec4 d = disk(cross_, vel, t, fp);
      // the disk's underside (rays curling up under the hole: the under-arc)
      // glows faintly; its top surface carries the light
      float side = vel.y > 0.0 ? 0.22 : 1.0;
      col += (1.0 - alpha) * d.rgb * pass_ * side;
      alpha += (1.0 - alpha) * d.a * pass_ * side;
      pass_ *= 0.3;
      if (alpha > 0.99) break;
    } else if (prev.y * pos.y < 0.0) {
      pass_ *= 0.3;
    }
    // escaped: heading out past the disk's edge, a ray never turns back (in
    // this gravity an outgoing ray outside the photon sphere climbs forever)
    // and any plane it crosses out here holds no disk. Exact, and it spares
    // every background pixel the long climb it used to make to r = 40
    if (r2 > (R_OUT + 0.5) * (R_OUT + 0.5) && dot(pos, vel) > 0.0) break;
  }

  // The shadow, its edge and the photon ring all come from the IMPACT
  // PARAMETER b: how far off-centre the ray was aimed. It's set by the pixel
  // alone and varies smoothly across the screen, and Schwarzschild is exact
  // about it: aimed inside 3\u221A3/2, the ray falls in. Anything measured along
  // the ray (closest approach, step count) flips within a sliver thinner than
  // a pixel there, and speckles.
  float b = sqrt(h2);
  float px = pa * D; // one pixel, in impact-parameter units
  float edgeB = B_CRIT;
  if (uHeart < 2) {
    // the orb: its outline is where rays just graze r = R_ORB
    edgeB = ORB_EDGE_B;
  }
  float inside = 1.0 - smoothstep(edgeB - px, edgeB + px, b);
  if (uHeart < 2) {
    if (reached < 0.5) { colFront = col; alphaFront = alpha; }
    // a soft edge: the orb fades over the outer ~6% of its radius, into
    // whatever lies behind it (the lensed disk), never cut on one pixel
    inside = 1.0 - smoothstep(edgeB - 0.16, edgeB + px, b);
    // only light from OUTSIDE the critical radius shows through the fade: inside
    // it, rays circle the hole before falling in and their disk light is
    // sub-pixel speckle
    vec3 behind = (col - colFront) * smoothstep(edgeB + 0.03, edgeB + 0.14, b);
    col = colFront + (1.0 - inside) * behind;
    if (inside > 0.0) {
      // Gravity decides WHERE the orb sits (its outline, what passes in front
      // of it), but its face is shaded as a plain sphere looking at you. Rays
      // that truly reach it arrive glancing (it sits just outside the photon
      // sphere, where light bends hardest), and a glancing orb rings white
      // all over; the references are calm, front-on spheres.
      float rUv = edgeB / (D * k); // the orb's radius on screen, in uv
      vec2 o = uv / rUv;
      float zz = sqrt(max(1.0 - dot(o, o), 0.0));
      float lw = max(0.012, 1.2 / (rUv * sh)); // never thinner than a pixel
      col += (1.0 - alphaFront) * orbShade(o, zz, t, uGlass, lw) * inside;
    }
  } else {
    // behind whatever disk lies in front, the shadow is black
    col *= 1.0 - inside * (1.0 - alpha);
  }
  // the photon ring: one clean hairline hugging the void (an orb has a soft
  // edge instead; a hairline round it read as an ink outline)
  if (uHeart == 2) {
    float pr = (b - edgeB - 1.5 * px) / max(px * 1.2, 0.004);
    col += vec3(1.0, 0.93, 0.85) * 0.55 * exp(-pr * pr) * (1.0 - alpha) * uFlare;
  }

#ifdef DIRECT
  outColor = vec4(finish(col, frag), 1.0);
#else
  // alpha marks the void, so the finish keeps the bloom out of it (the mask
  // fades across the edge with b, never stepping pixel by pixel). An orb
  // shines, so it takes the bloom.
  // (an orb's dark glass mostly keeps the disk's bloom off it too)
  float hole = uHeart < 2 ? inside * (1.0 - alphaFront) * 0.92 : max(inside, smoothstep(B_CRIT + 0.35, B_CRIT, b)) * (1.0 - alpha);
  outColor = vec4(col, hole);
#endif
}`, u = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uKnee; // first pass only: keep just the light past white
in vec2 vUv;
out vec4 outColor;
vec3 tap(vec2 uv) {
  vec3 c = texture(uSrc, uv).rgb;
  if (uKnee > 0.0) {
    float l = max(c.r, max(c.g, c.b));
    c *= smoothstep(uKnee, uKnee * 2.0, l);
  }
  return c;
}
void main() {
  vec2 h = uTexel * 0.5;
  vec3 c = tap(vUv) * 4.0;
  c += tap(vUv - h);
  c += tap(vUv + h);
  c += tap(vUv + vec2(h.x, -h.y));
  c += tap(vUv - vec2(h.x, -h.y));
  outColor = vec4(c / 8.0, 1.0);
}`, d = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec2 h = uTexel * 0.5;
  vec3 c = texture(uSrc, vUv + vec2(-h.x * 2.0, 0.0)).rgb;
  c += texture(uSrc, vUv + vec2(-h.x, h.y)).rgb * 2.0;
  c += texture(uSrc, vUv + vec2(0.0, h.y * 2.0)).rgb;
  c += texture(uSrc, vUv + vec2(h.x, h.y)).rgb * 2.0;
  c += texture(uSrc, vUv + vec2(h.x * 2.0, 0.0)).rgb;
  c += texture(uSrc, vUv + vec2(h.x, -h.y)).rgb * 2.0;
  c += texture(uSrc, vUv + vec2(0.0, -h.y * 2.0)).rgb;
  c += texture(uSrc, vUv + vec2(-h.x, -h.y)).rgb * 2.0;
  outColor = vec4(c / 12.0, 1.0);
}`, f = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomAmt;
uniform float uCA;
uniform vec3 uBg;
in vec2 vUv;
out vec4 outColor;
${c}
void main() {
  // lens fringe: red and blue land a hair apart, more toward the frame's edge
  vec2 ca = (vUv - 0.5) * 0.006 * uCA;
  vec3 scene = vec3(texture(uScene, vUv + ca).r, texture(uScene, vUv).g, texture(uScene, vUv - ca).b);
  // the shadow stays black: bloom doesn't wash into it
  float hole = texture(uScene, vUv).a;
  vec3 col = scene + texture(uBloom, vUv).rgb * 0.11 * uBloomAmt * (1.0 - 0.9 * hole);
  outColor = vec4(finish(col, gl_FragCoord.xy), 1.0);
}`, p = 6, m = [10 / 255, 10 / 255, 11 / 255];
function ee(e2, t2) {
  let n2 = (t3, n3) => {
    let r3 = e2.createShader(t3);
    if (e2.shaderSource(r3, n3), e2.compileShader(r3), !e2.getShaderParameter(r3, e2.COMPILE_STATUS)) throw Error(e2.getShaderInfoLog(r3) ?? `shader`);
    return r3;
  }, r2 = e2.createProgram();
  if (e2.attachShader(r2, n2(e2.VERTEX_SHADER, s)), e2.attachShader(r2, n2(e2.FRAGMENT_SHADER, t2)), e2.linkProgram(r2), !e2.getProgramParameter(r2, e2.LINK_STATUS)) throw Error(e2.getProgramInfoLog(r2) ?? `link`);
  let i2 = {};
  return { p: r2, u: (t3) => t3 in i2 ? i2[t3] : i2[t3] = e2.getUniformLocation(r2, t3) };
}
var v = `http://www.w3.org/2000/svg`, y = [3.75, 7.75, 12, 16.25, 20.25], te = [1.25, 6.25, 2.25, 4.25, 1.25], b = `1.5`, ne = (e2, t2) => ({ x: 0, v: 0, to: 0, at: 0, k: e2, c: t2 });
function x(e2, t2, n2) {
  let r2 = n2 >= e2.at ? e2.to : 1 - e2.to;
  for (let n3 = t2; n3 > 0; n3 -= 1 / 240) {
    let t3 = Math.min(n3, 1 / 240);
    e2.v += (e2.k * (r2 - e2.x) - e2.c * e2.v) * t3, e2.x += e2.v * t3;
  }
}
var re = (e2, t2) => x(e2, t2, 1 / 0), ie = (e2, t2, n2) => {
  e2.k = t2, e2.c = 2 * n2 * Math.sqrt(t2);
}, S = (e2) => Math.round(e2 * 1e3) / 1e3, ae = (e2, t2, n2, r2) => r2 < 0.01 ? `M${e2} ${S(t2)}V${S(n2)}` : `M${S(e2 - r2)} ${S(t2 + r2)}A${S(r2)} ${S(r2)} 0 0 1 ${S(e2 + r2)} ${S(t2 + r2)}V${S(n2 - r2)}A${S(r2)} ${S(r2)} 0 0 1 ${S(e2 - r2)} ${S(n2 - r2)}Z`;
function oe(e2) {
  let t2 = document.createElementNS(v, `svg`);
  t2.setAttribute(`viewBox`, `0 0 24 24`), t2.setAttribute(`fill`, `none`), t2.setAttribute(`aria-hidden`, `true`), t2.setAttribute(`shape-rendering`, `geometricPrecision`);
  let n2 = (e3, n3, r3 = t2) => {
    let i3 = document.createElementNS(v, e3);
    for (let e4 in n3) i3.setAttribute(e4, n3[e4]);
    return r3.appendChild(i3), i3;
  }, r2 = /* @__PURE__ */ new WeakMap(), i2 = (e3, t3, n3) => {
    let i3 = r2.get(e3);
    i3 || r2.set(e3, i3 = {}), i3[t3] !== n3 && (i3[t3] = n3, e3.setAttribute(t3, n3));
  }, a2 = { stroke: `currentColor`, "stroke-width": b, "stroke-linecap": `round`, "stroke-linejoin": `round` }, o2 = n2(`g`, {});
  n2(`path`, { ...a2, "vector-effect": `non-scaling-stroke`, d: `M5.124 14.5C6.281 17.149 8.924 19 12 19C15.075 19 17.719 17.149 18.876 14.5` }, o2), n2(`path`, { ...a2, "vector-effect": `non-scaling-stroke`, d: `M12 19V21.25` }, o2);
  let s2 = n2(`path`, { ...a2 }), c2 = y.map((e3, t3) => t3 === 2 ? null : n2(`path`, a2)), l2 = n2(`path`, { fill: `currentColor`, d: `M17.24 5.185L16.544 3.373C16.457 3.148 16.241 3 16 3C15.759 3 15.543 3.148 15.456 3.373L14.76 5.185C14.658 5.449 14.449 5.658 14.185 5.76L12.373 6.456C12.148 6.543 12 6.759 12 7C12 7.241 12.148 7.457 12.373 7.544L14.185 8.24C14.449 8.342 14.658 8.551 14.76 8.815L15.456 10.627C15.543 10.852 15.759 11 16 11C16.241 11 16.457 10.852 16.544 10.627L17.24 8.815C17.342 8.551 17.551 8.342 17.815 8.24L19.627 7.544C19.852 7.457 20 7.241 20 7C20 6.759 19.852 6.543 19.627 6.456L17.815 5.76C17.551 5.658 17.342 5.449 17.24 5.185Z` }), u2 = (e3, t3) => ne(e3, 2 * t3 * Math.sqrt(e3)), d2 = { spark: u2(150, 0.75), fold: u2(140, 0.95), capW: u2(200, 0.92), capH: u2(115, 0.8), inner: u2(155, 0.75), outer: u2(155, 0.75) }, f2 = Object.keys(d2), p2 = { spark: 0, fold: 0.04, capW: 0.08, capH: 0.17, inner: 0.22, outer: 0.27 }, m2 = { outer: 0, inner: 0.035, capH: 0.07, capW: 0.11, fold: 0.145, spark: 0.18 }, h2 = Object.fromEntries(f2.map((e3) => [e3, d2[e3].k])), g2 = te.map((e3) => ({ ...u2(260, 0.7), x: e3, to: e3 })), _2 = 0, ee2 = false, re2 = (e3, t3) => Math.abs(e3.x - t3) < 1e-4 && Math.abs(e3.v) < 1e-4, ie2 = (e3) => {
    if (!ee2) return false;
    for (let e4 of f2) if (_2 < d2[e4].at || !re2(d2[e4], d2[e4].to)) return false;
    for (let t3 = 0; t3 < g2.length; t3++) if (!re2(g2[t3], e3[t3])) return false;
    return true;
  }, oe2 = (t3) => {
    for (let n3 of f2) {
      let r3 = h2[n3] * (t3 ? 1 : 1.35);
      d2[n3].c *= Math.sqrt(r3 / d2[n3].k), d2[n3].k = r3, d2[n3].to = +!!t3, d2[n3].at = _2 + (e2 ? 0 : (t3 ? p2 : m2)[n3]), e2 && (d2[n3].x = d2[n3].to, d2[n3].v = 0);
    }
  }, se2 = (t3, n3) => {
    let r3 = Math.min(t3, 1 / 30);
    if (_2 += r3, ie2(n3)) return;
    if (ee2 = true, !e2) for (let e3 of f2) x(d2[e3], r3, _2);
    g2.forEach((e3, t4) => {
      e3.to = n3[t4], e3.at = 0, x(e3, r3, _2);
    });
    let a3 = g2.map((e3) => Math.max(0, e3.x)), u3 = d2.spark.x;
    u3 >= 0.995 ? i2(l2, `visibility`, `hidden`) : (i2(l2, `visibility`, `visible`), i2(l2, `transform`, `translate(16 7) rotate(${S(90 * u3)}) scale(${S(Math.max(0, 1 - u3))}) translate(-16 -7)`));
    let p3 = d2.capW.x, m3 = d2.capH.x, h3 = 2.75 + (12 - a3[2] - 2.75) * m3, v2 = 15.75 + (12 + a3[2] - 15.75) * m3;
    i2(s2, `d`, ae(12, h3, v2, Math.max(0, 4.25 * (1 - p3))));
    let te2 = Math.min(1, Math.max(0, d2.fold.x));
    te2 >= 0.995 ? i2(o2, `visibility`, `hidden`) : (i2(o2, `visibility`, `visible`), i2(o2, `transform`, `translate(12 ${S(v2)}) scale(${S(1 - te2)}) translate(-12 -15.75)`)), c2.forEach((e3, t4) => {
      if (!e3) return;
      let n4 = t4 === 0 || t4 === 4 ? d2.outer.x : d2.inner.x;
      if (n4 <= 5e-3) return i2(e3, `visibility`, `hidden`);
      i2(e3, `visibility`, `visible`);
      let r4 = 12 + (y[t4] - 12) * Math.min(n4, 1), o3 = a3[t4] * n4;
      i2(e3, `d`, `M${S(r4)} ${S(12 - o3)}V${S(12 + o3)}`);
    });
  };
  return se2(0, te), { svg: t2, set: oe2, step: se2, settled: () => d2.outer.to === 1 && d2.outer.x > 0.98 };
}
var se = () => window.SpeechRecognition ?? window.webkitSpeechRecognition;
function ce(promise, ms, fallback, signal) {
  return new Promise(resolve => {
    let timer;
    const finish = value => { clearTimeout(timer); signal.removeEventListener('abort', abort); resolve(value); };
    const abort = () => finish(fallback);
    timer = setTimeout(abort, ms);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    Promise.resolve(promise).then(finish, () => finish(fallback));
  });
}
async function le(e2, signal) {
  let t2 = se();
  if (!t2 || typeof t2.available != `function`) return `unavailable`;
  for (let n2 of [`dictation`, void 0]) try {
    if (signal.aborted) return `unavailable`;
    let r2 = await ce(t2.available({ langs: [e2], processLocally: true, ...n2 ? { quality: n2 } : {} }), 2500, `unavailable`, signal);
    if (r2 === `available`) return `available`;
    if (r2 === `downloadable` || r2 === `downloading`) return `downloadable`;
  } catch {
  }
  return `unavailable`;
}
function ue(e2, t2) {
  let n2 = se(), r2 = null, i2 = false, timer = 0, a2 = () => {
    let r3 = new n2();
    if (!(`processLocally` in r3) && !(`options` in r3)) throw Error(`no on-device recognition`);
    r3.lang = e2, r3.continuous = true, r3.interimResults = true, `processLocally` in r3 && (r3.processLocally = true), `options` in r3 && (r3.options = { langs: [e2], processLocally: true });
    let a3 = ``;
    return r3.onresult = (e3) => {
      if (!i2) return;
      let n3 = ``;
      for (let t3 = e3.resultIndex; t3 < e3.results.length; t3++) {
        let r4 = e3.results[t3][0].transcript.trim();
        e3.results[t3].isFinal ? a3 = `${a3} ${r4}`.trim() : n3 = `${n3} ${r4}`.trim();
      }
      t2.show(a3, n3), clearTimeout(timer), timer = window.setTimeout(() => {
        a3 &&= (t2.end(), ``);
      }, 1500);
    }, r3.onerror = (e3) => {
      if (!i2) return;
      e3.error !== `no-speech` && e3.error !== `aborted` && (i2 = false, t2.failed(e3.error));
    }, r3.onend = () => {
      if (i2) try {
        r3.start();
      } catch {
      }
    }, r3;
  };
  return { start() {
    i2 = true, r2 ??= a2(), r2.start();
  }, stop() {
    i2 = false, clearTimeout(timer), r2?.stop();
  }, destroy() {
    i2 = false, clearTimeout(timer), r2?.abort(), r2 = null;
  } };
}
var de = ``, C = `@huggingface/transformers@4.2.0/dist/transformers.min.js`, w = `phonemizer@1.2.1/dist/phonemizer.js`, T = `
const SR = 16000, FRAME = 512;
const SPEECH = 0.3, EXIT = 0.1;              // VAD: start / keep-going probability
const MIN_SILENCE = 0.4 * SR;                // a pause this long ends a segment
const PAD = 0.08 * SR, MIN_SPEECH = 0.25 * SR;
const MAX = 30 * SR;                         // Moonshine's window
const PARTIAL_MIN = 0.25 * SR;               // new audio before another live read
const WINDOW = 6 * SR, WINDOW_HARD = 10 * SR, SEARCH = 1.5 * SR;
const GAP = 0.15;                            // a real gap: energy < 15% of the median
const TOKENS_PER_SECOND = 6.5;               // Moonshine's own cap against loops
const DTYPES = { webgpu: { encoder_model: "fp32", decoder_model_merged: "q4" },
                 wasm:   { encoder_model: "fp32", decoder_model_merged: "q8" } };
let T, vad, asr, feel, runtime;
const loads = {};
// one honest progress figure per part: only big files count (a small one
// finishing first would read 100%), and it never goes backwards
const progressFor = (part) => {
  const files = new Map(); let shown = 0;
  return (p) => {
    if (p.status !== "progress" || !p.file || !p.total || p.total < 4e6) return;
    files.set(p.file, p);
    let l = 0, t = 0; for (const f of files.values()) { l += f.loaded || 0; t += f.total; }
    shown = Math.max(shown, t ? l / t : 0);
    postMessage({ type: "progress", part, value: shown });
  };
};
async function boot({ runtime: url, host }) {
  T = await import(url);
  if (host) {
    T.env.remoteHost = host + "/hf/";
    T.env.backends.onnx.wasm.wasmPaths = host + "/npm/onnxruntime-web@" + T.env.backends.onnx.versions.web + "/dist/";
  }
}
// MOOD: a 4.5 MB TinyBERT reads six emotions from settled text; on the CPU
// (it's instant there, and the GPU stays with the scene and the captions)
async function loadMood() {
  feel = await T.pipeline("text-classification", "AdamCodd/tinybert-emotion-balanced", { dtype: "q8", device: "wasm" });
  postMessage({ type: "ready", part: "mood" });
}
async function loadCaptions() {
  const progress = progressFor("captions");
  const device = (await navigator.gpu?.requestAdapter().catch(() => null)) ? "webgpu" : "wasm";
  vad = await T.AutoModel.from_pretrained("onnx-community/silero-vad",
    { config: { model_type: "custom" }, dtype: "fp32", progress_callback: progress });
  asr = await T.pipeline("automatic-speech-recognition", "onnx-community/moonshine-base-ONNX",
    { device, dtype: DTYPES[device], progress_callback: progress });
  postMessage({ type: "preparing", part: "captions" }); // downloaded; shaders compile next
  await asr(new Float32Array(SR));
  sr = new T.Tensor("int64", [SR], []); state = fresh();
  postMessage({ type: "ready", part: "captions", device });
}

// VOICE: Kokoro-82M speaks text back. Measured on an M-series Mac: fp32 on
// WebGPU runs ~4.7x real time; q8 on the CPU only ~0.64x (the page isn't
// cross-origin isolated, so ONNX gets one thread); fp16 on WebGPU outputs NaN.
// So: fp32 on the GPU where there is one, q8 on the CPU where there isn't. Text \u2192 phonemes (espeak-ng via the phonemizer package) \u2192
// tokens \u2192 a waveform, sentence by sentence so playback starts on the
// first. The text handling is ported from kokoro-js (Apache-2.0).
let tts, ttsTok, phon, voiceHost, speakId = 0;
const voiceData = new Map();
async function loadVoice({ phonemizer, host }) {
  voiceHost = host;
  const progress = progressFor("voice");
  phon = await import(phonemizer);
  const gpu = await navigator.gpu?.requestAdapter().catch(() => null);
  [tts, ttsTok] = await Promise.all([
    T.StyleTextToSpeech2Model.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX",
      gpu ? { dtype: "fp32", device: "webgpu", progress_callback: progress } : { dtype: "q8", device: "wasm", progress_callback: progress }),
    T.AutoTokenizer.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { progress_callback: progress }),
  ]);
  postMessage({ type: "ready", part: "voice" });
}
// a voice is 510 style vectors (one per input length), ~0.5 MB, cached
async function voiceStyles(id) {
  if (voiceData.has(id)) return voiceData.get(id);
  const url = (voiceHost ? voiceHost + "/hf" : "https://huggingface.co") + "/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/" + id + ".bin";
  let cache = null, buf = null;
  try { cache = await caches.open("orb-voices"); const hit = await cache.match(url); if (hit) buf = await hit.arrayBuffer(); } catch {}
  if (!buf) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("voice " + id + ": " + r.status);
    buf = await r.arrayBuffer();
    try { await cache?.put(url, new Response(buf.slice(0))); } catch {}
  }
  const data = new Float32Array(buf);
  voiceData.set(id, data);
  return data;
}
// numbers read the way people say them: years, times, money, decimals
function sayNumber(m) {
  if (m.includes(".")) return m;
  if (m.includes(":")) {
    const [h, mm] = m.split(":").map(Number);
    return mm === 0 ? h + " o'clock" : mm < 10 ? h + " oh " + mm : h + " " + mm;
  }
  const y = parseInt(m.slice(0, 4), 10);
  if (y < 1100 || y % 1000 < 10) return m;
  const left = m.slice(0, 2), right = parseInt(m.slice(2, 4), 10), s = m.endsWith("s") ? "s" : "";
  if (y % 1000 >= 100 && y % 1000 <= 999) {
    if (right === 0) return left + " hundred" + s;
    if (right < 10) return left + " oh " + right + s;
  }
  return left + " " + right + s;
}
function sayMoney(m) {
  const unit = m[0] === "$" ? "dollar" : "pound";
  if (isNaN(Number(m.slice(1)))) return m.slice(1) + " " + unit + "s";
  if (!m.includes(".")) return m.slice(1) + " " + unit + (m.slice(1) === "1" ? "" : "s");
  const [whole, part] = m.slice(1).split(".");
  const d = parseInt(part.padEnd(2, "0"), 10);
  return whole + " " + unit + (whole === "1" ? "" : "s") + " and " + d + " " +
    (m[0] === "$" ? (d === 1 ? "cent" : "cents") : d === 1 ? "penny" : "pence");
}
const sayPoint = (m) => { const [a, b] = m.split("."); return a + " point " + b.split("").join(" "); };
function normalize(t) {
  return t
    .replace(/[\u2018\u2019]/g, "'").replace(/\xAB/g, "\u201C").replace(/\xBB/g, "\u201D").replace(/[\u201C\u201D]/g, '"')
    .replace(/\\(/g, "\xAB").replace(/\\)/g, "\xBB")
    .replace(/[^\\S \\n]/g, " ").replace(/  +/, " ").replace(/(?<=\\n) +(?=\\n)/g, "")
    .replace(/\\bD[Rr]\\.(?= [A-Z])/g, "Doctor")
    .replace(/\\b(?:Mr\\.|MR\\.(?= [A-Z]))/g, "Mister")
    .replace(/\\b(?:Ms\\.|MS\\.(?= [A-Z]))/g, "Miss")
    .replace(/\\b(?:Mrs\\.|MRS\\.(?= [A-Z]))/g, "Mrs")
    .replace(/\\betc\\.(?! [A-Z])/gi, "etc")
    .replace(/\\b(y)eah?\\b/gi, "$1e'a")
    .replace(/\\d*\\.\\d+|\\b\\d{4}s?\\b|(?<!:)\\b(?:[1-9]|1[0-2]):[0-5]\\d\\b(?!:)/g, sayNumber)
    .replace(/(?<=\\d),(?=\\d)/g, "")
    .replace(/[$\xA3]\\d+(?:\\.\\d+)?(?: hundred| thousand| (?:[bm]|tr)illion)*\\b|[$\xA3]\\d+\\.\\d\\d?\\b/gi, sayMoney)
    .replace(/\\d*\\.\\d+/g, sayPoint)
    .replace(/(?<=\\d)-(?=\\d)/g, " to ")
    .replace(/(?<=\\d)S/g, " S")
    .replace(/(?<=[BCDFGHJ-NP-TV-Z])'?s\\b/g, "'S")
    .replace(/(?<=X')S\\b/g, "s")
    .replace(/(?:[A-Za-z]\\.){2,} [a-z]/g, (m) => m.replace(/\\./g, "-"))
    .replace(/(?<=[A-Z])\\.(?=[A-Z])/gi, "-")
    .trim();
}
const PUNCT = /(\\s*[;:,.!?\xA1\xBF\u2014\u2026"\xAB\xBB\u201C\u201D(){}[\\]]+\\s*)+/g;
async function phonemes(text, lang) {
  text = normalize(text);
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(PUNCT)) {
    if (last < m.index) parts.push({ punct: false, t: text.slice(last, m.index) });
    if (m[0]) parts.push({ punct: true, t: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ punct: false, t: text.slice(last) });
  const code = lang === "a" ? "en-us" : "en";
  let ph = (await Promise.all(parts.map(async ({ punct, t }) => (punct ? t : (await phon.phonemize(t, code)).join(" "))))).join("");
  ph = ph.replace(/k\u0259k\u02C8o\u02D0\u0279o\u028A/g, "k\u02C8o\u028Ak\u0259\u0279o\u028A").replace(/k\u0259k\u02C8\u0254\u02D0\u0279\u0259\u028A/g, "k\u02C8\u0259\u028Ak\u0259\u0279\u0259\u028A")
    .replace(/\u02B2/g, "j").replace(/r/g, "\u0279").replace(/x/g, "k").replace(/\u026C/g, "l")
    .replace(/(?<=[a-z\u0279\u02D0])(?=h\u02C8\u028Cnd\u0279\u026Ad)/g, " ").replace(/ z(?=[;:,.!?\xA1\xBF\u2014\u2026"\xAB\xBB\u201C\u201D ]|$)/g, "z");
  if (lang === "a") ph = ph.replace(/(?<=n\u02C8a\u026An)ti(?!\u02D0)/g, "di");
  return ph.trim();
}
async function speakText({ id, text, voice, speed }) {
  speakId = id;
  const styles = await voiceStyles(voice);
  const sentences = text.match(/[^.!?\u2026]+[.!?\u2026]*["')\\]]*\\s*/g) || [text];
  for (const s of sentences) {
    if (id !== speakId) return; // hushed or superseded
    const t = s.trim();
    if (!t) continue;
    const { input_ids } = ttsTok(await phonemes(t, voice[0]), { truncation: true });
    const off = 256 * Math.min(Math.max(input_ids.dims.at(-1) - 2, 0), 509);
    const style = new T.Tensor("float32", styles.slice(off, off + 256), [1, 256]);
    const { waveform } = await (chain = chain.then(() => tts({ input_ids, style, speed: new T.Tensor("float32", [speed], [1]) })));
    if (id !== speakId) return;
    const pcm = new Float32Array(waveform.data);
    postMessage({ type: "speech", id, pcm, rate: 24000 }, [pcm.buffer]);
  }
  postMessage({ type: "spoken", id });
}
let chain = Promise.resolve(), state, sr;
const BUF = new Float32Array(MAX);
let at = 0, rec = false, after = 0, since = 0, busy = false, win = 0, prev = [];
const fresh = () => new T.Tensor("float32", new Float32Array(256), [2, 1, 128]);
async function speech(frame) {
  const input = new T.Tensor("float32", frame, [1, frame.length]);
  const { output, stateN } = await (chain = chain.then(() => vad({ input, sr, state })));
  state = stateN;
  const p = output.data[0];
  return p > SPEECH || (rec && p >= EXIT);
}
function audio(end) {
  const lead = prev.reduce((n, b) => n + b.length, 0), out = new Float32Array(lead + end);
  let o = 0; for (const b of prev) { out.set(b, o); o += b.length; }
  out.set(BUF.subarray(0, end), o);
  return out;
}
async function read(a, kind, w) {
  const max_new_tokens = Math.max(8, Math.ceil(a.length / SR * TOKENS_PER_SECOND));
  const r = await (chain = chain.then(() => asr(a, { max_new_tokens })));
  const text = ((Array.isArray(r) ? r[0]?.text : r.text) || "").trim();
  if (kind === "partial" && w !== win) return;    // that window has moved on
  postMessage({ type: kind, text, window: w });
}
function commitOlder() {
  const en = [];
  for (let s = Math.max(FRAME, at - SEARCH); s + FRAME <= at - FRAME; s += FRAME) {
    let e = 0; for (let i = s; i < s + FRAME; i++) e += BUF[i] * BUF[i];
    en.push({ s, e });
  }
  if (!en.length) return;
  const median = [...en].sort((a, b) => a.e - b.e)[en.length >> 1].e;
  const q = en.reduce((a, b) => (b.e < a.e ? b : a));
  if (q.e > median * GAP && at < WINDOW_HARD) return;   // wait for a real gap
  const split = q.s + FRAME / 2;
  read(audio(split), "commit", win); win++;
  prev = [];                                     // no lead-in: it would re-hear the last word
  BUF.copyWithin(0, split, at); at -= split; BUF.fill(0, at); since = 0;
}
function endSegment() {
  if (at >= MIN_SPEECH) read(audio(Math.min(at + PAD, MAX)), "final", win);
  win++; BUF.fill(0); at = 0; rec = false; after = 0; since = 0;
}
async function hear(frame) {
  const was = rec, isSpeech = await speech(frame);
  if (!was && !isSpeech) { if (prev.length >= Math.ceil(PAD / FRAME)) prev.shift(); prev.push(frame); return; }
  if (frame.length >= MAX - at) { endSegment(); return; }
  BUF.set(frame, at); at += frame.length; since += frame.length;
  if (isSpeech) {
    rec = true; after = 0;
    if (since >= PARTIAL_MIN && !busy) { since = 0; busy = true; read(audio(at), "partial", win).finally(() => (busy = false)); }
    if (at >= WINDOW) commitOlder();
    return;
  }
  after += frame.length;
  if (after >= MIN_SILENCE) endSegment();
}
onmessage = (e) => {
  const m = e.data;
  if (m.type === "load") {
    runtime ??= boot(m);
    const loader = { captions: loadCaptions, mood: loadMood, voice: loadVoice }[m.part];
    loads[m.part] ??= runtime.then(() => loader(m)).catch((err) => {
      loads[m.part] = null;
      postMessage({ type: "error", part: m.part, message: String(err?.message ?? err) });
    });
    return;
  }
  if (m.type === "mood") {
    if (!feel) return;
    feel(m.text, { top_k: null }).then((scores) => postMessage({ type: "mood", id: m.id, scores }));
    return;
  }
  if (m.type === "speak") {
    if (tts) speakText(m).catch((err) => postMessage({ type: "spoken", id: m.id, error: String(err?.message ?? err) }));
    return;
  }
  if (m.type === "hush") { speakId = -1; return; }
  if (!asr || !state) return;
  if (m.type === "audio") hear(m.buffer);
  else if (m.type === "flush") { if (rec) endSegment(); prev = []; state = fresh(); }
};
`, E = `
class OrbTap extends AudioWorkletProcessor {
  constructor() { super(); this.ratio = sampleRate / 16000; this.pos = 0; this.acc = 0; this.n = 0; this.out = new Float32Array(512); this.k = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.acc += ch[i]; this.n++; this.pos += 1;
      if (this.pos >= this.ratio) {
        this.pos -= this.ratio; this.out[this.k++] = this.acc / this.n; this.acc = 0; this.n = 0;
        if (this.k === 512) { this.port.postMessage(this.out, [this.out.buffer]); this.out = new Float32Array(512); this.k = 0; }
      }
    }
    return true;
  }
}
registerProcessor("orb-tap", OrbTap);
`;
function D(e2) {
  let t2 = e2.split(/\s+/).filter(Boolean), n2 = (e3) => e3?.toLowerCase().replace(/[^a-z']/g, ``);
  for (let e3 = 1; e3 <= 4; e3++) for (let r2 = 0; r2 + 3 * e3 <= t2.length; r2++) {
    let i2 = (r3, i3) => {
      for (let a3 = 0; a3 < e3; a3++) if (n2(t2[r3 + a3]) !== n2(t2[i3 + a3])) return false;
      return true;
    }, a2 = 1;
    for (; r2 + (a2 + 1) * e3 <= t2.length && i2(r2, r2 + a2 * e3); ) a2++;
    a2 >= 3 && (t2 = [...t2.slice(0, r2 + e3), ...t2.slice(r2 + a2 * e3)]);
  }
  return t2.join(` `).replace(/\bi\b/g, `I`).replace(/\bi'(m|ve|ll|d)\b/g, `I'$1`);
}
function fe(e2, t2) {
  return e2 ? t2 ? `${e2} ${!/[.?!]$/.test(e2) && !/^I(\b|')/.test(t2) ? t2.charAt(0).toLowerCase() + t2.slice(1) : t2}` : e2 : t2;
}
// Preserve Carter's worker protocol while settling outstanding work at teardown.
function pe(host) {
  const url = URL.createObjectURL(new Blob([T], { type: 'text/javascript' }));
  let worker;
  try { worker = new Worker(url, { type: 'module' }); }
  finally { URL.revokeObjectURL(url); }
  let closed = false, failed = false, nextId = 0;
  const loads = {}, pending = new Set();
  const finish = (entry, callback, value) => {
    if (!pending.delete(entry)) return;
    worker.removeEventListener('message', entry.listener);
    callback(value);
  };
  const failWorker = () => {
    failed = true;
    for (const entry of [...pending]) finish(entry, entry.reject, new Error('orb worker failed'));
    for (const key of Object.keys(loads)) delete loads[key];
  };
  worker.addEventListener('error', failWorker);
  worker.addEventListener('messageerror', failWorker);
  return {
    worker,
    need(part) {
      if (closed || failed) return Promise.reject(new Error('orb worker unavailable'));
      if (!loads[part]) loads[part] = new Promise((resolve, reject) => {
        const entry = { reject, listener(event) {
          const m = event.data;
          if ((m.type !== 'ready' && m.type !== 'error') || m.part !== part) return;
          if (m.type === 'ready') finish(entry, resolve);
          else { delete loads[part]; finish(entry, reject, new Error(m.message || `${part} failed to load`)); }
        }};
        pending.add(entry); worker.addEventListener('message', entry.listener);
        try { worker.postMessage({ type: 'load', part, runtime: `${host || 'https://cdn.jsdelivr.net'}/npm/${C}`, phonemizer: `${host || 'https://cdn.jsdelivr.net'}/npm/${w}`, host }); }
        catch (error) { delete loads[part]; finish(entry, reject, error); }
      });
      return loads[part];
    },
    classify(text) {
      if (closed || failed) return Promise.resolve([]);
      const id = ++nextId;
      return new Promise(resolve => {
        const entry = { reject: () => resolve([]), listener(event) {
          if (event.data.type === 'mood' && event.data.id === id) finish(entry, resolve, event.data.scores ?? []);
        }};
        pending.add(entry); worker.addEventListener('message', entry.listener);
        try { worker.postMessage({ type: 'mood', id, text }); } catch { finish(entry, resolve, []); }
      });
    },
    speak(id, text, voice, speed) { if (!closed) worker.postMessage({ type: 'speak', id, text, voice, speed }); },
    hush() { if (!closed) worker.postMessage({ type: 'hush' }); },
    destroy() {
      if (closed) return;
      closed = true;
      for (const entry of [...pending]) finish(entry, entry.reject, new Error('orb worker closed'));
      worker.removeEventListener('error', failWorker);
      worker.removeEventListener('messageerror', failWorker);
      worker.terminate();
    }
  };
}
function me(callbacks, client) {
  const worker = client.worker;
  let active = null, pendingContext = null, pendingUrl = null, generation = 0, disposed = false, text = '';
  const listener = (event) => {
    if (disposed) return;
    const m = event.data;
    if (m.type === 'progress' && m.part === 'captions') callbacks.progress(m.value ?? 0);
    else if (m.type === 'preparing' && m.part === 'captions') callbacks.progress(-1);
    else if (m.type === 'partial' && m.text) callbacks.show(text, fe(text, D(m.text)).slice(text.length).trim());
    else if (m.type === 'commit') { if (m.text) text = fe(text, D(m.text)); callbacks.show(text, ''); }
    else if (m.type === 'final') { const final = fe(text, D(m.text ?? '')); text = ''; if (final) callbacks.show(final, ''); callbacks.end(); }
    else if (m.type === 'error' && m.part === 'captions') callbacks.failed(m.message ?? 'error');
  };
  worker.addEventListener('message', listener);
  const load = () => client.need('captions');
  return {
    load,
    async start(stream) {
      const token = ++generation;
      await load();
      if (disposed || token !== generation || active) return;
      text = '';
      const ctx = pendingContext = new AudioContext();
      let url;
      try {
        url = pendingUrl = URL.createObjectURL(new Blob([E], { type: 'text/javascript' }));
        await ctx.audioWorklet.addModule(url);
        if (disposed || token !== generation) { if (ctx.state !== 'closed') await ctx.close(); return; }
        const node = new AudioWorkletNode(ctx, 'orb-tap');
        node.port.onmessage = e => { if (!disposed && token === generation) worker.postMessage({ type: 'audio', buffer: e.data }, [e.data.buffer]); };
        const gain = ctx.createGain(); gain.gain.value = 0;
        ctx.createMediaStreamSource(stream).connect(node).connect(gain).connect(ctx.destination);
        active = { ctx, node };
      } catch (error) { if (ctx.state !== 'closed') await ctx.close(); throw error; }
      finally { if (pendingContext === ctx) pendingContext = null; if (pendingUrl === url) { URL.revokeObjectURL(url); pendingUrl = null; } }
    },
    stop() {
      generation++;
      if (pendingContext && pendingContext.state !== 'closed') pendingContext.close();
      pendingContext = null;
      if (pendingUrl) { URL.revokeObjectURL(pendingUrl); pendingUrl = null; }
      if (active) { active.node.port.onmessage = null; active.ctx.close(); active = null; worker.postMessage({ type: 'flush' }); }
    },
    destroy() { if (disposed) return; this.stop(); disposed = true; worker.removeEventListener('message', listener); }
  };
}
var O = { joy: { rgb: [1, 0.68, 0.18], energy: 0.5 }, love: { rgb: [1, 0.32, 0.55], energy: 0.2 }, surprise: { rgb: [0.25, 0.85, 1], energy: 0.8 }, sadness: { rgb: [0.1, 0.26, 1], energy: -0.6 }, fear: { rgb: [0.78, 0.2, 0.95], energy: 0.35 }, anger: { rgb: [1, 0.1, 0.08], energy: 0.9 } };
function he(e2) {
  let t2 = e2.reduce((e3, t3) => t3.score > e3.score ? t3 : e3, { label: ``, score: 0 });
  if (t2.score < 0.45) return null;
  let n2 = 0, r2 = 0, i2 = 0, a2 = 0, o2 = 0;
  for (let { label: t3, score: s3 } of e2) {
    let e3 = O[t3];
    if (!e3 || s3 < 0.15) continue;
    let c2 = s3 * s3;
    n2 += e3.rgb[0] * c2, r2 += e3.rgb[1] * c2, i2 += e3.rgb[2] * c2, a2 += e3.energy * c2, o2 += c2;
  }
  if (!o2) return null;
  let s2 = Math.min(1, Math.max(0, (t2.score - 0.45) / 0.45));
  return { rgb: [n2 / o2, r2 / o2, i2 / o2], energy: a2 / o2, amt: s2 * s2 * (3 - 2 * s2), label: t2.label };
}
function ge(e2, t2) {
  let n2 = e2.createBiquadFilter();
  n2.type = `highpass`, n2.frequency.value = 90;
  let r2 = e2.createDynamicsCompressor();
  r2.threshold.value = -20, r2.ratio.value = 3, r2.attack.value = 4e-3, r2.release.value = 0.2;
  let i2 = e2.createDynamicsCompressor();
  i2.threshold.value = -3, i2.ratio.value = 20, i2.attack.value = 1e-3, i2.release.value = 0.1;
  let a2 = e2.createGain();
  a2.gain.value = 0, t2.connect(n2).connect(r2), i2.connect(a2).connect(e2.destination);
  let o2 = (t3, n3) => {
    let r3 = Math.floor(e2.sampleRate * t3), i3 = e2.createBuffer(2, r3, e2.sampleRate);
    for (let e3 = 0; e3 < 2; e3++) {
      let t4 = i3.getChannelData(e3);
      for (let e4 = 0; e4 < r3; e4++) t4[e4] = (Math.random() * 2 - 1) * (1 - e4 / r3) ** n3;
    }
    let a3 = e2.createConvolver();
    return a3.buffer = i3, a3;
  }, s2 = (t3) => {
    let n3 = e2.createGain();
    return n3.gain.value = t3, n3;
  }, c2 = [], l2 = null, u2 = (t3) => {
    for (let e3 of c2) e3.disconnect();
    l2?.stop(), l2 = null, r2.disconnect();
    let n3 = (...e3) => (c2.push(...e3), e3[0]);
    c2 = [];
    let a3 = (e3, t4) => {
      let r3 = n3(s2(t4));
      e3.connect(r3).connect(i2);
    }, u3 = (e3) => a3(r2, e3);
    if (t3 === `hall`) {
      u3(0.8);
      let e3 = n3(o2(2.8, 2.2));
      r2.connect(e3), a3(e3, 0.5);
    } else if (t3 === `delay`) {
      u3(1);
      let t4 = n3(e2.createDelay(1));
      t4.delayTime.value = 0.23;
      let i3 = n3(s2(0.34));
      r2.connect(t4), t4.connect(i3).connect(t4), a3(t4, 0.45);
    } else if (t3 === `radio`) {
      let t4 = n3(e2.createBiquadFilter());
      t4.type = `highpass`, t4.frequency.value = 500;
      let i3 = n3(e2.createBiquadFilter());
      i3.type = `lowpass`, i3.frequency.value = 3200;
      let o3 = n3(e2.createWaveShaper()), s3 = new Float32Array(1024);
      for (let e3 = 0; e3 < 1024; e3++) {
        let t5 = e3 / 1023 * 2 - 1;
        s3[e3] = Math.tanh(2.6 * t5);
      }
      o3.curve = s3, r2.connect(t4).connect(i3).connect(o3), a3(o3, 0.8);
    } else if (t3 === `robot`) {
      let t4 = n3(s2(0));
      l2 = e2.createOscillator(), l2.frequency.value = 55, l2.connect(t4.gain), l2.start();
      let i3 = n3(e2.createDelay(0.05));
      i3.delayTime.value = 9e-3;
      let o3 = n3(s2(0.55));
      r2.connect(t4), t4.connect(i3), i3.connect(o3).connect(i3), a3(t4, 1.2), a3(i3, 0.6);
    } else {
      u3(1);
      let e3 = n3(o2(0.7, 3));
      r2.connect(e3), a3(e3, 0.18);
    }
  };
  u2(`room`);
  let d2 = false, f2 = 0, p2 = -9;
  return { setOn(t3) {
    d2 = t3, a2.gain.setTargetAtTime(t3 ? 0.95 : 0, e2.currentTime, 0.03);
  }, setEffect: u2, guard(e3, t3) {
    if (!d2) return false;
    let n3 = 0, r3 = 0;
    for (let t4 = 2; t4 < e3.length; t4++) e3[t4] > n3 && (n3 = e3[t4], r3 = t4);
    let i3 = 0;
    for (let t4 = 2; t4 < e3.length; t4++) Math.abs(t4 - r3) > 2 && e3[t4] > i3 && (i3 = e3[t4]);
    let a3 = n3 > 190 && n3 - i3 > 70, o3 = Math.abs(r3 - p2) <= 1;
    return p2 = r3, f2 = a3 && o3 ? f2 + t3 : 0, f2 < 0.6 ? false : (f2 = 0, this.setOn(false), true);
  }, destroy() {
    l2?.stop(), a2.disconnect();
  } };
}
function _e(e2, t2) {
  let n2 = document.createElement(`div`);
  n2.className = `orb__cap`;
  let r2 = document.createElement(`p`);
  r2.className = `orb__line`;
  let i2 = document.createElement(`button`);
  i2.type = `button`, i2.className = `orb__offer`, i2.hidden = true, n2.append(r2, i2), e2.appendChild(n2);
  let a2 = [], o2 = false, s2 = () => {
    if (o2) return true;
    let e3 = a2.shift();
    return e3 ? (i2.textContent = e3.text, i2.hidden = false, i2.disabled = false, i2.onclick = () => {
      i2.onclick = null, i2.hidden = true, e3.act(), i2.hidden && s2();
    }, true) : false;
  }, c2 = [], l2 = false, u2 = `cubic-bezier(0.23, 1, 0.32, 1)`, d2 = (e3, n3) => {
    t2 || e3.inner.animate([{ transform: `translateY(110%)` }, { transform: `translateY(0)` }], { duration: 380, delay: n3 * 28, easing: `cubic-bezier(0.16, 1, 0.3, 1)`, fill: `backwards` });
  }, f2 = (e3, n3) => {
    if (e3.outer.classList.add(`is-leaving`), t2) return e3.outer.remove();
    let i3 = r2.getBoundingClientRect(), a3 = n3 ?? e3.outer.getBoundingClientRect();
    Object.assign(e3.outer.style, { position: `absolute`, left: `${a3.left - i3.left}px`, top: `${a3.top - i3.top}px` }), e3.inner.animate([{ transform: `translateY(0)` }, { transform: `translateY(-110%)` }], { duration: 220, easing: u2, fill: `forwards` }).finished.then(() => e3.outer.remove(), () => e3.outer.remove());
  };
  return { box: n2, show(e3, n3) {
    let a3 = new Map(c2.map((e4) => [e4, e4.outer.getBoundingClientRect()]));
    l2 &&= (c2.forEach((e4) => f2(e4, a3.get(e4))), c2 = [], false), i2.hidden = true;
    let o3 = [...e3.split(/\s+/).filter(Boolean).map((e4) => ({ t: e4, live: false })), ...n3.split(/\s+/).filter(Boolean).map((e4) => ({ t: e4, live: true }))], s3 = Math.max(0, o3.length - 16), p2 = o3.slice(s3), m2 = Math.min(s3, c2.length);
    for (let e4 = 0; e4 < m2; e4++) f2(c2[e4], a3.get(c2[e4]));
    c2 = c2.slice(m2);
    let h2 = 0;
    if (p2.forEach((e4, n4) => {
      let i3 = c2[n4];
      if (i3) i3.text !== e4.t && !t2 && i3.inner.animate([{ filter: `blur(3px)` }, { filter: `blur(0)` }], { duration: 140, easing: `ease-out` });
      else {
        let e5 = document.createElement(`span`);
        e5.className = `orb__w`;
        let t3 = document.createElement(`span`);
        e5.appendChild(t3), r2.appendChild(e5), i3 = { outer: e5, inner: t3, text: `` }, c2[n4] = i3, d2(i3, h2++);
      }
      i3.text !== e4.t && (i3.text = e4.t, i3.inner.textContent = e4.t), i3.outer.classList.toggle(`is-live`, e4.live);
    }), c2.slice(p2.length).forEach((e4) => f2(e4, a3.get(e4))), c2 = c2.slice(0, p2.length), !t2) for (let e4 of c2) {
      let t3 = a3.get(e4);
      if (!t3) continue;
      let n4 = e4.outer.getBoundingClientRect(), r3 = t3.left - n4.left, i3 = t3.top - n4.top;
      Math.abs(r3) + Math.abs(i3) < 0.5 || e4.outer.animate([{ transform: `translate(${r3}px, ${i3}px)` }, { transform: `translate(0, 0)` }], { duration: 280, easing: u2 });
    }
  }, end() {
    l2 = true, c2.forEach((e3) => e3.outer.classList.remove(`is-live`));
  }, clear: () => {
    let e3 = c2.map((e4) => e4.outer.getBoundingClientRect());
    c2.forEach((t3, n3) => f2(t3, e3[n3])), c2 = [];
  }, offer(e3, t3) {
    a2.push({ text: e3, act: t3 }), i2.hidden && s2();
  }, say(e3) {
    o2 = true, i2.textContent = e3, i2.hidden = false, i2.disabled = true, i2.onclick = null;
  }, quiet() {
    o2 = false, s2() || (i2.hidden = true);
  } };
}
var ve = { mount(o2, s2 = {}) {
  let disposed = false, micGeneration = 0, wakeFrame = 0;
  const lifetime = new AbortController();
  const timers = new Set();
  const later = (fn, ms) => {
    if (disposed) return 0;
    const id = setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms);
    timers.add(id); return id;
  };
  let c2 = window.matchMedia(`(prefers-reduced-motion: reduce)`).matches, h2 = { ...a }, g2 = document.createElement(`div`);
  g2.className = `orb`;
  let v2 = document.createElement(`canvas`);
  g2.appendChild(v2);
  let y2 = document.createElement(`button`);
  y2.type = `button`, y2.className = `orb__mic`, y2.setAttribute(`aria-pressed`, `false`), y2.setAttribute(`aria-label`, `Talk to the orb`);
  let b2 = oe(c2);
  y2.appendChild(b2.svg);
  let x2 = document.createElement(`p`);
  x2.className = `orb__status`, x2.setAttribute(`aria-live`, `polite`);
  let S2 = document.createElement(`button`);
  S2.type = `button`, S2.className = `orb__mic orb__spk`, S2.setAttribute(`aria-pressed`, `false`), S2.setAttribute(`aria-label`, `Speak back`), S2.innerHTML = e;
  let ae2 = document.createElement(`div`);
  ae2.className = `orb__ctl`;
  let ce2 = document.createElement(`div`);
  ce2.className = `orb__unit`, ce2.appendChild(S2), ae2.append(y2, ce2), g2.append(ae2, x2);
  let C2 = _e(g2, c2);
  o2.appendChild(g2);
  let w2 = v2.getContext(`webgl2`, { antialias: false, alpha: false });
  if (!w2) {
    let e2 = document.createElement(`p`);
    return e2.className = `orb__note`, e2.textContent = `This one needs WebGL2.`, g2.appendChild(e2), () => { disposed = true; lifetime.abort(); g2.remove(); };
  }
  let T2 = !!w2.getExtension(`EXT_color_buffer_float`) || !!w2.getExtension(`EXT_color_buffer_half_float`);
  w2.getExtension(`OES_texture_half_float_linear`);
  let E2 = ee(w2, l(!T2)), D2 = T2 ? ee(w2, u) : null, fe2 = T2 ? ee(w2, d) : null, O2 = T2 ? ee(w2, f) : null;
  w2.bindVertexArray(w2.createVertexArray());
  let ve2 = (e2, t2) => {
    let n2 = w2.createTexture();
    w2.bindTexture(w2.TEXTURE_2D, n2), w2.texImage2D(w2.TEXTURE_2D, 0, w2.RGBA16F, e2, t2, 0, w2.RGBA, w2.HALF_FLOAT, null), w2.texParameteri(w2.TEXTURE_2D, w2.TEXTURE_MIN_FILTER, w2.LINEAR), w2.texParameteri(w2.TEXTURE_2D, w2.TEXTURE_MAG_FILTER, w2.LINEAR), w2.texParameteri(w2.TEXTURE_2D, w2.TEXTURE_WRAP_S, w2.CLAMP_TO_EDGE), w2.texParameteri(w2.TEXTURE_2D, w2.TEXTURE_WRAP_T, w2.CLAMP_TO_EDGE);
    let r2 = w2.createFramebuffer();
    return w2.bindFramebuffer(w2.FRAMEBUFFER, r2), w2.framebufferTexture2D(w2.FRAMEBUFFER, w2.COLOR_ATTACHMENT0, w2.TEXTURE_2D, n2, 0), { fbo: r2, tex: n2, w: e2, h: t2 };
  }, k = null, A = [], ye = () => {
    for (let e2 of [k, ...A]) e2 && (w2.deleteFramebuffer(e2.fbo), w2.deleteTexture(e2.tex));
    k = null, A = [];
  }, j = 2, M = 1, be = () => {
    ye();
    let e2 = Math.max(1, Math.round(v2.width * M)), t2 = Math.max(1, Math.round(v2.height * M));
    k = ve2(e2, t2);
    let n2 = e2, r2 = t2;
    for (let e3 = 0; e3 < p; e3++) n2 = Math.max(1, n2 >> 1), r2 = Math.max(1, r2 >> 1), A.push(ve2(n2, r2));
  }, xe = () => {
    Ce();
    let e2 = Math.max(1, g2.clientWidth * g2.clientHeight), t2 = Math.min(window.devicePixelRatio || 1, j, Math.sqrt(26e5 / e2)), n2 = Math.max(1, Math.round(g2.clientWidth * t2)), r2 = Math.max(1, Math.round(g2.clientHeight * t2));
    v2.width === n2 && v2.height === r2 && (k || !T2) || (v2.width = n2, v2.height = r2, T2 && be());
  }, N = null;
  function Se(e2, t2) {
    let n2 = Math.min(e2, t2), r2 = 0.5 * Math.min(h2.size, 0.92 * e2 / (3.3 * n2)) * n2, i2 = 66 + (N?.capOffset ?? (e2 < 760 ? 36 : 0)) + 16, a2 = t2 - 72;
    3.28 * r2 + 32 + 52 + 2 * i2 > a2 && (r2 = Math.max(24, (a2 - 2 * i2 - 32 - 52) / 3.28));
    let o3 = a2 - (3.28 * r2 + 32 + 52), s3 = (o3 >= 2 * i2 ? o3 / 2 : Math.max(16, o3 - i2)) + 1.76 * r2;
    return { r: r2, cy: s3, size: 2 * r2 / n2 };
  }
  function Ce() {
    let { r: e2, cy: t2 } = Se(g2.clientWidth, g2.clientHeight), n2 = t2 + 1.52 * e2 + 32;
    ae2.style.top = `${n2}px`;
    let r2 = N?.capOffset ?? 0;
    N?.id === `a` && (N.root.style.top = `${n2 + 52 + 16}px`), N?.id === `c` && N.place?.(t2), C2.box.style.top = `${n2 + 52 + 16 + r2}px`;
  }
  let we = new ResizeObserver(xe);
  try { we.observe(g2); xe(); } catch (error) { we.disconnect(); throw error; }
  let Te = (e2, t2, n2) => {
    w2.useProgram(e2.p), w2.bindFramebuffer(w2.FRAMEBUFFER, t2 ? t2.fbo : null), w2.viewport(0, 0, t2 ? t2.w : v2.width, t2 ? t2.h : v2.height), n2 && (w2.activeTexture(w2.TEXTURE0), w2.bindTexture(w2.TEXTURE_2D, n2.tex), w2.uniform1i(e2.u(`uSrc`), 0), w2.uniform2f(e2.u(`uTexel`), 1 / n2.w, 1 / n2.h)), w2.drawArrays(w2.TRIANGLES, 0, 3);
  }, Ee = (e2, n2) => {
    w2.useProgram(E2.p);
    let r2 = k ? k.w : v2.width, i2 = k ? k.h : v2.height;
    w2.uniform2f(E2.u(`uRes`), r2, i2), w2.uniform1f(E2.u(`uTime`), e2);
    let a2 = g2.clientHeight || 1;
    if (w2.uniform1f(E2.u(`uSize`), n2.size), w2.uniform1f(E2.u(`uShift`), (a2 / 2 - n2.cy) * (i2 / a2)), w2.uniform1f(E2.u(`uEnergy`), h2.energy), w2.uniform1f(E2.u(`uSpread`), h2.spread), w2.uniform1f(E2.u(`uFlare`), h2.flare), w2.uniform1f(E2.u(`uView`), h2.view), w2.uniform1i(E2.u(`uHeart`), Math.max(0, t.indexOf(h2.heart))), w2.uniform1f(E2.u(`uGlass`), Z.x), w2.uniform1f(E2.u(`uLive`), De), w2.uniform1f(E2.u(`uDorm`), Oe), w2.uniform1f(E2.u(`uVoice`), Me), w2.uniform3f(E2.u(`uBands`), I[0], I[1], I[2]), w2.uniform3f(E2.u(`uMood`), z.rgb[0], z.rgb[1], z.rgb[2]), w2.uniform1f(E2.u(`uMoodAmt`), z.amt), w2.uniform1f(E2.u(`uMoodEnergy`), z.energy), w2.uniform2f(E2.u(`uTilt`), X[0].x, X[1].x), w2.uniform3f(E2.u(`uBg`), ...m), !T2 || !k || !D2 || !fe2 || !O2) {
      Te(E2, null, null);
      return;
    }
    Te(E2, k, null);
    let o3 = k;
    for (let e3 of A) w2.useProgram(D2.p), w2.uniform1f(D2.u(`uKnee`), e3 === A[0] ? 1.7 : 0), Te(D2, e3, o3), o3 = e3;
    w2.enable(w2.BLEND), w2.blendFunc(w2.ONE, w2.ONE);
    for (let e3 = A.length - 2; e3 >= 0; e3--) Te(fe2, A[e3], A[e3 + 1]);
    w2.disable(w2.BLEND), w2.useProgram(O2.p), w2.activeTexture(w2.TEXTURE0), w2.bindTexture(w2.TEXTURE_2D, k.tex), w2.uniform1i(O2.u(`uScene`), 0), w2.activeTexture(w2.TEXTURE1), w2.bindTexture(w2.TEXTURE_2D, A[0].tex), w2.uniform1i(O2.u(`uBloom`), 1), w2.uniform1f(O2.u(`uBloomAmt`), h2.bloom * (1 - 0.55 * Oe)), w2.uniform1f(O2.u(`uCA`), h2.spread), w2.uniform3f(O2.u(`uBg`), ...m), w2.bindFramebuffer(w2.FRAMEBUFFER, null), w2.viewport(0, 0, v2.width, v2.height), w2.drawArrays(w2.TRIANGLES, 0, 3);
  }, P = null, F = false, De = 0, Oe = 0, ke = ne(40, 1.1 * Math.sqrt(40)), Ae = 0, je = 0, Me = 0, I = [0, 0, 0], Ne = [0.05, 0.05, 0.05, 0.05], Pe = (e2, t2) => {
    y2.dataset.state = e2, y2.setAttribute(`aria-pressed`, e2 === `listening` ? `true` : `false`), y2.setAttribute(`aria-label`, e2 === `listening` ? `Stop listening` : e2 === `blocked` ? `Microphone blocked` : `Talk to the orb`), e2 === `blocked` ? (y2.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M16.25 11.5V7C16.25 4.65279 14.3472 2.75 12 2.75C10.6334 2.75 9.41741 3.39504 8.63994 4.39727M3 3L7.75 7.75M7.75 7.75V11.5C7.75 13.8472 9.65279 15.75 12 15.75C13.0463 15.75 14.0043 15.3719 14.7449 14.7449M7.75 7.75L14.7449 14.7449M14.7449 14.7449L17.0474 17.0474M21 21L17.0474 17.0474M12 19C8.92453 19 6.2814 17.1489 5.12407 14.5M12 19V21.25M12 19C13.9439 19 15.715 18.2605 17.0474 17.0474" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
`, y2.firstElementChild?.animate([{ scale: `0.25` }, { scale: `1` }], { duration: 200, easing: `cubic-bezier(0.2, 0, 0, 1)` })) : y2.contains(b2.svg) || y2.replaceChildren(b2.svg), x2.textContent = t2;
  }, Fe = navigator.language || `en-US`, Ie = `orb:captions`, Le = () => {
    try {
      return localStorage.getItem(Ie) === `on`;
    } catch {
      return false;
    }
  }, Re = () => {
    try {
      localStorage.setItem(Ie, `on`);
    } catch {
    }
  }, L = null, ze = false, Be = ``, R = null, Ve = () => R ??= pe(s2.captionHost ?? de), z = { rgb: [1, 1, 1], amt: 0, energy: 0 }, B = { rgb: [1, 1, 1], amt: 0, energy: 0 }, He = 0, Ue = false, We = 0, Ge = ``, Ke = `orb:mood`, qe = async (e2) => {
    if (disposed || !Ue || !R || !e2.trim()) return;
    let t2 = he(await R.classify(e2));
    if (disposed) return;
    if (He = performance.now(), Ge = t2?.label ?? ``, !t2) return void (B.amt = 0);
    B.rgb = t2.rgb, B.energy = t2.energy, B.amt = t2.amt;
  }, Je = (e2) => {
    B.amt > 0 && performance.now() - He > 1e4 && (B.amt = 0);
    let t2 = 1 - Math.exp(-e2 * 2.5);
    for (let e3 = 0; e3 < 3; e3++) z.rgb[e3] += (B.rgb[e3] - z.rgb[e3]) * t2;
    z.amt += (B.amt - z.amt) * t2, z.energy += (B.energy - z.energy) * t2;
  }, Ye = async () => {
    try {
      await Ve().need(`mood`); if (!disposed) Ue = true;
    } catch {
      if (!disposed) C2.say(`Mood model couldn't load`);
    }
  }, Xe = () => {
    if (Ue) return;
    let e2 = false;
    try {
      e2 = localStorage.getItem(Ke) === `on`;
    } catch {
    }
    if (e2) return void Ye();
    C2.offer(`Mood :: let the orb feel what you say, ~27 MB once`, () => {
      try {
        localStorage.setItem(Ke, `on`);
      } catch {
      }
      C2.quiet(), Ye();
    });
  }, Ze = { show: (e2, t2) => {
    if (!F) return;
    C2.show(e2, t2), e2 && (Be = e2);
    let n2 = e2 ? e2.split(/\s+/).length : 0;
    n2 - We >= 8 && (We = n2, qe(e2.split(/\s+/).slice(-24).join(` `)));
  }, end: () => {
    if (C2.end(), Be) {
      x2.textContent = Be;
      let e2 = Be;
      qe(e2).then(() => mt(e2));
    }
    We = 0;
  }, progress: (e2) => C2.say(e2 < 0 ? `Preparing captions` : `Loading captions :: ${Math.round(e2 * 100)}%`), failed: () => {
    L?.destroy(), L = null, C2.say(`Captions couldn't start here`), later(() => C2.quiet(), 2600);
  } }, Qe = () => {
    if (disposed) return;
    if (typeof Worker > `u` || typeof AudioWorkletNode > `u`) return C2.say(`Captions unavailable in this browser`);
    let e2 = async () => {
      if (disposed || !F) return;
      const token = micGeneration;
      Re(), C2.say(`Loading captions`);
      let e3;
      try {
        e3 = me(Ze, Ve());
        await e3.load();
        if (disposed || !F || token !== micGeneration) { e3.destroy(); return; }
        L = e3; C2.quiet(); Ye(); if (P) await e3.start(P.stream);
      } catch {
        e3?.destroy();
        if (disposed || token !== micGeneration) return;
        C2.say(`Captions couldn't load`), later(() => C2.quiet(), 2600);
      }
    };
    Le() ? e2() : C2.offer(`Captions :: runs on this device, a one-time 150 MB download`, () => void e2());
  }, $e = () => {
    if (disposed || !F || !P) return;
    let e2 = ue(Fe, { ...Ze, failed: () => { L?.destroy(); L = null; if (!disposed && F) Qe(); } });
    try {
      e2.start(P.stream), L = e2, typeof Worker < `u` && Xe();
    } catch {
      e2.destroy(); Qe();
    }
  }, et = async () => {
    if (L && P) return void await L.start(P.stream);
    if (!ze) {
      ze = true;
      const token = micGeneration;
      try {
        let e2 = await le(Fe, lifetime.signal);
        if (disposed || !F || token !== micGeneration) return;
        if (e2 === `available`) $e();
        else if (e2 === `downloadable`) {
          let e3 = async () => {
            Re(), C2.say(`Downloading captions`);
            let e4 = await se().install({ langs: [Fe], processLocally: true, quality: `dictation` }).catch(() => false);
            if (!disposed && F && token === micGeneration) { C2.quiet(); e4 ? $e() : Qe(); }
          };
          Le() ? e3() : C2.offer(`Captions :: a one-time download, it stays on this device`, () => void e3());
        } else Qe();
      } finally {
        ze = false;
        if (!disposed && F && P && token !== micGeneration) void et().catch(() => { if (!disposed) C2.say(`Captions couldn't start here`); });
      }
    }
  }, tt = () => {
    L?.stop(), C2.quiet(), C2.clear();
  }, nt = `orb:voice`, rt = { joy: { speed: 1.06, pitch: 1.08 }, love: { speed: 0.97, pitch: 1.02 }, surprise: { speed: 1.08, pitch: 1.12 }, sadness: { speed: 0.9, pitch: 0.92 }, fear: { speed: 1.05, pitch: 1.04 }, anger: { speed: 1.04, pitch: 0.96 } }, V = false, it = false, H = false, at = false, ot = false, st = 0, U = 0, W = null, ct = () => {
    if (W) return W;
    let e2 = new AudioContext();
    try {
      let t2 = e2.createAnalyser();
      return t2.fftSize = 1024, t2.smoothingTimeConstant = 0.55, t2.connect(e2.destination), W = { ctx: e2, an: t2, time: new Uint8Array(1024), freq: new Uint8Array(512), next: 0, live: /* @__PURE__ */ new Set() };
    } catch (error) { e2.close(); throw error; }
  }, lt = () => {
    let e2 = (typeof speechSynthesis > `u` ? [] : speechSynthesis.getVoices()).filter((e3) => e3.lang.toLowerCase().startsWith(Fe.slice(0, 2).toLowerCase()));
    return e2.find((e3) => e3.localService && /premium|enhanced|natural|neural/i.test(e3.name)) ?? e2.find((e3) => /samantha|daniel|karen|moira|serena|google/i.test(e3.name)) ?? e2.find((e3) => e3.localService) ?? e2[0] ?? null;
  }, ut = () => {
    H && (H = false, at = false, x2.textContent = F ? `Listening` : ``, later(() => {
      if (!disposed && F && P && !H && L) Promise.resolve().then(() => { if (!disposed && F && P && !H && L) return L.start(P.stream); }).catch(() => { if (!disposed) C2.say(`Captions couldn't start here`); });
    }, 250));
  }, dt = () => {
    H && at && ot && W && W.live.size === 0 && ut();
  }, ft = (e2, t2) => {
    let n2 = ct(), r2 = n2.ctx.createBuffer(1, e2.length, t2);
    r2.copyToChannel(e2, 0);
    let i2 = n2.ctx.createBufferSource();
    i2.buffer = r2, i2.connect(n2.an);
    let a2 = Math.max(n2.ctx.currentTime + 0.03, n2.next);
    i2.start(a2), n2.next = a2 + r2.duration, n2.live.add(i2), i2.onended = () => {
      n2.live.delete(i2), dt();
    };
  }, pt = (e2, t2) => {
    if (typeof speechSynthesis > `u`) return ut();
    let n2 = new SpeechSynthesisUtterance(e2);
    n2.lang = Fe, n2.rate = t2.speed, n2.pitch = t2.pitch;
    let r2 = lt();
    r2 && (n2.voice = r2), n2.onboundary = () => U = 1, n2.onend = n2.onerror = () => ut(), speechSynthesis.cancel(), speechSynthesis.speak(n2);
  }, mt = (e2) => {
    if (!V || h2.speaker !== `readback` || !F || !e2.trim()) return;
    ht();
    let t2 = ++st;
    H = true, ot = false, L?.stop(), x2.textContent = `Speaking`;
    let n2 = rt[Ge] ?? { speed: 1, pitch: 1 };
    it && R ? (at = true, ct().next = 0, R.speak(t2, e2, h2.voice, n2.speed)) : pt(e2, n2);
  }, ht = () => {
    if (st++, R?.hush(), W) {
      for (let e2 of W.live) {
        e2.onended = null;
        try {
          e2.stop();
        } catch {
        }
      }
      W.live.clear(), W.next = 0;
    }
    typeof speechSynthesis < `u` && speechSynthesis.cancel();
  }, gt = (e2) => {
    let t2 = e2.data;
    if (t2.type === `speech` && t2.id === st && t2.pcm) ft(t2.pcm, t2.rate ?? 24e3);
    else if (t2.type === `spoken` && t2.id === st) {
      ot = true;
      if (t2.error) { C2.say(`Selected voice couldn't load or speak`); later(() => C2.quiet(), 2600); ut(); }
      else dt();
    } else if (t2.type === `progress` && t2.part === `voice`) C2.say(`Loading voices :: ${Math.round((t2.value ?? 0) * 100)}%`);
  }, _t = false, vt = async () => {
    try {
      let e2 = Ve();
      _t ||= (e2.worker.addEventListener(`message`, gt), true), C2.say(`Loading voices`);
      await e2.need(`voice`); if (!disposed) { it = true; C2.quiet(); }
    } catch {
      if (disposed) return;
      C2.say(`Voices couldn't load: the system voice speaks instead`), later(() => C2.quiet(), 2600);
    }
  }, yt = `~92 MB`;
  navigator.gpu?.requestAdapter().then((e2) => e2 && (yt = `~330 MB`)).catch(() => {
  });
  let bt = () => {
    if (it || typeof Worker > `u`) return;
    let e2 = false;
    try {
      e2 = localStorage.getItem(nt) === `on`;
    } catch {
    }
    if (e2) return void vt();
    C2.offer(`Natural voices :: on this device, ${yt} once`, () => {
      try {
        localStorage.setItem(nt, `on`);
      } catch {
      }
      vt();
    });
  }, xt = false, St = () => {
    let e2 = V && h2.speaker === `live`;
    P?.rack.setOn(e2), e2 && P && !xt && (xt = true, C2.say(`Live :: headphones keep it from feeding back`), later(() => C2.quiet(), 3200)), V && h2.speaker === `readback` || (ht(), ut());
  }, Ct = (t2) => {
    V = t2;
    let n2 = h2.speaker === `live`;
    S2.setAttribute(`aria-pressed`, String(t2)), S2.setAttribute(`aria-label`, n2 ? t2 ? `Stop hearing yourself` : `Hear yourself` : t2 ? `Stop reading back` : `Read back what you say`), S2.innerHTML = t2 ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M19.2478 4.75194C21.1027 6.60683 22.25 9.16933 22.25 11.9998C22.25 14.8302 21.1027 17.3927 19.2478 19.2476M15.8891 8.11132C16.8844 9.10662 17.5 10.4816 17.5 12.0004C17.5 13.5192 16.8844 14.8942 15.8891 15.8895M3.75 7.74999H5.35491C5.77433 7.74999 6.18314 7.61813 6.52352 7.37306L11.4578 3.82034C11.7886 3.58221 12.25 3.81856 12.25 4.22611V19.7739C12.25 20.1814 11.7886 20.4178 11.4578 20.1796L6.52352 16.6269C6.18314 16.3818 5.77433 16.25 5.35491 16.25H3.75C2.64543 16.25 1.75 15.3546 1.75 14.25V9.74999C1.75 8.64542 2.64543 7.74999 3.75 7.74999Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
` : e, c2 || S2.firstElementChild?.animate([{ scale: `0.25` }, { scale: `1` }], { duration: 200, easing: `cubic-bezier(0.2, 0, 0, 1)` }), t2 && !n2 && (ct().ctx.resume(), typeof speechSynthesis < `u` && speechSynthesis.getVoices(), bt()), t2 && P?.ctx.resume(), St(), Bt(t2);
  }, wt = () => {
    try { Ct(!V); }
    catch (error) { V = false; S2.setAttribute('aria-pressed', 'false'); C2.say('Audio output unavailable in this browser'); console.warn('[vocal-orb] audio output unavailable', error); }
  };
  S2.addEventListener(`click`, wt);
  let Tt = `orb:speaker-settings`;
  try {
    let e2 = JSON.parse(localStorage.getItem(Tt) || `{}`);
    r.some((t2) => t2.id === e2.speaker) && (h2.speaker = e2.speaker), i.some((t2) => t2.id === e2.effect) && (h2.effect = e2.effect), n.some((t2) => t2.id === e2.voice) && (h2.voice = e2.voice);
  } catch {
  }
  let Et = () => h2.speaker === `live` ? i : n, G = () => h2.speaker === `live` ? h2.effect : h2.voice, Dt = () => r.find((e2) => e2.id === h2.speaker)?.label ?? ``, Ot = () => {
    try {
      localStorage.setItem(Tt, JSON.stringify({ speaker: h2.speaker, effect: h2.effect, voice: h2.voice }));
    } catch {
    }
  }, kt = `cubic-bezier(0.16, 1, 0.3, 1)`, At = `cubic-bezier(0.23, 1, 0.32, 1)`, jt = g2.clientWidth < 760 ? `a` : `c`;
  g2.classList.add(`orb--${jt}`);
  let Mt = (e2, t2) => {
    let n2 = document.createElement(`button`);
    n2.type = `button`, n2.className = t2, n2.dataset.id = e2.id, n2.setAttribute(`role`, `radio`);
    let r2 = document.createElement(`span`);
    r2.className = `orb__m`;
    let i2 = document.createElement(`span`);
    return i2.textContent = e2.label, r2.appendChild(i2), n2.appendChild(r2), n2;
  }, Nt = (e2, t2) => {
    e2.setAttribute(`role`, `radiogroup`), e2.addEventListener(`keydown`, (n2) => {
      let r2 = [...e2.querySelectorAll(`[role=radio]`)], i2 = r2.indexOf(document.activeElement), a2 = n2.key === `ArrowRight` || n2.key === `ArrowDown` ? 1 : n2.key === `ArrowLeft` || n2.key === `ArrowUp` ? -1 : 0;
      if (!a2 || i2 < 0) return;
      n2.preventDefault(), n2.stopPropagation();
      let o3 = r2[(i2 + a2 + r2.length) % r2.length];
      o3.focus(), t2(o3.dataset.id);
    }), e2.addEventListener(`click`, (n2) => {
      let r2 = n2.target.closest(`[role=radio]`);
      r2 && e2.contains(r2) && t2(r2.dataset.id);
    });
  }, Pt = (e2, t2) => {
    for (let n2 of e2.querySelectorAll(`[role=radio]`)) {
      let e3 = n2.dataset.id === t2;
      n2.setAttribute(`aria-checked`, String(e3)), n2.tabIndex = e3 ? 0 : -1;
    }
  }, Ft = (e2) => e2.getAnimations().forEach((e3) => e3.cancel()), It = (e2, t2 = 0) => {
    e2.forEach((e3, n2) => {
      Ft(e3), !c2 && e3.animate([{ transform: `translateY(110%)` }, { transform: `translateY(0)` }], { duration: 380, delay: t2 + n2 * 30, easing: kt, fill: `backwards` });
    });
  }, Lt = (e2) => (e2.forEach(Ft), c2 ? Promise.resolve() : Promise.all(e2.map((e3) => e3.animate([{ transform: `translateY(0)` }, { transform: `translateY(110%)` }], { duration: 180, easing: At, fill: `forwards` }).finished.catch(() => {
  })))), Rt = (e2, t2) => {
    if (Ft(e2), c2) return;
    let n2 = e2.style.transform;
    e2.animate([{ transform: `${n2} scaleX(0)` }, { transform: `${n2} scaleX(1)` }], { duration: 320, delay: t2, easing: kt, fill: `backwards` });
  }, zt = (e2) => {
    if (Ft(e2), c2) return;
    let t2 = e2.style.transform;
    e2.animate([{ transform: `${t2} scaleX(1)` }, { transform: `${t2} scaleX(0)` }], { duration: 140, easing: At, fill: `forwards` });
  }, K;
  if (jt === `a`) {
    let e2 = document.createElement(`div`);
    e2.className = `orb__line2`, e2.hidden = true;
    let t2 = document.createElement(`button`);
    t2.type = `button`, t2.className = `orb__mode`;
    let n2 = document.createElement(`span`);
    n2.className = `orb__m`;
    let r2 = document.createElement(`span`);
    n2.appendChild(r2), t2.appendChild(n2);
    let i2 = document.createElement(`div`);
    i2.className = `orb__words`;
    let a2 = document.createElement(`span`);
    a2.className = `orb__rule`, e2.append(t2, i2, a2), g2.appendChild(e2), Nt(i2, (e3) => q(h2.speaker === `live` ? `effect` : `voice`, e3)), t2.addEventListener(`click`, () => q(`speaker`, h2.speaker === `live` ? `readback` : `live`));
    let o3 = (e3) => {
      let t3 = i2.querySelector(`[data-id="${G()}"]`);
      t3 && (e3 && (a2.style.transition = `none`), a2.style.width = `${t3.offsetWidth}px`, a2.style.transform = `translateX(${t3.offsetLeft}px)`, e3 && (a2.offsetWidth, a2.style.transition = ``));
    }, s3 = () => {
      r2.textContent = `${Dt()} ::`, t2.setAttribute(`aria-label`, `Speaker: ${Dt()}. Switch to ${h2.speaker === `live` ? `Read back` : `Live`}`), i2.setAttribute(`aria-label`, h2.speaker === `live` ? `Effect` : `Voice`), i2.replaceChildren(...Et().map((e3) => Mt(e3, `orb__word`))), Pt(i2, G());
    };
    s3(), K = { root: e2, capOffset: 36, show(t3) {
      if (t3) {
        e2.hidden = false, o3(true);
        let t4 = [r2, ...i2.querySelectorAll(`.orb__m > span`)];
        It(t4), Rt(a2, 120 + t4.length * 30);
      } else zt(a2), Lt([r2, ...i2.querySelectorAll(`.orb__m > span`)]).then(() => {
        V || (e2.hidden = true);
      });
    }, render(e3) {
      if (!e3) {
        Pt(i2, G()), o3(false);
        return;
      }
      zt(a2), Lt([r2, ...i2.querySelectorAll(`.orb__m > span`)]).then(() => {
        if (!V) return;
        s3(), o3(true);
        let e4 = [r2, ...i2.querySelectorAll(`.orb__m > span`)];
        It(e4), Rt(a2, 120 + e4.length * 30);
      });
    } };
  } else {
    let e2 = document.createElement(`div`);
    e2.className = `orb__desk`, e2.hidden = true;
    let t2 = (t3) => {
      let n2 = document.createElement(`div`);
      n2.className = `orb__sect`;
      let r2 = document.createElement(`p`);
      r2.className = `orb__head`;
      let i2 = document.createElement(`span`);
      i2.className = `orb__m`;
      let a3 = document.createElement(`span`);
      a3.textContent = t3, i2.appendChild(a3), r2.appendChild(i2);
      let o4 = document.createElement(`div`);
      o4.className = `orb__list`, o4.setAttribute(`aria-label`, t3);
      let s4 = document.createElement(`span`);
      return s4.className = `orb__tick`, o4.appendChild(s4), n2.append(r2, o4), e2.appendChild(n2), { g: n2, h: a3, list: o4, tick: s4 };
    }, a2 = t2(`Speaker`), o3 = t2(`Effect`);
    g2.appendChild(e2), Nt(a2.list, (e3) => q(`speaker`, e3)), Nt(o3.list, (e3) => q(h2.speaker === `live` ? `effect` : `voice`, e3));
    let s3 = (e3, t3, n2) => {
      let r2 = e3.list.querySelector(`[data-id="${t3}"]`);
      if (!r2) return;
      n2 && (e3.tick.style.transition = `none`);
      let i2 = r2.offsetLeft - 24, a3 = r2.offsetTop + r2.offsetHeight / 2;
      e3.tick.style.transform = `translate(${i2}px, ${a3}px)`, n2 && (e3.tick.offsetWidth, e3.tick.style.transition = ``);
    }, c3 = () => {
      for (let e3 of [...a2.list.querySelectorAll(`[role=radio]`)]) e3.remove();
      a2.list.append(...r.map((e3) => Mt(e3, `orb__item`))), Pt(a2.list, h2.speaker), o3.h.textContent = h2.speaker === `live` ? `Effect` : `Voice`, o3.list.setAttribute(`aria-label`, o3.h.textContent);
      for (let e3 of [...o3.list.querySelectorAll(`[role=radio]`)]) e3.remove();
      o3.list.append(...Et().map((e3) => Mt(e3, `orb__item`))), Pt(o3.list, G());
    };
    c3();
    let l2 = Math.max(i.length, n.length), u2 = 0, d2 = () => {
      if (e2.hidden) return;
      let t3 = o3.list.querySelectorAll(`[role=radio]`).length, n2 = o3.list.querySelector(`[role=radio]`), r2 = n2 ? n2.offsetHeight + 2 : 30, i2 = e2.offsetHeight + (l2 - t3) * r2;
      e2.style.top = `${Math.round(u2 - i2 / 2)}px`;
    }, f2 = () => [a2.h, ...a2.list.querySelectorAll(`.orb__m > span`), o3.h, ...o3.list.querySelectorAll(`.orb__m > span`)];
    K = { root: e2, capOffset: 0, place(e3) {
      u2 = e3, d2();
    }, show(t3) {
      if (t3) {
        e2.hidden = false, d2(), s3(a2, h2.speaker, true), s3(o3, G(), true);
        let t4 = f2();
        It(t4), Rt(a2.tick, 160), Rt(o3.tick, 120 + t4.length * 30);
      } else zt(a2.tick), zt(o3.tick), Lt(f2()).then(() => {
        V || (e2.hidden = true);
      });
    }, render(e3) {
      if (e3) {
        let e4 = [o3.h, ...o3.list.querySelectorAll(`.orb__m > span`)];
        Pt(a2.list, h2.speaker), s3(a2, h2.speaker, false), zt(o3.tick), Lt(e4).then(() => {
          if (!V) return;
          c3(), s3(o3, G(), true);
          let e5 = [o3.h, ...o3.list.querySelectorAll(`.orb__m > span`)];
          It(e5), Rt(o3.tick, 120 + e5.length * 30);
        });
      } else Pt(o3.list, G()), s3(o3, G(), false);
    } };
  }
  let q = (e2, t2) => {
    if (e2 === `speaker`) {
      if (h2.speaker === t2) return;
      h2.speaker = t2, Ct(V), K.render(true);
    } else e2 === `effect` ? (h2.effect = t2, P?.rack.setEffect(t2)) : h2.voice = t2, K.render(false);
    Ot();
  }, Bt = (e2) => K.show(e2);
  N = { id: jt, root: K.root, capOffset: K.capOffset, place: K.place?.bind(K) }, Ce();
  let Vt = () => {
    if (!P) return;
    const audio = P; P = null;
    try { audio.rack.destroy(); } catch (error) { console.warn('[vocal-orb] effect cleanup', error); }
    for (const track of audio.stream.getTracks()) { try { track.stop(); } catch {} }
    try { audio.ctx.close(); } catch (error) { console.warn('[vocal-orb] audio cleanup', error); }
  }, Ht = async () => {
    if (F) {
      micGeneration++; cancelAnimationFrame(wakeFrame); F = false, b2.set(false), ht(), ut(), tt(), Vt(), Pe(`idle`, `Stopped listening`);
      return;
    }
    if (y2.dataset.state !== `blocked`) {
      F = true, b2.set(true), y2.setAttribute(`aria-pressed`, `true`);
      const token = ++micGeneration;
      let acquired = null, context = null;
      try {
        let e2 = acquired = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (disposed || !F || token !== micGeneration) { e2.getTracks().forEach(track => track.stop()); return; }
        let t2 = context = new AudioContext({ latencyHint: `interactive` }), n2 = t2.createAnalyser();
        n2.fftSize = 1024, n2.smoothingTimeConstant = 0.55;
        let r2 = t2.createMediaStreamSource(e2);
        r2.connect(n2);
        let i2 = ge(t2, r2);
        i2.setEffect(h2.effect), P = { ctx: t2, stream: e2, an: n2, time: new Uint8Array(n2.fftSize), freq: new Uint8Array(n2.frequencyBinCount), rack: i2 }, St(), Pe(`listening`, `Listening`);
        let a2 = performance.now(), o3 = () => {
          !disposed && F && token === micGeneration && (b2.settled() || performance.now() - a2 > 1200 ? void et().catch(() => { if (!disposed) C2.say(`Captions couldn't start here`); }) : wakeFrame = requestAnimationFrame(o3));
        };
        wakeFrame = requestAnimationFrame(o3);
      } catch {
        if (P?.stream === acquired) { Vt(); acquired = null; context = null; }
        acquired?.getTracks().forEach(track => track.stop());
        if (context) context.close();
        if (disposed || token !== micGeneration) return;
        F = false, b2.set(false), Pe(`blocked`, `Microphone unavailable or blocked: check browser permissions`);
      }
    }
  };
  y2.addEventListener(`click`, Ht);
  let J = new Float64Array(4), Ut = new Float64Array(5), Wt = Float64Array.from(te), Gt = (e2) => {
    let t2 = F || H;
    ke.to !== +!!t2 && (ke.to = +!!t2, ie(ke, t2 ? 40 : 10, t2 && !c2 ? 0.55 : 1)), re(ke, e2), De = ke.x, Oe = h2.rest * Math.min(1, Math.max(0, 1 - De)), J.fill(0), U = Math.max(0, U - e2 * 5);
    let n2 = H && at && W ? { an: W.an, time: W.time, freq: W.freq, rate: W.ctx.sampleRate } : H ? null : P ? { an: P.an, time: P.time, freq: P.freq, rate: P.ctx.sampleRate } : null;
    if (H && !at && (J[0] = 0.25 + 0.6 * U, J[1] = 0.5 * U, J[2] = 0.6 * U, J[3] = 0.35 * U), n2) {
      n2.an.getByteTimeDomainData(n2.time);
      let t3 = 0;
      for (let e3 = 0; e3 < n2.time.length; e3++) t3 += ((n2.time[e3] - 128) / 128) ** 2;
      let r3 = Math.sqrt(t3 / n2.time.length);
      n2.an.getByteFrequencyData(n2.freq), P && n2.an === P.an && P.rack.guard(P.freq, e2) && (Ct(false), C2.say(`Feedback :: the speaker turned off, try headphones`), later(() => C2.quiet(), 3200));
      let i3 = n2.rate / n2.an.fftSize, a3 = (e3, t4) => {
        let r4 = 0, a4 = 0;
        for (let o3 = Math.floor(e3 / i3); o3 <= Math.min(n2.freq.length - 1, Math.ceil(t4 / i3)); o3++) r4 += n2.freq[o3] / 255, a4++;
        return a4 ? r4 / a4 : 0;
      };
      J[0] = r3, J[1] = a3(80, 350), J[2] = a3(350, 2e3), J[3] = a3(2e3, 6e3);
      for (let t4 = 0; t4 < 4; t4++) {
        let n3 = J[t4];
        Ne[t4] = Math.max(n3, Ne[t4] - e2 * 0.04, t4 === 0 ? 0.02 : 0.08);
        let r4 = t4 === 0 ? 6e-3 : 0.04;
        J[t4] = Math.min(1, Math.max(0, (n3 - r4) / (Ne[t4] - r4)));
      }
    }
    let r2 = (t3, n3) => t3 + (n3 - t3) * (1 - Math.exp(-e2 * (n3 > t3 ? 22 : 5))), i2 = c2 ? 0.4 : 1;
    Me = r2(Me, J[0] * i2);
    for (let e3 = 0; e3 < 3; e3++) I[e3] = r2(I[e3], J[e3 + 1] * i2);
    let a2 = b2.settled() && (F || H);
    Ae += (+!!a2 - Ae) * (1 - Math.exp(-e2 * (a2 ? 4 : 18))), je += e2, Ut[0] = Ut[4] = I[2], Ut[1] = I[0], Ut[2] = Me, Ut[3] = I[1];
    for (let e3 = 0; e3 < Wt.length; e3++) {
      let t3 = 0.88 + 0.12 * Math.sin(je * 3.2 - e3 * 0.9) + 0.95 * Ut[e3];
      Wt[e3] = Math.min(9.5, te[e3] * (1 + Ae * (t3 - 1)));
    }
    b2.step(e2, Wt);
  }, Y = { x: 0, y: 0, in: false, downX: 0, downY: 0 }, X = [ne(22, 1.8 * Math.sqrt(22)), ne(22, 1.8 * Math.sqrt(22))], Kt = (e2) => {
    if (!c2) {
      if (e2.pointerType !== `mouse`) {
        if (e2.type === `pointerdown`) return void (Y.downX = e2.clientX, Y.downY = e2.clientY);
        if (e2.target?.closest?.(`button`) || !Y.in && Math.hypot(e2.clientX - Y.downX, e2.clientY - Y.downY) < 10) return;
      }
      Y.x = e2.clientX, Y.y = e2.clientY, Y.in = true;
    }
  }, qt = (e2) => {
    (e2.type !== `pointerup` || e2.pointerType !== `mouse`) && (Y.in = false);
  };
  g2.addEventListener(`pointermove`, Kt), g2.addEventListener(`pointerdown`, Kt);
  for (let e2 of [`pointerleave`, `pointercancel`, `pointerup`]) g2.addEventListener(e2, qt);
  let Jt = (e2, t2) => {
    if (Y.in) {
      let e3 = g2.getBoundingClientRect(), n2 = Math.min(e3.width, e3.height) || 1, r2 = Math.max(-1, Math.min(1, (t2 - (Y.y - e3.top)) / n2 / 0.4)), i2 = Math.max(-1, Math.min(1, (Y.x - e3.left - e3.width / 2) / n2 / 0.55));
      X[0].to = (r2 > 0 ? 4 : 2) * r2, X[1].to = 0.1 * i2;
    } else X[0].to = X[1].to = 0;
    for (let t3 of X) (t3.x !== t3.to || t3.v !== 0) && (re(t3, e2), Math.abs(t3.to - t3.x) < 1e-4 && Math.abs(t3.v) < 1e-3 && Object.assign(t3, { x: t3.to, v: 0 }));
  }, Yt = () => h2.heart === `glass` || h2.heart === `silver` && F ? 1 : 0, Z = ne(9, 6);
  Z.x = Z.to = Yt();
  let Xt = (e2) => {
    if (Z.to = Yt(), c2) return void (Z.x = Z.to);
    (Z.x !== Z.to || Z.v !== 0) && re(Z, e2);
  }, Zt = 3, Qt = performance.now(), $t = 0, en = true, Q = 16.7, tn = 0, nn = true, $ = null, rn = (e2) => {
    $t = requestAnimationFrame(rn);
    let t2 = e2 - Qt;
    Qt = e2;
    let n2 = Math.min(t2 / 1e3, 0.1);
    if (Gt(n2), Je(n2), Zt += n2 * h2.speed * (1 + 0.5 * De + 0.6 * Me) * (1 - 0.75 * Oe) * (1 + 0.35 * z.energy * z.amt) * (c2 ? 0.15 : 1), t2 < 200 && (Q += (t2 - Q) * 0.08), tn = Q > 18.2 ? tn + 1 : 0, $ && --$.after <= 0 && (Q > $.avg * 0.9 && (M = $.scale, j = $.dprCap, T2 ? be() : xe(), nn = false), $ = null, tn = 0), nn && !$ && tn > 30) {
      let e3 = Math.min(0.92, Math.max(0.6, Math.sqrt(14 / Q))), t3 = { scale: M, dprCap: j, avg: Q, after: 60 };
      T2 && M > 0.35 ? (M = Math.max(0.35, M * e3), be(), $ = t3) : !T2 && j > 1 && (j = Math.max(1, Math.min(j, window.devicePixelRatio || 1) * e3), xe(), $ = t3), tn = 0, Q = 16.7;
    }
    let r2 = Se(g2.clientWidth, g2.clientHeight || 1);
    Jt(n2, r2.cy), Xt(n2), Ee(Zt, r2);
  }, an = () => {
    $t || !en || document.hidden || (Qt = performance.now(), $t = requestAnimationFrame(rn));
  }, on = () => {
    cancelAnimationFrame($t), $t = 0;
  }, sn = new IntersectionObserver(([e2]) => {
    en = e2.isIntersecting, en ? an() : on();
  });
  sn.observe(g2);
  let cn = () => document.hidden ? on() : an();
  return document.addEventListener(`visibilitychange`, cn), an(), { destroy: () => {
    if (disposed) return;
    disposed = true; F = false; V = false; lifetime.abort(); micGeneration++; cancelAnimationFrame(wakeFrame);
    g2.getAnimations?.({ subtree: true }).forEach(animation => animation.cancel());
    for (const timer of timers) clearTimeout(timer); timers.clear();
    const safely = fn => { try { fn(); } catch (error) { console.warn('[vocal-orb] cleanup', error); } };
    safely(on); safely(ht); safely(() => W?.ctx.close()); safely(() => L?.destroy()); safely(() => R?.destroy()); safely(Vt);
    S2.removeEventListener(`click`, wt); y2.removeEventListener(`click`, Ht); g2.removeEventListener(`pointermove`, Kt); g2.removeEventListener(`pointerdown`, Kt);
    for (let e2 of [`pointerleave`, `pointercancel`, `pointerup`]) g2.removeEventListener(e2, qt);
    safely(() => sn.disconnect()); safely(() => we.disconnect()); document.removeEventListener(`visibilitychange`, cn);
    safely(ye); safely(() => w2.getExtension(`WEBGL_lose_context`)?.loseContext()); g2.remove();
  }, set: (e2, a2) => {
    e2 === `heart` && t.includes(a2) ? h2.heart = a2 : e2 === `voice` && n.some((e3) => e3.id === a2) ? q(`voice`, a2) : e2 === `effect` && i.some((e3) => e3.id === a2) ? q(`effect`, a2) : e2 === `speaker` && r.some((e3) => e3.id === a2) ? q(`speaker`, a2) : e2 in h2 && typeof a2 == `number` && (h2[e2] = a2), e2 === `size` && Ce();
  } };
} };
export {
  o as config,
  ve as default
};
