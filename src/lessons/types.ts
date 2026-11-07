import type { Chess, Move } from "chess.js";

export interface WatchStep {
  /** Plain-English caption shown while this step plays. */
  caption: string;
  /** The exact position to display for this step (react-chessboard animates the glide between steps automatically). */
  fen: string;
  highlightSquares?: string[];
}

export interface TryItStep {
  instructions: string;
  /** FEN the try-it board resets to. */
  fen: string;
  /** "move": the user moves a real piece (any legal destination accepted). "find": the user taps a named square (no piece involved - used for board-orientation lessons). */
  kind: "move" | "find";
  /** Required when kind is "move": the square whose piece the user is meant to move. */
  pieceSquare?: string;
  /** Required when kind is "find": the square the user must tap. */
  targetSquare?: string;
  successMessage: string;
}

export interface ChallengeStep {
  instructions: string;
  fen: string;
  kind: "move" | "find";
  /** Required when kind is "move": returns true if the played move satisfies the challenge's goal. */
  isGoalMove?: (chess: Chess, move: Move) => boolean;
  /** Required when kind is "find". */
  targetSquare?: string;
  successMessage: string;
  hint: string;
}

export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  /** One line shown on the chapter list. */
  summary: string;
  watch: WatchStep[];
  tryIt: TryItStep;
  challenge: ChallengeStep;
  /** Optional extra challenge positions, offered one at a time after `challenge` via "Try Another Position". */
  additionalChallenges?: ChallengeStep[];
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}
