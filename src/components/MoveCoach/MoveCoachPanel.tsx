import { useState } from "react";
import { Crown } from "lucide-react";
import { CLASSIFICATION_META } from "../../types/chess";
import type { CoachedMove } from "../../types/chess";
import clsx from "clsx";

/** How the mover is doing, in the plain language the spec asks for - never raw engine numbers. */
function perspectiveReading(move: CoachedMove): { label: string; fraction: number } {
  const ev = move.evalAfter;
  let cp: number;
  if (ev.mate != null) cp = ev.mate > 0 ? 2000 : -2000;
  else cp = ev.cp ?? 0;
  const forMover = move.moverColor === "white" ? cp : -cp;
  const clamped = Math.max(-600, Math.min(600, forMover));
  const fraction = (clamped + 600) / 1200; // 0 = fully behind, 1 = fully ahead
  const label = forMover > 150 ? "You're ahead" : forMover < -150 ? "Your opponent is ahead" : "The position is equal";
  return { label, fraction };
}

interface MoveCoachPanelProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  analyzing: boolean;
  move: CoachedMove | null;
  detail: "basic" | "detailed";
  onPreviewBestMove?: () => void;
  onReturnToGame?: () => void;
  previewing?: boolean;
}

const TONE_CLASS: Record<string, string> = {
  accent: "text-accent bg-accent/[0.08]",
  success: "text-success bg-success/[0.08]",
  warning: "text-warning bg-warning/[0.08]",
  mistake: "text-mistake bg-mistake/[0.08]",
  blunder: "text-blunder bg-blunder/[0.08]",
};

export function MoveCoachPanel({ enabled, onToggle, analyzing, move, detail, onPreviewBestMove, onReturnToGame, previewing }: MoveCoachPanelProps) {
  const [showWhy, setShowWhy] = useState(false);
  const meta = move ? CLASSIFICATION_META[move.classification] : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
          <Crown className="h-4 w-4 text-accent" strokeWidth={1.75} />
          Move Coach
        </h3>
        <label className="flex items-center gap-2 text-[12px] text-muted">
          <span>{enabled ? "On" : "Off"}</span>
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="h-3.5 w-3.5 accent-accent" />
        </label>
      </div>

      {!enabled && <p className="mt-3 text-[13px] text-muted">Turn Move Coach on for feedback after each move.</p>}

      {enabled && analyzing && <p className="mt-3 text-[13px] text-muted">Analyzing…</p>}

      {enabled && !analyzing && !move && <p className="mt-3 text-[13px] text-muted">Make a move to see feedback here.</p>}

      {enabled && !analyzing && move && meta && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium", TONE_CLASS[meta.tone])}>{meta.label}</span>
            <span className="text-[12px] text-muted">{move.san}</span>
          </div>
          <p className="text-[14px] leading-relaxed text-ink">{move.summary}</p>

          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
              <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${perspectiveReading(move).fraction * 100}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-muted">{perspectiveReading(move).label}</div>
          </div>

          {move.whatWentWell.length > 0 && (
            <ul className="mt-2 space-y-1 text-[13px] text-muted">
              {move.whatWentWell.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted/60" />
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </li>
              ))}
            </ul>
          )}

          {move.bestAlternativeSan && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="text-[12px] text-muted">
                Best alternative: <span className="font-medium text-ink">{move.bestAlternativeSan}</span>
              </div>
              {detail === "detailed" && move.bestAlternativeReason && (
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{move.bestAlternativeReason}</p>
              )}
              <div className="mt-2.5 flex gap-2">
                {onPreviewBestMove && (
                  <button
                    onClick={onPreviewBestMove}
                    className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5"
                  >
                    {previewing ? "Previewing…" : "Show on board"}
                  </button>
                )}
                {previewing && onReturnToGame && (
                  <button
                    onClick={onReturnToGame}
                    className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5"
                  >
                    Return to game
                  </button>
                )}
                {detail === "basic" && move.bestAlternativeReason && (
                  <button
                    onClick={() => setShowWhy((v) => !v)}
                    className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5"
                  >
                    Why?
                  </button>
                )}
              </div>
              {showWhy && detail === "basic" && move.bestAlternativeReason && (
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{move.bestAlternativeReason}</p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-muted">
        Engine assistance for learning only. Disable Move Coach for fair-play or competitive play.
      </p>
    </div>
  );
}
