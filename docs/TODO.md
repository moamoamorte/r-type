# Status and backlog

## Done so far

**Stage 1 (PR #1, merged).** Complete and playable: charge beam, detachable pod with three laser types, speed/missile/drone power-ups, tile terrain that kills on contact, 8 enemy types, a mid-stage heavy walker, the "Oculus Bloom" boss, checkpoints, lives, extra lives, HUD, saved high score, title/clear/game-over flow, pause, mute, fullscreen, gamepad support. All art and audio generated in code.

**3D ship and pod (PR #2, merged).** Three.js vendored; a transparent WebGL layer over the 2D playfield; cel-shaded, ink-outlined, angular greyscale models built in code; real banking plus a nose dip; muzzle flash and recoil; a pod that clamps hard onto the nose; the title screen showing the model; a 2D fallback path; the preview harness (fly mode, animation sequences, live reload); renamed to Xiphos.

**Never done yet:** a full playthrough at normal difficulty. Every test so far has jumped between sections with death disabled.

## Decisions I need from you

These block or shape the work below.

1. **Art target.** Keep a chunky retro look (render 3D at 1x, matching the pixel art), or go modern (raise the whole game's resolution and redo the 2D art to match the 3D)? Right now it is mixed: crisp 3D ship, chunky 2D terrain. Everything in "3D conversion" depends on this answer.
2. **Ship weapons.** The ship currently has no visible guns — shots appear from the nose. Add barrels, or leave it clean?
3. **Nose dip direction.** Currently asymmetric: nose drops moving forward, lifts moving back. Symmetric dip (drops either way) is a one-line change if you prefer it.
4. **Name.** Xiphos is in. Confirm, or pick from VECTOR X / CRUX NINE / XENON LANCE / APEX-9.

## Recommended next

Small, self-contained, and they remove known rough edges.

- [ ] **Align the pod's hitbox with where it is drawn.** It blocks bullets ~7px ahead of its docked appearance. Either move the gameplay offset or drop the visual one. *Small.*
- [ ] **Redraw the HUD spare-ship icons.** They still use the old 2D ship art and no longer match. *Small.*
- [ ] **Play the whole stage and tune it.** The difficulty curve, enemy placement and power-up pacing have never been checked end to end. Expect real bugs to surface here. *Medium — the highest-value item on this list.*
- [ ] **Sound for the new animations.** The pod clamp and the muzzle flash are silent; both want a short synthesised effect. *Small.*

## Gameplay changes

- [ ] **Ship shields instead of one-hit deaths.** Each hit takes a shield point; when the shields are gone the next hit destroys the ship. This is the biggest change to how the game feels since stage 1 was built, and it touches difficulty everywhere. *Medium.*

  **Behaviour to build:**
  - Shield points on the player, shown in the HUD (a segmented bar or pips next to the beam meter).
  - Taking a hit: lose a point, brief invulnerability so one bullet cannot drain the whole bar, a flash on the ship and a hit sound distinct from the explosion.
  - A visible shield around the ship in the 3D layer — an angular faceted bubble matching the art style, brightest when full, flickering and thinner as it weakens, with an impact ripple at the point of contact.
  - Losing the last point: the existing death, explosion and checkpoint flow, unchanged.

  **Decisions needed before building:**
  - **How many points?** Suggest 3, enough to matter without removing the threat.
  - **Do shields regenerate?** Suggest no regeneration over time, but shields refill at a checkpoint and on a new life. A slow regen makes the stage much easier and undercuts careful play.
  - **Does terrain still kill instantly?** Suggest yes — flying into a wall being fatal is what makes the corridors tense, and shields should not turn terrain into a nuisance instead of a threat.
  - **Does the boss's contact damage still kill instantly?** Suggest it costs a point like anything else, for consistency.
  - **How are shields restored or upgraded?** Either a new power-up dropped by carriers, or extra points awarded with existing pickups. Suggest a dedicated pickup so the bar can be topped up deliberately.
  - **What happens to the difficulty balance?** With 3 points the stage becomes noticeably easier; enemy placement and bullet volume will need a pass afterwards. Worth doing alongside the full playthrough tuning above.

  **Touches:** `player.js` (state, invulnerability window), `main.js` (`collide()`, `killPlayer()`, HUD, checkpoint reset), `render3d.js` and a new shield model, `audio.js` (hit sound), and `level1.js` if a shield pickup is added.

## 3D conversion (after the art-target decision)

In order; each stage leaves the game playable.

- [ ] **Decide and apply the resolution strategy** (see decision 1). *Small to decide, medium to apply.*
- [ ] **Terrain in 3D.** Extrude the tile grid into lit blocks, with real depth in the background layers. Biggest visual payoff, and the point where the game stops looking half-converted. *Large.*
- [ ] **Fix layer ordering.** Once terrain is 3D, the "3D always draws over 2D" stacking breaks down; the 3D scene needs proper depth, and the remaining 2D elements need a defined place. *Medium, but do it with the terrain.*
- [ ] **Enemies in 3D.** Eight types plus larvae. Reuse the ship's angular language so they read as the same world. *Large.*
- [ ] **Boss in 3D.** Iris, tentacles, spore mouths. *Medium.*
- [ ] **Effects in 3D.** Explosions, beams and the charge orb as 3D with additive glow; optional bloom. *Medium.*

## Content

- [ ] **Stage 2 and its boss.** The engine takes a new stage as one `levelN.js` (terrain + spawn script) plus a boss class; nothing else needs touching. *Large.*
- [ ] **Stage select or a debug warp** so later stages can be tested without playing from the start. *Small, saves time on everything above.*

## Polish and robustness

- [ ] **Touch controls** for phones and tablets — currently keyboard/gamepad only. *Medium.*
- [ ] **Remappable keys** and a persisted settings store. *Small.*
- [ ] **Colour-blind-safe laser colours,** or a shape cue on the pod core, since red/blue/yellow is the only signal of weapon type. *Small.*
- [ ] **Object pooling for projectiles and particles.** Not a problem today (frames cost ~0.3ms) but the allocation churn will matter once everything is 3D. *Medium.*
- [ ] **A smoke test.** A scripted browser check that boots the game, runs a few hundred frames at several camera positions and fails on any console error. Cheap insurance given there are no tests. *Medium.*
- [ ] **Option to load glTF models,** so ship variants can be modelled in Blender instead of code. *Medium; only worth it if code-built models become limiting.*

## Known gaps, tracked but not urgent

- The preview sandbox duplicates a few gameplay constants from `player.js`; they can drift.
- The 2D fallback path will keep aging as the 3D layer gains features. Decide at some point whether it is still worth carrying.
- `window.game` and `window.__preview` are exposed for debugging in production builds. Harmless for a hobby project, worth removing if this is ever published.
