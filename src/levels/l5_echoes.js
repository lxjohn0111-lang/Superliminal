// Chapter 5 — Echoes. Resonant blocks that duplicate when grabbed: fill plates, then build your own staircase.
import * as THREE from 'three';

export default {
  id: 'echoes',
  title: 'Echoes',
  subtitle: 'Say it again. Say it again.',
  mood: 'echo', ambience: 'warehouse', reverb: 4.0,
  par: [110, 230],
  cranes: 3,
  floorY: 0,
  hints: [
    'The glowing block on the pedestal duplicates every time you grab it. Make three big copies — one for each plate.',
    'Build a staircase to the exit ledge: a small block, then a bigger one beside it, then bigger still. Each step should be no higher than your waist above the last.',
  ],
  build(L) {
    const D = L.decor;
    L.envIntensity = 0.9;
    L.probe(0, 2.5, -4);
    L.spawn([0, 0, 2.6], 0);

    // ---------------------------------------------------------------- Atrium
    L.room({ x0: -8, x1: 8, z0: -10, z1: 4, h: 8, floor: 'concrete', wall: 'concrete', ceil: 'concreteDark', base: false,
      openings: { n: [{ at: 0, w: 1.8, h: 2.6 }] } });
    // concrete pedestal with the resonant source block
    L.box([-0.6, 0, -2.6], [0.6, 1.0, -1.4], 'concreteDark');
    L.prop('echo', [0, 1.0, -2.0], { frozen: true, id: 'src1' });
    L.point([0, 1.6, -2.0], { color: 0x8fd0ff, intensity: 3, distance: 5 });
    for (const [i, x] of [[1, -4.5], [2, 0], [3, 4.5]]) L.plate('p' + i, { x, z: -7.2, need: 50, size: 1.2 });
    L.door('d1', { x: 0, z: -10.1, w: 1.8, h: 2.6, plates: ['p1', 'p2', 'p3'], sticky: true });
    // high beam ledge with crane
    L.box([6.6, 3.0, -6.5], [8, 3.25, -1.5], 'concreteDark');
    L.crane([7.4, 3.65, -4.0]);
    // alcove above the entrance
    L.box([-1.2, 2.2, 3.4], [1.2, 2.4, 4], 'concreteDark');
    L.crane([0, 2.75, 3.65]);
    // industrial dressing
    for (const x of [-7.6, 7.6]) for (const z of [-9.6, 3.6]) L.box([x - 0.25, 0, z - 0.25], [x + 0.25, 8, z + 0.25], 'concreteDark');
    for (let z = -8; z <= 2; z += 5) L.box([-8, 7.3, z - 0.2], [8, 7.6, z + 0.2], 'metalDark', { collide: false });
    D.sign('RESONANCE TESTING — PLEASE REPEAT YOURSELF', 0, 4.2, -9.97, 0, { w: 4.2, h: 0.36, bg: '#1d2128', color: '#9fd3ff', font: '600 54px Inter, Arial', glow: 0.6 });
    L.prop('crate', [-6.2, 0, 1.5], { rotY: 0.3 });
    L.prop('cone', [5.8, 0, 2.2]);
    L.prop('cone', [6.3, 0, 1.7], { rotY: 1 });
    L.ambient(0xd8e4ff, 0x5a5650, 1.0);
    L.panel(-5, 8, -5, 2.4, 0.8, { intensity: 10 }); L.panel(5, 8, -5, 2.4, 0.8, { intensity: 10 });
    L.spot([0, 7.9, -2], [0, 0, -2], { intensity: 60, angle: 0.65, color: 0xeaf4ff });
    L.spot([0, 7.9, -7], [0, 0, -7.2], { intensity: 70, angle: 0.95, color: 0xfff1df });
    L.spot([-5, 7.9, 1], [-5, 0, 1], { intensity: 45, angle: 0.9, color: 0xfff1df });
    L.spot([5.5, 7.9, -4], [7, 3, -4], { intensity: 40, angle: 0.8, color: 0xfff1df });
    L.panel(0, 8, 1.5, 2.4, 0.8, { intensity: 8 });
    D.dust(0, 3, -3, 14, 6, 12, 220);
    D.shaft(0, 4.5, -2, 2.0, 7, 2.0, 0, 0, 0xcfe8ff, 0.06);

    // ---------------------------------------------------------------- Shaft room
    L.room({ x0: -5, x1: 5, z0: -24, z1: -10.25, h: 11, floor: 'concrete', wall: 'concrete', ceil: 'concreteDark', base: false, walls: { n: true, s: false, e: true, w: true },
      openings: { n: [{ at: 0, w: 1.5, h: 2.4, y: 4.2 }] } });
    L.box([-5, 0, -24], [5, 4.2, -21.6], 'concreteDark');
    L.box([-5, 4.15, -21.66], [5, 4.22, -21.56], 'metal', { collide: false });
    D.railing(-4.8, -21.75, -1.2, -21.75, 4.2, 1.0);
    D.railing(1.2, -21.75, 4.8, -21.75, 4.2, 1.0);
    L.exit(0, -24, 'n', { y: 4.2, w: 1.5, h: 2.4, wallMat: 'concrete' });
    L.box([-3.9, 0, -13.1], [-2.9, 1.0, -12.1], 'concreteDark');
    L.prop('echo', [-3.4, 1.0, -12.6], { frozen: true, id: 'src2' });
    L.point([-3.4, 1.6, -12.6], { color: 0x8fd0ff, intensity: 3, distance: 5 });
    // high ledge with crane
    L.box([-5, 6.0, -16.5], [-3.8, 6.2, -14.5], 'concreteDark');
    L.crane([-4.4, 6.6, -15.5]);
    L.spot([0, 10.9, -16], [0, 0, -17], { intensity: 70, angle: 0.8, color: 0xfff1df });
    L.spot([0, 10.9, -12], [-3.4, 0, -12.6], { intensity: 30, angle: 0.5, color: 0xcfe8ff });
    D.shaft(0, 7, -16, 2.6, 8, 2.6, 0, 0.05, 0xfff1df, 0.05);
    D.sign('EXIT ↑', 0, 7.2, -21.6, 0, { w: 1.0, h: 0.3, bg: '#1d2128', color: '#7dffb0', font: '700 90px Inter, Arial', glow: 0.8 });

    L.trigger([-5, 0, -16], [5, 4, -10.3], (LL) => { LL.setStage(1); LL.say(['The exit is rather high up.', 'I suggest a staircase. Of your own composition.'], { id: 'shaft' }); });
    L.checkpoint([-5, 0, -16], [5, 4, -10.3], [0, 0, -11.5], 0);
  },
  onStart(L) {
    L.say(['Chapter five. The echo chamber.', 'That glowing block resonates. Take from it as many times as you like.', 'It does not mind. It barely notices.'], { id: 'intro', delay: 1.5 });
  },
  onDoorOpen(L, d) { if (d.id === 'd1') L.say('Three is a crowd. And a crowd, it turns out, is a door.', { id: 'd1' }); },
};
