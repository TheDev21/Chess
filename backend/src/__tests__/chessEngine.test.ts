import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { findBestMove } from "../engine/chessEngine";

describe("findBestMove", () => {
  it("finds mate in one for White (back-rank mate)", () => {
    // White to move, Rd8 is mate.
    const fen = "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1";
    const move = findBestMove(fen, 3);
    expect(move).not.toBeNull();

    const game = new Chess(fen);
    game.move(move!.san);
    expect(game.isCheckmate()).toBe(true);
  });

  it("captures a hanging queen when available", () => {
    // Black queen on h4 is undefended and capturable by the g3 pawn.
    const fen = "rnb1kbnr/pppp1ppp/8/4p3/7q/6P1/PPPPPP1P/RNBQKBNR w KQkq - 1 2";
    const move = findBestMove(fen, 2);
    expect(move).not.toBeNull();
    expect(move!.from).toBe("g3");
    expect(move!.to).toBe("h4");
  });

  it("returns null when there are no legal moves (stalemate/checkmate position)", () => {
    // Black to move, stalemated.
    const fen = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1";
    const move = findBestMove(fen, 3);
    expect(move).toBeNull();
  });

  it("falls back to a shallower completed depth and still returns a legal move when the time budget is tight", () => {
    // The opening position has no captures, so pruning is weak and depth 6
    // would take far too long - force an unrealistically small time budget
    // so at least one iterative-deepening pass times out mid-search, and
    // confirm the engine still returns a legal move from an earlier depth
    // (regression test: an aborted deep search used to leave the internal
    // board in a corrupted state that produced an "invalid move" crash).
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const move = findBestMove(fen, 6, 50);
    expect(move).not.toBeNull();
    expect(move!.depthReached).toBeGreaterThanOrEqual(1);
    expect(move!.depthReached).toBeLessThan(6);

    const game = new Chess(fen);
    const legal = game.moves({ verbose: true }).some((m) => m.from === move!.from && m.to === move!.to);
    expect(legal).toBe(true);
  });

  it("only ever returns legal moves across a variety of positions", () => {
    const fens = [
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    ];
    for (const fen of fens) {
      const game = new Chess(fen);
      const move = findBestMove(fen, 2);
      expect(move).not.toBeNull();
      const legal = game.moves({ verbose: true }).some((m) => m.from === move!.from && m.to === move!.to);
      expect(legal).toBe(true);
    }
  });
});
