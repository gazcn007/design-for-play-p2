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
const W = 'plank';

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
    { lane: LANE_NEAR, x: 1180, y: 385, w: 140, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 1430, y: 330, w: 120, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 2150, y: 375, w: 160, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 3250, y: 380, w: 130, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 3520, y: 320, w: 130, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 4400, y: 375, w: 150, h: 24, tex: S, kind: 'platform' },

    // ----------------------------------------------------------- FAR ground
    // Gaps: 700-900, 1800-2400 (the lever bridge), 3400-3560
    // The far path is a balcony, not a second enormous wall. Its thinner
    // silhouette leaves the city visible through the lane gap.
    { lane: LANE_FAR, x: 0, y: 290, w: 700, h: 26, tex: G, kind: 'ground' },
    { lane: LANE_FAR, x: 900, y: 290, w: 900, h: 26, tex: G, kind: 'ground' },
    { lane: LANE_FAR, x: 2400, y: 290, w: 1000, h: 26, tex: G, kind: 'ground' },
    { lane: LANE_FAR, x: 3560, y: 290, w: 2040, h: 26, tex: G, kind: 'ground' },

    // -------------------------------------------------------- FAR platforms
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

  // Blood echoes are deliberately absent from the opening frame. The player
  // should first read the hunt, the enemy, and the jump—not a row of glowing
  // collectibles. They can be reintroduced later as rare, authored rewards.
  coins: [],

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
    // A lone hound gives the opening a readable threat and introduces the
    // cleaver before the level asks for any trickier traversal.
    { lane: LANE_NEAR, x: 760, min: 610, max: 860 },
    { lane: LANE_NEAR, x: 3400, min: 3010, max: 4070 },
    { lane: LANE_NEAR, x: 4700, min: 4230, max: 5300 },
    { lane: LANE_FAR, x: 3000, min: 2410, max: 3390 },
  ],

  interactables: [
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
