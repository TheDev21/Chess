export interface AppSettings {
  theme: "light" | "dark" | "system";
  showLegalMoves: boolean;
  showCoordinates: boolean;
  soundEnabled: boolean;
  moveCoachEnabled: boolean;
  coachDetail: "basic" | "detailed";
  confirmResignation: boolean;
  confirmDrawOffer: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  showLegalMoves: true,
  showCoordinates: true,
  soundEnabled: true,
  moveCoachEnabled: true,
  coachDetail: "basic",
  confirmResignation: true,
  confirmDrawOffer: true,
};

const KEY = "chess:settings";

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
