import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createAlcoveShader } from './shaders.js';
import { makeBookSpineTexture, makeFabricTexture, makeWoodTexture } from './textures.js';

const ROOM = Object.freeze({ halfWidth: 12, halfDepth: 9, height: 7.2 });
const COLORS = Object.freeze({ green: '#285a36', greenDark: '#173a23', trim: '#493529', metal: '#6e7772' });
const bookMaterialCache = new Map();

function standard(color, roughness = .72, metalness = .02, map = null, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, map, ...extra });
}

function box(parent, size, position, mat, radius = 0, rotation = null, shadows = true) {
  const geometry = radius
    ? new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(radius, ...size.map((v) => v / 2)))
    : new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radius, height, position, mat, segments = 18, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), mat);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function getBookMaterial(index) {
  const labels = ['LAW', 'LOGIC', 'JUSTICE', 'HISTORY', 'TOKYO', 'STUDY'];
  const colors = ['#171b18', '#e0ddd1', '#743229', '#263c4c', '#af955b', '#3b3d39'];
  const key = index % colors.length;
  if (!bookMaterialCache.has(key)) {
    bookMaterialCache.set(key, standard('#ffffff', .88, 0, makeBookSpineTexture(labels[key], colors[key])));
  }
  return bookMaterialCache.get(key);
}

function booksX(parent, x, y, z, width, count = 14, seed = 0, depth = .22) {
  let cursor = x - width / 2;
  for (let i = 0; i < count; i += 1) {
    const w = .13 + ((i * 7 + seed) % 7) * .018;
    if (cursor + w > x + width / 2) break;
    const h = .61 + ((i * 13 + seed) % 6) * .055;
    const mesh = box(parent, [w, h, depth], [cursor + w / 2, y + h / 2, z], getBookMaterial(i + seed), 0, null, false);
    mesh.rotation.z = (i + seed) % 11 === 0 ? -.06 : 0;
    cursor += w + .025;
  }
}

function booksZ(parent, x, y, z, width, count = 14, seed = 0, heightScale = 1, depth = .22) {
  let cursor = z - width / 2;
  for (let i = 0; i < count; i += 1) {
    const w = .13 + ((i * 7 + seed) % 7) * .018;
    if (cursor + w > z + width / 2) break;
    const h = (.61 + ((i * 13 + seed) % 6) * .055) * heightScale;
    const mesh = box(parent, [depth, h, w], [x, y + h / 2, cursor + w / 2], getBookMaterial(i + seed), 0, null, false);
    mesh.rotation.x = (i + seed) % 11 === 0 ? -.045 : 0;
    cursor += w + .025;
  }
}

function knob(parent, position, rotation = null) {
  return cylinder(parent, .055, .08, position, standard(COLORS.metal, .22, .75), 14, rotation ?? [Math.PI / 2, 0, 0]);
}

function createShell(scene) {
  const wall = standard('#d7dad2', .96, 0, null, { side: THREE.DoubleSide });
  const wood = standard('#ffffff', .76, 0, makeWoodTexture());
  const trim = standard(COLORS.trim, .8);
  box(scene, [24, .18, 18], [0, -.09, 0], wood);
  box(scene, [24, 7.2, .24], [0, 3.58, -9], wall);
  box(scene, [24, 7.2, .24], [0, 3.58, 9], wall);
  box(scene, [.24, 7.2, 18], [-12, 3.58, 0], wall);
  box(scene, [.24, 7.2, 18], [12, 3.58, 0], wall);
  box(scene, [24, .18, 18], [0, 7.2, 0], standard('#c8cbc4', .98, 0, null, { side: THREE.DoubleSide }));
  box(scene, [23.8, .13, .13], [0, .1, -8.82], trim);
  box(scene, [23.8, .13, .13], [0, .1, 8.82], trim);
  box(scene, [.13, .13, 17.7], [-11.82, .1, 0], trim);
  box(scene, [.13, .13, 17.7], [11.82, .1, 0], trim);
}

