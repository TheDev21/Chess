export interface LessonProgress {
  completedLessons: string[]; // "chapterId/lessonId"
}

const KEY = "chessguru:lessons";

export function loadLessonProgress(): LessonProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { completedLessons: [] };
    const parsed = JSON.parse(raw) as Partial<LessonProgress>;
    return { completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [] };
  } catch {
    return { completedLessons: [] };
  }
}

export function markLessonComplete(chapterId: string, lessonId: string): void {
  const key = `${chapterId}/${lessonId}`;
  const progress = loadLessonProgress();
  if (!progress.completedLessons.includes(key)) {
    progress.completedLessons.push(key);
    localStorage.setItem(KEY, JSON.stringify(progress));
  }
}

export function isLessonComplete(chapterId: string, lessonId: string): boolean {
  return loadLessonProgress().completedLessons.includes(`${chapterId}/${lessonId}`);
}
