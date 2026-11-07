import { useEffect, useRef, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import type { AppSettings } from "../../services/storage/settings";
import { resetAllTutorials } from "../../services/storage/tutorialProgress";

interface SettingsPanelProps {
  open: boolean;
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <span className="text-[14px] text-ink">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 rounded-full transition-colors duration-200 ${checked ? "bg-accent" : "bg-ink/10"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-[18px]" : "translate-x-0"}`}
      />
    </button>
  );
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function SettingsPanel({ open, settings, onChange, onClose }: SettingsPanelProps) {
  const [tutorialsReset, setTutorialsReset] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Dialog behavior: move focus in on open, trap Tab/Shift+Tab inside the
  // panel, close on Escape, and restore focus to whatever triggered the
  // panel (the Settings button, in practice) when it closes - however it
  // closes (Escape, the X button, or the backdrop).
  //
  // `open` is intentionally the only dependency: `onClose` is a fresh
  // function identity on every parent render (including ones caused by
  // toggling a setting inside this very panel), and re-running this effect
  // on those unrelated renders would re-grab "previously focused" and steal
  // focus back to the first control mid-interaction.
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const getFocusable = () => (panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : []);
    getFocusable()[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close settings" tabIndex={-1} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-border bg-surface p-6 shadow-panel"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="settings-title" className="text-[17px] font-semibold text-ink">
            Settings
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-border">
          <Row label="Show legal moves">
            <Toggle label="Show legal moves" checked={settings.showLegalMoves} onChange={(v) => onChange({ showLegalMoves: v })} />
          </Row>
          <Row label="Show coordinates">
            <Toggle label="Show coordinates" checked={settings.showCoordinates} onChange={(v) => onChange({ showCoordinates: v })} />
          </Row>
          <Row label="Sound effects">
            <Toggle label="Sound effects" checked={settings.soundEnabled} onChange={(v) => onChange({ soundEnabled: v })} />
          </Row>
          <Row label="Move Coach">
            <Toggle label="Move Coach" checked={settings.moveCoachEnabled} onChange={(v) => onChange({ moveCoachEnabled: v })} />
          </Row>
          <Row label="Coach detail">
            <label htmlFor="coach-detail-select" className="sr-only">
              Coach detail
            </label>
            <select
              id="coach-detail-select"
              value={settings.coachDetail}
              onChange={(e) => onChange({ coachDetail: e.target.value as AppSettings["coachDetail"] })}
              className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[13px] text-ink"
            >
              <option value="basic">Basic</option>
              <option value="detailed">Detailed</option>
            </select>
          </Row>
          <Row label="Confirm resignation">
            <Toggle label="Confirm resignation" checked={settings.confirmResignation} onChange={(v) => onChange({ confirmResignation: v })} />
          </Row>
          <Row label="Confirm draw offer">
            <Toggle label="Confirm draw offer" checked={settings.confirmDrawOffer} onChange={(v) => onChange({ confirmDrawOffer: v })} />
          </Row>
          <Row label="Guided tutorials">
            <button
              onClick={() => {
                resetAllTutorials();
                setTutorialsReset(true);
              }}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-accent/[0.08]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {tutorialsReset ? "They'll replay" : "Replay"}
            </button>
          </Row>
        </div>

        <p className="mt-6 text-[12px] leading-relaxed text-muted">
          Preferences are saved on this device only. Engine assistance such as Move Coach is for learning and practice. This is not an official rated chess
          platform.
        </p>
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          Powered by the{" "}
          <a
            href="https://github.com/official-stockfish/Stockfish"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold underline-offset-2 hover:underline"
          >
            Stockfish
          </a>{" "}
          chess engine (GPL-3.0). See{" "}
          <a
            href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold underline-offset-2 hover:underline"
          >
            source
          </a>{" "}
          and license details in the project repository.
        </p>
      </div>
    </div>
  );
}
