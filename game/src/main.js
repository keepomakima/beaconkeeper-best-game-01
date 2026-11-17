// STARSEED ORCHARD — browser bootstrap. Fixed-timestep loop (60 Hz),
// mouse/keyboard translation into game methods, ?shot= scenes for the
// screenshot pipeline, and the ?test=1 read-only hook.
import { createGame } from './game.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { Input } from './input.js';
import { SEEDS, SEED_ORDER, GARDEN_X, GARDEN_Y, TILE, COLS, LANES, W, H, DIFFICULTY_ORDER } from './config.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 11);
const testMode = params.get('test') === '1';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input();
input.attach(canvas);

let game;
if (shot) {
  game = stageShot(shot, seed);
} else {
  game = createGame(seed, 'bloom');
}
game.input = input;

function tileFromMouse(x, y) {
  const col = Math.floor((x - GARDEN_X) / TILE);
  const lane = Math.floor((y - GARDEN_Y) / TILE);
  if (col < 0 || col >= COLS || lane < 0 || lane >= LANES) return null;
  return { lane, col };
}

function seedBarHit(x, y) {
  if (y < H - 64 || y > H - 10) return null;
  const cardW = 118, gap = 8;
  const totalW = SEED_ORDER.length * (cardW + gap) - gap;
  let cx = (W - totalW) / 2;
  for (const kind of SEED_ORDER) {
    if (x >= cx && x <= cx + cardW) return kind;
    cx += cardW + gap;
  }
  return null;
}

function handleClick(x, y) {
  game.audio.resume();
  if (game.state === 'title') {
    // Difficulty buttons.
    const bw = 220, bh = 64, gap = 24;
    const totalW = 3 * bw + 2 * gap;
    let bx = (W - totalW) / 2;
    for (const key of DIFFICULTY_ORDER) {
      if (x >= bx && x <= bx + bw && y >= 330 && y <= 330 + bh) {
        game.difficulty = key;
        game.audio.click();
        return;
      }
      bx += bw + gap;
    }
    // START button area.
    if (y >= 470 && y <= 520) { game.start(game.difficulty); game.audio.click(); }
    return;
  }
  if (game.state === 'won') {
    if (y >= 360 && y <= 420) game.continueEndless();
    return;
  }
  if (game.state === 'draft') {
    // Draft cards.
    const cardW = 260, gap = 30;
    const totalW = 3 * cardW + 2 * gap;
    let cx = (W - totalW) / 2;
    for (let i = 0; i < 3; i++) {
      if (x >= cx && x <= cx + cardW && y >= 230 && y <= 400) { game.chooseDraft(i); return; }
      cx += cardW + gap;
    }
    if (y >= 430 && y <= 470) game.rerollDraft();
    return;
  }
  if (game.state !== 'playing') return;
  // Falling suns first (generous click radius).
  for (const s of game.suns) {
    if (Math.hypot(s.x - x, s.y - y) < 26) { game.collectSun(s); return; }
  }
  const seedHit = seedBarHit(x, y);
  if (seedHit) { game.selectedSeed = seedHit; game.fuseMode = false; game.audio.click(); return; }
  const tile = tileFromMouse(x, y);
  if (tile) game.plantAt(tile.lane, tile.col);
}

function handleKey(code) {
  if (code === 'Space') {
    game.audio.resume();
    if (game.state === 'title') game.start(game.difficulty);
    else if (game.state === 'playing') game.pause();
    else if (game.state === 'paused') game.resume();
    return;
  }
  if (code === 'KeyM') { const m = game.audio.toggleMute(); game.toast(m ? 'Muted.' : 'Sound on.'); return; }
  if (code === 'KeyR') {
    if (game.state !== 'title') { game.start(game.difficulty); }
    return;
  }
  if (code === 'KeyC') { game.codexOpen = !game.codexOpen; return; }
  if (code === 'KeyE' && game.state === 'won') { game.continueEndless(); return; }
  if (code === 'KeyF' && game.state === 'playing') {
    game.fuseMode = !game.fuseMode;
    game.toast(game.fuseMode ? 'Fuse mode: click a grown plant, then a seed.' : 'Fuse mode off.');
    return;
  }
  if (game.state === 'draft') {
    if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') {
      game.chooseDraft(Number(code.slice(-1)) - 1);
      return;
    }
    if (code === 'KeyR') { /* restart handled above only outside draft */ }
    return;
  }
  if (code === 'KeyR' && game.state === 'draft') { game.rerollDraft(); return; }
  if (game.state !== 'playing') return;
  for (const kind of SEED_ORDER) {
    if (code === 'Digit' + SEEDS[kind].key) { game.selectedSeed = kind; game.fuseMode = false; return; }
  }
}

let acc = 0;
let last = performance.now();
const DT = 1 / 60;

function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (!shot) {
    acc += elapsed;
    while (acc >= DT) {
      if (input.clicked) handleClick(input.clicked.x, input.clicked.y);
      for (const code of [...input.pressed]) handleKey(code);
      game.update(DT, input);
      input.endTick();
      acc -= DT;
    }
  }
  render(ctx, game);
  if (shot) window.__shotReady = true;
  requestAnimationFrame(frame);
}

if (testMode) {
  window.__gameTest = {
    getState: () => game.state,
    getScore: () => game.score,
    getWave: () => game.wave,
    getSun: () => Math.floor(game.sun),
    getHearts: () => game.hearts,
    getKills: () => game.kills,
    getPlants: () => game.plants.filter((p) => !p.dead).map((p) => ({ kind: p.kind, lane: p.lane, col: p.col, hp: Math.round(p.hp), stage: p.stage })),
    getEnemies: () => game.enemies.filter((e) => !e.dead).map((e) => ({ kind: e.kind, lane: e.lane, x: Math.round(e.x), hp: Math.round(e.hp), boss: !!e.boss })),
    getLight: () => game.lightMap.map((row) => row.slice()),
    getBestScore: () => game.best,
    getDraft: () => (game.draft ? game.draft.options.slice() : null),
  };
}

if (shot) {
  render(ctx, game);
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}
