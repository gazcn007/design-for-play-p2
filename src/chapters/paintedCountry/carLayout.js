export const VIEW = Object.freeze({ w: 960, h: 600 });
export const WORLD = Object.freeze({ w: 3400, h: 600 });

export const CEILING_Y = 82;
export const FLOOR_Y = 470;
export const WAINSCOT_Y = 350;
export const MOVE_SPEED = 205;
export const JUMP_VELOCITY = -560;
export const REACH = 118;

export const GAP_A = Object.freeze({ x: 430, w: 210 });
export const ARCH_GAP = Object.freeze({ x: 1510, w: 330 });
export const DRAWBRIDGE_GAP = Object.freeze({ x: 2560, w: 230 });

export const FLOOR_RUNS = Object.freeze([
  { x: 0, w: GAP_A.x },
  { x: GAP_A.x + GAP_A.w, w: ARCH_GAP.x - (GAP_A.x + GAP_A.w) },
  { x: ARCH_GAP.x + ARCH_GAP.w, w: DRAWBRIDGE_GAP.x - (ARCH_GAP.x + ARCH_GAP.w) },
  { x: DRAWBRIDGE_GAP.x + DRAWBRIDGE_GAP.w, w: WORLD.w - (DRAWBRIDGE_GAP.x + DRAWBRIDGE_GAP.w) },
]);

export const ARCH_SEGMENTS = Object.freeze([
  { id: 'arch-blue', x: 1510, y: 408, w: 110, h: 62 },
  { id: 'arch-yellow', x: 1620, y: 380, w: 110, h: 90 },
  { id: 'arch-green', x: 1730, y: 408, w: 110, h: 62 },
]);

export const VESTIBULE = Object.freeze({
  x: 2920,
  enteredX: 3040,
  couplingX: 3278,
  w: 480,
});

export const BAY_TITLES = Object.freeze([
  { x: 46, title: 'I  ·  COLOR LIVES IN THINGS' },
  { x: 900, title: 'II  ·  THE THREE-PART ARCH' },
  { x: 1940, title: 'III  ·  THE CASTLE DRAWBRIDGE' },
  { x: 3000, title: 'VESTIBULE' },
]);
