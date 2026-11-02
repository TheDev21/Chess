import { useEffect, useRef, useState } from "react";

/** Tracks a container's rendered box so the board can fill available space on any viewport, bounded by both width and height. */
export function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 360, height: 640 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const parent = el.parentElement;
      setSize({
        width: Math.floor(el.getBoundingClientRect().width || 360),
        height: Math.floor((parent?.getBoundingClientRect().height || window.innerHeight) - 24),
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
