import * as THREE from 'three';

const canvasTexture = (width, height, painter, colorSpace = THREE.SRGBColorSpace) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  painter(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
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
    ['#0c0d0c', '#252724', '#050505'],       // Original: near-black leather
    ['#0e1a12', '#1e4228', '#061008'],        // Green-black: visible dark green grain
    ['#1a120c', '#3e2a1a', '#0c0804'],        // Umber-black: warm brown grain
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
      ctx.globalAlpha = .12 + random() * .25;
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
  return canvasTexture(1536, 1080, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width * 0.52, height * 0.36);
    ctx.rotate(-0.048);

    // Subtle drop shadow / deboss
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = 'bold 88px "Cinzel", "Times New Roman", "Palatino Linotype", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '14px';
    ctx.fillText('DEATH NOTE', 3, 5);

    // Sharp bone-white silver text
    ctx.fillStyle = '#f5f2e9';
    ctx.fillText('DEATH NOTE', 0, 0);

    // Weathered highlights on lettering
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('DEATH NOTE', -1, -1);

    ctx.restore();
  });
}

const RULES_DATA = [
  {
    numeral: 'I',
    rules: [
      'The human whose name is written in this note shall die.',
      'This note will not take effect unless the writer has the person’s face in their mind when writing their name. Therefore, people sharing the same name will not be affected.',
      'If the cause of death is written within the next 40 seconds of writing the person’s name, it will happen.',
      'If the cause of death is not specified, the person will simply die of a heart attack.',
      'After writing the cause of death, details of the death should be written in the next 6 minutes and 40 seconds.',
    ],
  },
  {
    numeral: 'II',
    rules: [
      'This note shall become the property of the human world, once it touches the ground of (arrives in) the human world.',
      'The owner of the note can recognize the image and voice of its original owner, i.e. a god of death.',
      'The human who uses this note can neither go to Heaven nor Hell for eternity.',
      'If the time of death is written within 40 seconds after writing the cause of death as a heart attack, the time of death can be manipulated.',
    ],
  },
  {
    numeral: 'III',
    rules: [
      'The person who touches the Death Note can recognize the image and voice of its original owner, even if that person is not the owner of the note.',
      'The human in possession of the Death Note is accompanied by a god of death, its original owner, until that human dies.',
      'If a human uses the note, a god of death usually appears within 39 days after he/she first writes in it.',
    ],
  },
  {
    numeral: 'IV',
    rules: [
      'The human who has the Death Note can obtain the Eyes of the Shinigami in exchange for half of their remaining lifespan.',
      'The conditions for death will not be realized unless it is physically possible for that human or reasonably assumed.',
      'One page taken from the Death Note, or even a fragment of the page, possesses the full power of the note.',
    ],
  },
  {
    numeral: 'V',
    rules: [
      'The instrument to write with can be anything (e.g. ink, lead, blood), as long as it can write directly onto the note.',
      'You may also write the cause and/or details of death prior to filling in the name of the individual.',
      'The specific manner and conditions of death can be modified within 6 minutes and 40 seconds.',
    ],
  },
];

function drawWrappedParagraph(ctx, text, x, y, maxWidth, lineHeight, stroke = false) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      if (stroke) ctx.strokeText(line.trim(), x, curY);
      ctx.fillText(line.trim(), x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (stroke) ctx.strokeText(line.trim(), x, curY);
  ctx.fillText(line.trim(), x, curY);
  return curY + lineHeight;
}

