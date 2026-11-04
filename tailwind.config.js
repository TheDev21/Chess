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
        // A warm, faintly green-tinted parchment, not a neutral gray-white -
        // the same family as the board's own light squares, just diluted
        // enough to sit quietly behind everything else.
        bg: {
          DEFAULT: "#f6f3e8",
          dark: "#1b1e1a",
        },
        surface: {
          DEFAULT: "#fffdf6",
          dark: "#242722",
        },
        ink: {
          DEFAULT: "#242420",
          dark: "#efece2",
        },
        muted: {
          DEFAULT: "#79765f",
          dark: "#9c9a87",
        },
        border: {
          DEFAULT: "#e6e0cc",
          dark: "#3a3d33",
        },
        accent: {
          DEFAULT: "#4f7942",
          dark: "#8bb674",
        },
        accentDeep: "#355e3b",
        gold: {
          DEFAULT: "#b68a45",
          dark: "#c9a368",
        },
        sage: {
          DEFAULT: "#a8bba7",
          bg: "#e8eee5",
        },
        board: {
          light: "#eeeed2",
          dark: "#769656",
          selected: "#f6d365",
          lastMove: "#f3e6a5",
          check: "#d97770",
          legalMove: "#315c46",
        },
        success: "#4f7942",
        warning: "#c98a2e",
        mistake: "#d2691e",
        blunder: "#bd625b",
        error: "#bd625b",
      },
      borderRadius: {
        DEFAULT: "10px",
        lg: "14px",
        xl: "18px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,20,20,.03), 0 2px 12px rgba(20,20,20,.04)",
        board: "0 2px 4px rgba(20,20,20,.04), 0 12px 32px rgba(20,20,20,.08)",
        panel: "0 8px 40px rgba(20,20,20,.08)",
      },
    },
  },
  plugins: [],
};
