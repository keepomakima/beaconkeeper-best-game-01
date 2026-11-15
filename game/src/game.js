// Beaconkeeper — the game itself: state machine, beam, waves, scoring,
// combos and the autopilot the headless tests drive. Pure logic: no DOM
// here, so Node can import it and play whole games without a browser.
import { ARENA, KEEPER, LANTERN, UPGRADES, WAVES, wavePlan } from './config.js';
import { makeRandom, clamp, dist, angleDiff, angleTo } from './random.js';
import { Keeper } from './player.js';
import { Enemy, edgeSpawn } from './enemies.js';
import { WaveManager } from './waves.js';
import { Pickups } from './pickups.js';
import { Particles } from './particles.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';

export function createGame(seed = 11, opts = {}) {
  const rng = makeRandom(seed);
  const game = {
    seed,
    rng,
    state: 'title',
    paused: false,
    time: 0,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    hitStop: 0,
    banner: '',
    bannerTimer: 0,
    best: 0,
    audio: new AudioSys(),
    particles: new Particles(),
    keeper: new Keeper(),
    pickups: new Pickups(),
    enemies: [],
    lantern: { x: LANTERN.x, y: LANTERN.y, radius: LANTERN.radius, integrity: LANTERN.maxIntegrity, maxIntegrity: LANTERN.maxIntegrity, flash: 0 },
    upgradeTimer: 0,
    upgradeRects: [],
    input: new Input(),
  };
  game.waves = new WaveManager(game);
  try {
    if (typeof localStorage !== 'undefined') game.best = Number(localStorage.getItem('beaconkeeper-best') || 0);
  } catch { game.best = 0; }
  game.saveBest = () => {
    if (game.score > game.best) {
      game.best = game.score;
      try { if (typeof localStorage !== 'undefined') localStorage.setItem('beaconkeeper-best', String(game.best)); } catch { /* ignore */ }
    }
  };

  game.comboMult = () => 1 + Math.min(game.combo, 20) * 0.1;
  game.addScore = (n, x, y) => {
    const gained = Math.round(n * game.comboMult());
    game.score += gained;
    if (x !== undefined) game.particles.floatText(x, y, `+${gained}`, '#ffe9a8');
  };

  game.start = () => {
    game.keeper.reset();
    game.enemies = [];
    game.pickups.clear();
    game.lantern.integrity = game.lantern.maxIntegrity;
    game.score = 0; game.kills = 0; game.combo = 0; game.comboTimer = 0;
    game.time = 0; game.hitStop = 0;
    game.state = 'playing';
    game.paused = false;
    game.waves.startWave(1);
    game.audio.unlock();
  };

  game.onEnemyKilled = (enemy) => {
    game.kills += 1;
    game.combo += 1;
    game.comboTimer = 3;
    game.addScore(enemy.def.score, enemy.x, enemy.y);
    game.particles.burst(enemy.x, enemy.y, enemy.def.color, enemy.kind === 'brute' ? 26 : 12, 200);
    game.particles.addShake(enemy.kind === 'brute' ? 7 : 2);
    game.audio.kill();
    game.pickups.dropEmber(enemy.x, enemy.y, enemy.def.ember, game.rng);
    if (enemy.kind === 'brute') {
      game.hitStop = Math.max(game.hitStop, enemy.def.hitStop || 0);
      if (game.rng.next() < 0.5) game.pickups.dropHeart(enemy.x, enemy.y);
    }
    const i = game.enemies.indexOf(enemy);
    if (i >= 0) game.enemies.splice(i, 1);
  };

  // The beam is a cone: every live shadow inside its range and arc
  // burns at once, so aiming into a pack pays off.
  game.fireBeam = (dt) => {
    const k = game.keeper;
    if (!k.beaming) return;
    for (const e of game.enemies.slice()) {
      if (!e.live) continue;
      const d = dist(k.x, k.y, e.x, e.y);
      if (d > k.beamRange + e.radius) continue;
      const diff = Math.abs(angleDiff(k.aim, angleTo(k.x, k.y, e.x, e.y)));
      if (diff > KEEPER.beamHalfAngle) continue;
      const killed = e.damage(k.beamDps * dt, game);
      if (!killed && Math.random() < dt * 8) game.particles.burst(e.x, e.y, '#ffd76a', 1, 60);
    }
  };

  game.spawnNext = (dt) => {
    const w = game.waves;
    if (w.queue.length === 0) return;
    w.spawnTimer -= dt;
    if (w.spawnTimer > 0) return;
    w.spawnTimer = w.spawnGap;
    const kind = w.queue.shift();
    const pos = edgeSpawn(game.rng);
    game.enemies.push(new Enemy(kind, pos.x, pos.y, game.rng));
  };

  game.update = (dt, input) => {
    game.time += dt;
    if (game.bannerTimer > 0) game.bannerTimer -= dt;
    if (game.comboTimer > 0) { game.comboTimer -= dt; if (game.comboTimer <= 0) game.combo = 0; }
    game.lantern.flash = Math.max(0, game.lantern.flash - dt);
    game.particles.update(dt);

    if (game.state === 'title') {
      if (input.consume('Space') || input.consume('Enter')) game.start();
      return;
    }
    if (game.state === 'won' || game.state === 'lost') {
      if (input.consume('KeyR') || input.consume('Space') || input.consume('Enter')) game.start();
      return;
    }
    if (game.state === 'upgrade') {
      game.upgradeTimer += dt;
      for (let i = 0; i < 3; i++) {
        if (input.consume(`Digit${i + 1}`) || input.consume(`Numpad${i + 1}`)) {
          game.chooseUpgrade(i);
          return;
        }
      }
      return;
    }
    if (game.state !== 'playing') return;
    if (input.consume('KeyP')) { game.paused = !game.paused; return; }
    if (game.paused) return;
    if (input.consume('KeyM')) game.audio.toggleMute();
    if (game.hitStop > 0) { game.hitStop -= dt; return; }

    game.keeper.update(dt, input, game);
    game.fireBeam(dt);
    game.spawnNext(dt);
    for (const e of game.enemies.slice()) e.update(dt, game);
    game.pickups.update(dt, game);

    if (game.keeper.hearts <= 0 || game.lantern.integrity <= 0) {
      game.state = 'lost';
      game.saveBest();
      game.audio.lose();
      return;
    }
    if (game.waves.cleared) {
      if (game.waves.wave >= WAVES) {
        game.state = 'won';
        game.addScore(1000);
        game.saveBest();
        game.audio.win();
      } else {
        game.state = 'upgrade';
        game.upgradeTimer = 0;
        game.waves.drawChoices();
        game.audio.upgrade();
      }
    }
  };

  game.chooseUpgrade = (index) => {
    if (game.state !== 'upgrade') return false;
    if (!game.waves.applyChoice(index)) return false;
    game.state = 'playing';
    game.waves.startWave(game.waves.wave + 1);
    return true;
  };

  game.snapshot = () => ({
    state: game.state,
    wave: game.waves.wave,
    score: game.score,
    best: game.best,
    hearts: game.keeper.hearts,
    fuel: Math.round(game.keeper.fuel),
    lantern: Math.round(game.lantern.integrity),
    kills: game.kills,
    enemies: game.enemies.length,
    combo: game.combo,
    time: Math.round(game.time),
  });

  return game;
}

