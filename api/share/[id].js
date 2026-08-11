// GET /s/:id  (rewritten to /api/share/:id by vercel.json)
//
// This is the link that actually gets shared to X — never the raw image
// URL, and never the SPA's own "/" URL. Link-preview crawlers (Twitterbot,
// Facebook, Slack, etc.) don't execute JavaScript: they fetch this URL
// server-side and read whatever <meta property="og:image"> is in the raw
// HTML response. A client-rendered React app can't satisfy that for a
// dynamic, per-user image — so this one small endpoint exists specifically
// to hand crawlers real, per-card <meta> tags without needing to
// server-render the whole app.
//
// Real (human) visitors who land here get redirected straight to the app
// after a beat, so the link still behaves like a normal link — it just
// happens to *preview* correctly first.

import { list } from "@vercel/blob";

const SITE_URL = (process.env.SITE_URL || "https://hhgoa.com").replace(/\/$/, "");
const FALLBACK_IMAGE = `${SITE_URL}/brand/hacker-house-lockup.png`;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default async function handler(req, res) {
  const { id } = req.query;
  const name = typeof req.query.name === "string" ? req.query.name : "";
  const title = typeof req.query.title === "string" ? req.query.title : "";
  const rarity = typeof req.query.rarity === "string" ? req.query.rarity : "";
  const builderNumber = typeof req.query.builder === "string" ? req.query.builder : "";

  if (!id || !/^[a-zA-Z0-9]{4,32}$/.test(id)) {
    res.status(400).send("Bad request");
    return;
  }

  let imageUrl = FALLBACK_IMAGE;
  try {
    const { blobs } = await list({ prefix: `cards/${id}`, limit: 1 });
    if (blobs && blobs[0] && blobs[0].url) {
      imageUrl = blobs[0].url;
    }
  } catch (err) {
    console.error("share lookup failed", err);
    // fall through with the static fallback image — the page still works,
    // it just won't preview *this specific* card
  }

  const displayName = name ? `${name}'s` : "A builder's";
  const pageTitle = `${displayName} HH Goa 2026 Builder ID`;
  const descriptionParts = [
    builderNumber ? `Builder ${builderNumber}` : null,
    title || null,
    rarity ? `${rarity} tier` : null,
  ].filter(Boolean);
  const description = `${descriptionParts.join(" · ")}${descriptionParts.length ? " — " : ""}#FrameInGoa`;
  const pageUrl = `${SITE_URL}/s/${id}`;
  const appUrl = `${SITE_URL}/`;

  const safeTitle = escapeHtml(pageTitle);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(imageUrl);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}" />

<meta property="og:type" content="website" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDescription}" />
<meta property="og:image" content="${safeImage}" />
<meta property="og:image:width" content="1080" />
<meta property="og:image:height" content="1350" />
<meta property="og:url" content="${escapeHtml(pageUrl)}" />
<meta property="og:site_name" content="HH Goa 2026" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDescription}" />
<meta name="twitter:image" content="${safeImage}" />

<style>
  html,body{margin:0;min-height:100vh;background:#0B6839;color:#FBF6E9;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;}
  img{max-width:280px;width:100%;border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,0.45);margin-bottom:20px;}
  a{color:#FEE101;}
</style>
</head>
<body>
  <div>
    <img src="${safeImage}" alt="${safeTitle}" />
    <p>Taking you to HH Goa 2026&hellip;</p>
    <p><a href="${escapeHtml(appUrl)}">Tap here if nothing happens &mdash; generate your own Builder ID</a></p>
  </div>
  <script>
    // Real browsers only — crawlers never execute this, so they only ever
    // see the static markup and meta tags above.
    setTimeout(function () { window.location.replace(${JSON.stringify(appUrl)}); }, 900);
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=86400, stale-while-revalidate=86400");
  res.status(200).send(html);
}
