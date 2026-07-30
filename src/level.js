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
  spawn: { x: 70, y: 400, lane: LANE_NEAR },
  tutorialPuzzle: {
    mode: 'timetable',
    endX: 4800,
    stages: [
      {
        id: 'junction-1',
        title: 'I  /  PUNCH THE DOOR',
        startX: 0,
        endX: 790,
        rackX: 250,
        commandX: 430,
        runX: 650,
        commands: ['door'],
        solution: ['door'],
        autoRun: true,
        showRack: false,
        showMachinery: false,
        guidance: 'direct',
        lesson: 'One punched instruction becomes a real train action.',
      },
      {
        id: 'junction-2',
        title: 'II  /  CONTACT',
        startX: 800,
        endX: 1590,
        rackX: 910,
        commandX: 1090,
        runX: 1450,
        commands: ['brake', 'power'],
        solution: ['brake', 'power'],
        guideSequence: ['brake', 'power'],
        guidance: 'sequence',
        lesson: 'Braking compresses the suspension until the power contact meets.',
      },
      {
        id: 'junction-3',
        title: 'III  /  AIR LOCK',
        startX: 1600,
        endX: 2390,
        rackX: 1710,
        commandX: 1870,
        runX: 2260,
        commands: ['brake', 'vent', 'door'],
        solution: ['brake', 'vent', 'door'],
        guidance: 'machine',
        lesson: 'The door cannot release while the brake pipe is pressurized.',
      },
      {
        id: 'junction-4',
        title: 'IV  /  WEIGHT TRANSFER',
        startX: 2400,
        endX: 3190,
        rackX: 2510,
        commandX: 2630,
        runX: 2800,
        commands: ['brake'],
        solution: ['brake'],
        manualAction: 'release',
        manualX: 3050,
        manualWindowMs: 3500,
        guidance: 'timed',
        lesson: 'Brake the car, then reach the trolley latch while its weight is still forward.',
      },
      {
        id: 'junction-5',
        title: 'V  /  READ THE BOGIE',
        startX: 3200,
        endX: 3990,
        rackX: 3310,
        commandX: 3370,
        runX: 3860,
        commands: ['brake', 'vent', 'power'],
        solution: ['brake', 'vent', 'power'],
        lesson: 'Hold the bleed valve open and energize the axle while the line sits in its working band.',
        underfloor: true,
        showRack: false,
        physicalSequence: true,
        guidance: 'physical-causality',
        // Pressure is an analogue quantity here, not a third ordering puzzle.
        // VENT is held rather than tapped; BRAKE widens the usable band by
        // slowing the bleed. The player has to find the window, not the order.
        pressureHold: {
          start: 100,
          bandLow: 30,
          bandHigh: 62,
          bleedPerSec: 30,
          bleedBrakedPerSec: 21,
          rechargePerSec: 30,
          // With the brake set the reservoir is isolated, so a chosen pressure
          // only creeps back up. That is what buys the player the walk from the
          // valve to the POWER control without a reflex-test window.
          rechargeBrakedPerSec: 9,
        },
      },
      {
        id: 'junction-6',
        title: 'VI  /  PAST HOLDS THE VALVE',
        startX: 4000,
        endX: 4790,
        rackX: 4110,
        commandX: 4160,
        runX: 4660,
        commands: ['brake', 'vent', 'couple'],
        solution: ['brake', 'vent', 'couple'],
        echoStartX: 4070,
        echoX: 4340,
        // Mutual ground. PAST walks the lower deck toward the bleed valve but
        // cannot pass three physical obstacles; each one clears only when the
        // player operates the matching control above. The verbs are unchanged —
        // BRAKE now means "build my partner a bridge" instead of "stop".
        // PAST waits at a blocked gate indefinitely, so there is no timing
        // pressure and no failure state; the tension is comprehension.
        echoGates: [
          {
            command: 'brake',
            x: 4210,
            obstacle: 'wheel',
            blockedHint: 'PAST is stopped at the turning wheelset. Nothing can pass between live spokes.',
            clearedHint: 'The shoe bites and the wheel stills. PAST slips between the spokes.',
          },
          {
            command: 'vent',
            x: 4380,
            obstacle: 'pipe',
            blockedHint: 'The charged brake pipe lies rigid across the walkway. PAST cannot climb it.',
            clearedHint: 'The pipe goes slack. PAST presses it flat and steps over.',
          },
          {
            command: 'couple',
            x: 4548,
            obstacle: 'coupler',
            blockedHint: 'The gap at the draft gear is too wide. PAST has nothing to stand on.',
            clearedHint: 'The coupler slides out and becomes a step. PAST crosses onto it.',
          },
        ],
        echoValveX: 4660,
        lesson: 'Your machine work is the ground the remembered self walks on. Clear its path, then it holds the valve so your door can open.',
        underfloor: true,
        showRack: false,
        physicalSequence: true,
        guidance: 'echo-synthesis',
      },
    ],
  },
  goal: { x: 9300, y: 388 },
  checkpoints: [{ x: 6895, y: 400, lane: LANE_NEAR }],

  solids: [
    // ---------------------------------------------------------- NEAR ground
    // Car 01 is now a continuous 4,800px first chapter. All teammate-authored
    // later-world geometry is shifted by the same 2,400px expansion.
    { lane: LANE_NEAR, x: 0, y: 460, w: 4800, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 4920, y: 460, w: 780, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 5830, y: 460, w: 900, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 6890, y: 460, w: 1100, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 8110, y: 460, w: 1390, h: 140, tex: G, kind: 'ground' },

    // ------------------------------------------------------- NEAR platforms
    { lane: LANE_NEAR, x: 5080, y: 385, w: 140, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 5330, y: 330, w: 120, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 6050, y: 375, w: 160, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 7150, y: 380, w: 130, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 7420, y: 320, w: 130, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 8300, y: 375, w: 150, h: 24, tex: S, kind: 'platform' },

    // ----------------------------------------------------------- FAR ground
    // Gaps: 700-900, 1800-2400 (the lever bridge), 3400-3560
    // The far path is a balcony, not a second enormous wall. Its thinner
    // silhouette leaves the city visible through the lane gap.
    { lane: LANE_FAR, x: 4800, y: 290, w: 900, h: 26, tex: G, kind: 'ground' },
    { lane: LANE_FAR, x: 6300, y: 290, w: 1000, h: 26, tex: G, kind: 'ground' },
    { lane: LANE_FAR, x: 7460, y: 290, w: 2040, h: 26, tex: G, kind: 'ground' },

    // -------------------------------------------------------- FAR platforms
    { lane: LANE_FAR, x: 5150, y: 220, w: 120, h: 20, tex: S, kind: 'platform' },
    { lane: LANE_FAR, x: 6600, y: 215, w: 140, h: 20, tex: S, kind: 'platform' },
    { lane: LANE_FAR, x: 7900, y: 220, w: 150, h: 20, tex: S, kind: 'platform' },
  ],

  // Eight planks spanning the 1800-2400 gap in the far lane. Disabled until
  // the player pulls the lever over in the near lane.
  bridge: {
    lane: LANE_FAR,
    y: 290,
    h: 22,
    tex: W,
    planks: Array.from({ length: 8 }, (_, i) => ({ x: 5700 + i * 75, w: 75 })),
  },

  // Blood echoes are deliberately absent from the opening frame. The player
  // should first read the hunt, the enemy, and the jump—not a row of glowing
  // collectibles. They can be reintroduced later as rare, authored rewards.
  coins: [],

  // Non-collidable set dressing. Lamps carry an additive glow that is never
  // lane-tinted, so they still read as light sources against a black lane.
  decor: [
    { tex: 'lamp-post', lane: LANE_NEAR, x: 5660, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 6760, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 7880, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 8980, light: 1 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 5420, light: 0.55 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 7000, light: 0.55 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 8280, light: 0.55 },

    { tex: 'hearse', lane: LANE_FAR, x: 4980 },
    { tex: 'hearse', lane: LANE_FAR, x: 8600 },

    { tex: 'fence', lane: LANE_FAR, x: 6400, repeat: 8 },
    { tex: 'fence', lane: LANE_FAR, x: 7600, repeat: 7 },

    { tex: 'sign', lane: LANE_NEAR, x: 7240 },
    { tex: 'sign', lane: LANE_FAR, x: 4880 },
    { tex: 'sign', lane: LANE_FAR, x: 8100 },
  ],

  enemies: [
    // A lone hound gives the opening a readable threat and introduces the
    // cleaver before the level asks for any trickier traversal.
    { lane: LANE_NEAR, x: 5020, min: 4940, max: 5220 },
    { lane: LANE_NEAR, x: 7300, min: 6910, max: 7970 },
    { lane: LANE_NEAR, x: 8600, min: 8130, max: 9200 },
    { lane: LANE_FAR, x: 6900, min: 6310, max: 7290 },
  ],

  interactables: [
    ...[
      { stage: 0, commandX: 430, runX: 650, commands: ['door'] },
      { stage: 1, commandX: 1090, runX: 1450, commands: ['brake', 'power'] },
      { stage: 2, commandX: 1870, runX: 2260, commands: ['brake', 'vent', 'door'] },
      { stage: 3, commandX: 2630, runX: 2800, commands: ['brake'] },
      { stage: 4, commandX: 3370, runX: 3860, commands: ['brake', 'vent', 'power'], physical: true },
      { stage: 5, commandX: 4160, runX: 4660, commands: ['brake', 'vent', 'couple'], physical: true },
    ].flatMap(({ stage, commandX, runX, commands, physical = false }) => {
      const interval = commands.length > 1 ? (runX - commandX - 96) / (commands.length - 1) : 0;
      return [
        ...commands.map((command, index) => ({
          id: `timetable-${stage}-${command}`,
          kind: physical ? 'rail-control' : 'timetable-command',
          command,
          stage,
          lane: LANE_NEAR,
          x: commandX + interval * index,
          y: 430,
        })),
        ...(!physical ? [{
          id: `timetable-run-${stage}`,
          kind: 'timetable-run',
          stage,
          lane: LANE_NEAR,
          x: runX,
          y: 430,
        }] : []),
      ];
    }),
    {
      id: 'timetable-manual-3',
      kind: 'timetable-manual',
      command: 'release',
      stage: 3,
      lane: LANE_NEAR,
      x: 3050,
      y: 430,
    },
    {
      id: 'sign-lever',
      kind: 'sign',
      lane: LANE_NEAR,
      x: 6370,
      y: 430,
      message: 'That lever builds a bridge... somewhere behind you.',
    },
    {
      id: 'bridge-lever',
      kind: 'lever',
      lane: LANE_NEAR,
      x: 6500,
      y: 430,
      once: true,
      message: 'A bridge rumbles into place in the far lane.',
    },
  ],

  // The people are not enemies and do not collide. They are anchors for the
  // story: each one remembers a different failed explanation of the world.
  npcs: [
    { id: 'caretaker', lane: LANE_NEAR, x: 125 },
    { id: 'mara', lane: LANE_FAR, x: 5000 },
    { id: 'operator', lane: LANE_NEAR, x: 5260 },
    { id: 'archivist', lane: LANE_FAR, x: 5460 },
    { id: 'mother', lane: LANE_NEAR, x: 6250 },
    { id: 'child', lane: LANE_FAR, x: 6660 },
    { id: 'janitor', lane: LANE_NEAR, x: 8180 },
    { id: 'last', lane: LANE_NEAR, x: 9040 },
  ],
};
