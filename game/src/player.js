// Beaconkeeper — the keeper the player controls: movement, the lantern
// beam, the dash, hearts and fuel. All numbers come from config, and
// upgrades mutate this object directly.
import { ARENA, KEEPER } from './config.js';
import { clamp } from './random.js';

export class Keeper {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = ARENA.w / 2;
    this.y = ARENA.h / 2 + 170;
    this.vx = 0; this.vy = 0;
    this.radius = KEEPER.radius;
    this.speed = KEEPER.speed;
    this.hearts = KEEPER.maxHearts;
    this.maxHearts = KEEPER.maxHearts;
    this.fuel = KEEPER.maxFuel;
    this.maxFuel = KEEPER.maxFuel;
    this.beamDps = KEEPER.beamDps;
    this.beamRange = KEEPER.beamRange;
    this.dashCooldown = KEEPER.dashCooldown;
    this.pickupRadius = KEEPER.pickupRadius;
    this.aim = -Math.PI / 2;
    this.beaming = false;
    this.dashTimer = 0;
    this.dashLeft = 0;
    this.iframes = 0;
    this.kills = 0;
  }
  update(dt, input, game) {
    this.iframes = Math.max(0, this.iframes - dt);
    this.dashLeft = Math.max(0, this.dashLeft - dt);
    this.aim = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);

    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
    }
    if (input.dash && this.dashLeft <= 0 && (mx || my)) {
      this.dashTimer = KEEPER.dashTime;
      this.dashLeft = this.dashCooldown;
      game.audio.dash();
    }
    const speed = this.dashTimer > 0 ? KEEPER.dashSpeed : this.speed;
    if (this.dashTimer > 0) this.dashTimer -= dt;
    this.vx = mx * speed; this.vy = my * speed;
    this.x = clamp(this.x + this.vx * dt, ARENA.wall + this.radius, ARENA.w - ARENA.wall - this.radius);
    this.y = clamp(this.y + this.vy * dt, ARENA.wall + this.radius, ARENA.h - ARENA.wall - this.radius);

    // The beam burns fuel; without fuel it sputters out.
    this.beaming = input.beam && this.fuel > 0;
    if (this.beaming) {
      this.fuel = Math.max(0, this.fuel - KEEPER.fuelDrain * dt);
      if (Math.random() < dt * 22) game.audio.shoot();
    } else {
      this.fuel = Math.min(this.maxFuel, this.fuel + KEEPER.fuelRegen * dt);
    }
  }
  hurt(game) {
    if (this.iframes > 0) return false;
    this.hearts -= 1;
    this.iframes = KEEPER.hurtIframes;
    game.audio.hurt();
    game.particles.addShake(9);
    game.particles.burst(this.x, this.y, '#ff5c7a', 14, 170);
    return true;
  }
}
