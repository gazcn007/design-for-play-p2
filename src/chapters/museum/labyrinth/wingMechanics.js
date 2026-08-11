// Pure level-rule helpers for the Labyrinth Wing difficulty curve.
// Kept engine-free so generation and tests can prove that every moving-maze
// state remains completable before Phaser ever paints a tile.

const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

export function cloneWalls(walls) {
  return walls.map((row) => row.slice());
}

export function reachableCells(walls, start) {
  const h = walls.length;
  const w = walls[0]?.length ?? 0;
  const seen = new Set();
  if (!start || walls[start.y]?.[start.x] !== false) return seen;
  const q = [start];
  seen.add(`${start.x},${start.y}`);
  for (let i = 0; i < q.length; i += 1) {
    const cur = q[i];
    for (const [dx, dy] of DIRS) {
      const x = cur.x + dx;
      const y = cur.y + dy;
      const id = `${x},${y}`;
      if (x < 0 || y < 0 || x >= w || y >= h || walls[y][x] || seen.has(id)) continue;
      seen.add(id);
      q.push({ x, y });
    }
  }
  return seen;
}

export function allTargetsReachable(walls, targets) {
  if (!targets.length) return true;
  const seen = reachableCells(walls, targets[0]);
  return targets.every((p) => seen.has(`${p.x},${p.y}`));
}

function corridorCells(walls, solid) {
  const cells = [];
  for (let y = 1; y < walls.length - 1; y += 1) {
    for (let x = 1; x < walls[0].length - 1; x += 1) {
      // Room centres are odd/odd. Only passage cells are allowed to move,
      // so no key, stair, statue post, or player-safe room can become a wall.
      if ((x % 2 === 0) === (y % 2 === 0)) continue;
      if (walls[y][x] === solid) cells.push({ x, y });
    }
  }
  return cells;
}

export function buildSolvableMovingMazeStates(baseWalls) {
  const roomTargets = [];
  for (let y = 1; y < baseWalls.length; y += 2) {
    for (let x = 1; x < baseWalls[0].length; x += 2) roomTargets.push({ x, y });
  }

  const closable = corridorCells(baseWalls, false).filter((cell) => {
    const probe = cloneWalls(baseWalls);
    probe[cell.y][cell.x] = true;
    return allTargetsReachable(probe, roomTargets);
  });
  const openable = corridorCells(baseWalls, true);

  const states = [{ id: 0, changes: [] }];
  const used = new Set();
  for (let stateId = 1; stateId <= 2; stateId += 1) {
    const close = closable.find((cell) => !used.has(`${cell.x},${cell.y}`));
    const open = openable.find((cell) => {
      if (used.has(`${cell.x},${cell.y}`)) return false;
      if (!close) return false;
      return Math.abs(cell.x - close.x) + Math.abs(cell.y - close.y) >= 5;
    });
    if (!close || !open) break;
    used.add(`${close.x},${close.y}`);
    used.add(`${open.x},${open.y}`);
    const changes = [
      { ...close, solid: true },
      { ...open, solid: false },
    ];
    const probe = cloneWalls(baseWalls);
    for (const change of changes) probe[change.y][change.x] = change.solid;
    if (allTargetsReachable(probe, roomTargets)) states.push({ id: stateId, changes });
  }
  return states;
}

export function stateWalls(baseWalls, state) {
  const walls = cloneWalls(baseWalls);
  for (const change of state?.changes ?? []) walls[change.y][change.x] = change.solid;
  return walls;
}

export function stateWouldCrush(state, occupiedCells) {
  return (state?.changes ?? []).some((change) => (
    change.solid && occupiedCells.some((cell) => cell.x === change.x && cell.y === change.y)
  ));
}
