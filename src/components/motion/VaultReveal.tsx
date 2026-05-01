/**
 * VaultReveal — Clip-path vault opening animation around children.
 * Lazy-loaded for cinematic moments (matching, payment, score reveal).
 */
import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  children: ReactNode;
  className?: string;
}

export default function VaultReveal({ open, children, className }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={cn("relative", className)}
      initial={false}
      animate={
        reduce
          ? { opacity: open ? 1 : 0 }
          : {
              clipPath: open
                ? "inset(0% 0% 0% 0% round 24px)"
                : "inset(48% 50% 48% 50% round 24px)",
              opacity: open ? 1 : 0,
              filter: open ? "blur(0px)" : "blur(8px)",
            }
      }
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden={!open}
    >
      {children}
    </motion.div>
  );
}
