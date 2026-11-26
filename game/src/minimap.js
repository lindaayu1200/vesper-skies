// Corner minimap: terrain silhouette, district labels, runway, objectives and
// the Kestrel's own position and heading.
import { DISTRICTS, WORLD } from './config.js';

export function makeMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const half = WORLD.size / 2;
  const toMap = (x, z) => [(x + half) / WORLD.size * canvas.width, (z + half) / WORLD.size * canvas.height];
  return {
    draw(aircraft, objectives, night = false) {
      ctx.fillStyle = night ? 'rgba(6,10,26,.85)' : 'rgba(8,14,30,.78)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // runway
      const [rx, rz] = toMap(WORLD.runway.x, WORLD.runway.z);
      ctx.fillStyle = '#e8dca8'; ctx.fillRect(rx - 3, rz - 6, 6, 12);
      // districts
      ctx.font = '9px monospace'; ctx.fillStyle = '#9fb4d8'; ctx.textAlign = 'center';
      for (const d of DISTRICTS) {
        const [x, z] = toMap(d.x, d.z);
        ctx.fillStyle = 'rgba(150,170,210,.5)';
        ctx.beginPath(); ctx.arc(x, z, d.radius / WORLD.size * canvas.width, 0, 7); ctx.fill();
        ctx.fillStyle = '#bcd2ff'; ctx.fillText(d.name, x, z - 8);
      }
      // objectives
      for (const o of objectives) {
        const [x, z] = toMap(o.x, o.z);
        ctx.fillStyle = o.done ? '#5e7d46' : '#ffc46b';
        ctx.beginPath(); ctx.arc(x, z, 4, 0, 7); ctx.fill();
      }
      // aircraft
      const [ax, az] = toMap(aircraft.mesh.position.x, aircraft.mesh.position.z);
      ctx.save(); ctx.translate(ax, az);
      ctx.rotate(-aircraft.mesh.rotation.y + Math.PI);
      ctx.fillStyle = '#ffe9c4';
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
  };
}
