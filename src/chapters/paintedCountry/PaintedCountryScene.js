import Phaser from 'phaser';
import {
  BAY_TITLES,
  CEILING_Y,
  DRAIN_PATHS,
  FLOOR_RUNS,
  FLOOR_Y,
  FOLDS,
  GAP_A,
  GAP_C,
  JUMP_VELOCITY,
  MOVE_SPEED,
  RACK_Y,
  REACH,
  SUMP,
  TROUGH_B,
  VIEW,
  WAINSCOT_Y,
  WINDOWS,
  WORLD,
} from './carLayout.js';
import { ACTION, ACTION_HOLD_SECONDS, KIND, createPaintedCar } from './paintedCarModel.js';
import { PAPER } from './paperPalette.js';
import {
  buildPaperGrain,
  draftLine,
  draftRect,
  hatchRect,
  makeRandom,
  paintedFill,
} from './paperSurface.js';

// Chapter 4 // THE PAINTED COUNTRY — three bays, one readable route loop.
//
// The carriage is an unfinished draughtsman's drawing on warm off-white paper,
// with the Painted Country folded out of the same sheet beyond the windows. A
// WASH barrier hides a PAINT route. The player makes the route real, crosses it,
// and repeats — no resource budget, precision fill, or inventory calculation.
//
// This file owns pixels and input only. Every rule lives in paintedCarModel.js,
// which is pure and tested. If they disagree, the model is right.

const DEPTH = {
  SHEET: 0,
  COUNTRY: 5,
  WALL: 10,
  FIXTURE: 18,
  DRAWING: 22,
  PAINT: 30,
  WATER: 32,
  THREAD: 34,
  FIGURE: 40,
  CURSOR: 44,
  GRAIN: 60,
  AIR: 70,
  HUD: 90,
};

export class PaintedCountryScene extends Phaser.Scene {
  constructor() {
    super('PaintedCountry');
  }

  create() {
    this.rnd = makeRandom(0x9a17);
    this.motes = [];
    this.boilTargets = [];
    this.car = createPaintedCar();

    this.cameras.main.setBackgroundColor(PAPER.sheet);
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.physics.world.setBounds(0, -400, WORLD.w, WORLD.h + 900);

    this.buildSheet();
    this.buildCountry();
    this.buildCarriage();
    this.buildBayA();
    this.buildBayB();
    this.buildBayC();
    this.buildThread();
    this.buildSolids();
    this.buildPlayer();
    this.buildGrain();
    this.buildAir();
    this.buildHud();

    this.regionLayer = this.graphics(DEPTH.PAINT);
    this.regionInk = this.graphics(DEPTH.DRAWING + 1);
    this.waterLayer = this.graphics(DEPTH.WATER);
    this.brushCursor = this.graphics(DEPTH.CURSOR);
    this.buildTargetLabels();
    this.input.mouse?.disableContextMenu();

    // Line boil on selected contours only, at 12fps over 60fps gameplay. Full
    // frame wobble is noise; a couple of boiling contours read as a living
    // drawing.
    this.time.addEvent({
      delay: 1000 / 12,
      loop: true,
      callback: () => this.boilTargets.forEach((redraw) => redraw()),
    });
  }

  graphics(depth) {
    return this.add.graphics().setDepth(depth);
  }

  // =========================================================== the sheet

  buildSheet() {
    const g = this.graphics(DEPTH.SHEET);
    g.fillStyle(PAPER.sheet, 1);
    g.fillRect(0, 0, WORLD.w, WORLD.h);

    // Each bay sits one half-step further into the paper than the last, so the
    // car reads as a folded sheet rather than a long flat strip.
    FOLDS.forEach((x, i) => {
      g.fillStyle(i === 0 ? PAPER.sheetMid : PAPER.sheetLow, 0.4);
      g.fillRect(x, 0, WORLD.w - x, WORLD.h);
      g.lineStyle(1, PAPER.fold, 0.9);
      draftLine(g, this.rnd, x, 0, x, WORLD.h, { overshoot: 0, jitter: 1.8, segments: 16 });
      // Kraft tape across the hinge — the car has been repaired before, by hand.
      g.fillStyle(PAPER.kraft, 0.3);
      g.fillRect(x - 8, WAINSCOT_Y - 34, 16, 78);
    });
  }

  // =============================================== the country outside

  buildCountry() {
    const container = this.add.container(0, 0).setDepth(DEPTH.COUNTRY);
    const g = this.add.graphics();
    container.add(g);

    g.fillStyle(PAPER.sheetHigh, 1);
    g.fillRect(0, 110, WORLD.w, 240);

    for (let x = -40; x < WORLD.w; x += 210) {
      hatchRect(g, this.rnd, x + 30, 168 + ((x / 210) % 3) * 22, 150, 10, {
        spacing: 7,
        alpha: 0.19,
        flip: true,
      });
    }

    // Folded hills. Origami, not landscape painting: flat planes meeting at a
    // crease, and the crease is where the value steps.
    for (let x = -60; x < WORLD.w; x += 330) {
      this.foldedHill(g, x, 206, 380, 140, PAPER.sheet, PAPER.sheetMid);
    }
    for (let x = 140; x < WORLD.w; x += 300) {
      this.foldedHill(g, x, 240, 320, 112, PAPER.sheetMid, PAPER.sheetLow);
    }

    // The village on the near ridge. The tallest house is the one Bay C's mural
    // is a picture of, so the player sees the real thing before they are asked
    // to take the picture of it apart.
    this.paperHouse(g, 378, 232, 62, 54, true);
    this.paperHouse(g, 458, 250, 40, 38);
    this.paperHouse(g, 1058, 246, 46, 44);
    this.paperHouse(g, 1690, 240, 52, 48);
    this.paperHouse(g, 2020, 252, 42, 38);

    // The river, drawn but not painted — outside, it is still only a line.
    g.lineStyle(1.5, PAPER.graphiteFaint, 0.95);
    for (let x = 0; x < WORLD.w; x += 420) {
      draftLine(g, this.rnd, x, 320, x + 420, 302, { overshoot: 0, jitter: 2.6, segments: 12 });
      draftLine(g, this.rnd, x, 330, x + 420, 312, { overshoot: 0, jitter: 2.6, segments: 12 });
    }

    const mask = this.add.graphics().setVisible(false);
    mask.fillStyle(0xffffff, 1);
    WINDOWS.forEach((win) => mask.fillRect(win.x, win.y, win.w, win.h));
    container.setMask(mask.createGeometryMask());
  }

