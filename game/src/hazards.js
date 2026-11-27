// Gobble Run — the falling carving knives and the kitchen ovens.
// One job: the dangers that cost a life, with fair warning before they land.

import { GROUND_Y, VIEW_W } from './config.js';

export class Knife {
  constructor(x, rng) {
    this.x = x;
    this.y = -90;
    this.state = 'warn'; // warn -> falling -> stuck
    this.warnTimer = 0.65;
    this.fallSpeed = 0;
    this.stuckTimer = 0;
    this.wobble = rng() * Math.PI * 2;
    this.width = 26;
    this.height = 64;
  }

  update(dt, scrollSpeed) {
    this.x -= scrollSpeed * dt;
    if (this.state === 'warn') {
      this.warnTimer -= dt;
      if (this.warnTimer <= 0) this.state = 'falling';
    } else if (this.state === 'falling') {
      this.fallSpeed += 5200 * dt;
      this.y += this.fallSpeed * dt;
      if (this.y >= GROUND_Y - this.height + 8) {
        this.y = GROUND_Y - this.height + 8;
        this.state = 'stuck';
        this.stuckTimer = 2.2;
        return 'landed';
      }
    } else if (this.state === 'stuck') {
      this.stuckTimer -= dt;
      if (this.stuckTimer <= 0) return 'gone';
    }
    return null;
  }

  // Hit box while falling or stuck; the warning shadow hurts nobody.
  hits(turkey) {
    if (this.state === 'warn') return false;
    const tx0 = turkey.x - turkey.width / 2;
    const tx1 = turkey.x + turkey.width / 2;
    const ty0 = turkey.y - turkey.height;
    const ty1 = turkey.y;
    const kx0 = this.x - this.width / 2;
    const kx1 = this.x + this.width / 2;
    const ky0 = this.y;
    const ky1 = this.y + this.height;
    return tx1 > kx0 + 4 && tx0 < kx1 - 4 && ty1 > ky0 + 6 && ty0 < ky1 - 4;
  }

  draw(ctx, now) {
    ctx.save();
    if (this.state === 'warn') {
      // Telegraph: a pulsing shadow and a glint where it will land.
      const pulse = 0.35 + 0.25 * Math.sin(now / 90);
      ctx.fillStyle = `rgba(120, 10, 10, ${pulse})`;
      ctx.beginPath();
      ctx.ellipse(this.x, GROUND_Y + 4, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + 0.4 * Math.sin(now / 70)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x - 8, -70);
      ctx.lineTo(this.x + 8, -70);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const sway = this.state === 'stuck' ? Math.sin(now / 240 + this.wobble) * 0.06 : 0;
    ctx.translate(this.x, this.y + this.height / 2);
    ctx.rotate(sway);
    // Blade.
    const grad = ctx.createLinearGradient(-9, -32, 9, 32);
    grad.addColorStop(0, '#f4f6f8');
    grad.addColorStop(0.5, '#c9d1d9');
    grad.addColorStop(1, '#8b98a5');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 32);
    ctx.lineTo(-9, -14);
    ctx.lineTo(-9, -30);
    ctx.lineTo(9, -30);
    ctx.lineTo(9, -14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6e7b88';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Handle.
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(-8, -32 - 16, 16, 18);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(-8, -18, 16, 4);
    ctx.restore();
  }
}

export class Oven {
  constructor(x) {
    this.x = x;
    this.width = 150;
    this.height = 150;
    this.heatTimer = 0;
  }

  update(dt, scrollSpeed) {
    this.x -= scrollSpeed * dt;
  }

  get offscreen() {
    return this.x + this.width / 2 < -80;
  }

  // The turkey is over the hot top: only a jump clears it.
  hits(turkey) {
    const tx0 = turkey.x - turkey.width / 2;
    const tx1 = turkey.x + turkey.width / 2;
    const ty1 = turkey.y; // feet
    const ox0 = this.x - this.width / 2 + 8;
    const ox1 = this.x + this.width / 2 - 8;
    const top = GROUND_Y - this.height;
    return tx1 > ox0 && tx0 < ox1 && ty1 > top + 10;
  }

  draw(ctx, now) {
    ctx.save();
    const cx = this.x;
    const top = GROUND_Y - this.height;
    // Heat shimmer above the oven.
    for (let i = 0; i < 3; i++) {
      const phase = (now / 700 + i * 0.33) % 1;
      ctx.fillStyle = `rgba(255, 120, 40, ${0.16 * (1 - phase)})`;
      ctx.beginPath();
      ctx.ellipse(cx + Math.sin(now / 300 + i) * 12, top - phase * 60, 22 + phase * 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Body.
    const body = ctx.createLinearGradient(cx - 75, top, cx + 75, top);
    body.addColorStop(0, '#5c3a54');
    body.addColorStop(0.5, '#7a4a63');
    body.addColorStop(1, '#4a2c42');
    ctx.fillStyle = body;
    ctx.fillRect(cx - 75, top, 150, 150);
    ctx.strokeStyle = '#2e1a28';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 75, top, 150, 150);
    // Chimney.
    ctx.fillStyle = '#3a2a35';
    ctx.fillRect(cx + 38, top - 34, 26, 36);
    // Glowing door window.
    const glow = 0.65 + 0.35 * Math.sin(now / 260);
    const door = ctx.createLinearGradient(cx - 45, top + 40, cx + 45, top + 110);
    door.addColorStop(0, `rgba(255, 190, 60, ${glow})`);
    door.addColorStop(1, `rgba(255, 90, 20, ${glow})`);
    ctx.fillStyle = door;
    ctx.fillRect(cx - 45, top + 40, 90, 70);
    ctx.strokeStyle = '#2e1a28';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 45, top + 40, 90, 70);
    ctx.beginPath();
    ctx.moveTo(cx, top + 40);
    ctx.lineTo(cx, top + 110);
    ctx.stroke();
    // Dials and a warning sign.
    ctx.fillStyle = '#e8d8b0';
    ctx.beginPath();
    ctx.arc(cx - 52, top + 18, 7, 0, Math.PI * 2);
    ctx.arc(cx - 30, top + 18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.font = 'bold 15px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOT!', cx, top + 132);
    ctx.restore();
  }
}

export function offscreenX(x) {
  return x < -120 || x > VIEW_W + 400;
}
