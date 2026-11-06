import { describe, it, expect, vi } from "vitest";
import { decideConnectionTransition, createResyncCoordinator, applyIfFresher, initialRoomSessionState } from "../useRealtimeRoom";

// These test the pure decision logic extracted from useRealtimeRoom so it
// can be verified without a React/DOM environment (this project has
// neither @testing-library/react nor a configured DOM test environment -
// vite.config.ts's `test.environment` is "node" - and this work doesn't
// add either). The hook's full lifecycle (actually creating a channel,
// receiving real Supabase events) still needs the manual two-browser
// testing described in the Phase 3 plan.

describe("decideConnectionTransition", () => {
  const initial = { hasConnectedOnce: false, wasDisconnected: false };

  it("treats the first SUBSCRIBED as the initial connection, not a reconnection", () => {
    const result = decideConnectionTransition(initial, "SUBSCRIBED");
    expect(result.connectionStatus).toBe("connected");
    expect(result.shouldResync).toBe(false);
    expect(result.next).toEqual({ hasConnectedOnce: true, wasDisconnected: false });
  });

  it("marks the channel as reconnecting on CHANNEL_ERROR", () => {
    const afterConnect = { hasConnectedOnce: true, wasDisconnected: false };
    const result = decideConnectionTransition(afterConnect, "CHANNEL_ERROR");
    expect(result.connectionStatus).toBe("reconnecting");
    expect(result.shouldResync).toBe(false);
    expect(result.next.wasDisconnected).toBe(true);
  });

  it("marks the channel as reconnecting on TIMED_OUT and CLOSED too", () => {
    const afterConnect = { hasConnectedOnce: true, wasDisconnected: false };
    expect(decideConnectionTransition(afterConnect, "TIMED_OUT").connectionStatus).toBe("reconnecting");
    expect(decideConnectionTransition(afterConnect, "CLOSED").connectionStatus).toBe("reconnecting");
  });

  it("triggers a resync on SUBSCRIBED that follows a tracked disconnection", () => {
    const disconnected = { hasConnectedOnce: true, wasDisconnected: true };
    const result = decideConnectionTransition(disconnected, "SUBSCRIBED");
    expect(result.connectionStatus).toBe("connected");
    expect(result.shouldResync).toBe(true);
    expect(result.next).toEqual({ hasConnectedOnce: true, wasDisconnected: false });
  });

  it("does not resync on a redundant SUBSCRIBED while already connected", () => {
    const stillConnected = { hasConnectedOnce: true, wasDisconnected: false };
    const result = decideConnectionTransition(stillConnected, "SUBSCRIBED");
    expect(result.shouldResync).toBe(false);
    expect(result.connectionStatus).toBeNull(); // no change to report
  });

  it("supports repeated drop/reconnect cycles, resyncing every genuine reconnection", () => {
    let t = initial;
    let r = decideConnectionTransition(t, "SUBSCRIBED"); // initial connect
    t = r.next;
    expect(r.shouldResync).toBe(false);

    r = decideConnectionTransition(t, "CHANNEL_ERROR"); // drop #1
    t = r.next;
    r = decideConnectionTransition(t, "SUBSCRIBED"); // reconnect #1
    t = r.next;
    expect(r.shouldResync).toBe(true);

    r = decideConnectionTransition(t, "TIMED_OUT"); // drop #2
    t = r.next;
    r = decideConnectionTransition(t, "SUBSCRIBED"); // reconnect #2
    t = r.next;
    expect(r.shouldResync).toBe(true); // resyncs again, not just once
  });
});

