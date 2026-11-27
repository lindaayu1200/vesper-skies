/* WINDWARD — camera rig: chase, cockpit, cinematic */
(function () {
  'use strict';
  var WW = window.WW, U = WW.U;
  var fwd = new THREE.Vector3(), upV = new THREE.Vector3(), rightV = new THREE.Vector3();
  var qCam = new THREE.Quaternion();
  var eul = new THREE.Euler(0, 0, 0, 'YXZ');
  var desired = new THREE.Vector3();
  var lookAtV = new THREE.Vector3();
  var camUp = new THREE.Vector3();
  var offset = new THREE.Vector3();

  function CameraRig(camera, terrain) {
    this.camera = camera;
    this.terrain = terrain;
    this.mode = 'chase';
    this.smoothPos = new THREE.Vector3();
    this.smoothLook = new THREE.Vector3();
    this.chasePitch = 0;
    this.chaseRoll = 0;
    this.chaseYaw = 0;
    this.fov = 62;
    this.shake = 0;
    this.cineTime = 0;
    this.snapNext = true;
    this.snapLook = true;
    this.lookUp = new THREE.Vector3(0, 1, 0);
  }

  CameraRig.prototype.setMode = function (m) {
    if (m === this.mode) return;
    this.mode = m;
    this.snapNext = true;
  };

  CameraRig.prototype.cycle = function () {
    this.setMode(this.mode === 'chase' ? 'cockpit' : 'chase');
    return this.mode;
  };

  CameraRig.prototype.update = function (dt, ac, opts) {
    opts = opts || {};
    var cam = this.camera;
    if (this.mode === 'free') return;
    ac.forward(fwd);
    ac.up(upV);
    ac.right(rightV);

    if (this.mode === 'cockpit') {
      ac.getCockpitCamera(cam.position, cam.quaternion);
      /* head bob from engine and buffet */
      var bob = Math.sin(ac.time * 11) * 0.008 + Math.sin(ac.time * 3.7) * 0.006;
      cam.rotateX(bob + (opts.gust || 0) * 0.004);
      cam.rotateZ(Math.sin(ac.time * 5.3) * 0.004);
      cam.fov = U.damp(cam.fov, 74 + Math.min(6, ac.speed / 26), 4, dt);
      cam.updateProjectionMatrix();
      this.smoothPos.copy(cam.position);
      this.smoothLook.copy(cam.position).addScaledVector(fwd, 60);
      this.fov = cam.fov;
      return;
    }

    if (this.mode === 'cinematic') {
      this.cineTime += dt;
      var t = this.cineTime;
      var ang = t * 0.16 + 0.6;
      var dist = 24 + Math.sin(t * 0.21) * 4;
      desired.set(
        ac.pos.x + Math.cos(ang) * dist,
        ac.pos.y + 4.2 + Math.sin(t * 0.33) * 2.4,
        ac.pos.z + Math.sin(ang) * dist
      );
      var gh = this.terrain.heightAt(desired.x, desired.z) + 3;
      if (desired.y < gh) desired.y = gh;
      if (this.snapNext) { this.smoothPos.copy(desired); this.snapNext = false; }
      else this.smoothPos.lerp(desired, 1 - Math.exp(-dt * 3.2));
      lookAtV.copy(ac.pos).addScaledVector(fwd, 3);
      this.smoothLook.lerp(lookAtV, 1 - Math.exp(-dt * 4.5));
      cam.position.copy(this.smoothPos);
      cam.up.copy(upV).lerp(new THREE.Vector3(0, 1, 0), 0.4).normalize();
      cam.lookAt(this.smoothLook);
      cam.fov = U.damp(cam.fov, 46, 2, dt);
      cam.updateProjectionMatrix();
      this.fov = cam.fov;
      return;
    }

    /* ---- chase ---- */
    eul.setFromQuaternion(ac.quat, 'YXZ');
    this.chaseYaw = eul.y;
    this.chasePitch = U.damp(this.chasePitch, eul.x * 0.82, 5.2, dt);
    this.chaseRoll = U.damp(this.chaseRoll, eul.z * 0.42, 3.4, dt);
    qCam.setFromEuler(eul.set(this.chasePitch, this.chaseYaw, this.chaseRoll, 'YXZ'));

    var spd = U.clamp(ac.speed / 110, 0, 1.4);
    offset.set(0, 2.9 + spd * 0.8, 17.6 + spd * 4.8);
    offset.applyQuaternion(qCam);
    desired.copy(ac.pos).add(offset);

    var gy = Math.max(this.terrain.heightAt(desired.x, desired.z), 0) + 2.4;
    if (desired.y < gy) desired.y = gy;

    if (this.snapNext || this.smoothPos.distanceTo(desired) > 90) {
      this.smoothPos.copy(desired);
      this.snapNext = false;
      this.snapLook = true;
    } else {
      this.smoothPos.lerp(desired, 1 - Math.exp(-dt * 6.5));
    }

    lookAtV.copy(ac.pos).addScaledVector(fwd, 28 + spd * 8).addScaledVector(upV, 1.0);
    if (this.snapLook || this.smoothLook.lengthSq() === 0) {
      this.smoothLook.copy(lookAtV);
      this.snapLook = false;
    } else {
      this.smoothLook.lerp(lookAtV, 1 - Math.exp(-dt * 8));
    }

    cam.position.copy(this.smoothPos);
    camUp.set(0, 1, 0).applyQuaternion(qCam).lerp(new THREE.Vector3(0, 1, 0), 0.45).normalize();
    cam.up.copy(camUp);
    cam.lookAt(this.smoothLook);

    var targetFov = 60 + spd * 12 + ac.boost * 5;
    cam.fov = U.damp(cam.fov, targetFov, 3.4, dt);
    cam.updateProjectionMatrix();
    this.fov = cam.fov;

    /* buffet */
    var gust = opts.gust || 0;
    var shakeAmt = (gust * 0.5 + U.clamp((ac.speed - 120) / 60, 0, 1) * 0.4) * 0.35;
    if (ac.stalled) shakeAmt += 0.4;
    if (ac.damage > 70) shakeAmt += 0.25;
    if (shakeAmt > 0.005) {
      cam.position.x += (Math.random() - 0.5) * shakeAmt;
      cam.position.y += (Math.random() - 0.5) * shakeAmt;
      cam.rotateZ((Math.random() - 0.5) * shakeAmt * 0.01);
    }
  };

  CameraRig.prototype.forceSnap = function () { this.snapNext = true; };

  WW.CameraRig = CameraRig;
})();
