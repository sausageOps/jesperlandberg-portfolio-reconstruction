export const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const skyFragment = /* glsl */ `
  uniform vec3 u_color;
  void main() { gl_FragColor = vec4(u_color, 1.0); }
`;

const surfaceChunks = /* glsl */ `
  const float PI = 3.141592653589793;
  const float SHEET_BANK = -0.16;
  const float SHEET_DIAG = 0.03;
  const float SHEET_SHIFT = -0.2;
  const float SHEET_VTWIST = 1.8;

  uniform float u_sheetW;
  uniform float u_sheetD;
  uniform float u_sheetT;
  uniform float u_sheetC;
  uniform float u_sheetP;
  uniform float u_sheetV;
  // Drawn-pose inputs. The vertex stage bends with these while the fragment
  // stage keeps shading from u_sheetD/u_sheetC/u_leanA, so the gallery can rest
  // upright and still carry the source's depth haze.
  uniform float u_geoD;
  uniform float u_geoC;
  uniform float u_geoA;
  uniform float u_hover;
  uniform vec2 u_hoverPoint;
  uniform float u_dent;
  uniform float u_leanA;
  uniform float u_leanW;
  uniform float u_bulgeA;
  uniform float u_bulgeH;
  uniform float u_pillA;
  uniform vec3 u_lens;
  uniform float u_lensA;

  vec4 pillLens(vec4 w) {
    if (u_pillA < 0.0001 || u_lens.z < 0.0001 || abs(u_lensA) < 0.000001) return w;
    vec2 q = w.xy - u_lens.xy;
    float k = max(1.0 - dot(q, q) / (u_lens.z * u_lens.z), 0.0);
    w.xy += q * u_lensA * u_pillA * k * k;
    return w;
  }

  float sheetQ(float wx) {
    return wx / max(u_sheetW, 0.0001) * u_sheetT + SHEET_SHIFT;
  }
  // The profile helpers take the blend/depth they belong to instead of reading
  // one uniform set, so the drawn surface and the shaded surface can be fed
  // separately without duplicating the maths. Geometry passes u_geoC/u_geoD;
  // shading passes u_sheetC/u_sheetD.
  float sheetShape(float q, float c) {
    return mix(1.0 - q * q, sin(PI * q), c) * exp(-q * q);
  }
  float sheetShapeSlope(float q, float c) {
    float g = exp(-q * q);
    float bowl = -2.0 * q * (1.0 + (1.0 - q * q));
    float ess = PI * cos(PI * q) - 2.0 * q * sin(PI * q);
    return mix(bowl, ess, c) * g;
  }
  float sheetZ(float wx, float d, float c) { return -d * sheetShape(sheetQ(wx), c); }
  float sheetRoll(float wx, float c) {
    if (u_sheetW < 0.001) return 0.0;
    return SHEET_BANK * sheetShapeSlope(sheetQ(wx), c) / PI * c * u_sheetP;
  }
  float dome(vec2 uv) {
    vec2 q = uv * 2.0 - 1.0;
    float envelope = (1.0 - q.x * q.x) * (1.0 - q.y * q.y);
    return envelope * (0.65 + 0.35 * clamp(1.0 - distance(uv, u_hoverPoint), 0.0, 1.0));
  }
  float leanRamp(float s) {
    s = clamp(s, -1.0, 1.0);
    return s * (1.5 - 0.5 * s * s);
  }
  float leanSlope(float s) {
    s = min(abs(s), 1.0);
    return 1.5 * (1.0 - s * s);
  }
  vec4 sheet(vec4 w) {
    float a = sheetRoll(w.x, u_geoC);
    if (u_sheetV > 0.001 && u_sheetW > 0.001 && u_sheetP > 0.001) {
      float qe = w.x / u_sheetW;
      a += SHEET_VTWIST * u_sheetV * smoothstep(0.3, 0.9, abs(qe)) * sign(qe) * u_sheetP;
    }
    if (abs(a) > 0.0001) {
      float s = sin(a), c = cos(a);
      w = vec4(w.x, w.y * c - w.z * s, w.y * s + w.z * c, w.w);
    }
    w.z += sheetZ(w.x, u_geoD, u_geoC) * u_sheetP;
    if (u_sheetW > 0.001) {
      float qw = w.x / u_sheetW;
      w.y += SHEET_DIAG * w.x * u_geoC * u_sheetP;
      if (u_sheetV > 0.001) {
        float m = 1.0 - smoothstep(-1.0, 0.3, qw);
        w.y += 0.1 * u_sheetW * u_sheetV * m * u_sheetP;
        w.z += 0.2 * u_sheetW * u_sheetV * m * u_sheetP;
      }
    }
    return w;
  }
  float shadeAt(float wx, vec2 uv, float resY) {
    if (u_sheetD < 0.001) return 0.0;
    float d = (u_sheetW > 0.001 && u_sheetP > 0.001)
      ? clamp((u_sheetD - sheetZ(wx, u_sheetD, u_sheetC)) / (2.0 * u_sheetD), 0.0, 1.0) * u_sheetP * smoothstep(0.0, resY * 0.04, u_sheetD) : 0.0;
    if (u_hover > 0.0001) d += (u_hover * u_dent * resY * dome(uv)) / max(2.0 * u_sheetD, resY * 0.25);
    return clamp(d, 0.0, 1.0);
  }
  float offsetAt(float wx, vec2 uv, float resY) {
    float z = 0.0;
    if (u_sheetW > 0.001 && u_sheetP > 0.001 && u_sheetD > 0.001) z += sheetZ(wx, u_sheetD, u_sheetC) * u_sheetP;
    if (u_leanW > 0.001) z += u_leanA * leanRamp(wx / u_leanW) * u_sheetP;
    if (u_hover > 0.0001) z -= u_hover * u_dent * resY * dome(uv);
    return z;
  }
  vec3 normalAt(float wx, vec2 uv, vec2 res) {
    float dx = 0.0, dy = 0.0;
    if (u_sheetW > 0.001 && u_sheetP > 0.001 && u_sheetD > 0.001)
      dx += -u_sheetD * sheetShapeSlope(sheetQ(wx), u_sheetC) * u_sheetT / u_sheetW * u_sheetP;
    if (u_leanW > 0.001) dx += (u_leanA / u_leanW) * leanSlope(wx / u_leanW) * u_sheetP;
    if (u_hover > 0.0001) {
      vec2 q = uv * 2.0 - 1.0;
      float a = u_hover * u_dent;
      dx += 4.0 * a * res.y * q.x * (1.0 - q.y * q.y) / max(res.x, 0.0001);
      dy += 4.0 * a * q.y * (1.0 - q.x * q.x);
    }
    vec3 n = normalize(vec3(-dx, -dy, 1.0));
    float a = sheetRoll(wx, u_sheetC);
    if (abs(a) > 0.0001) {
      float s = sin(a), c = cos(a);
      n = vec3(n.x, n.y * c - n.z * s, n.y * s + n.z * c);
    }
    return n;
  }
`;

