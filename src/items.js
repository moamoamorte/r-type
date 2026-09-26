// Power-up items dropped by carrier enemies.
import { TAU } from './util.js';
import { drawText } from './font.js';

export const CRYSTAL_COLORS = ['red', 'blue', 'yellow'];
export const LASER_HUE = {
  red: { core: '#fff0e0', glow: '#ff5a2a', dark: '#a01808' },
  blue: { core: '#e8fbff', glow: '#3ac8ff', dark: '#0a4a9a' },
  yellow: { core: '#fffbe0', glow: '#ffd82a', dark: '#8a6a00' },
};

export class PowerItem {
  constructor(g, x, y, type) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.type = type;
    this.r = 9;
    this.t = 0;
    this.dead = false;
  }

  // Crystals cycle colour so the player can choose which laser to collect.
  get color() {
    return CRYSTAL_COLORS[Math.floor(this.t / 110) % 3];
  }

  update() {
    const g = this.g;
    this.t++;
    this.x += g.scrollDelta - 0.35;
    this.y = this.baseY + Math.sin(this.t * 0.05) * 6;
    if (this.x - g.cam < -20) this.dead = true;
  }

  draw(ctx, cam) {
    const x = Math.round(this.x - cam), y = Math.round(this.y);
    ctx.save();
    ctx.translate(x, y);
    if (this.type === 'crystal') {
      const hue = LASER_HUE[this.color];
      ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 13);
      gl.addColorStop(0, hue.glow);
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl;
      ctx.globalAlpha = 0.6 + Math.sin(this.t * 0.2) * 0.2;
      ctx.fillRect(-13, -13, 26, 26);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const s = Math.cos(this.t * 0.08);
      ctx.scale(Math.abs(s) * 0.7 + 0.3, 1);
      ctx.fillStyle = hue.dark;
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0);
      ctx.fill();
      ctx.fillStyle = hue.glow;
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 2); ctx.lineTo(-6, 0);
      ctx.fill();
      ctx.fillStyle = hue.core;
      ctx.fillRect(-1, -5, 2, 4);
    } else {
      const cfg = {
        speed: ['#1c4a9a', '#6ab0ff', 'S'],
        missile: ['#1a7a3a', '#6aff9a', 'M'],
        bit: ['#6a2a9a', '#d08aff', 'B'],
      }[this.type];
      ctx.fillStyle = cfg[0];
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = cfg[1];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 7, this.t * 0.1, this.t * 0.1 + 4.5);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-4, -5, 3, 2);
      drawText(ctx, cfg[2], 0, -3, '#fff', { align: 'center', shadow: cfg[0] });
    }
    ctx.restore();
  }
}
