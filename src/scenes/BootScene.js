import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';
import { buildAnimations, buildTextures } from '../textures.js';
import { STORY_WORLDS } from '../story.js';
import { queueWorldAsset, resolvePreviewWorldIndex } from '../worlds/worldAssets.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Only the initial panorama is queued here. Adjacent worlds are streamed
    // by GameScene so the browser never uploads all source panoramas to the GPU
    // at once.
    const bar = this.add.graphics().setDepth(10);
    const label = this.add
      .text(GAME_W / 2, GAME_H / 2 + 26, 'loading the first memory', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '13px',
        color: '#4a545f',
      })
      .setOrigin(0.5);

    this.load.on('progress', (p) => {
      bar.clear();
      bar.lineStyle(1, 0x2a3038, 1);
      bar.strokeRect(GAME_W / 2 - 110, GAME_H / 2 - 6, 220, 8);
      bar.fillStyle(0x8e1f24, 1);
      bar.fillRect(GAME_W / 2 - 109, GAME_H / 2 - 5, 218 * p, 6);
    });

    this.load.once('complete', () => {
      bar.destroy();
      label.destroy();
    });

    const previewIndex = resolvePreviewWorldIndex(STORY_WORLDS);
    const initialWorld = STORY_WORLDS[previewIndex ?? 0];
    queueWorldAsset(this.load, initialWorld.texture);
  }

  create() {
    buildTextures(this);
    buildAnimations(this);
    this.scene.start('Game');
  }
}
