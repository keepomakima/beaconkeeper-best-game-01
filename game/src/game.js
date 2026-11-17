// STARSEED ORCHARD — the simulation. Pure logic: no DOM, no Date, no
// Math.random in gameplay paths (one seeded stream drives everything),
// so a seeded game replays identically. The browser (main.js) only
// renders this state and translates input into method calls.
import {
  COLS, LANES, TILE, GARDEN_X, GARDEN_Y, SEEDS, SEED_ORDER, FUSIONS,
  DIFFICULTY, SUN_START, SKY_SUN_EVERY, SKY_SUN_VALUE, SKY_SUN_CLICK_BONUS,
  SKY_SUN_FADE, WAVE_CLEAR_BONUS, LIGHT_BURN_DPS, LIGHT_SLOW,
  DARK_REGEN_DPS, DARK_SPEED_BONUS, WAVES,
} from './config.js';
import { makeRng } from './random.js';
import { computeLight } from './light.js';
import { createPlant, updatePlant, fusionFor, fusePlant, effStats, growthMult } from './plants.js';
import { createEnemy, createBoss, updateEnemy, killEnemy } from './enemies.js';
import { buildWave, bossTrickle, waveHpMult, waveSpeedMult } from './waves.js';
import { newDraft, reroll, applyBoon, boonById } from './draft.js';
import { Particles } from './particles.js';
import { AudioSys } from './audio.js';

export const cfg = {
  TILE, GARDEN_X, GARDEN_Y, LIGHT_BURN_DPS, LIGHT_SLOW, DARK_REGEN_DPS, DARK_SPEED_BONUS,
};

export function createGame(seed = 11, difficulty = 'bloom') {
  const game = {
    seed, rng: makeRng(seed),
    difficulty, diff: DIFFICULTY[difficulty] || DIFFICULTY.bloom,
    cfg,
    state: 'title', // title | playing | draft | paused | won | lost
    time: 0, wave: 0, endless: false,
    sun: SUN_START, hearts: 5, maxHearts: 5,
    score: 0, kills: 0, sunCollected: 0, wavesCleared: 0, fusionsMade: 0,
    plants: [], enemies: [], projectiles: [], bolts: [], beams: [], suns: [],
    lightMap: computeLight([]), lightDirty: false,
    discounts: {}, freeFusion: false, sunbloomGlowBonus: 0, mistSlow: 0,
    seedCosts: Object.fromEntries(SEED_ORDER.map((k) => [k, SEEDS[k].cost])),
    seedCooldowns: {},
    selectedSeed: 'emberpod', fuseMode: false,
    draft: null, waveDir: null,
    skySunT: 3, shake: 0, banner: null, bannerT: 0,
    toasts: [], dims: new Map(), // "lane,col" -> expiry time
    codex: { seed: new Set(), fusion: new Set(), enemy: new Set() },
    particles: new Particles(),
    audio: new AudioSys(),
    input: null,
    best: 0, pilotT: 0,
    stats: { planted: 0, fused: 0, sunsClicked: 0, rerolls: 0 },
  };
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('starseed-best') : null;
    game.best = raw ? Number(raw) || 0 : 0;
  } catch { game.best = 0; }
  game.saveBest = function () {
    if (game.score > game.best) {
      game.best = game.score;
      try { if (typeof localStorage !== 'undefined') localStorage.setItem('starseed-best', String(game.best)); } catch { /* ignore */ }
    }
  };
  attachMethods(game);
  return game;
}

