/**
 * AnimatedProCard — Pro/contractor card with vault sequence:
 *   idle → scan border → verified badge lock → score reveal
 */
import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import VerifiedBadgeLock, { type VerifiedLockState } from "./VerifiedBadgeLock";
import AIPPScoreDial from "./AIPPScoreDial";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  city?: string;
  score: number;
  verified?: boolean;
  autoReveal?: boolean;
  className?: string;
  footer?: ReactNode;
}

export default function AnimatedProCard({
  name,
  city,
  score,
  verified = true,
  autoReveal = true,
  className,
  footer,
}: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"scan" | "verify" | "reveal">(
    autoReveal && !reduce ? "scan" : "reveal",
  );
  const [lockState, setLockState] = useState<VerifiedLockState>(
    autoReveal && !reduce ? "locked" : "verified",
  );

  useEffect(() => {
    if (!autoReveal || reduce) return;
    const t1 = window.setTimeout(() => {
      setPhase("verify");
      setLockState("unlocking");
    }, 600);
    const t2 = window.setTimeout(() => {
      setLockState(verified ? "verified" : "locked");
    }, 1100);
    const t3 = window.setTimeout(() => setPhase("reveal"), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [autoReveal, reduce, verified]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative rounded-2xl bg-card/85 backdrop-blur-xl border border-border/50 p-5 overflow-hidden",
        "shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.25)]",
        className,
      )}
    >
      {/* Scan border animation */}
      {phase === "scan" && !reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: ["0%", "100%", "0%"], opacity: [0, 1, 0] }}
          transition={{ duration: 1.1, ease: "linear", repeat: 1 }}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">{name}</h3>
          {city && <p className="text-sm text-muted-foreground mt-0.5">{city}</p>}
          <div className="mt-3">
            <VerifiedBadgeLock state={lockState} size={36} label={lockState === "verified" ? "Vérifié" : undefined} />
          </div>
        </div>
        <AIPPScoreDial score={score} revealed={phase === "reveal"} size={120} />
      </div>

      {footer && <div className="mt-4 pt-4 border-t border-border/40">{footer}</div>}
    </motion.div>
  );
}
