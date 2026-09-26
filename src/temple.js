import * as THREE from 'three';
import { createCorruptionMaterial, createEmberMaterial, createMistMaterial } from './shaders.js';

function standard(map, color, roughness = .86, metalness = .04) {
  return new THREE.MeshStandardMaterial({ map, color, roughness, metalness });
}

function shadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function mesh(geometry, material, position, rotation = [0, 0, 0]) {
  const object = shadow(new THREE.Mesh(geometry, material));
  object.position.set(...position);
  object.rotation.set(...rotation);
  return object;
}

function createPillar(material, x, z, broken = false) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const height = broken ? 6.2 : 15.5;
  group.add(mesh(new THREE.CylinderGeometry(1.12, 1.42, .72, 12), material, [0, .36, 0]));
  group.add(mesh(new THREE.CylinderGeometry(.86, 1.02, height, 12), material, [0, .72 + height / 2, 0]));
  group.add(mesh(new THREE.CylinderGeometry(1.24, .94, .8, 12), material, [0, 1.12 + height, 0]));
  if (broken) {
    group.rotation.z = x > 0 ? -.05 : .065;
    const jagged = mesh(new THREE.ConeGeometry(.9, .8, 7), material, [0, height + 1.3, 0], [Math.PI, 0, 0]);
    group.add(jagged);
  }
  return group;
}

function createTorch(material, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const bracket = mesh(new THREE.CylinderGeometry(.08, .11, 1.2, 8), material, [0, 0, 0], [0, 0, Math.PI / 2]);
  group.add(bracket);
  const bowl = mesh(new THREE.CylinderGeometry(.18, .33, .25, 12), material, [x > 0 ? -.65 : .65, .06, 0]);
  group.add(bowl);
  const light = new THREE.PointLight(0xff9a63, 18, 15, 1.6);
  light.position.copy(bowl.position).add(new THREE.Vector3(0, .26, 0));
  group.add(light);
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xff7a32, transparent: true, opacity: .85 });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(.13, .5, 9), flameMaterial);
  flame.position.copy(light.position).add(new THREE.Vector3(0, .14, 0));
  flame.userData.light = light;
  group.add(flame);
  return { group, flame };
}

