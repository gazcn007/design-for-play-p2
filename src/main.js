import Phaser from 'phaser';
import { GAME_W, GAME_H, GRAVITY } from './constants.js';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import HudScene from './scenes/HudScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#03050a',
  render: {
    antialias: true,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: GRAVITY },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene, HudScene],
};

const game = new Phaser.Game(config);

// Handy in the devtools console:
//   game.scene.getScene('Game').player
//   game.scene.getScene('Game').physics.world.drawDebug = true
window.game = game;

// Read-only diagnostics for automated smoke tests and content-pipeline QA.
// This does not advance or mutate gameplay state.
window.render_game_to_text = () => {
  const scene = game.scene.getScene('Game');
  const player = scene?.player;
  return JSON.stringify({
    coordinateSystem: 'origin top-left; +x right; +y down; world units are pixels',
    scene: scene?.sys?.isActive() ? 'Game' : 'Boot',
    world: scene
      ? {
          index: scene.activeWorldIndex,
          previewIndex: scene.previewWorldIndex,
          loadedAssets: scene.worldAssetLoader?.loadedAssetIds() ?? [],
          backdropChunks: scene.backdropChunks?.length ?? 0,
        }
      : null,
    player: player
      ? {
          x: Math.round(player.x),
          y: Math.round(player.y),
          velocityX: Math.round(player.body?.velocity.x ?? 0),
          velocityY: Math.round(player.body?.velocity.y ?? 0),
          lane: player.lane,
        }
      : null,
  });
};

export default game;
