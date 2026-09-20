// Player fighter, built procedurally. Original design: a long-nosed interceptor
// with swept anhedral wings, twin nacelles and a chin cannon. Shaped to read
// clearly in silhouette at small on-screen sizes.
// +X is forward, +Y up, +Z out of the screen.
import * as THREE from '../../vendor/three.module.js';
import { part, toon, glossy, PALETTE as P } from './materials.js';

const TAU = Math.PI * 2;
const OUT = 0.5;

function prism(rTop, rBottom, len, seg = 6) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, len, seg, 1);
  g.rotateZ(-Math.PI / 2);
  return g;
}

// Flat plate from a 2D outline, lying in the XZ plane (wing, fin, strake).
function plate(points, thickness = 1.0, bevel = 0.25) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1,
  });
  // Shape x stays along the hull, shape y becomes the span (+Z), depth becomes thickness.
  g.rotateX(Math.PI / 2);
  g.translate(0, thickness / 2, 0);
  return g;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

export function createShip({ outline = OUT } = {}) {
  const root = new THREE.Group();
  const bank = new THREE.Group();
  root.add(bank);

  const hull = toon(P.hull);
  const shade = toon(P.hullShade);
  const metal = toon(P.gunmetal);
  const dark = toon(P.dark);
  const red = toon(P.crimson);
  const gold = glossy(P.gold);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x17d5ff, roughness: 0.05, metalness: 0.2, emissive: 0x0d7fa8, emissiveIntensity: 0.9,
  });

  const add = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], o = outline) => {
    const g = part(geo, mat, { outline: o });
    g.position.set(...pos);
    g.rotation.set(...rot);
    g.scale.set(...scale);
    bank.add(g);
    return g;
  };

  // --- fuselage ------------------------------------------------------------
  add(prism(3.2, 3.8, 20), hull, [-4, 0, 0], [0, 0, 0], [1, 0.85, 1.15]);       // mid body
  add(prism(1.0, 3.2, 17), hull, [12.5, 0.2, 0], [0, 0, 0], [1, 0.8, 0.95]);    // long nose
  add(prism(0.3, 1.0, 3), metal, [22.5, 0.2, 0]);                                // nose probe
  add(prism(3.6, 3.0, 6), metal, [-16.5, 0, 0], [0, 0, 0], [1, 0.9, 1.15]);     // tail block
  add(box(19, 1.5, 5.2), shade, [-3, 2.7, 0]);                                   // dorsal spine
  add(box(10, 1.1, 3.6), hull, [3, 3.7, 0]);                                     // spine cap
  add(box(20, 1.4, 4.6), red, [-4, -2.7, 0]);                                    // crimson keel
  add(box(12, 1.6, 3.2), dark, [7, -2.9, 0]);                                    // belly plate

  // --- cockpit -------------------------------------------------------------
  const canopy = new THREE.SphereGeometry(2.2, 16, 10, 0, TAU, 0, Math.PI / 2);
  add(canopy, glass, [8.5, 2.0, 0], [0, 0, 0], [1.9, 0.95, 0.9], 0.2);
  add(box(6.5, 0.6, 3.6), metal, [8.5, 1.7, 0], [0, 0, 0], [1, 1, 1], 0.2);

  // --- wings: swept back, tips angled down ---------------------------------
  const wing = plate([[6, 0], [7.5, 1.2], [-4.5, 12], [-11, 12], [-5, 1.2]], 0.95);
  const tipFin = plate([[2.5, 0], [3, 0.8], [-3.5, 5.5], [-6.5, 5.5], [-3, 0.8]], 0.8);
  for (const s of [1, -1]) {
    const w = add(wing, hull, [-5, -0.6, s * 3.6], [s * -0.12, 0, 0]);
    w.scale.z = s;
    // crimson leading edge
    const le = add(plate([[7.2, 1.0], [-4.5, 12], [-7.2, 12], [4.2, 1.0]], 1.0), red, [-5, -0.5, s * 3.6], [s * -0.12, 0, 0], [1, 1, 1], 0.22);
    le.scale.z = s;
    const f = add(tipFin, shade, [-10.5, -1.6, s * 15.4], [s * -0.95, 0, 0], [1, 1, 1], 0.3);
    f.scale.z = s;
    add(box(2.6, 1.0, 1.0), toon(P.teal), [-12.5, -2.6, s * 17.6], [0, 0, 0], [1, 1, 1], 0.18);
    // wing root strake
    const st = add(plate([[4, 0], [4.5, 0.6], [-2, 4.5], [-5, 4.5], [-3, 0.6]], 0.7), shade, [6, 0.4, s * 3.2], [0, 0, 0], [1, 1, 1], 0.2);
    st.scale.z = s;
  }

  // --- nacelles ------------------------------------------------------------
  const flames = [];
  for (const s of [1, -1]) {
    add(prism(2.6, 2.9, 15), hull, [-10, -0.6, s * 5.4], [0, 0, 0], [1, 1, 1.05]);
    add(box(11, 1.0, 1.4), red, [-10, 1.9, s * 5.4], [0, 0, 0], [1, 1, 1], 0.2);
    add(prism(3.2, 2.7, 2.4), metal, [-18.4, -0.6, s * 5.4]);
    add(prism(2.4, 3.0, 4), dark, [-4, -0.6, s * 5.4], [0, 0, 0], [1, 1, 1], 0.25);

    const ring = new THREE.Mesh(new THREE.CircleGeometry(2.3, 14), new THREE.MeshBasicMaterial({ color: P.glow, toneMapped: false }));
    ring.position.set(-19.7, -0.6, s * 5.4);
    ring.rotation.y = -Math.PI / 2;
    bank.add(ring);

    const flameGeo = new THREE.ConeGeometry(2.0, 13, 8, 1, true);
    flameGeo.rotateZ(Math.PI / 2);
    const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({
      color: 0x8fe4ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    flame.position.set(-26, -0.6, s * 5.4);
    bank.add(flame);
    flames.push(flame);
  }

  // --- dorsal fin and tailplanes -------------------------------------------
  const fin = plate([[4, 0], [4.6, 1], [-3.5, 9], [-7.5, 9], [-4, 1]], 0.85);
  const finG = add(fin, shade, [-13, 3.2, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], 0.3);
  finG.rotation.set(-Math.PI / 2, 0, 0);
  add(box(3.4, 0.8, 0.8), red, [-17.5, 10.5, 0], [0, 0, 0], [1, 1, 1], 0.2);

  // --- chin cannon ---------------------------------------------------------
  add(box(9, 2.2, 2.6), dark, [11, -3.4, 0], [0, 0, 0], [1, 1, 1], 0.3);
  add(prism(0.75, 0.95, 9), metal, [19, -3.4, 0], [0, 0, 0], [1, 1, 1], 0.22);
  add(box(1.3, 1.3, 1.3), toon(0xff7a1f), [23.4, -3.4, 0], [0, 0, 0], [1, 1, 1], 0.18);

  // --- greebles ------------------------------------------------------------
  add(box(4, 0.5, 2.4), shade, [-8, 3.5, 1.8], [0, 0, 0], [1, 1, 1], 0.16);
  add(box(2.8, 0.5, 2), shade, [-13, 3.4, -1.6], [0, 0, 0], [1, 1, 1], 0.16);
  for (const s of [1, -1]) add(box(2, 1.5, 0.7), gold, [1, 1.2, s * 3.4], [0, 0, 0], [1, 1, 1], 0.16);
  const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), glossy(P.gold));
  sensor.position.set(14, 1.9, 0);
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
        f.position.x = -19.7 - 6.5 * k;
        f.material.opacity = 0.3 + 0.35 * k;
        f.visible = thr > 0.02;
      }
    },
    setOutlines(on) { root.traverse((o) => { if (o.name === 'outline') o.visible = on; }); },
    setWireframe(on) { root.traverse((o) => { if (o.isMesh && o.name !== 'outline' && o.material.wireframe !== undefined) o.material.wireframe = on; }); },
  };
}
