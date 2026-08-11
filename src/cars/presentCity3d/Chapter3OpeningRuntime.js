import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import {
  ARRIVAL_DIALOGUE,
  ARRIVAL_RESPONSES,
  BOTTLE_DIALOGUE,
  BOTTLE_RESPONSES,
  BOSKO_QUEUE_DIALOGUE,
  BOSKO_SQUARE_CONCLUSION,
  BOSKO_SQUARE_OPENING,
  BOSKO_SQUARE_RESPONSES,
  CART_DIALOGUE,
  CUT_INTERFACE_BLOCKED,
  CUT_INTERFACE_CONCLUSION,
  CUT_INTERFACE_OPENING,
  CUT_INTERFACE_RESPONSES,
  HANA_BLOCKED,
  HANA_CONCLUSION,
  HANA_OPENING,
  HANA_TOPIC_RESPONSES,
  DISCARDED_PRINT_DIALOGUE,
  EDA_APPROACH_RESPONSES,
  EDA_OPENING,
  EDA_RECORD_BLOCKED,
  EDA_TOPIC_RESPONSES,
  FIRST_THEORY_CONCLUSION,
  FIRST_THEORY_OPENING,
  FIRST_THEORY_RESPONSES,
  FLOWER_VENDOR_DIALOGUE,
  LEV_COMMON,
  LEV_FIRST_RESPONSES,
  LEV_INTRO_DIALOGUE,
  LEV_TOPIC_RESPONSES,
  NIKA_BLOCKED,
  NIKA_CONCLUSION,
  NIKA_OPENING,
  NIKA_TOPIC_RESPONSES,
  ARCHIVE_ENTRANCE_DIALOGUE,
  ANA_MAP_HELP_DIALOGUE,
  ARCHIVE_MAP_CONCLUSION,
  ARCHIVE_MAP_DIALOGUE,
  ARCHIVE_MAP_RESPONSES,
  MAINTENANCE_ORDER_DIALOGUE,
  MATERIAL_TIMELINE_DIALOGUE,
  OLEK_CONCLUSION,
  OLEK_OPENING,
  OLEK_ROUTE_BLOCKED,
  OLEK_TOPIC_RESPONSES,
  OPENING_POSITIONS,
  PLAZA_GROOVE_BLOCKED,
  PLAZA_GROOVE_CONCLUSION,
  PLAZA_GROOVE_OPENING,
  PLAZA_GROOVE_RESPONSES,
  PETAR_BLOCKED,
  PETAR_CONCLUSION,
  PETAR_OPENING,
  PETAR_TOPIC_RESPONSES,
  PRODUCE_VENDOR_DIALOGUE,
  SAVA_BLOCKED,
  SAVA_CONCLUSION,
  SEAM_CONCLUSION,
  SEAM_DIALOGUE,
  SEAM_INFERENCE_RESPONSES,
  SEAM_TOPIC_RESPONSES,
  SAVA_NEXT_INTERACTION,
  SAVA_OPENING,
  SAVA_TOPIC_RESPONSES,
  SECOND_THEORY_BLOCKED,
  SECOND_THEORY_CONCLUSION,
  SECOND_THEORY_OPENING,
  SECOND_THEORY_RESPONSES,
  TRANSPORT_ENTRANCE_NO_BOTTLE,
  TRANSPORT_ENTRANCE_WITH_BOTTLE,
  TRANSPORT_QUEUE_DIALOGUE,
  WORLD_BRIEFING_DIALOGUE,
  edaExitLine,
  edaRecordResponse,
  edaTopicMenu,
  cutInterfaceMenu,
  levTopicMenu,
  nikaTopicMenu,
  olekTopicMenu,
  plazaGrooveMenu,
  petarTopicMenu,
  savaTopicMenu,
  seamInferenceMenu,
  seamMenu,
  secondTheoryMenu,
  hanaTopicMenu,
} from './chapter3OpeningContent.js';
import { Chapter3DialogueController } from './Chapter3EndingRuntime.js';
import { createChapter3MinistryHall, MINISTRY_POSITIONS } from './Chapter3MinistryHall.js';
import { createChapter3ArchiveHall, ARCHIVE_POSITIONS } from './Chapter3ArchiveHall.js';
import { Chapter3TimeVisualController } from './Chapter3TimeVisualController.js';
import { Chapter3FlipClock } from './Chapter3FlipClock.js';
import { Chapter3EvidenceViewer, CHAPTER3_DOCUMENTS } from './Chapter3EvidenceViewer.js';
import { createChapter3HotelHall, HOTEL_POSITIONS } from './Chapter3HotelHall.js';
import { Chapter3ReplacementAssetSystem } from './Chapter3ReplacementAssetSystem.js';
import { RAIL_LAYOUT } from './city3dConfig.js';
import { ENDING_SLICE_POSITIONS } from './chapter3EndingContent.js';
import { Chapter3AnimatedCharacterSystem } from './Chapter3AnimatedCharacters.js';
import {
  BOARDING_CONCLUSION, CONTINUATION_CHOICES, CONTINUATION_RESPONSES, DARO_BLOCKED, DARO_CONCLUSION, DARO_OPENING,
  DARO_RESPONSES, EVIDENCE_TABLE_CONCLUSION, EVIDENCE_TABLE_OPENING, FINAL_THEORY_BLOCKED, FINAL_THEORY_RESPONSES,
  HANA_BREAKFAST, HOTEL_GUEST_DIALOGUE, LEV_FINAL_BLOCKED, LEV_FINAL_CONCLUSION, LEV_FINAL_OPENING, LEV_FINAL_RESPONSES,
  ALLEY_MEN_DIALOGUE, ALLEY_RESIDENT_DIALOGUE, DAWN_CAMPFIRE_REMAINS_DIALOGUE, MORNING_LEV_GREETING, MORNING_LEV_REMINDER,
  CAMPFIRE_KETTLE_DIALOGUE, CAMPFIRE_MIRO_DIALOGUE, CAMPFIRE_RADA_DIALOGUE, CAMPFIRE_SELINE_DIALOGUE,
  MORNING_LEV_OVERLOOK_REMINDER, MORNING_LEV_PLATFORM_REMINDER, MORNING_RESERVATION_DIALOGUE, SUNRISE_BENCH_DIALOGUE,
  MORNING_EVIDENCE_BLOCKED, MORNING_EVIDENCE_CONCLUSION, MORNING_EVIDENCE_RESPONSES, NIGHT_ATTITUDE_RESPONSES,
  NIGHT_FIRST_LINE, NIGHT_RECONNECT, NIGHT_SECOND_LINE, SLEEP_DIALOGUE, daroMenu, finalTheoryMenu, levFinalMenu, morningEvidenceMenu,
} from './chapter3FinalContent.js';

const INTERACTION_RADIUS = 4.2;
const FIRE_SITE = Object.freeze({ x: 9.8, z: 3.6, approachZ: 7.4 });
const MORNING_LEV_EXTERIOR_START = Object.freeze([48.2, 0.5, -11.0]);
const SUNRISE_ROUTE_POINTS = Object.freeze([
  Object.freeze([-45.0, 0.5, 28.0]),
  Object.freeze([-47.0, 2.8, 26.0]),
  Object.freeze([-43.8, 5.1, 25.7]),
  Object.freeze([-42.1, 5.6, 23.25]),
  Object.freeze([-40.65, 6.7, 20.9]),
  Object.freeze([-39.35, 8.8, 18.75]),
]);
const HOTEL_PAPER_DOCUMENTS = Object.freeze({
  'oil-route': CHAPTER3_DOCUMENTS.HOTEL_OIL_ROUTE,
  'issue-copy': CHAPTER3_DOCUMENTS.HOTEL_ISSUE_COPY,
  'order-c441': CHAPTER3_DOCUMENTS.HOTEL_ORDER_C441,
  'witness-notes': CHAPTER3_DOCUMENTS.HOTEL_WITNESS_NOTES,
  reservation: CHAPTER3_DOCUMENTS.HOTEL_RESERVATION,
});

function positionFrom(values) {
  return new THREE.Vector3(values[0], values[1], values[2]);
}

function smooth(value) {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function makeActor(scene, { name, color, position, scale = 1 }) {
  const group = new THREE.Group();
  group.name = name;
  const coat = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38 * scale, 0.86 * scale, 5, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.02 }),
  );
  coat.position.y = 0.92 * scale;
  coat.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27 * scale, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xc7a27f, roughness: 0.92 }),
  );
  head.position.y = 1.72 * scale;
  head.castShadow = true;
  group.add(coat, head);
  group.position.copy(positionFrom(position));
  scene.add(group);
  return group;
}

function makeObjectHighlight(object, color = 0x527f77) {
  const materials = [];
  object?.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone());
      materials.push(...child.material);
    } else {
      child.material = child.material.clone();
      materials.push(child.material);
    }
  });
  let visible = false;
  return {
    get visible() {
      return visible;
    },
    set visible(value) {
      visible = Boolean(value);
      for (const material of materials) {
        if (!material.emissive) continue;
        material.emissive.setHex(visible ? color : 0x000000);
        material.emissiveIntensity = visible ? 0.42 : 0;
      }
    },
  };
}

function makeDynamicObjectHighlight(object, color = 0x527f77) {
  let visible = false;
  return {
    get visible() {
      return visible;
    },
    set visible(value) {
      visible = Boolean(value);
      object?.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          if (!material.emissive) continue;
          material.emissive.setHex(visible ? color : 0x000000);
          material.emissiveIntensity = visible ? 0.42 : 0;
        }
      });
    },
  };
}

function makeDarkSeam(scene, surfaceHeightAt = null) {
  const points = [
    new THREE.Vector3(3.4, 0, 11.5),
    new THREE.Vector3(4.6, 0, 10.5),
    new THREE.Vector3(5.6, 0, 9.4),
    new THREE.Vector3(6.8, 0, 8.6),
    new THREE.Vector3(8.0, 0, 7.7),
    new THREE.Vector3(8.05, 0, 6.8),
    new THREE.Vector3(9.2, 0, 6.0),
    new THREE.Vector3(10.4, 0, 5.3),
  ];

  for (const point of points) {
    const sampled = surfaceHeightAt?.(point.x, point.z);
    point.y = Number.isFinite(sampled) ? sampled : 0.73;
  }

  const makeWidePath = ({ name, width, height, material, yOffset }) => {
    const group = new THREE.Group();
    group.name = name;
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);
      const segment = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), material);
      segment.position.set(
        (start.x + end.x) / 2,
        (start.y + end.y) / 2 + yOffset,
        (start.z + end.z) / 2,
      );
      segment.rotation.y = -Math.atan2(dz, dx);
      group.add(segment);
    }
    for (const point of points) {
      const joint = new THREE.Mesh(new THREE.CylinderGeometry(width / 2, width / 2, height, 12), material);
      joint.position.set(point.x, point.y + yOffset, point.z);
      group.add(joint);
    }
    scene.add(group);
    return group;
  };

  const stain = makeWidePath({
    name: 'opening-lamp-oil-seam',
    width: 0.46,
    height: 0.022,
    yOffset: 0.018,
    material: new THREE.MeshStandardMaterial({
      color: 0x241510,
      roughness: 0.2,
      metalness: 0.08,
      envMapIntensity: 0.8,
    }),
  });
  const wetEdge = makeWidePath({
    name: 'opening-lamp-oil-seam-wet-edge',
    width: 0.58,
    height: 0.009,
    yOffset: 0.014,
    material: new THREE.MeshStandardMaterial({
      color: 0x6f3b20,
      roughness: 0.13,
      metalness: 0.05,
      transparent: true,
      opacity: 0.42,
    }),
  });
  // Draw the dark core after the translucent spread, like oil collecting in
  // the lowest joints of old paving rather than a clean painted stripe.
  wetEdge.renderOrder = 1;
  stain.renderOrder = 2;
  for (const [index, point] of points.entries()) {
    if (index === 0 || index === points.length - 1 || index % 2 === 0) {
      const spill = new THREE.Mesh(
        new THREE.CircleGeometry(index === 0 ? 0.52 : 0.34, 18),
        new THREE.MeshStandardMaterial({
          color: index === 0 ? 0x382018 : 0x2b1712,
          roughness: 0.16,
          transparent: true,
          opacity: 0.72,
        }),
      );
      spill.rotation.x = -Math.PI / 2;
      spill.scale.set(1.45, 0.72, 1);
      spill.position.set(point.x, point.y + 0.021, point.z);
      spill.rotation.z = index * 0.61;
      stain.add(spill);
    }
  }
  const outline = makeWidePath({
    name: 'opening-lamp-oil-seam-highlight',
    width: 0.64,
    height: 0.012,
    yOffset: 0.045,
    material: new THREE.MeshBasicMaterial({ color: 0x9bd6ca, transparent: true, opacity: 0.68 }),
  });
  outline.visible = false;
  return { stain, wetEdge, outline, points };
}

function makeBottle(scene) {
  const group = new THREE.Group();
  group.name = 'opening-solvent-bottle';
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.16, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x9aa9a0, roughness: 0.44, metalness: 0.08 }),
  );
  glass.position.y = 0.25;
  glass.rotation.z = Math.PI / 2.8;
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.165, 0.165, 0.19, 10, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xc6b488, roughness: 0.9, side: THREE.DoubleSide }),
  );
  label.position.copy(glass.position);
  label.rotation.copy(glass.rotation);
  group.add(glass, label);
  group.position.copy(positionFrom(OPENING_POSITIONS.bottle));
  scene.add(group);
  return group;
}

function makePlazaGrooves(scene) {
  const group = new THREE.Group();
  group.name = 'opening-plaza-announcement-grooves';
  const grooveMaterial = new THREE.MeshStandardMaterial({
    color: 0x533126,
    roughness: 0.92,
    metalness: 0,
  });
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0x9bd6ca,
    transparent: true,
    opacity: 0.66,
  });
  const highlight = new THREE.Group();
  highlight.name = 'opening-plaza-announcement-grooves-highlight';
  const addSegment = (x, z, width, depth) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.026, depth), grooveMaterial);
    base.position.set(x, 0, z);
    group.add(base);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(width + 0.09, 0.012, depth + 0.09), highlightMaterial);
    glow.position.set(x, 0.024, z);
    highlight.add(glow);
  };
  const cellWidth = 1.25;
  const cellDepth = 1.35;
  for (const rowZ of [-1.8, 2.2]) {
    for (let index = 0; index < 8; index += 1) {
      const x = -5.25 + index * 1.5;
      addSegment(x, rowZ - cellDepth / 2, cellWidth, 0.09);
      addSegment(x, rowZ, cellWidth, 0.09);
      addSegment(x, rowZ + cellDepth / 2, cellWidth, 0.09);
      addSegment(x - cellWidth / 2, rowZ, 0.09, cellDepth);
      addSegment(x + cellWidth / 2, rowZ, 0.09, cellDepth);
    }
  }
  addSegment(-6.45, -1.8, 1.05, 0.11);
  addSegment(-6.45, 2.2, 0.58, 0.11);
  addSegment(-5.92, 2.2, 0.12, 0.11);
  group.add(highlight);
  group.position.copy(positionFrom(OPENING_POSITIONS.plazaGrooves));
  group.position.y = 0.96;
  highlight.visible = false;
  scene.add(group);
  return { group, highlight };
}

function makeCutInterface(scene) {
  const group = new THREE.Group();
  group.name = 'opening-cut-feed-interface';
  const metal = new THREE.MeshStandardMaterial({ color: 0x6f665c, roughness: 0.52, metalness: 0.48 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x302b27, roughness: 0.86 });
  const addEnd = (x, rotation) => {
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.25, 12), metal);
    line.rotation.z = Math.PI / 2;
    line.rotation.y = rotation;
    line.position.set(x, 0.12, 0);
    group.add(line);
  };
  addEnd(-0.56, -0.04);
  addEnd(0.56, 0.04);
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.42), dark);
  clamp.position.set(0.12, 0.08, 0.02);
  group.add(clamp);
  const highlight = makeObjectHighlight(group);
  group.position.copy(positionFrom(OPENING_POSITIONS.cutInterface));
  group.visible = false;
  scene.add(group);
  return { group, highlight };
}

