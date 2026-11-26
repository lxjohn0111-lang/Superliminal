// Chapter 1 — Intake. Tutorial: look, grab, forced-perspective growth, pressure plate, climbing.
export default {
  id: 'intake',
  title: 'Intake',
  subtitle: 'Please make yourself comfortable.',
  mood: 'intake', ambience: 'office', reverb: 1.6,
  par: [70, 150],
  cranes: 3,
  hints: [
    'Walk up to the white block on the reception desk and grab it while you are standing close to it.',
    'Holding the block, stand far from the pressure plate, look at it and click. Things land as big as they look — far away means big.',
    'The step stool in the hallway can become a staircase. Grab it up close, then look at the floor below the ledge from a few metres back and drop it. Press Q to rotate it so the tall step faces the ledge.',
  ],
  build(L) {
    // ---------------------------------------------------------------- Room A: waiting room
    L.room({ x0: -5, x1: 5, z0: -4, z1: 6, h: 3.2, floor: 'carpetBlue', wall: 'plasterWarm', crown: true,
      openings: { e: [{ at: -2.2, w: 1.5, h: 2.4 }] } });
    L.spawn([0, 0, 4.6], 0);
    L.probe(0, 1.6, 1);
    L.envIntensity = 0.5;

    const D = L.decor;
    D.reception(0, -2.3, 0);
    D.sign('MORROW SLEEP CLINIC', 0, 2.3, -3.97, 0, { w: 2.6, h: 0.42, bg: '#22303f', color: '#f3e6cf', font: '400 92px Cormorant, Georgia', sub: 'rest is a skill', glow: 0.25 });
    D.officeChair(0.2, -3.25, Math.PI);
    D.monitor(-0.7, 1.09, -2.45, 0.3);
    D.plant(-1.6, -2.55, { y: 1.09, size: 0.55, seed: 4 });
    D.sofa(-4.45, 2.0, Math.PI / 2, { w: 2.2, color: 'fabricGreen' });
    D.coffeeTable(-3.2, 2.0, { w: 0.7, d: 1.2 });
    D.floorLamp(-4.4, 4.6, { intensity: 5 });
    D.plant(-4.4, -0.4, { size: 1.1, seed: 8 });
    D.plant(4.4, 5.4, { size: 1.0, seed: 9 });
    D.rug(-2.6, 2.0, 3.2, 2.4, 0x6b4b5a);
    D.poster('Look again.', 'Perception is a habit.', -4.97, 1.6, -2.2, Math.PI / 2, { hue: 200 });
    D.poster('Rest easy.', 'Nothing here is too heavy.', 4.97, 1.6, 2.6, -Math.PI / 2, { hue: 30 });
    D.painting(0, 1.75, 5.97, Math.PI, { w: 1.6, h: 0.9, seed: 3, style: 'landscape' });
    D.wallClock(2.6, 2.45, -3.97, 0);
    D.waterCooler(4.55, 4.65, -Math.PI / 2);
    // Waiting chairs along the east wall
    for (let i = 0; i < 3; i++) L.prop('chair', [4.4, 0, 2.2 + i * 0.75], { rotY: -Math.PI / 2, grabbable: false });
    // Tall cabinet with a crane on top
    L.box([2.6, 0, 5.4], [4.0, 2.75, 5.98], 'woodDark');
    D.shelf(1.6, 5.6, Math.PI, { w: 1.1, h: 2.0, seed: 5 });
    L.crane([3.3, 3.0, 5.65]);
    L.crane([1.2, 0.35, -3.6]); // behind the desk

    // The block
    L.prop('cube', [0.65, 1.09, -2.15], { rotY: 0.2, id: 'block' });
    L.prop('book', [-3.1, 0.44, 1.7], { variant: 0, rotY: 0.3 });
    L.prop('mug', [-3.3, 0.44, 2.3], { rotY: 1.2 });
    L.prop('apple', [-0.9, 1.09, -2.05]);

    // Plate + door to hallway
    L.plate('p1', { x: 2.6, z: 0.9, need: 150, onChange: (on, LL) => { if (on) LL.setStage(2); } });
    L.door('d1', { x: 5.12, z: -2.2, rotY: Math.PI / 2, w: 1.5, h: 2.4, plates: ['p1'], sticky: true });

    // Lights
    L.ambient(0xe8eeff, 0x8a7a68, 0.25);
    L.spot([-2.2, 3.12, 1.6], [-2.2, 0, 1.6], { intensity: 34, angle: 1.15, color: 0xfff0dc });
    L.spot([2.4, 3.12, -1.2], [2.4, 0, -1.2], { intensity: 30, angle: 1.15, color: 0xfff0dc });
    L.panel(0, 3.2, 3.6, 1.2, 0.6, { intensity: 10 });
    L.panel(0, 3.2, -0.6, 1.2, 0.6, { intensity: 10 });
    L.point([0, 1.6, -2.0], { color: 0xffd9a0, intensity: 1.6, distance: 4 });

    // ---------------------------------------------------------------- Room B: hallway with ledge
    L.room({ x0: 5.25, x1: 18, z0: -3.6, z1: -0.8, h: 4.2, floor: 'woodfloor', wall: 'plaster', walls: { n: true, s: true, e: true, w: false },
      openings: { e: [{ at: -2.2, w: 1.4, h: 2.2, y: 2.0 }] } });
    // Ledge at the end (2.0 m)
    L.box([14.5, 0, -3.6], [18, 2.0, -0.8], 'woodDark');
    L.box([14.48, 1.9, -3.6], [14.56, 2.02, -0.8], 'trim', { collide: false });
    D.railing(14.75, -0.95, 17.8, -0.95, 2.0, 1.0);
    L.exit(18, -2.2, 'e', { y: 2.0, w: 1.4, h: 2.2, wallMat: 'plaster' });
    // Bench + table with the step stool
    D.bench(8.2, -1.15, 0, { w: 1.6 });
    L.box([10.4, 0, -3.6], [11.6, 0.75, -3.0], 'woodPale');
    L.prop('stool', [11.0, 0.75, -3.3], { rotY: 0, id: 'stool' });
    L.box([7.4, 2.45, -3.6], [9.2, 2.5, -3.25], 'woodPale');
    L.crane([8.3, 2.75, -3.42]);
    D.painting(8.3, 1.55, -3.58, 0, { w: 1.2, h: 0.8, seed: 11, style: 'abstract' });
    D.painting(12.8, 1.6, -0.82, Math.PI, { w: 0.9, h: 1.1, seed: 12, style: 'eye' });
    D.plant(13.6, -3.2, { size: 0.9, seed: 3 });
    L.spot([8.5, 4.15, -2.2], [8.5, 0, -2.2], { intensity: 38, angle: 1.0 });
    L.spot([14.0, 4.15, -2.2], [15.5, 2, -2.2], { intensity: 38, angle: 1.0 });
    L.panel(11.5, 4.2, -2.2, 1.2, 0.6, { intensity: 8 });
    D.dust(0, 1.8, 1, 9, 2.8, 9, 160);

    // ---------------------------------------------------------------- narration
    L.trigger([3.5, 0, -4], [5.2, 3, 0], (LL) => LL.say(['That plate operates the door. It is very particular about weight.', 'Not your weight. You are asleep. You weigh nothing at all.'], { id: 'plate' }));
    L.trigger([5.4, 0, -4], [9, 3, 0], (LL) => { LL.setStage(2); LL.say(['The way out is up there. Naturally.', 'The clinic believes in a little light exercise before bed.'], { id: 'hall' }); });
    L.checkpoint([5.4, 0, -4], [9, 3, 0], [6.5, 0, -2.2], -Math.PI / 2);
    L.trigger([14.6, 2, -3.6], [18, 4, -0.8], (LL) => LL.say('Marvellous. You will find the rest of the clinic is much the same. Only less so.', { id: 'top' }));
  },

  onStart(L) {
    L.say([
      'Good evening, and welcome to the Morrow Sleep Clinic.',
      'You are asleep now. That was the difficult part, and you did it beautifully.',
      'I am WREN, your rest guidance system. Tonight\'s program is called Lucid Angles.',
      'First exercise: find the white block on the reception desk, and pick it up.',
    ], { id: 'intro', delay: 1.2 });
  },

  onGrab(L, p) {
    if (p.id === 'block' && !L.flags.grabbedBlock) {
      L.flags.grabbedBlock = true; L.setStage(1);
      L.say(['Lovely. Here, things are exactly as big as they look.', 'Hold it up against the far wall, and see how big it looks.'], { id: 'g1' });
    }
    if (p.type === 'stool') L.say('Ah, the step stool. Every good dream has one.', { id: 'stool' });
  },
  onRelease(L, p) {
    if (p.id === 'block' && !L.plateOn('p1')) {
      const s = p.scale;
      if (s > 2.4 && !L.flags.bigTold) { L.flags.bigTold = true; L.say('Now that is a block. Put it on the plate.', { id: 'big' }); }
    }
  },
  update(L) {
    const pl = L.plates[0];
    if (pl && pl.weight > 0 && !pl.active && !L.flags.lightTold) { L.flags.lightTold = true; L.say(['Heavier, I\'m afraid.', 'Pick it up while you are close to it, step back, then set it down on the plate from a distance.'], { id: 'light' }); }
  },
};
