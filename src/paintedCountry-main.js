// Chapter 4 // THE PAINTED COUNTRY — standalone entry.
//
// Named for identity rather than sequence order, per the guardrail that the car
// order may still change. Touches no other chapter's code.

import Phaser from 'phaser';
import { PaintedCountryScene, PAINTED_COUNTRY_VIEW } from './chapters/paintedCountry/PaintedCountryScene.js';
import { PAPER_CSS } from './chapters/paintedCountry/paperPalette.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: PAINTED_COUNTRY_VIEW.w,
  height: PAINTED_COUNTRY_VIEW.h,
  backgroundColor: PAPER_CSS.sheet,
  render: {
    // Deliberately NOT pixelArt. Every other car crushes to a hard pixel grid;
    // this one is drawn media, and a paper edge needs its antialiasing.
    antialias: true,
    roundPixels: false,
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: 1700 }, debug: false } },
  scene: [PaintedCountryScene],
});

// The brush is aimed with the pointer, so the canvas has to be able to take
// focus and swallow the context menu.
game.canvas.setAttribute('tabindex', '0');
game.canvas.addEventListener('pointerdown', () => game.canvas.focus());
game.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

window.game = game;

window.render_game_to_text = () => {
  const scene = game.scene.getScene('PaintedCountry');
  return JSON.stringify(
    scene?.sys?.isActive() ? scene.textState() : { scene: 'booting' },
  );
};

export default game;
