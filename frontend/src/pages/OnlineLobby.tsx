import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HAS_BACKEND, createRoom } from "../api/client";

export function OnlineLobby() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!HAS_BACKEND) {
    return (
      <div className="page lobby-page">
        <h1>1v1 Online</h1>
        <p className="muted">
          This mode needs a running backend server to hold game state and sync moves live, and this
          deployment is a static, backend-free build. Clone the repo and run the backend locally (see the
          README) to play online.
        </p>
      </div>
    );
  }

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const { roomId } = await createRoom();
      navigate(`/online/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinCode.trim();
    if (trimmed) navigate(`/online/${trimmed}`);
  };

  return (
    <div className="page lobby-page">
      <h1>1v1 Online</h1>
      <p className="muted">Create a game and send the link to a friend, or join one with a code.</p>
      <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
        {creating ? "Creating..." : "Create Game"}
      </button>
      <form className="join-form" onSubmit={handleJoin}>
        <input
          type="text"
          placeholder="Enter game code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
        />
        <button className="btn" type="submit">
          Join
        </button>
      </form>
      {error && <p className="coach-error">{error}</p>}
    </div>
  );
}