function attachMethods(game) {
  game.seedName = (kind) => (SEEDS[kind] || {}).name || kind;
  game.seedCost = (kind) => Math.round(game.seedCosts[kind] * (1 - (game.discounts[kind] || 0)));

  game.discover = (type, kind) => { game.codex[type].add(kind); };

  game.addSun = (n, plant) => {
    const v = Math.round(n * game.diff.sun);
    game.sun += v;
    game.sunCollected += v;
    if (plant) game.particles.burst(plant.x ?? 0, plant.y ?? 0, 2, '#ffd94d', 40);
  };

  game.setBanner = (text, sub = '', dur = 2.2) => { game.banner = { text, sub }; game.bannerT = dur; };
  game.toast = (text) => { game.toasts.push({ text, t: 3.5 }); if (game.toasts.length > 3) game.toasts.shift(); };

  game.recomputeLight = () => {
    const map = computeLight(game.plants);
    for (const [key, until] of game.dims) {
      if (until <= game.time) { game.dims.delete(key); continue; }
      const [lane, col] = key.split(',').map(Number);
      if (lane >= 0 && lane < LANES && col >= 0 && col < COLS) map[lane][col] = 0;
    }
    game.lightMap = map;
    game.lightDirty = false;
  };

  game.plantAtTile = (lane, col) => {
    for (const p of game.plants) if (!p.dead && p.lane === lane && p.col === col) return p;
    return null;
  };

  // Plant a seed (or fuse, when fuseMode is on and the tile holds a plant).
  game.plantAt = (lane, col, kind = game.selectedSeed) => {
    if (game.state !== 'playing') return false;
    if (lane < 0 || lane >= LANES || col < 0 || col >= COLS) return false;
    const existing = game.plantAtTile(lane, col);
    if (game.fuseMode && existing && !existing.dead) return game.tryFuse(existing, kind);
    if (existing) return false;
    const cost = game.seedCost(kind);
    if (game.sun < cost) return false;
    if ((game.seedCooldowns[kind] || 0) > game.time) return false;
    game.sun -= cost;
    game.seedCooldowns[kind] = game.time + SEEDS[kind].cd;
    const p = createPlant(kind, lane, col, game);
    if (kind === 'sunbloom') p.glow += game.sunbloomGlowBonus;
    p.x = GARDEN_X + (col + 0.5) * TILE;
    p.y = GARDEN_Y + (lane + 0.5) * TILE;
    game.plants.push(p);
    game.lightDirty = true;
    game.stats.planted += 1;
    game.discover('seed', kind);
    game.particles.burst(p.x, p.y, 8, SEEDS[kind].color, 60);
    game.audio.plant();
    return true;
  };

  game.tryFuse = (plant, seedKind) => {
    if (plant.stage < 1) { game.toast('It must bloom first — wait for it to grow.'); return false; }
    const f = fusionFor(plant.kind, seedKind);
    if (!f) { game.toast('Those two do not graft together.'); return false; }
    if (game.codex.fusion.has(f.kind)) { /* already discovered */ }
    if (!game.freeFusion) {
      const cost = game.seedCost(seedKind);
      if (game.sun < cost) return false;
      game.sun -= cost;
    } else game.freeFusion = false;
    const made = fusePlant(plant, seedKind, game);
    if (!made) return false;
    game.fusionsMade += 1;
    game.stats.fused += 1;
    game.toast(`New hybrid discovered: ${made.name}!`);
    game.particles.ring(plant.x, plant.y, 16, '#fff3a0');
    game.audio.fuse();
    return true;
  };

  game.collectSun = (s) => {
    if (s.collected) return;
    s.collected = true;
    const bonus = s.landed ? 0 : SKY_SUN_CLICK_BONUS;
    game.sun += Math.round((SKY_SUN_VALUE + bonus) * game.diff.sun);
    game.sunCollected += Math.round((SKY_SUN_VALUE + bonus) * game.diff.sun);
    game.stats.sunsClicked += 1;
    game.particles.burst(s.x, s.y, 6, '#ffd94d', 50);
    game.audio.sun();
  };

  game.damagePlant = (plant, dmg, enemy) => {
    if (plant.dead) return;
    plant.hp -= dmg;
    plant.flash = 0.12;
    game.audio.bite();
    if (game.thornmail && enemy && !enemy.dead) damageEnemy(game, enemy, 8);
    if (plant.hp <= 0) killPlant(game, plant, enemy);
  };

  game.nearestPlantInLane = (lane, x, maxDist) => {
    let bestP = null; let bestD = maxDist;
    for (const p of game.plants) {
      if (p.dead || p.lane !== lane) continue;
      const d = Math.abs(p.x - x);
      if (d < bestD) { bestD = d; bestP = p; }
    }
    return bestP;
  };

  game.plantBlocking = (e) => {
    for (const p of game.plants) {
      if (p.dead || p.lane !== e.lane) continue;
      if (Math.abs(p.x - e.x) < TILE * 0.55) return p;
    }
    return null;
  };

  game.fireBolt = (e, target) => {
    game.bolts.push({ x: e.x, y: e.y, target, speed: 260, dmg: e.def.boltDmg });
  };

  game.dimArea = (lane, radius) => {
    const col = Math.max(0, Math.min(COLS - 1, Math.floor((game.bossX() - GARDEN_X) / TILE)));
    for (let l = Math.max(0, lane - 1); l <= Math.min(LANES - 1, lane + 1); l++) {
      for (let c = Math.max(0, col - radius); c <= Math.min(COLS - 1, col + radius); c++) {
        game.dims.set(`${l},${c}`, game.time + 6);
      }
    }
    game.lightDirty = true;
    game.toast('The Hollow Moth dims the garden!');
  };
  game.bossX = () => {
    const b = game.enemies.find((e) => e.boss);
    return b ? b.x : GARDEN_X + 6 * TILE;
  };

  game.spawnMinions = (kind, count, lane) => {
    for (let i = 0; i < count; i++) {
      const l = Math.max(0, Math.min(LANES - 1, lane + game.rng.int(-1, 1)));
      const made = createEnemy(kind, l, game, waveHpMult(game.wave), waveSpeedMult(game.wave));
      for (const e of made) { e.materialising = 0.3; game.enemies.push(e); }
    }
  };

  game.crushAhead = (boss) => {
    const target = game.nearestPlantInLane(boss.lane, boss.x, 1.6 * TILE);
    if (target) {
      game.particles.burst(target.x, target.y, 18, '#8a6d4b', 120);
      game.shake = 0.35;
      killPlant(game, target, boss);
      game.toast('Rootrot crushes a plant!');
    }
  };

  game.onKill = (e, cause) => {
    game.kills += 1;
    const mult = (1 + game.wave * 0.1) * game.diff.scoreMult;
    game.score += Math.round((e.def.score || 100) * mult);
    game.particles.burst(e.x, e.y, e.boss ? 40 : 10, e.def.color, e.boss ? 160 : 80);
    if (e.boss) {
      game.shake = 0.5;
      game.audio.boom();
      game.setBanner(`${e.def.name} falls!`, `+${Math.round(e.def.score * mult)} score`, 2.5);
    }
  };

  game.start = (difficulty = game.difficulty) => {
    game.difficulty = difficulty;
    game.diff = DIFFICULTY[difficulty];
    game.state = 'playing';
    game.time = 0;
    game.wave = 0;
    game.sun = SUN_START;
    game.hearts = 5; game.maxHearts = 5;
    game.score = 0; game.kills = 0; game.sunCollected = 0;
    game.plants = []; game.enemies = []; game.projectiles = []; game.bolts = []; game.beams = []; game.suns = [];
    game.discounts = {}; game.freeFusion = false; game.sunbloomGlowBonus = 0;
    game.dims.clear();
    game.recomputeLight();
    game.nextWave();
  };

  game.nextWave = () => {
    game.wave += 1;
    game.waveDir = buildWave(game.wave, game);
    const boss = game.waveDir.boss;
    if (boss === 'hollow') game.setBanner('WAVE 5 — HOLLOW MOTH', 'It eats the light. Guard your glow.', 3);
    else if (boss === 'rootrot') game.setBanner('WAVE 10 — ROOTROT TITAN', 'The final night. Hold the garden.', 3);
    else game.setBanner(`WAVE ${game.wave}`, game.endless ? 'Endless night — how long can you bloom?' : '', 2);
    if (boss) game.audio.boss();
  };

  game.waveCleared = () => {
    game.wavesCleared += 1;
    const bonus = WAVE_CLEAR_BONUS + game.wave * 10;
    game.sun += Math.round(bonus * game.diff.sun);
    game.score += Math.round(bonus * game.diff.scoreMult);
    game.audio.waveClear();
    if (game.wave >= 10 && !game.endless) {
      game.state = 'won';
      game.score += game.hearts * 1000 + Math.max(0, Math.round((900 - game.time) * 2));
      game.saveBest();
      game.audio.win();
      return;
    }
    game.draft = newDraft(game);
    game.state = 'draft';
  };

  game.chooseDraft = (index) => {
    if (game.state !== 'draft' || !game.draft) return false;
    const id = game.draft.options[index];
    if (!id) return false;
    const msg = applyBoon(id, game);
    game.toast(msg);
    game.draft = null;
    game.state = 'playing';
    game.nextWave();
    return true;
  };

  game.rerollDraft = () => {
    if (game.state !== 'draft' || !game.draft) return false;
    const ok = reroll(game.draft, game);
    if (ok) game.stats.rerolls += 1;
    return ok;
  };

  game.continueEndless = () => {
    if (game.state !== 'won') return false;
    game.endless = true;
    game.state = 'playing';
    game.nextWave();
    return true;
  };

  game.pause = () => { if (game.state === 'playing') game.state = 'paused'; };
  game.resume = () => { if (game.state === 'paused') game.state = 'playing'; };

  game.update = (dt, input) => {
    game.input = input || game.input;
    if (game.bannerT > 0) game.bannerT -= dt;
    for (const t of game.toasts) t.t -= dt;
    game.toasts = game.toasts.filter((t) => t.t > 0);
    if (game.shake > 0) game.shake -= dt;
    game.particles.update(dt);
    if (game.state !== 'playing') return;
    game.time += dt;
    if (game.lightDirty || game.dims.size > 0) game.recomputeLight();

    // Meteor Call boon: strike the next wave once foes appear.
    if (game.pendingMeteor && game.enemies.length > 0) {
      game.pendingMeteor = false;
      for (const e of game.enemies) damageEnemy(game, e, 150);
      game.particles.burst(GARDEN_X + 5 * TILE, GARDEN_Y + 2 * TILE, 40, '#ff9a3d', 200);
      game.shake = 0.4;
      game.audio.boom();
      game.toast('A meteor strikes the wave!');
    }

    // Mistbloom garden-wide slow.
    game.mistSlow = 0;
    for (const p of game.plants) {
      if (!p.dead && p.hybrid && p.hybrid.slowAll && p.stage >= 1) game.mistSlow = Math.max(game.mistSlow, p.hybrid.slowAll);
    }

    // Sky suns.
    game.skySunT -= dt;
    if (game.skySunT <= 0) {
      game.skySunT += SKY_SUN_EVERY;
      const col = game.rng.int(0, COLS - 1);
      const lane = game.rng.int(0, LANES - 1);
      game.suns.push({ x: GARDEN_X + (col + 0.5) * TILE, y: -20, targetY: GARDEN_Y + (lane + 0.5) * TILE, landed: false, t: 0, collected: false });
    }
    for (const s of game.suns) {
      if (s.collected) continue;
      if (!s.landed) {
        s.y += 70 * dt;
        if (s.y >= s.targetY) { s.y = s.targetY; s.landed = true; s.t = 0; }
      } else {
        s.t += dt;
        if (s.t >= SKY_SUN_FADE) { s.collected = true; game.addSun(SKY_SUN_VALUE); }
      }
    }
    game.suns = game.suns.filter((s) => !s.collected);

    // Plants: growth, sun, healing, attacks.
    for (const p of game.plants) {
      if (p.dead) continue;
      updatePlant(p, dt, game);
      const st = effStats(p);
      const mult = growthMult(p);
      // Melee thorns.
      if (st.melee && p.stage >= 1) {
        p.attackT -= dt;
        if (p.attackT <= 0) {
          let hit = false;
          for (const e of game.enemies) {
            if (e.dead || e.def.flying || e.materialising > 0 || e.burrowed) continue;
            if (e.lane === p.lane && Math.abs(e.x - p.x) < TILE * 1.0) {
              damageEnemy(game, e, st.dmg * mult);
              hit = true;
            }
          }
          if (hit) { p.attackT = st.rate; game.particles.burst(p.x, p.y, 3, '#8be04e', 50); }
          else p.attackT = 0.2;
        }
      }
      // Ranged shots.
      if (st.dmg && st.rate && !st.melee && !st.pierce && p.stage >= 1) {
        p.attackT -= dt;
        if (p.attackT <= 0) {
          const target = nearestEnemyInLane(game, p.lane, p.x, st.range * TILE);
          if (target) {
            p.attackT = st.rate;
            game.projectiles.push({ x: p.x + 20, y: p.y - 6, lane: p.lane, vx: 420, dmg: st.dmg * mult, slow: st.slow || 0, from: p });
            game.audio.shoot();
          } else p.attackT = 0.25;
        }
      }
      // Pierce lance: instant beam down the lane.
      if (st.pierce && p.stage >= 1) {
        p.attackT -= dt;
        if (p.attackT <= 0) {
          const targets = game.enemies.filter((e) => !e.dead && e.lane === p.lane && e.x > p.x && e.materialising <= 0);
          if (targets.length > 0) {
            p.attackT = st.rate;
            for (const e of targets) damageEnemy(game, e, st.dmg * mult);
            game.beams.push({ lane: p.lane, y: p.y, x0: p.x, x1: GARDEN_X + 9 * TILE, t: 0.25, color: '#fff3a0' });
            game.audio.lance();
          } else p.attackT = 0.3;
        }
      }
      // Frostberry chill aura.
      if (st.slow && p.stage >= 1 && !st.dmg) {
        for (const e of game.enemies) {
          if (e.dead || e.materialising > 0) continue;
          if (e.lane === p.lane && Math.abs(e.x - p.x) < (st.slowRange || 3) * TILE) {
            e.slowT = 0.6; e.slowFactor = 1 - st.slow;
          }
        }
      }
      // Sporeburst mine: explode when a ground enemy steps on its tile.
      if (st.boom && !p.dead) {
        for (const e of game.enemies) {
          if (e.dead || e.def.flying || e.burrowed || e.materialising > 0) continue;
          if (e.lane === p.lane && Math.abs(e.x - p.x) < TILE * 0.5) {
            explodeMine(game, p);
            break;
          }
        }
      }
    }

    // Projectiles.
    for (const pr of game.projectiles) {
      pr.x += pr.vx * dt;
      for (const e of game.enemies) {
        if (e.dead || e.materialising > 0 || e.burrowed) continue;
        if (e.lane === pr.lane && Math.abs(e.x - pr.x) < e.def.radius + 8 && Math.abs(e.y - pr.y) < 40) {
          damageEnemy(game, e, pr.dmg);
          if (pr.slow) { e.slowT = 1.2; e.slowFactor = 1 - pr.slow; }
          pr.dead = true;
          game.particles.burst(e.x, e.y, 4, '#ff9a3d', 60);
          break;
        }
      }
      if (pr.x > GARDEN_X + 9.5 * TILE) pr.dead = true;
    }
    game.projectiles = game.projectiles.filter((pr) => !pr.dead);
    for (const b of game.beams) b.t -= dt;
    game.beams = game.beams.filter((b) => b.t > 0);

    // Bolts from spitters.
    for (const b of game.bolts) {
      if (!b.target || b.target.dead) { b.dead = true; continue; }
      const dx = b.target.x - b.x;
      const dy = b.target.y - b.y;
      const d = Math.hypot(dx, dy);
      const step = b.speed * dt;
      if (d <= step + 6) {
        game.damagePlant(b.target, b.dmg);
        game.particles.burst(b.target.x, b.target.y, 5, '#7dff8a', 60);
        b.dead = true;
      } else {
        b.x += (dx / d) * step;
        b.y += (dy / d) * step;
      }
    }
    game.bolts = game.bolts.filter((b) => !b.dead);

    // Wave director: spawn queue + boss.
    const dir = game.waveDir;
    if (dir) {
      if (dir.boss && !dir.bossSpawned) {
        dir.bossSpawned = true;
        const lane = 2;
        const boss = createBoss(dir.boss, lane, game, game.diff.bossHp);
        boss.x = GARDEN_X + 9 * TILE + 60;
        game.enemies.push(boss);
        game.discover('enemy', dir.boss);
        dir.trickleT = 4;
      }
      if (dir.boss) {
        dir.trickleT -= dt;
        if (dir.trickleT <= 0 && game.enemies.some((e) => e.boss && !e.dead)) {
          dir.trickleT = 4.5;
          const made = createEnemy(bossTrickle(game), game.rng.int(0, LANES - 1), game, waveHpMult(game.wave), waveSpeedMult(game.wave));
          for (const e of made) game.enemies.push(e);
        }
      } else if (dir.queue.length > 0) {
        dir.timer -= dt;
        if (dir.timer <= 0) {
          dir.timer = dir.interval * (0.8 + game.rng.next() * 0.4);
          const kind = dir.queue.shift();
          const lane = game.rng.int(0, LANES - 1);
          const made = createEnemy(kind, lane, game, waveHpMult(game.wave) * game.diff.hp, waveSpeedMult(game.wave) * game.diff.speed);
          for (const e of made) { game.enemies.push(e); game.discover('enemy', kind); }
          dir.spawned += 1;
        }
      }
    }

    // Enemies.
    for (const e of game.enemies) {
      if (e.dead) continue;
      const res = updateEnemy(e, dt, game);
      if (res === 'ate') {
        e.dead = true;
        game.hearts -= 1;
        game.shake = 0.4;
        game.toast('A creature of the dark bit the Heart Tree!');
        if (game.hearts <= 0) {
          game.state = 'lost';
          game.saveBest();
          game.audio.lose();
        }
      }
    }
    game.enemies = game.enemies.filter((e) => !e.dead);
    game.plants = game.plants.filter((p) => !p.dead);

    // Wave clear: queue empty, no boss alive, no enemies left.
    if (game.state === 'playing' && dir) {
      const bossAlive = game.enemies.some((e) => e.boss);
      const queueEmpty = dir.boss ? true : dir.queue.length === 0;
      if (queueEmpty && !bossAlive && game.enemies.length === 0) {
        game.waveCleared();
      }
    }
  };
}

