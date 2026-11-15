// Beaconkeeper — pickups. Banished shadows drop embers (fuel + score);
// brutes sometimes drop a heart. Embers drift toward the keeper when
// they get close, so collecting them feels good instead of fiddly.
import { dist } from './random.js';

export class Pickups {
  constructor() { this.items = []; }
  clear() { this.items.length = 0; }
  dropEmber(x, y, count, rng) {
    for (let i = 0; i < count; i++) {
      this.items.push({
        kind: 'ember', x: x + rng.range(-14, 14), y: y + rng.range(-14, 14),
        vx: rng.range(-30, 30), vy: rng.range(-30, 30), life: 14, radius: 7,
      });
    }
  }
  dropHeart(x, y) {
    this.items.push({ kind: 'heart', x, y, vx: 0, vy: 0, life: 14, radius: 10 });
  }
  update(dt, game) {
    const k = game.keeper;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) { this.items.splice(i, 1); continue; }
      const d = dist(p.x, p.y, k.x, k.y);
      if (d < k.pickupRadius + 60) {
        const a = Math.atan2(k.y - p.y, k.x - p.x);
        const pull = 340 * (1 - d / (k.pickupRadius + 60));
        p.x += Math.cos(a) * pull * dt;
        p.y += Math.sin(a) * pull * dt;
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.96; p.vy *= 0.96;
      }
      if (d < k.radius + p.radius + 4) {
        if (p.kind === 'ember') {
          k.fuel = Math.min(k.maxFuel, k.fuel + 10);
          game.addScore(25, p.x, p.y);
        } else {
          k.hearts = Math.min(k.maxHearts, k.hearts + 1);
          game.particles.floatText(p.x, p.y, '+1 ♥', '#ff8fb0');
        }
        game.audio.pickup();
        game.particles.burst(p.x, p.y, p.kind === 'ember' ? '#ffc85c' : '#ff8fb0', 6, 90);
        this.items.splice(i, 1);
      }
    }
  }
}