export function makeRulePageTexture(page = 1) {
  const pageIndex = Math.max(0, Math.min(RULES_DATA.length - 1, page - 1));
  const data = RULES_DATA[pageIndex];

  return canvasTexture(1536, 2048, (ctx, width, height) => {
    // Dark slate obsidian aged parchment
    ctx.fillStyle = '#111315';
    ctx.fillRect(0, 0, width, height);

    // Subtle paper grain and vignetting
    const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.75);
    vignette.addColorStop(0, 'rgba(28, 30, 32, 0.6)');
    vignette.addColorStop(0.7, 'rgba(14, 15, 17, 0.4)');
    vignette.addColorStop(1, 'rgba(6, 7, 8, 0.85)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Gutter shading along spine edge
    const gutter = ctx.createLinearGradient(0, 0, width * 0.15, 0);
    gutter.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    gutter.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gutter;
    ctx.fillRect(0, 0, width * 0.15, height);

    // Ornate double border
    ctx.strokeStyle = 'rgba(215, 210, 195, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(90, 90, width - 180, height - 180);
    ctx.strokeStyle = 'rgba(215, 210, 195, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(102, 102, width - 204, height - 204);

    // Corner decorative markers
    const corners = [
      [90, 90], [width - 90, 90],
      [90, height - 90], [width - 90, height - 90],
    ];
    ctx.fillStyle = 'rgba(225, 220, 205, 0.45)';
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx - 5, cy - 5, 10, 10);
    }

    // Header: "HOW TO USE IT"
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#f4f0e6';
    ctx.font = 'bold 64px "Palatino Linotype", "Georgia", "Times New Roman", serif';
    ctx.letterSpacing = '8px';
    ctx.strokeStyle = 'rgba(244, 240, 230, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeText('HOW TO USE IT', width / 2, 150);
    ctx.fillText('HOW TO USE IT', width / 2, 150);

    // Roman numeral
    ctx.font = 'bold 44px "Palatino Linotype", "Georgia", serif';
    ctx.letterSpacing = '4px';
    ctx.fillStyle = '#dcd7c8';
    ctx.fillText(data.numeral, width / 2, 230);

    // Decorative divider under header
    ctx.strokeStyle = 'rgba(225, 220, 205, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(180, 305);
    ctx.lineTo(width / 2 - 25, 305);
    ctx.moveTo(width / 2 + 25, 305);
    ctx.lineTo(width - 180, 305);
    ctx.stroke();

    // Center diamond ornament
    ctx.beginPath();
    ctx.moveTo(width / 2, 297);
    ctx.lineTo(width / 2 + 8, 305);
    ctx.lineTo(width / 2, 313);
    ctx.lineTo(width / 2 - 8, 305);
    ctx.closePath();
    ctx.fill();

    // Rules text
    ctx.letterSpacing = '0px';
    ctx.textAlign = 'left';
    ctx.font = 'bold 36px "Palatino Linotype", "Georgia", "Times New Roman", serif';
    ctx.fillStyle = '#f0ece1';

    let currentY = 375;
    const maxWidth = width - 360;
    const textStartX = 180;

    data.rules.forEach((rule) => {
      // Bullet dot
      ctx.fillStyle = 'rgba(235, 230, 215, 0.75)';
      ctx.beginPath();
      ctx.arc(textStartX - 25, currentY + 18, 6, 0, Math.PI * 2);
      ctx.fill();

      // Rule text — bold and stroked for clarity
      ctx.fillStyle = '#f2efe5';
      ctx.strokeStyle = 'rgba(240, 236, 225, 0.4)';
      ctx.lineWidth = 1;
      currentY = drawWrappedParagraph(ctx, rule, textStartX, currentY, maxWidth, 50, true);
      currentY += 28; // Paragraph spacing
    });

    // Page Number
    ctx.textAlign = 'center';
    ctx.font = '26px "Palatino Linotype", "Georgia", serif';
    ctx.fillStyle = 'rgba(215, 210, 195, 0.4)';
    ctx.fillText(String(page), width / 2, height - 130);
  });
}

