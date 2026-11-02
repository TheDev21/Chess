import { useEffect, useMemo, useRef, useState } from "react";
import { ChessBoard } from "../../components/ChessBoard/ChessBoard";
import { GameControls } from "../../components/GameControls/GameControls";
import { MoveHistory } from "../../components/MoveHistory/MoveHistory";
import { MoveCoachPanel } from "../../components/MoveCoach/MoveCoachPanel";
import { GameResult } from "../../components/GameResult/GameResult";
import { useChessGame } from "../../hooks/useChessGame";
import { useMoveCoach } from "../../hooks/useMoveCoach";
import { useStockfish } from "../../hooks/useStockfish";
import { colorToMove } from "../../services/chess/gameEngine";
import { saveGame } from "../../services/storage/gameHistory";
import { DIFFICULTY_CONFIG, TIME_CONTROLS, type Difficulty, type PlayerColor, type TimeControlId } from "../../types/chess";
import type { AppSettings } from "../../services/storage/settings";
import clsx from "clsx";

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VsComputer({ settings }: { settings: AppSettings }) {
  const [started, setStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [colorChoice, setColorChoice] = useState<PlayerColor | "random">("white");
  const [timeControl, setTimeControl] = useState<TimeControlId>("unlimited");
  const [playerColor, setPlayerColor] = useState<PlayerColor>("white");

  const g = useChessGame();
  const coach = useMoveCoach();
  const opponent = useStockfish();
  const [coachEnabled, setCoachEnabled] = useState(settings.moveCoachEnabled);
  const [thinking, setThinking] = useState(false);
  const [flagFall, setFlagFall] = useState<PlayerColor | null>(null);
  const savedRef = useRef(false);

  const seconds = TIME_CONTROLS[timeControl].seconds;
  const [clocks, setClocks] = useState({ white: seconds ?? 0, black: seconds ?? 0 });

  const gameOver = g.isOver || flagFall !== null;
  const lastMove = g.moves[g.moves.length - 1];

  // Clock ticking
  useEffect(() => {
    if (!started || seconds === null || gameOver) return;
    const turn = colorToMove(g.game);
    const interval = setInterval(() => {
      setClocks((prev) => {
        const next = { ...prev, [turn]: Math.max(0, prev[turn] - 1) };
        if (next[turn] === 0) setFlagFall(turn);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [started, seconds, gameOver, g.fen, g.game]);

  const handleStart = () => {
    const resolvedColor = colorChoice === "random" ? (Math.random() < 0.5 ? "white" : "black") : colorChoice;
    setPlayerColor(resolvedColor);
    setClocks({ white: seconds ?? 0, black: seconds ?? 0 });
    setFlagFall(null);
    savedRef.current = false;
    setStarted(true);
  };

  const playOpponentMove = async (fen: string) => {
    if (opponent.status !== "ready") return;
    setThinking(true);
    try {
      const config = DIFFICULTY_CONFIG[difficulty];
      const evalResult = await opponent.evaluate(fen, config);
      if (!evalResult) return;
      const from = evalResult.bestMoveUci.slice(0, 2);
      const to = evalResult.bestMoveUci.slice(2, 4);
      const promotion = evalResult.bestMoveUci.length > 4 ? evalResult.bestMoveUci.slice(4, 5) : undefined;
      const fenBefore = g.fen;
      const move = g.makeMove(from, to, promotion);
      if (move && coachEnabled) {
        void coach.analyzeMove(g.moves.length, colorToMove(g.game) === "white" ? "black" : "white", fenBefore, move, g.fen);
      }
    } finally {
      setThinking(false);
    }
  };

  // Trigger the opponent's move whenever it becomes their turn.
  useEffect(() => {
    if (!started || gameOver) return;
    const turn = colorToMove(g.game);
    if (turn !== playerColor && !thinking) {
      void playOpponentMove(g.fen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, g.fen, playerColor, gameOver]);

  useEffect(() => {
    if (gameOver && started && !savedRef.current) {
      savedRef.current = true;
      const result = flagFall ? (flagFall === "white" ? "0-1" : "1-0") : g.result?.result ?? "*";
      saveGame({
        id: crypto.randomUUID(),
        playedAt: new Date().toISOString(),
        mode: "computer",
        opponent: `Stockfish (${DIFFICULTY_CONFIG[difficulty].label})`,
        playerColor,
        result,
        moveCount: g.moves.length,
        pgn: g.pgn(),
      });
    }
  }, [gameOver, started, flagFall, g, difficulty, playerColor]);

  const handleMove = (from: string, to: string, promotion?: string) => {
    if (colorToMove(g.game) !== playerColor || thinking) return false;
    const fenBefore = g.fen;
    const move = g.makeMove(from, to, promotion);
    if (!move) return false;
    coach.reset();
    if (coachEnabled) void coach.analyzeMove(g.moves.length, playerColor, fenBefore, move, g.fen);
    return true;
  };

  const resultInfo = useMemo(() => {
    if (flagFall) return { result: flagFall === "white" ? "0-1" : "1-0", reason: `${flagFall === "white" ? "White" : "Black"} ran out of time` };
    return g.result;
  }, [flagFall, g.result]);

  if (!started) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-[20px] font-medium text-ink dark:text-ink-dark">Play Computer</h1>

        <div className="mb-5">
          <div className="mb-2 text-[13px] font-medium text-ink dark:text-ink-dark">Difficulty</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={clsx(
                  "rounded border px-3 py-1.5 text-[13px]",
                  difficulty === d
                    ? "border-accent bg-accent/10 font-medium text-accent dark:border-accent-dark dark:text-accent-dark"
                    : "border-border text-ink dark:border-border-dark dark:text-ink-dark"
                )}
              >
                {DIFFICULTY_CONFIG[d].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="mb-2 text-[13px] font-medium text-ink dark:text-ink-dark">Color</div>
          <div className="flex gap-2">
            {(["white", "black", "random"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setColorChoice(c)}
                className={clsx(
                  "flex-1 rounded border px-3 py-1.5 text-[13px] capitalize",
                  colorChoice === c
                    ? "border-accent bg-accent/10 font-medium text-accent dark:border-accent-dark dark:text-accent-dark"
                    : "border-border text-ink dark:border-border-dark dark:text-ink-dark"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-2 text-[13px] font-medium text-ink dark:text-ink-dark">Time control</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TIME_CONTROLS) as TimeControlId[]).map((t) => (
              <button
                key={t}
                onClick={() => setTimeControl(t)}
                className={clsx(
                  "rounded border px-3 py-1.5 text-[13px]",
                  timeControl === t
                    ? "border-accent bg-accent/10 font-medium text-accent dark:border-accent-dark dark:text-accent-dark"
                    : "border-border text-ink dark:border-border-dark dark:text-ink-dark"
                )}
              >
                {TIME_CONTROLS[t].label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full rounded bg-accent px-4 py-2.5 text-[14px] font-medium text-white dark:bg-accent-dark"
        >
          Start Game
        </button>
      </div>
    );
  }

  const orientation = playerColor;
  const topColor = orientation === "white" ? "black" : "white";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col items-center gap-3">
        <div className="flex w-full max-w-[560px] items-center justify-between text-[13px]">
          <span className="text-ink dark:text-ink-dark">Stockfish ({DIFFICULTY_CONFIG[difficulty].label})</span>
          {seconds !== null && <span className="tabular-nums font-medium text-ink dark:text-ink-dark">{formatClock(clocks[topColor])}</span>}
        </div>

        <div className="w-full max-w-[560px]" style={{ aspectRatio: "1" }}>
          <ChessBoard
            fen={g.fen}
            onMove={handleMove}
            orientation={orientation}
            showLegalMoves={settings.showLegalMoves}
            showCoordinates={settings.showCoordinates}
            lastMove={lastMove ? { from: lastMove.uci.slice(0, 2), to: lastMove.uci.slice(2, 4) } : null}
            draggable={!gameOver && colorToMove(g.game) === playerColor && !thinking}
          />
        </div>

        <div className="flex w-full max-w-[560px] items-center justify-between text-[13px]">
          <span className="text-ink dark:text-ink-dark">You</span>
          {seconds !== null && <span className="tabular-nums font-medium text-ink dark:text-ink-dark">{formatClock(clocks[orientation])}</span>}
        </div>

        <div className="text-[13px] font-medium text-ink dark:text-ink-dark">
          {gameOver ? "Game over" : thinking ? "Stockfish is thinking…" : colorToMove(g.game) === playerColor ? "Your move" : "Waiting…"}
        </div>

        {gameOver && resultInfo && <GameResult result={resultInfo.result} reason={resultInfo.reason} playerColor={playerColor} />}

        <GameControls
          onResign={!gameOver ? (settings.confirmResignation ? () => confirm("Resign the game?") && g.resign() : g.resign) : undefined}
          onNewGame={() => setStarted(false)}
          gameOver={gameOver}
        />
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-72">
        <MoveHistory sanMoves={g.moves.map((m) => m.san)} />
        <MoveCoachPanel
          enabled={coachEnabled}
          onToggle={setCoachEnabled}
          analyzing={coach.analyzing}
          move={coach.lastCoached}
          detail={settings.coachDetail}
        />
      </div>
    </div>
  );
}
