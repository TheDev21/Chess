import { Chess } from "npm:chess.js@1.0.0-beta.8";

export interface Room {
  id: string;
  fen: string;
  move_history: { san: string; fen: string }[];
  white_player_id: string | null;
  black_player_id: string | null;
  draw_offered_by: "white" | "black" | "agreed" | null;
  resigned_by: "white" | "black" | null;
}

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

/** Mirrors the original Socket.io server's publicState(): everything a client needs, computed fresh from the stored FEN rather than cached. */
export function publicState(room: Room) {
  const chess = new Chess(room.fen);
  const over = chess.isGameOver() || room.resigned_by !== null || room.draw_offered_by === "agreed";
  let resultText: string | null = null;
  if (room.resigned_by) resultText = `${room.resigned_by === "white" ? "White" : "Black"} resigned`;
  else if (chess.isCheckmate()) resultText = "Checkmate";
  else if (chess.isStalemate()) resultText = "Stalemate";
  else if (chess.isDraw()) resultText = "Draw";

  return {
    roomId: room.id,
    fen: room.fen,
    turn: chess.turn(),
    moveHistory: room.move_history,
    isGameOver: over,
    resultText,
    drawOfferedBy: room.draw_offered_by,
    hasWhite: Boolean(room.white_player_id),
    hasBlack: Boolean(room.black_player_id),
  };
}
