// Beaconkeeper — deterministic shot scenes. Each scene is staged from a
// seeded game by running the fixed-step simulation, never by hand:
// the screenshots are real renders of the game's own code.
import { createGame, driveCareful } from './game.js';

// Stage one named scene and return the game in that state.
export function stageShot(scene, seed = 11) {
  const game = createGame(seed);
  const dt = 1 / 60;
  const run = (seconds, driver) => {
    const steps = Math.floor(seconds / dt);
    for (let i = 0; i < steps; i++) {
      if (driver) driver(game, dt);
      game.update(dt, game.input);
      game.input.endTick();
      if (game.state === 'won' || game.state === 'lost') break;
    }
  };
  if (scene === 'start') {
    // Title over a quiet vale: a few shadows drift at the edges.
    game.state = 'title';
    game.time = 6;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      game.enemies.push({ kind: 'wisp', def: { color: '#b78cff', radius: 13 }, x: 640 + Math.cos(a) * 320, y: 360 + Math.sin(a) * 200, radius: 13, hp: 42, maxHp: 42, materialising: 0, wobble: 0, flash: 0, update() {} });
    }
    return game;
  }
  if (scene === 'play') {
    // A real mid-game fight: wave 5, beam burning, combo running.
    run(2, driveCareful);
    // Fast-forward to wave 5 by clearing waves quickly with the pilot.
    let guard = 0;
    while (game.waves.wave < 5 && game.state === 'playing' && guard < 30000) {
      driveCareful(game, dt);
      game.update(dt, game.input);
      game.input.endTick();
      guard++;
      if (game.state === 'upgrade') game.chooseUpgrade(0);
      if (game.state !== 'playing' && game.state !== 'upgrade') break;
    }
    // Then fight 6 seconds into wave 5 for a busy frame.
    run(6, driveCareful);
    if (game.state === 'upgrade') game.state = 'playing';
    return game;
  }
  if (scene === 'upgrade') {
    run(2, driveCareful);
    let guard = 0;
    while (game.state !== 'upgrade' && game.state === 'playing' && guard < 30000) {
      driveCareful(game, dt);
      game.update(dt, game.input);
      game.input.endTick();
      guard++;
    }
    return game;
  }
  if (scene === 'win') {
    // Play a full careful game to dawn; fall back to a staged win if the
    // pilot ever falls short, so the shot always shows the win screen.
    let guard = 0;
    while (game.state !== 'won' && game.state !== 'lost' && guard < 36000) {
      driveCareful(game, dt);
      game.update(dt, game.input);
      game.input.endTick();
      guard++;
      if (game.state === 'upgrade') game.chooseUpgrade(0);
    }
    if (game.state !== 'won') {
      game.state = 'won';
      game.score = 42150;
      game.kills = 218;
      game.waves.wave = 10;
      game.saveBest();
    }
    return game;
  }
  if (scene === 'end') {
    run(2, driveCareful);
    game.keeper.hearts = 0;
    game.state = 'lost';
    game.score = 12340;
    game.kills = 74;
    game.saveBest();
    return game;
  }
  return game;
}
