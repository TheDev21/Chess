/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        serif: ["\"Playfair Display\"", "Georgia", "serif"],
      },
      colors: {
        // "Midnight Forest" palette: a deep emerald page background, slightly
        // lighter emerald surfaces for cards (with a brighter emerald on
        // hover), warm gold as the primary accent (buttons, active nav
        // states, progress, highlights). Warm cream ink on the dark
        // surfaces; the deep emerald background color as text on the
        // lighter gold buttons.
        bg: {
          DEFAULT: "#101C18",
        },
        surface: {
          DEFAULT: "#23372E",
          elevated: "#2A4035",
        },
        ink: {
          DEFAULT: "#F3F0E7",
        },
        muted: {
          DEFAULT: "#A5B2A8",
        },
        border: {
          DEFAULT: "#35483D",
        },
        accent: {
          DEFAULT: "#C6A15B",
        },
        accentDeep: "#D4B571",
        gold: {
          DEFAULT: "#E8D6AD",
        },
        sage: {
          DEFAULT: "#A5B2A8",
          bg: "#23372E",
        },
        board: {
          light: "#eeeed2",
          dark: "#769656",
          selected: "#f6d365",
          lastMove: "#f3e6a5",
          check: "#d97770",
          legalMove: "#315c46",
        },
        success: "#8bbf72",
        warning: "#e0a53e",
        mistake: "#e2824a",
        blunder: "#e08077",
        error: "#e08077",
      },
      borderRadius: {
        DEFAULT: "10px",
        lg: "14px",
        xl: "18px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.25), 0 2px 12px rgba(0,0,0,.18)",
        board: "0 2px 4px rgba(0,0,0,.25), 0 12px 32px rgba(0,0,0,.35)",
        panel: "0 8px 40px rgba(0,0,0,.45)",
      },
    },
  },
  plugins: [],
};
