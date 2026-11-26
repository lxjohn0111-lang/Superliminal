// Geometry helpers: world-space UV boxes, static batching, lathe profiles.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);

// Box with UVs projected from world position (seamless tiling across adjacent boxes).
export function worldBox(cx, cy, cz, w, h, d, rotY = 0, tile = 1, uvOff = [0, 0]) {
  const g = new THREE.BoxGeometry(w, h, d);
  _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
  _m.compose(new THREE.Vector3(cx, cy, cz), _q, _s);
  g.applyMatrix4(_m);
  applyWorldUV(g, tile, uvOff);
  return g;
}

export function applyWorldUV(g, tile = 1, uvOff = [0, 0]) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let u, v;
    if (ny >= nx && ny >= nz) { u = x; v = z; }
    else if (nx >= nz) { u = z * Math.sign(n.getX(i) || 1); v = y; }
    else { u = -x * Math.sign(n.getZ(i) || 1); v = y; }
    uv.setXY(i, u / tile + uvOff[0], v / tile + uvOff[1]);
  }
  uv.needsUpdate = true;
}

// Collects static geometry per material and merges it into a few large meshes.
export class StaticBatch {
  constructor() { this.groups = new Map(); }
  add(geo, material, { cast = true, receive = true } = {}) {
    const key = material.uuid + (cast ? 'c' : '') + (receive ? 'r' : '');
    if (!this.groups.has(key)) this.groups.set(key, { material, geos: [], cast, receive });
    // Normalize attributes so all geometries can merge.
    if (geo.index) geo = geo.toNonIndexed();
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.clearGroups();
    this.groups.get(key).geos.push(geo);
  }
  build(parent) {
    const meshes = [];
    for (const { material, geos, cast, receive } of this.groups.values()) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere(); merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = cast; mesh.receiveShadow = receive;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      parent.add(mesh); meshes.push(mesh);
      for (const g of geos) g.dispose();
    }
    this.groups.clear();
    return meshes;
  }
}

export function roundedBox(w, h, d, r = 0.02, seg = 3) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
}

// Lathe from a list of [radius, y] points.
export function lathe(points, segments = 32) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

export function mesh(geo, material, { cast = true, receive = true, pos = null, rot = null, scale = null } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) { if (typeof scale === 'number') m.scale.setScalar(scale); else m.scale.set(scale[0], scale[1], scale[2]); }
  return m;
}