function createNorthWall(scene, alcoveMaterial) {
  const group = new THREE.Group();
  group.name = 'North wall — bed, alcove, shelves and cupboards';
  scene.add(group);
  const paint = standard(COLORS.green, .68);
  const dark = standard(COLORS.greenDark, .8);
  const wood = standard('#674a36', .78);
  const mattress = standard('#949690', .92);
  const blueFabric = standard('#ffffff', .92, 0, makeFabricTexture('#0b4665'));

  for (const centerX of [-5.15, 5.15]) {
    box(group, [5.45, 5.45, .42], [centerX, 2.83, -8.7], dark);
    box(group, [.12, 5.45, .62], [centerX - 2.72, 2.83, -8.48], paint);
    box(group, [.12, 5.45, .62], [centerX + 2.72, 2.83, -8.48], paint);
    for (let row = 0; row < 5; row += 1) {
      const shelfY = .16 + row * 1.05;
      box(group, [5.42, .12, .62], [centerX, shelfY, -8.48], paint);
      booksX(group, centerX, shelfY + .06, -8.29, 5.06, 27, row + (centerX > 0 ? 30 : 10));
    }
    box(group, [5.42, .12, .62], [centerX, 5.43, -8.48], paint);
  }

  const alcove = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.45), alcoveMaterial);
  alcove.position.set(0, 3.28, -8.73);
  group.add(alcove);
  box(group, [.15, 4.6, .65], [-2.42, 3.25, -8.45], paint);
  box(group, [.15, 4.6, .65], [2.42, 3.25, -8.45], paint);
  box(group, [4.82, .15, .65], [0, 5.55, -8.45], paint);
  box(group, [4.8, .18, .72], [0, 1.05, -8.42], paint, .025);

  const cupboardWidth = 3.9;
  for (let i = 0; i < 4; i += 1) {
    const x = -5.93 + i * 3.95;
    box(group, [cupboardWidth, 1.25, .58], [x, 6.34, -8.48], paint, .018);
    box(group, [cupboardWidth - .1, 1.13, .03], [x, 6.34, -8.16], standard('#2b5e39', .65), .012);
    knob(group, [x + (i % 2 ? -.76 : .76), 6.15, -8.1]);
  }

  box(group, [4.65, .72, 6.35], [0, .41, -5.0], wood, .08);
  box(group, [4.35, .5, 6.02], [0, .98, -5.08], mattress, .17);
  box(group, [4.08, .13, 4.72], [0, 1.31, -4.38], blueFabric, .1);
  box(group, [4.05, .24, 1.02], [0, 1.42, -6.35], blueFabric, .14, [-.055, 0, 0]);
  box(group, [1.85, .28, .9], [0, 1.43, -7.42], blueFabric, .2, [-.04, 0, 0]);
  for (let x = -1.5; x <= 1.5; x += .75) box(group, [.018, .018, 4.35], [x, 1.385, -4.35], standard('#092f45', .9), 0, null, false);
  for (let z = -6.0; z <= -2.6; z += .68) box(group, [3.95, .018, .018], [0, 1.39, z], standard('#092f45', .9), 0, null, false);
}

function createScreen(parent, texture, position, size, kind = 'monitor') {
  const black = standard('#0a0c0b', .48, .18);
  if (kind === 'tv') {
    const body = box(
      parent,
      [1.28, size[1] + .34, size[0] + .38],
      [position[0] - .42, position[1], position[2]],
      black,
      .14,
    );
    box(
      parent,
      [.52, size[1] * .7, size[0] * .72],
      [position[0] - 1.16, position[1] + .02, position[2]],
      standard('#111513', .58, .12),
      .12,
    );
    const bezel = box(
      parent,
      [.11, size[1] + .18, size[0] + .22],
      [position[0] + .225, position[1], position[2]],
      black,
      .07,
    );
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0], size[1]),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    screen.rotation.y = Math.PI / 2;
    screen.position.set(position[0] + .286, position[1] + .015, position[2]);
    parent.add(screen);
    const led = new THREE.Mesh(new THREE.SphereGeometry(.028, 10, 8), new THREE.MeshBasicMaterial({ color: '#5aff78', toneMapped: false }));
    led.position.set(position[0] + .295, position[1] - size[1] / 2 + .07, position[2] - size[0] * .23);
    parent.add(led);
    for (let slot = -2; slot <= 2; slot += 1) {
      box(parent, [.015, .025, .085], [position[0] + .294, position[1] - size[1] / 2 + .07, position[2] + size[0] * .31 + slot * .105], standard('#252a27', .6), .006, null, false);
    }
    return body ?? bezel;
  }

  const frame = box(parent, [.17, size[1] + .17, size[0] + .17], position, black, .055);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  screen.rotation.y = Math.PI / 2;
  screen.position.set(position[0] + .091, position[1], position[2]);
  parent.add(screen);
  box(parent, [.08, .5, .12], [position[0] - .01, position[1] - size[1] / 2 - .29, position[2]], black);
  box(parent, [.5, .06, .72], [position[0] + .04, position[1] - size[1] / 2 - .54, position[2]], black, .025);
  return frame;
}

function createChair(scene) {
  const group = new THREE.Group();
  group.name = 'Desk chair';
  scene.add(group);
  const upholstery = standard('#0a0b0a', .68);
  const frame = standard('#151816', .32, .36);
  const chairX = -7.55;
  box(group, [1.18, .17, 1.42], [chairX, 1.08, -4.9], upholstery, .16);
  box(group, [.18, 1.48, 1.38], [chairX + .65, 1.92, -4.9], upholstery, .18, [0, 0, -.1]);
  cylinder(group, .08, .78, [chairX, .6, -4.9], frame, 16);
  for (let i = 0; i < 5; i += 1) {
    const angle = i / 5 * Math.PI * 2;
    const leg = box(group, [.62, .06, .08], [chairX + Math.cos(angle) * .28, .2, -4.9 + Math.sin(angle) * .28], frame, .025);
    leg.rotation.y = -angle;
    cylinder(group, .07, .08, [chairX + Math.cos(angle) * .61, .11, -4.9 + Math.sin(angle) * .61], frame, 12, [0, 0, Math.PI / 2]);
  }
}

