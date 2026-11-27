// Chapter 4 — Nocturne. A night garden: light sensors that bloom when a (resized) lantern shines on them.
import * as THREE from 'three';

export default {
  id: 'nocturne',
  title: 'Nocturne',
  subtitle: 'Bring your own light.',
  mood: 'garden', ambience: 'garden', reverb: 1.2,
  par: [120, 240],
  cranes: 3,
  floorY: 0,
  noAO: true, // open night sky: screen-space AO would smear onto the background
  hints: [
    'The flower on top of the stone pillar opens when enough light reaches it. Grab the paper lantern up close, then drop it a couple of steps in front of the pillar from far away, so it lands huge and can shine up at the flower.',
    'Carry the lantern with you through the hedge maze. A moon orb is waiting in the far west corridor.',
    'Two flowers, two lights. Or one very, very big lantern placed exactly between them.',
  ],
  build(L) {
    const D = L.decor;
    const scene = L.game.renderer.scene;
    scene.fog = new THREE.FogExp2(0x0c1428, 0.028);
    D.sky('night');
    L.envIntensity = 0.6;
    L.probe(0, 2, 0);
    L.killY = -20;
    L.spawn([0, 0, 5.5], 0);

    // ground + paths
    L.box([-15, -0.4, -34], [15, 0, 9], 'grass');
    L.box([-1.1, 0, -33], [1.1, 0.02, 8], 'flagstone', { collide: false });
    L.box([-8, 0, -1.1], [8, 0.02, 1.1], 'flagstone', { collide: false });
    // perimeter hedges + tall barrier above them
    D.hedge(-14.8, -32.8, -14, 8.8, 2.8); D.hedge(14, -32.8, 14.8, 8.8, 2.8);
    D.hedge(-14.8, 8, 14.8, 8.8, 2.8);
    D.hedge(-14.8, -32.8, -0.75, -32, 2.8); D.hedge(0.75, -32.8, 14.8, -32, 2.8);
    L.barrier([-16, 2.8, -34], [16, 12, -32]); L.barrier([-16, 2.8, 8], [16, 12, 10]);
    L.barrier([-16, 2.8, -34], [-14, 12, 10]); L.barrier([14, 2.8, -34], [16, 12, 10]);

    // ---------------------------------------------------------------- Zone A: courtyard
    D.hedge(-14, -6.4, -1.2, -5.6, 2.6); D.hedge(1.2, -6.4, 14, -5.6, 2.6);
    L.box([-1.6, 0, -6.4], [-1.2, 3.0, -5.6], 'concreteDark'); L.box([1.2, 0, -6.4], [1.6, 3.0, -5.6], 'concreteDark');
    L.door('g1', { x: 0, z: -6.0, w: 2.4, h: 2.6, style: 'lift', sticky: true, leafMat: 'metalDark', frameMat: 'metalDark', cond: (LL) => LL.sensorOn('s1') });
    L.box([2.1, 0, -5.2], [2.7, 2.2, -4.6], 'concrete');
    L.lightSensor('s1', { x: 2.4, y: 2.2, z: -4.9, need: 3.0, onChange: (on, LL) => { if (on) { LL.setStage(1); LL.say(['Bigger light, bigger bloom.', 'Horticulture is mostly geometry.'], { id: 'bloom1' }); } } });
    D.bench(3.6, 2.2, Math.PI, { w: 1.6 });
    L.prop('lantern', [3.6, 0.48, 2.2], { id: 'lantern' });
    D.fountain(-6.5, 0.8, 1.7);
    L.crane([-6.5, 2.05, 0.8]);
    D.bench(-6.5, 4.0, Math.PI, { w: 1.8 });
    D.lamppost(-3.0, 4.5, { intensity: 6 });
    D.lamppost(7.5, -3.5, { intensity: 5 });
    // garden shed with a crane on the roof
    L.box([9, 0, 3], [12.5, 2.3, 6.5], 'woodDark');
    L.box([8.8, 2.3, 2.8], [12.7, 2.45, 6.7], 'concreteDark');
    L.crane([10.7, 2.8, 4.7]);
    L.prop('crate', [8.0, 0, 1.2], { rotY: 0.6 });
    L.prop('pin', [-2.0, 0, 2.6]);
    D.plant(-12.5, 6.8, { size: 1.6, seed: 41 }); D.plant(12.5, -4.5, { size: 1.4, seed: 42 });
    D.fireflies(0, 1.5, 0, 24, 2, 12, 50);

    // ---------------------------------------------------------------- Zone B: hedge maze
    D.hedge(-14, -10.4, -4, -9.6, 2.4); D.hedge(-1.2, -10.4, 14, -9.6, 2.4);
    D.hedge(-9, -14.4, 14, -13.6, 2.4);
    D.hedge(3.0, -13.6, 3.8, -10.4, 2.4);
    D.hedge(-14, -18.4, 6, -17.6, 2.4);
    D.hedge(-5, -17.6, -4.2, -14.4, 2.4);
    D.hedge(-14, -22.4, -2.0, -21.6, 2.4); D.hedge(2.0, -22.4, 14, -21.6, 2.4);
    L.prop('moonball', [-12.0, 0, -16.0], { id: 'moon' });
    L.crane([12.3, 1.1, -12.0]);
    D.lamppost(-11.5, -11.8, { intensity: 2.5 });
    D.fireflies(0, 1.2, -14, 24, 1.5, 14, 40);

    // ---------------------------------------------------------------- Zone C: exit plaza
    L.box([-5, 0, -31.8], [5, 0.02, -22.6], 'flagstone', { collide: false });
    L.lightSensor('s2', { x: -3.6, y: 0, z: -27.2, need: 3.0 });
    L.lightSensor('s3', { x: 3.6, y: 0, z: -27.2, need: 3.0 });
    L.door('g2', { x: 0, z: -32.4, w: 1.5, h: 2.4, style: 'lift', sticky: true, leafMat: 'metalDark', frameMat: 'metalDark', cond: (LL) => LL.sensorOn('s2') && LL.sensorOn('s3') });
    L.exit(0, -32.8, 'n', { y: 0, w: 1.5, h: 2.4, wallMat: 'concrete' });
    D.lamppost(-6, -24, { intensity: 3 }); D.lamppost(6, -24, { intensity: 3 });

    // moonlight
    L.ambient(0x4a5f9a, 0x1a2230, 2.2);
    L.sun([0.35, -1, 0.45], { color: 0xa9bcff, intensity: 1.6, size: 26, center: [0, 0, -12] });

    L.trigger([-1.5, 0, -10], [1.5, 3, -6.6], (LL) => { LL.setStage(1); LL.say(['The maze is darker than it looks.', 'Stay close to your lantern. Things in the dark are exactly as big as they look, too.'], { id: 'maze' }); });
    L.checkpoint([-1.5, 0, -10], [1.5, 3, -6.6], [0, 0, -7.5], 0);
    L.trigger([-14, 0, -18], [-9, 3, -14], (LL) => LL.say('A spare moon. Somebody must have dropped it.', { id: 'moonfound' }));
    L.trigger([-14, 0, -31], [14, 3, -22.6], (LL) => { LL.setStage(2); LL.say(['Two flowers. And you, holding the only light.', 'You will think of something. You always do, eventually.'], { id: 'plaza' }); });
    L.checkpoint([-14, 0, -31], [14, 3, -22.6], [0, 0, -23.5], 0);
  },
  onStart(L) {
    L.say(['Chapter four. The night garden.', 'The flowers here only open in the light. And the only light here is very, very small.', 'For now.'], { id: 'intro', delay: 1.5 });
  },
  onGrab(L, p) { if (p.id === 'lantern') L.say('Careful. It is paper. And light. And for the moment, quite small.', { id: 'lgrab' }); },
};
