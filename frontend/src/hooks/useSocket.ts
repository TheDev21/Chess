import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { HAS_BACKEND } from "../api/client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "/";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // No backend (e.g. a static GitHub Pages build) means no Socket.io
    // server to connect to - skip the connection attempt entirely instead
    // of retrying against nothing.
    if (!HAS_BACKEND) return;

    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef;
}

export function getOrCreatePlayerId(): string {
  const key = "chess:playerId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
