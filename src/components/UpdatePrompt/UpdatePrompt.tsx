import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw } from "lucide-react";

/**
 * Surfaces a new app version only when the user asks for it. vite.config.ts
 * sets registerType: "prompt", so a new service worker installs and waits -
 * useRegisterSW's needRefresh flips to true via onNeedRefresh, but nothing
 * here calls updateServiceWorker() except the button's own onClick. That's
 * the whole point: a deployment landing mid-game (a lesson challenge, a
 * Stockfish game, an online match) never gets swapped out from under the
 * player - the update sits ready until they choose it, even across new tabs,
 * since the old service worker keeps serving everything until then.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-3 border-t border-border bg-surface px-4 py-3 text-[13px] text-ink shadow-panel sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 sm:rounded-full sm:border">
      <span>A new version of ChessGuru is ready.</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => void updateServiceWorker()}
          className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-medium text-bg transition-colors hover:bg-accent/90"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Update now
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/20"
        >
          Later
        </button>
      </div>
    </div>
  );
}
