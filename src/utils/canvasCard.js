// Draws the Builder ID card to an offscreen canvas at social-export
// resolution for a crisp, downloadable PNG. Kept in lockstep with
// BuilderCard.jsx — whatever the DOM card shows, this reproduces, down to
// the same focal-point photo crop, the same gradient stops, and the same
// stamp. If you change one, change the other.

import { getEventQrDataUrl } from "./qr.js";
import { computeFocalPosition, coverSourceRect } from "./smartCrop.js";

const W = 1080; // export width — social-first portrait canvas
const H = 1350; // 4:5, per spec (1080x1350)

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

// Draws `img` covering the x/y/w/h box, cropped around the same focal
// point BuilderCard.jsx uses for its CSS object-position — so the export
// never shows a different slice of the photo than the live preview did.
function drawCoverImage(ctx, img, x, y, w, h, focal) {
  const { sx, sy, sw, sh } = coverSourceRect(img.width, img.height, w, h, focal);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Places each character of `text` along a circular arc, centered on
// `centerAngle`. Mirrors what the DOM stamp gets for free from SVG
// <textPath> — canvas has no equivalent, so this reimplements it by hand.
// `inward` flips the baseline for text curving along the *bottom* of the
// circle so it reads upright rather than upside down.
function drawArcText(ctx, text, cx, cy, radius, { font, color, centerAngle, inward = false }) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = inward ? "top" : "bottom";
  const chars = [...text];
  const angularWidths = chars.map((ch) => ctx.measureText(ch).width / radius);
  const totalAngle = angularWidths.reduce((a, b) => a + b, 0);
  let angle = centerAngle - totalAngle / 2;
  ctx.translate(cx, cy);
  for (let i = 0; i < chars.length; i++) {
    angle += angularWidths[i] / 2;
    ctx.save();
    ctx.rotate(angle);
    if (inward) {
      ctx.translate(0, radius);
      ctx.rotate(Math.PI);
    } else {
      ctx.translate(0, -radius);
    }
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    angle += angularWidths[i] / 2;
  }
  ctx.restore();
}

