/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Inter", "Segoe UI", "sans-serif"],
      },
      colors: {
        bg: {
          DEFAULT: "#faf8f5",
          dark: "#1c1b19",
        },
        surface: {
          DEFAULT: "#ffffff",
          dark: "#262422",
        },
        ink: {
          DEFAULT: "#2b2a28",
          dark: "#efece6",
        },
        muted: {
          DEFAULT: "#75716a",
          dark: "#9c9890",
        },
        border: {
          DEFAULT: "#e7e2da",
          dark: "#39362f",
        },
        accent: {
          DEFAULT: "#355e3b",
          dark: "#6fae77",
        },
        board: {
          light: "#eeeed2",
          dark: "#7a9169",
        },
        success: "#2f8f4e",
        mistake: "#c08a1e",
        blunder: "#c0392b",
      },
      borderRadius: {
        DEFAULT: "6px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.04), 0 1px 8px rgba(0,0,0,.03)",
      },
    },
  },
  plugins: [],
};
