import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { CITY_MODELS } from '../../src/cars/presentCity3d/city3dConfig.js';

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EXPECTED_PROP_IDS = [
  'queue-dispenser',
  'produce-scale',
  'porter-handcart',
  'receipt-device',
  'queue-stanchion',
  'clerk-stamp-machine',
  'crosswalk-signal',
  'fountain-bench',
  'pa-speaker',
  'night-ticket-reader',
];

describe('Chapter 3 real-time narrative prop contract', () => {
  it('registers ten semantic props alongside seven unique landmarks', () => {
    const props = CITY_MODELS.filter((spec) => spec.category === 'prop');
    const unique = CITY_MODELS.filter((spec) => !spec.cloneOf);
    assert.equal(props.length, 10);
    assert.equal(unique.length, 17);
    assert.deepEqual(props.map((spec) => spec.id), EXPECTED_PROP_IDS);
    for (const spec of props) {
      assert.ok(spec.role, `${spec.id} must name its narrative role`);
      assert.equal(spec.alignToGround, true, `${spec.id} must use geometry-bound placement`);
    }
  });

  it('ships every optimized GLB below the runtime size ceiling', async () => {
    const props = CITY_MODELS.filter((spec) => spec.category === 'prop');
    for (const spec of props) {
      const path = `${PROJECT_ROOT}public/assets/chapter03-3d/models/${spec.file}`;
      const info = await stat(path);
      assert.ok(info.size > 100_000, `${spec.file} should be a real embedded model`);
      assert.ok(info.size < 1_100_000, `${spec.file} exceeds the 1.1 MB prop ceiling`);
    }
  });

  it('keeps ground furniture collidable while mounted audio stays overhead', () => {
    const props = CITY_MODELS.filter((spec) => spec.category === 'prop');
    const collidable = props.filter((spec) => spec.collision).map((spec) => spec.id);
    assert.deepEqual(collidable, EXPECTED_PROP_IDS.filter((id) => id !== 'pa-speaker'));
    const speaker = props.find((spec) => spec.id === 'pa-speaker');
    assert.equal(speaker.support?.type, 'pole');
    assert.ok(speaker.position[1] > 4);
  });
});
