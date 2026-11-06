import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { CHAPTERS } from "../lessonData";

// Guards against exactly the kind of mistake that's easy to make when
// hand-writing FEN strings (e.g. a missing '/'-delimited rank, or an
// isGoalMove that never actually matches any legal move): every lesson's
// positions must be valid, and every "move" challenge/tryIt must have at
// least one legal move available for the square it names. For a
// "move" challenge specifically, isGoalMove must be satisfiable by some
// legal move from that position - otherwise the lesson is unsolvable.

const SQUARE_RE = /^[a-h][1-8]$/;

describe("lessonData", () => {
  for (const chapter of CHAPTERS) {
    for (const lesson of chapter.lessons) {
      const label = `${chapter.id}/${lesson.id}`;

      it(`${label}: every watch step has a valid FEN`, () => {
        for (const step of lesson.watch) {
          expect(() => new Chess(step.fen)).not.toThrow();
          for (const sq of step.highlightSquares ?? []) {
            expect(sq).toMatch(SQUARE_RE);
          }
        }
      });

      it(`${label}: tryIt is valid and reachable`, () => {
        const chess = new Chess(lesson.tryIt.fen);
        if (lesson.tryIt.kind === "move") {
          expect(lesson.tryIt.pieceSquare).toMatch(SQUARE_RE);
          const moves = chess.moves({ square: lesson.tryIt.pieceSquare as never, verbose: true });
          expect(moves.length).toBeGreaterThan(0);
        } else {
          expect(lesson.tryIt.targetSquare).toMatch(SQUARE_RE);
        }
      });

      it(`${label}: challenge is valid and solvable`, () => {
        const chess = new Chess(lesson.challenge.fen);
        if (lesson.challenge.kind === "move") {
          const moves = chess.moves({ verbose: true });
          expect(moves.length).toBeGreaterThan(0);
          const solvable = moves.some((move) => {
            const probe = new Chess(lesson.challenge.fen);
            const made = probe.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" });
            return made ? lesson.challenge.isGoalMove?.(probe, made) : false;
          });
          expect(solvable).toBe(true);
        } else {
          expect(lesson.challenge.targetSquare).toMatch(SQUARE_RE);
        }
      });
    }
  }

  it("every lesson id is unique within its chapter", () => {
    for (const chapter of CHAPTERS) {
      const ids = chapter.lessons.map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("every chapter id is unique", () => {
    const ids = CHAPTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