function createTombGuard(textures, side, corridorZ, wall = 'side') {
  const group = new THREE.Group();
  const wallStone = standard(textures.stone, 0x342d2d, .97, .01);
  const hide = standard(textures.stone, 0x403536, .86, .1);
  const armor = standard(textures.metal, 0x292326, .48, .62);
  const shackle = standard(textures.metal, 0x2a2022, .38, .78);
  if (wall === 'back') {
    group.position.set(side * 12.1, .15, -42.95);
    group.rotation.y = 0;
  } else {
    group.position.set(side * 21.65, .15, corridorZ);
    group.rotation.y = -side * Math.PI / 2;
  }
  group.scale.setScalar(1.12);

  // The backing slab and iron tethers make the creature visibly part of the wall.
  group.add(mesh(new THREE.BoxGeometry(6.2, 10.6, .62), wallStone, [0, 5.25, -.78]));
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.55, .18, 9, 48), shackle);
  halo.position.set(0, 5.8, -.39);
  group.add(halo);
  for (let spoke = 0; spoke < 12; spoke += 1) {
    const angle = spoke * Math.PI / 6;
    const spike = mesh(new THREE.ConeGeometry(.17, 1.05, 5), wallStone, [Math.cos(angle) * 2.78, 5.8 + Math.sin(angle) * 2.78, -.42]);
    spike.rotation.z = -angle + Math.PI / 2;
    group.add(spike);
  }

  const beast = new THREE.Group();
  beast.position.z = 1.25;
  group.add(beast);
  beast.add(mesh(new THREE.CylinderGeometry(1.55, 1.82, .58, 10), wallStone, [0, .29, -.05]));
  for (const legSide of [-1, 1]) {
    const thigh = mesh(new THREE.CylinderGeometry(.48, .62, 2.35, 9), hide, [legSide * .72, 2.15, -.02], [0, 0, legSide * -.12]);
    thigh.scale.z = .82;
    beast.add(thigh);
    beast.add(mesh(new THREE.CylinderGeometry(.4, .5, 1.7, 9), armor, [legSide * .78, .9, .05], [0, 0, legSide * .1]));
  }

  const torso = mesh(new THREE.DodecahedronGeometry(1.55, 1), hide, [0, 5.15, -.02]);
  torso.scale.set(1.18, 1.46, .72);
  beast.add(torso);
  beast.add(mesh(new THREE.ConeGeometry(1.45, 2.3, 7), armor, [0, 4.55, .42], [Math.PI, 0, 0]));
  for (const rib of [-.75, -.38, 0, .38, .75]) {
    const chestRib = mesh(new THREE.TorusGeometry(1.05 - Math.abs(rib) * .25, .09, 7, 22, Math.PI), shackle, [0, 5.2 + rib, .96], [0, 0, Math.PI]);
    chestRib.scale.y = .45;
    beast.add(chestRib);
  }

  for (const armSide of [-1, 1]) {
    const shoulder = mesh(new THREE.IcosahedronGeometry(.82, 1), hide, [armSide * 1.62, 6.05, .03]);
    shoulder.scale.set(1.15, 1, .9);
    beast.add(shoulder);
    beast.add(mesh(new THREE.CylinderGeometry(.52, .68, 2.05, 9), hide, [armSide * 2.15, 5.12, .18], [0, 0, armSide * -.48]));
    beast.add(mesh(new THREE.CylinderGeometry(.42, .58, 2.2, 9), armor, [armSide * 2.55, 3.72, .45], [0, 0, armSide * -.16]));
    const fist = mesh(new THREE.DodecahedronGeometry(.62, 0), hide, [armSide * 2.68, 2.48, .65]);
    fist.scale.set(1, 1.25, .9);
    beast.add(fist);
    for (let claw = -1; claw <= 1; claw += 1) {
      beast.add(mesh(new THREE.ConeGeometry(.1, .7, 5), armor, [armSide * (2.55 + claw * .12), 1.92, .76 + Math.abs(claw) * .08], [0, 0, Math.PI]));
    }
    beast.add(mesh(new THREE.TorusGeometry(.7, .14, 8, 24), shackle, [armSide * 1.72, 6.15, -.2], [Math.PI / 2, 0, 0]));
    beast.add(mesh(new THREE.CylinderGeometry(.09, .09, 2.2, 7), shackle, [armSide * 2.2, 7.05, -.42], [0, 0, armSide * -.46]));
  }

  const head = mesh(new THREE.DodecahedronGeometry(.78, 1), hide, [0, 7.45, .38]);
  head.scale.set(1, .92, .9);
  beast.add(head);
  beast.add(mesh(new THREE.BoxGeometry(.85, .42, .62), armor, [0, 7.05, .86], [.12, 0, 0]));
  for (const hornSide of [-1, 1]) {
    beast.add(mesh(new THREE.ConeGeometry(.24, 1.38, 7), hide, [hornSide * .63, 8.15, .2], [0, 0, hornSide * -.5]));
    beast.add(mesh(new THREE.ConeGeometry(.2, .85, 6), armor, [hornSide * 1.05, 6.82, .12], [0, 0, hornSide * -1.18]));
  }

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff2638 });
  for (const eyeX of [-.25, .25]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.075, 9, 7), eyeMaterial);
    eye.position.set(eyeX, 7.55, 1.05);
    beast.add(eye);
  }
  const eyeGlow = new THREE.PointLight(0xff1d32, 7, 4.5, 2);
  eyeGlow.position.set(0, 7.45, 1.3);
  beast.add(eyeGlow);

  group.traverse((child) => {
    if (child.isMesh) child.userData.label = `Wall-bound tomb guard ${side < 0 ? 'west' : 'east'}`;
  });
  return group;
}

