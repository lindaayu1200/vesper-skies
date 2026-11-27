/* WINDWARD — bootstrap, game states, UI wiring */
(function () {
  'use strict';
  var WW = window.WW, U = WW.U;

  var G = {
    state: 'attract',
    view: 'chase',
    def: null,
    missionIndex: 0,
    attractT: 0,
    freeze: false,
    frames: 0,
    fpsAcc: 0,
    fps: 0,
    lastTime: 0,
    ending: 0,
    endingWin: false,
    flyTime: 0
  };
  WW.G = G;

  var renderer, scene, camera, sky, terrain, scenery, aircraft, rig, runner, hud, audio, input;
  var clock;
  var gaugeAcc = 0;
  var screens = {};
  var el = {};

  function boot() {
    el.loading = document.getElementById('loading');
    screens.title = document.getElementById('screen-title');
    screens.missions = document.getElementById('screen-missions');
    screens.brief = document.getElementById('screen-brief');
    screens.result = document.getElementById('screen-result');
    screens.pause = document.getElementById('screen-pause');
    screens.help = document.getElementById('screen-help');

    var canvas = document.getElementById('scene');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.15, 26000);

    sky = new WW.SkySystem(scene, renderer);
    terrain = new WW.Terrain();
    scene.add(terrain.buildMesh());
    window.__lambertMat = terrain.mesh.material;
    scenery = new WW.Scenery(scene, terrain);
    sky.onPreset.push(function (name, p) { scenery.applyPreset(name, p); });
    scenery.applyPreset(sky.presetName, sky.preset);

    aircraft = new WW.Aircraft(scene, terrain);
    aircraft.setView('chase');
    rig = new WW.CameraRig(camera, terrain);
    runner = new WW.MissionRunner(scene, terrain);
    audio = new WW.AudioEngine();
    hud = new WW.Hud(terrain, audio);
    input = new WW.Input();

    input.isTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth < 820;
    document.getElementById('touch').classList.toggle('hidden', !input.isTouch);

    sky.onLightning = function () { audio.thunder(); };

    buildMissionCards();
    wireUI();
    buildHelp();

    window.addEventListener('resize', onResize);
    onResize();

    clock = new THREE.Clock();
    G.lastTime = performance.now();
    placeAttract();
    requestAnimationFrame(loop);

    setTimeout(function () {
      el.loading.style.opacity = '0';
      setTimeout(function () { el.loading.classList.add('hidden'); }, 550);
    }, 220);
  }

  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    input.isTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || w < 820;
    document.getElementById('touch').classList.toggle('hidden', !input.isTouch || G.state !== 'fly');
  }

  /* ---------------- attract mode ---------------- */
  var attractCenter = { x: 400, z: -200, r: 2500 };

  function placeAttract() {
    var a = G.attractT * 0.05;
    var px = attractCenter.x + Math.cos(a) * attractCenter.r;
    var pz = attractCenter.z + Math.sin(a) * attractCenter.r;
    var hdg = U.bearingTo(px, pz,
      attractCenter.x + Math.cos(a + 0.02) * attractCenter.r,
      attractCenter.z + Math.sin(a + 0.02) * attractCenter.r);
    var y = 470 + Math.sin(G.attractT * 0.2) * 18;
    aircraft.pos.set(px, y, pz);
    aircraft.quat.setFromEuler(new THREE.Euler(0.02, -hdg * U.DEG, -0.26, 'YXZ'));
    aircraft.speed = 82;
    poseAircraft(0.016);
  }

  function poseAircraft(dt) {
    aircraft.obj.position.copy(aircraft.pos);
    aircraft.obj.quaternion.copy(aircraft.quat);
    aircraft.propAngle += dt * 40;
    for (var i = 0; i < aircraft.props.length; i++) aircraft.props[i].rotation.z = aircraft.propAngle;
    for (var d = 0; d < aircraft.propDiscs.length; d++) aircraft.propDiscs[d].material.opacity = 0.1;
    aircraft.strobe.visible = (performance.now() % 1400) < 90;
    var gy = Math.max(terrain.heightAt(aircraft.pos.x, aircraft.pos.z), 0);
    aircraft.shadow.position.set(aircraft.pos.x, gy + 0.3, aircraft.pos.z);
    aircraft.shadow.material.opacity = 0.16;
    aircraft.shadow.rotation.z = aircraft.heading() * U.DEG;
  }

  /* ---------------- mission flow ---------------- */
  function startMission(def) {
    G.def = def;
    G.state = 'fly';
    G.freeze = false;
    G.ending = 0;
    G.flyTime = 0;
    hideScreens();
    hud.show(true);
    hud.setMission(def);
    sky.setPreset(def.preset);
    runner.load(def);

    var st = def.start;
    var gh = terrain.heightAt(st.x || 0, st.z || 0);
    var opts = {
      x: st.x, z: st.z, hdg: st.hdg, onGround: st.onGround,
      fuel: st.fuel, speed: st.speed || 0
    };
    if (st.strip) { opts.strip = st.strip; opts.onGround = true; }
    if (!st.onGround) {
      opts.y = Math.max(gh, 0) + (st.alt || 250);
    } else {
      opts.y = 0;
    }
    aircraft.reset(opts);
    aircraft.throttle = st.onGround ? 0.05 : 0.68;
    input.touch.throttle = st.onGround ? 0 : 0.7;
    vehicleView(G.view);
    rig.setMode(G.view);
    rig.forceSnap();
    audio.resume();
    audio.chime(true);
    if (input.isTouch) document.getElementById('touch').classList.remove('hidden');

    hud.radio('Solmere Radio, Wren four is rolling.', 'WREN IV');
    if (def.radio) for (var i = 0; i < def.radio.length; i++) hud.radio(def.radio[i].text, def.radio[i].who);
  }

  function finishMission(success, reason) {
    if (G.state !== 'fly' && G.state !== 'ending') return;
    G.state = 'result';
    G.freeze = true;
    hud.show(false);
    document.getElementById('touch').classList.add('hidden');
    var def = G.def;
    var rk = document.getElementById('resKicker');
    var rt = document.getElementById('resTitle');
    var rm = document.getElementById('resMedal');
    var rs = document.getElementById('resStats');
    rk.textContent = success ? 'FLIGHT COMPLETE' : 'FLIGHT TERMINATED';
    rt.textContent = def.name;
    var medal = '—';
    var stats = '';
    var timeText = U.fmtTime(runner.time);
    var touchdown = aircraft.landedQuality;
    var vsFpm = touchdown ? Math.round(touchdown.vs * U.mToFt * 60) : 0;
    if (success) {
      var score = runner.time + aircraft.damage * 2.2;
      if (score <= def.medal.gold) medal = 'GOLD';
      else if (score <= def.medal.silver) medal = 'SILVER';
      else medal = 'BRONZE';
      audio.chime(true);
    } else {
      medal = 'NONE';
      audio.chime(false);
      reason = reason || 'airframe lost';
    }
    rm.innerHTML = '<span class="big">' + medal + '</span>' + (success ? 'SOLMERE AIR SERVICE COMMENDATION' : (reason === 'crash' ? 'AIRFRAME LOST' : reason === 'time' ? 'TIME EXPIRED' : 'SORTIE ABANDONED'));
    stats += '<div><span>FLIGHT TIME</span><b>' + timeText + '</b></div>';
    stats += '<div><span>GATES</span><b>' + runner.ringsPassed + ' / ' + runner.ringCount + '</b></div>';
    stats += '<div><span>HULL</span><b>' + Math.round(100 - aircraft.damage) + '%</b></div>';
    stats += '<div><span>FUEL LEFT</span><b>' + Math.round(aircraft.fuel * 100) + '%</b></div>';
    if (success && touchdown) {
      stats += '<div><span>TOUCHDOWN</span><b>' + Math.abs(vsFpm) + ' FPM</b></div>';
      stats += '<div><span>CENTRELINE</span><b>' + Math.round(touchdown.centre * 100) + '% OFF</b></div>';
    }
    rs.innerHTML = stats;
    document.getElementById('btnNext').style.display = (G.missionIndex < WW.MISSION_DEFS.length - 1) ? '' : 'none';
    screens.result.classList.remove('hidden');
  }

  /* ---------------- UI ---------------- */
  function hideScreens() {
    for (var k in screens) if (screens[k]) screens[k].classList.add('hidden');
  }

  function buildMissionCards() {
    var grid = document.getElementById('missionGrid');
    var html = '';
    for (var i = 0; i < WW.MISSION_DEFS.length; i++) {
      var d = WW.MISSION_DEFS[i];
      var gates = 0;
      for (var s = 0; s < d.stages.length; s++) if (d.stages[s].type === 'rings') gates += d.stages[s].rings.length;
      var mins = Math.round((d.medal.silver + 40) / 60);
      html += '<button type="button" class="mCard" data-idx="' + i + '">' +
        '<div class="thumb" style="background:linear-gradient(180deg,' + d.art[0] + ',' + d.art[1] + ')">' +
        '<div class="sun" style="width:54px;height:54px;left:22%;top:46%;background:radial-gradient(circle,' + d.art[2] + ',rgba(255,220,170,0));"></div>' +
        '<div class="haze" style="background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(10,16,20,0.75))"></div>' +
        '<span class="num">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' +
        '<span class="wx">' + d.wx + '</span></div>' +
        '<div class="cbody"><h3>' + d.name + '</h3><p>' + d.sub + '</p>' +
        '<div class="cmeta"><span>' + gates + ' GATES</span><span>~' + mins + ' MIN</span></div></div></button>';
    }
    grid.innerHTML = html;
    var cards = grid.querySelectorAll('.mCard');
    for (var c = 0; c < cards.length; c++) {
      cards[c].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-idx'), 10);
        showBrief(idx);
      });
    }
  }

  function showBrief(idx) {
    var d = WW.MISSION_DEFS[idx];
    G.missionIndex = idx;
    hideScreens();
    G.state = 'brief';
    var art = document.getElementById('briefArt');
    art.style.background = 'linear-gradient(180deg,' + d.art[0] + ' 0%, ' + d.art[1] + ' 62%, ' + d.art[2] + ' 100%)';
    var tag = document.getElementById('briefArtTag');
    tag.textContent = d.wx + ' · ' + d.sub.toUpperCase();
    document.getElementById('briefKicker').textContent = 'SORTIE ' + (idx < 9 ? '0' : '') + (idx + 1);
    document.getElementById('briefTitle').textContent = d.name;
    document.getElementById('briefMeta').innerHTML = d.meta.map(function (m) { return '<span>' + m + '</span>'; }).join('');
    document.getElementById('briefText').textContent = d.brief;
    var objs = d.stages.map(function (s) { return '<li>' + s.text + '</li>'; }).join('');
    document.getElementById('briefObjs').innerHTML = objs;
    screens.brief.classList.remove('hidden');
  }

  function wireUI() {
    document.getElementById('btnStart').addEventListener('click', function () {
      audio.resume();
      audio.chime(true);
      hideScreens();
      G.state = 'menu';
      screens.missions.classList.remove('hidden');
    });
    document.getElementById('btnControls').addEventListener('click', function () {
      screens.help.classList.remove('hidden');
    });
    document.getElementById('btnCloseHelp').addEventListener('click', function () {
      screens.help.classList.add('hidden');
    });
    document.getElementById('btnBackTitle').addEventListener('click', backToTitle);
    document.getElementById('btnBackMissions').addEventListener('click', function () {
      hideScreens(); G.state = 'menu'; screens.missions.classList.remove('hidden');
    });
    document.getElementById('btnLaunch').addEventListener('click', function () { startMission(WW.MISSION_DEFS[G.missionIndex]); });
    document.getElementById('btnRetry').addEventListener('click', function () { startMission(WW.MISSION_DEFS[G.missionIndex]); });
    document.getElementById('btnNext').addEventListener('click', function () {
      G.missionIndex = Math.min(WW.MISSION_DEFS.length - 1, G.missionIndex + 1);
      showBrief(G.missionIndex);
    });
    document.getElementById('btnBoard').addEventListener('click', function () {
      hideScreens(); G.state = 'menu'; screens.missions.classList.remove('hidden');
    });
    document.getElementById('btnResume').addEventListener('click', function () { resume(); });
    document.getElementById('btnRestart').addEventListener('click', function () { startMission(WW.MISSION_DEFS[G.missionIndex]); });
    document.getElementById('btnQuit').addEventListener('click', function () {
      hideScreens(); G.state = 'menu'; hud.show(false);
      document.getElementById('touch').classList.add('hidden');
      screens.missions.classList.remove('hidden');
      sky.setPreset('day');
    });
  }

  function backToTitle() {
    hideScreens();
    G.state = 'attract';
    hud.show(false);
    document.getElementById('touch').classList.add('hidden');
    sky.setPreset('day');
    rig.setMode('cinematic');
    aircraft.reset({ x: 0, z: 0, y: 500, hdg: 0, onGround: false, speed: 80, fuel: 1 });
    screens.title.classList.remove('hidden');
  }

  function buildHelp() {
    var rows = [
      ['Pitch (climb / dive)', 'W / S  ↑ ↓'],
      ['Roll (bank)', 'A / D  ← →'],
      ['Rudder', 'Q / E'],
      ['Throttle', 'R / F'],
      ['Boost', 'SPACE'],
      ['Camera chase / cockpit', 'C'],
      ['Landing gear', 'G'],
      ['Flaps', 'V'],
      ['Pause', 'P or ESC'],
      ['Restart sortie', 'R back to board'],
      ['Mute audio', 'M'],
      ['Performance readout', 'F3'],
      ['Mobile', 'left stick + throttle'],
      ['Landing', 'gear down, < 3 m/s sink']
    ];
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      html += '<div><span>' + rows[i][0] + '</span><b>' + rows[i][1] + '</b></div>';
    }
    document.getElementById('helpGrid').innerHTML = html;
    document.getElementById('pauseKeys').innerHTML = html;
  }

  function vehicleView(v) {
    G.view = v;
    aircraft.setView(v);
    rig.setMode(v);
  }

  function pause() {
    if (G.state !== 'fly') return;
    G.state = 'paused';
    screens.pause.classList.remove('hidden');
    document.getElementById('pauseTitle').textContent = G.def ? G.def.name : '';
    audio.update(0, { throttle: 0, speed: 0, engine: false });
  }

  function resume() {
    if (G.state !== 'paused') return;
    G.state = 'fly';
    screens.pause.classList.add('hidden');
    audio.resume();
  }

  /* ---------------- loop ---------------- */
  function loop() {
    requestAnimationFrame(loop);
    var now = performance.now();
    var dt = Math.min(0.05, (now - G.lastTime) / 1000);
    G.lastTime = now;
    G.frames++;
    G.fpsAcc += dt;
    if (G.fpsAcc > 0.5) {
      G.fps = Math.round(G.frames / G.fpsAcc);
      G.frames = 0; G.fpsAcc = 0;
      hud.setFps(G.fps + ' FPS · ' + renderer.info.render.calls + ' CALLS');
    }

    if (G.state === 'fly' || G.state === 'ending') updateFly(dt);
    else if (G.state === 'attract' || G.state === 'menu' || G.state === 'brief') {
      G.attractT += dt;
      placeAttract();
      rig.setMode('cinematic');
    }

    sky.update(dt, camera, { x: defWind().x, z: defWind().z });
    scenery.update(dt, camera.position);
    rig.update(dt, aircraft, { gust: defWind().gust });
    renderer.render(scene, camera);
    input.endFrame();
  }

  function defWind() {
    if (G.state === 'fly' && G.def) return G.def.wind || { x: 2, z: 1, gust: 0.1 };
    return { x: 3, z: 1, gust: 0.08 };
  }

  function updateFly(dt) {
    var def = G.def;

    if (input.pressed('KeyC')) vehicleView(G.view === 'chase' ? 'cockpit' : 'chase');
    if (input.pressed('KeyG') || input.pressed('TOUCH_gear')) { aircraft.toggleGear(); audio.gear(); }
    if (input.pressed('KeyV') || input.pressed('TOUCH_flap')) aircraft.toggleFlaps();
    if (input.pressed('TOUCH_cam')) vehicleView(G.view === 'chase' ? 'cockpit' : 'chase');
    if (input.pressed('KeyP') || input.pressed('Escape')) { pause(); return; }
    if (input.pressed('KeyM')) audio.setMuted(!audio.muted);
    if (input.pressed('F3')) hud.el.fps.classList.toggle('hidden');

    if (G.freeze) {
      rig.update(dt, aircraft, { gust: 0 });
      hud.update(dt, aircraft, runner, { view: G.view });
      gaugeAcc += dt;
      if (G.view === 'cockpit' && gaugeAcc > 0.16) { gaugeAcc = 0; aircraft.drawGauges(); }
      return;
    }

    var ax = input.axes();
    var throttle = input.isTouch ? input.touch.throttle : U.clamp(aircraft.throttle + ax.throttleDelta * dt * 0.55, 0, 1);
    var wind = def.wind || { x: 2, z: 1, gust: 0.1 };
    aircraft.update(dt, {
      pitch: ax.pitch, roll: ax.roll, yaw: ax.yaw,
      throttle: throttle, boost: ax.boost, brake: ax.brake
    }, { wind: wind, gust: wind.gust || 0.1 });

    var evs = aircraft.consumeEvents();
    for (var i = 0; i < evs.length; i++) {
      var ev = evs[i];
      if (ev.type === 'liftoff') { audio.chime(true); hud.radio('Positive rate, gear up.', 'WREN IV'); }
      else if (ev.type === 'touchdown') {
        audio.impact(Math.min(1, Math.abs(ev.quality.vs) / 8));
        if (ev.quality.hard) hud.radio('That was firm. Inspectors will hear about it.', 'SOLMERE');
        else hud.radio('Nice landing. Welcome back.', 'SOLMERE');
      } else if (ev.type === 'crash') {
        audio.impact(1);
        hud.radio('Wren four, we lost you — say again!', 'SOLMERE');
      }
    }

    var out = runner.update(dt, aircraft);
    if (out) {
      if (out.ringPassed) audio.chime(true);
      if (out.stageAdvance) {
        audio.blip(880, 0.2, 'sine', 0.07);
        if (out.stageDef && out.stageDef.text) hud.radio(out.stageDef.text, 'OPS');
        else hud.radio('All gates cleared. Bring her home.', 'OPS');
      }
      if (out.failed) {
        if (out.failed.reason !== 'crash') finishMission(false, out.failed.reason);
      } else if (out.missionComplete) {
        finishMission(true);
      }
    }

    if (aircraft.crashed && G.state === 'fly') {
      G.ending += dt;
      if (G.ending > 1.6) finishMission(false, 'crash');
    }

    hud.update(dt, aircraft, runner, { view: G.view });
    gaugeAcc += dt;
    if (G.view === 'cockpit' && gaugeAcc > 0.16) { gaugeAcc = 0; aircraft.drawGauges(); }
    audio.update(dt, {
      throttle: aircraft.throttle, speed: aircraft.speed,
      stall: aircraft.warn.stall, warn: aircraft.warn.damage || aircraft.warn.fuel,
      storm: sky.isStorm, night: sky.isNight, engine: aircraft.engineOn
    });
  }

  /* ---------------- debug hooks (used for stills / QA) ---------------- */
  var debugRing = 0;
  function debugJumpRing(idx, back) {
    var ring = runner.rings[idx];
    if (!ring) return false;
    debugRing = idx;
    back = back || 150;
    var p = ring.pos.clone().addScaledVector(ring.dir, -back);
    var hdg = U.bearingTo(p.x, p.z, ring.pos.x, ring.pos.z);
    aircraft.pos.copy(p);
    var pitch = Math.asin(U.clamp(ring.dir.y, -0.4, 0.4));
    aircraft.quat.setFromEuler(new THREE.Euler(pitch, -hdg * U.DEG, -0.1, 'YXZ'));
    aircraft.speed = 88;
    aircraft.throttle = 0.72;
    aircraft.onGround = false;
    aircraft.agl = aircraft.pos.y - Math.max(terrain.heightAt(aircraft.pos.x, aircraft.pos.z), 0);
    aircraft.groundY = Math.max(terrain.heightAt(aircraft.pos.x, aircraft.pos.z), 0);
    aircraft.velY = -0.4;
    aircraft.obj.position.copy(aircraft.pos);
    aircraft.obj.quaternion.copy(aircraft.quat);
    rig.forceSnap();
    return true;
  }

  window.WINDWARD = {
    get state() { return G.state; },
    get def() { return G.def; },
    screens: screens,
    get terrain() { return terrain; },
    get aircraft() { return aircraft; },
    get runner() { return runner; },
    start: function (idx) { startMission(WW.MISSION_DEFS[idx]); },
    view: function (v) { vehicleView(v); },
    debug: {
      jumpRing: debugJumpRing,
      teleport: function (x, z, alt, hdg) {
        var gh = Math.max(terrain.heightAt(x, z), 0);
        aircraft.pos.set(x, gh + (alt || 150), z);
        aircraft.quat.setFromEuler(new THREE.Euler(0, -(hdg || 0) * U.DEG, 0, 'YXZ'));
        aircraft.speed = 90;
        aircraft.onGround = false;
        aircraft.obj.position.copy(aircraft.pos);
        aircraft.obj.quaternion.copy(aircraft.quat);
        rig.forceSnap();
      },
      freeze: function (v) { G.freeze = !!v; },
      time: function (t) { runner.time = t; },
      setup: function (o) {
        if (o.preset) sky.setPreset(o.preset);
        aircraft.reset({ x: o.x, z: o.z, y: 0, hdg: o.hdg || 0, onGround: false, fuel: o.fuel === undefined ? 1 : o.fuel, speed: o.speed || 92 });
        aircraft.pos.y = Math.max(terrain.heightAt(o.x, o.z), 0) + (o.alt === undefined ? 300 : o.alt);
        aircraft.speed = o.speed || 92;
        aircraft.throttle = o.throttle === undefined ? 0.7 : o.throttle;
        aircraft.onGround = false;
        aircraft.velY = 0;
        aircraft.agl = aircraft.pos.y - Math.max(terrain.heightAt(o.x, o.z), 0);
        aircraft.groundY = Math.max(terrain.heightAt(o.x, o.z), 0);
        aircraft.quat.setFromEuler(new THREE.Euler(o.pitch || 0, -(o.hdg || 0) * U.DEG, o.bank || 0, 'YXZ'));
        aircraft.obj.position.copy(aircraft.pos);
        aircraft.obj.quaternion.copy(aircraft.quat);
        vehicleView(o.view || 'chase');
        rig.forceSnap();
        G.freeze = true;
        hud.show(o.hud !== false);
      },
      freeCam: function (x, y, z, tx, ty, tz, fov) {
        rig.setMode('free');
        camera.position.set(x, y, z);
        camera.up.set(0, 1, 0);
        camera.lookAt(new THREE.Vector3(tx, ty, tz));
        camera.fov = fov || 55;
        camera.updateProjectionMatrix();
        G.freeze = true;
      },
      stage: function (i) {
        runner.stage = i;
        var st = runner.def.stages[i];
        runner.buildStageRings(st);
        if (st && st.type === 'reach') runner.buildReachMarker(st);
        return [runner.ringStageStart, runner.ringStageEnd];
      },
      hud: function (v) { hud.show(v); },
      view: function (v) { vehicleView(v); },
      fuel: function (f) { aircraft.fuel = f; },
      mission3: function (idx) { G.missionIndex = idx; startMission(WW.MISSION_DEFS[idx]); },
      ringAt: function (i) { var r = runner.rings[i]; return r ? [r.pos.x, r.pos.y, r.pos.z] : null; },
      ringDir: function (i) { var r = runner.rings[i]; return r ? [r.dir.x, r.dir.y, r.dir.z] : null; },
      project: function (which) {
        var v = which === 'ring' ? (runner.rings[debugRing] && runner.rings[debugRing].pos) : aircraft.pos;
        if (!v) return null;
        var p = v.clone().project(camera);
        return [Math.round((p.x * 0.5 + 0.5) * 1280), Math.round((1 - (p.y * 0.5 + 0.5)) * 720)];
      },
      probe: function (x, z) {
        var g = terrain.mesh.geometry;
        var pos = g.attributes.position, col = g.attributes.color, nrm = g.attributes.normal;
        var best = -1, bd = 1e18;
        for (var i = 0; i < pos.count; i += 1) {
          var dx = pos.getX(i) - x, dz = pos.getZ(i) - z;
          var d = dx * dx + dz * dz;
          if (d < bd) { bd = d; best = i; }
        }
        return {
          h: terrain.heightAt(x, z),
          vy: pos.getY(best),
          y: pos.getY(best),
          color: [col.getX(best), col.getY(best), col.getZ(best)],
          normal: [nrm.getX(best), nrm.getY(best), nrm.getZ(best)],
          idx: best
        };
      },
      terrainBasic: function (on) {
        if (!window.__basicMat) {
          window.__basicMat = new THREE.MeshBasicMaterial({ vertexColors: true });
        }
        terrain.mesh.material = on ? window.__basicMat : window.__lambertMat;
      },
      hideScenery: function (on) { scenery.group.visible = !on; },
      hideSky: function (on) { sky.sky.visible = !on; sky.cloudGroup.visible = !on; },
      info: function () {
        return {
          fps: G.fps, state: G.state, speed: aircraft.speed, alt: aircraft.pos.y,
          agl: aircraft.agl, hdg: aircraft.heading(), damage: aircraft.damage,
          fuel: aircraft.fuel, rings: runner.ringsPassed, calls: renderer.info.render.calls,
          tris: renderer.info.render.triangles, crashed: aircraft.crashed
        };
      }
    }
  };

  window.addEventListener('error', function (e) {
    if (el.loading) el.loading.classList.add('hidden');
    console.error('WINDWARD error:', e.message);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
