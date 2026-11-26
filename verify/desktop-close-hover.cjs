// Optional targeted browser regression against a running preview. As with the
// other browser checks, supply PUPPETEER_PATH, CHROMIUM_PATH and BROWSER_ARGS.
// Headless Chromium can report no fine/hover pointer; in that case we force
// only the master's JavaScript mouse capability. Native CSS media queries are
// not emulated, so this is not a substitute for testing a physical desktop.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer-core');

const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';
const project = `${base}/projects/casa-di-solare`;
const closeSelector = '#__nuxt a[aria-label="Close project"]';
const wait = { timeout: 30000, polling: 100 };

async function openProject(page, width, height, { touch = false } = {}) {
  await page.setViewport({ width, height, deviceScaleFactor: 1, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  await page.goto(project, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction((selector) => {
    const folio = window.__masterSession?.nuxt?.$folio;
    return folio?.pills?.some((pill) => pill.el === document.querySelector(selector));
  }, wait, closeSelector);
  const nativeFineHover = await page.evaluate((selector, simulateMouse) => {
    const nuxt = window.__masterSession.nuxt;
    const native = matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (simulateMouse) nuxt.$resize.mouse = true;
    window.__closeRegressionPill = nuxt.$folio.pills.find((pill) => pill.el === document.querySelector(selector));
    return native;
  }, closeSelector, !touch);
  await page.waitForFunction(() => {
    const pill = window.__closeRegressionPill;
    return pill?.enter >= 0.999 && pill.mesh.material.uniforms.u_alpha.value >= 0.999;
  }, wait);
  if (!touch) await page.mouse.move(5, 5);
  return nativeFineHover;
}

async function snapshot(page) {
  return page.evaluate((selector) => {
    const element = document.querySelector(selector);
    const style = getComputedStyle(element);
    const before = getComputedStyle(element, '::before');
    const after = getComputedStyle(element, '::after');
    const rect = element.getBoundingClientRect();
    const pill = window.__closeRegressionPill;
    const uniforms = pill.mesh.material.uniforms;
    return {
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      hover: pill.hover,
      disc: uniforms.u_pillA.value,
      ring: uniforms.u_ring.value,
      restColor: `#${uniforms.u_rest.value.getHexString()}`,
      inkColor: `#${uniforms.u_iconC.value.getHexString()}`,
      cross: uniforms.u_cross.value,
      alpha: uniforms.u_alpha.value,
      backgroundColor: style.backgroundColor,
      color: style.color,
      backgroundClip: style.backgroundClip,
      hitTarget: element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)),
      cssHover: element.matches(':hover'),
      cssActive: element.matches(':active'),
      focusVisible: element.matches(':focus-visible'),
      visibility: style.visibility,
      boxShadow: style.boxShadow,
      filter: style.filter,
      beforeShadow: before.boxShadow,
      afterShadow: after.boxShadow,
      outline: style.outline,
      outlineOffset: style.outlineOffset,
    };
  }, closeSelector);
}

function assertNoDomShadow(state) {
  assert.equal(state.boxShadow, 'none');
  assert.equal(state.filter, 'none');
  assert.equal(state.beforeShadow, 'none');
  assert.equal(state.afterShadow, 'none');
}

async function hoverClose(page, rect) {
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.waitForFunction(() => {
    const pill = window.__closeRegressionPill;
    return pill.hover >= 0.99999 && pill.swapIn >= 0.99999;
  }, wait);
}

async function leaveClose(page) {
  await page.mouse.move(5, 5);
  await page.waitForFunction(() => window.__closeRegressionPill.hover <= 0.00001, wait);
}

async function focusCloseWithTab(page) {
  for (let i = 0; i < 14; i += 1) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((selector) => document.activeElement === document.querySelector(selector), closeSelector)) return;
  }
  throw new Error('The close link was not reachable with Tab');
}

