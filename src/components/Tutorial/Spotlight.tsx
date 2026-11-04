import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { markTutorialSeen } from "../../services/storage/tutorialProgress";

export interface SpotlightStep {
  /** Matches a`data-tutorial="<targetId>"`attribute on the element to highlight. */
  targetId: string;
  title: string;
  body: string;
}

interface SpotlightProps {
  tutorialId: string;
  steps: SpotlightStep[];
  onDone: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measure(targetId: string): Rect | null {
  const els = document.querySelectorAll(`[data-tutorial="${targetId}"]`);
  if (els.length === 0) return null;
  // The same target can exist twice (desktop sidebar + mobile bottom nav) - only one is
  // actually visible at a time, so prefer whichever has real size.
  let el = els[0];
  for (const candidate of els) {
    const r = candidate.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      el = candidate;
      break;
    }
  }
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** The layout viewport's own size - more reliable than window.innerWidth/Height on mobile,
 * where a browser's address-bar/toolbar can resize the visual viewport without the two
 * staying in sync, which is what was throwing off the mask and tooltip placement. */
function measureViewport(): { width: number; height: number } {
  return { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
}

/**
 * A spotlight-style guided tour: dims the page, cuts a highlighted hole
 * around one element at a time (via a giant box-shadow, not a full overlay
 * with clip-path - simpler and resizes cleanly), and shows a small tooltip
 * with Next/Back/Skip. Progress is remembered per tutorialId so it never
 * repeats automatically; Settings can call resetTutorial() to replay it.
 */
export function Spotlight({ tutorialId, steps, onDone }: SpotlightProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState(measureViewport);
  const reduceMotion = useReducedMotion();

  // Lock the page's own scroll container (not body - the app scrolls <main>, not the page)
  // for as long as the tour is open, so the highlighted element can't drift out from under
  // its spotlight by scrolling underneath it, on any device.
  useEffect(() => {
    const scroller = document.querySelector("main");
    if (!scroller) return;
    const prevOverflow = scroller.style.overflow;
    scroller.style.overflow = "hidden";
    return () => {
      scroller.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const update = () => {
      setRect(measure(steps[index].targetId));
      setViewport(measureViewport());
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    // Mobile browsers can resize the visual viewport (address bar show/hide) without a
    // matching"resize"event firing reliably - listen for that too, where supported.
    window.visualViewport?.addEventListener("resize", update);
    const raf = requestAnimationFrame(update); // catch late layout (board sizing, fonts)
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, [index, steps]);

  const finish = () => {
    markTutorialSeen(tutorialId);
    onDone();
  };

  const step = steps[index];
  const pad = 8;
  const highlighted = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;

  // Place the tooltip below the highlighted area if there's room, otherwise above - with
  // enough margin that it never hugs the very edge of the screen (e.g. a mobile bottom nav).
  const tooltipHeight = 190;
  const edgeMargin = 16;
  const tooltipBelow = highlighted ? highlighted.top + highlighted.height + edgeMargin + tooltipHeight < viewport.height : true;
  const tooltipTop = highlighted
    ? tooltipBelow
      ? highlighted.top + highlighted.height + 12
      : Math.max(edgeMargin, Math.min(highlighted.top - tooltipHeight - 20, viewport.height - tooltipHeight - edgeMargin))
    : viewport.height / 2;
  const tooltipLeft = highlighted ? Math.min(Math.max(12, highlighted.left), viewport.width - 300) : viewport.width / 2 - 150;

  // Four opaque strips around the highlighted rect instead of a single CSS`mask: url(#svg)`
  // layer: the mask approach rendered a tiled, offset duplicate of the bottom nav in WebKit
  // (a real compositing bug, not just an opacity issue) once the nav itself got a translucent
  // background. Plain strips have no mask/blur to go wrong, at the small cost of a visible seam
  // instead of a feathered edge - an acceptable trade for something that reliably renders.
  const scrim = "rgba(27,30,26,0.82)";
  const strips = highlighted
    ? [
        { top: 0, left: 0, width: viewport.width, height: Math.max(0, highlighted.top) },
        {
          top: highlighted.top + highlighted.height,
          left: 0,
          width: viewport.width,
          height: Math.max(0, viewport.height - (highlighted.top + highlighted.height)),
        },
        { top: highlighted.top, left: 0, width: Math.max(0, highlighted.left), height: highlighted.height },
        {
          top: highlighted.top,
          left: highlighted.left + highlighted.width,
          width: Math.max(0, viewport.width - (highlighted.left + highlighted.width)),
          height: highlighted.height,
        },
      ]
    : [{ top: 0, left: 0, width: viewport.width, height: viewport.height }];

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Guided tutorial">
      {strips.map((s, i) => (
        <motion.div
          key={i}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ position: "fixed", top: s.top, left: s.left, width: s.width, height: s.height, background: scrim, pointerEvents: "none" }}
        />
      ))}
      {highlighted && (
        <div
          style={{
            position: "fixed",
            borderRadius: 10,
            top: highlighted.top,
            left: highlighted.left,
            width: highlighted.width,
            height: highlighted.height,
            boxShadow: "0 0 0 1px rgba(201,138,46,0.5), 0 0 16px 3px rgba(201,138,46,0.35)",
            pointerEvents: "none",
          }}
        />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? {} : { opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed w-[280px] rounded-xl border border-border bg-surface p-4 shadow-panel"
          style={{ top: tooltipTop, left: tooltipLeft }}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted">
              Step {index + 1} of {steps.length}
            </span>
            <button onClick={finish} aria-label="Skip tutorial" className="rounded-full p-1 text-muted hover:text-ink">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <h3 className="text-[14px] font-semibold text-ink">{step.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{step.body}</p>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={finish} className="text-[12px] text-muted underline-offset-2 hover:underline">
              Skip
            </button>
            <div className="flex gap-1.5">
              {index > 0 && (
                <button
                  onClick={() => setIndex((i) => i - 1)}
                  className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/20"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => (index === steps.length - 1 ? finish() : setIndex((i) => i + 1))}
                className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-accent/90"
              >
                {index === steps.length - 1 ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
