import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "../../components/ChessBoard/ChessBoard";
import { GameControls } from "../../components/GameControls/GameControls";
import { MoveHistory } from "../../components/MoveHistory/MoveHistory";
import { MoveCoachPanel } from "../../components/MoveCoach/MoveCoachPanel";
import { GameResult } from "../../components/GameResult/GameResult";
import { useChessGame } from "../../hooks/useChessGame";
import { useMoveCoach } from "../../hooks/useMoveCoach";
import { useMoveViewer } from "../../hooks/useMoveViewer";
import { getCapturedPieces, colorToMove } from "../../services/chess/gameEngine";
import { saveGame } from "../../services/storage/gameHistory";
import type { AppSettings } from "../../services/storage/settings";

const PIECE_GLYPH: Record<string, string> = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛" };
const START_FEN = new Chess().fen();

export function PassAndPlay({ settings }: { settings: AppSettings }) {
  const g = useChessGame();
  const coach = useMoveCoach();
  const viewer = useMoveViewer(g.moves.length);
  const [coachEnabled, setCoachEnabled] = useState(settings.moveCoachEnabled);
  const [savedThisGame, setSavedThisGame] = useState(false);
  const [flipBoard, setFlipBoard] = useState(true);

  const captured = useMemo(() => getCapturedPieces(g.game), [g.fen]);
  const orientation = flipBoard ? colorToMove(g.game) : "white";
  const viewedMove = viewer.isLive ? g.moves[g.moves.length - 1] : viewer.displayIndex >= 0 ? g.moves[viewer.displayIndex] : undefined;
  const displayFen = viewer.isLive ? g.fen : viewer.displayIndex >= 0 ? g.moves[viewer.displayIndex].fenAfter : START_FEN;

  useEffect(() => {
    if (g.isOver && g.result && !savedThisGame) {
      saveGame({
        id: crypto.randomUUID(),
        playedAt: new Date().toISOString(),
        mode: "friend",
        opponent: "Friend",
        playerColor: "white",
        result: g.result.result,
        moveCount: g.moves.length,
        pgn: g.pgn(),
      });
      setSavedThisGame(true);
    }
  }, [g.isOver, g.result, savedThisGame, g]);

  const handleMove = (from: string, to: string, promotion?: string) => {
    const fenBefore = g.fen;
    const color = colorToMove(g.game);
    const move = g.makeMove(from, to, promotion);
    if (!move) return false;
    viewer.goLive();
    coach.reset();
    if (coachEnabled) {
      void coach.analyzeMove(g.moves.length, color, fenBefore, move, g.fen);
    }
    return true;
  };

  const handleNewGame = () => {
    g.reset();
    viewer.goLive();
    coach.reset();
    setSavedThisGame(false);
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col items-center gap-3">
        <div className="flex w-full max-w-[560px] items-center justify-between text-[13px]">
          <span className="text-muted dark:text-muted-dark">
            {captured.white.map((p, i) => <span key={i}>{PIECE_GLYPH[p]}</span>)}
            {captured.materialDiff > 0 && <span className="ml-1">+{captured.materialDiff}</span>}
          </span>
          <button onClick={() => setFlipBoard((v) => !v)} className="text-muted underline-offset-2 hover:underline dark:text-muted-dark">
            Auto-flip: {flipBoard ? "On" : "Off"}
          </button>
        </div>

        <div className="w-full max-w-[560px]" style={{ aspectRatio: "1" }}>
          <ChessBoard
            fen={displayFen}
            onMove={handleMove}
            orientation={orientation}
            showLegalMoves={settings.showLegalMoves}
            showCoordinates={settings.showCoordinates}
            lastMove={viewedMove ? { from: viewedMove.uci.slice(0, 2), to: viewedMove.uci.slice(2, 4) } : null}
            draggable={!g.isOver && viewer.isLive}
          />
        </div>

        {!viewer.isLive && (
          <button
            onClick={viewer.goLive}
            className="rounded-full border border-accent/40 bg-accent/5 px-3.5 py-1.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent/10 dark:border-accent-dark/40 dark:bg-accent-dark/10 dark:text-accent-dark"
          >
            Viewing move {viewer.displayIndex + 1} of {g.moves.length} · back to current position
          </button>
        )}

        <div className="flex w-full max-w-[560px] items-center justify-between text-[13px]">
          <span className="text-muted dark:text-muted-dark">
            {captured.black.map((p, i) => <span key={i}>{PIECE_GLYPH[p]}</span>)}
            {captured.materialDiff < 0 && <span className="ml-1">+{-captured.materialDiff}</span>}
          </span>
          <span className="font-medium text-ink dark:text-ink-dark">
            {g.isOver ? "Game over" : `${colorToMove(g.game) === "white" ? "White" : "Black"} to move`}
          </span>
        </div>

        {g.isOver && g.result && <GameResult result={g.result.result} reason={g.result.reason} />}

        <GameControls
          onResign={settings.confirmResignation ? () => confirm("Resign the game?") && g.resign() : g.resign}
          onOfferDraw={settings.confirmDrawOffer ? () => confirm("Offer a draw?") && g.offerDraw() : g.offerDraw}
          onUndo={g.undo}
          canUndo={g.moves.length > 0 && !g.isOver}
          onNewGame={handleNewGame}
          gameOver={g.isOver}
        />
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-72">
        <MoveHistory sanMoves={g.moves.map((m) => m.san)} activeIndex={viewer.displayIndex} onSelectMove={viewer.selectIndex} />
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
