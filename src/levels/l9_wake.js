// Chapter 9 — Wake. One heavy alarm clock, a hall of everything you learned, and a door you have to see to believe.
import * as THREE from 'three';
import { mat, emissiveMat } from '../engine/materials.js';
import { mesh, roundedBox } from '../engine/geometry.js';
import { buildPropMesh } from '../game/catalog.js';

export default {
  id: 'wake',
  title: 'Wake',
  subtitle: 'Time to get up.',
  mood: 'wake', ambience: 'office', reverb: 2.6,
  par: [90, 190],
  cranes: 3,
  floorY: 0,
  hints: [
    'The WAKE plate needs a very heavy alarm clock. Grab the clock on the nightstand from up close, walk to the far side of the room, and drop it onto the plate.',
    'Walk to the far end of the hall. The exit is there — you just have to look at it from the right spot. Somewhere in the middle of the hall.',
  ],
  build(L) {
    const D = L.decor;
    L.envIntensity = 0.6;
    L.probe(0, 1.6, -4);
    L.spawn([-0.6, 0, 0.6], Math.PI * 0.12);

    // ---------------------------------------------------------------- Bedroom
    L.room({ x0: -3.5, x1: 3.5, z0: -10, z1: 1.5, h: 4.0, floor: 'carpetWarm', wall: 'wallpaper', ceil: 'paintWhite', crown: true,
      openings: { n: [{ at: 1.6, w: 1.4, h: 2.3 }] } });
    D.bed(-2.45, -0.4, Math.PI / 2);
    D.nightstand(-3.0, 0.75, Math.PI / 2);
    L.prop('clock', [-3.0, 0.5, 0.75], { rotY: Math.PI / 2, id: 'clock' });
    D.floorLamp(3.0, 1.0, { intensity: 4 });
    D.window(3.47, 1.9, -3.0, -Math.PI / 2, 2.0, 1.5, 0xffd9a8);
    D.window(3.47, 1.9, -7.0, -Math.PI / 2, 2.0, 1.5, 0xffd9a8);
    D.rug(0, -4, 3.6, 2.6, 0x6b4b5a);
    D.painting(-3.47, 2.0, -5.0, Math.PI / 2, { w: 1.2, h: 0.8, seed: 91, style: 'landscape' });
    D.shelf(-3.1, -8.5, Math.PI / 2, { w: 1.4, h: 1.8, seed: 92 });
    D.plant(3.0, -9.4, { size: 1.0, seed: 93 });
    L.prop('pillow', [-2.45, 0.56, -1.2]);
    L.prop('book', [-3.0, 0.5, 0.4], { variant: 3, rotY: 1.0 });
    L.plate('wake', { x: -1.2, z: -8.3, need: 1000, size: 1.6, label: 'WAKE' });
    L.door('d1', { x: 1.6, z: -10.1, w: 1.4, h: 2.3, plates: ['wake'], sticky: true, leafMat: 'woodPale', frameMat: 'brass' });
    L.crane([3.0, 2.3, 1.0]);
    // dawn light through the windows
    L.ambient(0xffe8d0, 0x806858, 0.35);
    L.spot([3.25, 2.5, -3], [0.2, 0, -3.4], { intensity: 26, angle: 0.75, penumbra: 0.6, color: 0xffc98a });
    L.spot([3.25, 2.5, -7], [0.2, 0, -7.4], { intensity: 26, angle: 0.75, penumbra: 0.6, color: 0xffc98a });
    L.spot([0, 3.95, -1.0], [0, 0, -1.5], { intensity: 20, angle: 1.0, color: 0xfff1df });
    D.dust(0, 1.8, -5, 6, 3, 10, 200, 0xffe6c8);

    // ---------------------------------------------------------------- The hall of everything
    L.room({ x0: -3, x1: 3, z0: -36, z1: -10.35, h: 6, floor: 'marble', wall: 'paintWhite', ceil: 'paintWhite', crown: true, walls: { n: true, s: false, e: true, w: true },
      openings: { n: [{ at: 0, w: 1.6, h: 2.6 }] } });
    // Exit hidden behind a blank wall until the final illusion is solved.
    L.exit(0, -36, 'n', { y: 0, w: 1.6, h: 2.6, wallMat: 'paintWhite', sign: false });
    const exhibits = [['cube', 'I. Intake', 1.6], ['mug', 'II. Overtime', 3.0], ['die', 'III. The Gallery', 2.2], ['lantern', 'IV. Nocturne', 1.6], ['echo', 'V. Echoes', 1.6], ['duck', 'VI. The Deep End', 2.6], ['toydoor', 'VII. The Nursery', 1.2], ['plank', 'VIII. The Long Fall', 0.6]];
    exhibits.forEach(([type, label, sc], i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -13 - Math.floor(i / 2) * 5.0 - (side > 0 ? 2.5 : 0);
      const x = side * 2.2;
      L.box([x - 0.45, 0, z - 0.45], [x + 0.45, 1.1, z + 0.45], 'paintWhite');
      const o = buildPropMesh(type);
      o.scale.setScalar(sc); o.position.set(x, 1.1, z); o.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      L.root.add(o);
      if (o.userData.light) o.userData.light.intensity = 2;
      D.sign(label, x, 0.7, z + (side > 0 ? 0 : 0), side > 0 ? -Math.PI / 2 : Math.PI / 2, { w: 0.6, h: 0.12, bg: '#f7f4ee', color: '#3a3530', font: 'italic 600 48px Cormorant, Georgia' });
    });
    for (const z of [-14, -21, -28, -33]) L.panel(0, 6, z, 2.4, 1.0, { intensity: 8, color: 0xf6f8ff, emissive: 3.5, area: z !== -33 });
    L.spot([0, 5.9, -17], [0, 0, -17], { intensity: 30, angle: 0.95 });
    L.spot([0, 5.9, -27], [0, 0, -27], { intensity: 30, angle: 0.95 });
    L.crane([2.2, 2.6, -32.5]);
    L.crane([-2.2, 1.6, -11.2]);
    D.dust(0, 2.5, -23, 5, 4, 24, 220);

    L.flags.blocker = L.solidBox([-0.8, 0, -36.25], [0.8, 2.6, -36.0], 'paintWhite');
    // Final illusion: a glowing door frame at the end of the hall.
    const doorFrame = () => {
      const g = new THREE.Group();
      const m = emissiveMat(0xfff4dc, 2.2);
      g.add(mesh(new THREE.BoxGeometry(0.14, 2.75, 0.14), m, { pos: [-0.87, 1.375, -35.85] }));
      g.add(mesh(new THREE.BoxGeometry(0.14, 2.75, 0.14), m, { pos: [0.87, 1.375, -35.85] }));
      g.add(mesh(new THREE.BoxGeometry(1.88, 0.14, 0.14), m, { pos: [0, 2.68, -35.85] }));
      const sgn = buildPropMesh('cube'); sgn.scale.set(1.4, 0.6, 0.3); sgn.position.set(0, 3.0, -35.9); g.add(sgn);
      return g;
    };
    const bounds = new THREE.Box3(new THREE.Vector3(-2.8, 0.1, -35.8), new THREE.Vector3(2.8, 5.8, -11));
    L.illusion({
      view: [0, 1.64, -19.0], seed: 77, bounds, chunks: 22, marker: false, floorY: 0, nearBias: 0.5,
      source: doorFrame,
      onSolid: (LL) => {
        const b = LL.flags.blocker; b.mesh.removeFromParent(); LL.physics.removeCollider(b.col);
        const f = doorFrame(); LL.root.add(f);
      },
      onSolve: (LL) => { LL.setStage(2); LL.say(['There it is. It was always there.', 'You just had to look at it properly.'], { id: 'final' }); },
    });

    L.trigger([-3, 0, -16], [3, 3, -10.4], (LL) => { LL.setStage(1); LL.say(['Everything you learned tonight, on display.', 'Please do not take any of it home. Except the important part.'], { id: 'hall' }); });
    L.checkpoint([-3, 0, -16], [3, 3, -10.4], [0, 0, -11.2], 0);
    L.trigger([-3, 0, -35.5], [3, 3, -30], (LL) => LL.say(['There is no door at the end of this hall.', 'There never is. Not until you see it.'], { id: 'end' }));
    L.trigger([-1, 0, -40], [1, 3, -37], (LL) => LL.say('Good morning.', { id: 'gm', interrupt: true }));
  },
  onStart(L) {
    L.say(['Chapter nine. Your session is almost over.', 'Time to wake up. The plate by the door says WAKE.', 'It is expecting an alarm clock of considerable conviction.'], { id: 'intro', delay: 1.5 });
  },
  onGrab(L, p) { if (p.id === 'clock') L.say('Hold it close. Then think big.', { id: 'clk' }); },
  onDoorOpen(L, d) { if (d.id === 'd1') L.say('Good. One last walk.', { id: 'opened' }); },
};
