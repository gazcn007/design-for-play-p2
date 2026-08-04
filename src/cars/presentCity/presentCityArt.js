// Car 03 // presentCityArt
// All sprite / shape / cone / scan-bracket / fireworks drawing for the
// Car 03 isolated vertical slice. Pure visuals: takes a Phaser scene
// and a snapshot from the model, draws onto the scene. No state.
// No Car 01 / Car 02 import.
//
// Color rules: every literal goes through C() from src/art/colors.js.
// The 24-color CAR palette is the only source of truth. No new color
// introduced. No expansion of the palette file.
//
// Scale policy (P0-2): HERO 3.0, NPC 2.6, COMPANION 2.6, DRONE 2.2.
// Lane Y baselines moved to [400, 500] so actors walk on the
// carriage-deck surface instead of floating in the window.
// Floor deck spans y=500..600, ceiling y=0..70, window strip y=70..500.

import { C, CAR, DEPTH } from '../../art/colors.js';
import { GAME_W, GAME_H, LANE_FAR, LANE_NEAR } from '../../constants.js';

// ---------------------------------------------------------------------------
// Scale and lane constants. P0-5 (Codex repair): the previous NPC
// scale (3.6) made a 10-member crowd in a 360px footprint read as a
// single rectangular blob. We drop NPC_SCALE from 3.6 -> 2.0 so a
// 18x32 NPC renders at 36x64 px — slightly wider than the 36px slot
// spacing, but no longer two-and-a-half slots wide. Hero stays at 4.5
// (the brief requires the player to be the highest-readability
// silhouette). Companion stays at 3.6 (one figure, plenty of room).
// Drone stays at 3.0 (54px target).
// ---------------------------------------------------------------------------
const HERO_SCALE = 4.5;
const NPC_SCALE = 2.0;
const COMPANION_SCALE = 3.6;
const DRONE_SCALE = 3.0;
const FIREWORK_SCALE = 3.0;

// Lane Y baselines. FAR (back, drawn higher) = 400, NEAR (front) = 500.
// Floor deck sits at y=500..600 (top edge at y=500).
const LANE_Y = [400, 500];

// Window pillars. 4 evenly spaced vertical strips in the window band.
const PILLAR_X = [120, 360, 600, 840];
const PILLAR_WIDTH = 6;

// Floor decoration strips.
const FLOOR_DECO_Y = [520, 560, 580];

// Convert world x to screen x (camera scrolls on player).
export function worldToScreenX(scene, worldX) {
  return Math.round(worldX - scene.cameras.main.scrollX);
}

// Convert lane index to screen y.
export function laneToY(lane) {
  return LANE_Y[lane] ?? LANE_Y[LANE_NEAR];
}

// World Y for the floor-deck top surface. 500 (LANE_Y[NEAR]).
export function floorY() {
  return LANE_Y[LANE_NEAR];
}

// ============================================================================
// Sprite texture generation
// ============================================================================

// Build a hero pixel-art sprite. Uses HERO_BASE body with HERO_TRIM chest
// band and HERO_ACCENT head. 20x36 texture; at HERO_SCALE 4.5 the
// effective height is ~162px, but the visible body is ~80px. Clearly
// readable at 100% screenshot scale.
export function createHeroSprite(scene) {
  const c = C;
  const body = c(CAR.HERO_BASE);
  const trim = c(CAR.HERO_TRIM);
  const accent = c(CAR.HERO_ACCENT);
  const ink = c(CAR.STEEL_DARK);

  if (typeof window !== 'undefined' && window.__CAR03_DEBUG__) {
    console.log('createHeroSprite: body=', body.toString(16), 'trim=', trim.toString(16), 'accent=', accent.toString(16), 'ink=', ink.toString(16));
  }

  const g = scene.add.graphics();
  g.fillStyle(body, 1);
  // Body (shifted so the texture's (0,0) is the top-left of the body)
  g.fillRoundedRect(2, 4, 16, 28, 3);
  // Chest trim band
  g.fillStyle(trim, 1);
  g.fillRect(4, 10, 12, 5);
  // Head
  g.fillStyle(accent, 1);
  g.fillCircle(10, 0, 5);
  // Eye dots
  g.fillStyle(ink, 1);
  g.fillRect(8, -1, 1, 1);
  g.fillRect(11, -1, 1, 1);
  // Legs
  g.fillStyle(ink, 1);
  g.fillRect(3, 32, 3, 4);
  g.fillRect(14, 32, 3, 4);
  g.generateTexture('car03-hero', 20, 36);
  g.destroy();

  const sprite = scene.add.image(0, 0, 'car03-hero');
  sprite.setScale(HERO_SCALE);
  sprite.setOrigin(0.5, 1);
  sprite.setDepth(DEPTH.ACTORS);
  return sprite;
}