function killPlant(game, plant, enemy) {
  if (plant.dead) return;
  plant.dead = true;
  game.lightDirty = true;
  game.particles.burst(plant.x, plant.y, 14, '#c98f5a', 90);
  const st = effStats(plant);
  if (st.boomOnDeath) {
    for (const e of game.enemies) {
      if (!e.dead && e.lane === plant.lane && Math.abs(e.x - plant.x) < TILE * 1.2) damageEnemy(game, e, st.boomOnDeath);
    }
    game.particles.burst(plant.x, plant.y, 20, '#d97bff', 140);
    game.audio.boom();
  }
}

function explodeMine(game, p) {
  if (p.dead) return;
  p.dead = true;
  game.lightDirty = true;
  const st = effStats(p);
  for (const e of game.enemies) {
    if (e.dead || e.def.flying || e.burrowed || e.materialising > 0) continue;
    if (e.lane === p.lane && Math.abs(e.x - p.x) < (st.boomRadius || 1) * TILE + 20) {
      damageEnemy(game, e, st.boom * growthMult(p));
    }
  }
  game.particles.burst(p.x, p.y, 22, '#d97bff', 150);
  game.shake = Math.max(game.shake, 0.15);
  game.audio.boom();
}

function damageEnemy(game, e, dmg) {
  if (e.dead || e.materialising > 0) return;
  e.hp -= dmg;
  e.flash = 0.08;
  if (e.hp <= 0) killEnemy(e, game, 'hit');
}

