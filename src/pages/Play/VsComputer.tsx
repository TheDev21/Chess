import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "../../components/ChessBoard/ChessBoard";
import { GameControls } from "../../components/GameControls/GameControls";
import { MoveHistory } from "../../components/MoveHistory/MoveHistory";
import { MoveCoachPanel } from "../../components/MoveCoach/MoveCoachPanel";
import { GameResult } from "../../components/GameResult/GameResult";
import { CapturedPiecesPanel } from "../../components/CapturedPieces/CapturedPiecesPanel";
import { Spotlight, type SpotlightStep } from "../../components/Tutorial/Spotlight";
import { useChessGame } from "../../hooks/useChessGame";
import { useMoveCoach } from "../../hooks/useMoveCoach";
import { useMoveViewer } from "../../hooks/useMoveViewer";
import { useStockfish } from "../../hooks/useStockfish";
import { colorToMove } from "../../services/chess/gameEngine";
import { capturedPieces } from "../../services/chess/capturedPieces";
import { saveGame } from "../../services/storage/gameHistory";
import { isTutorialSeen } from "../../services/storage/tutorialProgress";
import { DIFFICULTY_CONFIG, TIME_CONTROLS, type Difficulty, type PlayerColor, type TimeControlId } from "../../types/chess";
import type { AppSettings } from "../../services/storage/settings";
import clsx from "clsx";

export const CHESSBOARD_TUTORIAL_ID = "chessboard-basics";
const CHESSBOARD_TUTORIAL_STEPS: SpotlightStep[] = [
  { targetId: "board", title: "Your chessboard", body: "This is where every chess game happens. It contains 64 squares." },
  { targetId: "board", title: "Select a piece", body: "Select any piece to see where it can move." },
  { targetId: "board", title: "Legal moves", body: "Small dots show the squares your selected piece can legally move to." },
  { targetId: "coach", title: "Your Move Coach", body: "Your coach can explain your moves and help you understand the game." },
];

