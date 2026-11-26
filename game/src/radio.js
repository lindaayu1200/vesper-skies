// Small flight deck radio queue. Warnings jump ahead of ordinary traffic.
export function makeRadio() {
  const messages = [];
  const log = [];
  let active = null;

  const isWarning = from => /warn|alarm|mayday|urgent/i.test(String(from));
  const remember = line => {
    log.push(line);
    if (log.length > 8) log.shift();
  };

  return {
    say(from, text) {
      const item = { from: String(from), text: String(text), age: 0 };
      if (isWarning(from)) messages.unshift(item);
      else messages.push(item);
    },
    step(dt) {
      if (active) {
        active.age += Math.max(0, Number(dt) || 0);
        if (active.age >= 5.5) active = null;
      }
      if (!active && messages.length) {
        active = messages.shift();
        active.line = `${active.from} - ${active.text}`;
        remember(active.line);
      }
      return active ? active.line : null;
    },
    clear() { messages.length = 0; active = null; },
    history() { return log.slice(); },
  };
}