function createKeyboard(group) {
  const body = standard('#b4bbb7', .4, .16);
  const keys = standard('#e2e5e2', .5, .03);
  const darkKeys = standard('#c8ceca', .54, .03);
  const legends = standard('#555d59', .74);
  box(group, [1.08, .075, 3.18], [-10.0, 2.27, -4.52], body, .065, [0, 0, -.016]);

  const unit = .105;
  const gap = .016;
  const keyDepth = .105;
  const keyWidth = (units) => unit * units + gap * (units - 1);
  const addKey = (x, z, units = 1, material = keys) => {
    const width = keyWidth(units);
    const mirroredZ = -9.04 - (z + width / 2);
    box(group, [keyDepth, .035, width], [x, 2.332, mirroredZ], material, .016, null, false);
    if (units >= 1.5) box(group, [.014, .006, Math.min(.055, width * .24)], [x + .006, 2.353, mirroredZ], legends, .004, null, false);
    return width;
  };
  const layoutRow = (x, entries, startZ = -6.02) => {
    let cursor = startZ;
    entries.forEach((entry) => {
      if (entry === 'gap') {
        cursor += .075;
        return;
      }
      const width = addKey(x, cursor, entry, entry > 1 ? darkKeys : keys);
      cursor += width + gap;
    });
  };

  layoutRow(-10.42, [1, 'gap', 1, 1, 1, 1, 'gap', 1, 1, 1, 1, 'gap', 1, 1, 1, 1]);
  layoutRow(-10.25, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2]);
  layoutRow(-10.1, [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5]);
  layoutRow(-9.95, [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25]);
  layoutRow(-9.8, [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75]);
  layoutRow(-9.65, [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25]);

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 3; col += 1) addKey(-10.25 + row * .15, -4.03 + col * .121, 1, darkKeys);
    if (row < 4) {
      for (let col = 0; col < 4; col += 1) addKey(-10.25 + row * .15, -3.52 + col * .121, 1, keys);
    } else {
      const zeroWidth = addKey(-10.25 + row * .15, -3.52, 2, darkKeys);
      addKey(-10.25 + row * .15, -3.52 + zeroWidth + gap, 1, keys);
      addKey(-10.25 + row * .15, -3.52 + zeroWidth + gap + unit + gap, 1, darkKeys);
    }
  }
  for (let led = 0; led < 3; led += 1) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), new THREE.MeshBasicMaterial({ color: led === 0 ? '#77e899' : '#8d9791', toneMapped: false }));
    dot.position.set(-10.42, 2.34, -5.91 - led * .06);
    group.add(dot);
  }
}

function createMouse(group) {
  const pale = standard('#d6dbd7', .34, .08);
  const dark = standard('#202522', .46, .12);
  const chrome = standard(COLORS.metal, .2, .72);
  box(group, [1.08, .035, .76], [-9.95, 2.245, -6.62], standard('#111412', .58), .045);
  const mouse = new THREE.Group();
  mouse.position.set(-9.92, 2.29, -6.62);
  group.add(mouse);
  box(mouse, [.52, .075, .35], [0, .025, 0], dark, .13);
  box(mouse, [.4, .145, .3], [.035, .105, 0], pale, .13, [0, 0, .04]);
  box(mouse, [.23, .035, .135], [-.145, .185, -.076], pale, .045, [0, 0, -.035]);
  box(mouse, [.23, .035, .135], [-.145, .185, .076], pale, .045, [0, 0, -.035]);
  box(mouse, [.25, .018, .012], [-.12, .207, 0], dark, .006, null, false);
  cylinder(mouse, .032, .078, [-.1, .225, 0], chrome, 14, [Math.PI / 2, 0, 0]);
  box(mouse, [.24, .045, .09], [.045, .065, .19], dark, .035);
  const sideWheel = cylinder(mouse, .026, .045, [.055, .15, .165], chrome, 12, [Math.PI / 2, 0, 0]);
  sideWheel.rotation.z = .35;
}

