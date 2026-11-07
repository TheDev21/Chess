import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Chess } from "chess.js";
import { Copy } from "lucide-react";
import { ChessBoard } from "../../components/ChessBoard/ChessBoard";
import { MoveHistory } from "../../components/MoveHistory/MoveHistory";
import { GameResult } from "../../components/GameResult/GameResult";
import { HAS_BACKEND } from "../../services/multiplayer/supabaseClient";
import {
  makeOnlineMove,
  resignOnlineGame,
  offerOnlineDraw,
  sendHeartbeat,
  abandonOnlineGame,
  getOrCreatePlayerId,
  type RoomState,
} from "../../services/multiplayer/api";
import { replayGame } from "../../services/multiplayer/replayGame";
import { useRealtimeRoom } from "../../services/multiplayer/useRealtimeRoom";
import type { PlayerColor } from "../../types/chess";

const HEARTBEAT_INTERVAL_MS = 20_000;
const ABANDON_TIMEOUT_MS = 2 * 60 * 1000;

interface RoomRow {
  id: string;
  fen: string;
  move_history: { san: string; fen: string }[];
  white_player_id: string | null;
  black_player_id: string | null;
  draw_offered_by: "white" | "black" | "agreed" | null;
  resigned_by: "white" | "black" | null;
  white_last_seen: string | null;
  black_last_seen: string | null;
  abandoned_by: "white" | "black" | null;
  abandoned_at: string | null;
}

// Mirrors supabase/functions/_shared/state.ts's publicState() - see that
// file for why this replays the full move history (needed for correct
// threefold-repetition detection) rather than loading a single FEN, and
// for why the server-side and client-side copies of replayGame() are two
// separate, equivalent implementations rather than one shared module.
function toRoomState(row: RoomRow): RoomState {
  const replay = replayGame(row.move_history);
  const fallback = new Chess(row.fen);
  const turn = replay ? replay.turn : fallback.turn();
  const isCheckmate = replay ? replay.isCheckmate : fallback.isCheckmate();
  const isStalemate = replay ? replay.isStalemate : fallback.isStalemate();
  const isDraw = replay ? replay.isDraw : fallback.isDraw();
  const isGameOverByRules = replay ? replay.isGameOver : fallback.isGameOver();
  const isAbandoned = row.abandoned_at !== null;

  const over = isAbandoned || isGameOverByRules || row.resigned_by !== null || row.draw_offered_by === "agreed";

  let resultText: string | null = null;
  let result: RoomState["result"] = null;

  if (isAbandoned) {
    const who = row.abandoned_by === "white" ? "White" : row.abandoned_by === "black" ? "Black" : "A player";
    resultText = `${who} didn't reconnect in time - the game was abandoned`;
  } else if (row.resigned_by) {
    resultText = `${row.resigned_by === "white" ? "White" : "Black"} resigned`;
    result = row.resigned_by === "white" ? "0-1" : "1-0";
  } else if (isCheckmate) {
    resultText = "Checkmate";
    result = turn === "w" ? "0-1" : "1-0";
  } else if (isStalemate) {
    resultText = "Stalemate";
    result = "1/2-1/2";
  } else if (row.draw_offered_by === "agreed") {
    resultText = "Draw agreed";
    result = "1/2-1/2";
  } else if (isDraw) {
    resultText = "Draw";
    result = "1/2-1/2";
  }

  return {
    roomId: row.id,
    fen: row.fen,
    turn,
    moveHistory: row.move_history,
    isGameOver: over,
    resultText,
    result,
    isAbandoned,
    abandonedBy: row.abandoned_by,
    drawOfferedBy: row.draw_offered_by,
    hasWhite: Boolean(row.white_player_id),
    hasBlack: Boolean(row.black_player_id),
    whiteLastSeen: row.white_last_seen,
    blackLastSeen: row.black_last_seen,
  };
}

