import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "../../components/ChessBoard/ChessBoard";
import {
  dailyPuzzle,
  getStreak,
  incrementStreak,
  loadPuzzles,
  randomPuzzle,
  resetStreak,
  type Puzzle,
} from "../../services/puzzles/puzzleService";

type PuzzleStatus = "playing" | "solved" | "failed" | "revealed";

export function Puzzles() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [current, setCurrent] = useState<Puzzle | null>(null);
  const [status, setStatus] = useState<PuzzleStatus>("playing");
  const [fen, setFen] = useState("");
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [streak, setStreak] = useState(getStreak());
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    void loadPuzzles().then((loaded) => {
      setPuzzles(loaded);
      startPuzzle(dailyPuzzle(loaded));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPuzzle(puzzle: Puzzle) {
    setCurrent(puzzle);
    setFen(puzzle.fen);
    setLastMove(null);
    setMoveIndex(0);
    setStatus("playing");
    setShowHint(false);
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
      return true; // the illegal-for-the-puzzle move still visually happens; status banner explains it
    }

    setFen(game.fen());
    setLastMove({ from, to });
    const nextIndex = moveIndex + 1;

    if (nextIndex >= current.solution.length) {
      setStatus("solved");
      setStreak(incrementStreak());
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

  if (!current) {
    return <p className="text-[13px] text-muted dark:text-muted-dark">Loading puzzles…</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2">
        <div className="max-h-full w-full min-h-0 max-w-[480px] flex-1">
          <ChessBoard fen={fen} onMove={handleMove} orientation="white" draggable={status === "playing"} lastMove={lastMove} />
        </div>

        {status === "solved" && <div className="shrink-0 text-[14px] font-medium text-success">Solved!</div>}
        {status === "failed" && <div className="shrink-0 text-[14px] font-medium text-blunder">Not quite — try again.</div>}
        {status === "revealed" && <div className="shrink-0 text-[14px] font-medium text-ink dark:text-ink-dark">Solution: {current.solution.join(" → ")}</div>}
        {status === "playing" && (
          <div className="shrink-0 text-[13px] text-ink dark:text-ink-dark">
            {current.fen.includes(" w ") === (moveIndex % 2 === 0) ? "White" : "Black"} to move · find the best move
          </div>
        )}

        <div className="flex shrink-0 flex-wrap justify-center gap-2">
          <button onClick={() => setShowHint((v) => !v)} className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/20 dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark">
            {showHint ? `Hint: ${current.solution[moveIndex]?.slice(0, 2)}` : "Hint"}
          </button>
          <button onClick={revealSolution} className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/20 dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark">
            Reveal Solution
          </button>
          <button onClick={() => startPuzzle(current)} className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/20 dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark">
            Reset
          </button>
          <button
            onClick={() => startPuzzle(randomPuzzle(puzzles, current.id))}
            className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-accent/90 dark:bg-accent-dark dark:text-ink dark:hover:bg-accent-dark/90"
          >
            Next Puzzle
          </button>
        </div>
      </div>

      <div className="max-h-[42dvh] min-h-0 w-full overflow-y-auto lg:max-h-none lg:w-72">
        <div className="rounded-xl border border-border bg-surface p-5 dark:border-border-dark dark:bg-surface-dark">
          <h3 className="mb-3 text-[14px] font-semibold text-ink dark:text-ink-dark">Puzzle</h3>
          <div className="space-y-1.5 text-[13px] text-muted dark:text-muted-dark">
            <div>Theme: {current.theme}</div>
            <div>Rating: {current.rating}</div>
            <div>Streak: {streak}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
