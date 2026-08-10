import { motion } from "framer-motion";

/**
 * Full-viewport ambient background, built from the official HH Goa asset
 * pack rather than an invented gradient-blob mesh — the whole brand is flat
 * illustration on a deep green foundation, framed by palm trees at the
 * edges (the exact treatment used on hhgoa.com's own footer/hero), not a
 * generic SaaS aurora.
 */
export default function LivingBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-surface-900">
      {/* deep green base */}
      <div className="absolute inset-0 bg-surface-900" />

      {/* official palm-tree framing along both edges — the site's own
          footer treatment, translated into a page-level environment. Kept
          low-opacity and edge-anchored so it reads as compositional framing
          around the card/hero content, not a busy backdrop competing with it. */}
      <motion.div
        className="absolute inset-0 opacity-[0.35] sm:opacity-45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, x: [0, 6, 0] }}
        transition={{
          opacity: { duration: 1.6, ease: [0.16, 1, 0.3, 1] },
          x: { duration: 14, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{
          backgroundImage: "url('/brand/palm-frame.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />

      {/* the illustration's beach/palm band, anchored to the bottom like a
          horizon. Deliberately cropped to exclude the sun disc itself —
          background-size:cover on a near-square source inside a short wide
          viewport was blowing the sun up into the headline's collision
          zone, so the sun lives only in the soft glow below instead. */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[22vh] sm:h-[26vh]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          backgroundImage: "url('/brand/beach-band.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
        }}
      />

      {/* soft sunrise glow — carries the warmth without a hard-edged disc
          that could collide with foreground text at any viewport size */}
      <motion.div
        className="absolute left-1/2 bottom-[14vh] h-[46vmax] w-[46vmax] -translate-x-1/2 rounded-full opacity-25 blur-[100px]"
        style={{ background: "radial-gradient(circle, #FEE101 0%, transparent 70%)" }}
        animate={{ opacity: [0.18, 0.3, 0.18] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* film grain, kept — the one purely technical texture layer */}
      <div className="absolute inset-0 noise" />

      {/* vignette so foreground content stays legible over the illustration */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-900/70 via-surface-900/35 to-surface-900/85" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-surface-900 to-transparent" />
    </div>
  );
}
