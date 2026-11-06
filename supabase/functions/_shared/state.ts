import { Chess } from "npm:chess.js@1.0.0-beta.8";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { replayGame } from "./replayGame.ts";

export interface Room {
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

const ABANDON_TIMEOUT_MS = 2 * 60 * 1000;

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export function seatFor(room: Room, playerId: string): "white" | "black" | null {
  if (room.white_player_id === playerId) return "white";
  if (room.black_player_id === playerId) return "black";
  return null;
}

/**
 * Mirrors the original Socket.io server's publicState(): everything a
 * client needs, computed fresh from the stored room row rather than
 * cached. Terminal-state detection (checkmate/stalemate/repetition/etc.)
 * replays the full move history instead of loading a bare FEN, since
 * chess.js can only see threefold repetition if it watched the moves
 * happen - a FEN-only reconstruction has no memory of prior positions.
 * If the history itself is ever corrupt (shouldn't happen for a
 * legitimately-played game - every move is validated before it's saved),
 * this falls back to the old FEN-only check rather than silently
 * reporting an unfinished game as still in progress.
 */
export function publicState(room: Room) {
  const replay = replayGame(room.move_history);
  const fallback = new Chess(room.fen);
  const turn = replay ? replay.turn : fallback.turn();
  const isCheckmate = replay ? replay.isCheckmate : fallback.isCheckmate();
  const isStalemate = replay ? replay.isStalemate : fallback.isStalemate();
  const isDraw = replay ? replay.isDraw : fallback.isDraw();
  const isGameOverByRules = replay ? replay.isGameOver : fallback.isGameOver();
  const isAbandoned = room.abandoned_at !== null;

  const over = isAbandoned || isGameOverByRules || room.resigned_by !== null || room.draw_offered_by === "agreed";

  let resultText: string | null = null;
  let result: "1-0" | "0-1" | "1/2-1/2" | null = null;

  if (isAbandoned) {
    const who = room.abandoned_by === "white" ? "White" : room.abandoned_by === "black" ? "Black" : "A player";
    resultText = `${who} didn't reconnect in time - the game was abandoned`;
  } else if (room.resigned_by) {
    resultText = `${room.resigned_by === "white" ? "White" : "Black"} resigned`;
    result = room.resigned_by === "white" ? "0-1" : "1-0";
  } else if (isCheckmate) {
    resultText = "Checkmate";
    result = turn === "w" ? "0-1" : "1-0";
  } else if (isStalemate) {
    resultText = "Stalemate";
    result = "1/2-1/2";
  } else if (room.draw_offered_by === "agreed") {
    resultText = "Draw agreed";
    result = "1/2-1/2";
  } else if (isDraw) {
    resultText = "Draw";
    result = "1/2-1/2";
  }

  return {
    roomId: room.id,
    fen: room.fen,
    turn,
    moveHistory: room.move_history,
    isGameOver: over,
    resultText,
    result,
    isAbandoned,
    abandonedBy: room.abandoned_by,
    drawOfferedBy: room.draw_offered_by,
    hasWhite: Boolean(room.white_player_id),
    hasBlack: Boolean(room.black_player_id),
    whiteLastSeen: room.white_last_seen,
    blackLastSeen: room.black_last_seen,
  };
}

/**
 * Atomically marks a room abandoned because `staleColor`'s seat has gone
 * quiet, but only if all of the following are still true at the exact
 * moment the write is committed:
 *  - the game isn't already over (resigned, drawn, abandoned, or won/drawn
 *    by the rules - re-verified here via a fresh full-history replay, not
 *    trusted from an earlier read, to close the gap where a checkmating
 *    move could be saved in between)
 *  - the room's fen AND full move_history still match exactly what was
 *    just verified (not just the FEN, and not just the history's length -
 *    different histories could coincidentally share a FEN or a move
 *    count, so both are compared, and the history comparison is a full
 *    JSONB equality check)
 *  - staleColor's last_seen is still older than the timeout
 * If any of that has changed by the time the UPDATE actually runs - a
 * reconnect, a move, a resignation, a draw, another abandonment call
 * racing this one - the WHERE clause simply won't match and the update
 * affects 0 rows. That's Postgres's normal atomic single-statement
 * guarantee, the same mechanism rooms-move already relies on for its own
 * FEN-based concurrency check; no explicit transaction block is needed.
 */
export async function tryAbandonRoom(
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  room: Room,
  // "both" is for the scheduled sweep, where neither seat has a heartbeat
  // and there's no single "the one who left" to name - abandoned_by is set
  // to null in that case rather than arbitrarily blaming one side.
  staleColor: "white" | "black" | "both",
): Promise<{ success: boolean; reason: string; room: Room | null }> {
  if (room.abandoned_at) return { success: false, reason: "Room is already abandoned", room: null };
  if (room.resigned_by) return { success: false, reason: "Game already ended by resignation", room: null };
  if (room.draw_offered_by === "agreed") return { success: false, reason: "Game already ended in a draw", room: null };

  const replay = replayGame(room.move_history);
  if (!replay) return { success: false, reason: "Could not verify game state from move history", room: null };
  if (replay.fen !== room.fen) return { success: false, reason: "Move history does not match stored position", room: null };
  if (replay.isGameOver) return { success: false, reason: "Game already over by the rules", room: null };

  const cutoff = new Date(Date.now() - ABANDON_TIMEOUT_MS).toISOString();

  let query = supabase
    .from("rooms")
    .update({ abandoned_by: staleColor === "both" ? null : staleColor, abandoned_at: new Date().toISOString() })
    .eq("id", room.id)
    .eq("fen", room.fen)
    .eq("move_history", room.move_history)
    .is("abandoned_at", null)
    .is("resigned_by", null)
    .or("draw_offered_by.is.null,draw_offered_by.neq.agreed");

  if (staleColor === "both") {
    query = query.lt("white_last_seen", cutoff).lt("black_last_seen", cutoff);
  } else {
    query = query.lt(staleColor === "white" ? "white_last_seen" : "black_last_seen", cutoff);
  }

  const { data: updated, error } = await query.select("*").maybeSingle<Room>();

  if (error) return { success: false, reason: error.message, room: null };
  if (!updated) return { success: false, reason: "Opponent reconnected or room state changed", room: null };
  return { success: true, reason: "Room marked abandoned", room: updated };
}
