// Tuning constants for Vesper Skies. All units are game-feel units: one world unit
// is roughly a metre, and the Kestrel cruises near 90 units per second.
export const WORLD = {
  size: 9000,            // terrain square, centred on the origin
  segments: 128,         // terrain mesh resolution
  waterLevel: 0,
  runway: { x: -2400, z: 2600, heading: -Math.PI / 4, length: 700, width: 46 },
  fogColor: 0xf2b98c,
  fogNear: 1500,
  fogFar: 7000,
};

export const DISTRICTS = [
  { name: 'PORT HALVARD', x: 900, z: -600, radius: 900 },
  { name: 'LARKSPIRE HEIGHTS', x: -1500, z: -1800, radius: 800 },
  { name: 'CINDER SHALLOWS', x: 2200, z: 1600, radius: 900 },
  { name: 'VERDAN FIELDS', x: -2400, z: 2600, radius: 700 },
  { name: 'THE GULLET', x: 300, z: 2800, radius: 600 },
];

export const FLIGHT = {
  minSpeed: 22,
  maxSpeed: 150,
  throttleRate: 0.45,     // per second
  startSpeed: 55,
  startAltitude: 340,
  pitchRate: 0.85,
  rollRate: 1.7,
  yawRate: 0.45,
  fuelBurn: 1.05,         // units per second at full throttle
  fuelMax: 100,
  damageMax: 100,
  gLimit: 6.5,
};

export const RING = { radius: 55, tube: 5 };
export const REP_LABELS = ['Deckhand', 'Wingman', 'Section Lead', 'Vesper Ace', 'Legend of Cascavia'];
