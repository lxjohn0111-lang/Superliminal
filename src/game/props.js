// Runtime prop instances: rigid bodies that can be rescaled, held, floated and reset.
import * as THREE from 'three';
import { R, G_PROP, G_HELD } from '../engine/physics.js';
import { CATALOG, propBounds, buildPropMesh } from './catalog.js';

let NEXT_ID = 1;
const _v = new THREE.Vector3(), _q = new THREE.Quaternion();

export class PropSystem {
  constructor(game, level) {
    this.game = game;
    this.level = level;
    this.props = [];
    this.echoClones = [];
  }

  get physics() { return this.level.physics; }

  spawn(type, { pos = [0, 0, 0], scale = 1, rotY = 0, quat = null, variant = 0, frozen = false, grabbable = true, id = null, echoSource = false, light = true } = {}) {
    const def = CATALOG[type];
    if (!def) throw new Error('Unknown prop ' + type);
    const group = buildPropMesh(type, variant);
    this.level.root.add(group);
    const world = this.physics.world;
    const q = quat ? quat.clone() : new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const bodyDesc = (frozen ? R.RigidBodyDesc.fixed() : R.RigidBodyDesc.dynamic())
      .setTranslation(pos[0], pos[1], pos[2]).setRotation(q)
      .setLinearDamping(0.08).setAngularDamping(0.35).setCcdEnabled(true);
    const body = world.createRigidBody(bodyDesc);
    const bounds = propBounds(def);
    const prop = {
      id: id || 'p' + (NEXT_ID++), type, def, variant, group, body, colliders: [], scale: 1,
      bounds, centerLocal: bounds.getCenter(new THREE.Vector3()), sizeLocal: bounds.getSize(new THREE.Vector3()),
      held: false, frozen, grabbable, echoSource: echoSource || (def.echo && frozen),
      prevPos: new THREE.Vector3(...pos), curPos: new THREE.Vector3(...pos), prevQuat: q.clone(), curQuat: q.clone(),
      lastVel: new THREE.Vector3(), lastImpact: 0, inWater: false, sleepTimer: 0,
      home: { pos: new THREE.Vector3(...pos), quat: q.clone(), scale }, spawnScale: scale,
      light: group.userData.light || null, hinge: group.userData.hinge || null,
    };
    if (prop.light && !light) { prop.light.visible = false; }
    this.setScale(prop, scale);
    group.position.set(...pos); group.quaternion.copy(q);
    this.props.push(prop);
    return prop;
  }

  // Rebuild colliders for a new uniform scale.
  setScale(prop, s) {
    const world = this.physics.world;
    for (const c of prop.colliders) this.physics.removeCollider(c);
    prop.colliders = [];
    prop.scale = s;
    const def = prop.def;
    for (const c of def.colliders) {
      let desc;
      if (c.t === 'box') desc = R.ColliderDesc.cuboid(c.h[0] * s, c.h[1] * s, c.h[2] * s);
      else if (c.t === 'ball') desc = R.ColliderDesc.ball(c.r * s);
      else desc = R.ColliderDesc.cylinder(c.hh * s, c.r * s);
      desc.setTranslation(c.o[0] * s, c.o[1] * s, c.o[2] * s)
        .setDensity(def.density)
        .setFriction(0.75)
        .setRestitution(def.restitution || 0.04)
        .setCollisionGroups(prop.held ? G_HELD : G_PROP);
      const col = world.createCollider(desc, prop.body);
      this.physics.info.set(col.handle, { kind: 'prop', prop, sound: def.sound });
      prop.colliders.push(col);
    }
    prop.group.scale.setScalar(s);
    if (prop.light) {
      prop.light.intensity = prop.light.userData.baseIntensity * s * s;
      prop.light.distance = prop.light.userData.baseDistance * s * 1.0 + 0.5;
    }
    prop.mass = prop.frozen ? this.computeMass(prop) : prop.body.mass();
  }

  computeMass(prop) {
    const s = prop.scale, d = prop.def.density;
    let v = 0;
    for (const c of prop.def.colliders) {
      if (c.t === 'box') v += 8 * c.h[0] * c.h[1] * c.h[2];
      else if (c.t === 'ball') v += 4 / 3 * Math.PI * c.r ** 3;
      else v += Math.PI * c.r * c.r * c.hh * 2;
    }
    return v * s * s * s * d;
  }

  setHeld(prop, held) {
    prop.held = held;
    if (held) {
      prop.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true);
      for (const c of prop.colliders) c.setCollisionGroups(G_HELD);
    } else {
      for (const c of prop.colliders) c.setCollisionGroups(G_PROP);
      prop.body.setBodyType(R.RigidBodyType.Dynamic, true);
      prop.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      prop.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }

