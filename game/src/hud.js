// HUD panel updates: altitude, speed, heading, throttle, fuel, damage, REP and
// the mission line. Pure DOM writes each frame, cheap and readable.
import { REP_LABELS } from './config.js';

export function makeHud(root) {
  const el = {
    alt: root.querySelector('#alt-tape'),
    speed: root.querySelector('#hud-speed'),
    heading: root.querySelector('#heading-tape'),
    mission: root.querySelector('#mission-line'),
    rep: root.querySelector('#rep-box'),
    fuelDmg: root.querySelector('#fuel-dmg'),
    flash: root.querySelector('#dmg-flash'),
    radio: root.querySelector('#radio-box'),
    hud: root.querySelector('#hud'),
    screen: root.querySelector('#screen'),
  };
  let missionText = '', missionShown = 0, missionClock = 0;
  let smoothAlt = 0, smoothSpeed = 0;
  return {
    show() { el.hud.classList.remove('hidden'); el.screen.classList.add('hidden'); },
    showScreen(title, sub, menu) {
      el.hud.classList.add('hidden');
      el.screen.classList.remove('hidden');
      el.screen.querySelector('h1').textContent = title;
      el.screen.querySelector('h2').textContent = sub;
      el.screen.querySelector('#screen-menu').innerHTML = menu;
    },
    setMission(text) { missionText = text; missionShown = 0; missionClock = 0; el.mission.textContent = ''; },
    setRep(rep, score) { el.rep.textContent = `REP ${rep} · ${REP_LABELS[Math.min(rep, REP_LABELS.length - 1)]} · SCORE ${score}`; },
    flashDamage() { el.flash.style.background = 'rgba(255,60,30,.35)'; setTimeout(() => { el.flash.style.background = 'rgba(255,60,30,0)'; }, 180); },
    radioLine(text) { el.radio.textContent = text; el.radio.classList.remove('hidden'); },
    hideRadio() { el.radio.classList.add('hidden'); },
    step(aircraft, throttle) {
      const m = aircraft.mesh;
      const alt = Math.max(0, Math.round(m.position.y));
      smoothAlt += (alt - smoothAlt) * 0.16;
      smoothSpeed += (aircraft.speed - smoothSpeed) * 0.16;
      missionClock += 1 / 60;
      missionShown = Math.min(missionText.length, Math.floor(missionClock * 28));
      el.mission.textContent = missionText.slice(0, missionShown) + (missionShown < missionText.length && Math.sin(missionClock * 8) > 0 ? '▌' : '');
      el.alt.textContent = `ALT ${Math.round(smoothAlt)}`;
      el.speed.textContent = `${Math.round(smoothSpeed)} kts`;
      let deg = Math.round(((-m.rotation.y * 180 / Math.PI) % 360 + 360) % 360);
      el.heading.textContent = `HDG ${String(deg).padStart(3, '0')}°  THR ${Math.round(throttle * 100)}%`;
      const fuel = Math.round(aircraft.fuel);
      const dmg = Math.round(aircraft.damage);
      el.fuelDmg.innerHTML = `FUEL ${fuel}% ${fuel < 25 ? '⚠' : ''}<br>DAMAGE ${dmg}% ${dmg > 60 ? '⚠' : ''}`;
      el.alt.style.color = fuel < 25 ? '#ff9a6b' : '#ffe9c4';
      el.fuelDmg.style.color = dmg > 60 ? '#ff9a6b' : '#ffe9c4';
    },
  };
}