  foldedHill(g, x, y, w, h, faceColor, shadeColor) {
    const peak = x + w * 0.4;
    g.fillStyle(faceColor, 1);
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(peak, y);
    g.lineTo(peak + w * 0.14, y + h);
    g.closePath();
    g.fillPath();

    g.fillStyle(shadeColor, 1);
    g.beginPath();
    g.moveTo(peak, y);
    g.lineTo(x + w, y + h * 0.78);
    g.lineTo(x + w, y + h);
    g.lineTo(peak + w * 0.14, y + h);
    g.closePath();
    g.fillPath();

    g.lineStyle(1.2, PAPER.graphiteSoft, 0.85);
    draftLine(g, this.rnd, x, y + h, peak, y, { overshoot: 0, jitter: 0.8 });
    draftLine(g, this.rnd, peak, y, x + w, y + h * 0.78, { overshoot: 0, jitter: 0.8 });
  }

  paperHouse(g, x, y, w, h, tallest = false) {
    const roof = h * 0.42;
    g.fillStyle(PAPER.sheetHigh, 1);
    g.fillRect(x, y + roof, w * 0.6, h - roof);
    g.fillStyle(PAPER.sheetMid, 1);
    g.fillRect(x + w * 0.6, y + roof, w * 0.4, h - roof);
    g.fillStyle(PAPER.sheet, 1);
    g.beginPath();
    g.moveTo(x - 5, y + roof);
    g.lineTo(x + w * 0.5, y);
    g.lineTo(x + w + 5, y + roof);
    g.closePath();
    g.fillPath();

    g.lineStyle(1.2, PAPER.graphiteSoft, 0.9);
    draftLine(g, this.rnd, x - 5, y + roof, x + w * 0.5, y, { overshoot: 3, jitter: 0.6 });
    draftLine(g, this.rnd, x + w * 0.5, y, x + w + 5, y + roof, { overshoot: 3, jitter: 0.6 });
    draftRect(g, this.rnd, x, y + roof, w, h - roof, { overshoot: 3, jitter: 0.6 });

    const doorH = (h - roof) * 0.58;
    g.lineStyle(1, PAPER.graphiteSoft, 0.95);
    draftRect(g, this.rnd, x + w * 0.34, y + h - doorH, w * 0.28, doorH, { overshoot: 1.5, jitter: 0.4 });
    if (tallest) {
      g.fillStyle(PAPER.graphiteSoft, 0.65);
      g.fillRect(x + w * 0.42, y + h - doorH * 0.8, w * 0.12, doorH * 0.8);
    }
  }

  // ================================================== the carriage shell

  buildCarriage() {
    const g = this.graphics(DEPTH.WALL);

    g.fillStyle(PAPER.sheetLow, 1);
    g.fillRect(0, 0, WORLD.w, CEILING_Y);
    g.fillStyle(PAPER.sheetMid, 1);
    g.fillRect(0, WAINSCOT_Y, WORLD.w, FLOOR_Y - WAINSCOT_Y);

    g.fillStyle(PAPER.sheetLow, 1);
    FLOOR_RUNS.forEach((run) => g.fillRect(run.x, FLOOR_Y, run.w, WORLD.h - FLOOR_Y));

    for (let x = 30; x < WORLD.w; x += 104) {
      hatchRect(g, this.rnd, x, 12, 30, CEILING_Y - 30, { spacing: 7, alpha: 0.45 });
    }
    FLOOR_RUNS.forEach((run) =>
      hatchRect(g, this.rnd, run.x, FLOOR_Y, run.w, 50, { spacing: 17, alpha: 0.2, flip: true }),
    );
    for (let x = 24; x < WORLD.w; x += 300) {
      hatchRect(g, this.rnd, x, WAINSCOT_Y + 12, 260, FLOOR_Y - WAINSCOT_Y - 24, {
        spacing: 13,
        alpha: 0.22,
        flip: true,
      });
    }

    // The holes: bare sheet where the floor was never drawn in, with torn lips.
    [GAP_A, TROUGH_B, GAP_C].forEach((hole) => this.drawHole(hole));

    const draw = this.graphics(DEPTH.DRAWING);
    const boil = () => {
      const rnd = makeRandom(0x5eed + Math.floor(this.time.now / 83));
      draw.clear();

      draw.lineStyle(1.9, PAPER.graphite, 0.94);
      [CEILING_Y, WAINSCOT_Y].forEach((y) =>
        draftLine(draw, rnd, 0, y, WORLD.w, y, { overshoot: 0, jitter: 1.1, segments: 40 }),
      );
      FLOOR_RUNS.forEach((run) =>
        draftLine(draw, rnd, run.x, FLOOR_Y, run.x + run.w, FLOOR_Y, {
          overshoot: 0,
          jitter: 1.2,
          segments: 12,
        }),
      );

      draw.lineStyle(1.6, PAPER.graphite, 0.9);
      WINDOWS.forEach((win) => draftRect(draw, rnd, win.x, win.y, win.w, win.h, { overshoot: 7, jitter: 0.8 }));

      draw.lineStyle(1.3, PAPER.graphiteSoft, 0.9);
      draftLine(draw, rnd, 20, RACK_Y, WORLD.w - 20, RACK_Y, { overshoot: 0, jitter: 0.8, segments: 40 });

      // Construction lines the child ruled and never used: a horizon carried
      // straight through the carriage wall, and the stubs of a perspective she
      // abandoned. These are the level design.
      draw.lineStyle(1, PAPER.graphiteFaint, 0.55);
      draftLine(draw, rnd, 0, 238, WORLD.w, 238, { overshoot: 0, jitter: 0.6, segments: 40 });
      [470, 1430, 2390].forEach((vx) => {
        [[-1, 1.5], [1, 1.5], [-1, 0.42], [1, 0.42]].forEach(([dx, dy]) => {
          draftLine(draw, rnd, vx, 238, vx + dx * 200, 238 + dy * 200, {
            overshoot: 0,
            jitter: 0.7,
            segments: 7,
          });
        });
      });
    };
    boil();
    this.boilTargets.push(boil);
  }

