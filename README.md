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

Adding a stage means writing a new `levelN.js` with `buildTerrain()` and `buildSpawns()`, plus a boss class.