function makeGroundMessage(scene, surfaceHeightAt = null) {
  const messageGroup = new THREE.Group();
  messageGroup.name = 'chapter3-burning-ground-message';
  const fireGround = surfaceHeightAt?.(FIRE_SITE.x, FIRE_SITE.z);
  messageGroup.position.set(FIRE_SITE.x, Number.isFinite(fireGround) ? fireGround : 0.73, FIRE_SITE.z);
  messageGroup.rotation.y = 0.845;
  scene.add(messageGroup);
  const makeParticleTexture = (kind) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (kind === 'flame') {
      const gradient = context.createLinearGradient(64, 116, 64, 10);
      gradient.addColorStop(0, 'rgba(255,54,112,0.98)');
      gradient.addColorStop(0.38, 'rgba(255,123,126,0.98)');
      gradient.addColorStop(0.72, 'rgba(255,207,157,0.96)');
      gradient.addColorStop(1, 'rgba(255,247,218,0)');
      context.fillStyle = gradient;
      context.shadowColor = 'rgba(255,90,125,0.8)';
      context.shadowBlur = 14;
      context.beginPath();
      context.moveTo(64, 118);
      context.bezierCurveTo(24, 114, 20, 78, 47, 55);
      context.bezierCurveTo(56, 47, 47, 32, 65, 10);
      context.bezierCurveTo(72, 35, 92, 42, 86, 65);
      context.bezierCurveTo(110, 84, 99, 116, 64, 118);
      context.closePath();
      context.fill();
      context.globalCompositeOperation = 'lighter';
      const core = context.createRadialGradient(64, 92, 2, 64, 92, 31);
      core.addColorStop(0, 'rgba(255,247,222,0.62)');
      core.addColorStop(0.35, 'rgba(255,196,158,0.54)');
      core.addColorStop(1, 'rgba(255,80,130,0)');
      context.fillStyle = core;
      context.fillRect(25, 48, 78, 70);
    } else {
      const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 61);
      gradient.addColorStop(0, kind === 'ember'
        ? 'rgba(255,244,204,1)'
        : 'rgba(255,98,154,0.62)');
      gradient.addColorStop(0.28, kind === 'ember'
        ? 'rgba(255,153,91,0.82)'
        : 'rgba(255,120,166,0.32)');
      gradient.addColorStop(1, 'rgba(255,78,135,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const flameTexture = makeParticleTexture('flame');
  const hazeTexture = makeParticleTexture('haze');
  const emberTexture = makeParticleTexture('ember');
  const makeLine = (text, rowOffset, color) => {
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = 1536;
    sourceCanvas.height = 220;
    const context = sourceCanvas.getContext('2d');
    context.font = '900 108px Georgia, serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    context.shadowColor = '#ffffff';
    context.shadowBlur = 10;
    context.fillText(text, sourceCanvas.width / 2, sourceCanvas.height / 2);
    const pixelData = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
    const displayCanvas = document.createElement('canvas');
    displayCanvas.width = sourceCanvas.width;
    displayCanvas.height = sourceCanvas.height;
    const displayContext = displayCanvas.getContext('2d');
    displayContext.drawImage(sourceCanvas, 0, 0);
    const texture = new THREE.CanvasTexture(displayCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const charred = new THREE.Mesh(
      new THREE.PlaneGeometry(11.82, 1.48),
      new THREE.MeshBasicMaterial({
        map: texture, color: 0x24140f, transparent: true, depthWrite: false, opacity: 0.9,
      }),
    );
    charred.rotation.x = -Math.PI / 2;
    charred.position.set(0, 0.022, rowOffset);
    charred.renderOrder = 4;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(11.6, 1.3),
      new THREE.MeshBasicMaterial({ map: texture, color, transparent: true, depthWrite: false, opacity: 0.94 }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0.032, rowOffset);
    mesh.renderOrder = 6;
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(12.05, 1.55),
      new THREE.MeshBasicMaterial({
        map: texture, transparent: true, depthWrite: false, opacity: 0.34,
        color: 0xff648b,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0, 0.027, rowOffset);
    glow.renderOrder = 5;

    const count = 360;
    const positions = new Float32Array(count * 3);
    const bases = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    let accepted = 0;
    for (let attempt = 0; accepted < count && attempt < 10000; attempt += 1) {
      const px = (attempt * 193 + 97) % sourceCanvas.width;
      const py = (attempt * 71 + 43) % sourceCanvas.height;
      if (pixelData[(py * sourceCanvas.width + px) * 4 + 3] < 70) continue;
      const index = accepted * 3;
      const localX = (px / sourceCanvas.width - 0.5) * 11.25;
      const localZ = rowOffset + (py / sourceCanvas.height - 0.5) * 1.08;
      positions[index] = bases[index] = localX;
      positions[index + 1] = bases[index + 1] = 0.07;
      positions[index + 2] = bases[index + 2] = localZ;
      phases[accepted] = ((attempt * 37) % 101) / 101;
      accepted += 1;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, accepted);
    const flames = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xffd3a4,
        map: flameTexture,
        alphaTest: 0.025,
        size: 0.68,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    flames.renderOrder = 7;
    flames.userData.basePositions = bases;
    flames.userData.phases = phases;
    flames.userData.particleCount = accepted;
    const flameCores = flames.clone();
    flameCores.name = 'burning-letter-pink-flame-cores';
    flameCores.material = new THREE.PointsMaterial({
      color,
      map: flameTexture,
      alphaTest: 0.02,
      size: 0.38,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    flameCores.renderOrder = 8;
    const heatHaze = flames.clone();
    heatHaze.name = 'burning-letter-watercolor-heat-haze';
    heatHaze.material = new THREE.PointsMaterial({
      color: 0xff6b9d,
      map: hazeTexture,
      size: 1.06,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    heatHaze.renderOrder = 6;
    const flameBand = new THREE.Group();
    flameBand.name = 'burning-letter-peach-flame-curtain';
    const flameBandMaterial = new THREE.SpriteMaterial({
      color: 0xffc59f,
      map: flameTexture,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (let sample = 0; sample < 40; sample += 1) {
      if ((sample * 17) % 13 === 0) continue;
      const phase = ((sample * 29) % 47) / 47;
      const px = Math.round(((sample + 0.28 + phase * 0.42) / 40) * (sourceCanvas.width - 1));
      let weightedY = 0;
      let alphaTotal = 0;
      for (let py = 12; py < sourceCanvas.height - 12; py += 3) {
        const alpha = pixelData[(py * sourceCanvas.width + px) * 4 + 3];
        if (alpha < 55) continue;
        weightedY += py * alpha;
        alphaTotal += alpha;
      }
      if (alphaTotal === 0) continue;
      const glyphY = weightedY / alphaTotal;
      const flame = new THREE.Sprite(flameBandMaterial);
      flame.position.set(
        (px / sourceCanvas.width - 0.5) * 11.25,
        0.34 + phase * 0.13,
        rowOffset + (glyphY / sourceCanvas.height - 0.5) * 1.02,
      );
      flame.scale.set(0.66 + phase * 0.38, 0.82 + phase * 0.78, 1);
      flame.renderOrder = 8;
      flame.userData.baseY = flame.position.y;
      flame.userData.baseScaleX = flame.scale.x;
      flame.userData.baseScaleY = flame.scale.y;
      flame.userData.phase = phase;
      flameBand.add(flame);
    }
    const embers = flames.clone();
    embers.name = 'burning-letter-rising-embers';
    embers.material = new THREE.PointsMaterial({
      color: 0xffd18a,
      map: emberTexture,
      alphaTest: 0.02,
      size: 0.11,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    embers.renderOrder = 9;
    const selection = new THREE.Mesh(
      new THREE.PlaneGeometry(11.9, 1.5),
      new THREE.MeshBasicMaterial({
        map: texture,
        color: 0x8ed5c8,
        transparent: true,
        depthWrite: false,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
      }),
    );
    selection.rotation.x = -Math.PI / 2;
    selection.position.set(0, 0.052, rowOffset);
    selection.visible = false;
    selection.renderOrder = 9;
    messageGroup.add(charred, glow, mesh, heatHaze, flames, flameCores, flameBand, embers, selection);
    return {
      charred,
      mesh,
      glow,
      heatHaze,
      flames,
      flameCores,
      flameBand,
      embers,
      selection,
      ignitionProgress: 1,
      setReveal(progress) {
        const reveal = THREE.MathUtils.clamp(progress, 0, 1);
        this.ignitionProgress = reveal;
        displayContext.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        const cropWidth = Math.max(1, Math.round(sourceCanvas.width * reveal));
        if (reveal > 0) {
          displayContext.drawImage(
            sourceCanvas,
            0, 0, cropWidth, sourceCanvas.height,
            0, 0, cropWidth, sourceCanvas.height,
          );
        }
        texture.needsUpdate = true;
      },
    };
  };
  const firstEffect = makeLine("BUTCH, I'M ALIVE.", 2.65, '#ff416f');
  const secondEffect = makeLine('I LEFT BY CHOICE.', -2.65, '#ff6682');
  const highlight = {
    get visible() {
      return firstEffect.selection.visible || secondEffect.selection.visible;
    },
    set visible(value) {
      firstEffect.selection.visible = Boolean(value);
      secondEffect.selection.visible = Boolean(value);
    },
  };
  const firstLight = new THREE.PointLight(0xff6b2d, 18, 13, 1.75);
  firstLight.position.set(0, 1.7, 2.65);
  const secondLight = new THREE.PointLight(0xff8a35, 18, 13, 1.75);
  secondLight.position.set(0, 1.7, -2.65);
  messageGroup.add(firstLight, secondLight);
  messageGroup.updateMatrixWorld(true);
  const interfacePosition = messageGroup.localToWorld(new THREE.Vector3(-6.15, 0.08, -2.65));
  const setEffectVisible = (effect, visible) => {
    effect.setReveal(visible ? 1 : 0);
    effect.charred.visible = visible;
    effect.mesh.visible = visible;
    effect.glow.visible = visible;
    effect.heatHaze.visible = visible;
    effect.flames.visible = visible;
    effect.flameCores.visible = visible;
    effect.flameBand.visible = visible;
    effect.embers.visible = visible;
  };
  const api = {
    first: firstEffect.mesh,
    second: secondEffect.mesh,
    firstEffect,
    secondEffect,
    firstLight,
    secondLight,
    fireLights: [firstLight, secondLight],
    highlight,
    group: messageGroup,
    interfacePosition,
    position: new THREE.Vector3(FIRE_SITE.x, messageGroup.position.y + 0.03, FIRE_SITE.z),
    setFirstBurning(visible) {
      setEffectVisible(firstEffect, visible);
      firstLight.visible = visible;
    },
    setSecondBurning(visible) {
      setEffectVisible(secondEffect, visible);
      secondLight.visible = visible;
    },
    setSecondIgnitionProgress(progress) {
      const reveal = THREE.MathUtils.clamp(progress, 0, 1);
      secondEffect.setReveal(reveal);
      secondEffect.mesh.visible = reveal > 0;
      secondEffect.charred.visible = reveal > 0;
      secondEffect.glow.visible = reveal > 0;
      secondEffect.heatHaze.visible = reveal > 0;
      secondEffect.flames.visible = reveal > 0;
      secondEffect.flameCores.visible = reveal > 0;
      secondEffect.flameBand.visible = reveal > 0;
      secondEffect.embers.visible = reveal > 0;
      secondLight.visible = reveal > 0;
      secondLight.intensity = 18 * reveal;
    },
    setBurnedOut() {
      firstEffect.flames.visible = false;
      firstEffect.flameCores.visible = false;
      firstEffect.flameBand.visible = false;
      firstEffect.heatHaze.visible = false;
      firstEffect.embers.visible = false;
      firstEffect.glow.visible = false;
      secondEffect.flames.visible = false;
      secondEffect.flameCores.visible = false;
      secondEffect.flameBand.visible = false;
      secondEffect.heatHaze.visible = false;
      secondEffect.embers.visible = false;
      secondEffect.glow.visible = false;
      firstLight.visible = false;
      secondLight.visible = false;
      firstEffect.mesh.material.color.setHex(0x2f1d18);
      secondEffect.mesh.material.color.setHex(0x2f1d18);
      firstEffect.mesh.material.opacity = 0.74;
      secondEffect.mesh.material.opacity = 0.74;
    },
  };
  api.setFirstBurning(false);
  api.setSecondBurning(false);
  return api;
}

function makeFinalTrainDoor(scene) {
  const group = new THREE.Group();
  group.name = 'chapter3-doorless-carriage-and-single-door-placeholder';
  group.position.copy(positionFrom(ENDING_SLICE_POSITIONS.trainDoor));
  group.rotation.y = THREE.MathUtils.degToRad(55);
  const shellMaterial = new THREE.MeshStandardMaterial({ color: 0x3d4544, roughness: 0.68, metalness: 0.34 });
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8d5a3c, roughness: 0.52, metalness: 0.48 });
  const shell = new THREE.Group();
  shell.name = 'chapter3-doorless-carriage-shell-placeholder';
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.34, 0.42), shellMaterial);
  frameTop.position.y = 1.42;
  const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.55, 0.42), shellMaterial);
  frameLeft.position.set(-1.2, 0.02, 0);
  const frameRight = frameLeft.clone();
  frameRight.position.x = 1.2;
  shell.add(frameTop, frameLeft, frameRight);
  const door = new THREE.Group();
  door.name = 'chapter3-single-moving-carriage-door';
  door.position.set(1.35, 0, 2.15);
  const doorFallback = new THREE.Mesh(new THREE.BoxGeometry(1.95, 2.45, 0.3), doorMaterial);
  doorFallback.name = 'chapter3-single-moving-carriage-door-placeholder';
  doorFallback.position.y = 1.22;
  door.add(doorFallback);
  group.add(shell, door);
  group.visible = false;
  scene.add(group);
  return { group, shell, door, doorFallback };
}

function samplePolyline(points, progress) {
  const lengths = [];
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const length = points[index].distanceTo(points[index + 1]);
    lengths.push(length);
    total += length;
  }
  let remaining = THREE.MathUtils.clamp(progress, 0, 1) * total;
  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      return points[index].clone().lerp(points[index + 1], lengths[index] ? remaining / lengths[index] : 0);
    }
    remaining -= lengths[index];
  }
  return points.at(-1).clone();
}

function makeSunriseOverlook(scene, _existingBench = null) {
  const group = new THREE.Group();
  group.name = 'chapter3-tunnel-sunrise-overlook';
  const stairGreybox = new THREE.Group();
  stairGreybox.name = 'chapter3-sunrise-timber-boardwalk';
  group.add(stairGreybox);
  const weatheredWood = new THREE.MeshStandardMaterial({ color: 0x5b3b27, roughness: 0.94 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x2f241d, roughness: 0.98 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x242827, roughness: 0.8, metalness: 0.22 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x786b5b, roughness: 0.98 });
  const wood = weatheredWood;
  const boardwalkPoints = SUNRISE_ROUTE_POINTS.map(positionFrom);

  for (let segmentIndex = 0; segmentIndex < boardwalkPoints.length - 1; segmentIndex += 1) {
    const start = boardwalkPoints[segmentIndex];
    const end = boardwalkPoints[segmentIndex + 1];
    const delta = end.clone().sub(start);
    const length = delta.length();
    const direction = delta.clone().normalize();
    const yaw = Math.atan2(delta.x, delta.z);
    const outerSide = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(1.05);
    const plankCount = Math.max(5, Math.ceil(length / 0.42));

    // Narrow transverse boards form a continuous sloped service walk that
    // climbs back toward the tunnel rock, rather than projecting over the plaza.
    for (let plankIndex = 0; plankIndex < plankCount; plankIndex += 1) {
      const amount = (plankIndex + 0.5) / plankCount;
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(2.08, 0.14, Math.max(0.31, length / plankCount - 0.035)),
        weatheredWood,
      );
      plank.position.lerpVectors(start, end, amount).add(new THREE.Vector3(0, -0.1, 0));
      plank.rotation.y = yaw;
      plank.castShadow = plank.receiveShadow = true;
      stairGreybox.add(plank);
    }

    const underBeam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, length + 0.18), darkWood);
    underBeam.position.copy(start).lerp(end, 0.5).add(outerSide.clone().multiplyScalar(0.62));
    underBeam.position.y -= 0.28;
    underBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    underBeam.castShadow = true;
    stairGreybox.add(underBeam);

    const postCount = Math.max(2, Math.ceil(length / 1.65));
    const railPoints = [];
    for (let postIndex = 0; postIndex <= postCount; postIndex += 1) {
      const amount = postIndex / postCount;
      const centre = start.clone().lerp(end, amount).add(outerSide);
      railPoints.push(centre.clone().add(new THREE.Vector3(0, 0.78, 0)));
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.0, 8), darkWood);
      post.position.copy(centre).add(new THREE.Vector3(0, 0.35, 0));
      post.castShadow = true;
      stairGreybox.add(post);

      // Cantilever braces reach down and inward, visually tying the boardwalk
      // to the cliff instead of leaving it as a floating flight.
      if (postIndex % 2 === 0) {
        const braceStart = centre.clone().add(new THREE.Vector3(0, -0.12, 0));
        const braceEnd = centre.clone().add(outerSide.clone().multiplyScalar(-1.55)).add(new THREE.Vector3(0, -1.05, 0));
        const braceDelta = braceEnd.clone().sub(braceStart);
        const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, braceDelta.length(), 7), darkWood);
        brace.position.copy(braceStart).lerp(braceEnd, 0.5);
        brace.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), braceDelta.clone().normalize());
        brace.castShadow = true;
        stairGreybox.add(brace);

        // Short pins disappear into the bank and make the flight read as a
        // rock-mounted inspection walk, never as a street-level trestle.
        const anchorTop = centre.clone().add(outerSide.clone().multiplyScalar(-1.45));
        const anchor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.065, 0.085, 0.72, 7),
          darkWood,
        );
        anchor.position.copy(anchorTop).add(new THREE.Vector3(0, -0.5, 0));
        anchor.castShadow = true;
        stairGreybox.add(anchor);
      }
    }
    const railCurve = new THREE.CatmullRomCurve3(railPoints);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, postCount * 3, 0.055, 7, false), darkWood);
    rail.castShadow = true;
    stairGreybox.add(rail);

    // A small landing makes every change of direction believable and keeps the
    // animated route centred on visible timber rather than empty space.
    if (segmentIndex < boardwalkPoints.length - 2) {
      const landing = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.16, 1.55), weatheredWood);
      landing.position.copy(end).add(new THREE.Vector3(0, -0.11, 0));
      landing.rotation.y = yaw;
      landing.castShadow = landing.receiveShadow = true;
      stairGreybox.add(landing);
    }
  }

  // The authored walk ends at the open edge of the generated platform. Keep
  // that edge distinct from the deck centre: using one point for both made the
  // last flight disappear underneath the platform and let the actors land in
  // its rail/rock dressing.
  const platformEntrance = boardwalkPoints.at(-1).clone();
  const platformForward = platformEntrance.clone()
    .sub(boardwalkPoints.at(-2))
    .setY(0)
    .normalize();
  const summit = platformEntrance.clone().add(platformForward.clone().multiplyScalar(1.72));
  const points = [...boardwalkPoints, summit.clone()];

  // Bridge the final flight across the generated platform's open lip. This is
  // deliberately a separate, level connector: the sloped route used to end
  // under the thick PBR deck, leaving an apparent gap and hiding the actors'
  // bodies as they crossed onto it.
  const topConnector = new THREE.Group();
  topConnector.name = 'chapter3-sunrise-platform-connector';
  const connectorLength = 2.35;
  const connectorStart = platformEntrance.clone().add(platformForward.clone().multiplyScalar(-0.34));
  const connectorEnd = connectorStart.clone().add(platformForward.clone().multiplyScalar(connectorLength));
  const connectorYaw = Math.atan2(platformForward.x, platformForward.z);
  const connectorPlankCount = 8;
  for (let index = 0; index < connectorPlankCount; index += 1) {
    const amount = (index + 0.5) / connectorPlankCount;
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(1.92, 0.15, connectorLength / connectorPlankCount - 0.025),
      weatheredWood,
    );
    plank.position.lerpVectors(connectorStart, connectorEnd, amount);
    plank.position.y -= 0.08;
    plank.rotation.y = connectorYaw;
    plank.castShadow = plank.receiveShadow = true;
    topConnector.add(plank);
  }
  group.add(topConnector);
  const platformShape = new THREE.Shape();
  platformShape.moveTo(-2.4, -1.35);
  platformShape.lineTo(2.4, -1.35);
  platformShape.lineTo(2.2, 0.55);
  platformShape.lineTo(1.35, 1.7);
  platformShape.lineTo(-1.35, 1.7);
  platformShape.lineTo(-2.2, 0.55);
  platformShape.closePath();
  const platformGeometry = new THREE.ExtrudeGeometry(platformShape, {
    depth: 0.3,
    bevelEnabled: false,
    steps: 1,
  });
  platformGeometry.rotateX(Math.PI / 2);
  const platform = new THREE.Mesh(platformGeometry, darkWood);
  platform.name = 'chapter3-sunrise-overlook-platform-placeholder';
  platform.position.set(summit.x, summit.y - 0.06, summit.z);
  platform.rotation.y = THREE.MathUtils.degToRad(16);
  platform.castShadow = platform.receiveShadow = true;
  group.add(platform);
  const platformSupports = [];
  for (const [supportX, supportZ] of [[-1.65, -1.15], [1.65, -1.15], [-1.65, 1.15], [1.65, 1.15]]) {
    const support = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 0.9, 8),
      darkWood,
    );
    const offset = new THREE.Vector3(supportX, 0, supportZ)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), platform.rotation.y);
    support.position.set(summit.x + offset.x, summit.y - 0.72, summit.z + offset.z);
    support.castShadow = true;
    group.add(support);
    platformSupports.push(support);
  }

  const platformModel = new THREE.Group();
  platformModel.name = 'chapter3-sunrise-overlook-platform-hunyuan';
  platformModel.position.copy(summit);
  group.add(platformModel);
  new GLTFLoader().load(
    '/assets/chapter03-3d/models/ch03_cliff_overlook_platform.glb',
    (gltf) => {
      const model = gltf.scene;
      model.rotation.y = THREE.MathUtils.degToRad(16);
      model.updateMatrixWorld(true);
      const initialBounds = new THREE.Box3().setFromObject(model);
      const initialSize = initialBounds.getSize(new THREE.Vector3());
      const footprint = Math.max(initialSize.x, initialSize.z);
      if (footprint <= 0) return;
      model.scale.setScalar(5.9 / footprint);
      model.updateMatrixWorld(true);
      const fittedBounds = new THREE.Box3().setFromObject(model);
      const fittedSize = fittedBounds.getSize(new THREE.Vector3());
      const fittedCenter = fittedBounds.getCenter(new THREE.Vector3());
      // The generated model includes a shallow rock-mounted substructure.
      // Sink that substructure into the authored cliff while keeping the deck
      // surface level with the final boardwalk point and its front edge open.
      // The walkable deck sits above the trimmed mounting lip. Aligning only
      // 18% of the model height treated the lip as the floor and left the real
      // boards visibly above the incoming walk. The 32% cross-section matches
      // the deck surface in the trimmed runtime mesh.
      const deckY = fittedBounds.min.y + fittedSize.y * 0.32;
      model.position.set(-fittedCenter.x, -deckY + 0.02, -fittedCenter.z);
      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });
      platformModel.add(model);
      platform.visible = false;
      platformSupports.forEach((support) => { support.visible = false; });
    },
    undefined,
    () => {},
  );

  const bench = new THREE.Group();
  bench.name = 'chapter3-sunrise-overlook-bench';
  const benchFallback = new THREE.Group();
  benchFallback.name = 'chapter3-sunrise-bench-fallback';
  const benchWood = new THREE.MeshStandardMaterial({
    color: 0xb97948,
    emissive: 0x241006,
    emissiveIntensity: 0.12,
    roughness: 0.9,
  });
  const addBenchPart = (size, position, material) => {
    const part = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    part.position.set(...position);
    part.castShadow = part.receiveShadow = true;
    benchFallback.add(part);
  };
  addBenchPart([3.0, 0.2, 0.78], [0, 0.72, 0], benchWood);
  addBenchPart([3.0, 0.22, 0.18], [0, 1.48, 0.42], benchWood);
  for (const x of [-1.18, -0.4, 0.4, 1.18]) {
    addBenchPart([0.12, 0.76, 0.12], [x, 1.12, 0.4], benchWood);
  }
  for (const x of [-1.12, 1.12]) {
    addBenchPart([0.16, 0.76, 0.16], [x, 0.31, 0], iron);
  }
  bench.add(benchFallback);

  // Load a dedicated copy. Cloning the city bench here used to clone its empty
  // pre-load shell, so the overlook copy stayed empty forever even after the
  // original asset finished loading.
  new GLTFLoader().load(
    '/assets/chapter03-3d/models/ch03_fountain_bench.glb',
    (gltf) => {
      const model = gltf.scene;
      model.updateMatrixWorld(true);
      const initialBounds = new THREE.Box3().setFromObject(model);
      const initialSize = initialBounds.getSize(new THREE.Vector3());
      const footprint = Math.max(initialSize.x, initialSize.z);
      if (footprint <= 0) return;
      model.scale.setScalar(3.05 / footprint);
      model.updateMatrixWorld(true);
      const fittedBounds = new THREE.Box3().setFromObject(model);
      const fittedCenter = fittedBounds.getCenter(new THREE.Vector3());
      model.position.set(-fittedCenter.x, -fittedBounds.min.y, -fittedCenter.z);
      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });
      bench.add(model);
      // Keep the authored silhouette underneath the decorative asset. It is
      // the guaranteed readable/clickable bench shape if the dark PBR model
      // loses contrast against the equally dark platform at dawn.
    },
    undefined,
    () => {},
  );
  // Sit the reused city bench clearly above the generated deck. The prior
  // placeholder height put its feet inside the PBR platform and made it read as
  // missing from the fixed top-down camera.
  bench.position.copy(summit).add(platformForward.clone().multiplyScalar(0.28));
  bench.position.y += 0.12;
  // The reusable bench asset's back is local +Z. The first pass used the
  // asset's decorative yaw without accounting for that, so the backrest sat
  // between the characters and the dawn. Flip it toward the overlook view.
  bench.rotation.y = THREE.MathUtils.degToRad(52 + 180);
  group.add(bench);

  // A small top-of-walk marker gives the descent its own click target instead
  // of overloading the bench after the sunrise conversation.
  const summitReturnMarker = new THREE.Group();
  summitReturnMarker.name = 'chapter3-sunrise-return-marker';
  const returnPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.78, 8), iron);
  returnPost.position.y = 0.39;
  const returnCap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 7), weatheredWood);
  returnCap.position.y = 0.82;
  summitReturnMarker.add(returnPost, returnCap);
  summitReturnMarker.position.copy(platformEntrance).add(new THREE.Vector3(0, 0.04, 0));
  group.add(summitReturnMarker);

  const trailMarker = new THREE.Group();
  trailMarker.name = 'chapter3-sunrise-trailhead-marker';
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.45, 8), iron);
  post.position.y = 0.72;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.48, 0.08), stone);
  plate.position.set(0, 1.28, 0);
  trailMarker.add(post, plate);
  trailMarker.position.copy(boardwalkPoints[0]);
  group.add(trailMarker);
  const trailLamp = new THREE.PointLight(0xffc37a, 15, 10, 1.8);
  trailLamp.position.copy(boardwalkPoints[0]).add(new THREE.Vector3(0, 2.0, 0));
  group.add(trailLamp);
  const trailApron = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 2.5), weatheredWood);
  trailApron.position.copy(boardwalkPoints[0]).add(new THREE.Vector3(0, -0.42, 0));
  trailApron.rotation.y = THREE.MathUtils.degToRad(-43);
  trailApron.receiveShadow = true;
  group.add(trailApron);

  scene.add(group);
  return {
    group,
    stairGreybox,
    points,
    trailMarker,
    trailOutline: makeObjectHighlight(trailMarker),
    bench,
    benchOutline: makeDynamicObjectHighlight(bench),
    summitReturnMarker,
    summitReturnOutline: makeObjectHighlight(topConnector),
    topConnector,
    platformEntrance,
    summit,
    platformModel,
  };
}

function makeCampfireKettle(scene) {
  const group = new THREE.Group();
  group.name = 'chapter3-campfire-shared-kettle';
  const iron = new THREE.MeshStandardMaterial({ color: 0x272421, roughness: 0.8, metalness: 0.46 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), iron);
  body.scale.y = 0.72;
  body.position.y = 0.24;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.06, 12), iron);
  lid.position.y = 0.43;
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.025, 6, 16, Math.PI),
    iron,
  );
  handle.position.y = 0.37;
  handle.rotation.x = Math.PI / 2;
  group.add(body, lid, handle);
  group.position.set(-51.75, 0.58, 34.45);
  scene.add(group);
  return group;
}

function makeLampOilStall(scene) {
  const group = new THREE.Group();
  group.name = 'opening-eda-lamp-oil-stall';
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3022, roughness: 0.88 });
  const paintedWood = new THREE.MeshStandardMaterial({ color: 0x233e49, roughness: 0.82 });
  const canvas = new THREE.MeshStandardMaterial({ color: 0x315f70, roughness: 0.94, side: THREE.DoubleSide });
  const brass = new THREE.MeshStandardMaterial({ color: 0x8b6537, roughness: 0.46, metalness: 0.48 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x8fa09a, roughness: 0.3, metalness: 0.12 });
  const addBox = (size, position, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  addBox([3.6, 0.12, 2.25], [0, 2.5, 0], canvas);
  addBox([3.15, 0.22, 0.82], [0, 0.92, 0.72], wood);
  addBox([3.2, 0.12, 0.44], [0, 1.66, -0.72], paintedWood);
  for (const x of [-1.55, 1.55]) {
    for (const z of [-0.82, 0.82]) addBox([0.1, 2.5, 0.1], [x, 1.25, z], paintedWood);
  }
  for (const [x, y, z] of [[-1.08, 1.18, 0.6], [-0.45, 1.2, 0.6], [0.55, 1.19, 0.6]]) {
    const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.48, 12), brass);
    canister.position.set(x, y, z);
    canister.castShadow = true;
    group.add(canister);
  }
  for (const x of [-0.9, -0.3, 0.3, 0.9]) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.36, 10), glass);
    bottle.position.set(x, 1.9, -0.7);
    group.add(bottle);
  }
  const sign = addBox([1.9, 0.6, 0.1], [0, 2.05, 0.86], paintedWood);
  sign.rotation.x = -0.08;
  const lampMark = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 18),
    new THREE.MeshBasicMaterial({ color: 0xe1b55f, side: THREE.DoubleSide }),
  );
  lampMark.position.set(0, 2.05, 0.92);
  group.add(lampMark);
  group.position.copy(positionFrom(OPENING_POSITIONS.lampOilStall));
  group.rotation.y = -0.08;
  scene.add(group);
  return group;
}

function arrivalCallback(approach) {
  if (approach === 'direct') {
    return { speaker: 'LEV', text: 'The conductor did not recognize her. That narrows one carriage, not the station.' };
  }
  if (approach === 'observant') {
    return { speaker: 'LEV', text: 'You checked the platform before speaking. Good. Tell me if you saw anyone waiting for her.' };
  }
  return { speaker: 'LEV', text: 'I noticed the photograph because you kept it visible. That is why I approached you.' };
}

export class Chapter3OpeningRuntime {
  constructor({ preview, model, elements }) {
    this.preview = preview;
    this.model = model;
    this.elements = elements;
    this.dialogue = new Chapter3DialogueController(elements.dialogue);
    this.timeVisual = new Chapter3TimeVisualController(preview);
    this.flipClock = new Chapter3FlipClock(elements.flipClockElement);
    this.evidenceViewer = new Chapter3EvidenceViewer(elements.evidenceViewer);
    this.initialized = false;
    this.hoveredId = null;
    this.tabHeld = false;
    this.pointerClient = { x: 0, y: 0 };
    this.interactions = [];
    this.departureElapsed = null;
    this.departureBases = [];
    this.guideElapsed = null;
    this.guideStart = null;
    this.levWalkElapsed = null;
    this.levWalkDuration = 0;
    this.levWalkStart = null;
    this.levWalkTarget = null;
    this.levWalkOnComplete = null;
    this.insideMinistry = false;
    this.ministryTransitioning = false;
    this.ministryExteriorVisibility = [];
    this.insideArchive = false;
    this.archiveTransitioning = false;
    this.archiveExteriorVisibility = [];
    this.insideHotel = false;
    this.hotelArea = null;
    this.hotelTransitioning = false;
    this.hotelExteriorVisibility = [];
    this.hotelDoorElapsed = null;
    this.hotelDoorDuration = 0;
    this.hotelDoorOnComplete = null;
    this.hotelDoorClosing = false;
    this.levHotelExitElapsed = null;
    this.levHotelExitStart = null;
    this.groundFireElapsed = 0;
    this.nightIgnitionElapsed = null;
    this.nightIgnitionProgress = 0;
    this.nightFireZoomBefore = null;
    this.endingElapsed = null;
    this.endingDepartureBases = null;
    this.savaBoundarySeen = false;
    this.levTopics = new Set();
    this.seamTestingAsked = false;
    this.vendorSpoken = new Set();
    this.campfireSpoken = new Set();
    this.lastObjectivePeriod = null;
    this.morningLevGreetingShown = false;
    this.morningLevFollowing = false;
    this.morningLevFollowTime = 0;
    this.morningLevTrail = [];
    this.morningLevLastDirection = new THREE.Vector3(1, 0, 0);
    this.morningFireInterruptionShown = false;
    this.taskBubbleElapsed = null;
    this.ambientElapsed = 0;
    this.overlookTravelElapsed = null;
    this.overlookTravelMode = null;
    this.overlookTravelDuration = 0;
    this.sunriseElapsed = null;
    this.sunriseTableauHoldElapsed = null;
    this.sunriseDialogueShown = false;
    this.sunriseCameraStartZoom = null;
    this.characters = new Chapter3AnimatedCharacterSystem({
      groundHeightAt: (x, z) => this.preview.surfaceHeightAt(x, z),
    });
    this.replacements = new Chapter3ReplacementAssetSystem();
    this.characterQa = new URLSearchParams(window.location.search).get('playtest') === 'chapter3-characters';
    this.alleyQa = new URLSearchParams(window.location.search).get('playtest') === 'chapter3-alley';
    this.characterQaAction = 'idle';
    this.characterQaElapsed = 0;
    this.characterQaActors = [];
    this.characterQaOverlay = null;
    this.trainDirection = new THREE.Vector3(
      RAIL_LAYOUT.end[0] - RAIL_LAYOUT.start[0],
      0,
      RAIL_LAYOUT.end[1] - RAIL_LAYOUT.start[1],
    ).normalize();
  }

