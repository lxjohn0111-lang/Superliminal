// Chapter 6 — The Deep End. Floating objects, rafts, and a plate at the bottom of a diving pool.
import { Decor } from '../game/decor.js';

export default {
  id: 'pool',
  title: 'The Deep End',
  subtitle: 'Mind the water. It is deeper than it looks.',
  mood: 'pool', ambience: 'pool', reverb: 4.5,
  par: [120, 250],
  cranes: 3,
  floorY: 0,
  hints: [
    'The pool float on the lounge chair floats. Grab it up close, then drop it far out over the pool. A big enough float makes a raft you can walk across.',
    'The exit opens when something heavy rests on the plate at the bottom of the diving pool. Grab the vase up close and drop it onto the plate from the edge.',
  ],
  build(L) {
    const D = L.decor;
    L.envIntensity = 0.7;
    L.probe(0, 1.5, -10);
    L.spawn([0, 0, 2.6], 0);
    L.killY = -12;
    const WY = -0.35;
    const caust = Decor.causticMaterial('mosaic', WY);
    const caustT = Decor.causticMaterial('tilesBlue', WY);
    L.causticMats = [caust, caustT];

    // ---------------------------------------------------------------- near deck
    L.room({ x0: -8, x1: 8, z0: -3, z1: 4, h: 5, floor: 'tiles', wall: 'tilesBlue', ceil: 'paintWhite', base: false,
      openings: { n: [{ at: 0, w: 12, h: 5 }] }, trimMat: false });
    // pool section (walls only)
    L.room({ x0: -6, x1: 6, z0: -17, z1: -3, h: 5, noFloor: true, wall: 'tilesBlue', ceil: 'paintWhite', base: false, walls: { n: false, s: false, e: true, w: true } });
    // basin
    L.box([-6, -2.9, -17], [6, -2.6, -3], caust);
    L.box([-6.25, -2.6, -17], [-6, 0, -3], caustT); L.box([6, -2.6, -17], [6.25, 0, -3], caustT);
    L.box([-6, -2.6, -3.25], [6, -0.3, -3.0], caustT); L.box([-6, -2.6, -17.0], [6, -0.3, -16.75], caustT);
    L.box([-6, -0.02, -3.25], [6, 0.0, -3.0], 'trim', { collide: false });
    L.water({ x0: -6, x1: 6, z0: -17, z1: -3, y: WY });
    // lane lines on the pool floor
    for (const x of [-3, 0, 3]) L.box([x - 0.12, -2.6, -15.5], [x + 0.12, -2.59, -4.5], 'blackPlastic', { collide: false });

    // near-deck dressing
    const lounger = (x, z, r) => {
      L.box([x - 0.35, 0, z - 0.95], [x + 0.35, 0.32, z + 0.95], 'whitePlastic');
      L.box([x - 0.33, 0.32, z - 0.9], [x + 0.33, 0.38, z + 0.9], 'fabricCream', { collide: false });
    };
    lounger(-4.2, 1.6); lounger(-2.6, 1.6); lounger(4.2, 1.6);
    L.prop('raft', [-4.2, 0.38, 1.6], { rotY: Math.PI / 2, id: 'raft' });
    L.prop('ball', [2.4, 0, 2.8]);
    L.prop('duck', [-2.6, 0.38, 1.3], { rotY: 0.8 });
    // lifeguard chair with crane
    L.box([6.6, 0, -1.4], [7.6, 2.2, -0.4], 'whitePlastic');
    L.box([6.55, 2.2, -1.45], [7.65, 2.3, -0.35], 'fabricRed');
    L.crane([7.1, 2.65, -0.9]);
    D.sign('NO DIVING · NO RUNNING · NO SWIMMING', 0, 3.4, 3.97, Math.PI, { w: 3.2, h: 0.3, bg: '#f2f6f8', color: '#c0392b', font: '700 52px Inter, Arial' });
    D.plant(-7.4, 3.4, { size: 1.2, seed: 61 }); D.plant(7.4, 3.4, { size: 1.2, seed: 62 });
    L.crane([0, 0.9, -10.0]);

    // ---------------------------------------------------------------- far deck with diving pool
    L.room({ x0: -8, x1: 8, z0: -27, z1: -17, h: 5, noFloor: true, wall: 'tilesBlue', ceil: 'paintWhite', base: false,
      openings: { s: [{ at: 0, w: 12, h: 5 }], n: [{ at: 4, w: 1.5, h: 2.4 }] }, trimMat: false });
    L.box([-8.25, -0.3, -27.25], [8.25, 0, -24.5], 'tiles');
    L.box([-8.25, -0.3, -19.5], [8.25, 0, -16.75], 'tiles');
    L.box([-8.25, -0.3, -24.5], [-3, 0, -19.5], 'tiles');
    L.box([3, -0.3, -24.5], [8.25, 0, -19.5], 'tiles');
    L.box([-3, -3.9, -24.5], [3, -3.6, -19.5], caust);
    L.box([-3.25, -3.6, -24.75], [-3, -0.3, -19.25], caustT); L.box([3, -3.6, -24.75], [3.25, -0.3, -19.25], caustT);
    L.box([-3, -3.6, -24.75], [3, -0.3, -24.5], caustT); L.box([-3, -3.6, -19.5], [3, -0.3, -19.25], caustT);
    L.water({ x0: -3, x1: 3, z0: -24.5, z1: -19.5, y: WY });
    L.plate('p1', { x: 0, y: -3.6, z: -22, need: 150, size: 1.6 });
    L.door('d1', { x: 4, z: -27.12, w: 1.5, h: 2.4, plates: ['p1'], sticky: true });
    L.exit(4, -27, 'n', { y: 0, w: 1.5, h: 2.4, wallMat: 'tilesBlue' });
    // diving board
    L.box([-0.5, 0, -18.8], [0.5, 1.0, -17.9], 'whitePlastic');
    L.box([-0.35, 1.0, -20.6], [0.35, 1.08, -17.9], 'whitePlastic');
    // table with vase
    L.box([-6.4, 0, -25.8], [-5.2, 0.75, -24.6], 'woodPale');
    L.prop('vase', [-5.8, 0.75, -25.2], { id: 'vase' });
    L.box([-8, 0, -21], [-6.8, 2.1, -19], 'woodPale');
    L.crane([-7.4, 2.45, -20.0]);
    D.plant(7.4, -26.3, { size: 1.2, seed: 63 });
    D.sign('DEEP END · 3.5 m', 0, 2.4, -26.97, 0, { w: 1.6, h: 0.3, bg: '#f2f6f8', color: '#1b4f72', font: '700 70px Inter, Arial' });

    // light: skylight panels + strong spots for caustics/shine
    for (const z of [0.5, -7, -13, -22]) L.panel(0, 5, z, 3.0, 1.2, { intensity: 10, color: 0xf2fbff, emissive: 4 });
    L.ambient(0xd8f0ff, 0x6a8a92, 0.35);
    L.spot([0, 4.9, 0.5], [0, 0, 0.5], { intensity: 40, angle: 1.0, color: 0xf2fbff });
    L.spot([0, 4.9, -10], [0, -2.6, -10], { intensity: 55, angle: 1.0, color: 0xf2fbff });
    L.spot([0, 4.9, -22], [0, -1, -22], { intensity: 45, angle: 1.0, color: 0xf2fbff });
    D.shaft(0, 2.5, -9, 3, 5, 3, 0, 0.1, 0xe8f8ff, 0.04);

    L.trigger([-6, 0, -3], [6, 3, 0], (LL) => LL.say(['I would not recommend swimming.', 'You are dreaming, and dreams have notoriously poor lifeguards.'], { id: 'edge' }));
    L.trigger([-8, 0, -27], [8, 3, -17.4], (LL) => { LL.setStage(1); LL.say(['You crossed the water without getting wet. Very lucid of you.', 'The exit is locked. The plate at the bottom of the diving pool, however, is very much open to suggestions.'], { id: 'far' }); });
    L.checkpoint([-8, 0, -27], [8, 3, -17.4], [0, 0, -18.5], 0);
  },
  onStart(L) {
    L.say(['Chapter six. The deep end.', 'Nobody has ever swum here. The water is purely decorative. And quite deep.'], { id: 'intro', delay: 1.5 });
  },
  onRelease(L, p) { if (p.id === 'raft' && p.scale > 4) L.say('Now that is a raft. Do step aboard.', { id: 'raft' }); },
};
