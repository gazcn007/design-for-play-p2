# Nightfall

A 2D lane-shifting action platformer built with Phaser 3 — a gaslit gothic
skyline, silhouette traversal, a quick cleaver strike, and two depth lanes to
shift between.

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # -> dist/
```

## Controls

| Key | Action |
| --- | --- |
| `←` `→` / `A` `D` | Move |
| `Space` / `↑` | Jump (hold for height) |
| `Shift` | Run |
| `W` | Shift into the background (far lane) |
| `S` | Shift toward the camera (near lane) |
| `F` | Strike |
| `E` | Interact — levers |
| `R` | Restart |
| `0` | Toggle Arcade physics debug |

## How the depth lanes work

The world stays flat and readable. Both lanes live in the **same Arcade physics world**,
just at different vertical bands: the far lane's ground surface is at `y=290`,
the near lane's at `y=460`. Depth is sold with four cues layered together:

- **Vertical separation** — the two playfields occupy distinct screen bands.
- **Scale** — far-lane sprites render at `0.78`, and far-lane terrain uses
  `setTileScale` so its masonry shrinks *without* changing collision boxes.
- **Value** — both lanes are crushed to silhouettes against the painted
  backdrop, the near one darker. See the value ramp under *Art direction*.
- **Parallax** — the painted panorama, two drifting fog banks, inter-lane mist
  and the foreground brambles all scroll at different rates.

Lane separation is enforced by a **single collider with a process callback**:

```js
this.physics.add.collider(
  this.player, this.solids, this.onSolidHit,
  (p, s) => s.laneId === p.lane && s.body.enable && !p.transiting,
);
```

The player simply cannot touch geometry belonging to the other lane. Enemies
use the same lane check on their overlap callback.

Shifting lanes maps the player's height above their current lane's floor onto
the destination lane, scaled by the ratio of lane scales
(`Player.laneTargetY`). `GameScene.canOccupyLane` probes the destination first
and refuses the shift if it would put the player inside solid rock.

## Where to change things

| I want to... | Edit |
| --- | --- |
| Retune jump feel, speed, lane timing | `src/constants.js` → `MOVE` |
| Move platforms, enemies, and pits | `src/level.js` |
| Change lane depth/scale/tint | `src/constants.js` → `LANES` |
| Redraw any sprite | `src/textures.js` |
| Swap the backdrop painting | the import in `src/scenes/BootScene.js` |
| Reframe the backdrop | `src/constants.js` → `BACKDROP` |
| Retune the value ramp / fog | `src/palette.js` + `LANES` tints |
| Move lamps, hearses, fences, graves | `src/level.js` → `decor` |
| Add a new interactable | `src/level.js` + `GameScene.fireInteractable` |

### Jump feel

The jump is not a single impulse. `src/Player.js` layers the things that make a
platformer feel forgiving:

- **Coyote time** (110 ms) — jump slightly after walking off a ledge.
- **Jump buffering** (130 ms) — press jump slightly before landing.
- **Variable height** — release early and upward velocity is cut to 42%.
- **Asymmetric gravity** — 0.6× near the apex, 1.3× while falling, so you
  float at the top and come down snappy.

Scripted launches go through `Player.launch()`, which deliberately clears
`isJumping` so the variable-height cut doesn't chop them.

## Art direction

Three layers, and the distinctions matter:

- **The backdrop** is a painting (`src/assets/yharnam.png`) — the one real
  asset in the project. It replaced the procedurally generated skyline.
- **Silhouettes** are drawn in grey and *tinted* per lane. Tint is
  multiplicative, so every texture is drawn at its lightest value and each lane
  multiplies it down. Against a painting, both lanes go nearly black.
- **Lights** — lamp haloes and cleaver trails are separate additive sprites
  that are never lane-tinted. That keeps the few bright accents deliberate.

Everything hangs off one rule: **the scene is a monotonic value ramp that
darkens toward the camera.** Measured luminance, sampled off the canvas:

```
backdrop city > FAR lane > NEAR lane > foreground brambles
     46            19          6              4
