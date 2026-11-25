// Exercise all project paging/vertical scrolling plus representative touch swipes.
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
    await page.setRequestInterception(true);
    page.on('request', request => request.url().startsWith(base) || request.url().startsWith('data:') ? request.continue() : request.abort());
    await page.goto(`${base}/projects/${slugs[0]}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(`#__nuxt [data-gl="sheet"][data-id="${slugs[0]}"]`, { timeout: 30000 });
    await sleep(8000);
    const cdp = await page.createCDPSession();
    const swipe = async (x1, y1, x2, y2) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
      for (let i = 1; i <= 12; i++) { const t = i / 12; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(x1 + (x2 - x1) * t), y: Math.round(y1 + (y2 - y1) * t) }] }); await sleep(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    for (let i = 0; i < slugs.length; i++) {
      const slug = slugs[i], next = slugs[(i + 1) % slugs.length];
      const media = `#__nuxt [data-gl="sheet"][data-id="${slug}"] [data-gl="simple"]`;
      const initial = await page.$eval(media, e => {
        const sheet = e.closest('[data-gl="sheet"]');
        const items = sheet.querySelectorAll('[data-gl="simple"]');
        return { y: e.getBoundingClientRect().y, lastBottom: items[items.length - 1].getBoundingClientRect().bottom, sheetBottom: sheet.getBoundingClientRect().bottom };
      });
      await swipe(Math.round(width * .52), 630, Math.round(width * .52), 300);
      await sleep(650);
      const after = await page.$eval(media, e => e.getBoundingClientRect().y);
      if (initial.lastBottom > initial.sheetBottom - 8) assert.ok(after < initial.y - 20, `${slug} should scroll vertically (${initial.y} -> ${after})`);
      else assert.ok(after <= initial.y + 1, `${slug} fits the panel or moves upward`);
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(s => location.pathname === `/projects/${s}`, { timeout: 10000 }, next);
      await page.waitForSelector(`#__nuxt [data-gl="sheet"][data-id="${next}"]`, { timeout: 10000 });
      await sleep(1450);
      console.log(`${width} ${slug}: vertical scroll and next PASS`);
    }
    for (let i = 0; i < slugs.length; i++) {
      const previous = slugs[(slugs.length - 1 - i + slugs.length) % slugs.length];
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(s => location.pathname === `/projects/${s}`, { timeout: 10000 }, previous);
      await page.waitForSelector(`#__nuxt [data-gl="sheet"][data-id="${previous}"]`, { timeout: 10000 });
      await sleep(1450);
      console.log(`${width} ${previous}: previous PASS`);
    }
    await swipe(width - 50, 400, 40, 400);
    await page.waitForFunction(() => location.pathname === '/projects/casa-di-solare', { timeout: 10000 });
    await sleep(1600);
    await swipe(40, 400, width - 50, 400);
    await page.waitForFunction(() => location.pathname === '/projects/nathan-riley', { timeout: 10000 });
    assert.deepEqual(errors, []);
    console.log(`${width}: horizontal next/previous swipes PASS`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
