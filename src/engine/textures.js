// Procedural PBR texture generator. Everything is drawn at load time, so the game ships no image files.
import * as THREE from 'three';
import { TileNoise, hash2, clamp01, smooth, mulberry32 } from './noise.js';

let maxAniso = 4;
export function setMaxAnisotropy(a) { maxAniso = a; }

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toTexture(c, srgb, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = maxAniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

// Build color/normal/roughness textures from float buffers.
function buildSet(N, col, height, rough, normalStrength = 2.0) {
  const cc = canvas(N), nc = canvas(N), rc = canvas(N);
  const cx = cc.getContext('2d'), nx = nc.getContext('2d'), rx = rc.getContext('2d');
  const ci = cx.createImageData(N, N), ni = nx.createImageData(N, N), ri = rx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x, o = i * 4;
      ci.data[o] = Math.min(255, col[i * 3] * 255);
      ci.data[o + 1] = Math.min(255, col[i * 3 + 1] * 255);
      ci.data[o + 2] = Math.min(255, col[i * 3 + 2] * 255);
      ci.data[o + 3] = 255;
      const xl = (x - 1 + N) % N, xr = (x + 1) % N, yu = (y - 1 + N) % N, yd = (y + 1) % N;
      const dx = (height[y * N + xr] - height[y * N + xl]) * normalStrength;
      const dy = (height[yd * N + x] - height[yu * N + x]) * normalStrength;
      let nxv = -dx, nyv = dy, nzv = 1;
      const l = Math.hypot(nxv, nyv, nzv);
      ni.data[o] = (nxv / l * 0.5 + 0.5) * 255;
      ni.data[o + 1] = (nyv / l * 0.5 + 0.5) * 255;
      ni.data[o + 2] = (nzv / l * 0.5 + 0.5) * 255;
      ni.data[o + 3] = 255;
      const r = clamp01(rough[i]) * 255;
      ri.data[o] = r; ri.data[o + 1] = r; ri.data[o + 2] = r; ri.data[o + 3] = 255;
    }
  }
  cx.putImageData(ci, 0, 0); nx.putImageData(ni, 0, 0); rx.putImageData(ri, 0, 0);
  return { map: toTexture(cc, true), normalMap: toTexture(nc, false), roughnessMap: toTexture(rc, false) };
}

function bufs(N) { return { col: new Float32Array(N * N * 3), h: new Float32Array(N * N), r: new Float32Array(N * N) }; }

