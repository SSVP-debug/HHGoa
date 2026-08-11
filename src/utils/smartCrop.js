// Lightweight focal-point heuristic for cover-cropping the hero photo.
// There's no face-detection model in play here — just a sensible default
// based on the image's own aspect ratio, so a tall selfie doesn't lose the
// subject's head and a wide landscape doesn't get crushed to its empty
// center. Shared by BuilderCard.jsx (CSS object-position) and
// canvasCard.js (canvas source-rect math) so the on-screen crop and the
// exported PNG crop are always the same photo.
//
// Returns { x, y } as percentages (0-100), matching CSS object-position.
export function computeFocalPosition(imgWidth, imgHeight) {
  if (!imgWidth || !imgHeight) return { x: 50, y: 30 };
  const ratio = imgWidth / imgHeight;

  if (ratio < 0.85) {
    // Portrait / selfie — face and shoulders usually sit in the upper
    // third. Bias up hard so a tight vertical crop doesn't take the head.
    return { x: 50, y: 18 };
  }
  if (ratio > 1.5) {
    // Wide landscape — subject position is unpredictable, but full-body
    // and group shots trend slightly above center (sky/ceiling eats the
    // top, floor eats the bottom).
    return { x: 50, y: 40 };
  }
  // Square-ish — mild upward bias covers most head-and-shoulders framing
  // without punishing centered compositions.
  return { x: 50, y: 26 };
}

// Canvas equivalent of CSS `object-fit: cover; object-position: x% y%`.
// Given a source image and a target box, returns the source rect to draw
// from so drawImage() reproduces the same crop the DOM <img> would show.
export function coverSourceRect(imgWidth, imgHeight, boxW, boxH, focal = { x: 50, y: 50 }) {
  const imgRatio = imgWidth / imgHeight;
  const boxRatio = boxW / boxH;
  let sw, sh;
  if (imgRatio > boxRatio) {
    sh = imgHeight;
    sw = sh * boxRatio;
  } else {
    sw = imgWidth;
    sh = sw / boxRatio;
  }
  const maxX = imgWidth - sw;
  const maxY = imgHeight - sh;
  const sx = maxX * (focal.x / 100);
  const sy = maxY * (focal.y / 100);
  return { sx, sy, sw, sh };
}
