import { DISTRICTS } from './config.js';

export function makeAtc(radio, world) {
  const calls = [
    'Cascavia Control to all traffic: keep your eyes on the weather.',
    'Control advises a light crosswind across the western approaches.',
    'Fuel check, Kestrel. Report comfortable reserves before the next leg.',
    'Traffic hand-off complete; Port Halvard has the north sector.',
  ];
  let timer = 20 + Math.random() * 15;
  let greeted = new Set();

  return {
    step(dt, aircraft) {
      if (!aircraft?.mesh) return;
      timer -= Math.max(0, dt || 0);
      if (timer <= 0) {
        radio.say('ATC', calls[Math.floor(Math.random() * calls.length)]);
        timer = 20 + Math.random() * 15;
      }
      const { x, z } = aircraft.mesh.position;
      for (const district of DISTRICTS) {
        const distance = Math.hypot(x - district.x, z - district.z);
        if (distance < 500 && !greeted.has(district.name)) {
          radio.say('ATC', `Welcome over ${district.name}, Kestrel. Maintain your course.`);
          greeted.add(district.name);
        }
        if (distance > 650) greeted.delete(district.name);
      }
    },
  };
}
