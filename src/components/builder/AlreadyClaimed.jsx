import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MagneticButton from "../shared/MagneticButton.jsx";

const HINT_COPY = {
  shared: "Shared — pick where it posts.",
  copied: "Card copied — paste it (⌘/Ctrl+V) into your tweet before posting.",
  downloaded: "Card downloaded — attach it to your tweet before posting.",
};

// Shown when a builder record already exists in this browser. Doesn't block
// re-download/re-share of the ID they already claimed, but makes generating
// a second, different identity a deliberate, explicit action rather than a
// zero-friction accident.
export default function AlreadyClaimed({ record, onDownload, onShare, onRegenerate }) {
  const [sharing, setSharing] = useState(false);
  const [hint, setHint] = useState(null);

  const handleShare = async () => {
    setSharing(true);
    const result = await onShare();
    setSharing(false);
    if (!result || result === "failed") return;
    setHint(result);
    setTimeout(() => setHint(null), 7000);
  };

  return (
    <motion.section
      key="claimed"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-24"
    >
      <p className="mb-3 font-mono text-xs tracking-widest text-goa-off/40 uppercase">Welcome back</p>
      <h2 className="font-display text-3xl sm:text-5xl text-center mb-8 text-goa-off">
        You already have a <span className="text-gradient">Builder ID</span>
      </h2>

      <motion.div
        initial={{ opacity: 0, scale: 0.86, rotate: -3 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.15 }}
        className="w-[300px] sm:w-[340px] aspect-[9/16] rounded-[1.5rem] overflow-hidden border-[3px] border-surface-950/40 sticker"
      >
        <img src={record.imageDataUrl} alt={`${record.name}'s Builder ID`} className="h-full w-full object-cover" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.55 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4"
      >
        <MagneticButton variant="primary" onClick={onDownload}>
          Download Again
        </MagneticButton>
        <MagneticButton variant="ghost" onClick={handleShare} disabled={sharing}>
          <img src="/brand/x-icon.svg" alt="" className="h-4 w-4" aria-hidden="true" />
          {sharing ? "Preparing…" : hint ? (hint === "shared" ? "Ready For Goa ↗" : "Post Composed ✓") : "Share My Builder ID ↗"}
        </MagneticButton>
      </motion.div>

      <AnimatePresence>
        {hint && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 max-w-xs text-center text-xs font-mono text-goa-yellow/90"
          >
            {HINT_COPY[hint]}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        onClick={onRegenerate}
        className="mt-8 text-xs font-mono text-goa-off/40 hover:text-goa-pink/80 transition-colors tracking-widest uppercase"
      >
        Regenerate (replaces this ID)
      </button>
    </motion.section>
  );
}
