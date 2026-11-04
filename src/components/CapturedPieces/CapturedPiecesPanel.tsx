const GLYPH: Record<string, string> = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛" };
const ORDER = ["q", "r", "b", "n", "p"];

function sortPieces(pieces: string[]): string[] {
  return [...pieces].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
}

interface CapturedPiecesPanelProps {
  label: string;
  pieces: string[];
  materialEdge: number; // positive when this side is ahead
}

export function CapturedPiecesPanel({ label, pieces, materialEdge }: CapturedPiecesPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        {materialEdge > 0 && <span className="text-[12px] font-medium text-success">+{materialEdge}</span>}
      </div>
      {pieces.length === 0 ? (
        <p className="text-[12px] text-muted">No captures yet.</p>
      ) : (
        <div className="flex flex-wrap gap-0.5 text-[20px] leading-none text-muted">
          {sortPieces(pieces).map((p, i) => (
            <span key={i}>{GLYPH[p]}</span>
          ))}
        </div>
      )}
    </div>
  );
}
