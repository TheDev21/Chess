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
        <h1 className="mb-3 text-[26px] font-semibold tracking-tight text-ink dark:text-ink-dark">Play Online</h1>
        <p className="text-[14px] leading-relaxed text-muted dark:text-muted-dark">
          Play Online is not configured on this build (missing Supabase project settings).
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
      <h1 className="mb-2.5 text-[26px] font-semibold tracking-tight text-ink dark:text-ink-dark">Play Online</h1>
      <p className="mb-8 text-[14px] text-muted dark:text-muted-dark">Create a game and send the link to a friend, or join one with a code.</p>
      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full rounded-full bg-accent px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60 dark:bg-accent-dark dark:text-ink dark:hover:bg-accent-dark/90"
      >
        {creating ? "Creating…" : "Create Game"}
      </button>
      <form onSubmit={handleJoin} className="mt-4 flex gap-2">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Enter game code"
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-[13px] dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
        />
        <button type="submit" className="rounded-full border border-border px-5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/20 dark:border-border-dark dark:text-ink-dark">
          Join
        </button>
      </form>
      {error && <p className="mt-3 text-[13px] text-blunder">{error}</p>}
    </div>
  );
}
