// Main game loop: title screen, mission ladder, scoring, REP, restart, and the
// staged screenshot scenes behind ?shot=.
import { FLIGHT, WORLD } from './config.js';
import { initInput, readSteer, throttleDelta, pressed } from './input.js';
import { buildWorld } from './world.js';
import { makeAircraft, stepAircraft, applyDamage, repair, runwayStart } from './aircraft.js';
import { makeCameraRig, stepCamera, toggleCamera } from './cameraRig.js';
import { MISSIONS, setNight } from './missions.js';
import { makeHud } from './hud.js';
import { makeRadio } from './radio.js';
import { makeAudio } from './audio.js';
import { makeMinimap } from './minimap.js';
import { makeHelp } from './help.js';
import { makeGauges } from './gauges.js';
import { makeAtc } from './atc.js';
import { makeSortieLog } from './sortieLog.js';
import { makeSky } from './sky.js';
import { makeStall } from './stall.js';
import { makeObjectiveArrow } from './objectiveArrow.js';
import { makeChecklist } from './checklist.js';
import { runShotMode } from './shots.js';
import { makeComposer, resizeComposer } from './postfx.js';
import { updateWater } from './water.js';
import { updateClouds } from './clouds.js';
import { updateAtmosphere, SUN_DIRECTION } from './atmosphere.js';