  drawHole(hole) {
    const g = this.graphics(DEPTH.WALL + 1);
    g.fillStyle(PAPER.sheetHigh, 1);
    g.fillRect(hole.x, FLOOR_Y, hole.w, WORLD.h - FLOOR_Y);
    g.lineStyle(1.6, PAPER.deckle, 0.95);
    [hole.x, hole.x + hole.w].forEach((x) =>
      draftLine(g, this.rnd, x, FLOOR_Y, x, WORLD.h, { overshoot: 0, jitter: 2.6, segments: 10 }),
    );
    g.lineStyle(1, PAPER.deckle, 0.7);
    for (let i = 0; i < 7; i += 1) {
      const y = FLOOR_Y + 8 + i * 22;
      draftLine(g, this.rnd, hole.x - 4, y, hole.x + 5, y + 4, { overshoot: 0, jitter: 1.2, segments: 3 });
      draftLine(g, this.rnd, hole.x + hole.w - 5, y + 9, hole.x + hole.w + 4, y + 5, {
        overshoot: 0,
        jitter: 1.2,
        segments: 3,
      });
    }
  }

  // ========================================================= bay fixtures

  buildBayA() {
    const g = this.graphics(DEPTH.FIXTURE);
    const paint = this.graphics(DEPTH.PAINT - 1);
    const x = 86;
    const y = 246;
    const w = 96;
    const h = FLOOR_Y - y;

    g.fillStyle(PAPER.sheetMid, 1);
    g.fillRect(x, y, w, h);
    hatchRect(g, this.rnd, x + w * 0.66, y + 6, w * 0.34 - 6, h - 12, { spacing: 8, alpha: 0.4 });
    g.lineStyle(1.7, PAPER.graphite, 0.92);
    draftRect(g, this.rnd, x, y, w, h, { overshoot: 6 });
    draftLine(g, this.rnd, x, y + 26, x + w, y + 26, { overshoot: 5 });
    draftLine(g, this.rnd, x - 9, y, x + w + 9, y, { overshoot: 3 });
    g.lineStyle(1.2, PAPER.graphiteSoft, 0.9);
    [x + 26, x + 58].forEach((cx) => {
      g.strokeCircle(cx, y + 13, 9);
      g.strokeCircle(cx, y + 13, 5);
    });
    g.lineStyle(1.5, PAPER.graphite, 0.9);
    [x + 34, x + 58].forEach((fx) => draftLine(g, this.rnd, fx, CEILING_Y, fx, y, { overshoot: 4, jitter: 0.7 }));

    // The enamel door stays a door, not a slab: the drawn structure around it
    // has to keep reading. It is not a region — only the firebox mouth is.
    paintedFill(paint, this.rnd, x + 16, y + 52, w - 46, h - 92, PAPER.bookCloth, { alpha: 0.82 });

    // The bench: entirely under-drawing, and the most obviously *drawn* thing
    // in the bay.
    const bx = 700;
    const seat = 356;
    g.lineStyle(1.6, PAPER.graphite, 0.8);
    draftRect(g, this.rnd, bx, seat, 186, 14, { overshoot: 6 });
    [bx + 14, bx + 172].forEach((lx) => draftLine(g, this.rnd, lx, seat + 14, lx, FLOOR_Y, { overshoot: 5 }));
    draftLine(g, this.rnd, bx, seat - 62, bx + 186, seat - 62, { overshoot: 5 });
  }

  buildBayB() {
    const g = this.graphics(DEPTH.FIXTURE);

    // A washroom without a new mechanical sub-system: all its fixtures point
    // toward the broad paper seal rather than asking the player to solve pipes.
    g.lineStyle(1.6, PAPER.graphite, 0.9);
    draftRect(g, this.rnd, 1032, 292, 112, 90, { overshoot: 6 });
    draftLine(g, this.rnd, 1032, 382, 1144, 382, { overshoot: 5 });
    draftLine(g, this.rnd, 1052, 382, 1052, FLOOR_Y, { overshoot: 4 });
    draftLine(g, this.rnd, 1124, 382, 1124, FLOOR_Y, { overshoot: 4 });

    // A hanging wash light gives the seal a stage-like pool of attention.
    g.lineStyle(1.4, PAPER.graphiteSoft, 0.9);
    draftLine(g, this.rnd, 1338, RACK_Y, 1338, 196, { overshoot: 4 });
    g.strokeCircle(1338, 208, 13);

    // Folded rails make the trough read as a deliberate missing strip of
    // paper, with room for the bridge to become its clean completion.
    g.lineStyle(1.5, PAPER.graphite, 0.82);
    draftLine(g, this.rnd, 1280, 378, 1378, 414, { overshoot: 5 });
    draftLine(g, this.rnd, 1606, 414, 1704, 378, { overshoot: 5 });
    g.lineStyle(1.2, PAPER.graphiteFaint, 0.85);
    draftLine(g, this.rnd, 1210, 420, 1770, 424, { overshoot: 4, jitter: 1.1, segments: 12 });

    // A paper laundry cart on the far side catches the eye after the crossing.
    g.lineStyle(1.5, PAPER.graphite, 0.85);
    draftRect(g, this.rnd, 1690, 334, 124, 92, { overshoot: 6 });
    draftLine(g, this.rnd, 1690, 364, 1814, 364, { overshoot: 4 });
    [1714, 1790].forEach((x) => draftLine(g, this.rnd, x, 426, x, 444, { overshoot: 3 }));
  }