function createWallStatue(textures, side, corridorZ, variant = 0) {
  const group = new THREE.Group();
  const stone = standard(textures.stone, variant % 2 ? 0x51464a : 0x453c40, .96, .015);
  const iron = standard(textures.metal, 0x282125, .43, .66);
  const recess = standard(textures.stone, 0x211c20, .99, 0);
  group.position.set(side * 21.8, .1, corridorZ);
  group.rotation.y = -side * Math.PI / 2;

  group.add(mesh(new THREE.BoxGeometry(3.5, 8.2, .5), recess, [0, 4.1, -.7]));
  const niche = new THREE.Mesh(new THREE.TorusGeometry(1.42, .17, 8, 38, Math.PI), iron);
  niche.position.set(0, 5.45, -.38);
  niche.rotation.z = 0;
  group.add(niche);

  const figure = new THREE.Group();
  figure.position.z = 1.1;
  group.add(figure);
  figure.add(mesh(new THREE.CylinderGeometry(.78, 1.05, .45, 9), stone, [0, .24, 0]));
  figure.add(mesh(new THREE.ConeGeometry(.72, 3.2, 9), stone, [0, 2.05, 0], [0, 0, Math.PI]));
  figure.add(mesh(new THREE.CylinderGeometry(.43, .62, 1.7, 9), stone, [0, 4.03, .03]));
  const head = mesh(new THREE.DodecahedronGeometry(.46, 1), stone, [0, 5.18, .05]);
  head.scale.set(.82, 1.08, .82);
  figure.add(head);

  for (const armSide of [-1, 1]) {
    const arm = mesh(new THREE.CylinderGeometry(.13, .2, 1.75, 7), stone, [armSide * .72, 3.85, .12], [0, 0, armSide * -.56]);
    figure.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), stone);
    hand.position.set(armSide * 1.17, 3.13, .18);
    figure.add(hand);
  }

  for (let crown = -2; crown <= 2; crown += 1) {
    const spike = mesh(new THREE.ConeGeometry(.09, .68 + (2 - Math.abs(crown)) * .12, 5), iron, [crown * .22, 5.82 + (2 - Math.abs(crown)) * .08, 0], [0, 0, crown * -.12]);
    figure.add(spike);
  }

  if (variant % 2) {
    const staff = mesh(new THREE.CylinderGeometry(.055, .075, 4.3, 7), iron, [.95, 2.55, .35], [0, 0, -.08]);
    figure.add(staff);
    figure.add(mesh(new THREE.TorusGeometry(.3, .06, 7, 22), iron, [1.12, 4.68, .35]));
  } else {
    const sigil = new THREE.Mesh(new THREE.TorusGeometry(.38, .065, 7, 24), iron);
    sigil.position.set(0, 3.56, .63);
    figure.add(sigil);
  }

  group.traverse((child) => {
    if (child.isMesh) {
      child.userData.label = 'Entombed temple sentinel';
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
  return group;
}

function reliefLine(points, material, radius = .055) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 7, false), material);
}

function createDoorEngraving(material) {
  const group = new THREE.Group();
  group.position.z = .42;
  const addLine = (points, radius = .075) => group.add(reliefLine(points, material, radius));
  addLine([[0, -5.6], [-1.2, -3.5], [-.4, -1.5], [-1.8, .5], [0, 2.7], [1.8, .5], [.4, -1.5], [1.2, -3.5], [0, -5.6]], .1);
  addLine([[-2.6, 4.8], [-1.4, 5.8], [0, 4.55], [1.4, 5.8], [2.6, 4.8]], .09);
  addLine([[-2.7, 1.5], [-1.4, 2.15], [0, 1.7], [1.4, 2.15], [2.7, 1.5]], .08);
  const eye = new THREE.Mesh(new THREE.TorusGeometry(1.15, .09, 8, 36), material);
  eye.scale.y = .48;
  eye.position.set(0, .1, .02);
  group.add(eye);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 8), material);
  pupil.scale.z = .35;
  pupil.position.set(0, .1, .06);
  group.add(pupil);
  for (let index = 0; index < 4; index += 1) {
    const swirl = new THREE.Mesh(new THREE.TorusGeometry(.55 + index * .16, .055, 7, 28, Math.PI * 1.45), material);
    swirl.position.set(index % 2 ? 2.4 : -2.4, 3.2 - index * 2.2, .01);
    swirl.rotation.z = index * 1.1;
    group.add(swirl);
  }
  group.traverse((child) => { if (child.isMesh) child.userData.templeDoor = true; });
  return group;
}

