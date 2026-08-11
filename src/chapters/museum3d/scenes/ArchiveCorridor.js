// Beat 2 — packaged Chapter 5 archive corridor.
// Doors 1–2 belong to this route. Doors 3–4 remain authored as standalone
// slices, represented here only by sealed, inert archive shutters.
//
// Layout: x ∈ [8, 34], z ∈ [-2, 2], ceiling 3.2. Entrance from lobby at x=8.

import * as THREE from 'three';
import { COLORS } from '../config.js';
import { mat, emissiveMat, flatMat, box, plane, label, fluorescentFixture, glassMat, hitProxy } from '../util/graybox.js';
import { createMuseumMaterialLibrary } from '../assets/MuseumMaterials.js';
import { addAcousticCeilingGrid, createGuidePedestal, createPublicBench, createWallRadiator } from '../assets/MuseumProps.js';
import { CHAPTER05_DIRECTIONS, isDirectionPlayable } from '../directions/directionRegistry.js';
import { directionAtDoorway } from '../directions/directionDoorways.js';
import { animateReturnArtifact, createReturnArtifact } from '../assets/ReturnArtifacts.js';

const WALL_H = 3.2;
const WALL_T = 0.3;

export class ArchiveCorridor {
  constructor() {
    this.name = 'corridor';
    this.root = new THREE.Group();
    this.root.name = 'archive-corridor';
    this.background = new THREE.Color(0x12100c);
  }

