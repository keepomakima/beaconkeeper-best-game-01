// Beaconkeeper — sound, all synthesised with WebAudio at run time.
// No audio files, no network. In Node (tests) there is no window, so
// every method is a harmless no-op until a browser unlocks audio.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.padNodes = null;
  }
  unlock() {
    if (this.ctx || typeof window === 'undefined') return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.startPad();
    } catch { this.ctx = null; }
  }
  toggleMute() { this.muted = !this.muted; return this.muted; }
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  shoot() { this.tone(880, 0.07, 'triangle', 0.05, 440); }
  hit() { this.tone(220, 0.09, 'square', 0.07, 110); }
  kill() { this.tone(520, 0.16, 'sawtooth', 0.08, 90); }
  pickup() { this.tone(660, 0.08, 'sine', 0.09, 990); }
  hurt() { this.tone(160, 0.25, 'sawtooth', 0.12, 60); }
  dash() { this.tone(300, 0.12, 'sine', 0.07, 720); }
  wave() { this.tone(392, 0.3, 'triangle', 0.1, 523); this.tone(523, 0.3, 'triangle', 0.08, 784); }
  upgrade() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.09), i * 90)); }
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'triangle', 0.1), i * 140)); }
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'sawtooth', 0.08), i * 160)); }
  startPad() {
    if (!this.ctx || this.padNodes) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.035;
    gain.connect(this.ctx.destination);
    const freqs = [110, 164.8, 220];
    this.padNodes = freqs.map((f) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start();
      return osc;
    });
  }
}
