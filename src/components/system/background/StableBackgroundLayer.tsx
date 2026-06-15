/**
 * StableBackgroundLayer — UNPRO global cinematic background.
 *
 * Mounted ONCE at the app root, above the router, so route changes never
 * remount or re-initialize any decorative layer. Memoized + isolated +
 * GPU-stable to eliminate flicker on mobile Safari / iOS / Chrome Android.
 *
 * Layers (back → front):
 *   1. Base navy fill (#050816)
 *   2. Blue radial glow (top-left)
 *   3. Cyan radial glow (bottom-right)
 *   4. Noise grain overlay
 *
 * Every layer is `pointer-events: none`, lives inside `isolation: isolate`
 * + `contain: layout paint style`, and uses `translateZ(0)` for compositor
 * promotion. No animated `filter` / `backdrop-filter` / `background-position`.
 */
import { memo } from "react";

const baseStyle: React.CSSProperties = { background: "#050816" };
const blueGlowStyle: React.CSSProperties = {
  background:
    "radial-gradient(circle at top left, rgba(0,132,255,0.22), transparent 40%)",
};
const cyanGlowStyle: React.CSSProperties = {
  background:
    "radial-gradient(circle at bottom right, rgba(0,255,255,0.10), transparent 45%)",
};

function StableBackgroundLayerImpl() {
  return (
    <div
      aria-hidden
      data-decor
      className="fixed inset-0 -z-50 no-flicker-layer decorative-layer noise-overlay"
    >
      <div className="absolute inset-0 gpu-stable" style={baseStyle} />
      <div className="absolute inset-0 gpu-stable" style={blueGlowStyle} />
      <div className="absolute inset-0 gpu-stable" style={cyanGlowStyle} />
    </div>
  );
}

const StableBackgroundLayer = memo(StableBackgroundLayerImpl);
export default StableBackgroundLayer;
