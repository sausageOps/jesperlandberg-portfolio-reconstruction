// Optional real-browser regression against a running preview. Supply
// PUPPETEER_PATH, CHROMIUM_PATH and BROWSER_ARGS for a local Chromium install.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer-core');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    const localFailures = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.url().startsWith(base) && response.status() >= 400) localFailures.push(`${response.status()} ${response.url()}`);
    });
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    // Playback is stubbed because the source videos are hosted on Mux, which
    // need not be reachable in the test environment. This tests pause/resume
    // decisions, not decoding or the appearance of the media.
    await page.evaluateOnNewDocument(() => {
      HTMLMediaElement.prototype.play = function () { this.dataset.testPlaying = 'yes'; return Promise.resolve(); };
      HTMLMediaElement.prototype.pause = function () { this.dataset.testPlaying = 'no'; };
    });
    await page.setRequestInterception(true);
    page.on('request', (request) => request.url().startsWith(base) || request.url().startsWith('data:') ? request.continue() : request.abort());
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.jesper-mobile-interface[data-ready="true"]', { timeout: 30000 });
    await page.waitForSelector('.jesper-loader-scope', { hidden: true, timeout: 30000 });
    await page.waitForFunction(() => document.querySelectorAll('video[data-test-playing="yes"]').length > 0, { timeout: 10000 });
    await page.tap('.jesper-mobile-views a[href="/full"]');
    await page.waitForSelector('.full-index-gl', { timeout: 30000 });
    assert.equal(await page.$$eval('video[data-test-playing="yes"]', (nodes) => nodes.length), 0, 'invisible home videos pause in Full');
    await sleep(1000);
    await page.tap('.jesper-mobile-top button');
    await page.waitForFunction(() => document.querySelector('.full-index')?.inert);
    await page.focus('.full-index-name');
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('.full-index'))), false, 'hidden index links cannot receive focus');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.full-index')?.inert);
    await page.tap('.full-index-name[href="/projects/the-lookback"]');
    await page.waitForSelector('.project-close-portal');
    assert.equal(new URL(page.url()).pathname, '/projects/the-lookback');
    assert.ok(await page.$('#jesper-content'), 'Full project skip-link target exists');
    await sleep(1000);
    await page.setViewport({ width: 320, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await sleep(1200);
    assert.ok(await page.$eval('.project-close-portal', (close) => {
      const rect = close.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return Boolean(hit?.closest('.project-close-portal'));
    }), 'Full project Close is not blocked by the A24 dock at 320px');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await sleep(500);
    await page.tap('.a24-nav__page[href="/"]');
    await page.waitForSelector('.home', { timeout: 10000 });
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal(await page.$('.project-page'), null, 'A24 Home clears the Full project');
    await page.waitForFunction(() => document.querySelectorAll('video[data-test-playing="yes"]').length > 0, { timeout: 10000 });
    await page.goBack();
    await page.waitForSelector('.project-page');
    assert.equal(new URL(page.url()).pathname, '/projects/the-lookback');
    await page.goForward();
    await page.waitForSelector('.home');
    await page.tap('.jesper-mobile-views a[href="/full"]');
    await page.waitForSelector('.full-index-gl');
    await sleep(800);
    await page.tap('.full-index-name[href="/projects/the-lookback"]');
    await page.waitForSelector('.project-close-portal');
    await page.waitForFunction(() => document.querySelectorAll('video[data-test-playing="yes"]').length > 0, { timeout: 10000 });
    await page.tap('.project-close-portal');
    await page.waitForSelector('.home');
    assert.equal(new URL(page.url()).pathname, '/', 'Full-origin project closes to Featured');
    await page.waitForFunction(() => document.querySelectorAll('video[data-test-playing="yes"]').length > 0, { timeout: 10000 });
    await page.goBack();
    await page.waitForSelector('.project-page');
    assert.equal(new URL(page.url()).pathname, '/projects/the-lookback');
    await page.goBack();
    await page.waitForSelector('.full-index');
    assert.equal(new URL(page.url()).pathname, '/full');
    await page.waitForFunction(() => !document.querySelector('video[data-test-playing="yes"]'), { timeout: 10000 });
    await page.goForward();
    await page.waitForSelector('.project-page');
    await page.goForward();
    await page.waitForSelector('.home');
    assert.equal(new URL(page.url()).pathname, '/');
    // A Full-origin project retains its origin through project-to-project
    // navigation and refresh, but Close must still go to Featured.
    await page.tap('.jesper-mobile-views a[href="/full"]');
    await page.waitForSelector('.full-index-gl');
    await sleep(800);
    await page.tap('.full-index-name[href="/projects/the-lookback"]');
    await page.waitForSelector('.project-page');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.project-copy h1')?.textContent === 'Book of Happiness');
    assert.equal(new URL(page.url()).pathname, '/projects/book-of-happiness');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.jesper-loader-scope', { hidden: true, timeout: 30000 });
    await page.waitForSelector('.project-close-portal');
    await sleep(1000);
    await page.tap('.project-close-portal');
    await page.waitForSelector('.home');
    assert.equal(new URL(page.url()).pathname, '/');
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('.project-copy h1')?.textContent === 'Book of Happiness');
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('.project-copy h1')?.textContent === 'The Lookback');
    await page.goForward();
    await page.waitForFunction(() => document.querySelector('.project-copy h1')?.textContent === 'Book of Happiness');
    await page.goForward();
    await page.waitForSelector('.home');
    assert.equal(new URL(page.url()).pathname, '/');
    assert.deepEqual(errors, []);
    assert.deepEqual(localFailures, []);
    console.log('Mobile Full integration: video pause, skip target, A24 Home and history: OK');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
