// Chapter 4 // THE PAINTED COUNTRY — the whole car, as rules.
//
// One rule carries the chapter: WASHING DOES NOT DESTROY INK, IT MOVES IT.
// Every washable mark has a drain channel drawn on the sheet, and the ink it
// holds travels that channel the moment the mark is washed.
//
//   ink that reaches a hole   -> falls through and is gone
//   ink that reaches paper    -> becomes a new blot the player must now deal with
//   ink that crosses a route  -> dissolves that route on its way past
//
// Nothing here is a budget. There is no pigment, no inventory, no counter and
// no timer; paint is unlimited and every mistake is undoable. The difficulty is
// entirely in the ORDER the player chooses, and every consequence is drawn on
// the sheet before they act. Nothing is hidden — a puzzle you cannot see is
// not a puzzle, it is a memory test.

export const CAR_W = 2880;

export const ACTION = Object.freeze({
  PAINT: 'paint',
  WASH: 'wash',
});

export const KIND = Object.freeze({
  SEAL: 'seal', // black paper barrier; washing it releases its ink
  ROUTE: 'route', // a drawn path over a hole; painting it makes it real floor
  BLOT: 'blot', // a place ink can land and stand as a new barrier
  SUMP: 'sump', // a grate in the floor: whatever reaches it is gone for good
});

// A short hold makes the transformation feel deliberate without asking the
// player to colour a shape. It is a gesture, never a coverage challenge.
export const ACTION_HOLD_SECONDS = 0.32;

export const BAYS = Object.freeze({
  A: { id: 'A', name: 'THE COLD END', x: 0, w: 960 },
  B: { id: 'B', name: 'THE WASHROOM', x: 960, w: 960 },
  C: { id: 'C', name: 'THE LONG WALL', x: 1920, w: 960 },
});

function initialRegions() {
  return [
    // ---------------------------------------------------------------- Bay A
    // The lesson, with no way to get it wrong. The seal's channel runs left,
    // away from the route entirely, into a grate in the floor. Whatever the
    // player does here they watch ink travel and disappear, and learn that a
    // hole is where ink ends up.
    {
      id: 'sump-a',
      bay: 'A',
      kind: KIND.SUMP,
      label: 'the floor drain',
      x: 150,
      y: 430,
      w: 60,
      h: 18,
    },
    {
      id: 'seal-a',
      bay: 'A',
      kind: KIND.SEAL,
      action: ACTION.WASH,
      prompt: 'WASH SEAL',
      label: 'the paper seal',
      x: 264,
      y: 246,
      w: 120,
      h: 184,
      drainsTo: 'sump-a',
    },
    {
      id: 'route-a',
      bay: 'A',
      kind: KIND.ROUTE,
      action: ACTION.PAINT,
      prompt: 'PAINT THE BRIDGE',
      label: 'the first bridge',
      x: 376,
      y: 429,
      w: 248,
      h: 24,
    },

    // ---------------------------------------------------------------- Bay B
    // The twist. This seal's ink does not vanish — it lands between the player
    // and the trough as a standing blot. Washing THAT blot sends its ink into
    // the trough, which is only open while the bridge is unpainted. A player
    // who paints the bridge first watches their own bridge dissolve.
    {
      id: 'seal-b',
      bay: 'B',
      kind: KIND.SEAL,
      action: ACTION.WASH,
      prompt: 'WASH SEAL',
      label: 'the washroom seal',
      x: 1148,
      y: 246,
      w: 120,
      h: 184,
      drainsTo: 'blot-b',
    },
    {
      id: 'blot-b',
      bay: 'B',
      kind: KIND.BLOT,
      action: ACTION.WASH,
      prompt: 'WASH THE BLOT',
      label: 'the blot',
      // Taller than a jump can clear (the player rises ~92px), so standing ink
      // is a problem to be solved and never an obstacle to be vaulted.
      x: 1300,
      y: 300,
      w: 76,
      h: 130,
      drainsTo: 'route-b',
    },
    {
      id: 'route-b',
      bay: 'B',
      kind: KIND.ROUTE,
      action: ACTION.PAINT,
      prompt: 'PAINT THE BRIDGE',
      label: 'the washroom bridge',
      x: 1376,
      y: 429,
      w: 230,
      h: 24,
    },

    // ---------------------------------------------------------------- Bay C
    // The exam. Two seals with different channels: the first drains the whole
    // length of the bay straight into the last hole, the second drops its ink
    // at the player's feet. Both must be emptied through the hole BEFORE the
    // last bridge is painted, or the bridge pays for it.
    {
      id: 'seal-c1',
      bay: 'C',
      kind: KIND.SEAL,
      action: ACTION.WASH,
      prompt: 'WASH SEAL',
      label: 'the long-wall seal',
      x: 2180,
      y: 246,
      w: 120,
      h: 184,
      drainsTo: 'route-c',
    },
    {
      id: 'seal-c2',
      bay: 'C',
      kind: KIND.SEAL,
      action: ACTION.WASH,
      prompt: 'WASH SEAL',
      label: 'the inner seal',
      x: 2340,
      y: 246,
      w: 120,
      h: 184,
      drainsTo: 'blot-c',
    },
    {
      id: 'blot-c',
      bay: 'C',
      kind: KIND.BLOT,
      action: ACTION.WASH,
      prompt: 'WASH THE BLOT',
      label: 'the blot',
      x: 2470,
      y: 300,
      w: 76,
      h: 130,
      drainsTo: 'route-c',
    },
    {
      id: 'route-c',
      bay: 'C',
      kind: KIND.ROUTE,
      action: ACTION.PAINT,
      prompt: 'PAINT THE BRIDGE',
      label: 'the bridge to the vestibule',
      x: 2540,
      y: 429,
      w: 240,
      h: 24,
    },
  ].map((region) => ({
    ...region,
    washed: false, // seals only
    painted: false, // routes only
    inked: false, // blots only
    progress: 0,
  }));
}

