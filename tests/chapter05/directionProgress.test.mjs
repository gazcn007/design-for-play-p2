import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTER05_DIRECTIONS,
  DIRECTION_ORDER,
  PLAYABLE_DIRECTION_ORDER,
  directionDefinition,
} from '../../src/chapters/museum3d/directions/directionRegistry.js';
import {
  createDirectionProgressState,
  reduceDirectionProgress,
} from '../../src/chapters/museum3d/state/chapter05DirectionProgress.js';

test('Chapter 5 keeps four authored directions but packages only Doors 1–2 in the museum route', () => {
  assert.deepEqual(DIRECTION_ORDER, [
    'labyrinth',
    'borrowed-grid',
    'echo-city',
    'painted-country',
  ]);
  assert.deepEqual(DIRECTION_ORDER.map((id) => directionDefinition(id).title), ['1', '2', '3', '4']);
  assert.deepEqual(PLAYABLE_DIRECTION_ORDER, ['labyrinth', 'borrowed-grid']);
  assert.equal(directionDefinition(CHAPTER05_DIRECTIONS.ECHO_CITY).available, false);
  assert.equal(directionDefinition(CHAPTER05_DIRECTIONS.PAINTED_COUNTRY).available, false);
});

test('the packaged final gate waits only for Doors 1–2 while standalone slices stay sealed', () => {
  let state = createDirectionProgressState();
  for (const id of PLAYABLE_DIRECTION_ORDER) {
    ({ state } = reduceDirectionProgress(state, { type: 'artifact.take', id }));
    assert.equal(state.carriedArtifact, id);
    assert.equal(state.completed[id], false);
    ({ state } = reduceDirectionProgress(state, { type: 'artifact.display', id }));
  }
  assert.equal(state.completedCount, 2);
  assert.equal(state.allComplete, true);
  assert.equal(state.completed['echo-city'], false);
  assert.equal(state.completed['painted-country'], false);
});

test('Door 4 cannot be opened or smuggle its artifact into the packaged route', () => {
  const state = createDirectionProgressState();
  const opened = reduceDirectionProgress(state, { type: 'direction.open', id: 'painted-country' });
  assert.equal(opened.state.activeDirection, null);
  assert.match(opened.events[0].payload.reason, /sealed/);
  const taken = reduceDirectionProgress(state, { type: 'artifact.take', id: 'painted-country' });
  assert.equal(taken.state.carriedArtifact, null);
  assert.match(taken.events[0].payload.reason, /unknown artifact/);
});

test('Echo City remains an authored standalone artifact flow without opening in the museum', () => {
  let state = createDirectionProgressState();
  const opened = reduceDirectionProgress(state, { type: 'direction.open', id: 'echo-city' });
  assert.equal(opened.state.activeDirection, null);
  assert.match(opened.events[0].payload.reason, /sealed/);
  const shortcut = reduceDirectionProgress(state, { type: 'direction.complete', id: 'echo-city' });
  assert.equal(shortcut.state.completed['echo-city'], false);
  ({ state } = reduceDirectionProgress(state, { type: 'artifact.take', id: 'echo-city' }));
  assert.equal(state.carriedArtifact, 'echo-city');
  assert.equal(state.completed['echo-city'], false);
  ({ state } = reduceDirectionProgress(state, { type: 'artifact.display', id: 'echo-city' }));
  assert.equal(state.artifacts['echo-city'].displayed, true);
  assert.equal(state.completed['echo-city'], true);
});

test('a carried artifact blocks another direction until it is displayed', () => {
  let state = createDirectionProgressState();
  ({ state } = reduceDirectionProgress(state, { type: 'artifact.take', id: 'borrowed-grid' }));
  const blocked = reduceDirectionProgress(state, { type: 'direction.open', id: 'labyrinth' });
  assert.equal(blocked.state.activeDirection, null);
  assert.match(blocked.events[0].payload.reason, /display carried artifact/);
  const premature = reduceDirectionProgress(state, { type: 'direction.complete', id: 'borrowed-grid' });
  assert.equal(premature.state.completed['borrowed-grid'], false);
  const displayed = reduceDirectionProgress(state, { type: 'artifact.display', id: 'borrowed-grid' });
  assert.equal(displayed.state.completed['borrowed-grid'], true);
  assert.equal(displayed.state.artifacts['borrowed-grid'].displayed, true);
  assert.equal(displayed.state.carriedArtifact, null);
});

test('opening one packaged direction never nests another direction inside it', () => {
  let state = createDirectionProgressState();
  ({ state } = reduceDirectionProgress(state, { type: 'direction.open', id: 'labyrinth' }));
  const rejected = reduceDirectionProgress(state, { type: 'direction.open', id: 'borrowed-grid' });
  assert.equal(rejected.state.activeDirection, 'labyrinth');
  assert.equal(rejected.events[0].type, 'direction.rejected');
});
