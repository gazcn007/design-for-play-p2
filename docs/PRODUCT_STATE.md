# Infinity Train product state

Last reviewed: 2026-07-28

## North star

Build a complete 2D single-player train journey whose cars move backward
through different eras. Each car should feel like a compact mechanical and
narrative episode rather than another stretch of the same platforming/combat
level.

## Current playable build

The opening is a 4,800-pixel Prologue made of six connected train sections. The
player uses a brass ticket punch and direct physical controls to teach the train
DOOR, BRAKE, POWER, VENT, and COUPLE actions. The final section requires timing
the present player's actions with an authored replay of an earlier action.

The Prologue currently includes:

- six gated sections with persistent completed-room states;
- period train motion and physical undercarriage feedback;
- a world-space carriage shell over the station panorama;
- a departure cinematic and `CHAPTER ONE // THE SAFETY TEST` transition;
- deterministic development routes for every major puzzle and transition state;
- a production-verified world-background pipeline for all ten panoramas.

After the Prologue, the build still enters inherited prototype content. That
material contains useful movement, lane, combat, dialogue, checkpoint, and
world-switching systems, but it is not yet a finished Chapter One and its
witness/simulation story is not authoritative canon.

## Accepted experience rules

- The protagonist is the only directly controlled human.
- A remembered self may be an authored replay, but not a continuously controlled
  second avatar.
- Train interiors inherit the exterior world's material language.
- First-time rules should be demonstrated by environmental states before prose.
- New rooms exist as dim physical spaces before activation; doors should not
  make content pop into existence.
- Completed spaces remain visible as non-interactive tableaux with their final
  machinery state intact.
- Mechanical success is shown through the affected machine, then the door or
  partition transition, rather than only through text or a gauge.
- Crisp low-pixel/low-poly rendering and clear silhouettes are the current art
  direction.

## Current product gap

Chapter One needs a product-approved vertical slice. Its mechanic must express
`THE SAFETY TEST`, use the AI-apocalypse exterior, build on the player's new
relationship with the train, and avoid becoming either another timetable-order
puzzle or a return to generic combat-only progression.

The product lead should define the first small, testable Chapter One slice.
Codex should not invent the missing mechanic. This decision is currently parked
rather than in `docs/NEXT_TASK.md`, because that file is carrying the Phase 1
polish sequence; the decision remains open and owned by the product lead.

## Parallel workstream: Phase 1 depth and presentation

Reviewed 2026-07-29. A code audit of the shipped Prologue found two problems that
are independent of the Chapter One decision and can proceed now.

Mechanical depth: clearing the Prologue takes 17 interactions but contains only
one genuine decision, the three-command ordering in section III. Guidance and
validation duplicate each other three times over — input-layer pre-validation
rejects wrong answers before they land, the next correct device is tinted gold,
and error toasts name the correct command. Four of the six authored `FAIL_LINES`
are unreachable, and sections I, II, V, and VI cannot fail at all.

Presentation: the environment work is strong (17 continuous ambient loops, real
squash/stretch, an authored completion camera grammar), but there is no
screen-level game feel (`timeScale` is never used), no music or ambient audio
loop of any kind, no pitch variation so repeated cues are byte-identical, and the
player's entire airborne state is two static frames.

Plan and task sequence: `docs/PHASE1_POLISH_PLAN.md`. Three tasks, presentation
first (lowest risk, no product dependency), then guidance tiering, then time
windows and the echo rework once playtest data exists.
