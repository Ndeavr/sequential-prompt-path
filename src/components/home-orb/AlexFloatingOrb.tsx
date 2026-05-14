/**
 * AlexFloatingOrb — Premium floating expressive Alex orb.
 *
 * Reusable. Mobile-first. Glossy black sphere with electric-blue rim glow,
 * UNPRO house icon on forehead, expressive LED eyes, soft blue base light.
 *
 * States: idle | listening | thinking | speaking | success | error
 * Expressions: neutral | happy | focused | concerned | confident
 *
 * Audio reactivity via audioLevelIn / audioLevelOut (0..1).
 */
import { useEffect, useRef, useState } from "react";

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
  audioLevelIn?: number;  // 0..1 mic
  audioLevelOut?: number; // 0..1 tts
  size?: "mobile" | "desktop";
  showHouseIcon?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

const SIZE = { mobile: 240, desktop: 320 };

// Resolve a glow palette per state
function palette(state: AlexOrbState) {
  switch (state) {
    case "thinking":
      return { rim: "262 90% 65%", core: "230 90% 55%", base: "245 90% 55%" };
    case "success":
      return { rim: "180 100% 60%", core: "190 100% 50%", base: "195 100% 55%" };
    case "error":
      return { rim: "35 100% 60%", core: "30 100% 50%", base: "35 100% 55%" };
    default:
      return { rim: "212 100% 62%", core: "212 100% 50%", base: "212 100% 55%" };
  }
}

