// Gobble Run — the scrolling world: scenery, obstacles, food and stages.
// One job: everything the turkey runs past, and what it runs into.

import { GROUND_Y, METRES_PER_PX, VIEW_H, VIEW_W, stageFor, scrollSpeed } from './config.js';
import { chance, mulberry32, pick, range } from './random.js';
import { Knife, Oven } from './hazards.js';

export class World {
  constructor(seed) {
    this.rng = mulberry32(seed);
    this.distance = 0; // metres
    this.scrollX = 0; // px scrolled, for parallax
    this.obstacles = []; // fences, pumpkins, hay bales {x, kind, w, h}
    this.corn = []; // {x, y, taken}
    this.feathers = []; // {x, y, taken}
    this.knives = [];
    this.ovens = [];
    this.nextSpawnAt = 500; // px of scroll until the next obstacle
    this.nextKnifeAt = 4200; // ms until the next falling knife
    this.shake = 0;
    this.scenery = this._makeScenery();
  }

  reset(seed) {
    const fresh = new World(seed);
    Object.assign(this, fresh);
  }

  _makeScenery() {
    const rng = mulberry32(1234);
    const items = [];
    for (let i = 0; i < 26; i++) {
      items.push({
        x: rng() * 2600,
        depth: 0.25 + rng() * 0.5,
        kind: pick(rng, ['tree', 'tree', 'fencePost', 'bush', 'pumpkinPatch']),
        size: 0.7 + rng() * 0.7,
      });
    }
    const clouds = [];
    for (let i = 0; i < 7; i++) {
      clouds.push({ x: rng() * 2600, y: 40 + rng() * 120, size: 0.7 + rng() * 0.9, speed: 6 + rng() * 10 });
    }
    return { items, clouds };
  }

  get stage() {
    return stageFor(this.distance);
  }

  get speed() {
    return scrollSpeed(this.distance);
  }

  update(dt, now, events) {
    const speed = this.speed;
    const dx = speed * dt;
    this.distance += dx * METRES_PER_PX;
    this.scrollX += dx;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 60);

    // Spawn obstacles on a gap that tightens as the run gets harder.
    this.nextSpawnAt -= dx;
    if (this.nextSpawnAt <= 0) {
      this._spawnObstacle();
      const [min, max] = this.stage.spawnGap;
      this.nextSpawnAt = range(this.rng, min, max);
    }
    // Falling knives on their own timer.
    this.nextKnifeAt -= dt * 1000;
    if (this.nextKnifeAt <= 0) {
      const [min, max] = this.stage.knivesEvery || this.stage.knifeEvery;
      this.nextKnifeAt = range(this.rng, min, max);
      this.knives.push(new Knife(VIEW_W + 120, this.rng));
      events.onKnife();
    }
    // Ovens only in the kitchen stage.
    if (this.stage.oven && chance(this.rng, dt * 0.16)) {
      this.ovens.push(new Oven(VIEW_W + 160));
    }

