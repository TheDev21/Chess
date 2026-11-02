import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { createRoom, registerGameHub } from "./rooms/gameHub";

const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/rooms", (_req, res) => {
  const roomId = createRoom();
  res.status(201).json({ roomId });
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CORS_ORIGIN } });
registerGameHub(io);

server.listen(PORT, () => {
  console.log(`Chess multiplayer server listening on port ${PORT}`);
});
