import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { replayGame } from "../replayGame";

// These fixtures exercise exactly what full-history replay adds over a
// FEN-only reconstruction: checkmate (reachable from a FEN snapshot too,
// included as a baseline sanity check) and threefold repetition (NOT
// reachable from a FEN snapshot - this is the specific gap the replay
// approach fixes). Stalemate/insufficient-material/fifty-move detection
// are chess.js's own responsibility once a position is reached, and are
// not independently re-verified here - only the "did replaying SAN moves
// get us to the right position with the right history-dependent flags"
// logic that this module adds is in scope.

describe("replayGame", () => {
  it("replays a non-terminal game to the correct position", () => {
    const moveHistory = [{ san: "e4" }, { san: "e5" }];
    const expected = new Chess();
    expected.move("e4");
    expected.move("e5");

    const result = replayGame(moveHistory);
    expect(result).not.toBeNull();
    expect(result!.fen).toBe(expected.fen());
    expect(result!.isGameOver).toBe(false);
  });

  it("detects checkmate (Fool's Mate) from the full move history", () => {
    const moveHistory = [{ san: "f3" }, { san: "e5" }, { san: "g4" }, { san: "Qh4#" }];
    const result = replayGame(moveHistory);
    expect(result).not.toBeNull();
    expect(result!.isGameOver).toBe(true);
    expect(result!.isCheckmate).toBe(true);
    expect(result!.turn).toBe("w"); // white is the side to move, and is mated
  });

  it("detects threefold repetition, which a FEN-only reconstruction cannot see", () => {
    const moveHistory = [
      { san: "Nf3" },
      { san: "Nf6" },
      { san: "Ng1" },
      { san: "Ng8" },
      { san: "Nf3" },
      { san: "Nf6" },
      { san: "Ng1" },
      { san: "Ng8" },
    ];
    const result = replayGame(moveHistory);
    expect(result).not.toBeNull();
    expect(result!.isDraw).toBe(true);
    expect(result!.isGameOver).toBe(true);
    expect(result!.isCheckmate).toBe(false);

    // Confirm the premise: reconstructing from the final FEN alone does NOT
    // see the repetition, since it has no move history to count against -
    // this is exactly the bug full-history replay exists to avoid.
    const fenOnly = new Chess(result!.fen);
    expect(fenOnly.isThreefoldRepetition()).toBe(false);
  });

  it("fails safe (returns null) on a corrupt/illegal move history", () => {
    const moveHistory = [{ san: "Qxh8" }]; // illegal as a first move
    expect(replayGame(moveHistory)).toBeNull();
  });

  it("fails safe (returns null) on a history that is illegal partway through", () => {
    const moveHistory = [{ san: "e4" }, { san: "e5" }, { san: "Nf6" }]; // Nf6 isn't legal for white here
    expect(replayGame(moveHistory)).toBeNull();
  });
});
