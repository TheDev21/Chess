interface MoveHistoryProps {
  sanMoves: string[];
  activeIndex?: number; // index into sanMoves of the currently-displayed move, for Analysis navigation
  onSelectMove?: (index: number) => void;
}

export function MoveHistory({ sanMoves, activeIndex, onSelectMove }: MoveHistoryProps) {
  const pairs: [string, string | undefined][] = [];
  for (let i = 0; i < sanMoves.length; i += 2) pairs.push([sanMoves[i], sanMoves[i + 1]]);

  return (
    <div className="rounded border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
      <h3 className="mb-2 text-[13px] font-medium text-ink dark:text-ink-dark">Moves</h3>
      {pairs.length === 0 ? (
        <p className="text-[13px] text-muted dark:text-muted-dark">No moves yet.</p>
      ) : (
        <ol className="max-h-64 space-y-0.5 overflow-y-auto text-[13px]">
          {pairs.map(([white, black], i) => (
            <li key={i} className="flex gap-2 tabular-nums">
              <span className="w-5 text-muted dark:text-muted-dark">{i + 1}.</span>
              <button
                onClick={() => onSelectMove?.(i * 2)}
                className={`flex-1 rounded px-1 text-left ${activeIndex === i * 2 ? "bg-accent/10 font-medium text-accent dark:text-accent-dark" : "text-ink hover:bg-bg dark:text-ink-dark dark:hover:bg-bg-dark"}`}
              >
                {white}
              </button>
              {black && (
                <button
                  onClick={() => onSelectMove?.(i * 2 + 1)}
                  className={`flex-1 rounded px-1 text-left ${activeIndex === i * 2 + 1 ? "bg-accent/10 font-medium text-accent dark:text-accent-dark" : "text-ink hover:bg-bg dark:text-ink-dark dark:hover:bg-bg-dark"}`}
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
