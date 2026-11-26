import { WORLD } from './config.js';

export function makeSky(scene) {
  const radius = 8500;
  const domeGeometry = new THREE.SphereGeometry(radius, 32, 16);
  const sunsetTop = new THREE.Color(0x172d5a);
  const sunsetHorizon = new THREE.Color(WORLD.fogColor);
  const nightTop = new THREE.Color(0x020817);
  const nightHorizon = new THREE.Color(0x101d3d);
  const domeColors = new Float32Array(domeGeometry.attributes.position.count * 3);
  const daytime = [];
  const nighttime = [];
  const fillGradient = (target, top, horizon) => {
    const position = domeGeometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      const height = Math.max(0, Math.min(1, position.getY(i) / radius));
      const color = horizon.clone().lerp(top, height);
      target.push(color.r, color.g, color.b);
    }
  };
  fillGradient(daytime, sunsetTop, sunsetHorizon);
  fillGradient(nighttime, nightTop, nightHorizon);
  domeColors.set(daytime);
  domeGeometry.setAttribute('color', new THREE.BufferAttribute(domeColors, 3));
  const domeMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true, fog: false });
  const dome = new THREE.Mesh(domeGeometry, domeMaterial);
  scene.add(dome);

  const sunDirection = new THREE.Vector3(-0.6, 0.35, -0.7).normalize();
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(150, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.95, fog: false, side: THREE.DoubleSide }),
  );
  sun.position.copy(sunDirection).multiplyScalar(6800);
  sun.lookAt(0, 0, 0);
  scene.add(sun);

  const starPositions = new Float32Array(420 * 3);
  for (let i = 0; i < 420; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const elevation = 0.08 + Math.random() * 0.9;
    const distance = 8100;
    const horizontal = Math.sqrt(1 - elevation * elevation);
    starPositions[i * 3] = Math.cos(angle) * horizontal * distance;
    starPositions[i * 3 + 1] = elevation * distance;
    starPositions[i * 3 + 2] = Math.sin(angle) * horizontal * distance;
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: 0xd9e7ff, size: 12, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }),
  );
  stars.geometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  scene.add(stars);

  let nightAmount = 0;
  return {
    step(dt, night) {
      const target = night ? 1 : 0;
      const blend = Math.min(1, Math.max(0, (Number(dt) || 0) * 2.5));
      nightAmount += (target - nightAmount) * blend;
      for (let i = 0; i < domeColors.length; i += 1) {
        domeColors[i] = daytime[i] + (nighttime[i] - daytime[i]) * nightAmount;
      }
      domeGeometry.attributes.color.needsUpdate = true;
      stars.material.opacity = nightAmount * 0.9;
      sun.material.opacity = 0.95 * (1 - nightAmount);
    },
  };
}
