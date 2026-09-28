import * as THREE from 'three';

const canvasTexture = (width, height, painter, colorSpace = THREE.SRGBColorSpace) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  painter(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.anisotropy = 8;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

const seeded = (seed) => {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
};

export function makeWoodTexture() {
  const random = seeded(19);
  const texture = canvasTexture(768, 768, (ctx, width, height) => {
    ctx.fillStyle = '#6b482e';
    ctx.fillRect(0, 0, width, height);
    for (let plank = 0; plank < 8; plank += 1) {
      const y = plank * 96;
      ctx.fillStyle = plank % 2 ? '#765136' : '#69452d';
      ctx.fillRect(0, y, width, 96);
      ctx.strokeStyle = 'rgba(28,15,8,.7)';
      ctx.lineWidth = 3;
      ctx.strokeRect(-2, y, width + 4, 96);
      for (let grain = 0; grain < 20; grain += 1) {
        const gy = y + random() * 92;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        for (let x = 0; x <= width; x += 24) ctx.lineTo(x, gy + Math.sin(x * .035 + random() * 2) * 2.2);
        ctx.strokeStyle = `rgba(42,22,11,${.04 + random() * .08})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  });
  texture.repeat.set(2.2, 2.6);
  return texture;
}

export function makeLeatherTexture(tone = 0) {
  const palettes = [
    ['#0c0d0c', '#252724', '#050505'],
    ['#101411', '#303830', '#070a08'],
    ['#14100e', '#3a302a', '#080605'],
  ];
  const colors = palettes[tone % palettes.length];
  const random = seeded(90 + tone);
  return canvasTexture(512, 512, (ctx, width, height) => {
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 18000; i += 1) {
      const x = random() * width;
      const y = random() * height;
      const radius = .4 + random() * 2.1;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = random() > .46 ? colors[1] : colors[2];
      ctx.globalAlpha = .1 + random() * .2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

export function makePaperTexture() {
  const random = seeded(7);
  const texture = canvasTexture(512, 768, (ctx, width, height) => {
    ctx.fillStyle = '#d7d2bb';
    ctx.fillRect(0, 0, width, height);
    const wash = ctx.createLinearGradient(0, 0, width, 0);
    wash.addColorStop(0, 'rgba(73,55,30,.12)');
    wash.addColorStop(.08, 'rgba(255,255,240,.04)');
    wash.addColorStop(.82, 'rgba(255,255,240,.06)');
    wash.addColorStop(1, 'rgba(62,42,22,.14)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 6000; i += 1) {
      ctx.fillStyle = `rgba(70,53,35,${random() * .055})`;
      ctx.fillRect(random() * width, random() * height, 1, 1);
    }
    ctx.strokeStyle = 'rgba(86,77,59,.22)';
    ctx.lineWidth = 1;
    for (let y = 80; y < height - 44; y += 35) {
      ctx.beginPath(); ctx.moveTo(46, y); ctx.lineTo(width - 38, y); ctx.stroke();
    }
  });
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function makeFabricTexture(base = '#0d3f58') {
  const texture = canvasTexture(256, 256, (ctx, width, height) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 4) {
      ctx.strokeStyle = i % 8 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.09)';
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for (let i = 0; i < height; i += 4) {
      ctx.strokeStyle = i % 8 ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.08)';
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }
  });
  texture.repeat.set(3, 3);
  return texture;
}

export function makeScreenTexture() {
  const texture = canvasTexture(768, 480, (ctx, width, height) => {
    const glow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * .65);
    glow.addColorStop(0, '#f9faf7');
    glow.addColorStop(1, '#d7ddd7');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#050505';
    ctx.font = 'italic 290px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('L', width / 2 - 12, height / 2 - 8);
  });
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function makeBookSpineTexture(label, color) {
  return canvasTexture(128, 512, (ctx, width, height) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = ['#e3dfd0', '#131715'].includes(color) ? '#7b322b' : '#e8e5db';
    ctx.font = 'bold 26px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 8);
    ctx.restore();
  });
}

export function makeDeathNoteTitleTexture() {
  return canvasTexture(1024, 720, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f0f0e8';
    ctx.font = '54px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(width * .53, height * .34);
    ctx.rotate(-.055);
    ctx.fillText('DEATH NOTE', 0, 0);
    ctx.restore();
  });
}

export function makeRulePageTexture(page = 1) {
  const heading = page === 1 ? 'HOW TO USE IT' : `RULE ${String(page).padStart(2, '0')}`;
  return canvasTexture(768, 1024, (ctx, width, height) => {
    ctx.fillStyle = '#d8d3bc';
    ctx.fillRect(0, 0, width, height);
    const shade = ctx.createLinearGradient(0, 0, width, 0);
    shade.addColorStop(0, 'rgba(51,37,22,.18)'); shade.addColorStop(.12, 'rgba(255,255,255,.03)'); shade.addColorStop(1, 'rgba(79,58,33,.08)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#171714';
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px Georgia';
    ctx.fillText(heading, width / 2, 112);
    ctx.fillRect(88, 142, width - 176, 2);
    ctx.font = '24px Georgia';
    ctx.textAlign = 'left';
    const lines = page === 1
      ? ['The human whose name is written in', 'this note shall die.', '', 'This note will not take effect unless', 'the writer has the person’s face in', 'their mind when writing their name.']
      : ['The rule pages will be typeset here in', 'the next milestone.', '', 'This page exists to validate the paper,', 'binding and page-turning system.'];
    lines.forEach((line, index) => ctx.fillText(line, 86, 220 + index * 50));
    ctx.font = '18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(String(page), width / 2, height - 55);
  });
}

export function makeNotebookPageTexture(page = 6, written = false) {
  return canvasTexture(768, 1024, (ctx, width, height) => {
    ctx.fillStyle = '#deded8';
    ctx.fillRect(0, 0, width, height);
    const shade = ctx.createLinearGradient(0, 0, width, 0);
    shade.addColorStop(0, 'rgba(62,62,58,.13)');
    shade.addColorStop(.12, 'rgba(255,255,255,.09)');
    shade.addColorStop(1, 'rgba(35,35,32,.05)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(82,88,86,.48)';
    ctx.lineWidth = 2;
    for (let y = 94; y < height - 58; y += 54) {
      ctx.beginPath();
      ctx.moveTo(42, y);
      ctx.lineTo(width - 36, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(78,60,58,.55)';
    ctx.beginPath();
    ctx.moveTo(98, 42);
    ctx.lineTo(98, height - 38);
    ctx.stroke();

    ctx.fillStyle = '#222320';
    ctx.textAlign = 'center';
    ctx.font = '18px Georgia';
    ctx.fillText(String(page), width / 2, height - 28);

    if (page === 6) {
      ctx.save();
      ctx.translate(136, 310);
      ctx.rotate(-.055);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#141512';
      ctx.font = '56px "Segoe Print", "Comic Sans MS", cursive';
      ctx.fillText('LIND L. TAILOR', 0, 0);
      ctx.restore();
    }
    if (written) {
      ctx.save();
      ctx.translate(136, page === 6 ? 472 : 310);
      ctx.rotate(.025);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#11120f';
      ctx.font = '54px "Segoe Print", "Comic Sans MS", cursive';
      ctx.fillText('LIGHT YAGAMI', 0, 0);
      ctx.restore();
    }
  });
}
