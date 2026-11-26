// The forced-perspective core: held objects keep their on-screen size, so distance == scale.
import * as THREE from 'three';
import { R, Q_PLACE, Q_LOOK, groups, GRP } from '../engine/physics.js';

const Q_PLAYER_ONLY = groups(0xffff, GRP.PLAYER);
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();
const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];

export class GrabSystem {
  constructor(game) {
    this.game = game;
    this.held = null;
    this.hover = null;
    this.k = 1;
    this.localDir = new THREE.Vector3(0, 0, -1);
    this.relQuat = new THREE.Quaternion();
    this.uprightQuat = new THREE.Quaternion();
    this.extraYaw = 0; this.extraYawTarget = 0;
    this.t = 1; this.tTarget = 1;
    this.blocked = false;
    this.pos = new THREE.Vector3(); this.quat = new THREE.Quaternion(); this.s = 1;
    this.lastScale = 1;
    this.reach = 60;
  }

  get level() { return this.game.level; }

  yawQuat(out = _q) { return out.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.game.player.yaw); }

  // ----------------------------------------------------------------- hover
  updateHover(camera) {
    this.hover = null;
    if (this.held) return;
    const physics = this.level.physics;
    const dir = camera.getWorldDirection(_v);
    const o = camera.position;
    const hit = physics.castRay({ x: o.x, y: o.y, z: o.z }, { x: dir.x, y: dir.y, z: dir.z }, this.reach, Q_LOOK);
    if (!hit) return;
    const info = physics.info.get(hit.collider.handle);
    if (info && info.kind === 'prop' && info.prop.grabbable && !info.prop.removed) {
      this.hover = info.prop;
      this.hoverDist = hit.timeOfImpact;
    }
  }

  // ----------------------------------------------------------------- grab / release
  grab(prop, camera) {
    const game = this.game, props = this.level.props;
    if (prop.echoSource) {
      const clone = props.spawn(prop.type, { pos: [prop.curPos.x, prop.curPos.y, prop.curPos.z], quat: prop.curQuat, scale: prop.scale, variant: prop.variant });
      clone.echoClone = true;
      clone.group.position.copy(prop.group.position); clone.group.quaternion.copy(prop.group.quaternion);
      props.echoClones.push(clone);
      if (props.echoClones.length > 18) props.remove(props.echoClones[0]);
      game.stats.echoes = (game.stats.echoes || 0) + 1;
      game.achievements.check('echoes', game.stats.echoes);
      game.audio.tone(880, 0.4, { vol: 0.05, type: 'triangle' });
      prop = clone;
    }
    const c = props.centerOf(prop, new THREE.Vector3());
    const d0 = Math.max(0.2, c.distanceTo(camera.position));
    this.k = prop.scale / d0;
    this.held = prop;
    props.setHeld(prop, true);
    this.localDir.copy(c).sub(camera.position).normalize().applyQuaternion(camera.quaternion.clone().invert());
    const qy = this.yawQuat(new THREE.Quaternion());
    this.relQuat.copy(qy).invert().multiply(prop.group.quaternion);
    this.computeUpright();
    this.extraYaw = 0; this.extraYawTarget = 0;
    this.t = d0; this.tTarget = d0;
    this.startScale = prop.scale;
    this.lastScale = prop.scale;
    game.audio.grab(prop.scale);
    game.audio.startHoldHum();
    game.stats.grabs = (game.stats.grabs || 0) + 1;
    game.achievements.unlock('first_grab');
    this.level.onGrab && this.level.onGrab(prop);
  }

  // Find the rotation that puts the object's most-upward local axis exactly up (keeps it tidy for stacking).
  computeUpright() {
    let best = null, bestDot = -2;
    const q = this.relQuat;
    for (const a of AXES) {
      const w = _v.copy(a).applyQuaternion(q);
      if (w.y > bestDot) { bestDot = w.y; best = a; }
    }
    const worldAxis = _v.copy(best).applyQuaternion(q);
    const fix = new THREE.Quaternion().setFromUnitVectors(worldAxis.normalize(), new THREE.Vector3(0, 1, 0));
    this.uprightQuat.copy(fix).multiply(q);
  }

  release(force = false) {
    const prop = this.held;
    if (!prop) return true;
    const game = this.game, props = this.level.props;
    let pos = this.pos.clone();
    const quat = this.quat.clone();
    const s = this.s;
    if (!force) {
      if (this.blocked) { game.deny('No room there'); return false; }
      if (this.overlapsPlayer(prop, pos, quat, s)) {
        const fwd = game.player.forward(new THREE.Vector3());
        let ok = false;
        for (let step = 0.05; step <= 3.0; step += 0.05) {
          const p2 = pos.clone().addScaledVector(fwd, step);
          if (!this.overlapsPlayer(prop, p2, quat, s) && this.fitsAt(prop, p2, quat, s)) { pos = p2; ok = true; break; }
        }
        if (!ok) { game.deny('Too close to you'); return false; }
      }
    }
    this.held = null;
    props.setScale(prop, s);
    props.placeBody(prop, pos, quat);
    props.setHeld(prop, false);
    prop.group.position.copy(pos); prop.group.quaternion.copy(quat);
    prop.lastVel.set(0, 0, 0);
    game.audio.release(s);
    game.audio.stopHoldHum();
    const ratio = s / prop.spawnScale;
    game.stats.drops = (game.stats.drops || 0) + 1;
    if (Math.abs(Math.log(ratio)) > 0.2) game.stats.resized = (game.stats.resized || 0) + 1;
    if (s / 1 >= 10 || ratio >= 10) game.achievements.unlock('think_big');
    if (ratio <= 0.1) game.achievements.unlock('pocket');
    game.achievements.check('drops', game.stats.drops);
    this.level.onRelease && this.level.onRelease(prop);
    return true;
  }

  dropInPlace() {
    if (!this.held) return;
    if (!this.release()) {
      const p = this.held;
      this.held = null;
      this.game.audio.stopHoldHum();
      this.level.props.setHeld(p, false);
      this.level.props.resetHome(p);
    }
  }

  // ----------------------------------------------------------------- placement search
  shapesAt(prop, pos, quat, s, shrink = 0.985) {
    const out = [];
    for (const c of prop.def.colliders) {
      let shape;
      const k = s * shrink;
      if (c.t === 'box') shape = new R.Cuboid(c.h[0] * k, c.h[1] * k, c.h[2] * k);
      else if (c.t === 'ball') shape = new R.Ball(c.r * k);
      else shape = new R.Cylinder(c.hh * k, c.r * k);
      const off = _v2.set(c.o[0] * s, c.o[1] * s, c.o[2] * s).applyQuaternion(quat).add(pos);
      out.push({ shape, pos: { x: off.x, y: off.y, z: off.z } });
    }
    return out;
  }

  fitsAt(prop, pos, quat, s) {
    const world = this.level.physics.world;
    const rot = { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
    for (const { shape, pos: p } of this.shapesAt(prop, pos, quat, s)) {
      const hit = world.intersectionWithShape(p, rot, shape, R.QueryFilterFlags.EXCLUDE_SENSORS, Q_PLACE, null, prop.body);
      if (hit) return false;
    }
    return true;
  }

  overlapsPlayer(prop, pos, quat, s) {
    const world = this.level.physics.world;
    const rot = { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
    for (const { shape, pos: p } of this.shapesAt(prop, pos, quat, s, 1.0)) {
      if (world.intersectionWithShape(p, rot, shape, R.QueryFilterFlags.EXCLUDE_SENSORS, Q_PLAYER_ONLY, null, prop.body)) return true;
    }
    return false;
  }

  placementAt(prop, origin, dir, t, quat, outPos) {
    const s = this.k * t;
    outPos.copy(dir).multiplyScalar(t).add(origin).sub(_v.copy(prop.centerLocal).multiplyScalar(s).applyQuaternion(quat));
    return s;
  }

  search(prop, origin, dir, quat) {
    const def = prop.def;
    const minS = 0.04, maxS = def.maxScale || 60;
    const rUnit = prop.sizeLocal.length() * 0.5;
    const kr = this.k * rUnit;
    let tMin = Math.max(0.18, minS / this.k, 0.14 / Math.max(0.12, 1 - kr));
    let tMax = Math.min(220, maxS / this.k);
    const physics = this.level.physics;
    const ray = physics.castRay({ x: origin.x, y: origin.y, z: origin.z }, { x: dir.x, y: dir.y, z: dir.z }, tMax, Q_PLACE, prop.body);
    if (ray) tMax = Math.min(tMax, ray.timeOfImpact + 0.01);
    if (tMax < tMin) tMin = tMax;
    const p = new THREE.Vector3();
    const fits = (t) => { const s = this.placementAt(prop, origin, dir, t, quat, p); return this.fitsAt(prop, p, quat, s); };
    if (!fits(tMin)) return { t: tMin, blocked: true };
    let lo = tMin, hi = null, t = tMin;
    while (true) {
      t = t * 1.085 + 0.015;
      if (t >= tMax) { if (fits(tMax)) { lo = tMax; hi = null; } else hi = tMax; break; }
      if (!fits(t)) { hi = t; break; }
      lo = t;
    }
    if (hi !== null) {
      for (let i = 0; i < 9; i++) { const m = (lo + hi) * 0.5; if (fits(m)) lo = m; else hi = m; }
    }
    return { t: lo * 0.998, blocked: false };
  }

  // ----------------------------------------------------------------- per-frame
  update(dt, camera, input) {
    const game = this.game;
    if (input.rotate) this.extraYawTarget += Math.PI / 4 * input.rotate;
    if (!this.held) return;
    const prop = this.held;
    // Ease held object toward screen centre and upright.
    this.localDir.lerp(_v.set(0, 0, -1), 1 - Math.exp(-dt * 7)).normalize();
    this.relQuat.slerp(this.uprightQuat, 1 - Math.exp(-dt * 9));
    this.extraYaw += (this.extraYawTarget - this.extraYaw) * (1 - Math.exp(-dt * 12));

    const origin = camera.position.clone();
    const dir = this.localDir.clone().applyQuaternion(camera.quaternion).normalize();
    const qy = this.yawQuat(new THREE.Quaternion());
    const extra = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.extraYaw);
    const quat = qy.multiply(extra).multiply(this.relQuat);

    const res = this.search(prop, origin, dir, quat);
    this.tTarget = res.t;
    this.blocked = res.blocked;
    if (this.tTarget < this.t) this.t = this.tTarget;
    else this.t += (this.tTarget - this.t) * (1 - Math.exp(-dt * 22));
    // Validate the eased distance; if it collides, snap to the safe target.
    const p = new THREE.Vector3();
    let s = this.placementAt(prop, origin, dir, this.t, quat, p);
    if (Math.abs(this.t - this.tTarget) > 1e-3 && !this.fitsAt(prop, p, quat, s)) { this.t = this.tTarget; s = this.placementAt(prop, origin, dir, this.t, quat, p); }
    this.pos.copy(p); this.quat.copy(quat); this.s = s;
    prop.group.position.copy(p); prop.group.quaternion.copy(quat); prop.group.scale.setScalar(s);
    prop.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
    if (prop.light) {
      prop.light.intensity = prop.light.userData.baseIntensity * s * s;
      prop.light.distance = prop.light.userData.baseDistance * s + 0.5;
    }
    const change = Math.abs(Math.log(s / this.lastScale)) / Math.max(dt, 1e-3);
    this.lastScale = s;
    game.audio.updateHoldHum(s, Math.min(1, change * 0.3));
  }
}
