interface CoachPanelProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  loading: boolean;
  explanation: string | null;
  error: string | null;
}

export function CoachPanel({ enabled, onToggle, loading, explanation, error }: CoachPanelProps) {
  return (
    <div className="coach-panel">
      <div className="coach-header">
        <h3>Move Coach</h3>
        <label className="toggle">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
          <span>{enabled ? "On" : "Off"}</span>
        </label>
      </div>
      {!enabled && <p className="muted">Commentary is off. Toggle it on to get plain-English move explanations.</p>}
      {enabled && loading && <p className="muted">Thinking about that move...</p>}
      {enabled && !loading && error && <p className="coach-error">{error}</p>}
      {enabled && !loading && !error && explanation && <p className="coach-text">{explanation}</p>}
      {enabled && !loading && !error && !explanation && <p className="muted">Make a move to get commentary.</p>}
    </div>
  );
}
