/**
 * A decorative, illustrated gold/ivory king for the Home hero - not a photo (no licensed
 * stock asset available), but built to read the same way: warm lighting, soft depth from
 * blurred pieces behind it, standing on a board. Purely decorative; the real, playable
 * pieces live on the interactive boards elsewhere in the app.
 */
export function HeroKing({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="An illustrated golden chess king">
      <defs>
        <radialGradient id="heroGlow" cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#F3E6A5" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F3E6A5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kingGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBF3D9" />
          <stop offset="45%" stopColor="#E8C974" />
          <stop offset="100%" stopColor="#C98A2E" />
        </linearGradient>
        <linearGradient id="kingGoldDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8C974" />
          <stop offset="100%" stopColor="#A8701F" />
        </linearGradient>
      </defs>

      <circle cx="200" cy="170" r="170" fill="url(#heroGlow)" />

      {/* Softly blurred pieces behind, for depth */}
      <g opacity="0.22" filter="blur(3px)">
        <rect x="40" y="300" width="36" height="14" rx="3" fill="#355E3B" />
        <path d="M58 300 L48 250 Q58 240 68 250 L58 300" fill="#355E3B" />
        <rect x="300" y="295" width="40" height="16" rx="3" fill="#355E3B" />
        <circle cx="320" cy="255" r="22" fill="#355E3B" />
      </g>

      {/* Board the king stands on */}
      <ellipse cx="200" cy="345" rx="140" ry="18" fill="#355E3B" opacity="0.12" />
      <g opacity="0.9">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={80 + i * 40} y="330" width="40" height="22" fill={i % 2 === 0 ? "#EEEED2" : "#769656"} />
        ))}
      </g>

      {/* The king itself */}
      <g>
        <path d="M200 60 L200 95" stroke="url(#kingGold)" strokeWidth="10" strokeLinecap="round" />
        <path d="M182 72 L218 72" stroke="url(#kingGold)" strokeWidth="10" strokeLinecap="round" />

        <path d="M165 110 Q200 90 235 110 L245 150 Q225 140 200 140 Q175 140 155 150 Z" fill="url(#kingGold)" />
        <path d="M150 160 Q200 135 250 160 L262 215 Q230 195 200 195 Q170 195 138 215 Z" fill="url(#kingGoldDark)" />
        <path d="M130 225 Q200 195 270 225 L285 285 Q240 262 200 262 Q160 262 115 285 Z" fill="url(#kingGold)" />
        <rect x="100" y="285" width="200" height="30" rx="6" fill="url(#kingGoldDark)" />
        <rect x="90" y="312" width="220" height="18" rx="5" fill="url(#kingGold)" />
      </g>
    </svg>
  );
}
