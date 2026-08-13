// One statue's behavior for the Labyrinth Wing — a Weeping-Angel-style
// "grandmother's footsteps" stalker:
//
//   FROZEN  — the player currently has it inside their vision cone with a
//             clear line of sight. It does not move at all.
//   HUNTING — the player can't currently see it (out of cone, out of
//             range, or blocked by a wall) and it's within activation
//             range. It paths toward the player's cell and closes in.
//   IDLE    — outside activation range. Stands at its post.
//
// Movement uses a BFS path recomputed periodically, so a hunting statue
// always finds a real route through the maze instead of walking into walls.
// This class only ever DECIDES a velocity — the actual moving, and not
// walking through walls, is Arcade Physics' job: LabyrinthScene gives each
// statue a real physics body and a `physics.add.collider(sprite, wallLayer)`,
// so a hunting statue that reaches its target cell but is fighting a wall
// (a corner it clipped, a moment of overlap) slides along it exactly like
// the player does, instead of needing its own collision math.
//
// `justHit` is likewise not this class's decision anymore — LabyrinthScene
// sets it from a `physics.add.overlap(player, statuesGroup, ...)` callback,
// which Phaser fires during its physics step, BEFORE the scene's own
// update() (and therefore before StatueNPC.update()) runs each frame. So
// this class only ever reads/clears that flag; it must never reset it
// itself, or it would wipe out a hit the overlap already registered this
// same frame.

import { TUNING } from './labyrinthData.js';
import { bfs, reconstructPath, worldToCell, cellCenter } from './mazeGenerator.js';
import { hasLineOfSight } from './collision.js';

export class StatueNPC {
  // `sprite` is an Arcade Physics sprite (this.physics.add.sprite(...)) that
  // LabyrinthScene owns and already has a collider against the wall layer —
  // this class reads/writes it and never touches x/y directly itself.
  constructor(walls, spawnCell, spawnPos, id, sprite) {
    this.walls = walls;
    this.id = id;
    this.spawnCell = spawnCell;
    this.spawnPos = spawnPos;
    this.sprite = sprite;
    this.state = 'idle';
    this.path = null;
    this.pathIndex = 0;
    this.repathAt = 0;
    this.seen = false;
    this.justHit = false;
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  resetToSpawn() {
    this.sprite.body.reset(this.spawnPos.x, this.spawnPos.y);
    this.state = 'idle';
    this.path = null;
    this.pathIndex = 0;
  }

  // Teleport somewhere far from the player after landing a hit, instead of
  // vanishing — keeps the pressure of "it's still out there" without an
  // unfair instant re-hit. body.reset() snaps position AND zeroes velocity
  // in one call, so it doesn't drift on the frame it reappears.
  relocateAwayFrom(playerCell) {
    const best = this.spawnCell;
    const pos = cellCenter(best.x, best.y);
    this.sprite.body.reset(pos.x, pos.y);
    this.state = 'idle';
    this.path = null;
  }

  update(time, player, context = {}) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // "Seen" = inside the player's forward cone, in range, and unobstructed.
    // The cone vector must point from the PLAYER toward the statue — the
    // naive (player - statue) delta aims the opposite way and inverts the
    // whole "it only moves while you're not looking" rule.
    let seen = false;
    const visionRange = context.visionRange ?? TUNING.visionRange;
    const activationRadius = context.activationRadius ?? TUNING.activationRadius;
    if (dist <= visionRange) {
      const toStatue = { x: -dx / (dist || 1), y: -dy / (dist || 1) };
      const dot = toStatue.x * player.facing.x + toStatue.y * player.facing.y;
      const coneCos = Math.cos((TUNING.visionConeDeg * Math.PI) / 180);
      if (dot >= coneCos && hasLineOfSight(this.walls, this.x, this.y, player.x, player.y)) {
        seen = true;
      }
    }
    this.seen = seen;

    if (seen) {
      this.state = 'frozen';
      this.sprite.body.setVelocity(0, 0);
      return;
    }

    if (dist > activationRadius && this.state === 'idle') {
      this.sprite.body.setVelocity(0, 0);
      return; // still asleep at its post
    }

    this.state = 'hunting';

    if (time >= this.repathAt) {
      this.repathAt = time + TUNING.repathMs;
      const start = worldToCell(this.x, this.y);
      const goal = worldToCell(player.x, player.y);
      const result = bfs(this.walls, start, goal);
      this.path = reconstructPath(result, start, goal);
      this.pathIndex = 0;
    }

    let vx = 0;
    let vy = 0;
    const speedPxPerSec = TUNING.statueSpeed * 1000; // TUNING is px/ms; Arcade velocity is px/s

    if (this.path && this.path.length) {
      const target = this.path[this.pathIndex];
      if (target) {
        const c = cellCenter(target.x, target.y);
        const tx = c.x - this.x;
        const ty = c.y - this.y;
        const td = Math.hypot(tx, ty);
        if (td < 6) {
          this.pathIndex += 1;
        } else {
          vx = (tx / td) * speedPxPerSec;
          vy = (ty / td) * speedPxPerSec;
        }
      }
    } else if (dist > 1) {
      // No path this tick (shouldn't normally happen on a connected maze) —
      // drift straight toward the player; the wall collider still keeps it
      // honest.
      vx = (dx / dist) * speedPxPerSec;
      vy = (dy / dist) * speedPxPerSec;
    }

    this.sprite.body.setVelocity(vx, vy);
  }
}
