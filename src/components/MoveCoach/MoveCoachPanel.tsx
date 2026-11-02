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
  accent: "text-accent dark:text-accent-dark border-accent/30 dark:border-accent-dark/30 bg-accent/5",
  success: "text-success border-success/30 bg-success/5",
  mistake: "text-mistake border-mistake/30 bg-mistake/5",
  blunder: "text-blunder border-blunder/30 bg-blunder/5",
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
    <div className="rounded border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-ink dark:text-ink-dark">Move Coach</h3>
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
        <div className="mt-3">
          <div className="mb-1 text-[12px] text-muted dark:text-muted-dark">Your move: {move.san}</div>
          <div className={clsx("mb-2 inline-block rounded border px-2 py-0.5 text-[12px] font-medium", TONE_CLASS[meta.tone])}>
            {meta.label}
          </div>
          <p className="text-[13px] leading-relaxed text-ink dark:text-ink-dark">{move.summary}</p>

          {move.whatWentWell.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-[12px] text-muted dark:text-muted-dark">
              {move.whatWentWell.map((item, i) => (
                <li key={i} className="capitalize">{item}</li>
              ))}
            </ul>
          )}

          {move.bestAlternativeSan && (
            <div className="mt-3 border-t border-border pt-3 dark:border-border-dark">
              <div className="text-[12px] text-muted dark:text-muted-dark">
                Best alternative: <span className="font-medium text-ink dark:text-ink-dark">{move.bestAlternativeSan}</span>
              </div>
              {detail === "detailed" && move.bestAlternativeReason && (
                <p className="mt-1 text-[12px] leading-relaxed text-muted dark:text-muted-dark">{move.bestAlternativeReason}</p>
              )}
              <div className="mt-2 flex gap-2">
                {onPreviewBestMove && (
                  <button
                    onClick={onPreviewBestMove}
                    className="rounded border border-border px-2 py-1 text-[12px] text-ink hover:border-accent dark:border-border-dark dark:text-ink-dark dark:hover:border-accent-dark"
                  >
                    {previewing ? "Previewing…" : "Show Best Move"}
                  </button>
                )}
                {previewing && onReturnToGame && (
                  <button
                    onClick={onReturnToGame}
                    className="rounded border border-border px-2 py-1 text-[12px] text-ink hover:border-accent dark:border-border-dark dark:text-ink-dark dark:hover:border-accent-dark"
                  >
                    Return to game
                  </button>
                )}
                {detail === "basic" && move.bestAlternativeReason && (
                  <button
                    onClick={() => setShowWhy((v) => !v)}
                    className="rounded border border-border px-2 py-1 text-[12px] text-ink hover:border-accent dark:border-border-dark dark:text-ink-dark dark:hover:border-accent-dark"
                  >
                    Why?
                  </button>
                )}
              </div>
              {showWhy && detail === "basic" && move.bestAlternativeReason && (
                <p className="mt-2 text-[12px] leading-relaxed text-muted dark:text-muted-dark">{move.bestAlternativeReason}</p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted/80 dark:text-muted-dark/80">
        Engine assistance for learning only. Disable Move Coach for fair-play or competitive play.
      </p>
    </div>
  );
}
