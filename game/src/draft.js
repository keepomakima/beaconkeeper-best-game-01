// Draft: after each wave the keeper draws 3 boon cards, picks 1, and may
// reroll for sunlight (price climbs within one intermission).
import { BOONS, REROLL_BASE } from './config.js';

export function newDraft(game) {
  const pool = game.rng.shuffle(BOONS.map((b) => b.id));
  return { options: pool.slice(0, 3), rerolls: 0, picked: null };
}

export function rerollCost(draft) {
  return REROLL_BASE * (draft.rerolls + 1);
}

export function reroll(draft, game) {
  const cost = rerollCost(draft);
  if (game.sun < cost) return false;
  game.sun -= cost;
  draft.rerolls += 1;
  const pool = game.rng.shuffle(BOONS.map((b) => b.id));
  draft.options = pool.slice(0, 3);
  return true;
}

// Apply a boon. Returns a one-line description for the toast.
export function applyBoon(id, game) {
  if (id === 'sun') {
    game.sun += 150;
    return '+150 sunlight banked.';
  }
  if (id === 'discount') {
    const kind = game.rng.pick(Object.keys(game.seedCosts));
    game.discounts[kind] = Math.min(0.5, (game.discounts[kind] || 0) + 0.25);
    return `${game.seedName(kind)} costs 25% less from now on.`;
  }
  if (id === 'heart') {
    game.hearts = Math.min(7, game.hearts + 1);
    game.maxHearts = Math.max(game.maxHearts, game.hearts);
    return 'The Heart Tree grows a heart.';
  }
  if (id === 'grow') {
    for (const p of game.plants) {
      if (!p.dead) { p.age += 25; }
    }
    game.lightDirty = true;
    return 'Every plant surges one growth stage.';
  }
  if (id === 'fusion') {
    game.freeFusion = true;
    return 'Your next fusion is free.';
  }
  if (id === 'glow') {
    game.sunbloomGlowBonus = (game.sunbloomGlowBonus || 0) + 1;
    for (const p of game.plants) {
      if (!p.dead && p.kind === 'sunbloom') p.glow += 1;
    }
    game.lightDirty = true;
    return 'Every Sunbloom glows one tile further.';
  }
  if (id === 'roots') {
    game.rootBonus = (game.rootBonus || 0) + 150;
    for (const p of game.plants) {
      if (!p.dead) { p.maxHp += 150; p.hp += 150; }
    }
    return 'Every plant grows +150 max health.';
  }
  if (id === 'thornmail') {
    game.thornmail = true;
    return 'Attackers now bleed 8 damage on every bite.';
  }
  if (id === 'meteor') {
    game.pendingMeteor = true;
    return 'A meteor will strike the next wave.';
  }
  return '';
}

export function boonById(id) {
  return BOONS.find((b) => b.id === id);
}
