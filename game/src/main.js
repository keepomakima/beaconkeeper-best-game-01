// Beaconkeeper — browser entry point: fixed 60 Hz simulation, canvas
// rendering, shot staging (?shot=) and the ?test=1 debug hook.
import { createGame } from './game.js';
import { drawGame } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 11);

let game;
if (params.get('shot')) {
  game = stageShot(params.get('shot'), seed);
  drawGame(ctx, game);
  window.__shotReady = true;
} else {
  game = createGame(seed);
  game.input.attach(canvas);
  canvas.addEventListener('mousedown', () => {
    game.audio.unlock();
    if (game.state === 'title') game.start();
    else if (game.state === 'upgrade') {
      const rect = canvas.getBoundingClientRect();
      // Clicks are mapped in the handler below via stored rects.
    }
  });
  canvas.addEventListener('click', (e) => {
    if (game.state !== 'upgrade') return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1280;
    const y = ((e.clientY - rect.top) / rect.height) * 720;
    for (const r of game.upgradeRects) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) game.chooseUpgrade(r.index);
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') game.audio.unlock();
  });

  const STEP = 1 / 60;
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += elapsed;
    while (acc >= STEP) {
      game.update(STEP, game.input);
      game.input.endTick();
      acc -= STEP;
    }
    drawGame(ctx, game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Read-only test hook (?test=1): the playthrough tests and the shot
// tooling read state, never write it.
if (params.get('test') === '1') {
  window.__gameTest = {
    getState: () => game.state,
    getWave: () => game.waves.wave,
    getScore: () => game.score,
    getHp: () => game.keeper.hearts,
    getFuel: () => Math.round(game.keeper.fuel),
    getLantern: () => Math.round(game.lantern.integrity),
    getEnemies: () => game.enemies.length,
    getPlayer: () => ({ x: Math.round(game.keeper.x), y: Math.round(game.keeper.y) }),
    getBestScore: () => game.best,
    getSnapshot: () => game.snapshot(),
  };
}
