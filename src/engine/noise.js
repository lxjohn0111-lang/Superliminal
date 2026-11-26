// Small, fast, tileable noise toolkit used by the procedural texture generator.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class TileNoise {
  constructor(seed = 1) {
    const rnd = mulberry32(seed);
    this.perm = new Uint16Array(512);
    const p = new Uint16Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    this.gx = new Float32Array(256); this.gy = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const a = rnd() * Math.PI * 2; this.gx[i] = Math.cos(a); this.gy[i] = Math.sin(a); }
  }

  // Periodic gradient noise, period px/py in lattice units. Output approx [-1, 1].
  noise(x, y, px, py) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = ((xi % px) + px) % px, y0 = ((yi % py) + py) % py;
    const x1 = (x0 + 1) % px, y1 = (y0 + 1) % py;
    const P = this.perm;
    const h00 = P[P[x0 & 255] + (y0 & 255)], h10 = P[P[x1 & 255] + (y0 & 255)];
    const h01 = P[P[x0 & 255] + (y1 & 255)], h11 = P[P[x1 & 255] + (y1 & 255)];
    const gx = this.gx, gy = this.gy;
    const n00 = gx[h00] * xf + gy[h00] * yf;
    const n10 = gx[h10] * (xf - 1) + gy[h10] * yf;
    const n01 = gx[h01] * xf + gy[h01] * (yf - 1);
    const n11 = gx[h11] * (xf - 1) + gy[h11] * (yf - 1);
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const a = n00 + (n10 - n00) * u, b = n01 + (n11 - n01) * u;
    return (a + (b - a) * v) * 1.414;
  }

  // Tileable fBm over the unit square [0,1)^2 with base frequency `freq` (integer).
  // Optional freqY allows anisotropic (stretched) noise, e.g. wood grain.
  fbm(u, v, freq, octaves = 4, gain = 0.5, freqY = null) {
    let amp = 1, sum = 0, norm = 0;
    let fxx = freq, fy = freqY === null ? freq : freqY;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.noise(u * fxx, v * fy, fxx, fy);
      norm += amp; amp *= gain; fxx *= 2; fy *= 2;
    }
    return sum / norm;
  }

  // Tileable "turbulence" (abs fBm) for veins and cracks.
  turb(u, v, freq, octaves = 4) {
    let amp = 1, sum = 0, norm = 0, f = freq;
    for (let i = 0; i < octaves; i++) {
      sum += amp * Math.abs(this.noise(u * f, v * f, f, f));
      norm += amp; amp *= 0.5; f *= 2;
    }
    return sum / norm;
  }
}

// Hash for per-cell random values.
export function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