  buildBayC() {
    const g = this.graphics(DEPTH.FIXTURE);

    // A long-wall mural. It remains scenery now: the final route is a gift of
    // the drawing, not something the player must cut out of a memory.
    const cd = { x: 2070, y: 262, w: 136, h: 166 };
    g.lineStyle(1.5, PAPER.graphite, 0.8);
    draftRect(g, this.rnd, cd.x, cd.y, cd.w, cd.h, { overshoot: 6 });
    g.lineStyle(1.2, PAPER.graphiteSoft, 0.64);
    draftLine(g, this.rnd, cd.x + 10, cd.y + 114, cd.x + 48, cd.y + 54, { overshoot: 3 });
    draftLine(g, this.rnd, cd.x + 48, cd.y + 54, cd.x + 90, cd.y + 114, { overshoot: 3 });
    draftLine(g, this.rnd, cd.x + 62, cd.y + 114, cd.x + 104, cd.y + 32, { overshoot: 3 });
    draftLine(g, this.rnd, cd.x + 104, cd.y + 32, cd.x + 130, cd.y + 114, { overshoot: 3 });

    // The long wall's construction frame points toward the final paper seal.
    g.lineStyle(1.4, PAPER.graphiteSoft, 0.85);
    draftRect(g, this.rnd, 2180, 190, 300, 250, { overshoot: 7 });
    hatchRect(g, this.rnd, 2200, 212, 260, 190, { spacing: 15, alpha: 0.13 });

    // The final vestibule is visible from the start of the bay, so reaching it
    // reads as an arrival instead of an unexplained state change.
    g.lineStyle(1.7, PAPER.graphite, 0.9);
    draftRect(g, this.rnd, 2782, 292, 74, 146, { overshoot: 6 });
    draftRect(g, this.rnd, 2794, 306, 50, 108, { overshoot: 3, jitter: 0.5 });
    this.add
      .text(2819, 270, 'VESTIBULE', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '10px',
        color: '#8d8579',
        letterSpacing: 1.4,
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.FIXTURE + 1);
  }

  buildThread() {
    // Mara's cyan thread: neither paper nor pigment, so it can be neither
    // painted nor washed. It runs the length of the car.
    const g = this.graphics(DEPTH.THREAD);
    g.lineStyle(1.5, PAPER.cyan, 0.62);
    g.beginPath();
    g.moveTo(196, 412);
    // It lies along the floor and the fixtures rather than cutting across the
    // frame: a thread someone dropped, not a diagram drawn over the car.
    [
      [330, 424], [392, 426], [500, 428], [648, 428], [830, 424], [960, 426],
      [1140, 420], [1210, 416], [1396, 428], [1586, 428], [1800, 342],
      [1920, 424], [2210, 426], [2500, 424], [2560, 428], [2782, 424],
    ].forEach(([x, y]) => g.lineTo(x, y));
    g.strokePath();
  }

  // ============================================================== physics

  buildSolids() {
    const solid = (x, y, w, h) => {
      const object = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0);
      this.physics.add.existing(object, true);
      return object;
    };

    this.staticSolids = FLOOR_RUNS.map((run) => solid(run.x, FLOOR_Y, run.w, 40));

    // The two ends of the sheet are walls, not cliffs. Falling *through* the
    // paper is a real move; walking off the end of the drawing is not, and it
    // used to throw the player back down the car the instant they arrived.
    this.staticSolids.push(
      solid(-24, -400, 24, WORLD.h + 500),
      solid(WORLD.w, -400, 24, WORLD.h + 500),
    );

