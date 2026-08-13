// Chapter 4 // THE PAINTED COUNTRY — where everything physically is.
//
// The car is a grid of paper cells. The player paints and washes cells freely
// rather than triggering fixed targets, so this file describes surfaces and
// contents, never "the third barrier". The model turns it into rules.

export const CELL = 20;
export const GRID = { w: 144, h: 30 }; // 2880 x 600
export const VIEW = { w: 960, h: 600 };
export const WORLD = { w: GRID.w * CELL, h: GRID.h * CELL };

export const CEILING_Y = 80;
export const RACK_Y = 104;
export const WAINSCOT_Y = 340;
export const FLOOR_ROW = 22;
export const FLOOR_Y = FLOOR_ROW * CELL; // 440

// Solid floor, in grid columns [from, to). Everything else is a hole in the
// sheet. Both holes are wider than a jump, so both must be painted across.
export const FLOOR_SPANS = [
  { from: 0, to: 20 }, // the cold end
  { from: 32, to: 96 }, // across the first hole and the whole gallery
  { from: 104, to: 144 }, // the long wall, the door
];

export const BAY_TITLES = [
  { x: 40, title: 'BAY A  ·  THE COLD END' },
  { x: 1000, title: 'BAY B  ·  THE GALLERY' },
  { x: 1960, title: 'BAY C  ·  THE LONG WALL' },
];

export const FOLDS = [960, 1920];

export const WINDOWS = [
  { x: 60, y: 120, w: 240, h: 170 },
  { x: 620, y: 120, w: 250, h: 170 },
  { x: 2120, y: 120, w: 250, h: 170 },
];

// Paper blocks: solid, and the only solid thing besides the player's own paint
// that a wash can remove. Given in cell rectangles.
export const BLOCK_RECTS = [
  // Bay A: a stack sealing the way into the gallery. Five cells tall, so it
  // cannot be jumped — the player has to learn WASH to get past it.
  { col: 40, row: 17, cols: 3, rows: 5 },
  // Bay C: the long wall. A slab the player must open a hole through.
  { col: 110, row: 13, cols: 5, rows: 9 },
];

// ------------------------------------------------------------ the thread board
// The lock on the vestibule. Six eyelets in three pairs, and two eyelets torn
// clean out of the card. Thread each pair together without two cords sharing a
// hole — which, with the torn ones where they are, means two of the three cords
// cannot run straight. It is the same card Mara's cyan thread comes off.
export const BOARD = {
  x: 2400,
  y: 230,
  w: 192,
  h: 192,
  cols: 5,
  rows: 5,
  pad: 28,
  pitch: 34,
  torn: [[2, 0], [2, 2]],
  pairs: [
    { id: 'amber', a: [0, 0], b: [4, 0] },
    { id: 'cyan', a: [0, 2], b: [4, 2] },
    { id: 'red', a: [0, 4], b: [4, 4] },
  ],
};

export const eyeletAt = (c, r) => ({
  x: BOARD.x + BOARD.pad + c * BOARD.pitch,
  y: BOARD.y + BOARD.pad + r * BOARD.pitch,
});

// Varnished paper. Paint slides straight off these cells, so a staircase
// cannot simply be run up the wall beneath the third picture — the player has
// to build out to the side and come across the top of it. The door face is
// varnished too, so the signs on it can never be painted over.
export const GLAZE_RECTS = [
  { col: 84, row: 12, cols: 9, rows: 10 },
  { col: 134, row: 10, cols: 10, rows: 12 },
  // The thread board's card, so a stray brush stroke can never bury the lock.
  { col: 119, row: 11, cols: 11, rows: 11 },
];

export const SIGN = Object.freeze({
  MOON: 'moon',
  RIVER: 'river',
  STAR: 'star',
  HOUSE: 'house',
});

// The gallery. Hung high on purpose: the only way to read one is to build up
// to it. The moon is the only sign in all three, which is the answer the door
// is asking for.
export const PAINTINGS = [
  {
    id: 'picture-1',
    title: 'FIRST NIGHT',
    x: 1020,
    y: 250,
    w: 132,
    h: 96,
    signs: [SIGN.MOON, SIGN.RIVER, SIGN.HOUSE],
  },
  {
    id: 'picture-2',
    title: 'THE LONG WINTER',
    x: 1340,
    y: 150,
    w: 132,
    h: 96,
    signs: [SIGN.MOON, SIGN.STAR, SIGN.HOUSE],
  },
  {
    id: 'picture-3',
    title: 'WHAT SHE KEPT',
    x: 1700,
    y: 120,
    w: 132,
    h: 96,
    signs: [SIGN.MOON, SIGN.RIVER, SIGN.STAR],
  },
];

// How close the player has to get before a picture counts as read. Small
// enough that none of the three can be read from the floor.
export const READ_RADIUS = 100;

// The vestibule door. Four signs; the player has to work out which one every
// picture had in it.
export const DOOR = {
  x: 2690,
  y: 220,
  w: 180,
  h: 210,
  correct: SIGN.MOON,
  panels: [
    { sign: SIGN.MOON, x: 2712, y: 250, w: 64, h: 64 },
    { sign: SIGN.RIVER, x: 2790, y: 250, w: 64, h: 64 },
    { sign: SIGN.STAR, x: 2712, y: 330, w: 64, h: 64 },
    { sign: SIGN.HOUSE, x: 2790, y: 330, w: 64, h: 64 },
  ],
};

// The brush reaches about a body and a half. Short enough that the player has
// to climb what they build, long enough that building is never fiddly.
export const REACH = 180;
export const MOVE_SPEED = 190;
export const JUMP_VELOCITY = -560;
export const GRAVITY_Y = 1700;
