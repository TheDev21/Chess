// @vitest-environment jsdom
//
// Component-level tests for VsComputer's Stockfish-failure recovery (the
// engineError/Retry UI and its two underlying recovery paths). Mocks
// useStockfish entirely rather than the raw StockfishClient - useStockfish's
// own init/retryInit lifecycle (generation guard, in-flight guard, unmount
// invalidation) has its own dedicated tests in hooks/__tests__/useStockfish.test.ts.
// Move Coach is disabled via settings so its own independent useStockfish()
// call (see useMoveCoach.ts) never needs to be exercised here.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, act, waitFor } from "@testing-library/react";
import { VsComputer } from "../VsComputer";
import { DEFAULT_SETTINGS } from "../../../services/storage/settings";
import type { EngineStatus } from "../../../hooks/useStockfish";

vi.mock("../../../hooks/useContainerSize", () => ({
  useContainerSize: () => ({ ref: { current: null }, width: 360, height: 360 }),
}));

let initialEngineStatus: EngineStatus = "ready";
const evaluateMock = vi.fn();
const retryInitMock = vi.fn();
let latestSetStatus: ((s: EngineStatus) => void) | null = null;

vi.mock("../../../hooks/useStockfish", () => ({
  useStockfish: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [status, setStatus] = useState<EngineStatus>(initialEngineStatus);
    latestSetStatus = setStatus;
    return { status, error: status === "error" ? "mock engine failure" : null, evaluate: evaluateMock, retryInit: retryInitMock };
  },
}));

const settings = { ...DEFAULT_SETTINGS, moveCoachEnabled: false };

function startGame() {
  render(<VsComputer settings={settings} />);
  // Play as Black so Stockfish (White) must move first, immediately
  // exercising the opponent-move/failure path this file is testing.
  fireEvent.click(screen.getByText("black"));
  fireEvent.click(screen.getByText("Start Game"));
}

beforeEach(() => {
  evaluateMock.mockReset();
  retryInitMock.mockReset();
  initialEngineStatus = "ready";
  latestSetStatus = null;
  localStorage.setItem("chessguru:tutorialsSeen", JSON.stringify(["site-tour", "chessboard-basics"]));
  // retryInit's mock default mirrors the real hook's immediate "loading" flip.
  retryInitMock.mockImplementation(() => {
    latestSetStatus?.("loading");
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("VsComputer Stockfish failure recovery", () => {
  it("1. initial engine failure shows an error and Retry re-initializes, then a move succeeds", async () => {
    initialEngineStatus = "error";
    evaluateMock.mockResolvedValue({ cp: 20, mate: null, bestMoveUci: "e7e5", bestMoveSan: "e5", pvSan: ["e5"], depth: 4 });

    startGame();

    const retryButtons = await screen.findAllByText(/Retry/);
    expect(evaluateMock).not.toHaveBeenCalled(); // never reached evaluate while status was "error"

    fireEvent.click(retryButtons[0]);
    expect(retryInitMock).toHaveBeenCalledTimes(1);

    // Simulate the real hook's async recovery: status flips to "ready".
    await act(async () => {
      latestSetStatus?.("ready");
    });

    await waitFor(() => expect(evaluateMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(/Retry/)).toBeNull());
  });

  it("2. a null evaluation shows an error and Retry re-evaluates directly (no reinit, since status stayed ready)", async () => {
    evaluateMock.mockResolvedValueOnce(null);
    evaluateMock.mockResolvedValueOnce({ cp: 10, mate: null, bestMoveUci: "e7e5", bestMoveSan: "e5", pvSan: ["e5"], depth: 4 });

    startGame();

    await waitFor(() => expect(evaluateMock).toHaveBeenCalledTimes(1));
    const retryButtons = await screen.findAllByText(/Retry/);

    fireEvent.click(retryButtons[0]);
    expect(retryInitMock).not.toHaveBeenCalled(); // status never left "ready" - no reinit needed

    await waitFor(() => expect(evaluateMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(/Retry/)).toBeNull());
  });

  it("3a. two rapid Retry clicks during a null-evaluation failure trigger only one re-evaluation", async () => {
    let resolveSecondCall: (v: unknown) => void = () => {};
    evaluateMock.mockResolvedValueOnce(null);
    evaluateMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecondCall = resolve;
        }),
    );

    startGame();
    await waitFor(() => expect(evaluateMock).toHaveBeenCalledTimes(1));
    const [retryButton] = await screen.findAllByText(/Retry/);

    // Two rapid clicks on the SAME button reference, batched in one act()
    // so React treats them as nested/un-flushed-until-the-end (see 3b's
    // comment for why re-querying the DOM between clicks doesn't actually
    // test the race: the button disappears after the first click commits).
    act(() => {
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
    });

    expect(evaluateMock).toHaveBeenCalledTimes(2); // the retry call itself, only once

    await act(async () => {
      resolveSecondCall({ cp: 0, mate: null, bestMoveUci: "e7e5", bestMoveSan: "e5", pvSan: ["e5"], depth: 4 });
    });
    expect(evaluateMock).toHaveBeenCalledTimes(2); // still exactly 2 total - no duplicate third call
  });

  it("3b. two rapid Retry clicks during reinitialization do not start two opponent moves once the engine recovers", async () => {
    // How many times retryInit() itself is invoked is the hook's own
    // concern - useStockfish.test.ts proves its internal initInFlightRef
    // guard allows only one real reinit regardless of how many times
    // retryInit() is called. What VsComputer itself must guarantee is the
    // explicit safeguard: Retry can never start two opponent moves. This
    // test proves that end-to-end even if the mock below is invoked twice.
    initialEngineStatus = "error";
    evaluateMock.mockResolvedValue({ cp: 0, mate: null, bestMoveUci: "e7e5", bestMoveSan: "e5", pvSan: ["e5"], depth: 4 });

    startGame();
    const [retryButton] = await screen.findAllByText(/Retry/);

    act(() => {
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
    });

    // Simulate the engine recovering exactly once (what the real,
    // internally-guarded hook would do even after two retryInit calls).
    await act(async () => {
      latestSetStatus?.("ready");
    });

    await waitFor(() => expect(evaluateMock).toHaveBeenCalledTimes(1));
  });

  it("4. the normal path (no engine failure) is unaffected: a move is made with no error UI shown", async () => {
    evaluateMock.mockResolvedValue({ cp: 15, mate: null, bestMoveUci: "e7e5", bestMoveSan: "e5", pvSan: ["e5"], depth: 4 });

    startGame();

    await waitFor(() => expect(evaluateMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Retry/)).toBeNull();
    expect(screen.queryByText(/couldn't make a move/)).toBeNull();
  });
});
