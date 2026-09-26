// Player ship, the detachable pod, satellite bits, and all player projectiles.
import { W, H, clamp, lerp, TAU, angleTo, turnToward } from './util.js';
import { LASER_HUE } from './items.js';

const BEAM = {
  hw: [0, 10, 16, 24, 32, 42],
  hh: [0, 3, 4, 6, 8, 10],
  power: [0, 4, 8, 14, 22, 34],
};

// Docked pod centre relative to the ship, in game pixels (screen y down).
// Set so the pod swallows the 3D model's nose tip, or caps its tail.
export const DOCK = {
  front: { x: 14, y: 2.5 },
  back: { x: -14, y: 0 },
};

// ---------------------------------------------------------------------------
export class PBullet {
  constructor(kind, x, y, vx, vy, o = {}) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.r = 3;
    this.dmg = 1;
    this.t = 0;
    this.dead = false;
    this.trail = [];
    Object.assign(this, o);
  }

  die(g, spark = true) {
    this.dead = true;
    if (spark) g.fx.sparks(this.x, this.y, '#ffe0a0', 3, 1.5);
  }

  update(g) {
    const T = g.terrain;
    this.t++;
    this.x += g.scrollDelta;
    if (this.trail) for (const q of this.trail) q.x += g.scrollDelta;

    switch (this.kind) {
      case 'shot':
      case 'bitshot':
      case 'podshot':
      case 'yshot':
        this.x += this.vx;
        this.y += this.vy;
        if (T.solidAt(this.x, this.y)) this.die(g);
        break;

      case 'beam':
        this.x += this.vx;
        if (T.solidAt(this.x + this.hw * 0.5, this.y)) {
          g.fx.sparks(this.x + this.hw * 0.5, this.y, '#aee6ff', 8, 3);
          this.dead = true;
        }
        break;

      case 'helix':
        this.x += this.vx;
        this.y = this.y0 + Math.sin(this.t * 0.35 + this.phase) * this.amp;
        if (T.solidAt(this.x, this.y)) this.die(g);
        break;

      case 'ricochet': {
        const nx = this.x + this.vx, ny = this.y + this.vy;
        if (T.solidAt(nx, ny)) {
          const hx = T.solidAt(nx, this.y), hy = T.solidAt(this.x, ny);
          if (hx) this.vx = -this.vx;
          if (hy) this.vy = -this.vy;
          if (!hx && !hy) { this.vx = -this.vx; this.vy = -this.vy; }
          if (--this.bounces < 0) { this.die(g); break; }
          g.fx.sparks(this.x, this.y, '#8ae0ff', 3, 1.5);
        } else {
          this.x = nx;
          this.y = ny;
        }
        break;
      }

      case 'crawler': {
        const s = this.surf;
        if (this.mode === 'vert') {
          this.x += this.dir * 1;
          if (T.solidAt(this.x, this.y + this.vy + s * 2)) {
            this.mode = 'crawl';
          } else {
            this.y += this.vy;
          }
        } else {
          const nx = this.x + this.dir * 5.5;
          if (T.solidAt(nx + this.dir * 3, this.y)) { this.die(g); break; }
          this.x = nx;
          if (!T.solidAt(this.x, this.y + s * 8)) this.mode = 'vert';
        }
        if (this.t > 150) this.dead = true;
        break;
      }

      case 'missile': {
        if (!this.target || this.target.dead || !this.target.active) this.target = g.nearestEnemy(this.x, this.y);
        if (this.target && this.t > 6) {
          const tp = this.target.parts ? this.target.parts[0] || this.target : this.target;
          this.a = turnToward(this.a, angleTo(this.x, this.y, tp.x, tp.y), 0.09);
        }
        this.sp = Math.min(4.8, this.sp + 0.15);
        this.vx = Math.cos(this.a) * this.sp;
        this.vy = Math.sin(this.a) * this.sp;
        this.x += this.vx;
        this.y += this.vy;
        if (this.t % 3 === 0) g.fx.add({ k: 'smoke', x: this.x, y: this.y, vx: 0, vy: 0, r: 2, life: 16, max: 16 });
        if (T.solidAt(this.x, this.y)) this.die(g);
        break;
      }
    }

    if (this.trail) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 7) this.trail.shift();
    }

    const sx = this.x - g.cam;
    if (sx < -60 || sx > W + 60 || this.y < -30 || this.y > H + 30) this.dead = true;
  }

  draw(ctx, cam) {
    const x = this.x - cam, y = this.y;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    switch (this.kind) {
      case 'shot':
      case 'bitshot':
        ctx.fillStyle = 'rgba(255,170,60,0.55)';
        ctx.fillRect(x - 5, y - 2, 10, 4);
        ctx.fillStyle = '#fff6c8';
        ctx.fillRect(x - 4, y - 1, 8, 2);
        break;
      case 'podshot':
      case 'yshot': {
        const c = this.kind === 'yshot' ? '255,220,60' : '255,120,50';
        ctx.fillStyle = `rgba(${c},0.6)`;
        ctx.beginPath();
        ctx.arc(x, y, this.r + 1.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, this.r * 0.5, 0, TAU);
        ctx.fill();
        break;
      }
      case 'beam':
        this.drawBeam(ctx, x, y);
        break;
      case 'helix':
      case 'ricochet':
      case 'crawler': {
        const hue = LASER_HUE[this.color];
        ctx.lineCap = 'round';
        ctx.strokeStyle = hue.glow;
        ctx.lineWidth = this.r * 1.8;
        this.strokeTrail(ctx, cam, 0.6);
        ctx.strokeStyle = hue.core;
        ctx.lineWidth = this.r * 0.7;
        this.strokeTrail(ctx, cam, 1);
        break;
      }
      case 'missile':
        ctx.globalCompositeOperation = 'source-over';
        ctx.translate(x, y);
        ctx.rotate(this.a);
        ctx.fillStyle = '#ff9a3a';
        ctx.fillRect(-7, -1, 3, 2);
        ctx.fillStyle = '#c0c8d8';
        ctx.fillRect(-4, -1.5, 8, 3);
        ctx.fillStyle = '#ff4a3a';
        ctx.fillRect(3, -1, 2, 2);
        break;
    }
    ctx.restore();
  }

  strokeTrail(ctx, cam, alpha) {
    if (this.trail.length < 2) return;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(this.trail[0].x - cam, this.trail[0].y);
    for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x - cam, this.trail[i].y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawBeam(ctx, x, y) {
    const { hw, hh, level } = this;
    const flick = 0.85 + Math.random() * 0.15;
    const ell = (rx, ry, color, a) => {
      ctx.globalAlpha = a * flick;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
      ctx.fill();
    };
    ell(hw * 1.1, hh * 1.4, '#2a4aff', 0.45);
    ell(hw, hh, '#6ab8ff', 0.7);
    ell(hw * 0.85, hh * 0.45, '#ffffff', 1);
    if (level >= 3) {
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#c8ecff';
      ctx.lineWidth = 1;
      for (const ph of [0, Math.PI]) {
        ctx.beginPath();
        for (let i = -hw * 1.7; i <= hw; i += 3) {
          const yy = y + Math.sin(i * 0.25 + this.t * 0.9 + ph) * hh * 1.1 * (1 - Math.abs(i) / (hw * 1.8));
          if (i === -hw * 1.7) ctx.moveTo(x + i, yy);
          else ctx.lineTo(x + i, yy);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
function poly(ctx, pts, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

// The player's fighter – an original design: needle nose, swept tail fins, cyan canopy.
export function drawShip(ctx, x, y, tilt = 0, flame = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 1 - Math.min(0.3, Math.abs(tilt) * 0.25));
  if (flame) {
    const len = 5 + Math.random() * 5;
    ctx.globalCompositeOperation = 'lighter';
    poly(ctx, [[-15, -3], [-15, 3], [-18 - len, 0]], 'rgba(255,130,40,0.7)');
    poly(ctx, [[-15, -1.5], [-15, 1.5], [-15 - len, 0]], '#c8ecff');
    ctx.globalCompositeOperation = 'source-over';
  }
  poly(ctx, [[-5, -4], [-10, -10], [-15, -10], [-13, -3]], '#56648a');
  ctx.fillStyle = '#b8c6e6';
  ctx.fillRect(-15, -10, 5, 1);
  poly(ctx, [[-6, 4], [-11, 8], [-15, 8], [-13, 3]], '#3e4a68');
  ctx.fillStyle = '#343a4a';
  ctx.fillRect(-16, -3, 4, 6);
  const hg = ctx.createLinearGradient(0, -4, 0, 4);
  hg.addColorStop(0, '#f4f7fd');
  hg.addColorStop(0.5, '#a4b0c8');
  hg.addColorStop(1, '#566080');
  poly(ctx, [[-14, -2.5], [-8, -4], [2, -4], [10, -2], [19, 0], [10, 2], [2, 4], [-8, 4], [-14, 2.5]], hg);
  ctx.fillStyle = '#ff7a2a';
  ctx.fillRect(-10, 0, 15, 1);
  ctx.fillStyle = '#2a3148';
  ctx.fillRect(-8, 3, 12, 1);
  const cg = ctx.createLinearGradient(0, -5, 0, -1);
  cg.addColorStop(0, '#d8fcff');
  cg.addColorStop(1, '#1a6a9a');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.ellipse(4, -3, 5, 2, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
export class Player {
  constructor(g, x, y) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.dead = false;
    this.entering = true;
    this.inv = 0;
    this.speedLv = 0;
    this.missile = false;
    this.missileCd = 0;
    this.charge = 0;
    this.holdT = 0;
    this.tilt = 0;
    this.turn = 0;
    this.t = 0;
  }

  get speed() { return 1.3 + this.speedLv * 0.35; }
  // Centre of the (small) hit circle.
  get hx() { return this.x + 1; }
  get hy() { return this.y; }

  update() {
    const g = this.g, inp = g.input;
    this.t++;
    if (this.dead) return;
    this.x += g.scrollDelta;

    if (this.entering) {
      this.x += 1.6;
      if (this.x - g.cam >= 56) { this.entering = false; this.inv = 100; }
      return;
    }
    if (this.inv > 0) this.inv--;

    let dx = 0, dy = 0;
    if (inp.held('left')) dx--;
    if (inp.held('right')) dx++;
    if (inp.held('up')) dy--;
    if (inp.held('down')) dy++;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    this.x += dx * this.speed;
    this.y += dy * this.speed;
    this.tilt = lerp(this.tilt, dy, 0.25);
    this.turn = lerp(this.turn, dx, 0.2);
    this.x = clamp(this.x, g.cam + 16, g.cam + W - 22);
    this.y = clamp(this.y, 10, H - 9);

    if (g.terrain.boxSolid(this.x + 2, this.y, 11, 3.5)) { g.killPlayer(); return; }

    if (this.missileCd > 0) this.missileCd--;
    if (inp.pressed('fire')) { this.fire(); this.holdT = 0; }
    if (inp.held('fire')) {
      this.holdT++;
      if (this.holdT > 10) {
        if (this.charge === 0) g.audio.chargeStart();
        this.charge = Math.min(1, this.charge + 1 / 80);
        g.audio.chargeSet(this.charge);
        if (this.t % 2 === 0) g.fx.suck(this.x + 22, this.y, this.charge >= 1 ? '#ffffff' : '#8ad8ff');
      }
    } else {
      if (this.charge >= 0.2) this.fireBeam();
      if (this.charge > 0) { this.charge = 0; g.audio.chargeStop(); }
      this.holdT = 0;
    }

    if (inp.pressed('pod') && g.pod) g.pod.toggle();
  }

  fire() {
    const g = this.g;
    const shots = g.pbullets.reduce((n, b) => n + (b.kind === 'shot'), 0);
    if (shots < 6) {
      g.pbullets.push(new PBullet('shot', this.x + 18, this.y, 8, 0, { trail: null }));
      g.audio.play('shot');
      g.r3d?.ship.fire(1);
    }
    g.pod?.fire();
    for (const b of g.bits) b.fire();
    if (this.missile && this.missileCd <= 0) {
      this.missileCd = 50;
      for (const s of [-1, 1])
        g.pbullets.push(new PBullet('missile', this.x, this.y + s * 4, 0, 0, { a: s * 1.1, sp: 1.2, dmg: 3, trail: null }));
      g.audio.play('missile');
    }
  }

  fireBeam() {
    const g = this.g;
    const L = clamp(Math.ceil(this.charge * 5), 1, 5);
    g.pbullets.push(new PBullet('beam', this.x + 16 + BEAM.hw[L], this.y, 8.5, 0, {
      hw: BEAM.hw[L], hh: BEAM.hh[L], power: BEAM.power[L], level: L, hitSet: new Set(), trail: null,
    }));
    g.fx.add({ k: 'ring', x: this.x + 20, y: this.y, r: 2, vr: 1.5 + L * 0.4, life: 12, max: 12, c: '#aee6ff' });
    g.audio.play('beam', L);
    g.r3d?.ship.fire(1 + L * 0.4);
  }

  draw(ctx, cam) {
    if (this.dead) return;
    if (this.inv > 0 && (this.t >> 2) % 2) return;
    const x = Math.round(this.x) - cam, y = Math.round(this.y);
    drawShip(ctx, x, y, this.tilt);
    this.drawCharge(ctx, cam);
  }

  // Charge orb at the nose; drawn on the 2D layer even when the ship is 3D.
  drawCharge(ctx, cam) {
    if (this.dead || this.charge <= 0) return;
    const x = Math.round(this.x) - cam, y = Math.round(this.y);
    {
      const r = 2 + this.charge * 6 + Math.sin(this.t * 0.6) * 1;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(x + 21, y, 0, x + 21, y, r * 1.8);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.35, this.charge >= 1 && this.t % 8 < 4 ? '#ffe070' : '#7ac8ff');
      gr.addColorStop(1, 'rgba(40,80,255,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(x + 21 - r * 2, y - r * 2, r * 4, r * 4);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------
// The pod: an indestructible orb that blocks bullets, rams enemies, and fires
// lasers when docked to the ship's nose or tail.
export class Pod {
  constructor(g, color) {
    this.g = g;
    this.color = color;
    this.level = 1;
    this.state = 'arrive';
    this.x = g.cam - 16;
    this.y = g.player.y;
    this.vx = 0;
    this.r = 9;
    this.spin = 0;
    this.laserCd = 0;
    this.t = 0;
  }

  get attached() { return this.state === 'front' || this.state === 'back'; }

  update() {
    const g = this.g, p = g.player;
    this.t++;
    this.spin += 0.12;
    if (this.laserCd > 0) this.laserCd--;

    switch (this.state) {
      case 'arrive':
        this.x += g.scrollDelta + 2.5;
        this.y = lerp(this.y, p.y, 0.06);
        if (this.x - g.cam >= 40) this.state = 'free';
        break;
      case 'free':
        this.x += g.scrollDelta;
        this.y = lerp(this.y, p.y, 0.035);
        break;
      case 'launch': {
        this.x += g.scrollDelta + this.vx;
        this.vx *= 0.94;
        const sx = this.x - g.cam;
        if (Math.abs(this.vx) < 0.7 || sx > W - 20 || sx < 16) this.state = 'free';
        break;
      }
      case 'recall': {
        const dx = p.x - this.x, dy = p.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        const s = Math.min(d, 5.5);
        this.x += g.scrollDelta + (dx / d) * s;
        this.y += (dy / d) * s;
        break;
      }
      case 'front':
        this.x = p.x + DOCK.front.x;
        this.y = p.y + DOCK.front.y;
        break;
      case 'back':
        this.x = p.x + DOCK.back.x;
        this.y = p.y + DOCK.back.y;
        break;
    }

    if (!this.attached) {
      this.x = clamp(this.x, g.cam + 10, g.cam + W - 10);
      this.y = clamp(this.y, 10, H - 10);
      if (this.state !== 'launch' && this.state !== 'arrive' && !p.dead && !p.entering &&
          Math.hypot(p.x - this.x, p.y - this.y) < 18) {
        this.attach(this.x > p.x ? 'front' : 'back');
      }
    }
  }

  attach(side) {
    this.state = side;
    this.g.audio.play('podAttach');
  }

  toggle() {
    const a = this.g.audio;
    switch (this.state) {
      case 'front': this.state = 'launch'; this.vx = 6.5; a.play('podLaunch'); break;
      case 'back': this.state = 'launch'; this.vx = -5.5; a.play('podLaunch'); break;
      case 'free':
      case 'launch': this.state = 'recall'; break;
      case 'recall': this.state = 'free'; break;
    }
  }

  fire() {
    const g = this.g;
    if (this.state === 'arrive' || this.state === 'recall') return;
    if (this.attached) {
      if (this.laserCd > 0) return;
      this.laserCd = 8;
      this.fireLaser();
      return;
    }
    const dirs = [[0], [0, -0.5, 0.5], [0, -0.5, 0.5, Math.PI - 0.5, Math.PI + 0.5]][this.level - 1];
    for (const a of dirs)
      g.pbullets.push(new PBullet('podshot', this.x, this.y, Math.cos(a) * 6, Math.sin(a) * 6, { trail: null }));
  }

  fireLaser() {
    const g = this.g, L = this.level, color = this.color;
    const dir = this.state === 'front' ? 1 : -1;
    const x = this.x + dir * 8, y = this.y;
    const push = (kind, vx, vy, o) => g.pbullets.push(new PBullet(kind, x, y, vx, vy, { color, ...o }));
    switch (color) {
      case 'red':
        for (const phase of [0, Math.PI])
          push('helix', 7 * dir, 0, { y0: y, phase, amp: 5 + L * 2.5, r: 2.5 + L * 0.5, dmg: 1 + L * 0.6 });
        break;
      case 'blue': {
        const angles = L >= 3 ? [-0.5, -0.25, 0, 0.25, 0.5] : [-0.45, 0, 0.45];
        for (const a of angles)
          push('ricochet', Math.cos(a) * 6.5 * dir, Math.sin(a) * 6.5, { bounces: 1 + L, dmg: 0.8 + L * 0.5, r: 2.5 });
        break;
      }
      case 'yellow':
        for (const s of [-1, 1])
          push('crawler', 0, s * 5, { dir, surf: s, mode: 'vert', dmg: 1.5 + L * 0.6, r: 2.5 + L * 0.5 });
        push('yshot', 7 * dir, 0, { dmg: 1 + L * 0.5, r: 2.5 + L * 0.4, trail: null });
        break;
    }
    g.audio.play('laser');
  }

  draw(ctx, cam) {
    const x = Math.round(this.x) - cam, y = Math.round(this.y);
    const hue = LASER_HUE[this.color];
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
    gl.addColorStop(0, hue.glow);
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.45 + 0.15 * Math.sin(this.t * 0.2);
    ctx.fillStyle = gl;
    ctx.fillRect(-16, -16, 32, 32);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (this.attached) {
      const side = this.state === 'front' ? -1 : 1;
      ctx.strokeStyle = '#b8c0d0';
      ctx.lineWidth = 2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 4, s * 5);
        ctx.quadraticCurveTo(side * 10, s * 7, side * 11, s * 2);
        ctx.stroke();
      }
    }
    const cg = ctx.createRadialGradient(-1, -1, 0, 0, 0, 6);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.4, hue.core);
    cg.addColorStop(1, hue.glow);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, TAU);
    ctx.fill();

    const n = this.level + 1;
    for (let i = 0; i < n; i++) {
      const a = this.spin + (i * TAU) / n;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#7a8298';
      ctx.beginPath();
      ctx.arc(0, 0, 8, a, a + (TAU / n) * 0.6);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#e4eaf6';
      ctx.beginPath();
      ctx.arc(0, 0, 9, a, a + (TAU / n) * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Bits: small drones above/below the ship that block bullets and add firepower.
export class Bit {
  constructor(g, slot) {
    this.g = g;
    this.slot = slot;
    this.x = g.player.x;
    this.y = g.player.y;
    this.r = 6;
    this.t = 0;
  }
  update() {
    const g = this.g, p = g.player;
    this.t++;
    this.x = lerp(this.x + g.scrollDelta, p.x - 2, 0.3);
    this.y = lerp(this.y, p.y + this.slot * 20, 0.3);
  }
  fire() {
    this.g.pbullets.push(new PBullet('bitshot', this.x + 6, this.y, 7, 0, { trail: null }));
  }
  draw(ctx, cam) {
    const x = Math.round(this.x) - cam, y = Math.round(this.y);
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(-1, -1, 0, 0, 0, 5);
    g.addColorStop(0, '#ffe8ff');
    g.addColorStop(0.5, '#c070ff');
    g.addColorStop(1, '#4a1a7a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#e0b0ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 2.5, this.t * 0.05, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}
