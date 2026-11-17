// STARSEED ORCHARD — all canvas drawing. Reads game state only; never
// mutates it. The garden is a dark field lit by the plants themselves:
// each plant paints a warm radial glow, so the light map is visible.
import { COLS, LANES, TILE, GARDEN_X, GARDEN_Y, W, H, SEEDS, SEED_ORDER, FUSIONS, DIFFICULTY, DIFFICULTY_ORDER } from './config.js';
import { boonById } from './draft.js';

const SEED_COLORS = Object.fromEntries(SEED_ORDER.map((k) => [k, SEEDS[k].color]));
const FUSIONS_LIST = Object.values(FUSIONS);

export function render(ctx, game) {
  ctx.save();
  if (game.shake > 0) {
    const s = game.shake * 14;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawSky(ctx, game);
  if (game.state === 'title') { drawGarden(ctx, game); drawTitle(ctx, game); }
  else {
    drawGarden(ctx, game);
    drawPlants(ctx, game);
    drawEnemies(ctx, game);
    drawProjectiles(ctx, game);
    drawSuns(ctx, game);
    drawParticles(ctx, game);
    drawLightGlows(ctx, game);
    drawHUD(ctx, game);
    drawSeedBar(ctx, game);
    if (game.state === 'draft') drawDraft(ctx, game);
    if (game.state === 'paused') drawOverlay(ctx, 'PAUSED', 'Space to resume — R to restart');
    if (game.state === 'won') drawWin(ctx, game);
    if (game.state === 'lost') drawOverlay(ctx, 'THE GARDEN FELL', `Score ${game.score} — press R to plant again`);
    if (game.codexOpen) drawCodex(ctx, game);
  }
  drawBanner(ctx, game);
  drawToasts(ctx, game);
  ctx.restore();
}

function drawSky(ctx, game) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const night = game.state === 'won' ? 0.25 : Math.min(0.85, 0.25 + game.wave * 0.06);
  g.addColorStop(0, `rgb(${18 + night * 10},${24 + night * 8},${52 + night * 10})`);
  g.addColorStop(1, `rgb(${40},${28},${64})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Stars (fixed pseudo-random positions from a tiny hash, no rng needed).
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 90; i++) {
    const x = (i * 137.5) % W;
    const y = ((i * 89.3) % 120);
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(game.time * 0.7 + i));
    ctx.globalAlpha = 0.25 + 0.55 * tw;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Moon.
  ctx.fillStyle = '#f4ead0';
  ctx.beginPath(); ctx.arc(1160, 52, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(220,205,160,0.5)';
  ctx.beginPath(); ctx.arc(1150, 46, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1170, 60, 4, 0, Math.PI * 2); ctx.fill();
}

function drawGarden(ctx, game) {
  // Soil.
  for (let lane = 0; lane < LANES; lane++) {
    for (let col = 0; col < COLS; col++) {
      const x = GARDEN_X + col * TILE;
      const y = GARDEN_Y + lane * TILE;
      const lit = game.lightMap[lane] ? game.lightMap[lane][col] : 0;
      ctx.fillStyle = (lane + col) % 2 === 0 ? '#2c2417' : '#332a1a';
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      if (lit > 0) {
        ctx.fillStyle = `rgba(255, 214, 90, ${0.05 + lit * 0.05})`;
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      }
      if (game.dims.has(`${lane},${col}`)) {
        ctx.fillStyle = 'rgba(40, 20, 70, 0.55)';
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      }
    }
  }
  // Heart Tree (left edge).
  const tx = 96, ty = GARDEN_Y + 2.5 * TILE;
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(tx - 10, ty - 40, 20, 130);
  ctx.fillStyle = '#3f7a3a';
  ctx.beginPath(); ctx.arc(tx, ty - 70, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#57a047';
  ctx.beginPath(); ctx.arc(tx - 28, ty - 40, 34, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(tx + 30, ty - 38, 30, 0, Math.PI * 2); ctx.fill();
  // Glowing hearts on the tree.
  ctx.fillStyle = '#ff5d7a';
  for (let i = 0; i < game.maxHearts; i++) {
    const a = (i / Math.max(1, game.maxHearts)) * Math.PI * 2 - Math.PI / 2;
    const hx = tx + Math.cos(a) * 44, hy = ty - 62 + Math.sin(a) * 34;
    ctx.globalAlpha = i < game.hearts ? 1 : 0.25;
    ctx.beginPath(); ctx.arc(hx, hy, 7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e8dcc0';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HEART TREE', tx, GARDEN_Y + 5 * TILE + 34);
  // Right fence (where the dark comes from).
  ctx.fillStyle = '#1a1426';
  ctx.fillRect(GARDEN_X + COLS * TILE + 6, GARDEN_Y - 10, 10, LANES * TILE + 20);
  ctx.fillStyle = '#8a7bb8';
  ctx.font = 'bold 12px sans-serif';
  ctx.save();
  ctx.translate(GARDEN_X + COLS * TILE + 34, GARDEN_Y + 2.5 * TILE);
  ctx.rotate(Math.PI / 2);
  ctx.fillText('THE DARK', 0, 0);
  ctx.restore();
}

function plantShape(ctx, p, game) {
  const x = p.x, y = p.y;
  const scale = p.stage === 0 ? 0.55 : p.stage === 1 ? 1 : 1.18;
  const def = p.hybrid || p.def;
  const color = p.hybrid ? '#fff3a0' : p.def.color;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (p.flash > 0) { ctx.globalAlpha = 0.6; }
  switch (p.kind) {
    case 'sunbloom': {
      ctx.fillStyle = '#3f7a3a'; ctx.fillRect(-3, 0, 6, 22);
      ctx.fillStyle = '#ffd94d';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + game.time * 0.2;
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * 13, -8 + Math.sin(a) * 13, 7, 4, a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.arc(0, -8, 9, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'thornspike': {
      ctx.fillStyle = '#2f6b2f'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8be04e'; ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
        ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); ctx.stroke();
      }
      break;
    }
    case 'emberpod': case 'frostfire': case 'emberheart': {
      ctx.fillStyle = p.kind === 'frostfire' ? '#7dd7ff' : '#ff9a3d';
      ctx.beginPath(); ctx.ellipse(0, 2, 16, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(6, -6, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3f7a3a'; ctx.fillRect(-3, 18, 6, 8);
      break;
    }
    case 'frostberry': case 'mistbloom': {
      ctx.fillStyle = '#7dd7ff';
      for (const [dx, dy] of [[-10, 4], [10, 4], [0, -8], [-4, 12], [6, 12]]) {
        ctx.beginPath(); ctx.arc(dx, dy, 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-10, 2, 2.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'barkwall': case 'bramblewall': case 'bastion': {
      ctx.fillStyle = '#8a5a2e'; ctx.fillRect(-16, -22, 32, 44);
      ctx.fillStyle = '#c98f5a'; ctx.fillRect(-12, -18, 24, 36);
      ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(12, -8); ctx.moveTo(-12, 4); ctx.lineTo(12, 4); ctx.stroke();
      if (p.kind !== 'barkwall') { ctx.fillStyle = '#8be04e'; ctx.beginPath(); ctx.arc(0, -26, 7, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'sporeburst': {
      ctx.fillStyle = '#d97bff'; ctx.beginPath(); ctx.arc(0, -4, 14, Math.PI, 0); ctx.fill();
      ctx.fillRect(-14, -4, 28, 6);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, -10, 3, 0, Math.PI * 2); ctx.arc(6, -12, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4e6ff'; ctx.fillRect(-4, 2, 8, 14);
      break;
    }
    case 'moonpetal': case 'dawnspire': {
      ctx.fillStyle = '#e8e6ff';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * 12, Math.sin(a) * 12, 9, 5, a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ffd94d'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'starlance': case 'sunlance': {
      ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, -26); ctx.stroke();
      ctx.fillStyle = '#fff3a0';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        const r = i % 2 === 0 ? 12 : 5;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, -30 + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  // HP bar for hurt plants.
  if (p.hp < p.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 20, y + 26, 40, 5);
    ctx.fillStyle = p.hp / p.maxHp > 0.5 ? '#8be04e' : '#ff5d5d';
    ctx.fillRect(x - 20, y + 26, 40 * (p.hp / p.maxHp), 5);
  }
  // Radiant ring.
  if (p.stage === 2) {
    ctx.strokeStyle = 'rgba(255, 243, 160, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 26 + Math.sin(game.time * 3) * 2, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawPlants(ctx, game) {
  for (const p of game.plants) {
    if (p.dead) continue;
    plantShape(ctx, p, game);
  }
}

function drawEnemies(ctx, game) {
  for (const e of game.enemies) {
    if (e.dead) continue;
    const x = e.x, y = e.y + Math.sin(game.time * 3 + e.wobble) * 2;
    if (e.materialising > 0) {
      ctx.strokeStyle = `rgba(183, 140, 255, ${1 - e.materialising / 0.45})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, e.def.radius + 14 * e.materialising, 0, Math.PI * 2); ctx.stroke();
      continue;
    }
    if (e.burrowed) {
      ctx.fillStyle = '#6b543a';
      ctx.beginPath(); ctx.ellipse(x, y + 10, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    ctx.save();
    ctx.translate(x, y);
    if (e.flash > 0) ctx.globalAlpha = 0.55;
    ctx.fillStyle = e.def.color;
    const r = e.def.radius * (e.boss ? 1 : 1);
    if (e.kind === 'wisp') {
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
    } else if (e.kind === 'brute') {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a1f1f';
      ctx.beginPath(); ctx.arc(-7, -6, 4, 0, Math.PI * 2); ctx.arc(7, -6, 4, 0, Math.PI * 2); ctx.fill();
    } else if (e.kind === 'crawler') {
      ctx.beginPath(); ctx.ellipse(0, 0, r + 6, r - 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = e.def.color; ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(i * 8, 8); ctx.lineTo(i * 8 + 4, 16); ctx.stroke();
      }
    } else if (e.kind === 'spitter') {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1f4d2a';
      ctx.beginPath(); ctx.arc(-4, -2, 5, 0, Math.PI * 2); ctx.fill();
    } else if (e.kind === 'swarm') {
      for (const [dx, dy] of [[-8, 0], [8, 0], [0, -8]]) {
        ctx.beginPath(); ctx.arc(dx, dy, 7, 0, Math.PI * 2); ctx.fill();
      }
    } else if (e.boss) {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.25, r * 0.16, 0, Math.PI * 2);
      ctx.arc(r * 0.35, -r * 0.25, r * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else {
      // Mothling / burrower: winged blob.
      ctx.beginPath(); ctx.ellipse(-r * 0.7, -4, r * 0.7, r * 0.45, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.7, -4, r * 0.7, r * 0.45, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 2, r * 0.6, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // HP bar.
    if (e.hp < e.maxHp) {
      const w = e.boss ? 90 : 36;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - w / 2, y - r - 12, w, 5);
      ctx.fillStyle = e.boss ? '#ff5d5d' : '#ff9a3d';
      ctx.fillRect(x - w / 2, y - r - 12, w * Math.max(0, e.hp / e.maxHp), 5);
    }
    // Boss name.
    if (e.boss) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.def.name.toUpperCase(), x, y - r - 20);
    }
  }
}

