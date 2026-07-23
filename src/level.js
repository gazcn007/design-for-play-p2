import { LANE_FAR, LANE_NEAR } from './constants.js';

// Level authoring in plain data. Coordinates are world-space.
//   - solids:  { lane, x, y, w, h, tex, kind }   x/y = TOP-LEFT
//   - coins:   { lane, x, y, value }             x/y = CENTRE
//   - enemies: { lane, x, min, max }             patrol bounds
//
// The far lane's ground surface sits at y=290, the near lane's at y=460
// (see LANES in constants.js). Jump height is ~140px, so anything within
// ~135px of a standing surface is reachable.

const G = 'terrain-body'; // ground body — the moonlit cap is added automatically
const S = 'stone';
const B = 'brick';
const W = 'plank';
const RUNE = 'block-rune';

export const LEVEL = {
  spawn: { x: 90, y: 400, lane: LANE_NEAR },
  goal: { x: 5400, y: 388 },
  checkpoints: [{ x: 2995, y: 400, lane: LANE_NEAR }],

  solids: [
    // ---------------------------------------------------------- NEAR ground
    // Gaps between these are the pits: 900-1020, 1800-1930, 2830-2990, 4090-4210
    { lane: LANE_NEAR, x: 0, y: 460, w: 900, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 1020, y: 460, w: 780, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 1930, y: 460, w: 900, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 2990, y: 460, w: 1100, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 4210, y: 460, w: 1390, h: 140, tex: G, kind: 'ground' },

    // ------------------------------------------------------- NEAR platforms
    { lane: LANE_NEAR, x: 620, y: 375, w: 130, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 1180, y: 385, w: 140, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 1430, y: 330, w: 120, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 2150, y: 375, w: 160, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 3250, y: 380, w: 130, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 3520, y: 320, w: 130, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 4400, y: 375, w: 150, h: 24, tex: S, kind: 'platform' },

    // ----------------------------------------------------------- NEAR blocks
    { lane: LANE_NEAR, x: 668, y: 268, w: 32, h: 32, tex: B, kind: 'brick' },
    { lane: LANE_NEAR, x: 700, y: 268, w: 32, h: 32, tex: RUNE, kind: 'question' },
    { lane: LANE_NEAR, x: 732, y: 268, w: 32, h: 32, tex: RUNE, kind: 'question' },
    { lane: LANE_NEAR, x: 764, y: 268, w: 32, h: 32, tex: RUNE, kind: 'question' },
    { lane: LANE_NEAR, x: 796, y: 268, w: 32, h: 32, tex: B, kind: 'brick' },

    { lane: LANE_NEAR, x: 1460, y: 240, w: 32, h: 32, tex: RUNE, kind: 'question' },

    { lane: LANE_NEAR, x: 2168, y: 268, w: 32, h: 32, tex: B, kind: 'brick' },
    { lane: LANE_NEAR, x: 2200, y: 268, w: 32, h: 32, tex: RUNE, kind: 'question' },
    { lane: LANE_NEAR, x: 2232, y: 268, w: 32, h: 32, tex: B, kind: 'brick' },

    { lane: LANE_NEAR, x: 3560, y: 240, w: 32, h: 32, tex: RUNE, kind: 'question' },
    { lane: LANE_NEAR, x: 4450, y: 268, w: 32, h: 32, tex: RUNE, kind: 'question' },

    // ------------------------------------------------------------ NEAR misc
    { lane: LANE_NEAR, x: 2700, y: 440, w: 32, h: 20, tex: 'spring', kind: 'spring' },

    // 3D crates. These are real collidable platforms — the tile sprite carries
    // the static body and stays invisible, while a perspective cube mesh is
    // drawn over it. Ground surface is 460, so a 56px crate sits at y=404 and
    // a stacked one at y=348.
    // Offset as a staircase, not stacked vertically: two crates straight up is
    // a 112px wall against a 129px jump, so you have to hug it and squeeze
    // over. Stepped, each hop is a comfortable 56px.
    { lane: LANE_NEAR, x: 1580, y: 404, w: 56, h: 56, kind: 'crate' },
    { lane: LANE_NEAR, x: 1636, y: 348, w: 56, h: 56, kind: 'crate' },
    { lane: LANE_NEAR, x: 2400, y: 404, w: 56, h: 56, kind: 'crate' },
    { lane: LANE_NEAR, x: 3120, y: 404, w: 56, h: 56, kind: 'crate' },
    { lane: LANE_NEAR, x: 3176, y: 404, w: 56, h: 56, kind: 'crate' },
    { lane: LANE_NEAR, x: 4600, y: 404, w: 56, h: 56, kind: 'crate' },

    // ----------------------------------------------------------- FAR ground
    // Gaps: 700-900, 1800-2400 (the lever bridge), 3400-3560
    { lane: LANE_FAR, x: 0, y: 290, w: 700, h: 110, tex: G, kind: 'ground' },
    { lane: LANE_FAR, x: 900, y: 290, w: 900, h: 110, tex: G, kind: 'ground' },
    { lane: LANE_FAR, x: 2400, y: 290, w: 1000, h: 110, tex: G, kind: 'ground' },
    { lane: LANE_FAR, x: 3560, y: 290, w: 2040, h: 110, tex: G, kind: 'ground' },

    // -------------------------------------------------------- FAR platforms
    { lane: LANE_FAR, x: 520, y: 225, w: 110, h: 20, tex: S, kind: 'platform' },
    { lane: LANE_FAR, x: 1250, y: 220, w: 120, h: 20, tex: S, kind: 'platform' },
    { lane: LANE_FAR, x: 2700, y: 215, w: 140, h: 20, tex: S, kind: 'platform' },
    { lane: LANE_FAR, x: 4000, y: 220, w: 150, h: 20, tex: S, kind: 'platform' },
  ],

  // Eight planks spanning the 1800-2400 gap in the far lane. Disabled until
  // the player pulls the lever over in the near lane.
  bridge: {
    lane: LANE_FAR,
    y: 290,
    h: 22,
    tex: W,
    planks: Array.from({ length: 8 }, (_, i) => ({ x: 1800 + i * 75, w: 75 })),
  },

  coins: [
    // near lane — arcs over the pits, rows over platforms
    { lane: LANE_NEAR, x: 930, y: 380 },
    { lane: LANE_NEAR, x: 960, y: 350 },
    { lane: LANE_NEAR, x: 990, y: 380 },
    { lane: LANE_NEAR, x: 2170, y: 330 },
    { lane: LANE_NEAR, x: 2210, y: 330 },
    { lane: LANE_NEAR, x: 2250, y: 330 },
    { lane: LANE_NEAR, x: 2860, y: 370 },
    { lane: LANE_NEAR, x: 2900, y: 335 },
    { lane: LANE_NEAR, x: 2940, y: 370 },
    { lane: LANE_NEAR, x: 3300, y: 330 },
    { lane: LANE_NEAR, x: 3345, y: 330 },
    { lane: LANE_NEAR, x: 4250, y: 400 },
    { lane: LANE_NEAR, x: 4295, y: 400 },
    { lane: LANE_NEAR, x: 4340, y: 400 },

    // far lane — worth more, and the long row is the bridge payoff
    { lane: LANE_FAR, x: 545, y: 190, value: 5 },
    { lane: LANE_FAR, x: 585, y: 190, value: 5 },
    { lane: LANE_FAR, x: 1275, y: 185, value: 5 },
    { lane: LANE_FAR, x: 1315, y: 185, value: 5 },
    ...Array.from({ length: 8 }, (_, i) => ({
      lane: LANE_FAR,
      x: 1860 + i * 70,
      y: 250,
      value: 5,
    })),
    { lane: LANE_FAR, x: 2725, y: 175, value: 5 },
    { lane: LANE_FAR, x: 2765, y: 175, value: 5 },
    { lane: LANE_FAR, x: 4025, y: 185, value: 5 },
    { lane: LANE_FAR, x: 4070, y: 185, value: 5 },
  ],

  // Free-spinning cubes drawn in front of everything, including the foreground
  // grass, and scrolling faster than the world. They sit low on screen so they
  // sweep past the camera without covering the play area.
  //
  // NOTE: these scroll at 1.32, so x is *virtual* — a box appears when the
  // camera reaches roughly x / 1.32. The values below are pre-multiplied to
  // spread them evenly across the level rather than bunching in the first half.
  foregroundBoxes: [
    { x: 500, y: 566, size: 104, spin: { x: 0.2, y: 0.55, z: 0.05 } },
    { x: 1560, y: 578, size: 84, spin: { x: -0.28, y: 0.42, z: 0.0 } },
    { x: 2700, y: 560, size: 116, spin: { x: 0.15, y: -0.48, z: 0.08 } },
    { x: 3930, y: 574, size: 92, spin: { x: 0.34, y: 0.6, z: 0.0 } },
    { x: 5150, y: 564, size: 108, spin: { x: -0.18, y: 0.5, z: 0.06 } },
    { x: 6360, y: 576, size: 88, spin: { x: 0.26, y: -0.44, z: 0.0 } },
  ],

  // Non-collidable set dressing. Lamps carry an additive glow that is never
  // lane-tinted, so they still read as light sources against a black lane.
  decor: [
    { tex: 'lamp-post', lane: LANE_NEAR, x: 210, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 880, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 1760, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 2860, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 3980, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 5080, light: 1 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 460, light: 0.55 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 1520, light: 0.55 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 3100, light: 0.55 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 4380, light: 0.55 },

    { tex: 'hearse', lane: LANE_FAR, x: 1080 },
    { tex: 'hearse', lane: LANE_FAR, x: 4700 },

    { tex: 'fence', lane: LANE_FAR, x: 220, repeat: 6 },
    { tex: 'fence', lane: LANE_FAR, x: 2500, repeat: 8 },
    { tex: 'fence', lane: LANE_FAR, x: 3700, repeat: 7 },

    { tex: 'sign', lane: LANE_NEAR, x: 430 },
    { tex: 'sign', lane: LANE_NEAR, x: 3340 },
    { tex: 'sign', lane: LANE_FAR, x: 980 },
    { tex: 'sign', lane: LANE_FAR, x: 4200 },
  ],

  enemies: [
    { lane: LANE_NEAR, x: 1300, min: 1040, max: 1780 },
    { lane: LANE_NEAR, x: 3400, min: 3010, max: 4070 },
    { lane: LANE_NEAR, x: 4700, min: 4230, max: 5300 },
    { lane: LANE_FAR, x: 3000, min: 2410, max: 3390 },
  ],

  interactables: [
    {
      id: 'sign-lanes',
      kind: 'sign',
      lane: LANE_NEAR,
      x: 300,
      y: 430,
      message: 'W pushes you into the background.  S pulls you forward.',
    },
    {
      id: 'sign-lever',
      kind: 'sign',
      lane: LANE_NEAR,
      x: 2470,
      y: 430,
      message: 'That lever builds a bridge... somewhere behind you.',
    },
    {
      id: 'bridge-lever',
      kind: 'lever',
      lane: LANE_NEAR,
      x: 2600,
      y: 430,
      once: true,
      message: 'A bridge rumbles into place in the far lane.',
    },
  ],
};
