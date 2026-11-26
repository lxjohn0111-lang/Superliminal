// Fully procedural audio: synthesized SFX, room ambience, convolution reverb and generative ambient music.
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export const MOODS = {
  intake:   { root: 60, scale: [0, 2, 4, 7, 9, 11], chords: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], bar: 9, pluck: 0.55, wave: 'triangle', cutoff: 1400 },
  office:   { root: 57, scale: [0, 2, 3, 5, 7, 10], chords: [[0, 3, 7, 10], [5, 8, 12, 15], [3, 7, 10, 14], [-2, 2, 5, 9]], bar: 8, pluck: 0.5, wave: 'sawtooth', cutoff: 900 },
  gallery:  { root: 62, scale: [0, 2, 4, 6, 7, 9, 11], chords: [[0, 4, 7, 14], [2, 6, 9, 13], [-1, 4, 7, 11], [-3, 4, 7, 12]], bar: 10, pluck: 0.65, wave: 'triangle', cutoff: 1600 },
  garden:   { root: 55, scale: [0, 2, 3, 7, 8, 10], chords: [[0, 3, 7, 14], [-4, 0, 3, 10], [-2, 2, 5, 9], [-5, -1, 2, 7]], bar: 11, pluck: 0.6, wave: 'sine', cutoff: 1200 },
  echo:     { root: 59, scale: [0, 2, 4, 7, 9], chords: [[0, 7, 14, 16], [-3, 4, 9, 12], [5, 9, 12, 19], [2, 7, 11, 14]], bar: 7, pluck: 0.8, wave: 'triangle', cutoff: 1800 },
  pool:     { root: 64, scale: [0, 2, 4, 6, 9, 11], chords: [[0, 4, 11, 14], [-3, 4, 7, 11], [2, 6, 9, 13], [-5, 2, 7, 11]], bar: 12, pluck: 0.45, wave: 'sine', cutoff: 1100 },
  nursery:  { root: 65, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7, 12], [5, 9, 12, 16], [-3, 0, 4, 9], [-5, 2, 7, 11]], bar: 8, pluck: 0.9, wave: 'triangle', cutoff: 2000, musicbox: true },
  void:     { root: 50, scale: [0, 2, 3, 5, 7, 8, 10], chords: [[0, 7, 15, 19], [-4, 3, 8, 12], [-7, 0, 5, 12], [-2, 5, 10, 14]], bar: 13, pluck: 0.35, wave: 'sawtooth', cutoff: 700 },
  wake:     { root: 60, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7, 14], [-3, 4, 9, 12], [5, 9, 12, 19], [7, 11, 14, 19]], bar: 9, pluck: 0.7, wave: 'triangle', cutoff: 1500 },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.9, music: 0.55, sfx: 0.9 };
    this.muted = false;
    this.ambNodes = [];
    this.musicTimer = null;
    this.mood = null;
    this.hum = null;
    this.illusionHum = null;
    this.pendingAmbience = null;
    this.pendingMood = null;
  }

  get ready() { return !!this.ctx; }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.muffle = ctx.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 20000;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 3; this.comp.attack.value = 0.01; this.comp.release.value = 0.25;
    this.master.connect(this.muffle); this.muffle.connect(this.comp); this.comp.connect(ctx.destination);
    this.musicBus = ctx.createGain(); this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
    this.ambBus = ctx.createGain(); this.ambBus.connect(this.master);
    this.reverb = ctx.createConvolver();
    this.reverbGain = ctx.createGain(); this.reverbGain.gain.value = 0.55;
    this.reverb.connect(this.reverbGain); this.reverbGain.connect(this.master);
    this.musicSend = ctx.createGain(); this.musicSend.gain.value = 0.9; this.musicBus.connect(this.musicSend); this.musicSend.connect(this.reverb);
    this.sfxSend = ctx.createGain(); this.sfxSend.gain.value = 0.35; this.sfxBus.connect(this.sfxSend); this.sfxSend.connect(this.reverb);
    this.setReverb(2.2);
    this.white = this.makeNoise('white', 2);
    this.brown = this.makeNoise('brown', 4);
    this.pink = this.makeNoise('pink', 3);
    this.applyVolumes();
    if (this.pendingAmbience) this.setAmbience(this.pendingAmbience);
    if (this.pendingMood) this.setMood(this.pendingMood);
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.42, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.vol.sfx * 0.8, t, 0.1);
  }
  setMuted(m) { this.muted = m; this.applyVolumes(); }
  setPausedMuffle(on) { if (this.ctx) this.muffle.frequency.setTargetAtTime(on ? 650 : 20000, this.ctx.currentTime, 0.15); }
  suspendAll(on) { if (!this.ctx) return; if (on) this.ctx.suspend(); else this.ctx.resume(); }

  makeNoise(kind, seconds) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (kind === 'pink') { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.05) * 1.8; }
      else d[i] = w;
    }
    return buf;
  }

  setReverb(seconds, damp = 3) {
    if (!this.ctx) return;
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, damp) * (i < 200 ? i / 200 : 1);
      }
    }
    this.reverb.buffer = buf;
  }

  // ---------------------------------------------------------------- helpers
  _env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }

  tone(freq, dur, { type = 'sine', vol = 0.2, attack = 0.005, to = null, bus = null, delay = 0, pan = 0 } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    this._env(g, t, attack, vol, dur);
    let out = g;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
    o.connect(g); out.connect(bus || this.sfxBus);
    o.start(t); o.stop(t + attack + dur + 0.05);
  }

  noise(dur, { type = 'lowpass', freq = 1000, q = 0.7, vol = 0.2, attack = 0.003, buf = null, to = null, bus = null, delay = 0, rate = 1 } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = buf || this.white; s.playbackRate.value = rate;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain(); this._env(g, t, attack, vol, dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
    const off = Math.random() * 1.5;
    s.start(t, off); s.stop(t + attack + dur + 0.05);
  }

  // ---------------------------------------------------------------- SFX
  footstep(surface, strength = 1) {
    const r = 0.9 + Math.random() * 0.2, v = 0.22 * strength;
    switch (surface) {
      case 'carpet': this.noise(0.09, { freq: 520 * r, vol: v * 0.8, buf: this.brown, q: 0.5 }); break;
      case 'wood': this.noise(0.07, { type: 'bandpass', freq: 900 * r, q: 1.6, vol: v * 0.9 }); this.tone(95 * r, 0.06, { vol: v * 0.7 }); break;
      case 'grass': for (let i = 0; i < 3; i++) this.noise(0.05, { type: 'bandpass', freq: 2600 * r, q: 0.6, vol: v * 0.35, delay: i * 0.025 }); break;
      case 'metal': this.noise(0.05, { type: 'bandpass', freq: 2200 * r, q: 3, vol: v * 0.6 }); this.tone(420 * r, 0.12, { vol: v * 0.15, type: 'triangle' }); break;
      case 'tile': case 'stone':
        this.noise(0.035, { type: 'highpass', freq: 2400 * r, vol: v * 0.55 }); this.noise(0.06, { type: 'bandpass', freq: 700 * r, q: 1.2, vol: v * 0.6 }); break;
      case 'soft': case 'cardboard': this.noise(0.08, { freq: 900 * r, vol: v * 0.6, buf: this.pink }); break;
      default: this.noise(0.045, { type: 'bandpass', freq: 1500 * r, q: 0.9, vol: v * 0.6 }); this.tone(80 * r, 0.05, { vol: v * 0.5 });
    }
  }

  land(strength = 1) { this.noise(0.14, { freq: 400, vol: 0.35 * strength, buf: this.brown }); this.tone(70, 0.12, { vol: 0.3 * strength, to: 45 }); }
  jump() { this.noise(0.12, { type: 'bandpass', freq: 1200, q: 0.5, vol: 0.06, to: 2400 }); }

  impact(material, size, strength) {
    if (!this.ctx) return;
    const s = Math.max(0.05, Math.min(20, size));
    const vol = Math.min(0.6, 0.08 + strength * 0.12) * Math.min(1.4, 0.6 + Math.log2(1 + s) * 0.35);
    const base = Math.max(28, Math.min(900, 180 / Math.pow(s, 0.7)));
    const cut = Math.max(180, Math.min(6000, 3000 / Math.pow(s, 0.6)));
    this.tone(base, 0.08 + Math.min(0.7, s * 0.06), { vol: vol * 0.9, to: base * 0.6 });
    this.noise(0.05 + Math.min(0.4, s * 0.04), { freq: cut, vol: vol * 0.8, buf: s > 2 ? this.brown : this.white });
    if (material === 'wood') this.noise(0.08, { type: 'bandpass', freq: base * 4, q: 4, vol: vol * 0.4 });
    else if (material === 'metal') { this.tone(base * 5.4, 0.5, { vol: vol * 0.12, type: 'triangle' }); this.tone(base * 8.9, 0.35, { vol: vol * 0.08 }); }
    else if (material === 'plastic' || material === 'ceramic') this.noise(0.03, { type: 'highpass', freq: Math.min(8000, cut * 1.5), vol: vol * 0.4 });
    else if (material === 'glow') this.tone(base * 6, 0.6, { vol: vol * 0.12 });
    if (s > 4 && strength > 1) this.noise(0.6, { freq: 160, vol: vol * 0.6, buf: this.brown }); // big boom tail
  }

  grab(scale = 1) {
    const p = Math.pow(2, -Math.log2(Math.max(0.05, scale)) * 0.25);
    this.noise(0.18, { type: 'bandpass', freq: 600 * p, to: 2200 * p, q: 0.8, vol: 0.09 });
    this.tone(240 * p, 0.14, { vol: 0.12, to: 480 * p });
    this.tone(720 * p, 0.25, { vol: 0.03, type: 'triangle', delay: 0.03 });
  }
  release(scale = 1) {
    const p = Math.pow(2, -Math.log2(Math.max(0.05, scale)) * 0.25);
    this.tone(420 * p, 0.16, { vol: 0.1, to: 200 * p });
    this.noise(0.15, { type: 'bandpass', freq: 1800 * p, to: 500 * p, q: 0.8, vol: 0.06 });
  }
  deny() { this.tone(180, 0.07, { type: 'square', vol: 0.05 }); this.tone(140, 0.09, { type: 'square', vol: 0.05, delay: 0.09 }); }
  ui() { this.tone(1400, 0.04, { vol: 0.05 }); }
  uiHover() { this.tone(2200, 0.02, { vol: 0.015 }); }

  startHoldHum() {
    if (!this.ctx || this.hum) return;
    const ctx = this.ctx;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o1.type = 'sine'; o2.type = 'triangle'; o2.detune.value = 7;
    f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus);
    o1.start(); o2.start();
    g.gain.setTargetAtTime(0.035, ctx.currentTime, 0.1);
    this.hum = { o1, o2, g, f };
  }
  updateHoldHum(scaleRatio, moving) {
    if (!this.hum) return;
    const t = this.ctx.currentTime;
    const f = 110 * Math.pow(2, -Math.log2(Math.max(0.02, scaleRatio)) * 0.5);
    const fc = Math.max(40, Math.min(1200, f));
    this.hum.o1.frequency.setTargetAtTime(fc, t, 0.06);
    this.hum.o2.frequency.setTargetAtTime(fc * 2.01, t, 0.06);
    this.hum.g.gain.setTargetAtTime(0.022 + Math.min(0.04, moving * 0.03), t, 0.08);
  }
  stopHoldHum() {
    if (!this.hum) return;
    const h = this.hum, t = this.ctx.currentTime;
    h.g.gain.setTargetAtTime(0, t, 0.06);
    setTimeout(() => { try { h.o1.stop(); h.o2.stop(); } catch (e) { /* */ } }, 400);
    this.hum = null;
  }

  plateOn() { this.tone(95, 0.18, { vol: 0.3, to: 60 }); this.noise(0.06, { freq: 900, vol: 0.2 }); this.tone(880, 0.6, { vol: 0.07, delay: 0.08 }); this.tone(1320, 0.8, { vol: 0.05, delay: 0.16 }); }
  plateOff() { this.tone(80, 0.15, { vol: 0.2, to: 50 }); this.tone(660, 0.35, { vol: 0.05, to: 440, delay: 0.05 }); }
  tick(p) { this.tone(600 + p * 900, 0.03, { vol: 0.03 }); }
  door(open = true) {
    this.noise(1.1, { type: 'lowpass', freq: open ? 300 : 500, to: open ? 900 : 250, vol: 0.12, buf: this.brown });
    this.tone(open ? 70 : 90, 1.0, { type: 'sawtooth', vol: 0.025, to: open ? 110 : 60 });
    this.noise(0.5, { type: 'highpass', freq: 3000, vol: 0.03, delay: 0.5 });
    this.tone(open ? 520 : 390, 0.3, { vol: 0.04, delay: 0.95 });
  }
  collect() { [0, 4, 7, 12, 16].forEach((n, i) => this.tone(midi(84 + n), 0.5, { vol: 0.07, delay: i * 0.06, type: 'sine' })); this.noise(0.6, { type: 'highpass', freq: 6000, vol: 0.03 }); }
  achievement() { this.tone(midi(76), 0.5, { vol: 0.08 }); this.tone(midi(83), 0.8, { vol: 0.08, delay: 0.12 }); this.tone(midi(88), 1.0, { vol: 0.05, delay: 0.24 }); }
  narrator() { this.tone(midi(91), 0.25, { vol: 0.02 }); this.tone(midi(86), 0.3, { vol: 0.015, delay: 0.05 }); }
  splash(size = 1) { this.noise(0.6, { type: 'bandpass', freq: 900 / Math.sqrt(size), q: 0.5, vol: 0.35, to: 300 }); for (let i = 0; i < 6; i++) this.tone(400 + Math.random() * 900, 0.08, { vol: 0.03, delay: 0.1 + Math.random() * 0.4, to: 900 + Math.random() * 900 }); }
  fallWhoosh() { this.noise(2.5, { type: 'bandpass', freq: 300, to: 2500, q: 0.4, vol: 0.2, attack: 0.8 }); }
  respawn() { this.tone(midi(72), 1.2, { vol: 0.06, attack: 0.3 }); this.tone(midi(79), 1.2, { vol: 0.05, attack: 0.4, delay: 0.1 }); }

  illusionSnap() {
    [0, 7, 12, 16, 19, 24].forEach((n, i) => this.tone(midi(67 + n), 1.4, { vol: 0.06, delay: i * 0.05, attack: 0.02 }));
    this.noise(0.9, { type: 'bandpass', freq: 400, to: 5000, q: 0.6, vol: 0.12, attack: 0.3 });
    this.tone(55, 0.9, { vol: 0.25, to: 40, delay: 0.55 });
  }
  setIllusionHum(level) {
    if (!this.ctx) return;
    if (!this.illusionHum && level > 0.01) {
      const ctx = this.ctx, g = ctx.createGain(); g.gain.value = 0; g.connect(this.sfxBus);
      const os = [0, 4, 7, 14].map((n) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = midi(64 + n); o.connect(g); o.start(); return o; });
      this.illusionHum = { g, os };
    }
    if (this.illusionHum) {
      const t = this.ctx.currentTime;
      this.illusionHum.g.gain.setTargetAtTime(level * 0.03, t, 0.1);
      this.illusionHum.os.forEach((o, i) => o.detune.setTargetAtTime((1 - level) * (i - 1.5) * 40, t, 0.1));
      if (level <= 0.01) {
        const h = this.illusionHum; this.illusionHum = null;
        setTimeout(() => h.os.forEach((o) => { try { o.stop(); } catch (e) { /* */ } }), 600);
      }
    }
  }

  exitSwell() {
    [0, 4, 7, 11, 14].forEach((n, i) => this.tone(midi(60 + n), 3.0, { vol: 0.05, attack: 1.2, delay: i * 0.1, bus: this.musicBus }));
    this.noise(3.0, { type: 'bandpass', freq: 300, to: 4000, q: 0.4, vol: 0.12, attack: 1.5 });
  }
  levelStart() { this.noise(2.0, { type: 'lowpass', freq: 3000, to: 200, vol: 0.12, attack: 0.02 }); this.tone(midi(48), 2.5, { vol: 0.08, attack: 0.05 }); }

  // ---------------------------------------------------------------- ambience
  setAmbience(kind) {
    this.pendingAmbience = kind;
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const n of this.ambNodes) { try { if (n.gain) n.gain.setTargetAtTime(0, t, 0.5); if (n.stop) setTimeout(() => { try { n.stop(); } catch (e) { /* */ } }, 2000); } catch (e) { /* */ } }
    this.ambNodes = [];
    if (this.ambTimer) { clearInterval(this.ambTimer); this.ambTimer = null; }
    const loop = (buf, type, freq, vol, q = 0.7, lfo = 0) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(vol, t, 1.5);
      s.connect(f); f.connect(g); g.connect(this.ambBus); s.start();
      this.ambNodes.push(s, g);
      if (lfo) {
        const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = lfo; og.gain.value = freq * 0.5;
        o.connect(og); og.connect(f.frequency); o.start(); this.ambNodes.push(o);
      }
    };
    const humTone = (f, vol) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.value = 0; g.gain.setTargetAtTime(vol, t, 2);
      o.connect(g); g.connect(this.ambBus); o.start(); this.ambNodes.push(o, g);
    };
    const sporadic = (fn, ms) => { this.ambTimer = setInterval(() => { if (this.ctx.state === 'running') fn(); }, ms); };

    switch (kind) {
      case 'office':
        loop(this.brown, 'lowpass', 220, 0.12, 0.5, 0.05); humTone(60, 0.006); humTone(120, 0.004); humTone(180, 0.0015);
        break;
      case 'gallery':
        loop(this.brown, 'lowpass', 160, 0.09, 0.5, 0.03); loop(this.pink, 'bandpass', 900, 0.008, 0.4, 0.07);
        break;
      case 'garden':
        loop(this.pink, 'bandpass', 500, 0.07, 0.5, 0.06); loop(this.brown, 'lowpass', 120, 0.06);
        sporadic(() => { // crickets
          const base = 4200 + Math.random() * 600, pan = Math.random() * 2 - 1;
          for (let i = 0; i < 4; i++) this.tone(base, 0.025, { vol: 0.008, delay: i * 0.045, bus: this.ambBus, pan });
        }, 380);
        break;
      case 'pool':
        loop(this.brown, 'lowpass', 300, 0.1, 0.6, 0.12); loop(this.pink, 'bandpass', 1500, 0.012, 0.5, 0.2); humTone(120, 0.003);
        sporadic(() => { if (Math.random() < 0.5) this.tone(900 + Math.random() * 1400, 0.06, { vol: 0.02, to: 1600 + Math.random() * 1200, bus: this.ambBus, pan: Math.random() * 2 - 1 }); }, 900);
        break;
      case 'warehouse':
        loop(this.brown, 'lowpass', 90, 0.14, 0.5, 0.02); humTone(48, 0.006);
        sporadic(() => { if (Math.random() < 0.2) this.tone(200 + Math.random() * 100, 1.2, { vol: 0.008, type: 'triangle', to: 170, bus: this.ambBus, pan: Math.random() * 2 - 1 }); }, 3000);
        break;
      case 'void':
        loop(this.pink, 'bandpass', 380, 0.09, 0.4, 0.04); loop(this.brown, 'lowpass', 70, 0.12); humTone(41, 0.01);
        break;
      case 'nursery':
        loop(this.brown, 'lowpass', 180, 0.08, 0.5, 0.03);
        sporadic(() => { if (Math.random() < 0.35) this.tone(1000 + Math.random() * 30, 0.05, { vol: 0.004, bus: this.ambBus }); }, 1000); // clock tick
        break;
      default:
        loop(this.brown, 'lowpass', 200, 0.1, 0.5, 0.04);
    }
  }

  // ---------------------------------------------------------------- generative music
  setMood(name) {
    this.pendingMood = name;
    if (!this.ctx) return;
    if (this.mood === name) return;
    this.mood = name;
    const m = MOODS[name] || MOODS.intake;
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.chordIdx = 0;
    this.nextBar = this.ctx.currentTime + 0.5;
    this.musicTimer = setInterval(() => this.scheduleMusic(m), 200);
  }

  scheduleMusic(m) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    while (this.nextBar < ctx.currentTime + 1.0) {
      const t0 = this.nextBar, bar = m.bar;
      const chord = m.chords[this.chordIdx % m.chords.length];
      this.chordIdx++;
      // Pad
      for (const n of chord) this.padVoice(midi(m.root + n - 12), t0, bar, m);
      this.padVoice(midi(m.root + chord[0] - 24), t0, bar, m, 0.6);
      // Plucks / music box
      const beats = 8;
      for (let b = 0; b < beats; b++) {
        if (Math.random() > m.pluck * 0.5) continue;
        const deg = m.scale[Math.floor(Math.random() * m.scale.length)];
        const oct = Math.random() < 0.3 ? 24 : 12;
        const tt = t0 + (b + (Math.random() < 0.3 ? 0.5 : 0)) * bar / beats;
        this.pluck(midi(m.root + deg + oct), tt, m.musicbox);
      }
      this.nextBar += bar;
    }
  }

  padVoice(f, t, dur, m, volMul = 1) {
    const ctx = this.ctx;
    const g = ctx.createGain(), fl = ctx.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = m.cutoff; fl.Q.value = 0.3;
    const a = dur * 0.35, peak = 0.05 * volMul;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.25);
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = m.wave; o.frequency.value = f; o.detune.value = det + (Math.random() - 0.5) * 4;
      o.connect(fl); o.start(t); o.stop(t + dur * 1.3);
    }
    fl.connect(g); g.connect(this.musicBus);
  }

  pluck(f, t, box) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const dec = box ? 1.6 : 2.4;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(box ? 0.05 : 0.04, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    const partials = box ? [[1, 1], [4.2, 0.25], [9.1, 0.08]] : [[1, 1], [2, 0.3], [3, 0.12]];
    for (const [mul, amp] of partials) {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * mul; og.gain.value = amp;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dec + 0.1);
    }
    g.connect(this.musicBus);
  }
}
