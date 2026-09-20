# Nebula Lance

A browser-based horizontal shooter in the style of the classic late-80s arcade games.
It runs entirely in the browser: plain ES modules, Canvas 2D, and Web Audio. There are no dependencies, no build step, and no asset files.
All graphics, music, and sound effects are generated in code, and every character and enemy is an original design.

Stage 1, "The Hollow Station", is complete: open space, then a station interior, then a boss chamber.

## Running

ES modules need to be served over HTTP (opening `index.html` from disk won't work):

```bash
python3 serve.py
```

Then open http://localhost:8765. Any other static file server also works. `serve.py` just disables caching so edits always reload.

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move | Arrow keys / WASD | D-pad / left stick |
| Shoot | Z / Space / J (tap) | A / RT |
| Charge beam | Hold shoot, release to fire | Hold A |
| Launch / recall pod | X / Shift / K | B / X / LT |
| Pause | P / Esc | Start |
| Mute | M | |
| Fullscreen | F | |

## How it plays

- **Charge beam:** hold fire to fill the BEAM meter, then release. Higher charge gives a bigger, piercing shot.
- **Pod:** your first crystal summons an indestructible pod. It docks to your nose or tail when you touch it. It blocks bullets and damages anything it touches. Launch it forward (or backward), then recall it with the pod button. When docked it fires the laser for its colour:
  - **Red, Helix:** twin spiralling beams.
  - **Blue, Ricochet:** a spread that bounces off walls.
  - **Yellow, Crawler:** shots that run along floors and ceilings.

  Crystals cycle colour, so you choose which laser you pick up. Each extra crystal raises the pod level, up to 3.
- **Other power-ups:** `S` gives more speed, `M` gives homing missiles, and `B` gives a bit (a drone that blocks bullets, up to 2).
- **Carriers** (armoured walkers with a glowing cargo pod) drop the power-ups.
- **Dying** sends you back to the last checkpoint and removes all power-ups. You get an extra ship at 50,000 points and every 100,000 after that.
- **The boss** only takes damage while its armoured iris is open. Parking the pod in the open eye works very well.

## 3D models

The player ship and pod are real 3D models rendered with Three.js (vendored in `vendor/`, no install or build step). They sit on a transparent canvas over the 2D playfield, so all game logic stays 2D. Everything else — terrain, enemies, boss, effects — is still 2D for now.

- The models are built in code, so there are no asset files.
- Shading is cel-style with ink outlines, to match a hand-drawn anime look.
- If WebGL is unavailable the game falls back to the original 2D sprites. Add `?flat=1` to the URL to force that.

## Model preview harness

Open http://localhost:8765/preview.html to inspect models without playing. Controls run along the bottom of the page.

**Sequences** play back the animations the game uses:

| Button | Shows |
| --- | --- |
| Idle | The ship flying, banking and idling |
| Firing | Tap-fire: muzzle flash, recoil and shots |
| Charged beam | The release of a full charge |
| Pod flies in | The pod entering from the left, as it does after the first crystal |
| Pod docks front | The pod approaching and locking onto the nose |
| Pod docks rear | The same at the tail |
| Replay | Restarts the current sequence (or press space) |

Also available:

- Switch between the ship and the pod, and change the pod's laser colour.
- Bank angle (manual or automatic), throttle, and pause.
- Orbit by dragging, zoom by scrolling, or jump to preset angles (game, side, top, front, 3/4, rear).
- Toggle ink outlines, wireframe and the grid; move the light; change the background.
- Live thumbnails show the model at actual in-game size (1x, 2x, 3x) so you can judge readability.
- Save a PNG of the current view; frame rate and triangle counts show top-left.
- Shortcuts: `R` resets the view, `O` toggles outlines, `1`/`2` switch model, `space` replays.

## Code layout

| File | Contents |
| --- | --- |
| `src/main.js` | Game loop (fixed 60 Hz), state machine, spawning, collisions, HUD |
| `src/level1.js` | Stage 1 terrain layout and enemy spawn script |
| `src/terrain.js` | Tile collision grid and pre-rendered terrain art |
| `src/player.js` | Ship, pod, bits, and all player projectiles |
| `src/enemies.js` | Enemy types and enemy bullets |
| `src/boss.js` | Stage 1 boss |
| `src/background.js` | Parallax starfield, nebula, and station interior |
| `src/fx.js` | Particles and explosions |
| `src/audio.js` | Synthesised sound effects and music sequencer |
| `src/font.js` | 5×7 bitmap font |
| `src/input.js` | Keyboard and gamepad input |
| `src/render3d.js` | 3D layer that draws the ship and pod over the 2D game |
| `src/models/*.js` | Procedural 3D models and cel-shading materials |
| `src/preview.js` | Logic for the standalone model preview page |

Adding a stage means writing a new `levelN.js` with `buildTerrain()` and `buildSpawns()`, plus a boss class.
