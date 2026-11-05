import { CHAPTERS } from "../../lessons/lessonData";
import { loadLessonProgress } from "../../services/storage/lessonProgress";
import { listGames } from "../../services/storage/gameHistory";
import { getStreak, getSolvedCount } from "../../services/puzzles/puzzleService";
import { GameHistoryList } from "../History/History";

const TOTAL_LESSONS = CHAPTERS.reduce((n, c) => n + c.lessons.length, 0);

export function Progress() {
  const progress = loadLessonProgress();
  const games = listGames();
  // Pass-and-Play games are excluded here: both sides are human, so there is
  // no single "the player" for playerColor to identify, and counting them
  // would misattribute one local player's result as the device owner's.
  const personalGames = games.filter((g) => g.mode !== "friend");
  const wins = personalGames.filter(
    (g) => (g.playerColor === "white" && g.result === "1-0") || (g.playerColor === "black" && g.result === "0-1"),
  ).length;
  const losses = personalGames.filter(
    (g) => (g.playerColor === "white" && g.result === "0-1") || (g.playerColor === "black" && g.result === "1-0"),
  ).length;
  const draws = personalGames.filter((g) => g.result === "1/2-1/2").length;

  const lessonsDone = progress.completedLessons.length;
  const puzzlesSolved = getSolvedCount();
  const streak = getStreak();

  const suggestion = buildSuggestion({ lessonsDone, puzzlesSolved, gamesPlayed: games.length, losses });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink">Progress</h1>
      <p className="mt-1.5 text-[14px] text-muted">A look at how your chess is coming along.</p>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Lessons" value={`${lessonsDone}/${TOTAL_LESSONS}`} />
        <Stat label="Puzzles solved" value={String(puzzlesSolved)} />
        <Stat label="Puzzle streak" value={String(streak)} />
        <Stat label="Games played" value={String(games.length)} />
      </div>

      {games.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="Wins" value={String(wins)} tone="success" />
          <Stat label="Losses" value={String(losses)} tone="blunder" />
          <Stat label="Draws" value={String(draws)} />
        </div>
      )}

      {suggestion && <div className="mt-6 rounded-xl border border-gold/25 bg-gold/5 p-4 text-[13px] leading-relaxed text-ink">{suggestion}</div>}

      <div className="mt-8">
        <GameHistoryList />
      </div>
    </div>
  );
}

function buildSuggestion({
  lessonsDone,
  puzzlesSolved,
  gamesPlayed,
  losses,
}: {
  lessonsDone: number;
  puzzlesSolved: number;
  gamesPlayed: number;
  losses: number;
}): string | null {
  // Built from the user's own saved activity, not invented - stays quiet rather than guessing when there isn't enough data yet.
  if (lessonsDone === 0 && gamesPlayed === 0 && puzzlesSolved === 0) {
    return "You're just getting started. Try the first lesson in Learn to meet the chessboard.";
  }
  if (lessonsDone > 0 && lessonsDone < TOTAL_LESSONS) {
    return "You're making progress through the piece lessons. Keep going, each one only takes a couple of minutes.";
  }
  if (puzzlesSolved === 0 && lessonsDone >= TOTAL_LESSONS) {
    return "You've finished the available lessons. Puzzles are a great next step to practice spotting opportunities.";
  }
  if (gamesPlayed > 0 && losses > gamesPlayed / 2) {
    return "Most of your games have been tough ones. Playing on an easier difficulty for a while can help the wins start coming.";
  }
  return null;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "blunder" }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3.5 text-center shadow-card">
      <div className={`text-[20px] font-semibold tabular-nums ${tone === "success" ? "text-success" : tone === "blunder" ? "text-blunder" : "text-ink"}`}>
        {value}
      </div>
      <div className="text-[12px] text-muted">{label}</div>
    </div>
  );
}
