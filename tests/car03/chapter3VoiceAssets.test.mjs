import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CHAPTER03_VOICE_ASSET_COUNT,
  chapter03VoiceAssetFor,
} from '../../src/cars/presentCity3d/generated/chapter03VoiceAssets.js';

describe('Chapter 3 generated voice assets', () => {
  it('ships the complete locked Chapter 3 voice pass', () => {
    assert.equal(CHAPTER03_VOICE_ASSET_COUNT, 486);
  });

  it('maps an exact speaker and subtitle to its runtime file', () => {
    assert.deepEqual(
      chapter03VoiceAssetFor('BUTCH', 'Echo City. The first place on this line where anyone reported seeing Mara.'),
      {
        lineId: 'CH03_BUTCH_0011',
        url: './assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0011.ogg',
      },
    );
  });

  it('leaves unvoiced interface text silent', () => {
    assert.equal(chapter03VoiceAssetFor('SYSTEM', 'Continue'), null);
  });
});
