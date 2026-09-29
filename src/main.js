import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { createRoom } from './room.js';
import { createDeathNote } from './book.js';
import { addShinigami } from './shinigami.js';

const canvas = document.querySelector('#scene');
const loader = document.querySelector('#loader');
const interfaceRoot = document.querySelector('#interface');
const webglError = document.querySelector('#webgl-error');
const bookPrompt = document.querySelector('#book-prompt');
const chapterNumber = document.querySelector('#chapter-number');
const chapterTitle = document.querySelector('#chapter-title');
const chapterCopy = document.querySelector('#chapter-copy');
const status = document.querySelector('#status');
const helpPanel = document.querySelector('#help-panel');
const viewCopy = {
  room: ['01 / THE ROOM', 'A quiet place to study.', 'Look closer. The ordinary details are hiding something.'],
  desk: ['02 / THE DESK', 'Order conceals obsession.', 'Books, apples, study notes — and one object that does not belong.'],
  book: ['03 / THE NOTEBOOK', 'The human whose name is written…', 'Open the cover, turn the rule pages, or select the fountain pen to write.'],
  shinigami: ['04 / THE SHINIGAMI', 'Gods of death stand watch.', 'Ryuk and Rem flank the Death Note — a bitten apple rests beside it.'],
};
const views = {
  room: { position: new THREE.Vector3(9.2, 4.65, 7.15), target: new THREE.Vector3(-.8, 2.45, -2.15) },
  desk: { position: new THREE.Vector3(-5.3, 3.85, -1.05), target: new THREE.Vector3(-10.35, 2.45, -4.7) },
  book: { position: new THREE.Vector3(3.48, 3.15, 1.06), target: new THREE.Vector3(0, 1.24, 1.22) },
  shinigami: { position: new THREE.Vector3(5.5, 4.2, 6.0), target: new THREE.Vector3(0, 2.5, 0.2) },
};
let renderer;
try {
  RectAreaLightUniformsLib.init();
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  loader.hidden = true;
  webglError.hidden = false;
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, /Android|iPhone|iPad/i.test(navigator.userAgent) ? 1.25 : 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#08100d');
scene.fog = new THREE.FogExp2('#08100d', .011);
const camera = new THREE.PerspectiveCamera(49, window.innerWidth / window.innerHeight, .05, 80);
camera.position.copy(views.room.position);
const cameraTarget = views.room.target.clone();
const desiredPosition = camera.position.clone();
const desiredTarget = cameraTarget.clone();
camera.lookAt(cameraTarget);
const room = createRoom(scene);
const deathNote = createDeathNote(scene, room.bookPosition);
const shinigami = addShinigami(scene, {
  ryukPosition: new THREE.Vector3(-3.6, 0, -0.2),
  remPosition: new THREE.Vector3(3.6, 0, -0.2),
  ryukRotationY: Math.PI * 0.28,
  remRotationY: -Math.PI * 0.28,
  scale: 2.6,
});
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(3, 3);
const clock = new THREE.Clock();
const keys = new Set();
let activeView = 'room';
let pointerDown = null;
let dragging = false;
let toastTimer = 0;

function clampToRoom(vector, target = false) {
  const bounds = room.bounds;
  vector.x = THREE.MathUtils.clamp(vector.x, bounds.minX, bounds.maxX);
  vector.z = THREE.MathUtils.clamp(vector.z, bounds.minZ, bounds.maxZ);
  vector.y = THREE.MathUtils.clamp(vector.y, target ? 1 : bounds.minY, target ? 5.85 : bounds.maxY);
}

function setView(name) {
  const view = views[name];
  if (!view) return;
  activeView = name;
  desiredPosition.copy(view.position);
  desiredTarget.copy(view.target);
  const copy = viewCopy[name];
  chapterNumber.textContent = copy[0];
  chapterTitle.textContent = copy[1];
  chapterCopy.textContent = copy[2];
  status.textContent = `${name.toUpperCase()} VIEW`;
  document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.view === name));
  bookPrompt.classList.toggle('is-hidden', name !== 'book');
  if (name === 'book') bookPrompt.querySelector('strong').textContent = deathNote.isOpen ? 'Close the Death Note' : 'Open the Death Note';
}

function showStatus(message) {
  status.textContent = message.toUpperCase();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { status.textContent = `${activeView.toUpperCase()} VIEW`; }, 1800);
}