function drawProjectiles(ctx, game) {
  for (const pr of game.projectiles) {
    ctx.fillStyle = '#ff9a3d';
    ctx.beginPath(); ctx.arc(pr.x, pr.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3a0';
    ctx.beginPath(); ctx.arc(pr.x, pr.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  for (const b of game.beams) {
    ctx.globalAlpha = Math.max(0, b.t / 0.25);
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(b.x0, b.y); ctx.lineTo(b.x1, b.y); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const b of game.bolts) {
    ctx.fillStyle = '#7dff8a';
    ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawSuns(ctx, game) {
  for (const s of game.suns) {
    const bob = s.landed ? Math.sin(game.time * 4) * 2 : 0;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc(s.x, s.y + bob, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd94d'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + game.time;
      ctx.beginPath();
      ctx.moveTo(s.x + Math.cos(a) * 15, s.y + bob + Math.sin(a) * 15);
      ctx.lineTo(s.x + Math.cos(a) * 20, s.y + bob + Math.sin(a) * 20);
      ctx.stroke();
    }
  }
}

function drawParticles(ctx, game) {
  for (const p of game.particles.list) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawLightGlows(ctx, game) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of game.plants) {
    if (p.dead || p.stage === 0) continue;
    const radius = 46 + p.glow * 42;
    const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, radius);
    g.addColorStop(0, 'rgba(255, 220, 110, 0.20)');
    g.addColorStop(1, 'rgba(255, 220, 110, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawHUD(ctx, game) {
  ctx.fillStyle = 'rgba(10, 10, 24, 0.72)';
  ctx.fillRect(0, 0, W, 52);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`☀ ${Math.floor(game.sun)}`, 18, 35);
  ctx.fillStyle = '#e8dcc0';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`WAVE ${game.wave}/10${game.endless ? '+' : ''}`, 190, 33);
  ctx.fillStyle = '#ff5d7a';
  ctx.font = 'bold 18px sans-serif';
  let hearts = '';
  for (let i = 0; i < game.maxHearts; i++) hearts += i < game.hearts ? '♥ ' : '♡ ';
  ctx.fillText(hearts, 330, 33);
  ctx.fillStyle = '#e8dcc0';
  ctx.fillText(`SCORE ${game.score}`, 560, 33);
  ctx.fillStyle = '#9a8fc0';
  ctx.font = '15px sans-serif';
  ctx.fillText(`${DIFFICULTY[game.difficulty].label} · Best ${game.best}`, 760, 32);
  ctx.fillStyle = '#9a8fc0';
  ctx.textAlign = 'right';
  ctx.fillText('Space pause · M mute · C codex · R restart', W - 18, 32);
  ctx.textAlign = 'left';
}

function drawSeedBar(ctx, game) {
  const y = H - 64;
  const cardW = 118, cardH = 54, gap = 8;
  const totalW = SEED_ORDER.length * (cardW + gap) - gap;
  let x = (W - totalW) / 2;
  for (const kind of SEED_ORDER) {
    const def = SEEDS[kind];
    const cost = game.seedCost(kind);
    const afford = game.sun >= cost;
    const cdLeft = Math.max(0, (game.seedCooldowns[kind] || 0) - game.time);
    const selected = game.selectedSeed === kind;
    ctx.fillStyle = selected ? 'rgba(255, 243, 160, 0.28)' : 'rgba(10, 10, 24, 0.78)';
    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeStyle = selected ? '#fff3a0' : afford ? '#5a5470' : '#3a3450';
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.strokeRect(x, y, cardW, cardH);
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(x + 16, y + 16, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = afford ? '#f4ead0' : '#8a84a0';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(def.name, x + 30, y + 15);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#ffd94d';
    ctx.fillText(`☀ ${cost}`, x + 30, y + 32);
    ctx.fillStyle = '#9a8fc0';
    ctx.fillText(`[${def.key}]`, x + 8, y + 46);
    if (cdLeft > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x, y, cardW, cardH * (cdLeft / def.cd));
    }
    if (game.fuseMode) {
      ctx.fillStyle = '#fff3a0';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FUSE MODE — click a grown plant', W / 2, y - 10);
      ctx.textAlign = 'left';
    }
    x += cardW + gap;
  }
}

function drawDraft(ctx, game) {
  ctx.fillStyle = 'rgba(5, 5, 16, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff3a0';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE NIGHT PAUSES — CHOOSE A BOON', W / 2, 150);
  ctx.fillStyle = '#c9c2e0';
  ctx.font = '16px sans-serif';
  ctx.fillText('Pick one. Reroll costs sunlight and climbs each time.', W / 2, 180);
  const cardW = 260, cardH = 170, gap = 30;
  const totalW = 3 * cardW + 2 * gap;
  let x = (W - totalW) / 2;
  game.draft.options.forEach((id, i) => {
    const b = boonById(id);
    ctx.fillStyle = 'rgba(24, 20, 44, 0.95)';
    ctx.fillRect(x, 230, cardW, cardH);
    ctx.strokeStyle = '#8a7bb8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 230, cardW, cardH);
    ctx.fillStyle = '#fff3a0';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(b.name, x + cardW / 2, 275);
    ctx.fillStyle = '#e8dcc0';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, b.desc, x + 20, 305, cardW - 40, 22);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9a8fc0';
    ctx.font = '14px sans-serif';
    ctx.fillText(`[${i + 1}] choose`, x + cardW / 2, 380);
    x += cardW + gap;
  });
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`[R] Reroll — costs ${25 * (game.draft.rerolls + 1)} sun (you have ${Math.floor(game.sun)})`, W / 2, 450);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW) {
      ctx.fillText(line, x, y);
      line = '';
      y += lh;
    }
    line += w + ' ';
  }
  ctx.fillText(line, x, y);
}

