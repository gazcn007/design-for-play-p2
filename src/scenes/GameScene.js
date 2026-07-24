import Phaser from 'phaser';
import {
  GAME_W,
  GAME_H,
  WORLD_W,
  LANES,
  LANE_FAR,
  LANE_NEAR,
  SPRING_VELOCITY,
  BACKDROP,
} from '../constants.js';
import { LEVEL } from '../level.js';
import { PAL } from '../palette.js';
import Player from '../Player.js';
import { sfx } from '../sfx.js';

// Surfaces that get an explicit moonlit lip; the rest read as flat silhouettes.
const RIMMED = new Set(['ground', 'platform', 'bridge']);

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.finished = false;
    this.activeInteractable = null;
    this.bridgePlanks = [];
    this.interactables = [];
    this.checkpointTaken = false;

    this.registry.set('score', 0);
    this.registry.set('coins', 0);
    this.registry.set('lives', 3);
    this.registry.set('lane', LANE_NEAR);

    this.physics.world.setBounds(0, -600, WORLD_W, 2200);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this.buildBackground();

    this.solids = this.physics.add.staticGroup();
    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    this.enemies = this.physics.add.group();

    this.buildDecor();
    this.buildSolids();
    this.buildBridge();
    this.buildCoins();
    this.buildEnemies();
    this.buildInteractables();
    this.buildMarkers();
    this.buildOverlays();

    this.solids.refresh();

    this.player = new Player(this, LEVEL.spawn.x, LEVEL.spawn.y, LEVEL.spawn.lane);
    this.checkpoint = { ...LEVEL.spawn };

    // A single collider for every solid in the level; the process callback is
    // what enforces lane separation, so the player simply cannot touch
    // geometry that belongs to the other depth lane.
    this.physics.add.collider(
      this.player,
      this.solids,
      this.onSolidHit,
      (p, s) => s.laneId === p.lane && s.body.enable && !p.transiting,
      this,
    );
    this.physics.add.collider(
      this.enemies,
      this.solids,
      null,
      (e, s) => s.laneId === e.laneId && s.body.enable,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.coins,
      this.onCoin,
      (p, c) => c.laneId === p.lane && c.active,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.onEnemy,
      (p, e) => e.laneId === p.lane && e.active && !p.transiting,
      this,
    );

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(180, 140);

    this.setupInput();

    this.physics.world.createDebugGraphic();
    this.physics.world.drawDebug = false;
    this.physics.world.debugGraphic.setVisible(false).setDepth(90);

    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
    else this.game.events.emit('hud:reset');
  }

  // ------------------------------------------------------------- level build

  buildBackground() {
    const layer = (y, h, tex, depth) =>
      this.add.tileSprite(0, y, GAME_W, h, tex).setOrigin(0).setScrollFactor(0).setDepth(depth);

    // Base fill. The backdrop covers the frame, but this guarantees no gap if
    // the painting is ever swapped for one with a different aspect ratio.
    this.bgSky = layer(0, GAME_H, 'sky', 0);

    this.buildBackdrop();

    // Drifting mist, kept in front of the painting so the city breathes.
    this.fogHigh = layer(96, 200, 'fog', 2);
    this.fogHigh.setAlpha(0.35);
    this.fogLow = layer(210, 200, 'fog', 6);
    this.fogLow.setAlpha(0.3);

    // Wash over the far lane so distance keeps reading as distance.
    this.haze = this.add
      .rectangle(0, 0, GAME_W, 400, 0x59647a)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(12)
      .setAlpha(0.05);

    // Mist rolling through the gap between the lanes. Kept BELOW the far
    // lane's surface (290) on purpose — sitting over its face washed it
    // lighter than the city behind it and flattened the whole depth ramp.
    this.fogDrift = layer(384, 108, 'fog', 13);
    this.fogDrift.setAlpha(0.22);

    // No inter-lane treeline any more: the painting's own lamplit street shows
    // through the gap between the lanes and reads far better than a drawn band.
    this.foreground = layer(GAME_H - 74, 84, 'foreground', 45);

    // Ash drifting across the whole frame, pinned to the camera.
    this.ash = this.add.particles(0, 0, 'mote', {
      x: { min: -20, max: GAME_W + 20 },
      y: { min: -30, max: GAME_H * 0.75 },
      lifespan: { min: 6000, max: 13000 },
      speedX: { min: -16, max: 16 },
      speedY: { min: 5, max: 24 },
      scale: { min: 0.25, max: 1.0 },
      alpha: { start: 0.4, end: 0 },
      frequency: 180,
      quantity: 1,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.ash.setScrollFactor(0).setDepth(48);

    this.vignette = this.add
      .image(0, 0, 'vignette')
      .setOrigin(0)
      .setDisplaySize(GAME_W, GAME_H)
      .setScrollFactor(0)
      .setDepth(70);
  }

  /**
   * The painted panorama that replaced the procedural skyline.
   *
   * It is one Image, not a tileSprite. Tiling a painting this specific would
   * repeat its moon several times across the level and put a visible seam at
   * every wrap. Instead the scroll factor is derived so the panorama pans
   * across exactly once end to end — no repeat, no seam, and the far side of
   * the city is a reward for reaching the far side of the level.
   */
  buildBackdrop() {
    const src = this.textures.get('backdrop').getSourceImage();

    const scale = BACKDROP.height / src.height;
    const w = src.width * scale;
    const h = src.height * scale;

    // Pan the panorama's full width over the camera's full travel. Clamped
    // because a painting narrower than the viewport cannot pan at all.
    const travel = Math.max(1, WORLD_W - GAME_W);
    const factor = Phaser.Math.Clamp((w - GAME_W) / travel, 0, 1);

    // Anchor by the painting's horizon rather than by a guessed y offset, so
    // this still lands correctly if the image is swapped or rescaled.
    const y = BACKDROP.horizonY - BACKDROP.horizonFrac * h;

    this.backdrop = this.add
      .image(0, y, 'backdrop')
      .setOrigin(0, 0)
      .setScale(scale)
      .setScrollFactor(factor, 0)
      .setDepth(1)
      .setTint(BACKDROP.tint);
  }

  /** Additive light. Never lane-tinted, so it survives a near-black lane. */
  addLight(x, y, radius, color, alpha, depth) {
    return this.add
      .image(x, y, 'glow')
      .setDepth(depth)
      .setScale(radius / 64)
      .setTint(color)
      .setAlpha(alpha)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  buildDecor() {
    LEVEL.decor.forEach((d) => {
      const lane = LANES[d.lane];
      const count = d.repeat || 1;

      for (let i = 0; i < count; i++) {
        const tex = this.textures.get(d.tex).getSourceImage();
        const w = tex.width * lane.scale;
        const x = d.x + i * (w - 1);

        const spr = this.add
          .image(x, lane.baseY + 2, d.tex)
          .setOrigin(0.5, 1)
          .setScale(lane.scale)
          .setTint(lane.tint)
          .setDepth(lane.depth - 1); // behind the terrain it stands on

        if (d.light) {
          const lampY = spr.y - spr.displayHeight + 26 * lane.scale;
          // Keep gaslights intimate. Oversized circular bloom made the scene
          // look like it had random UI effects hovering over the playfield.
          const halo = this.addLight(x + 3 * lane.scale, lampY, 30 * lane.scale, PAL.lamp, 0.28 * d.light, lane.depth + 3);
          this.tweens.add({
            targets: halo,
            alpha: { from: 0.28 * d.light, to: 0.18 * d.light },
            duration: 1400 + ((i * 137) % 900),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      }
    });
  }

  addSolid(def) {
    const lane = LANES[def.lane];
    // Ground bands tile plain dirt and get a decorative grass cap laid on top,
    // otherwise a 140px band would repeat the grass line four times.
    const tex = def.kind === 'ground' ? 'terrain-body' : def.tex || 'stone';
    const ts = this.add.tileSprite(def.x, def.y, def.w, def.h, tex).setOrigin(0, 0);
    ts.setDepth(lane.depth);
    ts.setTint(lane.tint);

    if (def.kind === 'ground') {
      const capH = Math.round(12 * lane.scale);
      const cap = this.add
        .tileSprite(def.x, def.y, def.w, capH, 'terrain-cap')
        .setOrigin(0, 0)
        .setDepth(lane.depth + 0.5)
        .setTint(lane.tint);
      if (def.lane === LANE_FAR) cap.setTileScale(lane.scale, lane.scale);
    }

    // The carved sigil has to be its own additive sprite — a tint dark enough
    // to make the block a silhouette would extinguish anything drawn into it.
    if (def.kind === 'question') {
      ts.runeGlow = this.addLight(
        def.x + def.w / 2,
        def.y + def.h / 2,
        22 * lane.scale,
        PAL.rune,
        0.26,
        lane.depth + 2,
      );
      this.tweens.add({
        targets: ts.runeGlow,
        alpha: { from: 0.26, to: 0.13 },
        duration: 1250,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    if (RIMMED.has(def.kind)) {
      ts.rim = this.add
        .rectangle(def.x, def.y, def.w, 2, lane.rim)
        .setOrigin(0, 0)
        .setDepth(lane.depth + 0.6);
    }

    ts.laneId = def.lane;
    ts.kind = def.kind;
    ts.used = false;

    if (def.lane === LANE_FAR) {
      // Shrinking the *texture* inside the tile keeps collision honest while
      // making the far lane's masonry read as further away.
      ts.setTileScale(lane.scale, lane.scale);
      ts.setTint(lane.tint);
    }

    this.solids.add(ts);
    return ts;
  }

  buildSolids() {
    LEVEL.solids.forEach((def) => this.addSolid(def));
  }

  buildBridge() {
    const b = LEVEL.bridge;
    b.planks.forEach((p) => {
      const plank = this.addSolid({
        lane: b.lane,
        x: p.x,
        y: b.y,
        w: p.w,
        h: b.h,
        tex: b.tex,
        kind: 'bridge',
      });
      plank.body.enable = false;
      plank.setVisible(false);
      if (plank.rim) plank.rim.setVisible(false);
      this.bridgePlanks.push(plank);
    });
  }

  buildCoins() {
    LEVEL.coins.forEach((def) => {
      const lane = LANES[def.lane];
      const c = this.coins.create(def.x, def.y, 'echo');
      c.laneId = def.lane;
      c.value = def.value || 1;
      c.setDepth(lane.depth + 2);
      c.setScale(lane.scale);
      c.body.setAllowGravity(false);
      // Blood echoes are light, not matter — additive and never lane-tinted.
      c.setBlendMode(Phaser.BlendModes.ADD);
      c.setAlpha(def.lane === LANE_FAR ? 0.75 : 1);

      this.tweens.add({
        targets: c,
        scaleX: lane.scale * 0.22,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  buildEnemies() {
    LEVEL.enemies.forEach((def) => {
      const lane = LANES[def.lane];
      const e = this.enemies.create(def.x, lane.baseY - 70, 'enemy');
      e.laneId = def.lane;
      e.minX = def.min;
      e.maxX = def.max;
      e.dir = -1;
      e.setDepth(lane.depth + 1);
      e.setScale(lane.scale * 1.2);
      e.setTint(lane.figureTint);
      e.body.setBounce(0, 0);
    });
  }

  buildInteractables() {
    LEVEL.interactables.forEach((def) => {
      const lane = LANES[def.lane];
      const tex = def.kind === 'lever' ? 'lever-off' : 'sign';
      const sprite = this.add
        .sprite(def.x, lane.baseY, tex)
        .setOrigin(0.5, 1)
        .setDepth(lane.depth + 1)
        .setScale(lane.scale)
        .setTint(lane.figureTint);
      this.interactables.push({ def, sprite, fired: false });
    });

    this.prompt = this.add
      .text(0, 0, '[E]', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '15px',
        color: '#ffffff',
        backgroundColor: '#1d2333',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(60)
      .setVisible(false);
  }

  buildMarkers() {
    const cp = LEVEL.checkpoints[0];
    this.checkpointSprite = this.add
      .sprite(cp.x, LANES[cp.lane].baseY, 'flag-checkpoint')
      .setOrigin(0.5, 1)
      .setDepth(LANES[cp.lane].depth + 1);
    this.checkpointSprite.laneId = cp.lane;
    this.checkpointSprite.setTint(LANES[cp.lane].figureTint);
    this.checkpointLight = this.addLight(
      cp.x,
      LANES[cp.lane].baseY - 48,
      54,
      0xb9c8dc,
      0.3,
      LANES[cp.lane].depth + 3,
    );

    this.goalSprite = this.add
      .sprite(LEVEL.goal.x, LANES[LANE_NEAR].baseY, 'flag-goal')
      .setOrigin(0.5, 1)
      .setDepth(LANES[LANE_NEAR].depth + 1)
      .setTint(LANES[LANE_NEAR].figureTint);

    this.goalLight = this.addLight(
      LEVEL.goal.x,
      LANES[LANE_NEAR].baseY - 64,
      120,
      PAL.lamp,
      0.6,
      LANES[LANE_NEAR].depth + 3,
    );
    this.tweens.add({
      targets: this.goalLight,
      alpha: { from: 0.6, to: 0.36 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  buildOverlays() {
    // Reusable floating "+N" score popups.
    this.popups = this.add.group();
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      up: 'UP',
      jump: 'SPACE',
      a: 'A',
      d: 'D',
      w: 'W',
      s: 'S',
      run: 'SHIFT',
      interact: 'E',
      attack: 'F',
      restart: 'R',
      debug: 'ZERO',
    });
    // Stop the page from scrolling when the player uses space / arrows.
    this.input.keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
  }

  readInput() {
    const k = this.keys;
    const JustDown = Phaser.Input.Keyboard.JustDown;
    const jumpTapped = JustDown(k.jump);
    const upTapped = JustDown(k.up);
    return {
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      jumpHeld: k.jump.isDown || k.up.isDown,
      jumpPressed: jumpTapped || upTapped,
      run: k.run.isDown,
      laneBack: JustDown(k.w),
      laneFront: JustDown(k.s),
      interact: JustDown(k.interact),
      attackPressed: JustDown(k.attack),
    };
  }

  // ---------------------------------------------------------- lane mechanics

  /**
   * Would the player fit in `laneId` at (x, y)? Prevents shifting depth into
   * the middle of a wall — the switch is refused instead of clipping.
   */
  canOccupyLane(player, laneId, x, y) {
    const scale = LANES[laneId].scale;
    // Inset by absolute pixels, not a percentage. Standing on a surface maps
    // the player's feet exactly onto the destination surface, so a probe that
    // scales with the body clips it by a fraction of a pixel and refuses every
    // shift. The inset has to survive that while still catching real embedding.
    const w = Math.max(4, player.width * scale * player.figureScale - 8);
    const h = Math.max(4, player.height * scale * player.figureScale - 10);
    const probe = new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h);

    const children = this.solids.getChildren();
    for (let i = 0; i < children.length; i++) {
      const s = children[i];
      if (s.laneId !== laneId || !s.body || !s.body.enable) continue;
      const b = s.body;
      if (
        probe.right > b.x &&
        probe.x < b.x + b.width &&
        probe.bottom > b.y &&
        probe.y < b.y + b.height
      ) {
        return false;
      }
    }
    return true;
  }

  onLaneChanged(lane) {
    this.registry.set('lane', lane);
  }

  // -------------------------------------------------------------- collisions

  onSolidHit(player, solid) {
    const body = player.body;

    if (solid.kind === 'question' && body.blocked.up && !solid.used) {
      this.bumpQuestionBlock(solid);
    } else if (solid.kind === 'brick' && body.blocked.up) {
      sfx.bump();
      this.nudgeBlock(solid, 4);
    } else if (solid.kind === 'spring' && body.blocked.down) {
      player.launch(SPRING_VELOCITY);
      player.pulse(0.75, 1.32, 220);
      sfx.spring();
      this.tweens.add({
        targets: solid,
        scaleY: 0.55,
        duration: 80,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
  }

  nudgeBlock(solid, distance) {
    const startY = solid.y;
    this.tweens.add({
      targets: solid,
      y: startY - distance,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        solid.y = startY;
      },
    });
  }

  bumpQuestionBlock(solid) {
    solid.used = true;
    solid.setTexture('block-spent');
    this.nudgeBlock(solid, 9);
    sfx.bump();

    if (solid.runeGlow) {
      this.tweens.killTweensOf(solid.runeGlow);
      this.tweens.add({
        targets: solid.runeGlow,
        alpha: 0,
        scale: solid.runeGlow.scale * 2.2,
        duration: 340,
        onComplete: () => solid.runeGlow.destroy(),
      });
      solid.runeGlow = null;
    }

    const lane = LANES[solid.laneId];
    const coin = this.add
      .image(solid.x + solid.width / 2, solid.y, 'echo')
      .setDepth(lane.depth + 2)
      .setScale(lane.scale)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: coin,
      y: solid.y - 54,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: coin,
          y: solid.y - 20,
          alpha: 0,
          duration: 180,
          ease: 'Quad.easeIn',
          onComplete: () => coin.destroy(),
        });
      },
    });

    sfx.coin();
    this.addScore(3, solid.x + solid.width / 2, solid.y - 30);
    this.registry.set('coins', this.registry.get('coins') + 1);
  }

  onCoin(player, coin) {
    coin.disableBody(true, true);
    sfx.coin();
    this.registry.set('coins', this.registry.get('coins') + 1);
    this.addScore(coin.value, coin.x, coin.y);
  }

  onEnemy(player, enemy) {
    if (player.hurt(enemy.x)) {
      this.damage(false);
    }
  }

  performStrike(player, facing) {
    const lane = LANES[player.lane];
    const slash = this.add
      .image(player.x + facing * 30 * lane.scale, player.y - 7 * lane.scale, 'slash')
      .setOrigin(0.5)
      .setDepth(lane.depth + 4)
      .setScale(lane.scale)
      .setFlipX(facing < 0)
      .setTint(0xd9e8f4)
      .setAlpha(0.82)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: lane.scale * 1.3,
      scaleY: lane.scale * 1.08,
      duration: 130,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy(),
    });

    this.enemies.getChildren().slice().forEach((enemy) => {
      if (!enemy.active || enemy.laneId !== player.lane) return;
      const forward = (enemy.x - player.x) * facing;
      const vertical = Math.abs(enemy.y - player.y);
      if (forward > -8 * lane.scale && forward < 64 * lane.scale && vertical < 42 * lane.scale) {
        this.defeatEnemy(enemy);
      }
    });
  }

  defeatEnemy(enemy) {
    sfx.kill();
    this.addScore(20, enemy.x, enemy.y - 20);

    enemy.body.enable = false;
    enemy.setVelocity(0, 0);
    enemy.active = false;
    enemy.setTint(PAL.blood);

    this.tweens.add({
      targets: enemy,
      alpha: 0,
      scaleX: enemy.scaleX * 1.22,
      scaleY: enemy.scaleY * 0.68,
      duration: 240,
      ease: 'Quad.easeOut',
      onComplete: () => enemy.destroy(),
    });
  }

  // ------------------------------------------------------------ interactions

  updateInteractables(input) {
    const p = this.player;
    let best = null;
    let bestDist = 62;

    this.interactables.forEach((it) => {
      if (it.def.lane !== p.lane) return;
      if (it.fired && it.def.once) return;
      const dx = Math.abs(it.sprite.x - p.x);
      const dy = Math.abs(it.sprite.y - p.y);
      if (dx < bestDist && dy < 100) {
        bestDist = dx;
        best = it;
      }
    });

    this.activeInteractable = best;

    if (best) {
      this.prompt
        .setVisible(true)
        .setPosition(best.sprite.x, best.sprite.y - best.sprite.displayHeight - 10);
    } else {
      this.prompt.setVisible(false);
    }

    if (input.interact && best) this.fireInteractable(best);
  }

  fireInteractable(it) {
    if (it.fired && it.def.once) return;

    if (it.def.kind === 'lever') {
      it.fired = true;
      it.sprite.setTexture('lever-on');
      this.addLight(it.sprite.x, it.sprite.y - 22, 90, PAL.lamp, 0.55, 40);
      sfx.lever();
      this.raiseBridge();
      this.addScore(25, it.sprite.x, it.sprite.y - 40);
    }

    if (it.def.message) this.game.events.emit('hud:toast', it.def.message);
  }

  raiseBridge() {
    const targetY = LEVEL.bridge.y;
    this.cameras.main.shake(420, 0.005);

    this.bridgePlanks.forEach((plank, i) => {
      this.time.delayedCall(i * 70, () => {
        plank.body.enable = true;
        plank.setVisible(true);
        plank.setAlpha(0);
        plank.y = targetY - 28;
        sfx.bump();
        // The lip is a separate object, so it has to ride the same tween.
        const targets = plank.rim ? [plank, plank.rim] : [plank];
        if (plank.rim) plank.rim.setVisible(true).setAlpha(0);
        this.tweens.add({
          targets,
          y: targetY,
          alpha: 1,
          duration: 170,
          ease: 'Back.easeOut',
          onComplete: () => plank.body.updateFromGameObject(),
        });
      });
    });
  }

  // ------------------------------------------------------------------ scores

  addScore(amount, x, y) {
    this.registry.set('score', this.registry.get('score') + amount);

    const label = this.add
      .text(x, y, `+${amount}`, {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '15px',
        color: '#fff3c4',
        stroke: '#3a2c05',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(60);

    this.tweens.add({
      targets: label,
      y: y - 34,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  // ------------------------------------------------------------ life / death

  damage(respawnPlayer) {
    if (this.finished) return;

    const lives = this.registry.get('lives') - 1;
    this.registry.set('lives', lives);
    this.cameras.main.flash(180, 220, 60, 60);

    if (lives <= 0) {
      this.gameOver();
      return;
    }
    if (respawnPlayer) this.respawn();
  }

  respawn() {
    this.player.resetTo(this.checkpoint.x, this.checkpoint.y, this.checkpoint.lane);
    this.registry.set('lane', this.checkpoint.lane);
    this.cameras.main.flash(220, 255, 255, 255);
  }

  gameOver() {
    this.finished = true;
    this.player.frozen = true;
    this.player.setVelocity(0, 0);
    sfx.gameover();
    this.game.events.emit('hud:gameover');
    this.time.delayedCall(2200, () => this.scene.restart());
  }

  win() {
    if (this.finished) return;
    this.finished = true;
    this.player.frozen = true;
    this.player.setVelocity(0, 0);
    sfx.goal();
    this.game.events.emit('hud:win', {
      score: this.registry.get('score'),
      coins: this.registry.get('coins'),
    });
  }

  // ------------------------------------------------------------------ update

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.scene.restart();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.debug)) {
      const on = !this.physics.world.drawDebug;
      this.physics.world.drawDebug = on;
      this.physics.world.debugGraphic.setVisible(on);
      if (!on) this.physics.world.debugGraphic.clear();
    }

    this.updateParallax();
    if (this.finished) return;

    const input = this.readInput();
    this.player.update(delta, input);
    this.updateEnemies();
    this.updateInteractables(input);
    this.updateMarkers();
    this.resolveEmbedding();
    this.checkFall();
  }

  updateParallax() {
    const sx = this.cameras.main.scrollX;
    const t = this.time.now;

    // The backdrop itself parallaxes via its scrollFactor, not here.
    this.fogHigh.tilePositionX = sx * 0.06 + t * 0.004;
    this.fogLow.tilePositionX = sx * 0.68 + t * 0.009;
    this.fogDrift.tilePositionX = sx * 0.95 + t * 0.016;
    this.foreground.tilePositionX = sx * 1.25;
  }

  updateEnemies() {
    const list = this.enemies.getChildren().slice();
    list.forEach((e) => {
      if (!e.active || !e.body) return;

      if (e.x <= e.minX) e.dir = 1;
      else if (e.x >= e.maxX) e.dir = -1;
      // Turn at walls too, so enemies do not keep shoving at a ledge.
      else if (e.body.blocked.left) e.dir = 1;
      else if (e.body.blocked.right) e.dir = -1;

      e.setVelocityX(58 * e.dir);
      e.setFlipX(e.dir < 0);

      if (e.y > LANES[e.laneId].killY + 400) e.destroy();
    });
  }

  updateMarkers() {
    const p = this.player;

    if (!this.checkpointTaken && p.lane === this.checkpointSprite.laneId) {
      if (Math.abs(p.x - this.checkpointSprite.x) < 40) {
        this.checkpointTaken = true;
        this.checkpoint = {
          x: this.checkpointSprite.x,
          y: LANES[this.checkpointSprite.laneId].baseY - 60,
          lane: this.checkpointSprite.laneId,
        };
        this.checkpointSprite.setTint(0x63d98d);
        sfx.checkpoint();
        this.game.events.emit('hud:toast', 'Checkpoint reached.');
      }
    }

    if (p.lane === LANE_NEAR && Math.abs(p.x - this.goalSprite.x) < 42) this.win();
  }

  /**
   * Push the player out if they end up *inside* a solid.
   *
   * Arcade ignores any separation larger than the frame's movement — an
   * anti-teleport guard — so a body that becomes deeply embedded is never
   * pushed back out and simply slides through. That's reachable by clipping a
   * a ledge's corner on a short jump. Resting contact leaves near-zero
   * penetration on one axis, so requiring depth on *both* axes catches only
   * genuine embedding.
   */
  resolveEmbedding() {
    const p = this.player;
    if (p.transiting) return;

    const b = p.body;
    const children = this.solids.getChildren();

    for (let i = 0; i < children.length; i++) {
      const s = children[i];
      if (s.laneId !== p.lane || !s.body || !s.body.enable) continue;

      const sb = s.body;
      const overlapX = Math.min(b.right, sb.right) - Math.max(b.x, sb.x);
      const overlapY = Math.min(b.bottom, sb.bottom) - Math.max(b.y, sb.y);
      if (Math.min(overlapX, overlapY) <= 4) continue;

      // Eject along whichever axis is the shorter way out.
      if (overlapX < overlapY) {
        const dx = (b.center.x < sb.center.x ? -1 : 1) * overlapX;
        p.x += dx;
        b.position.x += dx;
        b.prev.x += dx;
        b.velocity.x = 0;
      } else {
        const dy = (b.center.y < sb.center.y ? -1 : 1) * overlapY;
        p.y += dy;
        b.position.y += dy;
        b.prev.y += dy;
        b.velocity.y = 0;
      }
      b.updateCenter();
      return; // one correction per frame is plenty
    }
  }

  checkFall() {
    const p = this.player;
    if (p.transiting) return;
    if (p.y > LANES[p.lane].killY) this.damage(true);
  }
}
