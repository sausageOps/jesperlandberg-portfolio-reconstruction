/**
 * Navigation physics for the home panel run.
 *
 * This module owns input intent only: discrete wheel steps, pointer velocity,
 * release projection and a critically damped spring target. It never renders,
 * starts a RAF loop or creates a GSAP timeline. Experience.updateHome() feeds
 * the returned target into the gallery's existing offset damping and shader
 * pipeline, so the 3D arrangement and panel animations remain single-sourced.
 *
 * Offsets are continuous rather than clamped. Panel indices wrap, while spring
 * targets use the nearest unwrapped copy of a panel centre so momentum can cross
 * the last/first seam without reversing or jumping. Experience rebases current
 * and target together by whole loop periods; rendering wraps relative panel
 * distances, making that rebase visually seamless.
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const mod = (value, n) => ((value % n) + n) % n;
export const centeredWrap = (value, n) => (n > 0 ? mod(value + n / 2, n) - n / 2 : value);
export const wrapIndex = (index, count) => (count > 0 ? mod(index, count) : 0);

// Pixel wheels and trackpads report very different delta magnitudes. Accumulate
// small fragments into one deliberate notch, then ignore the rest of the same
// gesture (including inertial tail events) until the input has been quiet.
export const WHEEL_THRESHOLD_PX = 36;
export const WHEEL_QUIET_MS = 160;

// Release projection is roughly v / (2 * omega): far enough for a fast flick to
// cross several panels, while the critically damped spring bleeds off speed.
const RELEASE_PROJECTION_S = 0.44;
const MOMENTUM_OMEGA = 4.6;
const SNAP_OMEGA = 8.5;
const WHEEL_OMEGA = 9.5;
const WHEEL_INITIAL_SPEED = 1.7; // panel widths / second
const VELOCITY_WINDOW_S = 0.035;
const VELOCITY_STALE_MS = 100;

export function normalizeWheelDelta(event, viewportHeight = 1) {
  const mode = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewportHeight : 1;
  let deltaX = (event.deltaX || 0) * mode;
  let deltaY = (event.deltaY || 0) * mode;
  // Some browsers/OS combinations still report Shift+wheel on the vertical axis.
  if (event.shiftKey && !deltaX && deltaY) {
    deltaX = deltaY;
    deltaY = 0;
  }
  // Dominant axis only: a diagonal trackpad gesture must not count twice.
  const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
  return { delta, threshold: event.deltaMode === 0 ? WHEEL_THRESHOLD_PX : 1 };
}

export function nearestPanelIndex(positions, position, period = 0) {
  if (!positions.length) return 0;
  let best = 0;
  let distance = Infinity;
  for (let index = 0; index < positions.length; index += 1) {
    const next = Math.abs(centeredWrap(positions[index] - position, period));
    if (next < distance) {
      distance = next;
      best = index;
    }
  }
  return best;
}

/** Track recent pointer velocity, not just the final pointer position. */
export class DragVelocityTracker {
  constructor(maxVelocity = Infinity) {
    this.maxVelocity = maxVelocity;
    this.reset(0, 0);
  }

  reset(position, time) {
    this.position = position;
    this.time = time;
    this.velocity = 0;
  }

  sample(position, time) {
    const elapsed = (time - this.time) / 1000;
    if (!(elapsed > 0)) {
      this.position = position;
      this.time = time;
      return this.velocity;
    }
    // A pause before the next sample is not a slow drag across the whole gap.
    if (elapsed > VELOCITY_STALE_MS / 1000) this.velocity = 0;
    const dt = clamp(elapsed, 0.001, 0.064);
    const instant = (position - this.position) / dt;
    const alpha = 1 - Math.exp(-dt / VELOCITY_WINDOW_S);
    this.velocity += (instant - this.velocity) * alpha;
    this.position = position;
    this.time = time;
    return this.velocity;
  }

  value(now) {
    if (now - this.time > VELOCITY_STALE_MS) return 0;
    return clamp(this.velocity, -this.maxVelocity, this.maxVelocity);
  }
}

export class PanelNavigation {
  constructor(positions = [], period = 0) {
    this.configure(positions, period);
    this.mode = 'idle';
    this.kind = null;
    this.position = 0;
    this.target = 0;
    this.index = 0;
    this.velocity = 0;
    this.omega = MOMENTUM_OMEGA;
    this.wheelAccumulator = 0;
    this.wheelDirection = 0;
    this.wheelLatched = false;
    this.lastWheelTime = -Infinity;
  }

  configure(positions, period = 0) {
    this.positions = positions.length ? [...positions] : [0];
    this.max = this.positions[this.positions.length - 1];
    this.spacing = this.positions.length > 1
      ? Math.max(1, (this.max - this.positions[0]) / (this.positions.length - 1))
      : 1;
    // One full run includes the gap after the final panel, so last→first has
    // the same centre-to-centre spacing as every other adjacent pair.
    this.period = period > 0 ? period : (this.positions.length > 1 ? this.spacing * this.positions.length : 0);
  }

  get busy() {
    return this.mode !== 'idle';
  }

  /** Choose the unwrapped copy of a panel centre nearest a continuous offset. */
  panelPosition(index, near) {
    const base = this.positions[wrapIndex(index, this.positions.length)] ?? 0;
    if (!this.period) return base;
    return base + Math.round((near - base) / this.period) * this.period;
  }

  nearestIndex(position) {
    return nearestPanelIndex(this.positions, position, this.period);
  }

  /** Shift the continuous spring by whole periods without changing its motion. */
  rebase(delta) {
    this.position -= delta;
    this.target -= delta;
  }

