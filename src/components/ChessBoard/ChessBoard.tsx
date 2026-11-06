import { forwardRef, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useContainerSize } from "../../hooks/useContainerSize";
import { adjacentSquare, buildMoveAnnouncement, buildSquareAriaLabel, gridPosition, legalMovesFrom, promotionAnnouncement } from "./keyboardNav";
import wP from "../../assets/pieces/cburnett/wP.svg";
import wN from "../../assets/pieces/cburnett/wN.svg";
import wB from "../../assets/pieces/cburnett/wB.svg";
import wR from "../../assets/pieces/cburnett/wR.svg";
import wQ from "../../assets/pieces/cburnett/wQ.svg";
import wK from "../../assets/pieces/cburnett/wK.svg";
import bP from "../../assets/pieces/cburnett/bP.svg";
import bN from "../../assets/pieces/cburnett/bN.svg";
import bB from "../../assets/pieces/cburnett/bB.svg";
import bR from "../../assets/pieces/cburnett/bR.svg";
import bQ from "../../assets/pieces/cburnett/bQ.svg";
import bK from "../../assets/pieces/cburnett/bK.svg";

// "Cburnett" Staunton piece set by Colin M.L. Burnett (GPLv2+), the same
// artwork Lichess uses by default - see THIRD-PARTY-LICENSES.md. Rendered
// as plain <img> (no SVGR/inline-JSX tooling needed) since react-chessboard's
// customPieces just needs a React element per piece code.
const PIECE_IMAGES: Record<string, string> = { wP, wN, wB, wR, wQ, wK, bP, bN, bB, bR, bQ, bK };
const customPieces = Object.fromEntries(
  Object.entries(PIECE_IMAGES).map(([code, src]) => [
    code,
    ({ squareWidth }: { squareWidth: number }) => (
      <img src={src} alt="" draggable={false} style={{ width: squareWidth, height: squareWidth, pointerEvents: "none" }} />
    ),
  ]),
);

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

  // Premium "Midnight Forest + Antique Gold" board palette (Phase 9). Every
  // gold accent on the board - teaching highlight, selection, last-move -
  // now uses the same shiny gold (#D4AF37), matching the sitewide accent
  // color (also #D4AF37 as of this update). Last-move stays visually
  // distinct from the brighter current selection through lower opacity
  // alone, not a separate, more muted hue.
  const squareStyles: Record<string, React.CSSProperties> = {};
  if (highlightSquares) {
    for (const sq of highlightSquares) {
      squareStyles[sq] = { ...squareStyles[sq], boxShadow: "inset 0 0 0 3px rgba(212,175,55,0.7)", backgroundColor: "rgba(212,175,55,0.22)" };
    }
  }
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: "rgba(212,175,55,0.2)" };
    squareStyles[lastMove.to] = { backgroundColor: "rgba(212,175,55,0.2)" };
  }
  if (selected) {
    squareStyles[selected] = { ...squareStyles[selected], backgroundColor: "rgba(212,175,55,0.35)" };
  }
  for (const target of legalTargets) {
    squareStyles[target] = {
      ...squareStyles[target],
      backgroundImage: "radial-gradient(circle, rgba(50,70,43,0.55) 22%, transparent 24%)",
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
        className="overflow-hidden rounded-[10px] border-[3px] border-[#D4AF37]"
        style={{
          width: boardWidth,
          height: boardWidth,
          boxShadow: "0 2px 4px rgba(20,20,20,.04), 0 12px 32px rgba(20,20,20,.08), 0 0 0 1px rgba(212,175,55,0.35), 0 0 16px 1px rgba(212,175,55,0.25)",
        }}
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
          customPieces={customPieces}
          customSquare={customSquareRef.current as unknown as React.FC<{ children: React.ReactNode; square: Square; squareColor: "white" | "black"; style: Record<string, string | number> }>}
          customBoardStyle={{ borderRadius: "9px" }}
          // A restrained satin finish, not a texture: a faint inset shadow
          // along the top edge and an equally faint highlight along the
          // bottom - the same subtle bevel on every square of that color,
          // board-wide, since this sets the base style react-chessboard
          // applies before any selection/last-move/legal-move overlay.
          customDarkSquareStyle={{ backgroundColor: "#32462B", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.18), inset 0 -1px 0 rgba(235,208,160,0.06)" }}
          customLightSquareStyle={{ backgroundColor: "#EBD0A0", boxShadow: "inset 0 1px 2px rgba(50,70,43,0.08), inset 0 -1px 0 rgba(255,255,255,0.4)" }}
        />
        {/*
          A non-interactive lighting/grain layer, sampled from the reference
          photo rather than guessed: measuring actual pixel brightness across
          all 64 squares showed a soft overhead-light gradient (brighter near
          the top of the board, darker toward the bottom) plus a small amount
          of fine per-square variation consistent with a subtle wood grain.
          Both are reproduced here as CSS only - no texture image, no new
          dependency - and kept far too faint, and far too inert
          (pointer-events: none, it is never a drag/click/keyboard target),
          to interfere with square identification, piece visibility, or move
          indicators underneath it.
        */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[9px]"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(255,255,255,0.07), rgba(0,0,0,0.1)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "cover, 160px 160px",
            mixBlendMode: "overlay",
            opacity: 0.5,
          }}
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
