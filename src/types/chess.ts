export type PlayerColor = "white" | "black";

export type Difficulty = "beginner" | "easy" | "medium" | "hard" | "expert";

export interface DifficultyConfig {
  label: string;
  skillLevel: number; // Stockfish "Skill Level" UCI option, 0-20
  limitStrength: boolean;
  elo?: number; // only used when limitStrength is true
  depth: number; // search depth cap as a secondary limiter
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  beginner: { label: "Beginner", skillLevel: 0, limitStrength: true, elo: 800, depth: 4 },
  easy: { label: "Easy", skillLevel: 4, limitStrength: true, elo: 1100, depth: 6 },
  medium: { label: "Medium", skillLevel: 9, limitStrength: true, elo: 1500, depth: 10 },
  hard: { label: "Hard", skillLevel: 15, limitStrength: true, elo: 1900, depth: 14 },
  expert: { label: "Expert", skillLevel: 20, limitStrength: false, depth: 18 },
};

export type TimeControlId = "unlimited" | "1min" | "3min" | "5min" | "10min" | "15min";

export const TIME_CONTROLS: Record<TimeControlId, { label: string; seconds: number | null }> = {
  unlimited: { label: "Unlimited", seconds: null },
  "1min": { label: "1 minute", seconds: 60 },
  "3min": { label: "3 minutes", seconds: 180 },
  "5min": { label: "5 minutes", seconds: 300 },
  "10min": { label: "10 minutes", seconds: 600 },
  "15min": { label: "15 minutes", seconds: 900 },
};

export type GameMode = "friend" | "computer" | "online";

export type MoveClassification = "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder";

export const CLASSIFICATION_META: Record<
  MoveClassification,
  { label: string; tone: "accent" | "success" | "mistake" | "blunder" }
> = {
  best: { label: "Best Move", tone: "success" },
  excellent: { label: "Excellent", tone: "success" },
  good: { label: "Good Move", tone: "accent" },
  inaccuracy: { label: "Inaccuracy", tone: "mistake" },
  mistake: { label: "Mistake", tone: "mistake" },
  blunder: { label: "Blunder", tone: "blunder" },
};

export interface EngineEvaluation {
  /** Centipawn score from White's perspective; null when a forced mate is found instead. */
  cp: number | null;
  /** Mate in N (positive = White mates, negative = Black mates); null when no mate found. */
  mate: number | null;
  bestMoveUci: string;
  bestMoveSan: string;
  pvSan: string[];
  depth: number;
}

export interface CoachedMove {
  ply: number;
  moverColor: PlayerColor;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: EngineEvaluation;
  evalAfter: EngineEvaluation;
  classification: MoveClassification;
  centipawnLoss: number;
  summary: string;
  whatWentWell: string[];
  bestAlternativeSan: string | null;
  bestAlternativeReason: string | null;
}

export interface StoredGame {
  id: string;
  playedAt: string;
  mode: GameMode;
  opponent: string;
  playerColor: PlayerColor;
  result: string; // "1-0" | "0-1" | "1/2-1/2" | "*"
  moveCount: number;
  pgn: string;
}
