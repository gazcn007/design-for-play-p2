import Phaser from 'phaser';
import { LANE_NEAR, LANES } from '../constants.js';
import { sfx } from '../sfx.js';

const COMMANDS = {
  brake: { short: '■', label: 'BRAKE', color: 0xe45a5f },
  power: { short: 'ϟ', label: 'POWER', color: 0x75d4cd },
  vent: { short: '○', label: 'VENT', color: 0x9fb7c0 },
  door: { short: '↔', label: 'DOOR', color: 0xcaa66b },
  release: { short: '→', label: 'LATCH', color: 0xb68bc3 },
  couple: { short: '∞', label: 'COUPLE', color: 0xf2d49a },
};

const RAIL_CONTROLS = {
  brake: { label: 'BRAKE SHOE', prompt: 'CLAMP WHEEL' },
  vent: { label: 'BLEED VALVE', prompt: 'OPEN AIR VALVE' },
  power: { label: 'AXLE MOTOR', prompt: 'ENERGIZE MOTOR' },
  couple: { label: 'DRAFT GEAR', prompt: 'UNLOAD COUPLER' },
};

const FAIL_LINES = [
  'The door motor received no usable instruction.',
  'The contact shoe is still hanging clear. Compress the suspension first.',
  'The door cylinder is still pressurized. Empty the brake pipe before release.',
  'The trolley never gained weight. Brake before releasing its latch.',
  'The axle motor refuses live pressure. Clamp, vent, then energize it.',
  'The coupler is carrying the full train load. Unload it before release.',
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
          .text(stage.startX + 32, 310, stage.title, {
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
      const rack = this.track(
        scene.add
          .rectangle(stage.rackX, 370, 138, 78, 0x0b1319, 0.96)
          .setStrokeStyle(2, 0xcaa66b, 0.62),
        57,
      );
      const rackTitle = this.track(
        scene.add.text(stage.rackX, 342, 'TIMETABLE', { ...style, color: '#d9bd84' }).setOrigin(0.5),
        59,
      );
      const queue = this.track(
        scene.add
          .text(stage.rackX, 372, '', {
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: '17px',
            color: '#f2d49a',
          })
          .setOrigin(0.5),
        59,
      );
      const tick = this.track(scene.add.rectangle(stage.rackX - 57, 404, 10, 3, 0xcaa66b, 0.8), 59);
      const paperStrip = this.track(
        scene.add
          .rectangle(stage.rackX, 416, 104, 13, 0xe5cf9b, 0.82)
          .setStrokeStyle(1, 0x6f5736, 0.75),
        58,
      );
      const punchHead = this.track(
        scene.add.rectangle(stage.rackX - 52, 354, 13, 22, 0x7f6540, 1).setStrokeStyle(1, 0xf2d49a, 0.64),
        61,
      );
      const completedLabel = this.track(
        scene.add
          .text(stage.rackX, 426, 'SERVICE SET', {
            ...style,
            fontSize: '8px',
            color: '#75d4cd',
            backgroundColor: '#071016',
            padding: { x: 6, y: 2 },
          })
          .setOrigin(0.5),
        61,
      );
      const completionLamp = this.track(
        scene.add.circle(stage.rackX + 58, 343, 4, 0x75d4cd, 0.9).setBlendMode(Phaser.BlendModes.ADD),
        61,
      );
      const guideLabel = stage.guideSequence
        ? this.track(
            scene.add
              .text(
                stage.rackX,
                398,
                stage.guideSequence
                  .map((command, index) => `${index + 1} ${COMMANDS[command].label}`)
                  .join('  →  '),
                {
                  ...style,
                  fontSize: '8px',
                  color: '#d9bd84',
                  backgroundColor: undefined,
                  padding: { x: 0, y: 0 },
                },
              )
              .setOrigin(0.5),
            60,
          )
        : null;

      const commandLabels = stage.commands.map((command) => {
        const interactable = scene.interactables.find(
          (candidate) => candidate.def.stage === stageIndex && candidate.def.command === command,
        );
        const spec = COMMANDS[command];
        const physicalLabel = stage.physicalSequence ? RAIL_CONTROLS[command]?.label : null;
        return this.track(
          scene.add
            .text(interactable.sprite.x, 365, physicalLabel ?? `${spec.short}\n${spec.label}`, {
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: '10px',
              align: 'center',
              color: `#${spec.color.toString(16).padStart(6, '0')}`,
              backgroundColor: '#081016',
              padding: { x: 5, y: 4 },
            })
            .setOrigin(0.5),
          60,
        );
      });

      const memoryLabel = stage.echoAssist
        ? this.track(
            scene.add
              .text(stage.rackX, 414, `TRAIN MEMORY  ${COMMANDS[stage.echoAssist].short} ${COMMANDS[stage.echoAssist].label}`, {
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
      const runLabel = run
        ? this.track(
            scene.add
              .text(run.sprite.x, 365, '▶\nRUN', {
                ...style,
                align: 'center',
                color: '#75d4cd',
              })
              .setOrigin(0.5),
            60,
          )
        : null;

      const machinery = this.buildMachinery(stage, stageIndex);
      const hasEcho = Boolean(stage.echoAssist || stage.echoGates || stage.echoSync);
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
        rackTitle,
        queue,
        tick,
        paperStrip,
        punchHead,
        completedLabel,
        completionLamp,
        guideLabel,
        commandLabels,
        memoryLabel,
        runLabel,
        machinery,
        echo,
        echoGlow,
        echoRail,
        echoNodes,
      });
    });

    scene.tutorialObjectiveArrow = this.track(
      scene.add
        .text(125, 339, '▼', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '20px',
          color: '#f2d49a',
        })
        .setOrigin(0.5),
      61,
    );
    scene.tutorialObjectiveLabel = this.track(
      scene.add.text(125, 318, 'SPEAK', { ...style, color: '#f2d49a' }).setOrigin(0.5),
      61,
    );
    scene.tweens.add({
      targets: scene.tutorialObjectiveArrow,
      y: 345,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.refresh();
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
    }

    const wheelX = stage.underfloor ? center - 155 : center - 82;
    const wheelY = stage.underfloor ? underY + 65 : underY + 6;
    const brakeLeft = this.track(scene.add.rectangle(wheelX - 69, wheelY, 18, 54, 0xe45a5f, 0.64), 56);
    const brakeRight = this.track(scene.add.rectangle(wheelX + 69, wheelY, 18, 54, 0xe45a5f, 0.64), 56);
    const pressureBar = this.track(
      scene.add.rectangle(center + 116, underY - 42, 12, 62, 0x9fb7c0, 0.76).setOrigin(0.5, 1),
      56,
    );
    const gaugeFace = this.track(
      scene.add.circle(center + 116, underY - 88, 18, 0x10191e, 1).setStrokeStyle(3, 0xb8a274, 0.74),
      56,
    );
    const gaugeNeedle = this.track(
      scene.add.rectangle(center + 116, underY - 88, 14, 2, 0xe4c276, 1).setOrigin(0.14, 0.5).setAngle(-38),
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
    const airPipe = stage.underfloor
      ? this.track(
          scene.add.rectangle(center + 18, underY - 59, Math.max(160, right - left - 260), 6, 0x9fb7c0, 0.78),
          57,
        )
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
    const contactReceiver = index === 1
      ? this.track(scene.add.circle(center + 112, 292, 10, 0x405159, 0.95).setStrokeStyle(2, 0x75d4cd, 0.45), 57)
      : null;
    const contactShoe = index === 1
      ? this.track(scene.add.circle(center + 112, 326, 9, 0xcaa66b, 0.9).setStrokeStyle(2, 0xf2d49a, 0.7), 57)
      : null;
    const contactBridge = index === 1
      ? this.track(scene.add.rectangle(center + 112, 309, 4, 22, 0x75d4cd, 0.8).setAlpha(0.12), 56)
      : null;
    const trolley = index === 3
      ? this.track(scene.add.rectangle(stage.startX + 355, 429, 112, 45, 0x28353c, 1).setStrokeStyle(2, 0xb68bc3, 0.75), 37)
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
      wheelSpokeLeft,
      wheelSpokeRight,
      axlePulse,
      contactReceiver,
      contactShoe,
      contactBridge,
      trolley,
      couplerLeft,
      couplerRight,
      controlLink,
      controlPaths,
      wheelX,
      wheelY,
      underY,
      initialBogieY: bogieFrame?.y,
      initialReservoirY: airReservoir?.y,
      initialReservoirScaleX: airReservoir?.scaleX,
      initialTrolleyX: trolley?.x,
      initialCouplerLeftX: couplerLeft?.x,
      initialCouplerRightX: couplerRight?.x,
    };
  }

  isTimetableKind(kind) {
    return ['timetable-command', 'timetable-run', 'timetable-manual', 'rail-control'].includes(kind);
  }

  canInteract(interactable) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!this.isTimetableKind(interactable.def.kind)) return true;
    if (!puzzle.briefed || ['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return false;
    if (interactable.def.kind === 'timetable-manual') {
      return interactable.def.stage === puzzle.stageIndex && puzzle.phase === 'manual-window';
    }
    if (['executing', 'manual-window', 'echo-replay', 'echo-travel', 'echo-retry'].includes(puzzle.phase)) return false;
    if (interactable.def.stage !== puzzle.stageIndex) return false;
    const stage = this.currentStage();
    if (interactable.def.kind === 'rail-control') {
      if (!stage.physicalSequence) return false;
      // Section V: BRAKE and VENT are always available because the player is
      // managing a live quantity, not walking a fixed order. POWER is the only
      // gated control, and it is gated by the machine's state, not by a step
      // counter — so no highlight can give the answer away.
      if (stage.pressureHold) {
        if (interactable.def.command === 'power') {
          return !puzzle.pressureSettled;
        }
        return interactable.def.command === 'brake' || interactable.def.command === 'vent';
      }
      // Section VI: the control that clears PAST's current obstacle. The player
      // reads which one from what PAST is stuck against, not from a tint.
      if (stage.echoGates) {
        const gate = stage.echoGates[puzzle.echoGateIndex];
        if (!gate) return false;
        return interactable.def.command === gate.command;
      }
      if (stage.echoSync && puzzle.queue.length > 0) {
        return puzzle.phase === 'echo-sync' && puzzle.activeCommand === interactable.def.command;
      }
      return true;
    }
    if (stage.autoRun && puzzle.phase === 'programming') return false;
    if (interactable.def.kind === 'timetable-run') {
      if (stage.autoRun) return false;
      if (stage.guideSequence && puzzle.queue.length < stage.solution.length) return false;
    }
    return true;
  }

  promptFor(interactable) {
    if (interactable.def.kind === 'rail-control') {
      const stage = this.currentStage();
      // The valve is the one control the player holds instead of taps, so the
      // prompt has to say so — this is the moment the input verb changes.
      if (stage.pressureHold && interactable.def.command === 'vent') {
        return '[HOLD E] BLEED THE LINE';
      }
      return `[E] ${RAIL_CONTROLS[interactable.def.command]?.prompt ?? 'OPERATE'}`;
    }
    if (interactable.def.kind === 'timetable-command') {
      return `[E] PUNCH ${COMMANDS[interactable.def.command].label}`;
    }
    if (interactable.def.kind === 'timetable-run') return '[E] RUN TIMETABLE';
    if (interactable.def.kind === 'timetable-manual') return '[E] RELEASE TROLLEY';
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
    if (interactable.def.kind === 'timetable-run') {
      this.run(interactable.sprite);
      return true;
    }
    if (interactable.def.kind === 'timetable-manual') {
      this.performManualAction(interactable);
      return true;
    }
    return false;
  }

  punch(command, sprite) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    const expected = stage.solution[puzzle.queue.length];
    if (stage.guideSequence && command !== expected) {
      scene.player.playInteraction();
      scene.pulseTutorialDevice(sprite, 0xe45a5f);
      scene.cameras.main.shake(100, 0.003);
      scene.game.events.emit(
        'hud:toast',
        puzzle.queue.length === 0
          ? 'The power shoe is still above the rail. Lower the car with BRAKE first.'
          : 'The car is lowered. Now let the contact take POWER.',
      );
      sfx.blocked();
      this.refresh();
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
    if (stage.pressureHold) {
      this.operatePressureControl(interactable);
      return;
    }
    if (stage.echoGates) {
      this.operateEchoGate(interactable);
      return;
    }
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
   * Section V. BRAKE clamps the wheel and halves the bleed rate; VENT is held
   * to drop pressure and released to let it climb back; POWER only takes if the
   * line is inside its working band. Nothing here is an ordering step, so the
   * player has to read the gauge and the machine rather than guess a sequence.
   */
  operatePressureControl(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    const spec = stage.pressureHold;
    const command = interactable.def.command;

    if (command === 'brake') {
      if (puzzle.pressureBraked) {
        sfx.blocked();
        scene.game.events.emit('hud:toast', 'The shoe is already hard against the wheel.');
        return;
      }
      puzzle.pressureBraked = true;
      scene.player.playInteraction();
      scene.pulseTutorialDevice(interactable.sprite, COMMANDS.brake.color);
      interactable.sprite.setTexture('lever-on');
      this.applyAction('brake', true);
      scene.game.events.emit('hud:toast', 'The wheel is clamped. The line will now bleed down half as fast.');
      this.refresh();
      return;
    }

    if (command === 'vent') {
      // Held, not tapped. The press only opens the valve; update() does the work
      // and the key release closes it again.
      puzzle.pressureVenting = true;
      scene.player.playInteraction();
      scene.pulseTutorialDevice(interactable.sprite, COMMANDS.vent.color);
      interactable.sprite.setTexture('circuit-relay-1');
      sfx.lever();
      this.refresh();
      return;
    }

    // POWER. Judged entirely on the live pressure value.
    const inBand = puzzle.pressure >= spec.bandLow && puzzle.pressure <= spec.bandHigh;
    if (!inBand) {
      const tooHigh = puzzle.pressure > spec.bandHigh;
      scene.player.playInteraction();
      scene.pulseTutorialDevice(interactable.sprite, 0xe45a5f);
      scene.cameras.main.shake(150, 0.004);
      scene.applyHitstop(70, 0.1);
      scene.game.events.emit(
        'hud:toast',
        tooHigh
          ? 'The motor stalls against live pressure. Bleed the line further before energizing it.'
          : 'The line is flat — there is no air left to drive the axle. Let it recharge.',
      );
      sfx.blocked();
      this.pulseMachineryFault(this.stageAssemblies[puzzle.stageIndex]);
      return;
    }

    puzzle.pressureSettled = true;
    puzzle.pressureVenting = false;
    puzzle.queue = ['brake', 'vent', 'power'];
    puzzle.phase = 'physical';
    scene.player.playInteraction();
    scene.pulseTutorialDevice(interactable.sprite, COMMANDS.power.color);
    interactable.sprite.setTexture('hand-generator-on');
    scene.applyHitstop(60, 0.14);
    this.refresh();
    const stageIndex = puzzle.stageIndex;
    scene.time.delayedCall(100, () => {
      if (puzzle.stageIndex === stageIndex && puzzle.phase === 'physical') {
        this.completeStage({ pendingActions: ['power'] });
      }
    });
  }

  /**
   * Section VI. PAST walks the lower deck and stops at each obstacle; the player
   * clears it from above with the matching control. The verbs are unchanged but
   * their meaning is: BRAKE stills a wheel so PAST can pass between the spokes.
   * PAST waits indefinitely, so there is no timing window and no failure.
   */
  operateEchoGate(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    const command = interactable.def.command;
    const gate = stage.echoGates[puzzle.echoGateIndex];
    if (!gate || puzzle.phase === 'echo-travel') return;

    if (command !== gate.command) {
      scene.player.playInteraction();
      scene.pulseTutorialDevice(interactable.sprite, 0xe45a5f);
      scene.cameras.main.shake(150, 0.004);
      scene.game.events.emit('hud:toast', gate.blockedHint);
      sfx.blocked();
      this.pulseMachineryFault(this.stageAssemblies[puzzle.stageIndex]);
      return;
    }

    puzzle.echoGatesCleared = [...puzzle.echoGatesCleared, gate.command];
    puzzle.queue = [...puzzle.echoGatesCleared];
    scene.player.playInteraction();
    scene.pulseTutorialDevice(interactable.sprite, COMMANDS[command].color);
    if (command === 'power') interactable.sprite.setTexture('hand-generator-on');
    else if (command === 'vent') interactable.sprite.setTexture('circuit-relay-1');
    else interactable.sprite.setTexture('lever-on');
    scene.applyHitstop(55, 0.13);
    this.applyAction(command, true);
    scene.game.events.emit('hud:toast', gate.clearedHint);
    this.advanceEchoToGate(puzzle.stageIndex, puzzle.echoGateIndex + 1);
  }

  /**
   * Walks PAST from its current position to the next blocked obstacle, or to the
   * bleed valve once every gate is cleared. Reaching the valve is what unlocks
   * the player's door, so the partner is mechanically required.
   */
  advanceEchoToGate(stageIndex, gateIndex) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.config.stages[stageIndex];
    const assembly = this.stageAssemblies[stageIndex];
    if (!assembly?.echo || !stage?.echoGates) return;

    const gate = stage.echoGates[gateIndex];
    const targetX = gate ? gate.x : stage.echoValveX;
    puzzle.phase = 'echo-travel';
    puzzle.echoGateIndex = gateIndex;
    scene.tweens.killTweensOf([assembly.echo, assembly.echoGlow, assembly.echoRail]);
    assembly.echo.setVisible(true).setTexture('player-walk-1').setAlpha(0.82);
    assembly.echoGlow?.setVisible(true);
    assembly.echoRail?.setVisible(true);

    for (let step = 0; step < 5; step += 1) {
      scene.time.delayedCall(step * 130, () => {
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
      x: targetX,
      duration: 820,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (puzzle.stageIndex !== stageIndex || puzzle.phase !== 'echo-travel') return;
        if (gate) {
          puzzle.phase = 'echo-blocked';
          assembly.echo.setTexture('player-idle-0').setAlpha(0.88);
          scene.game.events.emit('hud:toast', gate.blockedHint);
          this.refresh();
          return;
        }
        // Every gate cleared. PAST holds the valve; the door can open.
        puzzle.phase = 'physical';
        puzzle.echoAtValve = true;
        puzzle.queue = [...stage.solution];
        assembly.echo.setTexture('player-interact-1').setAlpha(0.96).setScale(1.28);
        assembly.echoGlow?.setAlpha(0.38).setScale(1.2);
        scene.applyHitstop(70, 0.12);
        scene.game.events.emit(
          'hud:toast',
          'PAST reaches the bleed valve and holds it open. The line falls — your door will take the release now.',
        );
        this.refresh();
        scene.time.delayedCall(140, () => {
          if (puzzle.stageIndex === stageIndex && puzzle.phase === 'physical') {
            this.completeStage({ pendingActions: ['couple'] });
          }
        });
      },
    });
    this.refresh();
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
    if (correct && !stage.manualAction) {
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
      if (sequenceCorrect && stage.manualAction) this.beginManualWindow(sprite);
      else if (sequenceCorrect) this.completeStage();
      else this.failStage(sprite);
    });
  }

  beginManualWindow(runSprite) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    puzzle.phase = 'manual-window';
    puzzle.manualUntil = scene.time.now + stage.manualWindowMs + (scene.tutorialManualQA ? 10000 : 0);
    puzzle.activeCommand = 'release-window';
    scene.player.frozen = false;
    runSprite.setTexture('hand-generator-on');
    scene.registry.set('tutorialPowerState', 'manual-window');
    scene.game.events.emit('hud:toast', 'The brake throws the trolley forward—release its latch now.');
    this.refresh();
  }

  performManualAction(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stageIndex = puzzle.stageIndex;
    if (puzzle.phase !== 'manual-window' || scene.time.now > puzzle.manualUntil) return;
    puzzle.echoRecorded = true;
    puzzle.phase = 'manual-complete';
    puzzle.activeCommand = 'release';
    interactable.sprite.setTexture('lever-on');
    scene.player.playInteraction();
    scene.pulseTutorialDevice(interactable.sprite, COMMANDS.release.color);
    sfx.lever();
    scene.game.events.emit('hud:toast', 'The train stores the timing of your hand on the latch.');
    scene.time.delayedCall(100, () => {
      if (puzzle.stageIndex === stageIndex && puzzle.phase === 'manual-complete') {
        this.completeStage({ pendingActions: ['release'] });
      }
    });
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
      if (machinery.contactShoe) {
        scene.tweens.add({ targets: machinery.contactShoe, y: 306, duration: 420, ease: 'Back.easeOut' });
        scene.tweens.add({ targets: machinery.contactBridge, alpha: 0.48, duration: 420 });
      }
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
        const pipeOriginX = machinery.airPipe
          ? machinery.airPipe.x - machinery.airPipe.displayWidth * 0.4 + i * machinery.airPipe.displayWidth * 0.16
          : machinery.pressureBar.x;
        const pipeOriginY = machinery.airPipe?.y ?? machinery.pressureBar.y - 24;
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
      if (machinery.contactReceiver) {
        machinery.contactReceiver.setFillStyle(color, 1);
        machinery.contactShoe.setFillStyle(color, 1);
        scene.tweens.add({ targets: [machinery.contactReceiver, machinery.contactShoe], scale: 1.35, duration: 180, yoyo: true });
        scene.tweens.add({ targets: machinery.contactBridge, alpha: 1, duration: 180 });
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
    assembly.punchHead.setFillStyle(color, 1).setY(354);
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
      scene.add.circle(assembly.punchHead.x, 374, 2, color, 0.95).setBlendMode(Phaser.BlendModes.ADD),
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
    if (machinery.contactShoe) {
      machinery.contactShoe.setY(306).setFillStyle(0x75d4cd, 1);
      machinery.contactReceiver.setFillStyle(0x75d4cd, 1);
      machinery.contactBridge.setAlpha(0.88);
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
    scene.game.events.emit('hud:toast', FAIL_LINES[stageIndex]);
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
    scene.addScore(last ? 75 : 30, this.currentStage().runX, 370);
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
      'The suspension drops; the contact shoe catches power.',
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
    machinery.contactReceiver?.setFillStyle(0x405159, 0.95).setScale(1);
    machinery.contactShoe?.setFillStyle(0xcaa66b, 0.9).setPosition(machinery.contactShoe.x, 326).setScale(1);
    machinery.contactBridge?.setAlpha(0.12);
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
  updatePressure(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    const spec = stage?.pressureHold;
    if (!spec || puzzle.pressureSettled) return;
    if (!['idle', 'programming', 'physical'].includes(puzzle.phase)) return;

    const seconds = delta / 1000;
    const valve = scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex && it.def.kind === 'rail-control' && it.def.command === 'vent',
    );
    // The valve only stays open while the key is held AND the player stays at
    // it, so walking away closes it — the hand has to be on the handle.
    const atValve = valve
      ? Math.abs(valve.sprite.x - scene.player.x) < 62 && scene.player.lane === valve.def.lane
      : false;
    if (puzzle.pressureVenting && !(scene.inputState?.interactHeld && atValve)) {
      puzzle.pressureVenting = false;
      valve?.sprite.setTexture('circuit-relay-0');
      sfx.lever();
      this.refresh();
    }

    const before = puzzle.pressure;
    if (puzzle.pressureVenting) {
      const rate = puzzle.pressureBraked ? spec.bleedBrakedPerSec : spec.bleedPerSec;
      puzzle.pressure = Math.max(0, puzzle.pressure - rate * seconds);
    } else if (puzzle.pressure < spec.start) {
      const rate = puzzle.pressureBraked
        ? (spec.rechargeBrakedPerSec ?? spec.rechargePerSec)
        : spec.rechargePerSec;
      puzzle.pressure = Math.min(spec.start, puzzle.pressure + rate * seconds);
    }
    if (puzzle.pressure === before) return;

    const assembly = this.stageAssemblies[puzzle.stageIndex];
    const machinery = assembly?.machinery;
    if (!machinery) return;
    const fraction = puzzle.pressure / spec.start;
    const inBand = puzzle.pressure >= spec.bandLow && puzzle.pressure <= spec.bandHigh;
    // Needle sweeps continuously between the two poses the discrete version
    // used to snap between, so the band is something you can see and aim for.
    machinery.gaugeNeedle?.setAngle(Phaser.Math.Linear(-64, 28, fraction));
    if (machinery.pressureBar) machinery.pressureBar.setScale(1, Math.max(0.06, fraction));
    if (machinery.airReservoir) {
      machinery.airReservoir.setAlpha(0.42 + fraction * 0.5);
    }
    if (machinery.axlePulse) {
      // The axle brightens only inside the working band: the machine itself
      // tells the player when POWER will take.
      machinery.axlePulse.setAlpha(inBand ? 0.86 : 0.16);
    }
    if (machinery.airPipe) machinery.airPipe.setAlpha(0.3 + fraction * 0.55);
  }

  update(time, delta = 16) {
    const puzzle = this.scene.tutorialPuzzle;
    this.updatePressure(delta);
    if (puzzle.phase === 'approach') {
      const stage = this.currentStage();
      if (this.scene.player.x >= stage.startX + 72) {
        puzzle.phase = 'idle';
        this.scene.registry.set('tutorialPowerState', `junction-${puzzle.stageIndex + 1}-ready`);
        this.refresh();
        this.scene.refreshTutorialStageVisuals();
        // Section VI: PAST sets off along the lower deck as soon as the player
        // enters, and stops at the first obstacle. Nothing is asked of the
        // player until they have seen what is blocking it.
        if (stage.echoGates && !puzzle.echoGatesCleared.length) {
          this.advanceEchoToGate(puzzle.stageIndex, 0);
        }
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
    if (puzzle.phase !== 'manual-window' || time <= puzzle.manualUntil) return;
    const run = this.scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex && it.def.kind === 'timetable-run',
    );
    if (run) this.failStage(run.sprite);
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
    } else if (stage.guideSequence) {
      if (puzzle.queue.length < stage.solution.length) {
        const next = stage.solution[puzzle.queue.length];
        const target = scene.interactables.find(
          (it) => it.def.stage === stage.index && it.def.command === next,
        );
        x = target?.sprite.x ?? stage.commandX;
        label = puzzle.queue.length === 0 ? 'FIRST: BRAKE' : 'THEN: POWER';
      } else {
        x = stage.runX;
        label = 'NOW RUN';
      }
    } else {
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
    if (puzzle.phase === 'manual-window') return 'reach the trolley latch before the braking window closes';
    if (puzzle.phase === 'departure') return 'watch the train leave the station';
    if (puzzle.phase === 'complete') return 'enter the next carriage';
    const stage = this.currentStage();
    if (puzzle.phase === 'echo-travel') return 'follow the remembered self to the next lower contact';
    if (puzzle.phase === 'echo-sync') {
      return `reach the ${RAIL_CONTROLS[puzzle.activeCommand]?.label.toLowerCase()} while PAST holds its contact`;
    }
    if (puzzle.phase === 'echo-retry') return 'wait for the remembered self to circle back';
    if (puzzle.phase === 'echo-replay') return 'watch the remembered self carry the earlier valve action below the car';
    if (puzzle.phase === 'echo-blocked') {
      const gate = stage.echoGates?.[puzzle.echoGateIndex];
      return gate
        ? `look below, see what stops the remembered self, and clear it from up here`
        : 'look below at the remembered self';
    }
    if (stage.pressureHold) {
      if (puzzle.pressureSettled) return 'watch the energized axle settle into service';
      const spec = stage.pressureHold;
      if (puzzle.pressure > spec.bandHigh) {
        return 'hold the bleed valve open and watch the gauge fall toward its working band';
      }
      if (puzzle.pressure < spec.bandLow) {
        return 'release the valve and let the line recharge back up to its working band';
      }
      return 'the line is in its working band — energize the axle motor now';
    }
    if (stage.physicalSequence) {
      const expected = stage.solution[puzzle.queue.length];
      return expected
        ? `look below, read the changed hardware, and operate the ${RAIL_CONTROLS[expected]?.label.toLowerCase()}`
        : 'watch the completed wheelset settle into service';
    }
    if (stage.autoRun) return 'punch the glowing door action once';
    if (stage.guideSequence && puzzle.queue.length < stage.solution.length) {
      return puzzle.queue.length === 0 ? 'punch BRAKE first' : 'punch POWER second';
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
      assembly.rack.setVisible(rackActive).setAlpha(dormant ? 0.14 : settling ? 0.9 : completed ? 0.66 : 1);
      assembly.rackTitle.setVisible(rackActive).setAlpha(dormant ? 0.12 : settling ? 0.82 : completed ? 0.58 : 1);
      assembly.queue.setVisible(rackActive).setAlpha(dormant ? 0.12 : settling ? 0.9 : completed ? 0.76 : 1);
      assembly.tick.setVisible(rackActive && !assembly.stage.guideSequence).setAlpha(dormant ? 0.1 : settling ? 0.6 : completed ? 0.38 : 1);
      assembly.paperStrip.setVisible(rackActive).setAlpha(dormant ? 0.12 : settling ? 0.84 : completed ? 0.62 : 0.88);
      assembly.punchHead.setVisible(rackActive).setAlpha(dormant ? 0.14 : settling ? 0.82 : completed ? 0.58 : 1);
      assembly.completedLabel.setVisible(completed).setAlpha(settling ? 1 : 0.76);
      assembly.completionLamp.setVisible(completed).setAlpha(settling ? 1 : 0.82);
      assembly.guideLabel?.setVisible(rackActive && !completed && !dormant);
      assembly.commandLabels.forEach((label) => label
        .setVisible(roomPresent)
        .setAlpha(dormant ? 0.12 : settling ? 0.76 : completed ? 0.4 : 1));
      assembly.memoryLabel?.setVisible(rackActive).setAlpha(dormant ? 0.12 : settling ? 0.7 : completed ? 0.48 : 1);
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
      Object.values(assembly.machinery)
        .filter((value) => value?.setVisible)
        .forEach((object) => object.setVisible(roomPresent && assembly.stage.showMachinery !== false));
      if (rackActive) {
        const slots = assembly.stage.solution.map((_, slot) => {
          const command = dormant ? null : completed ? assembly.stage.solution[slot] : puzzle.queue[slot];
          return command ? COMMANDS[command].short : `${slot + 1}`;
        });
        assembly.queue.setText(slots.join('  ›  '));
        const punched = dormant ? 0 : completed ? slots.length : puzzle.queue.length;
        assembly.tick.setX(assembly.stage.rackX - 57 + Math.min(punched, slots.length) * 26);
      }
      if (completed) this.setCompletedMachinery(assembly);
    });

    scene.interactables
      .filter((it) => this.isTimetableKind(it.def.kind))
      .forEach((it) => {
        const stage = this.currentStage();
        const current =
          visible &&
          puzzle.briefed &&
          puzzle.phase !== 'approach' &&
          it.def.stage === puzzle.stageIndex &&
          !(stage.autoRun && it.def.kind === 'timetable-run') &&
          (it.def.kind !== 'timetable-manual' || puzzle.phase === 'manual-window');
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
        if (it.def.kind === 'timetable-command') {
          const selected = completed || puzzle.queue.includes(it.def.command);
          const guidedNext = stage.guideSequence?.[puzzle.queue.length] === it.def.command;
          const direct = stage.autoRun && puzzle.queue.length === 0;
          it.sprite.setTint(completed ? 0x75d4cd : selected || guidedNext || direct ? 0xf2d49a : LANES[LANE_NEAR].figureTint);
          it.sprite.setScale(completed ? 1 : selected ? 1.12 : guidedNext || direct ? 1.08 : 1);
        } else if (it.def.kind === 'rail-control') {
          const physicalStage = this.config.stages[it.def.stage];
          const selected = completed || puzzle.queue.includes(it.def.command);
          const expected = it.def.stage === puzzle.stageIndex
            ? physicalStage.solution[puzzle.queue.length] === it.def.command
            : false;
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
              completed || ['executing', 'manual-window'].includes(puzzle.phase)
                ? 'hand-generator-on'
                : 'hand-generator-off',
            );
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
    const qa = new URLSearchParams(window.location.search).get('qa');
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
      : qa?.startsWith('timetable-manual')
        ? 3
      : Phaser.Math.Clamp((Number.isFinite(requested) ? requested : 1) - 1, 0, this.config.stages.length - 1);
    this.scene.tutorialManualQA = qa?.startsWith('timetable-manual');
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
    puzzle.echoGateIndex = 0;
    puzzle.echoGatesCleared = [];
    puzzle.echoAtValve = false;
    if (stage.echoGates) {
      this.scene.time.delayedCall(60, () => this.advanceEchoToGate(stageIndex, 0));
    }
    this.scene.player.resetTo(stage.startX + 92, 400, LANE_NEAR);
    if (qa === 'timetable-6-cab') {
      this.scene.player.resetTo(stage.endX - 132, 400, LANE_NEAR);
    }
    this.scene.tutorialForceLookDown = Boolean(stage.underfloor);
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
    if (qa === 'timetable-2-wrong') {
      this.scene.player.body.reset(stage.commandX + 150, 400);
      this.scene.time.delayedCall(260, () => triggerForQA('power'));
    }
    if (qa === 'timetable-2-brake' || qa === 'timetable-2-auto') {
      this.scene.player.body.reset(stage.commandX - 20, 400);
      this.scene.time.delayedCall(260, () => triggerForQA('brake'));
    }
    if (qa === 'timetable-2-auto') {
      this.scene.time.delayedCall(620, () => triggerForQA('power'));
      this.scene.time.delayedCall(980, () => {
        const run = this.scene.interactables.find(
          (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-run',
        );
        if (run) this.run(run.sprite);
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
    if (qa === 'timetable-5-auto') {
      this.scene.time.delayedCall(280, () => triggerForQA('brake'));
      this.scene.time.delayedCall(860, () => triggerForQA('vent'));
      this.scene.time.delayedCall(1480, () => triggerForQA('power'));
    }
    if (qa === 'timetable-5-cinematic') {
      this.scene.time.delayedCall(3000, () => triggerForQA('brake'));
      this.scene.time.delayedCall(3600, () => triggerForQA('vent'));
      this.scene.time.delayedCall(4200, () => triggerForQA('power'));
    }
    if (qa === 'timetable-5-wrong') {
      [320, 470, 620, 770, 920].forEach((delay) => {
        this.scene.time.delayedCall(delay, () => triggerForQA('power'));
      });
    }
    if (['timetable-6-auto', 'timetable-6-window', 'timetable-6-miss', 'tutorial-exit'].includes(qa)) {
      this.scene.time.delayedCall(980, () => triggerForQA('brake'));
      if (!['timetable-6-window', 'timetable-6-miss'].includes(qa)) {
        this.scene.time.delayedCall(1900, () => triggerForQA('vent'));
        this.scene.time.delayedCall(2820, () => triggerForQA('couple'));
      }
    }
    if (qa?.startsWith('timetable-manual')) {
      puzzle.queue = [...stage.solution];
      this.scene.time.delayedCall(320, () => {
        const run = this.scene.interactables.find(
          (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-run',
        );
        if (run) this.run(run.sprite);
      });
      this.scene.time.delayedCall(1520, () => {
        this.scene.player.body.reset(stage.manualX - 20, 400);
      });
      if (qa === 'timetable-manual-auto') {
        this.scene.time.delayedCall(1900, () => {
          const manual = this.scene.interactables.find(
            (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-manual',
          );
          if (manual) this.performManualAction(manual);
        });
      }
    }
    return true;
  }

  destroy() {
    this.objects.forEach((object) => object?.destroy?.());
    this.objects.length = 0;
  }
}
