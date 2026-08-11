# Chapters 1 / 2 / 3 / 5 latest-main integration handoff

Last updated: 2026-08-11

## Integration boundary

- Local integration branch: `codex/latest-main-chapters-1-2-3-5`
- Base: current `main` at `570c988` (2026-08-11).
- The reviewed cyberpunk parkour package from PR #8 (`c746ffa`) is applied on
  top of that base, excluding its stale task-note conflict.
- This is a local integration branch. Nothing has been pushed or merged into
  `main`.

## Dev-menu routes

Run `npm run dev` once. The main development menu now exposes all playable
packages together:

- **Chapter 1 — Opening to Night Service:** `/chapter01-opening.html`.
  This is the latest 30.8-second cinematic preview and its complete source
  package. It ends on the actual Chapter 1 first-frame plate; **ENTER CHAPTER
  1** opens `/?chapter=0` for the matching Prologue start.
- **Chapter 1 / 2 — Cyberpunk Parkour:** `/?chapter=cyberpunk`.
  The main story column retains the normal Chapter One route; this direct entry
  is the teammate's movable-route, ladder, and flying-car development slice.
- **Chapter 3 — Echo City 3D:** `/car03-3d.html`.
- **Chapter 5 — Museum of One Answer:** `/museum-3d.html`.
- **Chapter 5 Door 1 — Labyrinth:** `/labyrinth.html`.
- **Chapter 5 Door 2 — Borrowed Grid:** `/borrowed-grid.html`.
- **Chapter 5 Echo City review:** `/museum-3d.html?beat=echo&standalone=1`.

The menu continues to list Chapters 4 and 6, and production stays unchanged:
`npm run prod` starts the Prologue, not the development menu.

## Asset ownership kept separate

- Chapter 3's active runtime package and its animation, voice, model, backdrop
  and replacement assets live under `src/cars/presentCity3d/` and
  `public/assets/chapter03-3d/`.
- Chapter 1's latest opening source, preview, narration, subtitles, storyboard
  and true gameplay-frame reference are packaged at
  `public/chapter01-opening/` rather than replaced by the earlier Parkour PR.
- Chapter 5's Echo City revisit uses its own frozen authority snapshot at
  `public/museum3d/echo-city/authority/`; it does not overwrite Chapter 3.
- The Museum enables Door 1 and Door 2 by default. Door 3 Echo City and Door 4
  Painted Country remain sealed in the default registry; the former has the
  explicit review route above. The Chapter 5 Painted Country revisit is kept at
  `chapter05-painted-country.html`, so the main Chapter 4 page remains owned by
  the latest main branch.

## Useful focused commands

- `npm run test:chapter03`
- `npm run test:chapter05`
- `npm run build:chapter03`
- `npm run build:chapter05`

## Verification on this integration branch

- Chapter 1 / 2 focused tests: 8 / 8 passed.
- Chapter 3 focused tests: 163 / 163 passed.
- Chapter 5 focused tests: 134 / 134 passed.
- `npm run assets:check`, `npm run build`, `npm run build:chapter03`,
  `npm run build:chapter05`, and `git diff --check` passed.
- Browser-checked the menu, clicked its corrected Chapter 1 opening entry and
  its **ENTER CHAPTER 1** handoff through to the literal Prologue first frame,
  then clicked its Chapter 3 entry through to the live Echo City page. The
  direct Chapter 2, Chapter 3, Chapter 5 Museum, Door 1, and Door 2 routes
  likewise produced their expected runtime states with no browser-console
  errors.
