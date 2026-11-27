/* WINDWARD — archipelago heightfield, coastlines, airfields */
(function () {
  'use strict';
  var WW = window.WW, U = WW.U;

  var SIZE = 17000;
  var SEG = 324;

  var ISLANDS = [
    { id: 'solmere', cx: -1500, cz: 200, rx: 3050, rz: 2450, peak: 300, rough: 66, seed: 1.7, power: 1.45, palette: 'green', name: 'Solmere' },
    { id: 'sanderling', cx: 3900, cz: 3400, rx: 1600, rz: 1350, peak: 165, rough: 46, seed: 4.2, power: 1.5, palette: 'green', name: 'Sanderling Cay' },
    { id: 'bellrock', cx: -4350, cz: 3700, rx: 2800, rz: 2000, peak: 590, rough: 120, seed: 7.9, power: 1.15, palette: 'red',
      canyon: { ax: -6500, az: 2750, bx: -2500, bz: 4550, width: 300, depth: 330 } },
    { id: 'ember', cx: 2900, cz: -4400, rx: 2200, rz: 2000, peak: 680, rough: 62, seed: 11.3, power: 1.7, palette: 'volcano', crater: true },
    { id: 'halcyon', cx: -1450, cz: -4550, rx: 850, rz: 760, peak: 135, rough: 36, seed: 15.5, power: 1.35, palette: 'green' },
    { id: 'pinnacle', cx: 6400, cz: -1500, rx: 520, rz: 430, peak: 210, rough: 40, seed: 18.9, power: 1.2, palette: 'red' },
    { id: 'tallow', cx: -2200, cz: -2200, rx: 480, rz: 380, peak: 70, rough: 22, seed: 21.1, power: 1.4, palette: 'green' }
  ];

  var STRIPS = [
    { id: 'solmere', name: 'Solmere Field', x: 950, z: 700, hdg: 92, len: 1300, width: 36, elev: 26, paved: true, pad: 1000 },
    { id: 'sanderling', name: 'Sanderling Cay Strip', x: 4650, z: 3900, hdg: 58, len: 880, width: 26, elev: 22, paved: false, pad: 720 }
  ];

  function islandH(isl, x, z) {
    var dx = (x - isl.cx) / isl.rx;
    var dz = (z - isl.cz) / isl.rz;
    var ang = Math.atan2(dz, dx);
    var warp = 0.78 + 0.40 * U.fbm(Math.cos(ang) * 1.6 + isl.seed * 3.1, Math.sin(ang) * 1.6 - isl.seed * 2.3, 3);
    var d = Math.sqrt(dx * dx + dz * dz) / warp;
    if (d > 1.32) return -120;
    var f = 1 - U.smoothstep(-0.03, 1.02, d);
    if (f <= 0.002) return -120;

    var n1 = U.fbm(x * 0.00125 + isl.seed * 3.7, z * 0.00125 - isl.seed * 1.9, 4) - 0.5;
    var n2 = U.fbm(x * 0.0046 - isl.seed * 2.1, z * 0.0046 + isl.seed * 5.3, 3) - 0.5;
    var detail = (n1 * 2.3 + n2 * 0.85) * isl.rough * Math.pow(f, 0.55);
    /* ridged spine so the islands have real shoulders and spurs */
    var ridge = 1 - Math.abs(2 * U.fbm(x * 0.00082 + isl.seed * 2.1, z * 0.00082 - isl.seed * 4.3, 4) - 1);
    var ridgeH = ridge * ridge * isl.peak * 0.42 * Math.pow(f, 1.05);
    var h = isl.peak * Math.pow(f, isl.power) + detail + ridgeH;
    h -= 9 * U.smoothstep(0.80, 1.02, d);

    if (isl.crater) {
      var cd = d;
      h -= isl.peak * 0.52 * Math.exp(-Math.pow(cd / 0.235, 2));
      h += isl.peak * 0.12 * Math.exp(-Math.pow((cd - 0.285) / 0.05, 2));
    }
    if (isl.canyon) {
      var c = isl.canyon;
      var vx = c.bx - c.ax, vz = c.bz - c.az;
      var wx = x - c.ax, wz = z - c.az;
      var t = U.clamp((wx * vx + wz * vz) / (vx * vx + vz * vz), 0, 1);
      var px = c.ax + vx * t, pz = c.az + vz * t;
      var dl = Math.sqrt((x - px) * (x - px) + (z - pz) * (z - pz));
      var cut = 1 - U.smoothstep(c.width * 0.42, c.width, dl);
      /* gently widen the mouth toward the sea */
      cut *= 0.55 + 0.45 * Math.sin(Math.PI * t);
      h -= c.depth * cut * U.smoothstep(30, 170, h);
    }
    return h;
  }

  function Terrain() {
    this.islands = ISLANDS;
    this.strips = STRIPS;
    this.size = SIZE;
    this.seg = SEG;
    this.mesh = null;
    this._hCache = Object.create(null);
  }

  Terrain.prototype.heightAt = function (x, z) {
    var h = -140;
    for (var i = 0; i < ISLANDS.length; i++) {
      var ih = islandH(ISLANDS[i], x, z);
      if (ih > h) h = ih;
    }
    /* airfield land pads + flattening */
    for (var s = 0; s < STRIPS.length; s++) {
      var st = STRIPS[s];
      var dx = x - st.x, dz = z - st.z;
      var ca = Math.cos(st.hdg * U.DEG), sa = Math.sin(st.hdg * U.DEG);
      var u = dx * sa - dz * ca;   /* along the runway */
      var v = dx * ca + dz * sa;   /* across the runway */
      var bd = Math.sqrt(Math.pow(u / (st.len * 1.15), 2) + Math.pow(v / (st.pad * 0.68), 2));
      if (bd < 1.6) {
        var padH = (bd <= 1) ? st.elev + 10 * (1 - bd * bd)
          : U.lerp(st.elev, -55, U.smoothstep(1.0, 1.55, bd));
        if (padH > h) h = padH;
      }
      if (bd < 1.4) {
        var padU = st.len * 0.72, padV = st.width * 3.2 + 30;
        var mU = 1 - U.smoothstep(padU * 0.8, padU, Math.abs(u));
        var mV = 1 - U.smoothstep(padV * 0.6, padV, Math.abs(v));
        var mask = mU * mV;
        if (mask > 0.001) h = U.lerp(h, st.elev, mask);
      }
    }
    return h;
  };

  Terrain.prototype.groundTexture = function () {
    if (this._gtex) return this._gtex;
    var size = 256;
    var c = U.canvas(size, size);
    var g = c.getContext('2d');
    var img = g.createImageData(size, size);
    var d = img.data;
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var n = U.noise2(x * 0.07, y * 0.07) * 0.55 + U.noise2(x * 0.29 + 4.2, y * 0.29 - 2.1) * 0.3 + U.noise2(x * 0.9 - 7.7, y * 0.9 + 3.3) * 0.15;
        var v = 168 + n * 78;
        var o = (y * size + x) * 4;
        d[o] = v; d[o + 1] = v; d[o + 2] = v * 0.97; d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(120, 120);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    this._gtex = t;
    return t;
  };

  Terrain.prototype.normalAt = function (x, z, out) {
    var e = 12;
    var hx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    var hz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    out = out || new THREE.Vector3();
    out.set(-hx / (2 * e), 1, -hz / (2 * e)).normalize();
    return out;
  };

  Terrain.prototype.slopeAt = function (x, z) {
    var e = 16;
    var hx = (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e);
    var hz = (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e);
    return Math.sqrt(hx * hx + hz * hz);
  };

  Terrain.prototype.isWater = function (x, z) { return this.heightAt(x, z) < 0.4; };

  Terrain.prototype.stripAt = function (x, z) {
    for (var i = 0; i < STRIPS.length; i++) {
      var st = STRIPS[i];
      var dx = x - st.x, dz = z - st.z;
      var ca = Math.cos(-st.hdg * U.DEG), sa = Math.sin(-st.hdg * U.DEG);
      var u = dx * sa + dz * ca;
      var v = dx * ca - dz * sa;
      if (Math.abs(u) <= st.len * 0.5 && Math.abs(v) <= st.width * 0.5) return st;
    }
    return null;
  };

  Terrain.prototype.stripDir = function (st) {
    var a = st.hdg * U.DEG;
    return new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
  };

  /* ---------- palette ---------- */
  var PAL = {
    green: {
      wet: [0x5d5a48, 0x716d58], sand: [0xcbb78e, 0xdccaa4], low: [0x4c7439, 0x5f8743],
      mid: [0x355c37, 0x416b3f], high: [0x5b5a49, 0x6b6a55], rock: [0x635f52, 0x7d7866]
    },
    red: {
      wet: [0x63523f, 0x746049], sand: [0xc6b088, 0xd4c19c], low: [0x9a7443, 0xab8449],
      mid: [0x7d5730, 0x8a6638], high: [0x5e442d, 0x6f5236], rock: [0x4f3d2c, 0x634b34]
    },
    volcano: {
      wet: [0x46403a, 0x574f47], sand: [0x7d7466, 0x948b78], low: [0x554f47, 0x635b51],
      mid: [0x453f38, 0x524a41], high: [0x37322d, 0x423c35], rock: [0x2e2925, 0x3c3630]
    }
  };

  function hexRGB(h) {
    return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
  }
  function srgbToLin(c) {
    c = U.clamp(c, 0, 1);
    return c < 0.04045 ? c * 0.0773993808 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function mixRGB(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function lerpHex(a, b, t) { return mixRGB(hexRGB(a), hexRGB(b), t); }

  Terrain.prototype.buildMesh = function () {
    var geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    var count = pos.count;
    var heights = new Float32Array(count);
    var colors = new Float32Array(count * 3);
    var step = SIZE / SEG;

    var i, x, z;
    for (i = 0; i < count; i++) {
      x = pos.getX(i); z = pos.getZ(i);
      heights[i] = this.heightAt(x, z);
      pos.setY(i, heights[i]);
    }

    var surface = new THREE.Color();
    for (i = 0; i < count; i++) {
      x = pos.getX(i); z = pos.getZ(i);
      var h = heights[i];
      var iL = Math.max(0, i - 1), iR = Math.min(count - 1, i + 1);
      var hx = (heights[iR] - heights[iL]) / (2 * step);
      var slope = Math.abs(hx);
      var col;

      /* find dominant island palette */
      var pal = PAL.green;
      var bestW = -1e9;
      for (var k = 0; k < ISLANDS.length; k++) {
        var isl = ISLANDS[k];
        var dxn = (x - isl.cx) / isl.rx, dzn = (z - isl.cz) / isl.rz;
        var dd = Math.sqrt(dxn * dxn + dzn * dzn);
        var w = h - dd * 40;
        if (w > bestW) { bestW = w; pal = PAL[isl.palette]; }
      }

      var nvar = U.fbm(x * 0.012, z * 0.012, 3);
      var fine = U.fbm(x * 0.055 - 11.3, z * 0.055 + 7.7, 2);
      nvar = nvar * 0.72 + fine * 0.28;
      if (h < -1) {
        col = lerpHex(pal.wet[0], pal.wet[1], U.clamp((h + 60) / 60, 0, 1));
        col = [col[0] * 0.5, col[1] * 0.58, col[2] * 0.56];
      } else if (h < 2.4) {
        col = lerpHex(pal.sand[0], pal.sand[1], nvar * 0.8);
        col = [col[0] * 0.9, col[1] * 0.88, col[2] * 0.84];
      } else if (h < 70) {
        var t = U.smoothstep(3.0, 24, h);
        col = lerpHex(pal.sand[1], pal.low[0], t);
        var g = lerpHex(pal.low[0], pal.low[1], nvar);
        col = mixRGB(col, g, 0.6);
      } else if (h < 260) {
        var t2 = U.smoothstep(70, 250, h);
        col = lerpHex(pal.low[1], pal.mid[1], 0.3 + nvar * 0.5);
        col = mixRGB(col, hexRGB(pal.mid[0]), t2 * 0.5);
        /* forest / meadow patches */
        var patch = U.fbm(x * 0.0032 + 21.7, z * 0.0032 - 9.1, 3);
        col = mixRGB(col, hexRGB(patch > 0.5 ? 0x2f5733 : 0x537b3c), Math.abs(patch - 0.5) * 0.9);
      } else {
        var t3 = U.smoothstep(260, 520, h);
        col = lerpHex(pal.mid[0], pal.high[1], t3);
      }
      if (slope > 0.30) {
        var s2 = U.clamp((slope - 0.30) * 2.4, 0, 1);
        var rk = lerpHex(pal.rock[0], pal.rock[1], nvar);
        col = [col[0] + (rk[0] - col[0]) * s2, col[1] + (rk[1] - col[1]) * s2, col[2] + (rk[2] - col[2]) * s2];
      }
      /* soft ambient occlusion from the height grid: valleys darker */
      var w = SEG + 1;
      var nAvg = 0, nCount = 0;
      if (i - w >= 0) { nAvg += heights[i - w]; nCount++; }
      if (i + w < count) { nAvg += heights[i + w]; nCount++; }
      if (i % w !== 0) { nAvg += heights[i - 1]; nCount++; }
      if ((i + 1) % w !== 0) { nAvg += heights[i + 1]; nCount++; }
      nAvg = nCount ? nAvg / nCount : h;
      var ao = 1 + U.clamp((h - nAvg) / 90, -0.26, 0.10);

      var shade = (0.9 + nvar * 0.2) * ao;
      colors[i * 3] = srgbToLin(col[0] * shade);
      colors[i * 3 + 1] = srgbToLin(col[1] * shade);
      colors[i * 3 + 2] = srgbToLin(col[2] * shade);
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    var mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, map: this.groundTexture() });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = false;
    this.mesh = mesh;
    return mesh;
  };

  /* minimap: pre-render the archipelago once */
  Terrain.prototype.buildMinimap = function (px) {
    px = px || 220;
    var c = U.canvas(px, px);
    var g = c.getContext('2d');
    var half = SIZE / 2;
    var cell = SIZE / px;
    var img = g.createImageData(px, px);
    var d = img.data;
    for (var py = 0; py < px; py++) {
      for (var pxi = 0; pxi < px; pxi++) {
        var wx = -half + pxi * cell + cell / 2;
        var wz = -half + py * cell + cell / 2;
        var h = this.heightAt(wx, wz);
        var r, gg, b;
        if (h < -30) { r = 8; gg = 26; b = 40; }
        else if (h < -1) { r = 12; gg = 40; b = 58; }
        else if (h < 5) { r = 150; gg = 132; b = 96; }
        else if (h < 90) { r = 74; gg = 104; b = 66; }
        else if (h < 280) { r = 88; gg = 96; b = 62; }
        else { r = 116; gg = 108; b = 92; }
        var o = (py * px + pxi) * 4;
        d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    /* airfields */
    for (var i = 0; i < STRIPS.length; i++) {
      var st = STRIPS[i];
      var mx = ((st.x + half) / SIZE) * px;
      var my = ((st.z + half) / SIZE) * px;
      g.strokeStyle = 'rgba(255,236,200,0.95)';
      g.lineWidth = 2;
      var a = st.hdg * U.DEG;
      var dx = Math.sin(a) * (st.len / SIZE) * px * 0.5;
      var dy = -Math.cos(a) * (st.len / SIZE) * px * 0.5;
      g.beginPath();
      g.moveTo(mx - dx, my - dy);
      g.lineTo(mx + dx, my + dy);
      g.stroke();
    }
    /* island names */
    g.font = '600 11px Helvetica, Arial, sans-serif';
    g.fillStyle = 'rgba(255,236,205,0.55)';
    g.textAlign = 'center';
    var labels = [['SOLMERE', -1500, 200], ['SANDERLING CAY', 3900, 3400], ['BELLROCK', -4350, 3700], ['EMBER', 2900, -4400]];
    for (var l = 0; l < labels.length; l++) {
      var lx = ((labels[l][1] + half) / SIZE) * px;
      var ly = ((labels[l][2] + half) / SIZE) * px;
      g.fillText(labels[l][0], lx, ly);
    }
    return c;
  };

  Terrain.prototype.worldToMap = function (x, z, px) {
    var half = SIZE / 2;
    return { x: ((x + half) / SIZE) * px, y: ((z + half) / SIZE) * px };
  };

  WW.Terrain = Terrain;
  WW.WORLD_SIZE = SIZE;
})();
