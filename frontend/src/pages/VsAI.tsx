import { useCallback, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "../components/Board";
import { MoveHistory } from "../components/MoveHistory";
import { CoachPanel } from "../components/CoachPanel";
import { DifficultySelector } from "../components/DifficultySelector";
import { useCoach } from "../hooks/useCoach";
import { requestAiMove } from "../api/client";
import type { Difficulty, MoveHistoryEntry } from "../types";

export function VsAI() {
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [history, setHistory] = useState<MoveHistoryEntry[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [aiThinking, setAiThinking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const coach = useCoach();

  const playerColor: "white" = "white";
  const turn = game.turn() === "w" ? "white" : "black";

  const status = useMemo(() => {
    if (game.isCheckmate()) return `Checkmate — ${turn === "white" ? "Black" : "White"} wins.`;
    if (game.isStalemate()) return "Stalemate — draw.";
    if (game.isDraw()) return "Draw.";
    if (aiThinking) return "AI is thinking...";
    if (game.isCheck()) return `${turn === "white" ? "White" : "Black"} is in check.`;
    return turn === playerColor ? "Your move." : "AI to move.";
  }, [fen, turn, game, aiThinking]);

  const playAiMove = useCallback(
    async (currentFen: string) => {
      setAiThinking(true);
      setAiError(null);
      try {
        const { move } = await requestAiMove(currentFen, difficulty);
        const fenBefore = game.fen();
        const applied = game.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
        if (!applied) return;
        const fenAfter = game.fen();
        setFen(fenAfter);
        setHistory((h) => [...h, { san: applied.san, fen: fenAfter }]);
        coach.reset();
        coach.explain(fenBefore, fenAfter, applied.san, "black");
      } catch (err) {
        setAiError(err instanceof Error ? err.message : "AI move failed.");
      } finally {
        setAiThinking(false);
      }
    },
    [game, difficulty, coach]
  );

  const handleDrop = useCallback(
    (source: string, target: string) => {
      if (game.turn() !== "w" || aiThinking) return false;
      const fenBefore = game.fen();
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
      coach.explain(fenBefore, fenAfter, move.san, "white");

      if (!game.isGameOver()) {
        void playAiMove(fenAfter);
      }
      return true;
    },
    [game, aiThinking, coach, playAiMove]
  );

  const resetGame = () => {
    game.reset();
    setFen(game.fen());
    setHistory([]);
    setAiError(null);
    coach.reset();
  };

  return (
    <div className="page game-page">
      <div className="game-main">
        <div className="game-status">{status}</div>
        <Board fen={fen} onMove={handleDrop} boardOrientation={playerColor} arePiecesDraggable={!aiThinking} />
        <div className="controls-row">
          <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={history.length > 0} />
          <button className="btn" onClick={resetGame}>
            New Game
          </button>
        </div>
        {aiError && <p className="coach-error">{aiError}</p>}
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
