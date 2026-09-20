// Standalone model harness: inspect models and play back game animations
// (firing, the pod flying in, and the pod docking) without running the game.
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

const models = { ship: createShip(), pod: createPod({ color: 'red' }) };
for (const m of Object.values(models)) scene.add(m.group);
let current = 'ship';

const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 2000);
const cam = { az: 0, el: 0, dist: 160 };
const VIEWS = {
  game: [0, 0], side: [0, 0], top: [0, Math.PI / 2 - 0.05], front: [Math.PI / 2, 0],
  rear: [-Math.PI / 2, 0], three: [0.9, 0.5],
};
const basePose = { ship: [0.2, -0.3], pod: [0.2, -0.4] };

function placeCamera() {
  const { az, el, dist } = cam;
  camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
  camera.lookAt(0, 0, 0);
}

// --- demo sequences ---------------------------------------------------------
const POD_DEMOS = new Set(['arrive', 'dock', 'dockback']);
const CAPTIONS = {
  idle: '',
  fire: 'Tap fire: muzzle flash and recoil',
  beam: 'Hold fire, then release: charged beam',
  arrive: 'The pod flies in from the left after the first crystal',
  dock: 'The pod docks on the nose',
  dockback: 'The pod docks at the tail',
};
const demo = { mode: 'idle', t: 0, next: 0 };
const shots = [];
const shotMat = new THREE.MeshBasicMaterial({ color: 0xfff0b0, toneMapped: false });
const beamMat = new THREE.MeshBasicMaterial({
  color: 0x8fd4ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
});

function clearShots() {
  for (const s of shots) scene.remove(s.mesh);
  shots.length = 0;
}

function setDemo(mode) {
  demo.mode = mode;
  demo.t = 0;
  demo.next = 0;
  clearShots();
  document.getElementById('caption').textContent = CAPTIONS[mode] || '';
  for (const b of document.querySelectorAll('[data-demo]')) b.classList.toggle('on', b.dataset.demo === mode);
  if (mode !== 'idle') {
    document.getElementById('model').value = 'ship';
    current = 'ship';
  }
  models.pod.group.rotation.set(...basePose.pod, 0);
}

const v = new THREE.Vector3();
function muzzleWorld() {
  scene.updateMatrixWorld();
  return models.ship.nose.localToWorld(v.set(14, 0, 0)).clone();
}
function nosePointWorld() {
  scene.updateMatrixWorld();
  return models.ship.nose.localToWorld(v.set(18, 1, 0)).clone();
}
function tailPointWorld() {
  scene.updateMatrixWorld();
  return models.ship.group.localToWorld(v.set(-22, 0, 0)).clone();
}

const easeOut = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const START = new THREE.Vector3(-150, -18, 0);
const HOVER = new THREE.Vector3(-48, 14, 0);

