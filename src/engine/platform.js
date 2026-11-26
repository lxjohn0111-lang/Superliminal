// CrazyGames SDK v3 wrapper with safe fallbacks (works offline / on other hosts too).
const SAVE_KEY = 'lucid-angles-save-v1';

export class Platform {
  constructor() {
    this.sdk = null;
    this.env = 'none';
    this.playing = false;
    this.adPlaying = false;
    this.onAdStart = null;
    this.onAdEnd = null;
    this.onMuteChange = null;
    this.muted = false;
    this.lastMidgame = 0;
  }

  async init() {
    try {
      const cg = window.CrazyGames && window.CrazyGames.SDK;
      if (cg) {
        await cg.init();
        this.sdk = cg;
        this.env = cg.environment || 'unknown';
        if (this.env === 'disabled') this.sdk = null;
      }
    } catch (e) {
      console.warn('[platform] CrazyGames SDK unavailable', e);
      this.sdk = null;
    }
    if (this.sdk) {
      try {
        const s = this.sdk.game.settings;
        if (s && s.muteAudio) this.muted = true;
        this.sdk.game.addSettingsChangeListener((ns) => {
          this.muted = !!(ns && ns.muteAudio);
          if (this.onMuteChange) this.onMuteChange(this.muted);
        });
      } catch (e) { /* optional */ }
    }
    return this;
  }

  _call(fn) { try { if (this.sdk) fn(this.sdk); } catch (e) { console.warn('[platform]', e); } }

  loadingStart() { this._call((s) => s.game.loadingStart()); }
  loadingStop() { this._call((s) => s.game.loadingStop()); }
  gameplayStart() { if (this.playing) return; this.playing = true; this._call((s) => s.game.gameplayStart()); }
  gameplayStop() { if (!this.playing) return; this.playing = false; this._call((s) => s.game.gameplayStop()); }
  happytime() { this._call((s) => s.game.happytime()); }

  _ad(type) {
    return new Promise((resolve) => {
      if (!this.sdk) { resolve(type === 'rewarded' ? 'nosdk' : 'skipped'); return; }
      let done = false;
      const finish = (r) => {
        if (done) return; done = true;
        this.adPlaying = false;
        if (this.onAdEnd) this.onAdEnd();
        resolve(r);
      };
      try {
        this.sdk.ad.requestAd(type, {
          adStarted: () => { this.adPlaying = true; if (this.onAdStart) this.onAdStart(); },
          adFinished: () => finish('ok'),
          adError: (err) => { console.warn('[platform] ad error', err); finish('error'); },
        });
      } catch (e) { finish('error'); }
      // Safety net in case the SDK never answers.
      setTimeout(() => { if (!this.adPlaying) finish('timeout'); }, type === 'rewarded' ? 12000 : 6000);
    });
  }

  async midgameAd() {
    const now = performance.now();
    if (now - this.lastMidgame < 90000) return 'skipped';
    this.lastMidgame = now;
    return this._ad('midgame');
  }

  async rewardedAd() { return this._ad('rewarded'); }

  // ---- persistence (SDK data module when present, localStorage mirror otherwise) ----
  load() {
    let raw = null;
    try { if (this.sdk && this.sdk.data) raw = this.sdk.data.getItem(SAVE_KEY); } catch (e) { /* ignore */ }
    if (!raw) { try { raw = window.localStorage.getItem(SAVE_KEY); } catch (e) { /* ignore */ } }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  save(obj) {
    const raw = JSON.stringify(obj);
    try { if (this.sdk && this.sdk.data) this.sdk.data.setItem(SAVE_KEY, raw); } catch (e) { /* ignore */ }
    try { window.localStorage.setItem(SAVE_KEY, raw); } catch (e) { /* ignore */ }
  }
}
