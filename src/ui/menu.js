// Pause menu, chapter select, achievements, settings, chapter-complete card and credits.
import { ACHIEVEMENTS } from '../game/achievements.js';

const $ = (id) => document.getElementById(id);
const fmt = (s) => { if (s == null) return '—'; const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(1).padStart(4, '0')}`; };

export class Menu {
  constructor(game) {
    this.game = game;
    this.el = $('menu');
    this.open = false;
    this.page = 'main';
    this.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      game.audio.ui();
      this.action(b.dataset.act, b);
    });
    this.el.addEventListener('mouseover', (e) => { if (e.target.closest('.mbtn,.chap')) game.audio.uiHover(); });
    $('complete').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      game.audio.ui();
      if (b.dataset.act === 'next') game.continueAfterComplete();
      if (b.dataset.act === 'replay') game.replayAfterComplete();
    });
  }

  show(mode = 'pause') {
    this.open = true;
    this.mode = mode;
    this.el.classList.remove('hidden');
    const sub = $('menu-sub');
    const L = this.game.level;
    if (mode === 'pause' && L) sub.textContent = `Chapter ${L.index + 1} — ${L.def.title}`;
    else sub.textContent = 'You are awake. Mostly.';
    this.el.querySelector('[data-act="resume"]').textContent = mode === 'pause' ? 'Resume' : 'Dream again';
    for (const a of ['hint', 'restart', 'checkpoint']) this.el.querySelector(`[data-act="${a}"]`).style.display = mode === 'pause' ? '' : 'none';
    $('menu-foot').innerHTML = `${this.game.totalCranes()} / ${this.game.maxCranes()} paper cranes &nbsp;·&nbsp; ${Object.keys(this.game.save.ach).length} / ${ACHIEVEMENTS.length} achievements`;
    this.setPage('main');
  }

  hide() { this.open = false; this.el.classList.add('hidden'); }

  setPage(p) {
    this.page = p;
    for (const el of this.el.querySelectorAll('.menu-page')) el.classList.toggle('active', el.dataset.page === p);
    if (p === 'chapters') this.renderChapters();
    if (p === 'achievements') this.renderAchievements();
    if (p === 'settings') this.renderSettings();
  }

  action(act) {
    const g = this.game;
    switch (act) {
      case 'resume': if (this.mode === 'pause') g.resume(); else this.setPage('chapters'); break;
      case 'hint': g.requestHint(); break;
      case 'restart': g.restartLevel(); break;
      case 'checkpoint': g.respawn(true); g.resume(); break;
      case 'chapters': case 'achievements': case 'settings': this.setPage(act); break;
      case 'back': this.setPage('main'); break;
    }
  }

  renderChapters() {
    const g = this.game, list = $('chapter-list');
    list.innerHTML = '';
    g.levels.forEach((def, i) => {
      const locked = i > g.save.unlocked;
      const best = g.save.best[def.id];
      const medal = best == null ? 'none' : best <= def.par[0] ? 'gold' : best <= def.par[1] ? 'silver' : 'bronze';
      const got = g.cranesIn(def.id), tot = def.cranes || 0;
      const el = document.createElement('div');
      el.className = 'chap' + (locked ? ' locked' : '');
      el.innerHTML = `<div class="c-n">${i + 1}</div><div class="c-t"><b>${locked ? '???' : def.title}</b><span>${locked ? 'Locked' : def.subtitle}</span></div><div class="c-m">${locked ? '' : `${fmt(best)} <span class="medal ${medal}"></span><br>✦ ${got}/${tot}`}</div>`;
      if (!locked) el.addEventListener('click', () => { g.audio.ui(); g.startChapter(i); });
      list.appendChild(el);
    });
  }

  renderAchievements() {
    const g = this.game, list = $('ach-list');
    list.innerHTML = '';
    for (const a of ACHIEVEMENTS) {
      const got = !!g.save.ach[a.id];
      const el = document.createElement('div');
      el.className = 'ach' + (got ? ' got' : '');
      el.innerHTML = `<div class="a-i">${a.icon}</div><div><div class="a-t">${a.title}</div><div class="a-d">${a.desc}</div></div>`;
      list.appendChild(el);
    }
  }

  renderSettings() {
    const g = this.game, s = g.settings, list = $('settings-list');
    list.innerHTML = '';
    const range = (label, key, min, max, step, fmtv = (v) => v.toFixed(2)) => {
      const row = document.createElement('div'); row.className = 'set';
      row.innerHTML = `<label>${label}</label><div style="display:flex;align-items:center;gap:8px"><input type="range" min="${min}" max="${max}" step="${step}" value="${s[key]}"><span class="val">${fmtv(s[key])}</span></div>`;
      const inp = row.querySelector('input'), val = row.querySelector('.val');
      inp.addEventListener('input', () => { s[key] = parseFloat(inp.value); val.textContent = fmtv(s[key]); g.applySettings(); });
      list.appendChild(row);
    };
    const toggle = (label, key) => {
      const row = document.createElement('div'); row.className = 'set';
      row.innerHTML = `<label>${label}</label><div class="toggle ${s[key] ? 'on' : ''}"></div>`;
      const t = row.querySelector('.toggle');
      t.addEventListener('click', () => { s[key] = !s[key]; t.classList.toggle('on', s[key]); g.audio.ui(); g.applySettings(); });
      list.appendChild(row);
    };
    const select = (label, key, opts) => {
      const row = document.createElement('div'); row.className = 'set';
      row.innerHTML = `<label>${label}</label><select>${opts.map(([v, n]) => `<option value="${v}" ${String(s[key]) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
      const sel = row.querySelector('select');
      sel.addEventListener('change', () => { s[key] = sel.value; g.applySettings(); });
      list.appendChild(row);
    };
    range('Mouse sensitivity', 'sensitivity', 0.2, 3, 0.05);
    range('Field of view', 'fov', 60, 100, 1, (v) => String(Math.round(v)));
    select('Graphics quality', 'quality', [['auto', 'Auto'], ['0', 'Low'], ['1', 'Medium'], ['2', 'High'], ['3', 'Ultra']]);
    range('Master volume', 'master', 0, 1, 0.01, (v) => Math.round(v * 100) + '%');
    range('Music', 'music', 0, 1, 0.01, (v) => Math.round(v * 100) + '%');
    range('Effects', 'sfx', 0, 1, 0.01, (v) => Math.round(v * 100) + '%');
    toggle('Invert look', 'invertY');
    toggle('Head bob', 'headBob');
    toggle('Subtitles', 'subtitles');
    toggle('Show timer', 'timer');
    toggle('Show size readout', 'readout');
  }

  // ---------------------------------------------------------------- complete card
  showComplete({ title, time, best, par, cranes, cranesTotal, newBest, resized }) {
    const el = $('complete');
    el.classList.remove('hidden');
    el.querySelector('.cp-title').textContent = title;
    const medal = time <= par[0] ? 'gold' : time <= par[1] ? 'silver' : 'bronze';
    const medalName = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' }[medal];
    el.querySelector('.cp-stats').innerHTML = `
      <div class="cp-stat"><div class="s-v">${fmt(time)}</div><div class="s-l">Time</div><div class="s-n">${newBest ? 'New best!' : 'Best ' + fmt(best)}</div></div>
      <div class="cp-stat"><div class="s-v">${cranes}/${cranesTotal}</div><div class="s-l">Paper cranes</div><div class="s-n">${cranes < cranesTotal ? 'Some are still hiding' : 'All found'}</div></div>
      <div class="cp-stat"><div class="s-v">${resized}</div><div class="s-l">Things resized</div><div class="s-n">&nbsp;</div></div>`;
    const next = medal === 'gold' ? 'A perfect dream.' : medal === 'silver' ? `Gold under ${fmt(par[0])}` : `Silver under ${fmt(par[1])} · Gold under ${fmt(par[0])}`;
    el.querySelector('.cp-medal').innerHTML = `<span class="medal ${medal}"></span> ${medalName} — ${next}`;
    return medal;
  }
  hideComplete() { $('complete').classList.add('hidden'); }

  // ---------------------------------------------------------------- credits
  rollCredits(onDone) {
    const el = $('credits'), sc = el.querySelector('.cr-scroll');
    const g = this.game;
    sc.innerHTML = `<h1>LUCID ANGLES</h1>
      <p>“The room was never too big. You were just standing too close.”</p>
      <h2>A dream in nine chapters</h2><p>Designed, written, built and scored procedurally</p>
      <h2>Featuring</h2><p>WREN, the Morrow Sleep Clinic's guidance system</p><p>Barnaby, as himself</p><p>You, as the dreamer</p>
      <h2>Your dream</h2><p>${g.stats.grabs || 0} objects held · ${g.stats.resized || 0} things resized · ${g.totalCranes()} of ${g.maxCranes()} paper cranes</p>
      <h2>Thank you for playing</h2><p>Go on. Look again.</p><div style="height:40vh"></div>`;
    el.classList.remove('hidden');
    sc.style.transition = 'none'; sc.style.transform = 'translateY(0)';
    void sc.offsetWidth;
    const dist = sc.scrollHeight + window.innerHeight;
    const dur = 32;
    sc.style.transition = `transform ${dur}s linear`;
    sc.style.transform = `translateY(-${dist}px)`;
    const done = () => { el.classList.add('hidden'); el.removeEventListener('click', done); clearTimeout(t); onDone(); };
    const t = setTimeout(done, dur * 1000);
    setTimeout(() => el.addEventListener('click', done), 2500);
  }
}