export const surfaceVertex = /* glsl */ `
  uniform vec2 u_res;
  uniform float u_arcW;
  uniform float u_arcD;
  uniform float u_arcOuterD;
  uniform float u_arcOuterStart;
  uniform float u_arcEdgeBend;
  uniform float u_panelBend;
  uniform float u_panelCenter;
  uniform float u_panelHalfWidth;
  varying vec2 vUv;
  varying vec3 vFlat;
  ${surfaceChunks}
  void main() {
    vUv = uv;
    vFlat = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 p = position;
    if (u_hover > 0.0001) p.z -= u_hover * u_dent * u_res.y * dome(uv);
    vec4 w = modelMatrix * vec4(p, 1.0);
    w = pillLens(w);
    w = sheet(w);
    if (u_leanW > 0.001 && u_sheetP > 0.001) w.z += u_geoA * leanRamp(w.x / u_leanW) * u_sheetP;
    if (u_bulgeH > 0.001) {
      float t = clamp(w.y / u_bulgeH, -1.0, 1.0);
      w.z += u_bulgeA * (1.0 - t * t);
    }
    // A shallow horizontal arc is independent of the velocity-driven sheet.
    // Perspective projects this depth into gently bowed panel edges.
    if (u_arcW > 0.001) {
      float x = w.x / u_arcW;
      float arc = x * x / (1.0 + 0.35 * x * x);
      // Beyond the center panel, turn the shared surface gently away on
      // either side. The squared falloff joins the center without a seam.
      float outer = max(abs(x) - u_arcOuterStart, 0.0);
      float outerArc = outer * outer / (1.0 + 0.75 * outer * outer);
      w.z -= (u_arcD * arc + u_arcOuterD * outerArc) * u_sheetP;
      // On narrow screens the visible neighbor is only a thin strip. Bend
      // the shared surface toward the horizon so its edge remains readable.
      float bend = smoothstep(u_arcOuterStart, u_arcOuterStart + 0.22, abs(x));
      w.y *= 1.0 - u_arcEdgeBend * bend * u_sheetP;
    }
    // Continue the same shallow arc across each neighboring panel, fading
    // to zero at its edges so adjoining surfaces retain their existing pose.
    if (u_panelBend > 0.0 && u_panelHalfWidth > 0.001) {
      float localX = clamp((w.x - u_panelCenter) / u_panelHalfWidth, -1.0, 1.0);
      float bow = (1.0 - localX * localX) / (1.0 + 0.35 * localX * localX);
      w.z += u_panelBend * bow * u_sheetP;
    }
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const surfaceFragment = /* glsl */ `
  uniform sampler2D u_texture;
  uniform vec2 u_size;
  uniform vec2 u_res;
  uniform float u_alpha;
  uniform float u_shade;
  uniform float u_shadeS;
  uniform float u_corner;
  uniform float u_white;
  uniform vec3 u_wash;
  uniform float u_projectSurface;
  uniform sampler2D u_projectGrain;
  uniform float u_projectGrainReady;
  uniform vec2 u_projectViewport;
  uniform vec2 u_projectGrainOffset;
  uniform float u_projectGrainTile;
  uniform float u_projectPixelRatio;
  uniform float u_projectGrainOpacity;
  uniform float u_projectGrainInk;
  uniform vec3 u_projectBackgroundColor;
  uniform float u_scrim;
  uniform float u_textMode;
  uniform float u_arrowMode;
  uniform float u_controlPad;
  uniform float u_crossMode;
  uniform float u_openMode;
  uniform float u_ctaMode;
  uniform float u_labelMode;
  uniform float u_ring;
  uniform vec3 u_rest;
  uniform vec3 u_lit;
  uniform vec3 u_iconC;
  uniform vec3 u_pillDisc;
  uniform float u_markOut;
  uniform float u_markIn;
  uniform float u_ringW;
  uniform float u_markW;
  uniform vec4 u_clip;
  uniform float u_clipR;
  uniform float u_clipOn;
  varying vec2 vUv;
  varying vec3 vFlat;
  ${surfaceChunks}

  vec2 uvCover(vec2 planeSize, vec2 imageSize, vec2 uv) {
    float pr = planeSize.x / planeSize.y;
    float ir = imageSize.x / imageSize.y;
    vec2 ns = pr < ir ? vec2(imageSize.x * (planeSize.y / imageSize.y), planeSize.y)
                      : vec2(planeSize.x, imageSize.y * (planeSize.x / imageSize.x));
    vec2 no = (pr < ir ? vec2((ns.x - planeSize.x) / 2.0, 0.0)
                       : vec2(0.0, (ns.y - planeSize.y) / 2.0)) / ns;
    return uv * planeSize / ns + no;
  }
  float roundedBox(vec2 p, vec2 mid, float r) {
    vec2 q = abs(p - mid) - (mid - r);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  vec3 lightIt(vec3 col, vec3 n, vec3 v, float amt) {
    vec3 l = normalize(vec3(-0.4, 0.5, 1.0));
    float d = dot(n, l) * 0.5 + 0.5;
    col *= 1.0 - 0.12 * amt * (1.0 - d);
    vec3 h = normalize(l + v);
    return col + pow(max(dot(n, h), 0.0), 48.0) * 0.35 * amt;
  }
  float markSeg(vec2 q, vec2 a, vec2 b, float w) {
    vec2 pa = q - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.000001), 0.0, 1.0);
    float d = length(pa - ba * h) - w * 0.5;
    float aa = max(fwidth(d), 0.0001);
    return 1.0 - smoothstep(-aa, aa, d);
  }
  float pillMask() {
    float d = length(gl_FragCoord.xy - u_pillDisc.xy)
      - mix(-0.04 * u_pillDisc.z, u_pillDisc.z, u_pillA);
    float aa = max(fwidth(d), 0.0001);
    return 1.0 - smoothstep(-aa, aa, d);
  }
  float markLag(float t, float d) { return clamp((t - d) / (1.0 - d), 0.0, 1.0); }
  float arrowSeg(vec2 q, vec2 a, vec2 b, vec2 dir, float at, float w) {
    return markSeg(q, a + dir * (at * 0.95), b + dir * (at * 0.95), w);
  }
  float arrowStroke(vec2 q, vec2 a, vec2 b, vec2 dir, float outP, float inP, float w) {
    return max(arrowSeg(q, a, b, dir, outP, w), arrowSeg(q, a, b, dir, inP - 1.0, w));
  }
  float arrowMark(vec2 q, float outP, float inP, float w) {
    vec2 dg = vec2(0.7071);
    vec2 tip = dg * 0.1;
    float m = arrowStroke(q, -tip, tip, dg, markLag(outP, 0.22), inP, w);
    m = max(m, arrowStroke(q, tip, tip - vec2(0.11, 0.0), vec2(1.0, 0.0), outP, markLag(inP, 0.22), w));
    m = max(m, arrowStroke(q, tip, tip - vec2(0.0, 0.11), vec2(0.0, 1.0), outP, markLag(inP, 0.374), w));
    return m;
  }
  float rightArrow(vec2 q, float w) {
    vec2 tip = vec2(0.1, 0.0);
    float m = markSeg(q, -tip, tip, w);
    m = max(m, markSeg(q, tip, tip + 0.11 * vec2(-0.7071, 0.7071), w));
    m = max(m, markSeg(q, tip, tip + 0.11 * vec2(-0.7071, -0.7071), w));
    return m;
  }
  float crossArm(vec2 q, vec2 dir, float center, float lengthPx, float w) {
    return markSeg(q, dir * (center - lengthPx), dir * (center + lengthPx), w);
  }
  float crossPair(vec2 q, vec2 dir, float outP, float inP, float w) {
    return max(
      crossArm(q, dir, outP * 0.95, 0.12 * (1.0 + 0.5 * outP), w),
      crossArm(q, dir, (inP - 1.0) * 0.95, 0.12 * (1.0 + 0.5 * (1.0 - inP)), w)
    );
  }
  void main() {
    if (u_openMode > 0.5) {
      vec2 sz = vec2(u_res.x / max(u_res.y, 0.0001), 1.0);
      vec2 p = vUv * (sz + 2.0 * u_controlPad) - u_controlPad;
      vec2 q = p - sz * 0.5;
      float d = roundedBox(p, sz * 0.5, min(u_corner, min(sz.x, sz.y) * 0.5));
      float aa = max(fwidth(d), 0.0001);
      float outline = 1.0 - smoothstep(-aa, aa, d);
      float disc = u_pillA > 0.0001 ? pillMask() : 0.0;
      float mark = arrowMark(q, u_markOut, u_markIn, u_markW) * outline;
      vec3 rgb = mix(u_rest, mix(u_iconC, u_rest, disc), mark);
      float inner = 1.0 - smoothstep(-aa, aa, d + u_ringW);
      float shape = max(outline - inner * disc, mark);
      float alpha = shape * u_alpha;
      if (u_clipOn > 0.5) {
        vec2 cq = gl_FragCoord.xy - u_clip.xy;
        float cd = roundedBox(cq, u_clip.zw * 0.5, u_clipR);
        alpha *= 1.0 - smoothstep(-max(fwidth(cd), 0.0001), max(fwidth(cd), 0.0001), cd);
      }
      if (alpha < 0.001) discard;
      gl_FragColor = vec4(rgb, alpha);
      return;
    }
    if (u_ctaMode > 0.5) {
      vec2 sz = vec2(u_res.x / max(u_res.y, 0.0001), 1.0);
      vec2 p = vUv * sz;
      float d = roundedBox(p, sz * 0.5, min(u_corner, min(sz.x, sz.y) * 0.5));
      float aa = max(fwidth(d), 0.0001);
      float outline = 1.0 - smoothstep(-aa, aa, d);
      float disc = u_pillA > 0.0001 ? pillMask() : 0.0;
      float alpha = outline * u_alpha;
      if (u_clipOn > 0.5) {
        vec2 cq = gl_FragCoord.xy - u_clip.xy;
        float cd = roundedBox(cq, u_clip.zw * 0.5, u_clipR);
        alpha *= 1.0 - smoothstep(-max(fwidth(cd), 0.0001), max(fwidth(cd), 0.0001), cd);
      }
      if (alpha < 0.001) discard;
      gl_FragColor = vec4(mix(u_rest, u_lit, disc), alpha);
      return;
    }
    if (u_crossMode > 0.5) {
      vec2 sz = vec2(u_res.x / max(u_res.y, 0.0001), 1.0);
      vec2 p = vUv * (sz + 2.0 * u_controlPad) - u_controlPad;
      vec2 q = p - sz * 0.5;
      float d = roundedBox(p, sz * 0.5, min(u_corner, min(sz.x, sz.y) * 0.5));
      float aa = max(fwidth(d), 0.0001);
      float outline = 1.0 - smoothstep(-aa, aa, d);
      float discD = length(q) - mix(-0.02, 0.5, u_pillA);
      float discAA = max(fwidth(discD), 0.0001);
      float disc = u_pillA > 0.0001 ? 1.0 - smoothstep(-discAA, discAA, discD) : 0.0;
      float lead = 1.0 - 0.16;
      float mark = max(
        crossPair(q, vec2(0.7071, 0.7071), clamp(u_markOut / lead, 0.0, 1.0), clamp(u_markIn / lead, 0.0, 1.0), u_markW),
        crossPair(q, vec2(-0.7071, 0.7071), clamp((u_markOut - 0.16) / lead, 0.0, 1.0), clamp((u_markIn - 0.16) / lead, 0.0, 1.0), u_markW)
      ) * outline;
      vec3 rgb = mix(u_rest, mix(u_iconC, u_rest, disc), mark);
      float inner = 1.0 - smoothstep(-aa, aa, d + u_ringW);
      float shape = max(outline - inner * disc, mark);
      float alpha = shape * u_alpha;
      if (alpha < 0.001) discard;
      gl_FragColor = vec4(rgb, alpha);
      return;
    }
    if (u_arrowMode > 0.5) {
      vec2 sz = vec2(u_res.x / max(u_res.y, 0.0001), 1.0);
      vec2 p = vUv * (sz + 2.0 * u_controlPad) - u_controlPad;
      vec2 q = p - sz * 0.5;
      float d = roundedBox(p, sz * 0.5, min(u_corner, min(sz.x, sz.y) * 0.5));
      float aa = max(fwidth(d), 0.0001);
      float outline = 1.0 - smoothstep(-aa, aa, d);
      float discD = length(q) - mix(-0.02, 0.5, u_pillA);
      float discAA = max(fwidth(discD), 0.0001);
      float disc = u_pillA > 0.0001 ? 1.0 - smoothstep(-discAA, discAA, discD) : 0.0;
      float mark = rightArrow(q - vec2(0.95, 0.0) * u_markOut, u_markW);
      vec2 qr = vec2((q.x - q.y) * 0.7071, (q.x + q.y) * 0.7071);
      mark = max(mark, arrowMark(qr, 1.0, u_markIn, u_markW)) * outline;
      vec3 rgb = mix(vec3(0.0), mix(vec3(1.0), vec3(0.0), disc), mark);
      float inner = 1.0 - smoothstep(-aa, aa, d + u_ringW);
      float shape = max(outline - inner * disc, mark);
      float alpha = shape * u_alpha;
      if (alpha < 0.001) discard;
      gl_FragColor = vec4(rgb, alpha);
      return;
    }
    vec4 tex = u_textMode > 0.5 ? texture2D(u_texture, vUv)
                                : texture2D(u_texture, uvCover(u_res, u_size, vUv));
    if (u_labelMode > 0.5) {
      float disc = u_pillA > 0.0001 ? pillMask() : 0.0;
      vec3 ink = mix(vec3(0.0), vec3(1.0), disc);
      float coverage = tex.a;
      if (u_pillA > 0.0001 && u_lens.z > 0.0001) {
        vec2 rad = (gl_FragCoord.xy - u_pillDisc.xy) / max(u_pillDisc.z, 1.0);
        float k = max(1.0 - dot(rad, rad), 0.0);
        vec2 off = vec2(k * k * 3.0 * u_pillA * fwidth(vUv).x, 0.0);
        float cr = texture2D(u_texture, vUv + off).a;
        float cb = texture2D(u_texture, vUv - off).a;
        float widest = max(coverage, max(cr, cb));
        ink *= vec3(cr, coverage, cb) / max(widest, 0.001);
        coverage = widest;
      }
      tex = vec4(ink, coverage);
    }
    if (u_shade > 0.001) {
      float depth = shadeAt(vFlat.x, vUv, u_res.y);
      tex.rgb = mix(tex.rgb, vec3(0.059), u_shade * 0.8 * pow(depth, u_shadeS));
      vec3 p = vFlat + vec3(0.0, 0.0, offsetAt(vFlat.x, vUv, u_res.y));
      tex.rgb = lightIt(tex.rgb, normalAt(vFlat.x, vUv, u_res), normalize(cameraPosition - p), u_shade);
    }
    if (u_scrim > 0.001) {
      float g = 1.0 - smoothstep(0.0, 0.5, vUv.y);
      tex.rgb = mix(tex.rgb, vec3(0.0), u_scrim * 0.65 * g * g);
    }
    vec3 wash = u_wash;
    if (u_projectSurface > 0.5) {
      vec2 screen = vec2(gl_FragCoord.x / u_projectPixelRatio,
        u_projectViewport.y - gl_FragCoord.y / u_projectPixelRatio);
      vec2 grainUv = (screen - u_projectViewport * 0.5 - u_projectGrainOffset) / u_projectGrainTile + 0.5;
      float grain = texture2D(u_projectGrain, vec2(grainUv.x, 1.0 - grainUv.y)).a;
      wash = mix(u_projectBackgroundColor, vec3(u_projectGrainInk),
        grain * u_projectGrainOpacity * u_projectGrainReady);
    }
    tex.rgb = mix(tex.rgb, wash, u_white);
    float alpha = tex.a * u_alpha;
    if (u_corner > 0.0001) {
      vec2 sz = vec2(u_res.x / max(u_res.y, 0.0001), 1.0);
      vec2 mid = sz * 0.5;
      float r = min(u_corner, min(mid.x, mid.y));
      float d = roundedBox(vUv * sz, mid, r);
      float aa = max(fwidth(d), 0.0001);
      alpha *= 1.0 - smoothstep(-aa, aa, d);
    }
    if (u_clipOn > 0.5) {
      vec2 q = gl_FragCoord.xy - u_clip.xy;
      float d = roundedBox(q, u_clip.zw * 0.5, u_clipR);
      float aa = max(fwidth(d), 0.0001);
      alpha *= 1.0 - smoothstep(-aa, aa, d);
    }
    if (alpha < 0.001) discard;
    gl_FragColor = vec4(tex.rgb, alpha);
  }
