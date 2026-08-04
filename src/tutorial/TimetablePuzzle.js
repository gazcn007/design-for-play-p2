import Phaser from 'phaser';
import { LANE_NEAR, LANES } from '../constants.js';
import { sfx } from '../sfx.js';
import {
  causalBlocker,
  ensureDrumState,
  firstOpenSlot,
  holdMsFor,
  isPlayerAt,
  machineSatisfied,
  makeSlot,
  needsPresence,
  summarizeSlots,
} from './drum.js';
// Section III. The drum import above stays because ~3200 lines of other stages
// still call into it; only stage 2's use of it is gone.
// Phase III (junction-3) LOCAL AIR CIRCUIT: the shared parallel air network
// and the room's puzzle-stage state machine, both frozen pure modules
// (SYSTEM ARC LOCK §2.1/§3). This file owns only the wiring.
import { createAirNetwork } from './phases/airNetwork.js';
import {
  createLocalAirCircuit,
  LOCAL_AIR_CIRCUIT_PROMPTS,
} from './phases/localAirCircuit.js';
// Phase IV (junction-4) WEIGHT / ADHESION: the suspension branch of the same
// shared airNetwork plus the frozen motor model, orchestrated by the pure
// weightTransfer module. This file owns only the wiring.
import { createMotorAdhesion } from './phases/motorAdhesion.js';
import {
  createWeightTransfer,
  WEIGHT_TRANSFER_PROMPTS,
} from './phases/weightTransfer.js';
// Phase V (junction-5) READ THE BOGIE: two bogies, one TEST, one genuine
// contradiction, and the Gate 0 safe repair chain on the faulty bogie's
// local brake branch. Pure logic in phases/; this file owns the wiring.
import {
  createBogieDiagnosis,
  BOGIE_SERVICE_PROMPTS,
} from './phases/bogieDiagnosis.js';
// Phase VI (junction-6) PAST RIDES THE LOAD: the past self re-rides the
// Phase IV counterweight trace; the player aligns the repaired systems with
// its rhythm. Pure logic in phases/; this file owns the wiring.
import { createEchoReplay } from './phases/echoReplay.js';
// UNDERCARRIAGE VIEW TEACHING: shared flag semantics for the look-down
// teaching layer (III carries underfloorView only; IV/V/VI underfloor).
import { stageHasUnderfloorView } from './underfloorView.js';
import { C, CAR } from '../art/colors.js';
// Phase II (junction-2): the door-latch / power-contactor interlock is the
// room's only puzzle. Pure logic lives in phases/, world art in art/; this
// file owns the wiring — enter/update/interact/reset timing, per-frame
// snapshot application, prompt gating, completion and the QA route.
import { createContactInterlock } from './phases/contactInterlock.js';
import ContactInterlockArt from '../art/contactInterlockArt.js';
// Phase II insertion "THE MISSING CONTACT": the mid-car relay cabinet. The
// pure logic (phases/relayCabinet.js) and its close-up art
// (art/relayCabinetArt.js) are frozen Wave 1 modules — this file owns their
// wiring into the world: creation, the three-segment isRelaySolved hook, the
// E/pointer/ESC close-up lifecycle, camera pushes, and teardown.
import { createRelayCabinet } from './phases/relayCabinet.js';
import RelayCabinetArt from '../art/relayCabinetArt.js';
import {
  drivePhase2State,
  PHASE2_QA_STATE_NAMES,
  shouldFreezePhase2QAState,
} from './qa/phase2Qa.js';

// Stage index of junction-2 inside config.stages. The interlock devices, the
// QA warp and the objective text all key off this single constant.
const CONTACT_STAGE_INDEX = 1;
// Stage index of junction-3 (LOCAL AIR CIRCUIT). The air-circuit devices, the
// QA warp, the gate-open confirm hook and the objective text key off this.
const AIR_CIRCUIT_STAGE_INDEX = 2;
// Stage index of junction-4 (WEIGHT / ADHESION). The transfer devices, the QA
// warp, the trace hand-off to Phase VI and the objective text key off this.
const WEIGHT_TRANSFER_STAGE_INDEX = 3;
// Stage index of junction-5 (READ THE BOGIE). The service devices, the QA
// warp and the objective text key off this.
const BOGIE_SERVICE_STAGE_INDEX = 4;
// Stage index of junction-6 (PAST RIDES THE LOAD). The departure stand, the
// QA warp and the objective text key off this.
const ECHO_LOAD_STAGE_INDEX = 5;

// Phase VI world prompts: terse, on the device, never the answer.
const ECHO_LOAD_PROMPTS = Object.freeze({
  testOff: '[E] ENERGIZE THE DEPARTURE LINE',
  testOn: '[E] CUT THE DEPARTURE LINE',
});
// Scene-level readability tuning: the pure interlock keeps its reusable 550ms
// default, while this long underfloor run gives a first-time player enough
// time to follow the pulse from the door latch to the remote contactor.
const CONTACT_SIGNAL_MS = 1200;

// Locked device coordinates (WAVE_3_PHASE_II_COORD_STATE_SPEC.md §1 + relay
// work package §4.2: the mid-car cabinet sits at x≈1195 on the same trough).
const CONTACT_INTERLOCK_LAYOUT = Object.freeze({
  startX: 850, // latch x = copper run start
  relayX: 1195, // relay cabinet centre x = pre/post segment seam
  endX: 1440, // contactor x = copper run end
  wallY: 556, // protected cable trough below the carriage floor
});

// "Leaving the room releases the latch" means stepping out of the latch's own
// interaction reach, not crossing the room's authoring line. The latch radius
// is 62px and the entry partition at x=790 sits inside it, so a room-edge
// threshold (startX+8=808) used to wipe a legal press at x∈(788,808) on the
// very next frame — events and all. Reset/enter now key off the interaction
// reach minus a small margin instead.
const CONTACT_RESET_X = CONTACT_INTERLOCK_LAYOUT.startX - 62 - 8; // 780

// The only prompt strings allowed in the room (spec §4 + relay work package
// §2.1). The relay prompt shows only while the case is still unbridged.
const CONTACT_PROMPTS = Object.freeze({
  latch: '[E] RESET LATCH',
  relay: '[E] OPEN RELAY CASE',
  power: '[E] CLOSE CONTACTOR',
});

// Relay close-up camera: the close-up art is laid out on the 960x600 canvas
// with its door frame centred slightly low, so the push-in parks the camera
// on the frame centre. Timings follow the locked beat (work package §3.4.2):
// lock bolt 60ms + door 240ms play FIRST, the camera push (360ms) follows.
const RELAY_CLOSEUP_CAMERA = Object.freeze({ x: 480, y: 335 });
const RELAY_CLOSEUP_CAMERA_MS = 360;
const RELAY_CLOSEUP_SOLVED_HOLD_MS = 450; // watch the armature seat, then leave

// The three enamel keys on the press face, in the order they are lettered.
// These are the *code*. RESET and RUN are operations and live on separate
// steel handles away from the drum housing.
const DRUM_KEYS = Object.freeze(['brake', 'vent', 'door']);

// A player standing at the valve when its slot opens gets this long to find the
// interact key before the slot chars. Being in the right place is the skill the
// stage tests; reaction speed on a single frame is not.
const DRUM_HOLD_GRACE_MS = 320;

// Keep the timetable as one large, legible instrument above the controls.
// Section III deliberately opts out of this physical face: its rotating-drum
// schedule is a brief projected readout, not another blackboard bolted over
// the carriage wall. The player reads their code above the action, while the
// actual controls remain down in the carriage.
const TIMETABLE_FACE = Object.freeze({
  y: 345,
  width: 202,
  height: 100,
  titleY: 312,
  queueY: 344,
  guideY: 370,
  tickY: 378,
  paperY: 387,
  punchY: 329,
  controlLabelY: 409,
  leftInset: 84,
  lampInset: 86,
  drumTickStep: 32,
  queueTickStep: 34,
});

const COMMANDS = {
  brake: { short: '■', drumShort: 'B', label: 'BRAKE', color: 0xe45a5f },
  power: { short: 'ϟ', drumShort: 'P', label: 'POWER', color: 0x75d4cd },
  vent: { short: '○', drumShort: 'V', label: 'VENT', color: 0x9fb7c0 },
  door: { short: '↔', drumShort: 'D', label: 'DOOR', color: 0xcaa66b },
  release: { short: '→', label: 'LATCH', color: 0xb68bc3 },
  couple: { short: '∞', label: 'COUPLE', color: 0xf2d49a },
};

const RAIL_CONTROLS = {
  brake: { label: 'BRAKE SHOE', prompt: 'CLAMP WHEEL' },
  vent: { label: 'BLEED VALVE', prompt: 'OPEN AIR VALVE' },
  power: { label: 'AXLE MOTOR', prompt: 'ENERGIZE MOTOR' },
  couple: { label: 'DRAFT GEAR', prompt: 'UNLOAD COUPLER' },
};

// Indexed by stage. No stage reaches failStage() with a line any more, so all
// entries are null rather than dead prose:
//   I   - autoRun, one command, cannot be ordered wrongly.
//   II  - the contact interlock never calls failStage(). A premature POWER
//         bounces locally at the contactor and can be retried immediately;
//         there is no wrong-order failure state to describe.
//   III - the drum never calls failStage(). Its whole point is that the machine
//         states the fault: the door strains against a live brake pipe, the
//         valve rattles dry, the card scorches. A line here would print the
//         answer the player is supposed to read off the hardware.
//   IV  - WEIGHT/ADHESION abolished the reflex window (SYSTEM ARC LOCK §4): a
//         weak TEST only spins the wheels harder, the trolley stays put, and
//         the sparks are the message. No line could say it better.
//   V   - READ THE BOGIE runs no judged sequence either: a premature repair
//         bounces off the service lock's own interlock, and the contradiction
//         on the two wheelsets says more than any line could.
//   VI  - a missed sync runs its own echo-retry loop with bespoke feedback.
const FAIL_LINES = [
  null,
  null,
  null,
  null,
  null,
  null,
];

/**
 * A tangible, train-specific first-chapter puzzle. The player punches actions
 * into a short timetable, then watches real rail hardware execute them in
 * order. There is deliberately no duplicate player body or shadow control.
 */
