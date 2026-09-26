import * as THREE from 'three';
import { createTextures } from './textures.js';
import { buildTemple } from './temple.js';
import { createDarkhold } from './book.js';

const canvas = document.querySelector('#scene');
const hud = document.querySelector('#hud');
const objective = document.querySelector('#objective');
const objectiveText = document.querySelector('#objective-text');
const progressLine = document.querySelector('#progress-line');
const prompt = document.querySelector('#interaction-prompt');
const promptTitle = document.querySelector('#prompt-title');
const promptDetail = document.querySelector('#prompt-detail');
const helpButton = document.querySelector('#help-button');
const helpPanel = document.querySelector('#help-panel');
const closeHelp = document.querySelector('#close-help');
const toast = document.querySelector('#cover-toast');
const webglError = document.querySelector('#webgl-error');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  webglError.hidden = false;
  throw error;
}

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, /Mobi|Android/i.test(navigator.userAgent) ? 1.25 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.26;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x201a17);
scene.fog = new THREE.FogExp2(0x241b18, .0085);

// Perspective projection is an explicit project requirement.
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, .1, 180);
camera.position.set(0, 9.5, 64);

const textures = await createTextures();
const temple = buildTemple(scene, textures);
const darkhold = createDarkhold(textures);
scene.add(darkhold.root);

const state = {
  mode: 'sealed', // sealed | entering | exploring
  entryTime: 0,
  elapsed: 0,
  cameraAngle: 0,
  cameraRadius: 18,
  cameraHeight: 10.5,
  targetAngle: 0,
  targetRadius: 18,
  targetHeight: 10.5,
  keyInteractions: 0,
  coverChanges: 0,
};

const keys = new Set();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
let hovered = null;
let pointerDown = null;
let dragged = false;
let toastTimer = 0;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1700);
}

function setHelp(open) {
  helpPanel.classList.toggle('is-open', open);
  helpPanel.setAttribute('aria-hidden', String(!open));
  helpButton.setAttribute('aria-expanded', String(open));
}

helpButton.addEventListener('click', () => setHelp(!helpPanel.classList.contains('is-open')));
closeHelp.addEventListener('click', () => setHelp(false));

