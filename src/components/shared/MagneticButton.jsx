import { useRef, useState } from "react";
import { motion } from "framer-motion";

export default function MagneticButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    setPos({ x: relX * 0.35, y: relY * 0.35 });
  };

  const reset = () => setPos({ x: 0, y: 0 });

  // Flat "sticker" treatment — solid fill, thick border, hard offset
  // shadow that flattens on press — matches the badge/signpost language
  // in the asset pack instead of a soft glow.
  const base =
    "relative inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-accent font-bold text-sm sm:text-base uppercase tracking-wide border-[2.5px] transition-[transform,box-shadow] duration-150 disabled:opacity-40 disabled:pointer-events-none active:translate-y-[3px] active:shadow-none";
  const variants = {
    primary: "bg-goa-yellow text-surface-900 border-surface-900 sticker hover:-translate-y-0.5",
    ghost: "bg-surface-800 text-goa-off border-goa-off/25 sticker-sm hover:-translate-y-0.5 hover:border-goa-off/50",
    outline: "bg-transparent text-goa-off border-goa-off/40 hover:border-goa-off/80",
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 150, damping: 12, mass: 0.4 }}
      whileTap={{ scale: 0.96 }}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
