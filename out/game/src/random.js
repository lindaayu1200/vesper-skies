// Small deterministic PRNG (mulberry32) so staged screenshots and terrain are
// reproducible from a seed.
export function makeRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cheap 2D value noise with smooth interpolation, driven by the same PRNG. */
export function makeNoise(seed) {
  const rand = makeRandom(seed);
  const size = 256;
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i += 1) grid[i] = rand();
  const at = (x, y) => grid[((y & (size - 1)) * size + (x & (size - 1)))];
  const smooth = t => t * t * (3 - 2 * t);
  return function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const x0 = at(xi, yi), x1 = at(xi + 1, yi), x2 = at(xi, yi + 1), x3 = at(xi + 1, yi + 1);
    return x0 + (x1 - x0) * xf + (x2 - x0) * yf + (x0 - x1 - x2 + x3) * xf * yf;
  };
}
