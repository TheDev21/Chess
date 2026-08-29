import type { Difficulty } from "../types";

const BASE = import.meta.env.VITE_API_BASE || "/api";

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

export interface AiMoveResponse {
  move: {
    from: string;
    to: string;
    promotion?: string;
    san: string;
    fenAfter: string;
    evaluation: number;
  };
  depth: number;
}

export function requestAiMove(fen: string, difficulty: Difficulty) {
  return request<AiMoveResponse>("/ai/move", {
    method: "POST",
    body: JSON.stringify({ fen, difficulty }),
  });
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
