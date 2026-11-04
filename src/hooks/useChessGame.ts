import { useCallback, useRef, useState } from "react";
import { Chess, type Move } from "chess.js";
import { getGameResult, colorToMove } from "../services/chess/gameEngine";
import type { PlayerColor } from "../types/chess";

export interface MoveRecord {
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  color: PlayerColor;
}

/** Owns one local chess.js game: moves, undo, resignation, draw offers, and derived state. Shared by Pass-and-Play and vs-Computer. */
export function useChessGame() {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [resignedBy, setResignedBy] = useState<PlayerColor | null>(null);
  const [drawAgreed, setDrawAgreed] = useState(false);

  const turn = colorToMove(gameRef.current);
  const gameResult = getGameResult(gameRef.current);
  const isOver = gameResult.over || resignedBy !== null || drawAgreed;

  const result: { result: string; reason: string } | null = gameResult.over
    ? { result: gameResult.result, reason: gameResult.reason }
    : resignedBy
      ? { result: resignedBy === "white" ? "0-1" : "1-0", reason: `${resignedBy === "white" ? "White" : "Black"} resigned` }
      : drawAgreed
        ? { result: "1/2-1/2", reason: "Draw agreed" }
        : null;

  const makeMove = useCallback(
    (from: string, to: string, promotion: string = "q"): Move | null => {
      if (isOver) return null;
      const fenBefore = gameRef.current.fen();
      const color = colorToMove(gameRef.current);
      let move: Move | null;
      try {
        move = gameRef.current.move({ from, to, promotion: promotion as "q" | "r" | "b" | "n" });
      } catch {
        move = null;
      }
      if (!move) return null;
      const fenAfter = gameRef.current.fen();
      setFen(fenAfter);
      setMoves((prev) => [...prev, { san: move!.san, uci: from + to + (move!.promotion ?? ""), fenBefore, fenAfter, color }]);
      return move;
    },
    [isOver],
  );

  const undo = useCallback(() => {
    gameRef.current.undo();
    setMoves((prev) => prev.slice(0, -1));
    setFen(gameRef.current.fen());
  }, []);

  const reset = useCallback(() => {
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setMoves([]);
    setResignedBy(null);
    setDrawAgreed(false);
  }, []);

  const resign = useCallback(() => setResignedBy(turn), [turn]);
  const offerDraw = useCallback(() => setDrawAgreed(true), []);

  const pgn = useCallback(() => gameRef.current.pgn(), []);

  return {
    game: gameRef.current,
    fen,
    turn,
    moves,
    isOver,
    result,
    makeMove,
    undo,
    reset,
    resign,
    offerDraw,
    pgn,
  };
}
