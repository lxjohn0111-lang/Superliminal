// Anamorphic illusions: an object shattered into fragments that are each slid along the line of sight
// from one secret viewpoint. From exactly there it looks whole; step into place and it becomes real.
import * as THREE from 'three';
import { mulberry32 } from '../engine/noise.js';
import { makeCanvasTexture } from '../engine/textures.js';

const _v = new THREE.Vector3();
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let markerTex = null;
function getMarkerTex() {
  if (!markerTex) markerTex = makeCanvasTexture(256, 256, (x, w) => {
    x.strokeStyle = 'rgba(160,215,255,1)'; x.lineWidth = 6;
    x.beginPath(); x.arc(w / 2, w / 2, 110, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.moveTo(40, w / 2); x.quadraticCurveTo(w / 2, 50, w - 40, w / 2); x.quadraticCurveTo(w / 2, w - 50, 40, w / 2); x.stroke();
    x.fillStyle = 'rgba(160,215,255,1)'; x.beginPath(); x.arc(w / 2, w / 2, 26, 0, Math.PI * 2); x.fill();
  });
  return markerTex;
}

export class Illusion {
  constructor(level, opts) {
    this.level = level;
    this.opts = opts;
    this.view = new THREE.Vector3(...opts.view);
    this.solved = false;
    this.progress = 0;
    this.align = 0;
    this.anim = -1;
    this.chunks = [];
    this.group = new THREE.Group();
    level.root.add(this.group);
    this.mats = new Map();
    this.time = Math.random() * 10;
    this.build();
    if (opts.marker !== undefined) this.addMarker(opts.marker);
  }

  build() {
    const o = this.opts;
    const src = o.source(); // Object3D positioned in world space (target pose)
    src.updateMatrixWorld(true);
    this.center = new THREE.Box3().setFromObject(src).getCenter(new THREE.Vector3());
    const tris = []; // { a,b,c (Vector3 x3), na,nb,nc, uv, mat }
    src.traverse((m) => {
      if (!m.isMesh) return;
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      g.applyMatrix4(m.matrixWorld);
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const groups = g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
      for (const gr of groups) {
        const mat = mats[gr.materialIndex || 0] || mats[0];
        for (let i = gr.start; i < gr.start + gr.count; i += 3) tris.push({ g, i, mat });
      }
    });
    const rnd = mulberry32(o.seed || 7);
    const K = o.chunks || 18;
    // Cluster triangles by centroid (k-means, 3 iterations).
    const cent = tris.map(({ g, i }) => {
      const p = g.attributes.position;
      return new THREE.Vector3((p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3);
    });
    let seeds = [];
    for (let k = 0; k < K; k++) seeds.push(cent[Math.floor(rnd() * cent.length)].clone());
    let assign = new Int32Array(tris.length);
    for (let it = 0; it < 4; it++) {
      for (let t = 0; t < tris.length; t++) {
        let best = 0, bd = Infinity;
        for (let k = 0; k < K; k++) { const d = cent[t].distanceToSquared(seeds[k]); if (d < bd) { bd = d; best = k; } }
        assign[t] = best;
      }
      const sums = seeds.map(() => [new THREE.Vector3(), 0]);
      for (let t = 0; t < tris.length; t++) { sums[assign[t]][0].add(cent[t]); sums[assign[t]][1]++; }
      seeds = sums.map(([s, n], k) => (n ? s.divideScalar(n) : seeds[k]));
    }
    // Build one group per cluster, sub-meshes per material.
    const bounds = o.bounds;
    const V = this.view;
    for (let k = 0; k < K; k++) {
      const byMat = new Map();
      for (let t = 0; t < tris.length; t++) if (assign[t] === k) {
        const tr = tris[t];
        if (!byMat.has(tr.mat)) byMat.set(tr.mat, []);
        byMat.get(tr.mat).push(tr);
      }
      if (!byMat.size) continue;
      const chunk = new THREE.Group();
      const box = new THREE.Box3();
      for (const [mat, list] of byMat) {
        const pos = new Float32Array(list.length * 9), nor = new Float32Array(list.length * 9), uv = new Float32Array(list.length * 6);
        list.forEach(({ g, i }, j) => {
          const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
          for (let v = 0; v < 3; v++) {
            pos[j * 9 + v * 3] = P.getX(i + v) - V.x; pos[j * 9 + v * 3 + 1] = P.getY(i + v) - V.y; pos[j * 9 + v * 3 + 2] = P.getZ(i + v) - V.z;
            if (N) { nor[j * 9 + v * 3] = N.getX(i + v); nor[j * 9 + v * 3 + 1] = N.getY(i + v); nor[j * 9 + v * 3 + 2] = N.getZ(i + v); }
            if (U) { uv[j * 6 + v * 2] = U.getX(i + v); uv[j * 6 + v * 2 + 1] = U.getY(i + v); }
            box.expandByPoint(_v.set(P.getX(i + v), P.getY(i + v), P.getZ(i + v)));
          }
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.computeBoundingSphere();
        const m = new THREE.Mesh(geo, this.glowMat(mat));
        m.castShadow = true; m.receiveShadow = true;
        chunk.add(m);
      }
      // Choose a depth factor so the fragment stays inside the room and away from the viewer.
      const c = box.getCenter(new THREE.Vector3());
      const distC = c.distanceTo(V);
      const ranges = [[0.35, 0.72], [1.35, 2.6]];
      let f = 1;
      for (let tries = 0; tries < 12; tries++) {
        const r = ranges[rnd() < (o.nearBias ?? 0.45) ? 0 : 1];
        f = r[0] + rnd() * (r[1] - r[0]);
        if (f * distC < 0.9) continue;
        if (bounds && !this.chunkInside(box, f, bounds)) continue;
        break;
      }
      if (bounds && !this.chunkInside(box, f, bounds)) {
        let lo = 1, hi = f; // shrink toward 1 until inside
        for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (this.chunkInside(box, m, bounds)) lo = m; else hi = m; }
        f = lo;
      }
      chunk.userData = { f0: f, phase: rnd() * Math.PI * 2 };
      this.setChunkF(chunk, f);
      this.group.add(chunk);
      this.chunks.push(chunk);
    }
    // dispose temp geometry
    const seen = new Set();
    for (const tr of tris) if (!seen.has(tr.g)) { seen.add(tr.g); tr.g.dispose(); }
  }

  chunkInside(box, f, bounds) {
    const V = this.view;
    const a = _v.copy(box.min).sub(V).multiplyScalar(f).add(V);
    if (!bounds.containsPoint(a)) return false;
    const b = _v.copy(box.max).sub(V).multiplyScalar(f).add(V);
    return bounds.containsPoint(b);
  }

  setChunkF(chunk, f) {
    chunk.scale.setScalar(f);
    chunk.position.copy(this.view);
  }

  glowMat(mat) {
    if (!this.mats.has(mat)) {
      const m = mat.clone();
      m.emissive = new THREE.Color(0x8fd0ff);
      m.emissiveIntensity = 0.0;
      if (mat.emissiveMap) m.emissiveMap = mat.emissiveMap;
      else if (mat.map) m.emissiveMap = mat.map;
      m.userData.baseEmissive = mat.emissiveIntensity || 0;
      this.mats.set(mat, m);
    }
    return this.mats.get(mat);
  }

  addMarker(visible) {
    const g = new THREE.PlaneGeometry(0.9, 0.9);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ map: getMarkerTex(), transparent: true, opacity: visible ? 0.28 : 0, depthWrite: false, toneMapped: false, color: 0xffffff });
    this.marker = new THREE.Mesh(g, m);
    const floorY = this.opts.floorY ?? (this.view.y - 1.64);
    this.marker.position.set(this.view.x, floorY + 0.012, this.view.z);
    this.marker.renderOrder = 2;
    this.markerBase = visible ? 0.28 : 0;
    this.level.root.add(this.marker);
  }

  revealMarker() { if (!this.marker) this.addMarker(true); this.markerBase = 0.85; }

  update(dt, camera) {
    this.time += dt;
    if (this.solved && this.anim < 0) return;
    if (this.anim >= 0) {
      this.anim += dt / 1.1;
      const e = ease(Math.min(1, this.anim));
      for (const c of this.chunks) this.setChunkF(c, c.userData.f0 + (1 - c.userData.f0) * e);
      for (const m of this.mats.values()) m.emissiveIntensity = m.userData.baseEmissive + Math.sin(Math.min(1, this.anim) * Math.PI) * 1.5;
      if (this.anim >= 1) this.finish();
      return;
    }
    for (const c of this.chunks) {
      const f = c.userData.f0 * (1 + 0.018 * Math.sin(this.time * 0.7 + c.userData.phase));
      this.setChunkF(c, f);
    }
    const dPos = camera.position.distanceTo(this.view);
    const fwd = camera.getWorldDirection(_v);
    const toC = this.center.clone().sub(this.view).normalize();
    const ang = Math.acos(Math.max(-1, Math.min(1, fwd.dot(toC)))) * 180 / Math.PI;
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    this.align = sm(2.0, 0.25, dPos) * sm(28, 5, ang);
    for (const m of this.mats.values()) m.emissiveIntensity = m.userData.baseEmissive + this.align * 0.55 + 0.05 * Math.sin(this.time * 2);
    if (this.marker) this.marker.material.opacity = this.markerBase * (0.75 + 0.25 * Math.sin(this.time * 2.5));
    const tolPos = this.opts.tolerance ?? 0.3;
    if (dPos < tolPos && ang < 6.5) this.progress += dt; else this.progress = Math.max(0, this.progress - dt * 2);
    if (this.progress > 0.3) this.solve();
  }

  solve() {
    if (this.solved) return;
    this.solved = true;
    this.anim = 0;
    const game = this.level.game;
    game.audio.illusionSnap();
    game.flash();
    game.achievements.unlock('illusion');
  }

  finish() {
    this.anim = -1;
    this.group.removeFromParent();
    for (const c of this.chunks) c.traverse((m) => { if (m.isMesh) m.geometry.dispose(); });
    if (this.marker) { this.marker.removeFromParent(); }
    if (this.opts.onSolid) this.opts.onSolid(this.level);
    if (this.opts.onSolve) this.opts.onSolve(this.level);
  }
}
