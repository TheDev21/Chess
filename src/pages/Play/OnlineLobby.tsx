import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HAS_BACKEND, createOnlineRoom } from "../../services/multiplayer/api";

export function OnlineLobby() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!HAS_BACKEND) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-3 text-[20px] font-medium text-ink dark:text-ink-dark">Play Online</h1>
        <p className="text-[13px] leading-relaxed text-muted dark:text-muted-dark">
          This mode needs a running multiplayer server, and this deployment is a static build without one. Run the
          server locally (see the README) to play online.
        </p>
      </div>
    );
  }

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const { roomId } = await createOnlineRoom();
      navigate(`/play/online/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinCode.trim();
    if (trimmed) navigate(`/play/online/${trimmed}`);
  };

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="mb-2 text-[20px] font-medium text-ink dark:text-ink-dark">Play Online</h1>
      <p className="mb-6 text-[13px] text-muted dark:text-muted-dark">Create a game and send the link to a friend, or join one with a code.</p>
      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full rounded bg-accent px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-60 dark:bg-accent-dark"
      >
        {creating ? "Creating…" : "Create Game"}
      </button>
      <form onSubmit={handleJoin} className="mt-4 flex gap-2">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Enter game code"
          className="flex-1 rounded border border-border bg-surface px-3 py-2 text-[13px] dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
        />
        <button type="submit" className="rounded border border-border px-4 py-2 text-[13px] text-ink dark:border-border-dark dark:text-ink-dark">
          Join
        </button>
      </form>
      {error && <p className="mt-3 text-[13px] text-blunder">{error}</p>}
    </div>
  );
}
