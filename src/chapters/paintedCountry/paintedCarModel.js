// Chapter 4 // THE PAINTED COUNTRY — the whole car, as rules.
//
// The player draws ANYWHERE rather than triggering fixed targets. Two verbs,
// both free-hand:
//
//   LEFT  — paint a cell. It becomes real paper you can stand on.
//   RIGHT — wash a cell. It removes your own paint, and eats paper blocks.
//
// One physical rule keeps free drawing from being a fly cheat, and it is the
// rule that turns drawing into *building*:
//
//   **paint has to go ON something.**
//
// A cell can only be painted if it touches paper that is already there — the
// floor, a wall, a block, or a stroke you painted a moment ago. So a player who
// wants to be higher up paints a step, climbs onto it, and paints the next one.
// Staircases are not a special mechanic; they are what the rule makes.
//
// Varnished cells refuse paint entirely, which is how the car says "not this
// way" without taking the brush out of the player's hand.
//
// There is no pigment, no inventory, no counter and no timer. What the player
// has to work out is the gallery: three pictures hung too high to read from the
// floor, and a door that wants to know which sign was in every one of them.

import {
  BLOCK_RECTS,
  BOARD,
  CELL,
  DOOR,
  FLOOR_ROW,
  FLOOR_SPANS,
  GLAZE_RECTS,
  GRID,
  PAINTINGS,
  READ_RADIUS,
} from './carLayout.js';

export const CELL_SIZE = CELL;

// A ceiling on painted cells. Not a resource the player spends — it is far
// past anything a real solution needs, and exists only so a stuck mouse button
// cannot fill the car with collision bodies.
export const MAX_PAINTED = 1500;

export const idx = (cx, cy) => cy * GRID.w + cx;
export const colOf = (worldX) => Math.floor(worldX / CELL);
export const rowOf = (worldY) => Math.floor(worldY / CELL);

function rectCells(rects) {
  const set = new Set();
  rects.forEach(({ col, row, cols, rows }) => {
    for (let cx = col; cx < col + cols; cx += 1) {
      for (let cy = row; cy < row + rows; cy += 1) set.add(idx(cx, cy));
    }
  });
  return set;
}

function terrainCells() {
  const set = new Set();
  FLOOR_SPANS.forEach(({ from, to }) => {
    for (let cx = from; cx < to; cx += 1) {
      for (let cy = FLOOR_ROW; cy < GRID.h; cy += 1) set.add(idx(cx, cy));
    }
  });
  return set;
}

