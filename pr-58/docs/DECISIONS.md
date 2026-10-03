# Decisions

Why things are the way they are. Newest last. If one of these looks wrong, check the rationale before undoing it.

## 1. Inspired by R-Type, never a copy

**Decision:** original art, music, names, enemies and bosses throughout. Game *mechanics* are borrowed freely (charge beam, detachable pod, three laser colours, drones, terrain that kills, checkpoint restarts, a boss with an exposed weak point); expression is not.

**Why:** R-Type's sprites, characters, music and level art belong to Irem. Mechanics are not protected in the same way. This held even when asked for an exact copy "for personal use only" — private use does not change ownership. Reference images supplied during design (R-9A hangar art, Archangel, Gundam-style mecha) were used for *style* cues only: panel density, cel shading, colour blocking, three-quarter framing.

**Consequence:** the game is called X-76, the boss is "Oculus Bloom", and the ship is an original X-form design. Requests that amount to "make it look exactly like X" get an original interpretation plus a note about what was deliberately not copied.

## 2. No build step, no dependencies

**Decision:** plain ES modules served statically; Three.js vendored into `vendor/`.

**Why:** the brief was that it runs in the browser with nothing to install. A bundler would add a toolchain to maintain for no gameplay benefit. Vendoring keeps the "no install" promise while allowing a real 3D library.

**Cost:** `vendor/` is ~2MB and dominates the diff line count. Accepted.

## 3. Everything generated in code

**Decision:** no image, audio or model files. Canvas 2D drawing, Three.js primitives, Web Audio synthesis.

**Why:** keeps the repo self-contained and every asset editable by changing code. It also means the art can be regenerated at any resolution.

**Cost:** hand-drawn detail is limited by what is reasonable to express as geometry — this is the main reason early 2D ship attempts looked flat. If photoreal or hand-painted art is ever wanted, the answer is image files or glTF models, not more drawing code.

## 4. Fixed 60 Hz simulation, decoupled rendering

**Decision:** accumulator stepping `update()` at exactly 1/60s; all tuning constants are per-frame.

**Why:** deterministic feel, and arcade games of this type are tuned per frame. It also lets the preview sandbox reuse the same numbers and match the game's handling exactly.

## 5. 2D gameplay, 3D presentation layer

**Decision:** the 3D layer only reads state and draws. Movement, collision, spawning and scoring stay in the 2D simulation.

**Why:** converting the whole engine to 3D would have risked the working stage while delivering nothing gameplay-wise. This way the conversion is incremental and reversible.

**Consequence:** a transparent WebGL canvas is stacked over the 2D canvas, so 3D objects always draw on top of 2D ones. Fine while only the player and pod are 3D; it will need revisiting when terrain and enemies convert (an enemy behind terrain would currently draw in front of it).

## 6. Keep the 2D sprites as a fallback

**Decision:** `Render3D.create()` returns `null` on failure and the game draws the old sprites; `?flat=1` forces it.

**Why:** WebGL can be unavailable or blocked, and having a working comparison path made the 3D work much easier to evaluate.

## 7. Models are angular, greyscale, and built from primitives

**Decision:** no curved geometry anywhere on the ship or pod; greyscale hull with colour reserved for cockpit, engines and the pod core.

**Why:** direct art direction from the user ("the style is angular", "mainly grey"). The pod core keeps the laser colour because it is the only cue for which weapon you are carrying.

## 8. Cel shading with inverted-hull outlines

**Decision:** `MeshToonMaterial` with a 3-step ramp, plus a back-face shell pushed along normals for ink lines.

**Why:** matches the hand-inked anime look in the reference images, and works without post-processing passes (no `EffectComposer`, no addons — which also keeps the vendored surface to two files).

## 9. 3D renders at 3x internal resolution

**Decision:** the WebGL canvas is 1152×672 for a 384×224 field.

**Why:** the detail in the models is invisible at 1x — this was demonstrated with side-by-side thumbnails during design.

