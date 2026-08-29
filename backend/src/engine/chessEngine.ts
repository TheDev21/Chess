import { Chess, Move } from "chess.js";
import { evaluateBoard } from "./evaluation";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy: 2,
  medium: 4,
  hard: 6,
};

// Worst-case positions (e.g. the opening, with no captures to help pruning)
// can make a fixed-depth search explode combinatorially. Rather than block
// a request for tens of seconds, each difficulty gets a search deadline;
// iterative deepening (see findBestMove) means we still return the best
// move found so far - just from a shallower completed depth - if the
// target depth isn't reached in time.
export const DIFFICULTY_TIME_BUDGET_MS: Record<Difficulty, number> = {
  easy: 2000,
  medium: 5000,
  hard: 9000,
};

export interface EngineMove {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  fenAfter: string;
  evaluation: number;
  depthReached: number;
}

// Large but finite so mate scores stay comparable/orderable (Infinity - Infinity
// is NaN, which would break alpha-beta comparisons).
const MATE_SCORE = 1_000_000;

class SearchTimeout extends Error {}

/** Checked every NODE_CHECK_INTERVAL nodes rather than on every call, since Date.now() isn't free. */
const NODE_CHECK_INTERVAL = 512;

/**
 * Orders moves to improve alpha-beta pruning efficiency: captures and
 * promotions are searched first since they're more likely to cause cutoffs,
 * and `preferred` (the best move from the previous iterative-deepening pass,
 * if any) is searched first of all.
 */
function orderMoves(moves: Move[], preferred?: Move | null): Move[] {
  const score = (m: Move) => {
    if (preferred && m.from === preferred.from && m.to === preferred.to) return 1000;
    return (m.captured ? 10 : 0) + (m.promotion ? 5 : 0);
  };
  return [...moves].sort((a, b) => score(b) - score(a));
}

/**
 * Scores a position with no legal moves for the side to move: checkmate
 * (bad for the mover, scaled by depth so faster mates are preferred) or
 * stalemate (a draw).
 */
function terminalScore(game: Chess, depth: number): number {
  if (game.isCheck()) {
    const mateValue = MATE_SCORE + depth;
    return game.turn() === "w" ? -mateValue : mateValue;
  }
  return 0; // stalemate
}

interface SearchContext {
  deadline: number;
  nodes: number;
}

function checkDeadline(ctx: SearchContext) {
  ctx.nodes++;
  if (ctx.nodes % NODE_CHECK_INTERVAL === 0 && Date.now() > ctx.deadline) {
    throw new SearchTimeout();
  }
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  ctx: SearchContext
): number {
  checkDeadline(ctx);

  const moves = orderMoves(game.moves({ verbose: true }) as Move[]);

  if (moves.length === 0) {
    return terminalScore(game, depth);
  }
  if (depth === 0) {
    return evaluateBoard(game);
  }

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      game.move(move.san);
      const score = minimax(game, depth - 1, alpha, beta, false, ctx);
      game.undo();
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break; // beta cutoff
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      game.move(move.san);
      const score = minimax(game, depth - 1, alpha, beta, true, ctx);
      game.undo();
      best = Math.min(best, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break; // alpha cutoff
    }
    return best;
  }
}

/** Runs one complete-depth search, returning the best move at that depth. */
function searchAtDepth(
  game: Chess,
  depth: number,
  legalMoves: Move[],
  preferred: Move | null,
  ctx: SearchContext
): { move: Move; score: number } {
  const maximizing = game.turn() === "w";
  const ordered = orderMoves(legalMoves, preferred);

  let bestMove = ordered[0];
  let bestScore = maximizing ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  for (const move of ordered) {
    game.move(move.san);
    const score = minimax(game, depth - 1, alpha, beta, !maximizing, ctx);
    game.undo();

    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (maximizing) alpha = Math.max(alpha, bestScore);
    else beta = Math.min(beta, bestScore);
  }

  return { move: bestMove, score: bestScore };
}

/**
 * Finds the best move for the side to move in `fen` via iterative-deepening
 * minimax + alpha-beta pruning: it searches depth 1, then 2, and so on up
 * to `targetDepth`, keeping the best move found at the deepest depth that
 * finished within `timeBudgetMs`. This bounds worst-case latency (a search
 * that would take too long at depth N still returns the depth N-1 result)
 * while behaving identically to a plain fixed-depth search whenever that
 * search is fast enough to finish - which is the common case away from the
 * opening position.
 */
export function findBestMove(
  fen: string,
  targetDepth: number,
  timeBudgetMs = 5000
): EngineMove | null {
  const game = new Chess(fen);
  const legalMoves = game.moves({ verbose: true }) as Move[];
  if (legalMoves.length === 0) return null;

  const ctx: SearchContext = { deadline: Date.now() + timeBudgetMs, nodes: 0 };

  let best = searchAtDepth(game, 1, legalMoves, null, ctx);
  let depthReached = 1;

  for (let depth = 2; depth <= targetDepth; depth++) {
    try {
      best = searchAtDepth(game, depth, legalMoves, best.move, ctx);
      depthReached = depth;
    } catch (err) {
      if (err instanceof SearchTimeout) {
        // A timeout can be thrown mid-recursion, skipping the game.undo()
        // calls the aborted branches were waiting on and leaving `game` in
        // an arbitrary deep position. Reload the original position so the
        // move we apply below is valid.
        game.load(fen);
        break;
      }
      throw err;
    }
  }

  game.move(best.move.san);
  const fenAfter = game.fen();

  return {
    from: best.move.from,
    to: best.move.to,
    promotion: best.move.promotion,
    san: best.move.san,
    fenAfter,
    evaluation: best.score,
    depthReached,
  };
}

export function depthForDifficulty(difficulty: Difficulty): number {
  return DIFFICULTY_DEPTH[difficulty];
}

export function timeBudgetForDifficulty(difficulty: Difficulty): number {
  return DIFFICULTY_TIME_BUDGET_MS[difficulty];
}
