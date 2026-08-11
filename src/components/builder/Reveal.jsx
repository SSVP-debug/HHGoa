import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import BuilderCard from "./BuilderCard.jsx";
import MagneticButton from "../shared/MagneticButton.jsx";
import { exportCardAsPNG } from "../../utils/canvasCard.js";
import { generateBuilderNumber, generateSerial, generateRarity, generateBuilderDNA } from "../../data/titles.js";
import { saveBuilderRecord } from "../../utils/persistence.js";
import { shareBuilderCard, buildCaption, uploadCardForShare, EVENT_URL } from "../../utils/shareCard.js";

// Tiny inline success states — no modal, matches the button's own copy so
// the confirmation reads as one intentional action rather than a system
// toast.
function successLabel(hint) {
  if (hint === "shared") return "Ready For Goa ↗";
  if (hint === "copied") return "Post Composed ✓";
  return "Post Composed ✓";
}

function shareHintCopy(hint) {
  if (hint === "shared") return "Shared — pick where it posts.";
  if (hint === "copied") return "Card copied — paste it (⌘/Ctrl+V) into your tweet before posting.";
  return "Card downloaded — attach it to your tweet before posting.";
}

const LOCK_STEPS = ["PHOTO", "BUILDER TITLE", "GOA ENERGY", "BUILDER NUMBER"];
const LOCK_STEP_MS = 160; // per-line stagger
const LOCK_HOLD_MS = 220; // pause on "IDENTITY LOCKED." before the card takes over
const LOCK_TOTAL_MS = LOCK_STEPS.length * LOCK_STEP_MS + 260 + LOCK_HOLD_MS;