  async loadAnimatedCharacters() {
    const attachments = [
      { id: 'butch', assetId: 'butch', host: this.preview.player },
      { id: 'lev', assetId: 'lev', host: this.lev },
      { id: 'eda', assetId: 'femaleMarket', host: this.eda },
      { id: 'olek', assetId: 'maleLabor', host: this.olek },
      { id: 'toma', assetId: 'maleMunicipal', host: this.toma },
      { id: 'flower-vendor', assetId: 'femaleCivilian', host: this.flowerVendor },
      { id: 'morning-nika', assetId: 'femaleCivic', host: this.morningNika },
      // The same six NPC bases also replace the most direct named-role
      // capsules. Source GLBs are cached, so these do not repeat downloads.
      { id: 'sava', assetId: 'maleMunicipal', host: this.ministryHall.sava },
      { id: 'nika', assetId: 'femaleCivic', host: this.ministryHall.nika },
      { id: 'petar', assetId: 'maleLabor', host: this.archiveHall.petar },
      { id: 'mila', assetId: 'femaleCivic', host: this.archiveHall.mila },
      { id: 'hana', assetId: 'femaleCivilian', host: this.hotelHall.hana },
      { id: 'irena', assetId: 'femaleCivilian', host: this.hotelHall.irena },
      { id: 'produce-vendor', assetId: 'femaleMarket', host: this.produceVendor },
      { id: 'square-bosko', assetId: 'maleLabor', host: this.squareBosko },
      { id: 'archive-mila-exterior', assetId: 'femaleCivic', host: this.archiveMilaExterior },
      // These shared-rig bodies keep a safe animated fallback. The two visible
      // alley figures are replaced below by the actual posed Chapter 5 Echo
      // City Pavel / recovery-agent meshes.
      { id: 'alley-gangster-a', assetId: 'maleLabor', host: this.alleyGangsterA },
      { id: 'alley-gangster-b', assetId: 'maleMunicipal', host: this.alleyGangsterB },
      { id: 'alley-resident', assetId: 'femaleCivilian', host: this.alleyResident },
      { id: 'campfire-rada', assetId: 'femaleCivic', host: this.campfireRada },
      { id: 'campfire-miro', assetId: 'maleLabor', host: this.campfireMiro },
      { id: 'campfire-seline', assetId: 'femaleMarket', host: this.campfireSeline },
      { id: 'ministry-bosko', assetId: 'maleMunicipal', host: this.ministryHall.bosko },
      { id: 'archive-ana', assetId: 'femaleCivilian', host: this.archiveHall.ana },
      { id: 'hotel-vesna', assetId: 'femaleCivic', host: this.hotelHall.vesna },
      { id: 'hotel-daro', assetId: 'maleLabor', host: this.hotelHall.daro },
    ];
    if (this.preview.loadingLabel) this.preview.loadingLabel.textContent = 'RIGGING ECHO CITY CAST';
    if (this.preview.loadingCount) this.preview.loadingCount.textContent = `0 / ${attachments.length}`;
    let completed = 0;
    await Promise.all(attachments.map(async (spec) => {
      await this.characters.attach(spec);
      completed += 1;
      if (this.preview.loadingCount) this.preview.loadingCount.textContent = `${completed} / ${attachments.length}`;
    }));
    await this.loadImportedAlleyCharacters();
    // Visibility changes on the host group must never resurrect the capsule
    // children after a successful model install. Keep only the installed rig
    // (or the two deliberate imported alley meshes) visible for every role.
    for (const spec of attachments) {
      const installed = this.characters.get(spec.id);
      if (!installed?.loaded) continue;
      for (const child of spec.host.children) {
        const isInstalledVisual = child === installed.visual
          || child.userData?.characterAsset === spec.id;
        if (!isInstalledVisual) child.visible = false;
      }
    }
    const failed = this.characters.state().filter((entry) => !entry.loaded).length;
    if (this.preview.loadingLabel) this.preview.loadingLabel.textContent = failed ? 'CHARACTER FALLBACKS ACTIVE' : 'CHARACTERS READY';
  }