function createFruitBowl(group) {
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#e7f3ee', transparent: true, opacity: .38, roughness: .08, metalness: .02,
    transmission: .62, thickness: .05, side: THREE.DoubleSide,
  });
  const center = new THREE.Vector3(-9.75, 2.22, -.98);
  const profile = [
    new THREE.Vector2(.14, .04), new THREE.Vector2(.27, .07), new THREE.Vector2(.4, .18),
    new THREE.Vector2(.48, .36), new THREE.Vector2(.5, .46),
  ];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), glass);
  bowl.position.copy(center);
  bowl.castShadow = true;
  group.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.5, .018, 10, 36), glass);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(center.x, center.y + .46, center.z);
  group.add(rim);
  cylinder(group, .17, .035, [center.x, center.y + .02, center.z], glass, 28);

  const apples = [
    [-.18, .31, -.16, '#ae2f27'], [.13, .3, -.15, '#8aa340'], [.2, .32, .14, '#b73329'],
    [-.16, .33, .15, '#c53b30'], [0, .51, .02, '#a92d25'],
  ];
  apples.forEach(([x, y, z, color], index) => {
    const apple = new THREE.Mesh(new THREE.SphereGeometry(.17, 22, 16), standard(color, .46));
    apple.scale.set(1, .9, 1);
    apple.position.set(center.x + x, center.y + y, center.z + z);
    apple.castShadow = true;
    group.add(apple);
    cylinder(group, .014, .11, [center.x + x - .015, center.y + y + .16, center.z + z], standard('#4b321c', .82), 8, [0, 0, index % 2 ? .2 : -.16]);
    if (index === 4 || index === 1) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), standard('#456d2d', .7));
      leaf.scale.set(1.2, .18, .62);
      leaf.position.set(center.x + x + .045, center.y + y + .18, center.z + z + .035);
      leaf.rotation.y = index === 4 ? .7 : -.45;
      group.add(leaf);
    }
  });
}

function createDeskAccessories(scene, group) {
  const paint = standard(COLORS.green, .6);
  const dark = standard('#0b0d0c', .5, .12);
  const chrome = standard(COLORS.metal, .22, .72);

  createKeyboard(group);
  createMouse(group);

  const lamp = new THREE.Group();
  lamp.position.set(-10.65, 2.24, -8.02);
  group.add(lamp);
  cylinder(lamp, .25, .07, [0, 0, 0], dark);
  cylinder(lamp, .035, .82, [0, .4, 0], chrome, 12);
  cylinder(lamp, .045, .72, [.26, .84, 0], chrome, 12, [0, 0, -1.02]);
  cylinder(lamp, .17, .38, [.56, 1.07, 0], dark, 18, [0, 0, 1.1]);
  const deskLight = new THREE.SpotLight('#eff8e8', 12, 5, .52, .68, 1.5);
  deskLight.position.set(-9.98, 3.3, -8.0);
  deskLight.target.position.set(-10.42, 2.1, -7.0);
  deskLight.castShadow = true;
  scene.add(deskLight, deskLight.target);

  const penCup = cylinder(group, .17, .42, [-10.65, 2.42, -1.68], standard('#777d79', .46, .15), 22);
  penCup.material.side = THREE.DoubleSide;
  for (let i = 0; i < 5; i += 1) cylinder(group, .018, .58, [-10.65 + (i - 2) * .04, 2.75 + (i % 2) * .05, -1.68 + (i % 3) * .025], standard(i % 2 ? '#d7b343' : '#474d49', .5), 8);
  createFruitBowl(group);
  return paint;
}

