// @vitest-environment jsdom
//
// Component-level tests for ChessBoard, complementing keyboardNav.test.ts's
// pure-helper tests with assertions on the actual rendered DOM and callback
// behavior. jsdom has no ResizeObserver (used by useContainerSize) and no
// real native drag-and-drop (react-dnd's HTML5Backend needs a real browser
// for that) - so useContainerSize is mocked below, and drag-and-drop is
// deliberately out of scope here; it remains covered by Phase 7's
// real-browser Playwright verification, not by these tests.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ChessBoard } from "../ChessBoard";

vi.mock("../../../hooks/useContainerSize", () => ({
  useContainerSize: () => ({ ref: { current: null }, width: 360, height: 360 }),
}));

// This project runs Vitest without `globals: true`, so @testing-library/react's
// automatic afterEach-based cleanup doesn't register - each render() would
// otherwise stack onto the previous test's leftover DOM. Done explicitly here.
afterEach(cleanup);

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** The square's role="gridcell" element, found by its aria-label's leading coordinate ("e2, White pawn" etc). */
function getSquare(square: string): HTMLElement {
  return screen.getByRole("gridcell", { name: new RegExp(`^${square},`) });
}

function liveMessage(): string {
  return screen.getByRole("status").textContent ?? "";
}

describe("ChessBoard rendering", () => {
  it("mounts without throwing", () => {
    expect(() => render(<ChessBoard fen={START_FEN} onMove={() => true} orientation="white" />)).not.toThrow();
  });

  it("renders exactly 64 squares as an accessible grid", () => {
    render(<ChessBoard fen={START_FEN} onMove={() => true} orientation="white" />);
    expect(screen.getAllByRole("gridcell")).toHaveLength(64);
    expect(screen.getByRole("grid")).toBeTruthy();
  });

  it("labels the board by orientation", () => {
    const { rerender } = render(<ChessBoard fen={START_FEN} onMove={() => true} orientation="white" />);
    expect(screen.getByRole("grid").getAttribute("aria-label")).toMatch(/White at the bottom/);
    rerender(<ChessBoard fen={START_FEN} onMove={() => true} orientation="black" />);
    expect(screen.getByRole("grid").getAttribute("aria-label")).toMatch(/Black at the bottom/);
  });

  it("gives occupied and empty squares the right accessible labels", () => {
    render(<ChessBoard fen={START_FEN} onMove={() => true} orientation="white" />);
    expect(getSquare("e2").getAttribute("aria-label")).toBe("e2, White pawn");
    expect(getSquare("e7").getAttribute("aria-label")).toBe("e7, Black pawn");
    expect(getSquare("e4").getAttribute("aria-label")).toBe("e4, empty");
  });
});

describe("ChessBoard selection and moves (click)", () => {
  it("selecting a square announces it and its legal moves", () => {
    render(<ChessBoard fen={START_FEN} onMove={() => true} orientation="white" />);
    fireEvent.click(getSquare("e2"));
    expect(getSquare("e2").getAttribute("aria-selected")).toBe("true");
    expect(getSquare("e2").getAttribute("aria-label")).toBe("e2, White pawn, selected");
    expect(getSquare("e4").getAttribute("aria-label")).toBe("e4, empty, legal move");
    expect(liveMessage()).toBe("e2 selected, White pawn. Legal moves: e3, e4.");
  });

  it("completing a legal move calls onMove with the right squares and clears the selection", () => {
    const onMove = vi.fn().mockReturnValue(true);
    render(<ChessBoard fen={START_FEN} onMove={onMove} orientation="white" />);
    fireEvent.click(getSquare("e2"));
    fireEvent.click(getSquare("e4"));
    expect(onMove).toHaveBeenCalledWith("e2", "e4");
    expect(getSquare("e2").getAttribute("aria-selected")).toBe("false");
    expect(liveMessage()).toBe("Moved White pawn from e2 to e4.");
  });

  it("clicking the selected square again deselects it without calling onMove", () => {
    const onMove = vi.fn();
    render(<ChessBoard fen={START_FEN} onMove={onMove} orientation="white" />);
    fireEvent.click(getSquare("e2"));
    fireEvent.click(getSquare("e2"));
    expect(onMove).not.toHaveBeenCalled();
    expect(getSquare("e2").getAttribute("aria-selected")).toBe("false");
    expect(liveMessage()).toBe("e2 deselected.");
  });
});

