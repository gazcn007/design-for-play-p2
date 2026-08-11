// Phase transition contract: only TransitionDirector may move the player
// between spaces, and only along these edges.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHASES,
  PHASE_TRANSITIONS,
  canTransition,
} from '../../src/chapters/museum3d/state/chapter05Model.js';
import { PLAYER } from '../../src/chapters/museum3d/config.js';
import { StaticCollisionWorld } from '../../src/chapters/museum3d/player/StaticCollisionWorld.js';
import { ECHO_CITY_ENTRY } from '../../src/chapters/museum3d/scenes/EchoCityWalkingSim.js';
import {
  CITY_MODELS,
  CITY_SURFACE_Y,
  PERIMETER_BUILDINGS,
  PERIMETER_FOOTPRINTS,
  OBSTACLES,
  STATION_LAYOUT,
  boundaryScaleFor,
} from '../../src/chapters/museum3d/echoCityV68/city3dConfig.js';

test('the P0 round trip is lobby → corridor → echo-city → return → collapse → complete', () => {
  assert.equal(canTransition('lobby', 'corridor'), true);
  assert.equal(canTransition('corridor', 'echo-city'), true);
  assert.equal(canTransition('echo-city', 'corridor'), true);
  assert.equal(canTransition('corridor', 'return'), true);
  assert.equal(canTransition('echo-city', 'return'), true);
  assert.equal(canTransition('return', 'collapse'), true);
  assert.equal(canTransition('collapse', 'complete'), true);
});

test('illegal jumps are rejected', () => {
  assert.equal(canTransition('lobby', 'echo-city'), false);
  assert.equal(canTransition('lobby', 'return'), false);
  assert.equal(canTransition('echo-city', 'lobby'), false);
  assert.equal(canTransition('return', 'echo-city'), false);
  assert.equal(canTransition('complete', 'lobby'), false);
});

test('every phase has a defined transition set', () => {
  for (const phase of PHASES) {
    assert.ok(Array.isArray(PHASE_TRANSITIONS[phase]), `missing transitions for ${phase}`);
  }
});

test('Echo City entry spawn stands in front of the black museum threshold', () => {
  const world = new StaticCollisionWorld();
  for (const spec of PERIMETER_BUILDINGS) {
    const footprint = PERIMETER_FOOTPRINTS[spec.prototype];
    const scale = boundaryScaleFor(spec);
    const angle = spec.rotationY * Math.PI / 180;
    const width = footprint[0] * scale[0] + 0.36;
    const depth = footprint[1] * scale[2] + 0.36;
    const aabbWidth = Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * depth;
    const aabbDepth = Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * depth;
    world.addBoxFromCenterSize(spec.position[0], spec.position[2], aabbWidth, aabbDepth, spec.id);
  }
  const { x, z, w, d } = ECHO_CITY_ENTRY.returnCase;
  world.addBoxFromCenterSize(x, z, w, d, 'return-threshold');

  const spawn = ECHO_CITY_ENTRY.spawn;
  assert.equal(world.contains(spawn.x, spawn.z, PLAYER.radius), null);

  const step = 0.1;
  const moved = world.moveAndCollide(
    spawn.x,
    spawn.z,
    -Math.sin(spawn.yaw) * step,
    -Math.cos(spawn.yaw) * step,
    PLAYER.radius,
  );
  assert.ok(Math.hypot(moved.x - spawn.x, moved.z - spawn.z) > 0.09);
});

test('shared street furniture leaves local surface resolution to the world builder', () => {
  assert.equal(CITY_SURFACE_Y, 0.14);
  const grounded = CITY_MODELS.filter((spec) => spec.alignToGround && !spec.groundY && !spec.support);
  assert.ok(grounded.length >= 8);
  assert.ok(grounded.every((spec) => spec.groundY == null));

  const dispenser = CITY_MODELS.find((spec) => spec.id === 'queue-dispenser');
  assert.equal(dispenser.groundSink, 0.09);
});

