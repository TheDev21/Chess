import { Router } from "express";
import { createRoom } from "../realtime/gameHub";

const router = Router();

router.post("/", (_req, res) => {
  const roomId = createRoom();
  res.status(201).json({ roomId });
});

export default router;
