// Chapter 4 // THE PAINTED COUNTRY — the whole car, as rules.
//
// Pure and deterministic: no Phaser, no DOM, no clock of its own. The scene
// owns pixels and input; this owns what is true. Same split as
// src/tutorial/phases/*.js.
//
// Two verbs on one axis. PAINT turns a drawn construction line into a surface
// that bears weight. WASH turns a surface back into a line and returns its
// pigment to the brush. Everything else in the car is a consequence of those
// two plus the physical behaviour of three pigments.

export const SOLID_AT = 0.75; // coverage at which a painted region bears weight
export const SLOT_CAPACITY = 0.7; // per pigment, and the brush carries two
export const TRANSFER_PER_SECOND = 0.6;
export const DISSOLVE_PER_SECOND = 0.32; // bone black, standing in running water
export const FLOAT_RISE_SECONDS = 2.2;

export const PIGMENT = {
  BONE: 'bone-black', // solidity. the only pigment that bears weight
  INDIGO: 'indigo', // water. runs downhill, and dissolves bone black
  VERDIGRIS: 'verdigris', // motion. finishes a gesture the child left undone
  CLOTH: 'book-cloth', // the mural's warm ground
};

export const BAYS = {
  A: { id: 'A', name: 'THE COLD END', x: 0, w: 960 },
  B: { id: 'B', name: 'THE WASHROOM', x: 960, w: 960 },
  C: { id: 'C', name: 'THE LONG WALL', x: 1920, w: 960 },
};

export const CAR_W = 2880;

// ---------------------------------------------------------------------------
// Regions. Rectangles in world coordinates, because the brush is aimed with a
// pointer and the player has a physical reach — both need real geometry.
//
//   paintable / washable  what the brush may do here
//   bearsWeight           becomes a solid body at SOLID_AT
//   refusesPaint          pigment beads and runs off (beat 6)
//   soluble               dissolves while standing in running water (beat 5)
//   acceptsAnyPigment     the coupling door, which is made of whatever you spend
// ---------------------------------------------------------------------------

