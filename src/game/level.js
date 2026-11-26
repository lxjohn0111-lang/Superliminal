// Level runtime + builder API used by the chapter definitions.
import * as THREE from 'three';
import { Physics, R, G_STATIC, G_BARRIER, G_PROPBLOCK } from '../engine/physics.js';
import { StaticBatch, worldBox, mesh, roundedBox } from '../engine/geometry.js';
import { mat, emissiveMat, colorMat, glassMat } from '../engine/materials.js';
import { textTexture, makeCanvasTexture } from '../engine/textures.js';
import { PropSystem } from './props.js';
import { Illusion } from './illusion.js';
import { Decor } from './decor.js';

const _v = new THREE.Vector3(), _q = new THREE.Quaternion();
const YAXIS = new THREE.Vector3(0, 1, 0);
const qY = (a) => new THREE.Quaternion().setFromAxisAngle(YAXIS, a);

export class Level {
  constructor(game, def, index) {
    this.game = game;
    this.def = def;
    this.index = index;
    this.root = new THREE.Group();
    this.root.name = 'level:' + def.id;
    this.physics = new Physics();
    this.batch = new StaticBatch();
    this.props = new PropSystem(game, this);
    this.decor = new Decor(this);
    this.plates = []; this.doors = []; this.triggers = []; this.cranes = []; this.illusions = [];
    this.sensors = []; this.doorWalls = []; this.updaters = []; this.lights = []; this.animated = [];
    this.flags = {};
    this.stage = 0;
    this.stageTime = 0;
    this.killY = -30;
    this.waters = [];
    this.spawnPos = [0, 0, 0]; this.spawnYaw = 0;
    this.respawnPos = null; this.respawnYaw = 0;
    this.probePos = new THREE.Vector3(0, 1.6, 0);
    this.envIntensity = 0.55;
    this.completed = false;
    this.time = 0;
    this.craneIdx = 0;
  }

  // ================================================================= geometry
  box(min, max, material, { collide = true, cast = true, receive = true, sound = null, visible = true, uvOff, group = G_STATIC } = {}) {
    const m = typeof material === 'string' ? mat(material) : material;
    if (m.userData.noShadow) cast = false;
    const w = max[0] - min[0], h = max[1] - min[1], d = max[2] - min[2];
    const cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2, cz = (min[2] + max[2]) / 2;
    if (visible) this.batch.add(worldBox(cx, cy, cz, w, h, d, 0, m.userData.tile || 1, uvOff), m, { cast, receive });
    let col = null;
    if (collide) col = this.physics.addStaticBox(cx, cy, cz, w / 2, h / 2, d / 2, null, { kind: 'static', sound: sound || m.userData.sound }, group);
    return col;
  }

  // Box rotated around Y. center = [x,y,z], size = [w,h,d]
  boxR(center, size, rotY, material, { collide = true, cast = true, receive = true } = {}) {
    const m = typeof material === 'string' ? mat(material) : material;
    this.batch.add(worldBox(center[0], center[1], center[2], size[0], size[1], size[2], rotY, m.userData.tile || 1), m, { cast, receive });
    if (collide) {
      const q = qY(rotY);
      this.physics.addStaticBox(center[0], center[1], center[2], size[0] / 2, size[1] / 2, size[2] / 2, { x: q.x, y: q.y, z: q.z, w: q.w }, { kind: 'static', sound: m.userData.sound });
    }
  }

