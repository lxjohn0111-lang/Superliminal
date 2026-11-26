// Unified input: keyboard + mouse (pointer lock), touch (virtual stick + look drag) and gamepad.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();   // keys pressed this frame (edge)
    this.lookDX = 0; this.lookDY = 0;
    this.wheel = 0;
    this.mouseDown = false;
    this.clicked = false;       // left click edge
    this.locked = false;
    this.enabled = true;
    this.isTouch = false;
    this.moveX = 0; this.moveY = 0; // analog move from touch / gamepad
    this.touchGrab = false; this.touchJump = false; this.touchRot = false;
    this.sensitivity = 1.0;
    this.invertY = false;
    this.onLockChange = null;
    this.onPauseRequest = null;
    this.gpPrev = {};
    this.dragMode = false;      // fallback when pointer lock is unavailable (sandboxed pages)
    this.everLocked = false;
    this.onDragMode = null;
    this.dragDist = 0;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) { if (this.enabled && this.locked) e.preventDefault(); return; }
      const k = e.code;
      this.keys.add(k); this.pressed.add(k);
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(k) && this.locked) e.preventDefault();
      if ((k === 'KeyP' || (k === 'Escape' && this.dragMode)) && this.onPauseRequest && this.locked) this.onPauseRequest('key');
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      if (this.dragMode) {
        if (!(e.buttons & 3)) return;
        this.dragDist += Math.abs(e.movementX) + Math.abs(e.movementY);
        this.lookDX += e.movementX * 1.6; this.lookDY += e.movementY * 1.6;
        return;
      }
      // Guard against occasional pointer-lock spikes in some browsers.
      if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
      this.lookDX += e.movementX; this.lookDY += e.movementY;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      if (e.button === 0) { this.mouseDown = true; if (this.dragMode) this.dragDist = 0; else this.clicked = true; }
      if (e.button === 2) this.pressed.add('Mouse2');
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      // In drag-to-look mode a click (not a drag) grabs / drops.
      if (this.dragMode && this.mouseDown && this.locked && this.dragDist < 8) this.clicked = true;
      this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });

    document.addEventListener('pointerlockchange', () => {
      if (this.dragMode) return;
      this.locked = document.pointerLockElement === canvas;
      if (this.locked) this.everLocked = true;
      if (!this.locked) { this.keys.clear(); this.mouseDown = false; }
      if (this.onLockChange) this.onLockChange(this.locked);
    });
    document.addEventListener('pointerlockerror', () => {
      // Never managed to lock (e.g. a sandboxed frame): fall back to drag-to-look.
      if (!this.everLocked) { this.enableDragMode(); return; }
      if (this.onLockChange) this.onLockChange(false, true);
    });

    this.setupTouch();
  }

  enableDragMode() {
    if (!this.dragMode) { this.dragMode = true; if (this.onDragMode) this.onDragMode(); }
    this.locked = true;
    if (this.onLockChange) this.onLockChange(true);
  }

  requestLock() {
    if (this.isTouch) { this.locked = true; if (this.onLockChange) this.onLockChange(true); return; }
    if (this.dragMode || !this.canvas.requestPointerLock) { this.enableDragMode(); return; }
    const fail = () => { if (!this.everLocked) this.enableDragMode(); };
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: false });
      if (p && p.catch) p.catch(() => { try { const q = this.canvas.requestPointerLock(); if (q && q.catch) q.catch(fail); } catch (e) { fail(); } });
    } catch (e) { fail(); }
  }
  exitLock() {
    if (this.isTouch || this.dragMode) { this.locked = false; this.mouseDown = false; if (this.onLockChange) this.onLockChange(false); return; }
    if (document.pointerLockElement) document.exitPointerLock();
  }

  setupTouch() {
    const touchEl = document.getElementById('touch');
    const joy = document.getElementById('joy'), knob = document.getElementById('joy-knob');
    let joyId = null, lookId = null, jx0 = 0, jy0 = 0, lx = 0, ly = 0;
    const enableTouch = () => {
      if (this.isTouch) return;
      this.isTouch = true;
      touchEl.classList.remove('hidden');
    };
    window.addEventListener('touchstart', enableTouch, { once: true, passive: true });

    joy.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; joyId = t.identifier;
      const r = joy.getBoundingClientRect(); jx0 = r.left + r.width / 2; jy0 = r.top + r.height / 2;
      e.preventDefault();
    }, { passive: false });
    const btn = (id, prop) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', (e) => { this[prop] = true; e.preventDefault(); e.stopPropagation(); }, { passive: false });
    };
    btn('t-grab', 'touchGrab'); btn('t-jump', 'touchJump'); btn('t-rot', 'touchRot');
    document.getElementById('t-pause').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); if (this.onPauseRequest) this.onPauseRequest('touch'); }, { passive: false });

    window.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) continue;
        if (t.target.closest && (t.target.closest('.tbtn') || t.target.closest('#menu') || t.target.closest('#complete'))) continue;
        if (lookId === null && t.clientX > window.innerWidth * 0.35) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
      }
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          let dx = t.clientX - jx0, dy = t.clientY - jy0;
          const l = Math.hypot(dx, dy), m = 55;
          if (l > m) { dx = dx / l * m; dy = dy / l * m; }
          knob.style.transform = `translate(${dx}px, ${dy}px)`;
          this.moveX = dx / m; this.moveY = -dy / m;
        } else if (t.identifier === lookId) {
          this.lookDX += (t.clientX - lx) * 2.2; this.lookDY += (t.clientY - ly) * 2.2;
          lx = t.clientX; ly = t.clientY;
        }
      }
    }, { passive: true });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { joyId = null; this.moveX = 0; this.moveY = 0; knob.style.transform = ''; }
        if (t.identifier === lookId) lookId = null;
      }
    };
    window.addEventListener('touchend', end, { passive: true });
    window.addEventListener('touchcancel', end, { passive: true });
  }

  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads[0];
    if (!gp) return null;
    const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const edge = (i) => { const now = b(i); const was = this.gpPrev[i]; this.gpPrev[i] = now; return now && !was; };
    const res = {
      mx: dz(gp.axes[0]), my: -dz(gp.axes[1]), lx: dz(gp.axes[2]), ly: dz(gp.axes[3]),
      jump: edge(0), grab: edge(2) || edge(7) || edge(5), rot: edge(4) || edge(3), pause: edge(9), run: b(10) || b(6),
    };
    if (res.mx || res.my || res.lx || res.ly || res.jump || res.grab || res.pause) this.usingPad = true;
    return res;
  }

  down(code) { return this.keys.has(code); }
  wasPressed(code) { return this.pressed.has(code); }

  // Call at end of each frame.
  endFrame() {
    this.pressed.clear();
    this.lookDX = 0; this.lookDY = 0; this.wheel = 0;
    this.clicked = false;
    this.touchGrab = false; this.touchJump = false; this.touchRot = false;
  }
}
