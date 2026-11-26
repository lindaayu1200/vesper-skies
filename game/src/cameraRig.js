// Camera rigs: a smoothed chase cam that never fights the pilot, and a cockpit
// view with the canopy frame. Toggled with C.
// three.js ships as a global from vendor/three.min.js (classic script in index.html).

export function makeCameraRig(camera) {
  const rig = { mode: 'chase', camera, offset: new THREE.Vector3(0, 9, 30), look: new THREE.Vector3(), shake: 0 };
  return rig;
}

export function stepCamera(rig, aircraft, dt) {
  const { camera, look } = rig;
  const m = aircraft.mesh;
  if (rig.mode === 'chase') {
    const behind = new THREE.Vector3(0, 10, 34).applyQuaternion(m.quaternion);
    const target = m.position.clone().add(behind);
    camera.position.lerp(target, 1 - Math.pow(0.0001, dt));
    look.lerp(m.position.clone().add(new THREE.Vector3(0, 3, -14).applyQuaternion(m.quaternion)), 1 - Math.pow(0.001, dt));
    camera.lookAt(look);
    camera.up.set(0, 1, 0).lerp(new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion), 0.25).normalize();
  } else {
    const eye = new THREE.Vector3(0, 2.3, -2.2).applyQuaternion(m.quaternion).add(m.position);
    camera.position.copy(eye);
    const fwd = m.position.clone().add(new THREE.Vector3(0, 1.4, -40).applyQuaternion(m.quaternion));
    camera.lookAt(fwd);
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion));
  }
  if (rig.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * rig.shake;
    camera.position.y += (Math.random() - 0.5) * rig.shake;
    rig.shake = Math.max(0, rig.shake - dt * 2);
  }
}

export function toggleCamera(rig) {
  rig.mode = rig.mode === 'chase' ? 'cockpit' : 'chase';
  return rig.mode;
}
