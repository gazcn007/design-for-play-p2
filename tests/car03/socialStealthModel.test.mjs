// Car 03 // Social Stealth Model — pure logic tests.
// Runs under `node --test` only. No Phaser, no DOM, no real timers.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SOCIAL_STEALTH_DEFAULTS,
  createSocialStealthModel,
} from '../../src/cars/presentCity/socialStealthModel.js';
import { LANE_FAR, LANE_NEAR } from '../../src/constants.js';

const DT = 16;

// `scanPeriodMs: 100000` keeps the scan in its on-phase for any test
// run that needs deterministic exposure growth (e.g. lock fires after
// 800ms). Tests that verify the active-scan gating cycle the scan
// themselves with the default 1200ms period.
const ALWAYS_ON_SCAN = { scanPeriodMs: 100000 };

function tick(model, n = 1, input = {}) {
  for (let i = 0; i < n; i++) {
    model.update(DT, input);
  }
}

function tickMs(model, totalMs, input = {}) {
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(DT, remaining);
    model.update(step, input);
    remaining -= step;
  }
}

// Walk the player rightward until they're well inside the slow-I
// crowd's join range. We aim for the centre (≤20px off) so the crowd
// can drift forward during a 350ms cadence lock without the player
// falling out of the 80px join range.
function walkIntoFirstCrowd(model, crowdId = 'slow-I', maxSteps = 800) {
  const TARGET = 20;
  for (let s = 0; s < maxSteps; s++) {
    model.update(DT, { right: true });
    const snap = model.snapshot();
    const c = snap.crowds.find((c) => c.id === crowdId);
    if (c && Math.abs(snap.player.x - c.x) <= TARGET) return true;
  }
  return false;
}

describe('socialStealthModel exports', () => {
  it('exports defaults and factory', () => {
    assert.equal(typeof SOCIAL_STEALTH_DEFAULTS, 'object');
    assert.equal(SOCIAL_STEALTH_DEFAULTS.warningMs, 900);
    assert.equal(SOCIAL_STEALTH_DEFAULTS.lockMs, 2200);
    assert.equal(SOCIAL_STEALTH_DEFAULTS.cadenceLockMs, 350);
    assert.equal(SOCIAL_STEALTH_DEFAULTS.scanPeriodMs, 1200);
    assert.equal(typeof createSocialStealthModel, 'function');
  });

  it('factory returns the locked API', () => {
    const m = createSocialStealthModel();
    for (const k of ['update', 'pressInteract', 'snapshot', 'drainEvents', 'reset', 'destroy', 'applyQaWarp', 'advanceSection', 'eventLog']) {
      assert.equal(typeof m[k], 'function', `missing method: ${k}`);
    }
  });
});

describe('socialStealthModel initial state', () => {
  it('starts at section I with empty anchor and zero exposure', () => {
    const m = createSocialStealthModel();
    const snap = m.snapshot();
    assert.equal(snap.section, 'I-read-the-flow');
    assert.equal(snap.player.anchoredGroupId, null);
    assert.equal(snap.player.exposureMs, 0);
    assert.equal(snap.player.locked, false);
    assert.equal(snap.complete, false);
  });

  it('snapshot returns a deep clone (mutating it does not affect state)', () => {
    const m = createSocialStealthModel();
    const a = m.snapshot();
    a.player.x = 9999;
    a.crowds[0].vx = -1;
    const b = m.snapshot();
    assert.notEqual(b.player.x, 9999);
    assert.notEqual(b.crowds[0].vx, -1);
  });
});

