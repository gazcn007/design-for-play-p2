import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const runtime = fs.readFileSync(
  new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url),
  'utf8',
);

test('Chapter 3 sleep edits hold a silent five-second blackout in both directions', () => {
  assert.match(runtime, /const SLEEP_BLACKOUT_MS = 5000/);
  assert.match(runtime, /}, SLEEP_BLACKOUT_MS\);/);
  assert.match(runtime, /SLEEP_BLACKOUT_MS - HOTEL_STAGE_TRANSITION_MS/);
  assert.doesNotMatch(runtime, /car03Audio\.nightmareStorm\(/);
  assert.doesNotMatch(runtime, /car03Audio\.morningWake\(/);
});

test('an uncollected Echo Stone becomes a physical morning campfire pickup', () => {
  assert.match(runtime, /makeMorningCampfireEchoStone/);
  assert.match(runtime, /id: 'morning-campfire-echo-stone'/);
  assert.match(runtime, /state\.morningStarted/);
  assert.match(runtime, /!magicStoneSnapshot\(\)\.collected\.includes\('chapter-3'\)/);
  assert.match(runtime, /collectMagicStone\('chapter-3'\)/);
  assert.match(runtime, /source: this\.model\.snapshot\(\)\.morningStarted\s*\? 'morning-campfire-physical-pickup'/);
});
