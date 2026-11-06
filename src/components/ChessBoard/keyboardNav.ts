import { Chess, type Square } from "chess.js";

// Pure helpers behind ChessBoard's keyboard navigation and screen-reader
// descriptions - no React, no DOM, so they're testable the same way the
// rest of this repo tests pure logic (see __tests__/keyboardNav.test.ts).
// All legal-move knowledge comes from chess.js; nothing here re-implements
// chess rules.

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const PIECE_NAMES: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

/** "e4" -> "White pawn", or "empty" if the square has no piece. Returns "empty" on an invalid FEN rather than throwing, matching ChessBoard's existing defensive style. */
export function pieceLabel(fen: string, square: string): string {
  try {
    const game = new Chess(fen);
    const piece = game.get(square as Square);
    if (!piece) return "empty";
    const color = piece.color === "w" ? "White" : "Black";
    return `${color} ${PIECE_NAMES[piece.type]}`;
  } catch {
    return "empty";
  }
}

/**
 * The destination squares of every legal move from `square` - the same
 * chess.js call ChessBoard already uses for its legal-move highlight dots.
 * Deduplicated: a promoting pawn has one verbose move per promotion choice
 * (queen/rook/bishop/knight) all sharing the same `to` square, which would
 * otherwise repeat that square once per choice in the announcement.
 */
export function legalMovesFrom(fen: string, square: string): string[] {
  try {
    const game = new Chess(fen);
    return [...new Set(game.moves({ square: square as Square, verbose: true }).map((m) => m.to))];
  } catch {
    return [];
  }
}

/**
 * The square reached from `square` by an arrow key, respecting board
 * orientation so "visual up" always means "away from the player at the
 * bottom of the screen" regardless of which color is shown there. Returns
 * null for a non-arrow key or a move that would leave the board.
 */
export function adjacentSquare(square: string, key: string, orientation: "white" | "black"): string | null {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  if (file < 0 || !rank) return null;

  let deltaFile = 0;
  let deltaRank = 0;
  if (key === "ArrowUp") deltaRank = orientation === "white" ? 1 : -1;
  else if (key === "ArrowDown") deltaRank = orientation === "white" ? -1 : 1;
  else if (key === "ArrowLeft") deltaFile = orientation === "white" ? -1 : 1;
  else if (key === "ArrowRight") deltaFile = orientation === "white" ? 1 : -1;
  else return null;

  const nextFile = file + deltaFile;
  const nextRank = rank + deltaRank;
  if (nextFile < 0 || nextFile > 7 || nextRank < 1 || nextRank > 8) return null;
  return `${FILES[nextFile]}${nextRank}`;
}

/** 1-based visual row/column for aria-rowindex/aria-colindex, accounting for orientation (row 1 is always the top of the screen). */
export function gridPosition(square: string, orientation: "white" | "black"): { row: number; col: number } {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  return orientation === "white" ? { row: 9 - rank, col: file + 1 } : { row: rank, col: 8 - file };
}

/** The accessible name for a square: coordinate, occupant, and selected/legal-move state - the same information the mouse player gets from the board's visual highlighting. */
export function buildSquareAriaLabel(
  fen: string,
  square: string,
  opts: { selected: boolean; legalMove: boolean },
): string {
  let label = `${square}, ${pieceLabel(fen, square)}`;
  if (opts.selected) label += ", selected";
  if (opts.legalMove) label += ", legal move";
  return label;
}

const PROMOTION_PIECE_NAMES: Record<string, string> = { q: "queen", r: "rook", b: "bishop", n: "knight" };

/** The live-region message for the selection/move outcome described by `status` - the keyboard-and-mouse-shared event from ChessBoard's own click handler. */
export function buildMoveAnnouncement(
  status:
    | { kind: "selected"; square: string; fen: string; legalTargets: string[] }
    | { kind: "deselected"; square: string }
    | { kind: "promotion-pending" }
    | { kind: "moved"; from: string; to: string; fenBeforeMove: string }
    | { kind: "illegal"; square: string; fen: string },
): string {
  switch (status.kind) {
    case "selected": {
      const desc = pieceLabel(status.fen, status.square);
      return status.legalTargets.length > 0
        ? `${status.square} selected, ${desc}. Legal moves: ${status.legalTargets.join(", ")}.`
        : `${status.square} selected, ${desc}. No legal moves.`;
    }
    case "deselected":
      return `${status.square} deselected.`;
    case "promotion-pending":
      return "Promotion. Choose a piece: queen, rook, bishop, or knight.";
    case "moved":
      return `Moved ${pieceLabel(status.fenBeforeMove, status.from)} from ${status.from} to ${status.to}.`;
    case "illegal":
      return `Illegal move. ${status.square} selected, ${pieceLabel(status.fen, status.square)}.`;
  }
}

export function promotionAnnouncement(piece: "q" | "r" | "b" | "n", from: string, to: string): string {
  return `Promoted to ${PROMOTION_PIECE_NAMES[piece]}. Moved ${from} to ${to}.`;
}
