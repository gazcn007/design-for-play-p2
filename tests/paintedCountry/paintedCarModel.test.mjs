import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PART_ONE_SOURCES,
  PART_ONE_TARGETS,
  createPaintedCar,
} from '../../src/chapters/paintedCountry/paintedCarModel.js';
import {
  ARCH_GAP,
  ARCH_SEGMENTS,
  DRAWBRIDGE_GAP,
  FLOOR_RUNS,
  GAP_A,
  VESTIBULE,
  WORLD,
} from '../../src/chapters/paintedCountry/carLayout.js';

test('the three spaces use three different physical problems', () => {
  const kinds = new Set(PART_ONE_TARGETS.map((target) => target.kind));
  assert.deepEqual([...kinds].sort(), ['arch', 'bridge', 'counterweight']);
  assert.equal(PART_ONE_TARGETS.filter((target) => target.kind === 'arch').length, 3);
});

test('every target has exactly one color-bearing room object', () => {
  const sourceColors = PART_ONE_SOURCES.map((source) => source.pigment).sort();
  const targetColors = PART_ONE_TARGETS.map((target) => target.pigment).sort();
  assert.deepEqual(sourceColors, targetColors);
});

test('extracting color leaves the object drained and creates one finite unit', () => {
  const car = createPaintedCar();
  assert.equal(car.extract('red-phone'), true);
  assert.equal(car.isDrained('red-phone'), true);
  assert.deepEqual(car.snapshot().inventory, ['red']);
  assert.equal(car.extract('red-phone'), false);
  assert.deepEqual(car.snapshot().inventory, ['red']);
});

test('the short bridge consumes the red telephone pigment', () => {
  const car = createPaintedCar();
  assert.equal(car.fill('bridge-red'), false);
  assert.equal(car.extract('red-phone'), true);
  assert.equal(car.fill('bridge-red'), true);
  assert.equal(car.isFilled('bridge-red'), true);
  assert.deepEqual(car.snapshot().inventory, []);
});

test('the arch is only complete after its three differently colored sections', () => {
  const car = createPaintedCar();
  ['blue-teapot', 'yellow-lamp', 'green-chair'].forEach((id) => car.extract(id));
  car.fill('arch-blue');
  car.fill('arch-yellow');
  assert.equal(car.archComplete(), false);
  car.fill('arch-green');
  assert.equal(car.archComplete(), true);
});

test('coloring the counterweight opens the castle drawbridge', () => {
  const car = createPaintedCar();
  assert.equal(car.drawbridgeOpen(), false);
  car.extract('violet-banner');
  car.fill('counterweight-violet');
  assert.equal(car.drawbridgeOpen(), true);
  assert.ok(car.drainEvents().some((event) => event.type === 'drawbridge-opened'));
});

test('the vestibule has one far exit and solid floor to the world edge', () => {
  const lastFloor = FLOOR_RUNS.at(-1);
  assert.ok(VESTIBULE.enteredX < VESTIBULE.couplingX);
  assert.ok(VESTIBULE.couplingX < WORLD.w);
  assert.equal(lastFloor.x + lastFloor.w, WORLD.w);
});

test('each visible gap is separated and the arch spans the full middle gap', () => {
  assert.ok(GAP_A.x + GAP_A.w < ARCH_GAP.x);
  assert.ok(ARCH_GAP.x + ARCH_GAP.w < DRAWBRIDGE_GAP.x);
  assert.equal(ARCH_SEGMENTS[0].x, ARCH_GAP.x);
  assert.equal(ARCH_SEGMENTS.at(-1).x + ARCH_SEGMENTS.at(-1).w, ARCH_GAP.x + ARCH_GAP.w);
});

test('the car can only finish after all five finite colors have been placed', () => {
  const car = createPaintedCar();
  assert.equal(car.enterExit(), false);
  PART_ONE_SOURCES.forEach(({ id }) => car.extract(id));
  PART_ONE_TARGETS.slice(0, -1).forEach(({ id }) => car.fill(id));
  assert.equal(car.enterExit(), false);
  car.fill(PART_ONE_TARGETS.at(-1).id);
  assert.equal(car.enterExit(), true);
  assert.equal(car.snapshot().complete, true);
});
