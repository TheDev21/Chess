import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Chess } from "chess.js";
import { Copy } from "lucide-react";
import { ChessBoard } from "../../components/ChessBoard/ChessBoard";
import { MoveHistory } from "../../components/MoveHistory/MoveHistory";
import { GameResult } from "../../components/GameResult/GameResult";
import { useSocket } from "../../hooks/useSocket";
import { HAS_BACKEND, getOrCreatePlayerId } from "../../services/multiplayer/api";
import type { PlayerColor } from "../../types/chess";

interface RoomState {
  roomId: string;
  fen: string;
  turn: "w" | "b";
  moveHistory: { san: string; fen: string }[];
  isGameOver: boolean;
  resultText: string | null;
  drawOfferedBy: "white" | "black" | "agreed" | null;
  whiteConnected: boolean;
  blackConnected: boolean;
  hasWhite: boolean;
  hasBlack: boolean;
}

export function OnlineGame({ settings }: { settings: { showLegalMoves: boolean; showCoordinates: boolean } }) {
  const { roomId = "" } = useParams();
  const socketRef = useSocket();
  const gameRef = useRef(new Chess());
  const playerId = useRef(getOrCreatePlayerId());

  const [fen, setFen] = useState(gameRef.current.fen());
  const [history, setHistory] = useState<{ san: string; fen: string }[]>([]);
  const [seat, setSeat] = useState<PlayerColor | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const applyState = useCallback((s: RoomState) => {
    gameRef.current.load(s.fen);
    setFen(s.fen);
    setHistory(s.moveHistory);
    setState(s);
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onConnect = () => socket.emit("room:join", { roomId, playerId: playerId.current });
    const onJoined = (s: RoomState & { color: PlayerColor | null }) => {
      setSeat(s.color);
      applyState(s);
    };
    const onState = (s: RoomState) => applyState(s);
    const onMoveMade = (s: RoomState) => applyState(s);
    const onError = (e: { error: string }) => setError(e.error);

    socket.on("connect", onConnect);
    socket.on("room:joined", onJoined);
    socket.on("room:state", onState);
    socket.on("move:made", onMoveMade);
    socket.on("room:error", onError);
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("room:joined", onJoined);
      socket.off("room:state", onState);
      socket.off("move:made", onMoveMade);
      socket.off("room:error", onError);
    };
  }, [roomId, socketRef, applyState]);

  const handleMove = (from: string, to: string, promotion?: string) => {
    const socket = socketRef.current;
    if (!socket || !seat || !state) return false;
    const turnColor = state.turn === "w" ? "white" : "black";
    if (seat !== turnColor) return false;

    const preview = new Chess(state.fen);
    let move;
    try {
      move = preview.move({ from, to, promotion: (promotion as "q" | "r" | "b" | "n" | undefined) || "q" });
    } catch {
      move = null;
    }
    if (!move) return false;

    socket.emit("move:make", { roomId, playerId: playerId.current, from, to, promotion: promotion || "q" });
    return true;
  };

  const lastMove = (() => {
    if (history.length === 0) return null;
    const last = history[history.length - 1];
    const fenBefore = history.length > 1 ? history[history.length - 2].fen : new Chess().fen();
    try {
      const replay = new Chess(fenBefore);
      const move = replay.move(last.san);
      return move ? { from: move.from, to: move.to } : null;
    } catch {
      return null;
    }
  })();

  const shareUrl = `${window.location.origin}${window.location.pathname}#/play/online/${roomId}`;
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const resign = () => socketRef.current?.emit("game:resign", { roomId, playerId: playerId.current });
  const offerDraw = () => socketRef.current?.emit("game:offerDraw", { roomId, playerId: playerId.current });

  if (!HAS_BACKEND) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-3 text-[20px] font-medium text-ink dark:text-ink-dark">Play Online</h1>
        <p className="text-[13px] leading-relaxed text-muted dark:text-muted-dark">
          This mode needs a running multiplayer server. Run it locally (see the README) to play online.
        </p>
      </div>
    );
  }

  const waiting = state && (!state.hasWhite || !state.hasBlack);
  const drawOfferedByOpponent = state?.drawOfferedBy && state.drawOfferedBy !== "agreed" && state.drawOfferedBy !== seat;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-muted dark:text-muted-dark">
            Code: <span className="font-medium text-ink dark:text-ink-dark">{roomId}</span>
          </span>
          <button onClick={copyLink} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[12px] text-ink dark:border-border-dark dark:text-ink-dark">
            <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy link"}
          </button>
        </div>

        {waiting && (
          <div className="rounded border border-border bg-surface px-4 py-3 text-center text-[13px] text-muted dark:border-border-dark dark:bg-surface-dark dark:text-muted-dark">
            Waiting for the second player to join…
          </div>
        )}

        <div className="w-full max-w-[560px]" style={{ aspectRatio: "1" }}>
          <ChessBoard
            fen={fen}
            onMove={handleMove}
            orientation={seat === "black" ? "black" : "white"}
            showLegalMoves={settings.showLegalMoves}
            showCoordinates={settings.showCoordinates}
            lastMove={lastMove}
            draggable={Boolean(seat) && !state?.isGameOver}
          />
        </div>

        <div className="text-[13px] text-ink dark:text-ink-dark">
          {seat ? `You are playing ${seat}.` : "Spectating."} White {state?.whiteConnected ? "connected" : "disconnected"} · Black{" "}
          {state?.blackConnected ? "connected" : "disconnected"}
        </div>

        {state?.isGameOver && <GameResult result="1/2-1/2" reason={state.resultText ?? "Game over"} playerColor={seat ?? undefined} />}

        {drawOfferedByOpponent && (
          <div className="text-[12px] text-mistake">Your opponent offered a draw. Offer one back to accept.</div>
        )}

        {seat && !state?.isGameOver && (
          <div className="flex gap-2">
            <button onClick={offerDraw} className="rounded border border-border px-3 py-1.5 text-[13px] text-ink dark:border-border-dark dark:text-ink-dark">
              Offer Draw
            </button>
            <button onClick={resign} className="rounded border border-border px-3 py-1.5 text-[13px] text-ink dark:border-border-dark dark:text-ink-dark">
              Resign
            </button>
          </div>
        )}

        {error && <p className="text-[12px] text-blunder">{error}</p>}
      </div>

      <div className="w-full lg:w-72">
        <MoveHistory sanMoves={history.map((h) => h.san)} />
      </div>
    </div>
  );
}
