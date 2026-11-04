import { useState } from "react";
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 rounded-full transition-colors duration-200 ${checked ? "bg-accent" : "bg-ink/10"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-[18px]" : "translate-x-0"}`}
      />
    </button>
  );
}

export function SettingsPanel({ open, settings, onChange, onClose }: SettingsPanelProps) {
  const [tutorialsReset, setTutorialsReset] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close settings" className="absolute inset-0 bg-ink/10 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-ink/15 bg-[#f6f3e8]/50 p-6 shadow-panel backdrop-blur-[2px]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-ink">Settings</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-[#4a3728] transition-colors hover:bg-ink/5 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-ink/15">
          <Row label="Show legal moves">
            <Toggle checked={settings.showLegalMoves} onChange={(v) => onChange({ showLegalMoves: v })} />
          </Row>
          <Row label="Show coordinates">
            <Toggle checked={settings.showCoordinates} onChange={(v) => onChange({ showCoordinates: v })} />
          </Row>
          <Row label="Sound effects">
            <Toggle checked={settings.soundEnabled} onChange={(v) => onChange({ soundEnabled: v })} />
          </Row>
          <Row label="Move Coach">
            <Toggle checked={settings.moveCoachEnabled} onChange={(v) => onChange({ moveCoachEnabled: v })} />
          </Row>
          <Row label="Coach detail">
            <select
              value={settings.coachDetail}
              onChange={(e) => onChange({ coachDetail: e.target.value as AppSettings["coachDetail"] })}
              className="rounded-lg border border-ink/15 bg-[#f6f3e8] px-2.5 py-1.5 text-[13px]"
            >
              <option value="basic">Basic</option>
              <option value="detailed">Detailed</option>
            </select>
          </Row>
          <Row label="Confirm resignation">
            <Toggle checked={settings.confirmResignation} onChange={(v) => onChange({ confirmResignation: v })} />
          </Row>
          <Row label="Confirm draw offer">
            <Toggle checked={settings.confirmDrawOffer} onChange={(v) => onChange({ confirmDrawOffer: v })} />
          </Row>
          <Row label="Guided tutorials">
            <button
              onClick={() => {
                resetAllTutorials();
                setTutorialsReset(true);
              }}
              className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-ink/[0.06]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {tutorialsReset ? "They'll replay" : "Replay"}
            </button>
          </Row>
        </div>

        <p className="mt-6 text-[12px] leading-relaxed text-[#4a3728]">
          Preferences are saved on this device only. Engine assistance such as Move Coach is for learning and practice. This is not an official rated chess
          platform.
        </p>
      </div>
    </div>
  );
}
