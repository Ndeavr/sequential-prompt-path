/**
 * VerifiedBadgeLock — SVG badge that animates locked → unlocking → verified.
 */
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerifiedLockState = "locked" | "unlocking" | "verified";

interface Props {
  state?: VerifiedLockState;
  size?: number;
  className?: string;
  label?: string;
}

export default function VerifiedBadgeLock({
  state = "locked",
  size = 56,
  className,
  label,
}: Props) {
  const reduce = useReducedMotion();
  const Icon = state === "verified" ? ShieldCheck : state === "unlocking" ? Unlock : Lock;
  const color =
    state === "verified" ? "hsl(var(--success))" : state === "unlocking" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <motion.div
        className="relative inline-flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background:
            state === "verified"
              ? "radial-gradient(circle, hsl(var(--success) / 0.18), transparent 70%)"
              : "radial-gradient(circle, hsl(var(--primary) / 0.12), transparent 70%)",
          boxShadow:
            state === "verified"
              ? "0 0 24px -6px hsl(var(--success) / 0.6)"
              : "0 0 18px -6px hsl(var(--primary) / 0.4)",
        }}
        animate={
          reduce
            ? {}
            : state === "unlocking"
            ? { rotate: [-4, 4, 0], scale: [0.95, 1.05, 1] }
            : state === "verified"
            ? { scale: [0.85, 1.1, 1] }
            : {}
        }
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        aria-live="polite"
        aria-label={label ?? (state === "verified" ? "Vérifié" : state === "unlocking" ? "Déverrouillage" : "Verrouillé")}
      >
        <Icon style={{ color, width: size * 0.45, height: size * 0.45 }} strokeWidth={2.2} />
      </motion.div>
      {label && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}
    </div>
  );
}
