import { chapter03VoiceAssetFor } from './generated/chapter03VoiceAssets.js';

const dbToGain = (db) => 10 ** (db / 20);

// One reusable media element feeds a dedicated Voice gain bus. Subtitles are
// authoritative, so unavailable or blocked audio always fails silently.
export class Chapter3VoicePlayback {
  constructor({ voiceGainDb = -1, onVoiceStateChange = null } = {}) {
    this.onVoiceStateChange = onVoiceStateChange;
    this.audio = typeof Audio === 'undefined' ? null : new Audio();
    if (this.audio) {
      this.audio.preload = 'metadata';
      this.audio.playsInline = true;
    }
    this.context = null;
    this.source = null;
    this.voiceBus = null;
    this.voiceGain = dbToGain(voiceGainDb);
    this.audio?.addEventListener('ended', () => this.onVoiceStateChange?.(false));
    this.audio?.addEventListener('error', () => this.onVoiceStateChange?.(false));
  }

  _ensureGraph() {
    if (this.context || !this.audio) return this.context;
    try {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctx) return null;
      this.context = new Ctx();
      this.source = this.context.createMediaElementSource(this.audio);
      this.voiceBus = this.context.createGain();
      this.voiceBus.gain.value = this.voiceGain;
      this.source.connect(this.voiceBus).connect(this.context.destination);
    } catch {
      this.context = null;
    }
    return this.context;
  }

  play({ speaker, text } = {}) {
    this.stop();
    const asset = chapter03VoiceAssetFor(speaker, text);
    if (!asset || !this.audio) return false;
    const context = this._ensureGraph();
    this.audio.src = asset.url;
    this.audio.currentTime = 0;
    context?.resume?.().catch(() => {});
    this.onVoiceStateChange?.(true);
    this.audio.play().catch(() => this.onVoiceStateChange?.(false));
    return true;
  }

  stop() {
    if (!this.audio) return;
    this.audio.pause();
    if (Number.isFinite(this.audio.duration)) this.audio.currentTime = 0;
    this.onVoiceStateChange?.(false);
  }
}
