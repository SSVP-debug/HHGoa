// Layered sharing strategy for the Builder ID card.
//
// X's web intent (x.com/intent/tweet) has no API for attaching an image —
// that's a hard platform limitation, not something we can code around. So
// we try progressively weaker fallbacks until one actually gets the image
// in front of the person to post:
//
//   1. navigator.share() with a File — the real native mobile share sheet,
//      lets the person pick X/Instagram/Messages/etc directly with the
//      image already attached. Best path where it exists.
//   2. Clipboard image write — copies the PNG so it can be pasted straight
//      into the X composer, then opens the composer pre-filled with text.
//   3. Download + open the X compose intent — guarantees the file lands on
//      disk and the composer is open with the caption ready, even on
//      browsers with neither of the above.
//
// The button should never end in a dead state: one of these three always
// succeeds enough to get the person to a place where they can post.

// The official event site — only ever used as plain-text branding, never
// as a stand-in for a card's share link. If a card fails to upload, the
// caption simply omits the link rather than pointing at this URL, which
// has no /s/:id route and would silently misrepresent a broken share as a
// working one.
export const OFFICIAL_SITE_URL = "https://hhgoa.com";

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Uploads the rendered card to /api/upload (Vercel Blob under the hood) and
// returns a /s/{id} link — a real URL, pointed at by /api/share/[id].js,
// that carries an <meta og:image> for *this specific card*.
//
// IMPORTANT: the link is built from window.location.origin, i.e. whatever
// domain the app is actually running on — never a hardcoded domain. The
// /s/:id rewrite (see vercel.json) only exists on this deployment, so a
// hardcoded domain (e.g. the marketing site) would produce a link with no
// matching route, even on a fully successful upload.
//
// This only works when deployed on Vercel with a Blob store connected and
// BLOB_READ_WRITE_TOKEN present — anywhere else (local `vite dev`, a
// different host, or if the request simply fails) it resolves to null and
// the caller (Reveal.jsx) omits the link entirely rather than substituting
// a URL that doesn't represent this card.
export async function uploadCardForShare({ blob, meta = {} }) {
  console.log("[BUILDER SHARE] Upload started, blob size:", blob?.size, "bytes");
  try {
    const dataUrl = await blobToDataURL(blob);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: dataUrl }),
    });
    console.log("[BUILDER SHARE] Blob upload response status:", res.status);
    if (!res.ok) {
      console.error("[BUILDER SHARE] /api/upload failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const { id, url } = await res.json();
    console.log("[BUILDER SHARE] Generated image URL:", url);
    if (!id) return null;

    const params = new URLSearchParams();
    if (meta.name) params.set("name", meta.name);
    if (meta.title) params.set("title", meta.title);
    if (meta.rarity) params.set("rarity", meta.rarity);
    if (meta.builderNumber) params.set("builder", meta.builderNumber);
    const qs = params.toString();

    const origin = typeof window !== "undefined" ? window.location.origin : OFFICIAL_SITE_URL;
    const shareUrl = `${origin}/s/${id}${qs ? `?${qs}` : ""}`;
    console.log("[BUILDER SHARE] Share page URL:", shareUrl);
    return shareUrl;
  } catch (err) {
    console.error("[BUILDER SHARE] uploadCardForShare threw:", err);
    return null;
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function openTweetComposer(text, popup) {
  const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  if (popup && !popup.closed) popup.location.href = shareUrl;
  // If the pre-opened tab wasn't available (blocked, or already closed by
  // the native-share branch), this direct window.open call is only reached
  // synchronously from the click handler's own attempt — see the retry note
  // in shareBuilderCard for why that's no longer the common path.
  else window.open(shareUrl, "_blank", "noreferrer");
}

// Conversation-oriented caption — asks a direct question so replies and
// quote-tweets ("what did YOU get?") are the natural response, rather than
// generic marketing copy.
//
// `link` is optional and omitted entirely when absent (e.g. the card's
// upload failed) — we never substitute a generic URL in its place, since
// that would misrepresent what's actually being shared.
export function buildCaption({ builderNumber, title, rarity, link }) {
  const rarityLine = rarity === "Legendary" || rarity === "Epic" ? `Pulled ${rarity} tier ✨\n\n` : "";
  const linkLine = link ? `\n${link}` : "";
  return `Just claimed my HH Goa Builder ID.\n\nBuilder ${builderNumber} · ${title}\n\n${rarityLine}What's your builder class?\n\n#FrameInGoa${linkLine}`;
}

/**
 * @returns {Promise<'shared'|'copied'|'downloaded'|'failed'>}
 */
export async function shareBuilderCard({ blob, filename, caption }) {
  if (!blob) return "failed";

  // Open the destination tab synchronously, as the very first thing this
  // function does, while the click that triggered it still counts as "user
  // activation". This used to happen only right before the X compose-intent
  // fallback, i.e. after the navigator.share attempt had already run and
  // awaited — but consuming an await first (even one that goes on to fail
  // or get skipped) can cost the tab its activation, and browsers then
  // silently block the window.open() call instead of redirecting to X. A
  // blocked popup with no error is exactly what "share does nothing" looks
  // like from the outside. Opening a blank tab first, before any await, and
  // just redirecting *that* tab later removes the timing dependency —
  // whichever fallback path runs, the redirect still goes through.
  const popup = window.open("about:blank", "_blank");

  // 1. Native share sheet with the file attached — the strongest path,
  // mainly available on mobile browsers.
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
        // The native sheet already handled posting — the pre-opened blank
        // tab was only a fallback and isn't needed now.
        if (popup && !popup.closed) popup.close();
        return "shared";
      }
    } catch (err) {
      // AbortError means the person cancelled the share sheet themselves —
      // don't fall through to a download they didn't ask for.
      if (err && err.name === "AbortError") {
        if (popup && !popup.closed) popup.close();
        return "failed";
      }
      // otherwise fall through to the next strategy
    }
  }

  // 2. Clipboard image write — paste-ready in the X composer.
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      openTweetComposer(caption, popup);
      return "copied";
    }
  } catch {
    // fall through
  }

  // 3. Download + compose intent — always works.
  triggerDownload(blob, filename);
  openTweetComposer(caption, popup);
  return "downloaded";
}