// Build a generic commuter NPC sprite. Body uses ENAMEL_MID by default.
export function createNpcSprite(scene, color) {
  const c = C;
  const body = c(color ?? CAR.ENAMEL_MID);
  const trim = c(CAR.STEEL_MID);
  const ink = c(CAR.STEEL_DARK);

  const g = scene.add.graphics();
  g.fillStyle(body, 1);
  g.fillRoundedRect(2, 5, 14, 25, 2);
  g.fillStyle(trim, 1);
  g.fillRect(4, 10, 10, 4);
  g.fillStyle(ink, 1);
  g.fillCircle(9, 0, 4);
  g.fillRect(3, 30, 3, 2);
  g.fillRect(12, 30, 3, 2);
  g.generateTexture(`car03-npc-${(color ?? CAR.ENAMEL_MID).toString(16)}`, 18, 32);
  g.destroy();

  const sprite = scene.add.image(0, 0, `car03-npc-${(color ?? CAR.ENAMEL_MID).toString(16)}`);
  sprite.setScale(NPC_SCALE);
  sprite.setOrigin(0.5, 1);
  sprite.setDepth(DEPTH.ACTORS);
  return sprite;
}

// Companion sprite uses ENAMEL_MID body + a 4px LAMP_OK chest trim
// (scarf/pin) so the companion is recognizable at screenshot scale
// without re-tinting the whole body.
export function createCompanionSprite(scene) {
  const c = C;
  const body = c(CAR.ENAMEL_MID);
  const trim = c(CAR.STEEL_HI);
  const ink = c(CAR.STEEL_DARK);
  const pin = c(CAR.LAMP_OK);

  const g = scene.add.graphics();
  g.fillStyle(body, 1);
  g.fillRoundedRect(2, 5, 14, 25, 2);
  g.fillStyle(trim, 1);
  g.fillRect(4, 10, 10, 4);
  g.fillStyle(ink, 1);
  g.fillCircle(9, 0, 4);
  // Distinctive 4px LAMP_OK chest trim (scarf / pin). Not a full-body recolor.
  g.fillStyle(pin, 1);
  g.fillRect(5, 14, 8, 4);
  g.fillRect(3, 30, 3, 2);
  g.fillRect(12, 30, 3, 2);
  g.generateTexture('car03-companion', 18, 32);
  g.destroy();

  const sprite = scene.add.image(0, 0, 'car03-companion');
  sprite.setScale(COMPANION_SCALE);
  sprite.setOrigin(0.5, 1);
  sprite.setDepth(DEPTH.ACTORS);
  return sprite;
}

// Drone sprite: a small dark teardrop with STEEL_HI rim. 18x18 texture
// (scaled to ~54x54 at DRONE_SCALE 3.0).
export function createDroneSprite(scene) {
  const c = C;
  const body = c(CAR.STEEL_DARK);
  const rim = c(CAR.STEEL_HI);
  const accent = c(CAR.LAMP_WARN);

  const g = scene.add.graphics();
  g.fillStyle(body, 1);
  g.fillCircle(9, 9, 7);
  g.lineStyle(1, rim, 1);
  g.strokeCircle(9, 9, 7);
  g.fillStyle(rim, 1);
  g.fillRect(6, 16, 6, 2);
  // Front emitter dot
  g.fillStyle(accent, 1);
  g.fillCircle(13, 9, 2);
  g.generateTexture('car03-drone', 18, 18);
  g.destroy();

  const sprite = scene.add.image(0, 0, 'car03-drone');
  sprite.setScale(DRONE_SCALE);
  sprite.setOrigin(0.5, 0.5);
  sprite.setDepth(DEPTH.MACHINERY + 5);
  return sprite;
}

