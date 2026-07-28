Original prompt: 你把管线搭一下但是跟玩法有关的先不用管 因为玩法我们还会整一些更有意思的机制

## Scope

- Build only the reusable world-background content pipeline.
- Do not change movement, combat, puzzles, NPCs, level geometry, story logic, or game rules.

## Work log

- 2026-07-28: Confirmed the repository is clean and has no existing pipeline or progress file.
- 2026-07-28: Pulled teammate commit `f3fb9b4`, which added story gameplay and eleven eager full-resolution panorama imports. Preserved all gameplay/story behavior while routing panorama assets through a new generated manifest.
- 2026-07-28: Added 4096px texture chunking, JPEG compression, cyberpunk deduplication, lazy current/neighbor loading, distant-texture release, URL preview selection, and read-only test diagnostics.
- 2026-07-28: Generated 30 textures from 10 unique panoramas: 108.7 MiB of source PNGs became 17.1 MiB of game assets; the production build is about 19 MiB instead of about 114 MiB.
- 2026-07-28: `assets:check`, production build, and dependency audit pass. Visually inspected Tutorial, Medieval, Final Choice, and the shared Cyberpunk asset with no seams or browser console errors. The bundled standalone Playwright client could not resolve its own Playwright package, so browser-backed local QA was used instead.
- 2026-07-28: Re-ran the full pre-push gate against the latest remote `main`: asset verification, production build, dependency audit, whitespace validation, and fresh browser checks of worlds 1, 5, 8, and 11 all passed with no console warnings or errors.

## TODO

- Optional: add a CI job that runs `npm ci`, `npm run assets:check`, and `npm run build`.
- Optional: add a dedicated automated traversal test once the team settles the final gameplay mechanics.