// The passport/event-stamp badge — dashed ring, curved HH Goa copy top and
// bottom, the real Devanagari seal mark centered. Matches <Stamp/> in
// BuilderCard.jsx.
async function drawStamp(ctx, cx, cy, size) {
  const r = size / 2;
  const ringR = r - 6;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(3,26,14,0.55)";
  ctx.fill();
  ctx.strokeStyle = "rgba(251,246,233,0.7)";
  ctx.lineWidth = size * 0.013;
  ctx.setLineDash([size * 0.028, size * 0.038]);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, ringR - size * 0.075, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(254,225,1,0.55)";
  ctx.lineWidth = size * 0.009;
  ctx.stroke();
  ctx.restore();

  drawArcText(ctx, "HACKER HOUSE GOA", cx, cy, ringR - size * 0.16, {
    font: `700 ${Math.round(size * 0.082)}px 'Baloo 2'`,
    color: "#FBF6E9",
    centerAngle: -Math.PI / 2,
  });
  drawArcText(ctx, "GOA BUILDER · 2026", cx, cy, ringR - size * 0.12, {
    font: `700 ${Math.round(size * 0.073)}px 'Baloo 2'`,
    color: "#FEE101",
    centerAngle: Math.PI / 2,
    inward: true,
  });

  try {
    const seal = await loadImage("/brand/goa-seal.svg");
    const sealSize = size * 0.38;
    ctx.drawImage(seal, cx - sealSize / 2, cy - sealSize / 2, sealSize, sealSize);
  } catch {
    // seal is decorative — export still succeeds without it
  }
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
    "400 64px 'Rozha One'",
    "400 34px 'Rozha One'",
    "700 30px 'Baloo 2'",
    "700 15px 'Baloo 2'",
    "800 15px 'Baloo 2'",
    "600 22px 'JetBrains Mono'",
    "700 14px 'JetBrains Mono'",
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

  // base — official HH Goa green, flat (the brand has no gradients), shows
  // only if there's no photo yet
  ctx.fillStyle = "#0B6839";
  ctx.fillRect(0, 0, W, H);

  // photo — full-bleed hero, the entire card, cropped around the same
  // focal point the live preview uses so export never shows a different
  // slice of the image
  const img = await loadImage(photoUrl);
  const focal = computeFocalPosition(img.width, img.height);
  drawCoverImage(ctx, img, 0, 0, W, H, focal);

  // top scrim — keeps the header legible over any photo
  const topScrim = ctx.createLinearGradient(0, 0, 0, H * 0.18);
  topScrim.addColorStop(0, "rgba(3,26,14,0.55)");
  topScrim.addColorStop(1, "rgba(3,26,14,0)");
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, W, H * 0.18);

  // identity gradient — the photo dissolves into card-dark toward the
  // bottom rather than hitting a hard panel edge, with a faint brand-green
  // wash so the transition still reads as HH Goa
  const gradTop = H * 0.46;
  const idGrad = ctx.createLinearGradient(0, gradTop, 0, H);
  idGrad.addColorStop(0, "rgba(11,104,57,0)");
  idGrad.addColorStop(0.3, "rgba(11,104,57,0.28)");
  idGrad.addColorStop(0.58, "rgba(3,26,14,0.55)");
  idGrad.addColorStop(0.88, "rgba(3,26,14,0.93)");
  idGrad.addColorStop(1, "rgba(3,26,14,0.97)");
  ctx.fillStyle = idGrad;
  ctx.fillRect(0, gradTop, W, H - gradTop);

  // sunset glow — one atmospheric bloom, the single non-flat touch
  const glow = ctx.createRadialGradient(W - 60, H - 240, 10, W - 60, H - 240, 280);
  glow.addColorStop(0, "rgba(254,225,1,0.3)");
  glow.addColorStop(0.55, "rgba(255,0,128,0.15)");
  glow.addColorStop(1, "rgba(255,0,128,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // diamond trim — the official repeating brand pattern as a graphic top
  // edge/frame, not a seam splitting the card
  try {
    const borderImg = await loadImage("/brand/border-strip.svg");
    const stripH = 22;
    const tileW = stripH * (borderImg.width / borderImg.height);
    let x = 0;
    while (x < W) {
      ctx.drawImage(borderImg, x, 0, tileW, stripH);
      x += tileW;
    }
  } catch {
    // decorative — export still succeeds without it
  }

  const padX = 56;

  // header — HH Goa identity + a truthful "Builder ID" indicator (never
  // "VERIFIED": there's no attendee-auth system behind this card)
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#FBF6E9";
  ctx.font = "400 34px 'Rozha One'";
  ctx.fillText("HACKER HOUSE GOA", padX, 60);
  ctx.font = "600 19px 'JetBrains Mono'";
  ctx.fillStyle = "rgba(251,246,233,0.7)";
  ctx.fillText("GOA, INDIA · 2026", padX, 86);

  const pillLabel = "BUILDER ID";
  ctx.font = "700 17px 'JetBrains Mono'";
  const pillTextW = ctx.measureText(pillLabel).width;
  const pillPad = 16;
  const pillH = 38;
  const pillW = pillTextW + pillPad * 2;
  const pillX = W - padX - pillW;
  const pillY = 34;
  ctx.save();
  ctx.fillStyle = "rgba(3,26,14,0.4)";
  roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(254,225,1,0.7)";
  ctx.lineWidth = 1.6;
  roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.stroke();
  ctx.fillStyle = "#FEE101";
  ctx.fillText(pillLabel, pillX + pillPad, pillY + pillH / 2 + 6);
  ctx.restore();

  // passport stamp — crosses the photo/gradient seam on purpose, anchored
  // to the right edge just above the identity copy
  await (async () => {
    ctx.save();
    const stampCx = W - padX - 6;
    const stampCy = H * 0.4;
    ctx.translate(stampCx, stampCy);
    ctx.rotate((-6 * Math.PI) / 180);
    ctx.shadowColor = "rgba(3,26,14,0.55)";
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;
    await drawStamp(ctx, 0, 0, 330);
    ctx.restore();
  })();

  // identity content — flows bottom-up from the footer row so it always
  // ends flush with the palm band, the same way the DOM card's
  // `justify-end` flex column packs it
  const footerH = H * 0.09;
  const zoneBottom = H - footerH - 24;

  // -- bottom row: QR + Builder ID/serial (left), Builder number (right) --
  const qrSize = 84;
  const by = zoneBottom;
  const leftTextX = padX + qrSize + 18;

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(251,246,233,0.45)";
  ctx.font = "600 15px 'JetBrains Mono'";
  ctx.fillText("GOA BUILDER · 2026 · #FRAMEINGOA", leftTextX, by - 20);
  if (serial) {
    ctx.fillStyle = "rgba(251,246,233,0.3)";
    ctx.font = "400 14px 'JetBrains Mono'";
    ctx.fillText(serial, leftTextX, by + 2);
  }

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(251,246,233,0.45)";
  ctx.font = "600 16px 'JetBrains Mono'";
  ctx.fillText("BUILDER", W - padX, by - 40);
  ctx.fillStyle = "#FEE101";
  ctx.font = "400 46px 'Rozha One'";
  ctx.fillText(builderNumber || "—", W - padX, by);
  ctx.textAlign = "left";

  try {
    const qr = await loadImage(getEventQrDataUrl());
    const qrX = padX;
    const qrY = by - qrSize + 8;
    ctx.save();
    ctx.shadowColor = "rgba(3,26,14,0.5)";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = "#FBF6E9";
    roundedRectPath(ctx, qrX, qrY, qrSize, qrSize, 8);
    ctx.fill();
    ctx.restore();
    const pad = 7;
    ctx.drawImage(qr, qrX + pad, qrY + pad, qrSize - pad * 2, qrSize - pad * 2);
  } catch {
    // QR is decorative — export still succeeds without it
  }

  // -- Builder DNA stat bars, directly above the bottom row --
  let dnaTop = by - qrSize - 34;
  if (dna) {
    const barLabelW = 68;
    const barPctW = 48;
    const barX = padX + barLabelW;
    const barW = W - padX * 2 - barLabelW - barPctW;
    const barH = 8;
    const rowGap = 26;
    const drawBar = (label, value, y, color) => {
      ctx.font = "700 12px 'JetBrains Mono'";
      ctx.fillStyle = "rgba(251,246,233,0.55)";
      ctx.fillText(label, padX, y + barH - 1);

      roundedRectPath(ctx, barX, y, barW, barH, barH / 2);
      ctx.fillStyle = "rgba(251,246,233,0.16)";
      ctx.fill();

      const fillW = Math.max(barH, (barW * value) / 100);
      roundedRectPath(ctx, barX, y, fillW, barH, barH / 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.font = "700 12px 'JetBrains Mono'";
      ctx.fillStyle = color;
      ctx.fillText(String(value), barX + barW + 12, y + barH - 1);
    };
    drawBar("FOCUS", dna.focus, dnaTop - rowGap, "#9AC95F");
    drawBar("SHIP", dna.ship, dnaTop, "#FEE101");
  }

  // -- tide-line divider, directly above the stats --
  const waveY = dnaTop - 30;
  ctx.strokeStyle = "rgba(154,201,95,0.5)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  const waveSpan = W - padX * 2;
  const waveStep = 45;
  ctx.moveTo(padX, waveY);
  for (let x = 0; x <= waveSpan; x += waveStep * 2) {
    ctx.quadraticCurveTo(padX + x + waveStep / 2, waveY - 6, padX + x + waveStep, waveY);
    ctx.quadraticCurveTo(padX + x + waveStep * 1.5, waveY + 6, padX + x + waveStep * 2, waveY);
  }
  ctx.stroke();

  // -- compact tag row: stack, team, build mode, rarity --
  const tagRowY = waveY - 24;
  let tagX = padX;
  const tagH = 32;
  const maxRight = W - padX;
  ctx.font = "700 15px 'Baloo 2'";
  const drawTag = (label, { stroke, fill, text }) => {
    if (!label) return;
    const t = label.toUpperCase();
    const w = ctx.measureText(t).width + 24;
    if (tagX + w > maxRight && tagX > padX) return; // single row by design — extras simply omitted rather than overflow
    roundedRectPath(ctx, tagX, tagRowY - tagH + 6, w, tagH, tagH / 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = text;
    ctx.fillText(t, tagX + 12, tagRowY - 5);
    tagX += w + 10;
  };
  drawTag(stack, { stroke: "rgba(251,246,233,0.3)", fill: "rgba(3,26,14,0.35)", text: "rgba(251,246,233,0.8)" });
  drawTag(team ? `Team ${team}` : null, { stroke: "#FEE101", fill: "rgba(254,225,1,0.18)", text: "#FEE101" });
  drawTag(mode, { stroke: "rgba(251,246,233,0.3)", fill: "rgba(3,26,14,0.35)", text: "rgba(251,246,233,0.8)" });
  drawTag(
    rarity,
    rarity === "Epic"
      ? { stroke: "#FF0080", fill: "#FF0080", text: "#FBF6E9" }
      : rarity === "Rare"
        ? { stroke: "#FEE101", fill: "#FEE101", text: "#031A0E" }
        : { stroke: "rgba(251,246,233,0.3)", fill: "rgba(3,26,14,0.3)", text: RARITY_COLOR[rarity] || RARITY_COLOR.Common }
  );

  // -- builder title, directly above the tag row --
  const titleY = tagRowY - tagH - 6;
  const titleGrad = ctx.createLinearGradient(padX, 0, padX + 480, 0);
  titleGrad.addColorStop(0, "#FEE101");
  titleGrad.addColorStop(0.5, "#EDD723");
  titleGrad.addColorStop(1, "#FF0080");
  ctx.fillStyle = titleGrad;
  ctx.font = "700 30px 'Baloo 2'";
  ctx.fillText(title, padX, titleY);

  // -- name, the largest element on the card, directly above the title --
  const nameY = titleY - 46;
  ctx.fillStyle = "#FBF6E9";
  ctx.font = "400 64px 'Rozha One'";
  ctx.fillText(truncate(ctx, name, W - padX * 2), padX, nameY);

  // footer band — a real cropped slice of the official palm-frame asset
  // (bougainvillea, marigold, monstera leaves), tucked below the identity
  // copy so it frames rather than competes with it
  try {
    const palm = await loadImage("/brand/palm-frame.webp");
    // trunk-free horizontal band, bottom ~14% of the source image —
    // verified by eye against the actual asset, not guessed
    const sx = palm.width * 0.1375;
    const sy = palm.height * 0.858;
    const sw = palm.width * 0.725;
    const sh = palm.height * 0.142;
    ctx.drawImage(palm, sx, sy, sw, sh, 0, H - footerH, W, footerH);
  } catch {
    // footer band is decorative — export still succeeds without it
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