export default function AlexFloatingOrb({
  state = "idle",
  expression = "neutral",
  audioLevelIn = 0,
  audioLevelOut = 0,
  size = "mobile",
  showHouseIcon = true,
  onClick,
  ariaLabel = "Parler à Alex",
}: AlexFloatingOrbProps) {
  const dim = SIZE[size];
  const pal = palette(state);

  // Smoothed audio level used to drive scale + eye pulse
  const level = Math.max(audioLevelIn, audioLevelOut);
  const reactive = state === "listening" || state === "speaking";
  const scale = 1 + (reactive ? level * 0.04 : 0);

  // Soft float (vertical breathing motion)
  const [floatT, setFloatT] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const loop = (now: number) => {
      setFloatT((now - start) / 1000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);
  const floatY = Math.sin(floatT * 1.4) * 6;

  // Expression → eye geometry
  const eye = (() => {
    switch (expression) {
      case "happy":
        return { w: 14, h: 22, radius: 10, curve: true };
      case "focused":
        return { w: 10, h: 30, radius: 5, curve: false };
      case "concerned":
        return { w: 12, h: 22, radius: 6, curve: false };
      case "confident":
        return { w: 14, h: 30, radius: 7, curve: false };
      default:
        return { w: 12, h: 28, radius: 6, curve: false };
    }
  })();

  const eyeBoost = reactive ? 1 + level * 0.35 : 1;
  const thinking = state === "thinking";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group relative outline-none select-none"
      style={{ width: dim, height: dim + 40 }}
    >
      {/* Floor light puddle */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
        style={{
          bottom: 4,
          width: dim * 0.78,
          height: 32,
          background: `radial-gradient(ellipse at center, hsl(${pal.base} / 0.7), transparent 70%)`,
          filter: "blur(10px)",
        }}
        aria-hidden
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
        style={{
          bottom: 0,
          width: dim * 0.5,
          height: 8,
          background: `radial-gradient(ellipse at center, hsl(${pal.base} / 0.9), transparent 70%)`,
          filter: "blur(4px)",
        }}
        aria-hidden
      />

      {/* Floating sphere wrapper */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: 0,
          width: dim,
          height: dim,
          transform: `translate(-50%, ${floatY}px) scale(${scale})`,
          transition: "transform 120ms ease-out",
        }}
      >
        {/* Outer ambient halo */}
        <div
          className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 60%, hsl(${pal.core} / 0.55), transparent 60%)`,
            opacity: 0.7 + level * 0.3,
          }}
          aria-hidden
        />

        {/* Glossy black sphere */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            background: `
              radial-gradient(circle at 32% 28%, hsl(220 60% 22%) 0%, hsl(222 70% 12%) 28%, hsl(222 80% 6%) 55%, #02060d 100%),
              radial-gradient(circle at 70% 80%, hsl(${pal.core} / 0.6), transparent 50%)
            `,
            boxShadow: `
              inset 0 -28px 60px hsl(${pal.core} / 0.35),
              inset 0 0 0 1px hsl(${pal.rim} / 0.5),
              0 28px 70px -10px hsl(${pal.core} / 0.5),
              0 0 ${60 + level * 60}px hsl(${pal.rim} / ${0.35 + level * 0.4})
            `,
          }}
        >
          {/* Top highlight reflection */}
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full opacity-70 pointer-events-none"
            style={{
              width: "55%",
              height: "22%",
              background:
                "radial-gradient(ellipse at center, hsl(210 100% 90% / 0.55), transparent 70%)",
              filter: "blur(6px)",
            }}
            aria-hidden
          />

          {/* House icon on forehead */}
          {showHouseIcon && (
            <svg
              viewBox="0 0 24 24"
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: "20%",
                width: dim * 0.18,
                height: dim * 0.18,
                filter: `drop-shadow(0 0 12px hsl(${pal.rim} / 0.75))`,
              }}
              fill="none"
              stroke={`hsl(${pal.rim})`}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 11 12 3l9 8" />
              <path d="M5 10v10h14V10" />
              <path d="M10 20v-5h4v5" />
            </svg>
          )}

          {/* Eyes / thinking dots */}
          {!thinking ? (
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-center"
              style={{ top: "54%", gap: dim * 0.075 }}
            >
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className="block"
                  style={{
                    width: eye.w,
                    height: eye.h * eyeBoost,
                    borderRadius: eye.radius,
                    background: `linear-gradient(180deg, hsl(200 100% 85%), hsl(${pal.core}))`,
                    boxShadow: `0 0 14px hsl(${pal.rim}), 0 0 28px hsl(${pal.rim} / 0.7)`,
                    transform: eye.curve
                      ? `rotate(${i === 0 ? -10 : 10}deg)`
                      : undefined,
                    transition: "height 80ms ease-out",
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-center"
              style={{ top: "58%", gap: 8 }}
              aria-hidden
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block w-2.5 h-2.5 rounded-full"
                  style={{
                    background: `hsl(${pal.rim})`,
                    boxShadow: `0 0 10px hsl(${pal.rim})`,
                    animation: `alex-think 1.2s ease-in-out ${i * 0.18}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Speaking pulse ring */}
          {state === "speaking" && (
            <span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow: `0 0 0 2px hsl(${pal.rim} / 0.6), 0 0 60px hsl(${pal.core} / 0.6)`,
                animation: "alex-pulse 1.4s ease-out infinite",
              }}
              aria-hidden
            />
          )}

          {/* Listening expanding rings */}
          {state === "listening" && (
            <>
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    boxShadow: `0 0 0 1.5px hsl(${pal.rim} / 0.5)`,
                    animation: `alex-ring 1.8s ease-out ${i * 0.6}s infinite`,
                  }}
                  aria-hidden
                />
              ))}
            </>
          )}

          {/* Thinking shimmer */}
          {thinking && (
            <span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: `conic-gradient(from 0deg, transparent, hsl(${pal.rim} / 0.35), transparent 60%)`,
                animation: "alex-spin 3s linear infinite",
                mixBlendMode: "screen",
              }}
              aria-hidden
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes alex-pulse {
          0% { box-shadow: 0 0 0 0 hsl(${pal.rim} / 0.55), 0 0 60px hsl(${pal.core} / 0.55); }
          100% { box-shadow: 0 0 0 28px hsl(${pal.rim} / 0), 0 0 80px hsl(${pal.core} / 0); }
        }
        @keyframes alex-ring {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes alex-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes alex-think {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </button>
  );
}
