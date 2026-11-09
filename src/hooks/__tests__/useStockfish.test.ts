// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { useStockfish } from "../useStockfish";

interface MockInstance {
  ready: Promise<void>;
  resolveReady: () => void;
  rejectReady: (err: Error) => void;
  terminate: ReturnType<typeof vi.fn>;
}

let instances: MockInstance[] = [];

vi.mock("../../services/engine/stockfishClient", () => {
  return {
    StockfishClient: vi.fn().mockImplementation(() => {
      let resolveReady!: () => void;
      let rejectReady!: (err: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      // Every mock instance's own rejection must be observed (even if the
      // hook never awaits it directly) so Node doesn't report an unhandled
      // rejection for the ones that are deliberately left to fail.
      ready.catch(() => undefined);
      const instance: MockInstance = { ready, resolveReady, rejectReady, terminate: vi.fn() };
      instances.push(instance);
      return instance;
    }),
  };
});

beforeEach(() => {
  instances = [];
});

describe("useStockfish init lifecycle", () => {
  it("normal init: status goes loading -> ready", async () => {
    const { result } = renderHook(() => useStockfish());
    expect(result.current.status).toBe("loading");
    expect(instances).toHaveLength(1);

    await act(async () => {
      instances[0].resolveReady();
      await instances[0].ready;
    });

    expect(result.current.status).toBe("ready");
  });

  it("init failure: status goes loading -> error with the failure message", async () => {
    const { result } = renderHook(() => useStockfish());
    expect(instances).toHaveLength(1);

    await act(async () => {
      instances[0].rejectReady(new Error("boom"));
      await instances[0].ready.catch(() => undefined);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("boom");
  });

  it("retryInit after a failure constructs a replacement client and recovers to ready", async () => {
    const { result } = renderHook(() => useStockfish());
    await act(async () => {
      instances[0].rejectReady(new Error("boom"));
      await instances[0].ready.catch(() => undefined);
    });
    expect(result.current.status).toBe("error");

    act(() => {
      result.current.retryInit();
    });

    expect(instances).toHaveLength(2); // a second, replacement client was constructed
    expect(instances[0].terminate).toHaveBeenCalledTimes(1); // the dead client was torn down first
    expect(result.current.status).toBe("loading");

    await act(async () => {
      instances[1].resolveReady();
      await instances[1].ready;
    });

    expect(result.current.status).toBe("ready");
  });

  it("two rapid retryInit calls during reinitialization construct exactly one replacement client", async () => {
    const { result } = renderHook(() => useStockfish());
    await act(async () => {
      instances[0].rejectReady(new Error("boom"));
      await instances[0].ready.catch(() => undefined);
    });
    expect(result.current.status).toBe("error");

    // Two rapid calls, synchronously, before the replacement client's ready
    // promise has settled - the second must be a no-op.
    act(() => {
      result.current.retryInit();
      result.current.retryInit();
    });

    expect(instances).toHaveLength(2); // not 3 - the second retryInit call did nothing

    await act(async () => {
      instances[1].resolveReady();
      await instances[1].ready;
    });
    expect(result.current.status).toBe("ready");

    // Once the in-flight attempt has settled, a further retryInit is allowed
    // again (this is manual recovery, not a permanently-stuck guard).
    act(() => {
      result.current.retryInit();
    });
    expect(instances).toHaveLength(3);
  });

  it("unmounting while an init is still pending invalidates it, so a later resolution cannot update state", async () => {
    const { result, unmount } = renderHook(() => useStockfish());
    expect(result.current.status).toBe("loading");
    expect(instances).toHaveLength(1);

    unmount();
    expect(instances[0].terminate).toHaveBeenCalledTimes(1);

    // The unmounted hook's pending client resolves late. This must not throw
    // (no "update state on an unmounted component" warning/crash) because
    // the cleanup bumped the generation before terminating.
    await act(async () => {
      instances[0].resolveReady();
      await instances[0].ready;
    });
    // No assertion on `result.current` here - the hook is unmounted; the
    // absence of a thrown error/act() warning is the actual assertion.
  });

  it("React StrictMode's dev-mode double-invoke (mount -> cleanup -> remount) does not leave init permanently stuck", async () => {
    // Real StrictMode, not a hand-simulated approximation: wrapping the
    // render in React.StrictMode makes React itself synchronously mount,
    // clean up, and remount before anything can settle - exactly the
    // sequence that exposed the bug (terminate() never settles the first
    // client's `ready`, so without the cleanup-side initInFlightRef reset,
    // the second mount's initClient() call would see the guard still true
    // and do nothing, leaving status stuck on "loading" forever).
    const { result } = renderHook(() => useStockfish(), { wrapper: React.StrictMode });

    // Two clients were constructed (the first torn down before it could
    // settle); the second is the one that's actually live.
    expect(instances).toHaveLength(2);
    expect(instances[0].terminate).toHaveBeenCalledTimes(1);

    const live = instances[1];
    await act(async () => {
      live.resolveReady();
      await live.ready;
    });

    // The critical assertion: the hook is NOT stuck on "loading" - the
    // second mount's initClient() call was not blocked by a guard left
    // true by the orphaned first client.
    expect(result.current.status).toBe("ready");
  });

  it("an older, late-settling initialization's finally() cannot release a newer initialization's in-flight guard", async () => {
    // StrictMode produces client A (terminated by cleanup, orphaned) and
    // client B (the live one), exactly as in the test above.
    const { result } = renderHook(() => useStockfish(), { wrapper: React.StrictMode });
    expect(instances).toHaveLength(2);
    const [clientA, clientB] = instances;
    expect(clientA.terminate).toHaveBeenCalledTimes(1);

    // B is still pending. A's own orphaned ready promise now settles late.
    await act(async () => {
      clientA.rejectReady(new Error("A settled late"));
      await clientA.ready.catch(() => undefined);
    });

    // The bug this guards against: without checking the generation inside
    // finally(), A's late settlement would incorrectly release the shared
    // guard, letting a retry construct a THIRD client while B is still
    // legitimately in flight.
    act(() => {
      result.current.retryInit();
    });
    expect(instances).toHaveLength(2); // still just A and B - no third client constructed

    // B can still complete normally afterward, undisturbed.
    await act(async () => {
      clientB.resolveReady();
      await clientB.ready;
    });
    expect(result.current.status).toBe("ready");
  });
});
