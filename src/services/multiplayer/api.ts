const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// 1v1 Online needs a persistent server holding room state and live
// WebSocket connections - something a static GitHub Pages build can't run.
// VITE_HAS_BACKEND=false (set for the Pages build) gates the feature off
// cleanly with an explanation in the UI instead of letting it fail against
// a backend that isn't there.
export const HAS_BACKEND = import.meta.env.VITE_HAS_BACKEND !== "false";

export async function createOnlineRoom(): Promise<{ roomId: string }> {
  const res = await fetch(`${API_BASE}/rooms`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to create room (${res.status})`);
  return res.json();
}

export function getOrCreatePlayerId(): string {
  const key = "chess:playerId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
