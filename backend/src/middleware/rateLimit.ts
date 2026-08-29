import rateLimit from "express-rate-limit";

/**
 * The LLM coach endpoint is the only one that costs real money per request,
 * so it gets a tighter, dedicated limiter (separate from any general API
 * limiter) keyed by IP by default.
 */
export const coachRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many coach requests. Please wait a moment and try again." },
});

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
