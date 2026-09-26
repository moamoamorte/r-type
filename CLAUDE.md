# Xiphos — working notes for Claude

A browser side-scrolling shooter in the style of late-80s arcade games. Stage 1 is complete and playable; the player ship and pod are 3D, everything else is still 2D.

**Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing rendering or level code, and [docs/DECISIONS.md](docs/DECISIONS.md) before revisiting a choice that looks odd.** Open work lives in [GitHub Issues](https://github.com/moamoamorte/r-type/issues); the [roadmap issue](https://github.com/moamoamorte/r-type/issues/28) lists it in order. The `/roadmap` skill (`.claude/skills/roadmap/`) picks the next item, delivers it as a PR and keeps the roadmap in step.

## Run it

```bash
python3 serve.py          # http://localhost:8765
```

ES modules need HTTP; opening `index.html` from disk will not work. `serve.py` also disables caching and powers live reload.

- Game: `/index.html` (add `?flat=1` to force the old 2D ship and bypass WebGL)
- Model harness: `/preview.html` — fly the ship, play animations, inspect models

## Hard constraints

1. **No build step, no dependencies to install.** Plain ES modules served statically. Three.js is vendored in `vendor/` (MIT). Do not add a bundler or a package manager without being asked.
2. **No copyrighted material.** This is *inspired by* R-Type, not a clone of it. All art, music, sound, names and enemy designs are original. Never recreate another game's sprites, characters, music or level maps, even "for personal use". This has come up repeatedly with reference images — take style cues (shading, panel detail, colour blocking), never the subject.
3. **Everything is generated in code.** No image, audio or model files. Art is drawn with Canvas 2D or built from Three.js primitives; sound is synthesised with Web Audio.
4. **Gameplay stays 2D.** The 3D layer is presentation only. It reads state and draws; it never moves anything or decides anything.

## Conventions

- Fixed 60 Hz simulation with an accumulator; rendering is decoupled. Per-frame constants are in *pixels per frame at 60 Hz*.
- Play-field is 384×224 logical pixels with a 16px HUD strip below (384×240 total).
- 3D model space: **+X forward, +Y up, +Z out of the screen**. Screen y grows downward, so world y = −screen y.
- Models are **angular only** — no spheres, cones-as-curves or tori read as round. Use faceted prisms (low `radialSegments`), boxes and extruded plates.
- Ship palette is greyscale; colour is reserved for the cockpit, engine glow and the pod core (which encodes laser type).

## Testing

There is no automated test suite. Verify in the browser:

- `window.game` (game page) and `window.__preview` (harness) are exposed for driving state from the console.
- Typical loop: start a server, navigate, drive state via JS, screenshot, read console errors.
- **Warp** straight into play from the URL: `?stage=N`, `?cp=K` (checkpoint index), `?cam=X`, `?boss=1` (just before the boss warning), `?god=1` (no deaths from enemies or terrain), `?power=pod:red:3,speed:2,missile,bits:2`. Any of them skips the title, e.g. `/index.html?cp=3&power=pod:blue:2` or `?boss=1&god=1`.
- The same at runtime: `game.warp({ cp: 3, power: 'pod:blue:2', god: true })` starts a fresh game there. `game.god = true` on its own stops dying while inspecting.

## Style

- Comments explain *why*, not *what*. Match the surrounding density — this codebase is lightly commented with section banners.
- Keep modules single-purpose; the file map is in the architecture doc.