// ============================================================================
// Scan bracket — fan triangle ahead of the drone. P0-4 makes the line
// 3px stroke and adds vertical end ticks on the far edge. Two states:
//   * loose (default): wider, lower alpha, LAMP_WARN
//   * tight  (warning): narrower, higher alpha, LAMP_ALERT
// ============================================================================
export function createScanBracket(scene) {
  const g = scene.add.graphics();
  g.setDepth(DEPTH.MACHINERY + 2);
  // Repair A: the cone and the aimed reticle are drawn in WORLD
  // coordinates (drone.x / player.x — the same space the model's
  // scan-region test uses), so the graphics object must scroll with
  // the world. Pinning it to the screen (scrollFactor 0) made the
  // visible scan separate from the gameplay scan region as soon as
  // the camera scrolled. Every other per-frame feedback overlay uses
  // this same world-space contract.
  g.setScrollFactor(1, 0);
  return g;
}

export function drawScanBracket(g, drone, warning, scanActive, aimed) {
  if (!g || !drone) return;
  g.clear();
  // Debug surface (P0-7 / Codex evidence accuracy): expose the
  // last call's flags so the CDP driver / tests can verify the
  // visual state actually matches the model state. The driver
  // reads `window.__car03LastScan` to confirm cones are being
  // drawn at the right scan-active / aimed phase.
  if (typeof window !== 'undefined') {
    window.__car03LastScan = { warning, scanActive, aimed, x: drone.x, lane: drone.lane };
  }
  if (!scanActive) return;
  const c = C;
  const baseColor = warning ? c(CAR.LAMP_ALERT) : c(CAR.LAMP_WARN);
  const fillAlpha = warning ? 0.32 : 0.18;
  const strokeAlpha = warning ? 0.95 : 0.75;
  const widthPx = warning ? 220 : 300;
  const depth = 320;
  const x0 = drone.x;
  const y0 = laneToY(drone.lane) - 30;
  const facing = drone.scanDir ?? 1;
  const x1 = x0 + facing * depth;
  const w = widthPx / 2;
  // Filled cone polygon for the spatial "beam" reading.
  g.fillStyle(baseColor, fillAlpha);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y0 - w);
  g.lineTo(x1, y0 + w);
  g.lineTo(x0, y0);
  g.closePath();
  g.fillPath();
  // Outline (3px stroke, P0-4)
  g.lineStyle(3, baseColor, strokeAlpha);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y0 - w);
  g.lineTo(x1, y0 + w);
  g.lineTo(x0, y0);
  g.closePath();
  g.strokePath();
  // Near-side "scanner mouth" — two short vertical lines on the drone side.
  g.lineStyle(3, baseColor, strokeAlpha);
  g.beginPath();
  g.moveTo(x0, y0 - 32);
  g.lineTo(x0, y0 - 6);
  g.moveTo(x0, y0 + 6);
  g.lineTo(x0, y0 + 32);
  g.strokePath();
  // Far-end vertical ticks (the "end ticks" from P0-4).
  g.lineStyle(3, baseColor, strokeAlpha);
  g.beginPath();
  g.moveTo(x1, y0 - w);
  g.lineTo(x1, y0 - w + (facing > 0 ? -10 : 10));
  g.moveTo(x1, y0 + w);
  g.lineTo(x1, y0 + w + (facing > 0 ? 10 : -10));
  g.strokePath();
  // Aimed reticle: when the cone is currently aimed at the player,
  // draw a small crosshair on the player position so the threat reads.
  if (aimed && drone.targetX != null) {
    g.lineStyle(2, baseColor, 1);
    const tx = drone.targetX;
    const ty = laneToY(drone.lane);
    g.strokeCircle(tx, ty, 14);
    g.beginPath();
    g.moveTo(tx - 22, ty);
    g.lineTo(tx - 6, ty);
    g.moveTo(tx + 6, ty);
    g.lineTo(tx + 22, ty);
    g.moveTo(tx, ty - 22);
    g.lineTo(tx, ty - 6);
    g.moveTo(tx, ty + 6);
    g.lineTo(tx, ty + 22);
    g.strokePath();
  }
}

