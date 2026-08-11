import Phaser from 'phaser';
import { LabyrinthScene } from './LabyrinthScene.js';
import { VIEW } from './labyrinthData.js';
import { LABYRINTH_CHAPTER05_CONTRACT } from './chapter05LabyrinthContract.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.w,
  height: VIEW.h,
  backgroundColor: '#07070a',
  render: { preserveDrawingBuffer: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [LabyrinthScene],
};

const game = new Phaser.Game(config);
window.game = game;

const embedded = new URLSearchParams(window.location.search).get('embedded') === '1';
const qaArtifact = new URLSearchParams(window.location.search).get('qa-artifact') === '1';
let completionSent = false;
if (embedded) {
  document.documentElement.classList.add('embedded');
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Escape') return;
    event.preventDefault();
    window.parent.postMessage({ type: LABYRINTH_CHAPTER05_CONTRACT.exitMessage }, window.location.origin);
  });
  window.setInterval(() => {
    const scene = game.scene.getScene('MuseumLabyrinth');
    // artifactTaken flips the instant the player takes the fragment; keying
    // the report on it (rather than the cosmetic state timer that follows)
    // keeps completion reliable even when the embedded tab is throttled.
    if (!completionSent && scene?.artifactTaken === true) {
      completionSent = true;
      window.parent.postMessage({ type: LABYRINTH_CHAPTER05_CONTRACT.completeMessage }, window.location.origin);
    }
  }, 200);
}

if (qaArtifact) {
  const probe = window.setInterval(() => {
    const scene = game.scene.getScene('MuseumLabyrinth');
    if (!scene?.playerSprite || scene.state !== 'playing') return;
    window.clearInterval(probe);
    scene.onWin();
    scene.revealArtifact();
  }, 50);
}

window.render_game_to_text = () => {
  const scene = game.scene.getScene('MuseumLabyrinth');
  if (!scene || !scene.renderToText) {
    return JSON.stringify({ chapter: 'chapter05-museum-labyrinth', booting: true });
  }
  return JSON.stringify(scene.renderToText());
};

export default game;
