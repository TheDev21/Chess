import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors, json, publicState, seatFor, tryAbandonRoom, type Room } from "../_shared/state.ts";

// Called by the remaining player's client after showing the "opponent
// disconnected" banner for 2 minutes. This is a convenience that resolves
// things faster for an engaged remaining player - it is NOT the only path
// to cleanup (see rooms-cleanup, the scheduled sweep that covers the case
// where nobody is left watching). Every safety check here is re-verified
// against the database at write time via tryAbandonRoom(); nothing here is
// trusted from the client beyond "who is asking."
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

  const callerColor = seatFor(room, playerId);
  if (!callerColor) return json({ error: "You are not seated in this game" }, 403);

  const opponentColor = callerColor === "white" ? "black" : "white";
  if (!room.white_player_id || !room.black_player_id) {
    return json({ error: "This room isn't fully seated - nothing to abandon" }, 409);
  }

  const outcome = await tryAbandonRoom(supabase, room, opponentColor);
  if (!outcome.success) return json({ error: outcome.reason }, 409);

  return json(publicState(outcome.room!));
});
