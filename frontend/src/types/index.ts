export type Difficulty = "easy" | "medium" | "hard";

export interface MoveHistoryEntry {
  san: string;
  fen: string;
  coachComment?: string;
}

export interface RoomState {
  roomId: string;
  fen: string;
  turn: "w" | "b";
  moveHistory: { san: string; fen: string }[];
  isGameOver: boolean;
  whiteConnected: boolean;
  blackConnected: boolean;
  hasWhite: boolean;
  hasBlack: boolean;
}

export type SeatColor = "white" | "black" | null;
