// Car 03 // Repair A regression tests — scan coordinate consistency.
// Runs under `node --test` only. presentCityArt.js imports no Phaser,
// so the real drawing code is exercised against a recording graphics
// mock. The tests prove the behavioral contract:
//
//   * the scan bracket graphics object is bound to WORLD space
//     (scrollFactor 1,0) — the same space as the drone/hero sprites;
//   * drawScanBracket draws the cone and the aimed reticle at the
//     model's world coordinates, matching the gameplay scan region
//     (`pointInDroneCone`) point for point;
//   * under Phaser camera projection (screenX = worldX - scrollX *
//     scrollFactorX) the visible cone stays on the drone and the
//     reticle stays on the player before and after substantial
//     camera scroll.
//
// Under the old bug (screen-pinned scrollFactor 0 + world X coords)
// the projection assertions fail for every scrollX > 0.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createScanBracket,
  drawScanBracket,
  laneToY,
} from '../../src/cars/presentCity/presentCityArt.js';
import {
  createSocialStealthModel,
  SOCIAL_STEALTH_DEFAULTS,
  _internal,
} from '../../src/cars/presentCity/socialStealthModel.js';
import { C, CAR } from '../../src/art/colors.js';
import { GAME_W } from '../../src/constants.js';

const DT = 16;
const { pointInDroneCone } = _internal;

// ---------------------------------------------------------------------------
// Recording Phaser-graphics mock.
// ---------------------------------------------------------------------------

function makeRecordingGraphics() {
  const commands = [];
  const g = {
    commands,
    scrollFactorX: 1,
    scrollFactorY: 1,
    depth: 0,
    fillStyles: [],
    setScrollFactor(x, y) {
      g.scrollFactorX = x;
      g.scrollFactorY = y;
      return g;
    },
    setDepth(d) {
      g.depth = d;
      return g;
    },
    clear() {
      commands.length = 0;
      g.fillStyles.length = 0;
      return g;
    },
    fillStyle(color, alpha) {
      g.fillStyles.push({ color, alpha });
      return g;
    },
    lineStyle(width, color, alpha) {
      commands.push(['lineStyle', width, color, alpha]);
      return g;
    },
    beginPath() {
      commands.push(['beginPath']);
      return g;
    },
    moveTo(x, y) {
      commands.push(['moveTo', x, y]);
      return g;
    },
    lineTo(x, y) {
      commands.push(['lineTo', x, y]);
      return g;
    },
    closePath() {
      commands.push(['closePath']);
      return g;
    },
    fillPath() {
      commands.push(['fillPath']);
      return g;
    },
    strokePath() {
      commands.push(['strokePath']);
      return g;
    },
    strokeCircle(x, y, r) {
      commands.push(['strokeCircle', x, y, r]);
      return g;
    },
    fillRect(x, y, w, h) {
      commands.push(['fillRect', x, y, w, h]);
      return g;
    },
  };
  return g;
}

function makeMockScene() {
  const created = [];
  return {
    created,
    add: {
      graphics() {
        const g = makeRecordingGraphics();
        created.push(g);
        return g;
      },
    },
  };
}

// Extract cone + reticle geometry from the recorded draw commands.
function extractScanGeometry(g) {
  const moveTos = g.commands.filter((c) => c[0] === 'moveTo');
  const lineTos = g.commands.filter((c) => c[0] === 'lineTo');
  const circles = g.commands.filter((c) => c[0] === 'strokeCircle');
  assert.ok(moveTos.length > 0, 'drawScanBracket must draw the cone');
  const coneOrigin = { x: moveTos[0][1], y: moveTos[0][2] };
  const coneFarX = Math.max(...lineTos.map((c) => c[1]));
  const reticle = circles.length > 0 ? { x: circles[0][1], y: circles[0][2], r: circles[0][3] } : null;
  return { coneOrigin, coneFarX, reticle };
}

// Phaser camera projection for a horizontal camera: an object at
// worldX with scrollFactorX renders at worldX - scrollX * scrollFactorX.
function projectX(worldX, scrollFactorX, cameraScrollX) {
  return worldX - cameraScrollX * scrollFactorX;
}

