// Harbor Lights — a small deterministic RNG so the city is the same every run.
export function makeRng(seed) {
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9;
  return function next() {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function range(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function rangeInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

// Deterministic runtime randomness for effects (skid marks, sparks): a counter-based
// hash so the dossier's two runs still match byte for byte.
export function hashNoise(n) {
  let h = (n * 2654435761) >>> 0;
  h ^= h >>> 13;
  h = (h * 2246822519) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// Harbor Lights — recorded build touch