function enterTemple() {
  if (state.mode !== 'sealed') return;
  state.mode = 'entering';
  state.entryTime = state.elapsed;
  temple.openDoors();
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (state.mode === 'sealed' && (key === 'enter' || key === ' ')) {
    event.preventDefault();
    enterTemple();
    return;
  }
  if (key === 'h') setHelp(!helpPanel.classList.contains('is-open'));
  if (key === 'escape') setHelp(false);
  if (state.mode !== 'exploring') return;
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) event.preventDefault();
  keys.add(key);
  if (key === 'c' && !event.repeat) {
    const name = darkhold.cycleCover();
    state.coverChanges += 1;
    showToast(`Cover texture · ${name}`);
  }
  if (key === 'r' && !event.repeat) {
    state.targetAngle = 0;
    state.targetRadius = 18;
    state.targetHeight = 10.5;
    showToast('Camera position reset');
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

function updatePointer(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

canvas.addEventListener('pointerdown', (event) => {
  updatePointer(event);
  pointerDown = { x: event.clientX, y: event.clientY, angle: state.targetAngle, height: state.targetHeight };
  dragged = false;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  updatePointer(event);
  if (!pointerDown || state.mode !== 'exploring') return;
  const dx = event.clientX - pointerDown.x;
  const dy = event.clientY - pointerDown.y;
  if (Math.hypot(dx, dy) > 5) dragged = true;
  if (dragged) {
    state.targetAngle = pointerDown.angle - dx * .0065;
    state.targetHeight = THREE.MathUtils.clamp(pointerDown.height + dy * .018, 6, 16);
  }
});

canvas.addEventListener('pointerup', (event) => {
  if (state.mode === 'sealed' && !dragged) {
    raycaster.setFromCamera(pointer, camera);
    const doorHit = raycaster.intersectObjects(temple.doorInteractables, true)[0];
    if (doorHit) enterTemple();
  } else if (state.mode === 'exploring' && !dragged && hovered) {
    const message = darkhold.interact(hovered.object, hovered.point);
    showToast(message);
  }
  pointerDown = null;
  dragged = false;
  canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener('wheel', (event) => {
  if (state.mode !== 'exploring') return;
  state.targetRadius = THREE.MathUtils.clamp(state.targetRadius + event.deltaY * .008, 10, 20);
}, { passive: true });

function updateInput(delta) {
  const orbitDirection = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const zoomDirection = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  const heightDirection = (keys.has('e') ? 1 : 0) - (keys.has('q') ? 1 : 0);
  state.targetAngle += orbitDirection * delta * .72;
  state.targetRadius = THREE.MathUtils.clamp(state.targetRadius + zoomDirection * delta * 5.2, 10, 20);
  state.targetHeight = THREE.MathUtils.clamp(state.targetHeight + heightDirection * delta * 4.2, 6, 16);
  if (orbitDirection || zoomDirection || heightDirection) state.keyInteractions += 1;

  const smoothing = 1 - Math.exp(-delta * 5.2);
  state.cameraAngle += (state.targetAngle - state.cameraAngle) * smoothing;
  state.cameraRadius += (state.targetRadius - state.cameraRadius) * smoothing;
  state.cameraHeight += (state.targetHeight - state.cameraHeight) * smoothing;
}

function updateCamera(delta) {
  const target = new THREE.Vector3(0, 5.2, 0);
  if (state.mode === 'sealed') {
    camera.position.y = 9.5 + Math.sin(state.elapsed * .35) * .035;
    camera.lookAt(0, 9, 42.5);
    return;
  }
  if (state.mode === 'entering') {
    const raw = THREE.MathUtils.clamp((state.elapsed - state.entryTime) / 8, 0, 1);
    const moveRaw = THREE.MathUtils.clamp((state.elapsed - state.entryTime - 1.8) / 6.2, 0, 1);
    const eased = moveRaw * moveRaw * (3 - 2 * moveRaw);
    const start = new THREE.Vector3(0, 9.5, 64);
    const end = new THREE.Vector3(0, 10.5, 18);
    camera.position.lerpVectors(start, end, eased);
    const look = new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 9, 42.5), target, eased);
    camera.lookAt(look);
    if (raw >= 1) {
      state.mode = 'exploring';
      hud.classList.remove('is-hidden');
      objective.classList.remove('is-hidden');
      objectiveText.textContent = 'Approach the forbidden book';
      progressLine.style.width = '64%';
      showToast('Temple controls are active');
    }
    return;
  }
  updateInput(delta);
  camera.position.set(
    Math.sin(state.cameraAngle) * state.cameraRadius,
    state.cameraHeight,
    -.4 + Math.cos(state.cameraAngle) * state.cameraRadius,
  );
  camera.lookAt(target);
}

function updateRaycast() {
  if (state.mode === 'sealed') {
    raycaster.setFromCamera(pointer, camera);
    const overDoor = raycaster.intersectObjects(temple.doorInteractables, true).length > 0;
    canvas.style.cursor = overDoor ? 'pointer' : 'default';
    prompt.classList.add('is-hidden');
    return;
  }
  if (state.mode !== 'exploring' || dragged || helpPanel.classList.contains('is-open')) {
    hovered = null;
    prompt.classList.add('is-hidden');
    canvas.style.cursor = dragged ? 'grabbing' : 'grab';
    return;
  }
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(darkhold.interactables, true);
  hovered = hits.find((hit) => hit.distance < 30) ?? null;
  canvas.style.cursor = hovered ? 'pointer' : 'grab';
  if (!hovered) {
    prompt.classList.add('is-hidden');
    return;
  }
  prompt.classList.remove('is-hidden');
  if (!darkhold.isOpen) {
    promptTitle.textContent = 'Open the Darkhold';
    promptDetail.textContent = 'Click the sealed cover';
  } else if (hovered.object.userData.bookPart === 'cover' || hovered.object.userData.bookPart === 'page-left') {
    promptTitle.textContent = darkhold.turnedPages ? 'Turn back' : 'Close the Darkhold';
    promptDetail.textContent = 'Click the left side';
  } else {
    promptTitle.textContent = darkhold.turnedPages < 7 ? 'Reveal the next page' : 'Close the Darkhold';
    promptDetail.textContent = 'Click the right page';
  }
}

function updateObjective() {
  if (state.mode !== 'exploring') return;
  if (darkhold.interactionCount > 0 && state.keyInteractions === 0) {
    objectiveText.textContent = 'Orbit the relic with A / D';
    progressLine.style.width = '80%';
  } else if (darkhold.interactionCount > 0 && state.keyInteractions > 0 && state.coverChanges === 0) {
    objectiveText.textContent = 'Press C to alter the binding';
    progressLine.style.width = '91%';
  } else if (darkhold.interactionCount > 0 && state.keyInteractions > 0 && state.coverChanges > 0) {
    objectiveText.textContent = 'The ritual is complete';
    progressLine.style.width = '100%';
  }
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .1);
  state.elapsed = clock.elapsedTime;
  updateCamera(delta);
  temple.update(state.elapsed, delta);
  darkhold.update(state.elapsed, delta);
  updateRaycast();
  updateObjective();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, /Mobi|Android/i.test(navigator.userAgent) ? 1.25 : 2));
});

window.__sanctum = {
  state,
  darkhold,
  temple,
  enter: enterTemple,
  renderer,
  scene,
  camera,
};

animate();
