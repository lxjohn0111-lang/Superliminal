// First-person character controller (Rapier kinematic character controller) with camera feel.
import * as THREE from 'three';
import { R, G_PLAYER, Q_PLAYERDOWN } from '../engine/physics.js';

const UP = new THREE.Vector3(0, 1, 0);

export class Player {
  constructor(game) {
    this.game = game;
    this.radius = 0.3;
    this.halfH = 0.6;           // capsule: total height 1.8
    this.eye = 1.64;
    this.feet = new THREE.Vector3();
    this.prevFeet = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.grounded = false;
    this.coyote = 0; this.jumpBuffer = 0;
    this.stepDist = 0; this.bobPhase = 0; this.bobAmp = 0;
    this.landDip = 0; this.landVel = 0;
    this.roll = 0;
    this.eyePos = new THREE.Vector3();
    this.groundInfo = null;
    this.airTime = 0;
    this.headBob = true;
    this.frozen = false;
    this.fallSpeed = 0;
  }

  attach(physics, pos, yaw) {
    this.physics = physics;
    const w = physics.world;
    this.body = w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(pos[0], pos[1] + this.halfH + this.radius, pos[2]));
    this.collider = w.createCollider(R.ColliderDesc.capsule(this.halfH, this.radius).setCollisionGroups(G_PLAYER).setFriction(0.0), this.body);
    physics.info.set(this.collider.handle, { kind: 'player' });
    const cc = this.cc = w.createCharacterController(0.025);
    cc.setUp({ x: 0, y: 1, z: 0 });
    cc.setMaxSlopeClimbAngle(50 * Math.PI / 180);
    cc.setMinSlopeSlideAngle(55 * Math.PI / 180);
    cc.enableAutostep(0.42, 0.12, true);
    cc.enableSnapToGround(0.28);
    cc.setSlideEnabled(true);
    cc.setApplyImpulsesToDynamicBodies(true);
    cc.setCharacterMass(18);
    this.teleport(pos, yaw);
  }

  teleport(pos, yaw = null, pitch = 0) {
    this.feet.set(pos[0], pos[1], pos[2]);
    this.prevFeet.copy(this.feet);
    this.vel.set(0, 0, 0);
    if (yaw !== null) { this.yaw = yaw; this.pitch = pitch; }
    if (this.body) this.body.setTranslation({ x: pos[0], y: pos[1] + this.halfH + this.radius, z: pos[2] }, true);
    this.landDip = 0; this.airTime = 0;
  }

  look(dx, dy) {
    const s = 0.0021 * this.game.settings.sensitivity;
    this.yaw -= dx * s;
    this.pitch -= dy * s * (this.game.settings.invertY ? -1 : 1);
    this.pitch = Math.max(-1.53, Math.min(1.53, this.pitch));
  }

  forward(out = new THREE.Vector3()) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }

  fixedUpdate(dt, ctl) {
    if (this.frozen || !this.body) return;
    this.prevFeet.copy(this.feet);
    const fwd = this.forward(new THREE.Vector3());
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const wish = new THREE.Vector3().addScaledVector(fwd, ctl.my).addScaledVector(right, ctl.mx);
    const wl = wish.length();
    if (wl > 1) wish.divideScalar(wl);
    const speed = ctl.run ? 5.4 : 3.6;
    const target = wish.multiplyScalar(speed);
    const accel = this.grounded ? 11 : 2.2;
    const k = Math.min(1, accel * dt);
    this.vel.x += (target.x - this.vel.x) * k;
    this.vel.z += (target.z - this.vel.z) * k;

    if (ctl.jump) this.jumpBuffer = 0.14;
    this.jumpBuffer -= dt;
    this.coyote = this.grounded ? 0.12 : this.coyote - dt;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vel.y = 5.7; this.grounded = false; this.coyote = 0; this.jumpBuffer = 0;
      this.game.audio.jump();
    }
    this.vel.y -= 17.5 * dt;
    if (this.vel.y < -40) this.vel.y = -40;

    // Ride moving platforms (floating rafts etc.)
    const plat = new THREE.Vector3();
    if (this.grounded && this.groundBody) {
      const t = this.groundBody.bodyType();
      if (t === R.RigidBodyType.Dynamic || t === R.RigidBodyType.KinematicPositionBased) {
        const lv = this.groundBody.linvel(); plat.set(lv.x, Math.min(0, lv.y), lv.z);
      }
    }

    const desired = { x: (this.vel.x + plat.x) * dt, y: (this.vel.y + plat.y) * dt, z: (this.vel.z + plat.z) * dt };
    const cc = this.cc;
    const heldBody = this.game.grab && this.game.grab.held ? this.game.grab.held.body : null;
    cc.computeColliderMovement(this.collider, desired, R.QueryFilterFlags.EXCLUDE_SENSORS, G_PLAYER,
      heldBody ? (c) => c.parent() !== heldBody : undefined);
    const mv = cc.computedMovement();
    const wasGrounded = this.grounded;
    this.grounded = cc.computedGrounded();

    const t = this.body.translation();
    const nc = { x: t.x + mv.x, y: t.y + mv.y, z: t.z + mv.z };
    this.body.setNextKinematicTranslation(nc);
    this.feet.set(nc.x, nc.y - this.halfH - this.radius, nc.z);

    // Velocity correction from collisions.
    if (dt > 0) {
      const ax = mv.x / dt - plat.x, az = mv.z / dt - plat.z;
      if (Math.abs(ax) < Math.abs(this.vel.x)) this.vel.x = ax;
      if (Math.abs(az) < Math.abs(this.vel.z)) this.vel.z = az;
    }
    if (desired.y > 0 && mv.y < desired.y * 0.3) this.vel.y = Math.min(this.vel.y, 0); // bonk
    if (this.grounded) {
      if (!wasGrounded && this.airTime > 0.25) {
        const s = Math.min(1.5, Math.abs(this.fallSpeed) / 9);
        this.landVel = -Math.min(2.2, Math.abs(this.fallSpeed) * 0.12);
        this.game.audio.land(0.4 + s);
        this.footstep(0.9);
      }
      if (this.vel.y < 0) this.vel.y = -0.3;
      this.airTime = 0;
    } else {
      this.airTime += dt;
      this.fallSpeed = this.vel.y;
    }

    // Ground probe (surface sound, platform body).
    this.groundBody = null; this.groundInfo = null;
    const hit = this.physics.castRay({ x: nc.x, y: nc.y, z: nc.z }, { x: 0, y: -1, z: 0 }, this.halfH + this.radius + 0.35, Q_PLAYERDOWN);
    if (hit) {
      const col = hit.collider;
      this.groundBody = col.parent();
      this.groundInfo = this.physics.info.get(col.handle) || null;
    }

    // Footsteps & head-bob.
    const hs = Math.hypot(mv.x, mv.z) / dt;
    if (this.grounded && hs > 0.4) {
      this.stepDist += hs * dt;
      this.bobPhase += hs * dt * 2.2;
      const stride = ctl.run ? 0.95 : 0.78;
      if (this.stepDist > stride) { this.stepDist = 0; this.footstep(ctl.run ? 1.15 : 0.85); }
    }
    this.bobAmp += ((this.grounded ? Math.min(1, hs / 4) : 0) - this.bobAmp) * Math.min(1, dt * 8);
    this.hSpeed = hs;
    this.strafe = ctl.mx;
  }

  footstep(str) {
    let surface = 'hard';
    if (this.groundInfo) surface = this.groundInfo.kind === 'prop' ? (this.groundInfo.prop.def.sound === 'soft' ? 'soft' : 'wood') : (this.groundInfo.sound || 'hard');
    this.game.audio.footstep(surface, str);
  }

  // Per-frame camera update (interpolated between physics steps).
  updateCamera(camera, alpha, dt, shake) {
    // Landing spring.
    this.landVel += (-this.landDip * 90 - this.landVel * 12) * dt;
    this.landDip += this.landVel * dt;
    const bob = this.headBob ? this.bobAmp : 0;
    const by = Math.sin(this.bobPhase * 2) * 0.035 * bob;
    const bx = Math.cos(this.bobPhase) * 0.025 * bob;
    this.eyePos.lerpVectors(this.prevFeet, this.feet, alpha);
    this.eyePos.y += this.eye + by + this.landDip * 0.12;
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.eyePos.addScaledVector(right, bx);
    camera.position.copy(this.eyePos);
    if (shake > 0) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake));
    this.roll += ((-(this.strafe || 0) * 0.012 * Math.min(1, (this.hSpeed || 0) / 3)) - this.roll) * Math.min(1, dt * 6);
    camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, this.roll + (this.headBob ? Math.sin(this.bobPhase) * 0.004 * bob : 0), 'YXZ'));
  }
}
