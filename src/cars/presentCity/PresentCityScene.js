// Car 03 // PresentCityScene
// Phaser scene that visualises the socialStealthModel. Owns the
// camera, the world background (backdrop-03), the train shell, the
// hero / companion / crowd sprites, the drones, and the QA warp
// handling. Does NOT import any Car 01 / Car 02 code.
//
// The scene is self-contained: it preloads backdrop-03, then
// instantiates the model and runs a fixed-step update each frame.

import Phaser from 'phaser';
import { GAME_W, GAME_H, WORLD_W, LANE_FAR, LANE_NEAR } from '../../constants.js';
import { DEPTH, CAR } from '../../art/colors.js';
import { C } from '../../art/colors.js';
import { queueWorldAsset, isWorldAssetLoaded, getWorldAsset } from '../../worlds/worldAssets.js';
import { createSocialStealthModel } from './socialStealthModel.js';
import {
  createHeroSprite,
  createNpcSprite,
  createCompanionSprite,
  createDroneSprite,
  createScanBracket,
  drawScanBracket,
  createGroundBracket,
  drawGroundBracket,
  createCadenceTicks,
  drawCadenceTicks,
  createTrainShell,
  createLockFlash,
  drawLockFlash,
  createLockScreenFlash,
  drawLockScreenFlash,
  createFireworkSprite,
  createAnchoredFloorBar,
  drawAnchoredFloorBar,
  createTransferBracket,
  drawTransferBracket,
  createDuoSync,
  drawDuoSync,
  createLockedOverlay,
  drawLockedOverlay,
  createPanicIcons,
  drawPanicIcons,
  laneToY,
  floorY,
} from './presentCityArt.js';

const BACKDROP_KEY = 'backdrop-03';
const STEP_MS = 16;

