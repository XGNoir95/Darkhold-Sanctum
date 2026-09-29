// Shinigami for Kira's Room: Ryuk and Rem.
// 100% procedural (primitives + canvas textures), no external assets, matching the rest of the project.
//
//   import { addShinigami } from './shinigami.js';
//   const gods = addShinigami(scene);           // in room setup
//   gods.update(clock.getElapsedTime());        // in the animation loop
//
// Units: 1 = 1 metre-ish. Ryuk is ~2.3 tall, Rem ~2.5 tall (before `scale`). Feet sit at y = 0.

import * as THREE from 'three';

/* ------------------------------------------------------------------ helpers */

const UP = new THREE.Vector3(0, 1, 0);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function speckleTexture(base, { cracks = 0, seed = 1, size = 256, repeat = 2 } = {}) {
  if (typeof document === 'undefined') return null;
  const r = rng(seed);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.07)';
    g.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2);
  }
  g.strokeStyle = 'rgba(20,20,25,.45)';
  for (let i = 0; i < cracks; i++) {
    let x = r() * size, y = r() * size;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 28; y += (r() - 0.3) * 28; g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const M = (color, o = {}) =>
  new THREE.MeshStandardMaterial({ color: o.map ? 0xffffff : color, roughness: 0.7, metalness: 0, ...o });

/** Physical material — for skin, eyes, and surfaces that benefit from clearcoat / sheen. */
const P = (color, o = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, metalness: 0, ...o });

function orient(mesh, dir) {
  mesh.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
}

/** Tapered cylinder from a to b (radius ra at a, rb at b). */
function limb(a, b, ra, rb, mat, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, a.distanceTo(b), seg), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  orient(m, b.clone().sub(a));
  return m;
}

/** Cone whose base sits at `base`, pointing along `dir`. */
function cone(base, dir, len, r, mat, seg = 6) {
  const d = dir.clone().normalize();
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, len, seg), mat);
  m.position.copy(base).addScaledVector(d, len / 2);
  orient(m, d);
  return m;
}

function ball(p, r, mat, sx = 1, sy = 1, sz = 1, seg = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.75)), mat);
  m.position.copy(p);
  m.scale.set(sx, sy, sz);
  return m;
}

/** Flattened ridges stacked along a limb (bone plating / armor segments). */
function plates(a, b, n, r, mat) {
  const g = new THREE.Group();
  const dir = b.clone().sub(a);
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const m = ball(a.clone().lerp(b, t), r * (1.1 - 0.3 * t), mat, 1.25, 0.3, 1.05, 10);
    orient(m, dir);
    g.add(m);
  }
  return g;
}

/** Long clawed hand hanging along -y; fingers curl toward +z. */
function hand(mat, nail, s = 1) {
  const g = new THREE.Group();
  g.add(ball(V(0, -0.05 * s, 0), 0.06 * s, mat, 1.15, 1, 0.55));
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.036 * s;
    const L = (0.09 + (i === 1 || i === 2 ? 0.025 : 0)) * s;
    const a = V(x, -0.09 * s, 0);
    const b = V(x * 1.15, -0.09 * s - L, 0.03 * s);
    const c = V(x * 1.25, -0.09 * s - L - 0.075 * s, 0.085 * s);
    g.add(limb(a, b, 0.014 * s, 0.011 * s, mat, 6));
    g.add(ball(b, 0.011 * s, mat, 1, 1, 1, 6));
    g.add(limb(b, c, 0.011 * s, 0.008 * s, mat, 6));
    g.add(cone(c, c.clone().sub(b).add(V(0, -0.02, 0.05)), 0.055 * s, 0.009 * s, nail, 5));
  }
  const a = V(0.05 * s, -0.04 * s, 0), b = V(0.09 * s, -0.09 * s, 0.035 * s);
  g.add(limb(a, b, 0.016 * s, 0.011 * s, mat, 6));
  g.add(cone(b, b.clone().sub(a).add(V(0, -0.03, 0.05)), 0.05 * s, 0.009 * s, nail, 5));
  return g;
}

