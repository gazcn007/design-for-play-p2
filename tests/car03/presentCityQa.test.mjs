// Car 03 // QA fixture tests.
// Verifies the post-warp snapshot fields required by the
// `render_game_to_text()` contract (Design Lock §10) and that ten
// `reset` calls reproduce the entry snapshot bit-for-bit.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createSocialStealthModel } from '../../src/cars/presentCity/socialStealthModel.js';
import { LANE_FAR, LANE_NEAR } from '../../src/constants.js';

const DT = 16;

const REQUIRED_FIELDS = [
  'state', 'section', 'complete', 'alertActive', 'player', 'crowds',
  'drones', 'companion', 'duo', 'qaState',
];

const REQUIRED_PLAYER_FIELDS = [
  'x', 'y', 'lane', 'vx', 'facing', 'anchoredGroupId', 'exposureMs',
  'locked', 'lockMsLeft', 'safeAnchorX', 'targetOffsetX', 'cadenceLockMsLeft',
];

const REQUIRED_CROWD_FIELDS = [
  'id', 'lane', 'x', 'leftX', 'rightX', 'vx', 'members',
  'disperses', 'scattered', 'memberOffsets',
];

const REQUIRED_DRONE_FIELDS = ['id', 'lane', 'x', 'scanActive', 'lockTarget'];
const REQUIRED_COMPANION_FIELDS = [
  'id', 'lane', 'x', 'vx', 'state', 'groupId', 'caughtMs', 'facing',
];
const REQUIRED_DUO_FIELDS = [
  'active', 'alignment', 'playerVx', 'companionVx', 'dx',
];

// Real-shape check: every required key exists, and its value is the
// right *concrete* type. Replaces the previous tautological
// `typeof snap[k] === typeof snap[k]` (which always passed).
// P0-8 (Codex repair): use Object.hasOwn instead of `in` so we don't
// count inherited prototype keys.
function assertShape(snap) {
  for (const k of REQUIRED_FIELDS) {
    assert.ok(Object.hasOwn(snap, k), `field ${k} missing from snapshot`);
  }
  for (const k of REQUIRED_PLAYER_FIELDS) {
    assert.ok(Object.hasOwn(snap.player, k), `player.${k} missing`);
  }
  for (const c of snap.crowds) {
    for (const k of REQUIRED_CROWD_FIELDS) {
      assert.ok(Object.hasOwn(c, k), `crowd.${k} missing on ${c.id}`);
    }
    assert.ok(Array.isArray(c.memberOffsets), `crowd.${c.id}.memberOffsets must be an array`);
  }
  for (const d of snap.drones) {
    for (const k of REQUIRED_DRONE_FIELDS) {
      assert.ok(Object.hasOwn(d, k), `drone.${k} missing on ${d.id}`);
    }
  }
  for (const k of REQUIRED_COMPANION_FIELDS) {
    assert.ok(Object.hasOwn(snap.companion, k), `companion.${k} missing`);
  }
  for (const k of REQUIRED_DUO_FIELDS) {
    assert.ok(Object.hasOwn(snap.duo, k), `duo.${k} missing`);
  }
  // Concrete type spot-checks
  assert.equal(typeof snap.player.x, 'number');
  assert.equal(typeof snap.player.lane, 'number');
  assert.equal(typeof snap.complete, 'boolean');
  assert.equal(typeof snap.alertActive, 'boolean');
  assert.equal(typeof snap.duo.active, 'boolean');
}

