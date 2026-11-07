import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Puzzle as PuzzleIcon, Gamepad2, Flame, ArrowRight, PartyPopper, Trophy, History } from "lucide-react";
import { ChessBoard } from "../../components/ChessBoard/ChessBoard";
import heroKingImg from "../../assets/chess-king-gold-2.png";
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

  // Pass-and-Play games are excluded here: both sides are human, so there is
  // no single "the player" for playerColor to identify, and counting them
  // would misattribute one local player's result as the device owner's.
  const record = games
    .filter((g) => g.mode !== "friend")
    .reduce(
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

  // One honest, data-derived nudge - never a fabricated pattern like "you keep missing forks"
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
    <div className="mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-xl border border-border shadow-card sm:max-w-3xl">
        {/* The photo itself is the hero - a plain, full-width <img> at its
            natural aspect ratio (never cropped, never stretched). Text and
            buttons sit on top of it as an absolutely positioned overlay;
            there is no separate box/panel behind them. */}
        <img src={heroKingImg} alt="" aria-hidden="true" className="block h-auto w-full" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(35,55,46,0.6) 0%, rgba(35,55,46,0.2) 60%, rgba(35,55,46,0) 100%)" }}
        />
        <div className="absolute inset-0 flex flex-col items-start justify-center p-6 sm:p-10">
          <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-ink sm:text-[44px]">Welcome to ChessGuru.</h1>
          <p className="mt-2 text-[16px] font-medium text-ink sm:text-[18px]">One move at a time.</p>
          <p className="mt-3 hidden max-w-md text-[14px] leading-relaxed text-muted sm:block sm:text-[15px]">
            Learn the basics, practice slow and steady, become confident chess player.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/learn"
              className="flex items-center gap-1.5 rounded-full bg-accent px-6 py-3 text-[14px] font-medium text-bg shadow-card transition-all duration-200 hover:brightness-110 hover:shadow-panel"
            >
              Start Learning <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/play"
              className="rounded-full border border-border bg-bg px-6 py-3 text-[14px] font-medium text-ink shadow-card transition-all duration-200 hover:border-gold/60 hover:shadow-panel"
            >
              Let's Play!
            </Link>
          </div>
        </div>
      </div>

      {/* Continue Learning (or its completion state) + Daily Puzzle. Equal-height cards (grid's
          default align-items: stretch, or flex's on mobile, does the stretching - each card
          just needs h-full so it actually fills that stretched space). On mobile this is a
          horizontal snap-scroll carousel (swipe to the next card) instead of two squeezed
          columns; at sm+ it becomes the regular two-column grid. */}
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pt-6 sm:grid sm:grid-cols-2 sm:gap-8 sm:overflow-visible">
        <div className="w-[85%] shrink-0 snap-center sm:w-auto">
          {!lessonsAllDone && found ? (
            <Link
              to={`/learn/${nextLesson.chapterId}/${nextLesson.lessonId}`}
              className="group flex h-full gap-2 rounded-xl border border-border bg-surface p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-elevated hover:shadow-panel sm:gap-4 sm:p-4"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-20">
                <ChessBoard
                  fen={found.lesson.watch[0]?.fen ?? found.lesson.tryIt.fen}
                  onMove={() => false}
                  orientation="white"
                  draggable={false}
                  showCoordinates={false}
                  showLegalMoves={false}
                  decorative
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted sm:text-[12px]">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> <span className="truncate">Continue Learning</span>
                  <span className="ml-auto hidden shrink-0 text-[11px] text-muted sm:inline">
                    {lessonsDone} / {ALL_LESSONS.length}
                  </span>
                </span>
                <div className="mt-1.5 h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${lessonPct}%` }} />
                </div>
                <span className="mt-1.5 text-[14px] font-semibold leading-snug text-ink sm:text-[16px]">{nextLesson.title}</span>
                <span className="mt-0.5 hidden text-[12px] text-muted sm:block">{found.lesson.summary}</span>
                <span className="mt-auto flex w-fit items-center gap-1 text-[11px] font-medium text-gold underline-offset-2 group-hover:underline sm:text-[12px]">
                  Continue Lesson <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-card sm:p-4">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                <PartyPopper className="h-3.5 w-3.5" strokeWidth={1.75} /> Lessons complete, {lessonPct}%
              </span>
              <div className="-mt-1.5 h-1 w-full max-w-[160px] overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-gold" style={{ width: `${lessonPct}%` }} />
              </div>
              <p className="text-[12px] leading-relaxed text-muted sm:text-[13px]">
                <span className="sm:hidden">Nice work. Put it into practice, or revisit any lesson any time.</span>
                <span className="hidden sm:inline">
                  Nice work, you've finished every beginner lesson available. Put it into practice against the computer, work through some puzzles, or
                  revisit any lesson any time. More chapters are on the way.
                </span>
              </p>
            </div>
          )}
        </div>

        {daily && dailyState && (
          <div className="w-[85%] shrink-0 snap-center sm:w-auto">
            <Link
              to="/puzzles"
              className="group flex h-full gap-2 rounded-xl border border-border bg-surface p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-elevated hover:shadow-panel sm:gap-4 sm:p-4"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-20">
                <ChessBoard
                  fen={daily.fen}
                  onMove={() => false}
                  orientation="white"
                  draggable={false}
                  showCoordinates={false}
                  showLegalMoves={false}
                  decorative
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted sm:text-[12px]">
                  <PuzzleIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> <span className="truncate">Daily Puzzle</span>
                  {dailyState.solved && <span className="ml-auto hidden shrink-0 text-[11px] font-medium text-ink sm:inline">Solved today</span>}
                </span>
                <span className="mt-1 text-[14px] font-semibold leading-snug text-ink sm:text-[16px]">{daily.theme}</span>
                <span className="mt-0.5 hidden text-[12px] text-muted sm:block">
                  {dailyState.solved ? "Review the solution, or come back tomorrow for a new one." : `Can you find the best move? Rated ${daily.rating}.`}
                </span>
                <span className="mt-auto flex w-fit items-center gap-1 text-[11px] font-medium text-gold underline-offset-2 group-hover:underline sm:text-[12px]">
                  {dailyState.solved ? "Review Puzzle" : "Solve Puzzle"} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          </div>
        )}
      </div>

      {puzzleCollectionDone && (
        <div className="mt-6 rounded-xl border border-gold/25 bg-gold/5 p-4 text-[13px] leading-relaxed text-muted">
          <span className="font-medium text-ink">You've solved every puzzle in the starter collection.</span>{" "}
          Replay any of them for practice, or browse by theme to focus on one idea. The daily puzzle keeps going too.{" "}
          <Link to="/puzzles" className="font-medium text-gold underline-offset-2 hover:underline">
            Browse puzzles
          </Link>
        </div>
      )}

      {recentGames.length > 0 && (
        <div className="mt-6 pt-2">
          <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-muted">
            <History className="h-3.5 w-3.5" strokeWidth={1.75} /> Recent games
          </h2>
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface shadow-card">
            {recentGames.map((g) => {
              const outcome = gameOutcome(g);
              const label = outcome === "win" ? "Win" : outcome === "loss" ? "Loss" : outcome === "draw" ? "Draw" : "Unfinished";
              const tone = outcome === "win" ? "text-success" : outcome === "loss" ? "text-blunder" : "text-muted";
              return (
                <div key={g.id} className="flex items-center justify-between gap-3 p-4">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink">vs {g.opponent}</span>
                    <span className="block text-[12px] text-muted">
                      {new Date(g.playedAt).toLocaleDateString()} &middot; {g.moveCount} moves
                    </span>
                  </span>
                  <span className={`text-[12px] font-medium ${tone}`}>{label}</span>
                  <Link to="/analysis" state={{ pgn: g.pgn }} className="text-[12px] font-medium text-gold underline-offset-2 hover:underline">
                    Review
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="mb-3 mt-8 pt-2 text-[13px] font-medium text-muted">Quick actions</h2>
      <div className="flex flex-wrap gap-3">
        <QuickAction to="/learn" icon={BookOpen} label="Learn" />
        <QuickAction to="/play" icon={Gamepad2} label="Play" />
        <QuickAction to="/puzzles" icon={PuzzleIcon} label="Puzzles" />
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-medium text-muted">Your progress</h2>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <ProgressItem icon={BookOpen} label="Lessons Completed" value={`${lessonsDone} / ${ALL_LESSONS.length}`} />
        <ProgressItem icon={PuzzleIcon} label="Puzzles Solved" value={puzzlesSolved} />
        <ProgressItem icon={Gamepad2} label="Games Played" value={gamesPlayed} />
        {gamesPlayed > 0 && <ProgressItem icon={Trophy} label="Record (W-L-D)" value={`${record.wins}-${record.losses}-${record.draws}`} />}
        <ProgressItem icon={Flame} label="Current Streak" value={streak > 0 ? `${streak} day${streak === 1 ? "" : "s"}` : "-"} />
      </div>

      {tip && <p className="mt-6 text-center text-[13px] text-muted">{tip}</p>}
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof BookOpen; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-[13px] font-medium text-ink shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-elevated hover:shadow-panel"
    >
      <Icon className="h-4 w-4 text-gold" strokeWidth={1.75} />
      {label}
    </Link>
  );
}

function ProgressItem({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string | number }) {
  return (
    <span className="flex items-center gap-2 text-[13px] text-ink">
      <Icon className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.75} />
      <span>
        <span className="font-semibold tabular-nums">{value}</span> <span className="text-muted">{label}</span>
      </span>
    </span>
  );
}
