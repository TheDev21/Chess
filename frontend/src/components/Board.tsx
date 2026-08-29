import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { useContainerWidth } from "../hooks/useContainerWidth";
import { useViewportSize } from "../hooks/useViewportSize";

interface BoardProps {
  fen: string;
  onMove: (sourceSquare: string, targetSquare: string) => boolean;
  boardOrientation: "white" | "black";
  arePiecesDraggable?: boolean;
}

/**
 * Supports both drag-and-drop and tap-to-move (select a piece, then tap its
 * destination) so the board is usable on touch devices as well as desktop.
 */
export function Board({ fen, onMove, boardOrientation, arePiecesDraggable = true }: BoardProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const { height: viewportHeight } = useViewportSize();
  // On a short landscape viewport (e.g. a phone rotated sideways), cap the
  // board by available height too so it doesn't render taller than the
  // screen and push the rest of the page out of view.
  const boardWidth = Math.max(240, Math.min(width, 640, viewportHeight * 0.7));
  const [selected, setSelected] = useState<string | null>(null);

  const handleSquareClick = (square: string) => {
    if (!selected) {
      setSelected(square);
      return;
    }
    if (selected === square) {
      setSelected(null);
      return;
    }
    const moved = onMove(selected, square);
    setSelected(moved ? null : square);
  };

  const handlePieceDrop = (source: string, target: string) => {
    setSelected(null);
    return onMove(source, target);
  };

  return (
    <div className="board-container" ref={ref}>
      <Chessboard
        position={fen}
        onPieceDrop={handlePieceDrop}
        onSquareClick={(square) => handleSquareClick(square)}
        boardOrientation={boardOrientation}
        boardWidth={boardWidth}
        arePiecesDraggable={arePiecesDraggable}
        customBoardStyle={{
          borderRadius: "8px",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.25)",
        }}
        customDarkSquareStyle={{ backgroundColor: "#7a9169" }}
        customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
        customSquareStyles={
          selected ? { [selected]: { boxShadow: "inset 0 0 0 4px #f2c94c" } } : {}
        }
      />
    </div>
  );
}
