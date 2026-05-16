/**
 * AlexMorphingOrb — Living AI presence (no button chrome, no flat circle).
 *
 * Layered translucent atmosphere:
 *  - SVG turbulence-distorted nebula
 *  - Drifting plasma blobs (3 independent timings)
 *  - Chromatic aberration rings
 *  - Inner stars / depth particles
 *  - Breathing halo + idle micro-drift
 *
 * No canvas. Mobile-perf safe. Reduced-motion aware.
 */
import { motion } from "framer-motion";
import { useCallback, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import useAlexGestures, { type GestureDirection } from "@/hooks/useAlexGestures";
import AlexGestureMenu from "@/components/alex/AlexGestureMenu";

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
  /** Single-tap. Falls back to onClick for backwards compatibility. */
  onTap?: () => void;
  /** @deprecated use onTap. Kept so existing call sites keep working. */
  onClick?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Disable gesture detection entirely (fall back to plain click). */
  gesturesDisabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

const SIZE_PX: Record<AlexOrbSize, number> = { sm: 64, md: 128, lg: 196 };

const STATE_TUNING: Record<
  AlexOrbStateV2,
  {
    breath: number;     // halo breath (s)
    plasma: number;     // plasma morph base (s)
    drift: number;      // whole-orb drift (s)
    glow: number;       // 0..1
    sat: number;        // saturation
    hue: number;        // hue-rotate deg
    chroma: number;     // chromatic aberration opacity
    turbulence: number; // SVG baseFrequency
    plasmaScale: number;
    grayscale: number;
  }
> = {
  idle:      { breath: 4.5, plasma: 7,   drift: 9,   glow: 0.7,  sat: 1.05, hue: 0,   chroma: 0.10, turbulence: 0.010, plasmaScale: 1.0,  grayscale: 0 },
  listening: { breath: 1.6, plasma: 3,   drift: 6,   glow: 1.0,  sat: 1.2,  hue: -8,  chroma: 0.18, turbulence: 0.020, plasmaScale: 1.06, grayscale: 0 },
  thinking:  { breath: 5.5, plasma: 9,   drift: 11,  glow: 0.8,  sat: 1.1,  hue: 22,  chroma: 0.14, turbulence: 0.008, plasmaScale: 1.0,  grayscale: 0 },
  speaking:  { breath: 0.7, plasma: 0.6, drift: 7,   glow: 0.95, sat: 1.15, hue: -4,  chroma: 0.16, turbulence: 0.014, plasmaScale: 1.04, grayscale: 0 },
  error:     { breath: 6.0, plasma: 12,  drift: 14,  glow: 0.3,  sat: 0.4,  hue: 0,   chroma: 0.04, turbulence: 0.005, plasmaScale: 0.96, grayscale: 0.6 },
};

export default function AlexMorphingOrb({
  state = "idle",
  size = "md",
  onTap,
  onClick,
  onDoubleTap,
  onLongPress,
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  gesturesDisabled,
  className,
  ariaLabel = "Alex",
}: Props) {
  const [ripple, setRipple] = useState(0);
  const [recognisedDir, setRecognisedDir] = useState<GestureDirection>(null);
  const px = SIZE_PX[size];
  const t = STATE_TUNING[state];
  

  const tapHandler = onTap ?? onClick;

  const fireRipple = useCallback(() => setRipple((n) => n + 1), []);

  const { state: gesture, handlers } = useAlexGestures({
    disabled: gesturesDisabled,
    onTap: () => {
      fireRipple();
      tapHandler?.();
    },
    onDoubleTap: () => {
      fireRipple();
      onDoubleTap?.();
    },
    onLongPress: () => {
      onLongPress?.();
    },
    onLongPressEnd: (dir) => {
      if (dir) {
        setRecognisedDir(dir);
        fireRipple();
        window.setTimeout(() => setRecognisedDir(null), 600);
      }
    },
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
  });

  const longPressScale = gesture.isGestureActive ? 1.08 : 1;
  // Subtle drag-follow on the orb itself (visual magnet effect)
  const followX = gesture.isGestureActive ? gesture.dragX * 0.12 : 0;
  const followY = gesture.isGestureActive ? gesture.dragY * 0.12 : 0;

  const cssVars: CSSProperties = {
    width: px,
    height: px,
    // @ts-expect-error custom props
    "--orb-breath": `${t.breath}s`,
    "--orb-plasma": `${t.plasma}s`,
    "--orb-drift": `${t.drift}s`,
    "--orb-glow": t.glow,
    "--orb-sat": t.sat,
    "--orb-hue": `${t.hue}deg`,
    "--orb-chroma": t.chroma,
    "--orb-plasma-scale": t.plasmaScale,
    "--orb-gray": t.grayscale,
  };

  return (
    <button
      type="button"
      {...handlers}
      aria-label={ariaLabel}
      className={cn(
        "alex-orb group relative inline-block bg-transparent border-0 p-0 m-0 align-middle",
        "cursor-pointer select-none focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-blue-400/40",
        className,
      )}
      style={{
        ...cssVars,
        touchAction: "manipulation",
        transform: `translate(${followX}px, ${followY}px) scale(${longPressScale})`,
        transition: gesture.isGestureActive
          ? "transform 60ms linear"
          : "transform 280ms cubic-bezier(.2,.8,.2,1)",
      }}
    >
      <style>{ALEX_ORB_CSS}</style>

      {/* SVG displacement filter intentionally removed: it produced a
          rectangular bounding box visible as a square around the orb. */}

      {/* Drift wrapper — whole orb breathes positionally */}
      <span aria-hidden className="alex-orb__drift">
        {/* NOTE: no SVG displacement filter here — its rectangular filter
            region was producing a visible square halo around the orb. */}
        <span aria-hidden className="alex-orb__atmosphere" />
        <span aria-hidden className="alex-orb__nebula" />
        <span aria-hidden className="alex-orb__halo" />
        <span aria-hidden className="alex-orb__caustics" />
        <span aria-hidden className="alex-orb__sphere" />
        <span aria-hidden className="alex-orb__rim" />

        <motion.span
          aria-hidden
          className="alex-orb__plasma alex-orb__plasma--a"
          animate={
            state === "speaking"
              ? { scaleY: [1, 1.2, 0.88, 1.15, 1], scaleX: [1, 0.92, 1.08, 0.95, 1] }
              : { scale: [1, 1.05, 1] }
          }
          transition={{
            duration: state === "speaking" ? 0.65 : t.plasma,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <span aria-hidden className="alex-orb__plasma alex-orb__plasma--b" />
        <span aria-hidden className="alex-orb__plasma alex-orb__plasma--c" />

        <span aria-hidden className="alex-orb__chroma alex-orb__chroma--r" />
        <span aria-hidden className="alex-orb__chroma alex-orb__chroma--c" />

        <span aria-hidden className="alex-orb__highlight" />

        <span aria-hidden className="alex-orb__star alex-orb__star--1" />
        <span aria-hidden className="alex-orb__star alex-orb__star--2" />
        <span aria-hidden className="alex-orb__star alex-orb__star--3" />
        <span aria-hidden className="alex-orb__star alex-orb__star--4" />

        {state === "thinking" && <span aria-hidden className="alex-orb__shimmer" />}
      </span>

      {/* Ripple on tap / gesture-recognised */}
      {ripple > 0 && (
        <motion.span
          key={ripple}
          aria-hidden
          className="alex-orb__ripple"
          initial={{ scale: 0.5, opacity: 0.55 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      )}

      {/* Recognised-direction flash arrow tint */}
      {recognisedDir && (
        <motion.span
          aria-hidden
          className="alex-orb__ripple"
          initial={{ scale: 0.7, opacity: 0.7 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          style={{
            borderColor: "hsl(252 100% 75% / 0.85)",
            boxShadow: "0 0 40px hsl(252 100% 70% / 0.65)",
          }}
        />
      )}

      {/* Radial gesture menu (long-press) */}
      <AlexGestureMenu
        open={gesture.isGestureActive}
        direction={gesture.gestureDirection}
        orbSize={px}
      />
    </button>
  );
}

/* ─── Scoped CSS ─── */
const ALEX_ORB_CSS = `
.alex-orb {
  -webkit-tap-highlight-color: transparent;
  line-height: 0;
  /* HARD LOCK — no ancestor utility can reintroduce a card/square */
  background: transparent !important;
  background-color: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  border-radius: 9999px !important;
  overflow: visible !important;
  padding: 0 !important;
  margin: 0 !important;
  filter: none !important;
  isolation: isolate;
  contain: none !important;
  -webkit-mask-image: none !important;
          mask-image: none !important;
}
.alex-orb > span,
.alex-orb__drift > span { position: absolute; inset: 0; border-radius: 9999px; pointer-events: none; }
.alex-orb__drift { position: absolute; inset: 0; display: block; overflow: visible; will-change: transform; animation: alexOrbDrift var(--orb-drift) ease-in-out infinite; }

.alex-orb__atmosphere {
  inset: -80% !important;
  background: radial-gradient(circle at 50% 50%,
    hsl(212 100% 65% / 0.18) 0%,
    hsl(252 100% 70% / 0.10) 30%,
    hsl(212 100% 65% / 0.04) 48%,
    transparent 72%);
  opacity: calc(0.85 * var(--orb-glow));
  mix-blend-mode: screen;
  filter: none !important;
  -webkit-mask: none !important;
          mask: none !important;
}

.alex-orb__nebula {
  inset: -25% !important;
  background:
    radial-gradient(ellipse 60% 50% at 30% 30%, hsl(195 100% 70% / 0.24), transparent 62%),
    radial-gradient(ellipse 55% 45% at 75% 70%, hsl(265 100% 75% / 0.20), transparent 62%);
  filter: saturate(var(--orb-sat));
  mix-blend-mode: screen;
  -webkit-mask: radial-gradient(circle, black 0%, black 52%, transparent 76%);
          mask: radial-gradient(circle, black 0%, black 52%, transparent 76%);
  animation: alexOrbNebula calc(var(--orb-plasma) * 2) ease-in-out infinite;
}

.alex-orb__halo {
  inset: -45% !important;
  background: radial-gradient(circle,
    hsl(212 100% 65% / calc(0.55 * var(--orb-glow))) 0%,
    hsl(252 100% 70% / calc(0.25 * var(--orb-glow))) 35%,
    transparent 70%);
  filter: blur(20px);
  mix-blend-mode: screen;
  -webkit-mask: radial-gradient(circle, black 30%, transparent 75%);
          mask: radial-gradient(circle, black 30%, transparent 75%);
  animation: alexOrbBreath var(--orb-breath) ease-in-out infinite;
}

.alex-orb__caustics {
  inset: -3% !important;
  background: conic-gradient(from 0deg,
    transparent 0%,
    hsl(195 100% 80% / 0.18) 20%,
    transparent 40%,
    hsl(252 100% 80% / 0.14) 65%,
    transparent 90%);
  -webkit-mask: radial-gradient(circle, transparent 55%, black 65%, transparent 85%);
          mask: radial-gradient(circle, transparent 55%, black 65%, transparent 85%);
  filter: blur(6px) saturate(var(--orb-sat)) hue-rotate(var(--orb-hue));
  opacity: calc(0.7 * var(--orb-glow));
  animation: alexOrbRotate calc(var(--orb-plasma) * 3) linear infinite;
}

.alex-orb__sphere {
  inset: 6% !important;
  background:
    /* top-left specular hotspot */
    radial-gradient(ellipse 22% 16% at 30% 22%, hsl(0 0% 100% / 0.95) 0%, hsl(195 100% 92% / 0.55) 35%, transparent 65%),
    /* secondary soft sheen */
    radial-gradient(ellipse 45% 32% at 38% 30%, hsl(195 100% 88% / 0.35) 0%, transparent 60%),
    /* cyan->violet->deep navy body */
    radial-gradient(circle at 50% 55%,
      hsl(200 100% 70% / 0.95) 0%,
      hsl(220 95% 50% / 0.92) 35%,
      hsl(248 80% 28% / 0.95) 70%,
      hsl(232 90% 10% / 1) 100%);
  filter: saturate(calc(var(--orb-sat) * 1.1)) hue-rotate(var(--orb-hue));
  opacity: 1;
  box-shadow:
    inset 0 -18% 30% -10% hsl(258 90% 18% / 0.8),
    inset 0 12% 24% -8% hsl(195 100% 80% / 0.35);
}

/* Bright cyan rim light around the sphere edge */
.alex-orb__rim {
  inset: 6% !important;
  background: transparent;
  box-shadow:
    inset 0 0 0 1.5px hsl(190 100% 78% / 0.55),
    inset 0 6px 18px -2px hsl(190 100% 85% / 0.7),
    inset 2px 4px 12px -2px hsl(210 100% 88% / 0.55),
    inset -6px -10px 22px -4px hsl(255 90% 55% / 0.45);
  mix-blend-mode: screen;
  opacity: calc(0.95 * var(--orb-glow));
}

.alex-orb__plasma { inset: 14% !important; mix-blend-mode: screen; will-change: transform, border-radius; opacity: 0.55; }
.alex-orb__plasma--a {
  background: radial-gradient(circle at 35% 40%, hsl(195 100% 78% / 0.7), hsl(212 100% 60% / 0.25) 45%, transparent 75%);
  border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%;
  filter: blur(14px);
  transform: scale(var(--orb-plasma-scale));
  animation: alexOrbMorphA var(--orb-plasma) ease-in-out infinite;
}
.alex-orb__plasma--b {
  inset: 20% !important;
  background: radial-gradient(circle at 70% 65%, hsl(265 100% 78% / 0.55), hsl(252 90% 55% / 0.2) 50%, transparent 80%);
  border-radius: 45% 55% 40% 60% / 60% 40% 55% 45%;
  filter: blur(16px);
  animation: alexOrbMorphB calc(var(--orb-plasma) * 1.4) ease-in-out infinite reverse;
}
.alex-orb__plasma--c {
  inset: 34% !important;
  background: radial-gradient(circle, hsl(180 100% 85% / 0.5), transparent 70%);
  border-radius: 55% 45% 60% 40%;
  filter: blur(8px);
  animation: alexOrbDart calc(var(--orb-plasma) * 0.8) ease-in-out infinite;
}

.alex-orb__chroma {
  inset: 6% !important;
  background: transparent;
  mix-blend-mode: screen;
  opacity: calc(var(--orb-chroma) * 1.2);
  filter: blur(3px);
  -webkit-mask: radial-gradient(circle, transparent 60%, black 66%, black 70%, transparent 78%);
          mask: radial-gradient(circle, transparent 60%, black 66%, black 70%, transparent 78%);
}
.alex-orb__chroma--r { background: radial-gradient(circle, hsl(0 100% 65% / 0.7), transparent 75%); transform: translate(1px, 0); }
.alex-orb__chroma--c { background: radial-gradient(circle, hsl(180 100% 75% / 0.85), transparent 75%); transform: translate(-1px, 0); }

.alex-orb__highlight {
  inset: 8% !important;
  background: radial-gradient(ellipse 26% 16% at 32% 22%, hsl(0 0% 100% / 0.7), transparent 65%);
  filter: blur(2px);
  animation: alexOrbBreath calc(var(--orb-breath) * 1.3) ease-in-out infinite;
}

.alex-orb__star {
  width: 2px !important; height: 2px !important;
  inset: auto !important;
  background: hsl(0 0% 100% / 0.9);
  box-shadow: 0 0 4px hsl(0 0% 100% / 0.7);
  border-radius: 50%;
}
.alex-orb__star--1 { top: 30% !important; left: 38% !important; animation: alexOrbStar 4s ease-in-out infinite; }
.alex-orb__star--2 { top: 55% !important; left: 60% !important; animation: alexOrbStar 5.5s ease-in-out infinite 0.8s; }
.alex-orb__star--3 { top: 42% !important; left: 50% !important; animation: alexOrbStar 6s ease-in-out infinite 1.6s; }
.alex-orb__star--4 { top: 60% !important; left: 40% !important; animation: alexOrbStar 4.8s ease-in-out infinite 2.2s; }

.alex-orb__shimmer {
  inset: 18% !important;
  background: conic-gradient(from 0deg, transparent 0%, hsl(252 100% 80% / 0.45) 30%, transparent 60%);
  filter: blur(10px);
  mix-blend-mode: screen;
  animation: alexOrbRotate 3.5s linear infinite;
}

.alex-orb__ripple {
  position: absolute !important;
  inset: 0;
  border-radius: 9999px;
  border: 2px solid hsl(212 100% 70% / 0.6);
  box-shadow: 0 0 30px hsl(212 100% 70% / 0.45);
  pointer-events: none;
}

@keyframes alexOrbBreath {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.1); opacity: 0.82; }
}
@keyframes alexOrbDrift {
  0%, 100% { transform: translate(0, 0); }
  25%      { transform: translate(2px, -3px); }
  50%      { transform: translate(-1px, 2px); }
  75%      { transform: translate(-3px, -1px); }
}
@keyframes alexOrbRotate { to { transform: rotate(360deg); } }
@keyframes alexOrbNebula {
  0%, 100% { transform: rotate(0deg) scale(1); }
  50%      { transform: rotate(40deg) scale(1.05); }
}
@keyframes alexOrbMorphA {
  0%, 100% { border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; transform: rotate(0deg) scale(var(--orb-plasma-scale, 1)); }
  50%      { border-radius: 40% 60% 45% 55% / 60% 40% 55% 45%; transform: rotate(180deg) scale(calc(var(--orb-plasma-scale, 1) * 1.05)); }
}
@keyframes alexOrbMorphB {
  0%, 100% { border-radius: 45% 55% 40% 60% / 60% 40% 55% 45%; transform: rotate(0deg) scale(1); }
  50%      { border-radius: 55% 45% 60% 40% / 40% 60% 45% 55%; transform: rotate(-180deg) scale(0.96); }
}
@keyframes alexOrbDart {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
  33%      { transform: translate(10%, -8%) scale(1.2); opacity: 1; }
  66%      { transform: translate(-8%, 6%) scale(0.85); opacity: 0.6; }
}
@keyframes alexOrbStar {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50%      { opacity: 1;   transform: scale(1.3); }
}

@media (prefers-reduced-motion: reduce) {
  .alex-orb__drift,
  .alex-orb__nebula,
  .alex-orb__halo,
  .alex-orb__caustics,
  .alex-orb__plasma,
  .alex-orb__shimmer,
  .alex-orb__highlight,
  .alex-orb__star,
  .alex-orb__atmosphere { animation: none !important; }
  .alex-orb__svg-defs { display: none; }
  .alex-orb__atmosphere { filter: none !important; }
}
`;
