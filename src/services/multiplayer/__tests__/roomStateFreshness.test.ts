import { describe, it, expect } from "vitest";
import { isAtLeastAsFresh } from "../roomStateFreshness";
import type { RoomState } from "../api";

function state(overrides: Partial<RoomState>): RoomState {
  return {
    roomId: "abc123",
    fen: "irrelevant-for-these-tests",
    turn: "w",
    moveHistory: [],
    isGameOver: false,
    resultText: null,
    result: null,
    isAbandoned: false,
    abandonedBy: null,
    drawOfferedBy: null,
    hasWhite: true,
    hasBlack: true,
    whiteLastSeen: null,
    blackLastSeen: null,
    ...overrides,
  };
}

const m = (san: string, fen: string) => ({ san, fen });

describe("isAtLeastAsFresh", () => {
  it("accepts anything when there is no current state yet", () => {
    expect(isAtLeastAsFresh(null, state({ moveHistory: [m("e4", "fen1")] }))).toBe(true);
  });

  it("rejects a shorter (older) history", () => {
    const current = state({ moveHistory: [m("e4", "fen1"), m("e5", "fen2")] });
    const incoming = state({ moveHistory: [m("e4", "fen1")] });
    expect(isAtLeastAsFresh(current, incoming)).toBe(false);
  });

  it("rejects a different history of the same length", () => {
    const current = state({ moveHistory: [m("e4", "fen1")] });
    const incoming = state({ moveHistory: [m("d4", "fenX")] }); // same length, different game
    expect(isAtLeastAsFresh(current, incoming)).toBe(false);
  });

  it("rejects a history that diverges partway through, even if longer", () => {
    const current = state({ moveHistory: [m("e4", "fen1"), m("e5", "fen2")] });
    const incoming = state({ moveHistory: [m("e4", "fen1"), m("c5", "fenY"), m("Nf3", "fenZ")] });
    expect(isAtLeastAsFresh(current, incoming)).toBe(false);
  });

  it("accepts a genuinely newer history (exact prefix, more moves)", () => {
    const current = state({ moveHistory: [m("e4", "fen1")] });
    const incoming = state({ moveHistory: [m("e4", "fen1"), m("e5", "fen2")] });
    expect(isAtLeastAsFresh(current, incoming)).toBe(true);
  });

  it("accepts an exact duplicate as a harmless no-op", () => {
    const current = state({ moveHistory: [m("e4", "fen1")] });
    const incoming = state({ moveHistory: [m("e4", "fen1")] });
    expect(isAtLeastAsFresh(current, incoming)).toBe(true);
  });

  it("accepts a terminal-state change with no new move (resignation/draw/abandonment)", () => {
    const history = [m("e4", "fen1")];
    const current = state({ moveHistory: history, isGameOver: false });
    const incoming = state({ moveHistory: history, isGameOver: true, resultText: "White resigned", result: "0-1" });
    expect(isAtLeastAsFresh(current, incoming)).toBe(true);
  });

  it("accepts checkmate arriving as the newest move", () => {
    const current = state({ moveHistory: [m("f3", "fen1"), m("e5", "fen2"), m("g4", "fen3")], isGameOver: false });
    const incoming = state({
      moveHistory: [m("f3", "fen1"), m("e5", "fen2"), m("g4", "fen3"), m("Qh4#", "fen4")],
      isGameOver: true,
      result: "0-1",
      resultText: "Checkmate",
    });
    expect(isAtLeastAsFresh(current, incoming)).toBe(true);
  });

  it("never reverts a finished game back to active, even with a matching history", () => {
    const history = [m("e4", "fen1")];
    const current = state({ moveHistory: history, isGameOver: true, resultText: "Checkmate", result: "1-0" });
    const incoming = state({ moveHistory: history, isGameOver: false });
    expect(isAtLeastAsFresh(current, incoming)).toBe(false);
  });

  it("rejects a contradictory terminal outcome at the same history point (resignation vs checkmate)", () => {
    const history = [m("e4", "fen1")];
    const current = state({ moveHistory: history, isGameOver: true, resultText: "White resigned", result: "0-1" });
    const incoming = state({ moveHistory: history, isGameOver: true, resultText: "Checkmate", result: "1-0" });
    expect(isAtLeastAsFresh(current, incoming)).toBe(false);
  });

  it("rejects a contradictory terminal outcome: resignation vs abandonment", () => {
    const history = [m("e4", "fen1")];
    const current = state({ moveHistory: history, isGameOver: true, result: "0-1", resultText: "White resigned" });
    const incoming = state({
      moveHistory: history,
      isGameOver: true,
      isAbandoned: true,
      abandonedBy: "black",
      result: null,
      resultText: "Black didn't reconnect in time",
    });
    expect(isAtLeastAsFresh(current, incoming)).toBe(false);
  });

  it("rejects a contradictory terminal outcome: abandoned by white vs abandoned by black", () => {
    const history = [m("e4", "fen1")];
    const current = state({ moveHistory: history, isGameOver: true, isAbandoned: true, abandonedBy: "white", result: null });
    const incoming = state({ moveHistory: history, isGameOver: true, isAbandoned: true, abandonedBy: "black", result: null });
    expect(isAtLeastAsFresh(current, incoming)).toBe(false);
  });

  it("rejects a 'finished' history that somehow grew more moves after it was already over", () => {
    const current = state({ moveHistory: [m("e4", "fen1")], isGameOver: true, result: "1/2-1/2", resultText: "Draw agreed" });
    const incoming = state({
      moveHistory: [m("e4", "fen1"), m("e5", "fen2")],
      isGameOver: true,
      result: "1/2-1/2",
      resultText: "Draw agreed",
    });
    expect(isAtLeastAsFresh(current, incoming)).toBe(false);
  });

  it("accepts an exact duplicate of a finished game (identical history and outcome)", () => {
    const history = [m("e4", "fen1")];
    const current = state({ moveHistory: history, isGameOver: true, result: "1-0", resultText: "Checkmate" });
    const incoming = state({ moveHistory: history, isGameOver: true, result: "1-0", resultText: "Checkmate" });
    expect(isAtLeastAsFresh(current, incoming)).toBe(true);
  });
});
