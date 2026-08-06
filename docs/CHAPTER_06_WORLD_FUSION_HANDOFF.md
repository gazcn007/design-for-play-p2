# Chapter 6 — All Worlds at Once: Pairwise Fusion Slice

Status: `PLAYABLE ISOLATED VERTICAL SLICE`
Owner: Codex
Entry: `car06.html` via `vite.car06.config.js`

## What is already proven

This first slice deliberately proves the finale's central technical and design requirement before attempting the full spectacle:

> A meaningful player-made relationship survives a world switch and becomes a new physical rule in the next world.

The route is:

1. In **Borrowed Grid**, Butch reaches the dead pylon and uses `E` to make a `POWER LINK`.
2. With `Q`, the player deliberately shifts into **Painted Country**. The power link is still visible as a carried cyan/amber relationship.
3. At the brush anchor, `E` turns that carried signal into `WIND`; it paints a bridge over the paper chasm.
4. Crossing the brush boundary causes one authored **automatic** cut back to Grid. The bridge state survives the cut.
5. Back in Grid, the now-complete `POWER → WIND → BRIDGE` chain opens the witness door with `E`.

This establishes player-controlled and automatic world switching in one route without a six-item ability menu and without ever showing more than two active world rules.

## Files

- `src/chapters/allWorlds/worldFusionModel.js`: deterministic pure model.
- `src/chapters/allWorlds/AllWorldsScene.js`: Phaser visual slice and input.
- `src/car06-main.js`, `car06.html`, `vite.car06.config.js`: isolated entry.
- `tests/chapter06/worldFusionModel.test.mjs`: progression, persistence, automatic cut, gated final door, deterministic reset.

## Validation on 2026-08-04

- `node --test tests/chapter06/worldFusionModel.test.mjs`: 5/5 passing.
- `npx vite build --config vite.car06.config.js --outDir /tmp/nightfall-car06-build`: passing.
- `git diff --check`: passing for this change.
- Browser composition opened at `http://127.0.0.1:5301/car06.html` with no console errors. The browser surface could display the slice but did not retain simulated held-key input, so full natural-keyboard visual traversal remains a required human QA gate.

## Next implementation beats

The five independent chapter input slots and their exact packet contract are now locked in `docs/CHAPTER_06_INTEGRATION_PIPELINE.md`.

1. Replace the graphically simple Grid/Paper blockout with Jason's common painterly treatment while preserving all named state anchors and 960×600 geometry.
2. Connect each real chapter packet as it becomes ready; the order no longer matters.
3. Add a second pairwise beat, ideally **Museum ↔ Train**, with one interpretation changing a moving route.
4. Add the three-world overlap only after each pairwise carry contract is represented as named serializable state.
5. Integrate only through the shared chapter lifecycle owned by Codex. Do not attach this standalone slice to the main route yet.
6. Add Chapter 1 echo and Mara action only when their runtime event contracts are available; never mock them as a second directly controlled player.