// ============================================================================
// Ground bracket (P0-4) — 70px wide ground bracket under player feet
// with 14px vertical end ticks, 3px stroke, narrowing as exposure grows.
// Visible whenever the player is in a drone cone (or already in warning).
// ============================================================================
export function createGroundBracket(scene) {
  const g = scene.add.graphics();
  g.setDepth(DEPTH.MACHINERY + 1);
  return g;
}

export function drawGroundBracket(g, player, exposureMs, anchored, warningMs, lockMs) {
  if (!g) return;
  g.clear();
  if (anchored || exposureMs <= 0) return;
  const t = Math.min(1, exposureMs / lockMs);
  const c = C;
  const color = exposureMs >= warningMs ? c(CAR.LAMP_ALERT) : c(CAR.LAMP_WARN);
  const y = laneToY(player.lane) + 6;
  const halfWidth = 35;
  const closing = (1 - t) * halfWidth;
  // 3px stroke (P0-4), 14px end-tick height.
  g.lineStyle(3, color, 0.9);
  g.beginPath();
  // Left vertical end-tick
  g.moveTo(player.x - closing, y - 4);
  g.lineTo(player.x - closing, y + 14);
  // Left horizontal connector
  g.moveTo(player.x - closing, y + 10);
  g.lineTo(player.x - 8, y + 10);
  // Right horizontal connector
  g.moveTo(player.x + 8, y + 10);
  g.lineTo(player.x + closing, y + 10);
  // Right vertical end-tick
  g.moveTo(player.x + closing, y - 4);
  g.lineTo(player.x + closing, y + 14);
  g.strokePath();
  // Center fill rectangle (so the bracket reads as a "footprint")
  g.fillStyle(color, 0.18);
  g.fillRect(player.x - 8, y, 16, 4);
}

// ============================================================================
// Anchored floor bar (P0-5) — when player is anchored, draw a 4px
// LAMP_OK semi-transparent strip spanning the joined crowd footprint.
// ============================================================================
export function createAnchoredFloorBar(scene) {
  const g = scene.add.graphics();
  g.setDepth(DEPTH.MACHINERY);
  return g;
}

export function drawAnchoredFloorBar(g, player, crowds) {
  if (!g) return;
  g.clear();
  if (!player.anchoredGroupId) return;
  const c = C;
  const crowd = crowds.find((cc) => cc.id === player.anchoredGroupId);
  if (!crowd) return;
  const y = laneToY(player.lane) + 16;
  const stripColor = c(CAR.LAMP_OK);
  // 4px strip spanning the full crowd footprint.
  g.fillStyle(stripColor, 0.55);
  g.fillRect(crowd.leftX, y, crowd.rightX - crowd.leftX, 4);
  // Brackets at the ends so it reads as "footprint" not random line.
  g.lineStyle(2, stripColor, 0.9);
  g.beginPath();
  g.moveTo(crowd.leftX, y - 4);
  g.lineTo(crowd.leftX, y + 8);
  g.moveTo(crowd.rightX, y - 4);
  g.lineTo(crowd.rightX, y + 8);
  g.strokePath();
}

// ============================================================================
// Cadence ticks (P0-5) — rhythmic pulse brackets around player feet
// during the 350ms cadence lock. 3px LAMP_OK stroke, 18px end-tick
// height. Closes as the lock approaches completion.
// ============================================================================
export function createCadenceTicks(scene) {
  const g = scene.add.graphics();
  g.setDepth(DEPTH.MACHINERY + 1);
  return g;
}

