import * as THREE from 'three';

function seeded(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function canvasTexture(size, draw, repeat = [1, 1]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  draw(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.anisotropy = 4;
  return texture;
}

function speckle(context, size, count, colors, seed) {
  const random = seeded(seed);
  for (let i = 0; i < count; i += 1) {
    context.fillStyle = colors[Math.floor(random() * colors.length)];
    const radius = .3 + random() * 2.3;
    context.globalAlpha = .08 + random() * .28;
    context.beginPath();
    context.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function makeStone() {
  return canvasTexture(512, (context, size) => {
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#746a64');
    gradient.addColorStop(.5, '#4f4946');
    gradient.addColorStop(1, '#8b7e74');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const random = seeded(92);
    for (let i = 0; i < 35; i += 1) {
      context.strokeStyle = i % 5 === 0 ? '#3b2422' : '#a39184';
      context.globalAlpha = .12 + random() * .25;
      context.lineWidth = .6 + random() * 2.5;
      context.beginPath();
      let x = random() * size;
      let y = -10;
      context.moveTo(x, y);
      for (let step = 0; step < 8; step += 1) {
        x += (random() - .48) * 90;
        y += 75;
        context.lineTo(x, y);
      }
      context.stroke();
    }
    speckle(context, size, 1800, ['#241f1d', '#c0aa9b', '#6d3934'], 14);
  }, [2, 2]);
}

function makeFloor() {
  return canvasTexture(512, (context, size) => {
    const gradient = context.createRadialGradient(size * .45, size * .4, 20, size / 2, size / 2, size * .72);
    gradient.addColorStop(0, '#504a40');
    gradient.addColorStop(.55, '#302f2b');
    gradient.addColorStop(1, '#191d1a');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    speckle(context, size, 2600, ['#998d76', '#111512', '#26372d', '#5f2322'], 55);

    const random = seeded(841);
    for (let crack = 0; crack < 58; crack += 1) {
      let x = random() * size;
      let y = random() * size;
      context.strokeStyle = random() > .82 ? 'rgba(120,22,24,.48)' : 'rgba(9,12,10,.72)';
      context.lineWidth = .7 + random() * 2.1;
      context.beginPath();
      context.moveTo(x, y);
      for (let step = 0; step < 3 + Math.floor(random() * 6); step += 1) {
        x += (random() - .5) * 54;
        y += (random() - .5) * 54;
        context.lineTo(x, y);
      }
      context.stroke();
    }

    context.save();
    context.translate(size / 2, size / 2);
    context.strokeStyle = 'rgba(96,28,27,.34)';
    context.lineWidth = 3;
    for (const radius of [75, 132, 205]) {
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
    }
    for (let ray = 0; ray < 12; ray += 1) {
      const angle = ray * Math.PI / 6;
      context.beginPath();
      context.moveTo(Math.cos(angle) * 70, Math.sin(angle) * 70);
      context.lineTo(Math.cos(angle + .16) * 220, Math.sin(angle + .16) * 220);
      context.stroke();
    }
    context.restore();
  }, [2, 4]);
}

function makeMetal() {
  return canvasTexture(256, (context, size) => {
    const gradient = context.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, '#0d0b0b');
    gradient.addColorStop(.27, '#55463e');
    gradient.addColorStop(.45, '#171313');
    gradient.addColorStop(.75, '#695047');
    gradient.addColorStop(1, '#0e0b0b');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const random = seeded(78);
    for (let i = 0; i < 260; i += 1) {
      context.fillStyle = random() > .8 ? '#74262a' : '#0b0808';
      context.globalAlpha = random() * .35;
      context.fillRect(0, random() * size, size, .3 + random());
    }
    context.globalAlpha = 1;
  }, [2, 2]);
}

function makeWood() {
  return canvasTexture(512, (context, size) => {
    const gradient = context.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, '#150809');
    gradient.addColorStop(.5, '#3c1714');
    gradient.addColorStop(1, '#100708');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const random = seeded(120);
    for (let i = 0; i < 130; i += 1) {
      const y = random() * size;
      context.strokeStyle = i % 4 ? '#54241c' : '#080404';
      context.globalAlpha = .18 + random() * .32;
      context.lineWidth = .5 + random() * 2;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(size * .28, y + random() * 18, size * .7, y - random() * 22, size, y + random() * 10);
      context.stroke();
    }
    context.globalAlpha = 1;
  }, [2, 2]);
}

function makePaper() {
  return canvasTexture(512, (context, size) => {
    const gradient = context.createRadialGradient(size / 2, size / 2, 30, size / 2, size / 2, size * .7);
    gradient.addColorStop(0, '#b7a183');
    gradient.addColorStop(.75, '#79644e');
    gradient.addColorStop(1, '#39261f');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    speckle(context, size, 2200, ['#28120f', '#e2d0ae', '#7e1518'], 990);
    const random = seeded(220);
    context.strokeStyle = 'rgba(33, 12, 11, .78)';
    context.lineWidth = 2;
    for (let line = 0; line < 12; line += 1) {
      const y = 90 + line * 25;
      context.beginPath();
      context.moveTo(65, y);
      context.bezierCurveTo(160, y - 7, 255, y + 8, 445 - random() * 50, y);
      context.stroke();
    }
    context.strokeStyle = 'rgba(98, 12, 18, .9)';
    context.lineWidth = 5;
    context.beginPath();
    context.arc(size / 2, 360, 56, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = -Math.PI / 2 + i * Math.PI / 4;
      const radius = i % 2 ? 27 : 54;
      const x = size / 2 + Math.cos(angle) * radius;
      const y = 360 + Math.sin(angle) * radius;
      if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.closePath();
    context.stroke();
  });
}

function drawCoverSigil(context, size, variant) {
  context.save();
  context.translate(size / 2, size / 2);
  context.strokeStyle = variant === 1 ? '#69503a' : variant === 2 ? '#4c1516' : '#302824';
  context.shadowColor = variant === 2 ? '#8d151a' : '#17110f';
  context.shadowBlur = variant === 2 ? 11 : 4;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 12;
  context.strokeRect(-205, -220, 410, 440);
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(-245, 0);
  context.lineTo(245, 0);
  context.moveTo(-154, -250);
  context.lineTo(-154, 250);
  context.stroke();
  context.fillStyle = variant === 1 ? '#9a7650' : '#50433b';
  for (const x of [-210, -154, 210]) {
    for (const y of [-205, -100, 0, 100, 205]) {
      context.beginPath();
      context.arc(x, y, 6, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function makeCover(variant) {
  const palettes = [
    ['#161514', '#4b4540', '#080706'],
    ['#241d16', '#72563d', '#110d09'],
    ['#1e0c0d', '#671e20', '#090505'],
  ];
  return canvasTexture(512, (context, size) => {
    const gradient = context.createRadialGradient(210, 180, 15, 255, 255, 370);
    gradient.addColorStop(0, palettes[variant][1]);
    gradient.addColorStop(.55, palettes[variant][0]);
    gradient.addColorStop(1, palettes[variant][2]);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const flecks = variant === 1
      ? ['#000000', '#b08b62', '#57412e']
      : variant === 2 ? ['#000000', '#8a3831', '#5e1115'] : ['#000000', '#8a7a6c', '#352d29'];
    speckle(context, size, 3100, flecks, 300 + variant);
    drawCoverSigil(context, size, variant);
  });
}

function makeDoor() {
  return canvasTexture(512, (context, size) => {
    context.fillStyle = '#181211';
    context.fillRect(0, 0, size, size);
    context.strokeStyle = '#46332e';
    context.lineWidth = 15;
    context.strokeRect(18, 18, size - 36, size - 36);
    context.lineWidth = 5;
    context.strokeRect(50, 50, size - 100, size - 100);
    const random = seeded(633);
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        const cx = 145 + x * 220;
        const cy = 100 + y * 105;
        context.strokeStyle = y === 1 ? '#68141a' : '#372925';
        context.lineWidth = 7;
        context.beginPath();
        context.arc(cx, cy, 32 + random() * 18, 0, Math.PI * 2);
        context.stroke();
      }
    }
    speckle(context, size, 1100, ['#786059', '#000000', '#541115'], 640);
  });
}

function configureLoadedTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return texture;
}

function atlasCrop(source, x, y, width, height) {
  const texture = source.clone();
  const imageWidth = source.image.width;
  const imageHeight = source.image.height;
  texture.repeat.set(width / imageWidth, height / imageHeight);
  texture.offset.set(x / imageWidth, (imageHeight - y - height) / imageHeight);
  texture.needsUpdate = true;
  return texture;
}

function spreadPage(source, side) {
  const texture = source.clone();
  texture.repeat.set(.47, .9);
  texture.offset.set(side === 0 ? .015 : .515, .05);
  texture.needsUpdate = true;
  return texture;
}

export async function createTextures() {
  const loader = new THREE.TextureLoader();
  const [coverAtlas, manuscript, prop, screen, entranceRelief] = await Promise.all([
    loader.loadAsync('/assets/darkhold-cover-variants.png'),
    loader.loadAsync('/assets/pages/spread-manuscript.jpg'),
    loader.loadAsync('/assets/pages/spread-prop.jpg'),
    loader.loadAsync('/assets/pages/spread-screen.jpg'),
    loader.loadAsync('/assets/references/entrance-relief-user.png'),
  ]);
  [coverAtlas, manuscript, prop, screen, entranceRelief].forEach(configureLoadedTexture);
  entranceRelief.repeat.set(.78, 1);
  entranceRelief.offset.set(.11, 0);
  // Crop around the six photographed covers, excluding the white collage gutters.
  const coverTiles = [
    atlasCrop(coverAtlas, 0, 0, 216, 357),
    atlasCrop(coverAtlas, 236, 0, 265, 357),
    atlasCrop(coverAtlas, 522, 0, 278, 357),
    atlasCrop(coverAtlas, 0, 372, 216, 319),
    atlasCrop(coverAtlas, 236, 372, 265, 319),
    atlasCrop(coverAtlas, 522, 372, 278, 319),
  ];

  return {
    stone: makeStone(),
    floor: makeFloor(),
    metal: makeMetal(),
    wood: makeWood(),
    paper: makePaper(),
    door: makeDoor(),
    entranceRelief,
    covers: coverTiles,
    coverFallbacks: [makeCover(0), makeCover(1), makeCover(2)],
    pages: [
      spreadPage(manuscript, 0),
      spreadPage(manuscript, 1),
      spreadPage(prop, 0),
      spreadPage(prop, 1),
      spreadPage(screen, 0),
      spreadPage(screen, 1),
    ],
  };
}
