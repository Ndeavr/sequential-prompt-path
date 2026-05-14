/**
 * AlexConversationArrow — Pulsing electric-blue arrow used as a visual hint
 * to guide the user from one homepage element to another (mic→orb,
 * orb→transcript, orb→quick actions).
 */
import type { CSSProperties } from "react";

export type ArrowDirection = "down" | "up" | "left" | "right";

interface AlexConversationArrowProps {
  direction?: ArrowDirection;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const ROTATIONS: Record<ArrowDirection, number> = {
  down: 0,
  up: 180,
  left: 90,
  right: -90,
};

export default function AlexConversationArrow({
  direction = "down",
  label,
  className,
  style,
}: AlexConversationArrowProps) {
  return (
    <div
      className={`pointer-events-none flex flex-col items-center gap-1 ${className ?? ""}`}
      style={style}
      aria-hidden
    >
      <svg
        width="22"
        height="34"
        viewBox="0 0 22 34"
        fill="none"
        style={{
          transform: `rotate(${ROTATIONS[direction]}deg)`,
          animation: "alex-arrow-pulse 1.8s ease-in-out infinite",
          filter: "drop-shadow(0 0 8px hsl(212 100% 55% / 0.6))",
        }}
      >
        <path
          d="M11 2 V26 M3 18 L11 28 L19 18"
          stroke="hsl(212 100% 65%)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {label && (
        <span className="text-[10px] uppercase tracking-[0.18em] text-blue-300/80">
          {label}
        </span>
      )}
      <style>{`
        @keyframes alex-arrow-pulse {
          0%, 100% { opacity: 0.35; transform: translateY(0) rotate(${ROTATIONS[direction]}deg); }
          50%      { opacity: 1;    transform: translateY(3px) rotate(${ROTATIONS[direction]}deg); }
        }
      `}</style>
    </div>
  );
}