const NOTEBOOK_PAGES_DATA = {
  6: {
    title: '1998 — SHINJUKU & TOKYO TEST INCIDENTS',
    entries: [
      { name: 'KURO OTOHARADA', details: '1998.11.23 — Heart Attack (Hostage crisis at nursery)', angle: -0.015, dx: 0 },
      { name: 'TAKUO SHIBUIMARU', details: '1998.11.23 — Fatal collision with truck (Motorcycle crash)', angle: 0.012, dx: 5 },
      { name: 'LIND L. TAILOR', details: '1998.12.05 — Sudden fatal cardiac arrest during live television broadcast', angle: -0.02, dx: -2 },
      { name: 'KIICHIRO OSORADA', details: '1998.12.14 — Heart attack after escaping the hijacked bus', angle: 0.01, dx: 3 },
    ],
    writtenAdditions: [
      { name: 'RAYE PENBER', details: '1998.12.27 — Fatal cardiac arrest upon stepping off Yamanote subway line', angle: -0.018, dx: -4 },
      { name: 'NAOMI MISORA', details: '1999.01.01 — Suicide by hanging in secluded area; body not to be found', angle: 0.015, dx: 2 },
    ],
  },
  7: {
    title: '1998 — INVESTIGATION TARGETS: FBI TEAM',
    entries: [
      { name: 'RAYE PENBER', details: '1998.12.27 — Fatal cardiac arrest upon stepping off Yamanote subway line', angle: -0.016, dx: -2 },
      { name: 'NAOMI MISORA', details: '1999.01.01 — Suicide by hanging in secluded area; body not to be found', angle: 0.014, dx: 3 },
      { name: 'MARK DWELL', details: '1998.12.27 — Sudden cardiac arrest while riding subway car #4', angle: -0.01, dx: 1 },
      { name: 'FREDDIE DELMONT', details: '1998.12.27 — Fatal heart attack inside hotel room 302', angle: 0.018, dx: -3 },
    ],
    writtenAdditions: [
      { name: 'QUENTIN BARRON', details: '1998.12.27 — Heart attack after transmitting final message', angle: -0.012, dx: 2 },
    ],
  },
  8: {
    title: '1999 — PENITENTIARY CORRECTIONAL TARGETS',
    entries: [
      { name: 'SANCHEZ MARTEZ', details: '1999.01.15 — Fatal cardiac arrest in maximum security block A', angle: 0.012, dx: 2 },
      { name: 'EDDIE COLLINS', details: '1999.01.20 — Multiple organ failure while awaiting capital sentencing', angle: -0.015, dx: -1 },
      { name: 'ALAN HUMPHRIES', details: '1999.01.28 — Sudden heart stoppage during morning exercise yard', angle: 0.018, dx: 4 },
      { name: 'BORIS KALEVICH', details: '1999.02.04 — Cardiac arrest in solitary confinement cell #7', angle: -0.012, dx: -3 },
    ],
    writtenAdditions: [
      { name: 'DARIUS VANCE', details: '1999.02.08 — Heart failure inside medical ward', angle: 0.01, dx: 0 },
    ],
  },
  9: {
    title: '1999 — RULE TESTING & BEHAVIORAL EXPERIMENTS',
    entries: [
      { name: 'PRISONER 482 (N. SHIRAHAMA)', details: '1999.02.10 — Writes a dying message in own blood on wall, then dies', angle: -0.014, dx: 0 },
      { name: 'PRISONER 591 (K. MATSUDAIRA)', details: '1999.02.12 — Escapes cell to bathroom, draws star on wall, dies of heart attack', angle: 0.012, dx: 3 },
      { name: 'PRISONER 614 (T. INOUE)', details: '1999.02.15 — Attempts to travel to France within 1 hour; physically impossible, dies', angle: -0.02, dx: -2 },
      { name: 'PRISONER 708 (H. YANAGI)', details: '1999.02.18 — Dies of heart attack after writing secret letter to police', angle: 0.015, dx: 1 },
    ],
    writtenAdditions: [
      { name: 'EXPERIMENT #05 (RULE VERIFICATION)', details: 'Confirmed: Causes leading to collateral death of others default to heart attack', angle: -0.01, dx: 2 },
    ],
  },
  10: {
    title: '2004 — YOTSUBA GROUP & SYNDICATE EXECUTIONS',
    entries: [
      { name: 'KYOSUKE HIGUCHI', details: '2004.10.28 — Fatal heart attack inside police highway transport vehicle', angle: -0.018, dx: -3 },
      { name: 'ROD ROSS', details: '2004.11.12 — Accidental gunshot wound inside underground facility', angle: 0.015, dx: 2 },
      { name: 'JACK NYDEVICK', details: '2004.11.15 — Fatal cardiac arrest during hostage raid', angle: -0.012, dx: 4 },
      { name: 'KAL SNYDAR', details: '2004.11.18 — Heart failure after delivering notebook coordinates to Kira', angle: 0.02, dx: -1 },
    ],
    writtenAdditions: [
      { name: 'YOTSUBA EXECUTIVE BOARD', details: '2004.12.01 — Systematic heart failures across corporate leadership', angle: -0.015, dx: 1 },
    ],
  },
  11: {
    title: '2009–2010 — SPK & FINAL CONFRONTATION',
    entries: [
      { name: 'STEVE MASON', details: '2009.03.11 — Fatal cardiac arrest in director office at 16:40', angle: -0.015, dx: 0 },
      { name: 'HITOSHI DEMEGAWA', details: '2010.01.18 — Sudden heart attack during live Kira broadcast on Sakura TV', angle: 0.018, dx: 3 },
      { name: 'KIYOMI TAKADA', details: '2010.01.26 — Suicide by self-immolation in transport truck at 14:33', angle: -0.02, dx: -2 },
      { name: 'TERU MIKAMI', details: '2010.01.28 — Self-inflicted fatal wounds in warehouse holding area', angle: 0.012, dx: 4 },
    ],
    writtenAdditions: [
      { name: 'L (L LAWLIET)', details: '2004.11.05 — Sudden fatal cardiac arrest in task force monitoring headquarters', angle: -0.01, dx: 1 },
    ],
  },
  12: {
    title: 'NEW INSCRIBED TARGETS — UNMARKED SPREAD',
    entries: [
      { name: 'CRIMINAL TARGET IDENTIFIER #104', details: 'Confirmed fugitive wanted by international police tribunal', angle: -0.012, dx: 0 },
      { name: 'SYNDICATE BROKER REZANOV', details: 'Active supplier of illicit arms in metropolitan district', angle: 0.016, dx: 3 },
    ],
    writtenAdditions: [
      { name: 'JUSTICE WILL PREVAIL', details: 'I am the God of the New World.', angle: -0.015, dx: 2 },
    ],
  },
};

