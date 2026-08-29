import { useCallback, useEffect, useRef } from "react";
import type { AiWorkerRequest, AiWorkerResponse } from "../engine/aiWorker";
import type { Difficulty } from "../engine/chessEngine";

/**
 * Runs the chess engine in a background Web Worker so the board and status
 * text stay responsive while it searches (Hard difficulty can take several
 * seconds). One worker is created per component instance and reused across
 * moves, then terminated on unmount.
 */
export function useAiWorker() {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("../engine/aiWorker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const requestMove = useCallback((fen: string, difficulty: Difficulty) => {
    return new Promise<AiWorkerResponse["move"]>((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) {
        reject(new Error("AI engine is not ready yet."));
        return;
      }
      const handleMessage = (event: MessageEvent<AiWorkerResponse>) => {
        worker.removeEventListener("message", handleMessage);
        resolve(event.data.move);
      };
      worker.addEventListener("message", handleMessage);
      const request: AiWorkerRequest = { fen, difficulty };
      worker.postMessage(request);
    });
  }, []);

  return { requestMove };
}
