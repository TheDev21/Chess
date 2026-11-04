/** A small, friendly ivory-wood knight illustration for the lesson explanation panel. */
export function KnightMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} role="img" aria-label="An illustrated chess knight">
      <defs>
        <linearGradient id="knightWood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFDF6" />
          <stop offset="55%" stopColor="#E8EEE5" />
          <stop offset="100%" stopColor="#A8BBA7" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="128" rx="38" ry="8" fill="#355E3B" opacity="0.12" />
      <rect x="28" y="108" width="64" height="22" rx="5" fill="url(#knightWood)" stroke="#E6E0CC" strokeWidth="2" />
      <path
        d="M78 110 C78 90 68 80 70 64 C72 48 58 38 44 40 C34 42 30 52 36 58 C30 60 26 66 30 72 C24 76 24 86 32 90 C30 96 34 104 42 106 C50 108 62 110 78 110 Z"
        fill="url(#knightWood)"
        stroke="#355E3B"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="52" cy="58" r="3" fill="#355E3B" />
      <path d="M38 56 L30 50 L34 60 Z" fill="#355E3B" opacity="0.8" />
    </svg>
  );
}
