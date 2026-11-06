import { describe, it, expect, vi, afterEach } from "vitest";
import { joinRoom } from "../api";

// Exercises the real joinRoom() from api.ts (not a reimplementation),
// verifying the exact request body it sends to rooms-join for each call
// shape useRealtimeRoom.ts actually uses.

function mockFetchOnce(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("joinRoom", () => {
  it("omits allowSeatClaim on an initial join, preserving the server's default seat-claim behavior", async () => {
    const fetchMock = mockFetchOnce({ color: "white" });
    await joinRoom("room1", "player1");

    const [, init] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse((init as RequestInit).body as string);
    expect(sentBody).toEqual({ roomId: "room1", playerId: "player1" }); // allowSeatClaim key dropped (undefined), not sent as false
  });

  it("sends allowSeatClaim: false for a background resync, so a spectator can never be silently seated", async () => {
    const fetchMock = mockFetchOnce({ color: null });
    await joinRoom("room1", "player1", { allowSeatClaim: false });

    const [, init] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse((init as RequestInit).body as string);
    expect(sentBody).toEqual({ roomId: "room1", playerId: "player1", allowSeatClaim: false });
  });
});