  reset(position = 0) {
    this.position = this.target = position;
    this.index = this.nearestIndex(this.position);
    this.velocity = 0;
    this.mode = 'idle';
    this.kind = null;
    this.wheelAccumulator = 0;
    this.wheelDirection = 0;
    this.wheelLatched = false;
    this.lastWheelTime = -Infinity;
  }

  /**
   * Coalesce wheel fragments and suppress repeats for the whole animation and
   * inertial tail. `settled` includes the renderer's remaining offset error.
   */
  wheel(delta, now, { settled = true, threshold = WHEEL_THRESHOLD_PX } = {}) {
    if (!Number.isFinite(delta) || delta === 0) return 0;
    const direction = Math.sign(delta);
    const gap = now - this.lastWheelTime;
    this.lastWheelTime = now;
    if (!settled) {
      this.wheelAccumulator = 0;
      this.wheelDirection = 0;
      this.wheelLatched = true;
      return 0;
    }
    if (this.wheelLatched) {
      if (gap < WHEEL_QUIET_MS) {
        this.wheelAccumulator = 0;
        return 0;
      }
      // The gesture has been quiet long enough to be a new deliberate notch.
      this.wheelLatched = false;
      this.wheelAccumulator = 0;
      this.wheelDirection = 0;
    } else if (gap >= WHEEL_QUIET_MS) {
      this.wheelAccumulator = 0;
      this.wheelDirection = 0;
    }
    if (this.wheelDirection !== direction) {
      this.wheelAccumulator = 0;
      this.wheelDirection = direction;
    }
    this.wheelAccumulator += Math.abs(delta);
    if (this.wheelAccumulator < threshold) return 0;
    this.wheelAccumulator = 0;
    this.wheelLatched = true;
    return direction;
  }

  step(direction, from, { reducedMotion = false } = {}) {
    const current = this.nearestIndex(from);
    this.index = wrapIndex(current + Math.sign(direction), this.positions.length);
    this.position = from;
    // One panel of continuous travel, even across the last/first seam.
    this.target = this.panelPosition(this.index, from + Math.sign(direction) * this.spacing);
    if (reducedMotion || Math.abs(this.target - this.position) < 0.01) {
      this.position = this.target;
      this.velocity = 0;
      this.mode = 'idle';
      this.kind = null;
      return this.index;
    }
    this.velocity = Math.sign(direction) * this.spacing * WHEEL_INITIAL_SPEED;
    this.omega = WHEEL_OMEGA;
    this.mode = 'spring';
    this.kind = 'wheel';
    return this.index;
  }

  beginDrag(from) {
    this.position = this.target = from;
    this.index = this.nearestIndex(this.position);
    this.velocity = 0;
    this.mode = 'drag';
    this.kind = 'drag';
  }

  dragTo(position) {
    if (this.mode !== 'drag') return;
    this.position = this.target = position;
  }

  release(from, velocity, { reducedMotion = false } = {}) {
    const position = from;
    const speed = Math.abs(velocity);
    const slowThreshold = Math.max(60, this.spacing * 0.1);
    const projected = speed <= slowThreshold ? position : position + velocity * RELEASE_PROJECTION_S;
    let index = this.nearestIndex(projected);
    let anchor = projected;
    // A short but decisive flick still commits one panel in its direction.
    if (speed > this.spacing * 0.75 && index === this.nearestIndex(position)) {
      index = wrapIndex(index + Math.sign(velocity), this.positions.length);
      anchor = position + Math.sign(velocity) * this.spacing;
    }
    this.index = index;
    this.target = this.panelPosition(index, anchor);
    this.position = position;
    if (reducedMotion || Math.abs(this.target - position) < 0.01) {
      this.position = this.target;
      this.velocity = 0;
      this.mode = 'idle';
      this.kind = null;
      return index;
    }
    const momentum = speed > slowThreshold;
    this.velocity = momentum ? clamp(velocity, -this.spacing * 6.5, this.spacing * 6.5) : 0;
    this.omega = momentum ? MOMENTUM_OMEGA : SNAP_OMEGA;
    this.mode = 'spring';
    this.kind = momentum ? 'momentum' : 'snap';
    return index;
  }

  /** Cancelled pointers settle without inventing a fling. */
  cancel(from, { reducedMotion = false } = {}) {
    return this.release(from, 0, { reducedMotion });
  }

  /** Advance the spring target. The existing gallery damping renders it. */
  update(dt, { reducedMotion = false } = {}) {
    if (this.mode !== 'spring') return this.position;
    if (reducedMotion) {
      this.position = this.target;
      this.velocity = 0;
      this.mode = 'idle';
      this.kind = null;
      return this.position;
    }
    const elapsed = clamp(dt, 0, 0.1);
    if (elapsed <= 0) return this.position;
    const distance = this.target - this.position;
    if (Math.abs(distance) < 0.01) {
      this.position = this.target;
      this.velocity = 0;
      this.mode = 'idle';
      this.kind = null;
      return this.position;
    }
    // Raise stiffness when a rounded target is closer than the current speed
    // would naturally carry us. This keeps the critical spring monotone instead
    // of allowing a bounce past the selected panel. There are no end stops.
    const toward = Math.sign(this.velocity) === Math.sign(distance);
    const omega = toward
      ? Math.max(this.omega, Math.abs(this.velocity) / Math.max(Math.abs(distance), 0.001))
      : this.omega;
    const decay = Math.exp(-omega * elapsed);
    const offset = this.position - this.target;
    const term = (this.velocity + omega * offset) * elapsed;
    this.position = this.target + (offset + term) * decay;
    this.velocity = (this.velocity - omega * term) * decay;
    if (Math.abs(this.target - this.position) < 0.05 && Math.abs(this.velocity) < 0.5) {
      this.position = this.target;
      this.velocity = 0;
      this.mode = 'idle';
      this.kind = null;
    }
    return this.position;
  }
}
