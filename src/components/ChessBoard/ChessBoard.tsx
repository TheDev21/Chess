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
  /** Lesson-teaching highlight (e.g."these squares the knight can reach"), independent of last-move/selection. */
  highlightSquares?: string[];
  /** When set, only this square may be picked up - used by lesson"Try It"steps so the user can't wander off-topic. */
  restrictToSquare?: string;
  /** Called on any square tap/click, in addition to normal move handling - used by the coordinates lesson. */
  onSquareTap?: (square: string) => void;
}

export function ChessBoard({
  fen,
  onMove,
  orientation,
  draggable = true,
  showLegalMoves = true,
  showCoordinates = true,
  lastMove = null,
  highlightSquares,
  restrictToSquare,
  onSquareTap,
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
      return true; // tentatively"handled"- board shouldn't snap back while the picker is open
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
    onSquareTap?.(square);
    if (!draggable) return;
    if (!selected) {
      if (restrictToSquare && square !== restrictToSquare) return;
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
    if (restrictToSquare && source !== restrictToSquare) return false;
    setSelected(null);
    return attemptMove(source, target);
  };

  // A soft, warm highlight for the last move played - visible on both board
  // squares without reading as a bright"selection"color.
  const squareStyles: Record<string, React.CSSProperties> = {};
  if (highlightSquares) {
    for (const sq of highlightSquares) {
      squareStyles[sq] = { ...squareStyles[sq], boxShadow: "inset 0 0 0 3px rgba(201,138,46,0.7)", backgroundColor: "rgba(201,138,46,0.22)" };
    }
  }
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: "#f3e6a5" };
    squareStyles[lastMove.to] = { backgroundColor: "#f3e6a5" };
  }
  if (selected) {
    squareStyles[selected] = { ...squareStyles[selected], backgroundColor: "#f6d365" };
  }
  for (const target of legalTargets) {
    squareStyles[target] = {
      ...squareStyles[target],
      backgroundImage: "radial-gradient(circle, rgba(49,92,70,0.45) 22%, transparent 24%)",
    };
  }
  if (isCheckSquare) {
    squareStyles[isCheckSquare] = {
      ...squareStyles[isCheckSquare],
      boxShadow: "inset 0 0 0 3px rgba(217,119,112,0.85)",
      backgroundColor: "rgba(217,119,112,0.35)",
    };
  }

  const innerWidth = Math.max(0, boardWidth - 2);

  return (
    <div className="relative flex h-full w-full items-center justify-center" ref={ref}>
      <div
        className="overflow-hidden rounded-[10px] border border-border"
        style={{ width: boardWidth, height: boardWidth, boxShadow: "0 2px 4px rgba(20,20,20,.04), 0 12px 32px rgba(20,20,20,.08)" }}
      >
        <Chessboard
          position={fen}
          onPieceDrop={handlePieceDrop}
          onSquareClick={(square) => handleSquareClick(square)}
          boardOrientation={orientation}
          boardWidth={innerWidth}
          arePiecesDraggable={draggable}
          showBoardNotation={showCoordinates}
          customSquareStyles={squareStyles}
          customBoardStyle={{ borderRadius: "9px" }}
          customDarkSquareStyle={{ backgroundColor: "#769656" }}
          customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
        />
      </div>
      {pendingPromotion && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-ink/20 backdrop-blur-[2px]">
          <div className="flex gap-1.5 rounded-xl bg-surface p-2.5 shadow-panel">
            {(["q", "r", "b", "n"] as const).map((p) => (
              <button
                key={p}
                onClick={() => choosePromotion(p)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-[13px] font-medium uppercase text-ink transition-colors hover:border-accent hover:bg-accent/5"
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
