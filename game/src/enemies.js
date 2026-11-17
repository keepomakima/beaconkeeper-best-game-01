// Enemies: plain data + per-frame update. All movement, biting, ranged
// bolts, burrowing, flying and boss tricks live here; the sim in game.js
// owns spawning, light effects and death.
import { ENEMIES, BOSSES, TILE, GARDEN_X, GARDEN_Y } from './config.js';
import { lightAt } from './light.js';

let nextId = 1;

export function createEnemy(kind, lane, game, hpMult = 1, speedMult = 1) {
  const def = ENEMIES[kind];
  const count = def.count || 1;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: nextId++, kind, def, lane,
      x: GARDEN_X + 9 * TILE + 30 + i * 26,
      y: GARDEN_Y + (lane + 0.5) * TILE + (count > 1 ? (i - 1) * 12 : 0),
      hp: def.hp * hpMult, maxHp: def.hp * hpMult,
      speed: def.speed * speedMult,
      biteT: 0, boltT: 2, burrowT: 0, burrowed: false,
      materialising: 0.45, wobble: game.rng.next() * Math.PI * 2,
      flash: 0, dead: false, boss: false, slowT: 0, slowFactor: 1,
    });
  }
  return out;
}

export function createBoss(kind, lane, game, hpMult = 1) {
  const def = BOSSES[kind];
  const e = {
    id: nextId++, kind, def, lane,
    x: GARDEN_X + 9 * TILE + 40,
    y: GARDEN_Y + (lane + 0.5) * TILE,
    hp: def.hp * hpMult, maxHp: def.hp * hpMult,
    speed: def.speed,
    biteT: 0, boltT: 0, burrowT: 0, burrowed: false,
    materialising: 0.6, wobble: 0, flash: 0, dead: false,
    boss: true, bossKind: kind, slowT: 0, slowFactor: 1,
    dimT: def.dimEvery || 0, crushT: def.crushEvery || 0, spawnT: def.spawnEvery || 0,
  };
  return e;
}

// One enemy's step. Returns 'ate' when it reaches the Heart Tree.
export function updateEnemy(e, dt, game) {
  if (e.dead) return null;
  if (e.flash > 0) e.flash -= dt;
  if (e.materialising > 0) { e.materialising -= dt; return null; }
  if (e.slowT > 0) e.slowT -= dt;

  // Light / dark effects at the enemy's position.
  const light = lightAt(game.lightMap, e.x, e.y, GARDEN_X, GARDEN_Y, TILE);
  e.light = light;
  const diff = game.difficulty;
  let speed = e.speed;
  if (light > 0) {
    e.hp -= game.cfg.LIGHT_BURN_DPS * light * dt;
    speed *= 1 - game.cfg.LIGHT_SLOW * light;
    if (e.hp <= 0) { killEnemy(e, game, 'burn'); return null; }
  } else {
    e.hp = Math.min(e.maxHp, e.hp + game.cfg.DARK_REGEN_DPS * dt);
    speed *= 1 + game.cfg.DARK_SPEED_BONUS;
  }
  if (e.slowT > 0) speed *= e.slowFactor;
  // Mistbloom's garden-wide slow.
  if (game.mistSlow) speed *= 1 - game.mistSlow;

  // Burrower: dives near the right edge, travels unseen, surfaces mid-garden.
  if (e.def.burrows && !e.burrowed && e.x < GARDEN_X + 7.5 * TILE && e.burrowT <= 0) {
    e.burrowed = true;
    e.burrowT = 2.5;
    game.particles.burst(e.x, e.y, 10, '#c9a06a');
  }
  if (e.burrowed) {
    e.burrowT -= dt;
    e.x -= speed * 1.4 * dt;
    if (e.burrowT <= 0) {
      e.burrowed = false;
      e.burrowT = 6; // won't dive again soon
      game.particles.burst(e.x, e.y, 12, '#c9a06a');
    }
    return null;
  }
  if (e.burrowT > 0) e.burrowT -= dt;

  // Boss tricks.
  if (e.boss) updateBoss(e, dt, game);

  // Spitter: stops at range and shoots dark bolts at the nearest plant —
  // but keeps creeping forward at a third of its speed while shooting, so
  // it can never park out of reach and stall a wave forever.
  if (e.def.ranged && !e.burrowed) {
    const target = game.nearestPlantInLane(e.lane, e.x, (e.def.boltRange || 2.5) * TILE);
    if (target) {
      e.boltT -= dt;
      if (e.boltT <= 0) {
        e.boltT = e.def.boltEvery;
        game.fireBolt(e, target);
      }
      e.x -= speed * 0.35 * dt;
      if (e.x < GARDEN_X - 70) return 'ate';
      return null;
    }
  }

  // Find a plant blocking this tile (front-most plant in this lane whose
  // tile the enemy overlaps). Flying wisps ignore plants entirely.
  const plant = e.def.flying ? null : game.plantBlocking(e);
  if (plant) {
    e.biteT -= dt;
    if (e.biteT <= 0) {
      e.biteT = 1;
      game.damagePlant(plant, e.def.bite * (e.boss ? 1 : 1), e);
    }
    return null;
  }

  e.x -= speed * dt;
  if (e.x < GARDEN_X - 70) return 'ate';
  return null;
}

function updateBoss(e, dt, game) {
  const def = e.def;
  if (e.bossKind === 'hollow') {
    e.dimT -= dt;
    if (e.dimT <= 0) {
      e.dimT = def.dimEvery;
      game.dimArea(e.lane, 3);
    }
    e.spawnT -= dt;
    if (e.spawnT <= 0) {
      e.spawnT = def.spawnEvery;
      game.spawnMinions(def.spawnKind, def.spawnCount, e.lane);
    }
  }
  if (e.bossKind === 'rootrot') {
    e.crushT -= dt;
    if (e.crushT <= 0) {
      e.crushT = def.crushEvery;
      game.crushAhead(e);
    }
    e.spawnT -= dt;
    if (e.spawnT <= 0) {
      e.spawnT = def.spawnEvery;
      game.spawnMinions(def.spawnKind, def.spawnCount, e.lane);
    }
  }
}

export function killEnemy(e, game, cause) {
  if (e.dead) return;
  e.dead = true;
  game.onKill(e, cause);
}