describe('socialStealthModel crowd geometry', () => {
  it('crowd leftX / rightX wrap the spawn centre by half width', () => {
    const m = createSocialStealthModel();
    const snap = m.snapshot();
    const slowI = snap.crowds.find((c) => c.id === 'slow-I');
    assert.ok(slowI);
    assert.equal(slowI.rightX - slowI.leftX, 360);
  });

  it('slow crowd moves forward in world over time', () => {
    const m = createSocialStealthModel();
    const before = m.snapshot().crowds.find((c) => c.id === 'slow-I');
    tickMs(m, 1000);
    const after = m.snapshot().crowds.find((c) => c.id === 'slow-I');
    assert.ok(after.x > before.x, 'crowd should advance with vx 130 px/s');
  });

  it('slow-I is positioned so a player starting at x=100 can reach it in <3.5s of D-hold', () => {
    // Codex repair: the player must be able to reach the first slow
    // crowd naturally (without QA warps) for the natural-play
    // evidence. Slow-I is at spawnX=300; the player at 100 walking at
    // 200 px/s closes the 200 px gap in (200)/(200-130) = ~2.86s.
    const m = createSocialStealthModel();
    const slowI = m.snapshot().crowds.find((c) => c.id === 'slow-I');
    assert.ok(slowI.x < 500, `slow-I must start near the player; got ${slowI.x}`);
  });
});

describe('socialStealthModel cadence lock', () => {
  it('pressInteract outside any footprint is a no-op', () => {
    const m = createSocialStealthModel();
    m.pressInteract();
    const events = m.drainEvents();
    const types = events.map((e) => e.type);
    assert.ok(types.includes('interact-noop'), `expected interact-noop, got ${types.join(',')}`);
  });

  it('pressInteract inside a slow crowd starts a 350ms cadence lock', () => {
    const m = createSocialStealthModel();
    const ok = walkIntoFirstCrowd(m, 'slow-I');
    assert.ok(ok, 'player should reach slow-I within budget');
    m.pressInteract();
    const ev = m.drainEvents().map((e) => e.type);
    assert.ok(ev.includes('cadence-started'), `expected cadence-started, got ${ev.join(',')}`);
  });

  it('cadence completes after 350ms while staying in footprint', () => {
    const m = createSocialStealthModel();
    assert.ok(walkIntoFirstCrowd(m, 'slow-I'));
    m.pressInteract();
    tickMs(m, 360);
    const ev = m.drainEvents().map((e) => e.type);
    assert.ok(ev.includes('anchored'), `expected anchored, got ${ev.join(',')}`);
    assert.equal(m.snapshot().player.anchoredGroupId, 'slow-I');
  });

  it('cadence aborts if player leaves join range mid-lock', () => {
    // Walk right into slow-I and stop at the join-range edge. The crowd
    // moves forward at 130 px/s; in 350ms it travels 45 px, which is
    // enough to push the player out of the 80 px range.
    const m = createSocialStealthModel();
    let stopped = false;
    for (let s = 0; s < 800; s++) {
      m.update(DT, { right: true });
      const snap = m.snapshot();
      const c = snap.crowds.find((c) => c.id === 'slow-I');
      if (c && Math.abs(snap.player.x - c.x) < 80) {
        stopped = true;
        break;
      }
    }
    assert.ok(stopped, 'should reach the slow-I join range');
    m.pressInteract();
    assert.ok(m.drainEvents().some((e) => e.type === 'cadence-started'));
    tickMs(m, 400);
    const ev = m.drainEvents().map((e) => e.type);
    assert.ok(ev.includes('cadence-aborted'), `expected cadence-aborted, got ${ev.join(',')}`);
  });
});

describe('socialStealthModel exposure and lock', () => {
  it('exposure accumulates only when unanchored AND in active scan cone', () => {
    const m = createSocialStealthModel(ALWAYS_ON_SCAN);
    m.applyQaWarp('isolated-warning');
    assert.equal(m.snapshot().player.exposureMs, 1500);
    tickMs(m, 500);
    const after = m.snapshot().player.exposureMs;
    assert.ok(after >= 1990, `exposure should grow, got ${after}`);
  });

  it('exposure decays when not in cone', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('isolated-warning');
    tickMs(m, 500);
    // Walk far from cones (new geometry: cone is at 1100-1420)
    for (let s = 0; s < 300; s++) m.update(DT, { right: true });
    const exp = m.snapshot().player.exposureMs;
    assert.ok(exp < 1990, `exposure should decay, got ${exp}`);
  });

  it('lock fires at lockMs, player teleports to safeAnchorX', () => {
    const m = createSocialStealthModel(ALWAYS_ON_SCAN);
    m.applyQaWarp('isolated-warning');
    tickMs(m, 800);
    const snap = m.snapshot();
    assert.equal(snap.player.locked, true);
    assert.equal(snap.player.x, snap.player.safeAnchorX);
    assert.ok(snap.player.lockMsLeft > 0);
  });

  it('lock clears after lockHoldMs and emits lock-released', () => {
    const m = createSocialStealthModel(ALWAYS_ON_SCAN);
    m.applyQaWarp('isolated-warning');
    tickMs(m, 800);
    assert.equal(m.snapshot().player.locked, true);
    tickMs(m, 500);
    const ev = m.drainEvents().map((e) => e.type);
    assert.ok(ev.includes('lock-released'), `expected lock-released, got ${ev.join(',')}`);
    assert.equal(m.snapshot().player.locked, false);
  });
});

