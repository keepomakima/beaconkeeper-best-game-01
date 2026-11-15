// Beaconkeeper — the shadows. Three kinds, each with its own target:
// wisps hunt the keeper, crawlers chew the lantern, brutes hunt the
// keeper and are worth a hit-stop when banished. A shadow first appears
// as a violet telegraph ring at the arena edge and cannot be burned
// until it has fully materialised.
import { ARENA, ENEMY_KINDS } from './config.js';
import { clamp, dist } from './random.js';

export class Enemy {
  constructor(kind, x, y, rng) {
    const def = ENEMY_KINDS[kind];
    this.kind = kind;
    this.def = def;
    this.x = x; this.y = y;
    this.radius = def.radius;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.speed = def.speed;
    this.materialising = 0.45; // seconds of telegraph before it can act
    // Deterministic wobble from the game's seeded RNG, never Math.random,
    // so the same seed replays identically.
    this.wobble = rng ? rng.angle() : 0;
    this.flash = 0;
  }
  get live() { return this.materialising <= 0; }
  update(dt, game) {
    if (this.materialising > 0) { this.materialising -= dt; return; }
    this.flash = Math.max(0, this.flash - dt);
    this.wobble += dt * 3;
    const target = this.def.hunts === 'lantern' ? game.lantern : game.keeper;
    const d = dist(this.x, this.y, target.x, target.y);
    const reach = this.radius + target.radius - 2;
    if (d > reach) {
      const a = Math.atan2(target.y - this.y, target.x - this.x);
      const wob = Math.sin(this.wobble) * 0.25;
      this.x += Math.cos(a + wob) * this.speed * dt;
      this.y += Math.sin(a + wob) * this.speed * dt;
    } else if (this.def.hunts === 'lantern') {
      game.lantern.integrity -= this.def.damage * 2 * dt;
      game.lantern.flash = 0.2;
    } else {
      if (game.keeper.hurt(game)) {
        // Knock the keeper a little so a hit reads.
        const a = Math.atan2(game.keeper.y - this.y, game.keeper.x - this.x);
        game.keeper.x = clamp(game.keeper.x + Math.cos(a) * 26, ARENA.wall + 16, ARENA.w - ARENA.wall - 16);
        game.keeper.y = clamp(game.keeper.y + Math.sin(a) * 26, ARENA.wall + 16, ARENA.h - ARENA.wall - 16);
      }
    }
  }
  damage(amount, game) {
    if (!this.live) return false;
    this.hp -= amount;
    this.flash = 0.08;
    if (this.hp <= 0) {
      game.onEnemyKilled(this);
      return true;
    }
    return false;
  }
}

// Pick a spawn point just inside a random arena edge.
export function edgeSpawn(rng) {
  const side = rng.int(0, 3);
  const m = ARENA.wall + 24;
  if (side === 0) return { x: rng.range(m, ARENA.w - m), y: m };
  if (side === 1) return { x: rng.range(m, ARENA.w - m), y: ARENA.h - m };
  if (side === 2) return { x: m, y: rng.range(m, ARENA.h - m) };
  return { x: ARENA.w - m, y: rng.range(m, ARENA.h - m) };
}
