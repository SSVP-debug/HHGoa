import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getEventQrDataUrl } from "../../utils/qr.js";

/**
 * On-screen DOM version of the card. Pointer-reactive tilt + sheen kept
 * from the original build. The actual downloadable PNG is drawn separately
 * by utils/canvasCard.js so export quality never depends on CSS support —
 * both are updated together whenever the card design changes.
 */
const RARITY_STYLES = {
  Common: "text-goa-off/60 border-goa-off/25",
  Rare: "text-goa-yellow border-goa-yellow/50",
  Epic: "text-goa-pink border-goa-pink/50",
  Legendary: "text-gradient border-goa-yellow",
};

export default function BuilderCard({ photo, name, title, mode, stack, team, builderNumber, serial, rarity, dna }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const hasPhoto = Boolean(photo?.url);
  const displayName = name?.trim() || "Your Name";
  const displayTitle = title || "Awaiting builder title…";
  const qrDataUrl = useMemo(() => getEventQrDataUrl(), []);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ rx: (0.5 - py) * 10, ry: (px - 0.5) * 12 });
    setGlow({ x: px * 100, y: py * 100 });
  };

  const reset = () => {
    setTilt({ rx: 0, ry: 0 });
    setGlow({ x: 50, y: 50 });
  };

  return (
    <div style={{ perspective: 1200 }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-[300px] sm:w-[340px] aspect-[9/16] rounded-[1.5rem] overflow-hidden select-none border-[3px] border-surface-950/40 sticker"
      >
        {/* base surface — official HH Goa green */}
        <div className="absolute inset-0 bg-goa-green" />

        {/* photo */}
        <div className="absolute inset-x-0 top-0 h-[56%] overflow-hidden">
          {hasPhoto ? (
            <img src={photo.url} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center gap-2 bg-surface-800">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="6" width="18" height="14" rx="2" stroke="#FBF6E9" strokeOpacity="0.35" strokeWidth="1.6" />
                <circle cx="9" cy="12" r="2.2" stroke="#FBF6E9" strokeOpacity="0.35" strokeWidth="1.6" />
                <path d="M3 17l5-4 4 3 4-5 5 6" stroke="#FBF6E9" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="font-mono text-[10px] text-goa-off/35 uppercase tracking-widest">Your Photo</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-goa-green via-transparent to-transparent" />
        </div>

        {/* the official HH Goa diamond trim as the seam — not an invented
            wave shape, the actual repeating brand pattern from the site */}
        <div
          className="absolute inset-x-0 h-3"
          style={{
            top: "calc(56% - 6px)",
            backgroundImage: "url('/brand/border-strip.svg')",
            backgroundSize: "auto 100%",
            backgroundRepeat: "repeat-x",
          }}
        />

        {/* perforated top edge — ticket-style cut */}
        <div className="absolute top-0 inset-x-0 flex justify-between px-3 pt-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-surface-950/50" />
          ))}
        </div>

        {/* content — simplified hierarchy: name, title, compact identity
            metadata, builder number/rarity. No verification claim: there is
            no attendee-auth system behind this, so the card only ever says
            what's true. */}
        <div className="absolute inset-x-0 bottom-0 top-[57%] px-6 pb-5 pt-4 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-[1.75rem] leading-[1.05] text-goa-off">{displayName}</h3>
            <p className={`font-accent text-sm font-bold mt-0.5 ${title ? "text-gradient" : "text-goa-off/30"}`}>
              {displayTitle}
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pr-16">
              {team && (
                <span className="rounded-full border border-goa-yellow/60 bg-goa-yellow/10 px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest text-goa-yellow uppercase">
                  Team {team}
                </span>
              )}
              {stack && (
                <span className="rounded-full border border-goa-off/25 bg-surface-950/30 px-2 py-0.5 font-mono text-[9px] font-medium tracking-widest text-goa-off/70 uppercase">
                  {stack}
                </span>
              )}
              {mode && (
                <span className="rounded-full border border-goa-off/25 bg-surface-950/30 px-2 py-0.5 font-mono text-[9px] font-medium tracking-widest text-goa-off/70 uppercase">
                  {mode}
                </span>
              )}
              {rarity && (
                <span className={`rounded-full border px-2 py-0.5 font-accent text-[8px] font-bold uppercase tracking-widest ${RARITY_STYLES[rarity]}`}>
                  {rarity}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-end justify-between">
            {/* QR docked directly beside its text block, not floating in
                the gap above — that gap's real size depends on how much
                the name/title/tags wrap, which made a "floating" QR/seal
                collide with the tags whenever content ran long. Anchoring
                to the fixed-height bottom row instead means it can't. */}
            <div className="flex items-end gap-2">
              <div className="h-9 w-9 shrink-0 rounded-[4px] overflow-hidden bg-goa-off p-[3px] drop-shadow-[1px_2px_0_rgba(3,26,14,0.5)]">
                <img src={qrDataUrl} alt="QR code linking to hhgoa.com" className="h-full w-full" />
              </div>
              <div>
                <p className="font-mono text-[9px] text-goa-off/40 uppercase tracking-widest">
                  Builder ID · 2026 · #FrameInGoa
                </p>
                {serial && <p className="font-mono text-[9px] text-goa-off/30 mt-0.5">{serial}</p>}
                {dna && (
                  <p className="font-mono text-[9px] text-goa-off/40 mt-1">
                    FOCUS {dna.focus} · SHIP {dna.ship}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="text-right">
                <p className="font-mono text-[9px] text-goa-off/40 uppercase tracking-widest">Builder</p>
                <p className="font-display text-xl text-goa-yellow">{builderNumber || "—"}</p>
              </div>
              <div className="h-11 w-11 shrink-0 -rotate-6 drop-shadow-[2px_3px_0_rgba(3,26,14,0.8)]">
                <img src="/brand/goa-seal.svg" alt="" className="h-full w-full" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        {/* holographic sheen following pointer — restrained, brand isn't glassy */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
          style={{
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(255,255,255,0.55), transparent 45%)`,
          }}
        />
      </motion.div>
    </div>
  );
}