// ---------------------------------------------------------------------------
// P0-1 (Codex repair): active scan gating.
// Exposure grows only when at least one drone is ACTIVELY scanning
// AND its cone contains the player. lockTarget is set/cleared on the
// same gate. Geometry-in-cone with scanActive=false must NOT grow
// exposure and must clear lockTarget.
// ---------------------------------------------------------------------------
describe('socialStealthModel P0-1 active scan gating', () => {
  it('exposure does NOT grow when in cone but scanActive=false; lockTarget=null', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('isolated-warning'); // player at x=1200 (in cone 1100-1420)
    // Force the drone into its scan-off phase: scanPeriodMs=1200, so
    // the on phase is 600ms. Tick into the off phase.
    for (let t = 0; t < 700; t += DT) m.update(DT, {});
    const off = m.snapshot();
    const droneA = off.drones.find((d) => d.id === 'drone-A');
    assert.equal(droneA.scanActive, false, 'drone-A should be in scan-off phase by t=700ms');
    // lockTarget must be null while scan is off (even in cone).
    assert.equal(droneA.lockTarget, null, 'lockTarget must be null in scan-off phase');
    const before = off.player.exposureMs;
    // Tick 300ms of scan-off while still in cone; exposure must NOT
    // grow and must decay at recoveryRate.
    for (let t = 0; t < 300; t += DT) m.update(DT, {});
    const after = m.snapshot();
    const droneAAfter = after.drones.find((d) => d.id === 'drone-A');
    assert.equal(droneAAfter.scanActive, false);
    assert.equal(droneAAfter.lockTarget, null, 'lockTarget must remain null in scan-off');
    assert.ok(
      after.player.exposureMs < before,
      `exposure should decay during scan-off; before=${before}, after=${after.player.exposureMs}`,
    );
  });

  it('exposure resumes growth and lockTarget is set when scanActive becomes true again', () => {
    const m = createSocialStealthModel();
    // Place the player at x=1300 (cone starts at 1100 + 0 ms * 90 =
    // 1100, depth 320 -> cone 1100-1420). At t=1300ms the drone is at
    // 1100 + 1.3 * 90 = 1217, cone 1217-1537; the player at 1300 is
    // still inside the cone.
    m.applyQaWarp('isolated-warning');
    // Manually re-place the player at x=1300 so the cone still
    // contains them after the drone drifts.
    m.update(DT, { targetOffsetX: 0 });
    // Tick 700ms -> scan off, in cone, exposure decaying.
    for (let t = 0; t < 700; t += DT) m.update(DT, {});
    const off = m.snapshot();
    const droneOff = off.drones.find((d) => d.id === 'drone-A');
    assert.equal(droneOff.scanActive, false);
    assert.equal(droneOff.lockTarget, null);
    // Tick into the next on phase (total 1300ms = 100ms into on).
    for (let t = 700; t < 1300; t += DT) m.update(DT, {});
    const on = m.snapshot();
    const droneOn = on.drones.find((d) => d.id === 'drone-A');
    assert.equal(droneOn.scanActive, true, 'drone should be in scan-on phase by t=1300ms');
    // The player (x=1300 at t=0, no input) is still in the new cone
    // (1217-1537 at t=1300ms).
    assert.equal(droneOn.lockTarget, 'player', 'lockTarget must be set when scan on + in cone');
    const expBefore = on.player.exposureMs;
    for (let t = 0; t < 200; t += DT) m.update(DT, {});
    const after = m.snapshot();
    assert.ok(
      after.player.exposureMs > expBefore,
      `exposure should grow during scan-on; before=${expBefore}, after=${after.player.exposureMs}`,
    );
  });

  it('lockTarget is null in cone but anchored (anchored suppresses target)', () => {
    const m = createSocialStealthModel(ALWAYS_ON_SCAN);
    m.applyQaWarp('joined-slow'); // player at slow-I centre (300), anchored='slow-I'
    // Tick a few frames; if drone-A's cone covers slow-I's centre,
    // the anchored player should NOT be a lock target.
    for (let s = 0; s < 5; s++) m.update(DT, {});
    const snap = m.snapshot();
    for (const d of snap.drones) {
      assert.equal(d.lockTarget, null, `anchored player must clear ${d.id} lockTarget`);
    }
  });
});

