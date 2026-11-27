// Gobble Run — the game itself: states, the loop, the HUD and the screens.
// One job: tie the turkey, the farmer, the world and the hazards together.

import { CORN_POINTS, ESCAPE_DISTANCE, FEATHER_POINTS, GROUND_Y, MAX_LIVES, NEAR_MISS_POINTS, VIEW_H, VIEW_W } from './config.js';
import { Input, readShotQuery } from './input.js';
import { AudioEngine } from './audio.js';
import { Turkey } from './turkey.js';
import { Farmer } from './farmer.js';
import { World } from './world.js';
import { Knife, Oven } from './hazards.js';

const TITLE = 'Gobble Run';
const SUBTITLE = "A turkey's great escape";

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.turkey = new Turkey();
    this.farmer = new Farmer();
    this.world = new World(20261127);
    this.state = 'title'; // title | play | escaped | caught
    this.score = 0;
    this.lives = MAX_LIVES;
    this.startTime = 0;
    this.endTime = 0;
    this.nearMissCooldown = 0;
    this.lastTime = 0;
    this.shot = readShotQuery();
    this.confetti = [];
    if (this.shot) this._setupShot(this.shot);
  }

  reset(seed) {
    this.turkey.reset();
    this.farmer.reset();
    this.world.reset(seed);
    this.score = 0;
    this.lives = MAX_LIVES;
    this.nearMissCooldown = 0;
    this.confetti = [];
    this.state = 'play';
    this.startTime = performance.now();
  }

  start() {
    this.audio.unlock();
    this.audio.gobble();
    this.audio.startMusic();
    this.reset((Math.random() * 1e9) | 0);
  }

  _setupShot(shot) {
    // A screenshot is one fixed frame of the real game, drawn by its own code.
    const seed = shot.seed || 7;
    if (shot.shot === 'title') {
      this.state = 'title';
    } else if (shot.shot === 'play') {
      this.reset(seed);
      this.world.distance = 212;
      this.score = 1250;
      this.lives = 3;
      this.turkey.x = 300;
      this.turkey.y = GROUND_Y - 90;
      this.turkey.vy = 120;
      this.turkey.onGround = false;
      this.farmer.x = 92;
      this.world.knives = [new Knife(760, () => 0.5)];
      this.world.knives[0].state = 'falling';
      this.world.knives[0].y = 180;
      this.world.knives[0].fallSpeed = 900;
      this.world.obstacles = [{ x: 1060, kind: 'fence', w: 46, h: 64 }];
      this.world.corn = [
        { x: 820, y: GROUND_Y - 120, taken: false },
        { x: 866, y: GROUND_Y - 120, taken: false },
        { x: 912, y: GROUND_Y - 120, taken: false },
      ];
    } else if (shot.shot === 'kitchen') {
      this.reset(seed);
      this.world.distance = 812;
      this.score = 3410;
      this.lives = 2;
      this.turkey.x = 330;
      this.farmer.x = 168;
      this.world.ovens = [new Oven(790)];
      this.world.knives = [new Knife(600, () => 0.5)];
      this.world.knives[0].state = 'stuck';
      this.world.knives[0].y = GROUND_Y - 56;
      this.world.obstacles = [{ x: 1080, kind: 'pumpkin', w: 52, h: 44 }];
    } else if (shot.shot === 'end') {
      this.reset(seed);
      this.state = 'escaped';
      this.score = 5840;
      this.world.distance = ESCAPE_DISTANCE;
      this.endTime = 0;
      this._makeConfetti();
      // A still frame catches no falling confetti, so spread it over the
      // whole screen for the screenshot; the live game still rains it down.
      for (const piece of this.confetti) piece.y = Math.random() * 560;
    }
    // One render, then the frame is done: headless Chrome screenshots it.
    requestAnimationFrame(() => {
      this.render(performance.now());
      document.title = 'shot:rendered';
    });
  }

  _makeConfetti() {
    const colors = ['#f7b267', '#c0392b', '#7da05c', '#ffd700', '#e07840'];
    for (let i = 0; i < 90; i++) {
      this.confetti.push({
        x: 120 + Math.random() * 1040,
        y: -20 - Math.random() * 300,
        vx: (Math.random() - 0.5) * 60,
        vy: 60 + Math.random() * 120,
        size: 6 + Math.random() * 8,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI,
      });
    }
  }

  loop = (now) => {
    const dt = Math.min(0.033, (now - this.lastTime) / 1000 || 0.016);
    this.lastTime = now;
    this.update(dt, now);
    this.render(now);
    requestAnimationFrame(this.loop);
  };

  update(dt, now) {
    if (this.input.consumeMute()) {
      this.audio.setMuted(!this.audio.muted);
    }
    if (this.state === 'title') {
      if (this.input.jump || this.input.consumeAnyKey()) {
        this.audio.unlock();
        this.start();
      }
      return;
    }
    if (this.state === 'escaped' || this.state === 'caught') {
      for (const piece of this.confetti) {
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.rot += dt * 3;
        if (piece.y > VIEW_H + 20) piece.y = -20;
      }
      if (this.input.consumeRestart() || this.input.jump) {
        this.audio.unlock();
        this.start();
      }
      return;
    }

    // --- play state ---
    const events = {
      onKnife: () => this.audio.knifeWhoosh(),
      onKnifeLanded: () => this.audio.knifeThud(),
      onCorn: () => {
        this.score += CORN_POINTS;
        this.audio.corn();
      },
      onFeather: () => {
        this.score += FEATHER_POINTS;
        this.audio.feather();
      },
    };
    if (this.input.jump && this.turkey.tryJump()) this.audio.jump();
    this.turkey.update(dt, this.input, now);

    // Hiding in the hay: the farmer stops and searches.
    const hay = this.world.hayCover(this.turkey);
    const hiding = this.input.duck && hay !== null && this.turkey.onGround;
    this.turkey.hidden = hiding;
    if (hiding && !this.farmer.searching) {
      this.farmer.search(now);
      this.audio.farmerYell();
    }

    this.world.update(dt, now, events);
    this.world.collect(this.turkey, events);
    this.farmer.update(dt, this.turkey.x, this.world.speed, now);

    // Score ticks up with every metre run.
    this.score += this.world.speed * dt * 0.02;

    // Near miss: a stuck knife the turkey just cleared.
    this.nearMissCooldown -= dt;
    for (const knife of this.world.knives) {
      if (knife.state === 'stuck' && Math.abs(knife.x - this.turkey.x) < 60 && this.nearMissCooldown <= 0) {
        this.score += NEAR_MISS_POINTS;
        this.nearMissCooldown = 1.2;
      }
    }

    // Fences and pumpkins trip the turkey: a stumble, and the farmer surges.
    const hit = this.world.obstacleHit(this.turkey);
    if (hit && !this.turkey.stumbling) {
      this.turkey.stumble(now);
      this.farmer.surge(now);
      this.world.shake = 14;
      this.audio.stumble();
      this.world.obstacles = this.world.obstacles.filter((o) => o !== hit);
    }

    // Knives and ovens cost a life.
    if (!this.turkey.invulnerable) {
      let hurt = false;
      for (const knife of this.world.knives) {
        if (knife.hits(this.turkey)) {
          hurt = true;
          break;
        }
      }
      if (!hurt) {
        for (const oven of this.world.ovens) {
          if (oven.hits(this.turkey)) {
            hurt = true;
            break;
          }
        }
      }
      if (hurt) {
        this.lives -= 1;
        this.turkey.hurt(now);
        this.world.shake = 18;
        this.audio.hurt();
        if (this.lives <= 0) {
          this.state = 'caught';
          this.endTime = now;
          this.audio.stopMusic();
          this.audio.caught();
          return;
        }
      }
    }

    // The farmer caught up: dinner is served.
    if (this.farmer.gapTo(this.turkey.x) < 46) {
      this.state = 'caught';
      this.endTime = now;
      this.audio.stopMusic();
      this.audio.caught();
      return;
    }

    // Outran the farm: escaped!
    if (this.world.distance >= ESCAPE_DISTANCE) {
      this.state = 'escaped';
      this.endTime = now;
      this.score += 500;
      this._makeConfetti();
      this.audio.stopMusic();
      this.audio.fanfare();
    }
  }

  render(now) {
    const ctx = this.ctx;
    ctx.save();
    if (this.world.shake > 0 && this.state === 'play') {
      ctx.translate((Math.random() - 0.5) * this.world.shake, (Math.random() - 0.5) * this.world.shake);
    }
    this.world.drawBackground(ctx, now);
    if (this.state === 'title') {
      this._drawTitle(ctx, now);
      ctx.restore();
      return;
    }
    this.world.drawWorld(ctx, now);
    this.farmer.draw(ctx);
    this.turkey.draw(ctx);
    if (this.state === 'play') this._drawHud(ctx, now);
    if (this.state === 'escaped') this._drawEnd(ctx, true, now);
    if (this.state === 'caught') this._drawEnd(ctx, false, now);
    ctx.restore();
  }

  _drawHud(ctx, now) {
    const stage = this.world.stage;
    ctx.save();
    // Top bar.
    ctx.fillStyle = 'rgba(30, 18, 6, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, 64);
    // Lives as hearts.
    for (let i = 0; i < MAX_LIVES; i++) {
      const x = 36 + i * 40;
      const y = 32;
      ctx.fillStyle = i < this.lives ? '#e74c3c' : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.bezierCurveTo(x - 12, y - 4, x - 6, y - 14, x, y - 6);
      ctx.bezierCurveTo(x + 6, y - 14, x + 12, y - 4, x, y + 8);
      ctx.fill();
    }
    // Score.
    ctx.fillStyle = '#fff3c4';
    ctx.font = 'bold 30px Trebuchet MS, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${Math.floor(this.score)}`, 170, 42);
    // Stage.
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px Trebuchet MS, sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(stage.name, VIEW_W / 2, 28);
    // Distance progress: farm to freedom.
    const progress = Math.min(1, this.world.distance / ESCAPE_DISTANCE);
    const barX = VIEW_W / 2 - 180;
    const barY = 40;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(barX, barY, 360, 12);
    ctx.fillStyle = '#7da05c';
    ctx.fillRect(barX, barY, 360 * progress, 12);
    ctx.fillStyle = '#fff3c4';
    ctx.font = 'bold 15px Trebuchet MS, sans-serif';
    ctx.fillText(`${Math.floor(this.world.distance)}m / ${ESCAPE_DISTANCE}m`, VIEW_W / 2, 68 - 8 + 24);
    // Farmer proximity warning.
    const gap = this.farmer.gapTo(this.turkey.x);
    if (gap < 170) {
      const blink = Math.floor(now / 180) % 2 === 0;
      ctx.fillStyle = blink ? '#ff3b30' : '#fff3c4';
      ctx.font = 'bold 24px Trebuchet MS, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText("HE'S CLOSE!", VIEW_W - 24, 42);
    }
    // Sound + controls hint.
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,243,196,0.85)';
    ctx.font = '15px Trebuchet MS, sans-serif';
    ctx.fillText(this.audio.muted ? 'M: sound OFF' : 'M: mute', VIEW_W - 24, 690);
    ctx.textAlign = 'left';
    ctx.fillText('← → move · SPACE jump · ↓ hide in hay', 24, 690);
    ctx.restore();
  }

  _drawTitle(ctx, now) {
    ctx.save();
    // Warm title panel.
    ctx.fillStyle = 'rgba(30, 18, 6, 0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const bob = Math.sin(now / 500) * 8;
    // A big turkey, front and centre, clear of the subtitle above it.
    ctx.save();
    ctx.translate(VIEW_W / 2, 348 + bob);
    ctx.scale(1.85, 1.85);
    const ghost = new Turkey();
    ghost.x = 0;
    ghost.y = 0;
    ghost.runPhase = now / 300;
    ghost.draw(ctx);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 84px Trebuchet MS, sans-serif';
    ctx.fillText(TITLE, VIEW_W / 2, 150);
    ctx.fillStyle = '#fff3c4';
    ctx.font = 'italic 30px Trebuchet MS, sans-serif';
    ctx.fillText(SUBTITLE, VIEW_W / 2, 195);
    ctx.fillStyle = '#ffffff';
    ctx.font = '21px Trebuchet MS, sans-serif';
    ctx.fillText('Thanksgiving morning. Farmer Bram is sharpening his carving knife.', VIEW_W / 2, 480);
    ctx.fillText('Run 1000m — farmyard, barn, kitchen — and get away before dinner.', VIEW_W / 2, 512);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px Trebuchet MS, sans-serif';
    ctx.fillText('← → run   ·   SPACE / CLICK jump   ·   ↓ duck & hide in the hay', VIEW_W / 2, 556);
    ctx.fillText('Dodge the falling knives. Jump the oven. Eat corn. Stay ahead of Bram.', VIEW_W / 2, 588);
    const pulse = 0.65 + 0.35 * Math.sin(now / 280);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Trebuchet MS, sans-serif';
    ctx.fillText('CLICK OR PRESS SPACE TO RUN', VIEW_W / 2, 650);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawEnd(ctx, escaped, now) {
    ctx.save();
    if (escaped) {
      for (const piece of this.confetti) {
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rot);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        ctx.restore();
      }
    }
    ctx.fillStyle = escaped ? 'rgba(20, 60, 20, 0.55)' : 'rgba(60, 10, 10, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = escaped ? '#ffd700' : '#ff6b5e';
    ctx.font = 'bold 76px Trebuchet MS, sans-serif';
    ctx.fillText(escaped ? 'ESCAPED!' : 'CAUGHT!', VIEW_W / 2, 250);
    ctx.fillStyle = '#fff3c4';
    ctx.font = '26px Trebuchet MS, sans-serif';
    ctx.fillText(
      escaped
        ? 'Tommy the turkey outran Farmer Bram and lived to gobble another day.'
        : 'Farmer Bram caught Tommy. Dinner is served... better luck next run.',
      VIEW_W / 2,
      310,
    );
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Trebuchet MS, sans-serif';
    ctx.fillText(`FINAL SCORE ${Math.floor(this.score)}`, VIEW_W / 2, 380);
    ctx.font = '22px Trebuchet MS, sans-serif';
    ctx.fillText(`Distance: ${Math.floor(this.world.distance)}m of ${ESCAPE_DISTANCE}m`, VIEW_W / 2, 420);
    const pulse = 0.65 + 0.35 * Math.sin(now / 280);
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 28px Trebuchet MS, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO RUN AGAIN', VIEW_W / 2, 500);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
if (!game.shot) {
  game.lastTime = performance.now();
  requestAnimationFrame(game.loop);
}
