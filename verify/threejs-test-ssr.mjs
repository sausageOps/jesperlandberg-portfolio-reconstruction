/**
 * Phase 5G SSR route dump (scratch, not shipped).
 *
 * Renders Carter's Lab detail page for all nine slugs with react-dom/server and
 * prints one JSON line of facts per route. Run it against the working tree and
 * against a clean `git archive` of the base commit and diff the output: that is
 * the evidence that the eight other detail routes are byte-identical and that
 * only `threejs-test` gains anything.
 *
 *   node verify/threejs-test-ssr.mjs > /tmp/after.json
 */
import { createServer } from 'vite';
import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });

const { default: LabDetailPage } = await server.ssrLoadModule('/src/carter/pages/lab/LabDetailPage.jsx');
const { LAB_ITEMS } = await server.ssrLoadModule('/src/carter/data/lab.js');
const { resolveCarterPage } = await server.ssrLoadModule('/src/carter/routes.js');

const out = {};
for (const item of LAB_ITEMS) {
  const slug = item.slug;
  const markup = renderToStaticMarkup(createElement(LabDetailPage, { slug }));
  const page = resolveCarterPage(`/routes/lab/${slug}`);
  out[slug] = {
    hash: createHash('sha256').update(markup).digest('hex').slice(0, 16),
    routeKey: page?.key ?? null,
    length: markup.length,
    // engine-owned nodes (all should be 0: every stage renders null server-side)
    pu: (markup.match(/class="pu[" ]/g) || []).length,
    puCanvas: (markup.match(/pu__canvas/g) || []).length,
    dial: (markup.match(/class="dial[" ]/g) || []).length,
    rg: (markup.match(/class="rg[" ]/g) || []).length,
    pd: (markup.match(/class="pd[" ]/g) || []).length,
    heart: (markup.match(/class="heart[" ]/g) || []).length,
    tj: (markup.match(/class="tj[" ]/g) || []).length,
    tjCanvas: (markup.match(/tj__/g) || []).length,
    empty: markup.includes('labd__empty'),
    stageLive: markup.includes('data-stage-live'),
    stageLoading: markup.includes('data-stage-loading'),
    dataExperiment: /data-experiment="([^"]+)"/.exec(markup)?.[1] ?? null,
    dataPosition: /data-position="([^"]+)"/.exec(markup)?.[1] ?? null,
    prevHref: /data-prev-href="([^"]+)"/.exec(markup)?.[1] ?? null,
    nextHref: /data-next-href="([^"]+)"/.exec(markup)?.[1] ?? null,
  };
}

console.log(JSON.stringify(out, null, 1));
await server.close();