export function drawCadenceTicks(g, player, groupCenter, cadenceMsLeft, cadenceTotalMs) {
  if (!g) return;
  g.clear();
  if (cadenceMsLeft == null || cadenceMsLeft <= 0) return;
  const t = 1 - Math.max(0, Math.min(1, cadenceMsLeft / cadenceTotalMs));
  const c = C;
  const color = c(CAR.LAMP_OK);
  const y = laneToY(player.lane) + 6;
  const closing = 26 - t * 12;
  g.lineStyle(3, color, 0.95);
  g.beginPath();
  // Left end-tick (18px tall)
  g.moveTo(player.x - closing, y - 4);
  g.lineTo(player.x - closing, y + 14);
  // Right end-tick
  g.moveTo(player.x + closing, y - 4);
  g.lineTo(player.x + closing, y + 14);
  g.strokePath();
  g.fillStyle(color, 0.45);
  g.fillRect(player.x - 6, y, 12, 3);
  g.fillStyle(color, 0.85);
  g.fillRect(player.x - 1, y - 6, 2, 6);
}

// ============================================================================
// Transfer overlap bracket (P0-6) — when player is in an overlap zone
// between two groups, draw an outline bracket on the overlap region
// and a "[E TRANSFER]" text label above the player.
// ============================================================================
export function createTransferBracket(scene) {
  const bracket = scene.add.graphics();
  bracket.setDepth(DEPTH.MACHINERY + 3);
  const label = scene.add.text(0, 0, '[E TRANSFER]', {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#0a1015',
    backgroundColor: '#9fb7c0',
    padding: { x: 4, y: 2 },
  });
  label.setOrigin(0.5, 1);
  label.setDepth(DEPTH.MACHINERY + 4);
  label.setVisible(false);
  return { bracket, label };
}

export function drawTransferBracket(handle, player, overlapLeft, overlapRight) {
  if (!handle || !handle.bracket) return;
  const g = handle.bracket;
  g.clear();
  if (overlapLeft == null || overlapRight == null) {
    handle.label.setVisible(false);
    return;
  }
  const c = C;
  const color = c(CAR.LAMP_WARN);
  const y = laneToY(player.lane) - 6;
  // Outline box on the overlap region
  g.lineStyle(2, color, 0.95);
  g.strokeRect(overlapLeft, y - 40, overlapRight - overlapLeft, 60);
  // Floor tick on the overlap
  g.lineStyle(3, color, 0.95);
  g.beginPath();
  g.moveTo(overlapLeft, y + 22);
  g.lineTo(overlapLeft, y + 30);
  g.moveTo(overlapRight, y + 22);
  g.lineTo(overlapRight, y + 30);
  g.strokePath();
  // Label
  handle.label.setPosition((overlapLeft + overlapRight) / 2, y - 42);
  handle.label.setVisible(true);
}

// ============================================================================
// Duo sync brackets (P0-7) — when duo.active, draw 4 L-shaped corner
// brackets around both the player and the companion, framing them as
// a paired unit. Plus a connecting floor line.
// ============================================================================
export function createDuoSync(scene) {
  const g = scene.add.graphics();
  g.setDepth(DEPTH.MACHINERY + 4);
  return g;
}

