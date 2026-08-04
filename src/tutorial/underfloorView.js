// UNDERCARRIAGE VIEW TEACHING (III/IV Visual Polish Wave) — pure predicates
// for the look-down teaching layer. No Phaser imports, so the node test suite
// can lock every gate the scene wires up:
//
//   * `underfloor`      — machinery layout flag (IV/V/VI): the stage's gear
//                         lives in the deep underfloor band (underY = 690).
//   * `underfloorView`  — teaching flag (III, IV): the stage teaches the
//                         hold-S look-down verb. III carries ONLY this flag so
//                         its hand-placed air-circuit run (header y=545, gauge
//                         at wall eye height) is not relocated by the
//                         underfloor machinery branch.
//
// Lane keys are a world-1 verb; inside the tutorial car (world 0) W/S never
// switch lanes — S is the hold-to-look-down verb. That suppression already
// existed inline in GameScene.update(); it is extracted here so the gate is
// testable and so the camera, the input layer and the hint share one truth.

export function stageHasUnderfloorView(stage) {
  return Boolean(stage && (stage.underfloor || stage.underfloorView));
}

// The camera may only tilt down once the player has walked far enough into
// the stage for the machinery to be on screen (same +90 margin the camera
// used before this extraction).
export function canLookDownUnderfloor(stage, playerX) {
  return stageHasUnderfloorView(stage) && playerX > stage.startX + 90;
}

// Full look-down resolution, mirroring the guard order in
// GameScene.updateTutorialCamera: world/camera-mode guards first, then the
// zone check, then the held key (or QA force), then grounded.
export function resolveUnderfloorLookDown({
  activeWorldIndex,
  cameraLocked,
  cinematic,
  relayCloseup,
  stage,
  playerX,
  grounded,
  lookDownHeld,
  forceLookDown,
}) {
  if (activeWorldIndex !== 0) return false;
  if (!cameraLocked || cinematic || relayCloseup) return false;
  if (!canLookDownUnderfloor(stage, playerX)) return false;
  return Boolean((lookDownHeld || forceLookDown) && grounded);
}

// W/S lane changes belong to the later worlds. In the tutorial car they are
// swallowed so S can be the look-down verb without a lane fight.
export function gateTutorialLaneInput({ activeWorldIndex, laneBack, laneFront }) {
  if (activeWorldIndex === 0) return { laneBack: false, laneFront: false };
  return { laneBack: Boolean(laneBack), laneFront: Boolean(laneFront) };
}

// ---------------------------------------------------------------- hint ---
// [HOLD S] prompt, screen-anchored (VISIBLE SYSTEM ARC CORRECTION §1). The
// weak/dwell model is abolished: III, IV and V ALL show the same strong
// prompt the moment the player steps into the underfloor readable zone —
// a first-time player cannot be expected to remember a verb taught two rooms
// ago, and a 2800ms dwell only read as "the game has nothing to say". VI
// carries no prompt at all: its first observation loop drives the camera for
// the player (GameScene auto follow of the echo trolley).
//
// Retirement is earned, not timed: the prompt for a stage only leaves once
// the player has genuinely held S and kept the camera visibly tilted down
// for UNDERFLOOR_HINT_LOOK_MS in that stage. Each stage retires its own
// prompt (the correction's "本阶段提示才永久退场"), so IV and V re-teach the
// verb even after III taught it. The prompt never appears during cinematics,
// the relay close-up, or after the stage is complete.

export const UNDERFLOOR_HINT_LOOK_MS = 300;

export function createUnderfloorHintState() {
  return { retiredByStage: {}, lookMs: 0, activeStageId: null };
}

// One call per frame. Mutates `state` (look-down accumulation, per-stage
// retirement) and returns what the scene should show:
// { visible, style: 'strong'|null }. 'weak' no longer exists.
export function updateUnderfloorHint(state, {
  stage,
  playerX,
  lookingDown,
  cinematic,
  relayCloseup,
  stageComplete,
  deltaMs,
}) {
  const hidden = { visible: false, style: null };
  if (!stage || cinematic || relayCloseup || stageComplete) return hidden;

  // VI (echoLoad) and every non-underfloor stage: no prompt. VI's first loop
  // is camera-led, so teaching the key there would be redundant noise.
  if (!stageHasUnderfloorView(stage) || stage.echoLoad) return hidden;

  const stageId = stage.id ?? String(stage.startX);
  if (state.activeStageId !== stageId) {
    // Entering a new stage's zone re-arms the look-down timer; the retirement
    // record itself is per stage and survives the switch.
    state.activeStageId = stageId;
    state.lookMs = 0;
  }
  if (state.retiredByStage[stageId]) return hidden;

  // A real look-down: the key is held AND the camera has tilted (the scene
  // only reports lookingDown once the resolve gate passes). Accumulate only
  // while it stays down; releasing resets the earned time.
  if (lookingDown) {
    state.lookMs += Math.max(0, deltaMs ?? 0);
    if (state.lookMs >= UNDERFLOOR_HINT_LOOK_MS) {
      state.retiredByStage[stageId] = true;
      return hidden;
    }
    // Keep the prompt on screen during the first earned look-downs — it is
    // the instruction being followed, disappearing mid-gesture reads as a bug.
  } else {
    state.lookMs = 0;
  }

  return playerX > stage.startX + 90 ? { visible: true, style: 'strong' } : hidden;
}
