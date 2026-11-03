/**
 * Decides whether the 3D experience is safe to start.
 *
 * Creating a WebGL context is synchronous, and on a machine whose GPU is blocklisted
 * (SwiftShader/llvmpipe, a VM, a remote desktop) that single call can block the main
 * thread for tens of seconds - the page is painted black and nothing can run until it
 * returns, which reads as a broken site.
 *
 * So the probe runs in a worker against an OffscreenCanvas: the driver work happens off
 * the main thread and the page stays responsive. Only a renderer string that positively
 * identifies hardware acceleration switches the 3D path on; anything else - software,
 * blocked, unknown, too slow to answer - uses the design's own DOM experience, which
 * needs no GL at all and paints at once.
 */

const HARDWARE = /angle \((nvidia|amd|intel|apple|qualcomm|adreno|mali|powervr|imagination)/i;

const WORKER_SOURCE = `
  self.onmessage = function () {
    var out = { ok: false, renderer: '' };
    try {
      var gl = new OffscreenCanvas(1, 1).getContext('webgl2');
      if (gl) {
        var info = gl.getExtension('WEBGL_debug_renderer_info');
        out.renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
        out.ok = true;
      }
    } catch (error) { /* treated as unsupported */ }
    self.postMessage(out);
  };
`;

export default function probeHardwareWebGL(timeoutMs = 2500) {
  return new Promise((resolve) => {
    let settled = false;
    let worker = null;
    let url = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try { worker?.terminate(); } catch (error) { /* ignore */ }
      if (url) URL.revokeObjectURL(url);
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(false), timeoutMs);

    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      finish(false);
      return;
    }

    try {
      url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = (event) => {
        const data = event.data || {};
        finish(Boolean(data.ok) && HARDWARE.test(String(data.renderer)));
      };
      worker.onerror = () => finish(false);
      worker.postMessage('probe');
    } catch (error) {
      finish(false);
    }
  });
}
