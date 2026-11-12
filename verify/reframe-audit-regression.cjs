// Run one scenario per process, against either site. Playwright is optional.
// PREVIEW_URL points at the target; set REFERENCE=1 for the original site.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const width = Number(process.argv[2] || 390);
  const mode = process.argv[3] || 'fallback';
  const ref = process.env.REFERENCE === '1';
  const base = process.env.PREVIEW_URL || (ref ? 'http://127.0.0.1:3000' : 'http://127.0.0.1:5173');
  const height = width === 1440 ? 900 : width === 768 ? 1024 : width === 320 ? 740 : 844;
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [],
  });
  try {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', javaScriptEnabled: mode !== 'nojs' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (mode === 'fallback') await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return /webgl/.test(type) ? null : getContext.call(this, type, ...args);
      };
    });
    if (mode === 'blocked') await page.route(/\/(?:src\/main\.jsx|main\.js|assets\/index-[^/]+\.js)(?:\?.*)?$/, route => route.abort());
    await page.goto(base + '/');
    const staticIndex = page.locator(ref ? 'main.index' : '#reframe-static-index');
    if (mode === 'nojs') {
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await staticIndex.isVisible(), true);
      assert.deepEqual(await staticIndex.locator('h2').allTextContents(), ['Services', 'Work', 'Contact']);
      const style = await staticIndex.evaluate(el => {
        const i = getComputedStyle(el.querySelector('h1 i'));
        const sup = getComputedStyle(el.querySelector('h1 sup'));
        return { font: i.fontFamily, color: i.color, weight: i.fontWeight, italic: i.fontStyle,
          supFont: sup.fontFamily, supSize: sup.fontSize, supBorder: sup.borderTopWidth };
      });
      assert.match(style.font, /Fraunces/);
      assert.equal(style.color, 'rgb(255, 79, 26)');
      assert.equal(style.weight, '400');
      assert.equal(style.italic, 'italic');
      assert.match(style.supFont, /Space Mono/);
      assert.equal(style.supBorder, '1px');
      assert.ok(parseFloat(style.supSize) < parseFloat(await staticIndex.locator('h1').evaluate(e => getComputedStyle(e).fontSize)) / 2);
      assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight));
      assert.equal(await staticIndex.locator('a').first().evaluate(e => getComputedStyle(e).textDecorationLine), 'underline');
      await page.keyboard.press('End');
      await page.waitForTimeout(800);
      assert.ok(await page.evaluate(() => scrollY > 0));
      console.log('nojs style', JSON.stringify(style));
    } else if (mode === 'blocked') {
      assert.equal(await staticIndex.count(), 1);
      assert.equal(await staticIndex.getAttribute('hidden'), null);
      assert.deepEqual(await staticIndex.locator('h2').allTextContents(), ['Services', 'Work', 'Contact']);
      assert.equal(await staticIndex.locator('a[href="mailto:info@reframehk.com"]').count(), 1);
      // The index is visually clipped as in the original but remains accessible.
      assert.equal(await page.getByRole('main').count(), 1);
    } else if (mode === 'fallback') {
      const root = page.locator(ref ? '#page' : '.reframe-page');
      await page.waitForFunction(selector => document.querySelector(selector)?.classList.contains('is-fallback'), ref ? '#page' : '.reframe-page');
      const index = root.locator('main.index');
      assert.equal(await index.isVisible(), true);
      if (!ref) assert.notEqual(await staticIndex.getAttribute('hidden'), null);
      assert.equal(await page.evaluate(() => document.activeElement === document.body), true);
      const getScroll = () => page.evaluate(isRef => isRef ? scrollY : document.querySelector('.reframe-page').scrollTop, ref);
      const atBottom = () => page.evaluate(isRef => {
        const el = isRef ? document.scrollingElement : document.querySelector('.reframe-page');
        return Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight) <= 2;
      }, ref);
      assert.equal(await getScroll(), 0);
      await page.keyboard.press('PageDown');
      await page.waitForFunction(isRef => (isRef ? scrollY : document.querySelector('.reframe-page').scrollTop) > 0, ref);
      await page.waitForTimeout(500); // let native scroll animation settle
      const afterPage = await getScroll();
      await page.keyboard.press('End');
      await page.waitForFunction(isRef => { const el = isRef ? document.scrollingElement : document.querySelector('.reframe-page'); return Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight) <= 2; }, ref);
      assert.equal(await atBottom(), true);
      await page.waitForTimeout(500);
      await page.keyboard.press('Home');
      await page.waitForFunction(isRef => (isRef ? scrollY : document.querySelector('.reframe-page').scrollTop) === 0, ref);
      if (!ref) {
        await page.mouse.move(width / 3, height / 2);
        await page.mouse.wheel(0, 200);
        await page.waitForFunction(() => document.querySelector('.reframe-page').scrollTop > 0);
      }
      console.log('fallback PageDown', afterPage, 'End reached the bottom, Home returned to top');
    } else if (mode === 'keyboard') {
      await page.locator('.stage canvas').waitFor();
      await page.waitForTimeout(1800);
      if (!ref) {
        assert.notEqual(await staticIndex.getAttribute('hidden'), null);
        assert.equal(await page.getByRole('main').count(), 1);
      }
      const x = page.locator('[data-x]');
      for (const button of await page.locator('.hud--top button').all()) {
        const before = await x.textContent();
        await button.focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(previous => document.querySelector('[data-x]').textContent !== previous, before);
      }
      if (!ref) {
        const before = await x.textContent();
        const routes = page.getByRole('button', { name: 'Routes', exact: true });
        await routes.focus();
        await page.keyboard.press('ArrowDown');
        assert.equal(await routes.getAttribute('aria-expanded'), 'true');
        assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Lab');
        await page.keyboard.press('Escape');
        assert.equal(await routes.getAttribute('aria-expanded'), 'false');
        assert.equal(await x.textContent(), before);
      }
      console.log('arrow panning works with every Reframe HUD button focused');
    } else throw Error(`Unknown mode ${mode}`);
    assert.deepEqual(errors, []);
    console.log(`PASS ${ref ? 'source' : 'target'} ${mode} ${width}×${height}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