export default class PresentCityScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PresentCity' });
  }

  preload() {
    queueWorldAsset(this.load, BACKDROP_KEY);
  }

  create() {
    this.model = createSocialStealthModel();
    this.lastT = this.time.now;
    this.qaState = null;
    this.targetOffsetX = 0; // accumulated by A/D, clamped by the model
    this.fireworks = [];
    this.lockPauseTween = null;

    // Camera background
    this.cameras.main.setBackgroundColor('#0a1015');

    // World backdrop. Each panorama chunk is added as its own image in
    // world space with scrollFactor(1, 0). We darken with a tint and a
    // gradient overlay so the photographic detail stays subordinated to
    // the crisp low-pixel actors and the carriage shell.
    this.backdropSprites = [];
    this.backdropOverlay = null;
    if (isWorldAssetLoaded(this, BACKDROP_KEY)) {
      const asset = getWorldAsset(BACKDROP_KEY);
      for (const chunk of asset.chunks) {
        const img = this.add.image(chunk.x, 0, chunk.textureKey)
          .setOrigin(0, 0)
          .setDepth(DEPTH.EXTERIOR)
          .setScrollFactor(1, 0);
        img.displayHeight = GAME_H;
        // Darken the photo so the actors win the value contrast.
        img.setAlpha(0.55);
        this.backdropSprites.push(img);
      }
      // Subordination overlay: a single dark rectangle on top of all
      // chunks, scrollFactor(1, 0), to suppress the harsh photographic
      // contrast behind the actors.
      this.backdropOverlay = this.add.rectangle(0, 70, WORLD_W, GAME_H - 70, 0x0a1015, 0.45)
        .setOrigin(0, 0)
        .setDepth(DEPTH.EXTERIOR + 1)
        .setScrollFactor(1, 0);
    } else {
      const rect = this.add.rectangle(0, 0, WORLD_W, GAME_H, 0x101820)
        .setOrigin(0, 0)
        .setDepth(DEPTH.EXTERIOR)
        .setScrollFactor(1, 0);
      this.backdropSprites.push(rect);
    }

    // Train shell: fixed on screen (scrollFactor 0,0). Frames the
    // carriage interior: ceiling, side walls, window pillars, floor
    // deck.
    this.shell = createTrainShell(this);
    this.shell.setScrollFactor(0, 0);

    // Hero, companion, drones, NPC pool.
    this.hero = createHeroSprite(this);
    this.hero.setScrollFactor(1, 0);
    this.companionSprite = createCompanionSprite(this);
    this.companionSprite.setVisible(false);
    this.companionSprite.setScrollFactor(1, 0);

    this.droneSprites = new Map();
    this.npcPool = new Map();
    this.crowdMemberSprites = new Map();

    // UI overlays. P0-4 (Codex repair): every per-frame feedback
    // overlay is a WORLD object — it uses world coordinates and
    // scrollFactor(1, 0) so it scrolls with the camera. The only
    // screen-fixed elements are the train shell and the full-screen
    // lock screen flash (genuinely screen-space). No mixing of
    // scrollFactor(0) + worldX anymore.
    this.scanBrackets = new Map(); // droneId -> graphics
    this.groundBracket = createGroundBracket(this);
    this.groundBracket.setScrollFactor(1, 0);
    this.cadenceTicks = createCadenceTicks(this);
    this.cadenceTicks.setScrollFactor(1, 0);
    // lockFlash (legacy) is a small bar at the player's x — world
    // coords, scrollFactor(1, 0).
    this.lockFlash = createLockFlash(this);
    this.lockFlash.setScrollFactor(1, 0);
    // lockScreenFlash is the only true screen-space element: the
    // full-screen LAMP_ALERT tint during the lock countdown. It
    // stays anchored to the viewport while the camera scrolls.
    this.lockScreenFlash = createLockScreenFlash(this);
    this.anchoredFloorBar = createAnchoredFloorBar(this);
    this.anchoredFloorBar.setScrollFactor(1, 0);
    this.transferBracket = createTransferBracket(this);
    if (this.transferBracket.bracket) this.transferBracket.bracket.setScrollFactor(1, 0);
    if (this.transferBracket.label) this.transferBracket.label.setScrollFactor(1, 0);
    this.duoSync = createDuoSync(this);
    this.duoSync.setScrollFactor(1, 0);
    this.lockedOverlay = createLockedOverlay(this);
    this.lockedOverlay.setScrollFactor(1, 0);
    this.panicIcons = createPanicIcons(this);
    this.panicIcons.setScrollFactor(1, 0);

    // QA warp from URL.
    const url = new URL(window.location.href);
    const qa = url.searchParams.get('qa');
    const state = url.searchParams.get('state');
    if (qa === 'car3' && state) {
      this.qaState = state;
      this.model.applyQaWarp(state);
    }

    // Camera
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);
    this.cameras.main.setBackgroundColor('#0a1015');

    // Input — keys. A and D are bound to TWO physical keys each (the
    // letter and the arrow) for WASD + arrow equivalence.
    this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // Debug surface
    this._exposeRenderToText();
  }

  update(time, deltaMs) {
    const dt = Math.min(50, deltaMs || STEP_MS);
    const input = this._readInput();
    this.model.update(dt, input);
    this._renderFromSnapshot();
    // Camera follows hero (with a small deadzone).
    const snap = this.model.snapshot();
    const targetScroll = Math.max(0, snap.player.x - GAME_W * 0.45);
    this.cameras.main.scrollX += (targetScroll - this.cameras.main.scrollX) * 0.18;

    // Edge-triggered E (contextual interact) and R (full reset).
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.model.pressInteract();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.fullReset();
    }
  }

  _readInput() {
    const turnLeft = this.keyLeft.isDown || this.keyA.isDown;
    const turnRight = this.keyRight.isDown || this.keyD.isDown;
    // Accumulate the anchored-group micro-offset when the player
    // presses A or D. Clamp to ±groupAdjust (55) at the SCENE level
    // too — the model clamps the same way in applyPlayerMovement, and
    // the scene-level value is what the snapshot exposes via
    // render_game_to_text. Without this clamp the scene value drifts
    // unboundedly across long key holds while the model silently
    // uses the clamped value, making the scene/model contract
    // observable.
    if (turnLeft) this.targetOffsetX = Math.max(-55, this.targetOffsetX - 1);
    if (turnRight) this.targetOffsetX = Math.min(55, this.targetOffsetX + 1);
    return {
      dtMs: 0,
      left: turnLeft,
      right: turnRight,
      turnLeft,
      turnRight,
      targetOffsetX: this.targetOffsetX,
      laneBack: this.keyUp.isDown || this.keyW.isDown,
      laneFront: this.keyDown.isDown || this.keyS.isDown,
    };
  }

  // Full reset: clears model state AND scene transients. Bound to R.
  // Honours the brief: camera position, shell/overlay state, lock
  // visuals, timers, completion/firework state, and any active tween
  // or particles are all returned to the entry baseline.
  fullReset() {
    this.model.reset();
    this.targetOffsetX = 0;
    this.qaState = null;
    this.cameras.main.scrollX = 0;
    // Clear fireworks
    for (const f of this.fireworks) f.destroy();
    this.fireworks = [];
    // Clear drone sprites so they re-appear at their reset positions
    for (const sprite of this.droneSprites.values()) sprite.destroy();
    this.droneSprites.clear();
    // Clear crowd member sprites
    for (const arr of this.crowdMemberSprites.values()) {
      for (const s of arr) s.destroy();
    }
    this.crowdMemberSprites.clear();
    // Reset hero to LANE_NEAR, default sprite, and re-center
    this.hero.setVisible(true);
    this.hero.setAngle(0);
    this.hero.setAlpha(1);
    this.companionSprite.setVisible(false);
    this.companionSprite.setAngle(0);
    // Force a render
    this._renderFromSnapshot();
  }

  _renderFromSnapshot() {
    const snap = this.model.snapshot();

    // Hero
    this.hero.x = snap.player.x;
    this.hero.y = laneToY(snap.player.lane);
    this.hero.setFlipX(snap.player.facing < 0);
    this.hero.setVisible(!snap.complete);

    // Companion
    this.companionSprite.setVisible(snap.companion.state !== null && snap.companion.state !== 'hidden');
    if (this.companionSprite.visible) {
      this.companionSprite.x = snap.companion.x;
      this.companionSprite.y = laneToY(snap.companion.lane);
      this.companionSprite.setFlipX(snap.companion.facing < 0);
    }

    // Drones
    for (const d of snap.drones) {
      let sprite = this.droneSprites.get(d.id);
      if (!sprite) {
        sprite = createDroneSprite(this);
        sprite.setScrollFactor(1, 0);
        this.droneSprites.set(d.id, sprite);
      }
      sprite.x = d.x;
      sprite.y = laneToY(d.lane) - 30;
    }

    // Scan brackets: per drone, draw filled cone + end ticks. If the
    // drone is currently aimed at the player, show a reticle on the
    // player position so the threat reads.
    for (const d of snap.drones) {
      let g = this.scanBrackets.get(d.id);
      if (!g) {
        // Repair A: createScanBracket owns the scroll contract — the
        // bracket receives world coordinates (d.x, player.x) and must
        // scroll with the world, exactly like the drone sprite it
        // tracks. The previous screen-pinned scroll factor kept the
        // cone fixed on the viewport while it used world X, so after
        // camera scroll the visible scan separated from the gameplay
        // scan region.
        g = createScanBracket(this);
        this.scanBrackets.set(d.id, g);
      }
      const warning = snap.player.exposureMs >= 900;
      const aimed = d.lockTarget === 'player';
      drawScanBracket(
        g,
        { x: d.x, lane: d.lane, scanDir: 1, targetX: aimed ? snap.player.x : null },
        warning,
        d.scanActive,
        aimed,
      );
    }

    // Crowd members: one sprite per "slot" per crowd. When the crowd
    // is scattered, render each member at crowd.x + memberOffsets[i]
    // with a tilt and a panic icon above.
    const scatteredMemberXsByCrowd = new Map();
    for (const c of snap.crowds) {
      let arr = this.crowdMemberSprites.get(c.id);
      if (!arr) {
        arr = [];
        this.crowdMemberSprites.set(c.id, arr);
      }
      while (arr.length < c.members) {
        const s = createNpcSprite(
          this,
          c.id === 'fast-II' || c.id === 'fast-IV' ? CAR.STEEL_HI : CAR.ENAMEL_HI,
        );
        s.setScrollFactor(1, 0);
        arr.push(s);
      }
      while (arr.length > c.members) {
        const s = arr.pop();
        s.destroy();
      }
      const memberXs = [];
      for (let i = 0; i < arr.length; i++) {
        let x;
        if (c.scattered && c.memberOffsets && c.memberOffsets[i] != null) {
          x = c.x + c.memberOffsets[i];
        } else {
          const t = (i - arr.length / 2 + 0.5) * (c.rightX - c.leftX) / arr.length;
          x = c.x + t;
        }
        const y = laneToY(c.lane) + (c.id === 'fast-II' || c.id === 'fast-IV' ? -2 : 0);
        arr[i].x = x;
        arr[i].y = y;
        // P1-2: tilt ±15° when scattered so members visibly flee.
        if (c.scattered) {
          arr[i].setAngle(i % 2 === 0 ? 15 : -15);
        } else {
          arr[i].setAngle(0);
        }
        memberXs.push(x);
      }
      scatteredMemberXsByCrowd.set(c.id, { crowd: c, memberXs });
    }

    // Panic icons: only on dispersing crowds with active alert.
    for (const { crowd, memberXs } of scatteredMemberXsByCrowd.values()) {
      if (crowd.scattered) {
        drawPanicIcons(this.panicIcons, crowd, memberXs);
      }
    }

    // Ground bracket (exposure) — visible only when unanchored and
    // exposureMs > 0.
    drawGroundBracket(
      this.groundBracket,
      snap.player,
      snap.player.exposureMs,
      snap.player.anchoredGroupId !== null,
      900,
      2200,
    );

    // Cadence ticks — visible only during the 350ms cadence lock.
    drawCadenceTicks(
      this.cadenceTicks,
      snap.player,
      null,
      snap.player.cadenceLockMsLeft,
      350,
    );

    // Anchored floor bar — visible only when player.anchoredGroupId
    // is set.
    drawAnchoredFloorBar(this.anchoredFloorBar, snap.player, snap.crowds);

    // Transfer overlap bracket — visible only when player is in an
    // overlap zone between two groups on the same lane.
    const overlap = findPlayerOverlap(snap);
    drawTransferBracket(
      this.transferBracket,
      snap.player,
      overlap ? overlap.left : null,
      overlap ? overlap.right : null,
    );

    // Duo sync brackets — visible only when duo.active.
    if (snap.duo.active) {
      drawDuoSync(this.duoSync, snap.player, snap.companion);
    } else {
      if (this.duoSync) this.duoSync.clear();
    }

    // Locked-player overlay (whole-body tint + safe-anchor marker).
    // Drawn on top of everything except UI text.
    drawLockedOverlay(this.lockedOverlay, snap.player, snap.player.lockMsLeft, 450);

    // Lock screen flash (full-viewport LAMP_ALERT tint). Screen
    // space; cleared when lockMsLeft <= 0.
    drawLockScreenFlash(this.lockScreenFlash, snap.player, snap.player.lockMsLeft, 450);

    // Lock flash (legacy smoke — small world-space bar near the player).
    drawLockFlash(this.lockFlash, this, snap.player, snap.player.lockMsLeft, 450);

    // Fireworks on complete
    if (snap.complete && this.fireworks.length === 0) {
      const positions = [
        { x: 4400, y: 80, scale: 2.0 },
        { x: 4500, y: 60, scale: 2.6 },
        { x: 4600, y: 100, scale: 3.0 },
        { x: 4550, y: 130, scale: 1.8 },
      ];
      for (const p of positions) {
        const f = createFireworkSprite(this);
        f.setPosition(p.x, p.y);
        f.setScale(p.scale);
        this.fireworks.push(f);
      }
    }
    if (this.fireworks.length > 0) {
      for (const f of this.fireworks) {
        f.y -= 0.4;
        f.setAlpha(Math.max(0, f.alpha - 0.0015));
      }
    }
  }

  _exposeRenderToText() {
    if (typeof window === 'undefined') return;
    const self = this;
    window.render_game_to_text = function car03Render() {
      if (!self.model) return JSON.stringify({ state: 'uninitialised' });
      const snap = self.model.snapshot();
      return JSON.stringify({
        ...snap,
        qaState: self.qaState,
        targetOffsetX: self.targetOffsetX,
      });
    };
  }
}

// Find an overlap zone the player is currently inside, on the same
// lane as the player. Returns { left, right } of the overlap region
// or null. Used to draw the [E TRANSFER] hint.
function findPlayerOverlap(snap) {
  const sameLane = snap.crowds.filter((c) => c.lane === snap.player.lane && !c.scattered);
  for (let i = 0; i < sameLane.length; i++) {
    for (let j = i + 1; j < sameLane.length; j++) {
      const a = sameLane[i];
      const b = sameLane[j];
      const left = Math.max(a.leftX, b.leftX);
      const right = Math.min(a.rightX, b.rightX);
      if (right - left <= 0) continue;
      // Player is inside the overlap region.
      if (snap.player.x >= left && snap.player.x <= right) {
        return { left, right, a, b };
      }
    }
  }
  return null;
}
