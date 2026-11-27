// Gobble Run — Tommy the turkey: physics, states and his drawing.
// One job: everything about the player bird.

import { GRAVITY, GROUND_Y, JUMP_VELOCITY, MOVE_SPEED, TURKEY_MAX_X, TURKEY_MIN_X, TURKEY_START_X } from './config.js';

export class Turkey {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = TURKEY_START_X;
    this.y = GROUND_Y;
    this.vy = 0;
    this.onGround = true;
    this.ducking = false;
    this.hidden = false; // tucked inside a hay bale, the farmer cannot see him
    this.invulnerableUntil = 0;
    this.stumbleUntil = 0;
    this.runPhase = 0; // leg cycle, advanced by distance run
    this.facing = 1;
  }

  get width() {
    return this.ducking ? 74 : 56;
  }

  get height() {
    return this.ducking ? 42 : 78;
  }

  get invulnerable() {
    return performance.now() < this.invulnerableUntil;
  }

  get stumbling() {
    return performance.now() < this.stumbleUntil;
  }

  // Returns true when a jump actually left the ground.
  tryJump() {
    if (!this.onGround || this.ducking) return false;
    this.vy = -JUMP_VELOCITY;
    this.onGround = false;
    return true;
  }

  update(dt, input, now) {
    this.ducking = input.duck && this.onGround;
    if (input.left) {
      this.x -= MOVE_SPEED * dt;
      this.facing = -1;
    }
    if (input.right) {
      this.x += MOVE_SPEED * dt;
      this.facing = 1;
    }
    this.x = Math.max(TURKEY_MIN_X, Math.min(TURKEY_MAX_X, this.x));
    if (!this.onGround) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.onGround = true;
      }
    }
    if (this.onGround && !this.ducking) this.runPhase += dt * 11;
    void now;
  }

  stumble(now) {
    this.stumbleUntil = now + 600;
  }

  hurt(now) {
    this.invulnerableUntil = now + 1500;
  }

  draw(ctx) {
    const now = performance.now();
    // Blink while invulnerable so a hit reads at a glance.
    if (this.invulnerable && Math.floor(now / 120) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.stumbling) ctx.rotate(0.12 * Math.sin(now / 60));
    const legSwing = Math.sin(this.runPhase) * (this.onGround ? 10 : 4);
    const squash = this.ducking ? 0.62 : this.onGround ? 1 : 1.06;

    // Shadow on the ground.
    ctx.fillStyle = 'rgba(60, 30, 10, 0.25)';
    const shadowW = 46 * (this.onGround ? 1 : 0.7);
    ctx.beginPath();
    ctx.ellipse(0, 4, shadowW, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.scale(1, squash);
    // Legs.
    ctx.strokeStyle = '#e07840';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, -8);
    ctx.lineTo(-12 + legSwing, 2);
    ctx.moveTo(12, -8);
    ctx.lineTo(12 - legSwing, 2);
    ctx.stroke();
    // Tail feathers, fanned behind.
    const featherColors = ['#a06a35', '#c98a4b', '#7d4f24', '#d9a05b', '#8a5a2b'];
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i - 2) * 0.42;
      const fx = Math.cos(angle) * 34;
      const fy = Math.sin(angle) * 34;
      ctx.fillStyle = featherColors[i];
      ctx.beginPath();
      ctx.ellipse(-14 + fx * 0.7, -30 + fy * 0.7, 11, 24, angle + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b06a';
      ctx.beginPath();
      ctx.ellipse(-14 + fx * 0.7, -30 + fy * 0.7, 5, 12, angle + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Body.
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.ellipse(0, -34, 30, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a06a35';
    ctx.beginPath();
    ctx.ellipse(4, -30, 20, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wing.
    const wingFlap = this.onGround ? Math.sin(this.runPhase) * 4 : -8;
    ctx.fillStyle = '#6f4522';
    ctx.beginPath();
    ctx.ellipse(-2, -32 + wingFlap * 0.4, 16, 11, -0.5 + wingFlap * 0.01, 0, Math.PI * 2);
    ctx.fill();
    // Neck and head.
    ctx.fillStyle = '#c98a4b';
    ctx.fillRect(14, -62, 10, 26);
    ctx.fillStyle = '#d98a7a';
    ctx.beginPath();
    ctx.arc(20, -66, 12, 0, Math.PI * 2);
    ctx.fill();
    // Beak.
    ctx.fillStyle = '#e8a13c';
    ctx.beginPath();
    ctx.moveTo(30, -68);
    ctx.lineTo(44, -63);
    ctx.lineTo(30, -59);
    ctx.closePath();
    ctx.fill();
    // Wattle.
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(30, -56, 4, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Eye.
    ctx.fillStyle = '#1d1206';
    ctx.beginPath();
    ctx.arc(23, -70, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(24, -71, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