export function drawDuoSync(g, player, companion) {
  if (!g) return;
  g.clear();
  const c = C;
  const color = c(CAR.LAMP_OK);
  const halfW = 18;
  const halfH = 40;
  // Helper to draw 4 L-corner brackets around a sprite.
  function corners(x, y) {
    g.lineStyle(2, color, 0.95);
    g.beginPath();
    // Top-left
    g.moveTo(x - halfW, y - halfH);
    g.lineTo(x - halfW, y - halfH + 8);
    g.moveTo(x - halfW, y - halfH);
    g.lineTo(x - halfW + 8, y - halfH);
    // Top-right
    g.moveTo(x + halfW, y - halfH);
    g.lineTo(x + halfW, y - halfH + 8);
    g.moveTo(x + halfW, y - halfH);
    g.lineTo(x + halfW - 8, y - halfH);
    // Bottom-left
    g.moveTo(x - halfW, y);
    g.lineTo(x - halfW, y - 8);
    g.moveTo(x - halfW, y);
    g.lineTo(x - halfW + 8, y);
    // Bottom-right
    g.moveTo(x + halfW, y);
    g.lineTo(x + halfW, y - 8);
    g.moveTo(x + halfW, y);
    g.lineTo(x + halfW - 8, y);
    g.strokePath();
  }
  corners(player.x, laneToY(player.lane));
  corners(companion.x, laneToY(companion.lane));
  // Floor connector line under the pair, with a tick mark in the middle.
  const minX = Math.min(player.x, companion.x);
  const maxX = Math.max(player.x, companion.x);
  const yFloor = Math.max(laneToY(player.lane), laneToY(companion.lane)) + 12;
  g.lineStyle(2, color, 0.9);
  g.beginPath();
  g.moveTo(minX, yFloor);
  g.lineTo(maxX, yFloor);
  // Center tick
  g.moveTo((minX + maxX) / 2, yFloor - 4);
  g.lineTo((minX + maxX) / 2, yFloor + 4);
  g.strokePath();
  // LAMP_OK dim fill between the corners
  g.fillStyle(color, 0.12);
  const minLeft = Math.min(player.x, companion.x) - halfW;
  const maxRight = Math.max(player.x, companion.x) + halfW;
  g.fillRect(minLeft, yFloor - 6, maxRight - minLeft, 4);
}

// ============================================================================
// Locked-player overlay (P0-7) — visible red overlay on the locked
// player (whole-body tint) plus a safe-anchor marker showing where
// the player is being teleported to. The full-screen warning flash
// lives in the separate `lockScreenFlash` (see below) so it can stay
// screen-fixed while the rest scrolls with the world.
// ============================================================================
export function createLockedOverlay(scene) {
  const g = scene.add.graphics();
  g.setDepth(DEPTH.MACHINERY + 6);
  return g;
}

export function drawLockedOverlay(g, player, lockMsLeft, lockHoldMs) {
  if (!g) return;
  g.clear();
  if (!player || lockMsLeft <= 0) return;
  const c = C;
  const color = c(CAR.LAMP_ALERT);
  // Whole-body tint rect behind the player (world coords).
  const px = player.x;
  const py = laneToY(player.lane);
  g.fillStyle(color, 0.55);
  g.fillRoundedRect(px - 18, py - 100, 36, 100, 4);
  // Lock icon above the player (a 12x12 reticle)
  g.lineStyle(2, color, 1);
  g.strokeCircle(px, py - 110, 9);
  g.beginPath();
  g.moveTo(px - 14, py - 110);
  g.lineTo(px - 4, py - 110);
  g.moveTo(px + 4, py - 110);
  g.lineTo(px + 14, py - 110);
  g.moveTo(px, py - 124);
  g.lineTo(px, py - 114);
  g.moveTo(px, py - 106);
  g.lineTo(px, py - 96);
  g.strokePath();
  // Safe-anchor marker (small bracket on the safe-anchor x).
  if (player.safeAnchorX != null) {
    const ax = player.safeAnchorX;
    g.lineStyle(3, color, 1);
    g.beginPath();
    g.moveTo(ax, py - 60);
    g.lineTo(ax, py - 6);
    g.strokePath();
    g.fillStyle(color, 0.9);
    g.fillTriangle(ax - 4, py - 6, ax + 4, py - 6, ax, py);
  }
}

// Lock screen flash — the only intentional screen-space element of
// the locked-player feedback (P0-4 / Codex: "screen object:
// scrollFactor(0) + screenX/Y"). Drawn as a 0.20 max-alpha
// subordinate LAMP_ALERT tint across the full canvas. Decays with
// the remaining lock time so the screen never holds a stale flash
// after release.
export function createLockScreenFlash(scene) {
  const g = scene.add.graphics();
  g.setDepth(DEPTH.MACHINERY + 7);
  g.setScrollFactor(0, 0);
  return g;
}

export function drawLockScreenFlash(g, player, lockMsLeft, lockHoldMs) {
  if (!g) return;
  g.clear();
  if (!player || lockMsLeft <= 0) return;
  const c = C;
  const color = c(CAR.LAMP_ALERT);
  const flashAlpha = Math.min(0.20, (lockMsLeft / lockHoldMs) * 0.20);
  g.fillStyle(color, flashAlpha);
  g.fillRect(0, 0, GAME_W, GAME_H);
}

