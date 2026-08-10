import { motion } from "framer-motion";
import MagneticButton from "../shared/MagneticButton.jsx";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
// used once, for the info pill — a graphic block entering from the edge
// rather than just fading up like everything else, so it doesn't blur
// together with the rest of the stagger
const slideBlock = {
  hidden: { opacity: 0, x: -36 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function Hero({ onStart }) {
  return (
    <motion.section
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center"
    >
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col items-center">
        <motion.img
          variants={item}
          initial={{ opacity: 0, scale: 1.5, rotate: -6, y: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 170, damping: 14, delay: 0.1 }}
          src="/brand/hacker-house-lockup.png"
          alt="Hacker House Goa"
          className="w-40 sm:w-48 mb-6 select-none"
          draggable={false}
        />

        <motion.h1
          variants={item}
          className="font-display text-[13vw] sm:text-7xl md:text-8xl leading-[0.95] tracking-tight text-goa-off"
        >
          CLAIM YOUR
          <br />
          GOA <span className="text-gradient">IDENTITY</span>
        </motion.h1>

        <motion.p variants={item} className="mt-6 max-w-md text-balance text-lg text-goa-off/70 font-body">
          One photo. One name. Your Builder ID for Hacker House Goa 2026.
        </motion.p>

        <motion.div variants={item} className="mt-10">
          <MagneticButton onClick={onStart} variant="primary">
            Claim My Builder ID
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </MagneticButton>
        </motion.div>

        <motion.div
          variants={slideBlock}
          className="mt-14 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-2xl bg-surface-950/45 px-5 py-2.5 text-goa-off/70 text-[11px] sm:text-xs font-mono uppercase tracking-widest max-w-[280px] sm:max-w-none"
        >
          <span>Goa, India · 2026</span>
          <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-goa-off/30" />
          <span>Builder Culture</span>
          <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-goa-off/30" />
          <span>#FrameInGoa</span>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-surface-950/45 px-4 py-1.5 text-goa-off/60 text-[11px] font-mono tracking-widest"
      >
        SCROLL / TAP TO BEGIN
      </motion.div>
    </motion.section>
  );
}
