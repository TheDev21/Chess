import type { MoveHistoryEntry } from "../types";

interface MoveHistoryProps {
  moves: MoveHistoryEntry[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  const pairs: [MoveHistoryEntry, MoveHistoryEntry | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i], moves[i + 1]]);
  }

  return (
    <div className="move-history">
      <h3>Move History</h3>
      {pairs.length === 0 && <p className="muted">No moves yet.</p>}
      <ol className="move-list">
        {pairs.map(([white, black], idx) => (
          <li key={idx}>
            <span className="move-number">{idx + 1}.</span>
            <span className="move-san">{white.san}</span>
            {black && <span className="move-san">{black.san}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
