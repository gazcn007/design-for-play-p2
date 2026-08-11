import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION,
  ACTION_HOLD_SECONDS,
  KIND,
  createPaintedCar,
} from '../../src/chapters/paintedCountry/paintedCarModel.js';
import { FLOOR_Y, JUMP_VELOCITY } from '../../src/chapters/paintedCountry/carLayout.js';

const FULL = ACTION_HOLD_SECONDS + 0.05;
const wash = (car, id) => car.wash(id, FULL);
const paint = (car, id) => car.paint(id, FULL);
const types = (car) => car.drainEvents().map((event) => event.type);
const region = (car, id) => car.byId(id);

// Everything the player must eventually be true to walk from the spawn to the
// coupling: no seal left standing, no blot left standing, every bridge made.
const SOLVED = (car) =>
  car.state.regions.every((r) => {
    if (r.kind === KIND.SEAL) return r.washed;
    if (r.kind === KIND.BLOT) return !r.inked;
    if (r.kind === KIND.ROUTE) return r.painted;
    return true;
  });

test('paint is unlimited and the state hides no inventory', () => {
  const car = createPaintedCar();
  const snapshot = car.snapshot();

  assert.equal(snapshot.paintSupply, 'infinite');
  assert.equal('brush' in snapshot, false);
  assert.equal('pigment' in snapshot, false);
  assert.equal('coverage' in snapshot, false);

  // Painting every route in the car never depletes anything.
  ['route-a', 'route-b', 'route-c'].forEach((id) => paint(car, id));
  assert.equal(car.snapshot().paintSupply, 'infinite');
  assert.ok(['route-a', 'route-b', 'route-c'].every((id) => car.isSolid(id)));
});

test('the whole puzzle is visible from the first frame — nothing is hidden', () => {
  const car = createPaintedCar();
  const live = car.snapshot().regions.filter((r) => r.live).map((r) => r.id);
  // Every seal and every route is actionable immediately; only the blots wait,
  // and they wait because they do not exist yet, not because they are secret.
  assert.deepEqual(live.sort(), [
    'route-a', 'route-b', 'route-c', 'seal-a', 'seal-c1', 'seal-c2', 'seal-b',
  ].sort());
  // Every drain channel is declared, so the scene can draw the consequence.
  assert.equal(region(car, 'seal-a').drainsTo, 'sump-a');
  assert.equal(region(car, 'seal-b').drainsTo, 'blot-b');
  assert.equal(region(car, 'blot-b').drainsTo, 'route-b');
  assert.equal(region(car, 'seal-c1').drainsTo, 'route-c');
  assert.equal(region(car, 'seal-c2').drainsTo, 'blot-c');
  assert.equal(region(car, 'blot-c').drainsTo, 'route-c');
});

test('bay A teaches the rule and cannot be failed', () => {
  const car = createPaintedCar();
  assert.equal(car.isBlocking('seal-a'), true);

  // Painting the bridge first is harmless here: this seal drains to a grate,
  // not across the route. The teaching bay has no wrong order.
  paint(car, 'route-a');
  car.drainEvents();
  wash(car, 'seal-a');

  assert.deepEqual(types(car), ['seal-washed', 'ink-drained']);
  assert.equal(car.isBlocking('seal-a'), false);
  assert.equal(car.isSolid('route-a'), true, 'the bridge survives — nothing drains onto it');
});

test('bay B: a washed seal becomes a standing blot, and the blot drains into the open trough', () => {
  const car = createPaintedCar();

  wash(car, 'seal-b');
  assert.deepEqual(types(car), ['seal-washed', 'blot-formed']);
  assert.equal(car.isBlocking('blot-b'), true, 'the ink now stands in the way');
  assert.equal(car.isLive('blot-b'), true);

  wash(car, 'blot-b');
  assert.deepEqual(types(car), ['blot-washed', 'ink-drained']);
  assert.equal(car.isBlocking('blot-b'), false);

  paint(car, 'route-b');
  assert.equal(car.isSolid('route-b'), true);
});

