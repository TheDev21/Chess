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

  let color = seatFor(room, playerId);
  if (!color) {
    // Atomic seat claim: only succeeds if the seat is still empty, so two
    // players joining at once can't both end up white.
    const { data: claimedWhite } = await supabase
      .from("rooms")
      .update({ white_player_id: playerId })
      .eq("id", roomId)
      .is("white_player_id", null)
      .select("*")
      .maybeSingle<Room>();
    if (claimedWhite) {
      color = "white";
    } else {
      const { data: claimedBlack } = await supabase
        .from("rooms")
        .update({ black_player_id: playerId })
        .eq("id", roomId)
        .is("black_player_id", null)
        .neq("white_player_id", playerId)
        .select("*")
        .maybeSingle<Room>();
      if (claimedBlack) color = "black";
    }
  }

  const { data: finalRoom } = await supabase.from("rooms").select("*").eq("id", roomId).single<Room>();
  return json({ color, ...publicState(finalRoom!) });
});
