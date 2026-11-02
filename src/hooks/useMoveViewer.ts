import { useCallback, useEffect, useState } from "react";

/**
 * Lets the player step back through move history during a *live* game
 * (as opposed to Analysis, which reviews a finished one) without that view
 * being disturbed by the game continuing underneath it - e.g. the engine
 * replying while you're looking at an earlier position shouldn't snap your
 * view back to the latest move. `viewIndex` is the ply currently displayed:
 * -1 is the starting position, 0..movesLength-1 is "after move N", and
 * `null` means "track the live position" (always the latest move, and
 * stays that way automatically as new moves arrive, since there's nothing
 * here to desync it).
 */
export function useMoveViewer(movesLength: number) {
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const isLive = viewIndex === null;
  const displayIndex = viewIndex ?? movesLength - 1;

  const goLive = useCallback(() => setViewIndex(null), []);
  const goStart = useCallback(() => setViewIndex(-1), []);
  const goBack = useCallback(() => {
    setViewIndex((prev) => Math.max(-1, (prev ?? movesLength - 1) - 1));
  }, [movesLength]);
  const goForward = useCallback(() => {
    setViewIndex((prev) => {
      if (prev === null) return null;
      const next = prev + 1;
      return next >= movesLength - 1 ? null : next; // reaching the latest move resumes live tracking
    });
  }, [movesLength]);
  const selectIndex = useCallback(
    (index: number) => setViewIndex(index >= movesLength - 1 ? null : index),
    [movesLength]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowLeft") goBack();
      else if (e.key === "ArrowRight") goForward();
      else if (e.key === "Home") goStart();
      else if (e.key === "End") goLive();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack, goForward, goStart, goLive]);

  return { viewIndex, displayIndex, isLive, goLive, goStart, goBack, goForward, selectIndex };
}
