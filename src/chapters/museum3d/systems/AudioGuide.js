// Mechanical audio guide: Archivist lines ride the DialogueSystem, with a
// small receiver click synthesized through WebAudio. Audio failure never
// blocks the game — the subtitle is the primary channel.

export class AudioGuide {
  constructor(dialogue) {
    this.dialogue = dialogue;
    this._ctx = null;
  }

  _ensureContext() {
    if (this._ctx) return this._ctx;
    try {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      this._ctx = Ctx ? new Ctx() : null;
    } catch {
      this._ctx = null;
    }
    return this._ctx;
  }

  _click(frequency = 880, duration = 0.06, when = 0) {
    const ctx = this._ensureContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + duration + 0.02);
    } catch {
      /* audio is cosmetic */
    }
  }

  _noiseBurst({ duration = 0.4, when = 0, gainValue = 0.035, cutoff = 850 } = {}) {
    const ctx = this._ensureContext();
    if (!ctx) return;
    try {
      const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        const envelope = 1 - i / frameCount;
        data[i] = (Math.random() * 2 - 1) * envelope;
      }
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      gain.gain.linearRampToValueAtTime(gainValue, ctx.currentTime + when + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + duration);
      source.buffer = buffer;
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start(ctx.currentTime + when);
    } catch {
      /* audio is cosmetic */
    }
  }

  receiverClick() {
    this._click(660, 0.05);
    this._click(880, 0.05, 0.09);
  }

  phoneRing() {
    for (let i = 0; i < 8; i++) {
      this._click(1180, 0.05, i * 0.09);
    }
  }

  marketPawlRelease() {
    this._click(430 + Math.random() * 24, 0.045);
    this._click(270 + Math.random() * 18, 0.075, 0.055);
  }

  marketCanvasClose() {
    this._noiseBurst({ duration: 1.1, gainValue: 0.045, cutoff: 620 });
    for (let i = 0; i < 7; i++) this._click(210 + Math.random() * 26, 0.035, 0.1 + i * 0.13);
    this._click(120, 0.14, 1.03);
  }

  sayArchivist(lines, options) {
    const list = Array.isArray(lines) ? lines : [lines];
    this.receiverClick();
    this.dialogue.play(
      list.map((text) => ({ speaker: 'ARCHIVIST', text })),
      options,
    );
  }

  sayButch(lines, options) {
    const list = Array.isArray(lines) ? lines : [lines];
    this.dialogue.play(
      list.map((text) => ({ speaker: 'BUTCH', text })),
      options,
    );
  }
}
