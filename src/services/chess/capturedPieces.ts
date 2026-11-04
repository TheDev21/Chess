import { Chess } from "chess.js";

const FULL_SET: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

/** Derives captured pieces (and the resulting material edge) by diffing the live board against a full starting set - no separate capture log needed. */
export function capturedPieces(fen: string): { capturedByWhite: string[]; capturedByBlack: string[]; materialDiff: number } {
  const board = new Chess(fen).board();
  const onBoard: Record<"w" | "b", Record<string, number>> = { w: {}, b: {} };
  for (const row of board) {
    for (const cell of row) {
      if (!cell || cell.type === "k") continue;
      onBoard[cell.color][cell.type] = (onBoard[cell.color][cell.type] ?? 0) + 1;
    }
  }

  const capturedByWhite: string[] = []; // black pieces white has taken
  const capturedByBlack: string[] = []; // white pieces black has taken
  let materialDiff = 0;

  for (const [type, count] of Object.entries(FULL_SET)) {
    const blackRemaining = onBoard.b[type] ?? 0;
    const whiteRemaining = onBoard.w[type] ?? 0;
    for (let i = 0; i < count - blackRemaining; i++) capturedByWhite.push(type);
    for (let i = 0; i < count - whiteRemaining; i++) capturedByBlack.push(type);
    materialDiff += (count - blackRemaining) * VALUE[type] - (count - whiteRemaining) * VALUE[type];
  }

  return { capturedByWhite, capturedByBlack, materialDiff };
}
