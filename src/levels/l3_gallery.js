// Chapter 3 — The Gallery. Anamorphic illusions: fragments that become real from one viewpoint.
import * as THREE from 'three';
import { mat } from '../engine/materials.js';
import { worldBox, mesh, roundedBox } from '../engine/geometry.js';

function stairs({ x, zStart, steps, rise, run, width, material = 'woodPale' }) {
  const list = [];
  for (let i = 0; i < steps; i++) {
    const z0 = zStart - (i + 1) * run, z1 = zStart - i * run;
    list.push({ min: [x - width / 2, 0, z0], max: [x + width / 2, (i + 1) * rise, z1], material });
  }
  return list;
}

export default {
  id: 'gallery',
  title: 'The Gallery',
  subtitle: 'Every picture is a point of view.',
  mood: 'gallery', ambience: 'gallery', reverb: 3.2,
  par: [100, 210],
  cranes: 3,
  hints: [
    'Stand on the glowing eye marked on the floor by the viewing bench and look at the floating fragments. When they line up perfectly, they become real.',
    'Put the new cube on the pressure plate by the far door.',
    'The fragments in this hall line up from the top of the tall white pedestal. Enlarge the die from the display case so you can climb onto the pedestal, then look at the fragments.',
    'Climb your new staircase to the balcony.',
  ],
  build(L) {
    const D = L.decor;
    // ---------------------------------------------------------------- Hall 1
    L.room({ x0: -7, x1: 7, z0: -6, z1: 4, h: 5, floor: 'marble', wall: 'paintWhite', ceil: 'paintWhite', crown: true,
      openings: { n: [{ at: 0, w: 1.6, h: 2.6 }] } });
    L.spawn([0, 0, 2.8], 0);
    L.probe(0, 2, -1);
    L.envIntensity = 0.6;
    for (const [x, z] of [[-6.4, -5.4], [6.4, -5.4], [-6.4, 3.4], [6.4, 3.4]]) D.column(x, z, { h: 5, r: 0.26, material: 'paintWhite' });
    // skylights
    for (const z of [-3, 1.5]) L.panel(0, 5, z, 3.0, 1.2, { intensity: 9, color: 0xf4f8ff, emissive: 3.5 });
    D.painting(-6.97, 2.0, -2.0, Math.PI / 2, { w: 1.6, h: 1.1, seed: 21, style: 'landscape', light: true });
    D.painting(-6.97, 2.0, 1.6, Math.PI / 2, { w: 1.0, h: 1.3, seed: 22, style: 'abstract' });
    D.painting(6.97, 2.0, 0.5, -Math.PI / 2, { w: 1.8, h: 1.2, seed: 23, style: 'stripes', light: true });
    D.painting(3.6, 2.2, 3.97, Math.PI, { w: 1.3, h: 0.9, seed: 24, style: 'eye' });
    D.painting(-3.6, 2.2, 3.97, Math.PI, { w: 1.3, h: 0.9, seed: 25, style: 'landscape' });
    D.sign('FRAGMENTS OF A BLOCK, SEEN CORRECTLY', -3.2, 1.0, 1.4, Math.PI * 0.25, { w: 0.9, h: 0.14, bg: '#f7f4ee', color: '#3a3530', font: 'italic 600 40px Cormorant, Georgia' });
    D.bench(-4.2, 2.5, Math.PI * 0.25, { w: 1.6 });
    D.rug(0, -0.5, 4.5, 3.0, 0x384a5c);
    // sculpture plinth with crane
    L.box([5.3, 0, 2.3], [6.3, 1.0, 3.3], 'paintWhite');
    L.crane([5.8, 1.3, 2.8]);

    // Illusion 1: perception block
    const bounds1 = new THREE.Box3(new THREE.Vector3(-6.8, 0.05, -5.8), new THREE.Vector3(6.8, 4.8, 3.8));
    L.propIllusion('cube', { pos: [0.6, 0, -3.2], scale: 3.0, rotY: 0.5 }, [-4.0, 1.64, 1.9], {
      seed: 11, bounds: bounds1, marker: true, chunks: 20, floorY: 0,
      onSolve: (LL) => { LL.setStage(1); LL.say(['You see? It was a block all along.', 'You simply had to stand where the artist stood.'], { id: 'ill1' }); },
    });
    L.plate('p1', { x: 4.4, z: -4.2, need: 150 });
    L.door('d1', { x: 0, z: -6.12, w: 1.6, h: 2.6, plates: ['p1'], sticky: true, leafMat: 'woodDark', frameMat: 'brass' });
    L.spot([0, 4.9, -1.5], [0.6, 0, -3.2], { intensity: 40, angle: 0.8 });
    L.spot([4.4, 4.9, -2.5], [4.4, 0, -4.2], { intensity: 30, angle: 0.7 });

    // ---------------------------------------------------------------- Hall 2 (atrium with balcony)
    L.room({ x0: -7, x1: 7, z0: -22, z1: -6.25, h: 8, floor: 'marble', wall: 'paintWhite', ceil: 'paintWhite', walls: { n: true, s: false, e: true, w: true },
      openings: { n: [{ at: 4, w: 1.5, h: 2.4, y: 3.4 }] } });
    // balcony
    L.box([-7, 3.1, -22], [7, 3.4, -18.6], 'woodDark');
    L.box([-7, 0, -22], [7, 3.1, -21.6], 'paintWhite');
    D.railing(-1.6, -18.75, 6.8, -18.75, 3.4, 1.0);
    L.exit(4, -22, 'n', { y: 3.4, w: 1.5, h: 2.4, wallMat: 'paintWhite' });
    for (const z of [-10, -15]) L.panel(0, 8, z, 3.4, 1.4, { intensity: 10, color: 0xf4f8ff, emissive: 3.5 });
    for (const x of [-6.4, 6.4]) for (const z of [-7, -21]) D.column(x, z, { h: 8, r: 0.3, material: 'paintWhite' });
    D.painting(6.97, 2.2, -11, -Math.PI / 2, { w: 2.2, h: 1.4, seed: 31, style: 'landscape', light: true });
    D.painting(6.97, 2.2, -15.5, -Math.PI / 2, { w: 1.2, h: 1.6, seed: 32, style: 'abstract' });
    D.painting(-6.97, 5.6, -12, Math.PI / 2, { w: 3.0, h: 1.8, seed: 33, style: 'stripes' });

    // tall pedestal (viewpoint) + display case with the die
    L.box([4.0, 0, -9.0], [5.0, 1.26, -8.0], 'paintWhite');
    L.box([3.98, 1.24, -9.02], [5.02, 1.28, -7.98], 'trim', { collide: false });
    L.box([-6.2, 0, -11.0], [-5.2, 1.0, -10.0], 'paintWhite');
    L.prop('die', [-5.7, 1.0, -10.5], { rotY: 0.3, id: 'die' });
    D.sign('A HIGHER PERSPECTIVE', 4.5, 0.75, -7.98, 0, { w: 0.8, h: 0.12, bg: '#f7f4ee', color: '#3a3530', font: 'italic 600 40px Cormorant, Georgia' });

    // Illusion 2: staircase to the balcony
    const steps = stairs({ x: -3.2, zStart: -8.6, steps: 14, rise: 3.4 / 14, run: 0.71, width: 1.6, material: 'woodPale' });
    const bounds2 = new THREE.Box3(new THREE.Vector3(-6.8, 0.05, -21.5), new THREE.Vector3(6.8, 7.6, -6.5));
    L.illusion({
      view: [4.5, 1.26 + 1.64, -8.5], seed: 23, bounds: bounds2, chunks: 26, marker: false, floorY: 1.26, nearBias: 0.35,
      source: () => {
        const g = new THREE.Group();
        for (const s of steps) {
          const w = s.max[0] - s.min[0], h = s.max[1] - s.min[1], d = s.max[2] - s.min[2];
          g.add(mesh(roundedBox(w, h, d, 0.01, 1), mat(s.material), { pos: [(s.min[0] + s.max[0]) / 2, (s.min[1] + s.max[1]) / 2, (s.min[2] + s.max[2]) / 2] }));
        }
        return g;
      },
      onSolid: (LL) => { for (const s of steps) LL.solidBox(s.min, s.max, s.material); },
      onSolve: (LL) => { LL.setStage(3); LL.say(['Stairs. From nothing.', 'I would applaud, but I have no hands.'], { id: 'ill2' }); },
    });
    L.crane([-5.2, 3.7, -14.2]);
    L.crane([-6.3, 3.9, -21.0]);
    L.spot([0, 7.9, -12], [0, 0, -12], { intensity: 45, angle: 0.9 });
    L.spot([4.5, 7.9, -19], [4, 3.4, -20], { intensity: 35, angle: 0.8 });
    D.dust(0, 3, -13, 12, 6, 12, 260);
    D.shaft(0, 5.5, -10, 3.2, 6, 3.2, 0, 0.12, 0xf4f8ff, 0.05);
    D.shaft(0, 5.5, -15, 3.2, 6, 3.2, 0, -0.1, 0xf4f8ff, 0.05);

    L.trigger([-7, 0, -3], [0, 4, 4], (LL) => LL.say(['Ah, an installation. It is called "Fragments of a Block, Seen Correctly".', 'The bench is, I am told, a very strong hint.'], { id: 'inst' }));
    L.trigger([-7, 0, -10], [7, 4, -6.3], (LL) => { LL.setStage(2); LL.say(['This piece requires a higher perspective.', 'Literally. The artist was quite tall.'], { id: 'hall2' }); });
    L.checkpoint([-7, 0, -10], [7, 4, -6.3], [0, 0, -7.5], 0);
  },
  onStart(L) {
    L.say(['Chapter three. The gallery.', 'Please do not touch the art. Unless it is a puzzle. Then touch it immediately.'], { id: 'intro', delay: 1.5 });
  },
  onPlateChange(L, p) { if (p.active) L.setStage(2); },
};