export function makeNotebookPageTexture(page = 6, written = false) {
  const pageData = NOTEBOOK_PAGES_DATA[page] || NOTEBOOK_PAGES_DATA[12];

  return canvasTexture(1536, 2048, (ctx, width, height) => {
    // Creamy aged lined notebook paper
    ctx.fillStyle = '#f2eedf';
    ctx.fillRect(0, 0, width, height);

    // Paper fibers and subtle weathering
    const shade = ctx.createLinearGradient(0, 0, width, 0);
    shade.addColorStop(0, 'rgba(65, 55, 40, 0.16)');
    shade.addColorStop(0.1, 'rgba(255, 255, 250, 0.05)');
    shade.addColorStop(0.9, 'rgba(255, 255, 250, 0.03)');
    shade.addColorStop(1, 'rgba(50, 40, 30, 0.12)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);

    // Fine horizontal ruling lines
    const lineSpacing = 72;
    const firstLineY = 220;
    const lastLineY = height - 160;

    ctx.strokeStyle = 'rgba(95, 110, 125, 0.38)';
    ctx.lineWidth = 1.8;
    for (let y = firstLineY; y <= lastLineY; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(80, y);
      ctx.lineTo(width - 80, y);
      ctx.stroke();
    }

    // Red vertical margin line
    ctx.strokeStyle = 'rgba(195, 75, 75, 0.45)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(220, 100);
    ctx.lineTo(220, height - 100);
    ctx.stroke();

    // Page header title
    ctx.fillStyle = '#1c1812';
    ctx.font = 'bold 36px "Palatino Linotype", "Georgia", serif';
    ctx.letterSpacing = '3px';
    ctx.textAlign = 'left';
    ctx.strokeStyle = '#1c1812';
    ctx.lineWidth = 1.2;
    ctx.strokeText(pageData.title, 260, 150);
    ctx.fillText(pageData.title, 260, 150);

    // Page number in corner
    ctx.font = 'bold 36px "Palatino Linotype", "Georgia", serif';
    ctx.letterSpacing = '1px';
    ctx.textAlign = 'right';
    ctx.fillText(`PAGE ${page}`, width - 120, 150);

    // Handwritten entries by Light Yagami in deep high-contrast black fountain pen ink
    const inkBlack = '#000000';
    const inkDetail = '#11131a';
    const textX = 260;

    let lineSlot = 1;
    pageData.entries.forEach((entry) => {
      ctx.save();
      ctx.translate(textX + entry.dx, firstLineY + lineSpacing * lineSlot - 18);
      ctx.rotate(entry.angle);
      ctx.textAlign = 'left';

      // Name — ultra bold heavy stroke for unmistakable fountain pen ink look
      ctx.fillStyle = inkBlack;
      ctx.strokeStyle = inkBlack;
      ctx.lineWidth = 4.2;
      ctx.font = '900 68px "Palatino Linotype", "Georgia", "Times New Roman", serif';
      ctx.letterSpacing = '3.5px';
      ctx.strokeText(entry.name, 0, 0);
      ctx.fillText(entry.name, 0, 0);

      // Details — bold italic with distinct stroke for sharp clarity
      ctx.fillStyle = inkDetail;
      ctx.strokeStyle = inkDetail;
      ctx.lineWidth = 1.4;
      ctx.font = 'italic bold 40px "Palatino Linotype", "Georgia", "Times New Roman", serif';
      ctx.letterSpacing = '1.2px';
      ctx.strokeText(entry.details, 18, 48);
      ctx.fillText(entry.details, 18, 48);
      ctx.restore();

      lineSlot += 2;
    });

    // Dynamic additions when written
    if (written && pageData.writtenAdditions) {
      pageData.writtenAdditions.forEach((add) => {
        if (firstLineY + lineSpacing * lineSlot - 18 < lastLineY) {
          ctx.save();
          ctx.translate(textX + add.dx, firstLineY + lineSpacing * lineSlot - 18);
          ctx.rotate(add.angle);
          ctx.textAlign = 'left';

          ctx.fillStyle = inkBlack;
          ctx.strokeStyle = inkBlack;
          ctx.lineWidth = 4.2;
          ctx.font = '900 68px "Palatino Linotype", "Georgia", "Times New Roman", serif';
          ctx.letterSpacing = '3.5px';
          ctx.strokeText(add.name, 0, 0);
          ctx.fillText(add.name, 0, 0);

          ctx.fillStyle = inkDetail;
          ctx.strokeStyle = inkDetail;
          ctx.lineWidth = 1.4;
          ctx.font = 'italic bold 40px "Palatino Linotype", "Georgia", "Times New Roman", serif';
          ctx.letterSpacing = '1.2px';
          ctx.strokeText(add.details, 18, 48);
          ctx.fillText(add.details, 18, 48);
          ctx.restore();

          lineSlot += 2;
        }
      });
    }
  });
}

export function makePageBackTexture(page = 1) {
  const frontData = NOTEBOOK_PAGES_DATA[page];

  return canvasTexture(1536, 2048, (ctx, width, height) => {
    // Reverse side of page — bright, authentic ivory-white lined Death Note notebook paper
    ctx.fillStyle = '#faf7ee';
    ctx.fillRect(0, 0, width, height);

    // Subtle paper gradient
    const shade = ctx.createLinearGradient(width, 0, 0, 0);
    shade.addColorStop(0, 'rgba(65, 55, 40, 0.12)');
    shade.addColorStop(0.08, 'rgba(255, 255, 255, 0.05)');
    shade.addColorStop(0.92, 'rgba(255, 255, 255, 0.03)');
    shade.addColorStop(1, 'rgba(50, 40, 30, 0.09)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);

    // Clean horizontal ruling lines across the page
    const lineSpacing = 72;
    const firstLineY = 220;
    const lastLineY = height - 160;

    ctx.strokeStyle = 'rgba(95, 110, 125, 0.38)';
    ctx.lineWidth = 1.8;
    for (let y = firstLineY; y <= lastLineY; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(80, y);
      ctx.lineTo(width - 80, y);
      ctx.stroke();
    }

    // Red vertical margin line on spine side (width - 220)
    ctx.strokeStyle = 'rgba(195, 75, 75, 0.45)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(width - 220, 100);
    ctx.lineTo(width - 220, height - 100);
    ctx.stroke();

    // Top header on back page
    ctx.fillStyle = 'rgba(55, 50, 40, 0.75)';
    ctx.font = 'bold 30px "Palatino Linotype", "Georgia", serif';
    ctx.letterSpacing = '3px';
    ctx.textAlign = 'right';
    ctx.fillText('DEATH NOTE', width - 260, 150);

    ctx.textAlign = 'left';
    ctx.letterSpacing = '1px';
    ctx.fillText(`PAGE ${page} (VERSO)`, 120, 150);

    // Realistic ink bleed-through / show-through from the front side
    if (frontData && frontData.entries) {
      const showThroughColor = 'rgba(12, 16, 24, 0.14)';
      let slot = 1;
      frontData.entries.forEach((entry) => {
        ctx.save();
        const bleedY = firstLineY + lineSpacing * slot - 18;
        ctx.translate(width - 260 - entry.dx, bleedY);
        ctx.scale(-1, 1); // Mirrored from the back
        ctx.rotate(entry.angle);
        ctx.textAlign = 'left';

        ctx.fillStyle = showThroughColor;
        ctx.font = '900 68px "Palatino Linotype", "Georgia", "Times New Roman", serif';
        ctx.letterSpacing = '3.5px';
        ctx.fillText(entry.name, 0, 0);

        ctx.font = 'italic bold 40px "Palatino Linotype", "Georgia", "Times New Roman", serif';
        ctx.letterSpacing = '1.2px';
        ctx.fillText(entry.details, 18, 48);
        ctx.restore();

        slot += 2;
      });
    } else {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(80, 75, 65, 0.22)';
      ctx.font = 'italic 34px "Palatino Linotype", "Georgia", serif';
      ctx.fillText('— The use of the Death Note shall not affect a human’s original lifespan —', width / 2, height / 2);
      ctx.restore();
    }
  });
}
