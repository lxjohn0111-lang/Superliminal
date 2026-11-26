// Subtitled narrator (WREN, the clinic's sleep-guidance system) with a typewriter reveal.
export class Narrator {
  constructor(game) {
    this.game = game;
    this.queue = [];
    this.cur = null;
    this.said = new Set();
    this.el = document.getElementById('subtitle');
    this.spk = this.el.querySelector('.speaker');
    this.line = this.el.querySelector('.line');
  }

  reset() { this.queue = []; this.cur = null; this.el.classList.remove('show'); }

  say(lines, { id = null, once = true, speaker = 'WREN', interrupt = false, delay = 0 } = {}) {
    if (id && once && this.said.has(id)) return;
    if (id) this.said.add(id);
    if (!Array.isArray(lines)) lines = [lines];
    const items = lines.map((text, i) => ({ text, speaker, wait: i === 0 ? delay : 0.25 }));
    if (interrupt) { this.queue = items; this.cur = null; }
    else this.queue.push(...items);
  }

  get busy() { return !!this.cur || this.queue.length > 0; }

  update(dt) {
    const show = this.game.settings.subtitles;
    if (!this.cur) {
      if (!this.queue.length) return;
      const nx = this.queue[0];
      if (nx.wait > 0) { nx.wait -= dt; return; }
      this.cur = this.queue.shift();
      this.cur.t = 0;
      this.cur.dur = 1.8 + this.cur.text.length * 0.058;
      this.spk.textContent = this.cur.speaker || '';
      this.line.textContent = '';
      if (show) this.el.classList.add('show');
      this.game.audio.narrator();
    }
    const c = this.cur;
    c.t += dt;
    const n = Math.min(c.text.length, Math.floor(c.t * 48));
    this.line.textContent = c.text.slice(0, n);
    if (!show) this.el.classList.remove('show');
    if (c.t > c.dur) {
      this.cur = null;
      if (!this.queue.length || this.queue[0].wait > 0.3) this.el.classList.remove('show');
    }
  }
}
