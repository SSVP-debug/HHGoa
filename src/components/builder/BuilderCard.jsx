import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getEventQrDataUrl } from "../../utils/qr.js";
import { computeFocalPosition } from "../../utils/smartCrop.js";

/**
 * On-screen DOM version of the card. Pointer-reactive tilt + sheen kept
 * from the original build. The actual downloadable PNG is drawn separately
 * by utils/canvasCard.js so export quality never depends on CSS support —
 * both are updated together whenever the card design changes.
 *
 * Design: the photo is full-bleed (edge to edge, the entire card), not a
 * boxed hero block. Identity information sits in a soft dark/green gradient
 * over the lower portion of that same photo rather than a separate solid
 * panel — there is no hard seam between "photo" and "info panel" anymore.
 */
const RARITY_STYLES = {
  Common: "text-goa-off/60 border-goa-off/25",
  Rare: "text-goa-yellow border-goa-yellow/50",
  Epic: "text-goa-pink border-goa-pink/50",
  Legendary: "text-gradient border-goa-yellow",
};

const RARITY_CHIP = {
  Common: "bg-surface-950/30 text-goa-off/70 border-goa-off/25",
  Rare: "bg-goa-yellow text-surface-950 border-goa-yellow",
  Epic: "bg-goa-pink text-goa-off border-goa-pink",
  Legendary: "text-gradient border-goa-yellow bg-surface-950/40",
};

// Passport/event-stamp badge: dashed ring + curved top/bottom copy around
// the real HH Goa Devanagari seal mark. Sits low enough to lean on the
// photo/identity gradient for contrast, but pokes up into the still-bright
// photo above it — the one element allowed to cross that seam, on purpose.
function Stamp({ size = 118 }) {
  const r = size / 2;
  const ringR = r - 6;
  const topPathId = "stampTopArc";
  const bottomPathId = "stampBottomArc";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={r} cy={r} r={ringR} fill="rgba(3,26,14,0.55)" stroke="#FBF6E9" strokeOpacity="0.7" strokeWidth="1.4" strokeDasharray="3 4" />
      <circle cx={r} cy={r} r={ringR - 8} fill="none" stroke="#FEE101" strokeOpacity="0.55" strokeWidth="1" />
      <path id={topPathId} d={`M ${r - ringR + 10},${r} A ${ringR - 10},${ringR - 10} 0 0 1 ${r + ringR - 10},${r}`} fill="none" />
      <path id={bottomPathId} d={`M ${r - ringR + 14},${r + 2} A ${ringR - 14},${ringR - 14} 0 0 0 ${r + ringR - 14},${r + 2}`} fill="none" />
      <text fill="#FBF6E9" fontSize="9.5" fontWeight="700" letterSpacing="1.5" fontFamily="'Baloo 2', sans-serif">
        <textPath href={`#${topPathId}`} startOffset="50%" textAnchor="middle">
          HACKER HOUSE GOA
        </textPath>
      </text>
      <text fill="#FEE101" fontSize="8.5" fontWeight="700" letterSpacing="1.5" fontFamily="'Baloo 2', sans-serif">
        <textPath href={`#${bottomPathId}`} startOffset="50%" textAnchor="middle">
          GOA BUILDER · 2026
        </textPath>
      </text>
      <image href="/brand/goa-seal.svg" x={r - size * 0.19} y={r - size * 0.18} width={size * 0.38} height={size * 0.38} />
    </svg>
  );
}

