// Browser smoke matrix for the transplanted master. Requires a running preview.
// Example: PUPPETEER_PATH=/path/to/puppeteer-core CHROMIUM_PATH=/path/to/chromium node verify/master-mobile-matrix.cjs
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer-core');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';
const widths = [320, 360, 375, 390, 414, 430];
const projects = [
  ['nathan-riley', 'Nathan Riley', 4], ['casa-di-solare', 'Casa Di Solare', 3],
  ['the-lookback', 'The Lookback', 4], ['book-of-happiness', 'Book of Happiness', 4],
  ['dogelon-mars', 'Dogelon Mars', 4], ['gil-huybrecht', 'Gil Huybrecht', 3],
  ['discoveryland', 'Discoveryland', 3], ['griflan', 'Griflan', 3],
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM_PATH, args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [], headless: true });
  const results = [];
  try {
    for (const width of widths) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.setViewport({ width, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      await page.setRequestInterception(true);
      page.on('request', request => request.url().startsWith(base) || request.url().startsWith('data:') ? request.continue() : request.abort());
      for (const [slug, title, count] of projects) {
        try {
          await page.goto(`${base}/projects/${slug}`, { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(expected => document.querySelector('#__nuxt [data-gl="sheet"] h1')?.textContent === expected, { timeout: 20000 }, title);
          await page.waitForSelector('#__nuxt canvas', { timeout: 20000 });
          await sleep(1000);
          const actual = await page.evaluate(() => {
            const sheet = document.querySelector('#__nuxt [data-gl="sheet"]');
            const close = sheet.querySelector('[aria-label="Close project"]');
            return { title: sheet.querySelector('h1').textContent, media: sheet.querySelectorAll('[data-gl="simple"]').length,
              previous: !!document.querySelector('#__nuxt [aria-label^="Previous project:"]'), next: !!document.querySelector('#__nuxt [aria-label^="Next project:"]'),
              overflow: document.documentElement.scrollWidth > innerWidth, canvas: document.querySelectorAll('canvas').length,
              old: !!document.querySelector('.jesper-scope'), close: !!close, a24: !!document.querySelector('.a24-nav') };
          });
          assert.equal(actual.title, title); assert.equal(actual.media, count); assert.equal(actual.previous, true); assert.equal(actual.next, true);
          assert.equal(actual.overflow, false); assert.equal(actual.canvas, 1); assert.equal(actual.old, false); assert.equal(actual.close, true); assert.equal(actual.a24, true);
          results.push({ width, slug, status: 'PASS' });
        } catch (e) { results.push({ width, slug, status: 'FAIL', error: e.message }); }
      }
      if (errors.length) console.log(`PAGE ERRORS ${width}: ${JSON.stringify(errors)}`);
      await page.close();
      console.log(`${width}: ${results.filter(x => x.width === width && x.status === 'PASS').length}/8 direct-project checks passed`);
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify(results, null, 2));
  if (results.some(x => x.status !== 'PASS')) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
