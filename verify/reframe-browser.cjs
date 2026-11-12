// Optional Playwright browser smoke test against a running integration preview.
// Use one viewport per invocation; see verify/README.md for configuration.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const width = Number(process.argv[2] || 1440);
  const height = width === 1440 ? 900 : width === 768 ? 1024 : width === 320 ? 740 : 844;
  const touch = width < 1000;
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [],
  });
  const context = await browser.newContext({
    viewport: { width, height }, hasTouch: touch, isMobile: width < 700,
    reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const errors = [], failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';
  await page.goto(base + '/');
  await page.locator('.stage canvas').waitFor();
  await page.waitForTimeout(2000);
  assert.equal(await page.locator('.a24-nav').count(), 1);
  assert.equal(await page.locator('.field-tools').count(), 0);
  assert.equal(await page.locator('[data-logo] svg').count(), 2);
  assert.equal(await page.locator('.hud__nav button').count(), 3);
  assert.equal(await page.evaluate(() => document.body.scrollWidth), width);
  const press = locator => touch ? locator.tap() : locator.click();
  const fly = async name => { await press(page.locator(`[data-fly="${name}"]`)); await page.waitForTimeout(300); };
  const coords = () => page.locator('[data-x]').textContent();
  await fly('services');
  for (const [index, title, url] of [
    [1, 'SmilePP', 'https://smilepp.pictures/'],
    [2, 'Ruby Law', 'https://rubbylaaw.xyz/'],
    [3, '英華小學家長教師會 · YWPS PTA', 'https://ywpspta.com/'],
  ]) {
    await fly('work');
    assert.equal(await page.locator('[data-work-count]').textContent(), `0${index}/03`);
    const targetLabel = index === 3 ? 'YWPS PTA' : title;
    if (!touch) await page.waitForFunction(label => document.querySelector('[data-aim]').textContent.includes(label), targetLabel, { timeout: 15000 });
    else await page.waitForTimeout(1000); // touch has no keyboard aim label; allow a field frame
    if (touch) await page.touchscreen.tap(width / 2, height / 2);
    else await page.keyboard.press('Enter');
    await page.locator('#sheet-title').waitFor({ state: 'visible' });
    assert.equal((await page.locator('#sheet-title').innerText()).replace(/\s+/g, ' ').trim(), title);
    assert.equal(await page.locator('.sheet__cta').getAttribute('href'), url);
    await press(page.locator('.sheet__close'));
  }
  await fly('contact');
  await page.locator('#sheet-title').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#sheet-title').textContent(), 'Ready for a new frame?');
  await press(page.locator('[data-copy]'));
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'info@reframehk.com');
  await page.keyboard.press('Escape');
  await press(page.locator('[data-sound]'));
  assert.equal(await page.locator('[data-sound]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => localStorage.getItem('reframehk:sound')), '1');
  await press(page.locator('[data-sound]'));
  assert.equal(await page.locator('[data-sound]').getAttribute('aria-pressed'), 'false');
  await fly('hero');
  const before = await coords();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(previous => document.querySelector('[data-x]').textContent !== previous, before, { timeout: 10000 });
  await fly('hero');
  await page.goto(base + '/projects/nathan-riley');
  await page.locator('.reframe-page').waitFor();
  assert.equal(new URL(page.url()).pathname, '/');
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  console.log(`PASS Reframe + A24 smoke (${width}×${height})`);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
