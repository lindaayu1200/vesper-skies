// Staged screenshot scenes behind ?shot=<name>. Each builds the real world,
// places the Kestrel and its HUD deliberately, and sets window.__shotReady so
// the capture harness knows the frame is painted. Seed keeps it reproducible.
import { FLIGHT, WORLD } from './config.js';
// three.js ships as a global from vendor/three.min.js.

// Snap the chase camera into position instantly (no lerp warm-up).
function snapCam(ctx, ac) {
  const behind = new THREE.Vector3(0, 10, 34).applyQuaternion(ac.mesh.quaternion);
  ctx.camera.position.copy(ac.mesh.position).add(behind);
  ctx.camera.lookAt(ac.mesh.position);
}

// Aim the Kestrel's nose (-Z forward) at a world point.
function aimAt(mesh, x, y, z) {
  const dx = x - mesh.position.x, dz = z - mesh.position.z;
  mesh.rotation.set(0, Math.atan2(-dx, -dz), 0);
}

const SHOTS = {
  // Cover: dense gameplay frame over Port Halvard with rings, HUD, radio.
  flight(ctx) {
    const ac = ctx.makeAircraft(ctx.world, {
       start: { x: 1400, y: 260, z: 500, heading: 0.65 },
      speed: 96, throttle: 0.8, fuel: 62, damage: 12,
    });
    ctx.scene.add(ac.mesh);
    ctx.state.aircraft = ac; ctx.state.screen = 'play';
    ctx.state.mission = ctx.MISSIONS[1].build(ctx.world);
    for (const m of ctx.state.mission.meshes) ctx.scene.add(m);
    ctx.rig.mode = 'chase';
    ctx.hud.show();
    ctx.hud.setMission('Sortie 2 — Mail Run — carry the mail over Port Halvard, mind the flak tower.');
    ctx.hud.setRep(2, 1450);
    ctx.radioLine('COMMS — Tower: Harbor flak gunners are jumpy today. Mind the tower.');
    ctx.hudStep(ac, 0.8);
    if (ctx.gaugesStep) ctx.gaugesStep(ac, 0.8);
    ctx.minimapDraw(ac);
    for (let i = 0; i < 90; i += 1) { ctx.stepAircraft(ac, { pitch: 0, roll: 0, yaw: 0 }, 0, 1 / 60, ctx.world); ctx.stepCamera(ctx.rig, ac, 1 / 60); }
    return true;
  },
  // Title screen with a flyover world behind it.
  start(ctx) {
    const ac = ctx.makeAircraft(ctx.world, { start: { x: -2400, y: 190, z: 2600, heading: -Math.PI / 4 }, speed: 60 });
    ctx.scene.add(ac.mesh);
    ctx.state.aircraft = ac;
    ctx.rig.mode = 'chase';
    for (let i = 0; i < 60; i += 1) { ctx.stepAircraft(ac, { pitch: 0, roll: 0, yaw: 0 }, 0, 1 / 60, ctx.world); ctx.stepCamera(ctx.rig, ac, 1 / 60); }
    ctx.hud.showScreen('VESPER SKIES', 'Seven sorties over the Cascavia Archipelago', 'Wing Commander: fly the Kestrel off the deck at Verdan Fields.<br>Throttle up, thread the rings, land the plane in one piece.');
    return true;
  },
  // Night Watch scene: dark strait, lit beacons, instruments leading.
  night(ctx) {
    const ac = ctx.makeAircraft(ctx.world, {
      start: { x: 1600, y: 300, z: 2000, heading: 0 },
      speed: 88, throttle: 0.7, fuel: 41, damage: 4,
    });
    aimAt(ac.mesh, 600, 140, 1200);
    ctx.scene.add(ac.mesh);
    ctx.state.aircraft = ac; ctx.state.screen = 'play';
    ctx.state.mission = ctx.MISSIONS[5].build(ctx.world);
    for (const m of ctx.state.mission.meshes) ctx.scene.add(m);
    ctx.setNight(ctx.scene, true);
    if (ctx.state.mission.meshes[0]) ctx.state.mission.meshes[0].scale.setScalar(2.6); // lamp glow reads in frame
    ctx.rig.mode = 'chase';
    ctx.hud.show();
    ctx.hud.setMission('Sortie 6 — Night Watch — find the three signal lamps in the strait.');
    ctx.hud.setRep(3, 2680);
    ctx.radioLine('COMMS — Vesper Lead: Trust the instruments, not your eyes. Heading and altitude tell the truth at night.');
    ctx.hudStep(ac, 0.7);
    if (ctx.gaugesStep) ctx.gaugesStep(ac, 0.7);
    ctx.minimapDraw(ac);
    for (let i = 0; i < 80; i += 1) { ctx.stepAircraft(ac, { pitch: 0, roll: 0, yaw: 0 }, 0, 1 / 60, ctx.world); ctx.stepCamera(ctx.rig, ac, 1 / 60); }
    return true;
  },
  // Homecoming: low over the runway, flare attitude, landing marker ahead.
  landing(ctx) {
    const rw = WORLD.runway;
    const ac = ctx.makeAircraft(ctx.world, {
      start: { x: rw.x - 700 * Math.cos(rw.heading), y: 70, z: rw.z + 700 * Math.sin(rw.heading), heading: 0 },
      speed: 42, throttle: 0.25, fuel: 9, damage: 55,
    });
    ac.mesh.rotateX(0.06);
    aimAt(ac.mesh, rw.x, 20, rw.z);
    ac.mesh.rotateX(0.06);
    ctx.scene.add(ac.mesh);
    ctx.state.aircraft = ac; ctx.state.screen = 'play';
    ctx.state.mission = ctx.MISSIONS[6].build(ctx.world);
    for (const m of ctx.state.mission.meshes) ctx.scene.add(m);
    ctx.rig.mode = 'chase';
    ctx.hud.show();
    ctx.hud.setMission('Sortie 7 — Homecoming — put her down on the deck at Verdan Fields, wings level.');
    ctx.hud.setRep(3, 3410);
    ctx.radioLine('COMMS — Tower: Long final, gear down, wings level. The whole wing is watching.');
    ctx.hudStep(ac, 0.25);
    if (ctx.gaugesStep) ctx.gaugesStep(ac, 0.25);
    ctx.minimapDraw(ac);
    for (let i = 0; i < 30; i += 1) { ctx.stepAircraft(ac, { pitch: 0, roll: 0, yaw: 0 }, 0, 1 / 60, ctx.world); ctx.stepCamera(ctx.rig, ac, 1 / 60); }
    return true;
  },
};

export function runShotMode(ctx) {
  const params = new URLSearchParams(location.search);
  const name = params.get('shot');
  if (!name || !SHOTS[name]) return;
  ctx.state.shotMode = true; // staged scenes render their own frames; the live loop stays paused
  const seed = Number(params.get('seed') || 1);
  const build = () => { SHOTS[name](ctx, seed); if (ctx.state.aircraft) snapCam(ctx, ctx.state.aircraft); };
  // Wait two RAFs after building so a real frame is painted.
  const tick = () => requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  requestAnimationFrame(() => requestAnimationFrame(() => { build(); tick(); }));
}
