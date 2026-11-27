/* WINDWARD — procedural audio (no files, all synthesis) */
(function () {
  'use strict';
  var WW = window.WW;

  function AudioEngine() {
    this.ctx = null;
    this.ready = false;
    this.muted = false;
    this.warnOn = false;
    this.padVoices = [];
    this._lastBlip = 0;
  }

  AudioEngine.prototype.init = function () {
    if (this.ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    var ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    /* ---- engine: two detuned saws + prop chop ---- */
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0.0;
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 620;
    this.engFilter.Q.value = 3.2;
    this.engFilter.connect(this.engGain);
    this.engGain.connect(this.master);

    this.oscA = ctx.createOscillator();
    this.oscA.type = 'sawtooth';
    this.oscA.frequency.value = 62;
    this.oscB = ctx.createOscillator();
    this.oscB.type = 'square';
    this.oscB.frequency.value = 93;
    var bGain = ctx.createGain();
    bGain.gain.value = 0.35;
    this.oscA.connect(this.engFilter);
    this.oscB.connect(bGain);
    bGain.connect(this.engFilter);

    /* prop chop: gain modulation */
    this.chopOsc = ctx.createOscillator();
    this.chopOsc.type = 'triangle';
    this.chopOsc.frequency.value = 34;
    this.chopGain = ctx.createGain();
    this.chopGain.gain.value = 0.14;
    this.chopOsc.connect(this.chopGain);
    this.chopGain.connect(this.engGain.gain);

    /* ---- noise buffer ---- */
    var len = ctx.sampleRate * 2.2;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    var windSrc = ctx.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 520;
    this.windFilter.Q.value = 0.7;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
    windSrc.start();

    /* rain layer */
    var rainSrc = ctx.createBufferSource();
    rainSrc.buffer = buf;
    rainSrc.loop = true;
    this.rainFilter = ctx.createBiquadFilter();
    this.rainFilter.type = 'highpass';
    this.rainFilter.frequency.value = 1800;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rainSrc.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.master);
    rainSrc.start();

    /* stall / warning horn */
    this.horn = ctx.createOscillator();
    this.horn.type = 'square';
    this.horn.frequency.value = 420;
    this.hornGain = ctx.createGain();
    this.hornGain.gain.value = 0;
    var hornFilt = ctx.createBiquadFilter();
    hornFilt.type = 'lowpass';
    hornFilt.frequency.value = 1400;
    this.horn.connect(hornFilt);
    hornFilt.connect(this.hornGain);
    this.hornGain.connect(this.master);
    this.horn.start();

    /* pad for ambience */
    var padGain = ctx.createGain();
    padGain.gain.value = 0.0;
    padGain.connect(this.master);
    this.padGain = padGain;
    var notes = [110, 164.81, 220, 277.18];
    for (var k = 0; k < notes.length; k++) {
      var o = ctx.createOscillator();
      o.type = k === 3 ? 'triangle' : 'sine';
      o.frequency.value = notes[k];
      var g = ctx.createGain();
      g.gain.value = k === 0 ? 0.5 : 0.16;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      o.connect(g); g.connect(lp); lp.connect(padGain);
      /* slow shimmer */
      var lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + k * 0.017;
      var lg = ctx.createGain();
      lg.gain.value = 0.06;
      lfo.connect(lg); lg.connect(g.gain);
      o.start(); lfo.start();
      this.padVoices.push(o);
    }

    this.ready = true;
  };

  AudioEngine.prototype.resume = function () {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  };

  AudioEngine.prototype.setMuted = function (m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  };

  AudioEngine.prototype.update = function (dt, s) {
    if (!this.ready) return;
    var ctx = this.ctx, t = ctx.currentTime;
    var thr = s.throttle === undefined ? 0.7 : s.throttle;
    var spd = s.speed || 0;
    var running = s.engine !== false;

    /* engine pitch tracks throttle + airspeed */
    var rpm = 0.35 + thr * 0.65;
    var f = 46 + rpm * 34 + Math.min(spd, 130) * 0.16;
    this.oscA.frequency.setTargetAtTime(f, t, 0.12);
    this.oscB.frequency.setTargetAtTime(f * 1.503, t, 0.14);
    this.chopOsc.frequency.setTargetAtTime(18 + rpm * 42, t, 0.1);
    this.engFilter.frequency.setTargetAtTime(360 + rpm * 900, t, 0.15);
    var eg = running ? (0.055 + thr * 0.1) : 0.0;
    this.engGain.gain.setTargetAtTime(eg, t, 0.18);

    var windAmt = Math.min(1, spd / 120);
    this.windGain.gain.setTargetAtTime(0.02 + windAmt * 0.13 + (s.storm ? 0.06 : 0), t, 0.25);
    this.windFilter.frequency.setTargetAtTime(360 + windAmt * 900, t, 0.3);
    this.rainGain.gain.setTargetAtTime(s.storm ? 0.055 : 0, t, 0.9);
    this.padGain.gain.setTargetAtTime(s.night ? 0.055 : 0.032, t, 1.4);

    var hg = (s.stall || s.warn) ? 0.028 : 0;
    if (s.stall) this.horn.frequency.setTargetAtTime(560, t, 0.05);
    else if (s.warn) this.horn.frequency.setTargetAtTime(380, t, 0.05);
    this.hornGain.gain.setTargetAtTime(hg, t, 0.06);
  };

  AudioEngine.prototype.blip = function (freq, dur, type, vol) {
    if (!this.ready) return;
    var ctx = this.ctx, t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq || 660;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(vol === undefined ? 0.09 : vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.16));
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + (dur || 0.16) + 0.05);
  };

  AudioEngine.prototype.chime = function (good) {
    var self = this;
    if (!this.ready) return;
    this.blip(good === false ? 320 : 784, 0.2, 'sine', 0.08);
    setTimeout(function () { self.blip(good === false ? 240 : 1175, 0.34, 'sine', 0.07); }, 105);
  };

  AudioEngine.prototype.noiseHit = function (dur, freq, vol, type) {
    if (!this.ready) return;
    var ctx = this.ctx, t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 1;
    var f = ctx.createBiquadFilter();
    f.type = type || 'lowpass';
    f.frequency.value = freq || 900;
    var g = ctx.createGain();
    g.gain.value = vol === undefined ? 0.12 : vol;
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.3));
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + (dur || 0.3) + 0.05);
  };

  AudioEngine.prototype.gear = function () {
    if (!this.ready) return;
    this.noiseHit(0.5, 420, 0.05, 'bandpass');
    this.blip(180, 0.06, 'square', 0.03);
  };

  AudioEngine.prototype.impact = function (strength) {
    if (!this.ready) return;
    var s = Math.min(1, strength || 0.5);
    this.noiseHit(0.45, 260, 0.22 * s, 'lowpass');
    this.blip(70, 0.3, 'sine', 0.18 * s);
  };

  AudioEngine.prototype.radio = function () {
    if (!this.ready) return;
    this.blip(1200, 0.05, 'square', 0.035);
    this.noiseHit(0.12, 2400, 0.02, 'highpass');
  };

  AudioEngine.prototype.thunder = function () {
    if (!this.ready) return;
    var ctx = this.ctx, t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.6;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 180;
    var g = ctx.createGain();
    g.gain.value = 0.0;
    g.gain.linearRampToValueAtTime(0.16, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 2.6);
  };

  WW.AudioEngine = AudioEngine;
})();
