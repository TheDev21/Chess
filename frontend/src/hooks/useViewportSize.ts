import { useEffect, useState } from "react";

/**
 * Tracks window dimensions so a board on a short landscape viewport (e.g. a
 * phone rotated sideways) can be capped by available height, not just width
 * - otherwise it renders taller than the screen and pushes the rest of the
 * page out of view.
 */
export function useViewportSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return size;
}