function initialRegions() {
  return [
    // ---------------------------------------------------------------- BAY A
    {
      id: 'soot-spill',
      bay: 'A',
      label: 'soot, spilled',
      x: 96,
      y: 420,
      w: 92,
      h: 18,
      pigment: PIGMENT.BONE,
      capacity: 0.35,
      coverage: 1,
      paintable: false,
      washable: true,
    },
    {
      id: 'stove-firebox',
      bay: 'A',
      label: 'the firebox mouth',
      x: 110,
      y: 310,
      w: 34,
      h: 28,
      pigment: PIGMENT.BONE,
      capacity: 0.25,
      coverage: 1,
      paintable: false,
      washable: true,
    },
    {
      id: 'beam-left',
      bay: 'A',
      label: 'the plank you are standing on',
      x: 362,
      y: 430,
      w: 138,
      h: 14,
      pigment: PIGMENT.BONE,
      capacity: 1,
      coverage: 1,
      paintable: true,
      washable: true,
      bearsWeight: true,
    },
    {
      id: 'beam-right',
      bay: 'A',
      label: 'the beam she drew and never built',
      x: 500,
      y: 430,
      w: 148,
      h: 14,
      pigment: PIGMENT.BONE,
      capacity: 1,
      coverage: 0,
      paintable: true,
      washable: true,
      bearsWeight: true,
    },

    // ---------------------------------------------------------------- BAY B
    {
      id: 'basin-panel',
      bay: 'B',
      label: 'a panel painted over the basin',
      x: 1040,
      y: 300,
      w: 96,
      h: 74,
      pigment: PIGMENT.CLOTH,
      capacity: 0.18,
      coverage: 1,
      paintable: false,
      washable: true,
      // Scrubbed off, not lifted: this panel gives the brush nothing. An
      // earlier version handed back book cloth nobody needed, which could
      // occupy the second slot and leave the player unable to pick the bone
      // black back out of the settling pan — a real dead end.
      yieldsPigment: false,
      // Beat 4's first move: what is underneath is the only indigo in the car.
      revealsOnWash: 'indigo-bottle',
    },
    {
      id: 'indigo-bottle',
      bay: 'B',
      label: 'laundry blue, still corked',
      x: 1056,
      y: 322,
      w: 34,
      h: 46,
      pigment: PIGMENT.INDIGO,
      capacity: 1.4,
      coverage: 1,
      paintable: false,
      washable: true,
      hidden: true,
    },
    {
      id: 'lamp-soot',
      bay: 'B',
      label: 'soot above the lamp',
      x: 1300,
      y: 100,
      w: 76,
      h: 26,
      pigment: PIGMENT.BONE,
      capacity: 0.55,
      coverage: 1,
      paintable: false,
      washable: true,
    },
    {
      id: 'channel',
      bay: 'B',
      label: 'the channel, drawn along the fibre',
      x: 1210,
      y: 402,
      w: 470,
      h: 16,
      pigment: PIGMENT.INDIGO,
      capacity: 0.8,
      coverage: 0,
      paintable: true,
      washable: true,
      // Water, not a surface. Nobody stands on it.
    },
    {
      id: 'trough-plank',
      bay: 'B',
      label: 'a plank across the trough',
      x: 1396,
      y: 430,
      w: 190,
      h: 14,
      pigment: PIGMENT.BONE,
      capacity: 0.6,
      coverage: 0,
      paintable: true,
      washable: true,
      bearsWeight: true,
      // Beat 5. It sits in the channel's path, so running water takes it back
      // apart — which is the lesson, not a punishment.
      soluble: true,
    },
    {
      id: 'settling-pan',
      bay: 'B',
      label: 'the settling pan under the trough',
      x: 1440,
      y: 556,
      w: 120,
      h: 20,
      pigment: PIGMENT.BONE,
      capacity: 1.2,
      coverage: 0,
      paintable: false,
      washable: true,
      // Nothing in this car is ever destroyed. Whatever the water dissolves
      // settles here, so no ordering can strand the player.
    },

    // ---------------------------------------------------------------- BAY C
    {
      id: 'correct-door',
      bay: 'C',
      label: 'a door drawn the way a door should be',
      x: 2120,
      y: 300,
      w: 64,
      h: 128,
      pigment: PIGMENT.BONE,
      capacity: 1,
      coverage: 0,
      paintable: true,
      washable: false,
      bearsWeight: false,
      // Beat 6. Nobody remembers this door, so the paper will not take it.
      refusesPaint: true,
    },
    {
      id: 'ceiling-door',
      bay: 'C',
      label: 'the door she drew on the ceiling',
      x: 2600,
      y: 96,
      w: 72,
      h: 26,
      pigment: PIGMENT.BONE,
      capacity: 0.5,
      coverage: 0,
      paintable: true,
      washable: true,
      bearsWeight: true,
    },
    {
      id: 'mural-hill',
      bay: 'C',
      label: 'the hill behind the house',
      x: 2220,
      y: 200,
      w: 280,
      h: 70,
      pigment: PIGMENT.VERDIGRIS,
      capacity: 0.72,
      coverage: 1,
      paintable: true,
      washable: true,
      mural: true,
    },
    {
      id: 'mural-house',
      bay: 'C',
      label: 'the house itself',
      x: 2300,
      y: 270,
      w: 100,
      h: 110,
      pigment: PIGMENT.CLOTH,
      capacity: 0.72,
      coverage: 1,
      paintable: true,
      washable: true,
      mural: true,
    },
    {
      id: 'mural-river',
      bay: 'C',
      label: 'the river she swam in',
      x: 2220,
      y: 380,
      w: 280,
      h: 50,
      pigment: PIGMENT.INDIGO,
      capacity: 0.72,
      coverage: 1,
      paintable: true,
      washable: true,
      mural: true,
    },
    {
      id: 'mural-figure',
      bay: 'C',
      label: 'someone standing in the doorway',
      x: 2410,
      y: 300,
      w: 70,
      h: 80,
      pigment: PIGMENT.BONE,
      capacity: 0.72,
      coverage: 1,
      paintable: true,
      washable: true,
      mural: true,
    },
    {
      id: 'coupling-door',
      bay: 'C',
      label: 'the coupling to the next car',
      x: 2790,
      y: 300,
      w: 58,
      h: 130,
      pigment: null,
      capacity: 0.7,
      coverage: 0,
      paintable: true,
      washable: false,
      acceptsAnyPigment: true,
    },
  ];
}

