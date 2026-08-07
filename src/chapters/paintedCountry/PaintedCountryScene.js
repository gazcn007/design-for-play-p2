import Phaser from 'phaser';
import {
  BAY_TITLES,
  CEILING_WALK,
  CEILING_Y,
  FLOAT,
  FLOOR_RUNS,
  FLOOR_Y,
  FOLDS,
  GAP_A,
  GAP_C,
  GRAVITY,
  INVERT_ZONE,
  JUMP_VELOCITY,
  LEDGE_B,
  MOVE_SPEED,
  RACK_Y,
  REACH,
  TROUGH_B,
  VIEW,
  WAINSCOT_Y,
  WINDOWS,
  WORLD,
} from './carLayout.js';
import { createPaintedCar, PIGMENT, SLOT_CAPACITY, SOLID_AT } from './paintedCarModel.js';
import { PAPER } from './paperPalette.js';
import {
  buildPaperGrain,
  draftLine,
  draftRect,
  hatchRect,
  makeRandom,
  paintedFill,
} from './paperSurface.js';

// Chapter 4 // THE PAINTED COUNTRY — three bays, seven beats.
//
// The carriage is an unfinished draughtsman's drawing on warm off-white paper,
// with the Painted Country folded out of the same sheet beyond the windows.
// PAINT turns a drawn construction line into a surface that bears weight; WASH
// turns a surface back into a line and returns its pigment to the brush. There
// is only so much pigment, so every road the player builds is taken out of a
// picture.
//
// This file owns pixels and input only. Every rule lives in paintedCarModel.js,
// which is pure and tested. If they disagree, the model is right.

