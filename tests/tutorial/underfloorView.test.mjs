// UNDERCARRIAGE VIEW TEACHING — regression locks for the S-key gate, the
// look-down camera gate and the [S] hint state machine. The seven items from
// the wave brief that are pure logic are locked here; the three smoothness
// items (hold/release lerp, rapid tap) are verified in the browser run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stageHasUnderfloorView,
  canLookDownUnderfloor,
  resolveUnderfloorLookDown,
  gateTutorialLaneInput,
  createUnderfloorHintState,
  updateUnderfloorHint,
  UNDERFLOOR_HINT_DWELL_MS,
} from '../../src/tutorial/underfloorView.js';

const III = { id: 'junction-3', startX: 1600, endX: 2390, underfloorView: true };
const IV = { id: 'junction-4', startX: 2400, endX: 3190, underfloor: true, underfloorView: true };
const V = { id: 'junction-5', startX: 3200, endX: 3990, underfloor: true };
const II = { id: 'junction-2', startX: 800, endX: 1590 };

const baseLook = {
  activeWorldIndex: 0,
  cameraLocked: true,
  cinematic: false,
  relayCloseup: false,
  stage: III,
  playerX: 1800,
  grounded: true,
  lookDownHeld: true,
  forceLookDown: false,
};

test('1. III/IV: holding S never switches lane; it resolves as look-down', () => {
  // The lane gate swallows W/S in the tutorial car...
  assert.deepEqual(
    gateTutorialLaneInput({ activeWorldIndex: 0, laneBack: true, laneFront: true }),
    { laneBack: false, laneFront: false },
  );
  // ...and the same S hold is available to the camera as look-down, in both
  // the III teaching zone (underfloorView only) and IV (underfloor + view).
  assert.equal(resolveUnderfloorLookDown(baseLook), true);
  assert.equal(resolveUnderfloorLookDown({ ...baseLook, stage: IV, playerX: 2600 }), true);
});

test('2. outside underfloor stages S keeps its original behaviour', () => {
  // Later worlds: lane keys pass through untouched.
  assert.deepEqual(
    gateTutorialLaneInput({ activeWorldIndex: 1, laneBack: false, laneFront: true }),
    { laneBack: false, laneFront: true },
  );
  // Tutorial stages without the view flag: S does nothing to the camera.
  assert.equal(resolveUnderfloorLookDown({ ...baseLook, stage: II, playerX: 1200 }), false);
  // And inside a view stage but before the machinery zone: still nothing.
  assert.equal(resolveUnderfloorLookDown({ ...baseLook, playerX: 1650 }), false);
});

test('3. look-down requires the held key (or QA force) while grounded', () => {
  assert.equal(resolveUnderfloorLookDown({ ...baseLook, lookDownHeld: false }), false);
  assert.equal(resolveUnderfloorLookDown({ ...baseLook, lookDownHeld: false, forceLookDown: true }), true);
  assert.equal(resolveUnderfloorLookDown({ ...baseLook, grounded: false }), false);
});

test('4. camera-mode guards: wrong world / unlocked camera block look-down', () => {
  assert.equal(resolveUnderfloorLookDown({ ...baseLook, activeWorldIndex: 1 }), false);
  assert.equal(resolveUnderfloorLookDown({ ...baseLook, cameraLocked: false }), false);
});

test('6. completion cinematic never fights the pan for the camera', () => {
  assert.equal(
    resolveUnderfloorLookDown({ ...baseLook, cinematic: true, forceLookDown: true }),
    false,
  );
});

test('7. relay close-up owns the camera while open', () => {
  assert.equal(resolveUnderfloorLookDown({ ...baseLook, relayCloseup: true }), false);
});

test('stage flag semantics: view flag alone never implies machinery layout', () => {
  assert.equal(stageHasUnderfloorView(III), true);
  assert.equal(stageHasUnderfloorView(IV), true);
  assert.equal(stageHasUnderfloorView(V), true);
  assert.equal(stageHasUnderfloorView(II), false);
  assert.equal(stageHasUnderfloorView(null), false);
  assert.equal(canLookDownUnderfloor(III, 1691), true);
  assert.equal(canLookDownUnderfloor(III, 1690), false);
});

// ------------------------------------------------------------ [S] hint ---
const hintBase = {
  playerX: 1800,
  lookingDown: false,
  cinematic: false,
  relayCloseup: false,
  stageComplete: false,
  deltaMs: 100,
};

test('hint: III shows the strong prompt on first zone entry, once', () => {
  const state = createUnderfloorHintState();
  assert.deepEqual(updateUnderfloorHint(state, { ...hintBase, stage: III }), { visible: true, style: 'strong' });
  // Looking down retires it for the session.
  assert.deepEqual(updateUnderfloorHint(state, { ...hintBase, stage: III, lookingDown: true }), { visible: false, style: null });
  assert.equal(state.strongSeen, true);
  assert.deepEqual(updateUnderfloorHint(state, { ...hintBase, stage: III }), { visible: false, style: null });
});

test('hint: III prompt waits for the readable zone', () => {
  const state = createUnderfloorHintState();
  assert.deepEqual(updateUnderfloorHint(state, { ...hintBase, stage: III, playerX: 1620 }), { visible: false, style: null });
});

test('hint: IV weak nudge only after dwelling, then retires forever', () => {
  const state = createUnderfloorHintState();
  const atIv = { ...hintBase, stage: IV, playerX: 2600 };
  // Before the dwell elapses: nothing.
  for (let i = 0; i < UNDERFLOOR_HINT_DWELL_MS / 100 - 1; i += 1) {
    assert.deepEqual(updateUnderfloorHint(state, atIv), { visible: false, style: null });
  }
  // Dwell reached: weak prompt.
  assert.deepEqual(updateUnderfloorHint(state, atIv), { visible: true, style: 'weak' });
  // Looking down retires it permanently.
  updateUnderfloorHint(state, { ...atIv, lookingDown: true });
  assert.equal(state.weakSeen, true);
  assert.deepEqual(updateUnderfloorHint(state, atIv), { visible: false, style: null });
});

test('hint: IV dwell resets when the player leaves the zone', () => {
  const state = createUnderfloorHintState();
  const atIv = { ...hintBase, stage: IV, playerX: 2600 };
  for (let i = 0; i < 20; i += 1) updateUnderfloorHint(state, atIv);
  assert.equal(state.dwellMs, 2000);
  updateUnderfloorHint(state, { ...atIv, playerX: 2410 });
  assert.equal(state.dwellMs, 0);
});

test('hint: never during cinematic, close-up, or after stage complete', () => {
  const state = createUnderfloorHintState();
  assert.deepEqual(updateUnderfloorHint(state, { ...hintBase, stage: III, cinematic: true }), { visible: false, style: null });
  assert.deepEqual(updateUnderfloorHint(state, { ...hintBase, stage: III, relayCloseup: true }), { visible: false, style: null });
  assert.deepEqual(updateUnderfloorHint(state, { ...hintBase, stage: III, stageComplete: true }), { visible: false, style: null });
});

test('hint: V/VI and plain stages never prompt (verb already learned)', () => {
  const state = createUnderfloorHintState();
  assert.deepEqual(updateUnderfloorHint(state, { ...hintBase, stage: V, playerX: 3400 }), { visible: false, style: null });
  assert.deepEqual(updateUnderfloorHint(state, { ...hintBase, stage: II, playerX: 1200 }), { visible: false, style: null });
});
