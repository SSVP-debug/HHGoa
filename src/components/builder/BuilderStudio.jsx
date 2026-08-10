import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MagneticButton from "../shared/MagneticButton.jsx";
import BuilderCard from "./BuilderCard.jsx";
import { generateBuilderTitle, generateBuildMode, STACKS } from "../../data/titles.js";

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"];

export default function BuilderStudio({ onGenerate, onBack }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [convertingHeic, setConvertingHeic] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [stack, setStack] = useState(null);

  const seed = name.trim().toLowerCase();
  const title = useMemo(() => (seed ? generateBuilderTitle(seed) : ""), [seed]);
  const mode = useMemo(() => (seed ? generateBuildMode(seed) : ""), [seed]);

  const ready = Boolean(photo && name.trim());

  const processFile = useCallback(async (file) => {
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      let workingFile = file;
      const isHeic =
        file.type === "image/heic" || file.type === "image/heif" || /\.heic$|\.heif$/i.test(file.name);

      if (isHeic) {
        // HEIC decode is a cold WASM init the first time it runs on a
        // device — meaningfully slower than a normal JPG/PNG read, so it
        // gets its own label rather than sitting under the generic
        // "Reading image…" text with no explanation for the extra wait.
        setConvertingHeic(true);
        const heic2any = (await import("heic2any")).default;
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
        workingFile = converted;
      }

      const url = URL.createObjectURL(workingFile);
      const img = new Image();
      img.onload = () => {
        setPhoto({ url, width: img.width, height: img.height, file: workingFile });
        setProcessing(false);
        setConvertingHeic(false);
      };
      img.onerror = () => {
        setError("Couldn't read that image — try another one.");
        setProcessing(false);
        setConvertingHeic(false);
      };
      img.src = url;
    } catch {
      setError("That format didn't convert cleanly — try a JPG or PNG.");
      setProcessing(false);
      setConvertingHeic(false);
    }
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <motion.section
      key="studio"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.35 } }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12"
    >
      <p className="mb-2 font-mono text-xs tracking-widest text-goa-off/40 uppercase">Build Your ID</p>
      <h2 className="font-display text-3xl sm:text-5xl text-center mb-6 text-goa-off">
        Give us your <span className="text-gradient">photo, name & stack</span>
      </h2>

      <div className="grid w-full max-w-5xl grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">
        {/* controls */}
        <div className="flex flex-col items-center lg:items-start w-full max-w-sm mx-auto lg:mx-0 order-2 lg:order-1">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload your photo. JPG, PNG, or HEIC."
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={`relative w-full h-40 rounded-2xl panel flex items-center justify-center cursor-pointer overflow-hidden transition-shadow ${
              dragging ? "ring-2 ring-goa-yellow ring-offset-2 ring-offset-surface-900" : ""
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",") + ",.heic,.heif"}
              className="hidden"
              onChange={handleSelect}
            />

            <AnimatePresence mode="wait">
              {photo ? (
                <motion.div
                  key="has-photo"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 px-4 text-goa-off/80"
                >
                  <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0">
                    <img src={photo.url} alt="Selected" className="h-full w-full object-cover" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Photo added</p>
                    <p className="text-xs text-goa-off/40">Tap to replace</p>
                  </div>
                </motion.div>
              ) : processing ? (
                <motion.div key="processing" className="flex flex-col items-center gap-2 text-goa-off/60">
                  <motion.div
                    className="h-8 w-8 rounded-full border-2 border-goa-off/20 border-t-goa-yellow"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  />
                  <span className="font-mono text-xs">{convertingHeic ? "Converting HEIC…" : "Reading image…"}</span>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 px-6 text-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 16V4M12 4l-5 5M12 4l5 5" stroke="#FBF6E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#FBF6E9" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p className="text-goa-off/70 text-sm">
                    Drop a photo or tap
                    <br />
                    <span className="text-goa-off/40 text-xs">JPG · PNG · HEIC</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {error && <p className="mt-2 text-goa-pink text-xs font-mono">{error}</p>}

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={28}
            placeholder="Your name"
            aria-label="Your name"
            className="mt-4 w-full rounded-2xl panel px-6 py-4 text-center font-display text-xl text-goa-off placeholder:text-goa-off/30 outline-none transition-shadow"
          />

          <input
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            maxLength={24}
            placeholder="Team name (optional)"
            aria-label="Team name, optional"
            className="mt-3 w-full rounded-2xl panel px-5 py-3 text-center font-accent text-sm text-goa-off placeholder:text-goa-off/30 outline-none transition-shadow"
          />

          <div className="mt-5 w-full">
            <p className="mb-2 font-mono text-[10px] tracking-widest text-goa-off/40 uppercase text-center lg:text-left">
              What do you build? <span className="text-goa-off/25">(optional)</span>
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2">
              {STACKS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStack((cur) => (cur === s.label ? null : s.label))}
                  className={`rounded-full border-2 px-3.5 py-1.5 font-accent text-xs font-bold uppercase tracking-wide transition-colors ${
                    stack === s.label
                      ? "bg-goa-yellow text-surface-900 border-surface-900"
                      : "bg-surface-800 text-goa-off/70 border-goa-off/20 hover:border-goa-off/50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <MagneticButton variant="ghost" onClick={onBack}>
              Back
            </MagneticButton>
            <MagneticButton
              variant="primary"
              disabled={!ready}
              onClick={() => onGenerate({ name: name.trim(), title, mode, stack, team: team.trim(), photo })}
            >
              Generate My Builder ID
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </MagneticButton>
          </div>
        </div>

        {/* live preview */}
        <div className="order-1 lg:order-2 flex justify-center scale-[0.85] sm:scale-90 lg:scale-100 -my-8 lg:my-0">
          <BuilderCard photo={photo} name={name} title={title} mode={mode} stack={stack} team={team} />
        </div>
      </div>
    </motion.section>
  );
}
