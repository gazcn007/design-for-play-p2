import Phaser from 'phaser';
import {
  REQUIRED_CELLS,
  STUDIO_PIGMENTS,
  STUDIO_SOURCES,
  createDrawingStudio,
} from './drawingStudioModel.js';
import { animatePaperButch, createPaperButch } from './paperButch.js';
import { drawPigmentHalo, haloPointToward } from './pigmentHalo.js';
import { PAPER } from './paperPalette.js';
import {
  buildPaperGrain,
  draftLine,
  draftRect,
  hatchRect,
  makeRandom,
  paintedFill,
} from './paperSurface.js';

const VIEW = Object.freeze({ w: 960, h: 600 });
const WORLD = Object.freeze({ w: 2500, h: 600 });
const FLOOR_Y = 486;
const MOVE_SPEED = 210;
const JUMP_VELOCITY = -620;
const HOLD_SECONDS = 0.72;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const DEPTH = Object.freeze({ BACK: 0, ROOM: 6, OBJECT: 14, PAINT: 18, BOARD: 23, FIGURE: 30, PROMPT: 48, GRAIN: 70 });

const SOURCE_LAYOUT = Object.freeze([
  { id: 'phone', x: 700, y: 266, kind: 'phone', scale: 0.45, rect: { x: 658, y: 224, w: 84, h: 48 } },
  { id: 'books', x: 880, y: 266, kind: 'books', scale: 0.5, rect: { x: 838, y: 224, w: 84, h: 46 } },
  { id: 'plant', x: 700, y: 350, kind: 'plant', scale: 0.38, rect: { x: 654, y: 292, w: 92, h: 66 } },
  { id: 'cushion', x: 880, y: 350, kind: 'chair', scale: 0.42, rect: { x: 834, y: 296, w: 92, h: 62 } },
  { id: 'vase', x: 700, y: 434, kind: 'vase', scale: 0.52, rect: { x: 658, y: 380, w: 84, h: 60 } },
  { id: 'curtain', x: 880, y: 434, kind: 'curtain', scale: 0.23, rect: { x: 842, y: 396, w: 76, h: 62 } },
]);

const REFERENCE = Object.freeze({ x: 1070, y: 206, cell: 40, cols: 3, rows: 3 });
const REQUIRED = Object.freeze({ x: 1270, y: 190, cell: 50, cols: 3, rows: 3 });
const FREE = Object.freeze({ x: 1660, y: 190, cell: 48, cols: 4, rows: 3 });
const EXIT_X = 2360;

const colorCss = (value) => `#${value.toString(16).padStart(6, '0')}`;
const cellKey = (col, row) => `${col},${row}`;

export class DrawingStudioScene extends Phaser.Scene {
  constructor() {
    super('DrawingStudio');
  }

  preload() {
    if (!this.cache.audio.exists('chapter4-drawing-music')) {
      this.load.audio('chapter4-drawing-music', '/assets/music/ch4/4.3_debussy_reflets_dans_leau.mp3');
    }
    if (!this.cache.audio.exists('chapter4-consequence-music')) {
      this.load.audio('chapter4-consequence-music', '/assets/music/ch4/4.2_debussy_snow_is_dancing.mp3');
    }
  }

  create() {
    this.rnd = makeRandom(0xd4a7);
    this.studio = createDrawingStudio();
    this.selected = null;
    this.currentInteraction = null;
    this.hoverSourceId = null;
    this.hold = { key: null, progress: 0 };
    this.playerFacing = 1;
    this.playerAnimation = 'idle';
    this.frameReveal = 0;
    this.transitioning = false;
    this.tutorialSeen = { extract: false, select: false, fill: false, lift: false, exit: false };

    this.cameras.main.setBackgroundColor(PAPER.sheet);
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.physics.world.setBounds(0, 0, WORLD.w, WORLD.h);

    this.buildRoom();
    this.buildSources();
    this.buildBoards();
    this.buildPlayer();
    this.buildPrompt();
    this.buildGrain();
    this.bindInput();
    this.startMusic();
    this.applyQaState();
    this.redrawAll();
  }

  graphics(depth) {
    return this.add.graphics().setDepth(depth);
  }

