import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';
import { buildTextures } from '../textures.js';

// Vite resolves this to a hashed URL at build time and (with
// assetsInlineLimit: 0) always emits it as a real file rather than a data URI.
// Swapping the backdrop is a one-line change here — everything downstream
// measures the texture at runtime instead of assuming its dimensions.
import backdropUrl from '../assets/yharnam.png';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // The backdrop is the only real asset in the game, but it is a couple of
    // megabytes — enough to show a blank frame over a slow connection.
    const bar = this.add.graphics().setDepth(10);
    const label = this.add
      .text(GAME_W / 2, GAME_H / 2 + 26, 'entering yharnam', {
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

    this.load.image('backdrop', backdropUrl);
  }

  create() {
    buildTextures(this);
    this.scene.start('Game');
  }
}
