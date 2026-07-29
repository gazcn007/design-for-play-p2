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
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene, HudScene],
};

const game = new Phaser.Game(config);

// Let the game reliably claim keyboard focus after a player clicks it. Canvas
// is not focusable by default in every browser, which can make a perfectly
// working Phaser input map feel unresponsive when the page first opens.
game.canvas.setAttribute('tabindex', '0');
game.canvas.setAttribute('role', 'application');
game.canvas.setAttribute('aria-label', 'Nightfall game canvas');
game.canvas.addEventListener('pointerdown', () => game.canvas.focus());

// Handy in the devtools console:
//   game.scene.getScene('Game').player
//   game.scene.getScene('Game').physics.world.drawDebug = true
window.game = game;

// Read-only diagnostics for automated smoke tests and content-pipeline QA.
// This does not advance or mutate gameplay state.
const renderGameToText = () => {
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
          tutorialArt: scene.tutorialTrainRoomsArt?.getState() ?? scene.tutorialCarArt?.getState() ?? null,
          tutorial: {
            powerState: scene.registry.get('tutorialPowerState'),
            powerRestored: scene.registry.get('tutorialPowerRestored'),
            exitLocked: !scene.registry.get('tutorialPowerRestored'),
            objective: scene.registry.get('tutorialPowerRestored')
              ? 'enter the next car'
              : scene.timetablePuzzle
                ? scene.timetablePuzzle.objectiveText()
              : !scene.tutorialPuzzle?.briefed
                ? 'speak with the conductor'
              : scene.tutorialPuzzle?.phase === 'recording'
                ? 'record yourself standing on the PAST pressure plate'
                : scene.tutorialPuzzle?.phase === 'playback'
                  ? !scene.tutorialPuzzle.routeActive
                    ? scene.getTutorialStage()?.underfloor
                      ? 'look below and align with the remembered shadow at both resonance columns'
                      : 'trace the remembered pulse to the first wrong route'
                    : 'activate PRESENT while the routed past self holds PAST'
                  : 'start the memory recorder',
            timetablePuzzle: scene.timetablePuzzle && scene.tutorialPuzzle
              ? {
                  phase: scene.tutorialPuzzle.phase,
                  briefed: scene.tutorialPuzzle.briefed,
                  stageIndex: scene.tutorialPuzzle.stageIndex,
                  stageId: scene.getTutorialStage()?.id,
                  stageComplete: scene.tutorialPuzzle.stageComplete,
                  queue: scene.tutorialPuzzle.queue,
                  solutionLength: scene.getTutorialStage()?.solution?.length ?? 0,
                  executionStep: scene.tutorialPuzzle.executionStep,
                  activeCommand: scene.tutorialPuzzle.activeCommand,
                  echoRecorded: scene.tutorialPuzzle.echoRecorded,
                  echoSyncIndex: scene.tutorialPuzzle.echoSyncIndex,
                  echoWindowRemainingMs: Math.max(
                    0,
                    (scene.tutorialPuzzle.echoWindowUntil ?? 0) - (scene.time?.now ?? 0),
                  ),
                  lookingDown: Boolean(scene.tutorialLookingDown),
                  pressure: Math.round(scene.tutorialPuzzle.pressure ?? 0),
                  pressureBand: scene.getTutorialStage()?.pressureHold
                    ? [
                        scene.getTutorialStage().pressureHold.bandLow,
                        scene.getTutorialStage().pressureHold.bandHigh,
                      ]
                    : null,
                  pressureVenting: Boolean(scene.tutorialPuzzle.pressureVenting),
                  pressureBraked: Boolean(scene.tutorialPuzzle.pressureBraked),
                  pressureSettled: Boolean(scene.tutorialPuzzle.pressureSettled),
                  echoGateIndex: scene.tutorialPuzzle.echoGateIndex ?? 0,
                  echoGatesCleared: scene.tutorialPuzzle.echoGatesCleared ?? [],
                  echoGateNeeded:
                    scene.getTutorialStage()?.echoGates?.[
                      scene.tutorialPuzzle.echoGateIndex ?? 0
                    ]?.command ?? null,
                  echoAtValve: Boolean(scene.tutorialPuzzle.echoAtValve),
                }
              : null,
            echoPuzzle: !scene.timetablePuzzle && scene.tutorialPuzzle
              ? {
                  phase: scene.tutorialPuzzle.phase,
                  briefed: scene.tutorialPuzzle.briefed,
                  stageIndex: scene.tutorialPuzzle.stageIndex,
                  stageId: scene.getTutorialStage()?.id,
                  stageComplete: scene.tutorialPuzzle.stageComplete,
                  recordedFrames: scene.tutorialPuzzle.frames.length,
                  pastActive: scene.tutorialPuzzle.pastActive,
                  routeActive: scene.tutorialPuzzle.routeActive,
                  poweredSegments: scene.tutorialPuzzle.poweredSegments,
                  relayStates: scene.tutorialPuzzle.relayStates,
                  syncAligned: scene.tutorialPuzzle.syncAligned,
                  syncHotIndex: scene.tutorialPuzzle.syncHotIndex,
                  presentActive: scene.tutorialPuzzle.presentActive,
                  serviceActive: scene.tutorialPuzzle.serviceActive,
                  anomalyActive: scene.tutorialPuzzle.anomalyActive,
                  lookingDown: Boolean(scene.tutorialLookingDown),
                }
              : null,
          },
        }
      : null,
    player: player
      ? {
          x: Math.round(player.x),
          y: Math.round(player.y),
          velocityX: Math.round(player.body?.velocity.x ?? 0),
          velocityY: Math.round(player.body?.velocity.y ?? 0),
          lane: player.lane,
          animation: player.visualState,
          frozen: Boolean(player.frozen),
        }
      : null,
    interaction: scene
      ? {
          active: scene.activeInteractable?.def?.id ?? scene.activeNPC?.def?.id ?? null,
          dialogueOpen: Boolean(scene.dialogueState),
          promptVisible: Boolean(scene.prompt?.visible),
          promptText: scene.prompt?.visible ? scene.prompt.text : null,
        }
      : null,
    cinematic: scene
      ? {
          prologueTransitionActive: Boolean(scene.prologueTransitionActive),
          departureScroll: Math.round(scene.departureScroll ?? 0),
          tutorialCompletionReveal: Boolean(scene.tutorialCameraCinematic),
          cameraCenterX: Math.round(scene.cameras?.main?.midPoint?.x ?? 0),
          cameraCenterY: Math.round(scene.cameras?.main?.midPoint?.y ?? 0),
        }
      : null,
    performance: {
      fps: Math.round(game.loop.actualFps || 0),
      timeScale: scene?.time?.timeScale ?? 1,
    },
  });
};
window.render_game_to_text = renderGameToText;

// Mirror the same compact state into a hidden DOM node. Some embedded-browser
// test surfaces isolate page globals, but can still read authored DOM safely.
const gameStateOutput = document.createElement('output');
gameStateOutput.id = 'game-state';
gameStateOutput.dataset.testid = 'game-state';
gameStateOutput.hidden = true;
document.body.appendChild(gameStateOutput);
const syncGameStateOutput = () => {
  gameStateOutput.textContent = renderGameToText();
};
syncGameStateOutput();
window.setInterval(syncGameStateOutput, 120);

export default game;
