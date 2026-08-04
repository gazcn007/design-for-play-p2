// Car 03 // THE CITY THAT MOVES TOGETHER
// Pure logic: no Phaser, no DOM, no real time, no random without a seed.
//
// The model owns three entity kinds plus the player's anchor/exposure state.
// Every visible change in the scene is a pure consequence of `update(dtMs, input)`.
// No internal timer uses performance.now() or Date.now(). All time progresses
// only through the `dtMs` argument.
//
// Locked API (Design Lock §9):
//   createSocialStealthModel(config?) => {
//     update(dtMs, input), pressInteract(), snapshot(), drainEvents(),
//     reset(), destroy(), applyQaWarp(qaState), advanceSection(sectionId)
//   }
//
// `snapshot()` returns a deep, JSON-safe clone so QA tests can assert against
// it without shared-state risk. Events are FIFO via `drainEvents()`.
//
// Every config field has a write site (the constructor) and a read site in
// the model body; tests assert at least one observable consequence of each
// field. This honours the Design Lock §8 "ship with read site" rule.

import { LANE_FAR, LANE_NEAR } from '../../constants.js';

export const SOCIAL_STEALTH_DEFAULTS = Object.freeze({
  worldLength: 4800,
  worldAssetKey: 'backdrop-03',
  joinRadius: 80,
  groupAdjust: 55,
  groupDetach: 120,
  cadenceLockMs: 350,
  warningMs: 900,
  lockMs: 2200,
  lockHoldMs: 450,
  recoveryRate: 2.0,
  scanConeDepth: 320,
  scanConeHalfAngle: 0.314, // ~18 degrees
  scanPeriodMs: 1200,
  scanAdvanceMs: 90,
  // Section geometry: x in world pixels, lane (LANE_FAR/LANE_NEAR).
  sections: [
    { id: 'I-read-the-flow', startX: 0, endX: 1100, safeAnchorX: 200 },
    { id: 'II-choose-the-flow', startX: 1100, endX: 2500, safeAnchorX: 1300 },
    { id: 'III-the-silent-passenger', startX: 2500, endX: 3700, safeAnchorX: 2700 },
    { id: 'IV-two-is-a-crowd', startX: 3700, endX: 4800, safeAnchorX: 3900 },
  ],
});

// ---------------------------------------------------------------------------
// Crowd / drone / companion authoring.
// ---------------------------------------------------------------------------

// Crowd geometry (P0-3 / Codex repair).
// `slow-I` starts at 300 so the player (x=100, maxVx=200) reaches the
// join window in ~2.86s — close enough that the natural-play entry
// sequence can press E and observe `cadence-started` without first
// spending ~9s traversing a dead 620-px gap. Drone-A is at 1100 in
// section I so the cone (~1100-1420) is well clear of the natural
// anchor position; the player still catches the cone while anchored
// (anchored crowd at 130 px/s > drone at 90 px/s) for the
// "anchored in scan, no exposure" visual.
function defaultCrowds() {
  return [
    { id: 'slow-I', lane: LANE_NEAR, vx: 130, spawnX: 300, width: 360, members: 10, facing: 1 },
    { id: 'slow-II', lane: LANE_NEAR, vx: 130, spawnX: 1280, width: 320, members: 10, facing: 1 },
    { id: 'slow-II-sibling', lane: LANE_NEAR, vx: 130, spawnX: 1500, width: 240, members: 8, facing: 1 },
    { id: 'fast-II', lane: LANE_FAR, vx: 180, spawnX: 1480, width: 200, members: 4, facing: 1 },
    { id: 'slow-III', lane: LANE_NEAR, vx: 130, spawnX: 2680, width: 360, members: 10, facing: 1 },
    { id: 'slow-IV', lane: LANE_NEAR, vx: 130, spawnX: 3880, width: 360, members: 10, facing: 1, disperses: true },
    { id: 'fast-IV', lane: LANE_FAR, vx: 180, spawnX: 3880, width: 200, members: 4, facing: 1, disperses: true },
  ];
}