// ------------------------------------------------------------------------------------------------
const GEN = {
  // Office carpet: dense loop pile with soft mottling.
  carpet(N = 512) {
    const n = new TileNoise(11), b = bufs(N);
    const rnd = mulberry32(5);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const fine = rnd();
      const mott = n.fbm(u, v, 6, 4) * 0.5 + 0.5;
      const loops = Math.sin((x + y * 0.5) * 1.3) * Math.sin((y - x * 0.5) * 1.3);
      let g = 0.78 + (mott - 0.5) * 0.16 + (fine - 0.5) * 0.22 + loops * 0.04;
      const fleck = fine > 0.985 ? 0.25 : 0;
      b.col[i * 3] = g * 0.95 + fleck * 0.3; b.col[i * 3 + 1] = g * 0.97 + fleck * 0.2; b.col[i * 3 + 2] = g + fleck * 0.1;
      b.h[i] = fine * 0.35 + loops * 0.15 + mott * 0.2;
      b.r[i] = 0.93 + fine * 0.07;
    }
    return buildSet(N, b.col, b.h, b.r, 1.6);
  },

  // Painted plaster: subtle orange-peel and roller marks.
  plaster(N = 512) {
    const n = new TileNoise(21), b = bufs(N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const low = n.fbm(u, v, 3, 4);
      const peel = n.fbm(u, v, 48, 2);
      const roller = n.fbm(u, v, 2, 3, 0.5, 14) * 0.5;
      const g = 0.93 + low * 0.03 + peel * 0.012 + roller * 0.015;
      b.col[i * 3] = g; b.col[i * 3 + 1] = g; b.col[i * 3 + 2] = g;
      b.h[i] = peel * 0.25 + low * 0.1;
      b.r[i] = 0.82 + low * 0.06 + peel * 0.04;
    }
    return buildSet(N, b.col, b.h, b.r, 1.0);
  },

  // Acoustic ceiling tile (one tile per texture, 0.6m).
  ceiling(N = 512) {
    const n = new TileNoise(31), b = bufs(N);
    const rnd = mulberry32(77);
    const pits = new Float32Array(N * N);
    for (let k = 0; k < 2600; k++) {
      const px = Math.floor(rnd() * N), py = Math.floor(rnd() * N), r = 1 + rnd() * 1.6;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const d = Math.hypot(dx, dy); if (d > r) continue;
        pits[((py + dy + N) % N) * N + ((px + dx + N) % N)] = 1 - d / r;
      }
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const ex = Math.min(x, N - 1 - x) / N, ey = Math.min(y, N - 1 - y) / N;
      const edge = Math.min(ex, ey);
      const groove = smooth(0.0, 0.012, edge);
      const fiss = smooth(0.08, 0.0, n.turb(u, v, 10, 3)) * 0.6;
      const g = 0.9 - pits[i] * 0.22 - fiss * 0.12 + n.fbm(u, v, 4, 3) * 0.02;
      const gg = g * (0.55 + groove * 0.45);
      b.col[i * 3] = gg; b.col[i * 3 + 1] = gg; b.col[i * 3 + 2] = gg * 0.98;
      b.h[i] = groove * 0.6 - pits[i] * 0.4 - fiss * 0.2;
      b.r[i] = 0.95;
    }
    return buildSet(N, b.col, b.h, b.r, 3.0);
  },

  // Wood plank floor (texture = 1.2m square, 8 planks wide).
  woodfloor(N = 1024) {
    const n = new TileNoise(41), b = bufs(N);
    const planks = 8, rows = 3;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const pi = Math.floor(u * planks);
      const off = hash2(pi, 3) * 1.0;
      const vv = (v + off) % 1;
      const ri = Math.floor(vv * rows);
      const id = pi * 13 + ri;
      const tone = hash2(id, 7), tone2 = hash2(id, 9);
      const lu = (u * planks) % 1, lv = (vv * rows) % 1;
      const gap = Math.min(smooth(0, 0.035, lu), smooth(1, 0.965, lu), smooth(0, 0.008, lv), smooth(1, 0.992, lv));
      const grain = n.fbm(u + tone * 3.1, v * 0.5 + tone2, 4, 4, 0.55, 64);
      const ring = Math.sin((grain * 9 + lu * 2.5 + tone * 20)) * 0.5 + 0.5;
      const knot = n.fbm(u * 1.0 + tone, v, 8, 2);
      let r0 = 0.46 + tone * 0.16, g0 = 0.29 + tone * 0.1, b0 = 0.16 + tone * 0.05;
      const k = 0.78 + ring * 0.22 + grain * 0.12 + knot * 0.05;
      const gm = 0.25 + gap * 0.75;
      b.col[i * 3] = r0 * k * gm; b.col[i * 3 + 1] = g0 * k * gm; b.col[i * 3 + 2] = b0 * k * gm;
      b.h[i] = gap * 0.8 + ring * 0.05;
      b.r[i] = 0.38 + (1 - gap) * 0.5 + ring * 0.08 + tone2 * 0.08;
    }
    return buildSet(N, b.col, b.h, b.r, 4.0);
  },

  // Glazed ceramic tiles, 8x8 per texture.
  tiles(N = 512) {
    const n = new TileNoise(51), b = bufs(N);
    const T = 8;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const tx = Math.floor(u * T), ty = Math.floor(v * T);
      const lu = (u * T) % 1, lv = (v * T) % 1;
      const e = Math.min(lu, 1 - lu, lv, 1 - lv);
      const grout = smooth(0.025, 0.05, e);
      const bevel = smooth(0.03, 0.12, e);
      const tv = hash2(tx, ty, 3) * 0.05;
      const dirt = n.fbm(u, v, 4, 3) * 0.03;
      const g = grout > 0.5 ? 0.95 - tv + dirt : 0.62 + dirt * 2;
      b.col[i * 3] = g; b.col[i * 3 + 1] = g; b.col[i * 3 + 2] = g;
      b.h[i] = grout * 0.5 + bevel * 0.4;
      b.r[i] = grout > 0.5 ? 0.1 + tv + n.fbm(u, v, 16, 2) * 0.04 : 0.85;
    }
    return buildSet(N, b.col, b.h, b.r, 3.0);
  },

  // Pool mosaic: small blue tiles with tone variation.
  mosaic(N = 512) {
    const n = new TileNoise(53), b = bufs(N);
    const T = 16;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const tx = Math.floor(u * T), ty = Math.floor(v * T);
      const lu = (u * T) % 1, lv = (v * T) % 1;
      const e = Math.min(lu, 1 - lu, lv, 1 - lv);
      const grout = smooth(0.04, 0.09, e);
      const h = hash2(tx, ty, 8);
      const r0 = 0.22 + h * 0.18, g0 = 0.62 + h * 0.14, b0 = 0.78 + h * 0.12;
      const gm = 0.55 + grout * 0.45;
      const gro = 1 - grout;
      b.col[i * 3] = r0 * gm + gro * 0.5; b.col[i * 3 + 1] = g0 * gm + gro * 0.3; b.col[i * 3 + 2] = b0 * gm + gro * 0.2;
      b.h[i] = grout * 0.5 + smooth(0.05, 0.2, e) * 0.3 + n.fbm(u, v, 32, 1) * 0.02;
      b.r[i] = grout > 0.5 ? 0.12 : 0.8;
    }
    return buildSet(N, b.col, b.h, b.r, 3.0);
  },

  // Checkerboard marble (2x2 tiles of 0.5m).
  marble(N = 1024) {
    const n = new TileNoise(61), b = bufs(N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const tx = Math.floor(u * 2), ty = Math.floor(v * 2);
      const dark = (tx + ty) % 2 === 1;
      const lu = (u * 2) % 1, lv = (v * 2) % 1;
      const e = Math.min(lu, 1 - lu, lv, 1 - lv);
      const seam = smooth(0.0, 0.006, e);
      const t = n.turb(u + (dark ? 0.37 : 0), v, 3, 5);
      const vein = Math.pow(1 - Math.abs(Math.sin((u * 3 + v * 2 + t * 4) * Math.PI)), 12);
      const cloud = n.fbm(u, v, 4, 4) * 0.5 + 0.5;
      let c;
      if (dark) c = [0.06 + cloud * 0.04 + vein * 0.35, 0.065 + cloud * 0.04 + vein * 0.33, 0.075 + cloud * 0.05 + vein * 0.3];
      else c = [0.9 - vein * 0.35 - cloud * 0.06, 0.89 - vein * 0.36 - cloud * 0.06, 0.87 - vein * 0.38 - cloud * 0.05];
      b.col[i * 3] = c[0] * (0.7 + seam * 0.3); b.col[i * 3 + 1] = c[1] * (0.7 + seam * 0.3); b.col[i * 3 + 2] = c[2] * (0.7 + seam * 0.3);
      b.h[i] = seam * 0.5;
      b.r[i] = 0.12 + cloud * 0.08 + (1 - seam) * 0.5;
    }
    return buildSet(N, b.col, b.h, b.r, 2.0);
  },

  concrete(N = 512) {
    const n = new TileNoise(71), b = bufs(N);
    const rnd = mulberry32(3);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const m = n.fbm(u, v, 3, 5);
      const pore = rnd() > 0.992 ? 1 : 0;
      const g = 0.6 + m * 0.12 - pore * 0.2 + (rnd() - 0.5) * 0.04;
      b.col[i * 3] = g; b.col[i * 3 + 1] = g * 0.99; b.col[i * 3 + 2] = g * 0.97;
      b.h[i] = m * 0.2 - pore * 0.6;
      b.r[i] = 0.82 + m * 0.1;
    }
    return buildSet(N, b.col, b.h, b.r, 2.0);
  },

  // Furniture-grade wood (straight grain).
  wood(N = 512) {
    const n = new TileNoise(81), b = bufs(N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const g = n.fbm(u, v, 3, 4, 0.5, 2);
      const fine = n.fbm(u, v, 64, 2, 0.5, 4);
      const ring = Math.sin(u * 60 + g * 14) * 0.5 + 0.5;
      const k = 0.75 + ring * 0.2 + fine * 0.08;
      b.col[i * 3] = 0.5 * k; b.col[i * 3 + 1] = 0.31 * k; b.col[i * 3 + 2] = 0.17 * k;
      b.h[i] = ring * 0.15 + fine * 0.1;
      b.r[i] = 0.45 + ring * 0.1;
    }
    return buildSet(N, b.col, b.h, b.r, 1.5);
  },

  // Woven upholstery.
  fabric(N = 256) {
    const n = new TileNoise(91), b = bufs(N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const wx = Math.sin(x * Math.PI / 2) * 0.5 + 0.5, wy = Math.sin(y * Math.PI / 2) * 0.5 + 0.5;
      const over = ((Math.floor(x / 2) + Math.floor(y / 2)) % 2) ? wx : wy;
      const m = n.fbm(u, v, 4, 3) * 0.05;
      const g = 0.75 + over * 0.2 + m;
      b.col[i * 3] = g; b.col[i * 3 + 1] = g; b.col[i * 3 + 2] = g;
      b.h[i] = over;
      b.r[i] = 0.95;
    }
    return buildSet(N, b.col, b.h, b.r, 1.2);
  },

  // Brushed metal.
  metal(N = 256) {
    const n = new TileNoise(101), b = bufs(N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const s = n.fbm(u, v, 1, 4, 0.6, 96);
      const g = 0.85 + s * 0.06;
      b.col[i * 3] = g; b.col[i * 3 + 1] = g; b.col[i * 3 + 2] = g;
      b.h[i] = s * 0.1;
      b.r[i] = 0.28 + s * 0.1;
    }
    return buildSet(N, b.col, b.h, b.r, 0.6);
  },

  // Dense hedge foliage, drawn as overlapping leaves.
  hedge(N = 512) {
    const c = canvas(N), x = c.getContext('2d');
    const rnd = mulberry32(17);
    x.fillStyle = '#0e1f0c'; x.fillRect(0, 0, N, N);
    for (let k = 0; k < 5200; k++) {
      const px = rnd() * N, py = rnd() * N, s = 5 + rnd() * 9, a = rnd() * Math.PI;
      const l = 12 + rnd() * 26, hue = 85 + rnd() * 30;
      for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
        if (px + ox < -20 || px + ox > N + 20 || py + oy < -20 || py + oy > N + 20) continue;
        x.save(); x.translate(px + ox, py + oy); x.rotate(a);
        x.fillStyle = `hsl(${hue},${40 + rnd() * 25}%,${l}%)`;
        x.beginPath(); x.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2); x.fill();
        x.restore();
      }
    }
    return fromCanvasHeight(c, 0.92, 2.5);
  },

  grass(N = 512) {
    const n = new TileNoise(111), b = bufs(N);
    const rnd = mulberry32(19);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const m = n.fbm(u, v, 4, 4) * 0.5 + 0.5;
      const blade = n.fbm(u, v, 64, 2, 0.5, 16) * 0.5 + 0.5;
      const f = rnd();
      const g = 0.6 + blade * 0.5 + (f - 0.5) * 0.2;
      b.col[i * 3] = (0.13 + m * 0.06) * g; b.col[i * 3 + 1] = (0.25 + m * 0.08) * g; b.col[i * 3 + 2] = 0.08 * g;
      b.h[i] = blade * 0.7 + f * 0.2;
      b.r[i] = 0.85;
    }
    return buildSet(N, b.col, b.h, b.r, 2.5);
  },

  // Flagstone path (voronoi).
  flagstone(N = 512) {
    const n = new TileNoise(121), b = bufs(N);
    const C = 6, pts = [];
    const rnd = mulberry32(23);
    for (let cy = 0; cy < C; cy++) for (let cx = 0; cx < C; cx++) pts.push([(cx + 0.15 + rnd() * 0.7) / C, (cy + 0.15 + rnd() * 0.7) / C, rnd()]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      let d1 = 9, d2 = 9, id = 0;
      for (let k = 0; k < pts.length; k++) {
        for (const ox of [-1, 0, 1]) for (const oy of [-1, 0, 1]) {
          const dx = pts[k][0] + ox - u, dy = pts[k][1] + oy - v;
          const d = dx * dx + dy * dy;
          if (d < d1) { d2 = d1; d1 = d; id = k; } else if (d < d2) d2 = d;
        }
      }
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      const mortar = smooth(0.006, 0.02, edge);
      const m = n.fbm(u, v, 8, 4);
      const t = pts[id][2];
      const g = (0.42 + t * 0.15 + m * 0.08) * (0.45 + mortar * 0.55);
      b.col[i * 3] = g * 1.02; b.col[i * 3 + 1] = g; b.col[i * 3 + 2] = g * 0.95;
      b.h[i] = mortar * 0.7 + m * 0.15;
      b.r[i] = 0.75 + (1 - mortar) * 0.2;
    }
    return buildSet(N, b.col, b.h, b.r, 3.0);
  },

  cardboard(N = 256) {
    const n = new TileNoise(131), b = bufs(N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const m = n.fbm(u, v, 4, 4);
      const fib = n.fbm(u, v, 32, 2, 0.5, 4);
      const g = 0.85 + m * 0.06 + fib * 0.04;
      b.col[i * 3] = 0.62 * g; b.col[i * 3 + 1] = 0.47 * g; b.col[i * 3 + 2] = 0.3 * g;
      b.h[i] = Math.sin(x * 0.4) * 0.1 + fib * 0.1;
      b.r[i] = 0.9;
    }
    return buildSet(N, b.col, b.h, b.r, 1.0);
  },

  // Vintage striped wallpaper with small motif.
  wallpaper(N = 512) {
    const c = canvas(N), x = c.getContext('2d');
    x.fillStyle = '#d9d2bd'; x.fillRect(0, 0, N, N);
    const stripes = 8, sw = N / stripes;
    for (let s = 0; s < stripes; s++) {
      x.fillStyle = s % 2 ? '#cfc7ae' : '#ddd6c2';
      x.fillRect(s * sw, 0, sw, N);
      x.fillStyle = 'rgba(150,135,100,0.35)';
      x.fillRect(s * sw, 0, 2, N);
    }
    x.fillStyle = 'rgba(140,120,85,0.45)';
    for (let s = 0; s < stripes; s += 2) {
      for (let k = 0; k < 4; k++) {
        const cx = s * sw + sw / 2, cy = (k + 0.5) * N / 4;
        x.save(); x.translate(cx, cy);
        x.beginPath(); x.moveTo(0, -18); x.quadraticCurveTo(10, -4, 0, 14); x.quadraticCurveTo(-10, -4, 0, -18); x.fill();
        x.beginPath(); x.arc(0, 20, 3, 0, Math.PI * 2); x.fill();
        x.restore();
      }
    }
    addGrain(x, N, 0.05, 7);
    return fromCanvasHeight(c, 0.8, 0.6);
  },

  // Brushed paint for pastel walls with a soft cloud tone (dreamy rooms).
  paint(N = 512) {
    const n = new TileNoise(141), b = bufs(N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const m = n.fbm(u, v, 2, 5);
      const g = 0.95 + m * 0.04;
      b.col[i * 3] = g; b.col[i * 3 + 1] = g; b.col[i * 3 + 2] = g;
      b.h[i] = n.fbm(u, v, 32, 2) * 0.2;
      b.r[i] = 0.7 + m * 0.1;
    }
    return buildSet(N, b.col, b.h, b.r, 0.8);
  },
};