  buildRoom() {
    const g = this.graphics(DEPTH.BACK);
    g.fillStyle(PAPER.sheet, 1).fillRect(0, 0, WORLD.w, WORLD.h);
    g.fillStyle(PAPER.sheetHigh, 0.92).fillRect(0, 92, WORLD.w, 266);
    g.fillStyle(PAPER.sheetMid, 0.8).fillRect(0, 358, WORLD.w, FLOOR_Y - 358);
    g.fillStyle(PAPER.sheetLow, 1).fillRect(0, FLOOR_Y, WORLD.w, WORLD.h - FLOOR_Y);
    hatchRect(g, this.rnd, 0, FLOOR_Y, WORLD.w, 70, { spacing: 17, alpha: 0.18, flip: true });

    // Preserve Part I's strongest background: the warm paper windows and
    // folded hills continue through the studio instead of disappearing here.
    const windows = [
      { x: 54, w: 330 }, { x: 452, w: 350 }, { x: 870, w: 350 },
      { x: 1288, w: 350 }, { x: 1706, w: 360 }, { x: 2134, w: 300 },
    ];
    windows.forEach(({ x, w }, index) => {
      g.fillStyle(PAPER.sheetHigh, 0.96).fillRect(x, 118, w, 196);
      g.lineStyle(1.5, PAPER.graphiteSoft, 0.72);
      draftRect(g, this.rnd, x, 118, w, 196, { overshoot: 7, jitter: 0.7 });
      const hillY = 234 + (index % 2) * 12;
      g.fillStyle(PAPER.sheetMid, 0.82).fillTriangle(x, 314, x + w * 0.42, hillY, x + w * 0.7, 314);
      g.fillStyle(PAPER.sheetLow, 0.66).fillTriangle(x + w * 0.42, hillY, x + w, 282, x + w, 314);
      g.lineStyle(1.1, PAPER.graphiteFaint, 0.48);
      draftLine(g, this.rnd, x, 294, x + w, 276, { overshoot: 0, jitter: 1.8, segments: 12 });
    });
    g.lineStyle(1.8, PAPER.graphite, 0.82);
    draftLine(g, this.rnd, 0, 92, WORLD.w, 92, { overshoot: 0, jitter: 0.8, segments: 50 });
    draftLine(g, this.rnd, 0, 358, WORLD.w, 358, { overshoot: 0, jitter: 0.8, segments: 50 });
    draftLine(g, this.rnd, 0, FLOOR_Y, WORLD.w, FLOOR_Y, { overshoot: 0, jitter: 0.9, segments: 55 });

    // One compact cabinet: three shelves, two small color-bearing objects per
    // shelf. It sits beside the easels so copying never becomes a commute.
    const room = this.graphics(DEPTH.ROOM);
    room.lineStyle(1.7, PAPER.graphite, 0.82);
    room.fillStyle(PAPER.sheetMid, 0.9).fillRect(610, 188, 360, 270);
    draftRect(room, this.rnd, 610, 188, 360, 270, { overshoot: 7 });
    [278, 362, 446].forEach((y) => draftLine(room, this.rnd, 620, y, 960, y, { overshoot: 4 }));
    draftLine(room, this.rnd, 790, 196, 790, 446, { overshoot: 3 });
    draftLine(room, this.rnd, 632, 458, 632, FLOOR_Y, { overshoot: 3 });
    draftLine(room, this.rnd, 948, 458, 948, FLOOR_Y, { overshoot: 3 });

    this.add.text(66, 112, 'THE OPEN SHEET  ·  COLOR ROOM', {
      fontFamily: MONO, fontSize: '13px', color: '#5c574f', letterSpacing: 2.5,
    }).setDepth(DEPTH.ROOM + 1);
    this.add.text(1055, 112, 'COPY WHAT YOU SEE.  EVERY CABINET COLOR IS EXACTLY ONE SQUARE.', {
      fontFamily: MONO, fontSize: '10px', color: '#8d8579', letterSpacing: 1.5,
    }).setDepth(DEPTH.ROOM + 1);

    const floor = this.add.rectangle(WORLD.w / 2, FLOOR_Y + 52, WORLD.w, 104, 0xffffff, 0);
    this.physics.add.existing(floor, true);
    this.floor = floor;
  }

  buildSources() {
    this.sourceArt = new Map();
    SOURCE_LAYOUT.forEach((layout) => {
      const art = this.graphics(DEPTH.PAINT);
      art.setScale(layout.scale).setPosition(layout.x * (1 - layout.scale), layout.y * (1 - layout.scale));
      this.sourceArt.set(layout.id, art);
    });
    this.sourceFocusArt = this.graphics(DEPTH.PAINT + 2);
    this.suctionArt = this.graphics(DEPTH.PROMPT - 2);
  }

  buildBoards() {
    const g = this.graphics(DEPTH.BOARD - 2);
    this.drawEasel(g, REFERENCE, 'REFERENCE  ·  VASE + FLOWERS', 0.86);
    this.drawEasel(g, REQUIRED, 'YOUR COPY', 1);
    this.drawEasel(g, FREE, 'YOUR OWN DRAWING', 1);
    this.referenceArt = this.graphics(DEPTH.BOARD);
    this.requiredArt = this.graphics(DEPTH.BOARD);
    this.freeArt = this.graphics(DEPTH.BOARD);
    this.selectionArt = this.graphics(DEPTH.BOARD + 2);
    this.frameArt = this.graphics(DEPTH.BOARD + 3);
    this.doorArt = this.graphics(DEPTH.BOARD);
  }

  drawEasel(g, board, title, alpha) {
    const w = board.cols * board.cell;
    const h = board.rows * board.cell;
    g.fillStyle(PAPER.sheetHigh, alpha).fillRect(board.x - 12, board.y - 12, w + 24, h + 24);
    g.lineStyle(1.8, PAPER.graphite, 0.8);
    draftRect(g, this.rnd, board.x - 12, board.y - 12, w + 24, h + 24, { overshoot: 7, jitter: 0.8 });
    draftLine(g, this.rnd, board.x + w * 0.5, board.y + h + 12, board.x + w * 0.5 - 54, FLOOR_Y, { overshoot: 5 });
    draftLine(g, this.rnd, board.x + w * 0.5, board.y + h + 12, board.x + w * 0.5 + 54, FLOOR_Y, { overshoot: 5 });
    this.add.text(board.x + w / 2, board.y - 35, title, {
      fontFamily: MONO, fontSize: '9px', color: '#5c574f', letterSpacing: 1.4,
    }).setOrigin(0.5).setDepth(DEPTH.BOARD);
  }

