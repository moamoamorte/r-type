// Parallax starfield, nebula, and the interior walls of the space station.
import { W, H, rand, mulberry32, TAU } from './util.js';

const INTERIOR_START = 980;  // world x where the station interior begins
const CHAMBER_START = 5488;  // world x where the organic boss chamber begins

export class Background {
  constructor() {
    this.stars = [];
    const layers = [
      { n: 60, sp: 0.12, c: ['#3a4260', '#4a4a70'] },
      { n: 40, sp: 0.35, c: ['#7080b0', '#9090c0'] },
      { n: 24, sp: 0.9, c: ['#e0e8ff', '#fff4d0', '#b0d0ff'] },
    ];
    for (const L of layers)
      for (let i = 0; i < L.n; i++)
        this.stars.push({ x: rand(0, W), y: rand(0, H), sp: L.sp * rand(0.8, 1.2), c: L.c[i % L.c.length], big: L.sp > 0.5 && Math.random() < 0.3 });

    this.nebula = this.makeNebula();
    this.girders = this.makeGirders();
    this.flesh = this.makeFlesh();
  }

  makeNebula() {
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = H;
    const c = cv.getContext('2d');
    const rng = mulberry32(7);
    const blobs = [
      [120, 60, 140, '80,40,140'], [300, 170, 120, '30,60,140'], [560, 90, 180, '110,30,90'],
      [800, 150, 150, '30,80,130'], [950, 40, 110, '90,40,150'],
    ];
    for (const [x, y, r, col] of blobs) {
      for (const ox of [0, -1024, 1024]) {
        const g = c.createRadialGradient(x + ox, y, 0, x + ox, y, r);
        g.addColorStop(0, `rgba(${col},0.28)`);
        g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g;
        c.fillRect(0, 0, 1024, H);
      }
    }
    // Distant ringed planet
    const px = 680, py = 70, pr = 26;
    const pg = c.createRadialGradient(px - 8, py - 8, 2, px, py, pr);
    pg.addColorStop(0, '#6f8fb8');
    pg.addColorStop(0.6, '#34466a');
    pg.addColorStop(1, '#141a2c');
    c.fillStyle = pg;
    c.beginPath();
    c.arc(px, py, pr, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(160,180,220,0.5)';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(px, py, pr * 1.9, pr * 0.35, -0.3, 0, TAU);
    c.stroke();
    for (let i = 0; i < 80; i++) {
      c.fillStyle = `rgba(200,200,255,${rng() * 0.4})`;
      c.fillRect(rng() * 1024, rng() * H, 1, 1);
    }
    return cv;
  }

  makeGirders() {
    const w = 192;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = H;
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d1220');
    g.addColorStop(0.5, '#080b14');
    g.addColorStop(1, '#0d1220');
    c.fillStyle = g;
    c.fillRect(0, 0, w, H);
    // Back wall panels
    c.fillStyle = '#10172a';
    for (let x = 0; x < w; x += 48) c.fillRect(x + 4, 40, 40, 144);
    c.fillStyle = '#1a2340';
    for (let x = 0; x < w; x += 48) {
      c.fillRect(x + 4, 40, 40, 1);
      for (let y = 56; y < 180; y += 22) {
        c.fillStyle = Math.random() < 0.35 ? '#3a5a8a' : '#162038';
        c.fillRect(x + 12, y, 24, 3);
      }
      c.fillStyle = '#1a2340';
    }
    // Horizontal trusses with cross bracing
    for (const ty of [26, 190]) {
      c.fillStyle = '#1e2844';
      c.fillRect(0, ty, w, 3);
      c.fillRect(0, ty + 12, w, 3);
      c.strokeStyle = '#1a2440';
      c.lineWidth = 2;
      c.beginPath();
      for (let x = 0; x < w; x += 16) {
        c.moveTo(x, ty + 3);
        c.lineTo(x + 16, ty + 12);
        c.moveTo(x + 16, ty + 3);
        c.lineTo(x, ty + 12);
      }
      c.stroke();
    }
    // Vertical columns
    for (const cx of [0, 96]) {
      c.fillStyle = '#18203a';
      c.fillRect(cx, 0, 14, H);
      c.fillStyle = '#26314f';
      c.fillRect(cx + 1, 0, 2, H);
      c.fillStyle = '#0c1020';
      c.fillRect(cx + 12, 0, 2, H);
      c.fillStyle = '#ff6040';
      c.fillRect(cx + 6, 100, 2, 2);
    }
    return cv;
  }

  makeFlesh() {
    const w = 128;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = H;
    const c = cv.getContext('2d');
    c.fillStyle = '#1a0810';
    c.fillRect(0, 0, w, H);
    const rng = mulberry32(3);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(${90 + rng() * 60},${20 + rng() * 20},${40 + rng() * 30},0.35)`;
      c.beginPath();
      c.ellipse(rng() * w, rng() * H, 6 + rng() * 14, 4 + rng() * 10, rng() * 3, 0, TAU);
      c.fill();
    }
    c.strokeStyle = 'rgba(160,40,70,0.35)';
    c.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      let x = rng() * w, y = 0;
      c.moveTo(x, y);
      while (y < H) {
        y += 12;
        x += (rng() - 0.5) * 14;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    return cv;
  }

  update() {
    for (const s of this.stars) {
      s.x -= s.sp;
      if (s.x < 0) { s.x += W; s.y = rand(0, H); }
    }
  }

  // Draw a horizontally tiling layer with parallax, clipped to start at screen x `from`.
  tiled(ctx, img, cam, par, from) {
    if (from >= W) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.max(0, from), 0, W, H);
    ctx.clip();
    const w = img.width;
    let ox = -((cam * par) % w);
    for (let x = ox; x < W; x += w) ctx.drawImage(img, Math.floor(x), 0);
    ctx.restore();
  }

  draw(ctx, cam, t) {
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, W, H);
    this.tiled(ctx, this.nebula, cam, 0.06, 0);
    for (const s of this.stars) {
      ctx.fillStyle = s.c;
      if (s.big && (t + s.y) % 40 < 20) ctx.fillRect(s.x - 1, s.y, 3, 1);
      ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
    }
    // Station interior: back wall scrolls at half speed; it starts where the hull starts.
    const interiorFrom = INTERIOR_START - cam;
    if (interiorFrom < W) {
      const doorFrom = INTERIOR_START - cam;
      this.tiled(ctx, this.girders, cam, 0.5, doorFrom);
    }
    const chamberFrom = CHAMBER_START - cam;
    if (chamberFrom < W) this.tiled(ctx, this.flesh, cam, 0.5, chamberFrom);
  }
}
