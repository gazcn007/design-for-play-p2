import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPaintedCar,
  PIGMENT,
  SLOT_CAPACITY,
  SOLID_AT,
} from '../../src/chapters/paintedCountry/paintedCarModel.js';

const cov = (car, id) => car.byId(id).coverage;
const hold = (car, action, id, seconds, step = 0.05) => {
  for (let t = 0; t < seconds; t += step) car[action](id, step);
};
const run = (car, seconds, step = 0.05) => {
  for (let t = 0; t < seconds; t += step) car.update(step);
};

// ------------------------------------------------------------------- BAY A

test('bay A starts with less free pigment than the beam needs', () => {
  const car = createPaintedCar();
  // The whole design of bay A. If free pigment ever covers the beam on its own,
  // beat 3 disappears and the chapter loses its thesis.
  assert.ok(car.freePigment('A') < SOLID_AT, `free ${car.freePigment('A')} must be under ${SOLID_AT}`);
  assert.equal(car.isSolid('beam-left'), true);
  assert.equal(car.isSolid('beam-right'), false);
});

test('the shortfall can be taken from the plank underfoot without dropping it', () => {
  const car = createPaintedCar();
  hold(car, 'wash', 'soot-spill', 2);
  hold(car, 'wash', 'stove-firebox', 2);
  hold(car, 'paint', 'beam-right', 5);
  assert.equal(car.isSolid('beam-right'), false, '0.60 of free pigment must not be enough');

  hold(car, 'wash', 'beam-left', 0.3);
  hold(car, 'paint', 'beam-right', 5);
  assert.equal(car.isSolid('beam-right'), true);
  assert.equal(car.isSolid('beam-left'), true, 'the intended solve must not drop the plank');
});

test('over-washing drops the plank, and it can always be painted back', () => {
  const car = createPaintedCar();
  hold(car, 'wash', 'beam-left', 1.2);
  assert.equal(car.isSolid('beam-left'), false);
  assert.ok(car.drainEvents().some((e) => e.type === 'region-gave-way'));
  hold(car, 'paint', 'beam-left', 5);
  assert.equal(car.isSolid('beam-left'), true);
});

// ------------------------------------------------------------------- BAY B

test('the indigo is hidden until the panel over the basin is washed', () => {
  const car = createPaintedCar();
  assert.equal(car.byId('indigo-bottle').hidden, true);
  assert.equal(car.regionAt(1070, 340)?.id, 'basin-panel');
  hold(car, 'wash', 'basin-panel', 1);
  assert.equal(car.byId('indigo-bottle').hidden, false);
  assert.ok(car.drainEvents().some((e) => e.type === 'revealed'));
});

test('the channel is its own valve: painted it runs, washed it stops', () => {
  const car = createPaintedCar();
  hold(car, 'wash', 'basin-panel', 1);
  hold(car, 'wash', 'indigo-bottle', 3);
  hold(car, 'paint', 'channel', 3);
  run(car, 0.1);
  assert.equal(car.flowing(), true);

  hold(car, 'wash', 'channel', 3);
  run(car, 0.1);
  assert.equal(car.flowing(), false);
});

test('running water takes the plank apart, and the pigment settles rather than vanishing', () => {
  const car = createPaintedCar();
  hold(car, 'wash', 'lamp-soot', 2);
  hold(car, 'paint', 'trough-plank', 3);
  assert.equal(car.isSolid('trough-plank'), true);

  hold(car, 'wash', 'basin-panel', 1);
  hold(car, 'wash', 'indigo-bottle', 3);
  hold(car, 'paint', 'channel', 3);
  run(car, 3);

  assert.equal(car.isSolid('trough-plank'), false, 'beat 5: black does not survive running water');
  assert.ok(cov(car, 'settling-pan') > 0, 'nothing in this car may be destroyed');
});

test('the float rises once the water has run, and stays up', () => {
  const car = createPaintedCar();
  hold(car, 'wash', 'basin-panel', 1);
  hold(car, 'wash', 'indigo-bottle', 3);
  hold(car, 'paint', 'channel', 3);
  assert.equal(car.floatUp(), false);
  run(car, 3);
  assert.equal(car.floatUp(), true);
  hold(car, 'wash', 'channel', 3);
  run(car, 1);
  assert.equal(car.floatUp(), true, 'the basin holds its water; the step does not vanish under you');
});

