// Car 03 // Repair B regression tests — E-gated duo establishment.
// Runs under `node --test` only. No Phaser, no DOM, no real timers.
//
// Design Lock §3 / §6.IV: the final duo is established ONLY by one
// contextual, edge-triggered E press. Alignment alone must never
// activate it; after establishment, live alignment decides whether
// the two-person pattern is currently valid; completion requires
// explicit establishment plus valid alignment; reset clears all of it.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createSocialStealthModel } from '../../src/cars/presentCity/socialStealthModel.js';

const DT = 16;

// Section IV end; completion requires player.x >= endX while duo.active.
const SECTION_IV_END_X = 4800;

function establishmentEvents(model) {
  return model.drainEvents().filter((e) => e.type === 'duo-established');
}

describe('Repair B: alignment alone never activates or completes the duo', () => {
  it('valid lane/facing/spacing/speed alignment without E stays inactive and cannot complete', () => {
    const m = createSocialStealthModel();
    // crowd-dispersal = the locked final state: section IV, alert
    // active, crowds scattered (no anchor possible), safe companion.
    m.applyQaWarp('crowd-dispersal');
    m.drainEvents();
    let crossedEnd = false;
    let minAlignment = Infinity;
    for (let s = 0; s < 400; s++) {
      m.update(DT, { right: true });
      const snap = m.snapshot();
      minAlignment = Math.min(minAlignment, snap.duo.alignment);
      assert.equal(snap.duo.established, false, `establishment must stay false without E (step ${s})`);
      assert.equal(snap.duo.active, false, `alignment alone must never activate the duo (step ${s})`);
      assert.equal(snap.complete, false, `completion must be impossible without the E press (step ${s})`);
      if (snap.player.x >= SECTION_IV_END_X) crossedEnd = true;
    }
    assert.ok(crossedEnd, 'the walk must actually cross the section IV end for this to be a real completion attempt');
    // Strength of the test: the alignment WAS valid the whole walk —
    // the safe companion matches lane/facing and chases to ~40px
    // spacing at matched speed — yet the duo never activated.
    assert.ok(minAlignment >= 3, `alignment should have been valid during the walk; min was ${minAlignment}`);
    assert.equal(m.eventLog().filter((e) => e.type === 'duo-established').length, 0);
  });
});

describe('Repair B: one valid E press establishes the duo and emits once', () => {
  it('E in the post-dispersal final state (unanchored) establishes and emits duo-established', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('crowd-dispersal');
    m.drainEvents();
    // The crowds are scattered and every anchor is dropped here — the
    // establishment route must NOT require an anchoredGroupId.
    assert.equal(m.snapshot().player.anchoredGroupId, null);
    m.pressInteract();
    assert.equal(establishmentEvents(m).length, 1, 'exactly one duo-established on the valid press');
    const snap = m.snapshot();
    assert.equal(snap.duo.established, true);
    assert.equal(snap.duo.active, true);
  });

  it('duo-established is emitted exactly once across repeated E presses', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('crowd-dispersal');
    m.drainEvents();
    m.pressInteract();
    establishmentEvents(m);
    m.pressInteract();
    m.pressInteract();
    assert.equal(establishmentEvents(m).length, 0, 'further presses are no-ops for establishment');
    assert.equal(
      m.eventLog().filter((e) => e.type === 'duo-established').length,
      1,
      'the permanent event log must contain exactly one duo-established',
    );
  });

  it('E also establishes from the duo-sync state (stale crowd anchor present)', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('duo-sync');
    m.drainEvents();
    m.pressInteract();
    assert.equal(establishmentEvents(m).length, 1);
    const snap = m.snapshot();
    assert.equal(snap.duo.established, true);
    assert.equal(snap.duo.active, true);
  });

  it('after establishment, live alignment keeps completion possible through the section end', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('crowd-dispersal');
    m.drainEvents();
    m.pressInteract();
    assert.equal(m.snapshot().duo.established, true);
    let completed = false;
    for (let s = 0; s < 400 && !completed; s++) {
      m.update(DT, { right: true });
      completed = m.snapshot().complete;
    }
    assert.ok(completed, 'established + aligned duo must complete past the section end');
  });
});

