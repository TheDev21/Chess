import { useCallback, useEffect, useRef, useState } from "react";
import { StockfishClient } from "../services/engine/stockfishClient";
import type { EngineEvaluation } from "../types/chess";

export type EngineStatus = "loading" | "ready" | "error";

/**
 * Owns one Stockfish Web Worker for the lifetime of the component that
 * calls this hook. Each caller (vs-Computer opponent search, live Move
 * Coach, Analysis review) gets its own worker instance so they never
 * contend over the same in-flight UCI request.
 */
export function useStockfish() {
  const clientRef = useRef<StockfishClient | null>(null);
  // Bumped on every init attempt (initial mount and every retry) so a client
  // superseded by a newer one - or outlived by an unmount - can never have
  // its late-settling ready promise overwrite a newer/unmounted state.
  const generationRef = useRef(0);
  // Synchronous guard: true for the whole lifetime of one init attempt (from
  // the moment it starts until its ready promise settles, success or not).
  // Prevents a second rapid retry click from tearing down and replacing a
  // client that's still mid-handshake.
  const initInFlightRef = useRef(false);
  const [status, setStatus] = useState<EngineStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const pendingRef = useRef<Promise<EngineEvaluation> | null>(null);

  const initClient = useCallback(() => {
    if (initInFlightRef.current) return;
    initInFlightRef.current = true;
    const myGeneration = ++generationRef.current;
    setStatus("loading");
    setError(null);
    const client = new StockfishClient();
    clientRef.current = client;
    client.ready
      .then(() => {
        if (generationRef.current !== myGeneration) return; // superseded
        setStatus("ready");
      })
      .catch((err: Error) => {
        if (generationRef.current !== myGeneration) return; // superseded
        setStatus("error");
        setError(err.message);
      })
      .finally(() => {
        // Without this check, an older init's late-settling promise (e.g.
        // orphaned by StrictMode's cleanup -> remount, per the test above)
        // could release the guard while a newer init it was superseded by
        // is still legitimately in flight, letting a retry construct a
        // third client out from under it.
        if (generationRef.current === myGeneration) {
          initInFlightRef.current = false;
        }
      });
  }, []);

  useEffect(() => {
    initClient();
    return () => {
      // Invalidate any still-pending init before tearing down, so a late
      // resolution from this unmounted hook instance can't update state.
      generationRef.current++;
      clientRef.current?.terminate();
      clientRef.current = null;
      // terminate() only rejects an in-flight *evaluation* - it never
      // settles the init client.ready promise, so if this cleanup runs
      // before the worker ever sent its first handshake message (as in
      // React StrictMode's synchronous mount -> cleanup -> remount in dev),
      // that promise is now permanently pending and its own .finally()
      // will never reset this guard. Reset it here instead, so the
      // following remount's initClient() call isn't blocked forever.
      initInFlightRef.current = false;
    };
  }, [initClient]);

  /** Recreates the engine client after an init failure (status "error"), or
   * is a no-op while an init attempt is already in flight. Does nothing for
   * a timed-out evaluation - StockfishClient already self-heals that case
   * internally by replacing its own worker, so evaluate() alone recovers it. */
  const retryInit = useCallback(() => {
    if (initInFlightRef.current) return;
    clientRef.current?.terminate();
    initClient();
  }, [initClient]);

  /**
   * Evaluates `fen`. If a newer call comes in before an older one resolves,
   * the older call's result is silently dropped (resolves to null) instead
   * of racing to update state with a now-outdated position - this is what
   * "cancel outdated analysis" means in practice for a single-worker client.
   */
  const evaluate = useCallback(
    async (fen: string, config: { depth: number; skillLevel: number; limitStrength: boolean; elo?: number }): Promise<EngineEvaluation | null> => {
      const client = clientRef.current;
      if (!client) return null;
      const myId = ++requestIdRef.current;

      // Only one UCI request can be in flight on a single worker. If one is
      // still running (a now-stale search from a superseded position),
      // force it to wrap up quickly so this newer request isn't rejected.
      if (pendingRef.current) {
        client.stop();
        await pendingRef.current.catch(() => undefined);
      }

      const promise = client.evaluate(fen, config);
      pendingRef.current = promise;
      let result: EngineEvaluation;
      try {
        result = await promise;
      } catch {
        return null; // e.g. a timed-out evaluation - treat like a superseded request rather than throwing into reviewGame/Analysis
      } finally {
        if (pendingRef.current === promise) pendingRef.current = null;
      }
      if (myId !== requestIdRef.current) return null; // superseded while we awaited
      return result;
    },
    [],
  );

  return { status, error, evaluate, retryInit };
}
