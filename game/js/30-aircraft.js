/* WINDWARD — Wren IV: airframe, cockpit, flight model */
(function () {
  'use strict';
  var WW = window.WW, U = WW.U;
  var AX_X = new THREE.Vector3(1, 0, 0);
  var AX_Y = new THREE.Vector3(0, 1, 0);
  var AX_Z = new THREE.Vector3(0, 0, 1);
  var qTmp = new THREE.Quaternion();
  var vTmp = new THREE.Vector3();
  var vTmp2 = new THREE.Vector3();

  var FM = {
    stallSpeed: 33,
    rotateSpeed: 47,
    maxSpeed: 168,
    cruise: 88,
    pitchRate: 1.02,
    rollRate: 2.5,
    yawRate: 0.55,
    thrust: 15.5
  };

  /* tapered lifting surface: span along X, chord along Z, thickness along Y */
  function taper(sign, span, rootChord, tipChord, thick, sweep, rise) {
    var x0 = sign * 0.55, x1 = sign * span;
    var zf0 = -rootChord * 0.5, zb0 = rootChord * 0.5;
    var zf1 = -tipChord * 0.5 + sweep, zb1 = tipChord * 0.5 + sweep;
    var t0 = thick * 0.5, t1 = thick * 0.32;
    var y0 = rise * 0.28, y1 = rise;
    var v = [
      x0, t0 + y0, zf0, x1, t1 + y1, zf1, x1, t1 + y1, zb1, x0, t0 + y0, zb0,
      x0, -t0 + y0, zf0, x1, -t1 + y1, zf1, x1, -t1 + y1, zb1, x0, -t0 + y0, zb0
    ];
    var idx = [
      0, 1, 2, 0, 2, 3,      /* top */
      4, 6, 5, 4, 7, 6,      /* bottom */
      0, 3, 7, 0, 7, 4,      /* root */
      1, 5, 6, 1, 6, 2,      /* tip */
      3, 2, 6, 3, 6, 7,      /* trailing edge */
      0, 4, 5, 0, 5, 1       /* leading edge */
    ];
    if (sign < 0) {
      for (var i = 0; i < idx.length; i += 3) {
        var tmp = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = tmp;
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function finGeo(height, rootChord, tipChord, thick, sweep) {
    var y0 = 0, y1 = height;
    var zf0 = -rootChord * 0.5, zb0 = rootChord * 0.5;
    var zf1 = -tipChord * 0.5 + sweep, zb1 = tipChord * 0.5 + sweep;
    var t = thick * 0.5;
    var v = [
      -t, y0, zf0, -t, y1, zf1, -t, y1, zb1, -t, y0, zb0,
      t, y0, zf0, t, y1, zf1, t, y1, zb1, t, y0, zb0
    ];
    var idx = [
      0, 1, 2, 0, 2, 3,
      4, 6, 5, 4, 7, 6,
      0, 3, 7, 0, 7, 4,
      1, 5, 6, 1, 6, 2,
      3, 2, 6, 3, 6, 7,
      0, 4, 5, 0, 5, 1
    ];
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function Aircraft(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.pos = new THREE.Vector3(950, 40, 700);
    this.quat = new THREE.Quaternion();
    this.speed = 0;
    this.throttle = 0;
    this.boost = 0;
    this.boostFuel = 1;
    this.pitchRate = 0; this.rollRate = 0; this.yawRate = 0;
    this.onGround = true;
    this.stalled = false;
    this.gearDown = 1; this.gearTarget = 1;
    this.flaps = 0; this.flapTarget = 0;
    this.fuel = 1;
    this.damage = 0;
    this.crashed = false;
    this.engineOn = true;
    this.gLoad = 1;
    this.velY = 0;
    this.groundGrace = 0;
    this.agl = 0;
    this.groundY = 0;
    this.overWater = false;
    this.onStrip = null;
    this.landedQuality = null;
    this.propAngle = 0;
    this.smokeTimer = 0;
    this.time = 0;
    this.warn = {};
    this.burnMult = 1;
    this.wind = new THREE.Vector3();
    this.gust = 0;
    this.events = [];
    this.shellParts = [];
    this.build();
    this.reset({ x: 950, z: 700, y: 0, hdg: 92, onGround: true });
  }

  Aircraft.prototype.build = function () {
    var g = new THREE.Group();
    this.obj = g;
    this.scene.add(g);

    /* everything outside the cockpit, hidden from the pilot's seat */
    var ext = new THREE.Group();
    this.ext = ext;
    g.add(ext);

    var cream = new THREE.MeshLambertMaterial({ color: 0xdfd3b6 });
    var creamDark = new THREE.MeshLambertMaterial({ color: 0xc3b795 });
    var teal = new THREE.MeshLambertMaterial({ color: 0x2a5f65 });
    var amber = new THREE.MeshLambertMaterial({ color: 0xdb9a44 });
    var dark = new THREE.MeshLambertMaterial({ color: 0x2e2b28 });
    var metal = new THREE.MeshLambertMaterial({ color: 0x9aa0a0 });
    var glass = new THREE.MeshPhongMaterial({
      color: 0x274d58, transparent: true, opacity: 0.7, shininess: 160,
      specular: 0xffffff, side: THREE.DoubleSide
    });

    /* ---- fuselage ---- */
    var body = new THREE.Mesh(new THREE.CapsuleGeometry(0.82, 4.4, 6, 16), cream);
    body.rotation.x = Math.PI / 2;
    ext.add(body);
    var tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.82, 2.6, 16, 1, true), cream);
    tailCone.rotation.x = -Math.PI / 2;
    tailCone.position.z = 3.3;
    ext.add(tailCone);
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.82, 16, 12), cream);
    nose.position.z = -3.1;
    nose.scale.set(1, 0.96, 1.18);
    ext.add(nose);
    var spinner = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.95, 12), amber);
    spinner.rotation.x = -Math.PI / 2;
    spinner.position.z = -4.05;
    ext.add(spinner);

    /* cheatline + registration band */
    for (var side = -1; side <= 1; side += 2) {
      var line = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 5.4), teal);
      line.position.set(side * 0.78, 0.06, 0.1);
      ext.add(line);
    }

    /* cabin windows */
    for (var win = 0; win < 3; win++) {
      for (var ws = -1; ws <= 1; ws += 2) {
        var w = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.34), dark);
        w.position.set(ws * 0.79, 0.16, -0.35 + win * 0.62);
        ext.add(w);
      }
    }

    /* ---- canopy ---- */
    var canopy = new THREE.Mesh(new THREE.SphereGeometry(0.78, 18, 14), glass);
    canopy.scale.set(0.92, 0.76, 1.8);
    canopy.position.set(0, 0.52, -0.95);
    ext.add(canopy);
    var canopyF = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.045, 6, 22, Math.PI), dark);
    canopyF.rotation.y = Math.PI / 2;
    canopyF.rotation.z = Math.PI / 2;
    canopyF.position.set(0, 0.52, -0.08);
    ext.add(canopyF);
    var canopyRear = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.4, 0.3), teal);
    canopyRear.position.set(0, 0.56, 0.42);
    ext.add(canopyRear);

    /* ---- wings (tapered, slight sweep and dihedral) ---- */
    this.flaps = 0;
    this.flapParts = [];
    this.wings = [];
    /* belly panel */
    var belly = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.22, 4.6), teal);
    belly.position.set(0, -0.62, 0.05);
    ext.add(belly);

    for (var s = -1; s <= 1; s += 2) {
      var wg = taper(s, 6.0, 2.4, 1.2, 0.44, 0.4, 0.2);
      var wing = new THREE.Mesh(wg, cream);
      wing.position.set(0, -0.18, -0.15);
      ext.add(wing);
      var fairing = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 2.5), cream);
      fairing.position.set(s * 0.92, -0.16, -0.15);
      ext.add(fairing);
      /* flap panel behind the trailing edge */
      var flapG = taper(s, 3.6, 0.62, 0.5, 0.1, 0, 0.08);
      var flap = new THREE.Mesh(flapG, creamDark);
      flap.position.set(0, -0.2, 1.26);
      ext.add(flap);
      this.flapParts.push(flap);
      /* wingtip stripe */
      var tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.46, 1.15), amber);
      tip.position.set(s * 5.78, -0.03, 0.32);
      ext.add(tip);
    }

    /* ---- tail ---- */
    var stabG = taper(1, 2.2, 1.4, 0.85, 0.18, 0.16, 0.04);
    var stabR = new THREE.Mesh(stabG, cream);
    stabR.position.set(0, 0.08, 2.95);
    ext.add(stabR);
    var stabL = new THREE.Mesh(taper(-1, 2.2, 1.4, 0.85, 0.18, 0.16, 0.04), cream);
    stabL.position.set(0, 0.08, 2.95);
    ext.add(stabL);
    var fin = new THREE.Mesh(finGeo(2.0, 1.7, 0.8, 0.17, 0.5), teal);
    fin.position.set(0, 0.55, 2.7);
    ext.add(fin);
    var finTip = new THREE.Mesh(finGeo(0.4, 0.74, 0.5, 0.175, 0.05), cream);
    finTip.position.set(0, 2.33, 2.88);
    ext.add(finTip);
    this.elevator = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.1, 0.42), creamDark);
    this.elevator.position.set(0, 0.32, 3.72);
    ext.add(this.elevator);
    this.rudder = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.42), creamDark);
    this.rudder.position.set(0, 1.2, 3.78);
    ext.add(this.rudder);

    /* ---- engines ---- */
    this.props = [];
    this.propDiscs = [];
    for (var e = -1; e <= 1; e += 2) {
      var nac = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 2.6, 12), creamDark);
      nac.rotation.x = Math.PI / 2;
      nac.position.set(e * 2.95, -0.42, -0.5);
      ext.add(nac);
      var cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.5, 0.55, 12), teal);
      cowl.rotation.x = Math.PI / 2;
      cowl.position.set(e * 2.95, -0.42, -1.72);
      ext.add(cowl);
      var intake = new THREE.Mesh(new THREE.CircleGeometry(0.44, 12), dark);
      intake.position.set(e * 2.95, -0.42, -2.0);
      intake.rotation.y = Math.PI;
      ext.add(intake);
      var propGroup = new THREE.Group();
      propGroup.position.set(e * 2.95, -0.42, -2.04);
      for (var b = 0; b < 3; b++) {
        var blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.7, 0.05), dark);
        blade.position.y = 0.82;
        var holder = new THREE.Group();
        holder.rotation.z = (b / 3) * Math.PI * 2;
        holder.add(blade);
        propGroup.add(holder);
      }
      ext.add(propGroup);
      this.props.push(propGroup);
      var disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 22),
        new THREE.MeshBasicMaterial({ color: 0xe8eeec, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }));
      disc.position.set(e * 2.95, -0.42, -2.02);
      ext.add(disc);
      this.propDiscs.push(disc);
    }

    /* ---- landing gear ---- */
    this.gearGroup = new THREE.Group();
    ext.add(this.gearGroup);
    var wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.26, 12);
    var strutMat = new THREE.MeshLambertMaterial({ color: 0xb0aa9a });
    var wheelMat = new THREE.MeshLambertMaterial({ color: 0x1e1c1a });
    var gearSpecs = [
      { x: 0, y: -1.0, z: -2.2 },
      { x: -1.75, y: -0.9, z: 0.35 },
      { x: 1.75, y: -0.9, z: 0.35 }
    ];
    for (var gs = 0; gs < gearSpecs.length; gs++) {
      var spec = gearSpecs[gs];
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.95, 6), strutMat);
      leg.position.set(spec.x, spec.y + 0.15, spec.z);
      this.gearGroup.add(leg);
      var wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(spec.x, spec.y - 0.4, spec.z);
      this.gearGroup.add(wheel);
    }

    /* ---- lights ---- */
    this.navL = new THREE.Sprite(new THREE.SpriteMaterial({
      map: U.glowTex(1), color: 0xff5b4a, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.75
    }));
    this.navL.scale.set(1.1, 1.1, 1);
    this.navL.position.set(-5.95, 0.06, 0.35);
    ext.add(this.navL);
    this.navR = new THREE.Sprite(new THREE.SpriteMaterial({
      map: U.glowTex(1), color: 0x7bff9a, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.75
    }));
    this.navR.scale.set(1.1, 1.1, 1);
    this.navR.position.set(5.95, 0.06, 0.35);
    ext.add(this.navR);
    this.strobe = new THREE.Sprite(new THREE.SpriteMaterial({
      map: U.glowTex(1), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.strobe.scale.set(1.2, 1.2, 1);
    this.strobe.position.set(0, 2.0, 3.4);
    ext.add(this.strobe);

    /* ---- cockpit interior ---- */
    var ck = new THREE.Group();
    ck.visible = false;
    this.cockpit = ck;
    var panelMat = new THREE.MeshLambertMaterial({ color: 0x2c3336, emissive: 0x161c1f });
    var trimMat = new THREE.MeshLambertMaterial({ color: 0x4a4c46, emissive: 0x141513 });
    var dash = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.26, 0.4), panelMat);
    dash.position.set(0, 0.2, -1.94);
    dash.rotation.x = -0.2;
    ck.add(dash);
    this.gaugeCanvas = U.canvas(512, 256);
    this.gaugeCtx = this.gaugeCanvas.getContext('2d');
    this.gaugeTex = new THREE.CanvasTexture(this.gaugeCanvas);
    this.gaugeTex.colorSpace = THREE.SRGBColorSpace;
    var face = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.5),
      new THREE.MeshBasicMaterial({ map: this.gaugeTex }));
    face.position.set(0, 0.4, -1.72);
    face.rotation.x = -0.28;
    ck.add(face);
    var glare = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.04, 0.18), trimMat);
    glare.position.set(0, 0.55, -1.84);
    glare.rotation.x = -0.16;
    ck.add(glare);
    var yoke = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 6, 14), panelMat);
    yoke.position.set(0, 0.08, -1.4);
    yoke.rotation.x = 0.2;
    ck.add(yoke);
    var column = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.5, 6), panelMat);
    column.position.set(0, -0.11, -1.45);
    column.rotation.x = 0.26;
    ck.add(column);
    g.add(ck);

    /* ground shadow */
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(15, 15),
      new THREE.MeshBasicMaterial({ map: U.shadowTex(), transparent: true, opacity: 0.45, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadow);

    /* damage smoke */
    this.smokeSprites = [];
    var smokeTex = U.glowTex(0.7);
    for (var sm = 0; sm < 7; sm++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: smokeTex, color: 0x3a3a3a, transparent: true, opacity: 0, depthWrite: false
      }));
      sp.scale.set(4, 4, 1);
      this.scene.add(sp);
      this.smokeSprites.push({ spr: sp, life: Math.random() * 1.6 });
    }
  };

  /* ------------------------------------------------------------ */
  Aircraft.prototype.reset = function (o) {
    var st = null;
    for (var i = 0; i < this.terrain.strips.length; i++) {
      if (this.terrain.strips[i].id === (o.strip || 'solmere')) st = this.terrain.strips[i];
    }
    var hdg = (o.hdg === undefined) ? (st ? st.hdg : 0) : o.hdg;
    if (o.strip && st && o.x === undefined) {
      o.x = st.x;
      o.z = st.z;
      o.y = st.elev + 1.3;
    }
    var y = o.y;
    if (o.onGround) {
      var gh = this.terrain.heightAt(o.x, o.z);
      y = Math.max(gh, 0) + 1.32;
    }
    this.pos.set(o.x, y, o.z);
    this.quat.setFromEuler(new THREE.Euler(0, -hdg * U.DEG, 0, 'YXZ'));
    this.speed = o.speed || 0;
    this.velY = 0;
    this.groundGrace = 0;
    this.throttle = o.throttle === undefined ? 0 : o.throttle;
    this.onGround = !!o.onGround;
    this.stalled = false;
    this.gearDown = 1; this.gearTarget = 1;
    this.flaps = 0; this.flapTarget = 0;
    this.fuel = o.fuel === undefined ? 1 : o.fuel;
    this.damage = 0;
    this.crashed = false;
    this.engineOn = true;
    this.pitchRate = this.rollRate = this.yawRate = 0;
    this.events.length = 0;
    this.gLoad = 1;
    this.landedQuality = null;
    this.airborneTime = 0;
    this.burnMult = o.burnMult || 1;
    this.obj.position.copy(this.pos);
    this.obj.quaternion.copy(this.quat);
    this.setView('chase');
    for (var s = 0; s < this.smokeSprites.length; s++) this.smokeSprites[s].spr.material.opacity = 0;
  };

  Aircraft.prototype.setView = function (v) {
    var inCockpit = (v === 'cockpit');
    this.cockpit.visible = inCockpit;
    this.ext.visible = !inCockpit;
  };

  Aircraft.prototype.toggleGear = function () {
    this.gearTarget = this.gearTarget > 0.5 ? 0 : 1;
    this.events.push({ type: 'gear', down: this.gearTarget > 0.5 });
  };

  Aircraft.prototype.toggleFlaps = function () {
    this.flapTarget = this.flapTarget > 0.5 ? 0 : 1;
    this.events.push({ type: 'flaps', on: this.flapTarget > 0.5 });
  };

  Aircraft.prototype.forward = function (out) {
    out = out || new THREE.Vector3();
    return out.set(0, 0, -1).applyQuaternion(this.quat);
  };

  Aircraft.prototype.up = function (out) {
    out = out || new THREE.Vector3();
    return out.set(0, 1, 0).applyQuaternion(this.quat);
  };

  Aircraft.prototype.right = function (out) {
    out = out || new THREE.Vector3();
    return out.set(1, 0, 0).applyQuaternion(this.quat);
  };

  Aircraft.prototype.heading = function () {
    var f = this.forward(vTmp);
    return U.wrap360(Math.atan2(f.x, -f.z) * U.RAD);
  };

  Aircraft.prototype.pitchAngle = function () {
    var f = this.forward(vTmp);
    return Math.asin(U.clamp(f.y, -1, 1)) * U.RAD;
  };

  Aircraft.prototype.bankAngle = function () {
    var r = this.right(vTmp), u = this.up(vTmp2);
    return Math.atan2(-r.y, u.y) * U.RAD;
  };

  Aircraft.prototype.surfaceAt = function (x, z) {
    var st = this.terrain.stripAt(x, z);
    var h = this.terrain.heightAt(x, z);
    if (st && h < st.elev + 4) return { y: st.elev, strip: st, water: false };
    return { y: h, strip: null, water: h < 0.5 };
  };

  /* ------------------------------------------------------------ */
  Aircraft.prototype.update = function (dt, ctl, env) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.wind.set(env.wind.x, 0, env.wind.z);
    this.gust = env.gust || 0;

    var throttleWanted = ctl.throttle;
    if (this.fuel <= 0) { throttleWanted = 0; this.engineOn = false; }
    else this.engineOn = true;
    this.throttle = U.clamp(U.damp(this.throttle, throttleWanted, 3.2, dt), 0, 1);
    this.boost = U.clamp(this.boost + ((ctl.boost && this.boostFuel > 0.02 && this.engineOn) ? dt * 1.2 : -dt * 1.6), 0, 1);
    if (ctl.boost && this.boostFuel > 0.02) this.boostFuel = Math.max(0, this.boostFuel - dt * 0.16);

    var auth = U.clamp(this.speed / 42, 0.16, 1) * (1 - this.damage * 0.0035) * (1 - Math.min(0.35, this.gust * 0.3));
    if (this.onGround) auth = 0.55;

    var targetPitch = ctl.pitch * FM.pitchRate * auth;
    var targetRoll = ctl.roll * FM.rollRate * auth;
    var targetYaw = ctl.yaw * FM.yawRate * auth;
    if (this.stalled) targetPitch *= 0.55;

    this.pitchRate = U.damp(this.pitchRate, targetPitch, 5.4, dt);
    this.rollRate = U.damp(this.rollRate, targetRoll, 6.2, dt);
    this.yawRate = U.damp(this.yawRate, targetYaw, 4.6, dt);

    if (Math.abs(ctl.roll) < 0.05 && !this.onGround) {
      var bank = this.bankAngle();
      this.rollRate -= U.clamp(bank * 0.035, -1.1, 1.1) * dt * 3.2;
    }
    if (Math.abs(ctl.pitch) < 0.05 && !this.onGround && !this.stalled) {
      var pa = this.pitchAngle();
      this.pitchRate -= U.clamp(pa * 0.006, -0.22, 0.22) * dt * 2.0;
    }

    this.quat.multiply(qTmp.setFromAxisAngle(AX_X, this.pitchRate * dt));
    this.quat.multiply(qTmp.setFromAxisAngle(AX_Z, -this.rollRate * dt));
    this.quat.multiply(qTmp.setFromAxisAngle(AX_Y, -this.yawRate * dt));

    if (!this.onGround) {
      var bankDeg = this.bankAngle();
      var turn = 9.81 * Math.tan(U.clamp(bankDeg * U.DEG, -1.2, 1.2)) / Math.max(this.speed, 30);
      this.quat.premultiply(qTmp.setFromAxisAngle(AX_Y, -turn * dt));
    }

    if (this.gust > 0.01 && !this.onGround) {
      var tg = this.gust * dt;
      this.quat.multiply(qTmp.setFromAxisAngle(AX_Z, (Math.sin(this.time * 4.1) * 0.012 + Math.sin(this.time * 9.7) * 0.006) * tg * 12));
      this.quat.multiply(qTmp.setFromAxisAngle(AX_X, (Math.sin(this.time * 3.3) * 0.009) * tg * 12));
    }
    this.quat.normalize();

    var fwd = this.forward(vTmp);
    var climb = fwd.y;
    var thrust = (this.throttle * FM.thrust + this.boost * 9) * (this.engineOn ? 1 : 0);
    if (this.damage > 55) thrust *= 0.72;
    var dragK = 0.00142 * (1 + (1 - this.gearDown) * 0.06 + this.flaps * 0.22 + this.damage * 0.002);
    var drag = dragK * this.speed * this.speed;
    this.speed += (thrust - drag - 9.81 * climb * 0.62) * dt;
    if (this.speed < 4) this.speed = 4;

    var stallSpd = FM.stallSpeed - this.flaps * 5;
    this.stalled = (!this.onGround && this.speed < stallSpd && Math.abs(this.pitchAngle()) > 12);
    if (this.stalled) {
      this.speed -= dt * 6.5;
      this.pitchRate -= dt * 1.5;
    }
    this.speed = U.clamp(this.speed, 3, FM.maxSpeed + 18);

    var burn = (0.0009 + this.throttle * 0.0028 + this.boost * 0.0018) * this.burnMult;
    this.fuel = U.clamp(this.fuel - burn * dt, 0, 1);

    var prevY = this.pos.y;
    this.pos.addScaledVector(fwd, this.speed * dt);
    if (this.stalled) this.pos.y -= (stallSpd - this.speed) * 0.75 * dt;
    this.pos.x += this.wind.x * dt * (0.25 + this.gust * 0.5);
    this.pos.z += this.wind.z * dt * (0.25 + this.gust * 0.5);
    var vy = (this.pos.y - prevY) / Math.max(dt, 0.0001);
    this.velY = vy;
    if (this.groundGrace > 0) this.groundGrace = Math.max(0, this.groundGrace - dt);

    var surf = this.surfaceAt(this.pos.x, this.pos.z);
    this.groundY = surf.y;
    this.agl = this.pos.y - Math.max(surf.y, 0);
    this.overWater = surf.water;
    this.onStrip = surf.strip;

    var gearReady = this.gearDown > 0.72;
    if (this.onGround) {
      this.pos.y = surf.y + 1.32;
      var brake = (this.throttle < 0.08) ? (surf.strip ? 4.4 : 6.5) : (surf.strip ? 0.25 : 1.7);
      if (ctl.brake) brake += 7.5;
      this.speed = Math.max(0, this.speed - brake * dt);
      var e = new THREE.Euler().setFromQuaternion(this.quat, 'YXZ');
      var eY = e.y;
      e.x = U.damp(e.x, 0.015, 6, dt);
      e.z = U.damp(e.z, 0, 6, dt);
      if (this.speed > 1.2) e.y = eY - (ctl.roll * 0.38 + ctl.yaw * 0.5) * dt * Math.min(1, this.speed / 22);
      this.quat.setFromEuler(new THREE.Euler(e.x, e.y, e.z, 'YXZ'));
      this.speed += (this.throttle * 13 + this.boost * 6) * dt;
      if (this.speed > FM.rotateSpeed && ctl.pitch > 0.25 && gearReady) {
        this.onGround = false;
        this.pos.y = surf.y + 2.1;
        this.pitchRate = 0.42;
        this.velY = 2.5;
        this.groundGrace = 1.4;
        this.events.push({ type: 'liftoff' });
      }
      if (this.speed > 60) this.speed = 60;
      if (surf.water) this.crash('water');
    } else {
      this.airborneTime = (this.airborneTime || 0) + dt;
      if (this.groundGrace <= 0 && this.agl < 1.05 && vy <= 0.6) {
        if (surf.water) {
          this.crash('water');
        } else if (surf.strip && gearReady && vy > -9.5 && Math.abs(this.pitchAngle()) < 22) {
          this.touchdown(surf, vy, dt);
        } else if (!surf.strip && gearReady && vy > -3.2) {
          this.damage = Math.min(100, this.damage + 6);
          this.touchdown(surf, vy, dt);
        } else {
          this.crash(surf.strip ? 'hard' : 'ground');
        }
      }
    }

    if (this.damage > 40) {
      this.smokeTimer += dt;
      for (var i = 0; i < this.smokeSprites.length; i++) {
        var sm = this.smokeSprites[i];
        sm.life -= dt;
        if (sm.life <= 0) {
          sm.life = 0.8 + Math.random() * 1.2;
          var back = this.forward(vTmp2).multiplyScalar(-2.2);
          sm.spr.position.copy(this.pos).add(back);
          sm.spr.position.y += 0.3;
          sm.spr.material.opacity = 0.5 * (this.damage / 100);
          sm.spr.scale.setScalar(2 + Math.random() * 3);
        }
        sm.spr.position.y += dt * 2.2;
        sm.spr.material.opacity *= (1 - dt * 1.1);
      }
    }

    this.gLoad = U.clamp(1 + (this.pitchRate * this.speed) / 9.81 * 0.55, -3, 7);

    this.obj.position.copy(this.pos);
    this.obj.quaternion.copy(this.quat);
    this.gearDown = U.damp(this.gearDown, this.gearTarget, 3.2, dt);
    this.flaps = U.damp(this.flaps, this.flapTarget, 3.0, dt);
    this.gearGroup.visible = this.gearDown > 0.05;
    this.gearGroup.scale.y = Math.max(0.02, this.gearDown);
    for (var w = 0; w < this.flapParts.length; w++) this.flapParts[w].rotation.x = this.flaps * 0.5;
    if (this.elevator) this.elevator.rotation.x = -ctl.pitch * 0.32;
    if (this.rudder) this.rudder.rotation.y = ctl.yaw * 0.28;

    this.propAngle += dt * (8 + this.throttle * 55 + this.boost * 20);
    for (var p = 0; p < this.props.length; p++) this.props[p].rotation.z = this.propAngle;
    for (var d = 0; d < this.propDiscs.length; d++) {
      this.propDiscs[d].material.opacity = 0;
      this.propDiscs[d].rotation.z = this.propAngle * 0.3;
    }

    this.strobe.visible = (this.time % 1.4) < 0.09;

    var shadowGround = Math.max(surf.y, 0);
    this.shadow.position.set(this.pos.x, shadowGround + 0.28, this.pos.z);
    this.shadow.rotation.z = this.heading() * U.DEG;
    var alt = U.clamp(this.agl / 90, 0, 1);
    this.shadow.material.opacity = 0.4 * (1 - alt * 0.85);
    this.shadow.scale.setScalar(0.75 + alt * 0.8);

    this.warn.stall = this.stalled;
    this.warn.fuel = this.fuel < 0.18;
    this.warn.damage = this.damage > 55;
    this.warn.pullUp = (!this.onGround && this.agl < 55 && vy < -16);
    this.warn.gear = (!this.onGround && this.agl < 90 && this.gearDown < 0.5 && vy < -2);
    this.warn.overspeed = this.speed > FM.maxSpeed - 6;
  };

  Aircraft.prototype.touchdown = function (surf, vy, dt) {
    this.onGround = true;
    this.pos.y = surf.y + 1.32;
    this.speed *= 0.985;
    var centerErr = 0;
    if (surf.strip) {
      var dx = this.pos.x - surf.strip.x, dz = this.pos.z - surf.strip.z;
      var ca = Math.cos(-surf.strip.hdg * U.DEG), sa = Math.sin(-surf.strip.hdg * U.DEG);
      var v = dx * ca - dz * sa;
      centerErr = Math.abs(v) / (surf.strip.width * 0.5);
    }
    var hdgErr = 0;
    if (surf.strip) hdgErr = Math.abs(U.angleDelta(this.heading(), surf.strip.hdg));
    var damageAdd = Math.max(0, (-vy - 4.2) * 3.4) + centerErr * 1.5;
    this.damage = Math.min(100, this.damage + damageAdd);
    var quality = U.clamp(1 - (Math.abs(vy) / 9) - centerErr * 0.4 - hdgErr / 90, 0, 1);
    this.landedQuality = {
      strip: surf.strip ? surf.strip.id : null,
      vs: vy, speed: this.speed, centre: centerErr, hdg: hdgErr,
      hard: vy < -5.5, quality: quality
    };
    this.events.push({ type: 'touchdown', quality: this.landedQuality });
  };

  Aircraft.prototype.crash = function (reason) {
    if (this.crashed) return;
    this.crashed = true;
    this.onGround = true;
    this.speed = 0;
    this.damage = 100;
    this.events.push({ type: 'crash', reason: reason });
    var surf = this.surfaceAt(this.pos.x, this.pos.z);
    this.pos.y = Math.max(surf.y, 0) + 1.2;
    this.obj.position.copy(this.pos);
  };

  Aircraft.prototype.getCockpitCamera = function (outPos, outQuat) {
    outPos.set(0, 0.95, -0.5).applyQuaternion(this.quat).add(this.pos);
    outQuat.copy(this.quat);
  };

  Aircraft.prototype.drawGauges = function () {
    var c = this.gaugeCtx, w = 512, h = 256;
    c.clearRect(0, 0, w, h);
    var grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#1c2327');
    grd.addColorStop(1, '#0d1214');
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,200,120,0.3)';
    c.lineWidth = 3;
    c.strokeRect(6, 6, w - 12, h - 12);
    /* rivets */
    c.fillStyle = 'rgba(255,220,170,0.12)';
    for (var rv = 18; rv < w - 12; rv += 26) { c.fillRect(rv, 10, 2, 2); c.fillRect(rv, h - 12, 2, 2); }

    function dial(cx, cy, r, value, label, max, unit, amber) {
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.fillStyle = '#080d0f';
      c.fill();
      c.strokeStyle = amber ? '#ffc26b' : '#9fb3b4';
      c.lineWidth = 2.5;
      c.stroke();
      c.save();
      c.translate(cx, cy);
      for (var i = 0; i <= 10; i++) {
        var a = (-220 + (i / 10) * 260) * U.DEG;
        c.strokeStyle = i > 7 ? '#ff8a6a' : 'rgba(220,235,235,0.7)';
        c.lineWidth = i % 5 === 0 ? 2.6 : 1.2;
        c.beginPath();
        c.moveTo(Math.cos(a) * r * 0.76, Math.sin(a) * r * 0.76);
        c.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
        c.stroke();
      }
      var av = (-220 + U.clamp(value / max, 0, 1) * 260) * U.DEG;
      c.strokeStyle = '#ffd08a';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-Math.cos(av) * r * 0.12, -Math.sin(av) * r * 0.12);
      c.lineTo(Math.cos(av) * r * 0.7, Math.sin(av) * r * 0.7);
      c.stroke();
      c.beginPath();
      c.arc(0, 0, 4.5, 0, 6.3);
      c.fillStyle = '#ffd08a';
      c.fill();
      c.restore();
      c.fillStyle = 'rgba(255,235,205,0.7)';
      c.font = '600 15px "Barlow Cond", sans-serif';
      c.textAlign = 'center';
      c.fillText(label, cx, cy + r * 0.62);
      c.fillStyle = '#ffe6bd';
      c.font = '600 22px "Plex Mono", monospace';
      c.fillText(unit, cx, cy + r * 0.98);
    }

    dial(88, 118, 62, this.speed * U.msToKts, 'KNOTS', 340, String(Math.round(this.speed * U.msToKts)), true);
    dial(256, 118, 62, Math.max(0, this.pos.y * U.mToFt), 'ALT FT', 12000, String(Math.round(this.pos.y * U.mToFt)), true);
    dial(424, 118, 62, this.heading(), 'HDG', 360, U.pad3(this.heading()), false);
    this.gaugeTex.needsUpdate = true;
  };

  Aircraft.prototype.consumeEvents = function () {
    var e = this.events.slice();
    this.events.length = 0;
    return e;
  };

  WW.Aircraft = Aircraft;
  WW.FLIGHT = FM;
})();
