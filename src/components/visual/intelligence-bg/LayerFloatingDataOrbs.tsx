/**
 * Layer 4 — Floating Data Orbs.
 * Premium blurred color glow. Stable: transform-only animation via CSS classes
 * (disabled on mobile) so React re-renders never restart animations.
 */
import { memo } from "react";

interface Props {
  tone?: "light" | "dark";
}

const ORBS = [
  { cls: "ub-orb-1", color: "#3B82F6", size: 560, top: "-10%", left: "-8%",   opacity: 0.17 },
  { cls: "ub-orb-2", color: "#0EA5E9", size: 500, top: "8%",   right: "-10%", opacity: 0.15 },
  { cls: "ub-orb-3", color: "#6366F1", size: 620, bottom: "-14%", left: "-6%",  opacity: 0.16 },
  { cls: "ub-orb-4", color: "#7DD3FC", size: 440, bottom: "0%",    right: "-8%", opacity: 0.14 },
];

function LayerFloatingDataOrbs({ tone = "light" }: Props) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {ORBS.map((o, i) => (
        <div
          key={i}
          className={`ub-orb ${o.cls}`}
          style={{
            width: o.size,
            height: o.size,
            top: o.top,
            bottom: o.bottom,
            left: o.left,
            right: o.right,
            background: o.color,
            opacity: tone === "dark" ? o.opacity * 0.7 : o.opacity,
          }}
        />
      ))}
    </div>
  );
}

export default memo(LayerFloatingDataOrbs);
