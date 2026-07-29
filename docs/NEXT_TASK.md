# Next implementation task

Status: `READY`

Task: Fix the completion-cinematic void under sections I–IV (Phase 1, task 2 of 5)

Plan context: [PROLOGUE_V_VI_REDESIGN.md](PROLOGUE_V_VI_REDESIGN.md) sections 五
and 六. Task 1 (game-feel and presentation pass) is complete and accepted.

Note: the Chapter One `THE SAFETY TEST` interaction decision is still open and
still owned by the product lead, recorded in [PRODUCT_STATE.md](PRODUCT_STATE.md)
under "Current product gap". It does not block this task.

## Player-facing problem

Every time a section is completed, the camera freezes play and pans down to the
machinery. During that pan the player sees an empty black band where the rest of
the train's underside should be, which breaks the illusion that the train is one
continuous physical place.

## Root cause (already diagnosed — do not re-investigate)

Nothing is being hidden. The geometry was never drawn. Three compounding causes:

1. The entire under-car bay — bay box, bogie frame, wheelsets, brake shoes, coil
   springs, air reservoir, brake pipe, traction motor, coupler — is gated behind
   `if (stage.underfloor)` at `src/art/tutorialTrainRoomsArt.js:144`, drawing into
   `y = 600..886`. Only stages 5 and 6 set `underfloor: true` in `src/level.js`.
   Sections I–IV have no geometry below y=600; the room shell stops at y=600
   (`tutorialTrainRoomsArt.js:51,54`).
2. `src/scenes/GameScene.js:1897` sets `const machineY = stage.underfloor ? 720 : 548;`
   Camera bounds are 900 tall with a 600 viewport, so panning to y=720 clamps
   scrollY to 300 and frames world band y=300..900 — whose lower half is unpainted
   void for non-underfloor sections.
3. The completion vignette tweens to alpha 0.94 (`GameScene.js:1041-1046`). It is
   `setScrollFactor(0)`, depth 70, above all world objects (max world depth 61),
   and near-opaque at frame edges, so neighbouring sections are crushed to black
   exactly when the player looks at them.

Also contributing: the foreground silhouette strip at `GameScene.js:226` is solid
`0x05070b`, `scrollFactor(0)`, depth 45. It does not move when the camera pans, so
it permanently occludes screen rows 526-600 for depth ≤44 content.

Already ruled out — do not spend time here: the "removed permanent offscreen
tweens" performance fix (`setCompletedMachinery` at `TimetablePuzzle.js:1226-1264`
only calls `killTweensOf` then re-asserts static poses, touching no visibility);
SERVICE SET dimming (implemented via alpha, not visibility; completed sections
keep `roomPresent === true` at `TimetablePuzzle.js:1539`); Phaser culling (no cull
API anywhere in `src/`); masks/crops (none); camera-parented room art
(`tutorialTrainRoomsArt.js:23` forces `setScrollFactor(1)`).

## Player outcome

When the camera pans down after completing any section, the player sees a
continuous train underside running the length of the car, with previously
completed sections' machinery still legible in their final state.

## In scope

- **Continuous service layer for every section.** Extend
  `tutorialTrainRoomsArt.js:144` so all six sections have under-car structure
  below y=600. Sections I–IV do not need full bogie detail — they need continuous,
  physically plausible car-body understructure (floor beams, frame rails, conduit,
  shadow) so the band is never empty. Sections V and VI keep their full detail.
- **Reconcile the pan target with real geometry.** Replace the
  `stage.underfloor ? 720 : 548` ternary at `GameScene.js:1897` so the pan target
  derives from the section's actual machinery position (`underY`, currently 548 at
  `TimetablePuzzle.js:359`) rather than a boolean. The pan must always frame real
  geometry for every section.
- **Vignette during the completion move.** Lower the peak alpha from 0.94
  (`GameScene.js:1041-1046`) to a value that still focuses attention without
  crushing the neighbouring sections to black. Judge this visually.
- **Foreground strip during the pan.** Either fade it out for the duration of the
  completion move, or make it world-space so it travels with the camera. Pick
  whichever preserves the existing look at rest.

## Out of scope

- Any change to puzzle logic, solutions, guidance tiers, tint hinting, time
  windows, or stage data in `level.js`. Those are tasks 3–5.
- The section V and VI mechanic redesigns (tasks 4 and 5).
- Post-processing pipelines, bloom, chromatic aberration, grain.
- Changing the material language, the period-motion vocabulary, or the art
  direction of the existing bogie detail.
- The `playPrologueDeparture` / `showPrologueTransition` hardcoded-delay coupling.
- Chapter One content and the inherited combat prototype.

## Acceptance criteria

- Completing each of the six sections shows a continuous train underside during
  the pan, with no empty or unpainted band anywhere in frame.
- Completed sections' machinery remains legible during the pan — dim, but readable
  as machinery, not silhouette-black.
- Sections V and VI lose no existing under-car detail.
- At rest (normal play, no cinematic) the car looks unchanged from the current
  build. Compare screenshots before and after at a mid-section standing position.
- The completion camera grammar is preserved: freeze, descend to machinery,
  machinery performs its action, rise to the partition.
- All six sections still complete; the Prologue is playable start to finish
  through the departure cinematic and the chapter card.
- `window.render_game_to_text()` still matches visible state and still reports
  camera center and completion-cinematic state. Add no new required fields.
- FPS during the completion pan and the departure cinematic is no worse than the
  current build. The last measurement was 107 FPS during departure. Report before
  and after numbers.

## QA route

1. `npm run assets:check` and `npm run build` clean; `git diff --check` clean.
2. `npm run dev` (port 5180). Before changing anything, screenshot the completion
   pan of section I and of section V for comparison.
3. Complete section I. Confirm the downward pan shows continuous understructure,
   no void band, and that section II's dormant room is still visible and legible.
4. Repeat for sections II, III, and IV — these are the four that had no under-car
   art at all and are the primary fix target.
5. Complete section V and VI. Confirm the full bogie, wheelsets, brake shoes,
   springs, reservoir, brake pipe, traction motor, and coupler are all still
   present and unchanged in detail.
6. Stand mid-section in normal play and confirm the car reads as it did before.
7. Complete the Prologue through the departure cinematic and the
   `CHAPTER ONE // THE SAFETY TEST` card. Confirm timing is unchanged and record
   FPS.
8. Confirm `window.render_game_to_text()` matches visible state during a
   completion pan.

## Product notes

This is a visual continuity fix, and it is sequenced second deliberately: it is
seen on every single section completion, and tasks 4 and 5 will make the player
look at the undercarriage far more often, so the space below the floor cannot be
empty before those land.

Keep the confirmed direction that the undercar must read as real train machinery —
bogies, wheelsets, suspension springs, brake cylinders and shoes, air reservoirs
and hoses, axle generator or traction motor, coupler and draft gear — with cables
only as a secondary layer. For sections I–IV the new structure should be quiet
service understructure, not a second set of hero mechanisms competing with the
bogie sections.

Do not commit or push. Report the before/after FPS numbers and anything you chose
to leave out.