test('bay B trap: painting the bridge before clearing the blot dissolves the bridge', () => {
  const car = createPaintedCar();
  wash(car, 'seal-b');
  paint(car, 'route-b');
  assert.equal(car.isSolid('route-b'), true);
  car.drainEvents();

  wash(car, 'blot-b');

  assert.deepEqual(types(car), ['blot-washed', 'route-dissolved', 'ink-drained']);
  assert.equal(car.isSolid('route-b'), false, 'the ink took the bridge with it');
  assert.equal(region(car, 'route-b').progress, 0, 'a dissolved route starts clean, not half-made');

  // And it is only ever a repaint — never a dead end.
  paint(car, 'route-b');
  assert.equal(car.isSolid('route-b'), true);
});

test('bay C is solved by emptying both seals through the hole before painting', () => {
  const car = createPaintedCar();

  wash(car, 'seal-c1'); // channel runs the length of the bay into the open hole
  assert.deepEqual(types(car), ['seal-washed', 'ink-drained']);

  wash(car, 'seal-c2'); // this one drops its ink at the player's feet
  assert.deepEqual(types(car), ['seal-washed', 'blot-formed']);
  assert.equal(car.isBlocking('blot-c'), true);

  wash(car, 'blot-c');
  assert.deepEqual(types(car), ['blot-washed', 'ink-drained']);

  paint(car, 'route-c');
  assert.equal(car.isSolid('route-c'), true);
  assert.equal(car.enterExit(), true);
  assert.equal(car.snapshot().complete, true);
});

test('bay C trap: a bridge painted too early is taken by the next wash', () => {
  const car = createPaintedCar();
  wash(car, 'seal-c2'); // forms the blot
  paint(car, 'route-c'); // tempting, and wrong
  car.drainEvents();

  wash(car, 'blot-c');
  assert.deepEqual(types(car), ['blot-washed', 'route-dissolved', 'ink-drained']);
  assert.equal(car.isSolid('route-c'), false);

  // seal-c1 drains straight onto the same route, so it punishes the same haste.
  paint(car, 'route-c');
  car.drainEvents();
  wash(car, 'seal-c1');
  assert.deepEqual(types(car), ['seal-washed', 'route-dissolved', 'ink-drained']);
  assert.equal(car.isSolid('route-c'), false);
});

test('two lots of ink in one basin stay one blot, and never a dead end', () => {
  const car = createPaintedCar();
  wash(car, 'seal-c2');
  assert.equal(region(car, 'blot-c').inked, true);
  // Force a second delivery into the same basin.
  car.drainEvents();
  wash(car, 'seal-c1');
  const events = types(car);
  assert.ok(!events.includes('blot-formed'), 'seal-c1 drains to the route, not the basin');
  assert.equal(region(car, 'blot-c').inked, true);
  wash(car, 'blot-c');
  assert.equal(car.isBlocking('blot-c'), false);
});

test('the wrong tool does nothing and never consumes or clears progress', () => {
  const car = createPaintedCar();
  car.paint('seal-a', ACTION_HOLD_SECONDS);
  assert.equal(region(car, 'seal-a').progress, 0);
  assert.equal(car.isBlocking('seal-a'), true);
  assert.deepEqual(car.drainEvents(), [
    { type: 'wrong-tool', id: 'seal-a', expected: ACTION.WASH, used: ACTION.PAINT },
  ]);

  car.wash('route-a', ACTION_HOLD_SECONDS);
  assert.equal(region(car, 'route-a').progress, 0);
  assert.deepEqual(car.drainEvents(), [
    { type: 'wrong-tool', id: 'route-a', expected: ACTION.PAINT, used: ACTION.WASH },
  ]);
});

