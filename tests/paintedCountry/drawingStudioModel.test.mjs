import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REQUIRED_CELLS,
  STUDIO_PIGMENTS,
  STUDIO_SOURCES,
  createDrawingStudio,
} from '../../src/chapters/paintedCountry/drawingStudioModel.js';

test('the room has exactly one finite object for every required square', () => {
  assert.equal(STUDIO_SOURCES.length, 6);
  assert.equal(STUDIO_SOURCES.length, REQUIRED_CELLS.length);
  assert.equal(STUDIO_PIGMENTS.length, STUDIO_SOURCES.length);
  assert.equal(new Set(REQUIRED_CELLS.map(({ cell }) => cell)).size, REQUIRED_CELLS.length);
  assert.equal(new Set(STUDIO_SOURCES.map(({ id }) => id)).size, STUDIO_SOURCES.length);
});

test('the player carries one square of color at a time', () => {
  const studio = createDrawingStudio();
  assert.equal(studio.extract('phone'), true);
  assert.equal(studio.extract('lamp'), false);
  assert.equal(studio.snapshot().held, 'phone');
  assert.equal(studio.snapshot().sources.find(({ id }) => id === 'phone').drained, true);
});

test('a required cell only accepts the matching room object', () => {
  const studio = createDrawingStudio();
  studio.extract('phone');
  assert.equal(studio.placeRequired('2,0'), false);
  assert.equal(studio.snapshot().held, 'phone');
  assert.equal(studio.placeRequired('0,0'), true);
  assert.equal(studio.snapshot().held, null);
});

test('using a color on the free canvas blocks the required copy', () => {
  const studio = createDrawingStudio();
  studio.extract('phone');
  studio.placeFree('0,0');
  STUDIO_SOURCES.slice(1).forEach((item) => {
    studio.extract(item.id);
    studio.placeRequired(item.targetCell);
  });
  assert.equal(studio.isComplete(), false);
  assert.equal(studio.snapshot().free['0,0'], 'phone');
});

test('lifting a free square returns the exact pigment and restores solvability', () => {
  const studio = createDrawingStudio();
  studio.extract('phone');
  studio.placeFree('3,3');
  assert.equal(studio.liftFree('3,3'), true);
  assert.equal(studio.snapshot().held, 'phone');
  assert.equal(studio.placeRequired('0,0'), true);
});

test('completing the vase drains every colored object in the room', () => {
  const studio = createDrawingStudio();
  STUDIO_SOURCES.forEach((item) => {
    studio.extract(item.id);
    studio.placeRequired(item.targetCell);
  });
  assert.equal(studio.isComplete(), true);
  assert.equal(studio.snapshot().sources.every(({ drained }) => drained), true);
  assert.equal(studio.snapshot().held, null);
  assert.deepEqual(studio.snapshot().free, {});
});

test('dismantling the framed vase makes the exit unavailable until restored', () => {
  const studio = createDrawingStudio();
  STUDIO_SOURCES.forEach((item) => {
    studio.extract(item.id);
    studio.placeRequired(item.targetCell);
  });
  assert.equal(studio.liftRequired('0,0'), true);
  assert.equal(studio.isComplete(), false);
  assert.equal(studio.placeFree('4,0'), true);
  assert.equal(studio.isComplete(), false);
  studio.liftFree('4,0');
  studio.placeRequired('0,0');
  assert.equal(studio.isComplete(), true);
});

test('color is conserved through every move', () => {
  const studio = createDrawingStudio();
  assert.equal(studio.tokenLocationCount(), STUDIO_SOURCES.length);
  studio.extract('phone');
  assert.equal(studio.tokenLocationCount(), STUDIO_SOURCES.length);
  studio.placeFree('0,0');
  assert.equal(studio.tokenLocationCount(), STUDIO_SOURCES.length);
  studio.liftFree('0,0');
  studio.placeRequired('0,0');
  assert.equal(studio.tokenLocationCount(), STUDIO_SOURCES.length);
});
