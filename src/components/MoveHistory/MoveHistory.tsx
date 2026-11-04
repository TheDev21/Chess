interface MoveHistoryProps {
  sanMoves: string[];
  activeIndex?: number; // index into sanMoves of the currently-displayed move, for Analysis navigation
  onSelectMove?: (index: number) => void;
}

export function MoveHistory({ sanMoves, activeIndex, onSelectMove }: MoveHistoryProps) {
  const pairs: [string, string | undefined][] = [];
  for (let i = 0; i < sanMoves.length; i += 2) pairs.push([sanMoves[i], sanMoves[i + 1]]);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-3 text-[14px] font-semibold text-ink">Moves</h3>
      {pairs.length === 0 ? (
        <p className="text-[13px] text-muted">No moves yet.</p>
      ) : (
        <ol className="max-h-64 space-y-0.5 overflow-y-auto text-[13px]">
          {pairs.map(([white, black], i) => (
            <li key={i} className="flex gap-2 tabular-nums">
              <span className="w-5 pt-1 text-muted">{i + 1}.</span>
              <button
                onClick={() => onSelectMove?.(i * 2)}
                className={`flex-1 rounded-md px-1.5 py-1 text-left transition-colors ${activeIndex === i * 2 ? "bg-accent/10 font-medium text-accent" : "text-ink hover:bg-ink/[0.04]"}`}
              >
                {white}
              </button>
              {black && (
                <button
                  onClick={() => onSelectMove?.(i * 2 + 1)}
                  className={`flex-1 rounded-md px-1.5 py-1 text-left transition-colors ${activeIndex === i * 2 + 1 ? "bg-accent/10 font-medium text-accent" : "text-ink hover:bg-ink/[0.04]"}`}
                >
                  {black}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
