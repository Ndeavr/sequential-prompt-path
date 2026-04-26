/**
 * AlexOrbPremium — Microsoft Copilot / OpenAI-grade Alex orb.
 * Pure CSS + Framer Motion. No cartoon face. Dark-bg native.
 *
 * States: idle (breathing) | listening (wider halo) | speaking (vibrate) | thinking (rotating ring)
 * Sizes:  sm 64px | md 96px | lg 144px | xl 192px
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type AlexOrbState = "idle" | "listening" | "speaking" | "thinking";
export type AlexOrbSize = "sm" | "md" | "lg" | "xl";

interface Props {
  state?: AlexOrbState;
  size?: AlexOrbSize;
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE_PX: Record<AlexOrbSize, number> = { sm: 64, md: 96, lg: 144, xl: 192 };

export default function AlexOrbPremium({
  state = "idle",
  size = "lg",
  showLabel = false,
  className,
  onClick,
}: Props) {
  const px = SIZE_PX[size];
  const haloScale = state === "listening" ? 1.25 : 1.08;
  const speakingVibrate = state === "speaking" ? [0, -0.6, 0.6, -0.4, 0.4, 0] : 0;

  const Wrapper: any = onClick ? motion.button : motion.div;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Wrapper
        onClick={onClick}
        aria-label={onClick ? "Activer Alex" : undefined}
        className="relative flex items-center justify-center"
        style={{ width: px, height: px }}
        whileTap={onClick ? { scale: 0.96 } : undefined}
      >
        {/* Outer glass ring + thinking rotation */}
        <motion.div
          className="absolute inset-[-14%] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, hsl(220 100% 60% / 0.18), hsl(207 100% 65% / 0.32), hsl(198 100% 78% / 0.18), hsl(220 100% 60% / 0.18))",
            WebkitMask: "radial-gradient(circle, transparent 58%, #000 60%, #000 64%, transparent 66%)",
            mask: "radial-gradient(circle, transparent 58%, #000 60%, #000 64%, transparent 66%)",
          }}
          animate={state === "thinking" ? { rotate: 360 } : { rotate: 0 }}
          transition={
            state === "thinking"
              ? { duration: 8, repeat: Infinity, ease: "linear" }
              : { duration: 0.4 }
          }
        />

        {/* Soft breathing halo */}
        <motion.div
          className="absolute inset-[-25%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(207 100% 60% / 0.45) 0%, hsl(220 100% 55% / 0.18) 40%, transparent 70%)",
            filter: "blur(14px)",
          }}
          animate={{
            scale: [1, haloScale, 1],
            opacity: state === "listening" ? [0.55, 0.95, 0.55] : [0.35, 0.75, 0.35],
          }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Orbiting particles (pure CSS) */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <motion.div
            key={deg}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: 4,
              height: 4,
              background: "hsl(198 100% 80%)",
              boxShadow: "0 0 6px hsl(207 100% 65% / 0.9)",
              translateX: "-50%",
              translateY: "-50%",
            }}
            animate={{
              rotate: [deg, deg + 360],
              opacity: [0.25, 0.7, 0.25],
            }}
            transition={{
              rotate: { duration: 14 + i, repeat: Infinity, ease: "linear" },
              opacity: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 },
            }}
            transformTemplate={({ rotate }) =>
              `translate(-50%, -50%) rotate(${rotate}) translateY(-${px * 0.55}px)`
            }
          />
        ))}

        {/* Main orb core */}
        <motion.div
          className="relative rounded-full overflow-hidden"
          style={{
            width: "78%",
            height: "78%",
            background:
              "radial-gradient(circle at 35% 30%, hsl(198 100% 78%) 0%, hsl(207 100% 56%) 35%, hsl(220 100% 38%) 75%, hsl(225 80% 18%) 100%)",
            boxShadow:
              "inset 0 0 24px hsl(220 100% 22% / 0.6), inset 6px 8px 20px hsl(0 0% 100% / 0.18), 0 8px 30px -6px hsl(220 100% 50% / 0.55), 0 0 28px -4px hsl(207 100% 60% / 0.45)",
          }}
          animate={{
            scale:
              state === "speaking"
                ? [1, 1.04, 0.99, 1.03, 1]
                : state === "listening"
                ? [1, 1.06, 1]
                : [1, 1.025, 1],
            rotateZ: speakingVibrate as any,
          }}
          transition={{
            duration: state === "speaking" ? 0.6 : 3.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Inner shine */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 32% 26%, hsl(0 0% 100% / 0.42) 0%, transparent 38%)",
            }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Subtle dark bottom for depth */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 65% 78%, hsl(225 90% 8% / 0.55) 0%, transparent 45%)",
            }}
          />
        </motion.div>
      </Wrapper>

      {showLabel && (
        <div className="flex flex-col items-center gap-0.5 select-none">
          <span className="text-[15px] font-bold tracking-[0.22em] text-foreground">ALEX</span>
          <span className="text-[11px] text-muted-foreground">Assistant projet maison</span>
        </div>
      )}
    </div>
  );
}