function createFacadeVines(textures) {
  const group = new THREE.Group();
  const rootMaterial = standard(textures.wood, 0x25191b, .98, 0);
  rootMaterial.emissive = new THREE.Color(0x160307);
  rootMaterial.emissiveIntensity = .6;
  const thornMaterial = standard(textures.metal, 0x36161d, .7, .24);
  for (const side of [-1, 1]) {
    for (let strand = 0; strand < 5; strand += 1) {
      const points = [];
      for (let point = 0; point < 7; point += 1) {
        points.push(new THREE.Vector3(
          side * (5.65 + strand * .48 + Math.sin(point * 1.7 + strand) * .42),
          17.2 - point * (1.8 + strand * .08),
          44.08 + strand * .025,
        ));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 44, .065 + strand * .012, 7, false), rootMaterial));
      for (let thorn = 1; thorn < 6; thorn += 2) {
        const location = points[thorn];
        group.add(mesh(new THREE.ConeGeometry(.07, .48, 5), thornMaterial, [location.x - side * .22, location.y, 44.2], [0, 0, side * 1.1]));
      }
    }
  }
  for (let strand = 0; strand < 4; strand += 1) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-5.2, 17.7 - strand * .18, 44.08),
      new THREE.Vector3(-2.4, 18.2 + Math.sin(strand) * .35, 44.12),
      new THREE.Vector3(.2, 17.55 - strand * .22, 44.16),
      new THREE.Vector3(2.8, 18.05 + Math.cos(strand) * .3, 44.12),
      new THREE.Vector3(5.2, 17.5 - strand * .14, 44.08),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 42, .075, 7, false), rootMaterial));
  }
  return group;
}

function createScarletRelief(textures) {
  const group = new THREE.Group();
  group.position.set(0, 12.2, -43.3);
  group.scale.setScalar(1.78);
  const reliefMaterial = standard(textures.metal, 0x6c181d, .52, .56);
  reliefMaterial.emissive = new THREE.Color(0x260307);
  reliefMaterial.emissiveIntensity = 1.8;
  const darkStone = standard(textures.stone, 0x2a2220, .96, .01);

  const disc = mesh(new THREE.CylinderGeometry(4.3, 4.3, .32, 64), darkStone, [0, 0, -.15], [Math.PI / 2, 0, 0]);
  group.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.78, .18, 10, 72), reliefMaterial);
  ring.position.z = .07;
  group.add(ring);
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(2.98, .075, 8, 72), reliefMaterial);
  innerRing.position.z = .07;
  group.add(innerRing);

  const addRelief = (object) => {
    object.position.z = .08;
    group.add(object);
  };

  const crown = [[-2.1, .72], [-1.35, 2.65], [-.62, 1.48], [0, 3.12], [.62, 1.48], [1.35, 2.65], [2.1, .72]];
  addRelief(reliefLine(crown, reliefMaterial, .085));
  addRelief(reliefLine([[-1.03, .55], [-.65, -.15], [-.48, -1.25], [0, -2.18], [.48, -1.25], [.65, -.15], [1.03, .55]], reliefMaterial, .075));
  addRelief(reliefLine([[-.72, .12], [-.28, -.06], [0, .08], [.28, -.06], [.72, .12]], reliefMaterial, .055));

  for (let i = 0; i < 12; i += 1) {
    const angle = i * Math.PI / 6;
    const x1 = Math.cos(angle) * 3.1;
    const y1 = Math.sin(angle) * 3.1;
    const x2 = Math.cos(angle + .17) * 3.63;
    const y2 = Math.sin(angle + .17) * 3.63;
    addRelief(reliefLine([[x1, y1], [x2, y2]], reliefMaterial, .04));
  }

  const glow = new THREE.PointLight(0xba2f27, 54, 22, 1.5);
  glow.position.set(0, 0, 2.2);
  group.add(glow);
  return group;
}