function createWestWall(scene, screenTexture) {
  const group = new THREE.Group();
  group.name = 'West wall — desk, TV cabinet and balcony';
  scene.add(group);
  const paint = standard(COLORS.green, .65);
  const darkGreen = standard(COLORS.greenDark, .79);
  const black = standard('#0a0c0b', .5, .15);
  const chrome = standard(COLORS.metal, .22, .72);

  // Facing west: balcony is on the left, with the TV cabinet and desk continuing tightly to the right.
  const deskCenterZ = -4.65;
  const deskLength = 8.4;
  // Keep the rear edge against the wall and grow the desk in the arrowed direction: into the room.
  box(group, [3.25, .18, deskLength], [-10.33, 2.13, deskCenterZ], paint, .045);
  for (const drawerZ of [-7.92, -1.38]) {
    box(group, [2.78, 1.95, 1.5], [-10.5, 1.08, drawerZ], darkGreen);
    for (let i = 0; i < 3; i += 1) {
      box(group, [2.66, .48, 1.38], [-10.43, 1.68 - i * .53, drawerZ], paint, .025);
      box(group, [.08, .05, .62], [-9.05, 1.68 - i * .53, drawerZ], chrome, .018);
    }
  }

  box(group, [.34, 3.7, deskLength], [-11.68, 4.02, deskCenterZ], darkGreen);
  [-8.85, -6.75, -4.65, -2.55, -.45].forEach((z) => box(group, [.6, 3.7, .12], [-11.48, 4.02, z], paint));
  [2.52, 3.62, 4.72, 5.77].forEach((y) => box(group, [.62, .12, deskLength - .05], [-11.47, y, deskCenterZ], paint));
  for (let row = 0; row < 3; row += 1) for (let col = 0; col < 4; col += 1) booksZ(group, -11.31, 2.58 + row * 1.1, -7.78 + col * 2.1, 1.78, 11, row * 11 + col);

  createScreen(group, screenTexture, [-10.62, 3.38, -4.65], [2.18, 1.58], 'monitor');
  createDeskAccessories(scene, group);
  createChair(scene);

  const tvCabinet = standard('#1a303a', .68);
  const tvZ = .95;
  box(group, [.16, 1.94, 2.75], [-11.72, 1.02, tvZ], tvCabinet, .025);
  box(group, [1.65, 1.94, .12], [-10.98, 1.02, -.425], tvCabinet, .025);
  box(group, [1.65, 1.94, .12], [-10.98, 1.02, 2.325], tvCabinet, .025);
  box(group, [1.65, .14, 2.75], [-10.98, .13, tvZ], tvCabinet, .025);
  box(group, [1.82, .16, 2.8], [-10.9, 2.07, tvZ], standard('#243c47', .61), .03);
  box(group, [1.52, .12, 2.48], [-10.79, 1.3, tvZ], standard('#263d46', .7));
  booksZ(group, -10.18, 1.36, tvZ, 2.2, 15, 53, .62);
  const bag = box(group, [.7, .68, 1.05], [-10.62, .5, tvZ], standard('#343029', .9), .1);
  bag.rotation.x = -.05;
  box(group, [.08, .34, .68], [-10.23, .71, tvZ], standard('#2a2722', .9), .04);
  createScreen(group, screenTexture, [-10.62, 2.92, tvZ], [1.65, 1.24], 'tv');

  const glass = new THREE.MeshPhysicalMaterial({ color: '#0c2530', transparent: true, opacity: .66, roughness: .12, metalness: .16, transmission: .1, side: THREE.DoubleSide });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(6.45, 5.05), glass);
  pane.rotation.y = Math.PI / 2;
  pane.position.set(-11.84, 3.15, 5.585);
  group.add(pane);
  const frame = standard('#171c1a', .43, .35);
  box(group, [.14, 5.35, .16], [-11.65, 3.15, 2.35], frame);
  box(group, [.14, 5.35, .16], [-11.65, 3.15, 8.82], frame);
  box(group, [.14, .16, 6.63], [-11.65, .48, 5.585], frame);
  box(group, [.14, .16, 6.63], [-11.65, 5.82, 5.585], frame);
  box(group, [.14, 5.15, .12], [-11.63, 3.15, 5.585], frame);
  box(group, [.13, .12, 6.35], [-11.6, 2.42, 5.585], frame);
  const curtain = standard('#ffffff', .96, 0, makeFabricTexture('#142936'));
  for (const edgeZ of [2.35, 8.82]) {
    for (let fold = 0; fold < 6; fold += 1) {
      const direction = edgeZ < 5 ? 1 : -1;
      box(group, [.22, 5.65 - Math.abs(fold - 2) * .06, .23], [-11.48 + Math.sin(fold) * .04, 3.3, edgeZ + direction * fold * .11], curtain, .045);
    }
  }

  const readingArea = new THREE.Group();
  readingArea.name = 'Window reading table and two seats';
  scene.add(readingArea);
  // Keep the reading table in the open floor area directly south of the bed.
  const tableCenter = new THREE.Vector3(0, 0, 1.22);
  const tableTexture = new THREE.TextureLoader().load('/references/reading-table-wood.png');
  tableTexture.colorSpace = THREE.SRGBColorSpace;
  tableTexture.anisotropy = 16;
  tableTexture.minFilter = THREE.LinearMipmapLinearFilter;
  tableTexture.center.set(.5, .5);
  tableTexture.rotation = Math.PI / 2;
  // The orbiting book light is intentionally strong, so a warm neutral multiplier
  // keeps the supplied photograph from washing out while preserving its grain.
  const tableTopMaterial = standard('#a65f35', .9, 0, tableTexture);
  const tableSideMaterial = standard('#613518', .7, .035, makeWoodTexture());
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.42, 1.42, .17, 64),
    [tableSideMaterial, tableTopMaterial, tableSideMaterial],
  );
  tableTop.position.set(tableCenter.x, 1.08, tableCenter.z);
  tableTop.castShadow = tableTop.receiveShadow = true;
  readingArea.add(tableTop);
  const tableEdge = new THREE.Mesh(new THREE.TorusGeometry(1.37, .045, 10, 64), standard('#613518', .66, .04, makeWoodTexture()));
  tableEdge.rotation.x = Math.PI / 2;
  tableEdge.position.set(tableCenter.x, 1.08, tableCenter.z);
  readingArea.add(tableEdge);
  for (let leg = 0; leg < 4; leg += 1) {
    const angle = Math.PI / 4 + leg * Math.PI / 2;
    box(
      readingArea,
      [.16, .92, .16],
      [tableCenter.x + Math.cos(angle) * 1.03, .56, tableCenter.z + Math.sin(angle) * 1.03],
      standard('#25221e', .68, .08),
      .035,
      [0, 0, Math.cos(angle) * .08],
    );
  }
  const seatMaterial = standard('#ffffff', .94, 0, makeFabricTexture('#b8ad98'));
  const seatTopMaterial = standard('#ffffff', .9, 0, makeFabricTexture('#cbc2af'));
  // Opposing seats leave a clear north/south path between the bed and table.
  for (const [seatX, seatZ] of [[-2.18, 1.22], [2.18, 1.22]]) {
    const profile = [
      new THREE.Vector2(0, .03), new THREE.Vector2(.58, .03), new THREE.Vector2(.72, .09),
      new THREE.Vector2(.78, .2), new THREE.Vector2(.75, .32), new THREE.Vector2(.62, .4),
      new THREE.Vector2(0, .43),
    ];
    const seat = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), seatMaterial);
    seat.position.set(seatX, .03, seatZ);
    seat.castShadow = seat.receiveShadow = true;
    readingArea.add(seat);
    const topCushion = new THREE.Mesh(new THREE.SphereGeometry(.67, 32, 16), seatTopMaterial);
    topCushion.scale.y = .19;
    topCushion.position.set(seatX, .43, seatZ);
    topCushion.castShadow = true;
    readingArea.add(topCushion);
    const seam = new THREE.Mesh(new THREE.TorusGeometry(.66, .025, 8, 40), standard('#8e8372', .9));
    seam.rotation.x = Math.PI / 2;
    seam.position.set(seatX, .43, seatZ);
    readingArea.add(seam);
    cylinder(readingArea, .055, .035, [seatX, .545, seatZ], standard('#847968', .92), 16);
  }
}