function runDemo(dt) {
  const ship = models.ship, pod = models.pod;
  demo.t += dt;
  const t = demo.t;

  switch (demo.mode) {
    case 'fire':
      if (t >= demo.next) {
        demo.next = t + 0.22;
        ship.fire(1);
        const m = new THREE.Mesh(new THREE.BoxGeometry(5, 1.4, 1.4), shotMat);
        m.position.copy(muzzleWorld());
        scene.add(m);
        shots.push({ mesh: m, life: 1.3, speed: 150 });
      }
      break;
    case 'beam':
      if (t >= demo.next) {
        demo.next = t + 1.8;
        ship.fire(3.4);
        const m = new THREE.Mesh(new THREE.BoxGeometry(34, 5, 5), beamMat);
        m.position.copy(muzzleWorld());
        m.position.x += 18;
        scene.add(m);
        shots.push({ mesh: m, life: 1.4, speed: 200, grow: true });
      }
      break;
    case 'arrive': {
      const k = easeOut(t / 1.9);
      pod.group.position.copy(lerpV(START, HOVER, k));
      pod.group.position.y += Math.sin(t * 2.4) * (1.5 * k);
      if (t > 5) demo.t = 0;
      break;
    }
    case 'dock':
    case 'dockback': {
      const target = demo.mode === 'dock' ? nosePointWorld() : tailPointWorld();
      const stage = new THREE.Vector3(target.x - 46, target.y + 26, 0);
      if (t < 1.3) {
        pod.group.position.copy(lerpV(START, stage, easeOut(t / 1.3)));
      } else if (t < 2.2) {
        pod.group.position.copy(lerpV(stage, target, easeOut((t - 1.3) / 0.9)));
      } else {
        pod.group.position.copy(target);
        pod.group.position.y += Math.sin(t * 6) * 0.25;   // settle wobble
      }
      if (t > 5.5) demo.t = 0;
      break;
    }
  }

  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.mesh.position.x += s.speed * dt;
    s.life -= dt;
    if (s.grow) s.mesh.scale.x = Math.min(2.4, s.mesh.scale.x + dt * 3);
    if (s.life <= 0) { scene.remove(s.mesh); shots.splice(i, 1); }
  }
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
    const val = +el.value;
    if (out) out.textContent = el.step === '1' ? val : val.toFixed(2);
    fn(val);
  });
};
bindRange('bank', (val) => { state.bank = val; state.autoBank = false; $('autoBank').checked = false; });
bindRange('throttle', (val) => { state.throttle = val; });
bindRange('zoom', (val) => { cam.dist = val; });
bindRange('lightA', (val) => {
  const a = (val * Math.PI) / 180;
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
$('model').addEventListener('change', (e) => { current = e.target.value; setDemo('idle'); });
$('replay').addEventListener('click', () => setDemo(demo.mode));
for (const b of document.querySelectorAll('[data-demo]')) b.addEventListener('click', () => setDemo(b.dataset.demo));
for (const b of document.querySelectorAll('[data-view]')) {
  b.addEventListener('click', () => {
    const [az, el] = VIEWS[b.dataset.view];
    cam.az = az; cam.el = el;
    const pose = basePose[current];
    models[current].group.rotation.set(...(b.dataset.view === 'side' ? [0, 0] : pose), 0);
  });
}
$('shot').addEventListener('click', () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.download = `${current}-${demo.mode}.png`;
  a.href = view.toDataURL('image/png');
  a.click();
});
addEventListener('keydown', (e) => {
  if (e.key === 'r') { cam.az = 0; cam.el = 0; cam.dist = 160; }
  if (e.key === 'o') { const c = $('outline'); c.checked = !c.checked; c.dispatchEvent(new Event('change')); }
  if (e.key === '1') { $('model').value = 'ship'; current = 'ship'; setDemo('idle'); }
  if (e.key === '2') { $('model').value = 'pod'; current = 'pod'; setDemo('idle'); }
  if (e.code === 'Space') { e.preventDefault(); setDemo(demo.mode); }
});

// --- loop -------------------------------------------------------------------
const hud = document.getElementById('hud');
let last = performance.now(), fps = 60, t = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fps += (1000 / Math.max(1, now - (frame.prev || now)) - fps) * 0.1;
  frame.prev = now;

  const podDemo = POD_DEMOS.has(demo.mode);
  models.ship.group.visible = current === 'ship' || podDemo;
  models.pod.group.visible = current === 'pod' || podDemo;
  if (!podDemo && current === 'pod') models.pod.group.position.set(0, 0, 0);

  if (!state.pause) {
    t += dt;
    if (state.autoBank) state.bank = Math.sin(t * 1.1);
    models.ship.update(dt, { bank: state.bank, throttle: state.throttle });
    models.pod.update(dt, {});
    runDemo(dt);
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

  const info = renderer.info.render;
  hud.textContent = `${current}  ${demo.mode}  ${fps.toFixed(0)} fps  ${info.triangles} tris  ${info.calls} calls`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__preview = { scene, camera, cam, models, state, renderer, demo, setDemo };