// ============================================================================
// Dispersal panic visual (P1-2) — when alert is active in section IV,
// crowd members get a red exclamation mark above them and tilt/angle.
// The scene reads `crowd.memberOffsets` to render each member at a
// scattered position. The model owns the offsets; this function only
// draws the panic decoration.
// ============================================================================
export function createPanicIcons(scene) {
  const g = scene.add.graphics();
  g.setDepth(DEPTH.MACHINERY + 3);
  return g;
}

export function drawPanicIcons(g, crowd, memberXs) {
  if (!g) return;
  g.clear();
  if (!crowd.disperses) return;
  const c = C;
  const color = c(CAR.LAMP_ALERT);
  const y = laneToY(crowd.lane) - 50;
  for (const x of memberXs) {
    // Exclamation mark — vertical bar + dot
    g.fillStyle(color, 0.95);
    g.fillRect(x - 1, y, 2, 8);
    g.fillRect(x - 1, y + 10, 2, 2);
  }
}

// ============================================================================
// Train shell (P0-3 / P0-6) — solid dark carriage interior framing,
// heavy window pillars, solid floor deck at y=500..600, ceiling at
// y=0..70, with STEEL_HI rivet/trim details. The window band
// (y=70..500, x=8..GAME_W-8) is INTENTIONALLY NOT filled with an
// opaque rectangle — the photographic panorama (backdrop-03) shows
// through it. The shell only frames the windows with side walls,
// outer pillars, inner pillars, ceiling, and floor.
// ============================================================================
export function createTrainShell(scene) {
  const c = C;
  const ink = c(CAR.VOID);
  const wall = c(CAR.VOID_LIFT);
  const pillar = c(CAR.ENAMEL_DARK);
  const trim = c(CAR.STEEL_HI);
  const accent = c(CAR.LAMP_WARN);

  const g = scene.add.graphics();
  g.setDepth(DEPTH.SHELL);

  // Ceiling (top frame), y=0..70 — opaque (the train ceiling blocks
  // the panorama above).
  g.fillStyle(ink, 1);
  g.fillRect(0, 0, GAME_W, 70);
  // Ceiling rivet strip
  g.fillStyle(trim, 0.55);
  for (let x = 60; x < GAME_W - 40; x += 40) {
    g.fillCircle(x, 14, 2);
  }
  // Ceiling cross-bar at y=64
  g.fillStyle(trim, 0.4);
  g.fillRect(0, 64, GAME_W, 2);

  // Side walls (vertical strips on each side of the window band) —
  // these are the carriage side walls, not the windows.
  g.fillStyle(wall, 1);
  g.fillRect(0, 70, 24, 430);
  g.fillRect(GAME_W - 24, 70, 24, 430);
  // Outer pillars (visible window-frame edges on the inner side of
  // the side walls)
  g.fillStyle(pillar, 1);
  g.fillRect(0, 70, 8, 430);
  g.fillRect(GAME_W - 8, 70, 8, 430);

  // Window band y=70..500. NOT FILLED — the panorama shows through.
  // The 4 inner pillars (PILLAR_X) are drawn on top of the panorama.

  // Window pillars (vertical ENAMEL_DARK strips at PILLAR_X)
  for (const px of PILLAR_X) {
    g.fillStyle(pillar, 1);
    g.fillRect(px - PILLAR_WIDTH / 2, 70, PILLAR_WIDTH, 430);
    // Steel_HI highlight edge on the right of each pillar (3D edge cue)
    g.fillStyle(trim, 0.5);
    g.fillRect(px + PILLAR_WIDTH / 2 - 1, 70, 1, 430);
    // STEEL_DARK shadow edge on the left
    g.fillStyle(c(CAR.STEEL_DARK), 0.7);
    g.fillRect(px - PILLAR_WIDTH / 2, 70, 1, 430);
  }

  // Floor deck, y=500..600 (100px solid STEEL_MID with VOID_LIFT
  // upper band, and a STEEL_HI trim line at y=500).
  g.fillStyle(wall, 1);
  g.fillRect(0, 500, GAME_W, 100);
  // Floor trim line at y=500 (the "deck surface" the actors stand on)
  g.fillStyle(trim, 1);
  g.fillRect(0, 500, GAME_W, 4);
  // Sub-trim under it (shadow)
  g.fillStyle(ink, 0.85);
  g.fillRect(0, 504, GAME_W, 2);
  // Floor decoration strips (faint, medium, strong)
  g.fillStyle(c(CAR.STEEL_DARK), 0.6);
  g.fillRect(0, FLOOR_DECO_Y[0], GAME_W, 2);
  g.fillStyle(trim, 0.35);
  g.fillRect(0, FLOOR_DECO_Y[1], GAME_W, 1);
  g.fillStyle(c(CAR.STEEL_MID), 0.5);
  g.fillRect(0, FLOOR_DECO_Y[2], GAME_W, 1);
  // Floor rivets (paired dots)
  g.fillStyle(ink, 0.85);
  for (let x = 30; x < GAME_W - 20; x += 60) {
    g.fillCircle(x, 514, 2);
    g.fillCircle(x + 30, 514, 2);
  }
  // Subtle edge amber accent (subway-train car interior cue)
  g.fillStyle(accent, 0.10);
  g.fillRect(0, 502, GAME_W, 1);

  // Side bollards (small dark vertical accents on the side walls)
  for (let y = 100; y < 480; y += 80) {
    g.fillStyle(ink, 0.7);
    g.fillRect(2, y, 4, 16);
    g.fillRect(GAME_W - 6, y, 4, 16);
  }
  return g;
}

