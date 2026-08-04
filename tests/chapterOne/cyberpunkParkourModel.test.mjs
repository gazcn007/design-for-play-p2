import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MOVABLE_DEFS,
  beginDrag,
  canCompleteGoal,
  completeGoal,
  createParkourState,
  finishDrag,
  movableById,
  parkourSnapshot,
  previewDrag,
  recordCarRide,
  resetParkourState,
  stepFlyingCars,
} from '../../src/cars/cyberpunkParkour/parkourModel.js';

test('first movable ladder spans the intentionally unaided-jump-proof ascent', () => {
  const ladder = MOVABLE_DEFS.find(({ id }) => id === 'ladder-a');
  assert.equal(ladder.height, 180);
  assert.equal(ladder.y - ladder.height / 2, 170);
  assert.equal(ladder.y + ladder.height / 2, 350);
});

test('legal horizontal placement commits and updates the traversable position', () => {
  const state = createParkourState();
  assert.equal(beginDrag(state, 'ladder-a'), true);
  assert.deepEqual(previewDrag(state, 735), { x: 735, legal: true });
  assert.deepEqual(finishDrag(state), { id: 'ladder-a', x: 735, accepted: true });
  assert.equal(movableById(state, 'ladder-a').committedX, 735);
  assert.deepEqual(state.movedKinds, ['ladder']);
});

test('illegal placement stays on its rail and restores committed collision position', () => {
  const state = createParkourState();
  const block = movableById(state, 'block-a');
  const startX = block.startX;
  beginDrag(state, block.id);
  assert.deepEqual(previewDrag(state, block.maxX + 400), { x: block.maxX, legal: false });
  assert.deepEqual(finishDrag(state), { id: block.id, x: startX, accepted: false });
  assert.equal(block.x, startX);
  assert.equal(block.committedX, startX);
  assert.deepEqual(state.movedKinds, []);
});

test('flying cars move autonomously, expose phase, and reverse at authored bounds', () => {
  const state = createParkourState();
  const car = state.flyingCars[0];
  const first = stepFlyingCars(state, 100)[0];
  assert.ok(first.deltaX > 0);
  assert.ok(first.phase > 0);

  car.x = car.maxX - 1;
  car.direction = 1;
  stepFlyingCars(state, 100);
  assert.equal(car.x, car.maxX);
  assert.equal(car.direction, -1);
  assert.equal(car.phase, 1);
});

test('goal requires both movable kinds and rides on both authored flying cars', () => {
  const state = createParkourState();
  for (const [id, x] of [['ladder-a', 735], ['block-a', 420]]) {
    beginDrag(state, id);
    previewDrag(state, x);
    finishDrag(state);
  }
  assert.equal(canCompleteGoal(state), false);
  assert.equal(completeGoal(state), false);
  recordCarRide(state, 'car-a');
  assert.equal(canCompleteGoal(state), false);
  recordCarRide(state, 'car-b');
  assert.equal(canCompleteGoal(state), true);
  assert.equal(completeGoal(state), true);
});

test('failure and manual reset restore movable collision positions and platform timing', () => {
  const state = createParkourState();
  beginDrag(state, 'block-b');
  previewDrag(state, 4120);
  finishDrag(state);
  stepFlyingCars(state, 1000);
  recordCarRide(state, 'car-a');

  resetParkourState(state, 'spikes');
  const snapshot = parkourSnapshot(state);
  assert.equal(snapshot.resetCount, 1);
  assert.equal(snapshot.lastFailure, 'spikes');
  assert.deepEqual(snapshot.movedKinds, []);
  assert.deepEqual(snapshot.riddenCars, []);
  assert.equal(snapshot.movables.find(({ id }) => id === 'block-b').x, 4070);
  assert.equal(snapshot.flyingCars.find(({ id }) => id === 'car-a').x, 1100);
  assert.equal(snapshot.goalComplete, false);
});