function distanceToRect(x, y, region) {
  const nearX = Math.max(region.x, Math.min(x, region.x + region.w));
  const nearY = Math.max(region.y, Math.min(y, region.y + region.h));
  return Math.hypot(x - nearX, y - nearY);
}

export function createPaintedCar() {
  const state = {
    regions: initialRegions(),
    // Kept explicit in the state so text QA can prove this is not secretly a
    // depleted resource system.
    paintSupply: 'infinite',
    complete: false,
    falls: 0,
    events: [],
  };

  const byId = (id) => state.regions.find((region) => region.id === id);
  const emit = (type, payload = {}) => state.events.push({ type, ...payload });

  // A region is "live" when the player's verb would currently do something.
  function isLive(region) {
    if (!region) return false;
    if (region.kind === KIND.SEAL) return !region.washed;
    if (region.kind === KIND.ROUTE) return !region.painted;
    if (region.kind === KIND.BLOT) return region.inked;
    return false;
  }

  const isSolid = (region) => Boolean(region?.kind === KIND.ROUTE && region.painted);
  const isBlocking = (region) =>
    Boolean(
      (region?.kind === KIND.SEAL && !region.washed) ||
        (region?.kind === KIND.BLOT && region.inked),
    );

  // Ink released by a wash travels its channel and settles — or does not.
  // This is the whole chapter in one function.
  function deliver(targetId, fromId) {
    const target = byId(targetId);
    if (!target) return;

    if (target.kind === KIND.SUMP) {
      emit('ink-drained', { at: target.id, from: fromId });
      return;
    }

    if (target.kind === KIND.ROUTE) {
      // Ink crossing a made bridge takes the bridge with it, then keeps
      // falling — the hole underneath is open again either way.
      if (target.painted) {
        target.painted = false;
        target.progress = 0;
        emit('route-dissolved', { id: target.id, by: fromId });
      }
      emit('ink-drained', { at: target.id, from: fromId });
      return;
    }

    if (target.kind === KIND.BLOT) {
      if (target.inked) {
        // Two lots of ink in one basin is still one blot. Never a dead end.
        emit('ink-merged', { at: target.id, from: fromId });
        return;
      }
      target.inked = true;
      target.progress = 0;
      emit('blot-formed', { id: target.id, from: fromId });
    }
  }

  // Larger than the art rectangle so the player can use the tools naturally on
  // a broad route or a tall barrier. The closest matching target wins where
  // their generous reach areas overlap.
  function regionAt(x, y, pad = 28) {
    let closest = null;
    let closestDistance = Infinity;
    state.regions.forEach((region) => {
      if (!isLive(region)) return;
      const distance = distanceToRect(x, y, region);
      if (distance > pad || distance >= closestDistance) return;
      closest = region;
      closestDistance = distance;
    });
    return closest;
  }

  function act(regionId, action, seconds) {
    const region = byId(regionId);
    if (!isLive(region)) return 0;
    if (region.action !== action) {
      emit('wrong-tool', { id: region.id, expected: region.action, used: action });
      return 0;
    }

    const amount = Math.max(0, Number(seconds) || 0);
    if (amount <= 0) return 0;
    region.progress = Math.min(1, region.progress + amount / ACTION_HOLD_SECONDS);
    if (region.progress < 1) return amount;

    if (region.kind === KIND.ROUTE) {
      region.painted = true;
      emit('route-painted', { id: region.id });
      return amount;
    }

    // Both seals and blots are ink held in place. Washing either one releases
    // it down that mark's own channel.
    if (region.kind === KIND.SEAL) region.washed = true;
    else region.inked = false;
    region.progress = 0;
    emit(region.kind === KIND.SEAL ? 'seal-washed' : 'blot-washed', { id: region.id });
    if (region.drainsTo) deliver(region.drainsTo, region.id);
    return amount;
  }

  function enterExit() {
    // Standing at the coupling is proof enough: the only way here is across a
    // bridge the player made.
    if (state.complete) return false;
    state.complete = true;
    emit('car-complete');
    return true;
  }

  return {
    state,
    byId,
    isLive: (id) => isLive(byId(id)),
    regionAt,
    paint: (id, seconds) => act(id, ACTION.PAINT, seconds),
    wash: (id, seconds) => act(id, ACTION.WASH, seconds),
    act,
    isSolid: (id) => isSolid(byId(id)),
    isBlocking: (id) => isBlocking(byId(id)),
    enterExit,
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
        paintSupply: state.paintSupply,
        complete: state.complete,
        falls: state.falls,
        regions: state.regions.map((region) => ({
          id: region.id,
          bay: region.bay,
          kind: region.kind,
          action: region.action ?? null,
          drainsTo: region.drainsTo ?? null,
          washed: region.washed,
          painted: region.painted,
          inked: region.inked,
          live: isLive(region),
          progress: Number(region.progress.toFixed(2)),
          solid: isSolid(region),
          blocking: isBlocking(region),
        })),
      };
    },
  };
}
