/* WINDWARD — mission board, air gates and objectives */
(function () {
  'use strict';
  var WW = window.WW, U = WW.U;
  var RING_R = 25;

  function r(x, z, clear, y) { return { x: x, z: z, clear: clear, y: y }; }

  var DEFS = [
    {
      id: 'dawn-circuit', num: 1, name: 'Dawn Circuit', wx: 'DAWN · CALM',
      preset: 'dawn', art: ['#3f6f9a', '#ffc99a', '#ffe6bd'],
      sub: 'Solmere Field · training flight',
      brief: 'The harbour is still grey and the thermals have not woken. Take the Wren off runway 09, work four gates around Solmere bay, then set her back down — gently, the inspector is watching.',
      meta: ['RUNWAY 09', 'GATES 4', 'WIND 3 KT'],
      radio: [{ text: 'Solmere Tower, Wren four departing runway zero-nine.', who: 'WREN IV' },
      { text: 'Wren four, wind calm. Report the bay inbound.', who: 'SOLMERE' }],
      start: { strip: 'solmere', onGround: true, fuel: 1 },
      wind: { x: 2.6, z: -1.2, gust: 0.06 },
      limit: 0,
      medal: { gold: 130, silver: 190 },
      stages: [
        { type: 'takeoff', text: 'Take off from Solmere Field' },
        {
          type: 'rings', text: 'Fly the harbour gates', rings: [
            r(1550, 1050, 120), r(2250, 1450, 110), r(1700, 2150, 105), r(700, 1350, 100), r(320, 700, 65)
          ]
        },
        { type: 'land', text: 'Land back at Solmere Field', strip: 'solmere' }
      ]
    },
    {
      id: 'sanderling-run', num: 2, name: 'The Sanderling Run', wx: 'SUNSET · LIGHT AIRS',
      preset: 'sunset', art: ['#4a4f7d', '#ffb173', '#ffd9a0'],
      sub: 'Postal run to Sanderling Cay',
      brief: 'Six crates of Solmere mail and a bag of seed catalogues for the cay. Follow the coast north-east, keep the gates on your left shoulder, and land on the grass strip before the light goes.',
      meta: ['GATES 6', 'STRIP: GRASS', 'FUEL 95%'],
      radio: [{ text: 'Sanderling Cay, this is Wren four, mail aboard, inbound from Solmere.', who: 'WREN IV' },
      { text: 'We hear you. Mind the trees on finals, they have grown.', who: 'SANDERLING CAY' }],
      start: { strip: 'solmere', onGround: true, fuel: 0.95 },
      wind: { x: 3.4, z: -2.2, gust: 0.12 },
      limit: 0,
      medal: { gold: 240, silver: 320 },
      stages: [
        { type: 'takeoff', text: 'Lift off from Solmere Field' },
        {
          type: 'rings', text: 'Fly the coast to Sanderling Cay', rings: [
            r(1500, 300, 130), r(2400, 150, 160), r(3250, 700, 180),
            r(3600, 1650, 200), r(3950, 2600, 165), r(4320, 3320, 110)
          ]
        },
        { type: 'land', text: 'Land at Sanderling Cay strip', strip: 'sanderling' }
      ]
    },
    {
      id: 'bellrock', num: 3, name: 'Bellrock Slalom', wx: 'GOLDEN HOUR · CHOPPY',
      preset: 'sunset', art: ['#5b4a63', '#ff9d5c', '#ffd08a'],
      sub: 'Timed run through the canyon',
      brief: 'Bellrock cuts the island in half and the air inside it is a river. Nine gates, one pass, no second chances before the guard rail. Judges clock you from entry to exit — four minutes.',
      meta: ['GATES 9', 'LIMIT 4:00', 'LOW LEVEL'],
      radio: [{ text: 'Slalom clock starts at the first gate. Do not become part of the canyon.', who: 'RACE CONTROL' }],
      start: { x: -6850, y: 0, z: 2420, hdg: 114, onGround: false, fuel: 0.9, speed: 88, alt: 120 },
      wind: { x: 2.0, z: 2.8, gust: 0.3 },
      limit: 240,
      medal: { gold: 95, silver: 135 },
      stages: [
        {
          type: 'rings', text: 'Thread the canyon gates', rings: [
            r(-6350, 2870, 62), r(-5850, 3020, 58), r(-5350, 3120, 55), r(-4850, 3300, 58),
            r(-4400, 3480, 60), r(-3950, 3620, 58), r(-3520, 3810, 60), r(-3100, 3980, 62),
            r(-2680, 4200, 70)
          ]
        },
        { type: 'land', text: 'Land at Solmere Field', strip: 'solmere' }
      ]
    },
    {
      id: 'night-watch', num: 4, name: 'Night Watch', wx: 'NIGHT · CLEAR',
      preset: 'night', art: ['#0b1526', '#183a58', '#ffd9a0'],
      sub: 'Beacon check over the Halcyon strait',
      brief: 'Halcyon light has been dark for two nights and the islanders are asking. Fly the strait on instruments and beacons, confirm the lamp is turning, then bring the Wren home on a quarter tank. The runway lights are lit.',
      meta: ['GATES 5', 'NIGHT', 'FUEL 55%'],
      radio: [{ text: 'Halcyon light is blinking again. Thank you, Wren.', who: 'HALCYON' },
      { text: 'Solmere, Wren four returning low on fuel.', who: 'WREN IV' }],
      start: { x: -1600, y: 0, z: -4100, hdg: 130, onGround: false, fuel: 0.55, speed: 92, alt: 320 },
      wind: { x: -3.2, z: -1.5, gust: 0.1 },
      limit: 0,
      medal: { gold: 175, silver: 235 },
      stages: [
        {
          type: 'rings', text: 'Fly the strait beacons', rings: [
            r(-1000, -3900, 200), r(-250, -3300, 220), r(350, -2400, 230),
            r(800, -1300, 200), r(750, -300, 150), r(330, 620, 70)
          ]
        },
        { type: 'land', text: 'Land at Solmere Field', strip: 'solmere' }
      ]
    },
    {
      id: 'storm-front', num: 5, name: 'Storm Front', wx: 'SQUALL · CROSSWIND',
      preset: 'storm', art: ['#37424a', '#8a969a', '#c8d2d2'],
      sub: 'Squall line search · trawler Merle',
      brief: 'The trawler Merle lost her engine inside the squall. Six gates through the rain will put you over her, then turn for home with a fourteen knot crosswind. Trust the instruments, not your stomach.',
      meta: ['GATES 6', 'WIND 14 KT', 'RAIN'],
      radio: [{ text: 'Merle, we have you on the scope. Keep your lamp lit.', who: 'WREN IV' },
      { text: 'Lamp is lit. Hurry.', who: 'MERLE' }],
      start: { x: 1350, y: 0, z: 350, hdg: 160, onGround: false, fuel: 0.8, speed: 96, alt: 280 },
      wind: { x: 7.5, z: 2.5, gust: 0.8 },
      limit: 260,
      medal: { gold: 140, silver: 200 },
      stages: [
        {
          type: 'rings', text: 'Fly the squall gates', rings: [
            r(1550, -650, 160), r(2050, -1450, 190), r(2500, -2300, 210),
            r(2150, -3250, 200), r(1350, -2900, 200), r(1050, -1800, 190)
          ]
        },
        { type: 'land', text: 'Land at Solmere Field', strip: 'solmere' }
      ]
    },
    {
      id: 'ember-survey', num: 6, name: 'Ember Survey', wx: 'DUSK · TURBULENT',
      preset: 'dusk', art: ['#2a2547', '#b96a54', '#ffb98a'],
      sub: 'Volcano spiral · ash sampling',
      brief: 'Ember is grumbling again and the observatory wants numbers, not guesses. Take the Wren up the ash column in a rising spiral, seven gates, and do not stall her in the hot air. Then run for Solmere before the last light.',
      meta: ['GATES 7 + 1', 'TURBULENCE', 'ALT 900 M'],
      radio: [{ text: 'Ember is venting. You have maybe ten minutes of clean air.', who: 'OBSERVATORY' }],
      start: { x: 1100, y: 0, z: -3300, hdg: 250, onGround: false, fuel: 0.9, speed: 90, alt: 420 },
      wind: { x: -4.5, z: -3.0, gust: 0.55 },
      limit: 0,
      medal: { gold: 210, silver: 280 },
      stages: [
        {
          type: 'rings', text: 'Climb the ash spiral', rings: [
            r(3550, -4300, 0, 590), r(3450, -5000, 0, 675), r(2700, -5280, 0, 760),
            r(2050, -4700, 0, 840), r(2250, -3950, 0, 905), r(3050, -3750, 0, 900),
            r(3700, -4400, 0, 820), r(2900, -5800, 0, 700), r(2300, -1800, 0, 600)
          ]
        },
        { type: 'land', text: 'Land at Solmere Field', strip: 'solmere' }
      ]
    },
    {
      id: 'halcyon-mail', num: 7, name: 'Halcyon Mail', wx: 'DAY · FAIR',
      preset: 'day', art: ['#2c6f9e', '#cfe4e0', '#fff3d0'],
      sub: 'Airship rendezvous',
      brief: 'The airship Halcyon is holding off the western reef. Fly up her lee side, drop the mail bag through her gate, then take the long way home by the four bay gates. Wave at the skipper.',
      meta: ['GATES 1 + 4', 'AIRSHIP', 'WIND 6 KT'],
      radio: [{ text: 'Halcyon, Wren four on your lee side, mail ready.', who: 'WREN IV' },
      { text: 'We have the hatch open. Try not to hit the envelope.', who: 'HALCYON' }],
      start: { x: -1000, y: 0, z: -1100, hdg: 40, onGround: false, fuel: 0.9, speed: 88, alt: 380 },
      wind: { x: 4.0, z: -3.0, gust: 0.15 },
      limit: 0,
      medal: { gold: 190, silver: 260 },
      stages: [
        { type: 'reach', text: 'Rendezvous with airship Halcyon', pos: { x: -600, z: -1650, y: 520 }, radius: 150 },
        {
          type: 'rings', text: 'Return by the bay gates', rings: [
            r(200, -500, 220), r(900, 300, 180), r(1900, 900, 140), r(1950, 1800, 120), r(330, 700, 65)
          ]
        },
        { type: 'land', text: 'Land at Solmere Field', strip: 'solmere' }
      ]
    },
    {
      id: 'last-light', num: 8, name: 'Last Light', wx: 'NIGHT · LONG HAUL',
      preset: 'night', art: ['#080f1c', '#1c3450', '#f0c9a0'],
      sub: 'Grand tour · the whole reach',
      brief: 'One last circuit before the season ends: Ember, Halcyon light, the strait, the bay. Ten gates and a short tank. The islands will be dark, the beacons will not.',
      meta: ['GATES 10', 'NIGHT', 'FUEL 72%'],
      radio: [{ text: 'All stations, Wren four on a reach circuit. Wish us luck.', who: 'WREN IV' }],
      start: { strip: 'solmere', onGround: true, fuel: 0.72 },
      wind: { x: -3.0, z: -2.0, gust: 0.2 },
      limit: 0,
      medal: { gold: 330, silver: 420 },
      stages: [
        { type: 'takeoff', text: 'Take off from Solmere Field' },
        {
          type: 'rings', text: 'Fly the reach circuit', rings: [
            r(1200, -900, 250), r(2300, -2400, 300), r(3300, -3500, 0, 700),
            r(1700, -4300, 260), r(-500, -4300, 300), r(-1450, -3900, 280),
            r(-900, -2200, 320), r(400, -1200, 300), r(1100, 100, 220), r(350, 650, 70)
          ]
        },
        { type: 'land', text: 'Land at Solmere Field', strip: 'solmere' }
      ]
    }
  ];

  var RING_GEO = null;

  function MissionRunner(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.rings = [];
    this.def = null;
    this.stage = 0;
    this.time = 0;
    this.state = 'idle';
    this.ringCount = 0;
    this.ringsPassed = 0;
    this.landingStage = null;
    this.reachMarker = null;
    this.reachDone = false;
    this.failReason = '';
    this.lastStageText = '';
    this.glowTex = U.glowTex(0.9);
    this.activeMat = new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.95 });
    this.doneMat = new THREE.MeshBasicMaterial({ color: 0x84e3a8, transparent: true, opacity: 0.55 });
  }

  MissionRunner.prototype.clear = function () {
    while (this.group.children.length) {
      var c = this.group.children.pop();
      c.traverse(function (o) {
        if (o.geometry && o.geometry !== RING_GEO) o.geometry.dispose();
        if (o.material && o.material.map && o.material.map.dispose) { /* shared glow tex kept */ }
      });
    }
    this.rings.length = 0;
    this.reachMarker = null;
  };

  MissionRunner.prototype.load = function (def) {
    this.clear();
    this.def = def;
    this.stage = 0;
    this.time = 0;
    this.state = 'flying';
    this.ringsPassed = 0;
    this.reachDone = false;
    this.failReason = '';
    this.ringCount = 0;
    var stages = def.stages;
    for (var s = 0; s < stages.length; s++) if (stages[s].type === 'rings') this.ringCount += stages[s].rings.length;
    this.buildStageRings(stages[0]);
  };

  MissionRunner.prototype.buildStageRings = function (stage) {
    if (!stage || stage.type !== 'rings') {
      for (var h = 0; h < this.rings.length; h++) this.rings[h].mesh.visible = false;
      this.ringStageStart = this.rings.length;
      this.ringStageEnd = this.rings.length;
      return;
    }
    var self = this;
    var specs = stage.rings;
    for (var i = 0; i < specs.length; i++) {
      var sp = specs[i];
      var y = sp.y !== undefined ? sp.y : Math.max(this.terrain.heightAt(sp.x, sp.z), 0) + (sp.clear === undefined ? 90 : sp.clear);
      var pos = new THREE.Vector3(sp.x, y, sp.z);
      var next = specs[i + 1];
      var dir;
      if (next) {
        var ny = next.y !== undefined ? next.y : Math.max(this.terrain.heightAt(next.x, next.z), 0) + (next.clear === undefined ? 90 : next.clear);
        dir = new THREE.Vector3(next.x - pos.x, ny - pos.y, next.z - pos.z).normalize();
      } else {
        dir = new THREE.Vector3(0, 0, i > 0 ? 0 : 1);
        if (i > 0) {
          var prev = this.rings[this.rings.length - 1];
          if (prev) dir.copy(prev.dir);
        }
      }

      var g = new THREE.Group();
      g.position.copy(pos);
      if (dir.lengthSq() > 0.01) g.lookAt(pos.clone().add(dir));
      var torus = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 1.85, 7, 26), this.activeMat);
      g.add(torus);
      var torus2 = new THREE.Mesh(new THREE.TorusGeometry(RING_R - 4.2, 0.45, 5, 24), this.activeMat);
      torus2.material = new THREE.MeshBasicMaterial({ color: 0xffe1a8, transparent: true, opacity: 0.45 });
      g.add(torus2);
      var glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTex, color: 0xffb95e, transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      glow.scale.set(RING_R * 3.6, RING_R * 3.6, 1);
      g.add(glow);
      this.group.add(g);
      var ring = {
        pos: pos, dir: dir, mesh: g, torus: torus, torus2: torus2, glow: glow,
        passed: false, index: i, radius: RING_R, prevAlong: null
      };
      this.rings.push(ring);
    }
    this.ringStageStart = this.rings.length - specs.length;
    this.ringStageEnd = this.rings.length;
    this.updateRingAppearance();
  };

  MissionRunner.prototype.updateRingAppearance = function () {
    for (var i = 0; i < this.rings.length; i++) {
      var ring = this.rings[i];
      var active = i >= this.ringStageStart && i < this.ringStageEnd;
      ring.mesh.visible = active;
      ring.torus.material = ring.passed ? this.doneMat : this.activeMat;
      ring.torus2.material.color.setHex(ring.passed ? 0x9ff0bc : 0xffe1a8);
      ring.torus2.material.opacity = ring.passed ? 0.25 : 0.45;
      ring.glow.material.color.setHex(ring.passed ? 0x6be09a : 0xffb95e);
      ring.glow.material.opacity = ring.passed ? 0.06 : 0.22;
    }
  };

  MissionRunner.prototype.stageDef = function () { return this.def ? this.def.stages[this.stage] : null; };

  MissionRunner.prototype.advanceStage = function () {
    this.stage++;
    this.reachDone = false;
    var st = this.stageDef();
    if (!st) {
      this.state = 'complete';
      return { missionComplete: true };
    }
    this.buildStageRings(st);
    if (st.type === 'reach') this.buildReachMarker(st);
    return { stageAdvance: true, text: st.text };
  };

  MissionRunner.prototype.buildReachMarker = function (st) {
    var g = new THREE.Group();
    g.position.set(st.pos.x, st.pos.y, st.pos.z);
    var shell = new THREE.Mesh(new THREE.SphereGeometry(st.radius * 0.86, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
    g.add(shell);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(st.radius * 0.9, 1.2, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.6 }));
    g.add(ring);
    ring.rotation.x = Math.PI / 2;
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex, color: 0xffca80, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    glow.scale.set(st.radius * 4, st.radius * 4, 1);
    g.add(glow);
    this.group.add(g);
    this.reachMarker = { group: g, radius: st.radius, pos: g.position, stage: st };
  };

  MissionRunner.prototype.fail = function (reason) {
    if (this.state !== 'flying') return { failed: true, reason: reason };
    this.state = 'failed';
    this.failReason = reason;
    return { failed: true, reason: reason };
  };

  MissionRunner.prototype.ringPassCheck = function (ac) {
    if (!ac || this.state !== 'flying') return null;
    var st = this.stageDef();
    if (!st || st.type !== 'rings') return null;
    var p = ac.pos;
    for (var i = this.ringStageStart; i < this.ringStageEnd; i++) {
      var ring = this.rings[i];
      if (ring.passed) continue;
      var rx = p.x - ring.pos.x, ry = p.y - ring.pos.y, rz = p.z - ring.pos.z;
      var along = rx * ring.dir.x + ry * ring.dir.y + rz * ring.dir.z;
      var radialSq = rx * rx + ry * ry + rz * rz - along * along;
      if (radialSq < ring.radius * ring.radius && Math.abs(along) < 14) {
        ring.passed = true;
        this.ringsPassed++;
        this.updateRingAppearance();
        var allDone = true;
        for (var k = this.ringStageStart; k < this.ringStageEnd; k++) if (!this.rings[k].passed) allDone = false;
        if (allDone) {
          var res = this.advanceStage();
          return { ringPassed: ring, allRings: true, stage: res };
        }
        return { ringPassed: ring };
      }
    }
    return null;
  };

  MissionRunner.prototype.update = function (dt, ac) {
    if (this.state !== 'flying') return null;
    this.time += dt;
    var out = { time: this.time };
    var st = this.stageDef();
    if (!st) return out;

    /* animate the active gates */
    var pulse = 1 + Math.sin(this.time * 3.4) * 0.035;
    for (var i = 0; i < this.rings.length; i++) {
      var ring = this.rings[i];
      if (!ring.mesh.visible) continue;
      if (!ring.passed) {
        ring.torus.scale.setScalar(pulse);
        ring.glow.material.opacity = 0.18 + Math.sin(this.time * 3.4 + i) * 0.06;
      } else {
        ring.torus.scale.setScalar(1);
      }
    }
    if (this.reachMarker) {
      this.reachMarker.group.rotation.y += dt * 0.5;
      var s = 1 + Math.sin(this.time * 2.2) * 0.04;
      this.reachMarker.group.scale.setScalar(s);
    }

    if (this.def.limit && this.time > this.def.limit) {
      out.failed = this.fail('time');
      return out;
    }

    if (ac.crashed) {
      out.failed = this.fail('crash');
      return out;
    }

    var pass = this.ringPassCheck(ac);
    if (pass) {
      out.ringPassed = pass.ringPassed;
      out.ringsPassed = this.ringsPassed;
      if (pass.allRings) {
        out.stageAdvance = true;
        out.stageDef = pass.stage;
        if (pass.stage && pass.stage.missionComplete) out.missionComplete = true;
      }
    }

    if (st.type === 'takeoff') {
      if (!ac.onGround && ac.agl > 28) {
        out.stageAdvance = true;
        var res = this.advanceStage();
        out.stageDef = res;
        if (res.missionComplete) out.missionComplete = true;
      }
    } else if (st.type === 'reach') {
      if (this.reachMarker) {
        var d = ac.pos.distanceTo(this.reachMarker.pos);
        if (d < this.reachMarker.radius) {
          out.reachDone = true;
          this.reachDone = true;
          this.group.remove(this.reachMarker.group);
          this.reachMarker = null;
          var res2 = this.advanceStage();
          out.stageAdvance = true;
          out.stageDef = res2;
          if (res2.missionComplete) out.missionComplete = true;
        }
      }
    } else if (st.type === 'land') {
      if (ac.onGround) {
        var lq = ac.landedQuality;
        var okStrip = lq && lq.strip === st.strip;
        if (!okStrip && ac.onStrip && ac.onStrip.id === st.strip && ac.agl < 3) okStrip = true;
        if (okStrip && !out.missionComplete) {
          this.landingQuality = lq || { quality: 0.6, vs: -1, centre: 0, hdg: 0 };
          this.state = 'complete';
          out.missionComplete = true;
        }
      }
    }
    return out;
  };

  MissionRunner.prototype.target = function (ac) {
    var st = this.stageDef();
    if (!st) return null;
    if (st.type === 'takeoff' && this.def.start && this.def.start.strip) {
      for (var ts = 0; ts < this.terrain.strips.length; ts++) {
        var tstrip = this.terrain.strips[ts];
        if (tstrip.id === this.def.start.strip) {
          var tp = new THREE.Vector3(tstrip.x, tstrip.elev + 20, tstrip.z);
          return { pos: tp, label: 'RUNWAY', dist: ac.pos.distanceTo(tp) };
        }
      }
    }
    if (st.type === 'rings') {
      var best = null, bestD = 1e9;
      for (var i = this.ringStageStart; i < this.ringStageEnd; i++) {
        var ring = this.rings[i];
        if (ring.passed) continue;
        var d = ac.pos.distanceToSquared(ring.pos);
        if (d < bestD) { bestD = d; best = ring; }
      }
      return best ? { pos: best.pos, label: 'GATE', dist: Math.sqrt(bestD) } : null;
    }
    if (st.type === 'reach' && this.reachMarker) {
      return { pos: this.reachMarker.pos, label: 'AIRSHIP', dist: ac.pos.distanceTo(this.reachMarker.pos) };
    }
    if (st.type === 'land') {
      for (var s = 0; s < this.terrain.strips.length; s++) {
        var strip = this.terrain.strips[s];
        if (strip.id === st.strip) {
          var p = new THREE.Vector3(strip.x, strip.elev + 30, strip.z);
          return { pos: p, label: strip.name.toUpperCase(), dist: ac.pos.distanceTo(p) };
        }
      }
    }
    return null;
  };

  MissionRunner.prototype.mapRings = function () {
    var out = [];
    for (var i = this.ringStageStart || 0; i < (this.ringStageEnd || 0); i++) {
      var ring = this.rings[i];
      if (!ring) continue;
      out.push({ x: ring.pos.x, z: ring.pos.z, passed: ring.passed, active: true });
    }
    if (this.reachMarker) out.push({ x: this.reachMarker.pos.x, z: this.reachMarker.pos.z, reach: true });
    return out;
  };

  WW.MISSION_DEFS = DEFS;
  WW.MissionRunner = MissionRunner;
})();
