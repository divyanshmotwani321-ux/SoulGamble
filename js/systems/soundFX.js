/**
 * soundFX.js — Synthesized Web Audio Sound Effects Engine
 *
 * No external sound files. All sounds synthesized via Web Audio API.
 * Place this in js/systems/ since it's a cross-cutting service.
 */
export const SoundFX = {
  enabled: true,
  ctx: null,

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },

  playTone(freq, type = "sine", duration = 0.12, gainVal = 0.12) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) { /* ignore on restricted devices */ }
  },

  cardDeal()     { this.playTone(520, "triangle", 0.06, 0.08); },
  chipBet()      { this.playTone(880, "sine", 0.08, 0.1); setTimeout(() => this.playTone(1180, "sine", 0.09, 0.08), 45); },
  standSuccess() {
    this.playTone(220, "sawtooth", 0.18, 0.16);
    setTimeout(() => this.playTone(440, "sawtooth", 0.18, 0.16), 70);
    setTimeout(() => this.playTone(880, "square", 0.28, 0.18), 140);
  },
  standFail() {
    this.playTone(190, "sawtooth", 0.22, 0.12);
    setTimeout(() => this.playTone(130, "sawtooth", 0.25, 0.12), 110);
  },
  qteSuccess() {
    this.playTone(587, "square", 0.12, 0.15);
    setTimeout(() => this.playTone(880, "square", 0.24, 0.18), 90);
  },
  victoryFanfare() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.playTone(f, "triangle", 0.22, 0.15), i * 110));
  },
  defeatChord() {
    [311, 277, 233, 185].forEach((f, i) => setTimeout(() => this.playTone(f, "sawtooth", 0.26, 0.13), i * 120));
  }
};
