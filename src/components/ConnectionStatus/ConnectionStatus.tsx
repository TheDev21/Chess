import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * A minimal, read-only indicator of the browser's own network state -
 * navigator.onLine plus the online/offline window events. It only ever
 * shows something when the browser reports no connection at all; it stays
 * silent the rest of the time rather than claiming "online" means
 * ChessGuru's own servers (Supabase, online multiplayer) are reachable -
 * navigator.onLine can't tell us that, so we don't imply it.
 */
export function ConnectionStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-warning/90 px-4 py-2 text-center text-[12px] font-medium text-ink">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      No network connection detected. Lessons and puzzles you've already opened still work - online games and anything new may not load.
    </div>
  );
}