// --- Autopilot (headless tests) -------------------------------------------
// Careful: kites away from close shadows, burns only with fuel to spare,
// dashes out of trouble, and picks the first upgrade card.
export function driveCareful(game, dt) {
  const input = game.input;
  const k = game.keeper;
  input.keys.clear();
  input.mouseDown = false;
  if (game.state === 'title') { input.keyDown('Space'); return; }
  if (game.state === 'upgrade') {
    if (game.upgradeTimer > 0.4) input.keyDown('Digit1');
    return;
  }
  if (game.state === 'won' || game.state === 'lost') return;
  if (game.state !== 'playing' || game.paused) return;

  let nearest = null;
  let nearestD = Infinity;
  for (const e of game.enemies) {
    if (!e.live) continue;
    const d = dist(k.x, k.y, e.x, e.y);
    if (d < nearestD) { nearestD = d; nearest = e; }
  }
  // Defend the lantern first: a crawler closing on it outranks everything.
  let threat = null;
  let threatD = Infinity;
  for (const e of game.enemies) {
    if (!e.live || e.kind !== 'crawler') continue;
    const d = dist(e.x, e.y, LANTERN.x, LANTERN.y);
    if (d < 280 && d < threatD) { threatD = d; threat = e; }
  }
  if (threat) { nearest = threat; nearestD = dist(k.x, k.y, threat.x, threat.y); }
  // Move: intercept a lantern threat first, flee the centroid of close
  // shadows when truly surrounded, else drift toward the nearest ember
  // (urgently when fuel runs low), else hold a ring around the lantern.
  let mx = 0; let my = 0;
  let closeCount = 0;
  let cx = 0; let cy = 0;
  for (const e of game.enemies) {
    if (!e.live) continue;
    const d = dist(k.x, k.y, e.x, e.y);
    if (d < 110) { closeCount++; cx += e.x; cy += e.y; }
  }
  if (threat && closeCount < 2 && k.fuel > 30) {
    const d = dist(k.x, k.y, threat.x, threat.y);
    if (d > 170) { mx = (threat.x - k.x) / d; my = (threat.y - k.y) / d; }
  } else if (closeCount > 0) {
    cx /= closeCount; cy /= closeCount;
    const a = Math.atan2(k.y - cy, k.x - cx);
    mx = Math.cos(a); my = Math.sin(a);
    if (closeCount >= 2) input.keys.add('ShiftLeft');
  } else {
    let ember = null; let ed = Infinity;
    for (const p of game.pickups.items) {
      const d = dist(k.x, k.y, p.x, p.y);
      if (d < ed) { ed = d; ember = p; }
    }
    if (ember && ed > 20) {
      mx = (ember.x - k.x) / ed; my = (ember.y - k.y) / ed;
    } else {
      const a = Math.atan2(k.y - LANTERN.y, k.x - LANTERN.x);
      const want = 170;
      const d = dist(k.x, k.y, LANTERN.x, LANTERN.y);
      const radial = d > want + 20 ? -1 : d < want - 20 ? 1 : 0;
      mx = Math.cos(a) * radial + Math.cos(a + Math.PI / 2) * 0.4;
      my = Math.sin(a) * radial + Math.sin(a + Math.PI / 2) * 0.4;
    }
  }
  if (mx > 0.3) input.keys.add('KeyD');
  if (mx < -0.3) input.keys.add('KeyA');
  if (my > 0.3) input.keys.add('KeyS');
  if (my < -0.3) input.keys.add('KeyW');
  if (nearest) {
    input.mouseX = nearest.x;
    input.mouseY = nearest.y;
    // Defending the lantern outranks saving fuel: burn even on fumes.
    if (nearestD < k.beamRange && (k.fuel > 10 || threat)) input.mouseDown = true;
  }
}

// Careless: stands still in the open and burns the beam at nothing.
export function driveCareless(game, dt) {
  const input = game.input;
  input.keys.clear();
  if (game.state === 'title') { input.keyDown('Space'); return; }
  if (game.state === 'upgrade') { input.keyDown('Digit1'); return; }
  input.mouseX = game.keeper.x + 200;
  input.mouseY = game.keeper.y;
  input.mouseDown = true;
}

// Run a whole game headlessly at a fixed step. Returns the snapshot.
export function simulate(seed, driver, maxSeconds = 600) {
  const game = createGame(seed);
  const dt = 1 / 60;
  let steps = 0;
  const maxSteps = Math.floor(maxSeconds / dt);
  while (steps < maxSteps) {
    driver(game, dt);
    game.update(dt, game.input);
    game.input.endTick();
    steps++;
    if ((game.state === 'won' || game.state === 'lost') && steps > 60) break;
  }
  return { game, snapshot: game.snapshot(), steps, seconds: steps * dt };
}
