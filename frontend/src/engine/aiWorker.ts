import { findBestMove, type Difficulty, depthForDifficulty, timeBudgetForDifficulty } from "./chessEngine";

export interface AiWorkerRequest {
  fen: string;
  difficulty: Difficulty;
}

export interface AiWorkerResponse {
  move: ReturnType<typeof findBestMove>;
}

// Runs the minimax search on a background thread so the UI (board, status
// text) stays responsive while "Hard" difficulty thinks for several seconds.
// `self` is typed loosely here (not `/// <reference lib="webworker" />`)
// because this file is type-checked under the main app's DOM-lib tsconfig,
// and the DOM and WebWorker lib globals conflict if both are pulled in.
const ctx = self as unknown as { onmessage: ((event: { data: AiWorkerRequest }) => void) | null; postMessage: (msg: AiWorkerResponse) => void };

ctx.onmessage = (event) => {
  const { fen, difficulty } = event.data;
  const move = findBestMove(fen, depthForDifficulty(difficulty), timeBudgetForDifficulty(difficulty));
  const response: AiWorkerResponse = { move };
  ctx.postMessage(response);
};
