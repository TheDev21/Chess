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
  const boardWidth = Math.max(220, Math.min(width, height, 640));
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

  // A soft, warm highlight for the last move played - visible on both board
  // squares without reading as a bright "selection" color.
  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: "rgba(210,169,55,0.35)" };
    squareStyles[lastMove.to] = { backgroundColor: "rgba(210,169,55,0.45)" };
  }
  if (selected) {
    squareStyles[selected] = { ...squareStyles[selected], boxShadow: "inset 0 0 0 3px rgba(82,122,99,0.65)" };
  }
  for (const target of legalTargets) {
    squareStyles[target] = {
      ...squareStyles[target],
      backgroundImage: "radial-gradient(circle, rgba(36,36,36,0.14) 20%, transparent 22%)",
    };
  }
  if (isCheckSquare) {
    squareStyles[isCheckSquare] = {
      ...squareStyles[isCheckSquare],
      boxShadow: "inset 0 0 0 3px rgba(192,57,43,0.75)",
      backgroundColor: "rgba(192,57,43,0.18)",
    };
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center" ref={ref}>
      <Chessboard
        position={fen}
        onPieceDrop={handlePieceDrop}
        onSquareClick={(square) => handleSquareClick(square)}
        boardOrientation={orientation}
        boardWidth={boardWidth}
        arePiecesDraggable={draggable}
        showBoardNotation={showCoordinates}
        customSquareStyles={squareStyles}
        customBoardStyle={{ borderRadius: "10px", boxShadow: "0 2px 4px rgba(20,20,20,.04), 0 12px 32px rgba(20,20,20,.08)" }}
        customDarkSquareStyle={{ backgroundColor: "#769656" }}
        customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
      />
      {pendingPromotion && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-ink/20 backdrop-blur-[2px] dark:bg-black/40">
          <div className="flex gap-1.5 rounded-xl bg-surface p-2.5 shadow-panel dark:bg-surface-dark">
            {(["q", "r", "b", "n"] as const).map((p) => (
              <button
                key={p}
                onClick={() => choosePromotion(p)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-[13px] font-medium uppercase text-ink transition-colors hover:border-accent hover:bg-accent/5 dark:border-border-dark dark:text-ink-dark dark:hover:border-accent-dark"
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
