// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChessGame } from "../useChessGame";

describe("useChessGame resign", () => {
  it("Test A: resign(playerColor) during the opponent's turn records a loss for that player, not a win", () => {
    const { result } = renderHook(() => useChessGame());

    // White makes a move, so it becomes Black's turn (simulating the
    // VsComputer window where Stockfish is "thinking" as Black).
    act(() => {
      result.current.makeMove("e2", "e4");
    });
    expect(result.current.turn).toBe("black");

    // The White player resigns, passed explicitly as in VsComputer's fix.
    act(() => {
      result.current.resign("white");
    });

    expect(result.current.isOver).toBe(true);
    expect(result.current.result).not.toBeNull();
    expect(result.current.result!.result).toBe("0-1"); // White loses.
    expect(result.current.result!.reason).toBe("White resigned");
  });

  it("Test B: resign(playerColor) during the player's own turn still records a loss for that player", () => {
    const { result } = renderHook(() => useChessGame());

    // No moves played yet - it is White's turn.
    expect(result.current.turn).toBe("white");

    act(() => {
      result.current.resign("white");
    });

    expect(result.current.isOver).toBe(true);
    expect(result.current.result).not.toBeNull();
    expect(result.current.result!.result).toBe("0-1"); // White loses.
    expect(result.current.result!.reason).toBe("White resigned");
  });

  it("Test C: no-argument resign() preserves PassAndPlay's existing behavior (resigns whoever's turn it currently is)", () => {
    const { result } = renderHook(() => useChessGame());

    // White moves, so it becomes Black's turn.
    act(() => {
      result.current.makeMove("e2", "e4");
    });
    expect(result.current.turn).toBe("black");

    // Call resign with no argument, exactly as PassAndPlay.tsx does.
    act(() => {
      result.current.resign();
    });

    expect(result.current.isOver).toBe(true);
    expect(result.current.result).not.toBeNull();
    // Unchanged default behavior: resigns whoever is currently on move (Black).
    expect(result.current.result!.result).toBe("1-0"); // Black loses, White wins.
    expect(result.current.result!.reason).toBe("Black resigned");
  });
});
