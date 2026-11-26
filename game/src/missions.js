// The sortie ladder: seven missions of different shapes, each with its own
// objectives, radio calls, hazards and success checks.
// three.js ships as a global from vendor/three.min.js (classic script in index.html).
import { RING, WORLD, DISTRICTS } from './config.js';

const GOLD = 0xffc46b, BLUE = 0x7fd4ff, RED = 0xff5a3c;

function ringMesh(color = GOLD) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(RING.radius, RING.tube, 8, 28),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.4 }));
  return m;
}

function placeRing(mesh, x, y, z, heading = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.y = heading;
  return mesh;
}

function passedThrough(aircraft, obj, slack = 1.6) {
  // Within the ring plane and inside the radius, tested on the ring's normal.
  const p = aircraft.mesh.position;
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion(obj.quaternion ?? obj.getWorldQuaternion(new THREE.Quaternion()));
  const d = p.distanceTo(obj.position);
  if (d > RING.radius * slack) return false;
  return Math.abs(n.dot(p.clone().sub(obj.position))) < 22;
}

function nearPoint(aircraft, x, y, z, r) {
  const p = aircraft.mesh.position;
  return Math.hypot(p.x - x, p.y - y, p.z - z) < r;
}

/** Night lighting helper for Night Watch. */
export function setNight(scene, on) {
  if (on) {
    scene.fog.color.setHex(0x0a1024);
    scene.background.setHex(0x0a1024);
    scene.fog.near = 900; scene.fog.far = 4200;
    scene.userData.hemi.intensity = 0.25;
    scene.userData.sun.intensity = 0.12;
  } else {
    scene.fog.color.setHex(WORLD.fogColor);
    scene.background.setHex(WORLD.fogColor);
    scene.fog.near = WORLD.fogNear; scene.fog.far = WORLD.fogFar;
    scene.userData.hemi.intensity = 0.85;
    scene.userData.sun.intensity = 1.15;
  }
}

