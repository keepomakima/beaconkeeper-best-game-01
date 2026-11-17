// Tiny WebAudio synth: every sound is an oscillator + gain envelope, no
// assets, no network. Silently no-ops when there is no AudioContext
// (headless tests, muted tab) — the sim never depends on it.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }
  ensure() {
    if (this.ctx || typeof window === 'undefined' || !window.AudioContext) return;
    try {
      this.ctx = new window.AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);
    } catch { this.ctx = null; }
  }
  resume() { this.ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  toggleMute() { this.muted = !this.muted; return this.muted; }
  tone(freq, dur, type = 'sine', vol = 0.5, slideTo = null, delay = 0) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  plant() { this.tone(520, 0.12, 'triangle', 0.4, 780); }
  shoot() { this.tone(880, 0.07, 'square', 0.16, 440); }
  lance() { this.tone(1200, 0.25, 'sawtooth', 0.14, 300); }
  boom() { this.tone(140, 0.35, 'sine', 0.6, 40); this.tone(90, 0.3, 'triangle', 0.4, 50, 0.02); }
  sun() { this.tone(1320, 0.1, 'sine', 0.3, 1760); }
  bite() { this.tone(180, 0.08, 'square', 0.2, 120); }
  fuse() { this.tone(660, 0.15, 'triangle', 0.35, 990); this.tone(990, 0.2, 'sine', 0.3, 1320, 0.08); }
  boss() { this.tone(70, 0.9, 'sawtooth', 0.5, 55); this.tone(110, 0.9, 'triangle', 0.3, 82, 0.1); }
  waveClear() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.3, null, i * 0.09)); }
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.32, null, i * 0.12)); }
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.3, null, i * 0.14)); }
  click() { this.tone(700, 0.05, 'square', 0.15); }
}
