import { Chess } from "chess.js";

// Client-side counterpart to supabase/functions/_shared/replayGame.ts. These
// two files are intentionally NOT the same module - Deno (npm: specifiers)
// and the Vite/React client (bundler-resolved bare specifiers) can't safely
// share one file without an import-map layer this project doesn't otherwise
// need, so instead they're two small, equivalent implementations against
// the same chess.js version (confirmed to match: both pin 1.0.0-beta.8),
// covered by the same test fixtures. Keep any logic change mirrored in both.

export interface ReplayResult {
  fen: string;
  turn: "w" | "b";
  isGameOver: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}

/**
 * Replays a game from the standard starting position through its full SAN
 * move history, rather than reconstructing a Chess instance from a single
 * FEN snapshot. This matters specifically for threefold-repetition
 * detection: chess.js tracks repetition via position counts built up as
 * moves are played with .move(), which a FEN-only `new Chess(fen)` never
 * has - it has no memory of how the position was reached. Every room in
 * this app always starts from the standard position, so this replay is
 * always valid.
 *
 * Returns null if the history itself is corrupt (a recorded move doesn't
 * replay as legal) - callers must treat that as "cannot verify game state"
 * and fail safe, never as permission to proceed.
 */
export function replayGame(moveHistory: { san: string }[]): ReplayResult | null {
  const chess = new Chess();
  for (const m of moveHistory) {
    let move;
    try {
      move = chess.move(m.san);
    } catch {
      move = null;
    }
    if (!move) return null;
  }
  return {
    fen: chess.fen(),
    turn: chess.turn(),
    isGameOver: chess.isGameOver(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw(),
  };
}
