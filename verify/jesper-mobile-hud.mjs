import assert from 'node:assert/strict';
import { mobileViewsBottom, outsideProfileDisc } from '../src/jesper/components/mobileHudLayout.js';

for (const width of [430, 414, 390, 375, 360, 320]) {
  const root = width / 39;
  const dock = { left: width * 0.16, right: width * 0.84, top: 790 };
  const control = { left: 4 * root, right: 13.5 * root };
  const bottom = mobileViewsBottom(844, root, control, dock);
  assert.ok(844 - bottom + 1.5 * root <= dock.top - 8 + 1e-8, `${width}px dock hit-area clearance`);
  assert.equal(outsideProfileDisc(width / 2, 422, width, 844, root), false, `${width}px disc centre`);
  assert.equal(outsideProfileDisc(width / 2, 422 - 21 * root, width, 844, root), false, `${width}px disc edge`);
  assert.equal(outsideProfileDisc(width / 2, 422 - 21 * root - 1, width, 844, root), true, `${width}px outside disc`);
}
assert.equal(mobileViewsBottom(844, 10, { left: 40, right: 120 }, { left: 200, right: 300, top: 790 }), 25, 'reference position is kept when the dock does not overlap');
console.log('Mobile HUD dock clearance and profile disc: OK');