test('the wrong order is recoverable — the pan gives the plank back', () => {
  const car = createPaintedCar();
  hold(car, 'wash', 'lamp-soot', 2);
  hold(car, 'paint', 'trough-plank', 3);
  hold(car, 'wash', 'basin-panel', 1);
  hold(car, 'wash', 'indigo-bottle', 3);
  hold(car, 'paint', 'channel', 3);
  run(car, 4); // the plank dissolves before the player crossed it

  hold(car, 'wash', 'channel', 3); // stop the water
  run(car, 0.1);
  hold(car, 'wash', 'settling-pan', 4); // recover what it took
  hold(car, 'paint', 'trough-plank', 4);
  assert.equal(car.isSolid('trough-plank'), true, 'no ordering may strand the player');
});

// ------------------------------------------------------------------- BAY C

test('the correct door refuses paint and costs nothing to try', () => {
  const car = createPaintedCar();
  hold(car, 'wash', 'lamp-soot', 2);
  const before = car.totalLoad();
  hold(car, 'paint', 'correct-door', 2);
  assert.equal(cov(car, 'correct-door'), 0, 'the paper will not take a line nobody drew');
  assert.equal(car.totalLoad(), before, 'a refusal must not cost the player pigment');
  assert.ok(car.drainEvents().some((e) => e.type === 'paint-refused'));
});

test('the door she drew in the wrong place accepts paint immediately', () => {
  const car = createPaintedCar();
  hold(car, 'wash', 'lamp-soot', 2);
  hold(car, 'paint', 'ceiling-door', 2);
  assert.equal(car.isSolid('ceiling-door'), true);
});

test('the coupling takes whatever pigment it is given, and remembers which', () => {
  const car = createPaintedCar();
  hold(car, 'wash', 'mural-river', 3);
  hold(car, 'paint', 'coupling-door', 4);
  assert.equal(car.isDone('coupling-door'), true);
  assert.equal(car.state.doorPigment, PIGMENT.INDIGO);
});

test('completing the car records which part of the mural survived', () => {
  const car = createPaintedCar();
  hold(car, 'wash', 'mural-house', 3);
  hold(car, 'paint', 'coupling-door', 4);
  assert.equal(car.state.complete, true);
  const kept = car.state.keptMural;
  assert.ok(!kept.includes('mural-house'), 'the part you spent is gone');
  assert.deepEqual(kept.sort(), ['mural-figure', 'mural-hill', 'mural-river']);
});

// -------------------------------------------------------------- the brush

test('the brush carries two pigments and no more', () => {
  const car = createPaintedCar();
  hold(car, 'wash', 'soot-spill', 2);
  hold(car, 'wash', 'basin-panel', 1);
  hold(car, 'wash', 'indigo-bottle', 2);
  assert.equal(car.brushLoad(PIGMENT.BONE) > 0, true);
  assert.equal(car.brushLoad(PIGMENT.INDIGO) > 0, true);

  car.drainEvents();
  hold(car, 'wash', 'mural-hill', 1); // a third colour has nowhere to go
  assert.equal(car.brushLoad(PIGMENT.VERDIGRIS), 0);
  assert.ok(car.drainEvents().some((e) => e.type === 'brush-full'));
});

test('no slot can hold more than its capacity, and the surplus stays put', () => {
  const car = createPaintedCar();
  hold(car, 'wash', 'beam-left', 10);
  const slot = car.state.brush.find((s) => s.pigment === PIGMENT.BONE);
  assert.ok(slot.load <= SLOT_CAPACITY + 1e-9);
  const remaining = cov(car, 'beam-left') * car.byId('beam-left').capacity;
  assert.ok(Math.abs(remaining + slot.load - 1) < 1e-9);
});

test('regionAt resolves neighbours separately and ignores empty paper', () => {
  const car = createPaintedCar();
  assert.equal(car.regionAt(400, 436)?.id, 'beam-left');
  assert.equal(car.regionAt(600, 436)?.id, 'beam-right');
  assert.equal(car.regionAt(1500, 436)?.id, 'trough-plank');
  assert.equal(car.regionAt(2350, 230)?.id, 'mural-hill');
  assert.equal(car.regionAt(900, 200), null);
});
