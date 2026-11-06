import { describe, it, expect } from "vitest";
import { mayAttemptSeatClaim } from "../seatClaim";

// This imports and exercises the exact function rooms-join/index.ts calls
// in production (seatClaim.ts has no Deno-specific imports, so unlike the
// rest of supabase/functions/_shared/ it can be imported directly by
// vitest) - not a separately hand-written imitation of its logic.

describe("mayAttemptSeatClaim", () => {
  it("allows an initial join to claim an open seat", () => {
    expect(mayAttemptSeatClaim({ existingSeat: null, allowSeatClaim: true, roomAbandoned: false })).toBe(true);
  });

  it("never attempts a claim for a caller who already holds a seat (reconnect path instead)", () => {
    // In rooms-join/index.ts this case never even reaches mayAttemptSeatClaim
    // - it's handled by the `if (color) {...}` branch first - but the gate
    // itself must also refuse a claim for an already-seated caller, as a
    // safety net.
    expect(mayAttemptSeatClaim({ existingSeat: "white", allowSeatClaim: false, roomAbandoned: false })).toBe(false);
    expect(mayAttemptSeatClaim({ existingSeat: "black", allowSeatClaim: true, roomAbandoned: false })).toBe(false);
  });

  it("refuses a claim for a spectator when allowSeatClaim is false, even if a seat is open", () => {
    // This is the regression case: a background Realtime resync (which
    // always sends allowSeatClaim: false) must never be able to seat a
    // spectator, no matter how open the room is.
    expect(mayAttemptSeatClaim({ existingSeat: null, allowSeatClaim: false, roomAbandoned: false })).toBe(false);
  });

  it("refuses a claim for an abandoned room regardless of allowSeatClaim", () => {
    expect(mayAttemptSeatClaim({ existingSeat: null, allowSeatClaim: true, roomAbandoned: true })).toBe(false);
  });
});