export default function BuilderCard({ photo, name, title, mode, stack, team, builderNumber, serial, rarity, dna }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const hasPhoto = Boolean(photo?.url);
  const displayName = name?.trim() || "Your Name";
  const displayTitle = title || "Awaiting builder title…";
  const qrDataUrl = useMemo(() => getEventQrDataUrl(), []);
  const focal = useMemo(
    () => (photo?.width && photo?.height ? computeFocalPosition(photo.width, photo.height) : { x: 50, y: 26 }),
    [photo?.width, photo?.height]
  );

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
        className="relative w-[300px] sm:w-[340px] aspect-[4/5] rounded-[1.5rem] overflow-hidden select-none border-[3px] border-surface-950/40 sticker bg-goa-green"
      >
        {/* photo — full-bleed hero. This is the entire card, not a boxed
            block: everything else below is an overlay riding on top of it. */}
        <div className="absolute inset-0">
          {hasPhoto ? (
            <img
              src={photo.url}
              alt={displayName}
              className="h-full w-full object-cover"
              style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
            />
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
        </div>

        {/* top scrim — just enough to keep the header legible over any photo */}
        <div
          className="absolute inset-x-0 top-0 h-[18%] pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(3,26,14,0.55), rgba(3,26,14,0))" }}
          aria-hidden="true"
        />

        {/* identity gradient — the photo dissolves into card-dark toward the
            bottom instead of hitting a hard panel edge. A faint brand-green
            wash sits inside it so the transition still reads as HH Goa, not
            just "a dark vignette". */}
        <div
          className="absolute inset-x-0 bottom-0 top-[46%] pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(11,104,57,0) 0%, rgba(11,104,57,0.28) 30%, rgba(3,26,14,0.55) 58%, rgba(3,26,14,0.93) 88%, rgba(3,26,14,0.97) 100%)",
          }}
          aria-hidden="true"
        />

        {/* sunset glow — one atmospheric bloom, the single non-flat touch */}
        <div
          className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 rounded-full opacity-60"
          style={{ background: "radial-gradient(circle, rgba(254,225,1,0.35), rgba(255,0,128,0.18) 55%, transparent 75%)" }}
          aria-hidden="true"
        />

        {/* thin diamond trim — the actual repeating brand pattern, used here
            as a top graphic edge/frame rather than a seam cutting the card
            in half */}
        <div
          className="absolute top-0 inset-x-0 h-[7px] opacity-90"
          style={{ backgroundImage: "url('/brand/border-strip.svg')", backgroundSize: "auto 100%", backgroundRepeat: "repeat-x" }}
          aria-hidden="true"
        />

        {/* header — HH Goa identity + a truthful "Builder ID" indicator.
            No verification claim: there is no attendee-auth system behind
            this card, so it only ever says what's actually true. */}
        <div className="absolute inset-x-0 top-0 pt-3.5 px-5 flex items-start justify-between">
          <div className="drop-shadow-[0_1px_3px_rgba(3,26,14,0.9)]">
            <p className="font-display text-[13px] leading-none tracking-wide text-goa-off">HACKER HOUSE GOA</p>
            <p className="mt-1 font-mono text-[8.5px] tracking-widest text-goa-off/70 uppercase">Goa, India · 2026</p>
          </div>
          <span className="rounded-full border border-goa-yellow/70 bg-surface-950/40 px-2.5 py-1 font-mono text-[8px] font-bold tracking-widest text-goa-yellow uppercase drop-shadow-[0_1px_2px_rgba(3,26,14,0.9)]">
            Builder ID
          </span>
        </div>

        {/* passport stamp — allowed to cross the photo/gradient seam,
            anchored to the right edge, riding just above the identity copy */}
        <div className="absolute right-2 top-[38%] -rotate-6 drop-shadow-[2px_4px_3px_rgba(3,26,14,0.55)]">
          <Stamp size={104} />
        </div>

        {/* identity content — packed to the bottom of the card so it grows
            upward with content instead of guessing a fixed height. Sits on
            top of the gradient, which sits on top of the same photo used
            up top: nothing here is a separate opaque block. */}
        <div className="absolute inset-x-0 bottom-[9%] top-[54%] px-5 flex flex-col justify-end gap-1.5">
          <h3 className="font-display text-[1.85rem] leading-[0.95] text-goa-off drop-shadow-[0_2px_6px_rgba(3,26,14,0.6)]">
            {displayName}
          </h3>
          <p className={`font-accent text-sm font-bold ${title ? "text-gradient" : "text-goa-off/40"}`}>{displayTitle}</p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {stack && (
              <span className="rounded-full border border-goa-off/30 bg-surface-950/35 px-2 py-0.5 font-mono text-[9px] font-medium tracking-widest text-goa-off/75 uppercase">
                {stack}
              </span>
            )}
            {team && (
              <span className="rounded-full border border-goa-yellow bg-goa-yellow/15 px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest text-goa-yellow uppercase">
                Team {team}
              </span>
            )}
            {mode && (
              <span className="rounded-full border border-goa-off/30 bg-surface-950/35 px-2 py-0.5 font-mono text-[9px] font-medium tracking-widest text-goa-off/75 uppercase">
                {mode}
              </span>
            )}
            {rarity && (
              <span className={`rounded-full border px-2 py-0.5 font-accent text-[8px] font-bold uppercase tracking-widest ${RARITY_CHIP[rarity] || RARITY_STYLES[rarity]}`}>
                {rarity}
              </span>
            )}
          </div>

          {/* tide-line divider — hand-drawn wave standing in for a rule */}
          <svg viewBox="0 0 300 10" className="w-full h-2 mt-1" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M0 5 Q 12.5 0 25 5 T 50 5 T 75 5 T 100 5 T 125 5 T 150 5 T 175 5 T 200 5 T 225 5 T 250 5 T 275 5 T 300 5"
              fill="none"
              stroke="#9AC95F"
              strokeOpacity="0.5"
              strokeWidth="1.5"
            />
          </svg>

          {/* Builder DNA — compact stat readout, secondary to name/title */}
          {dna && (
            <div className="flex flex-col gap-1">
              {[
                ["FOCUS", dna.focus, "bg-goa-greenLight"],
                ["SHIP", dna.ship, "bg-goa-yellow"],
              ].map(([label, value, barColor]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 font-mono text-[8.5px] font-bold text-goa-off/55">{label}</span>
                  <div className="h-[6px] flex-1 rounded-full bg-goa-off/15 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${value}%` }} />
                  </div>
                  <span className="w-6 shrink-0 text-right font-mono text-[8.5px] font-bold text-goa-off/70">{value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-1 flex items-end justify-between">
            {/* QR docked directly beside its text block, bottom-aligned to
                a fixed-height row so it can't collide with wrapping tags */}
            <div className="flex items-end gap-2">
              <div className="h-8 w-8 shrink-0 rounded-[4px] overflow-hidden bg-goa-off p-[3px] drop-shadow-[1px_2px_0_rgba(3,26,14,0.5)]">
                <img src={qrDataUrl} alt="QR code linking to hhgoa.com" className="h-full w-full" />
              </div>
              <div>
                <p className="font-mono text-[8px] text-goa-off/45 uppercase tracking-widest">
                  Goa Builder · 2026 · #FrameInGoa
                </p>
                {serial && <p className="font-mono text-[8px] text-goa-off/30 mt-0.5">{serial}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[8px] text-goa-off/45 uppercase tracking-widest">Builder</p>
              <p className="font-display text-xl text-goa-yellow drop-shadow-[0_1px_3px_rgba(3,26,14,0.7)]">{builderNumber || "—"}</p>
            </div>
          </div>
        </div>

        {/* footer band — a real slice of the official palm-frame asset
            (bougainvillea, marigold, monstera leaves): the card's one
            explicitly botanical/festive beat, tucked below the identity
            copy so it frames rather than competes with it */}
        <div
          className="absolute inset-x-0 bottom-0 h-[9%]"
          style={{
            backgroundImage: "url('/brand/palm-frame.webp')",
            backgroundSize: "260% auto",
            backgroundPosition: "50% 100%",
            backgroundRepeat: "no-repeat",
          }}
          aria-hidden="true"
        />

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
