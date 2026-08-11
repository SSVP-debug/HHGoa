# HH Goa 2026 — Builder ID / Frame Generator

Landing → Upload → Builder details → Assembly → Reveal + confetti → Download / Share to X.

## Run it

```bash
npm install
npm run dev       # local dev server
npm run build     # production build -> dist/
```

Requires Node 18+.

## Flow (updated — single-page, not a wizard)

`Landing → Studio (upload + name, live preview, one CTA) → Reveal (short animation, confetti, download/share)`

The old 4-step wizard (`landing → upload → details → reveal`) is gone.
`BuilderStudio.jsx` now owns both photo upload and name entry on one screen,
feeding a live `BuilderCard` preview as the user types/drops a photo —
`BuilderCard` renders sensible placeholders ("Your Photo", "Your Name",
muted title) until both are present. One button — "Generate My Builder ID"
— fires `Reveal`, which no longer has a blank spinner phase: since the card
was already visible in the studio, it just animates in with its final
fields (number, serial, rarity, verified mark) and confetti follows ~550ms
later. The canvas export for download/share still runs in the background
exactly as before; only those two buttons wait on it.

`components/upload/PhotoUpload.jsx` and `components/builder/BuilderForm.jsx`
were removed — their logic (HEIC conversion, drag/drop, live title
generation) now lives inside `BuilderStudio.jsx`. Nothing else changed:
`BuilderCard.jsx`'s pointer-tilt/sheen, `utils/canvasCard.js`'s export
pipeline, `utils/persistence.js`'s one-ID-per-browser guard, and
`AlreadyClaimed.jsx` are all untouched.

## Where things live

```
src/
  components/
    shared/LivingBackground.jsx   ambient animated mesh gradient + blobs + grain
    shared/MagneticButton.jsx     cursor-reactive CTA used everywhere
    landing/Hero.jsx              landing screen, staggered type reveal
    upload/PhotoUpload.jsx        drag/drop/tap upload, HEIC conversion
    builder/BuilderForm.jsx       name input + live-generated title/mode
    builder/BuilderCard.jsx       on-screen card (pointer tilt + sheen)
    builder/Reveal.jsx            assembly animation, confetti, download, share
  data/titles.js                  legendary title / build mode / builder # generator
  utils/canvasCard.js             offscreen canvas renderer -> crisp 3x PNG export
  App.jsx                         5-state state machine, no router needed
```

## Making it match hhgoa.com exactly

Done — this was updated once real brand assets were provided. See the
"Real brand pass" section below for what changed and how it was verified.

## Real brand pass (real assets, not guessed ones)

The previous round of this project used an invented palette and fonts,
flagged at the time as a placeholder pending real assets. Those assets were
provided (a `assets.zip` of official HH Goa illustrations, wordmark, and
SVG marks) and this pass replaces every guessed value with a verified one:

- **Palette** — sampled directly from the official SVGs, not eyeballed:
  deep green `#0B6839`, sage green `#9AC95F`, hot pink `#FF0080`, yellow
  `#FEE101`, gold `#EDD723`. Centralized in `tailwind.config.js`.
