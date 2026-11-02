import { Server, Socket } from "socket.io";
import { Chess } from "chess.js";
import { v4 as uuidv4 } from "uuid";

interface Seat {
  playerId: string;
  socketId: string | null; // null while disconnected but within the reconnect grace period
  connected: boolean;
}

interface Room {
  id: string;
  chess: Chess;
  white: Seat | null;
  black: Seat | null;
  moveHistory: { san: string; fen: string }[];
  drawOfferedBy: "white" | "black" | "agreed" | null;
  resignedBy: "white" | "black" | null;
  createdAt: number;
}

const rooms = new Map<string, Room>();
const RECONNECT_GRACE_MS = 5 * 60 * 1000;

function publicState(room: Room) {
  const inCheckmateOrDraw = room.chess.isGameOver();
  const over = inCheckmateOrDraw || room.resignedBy !== null || room.drawOfferedBy === "agreed";
  let resultText: string | null = null;
  if (room.resignedBy) resultText = `${room.resignedBy === "white" ? "White" : "Black"} resigned`;
  else if (room.chess.isCheckmate()) resultText = "Checkmate";
  else if (room.chess.isStalemate()) resultText = "Stalemate";
  else if (room.chess.isDraw()) resultText = "Draw";

  return {
    roomId: room.id,
    fen: room.chess.fen(),
    turn: room.chess.turn(),
    moveHistory: room.moveHistory,
    isGameOver: over,
    resultText,
    drawOfferedBy: room.drawOfferedBy,
    whiteConnected: room.white?.connected ?? false,
    blackConnected: room.black?.connected ?? false,
    hasWhite: Boolean(room.white),
    hasBlack: Boolean(room.black),
  };
}

function seatFor(room: Room, playerId: string): "white" | "black" | null {
  if (room.white?.playerId === playerId) return "white";
  if (room.black?.playerId === playerId) return "black";
  return null;
}

export function createRoom(): string {
  const id = uuidv4().slice(0, 8);
  rooms.set(id, {
    id,
    chess: new Chess(),
    white: null,
    black: null,
    moveHistory: [],
    drawOfferedBy: null,
    resignedBy: null,
    createdAt: Date.now(),
  });
  return id;
}

export function registerGameHub(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("room:join", ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit("room:error", { error: "Room not found" });
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.playerId = playerId;

      let color = seatFor(room, playerId);
      if (!color) {
        if (!room.white) {
          room.white = { playerId, socketId: socket.id, connected: true };
          color = "white";
        } else if (!room.black) {
          room.black = { playerId, socketId: socket.id, connected: true };
          color = "black";
        }
      } else {
        const seat = color === "white" ? room.white! : room.black!;
        seat.socketId = socket.id;
        seat.connected = true;
      }

      socket.emit("room:joined", { color, ...publicState(room) });
      socket.to(roomId).emit("room:state", publicState(room));
    });

    socket.on(
      "move:make",
      ({ roomId, playerId, from, to, promotion }: { roomId: string; playerId: string; from: string; to: string; promotion?: string }) => {
        const room = rooms.get(roomId);
        if (!room) return socket.emit("room:error", { error: "Room not found" });
        if (room.resignedBy || room.drawOfferedBy === "agreed") return socket.emit("room:error", { error: "Game is over" });

        const color = seatFor(room, playerId);
        if (!color) return socket.emit("room:error", { error: "You are not seated in this game" });

        const turnColor = room.chess.turn() === "w" ? "white" : "black";
        if (color !== turnColor) return socket.emit("room:error", { error: "It is not your turn" });

        let move;
        try {
          move = room.chess.move({ from, to, promotion: promotion || "q" });
        } catch {
          move = null;
        }
        if (!move) return socket.emit("room:error", { error: "Illegal move" });

        room.drawOfferedBy = null;
        room.moveHistory.push({ san: move.san, fen: room.chess.fen() });
        io.to(roomId).emit("move:made", { move, ...publicState(room) });
      }
    );

    socket.on("game:resign", ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const color = seatFor(room, playerId);
      if (!color) return;
      room.resignedBy = color;
      io.to(roomId).emit("room:state", publicState(room));
    });

    socket.on("game:offerDraw", ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const color = seatFor(room, playerId);
      if (!color) return;
      if (room.drawOfferedBy && room.drawOfferedBy !== color) {
        room.drawOfferedBy = "agreed";
      } else {
        room.drawOfferedBy = color;
      }
      io.to(roomId).emit("room:state", publicState(room));
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId as string | undefined;
      const playerId = socket.data.playerId as string | undefined;
      if (!roomId || !playerId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const color = seatFor(room, playerId);
      if (!color) return;

      const seat = color === "white" ? room.white! : room.black!;
      seat.connected = false;
      seat.socketId = null;
      socket.to(roomId).emit("room:state", publicState(room));

      setTimeout(() => {
        const current = rooms.get(roomId);
        if (!current) return;
        const currentSeat = color === "white" ? current.white : current.black;
        if (currentSeat && currentSeat.playerId === playerId && !currentSeat.connected) {
          if (color === "white") current.white = null;
          else current.black = null;
          io.to(roomId).emit("room:state", publicState(current));
        }
      }, RECONNECT_GRACE_MS);
    });
  });
}

setInterval(() => {
  const staleCutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, room] of rooms) {
    if (room.createdAt < staleCutoff) rooms.delete(id);
  }
}, 60 * 60 * 1000);
