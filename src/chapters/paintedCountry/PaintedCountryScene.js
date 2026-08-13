import Phaser from 'phaser';
import {
  BAY_TITLES,
  BOARD,
  CEILING_Y,
  CELL,
  DOOR,
  eyeletAt,
  FLOOR_ROW,
  FLOOR_SPANS,
  FLOOR_Y,
  FOLDS,
  GLAZE_RECTS,
  GRID,
  JUMP_VELOCITY,
  MOVE_SPEED,
  PAINTINGS,
  RACK_Y,
  READ_RADIUS,
  REACH,
  SIGN,
  VIEW,
  WAINSCOT_Y,
  WINDOWS,
  WORLD,
} from './carLayout.js';
import { colOf, createPaintedCar, idx, rowOf } from './paintedCarModel.js';
import { PAPER } from './paperPalette.js';
import {
  buildPaperGrain,
  draftLine,
  draftRect,
  hatchRect,
  makeRandom,
  paintedFill,
} from './paperSurface.js';

// Chapter 4 // THE PAINTED COUNTRY — draw your own way through.
//
// The player paints and washes anywhere they can reach. Paint only takes where
// it touches paper that is already there, so wanting to be higher up means
// building a staircase and climbing it. Three pictures are hung too high to
// read from the floor, and the door at the end wants to know which sign was in
// all of them.
//
// This file owns pixels and input only. Every rule lives in paintedCarModel.js.

const DEPTH = {
  SHEET: 0,
  COUNTRY: 5,
  WALL: 10,
  GLAZE: 14,
  FIXTURE: 18,
  DRAWING: 22,
  PAINT: 30,
  BLOCK: 32,
  PICTURE: 36,
  BOARD: 37,
  CORD: 39,
  DOOR: 40,
  FIGURE: 44,
  CURSOR: 48,
  GRAIN: 60,
  AIR: 70,
  HUD: 90,
};

export class PaintedCountryScene extends Phaser.Scene {
  constructor() {
    super('PaintedCountry');
  }

  preload() {
    if (!this.cache.audio.exists('chapter4-drawing-music')) {
      this.load.audio('chapter4-drawing-music', '/assets/music/ch4/4.3_debussy_reflets_dans_leau.mp3');
    }
  }

  create() {
    this.music = this.sound.add('chapter4-drawing-music', { loop: true, volume: 0.28 });
    const playMusic = () => { if (!this.music?.isPlaying) this.music?.play(); };
    if (this.sound.locked) this.sound.once('unlocked', playMusic);
    else playMusic();
    this.input.once('pointerdown', playMusic);
    this.input.keyboard.once('keydown', playMusic);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music?.stop());
    this.advancingToStudio = false;
    this.rnd = makeRandom(0x9a17);
    this.motes = [];
    this.boilTargets = [];
    this.car = createPaintedCar();
    this.cellBodies = new Map();
    this.paintDirty = true;
    this.lastBrushCell = null;
    this.wasLeftDown = false;

    this.cameras.main.setBackgroundColor(PAPER.sheet);
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.physics.world.setBounds(0, -400, WORLD.w, WORLD.h + 900);

    this.buildSheet();
    this.buildCountry();
    this.buildCarriage();
    this.buildGrid();
    this.buildGlaze();
    this.buildGallery();
    this.buildBoard();
    this.buildDoor();
    this.buildSolids();
    this.buildPlayer();

    this.paintLayer = this.graphics(DEPTH.PAINT);
    this.blockLayer = this.graphics(DEPTH.BLOCK);
    this.cordLayer = this.graphics(DEPTH.CORD);
    this.brushCursor = this.graphics(DEPTH.CURSOR);
    this.doorLayer = this.graphics(DEPTH.DOOR);

    this.buildGrain();
    this.buildAir();
    this.buildHud();

    this.car.state.blocks.forEach((key) => this.addCellBody(key % GRID.w, Math.floor(key / GRID.w)));
    this.input.mouse?.disableContextMenu();

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

