import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors, json, publicState, seatFor, type Room } from "../_shared/state.ts";
import { mayAttemptSeatClaim } from "../_shared/seatClaim.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // allowSeatClaim defaults to true so an initial join (which may omit it
  // entirely) keeps its existing behavior of being able to claim an open
  // seat. A background Realtime resync explicitly passes false - see
  // useRealtimeRoom.ts - so a spectator's channel reconnecting can never
  // silently seat them.
  const { roomId, playerId, allowSeatClaim = true } = await req.json();
  if (!roomId || !playerId) return json({ error: "roomId and playerId are required" }, 400);

  const { data: room, error } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle<Room>();
  if (error) return json({ error: error.message }, 500);
  if (!room) return json({ error: "Room not found" }, 404);

  let color = seatFor(room, playerId);
  if (color) {
    // A returning player reclaiming their existing seat - refresh their
    // heartbeat immediately rather than waiting for the next periodic
    // one, so a reconnect can never be mistaken for continued absence in
    // the gap before the client's next heartbeat tick. This happens
    // regardless of allowSeatClaim - it's not a seat *claim*, just a
    // refresh of a seat the caller already holds.
    const column = color === "white" ? "white_last_seen" : "black_last_seen";
    await supabase.from("rooms").update({ [column]: new Date().toISOString() }).eq("id", roomId).is("abandoned_at", null);
  } else if (mayAttemptSeatClaim({ existingSeat: color, allowSeatClaim, roomAbandoned: Boolean(room.abandoned_at) })) {
    // Atomic seat claim: only succeeds if the seat is still empty (and the
    // room isn't abandoned), so two players joining at once can't both end
    // up white, and nobody can take over a room whose game already ended.
    const now = new Date().toISOString();
    const { data: claimedWhite } = await supabase
      .from("rooms")
      .update({ white_player_id: playerId, white_last_seen: now })
      .eq("id", roomId)
      .is("white_player_id", null)
      .is("abandoned_at", null)
      .select("*")
      .maybeSingle<Room>();
    if (claimedWhite) {
      color = "white";
    } else {
      const { data: claimedBlack } = await supabase
        .from("rooms")
        .update({ black_player_id: playerId, black_last_seen: now })
        .eq("id", roomId)
        .is("black_player_id", null)
        .is("abandoned_at", null)
        .neq("white_player_id", playerId)
        .select("*")
        .maybeSingle<Room>();
      if (claimedBlack) color = "black";
    }
  }
  // If the caller never held a seat and either the room is abandoned or
  // allowSeatClaim was false, color stays null - they can still view the
  // current/final state as a spectator, just not become a player.

  const { data: finalRoom } = await supabase.from("rooms").select("*").eq("id", roomId).single<Room>();
  return json({ color, ...publicState(finalRoom!) });
});
