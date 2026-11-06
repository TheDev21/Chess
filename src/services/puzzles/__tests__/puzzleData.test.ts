import { describe, it, expect } from "vitest";
import { Chess, type Square } from "chess.js";
import puzzlesData from "../../../../public/puzzles/starter-set.json";

// Reads the actual static JSON file the app fetches at runtime, so this test
// validates the real shipped data, not a copy of it. Guards against exactly
// the kind of mistakes caught during review for this puzzle set: an illegal
// starting position, an illegal move in the solution sequence, or a solution
// that doesn't actually play out as claimed.

interface Puzzle {
  id: string;
  fen: string;
  solution: string[];
  theme: string;
  rating: number;
}

const puzzles: Puzzle[] = puzzlesData as Puzzle[];

function findPuzzle(id: string): Puzzle {
  const puzzle = puzzles.find((p) => p.id === id);
  if (!puzzle) throw new Error(`No puzzle with id "${id}" found in starter-set.json`);
  return puzzle;
}

function playFirstMove(fen: string, uci: string) {
  const chess = new Chess(fen);
  const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: "q" });
  return { chess, move };
}

/** Finds the square of the single black piece of the given type (there is exactly one in every pin/skewer puzzle below, besides the king). */
function findBlackPieceSquare(fen: string, type: "n" | "r" | "q" | "b"): Square {
  const chess = new Chess(fen);
  const board = chess.board();
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.color === "b" && cell.type === type) return cell.square;
    }
  }
  throw new Error(`No black ${type} found in ${fen}`);
}

describe("starter-set.json", () => {
  it("has unique puzzle ids", () => {
    const ids = puzzles.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const puzzle of puzzles) {
    it(`${puzzle.id} (${puzzle.theme}): has a legal starting position and a legal, playable solution`, () => {
      const chess = new Chess(puzzle.fen);
      expect(puzzle.solution.length).toBeGreaterThan(0);
      for (const uci of puzzle.solution) {
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
        const move = chess.move({ from, to, promotion: (promotion as "q" | "r" | "b" | "n" | undefined) || "q" });
        expect(move, `illegal move ${uci} in ${puzzle.id} from ${chess.fen()}`).toBeTruthy();
      }
    });
  }

  describe("tactics puzzles: the stated tactic actually holds", () => {
    it("t-fork-1: Nf6+ attacks both the king and the queen", () => {
      const p = findPuzzle("t-fork-1");
      const { chess } = playFirstMove(p.fen, p.solution[0]);
      expect(chess.inCheck()).toBe(true);
      expect(chess.isAttacked(findBlackPieceSquare(p.fen, "q"), "w")).toBe(true);
    });

    it("t-fork-2: Nc7 attacks both rooks", () => {
      const p = findPuzzle("t-fork-2");
      const { chess } = playFirstMove(p.fen, p.solution[0]);
      const rookSquares = new Chess(p.fen)
        .board()
        .flat()
        .filter((cell) => cell && cell.color === "b" && cell.type === "r")
        .map((cell) => cell!.square);
      expect(rookSquares).toHaveLength(2);
      for (const sq of rookSquares) expect(chess.isAttacked(sq, "w")).toBe(true);
    });

    it("t-fork-3: Qe5+ attacks both the king and the knight", () => {
      const p = findPuzzle("t-fork-3");
      const { chess } = playFirstMove(p.fen, p.solution[0]);
      expect(chess.inCheck()).toBe(true);
      expect(chess.isAttacked(findBlackPieceSquare(p.fen, "n"), "w")).toBe(true);
    });

    it("t-fork-4: d5 attacks both knights", () => {
      const p = findPuzzle("t-fork-4");
      const { chess } = playFirstMove(p.fen, p.solution[0]);
      const knightSquares = new Chess(p.fen)
        .board()
        .flat()
        .filter((cell) => cell && cell.color === "b" && cell.type === "n")
        .map((cell) => cell!.square);
      expect(knightSquares).toHaveLength(2);
      for (const sq of knightSquares) expect(chess.isAttacked(sq, "w")).toBe(true);
    });

    it("t-pin-1/2/3: the pinned piece has zero legal moves (absolute pin)", () => {
      for (const [id, pinnedType] of [
        ["t-pin-1", "n"],
        ["t-pin-2", "n"],
        ["t-pin-3", "r"],
      ] as const) {
        const p = findPuzzle(id);
        const blackToMoveFen = p.fen.replace(" w ", " b ");
        const square = findBlackPieceSquare(blackToMoveFen, pinnedType);
        const chess = new Chess(blackToMoveFen);
        expect(chess.moves({ square, verbose: true })).toHaveLength(0);
      }
    });

    it("t-pin-4: relative pin - the knight has legal moves, but every one exposes the queen, and none gives check", () => {
      const p = findPuzzle("t-pin-4");
      const blackToMoveFen = p.fen.replace(" w ", " b ");
      const knightSquare = findBlackPieceSquare(blackToMoveFen, "n");
      const queenSquare = findBlackPieceSquare(blackToMoveFen, "q");
      const chess = new Chess(blackToMoveFen);
      const moves = chess.moves({ square: knightSquare, verbose: true });
      expect(moves.length).toBeGreaterThan(0);
      for (const move of moves) {
        const probe = new Chess(chess.fen());
        probe.move(move);
        expect(probe.inCheck(), `${move.san} must not give check`).toBe(false);
        expect(probe.isAttacked(queenSquare, "w"), `${move.san} must still expose the queen`).toBe(true);
      }
    });

    it("t-skewer puzzles: the check delivered, and the back piece is only shielded by the king", () => {
      for (const [id, backPieceType] of [
        ["t-skewer-1", "q"],
        ["t-skewer-2", "r"],
        ["t-skewer-3", "r"],
        ["t-skewer-4", "b"],
      ] as const) {
        const p = findPuzzle(id);
        const backSquare = findBlackPieceSquare(p.fen, backPieceType);
        const uci = p.solution[0];
        const { chess } = playFirstMove(p.fen, uci);
        expect(chess.inCheck()).toBe(true);
        // every legal reply must be a king move, and the follow-up capture of
        // the back piece must be legal and never recapturable
        for (const reply of chess.moves({ verbose: true })) {
          expect(reply.piece).toBe("k");
          const probe = new Chess(chess.fen());
          probe.move(reply);
          const capture = probe.move({ from: uci.slice(2, 4), to: backSquare, promotion: "q" });
          expect(capture, `follow-up capture of ${backSquare} must be legal after ${reply.san}`).toBeTruthy();
          expect(probe.isAttacked(backSquare, "b"), `the capturing piece on ${backSquare} must not be recapturable`).toBe(false);
        }
      }
    });
  });
});
