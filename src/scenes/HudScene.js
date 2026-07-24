import Phaser from 'phaser';
import { GAME_W, GAME_H, LANES } from '../constants.js';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export default class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    this.last = {};

    const panel = (x, y, text, size = 13) =>
      this.add
        .text(x, y, text, {
          fontFamily: MONO,
          fontSize: `${size}px`,
          color: '#8f9aa8',
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
    this.scoreText = panel(18, 36, '');
    this.coinText = panel(18, 54, '');

    this.laneText = this.add
      .text(GAME_W - 18, 16, 'NEAR', {
        fontFamily: MONO,
        fontSize: '13px',
        color: '#8f9aa8',
        letterSpacing: 3,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.toast = this.add
      .text(GAME_W / 2, GAME_H - 96, '', {
        fontFamily: MONO,
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#07090d',
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
        'A / D  MOVE     SPACE  LEAP     F  STRIKE     W / S  SHIFT DEPTH',
        {
          fontFamily: MONO,
          fontSize: '12px',
          color: '#66717f',
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.time.delayedCall(4200, () => {
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
        fontSize: '34px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 12,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);

    // The game scene restarts itself, so these listeners live on the global
    // bus and are torn down explicitly when this scene shuts down.
    this.onToast = (msg) => this.showToast(msg);
    this.onGameOver = () => this.showBig('YOU DIED\n\nthe night resets...', '#8e1f24');
    this.onWin = (data) =>
      this.showBig(
        `THE HUNT IS OVER\n\nechoes ${data.score}   vials ${data.coins}\n\npress R to hunt again`,
        '#b9c8dc',
      );
    this.onReset = () => this.reset();

    this.game.events.on('hud:toast', this.onToast);
    this.game.events.on('hud:gameover', this.onGameOver);
    this.game.events.on('hud:win', this.onWin);
    this.game.events.on('hud:reset', this.onReset);

    this.events.once('shutdown', () => {
      this.game.events.off('hud:toast', this.onToast);
      this.game.events.off('hud:gameover', this.onGameOver);
      this.game.events.off('hud:win', this.onWin);
      this.game.events.off('hud:reset', this.onReset);
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

  update() {
    const score = this.registry.get('score') ?? 0;
    const coins = this.registry.get('coins') ?? 0;
    const lives = this.registry.get('lives') ?? 0;
    const lane = this.registry.get('lane') ?? 1;

    if (score !== this.last.score) this.last.score = score;
    if (coins !== this.last.coins) this.last.coins = coins;
    if (lives !== this.last.lives) {
      this.drawBar(Math.max(0, lives) / 3);
      this.last.lives = lives;
    }
    if (lane !== this.last.lane) {
      this.laneText.setText(LANES[lane].name);
      this.laneText.setColor(lane === 0 ? '#59636f' : '#9aa6b4');
      this.last.lane = lane;
    }
  }
}
