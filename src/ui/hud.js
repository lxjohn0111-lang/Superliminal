// HUD: crosshair, prompts, toasts, chapter cards, fades.
const $ = (id) => document.getElementById(id);

export class HUD {
  constructor(game) {
    this.game = game;
    this.ch = $('crosshair'); this.prompt = $('prompt'); this.readout = $('scale-readout');
    this.card = $('chapter-card'); this.toasts = $('toasts'); this.craneEl = $('crane-counter'); this.craneCount = $('crane-count');
    this.timer = $('timer'); this.hintBox = $('hint-box'); this.help = $('controls-help');
    this.fade = $('fade'); this.flashEl = $('vignette-flash'); this.ctp = $('click-to-play');
    this.state = '';
    this.promptText = '';
    this.craneTimer = 0; this.hintTimer = 0; this.helpTimer = 0;
  }

  setCrosshair(state) {
    if (state === this.state) return;
    this.state = state;
    this.ch.classList.toggle('hover', state === 'hover');
    this.ch.classList.toggle('hold', state === 'hold');
  }

  deny() {
    this.ch.classList.remove('deny'); void this.ch.offsetWidth; this.ch.classList.add('deny');
  }

  setPrompt(html) {
    if (html === this.promptText) return;
    this.promptText = html;
    if (html) { this.prompt.innerHTML = html; this.prompt.classList.add('show'); }
    else this.prompt.classList.remove('show');
  }

  setReadout(text) {
    if (text) { this.readout.textContent = text; this.readout.classList.add('show'); }
    else this.readout.classList.remove('show');
  }

  chapterCard(num, title, sub) {
    this.card.querySelector('.cc-num').textContent = num;
    this.card.querySelector('.cc-title').textContent = title;
    this.card.querySelector('.cc-sub').textContent = sub || '';
    this.card.classList.add('show');
    clearTimeout(this._cardT);
    this._cardT = setTimeout(() => this.card.classList.remove('show'), 5200);
  }

  toast({ kicker = '', title = '', desc = '', icon = '★', kind = '' }) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<div class="t-ico ${kind}">${icon}</div><div><div class="t-k">${kicker}</div><div class="t-t">${title}</div><div class="t-d">${desc}</div></div>`;
    this.toasts.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, 4200);
  }

  showCranes(got, total, t = 4) {
    this.craneCount.textContent = `${got}/${total}`;
    this.craneEl.classList.add('show');
    this.craneTimer = t;
  }

  showHint(text, t = 14) {
    this.hintBox.innerHTML = `<b>HINT</b>${text}`;
    this.hintBox.classList.add('show');
    this.hintTimer = t;
  }

  showHelp(t = 18) {
    const touch = this.game.input.isTouch;
    this.help.innerHTML = touch
      ? 'Left stick to move · Drag to look · <kbd>GRAB</kbd> to pick up / drop'
      : '<kbd>W A S D</kbd> move &nbsp; <kbd>SPACE</kbd> jump &nbsp; <kbd>SHIFT</kbd> run<br><kbd>CLICK</kbd> / <kbd>E</kbd> grab &amp; drop &nbsp; <kbd>Q</kbd> / <kbd>WHEEL</kbd> rotate &nbsp; <kbd>ESC</kbd> pause';
    this.help.classList.add('show');
    this.helpTimer = t;
  }

  setTimer(sec, show) {
    if (!show) { this.timer.textContent = ''; return; }
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60), cs = Math.floor((sec * 10) % 10);
    this.timer.textContent = `${m}:${String(s).padStart(2, '0')}.${cs}`;
  }

  update(dt) {
    if (this.craneTimer > 0) { this.craneTimer -= dt; if (this.craneTimer <= 0) this.craneEl.classList.remove('show'); }
    if (this.hintTimer > 0) { this.hintTimer -= dt; if (this.hintTimer <= 0) this.hintBox.classList.remove('show'); }
    if (this.helpTimer > 0) { this.helpTimer -= dt; if (this.helpTimer <= 0) this.help.classList.remove('show'); }
  }

  fadeTo(opacity, color = 'white', ms = 1200) {
    this.fade.classList.toggle('black', color === 'black');
    this.fade.style.transition = `opacity ${ms}ms ease`;
    this.fade.style.opacity = String(opacity);
    return new Promise((r) => setTimeout(r, ms));
  }

  glow(v) { if (!this._fading) { this.fade.classList.remove('black'); this.fade.style.transition = 'opacity 0.15s linear'; this.fade.style.opacity = String(v * 0.85); } }

  flash() {
    this.flashEl.style.transition = 'opacity 0.08s'; this.flashEl.style.opacity = '1';
    setTimeout(() => { this.flashEl.style.transition = 'opacity 1.2s'; this.flashEl.style.opacity = '0'; }, 120);
  }

  clickToPlay(show) { this.ctp.classList.toggle('hidden', !show); }
}