  buildPlayer() {
    this.walker = this.add.rectangle(500, 414, 18, 62, 0xffffff, 0);
    this.physics.add.existing(this.walker);
    this.physics.add.collider(this.walker, this.floor);
    this.walker.body.setCollideWorldBounds(true);
    this.figure = createPaperButch(this, this.walker.x, FLOOR_Y, DEPTH.FIGURE);
    this.heldArt = this.graphics(DEPTH.FIGURE + 1);
    this.cameras.main.startFollow(this.walker, true, 0.1, 0.12);
    this.cameras.main.setDeadzone(280, 190);
  }

  buildPrompt() {
    this.promptFrame = this.graphics(DEPTH.PROMPT);
    this.promptText = this.add.text(0, 0, '', {
      fontFamily: MONO,
      fontSize: '10px',
      color: '#4a4640',
      align: 'center',
      lineSpacing: 4,
      letterSpacing: 1.1,
      padding: { x: 9, y: 7 },
    }).setOrigin(0.5, 1).setDepth(DEPTH.PROMPT + 1).setVisible(false);
  }

  buildGrain() {
    const key = buildPaperGrain(this, 'paper-grain-drawing-studio-v2');
    this.grain = this.add.tileSprite(0, 0, VIEW.w, VIEW.h, key)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.GRAIN).setAlpha(0.7);
  }

  bindInput() {
    this.keys = this.input.keyboard.addKeys({ left: 'LEFT', right: 'RIGHT', up: 'UP', a: 'A', d: 'D', w: 'W', space: 'SPACE' });
    this.input.keyboard.addCapture(['LEFT', 'RIGHT', 'UP', 'SPACE']);
    this.input.mouse?.disableContextMenu();
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-F', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });
    this.input.on('pointerdown', this.selectBoardCell, this);
  }

  startMusic() {
    this.music = this.sound.add('chapter4-drawing-music', { loop: true, volume: 0.24 });
    const play = () => { if (!this.music?.isPlaying) this.music?.play(); };
    if (this.sound.locked) this.sound.once('unlocked', play);
    else play();
    this.input.once('pointerdown', play);
    this.input.keyboard.once('keydown', play);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music?.stop());
  }

  applyQaState() {
    if (!import.meta.env.DEV) return;
    const qa = new URLSearchParams(window.location.search).get('qa');
    if (!['drawing-ready', 'drawing-free'].includes(qa)) return;
    if (qa === 'drawing-free') {
      STUDIO_SOURCES.forEach((source) => {
        this.studio.extract(source.id);
        this.studio.placeRequired(source.targetCell);
      });
      const last = STUDIO_SOURCES.at(-1);
      this.studio.liftRequired(last.targetCell);
      this.selected = { board: 'free', cell: '2,2' };
      this.walker.setPosition(FREE.x + 40, 414);
      this.studio.drainEvents();
      return;
    }
    STUDIO_SOURCES.slice(0, -1).forEach((source) => {
      this.studio.extract(source.id);
      this.studio.placeRequired(source.targetCell);
    });
    const last = STUDIO_SOURCES.at(-1);
    this.studio.extract(last.id);
    this.selected = { board: 'required', cell: last.targetCell };
    this.walker.setPosition(REQUIRED.x - 70, 414);
    this.studio.drainEvents();
  }

  redrawAll() {
    this.redrawSources();
    this.redrawBoards();
    this.redrawDoor();
  }

  paintPatch(g, x, y, w, h, color, live) {
    if (!live) return;
    paintedFill(g, this.rnd, x, y, w, h, color, { alpha: 0.8, inset: 2 });
    g.lineStyle(1.1, color, 0.45);
    for (let yy = y + 6; yy < y + h - 2; yy += 7) {
      draftLine(g, this.rnd, x + 4, yy, x + w - 4, yy + (this.rnd() - 0.5) * 4, {
        overshoot: 0, jitter: 1.3, segments: 4,
      });
    }
  }

  redrawSources() {
    SOURCE_LAYOUT.forEach((layout) => {
      const g = this.sourceArt.get(layout.id);
      const item = this.studio.source(layout.id);
      const pigment = this.studio.pigment(item.pigment);
      const live = !item.drained;
      g.clear();
      const suctionProgress = this.hold.key === `source:${layout.id}`
        ? Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1)
        : 0;
      g.setAlpha(live ? 1 - suctionProgress * 0.58 : 1);
      g.lineStyle(1.9, PAPER.graphite, live ? 0.88 : 0.56);
      const { x, y } = layout;
      if (layout.kind === 'phone') {
        this.paintPatch(g, x - 48, y - 42, 96, 42, pigment.color, live);
        this.paintPatch(g, x - 54, y - 70, 108, 22, pigment.color, live);
        draftRect(g, this.rnd, x - 48, y - 42, 96, 42, { overshoot: 4 });
        draftLine(g, this.rnd, x - 54, y - 68, x + 54, y - 68, { overshoot: 4 });
        draftLine(g, this.rnd, x - 52, y - 67, x - 36, y - 45, { overshoot: 2 });
        draftLine(g, this.rnd, x + 52, y - 67, x + 36, y - 45, { overshoot: 2 });
        g.strokeCircle(x, y - 21, 14);
      } else if (layout.kind === 'lamp') {
        this.paintPatch(g, x - 43, y - 92, 86, 50, pigment.color, live);
        draftLine(g, this.rnd, x - 43, y - 42, x - 27, y - 92, { overshoot: 3 });
        draftLine(g, this.rnd, x - 27, y - 92, x + 27, y - 92, { overshoot: 3 });
        draftLine(g, this.rnd, x + 27, y - 92, x + 43, y - 42, { overshoot: 3 });
        draftLine(g, this.rnd, x - 43, y - 42, x + 43, y - 42, { overshoot: 3 });
        draftLine(g, this.rnd, x, y - 42, x, y, { overshoot: 3 });
        draftLine(g, this.rnd, x - 31, y, x + 31, y, { overshoot: 3 });
      } else if (layout.kind === 'books') {
        [0, 1, 2].forEach((i) => {
          this.paintPatch(g, x - 51 + i * 6, y - 22 - i * 19, 100 - i * 12, 17, pigment.color, live);
          draftRect(g, this.rnd, x - 51 + i * 6, y - 22 - i * 19, 100 - i * 12, 17, { overshoot: 3, jitter: 0.6 });
        });
      } else if (layout.kind === 'flowers') {
        draftLine(g, this.rnd, x, y - 5, x, y - 94, { overshoot: 3 });
        [-32, 0, 32].forEach((dx, i) => {
          if (live) g.fillStyle(pigment.color, 0.8).fillCircle(x + dx, y - 93 - (i % 2) * 15, 17);
          g.strokeCircle(x + dx, y - 93 - (i % 2) * 15, 17);
          draftLine(g, this.rnd, x, y - 30, x + dx, y - 78 - (i % 2) * 15, { overshoot: 2 });
        });
        draftLine(g, this.rnd, x - 32, y, x + 32, y, { overshoot: 3 });
      } else if (layout.kind === 'plant') {
        this.paintPatch(g, x - 43, y - 58, 86, 58, pigment.color, live);
        draftRect(g, this.rnd, x - 43, y - 58, 86, 58, { overshoot: 4 });
        [-28, -10, 12, 30].forEach((dx, i) => {
          draftLine(g, this.rnd, x, y - 58, x + dx, y - 142 + (i % 2) * 22, { overshoot: 2 });
          if (live) g.fillStyle(pigment.color, 0.76).fillEllipse(x + dx, y - 148 + (i % 2) * 22, 35, 20);
          g.strokeEllipse(x + dx, y - 148 + (i % 2) * 22, 35, 20);
        });
      } else if (layout.kind === 'chair') {
        this.paintPatch(g, x - 52, y - 52, 104, 45, pigment.color, live);
        draftRect(g, this.rnd, x - 52, y - 52, 104, 45, { overshoot: 5 });
        draftLine(g, this.rnd, x - 52, y - 52, x - 52, y - 118, { overshoot: 4 });
        draftLine(g, this.rnd, x + 52, y - 52, x + 52, y - 118, { overshoot: 4 });
        draftLine(g, this.rnd, x - 52, y - 118, x + 52, y - 118, { overshoot: 4 });
      } else if (layout.kind === 'vase') {
        if (live) g.fillStyle(pigment.color, 0.78).fillEllipse(x, y - 47, 82, 94);
        g.strokeEllipse(x, y - 47, 82, 94);
        draftLine(g, this.rnd, x - 22, y - 96, x + 22, y - 96, { overshoot: 3 });
        draftLine(g, this.rnd, x - 34, y - 8, x + 34, y - 8, { overshoot: 3 });
      } else {
        this.paintPatch(g, x - 62, y - 144, 124, 245, pigment.color, live);
        draftRect(g, this.rnd, x - 62, y - 144, 124, 245, { overshoot: 6 });
        for (let yy = y - 120; yy < y + 90; yy += 34) {
          draftLine(g, this.rnd, x - 58, yy, x + 58, yy + 18, { overshoot: 0, jitter: 1.2, segments: 6 });
        }
      }
    });
  }

  sourceAt(x, y) {
    return SOURCE_LAYOUT.find((layout) => Phaser.Geom.Rectangle.Contains(
      new Phaser.Geom.Rectangle(layout.rect.x, layout.rect.y, layout.rect.w, layout.rect.h),
      x,
      y,
    )) ?? null;
  }

  pointerWorld(pointer = this.input.activePointer) {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  setHold(key, dt) {
    if (this.hold.key !== key) this.hold = { key, progress: 0 };
    this.hold.progress += dt;
    return this.hold.progress >= HOLD_SECONDS;
  }

  resetHold() {
    if (this.hold.key) {
      this.hold = { key: null, progress: 0 };
      this.redrawSources();
    }
  }

  boardInteractionAt(x, y) {
    for (const [name, board] of [['required', REQUIRED], ['free', FREE]]) {
      const cell = this.cellAt(board, x, y);
      const centre = board.x + board.cols * board.cell / 2;
      if (cell && Math.abs(this.walker.x - centre) <= 270) return { name, board, cell };
    }
    return null;
  }

  exitInteractionAt(x, y) {
    if (!this.studio.isComplete() || Math.abs(this.walker.x - EXIT_X) > 140) return null;
    const rect = new Phaser.Geom.Rectangle(EXIT_X - 55, 290, 100, FLOOR_Y - 290);
    return Phaser.Geom.Rectangle.Contains(rect, x, y) ? { rect } : null;
  }

  occupiedSourceId(boardName, cell, snapshot = this.studio.snapshot()) {
    return boardName === 'required' ? snapshot.required[cell] : snapshot.free[cell];
  }

  stepSuction(dt) {
    const pointer = this.input.activePointer;
    const world = this.pointerWorld(pointer);
    const pointed = this.sourceAt(world.x, world.y);
    const available = pointed && !this.studio.source(pointed.id).drained && !this.studio.state.held;
    this.hoverSourceId = available ? pointed.id : null;

    if (available && pointer.rightButtonDown()) {
      if (this.setHold(`source:${pointed.id}`, dt)) {
        if (this.studio.extract(pointed.id)) this.tutorialSeen.extract = true;
        this.hold = { key: null, progress: 0 };
        this.handleEvents();
        this.redrawAll();
      } else {
        this.redrawSources();
      }
      return;
    }

    const boardHit = this.boardInteractionAt(world.x, world.y);
    if (boardHit) {
      this.selected = { board: boardHit.name, cell: boardHit.cell };
      const snapshot = this.studio.snapshot();
      const occupied = this.occupiedSourceId(boardHit.name, boardHit.cell, snapshot);
      if (occupied && !snapshot.held && pointer.rightButtonDown()) {
        if (this.setHold(`lift:${boardHit.name}:${boardHit.cell}`, dt)) {
          const lifted = boardHit.name === 'required'
            ? this.studio.liftRequired(boardHit.cell)
            : this.studio.liftFree(boardHit.cell);
          if (lifted) this.tutorialSeen.lift = true;
          this.hold = { key: null, progress: 0 };
          this.handleEvents();
          this.redrawAll();
        }
        return;
      }
      if (!occupied && snapshot.held && pointer.leftButtonDown()) {
        if (this.setHold(`fill:${boardHit.name}:${boardHit.cell}`, dt)) {
          const placed = boardHit.name === 'required'
            ? this.studio.placeRequired(boardHit.cell)
            : this.studio.placeFree(boardHit.cell);
          if (placed) this.tutorialSeen.fill = true;
          this.hold = { key: null, progress: 0 };
          this.handleEvents();
          this.redrawAll();
        }
        return;
      }
    }

    const exit = this.exitInteractionAt(world.x, world.y);
    if (exit && pointer.leftButtonDown()) {
      if (this.setHold('exit', dt)) {
        this.tutorialSeen.exit = true;
        this.hold = { key: null, progress: 0 };
        this.goToTrain();
      }
      return;
    }
    this.resetHold();
  }

  drawSuction() {
    const focus = this.sourceFocusArt;
    const stream = this.suctionArt;
    focus.clear();
    stream.clear();
    const source = SOURCE_LAYOUT.find(({ id }) => id === this.hoverSourceId);
    if (source) {
      const pigment = this.studio.pigment(this.studio.source(source.id).pigment);
      focus.lineStyle(2.2, pigment.color, 0.95);
      draftRect(focus, makeRandom(0x5157 + source.x), source.rect.x - 4, source.rect.y - 4, source.rect.w + 8, source.rect.h + 8, {
        overshoot: 4,
        jitter: 0.8,
      });
    }

    if (!this.hold.key || this.hold.key === 'exit') return;
    const progress = Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1);
    const head = { x: this.walker.x, y: this.walker.y - 50 };
    let start = null;
    let finish = null;
    let color = PAPER.cyan;

    if (this.hold.key.startsWith('source:') && source) {
      const pigment = this.studio.pigment(this.studio.source(source.id).pigment);
      color = pigment.color;
      start = { x: source.rect.x + source.rect.w / 2, y: source.rect.y + source.rect.h / 2 };
      finish = haloPointToward(head.x, head.y, start.x, start.y, 36);
    } else if (this.hold.key.startsWith('lift:') || this.hold.key.startsWith('fill:')) {
      const [, boardName, cell] = this.hold.key.split(':');
      const board = this.boardByName(boardName);
      const [col, row] = cell.split(',').map(Number);
      const cellCentre = { x: board.x + (col + 0.5) * board.cell, y: board.y + (row + 0.5) * board.cell };
      const snapshot = this.studio.snapshot();
      const sourceId = this.hold.key.startsWith('lift:')
        ? this.occupiedSourceId(boardName, cell, snapshot)
        : snapshot.held;
      if (!sourceId) return;
      color = this.studio.pigment(this.studio.source(sourceId).pigment).color;
      const edge = haloPointToward(head.x, head.y, cellCentre.x, cellCentre.y, 36);
      start = this.hold.key.startsWith('lift:') ? cellCentre : edge;
      finish = this.hold.key.startsWith('lift:') ? edge : cellCentre;
    }
    if (!start || !finish) return;
    const end = { x: Phaser.Math.Linear(start.x, finish.x, progress), y: Phaser.Math.Linear(start.y, finish.y, progress) };
    stream.lineStyle(2.4, color, 0.68);
    [-2.5, 2.5].forEach((offset) => {
      draftLine(stream, makeRandom(0x6300 + offset), start.x, start.y + offset, end.x, end.y + offset * 0.25, {
        overshoot: 0,
        jitter: 1.2,
        segments: 9,
      });
    });
  }

  boardRect(board) {
    return new Phaser.Geom.Rectangle(board.x, board.y, board.cols * board.cell, board.rows * board.cell);
  }

  cellAt(board, x, y) {
    if (!Phaser.Geom.Rectangle.Contains(this.boardRect(board), x, y)) return null;
    return cellKey(Math.floor((x - board.x) / board.cell), Math.floor((y - board.y) / board.cell));
  }

  boardByName(name) {
    return name === 'required' ? REQUIRED : FREE;
  }

  selectBoardCell(pointer) {
    if (this.transitioning) return;
    const { x, y } = this.pointerWorld(pointer);
    for (const [name, board] of [['required', REQUIRED], ['free', FREE]]) {
      const cell = this.cellAt(board, x, y);
      const centre = board.x + board.cols * board.cell / 2;
      if (!cell || Math.abs(this.walker.x - centre) > 270) continue;
      this.selected = { board: name, cell };
      this.tutorialSeen.select = true;
      this.redrawBoards();
      return;
    }
  }

  drawGrid(g, board) {
    g.lineStyle(1.15, PAPER.graphiteSoft, 0.48);
    for (let col = 0; col <= board.cols; col += 1) {
      draftLine(g, this.rnd, board.x + col * board.cell, board.y, board.x + col * board.cell, board.y + board.rows * board.cell, {
        overshoot: 1, jitter: 0.45, segments: board.rows * 2,
      });
    }
    for (let row = 0; row <= board.rows; row += 1) {
      draftLine(g, this.rnd, board.x, board.y + row * board.cell, board.x + board.cols * board.cell, board.y + row * board.cell, {
        overshoot: 1, jitter: 0.45, segments: board.cols * 2,
      });
    }
  }

  fillCell(g, board, key, pigmentId, alpha = 0.82) {
    const [col, row] = key.split(',').map(Number);
    const pigment = this.studio.pigment(pigmentId);
    if (!pigment) return;
    paintedFill(g, this.rnd, board.x + col * board.cell + 2, board.y + row * board.cell + 2, board.cell - 4, board.cell - 4, pigment.color, {
      alpha, inset: 2,
    });
    g.lineStyle(1.1, pigment.color, 0.46);
    for (let yy = 9; yy < board.cell - 5; yy += 8) {
      draftLine(g, this.rnd, board.x + col * board.cell + 7, board.y + row * board.cell + yy,
        board.x + (col + 1) * board.cell - 7, board.y + row * board.cell + yy + 2, {
          overshoot: 0, jitter: 1.2, segments: 4,
        });
    }
  }

  redrawBoards() {
    this.referenceArt.clear();
    this.requiredArt.clear();
    this.freeArt.clear();
    this.selectionArt.clear();
    this.frameArt.clear();
    this.drawGrid(this.referenceArt, REFERENCE);
    this.drawGrid(this.requiredArt, REQUIRED);
    this.drawGrid(this.freeArt, FREE);
    REQUIRED_CELLS.forEach(({ cell, pigment }) => this.fillCell(this.referenceArt, REFERENCE, cell, pigment, 0.68));

    const snapshot = this.studio.snapshot();
    Object.entries(snapshot.required).forEach(([cell, token]) => {
      this.fillCell(this.requiredArt, REQUIRED, cell, this.studio.source(token).pigment);
    });
    Object.entries(snapshot.free).forEach(([cell, token]) => {
      this.fillCell(this.freeArt, FREE, cell, this.studio.source(token).pigment);
    });

    if (this.selected) {
      const board = this.boardByName(this.selected.board);
      const [col, row] = this.selected.cell.split(',').map(Number);
      this.selectionArt.lineStyle(2.4, PAPER.cyan, 0.9);
      this.selectionArt.strokeRect(board.x + col * board.cell + 3, board.y + row * board.cell + 3, board.cell - 6, board.cell - 6);
    }
    if (snapshot.complete || this.frameReveal > 0.01) this.drawCompletionFrame(snapshot.complete ? Math.max(this.frameReveal, 0.2) : this.frameReveal);
  }

  drawCompletionFrame(amount) {
    const g = this.frameArt;
    const w = REQUIRED.cols * REQUIRED.cell;
    const h = REQUIRED.rows * REQUIRED.cell;
    const pad = 18 + 8 * amount;
    g.lineStyle(2.8, PAPER.bookCloth, 0.9 * amount);
    draftRect(g, makeRandom(0x5150), REQUIRED.x - pad, REQUIRED.y - pad, w + pad * 2, h + pad * 2, { overshoot: 8, jitter: 1.1 });
    g.lineStyle(1.4, PAPER.graphite, 0.72 * amount);
    draftRect(g, makeRandom(0x5151), REQUIRED.x - pad + 7, REQUIRED.y - pad + 7, w + (pad - 7) * 2, h + (pad - 7) * 2, { overshoot: 5, jitter: 0.7 });
    g.fillStyle(PAPER.bookCloth, 0.88 * amount).fillCircle(REQUIRED.x + w + pad - 10, REQUIRED.y + h + pad - 8, 20 * amount);
    g.lineStyle(3, PAPER.sheetHigh, 0.9 * amount);
    g.lineBetween(REQUIRED.x + w + pad - 20, REQUIRED.y + h + pad - 8, REQUIRED.x + w + pad - 12, REQUIRED.y + h + pad);
    g.lineBetween(REQUIRED.x + w + pad - 12, REQUIRED.y + h + pad, REQUIRED.x + w + pad + 2, REQUIRED.y + h + pad - 17);
  }

  redrawDoor() {
    const g = this.doorArt;
    g.clear();
    const complete = this.studio.isComplete();
    g.fillStyle(complete ? PAPER.cyan : PAPER.sheetMid, complete ? 0.2 : 0.72).fillRect(EXIT_X - 42, 302, 74, FLOOR_Y - 302);
    g.lineStyle(2, complete ? PAPER.cyan : PAPER.graphiteSoft, complete ? 0.9 : 0.62);
    draftRect(g, makeRandom(0x9955), EXIT_X - 42, 302, 74, FLOOR_Y - 302, { overshoot: 6, jitter: 0.8 });
    g.strokeCircle(EXIT_X + 12, 388, 4);
    this.addedDoorLabel ??= this.add.text(EXIT_X - 5, 276, 'TO THE BORROWED TRAIN', {
      fontFamily: MONO, fontSize: '9px', color: '#8d8579', letterSpacing: 1.3,
    }).setOrigin(0.5).setDepth(DEPTH.BOARD);
  }

  interactionForPlayer() {
    const source = SOURCE_LAYOUT.find(({ id }) => id === this.hoverSourceId);
    if (source) return { type: 'source', id: source.id, x: source.x, y: source.y };
    const requiredCentre = REQUIRED.x + REQUIRED.cols * REQUIRED.cell / 2;
    if (Math.abs(this.walker.x - requiredCentre) <= 260) return { type: 'board', board: 'required', x: requiredCentre, y: REQUIRED.y };
    const freeCentre = FREE.x + FREE.cols * FREE.cell / 2;
    if (Math.abs(this.walker.x - freeCentre) <= 270) return { type: 'board', board: 'free', x: freeCentre, y: FREE.y };
    if (this.studio.isComplete() && Math.abs(this.walker.x - EXIT_X) <= 105) return { type: 'exit', x: EXIT_X, y: 300 };
    return null;
  }

  promptFor(interaction) {
    if (!interaction) return null;
    if (interaction.type === 'source') {
      const item = this.studio.source(interaction.id);
      const pigment = this.studio.pigment(item.pigment);
      return {
        text: this.tutorialSeen.extract ? `RIGHT-HOLD TO LIFT\n${pigment.name}` : 'POINT AT AN OBJECT\nRIGHT-HOLD TO DRAW OUT COLOR',
        color: pigment.color,
        x: interaction.x,
        y: interaction.y - 115,
      };
    }
    if (interaction.type === 'exit') {
      return { text: this.tutorialSeen.exit ? 'THE NEXT ROOM OPENS' : 'POINT AT THE DOOR\nLEFT-HOLD TO CARRY THE FRAMED VASE FORWARD', color: PAPER.cyan, x: EXIT_X, y: 286 };
    }
    if (!this.selected || this.selected.board !== interaction.board) {
      return {
        text: this.tutorialSeen.select ? 'CHOOSE ANOTHER SQUARE' : 'CLICK A SQUARE\nON THIS CANVAS',
        color: PAPER.cyan,
        x: interaction.x,
        y: interaction.y - 22,
      };
    }
    const snapshot = this.studio.snapshot();
    const occupied = interaction.board === 'required'
      ? snapshot.required[this.selected.cell]
      : snapshot.free[this.selected.cell];
    if (occupied && !snapshot.held) {
      const pigment = this.studio.pigment(this.studio.source(occupied).pigment);
      return {
        text: this.tutorialSeen.lift ? `RIGHT-HOLD TO LIFT\n${pigment.name}` : 'RIGHT-HOLD THIS SQUARE\nTO LIFT THE COLOR BACK OUT',
        color: pigment.color,
        x: interaction.x,
        y: interaction.y - 22,
      };
    }
    if (snapshot.held && !occupied) {
      const held = this.studio.source(snapshot.held);
      const pigment = this.studio.pigment(held.pigment);
      return {
        text: this.tutorialSeen.fill ? `LEFT-HOLD TO PAINT\n${pigment.name}` : 'LEFT-HOLD THIS SQUARE\nTO PAINT IT',
        color: pigment.color,
        x: interaction.x,
        y: interaction.y - 22,
      };
    }
    return { text: 'THE CHOSEN SQUARE\nIS WAITING FOR COLOR', color: PAPER.graphiteSoft, x: interaction.x, y: interaction.y - 22 };
  }

  showPrompt(spec) {
    this.promptFrame.clear();
    if (!spec) {
      this.promptText.setVisible(false);
      return;
    }
    this.promptText.setText(spec.text).setPosition(spec.x, spec.y).setColor(colorCss(spec.color)).setVisible(true);
    const bounds = this.promptText.getBounds();
    this.promptFrame.fillStyle(PAPER.sheetHigh, 0.95).fillRoundedRect(bounds.x - 5, bounds.y - 4, bounds.width + 10, bounds.height + 8, 3);
    this.promptFrame.lineStyle(1.5, PAPER.graphiteSoft, 0.82);
    draftRect(this.promptFrame, makeRandom(Math.floor(spec.x * 31 + spec.y)), bounds.x - 5, bounds.y - 4, bounds.width + 10, bounds.height + 8, {
      overshoot: 3, jitter: 0.7,
    });
    this.promptFrame.lineStyle(2.4, spec.color, 0.84);
    draftLine(this.promptFrame, makeRandom(Math.floor(spec.x * 13)), bounds.x + 8, bounds.y + bounds.height + 1, bounds.x + bounds.width - 8, bounds.y + bounds.height + 1, {
      overshoot: 0, jitter: 1, segments: 5,
    });
  }

  handleEvents() {
    this.studio.drainEvents().forEach((event) => {
      if (event.type === 'wrong-required-color') {
        const wanted = this.studio.pigment(event.wanted);
        this.localFeedback(`THE REFERENCE NEEDS\n${wanted.name} HERE`, wanted.color);
      } else if (event.type === 'copy-complete') {
        this.frameReveal = 0;
        this.tweens.add({ targets: this, frameReveal: 1, duration: 720, ease: 'Back.easeOut' });
        this.localFeedback('CORRECT  ·  THE COPY\nHAS BEEN FRAMED', PAPER.bookCloth);
      } else if (event.type === 'copy-opened-again') {
        this.frameReveal = 0;
        this.localFeedback('THE FRAME OPENS.\nTHE EXIT CLOSES.', PAPER.fault);
      }
    });
  }

  localFeedback(text, color) {
    const note = this.add.text(this.walker.x, this.walker.y - 90, text, {
      fontFamily: MONO, fontSize: '10px', color: colorCss(color), align: 'center', lineSpacing: 4,
      backgroundColor: '#fdfcf8ee', padding: { x: 10, y: 8 },
    }).setOrigin(0.5, 1).setDepth(DEPTH.PROMPT + 3);
    this.tweens.add({ targets: note, y: note.y - 12, alpha: 0, delay: 900, duration: 650, onComplete: () => note.destroy() });
  }

  drawHeld(time) {
    this.heldArt.clear();
    const snapshot = this.studio.snapshot();
    const heldSource = snapshot.held ? this.studio.source(snapshot.held) : null;
    let progressId = null;
    if (this.hold.key?.startsWith('source:')) {
      const sourceId = this.hold.key.slice('source:'.length);
      progressId = this.studio.source(sourceId)?.pigment ?? null;
    } else if (this.hold.key?.startsWith('lift:')) {
      const [, boardName, cell] = this.hold.key.split(':');
      const sourceId = this.occupiedSourceId(boardName, cell, snapshot);
      progressId = sourceId ? this.studio.source(sourceId)?.pigment : null;
    }
    if (!heldSource && !progressId) return;
    drawPigmentHalo(this.heldArt, {
      x: this.walker.x,
      y: this.walker.y - 50,
      pigments: STUDIO_PIGMENTS,
      activeIds: heldSource ? [heldSource.pigment] : [],
      selectedId: heldSource?.pigment ?? null,
      progressId,
      progress: this.hold.progress / HOLD_SECONDS,
      time,
    });
  }

  stepPlayer() {
    if (this.transitioning) {
      this.walker.body.setVelocityX(0);
      return;
    }
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;
    const jump = this.keys.up.isDown || this.keys.w.isDown || this.keys.space.isDown;
    this.walker.body.setVelocityX(left && !right ? -MOVE_SPEED : right && !left ? MOVE_SPEED : 0);
    if (jump && this.walker.body.blocked.down) this.walker.body.setVelocityY(JUMP_VELOCITY);
  }

  updateFigure(time) {
    const moving = Math.abs(this.walker.body.velocity.x) > 8;
    if (this.walker.body.velocity.x < -8) this.playerFacing = -1;
    if (this.walker.body.velocity.x > 8) this.playerFacing = 1;
    this.playerAnimation = moving ? 'walk' : 'idle';
    this.figure.setPosition(Math.round(this.walker.x), Math.round(this.walker.y + 31));
    const pointer = this.input.activePointer;
    const paint = pointer?.leftButtonDown?.() ?? false;
    const wash = pointer?.rightButtonDown?.() ?? false;
    this.playerAnimation = animatePaperButch(this.figure, time, { moving, paint, wash });
  }

  seedStrokes() {
    const map = { red: 'red', orange: 'orange', pink: 'red', yellow: 'yellow', green: 'green', teal: 'blue', blue: 'blue', violet: 'violet' };
    return REQUIRED_CELLS.map(({ cell, pigment }) => {
      const [col, row] = cell.split(',').map(Number);
      return {
        color: map[pigment],
        points: [
          { x: 80 + col * 125, y: 50 + row * 88 },
          { x: 150 + col * 125, y: 100 + row * 88 },
        ],
      };
    });
  }

  goToTrain() {
    this.transitioning = true;
    this.registry.set('chapter4Drawing', this.seedStrokes());
    this.tweens.add({ targets: this.music, volume: 0, duration: 420 });
    this.cameras.main.fadeOut(420, 247, 244, 236);
    this.time.delayedCall(450, () => this.scene.start('PigmentTrain'));
  }

  objectiveText() {
    const snapshot = this.studio.snapshot();
    if (snapshot.complete) return 'the copied vase is framed; the exit is open unless a color is lifted out';
    if (Object.keys(snapshot.free).length) return 'a room color is on the free canvas; lift it back to finish the vase';
    if (snapshot.held) return 'choose a square on either canvas and place the held color';
    return 'point at one small cabinet object and right-hold to draw out its color';
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.stepPlayer();
    this.stepSuction(dt);
    this.updateFigure(time);
    this.drawHeld(time);
    this.drawSuction();
    this.currentInteraction = this.interactionForPlayer();
    this.showPrompt(this.promptFor(this.currentInteraction));
    if (this.frameReveal > 0 && this.frameReveal < 1) this.redrawBoards();
    this.grain.tilePositionX = this.cameras.main.scrollX * 0.34 + Math.sin(time / 5200) * 4;
  }

  textState() {
    const snapshot = this.studio.snapshot();
    return {
      scene: 'DrawingStudio',
      coordinateSystem: 'world pixels; origin top-left; x right; y down',
      objective: this.objectiveText(),
      player: {
        x: Math.round(this.walker.x),
        y: Math.round(this.walker.y),
        onGround: this.walker.body.blocked.down,
        facing: this.playerFacing < 0 ? 'left' : 'right',
        animation: this.playerAnimation,
      },
      selected: this.selected,
      interaction: this.currentInteraction,
      pointerSelection: {
        source: this.hoverSourceId,
        suctionProgress: Number((this.hold.progress / HOLD_SECONDS).toFixed(2)),
      },
      tutorialSeen: { ...this.tutorialSeen },
      ...snapshot,
      music: { playing: Boolean(this.music?.isPlaying), volume: Number((this.music?.volume ?? 0).toFixed(2)) },
    };
  }
}
