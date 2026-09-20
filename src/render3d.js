// 3D layer: renders the player ship and pod as lit 3D models on a transparent
// canvas stacked over the 2D playfield. Game logic stays 2D and untouched.
import * as THREE from '../vendor/three.module.js';
import { W, H } from './util.js';
import { createShip } from './models/ship.js';
import { createPod } from './models/pod.js';

export class Render3D {
  // Returns null when WebGL isn't available, so the game can fall back to 2D.
  static create(canvas) {
    try {
      return new Render3D(canvas);
    } catch (err) {
      console.warn('3D layer unavailable, using 2D sprites:', err);
      return null;
    }
  }

  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(1);
    this.setScale(3);

    this.scene = new THREE.Scene();
    // Game pixels map 1:1 to world units; screen y grows downward, world y up.
    this.camera = new THREE.OrthographicCamera(0, W, 0, -H, -800, 800);
    this.camera.position.set(0, 0, 400);

    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(60, 90, 120);
    const fill = new THREE.DirectionalLight(0x91b4ff, 0.9);
    fill.position.set(-80, -40, 60);
    const rim = new THREE.DirectionalLight(0x7fe8ff, 1.7);
    rim.position.set(-60, 30, -90);
    this.scene.add(key, fill, rim, new THREE.HemisphereLight(0xbcd2ff, 0x1a1e2a, 0.75));

    this.ship = createShip();
    this.pod = createPod();
    this.ship.group.scale.setScalar(0.78);
    this.pod.group.scale.setScalar(0.72);
    this.scene.add(this.ship.group, this.pod.group);
    this.hideAll();
  }

  // Internal resolution multiplier over the 384x224 field.
  setScale(s) {
    this.scale = s;
    this.renderer.setSize(W * s, H * s, false);
  }

  hideAll() {
    this.ship.group.visible = false;
    this.pod.group.visible = false;
  }

  clear() {
    this.hideAll();
    this.renderer.render(this.scene, this.camera);
  }

  // Title screen: the ship hangs centre stage, turning slowly.
  renderTitle(t) {
    this.pod.group.visible = false;
    const s = this.ship.group;
    s.visible = true;
    s.scale.setScalar(2.0);
    s.position.set(W / 2, -97 + Math.sin(t * 0.03) * 3, 0);
    s.rotation.set(0.2 + Math.sin(t * 0.011) * 0.06, -0.3 + Math.sin(t * 0.008) * 0.22, 0);
    this.ship.update(1 / 60, {
      bank: Math.sin(t * 0.02) * 0.3,
      dip: Math.sin(t * 0.014) * 0.4,
      throttle: 1,
    });
    this.renderer.render(this.scene, this.camera);
  }

  render(game, dt = 1 / 60) {
    const p = game.player;
    const cam = game.cam;

    const show = p && !p.dead && !(p.inv > 0 && (p.t >> 2) % 2);
    this.ship.group.visible = !!show;
    if (p && show) {
      this.ship.group.scale.setScalar(0.78);
      this.ship.group.rotation.set(0.2, -0.3, 0);
      this.ship.group.position.set(p.x - cam, -p.y, 0);
      this.ship.update(dt, {
        bank: -p.tilt,
        dip: p.turn || 0,
        throttle: p.entering ? 1 : 0.85 + Math.random() * 0.15,
      });
    }

    const pod = game.pod;
    this.pod.group.visible = !!pod;
    if (pod) {
      const docked = pod.state === 'front' || pod.state === 'back';
      if (pod.state !== this.podState) {
        if (docked) this.pod.clamp();
        else if (this.podDocked) this.pod.release();
        this.podState = pod.state;
        this.podDocked = docked;
      }
      // Docked, the pod sits back over the hull so it engulfs the nose (or tail)
      // rather than floating in front of it.
      let px = pod.x - cam, py = -pod.y;
      if (pod.state === 'front') { px -= 7; py -= 2.5; this.pod.setGrip(-1); }
      else if (pod.state === 'back') { px += 5; this.pod.setGrip(1); }
      else this.pod.setGrip(1);
      this.pod.group.position.set(px, py, 4);
      if (this.podColor !== pod.color) {
        this.podColor = pod.color;
        this.pod.setColor(pod.color);
      }
      this.pod.update(dt, { charge: p?.charge || 0 });
    }

    this.renderer.render(this.scene, this.camera);
  }
}
