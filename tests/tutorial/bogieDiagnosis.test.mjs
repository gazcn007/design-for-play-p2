// Phase V READ THE BOGIE — pure-logic tests (SYSTEM ARC LOCK §5).
// The contradiction and the Gate 0 repair chain are locked here against the
// frozen bogieSnapshot, the shared airNetwork and the Phase-IV-locked motor.

import test from 'node:test';
import assert from 'node:assert/strict';

import { createAirNetwork } from '../../src/tutorial/phases/airNetwork.js';
import { createMotorAdhesion } from '../../src/tutorial/phases/motorAdhesion.js';
import { createBogieDiagnosis } from '../../src/tutorial/phases/bogieDiagnosis.js';

function rig() {
  const airNetwork = createAirNetwork();
  const motor = createMotorAdhesion();
  const phase = createBogieDiagnosis({ airNetwork, motor });
  return { airNetwork, motor, phase };
}

const LOAD = { trolleyX: 1, suspensionHealth: 1 };

function step(phase, seconds, dtMs = 50) {
  const iterations = Math.round((seconds * 1000) / dtMs);
  for (let i = 0; i < iterations; i += 1) phase.update(dtMs, LOAD);
}

test('one TEST, one contradiction: the healthy bogie turns, the faulty one does not — with every upstream signal normal', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('test');
  step(phase, 2);
  const snap = phase.snapshot();
  // Upstream evidence is genuinely normal on BOTH sides.
  assert.equal(snap.motor.energized, true);
  assert.equal(snap.motor.wheelState, 'biting'); // Phase IV load persists
  assert.equal(snap.front.contactorClosed, true);
  assert.equal(snap.rear.contactorClosed, true);
  assert.ok(snap.rear.linePressure >= 60); // the release line is charged
  assert.ok(snap.rear.axleLoad > 0.5);
  // And yet.
  assert.equal(snap.front.brakeReleased, true);
  assert.equal(snap.front.wheelTurning, true);
  assert.equal(snap.rear.brakeReleased, false); // seized piston stays clamped
  assert.equal(snap.rear.wheelTurning, false);
  assert.equal(snap.rear.fault, 'brake-actuator-seized');
  assert.equal(snap.stageComplete, false);
});

test('repair refuses without the full Gate 0 chain, naming each missing condition', () => {
  const { phase } = rig();
  phase.enter();

  phase.interact('repair'); // nothing done at all
  let bounce = phase.drainEvents().find((e) => e.type === 'control-bounce');
  assert.equal(bounce.reason, 'not-isolated');

  phase.interact('brake-isolate');
  phase.interact('repair'); // isolated but still charged
  bounce = phase.drainEvents().find((e) => e.type === 'control-bounce');
  assert.equal(bounce.reason, 'still-pressurized');

  phase.setVentHeld(true);
  step(phase, 2.5); // 100 -> 0 at 55/s
  phase.setVentHeld(false);
  phase.interact('repair'); // flat but no service pin
  bounce = phase.drainEvents().find((e) => e.type === 'control-bounce');
  assert.equal(bounce.reason, 'no-service-lock');

  assert.equal(phase.snapshot().rear.repaired, false);
});

test('the service pin refuses to seat against a live or charged line', () => {
  const { phase } = rig();
  phase.enter();
  assert.equal(phase.interact('service-lock'), false);
  let bounce = phase.drainEvents().find((e) => e.type === 'control-bounce');
  assert.equal(bounce.reason, 'line-live');

  phase.interact('brake-isolate');
  assert.equal(phase.interact('service-lock'), false); // still pressurized
  bounce = phase.drainEvents().find((e) => e.type === 'control-bounce');
  assert.equal(bounce.reason, 'line-live');
});

test('the full chain completes: isolate -> vent -> pin -> repair -> unpin -> restore -> TEST turns both bogies', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('test');
  step(phase, 1.5);
  assert.equal(phase.snapshot().rear.wheelTurning, false);

  phase.interact('test'); // TEST off for the repair
  phase.interact('brake-isolate');
  phase.setVentHeld(true);
  step(phase, 2.5);
  phase.setVentHeld(false);
  // Fail-safe: as the line dies the clamp bites. That is the safe state.
  assert.equal(phase.snapshot().rear.brakeReleased, false);
  assert.equal(phase.snapshot().brake.pressure, 0);

  phase.interact('service-lock');
  assert.equal(phase.snapshot().rear.serviceLockEngaged, true);
  phase.interact('repair');
  assert.equal(phase.snapshot().rear.repaired, true);
  phase.interact('service-lock'); // withdraw the pin
  assert.equal(phase.snapshot().rear.serviceLockEngaged, false);
  phase.interact('brake-isolate'); // restore the supply
  step(phase, 5); // recharge to >= release pressure
  assert.ok(phase.snapshot().brake.pressure >= 60);

  phase.interact('test');
  step(phase, 2);
  const snap = phase.snapshot();
  assert.equal(snap.rear.brakeReleased, true);
  assert.equal(snap.rear.wheelTurning, true);
  assert.equal(snap.front.wheelTurning, true);
  assert.equal(snap.stageComplete, true);
  const types = phase.drainEvents().map((e) => e.type);
  assert.ok(types.includes('bogie-repaired'));
  assert.ok(types.includes('stage-complete'));
});

test('the healthy side keeps working while the faulty branch is stripped', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('test');
  step(phase, 1.5);
  phase.interact('brake-isolate');
  phase.setVentHeld(true);
  step(phase, 2.5);
  phase.setVentHeld(false);
  // Mid-repair, motor still energized: the healthy bogie reads the header,
  // not the stripped branch, so it never stops turning.
  const snap = phase.snapshot();
  assert.equal(snap.front.wheelTurning, true);
  assert.equal(snap.brake.pressure, 0);
  assert.equal(snap.stageComplete, false); // completion needs the REAR bogie
});

test('repairing without restoring the supply cannot complete (fail-safe stays clamped)', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('brake-isolate');
  phase.setVentHeld(true);
  step(phase, 2.5);
  phase.setVentHeld(false);
  phase.interact('service-lock');
  phase.interact('repair');
  phase.interact('service-lock');
  // No restore: the line is flat, the brake is applied even though the
  // piston is free. A repaired actuator with no release pressure still
  // does not turn.
  phase.interact('test');
  step(phase, 2);
  assert.equal(phase.snapshot().rear.wheelTurning, false);
  assert.equal(phase.snapshot().stageComplete, false);
});

test('stage-complete is one-shot and reset restores the contradiction', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('brake-isolate');
  phase.setVentHeld(true);
  step(phase, 2.5);
  phase.setVentHeld(false);
  phase.interact('service-lock');
  phase.interact('repair');
  phase.interact('service-lock');
  phase.interact('brake-isolate');
  step(phase, 5);
  phase.interact('test');
  step(phase, 2);
  assert.equal(phase.snapshot().stageComplete, true);
  step(phase, 1);
  phase.drainEvents();
  step(phase, 1);
  assert.ok(!phase.drainEvents().some((e) => e.type === 'stage-complete'));

  phase.reset();
  phase.enter();
  phase.interact('test');
  step(phase, 1.5);
  const snap = phase.snapshot();
  assert.equal(snap.rear.wheelTurning, false);
  assert.equal(snap.front.wheelTurning, true);
  assert.equal(snap.stageComplete, false);
});
