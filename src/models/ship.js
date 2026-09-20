// Player fighter, built procedurally. Original design: a blunt-nosed gunship
// with four swept arms in an X around the fuselage, each ending in an engine.
// Mostly grey armour with minimal accents.
// +X is forward, +Y up, +Z out of the screen.
import * as THREE from '../../vendor/three.module.js';
import { part, toon, glossy } from './materials.js';

const TAU = Math.PI * 2;
const OUT = 0.5;

// Greyscale hull palette; accents kept to the canopy and muzzle.
const C = {
  light: 0xd9dce4,
  hull: 0xb9bec9,
  shade: 0x8d93a1,
  panel: 0x6b7180,
  metal: 0x4a4f5c,
  dark: 0x2a2e38,
  teal: 0x17d5ff,
  muzzle: 0xff7a1f,
};

function prism(rTop, rBottom, len, seg = 6) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, len, seg, 1);
  g.rotateZ(-Math.PI / 2);
  return g;
}

// Flat plate from a 2D outline: shape x runs along the hull, shape y is the span (+Z).
function plate(points, thickness = 1.0, bevel = 0.25) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1,
  });
  g.rotateX(Math.PI / 2);
  g.translate(0, thickness / 2, 0);
  return g;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

export function createShip({ outline = OUT } = {}) {
  const root = new THREE.Group();
  const bank = new THREE.Group();
  root.add(bank);

  const mLight = toon(C.light);
  const mHull = toon(C.hull);
  const mShade = toon(C.shade);
  const mPanel = toon(C.panel);
  const mMetal = toon(C.metal);
  const mDark = toon(C.dark);
  const glass = new THREE.MeshStandardMaterial({
    color: C.teal, roughness: 0.05, metalness: 0.2, emissive: 0x0d7fa8, emissiveIntensity: 0.9,
  });

  const put = (parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], o = outline) => {
    const g = part(geo, mat, { outline: o });
    g.position.set(...pos);
    g.rotation.set(...rot);
    g.scale.set(...scale);
    parent.add(g);
    return g;
  };
  const add = (...args) => put(bank, ...args);

  // --- fuselage: wide and blunt, flat chisel face at the front -------------
  add(prism(4.6, 4.0, 22, 8), mHull, [-2, 0, 0], [0, 0, 0], [1, 0.9, 1.1]);
  add(prism(4.6, 4.4, 5, 8), mLight, [11, 0, 0], [0, 0, 0], [1, 0.92, 1.12]);
  add(box(2.2, 8.6, 9.6), mShade, [14.2, 0, 0]);            // flat nose face
  add(box(1.2, 7.0, 8.0), mPanel, [15.4, 0, 0], [0, 0, 0], [1, 1, 1], 0.28);
  add(box(1.0, 3.0, 5.0), mDark, [16.1, 1.6, 0], [0, 0, 0], [1, 1, 1], 0.22);  // sensor band
  add(box(6, 1.4, 8.4), mShade, [8, 4.0, 0]);                // dorsal deck
  add(box(14, 1.6, 7.0), mPanel, [-2, -4.0, 0]);             // belly plate
  add(box(5, 5.6, 7.6), mMetal, [-13.5, 0, 0], [0, 0, 0], [1, 1, 1], 0.4);     // tail block

  // --- cockpit -------------------------------------------------------------
  const canopyGeo = new THREE.SphereGeometry(2.1, 16, 10, 0, TAU, 0, Math.PI / 2);
  add(canopyGeo, glass, [9.8, 4.4, 0], [0, 0, 0], [1.9, 0.62, 1.0], 0.18);
  add(box(6.6, 0.7, 5.0), mMetal, [9.5, 3.9, 0], [0, 0, 0], [1, 1, 1], 0.2);

  // --- four arms in an X ---------------------------------------------------
  // Each arm is built pointing +Z, then rolled around the forward axis.
  const flames = [];
  const armAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  for (const a of armAngles) {
    const arm = new THREE.Group();
    arm.rotation.x = a;
    bank.add(arm);

    put(arm, plate([[5, 2.5], [6.5, 4], [-6, 13], [-12, 13], [-6, 4]], 1.2), mHull, [-3, 0, 0]);
    put(arm, plate([[6.2, 4], [-6, 13], [-8.6, 13], [3.4, 4]], 1.3), mShade, [-3, 0.15, 0], [0, 0, 0], [1, 1, 1], 0.24);
    put(arm, prism(2.3, 2.5, 13, 6), mLight, [-6, 0, 13.6], [0, 0, 0], [1, 1, 1.05]);
    put(arm, box(8, 0.9, 1.3), mPanel, [-6, 2.2, 13.6], [0, 0, 0], [1, 1, 1], 0.22);
    put(arm, prism(2.8, 2.3, 2.4, 6), mMetal, [-13.4, 0, 13.6]);
    put(arm, prism(1.6, 2.4, 3.5, 6), mDark, [0.6, 0, 13.6], [0, 0, 0], [1, 1, 1], 0.26);

    const ring = new THREE.Mesh(
      new THREE.CircleGeometry(2.0, 12),
      new THREE.MeshBasicMaterial({ color: 0x9fe8ff, toneMapped: false })
    );
    ring.position.set(-14.7, 0, 13.6);
    ring.rotation.y = -Math.PI / 2;
    arm.add(ring);

    const flameGeo = new THREE.ConeGeometry(1.8, 12, 8, 1, true);
    flameGeo.rotateZ(Math.PI / 2);
    const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({
      color: 0x8fe4ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    flame.position.set(-21, 0, 13.6);
    arm.add(flame);
    flames.push(flame);
  }

  // --- twin cannons on the blunt face --------------------------------------
  for (const s of [1, -1]) {
    add(box(7, 2.2, 2.4), mDark, [12, -2.2, s * 3.1], [0, 0, 0], [1, 1, 1], 0.3);
    add(prism(0.8, 1.0, 6), mMetal, [18, -2.2, s * 3.1], [0, 0, 0], [1, 1, 1], 0.24);
    add(box(1.2, 1.2, 1.2), toon(C.muzzle), [21.2, -2.2, s * 3.1], [0, 0, 0], [1, 1, 1], 0.18);
  }

  // --- greebles ------------------------------------------------------------
  add(box(4, 0.6, 3), mPanel, [2, 4.6, 2.2], [0, 0, 0], [1, 1, 1], 0.16);
  add(box(3, 0.6, 2.4), mPanel, [-4, 4.4, -2.0], [0, 0, 0], [1, 1, 1], 0.16);
  for (const s of [1, -1]) add(box(2.2, 1.6, 0.8), glossy(C.shade), [4, 0.4, s * 4.8], [0, 0, 0], [1, 1, 1], 0.16);
  const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), glossy(C.light));
  sensor.position.set(12.6, 3.4, 0);
  bank.add(sensor);

  // Display pose: mostly side-on, turned just enough to show the top and flank.
  root.rotation.set(0.2, -0.3, 0);

  let t = 0;
  return {
    group: root,
    bank,
    update(dt, state = {}) {
      t += dt;
      const b = state.bank || 0;
      bank.rotation.x = THREE.MathUtils.lerp(bank.rotation.x, b * 0.55, 0.25);
      bank.position.y = Math.sin(t * 2.2) * 0.2;
      const thr = state.throttle ?? 1;
      for (const f of flames) {
        const k = thr * (0.75 + Math.random() * 0.4);
        f.scale.set(k, 1, 1);
        f.position.x = -15.5 - 6 * k;
        f.material.opacity = 0.3 + 0.35 * k;
        f.visible = thr > 0.02;
      }
    },
    setOutlines(on) { root.traverse((o) => { if (o.name === 'outline') o.visible = on; }); },
    setWireframe(on) { root.traverse((o) => { if (o.isMesh && o.name !== 'outline' && o.material.wireframe !== undefined) o.material.wireframe = on; }); },
  };
}
