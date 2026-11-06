import { useEffect, useRef, useState } from "react";
import { supabase, HAS_BACKEND } from "./supabaseClient";
import { joinRoom, type RoomState } from "./api";
import { isAtLeastAsFresh } from "./roomStateFreshness";
import type { PlayerColor } from "../../types/chess";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting";

interface ConnectionTransition {
  hasConnectedOnce: boolean;
  wasDisconnected: boolean;
}

/**
 * Pure decision logic for one Realtime channel status event, factored out
 * specifically so it can be unit tested without a React/DOM environment
 * (this project has neither @testing-library/react nor a DOM test
 * environment configured, and this change doesn't add either).
 *
 * The key distinction: the first SUBSCRIBED a channel ever reports (right
 * after mounting) is the initial connection, not a reconnection - only a
 * SUBSCRIBED that follows a tracked disconnection (`wasDisconnected`) is
 * treated as "the channel just came back," which is the only case where a
 * resync should fire.
 */
export function decideConnectionTransition(
  prev: ConnectionTransition,
  status: string,
): { next: ConnectionTransition; connectionStatus: ConnectionStatus | null; shouldResync: boolean } {
  if (status === "SUBSCRIBED") {
    if (prev.hasConnectedOnce && prev.wasDisconnected) {
      return { next: { hasConnectedOnce: true, wasDisconnected: false }, connectionStatus: "connected", shouldResync: true };
    }
    if (!prev.hasConnectedOnce) {
      return { next: { hasConnectedOnce: true, wasDisconnected: false }, connectionStatus: "connected", shouldResync: false };
    }
    return { next: prev, connectionStatus: null, shouldResync: false }; // redundant SUBSCRIBED while already connected
  }
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
    return { next: { ...prev, wasDisconnected: true }, connectionStatus: "reconnecting", shouldResync: false };
  }
  return { next: prev, connectionStatus: null, shouldResync: false };
}

/**
 * Coordinates resync attempts so that a disconnect/reconnect cycle
 * arriving while one is already in flight is never silently dropped, but
 * also never allowed to stack unboundedly:
 *
 *  - idle -> trigger() -> starts running `run()` immediately.
 *  - running -> trigger() -> coalesces into a single "pending" flag (a
 *    second, third, fourth... trigger while already running all collapse
 *    into the same one pending flag, not one retry per trigger).
 *  - when the in-flight `run()` finishes, if a trigger arrived while it
 *    was running, exactly one more `run()` happens for it, then the
 *    coordinator returns to idle unless yet another trigger arrived
 *    during *that* run too (handling a genuinely continuous disconnect/
 *    reconnect churn correctly, without ever queueing more than one
 *    outstanding retry at a time - this is what keeps it from becoming an
 *    unbounded/infinite retry loop).
 *
 * `run` is responsible for re-checking whatever live conditions matter
 * (e.g. "is the channel still subscribed, does the player still have a
 * seat") itself, since those can change between when a retry is queued
 * and when it actually executes.
 */
export function createResyncCoordinator(run: () => Promise<void>) {
  let state: "idle" | "running" | "pending" = "idle";

  const start = () => {
    state = "running";
    void run()
      .catch(() => {
        /* run() is expected to handle/log its own errors; this is just a safety net so a thrown rejection can't wedge the coordinator */
      })
      .finally(() => {
        if (state === "pending") start(); // exactly one queued retry, re-checked live by run() itself
        else state = "idle";
      });
  };

  return {
    trigger: () => {
      if (state === "idle") start();
      else if (state === "running") state = "pending";
      // already "pending": further triggers coalesce into the same one, no-op
    },
    getState: () => state,
  };
}

/**
 * Applies `incoming` to `ref` only if it passes `isFresh`, updating the
 * ref synchronously (not waiting on a React render) so that two calls
 * arriving back to back - before React has had a chance to re-render in
 * between - each compare against the true latest value rather than a
 * stale one.
 */
export function applyIfFresher<T>(ref: { current: T | null }, incoming: T, isFresh: (current: T | null, incoming: T) => boolean): boolean {
  if (!isFresh(ref.current, incoming)) return false;
  ref.current = incoming;
  return true;
}

interface RoomSessionState {
  seat: PlayerColor | null;
  state: RoomState | null;
  presence: { white: boolean; black: boolean };
  error: string | null;
  connectionStatus: ConnectionStatus;
}

