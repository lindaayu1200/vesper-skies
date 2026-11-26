// The SL-9 Kestrel: low-poly airframe built from primitives plus the flight
// model (throttle, pitch/roll/yaw, fuel, damage, landing and crash).
// three.js ships as a global from vendor/three.min.js (classic script in index.html).
import { FLIGHT, WORLD } from './config.js';

export function buildAircraftMesh() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xd9d2c4, metalness: 0.25, roughness: 0.5 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xb54f2a, metalness: 0.2, roughness: 0.55 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd4ff, metalness: 0.7, roughness: 0.15, transparent: true, opacity: 0.85 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.2, 16, 10), body);
  fuselage.rotation.x = Math.PI / 2;
  g.add(fuselage);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(2.1, 5, 10), trim);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = -10.4;
  g.add(nose);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), glass);
  canopy.scale.set(1, 0.7, 2.1);
  canopy.position.set(0, 1.7, -2.5);
  g.add(canopy);
  const wingGeo = new THREE.BoxGeometry(22, 0.6, 4.6);
  const wingL = new THREE.Mesh(wingGeo, body);
  wingL.position.set(0, 0.4, 0.5);
  g.add(wingL);
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 3.4), trim);
  tipL.position.set(11.8, 0.4, 0.5); g.add(tipL);
  const tipR = tipL.clone(); tipR.position.x = -11.8; g.add(tipR);
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 3), body);
  tailWing.position.set(0, 0.9, 7.4); g.add(tailWing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.4, 3.4), trim);
  fin.position.set(0, 2.9, 7.6); g.add(fin);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.5, 0.3), trim);
  prop.position.z = -13.2; g.add(prop);
  const spinner = new THREE.Mesh(new THREE.SphereGeometry(1.1, 6, 6), trim);
  spinner.position.z = -13.4; g.add(spinner);
  // Fixed landing gear reads as a plane that can land.
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.6), trim);
    leg.position.set(side * 3.2, -1.9, -1.5); g.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.7, 10), trim);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 3.2, -3.2, -1.5); g.add(wheel);
  }
  g.userData.prop = prop;
  return g;
}

export function makeAircraft(world, opts = {}) {
  const mesh = buildAircraftMesh();
  const start = opts.start || runwayStart();
  mesh.position.set(start.x, start.y, start.z);
  mesh.rotation.set(0, start.heading, 0);
  const state = {
    mesh,
    speed: opts.speed ?? FLIGHT.startSpeed,
    throttle: opts.throttle ?? 0.45,
    fuel: opts.fuel ?? FLIGHT.fuelMax,
    damage: opts.damage ?? 0,
    landed: false,
    crashed: false,
    alive: true,
    bankDisplay: 0,
    pitchDisplay: 0,
  };
  return state;
}

export function runwayStart() {
  const rw = WORLD.runway;
  const x = rw.x + Math.cos(rw.heading) * (rw.length / 2 - 60);
  const z = rw.z - Math.sin(rw.heading) * (rw.length / 2 - 60);
  return { x, y: 18, z, heading: rw.heading };
}

/** One simulation step. `steer` comes from input.readSteer. */
export function stepAircraft(state, steer, throttleDelta, dt, world) {
  const { mesh } = state;
  if (!state.alive) return;
  state.throttle = Math.max(0, Math.min(1, state.throttle + throttleDelta * FLIGHT.throttleRate * dt));
  state.speed += (state.throttle * (FLIGHT.maxSpeed - FLIGHT.minSpeed) + FLIGHT.minSpeed - state.speed) * dt * 0.7;
  state.fuel = Math.max(0, state.fuel - (0.25 + state.throttle) * FLIGHT.fuelBurn * dt);
  if (state.fuel <= 0) state.throttle = Math.max(state.throttle, 0.05);

  // Control authority scales with airspeed.
  const authority = Math.min(1, state.speed / 70);
  mesh.rotateX(-steer.pitch * FLIGHT.pitchRate * authority * dt);
  mesh.rotateZ(-steer.roll * FLIGHT.rollRate * authority * dt);
  mesh.rotateY(-steer.yaw * FLIGHT.yawRate * authority * dt);
  // Banked turns yaw the nose naturally.
  const euler = new THREE.Euler().setFromQuaternion(mesh.quaternion, 'YXZ');
  mesh.rotateY(-Math.sin(euler.z) * 0.8 * dt);

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(mesh.quaternion);
  mesh.position.addScaledVector(forward, state.speed * dt);
  // Slight lift/sink: nose direction carries the plane.
  mesh.position.y += forward.y * state.speed * dt * 0.35;

  const ground = world.terrainHeight(mesh.position.x, mesh.position.z) + 12;
  state.bankDisplay = euler.z;
  state.pitchDisplay = euler.x;

  if (mesh.position.y < ground) {
    // Hard contact: is this a landing or a crash?
    const gentle = Math.abs(state.pitchDisplay) < 0.18 && Math.abs(state.bankDisplay) < 0.25 && state.speed < 80;
    mesh.position.y = ground;
    if (gentle) {
      state.landed = true;
      state.speed *= 0.4;
      mesh.rotation.set(0, euler.y, 0);
    } else {
      crash(state);
    }
  }
  if (mesh.position.y > 2100) mesh.position.y = 2100;
}

export function crash(state) {
  state.crashed = true;
  state.alive = false;
}

export function applyDamage(state, amount) {
  state.damage = Math.min(FLIGHT.damageMax, state.damage + amount);
  if (state.damage >= FLIGHT.damageMax) crash(state);
}

export function repair(state) {
  state.damage = 0;
  state.fuel = FLIGHT.fuelMax;
}
