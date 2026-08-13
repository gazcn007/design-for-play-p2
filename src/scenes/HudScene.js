import Phaser from 'phaser';
import { GAME_W, GAME_H, LANES } from '../constants.js';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export default class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    this.last = {};

    const panel = (x, y, text, size = 15) =>
      this.add
        .text(x, y, text, {
          fontFamily: MONO,
          fontSize: `${size}px`,
          color: '#b7c1cc',
          letterSpacing: 2,
        })
        .setScrollFactor(0);

    // Blood bar, after the reference: dark iron frame, red fill, no numbers.
    this.BAR = { x: 18, y: 16, w: 210, h: 11 };
    this.barFrame = this.add.graphics().setScrollFactor(0);
    this.barFill = this.add.graphics().setScrollFactor(0);
    this.drawBar(1);

    // Keep the HUD as spare as the reference: health and spatial orientation
    // belong on-screen, score counters do not.
    this.scoreText = panel(18, 36, 'MEMORY  0');
    this.coinText = panel(18, 57, 'WITNESSES  0');

    this.laneText = this.add
      .text(GAME_W - 18, 16, 'NEAR', {
        fontFamily: MONO,
        fontSize: '15px',
        color: '#b7c1cc',
        letterSpacing: 3,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.toast = this.add
      .text(GAME_W / 2, GAME_H - 96, '', {
        fontFamily: MONO,
        fontSize: '16px',
        color: '#edf1f4',
        backgroundColor: '#05070bf2',
        padding: { x: 12, y: 7 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0);

    this.hint = this.add
      .text(
        GAME_W / 2,
        42,
        'A / D    SPACE    E',
        {
          fontFamily: MONO,
          fontSize: '13px',
          color: '#a7b2bd',
          align: 'center',
        },
      )
        .setOrigin(0.5)
        .setScrollFactor(0);

    this.chapterTitle = this.add
      .text(GAME_W / 2, 244, '', {
        fontFamily: MONO,
        fontSize: '22px',
        color: '#e5eaee',
        letterSpacing: 3,
        align: 'center',
        backgroundColor: '#071016',
        padding: { x: 11, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0);

    this.chapterSubtitle = this.add
      .text(GAME_W / 2, 286, '', {
        fontFamily: MONO,
        fontSize: '14px',
        color: '#b4bec8',
        align: 'center',
        backgroundColor: '#071016',
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0);

    // Keep dialogue over the window band, not over the player and floor-mounted
    // machinery. Lines arrive with a typewriter cadence instead of popping in.
    this.dialoguePanel = this.add
      .rectangle(28, 34, 720, 178, 0x05070c, 0.96)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(80)
      .setVisible(false);
    this.dialoguePanel.setStrokeStyle(1, 0x687481, 0.95);

    this.dialogueSpeaker = this.add
      .text(48, 50, '', {
        fontFamily: MONO,
        fontSize: '16px',
        color: '#e8edf1',
        letterSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(81)
      .setVisible(false);

    this.dialogueRole = this.add
      .text(48, 76, '', {
        fontFamily: MONO,
        fontSize: '12px',
        color: '#a6b1bc',
        letterSpacing: 1,
      })
      .setScrollFactor(0)
      .setDepth(81)
      .setVisible(false);

    this.dialogueText = this.add
      .text(48, 101, '', {
        fontFamily: MONO,
        fontSize: '17px',
        color: '#edf1f4',
        lineSpacing: 6,
        wordWrap: { width: 670 },
      })
      .setScrollFactor(0)
      .setDepth(81)
      .setVisible(false);

    this.dialogueChoices = this.add
      .text(48, 149, '', {
        fontFamily: MONO,
        fontSize: '14px',
        color: '#ead9ad',
        lineSpacing: 8,
        wordWrap: { width: 670 },
      })
      .setScrollFactor(0)
      .setDepth(81)
      .setVisible(false);

    this.dialogueHint = this.add
      .text(728, 187, '', {
        fontFamily: MONO,
        fontSize: '12px',
        color: '#b0bbc5',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(81)
      .setVisible(false);

    this.time.delayedCall(2200, () => {
      if (this.hint) this.tweens.add({ targets: this.hint, alpha: 0, duration: 700 });
    });

    this.overlay = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0x04060a)
      .setOrigin(0)
      .setScrollFactor(0)
      .setAlpha(0)
      .setVisible(false);

    this.bigText = this.add
      .text(GAME_W / 2, GAME_H / 2, '', {
        fontFamily: MONO,
        fontSize: '38px',
        color: '#edf1f4',
        align: 'center',
        lineSpacing: 12,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);

    this.chapterCardKicker = this.add
      .text(GAME_W / 2, 220, '', {
        fontFamily: 'Georgia, Times New Roman, serif',
        fontSize: '15px',
        color: '#b7c0c7',
        letterSpacing: 6,
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setVisible(false);
    this.chapterCardTitle = this.add
      .text(GAME_W / 2, 284, '', {
        fontFamily: 'Georgia, Times New Roman, serif',
        fontSize: '42px',
        color: '#f0ede6',
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setVisible(false);
    this.chapterCardSubtitle = this.add
      .text(GAME_W / 2, 342, '', {
        fontFamily: 'Georgia, Times New Roman, serif',
        fontSize: '17px',
        color: '#aeb7bd',
        align: 'center',
        wordWrap: { width: 620 },
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setVisible(false);

    // The game scene restarts itself, so these listeners live on the global
    // bus and are torn down explicitly when this scene shuts down.
    this.onToast = (msg) => this.showToast(msg);
    this.onGameOver = () => this.showBig('YOU DIED\n\nthe night resets...', '#8e1f24');
    this.onWin = (data) =>
      this.showEnding(data);
    this.onReset = () => this.reset();
    this.onDialogueLine = (data) => this.showDialogueLine(data);
    this.onDialogueChoices = (data) => this.showDialogueChoices(data);
    this.onDialogueClose = () => this.closeDialogue();
    this.onDialogueReveal = () => this.finishDialogueTyping();
    this.onWorld = (data) => this.showWorld(data);
    this.onPrologueTransition = (data) => this.showPrologueTransition(data);

    this.game.events.on('hud:toast', this.onToast);
    this.game.events.on('hud:gameover', this.onGameOver);
    this.game.events.on('hud:win', this.onWin);
    this.game.events.on('hud:reset', this.onReset);
    this.game.events.on('hud:dialogue:line', this.onDialogueLine);
    this.game.events.on('hud:dialogue:choices', this.onDialogueChoices);
    this.game.events.on('hud:dialogue:close', this.onDialogueClose);
    this.game.events.on('hud:dialogue:reveal', this.onDialogueReveal);
    this.game.events.on('hud:world', this.onWorld);
    this.game.events.on('hud:prologue-transition', this.onPrologueTransition);

    this.events.once('shutdown', () => {
      this.game.events.off('hud:toast', this.onToast);
      this.game.events.off('hud:gameover', this.onGameOver);
      this.game.events.off('hud:win', this.onWin);
      this.game.events.off('hud:reset', this.onReset);
      this.game.events.off('hud:dialogue:line', this.onDialogueLine);
      this.game.events.off('hud:dialogue:choices', this.onDialogueChoices);
      this.game.events.off('hud:dialogue:close', this.onDialogueClose);
      this.game.events.off('hud:dialogue:reveal', this.onDialogueReveal);
      this.game.events.off('hud:world', this.onWorld);
      this.game.events.off('hud:prologue-transition', this.onPrologueTransition);
    });
  }

  drawBar(fraction) {
    const { x, y, w, h } = this.BAR;

    this.barFrame.clear();
    this.barFrame.fillStyle(0x000000, 0.55);
    this.barFrame.fillRect(x - 2, y - 2, w + 4, h + 4);
    this.barFrame.lineStyle(1, 0x4a5260, 1);
    this.barFrame.strokeRect(x - 2.5, y - 2.5, w + 5, h + 5);
    this.barFrame.fillStyle(0x14181e, 1);
    this.barFrame.fillRect(x, y, w, h);

    const fw = Math.max(0, Math.min(1, fraction)) * w;
    this.barFill.clear();
    if (fw > 0) {
      this.barFill.fillStyle(0x8e1f24, 1);
      this.barFill.fillRect(x, y, fw, h);
      this.barFill.fillStyle(0xb32f31, 1);
      this.barFill.fillRect(x, y, fw, 3);
      this.barFill.fillStyle(0x5c1216, 1);
      this.barFill.fillRect(x, y + h - 2, fw, 2);
    }
  }

  reset() {
    this.overlay.setVisible(false).setAlpha(0);
    this.bigText.setVisible(false);
    this.toast.setAlpha(0);
    this.closeDialogue();
    this.chapterTitle.setAlpha(0);
    this.chapterSubtitle.setAlpha(0);
    [this.chapterCardKicker, this.chapterCardTitle, this.chapterCardSubtitle].forEach((item) =>
      item.setVisible(false).setAlpha(0),
    );
  }

  showToast(message) {
    this.toast.setText(message);
    this.tweens.killTweensOf(this.toast);
    this.toast.setAlpha(1);
    this.tweens.add({
      targets: this.toast,
      alpha: 0,
      delay: 2400,
      duration: 600,
    });
  }

  showBig(message, color) {
    this.overlay.setVisible(true);
    this.tweens.add({ targets: this.overlay, alpha: 0.78, duration: 400 });
    this.bigText.setText(message).setColor(color).setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.bigText, alpha: 1, duration: 400 });
  }

  showPrologueTransition(data) {
    const baseHud = [
      this.barFrame,
      this.barFill,
      this.scoreText,
      this.coinText,
      this.laneText,
      this.hint,
      this.toast,
      this.chapterTitle,
      this.chapterSubtitle,
    ];
    this.tweens.killTweensOf([
      this.overlay,
      this.chapterCardKicker,
      this.chapterCardTitle,
      this.chapterCardSubtitle,
    ]);
    this.tweens.add({ targets: baseHud, alpha: 0, duration: 420 });
    this.overlay.setDepth(100).setVisible(true).setAlpha(0).setFillStyle(0x030405, 1);
    this.chapterCardKicker.setText(data.kicker).setVisible(true).setAlpha(0);
    this.chapterCardTitle.setText(data.title).setVisible(true).setAlpha(0);
    this.chapterCardSubtitle.setText(data.subtitle).setVisible(true).setAlpha(0);

    if (data.qa) {
      this.overlay.setAlpha(1);
      [this.chapterCardKicker, this.chapterCardTitle, this.chapterCardSubtitle].forEach((item) =>
        item.setAlpha(1),
      );
      return;
    }

    this.tweens.add({ targets: this.overlay, alpha: 1, delay: 2400, duration: 850, ease: 'Sine.easeInOut' });
    this.tweens.add({
      targets: [this.chapterCardKicker, this.chapterCardTitle, this.chapterCardSubtitle],
      alpha: 1,
      delay: 3350,
      duration: 900,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: [this.chapterCardKicker, this.chapterCardTitle, this.chapterCardSubtitle],
      alpha: 0,
      delay: 5500,
      duration: 650,
    });
    this.tweens.add({
      targets: this.overlay,
      alpha: 0,
      delay: 6100,
      duration: 850,
      onComplete: () => {
        this.overlay.setVisible(false);
        [this.chapterCardKicker, this.chapterCardTitle, this.chapterCardSubtitle].forEach((item) =>
          item.setVisible(false),
        );
        [this.barFrame, this.barFill, this.scoreText, this.coinText, this.laneText].forEach((item) =>
          item.setVisible(true).setAlpha(1),
        );
      },
    });
  }

  showDialogueLine(data) {
    this.dialogueTimer?.remove(false);
    this.dialogueFullText = data.text;
    this.dialogueTypedCount = 0;
    this.registry.set('dialogueTyping', true);
    this.dialoguePanel.setVisible(true).setAlpha(0).setScale(0.98);
    this.dialogueSpeaker.setText(data.speaker).setVisible(true).setAlpha(0);
    this.dialogueRole.setText(data.role).setVisible(true).setAlpha(0);
    this.dialogueText.setText('').setVisible(true).setAlpha(1);
    this.dialogueChoices.setText('').setVisible(false);
    this.dialogueHint.setText(
      data.line === data.total ? 'E  CONTINUE' : `${data.line} / ${data.total}   E`,
    ).setVisible(true);
    this.tweens.add({
      targets: this.dialoguePanel,
      alpha: 0.9,
      scale: 1,
      duration: 150,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: [this.dialogueSpeaker, this.dialogueRole],
      alpha: 1,
      duration: 180,
    });
    this.dialogueTimer = this.time.addEvent({
      delay: 18,
      loop: true,
      callback: () => {
        this.dialogueTypedCount += 1;
        this.dialogueText.setText(this.dialogueFullText.slice(0, this.dialogueTypedCount));
        if (this.dialogueTypedCount >= this.dialogueFullText.length) this.finishDialogueTyping();
      },
    });
  }

  finishDialogueTyping() {
    if (!this.registry.get('dialogueTyping')) return;
    this.dialogueTimer?.remove(false);
    this.dialogueTimer = null;
    this.dialogueTypedCount = this.dialogueFullText?.length ?? 0;
    this.dialogueText.setText(this.dialogueFullText ?? '');
    this.registry.set('dialogueTyping', false);
  }

  showDialogueChoices(data) {
    this.finishDialogueTyping();
    const choices = data.choices
      .map((choice, i) => `${i + 1}   ${choice}`)
      .join('\n');
    this.dialogueChoices.setText(choices).setVisible(true);
    this.dialogueHint.setText('1 / 2  CHOOSE').setVisible(true);
  }

  closeDialogue() {
    this.dialogueTimer?.remove(false);
    this.dialogueTimer = null;
    this.registry.set('dialogueTyping', false);
    this.dialoguePanel.setVisible(false);
    this.dialogueSpeaker.setVisible(false);
    this.dialogueRole.setVisible(false);
    this.dialogueText.setVisible(false);
    this.dialogueChoices.setVisible(false);
    this.dialogueHint.setVisible(false);
  }

  showWorld(world) {
    const isOpeningCar = world.startX === 0;
    this.openingCar = isOpeningCar; // remembered so update() can honour this rule when restoring counters
    this.barFrame.setVisible(!isOpeningCar);
    this.barFill.setVisible(!isOpeningCar);
    this.scoreText.setVisible(!isOpeningCar);
    this.coinText.setVisible(!isOpeningCar);
    this.laneText.setVisible(!isOpeningCar);
    this.chapterTitle.setText(world.title);
    this.chapterSubtitle.setText(world.subtitle);
    this.chapterTitle.setAlpha(0);
    this.chapterSubtitle.setAlpha(0);
    this.tweens.add({ targets: [this.chapterTitle, this.chapterSubtitle], alpha: 1, duration: 700 });
    this.tweens.add({
      targets: [this.chapterTitle, this.chapterSubtitle],
      alpha: 0,
      delay: isOpeningCar ? 1100 : 2400,
      duration: isOpeningCar ? 700 : 1300,
    });
  }

  showEnding(data) {
    const awake = data.choice === 'awake';
    const title = awake ? 'YOU REMEMBERED' : 'YOU STAYED';
    const body = awake
      ? 'The scenery has stopped.\n\nYou were never the player.\nYou were the proof that a player had been here.'
      : 'The last person turns to face you.\n\nThe world can stop pretending to be empty.\nPlease stand very still.';
    this.showBig(`${title}\n\n${body}\n\npress R to return`, awake ? '#c8d5e1' : '#d2bca2');
  }

  update() {
    const memory = this.registry.get('memory') ?? 0;
    const witnesses = this.registry.get('witnesses') ?? 0;
    const lives = this.registry.get('lives') ?? 0;
    const lane = this.registry.get('lane') ?? 1;

    if (memory !== this.last.memory) {
      this.scoreText.setText(`MEMORY  ${memory}`);
      this.last.memory = memory;
    }
    if (witnesses !== this.last.witnesses) {
      this.coinText.setText(`WITNESSES  ${witnesses}`);
      this.last.witnesses = witnesses;
    }
    if (lives !== this.last.lives) {
      this.drawBar(Math.max(0, lives) / 3);
      this.last.lives = lives;
    }
    if (lane !== this.last.lane) {
      this.laneText.setText(LANES[lane].name);
      this.laneText.setColor(lane === 0 ? '#59636f' : '#9aa6b4');
      this.last.lane = lane;
    }

    // Phase II relay room (Game scene's tutorialPuzzle.stageIndex === 1,
    // the CONTACT_STAGE_INDEX room): hide the persistent MEMORY /
    // WITNESSES counters for that room only. Written unconditionally each
    // frame so event handlers that force-show these counters (showWorld,
    // showPrologueTransition) are re-reconciled on the next frame; the
    // restore branch honours showWorld's opening-car rule.
    const game = this.scene.get('Game');
    const inRelayRoom = game?.activeWorldIndex === 0
      && Boolean(game?.timetablePuzzle)
      && (game?.tutorialPuzzle?.stageIndex ?? -1) === 1;
    // The IV–VI service table is a full theatrical cutaway, not a small HUD
    // card.  Keep the world HUD out of its passenger-window band so health,
    // lane and counters do not become accidental scenery or obscure the
    // actor silhouette.  Reconcile every frame because QA warps and world
    // events can force-show these objects after the panel has opened.
    const inMechanicalTable = Boolean(
      game?.timetablePuzzle?.mechanicalPanelMode?.startsWith?.('table-'),
    );
    const showWorldHud = !this.openingCar && !inMechanicalTable;
    this.barFrame.setVisible(showWorldHud);
    this.barFill.setVisible(showWorldHud);
    this.laneText.setVisible(showWorldHud);
    this.hint.setVisible(!inMechanicalTable);
    const showCounters = showWorldHud && !inRelayRoom;
    this.scoreText.setVisible(showCounters);
    this.coinText.setVisible(showCounters);
  }
}