/** Fan of spikes around the neck; the front (+z) stays open for the face. */
function spikeCollar(parent, mat, rand, rings, skip = 0.55) {
  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++) {
      const ang = skip + (i / (ring.count - 1)) * (Math.PI * 2 - skip * 2);
      const out = V(Math.sin(ang), 0, Math.cos(ang));
      const side = Math.abs(Math.sin(ang));
      const dir = out.clone().multiplyScalar(ring.rad * (0.5 + side * 0.9)).add(V(0, ring.lift, 0));
      dir.x += (rand() - 0.5) * 0.25;
      dir.z += (rand() - 0.5) * 0.25;
      const len = (ring.len[0] + (ring.len[1] - ring.len[0]) * Math.pow(side, 0.7)) * (0.8 + rand() * 0.4);
      const base = out.clone().multiplyScalar(ring.radius).add(V(0, ring.y, 0));
      parent.add(cone(base, dir, len, ring.r * (0.8 + rand() * 0.5), mat, 5));
    }
  }
}

function finish(root, scale) {
  root.scale.setScalar(scale);
  root.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return root;
}

/* --------------------------------------------------------------------- Ryuk */

export function createRyuk({ scale = 1 } = {}) {
  const R = rng(7);
  const root = new THREE.Group();
  root.name = 'Ryuk';

  const cloth = M(0x15131b, { roughness: 0.88 });
  const clothLite = M(0x241f2c, { roughness: 0.9 });
  const boots = M(0x0d0c10, { roughness: 0.45 });
  const skin = P(0xdcd8ce, { map: speckleTexture('#dcd8ce', { seed: 3, size: 512 }), roughness: 0.48, clearcoat: 0.15, clearcoatRoughness: 0.6, sheen: 0.1, sheenColor: new THREE.Color(0xc8bfaa) });
  const skinDark = P(0x9a9488, { roughness: 0.55 });
  const hairM = M(0x0e0c10, { roughness: 0.95 });
  const metal = M(0xbfc3cc, { metalness: 0.9, roughness: 0.35 });
  const leather = M(0x18161e, { roughness: 0.55 });
  const clawHand = M(0x1a191e, { roughness: 0.5 });
  const claw = M(0x08080a, { roughness: 0.35 });
  const eyeM = P(0xf0d84a, { roughness: 0.15, emissive: 0x786418, emissiveIntensity: 1.6, clearcoat: 1.0, clearcoatRoughness: 0.1 });
  const dark = M(0x050506, { roughness: 1 });
  const lipM = M(0x1a0808, { roughness: 0.6 });

  // --- Pelvis & Hip Girdle (anchors thighs into the body seamlessly) ---
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.10, 0);
  root.add(pelvis);

  // central pelvis mass connecting hips and waist
  pelvis.add(ball(V(0, 0, -0.01), 0.20, cloth, 1.35, 0.85, 0.95, 18));
  pelvis.add(ball(V(0, -0.04, 0.02), 0.16, cloth, 1.1, 0.7, 0.9, 14));

  // --- Legs + Gothic Boots ---
  for (const s of [-1, 1]) {
    const hip = V(s * 0.21, 1.08, 0.01);
    const knee = V(s * 0.22, 0.58, 0.07);
    const ankle = V(s * 0.22, 0.13, -0.02);

    // hip socket ball — caps the thigh cylinder top completely so NO flat cut is ever visible
    root.add(ball(hip, 0.088, cloth, 1, 1, 1, 16));

    // upper leg (black cloth trousers)
    root.add(limb(hip, knee, 0.084, 0.066, cloth, 14));
    root.add(ball(knee, 0.070, cloth, 1, 1, 1, 14));

    // shin direction vector
    const dir = ankle.clone().sub(knee).normalize();

    // gothic flared boot cuff at knee (flaring outwards and aligned with shin)
    const cuffTop = knee.clone().addScaledVector(dir, -0.01);
    const cuffBottom = knee.clone().addScaledVector(dir, 0.09);
    root.add(limb(cuffTop, cuffBottom, 0.104, 0.084, boots, 16));

    // boot shaft (knee cuff down to ankle)
    root.add(limb(knee.clone().addScaledVector(dir, 0.07), ankle, 0.084, 0.068, boots, 16));

    // boot straps with silver buckles on shin
    for (const t of [0.42, 0.74]) {
      const p = knee.clone().lerp(ankle, t);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.078 - t * 0.008, 0.008, 6, 18), dark);
      strap.position.copy(p);
      strap.quaternion.setFromUnitVectors(UP, dir);
      root.add(strap);
      // silver buckle
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.018, 0.012), metal);
      buckle.position.copy(p).add(V(0, 0, 0.074 - t * 0.006));
      root.add(buckle);
    }

    // ankle joint
    root.add(ball(ankle, 0.068, boots, 0.95, 1, 0.95, 14));

    // --- Gothic Boot Foot (grounded at y = 0, pointed upturned toe, solid heel) ---
    const heelBottom = V(s * 0.22, 0.025, -0.04);
    // heel column connecting ankle down to ground
    root.add(limb(ankle.clone().add(V(0, -0.01, -0.015)), heelBottom, 0.062, 0.055, boots, 12));
    // solid heel block touching floor
    root.add(ball(heelBottom, 0.055, boots, 1.0, 0.45, 1.1, 12));

    // instep (sloping bridge from front of ankle to ball of foot)
    const ballOfFoot = V(s * 0.22, 0.038, 0.11);
    root.add(limb(ankle, ballOfFoot, 0.068, 0.058, boots, 14));
    // ball of foot
    root.add(ball(ballOfFoot, 0.058, boots, 1.05, 0.6, 1.3, 14));

    // long pointed gothic toe extending forward
    root.add(cone(ballOfFoot.clone().add(V(0, -0.008, 0.04)), V(0, 0.2, 1), 0.14, 0.050, boots, 12));
    // upturned tip of the boot
    const toeTip = V(s * 0.22, 0.056, 0.23);
    root.add(cone(toeTip, V(0, 0.65, 0.75), 0.055, 0.022, boots, 8));

    // solid outsole along the floor
    root.add(limb(V(s * 0.22, 0.016, -0.035), V(s * 0.22, 0.016, 0.12), 0.056, 0.052, boots, 12));

    // decorative strap across the foot arch
    const archPos = ankle.clone().lerp(ballOfFoot, 0.52);
    const archStrap = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.007, 6, 18), dark);
    archStrap.position.copy(archPos);
    archStrap.rotation.x = Math.PI * 0.28;
    root.add(archStrap);
    const archBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.012), metal);
    archBuckle.position.copy(archPos).add(V(0, 0.02, 0.05));
    root.add(archBuckle);
  }

  // --- Hunched Upper Body (pivots smoothly above hips) ---
  const upper = new THREE.Group();
  upper.position.set(0, 1.12, 0);
  upper.rotation.x = 0.22;
  root.add(upper);

  const waist = limb(V(0, 0, 0), V(0, 0.32, 0), 0.20, 0.16, cloth, 18);
  const chest = limb(V(0, 0.32, 0), V(0, 0.68, 0), 0.16, 0.27, cloth, 18);
  chest.scale.z = 0.72;
  upper.add(waist, chest);
  for (const s of [-1, 1]) upper.add(ball(V(s * 0.3, 0.66, 0), 0.1, clothLite));

  // --- Belt, Detailed Skull Buckle, Ragged Gothic Skirt & Chain ---
  // Belt encircles waist & top of hips seamlessly
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.038, 10, 36), dark);
  belt.rotation.x = Math.PI / 2;
  belt.scale.set(1.08, 1.0, 0.88);
  belt.position.set(0, 0.02, 0);
  upper.add(belt);

  // Skull buckle group
  const buckleGroup = new THREE.Group();
  buckleGroup.position.set(0, 0.02, 0.23);
  upper.add(buckleGroup);

  const skullBack = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 20), metal);
  skullBack.rotation.x = Math.PI / 2;
  buckleGroup.add(skullBack);

  // Skull face details
  buckleGroup.add(ball(V(0, 0.01, 0.018), 0.036, skin, 1.1, 1.0, 0.75));
  buckleGroup.add(ball(V(0, -0.028, 0.015), 0.022, skin, 0.85, 0.9, 0.7));
  for (const s of [-1, 1]) {
    buckleGroup.add(ball(V(s * 0.016, 0.01, 0.042), 0.010, dark, 1.1, 1.3, 0.6));
  }
  buckleGroup.add(cone(V(0, -0.008, 0.038), V(0, 1, 0.2), 0.014, 0.006, dark));

  // Ragged gothic feather/cloth skirt draping over pelvis and thighs
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const sx = Math.sin(a) * 0.24 * 1.08;
    const sz = Math.cos(a) * 0.24 * 0.88;
    const coneLen = 0.26 + R() * 0.14;
    const coneDir = V(Math.sin(a) * 0.35, -1, Math.cos(a) * 0.25);
    upper.add(cone(V(sx, 0.0, sz), coneDir, coneLen, 0.052, cloth, 5));
  }

  // Silver chain draping across right hip
  const chainCurve = new THREE.CatmullRomCurve3([
    V(0.04, 0.01, 0.24),
    V(0.14, -0.08, 0.22),
    V(0.23, -0.09, 0.12),
    V(0.26, -0.02, 0.02),
  ]);
  upper.add(new THREE.Mesh(new THREE.TubeGeometry(chainCurve, 24, 0.009, 6), metal));

  // collar / feathered spikes
  const collar = new THREE.Group();
  collar.position.set(0, 0.7, 0);
  upper.add(collar);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.2, 0.16, 20, 1, true), clothLite);
  bowl.material.side = THREE.DoubleSide;
  bowl.position.y = 0.02;
  collar.add(bowl);
  spikeCollar(collar, hairM, R, [
    { y: 0.02, count: 30, radius: 0.22, len: [0.16, 0.5], lift: 0.7, rad: 0.9, r: 0.03 },
    { y: 0.0, count: 26, radius: 0.28, len: [0.2, 0.62], lift: 0.4, rad: 1.2, r: 0.035 },
    { y: 0.06, count: 22, radius: 0.2, len: [0.14, 0.36], lift: 1.1, rad: 0.5, r: 0.026 },
  ]);

  // neck + head
  upper.add(limb(V(0, 0.7, 0), V(0, 0.88, 0.06), 0.06, 0.05, dark, 12));
  const head = new THREE.Group();
  head.position.set(0, 0.98, 0.1);
  head.rotation.x = -0.32;
  upper.add(head);

  // cranium — higher poly for smooth silhouette
  head.add(ball(V(), 1, skin, 0.14, 0.17, 0.13, 36));
  // jaw — wider, clearer
  head.add(ball(V(0, -0.105, 0.02), 1, skin, 0.1, 0.075, 0.09, 28));
  // chin point
  head.add(ball(V(0, -0.15, 0.06), 0.035, skin, 1, 0.7, 0.9, 14));

  // cheekbones — prominent ridges
  for (const s of [-1, 1]) {
    head.add(ball(V(s * 0.09, -0.03, 0.075), 0.032, skin, 1.3, 0.6, 0.8, 14));
  }

  // brow ridge — heavy overhanging brow
  head.add(ball(V(0, 0.06, 0.1), 1, skinDark, 0.13, 0.025, 0.04, 20));
  // brow bumps above each eye
  for (const s of [-1, 1]) {
    head.add(ball(V(s * 0.056, 0.065, 0.1), 0.025, skinDark, 1.4, 0.6, 0.8, 12));
  }

  // nose bridge
  head.add(ball(V(0, 0.0, 0.12), 0.015, skin, 0.7, 1.8, 0.8, 10));
  // nose tip
  head.add(ball(V(0, -0.035, 0.125), 0.018, skin, 1.1, 0.8, 1, 10));
  // nostrils
  for (const s of [-1, 1]) {
    head.add(ball(V(s * 0.012, -0.046, 0.122), 0.007, dark, 1, 1, 0.6, 8));
  }

  // eyes — deeper sockets, brighter orbs
  for (const s of [-1, 1]) {
    // deep eye socket
    head.add(ball(V(s * 0.056, 0.03, 0.085), 1, dark, 0.052, 0.06, 0.035, 18));
    // eyeball — brighter, bigger
    head.add(ball(V(s * 0.056, 0.03, 0.104), 0.038, eyeM, 1, 1, 1, 20));
    // pupil — sharper
    head.add(ball(V(s * 0.056, 0.03, 0.138), 0.013, dark, 1, 1, 0.5, 12));
    // eye ring outline
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 8, 24), dark);
    ring.position.set(s * 0.056, 0.03, 0.106);
    head.add(ring);
    // lower eyelid crease
    head.add(ball(V(s * 0.056, 0.005, 0.1), 1, skinDark, 0.045, 0.015, 0.03, 10));
    // nostril accent
    head.add(ball(V(s * 0.014, -0.035, 0.122), 0.008, dark, 1, 1.6, 0.6, 10));
  }

  // mouth area — darker surrounding
  head.add(ball(V(0, -0.09, 0.097), 1, dark, 0.092, 0.035, 0.045, 20));
  // nasolabial folds (creases from nose to mouth)
  for (const s of [-1, 1]) {
    const fold = new THREE.CatmullRomCurve3([V(s * 0.03, -0.03, 0.118), V(s * 0.06, -0.065, 0.108), V(s * 0.09, -0.09, 0.09)]);
    head.add(new THREE.Mesh(new THREE.TubeGeometry(fold, 12, 0.004, 5), skinDark));
  }

  // grin — wider, thicker line
  const grin = new THREE.CatmullRomCurve3([V(-0.125, -0.035, 0.078), V(-0.08, -0.08, 0.105), V(-0.03, -0.105, 0.115), V(0, -0.116, 0.118), V(0.03, -0.105, 0.115), V(0.08, -0.08, 0.105), V(0.125, -0.035, 0.078)]);
  head.add(new THREE.Mesh(new THREE.TubeGeometry(grin, 36, 0.01, 8), lipM));
  // gums behind teeth
  head.add(ball(V(0, -0.09, 0.098), 1, lipM, 0.075, 0.028, 0.03, 14));
  // teeth — more, clearer, upper and lower rows
  for (let i = 0; i < 12; i++) {
    const x = (i - 5.5) * 0.015, z = 0.118 - x * x * 2.5;
    // upper teeth — pointed
    head.add(cone(V(x, -0.075, z), V(0, -1, 0.18), 0.035, 0.009, skin, 5));
    // lower teeth
    head.add(cone(V(x, -0.107, z - 0.003), V(0, 1, 0.18), 0.025, 0.008, skin, 5));
  }
  // earring
  const ear = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 8, 18), metal);
  ear.rotation.y = Math.PI / 2;
  ear.position.set(0.14, -0.03, 0);
  head.add(ear);
  // second earring lower
  const ear2 = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 8, 14), metal);
  ear2.rotation.y = Math.PI / 2;
  ear2.position.set(0.142, -0.055, 0.005);
  head.add(ear2);

  // face light — illuminates Ryuk's features from the front
  const faceLight = new THREE.PointLight(0xffe8cc, 0.8, 1.5, 2);
  faceLight.position.set(0, 0.02, 0.25);
  head.add(faceLight);
  // eye glow lights
  for (const s of [-1, 1]) {
    const eyeLight = new THREE.PointLight(0xe9d24a, 0.4, 0.6, 2);
    eyeLight.position.set(s * 0.056, 0.03, 0.15);
    head.add(eyeLight);
  }

  const hair = new THREE.Group();
  head.add(hair);
  for (let i = 0; i < 95; i++) {
    const v = V(R() * 2 - 1, 0.2 + R() * 0.8, R() * 2 - 1).normalize();
    if (v.z > 0.55 && v.y < 0.7) continue; // keep the face clear
    const base = V(v.x * 0.13, v.y * 0.17, v.z * 0.12);
    const dir = V(v.x * 0.6, v.y + 0.5, v.z * 0.6 - 0.1);
    hair.add(cone(base, dir, 0.18 + R() * 0.22, 0.03, hairM, 6));
  }

  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.33, 0.64, 0);
    arm.rotation.z = s * 0.08;
    arm.rotation.x = -0.05;
    const el = V(s * 0.04, -0.31, 0.04), wr = V(s * 0.02, -0.6, 0.13);
    arm.add(ball(V(), 0.085, clothLite));
    arm.add(limb(V(), el, 0.075, 0.062, cloth, 14));
    arm.add(ball(el, 0.062, cloth, 1, 1, 1, 12));
    arm.add(limb(el, wr, 0.062, 0.055, cloth, 14));
    const cuffTop = wr.clone().lerp(el, 0.40);
    arm.add(limb(cuffTop, wr, 0.068, 0.064, leather, 14));
    const cuffStud = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.006, 6, 18), metal);
    cuffStud.position.copy(cuffTop);
    cuffStud.quaternion.setFromUnitVectors(UP, wr.clone().sub(el).normalize());
    arm.add(cuffStud);
    const h = hand(clawHand, claw, 1.15);
    h.position.copy(wr);
    h.rotation.x = 0.25;
    arm.add(h);
    for (const [dx, dy] of [[-0.035, -0.14], [0.02, -0.16]]) {
      const rg = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.005, 6, 12), metal);
      rg.position.set(wr.x + dx, wr.y + dy, wr.z + 0.035);
      arm.add(rg);
    }
    if (s < 0) {
      arm.add(ball(V(wr.x, wr.y + 0.02, wr.z + 0.07), 0.034, metal, 1, 1.1, 0.8));
      arm.add(ball(V(wr.x, wr.y + 0.02, wr.z + 0.098), 0.02, skin, 1, 1, 0.6));
    }
    upper.add(arm);
    arms.push(arm);
  }

  root.userData.update = (t) => {
    upper.scale.y = 1 + Math.sin(t * 1.6) * 0.008;
    upper.rotation.z = Math.sin(t * 0.7) * 0.022;
    head.rotation.z = Math.sin(t * 0.5 + 1) * 0.06;
    head.rotation.x = -0.22 + Math.sin(t * 0.9) * 0.025;
    hair.rotation.z = Math.sin(t * 1.3) * 0.01;
    collar.rotation.y = Math.sin(t * 0.4) * 0.02;
    arms[0].rotation.z = -0.08 + Math.sin(t * 0.8) * 0.03;
    arms[1].rotation.z = 0.08 - Math.sin(t * 0.8 + 0.6) * 0.03;
  };
  return finish(root, scale);
}