function drawTitle(ctx, game) {
  // Fireflies.
  for (let i = 0; i < 26; i++) {
    const fx = (i * 211.7 + Math.sin(game.time * 0.4 + i) * 40) % W;
    const fy = 120 + ((i * 97.3) % 420) + Math.cos(game.time * 0.3 + i * 2) * 18;
    ctx.fillStyle = `rgba(255, 220, 110, ${0.35 + 0.4 * Math.abs(Math.sin(game.time + i))})`;
    ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff3a0';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('STARSEED ORCHARD', W / 2, 190);
  ctx.fillStyle = '#c9c2e0';
  ctx.font = 'italic 22px sans-serif';
  ctx.fillText('grow light, hold back the night', W / 2, 226);
  ctx.fillStyle = '#e8dcc0';
  ctx.font = '17px sans-serif';
  ctx.fillText('Plant star-seeds. Their light burns the dark — the dark heals in shadow.', W / 2, 268);
  ctx.fillText('Graft two grown plants into hybrids. Draft boons between waves. Survive 10 waves.', W / 2, 292);
  // Difficulty buttons.
  const bw = 220, bh = 64, gap = 24;
  const totalW = 3 * bw + 2 * gap;
  let x = (W - totalW) / 2;
  DIFFICULTY_ORDER.forEach((key) => {
    const d = DIFFICULTY[key];
    const sel = game.difficulty === key;
    ctx.fillStyle = sel ? 'rgba(255, 243, 160, 0.25)' : 'rgba(10, 10, 24, 0.8)';
    ctx.fillRect(x, 330, bw, bh);
    ctx.strokeStyle = sel ? '#fff3a0' : '#5a5470';
    ctx.lineWidth = sel ? 2.5 : 1.5;
    ctx.strokeRect(x, 330, bw, bh);
    ctx.fillStyle = '#f4ead0';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(d.label, x + bw / 2, 358);
    ctx.fillStyle = '#9a8fc0';
    ctx.font = '13px sans-serif';
    ctx.fillText(d.desc, x + bw / 2, 380);
    x += bw + gap;
  });
  ctx.fillStyle = '#fff3a0';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Click a difficulty, then press SPACE or click START', W / 2, 440);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('▶  START THE NIGHT', W / 2, 500);
  ctx.fillStyle = '#9a8fc0';
  ctx.font = '15px sans-serif';
  ctx.fillText('Mouse: plant seeds · 1–8: pick seed · F: fuse mode · Click falling suns for +25', W / 2, 540);
  ctx.fillText('Space: pause · M: mute · C: codex · R: restart', W / 2, 564);
  if (game.best > 0) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Best score: ${game.best}`, W / 2, 600);
  }
  ctx.textAlign = 'left';
}

function drawOverlay(ctx, title, sub) {
  ctx.fillStyle = 'rgba(5, 5, 16, 0.66)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff3a0';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 330);
  ctx.fillStyle = '#e8dcc0';
  ctx.font = '20px sans-serif';
  ctx.fillText(sub, W / 2, 372);
  ctx.textAlign = 'left';
}

function drawWin(ctx, game) {
  ctx.fillStyle = 'rgba(10, 20, 8, 0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff3a0';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE ORCHARD BLOOMS', W / 2, 240);
  ctx.fillStyle = '#e8dcc0';
  ctx.font = '22px sans-serif';
  ctx.fillText('Dawn breaks over ten held waves. The Heart Tree stands.', W / 2, 282);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`Score ${game.score} · ${game.kills} creatures banished · Best ${game.best}`, W / 2, 330);
  ctx.fillStyle = '#f4ead0';
  ctx.font = '19px sans-serif';
  ctx.fillText('[E] Continue into the endless night   ·   [R] Plant a new garden', W / 2, 390);
  ctx.textAlign = 'left';
}

function drawCodex(ctx, game) {
  ctx.fillStyle = 'rgba(5, 5, 16, 0.85)';
  ctx.fillRect(120, 70, W - 240, H - 140);
  ctx.strokeStyle = '#8a7bb8';
  ctx.lineWidth = 2;
  ctx.strokeRect(120, 70, W - 240, H - 140);
  ctx.fillStyle = '#fff3a0';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CODEX OF THE ORCHARD', W / 2, 112);
  ctx.textAlign = 'left';
  let y = 150;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText('Seeds discovered:', 150, y); y += 26;
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#e8dcc0';
  for (const k of SEED_ORDER) {
    const found = game.codex.seed.has(k);
    ctx.fillText(found ? `• ${SEEDS[k].name} — ${SEEDS[k].desc}` : '• ??? — not yet planted', 150, y);
    y += 22;
  }
  y += 10;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText('Hybrids discovered:', 150, y); y += 26;
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#e8dcc0';
  for (const f of FUSIONS_LIST) {
    const found = game.codex.fusion.has(f.kind);
    ctx.fillText(found ? `• ${f.name} — ${f.desc}` : '• ??? — graft two seeds to discover', 150, y);
    y += 22;
    if (y > H - 120) break;
  }
  ctx.fillStyle = '#9a8fc0';
  ctx.font = '14px sans-serif';
  ctx.fillText('Press C to close.', 150, H - 92);
}

function drawBanner(ctx, game) {
  if (!game.banner || game.bannerT <= 0) return;
  const a = Math.min(1, game.bannerT);
  ctx.globalAlpha = a;
  ctx.fillStyle = '#fff3a0';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.banner.text, W / 2, 300);
  if (game.banner.sub) {
    ctx.fillStyle = '#e8dcc0';
    ctx.font = '19px sans-serif';
    ctx.fillText(game.banner.sub, W / 2, 334);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawToasts(ctx, game) {
  ctx.textAlign = 'center';
  let y = 66;
  for (const t of game.toasts) {
    ctx.globalAlpha = Math.min(1, t.t);
    ctx.fillStyle = 'rgba(10, 10, 24, 0.8)';
    const w = ctx.measureText(t.text).width + 28;
    ctx.fillRect(W / 2 - w / 2, y, w, 28);
    ctx.fillStyle = '#fff3a0';
    ctx.font = '15px sans-serif';
    ctx.fillText(t.text, W / 2, y + 19);
    y += 34;
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

export { SEED_COLORS };
