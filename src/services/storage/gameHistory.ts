import type { StoredGame } from "../../types/chess";

const KEY = "chess:history";

export function listGames(): StoredGame[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const games = JSON.parse(raw) as StoredGame[];
    return games.sort((a, b) => b.playedAt.localeCompare(a.playedAt));
  } catch {
    return [];
  }
}

export function saveGame(game: StoredGame): void {
  const games = listGames();
  games.unshift(game);
  try {
    localStorage.setItem(KEY, JSON.stringify(games.slice(0, 200)));
  } catch {
    // Storage full or unavailable (private browsing) - the game still played fine, it just won't be remembered.
  }
}

export function deleteGame(id: string): void {
  const games = listGames().filter((g) => g.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(games));
  } catch {
    // Storage full or unavailable (private browsing) - the deletion may not persist.
  }
}

export function getGame(id: string): StoredGame | null {
  return listGames().find((g) => g.id === id) ?? null;
}
