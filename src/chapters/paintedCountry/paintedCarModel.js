export const PART_ONE_PIGMENTS = Object.freeze([
  { id: 'red', name: 'VERMILION', color: 0xc95850 },
  { id: 'blue', name: 'INDIGO', color: 0x537ca6 },
  { id: 'yellow', name: 'OCHRE', color: 0xd7b84a },
  { id: 'green', name: 'VERDIGRIS', color: 0x5e9172 },
  { id: 'violet', name: 'MULBERRY', color: 0x84658f },
]);

export const PART_ONE_SOURCES = Object.freeze([
  { id: 'red-phone', pigment: 'red', room: 'A', object: 'TELEPHONE' },
  { id: 'blue-teapot', pigment: 'blue', room: 'B', object: 'TEAPOT' },
  { id: 'yellow-lamp', pigment: 'yellow', room: 'B', object: 'DESK LAMP' },
  { id: 'green-chair', pigment: 'green', room: 'B', object: 'CHAIR CUSHION' },
  { id: 'violet-banner', pigment: 'violet', room: 'C', object: 'CASTLE BANNER' },
]);

export const PART_ONE_TARGETS = Object.freeze([
  { id: 'bridge-red', pigment: 'red', room: 'A', kind: 'bridge' },
  { id: 'arch-blue', pigment: 'blue', room: 'B', kind: 'arch' },
  { id: 'arch-yellow', pigment: 'yellow', room: 'B', kind: 'arch' },
  { id: 'arch-green', pigment: 'green', room: 'B', kind: 'arch' },
  { id: 'counterweight-violet', pigment: 'violet', room: 'C', kind: 'counterweight' },
]);

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createPaintedCar() {
  const state = {
    sources: PART_ONE_SOURCES.map((source) => ({ ...source, drained: false })),
    targets: PART_ONE_TARGETS.map((target) => ({ ...target, filled: false })),
    inventory: [],
    complete: false,
    events: [],
  };

  const source = (id) => state.sources.find((item) => item.id === id) ?? null;
  const target = (id) => state.targets.find((item) => item.id === id) ?? null;
  const emit = (type, detail = {}) => state.events.push({ type, ...detail });
  const pigment = (id) => PART_ONE_PIGMENTS.find((item) => item.id === id) ?? null;

  function extract(id) {
    const item = source(id);
    if (!item || item.drained) return false;
    item.drained = true;
    state.inventory.push(item.pigment);
    emit('color-extracted', { source: item.id, pigment: item.pigment, object: item.object });
    return true;
  }

  function fill(id) {
    const item = target(id);
    if (!item || item.filled) return false;
    const inventoryIndex = state.inventory.indexOf(item.pigment);
    if (inventoryIndex < 0) {
      emit('missing-color', { target: item.id, pigment: item.pigment });
      return false;
    }
    state.inventory.splice(inventoryIndex, 1);
    item.filled = true;
    emit('target-filled', { target: item.id, pigment: item.pigment, kind: item.kind });
    if (item.kind === 'counterweight') emit('drawbridge-opened');
    return true;
  }

  const isFilled = (id) => Boolean(target(id)?.filled);
  const isDrained = (id) => Boolean(source(id)?.drained);
  const archComplete = () => ['arch-blue', 'arch-yellow', 'arch-green'].every(isFilled);
  const drawbridgeOpen = () => isFilled('counterweight-violet');
  const allTargetsFilled = () => state.targets.every((item) => item.filled);

  function enterExit() {
    if (state.complete || !allTargetsFilled()) return false;
    state.complete = true;
    emit('car-complete');
    return true;
  }

  return {
    state,
    source,
    target,
    pigment,
    extract,
    fill,
    isFilled,
    isDrained,
    archComplete,
    drawbridgeOpen,
    allTargetsFilled,
    enterExit,
    snapshot() {
      return clone({
        sources: state.sources,
        targets: state.targets,
        inventory: state.inventory,
        archComplete: archComplete(),
        drawbridgeOpen: drawbridgeOpen(),
        complete: state.complete,
      });
    },
    drainEvents() {
      const events = state.events.slice();
      state.events.length = 0;
      return events;
    },
  };
}
