// Set dressing: furniture, fixtures, signage, water, sky, particles. Static pieces get physics boxes.
import * as THREE from 'three';
import { mesh, roundedBox, lathe } from '../engine/geometry.js';
import { mat, colorMat, emissiveMat, glassMat } from '../engine/materials.js';
import { textTexture, paintingTexture, makeCanvasTexture } from '../engine/textures.js';
import { buildPropMesh } from './catalog.js';
import { mulberry32 } from '../engine/noise.js';

const shared = (m) => { m.traverse((o) => { if (o.isMesh) o.userData.sharedGeo = true; }); return m; };
const geoCache = new Map();
const G = (key, fn) => { if (!geoCache.has(key)) geoCache.set(key, fn()); return geoCache.get(key); };

export class Decor {
  constructor(level) { this.L = level; }

  place(obj, x, y, z, rotY = 0) { obj.position.set(x, y, z); obj.rotation.y = rotY; this.L.root.add(obj); return obj; }
  solid(x, y, z, hx, hy, hz, sound = 'wood', rotY = 0) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    this.L.physics.addStaticBox(x, y, z, hx, hy, hz, rotY ? { x: q.x, y: q.y, z: q.z, w: q.w } : null, { kind: 'static', sound });
  }
  rotOff(dx, dz, rotY) { const c = Math.cos(rotY), s = Math.sin(rotY); return [dx * c + dz * s, -dx * s + dz * c]; }

  // ---------------------------------------------------------------- furniture
  desk(x, z, rotY = 0, { w = 1.6, d = 0.8, h = 0.75, y = 0, top = 'woodPale' } = {}) {
    const g = new THREE.Group();
    g.add(mesh(roundedBox(w, 0.04, d, 0.01), mat(top), { pos: [0, h - 0.02, 0] }));
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.04, h - 0.04, d - 0.06), mat('metalDark'), { pos: [s * (w / 2 - 0.05), (h - 0.04) / 2, 0] }));
    g.add(mesh(new THREE.BoxGeometry(w - 0.12, 0.35, 0.02), mat('metalDark'), { pos: [0, h - 0.25, -d / 2 + 0.05] }));
    this.place(g, x, y, z, rotY);
    this.solid(x, y + h - 0.02, z, w / 2, 0.02, d / 2, 'wood', rotY);
    for (const s of [-1, 1]) { const [ox, oz] = this.rotOff(s * (w / 2 - 0.05), 0, rotY); this.solid(x + ox, y + (h - 0.04) / 2, z + oz, rotY ? 0.3 : 0.02, (h - 0.04) / 2, rotY ? 0.02 : 0.3, 'metal', 0); }
    return g;
  }

  reception(x, z, rotY = 0) {
    const g = new THREE.Group();
    g.add(mesh(roundedBox(2.6, 1.05, 0.7, 0.03), mat('woodDark'), { pos: [0, 0.525, 0] }));
    g.add(mesh(roundedBox(2.7, 0.04, 0.82, 0.015), mat('porcelain'), { pos: [0, 1.07, 0.02] }));
    g.add(mesh(new THREE.BoxGeometry(2.4, 0.06, 0.02), emissiveMat(0xffd9a0, 1.2), { pos: [0, 0.95, 0.36] }));
    this.place(g, x, 0, z, rotY);
    this.solid(x, 0.55, z, rotY ? 0.4 : 1.35, 0.55, rotY ? 1.35 : 0.4, 'wood');
    return g;
  }

  officeChair(x, z, rotY = 0) {
    const g = new THREE.Group();
    const f = mat('fabric'), k = mat('blackPlastic');
    g.add(mesh(roundedBox(0.5, 0.09, 0.48, 0.035), f, { pos: [0, 0.48, 0] }));
    g.add(mesh(roundedBox(0.46, 0.55, 0.07, 0.035), f, { pos: [0, 0.82, -0.24], rot: [-0.1, 0, 0] }));
    g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36), mat('chrome'), { pos: [0, 0.27, 0] }));
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const leg = mesh(new THREE.BoxGeometry(0.3, 0.03, 0.04), k, { pos: [Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15] }); leg.rotation.y = -a; g.add(leg);
      g.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), k, { pos: [Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29] }));
    }
    this.place(g, x, 0, z, rotY);
    this.solid(x, 0.45, z, 0.25, 0.45, 0.25, 'soft');
    return g;
  }

  monitor(x, y, z, rotY = 0, glow = true) {
    const g = new THREE.Group();
    g.add(mesh(roundedBox(0.56, 0.34, 0.03, 0.01), mat('blackPlastic'), { pos: [0, 0.32, 0] }));
    const scr = glow ? emissiveMat(0x7aa9d6, 0.9) : colorMat(0x0a0c10, 0.15);
    g.add(mesh(new THREE.PlaneGeometry(0.52, 0.3), scr, { pos: [0, 0.32, 0.016], cast: false }));
    g.add(mesh(new THREE.BoxGeometry(0.04, 0.16, 0.03), mat('greyPlastic'), { pos: [0, 0.1, -0.02] }));
    g.add(mesh(roundedBox(0.2, 0.015, 0.14, 0.005), mat('greyPlastic'), { pos: [0, 0.008, 0] }));
    g.add(mesh(roundedBox(0.42, 0.015, 0.14, 0.004), mat('greyPlastic'), { pos: [0, 0.008, 0.24] }));
    return this.place(g, x, y, z, rotY);
  }

  shelf(x, z, rotY = 0, { w = 1.0, h = 2.0, d = 0.35, shelves = 5, books = true, seed = 1, material = 'woodDark' } = {}) {
    const g = new THREE.Group(); const m = mat(material);
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.03, h, d), m, { pos: [s * (w / 2 - 0.015), h / 2, 0] }));
    g.add(mesh(new THREE.BoxGeometry(w, h, 0.015), m, { pos: [0, h / 2, -d / 2 + 0.008] }));
    const rnd = mulberry32(seed);
    for (let i = 0; i <= shelves; i++) {
      const y = 0.04 + i * (h - 0.06) / shelves;
      g.add(mesh(new THREE.BoxGeometry(w - 0.04, 0.025, d - 0.02), m, { pos: [0, y, 0] }));
      if (books && i < shelves) {
        let bx = -w / 2 + 0.05;
        while (bx < w / 2 - 0.08) {
          const bw = 0.025 + rnd() * 0.035, bh = 0.18 + rnd() * 0.12;
          if (rnd() < 0.12) { bx += 0.06; continue; }
          const col = new THREE.Color().setHSL(rnd(), 0.35 + rnd() * 0.3, 0.2 + rnd() * 0.35);
          const tilt = rnd() < 0.08 ? 0.2 : 0;
          g.add(mesh(new THREE.BoxGeometry(bw, bh, d * 0.75), colorMat(col.getHex(), 0.7), { pos: [bx + bw / 2, y + 0.0125 + bh / 2, 0.01], rot: [0, 0, tilt] }));
          bx += bw + 0.003;
        }
      }
    }
    this.place(g, x, 0, z, rotY);
    const [ox, oz] = [0, 0];
    this.solid(x + ox, h / 2, z + oz, Math.abs(Math.cos(rotY)) > 0.5 ? w / 2 : d / 2, h / 2, Math.abs(Math.cos(rotY)) > 0.5 ? d / 2 : w / 2, 'wood');
    return g;
  }

  plant(x, z, { y = 0, size = 1, seed = 2 } = {}) {
    const g = new THREE.Group();
    const potH = 0.42 * size;
    g.add(mesh(lathe([[0, 0], [0.16 * size, 0], [0.2 * size, potH], [0.21 * size, potH], [0.21 * size, potH + 0.02], [0.18 * size, potH + 0.02], [0.17 * size, potH - 0.02], [0, potH - 0.02]], 28), new THREE.MeshStandardMaterial({ color: 0xe8e1d6, roughness: 0.6 })));
    g.add(mesh(new THREE.CircleGeometry(0.175 * size, 20), colorMat(0x2a1d12, 1), { pos: [0, potH - 0.025, 0], rot: [-Math.PI / 2, 0, 0] }));
    const leafGeo = G('leaf', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.09, 0.2, 0, 0.42); s.quadraticCurveTo(-0.09, 0.2, 0, 0); const geo = new THREE.ShapeGeometry(s, 6); return geo; });
    const leafM = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.55, side: THREE.DoubleSide });
    const rnd = mulberry32(seed);
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2, tilt = 0.3 + rnd() * 0.9;
      const l = new THREE.Mesh(leafGeo, leafM); l.castShadow = true;
      l.position.set(0, potH - 0.03, 0);
      l.rotation.set(0, a, 0); l.rotateX(tilt);
      l.scale.setScalar(size * (0.8 + rnd() * 0.7));
      g.add(l);
    }
    this.place(g, x, y, z, 0);
    this.solid(x, y + potH / 2, z, 0.18 * size, potH / 2, 0.18 * size, 'ceramic');
    return g;
  }

  floorLamp(x, z, { y = 0, light = true, intensity = 4 } = {}) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 24), mat('brass'), { pos: [0, 0.015, 0] }));
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.45, 10), mat('brass'), { pos: [0, 0.74, 0] }));
    const shade = lathe([[0.22, 1.42], [0.15, 1.7], [0.149, 1.7], [0.219, 1.42]], 32);
    g.add(mesh(shade, new THREE.MeshStandardMaterial({ color: 0xf3e7d0, emissive: 0xffc98a, emissiveIntensity: 1.2, roughness: 0.9, side: THREE.DoubleSide }), { cast: false }));
    this.place(g, x, y, z);
    if (light) this.L.point([x, y + 1.5, z], { color: 0xffc98a, intensity, distance: 7 });
    this.solid(x, y + 0.75, z, 0.12, 0.75, 0.12, 'metal');
    return g;
  }

  bench(x, z, rotY = 0, { w = 1.8, y = 0 } = {}) {
    const g = new THREE.Group();
    g.add(mesh(roundedBox(w, 0.08, 0.45, 0.02), mat('woodPale'), { pos: [0, 0.44, 0] }));
    for (const s of [-1, 1]) g.add(mesh(roundedBox(0.06, 0.4, 0.4, 0.01), mat('metalDark'), { pos: [s * (w / 2 - 0.12), 0.2, 0] }));
    this.place(g, x, y, z, rotY);
    this.solid(x, y + 0.24, z, Math.abs(Math.cos(rotY)) > 0.5 ? w / 2 : 0.23, 0.24, Math.abs(Math.cos(rotY)) > 0.5 ? 0.23 : w / 2, 'wood');
    return g;
  }

  sofa(x, z, rotY = 0, { w = 2.0, color = 'fabric' } = {}) {
    const g = new THREE.Group(); const f = mat(color);
    g.add(mesh(roundedBox(w, 0.42, 0.9, 0.08), f, { pos: [0, 0.29, 0] }));
    g.add(mesh(roundedBox(w, 0.5, 0.22, 0.09), f, { pos: [0, 0.68, -0.34] }));
    for (const s of [-1, 1]) g.add(mesh(roundedBox(0.2, 0.32, 0.9, 0.08), f, { pos: [s * (w / 2 - 0.1), 0.6, 0] }));
    for (let i = 0; i < 2; i++) g.add(mesh(roundedBox(w / 2 - 0.2, 0.14, 0.66, 0.06), f, { pos: [(i - 0.5) * (w / 2 - 0.18), 0.56, 0.08] }));
    this.place(g, x, 0, z, rotY);
    this.solid(x, 0.4, z, Math.abs(Math.cos(rotY)) > 0.5 ? w / 2 : 0.45, 0.4, Math.abs(Math.cos(rotY)) > 0.5 ? 0.45 : w / 2, 'soft');
    return g;
  }

  coffeeTable(x, z, { w = 1.1, d = 0.6, y = 0 } = {}) {
    const g = new THREE.Group();
    g.add(mesh(roundedBox(w, 0.04, d, 0.012), mat('woodDark'), { pos: [0, 0.42, 0] }));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.4, 8), mat('brass'), { pos: [sx * (w / 2 - 0.06), 0.2, sz * (d / 2 - 0.06)] }));
    this.place(g, x, y, z);
    this.solid(x, y + 0.42, z, w / 2, 0.02, d / 2, 'wood');
    return g;
  }

  bed(x, z, rotY = 0) {
    const g = new THREE.Group();
    g.add(mesh(roundedBox(1.0, 0.25, 2.05, 0.03), mat('woodPale'), { pos: [0, 0.22, 0] }));
    g.add(mesh(roundedBox(0.95, 0.2, 1.95, 0.08), mat('fabricCream'), { pos: [0, 0.44, 0.02] }));
    g.add(mesh(roundedBox(0.97, 0.05, 1.3, 0.04), new THREE.MeshStandardMaterial({ color: 0x8fb3d6, roughness: 0.95 }), { pos: [0, 0.555, 0.35] }));
    g.add(mesh(roundedBox(0.6, 0.12, 0.38, 0.05), mat('fabricCream'), { pos: [0, 0.6, -0.72] }));
    g.add(mesh(roundedBox(1.04, 0.9, 0.06, 0.02), mat('woodPale'), { pos: [0, 0.45, -1.03] }));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.12, 8), mat('woodDark'), { pos: [sx * 0.45, 0.06, sz * 0.98] }));
    this.place(g, x, 0, z, rotY);
    this.solid(x, 0.3, z, Math.abs(Math.cos(rotY)) > 0.5 ? 0.5 : 1.03, 0.3, Math.abs(Math.cos(rotY)) > 0.5 ? 1.03 : 0.5, 'soft');
    return g;
  }

  nightstand(x, z, rotY = 0) {
    const g = new THREE.Group();
    g.add(mesh(roundedBox(0.45, 0.5, 0.4, 0.015), mat('woodPale'), { pos: [0, 0.25, 0] }));
    g.add(mesh(new THREE.BoxGeometry(0.38, 0.005, 0.005), mat('brass'), { pos: [0, 0.38, 0.2] }));
    this.place(g, x, 0, z, rotY);
    this.solid(x, 0.25, z, 0.225, 0.25, 0.2, 'wood');
    return g;
  }

  partition(x, z, rotY, w = 1.6, h = 1.4) {
    const g = new THREE.Group();
    g.add(mesh(roundedBox(w, h, 0.06, 0.02), mat('fabric'), { pos: [0, h / 2, 0] }));
    g.add(mesh(new THREE.BoxGeometry(w, 0.03, 0.07), mat('greyPlastic'), { pos: [0, h, 0] }));
    this.place(g, x, 0, z, rotY);
    this.solid(x, h / 2, z, Math.abs(Math.cos(rotY)) > 0.5 ? w / 2 : 0.03, h / 2, Math.abs(Math.cos(rotY)) > 0.5 ? 0.03 : w / 2, 'soft');
  }

  waterCooler(x, z, rotY = 0) {
    const g = new THREE.Group();
    g.add(mesh(roundedBox(0.32, 1.0, 0.32, 0.02), mat('whitePlastic'), { pos: [0, 0.5, 0] }));
    g.add(mesh(lathe([[0.001, 1.0], [0.14, 1.02], [0.15, 1.25], [0.14, 1.36], [0.05, 1.42], [0.001, 1.43]], 24), glassMat(0x9fd3ff, 0.45), { cast: false }));
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), colorMat(0x2d6db0, 0.4), { pos: [0.06, 0.8, 0.17] }));
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), colorMat(0xc0392b, 0.4), { pos: [-0.06, 0.8, 0.17] }));
    this.place(g, x, 0, z, rotY);
    this.solid(x, 0.7, z, 0.16, 0.7, 0.16, 'plastic');
  }

  // Wall-mounted framed painting. (x,y,z) centre; rotY faces the art toward +z rotated.
  painting(x, y, z, rotY, { w = 1.0, h = 0.75, seed = 1, style = 'abstract', frame = 'frame', light = false } = {}) {
    const g = new THREE.Group();
    const tex = paintingTexture(seed, style);
    g.add(mesh(roundedBox(w + 0.1, h + 0.1, 0.05, 0.01), mat(frame), { pos: [0, 0, 0.025] }));
    g.add(mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }), { pos: [0, 0, 0.052] }));
    this.place(g, x, y, z, rotY);
    if (light) {
      const [ox, oz] = this.rotOff(0, 0.9, rotY);
      const l = this.L.spot([x + ox, y + 1.0, z + oz], [x, y, z], { intensity: 6, angle: 0.5, penumbra: 0.8, shadow: false, distance: 5 });
      g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), mat('brass'), { pos: [0, h / 2 + 0.15, 0.12], rot: [Math.PI / 3, 0, 0] }));
    }
    return g;
  }

  sign(text, x, y, z, rotY, { w = 1.0, h = 0.3, bg = '#f4f1ea', color = '#2a2c33', font = '600 64px Inter, Arial', sub = null, glow = 0 } = {}) {
    const tex = textTexture(text, { w: 1024, h: Math.round(1024 * h / w), bg, color, font, sub, subFont: '400 28px Inter, Arial' });
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
    if (glow) { m.emissiveMap = tex; m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = glow; }
    const s = mesh(new THREE.BoxGeometry(w, h, 0.02), [mat('whitePlastic'), mat('whitePlastic'), mat('whitePlastic'), mat('whitePlastic'), m, mat('whitePlastic')], { cast: false });
    return this.place(s, x, y, z, rotY);
  }

  poster(text, sub, x, y, z, rotY, { w = 0.6, h = 0.85, hue = 200 } = {}) {
    const tex = makeCanvasTexture(512, 724, (c, W, H) => {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `hsl(${hue},45%,82%)`); g.addColorStop(1, `hsl(${hue + 40},55%,62%)`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(W / 2, H * 0.38, 120, 0, Math.PI * 2); c.fill();
      c.strokeStyle = `hsl(${hue},40%,30%)`; c.lineWidth = 10; c.beginPath(); c.moveTo(W / 2 - 160, H * 0.38); c.quadraticCurveTo(W / 2, H * 0.38 - 120, W / 2 + 160, H * 0.38); c.quadraticCurveTo(W / 2, H * 0.38 + 120, W / 2 - 160, H * 0.38); c.stroke();
      c.fillStyle = `hsl(${hue},40%,30%)`; c.beginPath(); c.arc(W / 2, H * 0.38, 40, 0, Math.PI * 2); c.fill();
      c.fillStyle = `hsl(${hue},45%,18%)`; c.textAlign = 'center';
      c.font = 'italic 600 58px Cormorant, Georgia'; c.fillText(text, W / 2, H * 0.72);
      c.font = '400 24px Inter, Arial'; c.fillText(sub, W / 2, H * 0.8);
      c.font = '600 18px Inter, Arial'; c.fillText('MORROW SLEEP CLINIC', W / 2, H * 0.93);
    });
    const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }), { cast: false });
    return this.place(m, x, y, z, rotY);
  }

  wallClock(x, y, z, rotY) {
    const g = buildPropMesh('clock');
    const face = new THREE.Group();
    face.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 40), colorMat(0x22252a, 0.4), { rot: [Math.PI / 2, 0, 0] }));
    const tex = makeCanvasTexture(256, 256, (c, w) => { c.fillStyle = '#f6f3ec'; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); c.fill(); c.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.save(); c.translate(w / 2 + Math.sin(a) * 104, w / 2 - Math.cos(a) * 104); c.rotate(a); c.fillRect(-3, -10, 6, 20); c.restore(); } });
    face.add(mesh(new THREE.CircleGeometry(0.18, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 }), { pos: [0, 0, 0.021] }));
    const hand = (len, w, col) => { const h = new THREE.Group(); h.add(mesh(new THREE.BoxGeometry(w, len, 0.004), colorMat(col, 0.4), { pos: [0, len / 2 - 0.02, 0] })); h.position.z = 0.026; face.add(h); return h; };
    const hh = hand(0.1, 0.012, 0x111111), mh = hand(0.15, 0.008, 0x111111), sh = hand(0.16, 0.003, 0xc0392b);
    this.L.animated.push((dt, t) => { const s = performance.now() / 1000; sh.rotation.z = -s * Math.PI * 2 / 60; mh.rotation.z = -s * Math.PI * 2 / 3600 - 1.2; hh.rotation.z = -s * Math.PI * 2 / 43200 - 2.5; });
    return this.place(face, x, y, z, rotY);
  }

  vent(x, y, z, rotY = 0, w = 0.6, d = 0.6) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(w, 0.02, d), mat('whitePlastic'), { cast: false }));
    for (let i = 0; i < 7; i++) g.add(mesh(new THREE.BoxGeometry(w - 0.06, 0.02, 0.012), colorMat(0x55585c, 0.6), { pos: [0, -0.012, -d / 2 + 0.06 + i * (d - 0.12) / 6], cast: false }));
    return this.place(g, x, y, z, rotY);
  }

  column(x, z, { h = 4, r = 0.3, y = 0, material = 'plaster' } = {}) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(r, r, h, 32), mat(material), { pos: [0, h / 2, 0] }));
    g.add(mesh(roundedBox(r * 2.6, 0.18, r * 2.6, 0.02), mat('trim'), { pos: [0, 0.09, 0] }));
    g.add(mesh(roundedBox(r * 2.6, 0.18, r * 2.6, 0.02), mat('trim'), { pos: [0, h - 0.09, 0] }));
    this.place(g, x, y, z);
    this.solid(x, y + h / 2, z, r * 1.3, h / 2, r * 1.3, 'hard');
  }

  railing(x0, z0, x1, z1, y, h = 1.0) {
    const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 10), mat('chrome'), { pos: [0, h, 0], rot: [Math.PI / 2, 0, 0] }));
    const n = Math.max(2, Math.round(len / 1.2));
    for (let i = 0; i <= n; i++) g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, h, 8), mat('chrome'), { pos: [0, h / 2, -len / 2 + i * len / n] }));
    g.add(mesh(new THREE.BoxGeometry(0.012, h * 0.75, len), glassMat(0xd6ecff, 0.14), { pos: [0, h * 0.45, 0], cast: false }));
    this.place(g, (x0 + x1) / 2, y, (z0 + z1) / 2, a);
    this.solid((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2, Math.abs(x1 - x0) / 2 + 0.03, h / 2, Math.abs(z1 - z0) / 2 + 0.03, 'metal');
  }

  window(x, y, z, rotY, w = 2, h = 1.6, sky = 0xcfe6ff) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.PlaneGeometry(w, h), emissiveMat(sky, 2.2), { cast: false }));
    const fm = mat('trim');
    for (const [px, py, sw, sh] of [[0, h / 2, w + 0.1, 0.06], [0, -h / 2, w + 0.12, 0.08], [-w / 2, 0, 0.06, h], [w / 2, 0, 0.06, h], [0, 0, 0.04, h], [0, 0, w, 0.04]]) g.add(mesh(new THREE.BoxGeometry(sw, sh, 0.08), fm, { pos: [px, py, 0.03] }));
    return this.place(g, x, y, z, rotY);
  }

  rug(x, z, w, d, color = 0x8a5a4a, { y = 0.004, rotY = 0 } = {}) {
    const tex = makeCanvasTexture(512, 512, (c, W) => {
      const col = new THREE.Color(color);
      c.fillStyle = `#${col.getHexString()}`; c.fillRect(0, 0, W, W);
      c.strokeStyle = 'rgba(255,240,220,0.55)'; c.lineWidth = 10; c.strokeRect(28, 28, W - 56, W - 56);
      c.lineWidth = 3; c.strokeRect(52, 52, W - 104, W - 104);
      c.fillStyle = 'rgba(255,240,220,0.35)';
      for (let i = 0; i < 5; i++) { c.save(); c.translate(W / 2, W / 2); c.rotate(i * Math.PI / 5); c.fillRect(-150, -8, 300, 16); c.restore(); }
      const img = c.getImageData(0, 0, W, W); for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 30; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; } c.putImageData(img, 0, 0);
    });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const m = mesh(new THREE.BoxGeometry(w, 0.012, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.98, normalMap: mat('carpet').normalMap, normalScale: new THREE.Vector2(0.6, 0.6) }), { cast: false });
    return this.place(m, x, y, z, rotY);
  }

  // ---------------------------------------------------------------- collectibles & special objects
  paperCrane() {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: 0xfff6e8, emissive: 0xffd9a0, emissiveIntensity: 0.9, roughness: 0.7, side: THREE.DoubleSide, flatShading: true });
    const tri = (a, b, c) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3)); geo.computeVertexNormals(); return new THREE.Mesh(geo, m); };
    const s = 0.16;
    const parts = [
      tri([0, 0, -0.5], [0.12, 0.05, 0], [0, 0.25, 0]), tri([0, 0, -0.5], [-0.12, 0.05, 0], [0, 0.25, 0]),
      tri([0, 0, 0.45], [0.12, 0.05, 0], [0, 0.25, 0]), tri([0, 0, 0.45], [-0.12, 0.05, 0], [0, 0.25, 0]),
      tri([0, 0.2, 0], [0.9, 0.45, -0.15], [0.05, 0.12, 0.2]), tri([0, 0.2, 0], [-0.9, 0.45, -0.15], [-0.05, 0.12, 0.2]),
      tri([0, 0.05, -0.4], [0, 0.65, -0.75], [0, 0.12, -0.2]), tri([0, 0.65, -0.75], [0, 0.55, -0.9], [0, 0.6, -0.7]),
      tri([0, 0.05, 0.35], [0, 0.6, 0.7], [0, 0.12, 0.2]),
    ];
    for (const p of parts) { p.scale.setScalar(s); p.castShadow = true; g.add(p); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffe2b0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(0.7); g.add(glow);
    return g;
  }

  propPreview(type, variant = 0) { return buildPropMesh(type, variant); }

  // Glowing crystal flower that opens when lit.
  lightFlower() {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0.22, 0], [0.2, 0.08], [0.12, 0.12], [0.1, 0.6], [0.16, 0.68], [0.0, 0.7]], 6), mat('concrete')));
    const petM = new THREE.MeshPhysicalMaterial({ color: 0xc9e6ff, emissive: 0x6fb8ff, emissiveIntensity: 0.1, roughness: 0.1, transmission: 0.0, clearcoat: 1, transparent: true, opacity: 0.9 });
    const petals = [];
    const pg = new THREE.ConeGeometry(0.07, 0.32, 5, 1); pg.translate(0, 0.16, 0);
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Group(); p.position.set(0, 0.7, 0); p.rotation.y = i / 6 * Math.PI * 2;
      const m = new THREE.Mesh(pg, petM); m.castShadow = true; p.add(m); m.rotation.x = 0.15; g.add(p); petals.push(m);
    }
    const core = mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xbfe4ff, emissiveIntensity: 0.3 }), { pos: [0, 0.76, 0] });
    g.add(core);
    const light = new THREE.PointLight(0x9fd3ff, 0, 4, 2); light.position.set(0, 0.9, 0); g.add(light);
    g.userData.setOpen = (lit, charge) => {
      for (const p of petals) p.rotation.x = 0.15 + charge * 0.95;
      petM.emissiveIntensity = 0.1 + lit * 1.2 + charge * 1.5;
      core.material.emissiveIntensity = 0.3 + charge * 6;
      light.intensity = charge * 3;
    };
    return g;
  }

  waterSurface(w, d) {
    const geo = new THREE.PlaneGeometry(w, d, 1, 1); geo.rotateX(-Math.PI / 2);
    const m = new THREE.MeshPhysicalMaterial({ color: 0x5fb6c9, roughness: 0.04, metalness: 0.0, transparent: true, opacity: 0.55, envMapIntensity: 1.5, depthWrite: false });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = { value: 0 };
      m.userData.shader = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uTime;\nfloat wv(vec2 p){return sin(p.x)*cos(p.y);}')
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          vec2 P = vWPos.xz;
          float t = uTime;
          vec2 g = vec2(0.0);
          g += vec2(cos(P.x*1.7+t*1.1), -sin(P.y*1.3+t*0.9))*0.06;
          g += vec2(cos(P.x*3.9-P.y*2.1+t*1.7), cos(P.y*4.3+P.x*1.2-t*1.4))*0.03;
          g += vec2(sin(P.y*9.1+t*2.3), cos(P.x*8.7-t*2.1))*0.012;
          normal = normalize(normal + vec3(g.x, 0.0, g.y));
        `);
    };
    const meshW = new THREE.Mesh(geo, m);
    meshW.receiveShadow = false; meshW.renderOrder = 3;
    meshW.material.uniforms = { uTime: { value: 0 } };
    Object.defineProperty(meshW.material.uniforms.uTime, 'value', { get: () => (m.userData.shader ? m.userData.shader.uniforms.uTime.value : 0), set: (v) => { if (m.userData.shader) m.userData.shader.uniforms.uTime.value = v; } });
    return meshW;
  }

  // Animated caustics added to a material (pool floors).
  static causticMaterial(baseName, waterY) {
    const b = mat(baseName);
    const m = b.clone();
    m.userData = { ...b.userData };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = { value: 0 }; sh.uniforms.uWaterY = { value: waterY };
      m.userData.shader = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos2;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos2 = (modelMatrix * vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWPos2; uniform float uTime; uniform float uWaterY;
        float caus(vec2 p, float t){ vec2 i = p; float c = 1.0; float inten = .005;
          for (int n = 0; n < 4; n++) { float tt = t * (1.0 - (3.5 / float(n+1)));
            i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
            c += 1.0/length(vec2(p.x / (sin(i.x+tt)/inten),p.y / (cos(i.y+tt)/inten))); }
          c /= 4.0; c = 1.17-pow(c, 1.4); return pow(abs(c), 8.0); }`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          if (vWPos2.y < uWaterY - 0.05) { float k = caus(vWPos2.xz*1.3, uTime*0.6); totalEmissiveRadiance += vec3(0.55,0.8,0.85) * k * 0.55 * diffuseColor.rgb; }`);
    };
    return m;
  }

  // Sky dome: 'night', 'day', 'dusk', 'void'
  sky(kind = 'day') {
    const g = new THREE.SphereGeometry(400, 48, 24);
    const uniforms = {
      top: { value: new THREE.Color(kind === 'night' ? 0x050a1a : kind === 'dusk' ? 0x2b3c6e : 0x5d9be0) },
      mid: { value: new THREE.Color(kind === 'night' ? 0x101c3a : kind === 'dusk' ? 0xe89a7a : 0xbfdcf5) },
      bot: { value: new THREE.Color(kind === 'night' ? 0x1a2440 : kind === 'dusk' ? 0xf5cfa0 : 0xf4efe6) },
      stars: { value: kind === 'night' ? 1 : 0 },
      sunDir: { value: new THREE.Vector3(0.3, 0.25, -0.9).normalize() },
      sunCol: { value: new THREE.Color(kind === 'night' ? 0xdfe8ff : 0xfff1d0) },
      sunSize: { value: kind === 'night' ? 0.9992 : 0.9985 },
      intensity: { value: kind === 'night' ? 1.0 : 1.6 },
    };
    const m = new THREE.ShaderMaterial({
      uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
      fragmentShader: `varying vec3 vDir; uniform vec3 top, mid, bot, sunCol, sunDir; uniform float stars, sunSize, intensity;
        float h(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        void main(){ float y = vDir.y; vec3 c = y > 0.0 ? mix(mid, top, pow(y, 0.6)) : mix(mid, bot, pow(-y, 0.5));
          float sd = dot(normalize(vDir), sunDir);
          c += sunCol * smoothstep(sunSize, sunSize + 0.0004, sd) * 6.0;
          c += sunCol * pow(max(sd, 0.0), 60.0) * 0.35;
          if (stars > 0.5) { vec3 q = floor(vDir * 700.0); float s = h(q); c += vec3(0.9,0.95,1.0) * step(0.9985, s) * smoothstep(-0.05, 0.3, y) * (0.3 + 0.7*h(q+3.0)) * 0.9; }
          gl_FragColor = vec4(c * intensity, 1.0); }`,
    });
    const sky = new THREE.Mesh(g, m); sky.renderOrder = -10; sky.frustumCulled = false;
    sky.userData.sharedGeo = false;
    this.L.root.add(sky);
    this.L.skyMesh = sky;
    return sky;
  }

  // Soft cloud billboards for the void / outdoor levels.
  clouds(count, { y0 = -40, y1 = -5, r = 120, seed = 4, color = 0xffffff, opacity = 0.75, scale = [18, 45] } = {}) {
    const rnd = mulberry32(seed);
    const tex = cloudTex();
    const grp = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const sm = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: opacity * (0.6 + rnd() * 0.4), depthWrite: false, fog: true });
      const s = new THREE.Sprite(sm);
      const a = rnd() * Math.PI * 2, d = 25 + rnd() * r;
      s.position.set(Math.cos(a) * d, y0 + rnd() * (y1 - y0), Math.sin(a) * d);
      const sc = scale[0] + rnd() * (scale[1] - scale[0]); s.scale.set(sc, sc * 0.55, 1);
      grp.add(s);
    }
    this.L.root.add(grp);
    this.L.animated.push((dt) => { grp.rotation.y += dt * 0.004; });
    return grp;
  }

  // Floating dust motes catching the light.
  dust(cx, cy, cz, sx, sy, sz, count = 220, color = 0xfff2d8) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3), ph = new Float32Array(count);
    for (let i = 0; i < count; i++) { pos[i * 3] = cx + (Math.random() - 0.5) * sx; pos[i * 3 + 1] = cy + (Math.random() - 0.5) * sy; pos[i * 3 + 2] = cz + (Math.random() - 0.5) * sz; ph[i] = Math.random() * 100; }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color, size: 0.018, map: glowTex(), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const pts = new THREE.Points(geo, m);
    this.L.root.add(pts);
    const base = pos.slice();
    this.L.animated.push((dt, t) => {
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) { p[i * 3] = base[i * 3] + Math.sin(t * 0.21 + ph[i]) * 0.25; p[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.13 + ph[i] * 1.3) * 0.2; p[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.17 + ph[i]) * 0.25; }
      geo.attributes.position.needsUpdate = true;
    });
    return pts;
  }

  // Volumetric-looking light shaft (additive gradient box).
  shaft(x, y, z, w, h, d, rotX = 0, rotZ = 0, color = 0xfff1d8, opacity = 0.08) {
    const tex = shaftTex();
    const m = new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.rotation.y = i * Math.PI / 3; g.add(p); }
    g.position.set(x, y, z); g.rotation.set(rotX, 0, rotZ);
    this.L.root.add(g);
    return g;
  }

  fireflies(cx, cy, cz, sx, sy, sz, count = 60) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3), ph = new Float32Array(count);
    for (let i = 0; i < count; i++) { pos[i * 3] = cx + (Math.random() - 0.5) * sx; pos[i * 3 + 1] = cy + (Math.random() - 0.5) * sy; pos[i * 3 + 2] = cz + (Math.random() - 0.5) * sz; ph[i] = Math.random() * 100; }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0xd8ff8a, size: 0.09, map: glowTex(), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const pts = new THREE.Points(geo, m);
    this.L.root.add(pts);
    const base = pos.slice();
    this.L.animated.push((dt, t) => {
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) { p[i * 3] = base[i * 3] + Math.sin(t * 0.5 + ph[i]) * 0.8; p[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.7 + ph[i] * 1.3) * 0.4; p[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.4 + ph[i]) * 0.8; }
      geo.attributes.position.needsUpdate = true;
      m.opacity = 0.65 + Math.sin(t * 3) * 0.15;
    });
  }

  hedge(x0, z0, x1, z1, h = 2.2, y = 0) {
    this.L.box([x0, y, z0], [x1, y + h, z1], 'hedge', { sound: 'grass' });
  }

  lamppost(x, z, { y = 0, h = 3.2, color = 0xffd7a0, intensity = 10, shadow = false } = {}) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.09, h, 12), colorMat(0x1c1f22, 0.5, 0.6), { pos: [0, h / 2, 0] }));
    g.add(mesh(lathe([[0.0, h + 0.38], [0.16, h + 0.3], [0.13, h + 0.02], [0.0, h]], 6), colorMat(0x1c1f22, 0.5, 0.6)));
    g.add(mesh(new THREE.SphereGeometry(0.11, 16, 10), emissiveMat(color, 6), { pos: [0, h + 0.15, 0], cast: false }));
    this.place(g, x, y, z);
    this.solid(x, y + h / 2, z, 0.1, h / 2, 0.1, 'metal');
    this.L.point([x, y + h + 0.1, z], { color, intensity, distance: 12, shadow });
  }

  fountain(x, z, r = 1.6) {
    const g = new THREE.Group();
    g.add(mesh(lathe([[r, 0], [r + 0.1, 0], [r + 0.12, 0.5], [r - 0.05, 0.52], [r - 0.1, 0.1], [0, 0.1]], 40), mat('concrete')));
    g.add(mesh(new THREE.CylinderGeometry(r - 0.1, r - 0.1, 0.02, 40), new THREE.MeshPhysicalMaterial({ color: 0x2a4a5a, roughness: 0.05, transparent: true, opacity: 0.8 }), { pos: [0, 0.4, 0] }));
    g.add(mesh(lathe([[0.15, 0], [0.12, 1.0], [0.5, 1.1], [0.52, 1.2], [0.1, 1.2], [0.08, 1.6], [0, 1.65]], 24), mat('concrete')));
    this.place(g, x, 0, z);
    this.solid(x, 0.26, z, r + 0.1, 0.26, r + 0.1, 'stone');
    this.solid(x, 0.8, z, 0.2, 0.8, 0.2, 'stone');
  }

  ladder(x, z, rotY, h) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, h + 0.8, 10), mat('chrome'), { pos: [s * 0.25, h / 2 + 0.2, 0] }));
    for (let y = 0.3; y < h; y += 0.3) g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), mat('chrome'), { pos: [0, y - h + 0.6, 0.04], rot: [0, 0, Math.PI / 2] }));
    return this.place(g, x, 0, z, rotY);
  }
}

let _glow = null, _cloud = null, _shaft = null;
function glowTex() {
  if (!_glow) _glow = makeCanvasTexture(64, 64, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });
  return _glow;
}
function cloudTex() {
  if (!_cloud) _cloud = makeCanvasTexture(256, 256, (c, w) => {
    for (let i = 0; i < 26; i++) {
      const x = w * (0.25 + Math.random() * 0.5), y = w * (0.35 + Math.random() * 0.3), r = w * (0.08 + Math.random() * 0.16);
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
  });
  return _cloud;
}
function shaftTex() {
  if (!_shaft) _shaft = makeCanvasTexture(64, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.15, 'rgba(255,255,255,0.8)'); g.addColorStop(0.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const g2 = c.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)');
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = g2; c.fillRect(0, 0, w, h);
  });
  return _shaft;
}
