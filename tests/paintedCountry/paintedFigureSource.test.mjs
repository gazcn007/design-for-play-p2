import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sceneUrl = new URL('../../src/chapters/paintedCountry/PaintedCountryScene.js', import.meta.url);
const sceneSource = await readFile(sceneUrl, 'utf8');

test('chapter 4 body draws Butch in code instead of loading the final four-frame asset', () => {
  assert.match(sceneSource, /drawFigure\(\)/);
  assert.match(sceneSource, /updateFigurePose\(time\)/);
  assert.doesNotMatch(sceneSource, /latestButch|frame-[0-3]\.png/);
});

test('the code-drawn figure stays front-facing and exposes held paint and wash poses', () => {
  assert.match(sceneSource, /facing: 'front'/);
  assert.match(sceneSource, /leftButtonDown/);
  assert.match(sceneSource, /rightButtonDown/);
  assert.match(sceneSource, /Math\.sin\(time \/ 105\) \* 0\.065/);
  assert.match(sceneSource, /heldVerb: this\.figurePose === 'paint' \? 'PAINT'/);
});