/* ---------------------------------------------------------------------- Rem */

export function createRem({ scale = 1, hover = 0 } = {}) {
  const R = rng(21);
  const root = new THREE.Group();
  root.name = 'Rem';
  const body = new THREE.Group();
  body.position.y = hover;
  root.add(body);

  const bone = P(0xc4c8cb, { map: speckleTexture('#c4c8cb', { cracks: 26, seed: 5, size: 512 }), roughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const plate = P(0xd8dadd, { roughness: 0.42, clearcoat: 0.15, clearcoatRoughness: 0.4 });
  const deep = M(0x3a3c43, { roughness: 0.9 });
  const voidM = M(0x0c0c10, { roughness: 1 });
  const hairM = M(0x5d6199, { roughness: 0.7 });
  const streak = M(0xdcdcec, { roughness: 0.6 });
  const eyeM = P(0xf0d04a, { roughness: 0.15, emissive: 0x786418, emissiveIntensity: 1.6, clearcoat: 1.0, clearcoatRoughness: 0.1 });

  // pelvis — wider to match stance
  body.add(ball(V(0, 1.18, 0), 0.18, bone, 1.1, 0.55, 0.65));
  body.add(ball(V(0, 1.15, 0.02), 0.14, voidM, 1.1, 0.55, 0.65));

  // long, bent legs with plated shins and big clawed feet — narrower, wider stance
  for (const s of [-1, 1]) {
    const hip = V(s * 0.22, 1.18, 0), knee = V(s * 0.26, 0.62, 0.17), ankle = V(s * 0.27, 0.12, -0.02);
    body.add(ball(hip, 0.045, plate));
    body.add(limb(hip, knee, 0.04, 0.032, bone, 12));
    body.add(plates(hip, knee, 4, 0.055, plate));
    body.add(ball(knee, 0.055, plate, 1, 1, 1, 14));
    body.add(cone(knee, V(0, 0.2, 1), 0.08, 0.028, plate, 8));
    body.add(limb(knee, ankle, 0.035, 0.025, bone, 12));
    body.add(plates(knee, ankle, 5, 0.048, plate));
    body.add(ball(ankle, 0.038, plate, 1, 1, 1, 14));
    const toe = V(s * 0.28, 0.035, 0.3);
    body.add(limb(ankle, toe, 0.03, 0.022, bone, 10));
    for (let i = -1; i <= 1; i++) body.add(cone(V(toe.x + i * 0.05, 0.035, 0.3), V(i * 0.15, -0.25, 1), 0.11, 0.018, plate, 8));
    body.add(cone(ankle, V(0, -0.15, -1), 0.1, 0.025, plate, 8));
  }

  // torso: hunched skeletal ribcage
  const torso = new THREE.Group();
  torso.position.set(0, 1.2, 0);
  torso.rotation.x = 0.4;
  body.add(torso);

  const core = limb(V(0, 0.1, 0), V(0, 0.72, 0), 0.14, 0.18, voidM, 18);
  core.scale.z = 0.75;
  torso.add(core);
  for (let i = 0; i < 13; i++) {
    const t = i / 12;
    torso.add(ball(V(0, 0.04 + t * 0.78, -0.1 - 0.05 * Math.sin(Math.PI * t)), 0.026 + 0.006 * Math.sin(Math.PI * t), plate, 1.2, 0.8, 1, 12));
  }
  for (let i = 0; i < 8; i++) {
    const rx = 0.1 + 0.13 * Math.sin((Math.PI * (i + 0.6)) / 8.6);
    const rib = new THREE.Mesh(new THREE.TorusGeometry(rx, 0.016, 8, 32, Math.PI * 1.6), bone);
    rib.rotation.x = Math.PI / 2;
    const g = new THREE.Group();
    g.add(rib);
    g.rotation.y = -Math.PI * 1.7; // gap faces the back
    g.scale.set(1, 1, 0.75);
    g.position.y = 0.16 + i * 0.075;
    torso.add(g);
  }
  torso.add(limb(V(0, 0.2, 0.15), V(0, 0.72, 0.13), 0.018, 0.014, plate, 6));
  for (const s of [-1, 1]) {
    torso.add(limb(V(s * 0.05, 0.78, 0.05), V(s * 0.3, 0.72, 0), 0.02, 0.02, bone, 6));
    torso.add(ball(V(s * 0.32, 0.7, 0), 0.075, plate, 1, 0.8, 1));
  }

  const collar = new THREE.Group();
  collar.position.set(0, 0.76, -0.02);
  torso.add(collar);
  spikeCollar(collar, plate, R, [
    { y: 0.0, count: 16, radius: 0.16, len: [0.22, 0.55], lift: 0.75, rad: 1.0, r: 0.05 },
    { y: 0.04, count: 14, radius: 0.12, len: [0.18, 0.42], lift: 1.1, rad: 0.6, r: 0.04 },
  ], 0.5);

  // neck + head
  torso.add(limb(V(0, 0.78, 0), V(0, 0.98, 0.1), 0.04, 0.036, bone, 12));
  const head = new THREE.Group();
  head.position.set(0, 1.06, 0.13);
  head.rotation.x = -0.3;
  torso.add(head);

  // cranium — high-poly smooth skull
  head.add(ball(V(), 1, bone, 0.105, 0.15, 0.105, 36));
  // jaw — wider, clearer
  head.add(ball(V(0, -0.105, 0.03), 1, bone, 0.078, 0.065, 0.072, 24));
  // chin
  head.add(ball(V(0, -0.14, 0.05), 0.025, bone, 1, 0.6, 0.8, 12));

  // orbital ridges — strong bony brow around each eye
  for (const s of [-1, 1]) {
    head.add(ball(V(s * 0.045, 0.052, 0.082), 0.022, bone, 1.5, 0.5, 0.7, 12));
    // cheekbone ridge
    head.add(ball(V(s * 0.075, -0.02, 0.07), 0.025, bone, 1.3, 0.5, 0.8, 12));
  }
  // nasal bone
  head.add(ball(V(0, -0.01, 0.1), 0.012, bone, 0.6, 1.6, 0.7, 10));
  // nasal opening
  head.add(ball(V(0, -0.045, 0.098), 0.01, voidM, 1, 0.8, 0.6, 8));

  // eye sockets — deeper, clearer
  for (const s of [-1, 1]) {
    head.add(ball(V(s * 0.045, 0.02, 0.075), 1, voidM, 0.038, 0.052, 0.028, 18));
    // eyeball — brighter, larger
    head.add(ball(V(s * 0.045, 0.02, 0.093), 0.028, eyeM, 1, 1, 1, 20));
    // pupil
    head.add(ball(V(s * 0.045, 0.02, 0.118), 0.01, voidM, 1, 1, 0.5, 12));
    // lower crease
    head.add(ball(V(s * 0.011, -0.04, 0.098), 0.007, voidM, 1, 1.6, 0.6, 10));
  }

  // mouth seam — wider, thicker
  const seam = new THREE.CatmullRomCurve3([V(-0.06, -0.088, 0.078), V(-0.025, -0.095, 0.092), V(0, -0.098, 0.095), V(0.025, -0.095, 0.092), V(0.06, -0.088, 0.078)]);
  head.add(new THREE.Mesh(new THREE.TubeGeometry(seam, 20, 0.006, 6), voidM));
  // teeth / stitches — more, clearer
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 0.014;
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.042, 0.005), voidM);
    st.position.set(x, -0.095, 0.092 - Math.abs(x) * 0.2);
    head.add(st);
  }

  // face light — illuminates Rem's features
  const faceLight = new THREE.PointLight(0xc8d0e8, 0.7, 1.4, 2);
  faceLight.position.set(0, 0.02, 0.2);
  head.add(faceLight);
  // eye glow lights
  for (const s of [-1, 1]) {
    const eyeLight = new THREE.PointLight(0xe6c53a, 0.35, 0.5, 2);
    eyeLight.position.set(s * 0.045, 0.02, 0.13);
    head.add(eyeLight);
  }

  const hair = new THREE.Group();
  head.add(hair);
  for (let i = 0; i < 60; i++) {
    const v = V(R() * 2 - 1, 0.05 + R() * 0.95, R() * 2 - 1).normalize();
    if (v.z > 0.6 && v.y < 0.75) continue;
    const base = V(v.x * 0.105, v.y * 0.15, v.z * 0.105);
    hair.add(cone(base, V(v.x * 1.2, -1, v.z * 0.8 - 0.1), 0.18 + R() * 0.17, 0.022, R() > 0.82 ? streak : hairM, 6));
  }
  for (let i = 0; i < 15; i++) { // bangs draped over her right eye — more strands
    const base = V(-0.09 + i * 0.005, 0.13 - i * 0.003, 0.05 + i * 0.005);
    hair.add(cone(base, V(-0.08 - R() * 0.1, -1, 0.35), 0.26 + R() * 0.08, 0.02, hairM, 6));
  }

  // very long arms
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.32, 0.7, 0);
    const el = V(s * 0.05, -0.5, 0.12), wr = V(s * 0.03, -0.95, 0.22);
    arm.add(limb(V(), el, 0.045, 0.034, bone, 12));
    arm.add(plates(V(), el, 5, 0.06, plate));
    arm.add(ball(el, 0.05, plate, 1, 1, 1, 14));
    arm.add(cone(el, V(0, 0.25, -1), 0.13, 0.032, plate, 8));
    arm.add(limb(el, wr, 0.034, 0.028, bone, 12));
    arm.add(plates(el, wr, 5, 0.052, plate));
    const h = hand(bone, deep, 1.5);
    h.position.copy(wr);
    h.rotation.x = 0.15;
    arm.add(h);
    torso.add(arm);
    arms.push(arm);
  }

  root.userData.update = (t) => {
    body.position.y = hover + 0.012 * (1 + Math.sin(t * 1.1));
    torso.rotation.x = 0.4 + Math.sin(t * 1.1) * 0.015;
    torso.rotation.z = Math.sin(t * 0.6 + 2) * 0.02;
    head.rotation.z = Math.sin(t * 0.7) * 0.03;
    hair.rotation.z = Math.sin(t * 1.1 + 1) * 0.02;
    arms[0].rotation.z = -Math.sin(t * 0.9) * 0.03;
    arms[1].rotation.z = Math.sin(t * 0.9 + 1) * 0.03;
  };
  return finish(root, scale);
}

/* -------------------------------------------------------------- integration */

/**
 * Adds both shinigami to a scene. Adjust the positions to your room layout.
 * Returns { ryuk, rem, update(t) } – call update(elapsedSeconds) every frame.
 */
export function addShinigami(scene, {
  ryukPosition = new THREE.Vector3(-4.2, 0, 3.2),
  remPosition = new THREE.Vector3(-6.4, 0, 1.6),
  ryukRotationY = Math.PI * 0.25,
  remRotationY = Math.PI * 0.35,
  scale = 1,
} = {}) {
  const ryuk = createRyuk({ scale });
  const rem = createRem({ scale, hover: 0 });
  ryuk.position.copy(ryukPosition);
  rem.position.copy(remPosition);
  ryuk.rotation.y = ryukRotationY;
  rem.rotation.y = remRotationY;
  scene.add(ryuk, rem);
  return {
    ryuk,
    rem,
    update(t) {
      ryuk.userData.update(t);
      rem.userData.update(t + 1.7);
    },
  };
}
