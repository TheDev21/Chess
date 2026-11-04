import { Chess } from "chess.js";
import type { PlayerColor } from "../../types/chess";

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export interface CapturedPieces {
  white: string[]; // pieces White has captured (i.e. Black pieces taken off the board)
  black: string[];
  materialDiff: number; // positive = White is ahead on material
}

/** Derives captured pieces and material balance by diffing the starting set against what's left on the board. */
export function getCapturedPieces(game: Chess): CapturedPieces {
  const remaining: Record<string, number> = {};
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell) continue;
      const key = cell.color + cell.type;
      remaining[key] = (remaining[key] ?? 0) + 1;
    }
  }
  const starting: Record<string, number> = {
    wp: 8,
    wn: 2,
    wb: 2,
    wr: 2,
    wq: 1,
    bp: 8,
    bn: 2,
    bb: 2,
    br: 2,
    bq: 1,
  };

  const white: string[] = []; // Black pieces White has captured
  const black: string[] = []; // White pieces Black has captured
  let materialDiff = 0;

  for (const key of Object.keys(starting)) {
    const color = key[0];
    const type = key[1];
    const missing = starting[key] - (remaining[key] ?? 0);
    for (let i = 0; i < missing; i++) {
      if (color === "b") white.push(type);
      else black.push(type);
    }
    const sign = color === "w" ? -1 : 1; // White captured black pieces -> + for White material
    materialDiff += sign * missing * PIECE_VALUE[type];
  }

  return { white, black, materialDiff };
}

export type GameResult = { over: false } | { over: true; result: "1-0" | "0-1" | "1/2-1/2"; reason: string };

export function getGameResult(game: Chess): GameResult {
  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "0-1" : "1-0"; // side to move is checkmated
    return { over: true, result: winner, reason: "Checkmate" };
  }
  if (game.isStalemate()) return { over: true, result: "1/2-1/2", reason: "Stalemate" };
  if (game.isThreefoldRepetition()) return { over: true, result: "1/2-1/2", reason: "Threefold repetition" };
  if (game.isInsufficientMaterial()) return { over: true, result: "1/2-1/2", reason: "Insufficient material" };
  if (game.isDraw()) return { over: true, result: "1/2-1/2", reason: "Draw (50-move rule)" };
  return { over: false };
}

export function colorToMove(game: Chess): PlayerColor {
  return game.turn() === "w" ? "white" : "black";
}

export function opponentOf(color: PlayerColor): PlayerColor {
  return color === "white" ? "black" : "white";
}
