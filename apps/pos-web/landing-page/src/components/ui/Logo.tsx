/**
 * Lecrion wordmark.
 *
 * Replaces the 455×129 PNG that was being scaled to 24px (and blurring on
 * retina). The mark is a geometric rebuild of the logo's block-built "L" with
 * its droplet counter-form, so it stays sharp at any size and inherits colour.
 */
export default function Logo({
  invert = false,
  size = "md",
}: {
  invert?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`lp-logo${invert ? " lp-logo--invert" : ""}${
        size === "sm" ? " lp-logo--sm" : ""
      }`}
    >
      <svg
        className="lp-logo__mark"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        {/* block-built L: stem + foot as one path */}
        <path
          d="M2 11.5h8.2v13h11.3V31H2V11.5Z"
          fill="currentColor"
        />
        {/* companion blocks, echoing the original mark's stepped corners */}
        <rect x="2" y="1" width="8.2" height="8.2" rx="2" fill="currentColor" />
        <rect
          x="12.6"
          y="2.4"
          width="6.4"
          height="6.4"
          rx="1.8"
          fill="currentColor"
          opacity="0.45"
        />
        <rect
          x="23.6"
          y="24.5"
          width="6.4"
          height="6.4"
          rx="1.8"
          fill="currentColor"
          opacity="0.45"
        />
        {/* droplet in the elbow */}
        <path
          d="M16.4 11.2c2.9 3.3 4.3 5.6 4.3 7.4a4.3 4.3 0 1 1-8.6 0c0-1.8 1.4-4.1 4.3-7.4Z"
          fill="currentColor"
        />
      </svg>
      <span className="lp-logo__type">Lecrion</span>
    </span>
  );
}