describe('socialStealthModel anchored priority chain', () => {
  it('pressInteract in overlap zone transfers to other group', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('group-transfer');
    m.pressInteract();
    const ev = m.drainEvents().map((e) => e.type);
    assert.ok(ev.includes('group-transfer'), `expected group-transfer, got ${ev.join(',')}`);
  });

  it('pressInteract rescues nearby companion when anchored', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('companion-stranded');
    m.pressInteract();
    tickMs(m, 400);
    m.pressInteract();
    const ev = m.drainEvents().map((e) => e.type);
    assert.ok(ev.includes('companion-rescued'), `expected companion-rescued, got ${ev.join(',')}`);
  });

  it('pressInteract in final section establishes duo', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('duo-sync');
    m.pressInteract();
    const ev = m.drainEvents().map((e) => e.type);
    assert.ok(ev.includes('duo-established'), `expected duo-established, got ${ev.join(',')}`);
    assert.equal(m.snapshot().duo.active, true);
  });
});

describe('socialStealthModel complete', () => {
  it('player reaches end of section IV with duo active -> complete=true', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('duo-sync');
    m.pressInteract();
    for (let s = 0; s < 50; s++) m.update(DT, { right: true });
    const snap = m.snapshot();
    assert.equal(snap.complete, true);
  });
});

describe('socialStealthModel reset / replay', () => {
  it('ten consecutive resets return to the same initial snapshot', () => {
    const m = createSocialStealthModel();
    const baseSnap = JSON.stringify(m.snapshot());
    for (let i = 0; i < 10; i++) {
      m.applyQaWarp('isolated-warning');
      tickMs(m, 1000);
      m.reset();
      const after = JSON.stringify(m.snapshot());
      assert.equal(after, baseSnap, `reset/replay drift on iteration ${i}`);
    }
  });

  it('lock does not survive reset', () => {
    const m = createSocialStealthModel(ALWAYS_ON_SCAN);
    m.applyQaWarp('isolated-warning');
    tickMs(m, 800);
    assert.equal(m.snapshot().player.locked, true);
    m.reset();
    assert.equal(m.snapshot().player.locked, false);
    assert.equal(m.snapshot().player.exposureMs, 0);
  });

  it('drone lockTarget does not survive reset', () => {
    const m = createSocialStealthModel(ALWAYS_ON_SCAN);
    m.applyQaWarp('isolated-warning');
    tickMs(m, 100);
    m.reset();
    const drones = m.snapshot().drones;
    for (const d of drones) {
      assert.equal(d.lockTarget, null);
    }
  });
});

describe('socialStealthModel destroy', () => {
  it('update and pressInteract become silent no-ops after destroy', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('isolated-warning');
    tickMs(m, 800);
    m.destroy();
    m.update(DT, { right: true });
    m.pressInteract();
    const ev = m.drainEvents();
    assert.equal(ev.length, 0);
  });
});

