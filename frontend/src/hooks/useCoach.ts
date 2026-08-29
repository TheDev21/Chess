import { useCallback, useState } from "react";
import { requestCoachExplanation } from "../api/client";

export function useCoach() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const explain = useCallback(
    async (fenBefore: string, fenAfter: string, san: string, mover: "white" | "black") => {
      if (!enabled) return;
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
