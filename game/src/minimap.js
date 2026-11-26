import { DISTRICTS, WORLD } from './config.js';

export function makeMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const scale = Math.min(canvas.width, canvas.height) / WORLD.size;
  const half = WORLD.size / 2;
  const point = (x, z) => [(x + half) * scale, (z + half) * scale];

  return {
    draw(aircraft, objectives = [], night = false) {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = night ? 'rgba(5, 9, 25, .9)' : 'rgba(8, 14, 30, .86)';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(150, 190, 220, .18)';
      ctx.strokeRect(.5, .5, width - 1, height - 1);

      for (const district of DISTRICTS) {
        const [x, z] = point(district.x, district.z);
        const radius = district.radius * scale;
        ctx.fillStyle = night ? 'rgba(35, 54, 88, .72)' : 'rgba(70, 92, 120, .58)';
        ctx.beginPath();
        for (let i = 0; i < 9; i += 1) {
          const angle = i / 9 * Math.PI * 2;
          const wobble = 0.82 + (i % 3) * 0.08;
          const px = x + Math.cos(angle) * radius * wobble;
          const pz = z + Math.sin(angle) * radius * wobble;
          if (i === 0) ctx.moveTo(px, pz); else ctx.lineTo(px, pz);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#b7c9e8';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(district.name, x, z - 5);
      }

      const [rx, rz] = point(WORLD.runway.x, WORLD.runway.z);
      ctx.save();
      ctx.translate(rx, rz);
      ctx.rotate(-WORLD.runway.heading);
      ctx.fillStyle = '#e8dca8';
      ctx.fillRect(-WORLD.runway.length * scale / 2, -1.5, WORLD.runway.length * scale, 3);
      ctx.restore();

      for (const objective of objectives) {
        const [x, z] = point(objective.x, objective.z);
        ctx.fillStyle = objective.done ? '#69c47b' : '#ffc46b';
        ctx.beginPath(); ctx.arc(x, z, 4, 0, Math.PI * 2); ctx.fill();
      }

      if (aircraft?.mesh) {
        const [x, z] = point(aircraft.mesh.position.x, aircraft.mesh.position.z);
        ctx.save();
        ctx.translate(x, z);
        ctx.rotate(-aircraft.mesh.rotation.y + Math.PI);
        ctx.fillStyle = '#fff0c8';
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = '#e8f4ff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('N', width - 12, 14);
      ctx.fillRect(width - 13, 17, 2, 9);
    },
  };
}
