export function makeHelp(root) {
  const panel = root.querySelector('#help-panel') || root.createElement('div');
  panel.id = 'help-panel';
  panel.className = 'hidden';
  panel.innerHTML = '<strong>FLIGHT CONTROLS</strong><br><br>W / S &nbsp; pitch<br>A / D &nbsp; roll<br>Q / E &nbsp; yaw<br>Shift / Ctrl &nbsp; throttle<br>C &nbsp; camera<br>M &nbsp; map<br>R &nbsp; restart sortie<br>Enter &nbsp; menu<br>H &nbsp; this help';
  if (!panel.parentNode) root.body.appendChild(panel);
  return {
    show() { panel.classList.remove('hidden'); },
    hide() { panel.classList.add('hidden'); },
    toggle() { panel.classList.toggle('hidden'); },
  };
}
