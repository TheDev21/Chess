const BASE = import.meta.env.VITE_API_BASE || "/api";

// The AI opponent runs entirely client-side (see src/engine + useAiWorker),
// so it needs no backend. The LLM move coach and 1v1 online multiplayer do:
// the coach must keep the Anthropic API key server-side, and multiplayer
// needs a persistent process holding room state and live WebSocket
// connections. Set VITE_HAS_BACKEND=false at build time (e.g. for a static
// GitHub Pages deploy) to gate those two features off cleanly instead of
// letting them fail with network errors against a backend that isn't there.
export const HAS_BACKEND = import.meta.env.VITE_HAS_BACKEND !== "false";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export interface CoachExplainResponse {
  explanation: string;
}

export async function requestCoachExplanation(
  fenBefore: string,
  fenAfter: string,
  san: string,
  mover: "white" | "black"
): Promise<CoachExplainResponse> {
  const res = await fetch(`${BASE}/coach/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fenBefore, fenAfter, san, mover }),
  });
  const data = await res.json();
  // A 503 "not configured" response still carries a friendly `explanation`
  // (e.g. missing API key) - treat that as normal content, not an error.
  if (!res.ok && !data.explanation) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data as CoachExplainResponse;
}

export function createRoom() {
  return request<{ roomId: string }>("/rooms", { method: "POST" });
}