export const MISSIONS = [
  {
    name: 'Sortie 1 — First Light',
    brief: 'Climb off the deck and thread the three training rings above Verdan Fields.',
    radio: ['Vesper Lead: Kestrel is yours, rookie. Keep her level and take the gold rings.', 'Vesper Lead: Ring one, then climb. Watch your speed in the turns.'],
    build(world) {
      const objs = [];
      const rw = WORLD.runway;
      const pts = [
        [rw.x + 300, 220, rw.z - 300], [rw.x + 700, 300, rw.z - 800], [rw.x + 1100, 360, rw.z - 1300],
      ];
      for (const [x, y, z] of pts) objs.push(placeRing(ringMesh(), x, y, z, Math.atan2(z - pts[0][2], x - pts[0][0]) + Math.PI / 2));
      return { type: 'rings', meshes: objs, done: 0, flak: false };
    },
    step(aircraft, st) {
      const m = st.meshes[st.done];
      if (m && passedThrough(aircraft, m)) {
        m.material = m.material.clone(); m.material.color.setHex(BLUE); m.material.emissive.setHex(BLUE);
        st.done += 1;
        return { event: 'ring', complete: st.done >= st.meshes.length };
      }
      return { complete: false };
    },
  },
  {
    name: 'Sortie 2 — Mail Run',
    brief: 'Carry the mail bag low over Port Halvard. The flak tower there is hot — stay clear of it.',
    radio: ['Tower: Mail bag is strapped down. Low pass over Port Halvard, rookie.', 'Vesper Lead: The harbor flak gunners are jumpy today. Mind the tower.'],
    build(world) {
      const objs = [];
      const pts = [[900, 180, -600], [1400, 200, -300], [1800, 240, 100], [1300, 160, 600]];
      for (const [x, y, z] of pts) objs.push(placeRing(ringMesh(), x, y, z, Math.atan2(z - pts[0][2], x - pts[0][0]) + Math.PI / 2));
      return { type: 'rings', meshes: objs, done: 0, flak: true, flakAt: [DISTRICTS[0]] };
    },
    step(aircraft, st) {
      const m = st.meshes[st.done];
      if (m && passedThrough(aircraft, m)) { st.done += 1; return { event: 'ring', complete: st.done >= st.meshes.length }; }
      return { complete: false };
    },
  },
  {
    name: 'Sortie 3 — Canyon Cutter',
    brief: 'Thread The Gullet at low altitude. Six gates, no room to climb out early.',
    radio: ['Vesper Lead: The Gullet runs west to east. Stay under the rim or the wind shoves you into the wall.', 'Tower: Six gates, low pass. Show them what the Kestrel can bite.'],
    build(world) {
      const objs = [];
      const pts = [[-500, 60, 2800], [0, 55, 2850], [500, 60, 2900], [1000, 70, 2950], [1500, 90, 3000], [2000, 120, 3050]];
      for (const [x, y, z] of pts) objs.push(placeRing(ringMesh(RED), x, y, z, Math.PI / 2));
      return { type: 'rings', meshes: objs, done: 0, flak: false };
    },
    step(aircraft, st) {
      const m = st.meshes[st.done];
      if (m && passedThrough(aircraft, m)) { st.done += 1; return { event: 'ring', complete: st.done >= st.meshes.length }; }
      return { complete: false };
    },
  },
  {
    name: 'Sortie 4 — Larkspire Patrol',
    brief: 'Patrol high over Larkspire Heights. Hit every beacon tower and keep your speed up.',
    radio: ['Vesper Lead: Spotters on Larkspire want a high pass over each tower.', 'Vesper Lead: The heights flak is cold but the ridge shear is not. Climb with nose, not throttle.'],
    build(world) {
      const objs = [];
      const pts = [[-1500, 520, -1800], [-1100, 560, -2200], [-1900, 540, -1400], [-1400, 600, -1000]];
      for (const [x, y, z] of pts) {
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(24, 10, 8),
          new THREE.MeshStandardMaterial({ color: BLUE, emissive: BLUE, emissiveIntensity: 0.8 }));
        beacon.position.set(x, y, z);
        objs.push(beacon);
      }
      return { type: 'beacons', meshes: objs, done: 0, flak: true, flakAt: [DISTRICTS[1]] };
    },
    step(aircraft, st) {
      const m = st.meshes[st.done];
      if (m && nearPoint(aircraft, m.position.x, m.position.y, m.position.z, 90)) { st.done += 1; return { event: 'ring', complete: st.done >= st.meshes.length }; }
      return { complete: false };
    },
  },
  {
    name: 'Sortie 5 — Cinder Supply Drop',
    brief: 'Sweep low over Cinder Shallows and drop the supply crate (Space) inside the drop zone.',
    radio: ['Tower: The shallows settlements are short on medicine. One crate, one good pass.', 'Vesper Lead: Get under two hundred, level wings, and hit the release over the marker.'],
    build(world) {
      const zone = new THREE.Mesh(new THREE.CircleGeometry(160, 24),
        new THREE.MeshStandardMaterial({ color: 0xe8dca8, emissive: 0x8a7430, transparent: true, opacity: 0.7 }));
      zone.rotation.x = -Math.PI / 2;
      zone.position.set(2200, 22, 1600);
      return { type: 'dropzone', meshes: [zone], dropped: false, landedOk: false };
    },
    step(aircraft, st, extra) {
      if (!st.dropped && extra.dropPressed) {
        st.dropped = true;
        const p = aircraft.mesh.position;
        st.landedOk = nearPoint(aircraft, 2200, p.y, 1600, 320) && p.y < 260;
        return { event: 'drop', complete: true };
      }
      return { complete: false };
    },
  },
  {
    name: 'Sortie 6 — Night Watch',
    brief: 'Full dark over the strait. Find the three signal lamps the coastguard lit and overfly each.',
    radio: ['Coastguard: Three lamps burning in the strait tonight. Only you are up, Vesper.', 'Vesper Lead: Trust the instruments, not your eyes. Heading and altitude tell the truth at night.'],
    build(world) {
      const objs = [];
      const pts = [[600, 140, 1200], [-600, 160, 1900], [1500, 130, 2400]];
      for (const [x, y, z] of pts) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(16, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffe066, emissiveIntensity: 2 }));
        lamp.position.set(x, y, z);
        objs.push(lamp);
      }
      return { type: 'beacons', meshes: objs, done: 0, flak: false, night: true };
    },
    step(aircraft, st) {
      const m = st.meshes[st.done];
      if (m && nearPoint(aircraft, m.position.x, m.position.y, m.position.z, 110)) { st.done += 1; return { event: 'ring', complete: st.done >= st.meshes.length }; }
      return { complete: false };
    },
  },
  {
    name: 'Sortie 7 — Homecoming',
    brief: 'Fuel is short. Bring the Kestrel home to Verdan Fields and put her down on the deck, wings level.',
    radio: ['Tower: Verdan Fields is lit and the wind is calm. Long final, gear down, wings level.', 'Vesper Lead: Bring her home slow and straight. The whole wing is watching.'],
    build() {
      const rw = WORLD.runway;
      const marker = new THREE.Mesh(new THREE.ConeGeometry(30, 60, 6),
        new THREE.MeshStandardMaterial({ color: GOLD, emissive: 0x8a6b20, emissiveIntensity: 0.7 }));
      marker.position.set(rw.x, 120, rw.z);
      return { type: 'landing', meshes: [marker] };
    },
    step(aircraft, st) {
      const rw = WORLD.runway;
      const p = aircraft.mesh.position;
      const onStrip = Math.abs(p.x - rw.x) < rw.width && Math.abs(p.z - rw.z) < rw.length / 2;
      const gentle = Math.abs(aircraft.pitchDisplay) < 0.2 && Math.abs(aircraft.bankDisplay) < 0.3;
      if (aircraft.landed && onStrip && gentle) return { complete: true, event: 'landing' };
      return { complete: false };
    },
  },
];
