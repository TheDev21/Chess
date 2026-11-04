import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Puzzle as PuzzleIcon, Gamepad2, Flame, ArrowRight, PartyPopper, Trophy, History } from "lucide-react";
import { ChessBoard } from "../../components/ChessBoard/ChessBoard";
import { CHAPTERS, findLesson } from "../../lessons/lessonData";
import { loadLessonProgress } from "../../services/storage/lessonProgress";
import { listGames } from "../../services/storage/gameHistory";
import { getStreak, getSolvedCount, dailyPuzzle, loadPuzzles, type Puzzle } from "../../services/puzzles/puzzleService";
import { getDailyPuzzleState, getSolvedPuzzleIds } from "../../services/storage/puzzleProgress";
import type { StoredGame } from "../../types/chess";

const ALL_LESSONS = CHAPTERS.flatMap((c) => c.lessons.map((l) => ({ chapterId: c.id, lessonId: l.id, title: l.title, chapterTitle: c.title })));

function gameOutcome(game: StoredGame): "win" | "loss" | "draw" | null {
  if (game.result === "1/2-1/2") return "draw";
  const whiteWon = game.result === "1-0";
  const blackWon = game.result === "0-1";
  if (!whiteWon && !blackWon) return null; // unfinished ("*")
  const playerWon = (whiteWon && game.playerColor === "white") || (blackWon && game.playerColor === "black");
  return playerWon ? "win" : "loss";
}

