/**
 * AlexFloatingOrb — Premium glossy 3D floating orb.
 *
 * Layered radial gradients on a fixed-size sphere that floats above a
 * separate elliptical blue base glow. Pure CSS + SVG. No 3D libs.
 *
 * States: idle | listening | thinking | speaking | success | error
 */
import { useMemo } from "react";

export type AlexOrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "success"
  | "error";

export type AlexOrbExpression =
  | "neutral"
  | "happy"
  | "focused"
  | "concerned"
  | "confident";

export interface AlexFloatingOrbProps {
  state?: AlexOrbState;
  expression?: AlexOrbExpression;
  size?: "mobile" | "desktop" | number;
  onClick?: () => void;
  className?: string;
}

function rimColorFor(state: AlexOrbState): string {
  switch (state) {
    case "listening":
      return "212 100% 62%";
    case "thinking":
      return "260 90% 65%";
    case "speaking":
      return "200 100% 60%";
    case "success":
      return "150 80% 55%";
    case "error":
      return "0 85% 60%";
    default:
      return "212 100% 55%";
  }
}

export default function AlexFloatingOrb({
  state = "idle",
  expression = "neutral",
  size = "mobile",
  onClick,
  className,
}: AlexFloatingOrbProps) {
  const px = typeof size === "number" ? size : size === "desktop" ? 300 : 200;
  const rim = rimColorFor(state);
  const active = state !== "idle";

  // Eye shape based on expression.
  const eyes = useMemo(() => {
    switch (expression) {
      case "happy":
        return { rx: 5, ry: 2 }; // squinted
      case "focused":
        return { rx: 3, ry: 6 };
      case "confident":
        return { rx: 4, ry: 5 };
      case "concerned":
        return { rx: 4, ry: 3 };
      default:
        return { rx: 4, ry: 5 };
    }
  }, [expression]);

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none ${className ?? ""}`}
      style={{ width: px }}
    >
      {/* The orb (floats) */}
      <button
        type="button"
        onClick={onClick}
        aria-label="Alex"
        className="relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
        style={{
          width: px,
          height: px,
          animation: "alex-orb-float 4.5s ease-in-out infinite",
          // Layered orb: deep core, blue rim, specular highlight, drop shadow.
          background: `
            radial-gradient(circle at 30% 25%, hsl(0 0% 100% / 0.55) 0%, hsl(0 0% 100% / 0.05) 9%, transparent 18%),
            radial-gradient(circle at 50% 50%, hsl(220 40% 6%) 38%, hsl(220 50% 4%) 60%, hsl(${rim} / 0.55) 86%, hsl(${rim} / 0.0) 100%),
            radial-gradient(circle at 70% 80%, hsl(220 80% 3% / 0.85) 0%, transparent 55%)
          `,
          boxShadow: `
            inset 0 -22px 40px hsl(220 80% 2% / 0.85),
            inset 0 18px 30px hsl(${rim} / 0.18),
            0 0 0 1px hsl(${rim} / 0.35),
            0 0 ${active ? 70 : 40}px hsl(${rim} / ${active ? 0.55 : 0.32}),
            0 30px 50px -10px hsl(220 80% 2% / 0.85)
          `,
          cursor: onClick ? "pointer" : "default",
          transition: "box-shadow 400ms ease",
        }}
      >
        {/* Top specular streak */}
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "6%",
            left: "18%",
            width: "55%",
            height: "22%",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, hsl(0 0% 100% / 0.55), transparent 65%)",
            filter: "blur(2px)",
          }}
        />

        {/* Face SVG */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          aria-hidden
        >
          {/* UNPRO house icon on forehead */}
          <g
            transform="translate(50 30)"
            stroke={`hsl(${rim} / 0.95)`}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#alex-glow)"
          >
            <path d="M-7 0 L0 -6 L7 0" />
            <path d="M-5 0 L-5 6 L5 6 L5 0" />
          </g>

          {/* Eyes */}
          <g fill={`hsl(${rim})`} filter="url(#alex-glow)">
            <ellipse cx={40} cy={58} rx={eyes.rx} ry={eyes.ry}>
              {state === "listening" && (
                <animate attributeName="ry" values={`${eyes.ry};${eyes.ry * 0.4};${eyes.ry}`} dur="2.2s" repeatCount="indefinite" />
              )}
              {state === "thinking" && (
                <animate attributeName="opacity" values="1;0.5;1" dur="1.2s" repeatCount="indefinite" />
              )}
            </ellipse>
            <ellipse cx={60} cy={58} rx={eyes.rx} ry={eyes.ry}>
              {state === "listening" && (
                <animate attributeName="ry" values={`${eyes.ry};${eyes.ry * 0.4};${eyes.ry}`} dur="2.2s" repeatCount="indefinite" />
              )}
              {state === "thinking" && (
                <animate attributeName="opacity" values="1;0.5;1" dur="1.2s" repeatCount="indefinite" begin="0.4s" />
              )}
            </ellipse>
          </g>

          {/* Mouth — always rendered so the orb never looks blank */}
          <path
            d={
              state === "speaking"
                ? "M42 71 Q50 76 58 71"
                : expression === "happy"
                ? "M42 71 Q50 75 58 71"
                : "M43 72 Q50 74 57 72"
            }
            stroke={`hsl(${rim} / 0.9)`}
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            filter="url(#alex-glow)"
          >
            {state === "speaking" && (
              <animate
                attributeName="d"
                values="M42 71 Q50 75 58 71;M42 71 Q50 80 58 71;M42 71 Q50 73 58 71"
                dur="0.45s"
                repeatCount="indefinite"
              />
            )}
          </path>

          <defs>
            <filter id="alex-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="0.7" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* Listening pulse rings */}
        {state === "listening" && (
          <>
            <span
              aria-hidden
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow: `0 0 0 0 hsl(${rim} / 0.6)`,
                animation: "alex-orb-ring 2.4s ease-out infinite",
              }}
            />
            <span
              aria-hidden
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow: `0 0 0 0 hsl(${rim} / 0.4)`,
                animation: "alex-orb-ring 2.4s ease-out 0.8s infinite",
              }}
            />
          </>
        )}
      </button>

      {/* Floating shadow + base glow disc */}
      <div
        aria-hidden
        className="relative pointer-events-none"
        style={{ width: px, height: Math.round(px * 0.22), marginTop: -Math.round(px * 0.02) }}
      >
        {/* Hard shadow */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 rounded-full"
          style={{
            width: px * 0.7,
            height: px * 0.12,
            background: "hsl(220 80% 2% / 0.85)",
            filter: "blur(14px)",
          }}
        />
        {/* Blue base light */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            top: px * 0.04,
            width: px * 0.95,
            height: px * 0.18,
            background: `radial-gradient(ellipse at center, hsl(${rim} / 0.7), hsl(${rim} / 0.0) 70%)`,
            filter: "blur(10px)",
            animation: active
              ? "alex-orb-base-pulse 1.6s ease-in-out infinite"
              : "alex-orb-base-pulse 4s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes alex-orb-float {
          0%, 100% { transform: translateY(-6px); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes alex-orb-ring {
          0%   { box-shadow: 0 0 0 0    hsl(${rim} / 0.55); opacity: 0.9; }
          100% { box-shadow: 0 0 0 22px hsl(${rim} / 0);    opacity: 0;   }
        }
        @keyframes alex-orb-base-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
