import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HAS_BACKEND, createOnlineRoom } from "../../services/multiplayer/api";

// Mirrors supabase/functions/rooms-create/index.ts's randomRoomId(): 6
// characters from a set that excludes visually ambiguous ones (no 0/O,
// 1/l/i). Used only to give a quick, friendly "that doesn't look like a
// code" hint before making a round trip - rooms-join is still the one
// source of truth for whether a code is real.
const ROOM_CODE_PATTERN = /^[abcdefghjkmnpqrstuvwxyz23456789]{6}$/;

export function OnlineLobby() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  if (!HAS_BACKEND) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-3 text-[26px] font-semibold tracking-tight text-ink">Play Online</h1>
        <p className="text-[14px] leading-relaxed text-muted">Play Online is not configured on this build (missing Supabase project settings).</p>
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
      console.error("Failed to create online game:", err);
      setError("Couldn't start a game right now. Check your connection and try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinCode.trim().toLowerCase();
    if (!trimmed) return;
    if (!ROOM_CODE_PATTERN.test(trimmed)) {
      setJoinError("That doesn't look like a game code. Codes are 6 characters, letters and numbers only.");
      return;
    }
    setJoinError(null);
    navigate(`/play/online/${trimmed}`);
  };

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="mb-2.5 text-[26px] font-semibold tracking-tight text-ink">Play Online</h1>
      <p className="mb-8 text-[14px] text-muted">Create a game and send the link to a friend, or join one with a code.</p>
      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full rounded-full bg-accent px-4 py-3 text-[14px] font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-60"
      >
        {creating ? "Creating…" : "Create Game"}
      </button>
      <form onSubmit={handleJoin} className="mt-4 flex gap-2">
        <input
          value={joinCode}
          onChange={(e) => {
            setJoinCode(e.target.value);
            if (joinError) setJoinError(null);
          }}
          placeholder="Enter game code"
          maxLength={6}
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-[13px]"
        />
        <button type="submit" className="rounded-full border border-border px-5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/20">
          Join
        </button>
      </form>
      {joinError && <p className="mt-3 text-[13px] text-blunder">{joinError}</p>}
      {error && <p className="mt-3 text-[13px] text-blunder">{error}</p>}
    </div>
  );
}
