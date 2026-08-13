import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sceneUrl = new URL('../../src/chapters/paintedCountry/PaintedCountryScene.js', import.meta.url);
const sceneSource = await readFile(sceneUrl, 'utf8');

test('chapter 4 body draws Butch in code instead of loading the final four-frame asset', () => {
  assert.match(sceneSource, /drawFigure\(\)/);
  assert.match(sceneSource, /const g = this\.figure/);
  assert.doesNotMatch(sceneSource, /latestButch|frame-[0-3]\.png/);
});

test('the latest code-drawn figure aims its brush at the active pointer', () => {
  assert.match(sceneSource, /const pointer = this\.input\.activePointer/);
  assert.match(sceneSource, /Math\.atan2\(pointer\.worldY - shoulderY, pointer\.worldX - x\)/);
  assert.match(sceneSource, /g\.lineTo\(tipX, tipY\)/);
  assert.match(sceneSource, /g\.fillCircle\(tipX, tipY, 4\.6\)/);
});