function addGrain(x, N, amt, seed) {
  const img = x.getImageData(0, 0, N, N);
  const rnd = mulberry32(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const d = (rnd() - 0.5) * amt * 255;
    img.data[i] += d; img.data[i + 1] += d; img.data[i + 2] += d;
  }
  x.putImageData(img, 0, 0);
}

// Use luminance of a painted canvas as height to derive normal/roughness.
function fromCanvasHeight(c, roughBase, strength) {
  const N = c.width, x = c.getContext('2d');
  const d = x.getImageData(0, 0, N, N).data;
  const col = new Float32Array(N * N * 3), h = new Float32Array(N * N), r = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const R = d[i * 4] / 255, G = d[i * 4 + 1] / 255, B = d[i * 4 + 2] / 255;
    col[i * 3] = R; col[i * 3 + 1] = G; col[i * 3 + 2] = B;
    h[i] = (R + G + B) / 3;
    r[i] = roughBase - h[i] * 0.1;
  }
  return buildSet(N, col, h, r, strength);
}

const cache = new Map();
export function getTextureSet(name) {
  if (!cache.has(name)) {
    const gen = GEN[name];
    if (!gen) throw new Error('No texture ' + name);
    cache.set(name, gen());
  }
  return cache.get(name);
}
export const textureNames = Object.keys(GEN);