describe('Repair B: invalid / out-of-context E presses cannot establish', () => {
  it('E in section I (no alert, not final) does not establish', () => {
    const m = createSocialStealthModel();
    m.drainEvents();
    m.pressInteract();
    assert.equal(establishmentEvents(m).length, 0);
    assert.equal(m.snapshot().duo.established, false);
  });

  it('E in the final section before the alert does not establish', () => {
    const m = createSocialStealthModel();
    assert.equal(m.advanceSection('IV-two-is-a-crowd'), true);
    m.drainEvents();
    m.pressInteract();
    assert.equal(establishmentEvents(m).length, 0);
    const snap = m.snapshot();
    assert.equal(snap.alertActive, false);
    assert.equal(snap.duo.established, false);
  });

  it('E in the final section without the safe companion does not establish', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('companion-stranded');
    m.advanceSection('IV-two-is-a-crowd');
    m.drainEvents();
    m.pressInteract();
    assert.equal(establishmentEvents(m).length, 0);
    assert.equal(m.snapshot().duo.established, false);
  });

  it('alert active but companion never rescued: natural walk to section IV, E stays a no-op for duo', () => {
    const m = createSocialStealthModel();
    // Walk the whole car without pressing E: sections advance on
    // position, the alert fires in section IV, crowds scatter, and
    // the companion was never rescued (never became safe-with-player).
    let reachedAlert = false;
    for (let s = 0; s < 6000 && !reachedAlert; s++) {
      m.update(DT, { right: true });
      reachedAlert = m.snapshot().alertActive;
    }
    assert.ok(reachedAlert, 'a plain rightward walk must reach the section IV alert');
    const before = m.snapshot();
    assert.notEqual(before.companion.state, 'safe-with-player', 'precondition: companion must not be safe on this route');
    m.drainEvents();
    m.pressInteract();
    assert.equal(establishmentEvents(m).length, 0);
    assert.equal(m.snapshot().duo.established, false);
  });
});

describe('Repair B: broken alignment cannot complete', () => {
  it('established duo with a far-behind companion stays inactive and cannot complete past the end', () => {
    const m = createSocialStealthModel();
    const warped = m.applyQaWarp('duo-broken');
    assert.equal(warped.duo.established, true, 'fixture precondition: the E press already happened');
    m.drainEvents();
    let crossedEnd = false;
    for (let s = 0; s < 200; s++) {
      m.update(DT, { right: true });
      const snap = m.snapshot();
      assert.equal(snap.duo.active, false, `established-but-misaligned duo must be inactive (step ${s})`);
      assert.equal(snap.complete, false, `broken alignment cannot complete (step ${s})`);
      if (snap.player.x >= SECTION_IV_END_X) crossedEnd = true;
    }
    assert.ok(crossedEnd, 'the walk must cross the section end while alignment is broken');
    assert.equal(m.snapshot().duo.established, true, 'establishment persists; only the live pattern is invalid');
    assert.equal(m.snapshot().duo.alignment < 3, true, 'alignment must actually be below the threshold');
  });
});

describe('Repair B: reset clears establishment and completion state', () => {
  it('reset after establishment + completion clears duo and complete flags', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('crowd-dispersal');
    m.pressInteract();
    assert.equal(m.snapshot().duo.established, true);
    for (let s = 0; s < 400 && !m.snapshot().complete; s++) {
      m.update(DT, { right: true });
    }
    assert.equal(m.snapshot().complete, true, 'precondition: the run completed');
    m.reset();
    const snap = m.snapshot();
    assert.equal(snap.duo.established, false);
    assert.equal(snap.duo.active, false);
    assert.equal(snap.duo.alignment, 0);
    assert.equal(snap.complete, false);
    assert.equal(snap.alertActive, false);
  });

  it('no stale establishment survives reset into a replayed run', () => {
    const m = createSocialStealthModel();
    m.applyQaWarp('crowd-dispersal');
    m.pressInteract();
    m.reset();
    // Replay the exact same final-state walk WITHOUT pressing E.
    m.applyQaWarp('crowd-dispersal');
    for (let s = 0; s < 400; s++) {
      m.update(DT, { right: true });
      assert.equal(m.snapshot().complete, false, `stale establishment must not complete (step ${s})`);
    }
    assert.equal(m.snapshot().duo.established, false);
  });
});
