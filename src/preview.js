// Standalone model harness: inspect and animate the 3D models without the game.
import * as THREE from '../vendor/three.module.js';
import { createShip } from './models/ship.js';
import { createPod } from './models/pod.js';

const view = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas: view, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));

const scene = new THREE.Scene();
const BG = { space: 0x070a16, studio: 0x2a2f3c, white: 0xe9eaee };
scene.background = new THREE.Color(BG.space);

const key = new THREE.DirectionalLight(0xffffff, 2.4);
const fill = new THREE.DirectionalLight(0x9fb8ff, 0.8);
const rim = new THREE.DirectionalLight(0x7fe8ff, 1.6);
fill.position.set(-40, -20, 30);
rim.position.set(-30, 10, -40);
scene.add(key, fill, rim, new THREE.HemisphereLight(0xbcd2ff, 0x202430, 0.7));

const grid = new THREE.GridHelper(200, 20, 0x3fd8cb, 0x222a38);
grid.position.y = -18;
scene.add(grid);

const models = {
  ship: createShip(),
  pod: createPod({ color: 'red' }),
};
for (const m of Object.values(models)) scene.add(m.group);
let current = 'ship';

const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 2000);
const cam = { az: 0, el: 0, dist: 160 };
const VIEWS = {
  game: [0, 0], side: [0, 0], top: [0, Math.PI / 2 - 0.05], front: [Math.PI / 2, 0],
  rear: [-Math.PI / 2, 0], three: [0.9, 0.5],
};
// The models carry their own display pose, so "game" is the straight-on camera.
const basePose = { ship: [0.24, -0.52], pod: [0.2, -0.4] };

function placeCamera() {
  const { az, el, dist } = cam;
  camera.position.set(
    Math.sin(az) * Math.cos(el) * dist,
    Math.sin(el) * dist,
    Math.cos(az) * Math.cos(el) * dist
  );
  camera.lookAt(0, 0, 0);
}

// --- controls ---------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const state = { bank: 0, autoBank: true, throttle: 1, pause: false, spin: false };

let drag = null;
view.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; view.setPointerCapture(e.pointerId); });
view.addEventListener('pointerup', () => { drag = null; });
view.addEventListener('pointermove', (e) => {
  if (!drag) return;
  cam.az -= (e.clientX - drag.x) * 0.008;
  cam.el = THREE.MathUtils.clamp(cam.el + (e.clientY - drag.y) * 0.008, -1.4, 1.4);
  drag = { x: e.clientX, y: e.clientY };
});
view.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.dist = THREE.MathUtils.clamp(cam.dist + e.deltaY * 0.12, 40, 320);
  $('zoom').value = Math.round(cam.dist);
  $('zoomV').textContent = Math.round(cam.dist);
}, { passive: false });

const bindRange = (id, fn) => {
  const el = $(id), out = $(id + 'V');
  el.addEventListener('input', () => {
    const v = +el.value;
    if (out) out.textContent = el.step === '1' ? v : v.toFixed(2);
    fn(v);
  });
};
bindRange('bank', (v) => { state.bank = v; state.autoBank = false; $('autoBank').checked = false; });
bindRange('throttle', (v) => { state.throttle = v; });
bindRange('zoom', (v) => { cam.dist = v; });
bindRange('lightA', (v) => {
  const a = (v * Math.PI) / 180;
  key.position.set(Math.cos(a) * 60, 45, Math.sin(a) * 60);
});
$('lightA').dispatchEvent(new Event('input'));

$('autoBank').addEventListener('change', (e) => { state.autoBank = e.target.checked; });
$('pause').addEventListener('change', (e) => { state.pause = e.target.checked; });
$('spin').addEventListener('change', (e) => { state.spin = e.target.checked; });
$('outline').addEventListener('change', (e) => { for (const m of Object.values(models)) m.setOutlines(e.target.checked); });
$('wire').addEventListener('change', (e) => { for (const m of Object.values(models)) m.setWireframe(e.target.checked); });
$('grid').addEventListener('change', (e) => { grid.visible = e.target.checked; });
$('bg').addEventListener('change', (e) => { scene.background = new THREE.Color(BG[e.target.value]); });
$('podColor').addEventListener('change', (e) => models.pod.setColor(e.target.value));
$('model').addEventListener('change', (e) => setModel(e.target.value));
for (const b of document.querySelectorAll('[data-view]')) {
  b.addEventListener('click', () => {
    const [az, el] = VIEWS[b.dataset.view];
    cam.az = az; cam.el = el;
    const pose = basePose[current];
    const g = models[current].group;
    // "Side" shows the model square-on; every other preset keeps the game pose.
    if (b.dataset.view === 'side') g.rotation.set(0, 0, 0);
    else g.rotation.set(pose[0], pose[1], 0);
  });
}
$('shot').addEventListener('click', () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.download = `${current}-preview.png`;
  a.href = view.toDataURL('image/png');
  a.click();
});
addEventListener('keydown', (e) => {
  if (e.key === 'r') { cam.az = 0; cam.el = 0; cam.dist = 160; }
  if (e.key === 'o') { const c = $('outline'); c.checked = !c.checked; c.dispatchEvent(new Event('change')); }
  if (e.key === '1') { $('model').value = 'ship'; setModel('ship'); }
  if (e.key === '2') { $('model').value = 'pod'; setModel('pod'); }
});

function setModel(name) {
  current = name;
  for (const [k, m] of Object.entries(models)) m.group.visible = k === name;
}
setModel('ship');

// --- in-game size thumbnails ------------------------------------------------
const strip = [1, 2, 3].map((n) => {
  const c = document.getElementById('px' + n);
  c.style.width = (n === 1 ? 128 : c.width) + 'px';
  c.style.height = (n === 1 ? 128 : c.height) + 'px';
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas: c, ctx, size: c.width };
});
const pxRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
const pxCam = new THREE.OrthographicCamera(-30, 30, 30, -30, -500, 1000);
pxCam.position.set(0, 0, 200);
pxCam.lookAt(0, 0, 0);

// --- loop -------------------------------------------------------------------
const hud = document.getElementById('hud');
let last = performance.now(), fps = 60, t = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fps += (1000 / Math.max(1, now - (frame.prev || now)) - fps) * 0.1;
  frame.prev = now;
  if (!state.pause) {
    t += dt;
    if (state.autoBank) state.bank = Math.sin(t * 1.1);
    models[current].update(dt, { bank: state.bank, throttle: state.throttle });
    if (state.spin) models[current].group.rotation.y += dt * 0.6;
  }

  const w = view.clientWidth, h = view.clientHeight;
  if (view.width !== w * renderer.getPixelRatio() || view.height !== h * renderer.getPixelRatio()) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  placeCamera();
  renderer.render(scene, camera);

  const saveBg = scene.background;
  scene.background = null;
  for (const s of strip) {
    pxRenderer.setSize(s.size, s.size, false);
    pxRenderer.render(scene, pxCam);
    s.ctx.clearRect(0, 0, s.size, s.size);
    s.ctx.drawImage(pxRenderer.domElement, 0, 0, s.size, s.size);
  }
  scene.background = saveBg;

  const info = renderer.info.render;
  hud.textContent = `${current}  ${fps.toFixed(0)} fps   ${info.triangles} tris   ${info.calls} draw calls`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__preview = { scene, camera, cam, models, state, renderer, setModel };