export function createPaintedCar() {
  const state = {
    regions: initialRegions(),
    // Two slots, exactly as the design's brush ferrule shows. There is no swap
    // control: which pigment applies is decided by the surface, because a
    // surface only accepts the pigment it is made of.
    brush: [
      { pigment: null, load: 0 },
      { pigment: null, load: 0 },
    ],
    flowing: false,
    floatProgress: 0,
    complete: false,
    falls: 0,
    keptMural: null,
    doorPigment: null,
    events: [],
  };

  const byId = (id) => state.regions.find((region) => region.id === id);
  const emit = (type, payload = {}) => state.events.push({ type, ...payload });
  const held = (region) => region.coverage * region.capacity;
  // Two different questions. `isDone` is whether the paint has taken;
  // `isSolid` is whether you can stand on it. A door is done without being a
  // floor, and the channel is done without being either.
  const isDone = (region) => Boolean(region) && region.coverage >= SOLID_AT;
  const isSolid = (region) => Boolean(region?.bearsWeight) && isDone(region);

  const slotFor = (pigment) => state.brush.find((slot) => slot.pigment === pigment && slot.load > 0);
  const slotToFill = (pigment) =>
    state.brush.find((slot) => slot.pigment === pigment) ??
    state.brush.find((slot) => slot.load <= 0.0001);
  const fullestSlot = () =>
    state.brush.reduce((best, slot) => (slot.load > (best?.load ?? -1) ? slot : best), null);

  function visible(region) {
    return !region.hidden;
  }

  function regionAt(x, y, pad = 12) {
    let best = null;
    let bestDistance = Infinity;
    state.regions.forEach((region) => {
      if (!visible(region)) return;
      if (x < region.x - pad || x > region.x + region.w + pad) return;
      if (y < region.y - pad || y > region.y + region.h + pad) return;
      const distance = Math.hypot(x - (region.x + region.w / 2), y - (region.y + region.h / 2));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = region;
      }
    });
    return best;
  }

  function paint(regionId, seconds) {
    const region = byId(regionId);
    if (!region || !region.paintable || !visible(region)) return 0;

    // Beat 6. The paper will not take a line nobody drew: the pigment beads and
    // runs straight off. Nothing is spent, and the refusal is visible.
    if (region.refusesPaint) {
      emit('paint-refused', { id: region.id });
      return 0;
    }

    const slot = region.acceptsAnyPigment ? fullestSlot() : slotFor(region.pigment);
    if (!slot || slot.load <= 0) return 0;

    const room = (1 - region.coverage) * region.capacity;
    const amount = Math.min(TRANSFER_PER_SECOND * seconds, slot.load, room);
    if (amount <= 0) return 0;

    const wasSolid = isSolid(region);
    slot.load -= amount;
    region.coverage = Math.min(1, region.coverage + amount / region.capacity);
    if (region.acceptsAnyPigment && !state.doorPigment) state.doorPigment = slot.pigment;
    if (slot.load <= 0.0001) {
      slot.load = 0;
      slot.pigment = null; // an empty slot is free for whatever is washed next
    }
    if (!wasSolid && isSolid(region)) emit('region-became-solid', { id: region.id });
    if (region.id === 'coupling-door' && region.coverage >= SOLID_AT) finish();
    return amount;
  }

  function wash(regionId, seconds) {
    const region = byId(regionId);
    if (!region || !region.washable || !visible(region)) return 0;

    const wasSolid = isSolid(region);
    let amount;
    if (region.yieldsPigment === false) {
      amount = Math.min(TRANSFER_PER_SECOND * seconds, held(region));
      if (amount <= 0) return 0;
      region.coverage = Math.max(0, region.coverage - amount / region.capacity);
    } else {
      const slot = slotToFill(region.pigment);
      if (!slot) {
        emit('brush-full', { id: region.id, pigment: region.pigment });
        return 0;
      }
      const room = SLOT_CAPACITY - slot.load;
      amount = Math.min(TRANSFER_PER_SECOND * seconds, held(region), room);
      if (amount <= 0) return 0;
      slot.pigment = region.pigment;
      slot.load += amount;
      region.coverage = Math.max(0, region.coverage - amount / region.capacity);
    }

    if (region.revealsOnWash && region.coverage <= 0.35) {
      const revealed = byId(region.revealsOnWash);
      if (revealed?.hidden) {
        revealed.hidden = false;
        emit('revealed', { id: revealed.id });
      }
    }
    if (wasSolid && !isSolid(region)) emit('region-gave-way', { id: region.id });
    return amount;
  }

  // Water. The channel runs while it is painted; running water dissolves bone
  // black standing in it, and what dissolves is not destroyed — it settles in
  // the pan below, so no ordering can strand the player.
  function update(seconds) {
    const channel = byId('channel');
    const wasFlowing = state.flowing;
    // The channel is its own valve: wash the indigo out and the water stops.
    // A separate stopcock was tried and cut — it could be left closed on the
    // far side of the trough, which is a dead end, and it taught nothing the
    // channel does not already teach.
    state.flowing = channel.coverage >= SOLID_AT;
    if (state.flowing !== wasFlowing) emit(state.flowing ? 'water-running' : 'water-stopped');

    if (state.flowing) {
      const pan = byId('settling-pan');
      state.regions
        .filter((region) => region.soluble && region.coverage > 0)
        .forEach((region) => {
          const wasSolid = isSolid(region);
          const lost = Math.min(region.coverage, (DISSOLVE_PER_SECOND * seconds) / region.capacity);
          region.coverage -= lost;
          pan.coverage = Math.min(1, pan.coverage + (lost * region.capacity) / pan.capacity);
          if (wasSolid && !isSolid(region)) emit('region-gave-way', { id: region.id });
        });
      state.floatProgress = Math.min(1, state.floatProgress + seconds / FLOAT_RISE_SECONDS);
      if (state.floatProgress >= 1 && !state.floatUp) {
        state.floatUp = true;
        emit('float-raised');
      }
    }
  }

  function finish() {
    if (state.complete) return;
    state.complete = true;
    // What survived is what the player refused to spend. That is the packet
    // Chapter 6's `painted-country` slot receives.
    const mural = state.regions.filter((region) => region.mural);
    state.keptMural = mural.filter((region) => region.coverage >= 0.5).map((region) => region.id);
    emit('bay-complete', { kept: state.keptMural, doorPigment: state.doorPigment });
  }

  return {
    state,
    byId,
    regionAt,
    paint,
    wash,
    update,
    isSolid: (id) => isSolid(byId(id)),
    isDone: (id) => isDone(byId(id)),
    flowing: () => state.flowing,
    floatUp: () => Boolean(state.floatUp),
    brushLoad: (pigment) => state.brush.find((slot) => slot.pigment === pigment)?.load ?? 0,
    totalLoad: () => state.brush.reduce((sum, slot) => sum + slot.load, 0),
    freePigment: (bay) =>
      state.regions
        .filter(
          (region) =>
            region.washable &&
            !region.bearsWeight &&
            !region.mural &&
            !region.hidden &&
            (!bay || region.bay === bay),
        )
        .reduce((sum, region) => sum + held(region), 0),
    fell() {
      state.falls += 1;
      emit('fell', { falls: state.falls });
    },
    drainEvents() {
      const events = state.events.slice();
      state.events.length = 0;
      return events;
    },
    snapshot() {
      return {
        brush: state.brush.map((slot) => ({
          pigment: slot.pigment,
          load: Number(slot.load.toFixed(3)),
        })),
        flowing: state.flowing,
        floatUp: Boolean(state.floatUp),
        complete: state.complete,
        keptMural: state.keptMural,
        doorPigment: state.doorPigment,
        falls: state.falls,
        regions: state.regions
          .filter((region) => !region.hidden)
          .map((region) => ({
            id: region.id,
            coverage: Number(region.coverage.toFixed(3)),
            solid: isSolid(region),
          })),
      };
    },
  };
}
