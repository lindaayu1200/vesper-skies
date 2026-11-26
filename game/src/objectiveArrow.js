export function makeObjectiveArrow(scene) {
  const gold = 0xffc46b;
  const shaftMaterial = new THREE.MeshStandardMaterial({
    color: gold, emissive: gold, emissiveIntensity: 1.5, transparent: true, opacity: 0.9,
  });
  const pointMaterial = shaftMaterial.clone();
  const arrow = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 18, 8), shaftMaterial);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 4;
  arrow.add(shaft);
  const point = new THREE.Mesh(new THREE.ConeGeometry(5.5, 12, 8), pointMaterial);
  point.rotation.x = -Math.PI / 2;
  point.position.z = -10;
  arrow.add(point);
  arrow.visible = false;
  scene.add(arrow);

  let objective = null;
  let elapsed = 0;
  let opacity = 0.9;

  const fade = (target, amount) => {
    opacity += (target - opacity) * Math.min(1, amount);
    shaftMaterial.opacity = opacity;
    pointMaterial.opacity = opacity;
  };

  return {
    target(objMesh) {
      objective = objMesh || null;
      if (!objective) {
        arrow.visible = false;
        return;
      }
      arrow.visible = true;
    },
    step(aircraft) {
      if (!objective || !aircraft?.mesh) {
        arrow.visible = false;
        return;
      }
      const plane = aircraft.mesh;
      const targetPosition = objective.getWorldPosition
        ? objective.getWorldPosition(new THREE.Vector3())
        : objective.position.clone();
      const distance = plane.position.distanceTo(targetPosition);
      const behind = new THREE.Vector3(0, 26, 20).applyQuaternion(plane.quaternion);
      arrow.position.copy(plane.position).add(behind);
      arrow.position.y += Math.sin(elapsed * 3.2) * 1.8;
      arrow.lookAt(targetPosition);
      fade(distance < 150 ? 0.35 : 0.9, 0.12);
      elapsed += 1 / 60;
    },
    hide() {
      objective = null;
      arrow.visible = false;
    },
  };
}
