import { makeAtmosphere, updateAtmosphere, SUN_DIRECTION } from './atmosphere.js';
export function makeSky(scene) {
  const atmo=makeAtmosphere(scene); const sunDirection=atmo.sunDir;
  const canvas=document.createElement('canvas'); canvas.width=32; canvas.height=32;
  const ctx=canvas.getContext('2d'); const gradient=ctx.createRadialGradient(16,16,0,16,16,16);
  gradient.addColorStop(0,'rgba(255,255,255,1)'); gradient.addColorStop(.35,'rgba(220,235,255,.8)'); gradient.addColorStop(1,'rgba(120,160,255,0)');
  ctx.fillStyle=gradient; ctx.fillRect(0,0,32,32);
  atmo.stars.material.map=new THREE.CanvasTexture(canvas); atmo.stars.material.alphaTest=.05; atmo.stars.material.size=2.2; atmo.stars.material.sizeAttenuation=false; atmo.stars.material.transparent=true; atmo.stars.material.needsUpdate=true;
  return { step(dt,night){ updateAtmosphere(atmo,SUN_DIRECTION,night,dt); }, sunDirection, atmosphere:atmo };
}
