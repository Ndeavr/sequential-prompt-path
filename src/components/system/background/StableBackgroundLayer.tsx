/**
 * StableBackgroundLayer — UNPRO global atmospheric background.
 *
 * Mounted ONCE at the app root, above the router, so route changes never
 * remount or re-initialize any decorative layer. Memoized + isolated +
 * GPU-stable to eliminate flicker on mobile Safari / iOS / Chrome Android.
 *
 * Every layer is token-driven (`--atmos-*` in index.css) so Light and Dark
 * share the exact same geometry and only swap values — no JS, no reflow.
 *
 * Layers (back → front):
 *   1. Base fill
 *   2. Primary glow (top-left)
 *   3. Secondary glow (bottom-right)
 *   4. Ambient bloom
 *   5. Blueprint grid
 *   6. Noise grain (via .noise-overlay)
 */
import { memo } from "react";

const baseStyle: React.CSSProperties = { background: "var(--atmos-base)" };
const glowAStyle: React.CSSProperties = { background: "var(--atmos-glow-a)" };
const glowBStyle: React.CSSProperties = { background: "var(--atmos-glow-b)" };
const bloomStyle: React.CSSProperties = { background: "var(--atmos-bloom)" };
const gridStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, var(--atmos-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--atmos-grid) 1px, transparent 1px)",
  backgroundSize: "56px 56px",
  maskImage: "radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 78%)",
  WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 78%)",
};

function StableBackgroundLayerImpl() {
  return (
    <div
      aria-hidden
      data-decor
      className="fixed inset-0 -z-50 no-flicker-layer decorative-layer noise-overlay"
    >
      <div className="absolute inset-0 gpu-stable" style={baseStyle} />
      <div className="absolute inset-0 gpu-stable" style={glowAStyle} />
      <div className="absolute inset-0 gpu-stable" style={glowBStyle} />
      <div className="absolute inset-0 gpu-stable" style={bloomStyle} />
      <div className="absolute inset-0 gpu-stable" style={gridStyle} />
    </div>
  );
}

const StableBackgroundLayer = memo(StableBackgroundLayerImpl);
export default StableBackgroundLayer;