// Record the actual outgoing WebGL pill, not a newly mounted home-page button.
// The animation alpha may be at a different progress on each viewport.
async function startClosingTrace(page) {
  await page.evaluate(() => {
    const folio = window.__masterSession.nuxt.$folio;
    const pill = window.__closeRegressionPill;
    const uniforms = pill.mesh.material.uniforms;
    window.__closeClosingTrace = [];
    window.__closeClosingTimer = setInterval(() => {
      if (!folio.leaving.includes(pill) || !folio.core.scene.children.includes(pill.mesh) || uniforms.u_alpha.value <= 0) return;
      window.__closeClosingTrace.push({
        hover: pill.hover,
        disc: uniforms.u_pillA.value,
        ring: uniforms.u_ring.value,
        cross: uniforms.u_cross.value,
        alpha: uniforms.u_alpha.value,
        restColor: `#${uniforms.u_rest.value.getHexString()}`,
        inkColor: `#${uniforms.u_iconC.value.getHexString()}`,
      });
    }, 20);
  });
}

async function closingState(page) {
  await page.waitForFunction(() => window.__closeClosingTrace.length > 0, wait);
  return page.evaluate(() => {
    clearInterval(window.__closeClosingTimer);
    return window.__closeClosingTrace[0];
  });
}

(async () => {
  const browser = await puppeteer.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [],
    headless: true,
  });
  const errors = [];
  async function newPage() {
    const page = await browser.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', (request) => (
      request.url().startsWith(base) || request.url().startsWith('data:') || request.url().startsWith('blob:')
        ? request.continue() : request.abort()
    ));
    return page;
  }

  try {
    const desktop = await newPage();
    const nativeFineHover = await openProject(desktop, 1440, 900);
    const rest = await snapshot(desktop);
    assert.equal(rest.restColor, '#000000', 'desktop uses the shared black resting fill');
    assert.equal(rest.inkColor, '#ffffff', 'desktop uses the shared white cross ink');
    assert.equal(rest.backgroundColor, 'rgb(0, 0, 0)');
    assert.equal(rest.color, 'rgb(255, 255, 255)');
    assert.equal(rest.backgroundClip, 'text', 'the focusable DOM target does not paint over the canvas');
    assert.equal(rest.hitTarget, true, 'the close hit target remains clickable');
    assertNoDomShadow(rest);
    await hoverClose(desktop, rest.rect);
    const hover = await snapshot(desktop);
    assert.equal(hover.restColor, '#000000', 'desktop hover ring uses black ink');
    assert.equal(hover.ring, 1);
    assert.deepEqual(hover.rect, rest.rect);
    assertNoDomShadow(hover);
    await leaveClose(desktop);
    const leave = await snapshot(desktop);
    assert.equal(leave.restColor, rest.restColor, 'leaving restores the original resting fill');
    assert.deepEqual(leave.rect, rest.rect);
    await hoverClose(desktop, rest.rect);
    await desktop.mouse.down();
    const down = await snapshot(desktop);
    assert.equal(down.cssActive, true);
    assert.equal(down.focusVisible, false, 'pointer press does not draw the keyboard focus outline');
    assert.equal(down.restColor, '#000000');
    assert.deepEqual(down.rect, rest.rect);
    assertNoDomShadow(down);
    await startClosingTrace(desktop);
    await desktop.mouse.up();
    await desktop.waitForFunction(() => location.pathname === '/', wait);
    const closing = await closingState(desktop);
    for (const property of ['restColor', 'inkColor', 'cross', 'ring', 'hover', 'disc']) {
      assert.equal(closing[property], down[property], `desktop closing ${property}`);
    }
    assert.ok(closing.alpha > 0 && closing.alpha <= 1, 'outgoing desktop pill remains visible');
    await desktop.close();

    const keyboard = await newPage();
    for (const key of ['Escape', 'Enter']) {
      await openProject(keyboard, 1440, 900);
      await focusCloseWithTab(keyboard);
      const focus = await snapshot(keyboard);
      assert.equal(focus.focusVisible, true);
      assert.equal(focus.outline, 'rgb(255, 255, 255) solid 2px');
      assert.equal(focus.outlineOffset, '-4px');
      assertNoDomShadow(focus);
      await keyboard.keyboard.press(key);
      await keyboard.waitForFunction(() => location.pathname === '/', wait);
    }
    await keyboard.close();

    for (const [width, height] of [[1024, 768], [768, 1024]]) {
      const tablet = await newPage();
      await openProject(tablet, width, height);
      const tabletRest = await snapshot(tablet);
      assert.equal(tabletRest.visibility, 'hidden');
      for (const property of ['restColor', 'inkColor', 'cross', 'ring', 'alpha', 'hover', 'disc']) {
        assert.equal(tabletRest[property], rest[property], `tablet and desktop rest ${property}`);
      }
      assert.equal(tabletRest.hitTarget, true);
      await hoverClose(tablet, tabletRest.rect);
      const tabletHover = await snapshot(tablet);
      for (const property of ['restColor', 'inkColor', 'cross', 'ring', 'alpha', 'hover', 'disc']) {
        assert.equal(tabletHover[property], hover[property], `tablet and desktop hover ${property}`);
      }
      assert.deepEqual(tabletHover.rect, tabletRest.rect);
      assertNoDomShadow(tabletHover);
      await leaveClose(tablet);
      assert.equal((await snapshot(tablet)).restColor, tabletRest.restColor);
      await hoverClose(tablet, tabletRest.rect);
      await tablet.mouse.down();
      const tabletDown = await snapshot(tablet);
      assert.equal(tabletDown.cssActive, true);
      for (const property of ['restColor', 'inkColor', 'cross', 'ring', 'alpha', 'hover', 'disc']) {
        assert.equal(tabletDown[property], down[property], `tablet and desktop active ${property}`);
      }
      await startClosingTrace(tablet);
      await tablet.mouse.up();
      await tablet.waitForFunction(() => location.pathname === '/', wait);
      const tabletClosing = await closingState(tablet);
      for (const property of ['restColor', 'inkColor', 'cross', 'ring', 'hover', 'disc']) {
        assert.equal(tabletClosing[property], closing[property], `tablet and desktop closing ${property}`);
      }
      await tablet.close();
    }

    const mobile = await newPage();
    await openProject(mobile, 390, 844, { touch: true });
    // The mobile panel can still be moving after the pill has entered.
    await new Promise((resolve) => setTimeout(resolve, 4500));
    const mobileRest = await snapshot(mobile);
    for (const property of ['restColor', 'inkColor', 'cross', 'ring', 'alpha', 'hover', 'disc']) {
      assert.equal(mobileRest[property], rest[property], `mobile and desktop rest ${property}`);
    }
    assert.equal(mobileRest.hitTarget, true);
    await startClosingTrace(mobile);
    await mobile.touchscreen.tap(mobileRest.rect.x + mobileRest.rect.width / 2, mobileRest.rect.y + mobileRest.rect.height / 2);
    await mobile.waitForFunction(() => location.pathname === '/', wait);
    const mobileClosing = await closingState(mobile);
    for (const property of ['restColor', 'inkColor', 'cross', 'ring']) {
      assert.equal(mobileClosing[property], closing[property], `mobile and desktop closing ${property}`);
    }
    for (const property of ['hover', 'disc']) {
      assert.equal(mobileClosing[property], mobileRest[property], `touch closing retains unhovered ${property}`);
    }
    await mobile.close();
    assert.deepEqual(errors, [], 'no uncaught page errors');
    console.log(`Desktop rest, hover, active, closing, keyboard focus, Escape and Enter; tablet parity; and mobile rest/touch-closing checks passed. Native fine-hover media: ${nativeFineHover}; JavaScript mouse capability forced for desktop/tablet hover.`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
