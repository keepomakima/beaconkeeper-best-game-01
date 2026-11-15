// Beaconkeeper — headless playthrough tests (Node stdlib only).
// The whole game is simulated at a fixed 60 Hz step, no browser:
// a careful pilot must win, a careless one must lose, the same seed
// must replay identically, and every shot scene must stage cleanly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, simulate, driveCareful, driveCareless } from '../game/src/game.js';
import { stageShot } from '../game/src/shots.js';

test('shot scenes stage without error', () => {
  for (const scene of ['start', 'play', 'upgrade', 'win', 'end']) {
    const game = stageShot(scene, 11);
    assert.ok(game.snapshot().state, `${scene} has a state`);
  }
  const play = stageShot('play', 11);
  assert.equal(play.snapshot().state, 'playing');
  assert.ok(play.snapshot().wave >= 3, `play shot is mid-game (wave ${play.snapshot().wave})`);
  const win = stageShot('win', 11);
  assert.equal(win.snapshot().state, 'won');
  const end = stageShot('end', 11);
  assert.equal(end.snapshot().state, 'lost');
});

test('a careful pilot wins the full game', () => {
  const { snapshot, seconds } = simulate(11, driveCareful);
  assert.equal(snapshot.state, 'won', `expected win, got ${JSON.stringify(snapshot)}`);
  assert.equal(snapshot.wave, 10);
  assert.ok(snapshot.kills > 150, `kills ${snapshot.kills}`);
  assert.ok(snapshot.score > 20000, `score ${snapshot.score}`);
  assert.ok(seconds < 600, `finished in ${seconds.toFixed(0)}s`);
});

test('a careless pilot loses', () => {
  const { snapshot } = simulate(11, driveCareless);
  assert.equal(snapshot.state, 'lost', `expected loss, got ${JSON.stringify(snapshot)}`);
});

test('the same seed replays identically', () => {
  const a = simulate(11, driveCareful);
  const b = simulate(11, driveCareful);
  assert.deepEqual(a.snapshot, b.snapshot);
  assert.equal(a.steps, b.steps);
});
