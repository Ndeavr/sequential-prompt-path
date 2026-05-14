/**
 * AlexMicOrb — Premium mic-as-CTA. Idle = static premium hardware button.
 * Comes alive only during interaction (listening / thinking / speaking).
 */
import { Mic } from "lucide-react";

export type MicOrbState = "idle" | "listening" | "thinking" | "speaking";

interface Props {
  state: MicOrbState;
  onClick: () => void;
  size?: number;
}

export default function AlexMicOrb({ state, onClick, size = 88 }: Props) {
  const alive = state !== "idle";
  const ringColor =
    state === "listening"
      ? "rgba(14, 94, 78, 0.45)"
      : state === "speaking"
      ? "rgba(201, 162, 74, 0.55)"
      : "rgba(201, 162, 74, 0.30)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 2, height: size * 2 }}>
      {/* Concentric rings */}
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: size * 1.45,
          height: size * 1.45,
          border: `1.5px solid ${ringColor}`,
          opacity: alive ? 0.9 : 0.45,
          animation: alive ? "alex-ring-pulse 1.6s ease-out infinite" : "alex-ring-breath 3.2s ease-in-out infinite",
        }}
      />
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: size * 1.85,
          height: size * 1.85,
          border: `1.5px solid ${ringColor}`,
          opacity: alive ? 0.55 : 0.25,
          animation: alive
            ? "alex-ring-pulse 1.6s ease-out infinite 0.4s"
            : "alex-ring-breath 3.2s ease-in-out infinite 0.6s",
        }}
      />

      {/* Core mic button */}
      <button
        type="button"
        onClick={onClick}
        aria-label="Parler à Alex"
        className="relative z-10 inline-flex items-center justify-center rounded-full transition active:scale-95"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(180deg, #0E5E4E, #0A4839)",
          boxShadow:
            "0 18px 40px -12px rgba(14, 94, 78, 0.55), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 6px rgba(0,0,0,0.25)",
        }}
      >
        {state === "thinking" ? (
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" style={{ animationDelay: "300ms" }} />
          </span>
        ) : (
          <Mic className="text-white" style={{ width: size * 0.4, height: size * 0.4 }} strokeWidth={2.2} />
        )}
      </button>

      <style>{`
        @keyframes alex-ring-breath {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.06); opacity: 0.55; }
        }
        @keyframes alex-ring-pulse {
          0% { transform: scale(0.85); opacity: 0.7; }
          100% { transform: scale(1.25); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
