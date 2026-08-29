import { useCallback, useState } from "react";
import { HAS_BACKEND, requestCoachExplanation } from "../api/client";

const NO_BACKEND_MESSAGE =
  "Move Coach needs a backend server to call the LLM (it keeps the API key private). " +
  "This deployment is a static, backend-free build, so commentary isn't available here - " +
  "clone the repo and run the backend locally (see the README) to try it.";

export function useCoach() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const explain = useCallback(
    async (fenBefore: string, fenAfter: string, san: string, mover: "white" | "black") => {
      if (!enabled) return;
      if (!HAS_BACKEND) {
        setExplanation(NO_BACKEND_MESSAGE);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { explanation } = await requestCoachExplanation(fenBefore, fenAfter, san, mover);
        setExplanation(explanation);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get commentary.");
        setExplanation(null);
      } finally {
        setLoading(false);
      }
    },
    [enabled]
  );

  const reset = useCallback(() => {
    setExplanation(null);
    setError(null);
  }, []);

  return { enabled, setEnabled, loading, explanation, error, explain, reset };
}
