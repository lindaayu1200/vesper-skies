// Procedural cockpit sounds. The audio graph is created only after user input.
export function makeAudio() {
  let context = null;
  let engine = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    context = new AudioContext();
    engineGain = context.createGain();
    engineGain.gain.value = 0;
    engineGain.connect(context.destination);
    engine = context.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.value = 55;
    engine.connect(engineGain);
    engine.start();
    return true;
  }

  function tone(frequency, duration, type, volume, drop) {
    if (muted || !ensure()) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const now = context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (drop) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * drop), now + duration);
    envelope.gain.setValueAtTime(Math.max(0.001, volume), now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  return {
    engineThrottle(t) {
      const throttle = Math.max(0, Math.min(1, Number(t) || 0));
      if (!ensure()) return;
      engine.frequency.setTargetAtTime(48 + throttle * 92, context.currentTime, 0.04);
      engineGain.gain.setTargetAtTime(muted ? 0 : 0.025 + throttle * 0.075, context.currentTime, 0.04);
    },
    chime() { tone(880, 0.18, 'sine', 0.18); },
    alarm() { tone(220, 0.3, 'square', 0.16); },
    boom() { tone(75, 0.8, 'sawtooth', 0.3, 0.28); },
    setMuted(value) {
      muted = Boolean(value);
      if (engineGain) engineGain.gain.setTargetAtTime(muted ? 0 : 0.025, context.currentTime, 0.03);
    },
  };
}