test('a partial gesture is kept, and dead marks cannot be targeted', () => {
  const car = createPaintedCar();
  car.wash('seal-a', ACTION_HOLD_SECONDS * 0.4);
  assert.ok(region(car, 'seal-a').progress > 0 && region(car, 'seal-a').progress < 1);
  car.wash('seal-a', ACTION_HOLD_SECONDS * 0.7);
  assert.equal(region(car, 'seal-a').washed, true);

  // A washed seal, a made route and an empty basin are all inert.
  assert.equal(car.isLive('seal-a'), false);
  assert.equal(car.regionAt(324, 338), null);
  assert.equal(car.isLive('blot-b'), false, 'an empty basin is not a target');
  paint(car, 'route-a');
  assert.equal(car.isLive('route-a'), false);
});

test('the generous hit area picks the intended target', () => {
  const car = createPaintedCar();
  assert.equal(car.regionAt(258, 338)?.id, 'seal-a', 'the seal has a forgiving edge target');
  assert.equal(car.regionAt(500, 456)?.id, 'route-a', 'the route has a forgiving lower target');
  wash(car, 'seal-b');
  assert.equal(car.regionAt(1338, 390)?.id, 'blot-b', 'a formed blot is targetable');
});

test('no ordering of legal moves can strand the player', () => {
  // Explore every reachable configuration of the car, then prove each one can
  // still be finished. This is the promise the chapter makes: the puzzle is
  // about order, and a wrong order only ever costs you a repeat.
  const keyOf = (car) =>
    car.state.regions.map((r) => `${+r.washed}${+r.painted}${+r.inked}`).join('');

  const replay = (seq) => {
    const car = createPaintedCar();
    seq.forEach(([id, action]) => car.act(id, action, FULL));
    return car;
  };
  const liveMoves = (car) =>
    car.state.regions.filter((r) => car.isLive(r.id)).map((r) => [r.id, r.action]);

  const seen = new Map([[keyOf(createPaintedCar()), []]]);
  const queue = [[]];
  while (queue.length) {
    const seq = queue.shift();
    const car = replay(seq);
    for (const move of liveMoves(car)) {
      const next = seq.concat([move]);
      const key = keyOf(replay(next));
      if (seen.has(key)) continue;
      seen.set(key, next);
      queue.push(next);
    }
  }

  assert.ok(seen.size > 40, `expected a real state space, explored ${seen.size}`);

  // From every reachable state: wash everything still standing, which pushes
  // all remaining ink through the holes, then make every bridge.
  for (const [key, seq] of seen) {
    const car = replay(seq);
    for (let pass = 0; pass < 4; pass += 1) {
      car.state.regions
        .filter((r) => (r.kind === KIND.SEAL && !r.washed) || (r.kind === KIND.BLOT && r.inked))
        .forEach((r) => wash(car, r.id));
    }
    car.state.regions
      .filter((r) => r.kind === KIND.ROUTE && !r.painted)
      .forEach((r) => paint(car, r.id));
    assert.ok(SOLVED(car), `state ${key} could not be finished`);
  }
});

test('nothing that blocks the way can simply be jumped over', () => {
  // A blot short enough to vault turns the whole puzzle into an optional
  // detour, which is exactly how the first build of this mechanic broke.
  const GRAVITY = 1700; // arcade gravity, set in paintedCountry-main.js
  const rise = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);
  const feetAtApex = FLOOR_Y - rise;

  createPaintedCar()
    .state.regions.filter((r) => r.kind === KIND.BLOT || r.kind === KIND.SEAL)
    .forEach((mark) => {
      assert.ok(
        mark.y < feetAtApex,
        `${mark.id} top is y=${mark.y}; a jump lifts the feet to y=${feetAtApex.toFixed(1)}, so it can be cleared`,
      );
    });
});

test('falling costs nothing but the walk back', () => {
  const car = createPaintedCar();
  wash(car, 'seal-a');
  paint(car, 'route-a');
  car.fell();

  assert.equal(car.snapshot().falls, 1);
  assert.equal(car.isSolid('route-a'), true);
  assert.equal(region(car, 'seal-a').washed, true);
});