    // Every mark that can ever be solid owns one body, switched on and off from
    // the model each frame. A seal blocks until washed, a blot blocks whenever
    // ink is standing in it, and a route bears weight once it has been painted.
    // The grate is drawing only — the floor there is unbroken.
    this.targetSolids = {};
    this.car.state.regions.forEach((region) => {
      if (region.kind === KIND.SUMP) return;
      this.targetSolids[region.id] = solid(region.x, region.y, region.w, region.h);
    });
  }

  buildPlayer() {
    // An invisible arcade body carries the physics; the figure is drawn by hand
    // over it every frame, which keeps the art free of sprite-sheet constraints
    // while collision stays a plain rectangle.
    this.walker = this.add.rectangle(250, 340, 16, 58, 0xffffff, 0);
    this.physics.add.existing(this.walker);
    this.walker.body.setCollideWorldBounds(false);
    [
      ...this.staticSolids,
      ...Object.values(this.targetSolids),
    ].forEach((object) => this.physics.add.collider(this.walker, object));

    this.figure = this.graphics(DEPTH.FIGURE);
    this.cameras.main.startFollow(this.walker, true, 0.1, 0.12);
    this.cameras.main.setDeadzone(260, 200);

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      a: 'A',
      d: 'D',
      up: 'UP',
      w: 'W',
      space: 'SPACE',
      restart: 'R',
    });
    this.input.keyboard.addCapture(['LEFT', 'RIGHT', 'UP', 'DOWN', 'SPACE']);
  }

  // ================================================================ surface

  buildGrain() {
    const key = buildPaperGrain(this);
    this.grain = this.add
      .tileSprite(0, 0, VIEW.w, VIEW.h, key)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.GRAIN)
      .setAlpha(0.9);
  }

  buildAir() {
    for (let i = 0; i < 30; i += 1) {
      const mote = this.add
        .circle(this.rnd() * WORLD.w, this.rnd() * VIEW.h, this.rnd() > 0.75 ? 1.7 : 1.1, PAPER.graphiteSoft, 0.55)
        .setDepth(DEPTH.AIR);
      this.motes.push({ obj: mote, vx: 4 + this.rnd() * 9, vy: -2 + this.rnd() * 4, phase: this.rnd() * 6.28 });
    }
  }

  buildHud() {
    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    const fixed = (x, y, text, color, size = 11, origin = 0) =>
      this.add
        .text(x, y, text, { fontFamily: mono, fontSize: `${size}px`, color, letterSpacing: 2 })
        .setOrigin(origin, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.HUD);

    fixed(26, 28, 'A / D  or  ← →   walk        SPACE   jump        R   start over', '#a49c8d');
    fixed(26, 44, '∞ PAINT    LEFT-CLICK  make a bridge    RIGHT-CLICK  wash ink — it MOVES, it never vanishes', '#a49c8d');
    // Every rule is visible before the player needs it. The objective states the
    // rule they are up against, never the click to make next.
    this.objective = fixed(26, 68, '', '#5c574f', 12);
    this.bayLabel = fixed(VIEW.w - 26, 28, '', '#a49c8d', 11, 1);
    // One transient line for the things that happen TO the player, so a
    // dissolved bridge or a wrong button is never silent. It carries its own
    // scrap of paper: the drawn ceiling rule runs straight through this line
    // and would otherwise read as a strikethrough.
    this.flash = fixed(26, 86, '', '#b4453a', 12);
    this.flash.setPadding(7, 4, 7, 4).setBackgroundColor('#f7f4ec').setAlpha(0);

    // Bay names live in the world, painted on the carriage lining.
    BAY_TITLES.forEach(({ x, title }) =>
      this.add
        .text(x, VIEW.h - 44, title, { fontFamily: mono, fontSize: '11px', color: '#a49c8d', letterSpacing: 2 })
        .setDepth(DEPTH.HUD),
    );
  }

  // A route's label sits over the end the player walks up to, not the middle:
  // the middle of a long bridge is further away than the arm can reach, and a
  // prompt you cannot act on is worse than no prompt at all.
  labelAnchor(region) {
    if (region.kind === KIND.ROUTE) return { x: region.x + 78, y: region.y - 48 };
    if (region.kind === KIND.BLOT) return { x: region.x + region.w / 2, y: region.y + region.h * 0.3 };
    return { x: region.x + region.w / 2, y: region.y + region.h * 0.28 };
  }

  buildTargetLabels() {
    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    this.targetLabels = {};
    this.car.state.regions.forEach((region) => {
      if (region.kind === KIND.SUMP) return;
      const isRoute = region.kind === KIND.ROUTE;
      const at = this.labelAnchor(region);
      const text = this.add
        .text(at.x, at.y, '', {
          fontFamily: mono,
          fontSize: isRoute ? '11px' : '10px',
          color: isRoute ? '#2f8c9e' : '#f7f4ec',
          align: 'center',
          lineSpacing: 3,
          letterSpacing: 1.4,
        })
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.GRAIN + 1);
      this.targetLabels[region.id] = text;
    });
  }

  updateTargetLabels() {
    const pointer = this.input.activePointer;
    const hovered = this.car.regionAt(pointer.worldX, pointer.worldY)?.id ?? null;
    this.car.state.regions.forEach((region) => {
      const label = this.targetLabels[region.id];
      if (!label) return;

      // A mark the player's verb would no longer change carries no prompt. A
      // made bridge announces itself by being solid, and a dissolved one gets
      // its label back — which is exactly the feedback that teaches the rule.
      if (!this.car.isLive(region.id)) {
        label.setVisible(false);
        label.setScale(1);
        return;
      }

      const active = hovered === region.id;
      const inReach =
        active && Phaser.Math.Distance.Between(this.walker.x, this.walker.y, pointer.worldX, pointer.worldY) <= REACH;

      // A target the player cannot touch yet must never read as a button. The
      // label says what is still needed instead, and dims, so "walk closer"
      // is learned from the world rather than discovered by clicking nothing.
      const isPaint = region.action === ACTION.PAINT;
      const reachable = this.regionReachable(region);
      label.setVisible(true);
      label.setText(
        reachable
          ? `${isPaint ? 'LEFT-CLICK' : 'RIGHT-CLICK'}\n${region.prompt}`
          : `STEP CLOSER TO\n${region.prompt}`,
      );
      label.setColor(isPaint ? '#2f8c9e' : '#f7f4ec');
      label.setAlpha(reachable ? (inReach ? 1 : 0.92) : 0.5);
      label.setScale(inReach ? 1.06 : 1);
    });
  }

  // Measured to the label's own anchor, not to the nearest edge of the mark.
  // The label is what the player aims at, so it must promise a click only when
  // a click THERE would actually work. Erring the other way — saying "step
  // closer" while a click at the very edge would have landed — costs nothing.
  regionReachable(region) {
    const at = this.labelAnchor(region);
    return Phaser.Math.Distance.Between(this.walker.x, this.walker.y, at.x, at.y) <= REACH;
  }

  // ================================================================= draw

  redraw() {
    const g = this.regionLayer;
    const ink = this.regionInk;
    g.clear();
    ink.clear();
    this.waterLayer.clear();
    const rnd = makeRandom(0x31a9);

    const pointer = this.input.activePointer;
    const hovered = this.car.regionAt(pointer.worldX, pointer.worldY)?.id ?? null;

    // Order matters: the grate and the channels lie under the marks they serve,
    // so a mark can never hide its own consequence.
    this.car.state.regions.forEach((region) => {
      if (region.kind === KIND.SUMP) this.drawSump(g, ink, rnd, region);
    });
    this.car.state.regions.forEach((region) => {
      if (region.drainsTo && this.car.isLive(region.id)) {
        this.drawChannel(ink, rnd, region, hovered === region.id);
      }
    });
    this.car.state.regions.forEach((region) => {
      if (region.kind === KIND.SEAL) this.drawSeal(g, ink, rnd, region);
      else if (region.kind === KIND.BLOT) this.drawBlot(g, ink, rnd, region);
      else if (region.kind === KIND.ROUTE) this.drawRoute(g, ink, rnd, region);
    });

    Object.entries(this.targetSolids).forEach(([id, object]) => {
      object.body.enable = this.car.isSolid(id) || this.car.isBlocking(id);
    });
    this.updateTargetLabels();
  }

  // The grate. Whatever reaches it is gone — the one place in the car that
  // destroys ink outright, and the thing bay A exists to demonstrate.
  drawSump(g, ink, rnd, region) {
    g.fillStyle(PAPER.boneBlack, 0.5);
    g.fillRect(region.x, region.y, region.w, region.h);
    ink.lineStyle(1.4, PAPER.graphite, 0.9);
    draftRect(ink, rnd, region.x, region.y, region.w, region.h, { overshoot: 3, jitter: 0.6 });
    ink.lineStyle(1.6, PAPER.sheetLow, 0.85);
    for (let x = region.x + 8; x < region.x + region.w - 4; x += 11) {
      draftLine(ink, rnd, x, region.y + 2, x, region.y + region.h - 2, { overshoot: 0, jitter: 0.4, segments: 2 });
    }
  }

  // The channel a mark's ink will travel the instant it is washed. Drawn as a
  // dashed run on the sheet with a target at the far end, and lit up on hover,
  // because the whole puzzle depends on the player seeing the consequence
  // BEFORE they commit to the wash.
  drawChannel(ink, rnd, region, lit) {
    const path = DRAIN_PATHS[region.id];
    if (!path || path.length < 2) return;
    const target = this.car.byId(region.drainsTo);
    const dissolves = target?.kind === KIND.ROUTE && target.painted;

    // A channel that is about to cross a bridge the player has made turns to
    // warning colour. Nothing is hidden and nothing is punished silently.
    const color = dissolves ? PAPER.fault : lit ? PAPER.cyan : PAPER.indigo;
    const alpha = lit || dissolves ? 0.85 : 0.34;
    ink.lineStyle(lit || dissolves ? 2 : 1.4, color, alpha);

    for (let i = 0; i < path.length - 1; i += 1) {
      const [x1, y1] = path[i];
      const [x2, y2] = path[i + 1];
      const length = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.max(1, Math.round(length / 13));
      for (let s = 0; s < steps; s += 1) {
        const a = s / steps;
        const b = Math.min(1, (s + 0.55) / steps);
        draftLine(
          ink,
          rnd,
          x1 + (x2 - x1) * a,
          y1 + (y2 - y1) * a,
          x1 + (x2 - x1) * b,
          y1 + (y2 - y1) * b,
          { overshoot: 0, jitter: 0.5, segments: 1 },
        );
      }
    }

    // Where it lands.
    const [ex, ey] = path[path.length - 1];
    ink.lineStyle(lit || dissolves ? 2 : 1.4, color, alpha);
    ink.strokeCircle(ex, ey, lit || dissolves ? 8 : 6);
    draftLine(ink, rnd, ex - 5, ey - 9, ex, ey - 2, { overshoot: 0, jitter: 0.4, segments: 1 });
    draftLine(ink, rnd, ex + 5, ey - 9, ex, ey - 2, { overshoot: 0, jitter: 0.4, segments: 1 });
  }

  // Ink standing where it landed. Taller than the player can jump, so it is a
  // problem to be solved rather than an obstacle to be dodged.
  drawBlot(g, ink, rnd, region) {
    if (!region.inked) {
      // The empty basin stays drawn, faintly. The player can see where this
      // bay's ink would end up before any of it has moved.
      ink.lineStyle(1.2, PAPER.graphiteFaint, 0.5);
      draftRect(ink, rnd, region.x, region.y + region.h - 26, region.w, 26, { overshoot: 4, jitter: 1.1 });
      return;
    }

    const remaining = Math.max(0, 1 - region.progress);
    const wetY = region.y + region.h * region.progress;
    g.fillStyle(PAPER.indigo, 0.12 + region.progress * 0.2);
    g.fillRect(region.x - 5, region.y - 5, region.w + 10, region.h + 10);
    if (remaining > 0.01) {
      paintedFill(g, rnd, region.x + 2, wetY + 2, region.w - 4, region.h * remaining - 4, PAPER.boneBlack, {
        alpha: 0.9,
      });
    }
    ink.lineStyle(2, PAPER.graphite, 0.9);
    draftRect(ink, rnd, region.x, region.y, region.w, region.h, { overshoot: 5, jitter: 1.6 });
    ink.lineStyle(2, PAPER.cyan, 0.66);
    draftLine(ink, rnd, region.x - 10, wetY, region.x + region.w + 10, wetY, {
      overshoot: 0,
      jitter: 1.2,
      segments: 5,
    });

    const at = this.labelAnchor(region);
    g.fillStyle(PAPER.bookCloth, 0.94);
    g.fillRoundedRect(region.x - 12, at.y - 5, region.w + 24, 44, 3);
    ink.lineStyle(1.3, PAPER.sheetHigh, 0.88);
    ink.strokeRoundedRect(region.x - 12, at.y - 5, region.w + 24, 44, 3);
  }

  drawSeal(g, ink, rnd, region) {
    const remaining = Math.max(0, 1 - region.progress);
    const wetY = region.y + region.h * region.progress;

    // A washed seal is *gone*, not merely switched off. Leaving the slab and
    // its now-empty label standing in the doorway made the car look blocked
    // when it was open, which is the one thing this drawing must never do.
    // What stays is a damp ghost and the torn lip the paper came away from.
    if (region.washed) {
      g.fillStyle(PAPER.indigo, 0.05);
      g.fillRect(region.x, region.y, region.w, region.h);
      ink.lineStyle(1.1, PAPER.deckle, 0.5);
      [region.x, region.x + region.w].forEach((x) =>
        draftLine(ink, rnd, x, region.y, x, region.y + region.h, {
          overshoot: 0,
          jitter: 2.4,
          segments: 9,
        }),
      );
      return;
    }

    // The blue wet fringe means WASH before the player has ever pressed the
    // button. The large dark sheet means physical obstruction, not decoration.
    g.fillStyle(PAPER.indigo, 0.14 + region.progress * 0.24);
    g.fillRect(region.x - 6, region.y - 6, region.w + 12, region.h + 12);
    if (remaining > 0.01) {
      paintedFill(g, rnd, region.x + 3, wetY + 2, region.w - 6, region.h * remaining - 4, PAPER.boneBlack, {
        alpha: 0.88,
      });
      hatchRect(ink, rnd, region.x + 6, wetY + 6, region.w - 12, Math.max(4, region.h * remaining - 12), {
        spacing: 10,
        alpha: 0.36,
        flip: true,
      });
    }
    ink.lineStyle(2.2, PAPER.graphite, 0.92);
    draftRect(ink, rnd, region.x, region.y, region.w, region.h, { overshoot: 6, jitter: 0.7 });
    ink.lineStyle(2, PAPER.cyan, 0.68);
    draftLine(ink, rnd, region.x - 12, wetY, region.x + region.w + 12, wetY, { overshoot: 0, jitter: 1.3, segments: 7 });

    const tagY = region.y + region.h * 0.25;
    g.fillStyle(PAPER.bookCloth, 0.94);
    g.fillRoundedRect(region.x + 8, tagY, region.w - 16, 50, 3);
    ink.lineStyle(1.3, PAPER.sheetHigh, 0.88);
    ink.strokeRoundedRect(region.x + 8, tagY, region.w - 16, 50, 3);
  }

  drawRoute(g, ink, rnd, region) {
    const made = region.painted;
    const progress = region.progress;
    const pathY = region.y;

    // A route starts as a conspicuous cyan blueprint, broad enough to see from
    // across the bay. It is an invitation, never a needle-thin line to trace.
    g.fillStyle(PAPER.sheetHigh, 0.64);
    g.fillRect(region.x, pathY, region.w, region.h);
    ink.lineStyle(2.3, made ? PAPER.indigo : PAPER.cyan, made ? 0.92 : 0.84);
    draftRect(ink, rnd, region.x, pathY, region.w, region.h, { overshoot: 5, jitter: 0.55 });
    for (let x = region.x + 10; x < region.x + region.w - 4; x += 28) {
      ink.lineStyle(2, made ? PAPER.sheetHigh : PAPER.cyan, made ? 0.72 : 0.62);
      draftLine(ink, rnd, x, pathY + 6, Math.min(x + 15, region.x + region.w - 5), pathY + 6, {
        overshoot: 0,
        jitter: 0.35,
        segments: 2,
      });
    }

    if (progress > 0) {
      const wave = made ? region.w : Math.max(26, region.w * progress);
      paintedFill(g, rnd, region.x, pathY, wave, region.h, PAPER.indigo, { alpha: 0.9 });
      g.fillStyle(PAPER.cyan, 0.35);
      g.fillRect(region.x, pathY + 3, wave, 4);
    }
    if (made) {
      hatchRect(ink, rnd, region.x + 3, pathY + region.h + 3, region.w - 6, 22, { spacing: 8, alpha: 0.42 });
    } else {
      // The tag follows the label to the end the player walks up to.
      const tagW = 196;
      const tagX = this.labelAnchor(region).x - tagW / 2;
      g.fillStyle(PAPER.sheetHigh, 0.94);
      g.fillRoundedRect(tagX, pathY - 54, tagW, 43, 3);
      ink.lineStyle(1.4, PAPER.cyan, 0.78);
      ink.strokeRoundedRect(tagX, pathY - 54, tagW, 43, 3);
    }
  }

  drawFigure() {
    const g = this.figure;
    const x = Math.round(this.walker.x);
    g.clear();

    const feetY = Math.round(this.walker.y + 29);
    const at = (dy) => feetY - dy;
    const legs = { y: feetY - 18, h: 18 };
    const torso = { y: feetY - 46, h: 28 };

    g.fillStyle(PAPER.figure, 1);
    g.fillRect(x - 6, legs.y, 5, legs.h);
    g.fillRect(x + 1, legs.y, 5, legs.h);
    g.fillRect(x - 8, torso.y, 16, torso.h);
    g.fillCircle(x, at(54), 8);

    const pointer = this.input.activePointer;
    const shoulderY = at(38);
    const angle = Math.atan2(pointer.worldY - shoulderY, pointer.worldX - x);
    const tipX = x + Math.cos(angle) * 30;
    const tipY = shoulderY + Math.sin(angle) * 30;

    g.lineStyle(3.2, PAPER.bookCloth, 1);
    g.beginPath();
    g.moveTo(x + Math.cos(angle) * 8, shoulderY + Math.sin(angle) * 8);
    g.lineTo(tipX, tipY);
    g.strokePath();

    // A single blue bead is the always-full brush. It stays visible even after
    // several paths so the player never mistakes paint for a consumable.
    g.fillStyle(PAPER.indigo, 0.95);
    g.fillCircle(tipX, tipY, 4.6);
    g.lineStyle(1.2, PAPER.sheetHigh, 0.8);
    g.strokeCircle(tipX, tipY, 4.6);
  }

  drawCursor() {
    const g = this.brushCursor;
    g.clear();
    const pointer = this.input.activePointer;
    const region = this.car.regionAt(pointer.worldX, pointer.worldY);
    if (!region) return;
    const inReach =
      Phaser.Math.Distance.Between(this.walker.x, this.walker.y, pointer.worldX, pointer.worldY) <= REACH;
    const color = region.action === ACTION.PAINT ? PAPER.cyan : PAPER.indigo;
    g.fillStyle(color, inReach ? 0.1 : 0.035);
    g.fillRect(region.x - 8, region.y - 8, region.w + 16, region.h + 16);
    g.lineStyle(inReach ? 2.4 : 1.4, inReach ? color : PAPER.graphiteFaint, inReach ? 0.96 : 0.48);
    g.strokeRect(region.x - 6, region.y - 6, region.w + 12, region.h + 12);
    if (inReach) {
      const radius = 11 + Math.sin(this.time.now / 90) * 1.5;
      g.lineStyle(1.8, color, 0.9);
      g.strokeCircle(pointer.worldX, pointer.worldY, radius);
    }
    if (!inReach) {
      g.lineStyle(1, PAPER.graphiteFaint, 0.35);
      g.lineBetween(this.walker.x, this.walker.y, pointer.worldX, pointer.worldY);
    }
  }

  // ================================================================ input

  stepBrush(dt) {
    const pointer = this.input.activePointer;
    if (!pointer.leftButtonDown() && !pointer.rightButtonDown()) return;
    const region = this.car.regionAt(pointer.worldX, pointer.worldY);
    if (!region) return;
    if (Phaser.Math.Distance.Between(this.walker.x, this.walker.y, pointer.worldX, pointer.worldY) > REACH) return;
    if (pointer.leftButtonDown()) this.car.paint(region.id, dt);
    else this.car.wash(region.id, dt);
  }

  stepPlayer() {
    const k = this.keys;
    const body = this.walker.body;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const jump = k.up.isDown || k.w.isDown || k.space.isDown;

    body.setVelocityX(left && !right ? -MOVE_SPEED : right && !left ? MOVE_SPEED : 0);

    if (jump && body.blocked.down) body.setVelocityY(JUMP_VELOCITY);

    // Falling through the paper is not death and never erases a washed barrier
    // or made bridge. The player returns to the start of the current bay.
    if (this.walker.y > VIEW.h + 90) {
      this.car.fell();
      const bay = this.walker.x > 1920 ? 1990 : this.walker.x > 960 ? 1000 : 250;
      this.walker.setPosition(bay, 340);
      body.setVelocity(0, 0);
    }

    if (this.walker.x > 2824) this.car.enterExit();
  }

  playCompletion() {
    // A rehearsal of the chapter's completion transformation: the sheet takes
    // colour for a moment as the train accepts what was made real, then drains
    // back to paper keeping only what the player painted — scar included.
    const bloom = this.add
      .rectangle(0, 0, VIEW.w, VIEW.h, PAPER.bookCloth, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.AIR + 1);
    this.tweens.add({
      targets: bloom,
      fillAlpha: { from: 0, to: 0.26 },
      duration: 520,
      yoyo: true,
      hold: 900,
      ease: 'Sine.easeInOut',
      onComplete: () => bloom.destroy(),
    });
  }

  bayId() {
    return this.walker.x > 1920 ? 'C' : this.walker.x > 960 ? 'B' : 'A';
  }

  flashMessage(text, color = '#b4453a') {
    if (!this.flash) return;
    this.tweens.killTweensOf(this.flash);
    this.flash.setText(text).setColor(color).setAlpha(1);
    this.tweens.add({ targets: this.flash, alpha: 0, delay: 1600, duration: 800 });
  }

  // The objective never names a click. It states the rule the player is
  // currently up against, because the puzzle is which order to act in and a
  // step-by-step instruction would simply solve it for them.
  objectiveText() {
    const car = this.car;
    if (car.state.complete) return 'THE VESTIBULE IS OPEN — YOU MADE THE ROUTE.';

    const bay = this.bayId();
    const here = car.state.regions.filter((region) => region.bay === bay);
    const standingInk = here.filter((region) => car.isBlocking(region.id));
    const madeRouteAtRisk = car.state.regions.find(
      (region) =>
        region.kind === KIND.ROUTE &&
        region.painted &&
        car.state.regions.some(
          (source) => source.drainsTo === region.id && car.isLive(source.id),
        ),
    );

    // The single most useful thing the car can tell you, and only when it is
    // actually true: something still holding ink will run over a bridge you made.
    if (madeRouteAtRisk) return 'INK STILL TO MOVE WILL RUN ACROSS A BRIDGE YOU MADE.';

    if (standingInk.length) return 'INK IS IN THE WAY. WASH IT AND WATCH WHERE IT GOES.';

    const route = here.find((region) => region.kind === KIND.ROUTE && !region.painted);
    if (route) return 'THE HOLE IS EMPTY OF INK — MAKE THE BRIDGE AND CROSS.';
    return 'WALK ON TOWARD THE VESTIBULE.';
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;

    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.scene.restart();
      return;
    }

    this.stepBrush(dt);
    this.stepPlayer();
    this.redraw();
    this.drawFigure();
    this.drawCursor();

    // One wash can raise several events at once — ink crossing a made bridge
    // both dissolves it and then drains away. Say the most important one, or
    // the consequence the player most needs to see gets overwritten by
    // bookkeeping in the same frame.
    const SAY = {
      'route-dissolved': ['THE INK TOOK YOUR BRIDGE WITH IT.', '#b4453a', 4],
      'wrong-tool': [null, '#c8892f', 3],
      'blot-formed': ['THE INK LANDED. IT IS STILL IN THE CAR.', '#46618c', 2],
      'ink-drained': ['THE INK WENT THROUGH THE HOLE. GONE.', '#6f9c8b', 1],
    };
    let best = null;
    this.car.drainEvents().forEach((event) => {
      if (event.type === 'car-complete') this.playCompletion();
      const say = SAY[event.type];
      if (!say) return;
      const text =
        event.type === 'wrong-tool'
          ? event.expected === ACTION.WASH
            ? 'THAT ONE IS INK — RIGHT-CLICK TO WASH IT.'
            : 'THAT ONE IS A BRIDGE — LEFT-CLICK TO PAINT IT.'
          : say[0];
      if (!best || say[2] > best.rank) best = { text, color: say[1], rank: say[2] };
    });
    if (best) this.flashMessage(best.text, best.color);

    this.objective.setText(this.objectiveText());
    this.bayLabel.setText(`BAY ${this.bayId()}`);

    this.motes.forEach((mote) => {
      mote.obj.x += mote.vx * dt;
      mote.obj.y += (mote.vy + Math.sin(time / 900 + mote.phase) * 5) * dt;
      if (mote.obj.x > WORLD.w + 4) mote.obj.x = -4;
      if (mote.obj.y < -4) mote.obj.y = VIEW.h + 4;
      if (mote.obj.y > VIEW.h + 4) mote.obj.y = -4;
    });
    if (this.grain) {
      this.grain.tilePositionX = this.cameras.main.scrollX * 0.4 + Math.sin(time / 5200) * 6;
      this.grain.tilePositionY = Math.cos(time / 6100) * 4;
    }
  }

  textState() {
    const pointer = this.input.activePointer;
    return {
      scene: 'PaintedCountry',
      bay: this.bayId(),
      objective: this.objectiveText(),
      gestureSeconds: ACTION_HOLD_SECONDS,
      ...this.car.snapshot(),
      player: {
        x: Math.round(this.walker.x),
        y: Math.round(this.walker.y),
        onGround: this.walker.body.blocked.down,
      },
      pointer: {
        x: Math.round(pointer.worldX),
        y: Math.round(pointer.worldY),
        over: this.car.regionAt(pointer.worldX, pointer.worldY)?.id ?? null,
      },
    };
  }
}

export const PAINTED_COUNTRY_VIEW = VIEW;
