import { X } from "lucide-react";
import type { AppSettings } from "../../services/storage/settings";

interface SettingsPanelProps {
  open: boolean;
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <span className="text-[14px] text-ink dark:text-ink-dark">{label}</span>
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
      className={`relative h-6 w-10 rounded-full transition-colors duration-200 ${checked ? "bg-accent dark:bg-accent-dark" : "bg-ink/10 dark:bg-white/10"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export function SettingsPanel({ open, settings, onChange, onClose }: SettingsPanelProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close settings"
        className="absolute inset-0 bg-ink/10 backdrop-blur-[2px] dark:bg-black/40"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto bg-surface p-6 shadow-panel dark:bg-surface-dark">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-ink dark:text-ink-dark">Settings</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink dark:text-muted-dark dark:hover:bg-white/5 dark:hover:text-ink-dark">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-border dark:divide-border-dark">
          <Row label="Theme">
            <select
              value={settings.theme}
              onChange={(e) => onChange({ theme: e.target.value as AppSettings["theme"] })}
              className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[13px] dark:border-border-dark dark:bg-bg-dark"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </Row>
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
              className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[13px] dark:border-border-dark dark:bg-bg-dark"
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
        </div>

        <p className="mt-6 text-[12px] leading-relaxed text-muted dark:text-muted-dark">
          Preferences are saved on this device only. Engine assistance such as Move Coach is for learning and
          practice. This is not an official rated chess platform.
        </p>
      </div>
    </div>
  );
}
