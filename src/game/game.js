// Game orchestrator: boot, main loop, chapter flow, saving, ads, pause.
import * as THREE from 'three';
import { Renderer } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { AudioEngine } from '../engine/audio.js';
import { initPhysics } from '../engine/physics.js';
import { getTextureSet } from '../engine/textures.js';
import { Level } from './level.js';
import { Player } from './player.js';
import { GrabSystem } from './grab.js';
import { Narrator } from './narrator.js';
import { Achievements } from './achievements.js';
import { HUD } from '../ui/hud.js';
import { Menu } from '../ui/menu.js';
import { LEVELS } from '../levels/index.js';

const FIXED = 1 / 60;
const DEFAULT_SETTINGS = { sensitivity: 1.0, fov: 78, quality: 'auto', master: 0.9, music: 0.55, sfx: 0.9, invertY: false, headBob: true, subtitles: true, timer: true, readout: true };

export class Game {
  constructor(platform) {
    this.platform = platform;
    this.levels = LEVELS;
    this.level = null;
    this.paused = false;
    this.started = false;    // pointer has been locked at least once this chapter
    this.transitioning = false;
    this.acc = 0;
    this.shakeAmt = 0;
    this.stats = {};
    this.pendingJump = false;
  }

  async init(progress) {
    progress(0.05, 'Waking the physics…');
    await initPhysics();
    const loaded = this.platform.load();
    this.save = Object.assign({ v: 1, level: 0, unlocked: 0, cranes: {}, best: {}, ach: {}, stats: {}, settings: {}, hints: 0, finished: false }, loaded || {});
    this.settings = Object.assign({}, DEFAULT_SETTINGS, this.save.settings || {});
    this.stats = this.save.stats || {};

    progress(0.12, 'Setting the scene…');
    this.renderer = new Renderer(document.getElementById('game'));
    this.camera = this.renderer.camera;
    this.input = new Input(document.getElementById('game'));
    this.audio = new AudioEngine();
    this.hud = new HUD(this);
    this.menu = new Menu(this);
    this.narrator = new Narrator(this);
    this.achievements = new Achievements(this);
    this.player = new Player(this);
    this.grab = new GrabSystem(this);
    this.isMobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
    if (this.isMobile) this.renderer.tier = 1;
    this.applySettings(true);

    // Pre-generate the heavy textures with progress feedback.
    const texs = ['carpet', 'plaster', 'ceiling', 'woodfloor', 'tiles', 'paint', 'wood', 'metal', 'fabric', 'concrete', 'marble', 'wallpaper'];
    for (let i = 0; i < texs.length; i++) {
      progress(0.15 + 0.6 * (i / texs.length), 'Remembering ' + ['carpets', 'walls', 'ceilings', 'floors', 'tiles', 'paint', 'furniture', 'metal', 'fabric', 'concrete', 'marble', 'wallpaper'][i] + '…');
      await new Promise((r) => setTimeout(r, 0));
      getTextureSet(texs[i]);
    }

    this.input.onLockChange = (locked, err) => this.onLockChange(locked, err);
    this.input.onPauseRequest = () => { if (this.started && !this.menu.open && !this.transitioning) this.pause(); };
    this.platform.onAdStart = () => { this.audio.suspendAll(true); };
    this.platform.onAdEnd = () => { this.audio.suspendAll(false); };
    this.platform.onMuteChange = (m) => this.audio.setMuted(m);
    this.audio.setMuted(this.platform.muted);
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.started && !this.menu.open) this.pause(); });

    const ctp = document.getElementById('click-to-play');
    ctp.addEventListener('click', () => this.engage());
    document.getElementById('game').addEventListener('click', () => { if (!this.input.locked && !this.menu.open && !this.transitioning) this.engage(); });

    progress(0.8, 'Drifting off…');
    const params = new URLSearchParams(location.search);
    this.debug = params.has('debug');
    if (params.has('q')) { this.renderer.autoQuality = false; this.renderer.setTier(parseInt(params.get('q'), 10)); this.settings.quality = params.get('q'); }
    let start = Math.min(this.save.level, this.levels.length - 1);
    if (params.has('lvl')) start = Math.min(parseInt(params.get('lvl'), 10), this.levels.length - 1);
    await this.loadLevel(start, progress);
    progress(1, 'Asleep.');
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  // First click: unlock audio + pointer lock and start gameplay.
  engage() {
    this.audio.unlock();
    this.input.requestLock();
  }

  onLockChange(locked, err) {
    if (locked) {
      this.hud.clickToPlay(false);
      if (this.menu.open) this.menu.hide();
      this.paused = false;
      this.audio.setPausedMuffle(false);
      if (!this.started) { this.started = true; this.onFirstEngage(); }
      if (!this.transitioning) this.platform.gameplayStart();
    } else {
      if (this.transitioning || this.completing) return;
      if (err) { this.hud.clickToPlay(true); return; }
      if (this.started) this.pause(); else this.hud.clickToPlay(true);
    }
  }

  onFirstEngage() {
    if (!this.level) return;
    if (this.level.index === 0 && !this.save.stats.helpShown) { this.hud.showHelp(22); this.save.stats.helpShown = 1; }
    if (this.level.def.onStart && !this.level.startedOnce) { this.level.startedOnce = true; this.level.def.onStart(this.level); }
  }

  pause() {
    if (this.menu.open) return;
    this.paused = true;
    this.platform.gameplayStop();
    this.audio.setPausedMuffle(true);
    this.input.exitLock();
    this.hud.clickToPlay(false);
    this.menu.show('pause');
  }

  resume() {
    this.menu.hide();
    this.audio.unlock();
    this.input.requestLock();
    // If lock is refused (browser cooldown), the click overlay remains available.
    setTimeout(() => { if (!this.input.locked && !this.menu.open) this.hud.clickToPlay(true); }, 400);
  }

  applySettings(initial = false) {
    const s = this.settings;
    this.camera.fov = s.fov; this.camera.updateProjectionMatrix();
    this.audio.vol.master = s.master; this.audio.vol.music = s.music; this.audio.vol.sfx = s.sfx; this.audio.applyVolumes();
    this.player.headBob = s.headBob;
    if (s.quality === 'auto') this.renderer.autoQuality = true;
    else { this.renderer.autoQuality = false; this.renderer.setTier(parseInt(s.quality, 10)); }
    if (!initial) { this.renderer.resize(); this.persist(); }
  }

  persist() {
    this.save.settings = this.settings;
    this.save.stats = this.stats;
    this.platform.save(this.save);
  }

  // ----------------------------------------------------------------- levels
  async loadLevel(index, progress = null) {
    this.transitioning = true;
    if (this.grab.held) { this.grab.held = null; this.audio.stopHoldHum(); }
    if (this.level) { this.level.dispose(); this.level = null; }
    this.narrator.reset();
    const def = this.levels[index];
    const L = new Level(this, def, index);
    this.level = L;
    this.renderer.scene.add(L.root);
    this.renderer.scene.fog = null;
    this.renderer.scene.background = new THREE.Color(0x000000);
    const T0 = performance.now(); const dbg = (m) => { if (this.debug) console.log('[load]', m, Math.round(performance.now() - T0) + 'ms'); };
    def.build(L); dbg('build');
    L.finalize(); dbg('finalize');
    this.player.attach(L.physics, L.spawnPos, L.spawnYaw);
    L.respawnPos = null;
    if (progress) progress(0.9, 'Lighting the room…');
    await new Promise((r) => setTimeout(r, 0));
    this.renderer.applyShadowSize();
    if (L.skyMesh) this.bakeSky(L);
    this.bakeEnvironment(L); dbg('env');
    // Warm up: compile shaders and run a few physics steps so props settle.
    this.player.updateCamera(this.camera, 1, 0, 0);
    try { this.renderer.renderer.compile(this.renderer.scene, this.camera); } catch (e) { /* ignore */ }
    dbg('compile');
    for (let i = 0; i < 30; i++) { L.props.beforeStep(); L.fixedUpdate(FIXED); L.physics.step(); L.props.afterStep(FIXED); }
    L.time = 0; L.stageTime = 0;
    this.audio.setAmbience(def.ambience || 'office');
    this.audio.setMood(def.mood || 'intake');
    this.audio.setReverb(def.reverb || 2.0);
    this.save.level = index; this.persist();
    this.levelStartStats = { resized: this.stats.resized || 0 };
    this.started = this.input.locked;
    this.transitioning = false;
    this.completing = false;
    this.hud.fadeTo(0, 'white', 1600);
    setTimeout(() => this.hud.chapterCard(`Chapter ${index + 1}`, def.title, def.subtitle), 700);
    setTimeout(() => this.hud.showCranes(this.cranesIn(def.id), def.cranes || 0, 4), 1500);
    if (this.started) { this.platform.gameplayStart(); this.onFirstEngage(); }
    else this.hud.clickToPlay(true);
  }

  // Render the procedural sky dome into a cube map once and use it as the scene background
  // (keeps it out of the depth buffer, so AO and fog never touch it).
  bakeSky(L) {
    const r = this.renderer.renderer;
    const skyScene = new THREE.Scene();
    L.skyMesh.removeFromParent();
    skyScene.add(L.skyMesh);
    const rt = new THREE.WebGLCubeRenderTarget(this.isMobile ? 512 : 1024, { type: THREE.HalfFloatType });
    const cam = new THREE.CubeCamera(1, 1000, rt);
    cam.update(r, skyScene);
    if (this.skyRT) this.skyRT.dispose();
    this.skyRT = rt;
    this.renderer.scene.background = rt.texture;
    L.skyMesh.geometry.dispose();
    L.skyMesh = null;
  }

  bakeEnvironment(L) {
    const r = this.renderer.renderer, scene = this.renderer.scene;
    const rt = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType, generateMipmaps: false });
    const cam = new THREE.CubeCamera(0.1, 400, rt);
    cam.position.copy(L.probePos);
    scene.add(cam);
    const pmrem = new THREE.PMREMGenerator(r);
    const hidden = [];
    L.root.traverse((o) => { if (o.isSprite || o.isPoints) { if (o.visible) { hidden.push(o); o.visible = false; } } });
    scene.environment = null;
    let envTex = null;
    for (let pass = 0; pass < 2; pass++) {
      cam.update(r, scene);
      const t = pmrem.fromCubemap(rt.texture);
      if (envTex) envTex.dispose();
      envTex = t.texture;
      scene.environment = envTex;
      scene.environmentIntensity = L.envIntensity;
    }
    for (const o of hidden) o.visible = true;
    scene.remove(cam);
    rt.dispose(); pmrem.dispose();
    if (this.envTex) this.envTex.dispose();
    this.envTex = envTex;
  }

  async startChapter(i) {
    this.menu.hide();
    this.menu.hideComplete();
    this.transitioning = true;
    this.audio.unlock();
    this.input.requestLock();
    await this.hud.fadeTo(1, 'white', 500);
    await this.loadLevel(i);
  }

  restartLevel() { this.startChapter(this.level.index); }

  async completeLevel() {
    const L = this.level;
    if (!L || L.completed) return;
    L.completed = true;
    this.completing = true;
    const def = L.def, time = L.time;
    if (this.grab.held) this.grab.dropInPlace();
    this.audio.exitSwell();
    this.platform.gameplayStop();
    this.platform.happytime();
    const prev = this.save.best[def.id];
    const newBest = prev == null || time < prev;
    if (newBest) this.save.best[def.id] = time;
    this.save.unlocked = Math.max(this.save.unlocked, Math.min(L.index + 1, this.levels.length - 1));
    const last = L.index === this.levels.length - 1;
    this.save.level = last ? L.index : L.index + 1;
    if (time <= def.par[0]) this.achievements.unlock('gold');
    if (this.levels.every((d) => this.save.best[d.id] != null && this.save.best[d.id] <= d.par[0])) this.achievements.unlock('all_gold');
    this.persist();
    this.hud._fading = true;
    await this.hud.fadeTo(1, 'white', 1400);
    this.hud._fading = false;
    this.input.exitLock();
    if (last) { this.finishGame(); return; }
    this.menu.showComplete({
      title: def.title, time, best: this.save.best[def.id], par: def.par, cranes: this.cranesIn(def.id), cranesTotal: def.cranes || 0,
      newBest, resized: (this.stats.resized || 0) - this.levelStartStats.resized,
    });
  }

  async continueAfterComplete() {
    this.menu.hideComplete();
    this.audio.unlock();
    this.input.requestLock();
    this.transitioning = true;
    const next = this.level.index + 1;
    await this.platform.midgameAd();
    await this.loadLevel(next);
  }

  async replayAfterComplete() {
    this.menu.hideComplete();
    this.transitioning = true;
    this.audio.unlock();
    this.input.requestLock();
    await this.loadLevel(this.level.index);
  }

  finishGame() {
    this.save.finished = true;
    this.achievements.unlock('finish');
    if (!this.save.hints) this.achievements.unlock('nohints');
    this.persist();
    this.transitioning = true;
    this.audio.setMood('wake');
    this.menu.rollCredits(() => {
      this.transitioning = false;
      this.hud.fadeTo(0, 'white', 800);
      this.menu.show('end');
    });
  }

  respawn(manual = false) {
    const L = this.level;
    if (!L) return;
    if (this.grab.held) { const p = this.grab.held; this.grab.held = null; this.audio.stopHoldHum(); L.props.setHeld(p, false); L.props.resetHome(p); }
    const pos = L.respawnPos || L.spawnPos, yaw = L.respawnPos ? L.respawnYaw : L.spawnYaw;
    this.player.teleport(pos, yaw);
    this.hud.fadeTo(1, 'black', 1);
    setTimeout(() => this.hud.fadeTo(0, 'black', 900), 60);
    this.audio.respawn();
    this.stats.deaths = (this.stats.deaths || 0) + 1;
  }

  // ----------------------------------------------------------------- collectibles, hints, feedback
  collectCrane(id) {
    this.save.cranes[id] = 1;
    this.persist();
    this.audio.collect();
    const def = this.level.def;
    const got = this.cranesIn(def.id);
    this.hud.showCranes(got, def.cranes || 0, 5);
    this.hud.toast({ kicker: 'Paper crane', title: `${got} of ${def.cranes} found`, desc: got === def.cranes ? 'Every crane in this chapter!' : 'Keep looking. Look again.', icon: '✦', kind: 'crane' });
    this.achievements.unlock('crane1');
    if (this.totalCranes() >= this.maxCranes()) this.achievements.unlock('crane_all');
  }
  cranesIn(levelId) { return Object.keys(this.save.cranes).filter((k) => k.startsWith(levelId + ':')).length; }
  totalCranes() { return Object.keys(this.save.cranes).length; }
  maxCranes() { return this.levels.reduce((a, d) => a + (d.cranes || 0), 0); }

  async requestHint() {
    const r = await this.platform.rewardedAd();
    if (r === 'ok' || r === 'nosdk') {
      this.save.hints = (this.save.hints || 0) + 1; this.persist();
      const text = this.level.hint();
      this.resume();
      setTimeout(() => this.hud.showHint(text, 16), 300);
    } else {
      this.hud.toast({ kicker: 'Hint', title: 'No hint available right now', desc: 'Try again in a moment.', icon: '?' });
    }
  }

  deny(text) {
    this.audio.deny(); this.hud.deny();
    if (text) { this.hud.setPrompt(text); this._denyT = 1.2; }
  }
  toastHint(text) { this.hud.showHint(text, 6); }
  flash() { this.hud.flash(); }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  setExitGlow(v) {
    if (this.completing || this.transitioning) return;
    if (v < 0.005 && (this._lastGlow || 0) < 0.005) return;
    this._lastGlow = v;
    this.hud.glow(v);
  }

  // Debug helpers (used by automated tests; harmless in production).
  debugEngage() { this.input.locked = true; this.started = true; this.hud.clickToPlay(false); this.onFirstEngage(); }
  debugPose(x, y, z, yaw, pitch = 0) { this.player.teleport([x, y, z], yaw, pitch); }

  // ----------------------------------------------------------------- main loop
  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt <= 0) return;
    const L = this.level;
    const input = this.input;
    const pad = input.pollGamepad();
    if (pad && pad.pause && this.started) { if (this.menu.open) this.resume(); else this.pause(); }
    const active = L && !this.paused && !this.transitioning && input.locked && !this.menu.open;

    if (L && !this.transitioning) {
      if (active) {
        let dx = input.lookDX, dy = input.lookDY;
        if (pad) { dx += pad.lx * 900 * dt; dy -= -pad.ly * 900 * dt; }
        this.player.look(dx, dy);
        if (input.wasPressed('Space') || input.touchJump || (pad && pad.jump)) this.pendingJump = true;
      }
      const ctl = { mx: 0, my: 0, run: false, jump: false };
      if (active) {
        ctl.mx = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0) + input.moveX + (pad ? pad.mx : 0);
        ctl.my = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0) + input.moveY + (pad ? pad.my : 0);
        ctl.run = input.down('ShiftLeft') || input.down('ShiftRight') || (pad && pad.run) || Math.hypot(input.moveX, input.moveY) > 0.95;
      }
      this.acc += dt;
      let steps = 0;
      while (this.acc >= FIXED && steps < 5) {
        ctl.jump = this.pendingJump; this.pendingJump = false;
        this.fixedStep(ctl);
        this.acc -= FIXED; steps++;
      }
      if (steps >= 5) this.acc = 0;
      const alpha = this.acc / FIXED;
      L.props.sync(alpha);
      this.shakeAmt *= Math.exp(-dt * 8);
      this.player.updateCamera(this.camera, alpha, dt, this.shakeAmt * 0.15);

      if (active) {
        this.grab.updateHover(this.camera);
        const grabPressed = input.clicked || input.wasPressed('KeyE') || input.touchGrab || (pad && pad.grab);
        if (grabPressed) {
          if (this.grab.held) this.grab.release();
          else if (this.grab.hover) this.grab.grab(this.grab.hover, this.camera);
        }
        let rot = 0;
        if (input.wheel) rot = input.wheel > 0 ? 1 : -1;
        if (input.wasPressed('KeyQ') || input.touchRot || (pad && pad.rot)) rot = 1;
        if (input.wasPressed('KeyR')) rot = -1;
        this.grab.update(dt, this.camera, { rotate: this.grab.held ? rot : 0 });
      } else if (this.grab.held) this.grab.update(dt, this.camera, { rotate: 0 });

      L.frameUpdate(dt, this.camera);
      this.narrator.update(dt);
      this.updateHUD(dt);
    }
    this.hud.update(dt);
    this.renderer.trackPerformance(dt);
    this.renderer.render(dt);
    input.endFrame();
  }

  fixedStep(ctl) {
    const L = this.level;
    L.props.beforeStep();
    this.player.fixedUpdate(FIXED, ctl);
    L.fixedUpdate(FIXED);
    L.physics.step();
    L.props.afterStep(FIXED);
    // Falling out of the dream.
    const f = this.player.feet;
    if (f.y < L.killY) {
      if (L.def.ambience === 'void') { this.achievements.unlock('leap'); this.audio.fallWhoosh(); }
      this.respawn();
    }
    const wtr = L.waterAt(f.x, f.z);
    if (wtr && f.y < wtr.y - 0.9) {
      this.audio.splash(2); this.achievements.unlock('splash'); this.respawn();
    }
    // Tall order: standing on a big prop.
    const gi = this.player.groundInfo;
    if (gi && gi.kind === 'prop' && this.player.grounded && f.y - (L.def.floorY || 0) > 4.5 && gi.prop.scale > gi.prop.spawnScale * 3) this.achievements.unlock('tall_order');
  }

  updateHUD(dt) {
    const g = this.grab, hud = this.hud;
    if (g.held) {
      hud.setCrosshair('hold');
      const p = g.held;
      if (this.settings.readout) {
        const sz = Math.max(p.sizeLocal.x, p.sizeLocal.y, p.sizeLocal.z) * g.s;
        hud.setReadout(sz >= 1 ? `${sz.toFixed(2)} m` : `${Math.round(sz * 100)} cm`);
      } else hud.setReadout(null);
    } else {
      hud.setCrosshair(g.hover ? 'hover' : '');
      hud.setReadout(null);
    }
    if (this._denyT > 0) { this._denyT -= dt; if (this._denyT <= 0) hud.setPrompt(''); }
    else if (!this.input.isTouch && (this.stats.grabs || 0) < 3 && g.hover && !g.held) hud.setPrompt('<kbd>CLICK</kbd> or <kbd>E</kbd> to grab');
    else if (!this.input.isTouch && (this.stats.drops || 0) < 3 && g.held) hud.setPrompt('<kbd>CLICK</kbd> to drop — look further away to make it bigger');
    else hud.setPrompt('');
    hud.setTimer(this.level.time, this.settings.timer);
    // Free nudge if stuck for a long time.
    const L = this.level;
    if (L.stageTime > 150 && !L.nudged) { L.nudged = true; this.narrator.say('Stuck? The pause menu has a hint, if you want one. No judgement. Some judgement.', { id: 'nudge' + L.def.id + L.stage }); }
  }
}
