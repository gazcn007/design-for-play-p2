import { CAR_W } from './paintedCarModel.js';

// Where the carriage physically is. The model owns what is true about paint;
// this owns where things sit, and the two must agree — every region rectangle
// in paintedCarModel.js lands inside one of these bays.

export const VIEW = { w: 960, h: 600 };
export const WORLD = { w: CAR_W, h: 600 };

export const CEILING_Y = 96;
export const RACK_Y = 118;
export const WAINSCOT_Y = 344;
export const FLOOR_Y = 430;

// Solid ground, in world x. Everything not listed is a hole in the paper.
export const FLOOR_RUNS = [
  { x: 0, w: 392 }, // Bay A, up to the first hidden bridge
  { x: 608, w: 788 }, // across Bay A's far side and into Bay B
  { x: 1586, w: 974 }, // Bay B's far side, through Bay C to the unfinished end
  { x: 2760, w: 120 }, // the landing at the coupling
];

// The three missing strips of floor. Each is bridged only after its marked
// paper barrier has been washed and the revealed route has been painted.
export const GAP_A = { x: 392, w: 216 };
export const TROUGH_B = { x: 1396, w: 190 };
export const GAP_C = { x: 2560, w: 200 };

export const WINDOWS = [
  { x: 56, y: 132, w: 244, h: 188 },
  { x: 344, y: 132, w: 272, h: 188 },
  { x: 660, y: 132, w: 244, h: 188 },
  { x: 1000, y: 132, w: 212, h: 188 },
  { x: 1600, y: 132, w: 264, h: 188 },
  { x: 1960, y: 132, w: 232, h: 188 },
];

// The long folds that divide the car into bays. The paper hinges here.
export const FOLDS = [960, 1920];

export const BAY_TITLES = [
  { x: 40, title: 'BAY A  ·  THE COLD END' },
  { x: 1000, title: 'BAY B  ·  THE WASHROOM' },
  { x: 1960, title: 'BAY C  ·  THE LONG WALL' },
];

// Where washed ink physically goes. Each path is a polyline on the sheet drawn
// from the mark that holds the ink to the place it ends up, so the player can
// read the whole consequence before pressing anything. These are the level
// design now: change a channel and you change the puzzle.
export const DRAIN_PATHS = {
  // Bay A's channel runs AWAY from the route, into a grate. There is no wrong
  // order to find here, which is the point of a teaching bay.
  'seal-a': [[264, 424], [180, 424], [180, 434]],

  // Bay B: out of the seal, across, and down into the basin at the player's feet.
  'seal-b': [[1268, 292], [1338, 292], [1338, 300]],
  // ...and from the basin, a short hop right into the open trough.
  'blot-b': [[1376, 414], [1462, 414], [1462, 431]],

  // Bay C: this one is deliberately theatrical. It runs the whole length of the
  // bay, over the second seal and over the basin, and drops into the last hole.
  'seal-c1': [[2300, 282], [2660, 282], [2660, 431]],
  'seal-c2': [[2460, 316], [2508, 316], [2508, 300]],
  'blot-c': [[2546, 414], [2624, 414], [2624, 431]],
};

// A grate in the floor. Not a hole the player can fall through — the floor run
// is unbroken here — but ink that reaches it is gone for good.
export const SUMP = { x: 150, y: 430, w: 60, h: 18 };

export const REACH = 200;
export const MOVE_SPEED = 190;
export const JUMP_VELOCITY = -560;
