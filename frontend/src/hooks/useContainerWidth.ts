import { useEffect, useRef, useState } from "react";

/**
 * Tracks the rendered width of a container element so the chessboard can
 * fill available space on any viewport (phone, tablet, laptop, desktop)
 * instead of using a fixed pixel size.
 */
export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(Math.floor(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
