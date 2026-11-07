/**
 * Home gallery navigation checks (no browser/WebGL required):
 *   node verify/home-gallery-verify.mjs
 *
 * These exercise the input/physics module that feeds Experience.updateHome().
 * Browser interaction and shader-pipeline checks are reported separately.
 */
import assert from 'node:assert/strict';
import {
  DragVelocityTracker,
  PanelNavigation,
  WHEEL_QUIET_MS,
  centeredWrap,
  nearestPanelIndex,
  normalizeWheelDelta,
  wrapIndex,
} from '../src/webgl/panelNavigation.js';

const positions = Array.from({ length: 8 }, (_, index) => 419.76 + index * 870.84);
const spacing = positions[1] - positions[0];
const period = spacing * positions.length;
let checks = 0;
const pass = (label) => { checks += 1; console.log(`PASS ${label}`); };
const near = (actual, expected, epsilon = 1e-6) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} !~ ${expected}`);
const wrappedNear = (actual, expected, epsilon = 1e-6) => near(centeredWrap(actual - expected, period), 0, epsilon);

function makeNav(index = 1) {
  const nav = new PanelNavigation(positions, period);
  nav.reset(positions[index]);
  return nav;
}

// Mirrors Experience.updateHome(): existing offset damping, velocity sampling
// before whole-period rebase, and wrapped rendering. Asserts exact panel rest.
function renderToRest(nav, from, { fps = 60, reducedMotion = false, maxFrames = 900, viewport = 1440 } = {}) {
  let current = from;
  let previous = from;
  let frames = 0;
  let maxSpeed = 0;
  let directionChanges = 0;
  let lastDirection = 0;
  let travel = 0;
  let lastVisible = null;
  const dt = 1 / fps;
  while (frames < maxFrames) {
    frames += 1;
    const target = nav.update(dt, { reducedMotion });
    if (reducedMotion) current = target;
    else {
      current += (target - current) * (1 - Math.exp(-6.3 * dt));
      const error = Math.abs(target - current);
      current = (!nav.busy && error < 0.5) || error < 0.02 ? target : Math.round(current * 100) / 100;
    }
    const delta = current - previous;
    const speed = delta / dt;
    const direction = Math.sign(speed);
    if (lastDirection && direction && direction !== lastDirection) directionChanges += 1;
    if (direction) lastDirection = direction;
    maxSpeed = Math.max(maxSpeed, Math.abs(speed));
    travel += delta;

    // Whole-period rebase is invisible to wrapped panel distances.
    const cycles = Math.round(current / period);
    if (cycles) {
      const shift = cycles * period;
      current -= shift;
      nav.rebase(shift);
    }

    // Visible panels must not teleport when the offset crosses the seam.
    const visible = positions.map((center) => centeredWrap(center - current, period));
    if (lastVisible) {
      visible.forEach((rel, index) => {
        if (Math.abs(rel) < viewport && Math.abs(lastVisible[index]) < viewport) {
          assert.ok(Math.abs(rel - lastVisible[index]) < spacing * 0.5, `visible panel ${index} jumped at the loop seam`);
        }
      });
    }
    lastVisible = visible;
    previous = current;
    if (!nav.busy && Math.abs(nav.target - current) < 0.001) break;
  }
  assert.ok(frames < maxFrames, 'navigation must settle, not hover between panels');
  near(current, nav.target);
  wrappedNear(current, positions[nav.index]);
  return { frames, seconds: frames / fps, current, maxSpeed, directionChanges, travel };
}

// Wheel normalization: pixels, lines, pages, horizontal and Shift+wheel.
assert.deepEqual(normalizeWheelDelta({ deltaX: 0, deltaY: 100, deltaMode: 0 }, 900), { delta: 100, threshold: 36 });
assert.deepEqual(normalizeWheelDelta({ deltaX: 0, deltaY: 3, deltaMode: 1 }, 900), { delta: 48, threshold: 1 });
assert.deepEqual(normalizeWheelDelta({ deltaX: 0, deltaY: 1, deltaMode: 2 }, 900), { delta: 900, threshold: 1 });
assert.equal(normalizeWheelDelta({ deltaX: -80, deltaY: 12, deltaMode: 0 }, 900).delta, -80);
assert.equal(normalizeWheelDelta({ deltaX: 0, deltaY: 90, deltaMode: 0, shiftKey: true }, 900).delta, 90);
pass('wheel normalization covers mouse, trackpad, line/page modes and dominant axis');

// One conventional notch is one panel, and the exact centre is restored.
{
  const nav = makeNav(1);
  assert.equal(nav.wheel(100, 0), 1);
  nav.step(1, nav.position);
  const result = renderToRest(nav, positions[1]);
  assert.equal(nav.index, 2);
  wrappedNear(result.current, positions[2]);
  near(result.travel, spacing);
  assert.equal(result.directionChanges, 0);
}
pass('one mouse-wheel notch advances exactly one panel and snaps precisely');

// Repeated events during one animation cannot queue or stack transitions.
{
  const nav = makeNav(1);
  assert.equal(nav.wheel(100, 0), 1);
  nav.step(1, nav.position);
  for (const time of [30, 80, 160, 320, 600]) assert.equal(nav.wheel(100, time, { settled: false }), 0);
  renderToRest(nav, positions[1]);
  assert.equal(nav.wheel(100, 600 + WHEEL_QUIET_MS + 1), 1);
  nav.step(1, nav.position);
  renderToRest(nav, positions[2]);
  assert.equal(nav.index, 3);
}
pass('repeated wheel notches are suppressed during a single animation');

// A high-resolution mouse notch may arrive as several small fragments.
{
  const nav = makeNav(1);
  let accepted = 0;
  let settled = true;
  for (let i = 0; i < 12; i += 1) {
    const direction = nav.wheel(12, i * 10, { settled });
    if (direction) { accepted += 1; nav.step(direction, nav.position); settled = false; }
  }
  assert.equal(accepted, 1);
  renderToRest(nav, positions[1]);
  assert.equal(nav.index, 2);
}
pass('fragmented high-resolution wheel notches coalesce into one transition');

// Trackpad inertia tail must not become a second transition after the spring ends.
{
  const nav = makeNav(1);
  let accepted = 0;
  let time = 0;
  let restFrame = 0;
  let current = positions[1];
  let settled = true;
  for (let i = 0; i < 150; i += 1) {
    time += 16;
    const direction = nav.wheel(i < 90 ? 7 : 2, time, { settled });
    if (direction) { accepted += 1; nav.step(direction, current); settled = false; }
    const target = nav.update(0.016);
    current += (target - current) * (1 - Math.exp(-6.3 * 0.016));
    if (!nav.busy && Math.abs(target - current) < 0.5) { current = target; settled = true; restFrame = i; }
  }
  assert.equal(accepted, 1);
  assert.ok(restFrame > 0);
  assert.equal(nav.index, 2);
  assert.equal(nav.wheel(60, time + WHEEL_QUIET_MS + 1, { settled: true }), 1);
}
pass('horizontal trackpad gestures and inertial tails produce one deliberate step');

// Direction reversal after settling is responsive and continuous.
{
  const nav = makeNav(2);
  assert.equal(nav.wheel(100, 0), 1);
  nav.step(1, nav.position);
  renderToRest(nav, positions[2]);
  assert.equal(nav.wheel(-100, 2000), -1);
  nav.step(-1, nav.position);
  const result = renderToRest(nav, positions[3]);
  assert.equal(nav.index, 2);
  near(result.travel, -spacing);
}
pass('wheel direction reversal returns to the previous panel without jitter');

// Last→first and first→last are one-panel steps across the seam, not end stops.
{
  const forward = makeNav(7);
  forward.step(1, forward.position);
  assert.equal(forward.index, 0);
  near(forward.target - forward.position, spacing);
  const forwardResult = renderToRest(forward, positions[7]);
  wrappedNear(forwardResult.current, positions[0]);
  near(forwardResult.travel, spacing);
  assert.equal(forwardResult.directionChanges, 0);

  const backward = makeNav(0);
  backward.step(-1, backward.position);
  assert.equal(backward.index, 7);
  near(backward.target - backward.position, -spacing);
  const backwardResult = renderToRest(backward, positions[0]);
  wrappedNear(backwardResult.current, positions[7]);
  near(backwardResult.travel, -spacing);
  assert.equal(backwardResult.directionChanges, 0);
}
pass('last→first and first→last wheel gestures loop seamlessly in both directions');

// Slow releases near either side of the seam choose the nearest wrapped panel.
{
  const cases = [
    [7, 0.49, 7],
    [7, 0.51, 0],
    [0, -0.49, 0],
    [0, -0.51, 7],
  ];
  for (const [start, fraction, expected] of cases) {
    const nav = makeNav(start);
    const position = positions[start] + fraction * spacing;
    nav.release(position, 20);
    assert.equal(nav.index, expected);
    const result = renderToRest(nav, position);
    wrappedNear(result.current, positions[expected]);
    assert.ok(Math.abs(result.travel) <= spacing * 0.51 + 1);
  }
}
pass('slow drag near both loop boundaries settles on the nearest appropriate panel');

// Fast flicks carry momentum across the seam without reversing or hard stopping.
{
  const forward = makeNav(7);
  forward.release(positions[7], spacing * 4);
  assert.equal(forward.index, 1);
  const forwardResult = renderToRest(forward, positions[7]);
  assert.ok(forwardResult.travel > spacing * 1.5);
  assert.equal(forwardResult.directionChanges, 0);
  wrappedNear(forwardResult.current, positions[1]);

  const backward = makeNav(0);
  backward.release(positions[0], -spacing * 4);
  assert.equal(backward.index, 6);
  const backwardResult = renderToRest(backward, positions[0]);
  assert.ok(backwardResult.travel < -spacing * 1.5);
  assert.equal(backwardResult.directionChanges, 0);
  wrappedNear(backwardResult.current, positions[6]);
}
pass('fast flick momentum crosses the loop boundary in both directions');

// Pointer velocity is recent-weighted and a held pause does not fling.
{
  const tracker = new DragVelocityTracker(5000);
  tracker.reset(0, 0);
  for (let i = 1; i <= 6; i += 1) tracker.sample(i * 40, i * 16);
  assert.ok(tracker.value(96) > 2000);
  assert.equal(tracker.value(260), 0);
  tracker.sample(241, 300);
  assert.ok(Math.abs(tracker.value(300)) < 100);
}
pass('drag release uses tracked velocity and ignores stale final-position flings');

// Dragging is continuous through the seam; cancellation invents no momentum.
{
  const nav = makeNav(7);
  nav.beginDrag(positions[7]);
  nav.dragTo(positions[7] + spacing * 1.25);
  near(nav.position, positions[7] + spacing * 1.25);
  nav.cancel(nav.position);
  assert.equal(nav.index, 0);
  const result = renderToRest(nav, nav.position);
  wrappedNear(result.current, positions[0]);
  assert.ok(Math.abs(result.travel) <= spacing * 0.25 + 1);
}
pass('continuous drag and cancelled pointer release cross the seam safely');

// Repeated deliberate notches complete multiple full loops without drift.
{
  const nav = makeNav(1);
  let current = positions[1];
  for (let i = 0; i < positions.length * 3; i += 1) {
    assert.equal(nav.wheel(100, i * 2000), 1);
    nav.step(1, current);
    const result = renderToRest(nav, current);
    near(result.travel, spacing);
    current = result.current;
  }
  assert.equal(nav.index, 1);
  wrappedNear(current, positions[1]);
  for (let i = 0; i < positions.length * 2; i += 1) {
    assert.equal(nav.wheel(-100, 100000 + i * 2000), -1);
    nav.step(-1, current);
    const result = renderToRest(nav, current);
    near(result.travel, -spacing);
    current = result.current;
  }
  assert.equal(nav.index, 1);
  wrappedNear(current, positions[1]);
}
pass('repeated wheel gestures complete multiple forward and reverse loops without drift');

// Touch flicks use the same pointer physics across both seam directions.
{
  const forward = makeNav(7);
  forward.beginDrag(positions[7]);
  forward.dragTo(positions[7] + spacing * 0.4);
  forward.release(forward.position, spacing * 6);
  const forwardResult = renderToRest(forward, forward.position);
  assert.ok(forwardResult.travel > spacing);
  assert.equal(forwardResult.directionChanges, 0);
  assert.notEqual(forward.index, 7);

  const backward = makeNav(0);
  backward.beginDrag(positions[0]);
  backward.dragTo(positions[0] - spacing * 0.4);
  backward.release(backward.position, -spacing * 6);
  const backwardResult = renderToRest(backward, backward.position);
  assert.ok(backwardResult.travel < -spacing);
  assert.equal(backwardResult.directionChanges, 0);
  assert.notEqual(backward.index, 0);
}
pass('touch flick momentum loops across last→first and first→last');

// Reduced motion removes animated travel and momentum but keeps wrapped intent.
{
  const nav = makeNav(7);
  nav.wheel(100, 0);
  nav.step(1, nav.position, { reducedMotion: true });
  assert.equal(nav.busy, false);
  assert.equal(nav.index, 0);
  wrappedNear(nav.position, positions[0]);
  nav.release(positions[0] - spacing * 0.6, -20, { reducedMotion: true });
  assert.equal(nav.busy, false);
  assert.equal(nav.index, 7);
  wrappedNear(nav.position, positions[7]);
}
pass('reduced-motion preference snaps discretely around the loop without momentum');

// The closed-form spring is stable across refresh rates while crossing the seam.
{
  const results = [30, 60, 120].map((fps) => {
    const nav = makeNav(7);
    nav.release(positions[7], spacing * 4);
    return renderToRest(nav, positions[7], { fps });
  });
  for (const result of results) {
    wrappedNear(result.current, positions[1]);
    assert.equal(result.directionChanges, 0);
  }
  assert.ok(Math.max(...results.map(r => r.seconds)) - Math.min(...results.map(r => r.seconds)) < 0.2);
}
pass('30/60/120 Hz loop momentum decelerates monotonically and lands on the same panel');

// Geometry: every adjacent pair, including last→first, has one spacing of run.
positions.forEach((center, index) => {
  const next = positions[(index + 1) % positions.length];
  near(centeredWrap(next - center, period), spacing);
});
assert.equal(nearestPanelIndex(positions, positions[4] + 1, period), 4);
assert.equal(nearestPanelIndex(positions, positions[7] + spacing * 0.6, period), 0);
assert.equal(wrapIndex(-1, positions.length), 7);
assert.equal(wrapIndex(8, positions.length), 0);
console.log(`\n${checks}/${checks} home gallery navigation checks passed.`);
