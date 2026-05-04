/**
 * AlexOrb — Living AI orb with 13 reactive states.
 *
 * States: idle, hover, greeting, waiting, listening, understanding,
 *         thinking, speaking, asking_question, success, warning, error, sleep
 *
 * Pure CSS + Framer Motion, GPU-friendly, mobile-first, dark-mode optimized.
 */
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlexOrbState =
  | "idle"
  | "hover"
  | "greeting"
  | "waiting"
  | "listening"
  | "understanding"
  | "thinking"
  | "speaking"
  | "asking_question"
  | "success"
  | "warning"
  | "error"
  | "sleep";

export type AlexOrbSize = "sm" | "md" | "lg" | "hero";

export interface AlexOrbProps {
  state?: AlexOrbState;
  size?: AlexOrbSize;
  onClick?: () => void;
  isMuted?: boolean;
  /** 0..1 mic or TTS amplitude */
  volumeLevel?: number;
  theme?: "dark" | "light";
  className?: string;
  ariaLabel?: string;
}

const SIZES: Record<AlexOrbSize, number> = {
  sm: 72,
  md: 96,
  lg: 132,
  hero: 180,
};

/* ───── Per-state palette + tuning ───── */
const PALETTE: Record<
  AlexOrbState,
  {
    primary: string; // hsl
    accent: string;
    pulseDur: number; // s
    haloOpacity: [number, number, number];
    rotateDur: number;
    blobSpeed: number;
    rim: string;
  }
> = {
  idle:            { primary: "222 100% 60%", accent: "200 100% 65%", pulseDur: 3.5, haloOpacity: [0.55, 0.85, 0.55], rotateDur: 16, blobSpeed: 8,  rim: "222 100% 65%" },
  hover:           { primary: "222 100% 65%", accent: "260 100% 70%", pulseDur: 2.4, haloOpacity: [0.65, 1.0,  0.65], rotateDur: 11, blobSpeed: 6,  rim: "222 100% 70%" },
  greeting:        { primary: "210 100% 65%", accent: "180 100% 70%", pulseDur: 1.6, haloOpacity: [0.7,  1.0,  0.7],  rotateDur: 9,  blobSpeed: 5,  rim: "190 100% 70%" },
  waiting:         { primary: "222 60% 55%",  accent: "222 70% 60%",  pulseDur: 5.0, haloOpacity: [0.35, 0.55, 0.35], rotateDur: 22, blobSpeed: 11, rim: "222 70% 55%" },
  listening:       { primary: "200 100% 60%", accent: "190 100% 65%", pulseDur: 1.4, haloOpacity: [0.6,  1.0,  0.6],  rotateDur: 8,  blobSpeed: 4,  rim: "190 100% 65%" },
  understanding:   { primary: "220 100% 60%", accent: "260 100% 70%", pulseDur: 2.2, haloOpacity: [0.55, 0.95, 0.55], rotateDur: 7,  blobSpeed: 5,  rim: "240 100% 70%" },
  thinking:        { primary: "260 100% 65%", accent: "222 100% 60%", pulseDur: 1.8, haloOpacity: [0.55, 0.95, 0.55], rotateDur: 5,  blobSpeed: 3.5,rim: "260 100% 70%" },
  speaking:        { primary: "210 100% 65%", accent: "200 100% 70%", pulseDur: 0.9, haloOpacity: [0.7,  1.0,  0.7],  rotateDur: 7,  blobSpeed: 4,  rim: "200 100% 70%" },
  asking_question: { primary: "230 100% 65%", accent: "270 100% 70%", pulseDur: 1.6, haloOpacity: [0.65, 1.0,  0.65], rotateDur: 9,  blobSpeed: 5,  rim: "250 100% 70%" },
  success:         { primary: "150 80% 55%",  accent: "45 100% 60%",  pulseDur: 1.4, haloOpacity: [0.7,  1.0,  0.7],  rotateDur: 10, blobSpeed: 5,  rim: "150 80% 60%" },
  warning:         { primary: "38 100% 60%",  accent: "30 100% 55%",  pulseDur: 1.6, haloOpacity: [0.6,  0.95, 0.6],  rotateDur: 12, blobSpeed: 6,  rim: "38 100% 60%" },
  error:           { primary: "0 90% 60%",    accent: "15 90% 55%",   pulseDur: 1.2, haloOpacity: [0.55, 0.95, 0.55], rotateDur: 9,  blobSpeed: 5,  rim: "0 90% 60%" },
  sleep:           { primary: "222 40% 40%",  accent: "222 40% 45%",  pulseDur: 6.5, haloOpacity: [0.2,  0.35, 0.2],  rotateDur: 30, blobSpeed: 14, rim: "222 40% 45%" },
};

