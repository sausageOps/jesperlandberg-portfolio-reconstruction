// Functional mobile fallback, history and context-loss regression.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer-core');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';
const width = Number(process.env.TEST_WIDTH || 390);
const slugs = ['nathan-riley', 'casa-di-solare', 'the-lookback', 'book-of-happiness', 'dogelon-mars', 'gil-huybrecht', 'discoveryland', 'griflan'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM_PATH, args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [], headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === 'webgl2' ? null : original.call(this, type, ...args); };
    });
    await page.setRequestInterception(true);
    page.on('request', request => request.url().startsWith(base) || request.url().startsWith('data:') ? request.continue() : request.abort());
    for (const slug of slugs) {
      await page.goto(`${base}/projects/${slug}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.master-fallback__project h1', { timeout: 15000 });
      const details = await page.evaluate(() => ({ title: document.querySelector('.master-fallback__project h1')?.textContent, description: document.querySelector('.master-fallback__description')?.textContent, media: document.querySelectorAll('.master-fallback__media figure').length, overflow: document.documentElement.scrollWidth > innerWidth, hasStatus: !!document.querySelector('.master-fallback [role="status"]'), canvas: document.querySelectorAll('#__nuxt canvas').length }));
      assert.ok(details.title && details.description && details.media > 0, `${slug}: actual project content`);
      assert.equal(details.overflow, false); assert.equal(details.hasStatus, true); assert.equal(details.canvas, 0);
      const closeHit = await page.$eval('.master-fallback__close', e => { const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
      assert.equal(closeHit, true, `${slug}: close reachable`);
      console.log(`${width} ${slug}: fallback detail PASS`);
    }
    await page.goto(`${base}/full`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.master-fallback__index');
    assert.ok((await page.$$('.master-fallback__index li')).length >= 23);
    await page.tap('.master-fallback__index a[href="/projects/the-lookback"]');
    await page.waitForSelector('.master-fallback__project h1');
    assert.equal(await page.evaluate(() => location.pathname), '/projects/the-lookback');
    assert.equal(await page.evaluate(() => history.state.jesperFullOrigin), true);
    await page.evaluate(() => { document.querySelector('.master-fallback').scrollTop = 100000; });
    await page.tap('.master-fallback__paging a[href="/projects/book-of-happiness"]');
    await page.waitForFunction(() => location.pathname === '/projects/book-of-happiness');
    assert.equal(await page.evaluate(() => history.state.jesperFullOrigin), true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.master-fallback__project h1');
    assert.equal(await page.$eval('.master-fallback__project h1', e => e.textContent), 'Book of Happiness');
    await page.tap('.master-fallback__close');
    await page.waitForSelector('.master-fallback__featured');
    assert.equal(await page.evaluate(() => location.pathname), '/');
    await page.goBack();
    await page.waitForFunction(() => location.pathname === '/projects/book-of-happiness');
    await page.waitForFunction(() => document.querySelector('.master-fallback__project h1')?.textContent === 'Book of Happiness');
    await page.goForward();
    await page.waitForSelector('.master-fallback__featured');
    await page.waitForFunction(() => document.querySelector('.a24-nav')?.dataset.motion === 'idle', { timeout: 15000 });
    await page.tap('.a24-nav__toggle');
    assert.equal(await page.$eval('.a24-nav', e => e.dataset.open), 'true');
    await page.waitForSelector('.a24-nav__dropdown[data-open="true"]');
    assert.deepEqual(errors, []);
    console.log(`${width}: Full → project → next → reload → Close → Back/Forward, A24 menu PASS`);
    await sleep(100);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
