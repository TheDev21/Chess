import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { registerGameHub } from "./realtime/gameHub";

const PORT = Number(process.env.PORT) || 4000;

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || "*" },
});

registerGameHub(io);

server.listen(PORT, () => {
  console.log(`Chess backend listening on port ${PORT}`);
});
