import * as THREE from 'three';
import { emissiveMat, colorMat } from '../engine/materials.js';

// Chapter 2 — Overtime. Shrinking (the giant mug), threading an object through a hatch, climbing.
export default {
  id: 'overtime',
  title: 'Overtime',
  subtitle: 'Even dreams have paperwork.',
  mood: 'office', ambience: 'office', reverb: 1.8,
  par: [95, 200],
  cranes: 3,
  hints: [
    'The enormous mug only looks enormous because you are standing next to it. Walk back across the office, grab it from far away, then drop it on the floor right in front of you.',
    'Grab the crate while standing close to it. Then put your face right up to the square hatch in the glass and look through it at the plate. Drop it there.',
    'The exit is on the platform at the back. Make the crate roughly waist-high next to the platform, jump onto it, then jump up.',
  ],
  build(L) {
    const D = L.decor;
    // ---------------------------------------------------------------- open-plan office
    L.room({ x0: -8, x1: 8, z0: -10, z1: 4, h: 3.2, floor: 'carpet', wall: 'plasterGrey', crown: false,
      openings: { n: [{ at: 0, w: 1.4, h: 2.3 }] } });
    L.spawn([0, 0, 2.8], 0);
    L.probe(0, 1.6, -3);
    L.envIntensity = 0.75;

    // Night windows on the west wall
    for (const z of [-7, -3, 1]) D.window(-7.97, 1.7, z, Math.PI / 2, 2.4, 1.5, 0x22355c);
    // Cubicle cluster
    const cub = (cx, cz, rot) => {
      D.desk(cx, cz, rot, { w: 1.5, d: 0.75 });
      D.monitor(cx, 0.75, cz - 0.15 * Math.cos(rot), rot);
      D.officeChair(cx + 0.55 * Math.sin(rot), cz + 0.6 * Math.cos(rot), rot);
    };
    cub(-5.2, -6.2, 0); cub(-3.4, -6.2, 0); cub(-5.2, -3.6, Math.PI); cub(-3.4, -3.6, Math.PI);
    D.partition(-4.3, -4.9, 0, 3.6, 1.35);
    D.partition(-2.5, -4.9, Math.PI / 2, 2.8, 1.35);
    cub(-5.2, 0.6, 0); cub(-3.4, 0.6, 0);
    D.partition(-4.3, 1.4, 0, 3.6, 1.2);
    // Right side: meeting nook + filing + vending
    D.desk(4.4, -1.0, 0, { w: 2.2, d: 1.1, top: 'woodDark' });
    for (const [x, z, r] of [[3.6, -1.9, 0], [5.2, -1.9, 0], [3.6, -0.1, Math.PI], [5.2, -0.1, Math.PI]]) L.prop('chair', [x, 0, z], { rotY: r, grabbable: false });
    L.box([6.9, 0, -9.95], [7.95, 1.4, -6.2], 'metalDark');
    for (let i = 0; i < 4; i++) L.box([6.88, 0.12 + i * 0.32, -9.9 + 0.02], [6.9, 0.14 + i * 0.32, -6.25], 'chrome', { collide: false });
    L.box([6.2, 0, 2.8], [7.95, 2.0, 3.95], 'blackPlastic');
    L.box([6.18, 0.4, 3.0], [6.21, 1.8, 3.75], emissiveMatSafe(L, 0x9fd3ff, 1.4), { collide: false });
    D.waterCooler(7.5, 1.8, -Math.PI / 2);
    D.plant(7.4, -4.6, { size: 1.1, seed: 31 });
    D.plant(-7.4, 3.4, { size: 1.0, seed: 32 });
    D.poster('Small steps.', 'Big results.', 7.97, 1.6, -2.6, -Math.PI / 2, { hue: 150 });
    D.poster('Inbox zero.', 'Dream bigger.', -0.8, 1.6, 3.97, Math.PI, { hue: 260 });
    D.wallClock(3.0, 2.4, 3.97, Math.PI);
    D.sign('RECORDS →', 1.6, 2.55, -9.97, 0, { w: 0.9, h: 0.2, bg: '#2a2f38', color: '#e8eef6', font: '600 70px Inter, Arial' });

    // The giant mug blocking the doorway
    L.prop('mug', [0, 0, -8.9], { scale: 13, rotY: 2.2, id: 'mug' });
    L.prop('book', [-5.0, 0.75, -6.0], { variant: 1, rotY: 0.4 });
    L.prop('book', [4.0, 0.75, -1.2], { variant: 2, rotY: -0.6 });
    L.prop('apple', [-3.0, 0.75, -6.0]);
    L.prop('cone', [6.0, 0, -5.0], { rotY: 0.3 });

    L.crane([-3.6, 1.05, -6.35]);
    L.crane([7.2, 2.35, 3.4]);

    // Lights: dim night office with pools from desk lamps + a few ceiling panels on
    L.ambient(0xbfd0ff, 0x6a6058, 0.6);
    L.spot([-4.3, 3.12, -4.9], [-4.3, 0, -4.9], { intensity: 40, angle: 1.0, color: 0xf2f4ff });
    L.spot([3.6, 3.12, -1.5], [4.4, 0, -1.0], { intensity: 22, angle: 0.9, color: 0xffe9cc });
    L.spot([0, 3.12, -7.5], [0, 0, -8.6], { intensity: 30, angle: 0.8, color: 0xffffff });
    L.panel(-4.3, 3.2, 0.6, 1.2, 0.6, { intensity: 14 });
    L.panel(0, 3.2, 1.8, 1.2, 0.6, { intensity: 12 });
    L.panel(4.4, 3.2, -1.0, 1.2, 0.6, { intensity: 12 });
    L.panel(0, 3.2, -4.5, 1.2, 0.6, { intensity: 12 });
    L.point([7.0, 1.1, 3.0], { color: 0x9fd3ff, intensity: 2.0, distance: 4 });

    // ---------------------------------------------------------------- copy room + records room (behind glass)
    L.room({ x0: -4, x1: 4, z0: -21, z1: -10.25, h: 3.2, floor: 'tilesBig', wall: 'paintWhite', walls: { n: true, s: false, e: true, w: true },
      openings: { n: [{ at: 0, w: 1.3, h: 2.2, y: 1.6 }] } });
    // glass partition at z = -14 with door (x=-2.4) and hatch (x=1.6)
    L.wallZ(-14, -4, 4, 0, 3.2, glassLook(L), [{ at: -2.4, w: 1.3, h: 2.3 }, { at: 1.6, w: 0.62, h: 0.62, y: 1.05 }], 0.08, -1, 'metalDark');
    L.door('d2', { x: -2.4, z: -14.04, w: 1.3, h: 2.3, plates: ['p2'], sticky: true });
    D.sign('HATCH', 1.6, 1.86, -13.9, 0, { w: 0.4, h: 0.12, bg: '#2a2f38', color: '#e8eef6', font: '600 60px Inter, Arial' });
    // Copier + shelves
    L.box([2.4, 0, -11.2], [3.8, 1.0, -10.3], 'whitePlastic');
    L.box([2.45, 1.0, -11.15], [3.75, 1.08, -10.35], 'greyPlastic');
    L.box([2.6, 1.02, -11.0], [3.2, 1.04, -10.6], colorMatSafe(L, 0x0b0d10));
    D.shelf(-3.6, -12.6, Math.PI / 2, { w: 1.6, h: 2.0, d: 0.4, seed: 21, material: 'metalDark' });
    L.prop('crate', [-1.2, 0, -11.6], { rotY: 0.15, id: 'crate' });
    L.crane([3.1, 2.35, -10.55]);
    // Records room: plate, filing, mezzanine with exit
    L.plate('p2', { x: 1.6, z: -16.2, need: 40, size: 1.3, onChange: (on, LL) => { if (on) { LL.setStage(2); LL.say('Special delivery. The records room thanks you.', { id: 'delivered' }); } } });
    L.box([-4, 0, -21], [4, 1.6, -19.2], 'concrete');
    L.box([-4, 1.55, -19.26], [4, 1.62, -19.18], 'trim', { collide: false });
    D.railing(-3.8, -19.35, -1.0, -19.35, 1.6, 0.95);
    D.railing(1.0, -19.35, 3.8, -19.35, 1.6, 0.95);
    for (const x of [-3.2, 2.9]) L.box([x - 0.45, 0, -18.4], [x + 0.45, 1.3, -17.8], 'metalDark');
    L.exit(0, -21, 'n', { y: 1.6, w: 1.3, h: 2.2, wallMat: 'paintWhite' });
    L.spot([0, 3.12, -12.2], [0, 0, -12.2], { intensity: 24, angle: 1.0, color: 0xf6f8ff });
    L.spot([0, 3.12, -17], [1.6, 0, -16.5], { intensity: 26, angle: 1.0, color: 0xf6f8ff });
    L.panel(-2.0, 3.2, -16.8, 1.2, 0.6, { intensity: 6 });

    // ---------------------------------------------------------------- narration triggers
    L.trigger([-2, 0, -9.9], [2, 3, -6.5], (LL) => LL.say(['Someone has left their coffee in the doorway.', 'It is not as big as it looks. You are simply standing too close to it.'], { id: 'mugnear' }));
    L.trigger([-4, 0, -14], [4, 3, -10.25], (LL) => { LL.setStage(1); LL.say(['The records room is behind the glass. The plate in there is expecting a delivery.', 'There is a hatch. Hatches are for things.'], { id: 'copy' }); });
    L.checkpoint([-4, 0, -14], [4, 3, -10.25], [0, 0, -11], 0);
    L.trigger([-4, 0, -19], [4, 3, -14.1], (LL) => LL.say('Up you go. Mind the filing.', { id: 'rec' }));
  },
  onStart(L) {
    L.say(['Chapter two. The office.', 'Nobody works here at this hour. Nobody works here at any hour, actually. It is a dream.'], { id: 'intro', delay: 1.5 });
  },
  onRelease(L, p) {
    if (p.id === 'mug' && p.scale < 6 && !L.flags.mugSmall) {
      L.flags.mugSmall = true; L.setStage(1);
      L.say('There. A perfectly ordinary mug again. Perspective is a wonderful solvent.', { id: 'mugdone' });
    }
  },
};

function glassLook(L) {
  // translucent partition material (collides via static boxes)
  return L.game.glassMaterial || (L.game.glassMaterial = makeGlass());
}
function makeGlass() {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xd6ecf5, roughness: 0.05, transparent: true, opacity: 0.22, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false });
  m.userData.tile = 1; m.userData.sound = 'glass'; m.userData.noShadow = true;
  return m;
}
function emissiveMatSafe(L, c, i) { return emissiveMat(c, i); }
function colorMatSafe(L, c) { return colorMat(c, 0.2); }
