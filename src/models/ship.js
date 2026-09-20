// Player fighter, built procedurally. Original design: a grey gunship whose
// hull tapers from a wide engine block down to a narrow nose, with four short
// swept arms forming a compact X when seen from behind.
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

  // --- fuselage: wide at the engines, tapering to a point at the nose ------
  add(box(5, 6.4, 8.2), mMetal, [-14, 0, 0], [0, 0, 0], [1, 1, 1], 0.4);        // engine block
  add(prism(3.9, 4.6, 14, 8), mHull, [-4.5, 0, 0], [0, 0, 0], [1, 0.92, 1.08]); // mid body
  add(prism(1.7, 3.9, 12, 8), mLight, [8.5, 0, 0], [0, 0, 0], [1, 0.9, 1]);     // forward taper
  add(prism(0.22, 1.7, 5.5, 6), mShade, [17.2, 0, 0]);                           // nose point
  add(box(7, 1.3, 6.4), mShade, [1, 3.6, 0]);                                    // dorsal deck
  add(box(12, 1.5, 6.2), mPanel, [-4, -3.7, 0]);                                 // belly plate
  add(box(3.4, 1.0, 4.2), mDark, [11, 1.9, 0], [0, 0, 0], [1, 1, 1], 0.22);      // sensor spine

  // --- cockpit -------------------------------------------------------------
  const canopyGeo = new THREE.SphereGeometry(2.0, 16, 10, 0, TAU, 0, Math.PI / 2);
  add(canopyGeo, glass, [4.6, 4.0, 0], [0, 0, 0], [1.9, 0.6, 1.0], 0.18);
  add(box(6.4, 0.7, 4.6), mMetal, [4.6, 3.6, 0], [0, 0, 0], [1, 1, 1], 0.2);

  // --- four short arms in a compact X --------------------------------------
  const flames = [];
  const armAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  for (const a of armAngles) {
    const arm = new THREE.Group();
    arm.rotation.x = a;
    bank.add(arm);

    put(arm, plate([[4, 2.2], [5.2, 3.4], [-4.5, 9.2], [-9, 9.2], [-4.5, 3.4]], 1.1), mHull, [-4, 0, 0]);
    put(arm, plate([[5, 3.4], [-4.5, 9.2], [-6.4, 9.2], [2.6, 3.4]], 1.2), mShade, [-4, 0.15, 0], [0, 0, 0], [1, 1, 1], 0.24);
    put(arm, prism(1.9, 2.1, 10, 6), mLight, [-6.5, 0, 9.6], [0, 0, 0], [1, 1, 1.05]);
    put(arm, box(6, 0.8, 1.1), mPanel, [-6.5, 1.9, 9.6], [0, 0, 0], [1, 1, 1], 0.22);
    put(arm, prism(2.4, 1.9, 2.2, 6), mMetal, [-12.2, 0, 9.6]);
    put(arm, prism(1.3, 2.0, 3, 6), mDark, [-0.9, 0, 9.6], [0, 0, 0], [1, 1, 1], 0.26);

    const ring = new THREE.Mesh(
      new THREE.CircleGeometry(1.7, 12),
      new THREE.MeshBasicMaterial({ color: 0x9fe8ff, toneMapped: false })
    );
    ring.position.set(-13.3, 0, 9.6);
    ring.rotation.y = -Math.PI / 2;
    arm.add(ring);

    const flameGeo = new THREE.ConeGeometry(1.5, 10, 8, 1, true);
    flameGeo.rotateZ(Math.PI / 2);
    const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({
      color: 0x8fe4ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    flame.position.set(-19, 0, 9.6);
    arm.add(flame);
    flames.push(flame);
  }

  // --- cannons, tucked along the taper so the point stays clear -------------
  for (const s of [1, -1]) {
    add(box(6, 1.8, 2.0), mDark, [7, -1.8, s * 2.6], [0, 0, 0], [1, 1, 1], 0.3);
    add(prism(0.7, 0.85, 5.5, 6), mMetal, [12.5, -1.8, s * 2.6], [0, 0, 0], [1, 1, 1], 0.24);
    add(box(1.0, 1.0, 1.0), toon(C.muzzle), [15.4, -1.8, s * 2.6], [0, 0, 0], [1, 1, 1], 0.18);
  }

  // --- greebles ------------------------------------------------------------
  add(box(3.4, 0.6, 2.6), mPanel, [-2, 4.2, 1.8], [0, 0, 0], [1, 1, 1], 0.16);
  add(box(2.6, 0.6, 2.0), mPanel, [-7, 4.0, -1.6], [0, 0, 0], [1, 1, 1], 0.16);
  for (const s of [1, -1]) add(box(2.0, 1.4, 0.7), glossy(C.shade), [0, 0.2, s * 4.4], [0, 0, 0], [1, 1, 1], 0.16);
  const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), glossy(C.light));
  sensor.position.set(9.5, 2.9, 0);
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
        f.position.x = -14 - 5.5 * k;
        f.material.opacity = 0.3 + 0.35 * k;
        f.visible = thr > 0.02;
      }
    },
    setOutlines(on) { root.traverse((o) => { if (o.name === 'outline') o.visible = on; }); },
    setWireframe(on) { root.traverse((o) => { if (o.isMesh && o.name !== 'outline' && o.material.wireframe !== undefined) o.material.wireframe = on; }); },
  };
}
