// Plants: creation, growth stages, attacks, healing, sun generation,
// and fusion into hybrids. A plant is plain data; the sim in game.js
// drives it. No DOM, no Date — all time comes from game.time.
import { SEEDS, FUSIONS, GROW_SPROUT_S, GROW_RADIANT_S } from './config.js';

let nextId = 1;

export function createPlant(kind, lane, col, game) {
  const def = SEEDS[kind];
  const p = {
    id: nextId++, kind, def, lane, col,
    hp: def.hp + (game.rootBonus || 0), maxHp: def.hp + (game.rootBonus || 0),
    age: 0, stage: 0, // 0 sprout, 1 bloom, 2 radiant
    glow: def.glow || 0,
    attackT: 0, sunT: def.sunEvery || 0, healT: 0,
    dead: false, flash: 0, bornAt: game.time,
    hybrid: null, // fusion def when fused
  };
  return p;
}

export function stageOf(p) {
  return p.age < GROW_SPROUT_S ? 0 : p.age < GROW_RADIANT_S ? 1 : 2;
}

// Effective stat multiplier from growth stage.
export function growthMult(p) {
  return p.stage === 0 ? 0.5 : p.stage === 1 ? 1 : 1.5;
}

export function updatePlant(p, dt, game) {
  if (p.dead) return;
  p.age += dt;
  const st = stageOf(p);
  if (st !== p.stage) {
    p.stage = st;
    if (st === 2) {
      p.maxHp = Math.round(p.maxHp * 1.25);
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.25));
      const baseGlow = p.hybrid ? p.hybrid.glow : (p.def.glow || 0);
      p.glow = Math.max(p.glow, baseGlow + 1);
      game.lightDirty = true;
    } else if (st === 1) {
      game.lightDirty = true;
    }
  }
  if (p.flash > 0) p.flash -= dt;
  // Sun generation (Sunbloom / Dawnspire / Emberheart).
  const sunEvery = p.hybrid?.sunEvery || p.def.sunEvery;
  const sunValue = p.hybrid?.sunValue || p.def.sunValue;
  if (sunEvery) {
    p.sunT -= dt;
    if (p.sunT <= 0) {
      p.sunT += sunEvery;
      game.addSun(sunValue, p);
    }
  }
  // Healing aura (Moonpetal / Dawnspire / Mistbloom).
  const heal = p.hybrid?.heal || p.def.heal;
  if (heal && p.stage >= 1) {
    p.healT -= dt;
    if (p.healT <= 0) {
      p.healT = 1;
      for (const q of game.plants) {
        if (q.dead || q === p) continue;
        if (Math.abs(q.lane - p.lane) <= 1 && Math.abs(q.col - p.col) <= 1) {
          q.hp = Math.min(q.maxHp, q.hp + heal * growthMult(p));
        }
      }
    }
  }
}

// Can seed B be fused onto plant p? Needs a grown (bloom+) base plant and
// a known fusion pair. Order-insensitive: pair key is sorted by kind name.
export function fusionFor(baseKind, seedKind) {
  const a = [baseKind, seedKind].sort().join('+');
  return FUSIONS[a] || null;
}

export function fusePlant(p, seedKind, game) {
  const f = fusionFor(p.kind, seedKind);
  if (!f) return null;
  p.hybrid = f;
  p.kind = f.kind;
  p.def = { ...p.def, name: f.name, color: p.def.color };
  p.maxHp = Math.max(p.maxHp, f.hp);
  p.hp = Math.min(p.maxHp, p.hp + Math.round(f.hp * 0.5));
  p.glow = Math.max(p.glow, f.glow);
  p.stage = Math.max(p.stage, 1);
  p.age = Math.max(p.age, GROW_SPROUT_S);
  game.lightDirty = true;
  game.discover('fusion', f.kind);
  return f;
}

// Effective combat/economy stats: a hybrid's values override the base
// seed's where the hybrid defines them.
export function effStats(p) {
  const h = p.hybrid || {};
  return {
    dmg: h.dmg ?? p.def.dmg,
    rate: h.rate ?? p.def.rate,
    range: h.range ?? p.def.range,
    melee: h.melee ?? p.def.melee,
    pierce: h.pierce ?? p.def.pierce,
    slow: h.slow ?? p.def.slow,
    slowRange: p.def.slowRange,
    slowAll: h.slowAll,
    boom: p.def.boom,
    boomRadius: p.def.boomRadius,
    boomOnDeath: h.boomOnDeath,
    sunEvery: h.sunEvery ?? p.def.sunEvery,
    sunValue: h.sunValue ?? p.def.sunValue,
    heal: h.heal ?? p.def.heal,
  };
}

export function plantCenter(p, cfg) {
  return {
    x: cfg.gardenX + (p.col + 0.5) * cfg.tile,
    y: cfg.gardenY + (p.lane + 0.5) * cfg.tile,
  };
}
