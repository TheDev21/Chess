// Deliberately free of any Deno-specific import specifiers (unlike the
// rest of _shared/, which needs "npm:"/"jsr:" imports for chess.js and the
// Supabase client) so this one function can be imported unmodified by both
// rooms-join/index.ts (Deno) and a plain vitest test (Node) - the same
// production code is exercised in both places, not a hand-written twin of
// it.

export type Seat = "white" | "black" | null;

export interface SeatClaimInput {
  /** The seat `playerId` already occupies, if any - from seatFor(room, playerId). */
  existingSeat: Seat;
  /**
   * Whether this request is allowed to claim an open seat at all. true for
   * an initial join (a new visitor may become a player); false for a
   * background Realtime resync (see useRealtimeRoom.ts), so a spectator's
   * channel reconnecting never silently seats them without an explicit
   * action on their part.
   */
  allowSeatClaim: boolean;
  /** room.abandoned_at !== null, from the pre-read room row. */
  roomAbandoned: boolean;
}

/**
 * Gate for whether rooms-join/index.ts should even attempt the atomic
 * conditional UPDATEs that claim an open seat.
 *
 * - A caller who already holds a seat (existingSeat !== null) never goes
 *   through the claim path - they only refresh their last_seen.
 * - allowSeatClaim: false means the caller explicitly isn't asking to
 *   become a player right now; no seat may be claimed even if one is open.
 * - A pre-abandoned room never accepts a new seat claim. The atomic
 *   UPDATEs in rooms-join/index.ts also re-check abandoned_at live against
 *   the database on every attempt; this is just the fast, pre-read bypass
 *   that skips the round trip in the common case, not the sole guarantee.
 */
export function mayAttemptSeatClaim({ existingSeat, allowSeatClaim, roomAbandoned }: SeatClaimInput): boolean {
  return existingSeat === null && allowSeatClaim && !roomAbandoned;
}
