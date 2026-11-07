import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Chess } from "chess.js";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Play, Pause, RotateCcw, ChevronRight, Check, Lightbulb, PenLine, Trophy, Lock } from "lucide-react";
import { ChessBoard } from "../../components/ChessBoard/ChessBoard";
import { KnightMascot } from "../../components/Decorative/KnightMascot";
import { findLesson, CHAPTERS } from "../../lessons/lessonData";
import { markLessonComplete } from "../../services/storage/lessonProgress";

type Stage = "watch" | "tryIt" | "trySuccess" | "challenge";
const STAGE_RANK: Record<Stage, number> = { watch: 0, tryIt: 1, trySuccess: 1, challenge: 2 };

const SPEEDS = [0.75, 1, 1.5] as const;

const ALL_LESSONS = CHAPTERS.flatMap((c) => c.lessons.map((l) => ({ chapterId: c.id, lessonId: l.id })));

export function Lesson() {
  const { chapterId = "", lessonId = "" } = useParams();
  const navigate = useNavigate();
  const found = findLesson(chapterId, lessonId);
  const reduceMotion = useReducedMotion();

  const [stage, setStage] = useState<Stage>("watch");
  const [maxReached, setMaxReached] = useState(0);
  const [watchIndex, setWatchIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  const [tryFen, setTryFen] = useState(found?.lesson.tryIt.fen ?? "");
  const [tryError, setTryError] = useState(false);

  const [challengeFen, setChallengeFen] = useState(found?.lesson.challenge.fen ?? "");
  const [challengeState, setChallengeState] = useState<"playing" | "wrong" | "right">("playing");
  const [showHint, setShowHint] = useState(false);
  // index: 0 = the lesson's base `challenge`, 1+ indexes into `additionalChallenges`.
  // lessonKey travels with the index so a stale index from a previous lesson can
  // never be mistaken for a valid position in a newly rendered one - even one with
  // just as many additionalChallenges as the lesson we left.
  const [challengePosition, setChallengePosition] = useState({ lessonKey: `${chapterId}/${lessonId}`, index: 0 });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!found) return;
    setStage("watch");
    setMaxReached(0);
    setWatchIndex(0);
    setPlaying(true);
    setTryFen(found.lesson.tryIt.fen);
    setChallengeFen(found.lesson.challenge.fen);
    setChallengeState("playing");
    setShowHint(false);
    setChallengePosition({ lessonKey: `${chapterId}/${lessonId}`, index: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, lessonId]);

  useEffect(() => {
    if (stage !== "watch" || !playing || !found) return;
    if (watchIndex >= found.lesson.watch.length - 1) {
      setPlaying(false);
      return;
    }
    timerRef.current = setTimeout(() => setWatchIndex((i) => i + 1), 2200 / speed);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stage, playing, watchIndex, speed, found]);

  const goToStage = (next: Stage) => {
    setStage(next);
    setMaxReached((m) => Math.max(m, STAGE_RANK[next]));
  };

  if (!found) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-2 text-[20px] font-semibold text-ink">Lesson not found</h1>
        <Link to="/learn" className="text-[13px] text-accent underline">
          Back to Learn
        </Link>
      </div>
    );
  }
  const { chapter, lesson } = found;
  // On the render right after navigating to a new lesson, challengePosition can still
  // briefly hold the previous lesson's { lessonKey, index } before the reset effect
  // above runs - fall back to 0 for this render whenever the stored key doesn't match.
  const lessonKey = `${chapterId}/${lessonId}`;
  const effectiveChallengeIndex = challengePosition.lessonKey === lessonKey ? challengePosition.index : 0;
  const currentChallenge =
    effectiveChallengeIndex > 0 && effectiveChallengeIndex - 1 < (lesson.additionalChallenges?.length ?? 0)
      ? lesson.additionalChallenges![effectiveChallengeIndex - 1]
      : lesson.challenge;
  const hasAnotherPosition = effectiveChallengeIndex < (lesson.additionalChallenges?.length ?? 0);
  // Same staleness window as effectiveChallengeIndex above, but for the board itself:
  // challengeFen is reset inside the lesson-change effect, which runs after this first
  // render - without this, ChessBoard would briefly display the previous lesson's FEN.
  const effectiveChallengeFen = challengePosition.lessonKey === lessonKey ? challengeFen : lesson.challenge.fen;

  const handleTryMove = (from: string, to: string): boolean => {
    if (lesson.tryIt.kind !== "move" || from !== lesson.tryIt.pieceSquare) return false;
    const chess = new Chess(tryFen);
    let move;
    try {
      move = chess.move({ from, to, promotion: "q" });
    } catch {
      move = null;
    }
    if (!move) {
      setTryError(true);
      setTimeout(() => setTryError(false), 500);
      return false;
    }
    setTryFen(chess.fen());
    setTimeout(() => goToStage("trySuccess"), 350);
    return true;
  };

  const handleTryTap = (square: string) => {
    if (lesson.tryIt.kind !== "find") return;
    if (square === lesson.tryIt.targetSquare) {
      goToStage("trySuccess");
    } else {
      setTryError(true);
      setTimeout(() => setTryError(false), 500);
    }
  };

  const handleChallengeMove = (from: string, to: string): boolean => {
    if (currentChallenge.kind !== "move") return false;
    const chess = new Chess(challengeFen);
    let move;
    try {
      move = chess.move({ from, to, promotion: "q" });
    } catch {
      move = null;
    }
    if (!move) return false;
    setChallengeFen(chess.fen());
    if (currentChallenge.isGoalMove?.(chess, move)) {
      setChallengeState("right");
      markLessonComplete(chapter.id, lesson.id);
    } else {
      setChallengeState("wrong");
    }
    return true;
  };

  const handleChallengeTap = (square: string) => {
    if (currentChallenge.kind !== "find" || challengeState === "right") return;
    if (square === currentChallenge.targetSquare) {
      setChallengeState("right");
      markLessonComplete(chapter.id, lesson.id);
    } else {
      setChallengeState("wrong");
    }
  };

  const resetChallenge = () => {
    setChallengeFen(currentChallenge.fen);
    setChallengeState("playing");
    setShowHint(false);
  };

  const nextChallengePosition = () => {
    const nextIndex = effectiveChallengeIndex + 1;
    setChallengePosition({ lessonKey, index: nextIndex });
    setChallengeFen(lesson.additionalChallenges![nextIndex - 1].fen);
    setChallengeState("playing");
    setShowHint(false);
  };

  const myIndex = ALL_LESSONS.findIndex((l) => l.chapterId === chapterId && l.lessonId === lessonId);
  const next = ALL_LESSONS[myIndex + 1];
  // Only call this a "chapter complete" when there's a next chapter to move
  // on to - the very last lesson of the whole curriculum (next is undefined)
  // keeps the plain "Lesson complete!" message instead, so it never implies
  // there's more to come right after the biggest milestone.
  const isChapterComplete = Boolean(next) && chapter.lessons[chapter.lessons.length - 1].id === lesson.id;
  const watchStep = lesson.watch[watchIndex];

  const tabs: { stage: Stage; label: string; icon: typeof Play }[] = [
    { stage: "watch", label: "Watch", icon: Play },
    { stage: "tryIt", label: "Try It Yourself", icon: PenLine },
    { stage: "challenge", label: "Challenge", icon: Trophy },
  ];
  const activeTab: Stage = stage === "trySuccess" ? "tryIt" : stage;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <Link to="/learn" className="text-[13px] text-muted hover:text-ink">
          ← Back to Lessons
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border sm:w-32">
            <div className="h-full rounded-full bg-accent" style={{ width: `${((myIndex + 1) / ALL_LESSONS.length) * 100}%` }} />
          </div>
          <span className="whitespace-nowrap text-[12px] text-muted">
            Lesson {myIndex + 1} of {ALL_LESSONS.length}
          </span>
        </div>
      </div>

      <div className="shrink-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">{lesson.title}</h1>
        <p className="mt-0.5 text-[13px] text-muted">{lesson.summary}</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 lg:min-h-0 lg:flex-row">
        <div className="flex flex-1 flex-col items-center gap-3 lg:min-h-0">
          <div className="max-h-full w-full min-h-[240px] max-w-[520px] flex-1" data-tutorial="board">
            <motion.div className="h-full w-full" animate={tryError && !reduceMotion ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
              {stage === "watch" && (
                <ChessBoard fen={watchStep.fen} onMove={() => false} orientation="white" draggable={false} highlightSquares={watchStep.highlightSquares} />
              )}
              {(stage === "tryIt" || stage === "trySuccess") && (
                <ChessBoard
                  fen={tryFen}
                  onMove={handleTryMove}
                  orientation="white"
                  draggable={stage === "tryIt" && lesson.tryIt.kind === "move"}
                  restrictToSquare={lesson.tryIt.kind === "move" ? lesson.tryIt.pieceSquare : undefined}
                  onSquareTap={stage === "tryIt" ? handleTryTap : undefined}
                />
              )}
              {stage === "challenge" && (
                <ChessBoard
                  fen={effectiveChallengeFen}
                  onMove={handleChallengeMove}
                  orientation="white"
                  draggable={currentChallenge.kind === "move"}
                  onSquareTap={handleChallengeTap}
                />
              )}
            </motion.div>
          </div>

          {stage === "watch" && (
            <div className="flex w-full max-w-[520px] shrink-0 flex-col items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2 sm:flex-row">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setWatchIndex(0);
                    setPlaying(true);
                  }}
                  aria-label="Replay"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition-colors hover:border-ink/20"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? "Pause" : "Play"}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent/90"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <select
                  aria-label="Playback speed"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEEDS)[number])}
                  className="rounded-full border border-border bg-surface px-2 py-1.5 text-[12px] font-medium text-ink"
                >
                  {SPEEDS.map((s) => (
                    <option key={s} value={s}>
                      {s}x
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                {lesson.watch.map((_, i) => (
                  <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === watchIndex ? "bg-accent" : "bg-border"}`} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToStage("tryIt")}
                  className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/20"
                >
                  Skip Lesson
                </button>
                <button
                  onClick={() => goToStage("tryIt")}
                  className="flex items-center gap-1 rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-accent/90"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {stage === "challenge" && challengeState === "right" && (
            <div className="flex w-full max-w-[520px] shrink-0 justify-end gap-2">
              <Link
                to="/learn"
                className="rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/20"
              >
                Back to Lessons
              </Link>
              <button
                onClick={resetChallenge}
                className="rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/20"
              >
                Practice Again
              </button>
              {hasAnotherPosition && (
                <button
                  onClick={nextChallengePosition}
                  className="rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/20"
                >
                  Try Another Position
                </button>
              )}
              {next && (
                <button
                  onClick={() => navigate(`/learn/${next.chapterId}/${next.lessonId}`)}
                  className="flex items-center gap-1 rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-accent/90"
                >
                  Next lesson <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border bg-surface lg:w-[300px] lg:shrink-0">
          <div className="flex shrink-0 border-b border-border">
            {tabs.map((tab) => {
              const unlocked = maxReached >= STAGE_RANK[tab.stage];
              const isActive = activeTab === tab.stage;
              return (
                <button
                  key={tab.stage}
                  disabled={!unlocked}
                  onClick={() => unlocked && setStage(tab.stage)}
                  className={`flex flex-1 flex-col items-center gap-1 px-2 py-3 text-[11px] font-medium transition-colors ${
                    isActive ? "border-b-2 border-accent text-accent" : unlocked ? "text-muted hover:text-ink" : "text-muted/40"
                  }`}
                >
                  {unlocked ? <tab.icon className="h-4 w-4" strokeWidth={1.75} /> : <Lock className="h-4 w-4" strokeWidth={1.75} />}
                  <span className="leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {stage === "watch" && (
              <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl bg-sage-bg p-4">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/[0.12] text-accent">
                    <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </span>
                  <p className="text-[14px] font-medium leading-relaxed text-ink">{watchStep.caption}</p>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-surface/70 px-3 py-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2} />
                  <p className="text-[12px] leading-relaxed text-muted">Watch how the piece moves, then try it yourself.</p>
                </div>
                <KnightMascot className="pointer-events-none absolute -bottom-2 -right-2 h-20 w-20 opacity-90" />
              </div>
            )}

            {stage === "tryIt" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/[0.1] text-accent">
                    <PenLine className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </span>
                  <p className="text-[14px] leading-relaxed text-ink">{lesson.tryIt.instructions}</p>
                </div>
                {lesson.tryIt.kind === "move" && <p className="pl-9 text-[12px] text-muted">Any legal move works. Go ahead and try one.</p>}
              </div>
            )}

            {stage === "trySuccess" && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-success" role="status" aria-live="polite">
                    <Check className="h-4 w-4" />
                    <span className="text-[13px] font-medium">Nice work!</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-ink">{lesson.tryIt.successMessage}</p>
                  <button
                    onClick={() => goToStage("challenge")}
                    className="flex items-center justify-center gap-1 rounded-full bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent/90"
                  >
                    Mini challenge <ChevronRight className="h-4 w-4" />
                  </button>
                </motion.div>
              </AnimatePresence>
            )}

            {stage === "challenge" && (
              <div className="flex flex-col gap-3">
                {challengeState === "playing" && (
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/[0.1] text-accent">
                      <Trophy className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <p className="text-[14px] leading-relaxed text-ink">{currentChallenge.instructions}</p>
                  </div>
                )}
                {challengeState === "wrong" && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                    <p className="text-[13px] font-medium text-warning" role="status" aria-live="polite">
                      {currentChallenge.kind === "find"
                        ? "Not quite. That's not the square we're looking for."
                        : "Not quite. That move is legal, but it's not the one we're looking for."}
                    </p>
                    {showHint && (
                      <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-muted">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                        {currentChallenge.hint}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={resetChallenge}
                        className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/20"
                      >
                        Take it back and try again
                      </button>
                      {!showHint && (
                        <button
                          onClick={() => setShowHint(true)}
                          className="flex items-center gap-1 rounded-full border border-warning/40 px-3 py-1.5 text-[12px] font-medium text-warning transition-colors hover:bg-warning/5"
                        >
                          <Lightbulb className="h-3.5 w-3.5" /> Hint
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {challengeState === "right" && (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-success" role="status" aria-live="polite">
                      <Check className="h-4 w-4" />
                      <span className="text-[13px] font-medium">{isChapterComplete ? "Chapter complete!" : "Lesson complete!"}</span>
                    </div>
                    {isChapterComplete && <p className="text-[13px] leading-relaxed text-ink">You've finished {chapter.title}.</p>}
                    <p className="text-[13px] leading-relaxed text-ink">{currentChallenge.successMessage}</p>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
