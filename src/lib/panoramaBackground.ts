import type { CSSProperties } from "react";
import kingImg from "../assets/chess-king.png";

export { kingImg };

/** The same single king photo, shown full-bleed (`background-size: cover`) on every page of the
 *  site - no panning, no per-page positioning, just the original image centered behind
 *  everything. `background-attachment: fixed` anchors it to the viewport rather than to
 *  whichever element renders it, so the main content area and the nav bars (which render this
 *  same style) read as one unbroken image rather than separate, seamed layers. */
export function kingBackgroundStyle(): CSSProperties {
  return {
    backgroundImage: `url(${kingImg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
  };
}

/** Same image/position as `kingBackgroundStyle`, with the same light `#f6f3e8/50` tint used on
 *  every translucent card across the site (Settings included), baked in as a second background
 *  layer, so the nav bars read as the same kind of surface - still showing the photo through -
 *  rather than a separately-styled dark bar. */
export function kingNavStyle(): CSSProperties {
  return {
    backgroundImage: `linear-gradient(rgba(246,243,232,0.5), rgba(246,243,232,0.5)), url(${kingImg})`,
    backgroundSize: "cover, cover",
    backgroundPosition: "center, center",
    backgroundAttachment: "fixed, fixed",
    backgroundRepeat: "no-repeat, no-repeat",
  };
}