export function OnlineGame({ settings }: { settings: { showLegalMoves: boolean; showCoordinates: boolean } }) {
  const { roomId = "" } = useParams();
  const playerId = useRef(getOrCreatePlayerId());

  const { seat, state, presence, error: connectError, connectionStatus, applyRoomState: applyRealtimeState } = useRealtimeRoom<RoomRow>(
    roomId,
    playerId.current,
    toRoomState,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Which opponent-last-seen value the player has already dismissed with
  // "Keep Waiting" - the banner re-appears on its own once a fresh
  // heartbeat changes that value and then goes stale again.
  const [dismissedForLastSeen, setDismissedForLastSeen] = useState<string | null>(null);

  const gameOverRef = useRef(false);
  gameOverRef.current = Boolean(state?.isGameOver);

  // A plain UI clock, re-evaluated every couple seconds, purely to decide
  // when to *show* the disconnect banner. It never calls anything by
  // itself - the actual 2-minute decision is re-verified against the
  // server's own clock (whiteLastSeen/blackLastSeen, both sourced from the
  // database, not estimated) the moment "Leave" is clicked. A slightly
  // early/late banner here is cosmetic only.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  // Heartbeat: tells the server "this seat is still here" roughly every
  // 20s while seated and the game isn't over. This - not Realtime Presence,
  // which only drives the immediate connected/disconnected text below - is
  // what rooms-abandon and the scheduled cleanup sweep actually trust.
  useEffect(() => {
    if (!seat || !HAS_BACKEND) return;
    const tick = () => {
      if (gameOverRef.current) return;
      void sendHeartbeat(roomId, playerId.current).catch(() => {
        /* a missed heartbeat just means the next tick tries again */
      });
    };
    tick();
    const id = setInterval(tick, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [seat, roomId]);

  const applyRoomState = useCallback((s: RoomState) => applyRealtimeState(s), [applyRealtimeState]);

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
      .catch((err) => {
        console.error("Online move failed:", err);
        setActionError("That move didn't go through. Check your connection and try again.");
      });
    return true;
  };

  const shareUrl = `${window.location.origin}${window.location.pathname}#/play/online/${roomId}`;
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const resign = () =>
    void resignOnlineGame(roomId, playerId.current)
      .then(applyRoomState)
      .catch((err) => {
        console.error("Failed to resign online game:", err);
        setActionError("Couldn't send your resignation. Check your connection and try again.");
      });
  const offerDraw = () =>
    void offerOnlineDraw(roomId, playerId.current)
      .then(applyRoomState)
      .catch((err) => {
        console.error("Failed to offer online draw:", err);
        setActionError("Couldn't send your draw offer. Check your connection and try again.");
      });

  const opponentColor: PlayerColor | null = seat === "white" ? "black" : seat === "black" ? "white" : null;
  const opponentLastSeen = opponentColor === "white" ? (state?.whiteLastSeen ?? null) : opponentColor === "black" ? (state?.blackLastSeen ?? null) : null;
  const opponentStaleMs = opponentLastSeen ? now - new Date(opponentLastSeen).getTime() : null;
  const showDisconnectBanner =
    Boolean(seat) &&
    !state?.isGameOver &&
    opponentStaleMs !== null &&
    opponentStaleMs >= ABANDON_TIMEOUT_MS &&
    dismissedForLastSeen !== opponentLastSeen;

  const keepWaiting = () => setDismissedForLastSeen(opponentLastSeen);
  const handleLeave = () =>
    void abandonOnlineGame(roomId, playerId.current)
      .then(applyRoomState)
      .catch((err) => {
        // Most likely means the opponent reconnected in the gap - not a
        // real error from the player's point of view. Realtime will bring
        // the current state in shortly; just stop showing the banner for
        // this round.
        console.error("Couldn't mark the game abandoned:", err);
        setDismissedForLastSeen(opponentLastSeen);
      });

  if (!HAS_BACKEND) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-3 text-[26px] font-semibold tracking-tight text-ink">Play Online</h1>
        <p className="text-[14px] leading-relaxed text-muted">Play Online is not configured on this build (missing Supabase project settings).</p>
      </div>
    );
  }

  if (connectError && !state) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-3 text-[26px] font-semibold tracking-tight text-ink">Play Online</h1>
        <p className="text-[14px] text-blunder">{connectError}</p>
      </div>
    );
  }

  if (!state) {
    return <p className="text-[13px] text-muted">Connecting…</p>;
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
    <div className="flex h-full flex-col gap-4 short:min-h-0 short:flex-row lg:min-h-0 lg:flex-row">
      <div className="flex flex-1 flex-col items-center gap-2 short:min-h-0 short:gap-0 lg:min-h-0">
        <div className="flex shrink-0 items-center gap-2 text-[13px] short:text-[12px]">
          <span className="text-muted">
            Code: <span className="font-medium text-ink">{roomId}</span>
          </span>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/20 short:py-0.5"
          >
            <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy link"}
          </button>
        </div>

        {waiting && (
          <div className="shrink-0 rounded-xl border border-border bg-surface px-4 py-3 text-center text-[13px] text-muted">
            Waiting for the second player to join…
          </div>
        )}

        {showDisconnectBanner && (
          <div className="shrink-0 rounded-xl border border-border bg-surface px-4 py-3 text-center text-[13px] text-ink">
            <p>Your opponent appears to have disconnected.</p>
            <div className="mt-2 flex justify-center gap-2">
              <button
                onClick={keepWaiting}
                className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5"
              >
                Keep Waiting
              </button>
              <button
                onClick={handleLeave}
                className="rounded-full bg-accent px-3 py-1.5 text-[12px] font-medium text-bg transition-all duration-200 hover:brightness-110"
              >
                Leave
              </button>
            </div>
          </div>
        )}

        <div className="max-h-full w-full min-h-[240px] max-w-[560px] flex-1 short:min-h-[220px] short:max-h-[220px]">
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

        <div className="shrink-0 text-[13px] text-ink short:hidden">
          {seat ? `You are playing ${seat}.` : "Spectating."} White {presence.white ? "connected" : "disconnected"} · Black{" "}
          {presence.black ? "connected" : "disconnected"}
          {connectionStatus !== "connected" && <span className="text-muted"> · Reconnecting…</span>}
        </div>

        {state.isGameOver && !state.isAbandoned && (
          <div className="short:hidden">
            <GameResult result={state.result ?? "1/2-1/2"} reason={state.resultText ?? "Game over"} playerColor={seat ?? undefined} />
          </div>
        )}

        {state.isAbandoned && (
          <div className="shrink-0 rounded-xl border border-border bg-surface px-5 py-4 text-center short:hidden">
            <div className="text-[16px] font-semibold text-ink">Game abandoned</div>
            <div className="mt-0.5 text-[13px] text-muted">{state.resultText ?? "Your opponent didn't reconnect in time."}</div>
          </div>
        )}

        {drawOfferedByOpponent && (
          <div className="shrink-0 text-[12px] text-mistake short:hidden">Your opponent offered a draw. Offer one back to accept.</div>
        )}

        {seat && !state.isGameOver && (
          <div className="flex shrink-0 gap-2 short:hidden">
            <button
              onClick={offerDraw}
              className="rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5"
            >
              Offer Draw
            </button>
            <button
              onClick={resign}
              className="rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5"
            >
              Resign
            </button>
          </div>
        )}

        {actionError && <p className="shrink-0 text-[12px] text-blunder short:hidden">{actionError}</p>}
      </div>

      <div className="max-h-[42dvh] min-h-0 w-full overflow-y-auto short:max-h-none short:w-72 lg:max-h-none lg:w-72">
        <div className="hidden shrink-0 flex-col gap-2 short:sticky short:top-0 short:z-10 short:flex short:bg-bg short:pb-2">
          <div className="shrink-0 text-[13px] text-ink">
            {seat ? `You are playing ${seat}.` : "Spectating."} White {presence.white ? "connected" : "disconnected"} · Black{" "}
            {presence.black ? "connected" : "disconnected"}
            {connectionStatus !== "connected" && <span className="text-muted"> · Reconnecting…</span>}
          </div>
          {state.isGameOver && !state.isAbandoned && (
            <GameResult result={state.result ?? "1/2-1/2"} reason={state.resultText ?? "Game over"} playerColor={seat ?? undefined} />
          )}
          {state.isAbandoned && (
            <div className="shrink-0 rounded-xl border border-border bg-surface px-5 py-4 text-center">
              <div className="text-[16px] font-semibold text-ink">Game abandoned</div>
              <div className="mt-0.5 text-[13px] text-muted">{state.resultText ?? "Your opponent didn't reconnect in time."}</div>
            </div>
          )}
          {drawOfferedByOpponent && (
            <div className="shrink-0 text-[12px] text-mistake">Your opponent offered a draw. Offer one back to accept.</div>
          )}
          {seat && !state.isGameOver && (
            <div className="flex shrink-0 gap-2">
              <button
                onClick={offerDraw}
                className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5"
              >
                Offer Draw
              </button>
              <button
                onClick={resign}
                className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5"
              >
                Resign
              </button>
            </div>
          )}
          {actionError && <p className="shrink-0 text-[12px] text-blunder">{actionError}</p>}
        </div>
        <MoveHistory sanMoves={history.map((h) => h.san)} />
      </div>
    </div>
  );
}
