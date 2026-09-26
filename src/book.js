import * as THREE from 'three';

const WIDTH = 3.25;
const DEPTH = 4.65;
const ease = (value) => value * value * (3 - 2 * value);

function texturedMaterial(map, options = {}) {
  return new THREE.MeshStandardMaterial({ map, roughness: .74, metalness: .05, ...options });
}

function ruggedBox(width, height, depth, seed = 1, edgeStrength = .1) {
  const geometry = new THREE.BoxGeometry(width, height, depth, 14, 2, 11);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    let x = position.getX(index);
    let y = position.getY(index);
    let z = position.getZ(index);
    const edgeX = Math.abs(x) > width * .42;
    const edgeZ = Math.abs(z) > depth * .42;
    const noise = Math.sin(x * 7.31 + z * 9.17 + seed * 3.7) * .55
      + Math.sin(x * 15.7 - z * 5.9 + seed) * .45;
    if (edgeX) x += Math.sign(x || 1) * noise * edgeStrength;
    if (edgeZ) z += Math.sign(z || 1) * noise * edgeStrength;
    if (edgeX || edgeZ) y += noise * edgeStrength * .16;
    position.setXYZ(index, x, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function makeCoverRelief(parent, metalMaterial) {
  const add = (object) => {
    object.castShadow = true;
    object.userData.bookPart = 'cover';
    parent.add(object);
    return object;
  };

  // A restrained raised frame preserves the photographed binding art below it.
  for (const x of [-WIDTH * .43, WIDTH * .43]) {
    const rail = add(new THREE.Mesh(new THREE.BoxGeometry(.11, .1, DEPTH * .88), metalMaterial));
    rail.position.set(x, .235, 0);
  }
  for (const z of [-DEPTH * .43, DEPTH * .43]) {
    const rail = add(new THREE.Mesh(new THREE.BoxGeometry(WIDTH * .86, .1, .11), metalMaterial));
    rail.position.set(0, .235, z);
  }

  for (const x of [-1.34, 1.34]) {
    for (const z of [-2.03, 2.03]) {
      const corner = add(new THREE.Mesh(new THREE.CylinderGeometry(.15, .19, .12, 6), metalMaterial));
      corner.position.set(x, .26, z);
    }
  }
}

export function createDarkhold(textures) {
  const root = new THREE.Group();
  root.position.set(0, 5.7, 0);
  root.userData.baseY = root.position.y;

  const floatGroup = new THREE.Group();
  floatGroup.position.x = -WIDTH / 2;
  root.add(floatGroup);

  const interactables = [];
  const coverMaterials = textures.covers.map((map) => texturedMaterial(map, {
    color: 0xffffff,
    roughness: .64,
    metalness: .24,
    bumpMap: map,
    bumpScale: .12,
  }));
  const bindingMaterial = texturedMaterial(textures.metal, {
    color: 0x3a302b,
    roughness: .4,
    metalness: .82,
  });
  const pageMaterial = texturedMaterial(textures.paper, {
    color: 0xd1b27d,
    roughness: .98,
    side: THREE.DoubleSide,
  });
  const illustratedPageMaterials = textures.pages.map((map) => texturedMaterial(map, {
    color: 0xffffff,
    roughness: .96,
    metalness: 0,
    side: THREE.DoubleSide,
  }));
  const pageEdgeMaterial = texturedMaterial(textures.paper, {
    color: 0x9e7445,
    roughness: 1,
    bumpMap: textures.paper,
    bumpScale: .08,
  });

  const backCover = new THREE.Mesh(ruggedBox(WIDTH, .28, DEPTH, 4, .12), coverMaterials[0]);
  backCover.position.set(WIDTH / 2, -.43, 0);
  backCover.castShadow = backCover.receiveShadow = true;
  backCover.userData.bookPart = 'page-right';
  floatGroup.add(backCover);
  interactables.push(backCover);

  const pageBlock = new THREE.Mesh(ruggedBox(WIDTH - .32, .68, DEPTH - .3, 8, .08), pageEdgeMaterial);
  pageBlock.position.set(WIDTH / 2 + .02, -.02, 0);
  pageBlock.castShadow = pageBlock.receiveShadow = true;
  pageBlock.userData.bookPart = 'page-right';
  floatGroup.add(pageBlock);
  interactables.push(pageBlock);

  for (let layer = 0; layer < 12; layer += 1) {
    const sheet = new THREE.Mesh(ruggedBox(WIDTH - .28 + Math.sin(layer) * .06, .018, DEPTH - .24, 30 + layer, .065), pageMaterial);
    sheet.position.set(WIDTH / 2 + Math.sin(layer * 2.1) * .018, -.31 + layer * .052, Math.cos(layer) * .018);
    sheet.castShadow = true;
    sheet.userData.bookPart = 'page-right';
    floatGroup.add(sheet);
  }

  const coverPivot = new THREE.Group();
  coverPivot.position.set(0, .43, 0);
  const topCover = new THREE.Mesh(ruggedBox(WIDTH, .3, DEPTH, 17, .13), coverMaterials[0]);
  topCover.position.x = WIDTH / 2;
  topCover.castShadow = topCover.receiveShadow = true;
  topCover.userData.bookPart = 'cover';
  coverPivot.add(topCover);
  makeCoverRelief(topCover, bindingMaterial);
  floatGroup.add(coverPivot);
  interactables.push(topCover);

  const pages = [];
  for (let i = 0; i < 6; i += 1) {
    const pivot = new THREE.Group();
    pivot.position.set(0, .395 + i * .008, 0);
    const page = new THREE.Mesh(ruggedBox(WIDTH - .38, .018, DEPTH - .3, 70 + i, .055), illustratedPageMaterials[i]);
    page.position.x = WIDTH / 2 + .02;
    page.castShadow = true;
    page.userData.bookPart = 'page-right';
    page.userData.pageIndex = i;
    pivot.add(page);
    floatGroup.add(pivot);
    interactables.push(page);
    pages.push({ pivot, page, progress: 0, target: 0 });
  }

  const spine = new THREE.Mesh(new THREE.CylinderGeometry(.31, .38, DEPTH + .05, 14), coverMaterials[0]);
  spine.rotation.x = Math.PI / 2;
  spine.position.set(-.09, -.02, 0);
  spine.castShadow = true;
  spine.userData.bookPart = 'spine';
  floatGroup.add(spine);
  interactables.push(spine);

  for (const z of [-1.65, 0, 1.65]) {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .62, 10), bindingMaterial);
    hinge.rotation.x = Math.PI / 2;
    hinge.position.set(-.26, -.02, z);
    hinge.castShadow = true;
    hinge.userData.bookPart = 'spine';
    floatGroup.add(hinge);
  }

  const glow = new THREE.PointLight(0xcd4026, 22, 18, 1.5);
  glow.position.set(0, 1.1, 0);
  root.add(glow);

  const underGlow = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 64),
    new THREE.MeshBasicMaterial({ color: 0x9b241f, transparent: true, opacity: .09, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  underGlow.rotation.x = -Math.PI / 2;
  underGlow.position.set(0, -1.2, 0);
  root.add(underGlow);

  let isOpen = false;
  let coverProgress = 0;
  let coverTarget = 0;
  let turnedPages = 0;
  let coverIndex = 0;
  let interactionCount = 0;

  function open() {
    isOpen = true;
    coverTarget = 1;
    interactionCount += 1;
  }

  function close() {
    isOpen = false;
    coverTarget = 0;
    turnedPages = 0;
    pages.forEach((item) => { item.target = 0; });
    interactionCount += 1;
  }

  function flipForward() {
    if (!isOpen || turnedPages >= pages.length) return false;
    pages[turnedPages].target = 1;
    turnedPages += 1;
    interactionCount += 1;
    return true;
  }

  function flipBackward() {
    if (!isOpen || turnedPages <= 0) return false;
    turnedPages -= 1;
    pages[turnedPages].target = 0;
    interactionCount += 1;
    return true;
  }

  function interact(hit, worldPoint) {
    if (!isOpen) {
      open();
      return 'The Darkhold opens';
    }
    const localPoint = floatGroup.worldToLocal(worldPoint.clone());
    if (localPoint.x < 0) {
      if (!flipBackward()) close();
      return turnedPages > 0 ? 'A page turns back' : 'The Darkhold closes';
    }
    if (flipForward()) return `Page ${turnedPages + 1} revealed`;
    close();
    return 'The Darkhold closes';
  }

  function cycleCover() {
    coverIndex = (coverIndex + 1) % coverMaterials.length;
    topCover.material = coverMaterials[coverIndex];
    backCover.material = coverMaterials[coverIndex];
    spine.material = coverMaterials[coverIndex];
    interactionCount += 1;
    return [
      'Wundagore tree binding', 'Black root binding', 'Gilded root binding',
      'Horned iron binding', 'Obsidian tablet binding', 'Six-world binding',
    ][coverIndex];
  }

  function update(time, delta) {
    const smoothing = 1 - Math.exp(-delta * 4.8);
    coverProgress += (coverTarget - coverProgress) * smoothing;
    const opened = ease(coverProgress);
    coverPivot.rotation.z = opened * Math.PI;
    coverPivot.rotation.x = Math.sin(coverProgress * Math.PI) * -.045;

    floatGroup.position.x = THREE.MathUtils.lerp(-WIDTH / 2, 0, opened);
    pages.forEach((item, index) => {
      item.progress += (item.target - item.progress) * (1 - Math.exp(-delta * (5.1 + index * .1)));
      item.pivot.rotation.z = ease(item.progress) * Math.PI;
      item.pivot.rotation.x = Math.sin(item.progress * Math.PI) * (.03 + index * .002);
      item.page.userData.bookPart = item.progress > .5 ? 'page-left' : 'page-right';
    });

    floatGroup.position.y = Math.sin(time * .9) * .13;
    floatGroup.rotation.y = Math.sin(time * .3) * .018;
    floatGroup.rotation.z = Math.sin(time * .55) * .008;
    glow.intensity = 20 + Math.sin(time * 2.8) * 2.2;
    underGlow.material.opacity = .075 + Math.sin(time * 2.1) * .015;
  }

  return {
    root,
    interactables,
    update,
    interact,
    cycleCover,
    open,
    close,
    get isOpen() { return isOpen; },
    get turnedPages() { return turnedPages; },
    get interactionCount() { return interactionCount; },
  };
}
