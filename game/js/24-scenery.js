/* WINDWARD — airfields, harbour town, forest, airships, boats, lighthouse */
(function () {
  'use strict';
  var WW = window.WW, U = WW.U;
  var tmpM = new THREE.Matrix4();
  var tmpQ = new THREE.Quaternion();
  var tmpV = new THREE.Vector3();
  var tmpS = new THREE.Vector3();
  var tmpC = new THREE.Color();

  function Scenery(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.nightMats = [];
    this.nightObjects = [];
    this.spinners = [];
    this.boats = [];
    this.airships = [];
    this.flocks = [];
    this.smoke = [];
    this.time = 0;
    this.rnd = U.rng(20260411);
    this.buildings = [];
    this.beam = null;
    this.lighthouseLamp = null;
    this.lavaGlow = null;
    this.turbines = [];

    this.buildAirfields();
    this.buildTown();
    this.buildHarbour();
    this.buildVegetation();
    this.buildLighthouse();
    this.buildWindFarm();
    this.buildVolcano();
    this.buildAirships();
    this.buildBoats();
    this.buildBirds();
    this.buildCityLights();
  }

  Scenery.prototype.groundY = function (x, z) { return this.terrain.heightAt(x, z); };

  /* ---------------- airfields ---------------- */
  Scenery.prototype.buildAirfields = function () {
    var self = this;
    var rwTex = U.runwayTex(), grassTex = U.grassRunwayTex();
    this.terrain.strips.forEach(function (st) {
      var dir = self.terrain.stripDir(st);
      var yaw = Math.atan2(dir.x, dir.z);
      var g = new THREE.Group();
      g.position.set(st.x, st.elev, st.z);
      g.rotation.y = yaw;
      self.group.add(g);

      /* tarmac / dirt strip */
      var tex = (st.paved ? rwTex : grassTex).clone();
      tex.needsUpdate = true;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, Math.max(1, Math.round(st.len / 55)));
      var rwGeo = new THREE.PlaneGeometry(st.width, st.len, 1, 1);
      rwGeo.rotateX(-Math.PI / 2);
      var rw = new THREE.Mesh(rwGeo, new THREE.MeshLambertMaterial({ map: tex }));
      rw.position.y = 0.16;
      g.add(rw);

      /* threshold piano keys */
      var keyMat = new THREE.MeshLambertMaterial({ color: 0xe8e2cf });
      for (var side = -1; side <= 1; side += 2) {
        for (var k = 0; k < 6; k++) {
          var kb = new THREE.Mesh(new THREE.BoxGeometry(st.width * 0.055, 0.3, 16), keyMat);
          kb.position.set(-st.width * 0.34 + k * st.width * 0.135, 0.24, side * (st.len * 0.5 - 30));
          g.add(kb);
        }
      }

      /* edge lights */
      var lightMat = new THREE.MeshBasicMaterial({ color: 0xffe3b0 });
      self.nightMats.push({ mat: lightMat, day: 0x8e8676, night: 0xffd490 });
      var count = Math.floor(st.len / 55) * 2 + 4;
      var lgeo = new THREE.BoxGeometry(0.8, 0.7, 0.8);
      var lights = new THREE.InstancedMesh(lgeo, lightMat, count);
      var i = 0;
      for (var d = 0; d < count / 2; d++) {
        var zz = -st.len * 0.5 + (d / (count / 2 - 1)) * st.len;
        for (var s = -1; s <= 1; s += 2) {
          tmpV.set(s * (st.width * 0.5 + 1.6), 0.45, zz);
          tmpQ.identity(); tmpS.set(1, 1, 1);
          tmpM.compose(tmpV, tmpQ, tmpS);
          lights.setMatrixAt(i++, tmpM);
        }
      }
      lights.count = i;
      lights.instanceMatrix.needsUpdate = true;
      g.add(lights);

      /* approach lights on the "low" end */
      var apMat = new THREE.MeshBasicMaterial({ color: 0xffd08a });
      for (var a = 1; a <= 6; a++) {
        for (var s2 = -1; s2 <= 1; s2 += 2) {
          var ap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 1.1), apMat);
          ap.position.set(s2 * (st.width * 0.5 + 6 + a * 5), 0.4, -st.len * 0.5 - a * 48);
          g.add(ap);
        }
      }

      /* hangar + tower + apron */
      var hangarMat = new THREE.MeshLambertMaterial({ color: st.id === 'solmere' ? 0xb9b2a1 : 0x8f8a76 });
      var hangar = new THREE.Mesh(new THREE.BoxGeometry(46, 12, 34), hangarMat);
      hangar.position.set(st.width * 0.5 + 42, 6, 40);
      g.add(hangar);
      var hRoof = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 36, 12, 1, false, 0, Math.PI), hangarMat);
      hRoof.rotation.z = Math.PI / 2;
      hRoof.rotation.y = Math.PI / 2;
      hRoof.position.set(st.width * 0.5 + 42, 12, 40);
      hRoof.scale.set(1, 1, 0.55);
      g.add(hRoof);

      if (st.id === 'solmere') {
        var towerBase = new THREE.Mesh(new THREE.BoxGeometry(9, 17, 9), new THREE.MeshLambertMaterial({ color: 0xcfc7b4 }));
        towerBase.position.set(-st.width * 0.5 - 26, 8.5, 90);
        g.add(towerBase);
        var towerTop = new THREE.Mesh(new THREE.BoxGeometry(13, 5, 13), new THREE.MeshLambertMaterial({ color: 0x35494f }));
        towerTop.position.set(-st.width * 0.5 - 26, 19.5, 90);
        g.add(towerTop);
        var glass = new THREE.Mesh(new THREE.BoxGeometry(13.2, 3.4, 13.2), new THREE.MeshBasicMaterial({ color: 0x89d6d8, transparent: true, opacity: 0.55 }));
        glass.position.copy(towerTop.position);
        glass.position.y += 0.2;
        g.add(glass);

        /* fuel farm */
        var tankMat = new THREE.MeshLambertMaterial({ color: 0xdcd5c2 });
        for (var t = 0; t < 3; t++) {
          var tank = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 11, 14), tankMat);
          tank.position.set(-st.width * 0.5 - 48 - t * 18, 5.5, -60);
          g.add(tank);
          var cap = new THREE.Mesh(new THREE.ConeGeometry(7, 4, 14), tankMat);
          cap.position.set(tank.position.x, 12.6, -60);
          g.add(cap);
        }

        /* apron */
        var apron = new THREE.Mesh(new THREE.PlaneGeometry(st.width * 2.4, st.len * 0.5),
          new THREE.MeshLambertMaterial({ color: 0x6f6c64 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(-st.width * 0.7, 0.11, st.len * 0.22);
        g.add(apron);

        /* windsock */
        var sockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 8, 6), new THREE.MeshLambertMaterial({ color: 0xd8d0bb }));
        sockPole.position.set(st.width * 0.5 + 12, 4, -st.len * 0.2);
        g.add(sockPole);
        self.sock = new THREE.Mesh(new THREE.ConeGeometry(2.1, 6.4, 8, 1, true), new THREE.MeshLambertMaterial({ color: 0xff8a4a, side: THREE.DoubleSide }));
        self.sock.rotation.z = Math.PI / 2;
        self.sock.position.set(sockPole.position.x + 3.4, 7.4, sockPole.position.z);
        g.add(self.sock);

        /* radio mast */
        var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.6, 46, 6), new THREE.MeshLambertMaterial({ color: 0xb9b3a2 }));
        mast.position.set(-80, 23, -170);
        g.add(mast);
        self.mastLight = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff5a4a }));
        self.mastLight.position.set(-80, 46.6, -170);
        g.add(self.mastLight);
        self.nightObjects.push(self.mastLight);
      } else {
        /* windsock for the strip too */
        var sp = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7, 6), new THREE.MeshLambertMaterial({ color: 0xd8d0bb }));
        sp.position.set(st.width * 0.5 + 10, 3.5, 20);
        g.add(sp);
      }

      /* a couple of parked aircraft silhouettes (static) */
      if (st.id === 'solmere') {
        for (var p = 0; p < 2; p++) {
          self.parkedPlane(g, -st.width * 0.75 - p * 18, 0.2, 200 + p * 26);
        }
      }
    });
  };

  Scenery.prototype.parkedPlane = function (parent, x, y, z) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 7.5, 8), new THREE.MeshLambertMaterial({ color: 0xd9d3c0 }));
    body.rotation.x = Math.PI / 2;
    g.add(body);
    var wing = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 1.6), new THREE.MeshLambertMaterial({ color: 0xd9d3c0 }));
    wing.position.y = 1.4; g.add(wing);
    var tail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 1.1), new THREE.MeshLambertMaterial({ color: 0xd9d3c0 }));
    tail.position.set(0, 1.4, 3.1); g.add(tail);
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.7, 1.4), new THREE.MeshLambertMaterial({ color: 0xd9d3c0 }));
    fin.position.set(0, 2.2, 3.2); g.add(fin);
    var gear = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.4, 8), new THREE.MeshLambertMaterial({ color: 0x2b2b2b }));
    gear.rotation.z = Math.PI / 2; gear.position.set(0, -0.6, -1); g.add(gear);
    g.position.set(x, y, z);
    g.rotation.y = 0.4;
    parent.add(g);
  };

  /* ---------------- town ---------------- */
  Scenery.prototype.buildTown = function () {
    var t = this.terrain, rnd = this.rnd;
    var centers = [
      { x: 1750, z: 1500, radius: 520, count: 150, palette: [0xe8dcc0, 0xd9b48a, 0xc9d4c0, 0xe5c9a4, 0xbfae95] },
      { x: 2300, z: 400, radius: 300, count: 55, palette: [0xe2d6bd, 0xd2b18c, 0xc7cdb9] },
      { x: 4650, z: 3300, radius: 200, count: 22, palette: [0xd9cfb4, 0xc9b795, 0xc2cdb6] }
    ];
    var bodies = [], roofs = [];
    for (var c = 0; c < centers.length; c++) {
      var cc = centers[c];
      for (var i = 0; i < cc.count; i++) {
        var ang = rnd() * Math.PI * 2;
        var rad = Math.pow(rnd(), 0.62) * cc.radius;
        var x = cc.x + Math.cos(ang) * rad;
        var z = cc.z + Math.sin(ang) * rad;
        var h = t.heightAt(x, z);
        if (h < 5 || h > 62) continue;
        if (t.slopeAt(x, z) > 0.30) continue;
        var st = t.stripAt(x, z);
        if (st) continue;
        var nearStrip = false;
        for (var s = 0; s < t.strips.length; s++) {
          var sp = t.strips[s];
          var dx = x - sp.x, dz = z - sp.z;
          if (dx * dx + dz * dz < Math.pow(sp.len * 0.55 + 40, 2)) nearStrip = true;
        }
        if (nearStrip) continue;
        var w = 7 + rnd() * 12;
        var d = 7 + rnd() * 12;
        var bh = 6 + Math.pow(rnd(), 2.2) * 26;
        var col = cc.palette[Math.floor(rnd() * cc.palette.length)];
        bodies.push({ x: x, y: h, z: z, w: w, h: bh, d: d, rot: Math.floor(rnd() * 4) * 0.4 + rnd() * 0.2, col: col });
        roofs.push({ h: bh, w: w, d: d });
        this.buildings.push(bodies[bodies.length - 1]);
      }
    }

    this.buildingCount = bodies.length;
    var boxGeo = new THREE.BoxGeometry(1, 1, 1);
    boxGeo.translate(0, 0.5, 0);
    var bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    var bodyMesh = new THREE.InstancedMesh(boxGeo, bodyMat, bodies.length);
    var roofGeo = new THREE.ConeGeometry(0.72, 1, 4);
    roofGeo.rotateY(Math.PI / 4);
    var roofMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    var roofMesh = new THREE.InstancedMesh(roofGeo, roofMat, roofs.length);
    for (var b = 0; b < bodies.length; b++) {
      var bd = bodies[b];
      tmpV.set(bd.x, bd.y - 1.2, bd.z);
      tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), bd.rot);
      tmpS.set(bd.w, bd.h, bd.d);
      tmpM.compose(tmpV, tmpQ, tmpS);
      bodyMesh.setMatrixAt(b, tmpM);
      tmpC.setHex(bd.col);
      bodyMesh.setColorAt(b, tmpC);

      tmpV.set(bd.x, bd.y - 1.2 + bd.h, bd.z);
      tmpS.set(bd.w * 1.06, 3 + rnd() * 3, bd.d * 1.06);
      tmpM.compose(tmpV, tmpQ, tmpS);
      roofMesh.setMatrixAt(b, tmpM);
      tmpC.setHex(rnd() < 0.5 ? 0xb0705a : 0x9a9c8c);
      roofMesh.setColorAt(b, tmpC);
    }
    bodyMesh.instanceMatrix.needsUpdate = true;
    if (bodyMesh.instanceColor) bodyMesh.instanceColor.needsUpdate = true;
    roofMesh.instanceMatrix.needsUpdate = true;
    if (roofMesh.instanceColor) roofMesh.instanceColor.needsUpdate = true;
    this.group.add(bodyMesh);
    this.group.add(roofMesh);
    this.bodyMesh = bodyMesh;

    /* a church/clock tower landmark */
    var landH = t.heightAt(1780, 1460);
    var ct = new THREE.Group();
    var shaft = new THREE.Mesh(new THREE.BoxGeometry(7, 26, 7), new THREE.MeshLambertMaterial({ color: 0xe9dfc8 }));
    shaft.position.y = 13; ct.add(shaft);
    var belfry = new THREE.Mesh(new THREE.BoxGeometry(8.4, 5, 8.4), new THREE.MeshLambertMaterial({ color: 0xcbbfa5 }));
    belfry.position.y = 28; ct.add(belfry);
    var dome = new THREE.Mesh(new THREE.ConeGeometry(6, 9, 8), new THREE.MeshLambertMaterial({ color: 0x3f7d78 }));
    dome.position.y = 35; ct.add(dome);
    ct.position.set(1780, landH - 1, 1460);
    this.group.add(ct);
  };

  /* ---------------- harbour ---------------- */
  Scenery.prototype.buildHarbour = function () {
    var t = this.terrain, rnd = this.rnd;
    var pierMat = new THREE.MeshLambertMaterial({ color: 0x9a8c74 });
    var i;
    /* find the shoreline east of town */
    var coastX = 1750, coastZ = 1550;
    for (i = 0; i < 200; i++) {
      if (t.heightAt(coastX + i * 8, coastZ) < 0.5) { coastX += i * 8; break; }
    }
    this.harbour = { x: coastX, z: coastZ };

    for (var p = 0; p < 4; p++) {
      var px = coastX - 60 + p * 26;
      var pz = coastZ - 70 + p * 46;
      var pier = new THREE.Mesh(new THREE.BoxGeometry(14, 2.2, 74), pierMat);
      pier.position.set(px + 22, 3.2, pz);
      pier.rotation.y = 0.35;
      this.group.add(pier);
    }

    /* warehouses */
    for (i = 0; i < 6; i++) {
      var wx = coastX - 150 - rnd() * 120;
      var wz = coastZ + (rnd() - 0.5) * 320;
      var wh = t.heightAt(wx, wz);
      if (wh < 3) continue;
      var whouse = new THREE.Mesh(new THREE.BoxGeometry(26, 11, 16), new THREE.MeshLambertMaterial({ color: 0xb3a48b }));
      whouse.position.set(wx, wh + 4.5, wz);
      whouse.rotation.y = rnd() * 1.2;
      this.group.add(whouse);
    }

    /* container cranes */
    var craneMat = new THREE.MeshLambertMaterial({ color: 0xd88a3f });
    for (i = 0; i < 3; i++) {
      var cx2 = coastX - 40 + i * 44, cz2 = coastZ + 120 - i * 30;
      var base = t.heightAt(cx2, cz2);
      var crane = new THREE.Group();
      var legs = new THREE.Mesh(new THREE.BoxGeometry(14, 26, 4), craneMat);
      legs.position.y = 13; crane.add(legs);
      var boom = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 46), craneMat);
      boom.position.set(0, 26, -12); crane.add(boom);
      var cab = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), new THREE.MeshLambertMaterial({ color: 0xe7ddc4 }));
      cab.position.set(0, 21, 4); crane.add(cab);
      crane.position.set(cx2, Math.max(base, 2), cz2);
      crane.rotation.y = 0.2;
      this.group.add(crane);
    }

    /* moored boats near the piers */
    for (i = 0; i < 5; i++) {
      var bx = coastX + 10 + rnd() * 40, bz = coastZ - 110 + i * 48;
      var hull = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 18), new THREE.MeshLambertMaterial({ color: i % 2 ? 0xdcd6c4 : 0x3f6470 }));
      hull.position.set(bx, 1.1, bz);
      hull.rotation.y = 0.3 + rnd() * 0.3;
      this.group.add(hull);
      var cabin = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 7), new THREE.MeshLambertMaterial({ color: 0xe4dcc6 }));
      cabin.position.set(bx, 3.6, bz - 2);
      cabin.rotation.y = hull.rotation.y;
      this.group.add(cabin);
      var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 12, 5), new THREE.MeshLambertMaterial({ color: 0xbdb49c }));
      mast.position.set(bx, 9, bz + 3);
      this.group.add(mast);
    }
  };

  /* ---------------- vegetation & rocks ---------------- */
  Scenery.prototype.buildVegetation = function () {
    var t = this.terrain, rnd = this.rnd;
    var trees = [], rocks = [];
    var tries = 0;
    while (trees.length < 3400 && tries < 42000) {
      tries++;
      var x = (rnd() - 0.5) * 14500;
      var z = (rnd() - 0.5) * 14500;
      var h = t.heightAt(x, z);
      if (h < 7 || h > 350) continue;
      if (t.slopeAt(x, z) > 0.62) continue;
      var skip = false;
      for (var s = 0; s < t.strips.length; s++) {
        var sp = t.strips[s];
        var dx = x - sp.x, dz = z - sp.z;
        if (dx * dx + dz * dz < Math.pow(sp.len * 0.6, 2)) { skip = true; break; }
      }
      if (skip) continue;
      /* avoid the volcano's barren upper slopes */
      if (x > 1500 && z < -3000 && h > 220) continue;
      var scale = 0.65 + rnd() * 0.9;
      trees.push({ x: x, y: h, z: z, s: scale, r: rnd() * 6.28 });
    }
    while (rocks.length < 300 && tries < 60000) {
      tries++;
      var rx = (rnd() - 0.5) * 14000;
      var rz = (rnd() - 0.5) * 14000;
      var rh = t.heightAt(rx, rz);
      if (rh < 2 || rh > 560) continue;
      rocks.push({ x: rx, y: rh, z: rz, s: 1 + rnd() * 4.5, r: rnd() * 6.28 });
    }

    var trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 4, 5);
    trunkGeo.translate(0, 2, 0);
    var leafGeo = new THREE.ConeGeometry(3.4, 10.5, 6);
    leafGeo.translate(0, 8.6, 0);
    var leafGeo2 = new THREE.ConeGeometry(2.4, 7.2, 6);
    leafGeo2.translate(0, 14.0, 0);
    var trunkMat = new THREE.MeshLambertMaterial({ color: 0x5b4632 });
    var leafMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    var leafMat2 = new THREE.MeshLambertMaterial({ color: 0xffffff });

    var trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    var leaves = new THREE.InstancedMesh(leafGeo, leafMat, trees.length);
    var leaves2 = new THREE.InstancedMesh(leafGeo2, leafMat2, trees.length);
    for (var i = 0; i < trees.length; i++) {
      var tr = trees[i];
      tmpV.set(tr.x, tr.y - 1, tr.z);
      tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tr.r);
      tmpS.set(tr.s, tr.s * (0.85 + rnd() * 0.5), tr.s);
      tmpM.compose(tmpV, tmpQ, tmpS);
      trunks.setMatrixAt(i, tmpM);
      leaves.setMatrixAt(i, tmpM);
      leaves2.setMatrixAt(i, tmpM);
      tmpC.setHSL(0.28 + rnd() * 0.07, 0.30 + rnd() * 0.18, 0.20 + rnd() * 0.12);
      leaves.setColorAt(i, tmpC);
      leaves2.setColorAt(i, tmpC);
    }
    trunks.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    leaves2.instanceMatrix.needsUpdate = true;
    this.group.add(trunks); this.group.add(leaves); this.group.add(leaves2);

    var rockGeo = new THREE.IcosahedronGeometry(1, 0);
    var rockMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    var rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
    for (var j = 0; j < rocks.length; j++) {
      var rk = rocks[j];
      tmpV.set(rk.x, rk.y - rk.s * 0.35, rk.z);
      tmpQ.setFromAxisAngle(new THREE.Vector3(0.3, 1, 0.2).normalize(), rk.r);
      tmpS.set(rk.s, rk.s * (0.5 + rnd() * 0.7), rk.s * (0.8 + rnd() * 0.5));
      tmpM.compose(tmpV, tmpQ, tmpS);
      rockMesh.setMatrixAt(j, tmpM);
      tmpC.setHSL(0.09, 0.06 + rnd() * 0.06, 0.24 + rnd() * 0.12);
      rockMesh.setColorAt(j, tmpC);
    }
    rockMesh.instanceMatrix.needsUpdate = true;
    this.group.add(rockMesh);
  };

  /* ---------------- lighthouse ---------------- */
  Scenery.prototype.buildLighthouse = function () {
    var t = this.terrain;
    var lx = -1450, lz = -4900;
    var h = Math.max(t.heightAt(lx, lz), 4);
    var g = new THREE.Group();
    g.position.set(lx, h - 1, lz);
    var tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 5.2, 30, 12), new THREE.MeshLambertMaterial({ color: 0xf0e8d6 }));
    tower.position.y = 15; g.add(tower);
    for (var b = 0; b < 3; b++) {
      var band = new THREE.Mesh(new THREE.CylinderGeometry(3.6 - b * 0.32, 3.9 - b * 0.32, 2.4, 12), new THREE.MeshLambertMaterial({ color: 0xc4482f }));
      band.position.y = 8 + b * 8;
      g.add(band);
    }
    var gallery = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 1.2, 12), new THREE.MeshLambertMaterial({ color: 0x53625f }));
    gallery.position.y = 30.4; g.add(gallery);
    var lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 4.4, 10), new THREE.MeshBasicMaterial({ color: 0xfff0c0 }));
    lampRoom.position.y = 33; g.add(lampRoom);
    var cap = new THREE.Mesh(new THREE.ConeGeometry(4.2, 4, 10), new THREE.MeshLambertMaterial({ color: 0xc4482f }));
    cap.position.y = 37.2; g.add(cap);
    this.group.add(g);

    this.lighthouseLamp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: U.glowTex(1), color: 0xffe3a0, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.9
    }));
    this.lighthouseLamp.scale.set(70, 70, 1);
    this.lighthouseLamp.position.set(lx, h + 32, lz);
    this.group.add(this.lighthouseLamp);
    this.lampWorld = new THREE.Vector3(lx, h + 32, lz);

    /* rotating beams */
    this.beamPivot = new THREE.Group();
    this.beamPivot.position.copy(this.lampWorld);
    this.group.add(this.beamPivot);
    var beamMat = new THREE.MeshBasicMaterial({
      color: 0xffe7b0, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide
    });
    this.beamMat = beamMat;
    for (var s = 0; s < 2; s++) {
      var bg = new THREE.ConeGeometry(46, 520, 14, 1, true);
      bg.rotateX(Math.PI / 2);
      bg.translate(0, 0, 260);
      var beam = new THREE.Mesh(bg, beamMat);
      beam.rotation.y = s * Math.PI;
      this.beamPivot.add(beam);
    }
  };

  /* ---------------- wind farm ---------------- */
  Scenery.prototype.buildWindFarm = function () {
    var t = this.terrain;
    var spots = [[-3600, 2400], [-3300, 2600], [-3000, 2800], [-3900, 2200]];
    for (var i = 0; i < spots.length; i++) {
      var x = spots[i][0], z = spots[i][1];
      var h = t.heightAt(x, z);
      var g = new THREE.Group();
      g.position.set(x, h - 1, z);
      var tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, 68, 8), new THREE.MeshLambertMaterial({ color: 0xe7dfcc }));
      tower.position.y = 34; g.add(tower);
      var nac = new THREE.Mesh(new THREE.BoxGeometry(6, 4.4, 9), new THREE.MeshLambertMaterial({ color: 0xd8d0bc }));
      nac.position.set(0, 68, 2); g.add(nac);
      var hub = new THREE.Group();
      hub.position.set(0, 68, 7);
      for (var b = 0; b < 3; b++) {
        var blade = new THREE.Mesh(new THREE.BoxGeometry(2.2, 34, 0.5), new THREE.MeshLambertMaterial({ color: 0xf2ecdc }));
        blade.position.y = 17;
        var holder = new THREE.Group();
        holder.rotation.z = (b / 3) * Math.PI * 2;
        holder.add(blade);
        hub.add(holder);
      }
      g.add(hub);
      g.rotation.y = 0.6 + i * 0.4;
      this.group.add(g);
      this.spinners.push({ obj: hub, speed: 0.55 + Math.random() * 0.25 });
    }
  };

  /* ---------------- volcano ---------------- */
  Scenery.prototype.buildVolcano = function () {
    var t = this.terrain;
    var cx = 2900, cz = -4400;
    var floor = t.heightAt(cx, cz);
    var lava = new THREE.Mesh(new THREE.CircleGeometry(165, 28),
      new THREE.MeshBasicMaterial({ color: 0xff5a1e }));
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(cx, floor + 6, cz);
    this.group.add(lava);
    this.lava = lava;

    this.lavaGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: U.glowTex(0.9), color: 0xff7a2a, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.55, fog: false
    }));
    this.lavaGlow.scale.set(620, 620, 1);
    this.lavaGlow.position.set(cx, floor + 60, cz);
    this.group.add(this.lavaGlow);

    var plumeMat = new THREE.SpriteMaterial({
      map: U.glowTex(0.6), color: 0x9c9184, transparent: true, opacity: 0.24,
      depthWrite: false, fog: true
    });
    for (var i = 0; i < 16; i++) {
      var sp = new THREE.Sprite(plumeMat.clone());
      var s = 120 + Math.random() * 260;
      sp.scale.set(s, s, 1);
      sp.position.set(cx + (Math.random() - 0.5) * 220, floor + 40 + i * 62, cz + (Math.random() - 0.5) * 220);
      sp.userData.base = sp.position.y;
      sp.userData.phase = Math.random() * 6.28;
      this.group.add(sp);
      this.smoke.push(sp);
    }
    this.volcano = { x: cx, z: cz, y: floor };
  };

  /* ---------------- airships ---------------- */
  Scenery.prototype.buildAirships = function () {
    var specs = [
      { name: 'Halcyon', cx: -600, cz: -2600, r: 1400, y: 520, speed: 0.028, phase: 0.0, len: 96, col: 0xe6ddc8, accent: 0xc4583c },
      { name: 'Meridian', cx: 2200, cz: -1200, r: 2100, y: 700, speed: 0.019, phase: 2.1, len: 120, col: 0xd9d3c0, accent: 0x3d7a76 }
    ];
    for (var i = 0; i < specs.length; i++) {
      var s = specs[i];
      var g = new THREE.Group();
      var envGeo = new THREE.SphereGeometry(1, 18, 12);
      var env = new THREE.Mesh(envGeo, new THREE.MeshLambertMaterial({ color: s.col }));
      env.scale.set(s.len * 0.5, s.len * 0.17, s.len * 0.17);
      env.rotation.y = Math.PI / 2;
      g.add(env);
      var stripe = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshLambertMaterial({ color: s.accent }));
      stripe.scale.set(s.len * 0.501, s.len * 0.045, s.len * 0.172);
      stripe.rotation.y = Math.PI / 2;
      g.add(stripe);
      var gond = new THREE.Mesh(new THREE.BoxGeometry(s.len * 0.22, 8, 10), new THREE.MeshLambertMaterial({ color: 0x6a5a44 }));
      gond.position.y = -s.len * 0.15;
      g.add(gond);
      for (var f = 0; f < 3; f++) {
        var fin = new THREE.Mesh(new THREE.BoxGeometry(1, s.len * 0.16, s.len * 0.13), new THREE.MeshLambertMaterial({ color: s.accent }));
        fin.position.x = -s.len * 0.40;
        fin.rotation.x = (f / 3) * Math.PI * 2;
        g.add(fin);
      }
      var navLight = new THREE.Sprite(new THREE.SpriteMaterial({
        map: U.glowTex(1), color: 0xffd08a, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, opacity: 0.85
      }));
      navLight.scale.set(40, 40, 1);
      navLight.position.set(0, -s.len * 0.2, 0);
      g.add(navLight);
      this.nightObjects.push(navLight);
      this.group.add(g);
      this.airships.push({ obj: g, spec: s });
    }
  };

  /* ---------------- boats ---------------- */
  Scenery.prototype.buildBoats = function () {
    var t = this.terrain;
    var specs = [
      { cx: 1900, cz: 1900, r: 420, y: 0.8, speed: 0.05, phase: 0.4, len: 26, col: 0xdcd4bd, cabin: 0xd9cfb2 },
      { cx: -900, cz: 300, r: 900, y: 0.8, speed: 0.026, phase: 1.7, len: 34, col: 0x35606b, cabin: 0xe4dcc6 },
      { cx: 3300, cz: 2200, r: 1300, y: 0.8, speed: 0.021, phase: 3.2, len: 44, col: 0xc9633f, cabin: 0xeee5cf },
      { cx: -2600, cz: -1800, r: 700, y: 0.8, speed: 0.034, phase: 5.0, len: 22, col: 0xe6dcc2, cabin: 0xc9bfa4 }
    ];
    for (var i = 0; i < specs.length; i++) {
      var s = specs[i];
      var g = new THREE.Group();
      var hull = new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, s.len), new THREE.MeshLambertMaterial({ color: s.col }));
      hull.position.y = 1.2; g.add(hull);
      var bow = new THREE.Mesh(new THREE.ConeGeometry(3.6, 7, 6), new THREE.MeshLambertMaterial({ color: s.col }));
      bow.rotation.x = -Math.PI / 2;
      bow.position.set(0, 1.2, s.len * 0.5 + 2.4);
      g.add(bow);
      var cabin = new THREE.Mesh(new THREE.BoxGeometry(5, 4.5, 8), new THREE.MeshLambertMaterial({ color: s.cabin }));
      cabin.position.set(0, 4.4, -s.len * 0.16); g.add(cabin);
      var stack = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4, 8), new THREE.MeshLambertMaterial({ color: 0x8a4c33 }));
      stack.position.set(0, 8, -s.len * 0.28); g.add(stack);
      var wake = new THREE.Mesh(new THREE.PlaneGeometry(10, s.len * 1.6),
        new THREE.MeshBasicMaterial({ color: 0xdfeef0, transparent: true, opacity: 0.16, depthWrite: false }));
      wake.rotation.x = -Math.PI / 2;
      wake.position.set(0, 0.3, -s.len * 0.9);
      g.add(wake);
      this.group.add(g);
      this.boats.push({ obj: g, spec: s });
    }
  };

  /* ---------------- birds ---------------- */
  Scenery.prototype.buildBirds = function () {
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0, -2.4, 0.7, -0.6, -0.6, 0, 0.9,
      0, 0, 0, 0.6, 0, 0.9, 2.4, 0.7, -0.6
    ]), 3));
    geo.computeVertexNormals();
    var mat = new THREE.MeshBasicMaterial({ color: 0x2b3138, side: THREE.DoubleSide });
    var centers = [
      { x: 900, z: 900, y: 190, r: 260, n: 9 },
      { x: -2600, z: -1200, y: 240, r: 320, n: 7 },
      { x: 3600, z: 2600, y: 150, r: 190, n: 6 }
    ];
    for (var c = 0; c < centers.length; c++) {
      var cc = centers[c];
      var mesh = new THREE.InstancedMesh(geo, mat, cc.n);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      var birds = [];
      for (var i = 0; i < cc.n; i++) {
        birds.push({ a: Math.random() * 6.28, r: cc.r * (0.6 + Math.random() * 0.7), y: (Math.random() - 0.5) * 40, sp: 0.22 + Math.random() * 0.12 });
      }
      this.flocks.push({ mesh: mesh, birds: birds, center: cc });
    }
  };

  /* ---------------- city lights ---------------- */
  Scenery.prototype.buildCityLights = function () {
    var pos = [];
    for (var i = 0; i < this.buildings.length; i++) {
      var b = this.buildings[i];
      var n = 2 + Math.floor(Math.random() * 5);
      for (var k = 0; k < n; k++) {
        var face = Math.floor(Math.random() * 4);
        var ox = 0, oz = 0;
        if (face === 0) ox = b.w * 0.5 + 0.4; else if (face === 1) ox = -b.w * 0.5 - 0.4;
        else if (face === 2) oz = b.d * 0.5 + 0.4; else oz = -b.d * 0.5 - 0.4;
        pos.push(b.x + ox, b.y + 2 + Math.random() * (b.h - 3), b.z + oz);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    this.cityLightMat = new THREE.PointsMaterial({
      color: 0xffcf8a, size: 3.2, sizeAttenuation: false, transparent: true,
      opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, fog: true
    });
    this.cityLights = new THREE.Points(geo, this.cityLightMat);
    this.cityLights.visible = false;
    this.group.add(this.cityLights);

    /* runway glow strips for night */
    var glowGeo = new THREE.PlaneGeometry(1, 1);
    this.runwayGlow = [];
    var self = this;
    this.terrain.strips.forEach(function (st) {
      var dir = self.terrain.stripDir(st);
      var g = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
        color: 0xffdca0, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      g.rotation.x = -Math.PI / 2;
      g.rotation.z = -Math.atan2(dir.x, dir.z);
      g.scale.set(st.width * 1.7, st.len * 1.15, 1);
      g.position.set(st.x, st.elev + 0.35, st.z);
      self.group.add(g);
      self.runwayGlow.push(g);
    });
  };

  /* ---------------- presets ---------------- */
  Scenery.prototype.applyPreset = function (name, p) {
    var night = p.night > 0.35;
    for (var i = 0; i < this.nightMats.length; i++) {
      var nm = this.nightMats[i];
      nm.mat.color.setHex(night ? nm.night : nm.day);
    }
    for (var j = 0; j < this.nightObjects.length; j++) this.nightObjects[j].visible = night;
    if (this.cityLights) this.cityLights.visible = night;
    if (this.beamMat) this.beamMat.opacity = night ? 0.10 : 0.022;
    if (this.lighthouseLamp) this.lighthouseLamp.material.opacity = night ? 1 : 0.3;
    if (this.lavaGlow) this.lavaGlow.material.opacity = night ? 0.75 : 0.4;
    if (this.runwayGlow) {
      for (var k = 0; k < this.runwayGlow.length; k++) {
        this.runwayGlow[k].material.opacity = night ? 0.30 : 0.06;
      }
    }
    if (this.mastLight) this.mastLight.visible = true;
  };

  /* ---------------- update ---------------- */
  Scenery.prototype.update = function (dt, cameraPos) {
    this.time += dt;
    var t = this.time;
    var i;
    for (i = 0; i < this.spinners.length; i++) this.spinners[i].obj.rotation.z += dt * this.spinners[i].speed * 1.4;

    if (this.beamPivot) {
      this.beamPivot.rotation.y += dt * 0.55;
    }
    if (this.mastLight) this.mastLight.visible = (Math.sin(t * 2.4) > 0.6);
    if (this.sock) this.sock.rotation.y = Math.sin(t * 0.6) * 0.25;
    if (this.lighthouseLamp) {
      var pulse = 0.85 + Math.sin(t * 1.7) * 0.15;
      this.lighthouseLamp.scale.setScalar(64 * pulse);
    }
    if (this.lava) {
      this.lava.material.color.setHSL(0.045 + Math.sin(t * 0.7) * 0.01, 1.0, 0.52 + Math.sin(t * 1.9) * 0.04);
      this.lavaGlow.scale.setScalar(560 + Math.sin(t * 0.9) * 50);
    }
    for (i = 0; i < this.smoke.length; i++) {
      var sm = this.smoke[i];
      sm.position.y += dt * 9;
      sm.userData.phase += dt;
      var life = (sm.position.y - sm.userData.base) % 1000;
      sm.material.opacity = 0.26 * Math.max(0, 1 - life / 1000) * (0.6 + 0.4 * Math.sin(sm.userData.phase));
      sm.position.x += Math.sin(sm.userData.phase * 0.4) * dt * 6;
      if (sm.position.y - sm.userData.base > 1000) {
        sm.position.y = sm.userData.base;
        sm.position.x = this.volcano.x + (Math.random() - 0.5) * 200;
        sm.position.z = this.volcano.z + (Math.random() - 0.5) * 200;
      }
    }

    /* airships drift on big circles */
    for (i = 0; i < this.airships.length; i++) {
      var a = this.airships[i];
      var s = a.spec;
      var ang = s.phase + t * s.speed;
      a.obj.position.set(s.cx + Math.cos(ang) * s.r, s.y + Math.sin(t * 0.3 + i) * 14, s.cz + Math.sin(ang) * s.r);
      a.obj.rotation.y = -ang;
      a.obj.rotation.z = Math.sin(t * 0.4 + i) * 0.03;
    }

    /* boats */
    for (i = 0; i < this.boats.length; i++) {
      var b = this.boats[i];
      var bs = b.spec;
      var ba = bs.phase + t * bs.speed;
      b.obj.position.set(bs.cx + Math.cos(ba) * bs.r, bs.y + Math.sin(t * 0.9 + i) * 0.35, bs.cz + Math.sin(ba) * bs.r);
      b.obj.rotation.y = -ba + Math.PI / 2;
      b.obj.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.02;
    }

    /* birds */
    for (i = 0; i < this.flocks.length; i++) {
      var fl = this.flocks[i];
      for (var b2 = 0; b2 < fl.birds.length; b2++) {
        var bird = fl.birds[b2];
        bird.a += dt * bird.sp;
        var bx = fl.center.x + Math.cos(bird.a) * bird.r;
        var bz = fl.center.z + Math.sin(bird.a) * bird.r;
        var by = fl.center.y + bird.y + Math.sin(t * 1.4 + b2) * 4;
        tmpV.set(bx, by, bz);
        tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -bird.a + Math.PI / 2);
        var flap = 0.6 + Math.sin(t * 6 + b2) * 0.5;
        tmpS.set(1.4, 1.4, 1.4 + flap * 0.2);
        tmpM.compose(tmpV, tmpQ, tmpS);
        fl.mesh.setMatrixAt(b2, tmpM);
      }
      fl.mesh.instanceMatrix.needsUpdate = true;
    }
  };

  WW.Scenery = Scenery;
})();