  placeBody(prop, pos, quat) {
    prop.body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
    prop.body.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w }, true);
    prop.prevPos.copy(pos); prop.curPos.copy(pos); prop.prevQuat.copy(quat); prop.curQuat.copy(quat);
  }

  // World-space centre of a prop (from its current visual transform).
  centerOf(prop, out = new THREE.Vector3()) {
    return out.copy(prop.centerLocal).multiplyScalar(prop.scale).applyQuaternion(prop.group.quaternion).add(prop.group.position);
  }

  remove(prop) {
    for (const c of prop.colliders) this.physics.removeCollider(c);
    try { this.physics.world.removeRigidBody(prop.body); } catch (e) { /* */ }
    prop.group.removeFromParent();
    prop.removed = true;
    this.props.splice(this.props.indexOf(prop), 1);
    const ei = this.echoClones.indexOf(prop); if (ei >= 0) this.echoClones.splice(ei, 1);
  }

  resetHome(prop) {
    if (prop.echoClone) { this.remove(prop); return; }
    this.setScale(prop, prop.home.scale);
    this.placeBody(prop, prop.home.pos, prop.home.quat);
    prop.body.setLinvel({ x: 0, y: 0, z: 0 }, true); prop.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    prop.group.position.copy(prop.home.pos); prop.group.quaternion.copy(prop.home.quat);
  }

  beforeStep() {
    for (const p of this.props) {
      if (p.held || p.frozen) continue;
      p.prevPos.copy(p.curPos); p.prevQuat.copy(p.curQuat);
    }
  }

  afterStep(dt) {
    const audio = this.game.audio, level = this.level;
    const now = performance.now();
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i];
      if (p.held || p.frozen) continue;
      const t = p.body.translation(), r = p.body.rotation();
      p.curPos.set(t.x, t.y, t.z); p.curQuat.set(r.x, r.y, r.z, r.w);
      const lv = p.body.linvel();
      _v.set(lv.x, lv.y, lv.z);
      const dv = _v.distanceTo(p.lastVel);
      if (dv > 1.1 && now - p.lastImpact > 90 && !p.body.isSleeping()) {
        p.lastImpact = now;
        const size = Math.max(p.sizeLocal.x, p.sizeLocal.y, p.sizeLocal.z) * p.scale;
        const d = this.game.player ? this.game.player.eyePos.distanceTo(p.curPos) : 1;
        const att = 1 / (1 + d * 0.12);
        audio.impact(p.def.sound, size, Math.min(4, dv * 0.5) * att);
        if (size > 2.5 && dv > 3) this.game.shake(Math.min(0.6, size * dv * 0.004) * att);
      }
      p.lastVel.copy(_v);

      // Buoyancy & drag.
      const water = level.waterAt(t.x, t.z);
      if (water) {
        const c = this.centerOf(p, _v);
        const h = Math.max(0.02, p.sizeLocal.y * p.scale * 0.5);
        const f = Math.max(0, Math.min(1, (water.y - (c.y - h)) / (2 * h)));
        if (f > 0) {
          if (!p.inWater && lv.y < -1.5) { const sz = p.sizeLocal.x * p.scale; audio.splash(sz); level.splash && level.splash(c, sz); }
          p.inWater = true;
          const m = p.body.mass();
          const lift = p.def.floats ? 2.3 : 0.25;
          const up = m * 9.81 * f * lift * dt;
          const drag = m * f * dt;
          p.body.applyImpulse({ x: -lv.x * drag * 2.5, y: up - lv.y * drag * 2.0, z: -lv.z * drag * 2.5 }, true);
          const av = p.body.angvel();
          const k = Math.max(0, 1 - f * dt * 3);
          p.body.setAngvel({ x: av.x * k, y: av.y * k, z: av.z * k }, true);
        } else p.inWater = false;
      }

      if (t.y < level.killY) {
        if (p.echoClone) this.remove(p);
        else { this.resetHome(p); level.onPropReset && level.onPropReset(p); }
      }
    }
  }

  // Interpolate visuals between physics steps.
  sync(alpha) {
    for (const p of this.props) {
      if (p.held) continue;
      if (p.frozen) { p.group.position.copy(p.curPos); p.group.quaternion.copy(p.curQuat); continue; }
      p.group.position.lerpVectors(p.prevPos, p.curPos, alpha);
      p.group.quaternion.slerpQuaternions(p.prevQuat, p.curQuat, alpha);
    }
  }

  // World AABB of a prop at its current visual transform.
  worldAABB(prop, out = new THREE.Box3()) {
    out.copy(prop.bounds);
    const m = new THREE.Matrix4().compose(prop.group.position, prop.group.quaternion, new THREE.Vector3(prop.scale, prop.scale, prop.scale));
    return out.applyMatrix4(m);
  }

  byId(id) { return this.props.find((p) => p.id === id); }
}
