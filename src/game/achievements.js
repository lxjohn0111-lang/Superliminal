// Achievements: unlocked silently into the save, announced with a toast.
export const ACHIEVEMENTS = [
  { id: 'first_grab', icon: '✋', title: 'Hold That Thought', desc: 'Pick up your first object.' },
  { id: 'think_big', icon: '⬆', title: 'Think Big', desc: 'Make something ten times larger than it was.' },
  { id: 'pocket', icon: '⬇', title: 'Pocket-Sized', desc: 'Shrink something to a tenth of its size.' },
  { id: 'illusion', icon: '◎', title: 'Point of View', desc: 'Resolve an illusion by standing in the right place.' },
  { id: 'crane1', icon: '✦', title: 'Paper Trail', desc: 'Find a paper crane.' },
  { id: 'crane_all', icon: '✧', title: 'Flock', desc: 'Find every paper crane in the dream.' },
  { id: 'door_maker', icon: '⌂', title: 'Doorway Thinking', desc: 'Make your own way out.' },
  { id: 'tall_order', icon: '▲', title: 'Tall Order', desc: 'Stand on top of something taller than a house… that you made.' },
  { id: 'echoes', icon: '❖', title: 'Echo Chamber', desc: 'Create 20 echoes.', stat: 'echoes', need: 20 },
  { id: 'drops', icon: '●', title: 'Butterfingers', desc: 'Put things down 100 times.', stat: 'drops', need: 100 },
  { id: 'leap', icon: '∞', title: 'Leap of Faith', desc: 'Step off the edge of the dream.' },
  { id: 'splash', icon: '≈', title: 'The Deep End', desc: 'Fall into the pool.' },
  { id: 'gold', icon: '★', title: 'Speed Dreamer', desc: 'Earn a gold time on any chapter.' },
  { id: 'all_gold', icon: '✪', title: 'Lucid Sprinter', desc: 'Earn gold on every chapter.' },
  { id: 'finish', icon: '☀', title: 'Wide Awake', desc: 'Finish the dream.' },
  { id: 'nohints', icon: '◇', title: 'Lucid', desc: 'Finish the dream without using a hint.' },
  { id: 'barnaby', icon: '♥', title: 'Old Friend', desc: 'Pick up Barnaby.' },
];

export class Achievements {
  constructor(game) { this.game = game; }
  has(id) { return !!this.game.save.ach[id]; }
  unlock(id) {
    if (this.has(id)) return;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    this.game.save.ach[id] = Date.now();
    this.game.persist();
    this.game.hud.toast({ kicker: 'Achievement', title: a.title, desc: a.desc, icon: a.icon });
    this.game.audio.achievement();
    this.game.platform.happytime();
  }
  check(stat, value) {
    for (const a of ACHIEVEMENTS) if (a.stat === stat && value >= a.need) this.unlock(a.id);
  }
}
