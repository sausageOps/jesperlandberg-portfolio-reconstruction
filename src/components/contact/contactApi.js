// Contact submission transport.
//
// STATUS: MOCK — there is no backend in this project yet. Carter's site POSTs
// JSON to /api/contact (a Cloudflare Worker) and reads `{ job }` back; that
// service is not part of this repository. This module preserves the exact
// request/response contract and latency profile so the UI behaves identically,
// while making it obvious nothing is really sent. No emails leave the machine.
//
// To wire a real endpoint later: set CONTACT_API_URL below (or expose it via
// import.meta.env.VITE_CONTACT_API_URL) to your API route that accepts
//   POST application/json { kind, email, body, name, source, signature }
//   → 200 { job?: number|string }   (when `job` is missing, the UI mints a
//   random ticket number exactly like Carter's client does).
// The mock demo switches still work either way: append ?counter=closed to the
// URL to rehearse the failure path, ?counter=offline to rehearse offline.

const REAL_ENDPOINT = import.meta.env.VITE_CONTACT_API_URL || null;

const MOCK_LATENCY_MS = 900;

export async function sendLetter(payload) {
  if (REAL_ENDPOINT) {
    const res = await fetch(REAL_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json().catch(() => ({}));
    return data.job;
  }
  // Mock: same payload shape lands in the console for inspection, latency and
  // response contract mirror a healthy backend. A manual job number mirrors
  // Carter's client-side fallback when the response omits `job`.
  console.info('[contact mock] POST /api/contact payload (nothing was sent):', payload);
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return undefined; // → engine assigns `N° 1xxx` itself, like Carter's fallback
}
