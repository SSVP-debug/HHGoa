import qrcode from "qrcode-generator";

// Placeholder destination — every card points here for now. Swap for a
// per-builder or per-team deep link later without touching the rendering
// code below.
export const QR_URL = "https://hhgoa.com";

const CELL = 8; // px per module before any display/export scaling
const QUIET_ZONE = 4; // modules of white margin — required for reliable scans

let cached = null;

/**
 * Renders the event QR as a data URL, once. Plain black-on-white with a
 * proper quiet zone — QR readers are far less forgiving of low contrast or
 * a missing margin than of a code that isn't brand-colored, so this stays
 * black/white rather than trying to tint it green/yellow.
 */
export function getEventQrDataUrl() {
  if (cached) return cached;

  const qr = qrcode(0, "M");
  qr.addData(QR_URL);
  qr.make();

  const modules = qr.getModuleCount();
  const size = (modules + QUIET_ZONE * 2) * CELL;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);
  ctx.translate(QUIET_ZONE * CELL, QUIET_ZONE * CELL);
  qr.renderTo2dContext(ctx, CELL);

  cached = canvas.toDataURL("image/png");
  return cached;
}
