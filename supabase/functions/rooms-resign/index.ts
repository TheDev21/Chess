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
  if (room.resigned_by) return json(publicState(room));

  const { data: updated } = await supabase
    .from("rooms")
    .update({ resigned_by: color })
    .eq("id", roomId)
    .is("resigned_by", null)
    .select("*")
    .maybeSingle<Room>();

  return json(publicState(updated ?? room));
});