function nearestEnemyInLane(game, lane, x, maxDist) {
  let bestE = null; let bestD = maxDist;
  for (const e of game.enemies) {
    if (e.dead || e.materialising > 0 || e.burrowed) continue;
    if (e.lane !== lane || e.x < x) continue;
    const d = e.x - x;
    if (d < bestD) { bestD = d; bestE = e; }
  }
  return bestE;
}

// ---- Pilots (used by the headless tests; a careful generic player) ----

export function driveCareful(game, dt) {
  if (game.state === 'title') { game.start('bloom'); return; }
  if (game.state === 'draft') {
    // Priority: discount > sun > grow > roots > thornmail > meteor > heart > fusion > glow.
    const prio = ['discount', 'sun', 'grow', 'roots', 'thornmail', 'meteor', 'heart', 'fusion', 'glow'];
    const opts = game.draft.options;
    let pick = 0;
    for (const id of prio) {
      const i = opts.indexOf(id);
      if (i >= 0) { pick = i; break; }
    }
    game.chooseDraft(pick);
    return;
  }
  if (game.state !== 'playing') return;
  // Collect every sky sun (click = bonus).
  for (const s of game.suns.slice()) game.collectSun(s);
  game.pilotT -= dt;
  if (game.pilotT > 0) return;
  game.pilotT = 0.4;

  const threat = [0, 0, 0, 0, 0];
  for (const e of game.enemies) {
    if (e.dead) continue;
    threat[e.lane] += e.boss ? 10 : Math.max(1, 4 - (e.x - GARDEN_X) / (3 * TILE));
  }
  const laneOrder = [0, 1, 2, 3, 4].sort((a, b) => threat[b] - threat[a]);
  const has = (kind, lane) => game.plants.some((p) => !p.dead && p.kind === kind && p.lane === lane);
  const countKind = (kind) => game.plants.filter((p) => !p.dead && p.kind === kind).length;
  const emptyCol = (lane, cols) => {
    for (const c of cols) if (!game.plantAtTile(lane, c)) return c;
    return -1;
  };

  // Emergency mine: an enemy about to cross the front line.
  for (const e of game.enemies) {
    if (e.dead || e.def.flying || e.burrowed) continue;
    if (e.x < GARDEN_X + 8.6 * TILE && e.x > GARDEN_X + 7.4 * TILE && game.sun >= 25) {
      if (!game.plantAtTile(e.lane, 8)) { game.plantAt(e.lane, 8, 'sporeburst'); return; }
    }
  }

  // Economy first: one Sunbloom per lane in column 0, then column 1.
  if (game.wave <= 3 && countKind('sunbloom') < 5) {
    for (const lane of laneOrder) {
      if (!has('sunbloom', lane) && game.sun >= game.seedCost('sunbloom')) {
        if (game.plantAt(lane, 0, 'sunbloom')) return;
      }
    }
  }
  if (game.sun > 260 && countKind('sunbloom') < 8) {
    for (const lane of laneOrder) {
      if (!game.plantAtTile(lane, 1) && game.sun >= game.seedCost('sunbloom')) {
        if (game.plantAt(lane, 1, 'sunbloom')) return;
      }
    }
  }

  // Fusion when rich: graft any undiscovered pair onto a grown plant.
  if (game.sun > 300) {
    for (const p of game.plants) {
      if (p.dead || p.stage < 1 || p.hybrid) continue;
      for (const seedKind of SEED_ORDER) {
        const f = fusionFor(p.kind, seedKind);
        if (f && !game.codex.fusion.has(f.kind) && game.sun >= game.seedCost(seedKind)) {
          game.fuseMode = true;
          if (game.plantAt(p.lane, p.col, seedKind)) { game.fuseMode = false; return; }
          game.fuseMode = false;
        }
      }
    }
  }

  // Defence in the most threatened lane.
  for (const lane of laneOrder) {
    const wall = has('barkwall', lane) || has('bramblewall', lane);
    const shooter = has('emberpod', lane) || has('frostfire', lane) || has('emberheart', lane);
    const chill = has('frostberry', lane) || has('mistbloom', lane);
    const thorn = has('thornspike', lane);
    if (threat[lane] > 0.5 && !wall && game.sun >= game.seedCost('barkwall')) {
      const c = emptyCol(lane, [6, 7]);
      if (c >= 0 && game.plantAt(lane, c, 'barkwall')) return;
    }
    if (threat[lane] > 0.5 && !shooter && game.sun >= game.seedCost('emberpod')) {
      const c = emptyCol(lane, [2, 3, 4]);
      if (c >= 0 && game.plantAt(lane, c, 'emberpod')) return;
    }
    if (!chill && game.sun >= game.seedCost('frostberry') && game.wave >= 2) {
      const c = emptyCol(lane, [4, 3]);
      if (c >= 0 && game.plantAt(lane, c, 'frostberry')) return;
    }
    if (threat[lane] > 2 && !thorn && game.sun >= game.seedCost('thornspike')) {
      const c = emptyCol(lane, [5]);
      if (c >= 0 && game.plantAt(lane, c, 'thornspike')) return;
    }
    if (game.sun > 300 && !has('starlance', lane) && game.wave >= 4) {
      const c = emptyCol(lane, [1, 2]);
      if (c >= 0 && game.plantAt(lane, c, 'starlance')) return;
    }
    if ((game.sun > 500 || game.plants.some((p) => !p.dead && p.lane === lane && p.hp < p.maxHp * 0.6)) && !has('moonpetal', lane)) {
      const c = emptyCol(lane, [3, 4]);
      if (c >= 0 && game.sun >= game.seedCost('moonpetal') && game.plantAt(lane, c, 'moonpetal')) return;
    }
  }
}

export function driveCareless(game, dt) {
  if (game.state === 'title') { game.start('bloom'); return; }
  if (game.state === 'draft') { game.chooseDraft(Math.floor(game.rng.next() * 3)); return; }
  if (game.state !== 'playing') return;
  // Plants random seeds in random tiles, never collects suns, never fuses.
  if (game.rng.next() < 0.3) {
    const kind = game.rng.pick(SEED_ORDER);
    const lane = game.rng.int(0, LANES - 1);
    const col = game.rng.int(0, COLS - 1);
    game.plantAt(lane, col, kind);
  }
}
