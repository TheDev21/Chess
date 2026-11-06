import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Chess } from "npm:chess.js@1.0.0-beta.8";
import { cors, json, publicState, seatFor, type Room } from "../_shared/state.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { roomId, playerId, from, to, promotion } = await req.json();
  if (!roomId || !playerId || !from || !to) return json({ error: "roomId, playerId, from and to are required" }, 400);

  const { data: room, error } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle<Room>();
  if (error) return json({ error: error.message }, 500);
  if (!room) return json({ error: "Room not found" }, 404);
  if (room.resigned_by || room.draw_offered_by === "agreed" || room.abandoned_at) return json({ error: "Game is over" }, 409);

  const color = seatFor(room, playerId);
  if (!color) return json({ error: "You are not seated in this game" }, 403);

  const chess = new Chess(room.fen);
  const turnColor = chess.turn() === "w" ? "white" : "black";
  if (color !== turnColor) return json({ error: "It is not your turn" }, 409);

  let move;
  try {
    move = chess.move({ from, to, promotion: promotion || "q" });
  } catch {
    move = null;
  }
  if (!move) return json({ error: "Illegal move" }, 422);

  const newFen = chess.fen();
  const newHistory = [...room.move_history, { san: move.san, fen: newFen }];

  // Check-and-set on the FEN we read: if someone else's move landed first,
  // this update matches 0 rows instead of silently clobbering it.
  const { data: updated, error: updateError } = await supabase
    .from("rooms")
    .update({ fen: newFen, move_history: newHistory, draw_offered_by: null })
    .eq("id", roomId)
    .eq("fen", room.fen)
    .is("abandoned_at", null)
    .select("*")
    .maybeSingle<Room>();

  if (updateError) return json({ error: updateError.message }, 500);
  if (!updated) return json({ error: "Position changed - refresh and try again" }, 409);

  return json({ move: { san: move.san, from: move.from, to: move.to }, ...publicState(updated) });
});