const START_FEN = new Chess().fen();

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
  const viewer = useMoveViewer(g.moves.length);
  const opponent = useStockfish();
  const [coachEnabled, setCoachEnabled] = useState(settings.moveCoachEnabled);
  const [thinking, setThinking] = useState(false);
  const [flagFall, setFlagFall] = useState<PlayerColor | null>(null);
  const savedRef = useRef(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const seconds = TIME_CONTROLS[timeControl].seconds;
  const [clocks, setClocks] = useState({ white: seconds ?? 0, black: seconds ?? 0 });

  const gameOver = g.isOver || flagFall !== null;
  const viewedMove = viewer.isLive ? g.moves[g.moves.length - 1] : viewer.displayIndex >= 0 ? g.moves[viewer.displayIndex] : undefined;
  const displayFen = viewer.isLive ? g.fen : viewer.displayIndex >= 0 ? g.moves[viewer.displayIndex].fenAfter : START_FEN;

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
    viewer.goLive();
    setStarted(true);
    if (!isTutorialSeen(CHESSBOARD_TUTORIAL_ID)) setShowTutorial(true);
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
      const result = flagFall ? (flagFall === "white" ? "0-1" : "1-0") : (g.result?.result ?? "*");
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
    viewer.goLive();
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
      <div className="mx-auto max-w-md pb-24">
        <h1 className="mb-8 text-[26px] font-semibold tracking-tight text-ink">Play Computer</h1>

        <div className="mb-6">
          <div className="mb-2.5 text-[13px] font-medium text-muted">Difficulty</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={clsx(
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  difficulty === d ? "border-accent bg-accent text-bg shadow-card" : "border-border text-ink hover:border-ink/20",
                )}
              >
                {DIFFICULTY_CONFIG[d].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-2.5 text-[13px] font-medium text-muted">Color</div>
          <div className="flex gap-2">
            {(["white", "black", "random"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setColorChoice(c)}
                className={clsx(
                  "flex-1 rounded-full border px-3.5 py-1.5 text-[13px] font-medium capitalize transition-colors",
                  colorChoice === c ? "border-accent bg-accent text-bg shadow-card" : "border-border text-ink hover:border-ink/20",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-2.5 text-[13px] font-medium text-muted">Time control</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TIME_CONTROLS) as TimeControlId[]).map((t) => (
              <button
                key={t}
                onClick={() => setTimeControl(t)}
                className={clsx(
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  timeControl === t ? "border-accent bg-accent text-bg shadow-card" : "border-border text-ink hover:border-ink/20",
                )}
              >
                {TIME_CONTROLS[t].label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full rounded-full bg-accent px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent/90"
        >
          Start Game
        </button>
      </div>
    );
  }

  const orientation = playerColor;
  const topColor = orientation === "white" ? "black" : "white";
  const captured = capturedPieces(g.fen);

  return (
    <div className="flex h-full flex-col gap-4 short:min-h-0 short:flex-row lg:min-h-0 lg:flex-row">
      <h1 className="sr-only">Playing vs. Stockfish ({DIFFICULTY_CONFIG[difficulty].label})</h1>
      <div className="flex w-full shrink-0 flex-row gap-3 short:w-48 short:flex-col lg:w-48 lg:flex-col">
        <CapturedPiecesPanel
          label={topColor === "white" ? "White" : "Black"}
          pieces={topColor === "white" ? captured.capturedByBlack : captured.capturedByWhite}
          materialEdge={topColor === "white" ? Math.max(0, -captured.materialDiff) : Math.max(0, captured.materialDiff)}
        />
        <CapturedPiecesPanel
          label={orientation === "white" ? "White (you)" : "Black (you)"}
          pieces={orientation === "white" ? captured.capturedByWhite : captured.capturedByBlack}
          materialEdge={orientation === "white" ? Math.max(0, captured.materialDiff) : Math.max(0, -captured.materialDiff)}
        />
      </div>

      <div className="flex flex-1 flex-col items-center gap-2 short:min-h-0 lg:min-h-0">
        <div className="flex w-full max-w-[560px] shrink-0 items-center justify-between text-[13px]">
          <span className="text-ink">Stockfish ({DIFFICULTY_CONFIG[difficulty].label})</span>
          {seconds !== null && <span className="tabular-nums font-medium text-ink">{formatClock(clocks[topColor])}</span>}
        </div>

        <div className="max-h-full w-full min-h-[240px] max-w-[560px] flex-1 short:min-h-0">
          <ChessBoard
            fen={displayFen}
            onMove={handleMove}
            orientation={orientation}
            showLegalMoves={settings.showLegalMoves}
            showCoordinates={settings.showCoordinates}
            lastMove={viewedMove ? { from: viewedMove.uci.slice(0, 2), to: viewedMove.uci.slice(2, 4) } : null}
            draggable={!gameOver && colorToMove(g.game) === playerColor && !thinking && viewer.isLive}
          />
        </div>

        {!viewer.isLive && (
          <button
            onClick={viewer.goLive}
            className="shrink-0 rounded-full border border-accent/40 bg-accent/5 px-3.5 py-1.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent/10"
          >
            Viewing move {viewer.displayIndex + 1} of {g.moves.length} · back to current position
          </button>
        )}

        <div className="flex w-full max-w-[560px] shrink-0 items-center justify-between text-[13px]">
          <span className="text-ink">You</span>
          {seconds !== null && <span className="tabular-nums font-medium text-ink">{formatClock(clocks[orientation])}</span>}
        </div>

        <div className="shrink-0 text-[13px] font-medium text-ink">
          {gameOver ? "Game over" : thinking ? "Stockfish is thinking…" : colorToMove(g.game) === playerColor ? "Your move" : "Waiting…"}
        </div>

        {gameOver && resultInfo && <GameResult result={resultInfo.result} reason={resultInfo.reason} playerColor={playerColor} />}

        <div className="shrink-0">
          <GameControls
            onResign={!gameOver ? (settings.confirmResignation ? () => confirm("Resign the game?") && g.resign() : g.resign) : undefined}
            onNewGame={() => setStarted(false)}
            gameOver={gameOver}
          />
        </div>
      </div>

      <div className="flex max-h-[42dvh] min-h-0 w-full flex-col gap-3 overflow-y-auto short:max-h-none short:w-72 lg:max-h-none lg:w-72">
        <MoveHistory sanMoves={g.moves.map((m) => m.san)} activeIndex={viewer.displayIndex} onSelectMove={viewer.selectIndex} />
        <div data-tutorial="coach">
          <MoveCoachPanel
            enabled={coachEnabled}
            onToggle={setCoachEnabled}
            analyzing={coach.analyzing}
            move={coach.lastCoached}
            detail={settings.coachDetail}
          />
        </div>
      </div>

      {showTutorial && <Spotlight tutorialId={CHESSBOARD_TUTORIAL_ID} steps={CHESSBOARD_TUTORIAL_STEPS} onDone={() => setShowTutorial(false)} />}
    </div>
  );
}
