/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Verified from the official HH Goa asset pack (hex values sampled
        // directly from the provided SVGs/illustrations, not invented).
        surface: {
          950: "#07341C", // darker step below brand green, for depth/shadow
          900: "#0B6839", // official HH Goa green (primary brand color)
          800: "#0F7A43",
          700: "#14904F",
        },
        goa: {
          green: "#0B6839",
          greenLight: "#9AC95F", // official sage green, used in borders/dividers
          yellow: "#FEE101", // official yellow
          gold: "#EDD723",
          pink: "#FF0080", // official hot pink/magenta
          off: "#FBF6E9", // warm cream, matches the illustration linework white
        },
      },
      fontFamily: {
        // Rozha One: tall editorial serif, closest open match to the
        // HACKER HOUSE wordmark's condensed high-contrast letterforms, and
        // (fittingly) also supports Devanagari like the गोवा mark.
        display: ["'Rozha One'", "serif"],
        // Baloo 2: bold rounded, reads like the marker/stamp lettering used
        // for playful accents ("2:41 PM STUDIO") in the asset pack.
        accent: ["'Baloo 2'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "border-strip": "url('/brand/border-strip.svg')",
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(4%, -6%) scale(1.08)" },
          "66%": { transform: "translate(-3%, 4%) scale(0.96)" },
        },
        shine: {
          "0%": { backgroundPosition: "-150% 0" },
          "100%": { backgroundPosition: "250% 0" },
        },
      },
      animation: {
        drift: "drift 18s ease-in-out infinite",
        "drift-slow": "drift 26s ease-in-out infinite reverse",
        shine: "shine 2.2s ease-in-out",
      },
    },
  },
  plugins: [],
};