describe("initialRoomSessionState", () => {
  it("starts connectionStatus as 'connecting', not 'connected'", () => {
    const fresh = initialRoomSessionState();
    expect(fresh.connectionStatus).toBe("connecting");
  });

  it("starts every other field blank, so a new room session can't inherit stale data", () => {
    const fresh = initialRoomSessionState();
    expect(fresh.seat).toBeNull();
    expect(fresh.state).toBeNull();
    expect(fresh.presence).toEqual({ white: false, black: false });
    expect(fresh.error).toBeNull();
  });
});

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createResyncCoordinator", () => {
  it("runs immediately on the first trigger", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const coordinator = createResyncCoordinator(run);
    coordinator.trigger();
    expect(run).toHaveBeenCalledTimes(1);
    await flushMicrotasks();
    expect(coordinator.getState()).toBe("idle");
  });

  it("coalesces a trigger that arrives while already running into exactly one queued retry", async () => {
    let resolveFirst: () => void = () => {};
    const run = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const coordinator = createResyncCoordinator(run);

    coordinator.trigger(); // starts running
    expect(run).toHaveBeenCalledTimes(1);

    // Multiple triggers while running must coalesce into one pending retry,
    // not one retry per trigger.
    coordinator.trigger();
    coordinator.trigger();
    coordinator.trigger();
    expect(coordinator.getState()).toBe("pending");
    expect(run).toHaveBeenCalledTimes(1); // no new run started yet

    resolveFirst();
    await flushMicrotasks();
    await flushMicrotasks();

    expect(run).toHaveBeenCalledTimes(2); // exactly one coalesced retry fired
  });

  it("returns to idle once the queued retry finishes with no further triggers", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const coordinator = createResyncCoordinator(run);

    coordinator.trigger();
    coordinator.trigger(); // queues one retry
    await flushMicrotasks();
    await flushMicrotasks();

    expect(run).toHaveBeenCalledTimes(2);
    expect(coordinator.getState()).toBe("idle");
  });

  it("starts a fresh run for a trigger that arrives after everything has settled", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const coordinator = createResyncCoordinator(run);

    coordinator.trigger();
    await flushMicrotasks();
    expect(coordinator.getState()).toBe("idle");

    coordinator.trigger(); // a later, independent disconnect/reconnect cycle
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("doesn't wedge the coordinator when run() rejects", async () => {
    const run = vi.fn().mockRejectedValue(new Error("network blip"));
    const coordinator = createResyncCoordinator(run);

    coordinator.trigger();
    await flushMicrotasks();
    await flushMicrotasks();

    expect(coordinator.getState()).toBe("idle");
    coordinator.trigger(); // still usable afterward
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("safely skips a queued resync if the player lost their seat or the channel dropped before it starts", async () => {
    // Mirrors how useRealtimeRoom wires this up: the real run() re-checks
    // live conditions (seatRef.current, isSubscribedRef.current) itself, at
    // the moment it actually executes - not at the moment it was queued.
    // joinRoom() itself is the deferred part here, so the first run stays
    // in flight (unresolved) while the second trigger queues a retry; the
    // condition check for each run is only ever made when that run itself
    // starts executing, exactly as in production.
    const seatRef: { current: string | null } = { current: "white" };
    const isSubscribedRef = { current: true };
    const resolvers: Array<() => void> = [];
    const joinRoom = vi.fn(() => new Promise<void>((resolve) => resolvers.push(resolve)));

    const run = vi.fn(async () => {
      if (seatRef.current && isSubscribedRef.current) {
        await joinRoom();
      }
    });
    const coordinator = createResyncCoordinator(run);

    coordinator.trigger(); // starts running: checks now (seated + subscribed), calls joinRoom, which stays pending
    coordinator.trigger(); // queues a retry while the first is still in flight
    expect(run).toHaveBeenCalledTimes(1);
    expect(joinRoom).toHaveBeenCalledTimes(1);

    // Before the queued retry actually starts, the player loses their seat
    // (e.g. the room was abandoned) and the channel drops again.
    seatRef.current = null;
    isSubscribedRef.current = false;

    resolvers[0](); // finish the first run's joinRoom call
    await flushMicrotasks();
    await flushMicrotasks();

    expect(run).toHaveBeenCalledTimes(2); // the queued retry started and ran its own check...
    expect(joinRoom).toHaveBeenCalledTimes(1); // ...which failed at that execution time, so it skipped joinRoom
    expect(coordinator.getState()).toBe("idle");
  });

  it("still resyncs a spectator (no seat) after a reconnect, as long as the channel is subscribed", async () => {
    // Regression test for useRealtimeRoom's actual resync callback, which
    // intentionally does NOT require seatRef.current to be set - only
    // `cancelled` and `isSubscribedRef.current` gate it (see the comment
    // there for why joinRoom() is safe to call for a spectator too). This
    // mirrors that exact condition, not just the generic coordinator.
    const seatRef: { current: string | null } = { current: null }; // spectator: never held a seat
    const isSubscribedRef = { current: true };
    const joinRoom = vi.fn().mockResolvedValue(undefined);

    const run = vi.fn(async () => {
      if (!isSubscribedRef.current) return; // no seat check - matches the fixed production condition
      await joinRoom();
    });
    const coordinator = createResyncCoordinator(run);

    coordinator.trigger(); // simulates decideConnectionTransition's shouldResync firing after a reconnect
    await flushMicrotasks();

    expect(seatRef.current).toBeNull(); // still a spectator throughout
    expect(joinRoom).toHaveBeenCalledTimes(1); // resynced anyway
  });
});

describe("applyIfFresher", () => {
  it("updates the ref synchronously when the value passes the freshness check", () => {
    const ref: { current: number | null } = { current: 1 };
    const applied = applyIfFresher(ref, 2, (cur, inc) => (cur ?? 0) <= inc);
    expect(applied).toBe(true);
    expect(ref.current).toBe(2); // updated immediately, not deferred
  });

  it("does not update the ref when the value fails the freshness check", () => {
    const ref: { current: number | null } = { current: 5 };
    const applied = applyIfFresher(ref, 2, (cur, inc) => (cur ?? 0) <= inc);
    expect(applied).toBe(false);
    expect(ref.current).toBe(5);
  });

  it("reflects each update immediately so back-to-back calls compare against the true latest value", () => {
    const ref: { current: number | null } = { current: null };
    const isFresh = (cur: number | null, inc: number) => cur === null || inc > cur;

    // Two calls in immediate succession, as could happen before React has
    // re-rendered in between - each must see the other's effect.
    applyIfFresher(ref, 1, isFresh);
    const secondApplied = applyIfFresher(ref, 1, isFresh); // same value again - must be rejected, not stale-accepted
    expect(secondApplied).toBe(false);
    expect(ref.current).toBe(1);

    const thirdApplied = applyIfFresher(ref, 2, isFresh);
    expect(thirdApplied).toBe(true);
    expect(ref.current).toBe(2);
  });
});