/* States that emit reactive ripples */
const REACTIVE_STATES = new Set<AlexOrbState>([
  "listening",
  "speaking",
  "asking_question",
  "greeting",
  "success",
]);

const AlexOrbBase = ({
  state = "idle",
  size = "lg",
  onClick,
  isMuted = false,
  volumeLevel = 0,
  theme = "dark",
  className,
  ariaLabel = "Alex",
}: AlexOrbProps) => {
  const reduce = useReducedMotion();
  const px = SIZES[size];
  const palette = PALETTE[state];
  const isReactive = REACTIVE_STATES.has(state);

  // Live amplitude reactivity (mic / TTS)
  const ampScale = 1 + Math.min(0.18, Math.max(0, volumeLevel) * 0.18);

  // Sleep shrink
  const sleepScale = state === "sleep" ? 0.88 : 1;

  // Pause when tab hidden (battery friendly)
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Idle micro-variations: every 20–40s a tiny twinkle
  const [twinkle, setTwinkle] = useState(0);
  const twTimer = useRef<number | null>(null);
  useEffect(() => {
    if (state !== "idle" || reduce) return;
    const schedule = () => {
      const delay = 20000 + Math.random() * 20000;
      twTimer.current = window.setTimeout(() => {
        setTwinkle((v) => v + 1);
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      if (twTimer.current) window.clearTimeout(twTimer.current);
    };
  }, [state, reduce]);

  const animate = visible && !reduce;

  const haloAnim = useMemo(
    () => ({
      scale: animate ? [1, isReactive ? 1.2 : 1.08, 1] : 1,
      opacity: animate ? palette.haloOpacity : palette.haloOpacity[1],
    }),
    [animate, isReactive, palette.haloOpacity]
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 select-none",
        onClick ? "cursor-pointer" : "cursor-default",
        className
      )}
      style={{ width: px, height: px }}
    >
      {/* Outer ambient halo */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, hsl(${palette.primary} / 0.45) 0%, hsl(${palette.accent} / 0.18) 40%, transparent 72%)`,
          filter: `blur(${px * 0.14}px)`,
          transform: `scale(${sleepScale * ampScale})`,
        }}
        animate={haloAnim}
        transition={{
          duration: palette.pulseDur,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Conic rotating ring */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: px * 0.04,
          background: `conic-gradient(from 0deg, hsl(${palette.primary}) 0deg, hsl(${palette.accent}) 120deg, transparent 220deg, hsl(${palette.primary}) 360deg)`,
          mask: "radial-gradient(circle, transparent 60%, black 62%, black 70%, transparent 72%)",
          WebkitMask: "radial-gradient(circle, transparent 60%, black 62%, black 70%, transparent 72%)",
          opacity: state === "sleep" ? 0.35 : 0.85,
        }}
        animate={animate ? { rotate: 360 } : {}}
        transition={{ duration: palette.rotateDur, repeat: Infinity, ease: "linear" }}
      />

      {/* Counter rotating thin ring */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: px * 0.09,
          border: `1px solid hsl(${palette.rim} / 0.35)`,
          boxShadow: `inset 0 0 ${px * 0.18}px hsl(${palette.primary} / 0.28)`,
          opacity: state === "sleep" ? 0.4 : 1,
        }}
        animate={animate ? { rotate: -360 } : {}}
        transition={{ duration: palette.rotateDur * 1.6, repeat: Infinity, ease: "linear" }}
      />

      {/* Glass core */}
      <motion.div
        className="relative rounded-full overflow-hidden"
        style={{
          width: px * 0.7,
          height: px * 0.7,
          background: `radial-gradient(circle at 30% 25%, hsl(${palette.primary} / 0.6), hsl(${palette.primary} / 0.18) 55%, ${
            theme === "dark" ? "hsl(220 60% 7% / 0.96)" : "hsl(0 0% 100% / 0.7)"
          } 100%)`,
          boxShadow: `0 ${px * 0.12}px ${px * 0.35}px -${px * 0.05}px hsl(${palette.primary} / ${state === "sleep" ? 0.25 : 0.55}), inset 0 1px 0 hsl(0 0% 100% / 0.18), inset 0 -${px * 0.12}px ${px * 0.22}px hsl(220 80% 5% / 0.55)`,
          backdropFilter: "blur(8px)",
        }}
        animate={
          animate
            ? {
                scale: [
                  1 * sleepScale * ampScale,
                  (state === "speaking" ? 1.05 : 1.025) * sleepScale * ampScale,
                  1 * sleepScale * ampScale,
                ],
              }
            : { scale: sleepScale * ampScale }
        }
        transition={{ duration: palette.pulseDur, repeat: Infinity, ease: "easeInOut" }}
        whileHover={onClick ? { scale: 1.05 } : undefined}
        whileTap={onClick ? { scale: 0.96 } : undefined}
      >
        {/* Liquid blob 1 */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: "70%",
            height: "70%",
            top: "8%",
            left: "5%",
            background: `radial-gradient(circle, hsl(${palette.primary} / 0.75), transparent 70%)`,
            filter: `blur(${px * 0.07}px)`,
          }}
          animate={animate ? { x: [0, 14, -8, 0], y: [0, -10, 10, 0], scale: [1, 1.12, 0.95, 1] } : {}}
          transition={{ duration: palette.blobSpeed, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Liquid blob 2 */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: "55%",
            height: "55%",
            bottom: "8%",
            right: "5%",
            background: `radial-gradient(circle, hsl(${palette.accent} / 0.65), transparent 70%)`,
            filter: `blur(${px * 0.08}px)`,
          }}
          animate={animate ? { x: [0, -12, 16, 0], y: [0, 10, -10, 0], scale: [1, 0.9, 1.18, 1] } : {}}
          transition={{ duration: palette.blobSpeed * 1.15, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Thinking: galaxy spark */}
        {state === "thinking" && animate && (
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, hsl(0 0% 100% / 0.18) 30deg, transparent 80deg)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Understanding: convergent threads */}
        {state === "understanding" && animate && (
          <>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <motion.span
                key={deg}
                className="absolute left-1/2 top-1/2 origin-left"
                style={{
                  width: px * 0.32,
                  height: 1,
                  background: `linear-gradient(to right, transparent, hsl(${palette.accent} / 0.6))`,
                  transform: `rotate(${deg}deg)`,
                }}
                animate={{ opacity: [0.2, 0.9, 0.2], scaleX: [0.6, 1, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: (deg / 360) * 0.6 }}
              />
            ))}
          </>
        )}

        {/* Greeting smile arc */}
        {state === "greeting" && animate && (
          <motion.div
            className="absolute left-1/2 top-[58%] -translate-x-1/2 rounded-full"
            style={{
              width: "55%",
              height: "30%",
              border: "2px solid hsl(0 0% 100% / 0.55)",
              borderColor: "transparent transparent hsl(0 0% 100% / 0.55) transparent",
              filter: "blur(0.4px)",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.8, 1, 1.05] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.2 }}
          />
        )}

        {/* Error crackle */}
        {state === "error" && animate && (
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(90deg, transparent 0 6px, hsl(0 100% 70% / 0.18) 6px 7px)",
            }}
            animate={{ opacity: [0.6, 0, 0.5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Specular highlight */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "10%",
            left: "18%",
            width: "30%",
            height: "18%",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, hsl(0 0% 100% / 0.55), transparent 70%)",
            filter: "blur(4px)",
          }}
        />

        {/* Center monogram */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-display font-bold text-white"
            style={{
              fontSize: px * 0.28,
              textShadow: `0 2px ${px * 0.08}px hsl(${palette.primary} / 0.85)`,
              opacity: state === "sleep" ? 0.55 : 1,
            }}
          >
            A
          </span>
        </div>

        {/* Idle twinkle (every 20–40s) */}
        {state === "idle" && animate && (
          <motion.div
            key={twinkle}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, hsl(0 0% 100% / 0.4), transparent 50%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0] }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        )}
      </motion.div>

      {/* Reactive ripples (listening / speaking / greeting / asking / success) */}
      {animate && isReactive &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={`${state}-${i}`}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: `1px solid hsl(${palette.rim} / 0.45)`,
            }}
            animate={{ scale: [1, 1.35 + i * 0.1], opacity: [0.55, 0] }}
            transition={{
              duration: state === "speaking" ? 1.3 : 1.9,
              repeat: Infinity,
              delay: i * 0.35,
              ease: "easeOut",
            }}
          />
        ))}

      {/* Listening waveform sides */}
      {state === "listening" && animate && (
        <>
          {[-1, 1].map((dir) => (
            <div
              key={dir}
              className="absolute top-1/2 -translate-y-1/2 flex items-center gap-[3px]"
              style={{
                [dir === -1 ? "right" : "left"]: "100%",
                marginLeft: dir === 1 ? 6 : 0,
                marginRight: dir === -1 ? 6 : 0,
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="block w-[2px] rounded-full"
                  style={{ background: `hsl(${palette.accent})` }}
                  animate={{
                    height: [4, 10 + i * 4 + volumeLevel * 18, 4],
                    opacity: [0.4, 0.9, 0.4],
                  }}
                  transition={{ duration: 0.9 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }}
                />
              ))}
            </div>
          ))}
        </>
      )}

      {/* Muted indicator */}
      {isMuted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="block w-full h-[2px] rotate-45 origin-center"
            style={{ background: "hsl(0 90% 60% / 0.85)" }}
          />
        </div>
      )}
    </button>
  );
};

export const AlexOrb = memo(AlexOrbBase);
export default AlexOrb;
