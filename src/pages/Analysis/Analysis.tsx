import { useEffect, useMemo, useRef, useState } from "react";
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
  const [cancelled, setCancelled] = useState(false);
  const continueRef = useRef(true);

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
    setCancelled(false);
    continueRef.current = true;
    try {
      const result = await reviewGame(
        pgn,
        engine.evaluate,
        (done, total) => setProgress({ done, total }),
        () => continueRef.current,
      );
      setCoached(result);
      setCurrentIndex(result.length - 1);
    } finally {
      setReviewing(false);
    }
  };

  const cancelAnalysis = () => {
    continueRef.current = false;
    setCancelled(true);
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

  const displayFen = currentIndex < 0 ? START_FEN : (coached?.[currentIndex]?.fenAfter ?? START_FEN);
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
    <div className="flex h-full min-h-0 flex-col gap-4">
      {!coached && (
        <div className="mx-auto w-full max-w-xl pb-24">
          <h1 className="mb-6 text-[26px] font-semibold tracking-tight text-ink">Analysis</h1>

          {games.length > 0 && (
            <div className="mb-4">
              <label className="mb-1.5 block text-[13px] font-medium text-muted">Review a saved game</label>
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px]"
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

          <label className="mb-1.5 block text-[13px] font-medium text-muted">Or paste a PGN</label>
          <textarea
            value={pgnInput}
            onChange={(e) => setPgnInput(e.target.value)}
            rows={6}
            placeholder="1. e4 e5 2. Nf3 Nc6 ..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px]"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => runAnalysis(pgnInput)}
              disabled={reviewing || !pgnInput.trim() || engine.status !== "ready"}
              className="flex-1 rounded-full bg-accent px-4 py-3 text-[14px] font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {reviewing ? `Analyzing ${progress.done}/${progress.total}…` : engine.status !== "ready" ? "Loading engine…" : "Analyze Game"}
            </button>
            {reviewing && (
              <button
                onClick={cancelAnalysis}
                disabled={cancelled}
                className="rounded-full border border-border px-4 py-3 text-[14px] font-medium text-ink transition-colors hover:border-ink/20 disabled:opacity-50"
              >
                {cancelled ? "Stopping…" : "Cancel"}
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-[13px] text-blunder">{error}</p>}
        </div>
      )}

      {coached && summary && (
        <div className="flex h-full flex-col gap-4 short:min-h-0 short:flex-row tabletLandscape:min-h-0 tabletLandscape:flex-row lg:min-h-0 lg:flex-row">
          <div className="flex flex-1 flex-col items-center gap-2 short:min-h-0 short:gap-1 tabletLandscape:min-h-0 lg:min-h-0">
            <div className="flex w-full min-h-[240px] max-w-[560px] flex-1 items-stretch gap-2 short:min-h-[220px] short:max-h-[220px]">
              <div className="h-full">
                <EvaluationBar cp={current?.evalAfter.cp ?? null} mate={current?.evalAfter.mate ?? null} />
              </div>
              <div className="h-full max-h-full flex-1">
                <ChessBoard
                  fen={displayFen}
                  onMove={() => false}
                  orientation="white"
                  draggable={false}
                  lastMove={current ? { from: current.uci.slice(0, 2), to: current.uci.slice(2, 4) } : null}
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 short:hidden">
              <button
                onClick={() => setCurrentIndex(-1)}
                aria-label="Go to start"
                className="rounded-full border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-ink/20"
              >
                ⏮
              </button>
              <button
                onClick={() => setCurrentIndex((i) => Math.max(-1, i - 1))}
                aria-label="Previous move"
                className="rounded-full border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-ink/20"
              >
                ◀
              </button>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(coached.length - 1, i + 1))}
                aria-label="Next move"
                className="rounded-full border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-ink/20"
              >
                ▶
              </button>
              <button
                onClick={() => setCurrentIndex(coached.length - 1)}
                aria-label="Go to end"
                className="rounded-full border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-ink/20"
              >
                ⏭
              </button>
              <button
                onClick={() => setCoached(null)}
                className="ml-3 rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium transition-colors hover:border-ink/20"
              >
                New analysis
              </button>
            </div>

            {current && (
              <div className="w-full max-w-[560px] shrink-0 rounded-xl border border-border bg-surface p-4 short:hidden" role="status" aria-live="polite">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-ink">{current.san}</span>
                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium",
                      current.classification === "blunder" && "bg-blunder/10 text-blunder",
                      current.classification === "mistake" && "bg-mistake/10 text-mistake",
                      current.classification === "inaccuracy" && "bg-warning/10 text-warning",
                      (current.classification === "best" || current.classification === "excellent") && "bg-success/10 text-success",
                      current.classification === "good" && "bg-accent/10 text-accent",
                    )}
                  >
                    {CLASSIFICATION_META[current.classification].label}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] text-muted">{current.summary}</p>
                {current.bestAlternativeSan && <p className="mt-1 text-[13px] text-muted">Engine preferred: {current.bestAlternativeSan}</p>}
              </div>
            )}
          </div>

          <div className="flex max-h-[42dvh] min-h-0 w-full flex-col gap-4 overflow-y-auto short:max-h-none short:w-80 tabletLandscape:max-h-none tabletLandscape:w-80 lg:max-h-none lg:w-80">
            <div className="hidden shrink-0 flex-col gap-2 short:sticky short:top-0 short:z-10 short:flex short:bg-bg short:pb-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentIndex(-1)}
                  aria-label="Go to start"
                  className="rounded-full border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-ink/20"
                >
                  ⏮
                </button>
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(-1, i - 1))}
                  aria-label="Previous move"
                  className="rounded-full border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-ink/20"
                >
                  ◀
                </button>
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(coached.length - 1, i + 1))}
                  aria-label="Next move"
                  className="rounded-full border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-ink/20"
                >
                  ▶
                </button>
                <button
                  onClick={() => setCurrentIndex(coached.length - 1)}
                  aria-label="Go to end"
                  className="rounded-full border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-ink/20"
                >
                  ⏭
                </button>
                <button
                  onClick={() => setCoached(null)}
                  className="ml-3 rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium transition-colors hover:border-ink/20"
                >
                  New analysis
                </button>
              </div>
              {current && (
                <div className="w-full shrink-0 rounded-xl border border-border bg-surface p-4" role="status" aria-live="polite">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-ink">{current.san}</span>
                    <span
                      className={clsx(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium",
                        current.classification === "blunder" && "bg-blunder/10 text-blunder",
                        current.classification === "mistake" && "bg-mistake/10 text-mistake",
                        current.classification === "inaccuracy" && "bg-warning/10 text-warning",
                        (current.classification === "best" || current.classification === "excellent") && "bg-success/10 text-success",
                        current.classification === "good" && "bg-accent/10 text-accent",
                      )}
                    >
                      {CLASSIFICATION_META[current.classification].label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] text-muted">{current.summary}</p>
                  {current.bestAlternativeSan && <p className="mt-1 text-[13px] text-muted">Engine preferred: {current.bestAlternativeSan}</p>}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="mb-3 text-[14px] font-semibold text-ink">Game Summary</h3>
              <div className="text-[13px] text-muted">Estimated accuracy (application estimate): {summary.accuracy.toFixed(0)}%</div>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {(Object.keys(summary.counts) as MoveClassification[]).map((c) => (
                  <li key={c} className="flex justify-between text-ink">
                    <span>{CLASSIFICATION_META[c].label}</span>
                    <span className="tabular-nums">{summary.counts[c]}</span>
                  </li>
                ))}
              </ul>
              {summary.worst && (summary.worst.classification === "mistake" || summary.worst.classification === "blunder") && (
                <div className="mt-3 border-t border-border pt-3 text-[13px] text-muted">
                  Biggest missed opportunity: move {summary.worst.ply + 1} ({summary.worst.san})
                </div>
              )}
              {summary.bestOfGame && (
                <div className="mt-2 text-[13px] text-muted">
                  Best move: move {summary.bestOfGame.ply + 1} ({summary.bestOfGame.san})
                </div>
              )}
              {cancelled && (
                <div className="mt-3 border-t border-border pt-3 text-[13px] text-warning">Analysis stopped early - showing partial results.</div>
              )}
            </div>
            <MoveHistory sanMoves={coached.map((m) => m.san)} activeIndex={currentIndex} onSelectMove={setCurrentIndex} />
          </div>
        </div>
      )}
    </div>
  );
}
