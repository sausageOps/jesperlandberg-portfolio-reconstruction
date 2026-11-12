// Records the LIVE reference site's preloader reel animation:
//   - per-item opacity vs vertical position, sampled every animation frame
//   - timestamped 2x crops of the reel band
// Analysis helper only; not shipped to the app.

import puppeteer from 'puppeteer';
import fs from 'fs';

const OUT = 'out';
const TARGET = process.env.TARGET || 'https://gif.garajedeideas.com/';

const RECORDER = `
window.__reel = [];
window.__css = null;
const t0 = performance.now();
function rec(){
  try{
    const list = document.querySelector('[data-slot-list]');
    const slot = document.querySelector('[data-slot]');
    if (list && slot) {
      const st = slot.getBoundingClientRect().top;
      const cs = getComputedStyle(list);
      const items = [...list.children].map(function(it){
        const r = it.getBoundingClientRect();
        const c = getComputedStyle(it);
        return { t: it.textContent, y: +(r.top - st).toFixed(1), o: +c.opacity };
      }).filter(function(v){ return v.y > -160 && v.y < 240; });
      window.__reel.push({ ts: Math.round(performance.now()-t0), transform: cs.transform, items: items });
      if (!window.__css) {
        const mask = document.querySelector('.mask-marquee');
        const marq = document.querySelector('.bottom-marquee');
        const slotCs = getComputedStyle(slot);
        const items0 = list.children[0];
        window.__css = {
          maskBg: mask ? getComputedStyle(mask).backgroundImage : null,
          maskInset: mask ? getComputedStyle(mask).inset : null,
          maskZ: mask ? getComputedStyle(mask).zIndex : null,
          maskHeight: mask ? getComputedStyle(mask).height : null,
          marqueeFont: marq ? getComputedStyle(marq).fontFamily : null,
          marqueeSize: marq ? getComputedStyle(marq).fontSize : null,
          marqueeWeight: marq ? getComputedStyle(marq).fontWeight : null,
          marqueeTransform: marq ? getComputedStyle(marq).transform : null,
          slotH: slot.clientHeight,
          slotOverflow: slotCs.overflow,
          itemH: items0 ? items0.getBoundingClientRect().height : null,
          listH: list.getBoundingClientRect().height,
          itemCount: list.children.length
        };
      }
    }
  }catch(e){}
  if (performance.now()-t0 < 7000) requestAnimationFrame(rec);
}
requestAnimationFrame(rec);
`;

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader',
         '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required',
         '--hide-scrollbars', '--window-size=1440,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.evaluateOnNewDocument(RECORDER);

await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 90000 });

for (let i = 0; i < 14; i++) {
  await new Promise(function(r){ setTimeout(r, i === 0 ? 350 : 300); });
  try {
    const clip = await page.evaluate(function(){
      const m = document.querySelector('.bottom-marquee');
      if (!m) return null;
      const r = m.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return null;
      return { x: Math.round(r.x) - 6, y: Math.round(r.y) - 6,
               width: Math.round(r.width) + 12, height: Math.round(r.height) + 12 };
    });
    if (clip) await page.screenshot({ path: OUT + '/frame-' + String(i).padStart(2, '0') + '.png', clip: clip });
  } catch (e) { /* preloader may already be gone */ }
}

const reel = await page.evaluate(function(){ return window.__reel || []; });
const css = await page.evaluate(function(){ return window.__css || null; });

fs.writeFileSync(OUT + '/reel.json', JSON.stringify({ target: TARGET, css: css, samples: reel }, null, 1));

await browser.close();
console.log('samples:', reel.length);
console.log('css:', JSON.stringify(css));