// Drive the model to the aimed-scan state: drone-A actively scanning,
// unanchored player inside the cone (lockTarget === 'player').
function aimedScanState() {
  const m = createSocialStealthModel({ scanPeriodMs: 100000 });
  m.applyQaWarp('isolated-warning');
  m.update(DT, {});
  const snap = m.snapshot();
  const drone = snap.drones.find((d) => d.id === 'drone-A');
  assert.equal(drone.scanActive, true, 'precondition: drone-A actively scanning');
  assert.equal(drone.lockTarget, 'player', 'precondition: drone-A aimed at the player');
  return { model: m, snap, drone };
}

describe('Repair A: scan bracket lives in world space', () => {
  it('createScanBracket binds the graphics object to scrollFactor (1, 0)', () => {
    const scene = makeMockScene();
    const g = createScanBracket(scene);
    assert.equal(g.scrollFactorX, 1, 'scan cone must scroll with the world horizontally');
    assert.equal(g.scrollFactorY, 0, 'camera never scrolls vertically; keep Y fixed');
  });

  it('scene wiring does not override the scan bracket back to screen space', async () => {
    // Supplementary guard (mirrors the source-level wiring checks in
    // socialStealthModel.test.mjs). The behavioral proofs are the
    // drawing/projection tests in this file; this one catches a
    // scene-side override after createScanBracket returns.
    const here = dirname(fileURLToPath(import.meta.url));
    const sceneSrc = await readFile(
      join(here, '..', '..', 'src', 'cars', 'presentCity', 'PresentCityScene.js'),
      'utf8',
    );
    const creation = sceneSrc.indexOf('g = createScanBracket(this)');
    assert.ok(creation >= 0, 'scene must create scan brackets via createScanBracket');
    const after = sceneSrc.slice(creation, creation + 200);
    assert.ok(
      !/setScrollFactor\(\s*0\s*,\s*0\s*\)/.test(after),
      'the scan-bracket creation site must not pin the graphics to the screen',
    );
  });
});

