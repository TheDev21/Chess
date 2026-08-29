import express from "express";
import cors from "cors";
import aiRouter from "./routes/ai";
import coachRouter from "./routes/coach";
import authRouter from "./routes/auth";
import roomsRouter from "./routes/rooms";
import { generalRateLimiter } from "./middleware/rateLimit";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
  app.use(express.json({ limit: "100kb" }));
  app.use(generalRateLimiter);

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/ai", aiRouter);
  app.use("/api/coach", coachRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/rooms", roomsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
