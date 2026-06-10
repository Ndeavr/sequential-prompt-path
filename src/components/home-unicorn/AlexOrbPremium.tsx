/**
 * AlexOrbPremium — Liquid glass futuristic orb, voice-state reactive.
 *
 * Subscribes to alexVoiceLockedStore.machineState to modulate:
 *  - breathing speed (idle / listening / thinking / speaking)
 *  - halo intensity and rotation
 *  - particle orbit speed and density
 *  - ambient hue shift
 *
 * Pure CSS animations for 60fps on mobile. No microphone access here —
 * the actual mic capture is owned by the locked overlay voice pipeline.
 */
import { useMemo } from "react";
import { useAlexVoiceLockedStore, type LockedVoiceState } from "@/stores/alexVoiceLockedStore";

interface Props {
  size?: number;
  className?: string;
  /** When false, render the static idle preset regardless of voice state. */
  reactive?: boolean;
  /** Adds idle float + hover scale + cursor pointer affordance. */
  interactive?: boolean;
  /** Show glass "Parler à Alex" pill below the orb (hover/focus, or always when forced). */
  showLabel?: boolean;
  /** Show state caption ("Alex réfléchit…"). Error captions are intentionally not surfaced. */
  showCaption?: boolean;
  /** Force a visual state regardless of the store (e.g. "error" from overlay). */
  forceState?: OrbVisualState | "error";
}

type OrbVisualState = "idle" | "listening" | "thinking" | "speaking" | "processing" | "error";

function mapMachineToOrb(state: LockedVoiceState): OrbVisualState {
  switch (state) {
    case "listening":
    case "capturing_voice":
    case "session_ready":
      return "listening";
    case "processing_stt":
    case "processing_response":
      return "thinking";
    case "speaking":
      return "speaking";
    case "opening_session":
    case "requesting_permission":
    case "stabilizing":
      return "processing";
    case "error_recoverable":
    case "error_fatal":
      return "error";
    default:
      return "idle";
  }
}

const STATE_TUNING: Record<OrbVisualState, {
  breatheSec: number;
  haloOpacity: number;
  haloSpinSec: number;
  auraScale: number;
  glow: string;
  swirlSec: number;
  particleBoost: number;
}> = {
  idle:       { breatheSec: 4.2, haloOpacity: 0.55, haloSpinSec: 18, auraScale: 1.35, glow: "rgba(37,99,255,0.45)",  swirlSec: 22, particleBoost: 1 },
  listening:  { breatheSec: 2.4, haloOpacity: 0.85, haloSpinSec: 9,  auraScale: 1.55, glow: "rgba(34,211,238,0.72)", swirlSec: 14, particleBoost: 1.25 },
  thinking:   { breatheSec: 3.0, haloOpacity: 0.75, haloSpinSec: 5,  auraScale: 1.42, glow: "rgba(139,92,246,0.65)", swirlSec: 9,  particleBoost: 1.4 },
  speaking:   { breatheSec: 1.6, haloOpacity: 0.95, haloSpinSec: 7,  auraScale: 1.62, glow: "rgba(99,102,241,0.78)", swirlSec: 12, particleBoost: 1.35 },
  processing: { breatheSec: 3.6, haloOpacity: 0.70, haloSpinSec: 6,  auraScale: 1.40, glow: "rgba(189,231,255,0.65)", swirlSec: 11, particleBoost: 1.2 },
  error:      { breatheSec: 6.0, haloOpacity: 0.30, haloSpinSec: 24, auraScale: 1.20, glow: "rgba(180,83,9,0.35)",   swirlSec: 26, particleBoost: 0.6 },
};

