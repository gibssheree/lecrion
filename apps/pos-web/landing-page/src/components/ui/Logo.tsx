import lecrionLogo from "../../assets/lecrion-logo.png";

/**
 * Lecrion wordmark, per the brand file at assets/Lecrion.png (455×129).
 *
 * A previous version rebuilt this as inline SVG because this exact PNG
 * blurred when scaled down for the header — flat raster art with fine serif
 * strokes loses crispness at small sizes, more than an icon-only mark would.
 * That tradeoff is back by request; if the header wordmark reads soft on a
 * retina display, the fix is a higher-resolution source export, not markup.
 */
export default function Logo({
  size = "md",
}: {
  invert?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <img
      className={`lp-logo${size === "sm" ? " lp-logo--sm" : ""}`}
      src={lecrionLogo}
      alt="Lecrion"
    />
  );
}
