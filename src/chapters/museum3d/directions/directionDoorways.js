import { CHAPTER05_DIRECTIONS } from './directionRegistry.js';

// Every numbered door shares one physical entry band. The band sits just in
// front of the north wall, before the solid door panels stop the player.
export const DIRECTION_DOORWAYS = Object.freeze([
  Object.freeze({ id: CHAPTER05_DIRECTIONS.LABYRINTH, minX: 13.05, maxX: 14.95, minZ: -1.68, maxZ: -1.18 }),
  Object.freeze({ id: CHAPTER05_DIRECTIONS.BORROWED_GRID, minX: 21.05, maxX: 22.95, minZ: -1.68, maxZ: -1.18 }),
  Object.freeze({ id: CHAPTER05_DIRECTIONS.ECHO_CITY, minX: 29.05, maxX: 30.95, minZ: -1.68, maxZ: -1.18 }),
  Object.freeze({ id: CHAPTER05_DIRECTIONS.PAINTED_COUNTRY, minX: 37.05, maxX: 38.95, minZ: -1.68, maxZ: -1.18 }),
]);

export function directionAtDoorway(position) {
  return DIRECTION_DOORWAYS.find((zone) => (
    position.x >= zone.minX && position.x <= zone.maxX
    && position.z >= zone.minZ && position.z <= zone.maxZ
  ))?.id ?? null;
}
