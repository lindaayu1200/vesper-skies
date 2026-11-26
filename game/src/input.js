// Keyboard state. Mouse steers gently when the pointer is held (drag-to-bank).
export const keys = Object.create(null);
let dragging = false;
let mouseX = 0, mouseY = 0;

export function initInput(domElement) {
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  domElement.addEventListener('mousedown', e => { dragging = true; mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    mouseX = e.clientX; mouseY = e.clientY;
  });
}

/** Normalised analog steer sample in [-1, 1]: keys first, then drag offset. */
export function readSteer(viewportWidth, viewportHeight) {
  let pitch = 0, roll = 0, yaw = 0;
  if (keys.KeyW || keys.ArrowUp) pitch += 1;
  if (keys.KeyS || keys.ArrowDown) pitch -= 1;
  if (keys.KeyA || keys.ArrowLeft) roll += 1;
  if (keys.KeyD || keys.ArrowRight) roll -= 1;
  if (keys.KeyQ) yaw += 1;
  if (keys.KeyE) yaw -= 1;
  if (dragging && viewportWidth) {
    const dx = (mouseX - viewportWidth / 2) / (viewportWidth * 0.35);
    const dy = (mouseY - viewportHeight / 2) / (viewportHeight * 0.35);
    roll += Math.max(-1, Math.min(1, dx));
    pitch += Math.max(-1, Math.min(1, -dy * 0.6));
  }
  return { pitch: clamp(pitch), roll: clamp(roll), yaw: clamp(yaw) };
}

export function throttleDelta() {
  let d = 0;
  if (keys.ShiftLeft || keys.ShiftRight || keys.Equal) d += 1;
  if (keys.ControlLeft || keys.ControlRight || keys.Minus) d -= 1;
  return d;
}

export function pressed(code) { return !!keys[code]; }

function clamp(v) { return Math.max(-1, Math.min(1, v)); }