    FOLDS.forEach((x, i) => {
      g.fillStyle(i === 0 ? PAPER.sheetMid : PAPER.sheetLow, 0.4);
      g.fillRect(x, 0, WORLD.w - x, WORLD.h);
      g.lineStyle(1, PAPER.fold, 0.9);
      draftLine(g, this.rnd, x, 0, x, WORLD.h, { overshoot: 0, jitter: 1.8, segments: 16 });
      g.fillStyle(PAPER.kraft, 0.3);
      g.fillRect(x - 8, WAINSCOT_Y - 34, 16, 78);
    });

  }

  // The squared paper the child ruled before she drew anything. It sits above
  // the carriage fills so it reads everywhere the player can actually build,
  // and it is faint enough to be a guide rather than graph paper.
  buildGrid() {
    const g = this.graphics(DEPTH.WALL + 2);
    g.lineStyle(1, PAPER.graphiteFaint, 0.13);
    const top = CEILING_Y;
    for (let cx = 0; cx <= GRID.w; cx += 1) g.lineBetween(cx * CELL, top, cx * CELL, FLOOR_Y);
    for (let cy = Math.ceil(top / CELL); cy <= FLOOR_ROW; cy += 1) {
      g.lineBetween(0, cy * CELL, WORLD.w, cy * CELL);
    }
  }

  buildCountry() {
    const container = this.add.container(0, 0).setDepth(DEPTH.COUNTRY);
    const g = this.add.graphics();
    container.add(g);

    g.fillStyle(PAPER.sheetHigh, 1);
    g.fillRect(0, 100, WORLD.w, 230);
    for (let x = -60; x < WORLD.w; x += 330) this.foldedHill(g, x, 190, 380, 130, PAPER.sheet, PAPER.sheetMid);
    for (let x = 140; x < WORLD.w; x += 300) this.foldedHill(g, x, 220, 320, 106, PAPER.sheetMid, PAPER.sheetLow);

    g.lineStyle(1.5, PAPER.graphiteFaint, 0.95);
    for (let x = 0; x < WORLD.w; x += 420) {
      draftLine(g, this.rnd, x, 300, x + 420, 284, { overshoot: 0, jitter: 2.6, segments: 12 });
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
  }

  buildCarriage() {
    const g = this.graphics(DEPTH.WALL);
    g.fillStyle(PAPER.sheetLow, 1);
    g.fillRect(0, 0, WORLD.w, CEILING_Y);
    g.fillStyle(PAPER.sheetMid, 1);
    g.fillRect(0, WAINSCOT_Y, WORLD.w, FLOOR_Y - WAINSCOT_Y);

    g.fillStyle(PAPER.sheetLow, 1);
    FLOOR_SPANS.forEach((span) =>
      g.fillRect(span.from * CELL, FLOOR_Y, (span.to - span.from) * CELL, WORLD.h - FLOOR_Y),
    );
    FLOOR_SPANS.forEach((span) =>
      hatchRect(g, this.rnd, span.from * CELL, FLOOR_Y, (span.to - span.from) * CELL, 46, {
        spacing: 17,
        alpha: 0.2,
        flip: true,
      }),
    );

    // The torn edges of the two holes.
    const holes = [];
    for (let i = 0; i < FLOOR_SPANS.length - 1; i += 1) {
      holes.push({ x: FLOOR_SPANS[i].to * CELL, w: (FLOOR_SPANS[i + 1].from - FLOOR_SPANS[i].to) * CELL });
    }
    holes.forEach((hole) => {
      const h = this.graphics(DEPTH.WALL + 1);
      h.fillStyle(PAPER.sheetHigh, 1);
      h.fillRect(hole.x, FLOOR_Y, hole.w, WORLD.h - FLOOR_Y);
      h.lineStyle(1.6, PAPER.deckle, 0.95);
      [hole.x, hole.x + hole.w].forEach((x) =>
        draftLine(h, this.rnd, x, FLOOR_Y, x, WORLD.h, { overshoot: 0, jitter: 2.6, segments: 10 }),
      );
    });

    const draw = this.graphics(DEPTH.DRAWING);
    const boil = () => {
      const rnd = makeRandom(0x5eed + Math.floor(this.time.now / 83));
      draw.clear();
      draw.lineStyle(1.9, PAPER.graphite, 0.94);
      [CEILING_Y, WAINSCOT_Y].forEach((y) =>
        draftLine(draw, rnd, 0, y, WORLD.w, y, { overshoot: 0, jitter: 1.1, segments: 40 }),
      );
      FLOOR_SPANS.forEach((span) =>
        draftLine(draw, rnd, span.from * CELL, FLOOR_Y, span.to * CELL, FLOOR_Y, {
          overshoot: 0,
          jitter: 1.2,
          segments: 12,
        }),
      );
      draw.lineStyle(1.6, PAPER.graphite, 0.9);
      WINDOWS.forEach((win) => draftRect(draw, rnd, win.x, win.y, win.w, win.h, { overshoot: 7, jitter: 0.8 }));
      draw.lineStyle(1.3, PAPER.graphiteSoft, 0.9);
      draftLine(draw, rnd, 20, RACK_Y, WORLD.w - 20, RACK_Y, { overshoot: 0, jitter: 0.8, segments: 40 });
    };
    boil();
    this.boilTargets.push(boil);
  }

  // Varnished paper: visibly glossy, and paint slides off it.
  buildGlaze() {
    const g = this.graphics(DEPTH.GLAZE);
    GLAZE_RECTS.forEach((rect) => {
      const x = rect.col * CELL;
      const y = rect.row * CELL;
      const w = rect.cols * CELL;
      const h = rect.rows * CELL;
      g.fillStyle(PAPER.sheetHigh, 0.55);
      g.fillRect(x, y, w, h);
      g.lineStyle(1.3, PAPER.deckle, 0.75);
      draftRect(g, this.rnd, x, y, w, h, { overshoot: 4, jitter: 1.2 });
      // Diagonal sheen, so it reads as varnish rather than as a wall.
      g.lineStyle(2, PAPER.sheetHigh, 0.85);
      for (let i = -h; i < w; i += 26) {
        g.lineBetween(x + i, y + h, x + i + h, y);
      }
      g.lineStyle(1, PAPER.graphiteFaint, 0.3);
      for (let i = -h; i < w; i += 26) {
        g.lineBetween(x + i + 2, y + h, x + i + h + 2, y);
      }
    });
  }

  // =========================================================== the gallery

  buildGallery() {
    const g = this.graphics(DEPTH.PICTURE);
    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    this.pictureLabels = {};

    PAINTINGS.forEach((picture) => {
      // Frame.
      g.fillStyle(PAPER.sheetHigh, 1);
      g.fillRect(picture.x, picture.y, picture.w, picture.h);
      g.lineStyle(2.6, PAPER.graphite, 0.92);
      draftRect(g, this.rnd, picture.x, picture.y, picture.w, picture.h, { overshoot: 5, jitter: 0.6 });
      g.lineStyle(1.2, PAPER.graphiteSoft, 0.7);
      draftRect(g, this.rnd, picture.x + 7, picture.y + 7, picture.w - 14, picture.h - 14, {
        overshoot: 2,
        jitter: 0.5,
      });
      // A dark night ground so the signs read.
      g.fillStyle(PAPER.indigo, 0.14);
      g.fillRect(picture.x + 9, picture.y + 9, picture.w - 18, picture.h - 18);

      // The signs, spaced across the picture.
      const slots = picture.signs.length;
      picture.signs.forEach((sign, i) => {
        const sx = picture.x + (picture.w * (i + 0.5)) / slots;
        const sy = picture.y + picture.h * 0.5;
        this.drawSign(g, sign, sx, sy, 20, PAPER.graphite, 0.95);
      });

      // The hanging wire.
      g.lineStyle(1.1, PAPER.graphiteSoft, 0.8);
      g.lineBetween(picture.x + picture.w / 2, picture.y, picture.x + picture.w / 2 - 16, RACK_Y);
      g.lineBetween(picture.x + picture.w / 2, picture.y, picture.x + picture.w / 2 + 16, RACK_Y);

      this.add
        .text(picture.x + picture.w / 2, picture.y + picture.h + 7, picture.title, {
          fontFamily: mono,
          fontSize: '10px',
          color: '#8d8579',
          letterSpacing: 1.4,
        })
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.PICTURE);

      // "TOO FAR TO SEE" until the player gets up to it.
      const hint = this.add
        .text(picture.x + picture.w / 2, picture.y - 20, '', {
          fontFamily: mono,
          fontSize: '10px',
          color: '#2f8c9e',
          letterSpacing: 1.4,
        })
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.PICTURE);
      this.pictureLabels[picture.id] = hint;
    });
  }

  // The four signs, drawn rather than typed so they read at a glance and match
  // the rest of the car's hand.
  drawSign(g, sign, cx, cy, size, color, alpha = 1) {
    const r = size / 2;
    if (sign === SIGN.MOON) {
      // A crescent: an ink disc with a paper disc bitten out of it.
      g.fillStyle(color, alpha);
      g.fillCircle(cx, cy, r);
      g.fillStyle(PAPER.sheetHigh, 1);
      g.fillCircle(cx + r * 0.52, cy - r * 0.24, r * 0.92);
      return;
    }
    if (sign === SIGN.RIVER) {
      g.lineStyle(2.2, color, alpha);
      for (let row = -1; row <= 1; row += 1) {
        const y = cy + row * r * 0.55;
        g.beginPath();
        g.moveTo(cx - r, y);
        for (let s = 0; s <= 8; s += 1) {
          const t = s / 8;
          g.lineTo(cx - r + t * size, y + Math.sin(t * Math.PI * 2) * r * 0.24);
        }
        g.strokePath();
      }
      return;
    }
    if (sign === SIGN.STAR) {
      g.fillStyle(color, alpha);
      g.beginPath();
      for (let p = 0; p < 10; p += 1) {
        const rad = p % 2 === 0 ? r : r * 0.42;
        const a = -Math.PI / 2 + (p * Math.PI) / 5;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (p === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
      return;
    }
    // HOUSE
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(cx - r, cy - r * 0.05);
    g.lineTo(cx, cy - r);
    g.lineTo(cx + r, cy - r * 0.05);
    g.closePath();
    g.fillPath();
    g.fillRect(cx - r * 0.68, cy - r * 0.05, r * 1.36, r * 1.05);
  }

  // ======================================================= the thread board

  cordColor(pairId) {
    if (pairId === 'amber') return PAPER.amber;
    if (pairId === 'cyan') return PAPER.cyan;
    return PAPER.fault;
  }

  buildBoard() {
    const g = this.graphics(DEPTH.BOARD);
    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

    // The card it is all punched into.
    g.fillStyle(PAPER.manilla, 0.96);
    g.fillRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h);
    g.lineStyle(2.4, PAPER.graphite, 0.92);
    draftRect(g, this.rnd, BOARD.x, BOARD.y, BOARD.w, BOARD.h, { overshoot: 5, jitter: 0.7 });
    g.lineStyle(1, PAPER.graphiteFaint, 0.5);
    draftRect(g, this.rnd, BOARD.x + 9, BOARD.y + 9, BOARD.w - 18, BOARD.h - 18, {
      overshoot: 2,
      jitter: 0.5,
    });

    // Every hole in the card, then the torn ones, then the coloured ends.
    for (let c = 0; c < BOARD.cols; c += 1) {
      for (let r = 0; r < BOARD.rows; r += 1) {
        const at = eyeletAt(c, r);
        if (this.car.isTorn(c, r)) {
          // A hole ripped right through the card — no cord can pass.
          g.fillStyle(PAPER.sheetHigh, 1);
          g.fillCircle(at.x, at.y, 9);
          g.lineStyle(1.6, PAPER.deckle, 0.95);
          for (let i = 0; i < 9; i += 1) {
            const a0 = (i / 9) * Math.PI * 2;
            const a1 = ((i + 1) / 9) * Math.PI * 2;
            const r0 = 8 + this.rnd() * 3;
            const r1 = 8 + this.rnd() * 3;
            g.lineBetween(
              at.x + Math.cos(a0) * r0,
              at.y + Math.sin(a0) * r0,
              at.x + Math.cos(a1) * r1,
              at.y + Math.sin(a1) * r1,
            );
          }
          continue;
        }
        g.lineStyle(1.4, PAPER.graphiteSoft, 0.8);
        g.strokeCircle(at.x, at.y, 5.5);
      }
    }

    BOARD.pairs.forEach((pair) => {
      [pair.a, pair.b].forEach(([c, r]) => {
        const at = eyeletAt(c, r);
        g.fillStyle(this.cordColor(pair.id), 0.95);
        g.fillCircle(at.x, at.y, 9);
        g.lineStyle(1.4, PAPER.graphite, 0.85);
        g.strokeCircle(at.x, at.y, 9);
        g.fillStyle(PAPER.manilla, 1);
        g.fillCircle(at.x, at.y, 2.6);
      });
    });

    this.add
      .text(BOARD.x + BOARD.w / 2, BOARD.y - 30, 'THREAD EACH PAIR.\nNO TWO CORDS THROUGH ONE HOLE.', {
        fontFamily: mono,
        fontSize: '10px',
        color: '#5c574f',
        align: 'center',
        lineSpacing: 3,
        letterSpacing: 1.2,
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.BOARD);
  }

  boardCellAt(wx, wy) {
    if (wx < BOARD.x || wx > BOARD.x + BOARD.w || wy < BOARD.y || wy > BOARD.y + BOARD.h) return null;
    const c = Math.round((wx - BOARD.x - BOARD.pad) / BOARD.pitch);
    const r = Math.round((wy - BOARD.y - BOARD.pad) / BOARD.pitch);
    if (!this.car.inBoard(c, r)) return null;
    const at = eyeletAt(c, r);
    // Only count as "on a hole" if the pointer is genuinely near one, so a
    // drag across the card cannot skip diagonally between holes.
    if (Phaser.Math.Distance.Between(wx, wy, at.x, at.y) > BOARD.pitch * 0.62) return null;
    return { c, r };
  }

  drawCords() {
    const g = this.cordLayer;
    g.clear();
    const solved = this.car.boardSolved();

    BOARD.pairs.forEach((pair) => {
      const cord = this.car.state.board.cords[pair.id];
      if (!cord || cord.length < 2) return;
      const color = this.cordColor(pair.id);
      const done = this.car.cordComplete(pair.id);

      // A soft shadow under the cord so it reads as thread lying on the card.
      g.lineStyle(7, PAPER.graphite, 0.14);
      g.beginPath();
      cord.forEach(([c, r], i) => {
        const at = eyeletAt(c, r);
        if (i === 0) g.moveTo(at.x, at.y + 2);
        else g.lineTo(at.x, at.y + 2);
      });
      g.strokePath();

      g.lineStyle(done ? 5.5 : 4, color, done ? 0.95 : 0.7);
      g.beginPath();
      cord.forEach(([c, r], i) => {
        const at = eyeletAt(c, r);
        if (i === 0) g.moveTo(at.x, at.y);
        else g.lineTo(at.x, at.y);
      });
      g.strokePath();
    });

    if (solved) {
      g.lineStyle(2, PAPER.verdigris, 0.85);
      draftRect(g, makeRandom(0x77aa), BOARD.x + 4, BOARD.y + 4, BOARD.w - 8, BOARD.h - 8, {
        overshoot: 3,
        jitter: 0.8,
      });
    }
  }

  // ============================================================== the door

  buildDoor() {
    const g = this.graphics(DEPTH.DOOR - 1);
    g.fillStyle(PAPER.sheetMid, 1);
    g.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
    g.lineStyle(2.6, PAPER.graphite, 0.94);
    draftRect(g, this.rnd, DOOR.x, DOOR.y, DOOR.w, DOOR.h, { overshoot: 6, jitter: 0.7 });
    hatchRect(g, this.rnd, DOOR.x + 8, DOOR.y + 8, DOOR.w - 16, DOOR.h - 16, {
      spacing: 15,
      alpha: 0.12,
    });

    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    this.add
      .text(DOOR.x + DOOR.w / 2, DOOR.y - 34, 'WHICH SIGN WAS IN\nEVERY PICTURE?', {
        fontFamily: mono,
        fontSize: '11px',
        color: '#5c574f',
        align: 'center',
        lineSpacing: 3,
        letterSpacing: 1.4,
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.DOOR);
  }

  // ============================================================== physics

  buildSolids() {
    this.solids = this.add.group();

    const solid = (x, y, w, h) => {
      const object = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0);
      this.physics.add.existing(object, true);
      this.solids.add(object);
      return object;
    };

    FLOOR_SPANS.forEach((span) =>
      solid(span.from * CELL, FLOOR_Y, (span.to - span.from) * CELL, WORLD.h - FLOOR_Y),
    );
    // The ends of the sheet are walls, not cliffs.
    solid(-24, -400, 24, WORLD.h + 500);
    solid(WORLD.w, -400, 24, WORLD.h + 500);
  }

  addCellBody(cx, cy) {
    const key = idx(cx, cy);
    if (this.cellBodies.has(key)) return;
    const object = this.add.rectangle(cx * CELL + CELL / 2, cy * CELL + CELL / 2, CELL, CELL, 0xffffff, 0);
    this.physics.add.existing(object, true);
    this.solids.add(object);
    this.cellBodies.set(key, object);
  }

  removeCellBody(cx, cy) {
    const key = idx(cx, cy);
    const object = this.cellBodies.get(key);
    if (!object) return;
    this.solids.remove(object, true, true);
    this.cellBodies.delete(key);
  }

  buildPlayer() {
    this.walker = this.add.rectangle(200, 360, 16, 58, 0xffffff, 0);
    this.physics.add.existing(this.walker);
    this.walker.body.setCollideWorldBounds(false);
    this.physics.add.collider(this.walker, this.solids);

    this.figure = this.graphics(DEPTH.FIGURE);
    this.cameras.main.startFollow(this.walker, true, 0.1, 0.12);
    this.cameras.main.setDeadzone(240, 160);

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

  // ============================================================== surface

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
    for (let i = 0; i < 26; i += 1) {
      const mote = this.add
        .circle(this.rnd() * WORLD.w, this.rnd() * VIEW.h, this.rnd() > 0.75 ? 1.7 : 1.1, PAPER.graphiteSoft, 0.5)
        .setDepth(DEPTH.AIR);
      this.motes.push({ obj: mote, vx: 4 + this.rnd() * 9, vy: -2 + this.rnd() * 4, phase: this.rnd() * 6.28 });
    }
  }

  buildHud() {
    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    const fixed = (x, y, text, color, size = 11, originX = 0, originY = 0) =>
      this.add
        .text(x, y, text, { fontFamily: mono, fontSize: `${size}px`, color, letterSpacing: 2 })
        .setOrigin(originX, originY)
        .setScrollFactor(0)
        .setDepth(DEPTH.HUD);

    // A torn strip of paper laid over the top of the drawing. Without it the
    // controls sat directly on the carriage's hatching and every line of text
    // fought with a drafted one behind it.
    const band = this.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD - 2);
    band.fillStyle(0xf3efe4, 0.94);
    band.fillRect(0, 0, VIEW.w, 74);
    band.lineStyle(1.4, 0xd8cfb9, 0.9);
    band.lineBetween(0, 74, VIEW.w, 74);

    fixed(24, 14, 'A / D  ←→  walk     SPACE  jump     R  restart', '#a49c8d');
    fixed(24, 30, 'HOLD LEFT  draw paper (∞)      HOLD RIGHT  wash it away', '#a49c8d');
    this.objective = fixed(24, 50, '', '#4a4640', 12);
    this.bayLabel = fixed(VIEW.w - 24, 14, '', '#a49c8d', 11, 1);

    this.flash = fixed(24, 86, '', '#b4453a', 12);
    this.flash.setPadding(8, 5, 8, 5).setBackgroundColor('#f7f4ec').setAlpha(0);

    // The notebook. What the player has actually seen, never the answer. It
    // lives bottom-right so it never lands on the bay name or the objective.
    this.notebook = fixed(VIEW.w - 20, VIEW.h - 18, '', '#4a4640', 11, 1, 1);
    this.notebook.setPadding(11, 9, 11, 9).setBackgroundColor('#ece5d5').setLineSpacing(4).setAlpha(0);

    // Bay names belong to the world, painted under the floor line where there
    // is nothing else to collide with.
    BAY_TITLES.forEach(({ x, title }) =>
      this.add
        .text(x + 28, FLOOR_Y + 22, title, {
          fontFamily: mono,
          fontSize: '11px',
          color: '#a49c8d',
          letterSpacing: 2,
        })
        .setDepth(DEPTH.WALL + 2),
    );
  }

  flashMessage(text, color = '#b4453a') {
    if (!this.flash) return;
    this.tweens.killTweensOf(this.flash);
    this.flash.setText(text).setColor(color).setAlpha(1);
    this.tweens.add({ targets: this.flash, alpha: 0, delay: 1700, duration: 800 });
  }

  // ================================================================= draw

  redrawPaint() {
    const g = this.paintLayer;
    const b = this.blockLayer;
    g.clear();
    b.clear();
    const rnd = makeRandom(0x31a9);

    this.car.state.painted.forEach((key) => {
      const cx = (key % GRID.w) * CELL;
      const cy = Math.floor(key / GRID.w) * CELL;
      paintedFill(g, rnd, cx, cy, CELL, CELL, PAPER.indigo, { alpha: 0.92 });
    });
    // One pass of edge ink so a drawn shape reads as a made thing, not a blob.
    g.lineStyle(1.4, PAPER.boneBlack, 0.4);
    this.car.state.painted.forEach((key) => {
      const cx = (key % GRID.w);
      const cy = Math.floor(key / GRID.w);
      if (!this.car.isPainted(cx, cy - 1)) g.lineBetween(cx * CELL, cy * CELL, cx * CELL + CELL, cy * CELL);
      if (!this.car.isPainted(cx, cy + 1)) {
        g.lineBetween(cx * CELL, cy * CELL + CELL, cx * CELL + CELL, cy * CELL + CELL);
      }
      if (!this.car.isPainted(cx - 1, cy)) g.lineBetween(cx * CELL, cy * CELL, cx * CELL, cy * CELL + CELL);
      if (!this.car.isPainted(cx + 1, cy)) {
        g.lineBetween(cx * CELL + CELL, cy * CELL, cx * CELL + CELL, cy * CELL + CELL);
      }
    });

    this.car.state.blocks.forEach((key) => {
      const cx = (key % GRID.w) * CELL;
      const cy = Math.floor(key / GRID.w) * CELL;
      paintedFill(b, rnd, cx, cy, CELL, CELL, PAPER.boneBlack, { alpha: 0.88 });
      b.lineStyle(1, PAPER.graphite, 0.5);
      b.strokeRect(cx, cy, CELL, CELL);
    });
  }

  drawFigure() {
    const g = this.figure;
    const x = Math.round(this.walker.x);
    g.clear();
    const feetY = Math.round(this.walker.y + 29);
    const at = (dy) => feetY - dy;
    g.fillStyle(PAPER.figure, 1);
    g.fillRect(x - 6, feetY - 18, 5, 18);
    g.fillRect(x + 1, feetY - 18, 5, 18);
    g.fillRect(x - 8, feetY - 46, 16, 28);
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
    g.fillStyle(PAPER.indigo, 0.95);
    g.fillCircle(tipX, tipY, 4.6);
  }

  // The cursor is the whole tutorial: it shows the cell you would fill, and
  // whether the car will let you.
  drawCursor() {
    const g = this.brushCursor;
    g.clear();
    const pointer = this.input.activePointer;
    const cx = colOf(pointer.worldX);
    const cy = rowOf(pointer.worldY);
    if (!this.car.inBounds(cx, cy)) return;

    const inReach = this.pointerInReach();
    const panel = this.panelAt(pointer.worldX, pointer.worldY);

    // Always show the arm's limit, so "too far" is never a mystery.
    g.lineStyle(1, PAPER.graphiteFaint, inReach ? 0.18 : 0.4);
    g.strokeCircle(this.walker.x, this.walker.y, REACH);

    if (this.overBoard(pointer.worldX, pointer.worldY)) {
      const hole = this.boardCellAt(pointer.worldX, pointer.worldY);
      if (!hole) return;
      const at = eyeletAt(hole.c, hole.r);
      const torn = this.car.isTorn(hole.c, hole.r);
      const color = torn ? PAPER.fault : inReach ? PAPER.cyan : PAPER.graphiteFaint;
      g.lineStyle(2.4, color, inReach ? 0.95 : 0.4);
      g.strokeCircle(at.x, at.y, 13);
      return;
    }

    if (panel) {
      g.lineStyle(2.4, inReach ? PAPER.cyan : PAPER.graphiteFaint, inReach ? 0.95 : 0.4);
      g.strokeRect(panel.x - 4, panel.y - 4, panel.w + 8, panel.h + 8);
      return;
    }

    const canPaint = this.car.canPaint(cx, cy);
    const canWash = this.car.canWash(cx, cy);
    const refusal = this.car.paintRefusal(cx, cy);

    let color = PAPER.graphiteFaint;
    let alpha = 0.35;
    if (!inReach) {
      color = PAPER.graphiteFaint;
      alpha = 0.3;
    } else if (canWash) {
      color = PAPER.bookCloth;
      alpha = 0.85;
    } else if (canPaint) {
      color = PAPER.cyan;
      alpha = 0.95;
    } else if (refusal === 'varnished') {
      color = PAPER.fault;
      alpha = 0.7;
    }

    g.lineStyle(2.2, color, alpha);
    g.strokeRect(cx * CELL, cy * CELL, CELL, CELL);
    if (inReach && canPaint) {
      g.fillStyle(PAPER.cyan, 0.16);
      g.fillRect(cx * CELL, cy * CELL, CELL, CELL);
    }
  }

  // ================================================================ input

  pointerInReach() {
    const pointer = this.input.activePointer;
    return (
      Phaser.Math.Distance.Between(this.walker.x, this.walker.y, pointer.worldX, pointer.worldY) <= REACH
    );
  }

  panelAt(wx, wy) {
    return DOOR.panels.find(
      (panel) => wx >= panel.x && wx <= panel.x + panel.w && wy >= panel.y && wy <= panel.y + panel.h,
    );
  }

  // Painting a cell the player is standing inside would shove them out of it,
  // so the brush politely refuses to draw on top of its own painter.
  overlapsPlayer(cx, cy) {
    const body = this.walker.body;
    return !(
      cx * CELL >= body.right ||
      cx * CELL + CELL <= body.x ||
      cy * CELL >= body.bottom ||
      cy * CELL + CELL <= body.y
    );
  }

  applyBrush(cx, cy, wash) {
    if (!this.car.inBounds(cx, cy)) return;
    if (wash) {
      if (this.car.wash(cx, cy)) {
        this.removeCellBody(cx, cy);
        this.paintDirty = true;
      }
      return;
    }
    if (this.overlapsPlayer(cx, cy)) return;
    if (this.car.paint(cx, cy)) {
      this.addCellBody(cx, cy);
      this.paintDirty = true;
    }
  }

  overBoard(wx, wy) {
    return wx >= BOARD.x && wx <= BOARD.x + BOARD.w && wy >= BOARD.y && wy <= BOARD.y + BOARD.h;
  }

  stepBrush() {
    const pointer = this.input.activePointer;
    const left = pointer.leftButtonDown();
    const right = pointer.rightButtonDown();
    const freshLeft = left && !this.wasLeftDown;
    const inReach = this.pointerInReach();

    // Letting go always tidies a half-drawn cord away.
    if (!left && this.car.state.board.drawing) this.car.boardRelease();

    // The thread board takes the mouse before the brush does, and the whole
    // card is off limits to paint so a stroke can never bury the lock.
    if (this.overBoard(pointer.worldX, pointer.worldY)) {
      const hole = this.boardCellAt(pointer.worldX, pointer.worldY);
      if (hole && inReach) {
        if (right) this.car.boardClearAt(hole.c, hole.r);
        else if (freshLeft) this.car.boardBegin(hole.c, hole.r);
        else if (left) this.car.boardExtend(hole.c, hole.r);
      }
      this.wasLeftDown = left;
      this.lastBrushCell = null;
      return;
    }

    // A fresh left click on a door sign is an answer, not a brush stroke.
    if (freshLeft) {
      const panel = this.panelAt(pointer.worldX, pointer.worldY);
      if (panel && inReach) {
        this.answerDoor(panel.sign);
        this.wasLeftDown = true;
        return;
      }
    }
    this.wasLeftDown = left;

    if (!left && !right) {
      this.lastBrushCell = null;
      return;
    }
    if (!inReach) {
      this.lastBrushCell = null;
      return;
    }

    const cx = colOf(pointer.worldX);
    const cy = rowOf(pointer.worldY);

    // Walk the line from the last cell so a fast drag leaves no gaps.
    const from = this.lastBrushCell;
    if (from && (from.cx !== cx || from.cy !== cy)) {
      const steps = Math.max(Math.abs(cx - from.cx), Math.abs(cy - from.cy));
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        this.applyBrush(
          Math.round(from.cx + (cx - from.cx) * t),
          Math.round(from.cy + (cy - from.cy) * t),
          right,
        );
      }
    } else {
      this.applyBrush(cx, cy, right);
    }
    this.lastBrushCell = { cx, cy };
  }

  answerDoor(sign) {
    const result = this.car.chooseSign(sign);
    if (result.ok && result.reason === 'correct') this.playCompletion();
  }

  stepPlayer() {
    const k = this.keys;
    const body = this.walker.body;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const jump = k.up.isDown || k.w.isDown || k.space.isDown;

    body.setVelocityX(left && !right ? -MOVE_SPEED : right && !left ? MOVE_SPEED : 0);
    if (jump && body.blocked.down) body.setVelocityY(JUMP_VELOCITY);

    // Falling through the paper costs nothing that was drawn.
    if (this.walker.y > VIEW.h + 120) {
      this.car.fell();
      const bay = this.walker.x > 1920 ? 2120 : this.walker.x > 960 ? 1000 : 200;
      this.walker.setPosition(bay, 360);
      body.setVelocity(0, 0);
    }
  }

  playCompletion() {
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
    if (car.state.complete) return 'THE DOOR IS OPEN. IT WAS THE MOON.';
    const read = car.state.seen.size;
    if (read < PAINTINGS.length) {
      if (this.bayId() === 'A') return 'DRAW PAPER TO CROSS — IT ONLY TAKES WHERE IT TOUCHES SOMETHING.';
      return `BUILD UP TO THE PICTURES AND READ THEM — ${read} OF ${PAINTINGS.length} SO FAR.`;
    }
    if (!car.boardSolved()) return 'THREAD THE BOARD BY THE DOOR — NO TWO CORDS THROUGH ONE HOLE.';
    return 'THE DOOR WANTS THE SIGN THAT WAS IN EVERY PICTURE.';
  }

  updateNotebook() {
    const read = PAINTINGS.filter((p) => this.car.state.seen.has(p.id));
    if (!read.length) {
      this.notebook.setAlpha(0);
      return;
    }
    const width = Math.max(...PAINTINGS.map((p) => p.title.length));
    const lines = read.map(
      (p) => `${p.title.padEnd(width, ' ')}   ${p.signs.map((s) => s.toUpperCase()).join('  ')}`,
    );
    this.notebook.setText(['WHAT YOU HAVE SEEN', ...lines].join('\n'));
    this.notebook.setAlpha(0.96);
  }

  updatePictureHints() {
    PAINTINGS.forEach((picture) => {
      const label = this.pictureLabels[picture.id];
      if (!label) return;
      if (this.car.state.seen.has(picture.id)) {
        label.setText('READ').setColor('#6f9c8b');
        return;
      }
      const d = Phaser.Math.Distance.Between(
        this.walker.x,
        this.walker.y,
        picture.x + picture.w / 2,
        picture.y + picture.h / 2,
      );
      label.setText(d > READ_RADIUS * 2.4 ? '' : 'TOO FAR TO SEE — GET UP TO IT').setColor('#2f8c9e');
    });
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;

    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.scene.restart();
      return;
    }

    this.stepBrush();
    this.stepPlayer();
    this.car.look(this.walker.x, this.walker.y);

    if (this.paintDirty) {
      this.redrawPaint();
      this.paintDirty = false;
    }
    this.drawFigure();
    this.drawCords();
    this.drawCursor();
    this.drawDoorSigns();

    this.car.drainEvents().forEach((event) => {
      if (event.type === 'picture-read') this.flashMessage('YOU CAN READ IT FROM HERE.', '#6f9c8b');
      else if (event.type === 'cord-joined') this.flashMessage('THAT PAIR IS THREADED.', '#6f9c8b');
      else if (event.type === 'board-solved') this.flashMessage('THE BOARD IS THREADED. THE SIGNS LIGHT UP.', '#6f9c8b');
      else if (event.type === 'cord-blocked') this.flashMessage('ANOTHER CORD IS ALREADY IN THAT HOLE.', '#c8892f');
      else if (event.type === 'door-dark') {
        this.flashMessage('THE SIGNS ARE DARK — THREAD THE BOARD FIRST.', '#c8892f');
      } else if (event.type === 'door-silent') {
        this.flashMessage(`THE DOOR STAYS SHUT — ${event.seen} OF ${event.of} PICTURES READ.`, '#c8892f');
      } else if (event.type === 'door-refused') this.flashMessage('NOT THAT ONE. LOOK AGAIN.', '#b4453a');
      else if (event.type === 'door-opened') {
        this.flashMessage('THE MOON. THE DOOR OPENS.', '#6f9c8b');
        if (!this.advancingToStudio) {
          this.advancingToStudio = true;
          this.time.delayedCall(1100, () => this.scene.start('DrawingStudio'));
        }
      }
      else if (event.type === 'paint-refused' && event.reason === 'varnished') {
        this.flashMessage('THE PAPER IS VARNISHED HERE. PAINT WILL NOT TAKE.', '#c8892f');
      } else if (event.type === 'paint-refused' && event.reason === 'nothing-to-hold-it') {
        this.flashMessage('PAINT NEEDS SOMETHING TO HOLD IT.', '#c8892f');
      }
    });

    this.objective.setText(this.objectiveText());
    this.bayLabel.setText(`BAY ${this.bayId()}`);
    this.updateNotebook();
    this.updatePictureHints();

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

  drawDoorSigns() {
    const g = this.doorLayer;
    g.clear();
    const opened = this.car.state.door.solved;
    // Until the board is threaded the signs are unlit — visible as shapes, but
    // plainly not yet askable.
    const lit = this.car.boardSolved();

    DOOR.panels.forEach((panel) => {
      const chosen = this.car.state.door.chosen === panel.sign;
      const right = opened && panel.sign === DOOR.correct;
      g.fillStyle(right ? PAPER.verdigris : PAPER.sheetHigh, right ? 0.4 : lit ? 0.92 : 0.4);
      g.fillRect(panel.x, panel.y, panel.w, panel.h);
      g.lineStyle(right ? 2.6 : 1.6, right ? PAPER.verdigris : PAPER.graphite, lit ? 0.9 : 0.4);
      g.strokeRect(panel.x, panel.y, panel.w, panel.h);
      this.drawSign(
        g,
        panel.sign,
        panel.x + panel.w / 2,
        panel.y + panel.h / 2,
        30,
        PAPER.graphite,
        lit ? 0.95 : 0.34,
      );
      if (chosen && !right) {
        g.lineStyle(2.4, PAPER.fault, 0.85);
        g.lineBetween(panel.x + 10, panel.y + 10, panel.x + panel.w - 10, panel.y + panel.h - 10);
        g.lineBetween(panel.x + panel.w - 10, panel.y + 10, panel.x + 10, panel.y + panel.h - 10);
      }
    });
  }

  textState() {
    const pointer = this.input.activePointer;
    const cx = colOf(pointer.worldX);
    const cy = rowOf(pointer.worldY);
    return {
      scene: 'PaintedCountry',
      bay: this.bayId(),
      objective: this.objectiveText(),
      ...this.car.snapshot(),
      player: {
        x: Math.round(this.walker.x),
        y: Math.round(this.walker.y),
        onGround: this.walker.body.blocked.down,
      },
      pointer: {
        x: Math.round(pointer.worldX),
        y: Math.round(pointer.worldY),
        cell: [cx, cy],
        inReach: this.pointerInReach(),
        canPaint: this.car.canPaint(cx, cy),
        canWash: this.car.canWash(cx, cy),
        overPanel: this.panelAt(pointer.worldX, pointer.worldY)?.sign ?? null,
      },
    };
  }
}

export const PAINTED_COUNTRY_VIEW = VIEW;
