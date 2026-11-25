// Physical Full-index -> project -> close checks on one viewport.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer-core');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';
const width = Number(process.env.TEST_WIDTH || 390);
const slugs = ['nathan-riley', 'casa-di-solare', 'the-lookback', 'book-of-happiness', 'dogelon-mars', 'gil-huybrecht', 'discoveryland', 'griflan'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM_PATH, args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [], headless: true });
  const page = await browser.newPage();
  const failures = [];
  try {
    await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true });
    await page.setRequestInterception(true);
    page.on('request', request => request.url().startsWith(base) || request.url().startsWith('data:') ? request.continue() : request.abort());
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#__nuxt [data-gl="card"]', { timeout: 30000 });
    await sleep(8000);
    for (const slug of slugs) {
      try {
        await page.tap('#__nuxt nav[aria-label="Project views"] a[href="/full"]');
        await page.waitForFunction(() => location.pathname === '/full', { timeout: 10000 });
        await page.waitForSelector(`#__nuxt main a[href="/projects/${slug}"]`);
        await sleep(1500);
        await page.tap(`#__nuxt main a[href="/projects/${slug}"]`);
        await page.waitForFunction(s => location.pathname === `/projects/${s}`, { timeout: 10000 }, slug);
        await page.waitForSelector('#__nuxt [aria-label="Close project"]');
        await sleep(2200);
        assert.equal(await page.evaluate(() => history.state?.jesperFullOrigin), true, 'Full origin stored');
        const hit = await page.$eval('#__nuxt [aria-label="Close project"]', e => { const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
        assert.equal(hit, true, 'close is not obstructed');
        await page.tap('#__nuxt [aria-label="Close project"]');
        await page.waitForFunction(() => location.pathname === '/', { timeout: 10000 });
        await sleep(2400);
        const centered = await page.evaluate(() => [...document.querySelectorAll('#__nuxt [data-gl="card"]')].map(e => { const r = e.getBoundingClientRect(); return { slug: e.dataset.id, distance: Math.abs(r.y + r.height / 2 - innerHeight / 2) }; }).sort((a, b) => a.distance - b.distance)[0]?.slug);
        assert.equal(centered, slug, 'closed project restored as centered home card');
        // The restored card is now in the viewport, so exercise the actual
        // Featured hit target as well as the Full title link.
        await page.tap(`#__nuxt [data-gl="card"][data-id="${slug}"]`);
        await page.waitForFunction(s => location.pathname === `/projects/${s}`, { timeout: 10000 }, slug);
        await sleep(1800);
        assert.notEqual(await page.evaluate(() => history.state?.jesperFullOrigin), true, 'Featured origin stored');
        await page.tap('#__nuxt [aria-label="Close project"]');
        await page.waitForFunction(() => location.pathname === '/', { timeout: 10000 });
        await sleep(2000);
        const featuredCentered = await page.evaluate(() => [...document.querySelectorAll('#__nuxt [data-gl="card"]')].map(e => { const r = e.getBoundingClientRect(); return { slug: e.dataset.id, distance: Math.abs(r.y + r.height / 2 - innerHeight / 2) }; }).sort((a, b) => a.distance - b.distance)[0]?.slug);
        assert.equal(featuredCentered, slug, 'Featured-origin project restores centered home card');
        console.log(`${width} ${slug}: PASS (Full and Featured)`);
      } catch (e) {
        failures.push({ slug, message: e.message });
        console.log(`${width} ${slug}: FAIL ${e.message}`);
        await page.goto(base, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#__nuxt [data-gl="card"]', { timeout: 30000 });
        await sleep(7000);
      }
    }
  } finally { await browser.close(); }
  if (failures.length) { console.log(JSON.stringify(failures)); process.exitCode = 1; }
})().catch(e => { console.error(e); process.exitCode = 1; });