// ------------------------------------------------------------------------------------------------
// Canvas-drawn decals and signage (single textures, not tiled).

export function makeCanvasTexture(w, h, draw, srgb = true) {
  const c = canvas(w, h);
  draw(c.getContext('2d'), w, h);
  const t = toTexture(c, srgb, false);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function textTexture(text, opts = {}) {
  const { w = 512, h = 256, bg = null, color = '#fff', font = '600 120px Inter, Arial', align = 'center', sub = null, subFont = '400 34px Inter, Arial', subColor = null, border = null } = opts;
  return makeCanvasTexture(w, h, (x) => {
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
    if (border) { x.strokeStyle = border; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20); }
    x.fillStyle = color; x.font = font; x.textAlign = align; x.textBaseline = 'middle';
    x.fillText(text, align === 'center' ? w / 2 : 30, sub ? h * 0.42 : h / 2);
    if (sub) { x.font = subFont; x.fillStyle = subColor || color; x.fillText(sub, align === 'center' ? w / 2 : 30, h * 0.78); }
  });
}

// Procedural paintings for gallery walls and offices.
export function paintingTexture(seed, style = 'abstract') {
  const rnd = mulberry32(seed * 7919 + 13);
  return makeCanvasTexture(512, 384, (x, w, h) => {
    if (style === 'landscape') {
      const top = `hsl(${200 + rnd() * 60},${40 + rnd() * 30}%,${55 + rnd() * 20}%)`;
      const bot = `hsl(${20 + rnd() * 30},${60 + rnd() * 30}%,${65 + rnd() * 15}%)`;
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(0.7, bot); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = `hsla(40,90%,90%,0.9)`; x.beginPath(); x.arc(w * (0.2 + rnd() * 0.6), h * (0.3 + rnd() * 0.25), 20 + rnd() * 30, 0, Math.PI * 2); x.fill();
      for (let l = 0; l < 4; l++) {
        x.fillStyle = `hsl(${220 + l * 10},${20 + l * 5}%,${45 - l * 9}%)`;
        x.beginPath(); x.moveTo(0, h);
        let yy = h * (0.5 + l * 0.12);
        for (let px = 0; px <= w; px += 16) { yy += (rnd() - 0.5) * 22; x.lineTo(px, yy); }
        x.lineTo(w, h); x.fill();
      }
    } else if (style === 'eye') {
      x.fillStyle = '#e9e2d0'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#2b2b33'; x.lineWidth = 6;
      x.beginPath(); x.moveTo(60, h / 2); x.quadraticCurveTo(w / 2, 40, w - 60, h / 2); x.quadraticCurveTo(w / 2, h - 40, 60, h / 2); x.stroke();
      const g = x.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, 70); g.addColorStop(0, '#111'); g.addColorStop(0.3, '#111'); g.addColorStop(0.35, '#3a6d8c'); g.addColorStop(1, '#a8d4e6');
      x.fillStyle = g; x.beginPath(); x.arc(w / 2, h / 2, 70, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.arc(w / 2 - 22, h / 2 - 24, 12, 0, Math.PI * 2); x.fill();
    } else if (style === 'stripes') {
      const hues = [rnd() * 360, rnd() * 360, rnd() * 360];
      for (let i = 0; i < 9; i++) { x.fillStyle = `hsl(${hues[i % 3]},${50 + rnd() * 30}%,${45 + rnd() * 30}%)`; x.fillRect(0, i * h / 9, w, h / 9 + 1); }
      x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.arc(w / 2, h / 2, 80, 0, Math.PI * 2); x.fill();
    } else {
      const bg = `hsl(${rnd() * 360},${20 + rnd() * 30}%,${80 + rnd() * 12}%)`;
      x.fillStyle = bg; x.fillRect(0, 0, w, h);
      for (let k = 0; k < 7; k++) {
        x.fillStyle = `hsla(${rnd() * 360},${50 + rnd() * 40}%,${35 + rnd() * 40}%,${0.6 + rnd() * 0.4})`;
        const t = rnd();
        x.save(); x.translate(rnd() * w, rnd() * h); x.rotate(rnd() * Math.PI);
        if (t < 0.35) { x.beginPath(); x.arc(0, 0, 20 + rnd() * 90, 0, Math.PI * 2); x.fill(); }
        else if (t < 0.7) x.fillRect(-60, -60, 40 + rnd() * 160, 30 + rnd() * 160);
        else { x.beginPath(); x.moveTo(0, -80); x.lineTo(70, 60); x.lineTo(-70, 60); x.fill(); }
        x.restore();
      }
    }
    const img = x.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) { const d = (rnd() - 0.5) * 14; img.data[i] += d; img.data[i + 1] += d; img.data[i + 2] += d; }
    x.putImageData(img, 0, 0);
  });
}
