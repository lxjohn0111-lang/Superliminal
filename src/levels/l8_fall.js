// Chapter 8 — The Long Fall. Floating islands of office over a sea of cloud: planks, an illusion bridge, a stool.
import * as THREE from 'three';
import { mat } from '../engine/materials.js';
import { mesh, roundedBox } from '../engine/geometry.js';

function island(L, x0, z0, x1, z1, y, top = 'carpet') {
  L.box([x0, y - 0.25, z0], [x1, y, z1], top);
  L.box([x0 + 0.15, y - 1.8, z0 + 0.15], [x1 - 0.15, y - 0.25, z1 - 0.15], 'concrete');
  L.box([x0 + 0.6, y - 2.6, z0 + 0.6], [x1 - 0.6, y - 1.8, z1 - 0.6], 'concreteDark');
}

export default {
  id: 'fall',
  title: 'The Long Fall',
  subtitle: 'Do not look down. Actually — do.',
  mood: 'void', ambience: 'void', reverb: 5.0,
  par: [120, 250],
  cranes: 3,
  floorY: 0,
  hints: [
    'Grab the plank while standing right at the desk. Walk to the edge of the island, look down across the gap toward the lower island, and drop it — it should land resting on both islands.',
    'From the second island, find the spot where the floating fragments line up into a staircase. Try near the lone lamp.',
    'Use the step stool to climb onto the last island. Grab it close, drop it a few metres away against the wall so the tall step faces the wall.',
  ],
  build(L) {
    const D = L.decor;
    const scene = L.game.renderer.scene;
    scene.fog = new THREE.Fog(0xc4d8ee, 70, 340);
    const sky = D.sky('day');
    sky.material.uniforms.sunDir.value.set(-0.4, 0.35, -0.85).normalize();
    sky.material.uniforms.sunSize.value = 0.9994;
    D.clouds(70, { y0: -45, y1: -18, r: 160, seed: 8, opacity: 0.85, scale: [25, 60] });
    D.clouds(18, { y0: 25, y1: 50, r: 200, seed: 9, opacity: 0.5, scale: [40, 80] });
    L.envIntensity = 0.75;
    L.probe(0, 2, -10);
    L.killY = -22;
    L.spawn([0, 0, 2.5], 0);

    // A: start island — an office floor that came loose
    island(L, -4, -4, 4, 4, 0);
    D.desk(0.6, -2.0, 0, { w: 2.4, d: 0.8 });
    L.prop('plank', [0.6, 0.75, -2.0], { rotY: 0, id: 'plank' });
    D.officeChair(-0.4, -2.75, Math.PI);
    D.plant(-3.4, 3.3, { size: 1.0, seed: 81 });
    D.floorLamp(-3.3, -3.3, { light: false });
    L.box([2.8, 0, 2.9], [3.8, 2.3, 3.8], 'metalDark');
    L.crane([3.3, 2.65, 3.35]);
    // lone door frame at the edge
    for (const x of [-1.25, 1.25]) L.box([x - 0.06, 0, 3.7], [x + 0.06, 2.3, 3.82], 'trim');
    L.box([-1.31, 2.3, 3.7], [1.31, 2.42, 3.82], 'trim');

    // B: second island, 6 m gap
    island(L, -4, -17, 4, -9, -0.6);
    D.floorLamp(3.0, -10.0, { y: -0.6, light: true, intensity: 3 });
    D.bench(-2.5, -10.2, Math.PI / 2, { w: 1.4, y: -0.6 });
    D.plant(-3.3, -16.2, { y: -0.6, size: 0.9, seed: 82 });
    // E: side island with a crane (needs the plank again)
    island(L, 9, -16, 12.5, -12, 0, 'woodfloor');
    L.crane([10.8, 1.0, -14.0]);
    D.plant(11.8, -15.2, { size: 0.8, seed: 83 });

    // Illusion staircase: B -> C (8 m, +3 m)
    const steps = [];
    for (let i = 0; i < 14; i++) steps.push({ min: [-0.8, -0.75 + i * (3.6 / 14), -17 - (i + 1) * (9 / 14)], max: [0.8, -0.6 + (i + 1) * (3.6 / 14), -17 - i * (9 / 14)] });
    const bounds = new THREE.Box3(new THREE.Vector3(-14, -6, -40), new THREE.Vector3(14, 14, -6));
    L.illusion({
      view: [3.0, 1.04, -10.6], seed: 51, bounds, chunks: 26, marker: false, floorY: -0.6, nearBias: 0.4,
      source: () => {
        const g = new THREE.Group();
        for (const s of steps) {
          const w = s.max[0] - s.min[0], h = s.max[1] - s.min[1], d = s.max[2] - s.min[2];
          g.add(mesh(roundedBox(w, h, d, 0.02, 1), mat('marble'), { pos: [(s.min[0] + s.max[0]) / 2, (s.min[1] + s.max[1]) / 2, (s.min[2] + s.max[2]) / 2] }));
        }
        return g;
      },
      onSolid: (LL) => { for (const s of steps) LL.solidBox(s.min, s.max, 'marble'); },
      onSolve: (LL) => { LL.setStage(2); LL.say(['A bridge made of paying attention.', 'The best kind. Also the only kind, out here.'], { id: 'bridge' }); },
    });
    L.crane([-1.35, 2.6, -22.5]);

    // C: high island (y = 3) and D: higher still (y = 5.4) with the exit
    island(L, -3, -34, 3, -26, 3);
    L.box([-3, 3, -34.2], [3, 5.4, -34], 'concrete');
    L.prop('stool', [1.6, 3, -28.0], { rotY: 0, id: 'stool' });
    island(L, -3, -41, 3, -34, 5.4, 'woodfloor');
    L.box([-2.85, 3.0, -40.85], [2.85, 3.6, -34.2], 'concrete');
    L.exit(0, -41, 'n', { y: 5.4, w: 1.5, h: 2.4, wallMat: 'paintWhite' });
    D.floorLamp(-2.2, -35.2, { y: 5.4, light: false });

    L.ambient(0xd9e8ff, 0xb0a890, 0.5);
    L.sun([0.45, -0.8, 0.55], { color: 0xfff1d8, intensity: 3.0, size: 26, center: [0, 0, -18] });

    L.checkpoint([-4, -1.6, -17], [4, 2.4, -9], [0, -0.6, -10], 0);
    L.checkpoint([-3, 2, -34], [3, 6, -26], [0, 3, -27], 0);
    L.trigger([-4, -1.6, -17], [4, 2.4, -9], (LL) => { LL.setStage(1); LL.say(['There is no bridge to the next island.', 'Not from here, anyway.'], { id: 'onB' }); });
    L.trigger([-3, 2, -34], [3, 6, -26], (LL) => LL.say('Nearly there. One more step. Possibly a stool.', { id: 'onC' }));
  },
  onStart(L) {
    L.say(['Chapter eight. The long fall.', 'The architect of this part of the clinic was, I am told, an optimist.', 'If you fall, you will simply wake up a little further back. Dreams are forgiving like that.'], { id: 'intro', delay: 1.5 });
  },
  onRelease(L, p) { if (p.id === 'plank' && p.scale > 5) L.say('A bridge. Or a very long shelf. Either way, do walk on it.', { id: 'plank' }); },
};
