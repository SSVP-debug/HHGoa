// Draws the Builder ID card to an offscreen canvas at 3x resolution for a
// crisp, social-ready PNG export. Kept in lockstep with BuilderCard.jsx —
// whatever the DOM card shows, this should reproduce.

import { getEventQrDataUrl } from "./qr.js";

const W = 1080; // export width (3x of a 360 card)
const H = Math.round((1080 * 16) / 9);

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCoverImage(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;
  if (imgRatio > boxRatio) {
    sh = img.height;
    sw = sh * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

const RARITY_COLOR = {
  Common: "rgba(251,246,233,0.55)",
  Rare: "#FEE101",
  Epic: "#FF0080",
  Legendary: "#FEE101", // gradient handled separately where it matters most (title)
};

// Canvas text rendering needs the webfonts actually loaded first, or it
// silently falls back to a system serif/sans and the export won't match
// the on-screen card.
async function ensureFontsReady() {
  const specs = [
    "400 56px 'Rozha One'",
    "700 30px 'Baloo 2'",
    "800 15px 'Baloo 2'",
    "600 22px 'JetBrains Mono'",
  ];
  try {
    await Promise.all(specs.map((s) => document.fonts.load(s)));
    await document.fonts.ready;
  } catch {
    // best effort — if font loading APIs aren't available, proceed anyway
  }
}

export async function renderBuilderCardToCanvas({
  photoUrl,
  name,
  title,
  mode,
  stack,
  team,
  builderNumber,
  serial,
  rarity = "Common",
  dna,
}) {
  await ensureFontsReady();

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const r = 48; // corner radius at export scale

  roundedRectPath(ctx, 0, 0, W, H, r);
  ctx.clip();

  // base — official HH Goa green, flat (the brand has no gradients)
  ctx.fillStyle = "#0B6839";
  ctx.fillRect(0, 0, W, H);

  // photo block (top 56%)
  const photoH = H * 0.56;
  const img = await loadImage(photoUrl);
  drawCoverImage(ctx, img, 0, 0, W, photoH);

  // fade to the card green at the bottom of the photo
  const fade = ctx.createLinearGradient(0, photoH * 0.55, 0, photoH);
  fade.addColorStop(0, "rgba(11,104,57,0)");
  fade.addColorStop(1, "rgba(11,104,57,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, W, photoH);

  // official diamond border-strip pattern as the seam, tiled across
  let borderImg = null;
  try {
    borderImg = await loadImage("/brand/border-strip.svg");
  } catch {
    borderImg = null;
  }
  const seamY = photoH;
  const stripH = 18;
  if (borderImg) {
    const tileW = stripH * (borderImg.width / borderImg.height);
    let x = 0;
    while (x < W) {
      ctx.drawImage(borderImg, x, seamY - stripH / 2, tileW, stripH);
      x += tileW;
    }
  }

  // perforation dots along top edge
  ctx.fillStyle = "rgba(3,26,14,0.45)";
  const dots = 14;
  for (let i = 0; i < dots; i++) {
    const dx = 40 + i * ((W - 80) / (dots - 1));
    ctx.beginPath();
    ctx.arc(dx, 24, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // text content — simplified hierarchy mirrored from BuilderCard.jsx:
  // name -> title -> compact identity tags -> builder id / number. No
  // "VERIFIED" claim anywhere — there is no attendee-auth system behind
  // this, so the card only ever states what's actually true.
  const padX = 56;
  let ty = seamY + 78;

  ctx.fillStyle = "#FBF6E9";
  ctx.font = "400 58px 'Rozha One'";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(truncate(ctx, name, W - padX * 2), padX, ty);

  ty += 42;
  const titleGrad = ctx.createLinearGradient(padX, 0, padX + 480, 0);
  titleGrad.addColorStop(0, "#FEE101");
  titleGrad.addColorStop(0.5, "#EDD723");
  titleGrad.addColorStop(1, "#FF0080");
  ctx.fillStyle = titleGrad;
  ctx.font = "700 28px 'Baloo 2'";
  ctx.fillText(title, padX, ty);

  // compact tag row: team, stack, build mode, rarity — small pill outlines,
  // wrapping to a second line if there isn't room, mirroring the DOM
  // card's flex-wrap so up to four tags never run off the canvas edge.
  ty += 40;
  let tagX = padX;
  let tagRowY = ty;
  const tagH = 30;
  const tagGapY = 10;
  const maxRight = W - padX;
  ctx.font = "700 14px 'Baloo 2'";
  const drawTag = (label, color) => {
    if (!label) return;
    const text = label.toUpperCase();
    const w = ctx.measureText(text).width + 22;
    if (tagX + w > maxRight && tagX > padX) {
      tagX = padX;
      tagRowY += tagH + tagGapY;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    roundedRectPath(ctx, tagX, tagRowY - tagH + 6, w, tagH, tagH / 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, tagX + 11, tagRowY - 4);
    tagX += w + 10;
  };
  drawTag(team ? `Team ${team}` : null, "#FEE101");
  drawTag(stack, "rgba(251,246,233,0.75)");
  drawTag(mode, "rgba(251,246,233,0.75)");
  drawTag(rarity, RARITY_COLOR[rarity] || RARITY_COLOR.Common);

  // bottom row: QR + Builder ID/serial/DNA (left) and Builder number + seal
  // (right). QR and seal are docked directly against their text block here
  // rather than floated at an independent y — floating them meant their
  // position depended on guessed whitespace that didn't actually match how
  // much room the DOM card leaves, and they ended up overlapping the tag
  // row above. Docking them to the bottom row's own fixed position means
  // that can't happen regardless of how much the name/title/tags wrap.
  const by = H - 90;
  const qrSize = 92;
  const sealSize = 100;
  const dockGap = 20;
  const leftTextX = padX + qrSize + dockGap;
  const rightTextEdge = W - padX - sealSize - dockGap;

  ctx.fillStyle = "rgba(251,246,233,0.4)";
  ctx.font = "600 16px 'JetBrains Mono'";
  ctx.fillText("BUILDER ID · 2026", leftTextX, by - 30);
  if (serial) {
    ctx.fillStyle = "rgba(251,246,233,0.3)";
    ctx.font = "400 15px 'JetBrains Mono'";
    ctx.fillText(serial, leftTextX, by - 6);
  }
  if (dna) {
    ctx.fillStyle = "rgba(251,246,233,0.4)";
    ctx.font = "500 15px 'JetBrains Mono'";
    ctx.fillText(`FOCUS ${dna.focus} · SHIP ${dna.ship}`, leftTextX, by + 20);
  }

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(251,246,233,0.4)";
  ctx.font = "600 18px 'JetBrains Mono'";
  ctx.fillText("BUILDER", rightTextEdge, by - 46);
  ctx.fillStyle = "#FEE101";
  ctx.font = "400 50px 'Rozha One'";
  ctx.fillText(builderNumber, rightTextEdge, by);

  ctx.textAlign = "left";

  // event QR, docked to the left of "BUILDER ID · 2026" — bottom-aligned
  // with the text block below it. Placeholder destination (hhgoa.com) for
  // now. White backing plate is load-bearing, not decorative — a QR needs
  // real contrast to scan reliably.
  try {
    const qr = await loadImage(getEventQrDataUrl());
    const qrX = padX;
    const qrY = by + 20 - qrSize;
    ctx.save();
    ctx.shadowColor = "rgba(3,26,14,0.5)";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = "#FBF6E9";
    roundedRectPath(ctx, qrX, qrY, qrSize, qrSize, 8);
    ctx.fill();
    ctx.restore();
    const pad = 8;
    ctx.drawImage(qr, qrX + pad, qrY + pad, qrSize - pad * 2, qrSize - pad * 2);
  } catch {
    // QR is decorative — export still succeeds without it
  }

  // the official गोवा seal, docked to the right of the builder number,
  // bottom-aligned to match the QR on the opposite side
  try {
    const seal = await loadImage("/brand/goa-seal.svg");
    const sealX = W - padX - sealSize / 2;
    const sealY = by - sealSize / 2 + 4;
    ctx.save();
    ctx.translate(sealX, sealY);
    ctx.rotate((-6 * Math.PI) / 180);
    ctx.shadowColor = "rgba(3,26,14,0.8)";
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 5;
    ctx.drawImage(seal, -sealSize / 2, -sealSize / 2, sealSize, sealSize);
    ctx.restore();
  } catch {
    // seal is decorative — export still succeeds without it
  }

  // border
  ctx.strokeStyle = "rgba(3,26,14,0.5)";
  ctx.lineWidth = 5;
  roundedRectPath(ctx, 3, 3, W - 6, H - 6, r);
  ctx.stroke();

  return canvas;
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

export async function exportCardAsPNG(params) {
  const canvas = await renderBuilderCardToCanvas(params);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 1);
  });
}
