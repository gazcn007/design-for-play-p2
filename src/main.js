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
                  drum: scene.getTutorialStage()?.drum && scene.tutorialPuzzle.drum
                    ? {
                        key: scene.tutorialPuzzle.drumKey ?? 0,
                        running: scene.tutorialPuzzle.drum.running,
                        activeSlot: scene.tutorialPuzzle.drum.activeSlot,
                        waiting: scene.tutorialPuzzle.drum.waiting,
                        slots: scene.tutorialPuzzle.drum.slots.map((slot) => slot
                          ? { command: slot.command, status: slot.status }
                          : null),
                      }
                    : null,
                  // Section III. Built from the local-air-circuit snapshot so
                  // this text cannot drift from what the gauge is showing.
                  airCircuit: scene.getTutorialStage()?.airCircuit && scene.tutorialPuzzle.airCircuit
                    ? (() => {
                        const snap = scene.tutorialPuzzle.airCircuit.snapshot();
                        return {
                          pressure: Math.round(snap.door.pressure),
                          flow: snap.door.flow,
                          venting: snap.door.venting,
                          isolateClosed: snap.isolateClosed,
                          doorLatchReleased: snap.doorLatchReleased,
                          doorState: snap.doorState,
                          stageComplete: snap.stageComplete,
                          stalledOnSupply: snap.stalledOnSupply,
                        };
                      })()
                    : null,
                  // Phase IV. Built from the weight-transfer snapshot so this
                  // text cannot drift from what the bags, tilt and sparks are
                  // showing.
                  weightTransfer: scene.getTutorialStage()?.weightTransfer && scene.tutorialPuzzle.weightTransfer
                    ? (() => {
                        const snap = scene.tutorialPuzzle.weightTransfer.snapshot();
                        return {
                          suspensionPressure: Math.round(snap.suspension.pressure),
                          suspensionFlow: snap.suspension.flow,
                          suspensionHealth: Number(snap.suspensionHealth.toFixed(3)),
                          trolleyX: Number(snap.trolleyX.toFixed(3)),
                          grabbed: snap.grabbed,
                          energized: snap.motor.energized,
                          wheelState: snap.motor.wheelState,
                          current: Number(snap.motor.current.toFixed(3)),
                          driveLoad: Number(snap.motor.axleLoad[snap.motor.driveBogie].toFixed(3)),
                          carDisplacement: Number(snap.motor.carDisplacement.toFixed(3)),
                          stageComplete: snap.stageComplete,
                          trace: snap.trace,
                        };
                      })()
                    : null,
                  // Phase V (READ THE BOGIE). Built from the bogie-diagnosis
                  // snapshot so this text cannot drift from what the shoes,
                  // spokes, pin and gauge are showing.
                  bogieDiagnosis: scene.getTutorialStage()?.bogieService && scene.tutorialPuzzle.bogieDiagnosis
                    ? (() => {
                        const snap = scene.tutorialPuzzle.bogieDiagnosis.snapshot();
                        return {
                          brakePressure: Math.round(snap.brake.pressure),
                          brakeFlow: snap.brake.flow,
                          brakeIsolated: snap.brake.isolated,
                          frontWheelTurning: snap.front.wheelTurning,
                          frontBrakeReleased: snap.front.brakeReleased,
                          rearWheelTurning: snap.rear.wheelTurning,
                          rearBrakeReleased: snap.rear.brakeReleased,
                          rearServiceLockEngaged: snap.rear.serviceLockEngaged,
                          rearRepaired: snap.rear.repaired,
                          faultyBogie: snap.faultyBogie,
                          motorEnergized: snap.motor.energized,
                          motorWheelState: snap.motor.wheelState,
                          stageComplete: snap.stageComplete,
                        };
                      })()
                    : null,
                  // Section II. Every interlock snapshot field, straight from
                  // the live state machine, plus the most recent art event.
                  // Progress fields are rounded to 3 decimals for stable diffs.
                  contactInterlock: scene.timetablePuzzle?.contactLock
                    ? (() => {
                        const snap = scene.timetablePuzzle.contactLock.snapshot();
                        return {
                          entered: snap.entered,
                          destroyed: snap.destroyed,
                          latchClosed: snap.latchClosed,
                          preRelayProgress: Number(snap.preRelayProgress.toFixed(3)),
                          relayWaiting: snap.relayWaiting,
                          relayBridged: snap.relayBridged,
                          postRelayProgress: Number(snap.postRelayProgress.toFixed(3)),
                          signalProgress: Number(snap.signalProgress.toFixed(3)),
                          circuitEnergized: snap.circuitEnergized,
                          contactorClosed: snap.contactorClosed,
                          powerDelivered: snap.powerDelivered,
                          complete: snap.complete,
                          lastFault: snap.lastFault,
                          isComplete: scene.timetablePuzzle.contactLock.isComplete(),
                          lastEvent: scene.timetablePuzzle.contactArt?.getState().lastEvent ?? null,
                          qaFrozen: Boolean(scene.timetablePuzzle.contactQaFreeze),
                          prompts: scene.timetablePuzzle.contactArt?.getState().prompts ?? null,
                        };
                      })()
                    : null,
                  // Section II insertion (THE MISSING CONTACT): the relay
                  // cabinet's full wiring snapshot, the most recent close-up
                  // art event, and whether the close-up currently owns the
                  // screen.
                  relayCabinet: scene.timetablePuzzle?.relay
                    ? (() => {
                        const snap = scene.timetablePuzzle.relay.snapshot();
                        return {
                          ...snap,
                          lastEvent: scene.timetablePuzzle.relayArt?.getState().lastEvent ?? null,
                          closeupActive: Boolean(scene.relayCloseupActive),
                        };
                      })()
                    : null,
                  echoRecorded: scene.tutorialPuzzle.echoRecorded,
                  echoSyncIndex: scene.tutorialPuzzle.echoSyncIndex,
                  echoWindowRemainingMs: Math.max(
                    0,
                    (scene.tutorialPuzzle.echoWindowUntil ?? 0) - (scene.time?.now ?? 0),
                  ),
                  lookingDown: Boolean(scene.tutorialLookingDown),
                  pressure: Math.round(scene.tutorialPuzzle.pressure ?? 0),
                  pressureVenting: Boolean(scene.tutorialPuzzle.pressureVenting),
                  pressureBraked: Boolean(scene.tutorialPuzzle.pressureBraked),
                  pressureSettled: Boolean(scene.tutorialPuzzle.pressureSettled),
                  // Phase VI (PAST RIDES THE LOAD): the replay snapshot, so QA
                  // text can never drift from what the ghost, the stripe and
                  // the lamps are showing.
                  echoReplay: scene.getTutorialStage()?.echoLoad && scene.tutorialPuzzle.echoReplay
                    ? (() => {
                        const snap = scene.tutorialPuzzle.echoReplay.snapshot();
                        return {
                          traceSource: snap.traceSource,
                          loopIndex: snap.loopIndex,
                          observationLoop: snap.observationLoop,
                          echoTrolleyX: snap.echoTrolleyX,
                          windowActive: snap.windowActive,
                          attempt: snap.attempt,
                          biteHeldMs: snap.biteHeldMs,
                          departing: snap.departing,
                          conditions: snap.conditions,
                          motorEnergized: snap.motor.energized,
                          motorWheelState: snap.motor.wheelState,
                          driveLoad: Number(snap.motor.axleLoad[snap.motor.driveBogie].toFixed(3)),
                          stageComplete: snap.stageComplete,
                        };
                      })()
                    : null,
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
