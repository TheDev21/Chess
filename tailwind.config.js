/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        short: { raw: "(max-height: 500px) and (orientation: landscape)" },
        tabletLandscape: { raw: "(orientation: landscape) and (min-width: 900px) and (min-height: 525px) and (max-height: 850px)" },
      },
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
        // Phase 9 atmosphere correction: bg/surface values re-measured by
        // sampling actual pixels from the user's reference image. The real
        // reference is a more pure, less-blue emerald-black, and its cards
        // sit much closer in tone to the page background than our original
        // values did - separation there comes mainly from the card shadow
        // (see boxShadow.card below), not a big background color jump.
        bg: {
          DEFAULT: "#0A1710",
        },
        surface: {
          DEFAULT: "#0F1F15",
          elevated: "#15271B",
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
          DEFAULT: "#D4AF37",
        },
        accentDeep: "#D4B571",
        gold: {
          DEFAULT: "#E8D6AD",
        },
        sage: {
          DEFAULT: "#A5B2A8",
          bg: "#23372E",
        },
        // Phase 9: "Premium Midnight Forest + Antique Gold" board palette.
        // These values must match the inline styles ChessBoard.tsx actually
        // renders with (react-chessboard needs JS style objects, not
        // Tailwind classes, for square colors - these tokens document the
        // same colors rather than being consumed as classes).
        board: {
          light: "#EBD0A0",
          dark: "#32462B",
          border: "#D4AF37",
          selected: "#D4AF37",
          lastMove: "#D4AF37",
          check: "#d97770",
          legalMove: "#32462B",
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
        // Phase 9 atmosphere: the same depth as before, plus a hairline
        // gold inset top-edge (barely visible, not a border) so cards read
        // as gently gold-lit rather than flat - restrained on purpose.
        card: "0 1px 2px rgba(0,0,0,.28), 0 2px 14px rgba(0,0,0,.2), inset 0 1px 0 rgba(212,175,55,0.08)",
        board: "0 2px 4px rgba(0,0,0,.25), 0 12px 32px rgba(0,0,0,.35)",
        panel: "0 8px 40px rgba(0,0,0,.48), inset 0 1px 0 rgba(212,175,55,0.07)",
      },
      backgroundImage: {
        // A very subtle emerald depth gradient for large background areas
        // (the app's root background) - lighter "Deep Emerald" easing into
        // the base "Midnight Forest" moving down the page, not a visible
        // band or a second color.
        // A visible diagonal light sweep (not a barely-there tint) across
        // the upper portion of the page, easing back to the plain dark base
        // everywhere else - matched directly against the reference image
        // rather than kept deliberately faint.
        // A restrained ambient glow, not a replica of any reference photo:
        // a soft radial lift above the content, like overhead light in a
        // quiet room, easing into the plain dark base everywhere else.
        // Deliberately gentler than a visible "beam" - this is its own
        // design call toward "premium and calm" rather than "dramatic."
        "midnight-emerald": "radial-gradient(ellipse 90% 60% at 50% 0%, #17301F 0%, #0A1710 70%)",
      },
    },
  },
  plugins: [],
};
