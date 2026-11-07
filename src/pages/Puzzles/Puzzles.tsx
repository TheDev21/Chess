import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Trophy, Flame, Calendar, LayoutGrid, Tags, ChevronLeft, CheckCircle2 } from "lucide-react";
import { ChessBoard } from "../../components/ChessBoard/ChessBoard";
import { dailyPuzzle, getStreak, incrementStreak, loadPuzzles, randomPuzzle, resetStreak, type Puzzle } from "../../services/puzzles/puzzleService";
import { markPuzzleSolved, markDailyPuzzleSolved, isPuzzleSolved } from "../../services/storage/puzzleProgress";

type PuzzleStatus = "playing" | "solved" | "failed" | "revealed";
type BrowseTab = "daily" | "all" | "theme";

export function Puzzles() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [current, setCurrent] = useState<Puzzle | null>(null);
  const [status, setStatus] = useState<PuzzleStatus>("playing");
  const [fen, setFen] = useState("");
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [streak, setStreak] = useState(getStreak());
  const [showHint, setShowHint] = useState(false);

  const [tab, setTab] = useState<BrowseTab>("daily");
  const [browsing, setBrowsing] = useState(false); // true while showing the All/By Theme list instead of a board

  useEffect(() => {
    void loadPuzzles().then((loaded) => {
      setPuzzles(loaded);
      startPuzzle(dailyPuzzle(loaded));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byTheme = useMemo(() => {
    const groups = new Map<string, Puzzle[]>();
    for (const p of puzzles) {
      const list = groups.get(p.theme) ?? [];
      list.push(p);
      groups.set(p.theme, list);
    }
    return groups;
  }, [puzzles]);

  function startPuzzle(puzzle: Puzzle) {
    setCurrent(puzzle);
    setFen(puzzle.fen);
    setLastMove(null);
    setMoveIndex(0);
    setStatus("playing");
    setShowHint(false);
    setBrowsing(false);
  }

  function selectTab(next: BrowseTab) {
    setTab(next);
    if (next === "daily") {
      startPuzzle(dailyPuzzle(puzzles));
    } else {
      setBrowsing(true);
    }
  }

  function recordSolve(puzzle: Puzzle) {
    markPuzzleSolved(puzzle.id);
    if (puzzle.id === dailyPuzzle(puzzles).id) markDailyPuzzleSolved(puzzle.id);
  }

  function handleMove(from: string, to: string, promotion?: string): boolean {
    if (!current || status !== "playing") return false;
    const expected = current.solution[moveIndex];
    const expectedFrom = expected.slice(0, 2);
    const expectedTo = expected.slice(2, 4);

    const game = new Chess(fen);
    let move;
    try {
      move = game.move({ from, to, promotion: (promotion as "q" | "r" | "b" | "n" | undefined) || "q" });
    } catch {
      move = null;
    }
    if (!move) return false;

    if (from !== expectedFrom || to !== expectedTo) {
      setStatus("failed");
      setLastMove({ from, to });
      resetStreak();
      setStreak(0);
      // `fen` deliberately isn't updated here: ChessBoard's position is controlled by it, so
      // the wrong move never visually lands - the board stays on the puzzle's original
      // position and the status banner below explains why, rather than leaving the learner
      // looking at an incorrect position they'd have to manually reset.
      return true;
    }

    setFen(game.fen());
    setLastMove({ from, to });
    const nextIndex = moveIndex + 1;

    if (nextIndex >= current.solution.length) {
      setStatus("solved");
      setStreak(incrementStreak());
      recordSolve(current);
      return true;
    }

    // Auto-play the opponent's forced reply, if the puzzle has one.
    const replyUci = current.solution[nextIndex];
    if (replyUci) {
      const replyFrom = replyUci.slice(0, 2);
      const replyTo = replyUci.slice(2, 4);
      const replyPromotion = replyUci.length > 4 ? replyUci.slice(4, 5) : undefined;
      setTimeout(() => {
        const g2 = new Chess(game.fen());
        try {
          g2.move({ from: replyFrom, to: replyTo, promotion: (replyPromotion as "q" | "r" | "b" | "n" | undefined) || "q" });
          setFen(g2.fen());
          setLastMove({ from: replyFrom, to: replyTo });
          setMoveIndex(nextIndex + 1);
          if (nextIndex + 1 >= current.solution.length) {
            setStatus("solved");
            setStreak(incrementStreak());
            recordSolve(current);
          }
        } catch {
          /* no scripted reply at this ply */
        }
      }, 400);
    } else {
      setMoveIndex(nextIndex);
    }

    return true;
  }

  function revealSolution() {
    if (!current) return;
    const game = new Chess(current.fen);
    let last: { from: string; to: string } | null = null;
    for (const uci of current.solution) {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
      try {
        game.move({ from, to, promotion: (promotion as "q" | "r" | "b" | "n" | undefined) || "q" });
        last = { from, to };
      } catch {
        break;
      }
    }
    setFen(game.fen());
    setLastMove(last);
    setStatus("revealed");
    resetStreak();
    setStreak(0);
  }

  const TABS: { id: BrowseTab; label: string; icon: typeof Calendar }[] = [
    { id: "daily", label: "Daily Puzzle", icon: Calendar },
    { id: "all", label: "All Puzzles", icon: LayoutGrid },
    { id: "theme", label: "By Theme", icon: Tags },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-ink">
          <Trophy className="h-5 w-5 text-accent" strokeWidth={1.75} />
          Puzzles
        </h1>
        {streak > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-[12px] font-medium text-warning">
            <Flame className="h-3.5 w-3.5" />
            {streak} in a row
          </span>
        )}
      </div>

      <div className="flex max-w-full shrink-0 gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1 shadow-card">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors duration-200 sm:px-3.5 ${
              tab === t.id ? "bg-accent text-bg" : "text-muted hover:text-ink"
            }`}
          >
            <t.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {t.label}
          </button>
        ))}
      </div>

      {browsing ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "all" && (
            <>
              {puzzles.length > 0 && puzzles.every((p) => isPuzzleSolved(p.id)) && (
                <div className="mb-4 rounded-xl border border-success/30 bg-success/5 p-4 text-[13px] text-ink">
                  You've solved every puzzle in this set. Replay any of them below, or try sorting by theme to focus on one idea.
                </div>
              )}
              <PuzzleList puzzles={puzzles} onSelect={startPuzzle} />
            </>
          )}
          {tab === "theme" && (
            <div className="flex flex-col gap-5">
              {[...byTheme.entries()].map(([theme, list]) => (
                <div key={theme}>
                  <h2 className="mb-2 text-[13px] font-semibold text-ink">{theme}</h2>
                  <PuzzleList puzzles={list} onSelect={startPuzzle} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : current ? (
        <div className="flex flex-1 flex-col gap-4 lg:min-h-0 lg:flex-row">
          <div className="flex flex-1 flex-col items-center gap-2 lg:min-h-0">
            {tab !== "daily" && (
              <button onClick={() => setBrowsing(true)} className="flex shrink-0 items-center gap-1 self-start text-[13px] text-muted hover:text-ink">
                <ChevronLeft className="h-4 w-4" /> Back to list
              </button>
            )}
            <div className="max-h-full w-full min-h-[240px] max-w-[480px] flex-1">
              <ChessBoard fen={fen} onMove={handleMove} orientation="white" draggable={status === "playing"} lastMove={lastMove} />
            </div>

            {status === "solved" && (
              <div className="shrink-0 text-[14px] font-medium text-success" role="status" aria-live="polite">
                Solved!
              </div>
            )}
            {status === "failed" && (
              <div className="shrink-0 text-[14px] font-medium text-blunder" role="status" aria-live="polite">
                Not quite, try again.
              </div>
            )}
            {status === "revealed" && (
              <div className="shrink-0 text-[14px] font-medium text-ink" role="status" aria-live="polite">
                Solution: {current.solution.join(" → ")}
              </div>
            )}
            {status === "playing" && (
              <div className="shrink-0 text-[13px] text-ink">
                {current.fen.includes(" w ") === (moveIndex % 2 === 0) ? "White" : "Black"} to move · find the best move
              </div>
            )}

            <div className="flex shrink-0 flex-wrap justify-center gap-2">
              <button
                onClick={() => startPuzzle(current)}
                className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-ink shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-panel"
              >
                Reset
              </button>
              <button
                onClick={() => startPuzzle(randomPuzzle(puzzles, current.id))}
                className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-medium text-bg shadow-card transition-all duration-200 hover:bg-accentDeep hover:shadow-panel"
              >
                Next Puzzle
              </button>
            </div>
          </div>

          <div className="max-h-[42dvh] min-h-0 w-full overflow-y-auto lg:max-h-none lg:w-80">
            <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <h3 className="text-[18px] font-semibold text-ink">{current.theme}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                Find the move that gives {current.fen.includes(" w ") ? "White" : "Black"} the advantage. Rated {current.rating}.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => setShowHint((v) => !v)}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-3.5 py-2.5 text-[13px] font-medium text-bg shadow-card transition-all duration-200 hover:bg-accentDeep hover:shadow-panel"
                >
                  {showHint ? `Hint: ${current.solution[moveIndex]?.slice(0, 2)}` : "Show Hint"}
                </button>
                <button
                  onClick={revealSolution}
                  className="flex items-center justify-center gap-1.5 rounded-full border border-border px-3.5 py-2.5 text-[13px] font-medium text-ink transition-colors duration-200 hover:bg-accent/[0.05]"
                >
                  Show Solution
                </button>
              </div>
              <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-[12px] text-muted">
                <div>Theme: {current.theme}</div>
                <div>Rating: {current.rating}</div>
                <div>Streak: {streak}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-muted">Loading puzzles…</p>
      )}
    </div>
  );
}

function PuzzleList({ puzzles, onSelect }: { puzzles: Puzzle[]; onSelect: (p: Puzzle) => void }) {
  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface shadow-card">
      {puzzles.map((p) => {
        const solved = isPuzzleSolved(p.id);
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="flex items-center justify-between gap-3 p-4 text-left transition-colors duration-200 hover:bg-accent/[0.05]"
          >
            <span className="flex items-center gap-2.5">
              {solved && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" strokeWidth={1.75} />}
              <span>
                <span className="block text-[14px] font-medium text-ink">{p.theme}</span>
                <span className="block text-[12px] text-muted">Rating {p.rating}</span>
              </span>
            </span>
            <span className="rounded-full border border-border px-3 py-1 text-[12px] font-medium text-ink">{solved ? "Replay" : "Solve"}</span>
          </button>
        );
      })}
    </div>
  );
}
