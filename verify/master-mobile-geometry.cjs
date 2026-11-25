// Compare captured master and direct-mount target project geometry.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer-core');
const target = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';
const reference = process.env.REFERENCE_URL || 'http://127.0.0.1:5174';
const widths = [320, 360, 375, 390, 414, 430];
const slugs = ['nathan-riley', 'casa-di-solare', 'the-lookback', 'book-of-happiness', 'dogelon-mars', 'gil-huybrecht', 'discoveryland', 'griflan'];
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM_PATH, args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [], headless: true });
  const results = [];
  try {
    for (const width of widths) {
      const pages = await Promise.all([browser.newPage(), browser.newPage()]);
      for (const page of pages) {
        await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
        await page.setRequestInterception(true);
        page.on('request', r => r.url().startsWith(target) || r.url().startsWith(reference) || r.url().startsWith('data:') ? r.continue() : r.abort());
      }
      for (const slug of slugs) {
        try {
          await Promise.all(pages.map((p, i) => p.goto(`${i ? target : reference}/projects/${slug}`, { waitUntil: 'domcontentloaded' })));
          await Promise.all(pages.map(p => p.waitForSelector('[data-gl="sheet"] h1', { timeout: 20000 })));
          await Promise.all(pages.map(p => p.evaluate(() => document.fonts.ready)));
          const measure = p => p.evaluate(() => {
            const sheet = document.querySelector('[data-gl="sheet"]');
            const rect = e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
            return { title: sheet.querySelector('h1').textContent, sheet: rect(sheet), heading: rect(sheet.querySelector('h1')), media: [...sheet.querySelectorAll('[data-gl="simple"]')].map(rect) };
          });
          const [r, t] = await Promise.all(pages.map(measure));
          assert.equal(t.title, r.title); assert.equal(t.media.length, r.media.length);
          const values = x => [x.sheet, x.heading, ...x.media].flat();
          const max = Math.max(...values(t).map((v, i) => Math.abs(v - values(r)[i])));
          assert.ok(max <= .5, `max geometry difference ${max}px`);
          results.push({ width, slug, status: 'PASS', max });
        } catch (error) { results.push({ width, slug, status: 'FAIL', message: error.message }); }
      }
      await Promise.all(pages.map(p => p.close()));
      console.log(`${width}: ${results.filter(x => x.width === width && x.status === 'PASS').length}/8 geometry comparisons passed`);
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify(results, null, 2));
  if (results.some(x => x.status !== 'PASS')) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