export function Home() {
  const progress = loadLessonProgress();
  const lessonsDone = progress.completedLessons.length;
  const games = listGames();
  const gamesPlayed = games.length;
  const puzzlesSolved = getSolvedCount();
  const streak = getStreak();

  const nextLesson = ALL_LESSONS.find((l) => !progress.completedLessons.includes(`${l.chapterId}/${l.lessonId}`)) ?? ALL_LESSONS[0];
  const lessonsAllDone = !ALL_LESSONS.some((l) => !progress.completedLessons.includes(`${l.chapterId}/${l.lessonId}`));
  const lessonPct = Math.round((lessonsDone / ALL_LESSONS.length) * 100);
  const found = findLesson(nextLesson.chapterId, nextLesson.lessonId);

  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [daily, setDaily] = useState<Puzzle | null>(null);
  useEffect(() => {
    void loadPuzzles().then((loaded) => {
      setPuzzles(loaded);
      setDaily(dailyPuzzle(loaded));
    });
  }, []);

  const solvedIds = getSolvedPuzzleIds();
  const puzzleCollectionDone = puzzles.length > 0 && puzzles.every((p) => solvedIds.includes(p.id));
  const dailyState = daily ? getDailyPuzzleState(daily.id) : null;

  const record = games.reduce(
    (acc, g) => {
      const outcome = gameOutcome(g);
      if (outcome === "win") acc.wins++;
      else if (outcome === "loss") acc.losses++;
      else if (outcome === "draw") acc.draws++;
      return acc;
    },
    { wins: 0, losses: 0, draws: 0 },
  );
  const recentGames = games.slice(0, 3);

  // One honest, data-derived nudge - never a fabricated pattern like"you keep missing forks"
  // unless real per-move mistake data is tracked somewhere, which it isn't today.
  let tip: string | null = null;
  if (lessonsAllDone && gamesPlayed === 0) {
    tip = "You've finished every lesson. Try your first game against the computer in Play.";
  } else if (gamesPlayed >= 3 && record.losses > record.wins + record.draws) {
    tip = "A few tough games lately. Reviewing one in Analysis, or trying an easier difficulty, can help.";
  } else if (lessonsAllDone && puzzleCollectionDone && gamesPlayed > 0) {
    tip = "You've covered every lesson and puzzle here. Keep sharpening with the daily puzzle and your games.";
  }

  return (
    <div className="relative -mx-5 -mt-4 px-5 pt-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
      {/* The king photo itself is rendered once in App.tsx, shared by every page - this page
 only supplies the content on top of it. */}
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-start py-14 sm:py-20">
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-ink sm:text-[44px]">Welcome to ChessGuru!</h1>
          <p className="mt-2 text-[16px] font-medium text-ink sm:text-[18px]">Learn chess one move at a time.</p>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#4a3728] sm:text-[15px]">
            Start with the basics, practice at your own pace, and become confident playing chess.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/learn"
              className="flex items-center gap-1.5 rounded-full bg-accent px-6 py-3 text-[14px] font-medium text-ink transition-colors hover:bg-accent/90"
            >
              Start Learning <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/play"
              className="rounded-full border border-ink/15 bg-[#f6f3e8]/50 px-6 py-3 text-[14px] font-medium text-ink backdrop-blur-[2px] transition-colors hover:bg-ink/[0.06]"
            >
              Explore Chess
            </Link>
          </div>
        </div>

        {/* Continue Learning (or its completion state) + Daily Puzzle, side by side at every
 width (including mobile) - each a translucent boxed card so it reads as tappable. */}
        <div className="grid grid-cols-2 gap-4 pt-6 sm:gap-8">
          {!lessonsAllDone && found ? (
            <Link
              to={`/learn/${nextLesson.chapterId}/${nextLesson.lessonId}`}
              className="group flex gap-2 rounded-xl border border-ink/15 bg-[#f6f3e8]/50 p-3 backdrop-blur-[2px] transition-colors hover:bg-ink/[0.06] sm:gap-4 sm:p-4"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-20">
                <ChessBoard
                  fen={found.lesson.watch[0]?.fen ?? found.lesson.tryIt.fen}
                  onMove={() => false}
                  orientation="white"
                  draggable={false}
                  showCoordinates={false}
                  showLegalMoves={false}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#4a3728] sm:text-[12px]">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> <span className="truncate">Continue Learning</span>
                  <span className="ml-auto hidden shrink-0 text-[11px] text-[#4a3728] sm:inline">
                    {lessonsDone} / {ALL_LESSONS.length}
                  </span>
                </span>
                <div className="mt-1.5 h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-ink/20">
                  <div className="h-full rounded-full bg-accent-dark" style={{ width: `${lessonPct}%` }} />
                </div>
                <span className="mt-1.5 text-[14px] font-semibold leading-snug text-ink sm:text-[16px]">{nextLesson.title}</span>
                <span className="mt-0.5 hidden text-[12px] text-[#4a3728] sm:block">{found.lesson.summary}</span>
                <span className="mt-auto flex w-fit items-center gap-1 text-[11px] font-medium text-ink underline-offset-2 group-hover:underline sm:text-[12px]">
                  Continue Lesson <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-ink/15 bg-[#f6f3e8]/50 p-3 backdrop-blur-[2px] sm:p-4">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                <PartyPopper className="h-3.5 w-3.5" strokeWidth={1.75} /> Lessons complete, {lessonPct}%
              </span>
              <div className="-mt-1.5 h-1 w-full max-w-[160px] overflow-hidden rounded-full bg-ink/20">
                <div className="h-full rounded-full bg-accent-dark" style={{ width: `${lessonPct}%` }} />
              </div>
              <p className="text-[12px] leading-relaxed text-[#4a3728] sm:text-[13px]">
                <span className="sm:hidden">Nice work. Put it into practice, or revisit any lesson any time.</span>
                <span className="hidden sm:inline">
                  Nice work, you've finished every beginner lesson available. Put it into practice against the computer, work through some puzzles, or revisit
                  any lesson any time. More chapters are on the way.
                </span>
              </p>
            </div>
          )}

          {daily && dailyState && (
            <Link
              to="/puzzles"
              className="group mt-12 flex gap-2 rounded-xl border border-ink/15 bg-[#f6f3e8]/50 p-3 backdrop-blur-[2px] transition-colors hover:bg-ink/[0.06] sm:mt-0 sm:gap-4 sm:p-4"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-20">
                <ChessBoard fen={daily.fen} onMove={() => false} orientation="white" draggable={false} showCoordinates={false} showLegalMoves={false} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#4a3728] sm:text-[12px]">
                  <PuzzleIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> <span className="truncate">Daily Puzzle</span>
                  {dailyState.solved && <span className="ml-auto hidden shrink-0 text-[11px] font-medium text-ink sm:inline">Solved today</span>}
                </span>
                <span className="mt-1 text-[14px] font-semibold leading-snug text-ink sm:text-[16px]">{daily.theme}</span>
                <span className="mt-0.5 hidden text-[12px] text-[#4a3728] sm:block">
                  {dailyState.solved ? "Review the solution, or come back tomorrow for a new one." : `Can you find the best move? Rated ${daily.rating}.`}
                </span>
                <span className="mt-auto flex w-fit items-center gap-1 text-[11px] font-medium text-ink underline-offset-2 group-hover:underline sm:text-[12px]">
                  {dailyState.solved ? "Review Puzzle" : "Solve Puzzle"} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          )}
        </div>

        {puzzleCollectionDone && (
          <div className="mt-6 pt-2 text-[13px] leading-relaxed text-[#4a3728]">
            <span className="font-medium text-ink">You've solved every puzzle in the starter collection.</span>
            {" "}
            Replay any of them for practice, or browse by theme to focus on one idea. The daily puzzle keeps going too.{" "}
            <Link to="/puzzles" className="font-medium text-ink underline-offset-2 hover:underline">
              Browse puzzles
            </Link>
          </div>
        )}

        {recentGames.length > 0 && (
          <div className="mt-6 pt-2">
            <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-[#4a3728]">
              <History className="h-3.5 w-3.5" strokeWidth={1.75} /> Recent games
            </h2>
            <div className="flex flex-col divide-y divide-ink/15 rounded-xl border border-ink/15 bg-[#f6f3e8]/50 backdrop-blur-[2px]">
              {recentGames.map((g) => {
                const outcome = gameOutcome(g);
                const label = outcome === "win" ? "Win" : outcome === "loss" ? "Loss" : outcome === "draw" ? "Draw" : "Unfinished";
                const tone = outcome === "win" ? "text-success" : outcome === "loss" ? "text-blunder" : "text-[#4a3728]";
                return (
                  <div key={g.id} className="flex items-center justify-between gap-3 p-4">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-ink">vs {g.opponent}</span>
                      <span className="block text-[12px] text-[#4a3728]">
                        {new Date(g.playedAt).toLocaleDateString()} &middot; {g.moveCount} moves
                      </span>
                    </span>
                    <span className={`text-[12px] font-medium ${tone}`}>{label}</span>
                    <Link to="/analysis" state={{ pgn: g.pgn }} className="text-[12px] font-medium text-ink underline-offset-2 hover:underline">
                      Review
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <h2 className="mb-3 mt-8 pt-2 text-[13px] font-medium text-[#4a3728]">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction to="/learn" icon={BookOpen} label="Learn" />
          <QuickAction to="/play" icon={Gamepad2} label="Play" />
          <QuickAction to="/puzzles" icon={PuzzleIcon} label="Puzzles" />
        </div>

        <h2 className="mb-3 mt-8 text-[13px] font-medium text-[#4a3728]">Your progress</h2>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <ProgressItem icon={BookOpen} label="Lessons Completed" value={`${lessonsDone} / ${ALL_LESSONS.length}`} />
          <ProgressItem icon={PuzzleIcon} label="Puzzles Solved" value={puzzlesSolved} />
          <ProgressItem icon={Gamepad2} label="Games Played" value={gamesPlayed} />
          {gamesPlayed > 0 && <ProgressItem icon={Trophy} label="Record (W-L-D)" value={`${record.wins}-${record.losses}-${record.draws}`} />}
          <ProgressItem icon={Flame} label="Current Streak" value={streak > 0 ? `${streak} day${streak === 1 ? "" : "s"}` : "-"} />
        </div>

        {tip && <p className="mt-6 text-center text-[13px] text-[#4a3728]">{tip}</p>}
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof BookOpen; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-lg border border-ink/15 bg-[#f6f3e8]/50 px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-ink/[0.06]"
    >
      <Icon className="h-4 w-4 text-[#4a3728]" strokeWidth={1.75} />
      {label}
    </Link>
  );
}

function ProgressItem({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string | number }) {
  return (
    <span className="flex items-center gap-2 text-[13px] text-ink">
      <Icon className="h-4 w-4 shrink-0 text-[#4a3728]" strokeWidth={1.75} />
      <span>
        <span className="font-semibold tabular-nums">{value}</span>
        {" "}
        <span className="text-[#4a3728]">{label}</span>
      </span>
    </span>
  );
}
