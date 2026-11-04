interface EvaluationBarProps {
  cp: number | null; // White-perspective centipawns
  mate: number | null; // positive = White mates
  orientation?: "white" | "black";
}

/** A vertical bar showing the engine's assessment, filled from White's perspective and flipped visually when the board is flipped. */
export function EvaluationBar({ cp, mate, orientation = "white" }: EvaluationBarProps) {
  let whiteFraction: number;
  let label: string;

  if (mate != null) {
    whiteFraction = mate > 0 ? 1 : 0;
    label = `M${Math.abs(mate)}`;
  } else {
    const clamped = Math.max(-800, Math.min(800, cp ?? 0));
    whiteFraction = (clamped + 800) / 1600;
    label = cp != null ? (cp / 100).toFixed(1) : "0.0";
  }

  const topIsWhite = orientation === "white";

  return (
    <div className="flex h-full w-5 flex-col overflow-hidden rounded-lg border border-border" aria-label="Evaluation">
      <div
        className="w-full bg-ink/20 transition-[height] duration-300"
        style={{ height: topIsWhite ? `${(1 - whiteFraction) * 100}%` : `${whiteFraction * 100}%` }}
      />
      <div className="w-full flex-1 bg-surface" />
      <div className="py-1 text-center text-[9px] font-medium text-muted">{label}</div>
    </div>
  );
}