function createSouthWall(scene) {
  const group = new THREE.Group();
  group.name = 'South wall — air conditioner and window';
  scene.add(group);
  const white = standard('#dedfd9', .52);
  const dark = standard('#202622', .42, .28);
  box(group, [5.35, 1.06, .58], [-5.65, 5.72, 8.61], white, .18);
  box(group, [4.95, .14, .08], [-5.65, 5.47, 8.29], dark, .025);
  box(group, [4.65, .05, .04], [-5.65, 5.69, 8.27], standard('#f4f5f0', .3), .015);
  const glass = new THREE.MeshPhysicalMaterial({ color: '#102732', transparent: true, opacity: .72, roughness: .1, metalness: .12, transmission: .08, side: THREE.DoubleSide });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 4.95), glass);
  pane.position.set(3.75, 3.1, 8.82);
  group.add(pane);
  const frame = standard('#191d1b', .42, .32);
  box(group, [5.42, .16, .14], [3.75, .58, 8.68], frame);
  box(group, [5.42, .16, .14], [3.75, 5.62, 8.68], frame);
  box(group, [.16, 5.18, .14], [1.05, 3.1, 8.68], frame);
  box(group, [.16, 5.18, .14], [6.45, 3.1, 8.68], frame);
  box(group, [.12, 5.0, .12], [3.75, 3.1, 8.66], frame);
  const curtain = standard('#ffffff', .96, 0, makeFabricTexture('#142936'));
  for (const edgeX of [.63, 6.87]) {
    for (let fold = 0; fold < 7; fold += 1) box(group, [.24, 5.65 - Math.abs(fold - 3) * .06, .22], [edgeX + (edgeX < 3 ? -fold * .11 : fold * .11), 3.3, 8.3 + Math.sin(fold) * .035], curtain, .045);
  }
}