export default function AlexOrbPremium({
  size = 200,
  className = "",
  reactive = true,
  interactive = false,
  showLabel = false,
  showCaption = false,
  forceState,
}: Props) {
  const machineState = useAlexVoiceLockedStore((s) => s.machineState);
  const mappedState: OrbVisualState = reactive ? mapMachineToOrb(machineState) : "idle";
  const visualState: OrbVisualState = (forceState as OrbVisualState | undefined) ?? mappedState;
  const t = STATE_TUNING[visualState];

  const particles = useMemo(
    () => [
      { r: size * 0.55, d: 9, delay: 0, dot: 6 },
      { r: size * 0.62, d: 12, delay: 1.2, dot: 4 },
      { r: size * 0.48, d: 7, delay: 2.4, dot: 5 },
      { r: size * 0.7, d: 15, delay: 0.6, dot: 3 },
      { r: size * 0.58, d: 10, delay: 3.1, dot: 5 },
      { r: size * 0.66, d: 13, delay: 1.8, dot: 4 },
    ],
    [size]
  );

  return (
    <div
      className={`uc-orb-shell ${className}`}
      data-orb-state={visualState}
      data-interactive={interactive ? "true" : "false"}
      data-show-label={showLabel ? "true" : "false"}
    >
      <div
        className="uc-orb-floater relative inline-block"
        style={{
          width: size,
          height: size,
          transition: "filter 600ms cubic-bezier(.22,1,.36,1)",
          filter: visualState === "speaking" ? "saturate(115%)" : "saturate(100%)",
        }}
        aria-hidden
      >
      {/* Outer atmospheric aura — scales up when listening / speaking */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${t.glow} 0%, rgba(189,231,255,0.18) 35%, transparent 70%)`,
          filter: "blur(22px)",
          transform: `scale(${t.auraScale})`,
          transition: "transform 700ms cubic-bezier(.22,1,.36,1), background 700ms ease",
        }}
      />

      {/* Animated glow ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(37,99,255,0) 0%, rgba(59,130,246,.5) 25%, rgba(189,231,255,.4) 50%, rgba(99,102,241,.5) 75%, rgba(37,99,255,0) 100%)",
          filter: "blur(10px)",
          opacity: t.haloOpacity,
          animation: `spin ${t.haloSpinSec}s linear infinite`,
          transition: "opacity 600ms ease",
        }}
      />

      {/* Listening / speaking pulse rings (only on those states) */}
      {(visualState === "listening" || visualState === "speaking") && (
        <>
          {[0, 0.6, 1.2].map((delay, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: `1.5px solid ${t.glow}`,
                animation: `uc-orb-pulse 1.8s ${visualState === "speaking" ? "ease-out" : "ease-in-out"} ${delay}s infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* Orb core */}
      <div
        className="absolute inset-[8%] rounded-full overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #BDE7FF 12%, #3B82F6 45%, #1E40AF 85%, #0B1E5C 100%)",
          boxShadow: `inset -18px -22px 60px rgba(11,18,60,0.55), inset 14px 18px 50px rgba(255,255,255,0.45), 0 30px 70px -10px ${t.glow}`,
          animation: `uc-breathe ${t.breatheSec}s ease-in-out infinite`,
          transition: "box-shadow 600ms ease",
        }}
      >
        {/* Inner liquid swirl */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 65% 70%, rgba(99,102,241,0.7), transparent 55%), radial-gradient(ellipse at 30% 60%, rgba(56,189,248,0.5), transparent 50%)",
            mixBlendMode: "screen",
            animation: `spin ${t.swirlSec}s linear infinite`,
          }}
        />
        {/* Top specular highlight */}
        <div
          className="absolute rounded-full"
          style={{
            top: "8%",
            left: "18%",
            width: "55%",
            height: "30%",
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.85), rgba(255,255,255,0) 70%)",
            filter: "blur(2px)",
          }}
        />
        {/* Subtle smile glow */}
        <div
          className="absolute"
          style={{
            bottom: "22%",
            left: "50%",
            width: "55%",
            height: "12%",
            transform: "translateX(-50%)",
            borderBottom: "2px solid rgba(189,231,255,0.85)",
            borderRadius: "0 0 100% 100% / 0 0 100% 100%",
            filter: "blur(1.5px)",
            opacity: 0.7,
          }}
        />
      </div>

      {/* Orbiting particles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.dot * t.particleBoost,
              height: p.dot * t.particleBoost,
              background:
                "radial-gradient(circle, rgba(255,255,255,0.95), rgba(189,231,255,0.6) 60%, transparent 100%)",
              boxShadow: "0 0 10px rgba(189,231,255,0.9)",
              ["--r" as never]: `${p.r}px`,
              animation: `uc-orbit ${p.d / t.particleBoost}s linear infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
      </div>
      {showLabel && <span className="uc-orb-label">Parler à Alex</span>}
      {showCaption && <span className="uc-orb-caption" />}
    </div>
  );
}