export default function Reveal({ builder, onRestart }) {
  const [phase, setPhase] = useState("locking"); // locking -> revealed
  const [cardBlob, setCardBlob] = useState(null);
  const [rendering, setRendering] = useState(true);
  const [shareHint, setShareHint] = useState(null); // 'shared' | 'copied' | 'downloaded' | null
  const [sharing, setSharing] = useState(false);
  const firedConfetti = useRef(false);
  // Resolves to a /s/{id} link with a real per-card og:image, or null if the
  // upload hasn't finished / isn't available (e.g. running off Vercel).
  // Kicked off in the background the moment the card is ready so it's
  // usually already resolved by the time someone taps Share.
  const shareUrlPromiseRef = useRef(null);

  const builderNumber = generateBuilderNumber(builder.name.toLowerCase());
  const serial = generateSerial(builder.name.toLowerCase());
  const rarity = generateRarity(builder.name.toLowerCase());
  const dna = generateBuilderDNA(builder.name.toLowerCase());

  // Short cinematic lock sequence — not fake loading, just a beat that
  // makes the reveal feel assembled/stamped rather than instant-and-flat.
  // Target ~900ms-1.1s total, per the brief.
  useEffect(() => {
    const t = setTimeout(() => setPhase("revealed"), LOCK_TOTAL_MS);
    return () => clearTimeout(t);
  }, []);

  // The canvas export (needed for download/share) runs in the background
  // immediately, in parallel with the lock animation — it's usually done
  // before the animation even finishes, so there's no extra wait stacked
  // on top.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const blob = await exportCardAsPNG({
        photoUrl: builder.photo.url,
        name: builder.name,
        title: builder.title,
        mode: builder.mode,
        stack: builder.stack,
        team: builder.team,
        builderNumber,
        serial,
        rarity,
        dna,
      });
      if (cancelled) return;
      setCardBlob(blob);
      setRendering(false);

      // Fire the share-link upload in the background — never awaited here,
      // so it can't add latency to Download/Share becoming available. The
      // result is only consumed later, by handleShare.
      shareUrlPromiseRef.current = uploadCardForShare({
        blob,
        meta: { name: builder.name, title: builder.title, rarity, builderNumber },
      });

      const reader = new FileReader();
      reader.onload = async () => {
        const imageDataUrl = reader.result;
        // Persist immediately with whatever we have — if the upload is
        // still in flight, patch the record in once it resolves so the
        // "already claimed" screen can also share with the correct preview.
        saveBuilderRecord({
          name: builder.name,
          title: builder.title,
          mode: builder.mode,
          stack: builder.stack,
          team: builder.team,
          builderNumber,
          serial,
          rarity,
          dna,
          imageDataUrl,
          claimedAt: Date.now(),
        });

        const shareUrl = await shareUrlPromiseRef.current;
        if (cancelled || !shareUrl) return;
        saveBuilderRecord({
          name: builder.name,
          title: builder.title,
          mode: builder.mode,
          stack: builder.stack,
          team: builder.team,
          builderNumber,
          serial,
          rarity,
          dna,
          imageDataUrl,
          shareUrl,
          claimedAt: Date.now(),
        });
      };
      reader.readAsDataURL(blob);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "revealed" || firedConfetti.current) return;
    firedConfetti.current = true;
    confetti({
      particleCount: 46,
      spread: 70,
      startVelocity: 32,
      gravity: 0.9,
      origin: { y: 0.55 },
      colors: ["#FEE101", "#FF0080", "#EDD723", "#9AC95F"],
      scalar: 0.9,
      ticks: 180,
    });
  }, [phase]);

  const filename = `hhgoa-2026-builder-id-${builder.name.toLowerCase().replace(/\s+/g, "-")}.png`;

  const triggerDownload = (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleDownload = () => {
    if (!cardBlob) return;
    triggerDownload(cardBlob);
  };

  // Layered strategy — native share sheet with the file attached, then
  // clipboard copy + composer, then download + composer. See
  // utils/shareCard.js for why X's intent alone can't carry the image.
  const handleShare = async () => {
    if (!cardBlob) return;
    setSharing(true);

    // Give the background upload a little extra time to land, but never
    // block the share button waiting on the network — if it's not back in
    // 3s (or fails, or isn't available on this host), fall back to the
    // static event link rather than stalling "Share".
    let link = EVENT_URL;
    try {
      const resolved = await Promise.race([
        shareUrlPromiseRef.current,
        new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      if (resolved) link = resolved;
    } catch {
      // shareUrlPromiseRef stays EVENT_URL
    }

    const caption = buildCaption({ builderNumber, title: builder.title, rarity, link });
    const result = await shareBuilderCard({ blob: cardBlob, filename, caption });
    setSharing(false);
    if (result === "failed") return;
    setShareHint(result);
    setTimeout(() => setShareHint(null), 7000);
  };

  return (
    <motion.section
      key="reveal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12"
    >
      <AnimatePresence mode="wait">
        {phase === "locking" ? (
          <motion.div
            key="locking"
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.25 } }}
            className="flex flex-col items-center gap-5 panel rounded-2xl px-10 py-10"
          >
            <p className="font-accent text-sm font-bold uppercase tracking-widest text-goa-yellow">
              Building Your Identity
            </p>
            <div className="flex flex-col gap-2 font-mono text-sm text-goa-off/80 min-w-[220px]">
              {LOCK_STEPS.map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (i * LOCK_STEP_MS) / 1000, duration: 0.2 }}
                  className="flex items-center justify-between"
                >
                  <span>{step}</span>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (i * LOCK_STEP_MS) / 1000 + 0.08, duration: 0.15 }}
                    className="text-goa-greenLight"
                  >
                    ✓
                  </motion.span>
                </motion.div>
              ))}
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: (LOCK_STEPS.length * LOCK_STEP_MS) / 1000 + 0.1, duration: 0.2 }}
              className="font-accent text-xs font-bold uppercase tracking-[0.2em] text-goa-off"
            >
              Identity Locked.
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <p className="mb-2 font-mono text-xs tracking-widest text-goa-off/40 uppercase">You're in</p>
            <h2 className="font-display text-2xl sm:text-4xl text-center mb-4 text-goa-off">
              Welcome, <span className="text-gradient">Builder</span>
            </h2>

            <div className="scale-[0.82] sm:scale-90 lg:scale-100 -my-12 lg:my-0">
              <BuilderCard
                photo={builder.photo}
                name={builder.name}
                title={builder.title}
                mode={builder.mode}
                stack={builder.stack}
                team={builder.team}
                builderNumber={builderNumber}
                serial={serial}
                rarity={rarity}
                dna={dna}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <MagneticButton variant="primary" onClick={handleDownload} disabled={rendering}>
                {rendering ? "Preparing…" : "Download ID"}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </MagneticButton>
              <MagneticButton variant="ghost" onClick={handleShare} disabled={rendering || sharing}>
                <img src="/brand/x-icon.svg" alt="" className="h-4 w-4" aria-hidden="true" />
                {sharing ? "Preparing…" : shareHint ? successLabel(shareHint) : "Share My Builder ID ↗"}
              </MagneticButton>
            </div>

            <AnimatePresence>
              {shareHint && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 max-w-xs text-center text-xs font-mono text-goa-yellow/90"
                >
                  {shareHintCopy(shareHint)}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              onClick={onRestart}
              className="mt-8 text-xs font-mono text-goa-off/40 hover:text-goa-off/70 transition-colors tracking-widest uppercase"
            >
              Start Over
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
