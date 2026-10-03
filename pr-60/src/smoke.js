// Headless smoke test, loaded only behind ?smoke=1 (see tools/smoke.py). Boots
// straight into play at every checkpoint plus the warning and boss camera
// positions, fakes input for a few hundred frames at each, and fails on any
// console error or exception — including ones the game loop's own try/catch
// in main.js would otherwise swallow.
import { STAGES } from './stages.js';

const CODE = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', fire: 'Space', pod: 'KeyX' };
const LOADOUT = 'pod:red:3,speed:2,missile,bits:2';

export function runSmoke(game) {
  // Counts, not a raw list: one bad frame can repeat every step and would
  // otherwise flood the report with hundreds of copies of the same line.
  const counts = new Map();
  const record = (msg) => { const s = String(msg); counts.set(s, (counts.get(s) || 0) + 1); };

  const origError = console.error;
  console.error = (...args) => { record(args.map(String).join(' ')); origError.apply(console, args); };
  window.onerror = (msg, src, line, col, err) => record(err?.stack || `${msg} (${src}:${line}:${col})`);
  window.addEventListener('unhandledrejection', (e) => record(e.reason?.stack || e.reason));

  const flat = new URLSearchParams(location.search).has('flat');
  if (!flat && !game.r3d) record('3D layer unavailable (WebGL failed to initialize) — the 3D render path was not exercised');

  const keys = game.input.keys;
  const hold = (action, on) => { on ? keys.add(CODE[action]) : keys.delete(CODE[action]); };

  let frames = 0;
  function step(n) {
    for (let i = 0; i < n; i++) {
      // Mirrors main.js's frame(): a thrown error shouldn't stop the run.
      try {
        game.update();
        frames++;
        if (frames % 4 === 0) game.draw();
      } catch (err) {
        console.error(err);
      }
    }
  }
  function tap(action) {
    hold(action, true);
    step(1);
    hold(action, false);
  }

  const level = STAGES[0].level;
  const positions = [...level.CHECKPOINTS, level.WARNING_CAM, level.BOSS_CAM];

  for (const cam of positions) {
    game.warp({ cam, god: true, power: LOADOUT });
    game.banner = null;
    game.player.entering = false;

    hold('right', true); step(20); hold('right', false);
    hold('left', true); step(10); hold('left', false);

    for (let i = 0; i < 5; i++) { tap('fire'); step(3); }         // plain shots

    hold('fire', true); step(100); hold('fire', false); step(5);  // charge + release a beam

    if (game.pod) { tap('pod'); step(30); tap('pod'); step(30); } // launch, then recall

    hold('down', true); hold('fire', true);
    step(40);
    hold('down', false); hold('fire', false);
    step(10);

    hold('up', true); step(35); hold('up', false);
  }

  const errors = [...counts].map(([msg, n]) => (n > 1 ? `${msg} (×${n})` : msg));
  const result = { ok: counts.size === 0, errors, frames };
  window.__smoke = result;
  const pre = document.createElement('pre');
  pre.id = 'smoke';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
  return result;
}
