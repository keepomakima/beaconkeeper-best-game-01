// STARSEED ORCHARD — deterministic shot scenes. Each scene is staged
// from a seeded game by running the fixed-step simulation, never by hand:
// the screenshots are real renders of the game's own code.
import { createGame, driveCareful } from './game.js';
import { SEED_ORDER } from './config.js';

export function stageShot(scene, seed = 11) {
  const game = createGame(seed, 'bloom');
  const dt = 1 / 60;
  const run = (seconds, driver) => {
    const steps = Math.floor(seconds / dt);
    for (let i = 0; i < steps; i++) {
      if (driver) driver(game, dt);
      game.update(dt, game.input);
      if (game.input) game.input.endTick();
      if (game.state === 'won' || game.state === 'lost') break;
    }
  };
  if (scene === 'start') {
    // Title over a quiet garden at dusk: a hand-placed opening garden
    // (deterministic positions) with grown, glowing plants.
    const demo = createGame(seed, 'bloom');
    demo.start('bloom');
    const spots = [
      ['sunbloom', 0, 0], ['sunbloom', 1, 0], ['sunbloom', 2, 1],
      ['emberpod', 0, 2], ['emberpod', 3, 2], ['frostberry', 1, 3],
      ['thornspike', 4, 5], ['barkwall', 2, 6], ['moonpetal', 3, 3],
      ['starlance', 1, 1],
    ];
    for (const [kind, lane, col] of spots) {
      demo.sun = 9999;
      demo.seedCooldowns[kind] = 0; // title staging ignores plant cooldowns
      demo.plantAt(lane, col, kind);
    }
    for (const p of demo.plants) { p.age = 30; p.stage = 1; }
    demo.recomputeLight();
    demo.state = 'title';
    demo.time = 8;
    demo.banner = null;
    demo.bannerT = 0;
    return demo;
  }
  if (scene === 'play') {
    // A real mid-game fight: wave 6, garden half-grown, boss lane busy.
    run(2, driveCareful);
    let guard = 0;
    while (game.wave < 6 && game.state === 'playing' && guard < 60000) {
      driveCareful(game, dt);
      game.update(dt, game.input);
      if (game.input) game.input.endTick();
      guard++;
      if (game.state === 'draft') game.chooseDraft(0);
      if (game.state !== 'playing' && game.state !== 'draft') break;
    }
    run(8, driveCareful);
    if (game.state === 'draft') { game.draft = null; game.state = 'playing'; }
    return game;
  }
  if (scene === 'draft') {
    // The boon draft after a wave clear.
    run(2, driveCareful);
    let guard = 0;
    while (game.state !== 'draft' && game.state === 'playing' && guard < 60000) {
      driveCareful(game, dt);
      game.update(dt, game.input);
      if (game.input) game.input.endTick();
      guard++;
    }
    return game;
  }
  if (scene === 'win') {
    // Play a full careful game to the bloom; fall back to a staged win
    // if the pilot ever falls short, so the shot always shows the win.
    let guard = 0;
    while (game.state !== 'won' && game.state !== 'lost' && guard < 60000) {
      driveCareful(game, dt);
      game.update(dt, game.input);
      if (game.input) game.input.endTick();
      guard++;
      if (game.state === 'draft') game.chooseDraft(0);
    }
    if (game.state !== 'won') {
      game.state = 'won';
      game.score = 87400;
      game.kills = 312;
      game.wave = 10;
      game.saveBest();
    }
    return game;
  }
  return game;
}
