import assert from 'node:assert/strict';
import Experience from '../src/jesper/webgl/Experience.js';
import { featured } from '../src/jesper/data/projects.js';

// Exercise the real layout function without creating a renderer or touching
// the application. Reference captures use a fixed 844px-tall phone viewport.
function layout(width, { desktop = false, previousSlug = null } = {}) {
  const experience = Object.create(Experience.prototype);
  Object.assign(experience, {
    featured,
    desktop,
    vw: width,
    vh: 844,
    root: width / 39,
    homeBase: [],
    homeOffset: { current: 0, target: 0, max: 0 },
    homeLayoutReady: false,
    activeHomeSlug: null,
    getNearestHomeSlug: () => previousSlug,
    refreshHomeText: () => {},
    updateHome: () => {},
  });
  experience.layoutHome(true);
  return experience;
}

for (const [width, selected] of [
  [430, 'casa-di-solare'], [414, 'casa-di-solare'], [390, 'casa-di-solare'],
  [375, 'the-lookback'], [360, 'the-lookback'], [320, 'the-lookback'],
]) {
  const home = layout(width);
  const selectedIndex = featured.findIndex((project) => project.slug === selected);
  assert.equal(home.homeOffset.current, home.homeBase[selectedIndex], `${width}px initial centre`);
  assert.equal(home.mobileBootSlugs[1], selected, `${width}px middle boot target`);
  assert.ok(Math.abs(home.homeMetrics[0].width - (width - 4 * home.root)) < 1e-8, `${width}px card width`);
  assert.equal(home.homeMetrics.length, 8, `${width}px featured card count`);
}

const desktop = layout(1000, { desktop: true });
assert.equal(desktop.homeOffset.current, desktop.homeBase[1], 'desktop default remains the second featured card');
assert.equal(desktop.mobileBootSlugs, undefined, 'desktop does not use phone boot selection');

const home = layout(390);
home.getNearestHomeSlug = () => 'dogelon-mars';
home.vw = 375;
home.root = 375 / 39;
home.layoutHome(true);
assert.equal(home.homeOffset.current, home.homeBase[4], 'resize retains the nearest current card');

console.log('Mobile homepage geometry and boot selection: OK');