  async loadImportedAlleyCharacters() {
    const loader = new GLTFLoader();
    const imports = [
      {
        id: 'alley-gangster-a',
        host: this.alleyGangsterA,
        file: '/assets/chapter03-3d/characters/pavel_drunk_static.glb',
        name: 'pavel-drunk-imported-visual',
        height: 1.92,
      },
      {
        id: 'alley-gangster-b',
        host: this.alleyGangsterB,
        file: '/assets/chapter03-3d/characters/recovery_gangster_static.glb',
        name: 'recovery-gangster-imported-visual',
        height: 1.98,
      },
    ];

    await Promise.all(imports.map(async (spec) => {
      try {
        const gltf = await loader.loadAsync(spec.file);
        const root = gltf.scene;
        root.name = spec.name;
        root.userData.characterAsset = spec.id;
        root.updateMatrixWorld(true);
        const initialBounds = new THREE.Box3().setFromObject(root);
        const initialHeight = initialBounds.getSize(new THREE.Vector3()).y;
        if (!Number.isFinite(initialHeight) || initialHeight <= 0.01) throw new Error('Imported alley character has invalid bounds');
        root.scale.setScalar(spec.height / initialHeight);
        root.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(root);
        const center = bounds.getCenter(new THREE.Vector3());
        const hostWorld = spec.host.getWorldPosition(new THREE.Vector3());
        const ground = this.preview.surfaceHeightAt(hostWorld.x, hostWorld.z);
        root.position.set(
          -center.x,
          -bounds.min.y + (Number.isFinite(ground) ? ground - hostWorld.y : -0.49),
          -center.z,
        );
        root.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
        });
        spec.host.add(root);
        const sharedFallback = this.characters.get(spec.id)?.visual;
        if (sharedFallback) sharedFallback.visible = false;
      } catch (error) {
        console.warn(`Imported Echo City alley character ${spec.id} unavailable; keeping shared-rig fallback`, error);
      }
    }));
  }

  async loadReplacementAssets() {
    const worldAnchor = (name, position, rotationY = 0) => {
      const anchor = new THREE.Group();
      anchor.name = name;
      anchor.position.fromArray(position);
      anchor.rotation.y = rotationY;
      this.preview.scene.add(anchor);
      return anchor;
    };
    this.replacementAnchors = {
      flower: worldAnchor('chapter3-flower-stall-replacement-anchor', [-21.4, 0.55, -5.2], 0.18),
      alley: worldAnchor('chapter3-service-alley-replacement-anchor', [-27.6, 0.64, -7.6], -0.35),
    };

    const ministryFallback = this.ministryHall.group.children.filter(
      (child) => child.isMesh
        && child !== this.ministryHall.discardedPrint,
    );
    const archiveFallback = this.archiveHall.group.children.filter(
      (child) => child.isMesh && child.name !== 'archive-floor',
    );
    const nikaPrinter = this.ministryHall.group.getObjectByName('nika-printer');
    const ministryFloor = this.ministryHall.group.getObjectByName('ministry-floor');
    const archiveFloor = this.archiveHall.group.getObjectByName('archive-floor');
    if (ministryFloor?.material?.color) ministryFloor.material.color.setHex(0x4e514b);
    if (archiveFloor?.material?.color) archiveFloor.material.color.setHex(0x4b4840);

    const jobs = [
      { id: 'env-eda-oil-stall', host: this.lampOilStall, hide: [...this.lampOilStall.children] },
      { id: 'env-flower-stall', host: this.replacementAnchors.flower },
      { id: 'env-service-alley-kit', host: this.replacementAnchors.alley },
      { id: 'env-campfire-props', host: this.campfireKettle, position: [0, 0, 0], hide: [...this.campfireKettle.children] },
      { id: 'prop-oil-container-set', host: this.lampOilStall, position: [2.25, 0, 0.15], rotationY: -0.2 },
      { id: 'prop-solvent-bottle', host: this.bottle, hide: [...this.bottle.children] },
      { id: 'prop-cut-connector-set', host: this.cutInterface.group, hide: [...this.cutInterface.group.children] },
      // Fit the generated shell to the authored 13 x 11 metre hall without
      // scaling its ceiling to nine metres. The furniture and every character
      // share the shell's 0.32 m finished-floor datum.
      { id: 'env-ministry-shell', host: this.ministryHall.group, position: [0, 0, 0.2], scale: [2.0, 1.0, 2.1], hide: ministryFallback },
      // Preserve the authored furniture proportions. The source set is too
      // large for a human-scale public hall, so reduce all three axes together
      // and then place the intact set against the rear service wall.
      { id: 'env-ministry-furniture', host: this.ministryHall.group, position: [0, 0.32, -1.35], scale: 0.64 },
      { id: 'prop-terminal-printer', host: this.ministryHall.group, position: [3.55, 1.22, -4.35], rotationY: -0.08, scale: 0.74, hide: [nikaPrinter] },
      { id: 'env-archive-shell', host: this.archiveHall.group, position: [0, 0, -1.1], scale: 1.5, hide: archiveFallback },
      { id: 'env-archive-furniture', host: this.archiveHall.group, position: [0, 0, 0.2] },
      { id: 'prop-petar-toolbox', host: this.archiveHall.toolBox, hide: [...this.archiveHall.toolBox.children] },
      { id: 'env-hotel-lobby-shell', host: this.hotelHall.lobbyGroup, position: [0, 0, -0.2], scale: 2.1 },
      { id: 'env-hotel-lobby-furniture', host: this.hotelHall.lobbyGroup, position: [0, 0, 0.25], scale: 1.4 },
      { id: 'prop-hotel-register-key', host: this.hotelHall.lobbyGroup, position: [0.55, 1.23, -0.52], rotationY: -0.12, hide: [this.hotelHall.register] },
      { id: 'env-hotel-corridor-shell', host: this.hotelHall.corridorGroup, position: [2.35, 0, 0] },
      { id: 'env-butch-room-shell', host: this.hotelHall.roomGroup, position: [0, 0, -10.75], scale: 1.7 },
      { id: 'env-butch-room-furniture', host: this.hotelHall.roomGroup, position: [0, 0, -10.75] },
      { id: 'env-doorless-carriage', host: this.finalDoor.shell, position: [0, 0, 0], hide: [...this.finalDoor.shell.children] },
      { id: 'env-single-train-door', host: this.finalDoor.door, position: [0, 0, 0], hide: [this.finalDoor.doorFallback] },
    ];
    if (this.preview.loadingLabel) this.preview.loadingLabel.textContent = 'FITTING ECHO CITY SETS';
    let completed = 0;
    await Promise.all(jobs.map(async (job) => {
      await this.replacements.attach(job);
      completed += 1;
      if (this.preview.loadingCount) this.preview.loadingCount.textContent = `${completed} / ${jobs.length}`;
    }));
    const failed = this.replacements.state().filter((entry) => !entry.loaded).length;
    if (this.preview.loadingLabel) this.preview.loadingLabel.textContent = failed ? 'SET FALLBACKS ACTIVE' : 'ECHO CITY SETS READY';
  }

  makeCharacterQaLabel(host, text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(20, 28, 28, 0.86)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#b58a55';
    context.lineWidth = 8;
    context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    context.fillStyle = '#f0e4ca';
    context.font = '700 42px Georgia, serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    label.position.set(0, 2.55, 0);
    label.scale.set(2.35, 0.52, 1);
    label.renderOrder = 50;
    host.add(label);
  }

  stageCharacterQa() {
    const lineup = [
      ['butch', 'BUTCH', this.preview.player],
      ['lev', 'LEV', this.lev],
      ['eda', 'FEMALE MARKET', this.eda],
      ['olek', 'MALE LABOR', this.olek],
      ['toma', 'MALE MUNICIPAL', this.toma],
      ['flower-vendor', 'FEMALE CIVILIAN', this.flowerVendor],
      ['morning-nika', 'FEMALE CIVIC', this.morningNika],
    ];
    const xPositions = [-7.5, -5, -2.5, 0, 2.5, 5, 7.5];
    this.characterQaActors = lineup.map(([id, label, host], index) => {
      const base = new THREE.Vector3(xPositions[index], 0.5, 7.6);
      host.visible = true;
      host.position.copy(base);
      host.rotation.y = Math.PI;
      this.makeCharacterQaLabel(host, label);
      return { id, host, base, index };
    });
    for (const actor of [
      this.produceVendor, this.squareBosko, this.archiveMilaExterior,
      this.alleyGangsterA, this.alleyGangsterB, this.alleyResident,
      this.campfireRada, this.campfireMiro, this.campfireSeline,
    ]) actor.visible = false;
    this.interactions = [];
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(new THREE.Vector3(0, 0.5, 7.6));
    this.preview.resetCamera();
    this.createCharacterQaOverlay();
    this.setCharacterQaAction('idle');
  }

  createCharacterQaOverlay() {
    document.getElementById('chapter3-character-qa')?.remove();
    const overlay = document.createElement('section');
    overlay.id = 'chapter3-character-qa';
    overlay.innerHTML = `
      <strong>SHARED RIG TEST</strong>
      <span>Seven Chapter 3 runtime models · click an action</span>
      <div>${[
        'idle', 'talk', 'walk', 'formalWalk', 'jog', 'crouch', 'sit',
        'sitTalk', 'investigate', 'repair', 'pickUp', 'push', 'dance',
      ].map((action) => `<button type="button" data-action="${action}">${action.replace(/([A-Z])/g, ' $1').toUpperCase()}</button>`).join('')}</div>
    `;
    Object.assign(overlay.style, {
      position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: '500',
      display: 'grid', gap: '7px', minWidth: '620px', padding: '14px 18px', color: '#eee1c7',
      background: 'rgba(18, 24, 24, 0.94)', border: '1px solid #9d7246', boxShadow: '0 10px 34px rgba(0,0,0,.38)',
      fontFamily: 'Georgia, serif', textAlign: 'center', letterSpacing: '0.05em',
    });
    const buttonRow = overlay.querySelector('div');
    Object.assign(buttonRow.style, { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' });
    for (const button of overlay.querySelectorAll('button')) {
      Object.assign(button.style, {
        padding: '8px 12px', color: '#eee1c7', background: '#293638', border: '1px solid #63827d',
        cursor: 'pointer', font: '700 12px American Typewriter, monospace', letterSpacing: '0.06em',
      });
      button.addEventListener('click', () => this.setCharacterQaAction(button.dataset.action));
    }
    document.body.append(overlay);
    this.characterQaOverlay = overlay;
  }

  setCharacterQaAction(action) {
    this.characterQaAction = action;
    this.characterQaElapsed = 0;
    for (const { id } of this.characterQaActors) this.characters.play(id, action);
    for (const button of this.characterQaOverlay?.querySelectorAll('button') || []) {
      button.style.background = button.dataset.action === action ? '#7b4c2d' : '#293638';
    }
    if (this.initialized) this.updateObjective();
  }

  updateCharacterQa(dt) {
    this.characterQaElapsed += dt;
    const locomotionScale = {
      walk: 1.15,
      formalWalk: 0.92,
      jog: 2.35,
    }[this.characterQaAction];
    for (const entry of this.characterQaActors) {
      if (!locomotionScale) {
        entry.host.position.copy(entry.base);
        entry.host.rotation.y = Math.PI;
        continue;
      }
      const phase = this.characterQaElapsed * locomotionScale + entry.index * 0.22;
      const offset = Math.sin(phase) * 0.72;
      entry.host.position.copy(entry.base);
      entry.host.position.x += offset;
      entry.host.rotation.y = Math.cos(phase) >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    }
  }

  updateCharacterAnimations(dt) {
    const state = this.model.snapshot();
    const onElevatedOverlook = this.overlookTravelElapsed !== null
      || (state.sunriseViewed && !state.sunriseReturned);
    this.characters.update(dt, {
      groundingEnabled: !this.insideMinistry
        && !this.insideArchive
        && !this.insideHotel
        && !onElevatedOverlook,
    });
    if (this.characterQa) {
      this.updateCharacterQa(dt);
      return;
    }
    const butchMoving = this.preview.path.length > 0 || this.overlookTravelElapsed !== null;
    const levMoving = this.guideElapsed !== null || this.levWalkElapsed !== null
      || this.levHotelExitElapsed !== null || this.morningLevFollowing || this.overlookTravelElapsed !== null;
    this.characters.play('butch', state.sunriseViewed && !state.sunriseReturned ? 'sit' : butchMoving ? 'walk' : 'idle');
    this.characters.play('lev', state.sunriseViewed && !state.sunriseReturned ? 'sit' : levMoving ? 'walk' : 'idle');
    this.characters.play('toma', 'idle');
  }

  async initialize() {
    document.body.classList.add('gameplay-active');
    this.elements.sunriseTableau?.querySelector('#sunrise-tableau-continue')?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.leaveSunriseTableau();
    });
    this.preview.setLightingMode?.('clear-afternoon');
    this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.playerStart));
    this.preview.stopWalking();
    this.preview.resetCamera();

    this.lev = makeActor(this.preview.scene, {
      name: 'opening-lev-placeholder',
      color: 0x4f5a50,
      position: OPENING_POSITIONS.levStart,
      scale: 0.96,
    });
    this.eda = makeActor(this.preview.scene, {
      name: 'opening-eda-placeholder',
      color: 0x82664d,
      position: OPENING_POSITIONS.eda,
      scale: 0.94,
    });
    this.olek = makeActor(this.preview.scene, {
      name: 'opening-olek-placeholder',
      color: 0x55636a,
      position: OPENING_POSITIONS.olek,
      scale: 1.02,
    });
    this.toma = makeActor(this.preview.scene, {
      name: 'opening-toma-placeholder',
      color: 0x6a5b47,
      position: OPENING_POSITIONS.toma,
      scale: 0.98,
    });
    this.produceVendor = makeActor(this.preview.scene, {
      name: 'opening-produce-vendor-placeholder',
      color: 0x6c4938,
      position: OPENING_POSITIONS.produceVendor,
      scale: 1.02,
    });
    this.flowerVendor = makeActor(this.preview.scene, {
      name: 'opening-flower-vendor-placeholder',
      color: 0x6c536d,
      position: OPENING_POSITIONS.flowerVendor,
      scale: 0.92,
    });
    this.squareBosko = makeActor(this.preview.scene, {
      name: 'opening-square-bosko-placeholder',
      color: 0x6d6159,
      position: OPENING_POSITIONS.squareBosko,
      scale: 1.02,
    });
    this.squareBosko.visible = false;
    this.morningNika = makeActor(this.preview.scene, {
      name: 'morning-nika-document-clerk', color: 0x596d78, position: [40.5, 0.5, -6.5], scale: 0.94,
    });
    this.morningNika.visible = false;
    this.alleyGangsterA = makeActor(this.preview.scene, {
      name: 'alley-man-brown-coat', color: 0x4f382c, position: [-28.2, 0.5, -5.8], scale: 1.02,
    });
    this.alleyGangsterB = makeActor(this.preview.scene, {
      name: 'alley-second-man', color: 0x303943, position: [-26.7, 0.5, -7.1], scale: 0.98,
    });
    this.alleyResident = makeActor(this.preview.scene, {
      name: 'alley-heat-grate-resident', color: 0x675447, position: [29.4, 0.5, -18.0], scale: 0.9,
    });
    this.campfireRada = makeActor(this.preview.scene, {
      name: 'campfire-rada-postal-sorter', color: 0x7f493b, position: [-50.35, 0.5, 33.0], scale: 0.96,
    });
    this.campfireMiro = makeActor(this.preview.scene, {
      name: 'campfire-miro-tram-mechanic', color: 0x3f5660, position: [-54.75, 0.5, 32.8], scale: 1.02,
    });
    this.campfireSeline = makeActor(this.preview.scene, {
      name: 'campfire-seline-laundry-worker', color: 0x6f5874, position: [-54.15, 0.5, 35.8], scale: 0.93,
    });
    this.levOutline = makeDynamicObjectHighlight(this.lev);
    this.edaOutline = makeDynamicObjectHighlight(this.eda);
    this.olekOutline = makeDynamicObjectHighlight(this.olek);
    this.tomaOutline = makeDynamicObjectHighlight(this.toma);
    this.produceVendorOutline = makeDynamicObjectHighlight(this.produceVendor);
    this.flowerVendorOutline = makeDynamicObjectHighlight(this.flowerVendor);
    this.squareBoskoOutline = makeObjectHighlight(this.squareBosko);
    this.morningNikaOutline = makeDynamicObjectHighlight(this.morningNika);
    this.alleyResidentOutline = makeObjectHighlight(this.alleyResident);
    this.alleyGangsterAOutline = makeObjectHighlight(this.alleyGangsterA);
    this.alleyGangsterBOutline = makeObjectHighlight(this.alleyGangsterB);
    this.campfireRadaOutline = makeObjectHighlight(this.campfireRada);
    this.campfireMiroOutline = makeObjectHighlight(this.campfireMiro);
    this.campfireSelineOutline = makeObjectHighlight(this.campfireSeline);
    this.campfireKettle = makeCampfireKettle(this.preview.scene);
    this.campfireKettleOutline = makeObjectHighlight(this.campfireKettle);
    this.lampOilStall = makeLampOilStall(this.preview.scene);
    this.seam = makeDarkSeam(
      this.preview.scene,
      (x, z) => this.preview.surfaceHeightAt(x, z),
    );
    this.bottle = makeBottle(this.preview.scene);
    this.bottleOutline = makeObjectHighlight(this.bottle);
    this.plazaGrooves = makePlazaGrooves(this.preview.scene);
    this.cutInterface = makeCutInterface(this.preview.scene);
    this.cartObject = this.preview.scene.getObjectByName('porter-handcart');
    this.cartOutline = makeObjectHighlight(this.cartObject);
    this.ministryHall = createChapter3MinistryHall(this.preview.scene);
    this.archiveHall = createChapter3ArchiveHall(this.preview.scene);
    this.hotelHall = createChapter3HotelHall(this.preview.scene);
    this.groundMessage = makeGroundMessage(
      this.preview.scene,
      (x, z) => this.preview.surfaceHeightAt(x, z),
    );
    this.finalDoor = makeFinalTrainDoor(this.preview.scene);
    this.sunriseOverlook = makeSunriseOverlook(
      this.preview.scene,
      this.preview.scene.getObjectByName('fountain-bench'),
    );
    this.tunnelCutawayMaterials = [];
    const tunnelTerrain = this.preview.scene.getObjectByName('tram-tunnel-rock-cutting');
    tunnelTerrain?.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
      const clonedMaterials = sourceMaterials.map((material) => {
        const clone = material.clone();
        this.tunnelCutawayMaterials.push({
          material: clone,
          opacity: clone.opacity ?? 1,
          transparent: clone.transparent,
          depthWrite: clone.depthWrite,
        });
        return clone;
      });
      child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0];
    });
    // This perimeter facade intersects the tunnel rock from the authored isometric camera.
    // Keep the locked city layout intact and suppress only the visible penetration at runtime.
    this.tunnelOverlapBuilding = this.preview.scene.getObjectByName('west-printworks-mid');
    if (this.tunnelOverlapBuilding) this.tunnelOverlapBuilding.visible = false;
    this.hotelEntrance = new THREE.Group();
    this.hotelEntrance.name = 'copper-heron-entrance-marker';
    const hotelSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.05, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x54372a, roughness: 0.82 }),
    );
    hotelSign.position.y = 1.5;
    this.hotelEntrance.add(hotelSign);
    this.hotelEntrance.position.set(53.72, 0, -13.58);
    this.preview.scene.add(this.hotelEntrance);
    this.archiveMilaExterior = makeActor(this.preview.scene, {
      name: 'opening-archive-mila-placeholder',
      color: 0x665348,
      position: OPENING_POSITIONS.archiveEntrance,
      scale: 0.94,
    });
    this.archiveMilaExterior.visible = false;
    await this.loadReplacementAssets();
    await this.loadAnimatedCharacters();
    this.bottleOutline = makeDynamicObjectHighlight(
      this.replacements.model('prop-solvent-bottle') || this.bottle,
    );
    this.cutInterface.highlight = makeDynamicObjectHighlight(
      this.replacements.model('prop-cut-connector-set') || this.cutInterface.group,
    );
    this.queueOutline = makeObjectHighlight(this.ministryHall.queueDispenser);
    this.savaOutline = makeDynamicObjectHighlight(this.ministryHall.sava);
    this.nikaOutline = makeDynamicObjectHighlight(this.ministryHall.nika);
    this.boskoQueueOutline = makeObjectHighlight(this.ministryHall.bosko);
    this.discardedPrintOutline = makeObjectHighlight(this.ministryHall.discardedPrint);
    this.archiveMilaOutline = makeObjectHighlight(this.archiveMilaExterior);
    this.archiveAnaOutline = makeObjectHighlight(this.archiveHall.ana);
    this.archiveMapOutline = makeObjectHighlight(this.archiveHall.mapTable);
    this.archiveOrderOutline = makeObjectHighlight(this.archiveHall.workOrderDesk);
    this.archivePetarOutline = makeDynamicObjectHighlight(this.archiveHall.petar);
    this.archiveTimelineOutline = makeObjectHighlight(this.archiveHall.timeline);
    this.hotelEntranceOutline = makeObjectHighlight(this.hotelEntrance);
    this.hotelRegisterOutline = makeDynamicObjectHighlight(
      this.replacements.model('prop-hotel-register-key') || this.hotelHall.register,
    );
    this.hotelIrenaOutline = makeObjectHighlight(this.hotelHall.irena);
    this.hotelVesnaOutline = makeObjectHighlight(this.hotelHall.vesna);
    this.hotelDaroOutline = makeObjectHighlight(this.hotelHall.daro);
    this.hotelEvidenceOutline = makeObjectHighlight(this.hotelHall.evidenceTable);
    this.hotelEvidencePaperOutlines = this.hotelHall.evidencePaperSpecs.map(({ paper }) => makeObjectHighlight(paper));
    this.hotelBedOutline = makeObjectHighlight(this.hotelHall.bed);
    this.hotelCorridorEntranceOutline = makeObjectHighlight(this.hotelHall.corridorEntrance);
    this.hotelButchRoomDoorOutline = makeObjectHighlight(this.hotelHall.butchRoomDoor);
    this.hotelCorridorStairOutline = makeObjectHighlight(this.hotelHall.corridorStairExit);
    this.hotelRoomExitOutline = makeObjectHighlight(this.hotelHall.roomExit);
    this.hotelLobbyExitOutline = makeObjectHighlight(this.hotelHall.lobbyExit);
    this.finalDoorOutline = makeObjectHighlight(this.finalDoor.group);
    this.finalTrainObject = this.preview.scene.getObjectByName('municipal-tram');
    this.finalTrainOutline = makeObjectHighlight(this.finalTrainObject || this.finalDoor.group);
    this.finalLevOutline = this.levOutline;

    document.getElementById('chapter3-end-card')?.remove();
    this.chapterEndCard = document.createElement('section');
    this.chapterEndCard.id = 'chapter3-end-card';
    this.chapterEndCard.innerHTML = '<div>CHAPTER 03 COMPLETE</div><h1>EASTBOUND</h1><p>Mara was alive. She left by choice. Her reason remains ahead.</p>';
    Object.assign(this.chapterEndCard.style, {
      position: 'fixed', inset: '0', zIndex: '1000', display: 'grid', placeContent: 'center', gap: '10px',
      textAlign: 'center', color: '#eadcc1', background: '#050606', opacity: '0', pointerEvents: 'none',
      transition: 'opacity 1.2s ease', fontFamily: 'Georgia, serif', letterSpacing: '0.08em',
    });
    Object.assign(this.chapterEndCard.querySelector('h1').style, { margin: '0', fontSize: 'clamp(42px, 7vw, 92px)' });
    Object.assign(this.chapterEndCard.querySelector('p').style, { margin: '12px 24px 0', fontSize: '18px', letterSpacing: '0.02em' });
    document.body.append(this.chapterEndCard);

    this.interactions = [
      {
        id: 'lamp-oil-seam',
        label: 'Dark oil between the paving stones',
        position: positionFrom(OPENING_POSITIONS.seam),
        approach: OPENING_POSITIONS.seamApproach,
        outline: this.seam.outline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.explorationBriefingComplete && !state.seamInspected;
        },
        activate: () => this.openSeam(),
      },
      {
        id: 'eda',
        label: 'Eda, lamp-oil seller',
        position: this.eda.position,
        approach: OPENING_POSITIONS.edaApproach,
        outline: this.edaOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.seamInspected && !state.edaComplete;
        },
        beginApproach: () => this.beginEdaApproach(),
        activate: () => this.openEda(),
      },
      {
        id: 'produce-vendor',
        label: 'Produce vendor',
        position: this.produceVendor.position,
        approach: [-17.3, 0.5, 5.1],
        outline: this.produceVendorOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.seamInspected && !state.edaComplete && !this.vendorSpoken.has('produce');
        },
        activate: () => this.openVendor('produce', PRODUCE_VENDOR_DIALOGUE),
      },
      {
        id: 'flower-vendor',
        label: 'Flower vendor',
        position: this.flowerVendor.position,
        approach: [-17.3, 0.5, -5.0],
        outline: this.flowerVendorOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.seamInspected && !state.edaComplete && !this.vendorSpoken.has('flower');
        },
        activate: () => this.openVendor('flower', FLOWER_VENDOR_DIALOGUE),
      },
      {
        id: 'porter-handcart',
        label: 'Olek\'s stained handcart',
        position: positionFrom(OPENING_POSITIONS.cart),
        approach: OPENING_POSITIONS.cartApproach,
        outline: this.cartOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.edaComplete && !state.marketLeadComplete && !state.cartInspected;
        },
        activate: () => this.openCart(),
      },
      {
        id: 'olek',
        label: 'Olek, delivery porter',
        position: this.olek.position,
        approach: OPENING_POSITIONS.olekApproach,
        outline: this.olekOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.edaComplete && !state.marketLeadComplete;
        },
        activate: () => this.openOlek(),
      },
      {
        id: 'solvent-bottle',
        label: 'Discarded solvent bottle',
        position: this.bottle.position,
        approach: OPENING_POSITIONS.bottleApproach,
        outline: this.bottleOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.marketLeadComplete && !state.solventBottleObserved;
        },
        activate: () => this.openBottle(),
      },
      {
        id: 'transport-entrance',
        label: 'Toma at the Transport Ministry entrance',
        position: this.toma.position,
        approach: OPENING_POSITIONS.transportApproach,
        outline: this.tomaOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.marketLeadComplete && !state.transportEntranceReached;
        },
        activate: () => this.openTransportEntrance(),
      },
      {
        id: 'ministry-queue-dispenser',
        label: 'Public Services number dispenser',
        position: this.ministryHall.queueDispenser.position,
        approach: MINISTRY_POSITIONS.queueApproach,
        outline: this.queueOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideMinistry && state.transportHallEntered && !state.interaction07Complete;
        },
        activate: () => this.openQueueDispenser(),
      },
      {
        id: 'sava-counter',
        label: 'Sava, Public Services supervisor',
        position: this.ministryHall.sava.position,
        approach: MINISTRY_POSITIONS.savaApproach,
        outline: this.savaOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideMinistry && state.interaction07Complete && !state.savaComplete;
        },
        activate: () => this.openSava(),
      },
      {
        id: 'nika-terminal',
        label: 'Nika, records operator',
        position: this.ministryHall.nika.position,
        approach: MINISTRY_POSITIONS.nikaApproach,
        outline: this.nikaOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideMinistry && state.savaComplete && !state.nikaComplete;
        },
        activate: () => this.openNika(),
      },
      {
        id: 'bosko-queue',
        label: 'Bosko, waiting on the public bench',
        position: this.ministryHall.bosko.position,
        approach: MINISTRY_POSITIONS.boskoApproach,
        outline: this.boskoQueueOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideMinistry && state.savaComplete && !state.discardedPrintInspected && !state.boskoQueueAsked;
        },
        activate: () => this.openBoskoQueue(),
      },
      {
        id: 'discarded-maintenance-print',
        label: 'Torn printout beside Nika\'s waste bin',
        position: this.ministryHall.discardedPrint.position,
        approach: MINISTRY_POSITIONS.discardedPrintApproach,
        outline: this.discardedPrintOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideMinistry && state.nikaComplete && !state.discardedPrintInspected;
        },
        activate: () => this.openDiscardedPrint(),
      },
      {
        id: 'lev-first-theory',
        label: 'Lev, reviewing the recovered records',
        position: this.lev.position,
        approach: OPENING_POSITIONS.transportApproach,
        outline: this.levOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return !this.insideMinistry && state.discardedPrintInspected && !state.firstTheoryTested;
        },
        activate: () => this.openFirstTheory(),
      },
      {
        id: 'bosko-square',
        label: 'Bosko at the edge of the central square',
        position: this.squareBosko.position,
        approach: OPENING_POSITIONS.squareBoskoApproach,
        outline: this.squareBoskoOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return !this.insideMinistry && state.firstTheoryTested && !state.squareBoskoInterviewed;
        },
        activate: () => this.openSquareBosko(),
      },
      {
        id: 'plaza-announcement-grooves',
        label: 'Two rows of old announcement grooves',
        position: positionFrom(OPENING_POSITIONS.plazaGrooves),
        approach: OPENING_POSITIONS.plazaGroovesApproach,
        outline: this.plazaGrooves.highlight,
        eligible: () => {
          const state = this.model.snapshot();
          return !this.insideMinistry && state.squareBoskoInterviewed && !state.interaction14Complete;
        },
        activate: () => this.openPlazaGrooves(),
      },
      {
        id: 'archive-entrance',
        label: 'Mila at the Old Municipal Archive',
        position: this.archiveMilaExterior.position,
        approach: OPENING_POSITIONS.archiveApproach,
        outline: this.archiveMilaOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return !this.insideArchive && state.interaction14Complete && !state.archiveEntranceReached;
        },
        activate: () => this.openArchiveEntrance(),
      },
      {
        id: 'archive-ana',
        label: 'Ana and the old map legend',
        position: this.archiveHall.ana.position,
        approach: ARCHIVE_POSITIONS.anaApproach,
        outline: this.archiveAnaOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideArchive && !state.archiveMapInspected && !state.anaMapHelpAsked;
        },
        activate: () => this.openAnaMapHelp(),
      },
      {
        id: 'archive-map-table',
        label: 'Central Square feed plan',
        position: this.archiveHall.mapTable.position,
        approach: ARCHIVE_POSITIONS.mapApproach,
        outline: this.archiveMapOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideArchive && state.archiveEntered && !state.archiveMapInspected;
        },
        activate: () => this.openArchiveMap(),
      },
      {
        id: 'archive-maintenance-order',
        label: 'Maintenance order C-441',
        position: this.archiveHall.workOrderDesk.position,
        approach: ARCHIVE_POSITIONS.workOrderApproach,
        outline: this.archiveOrderOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideArchive && state.archiveMapInspected && !state.maintenanceOrderInspected;
        },
        activate: () => this.openMaintenanceOrder(),
      },
      {
        id: 'archive-petar',
        label: 'Petar, municipal maintenance worker',
        position: this.archiveHall.petar.position,
        approach: ARCHIVE_POSITIONS.petarApproach,
        outline: this.archivePetarOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideArchive && state.maintenanceOrderInspected && !state.petarInterviewComplete;
        },
        activate: () => this.openPetar(),
      },
      {
        id: 'archive-material-timeline',
        label: 'Records arranged by actual time',
        position: this.archiveHall.timeline.position,
        approach: ARCHIVE_POSITIONS.timelineApproach,
        outline: this.archiveTimelineOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideArchive && state.petarInterviewComplete && !state.materialTimelineInspected;
        },
        activate: () => this.openMaterialTimeline(),
      },
      {
        id: 'lev-second-theory',
        label: 'Lev, testing the complete timeline',
        position: this.lev.position,
        approach: OPENING_POSITIONS.archiveApproach,
        outline: this.levOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return !this.insideArchive && state.materialTimelineInspected && !state.secondTheoryComplete;
        },
        activate: () => this.openSecondTheory(),
      },
      {
        id: 'cut-feed-interface',
        label: 'Cut lower-feed interface',
        position: this.cutInterface.group.position,
        approach: OPENING_POSITIONS.cutInterfaceApproach,
        outline: this.cutInterface.highlight,
        eligible: () => {
          const state = this.model.snapshot();
          return !this.insideArchive && state.secondTheoryComplete && !state.interaction22Complete;
        },
        activate: () => this.openCutInterface(),
      },
      {
        id: 'copper-heron-entrance',
        label: 'Copper Heron hotel entrance',
        position: this.hotelEntrance.position,
        approach: [50.3, 0.5, -12.4],
        outline: this.hotelEntranceOutline,
        eligible: () => !this.insideHotel && this.model.snapshot().interaction22Complete && !this.model.snapshot().hotelEntered,
        activate: () => this.enterCopperHeron(),
      },
      {
        id: 'hotel-register-hana',
        label: 'Hana and the Copper Heron register',
        position: this.hotelHall.register.position,
        approach: HOTEL_POSITIONS.deskApproach,
        outline: this.hotelRegisterOutline,
        interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().hotelEntered && !this.model.snapshot().hotelCheckInComplete,
        activate: () => this.openHanaRegister(),
      },
      {
        id: 'hotel-guest-irena', label: 'Irena, long-term guest', position: this.hotelHall.irena.position,
        approach: HOTEL_POSITIONS.irenaApproach, outline: this.hotelIrenaOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().hotelCheckInComplete && !this.model.snapshot().daroComplete && !this.model.snapshot().hotelGuestsAsked.includes('irena'),
        activate: () => this.openHotelGuest('irena'),
      },
      {
        id: 'hotel-guest-vesna', label: 'Vesna, breakfast-room guest', position: this.hotelHall.vesna.position,
        approach: HOTEL_POSITIONS.vesnaApproach, outline: this.hotelVesnaOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().hotelCheckInComplete && !this.model.snapshot().daroComplete && !this.model.snapshot().hotelGuestsAsked.includes('vesna'),
        activate: () => this.openHotelGuest('vesna'),
      },
      {
        id: 'hotel-daro-window', label: 'Daro at the street window', position: this.hotelHall.daro.position,
        approach: HOTEL_POSITIONS.daroApproach, outline: this.hotelDaroOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().hotelCheckInComplete && !this.model.snapshot().daroComplete,
        activate: () => this.openDaro(),
      },
      {
        id: 'hotel-corridor-entrance', label: 'Go upstairs to the guest corridor', position: this.hotelHall.corridorEntrance.position,
        approach: HOTEL_POSITIONS.corridorEntranceApproach, outline: this.hotelCorridorEntranceOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().daroComplete && !this.model.snapshot().hotelCorridorEntered,
        activate: () => this.enterHotelCorridor(),
      },
      {
        id: 'hotel-private-room-door', label: 'Butch’s room', position: this.hotelHall.butchRoomDoor.position,
        approach: HOTEL_POSITIONS.butchRoomDoorApproach, outline: this.hotelButchRoomDoorOutline, interior: true,
        eligible: () => this.hotelArea === 'corridor' && this.model.snapshot().hotelCorridorEntered && !this.model.snapshot().hotelRoomEntered,
        activate: () => this.enterButchRoom(),
      },
      {
        id: 'hotel-evidence-table', label: 'Review the case with Lev', position: this.hotelHall.evidenceTable.position,
        approach: HOTEL_POSITIONS.evidenceApproach, outline: this.hotelEvidenceOutline, interior: true,
        eligible: () => this.hotelArea === 'room'
          && this.model.snapshot().hotelRoomEntered
          && !this.model.snapshot().evidenceTableComplete,
        activate: () => this.openFinalEvidenceTable(),
      },
      {
        id: 'hotel-bed', label: 'Try to sleep', position: this.hotelHall.bed.position,
        approach: HOTEL_POSITIONS.bedApproach, outline: this.hotelBedOutline, interior: true,
        eligible: () => this.hotelArea === 'room' && this.model.snapshot().evidenceTableComplete && !this.model.snapshot().slept,
        activate: () => this.openSleep(),
      },
      {
        id: 'hotel-night-room-door', label: 'Open the room door', position: this.hotelHall.roomExit.position,
        approach: HOTEL_POSITIONS.roomExitApproach, outline: this.hotelRoomExitOutline, interior: true,
        eligible: () => this.hotelArea === 'room'
          && this.model.snapshot().slept
          && !this.model.snapshot().morningStarted
          && !this.model.snapshot().nightRoomLeft,
        activate: () => this.leaveRoomAtNight(),
      },
      {
        id: 'hotel-night-corridor-stairs', label: 'Go downstairs to the dark lobby', position: this.hotelHall.corridorStairExit.position,
        approach: HOTEL_POSITIONS.corridorStairExitApproach, outline: this.hotelCorridorStairOutline, interior: true,
        eligible: () => this.hotelArea === 'corridor'
          && !this.model.snapshot().morningStarted
          && this.model.snapshot().nightRoomLeft
          && !this.model.snapshot().nightLobbyReached,
        activate: () => this.goDownstairsAtNight(),
      },
      {
        id: 'hotel-night-exit', label: 'Leave the Copper Heron', position: this.hotelHall.lobbyExit.position,
        approach: HOTEL_POSITIONS.lobbyExitApproach, outline: this.hotelLobbyExitOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby'
          && !this.model.snapshot().morningStarted
          && this.model.snapshot().nightLobbyReached
          && !this.model.snapshot().nightRouteStarted,
        activate: () => this.leaveHotelAtNight(),
      },
      {
        id: 'night-burning-message', label: 'Burning letters and the cut feed', position: this.groundMessage.position,
        approach: [FIRE_SITE.x, 0.5, FIRE_SITE.approachZ], outline: this.groundMessage.highlight,
        eligible: () => !this.insideHotel && this.model.snapshot().nightRouteStarted && !this.model.snapshot().nightMessageComplete,
        activate: () => this.openNightFire(),
      },
      {
        id: 'hotel-morning-room-door', label: 'Enter the guest corridor', position: this.hotelHall.roomExit.position,
        approach: HOTEL_POSITIONS.roomExitApproach, outline: this.hotelRoomExitOutline, interior: true,
        eligible: () => this.hotelArea === 'room' && this.model.snapshot().morningStarted && !this.model.snapshot().morningLobbyReached,
        activate: () => this.leaveRoomInMorning(),
      },
      {
        id: 'hotel-morning-corridor-stairs', label: 'Go downstairs to the lobby', position: this.hotelHall.corridorStairExit.position,
        approach: HOTEL_POSITIONS.corridorStairExitApproach, outline: this.hotelCorridorStairOutline, interior: true,
        eligible: () => this.hotelArea === 'corridor' && this.model.snapshot().morningRoomLeft && !this.model.snapshot().morningLobbyReached,
        activate: () => this.goDownstairsInMorning(),
      },
      {
        id: 'hana-breakfast', label: 'Hana at the breakfast table', position: this.hotelHall.hana.position,
        approach: HOTEL_POSITIONS.deskApproach, outline: this.hotelRegisterOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().morningLobbyReached && !this.model.snapshot().hanaBreakfastAsked,
        activate: () => this.openHanaBreakfast(),
      },
      {
        id: 'hotel-morning-exit', label: 'Return to the square', position: this.hotelHall.lobbyExit.position,
        approach: HOTEL_POSITIONS.lobbyExitApproach, outline: this.hotelLobbyExitOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().morningLobbyReached && !this.model.snapshot().morningEvidenceConfirmed,
        activate: () => this.leaveHotelInMorning(),
      },
      {
        id: 'morning-original-reservation', label: 'Nika with the original reservation', position: this.morningNika.position,
        approach: [41.8, 0.5, -8.0], outline: this.morningNikaOutline,
        eligible: () => !this.insideHotel && !this.insideMinistry
          && this.model.snapshot().morningLobbyReached
          && !this.model.snapshot().morningReservationCollected,
        activate: () => this.openMorningReservation(),
      },
      {
        id: 'sunrise-overlook-trail', label: 'Old timber inspection walk above the tunnel cutting', position: this.sunriseOverlook.trailMarker.position,
        approach: SUNRISE_ROUTE_POINTS[0], outline: this.sunriseOverlook.trailOutline,
        eligible: () => !this.insideHotel && this.model.snapshot().morningReservationCollected
          && !this.model.snapshot().sunriseClimbStarted,
        activate: () => this.beginSunriseClimb(),
      },
      {
        id: 'sunrise-overlook-bench', label: 'Sit and watch the sunrise', position: this.sunriseOverlook.bench.position,
        approach: () => [this.preview.player.position.x, this.preview.player.position.y, this.preview.player.position.z],
        outline: this.sunriseOverlook.benchOutline,
        screenRadius: 118,
        eligible: () => this.model.snapshot().sunriseClimbStarted && !this.model.snapshot().sunriseViewed
          && this.overlookTravelElapsed === null,
        activate: () => this.beginSunriseView(),
      },
      {
        id: 'sunrise-overlook-return', label: 'Take the timber walk back to the street', position: this.sunriseOverlook.summitReturnMarker.position,
        approach: () => [this.preview.player.position.x, this.preview.player.position.y, this.preview.player.position.z],
        outline: this.sunriseOverlook.summitReturnOutline,
        screenRadius: 132,
        eligible: () => this.model.snapshot().sunriseViewed && !this.model.snapshot().sunriseReturned
          && this.overlookTravelElapsed === null,
        activate: () => this.beginSunriseDescent(),
      },
      {
        id: 'morning-fire-evidence', label: 'Scorch marks, ash and reconnected feed', position: this.groundMessage.position,
        approach: [FIRE_SITE.x, 0.5, FIRE_SITE.approachZ], outline: this.groundMessage.highlight,
        eligible: () => !this.insideHotel && this.model.snapshot().morningFireEncountered && !this.model.snapshot().morningEvidenceConfirmed,
        activate: () => this.openMorningEvidence(),
      },
      {
        id: 'lev-morning-companion', label: 'Lev, accompanying Butch', position: this.lev.position,
        approach: () => this.morningLevApproach(), outline: this.finalLevOutline,
        eligible: () => !this.insideHotel
          && this.model.snapshot().morningStarted
          && (!this.model.snapshot().sunriseClimbStarted || this.model.snapshot().sunriseReturned)
          && !this.model.snapshot().morningEvidenceConfirmed,
        activate: () => this.openMorningLevReminder(),
      },
      {
        id: 'lev-final-reconstruction', label: 'Compare the fire with Lev’s reservation', position: this.lev.position,
        approach: () => this.morningLevApproach(), outline: this.finalLevOutline,
        eligible: () => !this.insideHotel && this.model.snapshot().morningEvidenceConfirmed
          && this.model.snapshot().sunriseReturned && !this.model.snapshot().levFinalComplete,
        activate: () => this.openLevFinal(),
      },
      {
        id: 'eastbound-train', label: 'Board the eastbound train', position: positionFrom(ENDING_SLICE_POSITIONS.trainDoor),
        approach: [-9.9, 0.5, 29.8], outline: this.finalTrainOutline,
        eligible: () => !this.insideHotel && this.model.snapshot().levFinalComplete && !this.model.snapshot().boardedTrain,
        activate: () => this.openContinuationAndBoard(),
      },
      {
        id: 'alley-men', label: 'Two men sorting hotel bottles', position: this.alleyGangsterA.position,
        approach: [-25.8, 0.5, -4.8], outline: this.alleyGangsterAOutline,
        eligible: () => !this.insideHotel && !this.insideMinistry && !this.insideArchive
          && !this.model.snapshot().boardedTrain && this.alleyGangsterA.visible,
        activate: () => this.openAmbientDialogue(ALLEY_MEN_DIALOGUE),
      },
      {
        id: 'alley-resident', label: 'Woman beside the heat grate', position: this.alleyResident.position,
        approach: [27.4, 0.5, -17.0], outline: this.alleyResidentOutline,
        eligible: () => !this.insideHotel && !this.insideMinistry && !this.insideArchive
          && !this.model.snapshot().boardedTrain && this.alleyResident.visible,
        activate: () => this.openAmbientDialogue(ALLEY_RESIDENT_DIALOGUE),
      },
      {
        id: 'campfire-rada', label: 'Rada, sharing tea by the fire', position: this.campfireRada.position,
        approach: [-49.5, 0.5, 34.4], outline: this.campfireRadaOutline,
        eligible: () => this.campfireGatheringVisible(),
        activate: () => this.openCampfireDialogue('rada', CAMPFIRE_RADA_DIALOGUE),
      },
      {
        id: 'campfire-miro', label: 'Miro, tram mechanic off duty', position: this.campfireMiro.position,
        approach: [-55.2, 0.5, 34.1], outline: this.campfireMiroOutline,
        eligible: () => this.campfireGatheringVisible(),
        activate: () => this.openCampfireDialogue('miro', CAMPFIRE_MIRO_DIALOGUE),
      },
      {
        id: 'campfire-seline', label: 'Seline, finishing her first paid week', position: this.campfireSeline.position,
        approach: [-53.0, 0.5, 37.0], outline: this.campfireSelineOutline,
        eligible: () => this.campfireGatheringVisible(),
        activate: () => this.openCampfireDialogue('seline', CAMPFIRE_SELINE_DIALOGUE),
      },
      {
        id: 'campfire-kettle', label: 'Soot-black kettle and shared cups', position: this.campfireKettle.position,
        approach: [-50.4, 0.5, 35.1], outline: this.campfireKettleOutline,
        eligible: () => !this.insideHotel && !this.insideMinistry && !this.insideArchive
          && !this.model.snapshot().boardedTrain && this.campfireKettle.visible,
        activate: () => this.openCampfireDialogue(
          this.campfireGatheringVisible() ? 'kettle' : 'dawn-remains',
          this.campfireGatheringVisible() ? CAMPFIRE_KETTLE_DIALOGUE : DAWN_CAMPFIRE_REMAINS_DIALOGUE,
        ),
      },
    ];

    const initial = this.model.snapshot();
    if (initial.marketLeadComplete && !initial.transportEntranceReached) {
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.transportApproach));
      this.lev.position.copy(positionFrom(OPENING_POSITIONS.levTransportExterior));
      this.preview.stopWalking();
      this.preview.resetCamera();
    }
    if (initial.firstTheoryTested) {
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.plazaGroovesApproach));
      this.lev.position.set(9.2, 0.5, 11.8);
      this.squareBosko.visible = true;
      this.preview.stopWalking();
      this.preview.resetCamera();
    }
    if (initial.interaction14Complete) this.archiveMilaExterior.visible = !initial.archiveEntranceReached;
    if (initial.interaction14Complete && !initial.archiveEntranceReached) {
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.archiveApproach));
      this.lev.position.copy(positionFrom(OPENING_POSITIONS.levArchiveExterior));
      this.preview.stopWalking();
      this.preview.resetCamera();
    }
    if (initial.materialTimelineInspected && !initial.secondTheoryComplete) {
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.archiveApproach));
      this.lev.position.copy(positionFrom(OPENING_POSITIONS.levArchiveExterior));
    }
    if (initial.secondTheoryComplete) {
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.cutInterfaceApproach));
      this.lev.position.set(3.1, 0.5, 15.8);
      this.cutInterface.group.visible = true;
      this.stageDuskLighting();
    }
    if (initial.lastEvent === 'dusk-campfire-qa-started') {
      this.preview.player.position.set(
        this.alleyQa ? -23.8 : -47.8,
        0.5,
        this.alleyQa ? -2.8 : 36.4,
      );
      this.lev.position.set(
        this.alleyQa ? -22.6 : -46.7,
        0.5,
        this.alleyQa ? -1.7 : 35.2,
      );
      this.preview.stopWalking();
      this.preview.resetCamera();
      if (this.alleyQa) {
        const alleyFocus = this.alleyGangsterA.position.clone()
          .lerp(this.alleyGangsterB.position, 0.5);
        this.preview.setCameraOverrideTarget(alleyFocus);
        this.preview.controls.maxZoom = 4.3;
        this.preview.camera.zoom = 4.1;
        this.preview.camera.updateProjectionMatrix();
        this.preview.controls.update();
      }
    }
    if (initial.interaction22Complete && !initial.hotelEntered) {
      this.preview.player.position.set(47.8, 0.5, -11.4);
      this.lev.position.set(46.5, 0.5, -10.4);
      this.preview.stopWalking();
      this.preview.resetCamera();
    }
    if (initial.mode === 'central-square-night') {
      this.preview.player.position.set(FIRE_SITE.x, 0.5, FIRE_SITE.approachZ);
      this.lev.visible = false;
      this.cutInterface.group.position.copy(this.groundMessage.interfacePosition);
      this.groundMessage.setFirstBurning(true);
      this.setNightDreamRendering(true);
      this.preview.stopWalking();
      this.preview.resetCamera();
      if (['night-exterior-qa-started', 'interaction-29-started'].includes(initial.lastEvent)) {
        this.preview.setCameraOverrideTarget(this.groundMessage.position);
        this.preview.camera.zoom = 3.2;
        this.preview.camera.updateProjectionMatrix();
      }
    }
    if (initial.slept && !initial.morningStarted) {
      this.groundMessage.setFirstBurning(true);
      this.groundMessage.setSecondBurning(false);
    }
    if (initial.mode === 'station-approach') {
      this.preview.player.position.set(49.8, 0.5, -12.2);
      this.lev.position.copy(positionFrom(MORNING_LEV_EXTERIOR_START));
      this.startMorningLevFollow();
      this.cutInterface.group.position.copy(this.groundMessage.interfacePosition);
      this.groundMessage.setFirstBurning(true);
      this.groundMessage.setSecondBurning(true);
      this.groundMessage.setBurnedOut();
    }
    if (initial.mode === 'morning-overlook-route') {
      // The focused sunrise slice now begins before the square so the player
      // naturally crosses the previous night's scorch marks en route.
      this.preview.player.position.set(31.8, 0.5, -5.4);
      this.lev.position.set(34.1, 0.5, -4.1);
      this.lev.visible = true;
      this.cutInterface.group.position.copy(this.groundMessage.interfacePosition);
      this.groundMessage.setFirstBurning(true);
      this.groundMessage.setSecondBurning(true);
      this.groundMessage.setBurnedOut();
      this.preview.stopWalking();
      this.preview.resetCamera();
      this.startMorningLevFollow();
    }
    if (initial.mode === 'copper-heron-morning-exterior') {
      this.preview.player.position.set(43.0, 0.5, -8.8);
      this.lev.position.set(44.6, 0.5, -7.4);
      this.lev.visible = true;
      this.preview.stopWalking();
      this.preview.resetCamera();
      this.startMorningLevFollow();
    }
    if (initial.levFinalComplete) {
      this.preview.player.position.set(-8.8, 0.5, 28.8);
      this.preview.resetCamera();
    }
    if (this.characterQa) this.stageCharacterQa();
    this.timeVisual.requestClock(initial.clock, { immediate: true });
    this.initialized = true;
    if (initial.hotelEntered && [
      'copper-heron-lobby',
      'copper-heron-corridor',
      'copper-heron-private-room',
      'copper-heron-night',
      'copper-heron-night-corridor',
      'copper-heron-night-lobby',
      'copper-heron-morning',
      'copper-heron-morning-corridor',
      'copper-heron-morning-lobby',
    ].includes(initial.mode)) {
      this.stageHotelInterior();
    }
    if (initial.transportHallEntered && !initial.firstTheoryTested) this.stageMinistryHall();
    this.updateObjective();
    this.updateOutlines();
    this.updateDiagnosticState();
    if (!initial.marketLeadComplete && !this.characterQa) this.openArrival();
  }

  interactionLocked() {
    return this.characterQa
      || this.evidenceViewer.active
      || this.dialogue.active
      || this.departureElapsed !== null
      || this.guideElapsed !== null
      || this.levWalkElapsed !== null
      || this.ministryTransitioning
      || this.archiveTransitioning
      || this.hotelTransitioning
      || this.hotelDoorElapsed !== null
      || this.levHotelExitElapsed !== null
      || this.overlookTravelElapsed !== null
      || this.sunriseElapsed !== null
      || this.sunriseTableauHoldElapsed !== null
      || (this.model.snapshot().boardedTrain && !this.model.snapshot().chapterComplete);
  }

  eligibleInteractions() {
    return this.interactions.filter((interaction) => interaction.eligible());
  }

  handlePointerMove(event) {
    if (!this.initialized || this.interactionLocked()) return false;
    this.pointerClient = { x: event.clientX, y: event.clientY };
    const point = this.preview.projectPointerToGround(event);
    if (!point) {
      this.hoveredId = null;
      this.updateOutlines();
      this.updateInteractionLabel();
      return false;
    }
    let nearest = null;
    const rect = this.preview.renderer.domElement.getBoundingClientRect();
    const state = this.model.snapshot();
    const summitActive = state.sunriseClimbStarted && !state.sunriseReturned;
    const interactions = summitActive
      ? this.eligibleInteractions().filter((interaction) => interaction.id.startsWith('sunrise-overlook-'))
      : this.eligibleInteractions();
    for (const interaction of interactions) {
      const groundDistance = Math.hypot(point.x - interaction.position.x, point.z - interaction.position.z);
      const projected = interaction.position.clone().project(this.preview.camera);
      const screenX = rect.left + (projected.x + 1) * rect.width * 0.5;
      const screenY = rect.top + (1 - projected.y) * rect.height * 0.5;
      const screenDistance = Math.hypot(event.clientX - screenX, event.clientY - screenY);
      const screenRadius = interaction.screenRadius ?? (interaction.position.y > 1.5 ? 76 : 54);
      const score = screenDistance <= screenRadius
        ? screenDistance / screenRadius
        : !summitActive && groundDistance <= INTERACTION_RADIUS
          ? 1 + groundDistance / INTERACTION_RADIUS
          : Infinity;
      if (score < Infinity && (!nearest || score < nearest.score)) {
        nearest = { id: interaction.id, score };
      }
    }
    this.hoveredId = nearest?.id || null;
    this.updateOutlines();
    this.updateInteractionLabel();
    return Boolean(this.hoveredId);
  }

  handlePointerUp(event = null) {
    if (!this.initialized) return false;
    if (this.interactionLocked()) return true;
    const interaction = this.eligibleInteractions().find((entry) => entry.id === this.hoveredId);
    if (!interaction && (this.insideMinistry || this.insideArchive || this.insideHotel)) {
      const point = this.preview.projectPointerToGround({
        clientX: event?.clientX ?? this.pointerClient.x,
        clientY: event?.clientY ?? this.pointerClient.y,
      });
      if (!point) return true;
      const bounds = this.insideHotel
        ? this.hotelArea === 'lobby'
          ? { minX: -4.35, maxX: 4.35, minZ: -4.05, maxZ: 5.3 }
          : { minX: -3.25, maxX: 3.25, minZ: -14.45, maxZ: 6.8 }
        : { minX: -7.7, maxX: 7.7, minZ: -1.8, maxZ: 9.0 };
      const target = [
        THREE.MathUtils.clamp(point.x, bounds.minX, bounds.maxX),
        0.5,
        THREE.MathUtils.clamp(point.z, bounds.minZ, bounds.maxZ),
      ];
      this.walkInsideMinistry(target);
      return true;
    }
    if (!interaction) {
      const state = this.model.snapshot();
      // The summit is an authored micro-scene, not part of the street navmesh.
      // Swallow background clicks here so the street-level raycast cannot send
      // Butch into the surrounding rocks or leave him without a descent route.
      if (state.sunriseClimbStarted && !state.sunriseReturned) {
        this.preview.stopWalking();
        return true;
      }
      return false;
    }
    this.elements.interactionLabel.classList.remove('visible');
    const approachValues = typeof interaction.approach === 'function'
      ? interaction.approach()
      : interaction.approach;
    const approach = positionFrom(approachValues);
    const alreadyAtApproach = this.preview.player.position.distanceTo(approach) < 0.8;
    let started = false;
    if (alreadyAtApproach) {
      interaction.activate();
      started = true;
    } else {
      started = interaction.interior
        ? this.walkInsideMinistry(approachValues, interaction.activate)
        : this.preview.walkTo(
          approachValues[0],
          approachValues[2],
          interaction.activate,
        );
    }
    if (started) interaction.beginApproach?.();
    return true;
  }

  walkInsideMinistry(position, onArrival = null) {
    const target = positionFrom(position);
    this.preview.path = [target];
    this.preview.pathArrival = onArrival;
    this.preview.destinationMarker.position.set(target.x, 0.52, target.z);
    this.preview.destinationMarker.visible = true;
    return true;
  }

  handleKeyDown(event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      this.tabHeld = true;
      this.updateOutlines();
      return true;
    }
    return this.interactionLocked();
  }

  handleKeyUp(event) {
    if (event.key !== 'Tab') return false;
    event.preventDefault();
    this.tabHeld = false;
    this.updateOutlines();
    return true;
  }

  openArrival() {
    let selected = null;
    this.dialogue.show(ARRIVAL_DIALOGUE, {
      onChoice: (choiceId) => {
        if (!this.model.chooseArrival(choiceId)) return [];
        selected = choiceId;
        return ARRIVAL_RESPONSES[choiceId];
      },
      onComplete: () => {
        if (selected) this.beginTrainDeparture();
      },
    });
  }

  beginTrainDeparture() {
    this.preview.stopWalking();
    const roots = [
      this.preview.scene.getObjectByName('municipal-tram'),
      this.preview.scene.getObjectByName('municipal-tram-car-02'),
      this.preview.scene.getObjectByName('municipal-tram-car-03'),
    ].filter(Boolean);
    this.departureBases = roots.map((object) => ({ object, position: object.position.clone() }));
    this.departureElapsed = 0;
    this.updateObjective();
  }

  moveLevTo(position, duration, onComplete = null) {
    this.levWalkStart = this.lev.position.clone();
    this.levWalkTarget = positionFrom(position);
    this.levWalkDuration = duration;
    this.levWalkElapsed = 0;
    this.levWalkOnComplete = onComplete;
  }

  beginLevArrivalApproach() {
    this.moveLevTo(OPENING_POSITIONS.levArrivalTalk, 3.1, () => this.openLevIntroduction());
    this.updateObjective();
    this.updateOutlines();
  }

  beginEdaApproach() {
    this.moveLevTo(OPENING_POSITIONS.levEda, 2.4);
  }

  openLevIntroduction() {
    this.preview.setCameraOverrideTarget(this.preview.player.position.clone().lerp(this.lev.position, 0.36));
    let firstAnswered = false;
    let finishing = false;
    this.dialogue.show(LEV_INTRO_DIALOGUE, {
      onChoice: (choiceId) => {
        if (LEV_FIRST_RESPONSES[choiceId] && !firstAnswered) {
          firstAnswered = true;
          this.model.advanceDialogueTime(`lev-first-${choiceId}`);
          return [
            ...LEV_FIRST_RESPONSES[choiceId],
            ...LEV_COMMON,
            arrivalCallback(this.model.snapshot().arrivalApproach),
            levTopicMenu(this.levTopics),
          ];
        }
        if (!LEV_TOPIC_RESPONSES[choiceId]) return [];
        if (choiceId === 'lev-now') {
          finishing = true;
          this.model.advanceDialogueTime('lev-begin-investigation');
          return LEV_TOPIC_RESPONSES[choiceId];
        }
        this.levTopics.add(choiceId);
        this.model.advanceDialogueTime(`lev-topic-${choiceId}`);
        return [...LEV_TOPIC_RESPONSES[choiceId], levTopicMenu(this.levTopics)];
      },
      onComplete: () => {
        if (!finishing) return;
        this.preview.setCameraOverrideTarget(null);
        this.model.completeLevIntroduction();
        this.beginGuidedWalk();
      },
    });
    this.updateObjective();
  }

  beginGuidedWalk() {
    const started = this.preview.walkTo(
      OPENING_POSITIONS.levInterview[0] - 1.8,
      OPENING_POSITIONS.levInterview[2] + 1.2,
      () => this.openWorldBriefing(),
    );
    if (!started || !this.model.beginGuide()) return;
    this.hoveredId = null;
    this.levOutline.visible = false;
    this.guideElapsed = 0;
    this.guideStart = this.lev.position.clone();
    this.updateObjective();
    this.updateInteractionLabel();
  }

  openWorldBriefing() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.preview.player.position.clone().lerp(this.lev.position, 0.3));
    this.dialogue.show(WORLD_BRIEFING_DIALOGUE, {
      onComplete: () => {
        this.preview.setCameraOverrideTarget(null);
        this.model.completeExplorationBriefing();
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openSeam() {
    this.preview.stopWalking();
    let finished = false;
    const currentSeamMenu = () => seamMenu(this.model.snapshot().seamObservations, this.seamTestingAsked);
    this.dialogue.show([...SEAM_DIALOGUE, currentSeamMenu()], {
      onChoice: (choiceId) => {
        const observation = {
          'seam-geometry': 'geometry',
          'seam-fuel': 'fuel',
          'seam-cleaning': 'cleaning',
        }[choiceId];
        if (observation) {
          this.model.observeSeam(observation);
          return [...SEAM_TOPIC_RESPONSES[choiceId], currentSeamMenu()];
        }
        if (choiceId === 'seam-testing') {
          this.seamTestingAsked = true;
          this.model.advanceDialogueTime('seam-testing-method');
          return [...SEAM_TOPIC_RESPONSES[choiceId], currentSeamMenu()];
        }
        if (choiceId === 'seam-conclude') {
          if (!this.model.snapshot().seamObservations.length) {
            return [{ speaker: 'LEV', text: 'Look at the route, the smell, or the cleaned edge before you decide.' }, currentSeamMenu()];
          }
          return [seamInferenceMenu()];
        }
        const inference = {
          'seam-deliberate': 'deliberate',
          'seam-cart-leak': 'cart-leak',
          'seam-reserve': 'reserve-judgment',
        }[choiceId];
        if (!inference || !this.model.concludeSeam(inference)) return [];
        finished = true;
        return [...SEAM_INFERENCE_RESPONSES[choiceId], ...SEAM_CONCLUSION];
      },
      onComplete: () => {
        if (!finished) return;
        this.hoveredId = null;
        this.seam.outline.visible = false;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openEda() {
    this.preview.stopWalking();
    if (this.levWalkElapsed !== null) {
      this.levWalkOnComplete = () => this.openEda();
      return;
    }
    this.preview.setCameraOverrideTarget(this.preview.player.position.clone().lerp(this.eda.position, 0.45));
    let finished = false;
    this.dialogue.show(EDA_OPENING, {
      onChoice: (choiceId) => {
        const approach = {
          'eda-direct': 'direct',
          'eda-patient': 'patient',
          'eda-pressuring': 'pressuring',
        }[choiceId];
        if (approach && this.model.approachEda(approach)) {
          const state = this.model.snapshot();
          return [...EDA_APPROACH_RESPONSES[choiceId], edaTopicMenu(state.edaCooperation, state.edaTopics)];
        }
        if (EDA_TOPIC_RESPONSES[choiceId]) {
          this.model.noteEdaTopic(choiceId.replace('eda-', ''));
          const state = this.model.snapshot();
          return [...EDA_TOPIC_RESPONSES[choiceId], edaTopicMenu(state.edaCooperation, state.edaTopics)];
        }
        if (choiceId !== 'eda-record') return [];
        if (!this.model.canObtainEdaRecord()) {
          const state = this.model.snapshot();
          return [...EDA_RECORD_BLOCKED, edaTopicMenu(state.edaCooperation, state.edaTopics)];
        }
        this.model.obtainEdaRecord();
        const cooperation = this.model.snapshot().edaCooperation;
        finished = true;
        return [...edaRecordResponse(cooperation), edaExitLine(cooperation)];
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openCart() {
    this.preview.stopWalking();
    this.dialogue.show(CART_DIALOGUE, {
      onComplete: () => {
        this.model.inspectCart();
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openVendor(id, lines) {
    this.preview.stopWalking();
    this.dialogue.show(lines, {
      onComplete: () => {
        this.vendorSpoken.add(id);
        this.model.advanceDialogueTime(`${id}-vendor-conversation`);
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openOlek() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.preview.player.position.clone().lerp(this.olek.position, 0.45));
    let finished = false;
    this.dialogue.show([...OLEK_OPENING, olekTopicMenu(this.model.snapshot().olekTopics)], {
      onChoice: (choiceId) => {
        if (OLEK_TOPIC_RESPONSES[choiceId]) {
          this.model.noteOlekTopic(choiceId.replace('olek-', ''));
          return [...OLEK_TOPIC_RESPONSES[choiceId], olekTopicMenu(this.model.snapshot().olekTopics)];
        }
        if (choiceId !== 'olek-done') return [];
        if (!this.model.canCompleteOlek()) {
          return [...OLEK_ROUTE_BLOCKED, olekTopicMenu(this.model.snapshot().olekTopics)];
        }
        this.model.completeOlekRoute();
        finished = true;
        return OLEK_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openBottle() {
    this.preview.stopWalking();
    let finished = false;
    this.dialogue.show(BOTTLE_DIALOGUE, {
      onChoice: (choiceId) => {
        const inference = {
          'bottle-same-order': 'same-order',
          'bottle-overclaimed': 'overclaimed',
          'bottle-bounded': 'bounded',
        }[choiceId];
        if (!inference || !this.model.inspectBottle(inference)) return [];
        finished = true;
        return BOTTLE_RESPONSES[choiceId];
      },
      onComplete: () => {
        if (!finished) return;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openTransportEntrance() {
    this.preview.stopWalking();
    if (!this.model.reachTransportEntrance()) return;
    const lines = this.model.snapshot().solventBottleObserved
      ? TRANSPORT_ENTRANCE_WITH_BOTTLE
      : TRANSPORT_ENTRANCE_NO_BOTTLE;
    this.dialogue.show(lines, {
      onComplete: () => {
        this.hoveredId = null;
        this.enterMinistryHall();
      },
    });
    this.updateObjective();
  }

  enterMinistryHall() {
    if (!this.model.enterTransportHall()) return;
    this.stageMinistryHall();
  }

  stageMinistryHall() {
    if (this.insideMinistry || this.ministryTransitioning) return;
    this.ministryTransitioning = true;
    this.preview.stopWalking();
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
      const keepVisible = new Set([
        this.ministryHall.group,
        this.preview.player,
        this.lev,
        this.preview.navPlane,
        this.preview.destinationMarker,
      ]);
      this.ministryExteriorVisibility = this.preview.scene.children
        .filter((object) => !keepVisible.has(object) && !object.isLight && !object.isCamera)
        .map((object) => ({ object, visible: object.visible }));
      for (const entry of this.ministryExteriorVisibility) entry.object.visible = false;

      this.ministryHall.group.visible = true;
      this.preview.player.visible = true;
      this.lev.visible = true;
      this.preview.player.position.copy(positionFrom(MINISTRY_POSITIONS.playerStart));
      this.lev.position.copy(positionFrom(MINISTRY_POSITIONS.lev));
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.scene.fog.density = 0.0015;
      this.preview.renderer.toneMappingExposure = 1.26;
      this.preview.resetCamera();
      this.ministryCameraLimitsBefore ??= {
        minZoom: this.preview.controls.minZoom,
        maxZoom: this.preview.controls.maxZoom,
      };
      this.preview.controls.maxZoom = 4.2;
      this.preview.setCameraOverrideTarget(new THREE.Vector3(0, 0.82, 0.2));
      this.preview.camera.zoom = 3.75;
      this.preview.camera.updateProjectionMatrix();
      this.preview.controls.update();
      this.insideMinistry = true;
      this.ministryTransitioning = false;
      this.elements.blackout?.classList.remove('visible');
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
    }, 320);
  }

  exitMinistryHall() {
    if (!this.insideMinistry || this.ministryTransitioning) return;
    this.ministryTransitioning = true;
    this.preview.stopWalking();
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
      this.ministryHall.group.visible = false;
      for (const entry of this.ministryExteriorVisibility) entry.object.visible = entry.visible;
      this.preview.player.visible = true;
      this.lev.visible = true;
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.transportApproach));
      this.lev.position.copy(positionFrom(OPENING_POSITIONS.levTransportExterior));
      this.squareBosko.visible = this.model.snapshot().firstTheoryTested;
      this.timeVisual.request(this.model.snapshot().clock.period, { immediate: true });
      this.preview.setCameraOverrideTarget(null);
      if (this.ministryCameraLimitsBefore) {
        this.preview.controls.minZoom = this.ministryCameraLimitsBefore.minZoom;
        this.preview.controls.maxZoom = this.ministryCameraLimitsBefore.maxZoom;
        this.ministryCameraLimitsBefore = null;
      }
      this.preview.resetCamera();
      this.insideMinistry = false;
      this.ministryTransitioning = false;
      this.elements.blackout?.classList.remove('visible');
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
    }, 320);
  }

  openArchiveEntrance() {
    this.preview.stopWalking();
    if (!this.model.reachArchiveEntrance()) return;
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.archiveMilaExterior.position, 0.42),
    );
    this.dialogue.show(ARCHIVE_ENTRANCE_DIALOGUE, {
      onComplete: () => {
        this.preview.setCameraOverrideTarget(null);
        this.model.enterArchive();
        this.hoveredId = null;
        this.stageArchiveHall();
      },
    });
    this.updateObjective();
  }

  stageArchiveHall() {
    if (this.insideArchive || this.archiveTransitioning) return;
    this.archiveTransitioning = true;
    this.preview.stopWalking();
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
      const keepVisible = new Set([
        this.archiveHall.group,
        this.preview.player,
        this.lev,
        this.preview.navPlane,
        this.preview.destinationMarker,
      ]);
      this.archiveExteriorVisibility = this.preview.scene.children
        .filter((object) => !keepVisible.has(object) && !object.isLight && !object.isCamera)
        .map((object) => ({ object, visible: object.visible }));
      for (const entry of this.archiveExteriorVisibility) entry.object.visible = false;

      this.archiveHall.group.visible = true;
      this.archiveHall.timeline.visible = this.model.snapshot().petarInterviewComplete;
      this.preview.player.visible = true;
      this.lev.visible = true;
      this.preview.player.position.copy(positionFrom(ARCHIVE_POSITIONS.playerStart));
      this.lev.position.copy(positionFrom(ARCHIVE_POSITIONS.lev));
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.scene.fog.density = 0.0015;
      this.preview.renderer.toneMappingExposure = 1.22;
      this.preview.resetCamera();
      this.preview.camera.zoom = 3.7;
      this.preview.camera.updateProjectionMatrix();
      this.insideArchive = true;
      this.archiveTransitioning = false;
      this.elements.blackout?.classList.remove('visible');
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
    }, 320);
  }

  exitArchiveHall() {
    if (!this.insideArchive || this.archiveTransitioning) return;
    this.archiveTransitioning = true;
    this.preview.stopWalking();
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
      this.archiveHall.group.visible = false;
      for (const entry of this.archiveExteriorVisibility) entry.object.visible = entry.visible;
      this.archiveMilaExterior.visible = false;
      this.preview.player.visible = true;
      this.lev.visible = true;
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.archiveApproach));
      this.lev.position.copy(positionFrom(OPENING_POSITIONS.levArchiveExterior));
      this.timeVisual.request(this.model.snapshot().clock.period, { immediate: true });
      this.preview.resetCamera();
      this.insideArchive = false;
      this.archiveTransitioning = false;
      this.elements.blackout?.classList.remove('visible');
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
    }, 320);
  }

  stageDuskLighting() {
    this.timeVisual.request(this.model.snapshot().clock.period);
  }

  openQueueDispenser() {
    this.preview.stopWalking();
    this.ministryHall.queueLever.rotation.z = -1.08;
    this.ministryHall.queueTicket.visible = true;
    setTimeout(() => {
      this.ministryHall.queueLever.rotation.z = -0.45;
    }, 360);
    this.dialogue.show(TRANSPORT_QUEUE_DIALOGUE, {
      onComplete: () => {
        this.model.takeTransportNumber('M-17');
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openSava() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.ministryHall.sava.position, 0.42),
    );
    let finished = false;
    const menu = () => savaTopicMenu(this.model.snapshot().savaTopics);
    this.dialogue.show([...SAVA_NEXT_INTERACTION, ...SAVA_OPENING, menu()], {
      onChoice: (choiceId) => {
        if (SAVA_TOPIC_RESPONSES[choiceId]) {
          this.model.noteSavaTopic(choiceId.replace('sava-', ''));
          return [...SAVA_TOPIC_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'sava-done') return [];
        if (!this.model.canCompleteSava()) return [...SAVA_BLOCKED, menu()];
        this.model.completeSava();
        finished = true;
        return SAVA_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openBoskoQueue() {
    this.preview.stopWalking();
    this.dialogue.show(BOSKO_QUEUE_DIALOGUE, {
      onComplete: () => {
        this.model.askBoskoInQueue();
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openNika() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.ministryHall.nika.position, 0.42),
    );
    let finished = false;
    const menu = () => nikaTopicMenu(this.model.snapshot().nikaTopics);
    this.dialogue.show([...NIKA_OPENING, menu()], {
      onChoice: (choiceId) => {
        if (NIKA_TOPIC_RESPONSES[choiceId]) {
          this.model.noteNikaTopic(choiceId.replace('nika-', ''));
          return [...NIKA_TOPIC_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'nika-done') return [];
        if (!this.model.canCompleteNika()) return [...NIKA_BLOCKED, menu()];
        this.model.completeNika();
        this.ministryHall.discardedPrint.visible = true;
        finished = true;
        return NIKA_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openDiscardedPrint() {
    this.preview.stopWalking();
    this.dialogue.show(DISCARDED_PRINT_DIALOGUE, {
      onComplete: () => {
        this.model.inspectDiscardedPrint();
        this.model.leaveMinistryForTheory();
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
        this.exitMinistryHall();
      },
    });
  }

  openFirstTheory() {
    this.preview.stopWalking();
    let finished = false;
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.lev.position, 0.44),
    );
    this.dialogue.show(FIRST_THEORY_OPENING, {
      onChoice: (choiceId) => {
        const theory = {
          'theory-market-ministry': 'market-ministry',
          'theory-code-cover': 'code-cover',
          'theory-planned-handoff': 'planned-handoff',
        }[choiceId];
        if (!theory || !this.model.testFirstTheory(theory)) return [];
        finished = true;
        return [...FIRST_THEORY_RESPONSES[choiceId], ...FIRST_THEORY_CONCLUSION];
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.squareBosko.visible = true;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openSquareBosko() {
    this.preview.stopWalking();
    let selected = false;
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.squareBosko.position, 0.44),
    );
    this.dialogue.show(BOSKO_SQUARE_OPENING, {
      onChoice: (choiceId) => {
        if (!BOSKO_SQUARE_RESPONSES[choiceId] || selected) return [];
        selected = true;
        return [...BOSKO_SQUARE_RESPONSES[choiceId], ...BOSKO_SQUARE_CONCLUSION];
      },
      onComplete: () => {
        if (!selected || !this.model.completeSquareBosko()) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openPlazaGrooves() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => plazaGrooveMenu(this.model.snapshot().grooveObservations);
    this.preview.setCameraOverrideTarget(positionFrom(OPENING_POSITIONS.plazaGrooves));
    this.dialogue.show([...PLAZA_GROOVE_OPENING, menu()], {
      onChoice: (choiceId) => {
        const observation = {
          'groove-rows': 'rows',
          'groove-spacing': 'spacing',
          'groove-feed-gap': 'feed-gap',
        }[choiceId];
        if (observation) {
          this.model.observeGroove(observation);
          return [...PLAZA_GROOVE_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'groove-conclude') return [];
        if (!this.model.canConcludeGrooves()) return [...PLAZA_GROOVE_BLOCKED, menu()];
        this.model.concludeGrooves();
        finished = true;
        return PLAZA_GROOVE_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.archiveMilaExterior.visible = true;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openAnaMapHelp() {
    this.preview.stopWalking();
    this.dialogue.show(ANA_MAP_HELP_DIALOGUE, {
      onComplete: () => {
        this.model.askAnaForMapHelp();
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openArchiveMap() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.archiveHall.mapTable.position);
    this.evidenceViewer.open(CHAPTER3_DOCUMENTS.ARCHIVE_FEED_PLAN, {
      onClose: () => this.openArchiveMapDialogue(),
    });
  }

  openArchiveMapDialogue() {
    let selected = false;
    this.dialogue.show(ARCHIVE_MAP_DIALOGUE, {
      onChoice: (choiceId) => {
        if (!ARCHIVE_MAP_RESPONSES[choiceId] || selected) return [];
        selected = true;
        return [...ARCHIVE_MAP_RESPONSES[choiceId], ...ARCHIVE_MAP_CONCLUSION];
      },
      onComplete: () => {
        if (!selected || !this.model.inspectArchiveMap()) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openMaintenanceOrder() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.archiveHall.workOrderDesk.position);
    this.evidenceViewer.open(CHAPTER3_DOCUMENTS.MAINTENANCE_ORDER_C441, {
      onClose: () => this.openMaintenanceOrderDialogue(),
    });
  }

  openMaintenanceOrderDialogue() {
    this.dialogue.show(MAINTENANCE_ORDER_DIALOGUE, {
      onComplete: () => {
        this.model.inspectMaintenanceOrder();
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openPetar() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => petarTopicMenu(this.model.snapshot().petarTopics);
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.archiveHall.petar.position, 0.42),
    );
    this.dialogue.show([...PETAR_OPENING, menu()], {
      onChoice: (choiceId) => {
        if (PETAR_TOPIC_RESPONSES[choiceId]) {
          this.model.notePetarTopic(choiceId.replace('petar-', ''));
          return [...PETAR_TOPIC_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'petar-done') return [];
        if (!this.model.canCompletePetar()) return [...PETAR_BLOCKED, menu()];
        this.model.completePetarInterview();
        this.archiveHall.timeline.visible = true;
        finished = true;
        return PETAR_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openMaterialTimeline() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.archiveHall.timeline.position);
    this.evidenceViewer.open(CHAPTER3_DOCUMENTS.MATERIAL_TIMELINE, {
      onClose: () => this.openMaterialTimelineDialogue(),
    });
  }

  openMaterialTimelineDialogue() {
    this.dialogue.show(MATERIAL_TIMELINE_DIALOGUE, {
      onComplete: () => {
        this.model.inspectMaterialTimeline();
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.exitArchiveHall();
      },
    });
  }

  openSecondTheory() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => secondTheoryMenu(this.model.snapshot().secondTheoriesTested);
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.lev.position, 0.44),
    );
    this.dialogue.show([...SECOND_THEORY_OPENING, menu()], {
      onChoice: (choiceId) => {
        const theory = choiceId.startsWith('second-') && choiceId !== 'second-conclude'
          ? choiceId.replace('second-', '')
          : null;
        if (theory && SECOND_THEORY_RESPONSES[choiceId]) {
          this.model.testSecondTheory(theory);
          return [...SECOND_THEORY_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'second-conclude') return [];
        if (!this.model.canCompleteSecondTheory()) return [...SECOND_THEORY_BLOCKED, menu()];
        this.model.completeSecondTheory();
        finished = true;
        return SECOND_THEORY_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.cutInterface.group.visible = true;
        this.stageDuskLighting();
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openCutInterface() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => cutInterfaceMenu(this.model.snapshot().cutInterfaceObservations);
    this.preview.setCameraOverrideTarget(positionFrom(OPENING_POSITIONS.cutInterface));
    this.dialogue.show([...CUT_INTERFACE_OPENING, menu()], {
      onChoice: (choiceId) => {
        const observation = {
          'cut-cut': 'cut',
          'cut-placement': 'placement',
          'cut-reconnection': 'reconnection',
        }[choiceId];
        if (observation) {
          this.model.observeCutInterface(observation);
          return [...CUT_INTERFACE_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'cut-conclude') return [];
        if (!this.model.canConcludeCutInterface()) return [...CUT_INTERFACE_BLOCKED, menu()];
        this.model.concludeCutInterface();
        finished = true;
        return CUT_INTERFACE_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  enterCopperHeron() {
    this.preview.stopWalking();
    if (!this.model.enterHotel()) return;
    this.stageHotelInterior();
  }

  stageHotelInterior() {
    if (this.insideHotel || this.hotelTransitioning) return;
    this.hotelTransitioning = true;
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
      const keepVisible = new Set([
        this.hotelHall.group,
        this.preview.player,
        this.lev,
        this.preview.navPlane,
        this.preview.destinationMarker,
      ]);
      this.hotelExteriorVisibility = this.preview.scene.children
        .filter((object) => !keepVisible.has(object) && !object.isLight && !object.isCamera)
        .map((object) => ({ object, visible: object.visible }));
      for (const entry of this.hotelExteriorVisibility) entry.object.visible = false;
      this.hotelHall.group.visible = true;
      this.preview.player.visible = true;
      const state = this.model.snapshot();
      this.insideHotel = true;
      const targetArea = state.morningStarted
        ? state.morningLobbyReached ? 'lobby' : state.morningRoomLeft ? 'corridor' : 'room'
        : state.slept
          ? state.nightLobbyReached ? 'lobby' : state.nightRoomLeft ? 'corridor' : 'room'
          : state.hotelRoomEntered
          ? 'room'
          : state.hotelCorridorEntered
            ? 'corridor'
          : 'lobby';
      this.setHotelArea(targetArea);
      this.hotelTransitioning = false;
      this.elements.blackout?.classList.remove('visible');
      this.hoveredId = null;
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
    }, 320);
  }

  setHotelArea(area, { arrival = null } = {}) {
    const state = this.model.snapshot();
    const lobby = area === 'lobby';
    const corridor = area === 'corridor';
    const upperFloor = corridor || area === 'room';
    this.hotelArea = area;
    this.hotelHall.lobbyGroup.visible = lobby;
    this.hotelHall.corridorGroup.visible = upperFloor;
    this.hotelHall.roomGroup.visible = upperFloor;
    if (lobby) {
      const morning = state.morningStarted;
      this.hotelHall.hana.visible = !state.slept || morning;
      this.hotelHall.irena.visible = !state.slept && !morning;
      this.hotelHall.vesna.visible = !state.slept && !morning;
      this.hotelHall.daro.visible = !state.slept && !morning;
      const arrivedFromStairs = arrival === 'stairs'
        || (!arrival && (state.morningLobbyReached || state.nightLobbyReached));
      this.preview.player.position.copy(positionFrom(arrivedFromStairs
        ? HOTEL_POSITIONS.lobbyStairArrival
        : HOTEL_POSITIONS.playerStart));
      this.lev.position.copy(positionFrom(HOTEL_POSITIONS.lev));
      this.lev.visible = morning && state.morningLobbyReached
        ? true
        : !state.evidenceTableComplete && !state.slept && !morning;
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.renderer.toneMappingExposure = 1.18;
    } else if (corridor) {
      this.preview.player.position.copy(positionFrom(state.morningRoomLeft || state.nightRoomLeft
        ? HOTEL_POSITIONS.corridorRoomExitStart
        : HOTEL_POSITIONS.corridorPlayerStart));
      this.lev.position.copy(positionFrom(HOTEL_POSITIONS.corridorLev));
      this.lev.visible = !state.evidenceTableComplete && !state.slept && !state.morningStarted;
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.renderer.toneMappingExposure = state.morningStarted ? 1.22 : 1.16;
    } else {
      this.preview.player.position.copy(positionFrom(HOTEL_POSITIONS.roomPlayerStart));
      this.lev.position.copy(positionFrom(HOTEL_POSITIONS.roomLev));
      this.lev.visible = !state.evidenceTableComplete && !state.slept && !state.morningStarted;
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.renderer.toneMappingExposure = state.morningStarted ? 1.26 : 1.2;
    }
    this.preview.stopWalking();
    this.preview.resetCamera();
    this.preview.camera.zoom = 3.8;
    this.preview.camera.updateProjectionMatrix();
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
    this.updateDiagnosticState();
  }

  switchHotelArea(area, { fade = true, arrival = null } = {}) {
    if (!this.insideHotel || this.hotelTransitioning || this.hotelArea === area) return false;
    if (!fade) {
      this.setHotelArea(area, { arrival });
      return true;
    }
    this.hotelTransitioning = true;
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
      this.setHotelArea(area, { arrival });
      this.hotelTransitioning = false;
      this.elements.blackout?.classList.remove('visible');
    }, 280);
    return true;
  }

  enterButchRoom() {
    if (this.model.snapshot().hotelRoomEntered) return;
    this.animateHotelDoor(() => {
      if (!this.model.enterHotelRoom()) return;
      this.switchHotelArea('room', { fade: false });
    });
  }

  enterHotelCorridor() {
    if (!this.model.enterHotelCorridor()) return;
    this.switchHotelArea('corridor');
  }

  leaveRoomInMorning() {
    if (this.model.snapshot().morningRoomLeft) return;
    this.animateHotelDoor(() => {
      if (!this.model.leaveMorningRoom()) return;
      this.switchHotelArea('corridor', { fade: false });
    });
  }

  goDownstairsInMorning() {
    if (!this.model.reachMorningLobby()) return;
    if (this.switchHotelArea('lobby', { arrival: 'stairs' })) {
      setTimeout(() => {
        if (this.hotelArea === 'lobby') this.openMorningLevGreeting();
      }, 360);
    }
  }

  leaveRoomAtNight() {
    if (this.model.snapshot().nightRoomLeft) return;
    this.animateHotelDoor(() => {
      if (!this.model.leaveNightRoom()) return;
      this.switchHotelArea('corridor', { fade: false });
    });
  }

  goDownstairsAtNight() {
    if (!this.model.reachNightLobby()) return;
    this.switchHotelArea('lobby', { arrival: 'stairs' });
  }

  animateHotelDoor(onComplete) {
    if (this.hotelDoorElapsed !== null || this.levHotelExitElapsed !== null) return false;
    this.hotelDoorElapsed = 0;
    this.hotelDoorDuration = 1.35;
    this.hotelDoorOnComplete = onComplete;
    this.hotelDoorClosing = false;
    this.preview.stopWalking();
    return true;
  }

  beginLevHotelExit() {
    if (this.levHotelExitElapsed !== null || !this.lev.visible) return false;
    this.preview.stopWalking();
    this.levHotelExitElapsed = 0;
    this.levHotelExitStart = this.lev.position.clone();
    this.hotelHall.butchRoomDoor.rotation.y = 0;
    this.updateOutlines();
    return true;
  }

  openHanaRegister() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.hotelHall.desk.position);
    this.evidenceViewer.open(CHAPTER3_DOCUMENTS.HOTEL_REGISTER, {
      onClose: () => this.openHanaDialogue(),
    });
  }

  openHanaDialogue() {
    let finished = false;
    const menu = () => hanaTopicMenu(this.model.snapshot().hanaTopics);
    this.dialogue.show([...HANA_OPENING, menu()], {
      onChoice: (choiceId) => {
        if (HANA_TOPIC_RESPONSES[choiceId]) {
          this.model.noteHanaTopic(choiceId.replace('hana-', ''));
          return [...HANA_TOPIC_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'hana-done') return [];
        if (!this.model.canCompleteHana()) return [...HANA_BLOCKED, menu()];
        this.model.completeHotelCheckIn();
        finished = true;
        return HANA_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openHotelGuest(guest) {
    this.preview.stopWalking();
    const state = this.model.snapshot();
    const lines = guest === 'irena' && !state.solventBottleObserved
      ? HOTEL_GUEST_DIALOGUE[guest].slice(0, 2)
      : HOTEL_GUEST_DIALOGUE[guest];
    this.dialogue.show(lines, {
      onComplete: () => {
        this.model.askHotelGuest(guest);
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openDaro() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => daroMenu(this.model.snapshot().daroTopics);
    this.dialogue.show([...DARO_OPENING, menu()], {
      onChoice: (choiceId) => {
        if (DARO_RESPONSES[choiceId]) {
          this.model.noteDaroTopic(choiceId.replace('daro-', ''));
          return [...DARO_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'daro-done') return [];
        if (!this.model.canCompleteDaro()) return [...DARO_BLOCKED, menu()];
        this.model.completeDaro();
        finished = true;
        return DARO_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openFinalEvidenceTable() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.hotelHall.evidenceTable.position);
    this.openFinalEvidenceTableDialogue();
  }

  openFinalEvidenceTableDialogue() {
    let finished = false;
    const menu = () => finalTheoryMenu(this.model.snapshot().finalTheoriesTested);
    this.dialogue.show([...EVIDENCE_TABLE_OPENING, menu()], {
      onChoice: (choiceId) => {
        const theory = choiceId.startsWith('final-') && choiceId !== 'final-done' ? choiceId.replace('final-', '') : null;
        if (theory && FINAL_THEORY_RESPONSES[choiceId]) {
          this.model.testFinalTheory(theory);
          return [...FINAL_THEORY_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'final-done') return [];
        if (!this.model.canCompleteEvidenceTable()) return [...FINAL_THEORY_BLOCKED, menu()];
        this.model.completeEvidenceTable();
        finished = true;
        return EVIDENCE_TABLE_CONCLUSION;
      },
      onLineChange: (line) => {
        const paperId = line.evidenceDocument;
        const documentSpec = HOTEL_PAPER_DOCUMENTS[paperId];
        if (!paperId || !documentSpec) return;
        this.model.readHotelEvidencePaper(paperId);
        this.evidenceViewer.openReference(documentSpec);
        this.updateObjective();
        this.updateOutlines();
      },
      onComplete: () => {
        if (this.evidenceViewer.mode === 'reference') this.evidenceViewer.close();
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.beginLevHotelExit();
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openSleep() {
    this.preview.stopWalking();
    this.dialogue.show(SLEEP_DIALOGUE, {
      onComplete: () => {
        this.model.sleepUntilNight();
        this.groundMessage.setFirstBurning(true);
        this.groundMessage.setSecondBurning(false);
        this.lev.visible = false;
        this.hotelHall.hana.visible = false;
        this.hotelHall.irena.visible = false;
        this.hotelHall.vesna.visible = false;
        this.hotelHall.daro.visible = false;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  restoreHotelExterior({ night = false, morning = false } = {}) {
    if (!this.insideHotel || this.hotelTransitioning) return;
    this.hotelTransitioning = true;
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
      this.hotelHall.group.visible = false;
      for (const entry of this.hotelExteriorVisibility) entry.object.visible = entry.visible;
      if (night) {
        this.groundMessage.setFirstBurning(true);
        this.groundMessage.setSecondBurning(false);
      }
      if (morning) {
        this.groundMessage.setFirstBurning(true);
        this.groundMessage.setSecondBurning(true);
        this.groundMessage.setBurnedOut();
      }
      this.insideHotel = false;
      this.hotelArea = null;
      this.hotelTransitioning = false;
      this.preview.player.visible = true;
      this.preview.player.position.set(49.8, 0.5, -12.2);
      this.preview.stopWalking();
      this.lev.visible = !night;
      if (morning) {
        this.lev.position.copy(positionFrom(MORNING_LEV_EXTERIOR_START));
        this.startMorningLevFollow();
      }
      this.timeVisual.requestClock(this.model.snapshot().clock, { immediate: true });
      this.preview.resetCamera();
      this.elements.blackout?.classList.remove('visible');
      this.hoveredId = null;
      this.updateObjective();
      this.updateOutlines();
    }, 320);
  }

  leaveHotelAtNight() {
    if (!this.model.beginNightRoute()) return;
    this.setNightDreamRendering(true);
    this.cutInterface.group.position.copy(this.groundMessage.interfacePosition);
    this.groundMessage.setFirstBurning(true);
    this.groundMessage.setSecondBurning(false);
    this.restoreHotelExterior({ night: true });
  }

  openNightFire() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.groundMessage.position);
    // The message is the climax, not a distant map marker. Pull the fixed
    // isometric camera close enough that both burning rows remain readable
    // beside the dialogue panel.
    this.nightCameraLimitsBefore ??= {
      minZoom: this.preview.controls.minZoom,
      maxZoom: this.preview.controls.maxZoom,
    };
    this.preview.controls.maxZoom = 5.45;
    this.preview.camera.zoom = 5.0;
    this.preview.camera.updateProjectionMatrix();
    this.preview.controls.update();
    this.model.observeNightFire();
    let selected = false;
    const attitude = {
      speaker: 'BUTCH', text: 'Choose what to hold onto before touching the feed.', choices: [
        { id: 'night-relief', label: 'Start with the relief: she was alive.' },
        { id: 'night-anger', label: 'Admit the anger: she knew you would follow.' },
        { id: 'night-caution', label: 'Treat the first line as a bounded fact.' },
      ],
    };
    this.dialogue.show([...NIGHT_FIRST_LINE, attitude], {
      onChoice: (choiceId) => {
        if (!NIGHT_ATTITUDE_RESPONSES[choiceId] || selected) return [];
        selected = true;
        return [...NIGHT_ATTITUDE_RESPONSES[choiceId], ...NIGHT_RECONNECT, ...NIGHT_SECOND_LINE];
      },
      onLineChange: (line) => {
        if (line.nightIgnition) this.startNightIgnition();
      },
      onComplete: () => {
        if (!selected) return;
        if (this.nightCameraLimitsBefore) {
          this.preview.controls.minZoom = this.nightCameraLimitsBefore.minZoom;
          this.preview.controls.maxZoom = this.nightCameraLimitsBefore.maxZoom;
          this.nightCameraLimitsBefore = null;
        }
        this.elements.dialogue.panel.classList.remove('cinematic-hold');
        this.dialogue.setAdvanceLocked(false);
        this.model.completeNightMessage();
        this.elements.blackout?.classList.add('visible');
        setTimeout(() => {
          this.model.beginMorning();
          this.setNightDreamRendering(false);
          this.stageHotelInterior();
        }, 1500);
      },
    });
  }

  startNightIgnition() {
    if (this.nightIgnitionElapsed !== null) return false;
    if (!this.model.reconnectNightFeed()) return false;
    this.nightIgnitionElapsed = 0;
    this.nightIgnitionProgress = 0;
    this.nightFireZoomBefore = this.preview.camera.zoom;
    this.groundMessage.setSecondIgnitionProgress(0);
    this.dialogue.setAdvanceLocked(true);
    this.elements.dialogue.panel.classList.add('cinematic-hold');
    this.preview.setCameraOverrideTarget(this.groundMessage.position);
    this.updateObjective();
    return true;
  }

  openHanaBreakfast() {
    this.preview.stopWalking();
    this.dialogue.show(HANA_BREAKFAST, {
      onComplete: () => {
        this.model.askHanaAtBreakfast();
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openMorningLevGreeting() {
    if (this.morningLevGreetingShown || !this.model.snapshot().morningStarted) return false;
    this.morningLevGreetingShown = true;
    this.preview.stopWalking();
    this.dialogue.show(MORNING_LEV_GREETING, {
      onComplete: () => {
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
    return true;
  }

  openMorningLevReminder() {
    this.preview.stopWalking();
    const state = this.model.snapshot();
    const lines = !state.morningReservationCollected
      ? MORNING_LEV_REMINDER
      : state.sunriseReturned
        ? MORNING_LEV_PLATFORM_REMINDER
        : MORNING_LEV_OVERLOOK_REMINDER;
    this.dialogue.show(lines, {
      onComplete: () => {
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openMorningReservation() {
    this.preview.stopWalking();
    this.dialogue.show(MORNING_RESERVATION_DIALOGUE, {
      onComplete: () => {
        this.model.collectMorningReservation();
        this.morningNika.visible = false;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  beginSunriseClimb() {
    if (!this.model.startSunriseClimb()) return false;
    this.preview.stopWalking();
    this.morningLevFollowing = false;
    this.setTunnelRouteCutaway(true);
    this.setSunriseRouteCamera(this.sunriseOverlook.points[0]);
    this.overlookTravelMode = 'up';
    this.overlookTravelElapsed = 0;
    this.overlookTravelDuration = 6.6;
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
    return true;
  }

  setTunnelRouteCutaway(active) {
    for (const state of this.tunnelCutawayMaterials) {
      state.material.transparent = state.transparent;
      state.material.opacity = state.opacity;
      state.material.depthWrite = state.depthWrite;
      state.material.needsUpdate = true;
    }
  }

  setSunriseRouteCamera(focus) {
    // The ordinary southeast city camera looks through the tunnel bank at this
    // west-facing route. A high west-side isometric angle keeps the boardwalk,
    // its cliff attachment and both walkers visible without breaking the game's
    // fixed top-down visual language.
    const cameraFocus = focus.clone().add(new THREE.Vector3(0, 1.4, 0));
    this.preview.setCameraOverrideTarget(cameraFocus);
    this.preview.controls.target.copy(cameraFocus);
    this.preview.cameraFollowTarget?.copy(cameraFocus);
    this.preview.camera.position.copy(cameraFocus).add(new THREE.Vector3(0, 100, 8));
    this.preview.camera.zoom = 2.35;
    this.preview.camera.lookAt(cameraFocus);
    this.preview.camera.updateProjectionMatrix();
    this.preview.controls.update();
  }

  beginSunriseView() {
    if (!this.model.snapshot().sunriseClimbStarted || this.model.snapshot().sunriseViewed) return false;
    this.preview.stopWalking();
    this.sunriseElapsed = 0;
    this.sunriseDialogueShown = true;
    this.sunriseCameraStartZoom = this.preview.camera.zoom;
    const yaw = this.sunriseOverlook.bench.rotation.y;
    const butchSeat = new THREE.Vector3(-0.62, 0.32, -0.16).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const levSeat = new THREE.Vector3(0.62, 0.32, -0.16).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    // Seat against the bench root rather than the summit centre. The bench is
    // intentionally offset on the deck, and using the summit left both actors
    // visually detached after its orientation changed.
    this.preview.player.position.copy(this.sunriseOverlook.bench.position).add(butchSeat);
    this.lev.position.copy(this.sunriseOverlook.bench.position).add(levSeat);
    this.preview.player.rotation.y = THREE.MathUtils.degToRad(128);
    this.lev.rotation.y = THREE.MathUtils.degToRad(128);
    this.showSunriseTableau();
    this.dialogue.show(SUNRISE_BENCH_DIALOGUE, {
      onComplete: () => this.completeSunriseView(),
    });
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
    return true;
  }

  beginSunriseDescent() {
    const state = this.model.snapshot();
    if (!state.sunriseViewed || state.sunriseReturned) return false;
    this.preview.stopWalking();
    this.overlookTravelMode = 'down';
    this.overlookTravelElapsed = 0;
    this.overlookTravelDuration = 5.4;
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
    return true;
  }

  updateSunriseOverlook(dt) {
    if (this.overlookTravelElapsed !== null) {
      this.overlookTravelElapsed += dt;
      const rawProgress = THREE.MathUtils.clamp(this.overlookTravelElapsed / this.overlookTravelDuration, 0, 1);
      const progress = smooth(rawProgress);
      const route = this.overlookTravelMode === 'up'
        ? this.sunriseOverlook.points
        : [...this.sunriseOverlook.points].reverse();
      const butchPosition = samplePolyline(route, progress);
      const levPosition = samplePolyline(route, Math.max(0, progress - 0.065));
      const previous = this.preview.player.position.clone();
      this.preview.player.position.copy(butchPosition);
      this.lev.position.copy(levPosition).add(new THREE.Vector3(0.42, 0, 0.28));
      const direction = butchPosition.clone().sub(previous);
      if (direction.lengthSq() > 0.0001) {
        this.preview.player.rotation.y = Math.atan2(direction.x, direction.z);
        this.lev.rotation.y = this.preview.player.rotation.y;
      }
      const focus = this.preview.player.position.clone().lerp(this.lev.position, 0.45);
      this.preview.setCameraOverrideTarget(focus);
      if (rawProgress >= 1) {
        const climbedUp = this.overlookTravelMode === 'up';
        this.overlookTravelElapsed = null;
        this.overlookTravelMode = null;
        if (climbedUp) {
          const arrivalSide = new THREE.Vector3(
            -this.sunriseOverlook.points.at(-1).z + this.sunriseOverlook.points.at(-2).z,
            0,
            this.sunriseOverlook.points.at(-1).x - this.sunriseOverlook.points.at(-2).x,
          ).normalize();
          this.preview.player.position.copy(this.sunriseOverlook.summit)
            .add(arrivalSide.clone().multiplyScalar(0.48))
            .add(new THREE.Vector3(0, 0.32, 0));
          this.lev.position.copy(this.sunriseOverlook.summit)
            .add(arrivalSide.clone().multiplyScalar(-0.62))
            .add(new THREE.Vector3(0, 0.32, 0));
        } else {
          this.model.returnFromSunrise();
          this.preview.player.position.copy(this.sunriseOverlook.points[0]);
          this.lev.position.copy(this.sunriseOverlook.points[0]).add(new THREE.Vector3(1.2, 0, 0.8));
          this.setTunnelRouteCutaway(false);
          this.preview.setCameraOverrideTarget(null);
          this.preview.resetCamera();
          this.startMorningLevFollow();
        }
        this.updateObjective();
        this.updateOutlines();
      }
    }

    if (this.sunriseElapsed !== null) this.sunriseElapsed += dt;
    if (this.sunriseTableauHoldElapsed !== null) {
      this.sunriseTableauHoldElapsed += dt;
      if (this.sunriseTableauHoldElapsed >= 3) {
        this.elements.sunriseTableau?.classList.add('ready-to-leave');
        const continueButton = this.elements.sunriseTableau?.querySelector('#sunrise-tableau-continue');
        if (continueButton) continueButton.disabled = false;
      }
    }
  }

  showSunriseTableau() {
    this.elements.sunriseTableau?.classList.add('visible');
    this.elements.sunriseTableau?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('sunrise-tableau-active');
    this.elements.sunriseTableau?.classList.remove('ready-to-leave');
    const continueButton = this.elements.sunriseTableau?.querySelector('#sunrise-tableau-continue');
    if (continueButton) continueButton.disabled = true;
  }

  hideSunriseTableau() {
    this.elements.sunriseTableau?.classList.remove('visible');
    this.elements.sunriseTableau?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('sunrise-tableau-active');
    this.elements.sunriseTableau?.classList.remove('ready-to-leave');
  }

  completeSunriseView() {
    if (this.sunriseElapsed === null) return;
    this.sunriseElapsed = null;
    this.sunriseTableauHoldElapsed = 0;
    this.preview.player.scale.y = 1;
    this.lev.scale.y = 0.96;
    this.model.completeSunriseView();
    this.timeVisual.requestClock(this.model.snapshot().clock);
    this.updateObjective();
    this.updateOutlines();
  }

  leaveSunriseTableau() {
    if (this.sunriseTableauHoldElapsed === null || this.sunriseTableauHoldElapsed < 3) return false;
    this.sunriseTableauHoldElapsed = null;
    this.hideSunriseTableau();
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
    return true;
  }

  openAmbientDialogue(lines) {
    this.preview.stopWalking();
    this.dialogue.show(lines, {
      onComplete: () => {
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  campfireGatheringVisible() {
    const state = this.model.snapshot();
    return !this.insideHotel && !this.insideMinistry && !this.insideArchive
      && !state.boardedTrain && state.clock.period === 'DUSK';
  }

  openCampfireDialogue(id, lines) {
    if (!this.campfireSpoken.has(id)) {
      this.campfireSpoken.add(id);
      this.model.advanceDialogueTime(`campfire-${id}`, 2);
    }
    this.openAmbientDialogue(lines);
  }

  setNightDreamRendering(active) {
    const canvas = this.preview.renderer?.domElement;
    if (!canvas) return;
    canvas.style.transition = 'filter 900ms ease';
    canvas.style.filter = active ? 'blur(1.15px) saturate(0.68) contrast(1.14)' : '';
    document.body.dataset.chapter3DreamRendering = active ? 'active' : 'clear';
  }

  startMorningLevFollow() {
    this.morningLevFollowing = true;
    this.morningLevFollowTime = 0;
    this.morningLevTrail = [{ time: 0, position: this.preview.player.position.clone() }];
    const initialDirection = this.preview.player.position.clone().sub(this.lev.position);
    initialDirection.y = 0;
    if (initialDirection.lengthSq() > 0.01) this.morningLevLastDirection.copy(initialDirection.normalize());
  }

  morningLevApproach() {
    const towardPlayer = this.preview.player.position.clone().sub(this.lev.position);
    if (towardPlayer.lengthSq() < 0.01) towardPlayer.set(1, 0, 0);
    towardPlayer.y = 0;
    towardPlayer.normalize().multiplyScalar(1.2);
    const approach = this.lev.position.clone().add(towardPlayer);
    return [approach.x, 0.5, approach.z];
  }

  updateMorningLevFollow(dt) {
    const state = this.model.snapshot();
    if (!this.morningLevFollowing || this.insideHotel || this.insideMinistry || this.insideArchive || state.boardedTrain || !this.lev.visible) return;
    this.morningLevFollowTime += dt;
    this.morningLevTrail.push({ time: this.morningLevFollowTime, position: this.preview.player.position.clone() });
    const delay = 0.58 + 0.24 * (0.5 + 0.5 * Math.sin(this.morningLevFollowTime * 0.83));
    const wantedTime = this.morningLevFollowTime - delay;
    while (this.morningLevTrail.length > 2 && this.morningLevTrail[1].time < wantedTime) this.morningLevTrail.shift();
    while (this.morningLevTrail.length > 240) this.morningLevTrail.shift();
    const target = (this.morningLevTrail[0]?.position || this.preview.player.position).clone();
    const trailDirection = this.preview.player.position.clone().sub(target);
    trailDirection.y = 0;
    if (trailDirection.lengthSq() > 0.01) this.morningLevLastDirection.copy(trailDirection.normalize());
    target.addScaledVector(this.morningLevLastDirection, -0.95);
    const side = new THREE.Vector3(-this.morningLevLastDirection.z, 0, this.morningLevLastDirection.x);
    target.addScaledVector(side, Math.sin(this.morningLevFollowTime * 1.17) * 0.18);
    const movement = target.sub(this.lev.position);
    movement.y = 0;
    const distance = movement.length();
    if (distance <= 0.22) return;
    const naturalSpeed = 3.7 + 0.65 * (0.5 + 0.5 * Math.sin(this.morningLevFollowTime * 1.41));
    const speed = distance > 4.2 ? 6.2 : naturalSpeed;
    const step = Math.min(distance, dt * speed);
    this.lev.position.addScaledVector(movement.normalize(), step);
    this.lev.position.y = 0.5;
    this.lev.rotation.y = Math.atan2(movement.x, movement.z);
  }

  leaveHotelInMorning() {
    this.groundMessage.setFirstBurning(true);
    this.groundMessage.setSecondBurning(true);
    this.groundMessage.setBurnedOut();
    this.restoreHotelExterior({ morning: true });
  }

  updateMorningRouteInterruption() {
    const state = this.model.snapshot();
    if (this.morningFireInterruptionShown || this.dialogue.active || this.insideHotel || this.insideMinistry || this.insideArchive) return;
    if (!state.morningReservationCollected || state.morningFireEncountered || this.overlookTravelElapsed !== null) return;
    const distance = this.preview.player.position.distanceTo(this.groundMessage.position);
    if (distance > 10.5) return;
    this.morningFireInterruptionShown = true;
    this.model.noticeMorningFire();
    this.preview.stopWalking();
    this.taskBubbleElapsed = 0;
    document.getElementById('task-bubble')?.classList.add('visible');
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
  }

  updateAmbientCityLife(dt) {
    this.ambientElapsed += dt;
    const exterior = !this.insideHotel && !this.insideMinistry && !this.insideArchive;
    const state = this.model.snapshot();
    this.morningNika.visible = exterior && state.morningLobbyReached && !state.morningReservationCollected;
    const gangstersPresent = exterior && ['AFTERNOON', 'EVENING', 'NIGHT', 'DAWN'].includes(state.clock.period);
    this.alleyGangsterA.visible = gangstersPresent;
    this.alleyGangsterB.visible = gangstersPresent;
    this.alleyResident.visible = exterior;
    const campfirePresent = this.campfireGatheringVisible();
    this.campfireRada.visible = campfirePresent;
    this.campfireMiro.visible = campfirePresent;
    this.campfireSeline.visible = campfirePresent;
    this.campfireKettle.visible = exterior && !state.boardedTrain;
    if (campfirePresent) {
      const sway = Math.sin(this.ambientElapsed * 1.35);
      this.campfireRada.rotation.y = 2.35 + sway * 0.08;
      this.campfireMiro.rotation.y = -1.0 - sway * 0.06;
      this.campfireSeline.rotation.y = 0.2 + sway * 0.07;
      this.campfireRada.position.y = 0.5 + Math.max(0, sway) * 0.018;
      this.campfireMiro.position.y = 0.5 + Math.max(0, -sway) * 0.014;
    }
    if (gangstersPresent) {
      this.alleyGangsterB.position.x = -26.7 + Math.sin(this.ambientElapsed * 0.38) * 0.55;
      this.alleyGangsterB.rotation.y = Math.sin(this.ambientElapsed * 0.31) * 0.4;
    }
    this.alleyResident.position.z = -18.0 + Math.sin(this.ambientElapsed * 0.22) * 0.08;
  }

  openMorningEvidence() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => morningEvidenceMenu(this.model.snapshot().morningObservations);
    this.dialogue.show([menu()], {
      onChoice: (choiceId) => {
        const observation = choiceId.startsWith('morning-') && choiceId !== 'morning-done' ? choiceId.replace('morning-', '') : null;
        if (observation && MORNING_EVIDENCE_RESPONSES[choiceId]) {
          this.model.observeMorningEvidence(observation);
          return [...MORNING_EVIDENCE_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'morning-done') return [];
        if (!this.model.canConfirmMorningEvidence()) return [...MORNING_EVIDENCE_BLOCKED, menu()];
        this.model.confirmMorningEvidence();
        finished = true;
        return MORNING_EVIDENCE_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.lev.visible = true;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openLevFinal() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => levFinalMenu(this.model.snapshot().finalTimelineTopics);
    this.dialogue.show([...LEV_FINAL_OPENING, menu()], {
      onChoice: (choiceId) => {
        if (LEV_FINAL_RESPONSES[choiceId]) {
          this.model.noteFinalTimelineTopic(choiceId.replace('lev-final-', ''));
          return [...LEV_FINAL_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'lev-final-done') return [];
        if (!this.model.canCompleteLevFinal()) return [...LEV_FINAL_BLOCKED, menu()];
        this.model.completeLevFinal();
        finished = true;
        return LEV_FINAL_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openContinuationAndBoard() {
    this.preview.stopWalking();
    let selected = false;
    this.dialogue.show(CONTINUATION_CHOICES, {
      onChoice: (choiceId) => {
        if (!CONTINUATION_RESPONSES[choiceId] || selected) return [];
        selected = this.model.chooseContinuationAttitude(choiceId.replace('continue-', ''));
        return selected ? [...CONTINUATION_RESPONSES[choiceId], ...BOARDING_CONCLUSION] : [];
      },
      onComplete: () => {
        if (!selected || !this.model.boardTrain()) return;
        this.preview.player.position.copy(positionFrom(ENDING_SLICE_POSITIONS.butchBoarded));
        this.endingElapsed = 0;
        this.finalDoor.group.visible = true;
        this.hoveredId = null;
        this.updateObjective();
      },
    });
  }

  updateFinalDeparture(dt) {
    const state = this.model.snapshot();
    if (!state.boardedTrain || state.chapterComplete) return;
    this.model.advanceDeparture(dt * 1000);
    const next = this.model.snapshot();
    const ms = next.departureSequenceMs;
    const doorProgress = ms < 5000 ? 0 : ms < 7000 ? 0.55 * smooth((ms - 5000) / 2000) : ms < 9000 ? 0.55 + 0.45 * smooth((ms - 7000) / 2000) : 1;
    // Production contract: one static doorless carriage shell and one separate
    // door. Only the camera-facing leaf moves; no duplicate open/closed train.
    this.finalDoor.door.position.z = THREE.MathUtils.lerp(2.15, 0, doorProgress);
    if (ms >= 9000 && !this.endingLatchShaken) {
      this.endingLatchShaken = true;
      this.preview.triggerCameraShake(0.28, 0.24);
    }
    if (ms >= 11200 && !this.endingDepartureBases) {
      const roots = ['municipal-tram', 'municipal-tram-car-02', 'municipal-tram-car-03'].map((name) => this.preview.scene.getObjectByName(name)).filter(Boolean);
      roots.push(this.finalDoor.group, this.preview.player);
      this.endingDepartureBases = roots.map((object) => ({ object, position: object.position.clone() }));
    }
    if (ms >= 11200 && this.endingDepartureBases) {
      const travel = 38 * smooth((ms - 11200) / 10400);
      const movement = this.trainDirection.clone().multiplyScalar(travel);
      for (const entry of this.endingDepartureBases) entry.object.position.copy(entry.position).add(movement);
      this.preview.setCameraOverrideTarget(this.finalDoor.group.position.clone());
    }
    if (next.blackout) {
      this.elements.blackout?.classList.add('visible');
      for (const entry of this.endingDepartureBases || []) entry.object.visible = false;
    }
    if (next.chapterComplete && this.chapterEndCard) this.chapterEndCard.style.opacity = '1';
    this.updateObjective();
  }

  update(dt) {
    if (!this.initialized) return;
    this.dialogue.update(dt);
    this.updateFinalDeparture(dt);
    this.updateSunriseOverlook(dt);
    this.updateMorningLevFollow(dt);
    this.updateMorningRouteInterruption();
    if (this.taskBubbleElapsed !== null) {
      this.taskBubbleElapsed += dt;
      if (this.taskBubbleElapsed >= 4.6) {
        this.taskBubbleElapsed = null;
        document.getElementById('task-bubble')?.classList.remove('visible');
      }
    }
    this.updateAmbientCityLife(dt);
    this.groundFireElapsed += dt;
    const animateFireLine = (effect, offset) => {
      if (!effect?.flames.visible) return;
      const attribute = effect.flames.geometry.getAttribute('position');
      const bases = effect.flames.userData.basePositions;
      const phases = effect.flames.userData.phases;
      const count = effect.flames.userData.particleCount;
      for (let index = 0; index < count; index += 1) {
        const positionIndex = index * 3;
        const revealPosition = (bases[positionIndex] + 5.625) / 11.25;
        if (revealPosition > (effect.ignitionProgress ?? 1)) {
          attribute.array[positionIndex + 1] = -10;
          continue;
        }
        const rise = (this.groundFireElapsed * (0.52 + phases[index] * 0.3) + phases[index] + offset) % 1;
        attribute.array[positionIndex] = bases[positionIndex] + Math.sin(this.groundFireElapsed * 2.4 + phases[index] * 9) * 0.055 * rise;
        attribute.array[positionIndex + 1] = bases[positionIndex + 1] + rise * 0.94;
        attribute.array[positionIndex + 2] = bases[positionIndex + 2] + Math.cos(this.groundFireElapsed * 1.9 + phases[index] * 7) * 0.04 * rise;
      }
      attribute.needsUpdate = true;
      for (const flame of effect.flameBand.children) {
        const revealPosition = (flame.position.x + 5.625) / 11.25;
        flame.visible = revealPosition <= (effect.ignitionProgress ?? 1);
        const flicker = Math.sin(this.groundFireElapsed * 7.6 + flame.userData.phase * 11 + offset);
        flame.position.y = flame.userData.baseY + flicker * 0.055;
        flame.scale.x = flame.userData.baseScaleX * (1 - flicker * 0.08);
        flame.scale.y = flame.userData.baseScaleY * (1 + flicker * 0.13);
      }
      effect.mesh.material.opacity = 0.87 + Math.sin(this.groundFireElapsed * 11 + offset) * 0.07;
      effect.glow.material.opacity = 0.3 + Math.sin(this.groundFireElapsed * 6.5 + offset) * 0.08;
      effect.flames.material.opacity = 0.76 + Math.sin(this.groundFireElapsed * 8.7 + offset) * 0.12;
      effect.flameCores.material.opacity = 0.84 + Math.sin(this.groundFireElapsed * 10.3 + offset) * 0.12;
      effect.heatHaze.material.opacity = 0.13 + Math.sin(this.groundFireElapsed * 4.2 + offset) * 0.045;
      if (effect.flameBand.children[0]) {
        effect.flameBand.children[0].material.opacity = 0.69
          + Math.sin(this.groundFireElapsed * 8.1 + offset) * 0.09;
      }
      effect.embers.material.opacity = 0.5 + Math.sin(this.groundFireElapsed * 5.1 + offset * 2) * 0.18;
    };
    animateFireLine(this.groundMessage?.firstEffect, 0);
    animateFireLine(this.groundMessage?.secondEffect, 0.43);
    for (const [index, fireLight] of (this.groundMessage?.fireLights ?? []).entries()) {
      if (!fireLight.visible) continue;
      const reveal = index === 1 ? (this.groundMessage.secondEffect?.ignitionProgress ?? 1) : 1;
      fireLight.intensity = reveal * (18 + Math.sin(this.groundFireElapsed * 7.3 + index) * 2.6
        + Math.sin(this.groundFireElapsed * 13.1 + index * 0.7) * 1.2);
    }

    if (this.nightIgnitionElapsed !== null) {
      this.nightIgnitionElapsed += dt;
      this.nightIgnitionProgress = THREE.MathUtils.clamp(this.nightIgnitionElapsed / 3.6, 0, 1);
      this.groundMessage.setSecondIgnitionProgress(this.nightIgnitionProgress);
      const zoomStart = this.nightFireZoomBefore ?? this.preview.camera.zoom;
      const zoomProgress = smooth(Math.min(1, this.nightIgnitionElapsed / 1.25));
      this.preview.camera.zoom = THREE.MathUtils.lerp(zoomStart, 5.45, zoomProgress);
      this.preview.camera.updateProjectionMatrix();
      if (this.nightIgnitionElapsed >= 5.6) {
        this.nightIgnitionElapsed = null;
        this.nightIgnitionProgress = 1;
        this.groundMessage.setSecondIgnitionProgress(1);
        this.elements.dialogue.panel.classList.remove('cinematic-hold');
        this.dialogue.setAdvanceLocked(false);
        this.dialogue.handleAdvance();
        this.updateObjective();
      }
    }

    if (this.departureElapsed !== null) {
      this.departureElapsed += dt;
      const progress = smooth(this.departureElapsed / 6.2);
      const offset = this.trainDirection.clone().multiplyScalar(38 * progress);
      for (const entry of this.departureBases) entry.object.position.copy(entry.position).add(offset);
      if (this.departureElapsed >= 6.2) {
        for (const entry of this.departureBases) entry.object.visible = false;
        this.departureElapsed = null;
        this.model.completeTrainDeparture();
        this.beginLevArrivalApproach();
      }
    }

    if (this.levWalkElapsed !== null) {
      this.levWalkElapsed += dt;
      const progress = smooth(this.levWalkElapsed / this.levWalkDuration);
      this.lev.position.lerpVectors(this.levWalkStart, this.levWalkTarget, progress);
      const direction = this.levWalkTarget.clone().sub(this.levWalkStart);
      this.lev.rotation.y = Math.atan2(direction.x, direction.z);
      if (this.levWalkElapsed >= this.levWalkDuration) {
        this.lev.position.copy(this.levWalkTarget);
        this.levWalkElapsed = null;
        this.levWalkTarget = null;
        const onComplete = this.levWalkOnComplete;
        this.levWalkOnComplete = null;
        onComplete?.();
      }
    }

    if (this.guideElapsed !== null) {
      this.guideElapsed += dt;
      const progress = smooth(this.guideElapsed / 1.7);
      this.lev.position.lerpVectors(this.guideStart, positionFrom(OPENING_POSITIONS.levInterview), progress);
      const direction = positionFrom(OPENING_POSITIONS.levInterview).sub(this.guideStart);
      this.lev.rotation.y = Math.atan2(direction.x, direction.z);
      if (this.guideElapsed >= 1.7) this.guideElapsed = null;
    }

    if (this.hotelDoorElapsed !== null) {
      this.hotelDoorElapsed += dt;
      const elapsed = this.hotelDoorElapsed;
      if (elapsed < 0.55) {
        this.hotelHall.butchRoomDoor.rotation.y = -Math.PI * 0.5 * smooth(elapsed / 0.55);
      } else if (elapsed < 0.8) {
        this.hotelHall.butchRoomDoor.rotation.y = -Math.PI * 0.5;
        if (!this.hotelDoorClosing) {
          this.hotelDoorClosing = true;
          const onComplete = this.hotelDoorOnComplete;
          this.hotelDoorOnComplete = null;
          onComplete?.();
        }
      } else {
        this.hotelHall.butchRoomDoor.rotation.y = -Math.PI * 0.5 * (1 - smooth((elapsed - 0.8) / 0.55));
      }
      if (elapsed >= this.hotelDoorDuration) {
        this.hotelHall.butchRoomDoor.rotation.y = 0;
        this.hotelDoorElapsed = null;
        this.hotelDoorOnComplete = null;
        this.hotelDoorClosing = false;
        this.updateObjective();
        this.updateOutlines();
      }
    }

    if (this.levHotelExitElapsed !== null) {
      this.levHotelExitElapsed += dt;
      const elapsed = this.levHotelExitElapsed;
      if (elapsed < 0.55) {
        this.hotelHall.butchRoomDoor.rotation.y = -Math.PI * 0.5 * smooth(elapsed / 0.55);
      } else if (elapsed < 2.25) {
        this.hotelHall.butchRoomDoor.rotation.y = -Math.PI * 0.5;
      } else if (elapsed < 2.85) {
        this.hotelHall.butchRoomDoor.rotation.y = -Math.PI * 0.5 * (1 - smooth((elapsed - 2.25) / 0.6));
      } else {
        this.hotelHall.butchRoomDoor.rotation.y = 0;
      }
      const threshold = positionFrom(HOTEL_POSITIONS.levDoorThreshold);
      const corridorExit = positionFrom(HOTEL_POSITIONS.levCorridorExit);
      if (elapsed < 2.05) {
        const doorProgress = smooth(THREE.MathUtils.clamp((elapsed - 0.25) / 1.8, 0, 1));
        this.lev.position.lerpVectors(this.levHotelExitStart, threshold, doorProgress);
      } else {
        const corridorProgress = smooth(THREE.MathUtils.clamp((elapsed - 2.05) / 5.5, 0, 1));
        this.lev.position.lerpVectors(threshold, corridorExit, corridorProgress);
      }
      const facingTarget = elapsed < 2.05 ? threshold : corridorExit;
      const direction = facingTarget.clone().sub(this.lev.position);
      if (direction.lengthSq() > 0.0001) this.lev.rotation.y = Math.atan2(direction.x, direction.z);
      if (elapsed >= 7.75) this.lev.visible = false;
      if (elapsed >= 8.0) {
        this.hotelHall.butchRoomDoor.rotation.y = 0;
        this.lev.visible = false;
        this.levHotelExitElapsed = null;
        this.levHotelExitStart = null;
        this.updateObjective();
        this.updateOutlines();
      }
    }

    const clock = this.model.snapshot().clock;
    this.flipClock.setClock(clock);
    if (clock.period !== this.lastObjectivePeriod) {
      this.lastObjectivePeriod = clock.period;
      this.updateObjective();
    }
    if (!this.insideMinistry && !this.insideArchive && !this.insideHotel) {
      this.timeVisual.requestClock(clock);
      this.timeVisual.update(dt);
    }

    this.updateCharacterAnimations(dt);
    this.updateDiagnosticState();
  }

  updateInteractionLabel() {
    const interaction = this.eligibleInteractions().find((entry) => entry.id === this.hoveredId);
    if (!interaction) {
      this.elements.interactionLabel.classList.remove('visible');
      return;
    }
    this.elements.interactionLabel.textContent = interaction.label;
    this.elements.interactionLabel.style.left = `${this.pointerClient.x}px`;
    this.elements.interactionLabel.style.top = `${this.pointerClient.y}px`;
    this.elements.interactionLabel.classList.add('visible');
  }

  updateOutlines() {
    for (const interaction of this.interactions) {
      interaction.outline.visible = interaction.eligible()
        && (this.tabHeld || interaction.id === this.hoveredId);
    }
  }

  updateObjective() {
    const state = this.model.snapshot();
    this.flipClock.setClock(state.clock);
    if (this.characterQa) {
      this.elements.objectiveTitle.textContent = 'SHARED CHARACTER RIG TEST';
      this.elements.objectiveDetail.textContent = `Seven optimized models · ${this.characterQaAction.toUpperCase()} active`;
      this.elements.statusElement.textContent = `CHARACTER LAB · ${this.characters.state().filter((entry) => entry.loaded).length}/${this.characters.state().length} INSTANCES READY`;
      return;
    }
    let title = 'FOLLOW MARA\'S FIRST LEAD';
    let detail = 'Show the photograph or check the platform before the train leaves.';
    if (state.chapterComplete) {
      title = 'CHAPTER 03 COMPLETE';
      detail = 'The eastbound train has entered the tunnel.';
    } else if (state.boardedTrain) {
      title = state.blackout ? 'THE TRAIN ENTERS THE TUNNEL' : 'LEAVE ECHO CITY';
      detail = state.blackout
        ? 'The exterior view disappears; the carriage sound runs out in the dark.'
        : 'The heavy carriage door closes before the eastbound train departs.';
    } else if (state.levFinalComplete) {
      title = 'BOARD THE EASTBOUND TRAIN';
      detail = 'Lev remains on the platform. Butch must decide why the search continues.';
    } else if (state.morningEvidenceConfirmed && state.sunriseReturned) {
      title = 'RECONSTRUCT THE CASE WITH LEV';
      detail = 'Lev is beside you with Mara’s original eastbound reservation. Compare it with the daylight findings.';
    } else if (state.sunriseViewed && !state.sunriseReturned) {
      title = 'RETURN TO THE STREET';
      detail = 'Take the same timber walk down from the overlook. The eastbound platform is next.';
    } else if (state.sunriseClimbStarted && !state.sunriseViewed) {
      title = this.overlookTravelElapsed === null ? 'SIT FOR FIVE MINUTES' : 'CLIMB THE OLD SERVICE PATH';
      detail = this.overlookTravelElapsed === null
        ? 'The bench faces the dawn beyond the tunnel ridge.'
        : 'Butch and Lev follow the narrow switchback above the rail cutting.';
    } else if (state.morningReservationCollected && !state.sunriseReturned && !this.insideHotel) {
      title = 'FIND THE OLD SERVICE PATH';
      detail = state.morningFireEncountered
        ? 'Continue west to the timber inspection walk. The scorch marks remain an open lead you can inspect now or after sunrise.'
        : 'The timber inspection walk begins on the west side of the tunnel cutting. Lev says there is time.';
    } else if (state.sunriseReturned && state.morningFireEncountered && !state.morningEvidenceConfirmed && !this.insideHotel) {
      title = 'INSPECT THE SCORCHED LETTERS';
      detail = 'Confirm both burned rows, the reconnected feed and the physical ash before meeting Lev at the station.';
    } else if (state.sunriseReturned && !this.insideHotel) {
      title = 'WALK TO THE EASTBOUND PLATFORM';
      detail = 'Take the central route with Lev before the station stops amending its paper record.';
    } else if (state.morningStarted && !this.insideHotel) {
      title = 'COLLECT THE ORIGINAL RESERVATION';
      detail = 'Nika is waiting at the Transport Ministry entrance with the closed-batch sheet.';
    } else if (state.morningStarted && this.hotelArea === 'room') {
      title = 'LEAVE BUTCH’S ROOM';
      detail = 'Butch wakes alone. The room door opens onto the guest corridor.';
    } else if (state.morningStarted && this.hotelArea === 'corridor') {
      title = 'GO DOWNSTAIRS';
      detail = 'Follow the corridor back to the stair door. The other guest rooms remain closed.';
    } else if (state.morningStarted) {
      title = 'MEET NIKA AT THE MINISTRY';
      detail = 'Collect the original reservation before the station shift changes. Hana has one optional answer before you leave.';
    } else if (this.nightIgnitionElapsed !== null) {
      title = 'WATCH THE SECOND LINE IGNITE';
      detail = this.nightIgnitionProgress < 1
        ? 'Fire is moving through the reconnected lower groove. The dialogue will resume when the full sentence is visible.'
        : 'Both lines are burning. Hold on the complete message before interpreting it.';
    } else if (state.wireReconnected && !state.nightMessageComplete) {
      title = 'READ BOTH BURNING LINES';
      detail = 'Keep the facts separate: Mara was alive when she prepared this, and she says she left by choice.';
    } else if (state.nightFireObserved) {
      title = 'RECONNECT THE LOWER FEED';
      detail = 'The cut ends overlap beside an open clamp. The dark second row is physically prepared to receive current.';
    } else if (state.nightRouteStarted) {
      title = 'FOLLOW THE LIGHT TO THE SQUARE';
      detail = 'The hotel is behind you. The burning first line is the only visible destination.';
    } else if (state.slept && this.hotelArea === 'room') {
      title = 'LEAVE BUTCH’S ROOM';
      detail = 'It is after midnight. Open the room door and step into the silent guest corridor.';
    } else if (state.slept && this.hotelArea === 'corridor') {
      title = 'GO DOWNSTAIRS';
      detail = 'Walk the length of the corridor and use the stair door.';
    } else if (state.slept) {
      title = 'LEAVE THE HOTEL';
      detail = 'The front desk is empty. Orange light reaches the lobby through the street door.';
    } else if (state.evidenceTableComplete) {
      title = 'WAIT FOR MORNING';
      detail = 'No accomplice theory survives the records. The bed is the only useful next step.';
    } else if (state.daroComplete && !state.hotelCorridorEntered) {
      title = 'GO UPSTAIRS';
      detail = 'The lobby interviews are finished. Use the stair door beside the front desk.';
    } else if (state.daroComplete && !state.hotelRoomEntered) {
      title = 'FIND BUTCH’S ROOM';
      detail = 'Walk to the single door at the end of the guest corridor.';
    } else if (state.daroComplete) {
      title = 'TEST EVERY EXPLANATION WITH LEV';
      detail = state.hotelRoomEntered
        ? 'Use the evidence table. Lev will bring each record into the conversation when it becomes relevant.'
        : 'Go upstairs to Butch’s room and test the complete sequence with Lev.';
    } else if (this.departureElapsed !== null) {
      title = 'WATCH THE TRAIN LEAVE';
      detail = 'The exterior camera remains with Butch on the station platform.';
    } else if (state.hotelCheckInComplete) {
      title = 'QUESTION DARO AT THE WINDOW';
      detail = 'Hana saw Mara leave alone. Daro can confirm the route beyond the corner.';
    } else if (state.hotelEntered) {
      title = 'QUESTION HANA';
      detail = 'Read the guest register, then establish whether Mara was alone and when she left.';
    } else if (state.interaction22Complete) {
      title = 'CHECK IN AT THE COPPER HERON';
      detail = 'The archive is closed. The next train leaves tomorrow morning.';
    } else if (state.secondTheoryComplete) {
      title = 'INSPECT THE CUT INTERFACE';
      detail = state.clock.period === 'NIGHT'
        ? 'The night light still leaves both loose ends and the old clamp readable beside the lower row.'
        : 'Low dusk light reveals both loose ends beside the lower row and its old clamp.';
    } else if (state.materialTimelineInspected) {
      title = 'TEST EVERY THEORY WITH LEV';
      detail = 'Outside the archive, test the market, the city, Petar and Lev against the complete timeline.';
    } else if (state.petarInterviewComplete) {
      title = 'ASSEMBLE THE MATERIAL TIMELINE';
      detail = 'Mila has placed the sale, delivery, request, reservation, review and tool records on the centre table.';
    } else if (state.maintenanceOrderInspected) {
      title = 'QUESTION PETAR';
      detail = 'He signed C-441 and is returning his tools in the archive staff corridor.';
    } else if (state.archiveMapInspected) {
      title = 'READ MAINTENANCE ORDER C-441';
      detail = 'The current order is clipped to the side-desk maintenance ledger.';
    } else if (state.archiveEntered) {
      title = 'COMPARE THE SQUARE WITH THE OLD PLAN';
      detail = 'Mila placed the fire-letter plan on the central map table. Ana can explain the legend if needed.';
    } else if (state.interaction14Complete) {
      title = 'TAKE THE MAINTENANCE NUMBER TO THE ARCHIVE';
      detail = 'The two-line layout is confirmed. The old archive can identify who interrupted the second feed.';
    } else if (state.squareBoskoInterviewed) {
      title = 'INSPECT THE PLAZA GROOVES';
      detail = 'Bosko marked two long rows along the south edge of the clock paving.';
    } else if (state.firstTheoryTested) {
      title = 'QUESTION BOSKO IN THE SQUARE';
      detail = 'Ask for the actions he saw, not his interpretation of Mara\'s motives.';
    } else if (state.discardedPrintInspected) {
      title = 'TEST THE THEORY WITH LEV';
      detail = 'Outside the ministry, compare each concealment with what that person could actually know.';
    } else if (state.nikaComplete) {
      title = 'INSPECT NIKA\'S DISCARDED PRINTOUT';
      detail = 'The torn first copy is visible beside the waste bin near her terminal.';
    } else if (state.savaComplete) {
      title = 'COMPARE THE RECORDS WITH NIKA';
      detail = 'Her terminal can place the sale, service hatch, maintenance request and reservation on one timeline.';
    } else if (state.interaction07Complete) {
      title = 'QUESTION SAVA';
      detail = `${state.transportNumber} has been called at counter one. Sava can explain the retired service code.`;
    } else if (state.transportHallEntered) {
      title = 'TAKE A PUBLIC SERVICES NUMBER';
      detail = 'The brass dispenser stands to the left of the queue rails.';
    } else if (state.transportEntranceReached) {
      title = 'ENTER THE PUBLIC HALL';
      detail = 'Toma has directed Butch and Lev to Public Services.';
    } else if (state.marketLeadComplete) {
      title = 'CHECK THE TRANSPORT MINISTRY';
      detail = 'Olek left Mara\'s oil at its rear service hatch. Public access is at the front.';
    } else if (state.edaComplete) {
      title = 'QUESTION THE DELIVERY PORTER';
      detail = 'Eda\'s altered sales copy names Olek. He is beside the grey handcart.';
    } else if (state.firstLeadUnlocked) {
      title = 'ASK WHO SUPPLIED THE OIL';
      detail = 'Eda sells lamp oil under the blue canvas in the market.';
    } else if (state.explorationBriefingComplete) {
      title = 'INSPECT THE OIL LINE';
      detail = 'Lev marked a dark seam between the station and the square.';
    } else if (state.guideStarted) {
      title = 'ENTER THE SQUARE WITH LEV';
      detail = 'He will show you where the oil trail becomes visible.';
    } else if (state.levIntroduced) {
      title = 'WALK THE SCENE WITH LEV';
      detail = 'Lev is leading Butch toward the first visible section of the oil line.';
    } else if (state.trainDeparted) {
      title = this.dialogue.active ? 'LEV INTRODUCES HIMSELF' : 'THE INVESTIGATOR APPROACHES';
      detail = this.dialogue.active
        ? 'The investigator has come to Butch and opened the conversation.'
        : 'Lev is crossing from the station exit toward Butch.';
    }
    this.elements.statusElement.textContent = title;
    if (this.elements.objectiveTitle) this.elements.objectiveTitle.textContent = title;
    if (this.elements.objectiveDetail) this.elements.objectiveDetail.textContent = detail;
    const parallel = document.getElementById('objective-parallel');
    if (parallel) {
      const morningParallelActive = state.morningReservationCollected && !state.levFinalComplete;
      parallel.classList.toggle('visible', morningParallelActive);
      if (morningParallelActive) {
        const sunriseStatus = state.sunriseReturned ? 'DONE' : state.sunriseViewed ? 'RETURN' : 'OPEN';
        const fireStatus = state.morningEvidenceConfirmed ? 'DONE' : state.morningFireEncountered ? 'OPEN' : 'UNDISCOVERED';
        parallel.innerHTML = `
          <div class="parallel-task ${state.sunriseReturned ? 'done' : ''}"><span>WATCH THE SUNRISE</span><b>${sunriseStatus}</b></div>
          <div class="parallel-task ${state.morningEvidenceConfirmed ? 'done' : ''} ${state.morningFireEncountered ? '' : 'undiscovered'}"><span>CHECK THE SCORCHED LETTERS</span><b>${fireStatus}</b></div>
        `;
      }
    }
  }

  updateDiagnosticState() {
    this.preview.container.dataset.gameState = JSON.stringify(this.textState());
  }

  textState() {
    const state = this.model.snapshot();
    const actorPosition = (actor) => actor
      ? [actor.position.x, actor.position.y, actor.position.z].map((value) => Number(value.toFixed(2)))
      : null;
    const visibleCapsules = [];
    this.preview.scene.traverse((object) => {
      if (object.geometry?.type !== 'CapsuleGeometry') return;
      let visible = object.visible;
      for (let parent = object.parent; visible && parent; parent = parent.parent) {
        visible = parent.visible;
      }
      if (!visible) return;
      const worldPosition = new THREE.Vector3();
      object.getWorldPosition(worldPosition);
      visibleCapsules.push({
        mesh: object.name || '(unnamed capsule)',
        host: object.parent?.name || '(unnamed host)',
        world: actorPosition({ position: worldPosition }),
      });
    });
    return {
      slice: 'chapter-03-opening',
      location: this.insideMinistry
        ? 'transport-ministry-public-hall'
        : this.insideArchive
          ? 'old-municipal-archive-reading-room'
          : this.insideHotel
            ? this.hotelArea === 'room'
              ? 'copper-heron-private-room'
              : this.hotelArea === 'corridor'
                ? 'copper-heron-guest-corridor'
                : 'copper-heron-lobby'
          : 'echo-city-exterior',
      time: state.clock.time,
      period: state.clock.period,
      clock: state.clock,
      timeVisual: this.timeVisual.snapshot(),
      flipClock: this.flipClock.snapshot(),
      evidenceViewer: this.evidenceViewer.snapshot(),
      objective: this.elements.statusElement.textContent,
      state,
      hoveredInteraction: this.hoveredId,
      tabScanHeld: this.tabHeld,
      eligibleInteractions: this.eligibleInteractions().map((interaction) => interaction.id),
      dialogue: this.dialogue.snapshot(),
      evidence: state.evidence,
      characterRig: {
        qa: this.characterQa,
        qaAction: this.characterQaAction,
        instances: this.characters.state(),
        visibleCapsules,
      },
      replacementAssets: this.replacements.state(),
      sequences: {
        trainDepartureActive: this.departureElapsed !== null,
        trainDepartureSeconds: this.departureElapsed === null ? null : Number(this.departureElapsed.toFixed(2)),
        levGuideActive: this.guideElapsed !== null,
        levWalkActive: this.levWalkElapsed !== null,
        levWalkTarget: this.levWalkTarget
          ? actorPosition({ position: this.levWalkTarget })
          : null,
        levHotelExitActive: this.levHotelExitElapsed !== null,
        hotelDoorAnimationActive: this.hotelDoorElapsed !== null,
        nightIgnitionActive: this.nightIgnitionElapsed !== null,
        nightIgnitionSeconds: this.nightIgnitionElapsed === null ? null : Number(this.nightIgnitionElapsed.toFixed(2)),
        nightIgnitionProgress: Number(this.nightIgnitionProgress.toFixed(3)),
        nightExteriorMovementUnlocked: state.nightRouteStarted && !this.insideHotel && !this.interactionLocked(),
        chapterDepartureMs: state.departureSequenceMs,
        chapterBlackout: state.blackout,
        chapterAudioSilent: state.audioSilent,
        sunriseTravelMode: this.overlookTravelMode,
        sunriseTravelSeconds: this.overlookTravelElapsed === null ? null : Number(this.overlookTravelElapsed.toFixed(2)),
        sunriseViewActive: this.sunriseElapsed !== null,
        sunriseViewSeconds: this.sunriseElapsed === null ? null : Number(this.sunriseElapsed.toFixed(2)),
      },
      actors: {
        butch: actorPosition(this.preview.player),
        maraPresent: false,
        lev: this.lev.visible ? actorPosition(this.lev) : null,
        eda: actorPosition(this.eda),
        olek: actorPosition(this.olek),
        toma: actorPosition(this.toma),
        produceVendor: actorPosition(this.produceVendor),
        flowerVendor: actorPosition(this.flowerVendor),
        hana: this.hotelArea === 'lobby' && this.hotelHall?.hana.visible ? actorPosition(this.hotelHall.hana) : null,
        irena: this.hotelArea === 'lobby' && this.hotelHall?.irena.visible ? actorPosition(this.hotelHall.irena) : null,
        vesna: this.hotelArea === 'lobby' && this.hotelHall?.vesna.visible ? actorPosition(this.hotelHall.vesna) : null,
        daro: this.hotelArea === 'lobby' && this.hotelHall?.daro.visible ? actorPosition(this.hotelHall.daro) : null,
        sava: actorPosition(this.ministryHall?.sava),
        nika: actorPosition(this.ministryHall?.nika),
        bosko: actorPosition(this.ministryHall?.bosko),
        squareBosko: this.squareBosko?.visible ? actorPosition(this.squareBosko) : null,
        archiveMilaExterior: this.archiveMilaExterior?.visible ? actorPosition(this.archiveMilaExterior) : null,
        morningNika: this.morningNika?.visible ? actorPosition(this.morningNika) : null,
        alleyGangsterA: this.alleyGangsterA?.visible ? actorPosition(this.alleyGangsterA) : null,
        alleyGangsterB: this.alleyGangsterB?.visible ? actorPosition(this.alleyGangsterB) : null,
        alleyResident: this.alleyResident?.visible ? actorPosition(this.alleyResident) : null,
        mila: this.insideArchive ? actorPosition(this.archiveHall?.mila) : null,
        ana: this.insideArchive ? actorPosition(this.archiveHall?.ana) : null,
        petar: this.insideArchive ? actorPosition(this.archiveHall?.petar) : null,
      },
      props: {
        cartModelFound: Boolean(this.cartObject),
        solventBottle: actorPosition(this.bottle),
        lampOilStall: actorPosition(this.lampOilStall),
        queueDispenser: actorPosition(this.ministryHall?.queueDispenser),
        queueTicketVisible: this.ministryHall?.queueTicket?.visible ?? false,
        discardedPrintVisible: this.ministryHall?.discardedPrint?.visible ?? false,
        plazaGrooves: actorPosition(this.plazaGrooves?.group),
        archiveMapTable: this.insideArchive ? actorPosition(this.archiveHall?.mapTable) : null,
        maintenanceOrder: this.insideArchive ? actorPosition(this.archiveHall?.workOrderDesk) : null,
        materialTimelineVisible: this.archiveHall?.timeline?.visible ?? false,
        cutInterfaceVisible: this.cutInterface?.group?.visible ?? false,
        hotelArea: this.hotelArea,
        hotelEvidenceTable: this.hotelArea === 'room' ? actorPosition(this.hotelHall?.evidenceTable) : null,
        hotelEvidencePaperCount: this.hotelArea === 'room' ? this.hotelHall?.evidencePapers.length ?? 0 : 0,
        hotelBed: this.hotelArea === 'room' ? actorPosition(this.hotelHall?.bed) : null,
        hotelCorridorEntrance: this.hotelArea === 'lobby' ? actorPosition(this.hotelHall?.corridorEntrance) : null,
        hotelBackgroundDoorCount: this.hotelArea === 'corridor' ? this.hotelHall?.backgroundDoors.length ?? 0 : 0,
        hotelPrivateRoomDoor: this.hotelArea === 'corridor' ? actorPosition(this.hotelHall?.butchRoomDoor) : null,
        hotelPrivateRoomDoorRotation: Number((this.hotelHall?.butchRoomDoor.rotation.y ?? 0).toFixed(3)),
        nightMessageFirstVisible: this.groundMessage?.first?.visible ?? false,
        nightMessageSecondVisible: this.groundMessage?.second?.visible ?? false,
        sunriseRouteVisible: this.sunriseOverlook?.group?.visible ?? false,
        sunriseBench: actorPosition(this.sunriseOverlook?.bench),
        sunriseTableauVisible: this.elements.sunriseTableau?.classList.contains('visible') ?? false,
        finalTrainDoorVisible: this.finalDoor?.group?.visible ?? false,
        dreamRendering: document.body.dataset.chapter3DreamRendering ?? 'clear',
        chapterEndCardVisible: Number(this.chapterEndCard?.style.opacity || 0) > 0,
      },
    };
  }
}