function createEmbers(material) {
  const count = 260;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.2 + Math.random() * 7.2;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.random() * .45;
    positions[i * 3 + 2] = Math.sin(angle) * radius - .3;
    color.set(Math.random() > .72 ? 0xff8b42 : 0xbd1025);
    colors.set([color.r, color.g, color.b], i * 3);
    scales[i] = Math.random();
    phases[i] = Math.random() * 5.2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  return new THREE.Points(geometry, material);
}

function createDebris(material) {
  const group = new THREE.Group();
  const random = (() => { let value = 994; return () => ((value = value * 16807 % 2147483647) - 1) / 2147483646; })();
  for (let i = 0; i < 48; i += 1) {
    const side = random() > .5 ? 1 : -1;
    const geometry = i % 5 === 0
      ? new THREE.CylinderGeometry(.16 + random() * .18, .25 + random() * .22, .5 + random(), 6)
      : new THREE.DodecahedronGeometry(.12 + random() * .36, 0);
    const chunk = mesh(geometry, material, [side * (11 + random() * 8.5), .12 + random() * .35, -37 + random() * 74], [random() * Math.PI, random() * Math.PI, random() * Math.PI]);
    group.add(chunk);
  }
  return group;
}

export function buildTemple(scene, textures) {
  const root = new THREE.Group();
  scene.add(root);

  const stone = standard(textures.stone, 0x978a80, .88, .02);
  const darkStone = standard(textures.stone, 0x625750, .94, .01);
  const floorMaterial = standard(textures.floor, 0xa79383, .8, .03);
  const metal = standard(textures.metal, 0x79675d, .45, .63);
  const wood = standard(textures.wood, 0x8a4c3b, .72, .05);
  const doorMaterial = standard(textures.door, 0x88786d, .68, .2);

  const floor = mesh(new THREE.PlaneGeometry(46, 88), floorMaterial, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  root.add(floor);
  root.add(mesh(new THREE.BoxGeometry(1.4, 22, 88), stone, [-23, 11, 0]));
  root.add(mesh(new THREE.BoxGeometry(1.4, 22, 88), stone, [23, 11, 0]));
  root.add(mesh(new THREE.BoxGeometry(46, 22, 1.4), stone, [0, 11, -44]));
  root.add(mesh(new THREE.BoxGeometry(46, .9, 88), darkStone, [0, 22, 0]));

  for (let z = 33; z >= -33; z -= 11) {
    root.add(createPillar(stone, -19.3, z, z === 0));
    root.add(createPillar(stone, 19.3, z, z === -11));
    const rib = new THREE.Mesh(new THREE.TorusGeometry(19.3, .36, 9, 64, Math.PI), stone);
    rib.position.set(0, 11.2, z);
    rib.scale.y = .55;
    root.add(rib);
  }

  const statueBays = [27.5, 16.5, -16.5, -27.5];
  for (const side of [-1, 1]) {
    statueBays.forEach((z, index) => root.add(createWallStatue(textures, side, z, index)));
  }

  root.add(createDebris(darkStone));

  const platform = new THREE.Group();
  platform.position.set(0, 0, 0);
  platform.add(mesh(new THREE.CylinderGeometry(8.8, 9.6, .58, 16), darkStone, [0, .29, 0]));
  platform.add(mesh(new THREE.CylinderGeometry(7.6, 8.35, .55, 16), stone, [0, .83, 0]));
  platform.add(mesh(new THREE.CylinderGeometry(6.5, 7.1, .48, 16), darkStone, [0, 1.35, 0]));
  const runeBand = new THREE.Mesh(new THREE.TorusGeometry(8.05, .1, 8, 96), new THREE.MeshBasicMaterial({ color: 0x6d1518 }));
  runeBand.rotation.x = Math.PI / 2;
  runeBand.position.y = 1.13;
  platform.add(runeBand);
  root.add(platform);

  const altar = new THREE.Group();
  altar.position.set(0, 1.62, 0);
  altar.add(mesh(new THREE.BoxGeometry(7.7, .58, 5.25), wood, [0, 2.65, 0]));
  altar.add(mesh(new THREE.BoxGeometry(7.1, .28, 4.7), metal, [0, 3.07, 0]));
  for (const x of [-3.05, 3.05]) {
    for (const z of [-1.9, 1.9]) altar.add(mesh(new THREE.CylinderGeometry(.38, .55, 4.8, 8), darkStone, [x, .2, z]));
  }
  const frontRelief = new THREE.Mesh(new THREE.TorusGeometry(1.08, .14, 7, 42), metal);
  frontRelief.position.set(0, 1, 2.7);
  altar.add(frontRelief);
  root.add(altar);

  // A full exterior facade frames one monumental, inward-opening door.
  const courtyardMaterial = standard(textures.floor, 0x4c5047, .96, .01);
  root.add(mesh(new THREE.PlaneGeometry(46, 24), courtyardMaterial, [0, -.035, 54], [-Math.PI / 2, 0, 0]));
  root.add(mesh(new THREE.BoxGeometry(17.5, 22, 2.2), darkStone, [-14.25, 11, 42.3]));
  root.add(mesh(new THREE.BoxGeometry(17.5, 22, 2.2), darkStone, [14.25, 11, 42.3]));
  root.add(mesh(new THREE.BoxGeometry(11, 5.1, 2.2), darkStone, [0, 19.45, 42.3]));

  const frameStone = standard(textures.stone, 0x74645f, .91, .03);
  root.add(mesh(new THREE.BoxGeometry(1.05, 18, 1.45), frameStone, [-5.55, 9, 43.15]));
  root.add(mesh(new THREE.BoxGeometry(1.05, 18, 1.45), frameStone, [5.55, 9, 43.15]));
  root.add(mesh(new THREE.BoxGeometry(12.1, 1.15, 1.45), frameStone, [0, 17.45, 43.15]));
  root.add(mesh(new THREE.BoxGeometry(13.25, .56, 2.5), frameStone, [0, .28, 45.25]));
  root.add(mesh(new THREE.BoxGeometry(15.5, .5, 3.4), darkStone, [0, .25, 47.55]));
  root.add(mesh(new THREE.BoxGeometry(18, .44, 4.2), frameStone, [0, .22, 50.35]));

  const door = new THREE.Group();
  door.position.set(-5, .58, 42.95);
  const doorPanel = mesh(new THREE.BoxGeometry(10, 16, .72), doorMaterial, [5, 8, 0]);
  doorPanel.userData.templeDoor = true;
  const reliefDoorMaterial = standard(textures.entranceRelief, 0x5a4a50, .86, .07);
  reliefDoorMaterial.bumpMap = textures.entranceRelief;
  reliefDoorMaterial.bumpScale = .085;
  reliefDoorMaterial.emissive = new THREE.Color(0x180609);
  reliefDoorMaterial.emissiveIntensity = .38;
  const reliefPanel = mesh(new THREE.PlaneGeometry(9.15, 15.15), reliefDoorMaterial, [0, 0, .375]);
  reliefPanel.userData.templeDoor = true;
  doorPanel.add(reliefPanel);
  door.add(doorPanel);
  root.add(door);

  root.add(createPillar(frameStone, -9.1, 43.2));
  root.add(createPillar(frameStone, 9.1, 43.2));
  root.add(createFacadeVines(textures));

  const exteriorLeftTorch = createTorch(metal, -7.1, 5.2, 44.2);
  const exteriorRightTorch = createTorch(metal, 7.1, 5.2, 44.2);
  root.add(exteriorLeftTorch.group, exteriorRightTorch.group);

  const entranceRuneMaterial = new THREE.MeshStandardMaterial({ color: 0x39272b, emissive: 0x28030a, emissiveIntensity: .28, roughness: .88, metalness: .06 });
  const skullMaterial = standard(textures.stone, 0x493d40, .96, .01);
  const voidMaterial = new THREE.MeshBasicMaterial({ color: 0x090406 });
  for (const side of [-1, 1]) {
    const rune = new THREE.Mesh(new THREE.TorusGeometry(2.25, .12, 8, 48), entranceRuneMaterial);
    rune.position.set(side * 13.2, 9.2, 43.48);
    rune.scale.y = 1.3;
    root.add(rune);
    for (let mark = 0; mark < 8; mark += 1) {
      const angle = mark * Math.PI / 4;
      const glyph = mesh(new THREE.BoxGeometry(.12, .72, .12), entranceRuneMaterial, [side * 13.2 + Math.cos(angle) * 2.7, 9.2 + Math.sin(angle) * 3.45, 43.5], [0, 0, -angle]);
      root.add(glyph);
    }
    const skull = mesh(new THREE.SphereGeometry(.68, 12, 9), skullMaterial, [side * 13.2, 9.38, 43.68]);
    skull.scale.set(.74, .9, .42);
    root.add(skull);
    for (const eyeOffset of [-.22, .22]) {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(.115, 8, 6), voidMaterial);
      socket.position.set(side * 13.2 + eyeOffset, 9.49, 43.99);
      socket.scale.set(1, 1.18, .3);
      root.add(socket);
    }
    const nose = mesh(new THREE.ConeGeometry(.1, .25, 3), voidMaterial, [side * 13.2, 9.13, 44], [0, 0, Math.PI]);
    root.add(nose);
    const jaw = mesh(new THREE.BoxGeometry(.52, .4, .3), skullMaterial, [side * 13.2, 8.82, 43.78]);
    jaw.scale.x = .82;
    root.add(jaw);
    for (let tooth = -2; tooth <= 2; tooth += 1) {
      root.add(mesh(new THREE.BoxGeometry(.025, .19, .035), voidMaterial, [side * 13.2 + tooth * .075, 8.84, 43.95]));
    }
  }
  for (let index = 0; index < 22; index += 1) {
    const side = index % 2 ? -1 : 1;
    const stoneChunk = mesh(
      new THREE.DodecahedronGeometry(.16 + (index % 5) * .08, 0),
      darkStone,
      [side * (5.8 + (index % 7) * 1.65), .13 + (index % 3) * .08, 45.5 + (index % 6) * 1.55],
      [index * .73, index * .41, index * .29],
    );
    root.add(stoneChunk);
  }

  root.add(createTombGuard(textures, -1, 7));
  root.add(createTombGuard(textures, 1, 7));
  root.add(createTombGuard(textures, -1, -43, 'back'));
  root.add(createTombGuard(textures, 1, -43, 'back'));
  root.add(createScarletRelief(textures));

  const corruptionMaterials = [createCorruptionMaterial(), createCorruptionMaterial()];
  const floorSigil = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), corruptionMaterials[0]);
  floorSigil.rotation.x = -Math.PI / 2;
  floorSigil.position.set(0, 1.64, 0);
  root.add(floorSigil);
  const wallSigil = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), corruptionMaterials[1]);
  wallSigil.position.set(0, 12.2, -43.2);
  root.add(wallSigil);

  const emberMaterial = createEmberMaterial();
  const embers = createEmbers(emberMaterial);
  embers.position.set(0, 2.1, 0);
  root.add(embers);

  const mistMaterials = [createMistMaterial(), createMistMaterial(), createMistMaterial(), createMistMaterial()];
  const mistPlanes = mistMaterials.map((material, index) => {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(42, 8), material);
    mist.rotation.x = -Math.PI / 2;
    mist.position.set(0, .2 + index * .04, -26 + index * 26);
    root.add(mist);
    return mist;
  });

  const torches = [exteriorLeftTorch, exteriorRightTorch];
  for (const z of [32, 18, 4, -10, -24, -37]) {
    const left = createTorch(metal, -22.25, 9, z);
    const right = createTorch(metal, 22.25, 9, z);
    root.add(left.group, right.group);
    torches.push(left, right);
  }

  scene.add(new THREE.AmbientLight(0xffeee1, 1.65));
  scene.add(new THREE.HemisphereLight(0xd7e3ff, 0x6b3b2d, 1.5));
  const entranceLight = new THREE.SpotLight(0xf0c2aa, 105, 48, .72, .58, 1.15);
  entranceLight.position.set(0, 18, 62);
  entranceLight.target.position.set(0, 9, 42.5);
  scene.add(entranceLight, entranceLight.target);
  const entranceCorruption = new THREE.PointLight(0xb70c25, 55, 25, 1.7);
  entranceCorruption.position.set(0, 3.2, 53);
  scene.add(entranceCorruption);
  const moon = new THREE.DirectionalLight(0xd9e3ff, 2.15);
  moon.position.set(-16, 28, 20);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -28;
  moon.shadow.camera.right = 28;
  moon.shadow.camera.top = 30;
  moon.shadow.camera.bottom = -30;
  scene.add(moon);

  for (const side of [-1, 1]) {
    const sideLight = new THREE.SpotLight(0xff8f85, 72, 25, .48, .72, 1.4);
    sideLight.position.set(side * 12, 14, 9);
    sideLight.target.position.set(side * 21.3, 5.5, 7);
    scene.add(sideLight, sideLight.target);

    const backLight = new THREE.SpotLight(0xff8f85, 64, 25, .45, .72, 1.4);
    backLight.position.set(side * 8, 14, -31);
    backLight.target.position.set(side * 12.1, 5.5, -42);
    scene.add(backLight, backLight.target);
  }

  const reliefLight = new THREE.SpotLight(0xdde4f2, 115, 46, .52, .7, 1.35);
  reliefLight.position.set(0, 19, -18);
  reliefLight.target.position.set(0, 12.2, -43.3);
  scene.add(reliefLight, reliefLight.target);

  const bookSpot = new THREE.SpotLight(0xfff3df, 125, 38, .55, .65, 1.2);
  bookSpot.position.set(0, 19, 8);
  bookSpot.target.position.set(0, 5.4, 0);
  bookSpot.castShadow = true;
  bookSpot.shadow.mapSize.set(1024, 1024);
  scene.add(bookSpot, bookSpot.target);

  const orbitLight = new THREE.PointLight(0xff4935, 45, 23, 1.5);
  orbitLight.castShadow = false;
  scene.add(orbitLight);
  const orbitOrb = new THREE.Mesh(new THREE.SphereGeometry(.08, 9, 7), new THREE.MeshBasicMaterial({ color: 0xff4a2d }));
  scene.add(orbitOrb);

  let doorTarget = 0;
  let doorProgress = 0;
  let doorOpenedAt = null;
  function openDoors() { doorTarget = 1; }

  function update(time, delta) {
    if (doorTarget && doorOpenedAt === null) doorOpenedAt = time;
    if (doorOpenedAt !== null) doorProgress = THREE.MathUtils.clamp((time - doorOpenedAt) / 4.8, 0, 1);
    const eased = doorProgress * doorProgress * (3 - 2 * doorProgress);
    door.rotation.y = eased * 1.48;

    corruptionMaterials.forEach((material, index) => {
      material.uniforms.uTime.value = time + index * 2.1;
      material.uniforms.uIntensity.value = .67 + Math.sin(time * 1.7 + index) * .11;
    });
    emberMaterial.uniforms.uTime.value = time;
    mistMaterials.forEach((material, index) => { material.uniforms.uTime.value = time + index * 4; });
    torches.forEach(({ flame }, index) => {
      const pulse = 1 + Math.sin(time * 8.4 + index * 2.4) * .16 + Math.sin(time * 13.1 + index) * .08;
      flame.scale.set(pulse, pulse * 1.18, pulse);
      flame.position.y += Math.sin(time * 7 + index) * .0005;
      flame.userData.light.intensity = 17 * pulse;
    });
    const angle = time * .58;
    orbitLight.position.set(Math.cos(angle) * 7.6, 7.2 + Math.sin(time * 1.2) * .85, Math.sin(angle) * 7.6);
    orbitOrb.position.copy(orbitLight.position);
    runeBand.material.color.setHSL(.985, .76, .15 + Math.sin(time * 2.1) * .025);
  }

  return { root, update, openDoors, doorInteractables: [doorPanel], get doorProgress() { return doorProgress; } };
}
