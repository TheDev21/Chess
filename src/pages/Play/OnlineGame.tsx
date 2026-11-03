import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Chess } from "chess.js";
import { Copy } from "lucide-react";
import { ChessBoard } from "../../components/ChessBoard/ChessBoard";
import { MoveHistory } from "../../components/MoveHistory/MoveHistory";
import { GameResult } from "../../components/GameResult/GameResult";
import { supabase, HAS_BACKEND } from "../../services/multiplayer/supabaseClient";
import { joinRoom, makeOnlineMove, resignOnlineGame, offerOnlineDraw, getOrCreatePlayerId, type RoomState } from "../../services/multiplayer/api";
import type { PlayerColor } from "../../types/chess";

interface RoomRow {
  id: string;
  fen: string;
  move_history: { san: string; fen: string }[];
  white_player_id: string | null;
  black_player_id: string | null;
  draw_offered_by: "white" | "black" | "agreed" | null;
  resigned_by: "white" | "black" | null;
}

function toRoomState(row: RoomRow): RoomState {
  const chess = new Chess(row.fen);
  const over = chess.isGameOver() || row.resigned_by !== null || row.draw_offered_by === "agreed";
  let resultText: string | null = null;
  if (row.resigned_by) resultText = `${row.resigned_by === "white" ? "White" : "Black"} resigned`;
  else if (chess.isCheckmate()) resultText = "Checkmate";
  else if (chess.isStalemate()) resultText = "Stalemate";
  else if (chess.isDraw()) resultText = "Draw";

  return {
    roomId: row.id,
    fen: row.fen,
    turn: chess.turn(),
    moveHistory: row.move_history,
    isGameOver: over,
    resultText,
    drawOfferedBy: row.draw_offered_by,
    hasWhite: Boolean(row.white_player_id),
    hasBlack: Boolean(row.black_player_id),
  };
}

export function OnlineGame({ settings }: { settings: { showLegalMoves: boolean; showCoordinates: boolean } }) {
  const { roomId = "" } = useParams();
  const playerId = useRef(getOrCreatePlayerId());

  const [seat, setSeat] = useState<PlayerColor | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [presence, setPresence] = useState<{ white: boolean; black: boolean }>({ white: false, black: false });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const seatRef = useRef<PlayerColor | null>(null);
  seatRef.current = seat;

  useEffect(() => {
    if (!HAS_BACKEND || !supabase) {
      setError("Play Online is not configured on this build.");
      return;
    }
    const client = supabase;

    let cancelled = false;

    const channel = client
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => setState(toRoomState(payload.new as RoomRow))
      )
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState<{ color: PlayerColor }>();
        const online = { white: false, black: false };
        for (const key in presenceState) {
          for (const p of presenceState[key]) online[p.color] = true;
        }
        setPresence(online);
      });
    channelRef.current = channel;

    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      // Tracking happens here (once the channel is actually joined), and again
      // if the seat only becomes known slightly after this fires.
      if (seatRef.current) void channel.track({ color: seatRef.current });
    });

    joinRoom(roomId, playerId.current)
      .then(({ color, ...roomState }) => {
        if (cancelled) return;
        setSeat(color);
        setState(roomState);
        if (color && channelRef.current) void channelRef.current.track({ color });
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to join room."));

    return () => {
      cancelled = true;
      channelRef.current = null;
      client.removeChannel(channel);
    };
  }, [roomId]);

  const applyRoomState = useCallback((s: RoomState) => setState(s), []);

  const handleMove = (from: string, to: string, promotion?: string) => {
    if (!seat || !state) return false;
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

    void makeOnlineMove(roomId, playerId.current, from, to, promotion)
      .then(({ move: _move, ...roomState }) => applyRoomState(roomState))
      .catch((err) => setError(err instanceof Error ? err.message : "Move failed."));
    return true;
  };

  const shareUrl = `${window.location.origin}${window.location.pathname}#/play/online/${roomId}`;
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const resign = () =>
    void resignOnlineGame(roomId, playerId.current).then(applyRoomState).catch((err) => setError(err instanceof Error ? err.message : "Failed to resign."));
  const offerDraw = () =>
    void offerOnlineDraw(roomId, playerId.current).then(applyRoomState).catch((err) => setError(err instanceof Error ? err.message : "Failed to offer draw."));

  if (!HAS_BACKEND) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-3 text-[26px] font-semibold tracking-tight text-ink dark:text-ink-dark">Play Online</h1>
        <p className="text-[14px] leading-relaxed text-muted dark:text-muted-dark">
          Play Online is not configured on this build (missing Supabase project settings).
        </p>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-3 text-[26px] font-semibold tracking-tight text-ink dark:text-ink-dark">Play Online</h1>
        <p className="text-[14px] text-blunder">{error}</p>
      </div>
    );
  }

  if (!state) {
    return <p className="text-[13px] text-muted dark:text-muted-dark">Connecting…</p>;
  }

  const history = state.moveHistory;
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

  const waiting = !state.hasWhite || !state.hasBlack;
  const drawOfferedByOpponent = state.drawOfferedBy && state.drawOfferedBy !== "agreed" && state.drawOfferedBy !== seat;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-muted dark:text-muted-dark">
            Code: <span className="font-medium text-ink dark:text-ink-dark">{roomId}</span>
          </span>
          <button onClick={copyLink} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/20 dark:border-border-dark dark:text-ink-dark">
            <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy link"}
          </button>
        </div>

        {waiting && (
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-center text-[13px] text-muted dark:border-border-dark dark:bg-surface-dark dark:text-muted-dark">
            Waiting for the second player to join…
          </div>
        )}

        <div className="w-full max-w-[560px]" style={{ aspectRatio: "1" }}>
          <ChessBoard
            fen={state.fen}
            onMove={handleMove}
            orientation={seat === "black" ? "black" : "white"}
            showLegalMoves={settings.showLegalMoves}
            showCoordinates={settings.showCoordinates}
            lastMove={lastMove}
            draggable={Boolean(seat) && !state.isGameOver}
          />
        </div>

        <div className="text-[13px] text-ink dark:text-ink-dark">
          {seat ? `You are playing ${seat}.` : "Spectating."} White {presence.white ? "connected" : "disconnected"} · Black{" "}
          {presence.black ? "connected" : "disconnected"}
        </div>

        {state.isGameOver && <GameResult result="1/2-1/2" reason={state.resultText ?? "Game over"} playerColor={seat ?? undefined} />}

        {drawOfferedByOpponent && (
          <div className="text-[12px] text-mistake">Your opponent offered a draw. Offer one back to accept.</div>
        )}

        {seat && !state.isGameOver && (
          <div className="flex gap-2">
            <button onClick={offerDraw} className="rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5 dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark dark:hover:border-accent-dark">
              Offer Draw
            </button>
            <button onClick={resign} className="rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5 dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark dark:hover:border-accent-dark">
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
