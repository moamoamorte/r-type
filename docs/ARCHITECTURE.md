# Architecture

How X-76 is put together, and the invariants worth knowing before changing anything.

## Shape of the thing

```
index.html      2D canvas (#screen) + transparent WebGL canvas (#screen3d) stacked over it, both at display resolution
preview.html    standalone model harness (no level, no game logic)
serve.py        static dev server: no-cache, /__mtime for live reload, threaded
vendor/         three.module.js + three.core.js (r180, MIT, vendored - no install)
src/            game + harness modules
```

| File | Lines | Contents |
| --- | --- | --- |
| `src/main.js` | 842 | Game loop, state machine, spawning, collision, HUD, overlays, debug warp, "WebGL required" screen |
| `src/stages.js` | 9 | Stage registry: id, name, level module, boss class |
| `src/player.js` | 529 | Player, pod, bits, every player projectile |
| `src/tuning.js` | 47 | Handling constants shared by the game and the preview sandbox |
| `src/enemies.js` | 624 | Enemy base + 8 enemy types, enemy bullets |
| `src/boss.js` | 406 | Stage 1 boss ("Oculus Bloom") |
| `src/level1.js` | 184 | Stage 1 terrain shape and spawn script |
| `src/terrain.js` | 172 | Tile collision grid + pre-rendered terrain artwork |
| `src/background.js` | 188 | Starfield, nebula, station interior, boss chamber walls |
| `src/audio.js` | 333 | Synthesised sound effects + music sequencer |
| `src/fx.js` | 125 | Particles, explosions, screen shake |
| `src/items.js` | 85 | Power-ups |
| `src/font.js` | 125 | Angular stroke font on a 5x7 grid, with a render cache |
| `src/input.js` | 83 | Keyboard + gamepad, edge detection |
| `src/util.js` | 48 | Constants and maths helpers |
| `src/view.js` | 30 | Display scale (logical → device pixels), `snap()`, scaled offscreen canvases |
| `src/render3d.js` | 195 | 3D layer: draws ship, pod and shield over the 2D playfield |
| `src/models/ship.js` | 177 | Procedural ship model |
| `src/models/pod.js` | 146 | Procedural pod model |
| `src/models/shield.js` | 91 | Faceted shield bubble with an impact-ripple shader |
| `src/models/materials.js` | 73 | Toon ramp, ink-outline shader, shared palette |
| `src/preview.js` | 445 | Harness: orbit, sequences, fly mode |
| `src/livereload.js` | 34 | Polls `/__mtime`, reloads on change |

## Game loop

`main.js` runs a fixed 60 Hz accumulator: `update()` may run several times per animation frame, `draw()` once. A thrown error is caught, logged and the loop continues, so one bad frame cannot freeze the game.

States: `title` → `play` → (`gameover` | `clear`) → `title`. From `clear` the game moves on to the next entry in `STAGES` if there is one, carrying score, lives and power-ups. Pause is a flag inside `play`. The tab losing visibility auto-pauses.

`stages.js` lists the stages. `main.js` reads everything stage-specific (terrain, spawns, checkpoints, scroll limits, boss class, names) through `game.stage`, so a new stage is one entry there plus its level and boss modules. Terrain is built when a stage is first entered and kept until the stage changes.

## Coordinates and scrolling

- The camera (`game.cam`) only moves right, at `SCROLL` = 0.55 px/frame, and stops at `BOSS_CAM` = 5600.
- **Everything lives in world coordinates.** Entities that should hold station relative to the screen set `relative = true`, which adds `scrollDelta` to their x each frame. Terrain-mounted things (turrets, hatches, walkers) leave it false.
- Drawing uses `camD = snap(cam)` and entities snap their own position (`snap(x) - cam`), both to whole *device* pixels. Static props stay locked to the terrain instead of shimmering, and slow scrolls move one device pixel at a time.
- Screen y grows downward throughout the 2D game.

## Collision

All collision is circle-based and lives in `main.js#collide()`.

- Enemies expose either themselves or a `parts` array of `{x, y, r, armored}`. Armored parts block shots (spark + "tink") but take no damage; this is how the boss's iris, the serpent's body and tentacle segments work.
- Beams pierce: they carry a `power` budget and a `hitSet` keyed by *part*, so one beam can chew through several enemies but only hits each part once.
- The pod and bits damage what they touch and absorb enemy bullets.
- The player has a percentage shield (`SHIELD_*` in `tuning.js`). Enemy bullets, enemy parts, the boss and terrain all go through `game.hitPlayer(kind, angle)`, which spends shield and opens a short invulnerable window (`player.inv`, with `player.hitT` marking it as a hit rather than a respawn). A hit on an empty shield destroys the ship.
- Touching terrain also bounces the ship back to its last clear position. If that position is no longer reachable (pinned against a wall by the scroll), the ship is crushed outright.

## Terrain

`terrain.js` holds a `Uint8Array` grid: 8px tiles, 28 rows (224px), 748 columns for stage 1. Values are tile *types* (hull / organic / machine), not sprites.

Art is **pre-rendered in 256px strips** at the display scale, built as the camera approaches (one strip ahead) and dropped once passed; a stage-wide canvas at device resolution would exceed canvas size limits. `render()` computes a depth map (distance to the nearest empty tile) that drives shading, so interiors darken with depth and surfaces get bevels, rivets and vents. Each tile seeds its own PRNG, so a strip draws the same whatever its neighbours. Changing the grid needs another `render()`.

Queries: `solidAt(x, y)`, `boxSolid(cx, cy, hw, hh)`, `floorY(x, fromY)`, `ceilY(x, fromY)`. The `fromY` hints matter — scanning for a floor from the wrong side finds the wrong surface (this caused a real bug with turrets mounted on the central block).

## Stage 1