  barrier(min, max) { // invisible wall for the player only
    const cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2, cz = (min[2] + max[2]) / 2;
    this.physics.addStaticBox(cx, cy, cz, (max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2, null, { kind: 'static' }, G_BARRIER);
  }
  propBlock(min, max) { // invisible wall that only stops objects
    const cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2, cz = (min[2] + max[2]) / 2;
    this.physics.addStaticBox(cx, cy, cz, (max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2, null, { kind: 'static' }, G_PROPBLOCK);
  }

  add(obj, { collide = null } = {}) { this.root.add(obj); return obj; }

  // Immediate (non-batched) static box: used for geometry that appears at runtime.
  solidBox(min, max, material, { collide = true } = {}) {
    const m = typeof material === 'string' ? mat(material) : material;
    const w = max[0] - min[0], h = max[1] - min[1], d = max[2] - min[2];
    const cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2, cz = (min[2] + max[2]) / 2;
    const msh = new THREE.Mesh(worldBox(cx, cy, cz, w, h, d, 0, m.userData.tile || 1), m);
    msh.castShadow = true; msh.receiveShadow = true;
    this.root.add(msh);
    const col = collide ? this.physics.addStaticBox(cx, cy, cz, w / 2, h / 2, d / 2, null, { kind: 'static', sound: m.userData.sound }) : null;
    return { mesh: msh, col };
  }

  // Wall along X (constant z) from x0..x1, with openings [{at, w, h, y}] measured along x.
  wallZ(z, x0, x1, y0, y1, material, openings = [], t = 0.2, side = 1, trim = null) {
    this._wall('z', z, x0, x1, y0, y1, material, openings, t, side, trim);
  }
  // Wall along Z (constant x).
  wallX(x, z0, z1, y0, y1, material, openings = [], t = 0.2, side = 1, trim = null) {
    this._wall('x', x, z0, z1, y0, y1, material, openings, t, side, trim);
  }
  _wall(axis, c, a0, a1, y0, y1, material, openings, t, side, trim) {
    // side: +1 => wall body extends toward +axis from c; -1 => toward -axis.
    const c0 = side > 0 ? c : c - t, c1 = side > 0 ? c + t : c;
    const seg = (s0, s1, yy0, yy1) => {
      if (s1 - s0 < 1e-3 || yy1 - yy0 < 1e-3) return;
      if (axis === 'z') this.box([s0, yy0, c0], [s1, yy1, c1], material);
      else this.box([c0, yy0, s0], [c1, yy1, s1], material);
    };
    const ops = openings.map((o) => ({ a: o.at - o.w / 2, b: o.at + o.w / 2, y: y0 + (o.y || 0), h: o.h || 2.3 })).sort((p, q) => p.a - q.a);
    let cur = a0;
    for (const o of ops) {
      seg(cur, o.a, y0, y1);
      seg(o.a, o.b, o.y + o.h, y1);
      if (o.y > y0) seg(o.a, o.b, y0, o.y);
      if (trim !== false) this.casing(axis, c0, c1, o, trim || 'trim');
      cur = o.b;
    }
    seg(cur, a1, y0, y1);
  }

  // Door casing trim around an opening (both faces).
  casing(axis, c0, c1, o, trimMat) {
    const w = 0.07, p = 0.02, m = trimMat;
    const pieces = [[o.a - w, o.a, o.y, o.y + o.h + w], [o.b, o.b + w, o.y, o.y + o.h + w], [o.a - w, o.b + w, o.y + o.h, o.y + o.h + w]];
    for (const [s0, s1, yy0, yy1] of pieces) {
      if (axis === 'z') this.box([s0, yy0, c0 - p], [s1, yy1, c1 + p], m, { collide: false });
      else this.box([c0 - p, yy0, s0], [c1 + p, yy1, s1], m, { collide: false });
    }
  }

  // A rectangular room: interior bounds x0..x1, z0..z1, floor at y0, height h.
  // openings: { n:[], s:[], e:[], w:[] } — n is the -z wall, s the +z wall, w the -x wall, e the +x wall.
  room({ x0, x1, z0, z1, y0 = 0, h = 3, t = 0.25, floor = 'carpet', wall = 'plaster', ceil = 'ceiling', openings = {}, noCeil = false, noFloor = false, base = 'trim', walls = { n: true, s: true, e: true, w: true }, wallMats = {}, trimMat = null, crown = false }) {
    if (!noFloor) this.box([x0 - t, y0 - 0.3, z0 - t], [x1 + t, y0, z1 + t], floor);
    if (!noCeil) this.box([x0 - t, y0 + h, z0 - t], [x1 + t, y0 + h + 0.3, z1 + t], ceil, { cast: false });
    const W = (k) => wallMats[k] || wall;
    if (walls.n) this.wallZ(z0, x0 - t, x1 + t, y0, y0 + h, W('n'), openings.n || [], t, -1, trimMat);
    if (walls.s) this.wallZ(z1, x0 - t, x1 + t, y0, y0 + h, W('s'), openings.s || [], t, 1, trimMat);
    if (walls.w) this.wallX(x0, z0, z1, y0, y0 + h, W('w'), openings.w || [], t, -1, trimMat);
    if (walls.e) this.wallX(x1, z0, z1, y0, y0 + h, W('e'), openings.e || [], t, 1, trimMat);
    if (base) {
      const bh = 0.11, bt = 0.018;
      const run = (axis, c, a0, a1, ops, dir) => {
        const list = (ops || []).filter((o) => !(o.y > 0.05)).map((o) => [o.at - o.w / 2 - 0.07, o.at + o.w / 2 + 0.07]).sort((p, q) => p[0] - q[0]);
        let cur = a0;
        const piece = (s0, s1) => { if (s1 - s0 < 0.02) return; if (axis === 'z') this.box([s0, y0, dir > 0 ? c - bt : c], [s1, y0 + bh, dir > 0 ? c : c + bt], base, { collide: false }); else this.box([dir > 0 ? c - bt : c, y0, s0], [dir > 0 ? c : c + bt, y0 + bh, s1], base, { collide: false }); };
        for (const [a, b] of list) { piece(cur, Math.min(a, a1)); cur = Math.max(cur, b); }
        piece(cur, a1);
      };
      if (walls.n) run('z', z0, x0, x1, openings.n, -1);
      if (walls.s) run('z', z1, x0, x1, openings.s, 1);
      if (walls.w) run('x', x0, z0, z1, openings.w, -1);
      if (walls.e) run('x', x1, z0, z1, openings.e, 1);
    }
    if (crown && !noCeil) {
      const ch = 0.08, ct = 0.05, yy = y0 + h;
      if (walls.n) this.box([x0, yy - ch, z0], [x1, yy, z0 + ct], 'trim', { collide: false });
      if (walls.s) this.box([x0, yy - ch, z1 - ct], [x1, yy, z1], 'trim', { collide: false });
      if (walls.w) this.box([x0, yy - ch, z0], [x0 + ct, yy, z1], 'trim', { collide: false });
      if (walls.e) this.box([x1 - ct, yy - ch, z0], [x1, yy, z1], 'trim', { collide: false });
    }
  }

  // ================================================================= lights
  ambient(sky = 0xdfe8ff, ground = 0x8a7f70, intensity = 0.25) {
    const h = new THREE.HemisphereLight(sky, ground, intensity * 0.45);
    this.root.add(h); this.lights.push(h);
    return h;
  }

  // Ceiling light fixture (emissive panel) + area light for soft illumination.
  panel(x, y, z, w = 1.2, d = 0.6, { color = 0xfff4e6, intensity = 14, area = true, emissive = 4.5 } = {}) {
    this.box([x - w / 2 - 0.03, y - 0.03, z - d / 2 - 0.03], [x + w / 2 + 0.03, y, z + d / 2 + 0.03], 'whitePlastic', { collide: false, cast: false });
    this.box([x - w / 2, y - 0.035, z - d / 2], [x + w / 2, y - 0.03, z + d / 2], emissiveMat(color, emissive), { collide: false, cast: false });
    if (area) {
      const l = new THREE.RectAreaLight(color, intensity, w, d);
      l.position.set(x, y - 0.04, z); l.lookAt(x, y - 5, z);
      this.root.add(l); this.lights.push(l);
    }
  }

  spot(pos, target, { color = 0xfff1df, intensity = 30, angle = 1.0, penumbra = 0.9, distance = 0, decay = 2, shadow = true, bias = -0.0004, radius = 4, maxShadow = 2048, near = 0.3 } = {}) {
    const l = new THREE.SpotLight(color, intensity * 2.2, distance, Math.min(angle, 1.05), penumbra, decay);
    l.position.set(...pos); l.target.position.set(...target);
    l.castShadow = shadow;
    if (shadow) {
      l.shadow.mapSize.set(1024, 1024); l.shadow.bias = bias; l.shadow.normalBias = 0.02; l.shadow.radius = radius;
      l.shadow.camera.near = near; l.shadow.camera.far = 60; l.userData.maxShadow = maxShadow;
    }
    this.root.add(l, l.target); this.lights.push(l);
    return l;
  }

  point(pos, { color = 0xffe2bd, intensity = 6, distance = 0, decay = 2, shadow = false } = {}) {
    const l = new THREE.PointLight(color, intensity, distance, decay);
    l.position.set(...pos); l.castShadow = shadow;
    if (shadow) { l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.002; l.shadow.radius = 3; l.userData.maxShadow = 1024; }
    this.root.add(l); this.lights.push(l);
    return l;
  }

  sun(dir, { color = 0xfff2dc, intensity = 2.5, size = 30, shadow = true, center = [0, 0, 0] } = {}) {
    const l = new THREE.DirectionalLight(color, intensity);
    const d = new THREE.Vector3(...dir).normalize();
    l.position.set(center[0] - d.x * 40, center[1] - d.y * 40, center[2] - d.z * 40);
    l.target.position.set(...center);
    l.castShadow = shadow;
    if (shadow) {
      const c = l.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 1; c.far = 120;
      l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0005; l.shadow.normalBias = 0.03; l.shadow.radius = 3; l.userData.maxShadow = 4096;
    }
    this.root.add(l, l.target); this.lights.push(l);
    return l;
  }

  // ================================================================= props & mechanics
  prop(type, pos, opts = {}) { return this.props.spawn(type, { pos, ...opts }); }

  plate(id, { x, z, y = 0, need = 100, size = 1.3, label = null, accepts = null, onChange = null }) {
    const L = this;
    const base = 0.07;
    // Visuals
    const g = new THREE.Group(); g.position.set(x, y, z); this.root.add(g);
    g.add(mesh(roundedBox(size + 0.3, base, size + 0.3, 0.02), mat('metalDark'), { pos: [0, base / 2, 0] }));
    const topMat = new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.35, metalness: 0.2 });
    const top = mesh(roundedBox(size, 0.04, size, 0.015), topMat, { pos: [0, base + 0.01, 0] });
    g.add(top);
    const segs = [];
    const N = 16;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x6fc8ff, emissiveIntensity: 0.05, roughness: 0.4 });
      const r = size / 2 + 0.08;
      const sx = Math.cos(a) * r, sz = Math.sin(a) * r;
      const seg = mesh(new THREE.BoxGeometry(0.12, 0.012, 0.04), m, { pos: [sx, base + 0.004, sz] });
      seg.rotation.y = -a + Math.PI / 2;
      // clamp onto square border
      const k = (size / 2 + 0.08) / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) / r;
      seg.position.set(sx * k * 0.98, base + 0.004, sz * k * 0.98);
      seg.rotation.y = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? Math.PI / 2 : 0;
      g.add(seg); segs.push(m);
    }
    // Readout post
    const txt = label || `${need} kg`;
    const tex = textTexture(txt, { w: 512, h: 256, bg: '#0c1016', color: '#9fd3ff', font: '600 110px Inter, Arial', sub: 'REQUIRED WEIGHT', subFont: '600 28px Inter, Arial', subColor: '#5d7b93' });
    const screenM = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.3 });
    const post = new THREE.Group(); post.position.set(size / 2 + 0.35, 0, -size / 2 - 0.1); g.add(post);
    post.add(mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.9, 12), mat('metalDark'), { pos: [0, 0.45, 0] }));
    post.add(mesh(roundedBox(0.44, 0.24, 0.05, 0.01), mat('blackPlastic'), { pos: [0, 0.98, 0], rot: [-0.25, -0.5, 0] }));
    post.add(mesh(new THREE.PlaneGeometry(0.4, 0.2), screenM, { pos: [0.013, 0.985, 0.023], rot: [-0.25, -0.5, 0] }));
    // Physics: solid top + weight sensor above it.
    this.physics.addStaticBox(x, y + base / 2 + 0.01, z, (size + 0.3) / 2, base / 2 + 0.01, (size + 0.3) / 2, null, { kind: 'static', sound: 'metal' });
    this.physics.addStaticBox(x + size / 2 + 0.35, y + 0.5, z - size / 2 - 0.1, 0.05, 0.5, 0.05, null, { kind: 'static', sound: 'metal' });
    const sensor = this.physics.addSensorBox(x, y + base + 0.2, z, size / 2, 0.18, size / 2, null, { kind: 'sensor' });
    const p = { id, x, z, y, need, sensor, segs, top, topMat, active: false, weight: 0, fill: 0, accepts, onChange, lastTick: 0, group: g };
    p.update = (dt) => {
      let w = 0;
      const seen = new Set();
      L.physics.world.intersectionPairsWith(sensor, (other) => {
        const info = L.physics.info.get(other.handle);
        if (info && info.kind === 'prop' && !info.prop.held && !seen.has(info.prop)) {
          if (p.accepts && !p.accepts.includes(info.prop.type)) return;
          seen.add(info.prop); w += info.prop.body.mass();
        }
      });
      p.weight = w;
      const target = Math.min(1, w / need);
      p.fill += (target - p.fill) * Math.min(1, dt * 6);
      const lit = Math.round(p.fill * N);
      segs.forEach((m, i) => { m.emissiveIntensity = i < lit ? (p.active ? 4 : 2.2) : 0.05; m.emissive.setHex(p.active ? 0x7dffb2 : 0x6fc8ff); });
      const on = w >= need;
      if (on !== p.active) {
        p.active = on;
        if (on) L.game.audio.plateOn(); else L.game.audio.plateOff();
        topMat.color.setHex(on ? 0xc8ffe0 : 0xe9ecef);
        topMat.emissive = new THREE.Color(on ? 0x2a8f5a : 0x000000); topMat.emissiveIntensity = on ? 0.6 : 0;
        if (p.onChange) p.onChange(on, L);
        L.onPlateChange && L.onPlateChange(p);
      }
      top.position.y = base + 0.01 - (w > 0 ? 0.018 : 0);
    };
    this.plates.push(p);
    return p;
  }

  plateOn(id) { const p = this.plates.find((q) => q.id === id); return !!(p && p.active); }

  // Doors: slide (two leaves into the wall), lift (rises), swing-free (fades) — open when cond() is true.
  door(id, { x, z, y = 0, rotY = 0, w = 1.4, h = 2.3, style = 'slide', cond = null, plates = null, sticky = false, frameMat = 'metalDark', leafMat = null, light = true }) {
    const L = this;
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; this.root.add(g);
    const leaves = [];
    const lm = leafMat ? (typeof leafMat === 'string' ? mat(leafMat) : leafMat) : new THREE.MeshPhysicalMaterial({ color: 0xdde6ee, roughness: 0.25, metalness: 0.1, transmission: 0, transparent: true, opacity: 0.92 });
    const thick = 0.08;
    const mk = (lw, offX) => {
      const leaf = new THREE.Group();
      leaf.add(mesh(roundedBox(lw, h, thick, 0.012), lm));
      leaf.add(mesh(new THREE.BoxGeometry(lw - 0.02, 0.08, thick + 0.01), mat(frameMat), { pos: [0, -h / 2 + 0.06, 0] }));
      leaf.add(mesh(new THREE.BoxGeometry(lw - 0.02, 0.04, thick + 0.01), mat(frameMat), { pos: [0, h / 2 - 0.03, 0] }));
      leaf.add(mesh(new THREE.BoxGeometry(0.03, h - 0.2, thick + 0.012), mat(frameMat), { pos: [offX > 0 ? -lw / 2 + 0.02 : lw / 2 - 0.02, 0, 0] }));
      leaf.position.set(offX, h / 2, 0);
      g.add(leaf);
      const body = L.physics.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
      const col = L.physics.world.createCollider(R.ColliderDesc.cuboid(lw / 2, h / 2, thick / 2 + 0.02).setCollisionGroups(G_STATIC), body);
      L.physics.info.set(col.handle, { kind: 'static', sound: 'metal' });
      leaves.push({ leaf, body, closedX: offX, lw });
    };
    if (style === 'slide') { mk(w / 2, -w / 4); mk(w / 2, w / 4); }
    else mk(w, 0);
    // Status light
    let statusMat = null;
    if (light) {
      statusMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff4a3a, emissiveIntensity: 3 });
      g.add(mesh(roundedBox(0.3, 0.06, 0.04, 0.01), statusMat, { pos: [0, h + 0.18, 0.12] }));
      g.add(mesh(roundedBox(0.3, 0.06, 0.04, 0.01), statusMat, { pos: [0, h + 0.18, -0.12] }));
    }
    const d = { id, g, leaves, open: false, t: 0, style, cond, plates, sticky, statusMat, h, w, rotY, x, y, z, forced: null };
    d.isOpen = () => d.open;
    d.update = (dt) => {
      let want = d.forced !== null ? d.forced : (d.cond ? d.cond(L) : (d.plates ? d.plates.every((pid) => L.plateOn(pid)) : false));
      if (d.sticky && d.open) want = true;
      if (want !== d.open) {
        d.open = want;
        L.game.audio.door(want);
        if (statusMat) statusMat.emissive.setHex(want ? 0x4dff9a : 0xff4a3a);
        if (want && L.onDoorOpen) L.onDoorOpen(d);
      }
      d.t += ((d.open ? 1 : 0) - d.t) * Math.min(1, dt * 2.2);
      const e = d.t * d.t * (3 - 2 * d.t);
      const c = Math.cos(rotY), s = Math.sin(rotY);
      for (const lf of leaves) {
        if (style === 'slide') lf.leaf.position.x = lf.closedX + Math.sign(lf.closedX) * e * (lf.lw - 0.06);
        else if (style === 'lift') lf.leaf.position.y = h / 2 + e * (h - 0.1);
        const lp = lf.leaf.position;
        const wx = x + lp.x * c + lp.z * s, wz = z - lp.x * s + lp.z * c;
        lf.body.setNextKinematicTranslation({ x: wx, y: y + lp.y, z: wz });
        const q = qY(rotY); lf.body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      }
    };
    // Initialize body positions immediately.
    for (const lf of leaves) { const c = Math.cos(rotY), s = Math.sin(rotY); const lp = lf.leaf.position; const q = qY(rotY); lf.body.setTranslation({ x: x + lp.x * c, y: y + lp.y, z: z - lp.x * s }, true); lf.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true); }
    this.doors.push(d);
    return d;
  }

  doorById(id) { return this.doors.find((d) => d.id === id); }

  // The exit: a short glowing corridor. Walking into the light completes the chapter.
  // (x,z) = centre of the doorway in the wall; dir = direction the corridor extends ('n','s','e','w').
  exit(x, z, dir = 'n', { y = 0, wallMat = 'paintWhite', w = 1.5, h = 2.4, len = 4.5, sign = true } = {}) {
    const dv = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[dir];
    const t = 0.15;
    const along = (d) => [x + dv[0] * d, z + dv[1] * d];
    // corridor walls
    if (dv[0] === 0) {
      const za = z, zb = z + dv[1] * len, z0 = Math.min(za, zb), z1 = Math.max(za, zb);
      this.box([x - w / 2 - t, y, z0], [x - w / 2, y + h, z1], wallMat);
      this.box([x + w / 2, y, z0], [x + w / 2 + t, y + h, z1], wallMat);
      this.box([x - w / 2 - t, y + h, z0], [x + w / 2 + t, y + h + t, z1], wallMat);
      this.box([x - w / 2 - t, y - 0.3, z0], [x + w / 2 + t, y, z1], 'tilesBig');
      const ze = zb + dv[1] * 0.05;
      this.box([x - w / 2, y, Math.min(zb, ze)], [x + w / 2, y + h, Math.max(zb, ze)], emissiveMat(0xffffff, 9), { cast: false });
    } else {
      const xa = x, xb = x + dv[0] * len, x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
      this.box([x0, y, z - w / 2 - t], [x1, y + h, z - w / 2], wallMat);
      this.box([x0, y, z + w / 2], [x1, y + h, z + w / 2 + t], wallMat);
      this.box([x0, y + h, z - w / 2 - t], [x1, y + h + t, z + w / 2 + t], wallMat);
      this.box([x0, y - 0.3, z - w / 2 - t], [x1, y, z + w / 2 + t], 'tilesBig');
      const xe = xb + dv[0] * 0.05;
      this.box([Math.min(xb, xe), y, z - w / 2], [Math.max(xb, xe), y + h, z + w / 2], emissiveMat(0xffffff, 9), { cast: false });
    }
    const [lx, lz] = along(len - 0.6);
    this.point([lx, y + h * 0.6, lz], { color: 0xfff6ea, intensity: 14, distance: 9 });
    if (sign) {
      const tex = textTexture('EXIT', { w: 512, h: 200, bg: '#0b3d24', color: '#7dffb0', font: '700 140px Inter, Arial' });
      const sm = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 2.4, roughness: 0.4 });
      const s = mesh(new THREE.BoxGeometry(0.62, 0.24, 0.06), [mat('whitePlastic'), mat('whitePlastic'), mat('whitePlastic'), mat('whitePlastic'), sm, sm], { cast: false });
      s.position.set(x - dv[0] * 0.08, y + h + 0.28, z - dv[1] * 0.08);
      s.rotation.y = Math.atan2(dv[0], dv[1]);
      this.root.add(s);
    }
    const [ex, ez] = along(len - 1.4);
    const half = [dv[0] === 0 ? w / 2 : 0.7, 1.5, dv[0] === 0 ? 0.7 : w / 2];
    this.exitPoint = { x: ex, z: ez, y };
    this.trigger([ex - half[0], y - 0.5, ez - half[2]], [ex + half[0], y + 2.5, ez + half[2]], () => this.game.completeLevel(), { once: true });
    this.exitGlow = { x: along(len)[0], z: along(len)[1], y: y + 1.2 };
  }

  trigger(min, max, fn, { once = true, exit = null } = {}) {
    const t = { box: new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max)), fn, once, done: false, inside: false, exit };
    this.triggers.push(t);
    return t;
  }

  checkpoint(min, max, pos, yaw) {
    this.trigger(min, max, () => { this.respawnPos = pos; this.respawnYaw = yaw; }, { once: true });
  }

  say(lines, opts) { this.game.narrator.say(lines, opts); }

  spawn(pos, yaw) { this.spawnPos = pos; this.spawnYaw = yaw; }

  crane(pos, rotY = 0) {
    const id = this.def.id + ':' + (this.craneIdx++);
    const got = this.game.save.cranes[id];
    const g = this.decor.paperCrane();
    g.position.set(...pos); g.rotation.y = rotY;
    this.root.add(g);
    const c = { id, g, pos: new THREE.Vector3(...pos), got: !!got, t: Math.random() * 6, baseY: pos[1] };
    if (got) { g.traverse((m) => { if (m.material) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.18; m.material.emissiveIntensity = 0.2; } }); }
    this.cranes.push(c);
    return c;
  }

  illusion(opts) {
    const il = new Illusion(this, opts);
    this.illusions.push(il);
    return il;
  }

  // Illusion of a grabbable prop that becomes real when seen from `view`.
  propIllusion(type, target, view, { seed = 3, bounds, marker = false, onSolve, variant = 0, chunks = 18, floorY, nearBias, tolerance } = {}) {
    const L = this;
    return this.illusion({
      view, seed, bounds, marker, chunks, floorY, nearBias, tolerance,
      source: () => {
        const g = L.decor.propPreview(type, variant);
        g.position.set(...target.pos); g.rotation.y = target.rotY || 0; g.scale.setScalar(target.scale || 1);
        return g;
      },
      onSolid: () => { const p = L.prop(type, target.pos, { scale: target.scale || 1, rotY: target.rotY || 0, variant }); if (onSolve) onSolve(L, p); },
    });
  }

  // Light-activated sensor (glowing flower bud): opens when a lantern shines on it.
  lightSensor(id, { x, y, z, need = 1.0, onChange = null }) {
    const L = this;
    const g = this.decor.lightFlower(); g.position.set(x, y, z); this.root.add(g);
    this.physics.addStaticBox(x, y + 0.35, z, 0.18, 0.35, 0.18, null, { kind: 'static', sound: 'stone' });
    const s = { id, x, y: y + 0.75, z, need, level: 0, active: false, g, onChange, charge: 0 };
    s.update = (dt) => {
      let I = 0;
      for (const p of L.props.props) {
        if (!p.def.glow || !p.light) continue;
        const c = L.props.centerOf(p, _v);
        const d2 = Math.max(0.3, c.distanceToSquared(new THREE.Vector3(s.x, s.y, s.z)));
        const dir = new THREE.Vector3(s.x - c.x, s.y - c.y, s.z - c.z); const dl = dir.length(); dir.divideScalar(dl);
        const r0 = p.sizeLocal.y * p.scale * 0.55;
        // Light reaches the flower unless something blocks it well before the bloom (hits right at the flower's base count).
        const hit = L.physics.castRay({ x: c.x + dir.x * r0, y: c.y + dir.y * r0, z: c.z + dir.z * r0 }, { x: dir.x, y: dir.y, z: dir.z }, Math.max(0, dl - r0 - 0.7), undefined, p.body);
        if (hit) continue;
        I += (p.scale * p.scale) * 2.0 / d2;
      }
      s.level = I;
      const want = I >= need;
      s.charge += ((want ? 1 : 0) - s.charge) * Math.min(1, dt * 3);
      g.userData.setOpen && g.userData.setOpen(Math.min(1, I / need), s.charge);
      if (want !== s.active && (want ? s.charge > 0.6 : s.charge < 0.4)) {
        s.active = want;
        if (want) L.game.audio.plateOn(); else L.game.audio.plateOff();
        if (s.onChange) s.onChange(want, L);
      }
    };
    this.sensors.push(s);
    return s;
  }
  sensorOn(id) { const s = this.sensors.find((q) => q.id === id); return !!(s && s.active); }

  // A wall that accepts a large enough toy door: placing one flat against it carves a real doorway.
  doorWall(id, { axis = 'z', at, a0, a1, y0 = 0, y1 = 3, t = 0.3, material = 'wallpaper', onOpen = null, minH = 1.9 }) {
    const L = this;
    const dw = { id, axis, at, a0, a1, y0, y1, t, material, onOpen, minH, open: false, meshes: [], cols: [] };
    dw.build = (op) => {
      for (const m of dw.meshes) { m.removeFromParent(); m.geometry.dispose(); }
      for (const c of dw.cols) L.physics.removeCollider(c);
      dw.meshes = []; dw.cols = [];
      const mm = mat(material);
      const segs = [];
      if (!op) segs.push([a0, a1, y0, y1]);
      else { segs.push([a0, op.a, y0, y1], [op.b, a1, y0, y1], [op.a, op.b, op.top, y1]); }
      for (const [s0, s1, yy0, yy1] of segs) {
        if (s1 - s0 < 0.01 || yy1 - yy0 < 0.01) continue;
        const w = s1 - s0, h = yy1 - yy0, cx = (s0 + s1) / 2, cy = (yy0 + yy1) / 2;
        const geo = axis === 'z' ? worldBox(cx, cy, at, w, h, t, 0, mm.userData.tile) : worldBox(at, cy, cx, t, h, w, 0, mm.userData.tile);
        const m = new THREE.Mesh(geo, mm); m.castShadow = true; m.receiveShadow = true; L.root.add(m); dw.meshes.push(m);
        dw.cols.push(axis === 'z' ? L.physics.addStaticBox(cx, cy, at, w / 2, h / 2, t / 2, null, { kind: 'static', sound: 'hard', doorWall: dw }) : L.physics.addStaticBox(at, cy, cx, t / 2, h / 2, w / 2, null, { kind: 'static', sound: 'hard', doorWall: dw }));
      }
    };
    dw.build(null);
    this.doorWalls.push(dw);
    return dw;
  }

  water({ x0, x1, z0, z1, y }) {
    const m = this.decor.waterSurface(x1 - x0, z1 - z0);
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    this.root.add(m);
    const w = { x0, x1, z0, z1, y, mesh: m };
    this.waters.push(w);
    return m;
  }
  waterAt(x, z) { for (const w of this.waters) if (x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1) return w; return null; }

  probe(x, y, z) { this.probePos.set(x, y, z); }

  // ================================================================= runtime
  finalize() {
    this.batch.build(this.root);
    this.root.updateMatrixWorld(true);
  }

  fixedUpdate(dt) {
    this.time += dt;
    this.stageTime += dt;
    for (const p of this.plates) p.update(dt);
    for (const s of this.sensors) s.update(dt);
    for (const d of this.doors) d.update(dt);
    for (const dw of this.doorWalls) if (!dw.open) this.checkDoorWall(dw);
    const pl = this.game.player;
    const feet = pl.feet, head = new THREE.Vector3(feet.x, feet.y + 1.6, feet.z);
    const mid = new THREE.Vector3(feet.x, feet.y + 0.9, feet.z);
    for (const t of this.triggers) {
      if (t.done) continue;
      const inside = t.box.containsPoint(mid) || t.box.containsPoint(feet) || t.box.containsPoint(head);
      if (inside && !t.inside) { t.fn(this); if (t.once) t.done = true; }
      if (!inside && t.inside && t.exit) t.exit(this);
      t.inside = inside;
    }
    if (this.def.update) this.def.update(this, dt);
    for (const u of this.updaters) u(dt);
  }

  frameUpdate(dt, camera) {
    for (const il of this.illusions) il.update(dt, camera);
    for (const a of this.animated) a(dt, this.time);
    const eye = camera.position;
    for (const c of this.cranes) {
      c.t += dt;
      c.g.position.y = c.baseY + Math.sin(c.t * 1.6) * 0.06;
      c.g.rotation.y += dt * 0.6;
      if (!c.got && eye.distanceTo(c.g.position) < 1.25) this.collectCrane(c);
    }
    for (const w of this.waters) w.mesh.material.uniforms.uTime.value = this.time;
    for (const m of this.causticMats || []) if (m.userData.shader) m.userData.shader.uniforms.uTime.value = this.time;
    if (this.exitGlow) {
      const d = Math.hypot(eye.x - this.exitGlow.x, eye.z - this.exitGlow.z);
      this.game.setExitGlow(Math.max(0, 1 - d / 4.5));
    }
  }

  collectCrane(c) {
    c.got = true;
    this.game.collectCrane(c.id);
    const g = c.g;
    const start = performance.now();
    const anim = () => {
      const k = (performance.now() - start) / 700;
      g.scale.setScalar(Math.max(0.001, 1 + k * 0.8));
      g.position.y += 0.02;
      g.traverse((m) => { if (m.material) { m.material.transparent = true; m.material.opacity = Math.max(0, 1 - k); } });
      if (k < 1) requestAnimationFrame(anim); else g.visible = false;
    };
    g.traverse((m) => { if (m.material) m.material = m.material.clone(); });
    anim();
  }

  checkDoorWall(dw) {
    for (const p of this.props.props) {
      if (!p.def.doorProp || p.held || p.frozen) continue;
      const lv = p.body.linvel();
      if (Math.hypot(lv.x, lv.y, lv.z) > 0.15) { p.restT = 0; continue; }
      p.restT = (p.restT || 0) + 1 / 60;
      if (p.restT < 0.35) continue;
      if (this.tryInstallDoor(dw, p, false)) return;
    }
  }

  // Can this toy door become a real doorway in this wall? `immediate` = just released (ignore height off floor).
  tryInstallDoor(dw, p, immediate) {
    const q = p.group.quaternion;
    const up = _v.set(0, 1, 0).applyQuaternion(q);
    if (up.y < (immediate ? 0.9 : 0.97)) return false;
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const s = immediate ? (this.game.grab.s || p.scale) : p.scale;
    const H = p.sizeLocal.y * s, W = p.sizeLocal.x * s, D = p.sizeLocal.z * s;
    const pos = p.group.position;
    let along, dist, faceAligned;
    if (dw.axis === 'z') { along = pos.x; dist = Math.abs(pos.z - dw.at) - dw.t / 2 - D / 2; faceAligned = Math.abs(fwd.z) > 0.92; }
    else { along = pos.z; dist = Math.abs(pos.x - dw.at) - dw.t / 2 - D / 2; faceAligned = Math.abs(fwd.x) > 0.92; }
    if (!faceAligned || dist > (immediate ? 0.4 : 0.25)) return false;
    if (H < dw.minH) { if (!p.toldSmall) { p.toldSmall = true; this.game.toastHint('Almost. The door needs to be tall enough to walk through.'); } return false; }
    if (H > dw.y1 - dw.y0 - 0.03) { if (!p.toldBig) { p.toldBig = true; this.game.toastHint('Too tall for this wall. Try a slightly smaller door.'); } return false; }
    if (along - W / 2 < dw.a0 + 0.05 || along + W / 2 > dw.a1 - 0.05) return false;
    if (!immediate && pos.y > dw.y0 + 0.3) return false;
    if (immediate) { p.group.position.y = dw.y0; p.scale = s; }
    this.openDoorWall(dw, p, along, W, H);
    return true;
  }

  openDoorWall(dw, p, along, W, H) {
    dw.open = true;
    const props = this.props;
    // Snap the door into the wall plane.
    const pos = p.group.position.clone();
    const sideSign = dw.axis === 'z' ? Math.sign(pos.z - dw.at) : Math.sign(pos.x - dw.at);
    if (dw.axis === 'z') pos.z = dw.at; else pos.x = dw.at;
    const yaw = dw.axis === 'z' ? (sideSign > 0 ? 0 : Math.PI) : (sideSign > 0 ? Math.PI / 2 : -Math.PI / 2);
    const quat = qY(yaw);
    p.grabbable = false;
    props.setHeld(p, true); // kinematic, no collisions
    p.group.position.copy(pos); p.group.quaternion.copy(quat);
    const inner = 0.9 * W;
    dw.build({ a: along - inner / 2, b: along + inner / 2, top: dw.y0 + H * 0.98 });
    this.game.audio.illusionSnap();
    this.game.flash();
    const hinge = p.hinge;
    let t = 0;
    this.animated.push((dt) => { if (!hinge || t >= 1) return; t = Math.min(1, t + dt * 0.7); const e = t * t * (3 - 2 * t); hinge.rotation.y = -e * 1.7 * sideSign; });
    // Remove the toy door's own colliders so the player can walk through.
    for (const c of p.colliders) this.physics.removeCollider(c);
    p.colliders = [];
    p.frozen = true; p.curPos.copy(pos); p.curQuat.copy(quat);
    p.held = false;
    if (dw.onOpen) dw.onOpen(this);
    this.game.achievements.unlock('door_maker');
  }

  onGrab(p) { if (this.def.onGrab) this.def.onGrab(this, p); }
  onRelease(p) {
    if (p.def.doorProp) for (const dw of this.doorWalls) if (!dw.open && this.tryInstallDoor(dw, p, true)) break;
    if (this.def.onRelease) this.def.onRelease(this, p);
  }
  onPropReset(p) { if (this.def.onPropReset) this.def.onPropReset(this, p); }
  onPlateChange(p) { if (this.def.onPlateChange) this.def.onPlateChange(this, p); }
  onDoorOpen(d) { if (this.def.onDoorOpen) this.def.onDoorOpen(this, d); }

  setStage(n) { if (n > this.stage) { this.stage = n; this.stageTime = 0; this.game.onStage && this.game.onStage(n); } }

  hint() {
    const hints = this.def.hints || [];
    const h = hints[Math.min(this.stage, hints.length - 1)] || 'Look around. Everything is exactly as big as it looks.';
    for (const il of this.illusions) if (!il.solved) il.revealMarker();
    return h;
  }

  dispose(scene) {
    this.root.removeFromParent();
    this.root.traverse((o) => {
      if (o.isMesh && o.geometry && !o.userData.sharedGeo) o.geometry.dispose();
      if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose();
    });
    this.physics.dispose();
  }
}