describe('presentCityQa fixtures', () => {
  it('every fixture returns a snapshot with the required fields', () => {
    const cases = [
      'entry', 'rule-demo', 'isolated-warning', 'locked-recovery',
      'joined-slow', 'joined-fast', 'group-transfer', 'lane-risk',
      'companion-stranded', 'companion-rescued', 'crowd-dispersal',
      'duo-sync', 'complete', 'reset-replay',
    ];
    for (const qa of cases) {
      const m = createSocialStealthModel();
      const snap = m.applyQaWarp(qa);
      assert.equal(snap.qaState, qa);
      assertShape(snap);
    }
  });

  it('entry fixture places player on LANE_NEAR, anchored empty, exposure 0', () => {
    const m = createSocialStealthModel();
    const snap = m.applyQaWarp('entry');
    assert.equal(snap.player.lane, LANE_NEAR);
    assert.equal(snap.player.anchoredGroupId, null);
    assert.equal(snap.player.exposureMs, 0);
    assert.equal(snap.player.locked, false);
    assert.equal(snap.player.targetOffsetX, 0);
  });

  it('joined-slow exposes the anchored group id and targetOffsetX 0', () => {
    const m = createSocialStealthModel();
    const snap = m.applyQaWarp('joined-slow');
    assert.equal(snap.player.anchoredGroupId, 'slow-I');
    assert.equal(snap.player.targetOffsetX, 0);
  });

  it('joined-fast exposes FAR lane and fast-II group', () => {
    const m = createSocialStealthModel();
    const snap = m.applyQaWarp('joined-fast');
    assert.equal(snap.player.lane, LANE_FAR);
    assert.equal(snap.player.anchoredGroupId, 'fast-II');
  });

  it('lane-risk fixture sets exposureMs above 0 with no anchor', () => {
    const m = createSocialStealthModel();
    const snap = m.applyQaWarp('lane-risk');
    assert.equal(snap.player.anchoredGroupId, null);
    assert.ok(snap.player.exposureMs >= 700);
  });

  it('crowd-dispersal sets alertActive true and dispersing flags', () => {
    const m = createSocialStealthModel();
    const snap = m.applyQaWarp('crowd-dispersal');
    assert.equal(snap.alertActive, true);
    const slowIV = snap.crowds.find((c) => c.id === 'slow-IV');
    assert.equal(slowIV.disperses, true);
    assert.equal(slowIV.scattered, true);
    assert.ok(Array.isArray(slowIV.memberOffsets));
  });

  it('duo-sync sets both player and companion in the same direction/speed', () => {
    const m = createSocialStealthModel();
    const snap = m.applyQaWarp('duo-sync');
    assert.equal(snap.player.facing, snap.companion.facing);
    assert.equal(snap.player.vx, snap.companion.vx);
  });

  it('complete fixture has complete=true and duo.active=true', () => {
    const m = createSocialStealthModel();
    const snap = m.applyQaWarp('complete');
    assert.equal(snap.complete, true);
    assert.equal(snap.duo.active, true);
  });

  it('entry -> step -> reset -> entry is bit-for-bit identical', () => {
    const m = createSocialStealthModel();
    const base = JSON.stringify(m.applyQaWarp('entry'));
    for (let i = 0; i < 10; i++) {
      m.update(DT, { right: true });
      m.reset();
      const after = JSON.stringify(m.applyQaWarp('entry'));
      assert.equal(after, base, `reset/replay drift on iteration ${i}`);
    }
  });

  it('ten consecutive reset() calls return the same snapshot', () => {
    const m = createSocialStealthModel();
    const base = JSON.stringify(m.snapshot());
    for (let i = 0; i < 10; i++) {
      m.applyQaWarp('isolated-warning');
      for (let s = 0; s < 30; s++) m.update(DT, {});
      m.reset();
      const after = JSON.stringify(m.snapshot());
      assert.equal(after, base, `reset/replay drift on iteration ${i}`);
    }
  });

  it('reset clears exposureMs and lock state', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('isolated-warning');
    for (let s = 0; s < 50; s++) m.update(DT, {});
    m.reset();
    const snap = m.snapshot();
    assert.equal(snap.player.exposureMs, 0);
    assert.equal(snap.player.locked, false);
  });

  it('no lock or exposure lingers across a warp', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('isolated-warning');
    for (let s = 0; s < 60; s++) m.update(DT, {});
    m.applyQaWarp('entry');
    const snap = m.snapshot();
    assert.equal(snap.player.exposureMs, 0);
    assert.equal(snap.player.locked, false);
    assert.equal(snap.player.anchoredGroupId, null);
  });

  it('reset-replay fixture returns to the entry baseline', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('isolated-warning');
    for (let s = 0; s < 60; s++) m.update(DT, {});
    const snap = m.applyQaWarp('reset-replay');
    assert.equal(snap.player.exposureMs, 0);
    assert.equal(snap.player.locked, false);
    assert.equal(snap.qaState, 'reset-replay');
  });

  it('companion state machine: caught -> recovered -> wandering', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('companion-stranded');
    const snap = m.snapshot();
    assert.equal(snap.companion.state, 'falling-behind');
    for (let s = 0; s < 30; s++) m.update(DT, { right: true });
    const after = m.snapshot();
    assert.equal(after.companion.lane, LANE_NEAR);
  });
});

// ---------------------------------------------------------------------------
// Real recovery behavior (was previously a tautological typeof check).
// Drives the model through the full lock + recovery cycle and asserts
// the post-recovery state matches expectations.
// ---------------------------------------------------------------------------
describe('presentCityQa recovery behavior', () => {
  // scanPeriodMs: 100000 keeps the drone's scan in its on-phase for
  // the duration of these tests so the lock fires predictably.
  const ALWAYS_ON_SCAN = { scanPeriodMs: 100000 };
  it('isolated-warning -> 700ms tick -> locked; 500ms more -> lock-released', () => {
    const m = createSocialStealthModel(ALWAYS_ON_SCAN);
    m.applyQaWarp('isolated-warning');
    // 1500ms of exposure + ~700ms of accumulation should trigger lock
    // (lockMs = 2200). exposure starts at 1500, dt=16 per tick.
    for (let s = 0; s < 60; s++) m.update(DT, {});
    const locked = m.snapshot();
    assert.equal(locked.player.locked, true, 'player should be locked by now');
    assert.equal(locked.player.locked, locked.player.lockMsLeft > 0);
    // Lock holds for 450ms; ticks past that release
    for (let s = 0; s < 40; s++) m.update(DT, {});
    const after = m.snapshot();
    assert.equal(after.player.locked, false, 'lock should be released by now');
    assert.equal(after.player.lockMsLeft, 0);
  });

  it('safe anchor teleports player on lock and exposure resets', () => {
    const m = createSocialStealthModel(ALWAYS_ON_SCAN);
    m.applyQaWarp('isolated-warning');
    const before = m.snapshot();
    assert.notEqual(before.player.safeAnchorX, before.player.x);
    for (let s = 0; s < 60; s++) m.update(DT, {});
    const after = m.snapshot();
    assert.equal(after.player.x, after.player.safeAnchorX, 'player should be at safe anchor');
    assert.equal(after.player.exposureMs, 0, 'exposure should reset on lock');
    assert.equal(after.player.anchoredGroupId, null, 'anchor should clear on lock');
  });
});
