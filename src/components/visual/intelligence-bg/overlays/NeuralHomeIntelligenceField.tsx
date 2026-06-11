/**
 * Alex overlay — Neural Home Intelligence Field.
 * Stable: central halo uses transform-only ub-breath. Peripheral nodes static on mobile,
 * subtle twinkle on desktop. Memoized.
 */
import { memo } from "react";

const CENTER = { x: 800, y: 500 };
const PERIPH = [
  { x: 280, y: 200 }, { x: 1320, y: 220 },
  { x: 220, y: 520 }, { x: 1380, y: 480 },
  { x: 320, y: 820 }, { x: 1280, y: 800 },
  { x: 800, y: 140 }, { x: 800, y: 880 },
];

function NeuralHomeIntelligenceField() {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: 520,
          height: 520,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.28) 0%, rgba(59,130,246,0) 70%)",
          animation: "ub-breath 8s ease-in-out infinite",
          willChange: "transform",
        }}
      />
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.18 }}
      >
        <g stroke="#3B82F6" strokeWidth="0.7" fill="none" strokeLinecap="round">
          {PERIPH.map((p, i) => (
            <line
              key={i}
              x1={CENTER.x} y1={CENTER.y}
              x2={p.x} y2={p.y}
              strokeDasharray="6 10"
            />
          ))}
        </g>
        <g fill="#3B82F6">
          {PERIPH.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              className="ub-twinkle-desktop"
              style={{ animationDelay: `${i * 1.2}s` }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

export default memo(NeuralHomeIntelligenceField);
