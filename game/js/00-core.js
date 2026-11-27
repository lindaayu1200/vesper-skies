/* WINDWARD — core utilities, procedural noise, input */
(function () {
  'use strict';
  var WW = (window.WW = window.WW || {});

  var U = (WW.U = {});

  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.invLerp = function (a, b, v) { return (v - a) / (b - a); };
  U.smoothstep = function (e0, e1, x) {
    var t = U.clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  U.damp = function (a, b, lambda, dt) { return U.lerp(a, b, 1 - Math.exp(-lambda * dt)); };
  U.wrap360 = function (d) { return ((d % 360) + 360) % 360; };
  U.angleDelta = function (a, b) { return ((b - a + 540) % 360) - 180; };
  U.DEG = Math.PI / 180;
  U.RAD = 180 / Math.PI;

  /* bearing 0 = north (-Z), 90 = east (+X) */
  U.bearingTo = function (fx, fz, tx, tz) {
    return U.wrap360(Math.atan2(tx - fx, -(tz - fz)) * U.RAD);
  };
  U.msToKts = 1.94384;
  U.mToFt = 3.28084;

  /* ---------- deterministic noise ---------- */
  function hash2(x, y) {
    var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }
  U.hash2 = hash2;

  U.noise2 = function (x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi), b = hash2(xi + 1, yi);
    var c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };

  U.fbm = function (x, y, oct) {
    oct = oct || 4;
    var amp = 0.5, f = 1, sum = 0, norm = 0;
    for (var i = 0; i < oct; i++) {
      sum += U.noise2(x * f, y * f) * amp;
      norm += amp;
      amp *= 0.5; f *= 2.03;
    }
    return sum / norm;
  };

  U.rng = function (seed) {
    var a = (seed | 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- canvas helpers ---------- */
  U.canvas = function (w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  };

  U.glowTex = function (inner) {
    var c = U.canvas(128, 128), g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.22, 'rgba(255,255,255,' + (inner === undefined ? 0.85 : inner) + ')');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.22)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  U.shadowTex = function () {
    var c = U.canvas(128, 128), g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(0.5, 'rgba(0,0,0,0.28)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c);
    return t;
  };

  /* asphalt runway with markings; repeat along length */
  U.runwayTex = function () {
    var c = U.canvas(128, 512), g = c.getContext('2d');
    g.fillStyle = '#2c2c30';
    g.fillRect(0, 0, 128, 512);
    /* asphalt grain */
    for (var i = 0; i < 2600; i++) {
      var v = 30 + Math.random() * 28;
      g.fillStyle = 'rgba(' + (v + 8) + ',' + (v + 8) + ',' + (v + 12) + ',' + (0.25 + Math.random() * 0.35) + ')';
      g.fillRect(Math.random() * 128, Math.random() * 512, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
    /* edge lines */
    g.fillStyle = 'rgba(238,232,214,0.85)';
    g.fillRect(6, 0, 4, 512);
    g.fillRect(118, 0, 4, 512);
    /* centre dashes */
    g.fillStyle = 'rgba(240,235,220,0.8)';
    for (var y = 0; y < 512; y += 64) g.fillRect(62, y + 8, 4, 34);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };

  U.grassRunwayTex = function () {
    var c = U.canvas(128, 512), g = c.getContext('2d');
    g.fillStyle = '#6d6a4a';
    g.fillRect(0, 0, 128, 512);
    for (var i = 0; i < 3200; i++) {
      var v = 90 + Math.random() * 50;
      g.fillStyle = 'rgba(' + v + ',' + (v - 6) + ',' + (v - 40) + ',' + (0.15 + Math.random() * 0.4) + ')';
      g.fillRect(Math.random() * 128, Math.random() * 512, 2 + Math.random() * 5, 2 + Math.random() * 7);
    }
    g.fillStyle = 'rgba(240,230,200,0.55)';
    for (var y = 0; y < 512; y += 80) { g.fillRect(8, y + 10, 3, 42); g.fillRect(117, y + 10, 3, 42); }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  /* ---------- misc ---------- */
  U.fmtTime = function (s) {
    s = Math.max(0, s);
    var m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  };
  U.pad3 = function (n) { n = Math.round(n) % 1000; return (n < 100 ? (n < 10 ? '00' : '0') : '') + n; };
  U.pick = function (arr, rnd) { return arr[Math.floor((rnd ? rnd() : Math.random()) * arr.length) % arr.length]; };

  /* ---------- input ---------- */
  var CODE_PITCH_UP = { KeyW: 1, ArrowUp: 1 };
  var CODE_PITCH_DN = { KeyS: 1, ArrowDown: 1 };
  var CODE_ROLL_L = { KeyA: 1, ArrowLeft: 1 };
  var CODE_ROLL_R = { KeyD: 1, ArrowRight: 1 };
  var CODE_YAW_L = { KeyQ: 1 };
  var CODE_YAW_R = { KeyE: 1 };
  var CODE_THR_UP = { KeyR: 1 };
  var CODE_THR_DN = { KeyF: 1 };

  WW.Input = function (opts) {
    this.keys = Object.create(null);
    this.edges = Object.create(null);
    this.isTouch = false;
    this.touch = { stickActive: false, sx: 0, sy: 0, throttle: 0.8, boost: false };
    this.btns = {};
    this.enabled = true;
    this._bind();
  };

  WW.Input.prototype._bind = function () {
    var self = this;
    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(e.code) >= 0) e.preventDefault();
      self.keys[e.code] = true;
      self.edges[e.code] = true;
    });
    window.addEventListener('keyup', function (e) { self.keys[e.code] = false; });
    window.addEventListener('blur', function () { self.keys = Object.create(null); });

    /* touch / pointer controls */
    var zone = document.getElementById('stickZone');
    var knob = document.getElementById('stickKnob');
    var base = document.getElementById('stickBase');
    if (zone && knob && base) {
      var rect = null;
      var move = function (ev) {
        var p = ev.touches ? ev.touches[0] : ev;
        if (!rect) rect = base.getBoundingClientRect();
        var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        var dx = (p.clientX - cx) / (rect.width * 0.42);
        var dy = (p.clientY - cy) / (rect.height * 0.42);
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len > 1) { dx /= len; dy /= len; }
        self.touch.sx = dx;
        self.touch.sy = dy;
        knob.style.transform = 'translate(' + (dx * 44) + 'px,' + (dy * 44) + 'px)';
      };
      zone.addEventListener('pointerdown', function (e) {
        self.touch.stickActive = true; rect = base.getBoundingClientRect();
        zone.setPointerCapture(e.pointerId); move(e); e.preventDefault();
      });
      zone.addEventListener('pointermove', function (e) {
        if (self.touch.stickActive) { move(e); e.preventDefault(); }
      });
      var end = function () {
        self.touch.stickActive = false; self.touch.sx = 0; self.touch.sy = 0;
        knob.style.transform = 'translate(0,0)';
      };
      zone.addEventListener('pointerup', end);
      zone.addEventListener('pointercancel', end);
      zone.addEventListener('pointerleave', function () { if (!self.touch.stickActive) end(); });
    }

    var thrZone = document.getElementById('thrZone');
    var thrHandle = document.getElementById('thrHandle');
    var thrTrack = document.getElementById('thrTrack');
    if (thrZone && thrHandle && thrTrack) {
      var setThr = function (clientY) {
        var r = thrTrack.getBoundingClientRect();
        var t = 1 - (clientY - r.top) / r.height;
        t = U.clamp(t, 0, 1);
        self.touch.throttle = t;
        thrHandle.style.bottom = (t * (r.height - 26)) + 'px';
      };
      thrZone.addEventListener('pointerdown', function (e) {
        setThr(e.clientY); thrZone.setPointerCapture(e.pointerId); e.preventDefault();
      });
      thrZone.addEventListener('pointermove', function (e) {
        if (e.buttons || e.pressure) { setThr(e.clientY); e.preventDefault(); }
      });
    }

    var tbtns = document.querySelectorAll('#touchBtns button');
    for (var i = 0; i < tbtns.length; i++) {
      (function (btn) {
        var act = btn.getAttribute('data-act');
        btn.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          self.edges['TOUCH_' + act] = true;
          self.btns[act] = true;
        });
        btn.addEventListener('pointerup', function () { self.btns[act] = false; });
        btn.addEventListener('pointerleave', function () { self.btns[act] = false; });
      })(tbtns[i]);
    }
  };

  WW.Input.prototype.down = function (code) { return !!this.keys[code]; };
  WW.Input.prototype.pressed = function (code) { return !!this.edges[code]; };
  WW.Input.prototype.consume = function (code) { this.edges[code] = false; };
  WW.Input.prototype.endFrame = function () { this.edges = Object.create(null); };

  WW.Input.prototype.any = function (map) {
    for (var k in map) if (this.keys[k]) return true;
    return false;
  };

  WW.Input.prototype.axes = function () {
    var pitch = 0, roll = 0, yaw = 0, thr = 0;
    if (this.any(CODE_PITCH_UP)) pitch += 1;
    if (this.any(CODE_PITCH_DN)) pitch -= 1;
    if (this.any(CODE_ROLL_L)) roll -= 1;
    if (this.any(CODE_ROLL_R)) roll += 1;
    if (this.any(CODE_YAW_L)) yaw -= 1;
    if (this.any(CODE_YAW_R)) yaw += 1;
    if (this.any(CODE_THR_UP)) thr += 1;
    if (this.any(CODE_THR_DN)) thr -= 1;

    if (this.isTouch) {
      if (Math.abs(this.touch.sx) > 0.12) roll += this.touch.sx;
      if (Math.abs(this.touch.sy) > 0.12) pitch -= this.touch.sy;
    }
    pitch = U.clamp(pitch, -1, 1);
    roll = U.clamp(roll, -1, 1);
    return {
      pitch: pitch, roll: roll, yaw: yaw, throttleDelta: thr,
      boost: this.down('Space') || !!this.btns.boost,
      brake: this.down('KeyB') || this.down('ShiftLeft')
    };
  };
})();
