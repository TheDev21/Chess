import { Router } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { coachRateLimiter } from "../middleware/rateLimit";

const router = Router();

const explainRequestSchema = z.object({
  fenBefore: z.string().min(6),
  fenAfter: z.string().min(6),
  san: z.string().min(2).max(10),
  mover: z.enum(["white", "black"]),
});

const COACH_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

router.post("/explain", coachRateLimiter, async (req, res) => {
  const parsed = explainRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const anthropic = getClient();
  if (!anthropic) {
    return res.status(503).json({
      error: "Coach unavailable",
      explanation:
        "Move coach is not configured on this server (missing ANTHROPIC_API_KEY). Set it in the backend environment to enable commentary.",
    });
  }

  const { fenBefore, fenAfter, san, mover } = parsed.data;

  try {
    const response = await anthropic.messages.create({
      model: COACH_MODEL,
      max_tokens: 150,
      system:
        "You are a friendly, concise chess coach. Given a position before and after a move, " +
        "explain the move in plain English in 1-2 short sentences. Focus on the practical " +
        "idea (development, center control, king safety, tactics, material) rather than deep " +
        "engine analysis. Do not use chess notation jargon beyond the move itself. No preamble.",
      messages: [
        {
          role: "user",
          content:
            `${mover} just played ${san}.\n` +
            `Position before (FEN): ${fenBefore}\n` +
            `Position after (FEN): ${fenAfter}\n` +
            `Explain this move in plain English.`,
        },
      ],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    return res.json({ explanation: textBlock?.text?.trim() || "No commentary available." });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Coach is rate limited upstream, try again shortly." });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return res.status(503).json({ error: "Coach misconfigured (invalid API key)." });
    }
    if (error instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Coach upstream error: ${error.message}` });
    }
    return res.status(500).json({ error: "Unexpected error generating commentary." });
  }
});

export default router;