// ============================================================================
// Firework sprite — generated on demand. Uses TUNGSTEN / LAMP_OK /
// LAMP_ALERT mix.
// ============================================================================
export function createFireworkSprite(scene) {
  const c = C;
  const gold = c(CAR.TUNGSTEN);
  const red = c(CAR.LAMP_ALERT);
  const cyan = c(CAR.LAMP_OK);
  const amber = c(CAR.TUNGSTEN_REFLECT);
  const ink = c(CAR.VOID);

  const g = scene.add.graphics();
  const rays = 8;
  for (let i = 0; i < rays; i++) {
    const ang = (i / rays) * Math.PI * 2;
    const dx = Math.cos(ang) * 8;
    const dy = Math.sin(ang) * 8;
    g.lineStyle(2, gold, 1);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(dx, dy);
    g.strokePath();
    g.lineStyle(1, amber, 0.7);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(dx * 0.6, dy * 0.6);
    g.strokePath();
  }
  g.fillStyle(red, 0.9);
  g.fillCircle(0, 0, 3);
  g.fillStyle(cyan, 0.7);
  g.fillCircle(0, 0, 1.5);
  g.fillStyle(ink, 0.3);
  g.fillCircle(0, 0, 2);
  g.generateTexture('car03-firework', 24, 24);
  g.destroy();

  const sprite = scene.add.image(0, 0, 'car03-firework');
  sprite.setScale(FIREWORK_SCALE);
  sprite.setOrigin(0.5, 0.5);
  sprite.setDepth(DEPTH.FOREGROUND - 1);
  return sprite;
}

// ============================================================================
// Lock flash (legacy) — small smoke/warning above the locked player.
// Kept for backward-compat; drawLockedOverlay is the main warning now.
// ============================================================================
export function createLockFlash(scene) {
  const g = scene.add.graphics();
  g.setDepth(DEPTH.FOREGROUND - 5);
  return g;
}

export function drawLockFlash(g, scene, player, lockMsLeft, lockHoldMs) {
  if (!g) return;
  g.clear();
  if (!player || lockMsLeft <= 0) return;
  const c = C;
  const alpha = (lockMsLeft / lockHoldMs) * 0.5;
  const color = c(CAR.LAMP_ALERT);
  const y = laneToY(player.lane) - 60;
  g.fillStyle(color, alpha);
  g.fillRect(player.x - 60, y, 120, 14);
}