```

Break the monotonicity anywhere and the depth read collapses, however good the
individual layer looks in isolation. Three things did break it during
development and are worth not re-introducing:

1. Lane tints originally made the far lane *lighter* than the skyline behind
   it, so the mid-distance flattened into one grey slab.
2. `fogDrift` sat at depth 13 — in front of the far lane — and washed its face
   lighter than the city. It now sits below the far lane's surface (y 384).
3. When the painting arrived, the far lane at luminance 28 sat inside a
   backdrop range of 27–39 — no separation at all, so it read as a flat grey
   slab pasted over the art. Both lanes were pushed to silhouette to fix it.

### Silhouettes need two escape hatches

Crushing the lanes to black breaks two things that a mid-grey lane hid, and
both are handled by colours that bypass the lane tint entirely:

- **`LANES[].rim`** — the moonlit lip on every ledge. The baked rim multiplied
  by a silhouette tint landed within *2 luminance* of the body, leaving the
  surface you stand on with no visible edge. The rim is now its own strip.
- **`LANES[].figureTint`** — the hunter, beasts, levers and flags. At the
  terrain tint they vanished into ground that is just as black.

### The backdrop

One `Image`, not a tileSprite. Tiling a painting this specific would repeat its
moon several times across the level and put a seam at every wrap. Instead the
scroll factor is *derived* from the image width so the panorama pans across
exactly once end to end — no repeat, no seam, and the far side of the city
becomes a reward for reaching the far side of the level.

Everything is measured off the source image at runtime, so swapping the
painting means changing one import in `BootScene`. `BACKDROP` in
`src/constants.js` holds the framing:

| Field | Does |
| --- | --- |
| `height` | scaled height in px; taller than the viewport on purpose |
| `horizonFrac` | where the skyline meets the ground haze, as a fraction of the image |
| `horizonY` | the game y that horizon lands on |
| `tint` | multiplicative — holds the painting above the far lane in the ramp |

`horizonY` is pushed low (560) deliberately: the painting has its own
cobblestone plaza and fence row, and they sit exactly where the play area is.
Cropping them below the viewport was the difference between the art supporting
the level and competing with it.

Dropping the inter-lane treeline was the other win — the painting's own lamplit
street now shows through the gap between the two lanes.

## Assets

Exactly one: the backdrop painting. Everything else — every sprite, tile, fog
bank, glow and vignette — is drawn with the Graphics API at boot in
`src/textures.js` and baked into a texture, and all sound is synthesized with
WebAudio oscillators in `src/sfx.js`.

Two Graphics constraints shaped the procedural art: `fillGradientStyle` does
**not** survive `generateTexture`, so every gradient (sky, vignette, glow) is
built from solid per-row or per-pixel fills; and Graphics has no erase, which
is why shapes are stroked rather than carved out of solid blocks.

One Phaser gotcha worth knowing if you go looking for objects at runtime: a
**TileSprite's `texture.key` is an internal UUID**, not the source key you
passed in. Filtering the display list by `texture.key === 'terrain-cap'` finds
nothing and looks exactly like the objects were never created.

## Version pins

- **Phaser 3.90.0**, not 4.x. Phaser 4 is a renderer rewrite with API churn;
  essentially all Phaser tutorials and Stack Overflow answers target v3.
- **Vite 6.4.3**, not 7/8. Vite 7+ requires Node `^20.19.0 || >=22.12.0`.
  If you upgrade Node past 20.19, you can bump Vite freely.

## Layout

```
index.html
src/
  main.js          Phaser config + game boot (exposes window.game)
  constants.js     tuning: lanes, gravity, movement feel
  level.js         all level data (solids, enemies, interactables)
  textures.js      procedural art
  sfx.js           WebAudio blips
  palette.js       the value ramp — every colour in the game
  assets/          the backdrop painting (the only asset)
  Player.js        movement, jump, lane shifting
  scenes/
    BootScene.js   bakes textures, starts Game
    GameScene.js   world build, collisions, interactions
    HudScene.js    score/lives/lane, toasts, win + game-over overlays
```
