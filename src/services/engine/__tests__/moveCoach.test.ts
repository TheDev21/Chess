import { describe, expect, it } from "vitest";
import { classifyMove } from "../moveCoach";
import type { EngineEvaluation } from "../../../types/chess";

// All cp values below are White-perspective, matching EngineEvaluation's
// contract (stockfishClient.ts normalizes Stockfish's side-to-move-relative
// score to White's perspective before it ever reaches this module).
function evalFor(partial: Partial<EngineEvaluation>): EngineEvaluation {
  return { cp: 0, mate: null, bestMoveUci: "e2e4", bestMoveSan: "e4", pvSan: [], depth: 12, ...partial };
}

describe("classifyMove", () => {
  it("labels the engine's own top move as best", () => {
    const before = evalFor({ cp: 20, bestMoveUci: "e2e4" });
    const after = evalFor({ cp: 25 });
    const result = classifyMove("white", "e2e4", before, after);
    expect(result.classification).toBe("best");
    expect(result.centipawnLoss).toBe(0);
  });

  it("flags a move that throws a winning position into a losing one as a blunder", () => {
    const before = evalFor({ cp: 500, bestMoveUci: "d1d5" }); // White +500
    const after = evalFor({ cp: -300 }); // White's own move turned it into -300 for White
    const result = classifyMove("white", "a1a2", before, after);
    expect(result.classification).toBe("blunder");
  });

  it("does not call a move a blunder just because the position was already losing", () => {
    const before = evalFor({ cp: -700, bestMoveUci: "d1d5" }); // White already losing badly
    const after = evalFor({ cp: -780 }); // a further small slip, not a fresh disaster
    const result = classifyMove("white", "a1a2", before, after);
    expect(result.classification).not.toBe("blunder");
  });

  it("does not downgrade a move that stays clearly winning to a blunder from a large nominal cp gap alone", () => {
    const before = evalFor({ cp: 900, bestMoveUci: "d1d5" });
    const after = evalFor({ cp: 450 }); // still clearly winning for White
    const result = classifyMove("white", "a1a2", before, after);
    expect(["best", "good", "inaccuracy"]).toContain(result.classification);
  });

  it("treats throwing away a forced mate as a blunder", () => {
    const before = evalFor({ cp: null, mate: 3, bestMoveUci: "d1h5" });
    const after = evalFor({ cp: -350, mate: null });
    const result = classifyMove("white", "a1a2", before, after);
    expect(result.classification).toBe("blunder");
  });

  it("computes centipawn loss from the mover's own perspective for Black", () => {
    const before = evalFor({ cp: -300, bestMoveUci: "e7e5" }); // Black winning by 300
    const after = evalFor({ cp: 250 }); // swung to White +250: a 550-point loss for Black
    const result = classifyMove("black", "a7a6", before, after);
    expect(result.centipawnLoss).toBeGreaterThan(400);
    expect(result.classification).toBe("blunder");
  });
});
