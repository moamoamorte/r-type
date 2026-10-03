// The ship's shield: a faceted shell around the hull. Additive and depth-write
// free, so it never hides the ship. It is brightest when full; as it drains,
// facets drop out and the whole shell flickers. A hit sends a ripple across the
// surface from the point of impact.
import * as THREE from '../../vendor/three.module.js';

const VERT = /* glsl */ `
  varying vec3 vDir;
  #ifndef EDGE
  varying vec3 vFace;
  varying float vFacing;
  #endif
  void main() {
    vDir = normalize(position);
    #ifndef EDGE
    vFace = normal;
    vFacing = abs(normalize(normalMatrix * normal).z);
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;   // 0..1 shield remaining
  uniform float uAlpha;      // whole-shell flicker
  uniform vec3 uHitDir;      // unit direction of the last impact
  uniform float uHitAge;     // seconds since it
  uniform float uTime;
  varying vec3 vDir;
  #ifndef EDGE
  varying vec3 vFace;
  varying float vFacing;
  #endif
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    float d = acos(clamp(dot(vDir, uHitDir), -1.0, 1.0));
    float ring = exp(-pow((d - uHitAge * 6.0) * 3.5, 2.0)) * max(0.0, 1.0 - uHitAge / 0.5);
    float spot = exp(-d * d * 5.0) * max(0.0, 1.0 - uHitAge / 0.3);
    #ifdef EDGE
    float base = 0.04 + 0.12 * uStrength;
    #else
    // Facets drop out as the shield weakens, reshuffled a few times a second.
    if (hash(floor(vFace * 40.0) + floor(uTime * 8.0)) > 0.25 + uStrength) discard;
    float base = (0.02 + 0.45 * pow(1.0 - vFacing, 2.0)) * (0.3 + 0.7 * uStrength);
    #endif
    gl_FragColor = vec4(uColor, (base + ring * 0.9 + spot * 1.2) * uAlpha);
  }`;

export function createShield({ rx = 25, ry = 14, rz = 13, color = 0x3fd8cb } = {}) {
  const root = new THREE.Group();
  const shell = new THREE.Group();
  shell.scale.set(rx, ry, rz);
  root.add(shell);

  const uniforms = {
    uColor: { value: new THREE.Color(color) },
    uStrength: { value: 1 },
    uAlpha: { value: 1 },
    uHitDir: { value: new THREE.Vector3(1, 0, 0) },
    uHitAge: { value: 99 },
    uTime: { value: 0 },
  };
  const mat = (edge) => new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: FRAG, defines: edge ? { EDGE: '' } : {},
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });

  // Flat normals keep every facet a single flat plane.
  const geo = new THREE.IcosahedronGeometry(1, 1);
  geo.computeVertexNormals();
  shell.add(new THREE.Mesh(geo, mat(false)));
  shell.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), mat(true)));

  let t = 0;
  return {
    group: root,
    // strength 0..1; hitAngle points from the ship toward the impact in screen
    // space (y down); hitAge is seconds since that hit.
    update(dt, { strength = 1, hitAngle = 0, hitAge = 99 } = {}) {
      t += dt;
      root.visible = strength > 0;
      uniforms.uTime.value = t;
      uniforms.uStrength.value = strength;
      uniforms.uAlpha.value = strength < 0.3 && Math.random() < 0.3 ? 0.25 : 1;
      // Map the screen angle onto the unit shell, tipped toward the camera so the
      // ripple spreads over the visible face rather than starting on the rim.
      uniforms.uHitDir.value.set(Math.cos(hitAngle) / rx, -Math.sin(hitAngle) / ry, 0.7 / rz).normalize();
      uniforms.uHitAge.value = hitAge;
    },
  };
}
