// Optional real-browser Stage 5 regression. Start the preview and configure
// PUPPETEER_PATH, CHROMIUM_PATH and BROWSER_ARGS for an installed Chromium.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer-core');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const { featured } = await import('../src/jesper/data/projects.js');
  const browser = await puppeteer.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [], headless: true,
  });
  try {
    for (let i = 0; i < featured.length; i += 1) {
      const item = featured[i];
      const next = featured[(i + 1) % featured.length];
      const page = await browser.newPage();
      const errors = [], failures = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      await page.setRequestInterception(true);
      page.on('request', (r) => r.url().startsWith(base) || r.url().startsWith('data:') ? r.continue() : r.abort());
      const path = `/projects/${item.slug}`;
      await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.project-close-portal', { timeout: 30000 });
      await page.waitForSelector('.jesper-loader-scope', { hidden: true, timeout: 30000 });
      assert.equal(new URL(page.url()).pathname, path);
      assert.equal(await page.$eval('.project-copy h1', (e) => e.textContent), item.title);
      assert.equal(await page.title(), item.title);
      assert.equal(await page.$$eval('.project-media', (nodes) => nodes.length), item.images.length);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.project-close-portal', { timeout: 30000 });
      await page.waitForSelector('.jesper-loader-scope', { hidden: true, timeout: 30000 });
      assert.equal(new URL(page.url()).pathname, path);
      await page.evaluate(() => document.body.focus());
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction((title) => document.querySelector('.project-copy h1')?.textContent === title, {}, next.title);
      assert.equal(new URL(page.url()).pathname, `/projects/${next.slug}`);
      await page.goBack();
      await page.waitForFunction((title) => document.querySelector('.project-copy h1')?.textContent === title, {}, item.title);
      await page.goForward();
      await page.waitForFunction((title) => document.querySelector('.project-copy h1')?.textContent === title, {}, next.title);
      await page.goBack();
      await page.waitForFunction((title) => document.querySelector('.project-copy h1')?.textContent === title, {}, item.title);
      await page.keyboard.press('ArrowLeft');
      const previous = featured[(i + featured.length - 1) % featured.length];
      await page.waitForFunction((title) => document.querySelector('.project-copy h1')?.textContent === title, {}, previous.title);
      assert.equal(new URL(page.url()).pathname, `/projects/${previous.slug}`);
      await page.goBack();
      await page.waitForFunction((title) => document.querySelector('.project-copy h1')?.textContent === title, {}, item.title);
      // Wait for the dock's own reveal and the close target's collision
      // adjustment to settle before sending a real touch to its centre.
      await page.waitForFunction(() => {
        const close = document.querySelector('.project-close-portal');
        const dock = document.querySelector('.a24-nav');
        if (!close || dock?.dataset.motion !== 'idle') return false;
        const r = close.getBoundingClientRect();
        return Boolean(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('.project-close-portal'));
      }, { timeout: 10000 });
      await pause(300);
      await page.tap('.project-close-portal');
      await page.waitForSelector('.home', { timeout: 10000 });
      assert.equal(new URL(page.url()).pathname, '/');
      await page.goBack();
      await page.waitForFunction((title) => document.querySelector('.project-copy h1')?.textContent === title, {}, item.title);
      assert.equal(new URL(page.url()).pathname, path);
      await page.goForward();
      await page.waitForSelector('.home');
      assert.deepEqual(errors, []);
      assert.deepEqual(failures, []);
      console.log(`${item.slug}: fresh URL, refresh, next, back/forward and close OK`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
