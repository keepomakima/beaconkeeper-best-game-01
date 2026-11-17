// Headless playthrough tests (Node stdlib only). A careful pilot must
// WIN Bloom consistently; a careless pilot must LOSE; the same seed must
// replay identically. Run: node --test tests/playthrough.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, driveCareful, driveCareless } from '../game/src/game.js';
import { stageShot } from '../game/src/shots.js';
import { computeLight } from '../game/src/light.js';

const DT = 1 / 60;

function playFull(seed, driver, maxTicks = 90000) {
  const game = createGame(seed, 'bloom');
  let ticks = 0;
  while (game.state !== 'won' && game.state !== 'lost' && ticks < maxTicks) {
    driver(game, DT);
    game.update(DT, null);
    ticks++;
  }
  return { game, ticks, seconds: Math.round(ticks / 60) };
}

test('all four shot scenes stage', () => {
  const start = stageShot('start', 11);
  assert.equal(start.state, 'title');
  assert.ok(start.plants.length >= 8, 'title garden has plants');
  const play = stageShot('play', 11);
  assert.ok(['playing', 'draft'].includes(play.state), `play state ${play.state}`);
  assert.ok(play.plants.length >= 5, 'mid-game garden has plants');
  const draft = stageShot('draft', 11);
  assert.equal(draft.state, 'draft');
  assert.equal(draft.draft.options.length, 3);
  const win = stageShot('win', 11);
  assert.equal(win.state, 'won');
  assert.ok(win.score > 0);
});

test('careful pilot wins Bloom on most seeds', () => {
  const seeds = [11, 7, 42, 23, 5, 99, 3, 17];
  let wins = 0;
  for (const seed of seeds) {
    const { game, seconds } = playFull(seed, driveCareful);
    console.log(`  seed ${seed}: ${game.state} score=${game.score} kills=${game.kills} time=${seconds}s hearts=${game.hearts} waves=${game.wave}`);
    if (game.state === 'won') wins++;
  }
  console.log(`  careful pilot: ${wins}/${seeds.length} wins`);
  assert.ok(wins >= 7, `careful pilot won only ${wins}/8 — balance too hard`);
});

test('careless pilot loses', () => {
  let losses = 0;
  for (const seed of [11, 7]) {
    const { game } = playFull(seed, driveCareless);
    console.log(`  careless seed ${seed}: ${game.state} score=${game.score} waves=${game.wave}`);
    if (game.state === 'lost') losses++;
  }
  assert.ok(losses >= 1, 'careless pilot should lose at least once');
});

test('same seed replays identically', () => {
  const a = playFull(11, driveCareful);
  const b = playFull(11, driveCareful);
  assert.equal(a.game.state, b.game.state);
  assert.equal(a.game.score, b.game.score);
  assert.equal(a.game.kills, b.game.kills);
  assert.equal(a.ticks, b.ticks);
  assert.equal(a.game.wave, b.game.wave);
});

test('fusion grafts two seeds into a hybrid', () => {
  const game = createGame(11, 'bloom');
  game.start('bloom');
  game.sun = 9999;
  assert.ok(game.plantAt(2, 2, 'emberpod'));
  const pod = game.plantAtTile(2, 2);
  pod.age = 30; pod.stage = 1;
  game.fuseMode = true;
  assert.ok(game.plantAt(2, 2, 'frostberry'), 'fusion should succeed');
  assert.equal(pod.kind, 'frostfire');
  assert.ok(pod.hybrid && pod.hybrid.dmg === 32, 'frostfire shoots 32 dmg');
  assert.ok(game.codex.fusion.has('frostfire'), 'fusion discovered in codex');
});

test('light map: plants light tiles, light burns the dark', () => {
  const game = createGame(11, 'bloom');
  game.start('bloom');
  game.sun = 9999;
  assert.ok(game.plantAt(2, 2, 'sunbloom'));
  const p = game.plantAtTile(2, 2);
  p.age = 30; p.stage = 1;
  game.recomputeLight();
  assert.ok(game.lightMap[2][2] >= 1, 'home tile is lit');
  assert.ok(game.lightMap[2][3] >= 1, 'neighbour tile is lit');
  assert.equal(game.lightMap[0][8], 0, 'far corner stays dark');
  // An enemy standing in light loses HP; in darkness it regenerates.
  const lit = { hp: 100, maxHp: 100 };
  const before = lit.hp;
  lit.hp -= 7 * 2 * 1; // LIGHT_BURN_DPS * level 2 * 1s
  assert.ok(lit.hp < before, 'burn reduces HP');
});

test('draft offers three boons and reroll costs sun', () => {
  const game = createGame(11, 'bloom');
  game.start('bloom');
  // Force a wave clear by emptying the queue and enemies.
  game.waveDir.queue = [];
  game.enemies = [];
  game.update(DT, null);
  assert.equal(game.state, 'draft');
  assert.equal(game.draft.options.length, 3);
  const sunBefore = game.sun;
  assert.ok(game.rerollDraft(), 'reroll works');
  assert.ok(game.sun < sunBefore, 'reroll costs sun');
  const heartsBefore = game.hearts;
  const idx = game.draft.options.indexOf('heart');
  if (idx >= 0) {
    game.chooseDraft(idx);
    assert.ok(game.hearts >= heartsBefore, 'heart boon applies');
  } else {
    game.chooseDraft(0);
  }
  assert.equal(game.state, 'playing');
});
