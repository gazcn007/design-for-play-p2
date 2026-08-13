export const EXPANSION_PHASE = Object.freeze({
  COLLECT: 'collect-six-colors',
  BUILD: 'build-the-train',
  CHASE: 'people-are-coming',
});

export const PIGMENTS = Object.freeze([
  { id: 'red', name: 'VERMILION', color: 0xc95850, source: 'BAKERY AWNING', part: 'ENGINE' },
  { id: 'orange', name: 'MARIGOLD', color: 0xd98a3a, source: 'STATION LANTERN', part: 'CAB' },
  { id: 'yellow', name: 'OCHRE', color: 0xd7b84a, source: 'ORCHARD SUN FLAG', part: 'WHISTLE' },
  { id: 'green', name: 'VERDIGRIS', color: 0x5e9172, source: 'MILL GARDEN', part: 'WHEELS' },
  { id: 'blue', name: 'INDIGO', color: 0x537ca6, source: 'PUBLIC WELL', part: 'CARRIAGE' },
  { id: 'violet', name: 'MULBERRY', color: 0x84658f, source: 'FAMILY QUILT', part: 'ROOF' },
]);

// Part I teaches weight and support. Part II teaches copying color. Part III
// combines both lessons: colors must match the reference, and unsupported
// pieces cannot float into the finished train.
export const TRAIN_BUILD_RULES = Object.freeze({
  green: Object.freeze({ requires: [], tier: 0 }),
  red: Object.freeze({ requires: ['green'], tier: 1 }),
  blue: Object.freeze({ requires: ['green'], tier: 1 }),
  yellow: Object.freeze({ requires: ['red'], tier: 2 }),
  orange: Object.freeze({ requires: ['red', 'blue'], tier: 2 }),
  violet: Object.freeze({ requires: ['orange', 'blue'], tier: 3 }),
});

export const TRAIN_BUILD_EXAMPLE_ORDER = Object.freeze(['green', 'red', 'blue', 'yellow', 'orange', 'violet']);

export function createChapter4Expansion() {
  const state = {
    phase: EXPANSION_PHASE.COLLECT,
    trainBuilt: false,
    boarded: false,
    complete: false,
    consequenceRevealed: false,
    failedAttempts: 0,
    lastFailure: null,
    pigments: PIGMENTS.map((pigment) => ({ ...pigment, collected: false, built: false })),
    events: [],
  };

  const emit = (type, detail = {}) => state.events.push({ type, ...detail });
  const pigment = (id) => state.pigments.find((item) => item.id === id) ?? null;
  const collectedCount = () => state.pigments.filter((item) => item.collected).length;
  const builtCount = () => state.pigments.filter((item) => item.built).length;
  const builtIds = () => new Set(state.pigments.filter((item) => item.built).map((item) => item.id));

  function collect(id) {
    if (state.phase !== EXPANSION_PHASE.COLLECT) return false;
    const item = pigment(id);
    if (!item || item.collected) return false;
    item.collected = true;
    emit('pigment-taken', { id, source: item.source, part: item.part });
    if (collectedCount() === state.pigments.length) {
      state.phase = EXPANSION_PHASE.BUILD;
      emit('all-pigments-taken');
    }
    return true;
  }

  function failBuild(reason, partId, pigmentId, missing = []) {
    state.failedAttempts += 1;
    state.lastFailure = { reason, partId, pigmentId, missing: [...missing] };
    emit('train-build-failed', { ...state.lastFailure });
    return false;
  }

  function placePart(partId, pigmentId) {
    if (state.phase !== EXPANSION_PHASE.BUILD || state.trainBuilt) return false;
    const part = pigment(partId);
    const color = pigment(pigmentId);
    if (!part || !color || !color.collected || part.built) return false;
    if (partId !== pigmentId) return failBuild('wrong-color', partId, pigmentId);

    const rule = TRAIN_BUILD_RULES[partId];
    const placed = builtIds();
    const missing = rule.requires.filter((id) => !placed.has(id));
    if (missing.length) return failBuild('unsupported', partId, pigmentId, missing);

    part.built = true;
    state.lastFailure = null;
    emit('train-part-placed', { id: partId, part: part.part, tier: rule.tier });
    if (builtCount() === state.pigments.length) {
      state.trainBuilt = true;
      emit('train-built');
    }
    return true;
  }

  function boardTrain() {
    if (state.phase !== EXPANSION_PHASE.BUILD || !state.trainBuilt || state.boarded) return false;
    state.boarded = true;
    state.phase = EXPANSION_PHASE.CHASE;
    emit('train-boarded');
    return true;
  }

  function revealConsequence() {
    if (state.phase !== EXPANSION_PHASE.CHASE || !state.boarded || state.consequenceRevealed) return false;
    state.consequenceRevealed = true;
    state.complete = true;
    emit('crowd-arrived');
    return true;
  }

  return {
    state,
    pigment,
    collect,
    placePart,
    boardTrain,
    revealConsequence,
    snapshot() {
      return {
        phase: state.phase,
        trainBuilt: state.trainBuilt,
        boarded: state.boarded,
        complete: state.complete,
        consequenceRevealed: state.consequenceRevealed,
        failedAttempts: state.failedAttempts,
        lastFailure: state.lastFailure ? { ...state.lastFailure, missing: [...state.lastFailure.missing] } : null,
        collectedCount: collectedCount(),
        builtCount: builtCount(),
        pigments: state.pigments.map((item) => ({ ...item })),
      };
    },
    drainEvents() {
      const events = state.events.slice();
      state.events.length = 0;
      return events;
    },
  };
}
