import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { adjacentSquare, buildMoveAnnouncement, buildSquareAriaLabel, gridPosition, legalMovesFrom, pieceLabel, promotionAnnouncement } from "../keyboardNav";

const START_FEN = new Chess().fen();

describe("pieceLabel", () => {
  it("names the piece and color on an occupied square", () => {
    expect(pieceLabel(START_FEN, "e2")).toBe("White pawn");
    expect(pieceLabel(START_FEN, "e7")).toBe("Black pawn");
    expect(pieceLabel(START_FEN, "e1")).toBe("White king");
    expect(pieceLabel(START_FEN, "d8")).toBe("Black queen");
  });

  it("reports an empty square as empty", () => {
    expect(pieceLabel(START_FEN, "e4")).toBe("empty");
  });

  it("falls back to empty on an invalid FEN instead of throwing", () => {
    expect(pieceLabel("not a fen", "e4")).toBe("empty");
  });
});

describe("legalMovesFrom", () => {
  it("matches chess.js's own legal moves for a square", () => {
    const game = new Chess(START_FEN);
    const expected = game.moves({ square: "e2", verbose: true }).map((m) => m.to);
    expect(legalMovesFrom(START_FEN, "e2").sort()).toEqual(expected.sort());
    expect(legalMovesFrom(START_FEN, "e2").sort()).toEqual(["e3", "e4"]);
  });

  it("returns no moves for an empty square", () => {
    expect(legalMovesFrom(START_FEN, "e4")).toEqual([]);
  });

  it("returns no moves on an invalid FEN instead of throwing", () => {
    expect(legalMovesFrom("not a fen", "e2")).toEqual([]);
  });

  it("deduplicates a promoting pawn's one-move-per-promotion-choice into a single destination", () => {
    const promotionFen = "k7/4P3/8/8/8/8/8/4K3 w - - 0 1";
    const game = new Chess(promotionFen);
    expect(game.moves({ square: "e7", verbose: true })).toHaveLength(4); // q, r, b, n - sanity-check the premise
    expect(legalMovesFrom(promotionFen, "e7")).toEqual(["e8"]);
  });
});

describe("adjacentSquare", () => {
  it("moves up the board for White regardless of visual column/row intuition", () => {
    expect(adjacentSquare("e4", "ArrowUp", "white")).toBe("e5");
    expect(adjacentSquare("e4", "ArrowDown", "white")).toBe("e3");
    expect(adjacentSquare("e4", "ArrowLeft", "white")).toBe("d4");
    expect(adjacentSquare("e4", "ArrowRight", "white")).toBe("f4");
  });

  it("flips direction for Black so 'visual up' still means 'away from the bottom'", () => {
    expect(adjacentSquare("e4", "ArrowUp", "black")).toBe("e3");
    expect(adjacentSquare("e4", "ArrowDown", "black")).toBe("e5");
    expect(adjacentSquare("e4", "ArrowLeft", "black")).toBe("f4");
    expect(adjacentSquare("e4", "ArrowRight", "black")).toBe("d4");
  });

  it("returns null at the edge of the board rather than wrapping", () => {
    expect(adjacentSquare("a1", "ArrowLeft", "white")).toBeNull();
    expect(adjacentSquare("a1", "ArrowDown", "white")).toBeNull();
    expect(adjacentSquare("h8", "ArrowRight", "white")).toBeNull();
    expect(adjacentSquare("h8", "ArrowUp", "white")).toBeNull();
  });

  it("returns null for a non-arrow key", () => {
    expect(adjacentSquare("e4", "Enter", "white")).toBeNull();
    expect(adjacentSquare("e4", " ", "white")).toBeNull();
  });
});

describe("gridPosition", () => {
  it("places a1 at the bottom-left and h8 at the top-right for White", () => {
    expect(gridPosition("a1", "white")).toEqual({ row: 8, col: 1 });
    expect(gridPosition("h8", "white")).toEqual({ row: 1, col: 8 });
    expect(gridPosition("a8", "white")).toEqual({ row: 1, col: 1 });
    expect(gridPosition("h1", "white")).toEqual({ row: 8, col: 8 });
  });

  it("flips to h1 top-left / a8 bottom-right for Black (the board rotated 180 degrees)", () => {
    expect(gridPosition("h1", "black")).toEqual({ row: 1, col: 1 });
    expect(gridPosition("a1", "black")).toEqual({ row: 1, col: 8 });
    expect(gridPosition("h8", "black")).toEqual({ row: 8, col: 1 });
    expect(gridPosition("a8", "black")).toEqual({ row: 8, col: 8 });
  });
});

describe("buildSquareAriaLabel", () => {
  it("describes coordinate and occupant with no extra state", () => {
    expect(buildSquareAriaLabel(START_FEN, "e2", { selected: false, legalMove: false })).toBe("e2, White pawn");
  });

  it("appends selected and legal-move state when present", () => {
    expect(buildSquareAriaLabel(START_FEN, "e2", { selected: true, legalMove: false })).toBe("e2, White pawn, selected");
    expect(buildSquareAriaLabel(START_FEN, "e4", { selected: false, legalMove: true })).toBe("e4, empty, legal move");
    expect(buildSquareAriaLabel(START_FEN, "e4", { selected: true, legalMove: true })).toBe("e4, empty, selected, legal move");
  });
});

describe("buildMoveAnnouncement", () => {
  it("lists legal destinations when a square with moves is selected", () => {
    const msg = buildMoveAnnouncement({ kind: "selected", square: "e2", fen: START_FEN, legalTargets: ["e3", "e4"] });
    expect(msg).toBe("e2 selected, White pawn. Legal moves: e3, e4.");
  });

  it("says so when the selected square has no legal moves", () => {
    const msg = buildMoveAnnouncement({ kind: "selected", square: "e4", fen: START_FEN, legalTargets: [] });
    expect(msg).toBe("e4 selected, empty. No legal moves.");
  });

  it("announces deselection", () => {
    expect(buildMoveAnnouncement({ kind: "deselected", square: "e2" })).toBe("e2 deselected.");
  });

  it("announces a pending promotion without naming a result yet", () => {
    expect(buildMoveAnnouncement({ kind: "promotion-pending" })).toBe("Promotion. Choose a piece: queen, rook, bishop, or knight.");
  });

  it("names the moved piece using the position before the move", () => {
    const msg = buildMoveAnnouncement({ kind: "moved", from: "e2", to: "e4", fenBeforeMove: START_FEN });
    expect(msg).toBe("Moved White pawn from e2 to e4.");
  });

  it("announces an illegal move attempt and names the newly selected square", () => {
    const msg = buildMoveAnnouncement({ kind: "illegal", square: "e7", fen: START_FEN });
    expect(msg).toBe("Illegal move. e7 selected, Black pawn.");
  });
});

describe("promotionAnnouncement", () => {
  it("names the chosen piece and the completed move", () => {
    expect(promotionAnnouncement("q", "e7", "e8")).toBe("Promoted to queen. Moved e7 to e8.");
    expect(promotionAnnouncement("n", "e7", "e8")).toBe("Promoted to knight. Moved e7 to e8.");
  });
});