function toggleBook() {
  if (activeView !== 'book') setView('book');
  const opened = deathNote.toggle();
  bookPrompt.querySelector('strong').textContent = opened ? 'Close the Death Note' : 'Open the Death Note';
  bookPrompt.querySelector('small').textContent = opened ? 'Click the cover or press E' : 'Click the book or press E';
  showStatus(opened ? 'Notebook opened' : 'Notebook closed');
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function bookHit() {
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(deathNote.hitTargets, true)[0] ?? null;
}

canvas.addEventListener('pointerdown', (event) => {
  updatePointer(event);
  pointerDown = { x: event.clientX, y: event.clientY };
  dragging = false;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  updatePointer(event);
  if (pointerDown) {
    const dx = event.clientX - pointerDown.x;
    const dy = event.clientY - pointerDown.y;
    if (Math.hypot(dx, dy) > 4) dragging = true;
    if (dragging) {
      const offset = desiredPosition.clone().sub(desiredTarget);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta -= event.movementX * .004;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + event.movementY * .004, .1, Math.PI - .1);
      desiredPosition.copy(desiredTarget).add(new THREE.Vector3().setFromSpherical(spherical));
      clampToRoom(desiredPosition);
    }
  } else canvas.style.cursor = bookHit() ? 'pointer' : 'grab';
});
canvas.addEventListener('pointerup', (event) => {
  updatePointer(event);
  if (!dragging) {
    const hit = bookHit();
    if (hit) {
      if (hit.object.userData.pen) {
        const active = deathNote.togglePen();
        showStatus(active ? 'Fountain pen ready — click a lined page' : 'Open the notebook before using the pen');
      } else if (deathNote.isOpen && hit.object.userData.page) {
        if (deathNote.penActive) {
          if (deathNote.writeToPage()) showStatus('Inscribed: RAYE PENBER (Cardiac arrest) & NAOMI MISORA');
          else showStatus('Turn to a lined notebook page first (page 6+)');
        } else {
          const pageAction = deathNote.nextPage();
          if (pageAction === 'turning') showStatus(`Turning to Page ${deathNote.currentPage + 1}`);
          if (pageAction === 'closing') {
            bookPrompt.querySelector('strong').textContent = 'Open the Death Note';
            bookPrompt.querySelector('small').textContent = 'Click the book or press E';
            showStatus('Final page reached — notebook closed');
          }
        }
      } else toggleBook();
    }
  }
  pointerDown = null;
  dragging = false;
  try { canvas.releasePointerCapture(event.pointerId); } catch (_) { /* pointer already released */ }
});
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const offset = desiredPosition.clone().sub(desiredTarget);
  offset.multiplyScalar(event.deltaY > 0 ? 1.08 : .92);
  offset.clampLength(activeView === 'book' ? 2.1 : 2.8, 14);
  desiredPosition.copy(desiredTarget).add(offset);
  clampToRoom(desiredPosition);
}, { passive: false });

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (event.repeat) return;
  if (['1', '2', '3', '4'].includes(key)) setView(['room', 'desk', 'book', 'shinigami'][Number(key) - 1]);
  if (key === 'e' && activeView === 'book') toggleBook();
  if (key === 'c' || key === 't') showStatus(deathNote.cycleCover());
  if (key === 'h') toggleHelp();
  if (key === 'r') setView(activeView);
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
bookPrompt.addEventListener('click', toggleBook);

function toggleHelp(force) {
  const open = typeof force === 'boolean' ? force : !helpPanel.classList.contains('is-open');
  helpPanel.classList.toggle('is-open', open);
  helpPanel.setAttribute('aria-hidden', String(!open));
  document.querySelector('#help-toggle').setAttribute('aria-expanded', String(open));
}
document.querySelector('#help-toggle').addEventListener('click', () => toggleHelp());
document.querySelector('#help-close').addEventListener('click', () => toggleHelp(false));

function updateKeyboard(delta) {
  // Rotate / move camera around the book using keyboard (Arrow keys or A/D/W/S in book view)
  if (activeView === 'book' || keys.has('arrowleft') || keys.has('arrowright') || keys.has('arrowup') || keys.has('arrowdown')) {
    const offset = desiredPosition.clone().sub(desiredTarget);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    let orbitChanged = false;

    if (keys.has('arrowleft') || (activeView === 'book' && keys.has('a'))) {
      spherical.theta += delta * 1.8;
      orbitChanged = true;
    }
    if (keys.has('arrowright') || (activeView === 'book' && keys.has('d'))) {
      spherical.theta -= delta * 1.8;
      orbitChanged = true;
    }
    if (keys.has('arrowup') || (activeView === 'book' && keys.has('w'))) {
      spherical.phi = THREE.MathUtils.clamp(spherical.phi - delta * 1.2, 0.25, Math.PI / 2 - 0.05);
      orbitChanged = true;
    }
    if (keys.has('arrowdown') || (activeView === 'book' && keys.has('s'))) {
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + delta * 1.2, 0.25, Math.PI / 2 - 0.05);
      orbitChanged = true;
    }

    if (orbitChanged) {
      desiredPosition.copy(desiredTarget).add(new THREE.Vector3().setFromSpherical(spherical));
      clampToRoom(desiredPosition);
      return;
    }
  }

  // Room navigation
  const forward = desiredTarget.clone().sub(desiredPosition);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const move = new THREE.Vector3();
  if (keys.has('w')) move.add(forward);
  if (keys.has('s')) move.sub(forward);
  if (keys.has('a')) move.sub(right);
  if (keys.has('d')) move.add(right);
  if (keys.has('q')) move.y -= 1;
  if (keys.has('e') && activeView !== 'book') move.y += 1;
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(delta * 2.4);
    desiredPosition.add(move);
    desiredTarget.add(move);
    clampToRoom(desiredPosition);
    clampToRoom(desiredTarget, true);
  }
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

function animate() {
  const delta = Math.min(clock.getDelta(), .05);
  const elapsed = clock.elapsedTime;
  updateKeyboard(delta);
  clampToRoom(desiredPosition);
  clampToRoom(desiredTarget, true);
  room.update(elapsed);
  deathNote.update(delta);
  shinigami.update(elapsed);
  camera.position.lerp(desiredPosition, 1 - Math.exp(-delta * 3.8));
  cameraTarget.lerp(desiredTarget, 1 - Math.exp(-delta * 4.2));
  camera.lookAt(cameraTarget);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(() => {
  loader.classList.add('is-complete');
  interfaceRoot.classList.remove('is-hidden');
  setView('room');
});
animate();