export function createPaintedCar() {
  const terrain = terrainCells();
  const glaze = rectCells(GLAZE_RECTS);

  const state = {
    painted: new Set(),
    blocks: rectCells(BLOCK_RECTS),
    seen: new Set(),
    // Kept explicit so text QA can prove this is not secretly a resource game.
    paintSupply: 'infinite',
    board: { cords: {}, drawing: null },
    door: { chosen: null, solved: false, wrongTries: 0 },
    complete: false,
    falls: 0,
    events: [],
  };

  const emit = (type, payload = {}) => state.events.push({ type, ...payload });

  const inBounds = (cx, cy) => cx >= 0 && cy >= 0 && cx < GRID.w && cy < GRID.h;
  const isTerrain = (cx, cy) => terrain.has(idx(cx, cy));
  const isGlaze = (cx, cy) => glaze.has(idx(cx, cy));
  const isBlock = (cx, cy) => state.blocks.has(idx(cx, cy));
  const isPainted = (cx, cy) => state.painted.has(idx(cx, cy));
  const isSolid = (cx, cy) =>
    inBounds(cx, cy) && (isTerrain(cx, cy) || isBlock(cx, cy) || isPainted(cx, cy));

  // The rule that makes drawing into building. Diagonals count, so a staircase
  // can be drawn as a staircase rather than as an L at every step.
  function touchesSomething(cx, cy) {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        if (dx === 0 && dy === 0) continue;
        if (isSolid(cx + dx, cy + dy)) return true;
      }
    }
    return false;
  }

  function paintRefusal(cx, cy) {
    if (!inBounds(cx, cy)) return 'off-sheet';
    if (isGlaze(cx, cy)) return 'varnished';
    if (isSolid(cx, cy)) return 'already-solid';
    if (!touchesSomething(cx, cy)) return 'nothing-to-hold-it';
    if (state.painted.size >= MAX_PAINTED) return 'sheet-full';
    return null;
  }

  const canPaint = (cx, cy) => paintRefusal(cx, cy) === null;

  function paint(cx, cy) {
    const refusal = paintRefusal(cx, cy);
    if (refusal) {
      emit('paint-refused', { cx, cy, reason: refusal });
      return false;
    }
    state.painted.add(idx(cx, cy));
    emit('painted', { cx, cy });
    return true;
  }

  // A wash takes back the player's own paint, and eats paper blocks. It can
  // never remove the carriage itself — the floor is not the player's to undo.
  const canWash = (cx, cy) => inBounds(cx, cy) && (isPainted(cx, cy) || isBlock(cx, cy));

  function wash(cx, cy) {
    if (!inBounds(cx, cy)) return false;
    const key = idx(cx, cy);
    if (state.painted.delete(key)) {
      emit('unpainted', { cx, cy });
      return true;
    }
    if (state.blocks.delete(key)) {
      emit('block-washed', { cx, cy });
      return true;
    }
    if (isTerrain(cx, cy)) emit('wash-refused', { cx, cy, reason: 'that-is-the-carriage' });
    return false;
  }

  // Reading a picture is simply getting your face near it, which is only
  // possible on something the player built.
  function look(playerX, playerY) {
    PAINTINGS.forEach((picture) => {
      if (state.seen.has(picture.id)) return;
      const cx = picture.x + picture.w / 2;
      const cy = picture.y + picture.h / 2;
      if (Math.hypot(playerX - cx, playerY - cy) > READ_RADIUS) return;
      state.seen.add(picture.id);
      emit('picture-read', { id: picture.id, signs: picture.signs });
    });
  }

  const allSeen = () => state.seen.size === PAINTINGS.length;

  // ------------------------------------------------------- the thread board
  BOARD.pairs.forEach((pair) => {
    state.board.cords[pair.id] = [];
  });

  const inBoard = (c, r) => c >= 0 && r >= 0 && c < BOARD.cols && r < BOARD.rows;
  const isTorn = (c, r) => BOARD.torn.some(([tc, tr]) => tc === c && tr === r);
  const endpointAt = (c, r) => {
    const pair = BOARD.pairs.find(
      (p) => (p.a[0] === c && p.a[1] === r) || (p.b[0] === c && p.b[1] === r),
    );
    return pair ? pair.id : null;
  };
  const cordCovering = (c, r) =>
    BOARD.pairs.find((p) => state.board.cords[p.id].some(([cc, rr]) => cc === c && rr === r))?.id ??
    null;

  const cordComplete = (pairId) => {
    const pair = BOARD.pairs.find((p) => p.id === pairId);
    const cord = state.board.cords[pairId];
    if (!pair || cord.length < 2) return false;
    const [sc, sr] = cord[0];
    const [ec, er] = cord[cord.length - 1];
    const isA = sc === pair.a[0] && sr === pair.a[1];
    const isB = ec === pair.b[0] && er === pair.b[1];
    const isBA = sc === pair.b[0] && sr === pair.b[1] && ec === pair.a[0] && er === pair.a[1];
    return (isA && isB) || isBA;
  };

  const boardSolved = () => BOARD.pairs.every((p) => cordComplete(p.id));

  // Begin a cord. Grabbing either end of a pair starts that pair again from
  // scratch, so a tangle is undone by simply redrawing it.
  function boardBegin(c, r) {
    if (!inBoard(c, r)) return null;
    const pairId = endpointAt(c, r);
    if (!pairId) return null;
    state.board.cords[pairId] = [[c, r]];
    state.board.drawing = pairId;
    emit('cord-started', { pair: pairId });
    return pairId;
  }

  function boardExtend(c, r) {
    const pairId = state.board.drawing;
    if (!pairId || !inBoard(c, r) || isTorn(c, r)) return false;
    const cord = state.board.cords[pairId];
    const [lc, lr] = cord[cord.length - 1];
    if (lc === c && lr === r) return false;

    // Dragging back over yourself shortens the cord — the natural way to fix a
    // wrong turn without starting over.
    if (cord.length >= 2) {
      const [pc, pr] = cord[cord.length - 2];
      if (pc === c && pr === r) {
        cord.pop();
        return true;
      }
    }
    if (Math.abs(c - lc) + Math.abs(r - lr) !== 1) return false;

    const occupant = cordCovering(c, r);
    if (occupant) {
      if (occupant !== pairId) emit('cord-blocked', { pair: pairId, by: occupant });
      return false;
    }
    const endpoint = endpointAt(c, r);
    if (endpoint && endpoint !== pairId) {
      emit('cord-blocked', { pair: pairId, by: endpoint });
      return false;
    }

    cord.push([c, r]);
    if (cordComplete(pairId)) {
      state.board.drawing = null;
      emit('cord-joined', { pair: pairId });
      if (boardSolved()) emit('board-solved');
    }
    return true;
  }

  // Letting go part-way leaves nothing behind: a half-drawn cord would only sit
  // in the way of the next attempt.
  function boardRelease() {
    const pairId = state.board.drawing;
    state.board.drawing = null;
    if (!pairId) return;
    if (!cordComplete(pairId)) state.board.cords[pairId] = [];
  }

  function boardClearAt(c, r) {
    const pairId = cordCovering(c, r);
    if (!pairId) return false;
    state.board.cords[pairId] = [];
    emit('cord-pulled', { pair: pairId });
    return true;
  }

  // The door will not answer a player who has not looked at the pictures. That
  // is the difference between solving it and guessing it one sign in four.
  function chooseSign(sign) {
    if (state.door.solved) return { ok: true, reason: 'already-open' };
    // The board is a shutter over the signs: until it is threaded there is
    // physically nothing to press.
    if (!boardSolved()) {
      emit('door-dark');
      return { ok: false, reason: 'board-not-threaded' };
    }
    if (!allSeen()) {
      emit('door-silent', { seen: state.seen.size, of: PAINTINGS.length });
      return { ok: false, reason: 'not-all-pictures-read' };
    }
    state.door.chosen = sign;
    if (sign === DOOR.correct) {
      state.door.solved = true;
      state.complete = true;
      emit('door-opened', { sign });
      return { ok: true, reason: 'correct' };
    }
    state.door.wrongTries += 1;
    emit('door-refused', { sign, tries: state.door.wrongTries });
    return { ok: false, reason: 'wrong-sign' };
  }

  return {
    state,
    inBounds,
    isTerrain,
    isGlaze,
    isBlock,
    isPainted,
    isSolid,
    canPaint,
    canWash,
    paintRefusal,
    paint,
    wash,
    look,
    allSeen,
    chooseSign,
    inBoard,
    isTorn,
    endpointAt,
    cordCovering,
    cordComplete,
    boardSolved,
    boardBegin,
    boardExtend,
    boardRelease,
    boardClearAt,
    // Which signs the player has actually seen, so the HUD can show the
    // evidence without ever showing the answer.
    signsSeen() {
      const tally = {};
      PAINTINGS.filter((p) => state.seen.has(p.id)).forEach((p) =>
        p.signs.forEach((s) => {
          tally[s] = (tally[s] || 0) + 1;
        }),
      );
      return tally;
    },
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
        painted: state.painted.size,
        blocksLeft: state.blocks.size,
        picturesRead: PAINTINGS.map((p) => p.id).filter((id) => state.seen.has(id)),
        allPicturesRead: allSeen(),
        signsSeen: this.signsSeen(),
        board: {
          solved: boardSolved(),
          joined: BOARD.pairs.filter((p) => cordComplete(p.id)).map((p) => p.id),
          drawing: state.board.drawing,
        },
        door: { ...state.door },
        complete: state.complete,
        falls: state.falls,
      };
    },
  };
}
