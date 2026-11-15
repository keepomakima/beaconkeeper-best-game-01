// Beaconkeeper — pooled particles, floating score text and screen shake.
// Fixed-size pools: no allocation during play, so the frame rate stays
// steady even in the busiest wave.
export class Particles {
  constructor(cap = 320) {
    this.pool = [];
    for (let i = 0; i < cap; i++) this.pool.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff' });
    this.texts = [];
    for (let i = 0; i < 24; i++) this.texts.push({ alive: false, x: 0, y: 0, life: 0, max: 1, text: '', color: '#fff' });
    this.shake = 0;
  }
  burst(x, y, color, count, speed) {
    let made = 0;
    for (const p of this.pool) {
      if (made >= count) break;
      if (p.alive) continue;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      p.alive = true; p.x = x; p.y = y;
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
      p.max = p.life = 0.35 + Math.random() * 0.45;
      p.size = 2 + Math.random() * 4; p.color = color;
      made++;
    }
  }
  floatText(x, y, text, color) {
    for (const t of this.texts) {
      if (t.alive) continue;
      t.alive = true; t.x = x; t.y = y; t.text = text; t.color = color || '#ffe9a8';
      t.max = t.life = 0.9;
      return;
    }
  }
  addShake(amount) { this.shake = Math.min(14, this.shake + amount); }
  update(dt) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.94; p.vy *= 0.94;
    }
    for (const t of this.texts) {
      if (!t.alive) continue;
      t.life -= dt;
      if (t.life <= 0) { t.alive = false; continue; }
      t.y -= 34 * dt;
    }
    this.shake = Math.max(0, this.shake - dt * 26);
  }
  get aliveCount() { let n = 0; for (const p of this.pool) if (p.alive) n++; return n; }
}
