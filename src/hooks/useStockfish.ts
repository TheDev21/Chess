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
  const [status, setStatus] = useState<EngineStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const pendingRef = useRef<Promise<EngineEvaluation> | null>(null);

  useEffect(() => {
    const client = new StockfishClient();
    clientRef.current = client;
    setStatus("loading");
    client.ready
      .then(() => setStatus("ready"))
      .catch((err: Error) => {
        setStatus("error");
        setError(err.message);
      });

    return () => {
      client.terminate();
      clientRef.current = null;
    };
  }, []);

  /**
   * Evaluates `fen`. If a newer call comes in before an older one resolves,
   * the older call's result is silently dropped (resolves to null) instead
   * of racing to update state with a now-outdated position - this is what
   * "cancel outdated analysis" means in practice for a single-worker client.
   */
  const evaluate = useCallback(
    async (
      fen: string,
      config: { depth: number; skillLevel: number; limitStrength: boolean; elo?: number }
    ): Promise<EngineEvaluation | null> => {
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
      } finally {
        if (pendingRef.current === promise) pendingRef.current = null;
      }
      if (myId !== requestIdRef.current) return null; // superseded while we awaited
      return result;
    },
    []
  );

  return { status, error, evaluate };
}
