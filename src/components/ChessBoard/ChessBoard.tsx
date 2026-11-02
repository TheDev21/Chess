import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useContainerSize } from "../../hooks/useContainerSize";

interface ChessBoardProps {
  fen: string;
  onMove: (from: string, to: string, promotion?: string) => boolean;
  orientation: "white" | "black";
  draggable?: boolean;
  showLegalMoves?: boolean;
  showCoordinates?: boolean;
  lastMove?: { from: string; to: string } | null;
}

export function ChessBoard({
  fen,
  onMove,
  orientation,
  draggable = true,
  showLegalMoves = true,
  showCoordinates = true,
  lastMove = null,
}: ChessBoardProps) {
  const { ref, width, height } = useContainerSize<HTMLDivElement>();
  const boardWidth = Math.max(240, Math.min(width, 640, height * 0.92));
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  function isPromotion(from: string, to: string): boolean {
    try {
      const game = new Chess(fen);
      const piece = game.get(from as Square);
      if (!piece || piece.type !== "p") return false;
      const targetRank = to[1];
      return targetRank === "1" || targetRank === "8";
    } catch {
      return false;
    }
  }

  function attemptMove(from: string, to: string): boolean {
    if (isPromotion(from, to)) {
      setPendingPromotion({ from, to });
      return true; // tentatively "handled" - board shouldn't snap back while the picker is open
    }
    return onMove(from, to);
  }

  function choosePromotion(piece: "q" | "r" | "b" | "n") {
    if (!pendingPromotion) return;
    onMove(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
  }

  const legalTargets = useMemo(() => {
    if (!selected || !showLegalMoves) return new Set<string>();
    try {
      const game = new Chess(fen);
      return new Set(game.moves({ square: selected as Square, verbose: true }).map((m) => m.to));
    } catch {
      return new Set<string>();
    }
  }, [selected, fen, showLegalMoves]);

  const isCheckSquare = useMemo(() => {
    try {
      const game = new Chess(fen);
      if (!game.isCheck()) return null;
      const board = game.board();
      for (const row of board) {
        for (const cell of row) {
          if (cell && cell.type === "k" && cell.color === game.turn()) return cell.square;
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  }, [fen]);

  const handleSquareClick = (square: string) => {
    if (!draggable) return;
    if (!selected) {
      setSelected(square);
      return;
    }
    if (selected === square) {
      setSelected(null);
      return;
    }
    const moved = attemptMove(selected, square);
    setSelected(moved ? null : square);
  };

  const handlePieceDrop = (source: string, target: string) => {
    setSelected(null);
    return attemptMove(source, target);
  };

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: "rgba(255,199,0,0.45)" };
    squareStyles[lastMove.to] = { backgroundColor: "rgba(255,199,0,0.55)" };
  }
  if (selected) {
    squareStyles[selected] = { ...squareStyles[selected], boxShadow: "inset 0 0 0 3px rgba(53,94,59,0.6)" };
  }
  for (const target of legalTargets) {
    squareStyles[target] = {
      ...squareStyles[target],
      backgroundImage: "radial-gradient(circle, rgba(43,42,40,0.18) 22%, transparent 24%)",
    };
  }
  if (isCheckSquare) {
    squareStyles[isCheckSquare] = { ...squareStyles[isCheckSquare], backgroundColor: "rgba(192,57,43,0.35)" };
  }

  return (
    <div className="relative flex w-full justify-center" ref={ref}>
      <Chessboard
        position={fen}
        onPieceDrop={handlePieceDrop}
        onSquareClick={(square) => handleSquareClick(square)}
        boardOrientation={orientation}
        boardWidth={boardWidth}
        arePiecesDraggable={draggable}
        showBoardNotation={showCoordinates}
        customSquareStyles={squareStyles}
        customBoardStyle={{ borderRadius: "4px", boxShadow: "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08)" }}
        customDarkSquareStyle={{ backgroundColor: "#7a9169" }}
        customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
      />
      {pendingPromotion && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="flex gap-1 rounded bg-surface p-2 shadow-card dark:bg-surface-dark">
            {(["q", "r", "b", "n"] as const).map((p) => (
              <button
                key={p}
                onClick={() => choosePromotion(p)}
                className="flex h-10 w-10 items-center justify-center rounded border border-border text-[13px] font-medium uppercase text-ink hover:border-accent dark:border-border-dark dark:text-ink-dark dark:hover:border-accent-dark"
                aria-label={`Promote to ${p}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