const PIGMENT_COLOR = {
  [PIGMENT.BONE]: PAPER.boneBlack,
  [PIGMENT.INDIGO]: PAPER.indigo,
  [PIGMENT.VERDIGRIS]: PAPER.verdigris,
  [PIGMENT.CLOTH]: PAPER.bookCloth,
};

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
    this.inverted = false;

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

    // The basin the panel was painted over.
    g.lineStyle(1.6, PAPER.graphite, 0.9);
    draftRect(g, this.rnd, 1032, 292, 112, 90, { overshoot: 6 });
    draftLine(g, this.rnd, 1032, 382, 1144, 382, { overshoot: 5 });
    draftLine(g, this.rnd, 1052, 382, 1052, FLOOR_Y, { overshoot: 4 });
    draftLine(g, this.rnd, 1124, 382, 1124, FLOOR_Y, { overshoot: 4 });

    // The lamp the soot collects above.
    g.lineStyle(1.4, PAPER.graphiteSoft, 0.9);
    draftLine(g, this.rnd, 1338, RACK_Y, 1338, 196, { overshoot: 4 });
    g.strokeCircle(1338, 208, 13);

    // The supply pipe feeding the channel, and the channel's own bed.
    g.lineStyle(1.5, PAPER.graphite, 0.85);
    draftLine(g, this.rnd, 1144, 340, 1144, 404, { overshoot: 4 });
    draftLine(g, this.rnd, 1144, 404, 1210, 404, { overshoot: 4 });
    g.lineStyle(1.2, PAPER.graphiteFaint, 0.85);
    draftLine(g, this.rnd, 1210, 420, 1680, 424, { overshoot: 4, jitter: 1.1, segments: 12 });

    // The basin the water ends in, with the scuttle sitting on its floor.
    g.lineStyle(1.5, PAPER.graphite, 0.85);
    draftRect(g, this.rnd, 1640, 440, 130, 118, { overshoot: 5 });

    // The vestibule ledge out of the bay: drawn, and already real — the child
    // finished this one.
    g.fillStyle(PAPER.sheetLow, 1);
    g.fillRect(LEDGE_B.x, LEDGE_B.y, LEDGE_B.w, LEDGE_B.h);
    g.lineStyle(1.7, PAPER.graphite, 0.9);
    draftRect(g, this.rnd, LEDGE_B.x, LEDGE_B.y, LEDGE_B.w, LEDGE_B.h, { overshoot: 6 });
    hatchRect(g, this.rnd, LEDGE_B.x, LEDGE_B.y + LEDGE_B.h, LEDGE_B.w, 22, { spacing: 8, alpha: 0.4 });
  }

  buildBayC() {
    const g = this.graphics(DEPTH.FIXTURE);

    // BEAT 6's decoy. It is the most carefully drawn thing in the bay, because
    // the player has to want it before the paper is allowed to refuse it.
    const cd = { x: 2120, y: 300, w: 64, h: 128 };
    g.lineStyle(1.5, PAPER.graphite, 0.8);
    draftRect(g, this.rnd, cd.x, cd.y, cd.w, cd.h, { overshoot: 6 });
    draftRect(g, this.rnd, cd.x + 9, cd.y + 12, cd.w - 18, cd.h * 0.4, { overshoot: 3, jitter: 0.5 });
    draftRect(g, this.rnd, cd.x + 9, cd.y + cd.h * 0.55, cd.w - 18, cd.h * 0.36, { overshoot: 3, jitter: 0.5 });
    g.lineStyle(1.2, PAPER.graphiteSoft, 0.9);
    g.strokeCircle(cd.x + cd.w - 14, cd.y + cd.h * 0.52, 3.4);

    // The mural's frame and the wall it is painted on. The picture itself is
    // four regions, drawn from the model.
    g.lineStyle(1.4, PAPER.graphiteSoft, 0.85);
    draftRect(g, this.rnd, 2210, 190, 300, 250, { overshoot: 7 });

    // The ceiling door she drew up there, and the walkway it belongs to: both
    // stay pencil until the player agrees to believe them.
    g.lineStyle(1.2, PAPER.graphiteFaint, 0.9);
    draftLine(g, this.rnd, CEILING_WALK.x, CEILING_WALK.y + CEILING_WALK.h, CEILING_WALK.x + CEILING_WALK.w, CEILING_WALK.y + CEILING_WALK.h, {
      overshoot: 8,
      jitter: 0.9,
    });

    // The coupling frame.
    g.lineStyle(1.7, PAPER.graphite, 0.9);
    draftRect(g, this.rnd, 2782, 292, 74, 146, { overshoot: 6 });
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

    this.staticSolids = [
      ...FLOOR_RUNS.map((run) => solid(run.x, FLOOR_Y, run.w, 40)),
      solid(LEDGE_B.x, LEDGE_B.y, LEDGE_B.w, LEDGE_B.h),
    ];

    // Bodies that exist only when the model says the paint bears weight.
    this.paintedSolids = {};
    ['beam-left', 'beam-right', 'trough-plank', 'ceiling-door'].forEach((id) => {
      const region = this.car.byId(id);
      this.paintedSolids[id] = solid(region.x, region.y, region.w, region.h);
    });
    // The ceiling door is a doorway, not a floor; what you actually walk on up
    // there is the walkway it belongs to.
    this.ceilingWalk = solid(CEILING_WALK.x, CEILING_WALK.y, CEILING_WALK.w, CEILING_WALK.h);
    this.floatBody = solid(FLOAT.x, FLOAT.raisedY, FLOAT.w, FLOAT.h);
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
      ...Object.values(this.paintedSolids),
      this.ceilingWalk,
      this.floatBody,
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
    fixed(26, 44, 'HOLD LEFT-CLICK   paint        HOLD RIGHT-CLICK   wash', '#a49c8d');
    // The objective gets its own line. Sharing one with the controls meant the
    // two collided the moment a sentence ran long.
    this.objective = fixed(26, 68, '', '#5c574f', 12);
    this.bayLabel = fixed(VIEW.w - 26, 28, '', '#a49c8d', 11, 1);

    // Bay names live in the world, painted on the carriage lining.
    BAY_TITLES.forEach(({ x, title }) =>
      this.add
        .text(x, VIEW.h - 44, title, { fontFamily: mono, fontSize: '11px', color: '#a49c8d', letterSpacing: 2 })
        .setDepth(DEPTH.HUD),
    );
  }

  // ================================================================= draw

  redraw() {
    const g = this.regionLayer;
    const ink = this.regionInk;
    const water = this.waterLayer;
    g.clear();
    ink.clear();
    water.clear();
    const rnd = makeRandom(0x31a9);

    this.car.state.regions.forEach((region) => {
      if (region.hidden) return;
      const color = PIGMENT_COLOR[region.pigment] ?? PAPER.boneBlack;
      const solid = this.car.isSolid(region.id);

      // Anything that can be built is always visible as construction line, so
      // the player can see the plan before they can afford it.
      if (region.paintable) {
        ink.lineStyle(region.refusesPaint ? 1.1 : 1.6, region.refusesPaint ? PAPER.graphiteFaint : PAPER.graphite, region.refusesPaint ? 0.7 : 0.85);
        draftRect(ink, rnd, region.x, region.y, region.w, region.h, { overshoot: 7, jitter: 0.9 });
      }

      if (region.coverage <= 0.01) return;

      if (region.id === 'channel') {
        this.drawWater(water, rnd, region);
        return;
      }
      if (region.id === 'soot-spill' || region.id === 'settling-pan' || region.id === 'lamp-soot') {
        g.fillStyle(color, 0.42 * region.coverage);
        g.fillEllipse(region.x + region.w / 2, region.y + region.h * 0.6, region.w * (0.6 + region.coverage * 0.4), region.h * 0.7);
        return;
      }

      if (region.mural) {
        this.drawMuralPart(g, rnd, region, color);
        return;
      }
      if (region.refusesPaint) return;

      const filled = region.bearsWeight ? region.w * region.coverage : region.w;
      const alpha = region.bearsWeight ? 0.6 + region.coverage * 0.33 : 0.9 * region.coverage;
      paintedFill(g, rnd, region.x, region.y, filled, region.h, color, { alpha });

      if (region.bearsWeight && region.coverage < 1) {
        g.fillStyle(color, 0.3);
        g.fillEllipse(region.x + filled + 4, region.y + region.h / 2, 20, region.h + 3);
      }
      // A painted surface casts a hatched shadow; a drawn line does not. That
      // one difference is how the player learns what bears weight.
      if (solid) {
        hatchRect(ink, rnd, region.x + 2, region.y + region.h + 3, filled - 4, 22, { spacing: 7, alpha: 0.45 });
      }
    });

    // The float only exists once the basin has filled.
    const up = this.car.floatUp();
    this.floatBody.body.enable = up;
    if (up) {
      paintedFill(g, rnd, FLOAT.x, FLOAT.raisedY, FLOAT.w, FLOAT.h, PAPER.graphiteSoft, { alpha: 0.85 });
      water.fillStyle(PAPER.indigo, 0.3);
      water.fillRect(1640, FLOAT.raisedY + FLOAT.h, 130, 558 - FLOAT.raisedY - FLOAT.h);
    }

    Object.entries(this.paintedSolids).forEach(([id, object]) => {
      object.body.enable = this.car.isSolid(id);
    });
    this.ceilingWalk.body.enable = this.car.isSolid('ceiling-door');
    if (this.ceilingWalk.body.enable) {
      paintedFill(g, rnd, CEILING_WALK.x, CEILING_WALK.y, CEILING_WALK.w, CEILING_WALK.h, PAPER.boneBlack, {
        alpha: 0.9,
      });
    }
  }

  // The mural is a picture of the country the player has been watching through
  // the windows all car. Each part is drawn as the thing it is, so washing one
  // takes a recognisable piece of the memory away rather than clearing a
  // rectangle.
  drawMuralPart(g, rnd, region, color) {
    const a = region.coverage;
    const { x, y, w, h } = region;
    g.fillStyle(color, 0.86 * a);

    if (region.id === 'mural-hill') {
      g.beginPath();
      g.moveTo(x, y + h);
      g.lineTo(x + w * 0.3, y + h * 0.16);
      g.lineTo(x + w * 0.52, y + h);
      g.closePath();
      g.fillPath();
      g.beginPath();
      g.moveTo(x + w * 0.4, y + h);
      g.lineTo(x + w * 0.72, y);
      g.lineTo(x + w, y + h);
      g.closePath();
      g.fillPath();
      return;
    }
    if (region.id === 'mural-house') {
      const roof = h * 0.34;
      g.fillRect(x + w * 0.1, y + roof, w * 0.8, h - roof);
      g.beginPath();
      g.moveTo(x, y + roof);
      g.lineTo(x + w * 0.5, y);
      g.lineTo(x + w, y + roof);
      g.closePath();
      g.fillPath();
      // The doorway she stood in, left as paper.
      g.fillStyle(PAPER.sheetHigh, 0.8 * a);
      g.fillRect(x + w * 0.38, y + h * 0.55, w * 0.24, h * 0.45);
      return;
    }
    if (region.id === 'mural-river') {
      g.beginPath();
      g.moveTo(x, y + h * 0.5);
      for (let i = 0; i <= 8; i += 1) {
        g.lineTo(x + (w * i) / 8, y + h * (0.34 + 0.2 * Math.sin(i * 1.2)));
      }
      g.lineTo(x + w, y + h);
      g.lineTo(x, y + h);
      g.closePath();
      g.fillPath();
      return;
    }
    // The figure standing in the doorway.
    g.fillCircle(x + w * 0.5, y + h * 0.2, w * 0.16);
    g.fillRect(x + w * 0.34, y + h * 0.3, w * 0.32, h * 0.42);
    g.fillRect(x + w * 0.38, y + h * 0.7, w * 0.1, h * 0.3);
    g.fillRect(x + w * 0.54, y + h * 0.7, w * 0.1, h * 0.3);
  }

  drawWater(g, rnd, region) {
    const w = region.w * Math.min(1, region.coverage / SOLID_AT);
    g.fillStyle(PAPER.indigo, 0.45);
    g.fillRect(region.x, region.y, w, region.h);
    g.lineStyle(1.4, PAPER.indigo, 0.7);
    draftLine(g, rnd, region.x, region.y + 2, region.x + w, region.y + 2, { overshoot: 0, jitter: 1.4, segments: 12 });
    if (!this.car.flowing()) return;
    // Where the channel crosses the trough, the water falls.
    g.fillStyle(PAPER.indigo, 0.32);
    g.fillRect(TROUGH_B.x + 20, region.y + region.h, 12, 560 - region.y);
    g.fillRect(1640, region.y + region.h, 10, 440 - region.y);
  }

  drawFigure() {
    const g = this.figure;
    const x = Math.round(this.walker.x);
    g.clear();

    // The figure is built in one local space measured UP from the feet, then
    // the whole thing is flipped. Hand-flipping each rectangle is how the
    // inverted player ended up drawn lying on their side.
    const up = this.inverted ? -1 : 1;
    const feetY = Math.round(this.walker.y + 29 * up);
    const at = (dy) => feetY - dy * up;
    const band = (lo, hi) => ({ y: up > 0 ? feetY - hi : feetY + lo, h: hi - lo });

    const legs = band(0, 18);
    const torso = band(18, 46);

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

    // The two loaded pigments live on the ferrule, in world space. This chapter
    // never opens a panel.
    g.fillStyle(PAPER.graphiteFaint, 1);
    g.fillCircle(tipX, tipY, 4.6);
    this.car.state.brush.forEach((slot, i) => {
      if (!slot.pigment || slot.load <= 0.01) return;
      g.fillStyle(PIGMENT_COLOR[slot.pigment], 1);
      g.fillCircle(tipX - Math.cos(angle) * (9 + i * 7), tipY - Math.sin(angle) * (9 + i * 7), 1.2 + (slot.load / SLOT_CAPACITY) * 3);
    });
  }

  drawCursor() {
    const g = this.brushCursor;
    g.clear();
    const pointer = this.input.activePointer;
    const region = this.car.regionAt(pointer.worldX, pointer.worldY);
    if (!region) return;
    const inReach =
      Phaser.Math.Distance.Between(this.walker.x, this.walker.y, pointer.worldX, pointer.worldY) <= REACH;
    const can = inReach && (region.paintable || region.washable);
    g.lineStyle(1.4, can ? PAPER.cyan : PAPER.graphiteFaint, can ? 0.9 : 0.45);
    g.strokeRect(region.x - 4, region.y - 4, region.w + 8, region.h + 8);
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

    // BEAT 6. Inside the band under the door she drew on the ceiling, and only
    // once that door is real, the car has the drawing's gravity rather than the
    // player's. You do not get to correct someone's memory to make it
    // convenient; you get to walk on it.
    const inZone =
      this.car.isSolid('ceiling-door') &&
      this.walker.x > INVERT_ZONE.x &&
      this.walker.x < INVERT_ZONE.x + INVERT_ZONE.w;
    if (inZone !== this.inverted) {
      this.inverted = inZone;
      body.setGravityY(inZone ? -2 * GRAVITY : 0);
      body.setVelocityY(0);
    }

    const grounded = this.inverted ? body.blocked.up : body.blocked.down;
    if (jump && grounded) body.setVelocityY(this.inverted ? -JUMP_VELOCITY : JUMP_VELOCITY);

    // Falling through the paper is not death. There is simply nothing drawn
    // there, and the player is put back at the head of the bay still holding
    // whatever pigment they had.
    if (this.walker.y > VIEW.h + 90) {
      this.car.fell();
      const bay = this.walker.x > 1920 ? 1990 : this.walker.x > 960 ? 1000 : 250;
      this.walker.setPosition(bay, 340);
      body.setVelocity(0, 0);
      if (this.inverted) {
        this.inverted = false;
        body.setGravityY(0);
      }
    }
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

  objectiveText() {
    const car = this.car;
    if (car.state.complete) return 'the way on is open. it cost you the ' + (car.state.keptMural ? 'rest' : 'picture') + '.';
    const bay = this.bayId();

    if (bay === 'A') {
      if (!car.isSolid('beam-left')) return 'you took too much. the plank will not hold — paint it back.';
      if (car.isSolid('beam-right')) return 'cross to the washroom';
      if (car.totalLoad() <= 0.01 && car.freePigment('A') <= 0.01) {
        return 'the loose soot is gone. the only black left is under your feet.';
      }
      if (car.totalLoad() <= 0.01) return 'the brush is empty — wash pigment out of something';
      return 'paint the drawn beam until it will bear weight';
    }

    if (bay === 'B') {
      if (car.byId('indigo-bottle').hidden) return 'something is painted over the basin';
      if (car.floatUp()) return 'the scuttle is up. climb to the vestibule.';
      if (car.flowing()) return 'the water is running. it is taking the plank apart.';
      if (car.isSolid('trough-plank')) return 'cross first. then fill the channel.';
      return 'the trough is too wide to jump';
    }

    if (car.isDone('coupling-door')) return 'the coupling holds';
    if (!car.isSolid('ceiling-door')) {
      return 'the far end is unfinished. she drew a door up there, in the wrong place.';
    }
    if (car.totalLoad() <= 0.01) return 'the door needs one full brush. only the mural is left.';
    return 'paint the coupling';
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;

    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.scene.restart();
      return;
    }

    this.stepBrush(dt);
    this.car.update(dt);
    this.stepPlayer();
    this.redraw();
    this.drawFigure();
    this.drawCursor();

    this.car.drainEvents().forEach((event) => {
      if (event.type === 'bay-complete') this.playCompletion();
      if (event.type === 'paint-refused') this.showRefusal();
    });

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

  // The refusal has to be seen, not read: pigment beads on the correct door and
  // runs off it, leaving the paper as blank as it started.
  showRefusal() {
    if (this.refusing) return;
    this.refusing = true;
    const region = this.car.byId('correct-door');
    const bead = this.add
      .circle(region.x + region.w / 2, region.y + 14, 4, PAPER.boneBlack, 0.85)
      .setDepth(DEPTH.PAINT + 1);
    this.tweens.add({
      targets: bead,
      y: region.y + region.h + 26,
      alpha: { from: 0.85, to: 0 },
      duration: 700,
      ease: 'Quad.easeIn',
      onComplete: () => {
        bead.destroy();
        this.refusing = false;
      },
    });
  }

  textState() {
    const pointer = this.input.activePointer;
    return {
      scene: 'PaintedCountry',
      bay: this.bayId(),
      objective: this.objectiveText(),
      solidAt: SOLID_AT,
      slotCapacity: SLOT_CAPACITY,
      inverted: this.inverted,
      ...this.car.snapshot(),
      player: {
        x: Math.round(this.walker.x),
        y: Math.round(this.walker.y),
        onGround: this.inverted ? this.walker.body.blocked.up : this.walker.body.blocked.down,
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