export default class TimetablePuzzle {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.objects = [];
    this.stageAssemblies = [];
    this.visible = true;
    // Phase II wiring, created in build(): the interlock state machine, its
    // world art, and a QA freeze flag set by the ?qa=phase2 route so a driven
    // fixture state stays put instead of advancing on the next frame.
    this.contactLock = null;
    this.contactArt = null;
    this.contactQaFreeze = false;
    // Phase III wiring (LOCAL AIR CIRCUIT): a QA freeze flag for the
    // ?qa=phase3 route. The shared airNetwork and the room's state machine
    // live on scene.tutorialPuzzle (the puzzle state object, same pattern as
    // the retired airLock), created lazily by ensureAirCircuitState().
    this.airCircuitQaFreeze = false;
    this._airPulseCooldown = 0;
    // Phase IV wiring (WEIGHT / ADHESION): QA freeze flag for the ?qa=phase4
    // route plus the spark emitter throttle. The shared airNetwork, the motor
    // model and the weightTransfer orchestrator live on scene.tutorialPuzzle,
    // created lazily by ensureWeightTransferState(). The recorded trolley
    // trace lands on puzzle.weightTrace for Phase VI to consume.
    this.weightTransferQaFreeze = false;
    this._sparkCooldown = 0;
    // Phase V wiring (READ THE BOGIE): QA freeze flag for the ?qa=phase5
    // route. The shared airNetwork and motor are the SAME instances III/IV
    // used; the diagnosis orchestrator lives on scene.tutorialPuzzle.
    this.bogieQaFreeze = false;
    // Phase VI wiring (PAST RIDES THE LOAD): QA freeze flag for the
    // ?qa=phase6 route. The replay orchestrator lives on scene.tutorialPuzzle
    // and consumes puzzle.weightTrace (IV's recorder) through the frozen
    // traceContract — canonical fallback when QA skips IV (lock §2.4).
    this.echoQaFreeze = false;
    // Relay cabinet wiring (THE MISSING CONTACT): frozen logic + close-up art
    // plus the close-up lifecycle state owned here.
    // relayCloseupState: 'closed' -> 'opening' -> 'open' -> 'closing' ->
    // 'closed'. Scene-level mirror flag: scene.relayCloseupActive is true for
    // the whole opening/open/closing span so GameScene can gate input, the
    // tutorial camera and render_game_to_text.
    this.relay = null;
    this.relayArt = null;
    this.relayCloseupState = 'closed';
    this._relayAutoCloseScheduled = false;
    this._relayHandlers = null;
    this._relayBlurHandler = null;
    this._relayHoverId = null; // last id handed to relayArt.setHoverTarget
    this._probeCursorValue = null;
  }

  track(object, depth = 58) {
    object.setDepth(depth);
    this.objects.push(object);
    return object;
  }

  build() {
    const { scene } = this;
    const style = {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '10px',
      color: '#83949b',
      backgroundColor: '#071016',
      padding: { x: 5, y: 3 },
    };

    scene.tutorialStageSigns = this.config.stages.map((stage, index) =>
      this.track(
        scene.add
          .text(stage.startX + 32, 275, stage.title, {
            ...style,
            fontSize: '11px',
            color: index === 0 ? '#f2d49a' : '#71828a',
            padding: { x: 8, y: 5 },
          }),
        58,
      ),
    );

    scene.tutorialGates = this.config.stages.map((stage, index) => {
      const gate = this.track(
        scene.add
          .rectangle(stage.endX, 246, 22, 216, 0x1c2830, 0.96)
          .setOrigin(0.5, 0)
          .setStrokeStyle(2, index === this.config.stages.length - 1 ? 0xcaa66b : 0xe45a5f, 0.8),
        44,
      );
      const light = this.track(
        scene.add.circle(stage.endX, 274, 5, 0xe45a5f, 1).setBlendMode(Phaser.BlendModes.ADD),
        59,
      );
      const vestibuleGlow = this.track(
        scene.add
          .rectangle(stage.endX, 354, 30, 202, 0xf2d49a, 0.06)
          .setBlendMode(Phaser.BlendModes.ADD),
        43,
      );
      const window = this.track(
        scene.add
          .rectangle(stage.endX, 304, 13, 26, 0x071016, 1)
          .setStrokeStyle(1, 0xcaa66b, 0.52),
        45,
      );
      const latchTop = this.track(scene.add.rectangle(stage.endX, 336, 28, 4, 0xcaa66b, 0.88), 60);
      const latchBottom = this.track(scene.add.rectangle(stage.endX, 406, 28, 4, 0xcaa66b, 0.88), 60);
      const passageGlow = this.track(
        scene.add
          .rectangle(stage.endX + 12, 452, 92, 5, 0x75d4cd, 0.72)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setVisible(false),
        59,
      );
      const passageArrow = this.track(
        scene.add
          .text(stage.endX + 8, 392, '→', {
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: '30px',
            color: '#9ce8e2',
            backgroundColor: '#071016',
            padding: { x: 8, y: 1 },
          })
          .setOrigin(0.5)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setVisible(false),
        61,
      );
      scene.tweens.add({
        targets: passageArrow,
        x: stage.endX + 20,
        alpha: { from: 0.45, to: 1 },
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      return {
        gate,
        light,
        vestibuleGlow,
        window,
        latchTop,
        latchBottom,
        passageGlow,
        passageArrow,
      };
    });

    this.config.stages.forEach((stage, stageIndex) => {
      // The face is an enamel recess set INTO the carriage lining, not a panel
      // laid on top of it. Three layers, back to front:
      //   1. shadowed rebate, 4px larger all round — reads as depth cut into wall
      //   2. cream enamel field, the actual instrument face
      //   3. brass bezel ring, flush with the lining
      // The old single near-black rectangle (0x0b1319 @ 0.96) is what made this
      // read as a HUD panel pasted into the carriage. No pure-black fills remain.
      const rackRebate = this.track(
        scene.add.rectangle(
          stage.rackX,
          TIMETABLE_FACE.y + 3,
          TIMETABLE_FACE.width + 8,
          TIMETABLE_FACE.height + 8,
          0x1d2530,
          0.9,
        ),
        56,
      );
      const rack = this.track(
        scene.add
          .rectangle(
            stage.rackX,
            TIMETABLE_FACE.y,
            TIMETABLE_FACE.width,
            TIMETABLE_FACE.height,
            0x2b3038,
            0.94,
          )
          .setStrokeStyle(2, 0x8a6f45, 0.6),
        57,
      );
      const rackBezel = this.track(
        scene.add
          .rectangle(
            stage.rackX,
            TIMETABLE_FACE.y,
            TIMETABLE_FACE.width + 5,
            TIMETABLE_FACE.height + 5,
          )
          .setFillStyle()
          .setStrokeStyle(3, 0xcaa66b, 0.82),
        58,
      );
      const rackTitle = this.track(
        scene.add
          .text(stage.rackX, TIMETABLE_FACE.titleY, 'TIMETABLE', {
            ...style,
            fontSize: '12px',
            color: '#f2d49a',
            padding: { x: 8, y: 3 },
          })
          .setOrigin(0.5),
        59,
      );
      const queue = this.track(
        scene.add
          .text(stage.rackX, TIMETABLE_FACE.queueY, '', {
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: stage.drum ? '15px' : '20px',
            color: '#f2d49a',
            align: 'center',
          })
          .setOrigin(0.5),
        59,
      );
      const tick = this.track(
        scene.add.rectangle(
          stage.rackX - TIMETABLE_FACE.leftInset,
          TIMETABLE_FACE.tickY,
          14,
          4,
          0xcaa66b,
          0.9,
        ),
        59,
      );
      const paperStrip = this.track(
        scene.add
          .rectangle(stage.rackX, TIMETABLE_FACE.paperY, 166, 12, 0xe5cf9b, 0.82)
          .setStrokeStyle(1, 0x6f5736, 0.75),
        58,
      );
      const punchHead = this.track(
        scene.add
          .rectangle(
            stage.rackX - TIMETABLE_FACE.leftInset,
            TIMETABLE_FACE.punchY,
            15,
            26,
            0x7f6540,
            1,
          )
          .setStrokeStyle(1, 0xf2d49a, 0.64),
        61,
      );
      const completedLabel = this.track(
        scene.add
          .text(stage.rackX, TIMETABLE_FACE.paperY, 'SERVICE SET', {
            ...style,
            fontSize: '9px',
            color: '#75d4cd',
            backgroundColor: '#071016',
            padding: { x: 6, y: 2 },
          })
          .setOrigin(0.5),
        61,
      );
      const completionLamp = this.track(
        scene.add
          .circle(stage.rackX + TIMETABLE_FACE.lampInset, TIMETABLE_FACE.titleY, 5, 0x75d4cd, 0.9)
          .setBlendMode(Phaser.BlendModes.ADD),
        61,
      );
      // AIR LOCK uses a projected timetable rather than the generic enamel
      // noticeboard. It is deliberately light, short and floating: a record of
      // the code, not the thing the player has to operate. The physical
      // controls stay on the floor line below it.
      const drumProjection = stage.drum ? this.buildDrumProjection(stage) : null;

      // AIR LOCK no longer has the legacy command queue. Its three physical
      // machines teach the rule through their silhouettes and contextual
      // prompts, so there are intentionally no shared timetable labels to
      // build for that stage.
      const commandLabels = (stage.commands ?? []).map((command) => {
        const interactable = scene.interactables.find(
          (candidate) => candidate.def.stage === stageIndex && candidate.def.command === command,
        );
        const spec = COMMANDS[command];
        const physicalLabel = stage.physicalSequence ? RAIL_CONTROLS[command]?.label : null;
        const label = this.track(
          scene.add
            .text(
              interactable.sprite.x,
              stage.drum ? 396 : TIMETABLE_FACE.controlLabelY,
              physicalLabel ?? `${spec.short}\n${spec.label}`,
              {
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: '11px',
                align: 'center',
                color: `#${spec.color.toString(16).padStart(6, '0')}`,
                // The AIR LOCK machine captions are etched labels, not black
                // HUD chips. A small shadow keeps them readable on the carriage.
                backgroundColor: stage.drum ? undefined : '#081016',
                padding: stage.drum ? { x: 1, y: 1 } : { x: 5, y: 4 },
              },
            )
            .setOrigin(0.5),
          63,
        );
        if (stage.drum) label.setShadow(1, 2, '#071016', 4, true, true);
        return label;
      });

      const memoryLabel = stage.echoAssist
        ? this.track(
            scene.add
              .text(stage.rackX, TIMETABLE_FACE.paperY, `TRAIN MEMORY  ${COMMANDS[stage.echoAssist].short} ${COMMANDS[stage.echoAssist].label}`, {
                ...style,
                color: '#75d4cd',
              })
              .setOrigin(0.5),
            60,
          )
        : null;

      const run = scene.interactables.find(
        (candidate) => candidate.def.stage === stageIndex && candidate.def.kind === 'timetable-run',
      );
      const slot = scene.interactables.find(
        (candidate) => candidate.def.stage === stageIndex && candidate.def.kind === 'timetable-press',
      );
      const reset = scene.interactables.find(
        (candidate) => candidate.def.stage === stageIndex && candidate.def.kind === 'timetable-reset',
      );
      const slotLabel = slot && !stage.drum
        ? this.track(
            scene.add
              .text(slot.sprite.x, TIMETABLE_FACE.controlLabelY, '◉  SLOT +1', {
                ...style,
                align: 'center',
                fontSize: '11px',
                color: '#d9bd84',
                padding: { x: 6, y: 4 },
              })
              .setOrigin(0.5),
            63,
          )
        : null;
      const resetLabel = reset
        ? this.track(
            scene.add
              .text(reset.sprite.x, TIMETABLE_FACE.controlLabelY, '↺  RESET', {
                ...style,
                align: 'center',
                fontSize: '11px',
                color: '#e45a5f',
                padding: { x: 6, y: 4 },
              })
              .setOrigin(0.5),
            63,
          )
        : null;
      const runLabel = run
        ? this.track(
            scene.add
              .text(run.sprite.x, TIMETABLE_FACE.controlLabelY, '▶  RUN', {
                ...style,
                align: 'center',
                fontSize: '11px',
                color: '#75d4cd',
                padding: { x: 6, y: 4 },
              })
              .setOrigin(0.5),
            63,
          )
        : null;

      const machinery = this.buildMachinery(stage, stageIndex);
      const hasEcho = Boolean(stage.echoAssist || stage.echoSync);
      const echoInitialX = stage.echoStartX ?? stage.echoX;
      const echo = hasEcho
        ? this.track(
            scene.add
              .sprite(echoInitialX, 720, 'player-interact-1')
              .setOrigin(0.5, 1)
              .setTint(0x75d4cd)
              .setAlpha(0.44)
              .setScale(1.18)
              .setBlendMode(Phaser.BlendModes.ADD),
            60,
          )
        : null;
      const echoGlow = hasEcho
        ? this.track(
            scene.add
              .ellipse(echoInitialX, 670, 94, 170, 0x75d4cd, 0.16)
              .setBlendMode(Phaser.BlendModes.ADD),
            59,
          )
        : null;
      const echoRail = hasEcho
        ? this.track(
            scene.add
              .rectangle(echoInitialX, 742, 118, 5, 0x75d4cd, 0.32)
              .setBlendMode(Phaser.BlendModes.ADD),
            59,
          )
        : null;
      const echoNodes = (stage.echoSync ?? []).map((node) => {
        const beam = this.track(
          scene.add
            .rectangle(node.x, 562, 4, 226, COMMANDS[node.command].color, 0.13)
            .setBlendMode(Phaser.BlendModes.ADD),
          58,
        );
        const ring = this.track(
          scene.add
            .circle(node.x, 670, 24, 0x071016, 0.35)
            .setStrokeStyle(4, COMMANDS[node.command].color, 0.46)
            .setBlendMode(Phaser.BlendModes.ADD),
          61,
        );
        const core = this.track(
          scene.add.circle(node.x, 670, 7, COMMANDS[node.command].color, 0.32).setBlendMode(Phaser.BlendModes.ADD),
          62,
        );
        return { ...node, beam, ring, core };
      });
      this.stageAssemblies.push({
        stage,
        rack,
        rackRebate,
        rackBezel,
        rackTitle,
        queue,
        tick,
        paperStrip,
        punchHead,
        completedLabel,
        completionLamp,
        commandLabels,
        memoryLabel,
        slotLabel,
        resetLabel,
        runLabel,
        drumProjection,
        machinery,
        echo,
        echoGlow,
        echoRail,
        echoNodes,
      });
    });

    // Phase II: one interlock state machine plus its world art for junction-2.
    // The sfx hooks map straight onto src/sfx.js (unmodified): latch clack ->
    // lever, local bounce refusal -> blocked, contactor slam -> press,
    // traction circuit closed -> goal.
    // The relay cabinet (frozen Wave 1 modules) is created first: the
    // interlock's three-segment propagation reads isRelaySolved() through the
    // injected hook, so the signal can wait at the cabinet mouth. The close-up
    // art is built once, synced, then hidden — the world cabinet drawn by
    // ContactInterlockArt carries the cabinet's presence until E opens it.
    this.relay = createRelayCabinet();
    this.relayArt = new RelayCabinetArt(scene, { sfx });
    this.relayArt.applySnapshot(this.relay.snapshot());
    this.relayArt.setVisible(false);
    this.contactLock = createContactInterlock({
      propagationMs: CONTACT_SIGNAL_MS,
      isRelaySolved: () => this.relay?.isSolved() ?? false,
      // P2 (Wave 5): while the close-up is anywhere but fully closed the
      // bridge latch + post segment are held, so the post trace can never
      // light inside the exit beat (450 hold + 240 half-close + 360 camera).
      // relayCloseupState flips to 'closed' only in closeRelayCloseup's
      // finish(), i.e. after the camera pan has landed back on the player.
      isProgressHeld: () => this.relayCloseupState !== 'closed',
    });
    this.contactArt = new ContactInterlockArt(scene, {
      ...CONTACT_INTERLOCK_LAYOUT,
      sfx,
    });
    this.contactArt.applySnapshot(this.contactLock.snapshot());
    this._setupRelayInput();

    this.refresh();
  }

  buildDrumProjection(stage) {
    const { scene } = this;
    const x = Phaser.Math.Clamp(stage.rackX + 178, stage.startX + 170, stage.endX - 150);
    const haze = this.track(
      scene.add
        .ellipse(x, 247, 316, 96, 0x75d4cd, 0.055)
        .setBlendMode(Phaser.BlendModes.ADD),
      55,
    );
    const rail = this.track(
      scene.add
        .rectangle(x, 262, 258, 2, 0xcaa66b, 0.56)
        .setBlendMode(Phaser.BlendModes.ADD),
      58,
    );
    const title = this.track(
      scene.add
        .text(x, 228, 'TIMETABLE  /  AIR LOCK', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '10px',
          color: '#d9bd84',
          letterSpacing: 1,
        })
        .setOrigin(0.5)
        .setShadow(1, 2, '#071016', 4, true, true),
      60,
    );
    const queue = this.track(
      scene.add
        .text(x, 249, '·   ·   ·', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '19px',
          color: '#f2d49a',
          letterSpacing: 3,
        })
        .setOrigin(0.5)
        .setShadow(1, 2, '#071016', 5, true, true),
      61,
    );
    const pointer = this.track(
      scene.add
        .rectangle(x - 72, 274, 30, 3, 0x75d4cd, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD),
      61,
    );
    scene.tweens.add({
      targets: haze,
      alpha: { from: 0.035, to: 0.11 },
      scaleX: { from: 0.94, to: 1.04 },
      duration: 1120,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return { haze, rail, title, queue, pointer, x };
  }

  buildMachinery(stage, index) {
    const { scene } = this;
    const underY = stage.underfloor ? 690 : 548;
    const g = this.track(scene.add.graphics(), 54);
    const left = stage.startX + 46;
    const right = stage.endX - 46;
    const center = (left + right) / 2;

    if (stage.underfloor) {
      g.fillStyle(0x05090c, 0.99);
      g.fillRoundedRect(stage.startX + 18, 505, stage.endX - stage.startX - 36, 360, 18);
      g.lineStyle(4, 0x40535b, 0.9);
      g.strokeRoundedRect(stage.startX + 18, 505, stage.endX - stage.startX - 36, 360, 18);
      g.lineStyle(3, 0x6c7a80, 0.8);
      g.lineBetween(left, underY, right, underY);
      [center - 155, center + 155].forEach((wheelX) => {
        g.fillStyle(0x111a20, 1);
        g.fillCircle(wheelX, underY + 65, 58);
        g.lineStyle(7, 0x607078, 0.95);
        g.strokeCircle(wheelX, underY + 65, 52);
        g.lineStyle(3, 0x2d3c43, 1);
        g.strokeCircle(wheelX, underY + 65, 21);
        g.lineBetween(wheelX - 48, underY + 65, wheelX + 48, underY + 65);
      });
      // Primary and secondary suspension, brake pipe, reservoir and motor.
      g.lineStyle(5, 0x53656d, 1);
      for (let springX = center - 90; springX <= center + 90; springX += 180) {
        for (let y = underY - 88; y < underY - 18; y += 12) {
          g.lineBetween(springX - 18, y, springX + 18, y + 6);
          g.lineBetween(springX + 18, y + 6, springX - 18, y + 12);
        }
      }
      g.fillStyle(0x17262d, 1);
      g.fillRoundedRect(center - 92, underY + 14, 184, 72, 10);
      g.lineStyle(3, 0x75d4cd, 0.28);
      g.strokeRoundedRect(center - 92, underY + 14, 184, 72, 10);
      g.fillStyle(0x263840, 1);
      g.fillRoundedRect(left + 12, underY - 90, 130, 38, 18);
      g.lineStyle(4, 0x8b9ba0, 0.62);
      g.lineBetween(left + 142, underY - 71, right - 24, underY - 71);
      g.lineStyle(2, 0xcaa66b, 0.7);
      g.lineBetween(left + 142, underY - 59, right - 24, underY - 59);
    } else {
      g.lineStyle(3, 0x3e5159, 0.85);
      g.lineBetween(left, underY, right, underY);
      g.fillStyle(0x162229, 0.96);
      g.fillRoundedRect(center - 105, underY - 30, 210, 54, 9);
      g.lineStyle(2, 0xcaa66b, 0.35);
      g.strokeRoundedRect(center - 105, underY - 30, 210, 54, 9);
      // Section III has a compact physical code console. The three lettered
      // enamel keys live together here; RESET and RUN are separate operating
      // handles to their right. This gives the player two readable groups
      // instead of one flat toolbar of unrelated labels.
      if (stage.drum) {
        const consoleLeft = stage.startX + 34;
        const consoleRight = stage.runX + 44;
        g.fillStyle(0x17242a, 0.94);
        g.fillRoundedRect(consoleLeft, 392, consoleRight - consoleLeft, 62, 10);
        g.lineStyle(2, 0xcaa66b, 0.62);
        g.strokeRoundedRect(consoleLeft, 392, consoleRight - consoleLeft, 62, 10);
        // Three separate enamel keycaps make the input vocabulary visible as
        // BRAKE / VENT / DOOR, rather than suggesting that SLOT is a command.
        [-46, 0, 46].forEach((offset, keyIndex) => {
          const keyX = stage.rackX + offset;
          const tint = [0xe45a5f, 0x9fb7c0, 0xcaa66b][keyIndex];
          g.fillStyle(0x0f1a1f, 0.98);
          g.fillRoundedRect(keyX - 18, 403, 36, 36, 5);
          g.lineStyle(2, tint, 0.72);
          g.strokeRoundedRect(keyX - 18, 403, 36, 36, 5);
        });
        g.lineStyle(1, 0x75d4cd, 0.34);
        g.lineBetween(stage.rackX + 44, 399, stage.rackX + 44, 447);
        g.lineBetween(stage.resetX ?? stage.rackX + 92, 399, stage.resetX ?? stage.rackX + 92, 447);
        g.lineBetween(stage.runX - 42, 399, stage.runX - 42, 447);
      }
    }

    const wheelX = stage.underfloor ? center - 155 : center - 82;
    const wheelY = stage.underfloor ? underY + 65 : underY + 6;
    // Brake shoes belong to a wheelset; the air-circuit room has none, so
    // they stay hidden there instead of floating beside the pipe run. All
    // tween/setX references below remain valid against the hidden objects.
    const brakeLeft = this.track(scene.add.rectangle(wheelX - 69, wheelY, 18, 54, 0xe45a5f, 0.64).setVisible(!stage.airCircuit), 56);
    const brakeRight = this.track(scene.add.rectangle(wheelX + 69, wheelY, 18, 54, 0xe45a5f, 0.64).setVisible(!stage.airCircuit), 56);
    // Still built on every stage, including the air-lock one where it is kept
    // hidden as a duplicate of the dial, so the tweens and setScale calls that
    // target it need no per-stage guard. refresh() owns whether it is shown.
    const pressureBar = this.track(
      scene.add.rectangle(center + 116, underY - 42, 12, 62, 0x9fb7c0, 0.76).setOrigin(0.5, 1),
      56,
    );
    // On the air-circuit stage the dial moves to wall eye height. At its inherited
    // spot it landed on (2111, 460), which is the BLEED machine's own position
    // and inside the walking figure's body band -- and machinery draws at 56-57
    // against the player's 32, so the dial covered the character operating it.
    // Eye height also means it can be read without looking away from the wheel.
    const gaugePivotX = stage.airCircuit ? center - 115 : center + 116;
    const gaugePivotY = stage.airCircuit ? underY - 248 : underY - 88;
    // Further from the player, so it has to be bigger to stay legible.
    const gaugeR = stage.airCircuit ? 26 : 18;
    const gaugeFace = this.track(
      scene.add.circle(gaugePivotX, gaugePivotY, gaugeR, 0x10191e, 1).setStrokeStyle(3, 0xb8a274, 0.74),
      56,
    );
    // The needle sweeps -90deg (empty) to +90deg (full), so pressure 30 sits at
    // -90 + 0.30 * 180 = -36deg; Phaser angles run clockwise from screen right,
    // which is the same convention setAngle uses. The arm scales with the face
    // or it would stop short of the bands on the enlarged dial.
    const thresholdRad = Phaser.Math.DegToRad(-36);
    const gaugeDial = this.track(scene.add.graphics(), 56);
    // Both sides of the threshold are painted, not just the safe one. A lone
    // red tick on an otherwise blank face reads as a target to aim for; a red
    // field above it reads as a ceiling to stay under.
    gaugeDial.fillStyle(C(CAR.LAMP_ALERT), 0.13);
    gaugeDial.slice(gaugePivotX, gaugePivotY, gaugeR - 2, thresholdRad, Phaser.Math.DegToRad(90), false);
    gaugeDial.fillPath();
    gaugeDial.fillStyle(C(CAR.LAMP_OK), 0.16);
    gaugeDial.slice(gaugePivotX, gaugePivotY, gaugeR - 2, Phaser.Math.DegToRad(-90), thresholdRad, false);
    gaugeDial.fillPath();
    gaugeDial.lineStyle(2, C(CAR.LAMP_ALERT), 0.95);
    gaugeDial.lineBetween(
      gaugePivotX + (gaugeR - 7) * Math.cos(thresholdRad),
      gaugePivotY + (gaugeR - 7) * Math.sin(thresholdRad),
      gaugePivotX + (gaugeR + 1) * Math.cos(thresholdRad),
      gaugePivotY + (gaugeR + 1) * Math.sin(thresholdRad),
    );
    const gaugeNeedle = this.track(
      scene.add
        .rectangle(gaugePivotX, gaugePivotY, gaugeR - 4, 2, C(CAR.BRASS_HI), 1)
        .setOrigin(0.14, 0.5)
        .setAngle(-38),
      57,
    );

    const powerLamp = this.track(
      scene.add.circle(center + 160, underY - 55, 8, 0x405159, 0.9).setBlendMode(Phaser.BlendModes.ADD),
      57,
    );
    const motor = this.track(scene.add.rectangle(center, underY + 48, 84, 34, 0x283b43, 1), 55);
    const flywheel = this.track(
      scene.add.circle(center, underY + 48, 14, 0x10181d, 1).setStrokeStyle(3, 0x91a3a9, 0.78),
      57,
    );
    const flywheelSpoke = this.track(scene.add.rectangle(center, underY + 48, 24, 2, 0xcaa66b, 0.8), 58);
    const bogieFrame = stage.underfloor
      ? this.track(
          scene.add
            .rectangle(center, underY - 20, 410, 24, 0x2a3940, 0.94)
            .setStrokeStyle(2, 0x91a3a9, 0.7),
          55,
        )
      : null;
    const airReservoir = stage.underfloor
      ? this.track(
          scene.add
            .rectangle(left + 76, underY - 70, 116, 31, 0x43545b, 0.92)
            .setStrokeStyle(2, 0xc1c9c6, 0.62),
          56,
        )
      : null;
    // Underfloor stages keep the flat bar under the carriage. The air-circuit
    // room instead gets a traceable overhead run, drawn at world coordinates
    // with the Graphics itself left at the origin, routed above head height so
    // it can sit at machinery depth without ever crossing the player's torso.
    const airPipe = stage.underfloor
      ? this.track(
          scene.add.rectangle(center + 18, underY - 59, Math.max(160, right - left - 260), 6, 0x9fb7c0, 0.78),
          57,
        )
      : stage.airCircuit
        ? this.track(scene.add.graphics(), 57)
        : null;
    if (airPipe && stage.airCircuit) {
      // Graphics has no displayWidth, so the pulse origins travel as explicit
      // fields. The run is UNDERFLOOR (SYSTEM ARC LOCK §1: lines live beneath
      // the car floor): a main supply header at y=545 feeds three parallel
      // branches; the door branch tees off at the reservoir and exhausts at
      // the bleed wheel (2110).
      airPipe.__hissX = 2110;
      airPipe.__hissY = 560;
      airPipe.__headerY = 545;
      airPipe.__spanLeft = 1650;
      airPipe.__spanWidth = 680;
      airPipe.setAlpha(0.9);
      this.drawAirPipe(airPipe, 0);
    }
    // Phase III machinery: the reservoir tank on the header, and the door
    // cylinder whose piston visibly extends/retracts with pressure — while
    // fighting the supply it creeps and gets shoved back, the lesson told in
    // one pose.
    const airTank = stage.airCircuit
      ? this.track(
          scene.add.rectangle(1650, 545, 96, 30, 0x43545b, 0.92).setStrokeStyle(2, 0xc1c9c6, 0.62),
          55,
        )
      : null;
    const doorCylinder = stage.airCircuit
      ? this.track(
          scene.add.rectangle(2260, 560, 64, 18, 0x2a3940, 0.95).setStrokeStyle(2, 0x91a3a9, 0.7),
          55,
        )
      : null;
    const doorPiston = stage.airCircuit
      ? this.track(scene.add.rectangle(2292, 560, 46, 6, C(CAR.STEEL_HI), 0.9).setOrigin(0, 0.5), 56)
      : null;
    // UNDERCARRIAGE VIEW TEACHING (III dressing): nothing mechanical floats.
    // The hand-placed air run now visibly hangs from the car floor — beams
    // with real thickness, hanger straps and tee collars — and a rigid rod
    // links the door cylinder to the claw gate at the stage exit, so the
    // whole chain (pipe -> cylinder -> latch) reads as one machine. A dim
    // service glow lifts the underfloor band without touching the palette.
    // All three pieces live in assembly.machinery so refresh() manages their
    // visibility with the rest of the room (leaving world 0 must not leave
    // them floating).
    const airDress = stage.airCircuit ? this.track(scene.add.graphics(), 54) : null;
    if (airDress) {
      const dress = airDress;
      [1692, 1908, 2124, 2328].forEach((beamX) => {
        dress.fillStyle(0x141f26, 1);
        dress.fillRect(beamX - 9, 494, 18, 32);
        dress.lineStyle(2, 0x3e5159, 0.8);
        dress.strokeRect(beamX - 9, 494, 18, 32);
        // Hanger strap from beam down around the header; when the pipe sags
        // empty it hangs FROM this clamp, which is the honest physics.
        dress.lineStyle(3, 0x6c7a80, 0.85);
        dress.lineBetween(beamX, 526, beamX, 540);
        dress.fillStyle(0x8b9ba0, 0.9);
        dress.fillRect(beamX - 7, 540, 14, 9);
      });
      // Tee collars where the door branch and the service cocks leave the
      // header (reservoir tee, ISOLATE riser, gauge riser, BLEED drop).
      [1666, 1750, 1900, 2110].forEach((teeX) => {
        dress.fillStyle(0x263840, 1);
        dress.fillRect(teeX - 6, 538, 12, 14);
        dress.lineStyle(1, 0xcaa66b, 0.5);
        dress.strokeRect(teeX - 6, 538, 12, 14);
      });
      // Rigid rod: cylinder piston line -> up through the floor -> the claw
      // gate jaws at the exit (stage.endX, jaws at y336/406).
      dress.lineStyle(3, 0x91a3a9, 0.85);
      dress.lineBetween(2338, 560, stage.endX - 6, 560);
      dress.lineBetween(stage.endX - 6, 410, stage.endX - 6, 560);
      dress.fillStyle(0x43545b, 0.95);
      dress.fillRect(stage.endX - 12, 404, 12, 10);
    }
    const airLightHub = stage.airCircuit
      ? this.track(scene.addLight(1995, 610, 210, 0x4d6d72, 0.16, 53), 53)
      : null;
    const airLightClaw = stage.airCircuit
      ? this.track(scene.addLight(2280, 585, 130, 0x4d6d72, 0.13, 53), 53)
      : null;
    const secondWheelX = stage.underfloor ? center + 155 : center + 82;
    const wheelSpokeLeft = stage.underfloor
      ? this.track(scene.add.rectangle(wheelX, wheelY, 82, 4, 0xc4d0d2, 0.72), 58)
      : null;
    const wheelSpokeRight = stage.underfloor
      ? this.track(scene.add.rectangle(secondWheelX, wheelY, 82, 4, 0xc4d0d2, 0.72), 58)
      : null;
    const axlePulse = stage.underfloor
      ? this.track(
          scene.add
            .rectangle(center, wheelY, 392, 7, 0x75d4cd, 0.08)
            .setBlendMode(Phaser.BlendModes.ADD),
          57,
        )
      : null;
    const drumKeyLabels = stage.drum
      ? DRUM_KEYS.map((command, keyIndex) => {
          const spec = COMMANDS[command];
          return this.track(
            scene.add
              .text(stage.rackX + [-46, 0, 46][keyIndex], 421, spec.label, {
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: '7px',
                color: `#${spec.color.toString(16).padStart(6, '0')}`,
              })
              .setOrigin(0.5)
              .setShadow(1, 1, '#071016', 3, true, true),
            61,
          );
        })
      : null;
    const trolley = index === 3
      ? this.track(scene.add.rectangle(stage.weightTransfer?.trolley.leftX ?? stage.startX + 355, 429, 112, 45, 0x28353c, 1).setStrokeStyle(2, 0xb68bc3, 0.75), 37)
      : null;
    // Phase IV underfloor hardware (WEIGHT / ADHESION): the two air springs
    // that visibly collapse while the suspension branch leaks flat, the car
    // floor line that tilts with the load split, and the TEST stand lamp that
    // follows the motor state. The dial only corroborates what these show.
    const suspensionBagFront = stage.weightTransfer
      ? this.track(
          scene.add.rectangle(stage.startX + 140, underY + 26, 46, 26, 0x43545b, 0.92)
            .setStrokeStyle(2, 0xc1c9c6, 0.6)
            .setOrigin(0.5, 0),
          55,
        )
      : null;
    const suspensionBagRear = stage.weightTransfer
      ? this.track(
          scene.add.rectangle(stage.endX - 190, underY + 26, 46, 26, 0x43545b, 0.92)
            .setStrokeStyle(2, 0xc1c9c6, 0.6)
            .setOrigin(0.5, 0),
          55,
        )
      : null;
    const bodyTilt = stage.weightTransfer
      ? this.track(
          scene.add.rectangle(center, underY - 2, right - left - 60, 4, 0x9fb7c0, 0.5),
          54,
        )
      : null;
    const testLamp = stage.weightTransfer
      ? this.track(
          scene.add.circle(stage.weightTransfer.machines.test.x, underY - 62, 7, 0x405159, 0.45)
            .setBlendMode(Phaser.BlendModes.ADD),
          57,
        )
      : stage.bogieService
        ? this.track(
            scene.add.circle(stage.bogieService.machines.test.x, underY - 62, 7, 0x405159, 0.45)
              .setBlendMode(Phaser.BlendModes.ADD),
            57,
          )
      : stage.echoLoad
        ? this.track(
            scene.add.circle(stage.echoLoad.machines.test.x, underY - 62, 7, 0x405159, 0.45)
              .setBlendMode(Phaser.BlendModes.ADD),
            57,
          )
      : null;
    // Phase V underfloor hardware (READ THE BOGIE): two wheelsets the player
    // can compare under one TEST — the healthy front bogie and the faulty
    // rear one, each with its own brake shoe — plus the VISIBLE steel service
    // pin that bars the rear linkage while seated (Gate 0: no invisible
    // booleans) and the seized actuator piston it protects the player from.
    const bogieY = underY + 65;
    const frontBogieX = stage.bogieService?.bogies.front ?? 0;
    const rearBogieX = stage.bogieService?.bogies.rear ?? 0;
    const frontSpoke = stage.bogieService
      ? this.track(
          scene.add.rectangle(frontBogieX, bogieY, 76, 4, 0xc4d0d2, 0.72),
          58,
        )
      : null;
    const rearSpoke = stage.bogieService
      ? this.track(
          scene.add.rectangle(rearBogieX, bogieY, 76, 4, 0xc4d0d2, 0.72),
          58,
        )
      : null;
    const frontShoe = stage.bogieService
      ? this.track(
          scene.add.rectangle(frontBogieX + 58, bogieY, 14, 46, 0xe45a5f, 0.72),
          57,
        )
      : null;
    const rearShoe = stage.bogieService
      ? this.track(
          scene.add.rectangle(rearBogieX + 58, bogieY, 14, 46, 0xe45a5f, 0.72),
          57,
        )
      : null;
    const servicePin = stage.bogieService
      ? this.track(
          scene.add.rectangle(rearBogieX - 64, bogieY - 34, 34, 6, 0x697980, 0.95)
            .setStrokeStyle(1, 0xc1c9c6, 0.6),
          59,
        )
      : null;
    const actuatorPiston = stage.bogieService
      ? this.track(
          scene.add.rectangle(stage.bogieService.machines.repair.x, bogieY - 28, 40, 12, 0x2a3940, 0.95)
            .setStrokeStyle(2, 0x91a3a9, 0.66),
          56,
        )
      : null;
    // Phase VI underfloor hardware (PAST RIDES THE LOAD): the echo's trolley
    // re-rides the Phase IV trace on its own rail below the floor. The brass
    // zone stripe on the rail IS the lesson — when the moving weight is over
    // the drive bogie, the axle is loaded. No arrows, no text: the stripe, the
    // ghost and the gauge carry it.
    const echoRailSpec = stage.echoLoad?.echoRail;
    const echoRailBeam = echoRailSpec
      ? this.track(
          scene.add.rectangle(
            (echoRailSpec.x0 + echoRailSpec.x1) / 2,
            bogieY + 42,
            echoRailSpec.x1 - echoRailSpec.x0,
            5,
            0x53656d,
            0.6,
          ),
          54,
        )
      : null;
    const echoZoneStripe = echoRailSpec
      ? this.track(
          scene.add.rectangle(
            echoRailSpec.x0 + (echoRailSpec.x1 - echoRailSpec.x0) * 0.875,
            bogieY + 42,
            (echoRailSpec.x1 - echoRailSpec.x0) * 0.25,
            9,
            C(CAR.BRASS_MID),
            0.5,
          ),
          55,
        )
      : null;
    const echoTrolleyCar = echoRailSpec
      ? this.track(
          scene.add.rectangle(echoRailSpec.x0, bogieY + 24, 92, 32, 0x28353c, 1)
            .setStrokeStyle(2, 0x75d4cd, 0.66),
          56,
        )
      : null;
    const echoGhostGlow = echoRailSpec
      ? this.track(
          scene.add.ellipse(echoRailSpec.x0, bogieY - 6, 62, 92, 0x75d4cd, 0.14)
            .setBlendMode(Phaser.BlendModes.ADD),
          56,
        )
      : null;
    const echoGhost = echoRailSpec
      ? this.track(
          scene.add.sprite(echoRailSpec.x0, bogieY + 6, 'player-walk-1')
            .setOrigin(0.5, 1)
            .setAlpha(0.82),
          57,
        )
      : null;
    // The drive wheelset under test, and the five-lamp condition strip that
    // reads the six-condition chain (lock §6): interlock / air path / brake
    // sync steady from the repaired systems, load + bite live from the rhythm.
    const echoDriveSpoke = stage.echoLoad
      ? this.track(
          scene.add.rectangle(
            echoRailSpec.x0 + (echoRailSpec.x1 - echoRailSpec.x0) * 0.875,
            bogieY - 6,
            76,
            4,
            0xc4d0d2,
            0.72,
          ),
          58,
        )
      : null;
    const echoConditionLamps = stage.echoLoad
      ? ['interlock', 'airPath', 'synced', 'load', 'biting'].map((key, lampIndex) => ({
          key,
          lamp: this.track(
            scene.add.circle(
              stage.echoLoad.machines.test.x - 52 + lampIndex * 26,
              underY - 84,
              6,
              0x405159,
              0.5,
            ).setStrokeStyle(1, 0x91a3a9, 0.5),
            57,
          ),
        }))
      : null;
    const echoWindowLamp = stage.echoLoad
      ? this.track(
          scene.add.circle(
            echoRailSpec.x0 + (echoRailSpec.x1 - echoRailSpec.x0) * 0.875,
            bogieY - 44,
            8,
            0x405159,
            0.45,
          ).setBlendMode(Phaser.BlendModes.ADD),
          58,
        )
      : null;
    const couplerLeft = index === this.config.stages.length - 1
      ? this.track(scene.add.rectangle(stage.endX - 126, underY + 4, 72, 18, 0x697980, 1), 57)
      : null;
    const couplerRight = index === this.config.stages.length - 1
      ? this.track(scene.add.rectangle(stage.endX - 52, underY + 4, 72, 18, 0x697980, 1), 57)
      : null;
    let controlLink = null;
    let controlPaths = null;
    if (stage.physicalSequence) {
      controlLink = this.track(scene.add.graphics(), 53);
      controlPaths = {};
      const railControls = scene.interactables.filter(
        (candidate) => candidate.def.stage === index && candidate.def.kind === 'rail-control',
      );
      const targets = {
        brake: { x: wheelX, y: wheelY },
        vent: { x: airReservoir?.x ?? center + 116, y: airReservoir?.y ?? underY - 42 },
        power: { x: center, y: underY + 48 },
        couple: { x: couplerLeft?.x ?? stage.endX - 94, y: underY + 4 },
      };
      railControls.forEach((control) => {
        const target = targets[control.def.command];
        const elbowY = 520 + (control.def.command === 'power' ? 28 : 0);
        controlLink.lineStyle(7, 0x10191e, 0.92);
        controlLink.lineBetween(control.sprite.x, 448, control.sprite.x, elbowY);
        controlLink.lineBetween(control.sprite.x, elbowY, target.x, elbowY);
        controlLink.lineBetween(target.x, elbowY, target.x, target.y - 18);
        controlLink.lineStyle(3, COMMANDS[control.def.command].color, 0.46);
        controlLink.lineBetween(control.sprite.x, 448, control.sprite.x, elbowY);
        controlLink.lineBetween(control.sprite.x, elbowY, target.x, elbowY);
        controlLink.lineBetween(target.x, elbowY, target.x, target.y - 18);
        controlLink.fillStyle(0x9aa8aa, 0.72);
        controlLink.fillCircle(control.sprite.x, elbowY, 5);
        controlLink.fillCircle(target.x, elbowY, 5);
        controlPaths[control.def.command] = {
          startX: control.sprite.x,
          startY: 448,
          elbowY,
          targetX: target.x,
          targetY: target.y - 18,
        };
      });
    }

    return {
      g,
      brakeLeft,
      brakeRight,
      pressureBar,
      gaugeFace,
      gaugeNeedle,
      powerLamp,
      motor,
      flywheel,
      flywheelSpoke,
      bogieFrame,
      airReservoir,
      airPipe,
      airTank,
      doorCylinder,
      doorPiston,
      airDress,
      airLightHub,
      airLightClaw,
      wheelSpokeLeft,
      wheelSpokeRight,
      axlePulse,
      drumKeyLabels,
      trolley,
      suspensionBagFront,
      suspensionBagRear,
      bodyTilt,
      testLamp,
      frontSpoke,
      rearSpoke,
      frontShoe,
      rearShoe,
      servicePin,
      actuatorPiston,
      echoRailBeam,
      echoZoneStripe,
      echoTrolleyCar,
      echoGhostGlow,
      echoGhost,
      echoDriveSpoke,
      echoConditionLamps,
      echoWindowLamp,
      couplerLeft,
      couplerRight,
      controlLink,
      controlPaths,
      wheelX,
      wheelY,
      underY,
      // Phase IV spark origin: the drive (rear) bogie's wheel-rail contact.
      __driveWheelX: stage.weightTransfer ? center + 185 : undefined,
      __driveWheelY: stage.weightTransfer ? wheelY : undefined,
      // Phase V shoe poses and pin travel (world x), read by refreshBogieVisuals.
      __frontShoeOn: stage.bogieService ? frontBogieX + 44 : undefined,
      __frontShoeOff: stage.bogieService ? frontBogieX + 58 : undefined,
      __rearShoeOn: stage.bogieService ? rearBogieX + 44 : undefined,
      __rearShoeOff: stage.bogieService ? rearBogieX + 58 : undefined,
      __pinParkedX: stage.bogieService ? rearBogieX - 64 : undefined,
      __pinSeatedX: stage.bogieService ? rearBogieX - 18 : undefined,
      // Phase VI echo rail endpoints (world x), read by refreshEchoVisuals.
      __echoRailX0: echoRailSpec?.x0,
      __echoRailX1: echoRailSpec?.x1,
      initialBogieY: bogieFrame?.y,
      initialReservoirY: airReservoir?.y,
      initialReservoirScaleX: airReservoir?.scaleX,
      initialTrolleyX: trolley?.x,
      initialCouplerLeftX: couplerLeft?.x,
      initialCouplerRightX: couplerRight?.x,
    };
  }

  isTimetableKind(kind) {
    // The three drum kinds are gone from level.js, so listing them here would
    // only keep dead branches reachable. 'air-lock' must be present: a kind
    // missing from this list is treated as a non-timetable object and gets the
    // generic '[E]' prompt from GameScene instead of the stage's own wording.
    return [
      'timetable-command',
      'timetable-run',
      'rail-control',
      'air-lock',
      // Phase IV's four devices (drain cock, levelling valve, counterweight
      // trolley, test stand) ride the same routing.
      'weight-transfer',
      // Phase V's five service devices (shared TEST stand, cutout cock,
      // bleed wheel, service pin bracket, actuator access) likewise.
      'bogie-service',
      // Phase VI's single departure stand likewise.
      'echo-load',
      // Phase II's two devices ride the same proximity/E routing as every
      // other timetable kind; their prompts come from the art module instead
      // of the shared bubble.
      'contact-interlock',
    ].includes(kind);
  }

  canInteract(interactable) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!this.isTimetableKind(interactable.def.kind)) return true;
    if (!puzzle.briefed || ['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return false;
    if (['executing', 'echo-replay', 'echo-travel', 'echo-retry'].includes(puzzle.phase)) {
      // A turning drum is the one case where the player is meant to be doing
      // something during execution: standing at the valve holding E. Only the
      // valve opens up, and only on the drum stage — everything else, including
      // the command devices and RUN, stays locked so the timetable cannot be
      // rewritten mid-run.
      const drumStage = this.currentStage();
      const isDrumReset = drumStage?.drum
        && puzzle.phase === 'executing'
        && interactable.def.stage === puzzle.stageIndex
        && interactable.def.kind === 'timetable-reset';
      if (isDrumReset) return true;
      const isDrumHold = drumStage?.drum
        && puzzle.phase === 'executing'
        && interactable.def.stage === puzzle.stageIndex
        && interactable.def.kind === 'drum-machine'
        && interactable.def.command === 'vent';
      if (!isDrumHold) return false;
      return true;
    }
    if (interactable.def.stage !== puzzle.stageIndex) return false;
    const stage = this.currentStage();
    // Both air-circuit devices stay live at all times. Gating them by a step
    // counter would hand the player the order, which is the one thing the room
    // has to teach through the pipe instead.
    if (interactable.def.kind === 'air-lock') return Boolean(stage.airCircuit);
    // All four transfer devices stay live at all times — the load path, not a
    // step counter, decides what works. Gating the TEST stand until the bags
    // were charged would hand the player the order.
    if (interactable.def.kind === 'weight-transfer') return Boolean(stage.weightTransfer);
    // All five service devices stay live: the evidence chain, not a step
    // counter, decides what each one does. The service pin refuses on its
    // own terms (line live) — gating it here would leak the order.
    if (interactable.def.kind === 'bogie-service') return Boolean(stage.bogieService);
    // The departure stand stays live at all times — the echo's rhythm, not a
    // step counter, decides what energizing does. The first observation loop
    // refuses on its own terms inside the orchestrator.
    if (interactable.def.kind === 'echo-load') return Boolean(stage.echoLoad);
    if (interactable.def.kind === 'rail-control') {
      if (!stage.physicalSequence) return false;
      if (stage.echoSync && puzzle.queue.length > 0) {
        return puzzle.phase === 'echo-sync' && puzzle.activeCommand === interactable.def.command;
      }
      return true;
    }
    if (stage.autoRun && puzzle.phase === 'programming') return false;
    if (interactable.def.kind === 'timetable-run') {
      if (stage.autoRun) return false;
    }
    // Both interlock devices stay pressable for the whole stage: a premature
    // POWER must bounce so the circuit can teach itself, and the latch must
    // accept repeat presses. The state machine decides what each press does.
    return true;
  }

  promptFor(interactable) {
    const puzzle = this.scene.tutorialPuzzle;
    if (interactable.def.kind === 'rail-control') {
      return `[E] ${RAIL_CONTROLS[interactable.def.command]?.prompt ?? 'OPERATE'}`;
    }
    if (interactable.def.kind === 'timetable-command') {
      return `[E] PUNCH ${COMMANDS[interactable.def.command].label}`;
    }
    // On the drum stage the devices are machines. The only thing the player
    // does at them is be there — and at the bleed wheel, hold.
    if (interactable.def.kind === 'air-lock') {
      const phase = puzzle.airCircuit;
      if (!phase) return null;
      const snap = phase.snapshot();
      // Nothing is offered once the door is open: a standing label on a done
      // machine is the kind of permanent text the room bans.
      if (snap.stageComplete) return null;
      const command = interactable.def.command;
      if (command === 'isolate') {
        return snap.isolateClosed
          ? LOCAL_AIR_CIRCUIT_PROMPTS.isolateClosed
          : LOCAL_AIR_CIRCUIT_PROMPTS.isolateOpen;
      }
      if (command === 'bleed') {
        return snap.door.venting ? null : LOCAL_AIR_CIRCUIT_PROMPTS.bleed;
      }
      return null;
    }
    if (interactable.def.kind === 'weight-transfer') {
      const phase = puzzle.weightTransfer;
      if (!phase) return null;
      const snap = phase.snapshot();
      // A standing label on a done machine is the kind of permanent text the
      // room bans — the moved car is its own answer.
      if (snap.stageComplete) return null;
      const command = interactable.def.command;
      if (command === 'level-drain') {
        return snap.suspension.venting ? WEIGHT_TRANSFER_PROMPTS.drainOpen : null;
      }
      if (command === 'level-supply') {
        return snap.suspension.isolated ? WEIGHT_TRANSFER_PROMPTS.supplyClosed : null;
      }
      if (command === 'trolley') {
        return snap.grabbed
          ? WEIGHT_TRANSFER_PROMPTS.trolleyGrabbed
          : WEIGHT_TRANSFER_PROMPTS.trolleyFree;
      }
      if (command === 'test') {
        return snap.motor.energized
          ? WEIGHT_TRANSFER_PROMPTS.testOn
          : WEIGHT_TRANSFER_PROMPTS.testOff;
      }
      return null;
    }
    if (interactable.def.kind === 'bogie-service') {
      const phase = puzzle.bogieDiagnosis;
      if (!phase) return null;
      const snap = phase.snapshot();
      if (snap.stageComplete) return null;
      const command = interactable.def.command;
      if (command === 'test') {
        return snap.motor.energized
          ? BOGIE_SERVICE_PROMPTS.testOn
          : BOGIE_SERVICE_PROMPTS.testOff;
      }
      if (command === 'brake-isolate') {
        return snap.brake.isolated
          ? BOGIE_SERVICE_PROMPTS.isolateClosed
          : BOGIE_SERVICE_PROMPTS.isolateOpen;
      }
      if (command === 'brake-vent') {
        return snap.brake.venting ? null : BOGIE_SERVICE_PROMPTS.vent;
      }
      if (command === 'service-lock') {
        return snap.rear.serviceLockEngaged
          ? BOGIE_SERVICE_PROMPTS.lockEngaged
          : BOGIE_SERVICE_PROMPTS.lockFree;
      }
      if (command === 'repair') {
        return snap.rear.repaired ? null : BOGIE_SERVICE_PROMPTS.repair;
      }
      return null;
    }
    if (interactable.def.kind === 'echo-load') {
      const phase = puzzle.echoReplay;
      if (!phase) return null;
      const snap = phase.snapshot();
      if (snap.stageComplete) return null;
      return snap.motor.energized
        ? ECHO_LOAD_PROMPTS.testOn
        : ECHO_LOAD_PROMPTS.testOff;
    }
    if (interactable.def.kind === 'contact-interlock') {
      // Null on purpose: the shared prompt bubble stays hidden and
      // ContactInterlockArt shows the only two allowed strings in-world.
      return null;
    }
    if (interactable.def.kind === 'timetable-run') return '[E] RUN TIMETABLE';
    return '[E]';
  }

  handleInteraction(interactable) {
    if (!this.canInteract(interactable)) return true;
    if (interactable.def.kind === 'rail-control') {
      this.operateRailControl(interactable);
      return true;
    }
    if (interactable.def.kind === 'timetable-command') {
      this.punch(interactable.def.command, interactable.sprite);
      return true;
    }
    if (interactable.def.kind === 'air-lock') {
      this.operateAirLock(interactable);
      return true;
    }
    if (interactable.def.kind === 'contact-interlock') {
      this.operateContactInterlock(interactable);
      return true;
    }
    if (interactable.def.kind === 'timetable-run') {
      this.run(interactable.sprite);
      return true;
    }
    if (interactable.def.kind === 'weight-transfer') {
      this.operateWeightTransfer(interactable);
      return true;
    }
    if (interactable.def.kind === 'bogie-service') {
      this.operateBogieService(interactable);
      return true;
    }
    if (interactable.def.kind === 'echo-load') {
      this.operateEchoLoad(interactable);
      return true;
    }
    return false;
  }

  punch(command, sprite) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (stage.drum) {
      // Hard stop: a drum run leaves the player free to walk, so they can reach
      // a command device mid-run. Editing the drum while it turns would let them
      // rewrite a slot the pointer has not reached yet.
      if (puzzle.phase === 'executing') {
        sfx.blocked();
        return;
      }
      this.punchDrumSlot(command, sprite);
      return;
    }
    if (puzzle.queue.length >= stage.solution.length) {
      puzzle.queue = [];
      scene.game.events.emit('hud:toast', 'The full strip ejects. Punch a new order.');
    }
    puzzle.queue.push(command);
    puzzle.phase = 'programming';
    scene.player.playInteraction();
    scene.pulseTutorialDevice(sprite, COMMANDS[command].color);
    this.animateTicketPunch(this.stageAssemblies[puzzle.stageIndex], command);
    sfx.press();
    scene.applyHitstop(45, 0.18);
    this.refresh();
    if (stage.autoRun) {
      const stageIndex = puzzle.stageIndex;
      scene.time.delayedCall(260, () => {
        if (puzzle.stageIndex !== stageIndex || puzzle.phase !== 'programming') return;
        const run = scene.interactables.find(
          (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-run',
        );
        if (run) this.run(run.sprite);
      });
    }
  }

  operateRailControl(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    const command = interactable.def.command;
    const expected = stage.solution[puzzle.queue.length];
    const echoLocked = stage.echoSync && puzzle.queue.length > 0 && (
      puzzle.phase !== 'echo-sync' ||
      puzzle.activeCommand !== command ||
      scene.time.now > puzzle.echoWindowUntil
    );
    if (command !== expected || echoLocked) {
      scene.player.playInteraction();
      scene.pulseTutorialDevice(interactable.sprite, 0xe45a5f);
      scene.cameras.main.shake(150, 0.004);
      const physicalHint = {
        brake: 'The wheel is still free. Clamp the brake shoe against it first.',
        vent: 'The brake is holding. Now follow the charged pipe to its bleed valve.',
        power: 'The pipe is empty. The axle can take power now.',
        couple: 'The motor has unloaded the draft gear. Release the coupler now.',
      };
      scene.game.events.emit(
        'hud:toast',
        echoLocked
          ? 'That control only carries load while the remembered hand is holding its lower contact.'
          : physicalHint[expected] ?? 'The mechanism is not ready for that load.',
      );
      sfx.blocked();
      this.pulseMachineryFault(this.stageAssemblies[puzzle.stageIndex]);
      return;
    }

    const completedEchoContact = stage.echoSync && puzzle.phase === 'echo-sync';
    puzzle.phase = 'physical';
    puzzle.queue.push(command);
    puzzle.executionStep = puzzle.queue.length - 1;
    puzzle.activeCommand = command;
    scene.player.playInteraction();
    scene.pulseTutorialDevice(interactable.sprite, COMMANDS[command].color);
    if (command === 'power') interactable.sprite.setTexture('hand-generator-on');
    else if (command === 'vent') interactable.sprite.setTexture('circuit-relay-1');
    else interactable.sprite.setTexture('lever-on');
    const finalAction = puzzle.queue.length === stage.solution.length;
    if (completedEchoContact) scene.applyHitstop(55, 0.12);
    if (!finalAction) this.applyAction(command, true);
    this.refresh();

    const stageIndex = puzzle.stageIndex;
    if (stage.echoSync && puzzle.queue.length < stage.solution.length) {
      const nextNodeIndex = puzzle.queue.length - 1;
      this.beginEchoSync(stageIndex, nextNodeIndex);
      return;
    }
    if (finalAction) {
      scene.time.delayedCall(100, () => {
        if (puzzle.stageIndex === stageIndex && puzzle.phase === 'physical') {
          this.completeStage({ pendingActions: [command] });
        }
      });
    }
  }

  /**
   * Walks PAST from its current position to the next blocked obstacle, or to the
   * bleed valve once every gate is cleared. Reaching the valve is what unlocks
   * the player's door, so the partner is mechanically required.
   *
   * REMOVED with the old junction-6 echoGates design (lock §9 disposal table):
   * operateEchoGate() and advanceEchoToGate() are gone. Junction-6 now runs
   * PAST RIDES THE LOAD — see updateEchoReplayStage().
   */

  // The parallel air network is Section III's explanation of itself
  // (SYSTEM ARC LOCK §1): a main supply header under the floor feeds THREE
  // independent branches — the door branch the player works on, plus capped
  // suspension and brake tees that foreshadow Phases IV and V. Pressure is
  // invisible, so the pipe carries it as shape: taut means charged, sagging
  // means the air is gone. Phaser 3.90's Graphics has no quadraticCurveTo,
  // so each span's bow is walked as short straight segments.
  drawAirPipe(graphics, sagPx = 0) {
    const headerY = graphics.__headerY ?? 545;
    const branchY = graphics.__hissY ?? 560;
    const segs = 8;
    const bowY = (t) => (1 - t) * (1 - t) * branchY + 2 * (1 - t) * t * (branchY + 2 * sagPx) + t * t * branchY;

    graphics.clear();
    // Two passes over the same geometry: a thick brass body, then a thin lit
    // edge two pixels above it, so the line reads as round pipe not flat bar.
    [
      { width: 6, color: C(CAR.BRASS_MID), alpha: 1, lift: 0 },
      { width: 2, color: C(CAR.BRASS_HI), alpha: 0.5, lift: 2 },
    ].forEach(({ width, color, alpha, lift }) => {
      graphics.lineStyle(width, color, alpha);
      // Main supply header: compressor -> reservoir -> off toward the next rooms.
      graphics.lineBetween(1605, headerY - lift, 2345, headerY - lift);
      // Parallel capped tees: suspension (foreshadows IV) and brake (V). The
      // header visibly feeds more than this one branch.
      [1860, 2020].forEach((x) => {
        graphics.lineBetween(x, headerY - lift, x, headerY + 16 - lift);
        graphics.lineBetween(x - 5, headerY + 16 - lift, x + 5, headerY + 16 - lift);
      });
      // Door branch: header tee at the reservoir, through the ISOLATE valve
      // body, sagging run to the bleed wheel, on to the door cylinder.
      graphics.lineBetween(1650, headerY - lift, 1650, branchY - lift);
      graphics.lineBetween(1650, branchY - lift, 1738, branchY - lift);
      graphics.strokeRect(1738, branchY - 7 - lift, 22, 14);
      graphics.moveTo(1760, branchY - lift);
      for (let s = 1; s <= segs; s += 1) {
        const t = s / segs;
        graphics.lineTo(1760 + (2110 - 1760) * t, bowY(t) - lift);
      }
      // BLEED exhaust stub: the one place air may leave the room.
      graphics.lineBetween(2110, branchY - lift, 2110, branchY + 20 - lift);
      graphics.lineBetween(2104, branchY + 14 - lift, 2110, branchY + 20 - lift);
      graphics.lineBetween(2116, branchY + 14 - lift, 2110, branchY + 20 - lift);
      // On to the door cylinder.
      graphics.moveTo(2110, branchY - lift);
      for (let s = 1; s <= segs; s += 1) {
        const t = s / segs;
        graphics.lineTo(2110 + (2228 - 2110) * t, bowY(t) - lift);
      }
    });

    graphics.__sag = sagPx;
  }

  pulseMachineryFault(assembly) {
    const { scene } = this;
    const targets = [
      assembly.machinery.airReservoir,
      assembly.machinery.airPipe,
      assembly.machinery.axlePulse,
    ].filter(Boolean);
    scene.tweens.add({
      targets,
      alpha: { from: 0.28, to: 1 },
      duration: 90,
      yoyo: true,
      repeat: 2,
    });
  }

  run(sprite) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (stage.drum) {
      this.runDrum(sprite, stage);
      return;
    }
    if (!puzzle.queue.length) {
      sfx.blocked();
      scene.game.events.emit('hud:toast', 'The timetable is blank. Punch an action first.');
      return;
    }
    puzzle.phase = 'executing';
    puzzle.executionStep = -1;
    scene.player.playInteraction();
    scene.player.frozen = true;
    sprite.setTexture('hand-generator-on');
    sfx.lever();
    this.refresh();

    const correct =
      puzzle.queue.length === stage.solution.length &&
      puzzle.queue.every((command, index) => command === stage.solution[index]);
    // The queue-judged instant complete survives only on the autoRun tutorial
    // stage (Phase I timing is unchanged). Junction-2 has no queue at all now:
    // the contact interlock alone can complete it.
    if (correct && stage.autoRun) {
      this.completeStage({ pendingActions: [...puzzle.queue] });
      return;
    }

    const executionLead = 360;
    if (stage.echoAssist) {
      scene.time.delayedCall(820, () => {
        if (puzzle.stageIndex !== stage.index || puzzle.phase !== 'executing') return;
        this.playEchoAssist(stage.echoAssist);
      });
    }

    puzzle.queue.forEach((command, index) => {
      const stepDelay = stage.echoAssist && index > 0
        ? executionLead + 640 + (index - 1) * 540
        : executionLead + index * 540;
      scene.time.delayedCall(stepDelay, () => {
        if (puzzle.stageIndex !== stage.index || puzzle.phase !== 'executing') return;
        puzzle.executionStep = index;
        puzzle.activeCommand = command;
        const correctSoFar = puzzle.queue.slice(0, index + 1).every(
          (candidate, candidateIndex) => candidate === stage.solution[candidateIndex],
        );
        this.applyAction(command, correctSoFar);
        this.refresh();
      });
    });

    const finishDelay = stage.echoAssist
      ? executionLead + 820 + Math.max(0, puzzle.queue.length - 1) * 540
      : executionLead + 160 + puzzle.queue.length * 540;
    scene.time.delayedCall(finishDelay, () => {
      if (puzzle.stageIndex !== stage.index || puzzle.phase !== 'executing') return;
      const sequenceCorrect =
        puzzle.queue.length === stage.solution.length &&
        puzzle.queue.every((command, index) => command === stage.solution[index]);
      if (sequenceCorrect) this.completeStage();
      else this.failStage(sprite);
    });
  }

  // ---------------------------------------------------------------- DRUM PILOT
  // Section III only, reached from run() when stage.drum exists.

  drumMachine() {
    const puzzle = this.scene.tutorialPuzzle;
    if (!puzzle.drumMachine) puzzle.drumMachine = { brakeSet: false, ventSet: false, doorSet: false };
    return puzzle.drumMachine;
  }

  drumDeviceX(command) {
    const found = this.scene.interactables.find(
      (it) => it.def.stage === this.scene.tutorialPuzzle.stageIndex
        && it.def.kind === 'drum-machine'
        && it.def.command === command,
    );
    return found ? found.sprite.x : null;
  }

  runDrum(sprite, stage) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const drum = ensureDrumState(puzzle, stage);
    if (!drum || drum.running) return;
    // RUN is never refused for being "incomplete" and never names a missing
    // card. An earlier version blocked the pull until all three commands were
    // present and printed which ones were absent — that is the input layer
    // solving the puzzle out loud. A one-card strip is a legal plan; it simply
    // does not open the door, and the machine is what says so.
    const pending = drum.slots.filter((slot) => slot && slot.status !== 'done');
    if (!pending.length) {
      sfx.blocked();
      scene.game.events.emit('hud:toast', 'The drum carries no new cards.');
      scene.pulseTutorialDevice(sprite, 0xe45a5f);
      return;
    }
    // Re-punching a jammed slot makes it pending again; clear any leftover char
    // so the run starts from a clean read of what is actually scheduled.
    drum.slots.forEach((slot) => {
      if (slot && slot.status === 'jammed') slot.status = 'pending';
    });
    drum.editing = false;
    drum.running = true;
    drum.activeSlot = -1;
    drum.hold = null;
    drum.waiting = -1;
    // Unscaled clock: a hitstop must not stretch the slots. See drum.js.
    drum.startedAt = window.performance.now();
    puzzle.phase = 'executing';
    // The player must be able to walk during a drum run — that is the whole
    // mechanic — so unlike the queue path we never freeze them.
    scene.player.frozen = false;
    sprite.setTexture('hand-generator-on');
    sfx.lever();
    this.killDrumTweens();
    this.refresh();
  }

  cancelDrum() {
    const puzzle = this.scene.tutorialPuzzle;
    const drum = puzzle.drum;
    if (!drum) return;
    drum.running = false;
    drum.editing = false;
    drum.hold = null;
    drum.activeSlot = -1;
    drum.waiting = -1;
  }

  killDrumTweens() {
    const assembly = this.stageAssemblies[this.scene.tutorialPuzzle.stageIndex];
    const m = assembly?.machinery;
    if (!m) return;
    [
      m.brakeLeft,
      m.brakeRight,
      m.pressureBar,
      m.gaugeNeedle,
      m.powerLamp,
      m.motor,
      m.flywheel,
      m.flywheelSpoke,
      m.bogieFrame,
      m.airReservoir,
      m.airPipe,
      m.ventValve,
      m.ventPlume,
      m.doorLeaf,
    ]
      .filter(Boolean)
      .forEach((target) => this.scene.tweens.killTweensOf(target));
  }

  // Driven from update() on the real clock, so slot boundaries stay put even if
  // a hitstop scales scene.time. One slot is active at a time; crossing a
  // boundary always retires the previous slot's pending hold.
  updateDrum(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.drum) return;
    const drum = puzzle.drum;
    if (!drum || !drum.running) return;

    const elapsed = window.performance.now() - drum.startedAt;
    const index = Math.floor(elapsed / stage.drum.slotMs);

    // A frame hitch or a backgrounded tab can advance elapsed past several slot
    // boundaries at once. Step through every one of them: a slot that is never
    // entered would neither fire nor char, and its card would eject unmarked
    // with no way for the player to tell what the machine did.
    while (index !== drum.activeSlot) {
      // Leaving a slot with an unfinished hold chars it. This is the mutual
      // exclusion that keeps a VENT hold from bleeding into the DOOR slot.
      if (drum.hold && !drum.hold.resolved) this.jamSlot(drum.hold.index, drum.hold.command);
      drum.hold = null;
      const next = Math.min(drum.activeSlot + 1, index);
      drum.activeSlot = next;
      if (next < stage.drum.slots) this.enterSlot(next, stage, drum);
      else break;
    }

    if (drum.hold && !drum.hold.resolved) this.updateDrumHold(delta, stage, drum);

    if (index >= stage.drum.slots) {
      drum.running = false;
      drum.activeSlot = -1;
      this.finishDrumRun();
    }
  }

  enterSlot(index, stage, drum) {
    const slot = drum.slots[index];
    this.refresh();
    if (!slot || slot.status === 'done') return; // empty and finished slots pass silently
    const command = slot.command;
    const blocker = causalBlocker(this.drumMachine(), command);
    if (blocker) {
      this.jamSlot(index, command);
      return;
    }
    if (!needsPresence(stage, command)) {
      this.commitSlot(index, command);
      return;
    }
    // Presence is sampled once, here, at the instant the pointer enters the
    // slot. Per-frame sampling would fail a player walking past at the wrong
    // moment for reasons they could not see.
    const deviceX = this.drumDeviceX(command);
    if (deviceX === null || !isPlayerAt(this.scene, deviceX, stage.drum.presenceRadius)) {
      this.jamSlot(index, command);
      return;
    }
    const hold = holdMsFor(stage, command);
    if (!hold) {
      this.commitSlot(index, command);
      return;
    }
    // `waiting` is what the rest of the game reads to know a slot is open and
    // asking for the player's hand: the valve prompt at the machine, the lit
    // slot on the drum face, and the parked pointer all key off it. Setting
    // `hold` alone leaves the player holding E with nothing telling them to.
    drum.waiting = index;
    drum.hold = {
      index, command, deviceX, elapsed: 0, required: hold, resolved: false, grace: DRUM_HOLD_GRACE_MS,
    };
  }

  updateDrumHold(delta, stage, drum) {
    const hold = drum.hold;
    const stillThere = isPlayerAt(this.scene, hold.deviceX, stage.drum.presenceRadius);
    const held = this.scene.inputState?.interactHeld;
    // The player arrived in time; they get a reaction window to find the key.
    // Charring the instant the slot opens would punish being one frame late to
    // press E, which reads as the machine cheating.
    if (stillThere && !held && hold.elapsed === 0 && hold.grace > 0) {
      hold.grace -= delta;
      return;
    }
    if (!stillThere || !held) {
      hold.resolved = true;
      this.jamSlot(hold.index, hold.command);
      return;
    }
    hold.elapsed += delta;
    if (hold.elapsed >= hold.required) {
      hold.resolved = true;
      this.commitSlot(hold.index, hold.command);
    }
  }

  commitSlot(index, command) {
    const drum = this.scene.tutorialPuzzle.drum;
    const slot = drum.slots[index];
    if (slot) slot.status = 'done';
    if (drum.waiting === index) drum.waiting = -1;
    const machine = this.drumMachine();
    if (command === 'brake') machine.brakeSet = true;
    if (command === 'vent') machine.ventSet = true;
    if (command === 'door') machine.doorSet = true;
    this.applyDrumAction(command);
    this.refresh();
  }

  // A refused card jams rather than chars. The distinction matters: the card is
  // still legible in the slot, so the player can read back the plan that failed
  // instead of looking at a blank they have to reconstruct from memory.
  jamSlot(index, command) {
    const drum = this.scene.tutorialPuzzle.drum;
    const slot = drum.slots[index];
    if (slot) slot.status = 'jammed';
    if (drum.waiting === index) drum.waiting = -1;
    this.playDrumRefusal(command);
    this.refresh();
  }

  // Absolute targets only. A re-run may replay a command whose machine state is
  // already set, so every action *sets* state rather than flipping it — a toggle
  // would let a player lose progress by succeeding.
  applyDrumAction(command) {
    const { scene } = this;
    const assembly = this.stageAssemblies[scene.tutorialPuzzle.stageIndex];
    const m = assembly?.machinery;
    if (!m) return;
    sfx.press();
    if (command === 'brake') {
      if (m.brakeShoe) {
        scene.tweens.killTweensOf(m.brakeShoe);
        scene.tweens.add({ targets: m.brakeShoe, x: m.wheelX - 48, duration: 260, ease: 'Cubic.easeOut' });
      }
      if (m.bogie) {
        scene.tweens.killTweensOf(m.bogie);
        scene.tweens.add({ targets: m.bogie, y: m.initialBogieY + 13, duration: 260, ease: 'Cubic.easeOut' });
      }
    }
    if (command === 'vent') {
      if (m.ventValve) {
        scene.tweens.killTweensOf(m.ventValve);
        scene.tweens.add({ targets: m.ventValve, angle: -64, duration: 240, ease: 'Cubic.easeOut' });
      }
      if (m.gaugeNeedle) {
        scene.tweens.killTweensOf(m.gaugeNeedle);
        scene.tweens.add({ targets: m.gaugeNeedle, angle: -52, duration: 420, ease: 'Cubic.easeOut' });
      }
    }
    if (command === 'door') {
      // The door had no real visual before this pilot — only a lamp. It needs
      // one, because a jammed door has to be legible as a door that tried.
      if (m.doorLeaf) {
        scene.tweens.killTweensOf(m.doorLeaf);
        scene.tweens.add({ targets: m.doorLeaf, y: m.doorOpenY, duration: 460, ease: 'Cubic.easeOut' });
      }
      if (m.powerLamp) m.powerLamp.setFillStyle(0x8fd7a4, 1).setScale(1.55);
    }
  }

  // Failure speaks through the machine: a door that lifted a hand's width and
  // dropped, a valve that rattled dry, a needle that did not move. No text names
  // the right slot or the right order.
  playDrumRefusal(command) {
    const { scene } = this;
    const assembly = this.stageAssemblies[scene.tutorialPuzzle.stageIndex];
    const m = assembly?.machinery;
    sfx.blocked();
    if (!m) return;
    if (command === 'door' && m.doorLeaf) {
      scene.tweens.killTweensOf(m.doorLeaf);
      scene.tweens.add({
        targets: m.doorLeaf,
        y: m.doorClosedY - 14,
        duration: 170,
        ease: 'Cubic.easeOut',
        yoyo: true,
      });
    }
    if (command === 'vent' && m.ventValve) {
      scene.tweens.killTweensOf(m.ventValve);
      scene.tweens.add({
        targets: m.ventValve,
        angle: m.ventValve.angle - 7,
        duration: 70,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: 2,
      });
    }
    if (command === 'brake' && m.brakeShoe) {
      scene.tweens.killTweensOf(m.brakeShoe);
      scene.tweens.add({
        targets: m.brakeShoe,
        x: m.brakeShoe.x - 5,
        duration: 60,
        yoyo: true,
        repeat: 2,
      });
    }
  }

  finishDrumRun() {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const drum = puzzle.drum;
    const stage = this.currentStage();
    const runSprite = scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex && it.def.kind === 'timetable-run',
    );
    if (runSprite) runSprite.sprite.setTexture('hand-generator');

    // `some`, not `find`: a re-punch may leave the jammed original in place and
    // put the retry in a different slot. Asking only for the first slot bearing
    // that command would keep reading the jammed one and the stage could never
    // close, even with every command fired.
    const solved = stage.solution.every(
      (command) => drum.slots.some((s) => s?.command === command && s.status === 'done'),
    );
    if (solved) {
      puzzle.phase = 'programming';
      this.completeStage();
      return;
    }
    // Local recovery: the stage never resets. Jammed slots stay jammed and
    // re-punchable; successful slots keep their machine state.
    puzzle.phase = 'programming';
    scene.player.frozen = false;
    scene.game.events.emit('hud:toast', 'The cards eject. The scorched ones can be punched again.');
    this.refresh();
  }

  // Any three-card code is punchable. No pre-validation of any kind.
  //
  // This used to refuse two things: a command that was already on the drum, and
  // a slot that had already turned. Both were the input layer deciding the
  // player's plan was wrong before the machine had a chance to disagree — and
  // one of the toasts printed the correct slot number outright. No shipped
  // free-entry puzzle does this. The rule now is grammar only: three cards fill
  // the drum, and any arrangement of BRAKE/VENT/DOOR is a legal program,
  // including all three the same. Wrongness is discovered by watching the
  // machine fail at the step that fails.
  punchDrumSlot(command, sprite) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    const drum = ensureDrumState(puzzle, stage);
    if (!drum || drum.running) return;
    // firstOpenSlot, not the first null: a jammed card is scrap and its slot has
    // to be re-punchable, or a stage where every card jammed would have nowhere
    // left to write and RESET would be the only way forward.
    const next = firstOpenSlot(drum);
    if (next < 0) {
      // Full drum is a physical fact, not a judgement: there is no fourth card
      // slot to strike into. RESET is the way back.
      sfx.blocked();
      scene.pulseTutorialDevice(sprite, 0xe4b45a);
      scene.game.events.emit('hud:toast', 'The strip is full. Three cards, three slots.');
      return;
    }
    drum.slots[next] = makeSlot(command);
    puzzle.phase = 'programming';
    scene.player.playInteraction();
    scene.pulseTutorialDevice(sprite, COMMANDS[command].color);
    sfx.press();
    scene.applyHitstop(45, 0.18);
    this.refresh();
  }

  // Which of the three enamel keys the press is set to. LEFT/RIGHT moves the
  // selector; it is a letter picker, not a time index, so there is no unit
  // conversion for the player to do.
  pressCommand() {
    const puzzle = this.scene.tutorialPuzzle;
    const keys = DRUM_KEYS;
    const index = ((puzzle.drumKey ?? 0) % keys.length + keys.length) % keys.length;
    return keys[index];
  }

  // Absolute pick, not a cycle. Three keys and three number keys means the
  // player never has to press twice to undo an overshoot.
  selectPressKey(index) {
    const puzzle = this.scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.drum) return false;
    if (index < 0 || index >= DRUM_KEYS.length) return false;
    const drum = ensureDrumState(puzzle, stage);
    if (!drum || drum.running) return false;
    if (puzzle.drumKey === index) return false;
    puzzle.drumKey = index;
    sfx.press();
    this.refresh();
    return true;
  }

  /**
   * Section III reset is deliberately local: it clears the six cards and
   * returns this room's brake/air/door state to its starting pose without
   * moving the player or touching any earlier completed section. It also acts
   * as an emergency stop while the drum is turning, so a visibly bad plan never
   * forces the player to wait out the rest of the revolution.
   */
  resetDrum(sprite) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage.drum) return;

    this.cancelDrum();
    this.killDrumTweens();
    puzzle.drum = null;
    ensureDrumState(puzzle, stage);
    puzzle.drumMachine = { brakeSet: false, ventSet: false, doorSet: false };
    puzzle.phase = 'programming';
    puzzle.queue = [];
    puzzle.executionStep = -1;
    puzzle.activeCommand = null;
    scene.player.frozen = false;
    scene.registry.set('tutorialPowerState', 'junction-3-ready');
    this.resetMachinery(puzzle.stageIndex);

    const run = scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex && it.def.kind === 'timetable-run',
    );
    run?.sprite.setTexture('hand-generator-off');
    scene.player.playInteraction();
    if (sprite) scene.pulseTutorialDevice(sprite, 0xe45a5f);
    sfx.lever();
    scene.applyHitstop(45, 0.18);
    scene.game.events.emit('hud:toast', 'The strip is blank again. The machines are back as you found them.');
    this.refresh();
  }

  beginEchoSync(stageIndex, nodeIndex) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const assembly = this.stageAssemblies[stageIndex];
    const stage = this.config.stages[stageIndex];
    const node = stage.echoSync?.[nodeIndex];
    if (!assembly?.echo || !node) return;

    const previousX = nodeIndex === 0
      ? stage.echoStartX
      : stage.echoSync[nodeIndex - 1].x;
    puzzle.phase = 'echo-travel';
    puzzle.echoSyncIndex = nodeIndex;
    puzzle.echoWindowUntil = 0;
    puzzle.activeCommand = null;
    scene.tweens.killTweensOf([assembly.echo, assembly.echoGlow, assembly.echoRail]);
    assembly.echo
      .setPosition(previousX, 720)
      .setVisible(true)
      .setTexture('player-walk-1')
      .setAlpha(0.76)
      .setScale(1.2);
    assembly.echoGlow?.setPosition(previousX, 670).setVisible(true).setAlpha(0.24).setScale(1);
    assembly.echoRail?.setPosition(previousX, 742).setVisible(true).setAlpha(0.46).setScale(1);
    assembly.echoNodes.forEach((candidate, index) => {
      scene.tweens.killTweensOf([candidate.ring, candidate.core]);
      candidate.ring.setScale(index < nodeIndex ? 1.08 : 1).setAlpha(index < nodeIndex ? 0.72 : 0.42);
      candidate.core.setAlpha(index < nodeIndex ? 0.9 : 0.28);
      candidate.beam.setAlpha(index < nodeIndex ? 0.38 : 0.12);
    });

    for (let afterIndex = 0; afterIndex < 5; afterIndex += 1) {
      scene.time.delayedCall(afterIndex * 130, () => {
        if (puzzle.stageIndex !== stageIndex || puzzle.phase !== 'echo-travel') return;
        const afterimage = this.track(
          scene.add
            .sprite(assembly.echo.x, 720, 'player-walk-1')
            .setOrigin(0.5, 1)
            .setTint(0x75d4cd)
            .setAlpha(0.26)
            .setScale(1.12)
            .setBlendMode(Phaser.BlendModes.ADD),
          59,
        );
        scene.tweens.add({
          targets: afterimage,
          alpha: 0,
          duration: 580,
          onComplete: () => afterimage.destroy(),
        });
      });
    }

    scene.tweens.add({
      targets: [assembly.echo, assembly.echoGlow, assembly.echoRail],
      x: node.x,
      duration: 820,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (puzzle.stageIndex !== stageIndex || puzzle.phase !== 'echo-travel') return;
        if (nodeIndex === 0 && stage.echoAssist && !puzzle.echoVented) {
          puzzle.echoVented = true;
          this.applyAction(stage.echoAssist, true);
        }
        puzzle.phase = 'echo-sync';
        puzzle.activeCommand = node.command;
        puzzle.echoWindowUntil = scene.time.now + node.windowMs;
        assembly.echo.setTexture('player-interact-1').setAlpha(0.96).setScale(1.28);
        assembly.echoGlow?.setAlpha(0.38).setScale(1.2);
        assembly.echoRail?.setAlpha(0.72);
        const visual = assembly.echoNodes[nodeIndex];
        visual.ring.setAlpha(1).setScale(1.18);
        visual.core.setAlpha(1).setScale(1.4);
        visual.beam.setAlpha(0.64);
        scene.tweens.add({
          targets: [visual.ring, visual.core],
          scale: '+=0.14',
          duration: 260,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        scene.game.events.emit(
          'hud:toast',
          node.command === 'power'
            ? 'PAST is holding the lower clutch—reach the axle motor above while the contact is bright.'
            : 'PAST has reached the draft latch—meet it at the coupler control before the contact fades.',
        );
        this.refresh();
      },
    });
    this.refresh();
  }

  playEchoAssist(command, onComplete = () => {}) {
    const { scene } = this;
    const assembly = this.stageAssemblies[scene.tutorialPuzzle.stageIndex];
    if (!assembly.echo) return;
    const startX = assembly.stage.echoStartX ?? assembly.stage.echoX - 180;
    assembly.echo
      .setPosition(startX, 720)
      .setVisible(true)
      .setAlpha(0.68)
      .setTexture('player-walk-1')
      .setScale(1.18)
      .setFlipX(false);
    assembly.echoGlow?.setPosition(startX, 670).setVisible(true).setAlpha(0.22).setScale(1);
    assembly.echoRail?.setPosition(startX, 742).setVisible(true).setAlpha(0.42).setScale(1);
    for (let index = 0; index < 5; index += 1) {
      scene.time.delayedCall(index * 150, () => {
        const afterimage = this.track(
          scene.add
            .sprite(assembly.echo.x, 720, 'player-walk-1')
            .setOrigin(0.5, 1)
            .setTint(0x75d4cd)
            .setAlpha(0.28)
            .setScale(1.1)
            .setBlendMode(Phaser.BlendModes.ADD),
          59,
        );
        scene.tweens.add({
          targets: afterimage,
          alpha: 0,
          duration: 620,
          onComplete: () => afterimage.destroy(),
        });
      });
    }
    scene.tweens.add({
      targets: [assembly.echo, assembly.echoGlow, assembly.echoRail],
      x: assembly.stage.echoX,
      duration: 880,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        assembly.echo.setTexture('player-interact-1').setAlpha(0.94);
        assembly.echoGlow?.setAlpha(0.34).setScale(1.15);
        assembly.echoRail?.setAlpha(0.64);
        scene.tweens.add({
          targets: assembly.echo,
          scale: 1.34,
          duration: 180,
          yoyo: true,
          onComplete: () => assembly.echo.setAlpha(0.62).setScale(1.18),
        });
        this.applyAction(command, true);
        scene.time.delayedCall(520, onComplete);
      },
    });
    scene.game.events.emit('hud:toast', 'The remembered self crosses below and holds the air valve open.');
  }

  applyAction(command, correctSoFar) {
    const { scene } = this;
    const machinery = this.stageAssemblies[scene.tutorialPuzzle.stageIndex].machinery;
    const color = correctSoFar ? COMMANDS[command].color : 0xe45a5f;
    scene.cameras.main.shake(100, correctSoFar ? 0.0018 : 0.004);
    sfx.press();
    this.animateMechanicalTransfer(command, machinery, color);

    const landImpact = (duration = 55, scale = 0.12) => {
      if (correctSoFar) scene.applyHitstop(duration, scale);
    };

    if (command === 'brake') {
      scene.tweens.add({ targets: machinery.brakeLeft, x: machinery.wheelX - 48, duration: 260, ease: 'Quad.easeOut' });
      scene.tweens.add({
        targets: machinery.brakeRight,
        x: machinery.wheelX + 48,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => landImpact(48, 0.16),
      });
      scene.tweens.add({ targets: machinery.gaugeNeedle, angle: 28, duration: 380, ease: 'Back.easeOut' });
      if (machinery.bogieFrame) {
        scene.tweens.add({
          targets: machinery.bogieFrame,
          y: machinery.initialBogieY + 13,
          duration: 420,
          ease: 'Bounce.easeOut',
        });
        scene.tweens.add({
          targets: machinery.airReservoir,
          y: machinery.airReservoir.y + 7,
          duration: 420,
          ease: 'Bounce.easeOut',
        });
        for (let index = 0; index < 3; index += 1) {
          const side = index % 2 ? -1 : 1;
          const spark = this.track(
            scene.add
              .circle(machinery.wheelX + side * 48, machinery.wheelY + Phaser.Math.Between(-18, 18), 2, 0xe3a85e, 0.9)
              .setBlendMode(Phaser.BlendModes.ADD),
            60,
          );
          scene.tweens.add({
            targets: spark,
            x: spark.x + side * Phaser.Math.Between(12, 34),
            y: spark.y + Phaser.Math.Between(12, 42),
            alpha: 0,
            duration: Phaser.Math.Between(280, 520),
            onComplete: () => spark.destroy(),
          });
        }
      }
      if (machinery.trolley) scene.tweens.add({ targets: machinery.trolley, x: machinery.initialTrolleyX + 76, duration: 520, ease: 'Back.easeOut' });
    } else if (command === 'vent') {
      scene.tweens.add({ targets: machinery.pressureBar, scaleY: 0.08, duration: 420, ease: 'Expo.easeIn' });
      scene.tweens.add({
        targets: machinery.gaugeNeedle,
        angle: -64,
        duration: 520,
        ease: 'Cubic.easeOut',
        onComplete: () => landImpact(52, 0.14),
      });
      if (machinery.airReservoir) {
        scene.tweens.add({
          targets: machinery.airReservoir,
          scaleX: 0.56,
          alpha: 0.58,
          duration: 620,
          ease: 'Cubic.easeOut',
        });
        scene.tweens.add({ targets: machinery.airPipe, alpha: 0.16, duration: 620 });
      }
      for (let i = 0; i < 3; i += 1) {
        // The overhead run is a Graphics with no bounds, so it publishes its own
        // span; the underfloor rectangle keeps being measured from its width.
        const pipeOriginX = machinery.airPipe?.__spanWidth
          ? machinery.airPipe.__spanLeft + i * machinery.airPipe.__spanWidth * 0.16
          : machinery.airPipe
            ? machinery.airPipe.x - machinery.airPipe.displayWidth * 0.4 + i * machinery.airPipe.displayWidth * 0.16
            : machinery.pressureBar.x;
        const pipeOriginY = machinery.airPipe?.__hissY
          ?? machinery.airPipe?.y
          ?? machinery.pressureBar.y - 24;
        const puff = this.track(scene.add.circle(pipeOriginX, pipeOriginY, 3 + i, 0xbcd5dc, 0.32), 58);
        scene.tweens.add({
          targets: puff,
          x: puff.x + Phaser.Math.Between(-32, 32),
          y: puff.y - 30 - i * 7,
          alpha: 0,
          duration: 420 + i * 70,
          onComplete: () => puff.destroy(),
        });
      }
    } else if (command === 'power') {
      machinery.powerLamp.setFillStyle(color, 1);
      scene.tweens.add({
        targets: machinery.motor,
        angle: 360,
        duration: 520,
        ease: 'Back.easeOut',
        onComplete: () => landImpact(62, 0.1),
      });
      scene.tweens.add({ targets: [machinery.flywheel, machinery.flywheelSpoke], angle: '+=360', duration: 520, ease: 'Cubic.easeOut' });
      if (machinery.wheelSpokeLeft) {
        scene.tweens.add({
          targets: [machinery.wheelSpokeLeft, machinery.wheelSpokeRight],
          angle: '+=720',
          duration: 980,
          ease: 'Cubic.easeOut',
        });
        scene.tweens.add({
          targets: machinery.axlePulse,
          alpha: { from: 0.08, to: 0.72 },
          scaleY: { from: 0.7, to: 1.5 },
          duration: 220,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.easeInOut',
        });
      }
    } else if (command === 'release' && machinery.trolley) {
      scene.tweens.add({
        targets: machinery.trolley,
        x: machinery.initialTrolleyX + 146,
        duration: 520,
        ease: 'Back.easeOut',
        onComplete: () => landImpact(55, 0.12),
      });
    } else if (command === 'release' && machinery.couplerLeft) {
      scene.tweens.add({ targets: machinery.couplerLeft, x: machinery.couplerLeft.x - 10, duration: 360, ease: 'Back.easeOut' });
      scene.tweens.add({
        targets: machinery.couplerRight,
        x: machinery.couplerRight.x + 10,
        duration: 360,
        ease: 'Back.easeOut',
        onComplete: () => landImpact(58, 0.11),
      });
    } else if (command === 'couple' && machinery.couplerLeft) {
      scene.tweens.add({ targets: machinery.couplerLeft, x: machinery.couplerLeft.x - 34, duration: 460, ease: 'Back.easeOut' });
      scene.tweens.add({
        targets: machinery.couplerRight,
        x: machinery.couplerRight.x + 34,
        duration: 460,
        ease: 'Back.easeOut',
        onComplete: () => landImpact(65, 0.09),
      });
    } else if (command === 'door') {
      machinery.powerLamp.setFillStyle(color, 1).setScale(1.55);
    }
  }

  animateMechanicalTransfer(command, machinery, color) {
    const path = machinery.controlPaths?.[command];
    if (!path) return;
    const { scene } = this;
    const pulse = this.track(
      scene.add.circle(path.startX, path.startY, 5, color, 1).setBlendMode(Phaser.BlendModes.ADD),
      61,
    );
    scene.tweens.add({
      targets: pulse,
      y: path.elbowY,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => {
        scene.tweens.add({
          targets: pulse,
          x: path.targetX,
          duration: 260,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            scene.tweens.add({
              targets: pulse,
              y: path.targetY,
              scale: 1.8,
              alpha: 0,
              duration: 220,
              ease: 'Back.easeOut',
              onComplete: () => pulse.destroy(),
            });
          },
        });
      },
    });
  }

  animateTicketPunch(assembly, command) {
    if (!assembly) return;
    const { scene } = this;
    const color = COMMANDS[command].color;
    scene.tweens.killTweensOf([assembly.punchHead, assembly.paperStrip]);
    assembly.punchHead.setFillStyle(color, 1).setY(TIMETABLE_FACE.punchY);
    assembly.paperStrip.setFillStyle(0xe5cf9b, 0.9).setScale(1, 1);
    scene.tweens.add({
      targets: assembly.punchHead,
      y: 369,
      duration: 80,
      yoyo: true,
      hold: 55,
      ease: 'Quad.easeIn',
      onComplete: () => assembly.punchHead.setFillStyle(0x7f6540, 1),
    });
    scene.tweens.add({
      targets: assembly.paperStrip,
      y: 420,
      scaleX: 1.04,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });
    const chad = this.track(
      scene.add
        .circle(assembly.punchHead.x, TIMETABLE_FACE.paperY - 4, 2, color, 0.95)
        .setBlendMode(Phaser.BlendModes.ADD),
      62,
    );
    scene.tweens.add({
      targets: chad,
      x: chad.x - 10,
      y: chad.y + 22,
      angle: 160,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeIn',
      onComplete: () => chad.destroy(),
    });
  }

  setCompletedMachinery(assembly) {
    const { machinery, stage } = assembly;
    // Rooms without a timetable strip (II/III/IV) keep their own completed
    // poses; the generic strip choreography below would only crash on them.
    if (!stage.solution) return;
    const vented = stage.solution.includes('vent') || stage.echoAssist === 'vent';
    machinery.brakeLeft.setX(machinery.wheelX - 48);
    machinery.brakeRight.setX(machinery.wheelX + 48);
    machinery.gaugeNeedle.setAngle(vented ? -64 : 28);
    machinery.pressureBar.setScale(1, vented ? 0.08 : 1);
    if (machinery.bogieFrame) machinery.bogieFrame.setY(machinery.initialBogieY + 13);
    if (machinery.airReservoir) {
      machinery.airReservoir
        .setY(machinery.initialReservoirY + 7)
        .setScale(vented ? 0.56 : 1, 1)
        .setAlpha(vented ? 0.58 : 0.92);
      machinery.airPipe.setAlpha(vented ? 0.16 : 0.78);
    }
    if (stage.solution.some((command) => ['power', 'door'].includes(command))) {
      machinery.powerLamp.setFillStyle(0x75d4cd, 1).setScale(1.12);
    }
    if (machinery.trolley) machinery.trolley.setX(machinery.initialTrolleyX + 146);
    if (machinery.couplerLeft && stage.solution.includes('couple')) {
      machinery.couplerLeft.setX(machinery.initialCouplerLeftX - 34);
      machinery.couplerRight.setX(machinery.initialCouplerRightX + 34);
    }
    this.scene.tweens.killTweensOf([
      machinery.flywheel,
      machinery.flywheelSpoke,
      machinery.wheelSpokeLeft,
      machinery.wheelSpokeRight,
      machinery.powerLamp,
      machinery.axlePulse,
    ].filter(Boolean));
    machinery.powerLamp.setAlpha(0.86);
    machinery.axlePulse?.setAlpha(0.22).setScale(1);
  }

  failStage(runSprite) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stageIndex = puzzle.stageIndex;
    puzzle.phase = 'fault';
    puzzle.faultUntil = scene.time.now + 1050;
    scene.clearHitstop();
    scene.pulseTutorialVignette(0x8e2634, 1, 420);
    runSprite.setTexture('hand-generator-off');
    scene.player.frozen = false;
    scene.cameras.main.shake(220, 0.006);
    sfx.blocked();
    scene.registry.set('tutorialPowerState', 'error');
    if (FAIL_LINES[stageIndex]) scene.game.events.emit('hud:toast', FAIL_LINES[stageIndex]);
    scene.time.delayedCall(1050, () => {
      if (puzzle.stageIndex !== stageIndex || puzzle.phase !== 'fault') return;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      scene.registry.set('tutorialPowerState', `junction-${stageIndex + 1}-ready`);
      this.resetMachinery(stageIndex);
      this.refresh();
    });
  }

  completeStage({ pendingActions = [] } = {}) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const completedIndex = puzzle.stageIndex;
    const last = completedIndex === this.config.stages.length - 1;
    puzzle.phase = 'opening';
    scene.player.frozen = true;
    scene.registry.set('tutorialPowerState', last ? 'complete' : `junction-${completedIndex + 1}-complete`);
    // Junction-2 no longer carries a runX (its RUN handle is demolished); the
    // score popup then centres on the room instead of reading undefined.
    const completedStage = this.currentStage();
    scene.addScore(
      last ? 75 : 30,
      completedStage.runX ?? (completedStage.startX + completedStage.endX) / 2,
      370,
    );
    sfx.checkpoint();
    scene.game.events.emit(
      'hud:toast',
      last ? 'The coupler unloads. Car 01 is free.' : this.successLine(completedIndex),
    );

    scene.playTutorialCompletionReveal(completedIndex, (finishMachineReveal) => {
      if (!pendingActions.length) {
        finishMachineReveal();
        return;
      }
      pendingActions.forEach((command, actionIndex) => {
        scene.time.delayedCall(actionIndex * 430, () => {
          if (puzzle.stageIndex !== completedIndex || puzzle.phase !== 'opening') return;
          puzzle.executionStep = actionIndex;
          puzzle.activeCommand = command;
          this.applyAction(command, true);
        });
      });
      scene.time.delayedCall((pendingActions.length - 1) * 430 + 620, finishMachineReveal);
    }, () => {
      scene.playTutorialGateOpen(completedIndex, () => {
        scene.finishTutorialCompletionReveal();
        if (last) {
          puzzle.phase = 'departure';
          puzzle.serviceActive = true;
          scene.registry.set('tutorialPowerState', 'departure');
          scene.playPrologueDeparture(() => {
            puzzle.phase = 'complete';
            scene.registry.set('tutorialPowerState', 'complete');
            scene.tutorialExitBlockedNotified = false;
            this.refresh();
          });
        } else {
          // Stop the drum before the index moves: updateDrum() reads the new
          // stage, and a run still marked running would tick against it.
          this.cancelDrum();
          puzzle.drum = null;
          puzzle.stageIndex = completedIndex + 1;
          puzzle.phase = 'approach';
          puzzle.queue = [];
          puzzle.executionStep = -1;
          puzzle.activeCommand = null;
          puzzle.echoSyncIndex = -1;
          puzzle.echoWindowUntil = 0;
          puzzle.echoVented = false;
          puzzle.pressure = this.config.stages[puzzle.stageIndex].pressureHold?.start ?? 100;
          puzzle.pressureVenting = false;
          puzzle.pressureBraked = false;
          puzzle.pressureSettled = false;
          puzzle.pressureHintLast = undefined;
          puzzle.echoGateIndex = 0;
          puzzle.echoGatesCleared = [];
          puzzle.echoAtValve = false;
          scene.player.frozen = false;
          scene.registry.set('tutorialPowerState', `junction-${puzzle.stageIndex + 1}-approach`);
        }
        this.refresh();
        scene.refreshTutorialStageVisuals();
      });
    });
  }

  successLine(index) {
    return [
      'The timetable becomes motion. The first partition releases.',
      'The latch holds; the contactor closes and the circuit takes power.',
      'The brake pipe exhales and the pneumatic door slides free.',
      'The trolley rolls into the missing counterweight position.',
      'The axle motor wakes beneath your feet.',
    ][index];
  }

  resetMachinery(index) {
    const machinery = this.stageAssemblies[index].machinery;
    machinery.brakeLeft.setX(machinery.wheelX - 69);
    machinery.brakeRight.setX(machinery.wheelX + 69);
    machinery.pressureBar.setScale(1);
    machinery.gaugeNeedle.setAngle(-38);
    machinery.powerLamp.setFillStyle(0x405159, 0.9).setScale(1);
    machinery.motor.setAngle(0);
    machinery.flywheel.setAngle(0);
    machinery.flywheelSpoke.setAngle(0);
    machinery.bogieFrame?.setY(machinery.initialBogieY);
    machinery.airReservoir
      ?.setY(machinery.initialReservoirY)
      .setScale(1)
      .setAlpha(0.92);
    machinery.airPipe?.setAlpha(0.78);
    machinery.wheelSpokeLeft?.setAngle(0);
    machinery.wheelSpokeRight?.setAngle(0);
    machinery.axlePulse?.setAlpha(0.08).setScale(1);
    if (machinery.trolley) machinery.trolley.setX(machinery.initialTrolleyX);
    if (machinery.couplerLeft) {
      machinery.couplerLeft.setX(machinery.initialCouplerLeftX);
      machinery.couplerRight.setX(machinery.initialCouplerRightX);
    }
  }

  currentStage() {
    const index = this.scene.tutorialPuzzle.stageIndex;
    return { ...this.config.stages[index], index };
  }

  /**
   * Integrates line pressure for section V. Called every frame with the frame
   * delta so the bleed reads as a continuous physical process rather than a
   * state flip. The gauge needle follows the real value, which is what makes the
   * mechanic legible without any text.
   */
  update(time, delta = 16) {
    const puzzle = this.scene.tutorialPuzzle;
    this.updateContactInterlock(delta);
    this.updateAirCircuitStage(delta);
    this.updateWeightTransferStage(delta);
    this.updateBogieDiagnosisStage(delta);
    this.updateEchoReplayStage(delta);
    this.updateDrum(delta);
    if (puzzle.phase === 'approach') {
      const stage = this.currentStage();
      if (this.scene.player.x >= stage.startX + 72) {
        puzzle.phase = 'idle';
        this.scene.registry.set('tutorialPowerState', `junction-${puzzle.stageIndex + 1}-ready`);
        this.refresh();
        this.scene.refreshTutorialStageVisuals();
      }
      return;
    }
    if (puzzle.phase === 'echo-sync' && time > puzzle.echoWindowUntil) {
      const stageIndex = puzzle.stageIndex;
      const nodeIndex = puzzle.echoSyncIndex;
      puzzle.phase = 'echo-retry';
      puzzle.activeCommand = null;
      sfx.blocked();
      this.scene.applyHitstop(70, 0.08);
      this.scene.pulseTutorialVignette(0x8e2634, 0.98, 360);
      this.scene.cameras.main.shake(140, 0.0035);
      this.scene.game.events.emit('hud:toast', 'The two moments slipped apart. PAST circles back to the same contact.');
      this.scene.time.delayedCall(520, () => {
        if (puzzle.stageIndex === stageIndex && puzzle.phase === 'echo-retry') {
          this.beginEchoSync(stageIndex, nodeIndex);
        }
      });
      this.refresh();
      return;
    }
  }

  // Created on demand rather than in the constructor so the shared network
  // exists exactly once per session, and so stages without an airCircuit
  // block never allocate one. The airNetwork instance is THE shared one the
  // later phases read (SYSTEM ARC LOCK §2) — never a per-stage copy.
  ensureAirCircuitState(stage) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!stage?.airCircuit) return null;
    if (!puzzle.airCircuit) {
      puzzle.airNetwork = createAirNetwork();
      puzzle.airCircuit = createLocalAirCircuit({ airNetwork: puzzle.airNetwork });
    }
    return puzzle.airCircuit;
  }

  // Runs every frame while the player is in Section III. Owns enter timing,
  // the bleed hold, event draining into world feedback, the steady-state
  // redraw and the completion hand-off. The physics itself lives in the two
  // frozen pure modules; this layer only wires them to the scene.
  updateAirCircuitStage(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.airCircuit) return;
    if (['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return;
    const phase = this.ensureAirCircuitState(stage);
    if (!phase) return;

    if (this.airCircuitQaFreeze) {
      // The ?qa=phase3 route drove the live instance to a fixture state. Hold
      // it exactly; the steady-state redraw still runs so the frame always
      // shows the fixture snapshot.
      this.refreshAirCircuitVisuals(phase.snapshot());
      return;
    }

    // Enter once the player steps past the room threshold.
    if (scene.player.x >= stage.startX + 10) phase.enter();

    // Hand on the wheel: the bleed is a HOLD. Releasing E or walking off the
    // valve closes it on the next frame — the same long-hold gesture the
    // relay work taught, carried forward unchanged.
    const radius = stage.airCircuit.interactRadius ?? 62;
    const valve = scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex
        && it.def.kind === 'air-lock'
        && it.def.command === 'bleed',
    );
    const atValve = valve
      ? Math.abs(valve.sprite.x - scene.player.x) < radius && scene.player.lane === valve.def.lane
      : false;
    const bleedHeld = Boolean(scene.inputState?.interactHeld && atValve);

    const wasVenting = phase.snapshot().door.venting;
    phase.update(delta, { bleedHeld });
    const snap = phase.snapshot();
    if (wasVenting && !snap.door.venting && !snap.stageComplete) {
      // The valve clunks shut instead of hissing. Nothing is written to the
      // HUD for it.
      sfx.lever();
    }

    phase.drainEvents().forEach((evt) => this.handleAirCircuitEvent(evt));
    this.refreshAirCircuitVisuals(snap);

    // Supply vs vent pulses, opposite directions on the same overhead run:
    // this is the visual the one-time hint may only follow, never precede.
    this._airPulseCooldown -= delta;
    if (snap.door.venting && this._airPulseCooldown <= 0) {
      const machinery = this.stageAssemblies[puzzle.stageIndex]?.machinery;
      if (machinery?.airPipe?.__hissX) {
        this._airPulseCooldown = 260;
        this.spawnAirPulse(machinery, 'supply');
        this.spawnAirPulse(machinery, 'vent');
      }
    }
  }

  // One-way visual evidence on the pipe: warm pulses keep arriving from the
  // reservoir side while pale exhaust bursts leave at the bleed wheel.
  spawnAirPulse(machinery, kind) {
    const { scene } = this;
    const pipe = machinery.airPipe;
    const y = pipe.__hissY + Phaser.Math.Between(-2, 2);
    if (kind === 'supply') {
      const mark = this.track(
        scene.add.rectangle(pipe.__spanLeft, y, 12, 3, C(CAR.BRASS_HI), 0.85)
          .setBlendMode(Phaser.BlendModes.ADD),
        59,
      );
      scene.tweens.add({
        targets: mark,
        x: pipe.__hissX - 20,
        alpha: 0,
        duration: 480,
        ease: 'Quad.easeIn',
        onComplete: () => mark.destroy(),
      });
      return;
    }
    // Exhaust: bursts out of the bleed wheel and dies in the open air.
    const puff = this.track(
      scene.add.rectangle(pipe.__hissX, pipe.__hissY + 6, 8, 3, C(CAR.STEEL_HI), 0.7)
        .setBlendMode(Phaser.BlendModes.ADD),
      59,
    );
    scene.tweens.add({
      targets: puff,
      y: pipe.__hissY + 30,
      scaleX: 2.4,
      alpha: 0,
      duration: 340,
      ease: 'Sine.easeOut',
      onComplete: () => puff.destroy(),
    });
  }

  // Events from the frozen state machine, translated to world feedback.
  // Completion is handed to the shared path only on door-release-ready; the
  // pure module then reaches OPEN exactly when the gate tween ends
  // (GameScene.playTutorialGateOpen -> confirmDoorOpened()).
  handleAirCircuitEvent(evt) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const findDevice = (command) => scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex
        && it.def.kind === 'air-lock'
        && it.def.command === command,
    );
    if (evt.type === 'supply-stall-first') {
      // ONE line, once, after a full visible pulse cycle. It names the
      // symptom, never the valve.
      scene.game.events.emit('hud:toast', LOCAL_AIR_CIRCUIT_PROMPTS.supplyStall);
      return;
    }
    if (evt.type === 'branch-isolated' || evt.type === 'branch-restored') {
      const valve = findDevice('isolate');
      if (valve) {
        scene.pulseTutorialDevice(
          valve.sprite,
          evt.type === 'branch-isolated' ? CAR.LAMP_OK : CAR.STEEL_MID,
        );
      }
      sfx.lever();
      return;
    }
    if (evt.type === 'door-release-ready') {
      puzzle.airCircuit?.beginDoorOpening();
      sfx.door();
      this.completeStage({ pendingActions: ['door'] });
      return;
    }
    if (evt.type === 'door-relocked') {
      // Premature re-pressurisation: the claw bites back and says so on
      // itself. Nothing is reset; the pipe is exactly where the player
      // left it.
      const gate = scene.tutorialGates?.[puzzle.stageIndex];
      sfx.blocked();
      scene.cameras.main.shake(90, 0.0025);
      if (gate?.latchTop) scene.pulseTutorialDevice(gate.latchTop, CAR.LAMP_ALERT);
      if (gate?.latchBottom) scene.pulseTutorialDevice(gate.latchBottom, CAR.LAMP_ALERT);
    }
  }

  // The gauge, the pipe and the claw jaws all read the same one number. Driven
  // straight from the snapshot every frame, so the player can watch the
  // pressure fight instead of being told about it.
  refreshAirCircuitVisuals(snap) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const machinery = this.stageAssemblies[puzzle.stageIndex]?.machinery;
    const fraction = Phaser.Math.Clamp(snap.door.pressure / 100, 0, 1);

    // Needle sweeps the full dial: -90deg empty to +90deg full.
    if (machinery?.gaugeNeedle) {
      machinery.gaugeNeedle.setAngle(-90 + fraction * 180);
    }
    // The pipe hangs slack when the air is gone and pulls taut when charged.
    if (machinery?.airPipe) {
      machinery.airPipe.setAlpha(0.35 + fraction * 0.55);
      if (machinery.airPipe.__spanWidth) {
        const sag = Math.round((1 - fraction) * 14);
        if (sag !== machinery.airPipe.__sag) this.drawAirPipe(machinery.airPipe, sag);
      }
    }
    if (machinery?.pressureBar) {
      machinery.pressureBar.setScale(1, Math.max(0.06, fraction));
    }
    // The door cylinder piston extends with pressure (holding the latch) and
    // retracts as the air is bled. While bleeding against live supply it
    // creeps out and gets shoved back — the cylinder's own story in one pose.
    if (machinery?.doorPiston) {
      machinery.doorPiston.setScale(0.15 + fraction * 0.85, 1);
      machinery.doorPiston.setFillStyle(
        snap.doorLatchReleased ? C(CAR.LAMP_OK) : C(CAR.STEEL_HI),
        0.9,
      );
    }

    // The claw itself is the answer sheet: the jaws part as pressure falls
    // and bite back as it returns. While bleeding against live supply the
    // player watches them creep and get shoved back — the cylinder's story
    // told in one pose.
    const gate = scene.tutorialGates?.[puzzle.stageIndex];
    if (gate) {
      const slack = (1 - fraction) * 22;
      gate.latchTop?.setY(336 - slack);
      gate.latchBottom?.setY(406 + slack);
      const jawTint = snap.doorLatchReleased ? CAR.LAMP_OK : CAR.BRASS_MID;
      gate.latchTop?.setFillStyle(jawTint, 0.88);
      gate.latchBottom?.setFillStyle(jawTint, 0.88);
    }
  }

  // ------------------------------------------------------------ Phase IV --
  // Junction-4 runs WEIGHT / ADHESION. The frozen pure module owns the
  // physics (shared airNetwork suspension branch + motor model + trolley +
  // trace); this layer only wires it to the scene: enter timing, the grab
  // verb, event draining into world feedback, the steady-state redraw and
  // the completion hand-off.

  ensureWeightTransferState(stage) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!stage?.weightTransfer) return null;
    if (!puzzle.weightTransfer) {
      // The SAME shared airNetwork Phase III used (lock §2.1). A QA warp that
      // skips III creates it here so the instance still exists exactly once.
      if (!puzzle.airNetwork) puzzle.airNetwork = createAirNetwork();
      if (!puzzle.motorAdhesion) puzzle.motorAdhesion = createMotorAdhesion();
      puzzle.weightTransfer = createWeightTransfer({
        airNetwork: puzzle.airNetwork,
        motor: puzzle.motorAdhesion,
      });
    }
    return puzzle.weightTransfer;
  }

  updateWeightTransferStage(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.weightTransfer) return;
    if (['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return;
    const phase = this.ensureWeightTransferState(stage);
    if (!phase) return;

    if (this.weightTransferQaFreeze) {
      // The ?qa=phase4 route drove the live instance to a fixture state. Hold
      // it exactly; the steady-state redraw still runs so the frame always
      // shows the fixture snapshot.
      this.refreshWeightTransferVisuals(phase.snapshot());
      return;
    }

    if (scene.player.x >= stage.startX + 10) phase.enter();

    // The grab verb: while the player holds the counterweight, walking moves
    // the trolley instead of the player — the load path under the floor is
    // the puzzle, so the body and the weight stay together.
    const preSnap = phase.snapshot();
    if (preSnap.grabbed) {
      const dir = (scene.inputState?.right ? 1 : 0) + (scene.inputState?.left ? -1 : 0);
      if (dir) phase.moveTrolley(dir, delta);
      const track = stage.weightTransfer.trolley;
      const trolleyWorldX = track.leftX
        + phase.snapshot().trolleyX * (track.rightX - track.leftX);
      scene.player.body.reset(trolleyWorldX, scene.player.y);
    }

    phase.update(delta);
    phase.drainEvents().forEach((evt) => this.handleWeightTransferEvent(evt));
    const snap = phase.snapshot();
    this.refreshWeightTransferVisuals(snap);

    // Free-rev sparks: the wheel spins unloaded, so the rail throws light.
    // Rate and brightness follow wheelSpeed, no words needed.
    this._sparkCooldown -= delta;
    if (snap.motor.wheelState === 'spinning' && this._sparkCooldown <= 0) {
      this._sparkCooldown = 170 - snap.motor.wheelSpeed * 110;
      this.spawnWheelSpark(stage);
    }
  }

  spawnWheelSpark(stage) {
    const { scene } = this;
    const machinery = this.stageAssemblies[WEIGHT_TRANSFER_STAGE_INDEX]?.machinery;
    const originX = machinery?.__driveWheelX ?? (stage.startX + stage.endX) / 2 + 185;
    const originY = machinery?.__driveWheelY ?? 566;
    const spark = this.track(
      scene.add.rectangle(
        originX + Phaser.Math.Between(-8, 8),
        originY + Phaser.Math.Between(-3, 3),
        Phaser.Math.Between(4, 9),
        2,
        C(CAR.BRASS_HI),
        0.95,
      ).setBlendMode(Phaser.BlendModes.ADD),
      59,
    );
    scene.tweens.add({
      targets: spark,
      x: spark.x - Phaser.Math.Between(24, 60),
      y: spark.y + Phaser.Math.Between(8, 26),
      alpha: 0,
      duration: Phaser.Math.Between(220, 420),
      ease: 'Quad.easeIn',
      onComplete: () => spark.destroy(),
    });
  }

  operateWeightTransfer(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const phase = puzzle.weightTransfer;
    if (!phase || this.weightTransferQaFreeze) return;
    const command = interactable.def.command;
    scene.player.playInteraction();

    if (command === 'trolley') {
      phase.setTrolleyGrabbed(!phase.snapshot().grabbed);
    } else {
      phase.interact(command);
    }
    phase.drainEvents().forEach((evt) => this.handleWeightTransferEvent(evt));
    this.refresh();
  }

  // Events from the frozen orchestrator, translated to world feedback. Every
  // state change is announced on the device that caused it; completion is
  // handed to the shared path only when the car itself has moved.
  handleWeightTransferEvent(evt) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const findDevice = (command) => scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex
        && it.def.kind === 'weight-transfer'
        && it.def.command === command,
    );
    if (evt.type === 'suspension-drain-closed') {
      // The hiss dies. The gauge stays low — the line is still cut off, and
      // the needle says so without a word.
      const device = findDevice('level-drain');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.LAMP_OK);
      sfx.lever();
      return;
    }
    if (evt.type === 'suspension-supply-opened') {
      const device = findDevice('level-supply');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.LAMP_OK);
      sfx.lever();
      return;
    }
    if (evt.type === 'control-bounce') {
      // A device pressed where it has nothing to do clunks in place.
      const device = findDevice(evt.command);
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.LAMP_ALERT);
      sfx.blocked();
      return;
    }
    if (evt.type === 'trolley-grabbed' || evt.type === 'trolley-released') {
      const device = findDevice('trolley');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.BRASS_MID);
      sfx.press();
      return;
    }
    if (evt.type === 'motor-energized') {
      const device = findDevice('test');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.BRASS_HI);
      sfx.lever();
      return;
    }
    if (evt.type === 'motor-de-energized') {
      const device = findDevice('test');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.STEEL_MID);
      sfx.lever();
      return;
    }
    if (evt.type === 'wheel-bite') {
      // The wheels catch: one deep clunk through the floor, sparks dying.
      sfx.door();
      scene.cameras.main.shake(120, 0.0022);
      return;
    }
    if (evt.type === 'car-move-complete') {
      // The car reaches the aligned position. The trace is settled in the
      // same step by the pure module; record it for Phase VI before the
      // completion reveal takes the camera.
      const phase = puzzle.weightTransfer;
      if (phase) puzzle.weightTrace = phase.buildTrace();
      sfx.checkpoint();
      scene.cameras.main.shake(260, 0.004);
      this.completeStage({ pendingActions: [] });
    }
  }

  // Trolley, suspension bags, body tilt and the TEST stand lamp all read the
  // same snapshot. Driven every frame so the player watches the weight work
  // instead of being told about it.
  refreshWeightTransferVisuals(snap) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    const track = stage?.weightTransfer?.trolley;
    const machinery = this.stageAssemblies[puzzle.stageIndex]?.machinery;
    if (!track || !machinery) return;
    const trolleyWorldX = track.leftX + snap.trolleyX * (track.rightX - track.leftX);

    if (machinery.trolley) {
      machinery.trolley.setX(trolleyWorldX);
      machinery.trolley.setFillStyle(
        snap.grabbed ? C(CAR.BRASS_MID) : 0x28353c,
        1,
      );
    }
    // The proximity target follows the moving counterweight.
    if (!this._trolleyDevice) {
      this._trolleyDevice = scene.interactables.find(
        (it) => it.def.kind === 'weight-transfer' && it.def.command === 'trolley',
      );
      // The underfloor rectangle is the trolley's body; the routing sprite
      // would only double it.
      this._trolleyDevice?.sprite.setVisible(false);
    }
    if (this._trolleyDevice) this._trolleyDevice.sprite.setX(trolleyWorldX);

    // Air springs: the bags inflate with branch pressure, and the car floor
    // line tilts with the load split. THIS is the load gauge — the dial is
    // only corroboration.
    const health = snap.suspensionHealth;
    [machinery.suspensionBagFront, machinery.suspensionBagRear].forEach((bag) => {
      if (!bag) return;
      bag.setScale(1, 0.3 + health * 0.7);
      bag.setFillStyle(
        snap.suspension.venting ? C(CAR.LAMP_ALERT) : 0x43545b,
        0.92,
      );
    });
    if (machinery.bodyTilt) {
      const split = snap.motor.axleLoad.rear - snap.motor.axleLoad.front;
      machinery.bodyTilt.setAngle(split * 4.5);
    }
    // The TEST stand lamp follows the motor, not a step counter: amber while
    // energized, bright while biting, dark at rest.
    if (machinery.testLamp) {
      const lit = snap.motor.energized;
      const biting = snap.motor.wheelState === 'biting';
      machinery.testLamp
        .setFillStyle(biting ? C(CAR.LAMP_OK) : lit ? C(CAR.BRASS_HI) : 0x405159, 0.95)
        .setAlpha(lit ? 0.9 : 0.45);
    }
    // The gauge dial corroborates the suspension branch pressure.
    if (machinery.gaugeNeedle) {
      const fraction = Phaser.Math.Clamp(snap.suspension.pressure / 100, 0, 1);
      machinery.gaugeNeedle.setAngle(-90 + fraction * 180);
    }
    // Flywheel spin follows wheelSpeed: free-rev blur, crawl while biting.
    if (machinery.flywheelSpoke) {
      machinery.flywheelSpoke.setAngle(
        (machinery.flywheelSpoke.angle + snap.motor.wheelSpeed * 9) % 360,
      );
    }
    // UNDERCARRIAGE VIEW TEACHING: the AXLE tells the same story as the
    // motor so the player can compare them under one look. wheelSpeed drives
    // the wheel spokes physically (a slipping wheel DOES spin — fast and
    // useless), while the axle pulse separates the outcomes: steady and
    // strong when the wheel bites, dim flicker while it slips. Slip sparks
    // at the drive wheel's rail contact mark the wasted energy.
    // Slip sparks already live in spawnWheelSpark (updateWeightTransferStage,
    // cooldown + rate follows wheelSpeed); this refresh layer only owns the
    // steady-state poses.
    if (machinery.wheelSpokeLeft && snap.motor.wheelSpeed > 0) {
      const step = snap.motor.wheelSpeed * 9;
      machinery.wheelSpokeLeft.setAngle((machinery.wheelSpokeLeft.angle + step) % 360);
      machinery.wheelSpokeRight.setAngle((machinery.wheelSpokeRight.angle + step) % 360);
    }
    if (machinery.axlePulse) {
      const wheelState = snap.motor.wheelState;
      machinery.axlePulse.setAlpha(
        wheelState === 'biting' ? 0.5 : wheelState === 'spinning' ? 0.14 : 0.08,
      );
    }
    if (snap.motor.wheelState === 'spinning' && machinery.__driveWheelX) {
      if (!this._slipSparkUntil || scene.time.now > this._slipSparkUntil) {
        this._slipSparkUntil = scene.time.now + 110;
        const spark = this.track(
          scene.add
            .circle(machinery.__driveWheelX + 14, machinery.__driveWheelY + 46, 2.5, C(CAR.BRASS_HI), 0.85)
            .setBlendMode(Phaser.BlendModes.ADD),
          59,
        );
        scene.tweens.add({
          targets: spark,
          x: spark.x + Phaser.Math.Between(-26, 26),
          y: spark.y - Phaser.Math.Between(6, 20),
          alpha: 0,
          duration: 260,
          onComplete: () => spark.destroy(),
        });
      }
    }
  }

  // ------------------------------------------------------------ Phase V ---
  // Junction-5 runs READ THE BOGIE. The frozen pure module owns the physics
  // (two bogies on the same shared systems + the Gate 0 repair chain); this
  // layer only wires it to the scene.

  ensureBogieDiagnosisState(stage) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!stage?.bogieService) return null;
    if (!puzzle.bogieDiagnosis) {
      // The SAME shared instances III/IV used (lock §2). A QA warp that skips
      // them creates them here so each still exists exactly once.
      if (!puzzle.airNetwork) puzzle.airNetwork = createAirNetwork();
      if (!puzzle.motorAdhesion) puzzle.motorAdhesion = createMotorAdhesion();
      puzzle.bogieDiagnosis = createBogieDiagnosis({
        airNetwork: puzzle.airNetwork,
        motor: puzzle.motorAdhesion,
      });
    }
    return puzzle.bogieDiagnosis;
  }

  updateBogieDiagnosisStage(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.bogieService) return;
    if (['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return;
    const phase = this.ensureBogieDiagnosisState(stage);
    if (!phase) return;

    if (this.bogieQaFreeze) {
      this.refreshBogieVisuals(phase.snapshot());
      return;
    }

    if (scene.player.x >= stage.startX + 10) phase.enter();

    // The bleed wheel is a HOLD, the same hand grammar as Section III: the
    // valve only stays open while E is down and the player stays at it.
    const radius = stage.bogieService.interactRadius ?? 62;
    const valve = scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex
        && it.def.kind === 'bogie-service'
        && it.def.command === 'brake-vent',
    );
    const atValve = valve
      ? Math.abs(valve.sprite.x - scene.player.x) < radius && scene.player.lane === valve.def.lane
      : false;
    phase.setVentHeld(Boolean(scene.inputState?.interactHeld && atValve));

    // The Phase IV load persists: the trolley stayed home and the bags stayed
    // charged, so the drive axle keeps its weight in this room too.
    const transfer = puzzle.weightTransfer?.snapshot();
    phase.update(delta, {
      trolleyX: transfer?.trolleyX ?? 1,
      suspensionHealth: transfer?.suspensionHealth ?? 1,
    });
    phase.drainEvents().forEach((evt) => this.handleBogieDiagnosisEvent(evt));
    this.refreshBogieVisuals(phase.snapshot());
  }

  operateBogieService(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const phase = puzzle.bogieDiagnosis;
    if (!phase || this.bogieQaFreeze) return;
    const command = interactable.def.command;
    scene.player.playInteraction();
    if (command === 'brake-vent') {
      // E only starts the hold; updateBogieDiagnosisStage ends it the moment
      // the key comes up or the player steps off the wheel.
      return;
    }
    phase.interact(command);
    phase.drainEvents().forEach((evt) => this.handleBogieDiagnosisEvent(evt));
    this.refresh();
  }

  // Events from the frozen orchestrator, translated to world feedback.
  handleBogieDiagnosisEvent(evt) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const findDevice = (command) => scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex
        && it.def.kind === 'bogie-service'
        && it.def.command === command,
    );
    if (evt.type === 'test-energized' || evt.type === 'test-de-energized') {
      const device = findDevice('test');
      if (device) {
        scene.pulseTutorialDevice(
          device.sprite,
          evt.type === 'test-energized' ? CAR.BRASS_HI : CAR.STEEL_MID,
        );
      }
      sfx.lever();
      return;
    }
    if (evt.type === 'brake-branch-isolated' || evt.type === 'brake-branch-restored') {
      const device = findDevice('brake-isolate');
      if (device) {
        scene.pulseTutorialDevice(
          device.sprite,
          evt.type === 'brake-branch-isolated' ? CAR.LAMP_OK : CAR.STEEL_MID,
        );
      }
      sfx.lever();
      return;
    }
    if (evt.type === 'service-lock-engaged' || evt.type === 'service-lock-removed') {
      const device = findDevice('service-lock');
      if (device) {
        scene.pulseTutorialDevice(
          device.sprite,
          evt.type === 'service-lock-engaged' ? CAR.LAMP_OK : CAR.STEEL_MID,
        );
      }
      sfx.press();
      scene.cameras.main.shake(60, 0.0018);
      return;
    }
    if (evt.type === 'bogie-repaired') {
      // The seized piston cracks free: one deep knock inside the actuator,
      // felt through the floor. Nothing celebrates — the proof is the TEST.
      const device = findDevice('repair');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.BRASS_HI);
      sfx.door();
      scene.cameras.main.shake(140, 0.003);
      return;
    }
    if (evt.type === 'brake-applied' && evt.id === 'rear') {
      // Fail-safe: as the local line dies, the clamp audibly bites. That bite
      // is the safe state announcing itself, not a failure.
      sfx.blocked();
      return;
    }
    if (evt.type === 'control-bounce') {
      // A refusal names its missing condition ON the device, never in prose:
      // the pin that will not seat, the piston that will not move.
      const device = findDevice(evt.command);
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.LAMP_ALERT);
      sfx.blocked();
      return;
    }
    if (evt.type === 'stage-complete') {
      sfx.checkpoint();
      scene.cameras.main.shake(240, 0.0035);
      this.completeStage({ pendingActions: [] });
    }
  }

  // Brake shoes, the service pin, wheel spokes and the line gauge all read
  // the same snapshot. The healthy bogie spins under TEST; the faulty one
  // stays dark until the chain is honestly repaired.
  refreshBogieVisuals(snap) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const machinery = this.stageAssemblies[puzzle.stageIndex]?.machinery;
    if (!machinery) return;

    // The gauge corroborates the LOCAL brake line (faulty side).
    if (machinery.gaugeNeedle) {
      const fraction = Phaser.Math.Clamp(snap.brake.pressure / 100, 0, 1);
      machinery.gaugeNeedle.setAngle(-90 + fraction * 180);
    }
    // Shoes on both bogies follow their own brakeReleased: released pulls
    // them off the wheel, applied presses them on. Fail-safe reads at a
    // glance: a flat line is a CLAMPED shoe.
    const poseShoe = (shoe, released, baseX, offX) => {
      if (!shoe) return;
      shoe.setX(released ? offX : baseX);
      shoe.setFillStyle(released ? 0x53656d : 0xe45a5f, released ? 0.5 : 0.72);
    };
    poseShoe(machinery.frontShoe, snap.front.brakeReleased, machinery.__frontShoeOn, machinery.__frontShoeOff);
    poseShoe(machinery.rearShoe, snap.rear.brakeReleased, machinery.__rearShoeOn, machinery.__rearShoeOff);
    // Wheel spokes: the healthy bogie free-spins under TEST; the faulty one
    // only turns again after the honest repair.
    if (machinery.frontSpoke) {
      machinery.frontSpoke.setAngle(
        (machinery.frontSpoke.angle + (snap.front.wheelTurning ? 7 : 0)) % 360,
      );
    }
    if (machinery.rearSpoke) {
      machinery.rearSpoke.setAngle(
        (machinery.rearSpoke.angle + (snap.rear.wheelTurning ? 7 : 0)) % 360,
      );
    }
    // The steel service pin slides across the linkage while seated (Gate 0:
    // the lock must be a VISIBLE mechanical bar, never an invisible boolean).
    if (machinery.servicePin) {
      machinery.servicePin.setX(
        snap.rear.serviceLockEngaged ? machinery.__pinSeatedX : machinery.__pinParkedX,
      );
      machinery.servicePin.setFillStyle(
        snap.rear.serviceLockEngaged ? C(CAR.BRASS_HI) : 0x697980,
        0.95,
      );
    }
    // The seized piston: dark while jammed, brass once freed.
    if (machinery.actuatorPiston) {
      machinery.actuatorPiston.setFillStyle(
        snap.rear.repaired ? C(CAR.BRASS_MID) : 0x2a3940,
        0.95,
      );
    }
    // TEST stand lamp follows the shared contactor.
    if (machinery.testLamp) {
      machinery.testLamp
        .setFillStyle(snap.motor.energized ? C(CAR.BRASS_HI) : 0x405159, 0.95)
        .setAlpha(snap.motor.energized ? 0.9 : 0.45);
    }
  }

  // ------------------------------------------------------------ Phase VI --
  // PAST RIDES THE LOAD (lock §6). The replay orchestrator consumes IV's
  // recorded trace; this wiring owns enter/update timing, the per-frame
  // condition inputs from the ALREADY REPAIRED systems (read-only), event
  // translation and the underfloor visuals.

  ensureEchoReplayState(stage) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!stage?.echoLoad) return null;
    if (!puzzle.echoReplay) {
      // The SAME shared motor instance IV/V used (lock §2). A QA warp that
      // skips them creates it here so it still exists exactly once.
      if (!puzzle.motorAdhesion) puzzle.motorAdhesion = createMotorAdhesion();
      puzzle.echoReplay = createEchoReplay({
        // IV is the only producer; normalizeTrace inside the orchestrator is
        // the only consumer (lock §2.4) — missing/illegal traces degrade to
        // canonical, never back to IV.
        trace: puzzle.weightTrace,
        motor: puzzle.motorAdhesion,
      });
    }
    return puzzle.echoReplay;
  }

  updateEchoReplayStage(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.echoLoad) return;
    if (['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return;
    const phase = this.ensureEchoReplayState(stage);
    if (!phase) return;

    if (this.echoQaFreeze) {
      this.refreshEchoVisuals(phase.snapshot());
      return;
    }

    if (scene.player.x >= stage.startX + 10) phase.enter();

    // Conditions 1/2/5 are READ from the systems the player already repaired
    // (or, under a QA warp, from the stage-completion flags the warp set).
    const transfer = puzzle.weightTransfer?.snapshot();
    const bogie = puzzle.bogieDiagnosis?.snapshot();
    const air = puzzle.airCircuit?.snapshot();
    phase.update(delta, {
      interlockComplete: Boolean(this.contactLock?.isComplete?.() || puzzle.stageComplete[1]),
      airPathOpen: Boolean(
        (air && (air.doorState === 'OPEN' || air.stageComplete)) || puzzle.stageComplete[2],
      ),
      bogiesSynced: Boolean(
        (bogie && bogie.rear.repaired && bogie.rear.brakeReleased) || puzzle.stageComplete[4],
      ),
      suspensionHealth: transfer?.suspensionHealth ?? 1,
    });
    phase.drainEvents().forEach((evt) => this.handleEchoReplayEvent(evt));
    this.refreshEchoVisuals(phase.snapshot());
  }

  operateEchoLoad(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const phase = puzzle.echoReplay;
    if (!phase || this.echoQaFreeze) return;
    scene.player.playInteraction();
    phase.interact(interactable.def.command);
    phase.drainEvents().forEach((evt) => this.handleEchoReplayEvent(evt));
    this.refresh();
  }

  // Events from the replay orchestrator, translated to world feedback.
  handleEchoReplayEvent(evt) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const findDevice = (command) => scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex
        && it.def.kind === 'echo-load'
        && it.def.command === command,
    );
    if (evt.type === 'test-energized') {
      // Energizing OUTSIDE the window flashes alert on the stand — the rhythm,
      // not the button, was wrong. Nothing is cleared; release and re-read.
      const device = findDevice('test');
      if (device) {
        scene.pulseTutorialDevice(device.sprite, evt.inWindow ? CAR.BRASS_HI : CAR.LAMP_ALERT);
      }
      sfx.lever();
      return;
    }
    if (evt.type === 'test-released') {
      sfx.lever();
      return;
    }
    if (evt.type === 'spinning-stale') {
      // The chance visibly passed while the wheels free-revved: one dull thunk
      // off the rail. The lesson is "let go and catch the next pass".
      sfx.blocked();
      scene.cameras.main.shake(80, 0.002);
      return;
    }
    if (evt.type === 'bite-started') {
      sfx.press();
      scene.cameras.main.shake(70, 0.0018);
      return;
    }
    if (evt.type === 'bite-broken') {
      sfx.blocked();
      return;
    }
    if (evt.type === 'control-bounce') {
      const device = findDevice(evt.command);
      if (device) {
        // The observation loop is not an error: a soft steel pulse, no alarm.
        scene.pulseTutorialDevice(
          device.sprite,
          evt.reason === 'observe-first-loop' ? CAR.STEEL_MID : CAR.LAMP_ALERT,
        );
      }
      if (evt.reason !== 'observe-first-loop') sfx.blocked();
      return;
    }
    if (evt.type === 'departure-started') {
      sfx.checkpoint();
      scene.cameras.main.shake(220, 0.0032);
      return;
    }
    if (evt.type === 'stage-complete') {
      this.completeStage({ pendingActions: [] });
    }
  }

  // The ghost, the trolley, the zone stripe, the condition strip and the
  // gauge all read the same snapshot. The rhythm is SEEN before it is used.
  refreshEchoVisuals(snap) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const machinery = this.stageAssemblies[puzzle.stageIndex]?.machinery;
    if (!machinery) return;

    const x0 = machinery.__echoRailX0 ?? 0;
    const x1 = machinery.__echoRailX1 ?? 0;
    const echoX = x0 + snap.echoTrolleyX * (x1 - x0);
    if (machinery.echoTrolleyCar) machinery.echoTrolleyCar.setX(echoX);
    if (machinery.echoGhost) {
      machinery.echoGhost.setX(echoX);
      machinery.echoGhost.setTexture(
        Math.floor(snap.loopTMs / 220) % 2 === 0 ? 'player-walk-1' : 'player-walk-0',
      );
    }
    if (machinery.echoGhostGlow) {
      machinery.echoGhostGlow
        .setX(echoX)
        .setAlpha(snap.windowActive ? 0.3 : 0.14);
    }
    // The zone stripe breathes while the weight is over the drive bogie.
    if (machinery.echoZoneStripe) {
      machinery.echoZoneStripe.setFillStyle(
        snap.windowActive ? C(CAR.BRASS_HI) : C(CAR.BRASS_MID),
        snap.windowActive ? 0.85 : 0.5,
      );
    }
    if (machinery.echoWindowLamp) {
      machinery.echoWindowLamp
        .setFillStyle(snap.windowActive ? 0x75d4cd : 0x405159, 0.95)
        .setAlpha(snap.windowActive ? 0.9 : 0.45);
    }
    // The drive spoke turns with the shared motor: free-rev fast and pale
    // while spinning, crawl-steady and bright while biting.
    if (machinery.echoDriveSpoke) {
      const spinning = snap.motor.wheelState === 'spinning';
      const biting = snap.motor.wheelState === 'biting';
      machinery.echoDriveSpoke.setAngle(
        (machinery.echoDriveSpoke.angle + (spinning ? 14 : biting ? 4 : 0)) % 360,
      );
      machinery.echoDriveSpoke.setFillStyle(
        biting ? C(CAR.BRASS_HI) : 0xc4d0d2,
        biting ? 0.95 : 0.72,
      );
    }
    // The condition strip reads the six-condition chain in fixed order:
    // interlock, air path, brake sync (repaired systems — steady), then load
    // and bite (the live rhythm). Dark red = a repaired system reports NOT
    // ready; that should never happen in honest play.
    machinery.echoConditionLamps?.forEach(({ key, lamp }) => {
      const on = key === 'load'
        ? snap.windowActive
        : key === 'biting'
          ? snap.conditions.biting
          : snap.conditions[key];
      lamp.setFillStyle(
        on ? 0x75d4cd : ['interlock', 'airPath', 'synced'].includes(key) ? 0xe45a5f : 0x405159,
        on ? 0.95 : 0.55,
      );
    });
    // The gauge corroborates the live drive-axle load against the bite line.
    if (machinery.gaugeNeedle) {
      const fraction = Phaser.Math.Clamp(snap.motor.axleLoad[snap.motor.driveBogie] ?? 0, 0, 1);
      machinery.gaugeNeedle.setAngle(-90 + fraction * 180);
    }
    // Departure stand lamp follows the shared contactor.
    if (machinery.testLamp) {
      machinery.testLamp
        .setFillStyle(snap.motor.energized ? C(CAR.BRASS_HI) : 0x405159, 0.95)
        .setAlpha(snap.motor.energized ? 0.9 : 0.45);
    }
  }

  // Section III. Each device does one physical thing and reports it on
  // itself. No step counter, no ordering check: the pipe decides what works.
  operateAirLock(interactable) {
    const puzzle = this.scene.tutorialPuzzle;
    const phase = puzzle.airCircuit;
    if (!phase || this.airCircuitQaFreeze) return;
    const command = interactable.def.command;

    if (command === 'isolate') {
      if (phase.snapshot().stageComplete) return;
      phase.interact('isolate');
      this.scene.player.playInteraction();
      // interact() forwards valve events immediately; drain on the same
      // frame so the pulse lands with the press.
      phase.drainEvents().forEach((evt) => this.handleAirCircuitEvent(evt));
      this.refresh();
      return;
    }

    if (command === 'bleed') {
      // E only starts the hold. updateAirCircuitStage ends it the moment the
      // key comes up or the player steps off the wheel.
      this.scene.player.playInteraction();
    }
  }

  // ------------------------------------------------------------ Phase II --
  // Junction-2 runs only the contact interlock: latch at x=850, underfloor
  // cable trough at y=556, contactor at x=1440. GameScene's existing proximity
  // pick (dx<62, dy<100) routes E presses here; the state machine and its art
  // module do everything else.

  operateContactInterlock(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const lock = this.contactLock;
    if (!lock || this.contactQaFreeze) return;
    if (puzzle.stageIndex !== CONTACT_STAGE_INDEX || lock.isComplete()) return;
    if (interactable.def.command === 'relay') {
      // The cabinet door is a physical object: E opens the close-up. The
      // interlock itself has no 'relay' target — its isRelaySolved hook reads
      // the cabinet the player is about to wire.
      this.openRelayCloseup();
      return;
    }
    const target = interactable.def.command === 'latch' ? 'latch' : 'power';
    const result = lock.interact(target);
    scene.player.playInteraction();
    if (!result.accepted) {
      // Local refusal only: the contactor's own bounce animation, flashes and
      // blocked blip carry the fault. No toast, no vignette, no global fail —
      // and nothing that names what should have happened first.
      scene.cameras.main.shake(90, 0.0025);
    }
    // Events drain on the next updateContactInterlock pass (same frame at the
    // latest), which feeds them to the art module one by one.
  }

  // Called every frame from update(). Owns enter/reset timing, signal
  // propagation, event draining into the art module, the steady-state redraw,
  // the two world prompts, and the completion hand-off into completeStage().
  updateContactInterlock(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const lock = this.contactLock;
    const art = this.contactArt;
    if (!lock || !art) return;

    if (this.contactQaFreeze) {
      // The ?qa=phase2 route drove the live instance to a fixture state. Hold
      // it exactly: no propagation, no enter/reset, no completion hand-off.
      // The steady-state redraw still runs so the frame always shows the
      // fixture snapshot, and prompts stay live for inspection.
      art.applySnapshot(lock.snapshot());
      if (this.relay && this.relayArt) this.relayArt.applySnapshot(this.relay.snapshot());
      this.updateContactPrompts();
      return;
    }

    const live = puzzle.stageIndex === CONTACT_STAGE_INDEX
      && puzzle.briefed
      && !puzzle.stageComplete[CONTACT_STAGE_INDEX]
      && !['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase);
    if (!live) return;

    // Enter when the player steps into the latch's reach; only walking back
    // out past the partition (x < CONTACT_RESET_X) releases the latch, so a
    // press anywhere inside the interaction radius always sticks. enter() is
    // idempotent, so holding position stacks nothing. Leaving the room is the
    // global reset for the whole chain: latch, trace, cabinet wiring and
    // contactor all return to the entry state together (work package §4.2).
    if (scene.player.x >= CONTACT_RESET_X) {
      lock.enter();
    } else {
      lock.reset();
      this.relay?.reset();
      // A warp out of the room while the close-up is up must never leave the
      // player frozen: close it instantly (wiring was just reset anyway).
      if (this.relayCloseupState !== 'closed') this.closeRelayCloseup({ force: true });
    }

    lock.update(delta);
    lock.drainEvents().forEach((evt) => art.handleEvent(evt));
    art.applySnapshot(lock.snapshot());
    this._drainRelay();
    this.updateContactPrompts();

    if (lock.isComplete()) {
      // The shared completion path: completion reveal, gate open, stage
      // advance and the guard-line release, exactly as the other junctions.
      this.completeStage();
    }
  }

  // The only strings the room may show (spec §4 + relay §2.1), gated by
  // distance and machine state. Each prompt vanishes the moment the player
  // leaves its device or the device has done its job. The relay prompt only
  // exists while the case is still unbridged and the close-up is down.
  updateContactPrompts() {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const lock = this.contactLock;
    const art = this.contactArt;
    if (!lock || !art) return;
    const snap = lock.snapshot();
    const live = puzzle.stageIndex === CONTACT_STAGE_INDEX
      && puzzle.briefed
      && !puzzle.stageComplete[CONTACT_STAGE_INDEX]
      && !['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)
      && this.visible
      && scene.activeWorldIndex === 0;
    const nearLatch = live && Math.abs(scene.player.x - CONTACT_INTERLOCK_LAYOUT.startX) < 62;
    const nearRelay = live && Math.abs(scene.player.x - CONTACT_INTERLOCK_LAYOUT.relayX) < 62;
    const nearPower = live && Math.abs(scene.player.x - CONTACT_INTERLOCK_LAYOUT.endX) < 62;
    const relaySolved = this.relay?.isSolved() ?? false;
    art.setPrompt('latch', nearLatch && !snap.latchClosed ? CONTACT_PROMPTS.latch : null);
    art.setPrompt(
      'relay',
      nearRelay && !relaySolved && !scene.relayCloseupActive ? CONTACT_PROMPTS.relay : null,
    );
    art.setPrompt('power', nearPower && !snap.complete ? CONTACT_PROMPTS.power : null);
  }

  // ------------------------------------------------------ relay close-up --
  // Lifecycle (work package §2.2/§3.4.2/§4.3, Wave 5 timing):
  //
  //   closed --E at cabinet--> opening --bolt 0–60ms + door 60–300ms +
  //   camera pan 0–360ms CONCURRENT--> open --ESC/E or relay-bridged +
  //   450ms--> closing --door half-close 240ms + camera 360ms--> closed
  //
  // Invariants: wiring survives closing (only room exit / cabinet RESET /
  // scene restart clears it); player.frozen is true exactly while
  // scene.relayCloseupActive is true, on every path; the camera push settles
  // after the door (~360 vs ~300ms), never leads it; the cluster is visible
  // exactly for the opening/open/closing span (setVisible true on open,
  // false in close finish) and the HUD (separate upper scene) is hidden for
  // the same span and always restored; the post-relay trace is progress-held
  // until finish() so trace-energized can only light in world view.

  _setupRelayInput() {
    const { scene } = this;
    // The frozen art module owns hit tests and drag state; this layer owns
    // listener lifecycle and the screen -> world conversion. All listeners
    // are removed in destroy().
    this._relayHandlers = {
      down: (pointer) => this._onRelayPointerDown(pointer),
      move: (pointer) => this._onRelayPointerMove(pointer),
      up: (pointer) => this._onRelayPointerUp(pointer),
      // Pointer leaving the canvas mid-drag must not strand a lead tip.
      out: () => this._cancelRelayDrag(),
    };
    scene.input.on('pointerdown', this._relayHandlers.down);
    scene.input.on('pointermove', this._relayHandlers.move);
    scene.input.on('pointerup', this._relayHandlers.up);
    scene.input.on('gameout', this._relayHandlers.out);
    // Browser focus loss: same escape hatch (work package §4.3).
    this._relayBlurHandler = () => this._cancelRelayDrag();
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', this._relayBlurHandler);
    }
  }

  _cancelRelayDrag() {
    if (this.relayCloseupState === 'open' || this.relayCloseupState === 'opening') {
      this.relayArt?.cancelDrag();
      this._setRelayHover(null); // drag aborted; next move recomputes
    }
  }

  // P5 (Wave 5): hover affordance consumed from RelayCabinetArt (art-owner's
  // setHoverTarget, optional-chained so this layer predates/survives its
  // landing). Hit test reuses the art's own getHitRegions() so the hover ring
  // can never disagree with the snap targets. Cleared while dragging, on
  // close, and on any drag cancel.
  _hitTestRelay(x, y) {
    const regions = this.relayArt?.getHitRegions?.() ?? [];
    for (const region of regions) {
      const shape = region.shape;
      if (shape.type === 'circle') {
        const dx = x - shape.x;
        const dy = y - shape.y;
        if (dx * dx + dy * dy <= shape.r * shape.r) return region.id;
      } else if (shape.type === 'rect') {
        if (x >= shape.x && x <= shape.x + shape.w && y >= shape.y && y <= shape.y + shape.h) {
          return region.id;
        }
      }
    }
    return null;
  }

  _setRelayHover(id) {
    const next = id ?? null;
    if (next === this._relayHoverId) return;
    this._relayHoverId = next;
    this.relayArt?.setHoverTarget?.(next);
  }

  _onRelayPointerDown(pointer) {
    if (this.relayCloseupState !== 'open') return;
    this._setRelayHover(null); // a press/drag supersedes the hover ring
    this.relayArt?.pointerDown(pointer.worldX, pointer.worldY);
  }

  _onRelayPointerMove(pointer) {
    if (this.relayCloseupState !== 'open') return;
    const art = this.relayArt;
    if (!art || art.destroyed) return;
    const result = art.pointerMove(pointer.worldX, pointer.worldY);
    if (result?.dragging) {
      this._setRelayHover(null); // dragging: no hover ring under a live lead
      return;
    }
    this._setRelayHover(this._hitTestRelay(pointer.worldX, pointer.worldY));
  }

  _onRelayPointerUp(pointer) {
    if (this.relayCloseupState !== 'open') return;
    const art = this.relayArt;
    const logic = this.relay;
    if (!art || !logic) return;
    const result = art.pointerUp(pointer.worldX, pointer.worldY);
    if (!result) return;
    if (Object.prototype.hasOwnProperty.call(result, 'placed')) {
      // Lead drag released. Locked wiring convention: a drop on a terminal
      // disconnects the previous landing first, then connects; a drop in
      // empty space with a previous landing is a plain disconnect. A rejected
      // connect still queues its connect-rejected event, which the art plays
      // as a local knock-back — wiring state is never faked.
      if (result.from) logic.disconnect(result.lead);
      if (result.placed) logic.connect(result.lead, result.placed);
    } else if (result.pressed === 'test') {
      logic.test();
    } else if (result.pressed === 'reset') {
      logic.reset();
    }
    this._drainRelay();
  }

  // Drain the cabinet's event queue into the close-up art one by one, then
  // finish with a steady-state snapshot兜底 — the same order the world art
  // uses. relay-bridged arms the locked §2.3 exit beat.
  _drainRelay() {
    if (!this.relay || !this.relayArt) return;
    this.relay.drainEvents().forEach((evt) => this._handleRelayEvent(evt));
    this.relayArt.applySnapshot(this.relay.snapshot());
  }

  _handleRelayEvent(evt) {
    this.relayArt?.handleEvent(evt);
    if (evt?.type !== 'relay-bridged') return;
    // 450ms hold so the player watches the armature seat and the three stage
    // lamps land, then the door half-closes and the camera returns on its
    // own (work package §2.3). Guarded: one schedule per opening.
    if (this.relayCloseupState !== 'open' || this._relayAutoCloseScheduled) return;
    this._relayAutoCloseScheduled = true;
    this.scene.time.delayedCall(RELAY_CLOSEUP_SOLVED_HOLD_MS, () => {
      this._relayAutoCloseScheduled = false;
      if (this.relayCloseupState === 'open') this.closeRelayCloseup();
    });
  }

  openRelayCloseup() {
    const { scene } = this;
    if (!this.relay || !this.relayArt || this.relayArt.destroyed) return;
    if (this.relayCloseupState !== 'closed') return;
    // Only a real player open counts as entering the cabinet (QA warps and
    // diagnostics never call this).
    this.relay.enter();
    this.relayCloseupState = 'opening';
    scene.relayCloseupActive = true;
    scene.player.frozen = true;
    scene.player.setVelocity(0, 0);
    // P1: the cluster was hidden at build / last close — show it before the
    // physical open. Sync first so a re-opened case shows its committed
    // wiring, then play the open beat.
    this.relayArt.setVisible(true);
    this._drainRelay();
    this.relayArt.open();
    scene.scene.setVisible(false, 'Hud');
    this._setRelayCursor(true);
    const camera = scene.cameras.main;
    camera.stopFollow();
    // P3 (Wave 5): camera pan (360ms) runs CONCURRENTLY with the prop beat
    // (bolt 0–60ms, door 60–300ms inside art.open()). The reading order is
    // still bolt -> door -> camera settle: the pan lands at ~360ms, just
    // after the door finishes at ~300ms, so the player watches the case open
    // while the world slides — never a camera gliding toward an already-open
    // case, and never a camera arriving before the props (work package
    // §3.4.2: the camera follows the door, it never leads it).
    camera.pan(
      RELAY_CLOSEUP_CAMERA.x,
      RELAY_CLOSEUP_CAMERA.y,
      RELAY_CLOSEUP_CAMERA_MS,
      'Sine.easeInOut',
      true,
      // Camera.pan callbacks fire per frame (onUpdate semantics); only the
      // progress === 1 frame means the move has actually landed.
      (cam, progress) => {
        if (progress < 1) return;
        if (this.relayCloseupState === 'opening') this.relayCloseupState = 'open';
      },
    );
  }

  closeRelayCloseup({ force = false } = {}) {
    const { scene } = this;
    if (this.relayCloseupState === 'closed' || this.relayCloseupState === 'closing') return;
    if (this.relayCloseupState === 'opening' && !force) return;
    this.relayCloseupState = 'closing';
    // Closing never touches the wiring: no logic.reset() here. The leads the
    // player landed stay landed for the next opening.
    this.relayArt?.cancelDrag();
    this._setRelayHover(null); // no hover ring on a closed case
    this.relayArt?.close();
    const camera = scene.cameras.main;
    const finish = () => {
      this.relayCloseupState = 'closed';
      scene.relayCloseupActive = false;
      scene.player.frozen = false;
      // P1: the close-up cluster (world x120–840, depth 69–79, door resting
      // half-closed) must leave the stage entirely — otherwise it hangs on
      // the car wall as a permanent "second cabinet" next to the world one.
      this.relayArt?.setVisible(false);
      scene.scene.setVisible(true, 'Hud');
      this._setRelayCursor(false);
      // Restore the tutorial follow rig exactly as setTutorialCameraMode(0)
      // configured it (lerp 0.075/0.11, deadzone 220x170, offsetY 150).
      camera.startFollow(scene.player, true, 0.075, 0.11, 0, 150);
      camera.setDeadzone(220, 170);
    };
    if (force) {
      finish();
      return;
    }
    // The door settles half-closed first (240ms), then the camera returns
    // (360ms); the player unfreezes only when the world camera is back.
    scene.time.delayedCall(240, () => {
      if (!this.relayArt || this.relayArt.destroyed) {
        finish();
        return;
      }
      // Same per-frame callback semantics: run finish() only on the frame the
      // return pan completes, or the follow rig is restored 360ms early.
      camera.pan(scene.player.x, 400, RELAY_CLOSEUP_CAMERA_MS, 'Sine.easeInOut', true, (cam, progress) => {
        if (progress >= 1) finish();
      });
    });
  }

  // Brass inspection probe cursor (work package §3.1): a tiny canvas-drawn
  // probe served as a CSS cursor, crosshair fallback. No new game assets.
  _probeCursor() {
    if (this._probeCursorValue) return this._probeCursorValue;
    let cursor = 'crosshair';
    if (typeof document !== 'undefined') {
      try {
        const c = document.createElement('canvas');
        c.width = 16;
        c.height = 16;
        const ctx = c.getContext('2d');
        // 2px brass shaft, bright tip at the hotspot corner, dark grip.
        ctx.strokeStyle = '#caa66b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(3, 13);
        ctx.lineTo(12, 4);
        ctx.stroke();
        ctx.fillStyle = '#f2d49a';
        ctx.fillRect(11, 1, 4, 4);
        ctx.fillStyle = '#6b5320';
        ctx.fillRect(1, 12, 4, 3);
        cursor = `url(${c.toDataURL('image/png')}) 13 3, crosshair`;
      } catch {
        cursor = 'crosshair';
      }
    }
    this._probeCursorValue = cursor;
    return cursor;
  }

  _setRelayCursor(on) {
    const input = this.scene.input;
    if (!input?.setDefaultCursor) return;
    input.setDefaultCursor(on ? this._probeCursor() : 'default');
  }


  updateObjective() {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    if (
      !scene.tutorialObjectiveArrow ||
      !this.visible ||
      scene.dialogueState ||
      scene.prompt?.visible ||
      ['opening', 'departure', 'complete'].includes(puzzle.phase)
    ) {
      scene.tutorialObjectiveArrow?.setVisible(false);
      scene.tutorialObjectiveLabel?.setVisible(false);
      return;
    }
    const stage = this.currentStage();
    if (puzzle.phase === 'approach') {
      const previousGate = this.config.stages[Math.max(0, puzzle.stageIndex - 1)].endX;
      scene.tutorialObjectiveArrow.setPosition(previousGate, 339).setVisible(true);
      scene.tutorialObjectiveLabel
        .setPosition(previousGate, 318)
        .setText('OPEN — KEEP GOING')
        .setVisible(true);
      return;
    }
    let x = 125;
    let label = 'SPEAK';
    if (!puzzle.briefed) {
      scene.tutorialObjectiveArrow.setPosition(x, 339).setVisible(true);
      scene.tutorialObjectiveLabel.setPosition(x, 318).setText(label).setVisible(true);
      return;
    }
    if (stage.autoRun) {
      const target = scene.interactables.find(
        (it) => it.def.stage === stage.index && it.def.command === 'door',
      );
      x = target?.sprite.x ?? stage.commandX;
      label = 'ONE PUNCH OPENS THE DOOR';
    } else {
      // Junction-2 and every later room get no arrow: the interlock spec bans
      // any pointer at the answer, and the machines carry their own guidance.
      scene.tutorialObjectiveArrow.setVisible(false);
      scene.tutorialObjectiveLabel.setVisible(false);
      return;
    }
    scene.tutorialObjectiveArrow.setPosition(x, 339).setVisible(true);
    scene.tutorialObjectiveLabel.setPosition(x, 318).setText(label).setVisible(true);
  }

  objectiveText() {
    const puzzle = this.scene.tutorialPuzzle;
    if (!puzzle.briefed) return 'speak with the conductor and take the brass ticket punch';
    if (puzzle.phase === 'approach') return 'walk through the open partition into the next section';
    if (puzzle.phase === 'executing') return 'watch the train execute the punched timetable';
    if (puzzle.phase === 'departure') return 'watch the train leave the station';
    if (puzzle.phase === 'complete') return 'enter the next carriage';
    const stage = this.currentStage();
    if (puzzle.phase === 'echo-travel') return 'follow the remembered self to the next lower contact';
    if (puzzle.phase === 'echo-sync') {
      return `reach the ${RAIL_CONTROLS[puzzle.activeCommand]?.label.toLowerCase()} while PAST holds its contact`;
    }
    if (puzzle.phase === 'echo-retry') return 'wait for the remembered self to circle back';
    if (puzzle.phase === 'echo-replay') return 'watch the remembered self carry the earlier valve action below the car';
    // Section III states the destination or the machine's current behaviour,
    // never the order. The gauge, the pipe, the isolator and the claw are what
    // teach the sequence; naming it here would let the player finish the room
    // without ever reading the machines.
    if (stage.airCircuit) {
      const snap = puzzle.airCircuit?.snapshot();
      if (!snap || snap.stageComplete) return 'enter the next carriage';
      if (snap.doorState === 'RELEASED' || snap.doorState === 'OPENING') {
        return 'the claw has let go — the door is free';
      }
      if (snap.stalledOnSupply) return 'the needle will not come down — the pipe keeps fighting back';
      if (snap.isolateClosed && snap.door.pressure > snap.tuning.releaseThreshold) {
        return 'the isolated line is bleeding down';
      }
      return 'get through the door at the far end of the car';
    }
    if (stage.physicalSequence) {
      const expected = stage.solution[puzzle.queue.length];
      return expected
        ? `look below, read the changed hardware, and operate the ${RAIL_CONTROLS[expected]?.label.toLowerCase()}`
        : 'watch the completed wheelset settle into service';
    }
    if (stage.autoRun) return 'punch the glowing door action once';
    // Phase V: name the state the player is looking at, never what to do
    // about it. The two bogies, the pin and the gauge are what they read.
    if (stage.bogieService) {
      const snap = puzzle.bogieDiagnosis?.snapshot();
      if (!snap || snap.stageComplete) return 'enter the next carriage';
      if (snap.motor.energized && !snap.rear.wheelTurning && !snap.rear.repaired) {
        return 'one bogie answers the test — the other stays dark';
      }
      if (snap.rear.repaired && snap.brake.isolated) return 'the piston is free, but the local line is still cut off';
      if (snap.rear.repaired && snap.brake.pressure < 60) return 'the local line is still flat';
      if (snap.rear.serviceLockEngaged) return 'the service pin is seated across the linkage';
      if (snap.brake.isolated && snap.brake.pressure <= 0) return 'the local brake line is cut off and flat';
      if (snap.brake.isolated) return 'the local brake line is cut off below';
      return 'the test stand compares both bogies';
    }
    // Phase VI: same house rule — name the state, never the order. The ghost,
    // the zone stripe and the lamps are what the player reads.
    if (stage.echoLoad) {
      const snap = puzzle.echoReplay?.snapshot();
      if (!snap || snap.stageComplete) return 'enter the next carriage';
      if (snap.departing) return 'the train is answering at last';
      if (snap.observationLoop) return 'the remembered self is showing its round below';
      if (snap.attempt === 'stale') return 'the wheels are spinning free — the weight has moved on';
      if (snap.attempt === 'biting') return 'the wheels have the rail — hold it';
      if (snap.windowActive) return 'the moving weight is over the drive bogie';
      return 'the remembered self keeps riding the counterweight below';
    }
    // Phase IV: same house rule — name the state the player is looking at,
    // never what to do about it. The bags, the tilt, the sparks and the TEST
    // stand are what the player reads.
    if (stage.weightTransfer) {
      const snap = puzzle.weightTransfer?.snapshot();
      if (!snap || snap.stageComplete) return 'enter the next carriage';
      if (snap.motor.wheelState === 'biting') return 'the wheels have caught the rail — the car is moving';
      if (snap.motor.wheelState === 'spinning') return 'the motor is spinning free — the drive axle carries no weight';
      if (snap.suspension.venting) return 'air is hissing out of the suspension line below the floor';
      if (snap.suspension.isolated && snap.suspension.pressure < 90) return 'the suspension line is sealed but still cut off from the header';
      if (snap.trolleyX < 0.85) return 'the counterweight trolley is still off the drive bogie';
      return 'the drive bogie is loaded — the test stand is waiting';
    }
    // Section II: same rule as the air lock — state what the machine is doing,
    // never the order. The latch, the lit copper run and the contactor are what
    // the player reads; this line only names the state they are looking at.
    if (stage.index === CONTACT_STAGE_INDEX) {
      const snap = this.contactLock?.snapshot();
      if (!snap || snap.complete) return 'enter the next carriage';
      if (snap.circuitEnergized) return 'the underfloor circuit is live at the contactor';
      // Descriptive only, like every other line here: it names the state the
      // player is looking at, never what to do about it.
      if (snap.relayWaiting) return 'the signal is holding at the relay case';
      if (snap.latchClosed) return 'the signal is running beneath the carriage';
      return 'the door latch by the entry frame is still open';
    }
    return puzzle.queue.length < stage.solution.length
      ? `read the mechanism and punch ${stage.solution.length} ${stage.solution.length === 1 ? 'action' : 'actions'}`
      : 'run the punched timetable';
  }

  setVisible(visible) {
    this.visible = visible;
    this.refresh();
  }

  refresh() {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const visible = this.visible && scene.activeWorldIndex === 0;
    // The interlock art follows the same world-0 visibility as the rooms.
    this.contactArt?.setVisible(visible);
    this.stageAssemblies.forEach((assembly, index) => {
      const active = visible && index === puzzle.stageIndex;
      const completed = visible && Boolean(puzzle.stageComplete[index]);
      const dormant = visible && (
        index === puzzle.stageIndex + 1 ||
        (active && puzzle.phase === 'approach')
      );
      const settling = completed && puzzle.phase === 'approach' && index === puzzle.stageIndex - 1;
      const controlsActive = active && puzzle.briefed && puzzle.phase !== 'approach';
      // Every room the player has already walked through stays physically
      // present. `dormant` covers only the next section, so gating presence on
      // it made rooms two or more sections back vanish outright — during a
      // downward completion pan that read as the train losing its machinery.
      const roomPresent = active || completed || dormant || index < puzzle.stageIndex;
      const rackActive = (controlsActive || completed || dormant) && assembly.stage.showRack !== false;
      const rackAlpha = dormant ? 0.14 : settling ? 0.9 : completed ? 0.66 : 1;
      const projectedDrum = Boolean(assembly.drumProjection);
      const faceActive = rackActive && !projectedDrum;
      assembly.rack.setVisible(faceActive).setAlpha(rackAlpha);
      // The recess and the bezel are part of the same physical instrument, so
      // they track the face exactly. Missing this would leave a lit brass ring
      // floating in a dimmed SERVICE SET room.
      assembly.rackRebate.setVisible(faceActive).setAlpha(rackAlpha * 0.92);
      assembly.rackBezel.setVisible(faceActive).setAlpha(rackAlpha);
      assembly.rackTitle.setVisible(faceActive).setAlpha(dormant ? 0.12 : settling ? 0.82 : completed ? 0.58 : 1);
      assembly.queue.setVisible(faceActive).setAlpha(dormant ? 0.12 : settling ? 0.9 : completed ? 0.76 : 1);
      assembly.tick.setVisible(faceActive && !assembly.stage.guideSequence).setAlpha(dormant ? 0.1 : settling ? 0.6 : completed ? 0.38 : 1);
      assembly.paperStrip.setVisible(faceActive).setAlpha(dormant ? 0.12 : settling ? 0.84 : completed ? 0.62 : 0.88);
      assembly.punchHead.setVisible(faceActive).setAlpha(dormant ? 0.14 : settling ? 0.82 : completed ? 0.58 : 1);
      if (assembly.drumProjection) {
        const projectionAlpha = dormant ? 0.1 : settling ? 0.62 : completed ? 0.42 : 1;
        Object.values(assembly.drumProjection)
          .filter((object) => object?.setVisible)
          .forEach((object) => object.setVisible(rackActive).setAlpha(projectionAlpha));
      }
      assembly.completedLabel.setVisible(completed).setAlpha(settling ? 1 : 0.76);
      assembly.completionLamp.setVisible(completed).setAlpha(settling ? 1 : 0.82);
      assembly.commandLabels.forEach((label) => label
        .setVisible(roomPresent)
        .setAlpha(dormant ? 0.12 : settling ? 0.76 : completed ? 0.4 : 1));
      assembly.memoryLabel?.setVisible(rackActive).setAlpha(dormant ? 0.12 : settling ? 0.7 : completed ? 0.48 : 1);
      assembly.slotLabel
        ?.setVisible((controlsActive || completed || dormant) && !completed)
        .setAlpha(dormant ? 0.12 : settling ? 0.64 : 1);
      assembly.resetLabel
        ?.setVisible((controlsActive || completed || dormant) && !completed)
        .setAlpha(dormant ? 0.12 : settling ? 0.64 : 1);
      assembly.runLabel
        ?.setVisible((controlsActive || completed || dormant) && !assembly.stage.autoRun)
        .setAlpha(dormant ? 0.12 : settling ? 0.64 : completed ? 0.34 : 1);
      const echoMotion = ['echo-travel', 'echo-sync', 'echo-retry'].includes(puzzle.phase);
      assembly.echo
        ?.setVisible(roomPresent && Boolean(puzzle.echoRecorded))
        .setAlpha(dormant ? 0.1 : settling ? 0.38 : completed ? 0.24 : echoMotion ? assembly.echo.alpha : 0.44);
      assembly.echoGlow
        ?.setVisible(roomPresent && Boolean(puzzle.echoRecorded))
        .setAlpha(dormant ? 0.04 : settling ? 0.14 : completed ? 0.08 : echoMotion ? assembly.echoGlow.alpha : 0.16);
      assembly.echoRail
        ?.setVisible(roomPresent && Boolean(puzzle.echoRecorded))
        .setAlpha(dormant ? 0.06 : settling ? 0.24 : completed ? 0.12 : echoMotion ? assembly.echoRail.alpha : 0.32);
      assembly.echoNodes.forEach((node, nodeIndex) => {
        const nodeVisible = roomPresent && Boolean(puzzle.echoRecorded);
        const locked = completed || (active && nodeIndex < puzzle.echoSyncIndex);
        const live = active && puzzle.phase === 'echo-sync' && nodeIndex === puzzle.echoSyncIndex;
        node.beam.setVisible(nodeVisible).setAlpha(dormant ? 0.04 : live ? 0.64 : locked ? 0.34 : 0.12);
        node.ring.setVisible(nodeVisible).setAlpha(dormant ? 0.08 : live ? 1 : locked ? 0.72 : 0.42);
        node.core.setVisible(nodeVisible).setAlpha(dormant ? 0.08 : live ? 1 : locked ? 0.9 : 0.28);
      });
      // The air-circuit stage reads its pressure off the eye-height dial alone, so
      // the sliding column stays down. This has to be decided here rather than
      // at construction: this loop reasserts visibility on every refresh and
      // would otherwise put the duplicate readout straight back on screen.
      const machineryShown = roomPresent && assembly.stage.showMachinery !== false;
      Object.entries(assembly.machinery)
        .filter(([, value]) => value?.setVisible)
        .forEach(([key, object]) => object.setVisible(
          machineryShown
            && !(key === 'pressureBar' && assembly.stage.airCircuit)
            // No wheelset lives in the air-circuit room; its brake shoes
            // would float beside the pipe run (UNDERCARRIAGE VIEW TEACHING).
            && !((key === 'brakeLeft' || key === 'brakeRight') && assembly.stage.airCircuit),
        ));
      assembly.machinery.drumKeyLabels?.forEach((label) =>
        label
          .setVisible(roomPresent)
          .setAlpha(dormant ? 0.12 : settling ? 0.7 : completed ? 0.42 : 1),
      );
      if (rackActive && assembly.stage.drum) {
        // Drum face: six slots always shown, so the player can read the whole
        // revolution as a shape. A jammed slot keeps its letters — the card is
        // still there, it just did not take.
        const drum = puzzle.drum;
        const nextOpen = drum && !drum.running ? firstOpenSlot(drum) : -1;
        const cells = (drum?.slots ?? new Array(assembly.stage.drum.slots).fill(null)).map((card, slot) => {
          if (dormant) return '·';
          const waiting = drum?.waiting === slot;
          if (!card) return slot === nextOpen ? '[ ]' : '·';
          const short = COMMANDS[card.command].drumShort ?? COMMANDS[card.command].short;
          if (card.status === 'jammed') return `${short}✗`;
          if (card.status === 'done') return `${short}✓`;
          // The live slot is marked while it asks for a hand, so the face names
          // which card the player is being asked for before it chars.
          if (waiting) return `${short}‹`;
          return slot === nextOpen ? `[${short}]` : short;
        });
        const schedule = cells.join(' ');
        assembly.queue.setText(schedule);
        assembly.drumProjection?.queue.setText(schedule);
        const pointer = dormant
          ? 0
          : drum?.waiting >= 0
            ? drum.waiting
            : drum?.running
              ? Math.max(drum.activeSlot, 0)
              : Math.max(nextOpen, 0);
        assembly.tick.setX(
          assembly.stage.rackX - TIMETABLE_FACE.leftInset
            + Math.min(pointer, cells.length - 1) * TIMETABLE_FACE.drumTickStep,
        );
        assembly.drumProjection?.pointer.setX(
          assembly.drumProjection.x - 72
            + Math.min(pointer, cells.length - 1) * 72,
        );
      } else if (rackActive) {
        const slots = assembly.stage.solution.map((_, slot) => {
          const command = dormant ? null : completed ? assembly.stage.solution[slot] : puzzle.queue[slot];
          return command ? COMMANDS[command].short : `${slot + 1}`;
        });
        assembly.queue.setText(slots.join('  ›  '));
        const punched = dormant ? 0 : completed ? slots.length : puzzle.queue.length;
        assembly.tick.setX(
          assembly.stage.rackX - TIMETABLE_FACE.leftInset
            + Math.min(punched, slots.length) * TIMETABLE_FACE.queueTickStep,
        );
      }
      if (completed) this.setCompletedMachinery(assembly);
    });

    scene.interactables
      .filter((it) => this.isTimetableKind(it.def.kind))
      .forEach((it) => {
        if (it.def.kind === 'contact-interlock') {
          // The interlock devices are drawn by ContactInterlockArt; the
          // interactable sprite is only a proximity anchor and never shows.
          it.sprite.setVisible(false);
          return;
        }
        const stage = this.currentStage();
        const current =
          visible &&
          puzzle.briefed &&
          puzzle.phase !== 'approach' &&
          it.def.stage === puzzle.stageIndex &&
          !(stage.autoRun && it.def.kind === 'timetable-run');
        const completed = visible && Boolean(puzzle.stageComplete[it.def.stage]);
        const settling =
          completed &&
          puzzle.phase === 'approach' &&
          it.def.stage === puzzle.stageIndex - 1;
        const dormant = visible && (
          it.def.stage === puzzle.stageIndex + 1 ||
          (it.def.stage === puzzle.stageIndex && puzzle.phase === 'approach')
        );
        const retiredVisible = completed && !(
          this.config.stages[it.def.stage].autoRun && it.def.kind === 'timetable-run'
        );
        it.sprite
          .setVisible(current || retiredVisible || dormant)
          .setAlpha(dormant ? 0.16 : settling ? 0.72 : completed ? 0.38 : 1);
        if (dormant) {
          it.sprite.setTint(0x65757d).setScale(1);
          if (it.def.kind === 'timetable-run' || (it.def.kind === 'rail-control' && it.def.command === 'power')) {
            it.sprite.setTexture('hand-generator-off');
          } else if (it.def.kind === 'rail-control' && it.def.command === 'vent') {
            it.sprite.setTexture('circuit-relay-0');
          } else if (it.def.kind === 'rail-control') {
            it.sprite.setTexture('lever-off');
          }
          return;
        }
        if (it.def.kind === 'air-lock') {
          // No next-step highlight in Section III. Tint reports only what the
          // machine has physically done, so it confirms a press without ever
          // naming the order — the gauge and the claw carry that.
          const snap = puzzle.airCircuit?.snapshot();
          const engaged = it.def.command === 'isolate' ? Boolean(snap?.isolateClosed)
            : it.def.command === 'bleed' ? Boolean(snap?.door?.venting)
              : false;
          it.sprite.setTint(completed || engaged ? C(CAR.LAMP_OK) : LANES[LANE_NEAR].figureTint);
          it.sprite.setScale(1);
        } else if (it.def.kind === 'timetable-command') {
          const selected = completed || puzzle.queue.includes(it.def.command);
          const direct = stage.autoRun && puzzle.queue.length === 0;
          it.sprite.setTint(completed ? 0x75d4cd : selected || direct ? 0xf2d49a : LANES[LANE_NEAR].figureTint);
          it.sprite.setScale(completed ? 1 : selected ? 1.12 : direct ? 1.08 : 1);
        } else if (it.def.kind === 'rail-control') {
          const physicalStage = this.config.stages[it.def.stage];
          const selected = completed || puzzle.queue.includes(it.def.command);
          const expected = it.def.stage !== puzzle.stageIndex
            ? false
            : physicalStage.solution[puzzle.queue.length] === it.def.command;
          it.sprite.setTint(completed || selected ? 0x75d4cd : expected ? 0xf2d49a : LANES[LANE_NEAR].figureTint);
          it.sprite.setScale(expected && !completed ? 1.08 : 1);
          if (selected) {
            if (it.def.command === 'power') it.sprite.setTexture('hand-generator-on');
            else if (it.def.command === 'vent') it.sprite.setTexture('circuit-relay-1');
            else it.sprite.setTexture('lever-on');
          }
        } else {
          if (it.def.kind === 'timetable-run') {
            it.sprite.setTexture(
              completed || puzzle.phase === 'executing'
                ? 'hand-generator-on'
                : 'hand-generator-off',
            );
          } else if (it.def.kind === 'timetable-press') {
            it.sprite.setTexture('circuit-relay-0').setTint(completed ? 0x75d4cd : 0xd9bd84).setScale(1);
          } else if (it.def.kind === 'timetable-reset') {
            it.sprite.setTexture('lever-off').setTint(completed ? 0x75d4cd : 0xe45a5f).setScale(1);
          }
        }
      });
    scene.tutorialStageSigns?.forEach((label, index) =>
      label
        .setVisible(visible && puzzle.briefed && (
          index === puzzle.stageIndex ||
          index === puzzle.stageIndex + 1 ||
          puzzle.stageComplete[index]
        ))
        .setAlpha(
          index === puzzle.stageIndex + 1
            ? 0.12
            : puzzle.stageComplete[index] && puzzle.phase === 'approach' && index === puzzle.stageIndex - 1
              ? 0.52
              : puzzle.stageComplete[index]
              ? 0.28
              : puzzle.phase === 'approach'
                ? 0.32
                : 0.62,
        ),
    );
    scene.tutorialGates?.forEach(({ gate, light, vestibuleGlow, window, latchTop, latchBottom }, index) => {
      gate?.setVisible(visible);
      light?.setVisible(visible);
      vestibuleGlow?.setVisible(visible);
      window?.setVisible(visible && !puzzle.stageComplete[index]);
      latchTop?.setVisible(visible && !puzzle.stageComplete[index]);
      latchBottom?.setVisible(visible && !puzzle.stageComplete[index]);
    });
    if (visible) {
      this.updateObjective();
    } else {
      scene.tutorialObjectiveArrow?.setVisible(false);
      scene.tutorialObjectiveLabel?.setVisible(false);
    }
  }

  setupQA() {
    if (!import.meta.env.DEV || typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const qa = params.get('qa');
    // Phase II fixture route: ?qa=phase2&state=<entry|power-fail|latch-closed|
    // signal-mid|energized|complete|reset-replay>. Warps into junction-2 and
    // drives the LIVE interlock instance to the named fixture state, replays
    // the fixture's events through the art module one by one, then兜底 with a
    // steady-state applySnapshot — the same order the QA report prescribes.
    // The freeze flag keeps the driven state from advancing on later frames.
    if (qa === 'phase2') {
      this.scene.tutorialQAActive = true;
      const requested = params.get('state') ?? 'entry';
      const stateName = PHASE2_QA_STATE_NAMES.includes(requested) ? requested : 'entry';
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = CONTACT_STAGE_INDEX;
      puzzle.stageComplete = this.config.stages.map((_, index) => index < CONTACT_STAGE_INDEX);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      const stage = this.config.stages[CONTACT_STAGE_INDEX];
      // Frame the device that proves each QA state. Previously every fixture
      // spawned beside the latch, so contactor failures happened off-screen
      // and the visual route could not actually validate its one-shot flash.
      const focusX = ['power-fail', 'energized', 'complete'].includes(stateName)
        ? CONTACT_INTERLOCK_LAYOUT.endX - 36
        : stateName === 'signal-mid'
          ? (CONTACT_INTERLOCK_LAYOUT.startX + CONTACT_INTERLOCK_LAYOUT.endX) / 2
          : ['relay-waiting', 'panel-open'].includes(stateName)
            ? CONTACT_INTERLOCK_LAYOUT.relayX - 40
            : stage.startX + 92;
      this.scene.player.resetTo(focusX, 400, LANE_NEAR);
      const camera = this.scene.cameras.main;
      camera.setScroll(Math.max(0, focusX - camera.width / 2), 0);
      this.scene.tutorialForceLookDown = false;
      // Fresh route start, then drive. Events first (one-shot animations),
      // snapshot second (steady-state兜底), exactly like the test fixture.
      // The cabinet resets with the room: fixture states beyond the cabinet
      // re-bridge it inside the driver through its public API.
      this.contactLock.reset();
      this.relay.reset();
      // `entry` is the user-facing playtest doorway: it must accept real
      // movement and E input. The other named routes remain frozen fixtures
      // so screenshots can hold transient/intermediate states deterministically.
      this.contactQaFreeze = shouldFreezePhase2QAState(stateName);
      const { snapshot, events } = drivePhase2State(
        stateName,
        this.contactLock,
        { propagationMs: CONTACT_SIGNAL_MS, relay: this.relay },
      );
      events.forEach((evt) => this.contactArt.handleEvent(evt));
      this.contactArt.applySnapshot(snapshot);
      this.relayArt.applySnapshot(this.relay.snapshot());
      // 'panel-open' is the close-up fixture: the driven state is the entry
      // state, then the real open path runs (door beat, camera push, frozen
      // player) so screenshots can verify the close-up in place.
      if (stateName === 'panel-open') {
        this.scene.time.delayedCall(400, () => this.openRelayCloseup());
      }
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      return true;
    }
    // Phase III fixture route: ?qa=phase3&state=<entry|stalled|isolated|
    // released|relocked>. Warps into junction-3 and drives the LIVE
    // local-air-circuit instance to the named fixture, then freezes it (except
    // 'entry', the user-facing playtest doorway, which accepts real input).
    if (qa === 'phase3') {
      this.scene.tutorialQAActive = true;
      const requested = params.get('state') ?? 'entry';
      const stateName = ['entry', 'stalled', 'isolated', 'released', 'relocked'].includes(requested)
        ? requested
        : 'entry';
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = AIR_CIRCUIT_STAGE_INDEX;
      puzzle.stageComplete = this.config.stages.map((_, index) => index < AIR_CIRCUIT_STAGE_INDEX);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      const stage = this.config.stages[AIR_CIRCUIT_STAGE_INDEX];
      // Frame the device that proves each state: the stall reads on the bleed
      // wheel and gauge, the release reads at the claw.
      const focusX = ['released', 'relocked'].includes(stateName)
        ? 2200
        : stateName === 'stalled'
          ? 2050
          : stage.startX + 92;
      this.scene.player.resetTo(focusX, 400, LANE_NEAR);
      const camera = this.scene.cameras.main;
      camera.setScroll(Math.max(0, focusX - camera.width / 2), 0);
      this.scene.tutorialForceLookDown = false;
      const phase = this.ensureAirCircuitState(stage);
      phase.reset();
      phase.enter();
      const hold = (ms) => {
        for (let t = 0; t < ms; t += 50) phase.update(50, { bleedHeld: true });
      };
      const settle = (ms) => {
        for (let t = 0; t < ms; t += 50) phase.update(50, { bleedHeld: false });
      };
      if (stateName === 'stalled') hold(3200); // needle parked at the vent floor
      if (stateName === 'isolated') phase.interact('isolate');
      if (stateName === 'released') {
        phase.interact('isolate');
        hold(2000); // RELEASED: latch free, door leaf not yet moved
      }
      if (stateName === 'relocked') {
        phase.interact('isolate');
        hold(2000);
        phase.interact('isolate'); // supply restored too early
        settle(4000); // latch re-bites: back to LOCKED
      }
      // Fixtures are steady states: swallow the one-shot events so nothing
      // animates after the freeze.
      phase.drainEvents();
      this.airCircuitQaFreeze = stateName !== 'entry';
      this.refreshAirCircuitVisuals(phase.snapshot());
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      return true;
    }
    // Phase IV fixture route: ?qa=phase4&state=<entry|spinning|charged|
    // biting>. Warps into junction-4 and drives the LIVE weight-transfer
    // instance to the named fixture, then freezes it (except 'entry', the
    // user-facing playtest doorway, which accepts real input).
    if (qa === 'phase4') {
      this.scene.tutorialQAActive = true;
      const requested = params.get('state') ?? 'entry';
      const stateName = ['entry', 'spinning', 'charged', 'biting'].includes(requested)
        ? requested
        : 'entry';
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = WEIGHT_TRANSFER_STAGE_INDEX;
      puzzle.stageComplete = this.config.stages.map((_, index) => index < WEIGHT_TRANSFER_STAGE_INDEX);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      const stage = this.config.stages[WEIGHT_TRANSFER_STAGE_INDEX];
      // Frame the device that proves each state: the spin reads at the TEST
      // stand and the drive wheel, the charge at the bags and the valve.
      const focusX = stateName === 'spinning' || stateName === 'biting'
        ? 2900
        : stateName === 'charged'
          ? 2660
          : stage.startX + 92;
      this.scene.player.resetTo(focusX, 400, LANE_NEAR);
      const camera = this.scene.cameras.main;
      camera.setScroll(Math.max(0, focusX - camera.width / 2), 0);
      this.scene.tutorialForceLookDown = false;
      const phase = this.ensureWeightTransferState(stage);
      phase.reset();
      phase.enter();
      const runFor = (ms, trolleyDir = 0) => {
        for (let t = 0; t < ms; t += 50) {
          if (trolleyDir) phase.moveTrolley(trolleyDir, 50);
          phase.update(50);
        }
      };
      if (stateName === 'spinning') {
        // Motor TESTed with the bags flat and the trolley parked: free-rev.
        phase.interact('test');
        runFor(2200);
      }
      if (stateName === 'charged') {
        // Repair done, counterweight still at the maintenance end.
        phase.interact('level-drain');
        phase.interact('level-supply');
        runFor(8000);
      }
      if (stateName === 'biting') {
        phase.interact('level-drain');
        phase.interact('level-supply');
        runFor(8000);
        phase.setTrolleyGrabbed(true);
        runFor(6000, 1);
        phase.setTrolleyGrabbed(false);
        phase.interact('test');
        runFor(1400); // bite + a visible crawl, well short of completion
      }
      // Fixtures are steady states: swallow the one-shot events so nothing
      // animates after the freeze.
      phase.drainEvents();
      this.weightTransferQaFreeze = stateName !== 'entry';
      this.refreshWeightTransferVisuals(phase.snapshot());
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      return true;
    }
    // Phase V fixture route: ?qa=phase5&state=<entry|contradiction|safe|
    // repaired>. Warps into junction-5 and drives the LIVE bogie-diagnosis
    // instance to the named fixture, then freezes it (except 'entry', the
    // user-facing playtest doorway, which accepts real input).
    if (qa === 'phase5') {
      this.scene.tutorialQAActive = true;
      const requested = params.get('state') ?? 'entry';
      const stateName = ['entry', 'contradiction', 'safe', 'repaired'].includes(requested)
        ? requested
        : 'entry';
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = BOGIE_SERVICE_STAGE_INDEX;
      puzzle.stageComplete = this.config.stages.map((_, index) => index < BOGIE_SERVICE_STAGE_INDEX);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      const stage = this.config.stages[BOGIE_SERVICE_STAGE_INDEX];
      // Frame the device that proves each state: the contradiction reads at
      // the TEST stand and both wheelsets, the safe chain at the rear bogie.
      const focusX = stateName === 'contradiction'
        ? 3500
        : stateName === 'entry'
          ? stage.startX + 92
          : 3760;
      this.scene.player.resetTo(focusX, 400, LANE_NEAR);
      const camera = this.scene.cameras.main;
      camera.setScroll(Math.max(0, focusX - camera.width / 2), 0);
      this.scene.tutorialForceLookDown = stageHasUnderfloorView(stage);
      const phase = this.ensureBogieDiagnosisState(stage);
      phase.reset();
      phase.enter();
      const LOAD = { trolleyX: 1, suspensionHealth: 1 };
      const runFor = (ms) => {
        for (let t = 0; t < ms; t += 50) phase.update(50, LOAD);
      };
      if (stateName === 'contradiction') {
        // One TEST, one answer split in two: front turns, rear stays dark.
        phase.interact('test');
        runFor(1800);
      }
      if (stateName === 'safe') {
        // Mid-chain: isolated, bled flat, pin seated — the safe-work state.
        phase.interact('brake-isolate');
        phase.setVentHeld(true);
        runFor(2400);
        phase.setVentHeld(false);
        phase.interact('service-lock');
        runFor(100);
      }
      if (stateName === 'repaired') {
        // Piston freed and line restored; TEST has not been pressed again.
        phase.interact('brake-isolate');
        phase.setVentHeld(true);
        runFor(2400);
        phase.setVentHeld(false);
        phase.interact('service-lock');
        phase.interact('repair');
        phase.interact('service-lock');
        phase.interact('brake-isolate');
        runFor(5000);
      }
      // Fixtures are steady states: swallow the one-shot events so nothing
      // animates after the freeze.
      phase.drainEvents();
      this.bogieQaFreeze = stateName !== 'entry';
      this.refreshBogieVisuals(phase.snapshot());
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      return true;
    }
    // Phase VI fixture route: ?qa=phase6&state=<entry|window|biting|departing>.
    // Warps into junction-6 and drives the LIVE echo-replay instance to the
    // named fixture, then freezes it (except 'entry', the user-facing
    // playtest doorway, which accepts real input). No IV trace exists under a
    // warp, so the replay runs the canonical fallback — exactly the degrade
    // path lock §2.4 mandates.
    if (qa === 'phase6') {
      this.scene.tutorialQAActive = true;
      const requested = params.get('state') ?? 'entry';
      const stateName = ['entry', 'window', 'biting', 'departing'].includes(requested)
        ? requested
        : 'entry';
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = ECHO_LOAD_STAGE_INDEX;
      puzzle.stageComplete = this.config.stages.map((_, index) => index < ECHO_LOAD_STAGE_INDEX);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      const stage = this.config.stages[ECHO_LOAD_STAGE_INDEX];
      const focusX = stateName === 'entry' ? stage.startX + 92 : stage.echoLoad.machines.test.x;
      this.scene.player.resetTo(focusX, 400, LANE_NEAR);
      const camera = this.scene.cameras.main;
      camera.setScroll(Math.max(0, focusX - camera.width / 2), 0);
      this.scene.tutorialForceLookDown = stageHasUnderfloorView(stage);
      const phase = this.ensureEchoReplayState(stage);
      phase.reset();
      phase.enter();
      const INPUTS = {
        interlockComplete: true,
        airPathOpen: true,
        bogiesSynced: true,
        suspensionHealth: 1,
      };
      const runFor = (ms) => {
        for (let t = 0; t < ms; t += 50) phase.update(50, INPUTS);
      };
      if (stateName !== 'entry') {
        // Fixtures skip the observation loop and land mid-rhythm.
        runFor(6000 + 2950); // loop 1, inside the arming window
      }
      if (stateName === 'biting' || stateName === 'departing') {
        phase.interact('test');
        runFor(stateName === 'biting' ? 500 : 1400);
      }
      // Fixtures are steady states: swallow the one-shot events so nothing
      // animates after the freeze.
      phase.drainEvents();
      this.echoQaFreeze = stateName !== 'entry';
      this.refreshEchoVisuals(phase.snapshot());
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      return true;
    }
    if (
      !qa?.startsWith('timetable-') &&
      !['tutorial-exit', 'chapter-card', 'departure-moving'].includes(qa)
    ) return false;
    this.scene.tutorialQAActive = true;
    if (qa === 'departure-moving') {
      this.scene.time.delayedCall(280, () => {
        this.scene.prologueTransitionActive = true;
        this.scene.departureScroll = 680;
        this.scene.player.frozen = true;
        this.scene.departureStreaks.forEach((streak) => streak.setVisible(true).setAlpha(0.72));
      });
      return true;
    }
    if (qa === 'chapter-card') {
      this.scene.time.delayedCall(240, () => {
        this.scene.game.events.emit('hud:prologue-transition', {
          kicker: 'CHAPTER ONE',
          title: 'THE SAFETY TEST',
          subtitle: 'The train begins moving backward through its own explanations.',
          qa: true,
        });
      });
      return true;
    }
    const requested = Number(qa.match(/^timetable-(\d+)/)?.[1]);
    const stageIndex = qa === 'tutorial-exit'
      ? this.config.stages.length - 1
      : Phaser.Math.Clamp((Number.isFinite(requested) ? requested : 1) - 1, 0, this.config.stages.length - 1);
    const puzzle = this.scene.tutorialPuzzle;
    puzzle.stageIndex = stageIndex;
    puzzle.stageComplete = this.config.stages.map((_, index) => index < stageIndex);
    puzzle.briefed = true;
    puzzle.echoRecorded = stageIndex >= 4;
    puzzle.phase = 'idle';
    puzzle.queue = [];
    const stage = this.currentStage();
    // Jumping straight to a stage must not inherit another stage's analogue
    // state, or the gauge and the gate index start out lying.
    puzzle.pressure = stage.pressureHold?.start ?? 100;
    puzzle.pressureVenting = false;
    puzzle.pressureBraked = false;
    puzzle.pressureSettled = false;
    puzzle.pressureHintLast = undefined;
    puzzle.echoGateIndex = 0;
    puzzle.echoGatesCleared = [];
    puzzle.echoAtValve = false;
    // Same reason: a warp must not inherit a drum mid-revolution, and must not
    // inherit machine flags that would let stage III open with the brake
    // already set.
    this.cancelDrum();
    puzzle.drum = null;
    puzzle.drumMachine = null;
    this.scene.player.resetTo(stage.startX + 92, 400, LANE_NEAR);
    if (qa === 'timetable-3-layout') {
      this.scene.player.body.reset(2110, 400);
    }
    if (qa === 'timetable-6-cab') {
      this.scene.player.resetTo(stage.endX - 132, 400, LANE_NEAR);
    }
    this.scene.tutorialForceLookDown = stageHasUnderfloorView(stage);
    this.scene.refreshTutorialStageVisuals();
    this.refresh();
    const triggerForQA = (command) => {
      const target = this.scene.interactables.find(
        (it) => it.def.stage === stageIndex && it.def.command === command,
      );
      if (!target) return;
      if (target.def.kind === 'rail-control') this.operateRailControl(target);
      else this.punch(command, target.sprite);
    };
    if (qa === 'timetable-1-auto' || qa === 'timetable-1-enter') {
      this.scene.player.body.reset(stage.commandX - 20, 400);
      this.scene.time.delayedCall(260, () => triggerForQA('door'));
    }
    if (qa === 'timetable-1-enter') {
      this.scene.time.delayedCall(3200, () => {
        const nextStage = this.config.stages[1];
        this.scene.player.body.reset(nextStage.startX + 96, 400);
      });
    }
    if (qa === 'timetable-3-fail') {
      this.scene.player.body.reset(stage.commandX - 20, 400);
      this.scene.time.delayedCall(260, () => triggerForQA('door'));
      this.scene.time.delayedCall(520, () => triggerForQA('vent'));
      this.scene.time.delayedCall(780, () => triggerForQA('brake'));
      this.scene.time.delayedCall(1060, () => {
        const run = this.scene.interactables.find(
          (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-run',
        );
        if (run) this.run(run.sprite);
      });
    }
    if (qa === 'timetable-3-auto') {
      stage.solution.forEach((command, index) => {
        this.scene.time.delayedCall(260 + index * 260, () => triggerForQA(command));
      });
      this.scene.time.delayedCall(1120, () => {
        const run = this.scene.interactables.find(
          (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-run',
        );
        if (run) this.run(run.sprite);
      });
    }
    if (qa === 'timetable-3-reset') {
      const slot = this.scene.interactables.find(
        (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-press',
      );
      const run = this.scene.interactables.find(
        (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-run',
      );
      const reset = this.scene.interactables.find(
        (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-reset',
      );
      this.scene.time.delayedCall(1500, () => triggerForQA('brake'));
      this.scene.time.delayedCall(2100, () => triggerForQA('vent'));
      this.scene.time.delayedCall(2500, () => {
        if (run) this.run(run.sprite);
      });
      // Reset while the pointer is already moving. This exercises the harder
      // branch: cancel the real-clock scheduler, clear cards, and restore the
      // mechanical pose without resetting the room or the player.
      this.scene.time.delayedCall(4300, () => this.resetDrum(reset?.sprite));
      this.scene.time.delayedCall(4550, () => {
        if (reset) this.scene.player.body.reset(reset.sprite.x, 400);
      });
    }
    if (qa === 'timetable-3-duplicate') {
      const run = this.scene.interactables.find(
        (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-run',
      );
      this.scene.time.delayedCall(900, () => triggerForQA('brake'));
      // Two BRAKE cards is now a legal strip, not a refused input. This route
      // exists to prove the machine — not the input layer — is what reports the
      // problem: both cards fire, the door never opens, and nothing on screen
      // says which command is missing.
      this.scene.time.delayedCall(1250, () => triggerForQA('brake'));
      this.scene.time.delayedCall(1650, () => {
        if (run) this.run(run.sprite);
      });
    }
    if (qa === 'timetable-3-sparse') {
      // Three punches land in slots 1-2-3 by themselves now. There is no cursor
      // to advance: the strip fills in the order the player strikes it.
      this.scene.time.delayedCall(700, () => triggerForQA('brake'));
      this.scene.time.delayedCall(1200, () => triggerForQA('vent'));
      this.scene.time.delayedCall(1700, () => triggerForQA('door'));
    }
    return true;
  }

  destroy() {
    // Relay close-up teardown first: every listener registered in
    // _setupRelayInput comes off, the blur hook is removed, and no path may
    // leave the scene flagged mid-close-up (a HUD hidden by an open close-up
    // would otherwise stay hidden across the scene restart, and a frozen
    // flag would eat the next run's E input).
    if (this._relayHandlers) {
      const input = this.scene.input;
      input.off('pointerdown', this._relayHandlers.down);
      input.off('pointermove', this._relayHandlers.move);
      input.off('pointerup', this._relayHandlers.up);
      input.off('gameout', this._relayHandlers.out);
      this._relayHandlers = null;
    }
    if (this._relayBlurHandler && typeof window !== 'undefined') {
      window.removeEventListener('blur', this._relayBlurHandler);
      this._relayBlurHandler = null;
    }
    if (this.relayCloseupState !== 'closed') {
      this.relayCloseupState = 'closed';
      this.scene.relayCloseupActive = false;
      this.scene.scene.setVisible(true, 'Hud');
      this._setRelayCursor(false);
    }
    this.relayArt?.destroy();
    this.relayArt = null;
    this.relay?.destroy();
    this.relay = null;
    this.contactArt?.destroy();
    this.contactArt = null;
    this.contactLock?.destroy();
    this.contactLock = null;
    // The air-circuit instance lives on the puzzle state object.
    this.scene.tutorialPuzzle?.airCircuit?.destroy();
    if (this.scene.tutorialPuzzle) {
      this.scene.tutorialPuzzle.airCircuit = null;
      this.scene.tutorialPuzzle.airNetwork = null;
    }
    this.objects.forEach((object) => object?.destroy?.());
    this.objects.length = 0;
  }
}
