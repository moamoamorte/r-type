// The pod: armoured orb with rotating shell plates and a glowing core.
import * as THREE from '../../vendor/three.module.js';
import { part, toon, glossy, PALETTE as P } from './materials.js';

const LASER_COLOR = { red: 0xff5a2a, blue: 0x3ac8ff, yellow: 0xffd82a };

export function createPod({ outline = 0.28, color = 'red', level = 1 } = {}) {
  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);

  const coreMat = new THREE.MeshBasicMaterial({ color: LASER_COLOR[color], toneMapped: false });
  const core = new THREE.Mesh(new THREE.SphereGeometry(3.1, 16, 12), coreMat);
  root.add(core);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(4.4, 16, 12),
    new THREE.MeshBasicMaterial({ color: LASER_COLOR[color], transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  );
  root.add(halo);

  const plates = [];
  const plateGeo = new THREE.TorusGeometry(5.4, 1.1, 6, 14, Math.PI * 0.62);
  for (let i = 0; i < 3; i++) {
    const g = part(plateGeo, toon(P.hull), { outline });
    g.rotation.set(Math.PI / 2, 0, (i * Math.PI * 2) / 3);
    spin.add(g);
    plates.push(g);
  }
  const ring = part(new THREE.TorusGeometry(6.6, 0.55, 6, 24), toon(P.gunmetal), { outline: outline * 0.7 });
  ring.rotation.x = Math.PI / 2;
  spin.add(ring);

  for (const s of [1, -1]) {
    const claw = part(new THREE.BoxGeometry(3.4, 1.1, 1.1), glossy(0xb8c0d0), { outline: 0.18 });
    claw.position.set(4.6, s * 3.4, 0);
    claw.rotation.z = s * 0.4;
    root.add(claw);
  }

  root.rotation.set(0.2, -0.4, 0);
  let t = 0;
  return {
    group: root,
    update(dt, state = {}) {
      t += dt;
      spin.rotation.z += dt * 1.6;
      spin.rotation.x = Math.sin(t * 0.8) * 0.25;
      const pulse = 1 + Math.sin(t * 5) * 0.06;
      core.scale.setScalar(pulse);
      halo.scale.setScalar(pulse * (1 + (state.charge || 0) * 0.3));
    },
    setColor(c) {
      coreMat.color.set(LASER_COLOR[c]);
      halo.material.color.set(LASER_COLOR[c]);
    },
    setOutlines(on) { root.traverse((o) => { if (o.name === 'outline') o.visible = on; }); },
    setWireframe(on) { root.traverse((o) => { if (o.isMesh && o.name !== 'outline' && o.material.wireframe !== undefined) o.material.wireframe = on; }); },
  };
}