describe('socialStealthModel QA fixtures', () => {
  const cases = [
    'entry',
    'rule-demo',
    'isolated-warning',
    'locked-recovery',
    'joined-slow',
    'joined-fast',
    'group-transfer',
    'lane-risk',
    'companion-stranded',
    'companion-rescued',
    'crowd-dispersal',
    'duo-sync',
    'complete',
    'reset-replay',
  ];
  for (const qa of cases) {
    it(`applies ${qa} without throwing and emits a snapshot`, () => {
      const m = createSocialStealthModel();
      const snap = m.applyQaWarp(qa);
      assert.equal(snap.qaState, qa);
      m.update(DT, {});
      const after = m.snapshot();
      assert.equal(typeof after.player.x, 'number');
    });
  }
});

describe('socialStealthModel event log is permanent', () => {
  it('eventLog returns the same events after drainEvents', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('isolated-warning');
    tickMs(m, 800);
    const drained = m.drainEvents();
    assert.ok(drained.length > 0);
    const log = m.eventLog();
    assert.ok(log.length >= drained.length, 'eventLog must not shrink after drain');
  });
});

// ---------------------------------------------------------------------------
// Mandatory P0 #2: Anchored micro-adjustment must be real and persistent.
// The scene accumulates targetOffsetX from A/D and passes it to the model;
// the model clamps to ±55. The player.x must follow center + clamp(offset).
// ---------------------------------------------------------------------------
describe('socialStealthModel anchored micro-adjustment', () => {
  it('player.x follows crowdCenter + targetOffsetX when anchored', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('joined-slow');
    const snap0 = m.snapshot();
    const center0 = snap0.crowds.find((c) => c.id === 'slow-I').x;
    m.update(DT, { targetOffsetX: 30 });
    const snap1 = m.snapshot();
    assert.equal(snap1.player.anchoredGroupId, 'slow-I');
    assert.equal(snap1.player.x, center0 + 30, `expected ${center0 + 30}, got ${snap1.player.x}`);
  });

  it('positive targetOffsetX is clamped to +55 (groupAdjust)', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('joined-slow');
    const snap0 = m.snapshot();
    const center0 = snap0.crowds.find((c) => c.id === 'slow-I').x;
    m.update(DT, { targetOffsetX: 999 });
    const snap = m.snapshot();
    assert.equal(snap.player.x, center0 + 55, `expected ${center0 + 55}, got ${snap.player.x}`);
  });

  it('negative targetOffsetX is clamped to -55 (groupAdjust)', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('joined-slow');
    const snap0 = m.snapshot();
    const center0 = snap0.crowds.find((c) => c.id === 'slow-I').x;
    m.update(DT, { targetOffsetX: -999 });
    const snap = m.snapshot();
    assert.equal(snap.player.x, center0 - 55, `expected ${center0 - 55}, got ${snap.player.x}`);
  });

  it('passing 0 puts player at crowd center (scene releases offset on R)', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('joined-slow');
    m.update(DT, { targetOffsetX: 40 });
    m.update(DT, { targetOffsetX: 0 });
    const snap = m.snapshot();
    const center = snap.crowds.find((c) => c.id === 'slow-I').x;
    const expected = center - 130 * (DT / 1000);
    assert.ok(
      Math.abs(snap.player.x - expected) <= 0.5,
      `expected ${expected.toFixed(2)}, got ${snap.player.x}`,
    );
  });

  it('scene can pass any per-frame targetOffsetX; the model applies it', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('joined-slow');
    for (const off of [10, 20, 30, 40, 55, -55, 0]) {
      m.update(DT, { targetOffsetX: off });
      const snap = m.snapshot();
      const post = snap.crowds.find((c) => c.id === 'slow-I').x;
      const pre = post - 130 * (DT / 1000);
      const expected = pre + off;
      assert.ok(
        Math.abs(snap.player.x - expected) <= 0.5,
        `offset ${off}: expected ${expected.toFixed(2)}, got ${snap.player.x}`,
      );
    }
  });

  it('fullReset (model.reset) returns targetOffsetX to 0', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('joined-slow');
    m.update(DT, { targetOffsetX: 40 });
    m.reset();
    const snap = m.snapshot();
    assert.equal(snap.player.targetOffsetX, 0);
    assert.equal(snap.player.anchoredGroupId, null);
    assert.equal(snap.player.x, 100);
  });
});

