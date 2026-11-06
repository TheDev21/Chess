import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors, json, publicState, seatFor, type Room } from "../_shared/state.ts";

// Called periodically (every ~20-25s) by a client that currently has a
// seat in an online game. This timestamp - not browser presence, not a
// client-side clock - is the authoritative signal rooms-abandon and the
// scheduled rooms-cleanup sweep use to decide whether a seat has gone
// quiet. It's a no-op (harmless) once a room is already abandoned.
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

  const column = color === "white" ? "white_last_seen" : "black_last_seen";
  const { data: updated } = await supabase
    .from("rooms")
    .update({ [column]: new Date().toISOString() })
    .eq("id", roomId)
    .is("abandoned_at", null)
    .select("*")
    .maybeSingle<Room>();

  return json(publicState(updated ?? room));
});
