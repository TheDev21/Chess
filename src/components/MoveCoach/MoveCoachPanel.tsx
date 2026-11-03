import { useState } from "react";
import { CLASSIFICATION_META } from "../../types/chess";
import type { CoachedMove } from "../../types/chess";
import clsx from "clsx";

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
  accent: "text-accent dark:text-accent-dark bg-accent/[0.08] dark:bg-accent-dark/[0.12]",
  success: "text-success bg-success/[0.08]",
  warning: "text-warning bg-warning/[0.08]",
  mistake: "text-mistake bg-mistake/[0.08]",
  blunder: "text-blunder bg-blunder/[0.08]",
};

export function MoveCoachPanel({
  enabled,
  onToggle,
  analyzing,
  move,
  detail,
  onPreviewBestMove,
  onReturnToGame,
  previewing,
}: MoveCoachPanelProps) {
  const [showWhy, setShowWhy] = useState(false);
  const meta = move ? CLASSIFICATION_META[move.classification] : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 dark:border-border-dark dark:bg-surface-dark">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-ink dark:text-ink-dark">Move Coach</h3>
        <label className="flex items-center gap-2 text-[12px] text-muted dark:text-muted-dark">
          <span>{enabled ? "On" : "Off"}</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
        </label>
      </div>

      {!enabled && (
        <p className="mt-3 text-[13px] text-muted dark:text-muted-dark">Turn Move Coach on for feedback after each move.</p>
      )}

      {enabled && analyzing && <p className="mt-3 text-[13px] text-muted dark:text-muted-dark">Analyzing…</p>}

      {enabled && !analyzing && !move && (
        <p className="mt-3 text-[13px] text-muted dark:text-muted-dark">Make a move to see feedback here.</p>
      )}

      {enabled && !analyzing && move && meta && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium", TONE_CLASS[meta.tone])}>
              {meta.label}
            </span>
            <span className="text-[12px] text-muted dark:text-muted-dark">{move.san}</span>
          </div>
          <p className="text-[14px] leading-relaxed text-ink dark:text-ink-dark">{move.summary}</p>

          {move.whatWentWell.length > 0 && (
            <ul className="mt-2 space-y-1 text-[13px] text-muted dark:text-muted-dark">
              {move.whatWentWell.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted/60 dark:bg-muted-dark/60" />
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </li>
              ))}
            </ul>
          )}

          {move.bestAlternativeSan && (
            <div className="mt-4 border-t border-border pt-4 dark:border-border-dark">
              <div className="text-[12px] text-muted dark:text-muted-dark">
                Best alternative: <span className="font-medium text-ink dark:text-ink-dark">{move.bestAlternativeSan}</span>
              </div>
              {detail === "detailed" && move.bestAlternativeReason && (
                <p className="mt-1 text-[13px] leading-relaxed text-muted dark:text-muted-dark">{move.bestAlternativeReason}</p>
              )}
              <div className="mt-2.5 flex gap-2">
                {onPreviewBestMove && (
                  <button
                    onClick={onPreviewBestMove}
                    className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5 dark:border-border-dark dark:text-ink-dark dark:hover:border-accent-dark"
                  >
                    {previewing ? "Previewing…" : "Show on board"}
                  </button>
                )}
                {previewing && onReturnToGame && (
                  <button
                    onClick={onReturnToGame}
                    className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5 dark:border-border-dark dark:text-ink-dark dark:hover:border-accent-dark"
                  >
                    Return to game
                  </button>
                )}
                {detail === "basic" && move.bestAlternativeReason && (
                  <button
                    onClick={() => setShowWhy((v) => !v)}
                    className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5 dark:border-border-dark dark:text-ink-dark dark:hover:border-accent-dark"
                  >
                    Why?
                  </button>
                )}
              </div>
              {showWhy && detail === "basic" && move.bestAlternativeReason && (
                <p className="mt-2 text-[13px] leading-relaxed text-muted dark:text-muted-dark">{move.bestAlternativeReason}</p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-muted/70 dark:text-muted-dark/70">
        Engine assistance for learning only. Disable Move Coach for fair-play or competitive play.
      </p>
    </div>
  );
}
