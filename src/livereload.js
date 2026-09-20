// Dev-only: poll the dev server's /__mtime and reload when a source file changes.
// Silently disables itself when served by anything else.
let last = null;
let timer = null;

async function check() {
  try {
    const res = await fetch('/__mtime', { cache: 'no-store' });
    if (!res.ok) return stop();
    const { mtime } = await res.json();
    if (last === null) last = mtime;
    else if (mtime > last) location.reload();
  } catch {
    stop();
  }
}

function stop() {
  clearInterval(timer);
  timer = null;
}

export function liveReload(intervalMs = 700) {
  if (timer) return;
  timer = setInterval(check, intervalMs);
  check();
}
