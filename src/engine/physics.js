// Rapier physics wrapper.
import RAPIER from '@dimforge/rapier3d-compat';

export let R = null;
export async function initPhysics() {
  await RAPIER.init();
  R = RAPIER;
  return R;
}

export const GRP = { STATIC: 1, PROP: 2, PLAYER: 4, HELD: 8, SENSOR: 16, BARRIER: 32, PROPBLOCK: 64 };
export const groups = (member, filter) => ((member & 0xffff) << 16) | (filter & 0xffff);

export const G_STATIC = groups(GRP.STATIC, GRP.PROP | GRP.PLAYER);
export const G_PROP = groups(GRP.PROP, GRP.STATIC | GRP.PROP | GRP.PLAYER | GRP.SENSOR | GRP.PROPBLOCK);
export const G_PLAYER = groups(GRP.PLAYER, GRP.STATIC | GRP.PROP | GRP.BARRIER);
export const G_HELD = groups(GRP.HELD, 0);
export const G_SENSOR = groups(GRP.SENSOR, GRP.PROP);
export const G_BARRIER = groups(GRP.BARRIER, GRP.PLAYER);
export const G_PROPBLOCK = groups(GRP.PROPBLOCK, GRP.PROP);
// Query groups used by the forced-perspective placement search: hits world + props (+ prop-only blockers).
export const Q_PLACE = groups(0xffff, GRP.STATIC | GRP.PROP | GRP.PROPBLOCK);
export const Q_LOOK = groups(0xffff, GRP.STATIC | GRP.PROP);
export const Q_PLAYERDOWN = groups(0xffff, GRP.STATIC | GRP.PROP);

export class Physics {
  constructor() {
    this.world = new R.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 60;
    this.world.numSolverIterations = 6;
    this.info = new Map(); // collider handle -> { kind, prop, sound, ... }
  }

  dispose() {
    try { this.world.free(); } catch (e) { /* ignore */ }
    this.info.clear();
  }

  addStaticBox(cx, cy, cz, hx, hy, hz, quat, info, grp = G_STATIC) {
    const desc = R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(cx, cy, cz).setCollisionGroups(grp).setFriction(0.8);
    if (quat) desc.setRotation(quat);
    const c = this.world.createCollider(desc);
    this.info.set(c.handle, info || { kind: 'static', sound: 'hard' });
    return c;
  }

  addSensorBox(cx, cy, cz, hx, hy, hz, quat, info) {
    const desc = R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(cx, cy, cz).setSensor(true).setCollisionGroups(G_SENSOR)
      .setActiveCollisionTypes(R.ActiveCollisionTypes.DEFAULT | R.ActiveCollisionTypes.KINEMATIC_FIXED | R.ActiveCollisionTypes.FIXED_FIXED);
    if (quat) desc.setRotation(quat);
    const c = this.world.createCollider(desc);
    this.info.set(c.handle, info || { kind: 'sensor' });
    return c;
  }

  removeCollider(c) {
    if (!c) return;
    this.info.delete(c.handle);
    try { this.world.removeCollider(c, true); } catch (e) { /* ignore */ }
  }

  step() { this.world.step(); }

  castRay(origin, dir, maxToi, groupsQ = Q_LOOK, excludeBody = null, predicate = null) {
    const ray = new R.Ray(origin, dir);
    const hit = this.world.castRayAndGetNormal(ray, maxToi, true, R.QueryFilterFlags.EXCLUDE_SENSORS, groupsQ, null, excludeBody, predicate);
    return hit;
  }
}
