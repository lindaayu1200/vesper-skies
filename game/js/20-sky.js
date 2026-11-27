/* WINDWARD — sky dome, sun/moon, clouds, ocean, weather */
(function () {
  'use strict';
  var WW = window.WW, U = WW.U;

  var PRESETS = {
    day: {
      top: 0x1f6fa4, horizon: 0xd7e9e3, bottom: 0x7fa2a4,
      sunCol: 0xfff4d6, sunEl: 52, sunAz: 128, sunScale: 1.0,
      light: 0xfff2d8, lightI: 1.55, hemiSky: 0xa8dcf0, hemiGround: 0x54633e, hemiI: 0.9,
      amb: 0.26, ambCol: 0xd6e8ee,
      fog: 0xc4dcd9, fogD: 0.000085, deep: 0x0d4257, shallow: 0x3fa0a2, wave: 1.0,
      cloud: 0xfffdf7, cloudEm: 0x6f777c, stars: 0, rain: 0, expo: 1.0, hedge: 0.2, night: 0, storm: 0
    },
    dawn: {
      top: 0x35648f, horizon: 0xffcfa4, bottom: 0x8f9d94,
      sunCol: 0xffd9b0, sunEl: 19, sunAz: 96, sunScale: 1.35,
      light: 0xffd2a2, lightI: 1.5, hemiSky: 0xbcd2df, hemiGround: 0x5a5340, hemiI: 0.85,
      amb: 0.24, ambCol: 0xe8d8c6,
      fog: 0xdccfc0, fogD: 0.00012, deep: 0x0d3a50, shallow: 0x3f959a, wave: 0.9,
      cloud: 0xffe6cd, cloudEm: 0x7e6a5c, stars: 0.06, rain: 0, expo: 1.0, hedge: 0.45, night: 0, storm: 0
    },
    sunset: {
      top: 0x3d4f80, horizon: 0xffad64, bottom: 0x8e7f78,
      sunCol: 0xffcf88, sunEl: 13, sunAz: 262, sunScale: 1.9,
      light: 0xffb377, lightI: 1.6, hemiSky: 0xf0c39a, hemiGround: 0x453c48, hemiI: 0.8,
      amb: 0.22, ambCol: 0xe6c4a6,
      fog: 0xe0a37a, fogD: 0.00011, deep: 0x0f3448, shallow: 0x3a8f92, wave: 1.05,
      cloud: 0xffd9b0, cloudEm: 0x82604c, stars: 0.04, rain: 0, expo: 1.0, hedge: 0.6, night: 0, storm: 0
    },
    dusk: {
      top: 0x1f2a4a, horizon: 0xb06a58, bottom: 0x453f4b,
      sunCol: 0xff9f6b, sunEl: 6, sunAz: 250, sunScale: 1.2,
      light: 0xc09192, lightI: 0.95, hemiSky: 0x7d7fa2, hemiGround: 0x232b38, hemiI: 0.7,
      amb: 0.2, ambCol: 0x8c86a8,
      fog: 0x574b5c, fogD: 0.00013, deep: 0x09202f, shallow: 0x245e6b, wave: 1.0,
      cloud: 0xa98a96, cloudEm: 0x40384c, stars: 0.3, rain: 0, expo: 1.0, hedge: 0.35, night: 0.55, storm: 0
    },
    night: {
      top: 0x03070f, horizon: 0x142a44, bottom: 0x0a121a,
      sunCol: 0xcfe2ff, sunEl: 46, sunAz: 210, sunScale: 0.55,
      light: 0xb4c9ea, lightI: 1.2, hemiSky: 0x3c547a, hemiGround: 0x141d27, hemiI: 0.9,
      amb: 0.3, ambCol: 0x46608c,
      fog: 0x0b1723, fogD: 0.00011, deep: 0x030f1a, shallow: 0x0f3245, wave: 0.95,
      cloud: 0x39445c, cloudEm: 0x1c2436, stars: 1, rain: 0, expo: 1.0, hedge: 0.1, night: 1, storm: 0
    },
    storm: {
      top: 0x2a3138, horizon: 0x8b9497, bottom: 0x4c565a,
      sunCol: 0xdfe7ea, sunEl: 38, sunAz: 150, sunScale: 0.4,
      light: 0xa8bac4, lightI: 1.1, hemiSky: 0x9eacb2, hemiGround: 0x36413f, hemiI: 1.0,
      amb: 0.32, ambCol: 0xbac8ce,
      fog: 0x78878b, fogD: 0.00034, deep: 0x17333c, shallow: 0x3a636b, wave: 1.7,
      cloud: 0x5d666d, cloudEm: 0x333b40, stars: 0, rain: 1, expo: 1.0, hedge: 0.2, night: 0.25, storm: 1
    }
  };

  WW.PRESETS = PRESETS;

  function SkySystem(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.presetName = 'day';
    this.preset = PRESETS.day;
    this.time = 0;
    this.onPreset = [];
    this.lightningTimer = 6;
    this.flash = 0;

    this._buildSky();
    this._buildLights();
    this._buildOcean();
    this._buildClouds();
    this._buildStars();
    this._buildRain();
    this.setPreset('day');
  }

  SkySystem.prototype._buildSky = function () {
    var geo = new THREE.SphereGeometry(16000, 32, 20);
    this.skyUniforms = {
      uTop: { value: new THREE.Color(PRESETS.day.top) },
      uHorizon: { value: new THREE.Color(PRESETS.day.horizon) },
      uBottom: { value: new THREE.Color(PRESETS.day.bottom) },
      uSunCol: { value: new THREE.Color(PRESETS.day.sunCol) },
      uSunDir: { value: new THREE.Vector3(0, 0.7, 0.7) },
      uHedge: { value: 0.2 },
      uFlash: { value: 0 },
      uSunScale: { value: 1 }
    };
    var mat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: [
        'varying vec3 vDir;',
        'void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uTop,uHorizon,uBottom,uSunCol,uSunDir;',
        'uniform float uHedge,uFlash,uSunScale;',
        'varying vec3 vDir;',
        'void main(){',
        '  vec3 d = normalize(vDir);',
        '  float h = d.y;',
        '  float t = smoothstep(-0.02, 0.46, h);',
        '  vec3 col = mix(uHorizon, uTop, t);',
        '  col = mix(uBottom, col, smoothstep(-0.30, -0.01, h));',
        '  float sd = max(dot(d, normalize(uSunDir)), 0.0);',
        '  col += uSunCol * pow(sd, 520.0) * 3.2 * uSunScale;',
        '  col += uSunCol * pow(sd, 14.0) * 0.30 * uHedge;',
        '  col += uSunCol * pow(sd, 3.0) * 0.10 * uHedge;',
        '  col += vec3(0.55,0.62,0.7) * uFlash * (0.4 + 0.6*smoothstep(-0.1,0.5,h));',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    var glow = U.glowTex(0.95);
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glow, color: 0xfff0cc, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, fog: false, opacity: 0.9
    }));
    this.sunSprite.scale.set(2600, 2600, 1);
    this.sunSprite.renderOrder = -9;
    this.scene.add(this.sunSprite);

    this.moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glow, color: 0xcfe1ff, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, fog: false, opacity: 0.0
    }));
    this.moonSprite.scale.set(1100, 1100, 1);
    this.scene.add(this.moonSprite);
  };

  SkySystem.prototype._buildLights = function () {
    this.hemi = new THREE.HemisphereLight(0xa8dcf0, 0x54633e, 0.6);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 1.15);
    this.sun.position.set(3000, 6000, 2000);
    this.scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0x8fb6d8, 0.22);
    this.fill.position.set(-2500, 1800, -3000);
    this.scene.add(this.fill);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.26);
    this.scene.add(this.ambient);
  };

  SkySystem.prototype._buildOcean = function () {
    var geo = new THREE.PlaneGeometry(30000, 30000, 1, 1);
    geo.rotateX(-Math.PI / 2);
    this.oceanUniforms = {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(PRESETS.day.deep) },
      uShallow: { value: new THREE.Color(PRESETS.day.shallow) },
      uSunDir: { value: new THREE.Vector3(0, 0.7, 0.7) },
      uSunCol: { value: new THREE.Color(PRESETS.day.sunCol) },
      uFogColor: { value: new THREE.Color(PRESETS.day.fog) },
      uFogDensity: { value: PRESETS.day.fogD },
      uWave: { value: 1 },
      uSky: { value: new THREE.Color(PRESETS.day.horizon) },
      uFlash: { value: 0 },
      uNight: { value: 0 }
    };
    var mat = new THREE.ShaderMaterial({
      uniforms: this.oceanUniforms,
      fog: false,
      vertexShader: [
        'varying vec3 vWorld;',
        'void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWorld = wp.xyz;',
        '  gl_Position = projectionMatrix * viewMatrix * wp; }'
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime,uFogDensity,uWave,uFlash,uNight;',
        'uniform vec3 uDeep,uShallow,uSunDir,uSunCol,uFogColor,uSky;',
        'varying vec3 vWorld;',
        'vec2 waveGrad(vec2 p, float t, float scale){',
        '  vec2 g = vec2(0.0);',
        '  vec2 d1 = vec2(0.882,0.471); g += d1 * cos(dot(p,d1)*0.062 + t*0.85) * 0.062*0.55;',
        '  vec2 d2 = vec2(-0.610,0.792); g += d2 * cos(dot(p,d2)*0.121 - t*1.32) * 0.121*0.30;',
        '  vec2 d3 = vec2(0.310,-0.951); g += d3 * cos(dot(p,d3)*0.291 + t*2.10) * 0.291*0.085;',
        '  vec2 d4 = vec2(-0.930,-0.368); g += d4 * cos(dot(p,d4)*0.640 - t*3.05) * 0.640*0.022;',
        '  vec2 d5 = vec2(0.520,0.854); g += d5 * cos(dot(p,d5)*1.430 + t*4.30) * 1.430*0.007;',
        '  return g * scale;',
        '}',
        'void main(){',
        '  vec3 viewVec = cameraPosition - vWorld;',
        '  float dist = length(viewVec);',
        '  vec3 V = normalize(viewVec);',
        '  float detail = exp(-dist/2600.0);',
        '  vec2 g = waveGrad(vWorld.xz, uTime, uWave * (0.35 + 0.65*detail));',
        '  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));',
        '  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);',
        '  vec3 col = mix(uDeep, uShallow, clamp(fres*1.25 + 0.06, 0.0, 1.0));',
        '  col = mix(col, uSky, fres*0.30);',
        '  vec3 R = reflect(-V, N);',
        '  float spec = pow(max(dot(R, normalize(uSunDir)), 0.0), 180.0);',
        '  col += uSunCol * spec * 1.5;',
        '  float glint = pow(max(dot(R, normalize(uSunDir)), 0.0), 900.0);',
        '  col += vec3(1.0,0.95,0.85) * glint * 1.6;',
        '  float haze = 1.0 - exp(-dist*uFogDensity*1.9);',
        '  col = mix(col, uFogColor, clamp(haze, 0.0, 1.0));',
        '  col += vec3(0.35,0.42,0.5) * uFlash;',
        '  col *= mix(1.0, 0.55, uNight);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    });
    this.ocean = new THREE.Mesh(geo, mat);
    this.ocean.position.y = -0.6;
    this.ocean.frustumCulled = false;
    this.scene.add(this.ocean);
  };

  SkySystem.prototype._cloudTexture = function () {
    if (this._cloudTex) return this._cloudTex;
    var S = 160, c = U.canvas(S, S), g = c.getContext('2d');
    var rnd = U.rng(5511);
    g.clearRect(0, 0, S, S);
    for (var i = 0; i < 30; i++) {
      var a = rnd() * 6.283, rr = Math.pow(rnd(), 0.7) * 40;
      var x = S * 0.5 + Math.cos(a) * rr, y = S * 0.52 + Math.sin(a) * rr * 0.62;
      var rad = 22 + rnd() * 26;
      var grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(255,255,255,0.34)');
      grd.addColorStop(0.5, 'rgba(255,255,255,0.16)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.arc(x, y, rad, 0, 6.283);
      g.fill();
    }
    /* fade the border so sprite edges never show */
    var mask = g.createRadialGradient(S / 2, S / 2, S * 0.28, S / 2, S / 2, S * 0.5);
    mask.addColorStop(0, 'rgba(0,0,0,0)');
    mask.addColorStop(1, 'rgba(0,0,0,0.85)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = mask;
    g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'source-over';
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this._cloudTex = tex;
    return tex;
  };

  SkySystem.prototype._buildClouds = function () {
    var tex = this._cloudTexture();
    var rnd = U.rng(9137);
    this.cloudGroup = new THREE.Group();
    this.cloudMats = [];
    for (var c = 0; c < 30; c++) {
      var cx = (rnd() - 0.5) * 17500;
      var cz = (rnd() - 0.5) * 17500;
      var cy = 900 + rnd() * 900;
      var baseR = 300 + rnd() * 420;
      if (rnd() < 0.15) { baseR *= 0.55; cy = 620 + rnd() * 180; }
      var mat = new THREE.SpriteMaterial({
        map: tex, color: 0xffffff, transparent: true, opacity: 0.9,
        depthWrite: false, fog: true
      });
      this.cloudMats.push(mat);
      var puffs = 6 + Math.floor(rnd() * 4);
      for (var p = 0; p < puffs; p++) {
        var ang = rnd() * 6.283;
        var rad = baseR * (0.15 + rnd() * 1.0);
        var sp = new THREE.Sprite(mat);
        sp.position.set(
          cx + Math.cos(ang) * rad,
          cy + (rnd() - 0.5) * baseR * 0.26,
          cz + Math.sin(ang) * rad * 0.8
        );
        var sc = baseR * (0.85 + rnd() * 0.8);
        sp.scale.set(sc, sc * (0.44 + rnd() * 0.2), 1);
        this.cloudGroup.add(sp);
      }
    }
    this.scene.add(this.cloudGroup);
  };

  SkySystem.prototype._buildStars = function () {
    var N = 1400, pos = new Float32Array(N * 3);
    var rnd = U.rng(4242);
    for (var i = 0; i < N; i++) {
      var th = rnd() * Math.PI * 2;
      var ph = Math.acos(rnd() * 0.96 + 0.04);
      var r = 13000;
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      pos[i * 3 + 1] = Math.cos(ph) * r;
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xdfe9ff, size: 2.4, sizeAttenuation: false, transparent: true,
      opacity: 0, depthWrite: false, fog: false
    });
    this.stars = new THREE.Points(geo, this.starMat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  };

  SkySystem.prototype._buildRain = function () {
    var N = 900;
    var pos = new Float32Array(N * 6);
    var rnd = U.rng(7733);
    this.rainData = [];
    for (var i = 0; i < N; i++) {
      var x = (rnd() - 0.5) * 420, y = rnd() * 260, z = (rnd() - 0.5) * 420;
      var len = 8 + rnd() * 16;
      this.rainData.push({ x: x, y: y, z: z, len: len, spd: 90 + rnd() * 60 });
      pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
      pos[i * 6 + 3] = x - 1.4; pos[i * 6 + 4] = y - len; pos[i * 6 + 5] = z;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xcfe2ea, transparent: true, opacity: 0.0, depthWrite: false, fog: false
    });
    this.rain = new THREE.LineSegments(geo, this.rainMat);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.scene.add(this.rain);
    this.rainPos = pos;
  };

  SkySystem.prototype.setPreset = function (name) {
    var p = PRESETS[name] || PRESETS.day;
    this.presetName = name;
    this.preset = p;

    this.skyUniforms.uTop.value.setHex(p.top);
    this.skyUniforms.uHorizon.value.setHex(p.horizon);
    this.skyUniforms.uBottom.value.setHex(p.bottom);
    this.skyUniforms.uSunCol.value.setHex(p.sunCol);
    this.skyUniforms.uHedge.value = p.hedge;
    this.skyUniforms.uSunScale.value = p.sunScale;

    var el = p.sunEl * U.DEG, az = p.sunAz * U.DEG;
    var dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    this.skyUniforms.uSunDir.value.copy(dir);
    this.oceanUniforms.uSunDir.value.copy(dir);
    this.oceanUniforms.uSunCol.value.setHex(p.sunCol);
    this.oceanUniforms.uSky.value.setHex(p.horizon);
    this.oceanUniforms.uDeep.value.setHex(p.deep);
    this.oceanUniforms.uShallow.value.setHex(p.shallow);
    this.oceanUniforms.uFogColor.value.setHex(p.fog);
    this.oceanUniforms.uFogDensity.value = p.fogD;
    this.oceanUniforms.uWave.value = p.wave;
    this.oceanUniforms.uNight.value = p.night;

    /* three.js r155+ physical light units: scale the authored values */
    var LS = 1.55;
    this.sun.color.setHex(p.light);
    this.sun.intensity = p.lightI * LS;
    this.sun.position.copy(dir).multiplyScalar(9000);
    this.hemi.color.setHex(p.hemiSky);
    this.hemi.groundColor.setHex(p.hemiGround);
    this.hemiBase = p.hemiI * LS;
    this.hemi.intensity = this.hemiBase;
    this.ambient.color.setHex(p.ambCol || 0xffffff);
    this.ambient.intensity = (p.amb === undefined ? 0.22 : p.amb) * LS * 0.8;
    this.fill.intensity = (0.10 + p.hemiI * 0.22) * LS;

    this.scene.fog = new THREE.FogExp2(p.fog, p.fogD);
    this.renderer.setClearColor(p.fog);

    this.sunSprite.position.copy(dir).multiplyScalar(12000);
    this.sunSprite.material.color.setHex(p.sunCol);
    this.sunSprite.material.opacity = (p.rain > 0.2 ? 0.12 : 0.85);
    this.sunSprite.scale.setScalar(1150 * p.sunScale);

    this.moonSprite.position.copy(dir).multiplyScalar(-11000);
    this.moonSprite.position.y = Math.abs(this.moonSprite.position.y) * 0.8 + 2600;
    this.moonSprite.material.opacity = p.night > 0.4 ? 0.55 : 0;

    this.starMat.opacity = p.stars;
    this.stars.visible = p.stars > 0.02;

    if (this.cloudMats) {
      for (var ci = 0; ci < this.cloudMats.length; ci++) {
        this.cloudMats[ci].color.setHex(p.cloud);
        this.cloudMats[ci].opacity = p.rain > 0.2 ? 0.95 : 0.88;
      }
    }

    this.rainMat.opacity = p.rain > 0 ? 0.5 : 0;
    this.rain.visible = p.rain > 0;
    if (this.renderer) this.renderer.toneMappingExposure = p.expo;

    this.isNight = p.night > 0.4;
    this.isStorm = p.rain > 0;

    for (var i = 0; i < this.onPreset.length; i++) this.onPreset[i](name, p);
  };

  SkySystem.prototype.update = function (dt, camera, wind) {
    this.time += dt;
    this.oceanUniforms.uTime.value = this.time;

    /* sky follows camera so the dome never clips */
    this.sky.position.copy(camera.position);
    this.stars.position.copy(camera.position);
    this.sunSprite.position.copy(camera.position).addScaledVector(
      this.skyUniforms.uSunDir.value, 12000);
    this.moonSprite.position.copy(camera.position).add(
      new THREE.Vector3(-this.skyUniforms.uSunDir.value.x, 0.55, -this.skyUniforms.uSunDir.value.z).multiplyScalar(9000));

    /* drifting clouds; wrap around the world */
    var drift = wind || { x: 1, z: 0.3 };
    this.cloudGroup.position.x += drift.x * dt * 1.6;
    this.cloudGroup.position.z += drift.z * dt * 1.6;
    if (this.cloudGroup.position.x > 6000) this.cloudGroup.position.x -= 12000;
    if (this.cloudGroup.position.x < -6000) this.cloudGroup.position.x += 12000;
    if (this.cloudGroup.position.z > 6000) this.cloudGroup.position.z -= 12000;
    if (this.cloudGroup.position.z < -6000) this.cloudGroup.position.z += 12000;

    /* lightning */
    if (this.isStorm) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 7 + Math.random() * 16;
        this.flash = 1;
        if (this.onLightning) this.onLightning();
      }
    }
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 3.2);
      var f = this.flash * this.flash;
      this.skyUniforms.uFlash.value = f * 0.85;
      this.oceanUniforms.uFlash.value = f * 0.5;
      this.hemi.intensity = this.hemiBase + f * 4.0;
    } else {
      this.skyUniforms.uFlash.value = 0;
      this.oceanUniforms.uFlash.value = 0;
      this.hemi.intensity = this.hemiBase;
    }

    /* rain streaks ride along with the camera */
    if (this.rain.visible) {
      var p = this.rainPos;
      var cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      for (var i = 0; i < this.rainData.length; i++) {
        var r = this.rainData[i];
        r.y -= r.spd * dt;
        if (r.y < -40) { r.y += 300; }
        var ax = r.x + drift.x * dt * 12;
        r.x = ((ax + 210) % 420 + 420) % 420 - 210;
        var wx = cx + r.x, wy = cy + r.y - 80, wz = cz + r.z;
        var o = i * 6;
        p[o] = wx; p[o + 1] = wy; p[o + 2] = wz;
        p[o + 3] = wx - 1.2; p[o + 4] = wy - r.len; p[o + 5] = wz;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  };

  WW.SkySystem = SkySystem;
})();