describe("ChessBoard illegal moves", () => {
  // attemptMove (ChessBoard.tsx) calls onMove(from, to) directly for a
  // non-promotion move and returns exactly what onMove returns. When onMove
  // returns false, handleSquareClick's contract is: announce "Illegal
  // move", and select the square that was just clicked (not the original
  // piece, and not nothing) - confirmed by reading the source, not assumed.
  it("selects the newly clicked square and announces the rejection when onMove reports the move illegal", () => {
    const onMove = vi.fn().mockReturnValue(false);
    render(<ChessBoard fen={START_FEN} onMove={onMove} orientation="white" />);
    fireEvent.click(getSquare("e2"));
    fireEvent.click(getSquare("e5")); // not a legal pawn destination, but any square not already selected reaches the same onMove/false path
    expect(onMove).toHaveBeenCalledWith("e2", "e5");
    expect(getSquare("e2").getAttribute("aria-selected")).toBe("false");
    expect(getSquare("e5").getAttribute("aria-selected")).toBe("true");
    expect(liveMessage()).toBe("Illegal move. e5 selected, empty.");
  });
});

describe("ChessBoard keyboard navigation", () => {
  it("starts with exactly one square tabbable, at a1 for White orientation", () => {
    render(<ChessBoard fen={START_FEN} onMove={() => true} orientation="white" />);
    const tabbable = screen.getAllByRole("gridcell").filter((el) => el.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(getSquare("a1"));
  });

  it("starts at h8 for Black orientation", () => {
    render(<ChessBoard fen={START_FEN} onMove={() => true} orientation="black" />);
    const tabbable = screen.getAllByRole("gridcell").filter((el) => el.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(getSquare("h8"));
  });

  it("ArrowRight/ArrowUp move the single tabbable square without selecting anything", () => {
    const onMove = vi.fn();
    render(<ChessBoard fen={START_FEN} onMove={onMove} orientation="white" />);
    fireEvent.keyDown(getSquare("a1"), { key: "ArrowRight" });
    fireEvent.keyDown(getSquare("b1"), { key: "ArrowUp" });
    expect(getSquare("b2").getAttribute("tabindex")).toBe("0");
    expect(getSquare("a1").getAttribute("tabindex")).toBe("-1");
    // Moving focus must never itself select a piece or call onMove.
    expect(getSquare("b2").getAttribute("aria-selected")).toBe("false");
    expect(onMove).not.toHaveBeenCalled();
    expect(liveMessage()).toBe("");
  });

  it("flips arrow direction for Black orientation (visual up still means away from the bottom)", () => {
    const onMove = vi.fn();
    render(<ChessBoard fen={START_FEN} onMove={onMove} orientation="black" />);
    // h8 is Black's bottom-left corner (keyboardNav's gridPosition: row=rank,
    // so h8 -> row 8, the bottom). ArrowUp should move one row up the visual
    // board to h7 - the opposite file/rank delta from White's ArrowUp - not
    // wrap, not go to h8's chess-board-adjacent square by White's convention.
    fireEvent.keyDown(getSquare("h8"), { key: "ArrowUp" });
    expect(getSquare("h7").getAttribute("tabindex")).toBe("0");
    expect(getSquare("h8").getAttribute("tabindex")).toBe("-1");
    // h1 is Black's visual top-left corner (row 1) - ArrowUp there has
    // nowhere further to go and must leave focus in place.
    fireEvent.keyDown(getSquare("h7"), { key: "ArrowDown" }); // back to h8
    for (let i = 0; i < 7; i++) fireEvent.keyDown(getSquare(`h${8 - i}`), { key: "ArrowUp" }); // h8 -> h1
    expect(getSquare("h1").getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(getSquare("h1"), { key: "ArrowUp" });
    expect(getSquare("h1").getAttribute("tabindex")).toBe("0");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("Enter selects a square and a second Enter on a legal target completes the move", () => {
    const onMove = vi.fn().mockReturnValue(true);
    render(<ChessBoard fen={START_FEN} onMove={onMove} orientation="white" />);
    fireEvent.keyDown(getSquare("a1"), { key: "ArrowRight" }); // a1 -> b1
    fireEvent.keyDown(getSquare("b1"), { key: "ArrowRight" }); // b1 -> c1
    fireEvent.keyDown(getSquare("c1"), { key: "ArrowRight" }); // c1 -> d1
    fireEvent.keyDown(getSquare("d1"), { key: "ArrowRight" }); // d1 -> e1
    fireEvent.keyDown(getSquare("e1"), { key: "ArrowUp" }); // e1 -> e2 (White pawn)
    fireEvent.keyDown(getSquare("e2"), { key: "Enter" });
    expect(liveMessage()).toBe("e2 selected, White pawn. Legal moves: e3, e4.");
    fireEvent.keyDown(getSquare("e2"), { key: "ArrowUp" }); // e2 -> e3
    fireEvent.keyDown(getSquare("e3"), { key: " " }); // Space activates, same as Enter
    expect(onMove).toHaveBeenCalledWith("e2", "e3");
    expect(liveMessage()).toBe("Moved White pawn from e2 to e3.");
  });
});

describe("ChessBoard promotion", () => {
  const PROMOTION_FEN = "k7/4P3/8/8/8/8/8/4K3 w - - 0 1";

  it("shows the promotion picker when a pawn move reaches the back rank, without calling onMove yet", () => {
    const onMove = vi.fn();
    render(<ChessBoard fen={PROMOTION_FEN} onMove={onMove} orientation="white" />);
    fireEvent.click(getSquare("e7"));
    fireEvent.click(getSquare("e8"));
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Promote to q" })).toBeTruthy();
    expect(liveMessage()).toBe("Promotion. Choose a piece: queen, rook, bishop, or knight.");
  });

  it("choosing a promotion piece calls onMove with it and announces the completed move", () => {
    const onMove = vi.fn().mockReturnValue(true);
    render(<ChessBoard fen={PROMOTION_FEN} onMove={onMove} orientation="white" />);
    fireEvent.click(getSquare("e7"));
    fireEvent.click(getSquare("e8"));
    fireEvent.click(screen.getByRole("button", { name: "Promote to n" }));
    expect(onMove).toHaveBeenCalledWith("e7", "e8", "n");
    expect(liveMessage()).toBe("Promoted to knight. Moved e7 to e8.");
    expect(screen.queryByRole("button", { name: /Promote to/ })).toBeNull();
  });

  it("the promotion picker buttons are native, keyboard-focusable buttons", () => {
    render(<ChessBoard fen={PROMOTION_FEN} onMove={() => true} orientation="white" />);
    fireEvent.click(getSquare("e7"));
    fireEvent.click(getSquare("e8"));
    const queenButton = screen.getByRole("button", { name: "Promote to q" }) as HTMLButtonElement;
    expect(queenButton.tagName).toBe("BUTTON");
    expect(queenButton.tabIndex).toBe(0); // native <button> default - no explicit tabindex override
  });
});

describe("ChessBoard restrictToSquare", () => {
  it("does not select a square other than the restricted one", () => {
    const onSquareTap = vi.fn();
    render(<ChessBoard fen={START_FEN} onMove={() => true} orientation="white" restrictToSquare="e2" onSquareTap={onSquareTap} />);
    fireEvent.click(getSquare("a1"));
    expect(onSquareTap).toHaveBeenCalledWith("a1"); // onSquareTap fires regardless - used by the coordinates lesson
    expect(getSquare("a1").getAttribute("aria-selected")).toBe("false");
    expect(liveMessage()).toBe("");
  });

  it("allows selecting and moving the restricted square normally", () => {
    const onMove = vi.fn().mockReturnValue(true);
    render(<ChessBoard fen={START_FEN} onMove={onMove} orientation="white" restrictToSquare="e2" />);
    fireEvent.click(getSquare("e2"));
    expect(getSquare("e2").getAttribute("aria-selected")).toBe("true");
    fireEvent.click(getSquare("e4"));
    expect(onMove).toHaveBeenCalledWith("e2", "e4");
  });

  it("behaves identically via keyboard: Enter on a non-restricted square is a no-op", () => {
    const onMove = vi.fn();
    render(<ChessBoard fen={START_FEN} onMove={onMove} orientation="white" restrictToSquare="e2" />);
    fireEvent.keyDown(getSquare("a1"), { key: "Enter" });
    expect(onMove).not.toHaveBeenCalled();
    expect(getSquare("a1").getAttribute("aria-selected")).toBe("false");
    expect(liveMessage()).toBe("");
  });
});
