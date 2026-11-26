export function makeGauges(root) {
  let canvas = null;
  let ctx = null;
  let width = 360;
  let height = 126;

  function resize() {
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function text(value, x, y, align = 'left', size = 11) {
    ctx.font = `${size}px monospace`;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  }

  return {
    mount(widthPx = 360, heightPx = 126) {
      if (canvas) return canvas;
      width = widthPx;
      height = heightPx;
      canvas = root.ownerDocument.createElement('canvas');
      canvas.className = 'flight-gauges';
      Object.assign(canvas.style, {
        position: 'absolute', left: '50%', bottom: '12px', transform: 'translateX(-50%)',
        border: '1px solid rgba(255,220,160,.35)', background: 'rgba(10,16,32,.55)',
        borderRadius: '6px', pointerEvents: 'none',
      });
      root.appendChild(canvas);
      ctx = canvas.getContext('2d');
      resize();
      return canvas;
    },
    step(aircraft, throttle = 0) {
      if (!ctx || !aircraft?.mesh) return;
      const m = aircraft.mesh;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#dbe9ff';
      ctx.strokeStyle = 'rgba(219,233,255,.65)';
      ctx.lineWidth = 1;

      const cx = 70, cy = 57, radius = 43;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
      const pitch = Math.max(-1, Math.min(1, m.rotation.x / (Math.PI / 3))) * 30;
      const bank = m.rotation.z;
      ctx.translate(cx, cy + pitch);
      ctx.rotate(bank);
      ctx.fillStyle = '#3e6385'; ctx.fillRect(-radius, -radius, radius * 2, radius);
      ctx.fillStyle = '#9b765e'; ctx.fillRect(-radius, 0, radius * 2, radius);
      ctx.strokeStyle = '#f7e4af';
      ctx.beginPath(); ctx.moveTo(-radius, 0); ctx.lineTo(radius, 0); ctx.stroke();
      for (let mark = -20; mark <= 20; mark += 10) {
        ctx.beginPath(); ctx.moveTo(-12, mark); ctx.lineTo(12, mark); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = '#f7e4af';
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 17, cy); ctx.lineTo(cx + 17, cy); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); ctx.stroke();

      const compassX = 155;
      ctx.fillStyle = '#dbe9ff';
      text('HDG', compassX, 18);
      const heading = ((-m.rotation.y * 180 / Math.PI) % 360 + 360) % 360;
      text(`${String(Math.round(heading)).padStart(3, '0')}°`, compassX + 44, 18, 'right', 14);
      ctx.strokeStyle = 'rgba(219,233,255,.7)';
      for (let i = -4; i <= 4; i += 1) {
        const x = compassX + 44 + i * 22;
        const degrees = (heading + i * 15 + 360) % 360;
        ctx.beginPath(); ctx.moveTo(x, 31); ctx.lineTo(x, i % 2 ? 37 : 42); ctx.stroke();
        if (i % 2 === 0) text(['N', 'E', 'S', 'W'][Math.round(degrees / 90) % 4], x, 55, 'center');
      }
      const barX = 155, barW = 184;
      ctx.fillStyle = '#dbe9ff';
      text(`THR ${Math.round(throttle * 100)}%`, barX, 78);
      ctx.strokeStyle = '#dbe9ff'; ctx.strokeRect(barX, 84, barW, 9);
      ctx.fillStyle = '#e3a35f'; ctx.fillRect(barX + 1, 85, (barW - 2) * Math.max(0, Math.min(1, throttle)), 7);
      text(`FUEL ${Math.round(aircraft.fuel)}%`, barX, 111);
      ctx.strokeStyle = '#dbe9ff'; ctx.strokeRect(barX + 70, 102, 114, 9);
      ctx.fillStyle = '#69c47b'; ctx.fillRect(barX + 71, 103, 112 * Math.max(0, Math.min(1, aircraft.fuel / 100)), 7);
      text(`DMG ${Math.round(aircraft.damage)}%`, barX + 184, 111, 'right');
    },
    destroy() {
      if (canvas) canvas.remove();
      canvas = null; ctx = null;
    },
  };
}
