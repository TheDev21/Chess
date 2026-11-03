import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Chess } from "chess.js";
import { ChessBoard } from "../../components/ChessBoard/ChessBoard";
import { MoveHistory } from "../../components/MoveHistory/MoveHistory";
import { EvaluationBar } from "../../components/EvaluationBar/EvaluationBar";
import { useStockfish } from "../../hooks/useStockfish";
import { reviewGame } from "../../hooks/useMoveCoach";
import { listGames } from "../../services/storage/gameHistory";
import { CLASSIFICATION_META, type CoachedMove, type MoveClassification } from "../../types/chess";
import clsx from "clsx";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function Analysis() {
  const engine = useStockfish();
  const location = useLocation();
  const games = useMemo(() => listGames(), []);
  const [pgnInput, setPgnInput] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [coached, setCoached] = useState<CoachedMove[] | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = starting position
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async (pgn: string) => {
    setError(null);
    const test = new Chess();
    try {
      test.loadPgn(pgn);
      if (test.history().length === 0) throw new Error("No moves found in this PGN.");
    } catch {
      setError("That doesn't look like a valid PGN.");
      return;
    }
    setReviewing(true);
    setCoached(null);
    setCurrentIndex(-1);
    try {
      const result = await reviewGame(pgn, engine.evaluate, (done, total) => setProgress({ done, total }));
      setCoached(result);
      setCurrentIndex(result.length - 1);
    } finally {
      setReviewing(false);
    }
  };

  useEffect(() => {
    const incomingPgn = (location.state as { pgn?: string } | null)?.pgn;
    if (incomingPgn) {
      setPgnInput(incomingPgn);
      void runAnalysis(incomingPgn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (!selectedGameId) return;
    const game = games.find((g) => g.id === selectedGameId);
    if (game) void runAnalysis(game.pgn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGameId]);

  useEffect(() => {
    if (!coached) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setCurrentIndex((i) => Math.max(-1, i - 1));
      else if (e.key === "ArrowRight") setCurrentIndex((i) => Math.min(coached.length - 1, i + 1));
      else if (e.key === "Home") setCurrentIndex(-1);
      else if (e.key === "End") setCurrentIndex(coached.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [coached]);

  const displayFen = currentIndex < 0 ? START_FEN : coached?.[currentIndex]?.fenAfter ?? START_FEN;
  const current = currentIndex >= 0 ? coached?.[currentIndex] : null;

  const summary = useMemo(() => {
    if (!coached) return null;
    const counts: Record<MoveClassification, number> = { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    let worst: CoachedMove | null = null;
    let bestOfGame: CoachedMove | null = null;
    for (const m of coached) {
      counts[m.classification]++;
      if (!worst || m.centipawnLoss > worst.centipawnLoss) worst = m;
      if (m.classification === "best" && (!bestOfGame || m.centipawnLoss < bestOfGame.centipawnLoss)) bestOfGame = m;
    }
    const totalGraded = coached.length;
    const accuracy = totalGraded > 0 ? Math.max(0, 100 - coached.reduce((s, m) => s + Math.min(100, m.centipawnLoss / 10), 0) / totalGraded) : 0;
    return { counts, worst, bestOfGame, accuracy };
  }, [coached]);

  return (
    <div className="flex flex-col gap-6">
      {!coached && (
        <div className="mx-auto w-full max-w-xl">
          <h1 className="mb-6 text-[26px] font-semibold tracking-tight text-ink dark:text-ink-dark">Analysis</h1>

          {games.length > 0 && (
            <div className="mb-4">
              <label className="mb-1.5 block text-[13px] font-medium text-muted dark:text-muted-dark">Review a saved game</label>
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
              >
                <option value="">Select a game…</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {new Date(g.playedAt).toLocaleDateString()} · {g.opponent} · {g.result}
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="mb-1.5 block text-[13px] font-medium text-muted dark:text-muted-dark">Or paste a PGN</label>
          <textarea
            value={pgnInput}
            onChange={(e) => setPgnInput(e.target.value)}
            rows={6}
            placeholder="1. e4 e5 2. Nf3 Nc6 ..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark"
          />
          <button
            onClick={() => runAnalysis(pgnInput)}
            disabled={reviewing || !pgnInput.trim() || engine.status !== "ready"}
            className="mt-3 w-full rounded-full bg-accent px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50 dark:bg-accent-dark dark:text-ink dark:hover:bg-accent-dark/90"
          >
            {reviewing ? `Analyzing ${progress.done}/${progress.total}…` : engine.status !== "ready" ? "Loading engine…" : "Analyze Game"}
          </button>
          {error && <p className="mt-2 text-[13px] text-blunder">{error}</p>}
        </div>
      )}

      {coached && summary && (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col items-center gap-3">
            <div className="flex w-full max-w-[560px] items-stretch gap-2">
              <div style={{ height: 420 }}>
                <EvaluationBar cp={current?.evalAfter.cp ?? null} mate={current?.evalAfter.mate ?? null} />
              </div>
              <div className="flex-1" style={{ aspectRatio: "1" }}>
                <ChessBoard
                  fen={displayFen}
                  onMove={() => false}
                  orientation="white"
                  draggable={false}
                  lastMove={current ? { from: current.uci.slice(0, 2), to: current.uci.slice(2, 4) } : null}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentIndex(-1)} className="rounded-full border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-ink/20 dark:border-border-dark dark:text-ink-dark">⏮</button>
              <button onClick={() => setCurrentIndex((i) => Math.max(-1, i - 1))} className="rounded-full border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-ink/20 dark:border-border-dark dark:text-ink-dark">◀</button>
              <button onClick={() => setCurrentIndex((i) => Math.min(coached.length - 1, i + 1))} className="rounded-full border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-ink/20 dark:border-border-dark dark:text-ink-dark">▶</button>
              <button onClick={() => setCurrentIndex(coached.length - 1)} className="rounded-full border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-ink/20 dark:border-border-dark dark:text-ink-dark">⏭</button>
              <button onClick={() => setCoached(null)} className="ml-3 rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium transition-colors hover:border-ink/20 dark:border-border-dark dark:text-ink-dark">New analysis</button>
            </div>

            {current && (
              <div className="w-full max-w-[560px] rounded-xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-ink dark:text-ink-dark">{current.san}</span>
                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium",
                      current.classification === "blunder" && "bg-blunder/10 text-blunder",
                      current.classification === "mistake" && "bg-mistake/10 text-mistake",
                      current.classification === "inaccuracy" && "bg-warning/10 text-warning",
                      (current.classification === "best" || current.classification === "excellent") && "bg-success/10 text-success",
                      current.classification === "good" && "bg-accent/10 text-accent dark:text-accent-dark"
                    )}
                  >
                    {CLASSIFICATION_META[current.classification].label}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] text-muted dark:text-muted-dark">{current.summary}</p>
                {current.bestAlternativeSan && (
                  <p className="mt-1 text-[13px] text-muted dark:text-muted-dark">Engine preferred: {current.bestAlternativeSan}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-4 lg:w-80">
            <div className="rounded-xl border border-border bg-surface p-5 dark:border-border-dark dark:bg-surface-dark">
              <h3 className="mb-3 text-[14px] font-semibold text-ink dark:text-ink-dark">Game Summary</h3>
              <div className="text-[13px] text-muted dark:text-muted-dark">Estimated accuracy (application estimate): {summary.accuracy.toFixed(0)}%</div>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {(Object.keys(summary.counts) as MoveClassification[]).map((c) => (
                  <li key={c} className="flex justify-between text-ink dark:text-ink-dark">
                    <span>{CLASSIFICATION_META[c].label}</span>
                    <span className="tabular-nums">{summary.counts[c]}</span>
                  </li>
                ))}
              </ul>
              {summary.worst && (
                <div className="mt-3 border-t border-border pt-3 text-[13px] text-muted dark:border-border-dark dark:text-muted-dark">
                  Biggest missed opportunity: move {summary.worst.ply + 1} ({summary.worst.san})
                </div>
              )}
            </div>
            <MoveHistory sanMoves={coached.map((m) => m.san)} activeIndex={currentIndex} onSelectMove={setCurrentIndex} />
          </div>
        </div>
      )}
    </div>
  );
}
