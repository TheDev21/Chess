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
    localStorage.setItem(KEY, JSON.stringify(seen));
  }
}

export function resetTutorial(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadSeen().filter((t) => t !== id)));
}

export function resetAllTutorials(): void {
  localStorage.removeItem(KEY);
}
