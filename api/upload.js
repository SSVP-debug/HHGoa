// POST /api/upload
//
// Accepts the rendered Builder ID PNG (as a base64 data URL) and stores it
// in Vercel Blob under a short, unguessable id. This exists purely so the
// share flow has something to point a real HTTP link at: X (and every other
// platform) generates a link preview by fetching the URL server-side and
// reading its <meta property="og:image">, which only works for a URL that
// actually resolves to a page — a data: URL or a File object never can.
//
// Requires a Blob store connected to this Vercel project (Project Settings
// -> Storage -> Blob). Vercel then provides BLOB_READ_WRITE_TOKEN
// automatically at runtime; nothing else to configure.
//
// Deliberately stateless: no database. The pathname we choose at upload
// time (`cards/{id}.png`) is exactly what /api/share/[id].js looks up later
// via `list()`, so there's nothing else that needs to be persisted.

import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB — a 1080x1350 PNG export is ~1-3MB

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== "string") {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const base64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const buffer = Buffer.from(base64, "base64");

    if (buffer.length === 0) {
      res.status(400).json({ error: "Empty image" });
      return;
    }
    if (buffer.length > MAX_BYTES) {
      res.status(413).json({ error: "Image too large" });
      return;
    }

    const id = randomUUID().replace(/-/g, "").slice(0, 12);
    console.log("[BUILDER SHARE] Upload started, bytes:", buffer.length);

    const blob = await put(`cards/${id}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
    });

    console.log("[BUILDER SHARE] Blob upload response:", blob.url);
    res.status(200).json({ id, url: blob.url });
  } catch (err) {
    console.error("[BUILDER SHARE] upload failed", err);
    res.status(500).json({ error: "Upload failed" });
  }
}
