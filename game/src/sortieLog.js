export function makeSortieLog() {
  const entries = [];
  return {
    record(entry) { entries.push({ ...entry }); },
    lines() {
      if (!entries.length) return ['NO SORTIES LOGGED'];
      return entries.map((entry, index) => `${index + 1}. ${entry.missionName} — ${entry.result} | FUEL ${Math.round(entry.fuelLeft)}% | DAMAGE ${Math.round(entry.damage)}% | +${entry.scoreGained} | ${Math.round(entry.seconds)}s`);
    },
    best() {
      return entries.reduce((best, entry) => (!best || entry.scoreGained > best.scoreGained ? best : entry), null);
    },
  };
}
