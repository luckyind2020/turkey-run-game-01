// Gobble Run — Farmer Bram: the chase, the search and the cornering.
// One job: the hunter's AI and his drawing.

import { GROUND_Y } from './config.js';

export class Farmer {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = -120; // off the left edge; he walks in once the run starts
    this.speed = 0;
    this.searchingUntil = 0;
    this.surgeUntil = 0;
    this.walkPhase = 0;
    this.yellUntil = 0;
    this.mood = 'chase'; // chase | search | surge
  }

  get searching() {
    return performance.now() < this.searchingUntil;
  }

  get surging() {
    return performance.now() < this.surgeUntil;
  }

  // The turkey stumbled: the farmer smells dinner and sprints.
  surge(now) {
    this.surgeUntil = now + 900;
    this.yellUntil = now + 900;
    this.mood = 'surge';
  }

  // The turkey hid in the hay: the farmer stops and looks around.
  search(now) {
    this.searchingUntil = now + 1400;
    this.mood = 'search';
  }

  update(dt, turkeyX, scrollSpeed, now) {
    if (this.searching) {
      this.mood = 'search';
      this.x += 12 * dt; // he creeps, peering into the hay
    } else if (this.surging) {
      this.mood = 'surge';
      this.x += (scrollSpeed * 1.12 + 60) * dt;
    } else {
      this.mood = 'chase';
      // He keeps just under the turkey's cruise, so clean running pulls away.
      this.x += (scrollSpeed * 0.86 + 26) * dt;
    }
    // Never let him drift clean off the screen to the right of the turkey.
    if (this.x > turkeyX + 40) this.x = turkeyX + 40;
    this.walkPhase += dt * (this.searching ? 2 : 9);
    void now;
  }

  get caughtTurkey() {
    return false; // the game checks the gap itself
  }

  gapTo(turkeyX) {
    return turkeyX - this.x;
  }

  draw(ctx) {
    const now = performance.now();
    ctx.save();
    ctx.translate(this.x, GROUND_Y);
    const legSwing = Math.sin(this.walkPhase) * (this.searching ? 3 : 9);
    // Shadow.
    ctx.fillStyle = 'rgba(60, 30, 10, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 40, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs (overalls).
    ctx.strokeStyle = '#2e4a7a';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -34);
    ctx.lineTo(-8 + legSwing, 0);
    ctx.moveTo(8, -34);
    ctx.lineTo(8 - legSwing, 0);
    ctx.stroke();
    // Body: red plaid shirt under overalls.
    ctx.fillStyle = '#b03a2e';
    ctx.beginPath();
    ctx.ellipse(0, -58, 24, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7b241c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-22, -66);
    ctx.lineTo(22, -66);
    ctx.moveTo(-22, -52);
    ctx.lineTo(22, -52);
    ctx.moveTo(0, -82);
    ctx.lineTo(0, -36);
    ctx.stroke();
    ctx.fillStyle = '#2e4a7a';
    ctx.fillRect(-18, -72, 36, 22);
    // Arms: one reaching forward, one holding the pitchfork.
    ctx.strokeStyle = '#e8b088';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(14, -62);
    ctx.lineTo(34, -48 + Math.sin(now / 180) * 3);
    ctx.stroke();
    // Pitchfork.
    ctx.strokeStyle = '#8a6d3b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-26, -20);
    ctx.lineTo(-16, -96);
    ctx.stroke();
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-16 + i * 7, -96);
      ctx.lineTo(-16 + i * 7, -112);
      ctx.stroke();
    }
    // Head.
    ctx.fillStyle = '#e8b088';
    ctx.beginPath();
    ctx.arc(4, -96, 15, 0, Math.PI * 2);
    ctx.fill();
    // Angry brows + eyes.
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-4, -104);
    ctx.lineTo(4, -101);
    ctx.moveTo(12, -101);
    ctx.lineTo(18, -104);
    ctx.stroke();
    ctx.fillStyle = '#1d1206';
    ctx.beginPath();
    ctx.arc(0, -98, 2.2, 0, Math.PI * 2);
    ctx.arc(14, -98, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Mustache.
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(2, -88);
    ctx.quadraticCurveTo(8, -84, 14, -88);
    ctx.stroke();
    // Straw hat.
    ctx.fillStyle = '#e8c85a';
    ctx.beginPath();
    ctx.ellipse(4, -108, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -114, 14, 9, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#b03a2e';
    ctx.fillRect(-10, -112, 28, 4);
    // Search bubble: "?" while he looks for the hidden turkey.
    if (this.searching) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(34, -132, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d1206';
      ctx.font = 'bold 20px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', 34, -125);
    }
    // Yell bubble while surging.
    if (this.surging && now < this.yellUntil) {
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.ellipse(40, -130, 34, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7b241c';
      ctx.font = 'bold 13px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DINNER!', 40, -125);
    }
    ctx.restore();
  }
}