**Open problem:** the result is mixed sharpness — crisp 3D ship against chunky pixel-art terrain. Two coherent endpoints exist (render 3D at 1x for a true retro look, or raise the whole game's resolution and redo the 2D art). Resolved by §15.

## 10. The docked pod engulfs the nose, and its hitbox follows

**Decision:** when docked, the pod sits back over the hull so it swallows the nose tip (or caps the tail), and its gameplay position is that drawn position. The offsets live in `DOCK` in `player.js`; the preview harness imports them.

**Why:** the pod read as floating in front of the ship. The first fix only moved the drawing ~7px back and left gameplay alone, so the pod blocked bullets ahead of where it appeared. That offset was folded into gameplay in [#10](https://github.com/moamoamorte/x-76/issues/10).

**Consequence:** the docked shield sits ~7px closer to the ship than it originally did, and in the 2D fallback the pod now overlaps the sprite's nose and tail.

## 11. Checkpoints wipe power-ups

**Decision:** dying returns you to the last checkpoint and strips the pod, speed, missiles and bits.

**Why:** authentic to the genre and to the difficulty curve it implies. Worth revisiting only as a deliberate difficulty decision.

## 12. Preview harness as a first-class tool

**Decision:** a standalone page with model inspection, scripted animation sequences, and a flyable sandbox sharing the game's input and constants.

**Why:** iterating on models through the game is slow and needs a level running. The harness made every ship revision a few seconds' work.

**Consequence:** the sandbox re-implements the player and pod update logic, but takes every tuning number from `src/tuning.js`, which the game uses too. Changing a value there changes both. Changing the *logic* in `player.js` (a new state, a different formula) still has to be mirrored in `stepPlay` / `stepPod` by hand — if handling ever feels different between the two, that is the first suspect.

## 13. Live reload via polling

**Decision:** `serve.py` exposes `/__mtime`; the preview polls every 700ms.

**Why:** simpler and more robust than SSE or websockets for a single-user dev server, and degrades silently on any other static server.

## 14. Renamed to Xiphos

**Decision:** the game was renamed from Nebula Lance; high scores saved under the old key are migrated on load.

**Why:** requested a name with an "x"; a xiphos is a short sword, which suits the blade-like hull and the X-form arms.

## 15. Art target: modern high-res, gameplay stays 384×224

**Decision:** resolve the mixed sharpness from §9 by going high-res rather than retro. Both the 2D canvas and the 3D layer render at the device's real size × `devicePixelRatio`; the 2D art is redrawn to suit. Gameplay keeps its 384×224 logical field, so coordinates, tuning constants and level data do not change.

**Why:** owner's choice between the two endpoints in §9. Keeping the logical coordinates fixed makes this a rendering-only change, consistent with §5.

**Consequence:** 3D conversion work targets display resolution. Pre-rendered 2D caches (font, backgrounds, terrain) must be rebuilt at the display scale. Tracked in [#4](https://github.com/moamoamorte/x-76/issues/4).

## 16. No visible gun barrels on the ship

**Decision:** the ship stays clean; shots continue to appear from the nose.

**Why:** owner's call when the backlog was migrated to GitHub Issues.

## 17. Renamed to X-76

**Decision:** the game was renamed from Xiphos; the GitHub repo followed, from `r-type` to `x-76`. High scores saved under `xiphos-hi` or the older `nebula-lance-hi` are migrated on load.

**Why:** owner's choice, tracked in [#24](https://github.com/moamoamorte/x-76/issues/24). `r-type` as a repo name named the game this project is inspired by rather than the project itself (see §1); `x-76` doesn't have that problem.

## 18. iPhone fullscreen via Home Screen web app

**Decision:** on iPhone, the FS button explains how to add the game to the Home Screen instead of calling `requestFullscreen()`. The page ships a manifest and Apple's web-app meta tags so the Home Screen launch has no browser UI.

**Why:** iPhone Safari has no element Fullscreen API on any iOS version; iPadOS 16.4 added it for iPad only. Four PRs (#49, #51, #53, #54) tuned the event wiring before this was spotted, and none of them could have worked on iPhone. Tracked in [#56](https://github.com/moamoamorte/x-76/issues/56).

**Consequence:** with `viewport-fit=cover` the page runs under the notch and home indicator, so `body` is padded by the safe-area insets and `fit()` sizes the canvas to the padded box. Anything new positioned against the viewport rather than inside `#wrap` has to respect those insets itself. There's no Home Screen icon yet, so iOS uses a page snapshot.

## 19. A percentage shield instead of one-hit deaths

**Decision:** the ship carries a shield from 0 to 100%. Every hit costs a share of it (`SHIELD_DAMAGE` in `tuning.js`: bullets, big bullets, enemy contact, boss contact and terrain each have their own cost). A hit landing on an empty shield destroys the ship. The shield does not regenerate over time; it refills on reaching a checkpoint and on every new life, and a shield cell dropped by carriers restores `SHIELD_PICKUP`. Terrain and boss contact cost shield like anything else, and the ship bounces off walls; only being pinned against a wall by the scroll still kills outright.

**Why:** owner's answers on [#14](https://github.com/moamoamorte/x-76/issues/14). A percentage rather than a few fixed points lets different hits cost different amounts.

**Consequence:** stage 1 is much easier than it was tuned for. The damage numbers are placeholders; enemy placement, bullet volume and the costs themselves are rebalanced together in [#12](https://github.com/moamoamorte/x-76/issues/12). Respawn invulnerability still blinks the ship; the shorter window after a shield hit doesn't, so the two can't be confused.
