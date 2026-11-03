import { HAS_BACKEND, FUNCTIONS_BASE, SUPABASE_KEY } from "./supabaseClient";

export { HAS_BACKEND };

export interface RoomState {
  roomId: string;
  fen: string;
  turn: "w" | "b";
  moveHistory: { san: string; fen: string }[];
  isGameOver: boolean;
  resultText: string | null;
  drawOfferedBy: "white" | "black" | "agreed" | null;
  hasWhite: boolean;
  hasBlack: boolean;
}

async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `${name} failed (${res.status})`);
  return data as T;
}

export async function createOnlineRoom(): Promise<{ roomId: string }> {
  return callFunction("rooms-create", {});
}

export async function joinRoom(roomId: string, playerId: string): Promise<RoomState & { color: "white" | "black" | null }> {
  return callFunction("rooms-join", { roomId, playerId });
}

export async function makeOnlineMove(
  roomId: string,
  playerId: string,
  from: string,
  to: string,
  promotion?: string
): Promise<RoomState & { move: { san: string; from: string; to: string } }> {
  return callFunction("rooms-move", { roomId, playerId, from, to, promotion });
}

export async function resignOnlineGame(roomId: string, playerId: string): Promise<RoomState> {
  return callFunction("rooms-resign", { roomId, playerId });
}

export async function offerOnlineDraw(roomId: string, playerId: string): Promise<RoomState> {
  return callFunction("rooms-draw", { roomId, playerId });
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
