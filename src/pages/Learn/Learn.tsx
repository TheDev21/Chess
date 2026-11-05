import { Link } from "react-router-dom";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { CHAPTERS } from "../../lessons/lessonData";
import { loadLessonProgress } from "../../services/storage/lessonProgress";

export function Learn() {
  const progress = loadLessonProgress();
  const totalLessons = CHAPTERS.reduce((n, c) => n + c.lessons.length, 0);
  const completed = progress.completedLessons.length;

  return (
    <div className="mx-auto max-w-2xl py-8 sm:py-10">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink">Learn</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        {completed} of {totalLessons} lessons complete. Short, interactive lessons: watch, try it yourself, then a quick challenge.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {CHAPTERS.map((chapter, ci) => {
          const chapterDone = chapter.lessons.filter((l) => progress.completedLessons.includes(`${chapter.id}/${l.id}`)).length;
          return (
            <div key={chapter.id}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-[16px] font-semibold text-ink">
                  Chapter {ci + 1}: {chapter.title}
                </h2>
                <span className="text-[12px] text-muted">
                  {chapterDone}/{chapter.lessons.length}
                </span>
              </div>
              <p className="mb-3 text-[13px] text-muted">{chapter.description}</p>
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface shadow-card">
                {chapter.lessons.map((lesson) => {
                  const done = progress.completedLessons.includes(`${chapter.id}/${lesson.id}`);
                  return (
                    <Link
                      key={lesson.id}
                      to={`/learn/${chapter.id}/${lesson.id}`}
                      className="flex items-center gap-3 p-4 transition-colors duration-200 hover:bg-accent/[0.05]"
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                      ) : (
                        <span className="h-5 w-5 shrink-0 rounded-full border-2 border-border" />
                      )}
                      <span className="flex-1">
                        <span className="block text-[14px] font-medium text-ink">{lesson.title}</span>
                        <span className="block text-[12px] text-muted">{lesson.summary}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="rounded-xl border border-dashed border-border p-4 text-center text-[13px] text-muted">
          More chapters are on the way: special moves, and how to play a full game.
        </div>
      </div>
    </div>
  );
}