    for (const obstacle of this.obstacles) obstacle.x -= dx;
    for (const kernel of this.corn) kernel.x -= dx;
    for (const feather of this.feathers) feather.x -= dx;
    for (const knife of this.knives) {
      const result = knife.update(dt, speed);
      if (result === 'landed') events.onKnifeLanded();
    }
    for (const oven of this.ovens) oven.update(dt, speed);
    this.obstacles = this.obstacles.filter((o) => o.x > -160);
    this.corn = this.corn.filter((c) => c.x > -60 && !c.taken);
    this.feathers = this.feathers.filter((f) => f.x > -60 && !f.taken);
    this.knives = this.knives.filter((k) => k.x > -160 && k.state !== 'gone');
    this.ovens = this.ovens.filter((o) => !o.offscreen);
    for (const cloud of this.scenery.clouds) {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -220) cloud.x = VIEW_W + 200;
    }
  }

  _spawnObstacle() {
    const x = VIEW_W + 140;
    const roll = this.rng();
    if (roll < 0.3) {
      this.obstacles.push({ x, kind: 'fence', w: 46, h: 64 });
    } else if (roll < 0.52) {
      this.obstacles.push({ x, kind: 'pumpkin', w: 52, h: 44 });
    } else if (roll < 0.68) {
      // A hay bale: duck beside it to hide from the farmer.
      this.obstacles.push({ x, kind: 'hay', w: 84, h: 62 });
      this.corn.push({ x: x + 130, y: GROUND_Y - 120, taken: false });
    } else if (roll < 0.86) {
      // A row of corn to hop through.
      for (let i = 0; i < 4; i++) {
        this.corn.push({ x: x + i * 46, y: GROUND_Y - 96 - (i % 2) * 34, taken: false });
      }
    } else {
      this.feathers.push({ x, y: GROUND_Y - 190, taken: false });
      this.obstacles.push({ x: x + 220, kind: 'fence', w: 46, h: 64 });
    }
  }

  // Fences and pumpkins trip the turkey; hay bales hide him instead.
  obstacleHit(turkey) {
    for (const obstacle of this.obstacles) {
      if (obstacle.kind === 'hay') continue;
      const ox0 = obstacle.x - obstacle.w / 2;
      const ox1 = obstacle.x + obstacle.w / 2;
      const top = GROUND_Y - obstacle.h;
      const tx0 = turkey.x - turkey.width / 2 + 6;
      const tx1 = turkey.x + turkey.width / 2 - 6;
      const ty0 = turkey.y - turkey.height;
      const ty1 = turkey.y;
      if (tx1 > ox0 + 4 && tx0 < ox1 - 4 && ty1 > top + 8 && ty0 < GROUND_Y) {
        return obstacle;
      }
    }
    return null;
  }

  hayCover(turkey) {
    for (const obstacle of this.obstacles) {
      if (obstacle.kind !== 'hay') continue;
      if (Math.abs(turkey.x - obstacle.x) < obstacle.w / 2 + 30) return obstacle;
    }
    return null;
  }

  collect(turkey, events) {
    for (const kernel of this.corn) {
      if (kernel.taken) continue;
      if (Math.abs(kernel.x - turkey.x) < 42 && Math.abs(kernel.y - (turkey.y - 40)) < 52) {
        kernel.taken = true;
        events.onCorn(kernel);
      }
    }
    for (const feather of this.feathers) {
      if (feather.taken) continue;
      if (Math.abs(feather.x - turkey.x) < 46 && Math.abs(feather.y - (turkey.y - 40)) < 56) {
        feather.taken = true;
        events.onFeather(feather);
      }
    }
  }

  drawBackground(ctx, now) {
    const stage = this.stage;
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, stage.skyTop);
    grad.addColorStop(0.65, stage.skyBottom);
    grad.addColorStop(1, stage.ground);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Sun.
    ctx.fillStyle = 'rgba(255, 236, 170, 0.95)';
    ctx.beginPath();
    ctx.arc(1060, 96, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 236, 170, 0.35)';
    ctx.beginPath();
    ctx.arc(1060, 96, 62, 0, Math.PI * 2);
    ctx.fill();
    // Clouds.
    ctx.fillStyle = 'rgba(255, 250, 240, 0.85)';
    for (const cloud of this.scenery.clouds) {
      const s = cloud.size;
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, 56 * s, 20 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x + 34 * s, cloud.y + 6 * s, 40 * s, 16 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x - 36 * s, cloud.y + 8 * s, 36 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Parallax scenery.
    for (const item of this.scenery.items) {
      const px = ((item.x - this.scrollX * item.depth) % 2600 + 2600) % 2600 - 100;
      this._drawSceneryItem(ctx, item, px, stage);
    }
    // Ground.
    ctx.fillStyle = stage.ground;
    ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
    ctx.fillStyle = stage.groundDark;
    ctx.fillRect(0, GROUND_Y, VIEW_W, 10);
    ctx.fillStyle = stage.grass;
    ctx.fillRect(0, GROUND_Y, VIEW_W, 6);
    // Ground texture: scrolling dashes.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let x = -((this.scrollX * 1) % 90); x < VIEW_W; x += 90) {
      ctx.fillRect(x, GROUND_Y + 34, 44, 5);
      ctx.fillRect(x + 50, GROUND_Y + 74, 30, 5);
    }
    if (stage.id === 'kitchen') this._drawKitchenWall(ctx, now);
    void now;
  }

  _drawSceneryItem(ctx, item, x, stage) {
    const s = item.size;
    ctx.save();
    ctx.translate(x, GROUND_Y);
    ctx.scale(s, s);
    if (item.kind === 'tree') {
      ctx.fillStyle = '#6b4423';
      ctx.fillRect(-6, -90, 12, 90);
      ctx.fillStyle = stage.id === 'kitchen' ? '#7a5a3a' : '#c96f2e';
      ctx.beginPath();
      ctx.arc(0, -110, 42, 0, Math.PI * 2);
      ctx.arc(-30, -84, 28, 0, Math.PI * 2);
      ctx.arc(30, -84, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e07840';
      ctx.beginPath();
      ctx.arc(-14, -120, 7, 0, Math.PI * 2);
      ctx.arc(18, -96, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'bush') {
      ctx.fillStyle = '#5d7a3a';
      ctx.beginPath();
      ctx.arc(0, -14, 26, 0, Math.PI * 2);
      ctx.arc(-20, -8, 18, 0, Math.PI * 2);
      ctx.arc(20, -8, 18, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'fencePost') {
      ctx.strokeStyle = '#7d5a33';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-30, -44);
      ctx.lineTo(30, -44);
      ctx.moveTo(-30, -24);
      ctx.lineTo(30, -24);
      ctx.stroke();
      ctx.fillStyle = '#7d5a33';
      ctx.fillRect(-34, -52, 8, 52);
      ctx.fillRect(26, -52, 8, 52);
    } else if (item.kind === 'pumpkinPatch') {
      ctx.fillStyle = '#e07840';
      ctx.beginPath();
      ctx.ellipse(0, -16, 26, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a34d1c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(0, 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawKitchenWall(ctx, now) {
    // Tiled wall behind the kitchen stretch, with a hanging pan or two.
    ctx.fillStyle = 'rgba(240, 220, 200, 0.16)';
    for (let y = 470; y < GROUND_Y; y += 34) {
      for (let x = -((this.scrollX * 0.5) % 68); x < VIEW_W; x += 68) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.strokeRect(x, y, 64, 30);
      }
    }
    void now;
  }

  drawWorld(ctx, now) {
    // Hay bales, fences, pumpkins.
    for (const obstacle of this.obstacles) this._drawObstacle(ctx, obstacle, now);
    // Corn kernels.
    for (const kernel of this.corn) {
      if (kernel.taken) continue;
      const bob = Math.sin(now / 240 + kernel.x * 0.05) * 4;
      ctx.save();
      ctx.translate(kernel.x, kernel.y + bob);
      ctx.fillStyle = '#f7c948';
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 16, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c98a1b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, -10);
      ctx.lineTo(5, 10);
      ctx.moveTo(5, -10);
      ctx.lineTo(-5, 10);
      ctx.stroke();
      ctx.fillStyle = '#7da05c';
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(-7, -26);
      ctx.lineTo(2, -20);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Golden feathers.
    for (const feather of this.feathers) {
      if (feather.taken) continue;
      const bob = Math.sin(now / 200 + feather.x * 0.04) * 6;
      ctx.save();
      ctx.translate(feather.x, feather.y + bob);
      ctx.rotate(Math.sin(now / 300) * 0.3);
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 20, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.ellipse(0, -4, 4, 10, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const knife of this.knives) knife.draw(ctx, now);
    for (const oven of this.ovens) oven.draw(ctx, now);
  }

  _drawObstacle(ctx, obstacle, now) {
    ctx.save();
    ctx.translate(obstacle.x, GROUND_Y);
    if (obstacle.kind === 'fence') {
      ctx.fillStyle = '#7d5a33';
      ctx.fillRect(-23, -64, 8, 64);
      ctx.fillRect(15, -64, 8, 64);
      ctx.fillStyle = '#96683d';
      ctx.fillRect(-26, -58, 52, 9);
      ctx.fillRect(-26, -34, 52, 9);
      ctx.fillStyle = '#c96f2e';
      ctx.beginPath();
      ctx.arc(0, -64, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (obstacle.kind === 'pumpkin') {
      ctx.fillStyle = '#e07840';
      ctx.beginPath();
      ctx.ellipse(0, -22, 27, 21, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a34d1c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, -40);
      ctx.lineTo(-10, -4);
      ctx.moveTo(10, -40);
      ctx.lineTo(10, -4);
      ctx.stroke();
      ctx.fillStyle = '#5d7a3a';
      ctx.fillRect(-3, -46, 6, 10);
      // A carved grin, so it reads as a pumpkin at a glance.
      ctx.fillStyle = '#3a2410';
      ctx.beginPath();
      ctx.arc(-9, -26, 3, 0, Math.PI * 2);
      ctx.arc(9, -26, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-11, -14);
      ctx.lineTo(11, -14);
      ctx.lineTo(0, -8);
      ctx.closePath();
      ctx.fill();
    } else if (obstacle.kind === 'hay') {
      // A hay bale to hide in: duck beside it and the farmer loses you.
      ctx.fillStyle = '#d9a441';
      ctx.beginPath();
      ctx.ellipse(0, -31, 42, 31, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a87c1f';
      ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(0, -31, 42 - Math.abs(i) * 8, 8 + Math.abs(i) * 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = 'bold 13px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      const pulse = 0.6 + 0.4 * Math.sin(now / 300);
      ctx.globalAlpha = pulse;
      ctx.fillText('HIDE! ↓', 0, -72);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
