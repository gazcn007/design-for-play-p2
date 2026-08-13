import Phaser from 'phaser';
import {
  ARCH_GAP,
  ARCH_SEGMENTS,
  BAY_TITLES,
  CEILING_Y,
  DRAWBRIDGE_GAP,
  FLOOR_RUNS,
  FLOOR_Y,
  GAP_A,
  JUMP_VELOCITY,
  MOVE_SPEED,
  REACH,
  VESTIBULE,
  VIEW,
  WAINSCOT_Y,
  WORLD,
} from './carLayout.js';
import {
  PART_ONE_PIGMENTS,
  PART_ONE_SOURCES,
  createPaintedCar,
} from './paintedCarModel.js';
import { PAPER } from './paperPalette.js';
import { drawPigmentHalo, haloPointToward } from './pigmentHalo.js';
import {
  buildPaperGrain,
  draftLine,
  draftRect,
  hatchRect,
  makeRandom,
  paintedFill,
} from './paperSurface.js';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const DEPTH = Object.freeze({
  SHEET: 0,
  WINDOW: 4,
  WALL: 8,
  FIXTURE: 14,
  COLOR: 18,
  PUZZLE: 22,
  FIGURE: 30,
  PROMPT: 44,
  GRAIN: 70,
});

const SOURCE_LAYOUT = Object.freeze([
  { id: 'red-phone', x: 210, y: 390, kind: 'phone', scale: 0.72, rect: { x: 164, y: 330, w: 92, h: 66 } },
  { id: 'blue-teapot', x: 965, y: 377, kind: 'teapot', scale: 0.72, rect: { x: 922, y: 334, w: 86, h: 52 } },
  { id: 'yellow-lamp', x: 1160, y: 379, kind: 'lamp', scale: 0.68, rect: { x: 1124, y: 310, w: 72, h: 76 } },
  { id: 'green-chair', x: 1330, y: 414, kind: 'chair', scale: 0.65, rect: { x: 1289, y: 328, w: 82, h: 126 } },
  { id: 'violet-banner', x: 2145, y: 282, kind: 'banner', scale: 0.64, rect: { x: 2103, y: 210, w: 84, h: 104 } },
]);

const HOLD_SECONDS = 0.68;

const INTERACTION_ZONES = Object.freeze({
  'bridge-red': { x: GAP_A.x - 38, y: FLOOR_Y - 18 },
  arch: { x: ARCH_GAP.x - 42, y: FLOOR_Y - 18 },
  'counterweight-violet': { x: 2425, y: 382 },
  exit: { x: VESTIBULE.couplingX - 8, y: FLOOR_Y - 38 },
});

