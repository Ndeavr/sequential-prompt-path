/**
 * BottomDockSafeArea — global protection against the fixed mobile dock
 * (BottomDockGlass / MobileBottomNav) overlapping page content or footers.
 *
 * Automatic coverage is provided by the CSS rule in src/index.css:
 *   body:has([data-bottom-dock]) { padding-bottom: var(--dock-safe-pb) }
 *
 * Use this component when you have a full-bleed screen or a nested scroll
 * container that opts out of body scroll and needs an explicit spacer.
 *
 * Modes:
 *  - <BottomDockSafeArea />                → renders a spacer div (mobile only)
 *  - <BottomDockSafeArea as="padding" />   → renders nothing, mark ancestor
 *    with `data-dock-safe="auto"` to get automatic padding-bottom on mobile
 *
 * Respects iPhone safe-area-inset-bottom and Android navigation bars via
 * env(safe-area-inset-bottom) baked into --dock-safe-pb.
 */
import type { CSSProperties } from "react";

interface Props {
  className?: string;
  style?: CSSProperties;
  /** Extra breathing room in pixels (added on top of dock-safe-pb). */
  extra?: number;
}

export default function BottomDockSafeArea({ className = "", style, extra = 0 }: Props) {
  return (
    <div
      aria-hidden="true"
      data-dock-safe-spacer=""
      className={`dock-safe-spacer w-full lg:hidden ${className}`}
      style={extra ? { marginBottom: extra, ...style } : style}
    />
  );
}
