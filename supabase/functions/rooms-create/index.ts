import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomRoomId(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous chars
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Starting FEN is the table's default, so no need to send it explicitly.
  let roomId = randomRoomId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from("rooms").insert({ id: roomId });
    if (!error) {
      return new Response(JSON.stringify({ roomId }), {
        status: 201,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (error.code !== "23505") {
      // not a primary-key collision - a real failure
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    roomId = randomRoomId();
  }

  return new Response(JSON.stringify({ error: "Could not allocate a room code" }), {
    status: 500,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
