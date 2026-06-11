/**
 * PIM overlay — silhouettes ultra floues qui dérivent.
 * Stable: transform-only animation via CSS class on inner div (rotation kept on
 * outer wrapper so the keyframe translate doesn't override it). Disabled on mobile.
 */
import { memo } from "react";

const CARDS = [
  { top: "12%",   left: "8%",   w: 220, h: 140, delay: "0s",  rot: -6 },
  { top: "28%",   right: "10%", w: 180, h: 120, delay: "8s",  rot: 5 },
  { top: "52%",   left: "18%",  w: 240, h: 160, delay: "16s", rot: 3 },
  { top: "62%",   right: "14%", w: 200, h: 130, delay: "24s", rot: -4 },
  { bottom: "8%", left: "30%",  w: 260, h: 170, delay: "32s", rot: 2 },
];

function PassportArchiveDrift() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {CARDS.map((c, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: c.top, bottom: c.bottom, left: c.left, right: c.right,
            width: c.w, height: c.h,
            transform: `rotate(${c.rot}deg)`,
          }}
        >
          <div
            className="ub-archive-card rounded-2xl w-full h-full"
            style={{
              background:
                "linear-gradient(135deg, rgba(125,211,252,0.45), rgba(167,139,250,0.35))",
              filter: "blur(40px)",
              animationDelay: c.delay,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default memo(PassportArchiveDrift);
