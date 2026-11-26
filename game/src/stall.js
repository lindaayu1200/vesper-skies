import { FLIGHT } from './config.js';

// Flight attitude warnings are deliberately separate from the flight model.
// They add buffet to the camera while leaving the aircraft state untouched.
export function makeStall(rig) {
  let warning = 0;
  let stallMargin = 0;
  let overspeed = false;

  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = (current, target, dt) => {
    const response = 1 - Math.exp(-Math.max(0, dt) / 0.5);
    return current + (target - current) * response;
  };

  function readAttitude(mesh) {
    // Euler x is the useful pitch attitude for this model: positive means the
    // nose is raised, while the aircraft's forward axis points down -Z.
    const pitch = mesh.rotation.x;
    const bank = mesh.rotation.z;
    return { pitch, bank };
  }

  function computeStall(speed, pitch) {
    const slowBand = FLIGHT.minSpeed * 1.8;
    const speedMargin = clamp((slowBand - speed) / Math.max(1, slowBand - FLIGHT.minSpeed));
    const noseHigh = clamp((pitch - 0.08) / 0.5);
    return speedMargin * (0.35 + noseHigh * 0.65);
  }

  function computeOverspeed(speed, pitch) {
    const dive = clamp((-pitch - 0.08) / 0.45);
    const fastBand = FLIGHT.maxSpeed * 0.82;
    const speedExcess = clamp((speed - fastBand) / Math.max(1, FLIGHT.maxSpeed - fastBand));
    return speedExcess * (0.25 + dive * 0.75);
  }

  return {
    step(dt, aircraft) {
      if (!aircraft?.mesh) {
        warning = smooth(warning, 0, dt);
        stallMargin = smooth(stallMargin, 0, dt);
        overspeed = false;
        return;
      }

      const { pitch } = readAttitude(aircraft.mesh);
      const speed = Math.max(0, Number(aircraft.speed) || 0);
      stallMargin = computeStall(speed, pitch);
      const overspeedAmount = computeOverspeed(speed, pitch);
      overspeed = overspeedAmount > 0.08;
      const target = Math.max(stallMargin, overspeedAmount * 0.8);
      warning = smooth(warning, target, dt);

      if (stallMargin > 0.05 && rig) {
        // The rig drains its shake value over time, so this refreshes a small
        // buffet each frame without allowing the warning to damage the plane.
        const buffet = 0.3 + stallMargin * 0.3;
        rig.shake = Math.max(rig.shake || 0, buffet * Math.min(1, warning + 0.15));
      }
    },
    level() {
      return warning;
    },
  };
}
