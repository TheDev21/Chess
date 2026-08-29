import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Chess } from "chess.js";
import { Board } from "../components/Board";
import { MoveHistory } from "../components/MoveHistory";
import { CoachPanel } from "../components/CoachPanel";
import { useCoach } from "../hooks/useCoach";
import { useSocket, getOrCreatePlayerId } from "../hooks/useSocket";
import type { MoveHistoryEntry, RoomState, SeatColor } from "../types";

export function OnlineGame() {
  const { roomId = "" } = useParams();
  const socketRef = useSocket();
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [history, setHistory] = useState<MoveHistoryEntry[]>([]);
  const [seat, setSeat] = useState<SeatColor>(null);
  const [connected, setConnected] = useState({ white: false, black: false });
  const [roomError, setRoomError] = useState<string | null>(null);
  const coach = useCoach();
  const playerId = useRef(getOrCreatePlayerId());

  const applyState = useCallback((state: RoomState) => {
    gameRef.current.load(state.fen);
    setFen(state.fen);
    setHistory(state.moveHistory);
    setConnected({ white: state.whiteConnected, black: state.blackConnected });
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onConnect = () => {
      socket.emit("room:join", { roomId, playerId: playerId.current });
    };
    const onJoined = (state: RoomState & { color: SeatColor }) => {
      setSeat(state.color);
      applyState(state);
    };
    const onState = (state: RoomState) => applyState(state);
    const onMoveMade = (data: { move: { san: string }; fen: string } & RoomState) => {
      applyState(data);
    };
    const onError = (e: { error: string }) => setRoomError(e.error);

    socket.on("connect", onConnect);
    socket.on("room:joined", onJoined);
    socket.on("room:state", onState);
    socket.on("move:made", onMoveMade);
    socket.on("room:error", onError);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("room:joined", onJoined);
      socket.off("room:state", onState);
      socket.off("move:made", onMoveMade);
      socket.off("room:error", onError);
    };
  }, [roomId, socketRef, applyState]);

  const handleDrop = useCallback(
    (source: string, target: string) => {
      const socket = socketRef.current;
      if (!socket || !seat) return false;

      const turnColor = gameRef.current.turn() === "w" ? "white" : "black";
      if (seat !== turnColor) return false;

      const fenBefore = gameRef.current.fen();
      const preview = new Chess(fenBefore);
      let move;
      try {
        move = preview.move({ from: source, to: target, promotion: "q" });
      } catch {
        move = null;
      }
      if (!move) return false;

      socket.emit("move:make", { roomId, playerId: playerId.current, from: source, to: target, promotion: "q" });
      coach.reset();
      coach.explain(fenBefore, preview.fen(), move.san, seat);
      return true;
    },
    [roomId, seat, socketRef, coach]
  );

  const shareUrl = `${window.location.origin}/online/${roomId}`;

  return (
    <div className="page game-page">
      <div className="game-main">
        <div className="room-banner">
          <span>
            Game code: <strong>{roomId}</strong>
          </span>
          <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(shareUrl)}>
            Copy Link
          </button>
        </div>
        <div className="game-status">
          {seat ? `You are playing ${seat}.` : "Spectating."} White{" "}
          {connected.white ? "connected" : "disconnected"} · Black {connected.black ? "connected" : "disconnected"}
        </div>
        <Board
          fen={fen}
          onMove={handleDrop}
          boardOrientation={seat === "black" ? "black" : "white"}
          arePiecesDraggable={Boolean(seat)}
        />
        {roomError && <p className="coach-error">{roomError}</p>}
      </div>
      <div className="game-sidebar">
        <MoveHistory moves={history} />
        <CoachPanel
          enabled={coach.enabled}
          onToggle={coach.setEnabled}
          loading={coach.loading}
          explanation={coach.explanation}
          error={coach.error}
        />
      </div>
    </div>
  );
}