describe('Repair A: drawn scan geometry matches the gameplay scan region', () => {
  it('cone spans exactly the model scan region [drone.x, drone.x + scanConeDepth] in world X', () => {
    const { snap, drone } = aimedScanState();
    const scene = makeMockScene();
    const g = createScanBracket(scene);
    drawScanBracket(
      g,
      { x: drone.x, lane: drone.lane, scanDir: 1, targetX: snap.player.x },
      false,
      drone.scanActive,
      true,
    );
    const geom = extractScanGeometry(g);
    assert.equal(geom.coneOrigin.x, drone.x, 'cone origin must sit on the drone world X');
    assert.equal(geom.coneOrigin.y, laneToY(drone.lane) - 30, 'cone origin must sit on the drone altitude');
    assert.equal(
      geom.coneFarX,
      drone.x + SOCIAL_STEALTH_DEFAULTS.scanConeDepth,
      'cone far edge must match the model scan depth',
    );
    // Point-for-point agreement between the visible cone and the
    // gameplay exposure region used by updateExposure().
    const modelDrone = { x: drone.x, lane: drone.lane };
    const probes = [
      drone.x - 50,
      drone.x - 1,
      drone.x,
      drone.x + 10,
      drone.x + SOCIAL_STEALTH_DEFAULTS.scanConeDepth / 2,
      drone.x + SOCIAL_STEALTH_DEFAULTS.scanConeDepth - 1,
      drone.x + SOCIAL_STEALTH_DEFAULTS.scanConeDepth,
      drone.x + SOCIAL_STEALTH_DEFAULTS.scanConeDepth + 1,
      drone.x + 600,
    ];
    for (const px of probes) {
      const inGameplay = pointInDroneCone(modelDrone, px, drone.lane);
      const inVisual = px >= geom.coneOrigin.x && px <= geom.coneFarX;
      assert.equal(inVisual, inGameplay, `visual cone and gameplay scan region disagree at x=${px}`);
    }
  });

  it('aimed reticle is drawn at the player world X, inside the cone', () => {
    const { snap, drone } = aimedScanState();
    const scene = makeMockScene();
    const g = createScanBracket(scene);
    drawScanBracket(
      g,
      { x: drone.x, lane: drone.lane, scanDir: 1, targetX: snap.player.x },
      false,
      drone.scanActive,
      true,
    );
    const geom = extractScanGeometry(g);
    assert.ok(geom.reticle, 'aimed scan must draw a reticle');
    assert.equal(geom.reticle.x, snap.player.x, 'reticle must sit on the player world X');
    assert.equal(geom.reticle.y, laneToY(drone.lane), 'reticle must sit on the player lane baseline');
    assert.ok(
      geom.reticle.x >= geom.coneOrigin.x && geom.reticle.x <= geom.coneFarX,
      'the aimed target must be inside the visible cone',
    );
    // And the model agrees the player is inside the gameplay region.
    assert.ok(pointInDroneCone({ x: drone.x, lane: drone.lane }, snap.player.x, drone.lane));
  });

  it('visible cone/reticle stay aligned with drone/player across substantial camera scroll', () => {
    const { snap, drone } = aimedScanState();
    const scene = makeMockScene();
    const g = createScanBracket(scene);
    drawScanBracket(
      g,
      { x: drone.x, lane: drone.lane, scanDir: 1, targetX: snap.player.x },
      false,
      drone.scanActive,
      true,
    );
    const geom = extractScanGeometry(g);
    // The drone sprite and the hero are world objects (scrollFactor 1)
    // positioned at drone.x / player.x by the scene. With the camera
    // scrolled, the bracket (scrollFactor read off the real object)
    // must project onto them at every scroll amount. Under the old
    // screen-pinned factor these equalities fail for scrollX > 0.
    const scrolls = [0, 200, 600, 1500, 2400, 3840];
    for (const scrollX of scrolls) {
      assert.ok(scrollX + GAME_W <= 9500, 'scroll stays inside the world');
      const coneScreenX = projectX(geom.coneOrigin.x, g.scrollFactorX, scrollX);
      const droneScreenX = projectX(drone.x, 1, scrollX);
      assert.equal(coneScreenX, droneScreenX, `cone separates from the drone at scrollX=${scrollX}`);
      const reticleScreenX = projectX(geom.reticle.x, g.scrollFactorX, scrollX);
      const playerScreenX = projectX(snap.player.x, 1, scrollX);
      assert.equal(reticleScreenX, playerScreenX, `reticle separates from the player at scrollX=${scrollX}`);
    }
  });
});

describe('Repair A: active/inactive scan behavior and visual language preserved', () => {
  it('scan-off phase draws nothing; scan-on draws the cone', () => {
    const { snap, drone } = aimedScanState();
    const scene = makeMockScene();
    const g = createScanBracket(scene);
    drawScanBracket(g, { x: drone.x, lane: drone.lane, scanDir: 1, targetX: null }, false, false, false);
    assert.equal(g.commands.length, 0, 'no cone in the scan-off phase');
    drawScanBracket(g, { x: drone.x, lane: drone.lane, scanDir: 1, targetX: null }, false, true, false);
    assert.ok(g.commands.length > 0, 'cone drawn in the scan-on phase');
    assert.equal(extractScanGeometry(g).reticle, null, 'no reticle when not aimed');
  });

  it('warning state switches the cone color LAMP_WARN -> LAMP_ALERT', () => {
    const { snap, drone } = aimedScanState();
    const scene = makeMockScene();
    const g = createScanBracket(scene);
    drawScanBracket(g, { x: drone.x, lane: drone.lane, scanDir: 1, targetX: null }, false, true, false);
    const normal = g.fillStyles[0];
    drawScanBracket(g, { x: drone.x, lane: drone.lane, scanDir: 1, targetX: null }, true, true, false);
    const warning = g.fillStyles[0];
    assert.equal(normal.color, C(CAR.LAMP_WARN), 'loose scan uses LAMP_WARN');
    assert.equal(warning.color, C(CAR.LAMP_ALERT), 'warning scan uses LAMP_ALERT');
    void snap;
  });
});