`level1.js` exports `buildTerrain()`, `buildSpawns()`, `CHECKPOINTS`, `WARNING_CAM`, `BOSS_CAM` and `SCROLL`; every level module has the same shape.

- Terrain is built from ceiling/floor height profiles per column plus explicit rectangles for pillars, blocks and obstacles.
- Spawns are a list sorted by camera position: `{x: camTrigger, type, ...opts}`. Terrain-mounted enemies carry `wx` (world x) and `static: true`, and are triggered a screen-width early.
- Constants: `CHECKPOINTS = [0, 1080, 2560, 3480, 4560, 5300]`, `WARNING_CAM = 5470`, `BOSS_CAM = 5600`.
- Death sends the player back to the highest checkpoint passed, clears the field and **removes all power-ups** (arcade-style). Passing a checkpoint, and every new life, refills the shield.

Enemies: Drifter, Dart, Carrier (drops power-ups, including shield cells), Turret, Hopper, Bulwark (heavy walker), Hatch (spawner), Larva, Serpent. Boss: 170 hp, an armoured iris that opens on a cycle, two 16-segment tentacles, spore launches, and a faster second phase below half health.

## Rendering: two stacked layers

**Resolution.** `fit()` in `main.js` sizes the canvas to the largest 384×240 box that fits the window (fractional, aspect preserved) and sets its backing store to that size × `devicePixelRatio`, capped at `MAX_SCALE` = 6. That multiplier is `view.s` (`view.js`). `draw()` starts with `setTransform(s, …)`, so every draw call still works in logical pixels. Anything pre-rendered (font glyphs, nebula/girders/flesh, boss body, terrain strips, the HUD ship icon) is built at `view.s` through `scaledCanvas()` and rebuilt when `view.gen` changes, then blitted 1:1. `fit()` runs on resize, fullscreen change and pixel-ratio change; everything else picks the new scale up on its next draw.

The 2D canvas draws background, terrain, enemies, items, projectiles, effects and the HUD. The WebGL canvas sits above it, transparent, covering only the playfield (93.333% height, the HUD strip excluded), and draws the ship, pod and shield bubble. The bubble reads `player.shield` and `player.lastHit`. The beam's charge orb is the one part of the player still drawn on the 2D canvas.

`render3d.js`:

- Orthographic camera mapping **game pixels 1:1** to world units: `(0, W, 0, -H)`. An entity at screen (x, y) is placed at world (x, −y).
- Internal resolution is the display scale (`setScale(view.s)`), so the 3D models are exactly as sharp as the 2D canvas under them. See DECISIONS §15.
- The ship model is scaled 0.78 and the pod 0.72 (`SHIP_SCALE`, `POD_SCALE` in `tuning.js`), which is what makes them the right size on a 384px-wide field.
- **WebGL is required.** `Render3D.create()` returns `null` when WebGL is unavailable; the boot code in `main.js` then shows a "WebGL required" screen on the 2D canvas and never creates the `Game`, so game code can assume `game.r3d` exists. See DECISIONS §21.
- The layer reads `player.tilt` (vertical lean) and `player.turn` (horizontal lean) and passes them as `bank` and `dip`. The ship model uses only dip's magnitude, so the nose drops whichever way the ship slides. It also watches `pod.state` and triggers the pod's clamp/release animations on transitions.
- `renderTitle(t)` poses the ship larger and turning for the title screen; `render()` resets scale and pose.

## Models

Built in code, no asset files. Conventions:

- **+X forward, +Y up, +Z out.** A model's root carries the display pose (a small yaw and pitch, so a side-on camera still sees the top and flank); a child group takes bank/dip so the pose is not disturbed.
- **Angular only.** Prisms use 4-8 radial segments; plates are extruded 2D outlines with a bevel; the pod's core is an octahedron. Nothing reads as a smooth curve.
- **Cel shading**: `MeshToonMaterial` with a 3-step gradient ramp.
- **Ink outlines**: an inverted-hull shell per mesh — the same geometry with `side: BackSide`, pushed along its normals by a shader. `part(geometry, material, {outline})` builds the mesh + shell pair; `setOutlines(false)` hides every shell.
- Ship: four swept arms in an X, hull tapering to a drooped nose, faceted canopy on the nose, muzzle flash and recoil on `fire(power)`.
- Pod: faceted core inside three armour plates on a faceted ring, three claws on a rig that flips to face the hull it grips. `clamp()` snaps the claws shut with a jolt and flash; `release()` opens them.

## Audio

Everything is synthesised at runtime (`audio.js`): oscillators and filtered noise for effects, a lookahead scheduler for music. Two original tunes (stage, boss) plus a clear jingle, written as note-name strings. The beam charge is a continuous oscillator whose frequency tracks the charge level. Audio only initialises after a user gesture, as browsers require.

## Preview harness

`preview.html` + `preview.js`, independent of the game. Controls sit along the bottom.

- **Fly it** — a sandbox using the game's own `Input` class and the game's per-frame constants imported from `tuning.js` (speed, banking, charge timing, beam levels, pod state machine), so handling matches the game. Conversion: preview world units = game pixels ÷ 0.78.
- **Sequences** — firing, charged beam, pod fly-in, pod docking front/rear. Each loops and can be replayed.
- Orbit/zoom, preset camera angles, outline/wireframe/grid toggles, light angle, backgrounds, PNG export.
- The active sequence is remembered in `sessionStorage` so a live reload drops you back in place.

## Dev server and live reload

`serve.py` is a threaded `http.server` that sends `Cache-Control: no-store` (so edited modules always reload) and serves `/__mtime`, the newest mtime across `.js`/`.html`/`.css`. `livereload.js` polls it every 700ms and reloads on change, tolerating short outages such as a server restart. Only the preview page imports it; the game page does not.
