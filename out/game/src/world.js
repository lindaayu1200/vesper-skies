// The Cascavia Archipelago: heightfield islands, an ocean, sunset sky, city
// blocks with named districts, a canyon, flak towers, clouds and the home
// runway at Verdan Fields.
// three.js ships as a global from vendor/three.min.js (classic script in index.html).
import { WORLD, DISTRICTS } from './config.js';
import { makeNoise, makeRandom } from './random.js';

// Default noise so callers without a noise instance (the flight model) still get terrain.
const defaultNoise = makeNoise(7);
export function terrainHeight(x, z, noise = defaultNoise) {
  // Island mask: fall off to sea with distance from island centres.
  let h = 0;
  for (let i = 0; i < 4; i += 1) {
    const f = 0.0009 * Math.pow(2, i);
    h += noise(x * f + i * 17.3, z * f - i * 9.1) * 260 / (i + 1);
  }
  h -= 130;
  // Carve The Gullet canyon.
  const gx = x - DISTRICTS[4].x, gz = z - DISTRICTS[4].z;
  const canyon = Math.exp(-((gx * gx) / 90000 + (gz * gz) / 700000));
  h -= canyon * 210;
  // Flatten Verdan Fields for the runway.
  const rx = x - WORLD.runway.x, rz = z - WORLD.runway.z;
  const flat = Math.exp(-((rx * rx + rz * rz) / 900000));
  h = h * (1 - flat) + 14 * flat;
  return Math.max(h, -18);
}

export function buildWorld(scene, seed = 7) {
  const noise = makeNoise(seed);
  const rand = makeRandom(seed + 1);
  const group = new THREE.Group();
  scene.add(group);

  // --- Sky, sun and fog ---
  scene.fog = new THREE.Fog(WORLD.fogColor, WORLD.fogNear, WORLD.fogFar);
  scene.background = new THREE.Color(WORLD.fogColor);
  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x35506e, 0.85);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb36b, 1.15);
  sun.position.set(-0.6, 0.35, -0.7).multiplyScalar(3000);
  group.add(sun);

  // --- Ocean ---
  const oceanGeo = new THREE.PlaneGeometry(WORLD.size * 2.4, WORLD.size * 2.4, 1, 1);
  const oceanMat = new THREE.MeshStandardMaterial({ color: 0x1d4e73, metalness: 0.35, roughness: 0.35 });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = WORLD.waterLevel - 4;
  group.add(ocean);

  // --- Terrain heightfield ---
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, WORLD.segments, WORLD.segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const sand = new THREE.Color(0xd8c08a), grass = new THREE.Color(0x5e7d46),
        rock = new THREE.Color(0x6f6a5f), snow = new THREE.Color(0xe8e4da);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainHeight(x, z, noise);
    pos.setY(i, h);
    const c = new THREE.Color();
    if (h < 6) c.copy(sand);
    else if (h < 120) c.copy(grass).lerp(sand, Math.max(0, (60 - h) / 60));
    else if (h < 200) c.copy(rock).lerp(grass, Math.max(0, (200 - h) / 80));
    else c.copy(snow);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  group.add(terrain);

  // --- District city blocks ---
  const cityGroup = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cityMat = new THREE.MeshStandardMaterial({ color: 0xbfae94, roughness: 0.85 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xd97b4f, roughness: 0.6, emissive: 0x521d08 });
  for (const d of DISTRICTS) {
    const count = d.name === 'THE GULLET' ? 0 : 26;
    for (let i = 0; i < count; i += 1) {
      const a = rand() * Math.PI * 2, r = rand() * d.radius * 0.8;
      const x = d.x + Math.cos(a) * r, z = d.z + Math.sin(a) * r;
      const h = terrainHeight(x, z, noise);
      if (h < 4) continue;
      const tall = 14 + rand() * (d.name === 'LARKSPIRE HEIGHTS' ? 90 : 46);
      const w = 12 + rand() * 22;
      const m = new THREE.Mesh(boxGeo, rand() < 0.18 ? accentMat : cityMat);
      m.scale.set(w, tall, w);
      m.position.set(x, h + tall / 2, z);
      m.rotation.y = rand() * Math.PI;
      cityGroup.add(m);
    }
    // Beacon tower per district so it reads from the air.
    const tower = new THREE.Mesh(boxGeo, accentMat);
    tower.scale.set(16, 120, 16);
    tower.position.set(d.x, terrainHeight(d.x, d.z, noise) + 60, d.z);
    cityGroup.add(tower);
  }
  group.add(cityGroup);

  // --- Runway ---
  const runway = new THREE.Group();
  const rw = WORLD.runway;
  const stripGeo = new THREE.BoxGeometry(rw.width, 2, rw.length);
  const strip = new THREE.Mesh(stripGeo, new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 1 }));
  strip.position.set(rw.x, 15, rw.z);
  strip.rotation.y = rw.heading;
  runway.add(strip);
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xe8dca8 });
  for (let i = 0; i < 8; i += 1) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 30), stripeMat);
    const t = -rw.length / 2 + 40 + i * (rw.length - 80) / 7;
    s.position.set(rw.x + Math.sin(rw.heading + Math.PI / 2) * 0, 16.2, rw.z + t * -1 * Math.cos(rw.heading) + t * Math.sin(rw.heading));
    s.position.x = rw.x + t * Math.cos(rw.heading) * 0 + 0;
    s.position.set(rw.x + Math.cos(rw.heading + Math.PI / 2) * 0 + t * Math.sin(rw.heading) * 0, 16.2, rw.z);
    s.position.x = rw.x + t * Math.cos(rw.heading);
    s.position.z = rw.z - t * Math.sin(rw.heading);
    runway.add(s);
  }
  group.add(runway);

  // --- Flak towers (hazard) ---
  const flakTowers = [];
  const flakSpots = [[900, -600], [-1500, -1800], [2200, 1600], [300, 2800]];
  for (const [x, z] of flakSpots) {
    const h = terrainHeight(x, z, noise);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(9, 14, 46, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a4f58, roughness: 0.9 }));
    tower.position.set(x, h + 23, z);
    group.add(tower);
    flakTowers.push({ x, z, y: h + 46 });
  }

  // --- Clouds ---
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffe4c4, transparent: true, opacity: 0.55, roughness: 1 });
  for (let i = 0; i < 60; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(40 + rand() * 90, 7, 5), cloudMat);
    puff.position.set((rand() - 0.5) * WORLD.size, 380 + rand() * 460, (rand() - 0.5) * WORLD.size);
    puff.scale.y = 0.35;
    group.add(puff);
  }

  return { terrainHeight, noise, flakTowers, group };
}
