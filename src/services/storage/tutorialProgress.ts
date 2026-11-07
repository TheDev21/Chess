const KEY = "chessguru:tutorialsSeen";

function loadSeen(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function isTutorialSeen(id: string): boolean {
  return loadSeen().includes(id);
}

export function markTutorialSeen(id: string): void {
  const seen = loadSeen();
  if (!seen.includes(id)) {
    seen.push(id);
    try {
      localStorage.setItem(KEY, JSON.stringify(seen));
    } catch {
      // Storage full or unavailable (private browsing) - this won't persist across a reload.
    }
  }
}

export function resetTutorial(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadSeen().filter((t) => t !== id)));
  } catch {
    // Storage full or unavailable (private browsing) - this won't persist across a reload.
  }
}

export function resetAllTutorials(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage full or unavailable (private browsing) - this won't persist across a reload.
  }
}
