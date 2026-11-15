// Beaconkeeper — waves and upgrades. A wave is a queue of shadows to
// spawn; clearing it opens the upgrade choice (3 of 8, drawn fresh).
import { UPGRADES, wavePlan } from './config.js';

export class WaveManager {
  constructor(game) {
    this.game = game;
    this.wave = 0;
    this.queue = [];
    this.spawnTimer = 0;
    this.betweenTimer = 0;
    this.choices = [];
  }
  startWave(n) {
    const plan = wavePlan(n);
    this.wave = n;
    this.queue = [];
    for (let i = 0; i < plan.wisps; i++) this.queue.push('wisp');
    for (let i = 0; i < plan.crawlers; i++) this.queue.push('crawler');
    for (let i = 0; i < plan.brutes; i++) this.queue.push('brute');
    // Shuffle the queue so kinds arrive mixed, not in blocks.
    const rng = this.game.rng;
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.spawnTimer = 0.6;
    this.spawnGap = plan.spawnGap;
    this.game.banner = `Wave ${n} of 10`;
    this.game.bannerTimer = 2.2;
    this.game.audio.wave();
  }
  drawChoices() {
    this.choices = this.game.rng.pickThree(UPGRADES);
    return this.choices;
  }
  applyChoice(index) {
    const upgrade = this.choices[index];
    if (!upgrade) return false;
    upgrade.apply(this.game.keeper, this.game);
    this.game.audio.upgrade();
    this.game.particles.floatText(this.game.keeper.x, this.game.keeper.y - 30, upgrade.name, '#ffe9a8');
    this.choices = [];
    return true;
  }
  get remaining() { return this.queue.length; }
  get cleared() { return this.queue.length === 0 && this.game.enemies.length === 0; }
}