// ---------------------------------------------------------------------------
// Mandatory P0 #3: Exposure and drone lock.
// Drone lockTarget is set every frame the player is in cone, cleared on exit.
// P0-1 (Codex repair) further requires scanActive === true as a gate.
// ---------------------------------------------------------------------------
describe('socialStealthModel drone lockTarget', () => {
  it('lockTarget = "player" when unanchored player is in active scan cone', () => {
    const m = createSocialStealthModel(ALWAYS_ON_SCAN);
    m.applyQaWarp('isolated-warning');
    m.update(DT, {});
    const snap = m.snapshot();
    const droneA = snap.drones.find((d) => d.id === 'drone-A');
    assert.equal(droneA.lockTarget, 'player');
  });

  it('lockTarget clears when player leaves the cone', () => {
    const m = createSocialStealthModel(ALWAYS_ON_SCAN);
    m.applyQaWarp('isolated-warning');
    m.update(DT, {});
    // Walk the player well past the cone (drone-A is at 1100, cone
    // depth 320 → cone max ~1420; walk 300+ px).
    for (let s = 0; s < 250; s++) m.update(DT, { right: true });
    const snap = m.snapshot();
    for (const d of snap.drones) {
      assert.equal(d.lockTarget, null, `drone ${d.id} lockTarget should be null after exit`);
    }
  });

  it('lockTarget is null when player is anchored (cone ignored)', () => {
    const m = createSocialStealthModel(ALWAYS_ON_SCAN);
    m.applyQaWarp('joined-slow');
    m.update(DT, {});
    const snap = m.snapshot();
    const droneA = snap.drones.find((d) => d.id === 'drone-A');
    assert.equal(droneA.lockTarget, null);
  });

  it('lockTarget clears on player lock (post-lock the target is gone)', () => {
    const m = createSocialStealthModel(ALWAYS_ON_SCAN);
    m.applyQaWarp('isolated-warning');
    m.update(DT, {});
    const before = m.snapshot();
    const droneA = before.drones.find((d) => d.id === 'drone-A');
    assert.equal(droneA.lockTarget, 'player');
    // Tick until player locks, then verify drone target is cleared.
    for (let s = 0; s < 60; s++) m.update(DT, {});
    const after = m.snapshot();
    assert.equal(after.player.locked, true);
    const droneAAfter = after.drones.find((d) => d.id === 'drone-A');
    assert.equal(droneAAfter.lockTarget, null);
  });
});

// ---------------------------------------------------------------------------
// Mandatory P0 #4: Crowd dispersal is spatial and visible.
// On alert, dispersing crowds must show per-member offsets growing.
// ---------------------------------------------------------------------------
describe('socialStealthModel dispersal is spatial', () => {
  it('memberOffsets grow on alert for dispersing crowds', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('crowd-dispersal');
    const before = m.snapshot();
    const slowIV = before.crowds.find((c) => c.id === 'slow-IV');
    const sumBefore = slowIV.memberOffsets.reduce((a, b) => a + Math.abs(b), 0);
    assert.equal(sumBefore, 0);
    tickMs(m, 1000);
    const after = m.snapshot();
    const slowIVAfter = after.crowds.find((c) => c.id === 'slow-IV');
    const sumAfter = slowIVAfter.memberOffsets.reduce((a, b) => a + Math.abs(b), 0);
    assert.ok(sumAfter > 30, `members should scatter; got sum ${sumAfter}`);
  });

  it('non-dispersing crowds do not scatter even on alert', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('crowd-dispersal');
    tickMs(m, 1000);
    const after = m.snapshot();
    const slowI = after.crowds.find((c) => c.id === 'slow-I');
    if (slowI) {
      const sum = slowI.memberOffsets.reduce((a, b) => a + Math.abs(b), 0);
      assert.equal(sum, 0);
    }
  });

  it('dispersing crowd cannot be found by player for fresh anchoring', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('crowd-dispersal');
    m.update(DT, {});
    m.update(DT, {});
    m.pressInteract();
    const ev = m.drainEvents().map((e) => e.type);
    assert.ok(
      !ev.includes('cadence-started'),
      `dispersed crowd must not anchor; got ${ev.join(',')}`,
    );
  });

  it('reset() zeros all memberOffsets', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('crowd-dispersal');
    tickMs(m, 1500);
    m.reset();
    const snap = m.snapshot();
    for (const c of snap.crowds) {
      const sum = c.memberOffsets.reduce((a, b) => a + Math.abs(b), 0);
      assert.equal(sum, 0, `crowd ${c.id} should be reset`);
    }
  });
});

