/**
 * BlueprintOverlay — Subtle drifting architectural grid + drafting marks.
 * Stable: transform-only drift via .ub-blueprint class, fixed opacity, memoized.
 */
import { memo } from "react";

function BlueprintOverlay() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full ub-blueprint pointer-events-none"
      style={{ mixBlendMode: "multiply" }}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1600 900"
    >
      <defs>
        <pattern id="bp-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M 48 0 L 0 0 0 48"
            fill="none"
            stroke="#2563FF"
            strokeWidth="0.6"
            opacity="0.45"
          />
        </pattern>
        <pattern id="bp-grid-major" width="240" height="240" patternUnits="userSpaceOnUse">
          <path
            d="M 240 0 L 0 0 0 240"
            fill="none"
            stroke="#1E40AF"
            strokeWidth="0.8"
            opacity="0.55"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bp-grid)" />
      <rect width="100%" height="100%" fill="url(#bp-grid-major)" />
      <g stroke="#1E40AF" strokeWidth="0.8" fill="none" opacity="0.5">
        <circle cx="240" cy="220" r="42" />
        <line x1="198" y1="220" x2="282" y2="220" />
        <line x1="240" y1="178" x2="240" y2="262" />
        <rect x="1180" y="600" width="220" height="140" />
        <line x1="1180" y1="600" x2="1400" y2="740" />
        <line x1="1400" y1="600" x2="1180" y2="740" />
      </g>
    </svg>
  );
}

export default memo(BlueprintOverlay);