function createEastWall(scene) {
  const group = new THREE.Group();
  group.name = 'East wall — entry, library and closet';
  scene.add(group);
  const paint = standard(COLORS.green, .67);
  const dark = standard(COLORS.greenDark, .8);
  const chrome = standard(COLORS.metal, .22, .72);

  // One continuous, equal-height east-wall installation: entry, library, then closet.
  box(group, [.22, 5.9, 2.82], [11.76, 3.05, -7.41], paint, .025);
  box(group, [.035, 2.05, 2.38], [11.63, 3.75, -7.41], standard('#2c603a', .69), .02);
  box(group, [.035, 1.55, 2.38], [11.63, 1.48, -7.41], standard('#2c603a', .69), .02);
  cylinder(group, .065, .12, [11.57, 2.75, -6.28], chrome, 14, [0, 0, Math.PI / 2]);

  box(group, [.4, 4.65, 7.0], [11.66, 2.43, -2.5], dark);
  box(group, [.64, 4.65, .13], [11.42, 2.43, -5.96], paint);
  box(group, [.64, 4.65, .13], [11.42, 2.43, .96], paint);
  box(group, [.64, 4.65, .13], [11.42, 2.43, -2.5], paint);
  for (let row = 0; row < 5; row += 1) {
    const y = .16 + row * .91;
    box(group, [.64, .12, 6.96], [11.42, y, -2.5], paint);
    booksZ(group, 11.23, y + .06, -4.23, 3.18, 19, 70 + row);
    booksZ(group, 11.23, y + .06, -.77, 3.18, 19, 80 + row);
  }
  box(group, [.64, .12, 6.96], [11.42, 4.72, -2.5], paint);
  for (let section = 0; section < 3; section += 1) {
    const z = -4.83 + section * 2.33;
    box(group, [.62, 1.22, 2.29], [11.42, 5.38, z], paint, .018);
    knob(group, [11.06, 5.2, z + (section % 2 ? -.42 : .42)], [0, 0, Math.PI / 2]);
  }

  box(group, [.52, 5.9, 7.82], [11.58, 3.05, 4.91], paint, .025);
  const closetCenters = [1.98, 3.93, 5.89, 7.84];
  for (let panel = 0; panel < closetCenters.length; panel += 1) {
    const z = closetCenters[panel];
    box(group, [.035, 5.55, 1.88], [11.29, 3.05, z], standard('#2d603a', .7), .015);
    for (let y = 1.15; y < 5.35; y += .42) box(group, [.025, .03, 1.62], [11.26, y, z], dark, 0, null, false);
    knob(group, [11.17, 3.02, z + (panel % 2 ? -.58 : .58)], [0, 0, Math.PI / 2]);
  }
}

function createCeiling(scene) {
  const group = new THREE.Group();
  group.name = 'Illuminated tray ceiling';
  scene.add(group);
  const tray = standard('#bfc3bc', .9);
  const glow = new THREE.MeshBasicMaterial({ color: '#f3f4e9', toneMapped: false });
  box(group, [17.2, .18, 11.8], [0, 7.04, 0], tray, .05, null, false);
  box(group, [17.55, .08, .16], [0, 6.9, -6.02], glow, 0, null, false);
  box(group, [17.55, .08, .16], [0, 6.9, 6.02], glow, 0, null, false);
  box(group, [.16, .08, 12.0], [-8.78, 6.9, 0], glow, 0, null, false);
  box(group, [.16, .08, 12.0], [8.78, 6.9, 0], glow, 0, null, false);
  const panelMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, side: THREE.DoubleSide });
  for (const z of [-2.8, 2.8]) {
    box(group, [3.35, .09, 3.0], [0, 6.86, z], standard('#5a5e59', .4, .2), .05, null, false);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 2.7), panelMaterial);
    panel.rotation.x = Math.PI / 2;
    panel.position.set(0, 6.8, z);
    group.add(panel);
    const light = new THREE.RectAreaLight('#fffdf2', 8.5, 3.0, 2.7);
    light.position.set(0, 6.73, z);
    light.rotation.x = -Math.PI / 2;
    scene.add(light);
  }
  const perimeterLight = new THREE.RectAreaLight('#e8f2e6', 4.8, 16.5, 10.8);
  perimeterLight.position.set(0, 6.78, 0);
  perimeterLight.rotation.x = -Math.PI / 2;
  scene.add(perimeterLight);
}