`;

export const postFragment = /* glsl */ `
  uniform sampler2D u_scene;
  uniform vec2 u_aspect;
  uniform float u_time;
  uniform vec2 u_center;
  uniform float u_p;
  uniform float u_radius;
  uniform float u_squash;
  uniform float u_ballA;
  uniform float u_ballWarp;
  uniform float u_ballShade;
  uniform vec2 u_ballEdge;
  uniform sampler2D u_trail;
  uniform vec2 u_trailTexel;
  varying vec2 vUv;

  vec2 spin(vec2 v, float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c) * v;
  }
  vec2 squash() { return vec2(1.0 + u_squash, 1.0 - u_squash); }
  float lobes(float a) { return sin(a * 3.0 + u_time * 0.7) * 0.6 + sin(a * 5.0 - u_time * 0.45) * 0.4; }
  vec4 grab(vec2 dir, float rad) {
    vec2 uv = (dir * rad * u_aspect.x) / (squash() * u_aspect) + u_center;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
    return texture2D(u_scene, uv);
  }
  float pull(float t, float e, float fall) { return fall * (e * e) / max(t, 0.001); }

  void main() {
    vec2 q = (vUv - u_center) * u_aspect * squash();
    float t = length(q) / u_aspect.x;
    vec2 dir = length(q) > 0.00001 ? normalize(q) : vec2(1.0, 0.0);
    float n = lobes(atan(q.y, q.x)) * 0.05 * sin(3.14159265 * clamp(u_p, 0.0, 1.0));
    float r = u_p * u_radius * (1.0 + 0.015 * sin(u_time * 1.6)) + n;
    float e = r * 1.5;
    float fall = 1.0 - smoothstep(r, r + 0.09, t);
    float draw = pull(t, e, fall);
    vec2 sdir = spin(dir, draw * 0.3 * min(u_time, 15.0));
    float split = e * 0.004;
    vec4 cr = grab(sdir, t - pull(t, e + split, fall));
    vec4 cg = grab(sdir, t - draw);
    vec4 cb = grab(sdir, t - pull(t, e - split, fall));
    vec4 col = vec4(cr.r, cg.g, cb.b, max(cr.a, max(cg.a, cb.a)));
    float d = t - r;
    float aa = max(fwidth(d), 0.0001);
    float inside = 1.0 - smoothstep(-aa, aa, d);
    vec4 page = mix(col, vec4(0.0, 0.0, 0.0, 1.0), inside);

    if (u_ballA > 0.001) {
      vec2 texel = u_trailTexel * 1.5;
      vec2 g = vec2(
        texture2D(u_trail, vUv + vec2(texel.x, 0.0)).r - texture2D(u_trail, vUv - vec2(texel.x, 0.0)).r,
        texture2D(u_trail, vUv + vec2(0.0, texel.y)).r - texture2D(u_trail, vUv - vec2(0.0, texel.y)).r
      );
      vec2 pw = vec2(vUv.x - 0.5, (vUv.y - 0.5) / u_aspect.x);
      float edge = 1.0 - smoothstep(u_ballEdge.x, u_ballEdge.y, length(pw));
      vec2 off = g * u_ballWarp * u_ballA * edge;
      vec2 buv = clamp(vUv + off, 0.0, 1.0);
      float m = smoothstep(0.0, 0.002, length(off));
      vec4 warpedSample = texture2D(u_scene, buv);
      vec3 warped = warpedSample.rgb;
      float shade = dot(-g, normalize(vec2(-0.3, 1.0))) * u_ballShade * u_ballA * edge;
      float lum = dot(warped, vec3(0.2126, 0.7152, 0.0722));
      float head = 1.0 - smoothstep(0.7, 0.95, lum);
      warped *= 1.0 + clamp(shade, -0.5, 0.5) * head;
      page = mix(page, vec4(warped, warpedSample.a), m);
    }
    gl_FragColor = page;
  }
