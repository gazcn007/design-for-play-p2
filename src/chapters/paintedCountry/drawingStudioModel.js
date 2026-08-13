export const STUDIO_PIGMENTS = Object.freeze([
  { id: 'red', name: 'VERMILION', color: 0xc95850 },
  { id: 'yellow', name: 'OCHRE', color: 0xd7b84a },
  { id: 'green', name: 'VERDIGRIS', color: 0x5e9172 },
  { id: 'teal', name: 'SEA GLASS', color: 0x4f9794 },
  { id: 'blue', name: 'INDIGO', color: 0x537ca6 },
  { id: 'violet', name: 'MULBERRY', color: 0x84658f },
]);

export const STUDIO_SOURCES = Object.freeze([
  { id: 'phone', pigment: 'red', object: 'TELEPHONE', targetCell: '0,0' },
  { id: 'books', pigment: 'yellow', object: 'BOOKS', targetCell: '2,0' },
  { id: 'plant', pigment: 'green', object: 'HOUSEPLANT', targetCell: '0,1' },
  { id: 'cushion', pigment: 'teal', object: 'CHAIR CUSHION', targetCell: '2,1' },
  { id: 'vase', pigment: 'blue', object: 'CERAMIC VASE', targetCell: '1,1' },
  { id: 'curtain', pigment: 'violet', object: 'FOLDED CURTAIN', targetCell: '1,2' },
]);

export const REQUIRED_CELLS = Object.freeze(
  STUDIO_SOURCES.map(({ targetCell, pigment, id }) => ({ cell: targetCell, pigment, token: id })),
);

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createDrawingStudio() {
  const state = {
    sources: STUDIO_SOURCES.map((source) => ({ ...source, drained: false })),
    held: null,
    required: {},
    free: {},
    events: [],
  };

  const source = (id) => state.sources.find((item) => item.id === id) ?? null;
  const pigment = (id) => STUDIO_PIGMENTS.find((item) => item.id === id) ?? null;
  const requiredCell = (cell) => REQUIRED_CELLS.find((item) => item.cell === cell) ?? null;
  const emit = (type, detail = {}) => state.events.push({ type, ...detail });

  function extract(id) {
    const item = source(id);
    if (!item || item.drained || state.held) return false;
    item.drained = true;
    state.held = item.id;
    emit('color-extracted', { source: item.id, pigment: item.pigment, object: item.object });
    return true;
  }

  function placeRequired(cell) {
    const wanted = requiredCell(cell);
    if (!wanted || state.required[cell] || !state.held) return false;
    if (state.held !== wanted.token) {
      emit('wrong-required-color', {
        cell,
        held: source(state.held)?.pigment ?? null,
        wanted: wanted.pigment,
      });
      return false;
    }
    state.required[cell] = state.held;
    state.held = null;
    emit('required-cell-filled', { cell, pigment: wanted.pigment });
    if (isComplete()) emit('copy-complete');
    return true;
  }

  function liftRequired(cell) {
    if (state.held || !state.required[cell]) return false;
    const wasComplete = isComplete();
    state.held = state.required[cell];
    delete state.required[cell];
    emit('required-cell-lifted', { cell, token: state.held });
    if (wasComplete) emit('copy-opened-again');
    return true;
  }

  function placeFree(cell) {
    if (!cell || state.free[cell] || !state.held) return false;
    state.free[cell] = state.held;
    const item = source(state.held);
    state.held = null;
    emit('free-cell-filled', { cell, pigment: item?.pigment ?? null });
    return true;
  }

  function liftFree(cell) {
    if (state.held || !state.free[cell]) return false;
    state.held = state.free[cell];
    delete state.free[cell];
    emit('free-cell-lifted', { cell, token: state.held });
    return true;
  }

  function isComplete() {
    return REQUIRED_CELLS.every(({ cell, token }) => state.required[cell] === token);
  }

  function tokenLocationCount() {
    const undrained = state.sources.filter((item) => !item.drained).length;
    return undrained + (state.held ? 1 : 0) + Object.keys(state.required).length + Object.keys(state.free).length;
  }

  return {
    state,
    source,
    pigment,
    requiredCell,
    extract,
    placeRequired,
    liftRequired,
    placeFree,
    liftFree,
    isComplete,
    tokenLocationCount,
    snapshot() {
      return clone({
        sources: state.sources,
        held: state.held,
        required: state.required,
        free: state.free,
        complete: isComplete(),
        tokenLocationCount: tokenLocationCount(),
      });
    },
    drainEvents() {
      const events = state.events.slice();
      state.events.length = 0;
      return events;
    },
  };
}
