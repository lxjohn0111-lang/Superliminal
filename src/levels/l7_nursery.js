// Chapter 7 — The Nursery. A room with no doors... unless you bring one.
import * as THREE from 'three';
import { mesh, roundedBox } from '../engine/geometry.js';
import { mat, colorMat, emissiveMat } from '../engine/materials.js';

export default {
  id: 'nursery',
  title: 'The Nursery',
  subtitle: 'There is always a way out. Sometimes you have to bring it.',
  mood: 'nursery', ambience: 'nursery', reverb: 1.6,
  par: [95, 200],
  cranes: 3,
  floorY: 0,
  hints: [
    'There is a little blue toy door on the low shelf. Grab it up close, look at the sky-blue wall, and let go while it looks tall enough to walk through.',
    'The plate wants 400 kg. Letter blocks are light — unless they are very, very big.',
  ],
  build(L) {
    const D = L.decor;
    L.envIntensity = 0.55;
    L.probe(0, 1.6, -2);
    L.spawn([0, 0, 2.6], 0);

    // ---------------------------------------------------------------- Nursery
    L.room({ x0: -6, x1: 6, z0: -8, z1: 4, h: 3.4, floor: 'woodfloor', wall: 'wallpaperBlue', ceil: 'paintWhite', crown: true, walls: { n: false, s: true, e: true, w: true } });
    L.doorWall('dw', { axis: 'z', at: -8.15, a0: -6.25, a1: 6.25, y0: 0, y1: 3.4, t: 0.3, material: 'paintSky', minH: 1.9,
      onOpen: (LL) => { LL.setStage(1); LL.say(['A door. Where there was not one.', 'That is not a trick. That is architecture.'], { id: 'dooropen' }); } });
    // clouds painted on the sky wall
    const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    for (const [x, y, s] of [[-4, 2.4, 1.0], [-0.5, 2.8, 0.7], [3.2, 2.2, 1.2], [5.0, 2.9, 0.6], [-2.6, 1.4, 0.5]]) {
      const c = new THREE.Group();
      for (const [ox, oy, r] of [[0, 0, 0.3], [0.32, 0.05, 0.24], [-0.32, 0.02, 0.22], [0.12, 0.18, 0.22]]) c.add(mesh(new THREE.CircleGeometry(r, 24), cloudM, { pos: [ox, oy, 0], cast: false }));
      c.scale.setScalar(s); c.position.set(x, y, -7.99); L.root.add(c);
    }
    D.bed(-4.6, -1.2, 0);
    L.prop('bear', [-4.6, 0.62, -1.75], { rotY: 0.1, id: 'bear' });
    L.prop('pillow', [-4.6, 0.56, -1.95], { rotY: 0 });
    D.nightstand(-5.5, 0.6, Math.PI / 2);
    L.prop('clock', [-5.5, 0.5, 0.6], { rotY: Math.PI / 2 });
    D.rug(0, 0, 4.0, 3.0, 0x7a8fb5);
    // wardrobe with crane
    L.box([4.2, 0, 2.6], [5.95, 2.3, 3.95], 'woodPale');
    L.box([5.05, 0.1, 2.58], [5.1, 2.2, 2.6], 'woodDark', { collide: false });
    L.crane([5.0, 2.65, 3.3]);
    // low toy shelf with the toy door
    L.box([3.6, 0, -7.6], [5.8, 0.9, -6.9], 'woodPale');
    L.prop('toydoor', [4.7, 0.9, -7.25], { rotY: 0, id: 'toydoor' });
    L.prop('letter', [4.0, 0.9, -7.25], { variant: 0, rotY: 0.2 });
    L.prop('letter', [5.4, 0.9, -7.25], { variant: 1, rotY: -0.3 });
    // dollhouse with a crane peeking out
    const dh = new THREE.Group();
    dh.add(mesh(roundedBox(1.2, 0.9, 0.7, 0.01), mat('paintPeach'), { pos: [0, 0.45, 0] }));
    const roof = new THREE.ConeGeometry(0.95, 0.5, 4); roof.rotateY(Math.PI / 4);
    dh.add(mesh(roof, colorMat(0xa5463f, 0.6), { pos: [0, 1.15, 0], scale: [0.95, 1, 0.55] }));
    for (const x of [-0.3, 0.3]) dh.add(mesh(new THREE.PlaneGeometry(0.22, 0.22), emissiveMat(0xffe0a8, 1.2), { pos: [x, 0.55, 0.352], cast: false }));
    dh.add(mesh(new THREE.PlaneGeometry(0.2, 0.34), colorMat(0x3f6c9b, 0.5), { pos: [0, 0.17, 0.352], cast: false }));
    dh.position.set(-5.2, 0, -6.6); dh.rotation.y = Math.PI / 4; L.root.add(dh);
    L.physics.addStaticBox(-5.2, 0.5, -6.6, 0.55, 0.5, 0.55, null, { kind: 'static', sound: 'wood' });
    L.crane([-4.65, 1.05, -6.05]);
    // toy chest, blocks, ball
    L.box([1.6, 0, 3.3], [3.2, 0.6, 3.95], 'woodDark');
    L.prop('letter', [1.2, 0, 1.8], { variant: 2, rotY: 0.4 });
    L.prop('letter', [1.5, 0, 1.4], { variant: 3, rotY: 1.2 });
    L.prop('ball', [-1.8, 0, 2.8]);
    D.window(5.97, 1.8, -1.5, -Math.PI / 2, 2.0, 1.4, 0xffe6c2);
    D.painting(-5.97, 1.8, -4.0, Math.PI / 2, { w: 0.8, h: 0.6, seed: 71, style: 'stripes' });
    // mobile above the bed
    const mob = new THREE.Group(); mob.position.set(-4.6, 3.0, -1.2); L.root.add(mob);
    mob.add(mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.4), colorMat(0xdddddd, 0.4), { pos: [0, 0.2, 0], cast: false }));
    mob.add(mesh(new THREE.TorusGeometry(0.3, 0.006, 6, 40), mat('brass'), { rot: [Math.PI / 2, 0, 0], cast: false }));
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const star = new THREE.OctahedronGeometry(0.06);
      mob.add(mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.3), colorMat(0xdddddd, 0.4), { pos: [Math.cos(a) * 0.3, -0.15, Math.sin(a) * 0.3], cast: false }));
      mob.add(mesh(star, emissiveMat([0xffe08a, 0x9fd3ff, 0xffb3c8, 0xc6f5a0, 0xffffff][i], 1.3), { pos: [Math.cos(a) * 0.3, -0.32, Math.sin(a) * 0.3] }));
    }
    L.animated.push((dt) => { mob.rotation.y += dt * 0.25; });

    L.ambient(0xfff0e0, 0x8a7060, 0.35);
    L.spot([0, 3.35, 0], [0, 0, -1], { intensity: 34, angle: 1.0, color: 0xffe9cf });
    L.spot([-4, 3.35, -4], [-4, 0, -5], { intensity: 22, angle: 0.9, color: 0xffe9cf });
    L.spot([5.5, 2.2, -1.5], [2, 0, -2.5], { intensity: 30, angle: 0.7, color: 0xffd9a8 });
    L.point([-5.5, 0.9, 0.6], { color: 0xffc98a, intensity: 1.5, distance: 3 });
    D.dust(0, 1.6, -1.5, 10, 2.8, 10, 140, 0xfff0dd);

    // ---------------------------------------------------------------- Playroom (behind the wall)
    L.room({ x0: -6, x1: 6, z0: -18, z1: -8.3, h: 3.4, floor: 'carpetWarm', wall: 'paintYellow', ceil: 'paintWhite', walls: { n: true, s: false, e: true, w: true },
      openings: { n: [{ at: 3, w: 1.5, h: 2.4 }] } });
    L.plate('p1', { x: -1.5, z: -14, need: 400, size: 1.4 });
    L.door('d1', { x: 3, z: -18.12, w: 1.5, h: 2.4, plates: ['p1'], sticky: true, leafMat: 'paintSky', frameMat: 'woodPale' });
    L.exit(3, -18, 'n', { y: 0, w: 1.5, h: 2.4, wallMat: 'paintYellow' });
    // giant block tower (static) and toys
    const tower = [[[-5.6, 0, -17.6], [-4.4, 1.2, -16.4], 0xc0392b], [[-5.4, 1.2, -17.4], [-4.6, 2.0, -16.6], 0x2d6db0], [[-5.3, 2.0, -17.3], [-4.7, 2.6, -16.7], 0xd4881c]];
    for (const [a, b, c] of tower) L.box(a, b, colorMat(c, 0.55));
    L.crane([-5.0, 2.95, -17.0]);
    L.prop('letter', [2.0, 0, -11.2], { variant: 4, rotY: 0.5 });
    L.prop('letter', [-3.4, 0, -10.0], { variant: 5, rotY: 0.2 });
    L.prop('stool', [4.6, 0, -10.2], { rotY: Math.PI });
    L.prop('cone', [-1, 0, -16.8]);
    D.sign('PLAYROOM', 0, 2.6, -17.97, 0, { w: 1.4, h: 0.3, bg: '#ffefc2', color: '#a5463f', font: 'italic 600 110px Cormorant, Georgia' });
    L.spot([0, 3.35, -13], [-1, 0, -14], { intensity: 34, angle: 1.0, color: 0xfff1df });
    L.panel(3, 3.4, -16, 1.2, 0.6, { intensity: 7 });

    L.trigger([-6, 0, -8.4], [6, 3, -6], (LL) => LL.say('That wall is painted like the sky. It would make a lovely place for a door.', { id: 'wall' }));
  },
  onStart(L) {
    L.say(['Chapter seven. The nursery.', 'Ah. There appears to be no door.', 'That is a design choice. Not a mistake. I am almost certain.'], { id: 'intro', delay: 1.5 });
  },
  onGrab(L, p) {
    if (p.id === 'bear') { L.game.achievements.unlock('barnaby'); L.say('That is Barnaby. He is very old and very brave. Mind his ears.', { id: 'bear' }); }
    if (p.id === 'toydoor') L.say('A door, in miniature. Imagine it bigger. Then make it so.', { id: 'tdoor' });
  },
};
