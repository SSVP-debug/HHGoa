// Layered sharing strategy for the Builder ID card.
//
// X's web intent (twitter.com/intent/tweet) has no API for attaching an
// image — that's a hard platform limitation, not something we can code
// around. So we try progressively weaker fallbacks until one actually gets
// the image in front of the person to post:
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

export const EVENT_URL = "https://hhgoa.com";

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
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  if (popup && !popup.closed) popup.location.href = shareUrl;
  else window.open(shareUrl, "_blank", "noreferrer");
}

// Conversation-oriented caption — asks a direct question so replies and
// quote-tweets ("what did YOU get?") are the natural response, rather than
// generic marketing copy.
export function buildCaption({ builderNumber, title, rarity }) {
  const rarityLine = rarity === "Legendary" || rarity === "Epic" ? `Pulled ${rarity} tier ✨\n\n` : "";
  return `Just claimed my HH Goa Builder ID.\n\nBuilder ${builderNumber} · ${title}\n\n${rarityLine}What's your builder class?\n\n#FrameInGoa\n${EVENT_URL}`;
}

/**
 * @returns {Promise<'shared'|'copied'|'downloaded'|'failed'>}
 */
export async function shareBuilderCard({ blob, filename, caption }) {
  if (!blob) return "failed";

  // 1. Native share sheet with the file attached — the strongest path,
  // mainly available on mobile browsers.
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
        return "shared";
      }
    } catch (err) {
      // AbortError means the person cancelled the share sheet themselves —
      // don't fall through to a download they didn't ask for.
      if (err && err.name === "AbortError") return "failed";
      // otherwise fall through to the next strategy
    }
  }

  // Open the tab synchronously so it isn't popup-blocked once we know we're
  // headed for the web compose intent.
  const popup = window.open("about:blank", "_blank");

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
