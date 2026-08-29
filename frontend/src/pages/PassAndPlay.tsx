import { useCallback, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "../components/Board";
import { MoveHistory } from "../components/MoveHistory";
import { CoachPanel } from "../components/CoachPanel";
import { useCoach } from "../hooks/useCoach";
import type { MoveHistoryEntry } from "../types";

export function PassAndPlay() {
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [history, setHistory] = useState<MoveHistoryEntry[]>([]);
  const coach = useCoach();

  const turn = game.turn() === "w" ? "white" : "black";
  const status = useMemo(() => {
    if (game.isCheckmate()) return `Checkmate — ${turn === "white" ? "Black" : "White"} wins.`;
    if (game.isStalemate()) return "Stalemate — draw.";
    if (game.isDraw()) return "Draw.";
    if (game.isCheck()) return `${turn === "white" ? "White" : "Black"} is in check.`;
    return `${turn === "white" ? "White" : "Black"} to move.`;
  }, [fen, turn, game]);

  const handleDrop = useCallback(
    (source: string, target: string) => {
      const fenBefore = game.fen();
      const moverColor = game.turn() === "w" ? "white" : "black";
      let move;
      try {
        move = game.move({ from: source, to: target, promotion: "q" });
      } catch {
        move = null;
      }
      if (!move) return false;

      const fenAfter = game.fen();
      setFen(fenAfter);
      setHistory((h) => [...h, { san: move!.san, fen: fenAfter }]);
      coach.reset();
      coach.explain(fenBefore, fenAfter, move.san, moverColor);
      return true;
    },
    [game, coach]
  );

  const resetGame = () => {
    game.reset();
    setFen(game.fen());
    setHistory([]);
    coach.reset();
  };

  return (
    <div className="page game-page">
      <div className="game-main">
        <div className="game-status">{status}</div>
        <Board fen={fen} onMove={handleDrop} boardOrientation={turn} />
        <button className="btn" onClick={resetGame}>
          New Game
        </button>
      </div>
      <div className="game-sidebar">
        <MoveHistory moves={history} />
        <CoachPanel
          enabled={coach.enabled}
          onToggle={coach.setEnabled}
          loading={coach.loading}
          explanation={coach.explanation}
          error={coach.error}
        />
      </div>
    </div>
  );
}