/**
 * The blank-slate shape for a room session - used both as each piece of
 * React state's initial value AND to reset every one of them together
 * when `roomId`/`playerId` changes, so there is exactly one definition of
 * "what a fresh room session looks like" that the two can never drift out
 * of sync with. connectionStatus starts at "connecting", not "connected" -
 * nothing is actually connected yet until the channel reports SUBSCRIBED.
 */
export function initialRoomSessionState(): RoomSessionState {
  return {
    seat: null,
    state: null,
    presence: { white: false, black: false },
    error: null,
    connectionStatus: "connecting",
  };
}

export interface UseRealtimeRoomResult {
  seat: PlayerColor | null;
  state: RoomState | null;
  presence: { white: boolean; black: boolean };
  /** Fatal, non-connection errors only - e.g. the initial join failing outright. */
  error: string | null;
  /**
   * The Realtime channel's own health, tracked independently of whether
   * any particular REST call (joinRoom, a resync) happens to succeed. A
   * successful resync fetch does not by itself mean the channel is
   * healthy again - only the channel reporting SUBSCRIBED does. Starts as
   * "connecting" (not "connected") until that first SUBSCRIBED arrives.
   */
  connectionStatus: ConnectionStatus;
  /**
   * The single gate every room-state update passes through - a Realtime
   * event, a reconnect resync, or the response of a direct action
   * (move/resign/draw/heartbeat/abandon). Callers outside this hook (the
   * existing, unchanged move/resign/draw/heartbeat/abandon handlers) keep
   * calling this exactly as they called the old local applyRoomState
   * before - only its implementation moved.
   */
  applyRoomState: (state: RoomState) => void;
}

/**
 * Owns the Supabase Realtime channel for one online game: creation,
 * subscription, the postgres_changes and presence listeners, the initial
 * joinRoom() call, and - new in Phase 3 - noticing when the channel itself
 * drops and resyncing current state once it has genuinely reconnected
 * (see decideConnectionTransition above for exactly how "genuinely
 * reconnected" is distinguished from the initial connection, and
 * createResyncCoordinator above for how overlapping reconnect cycles are
 * coalesced rather than dropped or left to stack unboundedly).
 *
 * Deliberately does NOT own: heartbeat sending, the disconnect countdown,
 * Keep Waiting / Leave, or any game-result/terminal-state display logic -
 * those stay exactly as they are in OnlineGame.tsx, built on top of what
 * this hook returns, not touched by this extraction.
 *
 * Room/player identity changes: when `roomId` or `playerId` changes, every
 * piece of room-specific state - including the ref the freshness guard
 * compares against - is reset back to initialRoomSessionState() before
 * anything else happens, so a new room can never inherit the previous
 * room's move history, seat, or connection state.
 *
 * Resync safety: the resync calls joinRoom() with { allowSeatClaim: false
 * }, regardless of whether the caller already holds a seat. Read
 * supabase/functions/rooms-join/index.ts and _shared/seatClaim.ts: when
 * the caller already holds a seat, the function takes its reconnect-stamp
 * branch (refreshes that seat's last_seen) exactly as before -
 * allowSeatClaim only gates the separate seat-claim branch. For a pure
 * spectator (seat is null), allowSeatClaim: false guarantees the call can
 * only fetch the latest state, never claim an open seat - so a background
 * reconnect can never silently turn a spectator into a seated player.
 * Spectators still need this resync: without a seat there is no
 * presence/track call to fall back on, and the room may have moved on
 * (new moves, a resignation, an abandonment) while the channel was down.
 * The initial join (below, outside this coordinator) omits the option and
 * keeps the server's default of allowSeatClaim: true, so a new visitor
 * can still become a player exactly as before.
 *
 * `toState` converts a raw `rooms` table row (snake_case columns, as
 * Realtime streams it) into the app's `RoomState` shape. This is the
 * caller's existing conversion function (OnlineGame.tsx's local
 * `toRoomState`) passed in as-is - that function is not moved, exported,
 * or edited; this hook only ever calls it, exactly the way OnlineGame.tsx
 * used to call it directly.
 */
