// Touch controls: a floating virtual stick plus fire/pod/pause buttons that
// feed the same Input actions as keyboard and gamepad, so gameplay code does
// not know the difference. Only shown on coarse pointers (touchscreens) or
// after the first real touch, so a desktop mouse never sees it.
//
// Movement here is a per-frame boolean step (see player.js), not an analog
// velocity, so the stick reports up to two directions (8-way) past a dead
// zone rather than a "relative drag" delta - a drag scheme suits analog
// velocity control, which this game doesn't have.
const STICK_RADIUS = 44;     // px, the knob's max travel from the stick centre
const DEAD_ZONE = 0.12;      // fraction of STICK_RADIUS before any direction fires
const DIR_THRESHOLD = 0.35;  // fraction of the drag's own magnitude needed per axis

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.input = game.input;
    this.active = false;
    this.stickPointer = null;   // pointerId currently driving the stick
    this.stickOrigin = { x: 0, y: 0 };
    this.stickDir = { x: 0, y: 0 };
    this.buildDom();
    this.wireStick();
    this.wireButtons();
    this.wireDoubleTapGuard();
    this.wireVisibility();
  }

  buildDom() {
    const root = document.createElement('div');
    root.id = 'touch';
    root.innerHTML = `
      <div id="touchStickZone" class="touchZone">
        <div id="touchStick"><div id="touchStickKnob"></div></div>
      </div>
      <button id="touchPod" class="touchBtn" aria-label="Pod">POD</button>
      <button id="touchFire" class="touchBtn touchBtnBig" aria-label="Fire">
        <div id="touchFireRing"></div>FIRE
      </button>
      <button id="touchFull" class="touchBtn touchBtnSmall" aria-label="Fullscreen">FS</button>
      <button id="touchPause" class="touchBtn touchBtnSmall" aria-label="Pause">II</button>
      <div id="touchPauseMenu">
        <button id="touchMute" class="touchBtn touchBtnFlat">MUTE</button>
      </div>
      <div id="touchStart" class="touchZone"></div>
    `;
    document.getElementById('wrap').appendChild(root);
    this.root = root;
    this.stickZone = root.querySelector('#touchStickZone');
    this.stickEl = root.querySelector('#touchStick');
    this.knobEl = root.querySelector('#touchStickKnob');
    this.fireRing = root.querySelector('#touchFireRing');
    this.pauseMenu = root.querySelector('#touchPauseMenu');
    this.startZone = root.querySelector('#touchStart');
  }

  // Binds a button/zone to press-and-release an Input action across pointer
  // lifetime, tracking the pointerId so a finger sliding off still releases.
  // preventDefault() on every stage (not just pointerdown) is belt-and-
  // suspenders against iOS Safari still treating fast repeated taps as a
  // double-tap-zoom gesture; see #47.
  bindAction(el, action) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('on');
      this.input.touchPress(action);
    });
    const end = (e) => {
      e.preventDefault();
      el.classList.remove('on');
      this.input.touchRelease(action);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  wireButtons() {
    this.bindAction(this.root.querySelector('#touchFire'), 'fire');
    this.bindAction(this.root.querySelector('#touchPod'), 'pod');
    this.bindAction(this.root.querySelector('#touchPause'), 'pause');
    this.bindAction(this.root.querySelector('#touchMute'), 'mute');
    this.bindAction(this.root.querySelector('#touchFull'), 'fullscreen');
    // A tap anywhere on the title/game-over/clear screen acts as start.
    this.bindAction(this.startZone, 'start');
  }

  // The standard fix for "double-tap zooms the page" on iOS Safari: touch-
  // action and per-element preventDefault aren't always enough for two fast
  // taps on the same button (e.g. rapid-firing), so also veto any touchend
  // that follows another one within a normal double-tap window. See #47.
  wireDoubleTapGuard() {
    let lastEnd = 0;
    this.root.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastEnd < 350) e.preventDefault();
      lastEnd = now;
    }, { passive: false });
  }

  wireStick() {
    const setDir = (ax, ay) => {
      const flip = (v, neg, pos) => {
        if (v < 0) { this.input.touchRelease(pos); this.input.touchPress(neg); }
        else if (v > 0) { this.input.touchRelease(neg); this.input.touchPress(pos); }
        else { this.input.touchRelease(neg); this.input.touchRelease(pos); }
      };
      flip(ax, 'left', 'right');
      flip(ay, 'up', 'down');
      this.stickDir = { x: ax, y: ay };
    };

    this.stickZone.addEventListener('pointerdown', (e) => {
      if (this.stickPointer !== null) return;
      e.preventDefault();
      this.stickZone.setPointerCapture(e.pointerId);
      this.stickPointer = e.pointerId;
      const r = this.stickZone.getBoundingClientRect();
      this.stickOrigin = { x: e.clientX - r.left, y: e.clientY - r.top };
      this.stickEl.style.left = `${this.stickOrigin.x}px`;
      this.stickEl.style.top = `${this.stickOrigin.y}px`;
      this.stickEl.classList.add('on');
    });

    this.stickZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stickPointer) return;
      e.preventDefault();
      const r = this.stickZone.getBoundingClientRect();
      const dx = (e.clientX - r.left) - this.stickOrigin.x;
      const dy = (e.clientY - r.top) - this.stickOrigin.y;
      const mag = Math.hypot(dx, dy);
      const clamped = Math.min(mag, STICK_RADIUS);
      const kx = mag > 0 ? (dx / mag) * clamped : 0;
      const ky = mag > 0 ? (dy / mag) * clamped : 0;
      this.knobEl.style.transform = `translate(${kx}px, ${ky}px)`;

      let ax = 0, ay = 0;
      if (mag > STICK_RADIUS * DEAD_ZONE) {
        if (dx / mag < -DIR_THRESHOLD) ax = -1;
        else if (dx / mag > DIR_THRESHOLD) ax = 1;
        if (dy / mag < -DIR_THRESHOLD) ay = -1;
        else if (dy / mag > DIR_THRESHOLD) ay = 1;
      }
      if (ax !== this.stickDir.x || ay !== this.stickDir.y) setDir(ax, ay);
    });

    const end = (e) => {
      if (e.pointerId !== this.stickPointer) return;
      e.preventDefault();
      this.stickPointer = null;
      this.stickEl.classList.remove('on');
      this.knobEl.style.transform = '';
      setDir(0, 0);
    };
    this.stickZone.addEventListener('pointerup', end);
    this.stickZone.addEventListener('pointercancel', end);
  }

  wireVisibility() {
    const enable = () => {
      if (this.active) return;
      this.active = true;
      this.root.classList.add('active');
    };
    if (matchMedia('(pointer: coarse)').matches) enable();
    else {
      const onFirstTouch = (e) => {
        if (e.pointerType !== 'touch') return;
        enable();
        removeEventListener('pointerdown', onFirstTouch);
      };
      addEventListener('pointerdown', onFirstTouch);
    }
  }

  // Called once per drawn frame from Game.draw() to sync DOM state that
  // depends on game state (charge ring, pause menu, start-tap overlay).
  render() {
    if (!this.active) return;
    const g = this.game;
    this.startZone.classList.toggle('on', g.state !== 'play');
    this.pauseMenu.classList.toggle('on', g.state === 'play' && g.paused);
    const charge = g.state === 'play' ? (g.player?.charge || 0) : 0;
    this.fireRing.style.setProperty('--chargeDeg', `${charge * 360}deg`);
    this.fireRing.style.opacity = charge > 0 ? '1' : '0';
  }
}