  build(ctx) {
    this.ctx = ctx;
    const { collisionWorld } = ctx;
    const g = this.root;
    this.materials = createMuseumMaterialLibrary();
    const cx = 25; // corridor center x
    const len = 34;

    // shell
    plane(g, { x: cx, z: 0, w: len, h: 4, material: this.materials.carpet, name: 'floor' });
    plane(g, { x: cx, y: 0.005, z: 0, w: len, h: 1.6, material: this.materials.carpetLane, name: 'lane' });
    plane(g, { x: cx, y: WALL_H, z: 0, w: len, h: 4, material: this.materials.ceilingTile, rotationX: Math.PI / 2, name: 'ceiling' });
    addAcousticCeilingGrid(g, { width: len, depth: 4, y: WALL_H - 0.012, centerX: cx });

    const wall = this.materials.wallDark;
    const lower = this.materials.wallDark;
    const rail = this.materials.oliveSteel;
    // south wall (solid)
    box(g, { x: cx, y: WALL_H / 2, z: 2, w: len, h: WALL_H, d: WALL_T, material: wall, name: 'wall-south', collide: true, collisionWorld });
    box(g, { x: cx, y: 0.63, z: 1.82, w: len - 0.3, h: 1.08, d: 0.05, material: lower, name: 'wainscot-south' });
    box(g, { x: cx, y: 1.18, z: 1.86, w: len - 0.3, h: 0.09, d: 0.07, material: rail, name: 'chair-rail-south' });
    // end wall — deliberately blank. The corridor ends; it is not a fifth
    // destination or a labelled staff route.
    box(g, { x: 42, y: WALL_H / 2, z: 0, w: WALL_T, h: WALL_H, d: 4, material: wall, name: 'wall-end', collide: true, collisionWorld });

    // The open west threshold is the route back to the ordinary front lobby.
    // Warm spill and the continuing carpet lane make the return leg readable
    // without another sign.
    box(g, { x: 8.12, y: 2.85, z: 0, w: 0.28, h: 0.42, d: 3.1, material: this.materials.oliveSteel, name: 'lobby-return-lintel' });
    box(g, { x: 8.12, y: 1.4, z: -1.58, w: 0.28, h: 2.8, d: 0.16, material: this.materials.oliveSteel, name: 'lobby-return-frame-n' });
    box(g, { x: 8.12, y: 1.4, z: 1.58, w: 0.28, h: 2.8, d: 0.16, material: this.materials.oliveSteel, name: 'lobby-return-frame-s' });
    const lobbyGlow = new THREE.RectAreaLight(0xffd39a, 3.4, 2.7, 2.6);
    lobbyGlow.position.set(8.18, 1.45, 0);
    lobbyGlow.rotation.y = Math.PI / 2;
    g.add(lobbyGlow);

    // The four-number archive rhythm remains visible. Only the first two gaps
    // contain playable door frames in the packaged route.
    const gaps = [14, 22, 30, 38];
    let cursor = 8;
    for (const gx of gaps) {
      const segW = gx - 1 - cursor;
      const segX = cursor + segW / 2;
      box(g, { x: segX, y: WALL_H / 2, z: -2, w: segW, h: WALL_H, d: WALL_T, material: wall, name: `wall-n-${cursor}`, collide: true, collisionWorld });
      box(g, { x: segX, y: 0.63, z: -1.82, w: Math.max(0.05, segW - 0.12), h: 1.08, d: 0.05, material: lower, name: `wainscot-n-${cursor}` });
      box(g, { x: segX, y: 1.18, z: -1.86, w: Math.max(0.05, segW - 0.12), h: 0.09, d: 0.07, material: rail, name: `chair-rail-n-${cursor}` });
      box(g, { x: gx, y: 2.85, z: -2, w: 2.0, h: 0.7, d: WALL_T, material: wall, name: `lintel-${gx}` });
      cursor = gx + 1;
    }
    const endW = 42 - cursor;
    const endX = (cursor + 42) / 2;
    box(g, { x: endX, y: WALL_H / 2, z: -2, w: endW, h: WALL_H, d: WALL_T, material: wall, name: 'wall-n-end', collide: true, collisionWorld });
    box(g, { x: endX, y: 0.63, z: -1.82, w: Math.max(0.05, endW - 0.12), h: 1.08, d: 0.05, material: lower, name: 'wainscot-n-end' });
    box(g, { x: endX, y: 1.18, z: -1.86, w: Math.max(0.05, endW - 0.12), h: 0.09, d: 0.07, material: rail, name: 'chair-rail-n-end' });

    // fluorescent strips
    for (const fx of [11, 17, 23, 29, 35, 40]) {
      fluorescentFixture(g, { x: fx, z: 0, ceilingY: WALL_H, length: 2.6 });
    }

    // ---- Two packaged doors, followed by two inert standalone shutters. ----
    this._recordDoors = [];
    this.labyrinthScreen = this._numberedDoor(g, {
      x: 14,
      id: 'labyrinth',
      number: 1,
      screenColor: 0x21131a,
    });
    this.borrowedGridScreen = this._numberedDoor(g, {
      x: 22,
      id: 'borrowed-grid',
      number: 2,
      screenColor: 0x09232b,
    });

    // Records 3 and 4 are standalone slices. The museum constructs only
    // closed shutters here: no portal, evidence case, hit target, or niche.
    this._sealNumberedDoor(g, { x: 30, number: 3, id: 'echo-city' });
    this._sealNumberedDoor(g, { x: 38, number: 4, id: 'painted-country' });

    // Return niches exist only for the two artifacts filed by this route.
    this.artifactNiches = new Map();
    for (const [id, x] of [
      [CHAPTER05_DIRECTIONS.LABYRINTH, 14],
      [CHAPTER05_DIRECTIONS.BORROWED_GRID, 22],
    ]) {
      this.artifactNiches.set(id, this._artifactNiche(g, { id, x }));
    }

    // guide stand — south side on pass 1, north side after the loop
    this.guideStand = new THREE.Group();
    g.add(this.guideStand);
    const guideAssembly = createGuidePedestal(this.materials);
    this.guideStand.add(guideAssembly.group);
    hitProxy(this.guideStand, { x: 0, y: 1.2, z: 0, w: 0.8, h: 0.9, d: 0.8, name: 'corridor-guide-proxy' });
    this._applyStandSide('south');

    // Waiting furniture is ordinary civic stock, not abstract gray boxes.
    for (const bx of [17.5, 26.5]) {
      const bench = createPublicBench(this.materials);
      bench.position.set(bx, 0, 1.62);
      g.add(bench);
      collisionWorld.addBoxFromCenterSize(bx, 1.62, 1.75, 0.52, `bench-${bx}`);
    }
    for (const rx of [10.5, 34.5]) {
      const radiator = createWallRadiator(this.materials, { width: 1.25 });
      radiator.position.set(rx, 0, 1.78);
      radiator.rotation.y = Math.PI;
      g.add(radiator);
    }

    // Lights share the lobby's fluorescent language but become more uneven
    // down the long archive run. Broad ceiling emitters keep the cases legible;
    // the soft directional key supplies the contact shadows the old graybox
    // lacked.
    g.add(new THREE.HemisphereLight(0xffefd3, 0x3e372f, 0.48));
    for (const fx of [11, 17, 23, 29, 35, 40]) {
      const fluorescent = new THREE.RectAreaLight(0xffedc5, fx === 29 ? 2.2 : 2.8, 0.48, 2.5);
      fluorescent.position.set(fx, WALL_H - 0.13, 0);
      fluorescent.rotation.x = -Math.PI / 2;
      g.add(fluorescent);
    }
    const key = new THREE.DirectionalLight(0xffe3b6, 1.25);
    key.position.set(17, 7, 5);
    key.target.position.set(22, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 22;
    key.shadow.bias = -0.00025;
    key.shadow.normalBias = 0.035;
    g.add(key, key.target);

    // trigger zones
    this._doorwayDirection = null;
    this._lobbyReturnZone = { minX: 7.6, maxX: 8.55, minZ: -1.55, maxZ: 1.55 };

    g.traverse((object) => {
      if (!object.isMesh) return;
      object.receiveShadow = true;
      object.castShadow = !/(wall|floor|ceiling|lane|glass|tube)/i.test(object.name);
    });
  }

  _numberedDoor(g, { x, id, number, screenColor }) {
    box(g, {
      x, y: 1.25, z: -1.98, w: 2.0, h: 2.5, d: 0.14,
      material: this.materials.walnutDark, name: `${id}-terminal`,
      collide: true, collisionWorld: this.ctx.collisionWorld,
    });
    box(g, {
      x, y: 1.25, z: -1.89, w: 1.58, h: 2.08, d: 0.025,
      material: emissiveMat(screenColor), name: `${id}-screen`,
    });
    box(g, {
      x: x + 0.62, y: 1.02, z: -1.85, w: 0.09, h: 0.09, d: 0.05,
      material: this.materials.brass, name: `${id}-control-rail`,
    });
    label(g, String(number), { x, y: 1.45, z: -1.84, w: 0.62, h: 0.82, fg: '#d8d4c9', bg: '#111416', font: 'bold 280px Georgia, serif' });
    // Keep the target broad, but leave it as a thin plane behind the player's
    // nearest legal standing position. A deep box reaches into the collision
    // boundary and lets the camera end up *inside* the proxy; Three's default
    // front-face raycast then cannot see a way back out of it.
    return hitProxy(g, {
      x, y: 1.35, z: -1.82, w: 2.4, h: 2.3, d: 0.12,
      name: `${id}-interaction-proxy`,
    });
  }

  _sealNumberedDoor(g, { x, number, id }) {
    const shutter = new THREE.Group();
    shutter.name = `${id}-standalone-shutter`;
    shutter.position.set(x, 0, -1.73);
    g.add(shutter);
    box(shutter, {
      x: 0, y: 1.25, z: 0, w: 1.86, h: 2.32, d: 0.08,
      material: this.materials.oliveSteel,
      name: `${id}-standalone-panel`,
      collide: true,
      collisionWorld: this.ctx.collisionWorld,
    });
    for (const y of [0.38, 0.76, 1.14, 1.52, 1.9, 2.26]) {
      box(shutter, { x: 0, y, z: 0.055, w: 1.68, h: 0.028, d: 0.025, material: this.materials.brass, name: 'sealed-rail' });
    }
    box(shutter, { x: 0, y: 1.26, z: 0.085, w: 0.66, h: 0.9, d: 0.035, material: this.materials.walnutDark, name: 'sealed-number-plate' });
    label(shutter, String(number), { x: 0, y: 1.34, z: 0.112, w: 0.56, h: 0.76, fg: '#b6b09e', bg: '#111416', font: 'bold 280px Georgia, serif' });
    const lock = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 20), this.materials.brass);
    lock.name = 'sealed-lock-ring';
    lock.position.set(0.59, 0.54, 0.11);
    lock.rotation.x = Math.PI / 2;
    shutter.add(lock);
  }

  _artifactNiche(g, { id, x }) {
    const group = new THREE.Group();
    group.name = `${id}-return-niche`;
    group.position.set(x, 0, 1.86);
    g.add(group);
    box(group, { x: 0, y: 1.35, z: 0.07, w: 1.5, h: 1.15, d: 0.16, material: this.materials.walnutDark, name: `${id}-niche-frame` });
    box(group, { x: 0, y: 1.35, z: -0.03, w: 1.23, h: 0.9, d: 0.08, material: emissiveMat(0x080a0b, 0.2), name: `${id}-niche-back` });
    box(group, { x: 0, y: 1.35, z: -0.24, w: 1.28, h: 0.94, d: 0.012, material: glassMat(), name: `${id}-niche-glass` });
    const artifact = createReturnArtifact(id);
    artifact.position.set(0, 1.34, -0.17);
    artifact.scale.setScalar(id === CHAPTER05_DIRECTIONS.LABYRINTH
      ? 1.1
      : id === CHAPTER05_DIRECTIONS.ECHO_CITY ? 1.3 : 1.22);
    artifact.rotation.y = Math.PI;
    artifact.visible = false;
    group.add(artifact);
    const light = new THREE.PointLight(id === CHAPTER05_DIRECTIONS.BORROWED_GRID ? 0x55ddd5 : 0xffd7a1, 0, 2.2, 2);
    light.position.set(0, 1.6, -0.55);
    group.add(light);
    const proxy = hitProxy(group, { x: 0, y: 1.35, z: -0.32, w: 1.5, h: 1.15, d: 0.12, name: `${id}-niche-interaction-proxy` });
    return { group, artifact, light, proxy, displayed: false };
  }

  _syncArtifacts() {
    const snapshot = this.ctx.directionProgress.getSnapshot();
    for (const [id, niche] of this.artifactNiches) {
      const displayed = snapshot.artifacts[id]?.displayed === true;
      niche.displayed = displayed;
      niche.artifact.visible = displayed;
      niche.light.intensity = displayed ? (id === CHAPTER05_DIRECTIONS.BORROWED_GRID ? 1.2 : 0.72) : (snapshot.carriedArtifact === id ? 0.3 : 0);
    }
  }

  _recordDoor(g, { x, id, title, status, description = null, doorColor }) {
    const door = box(g, { x, y: 1.25, z: -2, w: 2.0, h: 2.5, d: 0.12, material: mat(doorColor), name: `${id}-door`, collide: true, collisionWorld: this.ctx.collisionWorld });
    label(g, `${title}\n${status}`, { x, y: 2.55, z: -1.82, w: 2.4, h: 0.6 });
    label(g, status, { x, y: 1.4, z: -1.9, w: 1.5, h: 0.3, bg: '#e8dfc8', fg: '#5a1f1f' });
    box(g, { x: x + 0.7, y: 1.05, z: -1.9, w: 0.08, h: 0.08, d: 0.08, material: mat(COLORS.brass), name: `${id}-knob` });
    this._recordDoors.push({ id, title, status, description, knob: door });
  }

  // Re-registered by Museum3DApp each time this space becomes active.
  registerInteractions() {
    const registerDirection = (id, mesh) => {
      this.ctx.interaction.register(`direction-${id}`, {
        mesh,
        enabled: () => this.ctx.model.getSnapshot().phase === 'corridor',
        prompt: () => this.ctx.directionProgress.getSnapshot().completed[id] ? 'E  ·  FILED' : 'E',
        action: () => this._enterDirection(id),
      });
    };
    registerDirection(CHAPTER05_DIRECTIONS.BORROWED_GRID, this.borrowedGridScreen);
    registerDirection(CHAPTER05_DIRECTIONS.LABYRINTH, this.labyrinthScreen);
    for (const [id, niche] of this.artifactNiches) {
      this.ctx.interaction.register(`display-artifact-${id}`, {
        mesh: niche.proxy,
        enabled: () => this.ctx.model.getSnapshot().phase === 'corridor' && this.ctx.directionProgress.getSnapshot().carriedArtifact === id,
        prompt: 'E',
        action: () => {
          if (this.ctx.displayArtifact(id)) this._syncArtifacts();
        },
      });
    }
    for (const { id, title, status, description, knob } of this._recordDoors) {
      this.ctx.interaction.register(id, {
        mesh: knob,
        enabled: () => this.ctx.model.getSnapshot().phase === 'corridor',
        prompt: `E — ${title}`,
        action: () => {
          this.ctx.dialogue.play([
            { speaker: null, text: description ?? `${title}. ${status}. The label is printed, dated, and honest.` },
          ]);
        },
      });
    }
  }

  _applyStandSide(side) {
    if (side === 'south') {
      this.guideStand.position.set(11, 0, 1.4);
    } else {
      this.guideStand.position.set(11, 0, -1.4);
    }
    const world = this.ctx.collisionWorld;
    world.removeById('corridor-guide-stand');
    world.addBoxFromCenterSize(11, side === 'south' ? 1.4 : -1.4, 0.5, 0.5, 'corridor-guide-stand');
  }

  _inZone(pos, zone) {
    return pos.x >= zone.minX && pos.x <= zone.maxX && pos.z >= zone.minZ && pos.z <= zone.maxZ;
  }

  _enterDirection(id) {
    if (!isDirectionPlayable(id)) return false;
    // A returned artifact still has a dedicated niche and can be placed there
    // manually. If the player walks straight to another numbered door, file it
    // automatically instead of silently disabling every door in the corridor.
    const carriedArtifact = this.ctx.directionProgress.getSnapshot().carriedArtifact;
    if (carriedArtifact) {
      if (!this.ctx.displayArtifact(carriedArtifact)) return false;
      this._syncArtifacts();
      if (this.ctx.directionProgress.getSnapshot().allComplete) return true;
    }
    return this.ctx.openDirection(id);
  }

  enter(snapshot) {
    this._applyStandSide(snapshot.corridor.guideStandSide);
    this._syncArtifacts();
  }

  update(dt, snapshot) {
    const player = this.ctx.controller.position;

    if (this._inZone(player, this._lobbyReturnZone)) this.ctx.goBackToLobby();

    const doorwayDirection = directionAtDoorway(player);
    const enteredDoorway = doorwayDirection && doorwayDirection !== this._doorwayDirection;
    this._doorwayDirection = doorwayDirection;
    if (enteredDoorway
      && snapshot.phase === 'corridor'
      && !this.ctx.directionProgress.getSnapshot().activeDirection) {
      this._enterDirection(doorwayDirection);
    }
    const time = performance.now() / 1000;
    for (const niche of this.artifactNiches.values()) {
      if (niche.displayed) animateReturnArtifact(niche.artifact, time);
    }
  }

  exit() {}

  dispose() {
    this.root.clear();
  }
}
