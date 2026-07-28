import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';
import { buildTextures } from '../textures.js';

// Vite resolves each panorama to a hashed URL at build time and (with
// assetsInlineLimit: 0) always emits them as real files rather than data URIs.
import world01Url from '../assets/world_01_tutorial_panorama_fullres.png';
import world02Url from '../assets/world_02_ai_apocalypse_panorama_fullres.png';
import world03Url from '../assets/world_03_present_city_panorama_fullres.png';
import world04Url from '../assets/world_04_retro_cyberpunk_panorama_fullres.png';
import world05Url from '../assets/world_05_medieval_panorama_fullres.png';
import world06Url from '../assets/world_06_nature_reclamation_panorama_fullres.png';
import world07Url from '../assets/world_07_memory_panorama_fullres.png';
import world08Url from '../assets/world_08_final_choice_panorama_fullres.png';
import world09Url from '../assets/world_09_world_war_panorama_fullres.png';
import world10Url from '../assets/world_10_prehistoric_panorama_fullres.png';
import cyberpunkUrl from '../assets/cyberpunk_panorama_fullres.png';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // The story is deliberately told through a stack of large panoramas. The
    // progress bar matters here: the player should not see a half-rendered
    // world and mistake it for one of the simulation's failures.
    const bar = this.add.graphics().setDepth(10);
    const label = this.add
      .text(GAME_W / 2, GAME_H / 2 + 26, 'loading the first memory', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '13px',
        color: '#4a545f',
      })
      .setOrigin(0.5);

    this.load.on('progress', (p) => {
      bar.clear();
      bar.lineStyle(1, 0x2a3038, 1);
      bar.strokeRect(GAME_W / 2 - 110, GAME_H / 2 - 6, 220, 8);
      bar.fillStyle(0x8e1f24, 1);
      bar.fillRect(GAME_W / 2 - 109, GAME_H / 2 - 5, 218 * p, 6);
    });

    this.load.once('complete', () => {
      bar.destroy();
      label.destroy();
    });

    this.load.image('backdrop-01', world01Url);
    this.load.image('backdrop-02', world02Url);
    this.load.image('backdrop-03', world03Url);
    this.load.image('backdrop-04', world04Url);
    this.load.image('backdrop-05', world05Url);
    this.load.image('backdrop-06', world06Url);
    this.load.image('backdrop-07', world07Url);
    this.load.image('backdrop-08', world08Url);
    this.load.image('backdrop-09', world09Url);
    this.load.image('backdrop-10', world10Url);
    this.load.image('backdrop-cyberpunk', cyberpunkUrl);
  }

  create() {
    buildTextures(this);
    this.scene.start('Game');
  }
}
