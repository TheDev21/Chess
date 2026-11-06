import type { RoomState } from "./api";

type MoveEntry = RoomState["moveHistory"][number];

function sameMove(a: MoveEntry, b: MoveEntry): boolean {
  return a.san === b.san && a.fen === b.fen;
}

/** True if two terminal RoomStates describe the *same* outcome, not just "both over". */
function sameTerminalOutcome(a: RoomState, b: RoomState): boolean {
  return a.result === b.result && a.isAbandoned === b.isAbandoned && a.abandonedBy === b.abandonedBy;
}

/**
 * Guards every incoming room update - a Realtime event, a reconnect
 * resync, or a direct action response (move/resign/draw/heartbeat/
 * abandon) - against overwriting the UI with something older, a
 * different-but-equal-length history, or a contradictory/regressed
 * terminal outcome.
 *
 * Two rules, applied in order:
 *
 * 1. History shape: `incoming` is only accepted if its move history
 *    contains the currently-displayed history as an exact prefix. A
 *    shorter history is rejected outright; an equal-length-but-different
 *    one is rejected by the prefix comparison (two different games can
 *    share a move count, so move count alone is never a safe comparison).
 *
 * 2. Terminal outcome: once `current` is already finished (isGameOver),
 *    `incoming` is only accepted if it is ALSO finished, with the SAME
 *    move history length (a finished game's history can't legitimately
 *    grow further - every write path rejects moves/resignations/draws/
 *    abandonment once a room is already over) AND the SAME terminal
 *    outcome (result, isAbandoned, abandonedBy). This rejects not just a
 *    finished-to-active regression, but also a contradictory finish at
 *    the same point - e.g. the board already shows "White resigned" and
 *    a stale or out-of-order payload claims "Checkmate, Black wins"
 *    instead; same history, incompatible outcomes, must not replace what
 *    is already correctly displayed. A true duplicate (identical history,
 *    identical outcome) passes both checks and is applied as a harmless
 *    no-op. A legitimate transition - the game was still active and a
 *    resignation/draw/abandonment arrives with no new move, or a
 *    checkmating move arrives as the newest move - is accepted normally,
 *    since rule 2 only applies once `current` is already finished.
 */
export function isAtLeastAsFresh(current: RoomState | null, incoming: RoomState): boolean {
  if (!current) return true;

  const cur = current.moveHistory;
  const inc = incoming.moveHistory;
  if (inc.length < cur.length) return false;

  for (let i = 0; i < cur.length; i++) {
    if (!sameMove(cur[i], inc[i])) return false;
  }
  // incoming.moveHistory contains current.moveHistory as an exact prefix.

  if (current.isGameOver) {
    if (!incoming.isGameOver) return false; // never revert a finished game to active
    if (inc.length !== cur.length) return false; // a finished game's history can't legitimately grow
    if (!sameTerminalOutcome(current, incoming)) return false; // reject a contradictory finish, accept a matching duplicate
  }

  return true;
}