const colorCss = (value) => `#${value.toString(16).padStart(6, '0')}`;

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
    this.rnd = makeRandom(0x9a17);
    this.car = createPaintedCar();
    this.drawbridgeProgress = 0;
    this.transitioning = false;
    this.playerMovementDirection = 'still';
    this.figurePose = 'idle';
    this.figureDrawnPose = null;
    this.playerAnimation = 'idle';
    this.currentInteraction = null;
    this.hoverSourceId = null;
    this.hoverTargetId = null;
    this.hold = { key: null, progress: 0 };
    this.tutorialSeen = { extract: false, fill: false, counterweight: false, exit: false };

    this.cameras.main.setBackgroundColor(PAPER.sheet);
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.physics.world.setBounds(0, -250, WORLD.w, WORLD.h + 500);

    this.buildWorld();
    this.buildRoomObjects();
    this.buildVestibule();
    this.buildSolids();
    this.buildPlayer();
    this.buildDynamicLayers();
    this.buildPrompt();
    this.buildGrain();
    this.bindInput();
    this.startMusic();
    this.applyQaStart();
    this.redrawPuzzles();
  }

  startMusic() {
    this.music = this.sound.add('chapter4-drawing-music', { loop: true, volume: 0.28 });
    const play = () => { if (!this.music?.isPlaying) this.music?.play(); };
    if (this.sound.locked) this.sound.once('unlocked', play);
    else play();
    this.input.once('pointerdown', play);
    this.input.keyboard.once('keydown', play);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music?.stop());
  }

  graphics(depth) {
    return this.add.graphics().setDepth(depth);
  }

  buildWorld() {
    const g = this.graphics(DEPTH.SHEET);
    g.fillStyle(PAPER.sheet, 1).fillRect(0, 0, WORLD.w, WORLD.h);
    g.fillStyle(PAPER.sheetLow, 0.95).fillRect(0, 0, WORLD.w, CEILING_Y);
    g.fillStyle(PAPER.sheetMid, 0.72).fillRect(0, WAINSCOT_Y, WORLD.w, FLOOR_Y - WAINSCOT_Y);
    FLOOR_RUNS.forEach((run) => {
      g.fillStyle(PAPER.sheetLow, 1).fillRect(run.x, FLOOR_Y, run.w, WORLD.h - FLOOR_Y);
      hatchRect(g, this.rnd, run.x, FLOOR_Y + 3, run.w, 64, { spacing: 17, alpha: 0.19, flip: true });
    });

    [GAP_A, ARCH_GAP, DRAWBRIDGE_GAP].forEach((gap) => {
      g.fillStyle(PAPER.sheetHigh, 1).fillRect(gap.x, FLOOR_Y, gap.w, WORLD.h - FLOOR_Y);
      g.lineStyle(1.6, PAPER.deckle, 0.85);
      draftLine(g, this.rnd, gap.x, FLOOR_Y, gap.x, WORLD.h, { overshoot: 0, jitter: 2.1, segments: 8 });
      draftLine(g, this.rnd, gap.x + gap.w, FLOOR_Y, gap.x + gap.w, WORLD.h, { overshoot: 0, jitter: 2.1, segments: 8 });
    });

    const windows = [
      { x: 42, w: 300 }, { x: 690, w: 280 }, { x: 1000, w: 420 },
      { x: 1900, w: 380 }, { x: 2810, w: 420 },
    ];
    windows.forEach(({ x, w }, index) => {
      g.fillStyle(PAPER.sheetHigh, 0.96).fillRect(x, 118, w, 196);
      g.lineStyle(1.5, PAPER.graphiteSoft, 0.74);
      draftRect(g, this.rnd, x, 118, w, 196, { overshoot: 7, jitter: 0.7 });
      const hillY = 234 + (index % 2) * 12;
      g.fillStyle(PAPER.sheetMid, 0.82);
      g.fillTriangle(x, 314, x + w * 0.42, hillY, x + w * 0.7, 314);
      g.fillStyle(PAPER.sheetLow, 0.66);
      g.fillTriangle(x + w * 0.42, hillY, x + w, 282, x + w, 314);
      g.lineStyle(1.1, PAPER.graphiteFaint, 0.48);
      draftLine(g, this.rnd, x, 294, x + w, 276, { overshoot: 0, jitter: 1.8, segments: 12 });
    });

    g.lineStyle(1.8, PAPER.graphite, 0.86);
    draftLine(g, this.rnd, 0, CEILING_Y, WORLD.w, CEILING_Y, { overshoot: 0, jitter: 0.8, segments: 50 });
    draftLine(g, this.rnd, 0, WAINSCOT_Y, WORLD.w, WAINSCOT_Y, { overshoot: 0, jitter: 0.8, segments: 50 });
    FLOOR_RUNS.forEach((run) => {
      draftLine(g, this.rnd, run.x, FLOOR_Y, run.x + run.w, FLOOR_Y, { overshoot: 0, jitter: 0.9, segments: 18 });
    });

    BAY_TITLES.forEach(({ x, title }) => {
      this.add.text(x, 101, title, {
        fontFamily: MONO,
        fontSize: '10px',
        color: '#8d8579',
        letterSpacing: 1.7,
      }).setDepth(DEPTH.FIXTURE);
    });

    this.drawRoomDividers();
  }

  drawRoomDividers() {
    const g = this.graphics(DEPTH.WALL + 1);
    [760, 1885, 2900].forEach((x) => {
      g.fillStyle(PAPER.kraft, 0.22).fillRect(x - 8, CEILING_Y, 16, FLOOR_Y - CEILING_Y);
      g.lineStyle(1.2, PAPER.graphiteFaint, 0.56);
      draftLine(g, this.rnd, x, CEILING_Y, x, FLOOR_Y, { overshoot: 0, jitter: 1.6, segments: 18 });
    });
  }

  buildRoomObjects() {
    const fixture = this.graphics(DEPTH.FIXTURE);
    fixture.lineStyle(1.7, PAPER.graphite, 0.84);

    // Room I: the red telephone belongs on a small hall table, never as a
    // floating resource node.
    draftRect(fixture, this.rnd, 100, 405, 245, 18, { overshoot: 5 });
    [126, 320].forEach((x) => draftLine(fixture, this.rnd, x, 423, x, FLOOR_Y, { overshoot: 4 }));
    draftRect(fixture, this.rnd, 82, 172, 278, 128, { overshoot: 6 });
    this.drawFamilySketch(fixture, 98, 190);

    // Room II: a coherent sitting room. Teapot and lamp share a sideboard;
    // the green cushion stays inside the chair after its color is lifted.
    draftRect(fixture, this.rnd, 865, 402, 370, 20, { overshoot: 5 });
    [890, 1210].forEach((x) => draftLine(fixture, this.rnd, x, 422, x, FLOOR_Y, { overshoot: 4 }));
    draftRect(fixture, this.rnd, 1260, 334, 142, 102, { overshoot: 6 });
    draftLine(fixture, this.rnd, 1274, 436, 1274, FLOOR_Y, { overshoot: 4 });
    draftLine(fixture, this.rnd, 1388, 436, 1388, FLOOR_Y, { overshoot: 4 });
    fixture.lineStyle(1.1, PAPER.graphiteFaint, 0.55);
    for (let y = 190; y < 310; y += 24) draftLine(fixture, this.rnd, 810, y, 1420, y, { overshoot: 2, jitter: 0.5 });

    // Room III: two towers, a pulley and a hanging banner make the final
    // problem read like a small paper castle before it starts moving.
    this.drawCastleTower(fixture, 2490, 218, 76, FLOOR_Y - 218, false);
    this.drawCastleTower(fixture, 2790, 218, 82, FLOOR_Y - 218, true);
    fixture.lineStyle(2, PAPER.graphite, 0.85);
    fixture.strokeCircle(2497, 226, 18);
    fixture.strokeCircle(2497, 226, 8);

    this.sourceArt = new Map();
    SOURCE_LAYOUT.forEach((layout) => {
      const art = this.graphics(DEPTH.COLOR);
      art.setScale(layout.scale).setPosition(layout.x * (1 - layout.scale), layout.y * (1 - layout.scale));
      this.sourceArt.set(layout.id, art);
    });
    this.redrawSources();
  }

  drawFamilySketch(g, x, y) {
    g.lineStyle(1.1, PAPER.graphiteSoft, 0.55);
    g.strokeCircle(x + 44, y + 36, 14);
    g.strokeCircle(x + 93, y + 40, 12);
    g.strokeCircle(x + 145, y + 32, 15);
    draftLine(g, this.rnd, x + 22, y + 92, x + 166, y + 92, { overshoot: 4, jitter: 0.8 });
  }

  drawCastleTower(g, x, y, w, h, farSide) {
    g.fillStyle(PAPER.sheetMid, farSide ? 0.88 : 0.96).fillRect(x, y, w, h);
    g.lineStyle(1.8, PAPER.graphite, 0.85);
    draftRect(g, this.rnd, x, y, w, h, { overshoot: 6, jitter: 0.8 });
    const tooth = w / 5;
    for (let i = 0; i < 5; i += 2) {
      g.fillStyle(PAPER.sheet, 1).fillRect(x + i * tooth, y - 22, tooth, 24);
      draftRect(g, this.rnd, x + i * tooth, y - 22, tooth, 24, { overshoot: 2, jitter: 0.5 });
    }
    hatchRect(g, this.rnd, x + 8, y + 20, w - 16, h - 30, { spacing: 13, alpha: 0.16, flip: farSide });
  }

  redrawSources() {
    SOURCE_LAYOUT.forEach((layout) => {
      const g = this.sourceArt.get(layout.id);
      const item = this.car.source(layout.id);
      const pigment = this.car.pigment(item.pigment);
      const live = !item.drained;
      g.clear();
      const suctionProgress = this.hold.key === `source:${layout.id}`
        ? Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1)
        : 0;
      g.setAlpha(live ? 1 - suctionProgress * 0.58 : 1);
      if (layout.kind === 'phone') this.drawPhone(g, layout, pigment, live);
      else if (layout.kind === 'teapot') this.drawTeapot(g, layout, pigment, live);
      else if (layout.kind === 'lamp') this.drawLamp(g, layout, pigment, live);
      else if (layout.kind === 'chair') this.drawChair(g, layout, pigment, live);
      else this.drawBanner(g, layout, pigment, live);
    });
  }

  handPaint(g, x, y, w, h, color, live) {
    if (!live) return;
    paintedFill(g, this.rnd, x, y, w, h, color, { alpha: 0.82, inset: 2 });
    g.lineStyle(1.2, color, 0.42);
    for (let yy = y + 6; yy < y + h - 3; yy += 7) {
      draftLine(g, this.rnd, x + 4, yy, x + w - 5, yy + (this.rnd() - 0.5) * 4, {
        overshoot: 0,
        jitter: 1.4,
        segments: 5,
      });
    }
  }

  drawPhone(g, { x, y }, pigment, live) {
    this.handPaint(g, x - 50, y - 43, 100, 43, pigment.color, live);
    this.handPaint(g, x - 56, y - 72, 112, 24, pigment.color, live);
    g.lineStyle(2, PAPER.graphite, live ? 0.9 : 0.62);
    draftRect(g, this.rnd, x - 50, y - 43, 100, 43, { overshoot: 4 });
    draftLine(g, this.rnd, x - 55, y - 70, x + 55, y - 70, { overshoot: 4 });
    draftLine(g, this.rnd, x - 55, y - 70, x - 38, y - 49, { overshoot: 2 });
    draftLine(g, this.rnd, x + 55, y - 70, x + 38, y - 49, { overshoot: 2 });
    g.strokeCircle(x, y - 23, 15);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      g.strokeCircle(x + Math.cos(a) * 9, y - 23 + Math.sin(a) * 9, 1.6);
    }
    draftLine(g, this.rnd, x + 50, y - 29, x + 72, y - 7, { overshoot: 0, jitter: 2, segments: 5 });
  }

  drawTeapot(g, { x, y }, pigment, live) {
    if (live) {
      g.fillStyle(pigment.color, 0.78).fillEllipse(x, y - 22, 90, 58);
      g.lineStyle(1.2, pigment.color, 0.48);
      for (let yy = y - 42; yy < y - 5; yy += 7) g.lineBetween(x - 34, yy, x + 34, yy + 3);
    }
    g.lineStyle(2, PAPER.graphite, live ? 0.88 : 0.6).strokeEllipse(x, y - 22, 90, 58);
    draftLine(g, this.rnd, x - 42, y - 33, x - 72, y - 48, { overshoot: 2 });
    draftLine(g, this.rnd, x - 72, y - 48, x - 45, y - 11, { overshoot: 2 });
    g.strokeCircle(x + 49, y - 23, 27);
    draftLine(g, this.rnd, x - 18, y - 54, x + 18, y - 54, { overshoot: 4 });
  }

  drawLamp(g, { x, y }, pigment, live) {
    this.handPaint(g, x - 45, y - 94, 90, 52, pigment.color, live);
    g.lineStyle(2, PAPER.graphite, live ? 0.88 : 0.6);
    draftLine(g, this.rnd, x - 45, y - 42, x + 45, y - 42, { overshoot: 3 });
    draftLine(g, this.rnd, x - 45, y - 42, x - 28, y - 94, { overshoot: 3 });
    draftLine(g, this.rnd, x - 28, y - 94, x + 28, y - 94, { overshoot: 3 });
    draftLine(g, this.rnd, x + 28, y - 94, x + 45, y - 42, { overshoot: 3 });
    draftLine(g, this.rnd, x, y - 42, x, y - 4, { overshoot: 3 });
    draftLine(g, this.rnd, x - 34, y, x + 34, y, { overshoot: 4 });
  }

  drawChair(g, { x, y }, pigment, live) {
    this.handPaint(g, x - 54, y - 55, 108, 48, pigment.color, live);
    g.lineStyle(2, PAPER.graphite, live ? 0.88 : 0.6);
    draftRect(g, this.rnd, x - 54, y - 55, 108, 48, { overshoot: 5 });
    draftLine(g, this.rnd, x - 54, y - 55, x - 54, y - 126, { overshoot: 5 });
    draftLine(g, this.rnd, x + 54, y - 55, x + 54, y - 126, { overshoot: 5 });
    draftLine(g, this.rnd, x - 54, y - 126, x + 54, y - 126, { overshoot: 5 });
    draftLine(g, this.rnd, x - 40, y - 7, x - 40, FLOOR_Y, { overshoot: 3 });
    draftLine(g, this.rnd, x + 40, y - 7, x + 40, FLOOR_Y, { overshoot: 3 });
  }

  drawBanner(g, { x, y }, pigment, live) {
    g.lineStyle(2, PAPER.graphite, live ? 0.88 : 0.6);
    draftLine(g, this.rnd, x - 65, y - 104, x + 65, y - 104, { overshoot: 6 });
    this.handPaint(g, x - 52, y - 96, 104, 126, pigment.color, live);
    draftLine(g, this.rnd, x - 52, y - 96, x - 52, y + 30, { overshoot: 3 });
    draftLine(g, this.rnd, x + 52, y - 96, x + 52, y + 30, { overshoot: 3 });
    draftLine(g, this.rnd, x - 52, y + 30, x, y + 5, { overshoot: 2 });
    draftLine(g, this.rnd, x, y + 5, x + 52, y + 30, { overshoot: 2 });
    g.strokeCircle(x, y - 48, 25);
    draftLine(g, this.rnd, x - 17, y - 48, x + 17, y - 48, { overshoot: 1 });
    draftLine(g, this.rnd, x, y - 65, x, y - 31, { overshoot: 1 });
  }

  buildVestibule() {
    const g = this.graphics(DEPTH.FIXTURE);
    // There is deliberately no second doorway here. The castle landing simply
    // opens into the vestibule; only the coupling door is drawn.
    g.fillStyle(PAPER.sheetHigh, 0.54).fillRect(VESTIBULE.x, 132, VESTIBULE.w, FLOOR_Y - 132);
    hatchRect(g, this.rnd, VESTIBULE.x + 16, 148, VESTIBULE.w - 32, FLOOR_Y - 176, {
      spacing: 16,
      alpha: 0.12,
      flip: true,
    });
    g.lineStyle(1.8, PAPER.graphite, 0.86);
    draftRect(g, this.rnd, VESTIBULE.couplingX - 58, 286, 98, 184, { overshoot: 7, jitter: 0.8 });
    draftRect(g, this.rnd, VESTIBULE.couplingX - 44, 304, 70, 148, { overshoot: 4, jitter: 0.5 });
    this.couplingDoor = this.add.rectangle(VESTIBULE.couplingX - 9, 378, 66, 144, PAPER.sheetMid, 0.78)
      .setDepth(DEPTH.FIXTURE - 0.2);
    this.add.text(VESTIBULE.x + 82, 196, 'VESTIBULE', {
      fontFamily: MONO,
      fontSize: '11px',
      color: '#8d8579',
      letterSpacing: 2,
    }).setDepth(DEPTH.FIXTURE + 1);
  }

  buildSolids() {
    const solid = (x, y, w, h) => {
      const object = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0);
      this.physics.add.existing(object, true);
      return object;
    };
    this.floorSolids = FLOOR_RUNS.map((run) => solid(run.x, FLOOR_Y, run.w, 56));
    this.floorSolids.push(solid(-20, -200, 20, 900), solid(WORLD.w, -200, 20, 900));
    this.bridgeSolid = solid(GAP_A.x, FLOOR_Y - 25, GAP_A.w, 25);
    this.archSolids = ARCH_SEGMENTS.map((part) => solid(part.x, part.y, part.w, FLOOR_Y - part.y));
    this.drawbridgeSolid = solid(DRAWBRIDGE_GAP.x, FLOOR_Y - 24, DRAWBRIDGE_GAP.w, 24);
    this.bridgeSolid.body.enable = false;
    this.archSolids.forEach((body) => { body.body.enable = false; });
    this.drawbridgeSolid.body.enable = false;
  }

  buildPlayer() {
    this.walker = this.add.rectangle(56, 400, 18, 62, 0xffffff, 0);
    this.physics.add.existing(this.walker);
    this.walker.body.setCollideWorldBounds(false);
    [...this.floorSolids, this.bridgeSolid, ...this.archSolids, this.drawbridgeSolid]
      .forEach((object) => this.physics.add.collider(this.walker, object));
    this.figure = this.graphics(DEPTH.FIGURE).setPosition(this.walker.x, FLOOR_Y);
    this.drawFigure();
    this.cameras.main.startFollow(this.walker, true, 0.1, 0.12);
    this.cameras.main.setDeadzone(280, 190);
  }

  buildDynamicLayers() {
    this.puzzleArt = this.graphics(DEPTH.PUZZLE);
    this.carriedArt = this.graphics(DEPTH.FIGURE + 1);
    this.pointerArt = this.graphics(DEPTH.PROMPT - 2);
  }

  buildPrompt() {
    this.promptFrame = this.graphics(DEPTH.PROMPT);
    this.promptText = this.add.text(0, 0, '', {
      fontFamily: MONO,
      fontSize: '10px',
      color: '#4a4640',
      align: 'center',
      lineSpacing: 4,
      letterSpacing: 1.15,
      padding: { x: 9, y: 7 },
    }).setOrigin(0.5, 1).setDepth(DEPTH.PROMPT + 1).setVisible(false);
  }

  buildGrain() {
    const key = buildPaperGrain(this, 'paper-grain-painted-country-v3');
    this.grain = this.add.tileSprite(0, 0, VIEW.w, VIEW.h, key)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.GRAIN)
      .setAlpha(0.7);
  }

  bindInput() {
    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', up: 'UP', a: 'A', d: 'D', w: 'W', space: 'SPACE',
    });
    this.input.keyboard.addCapture(['LEFT', 'RIGHT', 'UP', 'SPACE']);
    this.input.mouse?.disableContextMenu();
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-F', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });
  }

  applyQaStart() {
    if (!import.meta.env.DEV) return;
    const qa = new URLSearchParams(window.location.search).get('qa');
    const figurePose = qa?.startsWith('figure-') ? qa.slice('figure-'.length) : null;
    if (['idle', 'walk', 'paint', 'wash'].includes(figurePose)) {
      this.qaFigurePose = figurePose;
      return;
    }
    if (!['arch', 'drawbridge', 'vestibule'].includes(qa)) return;

    const solve = (source, target) => {
      this.car.extract(source);
      this.car.fill(target);
    };
    solve('red-phone', 'bridge-red');
    if (qa === 'arch') {
      this.walker.setPosition(1400, 400);
    } else {
      solve('blue-teapot', 'arch-blue');
      solve('yellow-lamp', 'arch-yellow');
      solve('green-chair', 'arch-green');
      if (qa === 'drawbridge') {
        this.car.extract('violet-banner');
        this.walker.setPosition(2380, 400);
      } else {
        solve('violet-banner', 'counterweight-violet');
        this.drawbridgeProgress = 1;
        this.walker.setPosition(VESTIBULE.couplingX - 90, 400);
      }
    }
    this.car.drainEvents();
    this.redrawSources();
  }

  sourceAt(x, y) {
    return SOURCE_LAYOUT.find((layout) => !this.car.isDrained(layout.id) && Phaser.Geom.Rectangle.Contains(
      new Phaser.Geom.Rectangle(layout.rect.x, layout.rect.y, layout.rect.w, layout.rect.h),
      x,
      y,
    )) ?? null;
  }

  targetInteractionAt(x, y) {
    if (!this.car.isFilled('bridge-red') && Phaser.Geom.Rectangle.Contains(
      new Phaser.Geom.Rectangle(GAP_A.x - 8, FLOOR_Y - 58, GAP_A.w + 16, 70), x, y,
    )) return { id: 'bridge-red', rect: { x: GAP_A.x - 8, y: FLOOR_Y - 58, w: GAP_A.w + 16, h: 70 } };

    const arch = ARCH_SEGMENTS.find((part) => !this.car.isFilled(part.id) && Phaser.Geom.Rectangle.Contains(
      new Phaser.Geom.Rectangle(part.x - 5, part.y - 8, part.w + 10, FLOOR_Y - part.y + 16), x, y,
    ));
    if (arch) return { id: arch.id, rect: { x: arch.x - 5, y: arch.y - 8, w: arch.w + 10, h: FLOOR_Y - arch.y + 16 } };

    const weightTop = 278 + this.drawbridgeProgress * 102;
    if (!this.car.drawbridgeOpen() && Phaser.Geom.Rectangle.Contains(
      new Phaser.Geom.Rectangle(2382, weightTop - 8, 88, 82), x, y,
    )) return { id: 'counterweight-violet', rect: { x: 2382, y: weightTop - 8, w: 88, h: 82 } };
    return null;
  }

  pointerWorld(pointer = this.input.activePointer) {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  exitInteractionAt(x, y) {
    if (!this.car.allTargetsFilled()) return null;
    const rect = { x: VESTIBULE.couplingX - 58, y: 282, w: 104, h: 190 };
    if (!Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(rect.x, rect.y, rect.w, rect.h), x, y)) return null;
    if (Math.abs(this.walker.x - INTERACTION_ZONES.exit.x) > REACH + 55) return null;
    return { id: 'exit', rect };
  }

  pointedInteraction() {
    const pointer = this.input.activePointer;
    const world = this.pointerWorld(pointer);
    const source = this.sourceAt(world.x, world.y);
    if (source) return { type: 'source', id: source.id, x: source.x, y: source.y, source: this.car.source(source.id) };
    const target = this.targetInteractionAt(world.x, world.y);
    if (target) return { type: 'target', id: target.id, ...INTERACTION_ZONES[target.id.startsWith('arch-') ? 'arch' : target.id] };
    const exit = this.exitInteractionAt(world.x, world.y);
    return exit ? { type: 'exit', id: 'exit', ...INTERACTION_ZONES.exit } : null;
  }

  setHold(key, dt) {
    if (this.hold.key !== key) this.hold = { key, progress: 0 };
    this.hold.progress += dt;
    return this.hold.progress >= HOLD_SECONDS;
  }

  resetHold() {
    if (this.hold.key?.startsWith('source:')) {
      this.hold = { key: null, progress: 0 };
      this.redrawSources();
      return;
    }
    this.hold = { key: null, progress: 0 };
  }

  stepPointerInteraction(dt) {
    if (this.transitioning) return this.resetHold();
    const pointer = this.input.activePointer;
    const world = this.pointerWorld(pointer);
    const source = this.sourceAt(world.x, world.y);
    const target = this.targetInteractionAt(world.x, world.y);
    const exit = this.exitInteractionAt(world.x, world.y);
    this.hoverSourceId = source?.id ?? null;
    this.hoverTargetId = target?.id ?? null;

    if (source && pointer.rightButtonDown()) {
      if (this.setHold(`source:${source.id}`, dt)) {
        const item = this.car.source(source.id);
        if (this.car.extract(source.id)) {
          this.tutorialSeen.extract = true;
          this.colorLiftBurst(source.x, source.y - 28, this.car.pigment(item.pigment).color);
        }
        this.hold = { key: null, progress: 0 };
        this.redrawSources();
        this.handleEvents();
      } else {
        this.redrawSources();
      }
      return;
    }

    if (target && pointer.leftButtonDown()) {
      if (this.setHold(`target:${target.id}`, dt)) {
        if (this.car.fill(target.id)) {
          if (target.id === 'counterweight-violet') this.tutorialSeen.counterweight = true;
          else this.tutorialSeen.fill = true;
        }
        this.hold = { key: null, progress: 0 };
        this.handleEvents();
      }
      return;
    }
    if (exit && pointer.leftButtonDown()) {
      if (this.setHold('exit', dt)) {
        if (this.car.enterExit()) this.tutorialSeen.exit = true;
        this.hold = { key: null, progress: 0 };
        this.handleEvents();
      }
      return;
    }
    this.resetHold();
  }

  drawPointerFeedback() {
    const g = this.pointerArt;
    g.clear();
    const source = SOURCE_LAYOUT.find(({ id }) => id === this.hoverSourceId);
    const world = this.pointerWorld();
    const target = this.targetInteractionAt(world.x, world.y);
    const exit = this.exitInteractionAt(world.x, world.y);
    let color = PAPER.cyan;
    let rect = null;
    if (source) {
      color = this.car.pigment(this.car.source(source.id).pigment).color;
      rect = source.rect;
    } else if (target) {
      color = this.car.pigment(this.car.target(target.id).pigment).color;
      rect = target.rect;
    } else if (exit) {
      color = PAPER.cyan;
      rect = exit.rect;
    }
    if (rect) {
      g.lineStyle(2.2, color, 0.94);
      draftRect(g, makeRandom(0x7440 + Math.floor(rect.x)), rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8, {
        overshoot: 4,
        jitter: 0.8,
      });
    }
    if (!this.hold.key) return;
    const progress = Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1);
    const head = { x: this.walker.x, y: this.walker.y - 50 };
    const centre = rect ? { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 } : head;
    const haloEdge = haloPointToward(head.x, head.y, centre.x, centre.y, 36);
    const from = this.hold.key.startsWith('source:') ? centre : haloEdge;
    const destination = this.hold.key.startsWith('source:') ? haloEdge : centre;
    const end = {
      x: Phaser.Math.Linear(from.x, destination.x, progress),
      y: Phaser.Math.Linear(from.y, destination.y, progress),
    };
    g.lineStyle(2.5, color, 0.72);
    [-2.5, 2.5].forEach((offset) => draftLine(g, makeRandom(0x7580 + offset), from.x, from.y + offset, end.x, end.y + offset * 0.25, {
      overshoot: 0,
      jitter: 1.2,
      segments: 9,
    }));
  }

  nearestInteraction() {
    const wx = this.walker.x;
    const candidates = [];
    SOURCE_LAYOUT.forEach((layout) => {
      if (this.car.isDrained(layout.id)) return;
      const source = this.car.source(layout.id);
      candidates.push({ type: 'source', id: layout.id, x: layout.x, y: layout.y, distance: Math.abs(wx - layout.x), source });
    });
    if (!this.car.isFilled('bridge-red')) {
      candidates.push({ type: 'target', id: 'bridge-red', ...INTERACTION_ZONES['bridge-red'], distance: Math.abs(wx - INTERACTION_ZONES['bridge-red'].x) });
    }
    if (!this.car.archComplete()) {
      const next = ['arch-blue', 'arch-yellow', 'arch-green'].find((id) => !this.car.isFilled(id));
      candidates.push({ type: 'target', id: next, ...INTERACTION_ZONES.arch, distance: Math.abs(wx - INTERACTION_ZONES.arch.x) });
    }
    if (!this.car.drawbridgeOpen()) {
      candidates.push({ type: 'target', id: 'counterweight-violet', ...INTERACTION_ZONES['counterweight-violet'], distance: Math.abs(wx - INTERACTION_ZONES['counterweight-violet'].x) });
    }
    if (wx >= VESTIBULE.x) {
      candidates.push({ type: 'exit', id: 'exit', ...INTERACTION_ZONES.exit, distance: Math.abs(wx - INTERACTION_ZONES.exit.x) });
    }
    return candidates.filter((item) => item.distance <= REACH).sort((a, b) => a.distance - b.distance)[0] ?? null;
  }

  promptFor(interaction) {
    if (!interaction) return null;
    if (interaction.type === 'source') {
      const item = this.car.source(interaction.id);
      const pigment = this.car.pigment(item.pigment);
      return {
        text: this.tutorialSeen.extract ? `RIGHT-HOLD TO LIFT\n${pigment.name}` : 'POINT AT THE COLORED OBJECT\nRIGHT-HOLD TO DRAW OUT PIGMENT',
        color: pigment.color,
        x: interaction.x,
        y: interaction.y - 96,
      };
    }
    if (interaction.id === 'bridge-red') {
      return {
        text: this.tutorialSeen.fill ? 'LEFT-HOLD TO PAINT\nTHE DRAWN BRIDGE' : 'POINT AT THE BRIDGE\nLEFT-HOLD TO PAINT',
        color: this.car.pigment('red').color,
        x: GAP_A.x + 36,
        y: FLOOR_Y - 58,
      };
    }
    if (interaction.id.startsWith('arch-')) {
      const pigmentId = this.car.target(interaction.id).pigment;
      const pigment = this.car.pigment(pigmentId);
      return {
        text: `LEFT-HOLD THIS THIRD\nFOR ${pigment.name}`,
        color: pigment.color,
        x: ARCH_GAP.x + 58,
        y: 354,
      };
    }
    if (interaction.id === 'counterweight-violet') {
      return {
        text: this.tutorialSeen.counterweight ? 'LEFT-HOLD THE WEIGHT\nTO LOAD MULBERRY' : 'POINT AT THE HANGING WEIGHT\nLEFT-HOLD TO PAINT',
        color: this.car.pigment('violet').color,
        x: 2425,
        y: 316,
      };
    }
    return {
      text: this.tutorialSeen.exit ? 'THE OPEN SHEET OPENS' : 'POINT AT THE ONLY DOOR\nLEFT-HOLD TO ENTER',
      color: PAPER.cyan,
      x: VESTIBULE.couplingX - 8,
      y: 278,
    };
  }

  showPrompt(spec) {
    this.promptFrame.clear();
    if (!spec) {
      this.promptText.setVisible(false);
      return;
    }
    this.promptText.setText(spec.text).setPosition(spec.x, spec.y).setColor(colorCss(spec.color)).setVisible(true);
    const bounds = this.promptText.getBounds();
    this.promptFrame.fillStyle(PAPER.sheetHigh, 0.94).fillRoundedRect(bounds.x - 5, bounds.y - 4, bounds.width + 10, bounds.height + 8, 3);
    this.promptFrame.lineStyle(1.6, PAPER.graphiteSoft, 0.82);
    draftRect(this.promptFrame, makeRandom(Math.floor(spec.x * 17 + spec.y)), bounds.x - 5, bounds.y - 4, bounds.width + 10, bounds.height + 8, {
      overshoot: 3,
      jitter: 0.7,
    });
    this.promptFrame.lineStyle(2.4, spec.color, 0.84);
    draftLine(this.promptFrame, makeRandom(Math.floor(spec.x * 23)), bounds.x + 8, bounds.y + bounds.height + 1, bounds.x + bounds.width - 8, bounds.y + bounds.height + 1, {
      overshoot: 0,
      jitter: 1,
      segments: 5,
    });
  }

  handleEvents() {
    this.car.drainEvents().forEach((event) => {
      if (event.type === 'missing-color') {
        const pigment = this.car.pigment(event.pigment);
        this.localFeedback(`${pigment.name} IS STILL\nINSIDE A ROOM OBJECT`, pigment.color);
      } else if (event.type === 'target-filled') {
        const pigment = this.car.pigment(event.pigment);
        this.localFeedback(`${pigment.name} STAYS\nIN THE PAPER`, pigment.color);
      } else if (event.type === 'drawbridge-opened') {
        this.tweens.add({ targets: this, drawbridgeProgress: 1, duration: 1450, ease: 'Sine.easeInOut' });
      } else if (event.type === 'car-complete') {
        this.playCompletion();
      }
    });
  }

  localFeedback(text, color) {
    const note = this.add.text(this.walker.x, this.walker.y - 86, text, {
      fontFamily: MONO,
      fontSize: '10px',
      color: colorCss(color),
      align: 'center',
      lineSpacing: 3,
      backgroundColor: '#fdfcf8ee',
      padding: { x: 10, y: 7 },
    }).setOrigin(0.5, 1).setDepth(DEPTH.PROMPT + 3);
    this.tweens.add({ targets: note, y: note.y - 14, alpha: 0, delay: 700, duration: 700, onComplete: () => note.destroy() });
  }

  colorLiftBurst(x, y, color) {
    for (let i = 0; i < 7; i += 1) {
      const dot = this.add.rectangle(x + (this.rnd() - 0.5) * 50, y + (this.rnd() - 0.5) * 30, 3 + this.rnd() * 5, 1.5, color, 0.72)
        .setRotation((this.rnd() - 0.5) * 0.8)
        .setDepth(DEPTH.PROMPT - 1);
      this.tweens.add({
        targets: dot,
        x: this.walker.x,
        y: this.walker.y - 24,
        alpha: 0,
        duration: 420 + i * 45,
        ease: 'Sine.easeIn',
        onComplete: () => dot.destroy(),
      });
    }
  }

  redrawPuzzles() {
    const g = this.puzzleArt;
    g.clear();
    const rnd = makeRandom(0x4149);
    this.drawShortBridge(g, rnd);
    this.drawArch(g, rnd);
    this.drawDrawbridge(g, rnd);

    this.bridgeSolid.body.enable = this.car.isFilled('bridge-red');
    const archReady = this.car.archComplete();
    this.archSolids.forEach((body) => { body.body.enable = archReady; });
    this.drawbridgeSolid.body.enable = this.car.drawbridgeOpen() && this.drawbridgeProgress > 0.92;
  }

  drawShortBridge(g, rnd) {
    g.fillStyle(PAPER.sheetHigh, 0.72).fillRect(GAP_A.x, FLOOR_Y - 25, GAP_A.w, 25);
    g.lineStyle(2, this.car.isFilled('bridge-red') ? this.car.pigment('red').color : PAPER.cyan, 0.82);
    draftRect(g, rnd, GAP_A.x, FLOOR_Y - 25, GAP_A.w, 25, { overshoot: 5, jitter: 0.7 });
    if (this.car.isFilled('bridge-red')) {
      paintedFill(g, rnd, GAP_A.x, FLOOR_Y - 25, GAP_A.w, 25, this.car.pigment('red').color, { alpha: 0.82 });
      g.lineStyle(1.1, this.car.pigment('red').color, 0.54);
      for (let x = GAP_A.x + 8; x < GAP_A.x + GAP_A.w; x += 18) {
        draftLine(g, rnd, x, FLOOR_Y - 20, x + 12, FLOOR_Y - 7, { overshoot: 0, jitter: 1.2, segments: 3 });
      }
    }
  }

  drawArch(g, rnd) {
    ARCH_SEGMENTS.forEach((part) => {
      const pigmentId = this.car.target(part.id).pigment;
      const pigment = this.car.pigment(pigmentId);
      const filled = this.car.isFilled(part.id);
      g.fillStyle(filled ? pigment.color : PAPER.sheetHigh, filled ? 0.8 : 0.68).fillRect(part.x, part.y, part.w, FLOOR_Y - part.y);
      if (filled) {
        g.lineStyle(1.1, pigment.color, 0.48);
        for (let yy = part.y + 7; yy < FLOOR_Y; yy += 8) {
          draftLine(g, rnd, part.x + 4, yy, part.x + part.w - 4, yy + 3, { overshoot: 0, jitter: 1.4, segments: 5 });
        }
      }
      g.lineStyle(2, filled ? pigment.color : PAPER.cyan, filled ? 0.86 : 0.62);
      draftRect(g, rnd, part.x, part.y, part.w, FLOOR_Y - part.y, { overshoot: 4, jitter: 0.8 });
    });

    // Cut an arch opening out of the three blocks, so it reads as one bridge
    // with three colored thirds rather than three ordinary platforms.
    g.fillStyle(PAPER.sheetHigh, 1).fillEllipse(ARCH_GAP.x + ARCH_GAP.w / 2, FLOOR_Y + 8, 238, 154);
    g.lineStyle(2, PAPER.graphite, 0.78);
    g.beginPath();
    g.arc(ARCH_GAP.x + ARCH_GAP.w / 2, FLOOR_Y + 8, 119, Math.PI, Math.PI * 2);
    g.strokePath();
    g.lineStyle(1.1, PAPER.graphiteFaint, 0.56);
    draftLine(g, rnd, ARCH_GAP.x + 110, 390, ARCH_GAP.x + 110, FLOOR_Y - 10, { overshoot: 2 });
    draftLine(g, rnd, ARCH_GAP.x + 220, 390, ARCH_GAP.x + 220, FLOOR_Y - 10, { overshoot: 2 });
  }

  drawDrawbridge(g, rnd) {
    const p = Phaser.Math.Clamp(this.drawbridgeProgress, 0, 1);
    const hinge = { x: DRAWBRIDGE_GAP.x, y: FLOOR_Y - 10 };
    const angle = -Math.PI / 2 + (Math.PI / 2) * p;
    const length = DRAWBRIDGE_GAP.w;
    const thickness = 22;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const nx = -uy;
    const ny = ux;
    const end = { x: hinge.x + ux * length, y: hinge.y + uy * length };
    const points = [
      new Phaser.Geom.Point(hinge.x + nx * thickness / 2, hinge.y + ny * thickness / 2),
      new Phaser.Geom.Point(end.x + nx * thickness / 2, end.y + ny * thickness / 2),
      new Phaser.Geom.Point(end.x - nx * thickness / 2, end.y - ny * thickness / 2),
      new Phaser.Geom.Point(hinge.x - nx * thickness / 2, hinge.y - ny * thickness / 2),
    ];
    g.fillStyle(PAPER.kraft, 0.76).fillPoints(points, true);
    g.lineStyle(2, PAPER.graphite, 0.88);
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      draftLine(g, rnd, a.x, a.y, b.x, b.y, { overshoot: 2, jitter: 0.7, segments: 6 });
    }
    for (let i = 1; i < 7; i += 1) {
      const bx = hinge.x + ux * (length * i / 7);
      const by = hinge.y + uy * (length * i / 7);
      draftLine(g, rnd, bx + nx * 9, by + ny * 9, bx - nx * 9, by - ny * 9, { overshoot: 1, jitter: 0.6 });
    }

    const weightTop = 278 + p * 102;
    const weightColor = this.car.drawbridgeOpen() ? this.car.pigment('violet').color : PAPER.sheetHigh;
    g.fillStyle(weightColor, this.car.drawbridgeOpen() ? 0.84 : 0.9).fillRoundedRect(2390, weightTop, 72, 66, 4);
    g.lineStyle(2, this.car.drawbridgeOpen() ? this.car.pigment('violet').color : PAPER.cyan, 0.84);
    draftRect(g, rnd, 2390, weightTop, 72, 66, { overshoot: 5, jitter: 0.8 });
    if (this.car.drawbridgeOpen()) {
      g.lineStyle(1.1, this.car.pigment('violet').color, 0.5);
      for (let yy = weightTop + 8; yy < weightTop + 60; yy += 8) {
        draftLine(g, rnd, 2396, yy, 2456, yy + 2, { overshoot: 0, jitter: 1.2, segments: 4 });
      }
    }
    g.lineStyle(1.8, PAPER.graphite, 0.76);
    draftLine(g, rnd, 2426, weightTop, 2497, 226, { overshoot: 0, jitter: 0.8, segments: 8 });
    draftLine(g, rnd, 2497, 226, end.x, end.y, { overshoot: 0, jitter: 0.8, segments: 10 });
  }

  drawCarriedPigments(time) {
    const g = this.carriedArt;
    g.clear();
    const inventory = this.car.snapshot().inventory;
    const sourceId = this.hold.key?.startsWith('source:') ? this.hold.key.slice('source:'.length) : null;
    const progressId = sourceId ? this.car.source(sourceId)?.pigment : null;
    if (!inventory.length && !progressId) return;
    drawPigmentHalo(g, {
      x: this.walker.x,
      y: this.walker.y - 50,
      pigments: PART_ONE_PIGMENTS,
      activeIds: inventory,
      selectedId: inventory[0] ?? null,
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

    if (this.walker.y > VIEW.h + 90) {
      const respawnX = this.walker.x < 720 ? 80 : this.walker.x < 1880 ? 820 : 1930;
      this.walker.setPosition(respawnX, 400);
      this.walker.body.setVelocity(0, 0);
    }
  }

  drawFigure() {
    const g = this.figure;
    const pose = this.figurePose;
    const rnd = makeRandom(0xb07c4 + (pose === 'paint' ? 11 : pose === 'wash' ? 23 : 0));
    const raised = pose === 'paint' || pose === 'wash';
    const accent = pose === 'paint' ? PAPER.bookCloth : PAPER.indigo;
    const traceLimb = (points, width = 10) => {
      g.lineStyle(width + 3, PAPER.graphite, 0.9);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => g.lineTo(point.x, point.y));
      g.strokePath();
      g.lineStyle(width, PAPER.sheetMid, 1);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => g.lineTo(point.x, point.y));
      g.strokePath();
    };

    g.clear();

    // Short, planted legs. Walking never cycles through foot frames; the whole
    // drawing rocks from its feet in updateFigurePose().
    traceLimb([{ x: -8, y: -28 }, { x: -10, y: -2 }], 9);
    traceLimb([{ x: 8, y: -28 }, { x: 10, y: -2 }], 9);
    g.fillStyle(PAPER.figureSoft, 0.96);
    g.fillRoundedRect(-19, -7, 18, 9, 4);
    g.fillRoundedRect(1, -7, 18, 9, 4);

    // A very simple front-facing jacket: broad paper planes and just enough
    // graphite construction to belong to the carriage drawing.
    g.fillStyle(PAPER.sheetMid, 1);
    g.fillPoints([
      new Phaser.Geom.Point(-18, -58),
      new Phaser.Geom.Point(18, -58),
      new Phaser.Geom.Point(16, -25),
      new Phaser.Geom.Point(-16, -25),
    ], true);
    g.lineStyle(2, PAPER.graphite, 0.92);
    draftLine(g, rnd, -18, -58, 18, -58, { overshoot: 2, jitter: 0.45, segments: 5 });
    draftLine(g, rnd, 18, -58, 16, -25, { overshoot: 2, jitter: 0.45, segments: 5 });
    draftLine(g, rnd, 16, -25, -16, -25, { overshoot: 2, jitter: 0.45, segments: 5 });
    draftLine(g, rnd, -16, -25, -18, -58, { overshoot: 2, jitter: 0.45, segments: 5 });

    const leftArm = [{ x: -16, y: -53 }, { x: -23, y: -35 }, { x: -22, y: -18 }];
    const rightArm = raised
      ? [{ x: 16, y: -53 }, { x: 29, y: -69 }, { x: 26, y: -87 }]
      : [{ x: 16, y: -53 }, { x: 23, y: -35 }, { x: 22, y: -18 }];
    traceLimb(leftArm, 7);
    traceLimb(rightArm, 7);
    [leftArm.at(-1), rightArm.at(-1)].forEach((hand) => {
      g.fillStyle(PAPER.sheetHigh, 1).fillCircle(hand.x, hand.y, 5);
      g.lineStyle(1.5, PAPER.graphite, 0.9).strokeCircle(hand.x, hand.y, 5);
    });

    if (raised) {
      g.lineStyle(3, PAPER.graphite, 0.92);
      draftLine(g, rnd, 30, -89, 38, -105, { overshoot: 1, jitter: 0.35, segments: 4 });
      g.lineStyle(4, accent, 0.9);
      draftLine(g, rnd, 38, -105, 41, -112, { overshoot: 0, jitter: 0.5, segments: 3 });
      if (pose === 'wash') {
        g.fillStyle(PAPER.indigo, 0.72).fillCircle(43, -108, 2.5);
        g.fillCircle(45, -103, 1.8);
      }
    }

    g.lineStyle(1.7, PAPER.graphite, 0.82);
    draftLine(g, rnd, -13, -56, -2, -41, { overshoot: 1, jitter: 0.35, segments: 4 });
    draftLine(g, rnd, 13, -56, 2, -41, { overshoot: 1, jitter: 0.35, segments: 4 });
    draftLine(g, rnd, 0, -42, 0, -27, { overshoot: 1, jitter: 0.35, segments: 4 });
    g.fillStyle(PAPER.figure, 0.9).fillCircle(0, -35, 1.7);

    // Oversized round head, symmetrical hair and eyes: Butch always looks out
    // toward the player, regardless of which way the physics body travels.
    g.fillStyle(PAPER.sheetHigh, 1).fillCircle(0, -81, 22);
    g.lineStyle(2.1, PAPER.graphite, 0.94).strokeCircle(0, -81, 22);
    g.fillStyle(PAPER.graphiteSoft, 0.92);
    g.fillPoints([
      new Phaser.Geom.Point(-20, -85), new Phaser.Geom.Point(-23, -95),
      new Phaser.Geom.Point(-16, -93), new Phaser.Geom.Point(-15, -105),
      new Phaser.Geom.Point(-8, -101), new Phaser.Geom.Point(-2, -110),
      new Phaser.Geom.Point(4, -102), new Phaser.Geom.Point(12, -108),
      new Phaser.Geom.Point(13, -98), new Phaser.Geom.Point(22, -99),
      new Phaser.Geom.Point(19, -84), new Phaser.Geom.Point(11, -94),
      new Phaser.Geom.Point(5, -91), new Phaser.Geom.Point(-4, -96),
      new Phaser.Geom.Point(-13, -91),
    ], true);
    g.fillStyle(PAPER.figure, 1).fillCircle(-7, -79, 2.1).fillCircle(7, -79, 2.1);
    g.lineStyle(1.3, PAPER.graphiteSoft, 0.78);
    draftLine(g, rnd, -4, -68, 4, -68, { overshoot: 0, jitter: 0.25, segments: 3 });

    this.figureDrawnPose = pose;
  }

  updateFigurePose(time) {
    const moving = Math.abs(this.walker.body.velocity.x) > 8;
    const airborne = !this.walker.body.blocked.down;
    const pointer = this.input.activePointer;
    const paintHeld = pointer?.leftButtonDown?.() ?? false;
    const washHeld = pointer?.rightButtonDown?.() ?? false;

    if (this.walker.body.velocity.x < -8) this.playerMovementDirection = 'left';
    else if (this.walker.body.velocity.x > 8) this.playerMovementDirection = 'right';
    else this.playerMovementDirection = 'still';

    this.figurePose = this.qaFigurePose
      ?? (paintHeld ? 'paint' : washHeld ? 'wash' : moving && !airborne ? 'walk' : airborne ? 'airborne' : 'idle');
    this.playerAnimation = this.figurePose;
    if (this.figureDrawnPose !== this.figurePose) this.drawFigure();
    this.figure.setPosition(Math.round(this.walker.x), Math.round(this.walker.y + 31));
    this.figure.setRotation(this.figurePose === 'walk' ? Math.sin(time / 105) * 0.065 : 0);
  }

  playCompletion() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.tweens.add({ targets: this.couplingDoor, x: VESTIBULE.couplingX + 48, alpha: 0.16, duration: 520, ease: 'Sine.easeInOut' });
    const wash = this.add.rectangle(0, 0, VIEW.w, VIEW.h, PAPER.bookCloth, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.GRAIN + 2);
    this.tweens.add({ targets: wash, fillAlpha: 0.2, duration: 420, yoyo: true, hold: 280 });
    this.time.delayedCall(820, () => this.scene.start('DrawingStudio'));
  }

  bayId() {
    if (this.walker.x >= VESTIBULE.x) return 'VESTIBULE';
    if (this.walker.x >= 1885) return 'C';
    if (this.walker.x >= 760) return 'B';
    return 'A';
  }

  objectiveText() {
    if (!this.car.isFilled('bridge-red')) return 'lift the telephone color and fill the short bridge';
    if (!this.car.archComplete()) return 'find the three room colors and complete the distant arch';
    if (!this.car.drawbridgeOpen()) return 'put the banner color into the counterweight';
    return 'cross the lowered drawbridge and use the single vestibule door';
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.stepPlayer();
    this.stepPointerInteraction(dt);
    this.updateFigurePose(time);
    this.redrawPuzzles();
    this.drawCarriedPigments(time);
    this.drawPointerFeedback();
    this.currentInteraction = this.pointedInteraction() ?? this.nearestInteraction();
    this.showPrompt(this.promptFor(this.currentInteraction));
    this.grain.tilePositionX = this.cameras.main.scrollX * 0.32 + Math.sin(time / 5000) * 4;
  }

  textState() {
    const interaction = this.currentInteraction;
    return {
      scene: 'PaintedCountry',
      coordinateSystem: 'world pixels; origin top-left; x right; y down',
      bay: this.bayId(),
      objective: this.objectiveText(),
      player: {
        x: Math.round(this.walker.x),
        y: Math.round(this.walker.y),
        onGround: this.walker.body.blocked.down,
        facing: 'front',
        movementDirection: this.playerMovementDirection,
        animation: this.playerAnimation,
        heldVerb: this.figurePose === 'paint' ? 'PAINT' : this.figurePose === 'wash' ? 'WASH' : null,
        insideVestibule: this.walker.x >= VESTIBULE.x,
      },
      interaction: interaction ? { type: interaction.type, id: interaction.id } : null,
      pointerSelection: {
        source: this.hoverSourceId,
        target: this.hoverTargetId,
        holdProgress: Number((this.hold.progress / HOLD_SECONDS).toFixed(2)),
      },
      tutorialSeen: { ...this.tutorialSeen },
      drawbridgeProgress: Number(this.drawbridgeProgress.toFixed(2)),
      ...this.car.snapshot(),
    };
  }
}

export const PAINTED_COUNTRY_VIEW = VIEW;