export function createRoom(scene) {
  const screenTexture = new THREE.TextureLoader().load('/references/l-poster.png');
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.minFilter = THREE.LinearMipmapLinearFilter;
  const alcoveMaterial = createAlcoveShader();
  createShell(scene);
  createNorthWall(scene, alcoveMaterial);
  createWestWall(scene, screenTexture);
  createSouthWall(scene);
  createEastWall(scene);
  createCeiling(scene);

  scene.add(new THREE.HemisphereLight('#b9c9bf', '#493527', 2.15));
  const roomFill = new THREE.DirectionalLight('#e5eee5', 1.55);
  roomFill.position.set(4, 6.4, 4);
  roomFill.castShadow = true;
  roomFill.shadow.mapSize.set(1024, 1024);
  scene.add(roomFill);
  const bookOrbitLight = new THREE.PointLight('#b8ecc4', 4.5, 5.5, 1.6);
  scene.add(bookOrbitLight);

  // Half-bitten apple beside the Death Note
  function createBittenApple() {
    const group = new THREE.Group();
    group.name = 'Bitten apple';

    const radius = 0.135;
    const geo = new THREE.SphereGeometry(radius, 48, 36);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    // Bite center and cavity radius
    const biteCenter = new THREE.Vector3(0.10, 0.01, 0.06);
    const biteRadius = 0.082;
    const biteNormal = biteCenter.clone().normalize();

    const skinRed = new THREE.Color('#b8141f');
    const skinDark = new THREE.Color('#740b12');
    const skinGold = new THREE.Color('#d49b28');
    const fleshColor = new THREE.Color('#fcf6e8');
    const fleshEdge = new THREE.Color('#e0dfb2');
    const coreColor = new THREE.Color('#eae2c8');

    const v = new THREE.Vector3();
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Organic apple shaping (taper, lobes, dimples)
      const phi = Math.atan2(v.z, v.x);
      const ny = v.y / radius;

      // 5 subtle lobes
      const lobe = 1 + 0.032 * Math.cos(5 * phi);
      v.x *= lobe;
      v.z *= lobe;

      // Shoulder wider at top, gently tapered at bottom
      if (v.y > 0) {
        v.x *= 1.04;
        v.z *= 1.04;
      } else {
        v.x *= 0.94 + 0.06 * (1 + ny);
        v.z *= 0.94 + 0.06 * (1 + ny);
      }

      // Stem cavity (top dimple)
      if (ny > 0.65) {
        const dipT = (ny - 0.65) / 0.35;
        v.y -= dipT * dipT * 0.038;
        v.x *= 1 - dipT * 0.25;
        v.z *= 1 - dipT * 0.25;
      }

      // Calyx cavity (bottom dimple)
      if (ny < -0.7) {
        const dipB = (-ny - 0.7) / 0.3;
        v.y += dipB * dipB * 0.025;
        v.x *= 1 - dipB * 0.2;
        v.z *= 1 - dipB * 0.2;
      }

      // Sculpt concave bite mark
      const distToBite = v.distanceTo(biteCenter);
      if (distToBite < biteRadius) {
        const t = 1 - distToBite / biteRadius;
        const biteDepth = Math.pow(t, 1.3) * 0.068;
        const toothRipple = Math.sin(v.y * 65) * 0.0025 + Math.sin(phi * 18) * 0.0018;
        v.addScaledVector(biteNormal, -(biteDepth + toothRipple * t));

        if (t > 0.25) {
          if (t > 0.75) c.copy(coreColor);
          else c.copy(fleshColor);
        } else {
          c.copy(fleshEdge).lerp(fleshColor, t / 0.25);
        }
      } else {
        const heightGrad = (v.y / radius + 1) * 0.5;
        if (heightGrad > 0.88) {
          c.copy(skinRed).lerp(skinGold, (heightGrad - 0.88) / 0.12);
        } else if (heightGrad < 0.15) {
          c.copy(skinRed).lerp(skinDark, (0.15 - heightGrad) / 0.15);
        } else {
          const streak = Math.sin(phi * 12 + v.y * 20) * 0.08;
          c.copy(skinRed);
          if (streak > 0) c.lerp(skinDark, streak);
        }
      }

      pos.setXYZ(i, v.x, v.y, v.z);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const appleMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.28,
      metalness: 0.02,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
    });

    const appleMesh = new THREE.Mesh(geo, appleMat);
    appleMesh.position.set(0, 0.128, 0);
    appleMesh.rotation.set(0.06, 0.52, -0.05); // Tilt to face bite towards viewer
    appleMesh.castShadow = true;
    appleMesh.receiveShadow = true;
    group.add(appleMesh);

    // Apple seed inside the bite pocket
    const seedGeo = new THREE.ConeGeometry(0.007, 0.022, 6);
    seedGeo.scale(1, 1, 0.5);
    const seedMat = standard('#241108', 0.35, 0.05);
    const seed = new THREE.Mesh(seedGeo, seedMat);
    seed.position.set(0.062, 0.13, 0.038);
    seed.rotation.set(0.4, 0.3, 1.2);
    group.add(seed);

    // Curved woody stem
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.225, 0),
      new THREE.Vector3(0.008, 0.26, 0.004),
      new THREE.Vector3(0.022, 0.29, 0.015),
    ]);
    const stemGeo = new THREE.TubeGeometry(stemCurve, 10, 0.0065, 8, false);
    const stemMat = standard('#3b2413', 0.85);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.castShadow = true;
    group.add(stem);

    // Fresh green leaf
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8), standard('#3e7828', 0.45));
    leaf.scale.set(1.6, 0.15, 0.7);
    leaf.position.set(0.024, 0.262, 0.012);
    leaf.rotation.set(0.28, 0.75, -0.38);
    leaf.castShadow = true;
    group.add(leaf);

    return group;
  }

  const bittenApple = createBittenApple();
  bittenApple.position.set(0.72, 1.18, 0.52);
  scene.add(bittenApple);

  return {
    bounds: { minX: -11.25, maxX: 11.25, minY: .72, maxY: 6.55, minZ: -8.25, maxZ: 8.25 },
    bookPosition: new THREE.Vector3(0, 1.18, 1.22),
    update(time) {
      alcoveMaterial.uniforms.uTime.value = time;
      // Light position rotates dynamically around the book
      const orbitSpeed = 0.85;
      const orbitRadius = 1.45;
      bookOrbitLight.position.set(
        Math.cos(time * orbitSpeed) * orbitRadius,
        1.85 + Math.sin(time * 0.6) * 0.28,
        1.22 + Math.sin(time * orbitSpeed) * orbitRadius
      );
    },
  };
}
