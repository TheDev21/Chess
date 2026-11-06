import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors, json, tryAbandonRoom, type Room } from "../_shared/state.ts";

const ABANDON_TIMEOUT_MS = 2 * 60 * 1000;

// Scheduled sweep (invoked by a pg_cron + pg_net job, not by any browser).
// This is the enforcement that works even if both players close their tabs
// and nobody is left to click "Leave" - rooms-abandon (the player-triggered
// path) is a convenience that resolves things a few seconds faster for an
// engaged remaining player, not the only way a stale room gets cleaned up.
//
// Authentication: the cron job's own Supabase JWT (anon key) only
// satisfies this function's default per-function auth gate. The actual
// permission to run a sweep comes from a separate secret, stored in
// Supabase Vault and never exposed to any client, verified via the
// verify_cleanup_secret() database function (SECURITY DEFINER, execute
// restricted to the service role) rather than by querying vault.* tables
// directly - the Vault schema isn't exposed through the normal REST
// client, by design.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const provided = req.headers.get("X-Cleanup-Secret");
  const { data: isValid, error: verifyError } = await supabase.rpc("verify_cleanup_secret", { provided });
  if (verifyError) return json({ error: verifyError.message }, 500);
  if (!isValid) return json({ error: "Unauthorized" }, 401);

  const cutoff = new Date(Date.now() - ABANDON_TIMEOUT_MS).toISOString();

  // Only fully-seated, still-active rooms are candidates - a room still
  // waiting for a second player is a different, pre-existing state and is
  // never "abandoned" by this sweep. Staleness itself is checked in JS
  // below rather than folded into this query, to avoid embedding an ISO
  // timestamp inside a PostgREST .or() filter string.
  //
  // Paginated with keyset pagination (WHERE id > lastId ORDER BY id),
  // not offset/range pagination, specifically so a project with more
  // candidate rooms than Supabase's configured per-request row cap still
  // gets every eligible room swept, not just the first page. Keyset
  // pagination is the right tool here because it stays correct even while
  // rooms are being resolved concurrently during the sweep (by a
  // heartbeat, a move, a resignation, a draw, or another abandonment call
  // racing this one): each page is defined relative to "the last room id
  // I actually saw," not a numeric offset, so if an earlier room drops out
  // of the eligible set between pages (because it just got legitimately
  // resolved), nothing downstream shifts and no later room is skipped the
  // way it could be with OFFSET-based pagination under concurrent writes.
  // A room's *eligibility* is re-checked fresh on every page fetch, and
  // its *abandonment* is independently re-verified atomically inside
  // tryAbandonRoom() regardless of how stale the page data itself is by
  // the time that room is actually processed.
  const PAGE_SIZE = 500;
  let lastId: string | null = null;
  let scanned = 0;
  let abandoned = 0;
  let skipped = 0;

  while (true) {
    let page = supabase
      .from("rooms")
      .select("*")
      .is("abandoned_at", null)
      .is("resigned_by", null)
      .or("draw_offered_by.is.null,draw_offered_by.neq.agreed")
      .not("white_player_id", "is", null)
      .not("black_player_id", "is", null)
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (lastId !== null) page = page.gt("id", lastId);

    const { data: candidates, error } = await page.returns<Room[]>();
    if (error) return json({ error: error.message }, 500);
    if (!candidates || candidates.length === 0) break;

    for (const room of candidates) {
      scanned++;
      const whiteStale = !room.white_last_seen || room.white_last_seen < cutoff;
      const blackStale = !room.black_last_seen || room.black_last_seen < cutoff;
      if (!whiteStale && !blackStale) continue; // this seat pair is still active, nothing to do

      const staleColor = whiteStale && blackStale ? "both" : whiteStale ? "white" : "black";
      const outcome = await tryAbandonRoom(supabase, room, staleColor);
      if (outcome.success) abandoned++;
      else skipped++;
    }

    lastId = candidates[candidates.length - 1].id;
    if (candidates.length < PAGE_SIZE) break; // last page was partial, nothing more to fetch
  }

  return json({ scanned, abandoned, skipped });
});
