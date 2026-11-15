// Beaconkeeper — everything the player sees, drawn on one canvas:
// the night vale, the lantern's glow, the keeper and shadows, the beam,
// the HUD, and every menu screen. Screenshots are renders of this file.
import { ARENA, LANTERN } from './config.js';

const INK = '#e8e4d8';
const DIM = '#9a94a8';

function panel(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill || 'rgba(12, 10, 26, 0.82)';
  ctx.strokeStyle = 'rgba(255, 200, 92, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color || INK;
  ctx.font = `${weight || 600} ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

export function drawGame(ctx, game) {
  const W = ARENA.w; const H = ARENA.h;
  ctx.save();
  if (game.particles.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * game.particles.shake, (Math.random() - 0.5) * game.particles.shake);
  }
  // Night vale.
  const bg = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 760);
  bg.addColorStop(0, '#241d3a');
  bg.addColorStop(0.6, '#171226');
  bg.addColorStop(1, '#0b0817');
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // Ground texture: faint stars and grass tufts, fixed by seed.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  for (let i = 0; i < 90; i++) {
    const sx = (i * 137.5) % W;
    const sy = (i * 89.3) % H;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.strokeStyle = 'rgba(120, 110, 160, 0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const gx = (i * 173.7) % W;
    const gy = (i * 211.1) % H;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 4, gy - 8);
    ctx.moveTo(gx + 6, gy);
    ctx.lineTo(gx + 8, gy - 6);
    ctx.stroke();
  }

  // Arena wall.
  ctx.strokeStyle = '#4a3f6e';
  ctx.lineWidth = 4;
  ctx.strokeRect(ARENA.wall, ARENA.wall, W - ARENA.wall * 2, H - ARENA.wall * 2);

  drawLantern(ctx, game);
  drawPickups(ctx, game);
  drawEnemies(ctx, game);
  drawKeeper(ctx, game);
  drawParticles(ctx, game);
  ctx.restore();

  if (game.state === 'playing' || game.state === 'upgrade' || game.paused) drawHud(ctx, game);
  if (game.state === 'title') drawTitle(ctx, game);
  if (game.state === 'upgrade') drawUpgrade(ctx, game);
  if (game.state === 'won') drawEnd(ctx, game, true);
  if (game.state === 'lost') drawEnd(ctx, game, false);
  if (game.paused && game.state === 'playing') {
    ctx.fillStyle = 'rgba(8, 6, 16, 0.55)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'PAUSED', W / 2, H / 2 - 10, 54, '#ffe9a8', 'center', 700);
    text(ctx, 'Press P to keep playing', W / 2, H / 2 + 44, 20, DIM);
  }
  if (game.bannerTimer > 0 && game.banner && game.state === 'playing') {
    ctx.globalAlpha = Math.min(1, game.bannerTimer);
    text(ctx, game.banner, W / 2, 92, 34, '#ffe9a8', 'center', 700);
    ctx.globalAlpha = 1;
  }
}

function drawLantern(ctx, game) {
  const L = game.lantern;
  const glow = ctx.createRadialGradient(L.x, L.y, 10, L.x, L.y, LANTERN.lightRadius);
  const warm = L.integrity > 40 ? '255, 200, 92' : '255, 110, 80';
  glow.addColorStop(0, `rgba(${warm}, 0.34)`);
  glow.addColorStop(1, `rgba(${warm}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(L.x, L.y, LANTERN.lightRadius, 0, Math.PI * 2);
  ctx.fill();
  // Stone base and the lantern itself.
  ctx.fillStyle = '#3a3352';
  ctx.beginPath();
  ctx.arc(L.x, L.y, L.radius + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = L.flash > 0 ? '#ff6b5e' : '#2c2544';
  ctx.beginPath();
  ctx.arc(L.x, L.y, L.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(${warm}, 0.95)`;
  ctx.beginPath();
  ctx.arc(L.x, L.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1428';
  ctx.fillRect(L.x - 3, L.y - 30, 6, 12);
  // Integrity ring.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(L.x, L.y, L.radius + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (L.integrity / L.maxIntegrity));
  ctx.stroke();
}

function drawPickups(ctx, game) {
  for (const p of game.pickups.items) {
    const bob = Math.sin(game.time * 4 + p.x) * 2;
    if (p.kind === 'ember') {
      ctx.fillStyle = '#ffc85c';
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(p.x - 2, p.y + bob - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ff5c7a';
      ctx.font = '20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♥', p.x, p.y + bob);
    }
  }
}

function drawEnemies(ctx, game) {
  for (const e of game.enemies) {
    if (e.materialising > 0) {
      // Spawn telegraph: a growing violet ring, harmless until complete.
      const t = 1 - e.materialising / 0.45;
      ctx.strokeStyle = `rgba(183, 140, 255, ${0.35 + 0.55 * t})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 8 + t * e.radius, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = e.def.color;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    // Eyes.
    ctx.fillStyle = '#140d24';
    const ex = Math.cos(e.wobble) * 3;
    ctx.beginPath();
    ctx.arc(e.x - 6 + ex, e.y - 3, 3, 0, Math.PI * 2);
    ctx.arc(e.x + 6 + ex, e.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    if (e.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // Health bar for hurt foes.
    if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - 18, e.y - e.radius - 12, 36, 5);
      ctx.fillStyle = '#ff5c7a';
      ctx.fillRect(e.x - 18, e.y - e.radius - 12, 36 * (e.hp / e.maxHp), 5);
    }
  }
}

function drawKeeper(ctx, game) {
  const k = game.keeper;
  if (game.state === 'title') return;
  // Beam cone.
  if (k.beaming) {
    const grad = ctx.createLinearGradient(k.x, k.y, k.x + Math.cos(k.aim) * k.beamRange, k.y + Math.sin(k.aim) * k.beamRange);
    grad.addColorStop(0, 'rgba(255, 215, 106, 0.55)');
    grad.addColorStop(1, 'rgba(255, 215, 106, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(k.x, k.y);
    ctx.arc(k.x, k.y, k.beamRange, k.aim - 0.38, k.aim + 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 240, 180, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(k.x, k.y);
    ctx.lineTo(k.x + Math.cos(k.aim) * k.beamRange, k.y + Math.sin(k.aim) * k.beamRange);
    ctx.stroke();
  }
  // Cloak and lantern glow.
  ctx.fillStyle = k.iframes > 0 && Math.floor(game.time * 12) % 2 === 0 ? 'rgba(255,255,255,0.6)' : '#3f6fb5';
  ctx.beginPath();
  ctx.arc(k.x, k.y, k.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(k.x + Math.cos(k.aim) * 10, k.y + Math.sin(k.aim) * 10, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1428';
  ctx.beginPath();
  ctx.arc(k.x - 5, k.y - 4, 2.5, 0, Math.PI * 2);
  ctx.arc(k.x + 5, k.y - 4, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles(ctx, game) {
  for (const p of game.particles.pool) {
    if (!p.alive) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const t of game.particles.texts) {
    if (!t.alive) continue;
    ctx.globalAlpha = Math.max(0, t.life / t.max);
    text(ctx, t.text, t.x, t.y, 16, t.color, 'center', 700);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, game) {
  const k = game.keeper;
  // Hearts.
  ctx.font = '26px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let hearts = '';
  for (let i = 0; i < k.maxHearts; i++) hearts += i < k.hearts ? '♥' : '♡';
  ctx.fillStyle = '#ff5c7a';
  ctx.fillText(hearts, 36, 44);
  // Fuel bar.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(36, 66, 220, 14);
  ctx.fillStyle = '#ffc85c';
  ctx.fillRect(36, 66, 220 * (k.fuel / k.maxFuel), 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 66, 220, 14);
  text(ctx, 'FUEL', 268, 73, 13, DIM, 'left');
  // Lantern integrity.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(36, 88, 220, 10);
  ctx.fillStyle = game.lantern.integrity > 40 ? '#7ad7a8' : '#ff6b5e';
  ctx.fillRect(36, 88, 220 * (game.lantern.integrity / game.lantern.maxIntegrity), 10);
  text(ctx, 'LANTERN', 268, 93, 13, DIM, 'left');
  // Score, wave, combo.
  text(ctx, `SCORE ${game.score}`, 1244, 40, 24, INK, 'right', 700);
  text(ctx, `Wave ${Math.max(1, game.waves.wave)} / 10`, 1244, 70, 17, DIM, 'right');
  if (game.combo >= 3) {
    text(ctx, `COMBO x${game.comboMult().toFixed(1)}`, 1244, 98, 20, '#ffd76a', 'right', 700);
  }
  if (game.best > 0) text(ctx, `Best ${game.best}`, 1244, 124, 14, DIM, 'right');
  // Dash readiness.
  text(ctx, k.dashLeft <= 0 ? 'DASH READY  [Shift]' : 'dash…', 640, 694, 14, k.dashLeft <= 0 ? '#7ad7a8' : DIM);
}

function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(8, 6, 16, 0.45)';
  ctx.fillRect(0, 0, 1280, 720);
  text(ctx, 'BEACONKEEPER', 640, 190, 72, '#ffe9a8', 'center', 700);
  text(ctx, 'Last Light of the Ember Vale', 640, 250, 26, INK);
  text(ctx, 'The night is full of shadows. Guard the lantern. Survive 10 waves until dawn.', 640, 300, 19, DIM);
  text(ctx, 'WASD / Arrows — move      Mouse — aim      Hold click / Space — lantern beam', 640, 352, 18, INK);
  text(ctx, 'Shift — dash      P — pause      M — mute      1 / 2 / 3 — pick an upgrade', 640, 382, 18, INK);
  text(ctx, 'Shadows that reach the lantern chew it apart. Embers refuel your beam.', 640, 412, 18, DIM);
  if (game.best > 0) text(ctx, `Best score: ${game.best}`, 640, 452, 20, '#ffd76a', 'center', 700);
  const pulse = 0.65 + 0.35 * Math.sin(game.time * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'Press SPACE to light the lantern', 640, 520, 26, '#ffe9a8', 'center', 700);
  ctx.globalAlpha = 1;
}

function drawUpgrade(ctx, game) {
  ctx.fillStyle = 'rgba(8, 6, 16, 0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  text(ctx, `Wave ${game.waves.wave} cleared!`, 640, 130, 40, '#ffe9a8', 'center', 700);
  text(ctx, 'Choose a blessing — press 1, 2 or 3, or click a card', 640, 178, 20, DIM);
  game.upgradeRects = [];
  const choices = game.waves.choices;
  const cw = 300; const ch = 210; const gap = 36;
  const total = choices.length * cw + (choices.length - 1) * gap;
  const x0 = (1280 - total) / 2;
  choices.forEach((u, i) => {
    const x = x0 + i * (cw + gap);
    const y = 240;
    game.upgradeRects.push({ x, y, w: cw, h: ch, index: i });
    panel(ctx, x, y, cw, ch);
    text(ctx, `${i + 1}`, x + cw / 2, y + 36, 22, '#ffd76a', 'center', 700);
    text(ctx, u.name, x + cw / 2, y + 84, 24, INK, 'center', 700);
    // Wrap the description over two lines.
    const words = u.desc.split(' ');
    let line = '';
    const lines = [];
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 22) { lines.push(line.trim()); line = w; }
      else line = (line + ' ' + w).trim();
    }
    lines.push(line);
    lines.forEach((ln, li) => text(ctx, ln, x + cw / 2, y + 128 + li * 24, 17, DIM));
  });
}

function drawEnd(ctx, game, won) {
  ctx.fillStyle = won ? 'rgba(20, 16, 6, 0.55)' : 'rgba(16, 6, 10, 0.6)';
  ctx.fillRect(0, 0, 1280, 720);
  if (won) {
    text(ctx, 'DAWN BREAKS', 640, 220, 64, '#ffe9a8', 'center', 700);
    text(ctx, 'Ten waves held. The vale wakes in sunlight.', 640, 282, 22, INK);
  } else {
    text(ctx, 'THE LIGHT GOES OUT', 640, 220, 56, '#ff8fb0', 'center', 700);
    text(ctx, game.keeper.hearts <= 0 ? 'The keeper has fallen.' : 'The lantern has been devoured.', 640, 282, 22, INK);
  }
  text(ctx, `Score ${game.score}      Waves ${game.waves.wave} / 10      Shadows banished ${game.kills}`, 640, 340, 22, INK);
  if (game.score >= game.best && game.score > 0) text(ctx, 'New best score!', 640, 382, 22, '#ffd76a', 'center', 700);
  text(ctx, 'Press R to play again', 640, 450, 24, '#ffe9a8', 'center', 700);
}
