import Phaser from 'phaser';

const COLORS = [
  { shell: 0x172832, trim: 0x687981, accent: 0xc6a267 },
  { shell: 0x162730, trim: 0x61777f, accent: 0x79b8b5 },
  { shell: 0x192830, trim: 0x6b7b82, accent: 0xb9a574 },
  { shell: 0x17262e, trim: 0x67767b, accent: 0xc19b63 },
  { shell: 0x14252d, trim: 0x5f747d, accent: 0x83b9c2 },
  { shell: 0x18272e, trim: 0x6d7b80, accent: 0xd0aa6d },
];

/** World-space train interiors for the six Prologue sections. */
export default class TutorialTrainRoomsArt {
  constructor(scene, stages) {
    this.scene = scene;
    this.objects = [];
    this.roomStates = [];
    this.visible = true;
    this.build(stages);
  }

  track(object, depth) {
    object.setDepth(depth).setScrollFactor(1);
    this.objects.push(object);
    return object;
  }

  build(stages) {
    const shell = this.track(this.scene.add.graphics(), 7);
    const glass = this.track(this.scene.add.graphics(), 8);
    const trim = this.track(this.scene.add.graphics(), 27);
    const details = this.track(this.scene.add.graphics(), 28);
    const undercar = this.track(this.scene.add.graphics(), 29);

    stages.forEach((stage, index) => {
      const color = COLORS[index % COLORS.length];
      const x = stage.startX;
      const width = stage.endX - stage.startX;
      const inset = 30;
      const gap = 22;
      const windowW = (width - inset * 2 - gap) / 2;
      const windowY = 150;
      const windowH = 178;
      const windows = [
        { x: x + inset, y: windowY, w: windowW, h: windowH },
        { x: x + inset + windowW + gap, y: windowY, w: windowW, h: windowH },
      ];

      shell.fillStyle(0x070b10, 1);
      shell.fillRect(x, 0, width, 150);
      shell.fillRect(x, 328, width, 272);
      shell.fillStyle(color.shell, 1);
      shell.fillRect(x, 14, width, 128);
      shell.fillRect(x, 334, width, 266);
      shell.fillRect(x + 6, 138, 22, 204);
      shell.fillRect(stage.endX - 28, 138, 22, 204);
      shell.fillRect(x + width / 2 - gap / 2, 138, gap, 204);
      shell.fillStyle(0x0d151b, 1);
      shell.fillRect(x + 20, 492, width - 40, 108);
      // The interior belongs to the same damp twilight railway as the view:
      // blue-grey painted steel, oxidized aluminium, wine vinyl and tarnished brass.
      shell.fillStyle(0x26363d, 0.72);
      shell.fillRoundedRect(x + 34, 358, width - 68, 116, 5);
      shell.fillStyle(0x40282c, 0.78);
      shell.fillRoundedRect(x + 42, 438, width - 84, 18, 6);
      shell.fillStyle(0x0e171c, 0.58);
      shell.fillRect(x + 42, 454, width - 84, 18);
      shell.fillStyle(color.accent, 0.28);
      shell.fillRect(x + 20, 348, width - 40, 3);

      windows.forEach((window, windowIndex) => {
        glass.fillStyle(0xa8d1dc, 0.045 + windowIndex * 0.012);
        glass.fillRoundedRect(window.x, window.y, window.w, window.h, 10);
        glass.fillStyle(0xd7edf2, 0.05);
        glass.fillTriangle(
          window.x + 16,
          window.y + 4,
          window.x + 72,
          window.y + 4,
          window.x + 16,
          window.y + 118,
        );
        trim.lineStyle(5, color.trim, 0.95);
        trim.strokeRoundedRect(window.x, window.y, window.w, window.h, 11);
        trim.lineStyle(1, color.accent, 0.6);
        trim.strokeRoundedRect(window.x + 5, window.y + 5, window.w - 10, window.h - 10, 8);
      });

      details.fillStyle(color.accent, 0.72);
      details.fillRect(x + 74, 101, width - 148, 5);
      details.lineStyle(2, color.trim, 0.7);
      details.lineBetween(x + 48, 60, stage.endX - 48, 60);
      [0.28, 0.5, 0.72].forEach((fraction, lightIndex) => {
        const lightX = x + width * fraction;
        details.fillStyle(lightIndex <= index ? color.accent : 0x35434a, 0.78);
        details.fillCircle(lightX, 60, 4);
      });

      details.lineStyle(1, color.trim, 0.23);
      for (let floorX = x + 90; floorX < stage.endX; floorX += 150) {
        details.lineBetween(x + width / 2, 525, floorX, 600);
      }
      details.lineBetween(x, 555, stage.endX, 555);
      details.lineBetween(x, 582, stage.endX, 582);
      details.lineStyle(1, 0x9cabb0, 0.18);
      for (let rivetX = x + 54; rivetX < stage.endX - 42; rivetX += 64) {
        details.fillStyle(0xa8b4b6, 0.38);
        details.fillCircle(rivetX, 350, 1.5);
        details.fillCircle(rivetX, 482, 1.5);
      }
      details.lineStyle(2, 0x8c6b48, 0.16);
      details.lineBetween(x + 52, 468, stage.endX - 52, 468);
      // Chunky, deterministic pixel wear and planar shading keep the train
      // in the same low-poly/low-pixel language as the downsampled exterior.
      details.fillStyle(0x9fb0b4, 0.08);
      details.fillTriangle(x + 28, 16, x + width * 0.42, 16, x + 28, 118);
      details.fillStyle(0x071016, 0.12);
      details.fillTriangle(stage.endX - 28, 334, x + width * 0.6, 474, stage.endX - 28, 474);
      for (let pixelX = x + 44; pixelX < stage.endX - 32; pixelX += 28) {
        const row = Math.floor((pixelX - x) / 28);
        if ((row + index) % 3 === 0) {
          details.fillStyle(0xa8b6b8, 0.13);
          details.fillRect(pixelX, 374 + ((row * 17) % 72), 4, 4);
        }
        if ((row + index) % 4 === 1) {
          details.fillStyle(0x0a1115, 0.22);
          details.fillRect(pixelX + 9, 420 + ((row * 11) % 42), 7, 3);
        }
      }

      // The lower half is an authored machine deck, with conduits visibly
      // descending toward the service layer. Cables remain secondary details;
      // the underfloor chapters below are dominated by recognizable rail gear.
      details.lineStyle(3, color.trim, 0.46);
      details.lineBetween(x + 42, 488, stage.endX - 42, 488);
      details.lineStyle(2, color.accent, 0.34);
      for (let cableX = x + 76; cableX < stage.endX - 40; cableX += 92) {
        details.lineBetween(cableX, 488, cableX + (index % 2 ? 26 : -26), 590);
        details.strokeCircle(cableX, 520, 9);
        details.fillStyle(color.trim, 0.48);
        details.fillRect(cableX - 11, 550, 22, 13);
      }

      // The chassis is continuous beneath the whole train. Earlier sections
      // use a quiet service bay; the two bogie chapters retain the full hero
      // wheelset detail below. This keeps downward camera moves inside a real
      // carriage instead of revealing an unpainted world band.
      undercar.fillStyle(0x05080a, 1);
      undercar.fillRoundedRect(x + 18, 600, width - 36, 286, 18);
      undercar.lineStyle(4, color.trim, 0.82);
      undercar.strokeRoundedRect(x + 18, 600, width - 36, 286, 18);
      if (!stage.underfloor) {
        undercar.fillStyle(0x101a20, 1);
        undercar.fillRect(x + 28, 612, width - 56, 22);
        undercar.fillStyle(0x091015, 1);
        undercar.fillRect(x + 28, 846, width - 56, 28);
        undercar.lineStyle(5, 0x53636a, 0.74);
        undercar.lineBetween(x + 42, 648, stage.endX - 42, 648);
        undercar.lineBetween(x + 42, 814, stage.endX - 42, 814);
        undercar.lineStyle(2, color.accent, 0.32);
        undercar.lineBetween(x + 58, 724, stage.endX - 58, 724);
        [0.2, 0.5, 0.8].forEach((fraction, beamIndex) => {
          const beamX = x + width * fraction;
          undercar.lineStyle(2, 0x7d8c91, 0.34);
          undercar.lineBetween(beamX, 632, beamX, 846);
          undercar.lineBetween(beamX - 34, 814, beamX + (beamIndex % 2 ? -42 : 42), 648);
          undercar.fillStyle(0x27363c, 0.92);
          undercar.fillRoundedRect(beamX - 13, 704, 26, 38, 4);
        });
        undercar.lineStyle(3, 0x26363d, 0.82);
        undercar.lineBetween(x + 52, 776, stage.endX - 52, 776);
      }

      if (stage.underfloor) {
        const bogieY = 700;
        const bogieCenter = x + width * 0.53;
        const wheelXs = [bogieCenter - 168, bogieCenter + 168];

        // Bogie frame and axle: two large wheelsets physically linked by a
        // rigid frame, not a decorative circuit diagram.
        undercar.fillStyle(0x182229, 1);
        undercar.fillRoundedRect(bogieCenter - 248, bogieY - 76, 496, 76, 14);
        undercar.lineStyle(5, 0x65757d, 0.9);
        undercar.strokeRoundedRect(bogieCenter - 248, bogieY - 76, 496, 76, 14);
        wheelXs.forEach((wheelX) => {
          undercar.fillStyle(0x0b1115, 1);
          undercar.fillCircle(wheelX, bogieY + 74, 62);
          undercar.lineStyle(8, 0x66757b, 0.98);
          undercar.strokeCircle(wheelX, bogieY + 74, 55);
          undercar.lineStyle(3, 0x2d3b41, 1);
          undercar.strokeCircle(wheelX, bogieY + 74, 22);
          undercar.lineBetween(wheelX - 52, bogieY + 74, wheelX + 52, bogieY + 74);
          // Brake shoes are visibly separate pieces beside each wheel.
          undercar.fillStyle(0x8a4f4d, 0.95);
          undercar.fillRoundedRect(wheelX - 75, bogieY + 48, 15, 52, 5);
          undercar.fillRoundedRect(wheelX + 60, bogieY + 48, 15, 52, 5);
        });

        // Coil suspension between car body and bogie.
        undercar.lineStyle(5, 0x708087, 0.95);
        [bogieCenter - 92, bogieCenter + 92].forEach((springX) => {
          for (let springY = bogieY - 156; springY < bogieY - 88; springY += 12) {
            undercar.lineBetween(springX - 18, springY, springX + 18, springY + 6);
            undercar.lineBetween(springX + 18, springY + 6, springX - 18, springY + 12);
          }
        });

        // Air reservoir and brake pipe sit high and long; the traction motor
        // sits directly on the axle. Their placement explains the puzzle.
        undercar.fillStyle(0x243239, 1);
        undercar.fillRoundedRect(x + 62, bogieY - 142, 148, 42, 20);
        undercar.lineStyle(3, 0x91a3a9, 0.7);
        undercar.strokeRoundedRect(x + 62, bogieY - 142, 148, 42, 20);
        undercar.lineStyle(5, 0x8f9ea3, 0.72);
        undercar.lineBetween(x + 210, bogieY - 121, stage.endX - 62, bogieY - 121);
        undercar.lineStyle(2, color.accent, 0.62);
        undercar.lineBetween(x + 210, bogieY - 105, stage.endX - 62, bogieY - 105);
        undercar.fillStyle(0x1d3038, 1);
        undercar.fillRoundedRect(bogieCenter - 96, bogieY + 6, 192, 78, 12);
        undercar.lineStyle(3, color.accent, 0.35);
        undercar.strokeRoundedRect(bogieCenter - 96, bogieY + 6, 192, 78, 12);

        if (index === stages.length - 1) {
          // Draft gear and coupler at the last partition make the chapter's
          // final action spatially legible before the player programs it.
          undercar.fillStyle(0x596970, 1);
          undercar.fillRect(stage.endX - 188, bogieY + 5, 92, 22);
          undercar.fillRoundedRect(stage.endX - 112, bogieY - 7, 68, 46, 10);
          undercar.lineStyle(6, 0x83949a, 0.95);
          undercar.strokeCircle(stage.endX - 48, bogieY + 16, 22);
        }
      }

      // Silent mechanic pictograms replace most tutorial prose.
      const glyphX = x + width - 92;
      details.lineStyle(2, color.accent, 0.72);
      if (stage.solution?.length === 1) {
        details.strokeCircle(glyphX - 18, 112, 7);
        details.strokeCircle(glyphX + 18, 112, 7);
        details.lineBetween(glyphX - 10, 112, glyphX + 10, 112);
      } else if (stage.solution?.length === 2) {
        details.lineBetween(glyphX - 28, 112, glyphX, 98);
        details.lineBetween(glyphX, 98, glyphX + 28, 112);
        details.fillCircle(glyphX, 98, 4);
      } else {
        details.strokeCircle(glyphX - 16, 105, 7);
        details.strokeCircle(glyphX - 16, 126, 7);
        details.strokeCircle(glyphX + 16, 105, 7);
        details.strokeCircle(glyphX + 16, 126, 7);
        details.lineBetween(glyphX - 16, 112, glyphX - 16, 119);
        details.lineBetween(glyphX + 16, 112, glyphX + 16, 119);
      }

      // Inter-car vestibules mask the exterior. Opening a partition reveals a
      // dark train corridor and the next room, never naked scenery.
      if (index < stages.length - 1) {
        const doorX = stage.endX;
        shell.fillStyle(0x0a1015, 1);
        shell.fillRect(doorX - 42, 0, 94, 246);
        shell.fillRect(doorX - 42, 462, 94, 138);
        shell.fillRect(doorX - 42, 246, 25, 216);
        shell.fillRect(doorX + 17, 246, 35, 216);
        shell.fillStyle(0x020407, 1);
        shell.fillRect(doorX - 17, 246, 34, 216);
        trim.lineStyle(4, color.trim, 0.95);
        trim.strokeRect(doorX - 19, 244, 38, 220);
        details.fillStyle(color.accent, 0.55);
        details.fillRect(doorX - 9, 265, 18, 3);
        details.fillRect(doorX - 9, 438, 18, 3);
      } else {
        // The Prologue ends in a sealed driver's cab, not in naked adjacency
        // with Chapter One. It remains behind the final partition during the
        // departure cinematic and masks all later-world geometry.
        const cabX = stage.endX;
        shell.fillStyle(0x091116, 1);
        shell.fillRect(cabX - 8, 0, 252, 600);
        shell.fillStyle(0x182a31, 1);
        shell.fillRect(cabX + 12, 28, 188, 404);
        shell.fillStyle(0x101b20, 1);
        shell.fillTriangle(cabX + 200, 28, cabX + 244, 96, cabX + 200, 432);
        glass.fillStyle(0x334750, 0.96);
        glass.fillRect(cabX + 38, 118, 136, 126);
        glass.fillStyle(0x89a9b0, 0.12);
        glass.fillTriangle(cabX + 42, 122, cabX + 96, 122, cabX + 42, 206);
        trim.lineStyle(6, 0x687981, 0.95);
        trim.strokeRect(cabX + 34, 114, 144, 134);
        details.fillStyle(0x26363d, 1);
        details.fillRect(cabX + 24, 322, 174, 82);
        details.fillStyle(0x40282c, 0.86);
        details.fillRect(cabX + 24, 398, 174, 24);
        details.lineStyle(3, 0xc6a267, 0.7);
        details.lineBetween(cabX + 48, 360, cabX + 174, 360);
        [66, 104, 142].forEach((offset, gaugeIndex) => {
          details.fillStyle(0x071016, 1);
          details.fillCircle(cabX + offset, 344, 14);
          details.lineStyle(2, gaugeIndex === 1 ? 0x75d4cd : 0xc6a267, 0.82);
          details.strokeCircle(cabX + offset, 344, 12);
          details.lineBetween(cabX + offset, 344, cabX + offset + 7, 338 + gaugeIndex * 3);
        });
        details.lineStyle(5, 0x9a8054, 0.9);
        details.lineBetween(cabX + 164, 392, cabX + 184, 366);
        details.fillStyle(0xc6a267, 0.9);
        details.fillRect(cabX + 179, 360, 12, 12);
      }

      const dust = this.track(
        this.scene.add.particles(0, 0, 'mote', {
          x: { min: x + 30, max: stage.endX - 30 },
          y: { min: 100, max: 500 },
          lifespan: { min: 4500, max: 8500 },
          speedX: { min: -3, max: 7 },
          speedY: { min: -3, max: 4 },
          scale: { min: 0.12, max: 0.42 },
          alpha: { start: 0.18, end: 0 },
          frequency: 520 + index * 110,
          quantity: 1,
          blendMode: Phaser.BlendModes.ADD,
        }),
        47,
      );
      dust.setVisible(this.visible);

      // Period carriage hardware gives every room a quiet life of its own:
      // tungsten ceiling tubes, enamel service lamps and leather grab straps.
      const lampGlow = this.track(
        this.scene.add
          .ellipse(x + width * 0.5, 87, Math.min(270, width * 0.44), 54, 0xf0cf8b, 0.075)
          .setBlendMode(Phaser.BlendModes.ADD),
        30,
      );
      const lampTube = this.track(
        this.scene.add
          .rectangle(x + width * 0.5, 86, Math.min(168, width * 0.28), 6, 0xe8d5a7, 0.76)
          .setStrokeStyle(1, 0x74674f, 0.82),
        31,
      );
      const serviceHalo = this.track(
        this.scene.add
          .circle(stage.endX - 58, 124, 13, 0xcaa66b, 0.05)
          .setBlendMode(Phaser.BlendModes.ADD),
        31,
      );
      const serviceLamp = this.track(
        this.scene.add.circle(stage.endX - 58, 124, 4, 0xcaa66b, 0.58).setStrokeStyle(1, 0xf2d49a, 0.48),
        32,
      );
      const straps = [0.24, 0.76].map((fraction, strapIndex) => {
        const strapGraphics = this.scene.add.graphics();
        strapGraphics.lineStyle(2, 0x8c7956, 0.7);
        strapGraphics.lineBetween(0, 0, 0, 27);
        strapGraphics.lineStyle(3, 0xb09568, 0.8);
        strapGraphics.strokeRoundedRect(-7, 25, 14, 19, 5);
        const strap = this.track(
          this.scene.add.container(x + width * fraction, 108, [strapGraphics]),
          32,
        );
        this.scene.tweens.add({
          targets: strap,
          angle: { from: strapIndex ? 1.4 : -1.2, to: strapIndex ? -1.4 : 1.2 },
          duration: 2100 + index * 130 + strapIndex * 240,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        return strap;
      });
      this.scene.tweens.add({
        targets: [lampGlow, lampTube],
        alpha: { from: 0.72, to: 1 },
        duration: 1650 + index * 170,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.scene.tweens.add({
        targets: serviceHalo,
        scale: { from: 0.84, to: 1.18 },
        duration: 980 + index * 80,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.roomStates.push({ lampGlow, lampTube, serviceHalo, serviceLamp, straps });
    });
  }

  setRoomComplete(index, complete) {
    const room = this.roomStates[index];
    if (!room) return;
    room.serviceLamp.setFillStyle(complete ? 0x75d4cd : 0xcaa66b, complete ? 0.95 : 0.58);
    room.serviceLamp.setStrokeStyle(1, complete ? 0xb9fff8 : 0xf2d49a, complete ? 0.76 : 0.48);
    room.serviceHalo.setFillStyle(complete ? 0x75d4cd : 0xcaa66b, complete ? 0.16 : 0.05);
    room.lampTube.setFillStyle(complete ? 0xf4e3ba : 0xe8d5a7, complete ? 0.9 : 0.76);
  }

  setVisible(visible) {
    this.visible = visible;
    this.objects.forEach((object) => object.setVisible(visible));
  }

  getState() {
    return {
      car: 'tutorial-scrolling-rooms',
      visible: this.visible,
      completedRooms: this.scene.tutorialPuzzle?.stageComplete?.filter(Boolean).length ?? 0,
      roomPersistence: 'completed machinery remains in-world',
      periodMotion: ['tungsten-lamp-breath', 'leather-strap-sway', 'enamel-service-lamps'],
      layers: [
        'world-shell',
        'moving-window-frames',
        'glass',
        'room-lighting',
        'continuous-service-underframe',
      ],
    };
  }

  destroy() {
    this.objects.forEach((object) => object.destroy());
    this.objects.length = 0;
    this.roomStates.length = 0;
  }
}
