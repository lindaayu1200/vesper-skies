export function makeChecklist(root) {
  const panel = root.createElement('div');
  let timer = null;
  panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  Object.assign(panel.style, {
    position: 'absolute', left: '18px', top: '112px', zIndex: '6', width: '280px',
    padding: '10px 12px', color: '#ffe9c4', background: 'rgba(10,16,32,.82)',
    border: '1px solid rgba(255,220,160,.45)', borderRadius: '6px',
    font: '12px/1.45 "Courier New", monospace', pointerEvents: 'none',
    boxSizing: 'border-box',
  });
  root.body.appendChild(panel);

  const defaultItems = [
    'Throttle set: confirm a steady climb power.',
    'Trim checked: keep the nose balanced through the first turn.',
    'Fuel state green: reserve enough for the return leg.',
    'Gear and airframe secure: check before leaving the field.',
    'Radio tuned: acknowledge control and fly the brief.',
  ];

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  return {
    show(missionName, brief, lines = []) {
      if (timer) clearTimeout(timer);
      const items = Array.isArray(lines) && lines.length ? lines : defaultItems;
      panel.innerHTML = `<strong style="color:#ffd28a">PRE-SORTIE CHECKLIST</strong><br><b>${escape(missionName)}</b><br><span style="color:#bcd2ff">${escape(brief)}</span><ol style="margin:8px 0 6px;padding-left:22px">${items.slice(0, 6).map(item => `<li>${escape(item)}</li>`).join('')}</ol><span style="color:#9fb4d8">Press ENTER to fly</span>`;
      panel.hidden = false;
      timer = setTimeout(() => {
        panel.hidden = true;
        timer = null;
      }, 4000);
    },
    hide() {
      if (timer) clearTimeout(timer);
      timer = null;
      panel.hidden = true;
    },
    visible() { return !panel.hidden; },
  };
}
