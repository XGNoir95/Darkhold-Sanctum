import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeLeatherTexture, makeNotebookPageTexture, makePaperTexture } from './textures.js';

const ease = (value) => value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
const PAGE_COUNT = 11;

function box(parent, size, position, material, radius = 0) {
  const geometry = radius
    ? new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(radius, ...size.map((value) => value / 2)))
    : new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radius, height, position, material, segments = 18, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createDeathNote(scene, position) {
  const group = new THREE.Group();
  group.name = 'Death Note';
  group.position.copy(position);
  group.rotation.y = Math.PI / 2;
  scene.add(group);

  const width = .94;
  const depth = 1.22;
  const leatherTextures = [0, 1, 2].map(makeLeatherTexture);
  const pageTextureCache = new Map();
  const textureLoader = new THREE.TextureLoader();
  const getPageTexture = (page, written = false) => {
    const pageNumber = THREE.MathUtils.clamp(page, 1, PAGE_COUNT);
    const key = `${pageNumber}:${written ? 'written' : 'clean'}`;
    if (pageTextureCache.has(key)) return pageTextureCache.get(key);
    let texture;
    if (pageNumber <= 5) {
      texture = textureLoader.load(`/references/death-note-rule-${pageNumber}.png`);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
    } else if (pageNumber === 6 && !written) {
      texture = textureLoader.load('/references/death-note-notebook-reference.png');
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
    } else texture = makeNotebookPageTexture(pageNumber, written);
    pageTextureCache.set(key, texture);
    return texture;
  };
  const exactCoverTexture = new THREE.TextureLoader().load('/references/death-note-cover-exact.png');
  exactCoverTexture.colorSpace = THREE.SRGBColorSpace;
  exactCoverTexture.wrapS = exactCoverTexture.wrapT = THREE.ClampToEdgeWrapping;
  const coverMaterial = new THREE.MeshPhysicalMaterial({
    color: '#222420', map: leatherTextures[0], roughness: .72, metalness: .04, clearcoat: .08, clearcoatRoughness: .8,
  });
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: '#080907', roughness: .62 });
  const pageMaterial = new THREE.MeshStandardMaterial({ color: '#d8d2b9', map: makePaperTexture(), roughness: .95 });

  const bottomCover = new THREE.Mesh(new RoundedBoxGeometry(width, .05, depth, 4, .025), coverMaterial);
  bottomCover.position.y = .025;
  bottomCover.castShadow = bottomCover.receiveShadow = true;
  group.add(bottomCover);

  const pageBlock = new THREE.Mesh(new RoundedBoxGeometry(width - .055, .08, depth - .065, 4, .022), pageMaterial);
  pageBlock.position.set(.018, .09, 0);
  pageBlock.castShadow = pageBlock.receiveShadow = true;
  group.add(pageBlock);
  for (let index = 0; index < 10; index += 1) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(.008, .004, depth - .09), new THREE.MeshStandardMaterial({ color: index % 2 ? '#a8a18b' : '#c7c0aa', roughness: 1 }));
    line.position.set(width / 2 - .026, .055 + index * .007, 0);
    group.add(line);
  }
  const spine = new THREE.Mesh(new RoundedBoxGeometry(.075, .17, depth + .02, 4, .028), edgeMaterial);
  spine.position.set(-width / 2 + .007, .08, 0);
  spine.castShadow = true;
  group.add(spine);

  const topPivot = new THREE.Group();
  topPivot.position.set(-width / 2, .16, 0);
  topPivot.name = 'Front cover hinge';
  group.add(topPivot);
  const topCover = new THREE.Mesh(new RoundedBoxGeometry(width, .05, depth, 4, .025), coverMaterial);
  topCover.position.x = width / 2;
  topCover.castShadow = topCover.receiveShadow = true;
  topPivot.add(topCover);

  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(width * .96, depth * .96),
    new THREE.MeshBasicMaterial({ map: exactCoverTexture, toneMapped: false }),
  );
  title.rotation.x = -Math.PI / 2;
  title.position.set(width / 2 + .018, .029, 0);
  topPivot.add(title);

  const insideCover = new THREE.Mesh(new THREE.PlaneGeometry(width * .9, depth * .9), new THREE.MeshStandardMaterial({ color: '#101210', roughness: .88, side: THREE.DoubleSide }));
  insideCover.rotation.x = Math.PI / 2;
  insideCover.position.set(width / 2, -.028, 0);
  topPivot.add(insideCover);

  const pageGeometry = new THREE.PlaneGeometry(width - .12, depth - .13);
  const leftPage = new THREE.Mesh(
    pageGeometry,
    new THREE.MeshStandardMaterial({ map: getPageTexture(1), roughness: .96, side: THREE.DoubleSide }),
  );
  leftPage.rotation.x = -Math.PI / 2;
  leftPage.position.set(-width + .026, .196, 0);
  leftPage.receiveShadow = true;
  leftPage.userData.page = true;
  group.add(leftPage);

  const rightPage = new THREE.Mesh(
    pageGeometry,
    new THREE.MeshStandardMaterial({ map: getPageTexture(1), roughness: .96, side: THREE.DoubleSide }),
  );
  rightPage.rotation.x = -Math.PI / 2;
  rightPage.position.set(.026, .159, 0);
  rightPage.receiveShadow = true;
  rightPage.userData.page = true;
  group.add(rightPage);

  const pagePivot = new THREE.Group();
  pagePivot.position.set(-width / 2 + .04, .164, 0);
  group.add(pagePivot);
  const turningPage = new THREE.Mesh(
    pageGeometry,
    new THREE.MeshStandardMaterial({ map: getPageTexture(1), roughness: .96, side: THREE.FrontSide }),
  );
  turningPage.rotation.x = -Math.PI / 2;
  turningPage.position.x = (width - .12) / 2;
  turningPage.castShadow = true;
  turningPage.userData.page = true;
  pagePivot.add(turningPage);
  const turningPageBack = new THREE.Mesh(
    pageGeometry,
    new THREE.MeshStandardMaterial({ map: getPageTexture(1), roughness: .96, side: THREE.BackSide }),
  );
  turningPageBack.rotation.x = -Math.PI / 2;
  turningPageBack.position.x = (width - .12) / 2;
  turningPageBack.userData.page = true;
  pagePivot.add(turningPageBack);

  const bookmark = new THREE.Mesh(new THREE.BoxGeometry(.095, .012, .7), new THREE.MeshStandardMaterial({ color: '#4d1b1d', roughness: .78 }));
  bookmark.scale.set(.72, .7, .66);
  bookmark.position.set(.2, .05, depth / 2 - .06);
  group.add(bookmark);

  const fountainPen = new THREE.Group();
  fountainPen.name = 'Usable fountain pen';
  fountainPen.position.set(.67, .04, 0);
  group.add(fountainPen);
  const penBlack = new THREE.MeshPhysicalMaterial({ color: '#090b0a', roughness: .28, metalness: .32, clearcoat: .72, clearcoatRoughness: .18 });
  const penGold = new THREE.MeshStandardMaterial({ color: '#c6a552', roughness: .28, metalness: .84 });
  cylinder(fountainPen, .038, .72, [0, .035, 0], penBlack, 20, [Math.PI / 2, 0, 0]);
  cylinder(fountainPen, .047, .29, [0, .035, -.245], penBlack, 20, [Math.PI / 2, 0, 0]);
  cylinder(fountainPen, .041, .055, [0, .035, .382], penGold, 16, [Math.PI / 2, 0, 0]);
  const nib = new THREE.Mesh(new THREE.ConeGeometry(.055, .17, 4), penGold);
  nib.rotation.x = Math.PI / 2;
  nib.position.set(0, .035, .47);
  nib.castShadow = true;
  fountainPen.add(nib);
  box(fountainPen, [.014, .025, .26], [.052, .065, -.21], penGold, .006);
  const penTargets = [];
  fountainPen.traverse((child) => {
    if (!child.isMesh) return;
    child.userData.pen = true;
    penTargets.push(child);
  });

  const hitTargets = [bottomCover, pageBlock, topCover, title, leftPage, rightPage, turningPage, turningPageBack, ...penTargets];
  let desiredOpen = 0;
  let openAmount = 0;
  let pageAmount = 0;
  let pageTurning = false;
  let penActive = false;
  let coverIndex = 0;
  let currentPage = 1;
  let resetAfterClose = false;
  const writtenPages = new Set();
  const setPageMap = (mesh, page) => {
    mesh.material.map = getPageTexture(page, writtenPages.has(page));
    mesh.material.needsUpdate = true;
  };

  const api = {
    group,
    hitTargets,
    get isOpen() { return desiredOpen > .5; },
    get openAmount() { return openAmount; },
    get currentPage() { return currentPage; },
    get penActive() { return penActive; },
    toggle() { desiredOpen = desiredOpen > .5 ? 0 : 1; return desiredOpen > .5; },
    setOpen(value) { desiredOpen = value ? 1 : 0; },
    togglePen() {
      if (openAmount < .75) return false;
      penActive = !penActive;
      return penActive;
    },
    writeToPage() {
      if (!penActive || pageTurning) return false;
      if (currentPage < 6) {
        penActive = false;
        return false;
      }
      writtenPages.add(currentPage);
      setPageMap(rightPage, currentPage);
      setPageMap(turningPage, currentPage);
      setPageMap(turningPageBack, currentPage);
      penActive = false;
      return true;
    },
    nextPage() {
      if (openAmount < .9 || pageTurning) return false;
      penActive = false;
      if (currentPage >= PAGE_COUNT) {
        desiredOpen = 0;
        resetAfterClose = true;
        return 'closing';
      }
      // A physical sheet has the current right page on its front and the next
      // numbered page on its back. The page beneath it is the following page.
      setPageMap(turningPage, currentPage);
      setPageMap(turningPageBack, currentPage + 1);
      setPageMap(rightPage, Math.min(currentPage + 2, PAGE_COUNT));
      pageTurning = true;
      pageAmount = 0;
      return 'turning';
    },
    cycleCover() {
      coverIndex = (coverIndex + 1) % leatherTextures.length;
      coverMaterial.map = leatherTextures[coverIndex];
      coverMaterial.needsUpdate = true;
      return ['Original black leather', 'Green-black leather', 'Umber-black leather'][coverIndex];
    },
    update(delta) {
      const speed = Math.min(1, delta * 2.25);
      openAmount += (desiredOpen - openAmount) * speed;
      topPivot.rotation.z = ease(openAmount) * Math.PI;
      topPivot.position.y = .16 + Math.sin(openAmount * Math.PI) * .018;
      // The inside cover is the entire left side on page one. A left sheet only
      // exists after the reader has completed at least one page turn.
      leftPage.visible = openAmount > .82 && currentPage > 1;
      rightPage.visible = openAmount > .45;
      // The animated sheet exists only during a turn. Keeping it visible after
      // resetting the hinge caused the old page to flash back over the new one.
      turningPage.visible = openAmount > .52 && pageTurning;
      turningPageBack.visible = openAmount > .52 && pageTurning;
      fountainPen.position.y += ((penActive ? .12 : .04) - fountainPen.position.y) * Math.min(1, delta * 8);
      fountainPen.rotation.z = penActive ? -.08 : 0;
      if (pageTurning) {
        pageAmount += delta * 1.45;
        const progress = Math.min(1, pageAmount);
        pagePivot.rotation.z = ease(progress) * Math.PI;
        pagePivot.position.y = .164 + Math.sin(progress * Math.PI) * .065 + progress * .032;
        if (progress >= 1) {
          currentPage = Math.min(currentPage + 2, PAGE_COUNT);
          setPageMap(leftPage, currentPage - 1);
          setPageMap(rightPage, currentPage);
          pagePivot.rotation.z = 0;
          pagePivot.position.y = .164;
          pageTurning = false;
        }
      }
      if (resetAfterClose && openAmount < .025) {
        currentPage = 1;
        setPageMap(leftPage, 1);
        setPageMap(rightPage, 1);
        setPageMap(turningPage, 1);
        setPageMap(turningPageBack, 2);
        resetAfterClose = false;
      }
    },
  };
  group.traverse((child) => { if (child.isMesh) child.userData.book = api; });
  return api;
}
