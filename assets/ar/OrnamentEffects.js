import * as THREE from '../vendor/three/build/three.module.js';

function pointGeometry(aspect, seed, count, rx, ry, palette) {
  const positions = [];
  const colors = [];
  for (let i = 0; i < count; i++) {
    const angle = i / count * Math.PI * 2 + seed * 0.013;
    const jitter = Math.sin(i * 17.31 + seed) * 0.012;
    const bead = i % 7 === 0 ? 1.14 : (i % 3 === 0 ? 0.98 : 0.84);
    positions.push(Math.cos(angle) * (rx + jitter) * bead, Math.sin(angle) * (ry * aspect + jitter) * bead, .012 + Math.sin(angle * 3 + seed) * .012);
    const color = new THREE.Color(palette[i % palette.length]);
    colors.push(color.r, color.g, color.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

export class OrnamentEffects {
  constructor({ aspect = 1, seed = 1 } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'ornamental-atmosphere';
    this.seed = seed;
    this.expanded = false;
    this.disposed = false;

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 256;
    const ctx = glowCanvas.getContext('2d');
    const glow = ctx.createRadialGradient(128, 128, 12, 128, 128, 126);
    glow.addColorStop(0, 'rgba(239,198,112,.20)');
    glow.addColorStop(.42, 'rgba(207,156,64,.11)');
    glow.addColorStop(1, 'rgba(167,116,43,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 256, 256);
    this.glowTexture = new THREE.CanvasTexture(glowCanvas);
    this.glowTexture.colorSpace = THREE.SRGBColorSpace;
    this.glowMaterial = new THREE.MeshBasicMaterial({ map: this.glowTexture, transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 1.34 * aspect), this.glowMaterial);
    this.glow.position.z = -.045;
    this.glow.renderOrder = 2;
    this.group.add(this.glow);

    const palette = ['#e8c46d', '#f5e2a8', '#c9963e', '#ddbd77'];
    this.orbitGeometry = pointGeometry(aspect, seed, 76, .66, .72, palette);
    this.orbitMaterial = new THREE.PointsMaterial({ size: .009, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending });
    this.orbit = new THREE.Points(this.orbitGeometry, this.orbitMaterial);
    this.orbit.name = 'golden-orbit-points';
    this.orbit.renderOrder = 14;
    this.group.add(this.orbit);

    this.sparkGeometry = pointGeometry(aspect, seed + 19, 24, .77, .83, ['#fff0bc', '#e2b95f', '#f6df9a']);
    this.sparkMaterial = new THREE.PointsMaterial({ size: .015, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: .68, depthWrite: false, blending: THREE.AdditiveBlending });
    this.sparks = new THREE.Points(this.sparkGeometry, this.sparkMaterial);
    this.sparks.name = 'floating-gold-sparks';
    this.sparks.renderOrder = 15;
    this.group.add(this.sparks);
  }

  setExpanded(value) { this.expanded = Boolean(value); }

  update(time) {
    if (this.disposed) return;
    const t = time * .001;
    const amplitude = this.expanded ? 1.55 : 1;
    this.group.position.y = Math.sin(t * 1.15 + this.seed) * .006 * amplitude;
    this.group.rotation.z = Math.sin(t * .34 + this.seed) * .012 * amplitude;
    this.orbit.rotation.z = Math.sin(t * .25 + this.seed) * .055;
    this.sparks.rotation.z = -Math.sin(t * .19 + this.seed) * .075;
    this.orbitMaterial.opacity = .57 + .17 * (Math.sin(t * 1.8 + this.seed) + 1) / 2;
    this.sparkMaterial.opacity = .42 + .34 * (Math.sin(t * 2.1 + this.seed * 2) + 1) / 2;
    this.glowMaterial.opacity = .65 + .2 * (Math.sin(t * 1.25 + this.seed) + 1) / 2;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.glow.geometry.dispose();
    this.glowMaterial.dispose();
    this.glowTexture.dispose();
    this.orbitGeometry.dispose();
    this.orbitMaterial.dispose();
    this.sparkGeometry.dispose();
    this.sparkMaterial.dispose();
    this.group.clear();
  }
}