const app = document.querySelector('#app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputEncoding = THREE.sRGBEncoding;
app.appendChild(renderer.domElement);
initInput(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 1, 12000);
const world = buildWorld(scene, 7);
const sky = makeSky(scene);
const composer = makeComposer(renderer, scene, camera);
let fpsTime = 0; let fpsFrames = 0;
scene.userData.hemi = world.group.children[0];
scene.userData.sun = world.group.children[1];

const hud = makeHud(document);
const checklist = makeChecklist(document);
const radio = makeRadio();
const audio = makeAudio();
const minimap = makeMinimap(document.querySelector('#minimap-canvas'));
const help = makeHelp(document);
const gauges = makeGauges(document.querySelector('#hud'));
gauges.mount(360, 126);
const atc = makeAtc(radio, world);
const sortieLog = makeSortieLog();
const rig = makeCameraRig(camera);
const stall = makeStall(rig);
const arrow = makeObjectiveArrow(scene);

window.game = { scene, camera, rig, world, hud, radio, audio, renderer };

const state = {
  screen: 'title',
  missionIndex: 0,
  mission: null,
  aircraft: null,
  rep: 0,
  score: 0,
  endTimer: 0,
  sortieSeconds: 0,
};

function startMission(index, opts = {}) {
  state.missionIndex = index;
  state.sortieSeconds = 0;
  const def = MISSIONS[index];
  state.aircraft = makeAircraft(world, opts.aircraft || {});
  scene.add(state.aircraft.mesh);
  state.mission = def.build(world);
  for (const m of state.mission.meshes) scene.add(m);
  setNight(scene, !!state.mission.night);
  sky.step(0, !!state.mission.night);
  hud.show();
  hud.setMission(def.name + ' — ' + def.brief);
  checklist.show(def.name, def.brief, []);
  hud.setRep(state.rep, state.score);
  radio.clear();
  for (const line of def.radio) radio.say('COMMS', line);
  state.screen = 'play';
}

function endMission(success, reason) {
  const ac = aircraftRef();
  const gained = success ? 500 + Math.round(ac.fuel) + Math.max(0, 100 - Math.round(ac.damage)) : 0;
  state.screen = success ? 'victory' : 'gameover';
  state.endTimer = 0;
  if (success) {
    state.score += gained;
    state.rep = Math.min(4, state.rep + 1);
  }
  sortieLog.record({ missionName: MISSIONS[state.missionIndex].name, result: success ? 'COMPLETE' : 'FAILED', fuelLeft: ac.fuel, damage: ac.damage, scoreGained: gained, seconds: state.sortieSeconds });
  for (const m of state.mission.meshes) scene.remove(m);
  hud.showScreen(success ? 'SORTIE COMPLETE' : 'SORTIE FAILED',
    MISSIONS[state.missionIndex].name,
    (reason || '') + '<br><br>Press ENTER to ' + (success ? 'fly the next sortie' : 'fly it again') + '.');
  audio.setMuted(true);
}
function aircraftRef() { return state.aircraft; }

function cleanup() {
  if (state.aircraft) { scene.remove(state.aircraft.mesh); state.aircraft = null; }
  if (state.mission) for (const m of state.mission.meshes) scene.remove(m);
}

function nextScreen() {
  cleanup();
  audio.setMuted(false);
  if (state.screen === 'title') { startMission(0); }
  else if (state.screen === 'victory') {
    if (state.missionIndex + 1 < MISSIONS.length) startMission(state.missionIndex + 1);
    else hud.showScreen('CAMPAIGN COMPLETE', 'Seven sorties, one Kestrel, all of Cascavia flown.', 'Final score ' + state.score + '. Press ENTER to fly the campaign again.');
  } else if (state.screen === 'gameover') startMission(state.missionIndex, { aircraft: {} });
  else startMission(0);
}

window.addEventListener('keydown', e => {
  if (e.code === 'Enter' && state.screen !== 'play') nextScreen();
  if (e.code === 'KeyC' && state.screen === 'play') toggleCamera(rig);
  if (e.code === 'KeyR' && state.screen === 'play') { cleanup(); startMission(state.missionIndex); }
  if (e.code === 'KeyM') document.querySelector('#minimap').classList.toggle('hidden');
  if (e.code === 'KeyH') help.toggle();
  if (e.code === 'KeyL') hud.radioLine(sortieLog.lines().join('\n'));
});

const objectivesForMap = () => (state.mission ? state.mission.meshes.map((m, i) => ({ x: m.position.x, z: m.position.z, done: state.mission.done > i })) : []);

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const visualTime = now * 0.001;
  updateAtmosphere(sky.atmosphere, sky.sunDirection, !!(state.mission && state.mission.night), dt);
  updateWater(world.water, visualTime, sky.sunDirection, !!(state.mission && state.mission.night));
  updateClouds(world.clouds, dt, new THREE.Vector2(6, 2));
  world.time += dt;
  for (const boat of world.boats) { boat.position.x += boat.userData.speed * dt; if (boat.position.x > 4500) boat.position.x = -4500; boat.position.y = -1 + Math.sin(world.time * 1.4 + boat.userData.speed) * 0.8; }
  for (const bird of world.birds) { const phase = world.time * 0.22 + bird.userData.phase; bird.position.set(900 + Math.cos(phase) * 420, 520 + Math.sin(world.time * 4 + bird.userData.phase) * 18, -600 + Math.sin(phase) * 420); bird.rotation.y = -phase; bird.children[0].rotation.z = Math.sin(world.time * 8 + bird.userData.phase) * .35; bird.children[1].rotation.z = -bird.children[0].rotation.z; }
  const sunPoint = SUN_DIRECTION.clone().multiplyScalar(4000).project(camera);
  composer.setSunScreen(new THREE.Vector2(sunPoint.x * 0.5 + 0.5, sunPoint.y * 0.5 + 0.5));
  fpsTime += dt; fpsFrames += 1;
  if (fpsTime > 2) { if (fpsFrames / fpsTime < 40) composer.quality = 'low'; fpsTime = 0; fpsFrames = 0; }
  if (state.shotMode || state.screen !== 'play') { composer.render(); return; }
  const ac = state.aircraft;
  if (!ac || !ac.alive) {
    if (ac && ac.crashed) { endMission(false, 'The Kestrel is down.'); audio.boom(); }
    composer.render();
    return;
  }
  const steer = readSteer(window.innerWidth, window.innerHeight);
  const dropPressed = pressed('Space');
  ac.cameraQuaternion = camera.quaternion;
  stepAircraft(ac, steer, throttleDelta(), dt, world);
  stall.step(dt, ac);
  state.sortieSeconds += dt;
  stepCamera(rig, ac, dt);
  audio.engineThrottle(ac.throttle);
  hud.step(ac, ac.throttle);
  gauges.step(ac, ac.throttle);
  atc.step(dt, ac);
  sky.step(dt, !!(state.mission && state.mission.night));
  if (state.mission.type === 'landing' || state.mission.type === 'dropzone') {
    arrow.hide();
  } else {
    const objective = state.mission.meshes[state.mission.done];
    arrow.target(objective || null);
    arrow.step(ac);
  }
  minimap.draw(ac, objectivesForMap(), !!state.mission.night);
  const line = radio.step(dt);
  if (line) hud.radioLine(line); else hud.hideRadio();

  // Flak hazard near marked districts.
  if (state.mission.flak) {
    for (const d of state.mission.flakAt || []) {
      const dist = Math.hypot(ac.mesh.position.x - d.x, ac.mesh.position.z - d.z);
      if (dist < 420) {
        applyDamage(ac, dt * 14);
        rig.shake = 1.2;
        hud.flashDamage();
        audio.alarm();
      }
    }
  }
  const res = MISSIONS[state.missionIndex].step(ac, state.mission, { dropPressed, dt });
  if (res.event === 'ring' || res.event === 'drop' || res.event === 'landing') audio.chime();
  if (res.complete) {
    const last = state.missionIndex === MISSIONS.length - 1;
    if (state.mission.type === 'dropzone' && !state.mission.landedOk) endMission(false, 'The crate missed the drop zone.');
    else endMission(true, last ? 'The campaign is flown.' : '');
    hud.setRep(state.rep, state.score);
  }
  if (ac.damage >= FLIGHT.damageMax) endMission(false, 'Airframe is torn apart.');
  composer.render();
}
requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  resizeComposer(composer, window.innerWidth, window.innerHeight);
});

// Staged screenshot scenes: ?shot=start|flight|night|landing
runShotMode({ scene, camera, rig, world, hud, radio, makeAircraft, MISSIONS, setNight, startMission, state, renderer, stepAircraft, stepCamera, hudStep: (ac, t) => hud.step(ac, t), gaugesStep: (ac, t) => gauges.step(ac, t), minimapDraw: ac => minimap.draw(ac, [], false), radioLine: t => hud.radioLine(t), audioThrottle: t => audio.engineThrottle(t) });