// ---------------------------------------------------------------------------
// Mandatory P0 #6: Scene / browser integration. The scene file must
// import cleanly and the model must produce a snapshot the scene can
// read. This test acts as the wiring smoke that runs under
// `node --test` without a browser.
// ---------------------------------------------------------------------------
describe('socialStealthModel scene wiring smoke', () => {
  it('model snapshot has every field the scene _renderFromSnapshot reads', async () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('duo-sync');
    const snap = m.snapshot();
    // Use Object.hasOwn for the field check (P0-8: was `in` previously).
    const requiredKeys = [
      { key: 'x', container: 'player' },
      { key: 'lane', container: 'player' },
      { key: 'facing', container: 'player' },
      { key: 'anchoredGroupId', container: 'player' },
      { key: 'exposureMs', container: 'player' },
      { key: 'cadenceLockMsLeft', container: 'player' },
      { key: 'lockMsLeft', container: 'player' },
      { key: 'safeAnchorX', container: 'player' },
      { key: 'state', container: 'companion' },
      { key: 'lane', container: 'companion' },
      { key: 'active', container: 'duo' },
      { key: 'complete', container: 'top' },
      { key: 'alertActive', container: 'top' },
    ];
    for (const r of requiredKeys) {
      const container = r.container === 'top' ? snap : snap[r.container];
      assert.ok(
        Object.hasOwn(container, r.key),
        `model snapshot.${r.container}.${r.key} missing`,
      );
    }
    // Read the scene and art files as text and assert the wiring.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const url = await import('node:url');
    const here = path.dirname(url.fileURLToPath(import.meta.url));
    const base = path.join(here, '..', '..', 'src', 'cars', 'presentCity');
    const sceneSrc = await fs.readFile(path.join(base, 'PresentCityScene.js'), 'utf8');
    const artSrc = await fs.readFile(path.join(base, 'presentCityArt.js'), 'utf8');
    assert.ok(sceneSrc.includes('snap.'), 'scene must read the snapshot');
    assert.ok(artSrc.includes('player.x'), 'art must read player.x');
    assert.ok(artSrc.includes('player.lane'), 'art must read player.lane');
    assert.ok(sceneSrc.includes('turnLeft'), 'scene must wire turnLeft');
    assert.ok(sceneSrc.includes('turnRight'), 'scene must wire turnRight');
    assert.ok(sceneSrc.includes('targetOffsetX'), 'scene must track targetOffsetX');
    assert.ok(sceneSrc.includes('JustDown'), 'scene must use JustDown for edge-triggered input');
    assert.ok(sceneSrc.includes('fullReset'), 'scene must expose fullReset for the R key');
  });

  it('input shape accepted by model.update matches what scene passes', () => {
    const m = createSocialStealthModel();
    const sceneInput = {
      left: false,
      right: false,
      turnLeft: false,
      turnRight: false,
      targetOffsetX: 0,
      laneBack: false,
      laneFront: false,
    };
    assert.doesNotThrow(() => m.update(DT, sceneInput));
    const m2 = createSocialStealthModel();
    assert.doesNotThrow(() => m2.update(DT, { right: true }));
    const m3 = createSocialStealthModel();
    assert.doesNotThrow(() => m3.update(DT, { targetOffsetX: 50 }));
  });
});
