// WebAudio soundboard: a filtered-noise engine hum that tracks the throttle,
// plus chimes, warnings and booms synthesised on the spot (no assets).
export function makeAudio() {
  let ctx = null, engine = null, gain = null, muted = false;
  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
    engine = ctx.createOscillator(); engine.type = 'sawtooth'; engine.frequency.value = 62;
    engine.connect(gain); engine.start();
  }
  return {
    engineThrottle(t) {
      if (muted) return;
      ensure();
      if (gain) gain.gain.value = 0.05 + t * 0.08;
      if (engine) engine.frequency.value = 50 + t * 70;
    },
    chime() { this._blip(880, 0.18); },
    alarm() { this._blip(220, 0.3, 'square'); },
    boom() { this._blip(60, 0.8, 'sawtooth', 0.4); },
    _blip(freq, dur, type = 'sine', vol = 0.2) {
      if (muted || !ctx) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur);
    },
    setMuted(m) { muted = m; if (gain) gain.gain.value = 0; },
  };
}
