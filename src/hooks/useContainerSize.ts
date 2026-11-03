import { useEffect, useRef, useState } from "react";

/**
 * Tracks a container's own rendered box (both dimensions), so the board can
 * be sized to fit whichever of width or height is tighter - e.g. a short
 * browser window - instead of only ever following its width.
 */
export function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 360, height: 360 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.floor(rect.width || 360),
        height: Math.floor(rect.height || rect.width || 360),
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return { ref, ...size };
}
