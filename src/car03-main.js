// Car 03 // independent entry point.
// Builds a Phaser game whose only scene is PresentCityScene. Does not
// touch src/main.js, src/scenes/*, or any Car 01 / Car 02 code.

import Phaser from 'phaser';
import { GAME_W, GAME_H, GRAVITY } from './constants.js';
import PresentCityScene from './cars/presentCity/PresentCityScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#03050a',
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: GRAVITY },
      debug: false,
    },
  },
  // NONE keeps the canvas at the literal 960×600 so the page chrome
  // and Phaser agree on the size. The browser's CSS scales the parent
  // #game div for layout, but Phaser itself never re-flows.
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  scene: [PresentCityScene],
};

const game = new Phaser.Game(config);

game.canvas.setAttribute('tabindex', '0');
game.canvas.setAttribute('role', 'application');
game.canvas.setAttribute('aria-label', 'CAR 03 game canvas');
game.canvas.addEventListener('pointerdown', () => game.canvas.focus());

window.game = game;
window.__CAR03__ = { game };

// The PresentCityScene hooks `window.render_game_to_text` itself.
export default game;
