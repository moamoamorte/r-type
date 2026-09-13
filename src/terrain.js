// Tile-based scrolling terrain: collision grid + pre-rendered artwork.
import { W, H, mulberry32 } from './util.js';

export const TILE = 8;
export const ROWS = H / TILE; // 28

// Tile types
export const HULL = 1, ORGANIC = 2, MACHINE = 3;

const PAL = {
  [HULL]: { d: ['#6a7fa3', '#4f6082', '#3b4762', '#2b3347', '#20263a'], hi: '#c4d4ec', mid: '#8ea2c4', lo: '#161b28' },
  [ORGANIC]: { d: ['#8c4a68', '#6c3652', '#4f263d', '#381a2c', '#2a1321'], hi: '#d88aa8', mid: '#a45f80', lo: '#1a0b14' },
  [MACHINE]: { d: ['#667080', '#4b5260', '#383d48', '#2a2e36', '#1f2228'], hi: '#b8c2d0', mid: '#848e9e', lo: '#131519' },
};

export class Terrain {
  constructor(cols) {
    this.cols = cols;
    this.grid = new Uint8Array(cols * ROWS);
    this.canvas = null;
  }

  get(c, r) {
    if (c < 0 || c >= this.cols || r < 0 || r >= ROWS) return 0;
    return this.grid[c * ROWS + r];
  }
  set(c, r, v) {
    if (c < 0 || c >= this.cols || r < 0 || r >= ROWS) return;
    this.grid[c * ROWS + r] = v;
  }
  fillRect(c0, r0, c1, r1, v = HULL) {
    for (let c = c0; c < c1; c++) for (let r = r0; r < r1; r++) this.set(c, r, v);
  }

  solidAt(x, y) {
    return this.get(Math.floor(x / TILE), Math.floor(y / TILE)) !== 0;
  }

  // Test a box (centre + half extents) against the grid.
  boxSolid(cx, cy, hw, hh) {
    const x0 = cx - hw, x1 = cx + hw, y0 = cy - hh, y1 = cy + hh;
    for (let x = x0; ; x += TILE) {
      const px = Math.min(x, x1);
      for (let y = y0; ; y += TILE) {
        const py = Math.min(y, y1);
        if (this.solidAt(px, py)) return true;
        if (py >= y1) break;
      }
      if (px >= x1) break;
    }
    return false;
  }

  // Y of the first solid surface found scanning down from `fromY`.
  floorY(x, fromY = H / 2) {
    const c = Math.floor(x / TILE);
    for (let r = Math.max(0, Math.floor(fromY / TILE)); r < ROWS; r++) if (this.get(c, r)) return r * TILE;
    return H;
  }
  // Y of the first solid surface found scanning up from `fromY`.
  ceilY(x, fromY = H / 2) {
    const c = Math.floor(x / TILE);
    for (let r = Math.min(ROWS - 1, Math.floor(fromY / TILE)); r >= 0; r--) if (this.get(c, r)) return (r + 1) * TILE;
    return 0;
  }

