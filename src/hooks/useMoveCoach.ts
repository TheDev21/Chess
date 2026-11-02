import { useCallback, useState } from "react";
import { Chess, type Move } from "chess.js";
import { useStockfish } from "./useStockfish";
import { buildCoachedMove } from "../services/engine/moveCoach";
import type { CoachedMove, PlayerColor } from "../types/chess";

const COACH_DEPTH = 12;
const COACH_CONFIG = { depth: COACH_DEPTH, skillLevel: 20, limitStrength: false };

/**
 * Runs its own Stockfish worker (separate from any opponent-search worker)
 * so coaching never contends with or influences gameplay. Needs the
 * evaluation of the position *before* the move (what the engine would have
 * played) as well as *after* it, which is why every analyzed move costs two
 * searches - see moveCoach.ts for why a single post-move evaluation can't
 * reliably classify a move on its own.
 */
export function useMoveCoach() {
  const engine = useStockfish();
  const [analyzing, setAnalyzing] = useState(false);
  const [lastCoached, setLastCoached] = useState<CoachedMove | null>(null);

  const analyzeMove = useCallback(
    async (ply: number, moverColor: PlayerColor, fenBefore: string, move: Move, fenAfter: string): Promise<CoachedMove | null> => {
      setAnalyzing(true);
      try {
        const evalBefore = await engine.evaluate(fenBefore, COACH_CONFIG);
        if (!evalBefore) return null;
        const evalAfter = await engine.evaluate(fenAfter, COACH_CONFIG);
        if (!evalAfter) return null;

        const coached = buildCoachedMove({ ply, moverColor, fenBefore, fenAfter, move, evalBefore, evalAfter });
        setLastCoached(coached);
        return coached;
      } finally {
        setAnalyzing(false);
      }
    },
    [engine]
  );

  const reset = useCallback(() => setLastCoached(null), []);

  return { status: engine.status, analyzing, lastCoached, analyzeMove, reset };
}

/** Full game review for the Analysis page: classifies every move in a PGN using the same engine + logic as live coaching. */
export async function reviewGame(
  pgn: string,
  evaluate: (fen: string, config: { depth: number; skillLevel: number; limitStrength: boolean }) => Promise<import("../types/chess").EngineEvaluation | null>,
  onProgress?: (done: number, total: number) => void
): Promise<CoachedMove[]> {
  const replay = new Chess();
  replay.loadPgn(pgn);
  const sanMoves = replay.history();

  const game = new Chess();
  const coached: CoachedMove[] = [];

  for (let i = 0; i < sanMoves.length; i++) {
    const fenBefore = game.fen();
    const moverColor: PlayerColor = game.turn() === "w" ? "white" : "black";
    const move = game.move(sanMoves[i]);
    if (!move) break;
    const fenAfter = game.fen();

    const evalBefore = await evaluate(fenBefore, COACH_CONFIG);
    const evalAfter = await evaluate(fenAfter, COACH_CONFIG);
    if (evalBefore && evalAfter) {
      coached.push(buildCoachedMove({ ply: i, moverColor, fenBefore, fenAfter, move, evalBefore, evalAfter }));
    }
    onProgress?.(i + 1, sanMoves.length);
  }

  return coached;
}
