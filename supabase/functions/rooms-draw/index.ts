import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors, json, publicState, seatFor, type Room } from "../_shared/state.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { roomId, playerId } = await req.json();
  if (!roomId || !playerId) return json({ error: "roomId and playerId are required" }, 400);

  const { data: room, error } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle<Room>();
  if (error) return json({ error: error.message }, 500);
  if (!room) return json({ error: "Room not found" }, 404);

  const color = seatFor(room, playerId);
  if (!color) return json({ error: "You are not seated in this game" }, 403);
  if (room.abandoned_at) return json({ error: "Game is over" }, 409);

  const nextOffer = room.draw_offered_by && room.draw_offered_by !== color ? "agreed" : color;

  // Check-and-set on the draw_offered_by we read, same idea as rooms-move's
  // FEN guard. .eq() with a JS null wouldn't translate to "IS NULL" in
  // PostgREST, so branch on .is() vs .eq() explicitly.
  let query = supabase.from("rooms").update({ draw_offered_by: nextOffer }).eq("id", roomId).is("abandoned_at", null);
  query = room.draw_offered_by === null ? query.is("draw_offered_by", null) : query.eq("draw_offered_by", room.draw_offered_by);
  const { data: updated } = await query.select("*").maybeSingle<Room>();

  return json(publicState(updated ?? room));
});
