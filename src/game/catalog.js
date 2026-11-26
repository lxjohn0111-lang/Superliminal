// Prop catalog: every grabbable object, built procedurally. Origin = bottom centre, units = metres at scale 1.
import * as THREE from 'three';
import { roundedBox, lathe, mesh } from '../engine/geometry.js';
import { mat, colorMat, emissiveMat } from '../engine/materials.js';
import { makeCanvasTexture } from '../engine/textures.js';
import { TileNoise, mulberry32 } from '../engine/noise.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- canvas textures for props
const texCache = new Map();
function ctex(key, w, h, draw) {
  if (!texCache.has(key)) texCache.set(key, makeCanvasTexture(w, h, draw));
  return texCache.get(key);
}

function cubeFaceTex() {
  return ctex('cubeFace', 512, 512, (x, w) => {
    const g = x.createLinearGradient(0, 0, w, w); g.addColorStop(0, '#fbfbf8'); g.addColorStop(1, '#e9e9e4');
    x.fillStyle = g; x.fillRect(0, 0, w, w);
    x.strokeStyle = '#2d6db0'; x.lineWidth = 22; x.strokeRect(46, 46, w - 92, w - 92);
    x.fillStyle = '#2d6db0';
    for (const [cx, cy, a] of [[0, 0, 0], [w, 0, 1], [w, w, 2], [0, w, 3]]) {
      x.save(); x.translate(cx, cy); x.rotate(a * Math.PI / 2);
      x.beginPath(); x.moveTo(0, 0); x.lineTo(70, 0); x.lineTo(0, 70); x.fill(); x.restore();
    }
    x.lineWidth = 14; x.beginPath(); x.arc(w / 2, w / 2, 96, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.moveTo(w / 2 - 150, w / 2); x.quadraticCurveTo(w / 2, w / 2 - 120, w / 2 + 150, w / 2); x.quadraticCurveTo(w / 2, w / 2 + 120, w / 2 - 150, w / 2); x.stroke();
    x.beginPath(); x.arc(w / 2, w / 2, 34, 0, Math.PI * 2); x.fill();
    x.font = '600 30px Inter, Arial'; x.textAlign = 'center'; x.fillText('LA-01', w / 2, w - 78);
  });
}

function echoFaceTex() {
  return ctex('echoFace', 256, 256, (x, w) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, w);
    x.strokeStyle = '#fff'; x.lineWidth = 10; x.strokeRect(14, 14, w - 28, w - 28);
    x.lineWidth = 4; x.strokeRect(40, 40, w - 80, w - 80);
    x.beginPath(); x.arc(w / 2, w / 2, 30, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(w / 2, w / 2, 52, 0, Math.PI * 2); x.stroke();
  });
}

