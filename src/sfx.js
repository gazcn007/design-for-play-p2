// Tiny WebAudio blip synth. Keeps the project asset-free — no .wav/.mp3 files
// to load, and nothing to break if you move the folder around.

let ctx = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // Browsers start the context suspended until a user gesture. Every call site
  // here is downstream of a keypress, so resuming lazily is enough.
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, to = null, dur = 0.12, type = 'square', vol = 0.14, delay = 0 }) {
  const c = audio();
  if (!c) return;

  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export const sfx = {
  jump: () => tone({ freq: 300, to: 620, dur: 0.13, vol: 0.11 }),
  land: () => tone({ freq: 160, to: 110, dur: 0.06, vol: 0.07 }),
  coin: () => {
    tone({ freq: 988, dur: 0.07, vol: 0.09 });
    tone({ freq: 1319, dur: 0.14, vol: 0.09, delay: 0.07 });
  },
  stomp: () => tone({ freq: 240, to: 70, dur: 0.16, vol: 0.13 }),
  bump: () => tone({ freq: 150, to: 95, dur: 0.09, vol: 0.11 }),
  hurt: () => tone({ freq: 400, to: 110, dur: 0.32, type: 'sawtooth', vol: 0.11 }),
  lane: () => tone({ freq: 520, to: 780, dur: 0.1, type: 'triangle', vol: 0.09 }),
  blocked: () => tone({ freq: 130, to: 105, dur: 0.09, vol: 0.08 }),
  spring: () => tone({ freq: 300, to: 1150, dur: 0.22, type: 'triangle', vol: 0.12 }),
  lever: () => {
    tone({ freq: 620, dur: 0.06, vol: 0.1 });
    tone({ freq: 940, dur: 0.12, vol: 0.1, delay: 0.06 });
  },
  checkpoint: () => {
    [659, 880].forEach((f, i) => tone({ freq: f, dur: 0.14, vol: 0.1, delay: i * 0.1 }));
  },
  goal: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.2, vol: 0.12, delay: i * 0.13 }));
  },
  gameover: () => {
    [440, 349, 262].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.12, delay: i * 0.18 }));
  },
};