test('all three authored trams contribute solid collision footprints', () => {
  const trams = CITY_MODELS.filter((spec) => spec.id.startsWith('municipal-tram'));
  assert.equal(trams.length, 3);
  for (const tram of trams) {
    assert.equal(tram.collision?.type, 'oriented-box');
    assert.deepEqual(tram.collision.size, [2.8, 9.2]);

    const world = new StaticCollisionWorld();
    const angle = (tram.collision.rotationY || 0) * Math.PI / 180;
    const width = Math.abs(Math.cos(angle)) * tram.collision.size[0]
      + Math.abs(Math.sin(angle)) * tram.collision.size[1];
    const depth = Math.abs(Math.sin(angle)) * tram.collision.size[0]
      + Math.abs(Math.cos(angle)) * tram.collision.size[1];
    world.addBoxFromCenterSize(tram.position[0], tram.position[2], width, depth, tram.id);
    assert.equal(world.contains(tram.position[0], tram.position[2], PLAYER.radius)?.id, tram.id);
  }
});

test('the station deck follows the authored station footprint instead of an oversized slab', () => {
  assert.deepEqual(STATION_LAYOUT.platformSize, [4.45, 11.8]);
  assert.ok(STATION_LAYOUT.platformSize[1] < 12, 'the platform must not extend beyond the visible station ends');
});

test('landmark collision follows the visible clock and fountain silhouettes', () => {
  const clock = OBSTACLES.find((entry) => entry.sourceId === 'clock-tower');
  const fountain = OBSTACLES.find((entry) => entry.sourceId === 'reunion-fountain');
  assert.ok(clock?.radius >= 3 && clock.radius <= 3.4);
  assert.ok(fountain?.radius >= 3.4 && fountain.radius <= 3.9);
  const scanner = OBSTACLES.find((entry) => entry.sourceId === 'scanner-tower');
  assert.ok(scanner?.radius >= 0.8 && scanner.radius <= 1.05);
});

test('circular civic landmarks use a circular footprint rather than a square envelope', () => {
  const world = new StaticCollisionWorld();
  world.addCircle(0, 0, 3.2, 'clock');
  assert.equal(world.contains(3.1, 0, 0.25)?.id, 'clock');
  assert.equal(world.contains(3.1, 3.1, 0.25), null, 'open square corners remain walkable');
});

test('low furniture blocks walking but can be cleared at jump height', () => {
  const world = new StaticCollisionWorld();
  world.addBoxFromCenterSize(0, 0, 2, 1, 'bench', { minY: 0, maxY: 0.68 });
  assert.equal(world.contains(0, 0, PLAYER.radius, 0, PLAYER.bodyHeight)?.id, 'bench');
  assert.equal(world.contains(0, 0, PLAYER.radius, 0.7, PLAYER.bodyHeight), null);
});

test('full-height landmarks remain solid while the player is airborne', () => {
  const world = new StaticCollisionWorld();
  world.addBoxFromCenterSize(0, 0, 4, 4, 'tower');
  assert.equal(world.contains(0, 0, PLAYER.radius, 0.8, PLAYER.bodyHeight)?.id, 'tower');
});

test('rotated walk surfaces expose an exact top face without blocking their AABB corners', () => {
  const world = new StaticCollisionWorld();
  const rotationY = Math.PI / 4;
  world.addOrientedBoxFromCenterSize(
    0,
    0,
    2,
    8,
    rotationY,
    'platform',
    { minY: 0, maxY: 1.15 },
  );
  world.addWalkSurface({
    centerX: 0,
    centerZ: 0,
    width: 2,
    depth: 8,
    rotationY,
    topY: 1.15,
    id: 'platform',
  });

  assert.equal(world.groundHeightAt(0, 0), 1.15);
  assert.equal(world.contains(0, 0, PLAYER.radius, 0, PLAYER.bodyHeight)?.id, 'platform');
  assert.equal(world.contains(0, 0, PLAYER.radius, 1.16, PLAYER.bodyHeight), null);
  assert.equal(world.groundHeightAt(3.4, 3.4), 0, 'AABB corner must remain open');
  assert.equal(world.contains(3.4, 3.4, PLAYER.radius, 0, PLAYER.bodyHeight), null);
});
