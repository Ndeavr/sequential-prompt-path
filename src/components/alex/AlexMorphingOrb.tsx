/**
 * AlexMorphingOrb — Premium living AI orb (Copilot-energy, original to UNPRO).
 *
 * Layered glass/plasma sphere with state-driven morph + glow. No canvas.
 * - Tailwind + Framer Motion + CSS keyframes
 * - Reduced-motion aware
 * - Reusable across hero, companion, inline contexts
 */
import { motion } from "framer-motion";
import { useCallback, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type AlexOrbStateV2 =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export type AlexOrbSize = "sm" | "md" | "lg";

interface Props {
  state?: AlexOrbStateV2;
  size?: AlexOrbSize;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

const SIZE_PX: Record<AlexOrbSize, number> = { sm: 56, md: 112, lg: 176 };

const STATE_TUNING: Record<
  AlexOrbStateV2,
  { breath: number; glow: number; rim: number; scale: number; sat: number; hue: number }
> = {
  idle:      { breath: 4.5, glow: 0.55, rim: 14, scale: 1.0,  sat: 1.0,  hue: 0 },
  listening: { breath: 1.6, glow: 0.95, rim: 5,  scale: 1.08, sat: 1.15, hue: -8 },
  thinking:  { breath: 5.5, glow: 0.7,  rim: 9,  scale: 1.0,  sat: 1.05, hue: 18 },
  speaking:  { breath: 0.7, glow: 0.9,  rim: 6,  scale: 1.04, sat: 1.1,  hue: -4 },
  error:     { breath: 6.0, glow: 0.25, rim: 30, scale: 0.96, sat: 0.3,  hue: 0 },
};

export default function AlexMorphingOrb({
  state = "idle",
  size = "md",
  onClick,
  className,
  ariaLabel = "Alex",
}: Props) {
  const [ripple, setRipple] = useState(0);
  const px = SIZE_PX[size];
  const t = STATE_TUNING[state];

  const handleClick = useCallback(() => {
    setRipple((n) => n + 1);
    onClick?.();
  }, [onClick]);

  const cssVars: CSSProperties = {
    width: px,
    height: px,
    // @ts-expect-error custom props
    "--orb-breath": `${t.breath}s`,
    "--orb-rim": `${t.rim}s`,
    "--orb-glow": t.glow,
    "--orb-sat": t.sat,
    "--orb-hue": `${t.hue}deg`,
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={cn(
        "alex-orb group relative inline-flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60",
        "cursor-pointer select-none",
        className,
      )}
      style={cssVars}
    >
      <style>{ALEX_ORB_CSS}</style>

      {/* Aura halo */}
      <span aria-hidden className="alex-orb__halo" />

      {/* Outer rotating rim */}
      <span aria-hidden className="alex-orb__rim" />

      {/* Glass sphere */}
      <motion.span
        aria-hidden
        className="alex-orb__sphere"
        animate={{ scale: t.scale }}
        transition={{ type: "spring", stiffness: 120, damping: 16 }}
      />

      {/* Plasma blob A */}
      <motion.span
        aria-hidden
        className="alex-orb__plasma alex-orb__plasma--a"
        animate={
          state === "speaking"
            ? { scaleY: [1, 1.15, 0.92, 1.1, 1], scaleX: [1, 0.95, 1.05, 0.97, 1] }
            : { scale: [1, 1.04, 1] }
        }
        transition={{
          duration: state === "speaking" ? 0.65 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Plasma blob B (counter) */}
      <span aria-hidden className="alex-orb__plasma alex-orb__plasma--b" />

      {/* Inner specular highlight */}
      <span aria-hidden className="alex-orb__highlight" />

      {/* Thinking shimmer */}
      {state === "thinking" && <span aria-hidden className="alex-orb__shimmer" />}

      {/* Ripple on click */}
      {ripple > 0 && (
        <motion.span
          key={ripple}
          aria-hidden
          className="alex-orb__ripple"
          initial={{ scale: 0.6, opacity: 0.55 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      )}
    </button>
  );
}

/* ─── Scoped CSS (keyframes + layered visuals) ─── */
const ALEX_ORB_CSS = `
.alex-orb { -webkit-tap-highlight-color: transparent; }
.alex-orb > span { position: absolute; inset: 0; border-radius: 9999px; pointer-events: none; }

.alex-orb__halo {
  inset: -32%;
  background: radial-gradient(circle at 50% 50%,
    hsl(212 100% 65% / calc(0.55 * var(--orb-glow))) 0%,
    hsl(252 100% 70% / calc(0.30 * var(--orb-glow))) 35%,
    transparent 70%);
  filter: blur(18px) saturate(var(--orb-sat));
  animation: alexOrbBreath var(--orb-breath) ease-in-out infinite;
}

.alex-orb__rim {
  inset: -2%;
  background: conic-gradient(from 0deg,
    hsl(212 100% 70%),
    hsl(195 100% 65%),
    hsl(252 100% 75%),
    hsl(212 100% 70%));
  filter: blur(6px) saturate(var(--orb-sat)) hue-rotate(var(--orb-hue));
  opacity: calc(0.6 * var(--orb-glow));
  -webkit-mask: radial-gradient(circle, transparent 60%, black 62%, black 75%, transparent 78%);
          mask: radial-gradient(circle, transparent 60%, black 62%, black 75%, transparent 78%);
  animation: alexOrbRim var(--orb-rim) linear infinite;
}

.alex-orb__sphere {
  inset: 6%;
  background:
    radial-gradient(circle at 32% 28%, hsl(0 0% 100% / 0.75) 0%, transparent 28%),
    radial-gradient(circle at 50% 55%, hsl(212 100% 60%) 0%, hsl(220 90% 25%) 60%, hsl(225 80% 10%) 100%);
  box-shadow:
    inset 0 0 24px hsl(212 100% 70% / 0.35),
    inset 0 -10px 30px hsl(225 90% 8% / 0.6),
    0 8px 30px hsl(220 90% 10% / 0.5);
  filter: saturate(var(--orb-sat)) hue-rotate(var(--orb-hue));
}

.alex-orb__plasma {
  inset: 14%;
  mix-blend-mode: screen;
  filter: blur(8px);
  opacity: 0.85;
}
.alex-orb__plasma--a {
  background: radial-gradient(circle at 35% 40%,
    hsl(195 100% 70% / 0.9) 0%,
    hsl(212 100% 60% / 0.5) 40%,
    transparent 70%);
  border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%;
  animation: alexOrbMorphA 7s ease-in-out infinite;
}
.alex-orb__plasma--b {
  background: radial-gradient(circle at 70% 65%,
    hsl(252 100% 75% / 0.7) 0%,
    hsl(265 90% 55% / 0.35) 45%,
    transparent 75%);
  border-radius: 45% 55% 40% 60% / 60% 40% 55% 45%;
  animation: alexOrbMorphB 9s ease-in-out infinite reverse;
}

.alex-orb__highlight {
  inset: 8%;
  background: radial-gradient(ellipse 35% 25% at 30% 22%, hsl(0 0% 100% / 0.55), transparent 60%);
  filter: blur(2px);
}

.alex-orb__shimmer {
  inset: 18%;
  background: conic-gradient(from 0deg,
    transparent 0%, hsl(252 100% 80% / 0.5) 30%, transparent 60%);
  filter: blur(10px);
  animation: alexOrbRim 3.5s linear infinite;
  mix-blend-mode: screen;
}

.alex-orb__ripple {
  inset: 0;
  border: 2px solid hsl(212 100% 70% / 0.6);
  box-shadow: 0 0 30px hsl(212 100% 70% / 0.5);
}

@keyframes alexOrbBreath {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.08); opacity: 0.85; }
}
@keyframes alexOrbRim {
  to { transform: rotate(360deg); }
}
@keyframes alexOrbMorphA {
  0%, 100% { border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; transform: rotate(0deg) scale(1); }
  50%      { border-radius: 40% 60% 45% 55% / 60% 40% 55% 45%; transform: rotate(180deg) scale(1.06); }
}
@keyframes alexOrbMorphB {
  0%, 100% { border-radius: 45% 55% 40% 60% / 60% 40% 55% 45%; transform: rotate(0deg) scale(1); }
  50%      { border-radius: 55% 45% 60% 40% / 40% 60% 45% 55%; transform: rotate(-180deg) scale(0.96); }
}

@media (prefers-reduced-motion: reduce) {
  .alex-orb__halo,
  .alex-orb__rim,
  .alex-orb__plasma--a,
  .alex-orb__plasma--b,
  .alex-orb__shimmer { animation: none !important; }
}
`;
