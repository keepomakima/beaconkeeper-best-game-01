// Pooled particles: petals, embers, light motes, soil puffs. Pure data;
// render.js draws them, game.js spawns them. No allocation in the hot
// loop beyond the pool itself.
export class Particles {
  constructor() {
    this.list = [];
  }
  burst(x, y, n, color, speed = 90) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.list.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30,
        life: 0.5 + Math.random() * 0.5, max: 1, size: 2 + Math.random() * 3,
        color, gravity: 120,
      });
    }
    if (this.list.length > 400) this.list.splice(0, this.list.length - 400);
  }
  ring(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.list.push({
        x, y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70,
        life: 0.6, max: 0.6, size: 3, color, gravity: 0,
      });
    }
  }
  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }
}
