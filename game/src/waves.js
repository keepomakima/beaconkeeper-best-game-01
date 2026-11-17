// Wave director: builds a spawn queue per wave from the config roster
// plus a points budget of filler, then trickles it out. Boss waves
// spawn the boss plus a slow trickle of minions.
import { WAVES, WAVE_SPAWN_INTERVAL, ENEMIES } from './config.js';

export function buildWave(wave, game) {
  const idx = Math.min(wave - 1, WAVES.length - 1);
  const def = WAVES[idx];
  const queue = [];
  for (const [kind, n] of def.roster) {
    for (let i = 0; i < n; i++) queue.push(kind);
  }
  // Filler from the budget: cheap mothlings and crawlers.
  let budget = def.budget;
  while (budget > 0) {
    if (budget >= 2 && game.rng.next() < 0.4) { queue.push('crawler'); budget -= 2; }
    else { queue.push('mothling'); budget -= 1; }
  }
  // Endless waves (11+): keep scaling the roster of wave 10's shape.
  if (wave > WAVES.length) {
    const extra = wave - WAVES.length;
    for (let i = 0; i < 4 + extra * 2; i++) queue.push(game.rng.pick(['mothling', 'crawler', 'brute', 'spitter', 'wisp', 'burrower']));
  }
  const shuffled = game.rng.shuffle(queue);
  return {
    wave, queue: shuffled, interval: Math.max(0.4, WAVE_SPAWN_INTERVAL - wave * 0.07),
    timer: 1.2, boss: def.boss || null, bossSpawned: false, spawned: 0,
  };
}

// Boss waves also trickle a few minions so the garden never feels empty.
export function bossTrickle(game) {
  const kinds = ['mothling', 'crawler'];
  return game.rng.pick(kinds);
}

export function waveHpMult(wave) {
  // Enemies get tougher as waves climb; endless scales further.
  return 1 + (wave - 1) * 0.12 + Math.max(0, wave - 10) * 0.18;
}

export function waveSpeedMult(wave) {
  return 1 + (wave - 1) * 0.02;
}
