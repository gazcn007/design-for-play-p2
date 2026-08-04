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
// [S] chevron prompt, screen-anchored. III teaches the verb once, strongly,
// the first time the player enters the readable zone; IV assumes the verb is
// known and only offers a weak nudge after the player has stood in the zone
// ~3s without looking. V/VI carry no prompt (learned by then). The prompt
// never appears during cinematics, the relay close-up, or after the stage is
// complete, and looking down retires it for the rest of the session.

export const UNDERFLOOR_HINT_DWELL_MS = 2800;

export function createUnderfloorHintState() {
  return { strongSeen: false, weakSeen: false, dwellMs: 0 };
}

// One call per frame. Mutates `state` (dwell accumulation, seen flags) and
// returns what the scene should show: { visible, style: 'strong'|'weak'|null }.
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

  // III: strong, first zone entry only, retired by one successful look-down.
  if (stage.underfloorView && !stage.underfloor) {
    if (state.strongSeen) return hidden;
    if (lookingDown) {
      state.strongSeen = true;
      return hidden;
    }
    return playerX > stage.startX + 90 ? { visible: true, style: 'strong' } : hidden;
  }

  // IV: weak nudge after dwelling in the zone without looking down.
  if (stage.underfloorView && stage.underfloor) {
    if (state.weakSeen) return hidden;
    if (lookingDown) {
      state.weakSeen = true;
      return hidden;
    }
    if (playerX > stage.startX + 90) {
      state.dwellMs += deltaMs;
    } else {
      state.dwellMs = 0;
    }
    return state.dwellMs >= UNDERFLOOR_HINT_DWELL_MS ? { visible: true, style: 'weak' } : hidden;
  }

  // V/VI and every non-underfloor stage: no prompt.
  return hidden;
}
