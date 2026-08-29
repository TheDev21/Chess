import { Router } from "express";
import { Chess } from "chess.js";
import { z } from "zod";
import { depthForDifficulty, findBestMove, timeBudgetForDifficulty } from "../engine/chessEngine";

const router = Router();

const moveRequestSchema = z.object({
  fen: z.string().min(6),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

router.post("/move", (req, res) => {
  const parsed = moveRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const { fen, difficulty } = parsed.data;

  let game: Chess;
  try {
    game = new Chess(fen);
  } catch {
    return res.status(400).json({ error: "Invalid FEN" });
  }

  if (game.isGameOver()) {
    return res.status(400).json({ error: "Game is already over" });
  }

  const depth = depthForDifficulty(difficulty);
  const move = findBestMove(fen, depth, timeBudgetForDifficulty(difficulty));

  if (!move) {
    return res.status(422).json({ error: "No legal moves available" });
  }

  return res.json({ move, depth });
});

export default router;