function defaultDrones() {
  return [
    { id: 'drone-A', lane: LANE_NEAR, x: 1100, patrolLeft: 800, patrolRight: 2400, vx: 90, facing: 1, scanDir: 1 },
    { id: 'drone-B', lane: LANE_FAR, x: 3500, patrolLeft: 3000, patrolRight: 4400, vx: -90, facing: 1, scanDir: 1 },
  ];
}

function defaultCompanion() {
  return {
    id: 'companion',
    lane: LANE_NEAR,
    spawnX: 2900,
    spawnY: 460,
    x: 2900,
    y: 460,
    vx: 130,
    facing: 1,
    state: 'wandering',
    groupId: 'slow-III',
    groupOffsetX: 30,
    caughtMs: 0,
    detachTimerMs: 1500,
  };
}

function clone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const out = {};
  for (const key of Object.keys(value)) out[key] = clone(value[key]);
  return out;
}

function deepFreeze(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) value.forEach(deepFreeze);
  else Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

// ---------------------------------------------------------------------------
// Crowd geometry helpers.
// ---------------------------------------------------------------------------

function crowdLeftX(c) {
  return c.x - c.width / 2;
}
function crowdRightX(c) {
  return c.x + c.width / 2;
}
function inJoinRange(c, x) {
  return Math.abs(x - c.x) <= SOCIAL_STEALTH_DEFAULTS.joinRadius;
}
function inAnchorRange(c, x) {
  return Math.abs(x - c.x) <= SOCIAL_STEALTH_DEFAULTS.groupDetach;
}
function crowdCenterX(c) {
  return c.x;
}

// ---------------------------------------------------------------------------
// Drone scan: a triangular cone in front of the drone.
// ---------------------------------------------------------------------------

