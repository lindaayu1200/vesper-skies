// Radio message queue: one line at a time with a callsign prefix, held for a
// few seconds, so the story of each sortie plays out over the comms.
export function makeRadio() {
  const queue = [];
  let current = null;
  return {
    say(from, text) { queue.push({ from, text, age: 0 }); },
    step(dt) {
      if (current) {
        current.age += dt;
        if (current.age > 5.5) current = null;
      }
      if (!current && queue.length) current = queue.shift();
      return current ? `${current.from} — ${current.text}` : null;
    },
    clear() { queue.length = 0; current = null; },
  };
}
