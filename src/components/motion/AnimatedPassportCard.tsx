/**
 * AnimatedPassportCard — Property passport card with locked → scan → unlock vault feel.
 */
import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Home } from "lucide-react";
import VerifiedBadgeLock, { type VerifiedLockState } from "./VerifiedBadgeLock";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  unlocked?: boolean;
  autoUnlock?: boolean;
  children?: ReactNode;
  className?: string;
}

export default function AnimatedPassportCard({
  title,
  subtitle,
  unlocked = false,
  autoUnlock = true,
  children,
  className,
}: Props) {
  const reduce = useReducedMotion();
  const [lock, setLock] = useState<VerifiedLockState>(
    unlocked ? "verified" : autoUnlock && !reduce ? "locked" : "verified",
  );

  useEffect(() => {
    if (!autoUnlock || reduce || unlocked) return;
    const t1 = window.setTimeout(() => setLock("unlocking"), 700);
    const t2 = window.setTimeout(() => setLock("verified"), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [autoUnlock, reduce, unlocked]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative rounded-3xl bg-card/85 backdrop-blur-xl border border-border/50 p-6 overflow-hidden",
        "shadow-[0_12px_40px_-16px_hsl(var(--primary)/0.3)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Home className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-display font-semibold text-foreground truncate">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        <VerifiedBadgeLock state={lock} size={40} />
      </div>

      <motion.div
        initial={false}
        animate={{
          opacity: lock === "verified" ? 1 : 0.4,
          filter: lock === "verified" ? "blur(0px)" : "blur(4px)",
        }}
        transition={{ duration: 0.4 }}
        className="mt-5"
        aria-hidden={lock !== "verified"}
      >
        {children}
      </motion.div>
    </motion.section>
  );
}