- **Typography** — Rozha One (editorial serif, closest open match to the
  wordmark's condensed high-contrast letterforms) for headlines, Baloo 2
  (bold rounded) for playful accents/buttons, JetBrains Mono/Inter kept for
  metadata/body.
- **Visual language corrected** — the asset pack is flat illustration with
  hard offset "sticker" shadows, not glassmorphism. Replaced the `.glass`
  blur utility with `.panel`/`.sticker` (solid fill, thick border, hard
  shadow) across every component.
- **Real assets in use, selectively** — the official गोवा (Goa) seal badge
  as the card's verification stamp, the actual diamond-pattern border strip
  as the card's photo/info seam, the real "Sun Rise" illustration (cropped
  to a sun-free beach band — see bug note below) as the hero background,
  the full "HACKER HOUSE + गोवा" lockup SVG on the landing screen, and the
  official X-mark SVG on the share buttons. Deliberately did **not** use
  every asset in the pack (agenda/details/hackers/footer-trees illustrations
  were reviewed and left out — they didn't earn a place in this composition).
- **Builder identity system expanded**: rarity is now 4-tier
  (Common/Rare/Epic/Legendary, weighted 52/30/13/5) instead of 3, and a
  "Builder DNA" stat (Focus/Ship scores) replaced the old single ship-ratio
  line, per explicit product direction.
- **Reveal sequence rebuilt** as a ~1.1s "BUILDING YOUR IDENTITY" checklist
  → "IDENTITY LOCKED." stamp animation before the finished card appears,
  replacing the earlier plain fade-in.

### A real bug this pass caught and fixed

The first version of the hero background used the full "Sun Rise"
illustration at `background-size: cover` inside a short, very wide
container. On a near-square source image, that combination over-scales the
image vertically and pulls the sun disc up into the headline's position —
verified via an actual rendered screenshot, not assumed. Fixed by
pre-cropping a sun-free "beach band" from the source (`public/brand/
beach-band.webp`) and moving the sunrise *feeling* to a separate soft glow
layer that can't collide with text at any viewport size. The meta-row and
scroll-hint text on the hero got a small dark pill background for the same
reason — they sat directly on the illustration's white sand in testing and
were low-contrast.

### One thing I could not verify in this environment

Every screenshot taken while building this out was rendered with
**fallback system fonts, not the real Rozha One / Baloo 2** — this sandbox's
network policy blocks `fonts.googleapis.com`, which is unrelated to the
deployed product (real visitors' browsers fetch it directly with normal
internet access) but did mean I could not visually confirm the intended
typographic feel myself. Both the CSS and the canvas export already fall
back to system fonts gracefully if a font fails to load for any reason, so
this shouldn't break anything — worth a quick visual check once deployed.

## Judge-review pass (what changed and why)

This project went through a review against real hackathon failure modes
(missing live link, broken share flow, no image in the tweet, multiple
submissions, no verification, weak branding). Fixes applied:

- **Share flow now actually gets the image into the tweet.** X's web intent
  API has no way to attach an image programmatically — nothing does. So the
  flow copies the rendered card to the clipboard (paste directly into the
  composer) and always falls back to auto-download with an on-screen
  instruction when clipboard access isn't available. The tweet text also
  now includes a link back to the event, not just a hashtag.
- **One ID per browser.** `utils/persistence.js` stores the final rendered
  card in `localStorage` the moment it's generated. Returning visitors land
  on `AlreadyClaimed.jsx` instead of silently being able to spam five
  different identities. Regenerating is still possible, just explicit.
- **Verified mark + rarity tier** (`Common` / `Rare` / `Legendary`, weighted
  58/30/12) added to both the on-screen card and the canvas export, plus a
  second "Ship : Sleep" stat — these exist specifically to give people a
  reason to quote-tweet ("I got Legendary") rather than just post once.
- **Deploy config added** (`vercel.json`, `netlify.toml`) — zero-config,
  push to either platform and it's live. There was previously no path to
  an actual live URL, which is disqualifying on its own for a submission
  that requires one.
- Still open, not fixed here: real HH Goa brand assets (logo, verified hex,
  official title copy) — I don't have access to pull these live. Swap them
  into `tailwind.config.js` and `src/data/titles.js` before submitting;
  everything else is already wired to use them.

## Share links now preview the actual generated card (OG image)

Previously the only thing shared as a "link" was the static `hhgoa.com`
homepage — so any X share that didn't go through the native file-attach path
(desktop browsers, mainly) previewed a generic/blank card instead of the
person's actual Builder ID. Fixed with two small Vercel serverless
functions, no separate backend/database:

- **`api/upload.js`** (`POST /api/upload`) — takes the rendered PNG (as a
  base64 data URL) and stores it in **Vercel Blob** under `cards/{id}.png`,
  returning that `id`.
- **`api/share/[id].js`** (`GET /s/:id`, rewritten from the pretty URL in
  `vercel.json`) — looks the blob back up by `id` and returns a real HTML
  page with `og:image` / `twitter:image` pointed at that specific card, plus
  a JS redirect (skipped by crawlers, since they don't run JS) into the app
  for actual human visitors.

Client side: right after the canvas export finishes, `Reveal.jsx` fires
`uploadCardForShare()` (`utils/shareCard.js`) in the background — not
awaited, so it never delays Download/Share becoming clickable. When Share is
tapped, it waits up to 3s for that upload to resolve into a `/s/{id}` link
and uses it as the link in the tweet caption; if it's not back in time, or
the upload failed, or this isn't running on Vercel at all (e.g. local `vite
dev`, or a plain static host), it silently falls back to the static
`EVENT_URL` exactly as before — the share flow itself never blocks or
errors because of this. The resolved link is also persisted into the
`localStorage` builder record, so re-sharing from the "already claimed"
screen (`AlreadyClaimed.jsx`) reuses the same working preview link instead
of losing it on refresh.

**Setup required post-deploy (Vercel only):**
1. Project → Storage → Connect a **Blob** store. Vercel then injects
   `BLOB_READ_WRITE_TOKEN` automatically — nothing to copy manually.
2. Set a `SITE_URL` env var to the real deployed domain (falls back to
   `https://hhgoa.com` if unset) so `/api/share/[id].js` builds correct
   absolute URLs.
3. Update the hardcoded `https://hhgoa.com/...` OG values in `index.html`
   (the generic, non-per-card fallback tags) to match the real domain too.

**Netlify:** `netlify.toml` still deploys the static app fine, but these two
functions are written for Vercel's Node runtime and Vercel Blob. Sharing
still works on Netlify — it just falls back to the static link/image instead
of a per-card preview, same as any other non-Vercel host. Porting to
Netlify Functions + Netlify Blobs would be a small, mechanical follow-up if
Netlify is the target instead.

## Card redesign — shorter, and more Goa energy

The card was a 9:16 (1080×1920) "story" format. Feedback was that it read as
too long, and too flat/corporate for a beach hackathon. Both come from the
same root cause: the old layout top-anchored the identity block (name/
title/tags) and bottom-anchored the stats block (QR/builder number)
independently, leaving roughly 600px of empty green in between on a card
that tall. Fix wasn't just shrinking the canvas — it was closing that gap
with real content, updated in `BuilderCard.jsx` (DOM) and `canvasCard.js`
(the actual downloadable PNG) together, as always:

- **Shorter: 4:5 (1080×1350) instead of 9:16 (1080×1920)** — about a 30%
  reduction, still a portrait badge, no longer a full "story" slab. Also
  bumped up as a more natural fit for a normal X timeline post vs. a
  full-height story crop.
- **Photo block tightened to 48%** of the new, shorter height (was 56% of
  a much taller one) — smaller in absolute pixels, but nothing under it is
  dead space anymore.
- **Builder DNA promoted to real stat bars.** Focus/Ship used to be one
  small text line buried in the footer. Now they're RPG-style progress
  bars (sage green / yellow) sitting right in the gap that used to be
  empty — real content people will actually screenshot or compare, not
  filler.
- **Tide-line divider** — a small hand-drawn wave (sage green) between the
  identity block and the stat bars. Cheap, code-drawn, no new asset needed,
  and it's a genuine beach/tide nod rather than a blank rule.
- **Sunset glow** — a warm yellow-to-pink radial bloom low behind the goवा
  seal corner. The one atmospheric touch on an otherwise flat-illustration
  card, evoking a Goa sunset without breaking the brand's flat-color rule
  everywhere else.
- **Palm + bougainvillea footer band** — a real cropped slice of the
  official `palm-frame.webp` asset (monstera leaves, bougainvillea,
  marigold), not an invented tropical cliché, running the full width of
  the card's bottom edge. This is the single biggest "Goa energy" addition
  and, not coincidentally, also fills what used to be the emptiest part of
  the old card.
- **Punchier tag chips** — Team and Rarity are now filled color chips
  (Epic = pink fill, Rare = yellow fill) instead of thin outlines, so the
  "pull" people would want to quote-tweet actually reads as a highlight
  rather than blending into Stack/Mode's neutral outline pills.

`AlreadyClaimed.jsx`'s persisted-card preview box was updated to match
(`aspect-[4/5]`, was still `aspect-[9/16]`) so a previously-generated image
isn't cropped by a mismatched container on refresh. `og:image:height` in
`api/share/[id].js` and the `MAX_BYTES` comment in `api/upload.js` were also
corrected from 1920 to 1350 to match.

Sanity-checked the new layout's geometry (spacing, no overlaps) with a
standalone Python/PIL mockup outside the actual React/canvas code, since
this sandbox has no browser to screenshot the real components — worth a
quick visual pass once deployed, same caveat as the font note below.

## Notes on the harder parts

- **Export quality**: the on-screen card uses CSS glass/blur/sheen for feel, but the PNG you
  download is drawn independently on an offscreen `<canvas>` at 1080×1920 (3x) in `canvasCard.js`,
  so the export is always crisp regardless of what the browser does with backdrop-filter.
- **HEIC**: converted client-side via `heic2any`, lazy-loaded only when a `.heic`/`.heif` file is
  actually selected, so it doesn't bloat the initial bundle.
- **Performance**: all ambient motion (`LivingBackground`) animates `transform`/`opacity` only —
  no layout-triggering properties — so it stays GPU-accelerated at 60fps.
- **Confetti**: fires once on reveal via `canvas-confetti`, capped at ~46 particles in brand colors.

## Next passes worth doing before shipping

- Swap placeholder color tokens / titles for verified HH Goa brand assets.
- Add a scroll-triggered parallax on the landing hero if you want more motion above the fold.
- Wire real device-tilt (`deviceorientation`) for the card sheen on mobile, currently pointer-only.
- Port the OG-image share endpoint (see above) to Netlify Functions + Netlify Blobs if Netlify ends up being the actual deploy target instead of Vercel.
- Visually verify Rozha One/Baloo 2 render correctly once deployed (see font note above — untested in this sandbox due to blocked font CDN access).
