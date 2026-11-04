const SOLVED_IDS_KEY = "chessguru:solvedPuzzleIds";
const DAILY_KEY = "chessguru:dailyPuzzleState";

export interface DailyPuzzleState {
  date: string; // YYYY-MM-DD, local date the puzzle was issued for
  puzzleId: string;
  solved: boolean;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadSolvedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SOLVED_IDS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Records that this specific puzzle (by id) has been solved at least once - the basis for
 *  "has the user solved every puzzle in the collection", not just a running count. */
export function markPuzzleSolved(id: string): void {
  const ids = loadSolvedIds();
  if (!ids.has(id)) {
    ids.add(id);
    try {
      localStorage.setItem(SOLVED_IDS_KEY, JSON.stringify([...ids]));
    } catch {
      // ignore
    }
  }
}

export function isPuzzleSolved(id: string): boolean {
  return loadSolvedIds().has(id);
}

export function getSolvedPuzzleIds(): string[] {
  return [...loadSolvedIds()];
}

/** The daily puzzle's state for today, keyed by local calendar date so a reload never
 *  double-counts it and a new day always starts unsolved, independent of the fixed set. */
export function getDailyPuzzleState(puzzleId: string): DailyPuzzleState {
  const today = todayKey();
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as DailyPuzzleState;
      if (stored.date === today && stored.puzzleId === puzzleId) return stored;
    }
  } catch {
    // fall through to a fresh state
  }
  return { date: today, puzzleId, solved: false };
}

export function markDailyPuzzleSolved(puzzleId: string): void {
  const state: DailyPuzzleState = { date: todayKey(), puzzleId, solved: true };
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}