function crateTex() {
  return ctex('crate', 512, 512, (x, w) => {
    const rnd = mulberry32(4);
    for (let i = 0; i < 6; i++) {
      x.fillStyle = `hsl(32,${38 + rnd() * 12}%,${44 + rnd() * 12}%)`; x.fillRect(0, i * w / 6, w, w / 6);
      x.fillStyle = 'rgba(60,35,15,0.5)'; x.fillRect(0, i * w / 6, w, 3);
      for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(80,50,20,${rnd() * 0.15})`; x.fillRect(0, i * w / 6 + rnd() * w / 6, w, 1 + rnd() * 2); }
    }
    x.fillStyle = '#8a5a32'; x.strokeStyle = 'rgba(40,20,5,0.6)'; x.lineWidth = 4;
    const b = 58;
    for (const r of [[0, 0, w, b], [0, w - b, w, b], [0, 0, b, w], [w - b, 0, b, w]]) { x.fillRect(...r); x.strokeRect(...r); }
    x.save(); x.translate(w / 2, w / 2); x.rotate(Math.PI / 4); x.fillRect(-w * 0.62, -b / 2, w * 1.24, b); x.strokeRect(-w * 0.62, -b / 2, w * 1.24, b); x.restore();
    x.fillStyle = '#2b2b2b';
    for (const [px, py] of [[29, 29], [w - 29, 29], [29, w - 29], [w - 29, w - 29], [w / 2, 29], [w / 2, w - 29], [29, w / 2], [w - 29, w / 2]]) { x.beginPath(); x.arc(px, py, 6, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = 'rgba(30,20,10,0.55)'; x.font = '600 34px Inter, Arial'; x.textAlign = 'center'; x.fillText('FRAGILE · DREAMS', w / 2, w / 2 + 120);
  });
}

function diceTex(n) {
  return ctex('die' + n, 256, 256, (x, w) => {
    x.fillStyle = '#f7f3e8'; x.fillRect(0, 0, w, w);
    x.fillStyle = n === 1 ? '#b3261e' : '#1c1c22';
    const P = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] }[n];
    for (const [i, j] of P) { x.beginPath(); x.arc(56 + i * 72, 56 + j * 72, n === 1 ? 34 : 22, 0, Math.PI * 2); x.fill(); }
  });
}

function stripesTex(key, colors, horizontal = false, w = 512, h = 256) {
  return ctex(key, w, h, (x) => {
    const n = colors.length;
    for (let i = 0; i < n; i++) { x.fillStyle = colors[i]; if (horizontal) x.fillRect(0, i * h / n, w, h / n + 1); else x.fillRect(i * w / n, 0, w / n + 1, h); }
  });
}

function globeTex() {
  return ctex('globe', 1024, 512, (x, w, h) => {
    const n = new TileNoise(909);
    const img = x.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const u = i / w, v = j / h;
      const e = n.fbm(u, v, 4, 5) + 0.12 - Math.pow(Math.abs(v - 0.5) * 2, 6) * 0.3;
      const o = (j * w + i) * 4;
      if (e > 0.08) { const t = Math.min(1, (e - 0.08) * 3); img.data[o] = 170 + t * 40; img.data[o + 1] = 150 + t * 30; img.data[o + 2] = 95; }
      else { const d = Math.max(0, 0.08 - e); img.data[o] = 120 - d * 200; img.data[o + 1] = 168 - d * 180; img.data[o + 2] = 180 - d * 100; }
      img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    x.strokeStyle = 'rgba(70,50,30,0.25)'; x.lineWidth = 1;
    for (let k = 1; k < 12; k++) { x.beginPath(); x.moveTo(k * w / 12, 0); x.lineTo(k * w / 12, h); x.stroke(); }
    for (let k = 1; k < 6; k++) { x.beginPath(); x.moveTo(0, k * h / 6); x.lineTo(w, k * h / 6); x.stroke(); }
  });
}

function clockFaceTex() {
  return ctex('clockface', 256, 256, (x, w) => {
    x.fillStyle = '#fbf7ee'; x.beginPath(); x.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#222'; x.fillStyle = '#222';
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, r1 = w / 2 - 12, r0 = r1 - (i % 5 ? 6 : 14);
      x.lineWidth = i % 5 ? 2 : 4; x.beginPath(); x.moveTo(w / 2 + Math.sin(a) * r0, w / 2 - Math.cos(a) * r0); x.lineTo(w / 2 + Math.sin(a) * r1, w / 2 - Math.cos(a) * r1); x.stroke();
    }
    x.font = '600 26px Inter, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; x.fillText(String(i), w / 2 + Math.sin(a) * 84, w / 2 - Math.cos(a) * 84); }
    x.lineWidth = 7; x.beginPath(); x.moveTo(w / 2, w / 2); x.lineTo(w / 2 + 40, w / 2 - 30); x.stroke();
    x.lineWidth = 4; x.beginPath(); x.moveTo(w / 2, w / 2); x.lineTo(w / 2 - 8, w / 2 - 88); x.stroke();
    x.strokeStyle = '#c0392b'; x.lineWidth = 2; x.beginPath(); x.moveTo(w / 2, w / 2 + 20); x.lineTo(w / 2 + 70, w / 2 + 60); x.stroke();
    x.beginPath(); x.arc(w / 2, w / 2, 7, 0, Math.PI * 2); x.fill();
  });
}

function bookCoverTex(color, title) {
  return ctex('book' + color + title, 256, 384, (x, w, h) => {
    x.fillStyle = color; x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.08, 'rgba(255,255,255,0.08)'); g.addColorStop(0.12, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(230,200,120,0.85)'; x.lineWidth = 3; x.strokeRect(30, 30, w - 50, h - 60);
    x.fillStyle = 'rgba(240,215,150,0.95)'; x.font = 'italic 600 30px Cormorant, Georgia'; x.textAlign = 'center';
    const words = title.split(' ');
    words.forEach((wd, i) => x.fillText(wd, w / 2 + 8, 120 + i * 36));
  });
}

function letterTex(ch, bg) {
  return ctex('letter' + ch + bg, 256, 256, (x, w) => {
    x.fillStyle = '#f3e7cf'; x.fillRect(0, 0, w, w);
    x.fillStyle = bg; x.fillRect(18, 18, w - 36, w - 36);
    x.fillStyle = '#fff8ea'; x.font = '600 170px Cormorant, Georgia'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, w / 2, w / 2 + 10);
  });
}

// ---------------------------------------------------------------- prop definitions
// colliders: { t:'box', h:[hx,hy,hz], o:[x,y,z] } | { t:'ball', r, o } | { t:'cyl', hh, r, o }
export const CATALOG = {
  cube: {
    name: 'Perception Block', density: 220, sound: 'plastic', size: [0.32, 0.32, 0.32],
    build() {
      const m = new THREE.MeshStandardMaterial({ map: cubeFaceTex(), roughness: 0.32, metalness: 0 });
      return mesh(roundedBox(0.32, 0.32, 0.32, 0.026, 4), m, { pos: [0, 0.16, 0] });
    },
    colliders: [{ t: 'box', h: [0.16, 0.16, 0.16], o: [0, 0.16, 0] }],
  },
  echo: {
    name: 'Resonant Block', density: 220, sound: 'glow', size: [0.3, 0.3, 0.3], echo: true,
    build() {
      const m = new THREE.MeshPhysicalMaterial({ color: 0x9ad8ff, emissive: 0x6fc3ff, emissiveMap: echoFaceTex(), emissiveIntensity: 2.2, roughness: 0.15, metalness: 0.1, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1, transparent: true, opacity: 0.92 });
      return mesh(roundedBox(0.3, 0.3, 0.3, 0.02, 3), m, { pos: [0, 0.15, 0] });
    },
    colliders: [{ t: 'box', h: [0.15, 0.15, 0.15], o: [0, 0.15, 0] }],
  },
  crate: {
    name: 'Crate', density: 160, sound: 'wood', size: [0.5, 0.5, 0.5],
    build() {
      const m = new THREE.MeshStandardMaterial({ map: crateTex(), roughness: 0.78 });
      return mesh(roundedBox(0.5, 0.5, 0.5, 0.012, 2), m, { pos: [0, 0.25, 0] });
    },
    colliders: [{ t: 'box', h: [0.25, 0.25, 0.25], o: [0, 0.25, 0] }],
  },
  die: {
    name: 'Die', density: 300, sound: 'plastic', size: [0.18, 0.18, 0.18],
    build() {
      const mats = [1, 6, 2, 5, 3, 4].map((n) => new THREE.MeshStandardMaterial({ map: diceTex(n), roughness: 0.25 }));
      return mesh(roundedBox(0.18, 0.18, 0.18, 0.03, 4), mats, { pos: [0, 0.09, 0] });
    },
    colliders: [{ t: 'box', h: [0.09, 0.09, 0.09], o: [0, 0.09, 0] }],
  },
  mug: {
    name: 'Mug', density: 700, sound: 'ceramic', size: [0.12, 0.11, 0.09],
    build() {
      const g = new THREE.Group();
      const body = lathe([[0, 0], [0.04, 0], [0.045, 0.006], [0.045, 0.105], [0.041, 0.11], [0.039, 0.105], [0.039, 0.012], [0, 0.012]], 40);
      g.add(mesh(body, mat('porcelain')));
      g.add(mesh(lathe([[0.0452, 0.06], [0.0452, 0.085]], 40), colorMat(0x2d6db0, 0.2)));
      const h = new THREE.TorusGeometry(0.026, 0.0065, 10, 24, Math.PI * 1.2);
      g.add(mesh(h, mat('porcelain'), { pos: [0.045, 0.058, 0], rot: [0, 0, -Math.PI * 0.6] }));
      g.add(mesh(new THREE.CircleGeometry(0.038, 28), colorMat(0x3a2414, 0.1), { pos: [0, 0.09, 0], rot: [-Math.PI / 2, 0, 0] }));
      return g;
    },
    colliders: [{ t: 'cyl', hh: 0.055, r: 0.045, o: [0, 0.055, 0] }],
  },
  apple: {
    name: 'Apple', density: 800, sound: 'soft', size: [0.09, 0.09, 0.09],
    build() {
      const g = new THREE.Group();
      const pts = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI; const r = Math.sin(a) * 0.046 * (1 - 0.15 * Math.cos(a)); pts.push([Math.max(0.001, r), 0.045 - Math.cos(a) * 0.043 + (i === 0 ? 0.004 : 0) - (i === 16 ? 0.006 : 0)]); }
      g.add(mesh(lathe(pts, 32), new THREE.MeshPhysicalMaterial({ color: 0xb8231d, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 })));
      g.add(mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.03), colorMat(0x4a3220, 0.8), { pos: [0.003, 0.092, 0], rot: [0, 0, -0.25] }));
      const leaf = new THREE.SphereGeometry(0.018, 10, 6); leaf.scale(1, 0.15, 0.5);
      g.add(mesh(leaf, colorMat(0x4c8a2f, 0.6), { pos: [0.017, 0.095, 0], rot: [0, 0, 0.4] }));
      return g;
    },
    colliders: [{ t: 'ball', r: 0.045, o: [0, 0.045, 0] }],
  },
  ball: {
    name: 'Beach Ball', density: 25, sound: 'soft', size: [0.3, 0.3, 0.3], floats: true, restitution: 0.65,
    build() {
      const t = stripesTex('beachball', ['#e8463c', '#f6f2e6', '#2f7fd1', '#f6f2e6', '#f4c33a', '#f6f2e6']);
      return mesh(new THREE.SphereGeometry(0.15, 40, 24), new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.25, clearcoat: 0.8 }), { pos: [0, 0.15, 0] });
    },
    colliders: [{ t: 'ball', r: 0.15, o: [0, 0.15, 0] }],
  },
  duck: {
    name: 'Rubber Duck', density: 90, sound: 'soft', size: [0.16, 0.15, 0.11], floats: true,
    build() {
      const g = new THREE.Group();
      const yel = new THREE.MeshPhysicalMaterial({ color: 0xffcf2e, roughness: 0.3, clearcoat: 0.5 });
      const body = new THREE.SphereGeometry(0.06, 32, 20); body.scale(1.3, 0.8, 1);
      g.add(mesh(body, yel, { pos: [0, 0.048, 0] }));
      g.add(mesh(new THREE.SphereGeometry(0.036, 28, 18), yel, { pos: [0.045, 0.11, 0] }));
      const tail = new THREE.ConeGeometry(0.025, 0.05, 16); g.add(mesh(tail, yel, { pos: [-0.075, 0.075, 0], rot: [0, 0, 1.2] }));
      const beak = new THREE.SphereGeometry(0.02, 16, 10); beak.scale(1.3, 0.45, 1);
      g.add(mesh(beak, colorMat(0xff7a1a, 0.35), { pos: [0.083, 0.104, 0] }));
      for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.0065, 10, 8), colorMat(0x111111, 0.15), { pos: [0.068, 0.12, s * 0.02] }));
      return g;
    },
    colliders: [{ t: 'box', h: [0.075, 0.045, 0.058], o: [0, 0.046, 0] }, { t: 'ball', r: 0.036, o: [0.045, 0.11, 0] }],
  },
  cone: {
    name: 'Traffic Cone', density: 160, sound: 'plastic', size: [0.3, 0.46, 0.3],
    build() {
      const g = new THREE.Group();
      const orange = new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.45 });
      const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3, emissive: 0x222222 });
      g.add(mesh(roundedBox(0.3, 0.03, 0.3, 0.01), colorMat(0x1a1a1a, 0.8), { pos: [0, 0.015, 0] }));
      g.add(mesh(lathe([[0.12, 0.03], [0.1, 0.17], [0.075, 0.17]], 32), orange));
      g.add(mesh(lathe([[0.075, 0.17], [0.06, 0.27]], 32), white));
      g.add(mesh(lathe([[0.06, 0.27], [0.018, 0.45], [0.0, 0.452]], 32), orange));
      return g;
    },
    colliders: [{ t: 'box', h: [0.15, 0.015, 0.15], o: [0, 0.015, 0] }, { t: 'cyl', hh: 0.21, r: 0.085, o: [0, 0.24, 0] }],
  },
  book: {
    name: 'Book', density: 650, sound: 'paper', size: [0.17, 0.045, 0.24],
    variants: [['#7a2430', 'Notes on Sleep'], ['#23415f', 'The Long Hallway'], ['#2f5a3b', 'Small Things'], ['#5b3b6e', 'Lucid Angles'], ['#8a6a2a', 'A Field Guide to Doors']],
    build(variant = 0) {
      const g = new THREE.Group();
      const [col, title] = this.variants[variant % this.variants.length];
      const cover = new THREE.MeshStandardMaterial({ color: 0xffffff, map: bookCoverTex(col, title), roughness: 0.6 });
      const plain = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 });
      const pages = new THREE.MeshStandardMaterial({ color: 0xf1e8d4, roughness: 0.9 });
      const top = mesh(roundedBox(0.17, 0.006, 0.24, 0.002), [plain, plain, cover, plain, plain, plain], { pos: [0, 0.042, 0] });
      g.add(top);
      g.add(mesh(roundedBox(0.17, 0.006, 0.24, 0.002), plain, { pos: [0, 0.003, 0] }));
      g.add(mesh(new THREE.BoxGeometry(0.012, 0.045, 0.24), plain, { pos: [-0.079, 0.0225, 0] }));
      g.add(mesh(new THREE.BoxGeometry(0.155, 0.033, 0.23), pages, { pos: [0.004, 0.0225, 0] }));
      return g;
    },
    colliders: [{ t: 'box', h: [0.085, 0.0225, 0.12], o: [0, 0.0225, 0] }],
  },
  lantern: {
    name: 'Paper Lantern', density: 40, sound: 'paper', size: [0.24, 0.3, 0.24], glow: true,
    build() {
      const g = new THREE.Group();
      const pts = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI; pts.push([Math.max(0.012, Math.sin(a) * 0.12), 0.03 + 0.12 - Math.cos(a) * 0.12]); }
      const paper = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffb45e, emissiveIntensity: 2.4, roughness: 0.9, side: THREE.DoubleSide });
      g.add(mesh(lathe(pts, 28), paper, { cast: false }));
      const ribM = colorMat(0x8a5b2b, 0.6);
      for (let i = 1; i < 6; i++) { const y = 0.03 + i * 0.04; const r = Math.sqrt(Math.max(0, 0.12 * 0.12 - Math.pow(y - 0.15, 2))) + 0.001; g.add(mesh(new THREE.TorusGeometry(r, 0.0018, 4, 32), ribM, { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0], cast: false })); }
      g.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.025, 20), colorMat(0x2a2a2a, 0.5, 0.6), { pos: [0, 0.278, 0] }));
      g.add(mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.03, 20), colorMat(0x2a2a2a, 0.5, 0.6), { pos: [0, 0.015, 0] }));
      g.add(mesh(new THREE.TorusGeometry(0.03, 0.003, 6, 20, Math.PI), colorMat(0x2a2a2a, 0.5, 0.6), { pos: [0, 0.29, 0] }));
      const light = new THREE.PointLight(0xffb060, 1.6, 2.0, 2);
      light.position.set(0, 0.15, 0); light.userData.baseIntensity = 1.6; light.userData.baseDistance = 2.0;
      light.name = 'propLight'; g.add(light);
      return g;
    },
    colliders: [{ t: 'ball', r: 0.12, o: [0, 0.15, 0] }],
  },
  toydoor: {
    name: 'Toy Door', density: 260, sound: 'wood', size: [0.24, 0.44, 0.05], doorProp: true,
    build() {
      const g = new THREE.Group();
      const frameM = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.45 });
      const leafM = new THREE.MeshStandardMaterial({ color: 0x3f6c9b, roughness: 0.4 });
      g.add(mesh(new THREE.BoxGeometry(0.02, 0.44, 0.05), frameM, { pos: [-0.11, 0.22, 0] }));
      g.add(mesh(new THREE.BoxGeometry(0.02, 0.44, 0.05), frameM, { pos: [0.11, 0.22, 0] }));
      g.add(mesh(new THREE.BoxGeometry(0.24, 0.02, 0.05), frameM, { pos: [0, 0.43, 0] }));
      const hinge = new THREE.Group(); hinge.position.set(-0.1, 0, 0.0); g.add(hinge);
      const leaf = new THREE.Group(); hinge.add(leaf);
      leaf.add(mesh(new THREE.BoxGeometry(0.2, 0.42, 0.016), leafM, { pos: [0.1, 0.21, 0] }));
      for (const y of [0.11, 0.3]) for (const s of [-1, 1]) leaf.add(mesh(new THREE.BoxGeometry(0.16, y < 0.2 ? 0.13 : 0.16, 0.004), new THREE.MeshStandardMaterial({ color: 0x36608c, roughness: 0.4 }), { pos: [0.1, y, s * 0.009] }));
      for (const s of [-1, 1]) leaf.add(mesh(new THREE.SphereGeometry(0.009, 12, 8), mat('gold'), { pos: [0.18, 0.2, s * 0.014] }));
      hinge.name = 'hinge';
      return g;
    },
    colliders: [{ t: 'box', h: [0.12, 0.22, 0.025], o: [0, 0.22, 0] }],
  },
  plank: {
    name: 'Plank', density: 450, sound: 'wood', size: [2.0, 0.05, 0.26], alignForward: true,
    build() { return mesh(roundedBox(2.0, 0.05, 0.26, 0.008, 2), mat('woodPale'), { pos: [0, 0.025, 0] }); },
    colliders: [{ t: 'box', h: [1.0, 0.025, 0.13], o: [0, 0.025, 0] }],
  },
  chair: {
    name: 'Chair', density: 120, sound: 'wood', size: [0.44, 0.9, 0.44],
    build() {
      const g = new THREE.Group(); const w = mat('wood');
      g.add(mesh(roundedBox(0.44, 0.04, 0.44, 0.01), w, { pos: [0, 0.45, 0] }));
      for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) g.add(mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.45, 10), w, { pos: [x, 0.225, z] }));
      for (const x of [-0.19, 0.19]) g.add(mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.46, 10), w, { pos: [x, 0.69, -0.2] }));
      for (const y of [0.62, 0.72, 0.84]) g.add(mesh(roundedBox(0.4, 0.05, 0.02, 0.006), w, { pos: [0, y, -0.2] }));
      return g;
    },
    colliders: [{ t: 'box', h: [0.22, 0.235, 0.22], o: [0, 0.235, 0] }, { t: 'box', h: [0.21, 0.22, 0.02], o: [0, 0.69, -0.2] }],
  },
  armchair: {
    name: 'Armchair', density: 70, sound: 'soft', size: [0.95, 0.85, 0.85],
    build() {
      const g = new THREE.Group(); const f = mat('fabricMustard');
      g.add(mesh(roundedBox(0.95, 0.3, 0.85, 0.06), f, { pos: [0, 0.27, 0] }));
      g.add(mesh(roundedBox(0.95, 0.55, 0.2, 0.08), f, { pos: [0, 0.6, -0.33] }));
      for (const s of [-1, 1]) g.add(mesh(roundedBox(0.16, 0.3, 0.8, 0.07), f, { pos: [s * 0.4, 0.55, 0.0] }));
      g.add(mesh(roundedBox(0.64, 0.14, 0.62, 0.06), f, { pos: [0, 0.48, 0.07] }));
      for (const [x, z] of [[-0.4, -0.35], [0.4, -0.35], [-0.4, 0.35], [0.4, 0.35]]) g.add(mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.12, 10), mat('woodDark'), { pos: [x, 0.06, z] }));
      return g;
    },
    colliders: [{ t: 'box', h: [0.475, 0.3, 0.425], o: [0, 0.3, 0] }, { t: 'box', h: [0.475, 0.26, 0.1], o: [0, 0.6, -0.33] }],
  },
  globe: {
    name: 'Globe', density: 300, sound: 'plastic', size: [0.26, 0.4, 0.26],
    build() {
      const g = new THREE.Group();
      g.add(mesh(lathe([[0.1, 0], [0.1, 0.015], [0.03, 0.03], [0.015, 0.06], [0.015, 0.09]], 28), mat('woodDark')));
      const tilt = new THREE.Group(); tilt.position.set(0, 0.245, 0); tilt.rotation.z = 0.41; g.add(tilt);
      tilt.add(mesh(new THREE.SphereGeometry(0.13, 48, 32), new THREE.MeshPhysicalMaterial({ map: globeTex(), roughness: 0.35, clearcoat: 0.7 })));
      tilt.add(mesh(new THREE.TorusGeometry(0.142, 0.006, 8, 48, Math.PI * 1.3), mat('brass'), { rot: [0, Math.PI / 2, -Math.PI * 0.15] }));
      return g;
    },
    colliders: [{ t: 'ball', r: 0.13, o: [0, 0.245, 0] }, { t: 'cyl', hh: 0.05, r: 0.08, o: [0, 0.05, 0] }],
  },
  clock: {
    name: 'Alarm Clock', density: 420, sound: 'metal', size: [0.17, 0.2, 0.07],
    build() {
      const g = new THREE.Group();
      const red = new THREE.MeshStandardMaterial({ color: 0xc8352b, roughness: 0.3, metalness: 0.3 });
      const body = new THREE.CylinderGeometry(0.07, 0.07, 0.055, 40); body.rotateX(Math.PI / 2);
      g.add(mesh(body, red, { pos: [0, 0.09, 0] }));
      const face = new THREE.CircleGeometry(0.062, 40);
      g.add(mesh(face, new THREE.MeshStandardMaterial({ map: clockFaceTex(), roughness: 0.2 }), { pos: [0, 0.09, 0.0285] }));
      g.add(mesh(new THREE.TorusGeometry(0.064, 0.006, 8, 40), mat('chrome'), { pos: [0, 0.09, 0.029] }));
      for (const s of [-1, 1]) {
        const bell = new THREE.SphereGeometry(0.034, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        g.add(mesh(bell, mat('chrome'), { pos: [s * 0.045, 0.158, 0], rot: [0, 0, s * -0.5] }));
        g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.035), mat('chrome'), { pos: [s * 0.045, 0.015, 0], rot: [0, 0, s * 0.35] }));
      }
      g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03), mat('chrome'), { pos: [0, 0.172, 0] }));
      return g;
    },
    colliders: [{ t: 'box', h: [0.075, 0.09, 0.032], o: [0, 0.09, 0] }],
  },
  pin: {
    name: 'Bowling Pin', density: 380, sound: 'wood', size: [0.12, 0.38, 0.12],
    build() {
      const g = new THREE.Group();
      const prof = [[0.0, 0], [0.03, 0.0], [0.045, 0.04], [0.06, 0.12], [0.055, 0.18], [0.03, 0.25], [0.025, 0.28], [0.033, 0.33], [0.026, 0.37], [0.0, 0.38]];
      g.add(mesh(lathe(prof, 32), new THREE.MeshPhysicalMaterial({ color: 0xf8f6f0, roughness: 0.2, clearcoat: 1 })));
      for (const y of [0.235, 0.255]) g.add(mesh(new THREE.TorusGeometry(0.034 - (y - 0.235) * 0.2, 0.0035, 6, 30), colorMat(0xc4232a, 0.3), { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] }));
      return g;
    },
    colliders: [{ t: 'cyl', hh: 0.1, r: 0.058, o: [0, 0.1, 0] }, { t: 'cyl', hh: 0.09, r: 0.032, o: [0, 0.29, 0] }],
  },
  stool: {
    name: 'Step Stool', density: 260, sound: 'wood', size: [0.42, 0.42, 0.42],
    build() {
      const g = new THREE.Group(); const w = mat('woodPale'); const r = colorMat(0x30353b, 0.9);
      g.add(mesh(roundedBox(0.42, 0.2, 0.42, 0.012), w, { pos: [0, 0.1, 0] }));
      g.add(mesh(roundedBox(0.42, 0.22, 0.21, 0.012), w, { pos: [0, 0.31, -0.105] }));
      g.add(mesh(new THREE.BoxGeometry(0.38, 0.006, 0.17), r, { pos: [0, 0.203, 0.11] }));
      g.add(mesh(new THREE.BoxGeometry(0.38, 0.006, 0.17), r, { pos: [0, 0.423, -0.105] }));
      return g;
    },
    colliders: [{ t: 'box', h: [0.21, 0.1, 0.21], o: [0, 0.1, 0] }, { t: 'box', h: [0.21, 0.11, 0.105], o: [0, 0.31, -0.105] }],
  },
  pillow: {
    name: 'Pillow', density: 45, sound: 'soft', size: [0.5, 0.14, 0.34],
    build() {
      const geo = roundedBox(0.5, 0.14, 0.34, 0.065, 5);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const k = 1 - 0.35 * (Math.pow(x / 0.25, 2) * 0.5 + Math.pow(z / 0.17, 2) * 0.5); p.setY(i, p.getY(i) * Math.max(0.45, k)); }
      geo.computeVertexNormals();
      return mesh(geo, mat('fabricCream'), { pos: [0, 0.07, 0] });
    },
    colliders: [{ t: 'box', h: [0.24, 0.06, 0.16], o: [0, 0.06, 0] }],
  },
  bear: {
    name: 'Barnaby the Bear', density: 60, sound: 'soft', size: [0.26, 0.34, 0.22],
    build() {
      const g = new THREE.Group();
      const fur = mat('fabric').clone(); fur.color = new THREE.Color(0x9a6a43);
      const light = mat('fabric').clone(); light.color = new THREE.Color(0xd9b48a);
      const body = new THREE.SphereGeometry(0.085, 28, 20); body.scale(1, 1.15, 0.9);
      g.add(mesh(body, fur, { pos: [0, 0.1, 0] }));
      g.add(mesh(new THREE.SphereGeometry(0.07, 28, 20), fur, { pos: [0, 0.245, 0.005] }));
      const muz = new THREE.SphereGeometry(0.03, 16, 12); muz.scale(1, 0.8, 0.8);
      g.add(mesh(muz, light, { pos: [0, 0.232, 0.062] }));
      g.add(mesh(new THREE.SphereGeometry(0.009, 10, 8), colorMat(0x1a1210, 0.3), { pos: [0, 0.243, 0.086] }));
      for (const s of [-1, 1]) {
        g.add(mesh(new THREE.SphereGeometry(0.028, 16, 12), fur, { pos: [s * 0.055, 0.305, -0.005] }));
        g.add(mesh(new THREE.SphereGeometry(0.016, 12, 10), light, { pos: [s * 0.055, 0.305, 0.012] }));
        g.add(mesh(new THREE.SphereGeometry(0.01, 12, 10), colorMat(0x111111, 0.1), { pos: [s * 0.027, 0.262, 0.06] }));
        const arm = new THREE.SphereGeometry(0.03, 14, 10); arm.scale(0.9, 1.6, 0.9);
        g.add(mesh(arm, fur, { pos: [s * 0.09, 0.12, 0.02], rot: [0.3, 0, s * 0.5] }));
        const leg = new THREE.SphereGeometry(0.035, 14, 10); leg.scale(0.9, 0.8, 1.4);
        g.add(mesh(leg, fur, { pos: [s * 0.05, 0.03, 0.05] }));
      }
      const bow = new THREE.SphereGeometry(0.02, 10, 8); bow.scale(1.6, 0.8, 0.5);
      for (const s of [-1, 1]) g.add(mesh(bow, colorMat(0x2f6fb5, 0.5), { pos: [s * 0.025, 0.18, 0.07] }));
      return g;
    },
    colliders: [{ t: 'ball', r: 0.09, o: [0, 0.1, 0] }, { t: 'ball', r: 0.07, o: [0, 0.245, 0] }],
  },
  vase: {
    name: 'Vase', density: 500, sound: 'ceramic', size: [0.16, 0.3, 0.16],
    build() {
      const prof = [[0, 0], [0.05, 0], [0.07, 0.04], [0.08, 0.12], [0.06, 0.22], [0.035, 0.26], [0.04, 0.3], [0.032, 0.3], [0.028, 0.27]];
      return mesh(lathe(prof, 40), new THREE.MeshPhysicalMaterial({ color: 0x2d5f8a, roughness: 0.15, clearcoat: 1 }));
    },
    colliders: [{ t: 'cyl', hh: 0.13, r: 0.07, o: [0, 0.13, 0] }],
  },
  raft: {
    name: 'Pool Float', density: 18, sound: 'soft', size: [0.64, 0.08, 0.28], floats: true,
    build() {
      const g = new THREE.Group();
      const cols = [0x7ec8e3, 0xf6f6f2, 0xf19bb5, 0xf6f6f2, 0x7ec8e3, 0xf6f6f2, 0xf19bb5];
      for (let i = 0; i < 7; i++) {
        const c = new THREE.CapsuleGeometry(0.02, 0.6 - 0.04, 6, 14); c.rotateZ(Math.PI / 2);
        g.add(mesh(c, new THREE.MeshPhysicalMaterial({ color: cols[i], roughness: 0.25, clearcoat: 0.8 }), { pos: [0, 0.035, -0.12 + i * 0.04] }));
      }
      const pil = new THREE.CapsuleGeometry(0.03, 0.22, 6, 14); pil.rotateX(Math.PI / 2);
      g.add(mesh(pil, new THREE.MeshPhysicalMaterial({ color: 0xf6f6f2, roughness: 0.25, clearcoat: 0.8 }), { pos: [0.27, 0.055, 0] }));
      return g;
    },
    colliders: [{ t: 'box', h: [0.32, 0.035, 0.14], o: [0, 0.035, 0] }],
  },
  letter: {
    name: 'Letter Block', density: 400, sound: 'wood', size: [0.14, 0.14, 0.14],
    variants: [['A', '#c0392b'], ['B', '#2d6db0'], ['C', '#2f8a57'], ['Z', '#8e44ad'], ['Z', '#d4881c'], ['?', '#455a64']],
    build(variant = 0) {
      const [ch, bg] = this.variants[variant % this.variants.length];
      const others = this.variants.map((v) => v[0]);
      const mats = [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshStandardMaterial({ map: letterTex(i === 4 ? ch : others[(variant + i) % others.length], i === 4 ? bg : this.variants[(variant + i) % this.variants.length][1]), roughness: 0.55 }));
      return mesh(roundedBox(0.14, 0.14, 0.14, 0.012, 2), mats, { pos: [0, 0.07, 0] });
    },
    colliders: [{ t: 'box', h: [0.07, 0.07, 0.07], o: [0, 0.07, 0] }],
  },
  bowl: {
    name: 'Fruit Bowl', density: 600, sound: 'ceramic', size: [0.26, 0.09, 0.26],
    build() {
      return mesh(lathe([[0, 0.0], [0.06, 0], [0.08, 0.01], [0.13, 0.08], [0.125, 0.085], [0.075, 0.018], [0, 0.018]], 40), new THREE.MeshPhysicalMaterial({ color: 0xe9e2d4, roughness: 0.2, clearcoat: 1 }));
    },
    colliders: [{ t: 'cyl', hh: 0.04, r: 0.12, o: [0, 0.04, 0] }],
  },
  moonball: {
    name: 'Moon Orb', density: 100, sound: 'glow', size: [0.2, 0.2, 0.2], glow: true,
    build() {
      const g = new THREE.Group();
      const n = new TileNoise(5);
      const t = ctex('moon', 512, 256, (x, w, h) => {
        const img = x.createImageData(w, h);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const e = n.fbm(i / w, j / h, 6, 5) * 0.5 + 0.5; const cr = n.turb(i / w, j / h, 12, 2);
          const v = 175 + e * 60 - (cr < 0.05 ? 40 : 0); const o = (j * w + i) * 4;
          img.data[o] = v; img.data[o + 1] = v * 0.98; img.data[o + 2] = v * 0.93; img.data[o + 3] = 255;
        }
        x.putImageData(img, 0, 0);
      });
      g.add(mesh(new THREE.SphereGeometry(0.1, 48, 32), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xdde8ff, emissiveIntensity: 1.6, roughness: 0.9 }), { pos: [0, 0.1, 0], cast: false }));
      const light = new THREE.PointLight(0xcfe0ff, 1.2, 2.0, 2); light.position.set(0, 0.1, 0);
      light.userData.baseIntensity = 1.2; light.userData.baseDistance = 2.0; light.name = 'propLight'; g.add(light);
      return g;
    },
    colliders: [{ t: 'ball', r: 0.1, o: [0, 0.1, 0] }],
  },
};

// Bounding box (local, at scale 1) computed from colliders.
export function propBounds(def) {
  const box = new THREE.Box3();
  for (const c of def.colliders) {
    const o = V(...c.o);
    let h;
    if (c.t === 'box') h = V(...c.h);
    else if (c.t === 'ball') h = V(c.r, c.r, c.r);
    else h = V(c.r, c.hh, c.r);
    box.expandByPoint(o.clone().sub(h)); box.expandByPoint(o.clone().add(h));
  }
  return box;
}

const templates = new Map();
export function buildPropMesh(type, variant = 0) {
  const key = type + ':' + variant;
  if (!templates.has(key)) {
    const def = CATALOG[type];
    const obj = def.build.call(def, variant);
    const root = new THREE.Group(); root.add(obj);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; o.userData.sharedGeo = true; } });
    templates.set(key, root);
  }
  const t = templates.get(key);
  const c = t.clone(true);
  c.userData.light = c.getObjectByName('propLight') || null;
  c.userData.hinge = c.getObjectByName('hinge') || null;
  return c;
}
