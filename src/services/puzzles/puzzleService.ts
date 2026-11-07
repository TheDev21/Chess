export interface Puzzle {
  id: string;
  fen: string;
  solution: string[]; // UCI moves
  theme: string;
  rating: number;
}

let cache: Puzzle[] | null = null;

/**
 * Loads a small, hand-verified starter set bundled as a static JSON file -
 * not the full ~4M-puzzle Lichess database, which would be a very bad idea
 * to ship to the browser. Swap this loader for a real ingestion pipeline
 * (e.g. a build step that filters the Lichess CC0 CSV into themed, rating-
 * banded static JSON shards) to grow the set without changing callers.
 */
export async function loadPuzzles(): Promise<Puzzle[]> {
  if (cache) return cache;
  const base = import.meta.env.BASE_URL || "/";
  const res = await fetch(`${base}puzzles/starter-set.json`);
  cache = (await res.json()) as Puzzle[];
  return cache;
}

export function dailyPuzzle(puzzles: Puzzle[]): Puzzle {
  // Keyed by the user's local calendar date (not raw elapsed time) so this
  // rolls over at the same moment puzzleProgress.ts's local-date-keyed
  // solved-today tracking does - using UTC-of-the-local-date components,
  // rather than subtracting a timezone offset, means this is also safe
  // across daylight-saving transitions, where a local day isn't exactly 24h.
  const d = new Date();
  const dayIndex = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return puzzles[dayIndex % puzzles.length];
}

export function randomPuzzle(puzzles: Puzzle[], excludeId?: string): Puzzle {
  const pool = excludeId ? puzzles.filter((p) => p.id !== excludeId) : puzzles;
  return pool[Math.floor(Math.random() * pool.length)] ?? puzzles[0];
}

const STREAK_KEY = "chess:puzzleStreak";
const SOLVED_KEY = "chess:puzzlesSolved";

export function getStreak(): number {
  return Number(localStorage.getItem(STREAK_KEY) ?? "0");
}

export function getSolvedCount(): number {
  return Number(localStorage.getItem(SOLVED_KEY) ?? "0");
}

export function incrementStreak(): number {
  const next = getStreak() + 1;
  localStorage.setItem(STREAK_KEY, String(next));
  localStorage.setItem(SOLVED_KEY, String(getSolvedCount() + 1));
  return next;
}

export function resetStreak(): void {
  localStorage.setItem(STREAK_KEY, "0");
}
