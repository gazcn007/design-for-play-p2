import { PAL } from './palette.js';

// All art is drawn with the Graphics API at boot and baked into textures.
//
// Two-layer scheme: everything solid is a SILHOUETTE drawn in grey and tinted
// per lane (near lane crushes to black, far lane stays hazy). Anything that
// emits light is a separate additive sprite that is never tinted — that's the
// only way to keep a glowing rune readable on a near-black block.
//
// Note: fillGradientStyle does not survive generateTexture, so every gradient
// here is built from solid per-row or per-pixel fills.

const lerpHex = (a, b, t) => {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (
    ((ar + (br - ar) * t) << 16) | ((ag + (bg - ag) * t) << 8) | (ab + (bb - ab) * t)
  );
};

// Deterministic hash-noise: fog banks and treelines vary but rebuild identically.
const rnd = (i, n) => {
  const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export function buildTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  const bake = (key, w, h, draw) => {
    g.clear();
    draw(g);
    g.generateTexture(key, w, h);
  };

  // ------------------------------------------------------------------- light

  // Soft radial falloff, tinted and scaled at every call site. Every light in
  // the game is this one texture.
  bake('glow', 128, 128, (c) => {
    for (let r = 64; r > 0; r -= 1) {
      const t = 1 - r / 64;
      c.fillStyle(0xffffff, Math.pow(t, 2.2) * 0.85);
      c.fillCircle(64, 64, r);
    }
  });

  // --------------------------------------------------------------------- sky

  bake('sky', 8, 600, (c) => {
    for (let y = 0; y < 600; y++) {
      const t = y / 599;
      let col;
      if (t < 0.55) col = lerpHex(PAL.skyTop, PAL.skyMid, t / 0.55);
      else if (t < 0.72) col = lerpHex(PAL.skyMid, PAL.skyHorizon, (t - 0.55) / 0.17);
      else col = lerpHex(PAL.skyHorizon, PAL.skyLow, (t - 0.72) / 0.28);
      c.fillStyle(col, 1);
      c.fillRect(0, y, 8, 1);
    }
  });

  bake('fog', 960, 200, (c) => {
    for (let i = 0; i < 26; i++) {
      const y = rnd(i, 7) * 180;
      const h = 14 + rnd(i, 8) * 46;
      const w = 160 + rnd(i, 9) * 420;
      const x = rnd(i, 10) * 960 - 100;
      c.fillStyle(0x8fa0b5, 0.035 + rnd(i, 11) * 0.05);
      c.fillEllipse(x + w / 2, y + h / 2, w, h);
    }
  });

  // ---------------------------------------------------------------- terrain

  bake('terrain-body', 32, 32, (c) => {
    c.fillStyle(PAL.terrain, 1);
    c.fillRect(0, 0, 32, 32);
    c.fillStyle(0x434b58, 1);
    c.fillRect(5, 7, 8, 4);
    c.fillRect(20, 17, 7, 5);
    c.fillRect(11, 25, 6, 3);
  });

  // The only thing separating the near lane's black mass from the black
  // background is this rim catching the moon.
  bake('terrain-cap', 32, 12, (c) => {
    c.fillStyle(PAL.terrain, 1);
    c.fillRect(0, 0, 32, 12);
    c.fillStyle(PAL.terrainRim, 1);
    c.fillRect(0, 0, 32, 2);
    c.fillStyle(0x5b6472, 1);
    c.fillRect(0, 2, 32, 2);
    // sparse dead grass tufts breaking the straight edge
    c.fillStyle(PAL.terrain, 1);
    c.fillRect(4, 0, 2, 3);
    c.fillRect(15, 0, 2, 4);
    c.fillRect(26, 0, 2, 3);
  });

  bake('stone', 32, 32, (c) => {
    c.fillStyle(PAL.terrain, 1);
    c.fillRect(0, 0, 32, 32);
    c.fillStyle(PAL.terrainRim, 1);
    c.fillRect(0, 0, 32, 2);
    c.fillStyle(0x3f4653, 1);
    c.fillRect(0, 28, 32, 4);
    c.lineStyle(1, 0x3a414d, 1);
    c.strokeRect(0.5, 0.5, 31, 31);
  });

  bake('brick', 32, 32, (c) => {
    c.fillStyle(0x444b57, 1);
    c.fillRect(0, 0, 32, 32);
    c.fillStyle(0x373d48, 1);
    c.fillRect(0, 15, 32, 2);
    c.fillRect(15, 0, 2, 15);
    c.fillRect(7, 17, 2, 13);
    c.fillRect(23, 17, 2, 13);
    c.fillStyle(0x5a6270, 1);
    c.fillRect(0, 0, 32, 1);
  });

  bake('plank', 32, 32, (c) => {
    c.fillStyle(0x454c58, 1);
    c.fillRect(0, 0, 32, 32);
    c.fillStyle(0x373e49, 1);
    c.fillRect(0, 11, 32, 2);
    c.fillRect(0, 22, 32, 2);
    c.fillStyle(0x656e7c, 1);
    c.fillRect(0, 0, 32, 2);
  });

  // ---------------------------------------------------------------- blocks

  bake('block-rune', 32, 32, (c) => {
    c.fillStyle(0x4c5462, 1);
    c.fillRect(0, 0, 32, 32);
    c.fillStyle(0x5c6573, 1);
    c.fillRect(2, 2, 28, 26);
    c.fillStyle(0x394049, 1);
    c.fillRect(2, 26, 28, 3);
    c.fillStyle(0x6f7986, 1);
    c.fillRect(0, 0, 32, 2);
    // carved sigil — the light comes from an additive glow sprite on top
    c.fillStyle(0x2b313a, 1);
    c.fillRect(15, 7, 3, 18);
    c.fillRect(8, 13, 17, 3);
    c.fillRect(10, 9, 3, 3);
    c.fillRect(20, 20, 3, 3);
  });

  bake('block-spent', 32, 32, (c) => {
    c.fillStyle(0x3a4049, 1);
    c.fillRect(0, 0, 32, 32);
    c.fillStyle(0x444b55, 1);
    c.fillRect(2, 2, 28, 26);
    c.fillStyle(0x2e343c, 1);
    c.fillRect(2, 26, 28, 3);
    c.fillRect(14, 8, 4, 16);
  });

  // Face texture for the 3D cubes — carved stone rather than timber.
  bake('crate-face', 64, 64, (c) => {
    c.fillStyle(0x525a68, 1);
    c.fillRect(0, 0, 64, 64);
    c.fillStyle(0x5b6472, 1);
    c.fillRect(5, 5, 54, 54);
    c.fillStyle(0x454c58, 1);
    c.fillRect(0, 0, 64, 5);
    c.fillRect(0, 59, 64, 5);
    c.fillRect(0, 0, 5, 64);
    c.fillRect(59, 0, 5, 64);
    c.fillStyle(0x3f4652, 1);
    c.fillRect(14, 14, 36, 3);
    c.fillRect(14, 47, 36, 3);
    c.fillRect(14, 14, 3, 36);
    c.fillRect(47, 14, 3, 36);
    c.fillStyle(0x6b7684, 1);
    c.fillRect(26, 26, 12, 12);
  });

  bake('spring', 32, 20, (c) => {
    c.fillStyle(0x3f4650, 1);
    c.fillRect(2, 15, 28, 5);
    c.fillStyle(0x6c7683, 1);
    c.fillRect(5, 11, 22, 3);
    c.fillRect(5, 6, 22, 3);
    c.fillStyle(0x818c9a, 1);
    c.fillRect(0, 0, 32, 5);
  });

  // --------------------------------------------------------------- pickups

  bake('echo', 20, 20, (c) => {
    c.fillStyle(PAL.echo, 0.18);
    c.fillCircle(10, 10, 9.5);
    c.fillStyle(PAL.echo, 0.55);
    c.fillCircle(10, 10, 6);
    c.fillStyle(0xffffff, 1);
    c.fillCircle(10, 10, 3.2);
  });

  // ---------------------------------------------------------------- actors

  // The hunter: tricorn, long coat flaring at the hem, cleaver held low.
  bake('player', 28, 44, (c) => {
    c.fillStyle(PAL.actor, 1);
    // coat skirt
    c.fillTriangle(3, 43, 14, 20, 25, 43);
    c.fillRect(9, 20, 10, 20);
    // legs breaking the hem
    c.fillRect(10, 38, 3, 6);
    c.fillRect(16, 38, 3, 6);
    // torso + shoulders
    c.fillRect(8, 14, 12, 10);
    c.fillTriangle(5, 22, 14, 12, 23, 22);
    // head
    c.fillCircle(14, 10, 4);
    // tricorn
    c.fillTriangle(4, 8, 14, 1, 24, 8);
    c.fillRect(4, 7, 20, 2);
    // arm + cleaver
    c.fillRect(20, 20, 3, 9);
    c.fillRect(21, 28, 6, 2);
    c.fillTriangle(23, 30, 27, 30, 25, 36);
    // a touch of edge light on the left shoulder
    c.fillStyle(0x99a4b1, 1);
    c.fillRect(8, 14, 2, 9);
    c.fillTriangle(5, 22, 10, 15, 11, 22);
  });

  // The beast: hunched quadruped, long skull, ridged spine.
  bake('enemy', 28, 24, (c) => {
    c.fillStyle(PAL.actor, 1);
    c.fillEllipse(14, 13, 22, 11);
    // haunches and shoulders
    c.fillCircle(6, 12, 6);
    c.fillCircle(21, 12, 5.5);
    // head lowered at the front
    c.fillTriangle(0, 12, 9, 8, 8, 16);
    c.fillRect(1, 11, 7, 4);
    // legs
    c.fillRect(4, 17, 3, 7);
    c.fillRect(9, 18, 2.5, 6);
    c.fillRect(18, 18, 2.5, 6);
    c.fillRect(23, 17, 3, 7);
    // spine ridge
    c.fillTriangle(9, 8, 11, 3, 13, 8);
    c.fillTriangle(14, 7, 16, 2, 18, 7);
    c.fillTriangle(19, 8, 21, 4, 23, 8);
    c.fillStyle(0x99a4b1, 1);
    c.fillRect(10, 6, 12, 2);
  });

  bake('enemy-squashed', 28, 9, (c) => {
    c.fillStyle(PAL.actor, 1);
    c.fillEllipse(14, 5, 26, 8);
  });

  // The witnesses all share one body plan. Their differences are carried by
  // tint and dialogue, which makes the repeated silhouette feel intentional:
  // the simulation can change a setting faster than it can invent a person.
  bake('npc', 34, 66, (c) => {
    c.fillStyle(PAL.actor, 1);
    // head, with the face turned slightly away from the player
    c.fillCircle(17, 11, 8);
    c.fillTriangle(8, 10, 17, 2, 28, 10);
    c.fillRect(11, 16, 12, 16);
    // coat that nearly reaches the ground
    c.fillTriangle(4, 62, 12, 26, 22, 26);
    c.fillTriangle(30, 62, 22, 26, 12, 26);
    c.fillRect(10, 29, 14, 28);
    // arms held too still to be natural
    c.fillRect(5, 29, 6, 25);
    c.fillRect(23, 29, 6, 25);
    c.fillCircle(8, 55, 4);
    c.fillCircle(26, 55, 4);
    // two narrow feet, barely visible under the hem
    c.fillRect(10, 57, 5, 8);
    c.fillRect(19, 57, 5, 8);
  });

  // A fast, narrow silver trail for the hunter's cleaver. It is deliberately
  // brief and cool-coloured, so an attack reads without turning into a bright
  // arcade projectile.
  bake('slash', 56, 36, (c) => {
    c.lineStyle(4, 0xe6f0f7, 0.68);
    c.beginPath();
    c.arc(19, 22, 18, -1.25, 0.95, false);
    c.strokePath();
    c.lineStyle(1.5, 0xffffff, 0.85);
    c.beginPath();
    c.arc(19, 22, 13, -1.18, 0.86, false);
    c.strokePath();
  });

  // ---------------------------------------------------------------- props

  bake('lamp-post', 18, 104, (c) => {
    c.fillStyle(PAL.prop, 1);
    c.fillRect(7, 16, 4, 84);
    c.fillRect(3, 99, 12, 5);
    // scrolled arm and lantern cage
    c.fillRect(7, 16, 8, 3);
    c.fillRect(13, 16, 3, 8);
    c.fillRect(10, 22, 9, 2);
    c.fillRect(11, 24, 7, 9);
    c.fillTriangle(10, 24, 14.5, 17, 19, 24);
    c.fillRect(12, 33, 5, 2);
  });

  bake('fence', 32, 56, (c) => {
    c.fillStyle(PAL.prop, 1);
    c.fillRect(0, 12, 32, 3);
    c.fillRect(0, 40, 32, 3);
    for (let i = 0; i < 4; i++) {
      const x = i * 8 + 2;
      c.fillRect(x, 6, 2.5, 50);
      c.fillTriangle(x - 1.5, 8, x + 1.25, 0, x + 4, 8);
    }
  });

  bake('hearse', 190, 104, (c) => {
    c.fillStyle(PAL.prop, 1);
    // carriage body + glass sides
    c.fillRect(52, 24, 104, 44);
    c.fillTriangle(52, 24, 104, 6, 156, 24);
    c.fillRect(48, 62, 112, 7);
    // driver's bench and shafts
    c.fillRect(24, 40, 30, 20);
    c.fillRect(0, 52, 30, 4);
    // wheels
    c.lineStyle(4, PAL.prop, 1);
    [72, 142].forEach((wx) => {
      c.beginPath();
      c.arc(wx, 82, 20, 0, Math.PI * 2);
      c.strokePath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        c.fillRect(wx - 1.5 + Math.cos(a) * 9, 80.5 + Math.sin(a) * 9, 3, 3);
      }
    });
    c.fillStyle(PAL.prop, 1);
    [72, 142].forEach((wx) => c.fillCircle(wx, 82, 5));
    // finials on the roof corners
    [58, 104, 150].forEach((fx) => c.fillTriangle(fx - 3, 10, fx, -4, fx + 3, 10));
  });

  bake('lever-off', 18, 30, (c) => {
    c.fillStyle(PAL.prop, 1);
    c.fillRect(5, 22, 8, 8);
    c.fillRect(3, 10, 3, 14);
    c.fillCircle(4, 8, 4.5);
  });

  bake('lever-on', 18, 30, (c) => {
    c.fillStyle(PAL.prop, 1);
    c.fillRect(5, 22, 8, 8);
    c.fillRect(12, 10, 3, 14);
    c.fillCircle(13, 8, 4.5);
  });

  // Signposts become grave markers.
  bake('sign', 26, 34, (c) => {
    c.fillStyle(PAL.prop, 1);
    c.fillRect(6, 4, 14, 30);
    c.fillTriangle(6, 6, 13, -1, 20, 6);
    c.fillStyle(0x545c69, 1);
    c.fillRect(9, 12, 8, 2);
    c.fillRect(9, 17, 6, 2);
    c.fillRect(9, 22, 8, 2);
  });

  // Checkpoint and goal are lanterns — the glow is added separately.
  bake('flag-checkpoint', 22, 60, (c) => {
    c.fillStyle(PAL.prop, 1);
    c.fillRect(9, 14, 4, 42);
    c.fillRect(5, 55, 12, 5);
    c.fillRect(6, 6, 10, 10);
    c.fillTriangle(5, 7, 11, 0, 17, 7);
  });

  bake('flag-goal', 34, 96, (c) => {
    c.fillStyle(PAL.prop, 1);
    // gate posts and lintel
    c.fillRect(0, 10, 7, 86);
    c.fillRect(27, 10, 7, 86);
    c.fillRect(0, 10, 34, 6);
    c.fillTriangle(10, 10, 17, -2, 24, 10);
    // hanging lantern
    c.fillRect(16, 16, 2, 10);
    c.fillRect(12, 26, 10, 12);
    c.fillTriangle(11, 27, 17, 19, 23, 27);
  });

  // ------------------------------------------------------------ vegetation

  // Foreground brambles, pure black — nothing in front of these.
  bake('foreground', 960, 84, (c) => {
    c.fillStyle(0x05070b, 1);
    c.fillRect(0, 42, 960, 42);
    for (let i = 0; i < 70; i++) {
      const x = i * 14;
      const h = 14 + rnd(i, 31) * 26;
      c.fillTriangle(x, 48, x + 4.5, 48 - h, x + 9, 48);
    }
    for (let i = 0; i < 22; i++) {
      const x = i * 44 + 8;
      const h = 34 + rnd(i, 33) * 26;
      c.fillRect(x, 48 - h, 2, h);
      c.fillRect(x - 6, 48 - h * 0.7, 7, 1.6);
      c.fillRect(x + 1, 48 - h * 0.45, 7, 1.6);
    }
  });

  // --------------------------------------------------------------- overlay

  bake('vignette', 96, 60, (c) => {
    const cx = 48;
    const cy = 30;
    for (let y = 0; y < 60; y++) {
      for (let x = 0; x < 96; x++) {
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        const d = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
        const a = Math.min(1, Math.pow(Math.max(0, d - 0.22) / 0.78, 1.7)) * 0.9;
        if (a <= 0.005) continue;
        c.fillStyle(0x000000, a);
        c.fillRect(x, y, 1, 1);
      }
    }
  });

  bake('mote', 6, 6, (c) => {
    c.fillStyle(0xffffff, 0.25);
    c.fillCircle(3, 3, 3);
    c.fillStyle(0xffffff, 0.9);
    c.fillCircle(3, 3, 1.4);
  });

  g.destroy();
}
