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
  { x: 0, w: 392 }, // Bay A, up to the beam gap
  { x: 608, w: 788 }, // across Bay A's far side and into Bay B
  { x: 1586, w: 974 }, // Bay B's far side, through Bay C to the unfinished end
  { x: 2760, w: 120 }, // the landing at the coupling
];

// Bay A: the hole the beam crosses.
export const GAP_A = { x: 392, w: 216 };
// Bay B: the trough the plank crosses and the water runs into.
export const TROUGH_B = { x: 1396, w: 190 };
// Bay C: the unfinished end of the car.
export const GAP_C = { x: 2560, w: 200 };

// Bay B's float. The scuttle rises when the basin fills, and is the only step
// up to the vestibule ledge.
export const FLOAT = { x: 1660, w: 90, sunkY: 540, raisedY: 380, h: 12 };
export const LEDGE_B = { x: 1800, y: 330, w: 120, h: 14 };

// Bay C's ceiling route. Real only once the door she drew up there is painted.
export const CEILING_WALK = { x: 2540, y: 110, w: 240, h: 12 };
// Inside this band, and only while the ceiling door is real, the car has the
// drawing's gravity rather than the player's.
export const INVERT_ZONE = { x: 2560, w: 200 };

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

export const REACH = 200;
export const MOVE_SPEED = 190;
export const JUMP_VELOCITY = -560;
export const GRAVITY = 1700;