export function useRealtimeRoom<TRow>(roomId: string, playerId: string, toState: (row: TRow) => RoomState): UseRealtimeRoomResult {
  const initial = initialRoomSessionState();
  const [seat, setSeat] = useState<PlayerColor | null>(initial.seat);
  const [state, setStateRaw] = useState<RoomState | null>(initial.state);
  const [presence, setPresence] = useState<{ white: boolean; black: boolean }>(initial.presence);
  const [error, setError] = useState<string | null>(initial.error);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(initial.connectionStatus);

  const stateRef = useRef<RoomState | null>(initial.state);
  const seatRef = useRef<PlayerColor | null>(initial.seat);
  seatRef.current = seat;
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  const applyRoomState = (incoming: RoomState) => {
    if (applyIfFresher(stateRef, incoming, isAtLeastAsFresh)) setStateRaw(incoming);
  };

  useEffect(() => {
    // A new room/player identity must never inherit the previous one's
    // move history, seat, presence, error, or connection state.
    const fresh = initialRoomSessionState();
    stateRef.current = fresh.state;
    seatRef.current = fresh.seat;
    setSeat(fresh.seat);
    setStateRaw(fresh.state);
    setPresence(fresh.presence);
    setError(fresh.error);
    setConnectionStatus(fresh.connectionStatus);

    if (!HAS_BACKEND || !supabase) {
      setError("Play Online is not configured on this build.");
      return;
    }
    const client = supabase;
    let cancelled = false;
    let transition: ConnectionTransition = { hasConnectedOnce: false, wasDisconnected: false };
    const isSubscribedRef = { current: false };

    const resyncCoordinator = createResyncCoordinator(async () => {
      // Re-checked live, at the moment this actually runs - not just at
      // the moment it was queued - since both can change in between.
      // A spectator (seatRef.current === null) still needs to resync: the
      // room may have moved on (new moves, a resignation, an abandonment)
      // while the channel was down, and with no seat there is no Realtime
      // presence/track call to recover that by itself. allowSeatClaim:
      // false means this call can only refresh an existing seat or fetch
      // the latest state as a spectator - it can never claim an open seat,
      // so a background reconnect can never silently turn a spectator into
      // a seated player (see supabase/functions/_shared/seatClaim.ts).
      if (cancelled || !isSubscribedRef.current) return;
      try {
        const { color, ...roomState } = await joinRoom(roomId, playerId, { allowSeatClaim: false });
        if (cancelled) return;
        seatRef.current = color; // synchronous: a SUBSCRIBED firing before React re-renders must still see the seat
        setSeat(color);
        applyRoomState(roomState);
        // Deliberately not touching connectionStatus here: this REST call
        // succeeding says the server is reachable, not that the Realtime
        // channel itself is healthy again - only a genuine SUBSCRIBED
        // event (handled below) means the channel has reconnected.
      } catch (err) {
        console.error("Resync after reconnect failed:", err);
      }
    });

    const channel = client
      .channel(`room:${roomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) =>
        applyRoomState(toState(payload.new as TRow)),
      )
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState<{ color: PlayerColor }>();
        const online = { white: false, black: false };
        for (const key in presenceState) {
          for (const p of presenceState[key]) online[p.color] = true;
        }
        setPresence(online);
      });
    channelRef.current = channel;

    channel.subscribe((status) => {
      if (cancelled) return; // a CLOSED status during our own cleanup isn't a real disconnect
      isSubscribedRef.current = status === "SUBSCRIBED";
      const decision = decideConnectionTransition(transition, status);
      transition = decision.next;
      if (decision.connectionStatus) setConnectionStatus(decision.connectionStatus);
      if (status === "SUBSCRIBED" && seatRef.current) void channel.track({ color: seatRef.current });
      if (decision.shouldResync) resyncCoordinator.trigger();
    });

    joinRoom(roomId, playerId)
      .then(({ color, ...roomState }) => {
        if (cancelled) return;
        seatRef.current = color; // synchronous: a SUBSCRIBED firing before React re-renders must still see the seat
        setSeat(color);
        setError(null);
        applyRoomState(roomState);
        if (color && channelRef.current) void channelRef.current.track({ color });
      })
      .catch((err) => {
        console.error("Failed to join online room:", err);
        if (!cancelled) setError("Couldn't join this game. Check the link and your connection, then try again.");
      });

    return () => {
      cancelled = true;
      channelRef.current = null;
      client.removeChannel(channel);
    };
    // toState is intentionally omitted: callers pass a stable, module-level
    // conversion function (e.g. OnlineGame.tsx's toRoomState, defined
    // outside the component), not a per-render closure, so it never changes
    // between renders and including it would only cause needless resubscribes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, playerId]);

  return { seat, state, presence, error, connectionStatus, applyRoomState };
}