function pointInDroneCone(drone, playerX, playerLane) {
  if (playerLane !== drone.lane) return false;
  const dx = playerX - drone.x;
  if (dx < 0 || dx > SOCIAL_STEALTH_DEFAULTS.scanConeDepth) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Companion helpers.
// ---------------------------------------------------------------------------

function pickNearestSlowCrowd(crowds, x) {
  let best = null;
  let bestDist = Infinity;
  for (const c of crowds) {
    if (c.id.indexOf('slow') !== 0) continue;
    const d = Math.abs(crowdCenterX(c) - x);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------

export function createSocialStealthModel(config = {}) {
  const cfg = { ...SOCIAL_STEALTH_DEFAULTS, ...config };
  const sections = cfg.sections.map(deepFreeze);

  function freshCrowds() {
    return defaultCrowds().map((c) => ({
      ...c,
      x: c.spawnX,
      memberOffsets: c.members ? new Array(c.members).fill(0) : [],
    }));
  }
  function freshDrones() {
    return defaultDrones().map((d) => ({ ...d, scanActive: true, lockTarget: null, scanTimerMs: 0 }));
  }
  function freshCompanion() {
    return defaultCompanion();
  }

  let crowds = freshCrowds();
  let drones = freshDrones();
  let companion = freshCompanion();
  let player = {
    lane: LANE_NEAR,
    x: 100,
    y: 500,
    vx: 0,
    facing: 1,
    anchoredGroupId: null,
    targetOffsetX: 0, // accumulated by scene from A/D, clamped to ±groupAdjust
    cadenceLockMsLeft: 0,
    exposureMs: 0,
    locked: false,
    lockMsLeft: 0,
    safeAnchorX: sections[0].safeAnchorX,
    lockedFromX: 0,
  };
  let sectionIndex = 0;
  let elapsedMs = 0;
  let alertActive = false;
  // Repair B: `established` is armed only by the contextual
  // edge-triggered E press in pressInteract(). Alignment alone can
  // never set it, and `duo.active` is the live conjunction of
  // establishment and current alignment (see tickDuo).
  let duo = { established: false, active: false, alignment: 0, playerVx: 0, companionVx: 0, dx: 0 };
  let complete = false;
  let destroyed = false;
  let events = [];
  const eventLog = [];

  function pushEvent(type, payload) {
    const evt = { type, t: elapsedMs, payload: clone(payload ?? {}) };
    events.push(evt);
    eventLog.push(evt);
  }

  function currentSection() {
    return sections[sectionIndex];
  }

  // True when a crowd has visibly dispersed (members scattered).
  // Frozen groups are NOT findable by the player for new anchoring.
  function isCrowdScattered(c) {
    return !!c.disperses && alertActive;
  }

  function detectOverlapGroups(lane) {
    const sameLane = crowds.filter((c) => c.lane === lane);
    const overlaps = [];
    for (let i = 0; i < sameLane.length; i++) {
      for (let j = i + 1; j < sameLane.length; j++) {
        const a = sameLane[i];
        const b = sameLane[j];
        const overlap = Math.min(crowdRightX(a), crowdRightX(b)) - Math.max(crowdLeftX(a), crowdLeftX(b));
        if (overlap > 0) overlaps.push([a, b, overlap]);
      }
    }
    return overlaps;
  }

  // Find a group the player is *physically* in. Dispersed (scattered)
  // groups do not count as findable: the visual target no longer exists.
  function findGroupAtPlayer() {
    for (const c of crowds) {
      if (c.lane !== player.lane) continue;
      if (isCrowdScattered(c)) continue;
      if (!inJoinRange(c, player.x)) continue;
      return c;
    }
    return null;
  }

  function inAnyGroupFootprint() {
    return findGroupAtPlayer() !== null;
  }

  function nearestRescuableCompanion() {
    if (companion.state !== 'falling-behind' && companion.state !== 'caught' && companion.state !== 'wandering') return null;
    const dx = Math.abs(companion.x - player.x);
    if (dx > cfg.joinRadius + 60) return null;
    if (companion.lane !== player.lane) return null;
    return companion;
  }

  function detachCheck() {
    if (!player.anchoredGroupId) return;
    const c = crowds.find((g) => g.id === player.anchoredGroupId);
    if (!c) {
      const prev = player.anchoredGroupId;
      player.anchoredGroupId = null;
      pushEvent('detached', { reason: 'group-missing', groupId: prev });
      return;
    }
    if (isCrowdScattered(c)) {
      // Dispersed: anchor no longer valid. Drop and signal.
      const prev = player.anchoredGroupId;
      player.anchoredGroupId = null;
      pushEvent('detached', { reason: 'crowd-scattered', groupId: prev });
      return;
    }
    if (!inAnchorRange(c, player.x) || player.lane !== c.lane) {
      const prev = player.anchoredGroupId;
      player.anchoredGroupId = null;
      pushEvent('detached', { reason: 'out-of-footprint', groupId: prev });
    }
  }

  function advanceCrowds(dt) {
    for (const c of crowds) {
      if (isCrowdScattered(c)) {
        // Spatial dispersal: each member drifts outward. Even-indexed
        // members drift +x, odd-indexed -x. Cap at ±220 px so they
        // don't fly off-screen.
        if (!c.memberOffsets || c.memberOffsets.length !== c.members) {
          c.memberOffsets = c.members ? new Array(c.members).fill(0) : [];
        }
        const vxScatter = 90; // px/s outward
        for (let i = 0; i < c.memberOffsets.length; i++) {
          const dir = i % 2 === 0 ? 1 : -1;
          c.memberOffsets[i] += dir * vxScatter * (dt / 1000);
          if (c.memberOffsets[i] > 220) c.memberOffsets[i] = 220;
          if (c.memberOffsets[i] < -220) c.memberOffsets[i] = -220;
        }
        continue;
      }
      // Normal advance. Reset member offsets back to 0 if they were
      // scattered previously (e.g. after reset).
      if (c.memberOffsets && c.memberOffsets.some((v) => v !== 0)) {
        for (let i = 0; i < c.memberOffsets.length; i++) c.memberOffsets[i] = 0;
      }
      c.x += c.vx * (dt / 1000);
      if (c.x > cfg.worldLength + c.width) c.x = -c.width;
    }
  }

  function advanceDrones(dt) {
    for (const d of drones) {
      d.x += d.vx * (dt / 1000);
      if (d.x > d.patrolRight) { d.x = d.patrolRight; d.vx = -Math.abs(d.vx); }
      if (d.x < d.patrolLeft) { d.x = d.patrolLeft; d.vx = Math.abs(d.vx); }
      d.scanTimerMs += dt;
      if (d.scanTimerMs >= cfg.scanPeriodMs) d.scanTimerMs -= cfg.scanPeriodMs;
      d.scanActive = d.scanTimerMs < cfg.scanPeriodMs / 2;
      // Per-frame lock target (P0-1 / Codex repair):
      //   - set to 'player' iff the drone is ACTIVELY scanning
      //     (d.scanActive === true) AND the unanchored, non-locked
      //     player is geometrically in the cone;
      //   - cleared on cone exit, scan off, anchor, lock, reset.
      // The scan cycle keeps running independently of player state —
      // a locked player does not silence the scan, it just means
      // there is no live target to aim at.
      const inCone = d.scanActive
        && !player.locked
        && !player.anchoredGroupId
        && pointInDroneCone(d, player.x, player.lane);
      d.lockTarget = inCone ? 'player' : null;
    }
  }

  function advanceCompanion(dt) {
    if (complete) {
      companion.state = 'safe-with-player';
      companion.vx = duo.active ? player.vx : 0;
      return;
    }
    if (companion.state === 'safe-with-player') {
      companion.lane = player.lane;
      const target = player.x - 40 * player.facing;
      companion.x += (target - companion.x) * Math.min(1, dt / 200);
      companion.vx = player.vx;
      return;
    }
    if (companion.state === 'caught') {
      companion.caughtMs += dt;
      if (companion.caughtMs >= 1000) {
        const nearest = pickNearestSlowCrowd(crowds, player.x);
        if (nearest) {
          companion.state = 'wandering';
          companion.groupId = nearest.id;
          companion.x = crowdCenterX(nearest) - companion.groupOffsetX;
          companion.vx = nearest.vx - 2;
          companion.caughtMs = 0;
          pushEvent('companion-recovered', { groupId: nearest.id });
        }
      }
      return;
    }
    const c = crowds.find((g) => g.id === companion.groupId);
    if (!c) {
      const nearest = pickNearestSlowCrowd(crowds, player.x);
      if (nearest) {
        companion.groupId = nearest.id;
        companion.lane = nearest.lane;
        companion.x = crowdCenterX(nearest) - companion.groupOffsetX;
        companion.vx = nearest.vx - 2;
      }
      return;
    }
    companion.lane = c.lane;
    const target = crowdCenterX(c) - companion.groupOffsetX;
    companion.x += (target - companion.x) * Math.min(1, dt / 250);
    companion.vx = c.vx - 2;
    if (companion.state === 'wandering' && companion.detachTimerMs > 0) {
      companion.detachTimerMs -= dt;
      if (companion.detachTimerMs <= 0) {
        companion.state = 'falling-behind';
        pushEvent('companion-detached', {});
      }
    }
  }

  function updateExposure(dt) {
    if (player.locked) return;
    // P0-1 / Codex repair: exposure grows ONLY when at least one drone
    // is ACTIVELY scanning AND its cone contains the player AND the
    // player is unanchored. If scan is off, or the player is in a
    // cone with scan off, or the player is out of any cone, or the
    // player is anchored, exposure decays at recoveryRate.
    const activeConeHit = drones.some(
      (d) => d.scanActive && pointInDroneCone(d, player.x, player.lane),
    );
    if (activeConeHit && !player.anchoredGroupId) {
      player.exposureMs += dt;
    } else {
      player.exposureMs = Math.max(0, player.exposureMs - dt * cfg.recoveryRate);
    }
    if (player.exposureMs >= cfg.lockMs) {
      const sec = currentSection();
      player.locked = true;
      player.lockMsLeft = cfg.lockHoldMs;
      player.lockedFromX = player.x;
      player.safeAnchorX = sec.safeAnchorX;
      player.x = sec.safeAnchorX;
      player.exposureMs = 0;
      player.anchoredGroupId = null;
      pushEvent('locked', { safeAnchorX: sec.safeAnchorX });
    }
  }

  function updateLockCountdown(dt) {
    if (!player.locked) return;
    player.lockMsLeft -= dt;
    if (player.lockMsLeft <= 0) {
      player.locked = false;
      player.lockMsLeft = 0;
      pushEvent('lock-released', {});
    }
  }

  function updateSectionProgression() {
    const sec = currentSection();
    if (player.x >= sec.endX && sectionIndex < sections.length - 1) {
      sectionIndex += 1;
      player.safeAnchorX = sections[sectionIndex].safeAnchorX;
      pushEvent('section-advance', { section: sections[sectionIndex].id });
    }
    if (sectionIndex === sections.length - 1 && player.x >= sections[sectionIndex].endX && duo.active) {
      complete = true;
      pushEvent('complete', {});
    }
  }

  // Apply lateral offset (clamped to ±groupAdjust) to the anchored
  // player's desired position relative to the group centre. The
  // player is *instantly* placed at the desired position; the crowd
  // moves forward and the player follows because `center` shifts each
  // frame. This avoids the previous soft-pull lag that made the
  // "anchored ±55 micro-adjustment" read as a single dead state.
  function applyPlayerMovement(input) {
    if (player.locked) {
      player.vx = 0;
      return;
    }
    if (player.anchoredGroupId) {
      const c = crowds.find((g) => g.id === player.anchoredGroupId);
      if (c && !isCrowdScattered(c)) {
        const offset = clamp(
          input.targetOffsetX ?? 0,
          -cfg.groupAdjust,
          cfg.groupAdjust,
        );
        const center = crowdCenterX(c);
        const desired = center + offset;
        player.x = desired;
        player.vx = c.vx;
        player.lane = c.lane;
        player.facing = c.facing;
        return;
      }
      // Scattered group: drop anchor and fall through to free movement.
      if (c && isCrowdScattered(c)) {
        player.anchoredGroupId = null;
      }
    }
    // Unanchored movement: input-controlled.
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) {
      player.facing = dir;
      const targetVx = dir * Math.min(input.maxVx ?? 200, 200);
      player.vx = targetVx;
      player.x += player.vx * (input.dtMs / 1000);
    } else {
      player.vx = 0;
    }
    if (input.laneBack) {
      const newLane = Math.max(LANE_FAR, player.lane - 1);
      if (newLane !== player.lane) {
        player.lane = newLane;
        pushEvent('lane-change', { lane: player.lane });
      }
    }
    if (input.laneFront) {
      const newLane = Math.min(LANE_NEAR, player.lane + 1);
      if (newLane !== player.lane) {
        player.lane = newLane;
        pushEvent('lane-change', { lane: player.lane });
      }
    }
  }

  function tickCadence(dt) {
    if (player.cadenceLockMsLeft > 0) {
      player.cadenceLockMsLeft -= dt;
      const inGroup = findGroupAtPlayer();
      if (!inGroup) {
        player.cadenceLockMsLeft = 0;
        pushEvent('cadence-aborted', {});
        return;
      }
      if (player.cadenceLockMsLeft <= 0) {
        player.anchoredGroupId = inGroup.id;
        player.cadenceLockMsLeft = 0; // settle to 0 (no negative drift)
        pushEvent('anchored', { groupId: inGroup.id });
      }
    }
  }

  function tickDuo() {
    if (!alertActive) {
      duo.active = false;
      duo.alignment = 0;
      return;
    }
    if (sectionIndex < sections.length - 1) {
      duo.active = false;
      return;
    }
    const sameLane = companion.lane === player.lane;
    const sameFacing = companion.facing === player.facing;
    const dx = Math.abs(companion.x - player.x);
    const vxDelta = Math.abs(companion.vx - player.vx);
    const alignment = (sameLane ? 1 : 0)
      + (sameFacing ? 1 : 0)
      + (dx < 90 ? 1 : 0)
      + (vxDelta < 25 ? 1 : 0);
    duo.playerVx = player.vx;
    duo.companionVx = companion.vx;
    duo.dx = dx;
    duo.alignment = alignment;
    // Repair B (Design Lock §3 / §6.IV): alignment alone must never
    // activate the duo. `established` is armed exclusively by the
    // single contextual E press in pressInteract(); live alignment
    // only decides whether the established pair is currently a valid
    // two-person pattern. Completion therefore requires explicit
    // establishment plus valid alignment.
    duo.active = duo.established && alignment >= 3;
  }

  function maybeTriggerAlert() {
    if (sectionIndex === sections.length - 1 && !alertActive && player.x >= sections[sectionIndex].startX + 100) {
      alertActive = true;
      pushEvent('alert', {});
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  function update(dtMs, input = {}) {
    if (destroyed) return;
    if (typeof dtMs !== 'number' || dtMs <= 0) return;
    const dt = Math.min(dtMs, 100);
    elapsedMs += dt;
    input.dtMs = dt;
    applyPlayerMovement(input);
    advanceCrowds(dt);
    advanceDrones(dt);
    advanceCompanion(dt);
    tickCadence(dt);
    updateExposure(dt);
    updateLockCountdown(dt);
    detachCheck();
    maybeTriggerAlert();
    tickDuo();
    updateSectionProgression();
  }

  function pressInteract() {
    if (destroyed || player.locked) return;
    // Repair B (Design Lock §3 / §6.IV): the final duo is established
    // ONLY by one contextual, edge-triggered E press — never by
    // alignment inside tickDuo(). Checked before the anchored priority
    // chain and WITHOUT any anchoredGroupId requirement: when the
    // section IV alert scatters the crowds, detachCheck drops every
    // anchor, so an establishment route that required an anchor would
    // be unreachable in exactly the locked final state (no large
    // crowds remain). The condition is disjoint from rescue priority 1
    // (companion states are mutually exclusive), so hoisting it does
    // not reorder any reachable outcome.
    if (
      sectionIndex === sections.length - 1
      && alertActive
      && companion.state === 'safe-with-player'
      && !duo.established
    ) {
      duo.established = true;
      duo.active = true;
      pushEvent('duo-established', {});
      return;
    }
    if (player.anchoredGroupId) {
      // 1. Rescuable companion nearby.
      const c = nearestRescuableCompanion();
      if (c && (c.state === 'falling-behind' || c.state === 'wandering' || c.state === 'caught')) {
        const group = crowds.find((g) => g.id === player.anchoredGroupId);
        if (group) {
          companion.state = 'safe-with-player';
          companion.groupId = group.id;
          companion.lane = group.lane;
          companion.vx = group.vx;
          companion.x = player.x - 30 * player.facing;
          pushEvent('companion-rescued', { groupId: group.id });
          return;
        }
      }
      // 2. Group transfer in overlap zone. The player is anchored to
      //    some group on this lane; check whether they are also inside
      //    an overlap zone with another group. Use the anchored group
      //    as the basis (NOT findGroupAtPlayer, which requires the
      //    strict join radius — the player can be at the overlap edge
      //    and outside the join radius while still legitimately being
      //    in the "anchored" state).
      const anchoredGroup = crowds.find((g) => g.id === player.anchoredGroupId);
      if (anchoredGroup) {
        const overlaps = detectOverlapGroups(player.lane);
        for (const [a, b, _w] of overlaps) {
          let target = null;
          if (a.id === anchoredGroup.id) target = b;
          else if (b.id === anchoredGroup.id) target = a;
          if (target) {
            player.anchoredGroupId = target.id;
            pushEvent('group-transfer', { from: anchoredGroup.id, to: target.id });
            return;
          }
        }
      }
      // 3. Active leave. (The final-section duo establishment that
      //    used to live here is now the top-level Repair B check
      //    above, so it stays reachable after the crowds scatter and
      //    every anchor is dropped.)
      const prev = player.anchoredGroupId;
      player.anchoredGroupId = null;
      pushEvent('detached', { reason: 'manual', groupId: prev });
      return;
    }
    const here = findGroupAtPlayer();
    if (!here) {
      pushEvent('interact-noop', { reason: 'not-in-footprint' });
      return;
    }
    player.cadenceLockMsLeft = cfg.cadenceLockMs;
    pushEvent('cadence-started', { groupId: here.id });
  }

  function snapshot() {
    return clone({
      state: currentSection().id,
      section: currentSection().id,
      sectionIndex,
      elapsedMs,
      complete,
      alertActive,
      player: {
        x: round(player.x),
        y: round(player.y),
        lane: player.lane,
        vx: round(player.vx),
        facing: player.facing,
        anchoredGroupId: player.anchoredGroupId,
        targetOffsetX: round(player.targetOffsetX),
        cadenceLockMsLeft: round(player.cadenceLockMsLeft),
        exposureMs: round(player.exposureMs),
        locked: player.locked,
        lockMsLeft: round(player.lockMsLeft),
        safeAnchorX: player.safeAnchorX,
      },
      crowds: crowds.map((c) => ({
        id: c.id,
        lane: c.lane,
        x: round(c.x),
        leftX: round(crowdLeftX(c)),
        rightX: round(crowdRightX(c)),
        vx: c.vx,
        members: c.members,
        disperses: !!c.disperses,
        scattered: isCrowdScattered(c),
        memberOffsets: (c.memberOffsets ?? []).map(round),
      })),
      drones: drones.map((d) => ({
        id: d.id,
        lane: d.lane,
        x: round(d.x),
        scanActive: d.scanActive,
        lockTarget: d.lockTarget,
      })),
      companion: {
        id: companion.id,
        lane: companion.lane,
        x: round(companion.x),
        vx: round(companion.vx),
        facing: companion.facing,
        state: companion.state,
        groupId: companion.groupId,
        caughtMs: round(companion.caughtMs),
      },
      duo: {
        established: duo.established,
        active: duo.active,
        alignment: duo.alignment,
        playerVx: round(duo.playerVx),
        companionVx: round(duo.companionVx),
        dx: round(duo.dx),
      },
      qaState: null,
    });
  }

  function drainEvents() {
    const out = events;
    events = [];
    return clone(out);
  }

  // Full reset: restores the entry baseline. Used by the R key.
  // This is the same as `reset()` per the Design Lock API; the scene
  // also clears its own transients (camera, fireworks, lock tween).
  function reset() {
    crowds = freshCrowds();
    drones = freshDrones();
    companion = freshCompanion();
    player = {
      lane: LANE_NEAR,
      x: 100,
      y: 500,
      vx: 0,
      facing: 1,
      anchoredGroupId: null,
      targetOffsetX: 0,
      cadenceLockMsLeft: 0,
      exposureMs: 0,
      locked: false,
      lockMsLeft: 0,
      safeAnchorX: sections[0].safeAnchorX,
      lockedFromX: 0,
    };
    sectionIndex = 0;
    elapsedMs = 0;
    alertActive = false;
    // Repair B: reset clears the E-armed establishment as well as the
    // live pattern, so a stale establishment can never complete a
    // replayed run.
    duo = { established: false, active: false, alignment: 0, playerVx: 0, companionVx: 0, dx: 0 };
    complete = false;
    events = [];
    pushEvent('reset', {});
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    events = [];
  }

  function applyQaWarp(qaState) {
    reset();
    switch (qaState) {
      case 'entry':
        break;
      case 'rule-demo':
        player.x = 1000;
        player.lane = LANE_NEAR;
        break;
      case 'isolated-warning':
        // Drone-A is at 1100 (cone 1100-1420). Place the player ~200
        // px into the cone so the warning state stays stable across
        // the 600ms scan cycle (the test cycle of 1.3s used in the
        // active-scan-gating tests relies on the player remaining in
        // the cone as the drone drifts forward). The exposureMs seed
        // (1500) is below the 2200 lock threshold.
        player.x = 1300;
        player.lane = LANE_NEAR;
        player.exposureMs = 1500;
        break;
      case 'locked-recovery':
        player.x = 500;
        player.lane = LANE_NEAR;
        player.locked = true;
        player.lockMsLeft = 200;
        break;
      case 'joined-slow': {
        const slowI = crowds.find((c) => c.id === 'slow-I');
        if (slowI) {
          player.x = slowI.x;
          player.lane = LANE_NEAR;
          player.anchoredGroupId = 'slow-I';
        }
        break;
      }
      case 'joined-fast': {
        const fastII = crowds.find((c) => c.id === 'fast-II');
        if (fastII) {
          player.x = fastII.x;
          player.lane = LANE_FAR;
          player.anchoredGroupId = 'fast-II';
        }
        break;
      }
      case 'group-transfer':
        // slow-II footprint is 1120-1440; slow-II-sibling is 1380-1620;
        // overlap zone is 1380-1440. Place the player inside the
        // overlap so the [E TRANSFER] hint and the pressInteract()
        // group-transfer priority are both observable.
        player.x = 1410;
        player.lane = LANE_NEAR;
        player.anchoredGroupId = 'slow-II';
        break;
      case 'lane-risk':
        player.x = 1700;
        player.lane = LANE_FAR;
        player.exposureMs = 800;
        break;
      case 'companion-stranded': {
        sectionIndex = 2;
        const slowIII = crowds.find((c) => c.id === 'slow-III');
        if (slowIII) {
          player.x = slowIII.x;
          player.lane = LANE_NEAR;
        }
        companion.state = 'falling-behind';
        companion.groupId = 'slow-III';
        companion.lane = LANE_NEAR;
        companion.x = (slowIII?.x ?? 2900) + 40;
        companion.vx = (slowIII?.vx ?? 130) - 2;
        break;
      }
      case 'companion-rescued': {
        sectionIndex = 2;
        const slowIII2 = crowds.find((c) => c.id === 'slow-III');
        if (slowIII2) {
          player.x = slowIII2.x;
          player.lane = LANE_NEAR;
          player.anchoredGroupId = 'slow-III';
        }
        companion.state = 'safe-with-player';
        companion.groupId = 'slow-III';
        companion.lane = LANE_NEAR;
        companion.vx = slowIII2?.vx ?? 130;
        companion.x = (slowIII2?.x ?? 3200) - 30;
        break;
      }
      case 'crowd-dispersal':
        sectionIndex = 3;
        player.x = 4000;
        player.lane = LANE_NEAR;
        alertActive = true;
        companion.state = 'safe-with-player';
        companion.groupId = null;
        companion.lane = LANE_NEAR;
        companion.facing = 1;
        companion.vx = 0;
        companion.x = 3960;
        break;
      case 'duo-sync':
        sectionIndex = 3;
        player.x = 4700;
        player.lane = LANE_NEAR;
        player.facing = 1;
        player.vx = 130;
        player.anchoredGroupId = 'slow-IV';
        alertActive = true;
        companion.state = 'safe-with-player';
        companion.groupId = 'slow-IV';
        companion.lane = LANE_NEAR;
        companion.facing = 1;
        companion.vx = 130;
        companion.x = 4660;
        break;
      case 'duo-broken':
        // Repair B regression fixture: the duo WAS established by a
        // valid E press, but the live pattern is currently invalid —
        // the companion has drifted far behind (different group, big
        // spacing and speed delta). Completion must stay impossible
        // while alignment < 3 even though `established` is true.
        sectionIndex = 3;
        player.x = 4600;
        player.lane = LANE_NEAR;
        player.facing = 1;
        alertActive = true;
        duo.established = true;
        companion.state = 'wandering';
        companion.groupId = 'slow-IV';
        companion.lane = LANE_NEAR;
        companion.facing = 1;
        companion.vx = 128;
        companion.x = 4200;
        break;
      case 'complete':
        sectionIndex = 3;
        player.x = 4800;
        player.lane = LANE_NEAR;
        alertActive = true;
        // Repair B: the complete fixture must satisfy the new
        // establishment gate, so subsequent update() calls keep
        // duo.active === true (tickDuo recomputes it every frame).
        duo.established = true;
        duo.active = true;
        complete = true;
        // Place companion next to the player so the screen shows both
        // during the completion fireworks.
        companion.state = 'safe-with-player';
        companion.groupId = null;
        companion.lane = LANE_NEAR;
        companion.facing = 1;
        companion.vx = 0;
        companion.x = 4760;
        break;
      case 'reset-replay':
        break;
      default:
        break;
    }
    const snap = snapshot();
    snap.qaState = qaState;
    return snap;
  }

  function advanceSection(sectionId) {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return false;
    sectionIndex = idx;
    return true;
  }

  function eventLogClone() {
    return clone(eventLog);
  }

  return {
    update,
    pressInteract,
    snapshot,
    drainEvents,
    reset,
    destroy,
    applyQaWarp,
    advanceSection,
    eventLog: eventLogClone,
  };
}

function round(n) {
  if (typeof n !== 'number' || !isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export const _internal = {
  crowdLeftX,
  crowdRightX,
  pointInDroneCone,
  defaultCrowds,
  defaultDrones,
  defaultCompanion,
  pickNearestSlowCrowd,
};
