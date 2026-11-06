import { forwardRef, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useContainerSize } from "../../hooks/useContainerSize";
import { adjacentSquare, buildMoveAnnouncement, buildSquareAriaLabel, gridPosition, legalMovesFrom, promotionAnnouncement } from "./keyboardNav";

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

// Square props react-chessboard actually passes to a `customSquare` renderer
// (children, ref, square, squareColor, style) aren't exported from its
// public types, so this is written out directly rather than imported.
type SquareRendererProps = {
  children: React.ReactNode;
  square: Square;
  squareColor: "white" | "black";
  style: Record<string, string | number>;
};

interface SquareCallbacks {
  fen: string;
  orientation: "white" | "black";
  selected: string | null;
  focusedSquare: string;
  legalTargets: Set<string>;
  onActivate: (square: string) => void;
  onFocusSquare: (square: string) => void;
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
  const [liveMessage, setLiveMessage] = useState("");
  const [focusedSquare, setFocusedSquare] = useState<string>(orientation === "white" ? "a1" : "h8");
  const squareRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
    const { from, to } = pendingPromotion;
    onMove(from, to, piece);
    setLiveMessage(promotionAnnouncement(piece, from, to));
    setPendingPromotion(null);
  }

  const legalTargets = useMemo(() => {
    if (!selected || !showLegalMoves) return new Set<string>();
    return new Set(legalMovesFrom(fen, selected));
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

  // Shared by mouse clicks, taps, and the keyboard's Enter/Space - the same
  // select-then-move state machine either way, including restrictToSquare.
  const handleSquareClick = (square: string) => {
    onSquareTap?.(square);
    if (!draggable) return;
    if (!selected) {
      if (restrictToSquare && square !== restrictToSquare) return;
      setSelected(square);
      const targets = legalMovesFrom(fen, square);
      setLiveMessage(buildMoveAnnouncement({ kind: "selected", square, fen, legalTargets: targets }));
      return;
    }
    if (selected === square) {
      setSelected(null);
      setLiveMessage(buildMoveAnnouncement({ kind: "deselected", square }));
      return;
    }
    const fenBeforeMove = fen;
    const wasPromotion = isPromotion(selected, square);
    const moved = attemptMove(selected, square);
    if (wasPromotion && moved) {
      setLiveMessage(buildMoveAnnouncement({ kind: "promotion-pending" }));
      setSelected(null);
      return;
    }
    if (moved) {
      setLiveMessage(buildMoveAnnouncement({ kind: "moved", from: selected, to: square, fenBeforeMove }));
      setSelected(null);
    } else {
      setLiveMessage(buildMoveAnnouncement({ kind: "illegal", square, fen }));
      setSelected(square);
    }
  };

  const handlePieceDrop = (source: string, target: string) => {
    if (restrictToSquare && source !== restrictToSquare) return false;
    setSelected(null);
    return attemptMove(source, target);
  };

  // Keyboard focus moves between squares on its own; it never selects a
  // piece by itself - only Enter/Space (routed to handleSquareClick above)
  // does that, same as a mouse click never fires on mere hover.
  const handleFocusSquare = (square: string) => {
    setFocusedSquare(square);
    squareRefs.current[square]?.focus();
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

  // customSquare's rendered component must keep a stable identity across
  // renders (react-chessboard would otherwise remount every square's DOM
  // node, including react-dnd's internal drag/drop bindings, on every
  // keystroke). Callbacks still need to see fresh state each render, so
  // they're read from this ref rather than captured at component-creation
  // time - the standard "latest ref" pattern for this exact situation.
  const callbacksRef = useRef<SquareCallbacks>({
    fen,
    orientation,
    selected,
    focusedSquare,
    legalTargets,
    onActivate: handleSquareClick,
    onFocusSquare: handleFocusSquare,
  });
  callbacksRef.current = { fen, orientation, selected, focusedSquare, legalTargets, onActivate: handleSquareClick, onFocusSquare: handleFocusSquare };

  const customSquareRef = useRef<ReturnType<typeof forwardRef<HTMLDivElement, SquareRendererProps>> | null>(null);
  if (!customSquareRef.current) {
    customSquareRef.current = forwardRef<HTMLDivElement, SquareRendererProps>(function KeyboardSquare({ children, square, style }, forwardedRef) {
      const cb = callbacksRef.current;
      const isSelected = cb.selected === square;
      const isLegalMove = cb.legalTargets.has(square);
      const pos = gridPosition(square, cb.orientation);
      return (
        <div
          ref={(el: HTMLDivElement | null) => {
            squareRefs.current[square] = el;
            if (typeof forwardedRef === "function") forwardedRef(el);
            else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }}
          style={style}
          role="gridcell"
          aria-rowindex={pos.row}
          aria-colindex={pos.col}
          aria-selected={isSelected}
          aria-label={buildSquareAriaLabel(cb.fen, square, { selected: isSelected, legalMove: isLegalMove })}
          tabIndex={cb.focusedSquare === square ? 0 : -1}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              // Stop here: a page-level listener (useMoveViewer's move-history
              // ArrowLeft/ArrowRight/Home/End shortcuts, used by VsComputer and
              // PassAndPlay) must not also react to a key this square already
              // handled - that's what silently disabled dragging mid-keyboard-move
              // during manual testing (it set viewer.isLive to false, which
              // VsComputer/PassAndPlay use to drive ChessBoard's own `draggable`).
              e.stopPropagation();
              cb.onActivate(square);
              return;
            }
            const next = adjacentSquare(square, e.key, cb.orientation);
            if (next) {
              e.preventDefault();
              e.stopPropagation();
              cb.onFocusSquare(next);
            }
          }}
        >
          {children}
        </div>
      );
    });
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center" ref={ref}>
      <div
        className="overflow-hidden rounded-[10px] border border-border"
        style={{ width: boardWidth, height: boardWidth, boxShadow: "0 2px 4px rgba(20,20,20,.04), 0 12px 32px rgba(20,20,20,.08)" }}
        role="grid"
        aria-label={`Chess board, ${orientation === "white" ? "White" : "Black"} at the bottom`}
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
          customSquare={customSquareRef.current as unknown as React.FC<{ children: React.ReactNode; square: Square; squareColor: "white" | "black"; style: Record<string, string | number> }>}
          customBoardStyle={{ borderRadius: "9px" }}
          customDarkSquareStyle={{ backgroundColor: "#769656" }}
          customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
        />
      </div>
      <div aria-live="polite" role="status" className="sr-only">
        {liveMessage}
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