  render() {
    const { cols } = this;
    const cv = document.createElement('canvas');
    cv.width = cols * TILE;
    cv.height = ROWS * TILE;
    const c = cv.getContext('2d');
    const rng = mulberry32(90210);

    // Depth map: 1 = surface tile, rising toward the interior (for fake 3D shading).
    const depth = new Uint8Array(cols * ROWS);
    for (let i = 0; i < depth.length; i++) depth[i] = this.grid[i] ? 9 : 0;
    const dAt = (cc, rr) => (rr < 0 || rr >= ROWS || cc < 0 || cc >= cols ? 9 : depth[cc * ROWS + rr]);
    for (let p = 1; p <= 4; p++) {
      for (let cc = 0; cc < cols; cc++) {
        for (let rr = 0; rr < ROWS; rr++) {
          const i = cc * ROWS + rr;
          if (depth[i] !== 9) continue;
          if (dAt(cc - 1, rr) === p - 1 || dAt(cc + 1, rr) === p - 1 || dAt(cc, rr - 1) === p - 1 || dAt(cc, rr + 1) === p - 1)
            depth[i] = p;
        }
      }
    }

    const open = (cc, rr) => rr >= 0 && rr < ROWS && cc >= 0 && cc < cols && !this.get(cc, rr);

    for (let cc = 0; cc < cols; cc++) {
      for (let rr = 0; rr < ROWS; rr++) {
        const v = this.get(cc, rr);
        if (!v) continue;
        const pal = PAL[v];
        const d = Math.min(5, depth[cc * ROWS + rr]);
        const x = cc * TILE, y = rr * TILE;
        c.fillStyle = pal.d[d - 1];
        c.fillRect(x, y, TILE, TILE);

        if (v === ORGANIC) {
          if (rng() < 0.45) {
            c.fillStyle = pal.d[Math.max(0, d - 2)];
            c.beginPath();
            c.arc(x + rng() * 8, y + rng() * 8, 1.5 + rng() * 2.5, 0, Math.PI * 2);
            c.fill();
          }
          if (rng() < 0.12) {
            c.strokeStyle = '#b0304a';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(x, y + rng() * 8);
            c.quadraticCurveTo(x + 4, y + rng() * 8, x + 8, y + rng() * 8);
            c.stroke();
          }
        } else {
          if (d >= 2) {
            c.fillStyle = 'rgba(0,0,0,0.28)';
            if (cc % 3 === 0) c.fillRect(x, y, 1, TILE);
            if (rr % 2 === 0) c.fillRect(x, y, TILE, 1);
            c.fillStyle = 'rgba(255,255,255,0.07)';
            if (cc % 3 === 0) c.fillRect(x + 1, y, 1, TILE);
            if (rr % 2 === 0) c.fillRect(x, y + 1, TILE, 1);
          }
          if (d === 2 && rng() < 0.1) {
            c.fillStyle = pal.lo;
            for (let k = 0; k < 3; k++) c.fillRect(x + 1, y + 2 + k * 2, 6, 1);
          }
          if (d === 3 && rng() < 0.06) {
            c.fillStyle = ['#ff5a3a', '#4affc0', '#ffd24a'][Math.floor(rng() * 3)];
            c.fillRect(x + 3, y + 3, 2, 2);
          }
          if (d === 1 && rng() < 0.25) {
            c.fillStyle = pal.lo;
            c.fillRect(x + 2, y + 4, 1, 1);
            c.fillRect(x + 5, y + 4, 1, 1);
          }
        }

        // Exposed faces get bevel highlights.
        if (open(cc, rr - 1)) {
          c.fillStyle = pal.hi; c.fillRect(x, y, TILE, 1);
          c.fillStyle = pal.mid; c.fillRect(x, y + 1, TILE, 1);
          if (v === ORGANIC && rng() < 0.35) this.spike(c, x + 1 + rng() * 5, y, -1, pal);
        }
        if (open(cc, rr + 1)) {
          c.fillStyle = pal.mid; c.fillRect(x, y + TILE - 2, TILE, 1);
          c.fillStyle = pal.hi; c.fillRect(x, y + TILE - 1, TILE, 1);
          if (v === ORGANIC && rng() < 0.35) this.spike(c, x + 1 + rng() * 5, y + TILE, 1, pal);
        }
        if (open(cc - 1, rr)) { c.fillStyle = pal.mid; c.fillRect(x, y, 1, TILE); }
        if (open(cc + 1, rr)) { c.fillStyle = pal.lo; c.fillRect(x + TILE - 1, y, 1, TILE); }
      }
    }
    this.canvas = cv;
  }

  spike(c, x, y, dir, pal) {
    c.fillStyle = pal.mid;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 3, y);
    c.lineTo(x + 1.5, y + dir * 3.5);
    c.fill();
  }

  draw(ctx, camI) {
    const w = Math.min(W, this.canvas.width - camI);
    if (w > 0) ctx.drawImage(this.canvas, camI, 0, w, H, 0, 0, w, H);
  }
}