`;

export const trailFragment = /* glsl */ `
  uniform sampler2D u_prev;
  uniform vec2 u_texel;
  uniform float u_decay;
  uniform float u_diff;
  uniform vec2 u_pos;
  uniform float u_amp;
  uniform float u_rad;
  uniform float u_aspect;
  varying vec2 vUv;
  void main() {
    float c = texture2D(u_prev, vUv).r;
    float n = texture2D(u_prev, vUv + vec2(u_texel.x, 0.0)).r
      + texture2D(u_prev, vUv - vec2(u_texel.x, 0.0)).r
      + texture2D(u_prev, vUv + vec2(0.0, u_texel.y)).r
      + texture2D(u_prev, vUv - vec2(0.0, u_texel.y)).r;
    float h = mix(c, n * 0.25, u_diff) * u_decay;
    vec2 d = vUv - u_pos;
    vec2 q = vec2(d.x, d.y / u_aspect);
    h += u_amp * exp(-dot(q, q) / (u_rad * u_rad));
    gl_FragColor = vec4(min(h, 1.5), 0.0, 0.0, 1.0);
  }
`;

export const llamaVertex = /* glsl */ `
  varying vec3 vN;
  void main() {
    vN = normalize(normalMatrix * (mat3(instanceMatrix) * normal));
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

export const llamaFragment = /* glsl */ `
  uniform vec2 u_res;
  uniform vec2 u_center;
  uniform float u_radius;
  uniform float u_aspect;
  uniform float u_time;
  uniform float u_amp;
  uniform float u_disp;
  uniform float u_shine;
  varying vec3 vN;
  float shade(vec3 n, vec3 l) {
    vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(dot(n, h), 0.0), 60.0) * 3.5;
    float sheen = pow(1.0 - max(n.z, 0.0), 3.0) * 0.7;
    float lam = max(dot(n, l), 0.0) * 0.18;
    return spec + sheen + lam;
  }
  void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
    vec2 q = vec2(uv.x - u_center.x, (uv.y - u_center.y) / u_aspect);
    float a = atan(q.y, q.x);
    float lobe = sin(a * 3.0 + u_time * 0.7) * 0.6 + sin(a * 5.0 - u_time * 0.45) * 0.4;
    if (length(q) > u_radius + lobe * u_amp) discard;
    vec3 n = normalize(vN);
    vec3 l = normalize(vec3(-0.3, 1.0, 0.55));
    vec3 nr = normalize(n + vec3(u_disp, 0.0, 0.0));
    vec3 nb = normalize(n - vec3(u_disp, 0.0, 0.0));
    vec3 col = vec3(shade(nr, l), shade(n, l), shade(nb, l));
    gl_FragColor = vec4(col * u_shine, 1.0);
  }
`;

export const awardVertex = /* glsl */ `
  varying vec3 vN;
  void main() {
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const awardFragment = /* glsl */ `
  uniform vec3 u_color;
  uniform vec3 u_light;
  uniform float u_alpha;
  uniform vec4 u_clip;
  uniform float u_clipR;
  uniform float u_clipOn;
  varying vec3 vN;
  void main() {
    float alpha = u_alpha;
    if (u_clipOn > 0.5) {
      vec2 p = gl_FragCoord.xy - u_clip.xy;
      vec2 mid = u_clip.zw * 0.5;
      vec2 q = abs(p - mid) - (mid - u_clipR);
      float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - u_clipR;
      float aa = max(fwidth(d), 0.0001);
      alpha *= 1.0 - smoothstep(-aa, aa, d);
    }
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 l = normalize(vec3(-0.35, 0.9, 0.6));
    float lam = max(dot(n, l), 0.0);
    vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(dot(n, h), 0.0), 28.0);
    float rim = pow(1.0 - max(n.z, 0.0), 2.5);
    vec3 col = u_color * (0.3 + 0.85 * lam) + u_light * (spec * 1.2 + rim * 0.45);
    gl_FragColor = vec4(col, alpha);
  }
`;
