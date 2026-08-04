const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const PARKOUR_WIDTH = 4300;
export const PARKOUR_HEIGHT = 720;

export const MOVABLE_DEFS = Object.freeze([
  {
    id: 'ladder-a',
    kind: 'ladder',
    startX: 550,
    y: 260,
    width: 48,
    height: 180,
    minX: 550,
    maxX: 735,
    dismountDirection: 1,
  },
  {
    id: 'block-a',
    kind: 'block',
    startX: 180,
    y: 509,
    width: 62,
    height: 62,
    minX: 180,
    maxX: 430,
  },
  {
    id: 'ladder-b',
    kind: 'ladder',
    startX: 2500,
    y: 305,
    width: 48,
    height: 170,
    minX: 2350,
    maxX: 2765,
    dismountDirection: 1,
  },
  {
    id: 'block-b',
    kind: 'block',
    startX: 4070,
    y: 269,
    width: 62,
    height: 62,
    minX: 4040,
    maxX: 4145,
  },
]);

export const FLYING_CAR_DEFS = Object.freeze([
  {
    id: 'car-a',
    minX: 1100,
    maxX: 1550,
    startX: 1100,
    y: 180,
    width: 132,
    height: 30,
    speed: 82,
    startDirection: 1,
  },
  {
    id: 'car-b',
    minX: 3780,
    maxX: 3940,
    startX: 3780,
    y: 330,
    width: 132,
    height: 30,
    speed: 76,
    startDirection: 1,
  },
]);

export const ROUTE_REQUIREMENTS = Object.freeze({
  movableKinds: ['ladder', 'block'],
  flyingCars: ['car-a', 'car-b'],
});

const makeMovable = (def) => ({
  ...def,
  x: def.startX,
  committedX: def.startX,
  dragging: false,
  previewLegal: true,
  moved: false,
});

const makeFlyingCar = (def) => ({
  ...def,
  x: def.startX,
  direction: def.startDirection,
  phase: def.startX === def.minX ? 0 : 1,
});

export function createParkourState() {
  return {
    movables: MOVABLE_DEFS.map(makeMovable),
    flyingCars: FLYING_CAR_DEFS.map(makeFlyingCar),
    activeDragId: null,
    movedKinds: [],
    riddenCars: [],
    resetting: false,
    resetCount: 0,
    lastFailure: null,
    goalComplete: false,
  };
}

export function movableById(state, id) {
  return state.movables.find((movable) => movable.id === id) ?? null;
}

export function beginDrag(state, id) {
  if (state.activeDragId || state.goalComplete || state.resetting) return false;
  const movable = movableById(state, id);
  if (!movable) return false;
  movable.dragging = true;
  movable.previewLegal = true;
  state.activeDragId = id;
  return true;
}

export function previewDrag(state, pointerWorldX) {
  const movable = movableById(state, state.activeDragId);
  if (!movable) return null;
  const requestedX = Number(pointerWorldX);
  const withinBounds = requestedX >= movable.minX && requestedX <= movable.maxX;
  movable.x = clamp(requestedX, movable.minX, movable.maxX);
  movable.previewLegal = withinBounds;
  return { x: movable.x, legal: movable.previewLegal };
}

export function finishDrag(state, commit = true) {
  const movable = movableById(state, state.activeDragId);
  if (!movable) return null;
  const accepted = Boolean(commit && movable.previewLegal);
  if (accepted) {
    movable.committedX = movable.x;
    movable.moved = movable.moved || Math.abs(movable.x - movable.startX) >= 12;
    if (movable.moved && !state.movedKinds.includes(movable.kind)) {
      state.movedKinds.push(movable.kind);
    }
  } else {
    movable.x = movable.committedX;
  }
  movable.dragging = false;
  movable.previewLegal = true;
  state.activeDragId = null;
  return { id: movable.id, x: movable.x, accepted };
}

export function stepFlyingCars(state, deltaMs) {
  const dt = Math.max(0, Math.min(deltaMs, 100)) / 1000;
  return state.flyingCars.map((car) => {
    const previousX = car.x;
    car.x += car.speed * car.direction * dt;
    if (car.x >= car.maxX) {
      car.x = car.maxX;
      car.direction = -1;
    } else if (car.x <= car.minX) {
      car.x = car.minX;
      car.direction = 1;
    }
    const span = Math.max(1, car.maxX - car.minX);
    car.phase = (car.x - car.minX) / span;
    return { id: car.id, x: car.x, deltaX: car.x - previousX, phase: car.phase };
  });
}

export function recordCarRide(state, id) {
  if (!state.riddenCars.includes(id)) state.riddenCars.push(id);
}

export function canCompleteGoal(state) {
  return ROUTE_REQUIREMENTS.movableKinds.every((kind) => state.movedKinds.includes(kind))
    && ROUTE_REQUIREMENTS.flyingCars.every((id) => state.riddenCars.includes(id));
}

export function completeGoal(state) {
  if (!canCompleteGoal(state)) return false;
  state.goalComplete = true;
  return true;
}

export function resetParkourState(state, failure = 'manual') {
  const resetCount = state.resetCount + 1;
  const fresh = createParkourState();
  Object.assign(state, fresh, {
    resetCount,
    lastFailure: failure,
  });
  return state;
}

export function parkourSnapshot(state) {
  return {
    drag: state.activeDragId
      ? {
          id: state.activeDragId,
          legal: movableById(state, state.activeDragId)?.previewLegal ?? false,
        }
      : null,
    movables: state.movables.map((movable) => ({
      id: movable.id,
      kind: movable.kind,
      x: Math.round(movable.x),
      y: movable.y,
      moved: movable.moved,
    })),
    flyingCars: state.flyingCars.map((car) => ({
      id: car.id,
      x: Math.round(car.x),
      y: car.y,
      direction: car.direction,
      phase: Number(car.phase.toFixed(3)),
    })),
    movedKinds: [...state.movedKinds],
    riddenCars: [...state.riddenCars],
    resetting: state.resetting,
    resetCount: state.resetCount,
    lastFailure: state.lastFailure,
    goalReady: canCompleteGoal(state),
    goalComplete: state.goalComplete,
  };
}
