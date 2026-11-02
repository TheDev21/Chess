import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { HAS_BACKEND } from "../services/multiplayer/api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "/";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!HAS_BACKEND) return;
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef;
}
